// The floor pump's solids for the 3D page, in the same world mm as ../floor-pump/parts.mjs:
// u becomes x, v becomes y, and the cutting plane of the 2D sheet is z = 0. Pure data, no DOM, no three.js.
//
// Bodies of revolution are the 2D sheet's half-profiles [r, s] (the same numbers, and the same
// functions where parts.mjs exports them), revolved by the page. Everything else is an extrusion of
// an outline the section already gives. Each solid is closed: the page's section caps depend on it.
//
// Solid kinds the page knows:
//   lathe   { loop: [[r, s]…], axis: "y" | "x", at }            axis "y" at x = at; axis "x" at y = at
//   extrude { shape: [[a, b]…], holes, along: "y" | "z" | "x", from, to, conform }
//   sphere  { c, r }   helix { from, to, at, radius, wire, turns }   torus { c, R, r, arc }   box { min, max }
// Roles: solid (cut faces capped), void (a bore inside its parent: its far wall shows through the cut),
// air (stippled in the accent by pressure), glass (seen through; capped only where truly cut),
// dial (the printed dial face), mouth (a dark hole decal), ink (a black part: the needle).

import * as K from "../../kit/draft.mjs";
import * as M from "../floor-pump/model.mjs";
import * as P from "../floor-pump/parts.mjs";

const PV = M.PASSAGE_V;
const G = P.GAUGE_U;
const VP = P.VP; // moving parts are built at the bottom of the stroke, as on the sheet
const C = VP + 10; // the cup's seat on the washer
const H0 = VP + M.ROD - 13; // underside of the handle hub
const HC = P.handleCentre(VP); // handle tube axis
export const HOSE_END = 230;
export const REST = { VP, C, H0, HC };

const mirrorS = (loop) => loop.map(([r, s]) => [r, -s]).reverse();

// ---------------------------------------------------------------- parts and their solids
// hatch: a kit material (MATERIALS) with an angle, "solid" (blacked in: thin sections), or "none"
// (rods, nuts, screws, balls, ribs: never hatched when cut lengthwise).
export function parts(fold = 0) {
  return [
    {
      id: 1, name: "BASE", group: "static",
      solids: [
        // footplate: a rounded plan, the section's r3 edge fillets as a bevel
        { kind: "extrude", shape: rrectAt(0, 0, 118 - 2.5, 34 - 2.5, 20, 10), along: "y", from: 5, to: 20, bevel: 2.5, hatch: ["alu", 45] },
        // central boss with the barrel socket and the O-ring groove (the 2D "left" and "low" pieces)
        {
          kind: "lathe", axis: "y", at: 0, hatch: ["alu", 45],
          loop: [[0, 20], [40, 20], ...K.arc(37, 63, 3, 0, 90, 3), [19, 66], [17.5, 64.5], [17.5, 43], [19.5, 43], [19.5, 40], [17.5, 40], [17.5, M.FLOOR], [0, M.FLOOR]],
        },
        // side arm holding the check valve and the gauge port, its inner face on the boss cylinder
        {
          kind: "extrude", along: "z", from: -16, to: 16, conform: { x: 40, r: 40 }, hatch: ["alu", 45],
          shape: [[40, 20], [80, 20], ...K.arc(77, 63, 3, 0, 90, 3), [40, 66]],
        },
        // web under the left side (ribs are not hatched when cut lengthwise)
        { kind: "extrude", along: "z", from: -3, to: 3, conform: { x: -40, r: 40 }, hatch: "none", edge: "rib", shape: [[-78, 20], [-40, 20], [-40, 44]] },
        // the air path, drilled and bored: these are holes in the parts above
        { kind: "lathe", role: "void", axis: "y", at: M.DRILL_U, loop: [[0, 32], [3, 32], [3, M.FLOOR], [0, M.FLOOR]] },
        { kind: "lathe", role: "void", axis: "x", at: PV, loop: [[0, 7], [3, 7], [3, M.SEAT_U], [0, M.SEAT_U]] },
        { kind: "lathe", role: "void", axis: "x", at: PV, loop: [[0, M.SEAT_U], [3, M.SEAT_U], [6.02, 43], [6.02, 80], [0, 80]] },
        { kind: "lathe", role: "void", axis: "y", at: G, loop: [[0, 34.6], [2, 34.6], [2, 58], [3.02, 58], [3.02, 66], [0, 66]] },
        { kind: "lathe", role: "void", axis: "x", at: 50, loop: [[0, -40], [3.03, -40], [3.03, -17.45], [0, -17.45]] },
        { kind: "disc", role: "mouth", c: [M.DRILL_U, M.FLOOR + 0.03, 0], r: 3 },
      ],
    },
    {
      id: 2, name: "TREAD PAD", group: "static",
      solids: [-1, 1].map((sx) => ({ kind: "extrude", shape: rrectAt(sx * 94, 0, 21, 29, 5), along: "y", from: 0, to: 5, bevel: 1, hatch: ["rubber", 45] })),
    },
    { id: 3, name: "BARREL TUBE", group: "static", solids: [{ kind: "lathe", axis: "y", at: 0, hatch: "solid", loop: [[16, M.FLOOR], [17.5, M.FLOOR], [17.5, 430], [16, 430]] }] },
    { id: 4, name: "O-RING", group: "static", solids: [{ kind: "lathe", axis: "y", at: 0, hatch: ["rubber", 45], loop: K.rrect(17.5, 40, 19.5, 43, 0.9) }] },
    {
      id: 5, name: "CLAMP SCREW", group: "static",
      solids: [{ kind: "lathe", axis: "x", at: 50, hatch: "none", loop: [[0, -46], [4.5, -46], [5, -45.5], [5, -40], [3, -40], [3, -18], [2.5, -17.5], [0, -17.5]] }],
    },
    { id: 6, name: "TOP CAP", group: "static", solids: [{ kind: "lathe", axis: "y", at: 0, hatch: ["plastic", 45], loop: [[8, 438], [18.5, 438], [20, 436.5], [20, 402], [17.5, 402], [17.5, 430], [8, 430]] }] },
    { id: 7, name: "ROD BUSHING", group: "static", solids: [{ kind: "lathe", axis: "y", at: 0, hatch: ["bronze", 135], loop: [[5, 426], [8, 426], [8, 438], [10, 438], [10, 442], [5, 442]] }] },
    // ---- moving: rod, piston, handle (built at the bottom of the stroke)
    { id: 8, name: "PISTON ROD", group: "piston", solids: [{ kind: "lathe", axis: "y", at: 0, hatch: "none", loop: [[0, VP], [4.5, VP], [5, VP + 0.5], [5, VP + M.ROD], [0, VP + M.ROD]] }] },
    { id: 9, name: "PISTON HUB", group: "piston", solids: [{ kind: "lathe", axis: "y", at: 0, hatch: ["alu", 135], loop: [[5, C + 9], [13.5, C + 9], [13.5, C + 17], [12.5, C + 18], [5, C + 18]] }] },
    { id: 10, name: "CUP SEAL", group: "piston", solids: [{ kind: "lathe", axis: "y", at: 0, hatch: ["rubber", 45], loop: P.cupLoop(VP, fold), live: "cup" }] },
    { id: 11, name: "WASHER", group: "piston", solids: [{ kind: "lathe", axis: "y", at: 0, hatch: ["steel", 135], loop: [[5, VP + 8], [10, VP + 8], [10, VP + 10], [5, VP + 10]] }] },
    { id: 12, name: "HEX NUT M10", group: "piston", solids: [{ kind: "extrude", shape: hexagon(M.NUT.af / 2), holes: [circle(0, 0, 5, 40)], along: "y", from: VP, to: VP + M.NUT.h, hatch: "none" }] },
    {
      id: 13, name: "HANDLE HUB", group: "piston",
      solids: [
        { kind: "extrude", shape: rrectAt(0, 0, 16, 16, 1.5), holes: [circle(0, 0, 5, 40)], along: "y", from: H0, to: H0 + 13, hatch: ["plastic", 45] },
        { kind: "extrude", shape: saddle(H0 + 13, H0 + 40, HC, 11), along: "x", from: -16, to: 16, hatch: ["plastic", 45] },
      ],
    },
    { id: 14, name: "HANDLE TUBE", group: "piston", solids: [{ kind: "lathe", axis: "x", at: HC, hatch: "solid", loop: [[9.5, -136], [11, -136], [11, 136], [9.5, 136]] }] },
    {
      id: 15, name: "GRIP", group: "piston",
      solids: [1, -1].map((sx) => {
        const g = [[11, 18], [14, 18], [16, 21], [16, 123], [14, 126], [11, 126]];
        return { kind: "lathe", axis: "x", at: HC, hatch: ["foam", 45], loop: sx > 0 ? g : mirrorS(g), side: sx };
      }),
    },
    {
      id: 16, name: "END PLUG", group: "piston",
      solids: [1, -1].map((sx) => {
        const g = [[0, 131], [9.48, 131], [9.48, 136], [13, 136], [13, 140], [0, 140]];
        return { kind: "lathe", axis: "x", at: HC, hatch: ["plastic", 135], loop: sx > 0 ? g : mirrorS(g), side: sx };
      }),
    },
    // ---- check valve and outlet
    { id: 17, name: "CHECK BALL", group: "ball", solids: [{ kind: "sphere", c: [P.ballU(0), PV, 0], r: M.BALL_D / 2, hatch: "none" }] },
    { id: 18, name: "VALVE SPRING", group: "spring", solids: [{ kind: "helix", from: P.ballU(0) + M.BALL_D / 2, to: 66, at: PV, radius: 4, wire: 0.9, turns: 5, hatch: "solid" }] },
    {
      id: 19, name: "HOSE BARB", group: "static",
      solids: [{
        kind: "lathe", axis: "x", at: PV, hatch: ["brass", 135],
        loop: [[3, 66], [6, 66], [6, 80], [9, 80], [9, 88], [5, 88], [5, 92], [5.6, 92], [4.6, 97], [5.6, 97], [4.6, 102], [5.6, 102], [4.6, 107], [5.6, 107], [3.8, 113], [3, 113]],
      }],
    },
    { id: 20, name: "HOSE", group: "static", solids: [{ kind: "lathe", axis: "x", at: PV, hatch: ["rubber", 135], loop: [[5.6, 93], [8.6, 93], [8.6, HOSE_END], [5.6, HOSE_END]] }] },
    {
      id: 21, name: "GAUGE", group: "static",
      solids: [
        { kind: "lathe", axis: "y", at: G, hatch: ["brass", 135], loop: [[1, 58], [3, 58], [3, 68], [5, 68], [5, 73], [3, 73], [3, 82], [1, 82]] },
        { kind: "lathe", axis: "y", at: G, hatch: "solid", loop: [[3, 80], [34.4, 80], [34.4, 95], [33, 95], [33, 81.4], [3, 81.4]] },
        { kind: "lathe", axis: "y", at: G, hatch: "solid", loop: [[31.4, 95], [35.4, 95], [35.4, 99.6], [31.4, 99.6]] },
        { kind: "lathe", axis: "y", at: G, hatch: "solid", loop: [[0, 88], [33, 88], [33, 88.9], [0, 88.9]] },
        { kind: "lathe", axis: "y", at: G, role: "glass", hatch: ["plastic", 135], loop: [[0, 96.4], [31.4, 96.4], [31.4, 98.2], [0, 98.2]], glass: { y0: 96.4, y1: 98.2, r: 31.4 } },
        { kind: "disc", role: "dial", c: [G, 88.93, 0], r: 31.4 },
        { kind: "torus", c: [G, 84.5, 0], R: 21, r: 2.2, arc: [-45, 225], hatch: "solid" },
        { kind: "box", min: [55, 82, -5], max: [69, 87.6, 5], hatch: "none" },
        { kind: "lathe", axis: "y", at: G, hatch: "none", loop: [[0, 88.9], [0.6, 88.9], [0.6, 90.6], [0, 90.6]] },
        { kind: "lathe", axis: "y", at: G, hatch: "none", loop: [[0, 90.6], [1.8, 90.6], [1.8, 92.2], [0, 92.2]] },
        { kind: "needle", c: [G, 91.4, 0], role: "ink", live: "needle" },
      ],
    },
  ];
}

// The air the model talks about, as volumes the page stipples by pressure. The chamber's top rides
// with the piston: vertices above `liftFrom` move with the stroke.
export function air() {
  const tip = 15.97;
  return [
    {
      name: "chamber", pressure: "p", axis: "y", at: 0, liftFrom: M.FLOOR + 1,
      loop: [[0, M.FLOOR], [15.97, M.FLOOR], [15.97, C + 0.5], [tip - 1.4, C + 0.5], [13.8, C + 4.47], [8.03, C + 4.47], [8.03, C + 0.03], [10.03, C + 0.03], [10.03, VP + 8], [9.85, VP + 8], [9.85, VP], [0, VP]],
    },
    { name: "drill", pressure: "p", axis: "y", at: M.DRILL_U, loop: [[0, 32], [2.97, 32], [2.97, M.FLOOR], [0, M.FLOOR]] },
    { name: "cross", pressure: "p", axis: "x", at: PV, loop: [[0, 7.03], [2.97, 7.03], [2.97, M.SEAT_U], [0, M.SEAT_U]] },
    { name: "valve", pressure: "pt", axis: "x", at: PV, loop: [[0, M.SEAT_U], [2.97, M.SEAT_U], [5.97, 43], [5.97, 66], [0, 66]] },
    { name: "barb", pressure: "pt", axis: "x", at: PV, loop: [[0, 66], [2.97, 66], [2.97, 113], [0, 113]] },
    { name: "hose", pressure: "pt", axis: "x", at: PV, loop: [[0, 113], [5.57, 113], [5.57, HOSE_END], [0, HOSE_END]] },
    { name: "port", pressure: "pt", axis: "y", at: G, loop: [[0, 35], [1.97, 35], [1.97, 58], [0.97, 58], [0.97, 82], [0, 82]] },
  ];
}

// ---------------------------------------------------------------- exploded view
// Where each part goes at explode = 1: [dx, dy, dz] from where it sits assembled. Moving parts give
// an absolute lift instead (`lift`), since their assembled height depends on the stroke.
// Order along the axis: base, O-ring, barrel, cap, bushing, then the piston stack, rod and handle.
export const EXPLODE = {
  1: [0, 0, 0],
  2: [0, -34, 0],
  3: [0, 112, 0],
  4: [0, 58, 0],
  5: [-48, 0, 0],
  6: [0, 186, 0],
  7: [0, 236, 0],
  8: { lift: 874 },
  9: { lift: 786 },
  10: { lift: 752 },
  11: { lift: 722 },
  12: { lift: 694 },
  13: { lift: 904 },
  14: { lift: 904 },
  15: { lift: 904, side: 46 },
  16: { lift: 904, side: 82 },
  17: [15, 0, 0],
  18: [31, 0, 0],
  19: [58, 0, 0],
  20: [96, 0, 0],
  21: [0, 64, 0],
};

// ---------------------------------------------------------------- balloon anchors
// `cut`: a point on the part's cut face (z = 0), used while the section is open.
// `out`: a surface point used when it is closed: on an axis ("y" or "x") the page pushes `c` out by `r`
// toward the camera; "box" pushes to a square of half-width r; "sphere" toward the camera in 3D.
export const ANCHORS = {
  1: { cut: [-90, 12, 0], out: { c: [-90, 20, 18] } },
  2: { cut: [-110, 2.5, 0], out: { c: [-104, 5, 22] } },
  3: { cut: [-16.75, 250, 0], out: { c: [0, 250, 0], r: 17.5, axis: "y" } },
  4: { cut: [-18.5, 41.5, 0], out: { c: [0, 41.5, 0], r: 19.5, axis: "y" } },
  5: { cut: [-43, 50, 0], out: { c: [-43, 50, 0], r: 5, axis: "x" } },
  6: { cut: [-19, 420, 0], out: { c: [0, 420, 0], r: 20, axis: "y" } },
  7: { cut: [-9, 440, 0], out: { c: [0, 440, 0], r: 10, axis: "y" } },
  8: { cut: [-2.5, VP + 300, 0], out: { c: [0, VP + 300, 0], r: 5, axis: "y" } },
  9: { cut: [-11, C + 13, 0], out: { c: [0, C + 13, 0], r: 13.5, axis: "y" } },
  10: { cut: [-15.2, C + 5, 0], out: { c: [0, C + 5, 0], r: 15.8, axis: "y" } },
  11: { cut: [-8, VP + 9, 0], out: { c: [0, VP + 9, 0], r: 10, axis: "y" } },
  12: { cut: [-7, VP + 4, 0], out: { c: [0, VP + 4, 0], r: 8.5, axis: "box" } },
  13: { cut: [-12, H0 + 6, 0], out: { c: [0, H0 + 6, 0], r: 16, axis: "box" } },
  14: { cut: [128.5, HC - 10.25, 0], out: { c: [128.5, HC, 0], r: 11, axis: "x" } },
  15: { cut: [80, HC - 13.5, 0], out: { c: [80, HC, 0], r: 16, axis: "x" } },
  16: { cut: [138, HC, 0], out: { c: [138, HC, 0], r: 13, axis: "x" } },
  17: { cut: [P.ballU(0) + 0.8, PV + 2, 0], out: { c: [P.ballU(0), PV, 0], r: 4, axis: "sphere" } },
  18: { cut: [55, PV + 4, 0], out: { c: [55, PV, 0], r: 4.45, axis: "x" } },
  19: { cut: [84, PV + 7, 0], out: { c: [84, PV, 0], r: 9, axis: "x" } },
  20: { cut: [150, PV + 7, 0], out: { c: [150, PV, 0], r: 8.6, axis: "x" } },
  21: { cut: [G - 33.4, 97.3, 0], out: { c: [G, 97.3, 0], r: 35.4, axis: "y" } },
};

// The parts list, as on the 2D sheet (BP-001).
export const BOM = {
  1: "BASE · AlSi12", 2: "TREAD PAD · NBR", 3: "BARREL Ø35×1.5 · E235", 4: "O-RING 33×2 · NBR", 5: "SCREW M6×28 ISO 4762",
  6: "TOP CAP · PA6", 7: "ROD BUSHING · CuSn8", 8: "PISTON ROD Ø10 · C45", 9: "PISTON HUB · 6082", 10: "CUP SEAL Ø32 · NBR",
  11: "WASHER Ø20×2", 12: "HEX NUT M10 ISO 4032", 13: "HANDLE HUB · PA6-GF30", 14: "HANDLE TUBE Ø22×1.5", 15: "GRIP · EPDM FOAM",
  16: "END PLUG · PE-LD", 17: "CHECK BALL Ø8 · 100Cr6", 18: "VALVE SPRING Ø0.9", 19: "HOSE BARB G1/8 · CuZn39", 20: "HOSE 12×6 · PVC", 21: "GAUGE Ø71 0–11 bar",
};

// ---------------------------------------------------------------- outline helpers
function circle(cx, cy, r, n = 32) {
  return Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)]);
}
function hexagon(flat) {
  const R = flat / Math.cos(Math.PI / 6);
  return Array.from({ length: 6 }, (_, i) => [R * Math.cos((i * Math.PI) / 3), R * Math.sin((i * Math.PI) / 3)]);
}
// A rounded rectangle centred on (cx, cy), half sizes hx, hy. A bevelled extrusion grows by its bevel,
// so bevelled outlines are given inset by it.
function rrectAt(cx, cy, hx, hy, r, steps = 4) {
  return K.rrect(cx - hx, cy - hy, cx + hx, cy + hy, r, steps);
}
// The handle hub above the collar: a block with the tube's cross bore, open in a slit at the bottom
// where the bore touches the collar (so the outline stays one simple polygon).
function saddle(y0, y1, yc, r) {
  const e = 2;
  const arc = K.arc(0, yc, r, -90 + e, 270 - e, 72);
  return [[16, y0], [16, y1], [-16, y1], [-16, y0], ...arc.reverse()];
}
