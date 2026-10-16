// Page code for disc-brake-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit draws, frames, explodes and labels; this file runs the model exactly as the sheet's live.js
// does (same tour, same 480 Hz substeps, the caliper pistons following the oil with the seals' lag) and
// poses the lever, the master piston, the caliper pistons, the pads and the seals from it.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });

// ---------------------------------------------------------------- state: the 2D sheet's
let theta = 0; // lever angle, rad
let target = 0;
let y = 0; // caliper piston travel, follows the oil with a little lag (the seals pulling back)
let auto = false;
let dragging = false;

// The tour, as on the sheet: rest, pull slowly through free stroke, gap and contact, hold, release.
const PERIOD = 6;
const tour = { t: 0 };
function tourTarget(h) {
  tour.t = (tour.t + h) % PERIOD;
  const t = tour.t;
  if (t < 0.5) return 0;
  if (t < 2.9) return M.THETA_MAX * L.ease((t - 0.5) / 2.4);
  if (t < 3.7) return M.THETA_MAX;
  if (t < 4.9) return M.THETA_MAX * (1 - L.ease((t - 3.7) / 1.2));
  return 0;
}

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  const driven = (live.touring || auto) && !dragging;
  for (let i = 0; i < n; i++) {
    if (driven) target = tourTarget(h);
    theta = live.reduced && !driven ? target : L.follow(theta, target, driven ? 40 : 20, h);
    theta = Math.min(M.THETA_MAX, Math.max(0, theta));
    const want = M.brake(theta).y;
    y = live.reduced && !driven ? want : L.follow(y, want, 30, h);
  }
  return Math.abs(theta - target) > 1e-5 || Math.abs(y - M.brake(theta).y) > 1e-4;
}

// ---------------------------------------------------------------- the rotor is drawn whole
// The cutting plane travels with each solid's uShift; the rotor's is parked far beyond it, so the kit
// never cuts the rotor and it passes whole between the pads (kit has no per-part "uncut" switch).
const far = { x: 0, y: 0, z: 1e5, set() { return this; } };
for (const hd of V.part(27).holders) {
  hd.mesh.material.uniforms.uShift.value = far;
  if (hd.lines) hd.lines.material.uniforms.uShift.value = far;
}
// The reservoir oil is a part (item 15) so it gets a balloon: it hides when exploded like the others,
// and its leader counts the body and the bladder round it as its own (they are what the id pass sees).
const oil15 = V.part(15).holders;
for (const hd of oil15) hd.mesh.frustumCulled = false;
for (const id of [1, 14]) for (const ed of V.part(id).edges) V.part(15).edges.add(ed);

// ---------------------------------------------------------------- poses from the model
const BALL_V = P.BALL_V;
const solid = (id, key) => V.part(id).live[key].inner;
function pose(th, yy) {
  const b = M.brake(th);
  const x = b.x;
  V.set(3, { rot: [0, 0, -th] });
  const bar = P.barrelAt(th);
  // the pushrod runs from its ball (riding with the piston) to the barrel nut, which swivels in the lever
  const a = Math.atan2(-bar[0], bar[1] - (BALL_V - x));
  V.set(5, { pos: [bar[0] - P.BARREL[0], bar[1] - P.BARREL[1], 0], rot: [0, 0, a] });
  V.set(6, { pos: [0, -x, 0], rot: [0, 0, a] });
  for (const id of [7, 8, 9]) V.set(id, { pos: [0, -x, 0] });
  const yp = Math.min(yy, M.GAP);
  solid(22, "o").position.set(-yy, 0, 0);
  solid(22, "i").position.set(yy, 0, 0);
  for (const k of ["lino", "backo"]) solid(24, k).position.set(-yp, 0, 0);
  for (const k of ["lini", "backi"]) solid(24, k).position.set(yp, 0, 0);
  return { b, x, yp };
}
V.frame([() => pose(0, 0), () => pose(M.THETA_MAX, M.GAP)]); // the whole pull: the zoom never pumps

let shown = { x: -1, y: -1, yp: -1 };
const tint = (p) => 0.15 + 0.85 * Math.min(1, Math.max(0, p / M.P_MAX));
function render(live) {
  const { b, x, yp } = pose(theta, y);
  V.solid(10, "spring").scale.y = (SC.SPRING_LEN - x) / SC.SPRING_LEN;
  // shapes that change: the boot squashed by the rod, the square seals sheared, the pad spring
  if (Math.abs(x - shown.x) > 0.01) {
    V.reshape(12, "boot", { loop: SC.bootLoop(x) });
    shown.x = x;
  }
  if (Math.abs(y - shown.y) > 0.004) {
    V.reshape(23, "o", { loop: SC.sealLoop(y, 1) });
    V.reshape(23, "i", { loop: SC.sealLoop(y, -1) });
    shown.y = y;
  }
  if (Math.abs(yp - shown.yp) > 0.004) {
    V.reshape(25, "spring", { shape: SC.padSpringShape(yp) });
    shown.yp = yp;
  }
  // the accent is the oil, its stipple density the pressure; the reservoir side stays at atmospheric
  const t = tint(b.p);
  for (const f of SC.PRESSED) V.fluid(f, { density: t, wash: 0.04 + 0.16 * t });
  V.fluid("chamber", { stretch: -x });
  const show = V.explode < 0.01 && V.cut;
  for (const hd of oil15) {
    hd.holder.visible = show;
    hd.mesh.material.uniforms.uDensity.value = 0.15;
    hd.mesh.material.uniforms.uWash.value = 0.04;
  }

  const text = `s ${b.s.toFixed(1)} mm · ${Math.round(b.finger)} N · ${(b.p * 10).toFixed(1)} bar · CLAMP ${(b.clamp / 1000).toFixed(2)} kN · ${Math.round(b.torque)} N·m · ${b.decel.toFixed(1)} m/s²`;
  $("readout").textContent = text;
  say(
    `${b.phase === "FREE" ? "Free stroke, timing port open" : b.phase === "GAP" ? "Port shut, pads closing the gap" : "Pads on the rotor"}: finger travel ${b.s.toFixed(0)} millimetres, ${(b.p * 10).toFixed(0)} bar, clamp ${Math.round(b.clamp)} newtons, deceleration ${b.decel.toFixed(1)} metres per second squared.`,
    live.clock
  );
  $("squeeze")?.setAttribute("aria-pressed", String(auto));
}
const say = L.announcer($("sr"), 2);

// the live finger travel beside the blade's tip, while assembled (as on the sheet)
function overlay() {
  if (V.explode > 0.05) return "";
  const now = P.rot(P.FINGER, M.PIVOT, theta);
  if (P.FINGER[1] - now[1] < 0.3) return "";
  return V.dim([P.FINGER[0] + 4, P.FINGER[1], 0], [P.FINGER[0] + 4, now[1], 0], { text: `s=${(M.RF * theta).toFixed(1)}`, off: 22 });
}

// ---------------------------------------------------------------- the brake's controls
// drag the lever blade down (towards the bar): the value is the lever angle as a share of the full pull
const DROP = P.FINGER[1] - P.rot(P.FINGER, M.PIVOT, M.THETA_MAX)[1];
const clamp = (v) => Math.min(M.THETA_MAX, Math.max(0, v));
V.drag([3], {
  axis: [0, -1, 0],
  length: DROP,
  start: () => {
    dragging = true;
    auto = false;
    target = theta;
    return theta / M.THETA_MAX;
  },
  move: (v) => (target = clamp(v * M.THETA_MAX)),
  end: () => (dragging = false),
});
const nudge = (d) => () => {
  target = clamp(target + (d * M.THETA_MAX) / 8);
  auto = false;
};
V.key("ArrowDown", nudge(1));
V.key("ArrowUp", nudge(-1));
V.key("Home", () => ((target = 0), (auto = false)));
V.key("End", () => ((target = M.THETA_MAX), (auto = false)));
V.key(" ", () => (auto = !auto));
$("squeeze")?.addEventListener("click", () => {
  auto = !auto;
  V.input();
});

// the brake's own self-tests (?selftest=1): grab the blade near its tip and pull it down; Space squeezes
V.test("lever drag pulls", ({ ptr, project }) => {
  const g = project([...P.rot([40, 61], M.PIVOT, theta), 0]);
  const t0 = target;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] + 80);
  const t1 = target;
  ptr("pointerup", g[0], g[1] + 80);
  return { pass: t1 > t0 + 0.02, info: [t0, t1] };
});
V.test("space toggles squeezing", ({ key }) => {
  const a = auto;
  key(" ");
  const b = auto;
  key(" ");
  return { pass: a !== b, info: [a, b] };
});
V.test("pads close on the rotor at full pull", () => {
  const b = M.brake(M.THETA_MAX);
  return { pass: b.phase === "CONTACT" && b.y >= M.GAP, info: [b.phase, b.y] };
});

V.run({ step, render, overlay, still: 3.2 });
