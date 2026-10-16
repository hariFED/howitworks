// Page code for debounce-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs), X (extra.mjs)
// and SC (scene3d.mjs). The kit draws, frames, explodes and labels; this file runs the sheet's model
// with the sheet's tour (three quick pushes, quiet, the damped close and the latch), turns the door
// and everything on it about the hinge, strokes the piston, turns the pinion and the arm, swings the
// forearm on its shoe, lifts the check ball, places the oil and sets its density from its pressure,
// and draws the oil's path through the two needle valves.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });
const rad = Math.PI / 180;

// ---------------------------------------------------------------- lighter lathes (the triangle budget)
// The kit turns a lathe with 96–144 segments; turned again here with fewer (the kit's construction:
// one strip per profile edge, wound outward).
const segFor = (r) => (r > 15 ? 64 : r > 6 ? 40 : 24);
function turn(loop, seg) {
  let area = 0;
  for (let i = 0; i < loop.length; i++) {
    const [r0, s0] = loop[i];
    const [r1, s1] = loop[(i + 1) % loop.length];
    area += r0 * s1 - r1 * s0;
  }
  const sign = area > 0 ? 1 : -1;
  const pos = [];
  const nor = [];
  const idx = [];
  const P3 = (i) => new THREE.Vector3(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]);
  for (let i = 0; i < loop.length; i++) {
    const [r0, s0] = loop[i];
    const [r1, s1] = loop[(i + 1) % loop.length];
    if (r0 === 0 && r1 === 0) continue;
    const len = Math.hypot(r1 - r0, s1 - s0);
    if (len < 1e-9) continue;
    const nr = (sign * (s1 - s0)) / len;
    const ns = (-sign * (r1 - r0)) / len;
    const base = pos.length / 3;
    for (let j = 0; j <= seg; j++) {
      const t = (j / seg) * Math.PI * 2;
      const c = Math.cos(t);
      const sn = Math.sin(t);
      pos.push(r0 * c, s0, -r0 * sn, r1 * c, s1, -r1 * sn);
      nor.push(nr * c, ns, -nr * sn, nr * c, ns, -nr * sn);
    }
    for (let j = 0; j < seg; j++) {
      const a = base + 2 * j;
      for (const [i0, i1, i2] of [[a, a + 1, a + 3], [a, a + 3, a + 2]]) {
        const p0 = P3(i0);
        const cr = P3(i1).sub(p0).cross(P3(i2).sub(p0));
        if (cr.lengthSq() < 1e-12) continue;
        const want = new THREE.Vector3(nor[3 * i0], nor[3 * i0 + 1], nor[3 * i0 + 2]);
        if (cr.dot(want) >= 0) idx.push(i0, i1, i2);
        else idx.push(i0, i2, i1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}
function axisM(axis, [a, b]) {
  const m = new THREE.Matrix4();
  if (axis === "x") m.makeRotationZ(-Math.PI / 2).setPosition(0, a, b);
  else if (axis === "z") m.makeRotationX(Math.PI / 2).setPosition(a, b, 0);
  else m.makeTranslation(a, 0, b);
  return m;
}
function setGeo(h, geo) {
  h.mesh.geometry.dispose();
  h.mesh.geometry = geo;
  if (h.lines) {
    h.lines.geometry.dispose();
    h.lines.geometry = new THREE.EdgesGeometry(geo, 35);
  }
}
const SPECS = SC.parts();
for (const p of SPECS)
  for (const h of V.part(p.id).holders)
    if (h.spec.kind === "lathe") setGeo(h, turn(h.spec.loop, segFor(Math.max(...h.spec.loop.map(([r]) => r)))).applyMatrix4(axisM(h.spec.axis, h.spec.at)));

// the spring: a smooth wire (12 sides, no crease lines along it), 36 segments a turn
{
  const sp = SC.SPRING;
  class Helix extends THREE.Curve {
    getPoint(t, out = new THREE.Vector3()) {
      const a = 2 * Math.PI * sp.turns * t;
      return out.set(sp.radius * Math.sin(a), sp.from + sp.wire / 2 + t * (sp.to - sp.from - sp.wire), sp.radius * Math.cos(a));
    }
  }
  const h = V.part(7).holders[0];
  h.mesh.geometry.dispose();
  h.mesh.geometry = new THREE.TubeGeometry(new Helix(), Math.round(sp.turns * 36), sp.wire / 2, 12, false).applyMatrix4(axisM("x", [0, 0]));
  h.lines.parent.remove(h.lines);
}

// ---------------------------------------------------------------- the linkage stays uncut
// The arm, forearm, shoe, screw, rivet, frame head and the spindle's top square lie above the cut
// plane. Their cutting plane is pushed far away (the kit sets uShift from the explode offset each
// frame; this keeps that offset and adds the push), so the cutaway is the body's alone.
function uncut(h) {
  for (const m of [h.mesh.material, h.lines?.material]) {
    if (!m) continue;
    const v = m.uniforms.uShift.value;
    v.set = function (x, y, z) {
      return THREE.Vector3.prototype.set.call(this, x, y, z + 1e5);
    };
    v.set(0, 0, 0);
  }
}
for (const id of [16, 17, 18, 19, 20, "F"]) for (const h of V.part(id).holders) uncut(h);
for (const h of V.part(8).holders) if (h.spec.live === "square" || h.spec.live === "journal") uncut(h);

// ---------------------------------------------------------------- state: the 2D sheet's, from the same model
const s = M.door();
let hand = null; // the angle a hand holds the door at, or null
let push = null; // a push in progress: { phase: "open" | "hold", t }
let dragging = false;
let lift = 0; // check ball off its seat, mm
let offS = 0; // oil volume through each needle, for the moving dashes
let offL = 0;
let quiet = 0;
let held = false;

// The tour, the sheet's: three quick pushes 2.4 s apart, then quiet; the door shuts, waits, repeats.
const PERIOD = 15;
const PUSHES = [0.5, 2.9, 5.3];
let tourT = 0;
let wasTouring = true;

function startPush() {
  push = { phase: "open", t: 0 };
  quiet = 0;
}
function shutNow() {
  s.theta = 0;
  M.advance(s, 1e-3, null);
  push = null;
  hand = null;
}

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  if (live.touring && !wasTouring) tourT = 0;
  wasTouring = live.touring;
  for (let i = 0; i < n; i++) {
    if (live.touring && !dragging) {
      const before = tourT;
      tourT += h;
      if (tourT >= PERIOD) tourT -= PERIOD;
      for (const tp of PUSHES) if (before < tp && tourT >= tp) startPush();
    }
    if (push) {
      push.t += h;
      if (push.phase === "open" && s.theta >= M.PUSH_TO - 0.05) push = { phase: "hold", t: 0 };
      else if (push.phase === "hold" && push.t > 0.25) push = null;
    }
    const want = dragging ? hand : push ? M.PUSH_TO : null;
    M.advance(s, h, want);
    held = want != null;
    if (held) quiet = 0;
    else quiet += h;
    lift = L.follow(lift, s.opening > 1 ? Math.min(1, s.opening / 120) : 0, s.opening > 1 ? 50 : 25, h);
    offS += s.q.sweep * h;
    offL += s.q.latch * h;
  }
  return held || s.theta > 0 || lift > 1e-3;
}

// ---------------------------------------------------------------- poses from the model
const [hx, hy] = SC.HINGE;
let rc = 1;
let rs = 0;
const rot = ([x, y]) => [rc * x - rs * y, rs * x + rc * y];
// a body-frame point (door shut) to the world, the door at θ
const toWorld = ([x, y], z = 0) => {
  const [a, b] = rot([x - hx, y - hy]);
  return [hx + a, hy + b, z];
};
// a part riding on the door: translated t in the body frame, turned `own` about the origin (the spindle)
function place(id, t = [0, 0], own = 0, ang = 0) {
  const [x, y] = toWorld(t);
  V.set(id, { pos: [x, y, 0], rot: [0, 0, ang + own] });
}
const DOOR = [1, 2, 3, 4, 11, 12, 13, 14, 21, 22, 23];
const PISTON = [5, 6, 10];
// explode vectors in the body frame: turned with the door
const EXP = new Map();
for (const p of SPECS) {
  const rec = V.part(p.id);
  EXP.set(p.id, { part: rec.spec.explode, solids: rec.holders.map((h) => h.spec.explode) });
}
const turnV = (v) => (v ? [...rot(v), v[2]] : v);
function turnExplode(id) {
  const rec = V.part(id);
  const e = EXP.get(id);
  rec.spec.explode = Array.isArray(e.part) ? turnV(e.part) : e.part;
  rec.holders.forEach((h, k) => {
    if (e.solids[k]) h.spec.explode = turnV(e.solids[k]);
  });
}
const E0 = SC.E0;
const SH = SC.SHOE_W;
const ang0 = Math.atan2(E0[1] - SH[1], E0[0] - SH[0]);
function pose(theta, x = M.xOf(theta), ballLift = 0) {
  const ang = -theta * rad;
  rc = Math.cos(ang);
  rs = Math.sin(ang);
  const phi = M.phi(theta) * rad;
  for (const id of DOOR) place(id, [0, 0], 0, ang);
  for (const id of PISTON) place(id, [-x, 0], 0, ang);
  place(9, [-x + ballLift, 0], 0, ang);
  place(7, [0, 0], 0, ang);
  V.solid(7, "spring").scale.x = (SC.LENGTHS.low - x) / SC.LENGTHS.low;
  place(8, [0, 0], phi, ang);
  place(16, [0, 0], phi, ang);
  place(19, [0, 0], phi, ang);
  for (const id of [...DOOR, ...PISTON, 9, 7, 8, 16, 19]) turnExplode(id);
  const E = SC.planToWorld(M.link(theta).E);
  V.set(20, { pos: [E[0] - E0[0], E[1] - E0[1], 0] });
  V.set(17, { rot: [0, 0, Math.atan2(E[1] - SH[1], E[0] - SH[0]) - ang0] });
  // the oil: each volume in its frame (fixed in the body, riding with the piston, or a chamber
  // scaled along the axis from its fixed end), then turned with the door
  for (const [i, f] of SC.FLUIDS.entries()) {
    const m = OIL[i];
    let o = f.at;
    let sx = 1;
    if (f.frame === "piston") o = [-x, 0];
    if (f.frame === "low") sx = (SC.LENGTHS.low - x) / SC.LENGTHS.low;
    if (f.frame === "high") sx = (SC.LENGTHS.high + x) / SC.LENGTHS.high;
    const w = toWorld(o);
    m.position.set(w[0], w[1], 0);
    m.rotation.set(0, 0, ang);
    m.scale.set(sx, 1, 1);
  }
}
const OIL = [];
V.world.traverse((o) => o.isMesh && o.material?.userData?.role === "fluid" && OIL.push(o));
V.frame([() => pose(0), () => pose(M.PUSH_TO)]); // frame the swing, so the zoom never pumps

// the oil's density follows its pressure, as the sheet's tint does
const pMax = M.pressure(M.X_MAX);
const say = L.announcer($("sr"), 2.5);
function render(live) {
  pose(s.theta, s.x, lift);
  const dHi = 0.32 + 0.68 * Math.min(1, s.p / pMax);
  for (const f of SC.FLUIDS) {
    const d = f.group === "hi" && s.p > 0 ? dHi : 0.32;
    V.fluid(f.name, { density: d, wash: 0.1 + 0.2 * d });
  }
  const left = M.closeTime(s.theta);
  const state = held ? "HELD" : s.theta > 0.05 ? (s.x < M.FACE_R - M.SWEEP_U + M.PORT_D / 2 ? "LATCH" : "SWEEP") : "SHUT";
  $("readout").textContent =
    s.theta > 0.05
      ? `θ ${Math.round(s.theta)}° · x ${s.x.toFixed(1)} mm · p ${(s.p * 10).toFixed(1)} bar · Q ${(s.q.total / 1000).toFixed(1)} cm³/s · ${state} · SHUT IN ${held ? "—" : left.toFixed(1) + " s"}`
      : `SHUT · QUIET ${Math.min(99, quiet).toFixed(1)} s · SPRING ${Math.round(M.springForce(0))} N · ${Math.round(M.doorMoment(0))} N·m`;
  say(s.theta > 0 ? `Door at ${Math.round(s.theta)} degrees, ${held ? "held open" : `shuts in ${left.toFixed(1)} seconds`}.` : "Door shut.", live.clock);
}

// ---------------------------------------------------------------- overlay: the door angle, the oil's path
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
const qMax = M.flow(M.X_MAX);
const ARC_R = SC.DOOR_A + 50;
function overlay() {
  if (V.explode > 0.05) return "";
  let out = "";
  // θ: the live angular dimension at the leaf's free edge, from the shut position to the door
  if (s.theta > 0.5) {
    const at = (a, r) => V.project([hx + r * Math.cos(a), hy + r * Math.sin(a), 0]);
    const a1 = Math.PI;
    const a0 = Math.PI - s.theta * rad;
    const n = Math.max(2, Math.ceil(s.theta / 3));
    const arc = [];
    for (let i = 0; i <= n; i++) arc.push(at(a0 + ((a1 - a0) * i) / n, ARC_R));
    const ext = (a) => {
      const p = at(a, SC.DOOR_A + 6);
      const q = at(a, ARC_R + 8);
      return `M${f1(p[0])} ${f1(p[1])}L${f1(q[0])} ${f1(q[1])}`;
    };
    out += `<g data-role="dim"><path class="thin" d="${ext(a0)}${ext(a1)}M${arc.map((p) => `${f1(p[0])} ${f1(p[1])}`).join("L")}"/>`;
    if (arc.length > 1 && Math.hypot(arc[0][0] - arc[n][0], arc[0][1] - arc[n][1]) > 18) out += `<path class="head" d="${arrowHead(arc[1], arc[0])}${arrowHead(arc[n - 1], arc[n])}"/>`;
    const tp = at((a0 + a1) / 2, ARC_R + 26);
    out += `<text class="t" x="${f1(tp[0])}" y="${f1(tp[1] + 3)}" text-anchor="middle">θ=${Math.round(s.theta)}°</text></g>`;
  }
  // the oil's way through each needle, on the cutting plane: only while the plane faces the reader
  V.camera.getWorldDirection(look);
  if (!V.cut || look.z > -0.05) return out;
  // (the sheet's paths, from the pressure chamber down the port, past the needle and into the
  // gallery; the long run back along the gallery is left to the stippled oil, as the arm crosses it)
  for (const [pts, q, qm, off] of [[P.flowSweep(s.x).slice(0, 8), s.q.sweep, qMax.sweep, offS], [P.flowLatch().slice(0, 8), s.q.latch, qMax.latch, offL]]) {
    const k = Math.min(1, q / (0.6 * qm));
    if (k < 0.02) continue;
    const sc = pts.map((p) => V.project(toWorld(p, 0.4)));
    out += `<path class="flow" stroke-opacity="${f1(0.3 + 0.7 * k)}" stroke-dashoffset="${f1(-(off * 0.012) % 8.5)}" d="M${sc.map((p) => `${f1(p[0])} ${f1(p[1])}`).join("L")}"/>`;
    out += `<path class="flow-head" fill-opacity="${f1(0.3 + 0.7 * k)}" d="${arrowHead(sc[sc.length - 2], sc[sc.length - 1])}"/>`;
  }
  return out;
}

// ---------------------------------------------------------------- the closer's controls, as on the sheet
// drag the door: the value is θ/90°; the leaf's middle moves along its normal as it opens
const DRAG_R = 400;
const dragAxis = [0, 1, 0];
V.drag([21], {
  axis: dragAxis,
  length: (DRAG_R * Math.PI) / 2,
  start: () => {
    dragging = true;
    push = null;
    hand = s.theta;
    return s.theta / 90;
  },
  move: (v) => (hand = Math.min(M.THETA_MAX, Math.max(0, v * 90))),
  end: () => {
    dragging = false;
    hand = null;
  },
});
const pushNow = () => startPush();
V.key(" ", pushNow);
V.key("Enter", pushNow);
V.key("r", shutNow);
$("push")?.addEventListener("click", () => {
  startPush();
  V.input();
});
// keep the drag axis on the leaf's normal as the door turns
const keepAxis = () => {
  const n = rot([0, 1]);
  dragAxis[0] = n[0];
  dragAxis[1] = n[1];
};

// the page's own self-tests (?selftest=1)
V.test("space pushes the door", ({ key }) => {
  push = null;
  key(" ");
  const ok = push != null;
  push = null;
  return { pass: ok, info: ok };
});
V.test("door drag opens it", ({ ptr, project }) => {
  keepAxis();
  const a = toWorld([hx - 450, hy - 22], 0);
  const b = toWorld([hx - 450, hy + 78], 0);
  const p = project(a);
  const q = project(b);
  ptr("pointerdown", p[0], p[1]);
  ptr("pointermove", p[0] + (q[0] - p[0]) * 1.2, p[1] + (q[1] - p[1]) * 1.2);
  const h1 = hand;
  ptr("pointerup", p[0] + (q[0] - p[0]) * 1.2, p[1] + (q[1] - p[1]) * 1.2);
  return { pass: h1 != null && h1 > 5, info: [s.theta, h1] };
});
V.test("R shuts the door", ({ key }) => {
  s.theta = 40;
  key("r");
  return { pass: s.theta === 0, info: s.theta };
});

V.run({
  step: (dt, live) => {
    const busy = step(dt, live);
    keepAxis();
    return busy;
  },
  render,
  overlay,
  still: 6.4,
  idleAfter: 8,
});
