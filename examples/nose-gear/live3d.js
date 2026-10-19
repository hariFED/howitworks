// Page code for nose-gear-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit draws, frames, explodes and balloons; this file runs the sheet's tour and controls, lifts the
// piston tube and all it carries by c, turns it and the collar by ψ, folds the torque links, follows the
// horns with the damper rod and bungees, and sets the oil's density from its pressure.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene(), start: { zoom: 1.3, look: [30, 390, 0] } });
const rad = Math.PI / 180;

// ---------------------------------------------------------------- state: the sheet's, from the same model
let s = M.gear();
let mode = "tour";
let landing = false;
let bumpAt = -1;
let pedalUser = 0;
let pedalNow = 0;
let cTarget = M.C_STATIC;
let dragging = false;

function settle() {
  const defl = (M.W_NOSE + M.MU * M.G) / M.K_TYRE;
  s.air = false;
  s.yu = M.TYRE_R / 1000 - defl;
  s.ys = s.yu - M.C_STATIC / 1000;
  s.vs = 0;
  s.vu = 0;
  s.c = M.C_STATIC;
  s.w = 0;
}
function freeStep(h) {
  if (s.air && landing && s.yu - M.TYRE_R / 1000 <= 0.0005) {
    s.air = false;
    landing = false;
  }
  if (s.air) s.vs = landing ? -M.V_SINK : 0;
  const g = bumpAt >= 0 ? M.groundAt(s.t + h - bumpAt + M.BUMP.t) : 0;
  pedalNow = L.follow(pedalNow, pedalUser, 6, h);
  M.stepGear(s, h, { pedal: pedalNow, load: 1, ground: g });
}
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 2000));
  const h = dt / n;
  if (live.touring && mode !== "tour" && !dragging) {
    mode = "tour";
    s = M.gear();
    pedalUser = 0;
  }
  for (let i = 0; i < n; i++) {
    if (mode === "tour") {
      M.tourStep(s, h);
      if (s.t >= M.TOUR) s = M.gear();
      pedalNow = s.pedal;
    } else if (mode === "free") freeStep(h);
    else {
      pedalNow = L.follow(pedalNow, pedalUser, 6, h);
      M.holdGear(s, live.reduced ? cTarget : L.follow(s.c, cTarget, 14, h), h, pedalNow);
    }
  }
  return mode !== "hand" || Math.abs(s.c - cTarget) > 1e-3 || Math.abs(pedalNow - pedalUser) > 1e-3 || Math.abs(s.psi - pedalNow * M.STEER_MAX) > 1e-3;
}

// ---------------------------------------------------------------- poses from the model
// a point turned by ψ about the strut axis (three.js's rotation about y)
const ry = ([x, y], p) => [x * Math.cos(p), y, -x * Math.sin(p)];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const holders = (id) => V.part(id).holders;
const LIVE24 = ["eyeR", "tubeR", "plR", "eyeL", "tubeL", "plL"].map((k) => [k, V.solid(24, k).children[0]]);
const ROD = V.solid(22, "rod").children[0];
const EYE = V.solid(22, "eye").children[0];
const SNUB_LIFT = M.SNUB_TOP - M.SNUB_T - M.SNUB_BOT;
const th0 = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const T1 = th0(SC.TOP, SC.K0);
const T2 = th0(SC.K0, SC.BOT0);

function pose(c, psiDeg, pedal = 0, shut = false) {
  const p = psiDeg * rad;
  for (const id of SC.MOVING) V.set(id, { pos: [0, c, 0], rot: [0, p, 0] });
  V.set(7, { pos: [0, c + (shut ? SNUB_LIFT : 0), 0], rot: [0, p, 0] });
  V.set(18, { rot: [0, p, 0] });
  const k = M.knee(c);
  const bot = [M.LINK_BOT0[0], M.LINK_BOT0[1] + c];
  const P0 = [SC.TOP[0], SC.TOP[1], 0];
  const K0 = [SC.K0[0], SC.K0[1], 0];
  const B0 = [SC.BOT0[0], SC.BOT0[1], 0];
  V.set(19, { pos: sub(ry(SC.TOP, p), P0), rot: [0, p, th0(SC.TOP, k) - T1] });
  V.set(20, { pos: sub(ry(k, p), K0), rot: [0, p, th0(k, bot) - T2] });
  V.set(21, { pos: sub(ry(k, p), K0), rot: [0, p, 0] });
  V.set("21a", { pos: sub(ry(SC.TOP, p), P0), rot: [0, p, 0] });
  V.set("21b", { pos: sub(ry(bot, p), B0), rot: [0, p, 0] });
  // the horns move the damper rod and the bungees fore and aft; the pedals move the plungers
  const xhR = -M.HORN_R * Math.sin(p);
  const xhL = -xhR;
  const xpL = M.HORN_R * Math.sin(pedal * M.STEER_MAX * rad);
  ROD.position.x = xhR;
  EYE.position.x = xhR;
  for (const [key, g] of LIVE24) {
    const right = key.endsWith("R");
    g.position.x = key.startsWith("pl") ? (right ? -xpL : xpL) : right ? xhR : xhL;
  }
}
V.frame([() => pose(0, 0), () => pose(M.STROKE, 0)]);

const tint = (pr) => 0.12 + 0.8 * Math.min(1, Math.max(0, Math.log(pr / 3.5) / Math.log(30 / 3.5)));
const say = L.announcer($("sr"), 2);
void holders;

function render(live) {
  const c = s.c;
  const w = s.w;
  const shut = w < -0.003;
  pose(c, s.psi, pedalNow, shut);
  const pa = M.pAir(c);
  const dp = M.dpOrifice(c, w);
  const pb = Math.max(0.2, w >= 0 ? pa + dp : pa - dp);
  const da = tint(pa);
  const db = tint(pb);
  V.fluid("oil-a", { density: da, wash: 0.02 + 0.06 * da, stretch: M.oilTop(c) - M.OIL_TOP0 });
  V.fluid("oil-b", { density: db, wash: 0.02 + 0.06 * db, offset: [0, c, 0], stretch: -c });
  const psi = s.psi;
  const side = Math.abs(psi) < 0.05 ? "" : psi > 0 ? " L" : " R";
  const where = mode === "hand" ? (c < M.CAM_DEPTH ? "CAMS ENGAGING" : "HELD") : M.phase(s);
  $("readout").textContent = `c ${Math.round(c)} mm · F ${(s.F / 1000).toFixed(2)} kN · p ${(pa - M.P_ATM).toFixed(1)} bar g · ψ ${Math.abs(psi).toFixed(1)}°${side} · ${where}`;
  say(`Strut compression ${Math.round(c)} millimetres, force ${Math.round(s.F)} newtons, wheel ${Math.abs(psi).toFixed(1)} degrees ${psi > 0.05 ? "left" : psi < -0.05 ? "right" : "straight"}, ${where.toLowerCase()}.`, live.clock);
}

// the live stroke beside the fork crown, as on the sheet
function overlay() {
  if (V.explode > 0.05 || s.c < 2) return "";
  return V.dim([60, M.CROWN_TOP, 0], [60, M.CROWN_TOP + s.c, 0], { text: `c=${Math.round(s.c)}` });
}

// ---------------------------------------------------------------- the gear's controls, as on the sheet
const clampC = (x) => Math.min(M.STROKE, Math.max(0, x));
function toHand() {
  if (mode !== "hand") {
    mode = "hand";
    cTarget = s.c;
    pedalUser = s.pedal;
  }
}
V.drag([16, 26, 28, 9], {
  axis: [0, 1, 0],
  length: M.STROKE,
  start: () => {
    dragging = true;
    toHand();
    cTarget = s.c;
    return s.c / M.STROKE;
  },
  move: (u) => (cTarget = clampC(u * M.STROKE)),
  end: () => (dragging = false),
});
const pedals = (d) => () => {
  if (mode === "tour") {
    mode = "free";
    pedalUser = s.pedal;
    landing = s.air && s.t < M.T_TD + 0.5;
  }
  pedalUser = Math.max(-1, Math.min(1, pedalUser + d));
};
const land = () => {
  s = M.gear();
  mode = "free";
  landing = true;
  bumpAt = -1;
};
const bump = () => {
  if (mode === "hand" || s.air) settle();
  mode = "free";
  landing = false;
  bumpAt = s.t + 0.3;
};
V.key("ArrowUp", () => (toHand(), (cTarget = clampC(cTarget + 10))));
V.key("ArrowDown", () => (toHand(), (cTarget = clampC(cTarget - 10))));
V.key("ArrowLeft", pedals(0.25));
V.key("ArrowRight", pedals(-0.25));
V.key(" ", land);
V.key("b", bump);
$("land")?.addEventListener("click", () => (land(), V.input()));
$("bump")?.addEventListener("click", () => (bump(), V.input()));

// the page's own self-tests (?selftest=1)
V.test("wheel drag strokes the strut", ({ ptr, project }) => {
  const g = project([0, -120, 0]);
  const t0 = cTarget;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] - 80);
  const t1 = cTarget;
  ptr("pointerup", g[0], g[1] - 80);
  return { pass: mode === "hand" && Math.abs(t1 - t0) > 5, info: [t0, t1, mode] };
});
V.test("left arrow steers left", ({ key }) => {
  const a = pedalUser;
  key("ArrowLeft");
  const b = pedalUser;
  key("ArrowRight");
  return { pass: b > a, info: [a, b] };
});
V.test("cams hold the wheel straight at full extension", () => {
  const keep = { c: s.c, psi: s.psi };
  const h = M.gear();
  M.holdGear(h, 0, 0.01, 1);
  for (let i = 0; i < 200; i++) M.holdGear(h, 0, 0.01, 1);
  s.c = keep.c;
  s.psi = keep.psi;
  return { pass: Math.abs(h.psi) < 1e-9, info: [h.psi] };
});
V.test("space lands", ({ key }) => {
  key(" ");
  return { pass: mode === "free" && landing && s.air, info: [mode, landing, s.air] };
});

V.run({ step, render, overlay, still: 9.6, idleAfter: 6 });
