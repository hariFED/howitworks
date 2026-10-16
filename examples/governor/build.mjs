// Builds governor.html: a live A2 drawing of a Porter governor closing a double-beat throttle valve.
//   node examples/governor/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as X from "./sheet.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const VIEWS = X.VIEWS;
const VM = K.view(VIEWS.main);
const VB = K.view(VIEWS.B);
const VC = K.view(VIEWS.C);
const VD = K.view(VIEWS.D);
const B = X.BOX.B;
const C = X.BOX.C;
const start = M.engine(M.LOAD_LIGHT);
const P0 = P.pose(start.alpha);

// ---------------------------------------------------------------- the assembly, in any view
function staticBack(V, main) {
  return (
    (main ? `<g data-role="phantom">${P.adjacent(V)}</g>` : "") +
    P.driveShaft(V) +
    P.gearCase(V) +
    P.shaftBushes(V) +
    P.pulley(V) +
    P.bevelWheel(V) +
    P.bevelPinion(V) +
    P.keys(V) +
    P.spindle(V) +
    P.stopCollars(V) +
    P.valveBody(V) +
    P.seatRings(V) +
    P.bonnet(V) +
    P.packing(V) +
    P.gland(V) +
    P.studs(V)
  );
}

const staticFront = (V) => P.head(V) + P.headPins(V) + P.topNut(V);

function centrelines(V) {
  return (
    K.centerline(V, [0, -92], [0, 590], 0) +
    K.centerline(V, [-182, 0], [80, 0], 0) +
    K.centerline(V, [M.UV, -80], [M.UV, 132], 0) +
    K.centerline(V, [M.UV + 64, -11], [M.UV + 106, -11], 0) +
    P.pitchLines(V)
  );
}

const view = (V, id, main) =>
  staticBack(V, main) + `<g id="mv-${id}">${X.moving(V, P0)}</g>` + staticFront(V) + centrelines(V);

// ---------------------------------------------------------------- main view: AXIAL SECTION
const mainView =
  `<g data-geom="main">` +
  view(VM, "main", true) +
  `<g data-role="phantom">${P.phantomTop(VM)}</g>` +
  `</g>`;

const mainDims =
  K.dim(VM, [-135, P.BASE_V], [100, P.BASE_V], { dir: "h", off: 18 }) +
  K.dim(VM, [0, P.BASE_V - 14], [M.UV, P.BASE_V - 14], { dir: "h", off: 22 }) +
  `<g id="dim-h-wrap">${X.dimH(VM, P0)}</g>` +
  `<g id="dim-x-wrap">${X.dimX(VM, P0)}</g>`;

const mainMarks =
  K.detailMark(VM, X.MARK.B.c, X.MARK.B.r, "B", -20) +
  K.detailMark(VM, X.MARK.C.c, X.MARK.C.r, "C", 45) +
  K.viewArrow(VM, [0, 592], [0, 1], "D") +
  K.viewLabel(96, 46, "AXIAL SECTION", "SCALE 1:2.5");

// ---------------------------------------------------------------- DETAIL B: the double-beat valve, 1:1
const detailB =
  `<g data-geom="B" clip-path="url(#clip-B)"><circle class="paper" cx="${B.cx}" cy="${B.cy}" r="${B.r}"/>` +
  view(VB, "B", false) +
  `</g><circle class="thin" cx="${B.cx}" cy="${B.cy}" r="${B.r}"/>` +
  X.balloonsB(VB) +
  K.viewLabel(B.cx, B.cy + B.r + 18, "DETAIL B", "DOUBLE-BEAT THROTTLE VALVE · SCALE 1:1");

// ---------------------------------------------------------------- DETAIL C: sleeve collar and bell crank, 1:1
const detailC =
  `<g data-geom="C" clip-path="url(#clip-C)"><rect class="paper" x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}"/>` +
  view(VC, "C", false) +
  `</g><rect class="thin" x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="10"/>` +
  `<g id="mvb-C">${X.balloonsC(VC, P0)}</g>` +
  K.viewLabel(C.x + C.w / 2, C.y + C.h + 18, "DETAIL C", "SWIVEL COLLAR AND CRANK SLOT · SCALE 1:1");

// ---------------------------------------------------------------- VIEW D: from above, 1:5
const viewD =
  `<g data-geom="D"><g id="plan">${P.planView(VD, P0, 0.4)}</g>` +
  `<g data-role="phantom">${K.line(VD, K.circle(0, 0, M.ballR(M.ALPHA_MAX) + M.BALL_D / 2, 96), "phan", true)}</g>` +
  `<g id="orbit">${K.line(VD, K.circle(0, 0, P0.ball[0], 96), "ctr", true)}</g>` +
  K.centerMark(VD, [0, 0], 30, 4) +
  `</g>` +
  X.balloonsD(VD) +
  K.viewLabel(X.LABEL_D.x, X.LABEL_D.y, "VIEW D", "FROM ABOVE · 1:5") +
  `<g data-role="label"><text class="t t-sm" x="${X.LABEL_D.x}" y="${X.LABEL_D.y + 24}" text-anchor="middle">TURNING AT 1/20 SPEED</text></g>`;

// ---------------------------------------------------------------- notes, parts list, title block
const sLight = M.steady(M.LOAD_LIGHT);
const sHeavy = M.steady(M.LOAD_HEAVY);
const nL = M.toRpm(sLight.omega);
const nH = M.toRpm(sHeavy.omega);
const notes = K.notes(790, 222, "NOTES", [
  `PORTER, l = ${M.ARM}, e = ${M.OFFSET}: m·ω²·r = (m + M)·g·tan α, r = e + l·sin α.`,
  `BALLS m = ${M.BALL_M.toFixed(2)} kg EACH, SLEEVE M = ${M.SLEEVE_M.toFixed(2)} kg. SPINDLE = 1.5 × ENGINE.`,
  `SLEEVE LIFT 0–${M.LIFT_MAX.toFixed(1)} AT ${(M.N_LO / M.RATIO).toFixed(1)}–${(M.N_HI / M.RATIO).toFixed(1)} rpm ENGINE; VALVE SHUT AT FULL LIFT.`,
  `ENGINE J·dΩ/dt = T·f − LOAD − c·Ω: T ${M.T_MAX} N·m, J ${M.J} kg·m², c ${M.C_F}.`,
  `DROOP: ${M.LOAD_LIGHT} N·m RUNS AT ${nL.toFixed(1)} rpm, ${M.LOAD_HEAVY} N·m AT ${nH.toFixed(1)} rpm (${(((nL - nH) / nL) * 100).toFixed(1)} %).`,
]);

const BOM = [
  ["1", "GEAR CASE", "EN-GJL-250", "1"],
  ["2", "DRIVE SHAFT Ø25", "C45", "1"],
  ["3", "BEVEL WHEEL z30 m3", "C45", "1"],
  ["4", "BEVEL PINION z20 m3", "C45", "1"],
  ["5", "BUSH Ø25/32×24 ISO 4379", "CuSn8", "2"],
  ["6", "FLAT-BELT PULLEY Ø120×45", "EN-GJL-200", "1"],
  ["7", "PARALLEL KEY 8×7 DIN 6885", "C45", "3"],
  ["8", "SPINDLE Ø25", "C45", "1"],
  ["9", "STOP COLLAR Ø44×14", "C45", "2"],
  ["10", "HEAD", "C45, FORGED", "1"],
  ["11", "HEX NUT M20 ISO 4032", "STEEL 8", "1"],
  ["12", "UPPER ARM 150 C/C", "C35", "2"],
  ["13", `FLYBALL Ø${M.BALL_D}, ${M.BALL_M.toFixed(2)} kg`, "EN-GJL-200", "2"],
  ["14", "LOWER LINK 150 C/C", "C35", "2"],
  ["15", "PIN Ø10 ISO 2341-B", "C45", "10"],
  ["16", `SLEEVE (LOAD) ${M.SLEEVE_M.toFixed(1)} kg`, "EN-GJL-200", "1"],
  ["17", "SWIVEL COLLAR, SPLIT", "CuSn7Zn4Pb7", "1"],
  ["18", "BELL CRANK 130/55, 120°", "EN-GJS-400-15", "1"],
  ["19", `VALVE LINK ${M.LINK.toFixed(0)} C/C`, "C35", "1"],
  ["20", "VALVE STEM Ø16", "X20Cr13", "1"],
  ["21", "DOUBLE-BEAT VALVE Ø48/Ø56", "CuSn10", "1"],
  ["22", "SEAT RING Ø48, Ø56", "CuSn10", "2"],
  ["23", "VALVE BODY DN50", "EN-GJL-250", "1"],
  ["24", "BONNET WITH FULCRUM POST", "EN-GJL-250", "1"],
  ["25", "GLAND", "CuZn39Pb3", "1"],
  ["26", "PACKING RING 6 SQ", "PTFE/GRAPHITE", "3"],
  ["27", "STUD M8×32 + NUT ISO 4032", "STEEL 8.8", "6"],
  ["28", "HEX NUT M16 ISO 4032", "A2-70", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const ROW = 14;
const bomTop = TB.y - (18 + BOM.length * ROW);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 34, align: "center", title: "ITEM" },
    { w: 206, title: "DESCRIPTION" },
    { w: 126, title: "MATERIAL" },
    { w: 34, align: "center", title: "QTY" },
  ],
  BOM,
  { rowH: ROW }
);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "PORTER GOVERNOR · THROTTLE", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-003", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:2.5" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · rpm · N·m" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG UP/DOWN FOR LOAD · ↑ ↓ LOAD · SPACE STEPS IT · S SLOW", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="acc" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="acc-dot" cx="0.8" cy="0.8" r="0.66"/><circle class="acc-dot" cx="2.4" cy="2.4" r="0.66"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-B"><circle cx="${B.cx}" cy="${B.cy}" r="${B.r}"/></clipPath>` +
  `<clipPath id="clip-C"><rect x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="10"/></clipPath>` +
  `</defs>`;

const [hx0, hy0] = VM.p([-170, 600]);
const [hx1, hy1] = VM.p([320, -72]);
const hit = `<rect class="hit" data-drag="main" x="${hx0}" y="${hy0}" width="${K.r2(hx1 - hx0)}" height="${K.r2(hy1 - hy0)}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a Porter centrifugal governor driving a double-beat steam throttle valve, cut through the spindle. Drag up or down, or use the arrow keys, to change the engine's load; the balls, sleeve, bell crank and valve move and the speed settles lower under more load." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  `<g id="mvb-main">${X.balloonsMainMoving(VM, P0)}</g>` +
  X.balloonsMain(VM) +
  mainMarks +
  detailB +
  detailC +
  viewD +
  X.chart1() +
  X.chart2() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag up or down for load · <kbd>↑</kbd> <kbd>↓</kbd> load · <kbd>Space</kbd> step light/heavy · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "governor.html"), {
  title: "Porter Governor",
  description: "A live engineering drawing of a Porter flyball governor closing a double-beat steam throttle valve: load steps, the balls drop, the valve opens and the engine settles a little slower.",
  svg,
  bar,
  css: `.bp-sheet .hit{fill:transparent;cursor:ns-resize}.bp-sheet .ball-tint{fill:url(#acc)}.bp-sheet .acc-dot{fill:var(--bp-accent)}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "sheet.mjs"), "X"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8"),
});
console.log(
  `governor.html  ${(size / 1024).toFixed(0)} KB  m ${M.BALL_M.toFixed(2)} kg  M ${M.SLEEVE_M.toFixed(2)} kg  band ${M.N_LO.toFixed(1)}–${M.N_HI.toFixed(1)} rpm  light ${nL.toFixed(2)}  heavy ${nH.toFixed(2)}  link ${M.LINK.toFixed(1)}`
);
