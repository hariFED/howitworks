// Page code for floor-pump.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
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

const el = {
  mvMain: $("mv-main"),
  mvB: $("mv-B"),
  mvbMain: $("mvb-main"),
  cups: [["main", VM], ["B", VB], ["D", VD]].map(([id, V]) => [$(`cup-${id}`), V]),
  valves: [["main", VM], ["B", VB]].map(([id, V]) => [$(`valve-${id}`), V]),
  tintC: [["main", VM], ["B", VB]].map(([id, V]) => [$(`tint-c-${id}`), V]),
  tintCD: $("tint-c-D"),
  tintT: [$("tint-t-main"), $("tint-t-B")],
  needleMain: $("needle-main"),
  needleFace: $("needle-face"),
  dimTravel: $("dim-travel-wrap"),
  traceNow: $("trace-now"),
  tracePrev: $("trace-prev"),
  dot: $("chart-dot"),
  tyreLine: $("chart-tyre"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
const air = M.pump();
let x = 0; // stroke, 0 handle up, 1 at the bottom
let target = 0;
let fold = 0; // the cup lip folding in on the upstroke, mm
let lift = 0; // the ball off its seat, mm
let needle = M.START_GAUGE;
let auto = false;
let dragging = false;
let now = [];
let prev = [];
let reachedBottom = false;

// The tour: pump at a steady rate, let the tyre down when it is hard, start again.
const PERIOD = 1.8;
const DOWN = 0.56; // the share of a stroke spent pushing down
const tour = { t: 0, cycle: 0, mode: "pump", modeT: 0, from: 0 };
function tourTarget(h) {
  tour.modeT += h;
  if (tour.mode === "pump") {
    tour.t += h;
    const cycle = Math.floor(tour.t / PERIOD);
    if (cycle !== tour.cycle) {
      tour.cycle = cycle;
      if (M.gauge(air.pt) >= M.RESET_GAUGE) {
        tour.mode = "hold";
        tour.modeT = 0;
        return 0;
      }
    }
    const phase = (tour.t % PERIOD) / PERIOD;
    return phase < DOWN ? L.ease(phase / DOWN) : 1 - L.ease((phase - DOWN) / (1 - DOWN));
  }
  if (tour.mode === "hold" && tour.modeT > 1.4) {
    tour.mode = "deflate";
    tour.modeT = 0;
    tour.from = M.gauge(air.pt);
  }
  if (tour.mode === "deflate") {
    const k = Math.min(1, tour.modeT / 1.8);
    M.setTyre(air, tour.from + (M.START_GAUGE - tour.from) * L.ease(k));
    if (k >= 1) {
      air.strokes = 0;
      tour.mode = "pump";
      tour.modeT = 0;
      tour.t = 0;
      tour.cycle = 0;
    }
  }
  return 0;
}

function letDown() {
  M.setTyre(air, M.START_GAUGE);
  air.strokes = 0;
  now = [];
  prev = [];
}

// ---------------------------------------------------------------- step and render
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  const driven = (live.touring || auto) && !dragging;
  for (let i = 0; i < n; i++) {
    if (driven) target = tourTarget(h);
    x = live.reduced && !driven ? target : L.follow(x, target, driven ? 30 : 18, h);
    x = Math.min(1, Math.max(0, x));
    M.advance(air, x);
    lift = L.follow(lift, air.open ? M.BALL_LIFT : 0, air.open ? 60 : 22, h);
    fold = L.follow(fold, air.intake ? 1.2 : 0, 26, h);
    needle = L.follow(needle, M.gauge(air.pt), 10, h);
  }
  // one trace per stroke: a new one starts when the handle comes back to the top
  if (x > 0.9) reachedBottom = true;
  if (reachedBottom && x < 0.01) {
    prev = now;
    now = [];
    reachedBottom = false;
  }
  if (now.length < 900) now.push([M.STROKE * x, M.gauge(air.p)]);
  return Math.abs(x - target) > 1e-4 || lift > 1e-3 || fold > 1e-3 || Math.abs(needle - M.gauge(air.pt)) > 1e-3;
}

const pts = (list) => list.map(([s, g]) => `${K.r2(CH.x0 + (s / CH.sMax) * (CH.x1 - CH.x0))},${K.r2(CH.y1 - (Math.min(CH.gMax, Math.max(0, g)) / CH.gMax) * (CH.y1 - CH.y0))}`).join(" ");
let shown = { lift: -1, fold: -1, needle: -99 };

function render(live) {
  const up = M.STROKE * (1 - x);
  el.mvMain.setAttribute("transform", `translate(0 ${K.r2(-up * VM.k)})`);
  el.mvbMain.setAttribute("transform", `translate(0 ${K.r2(-up * VM.k)})`);
  el.mvB.setAttribute("transform", `translate(0 ${K.r2(-up * VB.k)})`);
  for (const [node, V] of el.tintC) node.setAttribute("d", P.airPath(V, P.chamberAir(x)));
  const tint = (p) => K.r2(0.18 + 0.82 * Math.min(1, Math.max(0, M.gauge(p) / 7)));
  for (const [node] of el.tintC) node.setAttribute("fill-opacity", tint(air.p));
  el.tintCD.setAttribute("fill-opacity", tint(air.p));
  for (const node of el.tintT) node.setAttribute("fill-opacity", tint(air.pt));
  if (Math.abs(lift - shown.lift) > 0.004) {
    for (const [node, V] of el.valves) node.innerHTML = P.ball(V, lift) + P.spring(V, lift);
    shown.lift = lift;
  }
  if (Math.abs(fold - shown.fold) > 0.004) {
    for (const [node, V] of el.cups) node.innerHTML = P.cup(V, fold);
    shown.fold = fold;
  }
  if (Math.abs(needle - shown.needle) > 0.002) {
    el.needleMain.innerHTML = P.needleSection(VM, needle);
    el.needleFace.innerHTML = P.needleFace(VC, needle);
    shown.needle = needle;
  }
  const travel = M.STROKE * x;
  const hcTop = P.handleCentre(M.pistonV(0));
  el.dimTravel.innerHTML = K.dim(VM, [140, hcTop], [140, hcTop - travel], { dir: "v", off: 16, text: `s=${Math.round(travel)}`, id: "dim-travel" });
  el.traceNow.setAttribute("points", pts(now));
  el.tracePrev.setAttribute("points", pts(prev));
  const g = M.gauge(air.p);
  el.dot.setAttribute("cx", K.r2(CH.x0 + (travel / CH.sMax) * (CH.x1 - CH.x0)));
  el.dot.setAttribute("cy", K.r2(CH.y1 - (Math.min(CH.gMax, Math.max(0, g)) / CH.gMax) * (CH.y1 - CH.y0)));
  const ty = K.r2(CH.y1 - (Math.min(CH.gMax, M.gauge(air.pt)) / CH.gMax) * (CH.y1 - CH.y0));
  el.tyreLine.setAttribute("d", `M${CH.x0} ${ty}H${CH.x1}`);
  const valve = air.open ? "OPEN" : "SHUT";
  const text = `s ${Math.round(travel)} mm · CHAMBER ${g.toFixed(2)} bar · TYRE ${M.gauge(air.pt).toFixed(2)} bar · F ${Math.round(M.force(air.p))} N · VALVE ${valve}`;
  el.readout.textContent = text;
  say(`Travel ${Math.round(travel)} millimetres, chamber ${g.toFixed(1)} bar, tyre ${M.gauge(air.pt).toFixed(1)} bar, handle force ${Math.round(M.force(air.p))} newtons.`, live.clock);
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
  // A still, true moment: the tour played to 9 s, drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 9; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const clamp = (v) => Math.min(1, Math.max(0, v));
for (const hit of svg.querySelectorAll("[data-drag]")) {
  let x0 = 0;
  L.dragY(svg, hit, {
    start: () => {
      dragging = true;
      auto = false;
      x0 = x;
      target = x;
      live.input();
    },
    move: (dy) => {
      target = clamp(x0 + dy / (M.STROKE * VM.k));
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
  if (k === "ArrowDown" || k === "ArrowUp") target = clamp(target + (k === "ArrowDown" ? 0.1 : -0.1));
  else if (k === "End") target = 1;
  else if (k === "Home") target = 0;
  else if (k === " ") auto = !auto;
  else if (k === "r" || k === "R") letDown();
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.2 : live.slow === 0.2 ? 0.05 : 1;
  else return;
  e.preventDefault();
  if (k !== " " && k.length > 1) auto = false;
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
