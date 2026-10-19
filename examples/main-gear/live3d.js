// Page code for main-gear-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit draws, frames, explodes and balloons; this file runs the sheet's tour and controls, bends the
// leg (its segments and the brake line are rebuilt from beam theory), carries the axle, wheel and brake
// on the leg's tip (moved and tilted with it), spins the wheel, closes the caliper's running clearance
// and sets the brake fluid's density from the line pressure.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene(), start: { zoom: 1.25, look: [760, 420, 0], roll: -32 } });
const A0 = M.AXLE_STATIC;

// the attachment's bolted pieces were built along the leg's own axes: turn them onto its 30°
for (const [id, names] of Object.entries(SC.TURNED)) for (const n of names) V.solid(Number(id), n).rotation.z = SC.LEG_TURN;

// ---------------------------------------------------------------- state: the sheet's, from the same model
let s = M.gear();
let mode = "tour";
let toeUser = [0, 0];
let toeNow = [0, 0];
let fTarget = M.F_STATIC;
let dragging = false;
let clock = 0;
const until = [0, 0]; // a held toe: each key press holds that brake a little longer
const TOE = 220;

function freeStep(h) {
  toeUser = until.map((u) => (clock < u ? TOE : 0));
  toeNow = toeNow.map((t, i) => L.follow(t, toeUser[i], 8, h));
  const braking = toeUser[0] + toeUser[1] > 0;
  M.stepGear(s, h, { toe: toeNow, thrust: braking ? 150 : M.thrustAt(12, s.V) });
}
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 2000));
  const h = dt / n;
  if (live.touring && mode !== "tour" && !dragging) {
    mode = "tour";
    s = M.gear();
    until[0] = until[1] = 0;
  }
  for (let i = 0; i < n; i++) {
    clock += h;
    if (mode === "tour") {
      M.tourStep(s, h);
      if (s.t >= M.TOUR) s = M.gear();
      toeNow = s.toe.slice();
    } else if (mode === "free") freeStep(h);
    else {
      toeUser = until.map((u) => (clock < u ? TOE : 0));
      toeNow = toeNow.map((t, j) => L.follow(t, toeUser[j], 8, h));
      M.holdGear(s, live.reduced ? fTarget : L.follow(s.F, fTarget, 12, h), h, toeNow);
    }
  }
  if (mode !== "hand") return true;
  return Math.abs(s.F - fTarget) > 1 || clock < Math.max(...until) + 1;
}

// ---------------------------------------------------------------- poses from the model
const SPIN = Object.entries(SC.SPIN).flatMap(([id, names]) => names.map((n) => V.solid(Number(id), n)));
const half = M.PAD_GAP / 2;
// the brake fluid's meshes ride on the tip: find them (they are the scene's fluids, in order)
const FL = [];
V.world.traverse((o) => o.isMesh && o.renderOrder === 2 && FL.push(o));
let shownF = Infinity;
function bend(F) {
  if (Math.abs(F - shownF) < 2) return;
  for (let i = 0; i < SC.STEPS.length - 1; i++) V.reshape(1, `seg${i}`, { shape: SC.legSegment(F, SC.STEPS[i], SC.STEPS[i + 1]) });
  V.reshape(25, "line", { shape: SC.lineShape(F) });
  shownF = F;
}
function pose(F, spin = 0, c = 0) {
  bend(F);
  const a = M.axleAt(F);
  const tilt = M.axleTilt(F);
  const d = [a[0] - A0[0], a[1] - A0[1]];
  const along = [Math.cos(tilt), Math.sin(tilt)];
  for (const id of SC.TIP) {
    const ds = id === 21 || id === 22 ? half * c : id === 20 || id === 23 || id === 24 ? -half * c : 0;
    V.set(id, { pos: [d[0] + along[0] * ds, d[1] + along[1] * ds, 0], rot: [0, 0, tilt] });
  }
  for (const h of SPIN) h.rotation.x = spin;
  // the fluid turns with the tip about the static axle centre
  for (const m of FL) {
    m.rotation.z = tilt;
    const r = [Math.cos(tilt) * A0[0] - Math.sin(tilt) * A0[1], Math.sin(tilt) * A0[0] + Math.cos(tilt) * A0[1]];
    m.position.set(a[0] - r[0], a[1] - r[1], 0);
  }
}
const F_PEAK = M.tourTrace(1 / 1000, 50).reduce((m, r) => Math.max(m, r[2]), 0);
V.frame([() => pose(0), () => pose(F_PEAK)]);

const tint = (p) => 0.14 + 0.8 * Math.min(1, Math.max(0, p / 50));
const say = L.announcer($("sr"), 2);

function render(live) {
  const pL = s.p[0];
  pose(s.F, s.spin, Math.min(1, pL / 0.4));
  V.fluid("cal", { density: tint(pL), wash: 0.03 + 0.08 * tint(pL) });
  V.fluid("port", { density: tint(pL), wash: 0.03 + 0.08 * tint(pL) });
  const F = s.F;
  const cam = M.camber(F);
  const where = mode === "hand" ? "HELD" : M.phase(s);
  const kt = s.V / 0.5144;
  $("readout").textContent = `F ${(F / 1000).toFixed(2)} kN · δ ${Math.round(M.deflection(F))} mm · TRACK ${Math.round(2 * M.halfTrack(F))} · CAMBER ${cam >= 0 ? "+" : "−"}${Math.abs(cam).toFixed(1)}° · p ${Math.round(s.p[0])}/${Math.round(s.p[1])} bar · ${Math.round(kt)} kt · ${where}`;
  say(`Leg load ${(F / 1000).toFixed(1)} kilonewtons, deflection ${Math.round(M.deflection(F))} millimetres; brakes ${Math.round(s.p[0])} and ${Math.round(s.p[1])} bar, ${Math.round(kt)} knots, ${where.toLowerCase()}.`, live.clock);
}

// the live dimension: the axle's rise from its unloaded place, outboard of the tyre
function overlay() {
  const r = M.AXLE_REST;
  const a = M.axleAt(s.F);
  if (V.explode > 0.05 || a[1] - r[1] < 3) return "";
  return V.dim([r[0] + 150, r[1], 0], [r[0] + 150, a[1], 0], { text: `δ${Math.round(a[1] - r[1])}` });
}

// ---------------------------------------------------------------- controls, as on the sheet
const clampF = (f) => Math.min(16000, Math.max(0, f));
function toHand() {
  if (mode !== "hand") {
    mode = "hand";
    fTarget = s.F;
  }
}
V.drag([13, 18, 19], {
  axis: [0, 1, 0],
  length: 100,
  start: () => {
    dragging = true;
    toHand();
    fTarget = s.F;
    return s.F / M.K_LEG / 100;
  },
  move: (v) => (fTarget = clampF(v * 100 * M.K_LEG)),
  end: () => (dragging = false),
});
const toe = (i) => () => {
  if (mode === "tour") mode = "free";
  const k = i === 2 ? [0, 1] : [i];
  for (const j of k) until[j] = clock + 0.6;
};
const land = () => {
  s = M.gear();
  mode = "free";
  until[0] = until[1] = 0;
};
V.key("ArrowUp", () => (toHand(), (fTarget = clampF(fTarget + 500))));
V.key("ArrowDown", () => (toHand(), (fTarget = clampF(fTarget - 500))));
V.key("ArrowLeft", toe(0));
V.key("ArrowRight", toe(1));
V.key("b", toe(2));
V.key(" ", land);
$("land")?.addEventListener("click", () => (land(), V.input()));
$("brake")?.addEventListener("click", () => {
  toe(2)();
  for (const j of [0, 1]) until[j] = clock + 2.5;
  V.input();
});

// the page's own self-tests (?selftest=1)
V.test("wheel drag loads the leg", ({ ptr, project }) => {
  const a = M.axleAt(s.F);
  const g = project([a[0] + 60, a[1] - 150, -40]);
  const t0 = fTarget;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] - 60);
  const t1 = fTarget;
  ptr("pointerup", g[0], g[1] - 60);
  return { pass: mode === "hand" && t1 - t0 > 300, info: [t0, t1, mode] };
});
V.test("left arrow holds the left brake", ({ key }) => {
  key("ArrowLeft");
  const held = until[0] > clock && until[1] <= clock + 1e-9;
  return { pass: held, info: [until[0], until[1], clock] };
});
V.test("beam: the leg's static deflection is its stiffness", () => {
  const d = M.deflection(M.F_STATIC);
  return { pass: Math.abs(d * M.K_LEG - M.F_STATIC) < 1, info: [d, M.K_LEG] };
});
V.test("space lands", ({ key }) => {
  key(" ");
  return { pass: mode === "free" && s.air, info: [mode, s.air] };
});

V.run({ step, render, overlay, still: 6, idleAfter: 6 });
