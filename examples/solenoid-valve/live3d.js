// Page code for solenoid-valve-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit does the drawing, the camera, explode, balloons and the controls; this file runs the coil,
// plunger and diaphragm model exactly as the sheet's live.js does (ten times slower than the valve),
// poses the parts from it, and stipples the water by its pressure.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });

// ---------------------------------------------------------------- water volumes that change shape with z
// The kit can restretch a fluid but not reshape one, so rebuild the three that follow the diaphragm
// here: a new lathe geometry and its section profile (the loops stay under the kit's 64 points).
const FLUID_SPECS = SC.fluids();
const fluidMesh = {};
{
  const meshes = [];
  V.world.traverse((o) => o.isMesh && o.material?.userData?.role === "fluid" && meshes.push(o));
  FLUID_SPECS.forEach((f, i) => (fluidMesh[f.name] = meshes[i]));
}
function reshapeFluid(name, loop) {
  const m = fluidMesh[name];
  const spec = FLUID_SPECS.find((f) => f.name === name);
  m.geometry.dispose();
  m.geometry = S.geometryOf({ ...spec, loop });
  const u = m.material.uniforms;
  loop.forEach(([a, b], i) => u.uProf.value[i].set(a, b));
  u.uProfN.value = loop.length;
}

// ---------------------------------------------------------------- state: the 2D sheet's, from the same model
const SLOW = 0.1; // as the sheet: ten times slower than the valve
const P_NOMINAL = M.P_SUPPLY;
const s = M.valve(P_NOMINAL);
let pTarget = P_NOMINAL;
let cyc = 0; // time into the current tour cycle, model s
let wasTouring = true;
const clampP = (p) => Math.min(8e5, Math.max(0.5e5, p));

function step(dt, live) {
  const before = [s.x, s.z, s.i, s.p1];
  if (live.touring) {
    if (!wasTouring) cyc = 0; // the tour starts its programme from the top
    pTarget = P_NOMINAL;
    M.setCoil(s, cyc >= M.TOUR.on && cyc < M.TOUR.off);
  }
  wasTouring = live.touring;
  const h = dt * SLOW;
  s.p1 = L.follow(s.p1, pTarget, 4, dt);
  M.advance(s, h);
  cyc += h;
  if (cyc >= M.TOUR.end) cyc = 0;
  const after = [s.x, s.z, s.i, s.p1];
  return after.some((v, k) => Math.abs(v - before[k]) > 1e-6) || s.lam > 0 !== s.on;
}

// ---------------------------------------------------------------- poses from the model
function pose(x, z) {
  for (const id of SC.PLUNGER) V.set(id, { pos: [0, x, 0] });
  for (const id of SC.DIAPHRAGM) V.set(id, { pos: [0, z, 0] });
}
V.frame([() => pose(0, 0), () => pose(M.STROKE, M.STROKE)]); // frame the whole stroke

// Water density by pressure: 3 bar dense, a drop of half a bar plainly thinner (a 2.5 power, 0..3.1 bar).
const dens = (pa) => 0.08 + 0.9 * Math.min(1, Math.max(0, M.bar(pa) / 3.1)) ** 2.5;
let shownZ = -1;
const say = L.announcer($("sr"), 2);
function render(live) {
  const { x, z } = s;
  pose(x, z);
  V.solid(14, "spring").scale.y = (SC.SPRING_LEN - x) / SC.SPRING_LEN;
  if (Math.abs(z - shownZ) > 0.01) {
    V.reshape(2, "conv", { loop: SC.convLoop(z) });
    for (const [name, fn] of Object.entries(SC.LIVE)) reshapeFluid(name, fn(z));
    shownZ = z;
  }
  const tint = (names, p) => {
    const d = dens(p);
    for (const f of names) V.fluid(f, { density: d, wash: 0.04 + 0.18 * d });
  };
  tint(SC.INLET, s.p1);
  tint(SC.CHAMBER, s.pc);
  tint(SC.OUTLET, s.p2);
  $("readout").textContent = `${s.on ? "ON" : "OFF"} · ${s.i.toFixed(2)} A · LIFT ${x.toFixed(2)}/${z.toFixed(2)} mm · p ${M.bar(s.p1).toFixed(1)}/${M.bar(s.pc).toFixed(2)}/${M.bar(s.p2).toFixed(2)} bar · ${Math.round(M.lpm(s.q))} L/min`;
  say(
    `Coil ${s.on ? "on" : "off"}, ${s.i.toFixed(2)} amps. Plunger lift ${x.toFixed(1)} millimetres, diaphragm ${z.toFixed(1)}. Chamber ${M.bar(s.pc).toFixed(1)} bar of ${M.bar(s.p1).toFixed(1)}, flow ${Math.round(M.lpm(s.q))} litres a minute.`,
    live.clock
  );
  $("coil")?.setAttribute("aria-pressed", String(s.on));
}

// the diaphragm's lift over the seat, measured live on the cut face (as Detail P's h)
function overlay() {
  const z = s.z;
  if (V.explode > 0.05 || !V.cut || z < 0.3) return "";
  return V.dim([-11, M.SEAT_TOP, 0], [-11, M.SEAT_TOP + z, 0], { text: `h=${z.toFixed(2)}`, off: 8 });
}

// ---------------------------------------------------------------- the valve's controls
const toggle = () => M.setCoil(s, !s.on);
V.key(" ", toggle);
V.key("Enter", toggle);
V.key("ArrowUp", () => (pTarget = clampP(pTarget + 0.5e5)));
V.key("ArrowDown", () => (pTarget = clampP(pTarget - 0.5e5)));
$("coil")?.addEventListener("click", () => {
  toggle();
  V.input();
});
// tap the coil to switch it
let moved = false;
V.drag([15, 16, 17, 18, 19, 20, 21], {
  axis: [0, 1, 0],
  length: 40,
  start: () => {
    moved = false;
    return 0;
  },
  move: (v) => {
    if (Math.abs(v) > 0.08) moved = true;
  },
  end: () => {
    if (!moved) toggle();
  },
});
// drag the body up or down to set the supply pressure (0.5 to 8 bar over 80 mm)
V.drag([1], {
  axis: [0, 1, 0],
  length: 80,
  start: () => (pTarget - 0.5e5) / 7.5e5,
  move: (v) => (pTarget = clampP(0.5e5 + v * 7.5e5)),
});

// the page's own self-tests (?selftest=1)
V.test("space switches the coil", ({ key }) => {
  const a = s.on;
  key(" ");
  const b = s.on;
  key(" ");
  return { pass: a !== b && s.on === a, info: [a, b] };
});
V.test("tap the coil switches it", ({ ptr, project }) => {
  const g = project([-21, 80, 0]);
  const a = s.on;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointerup", g[0], g[1]);
  const b = s.on;
  M.setCoil(s, a);
  return { pass: a !== b, info: [a, b, g] };
});
V.test("drag the body sets the supply", ({ ptr, project }) => {
  const g = project([33, 4, 0]);
  const p0 = pTarget;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] - 120);
  const p1 = pTarget;
  ptr("pointerup", g[0], g[1] - 120);
  pTarget = p0;
  return { pass: p1 > p0 + 0.5e5, info: [p0, p1] };
});
V.test("arrows set the supply", ({ key }) => {
  const p0 = pTarget;
  key("ArrowUp");
  const p1 = pTarget;
  key("ArrowDown");
  return { pass: p1 > p0 && pTarget === p0, info: [p0, p1] };
});

V.run({ step, render, overlay, still: 4, idleAfter: 6 });
