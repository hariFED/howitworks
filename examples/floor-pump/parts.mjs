// The floor pump's parts, in world mm (u right, v up, the pump's axis at u = 0).
// Each function draws one part into a view and returns SVG, so the main view and every
// detail view draw the same geometry at their own scale. Moving parts are drawn at the bottom
// of the stroke (x = 1) and the page moves them with a transform.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;

const PV = M.PASSAGE_V;
const ballSeat = M.SEAT_U + Math.sqrt((M.BALL_D / 2) ** 2 - (M.PASSAGE_D / 2) ** 2);
export const ballU = (lift) => ballSeat + lift;
export const GAUGE_U = 62;

// ---------------------------------------------------------------- base

export function treads(V) {
  const pad = K.rrect(-116, 0, -72, 5, 1.5);
  return part(2, K.cut(V, pad, { mat: "rubber" }) + K.cut(V, K.flipU(pad), { mat: "rubber" }));
}

// The die-cast base, cut through the pump's axis. The air path (socket, drilling, cross passage,
// valve chamber, barb thread, gauge port) splits the section into four pieces.
export function casting(V) {
  const low = [
    ...K.arc(-115, 8, 3, 180, 270, 3),
    ...K.arc(115, 8, 3, -90, 0, 3),
    ...K.arc(115, 17, 3, 0, 90, 3),
    [80, 20], [80, 23], [43, 23], [40, 26], [7, 26], [7, 34],
    [-17.5, 34], [-17.5, 40], [-19.5, 40], [-19.5, 43], [-17.5, 43], [-17.5, 47],
    [-40, 47], [-40, 20],
    ...K.arc(-115, 17, 3, 90, 180, 3),
  ];
  const upper = [
    [13, 32], [40, 32], [43, 35], [60, 35], [60, 58], [59, 58], [59, 66],
    [19, 66], [17.5, 64.5], [17.5, 43], [19.5, 43], [19.5, 40], [17.5, 40], [17.5, 34], [13, 34],
  ];
  const right = [[64, 35], [80, 35], ...K.arc(77, 63, 3, 0, 90, 3), [65, 66], [65, 58], [64, 58]];
  const left = [[-40, 53], [-17.5, 53], [-17.5, 64.5], [-19, 66], ...K.arc(-37, 63, 3, 90, 180, 3)];
  const rib = [[-78, 20], [-40, 20], [-40, 44]];
  return part(
    1,
    [low, upper, right, left].map((p) => K.cut(V, p, { mat: "alu", angle: 45 })).join("") +
      K.body(V, rib) +
      // the 118° drill point under the cross passage, seen through the cut
      K.line(V, [[7, 26], [10, 24.2], [13, 26]], "thin")
  );
}

export function clampScrew(V) {
  const head = [[-46, 45.5], [-45.5, 45], [-40, 45], [-40, 55], [-45.5, 55], [-46, 54.5]];
  const shank = [[-40, 47], [-18, 47], [-17.5, 47.5], [-17.5, 52.5], [-18, 53], [-40, 53]];
  return part(
    5,
    K.body(V, shank) +
      K.body(V, head) +
      K.lines(V, [[[-38, 47.6], [-18.5, 47.6]], [[-38, 52.4], [-18.5, 52.4]]], "thin") +
      K.line(V, K.rect(-46, 47.6, -42.6, 52.4), "hid", true)
  );
}

export function barrel(V) {
  return part(3, K.section(V, { ...K.revolve([[16, M.FLOOR], [17.5, M.FLOOR], [17.5, 430], [16, 430]]), edges: [] }, { mat: "solid" }));
}

export function oring(V) {
  const s = K.rrect(17.5, 40, 19.5, 43, 0.9);
  return part(4, K.cut(V, s, { mat: "rubber" }) + K.cut(V, K.flipU(s), { mat: "rubber" }));
}

export function cap(V) {
  const rev = K.revolve([[8, 438], [18.5, 438], [20, 436.5], [20, 402], [17.5, 402], [17.5, 430], [8, 430]]);
  return part(6, K.section(V, { ...rev, edges: [] }, { mat: "plastic", angle: 45 }));
}

export function bushing(V) {
  const rev = K.revolve([[5, 426], [8, 426], [8, 438], [10, 438], [10, 442], [5, 442]]);
  return part(7, K.section(V, { ...rev, edges: [] }, { mat: "bronze", angle: 135 }));
}

// ---------------------------------------------------------------- outlet

export function barb(V) {
  const loop = [
    [3, 66], [6, 66], [6, 80], [9, 80], [9, 88], [5, 88], [5, 92],
    [5.6, 92], [4.6, 97], [5.6, 97], [4.6, 102], [5.6, 102], [4.6, 107], [5.6, 107], [3.8, 113], [3, 113],
  ];
  const rev = K.revolve(loop, { axis: "u", at: PV });
  const thread = [[[67, PV + 5.3], [79, PV + 5.3]], [[67, PV - 5.3], [79, PV - 5.3]]];
  return part(19, K.section(V, rev, { mat: "brass", angle: 135 }) + K.lines(V, thread, "thin"));
}

export function hose(V) {
  const loop = [[5.6, 93], [8.6, 93], [8.6, 160], [7.6, 160.9], [6.6, 160.2], [5.6, 161]];
  const rev = K.revolve(loop, { axis: "u", at: PV });
  return part(20, K.section(V, { ...rev, edges: [] }, { mat: "rubber" }));
}

// ---------------------------------------------------------------- gauge, cut through its centre

export function gaugeBody(V) {
  const g = GAUGE_U;
  const stem = K.revolve([[1, 58], [3, 58], [3, 68], [5, 68], [5, 73], [3, 73], [3, 82], [1, 82]], { at: g });
  const shell = [[27.6, 80], [59, 80], [59, 81.4], [29, 81.4], [29, 95], [27.6, 95]];
  const bezel = K.rect(26.6, 95, 30.6, 99.6);
  const tubes = [41, 83].map((u) => K.cut(V, K.circle(u, 84.5, 2.2, 16), { mat: "solid" }) + `<path class="paper" d="${K.d(V, K.circle(u, 84.5, 1.1, 12))}"/>`).join("");
  return part(
    21,
    K.section(V, { ...stem, edges: [] }, { mat: "brass", angle: 135 }) +
      K.cut(V, shell, { mat: "solid" }) +
      K.cut(V, K.flipU(shell, g), { mat: "solid" }) +
      K.cut(V, bezel, { mat: "solid" }) +
      K.cut(V, K.flipU(bezel, g), { mat: "solid" }) +
      K.cut(V, K.rect(30.6, 96.4, 93.4, 98.2), { mat: "plastic", angle: 135 }) +
      K.cut(V, K.rect(29, 88, 95, 88.9), { mat: "solid" }) +
      tubes +
      K.body(V, K.rect(55, 82, 69, 87.6)) +
      K.body(V, K.rect(61.4, 88.9, 62.6, 92.6))
  );
}

// Dial angle for a gauge reading: 0 bar at lower left, 11 bar at lower right, clockwise.
export const needleAngle = (bar) => 225 - (270 * Math.min(11.5, Math.max(-0.3, bar))) / 11;

// The needle seen edge-on in the section: its length along u is the cosine of its angle.
export function needleSection(V, bar) {
  const c = Math.cos((needleAngle(bar) * Math.PI) / 180);
  return K.line(V, [[GAUGE_U - 6 * c, 91.4], [GAUGE_U + 27 * c, 91.4]]) + K.body(V, K.rect(60.2, 90.6, 63.8, 92.2));
}

// ---------------------------------------------------------------- check valve

export function ball(V, lift) {
  return part(17, K.body(V, K.circle(ballU(lift), PV, M.BALL_D / 2, 40)));
}

export function spring(V, lift) {
  return part(18, K.springSection(V, { from: ballU(lift) + M.BALL_D / 2, to: 66, radius: 4, wire: 0.9, turns: 5, axis: "u", at: PV }));
}

// ---------------------------------------------------------------- air

// The air below the cup seal and in the passages up to the ball: chamber pressure.
export function chamberAir(x) {
  const top = M.pistonV(x) + M.POCKET;
  return [
    K.rect(-16, M.FLOOR, 16, top),
    K.rect(7, 26, 13, M.FLOOR + 0.01),
    K.rect(7, 26, 40, 32),
    [[40, 26], [43, 23], [43, 35], [40, 32]],
  ];
}

// The air past the ball: valve chamber, barb, hose and gauge port, at tyre pressure.
export const tyreAir = [
  K.rect(43, 23, 80, 35),
  K.rect(66, 26, 113, 32),
  K.rect(113, 23.4, 160, 34.6),
  K.rect(60, 35, 64, 58.01),
  K.rect(61, 58, 63, 82),
];

export const airPath = (V, shapes) => shapes.map((s) => K.d(V, s)).join("");

// ---------------------------------------------------------------- moving: rod, piston, handle

export const VP = M.PISTON_LOW; // moving parts are drawn here, at the bottom of the stroke

export function rod(V, vp = VP) {
  return part(8, K.body(V, [[-4.5, vp], [4.5, vp], [5, vp + 0.5], [5, vp + M.ROD], [-5, vp + M.ROD], [-5, vp + 0.5]]));
}

export function cupLoop(vp, fold) {
  const c = vp + 10;
  const tip = 16 - fold;
  return [[5, c], [8, c], [8, c + 4.5], [13.8, c + 4.5], [tip - 1.4, c + 0.5], [tip, c + 0.5], [15.7, c + 9], [5, c + 9]];
}

export function cup(V, fold, vp = VP) {
  return part(10, K.section(V, { ...K.revolve(cupLoop(vp, fold)), edges: [] }, { mat: "rubber" }));
}

export function piston(V, vp = VP) {
  const nut = [[-8.8, vp], [8.8, vp], [9.8, vp + 1], [9.8, vp + 7], [8.8, vp + 8], [-8.8, vp + 8], [-9.8, vp + 7], [-9.8, vp + 1]];
  const washer = K.revolve([[5, vp + 8], [10, vp + 8], [10, vp + 10], [5, vp + 10]]);
  const c = vp + 10;
  const hub = K.revolve([[5, c + 9], [13.5, c + 9], [13.5, c + 17], [12.5, c + 18], [5, c + 18]]);
  return (
    part(12, K.body(V, nut) + K.lines(V, [[[-4.9, vp + 0.6], [-4.9, vp + 7.4]], [[4.9, vp + 0.6], [4.9, vp + 7.4]]])) +
    part(11, K.section(V, { ...washer, edges: [] }, { mat: "steel", angle: 135 })) +
    part(9, K.section(V, { ...hub, edges: [] }, { mat: "alu", angle: 135 }))
  );
}

export const handleCentre = (vp = VP) => vp + M.ROD - 13 + 24;

export function handle(V, vp = VP) {
  const h0 = vp + M.ROD - 13;
  const hc = h0 + 24;
  const lowLeft = [[-14, h0], [-5, h0], [-5, h0 + 13], [-16, h0 + 13], [-16, h0 + 2]];
  const top = [[-16, h0 + 35], [16, h0 + 35], [16, h0 + 38], [14, h0 + 40], [-14, h0 + 40], [-16, h0 + 38]];
  const tube = K.revolve([[9.5, -136], [11, -136], [11, 136], [9.5, 136]], { axis: "u", at: hc });
  const grip = [[11, 18], [14, 18], [16, 21], [16, 123], [14, 126], [11, 126]];
  const gripL = grip.map(([r, s]) => [r, -s]).reverse();
  const plug = [[0, 131], [9.5, 131], [9.5, 136], [13, 136], [13, 140], [0, 140]];
  const plugL = plug.map(([r, s]) => [r, -s]).reverse();
  const onU = (loop) => K.revolve(loop, { axis: "u", at: hc });
  return (
    part(14, K.section(V, { ...tube, edges: [] }, { mat: "solid" })) +
    part(13, [lowLeft, K.flipU(lowLeft), top].map((p) => K.cut(V, p, { mat: "plastic", angle: 45 })).join("")) +
    part(15, K.section(V, { ...onU(grip), edges: [] }, { mat: "foam" }) + K.section(V, { ...onU(gripL), edges: [] }, { mat: "foam" })) +
    part(16, K.section(V, onU(plug), { mat: "plastic", angle: 135 }) + K.section(V, onU(plugL), { mat: "plastic", angle: 135 }))
  );
}

// The handle, rod and piston at the top of the stroke, as phantom lines (the alternate position).
export function phantomTop(V) {
  const vp = M.pistonV(0);
  const h0 = vp + M.ROD - 13;
  const hc = h0 + 24;
  const right = [
    [0, hc + 16], [14, hc + 16], [16, hc + 14], [16, hc + 11], [18, hc + 11], [18, hc + 14], [21, hc + 16],
    [123, hc + 16], [126, hc + 14], [126, hc + 11], [136, hc + 11], [136, hc + 13], [140, hc + 13],
    [140, hc - 13], [136, hc - 13], [136, hc - 11], [126, hc - 11], [126, hc - 14], [123, hc - 16],
    [21, hc - 16], [18, hc - 14], [18, hc - 11], [16, hc - 11], [16, h0 + 2], [14, h0], [5, h0], [5, 442],
  ];
  return K.line(V, [...right, ...K.flipU(right)], "phan", true) + K.line(V, K.rect(-16, vp, 16, vp + 28), "phan", true);
}

// ---------------------------------------------------------------- gauge face (VIEW C, from above)

export function gaugeFace(V) {
  let out = K.body(V, K.circle(0, 0, 35.4, 72));
  out += K.line(V, K.circle(0, 0, 31.4, 72), "vis", true);
  out += K.line(V, K.circle(0, 0, 33.4, 72), "thin", true);
  out += K.line(V, K.arc(0, 0, 29, -45, 225, 54), "thin");
  const ticks = [];
  for (let i = 0; i <= 55; i++) {
    const bar = i / 5;
    const a = (needleAngle(bar) * Math.PI) / 180;
    const r0 = i % 5 === 0 ? 25.6 : 27.2;
    ticks.push([[r0 * Math.cos(a), r0 * Math.sin(a)], [29 * Math.cos(a), 29 * Math.sin(a)]]);
  }
  out += K.lines(V, ticks, "thin");
  let numbers = "";
  for (let bar = 0; bar <= 11; bar++) {
    const a = (needleAngle(bar) * Math.PI) / 180;
    const [x, y] = V.p([21.4 * Math.cos(a), 21.4 * Math.sin(a)]);
    numbers += `<text class="t t-sm" x="${x}" y="${K.r2(y + 2.7)}" text-anchor="middle">${bar}</text>`;
  }
  const [lx, ly] = V.p([0, -13]);
  numbers += `<text class="t t-sm" x="${lx}" y="${ly}" text-anchor="middle">bar</text>`;
  return part(21, out) + `<g data-role="engraved">${numbers}</g>`;
}

export function needleFace(V, bar) {
  const a = (needleAngle(bar) * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const at = (along, across) => [along * ca - across * sa, along * sa + across * ca];
  const needle = [at(27, 0), at(0, 0.9), at(-7, 0.7), at(-7, -0.7), at(0, -0.9)];
  return K.cut(V, needle, { mat: "solid" }) + K.body(V, K.circle(0, 0, 2.4, 20));
}
