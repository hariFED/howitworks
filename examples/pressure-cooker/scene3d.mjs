// The pressure cooker's solids for its 3D view (pressure-cooker-3d.html), in the same world mm as
// parts.mjs: u is x, v is y, the pot's axis is x = 0 and the sheet's cutting plane A-A is z = 0.
// Pure data built with kit/solid3d.mjs. Numbers come from model.mjs and parts.mjs (exported
// constants and functions); the few profile numbers parts.mjs keeps inside its drawing functions
// are retyped here with the same values, next to the function they come from.
//
// Turned parts carry `cutouts` that the kit ignores and live3d.js reads: it re-turns every lathe
// with fewer segments (the triangle budget) and removes each cutout's sub-profile over its angular
// ranges, with walls and end faces, so one closed solid has real holes, a window and lugs:
//   the lid: the holes for the safety valve, the handle screw and the lock pin, the gasket window,
//     and six bayonet lugs (the outer skirt hangs down only where a lug is);
//   the pot: six rim lugs (the curled-under rim exists only above the lid's lugs).
// Angles are the kit's lathe angle t: x = r cos t, z = -r sin t (t = 0 on +x, 180 on -x).

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const SU = P.SAFETY_U;
const under = (r) => M.lidTop(r) - M.LID_T;
const mirrorX = (pts) => pts.map(([x, y]) => [-x, y]);
const deg = (a) => (a * 180) / Math.PI;
const six = (a0, a1) => Array.from({ length: M.LUGS }, (_, k) => [a0 + 60 * k, a1 + 60 * k]);

// ---------------------------------------------------------------- the lid (parts.mjs plate() and rim())
const FLANGE = 172.8; // underside of the flat flange (= under(r) for r >= FLAT_R)
const SKIRT_IN = 105.2; // inner skirt, outer face
const SKIRT_OUT = 121; // outer skirt, inner face
const LUG_IN = 114; // lug tip
const LUG_BOT = 157;
export const LUG_SKIRT = 163; // the outer skirt is continuous above this; below it only at the lugs
// the lid's lugs, centred on the cutting plane as View E draws them (6 × 28°)
export const LUG_HALF = 14;
// holes in the plate, [r0, r1, centre angle, half angle]
const hole = (u, r) => [Math.abs(u) - r, Math.abs(u) + r, u < 0 ? 180 : 0, deg(Math.asin(r / Math.abs(u)))];
const HOLES = [hole(SU, 4.1), hole(P.SCREW_U, 2.6), hole(P.PIN_U, 3)];
const WIN = [P.WINDOW[0], P.WINDOW[1], 180, deg(9 / ((P.WINDOW[0] + P.WINDOW[1]) / 2))];

function lidChains() {
  const rs = new Set([4.1, M.CROWN_R, M.FLAT_R, M.SKIRT_R]);
  for (let r = M.CROWN_R + 2; r < M.FLAT_R; r += 2) rs.add(r);
  for (const [r0, r1] of HOLES) rs.add(r0).add(r1);
  const chain = [...rs].sort((a, b) => a - b);
  const bottom = chain.map((r) => [r, under(r)]);
  const top = [...chain, WIN[0], WIN[1], M.LID_OUT].sort((a, b) => b - a).map((r) => [r, M.lidTop(r)]);
  const loop = [
    ...bottom,
    [M.SKIRT_R, M.SKIRT_BOT], [SKIRT_IN, M.SKIRT_BOT], [SKIRT_IN, FLANGE], [WIN[0], FLANGE], [WIN[1], FLANGE], [SKIRT_OUT, FLANGE],
    [SKIRT_OUT, LUG_SKIRT], [SKIRT_OUT, M.LUG_TOP], [LUG_IN, M.LUG_TOP], [LUG_IN, LUG_BOT], [M.LID_OUT, LUG_BOT], [M.LID_OUT, LUG_SKIRT],
    ...top,
  ];
  return { loop, bottom, top };
}
// the sub-profile of the plate between r0 and r1 (both chains), as a closed polygon
const within = (r0, r1) => ([r]) => r >= r0 - 1e-9 && r <= r1 + 1e-9;
export function lidSolid() {
  const { loop, bottom, top } = lidChains();
  const cutouts = HOLES.map(([r0, r1, c, h]) => ({ q: [...bottom.filter(within(r0, r1)), ...top.filter(within(r0, r1))], ranges: [[c - h, c + h]] }));
  cutouts.push({ q: [[WIN[0], FLANGE], [WIN[1], FLANGE], [WIN[1], M.LID_FLAT], [WIN[0], M.LID_FLAT]], ranges: [[WIN[2] - WIN[3], WIN[2] + WIN[3]]] });
  cutouts.push({
    q: [[SKIRT_OUT, LUG_SKIRT], [SKIRT_OUT, M.LUG_TOP], [LUG_IN, M.LUG_TOP], [LUG_IN, LUG_BOT], [M.LID_OUT, LUG_BOT], [M.LID_OUT, LUG_SKIRT]],
    ranges: six(LUG_HALF, 60 - LUG_HALF),
  });
  return S.lathe(loop, { cutouts, live: "lid" });
}

// ---------------------------------------------------------------- the pot (parts.mjs pot())
export const POT_LUG_HALF = 18;
const CURL = [[118, 167], [118, 159], [113, 159], [113, 160], [117, 160], [117, 167]];
export function potSolid() {
  const loop = [
    [0, M.FLOOR], [98, M.FLOOR], ...K.arc(98, 19, M.CORNER, -90, 0, 6).slice(1), [M.R_IN, M.RIM],
    [118, M.RIM], ...CURL, [111, 167], ...K.arc(98, 19, 13, 0, -90, 6), [0, 6],
  ];
  return S.lathe(loop, { cutouts: [{ q: CURL, ranges: six(POT_LUG_HALF, 60 - POT_LUG_HALF) }] });
}

// The water: the sheet's waterPoly half, 0.1 mm clear of the bore so the pot's own wall always wins.
export const waterLoop = (level) => [[0, M.FLOOR + 0.02], [98, M.FLOOR + 0.02], ...K.arc(98, 19, M.CORNER - 0.1, -90, 0, 6).slice(1), [M.R_IN - 0.1, level], [0, level]];
// The gasket, 0.05 mm clear of the bore it seals on.
export const gasketLoop = (lift) => P.gasketLoop(lift).map(([r, v]) => [r === M.R_IN ? M.R_IN - 0.05 : r, v]);

// ---------------------------------------------------------------- handles (parts.mjs potHandle(), helperHandle(), lidHandle())
// Each is a moulding: the sheet's own section (screw holes, bracket slot, hang hole, channels) as a
// core slab on the cutting plane, between two outer slabs of its plain outline.
const phBottom = (r) => 141 + ((r - 128) * 6) / 142;
const hhBottom = (r) => 143 + ((r - 128) * 2) / 34;
export const MAIN_W = 16;
export const HELPER_W = 22;
export const LIDH_W = 18;
const BRACKET_W = 4; // half-width of the 2 mm bracket strap, and of the handle cores it sits in
function mainHandle() {
  const b = phBottom;
  const s = P.PH_SCREW;
  const lowFront = [[128, 141], [s - 5.5, b(s - 5.5)], [s - 5.5, 146.5], [s - 2.75, 146.5], [s - 2.75, 152], [128, 152]];
  const big = [
    [s + 5.5, b(s + 5.5)], [258, b(258)], [258, 170], [153, 170], [153, 165], [139, 165], [139, 170], [128, 170], [128, 154],
    [s - 2.5, 154], [s - 2.5, 163], [s, 164.4], [s + 2.5, 163], [s + 2.5, 154], [176, 154], [176, 152], [s + 2.75, 152], [s + 2.75, 146.5], [s + 5.5, 146.5],
  ];
  const tipCurve = [[275, 149], [279, 153], [280, 158], [279, 164], [275, 168.5], [270, 170]];
  const tip = [[266, b(266)], [270, b(270)], ...tipCurve, [266, 170]];
  const outline = [[128, 141], [s - 5.5, b(s - 5.5)], [s - 5.5, 146.5], [s + 5.5, 146.5], [s + 5.5, b(s + 5.5)], [270, b(270)], ...tipCurve, [153, 170], [153, 165], [139, 165], [139, 170], [128, 170]];
  const W = BRACKET_W;
  return [
    ...[lowFront, big, tip].map((p) => S.extrude(p, { along: "z", from: -W, to: W })),
    S.extrude(outline, { along: "z", from: W, to: MAIN_W }),
    S.extrude(outline, { along: "z", from: -MAIN_W, to: -W }),
  ];
}
function helperHandle() {
  const b = hhBottom;
  const s = P.HH_SCREW;
  const lowFront = [[128, 143], [s - 5.5, b(s - 5.5)], [s - 5.5, 146.5], [s - 2.75, 146.5], [s - 2.75, 152], [128, 152]];
  const end = [[162, 145], [166.5, 147], [169.5, 151], [170, 156], [169, 161], [166, 165], [162, 167], [128, 167]];
  const rest = [
    [s + 5.5, b(s + 5.5)], ...end, [128, 154],
    [s - 2.5, 154], [s - 2.5, 162], [s, 163.4], [s + 2.5, 162], [s + 2.5, 154], [150, 154], [150, 152], [s + 2.75, 152], [s + 2.75, 146.5], [s + 5.5, 146.5],
  ];
  const outline = [[128, 143], [s - 5.5, b(s - 5.5)], [s - 5.5, 146.5], [s + 5.5, 146.5], [s + 5.5, b(s + 5.5)], ...end];
  const W = BRACKET_W;
  return [
    ...[lowFront, rest].map((p) => S.extrude(mirrorX(p), { along: "z", from: -W, to: W })),
    S.extrude(mirrorX(outline), { along: "z", from: W, to: HELPER_W }),
    S.extrude(mirrorX(outline), { along: "z", from: -HELPER_W, to: -W }),
  ];
}
const lhTopPts = [[70, 190], [74, 194], [100, 197], [250, 192], [258, 190], [262, 186]];
function lhTop(r) {
  for (let i = 1; i < lhTopPts.length; i++) {
    const [r0, v0] = lhTopPts[i - 1];
    const [r1, v1] = lhTopPts[i];
    if (r <= r1) return v0 + ((v1 - v0) * (r - r0)) / (r1 - r0);
  }
  return 186;
}
const topRun = (r1, r0) => {
  const pts = [[r1, lhTop(r1)]];
  for (const [r, v] of lhTopPts.slice().reverse()) if (r < r1 && r > r0) pts.push([r, v]);
  pts.push([r0, lhTop(r0)]);
  return pts;
};
const lidRun = (r0, r1) => {
  const pts = [];
  for (let r = r0; r < r1; r += 2) pts.push([r, M.lidTop(r)]);
  pts.push([r1, M.lidTop(r1)]);
  return pts;
};
export const PIN_BORE = 3.2; // half-width of the lid handle's core: its pin bore, Ø6.4
function lidHandle() {
  const sb = P.SCREW_U;
  const SL = P.SLIDE;
  const p1 = [
    [70, 190], [70, M.lidTop(70)], ...lidRun(70, sb - 2.5).slice(1), [sb - 2.5, 186], [sb, 187.5], [sb + 2.5, 186], ...lidRun(sb + 2.5, 84),
    [90.8, 174], [90.8, SL.chan0], [87, SL.chan0], [87, SL.chan1], [90.8, SL.chan1], [90.8, 184], [92, 184], ...topRun(92, 70).slice(0, -1),
  ];
  const p2 = [[97.2, SL.chan1], [118, SL.chan1], ...topRun(118, 96), [96, 184], [97.2, 184]];
  const p3 = [[97.2, 174], [139.5, 174], [139.5, SL.chan0], [97.2, SL.chan0]];
  const p4 = [
    [136, SL.chan1], [SL.r1, SL.chan1], [SL.r1, 180.8], [SL.pocket, 180.8], [SL.pocket, 176.6], [SL.r1, 176.6], [SL.r1, SL.chan0],
    [142.5, SL.chan0], [142.5, 174], [260, 174], [262, 177], ...topRun(262, 136),
  ];
  const outline = [...lidRun(70, 84), [260, 174], [262, 177], ...topRun(262, 70)];
  const W = PIN_BORE;
  return [
    ...[p1, p2, p3, p4].map((p) => S.extrude(p, { along: "z", from: -W, to: W })),
    S.extrude(outline, { along: "z", from: W, to: LIDH_W }),
    S.extrude(outline, { along: "z", from: -LIDH_W, to: -W }),
  ];
}

// ---------------------------------------------------------------- small turned parts (parts.mjs screwBody(), stem(), …)
// a pan or button head screw, head down at headV: head height k, head Ø dk, shank length len
function screw(u, headV, k, dk, len) {
  const h0 = headV - k;
  return S.lathe([[0, h0], [dk / 2 - 1, h0], [dk / 2, h0 + k * 0.45], [dk / 2, headV], [2.5, headV], [2.5, headV + len - 0.4], [2.1, headV + len], [0, headV + len]], { at: u });
}
const STEM = [[1.5, 184], [6.5, 184], [7, 184.5], [7, 186.8], [4, 186.8], [4, 198], [3, 199], [3, 211], [2.2, M.NOZZLE_TOP], [1.5, M.NOZZLE_TOP]];
const WASHER = { r0: 4, r1: 7, from: 186.8, to: 188.8 };
const NUT_AF = 13; // M8 thin nut across flats (2D: r 6.5)
const nut = (u, from, to) => S.extrude(S.hexagon(NUT_AF, u, 0), { along: "y", from, to, holes: [S.circle(u, 0, 4.05, 40)] });

// ---------------------------------------------------------------- the lock slide (parts.mjs slide(), knob())
const SLIDE_W = 3;
function slideSolids() {
  const { v0, v1, r0, r1, tab } = P.SLIDE;
  const a = [[r0, v0], [P.PIN_U - 2.7, v0], [P.PIN_U - 2.7, v1], [r0, v1]];
  const b = [[P.PIN_U + 2.7, v0], [tab, v0], [tab, 166], [tab + 1.5, 166], [tab + 1.5, v0], [r1, v0], [r1, v1], [P.PIN_U + 2.7, v1]];
  return [a, b].map((p) => S.extrude(p, { along: "z", from: -SLIDE_W, to: SLIDE_W }));
}

// ---------------------------------------------------------------- the hob's cooking zone, drawn with the theme
export function hobZone(g, size, tk, on = false) {
  const c = size / 2;
  const s = c / 104;
  g.strokeStyle = on ? tk.ink : tk.muted;
  g.lineWidth = (on ? 1.6 : 1) * s;
  g.beginPath();
  g.arc(c, c, 100 * s, 0, 2 * Math.PI);
  g.stroke();
  // the radiant coil under the glass: a spiral, dark when the hob is on
  g.lineWidth = (on ? 2.4 : 0.8) * s;
  g.globalAlpha = on ? 0.85 : 0.35;
  g.beginPath();
  for (let a = 0; a <= 14 * Math.PI; a += 0.05) {
    const r = (18 + (a / (14 * Math.PI)) * 74) * s;
    const x = c + r * Math.cos(a);
    const y = c + r * Math.sin(a);
    if (a === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.globalAlpha = 1;
}

export const PARTS = 24;
export const level0 = M.waterLevel(M.cooker());

export function parts() {
  const sv = SU;
  const pin = P.PIN_U;
  const v = P.PIN_DOWN;
  return [
    // ---- the hob and the pot (static)
    S.part("H", "HOB (ADJACENT PART)", [
      S.box([-150, -6, -125], [150, 0, 125]),
      S.disc([0, 0.01, 0], 104, { role: "decal", texture: (g, size, tk) => hobZone(g, size, tk, false), live: "zone", own: true }),
    ], { hatch: "none", explode: [0, -150, 0] }),
    S.part(2, "BASE CAPSULE Ø186×0.6", [S.lathe([[0, 0], [90, 0], ...K.arc(90, 3, 3, -90, 0, 4).slice(1), [93, 6], [92.4, 6], ...K.arc(90, 3, 2.4, 0, -90, 4), [0, 0.6]])], {
      hatch: "solid", explode: [0, -110, 0], anchor: { cut: [-60, 0.3, 0], out: { c: [0, 3, 0], r: 93, axis: "y" } },
    }),
    S.part(3, "HEAT DISC Ø185×5.4", [S.lathe([[0, 0.6], [90, 0.6], ...K.arc(90, 3, 2.4, -90, 0, 4).slice(1), [92.4, 6], [0, 6]])], {
      mat: "alu", angle: 45, explode: [0, -75, 0], anchor: { cut: [-45, 3.3, 0], out: { c: [0, 3.3, 0], r: 92.4, axis: "y" } },
    }),
    S.part(1, "POT BODY Ø222×1, 6 L", [potSolid()], {
      hatch: "solid", explode: [0, -40, 0], anchor: { cut: [-110.5, 100, 0], out: { c: [0, 100, 0], r: 111, axis: "y" } },
    }),
    S.part("W", "WATER", [S.lathe(waterLoop(level0), { live: "water" })], { mat: "steel", angle: 90, explode: [0, -40, 0] }),
    S.part(7, "HANDLE BRACKET 2 mm, WELDED", [
      S.extrude([[111, 136], [113, 136], [113, 152], [P.PH_SCREW - 2.75, 152], [P.PH_SCREW - 2.75, 154], [111, 154]], { along: "z", from: -BRACKET_W, to: BRACKET_W, conform: { x: 111, r: 111 } }),
      S.extrude([[P.PH_SCREW + 2.75, 152], [176, 152], [176, 154], [P.PH_SCREW + 2.75, 154]], { along: "z", from: -BRACKET_W, to: BRACKET_W }),
      S.extrude(mirrorX([[111, 136], [113, 136], [113, 152], [P.HH_SCREW - 2.75, 152], [P.HH_SCREW - 2.75, 154], [111, 154]]), { along: "z", from: -BRACKET_W, to: BRACKET_W, conform: { x: -111, r: 111 } }),
      S.extrude(mirrorX([[P.HH_SCREW + 2.75, 152], [150, 152], [150, 154], [P.HH_SCREW + 2.75, 154]]), { along: "z", from: -BRACKET_W, to: BRACKET_W }),
    ], { hatch: "solid", explode: [0, -40, 0], anchor: { cut: [-112, 142, 0], out: { c: [-112, 142, BRACKET_W] } } }),
    S.part(6, "MAIN HANDLE", mainHandle(), {
      mat: "plastic", angle: 135, explode: [60, -40, 0], anchor: { cut: [220, 158, 0], out: { c: [220, 158, MAIN_W] } },
    }),
    S.part(8, "HELPER HANDLE", helperHandle(), {
      mat: "plastic", angle: 45, explode: [-50, -40, 0], anchor: { cut: [-158, 156, 0], out: { c: [-158, 156, HELPER_W] } },
    }),
    S.part(10, "PAN SCREW M5×16 ISO 7045", [
      { ...screw(P.PH_SCREW, 146.5, 3.5, 9.5, 16), explode: [60, 0, 0] },
      { ...screw(-P.HH_SCREW, 146.5, 3.5, 9.5, 14.5), explode: [-50, 0, 0] },
    ], { explode: [0, -75, 0], anchor: { cut: [P.PH_SCREW, 150, 0], out: { c: [P.PH_SCREW, 144, 0], r: 4.75, axis: "y" }, solid: 0 } }),

    // ---- the lid and everything it carries (live3d.js lifts them by the lid's rise)
    S.part(5, "GASKET Ø220, L-SECTION", [S.lathe(gasketLoop(0), { live: "gasket" })], {
      mat: "rubber", angle: 45, explode: [0, 40, 0], anchor: { cut: [-108, 170, 0], out: { c: [0, 170, 0], r: 114.6, axis: "y" } },
    }),
    S.part(4, "LID Ø244×1.2", [lidSolid()], {
      hatch: "solid", explode: [0, 80, 0], anchor: { cut: [60, M.lidTop(60) - 0.6, 0], out: { c: [0, M.lidTop(60), 0], r: 60, axis: "y" } },
    }),
    S.part(23, "BUTTON SCREW M5×12 ISO 7380", [screw(P.SCREW_U, under(P.SCREW_U), 2.75, 9.5, 12)], {
      explode: [0, 50, 0], anchor: { cut: [P.SCREW_U, 180, 0], out: { c: [P.SCREW_U, under(P.SCREW_U) - 1.4, 0], r: 4.75, axis: "y" } },
    }),
    S.part(15, "LOCK PIN Ø5", [S.lathe([[0, v], [4.5, v], [4.5, v + 1.5], [2.5, v + 1.5], [2.5, v + 11.4], [2, v + 11.9], [0, v + 11.9]], { at: pin })], {
      explode: [0, 45, 0], anchor: { cut: [pin - 1, v + 7, 0], out: { c: [pin, v + 0.75, 0], r: 4.5, axis: "y" } },
    }),
    S.part(16, "O-RING 5×1.6 ISO 3601", [S.torus([pin, v + 2.3, 0], 3.3, 0.8)], {
      mat: "rubber", angle: 45, explode: [0, 58, 0], anchor: { cut: [pin + 3.3, v + 2.3, 0], out: { c: [pin, v + 2.3, 0], r: 4.1, axis: "y" } },
    }),
    S.part(9, "LID HANDLE", lidHandle(), {
      mat: "plastic", angle: 45, explode: [0, 125, 0], anchor: { cut: [210, 184, 0], out: { c: [210, 184, LIDH_W] } },
    }),
    S.part(17, "LOCK SLIDE 1.5 mm", slideSolids(), {
      hatch: "solid", explode: [0, 175, 0], anchor: { cut: [104, 178.75, 0], out: { c: [104, 179.5, 0] } },
    }),
    S.part(18, "SLIDE SPRING Ø4×0.45", [S.helix({ axis: "x", at: [178.7, 0], from: P.SLIDE.r1, to: P.SLIDE.pocket, radius: 1.75, wire: 0.45, turns: 5 })], {
      hatch: "solid", explode: [0, 175, 0], anchor: { cut: [157, 180.45, 0], out: { c: [157, 178.7, 0], r: 2, axis: "x" } },
    }),
    S.part(24, "SLIDE KNOB", [S.extrude(K.rrect(120, P.SLIDE.v1, 128, 199.5, 1.4), { along: "z", from: -SLIDE_W, to: SLIDE_W })], {
      mat: "plastic", angle: 135, explode: [0, 200, 0], anchor: { cut: [124, 195, 0], out: { c: [124, 195, SLIDE_W] } },
    }),
    // operating valve on the axis
    S.part(14, "SEAL WASHER Ø14×Ø8×2", [
      { ...S.tube({ ...WASHER }), explode: [0, 98, 0] },
      { ...S.tube({ ...WASHER, at: sv }), explode: [-46, 78, 0] },
    ], { mat: "rubber", angle: 135, anchor: { cut: [5.5, 187.8, 0], out: { c: [0, 187.8, 0], r: 7, axis: "y" }, solid: 0 } }),
    S.part(11, "VALVE STEM M8×1, BORE Ø3", [S.lathe(STEM)], {
      mat: "brass", angle: 135, explode: [0, 115, 0], anchor: { cut: [5.5, 185.4, 0], out: { c: [0, 185.4, 0], r: 7, axis: "y" } },
    }),
    S.part(12, "THIN NUT M8×1 ISO 8675", [
      { ...nut(0, 190, 194), explode: [0, 150, 0] },
      { ...nut(sv, 182.8, 186.8), explode: [-46, 90, 0] },
    ], { anchor: { cut: [5.2, 192, 0], out: { c: [0, 192, 0], r: 7.5, axis: "box" }, solid: 0 } }),
    S.part(13, "OPERATING WEIGHT", [S.lathe(M.WEIGHT_PROFILE)], {
      mat: "brass", angle: 45, pivot: [0, M.NOZZLE_TOP, 0], explode: [0, 185, 0], anchor: { cut: [7, 214, 0], out: { c: [0, 214, 0], r: M.WEIGHT_R, axis: "y" } },
    }),
    // safety valve, off the axis at SAFETY_U; its stack explodes up a jogged line to the left
    S.part(19, "SAFETY VALVE BODY M8×1", [
      S.lathe([[1.5, 182], [4, 182], [4, 190], [6, 190], [6, 193], [3, 193], [3, 184], [1.5, 184]], { at: sv }),
      S.lathe([[3, 195], [6, 195], [6, 199], [1.6, 199], [1.6, 197.2], [3, 197.2]], { at: sv }),
      // the two posts that carry the cap, out of the plane (the section passes through the vents)
      S.box([sv - 1, 193, -5.9], [sv + 1, 195, -3.05]),
      S.box([sv - 1, 193, 3.05], [sv + 1, 195, 5.9]),
    ], { mat: "steel", angle: 45, explode: [-46, 110, 0], anchor: { cut: [sv - 5, 191.5, 0], out: { c: [sv, 191.5, 0], r: 6, axis: "y" } } }),
    S.part(21, "SAFETY SEAL Ø5.2×1", [S.cylinder({ at: sv, r: 2.6, from: 184, to: 185 })], {
      mat: "rubber", angle: 45, explode: [-46, 130, 0], anchor: { cut: [sv + 1.6, 184.5, 0], out: { c: [sv, 184.5, 0], r: 2.6, axis: "y" } },
    }),
    S.part(20, "SAFETY PLUNGER", [S.lathe([[0, 185], [2.6, 185], [2.6, 186], [1.4, 186], [1.4, 201], [0, 201]], { at: sv })], {
      explode: [-46, 140, 0], anchor: { cut: [sv, 199.8, 0], out: { c: [sv, 200, 0], r: 1.4, axis: "y" } },
    }),
    S.part(22, "SAFETY SPRING Ø4.3×0.5", [S.helix({ axis: "y", at: [sv, 0], from: 186, to: 197.2, radius: 2.15, wire: 0.5, turns: 6, pivot: [sv, 197.2, 0], live: "spring" })], {
      hatch: "solid", explode: [-46, 165, 0], anchor: { cut: [sv + 2.15, 190, 0], out: { c: [sv, 190, 0], r: 2.4, axis: "y" } },
    }),
  ];
}

// ---------------------------------------------------------------- the steam the model talks about
// The steam space under the lid; its profile (the in-plane test) runs down into the water, whose cut
// face hides it there, so the level can fall without a gap; its top rides with the lid. Then the stem's bore, and the puffs:
// unit spheres that live3d.js places, scales and fades from the sheet's own puffs().
export const PUFFS = 20;
// live3d.js turns the steam's mesh again with its floor on the water (steamLoop(level)), so a ray
// through the cut finds the steam's back face on the water's surface, not under it.
export function steamLoop(floor) {
  const top = [];
  for (let r = M.SKIRT_R - 0.05; r > 0; r -= 2) top.push([r, under(r) - 0.02]);
  return [[0, floor], [M.R_IN - 0.05, floor], [M.R_IN - 0.05, 160.9], [M.SKIRT_R - 0.05, 160.9], ...top, [0, under(0) - 0.02]];
}
export function fluids() {
  const unit = [[0, -1], ...K.arc(0, 0, 1, -75, 75, 5), [0, 1]];
  return [
    S.fluid("steam", S.lathe(steamLoop(20)), { stretch: { from: 159 } }),
    S.fluid("bore", S.lathe([[0, 184], [1.47, 184], [1.47, M.NOZZLE_TOP], [0, M.NOZZLE_TOP]])),
    ...Array.from({ length: PUFFS }, (_, i) => S.fluid("puff" + i, S.lathe(unit))),
  ];
}

// centre lines: the pot's axis and the lid's (the lid's rides with it), the safety valve's, the pin's
export const centres = () => [
  { line: [[0, -12, 0], [0, 150, 0]], part: 1 },
  { line: [[0, 150, 0], [0, 236, 0]], part: 4 },
  { line: [[SU, 178, 0], [SU, 204, 0]], part: 4 },
  { line: [[P.PIN_U, 160, 0], [P.PIN_U, 202, 0]], part: 4 },
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
