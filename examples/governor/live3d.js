// Page code for governor-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit draws, frames, explodes and labels; this file runs the sheet's closed loop (the same load
// steps, the same controls), spins the drive and the spindle, swings the arms and balls to the
// model's angle, lifts the sleeve, turns the bell crank and lifts the valve off its seats.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });
const rad = Math.PI / 180;
const SIDE = [1, -1];
const H = (id) => V.part(id).holders;

// ---------------------------------------------------------------- state: the 2D sheet's
const eng = M.engine(M.LOAD_LIGHT);
let load = M.LOAD_LIGHT;
let userLoad = M.LOAD_LIGHT;
let dragging = false;
let tourT = 0;
let theta = 0.4; // spindle angle, rad; the drive shaft turns theta / RATIO
const SLOW = 20; // shown at 1/20 speed, as View D on the sheet
let steadyFor = -1;
let steadyAt = null;

// The tour, as on the sheet: light load, a step to heavy at 2 s, back to light at 10 s, every 16 s.
const PERIOD = 16;
const tourLoad = (t) => {
  const p = t % PERIOD;
  return p >= 2 && p < 10 ? M.LOAD_HEAVY : M.LOAD_LIGHT;
};

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const touring = live.touring && !dragging;
    load = touring ? tourLoad(tourT) : userLoad;
    if (touring) tourT += h;
    M.step(eng, h, load);
    if (!live.reduced) theta += (M.RATIO * eng.omega * h) / SLOW;
  }
  if (!live.touring) userLoad = load;
  if (load !== steadyFor) {
    steadyFor = load;
    steadyAt = M.steady(load);
  }
  const settling = Math.abs(eng.omega - steadyAt.omega) > 1e-4 || Math.abs(eng.alpha - steadyAt.alpha) > 1e-4;
  return settling || !live.reduced; // the engine keeps turning
}

// ---------------------------------------------------------------- the bevel teeth
// Each tooth ring was given a plain placeholder in scene3d.mjs; replace it with straight bevel teeth:
// the heel outline swept toward the pitch-cone apex (the origin), the bore kept cylindrical.
function bevelGeometry(b) {
  const pts = SC.toothOutline(b);
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  shape.holes.push(new THREE.Path(S.circle(0, 0, b.hole, 96).map(([x, y]) => new THREE.Vector2(x, y))));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1, curveSegments: 1 });
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const k = b.k0 + (1 - b.k0) * p.getZ(i);
    const sc = Math.hypot(x, y) < b.hole + 0.01 ? 1 : k;
    // (x, y) is the plan, z runs toe → heel; local Y is the gear's axis (mirrored plan keeps it outward)
    p.setXYZ(i, x * sc, b.heel * k, -y * sc);
  }
  if (b.axis === "-x") geo.rotateZ(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}
for (const id of [3, 4]) {
  const h = V.part(id).live.teeth;
  h.mesh.geometry.dispose();
  h.mesh.geometry = bevelGeometry(SC.BEVEL[h.spec.bevel]);
  h.lines.geometry.dispose();
  h.lines.geometry = new THREE.EdgesGeometry(h.mesh.geometry, 35);
}

// ---------------------------------------------------------------- the whole parts
// The head, its nut, the arms, the balls, the links and the head pins swing round through the
// section plane; their own plane is moved far off, so they are never cut.
for (const p of SC.parts()) {
  V.part(p.id).holders.forEach((h) => {
    if (!h.spec.whole) return;
    for (const o of [h.mesh, h.lines]) {
      if (!o) continue;
      const before = o.onBeforeRender;
      o.onBeforeRender = function (...args) {
        before?.apply(this, args);
        o.material.uniforms.uShift.value.z = 1e5;
      };
    }
  });
}

// The flyballs carry the accent: their toon tones are the theme's, pulled toward --bp-accent.
const ballTones = { uLit: [new THREE.Color(), "--bp3-lit", 0.22], uMid: [new THREE.Color(), "--bp3-mid", 0.5], uDark: [new THREE.Color(), "--bp3-dark", 0.66] };
for (const h of H(13)) for (const [u, [c]] of Object.entries(ballTones)) h.mesh.material.uniforms[u] = { value: c };
function tintBalls() {
  const css = (name) => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, "rgb($1,$2,$3)") || "#888");
  const acc = css("--bp-accent");
  for (const [c, name, k] of Object.values(ballTones)) c.copy(css(name)).lerp(acc, k);
}
tintBalls();
new MutationObserver(() => {
  tintBalls();
  V.redraw();
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

// ---------------------------------------------------------------- poses from the model
// Move a solid by d (world, in its part's frame) after turning it by rz about its own pivot.
function place(h, [dx, dy, dz], rz = 0) {
  h.holder.rotation.z = rz;
  const c = Math.cos(-rz);
  const s = Math.sin(-rz);
  h.inner.position.set(-h.pivot[0] + dx * c - dy * s, -h.pivot[1] + dx * s + dy * c, -h.pivot[2] + dz);
}
const [BR0, BV0] = SC.BALL0;
const [E0, G0, EL] = [SC.E0, SC.G0, SC.EL];
const LINK0 = Math.atan2(EL[1] - G0[1], EL[0] - G0[0]);
function pose(a, th) {
  const dl = M.lug(a) - SC.LUG0;
  const [br, bv] = M.ballC(a);
  const da = (a - SC.A0) * rad;
  const tw = th / M.RATIO; // the bevel wheel and the drive shaft
  // spinning cut parts turn solid by solid about their own axes (their balloons stay put)
  for (const id of [4, 8, 16]) for (const h of H(id)) h.holder.rotation.y = th; // (the stop collars are round: left still, their balloon stays put)
  for (const id of [2, 3, 6]) for (const h of H(id)) h.holder.rotation.x = tw;
  const keys = H(7);
  keys[0].holder.rotation.x = keys[1].holder.rotation.x = tw;
  keys[2].holder.rotation.y = th;
  V.set(16, { pos: [0, dl, 0] });
  V.set(17, { pos: [0, dl, 0] });
  // the flying parts turn as one about the spindle; each arm and link swings in its own plane
  for (const id of [10, 11, 12, 13, 14]) V.set(id, { rot: [0, th, 0] });
  H(12).forEach((h, k) => place(h, [0, 0, 0], SIDE[k] * da));
  H(13).forEach((h, k) => place(h, [SIDE[k] * (br - BR0), bv - BV0, 0]));
  H(14).forEach((h, k) => place(h, [0, dl, 0], -SIDE[k] * da));
  const pins = H(15);
  pins[0].holder.rotation.y = pins[1].holder.rotation.y = th;
  // the linkage: collar pin C rides the sleeve, the crank turns, the link and the valve follow
  const psi = M.crankTurn(a);
  const E = M.pinE(psi);
  const G = M.pinG(a);
  place(pins[2], [0, dl, 0]);
  place(pins[4], [E[0] - E0[0], E[1] - E0[1], 0]);
  place(pins[5], [G[0] - G0[0], G[1] - G0[1], 0]);
  V.set(18, { rot: [0, 0, psi] });
  V.set(19, { pos: [G[0] - G0[0], G[1] - G0[1], 0], rot: [0, 0, Math.atan2(E[1] - G[1], E[0] - G[0]) - LINK0] });
  for (const id of [20, 21, 28]) V.set(id, { pos: [0, G[1] - G0[1], 0] });
}
// frame both stops and a quarter turn apart, so the zoom never breathes as the balls go round
V.frame([M.ALPHA_MIN, M.ALPHA_MAX].flatMap((a) => [0, 1, 2, 3].map((q) => () => pose(a, (q * Math.PI) / 2))));

// Balloons on the flying parts follow the ball on the right of the screen, so they keep their column.
const ANCHORS = {
  10: (s) => ({ pt: [s * 24, M.VT + 10, 6] }),
  11: (s) => ({ pt: [s * 14, M.VT + 20, 0] }),
  12: (s) => ({ pt: SC.armMid(s), solid: s > 0 ? 0 : 1 }),
  13: (s) => ({ pt: [s * BR0, BV0, 0], solid: s > 0 ? 0 : 1 }),
  14: (s) => ({ pt: SC.linkMid(s), solid: s > 0 ? 0 : 1 }),
};
function pickAnchors() {
  const right = (id, s) => {
    const rec = V.part(id);
    const { pt, solid } = ANCHORS[id](s);
    const m = (solid != null ? rec.holders[solid].inner : rec.inner).matrixWorld;
    return V.project(new THREE.Vector3(...pt).applyMatrix4(m))[0];
  };
  for (const id of Object.keys(ANCHORS).map(Number)) {
    const s = right(id, 1) >= right(id, -1) ? 1 : -1;
    const { pt, solid } = ANCHORS[id](s);
    const a = V.part(id).spec.anchor;
    a.cut = pt;
    a.out = { c: pt };
    if (solid != null) a.solid = solid;
  }
}

// ---------------------------------------------------------------- render
const say = L.announcer($("sr"), 2);
function render(live) {
  pose(eng.alpha, theta);
  pickAnchors();
  const n = M.toRpm(eng.omega);
  const x = M.sleeveLift(eng.alpha);
  const lift = M.valveLift(eng.alpha);
  $("readout").textContent = `n ${n.toFixed(1)} rpm · x ${x.toFixed(1)} mm · VALVE ${lift.toFixed(1)} mm (${Math.round(eng.f * 100)} %) · LOAD ${Math.round(load)} N·m`;
  say(`Engine ${n.toFixed(1)} rpm, sleeve lift ${x.toFixed(0)} millimetres, valve ${Math.round(eng.f * 100)} percent open, load ${Math.round(load)} newton metres.`, live.clock);
  $("step")?.setAttribute("aria-pressed", String(load > (M.LOAD_LIGHT + M.LOAD_HEAVY) / 2));
}

// the sleeve lift x, from the lower stop collar's top to the sleeve's foot, as on the sheet
function overlay() {
  if (V.explode > 0.05) return "";
  const ref = [22, P.STOP_LO + 14, 0];
  const now = [22, M.lug(eng.alpha) + M.SLEEVE.bot, 0];
  return V.dim(ref, now, { text: `x=${Math.round(now[1] - ref[1])}`, off: 34 });
}

// ---------------------------------------------------------------- controls, as on the sheet
const clampLoad = (v) => Math.min(M.LOAD_MAX, Math.max(M.LOAD_MIN, v));
const SPAN = M.LOAD_MAX - M.LOAD_MIN;
// drag the balls, arms, links or sleeve up for more load (the sheet's 5 N·m per sheet unit)
V.drag([12, 13, 14, 16], {
  axis: [0, 1, 0],
  length: 160,
  start: () => {
    dragging = true;
    userLoad = load;
    return (load - M.LOAD_MIN) / SPAN;
  },
  move: (v) => (userLoad = clampLoad(M.LOAD_MIN + v * SPAN)),
  end: () => (dragging = false),
});
const nudge = (d) => () => (userLoad = clampLoad(load + d));
const toggle = () => (userLoad = load > (M.LOAD_LIGHT + M.LOAD_HEAVY) / 2 ? M.LOAD_LIGHT : M.LOAD_HEAVY);
V.key("ArrowUp", nudge(100));
V.key("ArrowDown", nudge(-100));
V.key(" ", toggle);
$("step")?.addEventListener("click", () => {
  V.input();
  toggle();
  V.input();
});

// the page's own self-tests (?selftest=1)
V.test("dragging the sleeve up adds load", ({ ptr, project }) => {
  const p = project([-40, M.lug(eng.alpha) - 40, 0]);
  const l0 = userLoad;
  ptr("pointerdown", p[0], p[1]);
  ptr("pointermove", p[0], p[1] - 60);
  const l1 = userLoad;
  ptr("pointerup", p[0], p[1] - 60);
  return { pass: l1 > l0 + 100, info: [l0, l1] };
});
V.test("arrow up adds 100 N·m", ({ key }) => {
  const a = load;
  key("ArrowUp");
  const b = userLoad;
  key("ArrowDown");
  return { pass: Math.abs(b - clampLoad(a + 100)) < 1e-6, info: [a, b] };
});
V.test("space steps the load", ({ key }) => {
  const a = load;
  key(" ");
  const b = userLoad;
  return { pass: Math.abs(b - a) > 500, info: [a, b] };
});
V.test("the sleeve at the top stop shuts the valve", () => {
  pose(M.ALPHA_MAX, theta);
  const shut = V.part(21).base.pos[1];
  pose(M.ALPHA_MIN, theta);
  const open = V.part(21).base.pos[1];
  pose(eng.alpha, theta);
  return { pass: Math.abs(shut) < 1e-9 && Math.abs(open - M.VALVE_LIFT_MAX) < 1e-9, info: [shut, open] };
});

V.run({ step, render, overlay, still: 9 });
