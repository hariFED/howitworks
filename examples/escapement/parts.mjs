// The escapement's parts, in world mm. Each function draws one part into a view and returns SVG,
// so the plan and its detail draw the same geometry at their own scale.
//
// Plan frame: origin at the pallet arbor P, u right, v up, seen from the dial side with the
// mainplate removed. Moving parts are drawn at rest (θ = 0, φ = 0, ψ = 0) and turned by the page.
// Section frame (SECTION A-A): u along the line of centres from the balance staff's axis, v = z up
// from the lower pivot's end.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;

const B = M.B;
const E = M.E;
const RAD = Math.PI / 180;
const at = (c, r, a) => [c[0] + r * Math.cos(a * RAD), c[1] + r * Math.sin(a * RAD)];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const unit = (a, b) => {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};

// A body with holes: paper with the holes left open (even-odd), and every edge thick.
function holed(V, outer, holes) {
  const dd = K.d(V, outer) + holes.map((h) => K.d(V, h)).join("");
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
}

// ---------------------------------------------------------------- balance (plan, B frame at θ = 0)

// Rim, three arms and the hub: one Glucydur casting, seen from below. The rim is round, so it is
// drawn fixed; the arms and hub turn (balanceArms), and the rim covers the arms' outer ends.
export function balanceRim(V) {
  const { ro, ri } = M.BAL;
  return part(9, holed(V, K.circle(B[0], B[1], ro, 120), [K.circle(B[0], B[1], ri, 120)]) + K.line(V, K.circle(B[0], B[1], ro - 0.08, 120), "thin", true));
}
export function balanceArms(V) {
  const { ri, armW, hub } = M.BAL;
  let out = "";
  for (const a of [90, 210, 330]) {
    const c = Math.cos(a * RAD);
    const sn = Math.sin(a * RAD);
    const p = (r, w) => [B[0] + r * c - w * sn, B[1] + r * sn + w * c];
    out += K.body(V, [p(hub, -armW / 2), p(ri + 0.04, -armW / 2), p(ri + 0.04, armW / 2), p(hub, armW / 2)]);
  }
  out += K.body(V, K.circle(B[0], B[1], hub + 0.12, 32));
  return part(9, out);
}
export const balance = (V) => balanceArms(V) + balanceRim(V);

// The collar of the staff under the balance hub, seen end-on; rotation-invariant.
export function staffPlan(V) {
  return part(8, K.body(V, K.circle(B[0], B[1], 0.4, 32)) + K.line(V, K.circle(B[0], B[1], 0.22, 24), "thin", true)) +
    part(8, K.body(V, K.circle(B[0], B[1], 0.12, 20)) + K.body(V, K.circle(B[0], B[1], 0.045, 12)));
}

// Hairspring: an Archimedean spiral from the collet to the stud. The inner end turns with the
// balance, the outer end is held, so the coils wind up and open out as it swings.
export const STUD_A = 52; // degrees, where the outer end is pinned
export function spiral(th, steps = 7) {
  const { r0, r1 } = M.HS;
  const aIn = STUD_A - 360 * M.HS_TURNS + th;
  const sweep = STUD_A - aIn;
  const n = Math.ceil(Math.abs(sweep) / steps);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    pts.push(at(B, r0 + (r1 - r0) * s, aIn + sweep * s));
  }
  return pts;
}
export function hairspring(V, th) {
  return part(10, K.line(V, spiral(th), "vis"));
}

export function stud(V) {
  const r = M.HS.r1;
  const c = at(B, r + 0.08, STUD_A + 2);
  const radial = [Math.cos((STUD_A + 2) * RAD), Math.sin((STUD_A + 2) * RAD)];
  const tang = [-radial[1], radial[0]];
  const corner = (a, b) => add(add(c, radial, a), tang, b);
  const block = [corner(-0.24, -0.2), corner(0.26, -0.2), corner(0.26, 0.2), corner(-0.24, 0.2)];
  return part(12, K.body(V, block) + K.body(V, K.circle(...corner(0.12, 0), 0.07, 12)));
}

export function collet(V) {
  const ring = K.circle(B[0], B[1], 0.6, 40);
  const bore = K.circle(B[0], B[1], 0.25, 24);
  const slot = [at(B, 0.27, 176), at(B, 0.6, 178), at(B, 0.6, 182), at(B, 0.27, 184)];
  return part(11, holed(V, ring, [bore]) + K.line(V, slot, "thin", true));
}

// ---------------------------------------------------------------- double roller and impulse jewel

export function rollerTable(V) {
  // The impulse roller's table: the jewel sits in a hole at its edge.
  return part(13, K.body(V, K.circle(B[0], B[1], 1.0, 60)) + K.line(V, K.circle(B[0], B[1], 0.32, 24), "thin", true));
}

export function safetyRoller(V) {
  const r = 0.45;
  // the passing crescent, a notch facing the jewel
  const a = 22;
  const out = [...K.arc(B[0], B[1], r, -180 + a, 180 - a, 40), ...K.arc(B[0] - r - 0.02, B[1], 0.2, 70, -70, 10)];
  return part(13, K.body(V, out));
}

export function jewelPlan(V) {
  // D-section ruby pin, the flat facing the staff
  const c = [B[0] - M.R_JEWEL, 0];
  const r = 0.14;
  const flat = 0.07;
  const a = Math.acos(flat / r) / RAD;
  const pts = K.arc(c[0], c[1], r, a, 360 - a, 28);
  return part(14, K.body(V, pts));
}

// ---------------------------------------------------------------- escape wheel and pinion

export function wheelOutline() {
  const out = [];
  for (let k = 0; k < M.TEETH; k++) {
    const tooth = M.toothLocal(k).map((p) => add(p, E));
    out.push(...tooth);
    const a0 = 30 + M.PITCH * k + M.ROOT_BACK;
    const a1 = 30 + M.PITCH * (k + 1) + M.ROOT_FRONT;
    out.push(...K.arc(E[0], E[1], M.R_ROOT, a0, a1, 8).slice(1, -1));
  }
  return out;
}

export function wheel(V) {
  const arms = 5;
  const armW = 0.22;
  const hub = 0.5;
  const holes = [];
  for (let i = 0; i < arms; i++) {
    const a0 = 90 + (360 / arms) * i;
    const a1 = a0 + 360 / arms;
    const so = Math.asin(armW / 2 / M.R_RIM) / RAD;
    const sh = Math.asin(armW / 2 / (hub + 0.06)) / RAD;
    holes.push([...K.arc(E[0], E[1], M.R_RIM, a0 + so, a1 - so, 14), ...K.arc(E[0], E[1], hub + 0.06, a1 - sh - 8, a0 + sh + 8, 6)]);
  }
  return part(20, holed(V, wheelOutline(), holes) + K.line(V, K.circle(E[0], E[1], hub, 36), "thin", true));
}

// One tooth's outline, for the accent on the tooth at work.
export const toothShape = (k) => M.toothLocal(k).map((p) => add(p, E));

export function pinion(V) {
  const leaves = 7;
  const ro = 0.43;
  const rr = 0.27;
  const pts = [];
  for (let i = 0; i < leaves; i++) {
    const a = (360 / leaves) * i + 12;
    const w = 360 / leaves;
    pts.push(...K.arc(E[0], E[1], rr, a - w * 0.5, a - w * 0.22, 3));
    pts.push(...K.arc(E[0], E[1], ro, a - w * 0.14, a + w * 0.14, 4));
    pts.push(...K.arc(E[0], E[1], rr, a + w * 0.22, a + w * 0.5, 3).slice(0, -1));
  }
  return part(21, K.body(V, pts) + K.body(V, K.circle(E[0], E[1], 0.12, 20)) + K.body(V, K.circle(E[0], E[1], 0.045, 12)));
}

// ---------------------------------------------------------------- pallet fork (P frame, φ = 0)

export const LEVER_HW = (u) => 0.25 - (0.25 - 0.15) * Math.max(0, Math.min(1, (u - 0.6) / 2.7));
export const GUARD_TIP = M.D_PB - 0.5;
const SLOT_W = 0.3;
const SLOT_BOTTOM = M.FORK_L - 0.2;
const HORN_END = M.FORK_L + 0.32;

// One stone's frame: L locking corner, X exit corner, f along the stone, outward.
function stoneFrame(st) {
  const [L, X, Xb, Lb] = st;
  const f = unit(L, Lb);
  const nL = [f[1], -f[0]]; // a normal; its side is checked against X below
  const side = (X[0] - L[0]) * nL[0] + (X[1] - L[1]) * nL[1] > 0 ? -1 : 1;
  return { L, X, Xb, Lb, f, out: [nL[0] * side, nL[1] * side] }; // out: away from X, past the locking face
}

const S0 = 0.42; // the stones stand this far proud of the pallet body
const S1 = 1.33;
const RIM = 0.1;
function armCorners(st) {
  const s = stoneFrame(st);
  const inw = [-s.out[0], -s.out[1]];
  return {
    l0: add(add(s.L, s.f, S0), s.out, RIM),
    l1: add(add(s.L, s.f, S1), s.out, RIM),
    x0: add(add(s.X, s.f, S0), inw, RIM),
    x1: add(add(s.X, s.f, S1), inw, RIM),
  };
}

// The fork head, upper half (v ≥ 0), from the lever's end round the horn into the slot.
function headUpper() {
  const u0 = 3.3;
  const hw = LEVER_HW(u0);
  return [
    [u0, hw],
    [SLOT_BOTTOM - 0.18, 0.3],
    [M.FORK_L - 0.02, 0.38],
    [M.FORK_L + 0.18, 0.37],
    [HORN_END, 0.3],
    [HORN_END + 0.02, 0.24],
    [HORN_END - 0.06, SLOT_W / 2 + 0.04],
    [M.FORK_L + 0.1, SLOT_W / 2],
    [SLOT_BOTTOM + SLOT_W / 2, SLOT_W / 2],
  ];
}
function slotBottom() {
  return K.arc(SLOT_BOTTOM + SLOT_W / 2, 0, SLOT_W / 2, 90, 270, 8);
}

export function palletOutline() {
  const en = armCorners(M.STONE_ENTRY);
  const ex = armCorners(M.STONE_EXIT);
  const up = headUpper();
  const low = up.map(([u, v]) => [u, -v]).reverse();
  // the inner edge faces the wheel: an arc about E, clear of the heels' circle
  const rIn = M.R_OUT + 0.14;
  const aEx = Math.atan2(ex.l0[1] - E[1], ex.l0[0] - E[0]) / RAD;
  const aEn = Math.atan2(en.x0[1] - E[1], en.x0[0] - E[0]) / RAD;
  const inner = K.arc(E[0], E[1], rIn, aEx + 1.5, aEn - 1.5, 16);
  return [
    en.l0,
    en.l1,
    en.x1,
    [0.78, 0.95],
    [0.72, LEVER_HW(0.72) + 0.12],
    [1.0, LEVER_HW(1.0)],
    ...up,
    ...slotBottom(),
    ...low,
    [1.0, -LEVER_HW(1.0)],
    [0.72, -LEVER_HW(0.72) - 0.12],
    [0.62, -1.1],
    ex.l1,
    ex.x1,
    ex.x0,
    ex.l0,
    ...inner,
    en.x0,
  ];
}

export function pallet(V) {
  const body = palletOutline();
  const pinHole = K.circle(0, 0, 0.16, 24);
  return part(15, holed(V, body, [pinHole]) + K.line(V, K.circle(0, 0, 0.3, 28), "thin", true));
}

export const stoneEntry = (V) => part(17, K.body(V, M.STONE_ENTRY));
export const stoneExit = (V) => part(18, K.body(V, M.STONE_EXIT));

export function arborPlan(V) {
  return part(16, K.body(V, K.circle(0, 0, 0.16, 24)) + K.body(V, K.circle(0, 0, 0.045, 12)));
}

// Guard pin under the fork, pointing at the safety roller (nearer the viewer than the fork).
export function guardPinPlan(V) {
  const r = 0.05;
  const pts = [[SLOT_BOTTOM - 0.28, -r], [GUARD_TIP - 0.03, -r], [GUARD_TIP, -r + 0.03], [GUARD_TIP, r - 0.03], [GUARD_TIP - 0.03, r], [SLOT_BOTTOM - 0.28, r]];
  return part(19, K.body(V, pts));
}

// The fork's outline at a banking, in phantom lines.
export function forkPhantom(V, phi) {
  const up = headUpper();
  const low = up.map(([u, v]) => [u, -v]).reverse();
  const pts = [[0.95, LEVER_HW(0.95)], ...up, ...slotBottom(), ...low, [0.95, -LEVER_HW(0.95)]];
  return K.line(V, M.rotate(pts, phi), "phan", false);
}

export const BANK_U = 1.0;
export const BANK_R = 0.15;
export const bankCentre = (sign) => M.rotate([[BANK_U, sign * (LEVER_HW(BANK_U) + BANK_R)]], sign * M.BANK)[0];
export function bankingPins(V) {
  return part(22, [1, -1].map((s) => K.cut(V, K.circle(...bankCentre(s), BANK_R, 24), { mat: "steel", angle: 45 })).join(""));
}

// ---------------------------------------------------------------- SECTION A-A (B frame, z up)

const Z = {
  plateLo: -0.45,
  plateHi: 0.35,
  safety: [0.72, 0.92],
  table: [1.2, 1.42],
  fork: [0.94, 1.12],
  rim: [1.45, 1.95],
  hub: [1.58, 1.88],
  collet: [2.25, 2.5],
  hs: [2.32, 2.44],
  cockLo: 2.8,
  cockHi: 3.55,
  tipTop: 3.08,
};
export const SZ = Z;

// Half-profile of the staff: [r, z], one edge on the axis.
const STAFF = [
  [0, 0],
  [0.03, 0],
  [0.045, 0.02],
  [0.045, 0.26],
  [0.12, 0.42],
  [0.2, 0.46],
  [0.22, 0.5],
  [0.22, 1.43],
  [0.4, 1.45],
  [0.4, 1.55],
  [0.3, 1.56],
  [0.3, 1.88],
  [0.36, 1.89],
  [0.33, 1.95],
  [0.25, 1.96],
  [0.25, 2.62],
  [0.12, 2.74],
  [0.045, 2.8],
  [0.045, Z.tipTop - 0.02],
  [0.03, Z.tipTop],
  [0, Z.tipTop],
];
export function staffSec(V) {
  const pts = [...STAFF.map(([r, z]) => [r, z]), ...STAFF.slice(1, -1).reverse().map(([r, z]) => [-r, z])];
  return part(8, K.body(V, pts) + K.lines(V, [[[-0.22, 0.5], [0.22, 0.5]], [[-0.25, 2.62], [0.25, 2.62]], [[-0.045, 0.26], [0.045, 0.26]], [[-0.045, 2.8], [0.045, 2.8]]], "thin"));
}

// One shock-absorbing bearing, drawn about z0 (the face the pivot's shoulder looks at); dir +1 for
// the upper bearing (pivot pointing up), −1 for the lower.
function bearingParts(dir, zEnd) {
  // zEnd is the pivot's end; everything is laid out from it along dir
  const z = (dz) => zEnd + dir * dz;
  const rv = (r0, r1, a, b) => K.rect(r0, Math.min(z(a), z(b)), r1, Math.max(z(a), z(b)));
  const ring = (pts) => pts.map(([r, dz]) => [r, z(dz)]);
  return {
    // block: a bush pressed into the plate or cock, with a groove that holds the lyre spring's ends
    block: ring([[0.25, -0.32], [0.95, -0.32], [0.95, 0.26], [0.8, 0.26], [0.8, 0.21], [0.86, 0.21], [0.86, 0.14], [0.62, 0.14], [0.62, -0.28], [0.25, -0.28]]),
    chaton: ring([[0.25, -0.28], [0.6, -0.28], [0.6, 0.02], [0.5, 0.02], [0.5, -0.25], [0.25, -0.25]]),
    hole: ring([[0.05, -0.25], [0.5, -0.25], [0.5, -0.05], [0.08, -0.05], [0.05, -0.12]]),
    cap: rv(-0.5, 0.5, 0.02, 0.14),
    lyre: rv(0.1, 0.84, 0.14, 0.19),
  };
}
const mirror = (pts) => pts.map(([u, v]) => [-u, v]).reverse();
const both = (V, pts, opts) => K.cut(V, pts, opts) + K.cut(V, mirror(pts), opts);

export function bearing(V, dir) {
  const b = bearingParts(dir, dir > 0 ? Z.tipTop : 0);
  return (
    part(3, both(V, b.block, { mat: "steel", angle: 135 })) +
    part(4, both(V, b.chaton, { mat: "brass", angle: 30 })) +
    part(5, both(V, b.hole, { mat: "plastic", angle: 60 })) +
    part(6, K.cut(V, b.cap, { mat: "plastic", angle: 135 })) +
    part(7, both(V, b.lyre, { mat: "solid" }))
  );
}

export function plateSec(V) {
  const L = [[-3.8, Z.plateLo], [-0.95, Z.plateLo], [-0.95, Z.plateHi], [-3.8, Z.plateHi]];
  return part(1, both(V, mirror(L).map(([u, v]) => [u, v]), { mat: "brass", angle: 45 }));
}

export function cockSec(V) {
  const right = [[0.95, Z.cockLo], [3.4, Z.cockLo], [3.4, Z.cockHi], [0.95, Z.cockHi]];
  const left = [[-1.7, Z.cockLo + 0.12], [-1.58, Z.cockLo], [-0.95, Z.cockLo], [-0.95, Z.cockHi], [-1.58, Z.cockHi], [-1.7, Z.cockHi - 0.12]];
  return part(2, K.cut(V, right, { mat: "brass", angle: 45 }) + K.cut(V, left, { mat: "brass", angle: 45 }));
}

export function balanceSec(V) {
  const { ro, ri, hub } = M.BAL;
  const rim = K.rect(ri, Z.rim[0], ro, Z.rim[1]);
  const hubR = [[0.3, Z.hub[0]], [hub + 0.12, Z.hub[0]], [hub + 0.12, Z.hub[1]], [0.3, Z.hub[1]]];
  // the arm behind the plane, seen edge-on from the hub to the rim
  const arm = [[[hub + 0.12, Z.hub[0]], [ri, Z.hub[0]]], [[hub + 0.12, Z.hub[1]], [ri, Z.hub[1]]]];
  return part(9, both(V, rim, { mat: "bronze", angle: 45 }) + both(V, hubR, { mat: "bronze", angle: 45 }) + K.lines(V, [...arm, ...arm.map((l) => l.map(([u, v]) => [-u, v]))], "vis"));
}

export function colletSec(V) {
  const c = [[0.25, Z.collet[0]], [0.6, Z.collet[0]], [0.6, Z.collet[1]], [0.25, Z.collet[1]]];
  return part(11, both(V, c, { mat: "brass", angle: 135 }));
}

// Where the spiral crosses the cutting plane at rest: right (0°) and left (180°).
export function hsCrossings() {
  const pts = spiral(0, 1);
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const [u0, v0] = [pts[i - 1][0] - B[0], pts[i - 1][1]];
    const [u1, v1] = [pts[i][0] - B[0], pts[i][1]];
    if (v0 === 0 || v0 * v1 < 0) out.push(u0 + ((u1 - u0) * v0) / (v0 - v1));
  }
  return out;
}
export function hairspringSec(V) {
  const h = M.HS.h / 2;
  return part(10, hsCrossings().filter((u) => Math.abs(u) > 0.62).map((u) => K.cut(V, K.rect(u - h, Z.hs[0], u + h, Z.hs[1]), { mat: "solid" })).join(""));
}

export function rollerSec(V) {
  const notch = 0.33;
  const right = [[0.22, Z.safety[0]], [0.45, Z.safety[0]], [0.45, Z.safety[1]], [0.32, Z.safety[1]], [0.32, Z.table[0]], [1.0, Z.table[0]], [1.0, Z.table[1]], [0.22, Z.table[1]]];
  const jr = 0.14;
  const left = [[-0.22, Z.table[1]], [-(M.R_JEWEL - jr), Z.table[1]], [-(M.R_JEWEL - jr), Z.table[0]], [-0.32, Z.table[0]], [-0.32, Z.safety[1]], [-notch, Z.safety[1]], [-notch, Z.safety[0]], [-0.22, Z.safety[0]]];
  const lip = [[-(M.R_JEWEL + jr), Z.table[0]], [-1.0, Z.table[0]], [-1.0, Z.table[1]], [-(M.R_JEWEL + jr), Z.table[1]]];
  return part(13, K.cut(V, right, { mat: "steel", angle: 45 }) + K.cut(V, left, { mat: "steel", angle: 45 }) + K.cut(V, lip, { mat: "steel", angle: 45 }) + K.line(V, [[-0.45, Z.safety[0]], [-0.45, Z.safety[1]]], "vis"));
}

export function jewelSec(V) {
  const jr = 0.14;
  const u = -M.R_JEWEL;
  return part(14, K.body(V, [[u - jr, 0.97], [u - jr + 0.02, 0.95], [u + jr - 0.02, 0.95], [u + jr, 0.97], [u + jr, Z.table[1]], [u - jr, Z.table[1]]]));
}

// The fork, cut along its axis: the plate ends at the slot bottom; the horn beyond is behind the plane.
export function forkSec(V) {
  const uB = (u) => u - M.D_PB;
  const plate = [[uB(1.6), Z.fork[0]], [uB(SLOT_BOTTOM), Z.fork[0]], [uB(SLOT_BOTTOM), Z.fork[1]], [uB(1.6), Z.fork[1]]];
  const horn = K.rect(uB(SLOT_BOTTOM), Z.fork[0], uB(HORN_END), Z.fork[1]);
  return part(15, K.line(V, horn, "vis", true) + K.cut(V, plate, { mat: "steel", angle: 30 }));
}

export function guardPinSec(V) {
  const uB = (u) => u - M.D_PB;
  const z0 = Z.fork[0] - 0.1;
  return part(19, K.body(V, [[uB(SLOT_BOTTOM - 0.28), z0], [uB(GUARD_TIP) - 0.02, z0], [uB(GUARD_TIP), z0 + 0.02], [uB(GUARD_TIP), Z.fork[0] - 0.02], [uB(GUARD_TIP) - 0.02, Z.fork[0]], [uB(SLOT_BOTTOM - 0.28), Z.fork[0]]]));
}
