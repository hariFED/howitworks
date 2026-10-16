// Page code for pin-tumbler-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit does the drawing, the camera, explode, balloons and the controls; this file runs the
// model exactly as the sheet's live.js does, poses the key, the stacks, the plug and the cam from it,
// and adds the lock's own controls.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });
const E = M.BLADE_LEN;
const rad = (d) => (d * Math.PI) / 180;

// ---------------------------------------------------------------- not cut, and the accent
// The key is shown whole, as a solid you could pick up: its wards and bitting are the point.
const shared = V.part(1).holders[0].mesh.material.uniforms;
for (const id of [15]) {
  for (const h of V.part(id).holders) {
    h.mesh.material.uniforms.uCutOn = { value: 0 };
    if (h.lines) h.lines.material.uniforms.uCutOn = { value: 0 };
  }
}
// The one accent: the shear line (a thin band lying on the plane) and the key-pin crowns, the
// interfaces that must all reach it. Their tones and their cut faces take the theme's accent.
const lit = (h) => {
  const u = h.mesh.material.uniforms;
  u.uLit = u.uMid = u.uDark = u.uInk = shared.uAccent;
};
lit(V.part(90).holders[0]);
for (const id of P.PIN_ITEM) lit(V.part(id).live.crown);

// The key is built as slabs across its thickness (its profile's wards); the seams between slabs are
// not edges of the key, so their crease lines are dropped.
function dropSeams(h, bitting) {
  const g = h.lines.geometry;
  const p = g.attributes.position;
  const keep = [];
  const d = 0.02;
  const seams = [-0.45, 0.45, 0.6];
  for (let i = 0; i < p.count; i += 2) {
    const a = [p.getX(i), p.getY(i), p.getZ(i)];
    const b = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)];
    const zs = seams.find((s) => Math.abs(a[2] - s) < 1e-4 && Math.abs(b[2] - s) < 1e-4);
    if (zs != null) {
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      let same = true;
      for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, -d], [d, -d], [-d, d]]) {
        if (SC.inKey(bitting, mx + dx, my + dy, zs - d) !== SC.inKey(bitting, mx + dx, my + dy, zs + d)) same = false;
      }
      if (same) continue;
    }
    keep.push(...a, ...b);
  }
  const ng = new V.THREE.BufferGeometry();
  ng.setAttribute("position", new V.THREE.Float32BufferAttribute(keep, 3));
  h.lines.geometry.dispose();
  h.lines.geometry = ng;
}
const KEYS = { right: [], wrong: [] };
V.part(15).holders.forEach((h, k) => {
  const n = SC.KEY_SPLIT;
  const isWrong = k >= n;
  (isWrong ? KEYS.wrong : KEYS.right).push(h);
  if (k % n < n - 2) dropSeams(h, isWrong ? M.WRONG : M.RIGHT); // the last two are the shank and the bow
});

// ---------------------------------------------------------------- state: the 2D sheet's, from the same model
let wrong = true; // the tour starts with the wrong key
let e = 0; // insertion, mm (E = home)
let phi = 0; // plug angle, degrees clockwise seen from the front
let fade = 1; // the key is swapped while it is out
let torque = false; // someone is trying to turn the key
let eTarget = 0;
let phiTarget = 0;
let pendingSwap = false;
let auto = false;
let dragging = false;
let st = M.stacks(M.WRONG, 0);
const bitting = () => (wrong ? M.WRONG : M.RIGHT);

// The tour, as on the sheet: the wrong key goes in and will not turn; out; the right key goes in and turns.
const SEG = [
  ["hold", 0.8],
  ["in", 2.4],
  ["try", 1.6],
  ["out", 2.0],
  ["swap", 0.8],
  ["in", 2.4],
  ["turn", 1.4],
  ["dwell", 1.2],
  ["back", 1.4],
  ["out", 2.0],
  ["swap", 0.8],
];
const PERIOD = SEG.reduce((s, [, d]) => s + d, 0);
let tourT = 0;

function tourPose(t) {
  t %= PERIOD;
  let w = true;
  for (const [name, d] of SEG) {
    if (t < d) {
      const f = t / d;
      const pose = { wrong: w, e: E, phi: 0, torque: false, fade: 1 };
      if (name === "hold") pose.e = 0;
      if (name === "in") pose.e = E * L.ease(f);
      if (name === "try") {
        pose.torque = f > 0.12 && f < 0.88;
        pose.phi = pose.torque ? M.CAM_TURN : 0;
      }
      if (name === "out") pose.e = E * (1 - L.ease(f));
      if (name === "swap") {
        pose.e = 0;
        pose.fade = Math.abs(1 - 2 * f);
        if (f >= 0.5) pose.wrong = !w;
      }
      if (name === "turn") {
        pose.phi = M.CAM_TURN * L.ease(f);
        pose.torque = true;
      }
      if (name === "dwell") pose.phi = M.CAM_TURN;
      if (name === "back") {
        pose.phi = M.CAM_TURN * (1 - L.ease(f));
        pose.torque = true;
      }
      return pose;
    }
    t -= d;
    if (name === "swap") w = !w;
  }
  return { wrong: true, e: 0, phi: 0, torque: false, fade: 1 };
}

function step(dt, live) {
  const driven = (live.touring || auto) && !dragging;
  if (driven) {
    tourT += dt;
    const p = tourPose(tourT);
    wrong = p.wrong;
    e = p.e;
    fade = p.fade;
    torque = p.torque;
    st = M.stacks(bitting(), e);
    phi = M.free(st) ? p.phi : 0;
    eTarget = e;
    phiTarget = phi;
    return true;
  }
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    if (phi < 0.5) e = live.reduced ? eTarget : L.follow(e, eTarget, 14, h);
    if (pendingSwap && e < 0.05) {
      wrong = !wrong;
      pendingSwap = false;
      eTarget = 0;
    }
    st = M.stacks(bitting(), e);
    const want = M.free(st) ? phiTarget : 0;
    phi = live.reduced ? want : L.follow(phi, want, 12, h);
    if (!M.free(st)) phi = 0;
  }
  torque = phiTarget > 0.5 && !M.free(st);
  fade = 1;
  return Math.abs(e - eTarget) > 1e-3 || Math.abs(phi - (M.free(st) ? phiTarget : 0)) > 1e-2;
}

// ---------------------------------------------------------------- poses from the model
function pose(b, ee, ph, stacks) {
  const a = rad(ph);
  const rot = [a, 0, 0];
  V.set(2, { rot });
  V.set(11, { rot });
  V.set(15, { pos: [-(E - ee), 0, 0], rot });
  // key pins ride in the plug: lifted to their nose height in the plug's frame, then turned with it
  stacks.forEach((s, i) => V.set(P.PIN_ITEM[i], { pos: [0, s.nose * Math.cos(a), s.nose * Math.sin(a)], rot }));
  // drivers and springs stay in the body
  const drv = V.part(8).holders;
  stacks.forEach((s, i) => {
    drv[i].inner.position.set(0, s.top, 0);
    V.solid(9, i).scale.y = s.spring / SC.SPRING_LEN;
  });
  const isWrong = b === M.WRONG;
  for (const h of KEYS.right) h.holder.visible = !isWrong;
  for (const h of KEYS.wrong) h.holder.visible = isWrong;
}
V.frame([() => pose(M.WRONG, 0, 0, M.stacks(M.WRONG, 0)), () => pose(M.RIGHT, E, M.CAM_TURN, M.stacks(M.RIGHT, E))]);

const say = L.announcer($("sr"), 2);
const sign = (v) => (v > 0.049 ? "+" : v < -0.049 ? "−" : "±") + Math.abs(v).toFixed(1);
const band = V.part(90).holders[0].holder;
function render(live) {
  const b = bitting();
  pose(b, e, phi, st);
  for (const h of [...KEYS.right, ...KEYS.wrong]) if (h.holder.visible && fade < 0.5) h.holder.visible = false;
  band.visible = V.explode < 0.01 && V.cut;
  const free = M.free(st);
  const blk = M.blocking(st);
  let state;
  if (phi > 0.5) state = `PLUG TURNED ${Math.round(phi)}°`;
  else if (free) state = "ALL 5 GAPS ON THE SHEAR LINE";
  else if (blk.length === 1) state = `PIN ${blk[0] + 1} ${sign(st[blk[0]].off)} mm · ${torque ? "TURN BLOCKED" : "LOCKED"}`;
  else state = `${blk.length} PINS OFF THE LINE · ${torque ? "TURN BLOCKED" : "LOCKED"}`;
  $("readout").textContent = `KEY ${M.codeText(b)} · IN ${e.toFixed(1)} mm · ${state}`;
  say(`Key ${M.codeText(b)}, inserted ${e.toFixed(0)} millimetres. ${state.toLowerCase()}.`, live.clock);
  $("tour")?.setAttribute("aria-pressed", String(auto));
}

// the live dimension under the body: the key's travel still to go, shoulder to plug face (as on the
// sheet), and a curved arrow round the plug face while someone turns the key
function overlay() {
  if (V.explode > 0.05) return "";
  let s = "";
  const togo = E - e;
  if (togo > 0.3 && fade > 0.5) s += V.dim([-togo, -M.BODY_R - 1, 0], [0, -M.BODY_R - 1, 0], { text: togo.toFixed(1), off: 22 });
  if (torque) {
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const a = rad(-30 + (100 * k) / 24);
      pts.push(V.project([-1, 12 * Math.cos(a), 12 * Math.sin(a)]));
    }
    const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    const [p1, p0] = [pts[pts.length - 1], pts[pts.length - 3]];
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const l = Math.hypot(dx, dy) || 1;
    const u = [dx / l, dy / l];
    const nn = [-u[1], u[0]];
    const tip = [p1[0] + u[0] * 7, p1[1] + u[1] * 7];
    s += `<g data-role="torque"><path class="thin" d="M${pts.map(f).join("L")}"/><path class="head" d="M${f(tip)}L${f([p1[0] + nn[0] * 2.4, p1[1] + nn[1] * 2.4])}L${f([p1[0] - nn[0] * 2.4, p1[1] - nn[1] * 2.4])}Z"/></g>`;
  }
  return s;
}

// ---------------------------------------------------------------- the lock's controls
const stopTour = () => {
  auto = false;
  e = Math.min(E, Math.max(0, e));
  eTarget = e;
  phiTarget = phi;
};
// drag the key along the keyway: the value is the insertion, growing as the key moves in (+x) 24.8 mm
V.drag(15, {
  axis: [1, 0, 0],
  length: E,
  start: () => {
    dragging = true;
    stopTour();
    return e / E;
  },
  move: (v) => {
    if (phi < 0.5) eTarget = Math.min(E, Math.max(0, v * E));
  },
  end: () => {
    dragging = false;
    if (phi < 0.5) phiTarget = 0;
  },
});
const insert = (d) => () => {
  stopTour();
  if (phi < 0.5) eTarget = Math.min(E, Math.max(0, eTarget + d));
};
const turn = (d) => () => {
  stopTour();
  phiTarget = Math.min(M.CAM_TURN, Math.max(0, phiTarget + d));
};
V.key("ArrowRight", insert(2));
V.key("ArrowLeft", insert(-2));
V.key("ArrowUp", turn(15));
V.key("ArrowDown", turn(-15));
V.key("End", insert(E));
V.key("Home", insert(-E));
V.key("k", () => {
  stopTour();
  phiTarget = 0;
  eTarget = 0;
  pendingSwap = true;
});
V.key(" ", () => {
  auto = !auto;
  if (auto) tourT = 0;
});
$("tour")?.addEventListener("click", () => {
  auto = !auto;
  if (auto) tourT = 0;
  V.input();
});

// the lock's own self-tests (?selftest=1)
V.test("key drag inserts", ({ ptr, project }) => {
  const a = project([SC.BOW.x0 + 6 - (E - e), 8, SC.BOW.hw]);
  const b = project([SC.BOW.x0 + 6 - (E - e) + 10, 8, SC.BOW.hw]);
  const t0 = eTarget;
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const l = Math.hypot(ux, uy) || 1;
  ptr("pointerdown", a[0], a[1]);
  ptr("pointermove", a[0] + (ux / l) * 120, a[1] + (uy / l) * 120);
  const t1 = eTarget;
  ptr("pointerup", a[0] + (ux / l) * 120, a[1] + (uy / l) * 120);
  return { pass: t1 > t0 + 2, info: [t0, t1] };
});
V.test("arrow keys insert", ({ key }) => {
  key("ArrowRight");
  const t1 = eTarget;
  key("ArrowLeft");
  return { pass: t1 > e + 1, info: [e, t1] };
});
V.test("K swaps the key", ({ key }) => {
  key("k");
  const p = pendingSwap;
  pendingSwap = false;
  return { pass: p, info: p };
});
V.test("space toggles the tour", ({ key }) => {
  const a = auto;
  key(" ");
  const b = auto;
  key(" ");
  return { pass: a !== b, info: [a, b] };
});

V.run({ step, render, overlay, still: 4.0, idleAfter: 6 });
