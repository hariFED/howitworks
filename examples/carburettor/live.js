// Page code for carburettor.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
// are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VM = K.view(specs.main);
const VB = K.view(specs.B);
const VD = K.view(specs.D);
const VC = K.view(specs.C);
const C1 = __C1__;
const C2 = __C2__;
const BOX_D = __D__;
const $ = (id) => document.getElementById(id);
const VIEWS = [["main", VM], ["B", VB], ["D", VD]];

const el = {};
for (const [id] of VIEWS) {
  el[id] = {};
  for (const name of ["float", "needle", "screw", "choke", "plate"]) el[id][name] = $(`${name}-${id}`);
  for (const f of ["bowl", "stream", "col", "emul", "spray", "pilot", "pemul", "plume", "pplume"]) el[id][f] = $(`f-${f}-${id}`);
}
const ui = {
  bChoke: $("b-choke"),
  bPlate: $("b-plate"),
  cThrottle: $("c-throttle"),
  cChoke: $("c-choke"),
  dimLevel: $("dim-level-wrap"),
  dimEdge: $("dim-edge-wrap"),
  c1afr: $("c1-afr"),
  c1main: $("c1-main"),
  c1choke: $("c1-choke"),
  c1dot: $("c1-dot"),
  c2dot: $("c2-dot"),
  c2dp: $("c2-dp"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
const s = { theta: 0, thetaT: 0, choke: 0, chokeT: 0, turns: M.SCREW_TURNS, level: M.LEVEL_SET };
s.level = M.steadyLevel(M.solve(0).fuelVol);
let r = M.solve(0, { level: s.level });
let dragging = false;

// The tour, 16 s: idle, snap wide open (the bowl drains, the needle opens), back to part throttle,
// idle while the bowl refills and the needle seats, then a cold start on the choke.
const PERIOD = 16;
let tourT = 0;
function tourTargets(t) {
  const T = t % PERIOD;
  const seg = (a, b, x0, x1) => x0 + (x1 - x0) * L.ease((T - a) / (b - a));
  let theta = 0;
  if (T >= 1.5 && T < 2.7) theta = seg(1.5, 2.7, 0, M.THETA_MAX);
  else if (T >= 2.7 && T < 6.5) theta = M.THETA_MAX;
  else if (T >= 6.5 && T < 7.5) theta = seg(6.5, 7.5, M.THETA_MAX, 22);
  else if (T >= 7.5 && T < 9.5) theta = 22;
  else if (T >= 9.5 && T < 10.3) theta = seg(9.5, 10.3, 22, 0);
  let choke = 0;
  if (T >= 12.5 && T < 13.1) choke = seg(12.5, 13.1, 0, 1);
  else if (T >= 13.1 && T < 15) choke = 1;
  else if (T >= 15 && T < 15.6) choke = seg(15, 15.6, 1, 0);
  return { theta, choke };
}

// ---------------------------------------------------------------- step and render
let sinceSolve = 1;
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  const driven = live.touring && !dragging;
  let busy = false;
  for (let i = 0; i < n; i++) {
    if (driven) {
      tourT += h;
      const t = tourTargets(tourT);
      s.thetaT = t.theta;
      s.chokeT = t.choke;
    }
    const still = live.reduced && !driven;
    s.theta = still ? s.thetaT : L.follow(s.theta, s.thetaT, driven ? 40 : 16, h);
    s.choke = still ? s.chokeT : L.follow(s.choke, s.chokeT, 12, h);
    // the air and fuel settle in milliseconds; solving them 60 times a second is plenty
    sinceSolve += h;
    if (sinceSolve >= 1 / 60 - 1e-9) {
      sinceSolve = 0;
      r = M.solve(s.theta, { choke: s.choke, level: s.level, turns: s.turns });
    }
    const next = M.stepLevel(s.level, r.fuelVol, h);
    busy = busy || Math.abs(next - s.level) > 1e-5;
    s.level = next;
  }
  return busy || Math.abs(s.theta - s.thetaT) > 1e-3 || Math.abs(s.choke - s.chokeT) > 1e-3;
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const pts = (list) => list.map(([x, y]) => `${K.r2(x)},${K.r2(y)}`).join(" ");
const c1x = (t) => C1.x0 + (t / C1.tMax) * (C1.x1 - C1.x0);
const c1y = (a) => C1.y1 - ((Math.min(C1.aMax + 2, Math.max(C1.aMin - 2, a)) - C1.aMin) / (C1.aMax - C1.aMin)) * (C1.y1 - C1.y0);

// Diagram 1's curves hold for the screw setting; they are worked out again when it changes.
function curves() {
  const afr = [];
  const main = [];
  const choke = [];
  for (let t = 0; t <= M.THETA_MAX + 1e-9; t += M.THETA_MAX / 80) {
    let lvl = M.LEVEL_SET;
    let a = M.solve(t, { level: lvl, turns: s.turns });
    lvl = M.steadyLevel(a.fuelVol);
    a = M.solve(t, { level: lvl, turns: s.turns });
    afr.push([c1x(t), c1y(a.afr)]);
    if (Number.isFinite(a.afrMain) && a.afrMain < 40) main.push([c1x(t), c1y(a.afrMain)]);
    const c = M.solve(t, { level: lvl, turns: s.turns, choke: 1 });
    choke.push([c1x(t), c1y(c.afr)]);
  }
  ui.c1afr.setAttribute("points", pts(afr));
  ui.c1main.setAttribute("points", pts(main));
  ui.c1choke.setAttribute("points", pts(choke));
}
curves();

const shown = { theta: -1, choke: -1, level: -99, turns: -1 };
function render(live) {
  r = M.solve(s.theta, { choke: s.choke, level: s.level, turns: s.turns });
  const lift = M.needleLift(s.level);
  const flowing = r.main.mf > 1e-6;
  const mAmt = clamp01(r.main.mf / 1.4e-3);
  const colTop = flowing ? M.BLEED_V : Math.min(M.BLEED_V, s.level + M.standingLift(r.main.dw));
  const pAmt = clamp01(r.pilot.mf / 0.15e-3);
  for (const [id, V] of VIEWS) {
    const e = el[id];
    if (Math.abs(s.theta - shown.theta) > 0.01) e.plate.innerHTML = P.throttlePlate(V, s.theta);
    if (Math.abs(s.choke - shown.choke) > 0.001) e.choke.innerHTML = P.chokePlate(V, s.choke);
    if (Math.abs(s.level - shown.level) > 0.0005) {
      e.float.innerHTML = P.float(V, s.level) + P.floatArm(V, s.level);
      e.needle.innerHTML = P.needle(V, lift);
    }
    if (s.turns !== shown.turns) e.screw.innerHTML = P.mixtureScrew(V, s.turns) + P.screwSpring(V, s.turns);
    e.bowl.setAttribute("d", P.pathOf(V, P.bowlFuel(s.level)));
    e.stream.setAttribute("d", P.pathOf(V, P.inflowStream(s.level, lift)));
    e.col.setAttribute("d", P.pathOf(V, P.mainColumn(colTop)));
    e.emul.setAttribute("fill-opacity", flowing ? K.r2(0.18 + 0.3 * mAmt) : 0);
    e.spray.setAttribute("d", K.d(V, P.spray(mAmt)));
    e.spray.setAttribute("fill-opacity", flowing ? K.r2(0.2 + 0.45 * mAmt) : 0);
    e.pilot.setAttribute("fill-opacity", r.pilot.mf > 1e-7 ? 0.55 : 0.2);
    e.pemul.setAttribute("d", P.pathOf(V, P.pilotEmulsion(r.prog)));
    e.pemul.setAttribute("fill-opacity", r.pilot.mf > 1e-7 ? K.r2(0.15 + 0.3 * pAmt) : 0);
    e.plume.setAttribute("d", K.d(V, P.idlePlume(pAmt)));
    e.plume.setAttribute("fill-opacity", r.pilot.mf > 1e-7 ? K.r2(0.15 + 0.35 * pAmt) : 0);
    e.pplume.setAttribute("d", K.d(V, P.idlePlume(pAmt * r.prog, M.PROG_U)));
    e.pplume.setAttribute("fill-opacity", r.prog > 0.02 ? K.r2(0.15 + 0.3 * pAmt * r.prog) : 0);
  }
  if (Math.abs(s.theta - shown.theta) > 0.01) {
    ui.bPlate.innerHTML = K.balloon(VM, P.platePoint(M.SPINDLE_U, M.phiOf(s.theta), 9), [470, 112], 22, { target: 22 });
    ui.cThrottle.innerHTML = P.throttleFace(VC, s.theta);
    const e = M.plateEdgeU(s.theta);
    if (e < BOX_D.u0 + 1) ui.dimEdge.innerHTML = "";
    else {
      const ev = -M.PLATE_R * Math.cos((M.phiOf(s.theta) * Math.PI) / 180);
      ui.dimEdge.innerHTML = K.dim(VD, [M.PROG_U, -13], [e, ev], { dir: "h", off: BOX_D.y - 14 - VD.p([M.PROG_U, -13])[1], text: (e - M.PROG_U).toFixed(2), id: "dim-edge" });
    }
  }
  if (Math.abs(s.choke - shown.choke) > 0.001) {
    ui.bChoke.innerHTML = K.balloon(VM, P.platePoint(M.CHOKE_U, M.chokePhi(s.choke), 11.4), [64, VM.p([0, 9])[1]], 20, { target: 20 });
    ui.cChoke.innerHTML = P.chokeFace(VC, s.choke);
  }
  if (Math.abs(s.level - shown.level) > 0.0005) {
    ui.dimLevel.innerHTML = K.dim(VB, [-41.5, -26], [-41.5, s.level], { dir: "v", off: 562 - VB.p([-41.5, -26])[0], text: (-26 - s.level).toFixed(2), id: "dim-level" });
  }
  if (s.turns !== shown.turns) curves();
  shown.theta = s.theta;
  shown.choke = s.choke;
  shown.level = s.level;
  shown.turns = s.turns;

  // diagrams
  ui.c1dot.setAttribute("cx", K.r2(c1x(s.theta)));
  ui.c1dot.setAttribute("cy", K.r2(Math.min(C1.y1, Math.max(C1.y0, c1y(r.afr)))));
  const air = r.mEng * 1000;
  const c2x = K.r2(C2.x0 + (Math.min(C2.mMax, air) / C2.mMax) * (C2.x1 - C2.x0));
  ui.c2dp.setAttribute("cx", c2x);
  ui.c2dp.setAttribute("cy", K.r2(C2.y1 - (Math.min(C2.dpMax, r.dpThroat / 100) / C2.dpMax) * (C2.y1 - C2.y0)));
  ui.c2dot.setAttribute("cx", c2x);
  ui.c2dot.setAttribute("cy", K.r2(C2.y1 - (Math.min(C2.fMax, r.fuel * 1000) / C2.fMax) * (C2.y1 - C2.y0)));

  const afr = Number.isFinite(r.afr) ? r.afr.toFixed(1) : "—";
  ui.readout.textContent = `θ ${Math.round(s.theta)}° · AIR ${air.toFixed(1)} g/s · FUEL ${(r.fuel * 1000).toFixed(2)} g/s · Δp ${(r.dpThroat / 100).toFixed(1)} mbar · AFR ${afr}`;
  say(`Throttle ${Math.round(s.theta)} degrees, ${Math.round(r.N)} rpm, air ${air.toFixed(1)} grams per second, throat depression ${(r.dpThroat / 100).toFixed(1)} millibar, air-fuel ratio ${afr}${s.chokeT > 0.5 ? ", choke shut" : ""}.`, live.clock);
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
  // A still, true moment: wide open, the bowl drawn down and the needle open, drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 5; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

// Rotary drag about the throttle spindle: the plate turns with the pointer's angle.
function dragAngle(hitEl, centre) {
  let id = null;
  let a0 = 0;
  let t0 = 0;
  const angle = (e) => {
    const m = svg.getScreenCTM();
    const x = (e.clientX - m.e) / m.a;
    const y = (e.clientY - m.f) / m.d;
    return (Math.atan2(x - centre[0], -(y - centre[1])) * 180) / Math.PI;
  };
  hitEl.addEventListener("pointerdown", (e) => {
    id = e.pointerId;
    hitEl.setPointerCapture(id);
    a0 = angle(e);
    t0 = s.thetaT = s.theta;
    dragging = true;
    live.input();
    e.preventDefault();
  });
  hitEl.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id) return;
    let d = angle(e) - a0;
    d = ((((d + 180) % 360) + 360) % 360) - 180;
    s.thetaT = Math.min(M.THETA_MAX, Math.max(0, t0 + d));
    live.input();
  });
  const stop = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    dragging = false;
    live.input();
  };
  hitEl.addEventListener("pointerup", stop);
  hitEl.addEventListener("pointercancel", stop);
}
for (const hitEl of svg.querySelectorAll("[data-drag]")) {
  const V = hitEl.dataset.drag === "D" ? VD : VM;
  dragAngle(hitEl, V.p([M.SPINDLE_U, 0]));
}

svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowRight" || k === "ArrowUp") s.thetaT = Math.min(M.THETA_MAX, s.thetaT + 5);
  else if (k === "ArrowLeft" || k === "ArrowDown") s.thetaT = Math.max(0, s.thetaT - 5);
  else if (k === "Home") s.thetaT = 0;
  else if (k === "End") s.thetaT = M.THETA_MAX;
  else if (k === "c" || k === "C") s.chokeT = s.chokeT > 0.5 ? 0 : 1;
  else if (k === "[") s.turns = Math.max(0.5, s.turns - 0.25);
  else if (k === "]") s.turns = Math.min(3, s.turns + 0.25);
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.2 : live.slow === 0.2 ? 0.05 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
