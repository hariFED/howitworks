// Page code for differential-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit does the drawing, the camera, explode, balloons and the controls; this file runs the sheet's
// tour exactly as its live.js does (straight, turns, a stop, the right wheel on ice), turns the shafts,
// the carrier with the crown wheel, the pinion and the spiders from it, and adds the axle's controls.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });

// ---------------------------------------------------------------- the meshes the kit cannot make
// scene3d.mjs builds them as triangles and leaves a placeholder box carrying a key: swap them in
// before anything is measured or drawn.
for (let id = 1; id <= 25; id++) {
  for (const h of V.part(id).holders) {
    if (!h.spec.mesh) continue;
    const m = SC.MESHES[h.spec.mesh];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(m.p, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(m.n, 3));
    h.mesh.geometry.dispose();
    h.mesh.geometry = geo;
    if (h.lines) {
      h.lines.geometry.dispose();
      h.lines.geometry = new THREE.EdgesGeometry(geo, 35);
    }
  }
}

// ---------------------------------------------------------------- not cut, and the accent
// The gears stay whole so their mesh reads; shafts and pins are drawn in view, as on the sheet. Their
// materials get their own cut switch, held off. The spiders carry the accent, stronger as they spin.
const shared = V.part(1).holders[0].mesh.material.uniforms;
const ACC = { uLit: new THREE.Color(), uMid: new THREE.Color(), uDark: new THREE.Color() };
const MIX = { uLit: 0.4, uMid: 0.66, uDark: 0.72 };
for (const id of SC.WHOLE) {
  for (const h of V.part(id).holders) {
    h.mesh.material.uniforms.uCutOn = { value: 0 };
    if (h.lines) h.lines.material.uniforms.uCutOn = { value: 0 };
    if (id === 19) for (const k of Object.keys(ACC)) h.mesh.material.uniforms[k] = { value: ACC[k] };
  }
}
function tones(k) {
  for (const u of Object.keys(ACC)) ACC[u].copy(shared[u].value).lerp(shared.uAccent.value, MIX[u] * k);
}

// ---------------------------------------------------------------- state: the 2D sheet's, from the same model
const SHOW = 1 / 8; // rotations are shown at 1/8 of their speed (the readout gives the true rpm)
const s0 = M.tour(0);
const fresh = () => ({ v: s0.v, kappa: s0.kappa, slip: s0.slip, thL: 0, thR: 0, iceVis: 0, tourT: 0 });
let st = fresh();
let dragging = false;
const user = { v: s0.v, kappa: 0, ice: false };

// one sub-step of the sheet's step(): the tour, or the reader's speed, steer and ice
function advance(s, h, driven) {
  let ice;
  if (driven) {
    s.tourT += h;
    const t = M.tour(s.tourT);
    s.v = L.follow(s.v, t.v, 20, h);
    s.kappa = L.follow(s.kappa, t.kappa, 20, h);
    s.slip = L.follow(s.slip, t.slip, 20, h);
    ice = t.ice;
  } else {
    s.v = L.follow(s.v, user.ice ? 0 : user.v, 2.2, h);
    s.kappa = L.follow(s.kappa, user.kappa, 5, h);
    s.slip = L.follow(s.slip, user.ice && s.v < 0.3 ? M.SLIP_ICE : 0, 1.6, h);
    ice = user.ice || s.slip > 0.5;
  }
  const w = M.wheels(s.v, s.kappa, s.slip);
  s.thL += w.wL * h;
  s.thR += w.wR * h;
  s.iceVis = L.follow(s.iceVis, ice ? 1 : 0, 5, h);
}
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 240));
  const driven = live.touring && !dragging;
  for (let i = 0; i < n; i++) advance(st, dt / n, driven);
  return st.v > 1e-3 || st.slip > 1e-3 || Math.abs(st.kappa - user.kappa) > 1e-5 || (st.iceVis > 1e-3 && st.iceVis < 0.999);
}

// The carrier's starting angle is free: choose it so that at the hero moment of the tour (the left
// turn) the cross pin lies in the cutting plane, as the sheet draws it.
const HERO_T = 5.5;
const C0 = (() => {
  const s = fresh();
  for (let t = 0; t < HERO_T; t += 1 / 240) advance(s, 1 / 240, true);
  return ((s.thL + s.thR) / 2) * SHOW;
})();

// ---------------------------------------------------------------- kinematics in the view
// Angles about world +x (the axle): forward roll turns a wheel negatively about +x (its top goes
// forward, +y). Gear ratios from rolling at the pitch points, signs from the geometry.
const X = [1, 0, 0];
const Y = [0, 1, 0];
const kSpT = SC.ratio(X, Y, [P.SIDE.pH[1], P.SIDE.pH[0], 0]); // right side gear → top spider (about +y)
const kSpB = SC.ratio(X, Y, [P.SIDE.pH[1], -P.SIDE.pH[0], 0]); // right side gear → bottom spider (about +y)
const kPin = SC.ratio(X, Y, [P.CROWN.pH[1], P.CROWN.pH[0], 0]); // crown wheel → pinion (about +y)
function angles(s) {
  const aL = -s.thL * SHOW + C0;
  const aR = -s.thR * SHOW + C0;
  const C = (aL + aR) / 2; // the carrier turns at the mean of the wheels
  return { aL, aR, C, sT: kSpT * (aR - C), sB: kSpB * (aR - C), pin: kPin * C };
}
const rx = ([x, y, z], a) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const ry = ([x, y, z], a) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
const CARRIED = [12, 13, 14, 18, 19, 20, 21, 22]; // turn with the carrier
const anchor = (id) => V.part(id).spec.anchor;
const A0 = Object.fromEntries([5, 12, 14, 17, 18, 19, 23].map((id) => [id, anchor(id).cut.slice()]));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function pose(a) {
  for (const id of CARRIED) V.set(id, { rot: [a.C, 0, 0] });
  V.solid(17, 0).rotation.x = a.aR;
  V.solid(17, 1).rotation.x = a.aL;
  V.solid(23, 0).rotation.x = a.aR;
  V.solid(23, 1).rotation.x = a.aL;
  V.solid(25, 0).rotation.x = a.aR;
  V.solid(25, 1).rotation.x = a.aL;
  V.solid(19, 0).rotation.y = a.sT;
  V.solid(19, 1).rotation.y = a.sB;
  V.set(5, { rot: [0, a.pin, 0] });
  // balloons stay put on turning bodies of revolution; on bolts and studs they move to the one in view
  anchor(14).cut = rx(A0[14], -a.C);
  anchor(12).cut = rx(A0[12], -a.C);
  anchor(18).cut = rx(A0[18], -a.C);
  anchor(17).cut = rx(A0[17], -a.aR);
  anchor(23).cut = rx(A0[23], -a.aL);
  anchor(5).cut = ry(A0[5], -a.pin);
  anchor(19).cut = ry(A0[19], -a.sT);
  let best = null;
  for (let k = 0; k < 10; k++) {
    const t = (k * 2 * Math.PI) / 10;
    const w = wrap(t + a.C); // the bolt's angle from +y toward +z
    if (w <= 1e-6 && (best == null || w > best.w)) best = { w, t };
  }
  anchor(13).cut = [64, SC.BOLT_R * Math.cos(best.t), SC.BOLT_R * Math.sin(best.t)];
  let near = null;
  for (let k = 0; k < 5; k++) {
    const t = (k * 2 * Math.PI) / 5;
    const d = Math.abs(wrap(t + a.aR - Math.PI / 4));
    if (near == null || d < near.d) near = { d, t };
  }
  anchor(25).cut = [285, SC.STUD_PCD * Math.cos(near.t), SC.STUD_PCD * Math.sin(near.t)];
}

// ---------------------------------------------------------------- render
const fmt0 = (x) => String(Math.round(x)).replace("-", "−");
const say = L.announcer($("sr"), 2.5);
function render(live) {
  const a = angles(st);
  pose(a);
  const w = M.wheels(st.v, st.kappa, st.slip);
  const wC = M.carrier(w.wL, w.wR);
  const nS = M.rpm(M.spider(w.wL, w.wR));
  tones(0.55 + 0.45 * Math.min(1, Math.sqrt(Math.abs(nS) / 120)));
  const ice = st.iceVis > 0.5;
  const tq = M.torques(ice).each;
  let mode = "STRAIGHT";
  if (ice) mode = "R WHEEL ON ICE";
  else if (st.v < 0.05) mode = "STOPPED";
  else if (Math.abs(st.kappa) > 0.01) mode = `TURN ${st.kappa > 0 ? "L" : "R"} ${(1 / Math.abs(st.kappa)).toFixed(1)} m`;
  $("readout").textContent = `n L ${fmt0(M.rpm(w.wL))} R ${fmt0(M.rpm(w.wR))} C ${fmt0(M.rpm(wC))} · SPIDER ${fmt0(nS)} rpm · T ${fmt0(tq)}+${fmt0(tq)} N·m · ${mode}`;
  say(`${mode.toLowerCase()}: left wheel ${fmt0(M.rpm(w.wL))}, right ${fmt0(M.rpm(w.wR))}, carrier ${fmt0(M.rpm(wC))} rpm; spiders ${fmt0(Math.abs(nS))} rpm.`, live.clock);
  $("ice")?.setAttribute("aria-pressed", String(ice));
}

// ---------------------------------------------------------------- controls, as on the sheet
const KMAX = 1 / 5;
const clampK = (k) => Math.min(KMAX, Math.max(-KMAX, k));
let lv = null;
const takeOver = () => {
  if (!lv || lv.touring) {
    user.v = st.v > 0.3 ? st.v : M.V_CRUISE;
    user.kappa = st.kappa;
    user.ice = false;
  }
};
// drag the crown wheel or the carrier sideways to steer: right steers right
let k0 = 0;
V.drag([12, 14], {
  axis: [1, 0, 0],
  length: 150,
  start: () => {
    takeOver();
    dragging = true;
    k0 = user.kappa;
    return 0;
  },
  move: (v) => (user.kappa = clampK(k0 - v * KMAX)),
  end: () => (dragging = false),
});
const keyed = (fn) => () => {
  takeOver();
  fn();
};
V.key("ArrowLeft", keyed(() => (user.kappa = clampK(user.kappa + KMAX / 5))));
V.key("ArrowRight", keyed(() => (user.kappa = clampK(user.kappa - KMAX / 5))));
V.key("ArrowUp", keyed(() => (user.v = Math.min(30 / 3.6, user.v + 5 / 3.6))));
V.key("ArrowDown", keyed(() => (user.v = Math.max(0, user.v - 5 / 3.6))));
V.key("Home", keyed(() => (user.kappa = 0)));
V.key("i", keyed(() => (user.ice = !user.ice)));
$("ice")?.addEventListener("click", () => {
  takeOver();
  user.ice = !user.ice;
  V.input();
});

// the page's own self-tests (?selftest=1)
V.test("crown wheel drag steers", ({ ptr, project }) => {
  const g = project([40, 100, 0]);
  const before = user.kappa;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0] + 90, g[1]);
  const after = user.kappa;
  ptr("pointerup", g[0] + 90, g[1]);
  return { pass: after < before - 0.01, info: [before, after] };
});
V.test("arrow keys steer", ({ key }) => {
  const a = user.kappa;
  key("ArrowLeft");
  const b = user.kappa;
  key("ArrowRight");
  return { pass: b > a, info: [a, b] };
});
V.test("I puts the right wheel on ice", ({ key }) => {
  const a = user.ice;
  key("i");
  const b = user.ice;
  key("i");
  return { pass: a !== b, info: [a, b] };
});
V.test("spiders spin only when the wheels differ", () => {
  const keep = { thL: st.thL, thR: st.thR };
  const spin = (l, r) => {
    st.thL = l;
    st.thR = r;
    render({ clock: 0 });
    return V.solid(19, 0).rotation.y;
  };
  const s0 = spin(0, 0);
  const s1 = spin(3, 3);
  const s2 = spin(0, 3);
  Object.assign(st, keep);
  return { pass: Math.abs(s1 - s0) < 1e-9 && Math.abs(s2 - s0) > 0.1, info: [s0, s1, s2] };
});

lv = V.run({ step, render, still: 6, idleAfter: 6 });
