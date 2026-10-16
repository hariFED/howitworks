// Page code for shock-absorber-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit draws, frames, explodes and balloons; this file runs the quarter car exactly as the sheet's
// live.js does, poses the rod, the floating piston and the bending shims from it, sets the oil's
// density from its pressure, and draws the oil's path through the open port.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });

// ---------------------------------------------------------------- state: the sheet's, from the same model
const car = M.car();
let mode = "car"; // "car": the quarter car drives the damper; "hand": it is stroked by hand
let c = M.C0; // compression, mm
let v = 0; // damper velocity, m/s, rebound +
let target = M.C0;
let dragging = false;
let userOn = true;
let liftC = 0;
let liftR = 0;
let phase = 0; // oil travelled, for the moving dashes

// The tour, the sheet's 12 s loop: a hump with the damping on, a hump with the valves bypassed, settle.
const tour = { t: 0 };
function startPass(delay) {
  car.humps = [...car.humps.filter((x0) => x0 > car.X - 2), car.X + M.SPEED * delay];
}
function tourStep(h) {
  const t0 = tour.t;
  tour.t = (tour.t + h) % M.CYCLE;
  const crossed = (at) => (t0 < at && tour.t >= at) || (t0 > tour.t && at === 0);
  if (t0 === 0 || crossed(0)) {
    car.on = true;
    startPass(0.6);
  }
  if (crossed(5)) {
    car.on = false;
    startPass(0.6);
  }
  if (crossed(10)) car.on = true;
}

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 1000));
  const h = dt / n;
  if (live.touring && mode === "hand" && !dragging) {
    // the tour takes over again: let the held suspension go and settle before the next hump
    M.placeCar(car, c);
    mode = "car";
    tour.t = 10;
  }
  for (let i = 0; i < n; i++) {
    if (mode === "car") {
      if (live.touring) tourStep(h);
      else car.on = userOn;
      M.stepCar(car, h);
      c = Math.min(M.STROKE, Math.max(0, car.c));
      v = car.v;
    } else {
      const c0 = c;
      c = live.reduced ? target : L.follow(c, target, 14, h);
      v = -(c - c0) / h / 1000;
      car.on = userOn;
    }
    const lt = M.shimLift(v, car.on);
    liftC = L.follow(liftC, v < 0 ? lt : 0, 40, h);
    liftR = L.follow(liftR, v > 0 ? lt : 0, 40, h);
    phase += Math.abs(v) * h * 1000 * 0.9;
  }
  return mode === "car" || Math.abs(c - target) > 1e-3 || liftC > 1e-3 || liftR > 1e-3;
}

// ---------------------------------------------------------------- poses from the model
function pose(cc) {
  for (const id of SC.MOVING) V.set(id, { pos: [0, -cc, 0] });
  for (const id of SC.FLOATING) V.set(id, { pos: [0, -cc * M.FP_RATIO, 0] });
}
V.frame([() => pose(0), () => pose(M.STROKE)]); // frame the whole stroke, so the zoom never pumps

// oil density follows its pressure, as on the sheet: 17 bar sparse, 40 bar dense
const tint = (p) => 0.1 + 0.8 * Math.min(1, Math.max(0, (p - 17) / (40 - 17)));
const shown = { 11: -1, 12: -1 };
const say = L.announcer($("sr"), 2);

function render(live) {
  pose(c);
  // the shims bend about the clamp washer's rim, true to scale
  for (const [id, dir, lift, list] of [[11, 1, liftC, M.COMP_SHIMS], [12, -1, liftR, M.REB_SHIMS]]) {
    if (Math.abs(lift - shown[id]) < 0.01 && !(lift === 0 && shown[id] !== 0)) continue;
    list.forEach((_, j) => V.reshape(id, "s" + j, { loop: SC.shimLoop(dir, j, lift) }));
    shown[id] = lift;
  }
  // the oil: each side's density from its pressure; the sheets follow the piston and the floating piston
  const p = M.pressures(c, v, car.on);
  const dA = tint(p.above);
  const dB = tint(p.below);
  V.fluid("oil-above", { density: dA, wash: 0.02 + 0.06 * dA, offset: [0, -c, 0], stretch: c });
  const rest = M.STROKE - c;
  V.fluid("oil-below", { density: dB, wash: 0.02 + 0.06 * dB, offset: [0, rest * M.FP_RATIO, 0], stretch: rest * (1 - M.FP_RATIO) });
  // the jet through the open port: up the +x port in compression, down the −x port in rebound
  const strength = Math.min(1, Math.abs(v) / 0.12);
  const comp = v < -0.003 && strength > 0.02;
  const reb = v > 0.003 && strength > 0.02;
  V.fluid("jet-comp", { visible: comp, density: 0.7 + 0.3 * strength, wash: 0.06 + 0.1 * strength, offset: [0, -c, 0] });
  V.fluid("jet-reb", { visible: reb, density: 0.7 + 0.3 * strength, wash: 0.06 + 0.1 * strength, offset: [0, -c, 0] });

  const F = M.damperForce(v, car.on);
  const dir = Math.abs(v) < 0.005 ? "" : v > 0 ? " REB" : " COMP";
  const sgn = (x, d) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(d);
  $("readout").textContent = `c ${Math.round(c)} mm · v ${sgn(v, 2)} m/s${dir} · F ${sgn(F / 1000, 2)} kN · GAS ${p.gas.toFixed(1)} bar · ${car.on ? "DAMPING" : "BYPASSED"}`;
  say(`Compression ${Math.round(c)} millimetres, damper speed ${v.toFixed(2)} metres per second, force ${Math.round(F)} newtons, gas ${p.gas.toFixed(1)} bar, damping ${car.on ? "on" : "off"}.`, live.clock);
  $("hump")?.setAttribute("aria-pressed", "false");
  $("damp")?.setAttribute("aria-pressed", String(car.on));
}

// ---------------------------------------------------------------- overlay: c, and the oil's path
const f1 = (n) => n.toFixed(1);
function arrowHead(a, b) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  const bx = b[0] - ux * 7;
  const by = b[1] - uy * 7;
  return `M${f1(b[0])} ${f1(b[1])}L${f1(bx - uy * 2.6)} ${f1(by + ux * 2.6)}L${f1(bx + uy * 2.6)} ${f1(by - ux * 2.6)}Z`;
}
const look = new V.THREE.Vector3();
function overlay() {
  if (V.explode > 0.05) return "";
  // the live stroke dimension beside the upper eye, as on the sheet
  let s = V.dim([40, M.EYE_TOP0, 0], [40, M.eyeV(c), 0], { text: `c=${Math.round(c)}` });
  // the oil's path lies on the cutting plane: drawn only while the plane faces the reader
  V.camera.getWorldDirection(look);
  if (!V.cut || look.z > -0.05) return s;
  const strength = Math.min(1, Math.abs(v) / 0.12);
  const nut = M.nutV(c);
  for (const [dir, lift, on] of [[1, liftC, v < -0.003], [-1, liftR, v > 0.003]]) {
    if (!on || strength < 0.02) continue;
    const pts = P.flowPath(null, nut, dir, lift).map(([x, y]) => V.project([x, y, 0]));
    const op = f1(0.35 + 0.65 * strength);
    s += `<path class="flow" stroke-opacity="${op}" stroke-dashoffset="${f1(-phase % 8.5)}" d="M${pts.map((q) => `${f1(q[0])} ${f1(q[1])}`).join("L")}"/>`;
    s += `<path class="flow-head" fill-opacity="${op}" d="${arrowHead(pts[pts.length - 2], pts[pts.length - 1])}"/>`;
  }
  return s;
}

// ---------------------------------------------------------------- the damper's controls
const clampC = (x) => Math.min(M.STROKE, Math.max(0, x));
function toHand() {
  if (mode !== "hand") {
    mode = "hand";
    target = c;
  }
}
// drag the upper eye, the shield or the rod: the value is the compression, growing as it moves down
V.drag(["3u", "4u", "5u", 25, 24, 15], {
  axis: [0, -1, 0],
  length: M.STROKE,
  start: () => {
    dragging = true;
    toHand();
    target = c;
    return c / M.STROKE;
  },
  move: (u) => (target = clampC(u * M.STROKE)),
  end: () => (dragging = false),
});
const hump = () => {
  if (mode === "hand") M.placeCar(car, c);
  mode = "car";
  startPass(0.5);
};
const damping = () => (userOn = !car.on);
V.key("ArrowDown", () => (toHand(), (target = clampC(target + 10))));
V.key("ArrowUp", () => (toHand(), (target = clampC(target - 10))));
V.key("End", () => (toHand(), (target = M.STROKE)));
V.key("Home", () => (toHand(), (target = 0)));
V.key(" ", hump);
V.key("d", damping);
$("hump")?.addEventListener("click", () => (hump(), V.input()));
$("damp")?.addEventListener("click", () => (damping(), V.input()));

// the damper's own self-tests (?selftest=1)
V.test("rod drag strokes", ({ ptr, project }) => {
  const g = project([0, M.eyeV(c) - 90, 0]); // on the dust shield over the rod
  const t0 = target;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] + 80);
  const t1 = target;
  ptr("pointerup", g[0], g[1] + 80);
  return { pass: mode === "hand" && t1 > t0 + 5, info: [t0, t1, mode] };
});
V.test("D switches the damping", ({ key }) => {
  const a = userOn;
  key("d");
  const b = userOn;
  key("d");
  return { pass: a !== b, info: [a, b] };
});
V.test("space drives over a hump", ({ key }) => {
  const n0 = car.humps.length;
  mode = "hand";
  key(" ");
  return { pass: mode === "car" && car.humps.some((x0) => x0 > car.X), info: [n0, car.humps.length, mode] };
});

V.run({ step, render, overlay, still: 0.86, idleAfter: 6 });
