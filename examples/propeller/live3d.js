// Page code for propeller-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit draws, frames, explodes and balloons; this file runs the sheet's tour and controls, turns the
// whole assembly with the crankshaft (slowed, so it can be seen), stipples the inflow the blades add,
// and draws the velocity triangle at the 75 % station on blade 1.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene(), start: { az: -45, roll: 60, zoom: 1.6, look: [-60, 0, 0] } });
const rad = Math.PI / 180;
const IDS = SC.parts().map((p) => p.id);
const SLOW = 150; // the picture turns at 1/150 of the shaft's speed

// ---------------------------------------------------------------- state: the sheet's, from the same model
let s = M.shaft();
let mode = "tour";
let vNow = 0;
let vWant = 0;
let thrNow = M.THR_IDLE;
let thrWant = M.THR_IDLE;
let turning = false; // parked on the cut: both blades show, cut along their pitch axes; T turns them
let hold = 0; // the angle held while stopped
let offset = 0; // added to the shaft's angle after a restart, so the turn is continuous
// the shaft's revolutions at t = 17 (the hero frame), so the blades lie on the cut there
const TURN0 = (() => {
  const g = M.shaft();
  for (let i = 0; i < 17 * 480; i++) M.tourStep(g, 1 / 480);
  return g.turn;
})();
const shaftAngle = () => (2 * Math.PI * (s.turn - TURN0)) / SLOW;

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  if (live.touring && mode !== "tour") {
    mode = "tour";
    s = M.shaft();
    offset = 0;
  }
  for (let i = 0; i < n; i++) {
    if (mode === "tour") {
      M.tourStep(s, h);
      if (s.t >= M.TOUR) s.t -= M.TOUR;
      vNow = M.speedAt(s.t);
      thrNow = M.throttleAt(s.t);
    } else {
      vNow = live.reduced ? vWant : L.follow(vNow, vWant, 1.6, h);
      thrNow = live.reduced ? thrWant : L.follow(thrNow, thrWant, 5, h);
      M.stepShaft(s, h, vNow * M.KT, thrNow);
    }
  }
  if (mode === "tour" || turning) return true;
  return Math.abs(vNow - vWant) > 0.05 || Math.abs(thrNow - thrWant) > 1e-3 || Math.abs(M.engineTorque(s.rpm, thrNow) - s.Q) > 0.5;
}

// ---------------------------------------------------------------- poses
const theta = () => (turning ? shaftAngle() + offset : hold);
function pose(th) {
  for (const id of IDS) V.set(id, { rot: [-th, 0, 0] });
}
V.frame([() => pose(0), () => pose(Math.PI / 2)]);

const say = L.announcer($("sr"), 2);
function render(live) {
  pose(theta());
  // the inflow the blades add at three-quarter radius: dense in the run-up, thin in cruise, none windmilling
  const st = s.st[2];
  const wr = 2 * Math.PI * s.n * (0.75 * M.R) / 1000;
  const va = st.ua * wr - vNow * M.KT;
  const d = Math.min(1, Math.max(0, va / 26));
  V.fluid("air", { density: 0.03 + 0.3 * d, wash: 0.005 + 0.015 * d });
  const where = mode === "tour" ? M.phaseName(s.t) : s.Q < 0 ? "WINDMILLING" : `THR ${Math.round(thrNow * 100)} %`;
  const eta = s.CT > 0 && s.CP > 0 ? s.eta.toFixed(2) : "—";
  $("readout").textContent = `${Math.round(s.rpm)} rpm · ${Math.round(vNow)} kt · J ${s.J.toFixed(2)} · T ${(s.T / 1000).toFixed(2)} kN · ${(s.P / 1000).toFixed(0)} kW · η ${eta} · α₇₅ ${st.alpha.toFixed(1)}° · ${where}`;
  say(`${Math.round(s.rpm)} rpm at ${Math.round(vNow)} knots, thrust ${Math.round(s.T)} newtons, angle of attack at three quarters radius ${st.alpha.toFixed(1)} degrees, ${where.toLowerCase()}.`, live.clock);
}

// The velocity triangle at blade 1's 75 % station, drawn at its leading edge and turning with it:
// the blade's own speed seen as wind (along +z on blade 1), the axial inflow (aft, +x), and W.
const R75 = 0.75 * M.R;
const LE75 = (() => {
  const { le } = P.sectionPoints(R75);
  return [-(M.BLADE_S + le[1]), R75, le[0]];
})();
const KW = 1.1; // mm per m/s
function turn([x, y, z], th) {
  const c = Math.cos(-th);
  const sn = Math.sin(-th);
  return [x, y * c - z * sn, y * sn + z * c];
}
function arrow(a, b, cls, head) {
  const [x0, y0] = V.project(a);
  const [x1, y1] = V.project(b);
  const L = Math.hypot(x1 - x0, y1 - y0);
  if (L < 2) return "";
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  const sz = Math.min(9, L * 0.4);
  const bx = x1 - ux * sz;
  const by = y1 - uy * sz;
  const f = (v) => v.toFixed(1);
  return `<path class="${cls}" d="M${f(x0)} ${f(y0)}L${f(bx)} ${f(by)}"/><path class="${head}" d="M${f(x1)} ${f(y1)}L${f(bx - uy * sz * 0.32)} ${f(by + ux * sz * 0.32)}L${f(bx + uy * sz * 0.32)} ${f(by - ux * sz * 0.32)}Z"/>`;
}
function overlay() {
  if (V.explode > 0.05) return "";
  const th = theta();
  const st = s.st[2];
  const wr = 2 * Math.PI * s.n * (R75 / 1000);
  const Ut = st.ut * wr * KW;
  const Ua = st.ua * wr * KW;
  const le = turn(LE75, th);
  if (V.cut && le[2] > 1) return ""; // blade 1 is in the half the cut takes away
  const corner = turn([LE75[0] - Ua, LE75[1], LE75[2]], th);
  const tail = turn([LE75[0] - Ua, LE75[1], LE75[2] - Ut], th);
  return arrow(tail, corner, "thin", "head") + arrow(corner, le, "thin", "head") + arrow(tail, le, "wv", "wv-head");
}

// ---------------------------------------------------------------- the controls, as on the sheet
const clampV = (v) => Math.min(150, Math.max(0, v));
function toFree() {
  if (mode === "tour") {
    mode = "free";
    vWant = vNow;
    thrWant = thrNow;
  }
}
function setTurning(on) {
  if (on === turning) return;
  if (!on) hold = Math.round(theta() / Math.PI) * Math.PI;
  else offset = hold - shaftAngle();
  turning = on;
}
V.drag([1], {
  axis: [0, 1, 0],
  length: 400,
  start: () => {
    toFree();
    return vWant / 150;
  },
  move: (u) => (vWant = clampV(u * 150)),
});
V.key("ArrowUp", () => (toFree(), (vWant = clampV(vWant + 5))));
V.key("ArrowDown", () => (toFree(), (vWant = clampV(vWant - 5))));
V.key("ArrowRight", () => (toFree(), (thrWant = Math.min(1, thrWant + 0.1))));
V.key("ArrowLeft", () => (toFree(), (thrWant = Math.max(M.THR_IDLE, thrWant - 0.1))));
V.key("t", () => setTurning(!turning));
V.key(" ", () => {
  mode = "tour";
  s = M.shaft();
  offset = 0;
});
$("turn")?.addEventListener("click", () => (setTurning(!turning), V.input()));
$("tour")?.addEventListener("click", () => {
  mode = "tour";
  s = M.shaft();
  offset = 0;
  V.input();
});

// the page's own self-tests (?selftest=1)
V.test("up arrow raises the airspeed", ({ key }) => {
  const a = vWant;
  key("ArrowUp");
  return { pass: mode === "free" && vWant > a, info: [a, vWant] };
});
V.test("right arrow opens the throttle", ({ key }) => {
  thrWant = 0.5;
  key("ArrowRight");
  return { pass: Math.abs(thrWant - 0.6) < 1e-6, info: [thrWant] };
});
V.test("T turns the blades and parks them on the cut", ({ key }) => {
  if (!turning) key("t");
  key("t");
  const held = !turning && Math.abs(Math.sin(hold)) < 1e-9;
  key("t");
  return { pass: held && turning, info: [hold, turning] };
});
V.test("dragging a blade sets the airspeed", ({ ptr, project }) => {
  setTurning(false);
  const g = project(turn([-(M.BLADE_S), 560, 0], theta()));
  const a = vWant;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] - 60);
  const b = vWant;
  ptr("pointerup", g[0], g[1] - 60);
  setTurning(true);
  return { pass: mode === "free" && Math.abs(b - a) > 1, info: [a, b, g] };
});
V.test("windmilling in a glide", () => {
  const g = M.shaft();
  for (let i = 0; i < 23 * 240; i++) M.tourStep(g, 1 / 240);
  return { pass: g.Q < 0 && g.T < 0, info: [g.Q, g.T, g.rpm] };
});

V.run({ step, render, overlay, still: 4.6, idleAfter: 8 });
