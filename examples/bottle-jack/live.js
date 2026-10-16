// Page code for bottle-jack.html. K (kit), L (runtime), C (self-check), M (model), P (parts) and
// X (this sheet's helpers) are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VM = K.view(specs.main);
const VD = K.view(specs.D);
const VB = K.view(specs.B);
const VA = K.view(specs.A);
const CH = __CHART__;
const $ = (id) => document.getElementById(id);

const views = [["main", VM], ["D", VD], ["B", VB]];
const el = {
  ram: [["main", VM], ["D", VD]].map(([id, V]) => [$(`ram-${id}`), V]),
  mvb: $("mvb-main"),
  pl: [["main", VM], ["B", VB]].map(([id, V]) => [$(`pl-${id}`), V]),
  sock: [$("sock-main"), $("sockc-main")],
  link: $("link-main"),
  rel: [["main", VM], ["D", VD]].map(([id, V]) => [$(`rel-${id}`), V]),
  valves: [["main", VM], ["B", VB]].map(([id, V]) => [$(`valves-${id}`), V]),
  oilR: views.map(([id, V]) => [$(`oil-r-${id}`), V]),
  oilP: views.map(([id, V]) => [$(`oil-p-${id}`), V]),
  oilH: views.map(([id, V]) => [$(`oil-h-${id}`), V]),
  aaRam: $("aa-ram"),
  aaPl: $("aa-pl"),
  oilARam: $("oil-a-ram"),
  oilAPump: $("oil-a-pump"),
  dimLift: $("dim-lift-wrap"),
  dynb: $("dynb"),
  traceNow: $("trace-now"),
  tracePrev: $("trace-prev"),
  dot: $("chart-dot"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
let loadIx = 0;
const jack = M.jack(M.LOADS[loadIx]);
let x = 0; // plunger stroke: 0 handle up, 1 handle down
let target = 0;
let e = 0; // release needle off its seat, mm
let eWant = 0;
let lifts = { s: 0, d: 0, r: 0 };
let auto = false;
let dragging = false;
let releaseOpen = false;
let now = [[0, 0]];
let prev = [];
let restart = false; // the ram came down: the next stroke starts a new trace

const E_OPEN = 0.1; // mm: about 36° of the M12×1 release screw

// The tour: pump twenty strokes, hold, crack the release screw, let the load down, close it.
const PERIOD = 0.9;
const DOWN = 0.5;
const STROKES = 20;
const tour = { t: 0, mode: "pump", modeT: 0 };
function tourStep(h) {
  tour.modeT += h;
  if (tour.mode === "pump") {
    tour.t += h;
    if (tour.t >= STROKES * PERIOD) {
      tour.mode = "hold";
      tour.modeT = 0;
      return 0;
    }
    const phase = (tour.t % PERIOD) / PERIOD;
    return phase < DOWN ? L.ease(phase / DOWN) : 1 - L.ease((phase - DOWN) / (1 - DOWN));
  }
  if (tour.mode === "hold" && tour.modeT > 0.8) {
    tour.mode = "lower";
    tour.modeT = 0;
    releaseOpen = true;
  }
  if (tour.mode === "lower" && jack.h <= 0 && tour.modeT > 0.5) {
    tour.mode = "close";
    tour.modeT = 0;
    releaseOpen = false;
  }
  if (tour.mode === "close" && tour.modeT > 0.9) {
    tour.mode = "pump";
    tour.modeT = 0;
    tour.t = 0;
  }
  return 0;
}

function newTrace() {
  prev = now;
  jack.travel = 0;
  now = [[0, jack.h]];
  restart = false;
}

// ---------------------------------------------------------------- step and render
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  const driven = (live.touring || auto) && !dragging;
  for (let i = 0; i < n; i++) {
    if (driven) {
      if (live.touring) target = tourStep(h);
      else {
        tour.t += h;
        const phase = (tour.t % PERIOD) / PERIOD;
        target = phase < DOWN ? L.ease(phase / DOWN) : 1 - L.ease((phase - DOWN) / (1 - DOWN));
      }
    }
    const was = x;
    x = live.reduced && !driven ? target : L.follow(x, target, driven ? 40 : 18, h);
    x = Math.min(1, Math.max(0, x));
    if (restart && x > was + 1e-6) newTrace();
    eWant = releaseOpen ? E_OPEN : 0;
    e = live.reduced ? eWant : L.follow(e, eWant, 10, h);
    jack.e = e < 0.002 ? 0 : e;
    const hBefore = jack.h;
    M.advance(jack, x, h);
    if (hBefore > 0 && jack.h <= 0) restart = true;
    lifts.s = L.follow(lifts.s, jack.suction ? M.BALL_LIFT : 0, jack.suction ? 50 : 25, h);
    lifts.d = L.follow(lifts.d, jack.delivering ? M.BALL_LIFT : 0, jack.delivering ? 50 : 25, h);
    lifts.r = L.follow(lifts.r, jack.relief ? 0.6 : 0, 40, h);
  }
  const N = M.strokes(jack);
  const last = now[now.length - 1];
  if (!last || Math.abs(N - last[0]) > 0.02 || Math.abs(jack.h - last[1]) > 0.2) now.push([N, jack.h]);
  if (now.length > 1600) now.splice(1, now.length - 1600);
  return Math.abs(x - target) > 1e-4 || Math.abs(e - eWant) > 1e-4 || jack.lowering || lifts.s + lifts.d + lifts.r > 1e-3;
}

const pts = (list) =>
  list.map(([n, hh]) => `${K.r2(CH.x0 + (Math.min(CH.nMax, n) / CH.nMax) * (CH.x1 - CH.x0))},${K.r2(CH.y1 - (hh / CH.hMax) * (CH.y1 - CH.y0))}`).join(" ");
const tint = (bar) => K.r2(0.15 + 0.85 * Math.min(1, Math.max(0, bar / M.P_RELIEF)));
let shown = { s: -1, d: -1, r: -1, aaRam: null, aaPl: null };

function render(live) {
  const hh = jack.h;
  for (const [node, V] of el.ram) node.setAttribute("transform", `translate(0 ${K.r2(-hh * V.k)})`);
  el.mvb.setAttribute("transform", `translate(0 ${K.r2(-hh * VM.k)})`);
  for (const [node, V] of el.pl) node.setAttribute("transform", `translate(0 ${K.r2(M.PUMP_STROKE * x * V.k)})`);
  const st = P.socketTransform(VM, x);
  for (const node of el.sock) node.setAttribute("transform", st);
  el.link.setAttribute("transform", P.linkTransform(VM, x));
  for (const [node, V] of el.rel) node.setAttribute("transform", `translate(${K.r2(-e * V.k)} 0)`);
  if (Math.abs(lifts.s - shown.s) + Math.abs(lifts.d - shown.d) + Math.abs(lifts.r - shown.r) > 0.004) {
    for (const [node, V] of el.valves)
      node.innerHTML = P.suctionBall(V, lifts.s) + P.deliveryBall(V, lifts.d) + P.deliverySpring(V, lifts.d) + P.reliefBall(V, lifts.r) + P.reliefSpring(V, lifts.r);
    shown = { ...shown, s: lifts.s, d: lifts.d, r: lifts.r };
  }
  for (const [node, V] of el.oilR) node.setAttribute("d", P.oilPath(V, P.resOil(hh)));
  for (const [node, V] of el.oilP) {
    node.setAttribute("d", P.oilPath(V, P.pumpOil(x)));
    node.setAttribute("fill-opacity", tint(jack.pp));
  }
  for (const [node, V] of el.oilH) {
    node.setAttribute("d", P.oilPath(V, P.ramOil(hh)));
    node.setAttribute("fill-opacity", tint(jack.p));
  }
  const aaRam = P.planRam(VA, hh);
  if (aaRam !== shown.aaRam) el.aaRam.innerHTML = shown.aaRam = aaRam;
  const aaPl = P.planPlunger(VA, x);
  if (aaPl !== shown.aaPl) el.aaPl.innerHTML = shown.aaPl = aaPl;
  el.oilARam.setAttribute("fill-opacity", tint(jack.p));
  el.oilAPump.setAttribute("fill-opacity", tint(jack.pp));
  el.dimLift.innerHTML = K.dim(VM, [-17, M.CLOSED_H], [-17, M.CLOSED_H + hh], { dir: "v", off: 130 - VM.p([-17, 0])[0], text: `h=${hh.toFixed(1)}`, id: "dim-lift" });
  el.dynb.innerHTML = X.liveBalloons({ VM, VB }, x, hh);
  el.traceNow.setAttribute("points", pts(now));
  el.tracePrev.setAttribute("points", pts(prev));
  const N = M.strokes(jack);
  el.dot.setAttribute("cx", K.r2(CH.x0 + (Math.min(CH.nMax, N) / CH.nMax) * (CH.x1 - CH.x0)));
  el.dot.setAttribute("cy", K.r2(CH.y1 - (hh / CH.hMax) * (CH.y1 - CH.y0)));
  const need = M.pressureFor(jack.load);
  const state = jack.lowering ? "LOWERING" : jack.relief ? "RELIEF OPEN" : jack.delivering ? "LIFTING" : releaseOpen ? "RELEASE OPEN" : "HOLDING";
  const hand = Math.round(M.handleForce(Math.min(need, M.P_RELIEF)));
  const kN = ((jack.load * M.G) / 1000).toFixed(1);
  el.readout.textContent = `h ${hh.toFixed(1)} mm · N ${N.toFixed(1)} · p ${Math.round(jack.p)} bar · ${hand} N → ${kN} kN · ${state}`;
  say(`Ram lift ${hh.toFixed(0)} millimetres after ${N.toFixed(0)} strokes, ${Math.round(jack.p)} bar, ${hand} newtons on the handle hold ${jack.load} kilograms. ${state.toLowerCase()}.`, live.clock);
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
  // A still, true moment: the tour played to 12 s, drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 12; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const clamp = (v) => Math.min(1, Math.max(0, v));
const handGain = (P.HANDLE_END - M.LINK_B[0]) / M.ARM; // the hand moves this much more than the plunger
for (const hit of svg.querySelectorAll("[data-drag]")) {
  let x0 = 0;
  const per = hit.dataset.drag === "B" ? M.PUMP_STROKE * VB.k : M.PUMP_STROKE * handGain * VM.k;
  L.dragY(svg, hit, {
    start: () => {
      dragging = true;
      auto = false;
      x0 = x;
      target = x;
      live.input();
    },
    move: (dy) => {
      target = clamp(x0 + dy / per);
      live.input();
    },
    end: () => {
      dragging = false;
      live.input();
    },
  });
}

svg.addEventListener("keydown", (ev) => {
  const k = ev.key;
  if (k === "ArrowDown" || k === "ArrowUp") target = clamp(target + (k === "ArrowDown" ? 0.25 : -0.25));
  else if (k === "End") target = 1;
  else if (k === "Home") target = 0;
  else if (k === " ") auto = !auto;
  else if (k === "o" || k === "O") releaseOpen = !releaseOpen;
  else if (k === "l" || k === "L") jack.load = M.LOADS[(loadIx = (loadIx + 1) % M.LOADS.length)];
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.2 : live.slow === 0.2 ? 0.05 : 1;
  else return;
  ev.preventDefault();
  if (k.length > 1 && k !== " ") auto = false;
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
