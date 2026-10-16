// Page code for thermostat-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit does the drawing, the camera, explode, balloons and the controls; this file runs the engine
// and the wax exactly as the sheet's live.js does, poses the pellet assembly from the lift, and adds the
// thermostat's own controls.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });

// ---------------------------------------------------------------- state: the 2D sheet's, from the same model
let s = M.engine(20);
let simT = 0; // simulated seconds since the cold start
let load = M.LOADS.cruise;
let dragging = false;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// The tour, as on the sheet: a cold start at cruise load, a hill, a coast down, then cold again.
const TOUR = [
  [240, M.LOADS.cruise],
  [400, M.LOADS.hill],
  [445, M.LOADS.coast],
];
const tour = { mode: "run", t: 0, from: null };
function coldStart() {
  s = M.engine(20);
  simT = 0;
}
function tourStep(dtReal) {
  if (tour.mode === "reset") {
    tour.t += dtReal;
    const k = Math.min(1, tour.t / 2);
    const e = L.ease(k);
    s.T = tour.from.T + (20 - tour.from.T) * e;
    s.Tp = tour.from.Tp + (20 - tour.from.Tp) * e;
    s.f = M.meltStep(s.f, s.Tp);
    s.lift = M.liftOf(s.Tp, s.f);
    const fl = M.split(s.lift);
    Object.assign(s, { rad: fl.rad, byp: fl.byp, frac: fl.frac, qout: 0 });
    if (k >= 1) {
      coldStart();
      tour.mode = "run";
    }
    return 0;
  }
  const seg = TOUR.find(([until]) => simT < until);
  if (!seg) {
    tour.mode = "reset";
    tour.t = 0;
    tour.from = { T: s.T, Tp: s.Tp };
    return 0;
  }
  load = seg[1];
  return (s.T < 80 && simT < TOUR[0][0] ? 30 : 15) * dtReal;
}

function simulate(h) {
  s.qin = load;
  const n = Math.max(1, Math.ceil(h / 0.04));
  for (let i = 0; i < n; i++) {
    M.advance(s, h / n);
  }
  simT += h;
}

let warp = 12; // simulated seconds per real second while the reader drives
let jump = false; // reduced motion: an input jumps two simulated minutes ahead instead of animating
function step(dt, live) {
  if (live.reduced && !live.frozen) {
    if (jump) simulate(120);
    jump = false;
    return false;
  }
  if (live.touring && !dragging) {
    const h = tourStep(dt);
    if (h > 0) simulate(h);
  } else if (dt > 0) simulate(dt * warp);
  return true;
}

// ---------------------------------------------------------------- poses from the model
function pose(lift) {
  for (const id of SC.PELLET) V.set(id, { pos: [0, -lift, 0] });
  const drop = P.bypassDrop(lift);
  V.set(17, { pos: [0, -drop, 0] });
  V.set(18, { pos: [0, -drop, 0] });
}
V.frame([() => pose(0), () => pose(M.LIFT_MAX)]); // frame the whole travel, so the zoom never moves

let shown = { lift: -1, f: -1 };
function reshape(lift, f) {
  V.reshape(9, "sock", { loop: P.sleeveLoop(lift) });
  const w = SC.wax(lift, f);
  if (w.core) V.reshape(11, "core", { loop: w.core });
  if (w.liquid) V.reshape(11, "liquid", { loop: w.liquid });
  V.solid(11, "core").visible = !!w.core;
  V.solid(11, "liquid").visible = !!w.liquid;
}

const say = L.announcer($("sr"), 2);
function render(live) {
  const lift = s.lift;
  pose(lift);
  const drop = P.bypassDrop(lift);
  V.solid(14, "spring").scale.y = (SC.MAIN_LEN - lift) / SC.MAIN_LEN;
  V.solid(18, "spring").scale.y = (SC.BP_LEN - lift + drop) / SC.BP_LEN;
  if (Math.abs(lift - shown.lift) > 0.01 || Math.abs(s.f - shown.f) > 0.005) {
    reshape(lift, s.f);
    shown = { lift, f: s.f };
  }
  // the coolant: its stipple and wash follow its temperature; a side that stands still goes pale
  const hot = clamp((s.T - 15) / 85, 0, 1);
  const flowing = (fr) => 0.3 + 0.7 * Math.min(1, fr / 0.35);
  const tint = (names, k) => {
    for (const f of names) V.fluid(f, { density: 0.1 + 0.85 * hot * k, wash: 0.03 + 0.17 * hot * k });
  };
  tint(SC.ENGINE, 1);
  tint(SC.RADIATOR, flowing(s.frac));
  tint(SC.BYPASS, flowing(1 - s.frac));
  const mm = Math.floor(simT / 60);
  const ss = String(Math.floor(simT % 60)).padStart(2, "0");
  $("readout").textContent = `T ${s.T.toFixed(1)} °C · LIFT ${lift.toFixed(2)} mm · RAD ${s.rad.toFixed(1)} L/min · LOAD ${Math.round(s.qin)} kW · ${mm}:${ss}`;
  say(`Coolant ${s.T.toFixed(0)} degrees, valve lift ${lift.toFixed(1)} millimetres, ${s.rad.toFixed(0)} litres a minute to the radiator, engine load ${Math.round(s.qin)} kilowatts.`, live.clock);
  $("hill")?.setAttribute("aria-pressed", String(load >= M.LOADS.hill));
}

// ---------------------------------------------------------------- overlay: the lift, measured live
// The valve's opening, from the seat to the disc, on the cut face; the dimension line stands in the
// coolant between the stirrup's leg and the housing wall.
function overlay() {
  const lift = s.lift;
  if (V.explode > 0.05 || !V.cut || lift < 0.3) return "";
  const y0 = P.SEAT_V;
  const a = V.project([18.8, y0, 0]);
  const b = V.project([22.4, y0, 0]);
  return V.dim([18.8, y0, 0], [18.8, y0 - lift, 0], { text: `L=${lift.toFixed(1)}`, off: Math.max(14, Math.abs(b[0] - a[0])) });
}

// ---------------------------------------------------------------- the thermostat's controls
// drag the valve down to load the engine (up to 45 kW over 40 mm of drag): the coolant heats, the wax
// melts, and the valve follows on its own
V.drag([13, 12, 10, 9, 11, 16], {
  axis: [0, -1, 0],
  length: 40,
  start: () => {
    dragging = true;
    return load / 45;
  },
  move: (v) => {
    load = clamp(v, 0, 1) * 45;
    jump = true;
  },
  end: () => (dragging = false),
});
const bump = (d) => () => {
  load = clamp(load + d, 0, 45);
  jump = true;
};
V.key("ArrowUp", bump(3));
V.key("ArrowDown", bump(-3));
const hill = () => {
  load = load >= M.LOADS.hill ? M.LOADS.cruise : M.LOADS.hill;
  jump = true;
};
const cold = () => {
  coldStart();
  shown = { lift: -1, f: -1 };
  jump = true;
};
V.key("h", hill);
V.key("r", cold);
$("hill")?.addEventListener("click", () => {
  hill();
  V.input();
});
$("cold")?.addEventListener("click", () => {
  cold();
  V.input();
});

// the page's own self-tests (?selftest=1)
V.test("drag the valve loads the engine", ({ ptr, project }) => {
  const g = project([-12, P.SEAT_V - 0.75 - s.lift, 0]);
  const l0 = load;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] + 90);
  const l1 = load;
  ptr("pointerup", g[0], g[1] + 90);
  return { pass: l1 > l0 + 3, info: [l0, l1] };
});
V.test("H toggles the hill", ({ key }) => {
  const a = load;
  key("h");
  const b = load;
  key("h");
  return { pass: a !== b, info: [a, b] };
});
V.test("R starts cold", ({ key }) => {
  simT = 100;
  key("r");
  return { pass: simT === 0 && s.T === 20, info: [simT, s.T] };
});

V.run({ step, render, overlay, still: 14, idleAfter: 6 });
