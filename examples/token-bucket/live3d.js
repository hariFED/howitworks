// Page code for token-bucket-3d.html (an ES module). Inlined above it: K (kit/draft.mjs),
// L (kit/live.mjs), S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs)
// and SC (scene3d.mjs). The kit draws, frames, explodes and labels; this file re-turns the lathes
// (fewer segments, and the cutouts for the valve body's port and the cage's windows), runs the sheet's
// model with the sheet's tour, and poses everything from it: the level and its free surface, the ball
// float and arm turning about the pivot, the cam, plunger and diaphragm on the jet, the refill stream,
// the plug, rod and knob lifting for a dose, the dose float on its stop, and the overflow.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });
const T3 = V.THREE;
const rad = Math.PI / 180;

// ---------------------------------------------------------------- turned solids, re-turned
// As the pressure cooker does: every lathe is turned again with fewer segments (the kit's construction
// otherwise: one strip per profile edge, wound outward), and a lathe spec's `cutouts` [{ q: sub-profile,
// ranges: [[a0, a1] degrees] }] are removed: their strips are skipped over each range, the
// sub-profile's new edges become walls and the sub-profile itself closes each end. Parts that fit on
// one axis share one segment count, so their coincident faces coincide.
const segFor = (spec) => {
  const r = Math.max(...spec.loop.map(([q]) => q));
  if (r < 5.2) return 24;
  if (r > 30 && spec.axis === "x") return 96; // the ball float
  return spec.axis === "x" ? 48 : 72;
};
const norm360 = (a) => ((a % 360) + 360) % 360;
const kp = (p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
const signOf = (loop) => {
  let a = 0;
  for (let i = 0; i < loop.length; i++) {
    const [r0, s0] = loop[i];
    const [r1, s1] = loop[(i + 1) % loop.length];
    a += r0 * s1 - r1 * s0;
  }
  return a > 0 ? 1 : -1;
};
function turn(loop, seg, cutouts = []) {
  const pos = [];
  const nor = [];
  const idx = [];
  const v3 = (i) => new T3.Vector3(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]);
  const tri = (a, b, c, want) => {
    const cr = v3(b).sub(v3(a)).cross(v3(c).sub(v3(a)));
    if (cr.lengthSq() < 1e-12) return;
    if (cr.dot(want) >= 0) idx.push(a, b, c);
    else idx.push(a, c, b);
  };
  const vert = (r, s, t, n) => {
    pos.push(r * Math.cos(t), s, -r * Math.sin(t));
    nor.push(...n);
    return pos.length / 3 - 1;
  };
  const strip = ([r0, s0], [r1, s1], nr, ns, ta, tb) => {
    const N = (t) => [nr * Math.cos(t), ns, -nr * Math.sin(t)];
    const a = vert(r0, s0, ta, N(ta));
    const b = vert(r1, s1, ta, N(ta));
    const c = vert(r0, s0, tb, N(tb));
    const d = vert(r1, s1, tb, N(tb));
    const want = new T3.Vector3(...N((ta + tb) / 2));
    tri(a, b, d, want);
    tri(a, d, c, want);
  };
  const grid = new Set([360]);
  for (let j = 0; j < seg; j++) grid.add((j * 360) / seg);
  for (const c of cutouts) for (const [a0, a1] of c.ranges) grid.add(norm360(a0)).add(norm360(a1));
  const ts = [...grid].sort((a, b) => a - b).filter((t, i, all) => i === 0 || t - all[i - 1] > 1e-7);
  const within = (t, [a0, a1]) => norm360(t - a0) < a1 - a0;
  const cut = cutouts.map((c) => {
    const edges = new Set();
    c.q.forEach((p, i) => {
      const q = c.q[(i + 1) % c.q.length];
      edges.add(kp(p) + "|" + kp(q)).add(kp(q) + "|" + kp(p));
    });
    return { ...c, edges };
  });
  const loopEdges = new Set();
  const sign = signOf(loop);
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i];
    const q = loop[(i + 1) % loop.length];
    loopEdges.add(kp(p) + "|" + kp(q)).add(kp(q) + "|" + kp(p));
    if (p[0] === 0 && q[0] === 0) continue;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 1e-9) continue;
    const skip = cut.filter((c) => c.edges.has(kp(p) + "|" + kp(q)));
    for (let j = 0; j + 1 < ts.length; j++) {
      const tm = (ts[j] + ts[j + 1]) / 2;
      if (skip.some((c) => c.ranges.some((r) => within(tm, r)))) continue;
      strip(p, q, (sign * (q[1] - p[1])) / len, (-sign * (q[0] - p[0])) / len, ts[j] * rad, ts[j + 1] * rad);
    }
  }
  for (const c of cut) {
    const sq = signOf(c.q);
    c.q.forEach((p, i) => {
      const q = c.q[(i + 1) % c.q.length];
      if (loopEdges.has(kp(p) + "|" + kp(q))) return;
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      for (let j = 0; j + 1 < ts.length; j++) {
        const tm = (ts[j] + ts[j + 1]) / 2;
        if (c.ranges.some((r) => within(tm, r))) strip(p, q, (-sq * (q[1] - p[1])) / len, (sq * (q[0] - p[0])) / len, ts[j] * rad, ts[j + 1] * rad);
      }
    });
    const tris = T3.ShapeUtils.triangulateShape(c.q.map(([r, s]) => new T3.Vector2(r, s)), []);
    for (const [a0, a1] of c.ranges) {
      for (const [t, n] of [[a0 * rad, [-Math.sin(a0 * rad), 0, -Math.cos(a0 * rad)]], [a1 * rad, [Math.sin(a1 * rad), 0, Math.cos(a1 * rad)]]]) {
        const ids = c.q.map(([r, s]) => vert(r, s, t, n));
        for (const [i, j, k] of tris) tri(ids[i], ids[j], ids[k], new T3.Vector3(...n));
      }
    }
  }
  const geo = new T3.BufferGeometry();
  geo.setAttribute("position", new T3.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new T3.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}
function axisM(axis, [a, b]) {
  const m = new T3.Matrix4();
  if (axis === "x") m.makeRotationZ(-Math.PI / 2).setPosition(0, a, b);
  else if (axis === "z") m.makeRotationX(Math.PI / 2).setPosition(a, b, 0);
  else m.makeTranslation(a, 0, b);
  return m;
}
const turned = (spec, loop = spec.loop) => turn(loop, segFor(spec), spec.cutouts ?? []).applyMatrix4(axisM(spec.axis, spec.at));
function setGeo(h, geo) {
  h.mesh.geometry.dispose();
  h.mesh.geometry = geo;
  if (h.lines) {
    h.lines.geometry.dispose();
    h.lines.geometry = new T3.EdgesGeometry(geo, 35);
  }
}
for (const p of SC.parts()) for (const h of V.part(p.id).holders) if (h.spec.kind === "lathe") setGeo(h, turned(h.spec));
const FL = {};
const FLUID_MESHES = [];
V.world.traverse((o) => o.isMesh && o.material?.userData?.role === "fluid" && FLUID_MESHES.push(o));
SC.fluids().forEach((f, i) => {
  FL[f.name] = FLUID_MESHES[i];
  if (f.kind !== "lathe") return;
  FLUID_MESHES[i].geometry.dispose();
  FLUID_MESHES[i].geometry = turned(f);
});
const streamSpec = SC.fluids().find((f) => f.name === "stream");

// ---------------------------------------------------------------- the free surface and the waterline
// The fluids show the water on the cut; the surface it stands at is a sheet of the accent at the
// level, behind the plane, and a waterline round the walls and along the cut. Both are drawn in the
// colour pass only (the kit hides `crease` objects from its id pass), never over a cut face, and are
// rebuilt when the level moves.
const shared = V.part(1).holders[0].mesh.material.uniforms; // the kit's uniforms, shared by reference
const SURF_VERT = `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SURF_FRAG = `uniform sampler2D tIds; uniform vec2 uRes; uniform vec3 uAccent; uniform float uAlpha; varying vec3 vW;
void main() {
  if (vW.z > 0.02) discard;
  if (texture2D(tIds, gl_FragCoord.xy / uRes).g > 0.5) discard;
  gl_FragColor = vec4(uAccent, uAlpha);
}`;
const surfMat = (alpha) =>
  new T3.ShaderMaterial({
    uniforms: { tIds: shared.tIds, uRes: shared.uRes, uAccent: shared.uAccent, uAlpha: { value: alpha } },
    vertexShader: SURF_VERT,
    fragmentShader: SURF_FRAG,
    transparent: true,
    depthWrite: false,
    side: T3.DoubleSide,
  });
const surface = new T3.Mesh(new T3.BufferGeometry(), surfMat(0.16));
const waterline = new T3.LineSegments(new T3.BufferGeometry(), surfMat(1));
for (const o of [surface, waterline]) {
  o.userData.crease = true;
  o.frustumCulled = false;
  o.renderOrder = 3;
  V.world.add(o);
}
const circ = (cx, cy, r, n = 48, hole = false) => {
  const pts = Array.from({ length: n }, (_, i) => new T3.Vector2(cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)));
  return hole ? new T3.Path(pts.reverse()) : new T3.Shape(pts);
};
function buildSurface(Lv, ball, dF) {
  const X = P.IN - 0.3;
  const Z = M.IN_W / 2 - 0.3;
  // in the shape's (x, y), y is the world z
  const sheet = new T3.Shape([new T3.Vector2(-X, -Z), new T3.Vector2(X, -Z), new T3.Vector2(X, Z), new T3.Vector2(-X, Z)]);
  const shapes = [sheet];
  const gaps = [[P.UF - 14, P.UF + 14]]; // the overflow tube is dry inside
  // the dose float, hollow and dry, where the surface crosses it
  if (Lv > dF + 0.5 && Lv < dF + M.FLOAT_H - 0.5) {
    sheet.holes.push(circ(P.UF, 0, 46.05, 72, true));
    const ring = circ(P.UF, 0, 35.95, 72);
    ring.holes.push(circ(P.UF, 0, 16.05, 48, true));
    shapes.push(ring);
  } else sheet.holes.push(circ(P.UF, 0, 16.05, 48, true));
  // the ball float, hollow: the surface stops at its shell
  const dy = Lv - ball[1];
  if (Math.abs(dy) < M.BALL_D / 2 - 0.5) {
    const rho = Math.sqrt((M.BALL_D / 2) ** 2 - dy * dy);
    sheet.holes.push(circ(ball[0], 0, rho - 0.05, 56, true));
    gaps.push([ball[0] - rho, ball[0] + rho]);
  }
  const g = new T3.ShapeGeometry(shapes, 1);
  g.rotateX(Math.PI / 2);
  g.translate(0, Lv, 0);
  surface.geometry.dispose();
  surface.geometry = g;
  // the waterline: round the back wall and the ends, and along the cut where there is water
  const segs = [[-X, -Z, X, -Z], [-X, -Z, -X, 0], [X, -Z, X, 0]];
  let x0 = -P.IN;
  for (const [a, b] of gaps.sort((p, q) => p[0] - q[0])) {
    if (a > x0) segs.push([x0, 0, a, 0]);
    x0 = Math.max(x0, b);
  }
  if (x0 < P.IN) segs.push([x0, 0, P.IN, 0]);
  const pos = [];
  for (const [xa, za, xb, zb] of segs) pos.push(xa, Lv, za, xb, Lv, zb);
  waterline.geometry.dispose();
  waterline.geometry = new T3.BufferGeometry().setAttribute("position", new T3.Float32BufferAttribute(pos, 3));
}

// ---------------------------------------------------------------- state: the 2D sheet's, from the same model
const tank = M.tank();
let lift = 0; // plug, rod and knob off the seat, mm (follows the model's open valve)
let ct = 0; // the sheet's chart clock, model seconds, wraps every T_MAX
let lastReq = null; // { at, ok }: the last request, for its tag at the knob

// The sheet's tour (live.js), in model seconds: a burst that empties the bucket and gets refused,
// single requests slower than the refill rate (all accepted), a second burst, then a quiet refill to
// capacity. The sheet's chart runs T_MAX model seconds; the tour wraps with it.
const TOUR = [4, 5.5, 7, 8.5, 10, 11.5, 20, 21.5, 32, 44, 56, 62, 63.5, 65, 66.5];
const T_MAX = 120;

function send() {
  const ok = M.request(tank);
  lastReq = { at: ct, ok };
  return ok;
}
function refill() {
  tank.L = M.L_FULL;
  tank.pending = 0;
}

function step(dt, live) {
  const T = dt * M.SPEED; // model seconds this frame
  const n = Math.max(1, Math.ceil(T * 240));
  const h = T / n;
  for (let i = 0; i < n; i++) {
    const c0 = ct;
    ct += h;
    if (live.touring) for (const t of TOUR) if (t > c0 && t <= ct) send();
    if (ct >= T_MAX) {
      ct -= T_MAX;
      lastReq = null;
      if (live.touring) tank.held = false;
    }
    M.advance(tank, h);
    lift = live.reduced ? (tank.pending > 0 ? M.LIFT : 0) : L.follow(lift, tank.pending > 0 ? M.LIFT : 0, 14, h);
  }
  return tank.pending > 0 || tank.qin > 1e-6 || tank.qover > 1e-6 || Math.abs(lift - (tank.pending > 0 ? M.LIFT : 0)) > 0.01 || (!!lastReq && ct - lastReq.at < 6);
}

// ---------------------------------------------------------------- poses from the model
const PLUG = [19, 20, 23, 24, 26];
function pose(Lv, held, up) {
  const gap = held ? M.GAP_MAX : M.GAP_MAX * M.open(Lv);
  const deg = P.armAngle(Lv, held);
  V.set(11, { rot: [0, 0, deg * rad] });
  V.set(12, { rot: [0, 0, deg * rad] });
  V.set(9, { pos: [gap, 0, 0] });
  for (const id of PLUG) V.set(id, { pos: [0, up, 0] });
  V.set(21, { pos: [0, M.dFloat(Lv), 0] });
  return { gap, deg };
}
// frame the whole travel: full and shut, empty with the plug up and the float held down
V.frame([() => pose(M.L_FULL, false, 0), () => pose(M.L0, true, M.LIFT)]);

let shown = { gap: -1, L: -1, ball: -1 };
const say = L.announcer($("sr"), 2);
function render(live) {
  const Lv = tank.L;
  const { gap, deg } = pose(Lv, tank.held, lift);
  if (Math.abs(gap - shown.gap) > 0.003) {
    const h = V.part(7).live.diaphragm;
    setGeo(h, turned(h.spec, SC.diaphragmLoop(gap)));
    shown.gap = gap;
  }
  const ball = P.ballCentre(deg);
  const dF = M.dFloat(Lv);
  if (Math.abs(Lv - shown.L) > 0.02 || Math.abs(ball[0] - shown.ball) > 0.02) {
    buildSurface(Lv, ball, dF);
    FL.stream.geometry.dispose();
    FL.stream.geometry = turned(streamSpec, SC.streamLoop(Lv));
    shown.L = Lv;
    shown.ball = ball[0];
  }
  const on = V.cut && V.explode < 0.01;
  surface.material.visible = waterline.material.visible = on;
  // the water: the tank to the level; mains always in the shank; the chamber, port and stream while
  // the jet runs; the outlet while a dose drains or the tube overflows; the tube's bore when it does
  const fill = Math.min(1, tank.qin / M.Q_FILL);
  const flowing = tank.qout > 1e-4;
  const over = tank.qover > 1e-5;
  V.fluid("tank", { density: 0.5, wash: 0.07, stretch: Lv - 1 });
  V.fluid("inlet", { density: 0.62, wash: 0 });
  for (const f of ["chamber", "port", "stream"]) V.fluid(f, { density: 0.62 * fill, wash: 0, visible: fill > 0.01 });
  V.fluid("outlet", { density: 0.55, wash: 0, visible: flowing || over });
  V.fluid("tube", { density: 0.55, wash: 0, visible: over, offset: [0, lift, 0] });

  const tok = Math.max(0, M.tokens(Lv));
  $("readout").textContent = `t ${Math.floor(ct)} s · L ${Math.round(Lv)} mm · ${tok.toFixed(1)} TOKENS · IN ${tank.qin.toFixed(3)} L/s · OK ${tank.accepted} · REFUSED ${tank.refused}${tank.held ? " · FLOAT HELD" : ""}`;
  say(`Level ${Math.round(Lv)} millimetres, ${tok.toFixed(1)} tokens. ${tank.accepted} requests accepted, ${tank.refused} refused.${tank.last ? " Last request " + tank.last.toLowerCase() + "." : ""}`, live.clock);
  $("hold")?.setAttribute("aria-pressed", String(tank.held));
}

// The token scale moulded inside the left wall (the sheet's tokenMarks), the live level, and a tag at
// the knob for the last request: accepted (one token goes) or refused (less than one token left).
function overlay() {
  if (V.explode > 0.05 || !V.cut) return "";
  const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  let ticks = "";
  let nums = "";
  for (let n = 0; n <= M.CAP; n++) {
    const v = M.levelOf(n);
    ticks += `M${f(V.project([-P.IN, v, 0]))}L${f(V.project([-P.IN, v, -12]))}`;
    const [x, y] = V.project([-P.IN, v, -18]);
    nums += `<text class="t" x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle">${n}</text>`;
  }
  let out = `<path class="thin" d="${ticks}"/>${nums}`;
  out += V.dim([-118, 0, 0], [-118, tank.L, 0], { text: `L=${Math.round(tank.L)}`, off: 18 });
  if (lastReq && ct - lastReq.at < 6) {
    const [x, y] = V.project([P.UF - 14, P.KNOB_V + 14 + lift, 0]);
    const text = lastReq.ok ? "PULL · 1 TOKEN OUT" : "REFUSED · < 1 TOKEN";
    out += `<g class="${lastReq.ok ? "tag-ok" : "tag-no"}"><path class="thin" d="M${f([x, y])}l-14 -14h-8"/><text class="t" x="${(x - 25).toFixed(1)}" y="${(y - 10.5).toFixed(1)}" text-anchor="end">${text}</text></g>`;
  }
  return out;
}

// ---------------------------------------------------------------- the cistern's controls
// pull the knob (drag it up, or click it): one request, as on the sheet
let sent = false;
V.drag([26, 24], {
  axis: [0, 1, 0],
  length: M.LIFT,
  start: () => {
    sent = false;
    return 0;
  },
  move: (v) => {
    if (!sent && v > 0.25) {
      sent = true;
      send();
    }
  },
  end: () => {
    if (!sent) send();
    sent = true;
  },
});
V.key(" ", () => send());
V.key("Enter", () => send());
V.key("h", () => (tank.held = !tank.held));
V.key("r", refill);
$("pull")?.addEventListener("click", () => {
  send();
  V.input();
});
$("hold")?.addEventListener("click", () => {
  tank.held = !tank.held;
  V.input();
});

V.test("knob pull sends a request", ({ ptr, project }) => {
  const g = project([P.UF - 8, P.KNOB_V + 12 + lift, -8]);
  const n0 = tank.accepted + tank.refused;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] - 60);
  ptr("pointerup", g[0], g[1] - 60);
  const n1 = tank.accepted + tank.refused;
  return { pass: n1 === n0 + 1, info: [n0, n1] };
});
V.test("space sends a request", ({ key }) => {
  const n0 = tank.accepted + tank.refused;
  key(" ");
  return { pass: tank.accepted + tank.refused === n0 + 1, info: [n0, tank.last] };
});
V.test("H holds the float down", ({ key }) => {
  const a = tank.held;
  key("h");
  const b = tank.held;
  key("h");
  return { pass: a !== b && tank.held === a, info: [a, b] };
});

V.run({ step, render, overlay, still: 3, idleAfter: 6 });
