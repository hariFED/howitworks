// Page code for carburettor-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit does the drawing, the camera, explode, balloons and the controls; this file runs the model
// exactly as the sheet's live.js does (the same tour, the same solve and bowl integration) and poses
// the throttle and choke plates, the float, the needle and the mixture screw from it, and the fuel.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });
const rad = (d) => (d * Math.PI) / 180;
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ---------------------------------------------------------------- state: the sheet's, from the same model
const s = { theta: 0, thetaT: 0, choke: 0, chokeT: 0, turns: M.SCREW_TURNS, level: M.LEVEL_SET };
s.level = M.steadyLevel(M.solve(0).fuelVol);
let r = M.solve(0, { level: s.level });
let dragging = false;

// The tour, 16 s, as on the sheet: idle, snap wide open (the bowl drains, the needle opens), back to
// part throttle, idle while the bowl refills and the needle seats, then a cold start on the choke.
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

// ---------------------------------------------------------------- poses from the model
// Plates are built across the bore (φ = 0) and turn clockwise about their spindles as φ grows, as the
// sheet's platePoly lays them: the plate's direction is (sin φ, cos φ).
function pose(theta, choke, level, turns, lift) {
  const tp = [0, 0, -rad(M.phiOf(theta))];
  V.set(22, { rot: tp });
  V.set(23, { rot: tp });
  const cp = [0, 0, -rad(M.chokePhi(choke))];
  V.set(20, { rot: cp });
  V.set(21, { rot: cp });
  const fa = [0, 0, rad(P.floatAngle(level))];
  V.set(15, { rot: fa });
  V.set(16, { rot: fa });
  V.set(18, { pos: [0, -lift, 0] });
  const apex = P.screwApex(turns);
  V.set(13, { pos: [0, apex - SC.SCREW0.apex, 0] });
  V.solid(14, "spring").scale.y = (-30 - (apex - 20)) / SC.SCREW0.springLen;
}
V.frame([() => pose(0, 1, M.LEVEL_SET, M.SCREW_TURNS, 0), () => pose(M.THETA_MAX, 0, M.LEVEL_SET - 3, 3, M.NEEDLE_LIFT_MAX)]);

// the fuel meshes, in scene order, for the ones that scale (the spray, the plumes, the inflow stream)
const FL = {};
{
  const meshes = [];
  V.world.traverse((o) => o.isMesh && o.material?.userData?.role === "fluid" && meshes.push(o));
  SC.fluids().forEach((f, i) => (FL[f.name] = meshes[i]));
}
// scale a fluid mesh about a point (its inside test runs in its own rest frame, so it stays true)
function scaleAbout(name, [cx, cy], sx, sy) {
  const m = FL[name];
  m.scale.set(sx, sy, 1);
  m.position.set(cx * (1 - sx), cy * (1 - sy), 0);
}
const SPRAY_LEN = 3 + 12; // P.spray at full amount
const PLUME_LEN = 1.2 + 3.5;

const fuel = (name, density, visible = true) => V.fluid(name, { density, wash: visible ? 0.05 + 0.12 * density : 0, visible });
function render(live) {
  r = M.solve(s.theta, { choke: s.choke, level: s.level, turns: s.turns });
  const lift = M.needleLift(s.level);
  pose(s.theta, s.choke, s.level, s.turns, lift);

  // the fuel, as the sheet draws it: the bowl, the column standing (or drawn up) in the emulsion
  // tube, the emulsion and the spray while the main circuit flows, the pilot circuit and its plumes
  const flowing = r.main.mf > 1e-6;
  const mAmt = clamp01(r.main.mf / 1.4e-3);
  const pAmt = clamp01(r.pilot.mf / 0.15e-3);
  const colTop = flowing ? M.BLEED_V : Math.min(M.BLEED_V, s.level + M.standingLift(r.main.dw));
  V.fluid("bowl", { stretch: s.level - SC.LEVEL0 });
  for (const f of SC.BOWL) fuel(f, 0.6);
  V.fluid("column", { stretch: colTop - SC.COL0 });
  fuel("column", 0.6);
  fuel("seat", 0.6);
  fuel("gallery", 0.6);
  fuel("well", 0.2 + 0.3 * mAmt, flowing);
  fuel("emulsion", 0.25 + 0.35 * mAmt, flowing);
  const len = 3 + 12 * mAmt;
  scaleAbout("spray", [P.NZ + 1.3, M.NOZZLE_TIP], (0.3 + len) / (0.3 + SPRAY_LEN), (1.4 + 3 * mAmt) / 4.4);
  fuel("spray", 0.25 + 0.5 * mAmt, flowing);
  const pilotOn = r.pilot.mf > 1e-7;
  fuel("pilot", pilotOn ? 0.6 : 0.25);
  fuel("pdrill", pilotOn ? 0.2 + 0.35 * pAmt : 0.12);
  fuel("idle", pilotOn ? 0.2 + 0.35 * pAmt : 0.12);
  M.PROGS.forEach((_, i) => fuel(`prog${i}`, 0.2 + 0.35 * pAmt, r.prog > 0));
  const pl = 1.2 + 3.5 * pAmt;
  scaleAbout("plume", [P.SCREW_U + 0.4, -13], (0.4 + pl) / (0.4 + PLUME_LEN), (1.1 + 0.8 * pAmt) / 1.9);
  fuel("plume", 0.2 + 0.4 * pAmt, pilotOn);
  const pp = pAmt * r.prog;
  const ppl = 1.2 + 3.5 * pp;
  scaleAbout("pplume", [M.PROG_U + 0.4, -13], (0.4 + ppl) / (0.4 + PLUME_LEN), (1.1 + 0.8 * pp) / 1.9);
  fuel("pplume", 0.2 + 0.4 * pp, r.prog > 0.02 && pilotOn);
  const w = 0.15 + 0.5 * Math.min(1, lift / 0.4);
  const st = SC.STREAM;
  scaleAbout("stream", [st.u, st.top], w / st.w, Math.max(0.01, (st.top - s.level) / (st.top - st.bottom)));
  fuel("stream", 0.5, lift > 0.02);

  const air = r.mEng * 1000;
  const afr = Number.isFinite(r.afr) ? r.afr.toFixed(1) : "—";
  $("readout").textContent = `θ ${Math.round(s.theta)}° · AIR ${air.toFixed(1)} g/s · FUEL ${(r.fuel * 1000).toFixed(2)} g/s · Δp ${(r.dpThroat / 100).toFixed(1)} mbar · AFR ${afr}`;
  say(`Throttle ${Math.round(s.theta)} degrees, air ${air.toFixed(1)} grams per second, throat depression ${(r.dpThroat / 100).toFixed(1)} millibar, air-fuel ratio ${afr}${s.chokeT > 0.5 ? ", choke shut" : ""}.`, live.clock);
  $("choke")?.setAttribute("aria-pressed", String(s.chokeT > 0.5));
}
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- controls
// drag the throttle plate (or its spindle) downstream to open it: the value is θ over its travel
V.drag([22, 23], {
  axis: [1, 0, 0],
  length: 12,
  start: () => {
    dragging = true;
    s.thetaT = s.theta;
    return s.theta / M.THETA_MAX;
  },
  move: (v) => (s.thetaT = M.THETA_MAX * clamp01(v)),
  end: () => (dragging = false),
});
const throttle = (d) => () => (s.thetaT = Math.min(M.THETA_MAX, Math.max(0, s.thetaT + d)));
V.key("ArrowRight", throttle(5));
V.key("ArrowUp", throttle(5));
V.key("ArrowLeft", throttle(-5));
V.key("ArrowDown", throttle(-5));
V.key("Home", () => (s.thetaT = 0));
V.key("End", () => (s.thetaT = M.THETA_MAX));
const toggleChoke = () => (s.chokeT = s.chokeT > 0.5 ? 0 : 1);
V.key("k", toggleChoke);
V.key("[", () => (s.turns = Math.max(0.5, s.turns - 0.25)));
V.key("]", () => (s.turns = Math.min(3, s.turns + 0.25)));
$("choke")?.addEventListener("click", () => {
  toggleChoke();
  V.input();
});

// self-tests (?selftest=1): drag the plate downstream, the choke key, the mixture screw keys
V.test("plate drag opens the throttle", ({ ptr, project }) => {
  const [u, v] = P.platePoint(M.SPINDLE_U, M.phiOf(s.theta), 8);
  const a = project([u, v, -2]);
  const b = project([u + 10, v, -2]);
  const t0 = s.thetaT;
  ptr("pointerdown", a[0], a[1]);
  ptr("pointermove", b[0], b[1]);
  const t1 = s.thetaT;
  ptr("pointerup", b[0], b[1]);
  return { pass: t1 > t0 + 20, info: [t0, +t1.toFixed(1)] };
});
V.test("K works the choke", ({ key }) => {
  const a = s.chokeT;
  key("k");
  const b = s.chokeT;
  key("k");
  return { pass: a !== b, info: [a, b] };
});
V.test("] turns the mixture screw out", ({ key }) => {
  const a = s.turns;
  key("]");
  const b = s.turns;
  key("[");
  return { pass: b > a, info: [a, b] };
});

V.run({ step, render, still: 5 });
