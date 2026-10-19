// The electrical system's parts, in world mm. Each function draws one part into a view and returns
// SVG, so a part looks the same in every view it appears in.
//
// Frames.
//   SECTION A-A (the alternator, axial): u along the axis from the pulley's front face (aft, to the
//     right), v up from the axis. The plane passes through a stator slot at the top and a tooth at the
//     bottom, and through a claw of the front pole half at the top and of the rear half at the bottom
//     (fourteen poles: the claws opposite each other belong to different halves).
//   SECTION B-B (across the stator at mid-stack, u = 77): x, y from the axis, seen from the rear.
//   SECTION D-D (the starter, axial, on the plane of the ring gear's and the starter's axes): u along
//     the starter's axis from the pinion's front face at rest (the ring gear to the left), v up toward
//     the ring gear's centre, which stands CENTRES above.
//   SECTION E-E (the battery, across its plates, through one row of six cells): u along it, v up.
//   DETAIL G (one panel breaker, axial): u across, v along the axis from the panel's front face, out
//     toward the pilot (up).
//   VIEW F (the panel, from the pilot's seat): u to the right, v up from the panel's lower edge.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const rad = Math.PI / 180;
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
// a half-profile [r, u] about the alternator's or the starter's axis (v = 0), both halves
export const rev = (loop) => K.revolve(loop, { axis: "u", at: 0 });
// [u, r] point lists mirrored onto the lower half
const low = (pts) => pts.map(([u, v]) => [u, -v]);
const ur = (pts) => pts.map(([r, u]) => [u, r]);
export const rot = (pts, [cx, cy], deg) => {
  const c = Math.cos(deg * rad);
  const s = Math.sin(deg * rad);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
};
export const sector = (r0, r1, a0, a1, n = 6) => [...K.arc(0, 0, r1, a0, a1, n), ...K.arc(0, 0, r0, a1, a0, n)];
export function cutHoles(V, outer, holes, { mat = "steel", angle = 45 } = {}) {
  const dd = K.d(V, outer) + holes.map((h) => K.d(V, h)).join("");
  if (mat === "solid") return `<path class="solid" fill-rule="evenodd" d="${dd}"/>`;
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path fill="url(#h-${mat}-${angle})" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
}
// a ball bearing in section, both halves: outer ring, inner ring, a ball between them
export function bearing(V, u0, u1, ri, ro, { angle = 45 } = {}) {
  const t = (ro - ri) * 0.3;
  const rb = (ro - ri) * 0.42;
  const rc = (ri + ro) / 2;
  const uc = (u0 + u1) / 2;
  let out = "";
  for (const sg of [1, -1]) {
    const f = (pts) => (sg > 0 ? pts : low(pts));
    out += K.cut(V, f(K.rect(u0, ro - t, u1, ro)), { mat: "steel", angle });
    out += K.cut(V, f(K.rect(u0, ri, u1, ri + t)), { mat: "steel", angle: angle === 45 ? 135 : 45 });
    out += K.body(V, K.circle(uc, sg * rc, rb, 20));
  }
  return out;
}

// ================================================================ SECTION A-A: the alternator
export const AL = {
  shaft: { front: -11, r0: 7, step: 36, r1: 8.5, step2: 99, r2: 6, end: 131 },
  nut: { u0: -9, u1: 0, r: 11 },
  pulley: [[7, 0], [37, 0], [37, 3.5], [26, 7.5], [26, 12.5], [37, 16.5], [37, 20], [7, 20]],
  fan: { hub: [7, 15, 20, 24], disc: [15, 52, 23, 24.5], blade: [18, 51, 24.5, 33] },
  de: [[18, 36], [59, 36], [61, 38], [61, 62], [56, 62], [56, 44], [27, 44], [27, 50], [20, 50], [20, 37], [18, 37]],
  brgF: { u0: 37, u1: 49, ri: 8.5, ro: 20 }, // 6203, 17 × 40 × 12
  stator: { u0: 62, u1: 92, ri: 46, ro: 61, slot: 55, wedge: 46.8, end0: 50, end1: 104, endR: [47.2, 54.6] },
  rotor: { u0: 57, u1: 97, plate: 10, mid: 77, rOut: 45.6, root: 37, inRoot: 38, inTip: 43.5, tip: 2, hub: 20 },
  coil: { u0: 68, u1: 86, r0: 21, r1: 36.5 },
  sre: [[56, 92], [61, 92], [61, 118], [59, 120], [22, 120], [22, 130], [16, 130], [16, 118], [13, 118], [13, 112], [56, 112]],
  brgR: { u0: 118, u1: 128, ri: 6, ro: 16 }, // 6201, 12 × 32 × 10
  sleeve: { u0: 99.5, u1: 112, r0: 6, r1: 9 },
  rings: [[101, 105], [106.5, 110.5]],
  ringR: [9, 11.5],
  brush: [[101.5, 104.5], [107, 110]],
  brushR: [11.5, 22],
  holder: { blocks: [[99, 101.5], [104.5, 107], [110, 112]], r: [14, 28], cap: [28, 31] },
  rect: { ins: [120, 121.5], sink: [121.5, 129], r: [24, 56], diode: [34, 46], stud: 51, studR: 3, nut: [133, 138] },
  belt: [[2.95, 38.5], [17.05, 38.5], [13.23, 28], [6.77, 28]],
};

export function shaftA(V) {
  const s = AL.shaft;
  const pts = [[s.front, 0], [s.front, s.r0 - 0.8], [s.front + 0.8, s.r0], [s.step, s.r0], [s.step, s.r1], [s.step2, s.r1], [s.step2, s.r2], [s.end - 0.8, s.r2], [s.end, s.r2 - 0.8], [s.end, 0]];
  const outline = [...pts, ...low(pts.slice(1, -1)).reverse()];
  // thread runout lines on the front end; the nut over it
  const n = AL.nut;
  const nut = K.rect(n.u0, -n.r, n.u1, n.r);
  return (
    K.body(V, outline) +
    K.line(V, [[s.front + 1.5, s.r0 - 0.9], [n.u1 + 12, s.r0 - 0.9]], "thin") +
    K.line(V, [[s.front + 1.5, -(s.r0 - 0.9)], [n.u1 + 12, -(s.r0 - 0.9)]], "thin") +
    K.body(V, nut) +
    K.line(V, [[n.u0, n.r * 0.5], [n.u1, n.r * 0.5]], "thin") +
    K.line(V, [[n.u0, -n.r * 0.5], [n.u1, -n.r * 0.5]], "thin")
  );
}
export function pulleyFan(V) {
  const f = AL.fan;
  let out = K.section(V, { ...rev(AL.pulley), edges: [] }, { mat: "steel", angle: 45 });
  for (const sg of [1, -1]) {
    const g = (pts) => (sg > 0 ? pts : low(pts));
    out += K.cut(V, g(K.rect(f.hub[2], f.hub[0], f.hub[3], f.hub[1])), { mat: "steel", angle: 45 });
    out += K.cut(V, g(K.rect(f.disc[2], f.disc[0], f.disc[3], f.disc[1])), { mat: "solid" });
    out += K.body(V, g(K.rect(f.blade[2], f.blade[0], f.blade[3], f.blade[1])));
  }
  return out;
}
export const beltA = (V) => K.cut(V, AL.belt, { mat: "rubber", angle: 45 });
export const deFrame = (V) => K.section(V, { ...rev(AL.de), edges: [] }, { mat: "alu", angle: 45 });
export const sreFrame = (V) => K.section(V, { ...rev(AL.sre), edges: [] }, { mat: "alu", angle: 135 });
export function brushHolder(V) {
  const h = AL.holder;
  let out = "";
  for (const [u0, u1] of h.blocks) out += K.cut(V, K.rect(u0, h.r[0], u1, h.r[1]), { mat: "plastic", angle: 45 });
  out += K.cut(V, K.rect(h.blocks[0][0], h.cap[0], h.blocks[2][1], h.cap[1]), { mat: "plastic", angle: 45 });
  return out;
}
export function stator(V) {
  const s = AL.stator;
  // the core: above the slot at the top, a full tooth at the bottom
  let out = K.cut(V, K.rect(s.u0, s.slot, s.u1, s.ro), { mat: "steel", angle: 30 });
  out += K.cut(V, low(K.rect(s.u0, s.ri, s.u1, s.ro)), { mat: "steel", angle: 30 });
  out += K.cut(V, K.rect(s.u0, s.ri, s.u1, s.wedge), { mat: "solid" }); // the slot wedge
  return out;
}
// the winding: the slot's copper at the top running out into the end turns; at the bottom, where the
// plane cuts a tooth, only the end turns (they run all round)
export function statorCopper(V) {
  const s = AL.stator;
  const [r0, r1] = s.endR;
  const top = [[s.end0, r0 + 2.5], [s.end0 + 2.5, r0], [s.end1 - 2.5, r0], [s.end1, r0 + 2.5], [s.end1, r1 - 2], [s.end1 - 2, r1], [s.end0 + 2, r1], [s.end0, r1 - 2]];
  const turn = (u0, u1, front) => (front ? [[u0, r0 + 2.5], [u0 + 2.5, r0], [u1, r0], [u1, r1], [u0 + 2, r1], [u0, r1 - 2]] : [[u0, r0], [u1 - 2.5, r0], [u1, r0 + 2.5], [u1, r1 - 2], [u1 - 2, r1], [u0, r1]]);
  return (
    K.cut(V, top, { mat: "bronze", angle: 60 }) +
    K.cut(V, low(turn(s.end0, s.u0 - 0.3, true)), { mat: "bronze", angle: 60 }) +
    K.cut(V, low(turn(s.u1 + 0.3, s.end1, false)), { mat: "bronze", angle: 60 })
  );
}
// the rotor: both claw-pole halves, their hubs, and the shaft through them (drawn with shaftA)
export function rotorPts() {
  const r = AL.rotor;
  const pA = r.u0 + r.plate; // the front half's plate face
  const pB = r.u1 - r.plate; // the rear half's
  // top: front half with its claw; rear half with its root
  const topA = [[r.u0, AL.shaft.r1], [r.u0, r.rOut - 1], [r.u0 + 1, r.rOut], [r.u1 - r.tip, r.rOut], [r.u1 - r.tip, r.inTip], [pA, r.inRoot], [pA, r.hub], [r.mid, r.hub], [r.mid, AL.shaft.r1]];
  const topB = [[r.mid, AL.shaft.r1], [r.mid, r.hub], [pB, r.hub], [pB, r.root], [r.u1, r.root], [r.u1, AL.shaft.r1]];
  // bottom: the mirror (rear half's claw), drawn with v negative
  const mirror = (pts) => pts.map(([u, v]) => [r.u0 + r.u1 - u, -v]);
  return { topA, topB, botB: mirror(topA), botA: mirror(topB) };
}
export function rotor(V) {
  const p = rotorPts();
  return [p.topA, p.botA].map((q) => K.cut(V, q, { mat: "steel", angle: 135 })).join("") + [p.topB, p.botB].map((q) => K.cut(V, q, { mat: "steel", angle: 45 })).join("");
}
export function fieldCoil(V) {
  const c = AL.coil;
  const r = AL.rotor;
  let out = "";
  for (const sg of [1, -1]) {
    const g = (pts) => (sg > 0 ? pts : low(pts));
    out += K.cut(V, g(K.rect(c.u0, c.r0, c.u1, c.r1)), { mat: "bronze", angle: 45 });
    // the bobbin: a channel round the winding
    out += K.cut(V, g([[c.u0 - 1, r.hub], [c.u1 + 1, r.hub], [c.u1 + 1, c.r1 + 0.6], [c.u1, c.r1 + 0.6], [c.u1, c.r0], [c.u0, c.r0], [c.u0, c.r1 + 0.6], [c.u0 - 1, c.r1 + 0.6]]), { mat: "solid" });
  }
  return out;
}
export function slipRings(V) {
  const s = AL.sleeve;
  let out = "";
  for (const sg of [1, -1]) {
    const g = (pts) => (sg > 0 ? pts : low(pts));
    out += K.cut(V, g(K.rect(s.u0, s.r0, s.u1, s.r1)), { mat: "plastic", angle: 135 });
    for (const [u0, u1] of AL.rings) out += K.cut(V, g(K.rect(u0, AL.ringR[0], u1, AL.ringR[1])), { mat: "bronze", angle: 135 });
  }
  // the field's leads along the shaft, from the rings to the coil
  out += K.line(V, [[AL.coil.u1, AL.rotor.hub - 0.6], [AL.rotor.u1 - 1, AL.shaft.r1 + 0.6], [AL.rings[0][0] + 1, AL.ringR[0] - 0.5]], "thin");
  return out;
}
export function brushes(V, wear = 0) {
  let out = "";
  for (const [u0, u1] of AL.brush) {
    out += K.cut(V, K.rect(u0, AL.brushR[0], u1, AL.brushR[1] - wear), { mat: "iron", angle: 60 });
    out += K.springSection(V, { from: AL.brushR[1] - wear, to: AL.holder.cap[0], radius: (u1 - u0) / 2 - 0.4, wire: 0.6, turns: 4, axis: "v", at: (u0 + u1) / 2 });
  }
  return out;
}
export function rectifier(V) {
  const R = AL.rect;
  let out = "";
  // top: the positive heat sink on its insulator, a diode pressed into it, the B+ stud and nut
  out += K.cut(V, K.rect(R.ins[0], R.r[0], R.ins[1], R.r[1]), { mat: "solid" });
  out += cutHoles(V, K.rect(R.sink[0], R.r[0], R.sink[1], R.r[1]), [K.rect(R.sink[0] - 0.01, R.diode[0], R.sink[1] + 0.01, R.diode[1]), K.rect(R.sink[0] - 0.01, R.stud - R.studR, R.sink[1] + 0.01, R.stud + R.studR)], { mat: "alu", angle: 30 });
  out += diodeCan(V, R.sink[0] + 0.5, R.sink[1] + 2.5, R.diode[0], R.diode[1]);
  out += K.body(V, K.rect(R.ins[0] - 0.01, R.stud - R.studR, R.nut[1] + 3, R.stud + R.studR));
  out += K.body(V, K.rect(R.nut[0], R.stud - 5.5, R.nut[1], R.stud + 5.5));
  out += K.line(V, [[R.nut[0], R.stud + 2.75], [R.nut[1], R.stud + 2.75]], "thin") + K.line(V, [[R.nut[0], R.stud - 2.75], [R.nut[1], R.stud - 2.75]], "thin");
  // the diode's lead to the stator's phase terminal (thin), the stud's lead across the sink
  out += K.line(V, [[R.sink[1] + 2.5, (R.diode[0] + R.diode[1]) / 2], [R.sink[1] + 6, (R.diode[0] + R.diode[1]) / 2], [R.sink[1] + 6, R.r[0] - 4]], "thin");
  // bottom: a negative diode pressed straight into the frame's rear wall
  out += diodeCan(V, 113, 122, -R.diode[1], -R.diode[0]);
  out += K.line(V, [[122, -(R.diode[0] + R.diode[1]) / 2], [125, -(R.diode[0] + R.diode[1]) / 2], [125, -R.r[0] + 2]], "thin");
  return out;
}
function diodeCan(V, u0, u1, v0, v1) {
  const vc = (v0 + v1) / 2;
  return K.body(V, K.rect(u0, v0, u1, v1)) + K.cut(V, K.rect(u0 + 1.2, vc - 2.2, u0 + 2.2, vc + 2.2), { mat: "solid" }) + K.line(V, [[u0 + 2.2, vc], [u1 - 0.6, vc]], "thin");
}
export const bearingsA = (V) => bearing(V, AL.brgF.u0, AL.brgF.u1, AL.brgF.ri, AL.brgF.ro) + bearing(V, AL.brgR.u0, AL.brgR.u1, AL.brgR.ri, AL.brgR.ro);

// ================================================================ SECTION B-B: across the stator
export const BB = { n: M.ALT.slots, slotW: 3.0, open: 1.6, poles: 2 * M.ALT.pairs, clawW: 13 };
export function statorRing(V) {
  const s = AL.stator;
  const n = BB.n;
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k * 360) / n;
    const half = (BB.slotW / 2 / s.ri) / rad;
    const halfO = (BB.open / 2 / s.ri) / rad;
    const halfB = (BB.slotW / 2 / s.slot) / rad;
    const pitch = 360 / n;
    // bore arc between slots, then the slot: opening, widening to the slot, bottom, back
    for (const b of range(a + half, a + pitch - half, 3)) pts.push([s.ri * Math.cos(b * rad), s.ri * Math.sin(b * rad)]);
    const c = a + pitch;
    const P = (r, d) => [r * Math.cos((c + d) * rad), r * Math.sin((c + d) * rad)];
    pts.push(P(s.ri, -halfO), P(s.ri + 0.8, -halfO), P(s.ri + 1.4, -half), P(s.slot, -halfB), P(s.slot, halfB), P(s.ri + 1.4, half), P(s.ri + 0.8, halfO), P(s.ri, halfO));
  }
  return cutHoles(V, K.circle(0, 0, s.ro, 144), [pts], { mat: "steel", angle: 30 });
}
// the copper in slot k (between the wedge and the slot's bottom)
export function slotCopper(k) {
  const s = AL.stator;
  const c = ((k + 1) * 360) / BB.n;
  const half = (BB.slotW / 2 - 0.35) / s.ri / rad;
  const halfB = (BB.slotW / 2 - 0.35) / s.slot / rad;
  const P = (r, h) => [r * Math.cos((c + h) * rad), r * Math.sin((c + h) * rad)];
  return [P(s.ri + 1.8, -half), P(s.slot - 0.5, -halfB), P(s.slot - 0.5, halfB), P(s.ri + 1.8, half)];
}
export const slotAngle = (k) => ((k + 1) * 360) / BB.n;
// the rotor at mid-stack: fourteen claws (seven from each half), the field winding, the core, the shaft
export function rotorB(V) {
  const r = AL.rotor;
  const rIn = r.inRoot + ((r.mid - (r.u0 + r.plate)) / (r.u1 - r.tip - (r.u0 + r.plate))) * (r.inTip - r.inRoot);
  const pitch = 360 / BB.poles;
  const w = (BB.clawW / r.rOut) / rad / 2;
  let claws = "";
  for (let i = 0; i < BB.poles; i++) {
    const a = 90 + i * pitch;
    claws += K.cut(V, sector(rIn, r.rOut, a - w, a + w, 4), { mat: "steel", angle: i % 2 ? 45 : 135 });
  }
  return { claws, rIn };
}
export function coreB(V) {
  const c = AL.coil;
  return (
    cutHoles(V, K.circle(0, 0, c.r1, 72), [K.circle(0, 0, c.r0, 60)], { mat: "bronze", angle: 45 }) +
    cutHoles(V, K.circle(0, 0, c.r0, 60), [K.circle(0, 0, AL.rotor.hub, 60)], { mat: "solid" }) +
    cutHoles(V, K.circle(0, 0, AL.rotor.hub, 60), [K.circle(0, 0, AL.shaft.r1, 40)], { mat: "steel", angle: 135 })
  );
}
export const shaftB = (V) => K.cut(V, K.circle(0, 0, AL.shaft.r1, 40), { mat: "steel", angle: 45 });

// ================================================================ SECTION D-D: the starter
export const ST = {
  shaft: { u0: -24, u1: 180, r: 7 },
  stop: { u0: -24, u1: -19, r: 11 }, // the stop collar on the screw's front end
  pinion: { w: 14, rIn: 7.05, rRoot: M.MODULE * (M.PINION.teeth - 2.5) / 2, rTip: (M.MODULE * (M.PINION.teeth + 2)) / 2, rHub: 6.2 },
  barrel: { u0: 14, u1: 32, r: 11 },
  spring: { u1: 54, r: 10, wire: 2.4, turns: 6 },
  collar: { u0: 54, u1: 58, r: 13 },
  nose: [[10, 58], [46, 58], [46, 64], [38, 64], [38, 76], [33, 76], [33, 68], [12, 68], [12, 72], [10, 72]],
  bushF: { u0: 58, u1: 72, ri: 7.05, ro: 10 },
  yoke: { u0: 76, u1: 150, ri: 33, ro: 38 },
  magnet: { u0: 84, u1: 142, ri: 26.6, ro: 33 },
  arm: { u0: 86, u1: 138, ri: 7, ro: 26 },
  endTurn: { r: [13, 24], w: 6 },
  comm: { u0: 151, u1: 166, ri: 7, rIns: 9, ro: 17 },
  brush: { u0: 153, u1: 163, r: [17, 26] },
  holder: { r: [17, 30] },
  cap: [[33, 150], [38, 150], [38, 169], [35, 172], [13, 172], [13, 180], [10, 180], [10, 168], [33, 168]],
  terminal: { u: 118, r: [38, 48], half: 3.5 },
};
// the pinion at travel p (0 rest, 1 in mesh): it moves −travel along u
export const pinionShift = (p) => -M.PINION.travel * p;
export function pinion(V, p) {
  const P = ST.pinion;
  const du = pinionShift(p);
  const u0 = du;
  const u1 = du + P.w;
  let out = "";
  for (const sg of [1, -1]) {
    const g = (pts) => (sg > 0 ? pts : low(pts));
    // hub and barrel hatched; the teeth beyond the root circle not hatched (cut lengthwise)
    out += K.cut(V, g([[u0, P.rIn], [u1, P.rIn], [u1, P.rRoot], [u0, P.rRoot]]), { mat: "steel", angle: 45 });
    out += K.body(V, g([[u0, P.rRoot], [u1, P.rRoot], [u1, P.rTip - 0.6], [u1 - 0.6, P.rTip], [u0 + 1.2, P.rTip], [u0, P.rTip - 1.2]]));
    out += K.line(V, g([[u0 + 0.6, (P.rRoot + P.rTip) / 2 + 0.6], [u1 - 0.4, (P.rRoot + P.rTip) / 2 + 0.6]]), "thin");
    out += K.cut(V, g([[du + ST.barrel.u0, P.rIn], [du + ST.barrel.u1, P.rIn], [du + ST.barrel.u1, ST.barrel.r], [du + ST.barrel.u0, ST.barrel.r]]), { mat: "steel", angle: 45 });
    // the internal helix: its crests as thin lines across the barrel's bore
  }
  out += K.lines(V, range(du + ST.barrel.u0 + 2, du + ST.barrel.u1 - 2, 5).map((u) => [[u, P.rIn], [u + 2.2, -P.rIn]]), "thin");
  return out;
}
export function driveSpring(V, p) {
  const du = pinionShift(p);
  return K.springSection(V, { from: du + ST.barrel.u1, to: ST.spring.u1, radius: ST.spring.r, wire: ST.spring.wire, turns: ST.spring.turns, axis: "u", at: 0 });
}
export function starterShaft(V) {
  const s = ST.shaft;
  const pts = [[s.u0, 0], [s.u0, s.r - 0.6], [s.u0 + 0.6, s.r], [s.u1 - 0.6, s.r], [s.u1, s.r - 0.6], [s.u1, 0]];
  const outline = [...pts, ...low(pts.slice(1, -1)).reverse()];
  // the screw's helical splines: thin lines over the length the pinion runs on
  const helix = K.lines(V, range(-14, 44, 8).map((u) => [[u, s.r], [u + 4, -s.r]]), "thin");
  const c = ST.stop;
  const cl = ST.collar;
  return K.body(V, outline) + helix + K.body(V, K.rect(c.u0, -c.r, c.u1, c.r)) + K.body(V, K.rect(cl.u0, -cl.r, cl.u1, cl.r));
}
export function starterFrames(V) {
  let out = K.section(V, { ...rev(ST.nose), edges: [] }, { mat: "alu", angle: 135 });
  out += K.section(V, { ...rev([[ST.yoke.ri, ST.yoke.u0], [ST.yoke.ro, ST.yoke.u0], [ST.yoke.ro, ST.yoke.u1], [ST.yoke.ri, ST.yoke.u1]]), edges: [] }, { mat: "steel", angle: 45 });
  out += K.section(V, { ...rev(ST.cap), edges: [] }, { mat: "alu", angle: 135 });
  const b = ST.bushF;
  for (const sg of [1, -1]) {
    const g = (pts) => (sg > 0 ? pts : low(pts));
    out += K.cut(V, g(K.rect(b.u0, b.ri, b.u1, b.ro)), { mat: "bronze", angle: 45 });
    out += K.cut(V, g(K.rect(168, 7.05, 180, 10)), { mat: "bronze", angle: 45 });
    const m = ST.magnet;
    out += K.cut(V, g(K.rect(m.u0, m.ri, m.u1, m.ro)), { mat: "iron", angle: 60 });
    // the brush, its holder and spring
    const h = ST.brush;
    out += K.cut(V, g(K.rect(h.u0 - 2.5, ST.holder.r[0] + 1, h.u0, ST.holder.r[1])), { mat: "plastic", angle: 45 });
    out += K.cut(V, g(K.rect(h.u1, ST.holder.r[0] + 1, h.u1 + 2.5, ST.holder.r[1])), { mat: "plastic", angle: 45 });
    out += K.cut(V, g(K.rect(h.u0, h.r[0], h.u1, h.r[1])), { mat: "iron", angle: 30 });
  }
  // the brush springs (top and bottom)
  out += K.springSection(V, { from: ST.brush.r[1], to: ST.holder.r[1], radius: 3.6, wire: 0.8, turns: 2, axis: "v", at: (ST.brush.u0 + ST.brush.u1) / 2 });
  out += K.springSection(V, { from: -ST.holder.r[1], to: -ST.brush.r[1], radius: 3.6, wire: 0.8, turns: 2, axis: "v", at: (ST.brush.u0 + ST.brush.u1) / 2 });
  // the terminal stud through the yoke (insulated), top
  const t = ST.terminal;
  out += K.body(V, K.rect(t.u - t.half, t.r[0] - 4, t.u + t.half, t.r[1])) + K.body(V, K.rect(t.u - 6, t.r[0] + 2, t.u + 6, t.r[0] + 6));
  return out;
}
export function armature(V) {
  const a = ST.arm;
  const e = ST.endTurn;
  const c = ST.comm;
  let out = "";
  for (const sg of [1, -1]) {
    const g = (pts) => (sg > 0 ? pts : low(pts));
    out += K.cut(V, g(K.rect(a.u0, a.ri, a.u1, a.ro)), { mat: "iron", angle: 135 });
    out += K.cut(V, g([[a.u0 - e.w, e.r[0] + 2], [a.u0 - e.w + 2, e.r[0]], [a.u0, e.r[0]], [a.u0, e.r[1]], [a.u0 - e.w + 2, e.r[1]], [a.u0 - e.w, e.r[1] - 2]]), { mat: "bronze", angle: 45 });
    out += K.cut(V, g([[a.u1, e.r[0]], [a.u1 + e.w + 4, e.r[0]], [a.u1 + e.w + 6, e.r[0] + 2], [a.u1 + e.w + 6, e.r[1] - 4], [a.u1 + e.w + 2, e.r[1]], [a.u1, e.r[1]]]), { mat: "bronze", angle: 45 });
    // the commutator: copper bars on an insulating sleeve; the risers that take the coil ends
    out += K.cut(V, g(K.rect(c.u0, c.ri, c.u1, c.rIns)), { mat: "plastic", angle: 135 });
    out += K.cut(V, g([[c.u0, c.rIns], [c.u1, c.rIns], [c.u1, c.ro], [c.u0 + 3, c.ro], [c.u0 + 3, c.ro + 3], [c.u0, c.ro + 3]]), { mat: "bronze", angle: 135 });
  }
  return out;
}
// the ring gear (BP propeller item 11): a phantom segment of its rim and teeth, centre CENTRES above
export const RINGG = { u0: -16, u1: -2 };
export function ringGearPhantom(V) {
  const C = M.CENTRES;
  const tip = C - M.RING.tipR;
  const root = C - (M.RING.tipR - 2.25 * M.MODULE);
  const rim = C - 128;
  const g = RINGG;
  return (
    K.line(V, [[g.u0, tip + 1], [g.u0 + 1, tip], [g.u1 - 1, tip], [g.u1, tip + 1], [g.u1, rim + 14], [g.u0, rim + 14]], "phan", true) +
    K.line(V, [[g.u0, root], [g.u1, root]], "phan") +
    K.line(V, [[g.u0 - 6, rim], [g.u1, rim]], "phan") +
    K.line(V, [[g.u0 - 6, rim], [g.u0 - 6, rim + 14]], "phan")
  );
}

// ================================================================ SECTION E-E: the battery
export const BT = {
  L: 160,
  H: 160,
  lid: [160, 172],
  wall: 3.5,
  floor: 4,
  part: 2.5,
  cells: 6,
  rest: 12, // the plates stand on bridges this high: room for shed paste under them
  plateTop: 118,
  strap: [124, 129],
  level: 134,
  cap: { w: 9, h: 8 },
  post: { u: 11, r: 6, top: 180, stud: 4, studTop: 190 },
};
BT.cellW = (BT.L - 2 * BT.wall - (BT.cells - 1) * BT.part) / BT.cells;
export const cellX = (i) => BT.wall + i * (BT.cellW + BT.part);
// the plates of one cell: [u0, u1, positive]
export function plates(i) {
  const x0 = cellX(i) + 0.9;
  const out = [];
  const pos = 2.0;
  const neg = 1.6;
  const sep = 0.75;
  let u = x0;
  for (let k = 0; k < 9; k++) {
    const w = k % 2 ? pos : neg;
    out.push([u, u + w, k % 2 === 1]);
    u += w + sep;
  }
  // centre the stack in the cell
  const shift = (cellX(i) + BT.cellW / 2) - (x0 + (u - sep - x0) / 2);
  return out.map(([a, b, p]) => [a + shift, b + shift, p]);
}
export function batteryCase(V) {
  // the case: walls, floor and partitions in one moulding, open at the top (the lid closes it)
  const pts = [[0, 0], [BT.L, 0], [BT.L, BT.H]];
  for (let i = BT.cells - 1; i >= 0; i--) {
    pts.push([cellX(i) + BT.cellW, BT.H], [cellX(i) + BT.cellW, BT.floor], [cellX(i), BT.floor], [cellX(i), BT.H]);
  }
  pts.push([0, BT.H]);
  let out = K.cut(V, pts, { mat: "plastic", angle: 45 });
  // the lid, with a filler hole over each cell, and its vent caps
  const lid = [[0, BT.lid[0]], [BT.L, BT.lid[0]], [BT.L, BT.lid[1]], [0, BT.lid[1]]];
  // the lid: cut between its filler holes and the post's hole, piece by piece
  const gaps = [...Array.from({ length: BT.cells }, (_, i) => [capAt(i) - 3, capAt(i) + 3]), [BT.post.u - BT.post.r, BT.post.u + BT.post.r]].sort((a, b) => a[0] - b[0]);
  let u = 0;
  for (const [g0, g1] of gaps) {
    out += K.cut(V, K.rect(u, BT.lid[0], g0, BT.lid[1]), { mat: "plastic", angle: 135 });
    u = g1;
  }
  out += K.cut(V, K.rect(u, BT.lid[0], BT.L, BT.lid[1]), { mat: "plastic", angle: 135 });
  for (let i = 0; i < BT.cells; i++) {
    const c = capAt(i);
    const w = BT.cap.w / 2;
    out += K.body(V, [[c - 2.6, BT.lid[0] + 2], [c + 2.6, BT.lid[0] + 2], [c + 2.6, BT.lid[1]], [c + w, BT.lid[1]], [c + w, BT.lid[1] + BT.cap.h - 1], [c + w - 1, BT.lid[1] + BT.cap.h], [c - w + 1, BT.lid[1] + BT.cap.h], [c - w, BT.lid[1] + BT.cap.h - 1], [c - w, BT.lid[1]], [c - 2.6, BT.lid[1]]]);
  }
  void lid;
  return out;
}
// Twelve cells in two rows of six, in series: both terminals stand at this end, the positive over the
// first cell of this row, the negative behind it in the other row. The end cell's cap moves aside.
export const capAt = (i) => (i === 0 ? cellX(0) + BT.cellW - 5.2 : cellX(i) + BT.cellW / 2);
export function cellElements(V) {
  let out = "";
  for (let i = 0; i < BT.cells; i++) {
    for (const [u0, u1, pos] of plates(i)) {
      const top = pos ? BT.strap[0] : BT.plateTop;
      out += K.cut(V, K.rect(u0, BT.floor + BT.rest, u1, top), { mat: "solid" });
    }
    // the bridges the plates stand on
    out += K.body(V, K.rect(cellX(i) + 2, BT.floor, cellX(i) + 4, BT.floor + BT.rest)) + K.body(V, K.rect(cellX(i) + BT.cellW - 4, BT.floor, cellX(i) + BT.cellW - 2, BT.floor + BT.rest));
    // the positive strap joins this cell's positive plates; the negative strap is behind the plane
    const ps = plates(i).filter((p) => p[2]);
    out += K.body(V, K.rect(ps[0][0] - 0.6, BT.strap[0], ps[ps.length - 1][1] + 0.6, BT.strap[1]));
    const ns = plates(i).filter((p) => !p[2]);
    out += K.line(V, K.rect(ns[0][0] - 0.4, BT.plateTop + 1, ns[ns.length - 1][1] + 0.4, BT.strap[0] - 0.8), "hid", true);
    // the connector through the partition to the next cell's negative strap
    if (i < BT.cells - 1) out += K.body(V, K.rect(ps[ps.length - 1][1] + 0.6, BT.strap[0] + 1, cellX(i + 1) + 2.4, BT.strap[1] - 1));
  }
  // the positive terminal: a lead post from the first cell's strap through the lid, a stud above
  {
    const p = BT.post;
    const u = p.u;
    out += K.body(V, [[u - p.r + 2, BT.strap[1]], [u + p.r - 2, BT.strap[1]], [u + p.r - 2, BT.lid[0]], [u + p.r, BT.lid[0]], [u + p.r, p.top - 4], [u - p.r, p.top - 4], [u - p.r, BT.lid[0]], [u - p.r + 2, BT.lid[0]]]);
    out += K.body(V, K.rect(u - p.stud, p.top - 4, u + p.stud, p.studTop));
    out += K.line(V, [[u - p.stud + 0.8, p.top - 2], [u - p.stud + 0.8, p.studTop - 1]], "thin");
  }
  return out;
}
// the electrolyte in each cell (stippled), up to its level
export const electrolyte = (i) => K.rect(cellX(i) + 0.01, BT.floor + 0.01, cellX(i) + BT.cellW - 0.01, BT.level);

// ================================================================ DETAIL G: a push-pull thermal breaker
export const CBG = {
  panel: [0, 1.6],
  bush: { v0: -6, v1: 9, ro: 4.76, ri: 3.25 },
  nut: { v0: 1.6, v1: 4.6, r: 7.1 },
  body: { v0: -34, v1: -6, ro: 8, wall: 1.5, floor: 1.6 },
  plunger: { r: 3.15, top: 13, bot: -16, notch: [-9, -7], depth: 1.0 },
  stroke: 6,
  band: 4, // the white band shows above the bushing when tripped
  bridge: { v: [-14, -12.4], w: 5.6 },
  contact: { u: 4.6, v: [-15.2, -14] },
  spring: { v0: -32.4, r: 2.2, wire: 0.6, turns: 7 },
  bimetal: { u: 5.4, v0: -30, v1: -8.2, t: 0.7, bend: 1.25 },
  term: { u: 4.4, v0: -44, half: 1.9 },
};
// the plunger's lift (mm) for a breaker that is set (0) or tripped (1) and its bimetal's bend at θ
export const plungerLift = (open) => (open ? CBG.stroke : 0);
export function breakerBody(V) {
  const b = CBG.body;
  const s = CBG.bush;
  const inner = b.ro - b.wall;
  // the moulded body: a cup, its mouth closed by the bushing's flange
  const cup = [[-b.ro, b.v1], [-b.ro, b.v0], [b.ro, b.v0], [b.ro, b.v1], [inner, b.v1], [inner, b.v0 + b.floor], [-inner, b.v0 + b.floor], [-inner, b.v1]];
  let out = K.cut(V, cup, { mat: "plastic", angle: 45 });
  // the threaded bushing with its flange inside the cup's mouth (both halves, the bore between)
  for (const sg of [1, -1]) {
    const pts = [[sg * s.ri, s.v0 - 2], [sg * inner, s.v0 - 2], [sg * inner, s.v0], [sg * s.ro, s.v0], [sg * s.ro, s.v1], [sg * s.ri, s.v1]];
    out += K.cut(V, pts, { mat: "brass", angle: sg > 0 ? 135 : 45 });
    out += K.line(V, [[sg * (s.ro - 0.45), CBG.panel[0] - 3], [sg * (s.ro - 0.45), s.v1 - 0.6]], "thin");
  }
  // the panel nut
  const n = CBG.nut;
  out += K.body(V, [[-n.r, n.v0], [-s.ro, n.v0], [-s.ro, n.v1], [-n.r, n.v1]]) + K.body(V, [[s.ro, n.v0], [n.r, n.v0], [n.r, n.v1], [s.ro, n.v1]]);
  return out;
}
export function breakerTerminals(V) {
  const t = CBG.term;
  const b = CBG.body;
  const c = CBG.contact;
  let out = "";
  for (const sg of [1, -1]) {
    // a strap up from each terminal to its fixed contact (the right one carries the bimetal's root)
    const strap = sg < 0 ? [[-t.u - 0.6, b.v0 + b.floor], [-t.u + 0.6, b.v0 + b.floor], [-t.u + 0.6, c.v[0]], [-t.u - 0.6, c.v[0]]] : [[t.u - 0.6, b.v0 + b.floor], [t.u + 0.6, b.v0 + b.floor], [t.u + 0.6, CBG.bimetal.v0], [t.u - 0.6, CBG.bimetal.v0]];
    out += K.cut(V, strap, { mat: "solid" });
    out += K.body(V, K.rect(sg * t.u - t.half, t.v0, sg * t.u + t.half, b.v0)) + K.body(V, K.rect(sg * t.u - 3.2, t.v0 + 3, sg * t.u + 3.2, t.v0 + 5.6));
  }
  // the fixed contacts (silver), and the link from the bimetal's root to the right contact
  out += K.cut(V, K.rect(-c.u - 1.1, c.v[0], -c.u + 1.1, c.v[1]), { mat: "solid" });
  out += K.cut(V, K.rect(c.u - 1.1, c.v[0], c.u + 1.1, c.v[1]), { mat: "solid" });
  return out;
}
// the plunger (button), its contact bridge and the spring under it, at lift (mm)
export function plunger(V, lift) {
  const p = CBG.plunger;
  const top = p.top + lift;
  const bot = p.bot + lift;
  const n0 = p.notch[0] + lift;
  const n1 = p.notch[1] + lift;
  const pts = [[-p.r, bot], [p.r, bot], [p.r, n0], [p.r - p.depth, n0 + 0.5], [p.r - p.depth, n1], [p.r, n1], [p.r, top - 1], [p.r - 1, top], [-p.r + 1, top], [-p.r, top - 1]];
  let out = K.body(V, pts);
  // the white band: the length of the button that hides in the bushing while it is set
  const b0 = CBG.bush.v1 - 0.01 + lift - CBG.band - 0.2 + (lift > 0 ? 0 : 0);
  out += K.line(V, [[-p.r, b0 + CBG.band], [p.r, b0 + CBG.band]], "thin") + K.line(V, [[-p.r, b0], [p.r, b0]], "thin");
  const br = CBG.bridge;
  out += K.cut(V, K.rect(-br.w - 0.4, br.v[0] + lift, br.w + 0.4, br.v[1] + lift), { mat: "solid" });
  out += K.springSection(V, { from: CBG.spring.v0, to: bot - 0.1, radius: CBG.spring.r, wire: CBG.spring.wire, turns: CBG.spring.turns, axis: "v", at: 0 });
  return out;
}
// the bimetal strip: fixed at its root on the right strap, its hooked tip in the plunger's notch; it
// bends outward (to +u) by bend × θ at its tip
export function bimetal(V, theta) {
  const m = CBG.bimetal;
  const d = m.bend * Math.min(1.2, Math.max(0, theta));
  const n = 10;
  const mid = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    mid.push([m.u + d * s * s, m.v0 + (m.v1 - m.v0) * s]);
  }
  const a = mid.map(([u, v]) => [u - m.t / 2, v]);
  const b = mid.map(([u, v]) => [u + m.t / 2, v]);
  const tip = mid[n];
  const hookIn = CBG.plunger.r - CBG.plunger.depth + 0.25;
  const hook = [[tip[0] + m.t / 2, tip[1]], [tip[0] - m.t / 2, tip[1]], [hookIn + d, tip[1] + 0.2], [hookIn + d, tip[1] + 1.2], [tip[0] + m.t / 2, tip[1] + 1.2]];
  // the flexible pigtail from the strip's upper end to the right fixed contact: the current runs
  // up the strip, so the strip is heated by exactly the circuit's current
  const c = CBG.contact;
  const at = mid[7];
  const pig = [[at[0] + m.t / 2, at[1]], [at[0] + 1.6, at[1] - 1.5], [at[0] + 1.4, c.v[1] + 1.6], [c.u + 0.6, c.v[1]]];
  return K.cut(V, [...a, ...b.reverse()], { mat: "solid" }) + K.line(V, mid, "thin paper-line") + K.cut(V, hook, { mat: "solid" }) + K.line(V, pig, "thin");
}

// ================================================================ VIEW F: the panel
export const PF = {
  w: 270,
  h: 92,
  sw: { alt: [8, 20], bat: [21, 33], avn: [52, 64], v: [42, 70] },
  key: { c: [104, 54], r: 14 },
  amm: { c: [168, 52], r: 28, sweep: 50, max: 60 },
  lv: { u: [214, 256], v: [56, 70] },
  cb: { v: 16, pitch: 23.4, u0: 17, r: 3.15, nut: 6.6 },
};
export const cbU = (i) => PF.cb.u0 + i * PF.cb.pitch;
export function panelPhantom(V) {
  return K.line(V, K.rect(0, 0, PF.w, PF.h), "phan", true);
}
// a rocker switch from the front: the paddle, ridged on the end that stands proud
export function rocker(V, [u0, u1], [v0, v1], on) {
  const mid = (v0 + v1) / 2;
  let out = K.body(V, K.rect(u0, v0, u1, v1)) + K.line(V, [[u0, mid], [u1, mid]], "thin");
  const proud = on ? [v0 + 3, mid - 3] : [mid + 3, v1 - 3];
  for (const v of range(proud[0], proud[1], 3)) out += K.line(V, [[u0 + 2, v], [u1 - 2, v]], "thin");
  return out;
}
export function ammeterNeedle(V, I) {
  const a = PF.amm;
  const ang = 90 - (Math.max(-1.08, Math.min(1.08, I / a.max)) * a.sweep);
  const [cx, cy] = a.c;
  const tip = [cx + Math.cos(ang * rad) * (a.r - 5), cy + Math.sin(ang * rad) * (a.r - 5)];
  const tail = [cx - Math.cos(ang * rad) * 5, cy - Math.sin(ang * rad) * 5];
  const n = [-Math.sin(ang * rad) * 0.9, Math.cos(ang * rad) * 0.9];
  return K.cut(V, [[tail[0] + n[0], tail[1] + n[1]], [tip[0], tip[1]], [tail[0] - n[0], tail[1] - n[1]]], { mat: "solid" }) + K.body(V, K.circle(cx, cy, 2.2, 16));
}
export function ammeterFace(V) {
  const a = PF.amm;
  const [cx, cy] = a.c;
  let ticks = "";
  for (let i = -6; i <= 6; i++) {
    const ang = (90 - (i / 6) * a.sweep) * rad;
    const r1 = a.r - 4;
    const r0 = i % 3 === 0 ? a.r - 9 : a.r - 7;
    ticks += K.line(V, [[cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0], [cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1]], i % 3 === 0 ? "vis" : "thin");
  }
  return K.body(V, K.circle(cx, cy, a.r, 64)) + K.line(V, K.circle(cx, cy, a.r - 2.2, 64), "thin", true) + ticks;
}
export const ammLabelAt = (i, r) => {
  const a = PF.amm;
  const ang = (90 - (i / 6) * a.sweep) * rad;
  return [a.c[0] + Math.cos(ang) * r, a.c[1] + Math.sin(ang) * r];
};
export function keySwitch(V, pos) {
  const k = PF.key;
  const ang = KEY_ANG[pos] ?? KEY_ANG.OFF;
  const [cx, cy] = k.c;
  const d = [Math.cos(ang * rad), Math.sin(ang * rad)];
  const n = [-d[1], d[0]];
  const bar = [[cx - d[0] * 9 + n[0] * 2.4, cy - d[1] * 9 + n[1] * 2.4], [cx + d[0] * 9 + n[0] * 2.4, cy + d[1] * 9 + n[1] * 2.4], [cx + d[0] * 9 - n[0] * 2.4, cy + d[1] * 9 - n[1] * 2.4], [cx - d[0] * 9 - n[0] * 2.4, cy - d[1] * 9 - n[1] * 2.4]];
  return K.line(V, K.circle(cx, cy, k.r, 48), "phan", true) + K.line(V, K.circle(cx, cy, 10.5, 40), "phan", true) + K.line(V, bar, "phan", true);
}
const KEY_ANG = { OFF: 180, R: 128, L: 90, BOTH: 52, START: 0 };
export const keyLabelAt = (pos, r = 21) => {
  const ang = KEY_ANG[pos] * rad;
  return [PF.key.c[0] + Math.cos(ang) * r, PF.key.c[1] + Math.sin(ang) * r];
};
export function breakerFace(V, i, popped) {
  const u = cbU(i);
  const v = PF.cb.v;
  let out = K.body(V, K.circle(u, v, PF.cb.nut, 6).map(([x, y]) => [x, y])) + K.body(V, K.circle(u, v, PF.cb.r, 24));
  if (popped) out += K.line(V, K.circle(u, v, PF.cb.r + 1.1, 24), "vis", true);
  return out;
}

// ================================================================ VIEW H: the pinion in the ring gear
// Involute spur teeth (20°) of module m on centre (cu, cv), teeth i0..i1 only (a ring gear's arc), one
// tooth centred at angle rot (degrees). shift: profile shift; the pinion's +0.4 is the ring's −0.4,
// so the centres stay at m(z1 + z2)/2 and the 11-tooth pinion is not undercut.
const inv = (a) => Math.tan(a) - a;
export function gearTeeth(cu, cv, z, m, rot, shift, i0, i1, steps = 5) {
  const rp = (m * z) / 2;
  const rb = rp * Math.cos(20 * rad);
  const ra = rp + (1 + shift) * m;
  const rf = rp - (1.25 - shift) * m;
  const half = (r) => Math.PI / (2 * z) + (2 * shift * Math.tan(20 * rad)) / z + inv(20 * rad) - inv(Math.acos(Math.min(1, rb / Math.max(r, rb))));
  const pts = [];
  const at = (r, a) => [cu + r * Math.cos(a), cv + r * Math.sin(a)];
  const pitch = (2 * Math.PI) / z;
  const r0 = Math.max(rb, rf);
  for (let i = i0; i <= i1; i++) {
    const c = rot * rad + i * pitch;
    const hb = half(r0);
    const g0 = c - pitch / 2;
    for (let j = 0; j <= 2; j++) pts.push(at(rf, g0 + ((c - hb - g0) * j) / 2));
    for (let j = 0; j <= steps; j++) {
      const r = r0 + ((ra - r0) * j) / steps;
      pts.push(at(r, c - half(r)));
    }
    for (let j = steps; j >= 0; j--) {
      const r = r0 + ((ra - r0) * j) / steps;
      pts.push(at(r, c + half(r)));
    }
    for (let j = 0; j <= 2; j++) pts.push(at(rf, c + hb + ((pitch / 2 - hb) * j) / 2));
  }
  return pts;
}
export const SHIFT = 0.4;
export const RING_SPAN = 9; // teeth either side of the mesh drawn
// the ring gear's arc, its centre CENTRES above the pinion's, turned by its pitch phase φ (rad)
export function ringArc(phi) {
  const z = M.RING.teeth;
  const pitchDeg = 360 / z;
  const rot = -90 + ((phi * 180) / Math.PI) % pitchDeg;
  const teeth = gearTeeth(0, M.CENTRES, z, M.MODULE, rot, -SHIFT, -RING_SPAN, RING_SPAN);
  const a0 = rot - (RING_SPAN + 0.5) * pitchDeg;
  const a1 = rot + (RING_SPAN + 0.5) * pitchDeg;
  const inner = K.arc(0, M.CENTRES, 128, a1, a0, 24);
  return [...teeth, ...inner];
}
// the pinion meshed with the ring at the ring's angle φ: a gap at its top takes the ring's tooth at the
// bottom, and it turns the other way, STARTER_RATIO times as fast (so its phase in its own pitches is
// the ring's phase in the ring's)
export function pinionGear(phi) {
  const z = M.PINION.teeth;
  const pitchP = 360 / z;
  const pitchR = 360 / M.RING.teeth;
  const rot = 90 + pitchP / 2 - (((phi * 180) / Math.PI) % pitchR) * M.STARTER_RATIO;
  return gearTeeth(0, 0, z, M.MODULE, rot, SHIFT, 0, z - 1);
}
