// Page code for token-bucket.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
// are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VM = K.view(specs.main);
const VB = K.view(specs.B);
const VD = K.view(specs.D);
const VC = K.view(specs.C);
const CH = __CHART__;
const $ = (id) => document.getElementById(id);
const views = { main: VM, B: VB, D: VD };

const el = {
  water: Object.entries(views).map(([id, V]) => [$(`water-${id}`), V]),
  surf: Object.entries(views).map(([id, V]) => [$(`surf-${id}`), V]),
  dryT: Object.entries(views).map(([id, V]) => [$(`dry-t-${id}`), V]),
  flowT: Object.entries(views).map(([id, V]) => [$(`flow-t-${id}`), V]),
  flowO: Object.keys(views).map((id) => $(`flow-o-${id}`)),
  stream: Object.entries(views).map(([id, V]) => [$(`stream-${id}`), V]),
  chamber: Object.keys(views).map((id) => $(`chamber-${id}`)),
  arm: [["main", VM], ["B", VB]].map(([id, V]) => [$(`arm-${id}`), V]),
  diaph: [["main", VM], ["B", VB]].map(([id, V]) => [$(`diaph-${id}`), V]),
  plunger: [["main", VM], ["B", VB]].map(([id, V]) => [$(`plunger-${id}`), V]),
  plugMain: $("plug-main"),
  plugD: $("plugD"),
  dose: $("dose-main"),
  wl: $("wl-main"),
  planArm: $("planarm-C"),
  dimLevel: $("dim-level-wrap"),
  mvbMain: $("mvb-main"),
  mvbB: $("mvb-B"),
  mvbD: $("mvb-D"),
  traceNow: $("trace-now"),
  tracePrev: $("trace-prev"),
  marks: $("chart-marks"),
  dot: $("chart-dot"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
const tank = M.tank();
let lift = 0; // plug, rod and knob off the seat, mm (follows the model's open valve)
let ct = 0; // chart clock, model seconds, wraps every CH.tMax
let now = [];
let prev = [];
let marks = [];
let sampleT = 0;

// The tour, in model seconds: a burst that empties the bucket and gets refused, single requests
// slower than the refill rate (all accepted), a second burst, then a quiet refill to capacity.
const TOUR = [4, 5.5, 7, 8.5, 10, 11.5, 20, 21.5, 32, 44, 56, 62, 63.5, 65, 66.5];

function send() {
  const ok = M.request(tank);
  marks.push([ct, ok]);
  return ok;
}

function refill() {
  tank.L = M.L_FULL;
  tank.pending = 0;
}

// ---------------------------------------------------------------- step and render
function step(dt, live) {
  const T = dt * M.SPEED; // model seconds this frame
  const n = Math.max(1, Math.ceil(T * 240));
  const h = T / n;
  for (let i = 0; i < n; i++) {
    const c0 = ct;
    ct += h;
    if (live.touring) for (const t of TOUR) if (t > c0 && t <= ct) send();
    if (ct >= CH.tMax) {
      ct -= CH.tMax;
      prev = now;
      now = [];
      marks = [];
      sampleT = 0;
      if (live.touring) tank.held = false;
    }
    M.advance(tank, h);
    lift = live.reduced ? (tank.pending > 0 ? M.LIFT : 0) : L.follow(lift, tank.pending > 0 ? M.LIFT : 0, 14, h);
    if (ct >= sampleT) {
      now.push([ct, M.tokens(tank.L)]);
      sampleT = ct + 0.25;
    }
  }
  return tank.pending > 0 || tank.qin > 1e-6 || tank.qover > 1e-6 || Math.abs(lift - (tank.pending > 0 ? M.LIFT : 0)) > 0.01;
}

const px = ([t, k]) => `${K.r2(CH.x0 + (t / CH.tMax) * (CH.x1 - CH.x0))},${K.r2(CH.y1 - (Math.min(CH.kMax, Math.max(0, k)) / CH.kMax) * (CH.y1 - CH.y0))}`;
const pts = (list) => list.map(px).join(" ");
const rot = (deg, [u, v]) => {
  const a = (deg * Math.PI) / 180;
  const [pu, pv] = P.PIVOT;
  return [pu + (u - pu) * Math.cos(a) - (v - pv) * Math.sin(a), pv + (u - pu) * Math.sin(a) + (v - pv) * Math.cos(a)];
};
let shown = { gap: -1, deg: -999 };

function render(live) {
  const Lv = tank.L;
  const gap = tank.held ? M.GAP_MAX : M.GAP_MAX * M.open(Lv);
  const deg = P.armAngle(Lv, tank.held);
  const flowing = tank.qout > 1e-4;
  const over = tank.qover > 1e-5;
  for (const [node, V] of el.water) node.setAttribute("d", K.d(V, P.tankWater(Lv)));
  for (const [node, V] of el.surf) node.setAttribute("d", K.d(V, [[-P.IN, Lv], [P.IN, Lv]], false));
  for (const [node, V] of el.dryT) node.setAttribute("d", K.d(V, P.tubeBore(lift)));
  for (const [node, V] of el.flowT) {
    node.setAttribute("d", K.d(V, P.tubeBore(lift)));
    node.setAttribute("fill-opacity", over ? 1 : 0);
  }
  for (const node of el.flowO) node.setAttribute("fill-opacity", flowing || over ? 1 : 0);
  for (const [node, V] of el.stream) {
    node.setAttribute("d", K.d(V, P.stream(Lv)));
    node.setAttribute("fill-opacity", K.r2(Math.min(1, tank.qin / M.Q_FILL)));
  }
  for (const node of el.chamber) node.setAttribute("fill-opacity", K.r2(Math.min(1, tank.qin / M.Q_FILL)));
  for (const [node, V] of el.arm) {
    const [x, y] = V.p(P.PIVOT);
    node.setAttribute("transform", `rotate(${K.r2(-deg)} ${x} ${y})`);
  }
  if (Math.abs(gap - shown.gap) > 0.003) {
    for (const [node, V] of el.diaph) node.innerHTML = P.diaphragm(V, gap);
    for (const [node, V] of el.plunger) node.innerHTML = P.plunger(V, gap);
    shown.gap = gap;
  }
  if (Math.abs(deg - shown.deg) > 0.02) {
    el.planArm.innerHTML = P.planArm(VC, deg);
    shown.deg = deg;
  }
  el.plugMain.setAttribute("transform", `translate(0 ${K.r2(-lift * VM.k)})`);
  el.plugD.setAttribute("transform", `translate(0 ${K.r2(-lift * VD.k)})`);
  el.wl.setAttribute("transform", `translate(0 ${K.r2(-Lv * VM.k)})`);
  const dF = M.dFloat(Lv);
  el.dose.setAttribute("transform", `translate(0 ${K.r2(-dF * VM.k)})`);
  el.dimLevel.innerHTML = K.dim(VM, [-118, 0], [-118, Lv], { dir: "v", off: 0, text: `L=${Math.round(Lv)}`, id: "dim-level" });

  // balloons that ride with their parts
  const ball = P.ballCentre(deg);
  const armPt = rot(deg, [P.PIVOT[0] + 95, P.PIVOT[1]]);
  el.mvbMain.innerHTML =
    K.balloon(VM, [P.UF + 12, P.KNOB_V + 12 + lift], [478, 92], 26, { target: 26 }) +
    K.balloon(VM, [P.UF + 1.5, 240 + lift], [478, 166], 24, { target: 24 }) +
    K.balloon(VM, [P.UF + 17.2, 180 + lift], [478, 190], 23, { target: 23 }) +
    K.balloon(VM, [P.UF + 41, dF + 15], [478, 236], 21, { target: 21 }) +
    K.balloon(VM, armPt, [262, 92], 11, { target: 11 }) +
    K.balloon(VM, [ball[0] + 6, ball[1] + 16], [292, 92], 12, { target: 12 });
  el.mvbB.innerHTML = K.balloon(VB, [-133 + gap, P.VA + 1.5], [758, 150], 9, { target: 9 });
  el.mvbD.innerHTML =
    K.balloon(VD, [P.UF + 21, 19 + lift], [758, 312], 19, { target: 19 }) +
    K.balloon(VD, [P.UF + 23, 14 + lift], [758, 338], 20, { target: 20 });

  // chart
  el.traceNow.setAttribute("points", pts(now.concat([[ct, M.tokens(Lv)]])));
  el.tracePrev.setAttribute("points", pts(prev));
  el.marks.innerHTML = marks
    .map(([t, ok]) => {
      const x = K.r2(CH.x0 + (t / CH.tMax) * (CH.x1 - CH.x0));
      const y = CH.strip;
      return ok ? `<circle class="dot" cx="${x}" cy="${y}" r="2.4"/>` : `<path class="mark-x" d="M${x - 2.6} ${y - 2.6}L${x + 2.6} ${y + 2.6}M${x - 2.6} ${y + 2.6}L${x + 2.6} ${y - 2.6}"/>`;
    })
    .join("");
  const [cx, cy] = px([ct, M.tokens(Lv)]).split(",");
  el.dot.setAttribute("cx", cx);
  el.dot.setAttribute("cy", cy);

  const tok = Math.max(0, M.tokens(Lv));
  const text = `t ${Math.floor(ct)} s · L ${Math.round(Lv)} mm · ${tok.toFixed(1)} TOKENS · IN ${tank.qin.toFixed(3)} L/s · OK ${tank.accepted} · REFUSED ${tank.refused}`;
  el.readout.textContent = text;
  say(`Level ${Math.round(Lv)} millimetres, ${tok.toFixed(1)} tokens. ${tank.accepted} requests accepted, ${tank.refused} refused.${tank.last ? " Last request " + tank.last.toLowerCase() + "." : ""}`, live.clock);
}

// ---------------------------------------------------------------- input
const live = L.run({
  root: svg,
  step,
  render,
  idleAfter: 6,
  onFrozen: () => q.check && C.selfCheck(svg),
});

if (live.reduced && !live.frozen) {
  // A still, true moment: the tour played to 3 s (12 model seconds), drawn once.
  const fake = { touring: true, reduced: true, clock: 0 };
  for (let t = 0; t < 3; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

for (const hit of svg.querySelectorAll("[data-drag]")) {
  let sent = false;
  L.dragY(svg, hit, {
    start: () => {
      sent = false;
      live.input();
    },
    move: (dy) => {
      if (!sent && dy < -6) {
        sent = true;
        send();
      }
      live.input();
    },
    end: () => {
      if (!sent) send();
      live.input();
    },
  });
}

svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === " " || k === "Enter") send();
  else if (k === "h" || k === "H") tank.held = !tank.held;
  else if (k === "r" || k === "R") refill();
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.05 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
