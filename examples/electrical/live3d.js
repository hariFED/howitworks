// Page code for electrical-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), A, FS, WF (the models this model imports), M (model.mjs, the sheet's model,
// unchanged), P (parts.mjs) and SC (scene3d.mjs). The kit draws, frames, explodes and balloons; this file
// runs the sheet's tour and controls, turns the alternator's rotor and pulley, spins the starter and
// screws its pinion into the ring gear, bends the breaker's bimetal and pops its button, and sets the
// battery's electrolyte from its specific gravity.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene(), start: { zoom: 1.05, look: [140, -120, 0] } });
const SLOW = { rotor: 250, ring: 25 };

// ---------------------------------------------------------------- state: the sheet's, from the same model
let s = M.tourStart();
let mode = "tour";
let ctl = M.tourCtl(0, s);
let keyUntil = -1;
let clock = 0;
let armAngle = 0;
function freeCtl() {
  return { ...ctl, start: clock < keyUntil, pull: ctl.pull.slice() };
}
function step(dt, live) {
  if (live.touring && mode !== "tour") {
    mode = "tour";
    s = M.tourStart();
  }
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    clock += h;
    if (mode === "tour") {
      M.tourStep(s, h);
      if (s.t >= M.TOUR) s = M.tourStart();
    } else M.step(s, h, freeCtl(), s.eng.run && s.Ibat > 1 ? 30 : 1);
    armAngle += (s.st.w * h) / SLOW.ring;
  }
  return true;
}
function toFree() {
  if (mode === "tour") {
    ctl = M.tourCtl(s.t, s);
    ctl.pull = ctl.pull.slice();
    ctl.start = false;
    mode = "free";
  }
}

// ---------------------------------------------------------------- poses from the model
const NAV = M.CB_INDEX.nav;
function pose(pin, lift, bend, rotor, ring) {
  V.set(4, { rot: [rotor, 0, 0] });
  V.set(5, { rot: [rotor, 0, 0] });
  V.set(6, { rot: [rotor, 0, 0] });
  V.set(9, { rot: [rotor, 0, 0] });
  V.set(19, { rot: [-armAngle, 0, 0] });
  V.set(20, { pos: [P.pinionShift(pin), 0, 0] });
  V.solid(20, "spring").scale.x = (P.ST.spring.u1 - P.ST.barrel.u1 - P.pinionShift(pin)) / (P.ST.spring.u1 - P.ST.barrel.u1);
  V.set("R", { rot: [ring, 0, 0] });
  V.set("25a", { pos: [0, lift, 0] });
  V.solid(25, "bimetal").rotation.z = -bend;
}
V.frame([() => pose(0, 0, 0, 0, 0), () => pose(1, P.CBG.stroke, 0, 0, 0)]);

const say = L.announcer($("sr"), 2);
function render(live) {
  const k = s.cb[NAV];
  const pitchR = (2 * Math.PI) / M.RING.teeth;
  // the ring gear's arc turns within one pitch (its teeth repeat), the pinion's teeth stay in mesh
  pose(s.st.pin, k.open || k.pulled ? P.CBG.stroke : 0, Math.min(1.2, k.th) * 0.06, s.rot / SLOW.rotor, (s.eng.theta / SLOW.ring) % pitchR);
  V.solid(11, "belt").visible = !s.fault.belt;
  const sgv = M.sg(s.soc);
  for (let i = 0; i < P.BT.cells; i++) V.fluid(`acid${i}`, { density: 0.25 + 0.75 * Math.min(1, Math.max(0, (sgv - 1.11) / 0.175)), wash: 0.05 });
  const ph = M.phase(s);
  $("readout").textContent = `BUS ${s.V.toFixed(1)} V · AMMETER ${s.Iamm >= 0 ? "+" : "−"}${Math.abs(s.Iamm).toFixed(1)} A · ${s.st.cont ? `STARTER ${Math.round(s.Ist)} A` : `ALT ${s.Ialt.toFixed(1)} A`} · ${ph}`;
  say(`Bus ${s.V.toFixed(1)} volts; ${ph.toLowerCase()}.`, live.clock);
}

// ---------------------------------------------------------------- controls, as on the sheet
V.key("k", () => (toFree(), (keyUntil = clock + 2.5)));
V.key("b", () => (toFree(), (ctl.bat = !ctl.bat)));
V.key("a", () => (toFree(), (ctl.alt = !ctl.alt)));
V.key("z", () => (toFree(), (ctl.belt = !ctl.belt)));
V.key("x", () => (toFree(), (ctl.short = !ctl.short)));
V.key(" ", () => {
  mode = "tour";
  s = M.tourStart();
});
$("start")?.addEventListener("click", () => (toFree(), (keyUntil = clock + 2.5), V.input()));
$("short")?.addEventListener("click", () => (toFree(), (ctl.short = !ctl.short), V.input()));

// the page's own self-tests (?selftest=1)
V.test("K holds the key at START: the starter contactor closes", ({ key }) => {
  key("k");
  return { pass: mode === "free" && keyUntil > clock, info: [mode, keyUntil, clock] };
});
V.test("the model cranks: the pinion screws into mesh and the bus sags", () => {
  const t = M.tourStart();
  while (t.t < M.T.start + 0.5) M.tourStep(t, 1 / 480);
  return { pass: t.st.pin > 0.99 && t.sag < 20, info: [t.st.pin, t.sag] };
});
V.test("X shorts the nav light circuit", ({ key }) => {
  key("x");
  return { pass: ctl.short === true, info: [ctl.short] };
});

V.run({ step, render, still: 4, idleAfter: 8 });
