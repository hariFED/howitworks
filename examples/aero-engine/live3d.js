// Page code for aero-engine-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit draws, frames, explodes and labels; this file runs the sheet's cycle (the same tour, the same
// controls), turns the crank, its gears and the camshaft, slides the four pistons in opposed pairs,
// swings the rods, lifts the eight valves through tappets, pushrods and rockers, and shows each
// cylinder's charge: fresh or burned, its stipple following that cylinder's pressure.
//
// The scene is the sheet's plan mirrored through its section plane (scene3d.mjs): a true-space angle
// about y turns the other way here (FZ), and a true-space z is FZ * z.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene(), start: { zoom: 1.12, az: 12 } });
const rad = Math.PI / 180;
const FZ = SC.FZ;

// ---------------------------------------------------------------- geometry
// A closed body of revolution, one strip per profile edge (the kit's construction), on any frame:
// origin O, axis D, radial basis U1, U2, over th0..th1. Wound outward.
function latheGeo(loop, seg, O, D, U1, U2, th0 = 0, th1 = 2 * Math.PI) {
  const n = loop.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += loop[i][0] * loop[(i + 1) % n][1] - loop[(i + 1) % n][0] * loop[i][1];
  const sign = area > 0 ? 1 : -1;
  const pos = [];
  const nor = [];
  const idx = [];
  const P3 = (r, s, t) => {
    const c = Math.cos(t) * r;
    const sn = Math.sin(t) * r;
    return [O[0] + s * D[0] + c * U1[0] + sn * U2[0], O[1] + s * D[1] + c * U1[1] + sn * U2[1], O[2] + s * D[2] + c * U1[2] + sn * U2[2]];
  };
  for (let i = 0; i < n; i++) {
    const [r0, s0] = loop[i];
    const [r1, s1] = loop[(i + 1) % n];
    if (r0 === 0 && r1 === 0) continue;
    const len = Math.hypot(r1 - r0, s1 - s0);
    if (len < 1e-9) continue;
    const nr = (sign * (s1 - s0)) / len;
    const ns = (-sign * (r1 - r0)) / len;
    const base = pos.length / 3;
    for (let j = 0; j <= seg; j++) {
      const t = th0 + ((th1 - th0) * j) / seg;
      const rd = [Math.cos(t) * U1[0] + Math.sin(t) * U2[0], Math.cos(t) * U1[1] + Math.sin(t) * U2[1], Math.cos(t) * U1[2] + Math.sin(t) * U2[2]];
      const nv = [nr * rd[0] + ns * D[0], nr * rd[1] + ns * D[1], nr * rd[2] + ns * D[2]];
      pos.push(...P3(r0, s0, t), ...P3(r1, s1, t));
      nor.push(...nv, ...nv);
    }
    for (let j = 0; j < seg; j++) {
      const a = base + 2 * j;
      for (const [i0, i1, i2] of [[a, a + 1, a + 3], [a, a + 3, a + 2]]) {
        const p = (k) => new THREE.Vector3(pos[3 * k], pos[3 * k + 1], pos[3 * k + 2]);
        const cr = p(i1).sub(p(i0)).cross(p(i2).sub(p(i0)));
        if (cr.lengthSq() < 1e-12) continue;
        if (cr.dot(new THREE.Vector3(nor[3 * i0], nor[3 * i0 + 1], nor[3 * i0 + 2])) >= 0) idx.push(i0, i1, i2);
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
// a kit lathe spec (axis x, y or z through `at`), turned with segOf segments; half: only the kept side
// of the section plane (z <= 0), a little past it, which is all the open cut ever shows
const HALF_PAD = 6 * rad;
const UP = 1.5 * Math.PI; // straight up in the true engine: z < 0 here, on axis x or y
function kitLathe(s, half) {
  const [a, b] = s.at;
  const F = { x: [[0, a, b], [1, 0, 0], [0, 1, 0], [0, 0, 1]], y: [[a, 0, b], [0, 1, 0], [1, 0, 0], [0, 0, 1]], z: [[a, b, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]] }[s.axis];
  const seg = SC.segOf(Math.max(...s.loop.map(([r]) => r)));
  const turn = (t0, t1) => latheGeo(s.loop, Math.max(2, Math.ceil((seg * (t1 - t0)) / (2 * Math.PI))), ...F, t0, t1);
  const h = half && s.axis !== "z" && b === 0;
  if (s.gap) {
    const g = s.gap * rad;
    if (h) return concat([turn(Math.PI - HALF_PAD, UP - g), turn(UP + g, 2 * Math.PI + HALF_PAD)]);
    return turn(UP + g, UP - g + 2 * Math.PI);
  }
  if (h) return turn(Math.PI - HALF_PAD, 2 * Math.PI + HALF_PAD);
  return latheGeo(s.loop, seg, ...F);
}
// creases of a gapped lathe, less the open faces of its gap (they lie inside the rocker box)
function latheEdges(s, geo) {
  const e = edges(geo);
  if (!s.gap) return e;
  const [a, b] = s.at;
  const g = s.gap * rad;
  const p = e.attributes.position.array;
  const keep = [];
  const onGap = (i) => {
    const r = Math.hypot(p[i + 1] - a, p[i + 2] - b);
    if (r < 1e-3) return true;
    const t = Math.atan2(p[i + 2] - b, p[i + 1] - a);
    return Math.abs(Math.sin(t - (UP - g))) < 1e-3 || Math.abs(Math.sin(t - (UP + g))) < 1e-3;
  };
  for (let i = 0; i < p.length; i += 6) if (!(onGap(i) && onGap(i + 3))) keep.push(...p.slice(i, i + 6));
  return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(keep, 3));
}
const flat = (g) => (g.index ? g.toNonIndexed() : g);
function concat(geos) {
  const parts = geos.map(flat);
  const n = parts.reduce((t, g) => t + g.attributes.position.count, 0);
  const pos = new Float32Array(3 * n);
  const nor = new Float32Array(3 * n);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, 3 * o);
    nor.set(g.attributes.normal.array, 3 * o);
    o += g.attributes.position.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}
function concatLines(geos) {
  const arrs = geos.map((g) => g.attributes.position.array);
  const out = new Float32Array(arrs.reduce((t, a) => t + a.length, 0));
  let o = 0;
  for (const a of arrs) (out.set(a, o), (o += a.length));
  return new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(out, 3));
}
const edges = (g) => new THREE.EdgesGeometry(g, 35);
// a crease set hidden from the kit (which shows every crease after its id pass) must leave the graph
function showLines(h, on) {
  if (!h.lines) return;
  if (on && !h.lines.parent) h.inner.add(h.lines);
  if (!on && h.lines.parent) h.lines.parent.remove(h.lines);
}

// ---------------------------------------------------------------- lighter lathes, merged per bank
// Every lathe is turned again with segOf segments. The solids of a part that share a frame (the same
// pivot and explode: a bank's barrels, a bank's heads with their boxes and skins, one piston's rings)
// become one mesh, drawn by the first of them. Bodies that never turn about their own axis keep
// a half-turned variant for the open cut.
const HALVES = new Set([3, 6, 7, 8, 9, 10, 21, 27]);
const MERGED = []; // { h (the holder that draws), full, half, linesFull, linesHalf, hide: [holders] }
for (const p of SC.scene().parts) {
  const rec = V.part(p.id);
  const groups = new Map();
  for (const h of rec.holders) {
    const s = h.spec;
    if (s.role === "void" || s.standIn) continue;
    const key = `${s.grp ?? ""}|${JSON.stringify(s.explode ?? 0)}|${JSON.stringify(s.pivot ?? 0)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(h);
  }
  for (const list of groups.values()) {
    const build = (half) => {
      const geos = list.map((h) => (h.spec.kind === "lathe" ? kitLathe(h.spec, half) : h.mesh.geometry));
      const lines = list.map((h, i) => (h.spec.skin ? null : h.spec.kind === "lathe" ? latheEdges(h.spec, geos[i]) : edges(geos[i]))).filter(Boolean);
      return { geo: list.length > 1 || list[0].spec.kind === "lathe" ? concat(geos) : geos[0], lines: concatLines(lines) };
    };
    const full = build(false);
    const half = HALVES.has(p.id) ? build(true) : full;
    const [h, ...rest] = list;
    for (const r of rest) {
      r.mesh.visible = false;
      showLines(r, false);
    }
    MERGED.push({ id: p.id, h, full, half, rest });
  }
}
// the gas: turned the same way as the piston and the barrel bore
const GAS = [];
{
  const meshes = [];
  V.world.traverse((o) => o.isMesh && o.material?.userData?.role === "fluid" && meshes.push(o));
  SC.scene().fluids.forEach((f, i) => GAS.push({ mesh: meshes[i], full: kitLathe(f, false), half: kitLathe(f, true) }));
}

// ---------------------------------------------------------------- the valve train and the plugs, as compounds
// Each part is one mesh of pieces (scene3d.mjs vtPieces), built in its cylinder's A-A frame (a out
// along the cylinder, y, z up) and baked to the page every frame they move: x = side * a, z = FZ * z,
// plus the piece's explode. The kit's stand-in boxes stay hidden (framing, anchors, explode).
const A2 = (a, z) => [a, z];
function pieceGeo(pc) {
  if (pc.kind === "extrude") return S.geometryOf({ kind: "extrude", shape: pc.shape, holes: [], along: "y", from: pc.y0, to: pc.y1, bevel: 0 });
  if (pc.kind === "helix") {
    const o = pc.o;
    const d = pc.d;
    const u = [-d[1], d[0]];
    class Helix extends THREE.Curve {
      getPoint(t, out = new THREE.Vector3()) {
        const ph = 2 * Math.PI * pc.turns * t;
        const s = pc.from + pc.wire / 2 + t * (pc.to - pc.from - pc.wire);
        const c = pc.radius * Math.cos(ph);
        return out.set(o[0] + s * d[0] + c * u[0], pc.y + pc.radius * Math.sin(ph), o[1] + s * d[1] + c * u[1]);
      }
    }
    return new THREE.TubeGeometry(new Helix(), Math.round(pc.turns * 10), pc.wire / 2, 5, false);
  }
  if (pc.axisY) return latheGeo(pc.loop, pc.seg, [pc.o[0], pc.y, pc.o[1]], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const D = [pc.d[0], 0, pc.d[1]];
  return latheGeo(pc.loop, pc.seg, [pc.o[0], pc.y, pc.o[1]], D, [-pc.d[1], 0, pc.d[0]], [0, 1, 0]);
}
const E = SC.VALVE_AXIS.d;
function compound(rec, pieces, holderIndex) {
  const items = pieces.map((pc) => {
    const g = flat(pieceGeo(pc));
    const ln = pc.kind === "helix" ? null : edges(g);
    return { pc, s: SC.sideOf(pc.k), pos: g.attributes.position.array.slice(), nor: g.attributes.normal.array.slice(), lin: ln ? ln.attributes.position.array.slice() : new Float32Array(0) };
  });
  const nv = items.reduce((t, it) => t + it.pos.length, 0);
  const nl = items.reduce((t, it) => t + it.lin.length, 0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nv), 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(nv), 3));
  const lgeo = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(nl), 3));
  const h = rec.holders[holderIndex];
  const mesh = new THREE.Mesh(geo, h.mesh.material);
  mesh.frustumCulled = false;
  mesh.onBeforeRender = h.mesh.onBeforeRender;
  rec.inner.add(mesh);
  const lines = new THREE.LineSegments(lgeo, h.lines.material);
  lines.userData.crease = true;
  lines.frustumCulled = false;
  rec.inner.add(lines);
  for (const o of rec.holders) {
    o.mesh.visible = false;
    showLines(o, false);
  }
  return { items, geo, lgeo, mesh, lines };
}
// the pose of one piece in its A-A frame: a function of (a, z) and its normal
function moverOf(pc, f) {
  const psi = M.local(pc.k, f);
  if (pc.move === "valve") {
    const l = M.valveLift(pc.key, psi);
    return { t: [-E[0] * l, -E[1] * l] };
  }
  if (pc.move === "tappet") return { t: [M.tappetLift(pc.key, psi), 0] };
  if (pc.move === "rocker") return { rot: P.rockerAngle(M.valveLift(pc.key, psi)), c: P.PIVOT };
  if (pc.move === "spring") {
    const l = M.valveLift(pc.key, psi);
    const L0 = P.TIP - 10 - P.FLOOR;
    return { k: (L0 - l) / L0 };
  }
  return {};
}
function bake(C, f, e) {
  const P3 = C.geo.attributes.position.array;
  const N3 = C.geo.attributes.normal.array;
  const L3 = C.lgeo.attributes.position.array;
  let o = 0;
  let ol = 0;
  for (const it of C.items) {
    const m = moverOf(it.pc, f);
    const ex = SC.vex(it.pc.id, it.pc.k);
    const ox = ex[0] * e;
    const oy = ex[1] * e;
    const cs = m.rot ? Math.cos(m.rot) : 1;
    const sn = m.rot ? Math.sin(m.rot) : 0;
    const map = (src, dst, at, normal) => {
      for (let i = 0; i < src.length; i += 3) {
        let a = src[i];
        const y = src[i + 1];
        let z = src[i + 2];
        if (!normal) {
          if (m.k != null) {
            const t = (a - P.CS[0]) * E[0] + (z - P.CS[1]) * E[1] - P.FLOOR;
            a += t * (m.k - 1) * E[0];
            z += t * (m.k - 1) * E[1];
          }
          if (m.rot) {
            const da = a - m.c[0];
            const dz = z - m.c[1];
            a = m.c[0] + da * cs - dz * sn;
            z = m.c[1] + da * sn + dz * cs;
          }
          if (m.t) (a += m.t[0]), (z += m.t[1]);
          dst[at + i] = it.s * a + ox;
          dst[at + i + 1] = y + oy;
          dst[at + i + 2] = FZ * z;
        } else {
          const na = a * cs - z * sn;
          const nz = a * sn + z * cs;
          dst[at + i] = it.s * na;
          dst[at + i + 1] = y;
          dst[at + i + 2] = FZ * nz;
        }
      }
    };
    map(it.pos, P3, o, false);
    map(it.nor, N3, o, true);
    map(it.lin, L3, ol, false);
    // the mirror (side * FZ < 0) turns the winding over: swap two corners of every triangle
    if (it.s * FZ < 0) {
      for (let i = o; i < o + it.pos.length; i += 9) {
        for (const A of [P3, N3]) for (let c = 0; c < 3; c++) [A[i + 3 + c], A[i + 6 + c]] = [A[i + 6 + c], A[i + 3 + c]];
      }
    }
    o += it.pos.length;
    ol += it.lin.length;
  }
  C.geo.attributes.position.needsUpdate = true;
  C.geo.attributes.normal.needsUpdate = true;
  C.lgeo.attributes.position.needsUpdate = true;
  C.geo.computeBoundingBox();
  C.geo.computeBoundingSphere();
}
const VT = SC.vtPieces();
const COMP = [];
for (const id of [11, 12, 13, 14, 15]) COMP.push({ id, C: compound(V.part(id), VT.filter((p) => p.id === id), 0), moving: true });
const PLUGS_TOP = { id: 17, C: compound(V.part(17), VT.filter((p) => p.id === 17 && p.key === "top"), 0), moving: false };
const PLUGS_LOW = { id: 17, C: compound(V.part(17), VT.filter((p) => p.id === 17 && p.key === "bottom"), 2), moving: false };
COMP.push(PLUGS_TOP, PLUGS_LOW);

// ---------------------------------------------------------------- the open cut: half bodies, and what it removes
let cutShown = null;
function setCut(on) {
  if (cutShown === on) return;
  cutShown = on;
  for (const m of MERGED) {
    const v = on ? m.half : m.full;
    m.h.mesh.geometry = v.geo;
    if (m.h.lines) m.h.lines.geometry = v.lines;
  }
  for (const g of GAS) g.mesh.geometry = on ? g.half : g.full;
  // the sump, carburettor, intake pipes and lower plugs lie wholly in the removed half
  for (const id of SC.BELOW) for (const m of MERGED.filter((x) => x.id === id)) {
    m.h.mesh.visible = !on;
    showLines(m.h, !on);
  }
  PLUGS_LOW.C.mesh.visible = !on;
  PLUGS_LOW.C.lines.visible = !on;
  PLUGS_LOW.C.lines.userData.crease = !on;
}

// ---------------------------------------------------------------- state: the 2D sheet's
const CYC = M.cycle();
const TAB = CYC.table;
const DEG_PER_S = 90; // one working cycle (720°) in 8 s, as on the sheet
let phi = 0;
let target = 0;
let auto = false;
let dragging = false;

function step(dt, live) {
  const driven = (live.touring || auto) && !dragging;
  if (driven) {
    target += DEG_PER_S * dt;
    phi = target;
    return true;
  }
  const n = Math.max(1, Math.ceil(dt * 240));
  for (let i = 0; i < n; i++) phi = live.reduced ? target : L.follow(phi, target, dragging ? 40 : 14, dt / n);
  return Math.abs(phi - target) > 0.01;
}

// ---------------------------------------------------------------- the solids each cylinder poses
const byGrp = (id) => M.IDS.map((k) => V.part(id).holders.filter((h) => h.spec.grp === k));
const RODS = V.part(5).holders;
const SLIDERS = [...byGrp(6), ...byGrp(7), ...byGrp(8)]; // per cylinder: piston, rings, pin
const MAG = V.part(20).holders;
const PA0 = M.pinA(0);
let baked = { f: NaN, e: NaN };

function pose(f) {
  const t = f * rad;
  V.set(4, { rot: [0, FZ * t, 0] }); // the crank turns about y (clockwise seen from the rear)
  V.set(19, { rot: [0, FZ * t, 0] });
  for (const h of MAG) h.holder.rotation.y = -FZ * t; // 1:1, the other way
  V.set(16, { rot: [0, (-FZ * t) / 2, 0] }); // the camshaft: half speed, against the crank
  M.IDS.forEach((k, i) => {
    const sd = M.CYL[k].side;
    const pa = M.pinA(M.local(k, f));
    const d = sd * (pa - PA0);
    for (const list of [SLIDERS[i], SLIDERS[4 + i], SLIDERS[8 + i]]) for (const h of list) h.inner.position.set(d - h.pivot[0], -h.pivot[1], -h.pivot[2]);
    // the rod: big end on the crankpin, small end on the gudgeon pin
    const [px, pzT] = M.crankPin(k, f);
    const pz = FZ * pzT;
    const [p0x, p0z] = M.crankPin(k, 0);
    const gx = sd * pa;
    const Lr = Math.hypot(gx - px, pz);
    const th = Math.atan2((sd * pz) / Lr, (sd * (gx - px)) / Lr);
    const r = RODS[i];
    r.holder.rotation.y = th;
    const dx = px - p0x;
    const dz = pz - FZ * p0z;
    r.inner.position.set(dx * Math.cos(th) - dz * Math.sin(th) - r.pivot[0], -r.pivot[1], dx * Math.sin(th) + dz * Math.cos(th) - r.pivot[2]);
  });
  const e = V.explode;
  if (baked.f !== f || baked.e !== e) {
    for (const c of COMP) if (c.moving || baked.e !== e || !c.done) (bake(c.C, f, e), (c.done = true));
    baked = { f, e };
  }
}
setCut(V.cut);
// frame a whole turn, so the zoom never breathes
V.frame([0, 90, 180, 270].map((f) => () => pose(f)));

// ---------------------------------------------------------------- the four charges
const density = (p) => 0.14 + 0.86 * Math.min(1, Math.max(0, Math.log(p / 0.7) / Math.log(55 / 0.7)));
const EVC = M.EVENTS.ex.close - 720;
function gas(eng) {
  for (const k of M.IDS) {
    const c = eng.cyl[k];
    const d = M.crownAtTDC - M.crown(c.psi);
    const burnt = c.psi >= M.SPARK || c.psi < EVC;
    const flame = c.psi >= M.SPARK && c.xb < 0.995;
    const look = { stretch: d, density: density(c.p), wash: flame ? 0.4 : burnt ? 0.16 : 0.03 };
    V.fluid(`g${k}`, M.CYL[k].side > 0 ? { ...look, offset: [-d, 0, 0] } : look);
  }
}

// ---------------------------------------------------------------- render
const short = { INTAKE: "IN", COMPRESSION: "CMP", POWER: "PWR", EXHAUST: "EXH" };
function render(live) {
  setCut(V.cut);
  const f = M.wrap(phi);
  const eng = M.engine(TAB, f);
  pose(f);
  gas(eng);
  const firing = M.IDS.find((k) => eng.cyl[k].stroke === "POWER");
  $("readout").textContent = `${Math.round(f)}° · ${M.FIRING.map((k) => `${k} ${short[eng.cyl[k].stroke]}`).join(" ")} · p${firing} ${eng.cyl[firing].p.toFixed(1)} bar · T ${Math.round(eng.total)} N·m`;
  say(`crank ${Math.round(f)} degrees, cylinder ${firing} on its power stroke at ${eng.cyl[firing].p.toFixed(0)} bar, crank torque ${Math.round(eng.total)} newton metres.`, live.clock);
  $("run")?.setAttribute("aria-pressed", String(auto));
}
const say = L.announcer($("sr"), 2);

// cylinder 3's piston travel from TDC, below its barrel, as on the sheet (assembled only)
function overlay() {
  if (V.explode > 0.05 || !V.cut) return "";
  const psi = M.local(3, M.wrap(phi));
  return V.dim([M.crownAtTDC, -212, 0], [M.crown(psi), -212, 0], { text: `s₃=${M.travel(psi).toFixed(1)}`, off: 12 });
}

// a doorway in the half the cut removes (the carburettor) is flown into with the cut off
window.addEventListener(
  "bp:open",
  (e) => {
    if (SC.BELOW.includes(Number(e.detail?.id)) && V.cut) $("cut")?.click();
  },
  true,
);

// ---------------------------------------------------------------- controls, as on the sheet
// drag the crank, a rod or a piston sideways: one crank-pin circumference turns it once
V.drag([4, 5, 6], {
  axis: [1, 0, 0],
  length: 2 * Math.PI * M.CRANK_R,
  start: () => {
    dragging = true;
    auto = false;
    target = phi;
    return phi / 360;
  },
  move: (v) => (target = v * 360),
  end: () => (dragging = false),
});
const turn = (d) => () => {
  target += d;
  auto = false;
};
V.key("ArrowRight", turn(10));
V.key("ArrowLeft", turn(-10));
V.key("Home", () => ((target = Math.round(target / 720) * 720), (auto = false)));
V.key(" ", () => (auto = !auto));
$("run")?.addEventListener("click", () => {
  auto = !auto;
  V.input();
});

// the page's own self-tests (?selftest=1)
V.test("crank drag turns the engine", ({ ptr, project }) => {
  const g = project([0, 0, 0]);
  const t0 = target;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0] + 80, g[1]);
  const t1 = target;
  ptr("pointerup", g[0] + 80, g[1]);
  return { pass: Math.abs(t1 - t0) > 20, info: [t0, t1] };
});
V.test("arrow right turns 10°", ({ key }) => {
  const a = target;
  key("ArrowRight");
  const b = target;
  key("ArrowLeft");
  return { pass: Math.abs(b - a - 10) < 1e-6, info: [a, b] };
});
V.test("space runs", ({ key }) => {
  const a = auto;
  key(" ");
  const b = auto;
  key(" ");
  return { pass: a !== b, info: [a, b] };
});
V.test("opposed pistons move out and in together", () => {
  const keep = phi;
  phi = 90;
  render({ clock: 0 });
  const x1 = SLIDERS[0][0].inner.position.x;
  const x2 = SLIDERS[1][0].inner.position.x;
  phi = keep;
  render({ clock: 0 });
  return { pass: Math.abs(x1 + x2) < 1e-6 && Math.abs(x1) > 10, info: [x1, x2] };
});
V.test("cylinder 1's inlet valve opens on its intake stroke", () => {
  const keep = phi;
  const at = (f) => {
    phi = f;
    render({ clock: 0 });
    const a = PLUGS_TOP && COMP[0].C.geo.attributes.position.array;
    return a[0];
  };
  const shut = at(M.VALVES.in.centre + 360);
  const open = at(M.VALVES.in.centre);
  phi = keep;
  render({ clock: 0 });
  return { pass: Math.abs(open - shut) > 5, info: [shut, open] };
});

V.run({ step, render, overlay, still: 4.15 });
