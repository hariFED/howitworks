// Page code for fuel-system-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit draws, frames, explodes and balloons; this file runs the sheet's tour and controls, turns the
// selector's rotor and handle (and the fuel in its window with them), sets the fuel's density from the
// flow in each branch, opens the strainer's drain, and lets the water drops settle onto the bowl's floor.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene(), start: { zoom: 1.1, look: [70, -20, 0] } });
const rad = Math.PI / 180;

// ---------------------------------------------------------------- state: the sheet's, from the same model
let s = M.tourStart();
let mode = "tour";
let ctl = M.tourCtl(0);
let clock = 0;
let drainUntil = -1;
let primeUntil = -1;
let warpNow = 1;
function freeCtl() {
  const c = { ...ctl, vent: { ...ctl.vent } };
  c.primer = clock < primeUntil ? M.PRIMER.stroke : 0;
  c.drain = clock < drainUntil ? 1 : 0;
  return c;
}
let dragging = false;
function step(dt, live) {
  if (live.touring && mode !== "tour" && !dragging) {
    mode = "tour";
    s = M.tourStart();
  }
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    clock += h;
    if (mode === "tour") {
      warpNow = M.warpAt(s.t + h);
      M.tourStep(s, h);
      if (s.t >= M.TOUR) s = M.tourStart();
    } else {
      warpNow = s.run ? 60 : 1;
      M.stepSystem(s, h, freeCtl(), warpNow);
    }
  }
  return true;
}
function toFree() {
  if (mode === "tour") {
    ctl = M.tourCtl(s.t);
    ctl.vent = { ...ctl.vent };
    mode = "free";
  }
}

// ---------------------------------------------------------------- poses from the model
// the fuel's meshes, in the scene's order: the window's turns with the rotor
const FL = [];
V.world.traverse((o) => o.isMesh && o.renderOrder === 2 && FL.push(o));
const order = SC.FLUID_ORDER();
const fluidMesh = (name) => FL[order.indexOf(name)];
const WIN = fluidMesh("win");
function pose(theta, drain) {
  V.set(10, { rot: [0, 0, -theta * rad] });
  V.set(13, { rot: [0, 0, -theta * rad] });
  if (WIN) WIN.rotation.z = -theta * rad;
  V.set("21a", { pos: [0, P.DRN.stroke * drain, 0] });
  V.solid(21, "spring").scale.y = (12 + P.DRN.stroke * drain) / 12;
}
V.frame([() => pose(M.POS.LEFT, 0), () => pose(M.POS.OFF, 1)]);

const LPH = M.LPH;
const dens = (q) => 0.25 + 0.75 * Math.min(1, Math.abs(q) / (48 * LPH));
const look = (q) => ({ density: dens(q), wash: 0.03 + 0.1 * dens(q) });
const say = L.announcer($("sr"), 2);

function render(live) {
  pose(s.theta, s.drain);
  for (const f of SC.SELECTOR_FUEL.L) V.fluid(f, look(s.qL));
  for (const f of SC.SELECTOR_FUEL.R) V.fluid(f, look(s.qR));
  for (const f of SC.SELECTOR_FUEL.C) V.fluid(f, look(s.q));
  for (const f of SC.STRAINER_FUEL) V.fluid(f, look(s.q));
  V.fluid("prime", look(s.primerV > 1 ? 48 * LPH : 0));
  V.fluid("drain", { density: s.drain > 0.05 ? 1 : 0.3, wash: s.drain > 0.05 && s.water > 0 ? 0.55 : 0.05 });
  // the water: a layer on the bowl's floor (flat tint, a different look from the fuel) and its drops
  V.fluid("water", { stretch: Math.max(0, s.waterH - 0.6), visible: s.waterH > 0.05, density: 0.15, wash: 0.6 });
  s.drops.forEach((hh, i) => {
    const n = SC.DROP_NAMES[i];
    if (hh == null) V.fluid(n, { visible: false });
    else V.fluid(n, { visible: true, offset: [0, SC.WATER_FLOOR + hh, 0], density: 0.2, wash: 0.85 });
  });
  const pos = M.posName(s.theta);
  const ph = M.phase(s);
  const pu = (s.tanks.L.pu - M.P_ATM) / 1000;
  $("readout").textContent = `${pos} · ${Math.round(s.q / LPH)} L/h · ${s.tanks.L.v.toFixed(1)} / ${s.tanks.R.v.toFixed(1)} L · ULLAGE ${pu >= 0 ? "+" : "−"}${Math.abs(pu).toFixed(1)} kPa · ${ph}`;
  say(`Selector ${pos.toLowerCase()}, ${Math.round(s.q / LPH)} litres an hour; ${ph.toLowerCase()}.`, live.clock);
}

// ---------------------------------------------------------------- controls, as on the sheet
const POS = M.POS;
const snap = (a) => Object.values(POS).reduce((b, v) => (Math.abs(v - a) < Math.abs(b - a) ? v : b), POS.BOTH);
// drag the handle sideways to turn it: 270° of travel over 135 mm
V.drag([13], {
  axis: [1, 0, 0],
  length: 135,
  start: () => {
    dragging = true;
    toFree();
    return (s.theta + 90) / 270;
  },
  move: (v) => (ctl.sel = Math.min(180, Math.max(-90, -90 + 270 * v))),
  end: () => {
    dragging = false;
    ctl.sel = snap(ctl.sel);
  },
});
const sel = (k) => () => {
  toFree();
  ctl.sel = POS[k];
};
V.key("l", sel("LEFT"));
V.key("b", sel("BOTH"));
V.key("r", sel("RIGHT"));
V.key("o", sel("OFF"));
V.key("v", () => (toFree(), (ctl.vent.L = !ctl.vent.L)));
V.key("d", () => (toFree(), (drainUntil = clock + 1.5)));
V.key("p", () => (toFree(), (primeUntil = clock + 0.5)));
V.key("w", () => (toFree(), M.refuel(s)));
V.key(" ", () => {
  mode = "tour";
  s = M.tourStart();
});
$("drain")?.addEventListener("click", () => (toFree(), (drainUntil = clock + 1.5), V.input()));
$("both")?.addEventListener("click", () => (sel("BOTH")(), V.input()));

// the page's own self-tests (?selftest=1)
V.test("L turns the selector to LEFT", ({ key }) => {
  key("l");
  return { pass: mode === "free" && ctl.sel === POS.LEFT, info: [mode, ctl.sel] };
});
V.test("the rotor follows the model: LEFT closes the right port", () => {
  const t = { ...s, theta: POS.LEFT };
  return { pass: M.portOpen(t.theta, "R") === 0 && M.portOpen(t.theta, "L") === 1, info: [M.portOpen(t.theta, "L"), M.portOpen(t.theta, "R")] };
});
V.test("D opens the strainer drain", ({ key }) => {
  key("d");
  return { pass: drainUntil > clock, info: [drainUntil, clock] };
});
V.test("gravity: the full tank's head reaches the float valve", () => {
  const sol = M.solve(M.system(), { needle: 1 });
  return { pass: sol.q / LPH > 1.5 * M.FLOW.takeoff, info: [sol.q / LPH] };
});

V.run({ step, render, still: 21, idleAfter: 8 });
