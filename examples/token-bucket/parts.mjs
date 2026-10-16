// The cistern's parts, in world mm: u along the cistern (right), v up, the inside floor at v = 0.
// The plan view (VIEW C) uses u and w, w away from the viewer (up the sheet).
// Each function draws one part into a view and returns SVG, so the section and every detail draw
// the same geometry at their own scale. Moving parts are drawn at rest (plug shut, float arm
// horizontal) and the page moves them with a transform; parts whose shape changes (diaphragm,
// plunger, the arm in plan) are redrawn.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;

export const UF = 130; // flush valve axis
export const VA = 229; // fill valve axis
export const PIVOT = [-124, 214]; // float arm pivot
export const ARM_R = 165; // pivot to ball float centre
export const WALL = 10;
export const IN = M.IN_L / 2; // 190
export const OUT = IN + WALL; // 200
export const FLOOR_T = 12;
export const HOLE_R = 31; // outlet hole in the floor
export const LID_T = 16;
const RIM = M.RIM;

// Revolve about the fill valve's horizontal axis; [r, s] with s = u.
const onVA = (loop) => K.revolve(loop, { axis: "u", at: VA });
const onUF = (loop) => K.revolve(loop, { axis: "v", at: UF });
// a half-section given as [s, r] pairs, placed above (side 1) or below (side -1) the fill valve axis
const half = (pts, side = 1) => pts.map(([s, r]) => [s, VA + side * r]);
// a half-section given as [r, v] pairs about the flush valve axis, right (1) or left (-1)
const sideF = (pts, side = 1) => pts.map(([r, v]) => [UF + side * r, v]);
const both = (V, pts, opts) => K.cut(V, sideF(pts, 1), opts) + K.cut(V, sideF(pts, -1), opts);

// ---------------------------------------------------------------- arm angle and cam
// The ball float's centre rides BALL_RISE above the water line; the arm follows it.
export function armAngle(L, held = false) {
  const vf = held ? M.L0 + M.BALL_RISE : L + M.BALL_RISE;
  const s = (vf - PIVOT[1]) / ARM_R;
  return (Math.asin(Math.max(-1, Math.min(1, s))) * 180) / Math.PI;
}
export const ballCentre = (deg) => {
  const a = (deg * Math.PI) / 180;
  return [PIVOT[0] + ARM_R * Math.cos(a), PIVOT[1] + ARM_R * Math.sin(a)];
};
// The plunger's end face is at u = PLUNGER_END + gap. The cam nose (r 2.5) touches it when the
// arm reaches the angle at which the float shuts the valve.
const PLUNGER_END = -128;
const NOSE_R = 2.5;
const noseAt0 = [PLUNGER_END + NOSE_R, VA]; // nose centre at shut-off
const NOSE_RC = Math.hypot(noseAt0[0] - PIVOT[0], noseAt0[1] - PIVOT[1]);
const NOSE_A = (Math.atan2(noseAt0[1] - PIVOT[1], noseAt0[0] - PIVOT[0]) * 180) / Math.PI - armAngle(M.L_FULL);

// ---------------------------------------------------------------- cistern and lid

export function cistern(V) {
  const upper = [[-OUT, VA + 11], [-IN, VA + 11], [-IN, RIM - 1], [-IN - 1, RIM], [-OUT + 2, RIM], [-OUT, RIM - 2]];
  const left = [
    [-OUT, VA - 11], [-IN, VA - 11],
    ...K.arc(-IN + 4, 4, 4, 180, 270, 3),
    [UF - HOLE_R, 0], [UF - HOLE_R, -FLOOR_T],
    ...K.arc(-OUT + 6, -FLOOR_T + 6, 6, 270, 180, 4),
  ];
  const right = [
    [UF + HOLE_R, 0],
    ...K.arc(IN - 4, 4, 4, 270, 360, 3),
    [IN, RIM - 1], [IN + 1, RIM], [OUT - 2, RIM], [OUT, RIM - 2],
    ...K.arc(OUT - 6, -FLOOR_T + 6, 6, 0, -90, 4),
    [UF + HOLE_R, -FLOOR_T],
  ];
  return part(1, [upper, left, right].map((p) => K.cut(V, p, { mat: "china", angle: 45 })).join(""));
}

export function lid(V) {
  const r = 5;
  const left = [
    [-OUT - 3, RIM + 2], [-OUT - 1, RIM], [-IN + 0.5, RIM], [-IN + 0.5, RIM - 8], [-IN + 4, RIM - 8], [-IN + 4, RIM],
    [UF - 9, RIM], [UF - 9, RIM + LID_T],
    ...K.arc(-OUT - 3 + r, RIM + LID_T - r, r, 90, 180, 3),
  ];
  const right = [
    [UF + 9, RIM], [IN - 4, RIM], [IN - 4, RIM - 8], [IN - 0.5, RIM - 8], [IN - 0.5, RIM], [OUT + 1, RIM], [OUT + 3, RIM + 2],
    ...K.arc(OUT + 3 - r, RIM + LID_T - r, r, 0, 90, 3),
    [UF + 9, RIM + LID_T],
  ];
  return part(2, K.cut(V, left, { mat: "china", angle: 135 }) + K.cut(V, right, { mat: "china", angle: 135 }));
}

export function lidBush(V) {
  const loop = [[3.2, RIM - 4], [11, RIM - 4], [11, RIM], [9, RIM], [9, RIM + LID_T], [13, RIM + LID_T], [13, RIM + LID_T + 3], [3.2, RIM + LID_T + 3]];
  return part(25, K.section(V, { ...onUF(loop), edges: [] }, { mat: "plastic", angle: 45 }));
}

// ---------------------------------------------------------------- fill valve (axis horizontal at VA)

export function valveBody(V) {
  const top = [[-232, 5], [-232, 10.5], [-187, 10.5], [-187, 18], [-152, 18], [-152, 12], [-170, 12], [-170, 5]];
  const lowA = [[-232, 5], [-232, 10.5], [-187, 10.5], [-187, 18], [-166, 18], [-166, 12], [-170, 12], [-170, 5]];
  const lowB = [[-158, 12], [-158, 18], [-152, 18], [-152, 12]];
  const thread = [[[-230, VA + 9.6], [-188, VA + 9.6]], [[-230, VA - 9.6], [-188, VA - 9.6]]];
  return part(
    3,
    [half(top, 1), half(lowA, -1), half(lowB, -1)].map((p) => K.cut(V, p, { mat: "plastic", angle: 45 })).join("") + K.lines(V, thread, "thin")
  );
}

export function nozzle(V) {
  const loop = [[2.5, -200], [5, -200], [5, -170], [4, -166], [4, -154], [1.75, -154], [1.75, -158], [2.5, -160]];
  return part(4, K.section(V, { ...onVA(loop), edges: [] }, { mat: "brass", angle: 135 }));
}

export function backnutG12(V) {
  const loop = [[10.5, -215], [15, -215], [16.5, -213.5], [16.5, -203], [10.5, -203]];
  return part(5, K.section(V, { ...onVA(loop), edges: [] }, { mat: "plastic", angle: 135 }));
}

export function tankWashers(V) {
  const out = onVA([[10.5, -203], [16, -203], [16, -200], [10.5, -200]]);
  const inn = onVA([[10.5, -190], [16, -190], [16, -187], [10.5, -187]]);
  return part(6, K.section(V, { ...out, edges: [] }, { mat: "rubber" }) + K.section(V, { ...inn, edges: [] }, { mat: "rubber" }));
}

// The diaphragm's centre moves gap mm off the jet; its rim stays clamped.
export function diaphragm(V, gap) {
  const loop = [[0, -154 + gap], [9, -154 + gap], [13, -152], [18, -152], [18, -150], [13, -150], [9, -152 + gap], [0, -152 + gap]];
  return part(7, K.section(V, { ...onVA(loop), edges: [] }, { mat: "rubber" }));
}

export function cap(V) {
  const loop = [[-157, 18], [-157, 21], [-136, 21], [-136, 3.2], [-140, 3.2], [-140, 13], [-150, 13], [-150, 18]];
  // the fork cheek behind the plane that carries the pivot pin
  const cheek = [[-136, PIVOT[1] - 7], [PIVOT[0], PIVOT[1] - 7], ...K.arc(PIVOT[0], PIVOT[1], 7, -90, 90, 6), [-136, PIVOT[1] + 7]];
  return part(8, K.body(V, cheek) + K.cut(V, half(loop, 1), { mat: "plastic", angle: 135 }) + K.cut(V, half(loop, -1), { mat: "plastic", angle: 135 }));
}

export function plunger(V, gap) {
  const s0 = -152 + gap;
  const pts = [[s0, 7], [s0 + 4, 7], [s0 + 4, 3], [PLUNGER_END + gap, 3], [PLUNGER_END + gap, -3], [s0 + 4, -3], [s0 + 4, -7], [s0, -7]];
  return part(9, K.body(V, pts.map(([s, r]) => [s, VA + r])));
}

export function shroud(V) {
  const l = [[-166, 196], [-164.5, 196], [-164.5, 216], [-166, 216]];
  return part(13, K.cut(V, l, { mat: "plastic", angle: 135 }) + K.cut(V, K.flipU(l, -162), { mat: "plastic", angle: 135 }));
}

// The arm, ball and pin, drawn horizontal (angle 0); the page rotates them about the pivot.
export function arm(V) {
  const [pu, pv] = PIVOT;
  const end = pu + ARM_R - M.BALL_D / 2 + 1;
  const strip = [[pu + 4, pv - 3], [end, pv - 3], [end, pv + 3], [pu + 4, pv + 3]];
  const a = (NOSE_A * Math.PI) / 180;
  const nose = [pu + NOSE_RC * Math.cos(a), pv + NOSE_RC * Math.sin(a)];
  const n = [-Math.sin(a), Math.cos(a)];
  const cam = [
    [pu + n[0] * 2.5, pv + n[1] * 2.5], [nose[0] + n[0] * 2.5, nose[1] + n[1] * 2.5],
    [nose[0] - n[0] * 2.5, nose[1] - n[1] * 2.5], [pu - n[0] * 2.5, pv - n[1] * 2.5],
  ];
  return part(11, K.body(V, strip) + K.body(V, cam) + K.body(V, K.circle(nose[0], nose[1], NOSE_R, 16)) + K.body(V, K.circle(pu, pv, 5.5, 24)));
}

export function pin(V) {
  return part(10, K.cut(V, K.circle(PIVOT[0], PIVOT[1], 1.5, 12), { mat: "solid" }));
}

export function ball(V) {
  const c = [PIVOT[0] + ARM_R, PIVOT[1]];
  const boss = K.rect(c[0] - M.BALL_D / 2 - 2, c[1] - 5, c[0] - M.BALL_D / 2 + 3, c[1] + 5);
  return part(
    12,
    K.cut(V, K.circle(c[0], c[1], M.BALL_D / 2, 56), { mat: "solid" }) +
      `<path class="paper" d="${K.d(V, K.circle(c[0], c[1], M.BALL_D / 2 - 1.6, 56))}"/>` +
      K.cut(V, boss, { mat: "solid" })
  );
}

// The arm and ball at their lowest (an empty bucket), in phantom lines.
export function armPhantom(V) {
  const deg = armAngle(M.L0);
  const a = (deg * Math.PI) / 180;
  const [pu, pv] = PIVOT;
  const rot = ([u, v]) => [pu + (u - pu) * Math.cos(a) - (v - pv) * Math.sin(a), pv + (u - pu) * Math.sin(a) + (v - pv) * Math.cos(a)];
  const end = pu + ARM_R - M.BALL_D / 2;
  const strip = [[pu + 6, pv - 3], [end, pv - 3], [end, pv + 3], [pu + 6, pv + 3]].map(rot);
  const c = rot([pu + ARM_R, pv]);
  return K.line(V, strip, "phan", true) + K.line(V, K.circle(c[0], c[1], M.BALL_D / 2, 56), "phan", true);
}

// ---------------------------------------------------------------- flush valve (axis vertical at UF)

export function housing(V) {
  const low = [[26, -48], [29.8, -48], [29.8, 3], [46, 3], [46, 9], [33, 9], [33, 14], [30, 14], [30, 9], [24, 9], [24, M.SEAT_V], [20, M.SEAT_V], [20, 7], [26, 3]];
  const cage = [[30, 48], [33, 48], [33, M.LIP_V], [37, M.LIP_V], [37, M.LIP_V + 3], [30, M.LIP_V + 3]];
  const thread = [[[UF - 28.6, -46], [UF - 28.6, 1]], [[UF + 28.6, -46], [UF + 28.6, 1]]];
  // the window posts on the far side of the cage, seen through the cut
  const posts = [-27, -19, 19, 27].map((r) => [[UF + r, 14], [UF + r, 48]]);
  return part(
    15,
    both(V, low, { mat: "plastic", angle: 135 }) + both(V, cage, { mat: "plastic", angle: 135 }) + K.lines(V, thread, "thin") + K.lines(V, posts, "vis") +
      K.lines(V, [[[UF - 30, 14], [UF + 30, 14]], [[UF - 30, 48], [UF + 30, 48]]], "vis")
  );
}

export function seatWasher(V) {
  return part(16, both(V, [[30, 0], [46, 0], [46, 3], [30, 3]], { mat: "rubber" }));
}

export function backnutG2(V) {
  return part(17, both(V, [[30, -24], [42, -24], [44, -22], [44, -FLOOR_T], [30, -FLOOR_T]], { mat: "plastic", angle: 30 }));
}

export function doughnut(V) {
  return part(18, both(V, [[30, -48], [42, -48], [60, -16], [60, -FLOOR_T], [45, -FLOOR_T], [45, -24], [30, -24]], { mat: "foam" }));
}

// The pan's inlet under the cistern: an adjacent part, phantom lines.
export function panPhantom(V) {
  const l = [[-OUT, -48], [UF - 44, -48], [UF - 38, -56], [UF - 38, -72]];
  const r = [[UF + 38, -72], [UF + 38, -56], [UF + 44, -48], [OUT, -48]];
  return K.line(V, l, "phan") + K.line(V, r, "phan");
}

// Moving with the plug (drawn shut; the page lifts them).
export function plug(V) {
  const loop = [[14, 4], [16, 4], [16, 16], [26, 16], [26, 21], [19, 25], [16, 25], [16, M.CREST], [14, M.CREST]];
  return part(19, both(V, loop, { mat: "plastic", angle: 45 }));
}

export function seal(V) {
  return part(20, both(V, [[18, M.SEAT_V], [26, M.SEAT_V], [26, 16], [18, 16]], { mat: "rubber" }));
}

export const BRIDGE_TOP = M.CREST + 11;
export function bridge(V) {
  const b = BRIDGE_TOP;
  return part(23, K.body(V, [[UF - 18.5, 165], [UF - 16, 165], [UF - 16, b - 5], [UF + 16, b - 5], [UF + 16, 165], [UF + 18.5, 165], [UF + 18.5, b], [UF - 18.5, b]]));
}

export const KNOB_V = RIM + LID_T + 3;
export function rod(V) {
  return part(24, K.body(V, K.rect(UF - 3, BRIDGE_TOP, UF + 3, KNOB_V + 12)));
}

export function knob(V) {
  const k = KNOB_V;
  const loop = [[3, k], [10, k], [10, k + 4], [14, k + 7], [14, k + 16], [11, k + 20], [0, k + 20], [0, k + 12], [3, k + 12]];
  return part(26, K.section(V, { ...onUF(loop), edges: [] }, { mat: "plastic", angle: 135 }));
}

export function knobPhantom(V) {
  const k = KNOB_V + M.LIFT;
  const loop = [[3, k], [10, k], [10, k + 4], [14, k + 7], [14, k + 16], [11, k + 20]];
  return K.line(V, [...sideF(loop, 1), ...sideF(loop, -1).reverse()], "phan", true);
}

// The dose float, drawn with its underside at v = 0; the page moves it to M.dFloat(L).
export function doseFloat(V) {
  const outer = [[36, 0], [46, 0], [46, M.FLOAT_H], [36, M.FLOAT_H]];
  const inner = [[37.6, 1.6], [44.4, 1.6], [44.4, M.FLOAT_H - 1.6], [37.6, M.FLOAT_H - 1.6]];
  const hollow = (side) => `<path class="paper" d="${K.d(V, sideF(inner, side))}"/>`;
  return part(21, both(V, outer, { mat: "solid" }) + hollow(1) + hollow(-1));
}

export function collar(V) {
  return part(22, both(V, [[33, M.STOP_V - 4], [37, M.STOP_V - 4], [37, M.STOP_V], [33, M.STOP_V]], { mat: "plastic", angle: 60 }));
}

// ---------------------------------------------------------------- water

// The tank water, below the level L; the outlet and the tube bore are dry until they flow.
export const tankWater = (L) => K.rect(-IN, 0, IN, L);
export const outletBore = [[UF - 26, -72], [UF + 26, -72], [UF + 26, 3], [UF + 20, 7], [UF + 20, M.SEAT_V], [UF - 20, M.SEAT_V], [UF - 20, 7], [UF - 26, 3]];
export const tubeBore = (lift) => K.rect(UF - 14, 4 + lift, UF + 14, M.CREST + lift);
// Mains water in the shank and the nozzle, always there; the chamber, port and shroud run full
// only while the diaphragm is off the jet.
export const inletBore = [[-232, VA - 5], [-200, VA - 5], [-200, VA - 2.5], [-160, VA - 2.5], [-158, VA - 1.75], [-154, VA - 1.75], [-154, VA + 1.75], [-158, VA + 1.75], [-160, VA + 2.5], [-200, VA + 2.5], [-200, VA + 5], [-232, VA + 5]];
export const chamberWater = [[-170, VA - 12], [-166, VA - 12], [-166, VA - 18], [-164.5, VA - 18], [-164.5, 196], [-159.5, 196], [-159.5, VA - 18], [-158, VA - 18], [-158, VA - 12], [-150, VA - 12], [-150, VA + 12], [-170, VA + 12]];
// the refill stream from the shroud to the water
export const stream = (L) => K.rect(-164.5, L, -159.5, 196);

// Moulded token marks on the inside of the left wall.
export function tokenMarks(V) {
  const ticks = [];
  let nums = "";
  for (let n = 0; n <= M.CAP; n++) {
    const v = M.levelOf(n);
    ticks.push([[-IN, v], [-IN + 6, v]]);
    const [x, y] = V.p([-IN + 9, v]);
    nums += `<text class="t t-sm" x="${x}" y="${K.r2(y + 2.6)}">${n}</text>`;
  }
  return K.lines(V, ticks, "thin") + `<g data-role="engraved">${nums}</g>`;
}

// ---------------------------------------------------------------- VIEW C: plan, lid removed (u, w)

export function planStatic(V) {
  const outer = K.rrect(-OUT, -M.IN_W / 2 - WALL, OUT, M.IN_W / 2 + WALL, 12, 5);
  const inner = K.rrect(-IN, -M.IN_W / 2, IN, M.IN_W / 2, 5, 4);
  const rim = `<path class="paper" fill-rule="evenodd" d="${K.d(V, outer)}${K.d(V, inner)}"/><path class="vis" d="${K.d(V, outer)}${K.d(V, inner)}"/>`;
  const fv =
    K.body(V, K.rect(-214, -16.5, -202, 16.5)) + // backnut 5
    K.body(V, K.rect(-187, -18, -160, 18)) +
    K.body(V, K.rect(-160, -21, -136, 21)) +
    K.body(V, [[-136, -6], [PIVOT[0], -6], ...K.arc(PIVOT[0], 0, 6, -90, 90, 6), [-136, 6]]) +
    K.line(V, K.rect(-166, -4, -158, 4), "hid", true);
  const flush =
    K.line(V, K.circle(UF, 0, 37, 56), "vis", true) + K.line(V, K.circle(UF, 0, 30, 48), "vis", true) + K.line(V, K.circle(UF, 0, 33, 48), "thin", true);
  return (
    part(1, rim) +
    `<g data-part="3">${fv}</g>` +
    part(15, flush) +
    part(14, [-62, 62].map((w) => K.body(V, K.circle(UF, w, 7.5, 6)) + K.line(V, K.circle(UF, w, 4, 16), "thin", true)).join(""))
  );
}

// The moving parts in plan: dose float, tube, bridge, knob rod; arm and ball at angle deg.
export function planFlush(V) {
  return (
    part(21, `<path class="paper" fill-rule="evenodd" d="${K.d(V, K.circle(UF, 0, 46, 64))}${K.d(V, K.circle(UF, 0, 36, 56))}"/>` + K.line(V, K.circle(UF, 0, 46, 64), "vis", true) + K.line(V, K.circle(UF, 0, 36, 56), "vis", true)) +
    part(19, `<path class="paper" fill-rule="evenodd" d="${K.d(V, K.circle(UF, 0, 16, 40))}${K.d(V, K.circle(UF, 0, 14, 40))}"/>` + K.line(V, K.circle(UF, 0, 16, 40), "vis", true) + K.line(V, K.circle(UF, 0, 14, 40), "vis", true)) +
    part(23, K.body(V, K.rect(UF - 18.5, -4, UF + 18.5, 4))) +
    part(24, K.body(V, K.circle(UF, 0, 3, 16)))
  );
}

export function planArm(V, deg) {
  const [bu] = ballCentre(deg);
  const [pu] = PIVOT;
  const end = bu - M.BALL_D / 2 + 1;
  return (
    part(11, K.body(V, [[pu + 4, -3], [end, -3], [end, 3], [pu + 4, 3]]) + K.body(V, K.circle(pu, 0, 5.5, 20))) +
    part(12, K.body(V, K.circle(bu, 0, M.BALL_D / 2, 56)) + K.line(V, K.circle(bu, 0, 6, 16), "thin", true))
  );
}
