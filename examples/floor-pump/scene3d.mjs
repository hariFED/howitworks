// The floor pump's solids for its 3D view (floor-pump-3d.html), in the same world mm as parts.mjs:
// u is x, v is y, and the sheet's cutting plane is z = 0. Pure data built with kit/solid3d.mjs.
// The half-profiles are the 2D sheet's numbers (and its functions where parts.mjs exports them:
// cupLoop, ballU, handleCentre, GAUGE_U, needleAngle). Moving parts are built at the bottom of the
// stroke, as on the sheet, and live3d.js moves them.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const PV = M.PASSAGE_V;
const G = P.GAUGE_U;
const VP = P.VP;
const C = VP + 10; // the cup's seat on the washer
const H0 = VP + M.ROD - 13; // underside of the handle hub
const HC = P.handleCentre(VP); // handle tube axis
export const HOSE_END = 230;
export const REST = { VP, C, H0, HC };
// the spring's fixed end, on the barb's nose: it scales about this point as the ball lifts
export const SPRING_END = [66, PV, 0];
export const SPRING_LEN = 66 - (P.ballU(0) + M.BALL_D / 2);
// The rod, piston and handle explode up a parallel axis this far to the side (a jogged explosion
// line), so the exploded drawing is about half as tall.
export const JOG = 190;

const mirrorS = (loop) => loop.map(([r, s]) => [r, -s]).reverse();
const lift = (to) => ({ to: [JOG, to, 0] });

// The dial face of the gauge, drawn as View C of the 2D sheet draws it (up on the dial is -z).
function dial(g, size, tk) {
  const s = size / 2 / 31.4; // px per mm
  g.translate(size / 2, size / 2);
  g.strokeStyle = g.fillStyle = tk.ink;
  const pt = (r, deg) => [r * s * Math.cos((deg * Math.PI) / 180), -r * s * Math.sin((deg * Math.PI) / 180)];
  g.lineWidth = 0.35 * s;
  g.beginPath();
  g.arc(0, 0, 29 * s, (45 * Math.PI) / 180, (-225 * Math.PI) / 180, true);
  g.stroke();
  for (let i = 0; i <= 55; i++) {
    const deg = P.needleAngle(i / 5);
    g.lineWidth = (i % 5 === 0 ? 0.5 : 0.3) * s;
    g.beginPath();
    g.moveTo(...pt(i % 5 === 0 ? 25.6 : 27.2, deg));
    g.lineTo(...pt(29, deg));
    g.stroke();
  }
  g.font = `600 ${3.6 * s}px ui-monospace, Consolas, monospace`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let bar = 0; bar <= 11; bar++) g.fillText(String(bar), ...pt(21.4, P.needleAngle(bar)));
  g.font = `${3 * s}px ui-monospace, Consolas, monospace`;
  g.fillText("bar", 0, 13 * s);
}

export function parts() {
  const grip = [[11, 18], [14, 18], [16, 21], [16, 123], [14, 126], [11, 126]];
  const plug = [[0, 131], [9.48, 131], [9.48, 136], [13, 136], [13, 140], [0, 140]];
  return [
    S.part(1, "BASE", [
      // footplate: a rounded plan; the section's r3 edge fillets as a bevel (outline inset by it)
      S.extrude(S.rrectAt(0, 0, 118 - 2.5, 34 - 2.5, 20, 10), { along: "y", from: 5, to: 20, bevel: 2.5 }),
      // central boss: the barrel socket and the O-ring groove, from the section's "left"/"low" pieces
      S.lathe([[0, 20], [40, 20], ...K.arc(37, 63, 3, 0, 90, 3), [19, 66], [17.5, 64.5], [17.5, 43], [19.5, 43], [19.5, 40], [17.5, 40], [17.5, M.FLOOR], [0, M.FLOOR]]),
      // side arm for the check valve and the gauge port; its inner face lands on the boss cylinder
      S.extrude([[40, 20], [80, 20], ...K.arc(77, 63, 3, 0, 90, 3), [40, 66]], { along: "z", from: -16, to: 16, conform: { x: 40, r: 40 } }),
      // web under the left side: ribs are not hatched when cut lengthwise
      S.extrude([[-78, 20], [-40, 20], [-40, 44]], { along: "z", from: -3, to: 3, conform: { x: -40, r: 40 }, hatch: "none", own: true }),
      // the air path, drilled and bored: volumes inside the pieces above
      S.bore(S.lathe([[0, 32], [3, 32], [3, M.FLOOR], [0, M.FLOOR]], { axis: "y", at: M.DRILL_U })),
      S.bore(S.lathe([[0, 7], [3, 7], [3, M.SEAT_U], [0, M.SEAT_U]], { axis: "x", at: PV })),
      S.bore(S.lathe([[0, M.SEAT_U], [3, M.SEAT_U], [6.02, 43], [6.02, 80], [0, 80]], { axis: "x", at: PV })),
      S.bore(S.lathe([[0, 34.6], [2, 34.6], [2, 58], [3.02, 58], [3.02, 66], [0, 66]], { axis: "y", at: G })),
      S.bore(S.lathe([[0, -40], [3.03, -40], [3.03, -17.45], [0, -17.45]], { axis: "x", at: 50 })),
      S.disc([M.DRILL_U, M.FLOOR + 0.03, 0], 3, { role: "mouth" }),
    ], { mat: "alu", angle: 45, anchor: { cut: [-90, 12, 0], out: { c: [-90, 20, 18] } } }),
    S.part(2, "TREAD PAD", [-1, 1].map((sx) => S.extrude(S.rrectAt(sx * 94, 0, 21, 29, 5), { along: "y", from: 0, to: 5, bevel: 1 })), {
      mat: "rubber", explode: [0, -34, 0], anchor: { cut: [-110, 2.5, 0], out: { c: [-104, 5, 22] } },
    }),
    S.part(3, "BARREL TUBE Ø35×1.5", [S.tube({ r0: 16, r1: 17.5, from: M.FLOOR, to: 430 })], {
      hatch: "solid", explode: [0, 112, 0], anchor: { cut: [-16.75, 250, 0], out: { c: [0, 250, 0], r: 17.5, axis: "y" } },
    }),
    S.part(4, "O-RING 33×2", [S.lathe(K.rrect(17.5, 40, 19.5, 43, 0.9))], {
      mat: "rubber", explode: [0, 58, 0], anchor: { cut: [18.5, 41.5, 0], out: { c: [0, 41.5, 0], r: 19.5, axis: "y" } },
    }),
    S.part(5, "CLAMP SCREW M6×28", [S.lathe([[0, -46], [4.5, -46], [5, -45.5], [5, -40], [3, -40], [3, -18], [2.5, -17.5], [0, -17.5]], { axis: "x", at: 50 })], {
      explode: [-48, 0, 0], anchor: { cut: [-43, 50, 0], out: { c: [-43, 50, 0], r: 5, axis: "x" } },
    }),
    S.part(6, "TOP CAP", [S.lathe([[8, 438], [18.5, 438], [20, 436.5], [20, 402], [17.5, 402], [17.5, 430], [8, 430]])], {
      mat: "plastic", explode: [0, 186, 0], anchor: { cut: [-19, 420, 0], out: { c: [0, 420, 0], r: 20, axis: "y" } },
    }),
    S.part(7, "ROD BUSHING", [S.lathe([[5, 426], [8, 426], [8, 438], [10, 438], [10, 442], [5, 442]])], {
      mat: "bronze", angle: 135, explode: [0, 236, 0], anchor: { cut: [-9, 440, 0], out: { c: [0, 440, 0], r: 10, axis: "y" } },
    }),
    // ---- moving: rod, piston, handle (built at the bottom of the stroke)
    S.part(8, "PISTON ROD Ø10", [S.lathe([[0, VP], [4.5, VP], [5, VP + 0.5], [5, VP + M.ROD], [0, VP + M.ROD]])], {
      explode: lift(230), anchor: { cut: [-2.5, VP + 300, 0], out: { c: [0, VP + 300, 0], r: 5, axis: "y" } },
    }),
    S.part(9, "PISTON HUB", [S.lathe([[5, C + 9], [13.5, C + 9], [13.5, C + 17], [12.5, C + 18], [5, C + 18]])], {
      mat: "alu", angle: 135, explode: lift(166), anchor: { cut: [11, C + 13, 0], out: { c: [0, C + 13, 0], r: 13.5, axis: "y" } },
    }),
    S.part(10, "CUP SEAL Ø32", [S.lathe(P.cupLoop(VP, 0), { live: "cup" })], {
      mat: "rubber", explode: lift(146), anchor: { cut: [15.2, C + 5, 0], out: { c: [0, C + 5, 0], r: 15.8, axis: "y" } },
    }),
    S.part(11, "WASHER Ø20×2", [S.tube({ r0: 5, r1: 10, from: VP + 8, to: VP + 10 })], {
      mat: "steel", angle: 135, explode: lift(128), anchor: { cut: [-8, VP + 9, 0], out: { c: [0, VP + 9, 0], r: 10, axis: "y" } },
    }),
    S.part(12, "HEX NUT M10", [S.extrude(S.hexagon(M.NUT.af), { along: "y", from: VP, to: VP + M.NUT.h, holes: [S.circle(0, 0, 5.05, 48)] })], {
      explode: lift(110), anchor: { cut: [-7, VP + 4, 0], out: { c: [0, VP + 4, 0], r: 8.5, axis: "box" } },
    }),
    S.part(13, "HANDLE HUB", [
      S.extrude(S.rrectAt(0, 0, 16, 16, 1.5), { along: "y", from: H0, to: H0 + 13, holes: [S.circle(0, 0, 5, 40)] }),
      S.extrude(S.saddle(-16, 16, H0 + 13, H0 + 40, HC, 11), { along: "x", from: -16, to: 16 }),
    ], { mat: "plastic", explode: lift(262), anchor: { cut: [-12, H0 + 6, 0], out: { c: [0, H0 + 6, 0], r: 16, axis: "box" } } }),
    S.part(14, "HANDLE TUBE Ø22×1.5", [S.tube({ axis: "x", at: HC, r0: 9.5, r1: 11, from: -136, to: 136 })], {
      hatch: "solid", explode: lift(262), anchor: { cut: [128.5, HC - 10.25, 0], out: { c: [128.5, HC, 0], r: 11, axis: "x" } },
    }),
    S.part(15, "GRIP", [
      S.lathe(grip, { axis: "x", at: HC, explode: [46, 0, 0] }),
      S.lathe(mirrorS(grip), { axis: "x", at: HC, explode: [-46, 0, 0] }),
    ], { mat: "foam", explode: lift(262), anchor: { cut: [80, HC - 13.5, 0], out: { c: [80, HC, 0], r: 16, axis: "x" }, solid: 0 } }),
    S.part(16, "END PLUG", [
      S.lathe(plug, { axis: "x", at: HC, explode: [82, 0, 0] }),
      S.lathe(mirrorS(plug), { axis: "x", at: HC, explode: [-82, 0, 0] }),
    ], { mat: "plastic", angle: 135, explode: lift(262), anchor: { cut: [138, HC, 0], out: { c: [138, HC, 0], r: 13, axis: "x" }, solid: 0 } }),
    // ---- check valve and outlet
    S.part(17, "CHECK BALL Ø8", [S.sphere([P.ballU(0), PV, 0], M.BALL_D / 2)], {
      explode: [15, 0, 0], anchor: { cut: [P.ballU(0) + 0.8, PV + 2, 0], out: { c: [P.ballU(0), PV, 0], r: 4, axis: "sphere" } },
    }),
    S.part(18, "VALVE SPRING", [S.helix({ axis: "x", at: PV, from: P.ballU(0) + M.BALL_D / 2, to: 66, radius: 4, wire: 0.9, turns: 5, pivot: SPRING_END, live: "spring" })], {
      hatch: "solid", explode: [31, 0, 0], anchor: { cut: [55, PV + 4, 0], out: { c: [55, PV, 0], r: 4.45, axis: "x" } },
    }),
    S.part(19, "HOSE BARB G1/8", [S.lathe([[3, 66], [6, 66], [6, 80], [9, 80], [9, 88], [5, 88], [5, 92], [5.6, 92], [4.6, 97], [5.6, 97], [4.6, 102], [5.6, 102], [4.6, 107], [5.6, 107], [3.8, 113], [3, 113]], { axis: "x", at: PV })], {
      mat: "brass", angle: 135, explode: [58, 0, 0], anchor: { cut: [84, PV + 7, 0], out: { c: [84, PV, 0], r: 9, axis: "x" } },
    }),
    S.part(20, "HOSE 12×6", [S.tube({ axis: "x", at: PV, r0: 5.6, r1: 8.6, from: 93, to: HOSE_END })], {
      mat: "rubber", angle: 135, explode: [96, 0, 0], anchor: { cut: [150, PV + 7, 0], out: { c: [150, PV, 0], r: 8.6, axis: "x" } },
    }),
    S.part(21, "GAUGE Ø71", [
      S.lathe([[1, 58], [3, 58], [3, 68], [5, 68], [5, 73], [3, 73], [3, 82], [1, 82]], { at: G, hatch: ["brass", 135], own: true }),
      S.lathe([[3, 80], [34.4, 80], [34.4, 95], [33, 95], [33, 81.4], [3, 81.4]], { at: G, own: true }),
      S.tube({ at: G, r0: 31.4, r1: 35.4, from: 95, to: 99.6, own: true }),
      S.cylinder({ at: G, r: 33, from: 88, to: 88.9, own: true }),
      S.cylinder({ at: G, r: 31.4, from: 96.4, to: 98.2, role: "glass", hatch: ["plastic", 135], own: true }),
      S.disc([G, 88.93, 0], 31.4, { role: "decal", texture: dial, own: true }),
      S.torus([G, 84.5, 0], 21, 2.2, { arc: [-45, 225], own: true }),
      S.box([55, 82, -5], [69, 87.6, 5], { hatch: "none", own: true }),
      S.cylinder({ at: G, r: 0.6, from: 88.9, to: 90.6, hatch: "none", own: true }),
      S.cylinder({ at: G, r: 1.8, from: 90.6, to: 92.2, hatch: "none", own: true }),
      // the needle, a flat blade turning about the gauge's axis just above its hub
      S.extrude([[G + 27, 0], [G, 0.9], [G - 7, 0.7], [G - 7, -0.7], [G, -0.9]], { along: "y", from: 92.2, to: 92.7, role: "ink", pivot: [G, 92.2, 0], live: "needle", own: true }),
    ], { hatch: "solid", explode: [0, 64, 0], anchor: { cut: [G - 33.4, 97.3, 0], out: { c: [G, 97.3, 0], r: 35.4, axis: "y" } } }),
  ];
}

// The air the model talks about: chamber air at p (its top rides with the piston), tyre air at pt.
export function fluids() {
  const tip = 15.97;
  const ax = (loop, axis, at) => S.lathe(loop, { axis, at });
  return [
    S.fluid("chamber", ax([[0, M.FLOOR], [15.97, M.FLOOR], [15.97, C + 0.5], [tip - 1.4, C + 0.5], [13.8, C + 4.47], [8.03, C + 4.47], [8.03, C + 0.03], [10.03, C + 0.03], [10.03, VP + 8], [9.85, VP + 8], [9.85, VP], [0, VP]], "y", 0), { stretch: { from: M.FLOOR + 1 } }),
    S.fluid("drill", ax([[0, 32], [2.97, 32], [2.97, M.FLOOR], [0, M.FLOOR]], "y", M.DRILL_U)),
    S.fluid("cross", ax([[0, 7.03], [2.97, 7.03], [2.97, M.SEAT_U], [0, M.SEAT_U]], "x", PV)),
    S.fluid("valve", ax([[0, M.SEAT_U], [2.97, M.SEAT_U], [5.97, 43], [5.97, 66], [0, 66]], "x", PV)),
    S.fluid("barb", ax([[0, 66], [2.97, 66], [2.97, 113], [0, 113]], "x", PV)),
    S.fluid("hose", ax([[0, 113], [5.57, 113], [5.57, HOSE_END], [0, HOSE_END]], "x", PV)),
    S.fluid("port", ax([[0, 35], [1.97, 35], [1.97, 58], [0.97, 58], [0.97, 82], [0, 82]], "y", G)),
  ];
}
export const CHAMBER = ["chamber", "drill", "cross"];
export const TYRE = ["valve", "barb", "hose", "port"];

// centre lines: the pump's axis, the valve's, the gauge's, and the handle's (riding with part 14)
export const centres = () => [
  [[0, -12, 0], [0, 860, 0]],
  [[30, PV, 0], [HOSE_END + 10, PV, 0]],
  [[G, 52, 0], [G, 106, 0]],
  { line: [[-150, HC, 0], [150, HC, 0]], part: 14 },
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
