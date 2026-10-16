// Page code for four-stroke-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit draws, frames, explodes and labels; this file runs the sheet's cycle (the same tour, the
// same controls), turns the crank and cams, poses the rod and piston, lifts the valves by the cams'
// lift, and shows the charge: fresh, then a flame from the plug gap, then burned, its stipple
// following the cylinder pressure.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });
const rad = Math.PI / 180;

// ---------------------------------------------------------------- state: the 2D sheet's
const CYC = M.cycle();
const TAB = CYC.table;
const DEG_PER_S = 90; // the tour turns one working cycle (720°) in 8 s, as on the sheet
let phi = 0; // crank angle, unwrapped
let target = 0;
let auto = false;
let dragging = false;

function step(dt, live) {
  const driven = (live.touring || auto) && !dragging;
  if (driven) {
    target += DEG_PER_S * dt;
    phi = target;
    return true;
  }
  const n = Math.max(1, Math.ceil(dt * 240));
  for (let i = 0; i < n; i++) phi = live.reduced ? target : L.follow(phi, target, dragging ? 40 : 14, dt / n);
  return Math.abs(phi - target) > 0.01;
}

// ---------------------------------------------------------------- the valve axes
// Every solid built upright on a valve axis is turned onto it about its spring seat, once; the parts
// riding on the valve slide along it (the holder's inner group, in the turned frame); the springs
// scale about the seat.
const RIDE = { in: [], ex: [] };
const SPRINGS = { in: [], ex: [] };
for (const p of SC.parts()) {
  const rec = V.part(p.id);
  for (const h of rec.holders) {
    const key = h.spec.tilt;
    if (!key) continue;
    h.holder.rotation.z = SC.TILT[key];
    if (h.spec.ride) RIDE[key].push(h);
    if (h.spec.spring) SPRINGS[key].push(h);
  }
}
const SPRING_LEN = { in: SC.SPRING_TO - SC.SPRING_FROM("in"), ex: SC.SPRING_TO - SC.SPRING_FROM("ex") };

// ---------------------------------------------------------------- the gas meshes, in scene order
const GAS = {};
{
  const meshes = [];
  V.world.traverse((o) => o.isMesh && o.material?.userData?.role === "fluid" && meshes.push(o));
  SC.FLUIDS.forEach((name, i) => (GAS[name] = meshes[i]));
}
// the throats lean with their valves: turn each about its seat
for (const key of SC.KEYS) {
  const m = GAS[`${key}-throat`];
  const [px, py] = SC.VALVE_PIVOT[key];
  const a = SC.TILT[key];
  m.rotation.set(0, 0, a);
  m.position.set(px - (px * Math.cos(a) - py * Math.sin(a)), py - (px * Math.sin(a) + py * Math.cos(a)), 0);
}
// the flame is rebuilt as it grows: its geometry and the profile the shader tests it against
function setFlame(loop) {
  const m = GAS.flame;
  if (!loop) {
    m.visible = false;
    return;
  }
  m.visible = true;
  m.geometry.dispose();
  m.geometry = S.geometryOf(S.lathe(loop));
  const u = m.material.uniforms;
  loop.forEach(([r, s], i) => u.uProf.value[i].set(r, s));
  u.uProfN.value = loop.length;
}

// ---------------------------------------------------------------- poses from the model
const PV0 = M.pinV(0);
const PISTON = [6, 7, 8, 9, 10];
function pose(f) {
  const a = -f * rad; // clockwise in the section
  for (const id of [2, 3, 4]) V.set(id, { rot: [0, 0, a] });
  const [px, py] = M.crankPin(f);
  V.set(5, { pos: [px, py - M.CRANK_R, 0], rot: [0, 0, M.rodAngle(f)] });
  for (const id of PISTON) V.set(id, { pos: [0, M.pinV(f) - PV0, 0] });
  for (const [id, key] of [[24, "in"], [25, "ex"]]) {
    const { e } = P.axes(key);
    V.set(id, { rot: [0, 0, Math.atan2(-e[1], -e[0]) - M.camRel(key, f) * rad] });
  }
  for (const key of SC.KEYS) {
    const lift = M.valveLift(key, f);
    const [vx, vy] = SC.VALVE_PIVOT[key];
    for (const h of RIDE[key]) h.inner.position.set(-vx, -vy - lift, 0);
    for (const h of SPRINGS[key]) h.holder.scale.y = (SPRING_LEN[key] - lift) / SPRING_LEN[key];
  }
}
// frame the crank's whole turn (TDC, the throws either side, BDC), so the zoom never breathes
V.frame([0, 90, 180, 270, 470].map((f) => () => pose(f)));

// ---------------------------------------------------------------- the charge
// Density follows pressure on the sheet's log scale (0.7 bar pale, 60 bar dense). Burned gas carries
// a light wash on top of its stipple, fresh charge none; the flame front is the densest of all.
const density = (p) => 0.14 + 0.86 * Math.min(1, Math.max(0, Math.log(p / 0.7) / Math.log(60 / 0.7)));
const EVC = M.EVENTS.ex.close - 720;
let flameShown = -1;
function gas(f, s) {
  const crown = M.crown(f);
  const drop = crown - M.crownAtTDC;
  const burning = f >= M.SPARK || f < EVC;
  const flameOn = f >= M.SPARK && s.xb < 0.995;
  const d = density(s.p);
  V.fluid("cyl", { offset: [0, drop, 0], stretch: -drop, density: d * (flameOn ? 0.45 : 1), wash: burning && !flameOn ? 0.16 : 0.03 });
  const rf = flameOn ? 38 * Math.sqrt(s.xb) : 0;
  if (Math.abs(rf - flameShown) > 0.05) {
    setFlame(flameOn ? SC.flameLoop(rf, crown) : null);
    flameShown = rf;
  }
  if (flameOn) V.fluid("flame", { density: Math.min(1, d + 0.35), wash: 0.5 });
  const din = density(M.P_IN);
  const dex = density(M.P_EX);
  V.fluid("in-port", { density: din, wash: 0.03 });
  V.fluid("in-throat", { density: din, wash: 0.03 });
  V.fluid("ex-port", { density: dex, wash: 0.16 });
  V.fluid("ex-throat", { density: dex, wash: 0.16 });
}

// ---------------------------------------------------------------- render
function render(live) {
  const f = M.wrap(phi);
  const s = M.at(TAB, f);
  pose(f);
  gas(f, s);
  const li = M.valveLift("in", f);
  const le = M.valveLift("ex", f);
  const stroke = M.strokeOf(f);
  $("readout").textContent = `${Math.round(f)}° ${stroke} · p ${s.p < 10 ? s.p.toFixed(2) : s.p.toFixed(1)} bar · V ${s.V.toFixed(1)} cm³ · ${Math.round(s.T)} K · IN ${li.toFixed(1)} EX ${le.toFixed(1)}`;
  say(`${stroke.toLowerCase()} stroke, crank ${Math.round(f)} degrees, cylinder pressure ${s.p.toFixed(1)} bar, ${Math.round(s.T)} kelvin.`, live.clock);
  $("run")?.setAttribute("aria-pressed", String(auto));
}
const say = L.announcer($("sr"), 2);

// the piston's travel from TDC, beside the barrel's fins, while assembled (as on the sheet)
function overlay() {
  if (V.explode > 0.05) return "";
  const f = M.wrap(phi);
  return V.dim([92, M.crownAtTDC, 0], [92, M.crown(f), 0], { text: `s=${M.travel(f).toFixed(1)}`, off: 14 });
}

// ---------------------------------------------------------------- controls, as on the sheet
// drag the crank, rod or pin sideways: one crank-pin circumference turns it once
V.drag([2, 3, 4, 5], {
  axis: [1, 0, 0],
  length: 2 * Math.PI * M.CRANK_R,
  start: () => {
    dragging = true;
    auto = false;
    target = phi;
    return phi / 360;
  },
  move: (v) => (target = v * 360),
  end: () => (dragging = false),
});
const turn = (d) => () => {
  target += d;
  auto = false;
};
V.key("ArrowRight", turn(10));
V.key("ArrowLeft", turn(-10));
V.key("Home", () => ((target = Math.round(target / 720) * 720), (auto = false)));
V.key(" ", () => (auto = !auto));
$("run")?.addEventListener("click", () => {
  auto = !auto;
  V.input();
});

// the page's own self-tests (?selftest=1)
V.test("crank drag turns the engine", ({ ptr, project }) => {
  const g = project([0, -40, -9]);
  const t0 = target;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0] + 80, g[1]);
  const t1 = target;
  ptr("pointerup", g[0] + 80, g[1]);
  return { pass: Math.abs(t1 - t0) > 20, info: [t0, t1] };
});
V.test("arrow right turns 10°", ({ key }) => {
  const a = target;
  key("ArrowRight");
  const b = target;
  key("ArrowLeft");
  return { pass: Math.abs(b - a - 10) < 1e-6, info: [a, b] };
});
V.test("space runs", ({ key }) => {
  const a = auto;
  key(" ");
  const b = auto;
  key(" ");
  return { pass: a !== b, info: [a, b] };
});
V.test("the cam lifts the inlet valve", () => {
  const keep = phi;
  phi = M.VALVES.in.centre;
  render({ clock: 0 });
  const y = RIDE.in[0].inner.position.y;
  phi = keep;
  render({ clock: 0 });
  const want = -SC.VALVE_PIVOT.in[1] - M.valveLift("in", M.VALVES.in.centre);
  return { pass: Math.abs(y - want) < 1e-6 && M.valveLift("in", M.VALVES.in.centre) > 6, info: [y, want] };
});

V.run({ step, render, overlay, still: 4.15 });
