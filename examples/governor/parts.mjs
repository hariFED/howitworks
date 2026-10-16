// The governor's parts in world mm: u right, v up, the spindle axis at u = 0 and the drive-shaft
// axis at v = 0. Each function draws one part into a view and returns SVG, so the main view and the
// details draw the same geometry at their own scale. Parts that move take the arm angle α (deg)
// and are redrawn each frame from the model's linkage; nothing is typed twice.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner) => `<g data-part="${id}">${inner}</g>`;

const rad = (d) => (d * Math.PI) / 180;
const mirror = (pts) => K.flipU(pts, 0);
const atU = (pts, du) => K.move(pts, du, 0);

// A cut face that may have holes: the first loop is the outline, the rest are holes (reversed).
function cutHoles(V, loops, { mat = "steel", angle = 45 } = {}) {
  const dd = loops.map((p, i) => K.d(V, i ? [...p].reverse() : p)).join("");
  return `<path class="paper" d="${dd}"/><path fill="url(#h-${mat}-${angle})" d="${dd}"/><path class="vis" d="${dd}"/>`;
}

// A forged link between two pins: eyes of radius R, a shank of half-width h, one outline.
export function linkOutline(A, B, R, h) {
  const th = Math.atan2(B[1] - A[1], B[0] - A[0]) * (180 / Math.PI);
  const c = Math.sqrt(R * R - h * h);
  const be = (Math.atan2(h, c) * 180) / Math.PI;
  const t = rad(th);
  const d = [Math.cos(t), Math.sin(t)];
  const n = [-d[1], d[0]];
  const P = (O, x, y) => [O[0] + d[0] * x + n[0] * y, O[1] + d[1] * x + n[1] * y];
  return [P(A, c, h), P(B, -c, h), ...K.arc(B[0], B[1], R, th + 180 - be, th - 180 + be).slice(1, -1), P(B, -c, -h), P(A, c, -h), ...K.arc(A[0], A[1], R, th - be, th - 360 + be).slice(1, -1)];
}

// A pin seen end-on, cut across: a small hatched disc.
export const pinEnd = (V, c, angle = 45, r = 5) => K.cut(V, K.circle(c[0], c[1], r, 20), { mat: "steel", angle });

// ---------------------------------------------------------------- the pose of everything that moves
export function pose(a) {
  const lug = M.lug(a);
  const ball = M.ballC(a);
  const C = M.pinC(a);
  const psi = M.crankTurn(a);
  const E = M.pinE(psi);
  const G = M.pinG(a);
  return { a, lug, ball, C, psi, E, G, lift: M.valveLift(a) };
}

// ---------------------------------------------------------------- gear case and drive

export const BASE_V = -84; // the case stands on the engine bed here
export const VALVE_BASE = -72; // and the valve on a raised pad of the bed

export function gearCase(V) {
  const upperLeft = [[-100, 16], [-76, 16], [-76, 84], [-12.5, 84], [-12.5, 160], [-26, 160], [-26, 104], [-32, 98], [-100, 98]];
  const rest = [
    [12.5, 160], [12.5, 84], [50, 84], [50, 16], [74, 16], [74, -16], [50, -16], [50, -68], [-76, -68], [-76, -16], [-100, -16],
    [-100, -74], [-135, -74], [-135, -84], [100, -84], [100, -74], [62, -74], [62, -22], [86, -22], [86, 22], [62, 22], [62, 98], [32, 98], [26, 104], [26, 160],
  ];
  const holes = [-118, 82].map((u) => K.lines(V, [[[u - 5, -84], [u - 5, -74]], [[u + 5, -84], [u + 5, -74]]], "hid")).join("");
  return part(1, K.cut(V, upperLeft, { mat: "iron", angle: 45 }) + K.cut(V, rest, { mat: "iron", angle: 45 }) + holes);
}

export function shaftBushes(V) {
  const ring = (u0, u1) => K.revolve([[12.5, u0], [16, u0], [16, u1], [12.5, u1]], { axis: "u", at: 0 });
  return part(5, K.section(V, { ...ring(-100, -76), edges: [] }, { mat: "bronze", angle: 135 }) + K.section(V, { ...ring(52, 74), edges: [] }, { mat: "bronze", angle: 135 }));
}

export function driveShaft(V) {
  const s = [[-176, -11.5], [-175, -12.5], [72, -12.5], [73, -11.5], [73, 11.5], [72, 12.5], [-175, 12.5], [-176, 11.5]];
  return part(2, K.body(V, s) + K.line(V, [[-175, -12.5], [-175, 12.5]], "thin"));
}

export function keys(V) {
  const k = (u0, u1, v0, v1) => K.body(V, K.rect(u0, v0, u1, v1));
  return part(7, k(-158, -137, 9, 16) + k(-70, -51, 9, 16) + k(9, 16, 50, 79));
}

export function pulley(V) {
  const loop = [[12.5, -162], [22, -162], [22, -152], [52, -152], [54, -154], [54, -170], [59, -170], [60, -147.5], [59, -125], [54, -125], [54, -141], [52, -143], [22, -143], [22, -133], [12.5, -133]];
  const rev = K.revolve(loop, { axis: "u", at: 0 });
  return part(6, K.section(V, { ...rev, edges: [] }, { mat: "iron", angle: 135 }));
}

// Bevel pair, module 4, shafts at 90°, pitch cone apex at the origin, face width 20.
// The wheel (30 teeth, Ø120) is on the drive shaft; the pinion (20 teeth, Ø80) on the spindle.
// Teeth are not hatched; the blanks are. Points are [r, s]: r from the gear's own axis.
export const WHEEL_TEETH = [[41.35, -31.9], [44.95, -26.5], [62.2, -36.7], [57.2, -44.2]];
export const PINION_TEETH = [[25.9, 45.35], [31.3, 41.75], [43.3, 57.8], [35.8, 62.8]];
export function bevelWheel(V) {
  const blank = [[12.5, -27], [38, -27], [41.35, -31.9], [57.2, -44.2], [54.7, -48], [28, -48], [28, -72], [12.5, -72]];
  const onU = (loop) => K.revolve(loop, { axis: "u", at: 0 });
  return part(3, K.section(V, { ...onU(blank), edges: [] }, { mat: "steel", angle: 45 }) + onU(WHEEL_TEETH).cuts.map((c) => K.body(V, c)).join(""));
}

export function bevelPinion(V) {
  const blank = [[12.5, 42], [25, 42], [25.9, 45.35], [35.8, 62.8], [28, 68], [20, 68], [20, 82], [12.5, 82]];
  // where the pinion's teeth cover the wheel's, the wheel's tip edge is hidden
  return part(4, K.section(V, { ...K.revolve(blank), edges: [] }, { mat: "steel", angle: 135 }) + K.revolve(PINION_TEETH).cuts.map((c) => K.body(V, c)).join("") + K.line(V, [[-26.5, 44.95], [-36.7, 62.2]], "hid"));
}

export function pitchLines(V) {
  return K.lines(V, [[[0, 0], [-42, 63]], [[0, 0], [42, 63]], [[0, 0], [-42, -63]]], "ctr");
}

// ---------------------------------------------------------------- spindle and head

export function spindle(V) {
  const s = [[-12.5, 43], [-11.5, 42], [11.5, 42], [12.5, 43], [12.5, 530], [10, 530], [10, 581], [9, 582], [-9, 582], [-10, 581], [-10, 530], [-12.5, 530]];
  return part(8, K.body(V, s) + K.lines(V, [[[-8.4, 562], [-8.4, 580]], [[8.4, 562], [8.4, 580]]], "thin"));
}

const collarLoop = (v0) => [[12.5, v0], [21, v0], [22, v0 + 1], [22, v0 + 13], [21, v0 + 14], [12.5, v0 + 14]];
export const STOP_LO = M.lug(M.ALPHA_MIN) + M.SLEEVE.bot - 14; // the lower collar's underside
export const STOP_HI = M.lug(M.ALPHA_MAX) + M.SLEEVE.top; // the upper collar's underside

export function stopCollars(V) {
  const one = (v0) => K.section(V, { ...K.revolve(collarLoop(v0)), edges: [] }, { mat: "steel", angle: 135 }) + K.line(V, K.rect(16, v0 + 4, 22, v0 + 10), "hid", true);
  return part(9, one(STOP_LO) + one(STOP_HI));
}

export function head(V) {
  const vt = M.VT;
  const half = [[10, vt - 20], [17, vt - 20], [17, vt - 10], [29, vt - 10], [31, vt - 8], [31, vt + 8], [29, vt + 10], [17, vt + 10], [17, vt + 12], [10, vt + 12]];
  return part(10, K.cut(V, half, { mat: "steel", angle: 45 }) + K.cut(V, mirror(half), { mat: "steel", angle: 45 }));
}

export function topNut(V) {
  const v0 = M.VT + 12;
  const n = [[-15, v0], [15, v0], [15, v0 + 14], [13.5, v0 + 16], [-13.5, v0 + 16], [-15, v0 + 14]];
  return part(11, K.body(V, n) + K.lines(V, [[[-7.5, v0], [-7.5, v0 + 16]], [[7.5, v0], [7.5, v0 + 16]]], "thin"));
}

export const headPins = (V) => part(15, pinEnd(V, [M.OFFSET, M.VT], 135) + pinEnd(V, [-M.OFFSET, M.VT], 135));

// ---------------------------------------------------------------- the flying parts

export function arms(V, P) {
  const [br, bv] = P.ball;
  const out = [1, -1].map((s) => K.body(V, linkOutline([s * M.OFFSET, M.VT], [s * br, bv], 8, 5.5))).join("");
  return part(12, out);
}

export function links(V, P) {
  const [br, bv] = P.ball;
  const out = [1, -1].map((s) => K.body(V, linkOutline([s * br, bv], [s * M.OFFSET, P.lug], 7, 4.5))).join("");
  return part(14, out);
}

export function balls(V, P, tint = true) {
  const [br, bv] = P.ball;
  let out = "";
  for (const s of [1, -1]) {
    const c = K.circle(s * br, bv, M.BALL_D / 2, 64);
    out += K.body(V, c);
    if (tint) out += `<path class="tint ball-tint" d="${K.d(V, c)}"/>`;
  }
  return part(13, out);
}

export const ballPins = (V, P) => part(15, [1, -1].map((s) => pinEnd(V, [s * P.ball[0], P.ball[1]], 135) + pinEnd(V, [s * M.OFFSET, P.lug], 135)).join(""));

export function sleeveLoop(lug) {
  const S = M.SLEEVE;
  return [
    [S.bore, lug + S.bot], [S.neckR - 1, lug + S.bot], [S.neckR, lug + S.bot + 1], [S.neckR, lug + S.grooveLo], [S.grooveR, lug + S.grooveLo], [S.grooveR, lug + S.grooveHi],
    [S.neckR, lug + S.grooveHi], [S.neckR, lug + S.bodyBot - 4], [S.neckR + 4, lug + S.bodyBot], [S.bodyR - 3, lug + S.bodyBot], [S.bodyR, lug + S.bodyBot + 3],
    [S.bodyR, lug + S.bodyTop - 3], [S.bodyR - 3, lug + S.bodyTop], [S.hubR, lug + S.bodyTop], [S.hubR, lug + S.top - 2], [S.hubR - 2, lug + S.top], [S.bore, lug + S.top],
  ];
}

export function sleeve(V, P) {
  return part(16, K.section(V, { ...K.revolve(sleeveLoop(P.lug)), edges: [] }, { mat: "iron", angle: 45 }));
}

// The split swivel collar in the sleeve's groove; it does not turn. Its forked lug (two cheeks,
// in front of and behind the plane) carries pin C; the crank's slotted end runs between them,
// so the section cuts the ring and the crank, and shows the far cheek in outline.
export function collar(V, P) {
  const v = P.lug;
  const lo = v + M.SLEEVE.grooveLo + 0.5;
  const hi = v + M.SLEEVE.grooveHi - 0.5;
  const c = P.C[1];
  const cheek = [[37, c - 6], [M.PIN_C_U, c - 6], ...K.arc(M.PIN_C_U, c, 6, -90, 90, 10).slice(1, -1), [M.PIN_C_U, c + 6], [37, c + 6]];
  const ring = [[20.5, lo], [37.5, lo], [39, lo + 1.5], [39, hi - 1.5], [37.5, hi], [20.5, hi]];
  return part(17, K.body(V, cheek) + K.cut(V, ring, { mat: "bronze", angle: 135 }) + K.cut(V, mirror(ring), { mat: "bronze", angle: 135 }));
}

export const collarPin = (V, P) => part(15, pinEnd(V, P.C, 45));

// The bell crank, drawn level and turned by ψ about the fulcrum F. The long arm's slot takes pin C.
// One outline, anticlockwise: long arm underside, hub, short arm out to its eye, hub, long arm top.
export function crankShape() {
  const [fu, fv] = M.F;
  const hw = 7; // long arm half-width
  const h2 = 6.5; // short arm half-width
  const R = 14; // hub
  const Re = 9; // eye at E
  const a2 = M.ARM2_AT;
  const d2 = [Math.cos(rad(a2)), Math.sin(rad(a2))];
  const E = [fu + M.ARM2 * d2[0], fv + M.ARM2 * d2[1]];
  const xh = Math.sqrt(R * R - h2 * h2);
  const bh = (Math.atan2(h2, xh) * 180) / Math.PI;
  const xe = Math.sqrt(Re * Re - h2 * h2);
  const be = (Math.atan2(h2, xe) * 180) / Math.PI;
  const ah = (Math.atan2(hw, Math.sqrt(R * R - hw * hw)) * 180) / Math.PI;
  const tip = fu - 138; // centre of the long arm's rounded end
  const outline = [
    [tip, fv - hw],
    ...K.arc(fu, fv, R, 180 + ah, a2 - bh, 6),
    ...K.arc(E[0], E[1], Re, a2 + 180 + be, a2 + 540 - be, 14),
    ...K.arc(fu, fv, R, a2 + bh, 540 - ah, 14),
    [tip, fv + hw],
    ...K.arc(tip, fv, hw, 90, 270, 8).slice(1, -1),
  ];
  const slot = [...K.arc(fu - 121, fv, 5.4, -90, 90, 6), ...K.arc(fu - 135, fv, 5.4, 90, 270, 6)];
  return { outline, slot, E };
}

export function bellCrank(V, P) {
  const { outline, slot } = crankShape();
  const [fu, fv] = M.F;
  const turn = (pts) => pts.map(([u, v]) => {
    const c = Math.cos(P.psi);
    const s = Math.sin(P.psi);
    return [fu + (u - fu) * c - (v - fv) * s, fv + (u - fu) * s + (v - fv) * c];
  });
  return part(18, cutHoles(V, [turn(outline), turn(slot)], { mat: "iron", angle: 135 }));
}

export const crankPins = (V, P) => part(15, pinEnd(V, M.F) + pinEnd(V, P.E) + pinEnd(V, P.G));

export function valveLink(V, P) {
  return part(19, K.body(V, linkOutline(P.E, P.G, 8, 4.5)));
}

// ---------------------------------------------------------------- the throttle valve (axis u = UV)

const UV = M.UV;
const L = (pts) => atU(pts, UV);
const LM = (pts) => atU(mirror(pts), UV);

export function valveBody(V) {
  const rLow = [[30, -72], [72, -72], [72, -62], [44, -62], [44, -44], [88, -44], [88, -70], [100, -70], [100, -30], [32, -30], [32, -40], [30, -40]];
  const rUp = [[100, 8], [34, 8], [34, 10], [36, 10], [36, 20], [40, 20], [40, 40], [72, 40], [72, 28], [50, 28], [50, 18], [88, 18], [88, 48], [100, 48]];
  const lIn = [[-34, 8], [-34, 10], [-36, 10], [-36, 20], [-50, 20], [-50, -46], [-30, -46], [-30, -40], [-32, -40], [-32, -30], [-44, -30], [-44, 8]];
  const lOut = [[-30, -72], [-72, -72], [-72, 40], [-40, 40], [-40, 34], [-62, 34], [-62, -56], [-30, -56]];
  const o = { mat: "iron", angle: 45 };
  return part(23, [rLow, rUp, lIn, lOut].map((p) => K.cut(V, L(p), o)).join(""));
}

export function seatRings(V) {
  const lo = [[24, -40], [32, -40], [32, -30], [26.5, -30], [24, -32.5]];
  const hi = [[28, 10], [36, 10], [36, 20], [30.5, 20], [28, 17.5]];
  const o = { mat: "bronze", angle: 135 };
  return part(22, [lo, hi].map((p) => K.cut(V, L(p), o) + K.cut(V, LM(p), o)).join(""));
}

// The valve and its stem are drawn shut and lifted with the pose.
export function valve(V, P) {
  const y = P.lift;
  const loop = [[8, -38], [23.5, -38], [23.5, -33], [24, -32.5], [26.5, -30], [26.5, -25], [14, -25], [14, 9], [27, 9], [27, 16.5], [30.5, 20], [30.5, 26], [8, 26]];
  const rev = K.revolve(loop.map(([r, s]) => [r, s + y]), { axis: "v", at: UV });
  return part(21, K.section(V, { ...rev, edges: [] }, { mat: "bronze", angle: 45 }));
}

export function stem(V, P) {
  const y = P.lift;
  const g = M.PIN_G_SHUT + y;
  const rod = [[-8, -54], [8, -54], [8, g - 14], [10, g - 14], [10, g + 6], [8, g + 8], [-8, g + 8], [-10, g + 6], [-10, g - 14], [-8, g - 14]].map(([r, s]) => [UV + r, s + (s < g - 20 ? y : 0)]);
  const thread = K.lines(V, [[[UV - 6.6, -54 + y], [UV - 6.6, -36 + y]], [[UV + 6.6, -54 + y], [UV + 6.6, -36 + y]]], "thin");
  return part(20, K.body(V, rod) + thread + K.line(V, [[UV - 10, g - 5], [UV + 10, g - 5]], "thin"));
}

export function stemNut(V, P) {
  const y = P.lift;
  const n = [[-12, -50], [12, -50], [12, -39], [11, -38], [-11, -38], [-12, -39]].map(([r, s]) => [UV + r, s + y]);
  return part(28, K.body(V, n) + K.lines(V, [[[UV - 6, -50 + y], [UV - 6, -38 + y]], [[UV + 6, -50 + y], [UV + 6, -38 + y]]], "thin"));
}

// The bonnet carries the stuffing box and, cast on, the post that holds the bell crank's fulcrum.
export const POST = { r0: -46, r1: -28, top: 188 };
export function bonnet(V) {
  const left = [[-8, 40], [-72, 40], [-72, 52], [POST.r0, 52], [POST.r0, POST.top], [POST.r1, POST.top], [POST.r1, 78], [-14, 78], [-14, 56], [-8, 56]];
  const right = [[8, 40], [72, 40], [72, 52], [30, 52], [30, 78], [14, 78], [14, 56], [8, 56]];
  const o = { mat: "iron", angle: 135 };
  // the post's two cheeks straddle the crank's hub; they lie behind the plane and show in outline
  const fr = M.F[0] - UV;
  const cheek = [[POST.r0, POST.top], [POST.r0, M.F[1]], ...K.arc(fr, M.F[1], 18.5, 180, 0, 16).slice(1), [fr + 18.5, M.F[1] - 6], [POST.r1 + 6, POST.top]];
  return part(24, K.cut(V, L(left), o) + K.cut(V, L(right), o) + K.body(V, L(cheek)));
}

export function packing(V) {
  const ring = (s0) => [[8, s0], [14, s0], [14, s0 + 4], [8, s0 + 4]];
  return part(26, [56, 60, 64].map((s0) => K.cut(V, L(ring(s0)), { mat: "rubber" }) + K.cut(V, LM(ring(s0)), { mat: "rubber" })).join(""));
}

export function gland(V) {
  const half = [[8.5, 68], [13.5, 68], [13.5, 78], [34, 78], [34, 84], [8.5, 84]];
  const o = { mat: "brass", angle: 45 };
  return part(25, K.cut(V, L(half), o) + K.cut(V, LM(half), o));
}

// Studs with their nuts: four on the bonnet flange (two in the plane), two on the gland.
export function studs(V) {
  const one = (r, s0, s1, nut) => {
    const body = [[r - 4, s0], [r + 4, s0], [r + 4, s1 - 1], [r + 3, s1], [r - 3, s1], [r - 4, s1 - 1]];
    const n = [[r - 6.5, nut], [r + 6.5, nut], [r + 6.5, nut + 6], [r + 5.5, nut + 6.6], [r - 5.5, nut + 6.6], [r - 6.5, nut + 6]];
    return K.body(V, L(body)) + K.body(V, L(n));
  };
  return part(27, one(-66, 30, 62, 52) + one(66, 30, 62, 52) + one(-23, 70, 93, 84) + one(23, 70, 93, 84));
}

// ---------------------------------------------------------------- phantoms and adjacent parts

// The flying parts at full speed (α = 45°), as phantom lines: the other extreme of travel.
export function phantomTop(V) {
  const P = pose(M.ALPHA_MAX);
  const [br, bv] = P.ball;
  let out = "";
  for (const s of [1, -1]) {
    out += K.line(V, K.circle(s * br, bv, M.BALL_D / 2, 64), "phan", true);
    out += K.line(V, [[s * M.OFFSET, M.VT], [s * br, bv], [s * M.OFFSET, P.lug]], "phan");
  }
  const sl = K.revolve(sleeveLoop(P.lug));
  out += K.line(V, [...sl.cuts[0]].filter(([u]) => u >= 20), "phan");
  out += K.line(V, [...sl.cuts[1]].filter(([u]) => u <= -20), "phan");
  return out;
}

// The engine bed under the case and the valve, and the steam pipe at the inlet: adjacent parts.
export function adjacent(V) {
  const vb = VALVE_BASE;
  const bed = [[-150, BASE_V], [110, BASE_V], [110, vb], [UV - 30, vb], [UV - 30, BASE_V - 14], [-150, BASE_V - 14]];
  const bed2 = [[UV + 30, BASE_V - 14], [UV + 30, vb], [UV + 84, vb], [UV + 84, BASE_V - 14]];
  const pipe = [[UV + 100, -70], [UV + 112, -70], [UV + 112, -41], [UV + 124, -41]];
  const pipe2 = [[UV + 100, 48], [UV + 112, 48], [UV + 112, 19], [UV + 124, 19]];
  return K.line(V, bed, "phan") + K.line(V, bed2, "phan") + K.line(V, pipe, "phan") + K.line(V, pipe2, "phan");
}

// ---------------------------------------------------------------- VIEW D: the head and balls from above

export function planView(V, P, theta) {
  const [br] = P.ball;
  let out = K.line(V, K.circle(0, 0, M.SLEEVE.bodyR, 64), "vis", true);
  const dirs = [theta, theta + Math.PI];
  let armsSvg = "";
  let ballsSvg = "";
  for (const t of dirs) {
    const c = Math.cos(t);
    const s = Math.sin(t);
    armsSvg += K.body(V, linkOutline([M.OFFSET * c, M.OFFSET * s], [br * c, br * s], 8, 6));
    const ball = K.circle(br * c, br * s, M.BALL_D / 2, 64);
    ballsSvg += K.body(V, ball) + `<path class="tint ball-tint" d="${K.d(V, ball)}"/>`;
  }
  const lugs = dirs
    .map((t) => {
      const c = Math.cos(t);
      const s = Math.sin(t);
      const q = (x, y) => [x * c - y * s, x * s + y * c];
      return K.body(V, [q(10, -8), q(31, -8), q(31, 8), q(10, 8)]);
    })
    .join("");
  const hex = Array.from({ length: 6 }, (_, i) => {
    const t = theta + (i * Math.PI) / 3 + Math.PI / 6;
    return [17.3 * Math.cos(t), 17.3 * Math.sin(t)];
  });
  out += part(12, armsSvg) + part(13, ballsSvg) + part(10, lugs + K.body(V, K.circle(0, 0, 17, 32))) + part(11, K.body(V, hex) + K.line(V, K.circle(0, 0, 15, 32), "thin", true));
  return out;
}
