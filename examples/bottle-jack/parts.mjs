// The bottle jack's parts, in world mm (u right, v up, the ram's axis at u = 0, the base's
// underside at v = 0). Each function draws one part into a view and returns SVG, so the main view
// and the details draw the same geometry at their own scale. Moving parts are drawn at rest (ram
// down, handle level) and the page moves them with a transform; only what changes shape (balls,
// springs, oil) is redrawn.
//
// SECTION A-A is a plan cut at v = 40 through the base; its functions take (u, w), w away from the
// viewer, drawn up the sheet.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;

const PU = M.PUMP_U;
const mirror = (pts) => K.flipU(pts);

// ---------------------------------------------------------------- base and its drillings

export const BASE = [
  [-67, 0], [-45, 0], [-43, 2], [73, 2], [75, 0], [97, 0], [100, 3], [100, 41], [97, 44],
  [90, 44], [90, 55], [87, 58], [61, 58], [58, 55], [58, 44], [-67, 44], [-70, 41], [-70, 3],
];

// Every bore and drilling in the base, as world shapes. Each is a straight drilling from outside,
// smaller as it goes deeper, so the base could be machined; the open ends are plugged (item 29).
const REL_V = 28; // release valve axis
const DEL_V = 24; // delivery passage axis
export const GAL_V = 8; // suction gallery axis
export const RELIEF_U = 27;
export const DROP_U = -27;
const SEAT_U = 60; // the delivery seat's left face
const BALL_SEAT_V = 18; // suction seat, the top of the riser
export const CAVITIES = [
  K.rect(-35.5, 41, 35.5, 47), // reservoir counterbore, open to the reservoir
  K.rect(-20, 35, 20, 42), // the cylinder's counterbore
  K.rect(19.9, 36, 22.2, 39.2), // O-ring groove
  K.rect(-22.2, 36, -19.9, 39.2),
  K.rect(-7, 16, 7, 35.5), // ram well
  [[-7, 16.01], [7, 16.01], [0, 11.8]], // its drill point
  K.rect(62, 30, 86, 60), // pump cylinder thread, M24×1.5
  K.rect(PU - 6, BALL_SEAT_V, PU + 6, 30.01), // pump chamber Ø12
  K.rect(PU - 2, GAL_V, PU + 2, BALL_SEAT_V + 0.01), // suction riser Ø4
  K.rect(DROP_U, GAL_V - 2.5, 101, GAL_V + 2.5), // suction gallery Ø5, drilled from the right
  K.rect(DROP_U - 2.5, GAL_V - 2.5, DROP_U + 2.5, 42), // suction drop Ø5 from the reservoir
  [[DROP_U - 2.5, GAL_V - 2.49], [DROP_U + 2.5, GAL_V - 2.49], [DROP_U, 4]],
  K.rect(44, DEL_V - 3.5, 101, DEL_V + 3.5), // delivery bore Ø7, drilled from the right
  K.rect(6, DEL_V - 2.5, 44.01, DEL_V + 2.5), // delivery passage Ø5 into the well
  K.rect(RELIEF_U - 1.25, DEL_V, RELIEF_U + 1.25, 30.01), // relief seat Ø2.5
  K.rect(RELIEF_U - 3, 30, RELIEF_U + 3, 37.51), // relief pocket Ø6
  K.rect(RELIEF_U - 3.45, 37.5, RELIEF_U + 3.45, 42), // relief thread M8×1
  K.rect(-22, REL_V - 1.5, -6, REL_V + 1.5), // release seat Ø3
  K.rect(-52, REL_V - 3.5, -22, REL_V + 3.5), // release bore Ø7
  K.rect(-71, REL_V - 5.4, -52, REL_V + 5.4), // release thread M12×1
];

export function base(V, clipId) {
  const holes = CAVITIES.map((c) => `<path class="paper" d="${K.d(V, c)}"/>`).join("");
  const walls = `<path class="wall" clip-path="url(#${clipId})" d="${CAVITIES.map((c) => K.d(V, c)).join("")}"/>`;
  const threads = K.lines(
    V,
    [
      [[-70, REL_V + 6], [-52.5, REL_V + 6]], // M12 major, thin
      [[-70, REL_V - 6], [-52.5, REL_V - 6]],
      [[RELIEF_U - 4, 37.6], [RELIEF_U - 4, 41]], // M8 major
      [[RELIEF_U + 4, 37.6], [RELIEF_U + 4, 41]],
    ],
    "thin"
  );
  return part(1, K.cut(V, BASE, { mat: "iron", angle: 45 }) + walls + holes + threads);
}

export const baseClip = (V) => `<path d="${K.d(V, BASE)}"/>`;

// ---------------------------------------------------------------- cylinder, reservoir tube, top nut

export function cylinder(V) {
  const left = K.rect(-20, M.CYL_SEAT, -16, M.TUBE_TOP);
  const low = K.rect(16, M.CYL_SEAT, 20, 179);
  const high = K.rect(16, 181, 20, M.TUBE_TOP); // Ø2 vent to the reservoir above the ram head
  return part(2, [left, low, high].map((p) => K.cut(V, p, { mat: "steel", angle: 135 })).join(""));
}

export function tube(V) {
  const r = K.rect(32.5, M.RES_FLOOR, 35, M.TUBE_TOP);
  const thread = [[[34.3, 173], [34.3, 189.4]], [[-34.3, 173], [-34.3, 189.4]]];
  return part(3, K.cut(V, r, { mat: "steel", angle: 135 }) + K.cut(V, mirror(r), { mat: "steel", angle: 135 }) + K.lines(V, thread, "thin"));
}

const NUT_TOP = 204;
export function topNut(V) {
  const right = [[15.2, 190], [35, 190], [35, 172], [39.5, 172], [39.5, 202], [37.5, 204], [18.5, 204], [18.5, 199], [15.2, 199]];
  // the left half is split by the filler hole above the reservoir
  const inner = [[-15.2, 190], [-23.5, 190], [-23.5, 204], [-18.5, 204], [-18.5, 199], [-15.2, 199]];
  const o = [[-29, 190], [-35, 190], [-35, 172], [-39.5, 172], [-39.5, 202], [-37.5, 204], [-29, 204]];
  return part(4, [right, o, inner].map((p) => K.cut(V, p, { mat: "steel", angle: 60 })).join(""));
}

export function fillerPlug(V) {
  const p = [[-29, 191.5], [-23.5, 191.5], [-23.5, 204], [-22, 204], [-22, 206.5], [-23, 207.5], [-29.5, 207.5], [-30.5, 206.5], [-30.5, 204], [-29, 204]];
  return part(10, K.cut(V, p, { mat: "rubber" }));
}

export function wiper(V) {
  const s = [[15, 199], [18.5, 199], [18.5, 204], [16.2, 204], [15, 202.6]];
  return part(7, K.cut(V, s, { mat: "rubber" }) + K.cut(V, mirror(s), { mat: "rubber" }));
}

export function cylORing(V) {
  const s = K.rrect(20, 36.3, 22.2, 38.9, 1);
  return part(11, K.cut(V, s, { mat: "rubber" }) + K.cut(V, mirror(s), { mat: "rubber" }));
}

// ---------------------------------------------------------------- the ram, drawn fully down

const R0 = M.RAM_LOW;
const HEAD_TOP = R0 + M.HEAD_H;
const BORE_LOW = 146; // the tapped hole's floor
const SCREW_LOW = 150;
export function ram(V) {
  const loop = [
    [0, R0], [14.5, R0], [16, R0 + 1.5], [16, R0 + 3], [12.5, R0 + 3], [12.5, R0 + 11], [16, R0 + 11],
    [16, HEAD_TOP - 1], [15, HEAD_TOP], [15, M.RAM_TOP - 1], [14, M.RAM_TOP], [12, M.RAM_TOP], [12, SCREW_LOW],
    [10.9, SCREW_LOW], [10.9, BORE_LOW], [0, BORE_LOW - 6.5],
  ];
  const rev = K.revolve(loop);
  const major = [[[-12, SCREW_LOW], [-12, BORE_LOW + 0.5]], [[12, SCREW_LOW], [12, BORE_LOW + 0.5]]];
  return part(5, K.section(V, { ...rev, edges: [] }, { mat: "steel", angle: 45 }) + K.lines(V, major, "thin"));
}

export function uCup(V) {
  const s = [[12.5, R0 + 11], [16, R0 + 11], [16, R0 + 3.3], [15.6, R0 + 3], [14.8, R0 + 5.2], [13.7, R0 + 5.2], [12.9, R0 + 3], [12.5, R0 + 3.3]];
  return part(6, K.cut(V, s, { mat: "rubber" }) + K.cut(V, mirror(s), { mat: "rubber" }));
}

const NECK = 224;
export function screw(V) {
  const outline = [
    [-11.4, SCREW_LOW], [11.4, SCREW_LOW], [12, SCREW_LOW + 0.6], [12, M.RAM_TOP], [11, M.RAM_TOP + 1], [11, NECK],
    [8, NECK], [8, M.CLOSED_H - 2], [-8, M.CLOSED_H - 2], [-8, NECK], [-11, NECK], [-11, M.RAM_TOP + 1], [-12, M.RAM_TOP],
    [-12, SCREW_LOW + 0.6],
  ];
  const minor = [[[-10.9, SCREW_LOW + 1], [-10.9, M.RAM_TOP - 0.5]], [[10.9, SCREW_LOW + 1], [10.9, M.RAM_TOP - 0.5]]];
  return part(8, K.body(V, outline) + K.lines(V, minor, "thin"));
}

export function saddle(V) {
  const top = M.CLOSED_H;
  const right = [[8, NECK], [16, NECK], [17, NECK + 1], [17, top - 1], ...[[16, top], [14, top - 1], [12, top], [10, top - 1], [8, top]]];
  return part(9, K.cut(V, right, { mat: "steel", angle: 135 }) + K.cut(V, mirror(right), { mat: "steel", angle: 135 }));
}

// Outline of the ram, screw and saddle at full lift: the phantom extreme position.
export function phantomRam(V) {
  const h = M.LIFT_MAX;
  const r = [[15, NUT_TOP], [15, M.RAM_TOP - 1 + h], [14, M.RAM_TOP + h], [11, M.RAM_TOP + h], [11, NECK + h], [17, NECK + h + 1], [17, M.CLOSED_H + h]];
  return K.line(V, [...r, ...mirror(r)], "phan", false);
}

// ---------------------------------------------------------------- pump

export function pumpCylinder(V) {
  const L = [
    [62, 30], [68, 30], [68, 84], [70.2, 84], [70.2, 87.5], [68, 87.5], [68, 98], [66, 100], [66, 108], [63, 111],
    ...K.arc(M.LINK_B[0], M.LINK_B[1], 6.5, 90, 270, 12), [62, 98],
  ];
  const R = [[80, 30], [86, 30], [86, 96], [84, 98], [80, 98], [80, 87.5], [82.2, 87.5], [82.2, 84], [80, 84]];
  const roots = [[[62.8, 42], [62.8, 57]], [[85.2, 42], [85.2, 57]]];
  return part(12, K.cut(V, L, { mat: "steel", angle: 135 }) + K.cut(V, R, { mat: "steel", angle: 135 }) + K.lines(V, roots, "thin"));
}

export function plungerSeal(V) {
  const o = K.rrect(80, 84.05, 82.15, 86.45, 1);
  const b = K.rect(80, 86.65, 82.15, 87.45);
  return part(15, K.cut(V, o, { mat: "rubber" }) + K.cut(V, K.flipU(o, PU), { mat: "rubber" }) + K.cut(V, b, { mat: "solid" }) + K.cut(V, K.flipU(b, PU), { mat: "solid" }));
}

// The plunger at the top of its stroke (x = 0); the page translates it down.
export function plunger(V) {
  const vb = M.PL_UP;
  const pin = vb + M.PL_LEN;
  const out = [[PU - 5.5, vb], [PU + 5.5, vb], [PU + 6, vb + 0.5], [PU + 6, pin], ...K.arc(PU, pin, 6, 0, 180, 12).slice(1, -1), [PU - 6, pin], [PU - 6, vb + 0.5]];
  return part(14, K.body(V, out));
}

const pinCut = (V, c, angle) => K.cut(V, K.circle(c[0], c[1], 3, 24), { mat: "steel", angle });

// The socket at its level pose (x = 0.5): F and P on one horizontal line. The page rotates it.
export const P0 = [PU, M.pinV(0.5)];
export const F0 = [P0[0] - M.ARM, P0[1]];
const SV = P0[1];
const TUBE0 = PU + 16; // the socket tube starts clear of the plunger at both extremes
const TUBE1 = PU + 44;
export function socketPlate(V) {
  const plate = [...K.arc(F0[0], SV, 8, 90, 270, 12), [TUBE0, SV - 8], [TUBE0, SV + 8]];
  return part(17, K.body(V, plate));
}

export function socketCut(V) {
  const web = K.rect(F0[0] - 4, SV + 8, TUBE0, SV + 10);
  const top = K.rect(TUBE0, SV + 11, TUBE1, SV + 13);
  const bot = K.rect(TUBE0, SV - 13, TUBE1, SV - 11);
  const end = K.rect(TUBE0, SV - 11, TUBE0 + 2, SV + 11);
  return part(17, K.cut(V, web, { mat: "solid" }) + [top, bot, end].map((p) => K.cut(V, p, { mat: "steel", angle: 30 })).join(""));
}

export const HANDLE_END = 124;
export function handle(V) {
  const top = K.rect(TUBE0 + 5, SV + 9, HANDLE_END, SV + 11);
  const bot = K.rect(TUBE0 + 5, SV - 11, HANDLE_END, SV - 9);
  return part(18, [top, bot].map((p) => K.cut(V, p, { mat: "steel", angle: 135 })).join("") + K.breakLine(V, [HANDLE_END, SV + 11.5], [HANDLE_END, SV - 11.5]));
}

export const socketPins = (V) => part(19, pinCut(V, F0, 45) + pinCut(V, P0, 135));
export const basePin = (V) => part(19, pinCut(V, M.LINK_B, 45));

export function link(V) {
  const [bu, bv] = M.LINK_B;
  const top = bv + M.LINK_L;
  return part(16, K.body(V, [...K.arc(bu, top, 5, 0, 180, 10), ...K.arc(bu, bv, 5, 180, 360, 10)]));
}

// Outline of socket and handle, for the phantom at the other extreme.
export function socketOutline(V) {
  const o = [...K.arc(F0[0], SV, 8, 90, 270, 12), [TUBE0, SV - 8], [TUBE0, SV - 13], [TUBE1, SV - 13], [TUBE1, SV - 11], [HANDLE_END, SV - 11], [HANDLE_END, SV + 11], [TUBE1, SV + 11], [TUBE1, SV + 13], [TUBE0, SV + 13], [TUBE0, SV + 10], [F0[0] - 4, SV + 10]];
  return K.line(V, o, "phan", true);
}

// A point fixed to the socket, in world mm, for a pose.
export function onSocket(x, [u, v]) {
  const { P, angle } = M.socketPose(x);
  const a = (angle * Math.PI) / 180;
  const du = u - P0[0];
  const dv = v - P0[1];
  return [P[0] + du * Math.cos(a) - dv * Math.sin(a), P[1] + du * Math.sin(a) + dv * Math.cos(a)];
}

// The sheet transform that carries the socket from its level pose to pose x.
export function socketTransform(V, x) {
  const { P, angle } = M.socketPose(x);
  const [x0, y0] = V.p(P0);
  const [x1, y1] = V.p(P);
  return `translate(${K.r2(x1 - x0)} ${K.r2(y1 - y0)}) rotate(${K.r2(-angle)} ${x0} ${y0})`;
}

export function linkTransform(V, x) {
  const { F } = M.socketPose(x);
  const [bu, bv] = M.LINK_B;
  const a = (Math.atan2(F[0] - bu, F[1] - bv) * 180) / Math.PI; // from vertical, clockwise positive
  const [bx, by] = V.p(M.LINK_B);
  return `rotate(${K.r2(a)} ${bx} ${by})`;
}

// ---------------------------------------------------------------- valves

const SUC_C = BALL_SEAT_V + Math.sqrt(9 - 4); // suction ball centre on its Ø4 seat
const DEL_C = SEAT_U - Math.sqrt(9 - 2.25); // delivery ball centre on its Ø3 seat
const REL_C = 30 + Math.sqrt(4 - 1.5625); // relief ball centre on its Ø2.5 seat

export const suctionBall = (V, lift) => part(20, K.body(V, K.circle(PU, SUC_C + lift, 3, 40)));
export const deliveryBall = (V, lift) => part(21, K.body(V, K.circle(DEL_C - lift, DEL_V, 3, 40)));
export const reliefBall = (V, lift) => part(24, K.body(V, K.circle(RELIEF_U, REL_C + lift, 2, 32)));

export function deliverySeat(V) {
  const a = [[SEAT_U, DEL_V + 1.9], [SEAT_U + 0.4, DEL_V + 1.5], [68, DEL_V + 1.5], [68, DEL_V + 3.5], [SEAT_U, DEL_V + 3.5]];
  const b = K.flipV(a, DEL_V);
  return part(22, K.cut(V, a, { mat: "brass", angle: 135 }) + K.cut(V, b, { mat: "brass", angle: 135 }));
}

export function deliverySpring(V, lift) {
  return part(23, K.springSection(V, { from: 44, to: DEL_C - lift - 3, radius: 2.7, wire: 0.6, turns: 5, axis: "u", at: DEL_V }));
}

export function reliefSpring(V, lift) {
  return part(25, K.springSection(V, { from: REL_C + lift + 2, to: 37.5, radius: 2.2, wire: 0.5, turns: 3, axis: "v", at: RELIEF_U }));
}

export function setScrew(V) {
  const l = K.rect(RELIEF_U - 4, 37.5, RELIEF_U - 1, 41);
  const r = K.rect(RELIEF_U + 1, 37.5, RELIEF_U + 4, 41);
  const minor = [[[RELIEF_U - 3.45, 37.9], [RELIEF_U - 3.45, 40.6]], [[RELIEF_U + 3.45, 37.9], [RELIEF_U + 3.45, 40.6]]];
  return part(26, K.body(V, l) + K.body(V, r) + K.lines(V, minor, "thin"));
}

// The release screw, closed. e opens it: the page translates it left by e.
const NEEDLE_TIP = -22 + (1.5 - 0.4) / Math.tan((M.NEEDLE_HALF * Math.PI) / 180);
const NEEDLE_BASE = NEEDLE_TIP - (3.2 - 0.4) / Math.tan((M.NEEDLE_HALF * Math.PI) / 180);
export function releaseScrew(V) {
  const half = [
    [NEEDLE_TIP, 0.4], [NEEDLE_BASE, 3.2], [-45.5, 3.2], [-45.5, 2.2], [-48, 2.2], [-48, 3.2], [-51.5, 3.2],
    [-52.5, 5.4], [-53, 6], [-70, 6], [-70, 5], [-80.5, 5], [-82, 3.5], [-82, 1.2], [-78.5, 1.2], [-78.5, 0],
  ];
  const top = half.map(([u, r]) => [u, REL_V + r]);
  const bot = half.slice().reverse().map(([u, r]) => [u, REL_V - r]);
  const minor = [[[-69.5, REL_V + 5.4], [-53.5, REL_V + 5.4]], [[-69.5, REL_V - 5.4], [-53.5, REL_V - 5.4]]];
  return part(27, K.body(V, [...top, ...bot]) + K.lines(V, minor, "thin"));
}

export function releaseORing(V) {
  const o = K.rrect(-47.9, REL_V + 2.2, -45.6, REL_V + 3.5, 0.5);
  return part(28, K.cut(V, o, { mat: "rubber" }) + K.cut(V, K.flipV(o, REL_V), { mat: "rubber" }));
}

export function plugs(V) {
  const a = K.rect(95, DEL_V - 3.5, 100, DEL_V + 3.5);
  const b = K.rect(95, GAL_V - 2.5, 100, GAL_V + 2.5);
  return part(29, K.body(V, a) + K.body(V, b) + K.line(V, K.circle(97.6, DEL_V, 1.6, 16), "thin", true));
}

// ---------------------------------------------------------------- oil

// Ram side: everything downstream of the delivery ball, to the release seat and the relief ball.
export function ramOil(h) {
  return [
    K.rect(-16, M.CYL_SEAT, 16, M.RAM_LOW + h),
    K.rect(-7, 16, 7, 35.5),
    [[-7, 16.01], [7, 16.01], [0, 11.8]],
    K.rect(6, DEL_V - 2.5, 44.01, DEL_V + 2.5),
    K.rect(44, DEL_V - 3.5, SEAT_U, DEL_V + 3.5),
    K.rect(RELIEF_U - 1.25, DEL_V, RELIEF_U + 1.25, 30.5),
    K.rect(-22, REL_V - 1.5, -6, REL_V + 1.5),
  ];
}

// Pump side: the chamber under the plunger, the seat's bore, the plugged drilling.
export function pumpOil(x) {
  return [
    K.rect(PU - 6, BALL_SEAT_V, PU + 6, M.plungerV(x)),
    K.rect(SEAT_U, DEL_V - 1.5, 68.01, DEL_V + 1.5),
    K.rect(PU + 5.99, DEL_V - 3.5, 95, DEL_V + 3.5),
  ];
}

// Reservoir side, at atmospheric pressure: the annulus, the drop, the gallery, the release bore.
export function resOil(h) {
  const lv = M.levelAt(h);
  return [
    K.rect(-32.5, M.RES_FLOOR, -20, lv),
    K.rect(20, M.RES_FLOOR, 32.5, lv),
    K.rect(DROP_U - 2.5, 4.5, DROP_U + 2.5, 41.01),
    [[DROP_U - 2.5, GAL_V - 2.49], [DROP_U + 2.5, GAL_V - 2.49], [DROP_U, 4]],
    K.rect(DROP_U, GAL_V - 2.5, 95, GAL_V + 2.5),
    K.rect(PU - 2, GAL_V, PU + 2, BALL_SEAT_V + 0.01),
    K.rect(-52, REL_V - 3.5, -22, REL_V + 3.5),
    K.rect(RELIEF_U - 3, 30.5, RELIEF_U + 3, 37.51),
    K.rect(RELIEF_U - 1, 37.5, RELIEF_U + 1, 41.01),
  ];
}

export const oilPath = (V, shapes) => shapes.map((s) => K.d(V, s)).join("");

// ---------------------------------------------------------------- SECTION A-A, plan at v = 40

export const AA_V = 40;
const PLAN = [
  [-40, -35], ...K.arc(92, -27, 8, -90, 0, 6), ...K.arc(92, 27, 8, 0, 90, 6), [-40, 35],
];
export function planBase(V) {
  const holes = [K.circle(0, 0, 20, 64), K.circle(PU, 0, 12, 48), K.circle(DROP_U, 0, 2.5, 20), K.circle(RELIEF_U, 0, 3.45, 24)];
  const d = K.d(V, PLAN) + holes.map((h) => K.d(V, h)).join("");
  const majors = K.line(V, K.circle(RELIEF_U, 0, 4, 24), "thin", true);
  return part(
    1,
    `<path class="paper" d="${d}" fill-rule="evenodd"/><path fill="url(#h-iron-45)" d="${d}" fill-rule="evenodd"/>` +
      `<path class="vis" d="${K.d(V, PLAN.slice(1, -1), false)}"/>${holes.map((h) => K.line(V, h, "vis", true)).join("")}` +
      majors
  );
}

// The broken edges of the partial plan: freehand thin lines.
export function planBreaks(V) {
  const wave = (a, b, n = 6, amp = 1.2) => {
    const pts = [];
    for (let i = 0; i <= n * 4; i++) {
      const t = i / (n * 4);
      const u = a[0] + (b[0] - a[0]) * t;
      const w = a[1] + (b[1] - a[1]) * t;
      const s = Math.sin(t * n * Math.PI * 2) * amp;
      pts.push(a[0] === b[0] ? [u + s, w] : [u, w + s]);
    }
    return pts;
  };
  return K.lines(V, [wave([-40, -35], [-40, 35]), wave([-40, 35], [84, 35], 12), wave([-40, -35], [84, -35], 12)], "thin");
}

export function planRing(V, id, ri, ro, mat, angle) {
  const d = K.d(V, K.circle(id === 2 ? 0 : PU, 0, ro, 64)) + K.d(V, K.circle(id === 2 ? 0 : PU, 0, ri, 64));
  return part(id, `<path class="paper" d="${d}" fill-rule="evenodd"/><path fill="url(#h-${mat}-${angle})" d="${d}" fill-rule="evenodd"/><path class="vis" d="${d}"/>`);
}

export function planSetScrew(V) {
  const hex = [];
  for (let i = 0; i < 6; i++) hex.push([RELIEF_U + 2 * Math.cos((i * Math.PI) / 3), 2 * Math.sin((i * Math.PI) / 3)]);
  const d = K.d(V, K.circle(RELIEF_U, 0, 4, 32)) + K.d(V, K.circle(RELIEF_U, 0, 1, 16));
  return part(26, `<path class="paper" d="${d}" fill-rule="evenodd"/><path fill="url(#h-steel-135)" d="${d}" fill-rule="evenodd"/><path class="vis" d="${d}"/>` + K.line(V, hex, "hid", true));
}

// What the plane at v = 40 cuts inside the Ø32 bore and the Ø12 bore, for a lift and a stroke.
export function planRam(V, h) {
  if (h > AA_V - M.RAM_LOW) return "";
  if (h < AA_V - (M.RAM_LOW + 3)) {
    const ring = K.d(V, K.circle(0, 0, 16, 64)) + K.d(V, K.circle(0, 0, 12.5, 64));
    return (
      part(6, `<path class="paper" d="${ring}" fill-rule="evenodd"/><path fill="url(#h-rubber-45)" d="${ring}" fill-rule="evenodd"/><path class="vis" d="${ring}"/>`) +
      part(5, K.cut(V, K.circle(0, 0, 12.5, 64), { mat: "steel", angle: 45 }))
    );
  }
  return part(5, K.cut(V, K.circle(0, 0, 15.6, 64), { mat: "steel", angle: 45 }));
}

export const planPlunger = (V, x) => (M.plungerV(x) > AA_V ? "" : part(14, K.cut(V, K.circle(PU, 0, 6, 40), { mat: "steel", angle: 45 })));
