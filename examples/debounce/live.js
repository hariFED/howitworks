// Page code for debounce.html. K (kit), L (runtime), C (self-check), M (model), X (helpers) and
// P (parts) are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VM = K.view(specs.main);
const VC = K.view(specs.C);
const VF = K.view(specs.F);
const VE = K.view(specs.E);
const CH = __CHART1__;
const D2 = __CHART2__;
const $ = (id) => document.getElementById(id);

const el = {
  mv: [["main", VM], ["C", VC]].map(([id, V]) => [$(`mv-${id}`), V]),
  mvb: $("mvb-main"),
  balls: [["main", VM], ["C", VC], ["F", VF]].map(([id, V]) => [$(`ball-${id}`), V]),
  oilHi: [["main", VM], ["C", VC]].map(([id, V]) => [$(`oil-hi-${id}`), V]),
  oilLo: [["main", VM], ["C", VC]].map(([id, V]) => [$(`oil-lo-${id}`), V]),
  oilHiF: $("oil-hi-F"),
  flowS: [["main", VM], ["C", VC]].map(([id, V]) => [$(`flow-s-${id}`), V]),
  flowL: [$("flow-l-main"), $("flow-l-C")],
  spring: $("spring-main"),
  pinion: $("pinion-main"),
  dimX: $("dim-x-wrap"),
  plan: $("plan-mv"),
  planB: $("plan-b"),
  theta: $("theta-wrap"),
  c1prev: $("c1-prev"),
  c1push: $("c1-push"),
  c1close: $("c1-close"),
  c1marks: $("c1-marks"),
  c1due: $("c1-due"),
  c1dot: $("c1-dot"),
  d2dot: $("d2-dot"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2.5);
const [pcx, pcy] = VM.p([0, 0]);

// ---------------------------------------------------------------- state
const s = M.door();
let hand = null; // the angle a hand holds the door at, or null
let push = null; // a push in progress: { phase: "open" | "hold", t }
let dragging = false;
let lift = 0; // check ball off its seat, mm
let offS = 0; // flow-line dash offsets, from the volume through each needle
let offL = 0;
let quiet = 0; // seconds since the last touch
let chartT = 0; // time on DIAGRAM 1
let now = [];
let prev = [];
let marks = [];
let held = false;

// The tour: three quick pushes 2.4 s apart, then quiet; the door shuts, waits, and it repeats.
const PERIOD = 15;
const PUSHES = [0.5, 2.9, 5.3];
let tourT = 0;
let wasTouring = true;

function startPush() {
  push = { phase: "open", t: 0 };
  marks.push(chartT);
  quiet = 0;
}

function shutNow() {
  s.theta = 0;
  M.advance(s, 1e-3, null);
  push = null;
  hand = null;
}

// ---------------------------------------------------------------- step
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  if (live.touring && !wasTouring) {
    // the tour takes over again: start its cycle and the diagram afresh
    tourT = 0;
    chartT = 0;
    prev = now;
    now = [];
    marks = [];
  }
  wasTouring = live.touring;
  for (let i = 0; i < n; i++) {
    if (live.touring && !dragging) {
      const before = tourT;
      tourT += h;
      if (tourT >= PERIOD) {
        tourT -= PERIOD;
        chartT = 0;
        prev = now;
        now = [];
        marks = [];
      }
      for (const tp of PUSHES) if (before < tp && tourT >= tp) startPush();
    }
    // a push opens the door to PUSH_TO, holds it a moment and lets go
    if (push) {
      push.t += h;
      if (push.phase === "open" && s.theta >= M.PUSH_TO - 0.05) push = { phase: "hold", t: 0 };
      else if (push.phase === "hold" && push.t > 0.25) push = null;
    }
    const want = dragging ? hand : push ? M.PUSH_TO : null;
    M.advance(s, h, want);
    held = want != null;
    if (held) quiet = 0;
    else quiet += h;
    lift = L.follow(lift, s.opening > 1 ? Math.min(1, s.opening / 120) : 0, s.opening > 1 ? 50 : 25, h);
    const sc = 0.004; // sheet units of dash travel per mm³ of oil
    offS += s.q.sweep * h * sc;
    offL += s.q.latch * h * sc;
    chartT += h;
  }
  if (!live.touring && chartT >= PERIOD) {
    chartT -= PERIOD;
    prev = now;
    now = [];
    marks = [];
  }
  const mode = held ? 1 : s.theta > 0 ? 2 : 0;
  const last = now[now.length - 1];
  if (!last || chartT - last[0] > 0.03 || last[2] !== mode) now.push([chartT, s.theta, mode]);
  return held || s.theta > 0 || lift > 1e-3;
}

// ---------------------------------------------------------------- render
const cx = (t) => K.r2(CH.x0 + (Math.min(CH.tMax, t) / CH.tMax) * (CH.x1 - CH.x0));
const cy = (a) => K.r2(CH.y1 - (Math.min(CH.aMax, Math.max(0, a)) / CH.aMax) * (CH.y1 - CH.y0));
function tracePaths(list) {
  // split the trace into held (thick ink) and oil-closing (accent) runs; shut runs go with closing
  let push = "";
  let close = "";
  for (let i = 1; i < list.length; i++) {
    const [t0, a0] = list[i - 1];
    const [t1, a1, m1] = list[i];
    if (t1 < t0) continue;
    const seg = `M${cx(t0)} ${cy(a0)}L${cx(t1)} ${cy(a1)}`;
    if (m1 === 1) push += seg;
    else close += seg;
  }
  return { push, close };
}
const all = (list) => list.map(([t, a], i) => `${i ? "L" : "M"}${cx(t)} ${cy(a)}`).join("");

let shown = { theta: -1, x: -1, lift: -1 };
function render(live) {
  const x = s.x;
  const phi = M.phi(s.theta);
  if (Math.abs(x - shown.x) > 1e-4) {
    for (const [node, V] of el.mv) node.setAttribute("transform", `translate(${K.r2(-x * V.k)} 0)`);
    el.mvb.setAttribute("transform", `translate(${K.r2(-x * VM.k)} 0)`);
    el.spring.innerHTML = P.spring(VM, x);
    el.pinion.setAttribute("transform", `rotate(${K.r2(-phi)} ${pcx} ${pcy})`);
    for (const [node, V] of el.oilHi) node.setAttribute("d", P.oilPath(V, P.oilHigh(x)));
    for (const [node, V] of el.oilLo) node.setAttribute("d", P.oilPath(V, P.oilLow(x)));
    for (const [node, V] of el.flowS) node.setAttribute("d", K.d(V, P.flowSweep(x), false));
    el.dimX.innerHTML = K.dim(VM, [M.FACE_R, 20], [M.FACE_R - x, 20], { dir: "h", off: -40, text: `x=${x.toFixed(1)}`, id: "dim-x" });
    shown.x = x;
  }
  if (Math.abs(s.theta - shown.theta) > 1e-3) {
    el.plan.innerHTML = P.planMoving(VE, s.theta);
    el.theta.innerHTML = X.angleDim(VE, [0, 0], 150, 180 - s.theta, 180, `θ=${Math.round(s.theta)}°`, { id: "dim-theta" });
    el.planB.innerHTML = planBalloons(s.theta);
    shown.theta = s.theta;
  }
  if (Math.abs(lift - shown.lift) > 0.003) {
    for (const [node, V] of el.balls) node.innerHTML = P.ball(V, lift);
    shown.lift = lift;
  }
  const pMax = M.pressure(M.X_MAX);
  const op = K.r2(0.16 + 0.84 * Math.min(1, s.p / pMax));
  for (const [node] of el.oilHi) node.setAttribute("fill-opacity", op);
  el.oilHiF.setAttribute("fill-opacity", op);
  const qs = M.flow(M.X_MAX).sweep;
  const ql = M.flow(M.X_MAX).latch;
  for (const [node] of el.flowS) {
    node.setAttribute("stroke-opacity", K.r2(Math.min(1, s.q.sweep / (0.6 * qs))));
    node.style.strokeDashoffset = K.r2(-offS);
  }
  for (const node of el.flowL) {
    node.setAttribute("stroke-opacity", K.r2(Math.min(1, s.q.latch / (0.6 * ql))));
    node.style.strokeDashoffset = K.r2(-offL);
  }

  // DIAGRAM 1
  const tp = tracePaths(now);
  el.c1push.setAttribute("d", tp.push);
  el.c1close.setAttribute("d", tp.close);
  el.c1prev.setAttribute("d", all(prev.filter(([t]) => t > chartT + 0.4)));
  el.c1marks.setAttribute("d", marks.map((t) => `M${cx(t)} ${CH.y0 - 1.5}l-3.2 -5.6h6.4Z`).join(""));
  el.c1dot.setAttribute("cx", cx(chartT));
  el.c1dot.setAttribute("cy", cy(s.theta));
  const left = M.closeTime(s.theta);
  const due = chartT + left;
  el.c1due.setAttribute("d", !held && s.theta > 0 && due <= CH.tMax ? `M${cx(due)} ${CH.y0}V${CH.y1}` : "");
  // DIAGRAM 2
  el.d2dot.setAttribute("cx", K.r2(D2.x0 + (s.theta / D2.aMax) * (D2.x1 - D2.x0)));
  el.d2dot.setAttribute("cy", K.r2(D2.y1 - (left / D2.tMax) * (D2.y1 - D2.y0)));

  const state = held ? "HELD" : s.theta > 0.05 ? (s.x < M.FACE_R - M.SWEEP_U + M.PORT_D / 2 ? "LATCH" : "SWEEP") : "SHUT";
  const qcm = s.q.total / 1000;
  const text =
    s.theta > 0.05
      ? `θ ${Math.round(s.theta)}° · x ${x.toFixed(1)} mm · p ${(s.p * 10).toFixed(1)} bar · Q ${qcm.toFixed(1)} cm³/s · ${state} · SHUT IN ${held ? "—" : left.toFixed(1) + " s"}`
      : `SHUT · QUIET ${Math.min(99, quiet).toFixed(1)} s · SPRING ${Math.round(M.springForce(0))} N · ${Math.round(M.doorMoment(0))} N·m`;
  el.readout.textContent = text;
  say(s.theta > 0 ? `Door at ${Math.round(s.theta)} degrees, ${held ? "held open" : `shuts in ${left.toFixed(1)} seconds`}.` : "Door shut.", live.clock);
}

const PB = __PB__;
function planBalloons(theta) {
  const Lk = M.link(theta);
  const along = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const at = {
    21: P.doorFrame(theta)([330, -22]),
    16: along(Lk.S, Lk.E, 0.62),
    17: along(Lk.E, M.SHOE, 0.5),
    20: [Lk.E[0] + 2, Lk.E[1] + 1],
    19: [Lk.S[0] + 1.5, Lk.S[1] + 1.5],
  };
  return PB.map(([n, y]) => K.balloon(VE, at[n], [414, y], n, { target: n })).join("");
}

// ---------------------------------------------------------------- input
const live = L.run({
  root: svg,
  step,
  render,
  idleAfter: 8,
  onFrozen: () => q.check && C.selfCheck(svg),
});

if (live.reduced && !live.frozen) {
  // A still, true moment: the tour played to 6.4 s (after the last push, closing), drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 6.4; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const toSheet = (e) => {
  const m = svg.getScreenCTM();
  if (!m) return [0, 0];
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return [p.x, p.y];
};
const [hx, hy] = VE.p([0, 0]);
const angleAt = (e) => {
  const [x, y] = toSheet(e);
  const a = (Math.atan2(hy - y, hx - x) * 180) / Math.PI;
  return Math.min(M.THETA_MAX, Math.max(0, a < -90 ? a + 360 : a));
};

const planHit = svg.querySelector('[data-drag="plan"]');
let pid = null;
planHit.addEventListener("pointerdown", (e) => {
  pid = e.pointerId;
  planHit.setPointerCapture(pid);
  dragging = true;
  push = null;
  hand = angleAt(e);
  if (hand > s.theta + 0.5) marks.push(chartT);
  live.input();
  e.preventDefault();
});
planHit.addEventListener("pointermove", (e) => {
  if (e.pointerId !== pid) return;
  hand = angleAt(e);
  live.input();
});
const release = (e) => {
  if (e.pointerId !== pid) return;
  pid = null;
  dragging = false;
  hand = null;
  live.input();
};
planHit.addEventListener("pointerup", release);
planHit.addEventListener("pointercancel", release);

svg.querySelector("[data-push]").addEventListener("click", () => {
  startPush();
  live.input();
});

svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === " " || k === "Enter") startPush();
  else if (k === "r" || k === "R") shutNow();
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
