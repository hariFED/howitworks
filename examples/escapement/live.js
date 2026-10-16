// Page code for escapement.html. K (kit), L (runtime), C (self-check), M (model), P (parts) and
// X (extra annotation) are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VP = K.view(specs.plan);
const VB = K.view(specs.B);
const CH = __CHART__;
const $ = (id) => document.getElementById(id);

const views = [
  ["plan", VP],
  ["B", VB],
].map(([id, V]) => ({
  V,
  wheel: $(`wheel-${id}`),
  tooth: $(`tooth-${id}`),
  fork: $(`fork-${id}`),
  rb: [...svg.querySelectorAll(`.rb-${id}`)],
  hs: $(`hs-${id}`),
  e: V.p(M.E),
  b: V.p(M.B),
  p: V.p([0, 0]),
}));
const el = {
  phi: $("dim-phi-wrap"),
  traceNow: $("trace-now"),
  tracePrev: $("trace-prev"),
  psiNow: $("psi-now"),
  impNow: $("imp-now"),
  impTicks: $("imp-ticks"),
  dot: $("chart-dot"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
let s = M.start();
let paused = false;
let speed = 0; // 0: the tour's time warp, 1: ×1/10, 2: real time
const SPEEDS = [0, 1 / 10, 1];
let dragging = false;
let dragTarget = 0;
let rate = 1;

// The tour slows time where the escapement works: ×1/90 inside the lift, ×1/14 in the free swing.
function warp(th) {
  const a = Math.abs(th);
  const w = a < 32 ? 1 : a > 90 ? 0 : 1 - (a - 32) / 58;
  return 1 / 14 + (1 / 90 - 1 / 14) * L.ease(w);
}

// ---------------------------------------------------------------- the chart: one window of 500 ms
const WIN = CH.tMax;
let win = 0;
let now = [];
let prev = [];
let psi0 = s.psi;
let lastRec = -1;
const cx = (t) => K.r2(CH.x0 + (t / WIN) * (CH.x1 - CH.x0));
const cy = (a) => K.r2((CH.y0 + CH.y1) / 2 - (Math.max(-CH.aMax, Math.min(CH.aMax, a)) / CH.aMax) * ((CH.y1 - CH.y0) / 2));
const py = (p) => K.r2(CH.y1 - (Math.max(0, Math.min(CH.psiMax, p)) / CH.psiMax) * (CH.y1 - CH.y0));

function record() {
  const w = Math.floor(s.t / WIN);
  if (w !== win) {
    prev = now;
    now = [];
    win = w;
    psi0 = s.psi;
    lastRec = -1;
  }
  const tw = s.t - w * WIN;
  if (tw - lastRec < 0.0004) return;
  lastRec = tw;
  now.push([tw, s.th, s.impulse, s.psi - psi0]);
}

function restart() {
  s = M.start();
  win = 0;
  now = [];
  prev = [];
  psi0 = s.psi;
  lastRec = -1;
}

// ---------------------------------------------------------------- step and render
function step(dt, live) {
  if (live.touring && (paused || speed !== 0)) {
    paused = false;
    speed = 0;
  }
  if (live.touring && s.amp !== undefined && s.peak < 120 && !dragging) restart();
  if (paused && !dragging) return false;
  rate = speed === 0 ? warp(s.th) : SPEEDS[speed];
  const sim = dt * rate;
  const n = Math.max(1, Math.ceil(sim / M.DT));
  const h = sim / n;
  const hold = dragging ? L.follow(s.th, dragTarget, 18, dt) : null;
  for (let i = 0; i < n; i++) {
    M.step(s, h, hold);
    record();
  }
  return true;
}

const pts = (list) => list.map(([t, a]) => `${cx(t)},${cy(a)}`).join(" ");
function impulsePath(list) {
  let d = "";
  let ticks = "";
  let on = false;
  for (const [t, a, imp] of list) {
    if (imp) {
      d += `${on ? "L" : "M"}${cx(t)} ${cy(a)}`;
      if (!on) ticks += `M${cx(t)} ${CH.y1}V${CH.y1 - 7}`;
    }
    on = imp;
  }
  return [d, ticks];
}

let shownHs = null;
function render(live) {
  const th = s.th;
  for (const v of views) {
    v.wheel.setAttribute("transform", `rotate(${K.r2(s.psi % 360)} ${v.e[0]} ${v.e[1]})`);
    v.fork.setAttribute("transform", `rotate(${K.r2(-s.phi)} ${v.p[0]} ${v.p[1]})`);
    for (const g of v.rb) g.setAttribute("transform", `rotate(${K.r2(-th % 360)} ${v.b[0]} ${v.b[1]})`);
    const k = M.toothInAction(s);
    v.tooth.setAttribute("d", K.d(v.V, P.toothShape(k)));
    v.tooth.setAttribute("fill-opacity", s.stage === "impulse" ? "0.9" : s.stage === "drop" ? "0.12" : "0.32");
  }
  if (shownHs === null || Math.abs(th - shownHs) > 0.2) {
    views[0].hs.innerHTML = P.hairspring(VP, th);
    shownHs = th;
  }
  el.phi.innerHTML = X.forkAngle(VP, s.phi);
  el.traceNow.setAttribute("points", pts(now));
  el.tracePrev.setAttribute("points", pts(prev));
  el.psiNow.setAttribute("points", now.map(([t, , , p]) => `${cx(t)},${py(p)}`).join(" "));
  const [d, ticks] = impulsePath(now);
  el.impNow.setAttribute("d", d);
  el.impTicks.setAttribute("d", ticks);
  const tw = s.t - win * WIN;
  el.dot.setAttribute("cx", cx(tw));
  el.dot.setAttribute("cy", cy(th));
  const stage = { locked: "LOCKED", unlocking: "UNLOCKING", impulse: "IMPULSE", drop: "DROP", locking: "LOCKING" }[s.stage];
  const stone = s.side > 0 ? "ENTRY" : "EXIT";
  const speedTxt = paused ? "PAUSED" : speed === 2 ? "×1" : `×1/${Math.round(1 / rate)}`;
  const sgn = (x) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(0);
  el.readout.textContent = `θ ${sgn(th)}° · A ${s.peak.toFixed(0)}° · φ ${s.phi >= 0 ? "+" : "−"}${Math.abs(s.phi).toFixed(1)}° · ${stage} ${stone} · TOOTH ${M.toothInAction(s) + 1} · ${speedTxt}`;
  say(`Balance at ${Math.round(th)} degrees, amplitude ${Math.round(s.peak)}, ${stage.toLowerCase()} on the ${stone.toLowerCase()} stone, beat ${s.beats}.`, live.clock);
}

// ---------------------------------------------------------------- input
const live = L.run({
  root: svg,
  step,
  render,
  idleAfter: 5,
  onFrozen: () => q.check && C.selfCheck(svg),
});

if (live.reduced && !live.frozen) {
  // A still, true moment: the first entry impulse, half way through.
  const fake = { touring: true, reduced: false, clock: 0 };
  let guard = 0;
  while (!(s.stage === "impulse" && s.side > 0 && Math.abs(s.phi) < 0.3) && guard++ < 200000) step(1 / 240, fake);
  render(live);
}

// Rotary drag: the balance follows the pointer's angle about the staff.
const hit = svg.querySelector('[data-drag="balance"]');
const toSheet = (e) => {
  const m = svg.getScreenCTM();
  return m ? [(e.clientX - m.e) / m.a, (e.clientY - m.f) / m.d] : [e.clientX, e.clientY];
};
const [bx, by] = VP.p(M.B);
const angleOf = (e) => {
  const [x, y] = toSheet(e);
  return (Math.atan2(-(y - by), x - bx) * 180) / Math.PI;
};
let pid = null;
let aPrev = 0;
hit.addEventListener("pointerdown", (e) => {
  pid = e.pointerId;
  hit.setPointerCapture(pid);
  aPrev = angleOf(e);
  dragTarget = s.th;
  dragging = true;
  live.input();
  e.preventDefault();
});
hit.addEventListener("pointermove", (e) => {
  if (e.pointerId !== pid) return;
  const a = angleOf(e);
  let da = a - aPrev;
  if (da > 180) da -= 360;
  if (da < -180) da += 360;
  aPrev = a;
  dragTarget = Math.max(-320, Math.min(320, dragTarget + da));
  live.input();
});
const release = (e) => {
  if (e.pointerId !== pid) return;
  pid = null;
  dragging = false;
  s.om = 0; // let go from rest
  s.peak = Math.abs(s.th);
  live.input();
};
hit.addEventListener("pointerup", release);
hit.addEventListener("pointercancel", release);

svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowLeft" || k === "ArrowRight") s.om += k === "ArrowLeft" ? 2500 : -2500;
  else if (k === " ") paused = !paused;
  else if (k === "s" || k === "S") speed = (speed + 1) % 3;
  else if (k === "r" || k === "R") restart();
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
