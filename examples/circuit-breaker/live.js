// Page code for circuit-breaker.html. K (kit), L (runtime), C (self-check), M (model), X (local
// helpers) and P (parts) are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VW = { main: K.view(specs.main), B: K.view(specs.B), C: K.view({ ...specs.C, name: "C" }), D: K.view(specs.D), E: K.view(specs.E) };
const CH = __CHART__;
const DET = __DETAILS__;
const $ = (id) => document.getElementById(id);
const IDS = ["main", "B", "C", "D"];

const el = {
  mech: IDS.map((id) => [$(`mech-${id}`), VW[id]]),
  flow: IDS.map((id) => [$(`flow-${id}`), VW[id]]),
  arc: IDS.map((id) => [$(`arc-${id}`), VW[id]]),
  dimHandle: $("dim-handle-wrap"),
  frontHandle: $("front-handle"),
  dimF: $("dim-f-wrap"),
  balloons: $("balloons"),
  trace: $("trace"),
  dot: $("chart-dot"),
  tripMark: $("trip-mark"),
  readout: $("readout"),
  states: { closed: $("st-closed"), open: $("st-open"), half: $("st-half"), off: $("st-off") },
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
const ON = M.HANDLE_ON;
const OFF = M.HANDLE_OFF;
const s = {
  load: M.LOAD_NORMAL, // the current the circuit would draw, A
  dT: M.dTss(M.LOAD_NORMAL), // bimetal temperature rise, K
  h: ON, // handle angle
  a: 0, // contact arm angle
  pawl: 0,
  plunger: 0,
  pulse: 0, // seconds the coil keeps pulling after a fault
  held: true, // closed and latched at ON
  latched: true, // the pawl holds the arm to the cradle
  tripped: false,
  arc: -1, // arc progress 0..1, or -1
  arcSeed: 1,
  phase: 0, // charge flow, for the moving dashes
  last: null, // the last trip: { m, t, kind, I }
  loadSince: 0, // when the current last changed, s
  note: "",
};
let clock = 0;
let dragging = false;
let dragH = OFF;
let auto = true; // Space toggles the tour on and off when the user has taken over
let pushUp = false; // the up key drives the handle to ON
let pushDown = false; // the down key drives it to OFF (clearing held alone let it re-close at once)

const f = () => M.deflection(s.dT);
const current = () => (s.held && s.a < 0.5 ? s.load : 0);
function stateName() {
  if (s.held) return "closed";
  if (s.tripped) return f() >= M.F_RESET || !s.latched ? "open" : "half";
  return "off";
}

function trip(kind, I, t) {
  s.latched = false;
  s.held = false;
  s.tripped = true;
  s.arc = 0;
  s.arcSeed = (s.arcSeed * 7 + 3) % 97;
  s.last = { m: I / M.IN, t, kind, I };
  if (kind === "MAGNETIC") s.pulse = 0.35;
}

// Closing: the latch holds only if the bimetal has cooled; into a fault the coil trips at once.
function tryClose() {
  if (!s.latched || s.held) return;
  if (f() >= M.F_RESET) {
    trip("HOT", s.load, 0);
    s.arc = -1;
    s.note = "RESET REFUSED: STILL HOT";
    return;
  }
  s.held = true;
  s.tripped = false;
  s.loadSince = clock;
  s.note = "";
}

// ---------------------------------------------------------------- the tour
// Normal load, an overload that trips on heat, the cool-down, a reset; a short circuit that trips
// at once, a reset into the fault (half-open fails), the fault cleared and a reset that holds.
const tour = { i: 0, t: 0 };
const PH = [
  { load: M.LOAD_NORMAL, until: (t) => t > 4 },
  { load: M.LOAD_OVER, until: () => s.tripped && !s.held },
  { until: (t) => stateName() === "half" && s.h < OFF + 0.5 && tour.ready(t, 1.2) },
  { load: M.LOAD_NORMAL, raise: true, until: (t) => t > 1.3 },
  { until: (t) => t > 3 },
  { load: M.LOAD_FAULT, until: (t) => t > 2.4 },
  { raise: true, until: (t) => t > 2.2 },
  { load: M.LOAD_NORMAL, raise: true, until: (t) => t > 1.4 },
  { until: (t) => t > 2.6, next: 1 },
];
tour.ready = (t, wait) => {
  if (tour.okAt == null) tour.okAt = t;
  return t - tour.okAt > wait;
};
function tourStep(dt) {
  const p = PH[tour.i];
  if (tour.t === 0 && p.load != null) setLoad(p.load);
  tour.t += dt;
  const want = p.raise && tour.t < 1.1 ? OFF + (ON - OFF) * L.ease(tour.t / 0.9) : null;
  if (p.until(tour.t)) {
    tour.i = p.next ?? (tour.i + 1) % PH.length;
    tour.t = 0;
    tour.okAt = null;
  }
  return want;
}

function setLoad(I) {
  if (I === s.load) return;
  s.load = I;
  s.loadSince = clock;
}

// ---------------------------------------------------------------- step
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  const driven = live.touring && auto && !dragging;
  for (let i = 0; i < n; i++) {
    clock += h;
    let want = s.held ? ON : OFF;
    if (driven) {
      const w = tourStep(h);
      if (w != null) want = w;
    }
    if (pushUp) want = ON;
    if (pushDown) want = OFF;
    if (dragging) want = dragH;
    const rate = want > s.h ? 16 : s.held ? 16 : 11;
    s.h = live.reduced && !driven ? want : L.follow(s.h, want, rate, h);
    if (pushDown && s.h <= OFF + 1) pushDown = false;
    if (!s.held && !pushDown && s.h >= ON - 1) {
      tryClose();
      pushUp = false;
    }
    if (s.held && s.h < ON - 12) s.held = false; // switched off by hand
    if (!s.latched && s.h <= OFF + 1) s.latched = true; // the pawl drops back under the arm's lug
    const c = M.cradleAngle(s.h);
    const wantA = s.latched ? c : M.ARM_OPEN;
    s.a = L.follow(s.a, wantA, s.latched ? 40 : 55, h);
    s.c = c;

    const I = current();
    if (I > 0 && I >= M.IM) {
      const tm = M.magneticTime(I);
      s.dT += (I * I * M.R_BI * tm) / M.C_TH;
      trip("MAGNETIC", I, tm);
    } else {
      s.dT = M.heat(s.dT, I, h);
      if (I > 0 && f() >= M.F_TRIP) trip("THERMAL", I, clock - s.loadSince);
    }
    if (s.pulse > 0) s.pulse -= h;
    s.plunger = L.follow(s.plunger, s.pulse > 0 ? M.GAP_G : 0, s.pulse > 0 ? 70 : 18, h);
    s.pawl = L.follow(s.pawl, !s.latched && c < 4 ? 24 : 0, 30, h);
    if (s.arc >= 0) {
      s.arc += h / 0.5;
      if (s.arc > 1) s.arc = -1;
    }
    s.phase += h * (I > 0 ? 6 + 9 * Math.log10(1 + I) : 0);
  }
  return true;
}

// ---------------------------------------------------------------- render
const chX = (m) => K.r2(CH.x0 + (Math.log10(m / CH.i0) / Math.log10(CH.i1 / CH.i0)) * (CH.x1 - CH.x0));
const chY = (t) => K.r2(CH.y1 - (Math.log10(Math.min(CH.t1, Math.max(CH.t0, t)) / CH.t0) / Math.log10(CH.t1 / CH.t0)) * (CH.y1 - CH.y0));
let trace = [];
let traceKey = null;

// Balloons: [view, item, world point (may move with the pose), sheet position of the circle]
const BAL = [
  ["main", 1, () => [1, 75], [77, 326]],
  ["main", 2, () => [1.5, 12], [77, 452]],
  ["main", 3, () => [39.6, 84], [287, 76]],
  ["main", 4, () => [56, 82.5], [355, 76]],
  ["main", 5, () => [30, 71.2], [225, 76]],
  ["main", 9, () => [20.5, 15], [77, 426]],
  ["main", 15, (S) => X.rotPt([28, 42], P.T, -S.lever), [77, 374]],
  ["main", 16, (S) => midLink(S), [395, 128]],
  ["main", 17, (S) => X.rotPt([P.H[0] + 22, P.H[1] - 3.6], P.H, S.h), [445, 128]],
  ["main", 18, () => [P.H[0] + 1, P.H[1] - 0.6], [470, 128]],
  ["main", 19, (S) => P.handleSpringDot(S.h), [325, 545]],
  ["main", 20, (S) => P.armSpringDot(S.a), [420, 128]],
  ["main", 21, () => [12.9, P.VC + 4.7], [77, 350]],
  ["main", 22, () => [6.6, P.VC + 5], [77, 302]],
  ["main", 23, () => [5.2, P.VC], [77, 400]],
  ["main", 24, (S) => [11 + S.plunger, P.VC + 1.5], [165, 545]],
  ["main", 28, (S) => [P.BI_BACK + 0.15 + P.biShift(15, S.f), 15], [287, 545]],
  ["main", 29, () => [42, 17.8], [370, 545]],
  ["B", 6, () => [17.8, 69.8], [760, 70]],
  ["B", 7, () => [13.2, 55], [525, 205]],
  ["B", 8, () => [5, PLATE(6)], [525, 120]],
  ["B", 10, (S) => X.rotPt([20.6, 64.6], P.MP, S.a), [760, 160]],
  ["B", 11, (S) => X.rotPt([17.6, 68.6], P.MP, S.a), [760, 115]],
  ["C", 12, () => [P.MP[0] + 0.4, P.MP[1] + 0.5], [760, 350]],
  ["C", 13, (S) => X.rotPt([40.5, 52.6], P.MP, S.c), [760, 420]],
  ["C", 14, (S) => pawlPt(S), [525, 390]],
  ["D", 25, (S) => [P.strikerTip(S.plunger) - 1.2, P.VC + 0.2], [525, 600]],
  ["main", 26, (S) => P.plungerSpringDot(S.plunger), [77, 480]],
  ["D", 27, (S) => braid2Pt(S), [760, 690]],
  ["D", 30, (S) => X.rotPt([29.8, P.LEVER_SCREW_V], P.T, -S.lever), [760, 620]],
];
const PLATE = (i) => P.PLATE_V[i] + 0.4;
function midLink(S) {
  const A = M.crankPin(S.h);
  const Bp = X.rotPt(M.B0, P.MP, S.c);
  return [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2];
}
const springMid = (a, b) => [a[0] + (b[0] - a[0]) * 0.5, a[1] + (b[1] - a[1]) * 0.5];
function pawlPt(S) {
  const Pp = X.rotPt(P.P0, P.MP, S.c);
  return X.rot(X.rot([[32.2, 55.2]], P.MP, S.c), Pp, S.pawl)[0];
}
function braid2Pt(S) {
  const tip = P.biTip(S.f);
  return X.quad([tip[0] - 0.2, tip[1]], [36.5, 25], [36.4, 18.4], 12)[6];
}

let shown = "";
function render(live) {
  const S = { h: s.h, c: M.cradleAngle(s.h), a: s.a, pawl: s.pawl, lever: M.leverAngle(f(), s.plunger), plunger: s.plunger, f: f() };
  const key = [S.h, S.a, S.pawl, S.lever, S.plunger, S.f].map((v) => v.toFixed(3)).join();
  if (key !== shown) {
    for (const [node, V] of el.mech) node.innerHTML = moving(V, S);
    el.frontHandle.innerHTML = P.frontHandle(VW.E, S.h);
    shown = key;
  }
  // the current path: lit while current flows or an arc burns
  const I = current();
  const arcing = s.arc >= 0;
  const lit = I > 0 || arcing;
  const paths = arcing ? P.currentPath(S, { closed: false, lowerFromRunner: s.arc >= 0.4 }) : P.currentPath(S);
  const arcs = arcing ? P.arcPaths(S, s.arc, s.arcSeed) : [];
  for (const [node, V] of el.flow) {
    node.setAttribute("d", lit ? paths.map((l) => K.d(V, l, false)).join("") : "");
    node.style.strokeDashoffset = K.r2(-s.phase);
  }
  for (const [node, V] of el.arc) node.setAttribute("d", arcs.map((l) => K.d(V, l, false)).join(""));
  const fade = arcing && s.arc > 0.75 ? 1 - (s.arc - 0.75) / 0.25 : 1;
  for (const [node] of el.arc) node.style.opacity = K.r2(fade);

  // live dimensions: handle travel from OFF, bimetal tip deflection
  el.dimHandle.innerHTML = X.angDim(VW.main, P.H, 31, OFF, Math.max(OFF, S.h), `${Math.round(Math.max(0, S.h - OFF))}°`, { id: "dim-handle" });
  const ft = P.biTip(S.f)[0];
  el.dimF.innerHTML = K.dim(VW.D, [P.BI_BACK + M.BI_S, P.BI_TIP], [ft, P.BI_TIP], { dir: "h", off: -46, text: S.f.toFixed(2), id: "dim-f" });

  // balloons ride with their parts
  el.balloons.innerHTML = BAL.map(([v, n, at, b]) => K.balloon(VW[v], at(S), b, n, { target: n })).join("");

  // DIAGRAM 1: the operating point at (I, the time I would take from cold to heat the strip this far)
  if (I > 0) {
    const m = I / M.IN;
    const t = I >= M.IM ? M.magneticTime(I) : M.equivalentTime(I, s.dT);
    const k = `${I}`;
    if (k !== traceKey) {
      trace = [];
      traceKey = k;
    }
    const pt = `${chX(Math.max(CH.i0, m))},${chY(t)}`;
    if (trace[trace.length - 1] !== pt) trace.push(pt);
    if (trace.length > 400) trace.shift();
    el.dot.style.display = "";
    el.dot.setAttribute("cx", chX(Math.max(CH.i0, m)));
    el.dot.setAttribute("cy", chY(t));
  } else {
    el.dot.style.display = "none";
    traceKey = null;
  }
  el.trace.setAttribute("points", trace.join(" "));
  el.tripMark.style.display = s.last ? "" : "none";
  if (s.last) {
    el.tripMark.setAttribute("cx", chX(Math.max(CH.i0, s.last.m)));
    el.tripMark.setAttribute("cy", chY(Math.max(CH.t0, s.last.t || CH.t0)));
  }

  // DIAGRAM 2 and the readout
  const name = stateName();
  for (const [k, node] of Object.entries(el.states)) node.classList.toggle("on", k === name);
  const label = { closed: "CLOSED", open: "OPEN", half: "HALF-OPEN", off: "OFF" }[name];
  let tail;
  if (name === "closed") {
    const tt = M.timeToTrip(I, s.dT);
    tail = I >= M.IM ? "TRIP NOW" : Number.isFinite(tt) ? `TRIP IN ${tt.toFixed(1)} s` : "NO TRIP";
  } else if (name === "open") {
    tail = s.note || (s.last && s.last.kind === "MAGNETIC" ? `MAGNETIC TRIP IN ${(s.last.t * 1000).toFixed(1)} ms` : `RESET IN ${M.coolTime(s.dT).toFixed(1)} s`);
    if (!s.note && s.last && s.last.kind === "MAGNETIC" && f() >= M.F_RESET) tail = `RESET IN ${M.coolTime(s.dT).toFixed(1)} s`;
  } else if (name === "half") tail = "RESET ARMED";
  else tail = "SWITCHED OFF";
  if (name !== "open" && name !== "half") s.note = name === "closed" ? "" : s.note;
  const amps = I > 0 ? `${I.toFixed(I >= 100 ? 0 : 1)} A = ${(I / M.IN).toFixed(2)} In` : "0 A";
  const text = `${label} · I ${amps} · ΔT ${Math.round(s.dT)} K · f ${S.f.toFixed(2)} mm · ${tail}`;
  el.readout.textContent = text;
  say(`${label}. Current ${Math.round(I)} amps, bimetal ${Math.round(s.dT)} kelvin above ambient. ${tail.toLowerCase()}.`, live.clock);
}

function moving(V, S) {
  return (
    P.cradle(V, S.c) + P.pawl(V, S.c, S.pawl) + P.link(V, S.h, S.c) + P.lever(V, S.lever) + P.bimetal(V, S.f) + P.braids(V, S.a, S.f) +
    P.arm(V, S.a) + (V.name === "C" ? P.latchBreakout(V, S) : "") + P.handle(V, S.h) + P.springs(V, S.h, S.a) + P.plunger(V, S.plunger) + P.striker(V, S.plunger) + P.plungerSpring(V, S.plunger)
  );
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
  // A still, true moment: the overload half-way to its trip, drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 8; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const hit = svg.querySelector('[data-drag="handle"]');
let h0 = 0;
L.dragY(svg, hit, {
  start: () => {
    dragging = true;
    pushDown = false;
    h0 = s.h;
    dragH = s.h;
    live.input();
  },
  move: (dy) => {
    dragH = Math.min(ON, Math.max(OFF, h0 - (dy / (24 * VW.main.k)) * (180 / Math.PI)));
    live.input();
  },
  end: () => {
    dragging = false;
    live.input();
  },
});

const LOADS = [0, 6, 12, 16, 18, 20, 24, 30, 40, 50, 64, 100, 200, 480];
svg.addEventListener("keydown", (e) => {
  const k = e.key;
  let used = true;
  if (k === "ArrowUp") (pushUp = !s.held), (pushDown = false);
  else if (k === "ArrowDown") {
    pushUp = false;
    pushDown = s.held || s.h > OFF + 1;
  } else if (k === "1") setLoad(M.LOAD_NORMAL);
  else if (k === "2") setLoad(M.LOAD_OVER);
  else if (k === "3") setLoad(M.LOAD_FAULT);
  else if (k === "ArrowRight" || k === "ArrowLeft") {
    const i = LOADS.findIndex((v) => v >= s.load - 1e-9);
    const j = Math.min(LOADS.length - 1, Math.max(0, (i < 0 ? LOADS.length - 1 : i) + (k === "ArrowRight" ? 1 : -1)));
    setLoad(LOADS[j]);
  } else if (k === " ") auto = !auto;
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.2 : live.slow === 0.2 ? 0.05 : 1;
  else used = false;
  if (!used) return;
  e.preventDefault();
  if (k === " " && auto) {
    live.lastInput = -Infinity;
    live.wake?.();
    return;
  }
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
