// Builds pin-tumbler.html: a live A2 drawing of a 5-pin euro-profile cylinder and its key.
//   node examples/pin-tumbler/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as X from "./extra.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k10 = 10 * K.PX_PER_MM;

// ---------------------------------------------------------------- views
const B = { cx: 185, cy: 638, r: 118 };
const D = { x: 44, y: 66, w: 252, h: 134, u: 12.5, z: 4.3 }; // Detail D frame and the world point at its centre
const C = { cx: 510, cy: 643, r: 143, z: 4.5 };
const VIEWS = {
  main: { x: 340, y: 318, scale: 5 },
  B: { x: B.cx, y: B.cy, scale: 5 },
  C: { x: C.cx, y: C.cy + C.z * k10, scale: 10 },
  D: { x: D.x + D.w / 2 - D.u * k10, y: D.y + D.h / 2 + D.z * k10, scale: 10 },
  D_rect: D,
  B_circle: B,
  C_circle: C,
};
const VM = K.view(VIEWS.main);
const VB = K.view(VIEWS.B);
const VC = K.view(VIEWS.C);
const VD = K.view(VIEWS.D);

const start = { bitting: M.WRONG, e: 0, phi: 0 };
const st0 = M.stacks(start.bitting, start.e);

// ---------------------------------------------------------------- main view: SECTION A-A, 5:1
const centres =
  K.centerline(VM, [P.KEY_BREAK - M.BLADE_LEN - 1, 0], [M.BODY_L, 0], 5) +
  Array.from({ length: M.PINS }, (_, i) => K.centerline(VM, [M.pinU(i), 3.4], [M.pinU(i), M.FIN_TOP], 4)).join("") +
  K.centerMark(VM, [M.SCREW.u, M.SCREW.z], M.SCREW.d / 2, 3) +
  K.centerline(VM, [M.CAM_U, -M.BODY_R], [M.CAM_U, M.BRIDGE], 4);

const mainView =
  `<g data-geom="main">` +
  P.body(VM) +
  P.caps(VM) +
  P.antiDrill(VM) +
  P.screw(VM) +
  `<g id="m-drv">${P.drivers(VM, st0)}</g>` +
  `<g id="m-spr">${P.springs(VM, st0)}</g>` +
  `<g id="m-plug">${P.plug(VM, 0)}</g>` +
  `<g id="m-cam">${P.cam(VM, 0)}</g>` +
  P.washer(VM) +
  P.clip(VM) +
  `<g id="m-key">${P.key(VM, start.bitting, start.e, 0)}</g>` +
  `<g id="m-kp">${P.keyPins(VM, st0, 0)}</g>` +
  `<g data-role="phantom">${X.phantomKey(VM)}</g>` +
  P.shearLine(VM) +
  `<g id="m-gaps">${P.gaps(VM, st0)}</g>` +
  centres +
  `</g>`;

const dimIn = (e) => X.insertDim(VM, e);
const mainDims =
  K.dim(VM, [0, -M.BODY_R], [M.pinU(0), -M.BODY_R], { dir: "h", off: 36 }) +
  K.dim(VM, [M.pinU(0), -M.BODY_R], [M.pinU(1), -M.BODY_R], { dir: "h", off: 36 }) +
  K.dim(VM, [0, -M.BODY_R], [M.CAM_U, -M.BODY_R], { dir: "h", off: 56 }) +
  K.dim(VM, [0, -M.BODY_R], [M.BODY_L, -M.BODY_R], { dir: "h", off: 76 }) +
  K.dim(VM, [M.BODY_L, -M.BODY_R], [M.BODY_L, M.FIN_TOP], { dir: "v", off: 14 }) +
  `<g id="dim-in-wrap">${dimIn(start.e)}</g>`;

// Balloons. Static ones sit in a row above the fin; those on the stacks re-aim their dots as
// the pins move, and the key's rides with the key.
const ROW = 40;
const TOP = [
  ["3", 360],
  ["2", 394],
  ["4", 428],
  ["6", 500],
  ["9", 534],
  ["10", 568],
  ["7", 602],
  ["11", 636],
  ["14", 670],
  ["16", 704],
  ["12", 738],
];
const topX = Object.fromEntries(TOP);
const staticBalloons =
  K.balloon(VM, [6.5, 5.0], [topX[2], ROW], 2, { target: 2 }) +
  K.balloon(VM, [M.pinU(4) + 0.8, 23.6], [topX[10], ROW], 10, { target: 10 }) +
  K.balloon(VM, [27.0, 5.2], [topX[11], ROW], 11, { target: 11 }) +
  K.balloon(VM, [M.SCREW.u + 1.2, M.SCREW.z + 1.2], [topX[14], ROW], 14, { target: 14 }) +
  K.balloon(VM, [37.65, 5.1], [topX[16], ROW], 16, { target: 16 }) +
  K.balloon(VM, [38.25, 5.6], [topX[12], ROW], 12, { target: 12 }) +
  K.balloon(VM, [1.5, 22], [326, ROW], 1, { target: 1 });

const MOVING = { pins: [[0, topX[3]], [1, topX[4]], [3, topX[6]], [4, topX[7]]], spring: [3, topX[9]] };
export const mainMoving = (st, phi, e) => X.movingBalloons(VM, st, phi, e, MOVING, ROW);

const mainMarks =
  K.viewLabel(190, 458, "SECTION A-A", "SCALE 5:1") +
  K.viewArrow(VM, [0, 13], [1, 0], "B") +
  X.planeEnds(VM, M.pinU(2), [26.6, 25.2], [-9.6, -11.0], [1, 0], "C");

// ---------------------------------------------------------------- DETAIL D: the shear line over pins 2-4, 10:1
const detailD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>` +
  P.body(VD) +
  `<g id="d-drv">${P.drivers(VD, st0)}</g>` +
  `<g id="d-plug">${P.plug(VD, 0)}</g>` +
  `<g id="d-key">${P.key(VD, start.bitting, start.e, 0)}</g>` +
  `<g id="d-kp">${P.keyPins(VD, st0, 0)}</g>` +
  P.shearLine(VD) +
  `<g id="d-gaps">${P.gaps(VD, st0)}</g>` +
  Array.from({ length: 3 }, (_, i) => K.centerline(VD, [M.pinU(i + 1), -1], [M.pinU(i + 1), 8], 0)).join("") +
  `</g><rect class="thin" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/>` +
  K.viewLabel(D.x + D.w / 2, D.y - 18, "DETAIL D", "SHEAR LINE AT PINS 2–4 · 10:1");

// ---------------------------------------------------------------- VIEW B: the front face, 5:1
const viewB =
  `<g data-geom="B" clip-path="url(#clip-B)"><circle class="paper" cx="${B.cx}" cy="${B.cy}" r="${B.r}"/>` +
  P.faceBody(VB) +
  P.faceAntiDrill(VB) +
  `<g clip-path="url(#clip-in)"><g id="vb-cam-h">${P.faceCam(VB, "hid")}</g></g>` +
  `<g id="vb-rot">${P.facePlug(VB)}<g id="vb-key">${P.keySection(VB, start.bitting, start.e, -0.5)}</g></g>` +
  `<g clip-path="url(#clip-out)"><g id="vb-cam-v">${P.part(11, P.faceCam(VB, "vis"))}</g></g>` +
  `<g data-role="phantom">${K.line(VB, P.CAM_SHAPE.map((p) => M.rot(p, M.CAM_TURN)), "phan", true)}</g>` +
  K.centerMark(VB, [0, 0], 9.2, 0) +
  K.centerMark(VB, [0, 10], 1.5, 3) +
  `</g><circle class="thin" cx="${B.cx}" cy="${B.cy}" r="${B.r}"/>` +
  X.planeEnds(VB, 0, [13.6, 12.2], [-12.2, -13.6], [-1, 0], "A", true) +
  `<g id="torque" data-role="label" visibility="hidden">${X.torqueArrow(B.cx, B.cy, B.r + 12)}</g>` +
  K.dim(VB, [-M.BODY_R, 0], [M.BODY_R, 0], { dir: "h", off: 147, prefix: "Ø" }) +
  K.balloon(VB, [-0.6, 10.6], [54, 520], 13, { target: 13 }) +
  K.viewLabel(B.cx, 802, "VIEW B", "FRONT FACE, KEY CUT AT THE FACE · 5:1");

// ---------------------------------------------------------------- SECTION C-C: across pin 3, 10:1
const st3 = st0[2];
const sectionC =
  `<g data-geom="C" clip-path="url(#clip-C)"><circle class="paper" cx="${C.cx}" cy="${C.cy}" r="${C.r}"/>` +
  P.bodyAcross(VC) +
  `<g id="cc-stack">${P.driverAcross(VC, st3)}${P.springAcross(VC, st3)}</g>` +
  `<g id="cc-rot">${P.plugAcross(VC)}<g id="cc-key">${P.keySection(VC, start.bitting, start.e, M.pinU(2))}</g><g id="cc-pin">${P.keyPinAcross(VC, st3, P.PIN_ITEM[2])}</g></g>` +
  `<path class="shear" d="${K.d(VC, K.circle(0, 0, M.SHEAR, 120))}"/>` +
  `<g id="cc-gap">${X.gapAcross(VC, st3)}</g>` +
  K.centerMark(VC, [0, 0], 7.2, 0) +
  K.centerline(VC, [0, M.SHEAR], [0, 12], 0) +
  `</g><circle class="thin" cx="${C.cx}" cy="${C.cy}" r="${C.r}"/>` +
  K.viewLabel(C.cx, 806, "SECTION C-C", "ACROSS PIN 3 · SCALE 10:1");

export const ccBalloons = (st3, phi) => X.ccBalloons(VC, st3, phi);

// ---------------------------------------------------------------- DIAGRAM 1: every gap against the shear line
const CH = { x0: 852, x1: 1160, y0: 56, y1: 220, lim: 3 };
const chartSvg = X.chart(CH) + K.viewLabel((CH.x0 + CH.x1) / 2, 274, "DIAGRAM 1", "KEY-PIN CROWN ABOVE THE SHEAR LINE · ACCENT: SHEAR LINE");

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "BODY, EURO PROFILE DIN 18252, 30/10", "CuZn39Pb3", "1"],
  ["2", "PLUG Ø13, 5 CHAMBERS, PITCH 4", "CuZn39Pb3", "1"],
  ...M.RIGHT.map((c, i) => [String(P.PIN_ITEM[i]), `KEY PIN Ø3×${K.fmt(M.KEY_PINS[i])}, CODE ${c}, PIN ${i + 1}`, "CuNi18Zn20", "1"]),
  ["8", "DRIVER PIN Ø3×5", "X46Cr13, HARDENED", "5"],
  ["9", `PIN SPRING Ø${M.SPRING.mean + M.SPRING.wire}×${M.SPRING.wire}, ${M.SPRING.turns} TURNS`, "EN 10270-3 1.4310", "5"],
  ["10", "CHAMBER CAP Ø3×2, PRESSED", "CuZn39Pb3", "5"],
  ["11", "CAM, 30/10", "SINT-D11", "1"],
  ["12", "RETAINING WASHER DIN 6799-6", "C75S SPRING STEEL", "1"],
  ["13", "ANTI-DRILL PIN Ø3×2.5", "100Cr6, 60 HRC", "1"],
  ["14", "FIXING SCREW M5×70", "STEEL 4.8, ZINC", "1"],
  ["15", `KEY, BITTING ${M.codeText(M.RIGHT)}`, "CuNi12Zn24", "1"],
  ["16", "THRUST WASHER Ø8.4×Ø12×0.5", "1.4310", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const bomTop = TB.y - (18 + BOM.length * 16);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 34, align: "center", title: "ITEM" },
    { w: 220, title: "DESCRIPTION" },
    { w: 112, title: "MATERIAL" },
    { w: 34, align: "center", title: "QTY" },
  ],
  BOM
);

const notes = K.notes(790, 310, "NOTES", [
  `CUT DEPTHS IN ${M.STEP} mm STEPS, CODES 0–${M.DEPTHS - 1}; KEY PIN = ${K.fmt(M.keyPinLength(0))} + ${M.STEP}·CODE.`,
  `PLUG TURNS ONLY WHEN ALL ${M.PINS} GAPS ARE WITHIN ±${M.TOL} OF THE SHEAR LINE.`,
  `TOUR TRIES ${M.codeText(M.WRONG)} (PIN 3 ${K.fmt((M.root(M.WRONG[2]) - M.root(M.RIGHT[2])), 1)} mm LOW), THEN ${M.codeText(M.RIGHT)}.`,
  `${M.DEPTHS}^${M.PINS} = ${M.COMBINATIONS.toLocaleString("en-GB").replace(",", " ")} THEORETICAL KEYS. CAM TURNS WITH THE PLUG.`,
  `PINS, KEY AND SCREW SHANK NOT HATCHED IN A-A; KEY CUT ACROSS IN B, C-C.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "PIN TUMBLER CYLINDER", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-008", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "5:1" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-f" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · deg" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE KEY · DRAG VIEW B TO TURN · K SWAPS THE KEY", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const silhouette = K.d(VB, P.SILHOUETTE);
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-B"><circle cx="${B.cx}" cy="${B.cy}" r="${B.r}"/></clipPath>` +
  `<clipPath id="clip-D"><rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-C"><circle cx="${C.cx}" cy="${C.cy}" r="${C.r}"/></clipPath>` +
  `<clipPath id="clip-in"><path d="${silhouette}"/></clipPath>` +
  `<clipPath id="clip-out"><path clip-rule="evenodd" d="M0 0H1200V848H0Z${silhouette}"/></clipPath>` +
  `</defs>`;

const hit =
  `<rect class="hit" data-drag="key" x="40" y="60" width="${K.r2(VM.p([M.BODY_L, 0])[0] - 40)}" height="${K.r2(VM.p([0, -M.BODY_R])[1] - 60)}"/>` +
  `<circle class="hit" data-turn="B" cx="${B.cx}" cy="${B.cy}" r="${B.r}"/>` +
  `<circle class="hit" data-turn="C" cx="${C.cx}" cy="${C.cy}" r="${C.r}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a five-pin euro cylinder lock cut along its axis, with its key. Drag the key in and out, then drag the front view to turn the plug; it turns only when every pin gap sits on the shear line." ` +
  `data-views='${JSON.stringify(VIEWS)}' data-ch='${JSON.stringify(CH)}' data-moving='${JSON.stringify(MOVING)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  staticBalloons +
  `<g id="mvb">${mainMoving(st0, 0, start.e)}</g>` +
  mainMarks +
  detailD +
  viewB +
  sectionC +
  `<g id="ccb">${ccBalloons(st3, 0)}</g>` +
  chartSvg +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the key · <kbd>←</kbd> <kbd>→</kbd> insert · drag View B or <kbd>↑</kbd> <kbd>↓</kbd> turn · <kbd>K</kbd> other key · <kbd>Space</kbd> tour · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "pin-tumbler.html"), {
  title: "Pin Tumbler Cylinder",
  description: "A live engineering drawing of a five-pin euro cylinder: the key lifts each pin stack, and the plug turns only when every gap meets the shear line.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet [data-turn]{cursor:grab;touch-action:none}.bp-sheet [data-drag]{cursor:ew-resize}` +
    `.bp-sheet .shear,.bp-sheet .gap{fill:none;stroke:var(--bp-accent);stroke-width:1.7px;stroke-linecap:round}` +
    `.bp-sheet .gap{stroke-width:2.2px}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}` +
    `.bp-sheet .bar{fill:url(#h-steel-45);stroke:var(--bp-ink);stroke-width:var(--bp-thin)}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "extra.mjs"), "X"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8"),
});
console.log(`pin-tumbler.html  ${(size / 1024).toFixed(0)} KB  key pins ${M.KEY_PINS.join(", ")}  combinations ${M.COMBINATIONS}`);
