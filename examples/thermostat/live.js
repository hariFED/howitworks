// Page code for thermostat.html. K (kit), L (runtime), C (self-check), M (model), P (parts) and
// X (local helpers) are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VM = K.view(specs.main);
const VB = K.view(specs.B);
const VD = K.view(specs.D);
const CH = __CHART__;
const $ = (id) => document.getElementById(id);

const el = {
  mv: [[$("mv-main"), VM], [$("mv-D"), VD]],
  bpd: $("bpd-main"),
  mvb: $("mvb-main"),
  bpb: $("bpb-main"),
  springs: [[$("spring-main"), VM], [$("spring-D"), VD]],
  bpsprings: [[$("bpspring-main"), VM, 0], [$("bpspring-B"), VB, 1]],
  inside: [[$("in-main"), VM], [$("in-B"), VB]],
  pinB: $("pin-B"),
  tintE: ["main", "B", "D"].map((id) => $(`tint-e-${id}`)),
  tintR: ["main", "B", "D"].map((id) => $(`tint-r-${id}`)),
  tintB: ["main", "D"].map((id) => $(`tint-b-${id}`)),
  flowR: $("flow-r-main"),
  flowB: $("flow-b-main"),
  dimLift: $("dim-lift-wrap"),
  trace: $("trace"),
  dot: $("chart-dot"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
let s = M.engine(20);
let simT = 0; // simulated seconds since the cold start
let load = M.LOADS.cruise;
let warp = 12; // simulated seconds per real second, when the user drives
let dragging = false;
let trace = [];
let traceT = -1;
let offR = 0; // flow-line dash offsets, sheet units
let offB = 0;

// The tour: a cold start at cruise load, a hill (a load step), a coast down, then cold again.
const TOUR = [
  [240, M.LOADS.cruise],
  [400, M.LOADS.hill],
  [445, M.LOADS.coast],
];
const tour = { mode: "run", t: 0, from: null };
function coldStart() {
  s = M.engine(20);
  simT = 0;
  trace = [];
  traceT = -1;
}

function tourStep(dtReal) {
  if (tour.mode === "reset") {
    tour.t += dtReal;
    const k = Math.min(1, tour.t / 2);
    const e = L.ease(k);
    s.T = tour.from.T + (20 - tour.from.T) * e;
    s.Tp = tour.from.Tp + (20 - tour.from.Tp) * e;
    s.f = M.meltStep(s.f, s.Tp);
    s.lift = M.liftOf(s.Tp, s.f);
    const fl = M.split(s.lift);
    Object.assign(s, { rad: fl.rad, byp: fl.byp, frac: fl.frac, qout: 0 });
    if (k >= 1) {
      coldStart();
      tour.mode = "run";
    }
    return 0;
  }
  const seg = TOUR.find(([until]) => simT < until);
  if (!seg) {
    tour.mode = "reset";
    tour.t = 0;
    tour.from = { T: s.T, Tp: s.Tp };
    return 0;
  }
  load = seg[1];
  return (s.T < 80 && simT < TOUR[0][0] ? 30 : 15) * dtReal;
}

// ---------------------------------------------------------------- step and render
function simulate(h) {
  s.qin = load;
  const n = Math.max(1, Math.ceil(h / 0.04));
  for (let i = 0; i < n; i++) {
    M.advance(s, h / n);
    offR -= (s.rad / M.PUMP) * 60 * (h / n);
    offB -= (s.byp / M.PUMP) * 60 * (h / n);
  }
  simT += h;
  if (simT - traceT >= 0.5) {
    traceT = simT;
    if (trace.length < 1600) trace.push([s.Tp, s.lift]);
  }
}

let jump = false; // reduced motion: an input jumps two simulated minutes ahead instead of animating
function step(dt, live) {
  if (live.reduced && !live.frozen) {
    if (jump) simulate(120);
    jump = false;
    return false;
  }
  if (live.touring && !dragging) {
    const h = tourStep(dt);
    if (h > 0) simulate(h);
  } else if (dt > 0) simulate(dt * warp);
  return true;
}

let shown = { lift: -1, f: -1 };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const tChart = (T) => K.r2(CH.x0 + ((clamp(T, CH.T0, CH.T1) - CH.T0) / (CH.T1 - CH.T0)) * (CH.x1 - CH.x0));
const lChart = (Lf) => K.r2(CH.y1 - (Lf / CH.L1) * (CH.y1 - CH.y0));

function render(live) {
  const Lf = s.lift;
  for (const [node, V] of el.mv) node.setAttribute("transform", `translate(0 ${K.r2(Lf * V.k)})`);
  const drop = P.bypassDrop(Lf);
  el.bpd.setAttribute("transform", `translate(0 ${K.r2(drop * VM.k)})`);
  el.mvb.setAttribute("transform", `translate(0 ${K.r2(Lf * VM.k)})`);
  el.bpb.setAttribute("transform", `translate(0 ${K.r2(drop * VM.k)})`);
  el.pinB.setAttribute("transform", `translate(0 ${K.r2(-Lf * VB.k)})`);
  if (Math.abs(Lf - shown.lift) > 0.003 || Math.abs(s.f - shown.f) > 0.003) {
    for (const [node, V] of el.springs) node.innerHTML = P.mainSpring(V, Lf);
    // in Detail B the cup stands still: the bypass spring's lower end rises once the disc has seated
    for (const [node, V, frame] of el.bpsprings) node.innerHTML = frame ? `<g transform="translate(0 ${K.r2(-Lf * V.k)})">${P.bypassSpring(V, Lf)}</g>` : P.bypassSpring(V, Lf);
    for (const [node, V] of el.inside) node.innerHTML = P.inside(V, Lf, s.f);
    el.dimLift.innerHTML = X.liftDim(VD, [-10, P.SEAT_V - Lf], [-17, P.SEAT_V], { text: Lf.toFixed(1), id: "dim-lift" });
    shown = { lift: Lf, f: s.f };
  }
  // coolant: stipple density follows temperature; the radiator side is pale while it stands still
  const hot = clamp((s.T - 15) / 85, 0, 1);
  const dens = (k) => K.r2(0.1 + 0.85 * hot * k);
  const flowing = (fr) => 0.3 + 0.7 * Math.min(1, fr / 0.35);
  for (const n of el.tintE) n.setAttribute("fill-opacity", dens(1));
  for (const n of el.tintR) n.setAttribute("fill-opacity", dens(flowing(s.frac)));
  for (const n of el.tintB) n.setAttribute("fill-opacity", dens(flowing(1 - s.frac)));
  el.flowR.setAttribute("stroke-dashoffset", K.r2(offR % 9));
  el.flowB.setAttribute("stroke-dashoffset", K.r2(offB % 9));
  el.flowR.setAttribute("stroke-opacity", K.r2(clamp(s.frac * 2.2, 0.06, 1)));
  el.flowB.setAttribute("stroke-opacity", K.r2(clamp((1 - s.frac) * 1.2, 0.06, 1)));
  el.trace.setAttribute("points", trace.map(([T, l]) => `${tChart(T)},${lChart(l)}`).join(" "));
  el.dot.setAttribute("cx", tChart(s.Tp));
  el.dot.setAttribute("cy", lChart(Lf));
  const mm = Math.floor(simT / 60);
  const ss = String(Math.floor(simT % 60)).padStart(2, "0");
  el.readout.textContent = `T ${s.T.toFixed(1)} °C · LIFT ${Lf.toFixed(2)} mm · RAD ${s.rad.toFixed(1)} L/min · LOAD ${Math.round(s.qin)} kW · ${mm}:${ss}`;
  say(`Coolant ${s.T.toFixed(0)} degrees, valve lift ${Lf.toFixed(1)} millimetres, ${s.rad.toFixed(0)} litres a minute to the radiator, engine load ${Math.round(s.qin)} kilowatts.`, live.clock);
}

// ---------------------------------------------------------------- input
const live = L.run({ root: svg, step, render, idleAfter: 6, onFrozen: () => q.check && C.selfCheck(svg) });

if (live.reduced && !live.frozen) {
  // A still, true moment: the tour played to 14 s (settled at cruise), drawn once.
  for (let t = 0; t < 14; t += 1 / 240) {
    const h = tourStep(1 / 240);
    if (h > 0) simulate(h);
  }
  render(live);
}

for (const hitEl of svg.querySelectorAll("[data-drag]")) {
  let l0 = 0;
  L.dragY(svg, hitEl, {
    start: () => {
      dragging = true;
      l0 = load;
      live.input();
    },
    move: (dy) => {
      load = clamp(l0 - dy * 0.2, 0, 45);
      jump = true;
      live.input();
    },
    end: () => {
      dragging = false;
      live.input();
    },
  });
}

svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowUp" || k === "ArrowDown") load = clamp(load + (k === "ArrowUp" ? 3 : -3), 0, 45);
  else if (k === "h" || k === "H") load = load >= M.LOADS.hill ? M.LOADS.cruise : M.LOADS.hill;
  else if (k === "r" || k === "R") coldStart();
  else if (k === "s" || k === "S") warp = warp === 12 ? 4 : warp === 4 ? 30 : 12;
  else return;
  e.preventDefault();
  jump = true;
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
