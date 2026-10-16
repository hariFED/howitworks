// Builds bottle-jack.html: a live A2 drawing of a 2-tonne hydraulic bottle jack in section.
//   node examples/bottle-jack/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as X from "./extra.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k1 = K.PX_PER_MM;
const k2 = 2 * K.PX_PER_MM;

// ---------------------------------------------------------------- views
const D = { x: 472, y: 262, w: 299, h: 113 }; // DETAIL D window, sheet units
const B = { x: 472, y: 440, w: 299, h: 299 }; // DETAIL B window
const VIEWS = {
  main: { x: 210, y: 790, scale: 1 },
  D: { x: D.x + 84 * k2, y: D.y + 42 * k2, scale: 2 }, // u -84 at the left edge, v 42 at the top
  B: { x: B.x - 17 * k2, y: B.y + 72 * k2, scale: 2 }, // u 17 at the left edge, v 72 at the top
  A: { x: 800 + 40 * k1, y: 125, scale: 1 }, // SECTION A-A: u -40 at x 800, w = 0 at y 125
};
const VM = K.view(VIEWS.main);
const VD = K.view(VIEWS.D);
const VB = K.view(VIEWS.B);
const VA = K.view(VIEWS.A);

// ---------------------------------------------------------------- the jack, drawn into any view
function oil(V, id) {
  return (
    `<g data-role="fluid">` +
    `<g data-part="13"><path id="oil-r-${id}" class="tint" fill-opacity="0.15" d="${P.oilPath(V, P.resOil(0))}"/></g>` +
    `<path id="oil-p-${id}" class="tint" fill-opacity="0.15" d="${P.oilPath(V, P.pumpOil(0))}"/>` +
    `<path id="oil-h-${id}" class="tint" fill-opacity="0.15" d="${P.oilPath(V, P.ramOil(0))}"/>` +
    `</g>`
  );
}

function staticParts(V, id) {
  return (
    P.base(V, `cb-${id}`) +
    P.cylinder(V) +
    P.cylORing(V) +
    P.tube(V) +
    P.topNut(V) +
    P.fillerPlug(V) +
    P.wiper(V) +
    P.deliverySeat(V) +
    P.setScrew(V) +
    P.plugs(V)
  );
}

const valves = (V, id) =>
  `<g id="valves-${id}">${P.suctionBall(V, 0)}${P.deliveryBall(V, 0)}${P.deliverySpring(V, 0)}${P.reliefBall(V, 0)}${P.reliefSpring(V, 0)}</g>`;
const release = (V, id) => `<g id="rel-${id}">${P.releaseScrew(V)}${P.releaseORing(V)}</g>`;
const ramGroup = (V, id) => `<g id="ram-${id}">${P.ram(V)}${P.uCup(V)}${P.screw(V)}${P.saddle(V)}</g>`;
const plungerGroup = (V, id) => `<g id="pl-${id}">${P.plunger(V)}</g>`;

function pumpHead(V, id) {
  return (
    `<g id="link-${id}">${P.link(V)}</g>` +
    `<g id="sock-${id}">${P.socketPlate(V)}</g>` +
    P.pumpCylinder(V) +
    P.plungerSeal(V) +
    plungerGroup(V, id) +
    `<g id="sockc-${id}">${P.socketCut(V)}${P.handle(V)}${P.socketPins(V)}</g>` +
    P.basePin(V)
  );
}

function centrelines(V) {
  return (
    K.centerline(V, [0, 2], [0, M.CLOSED_H + M.LIFT_MAX], 6) +
    K.centerline(V, [M.PUMP_U, 6], [M.PUMP_U, 146], 0) +
    K.centerline(V, [-86, 28], [-4, 28], 0) +
    K.centerline(V, [40, 24], [99, 24], 0) +
    K.centerline(V, [P.RELIEF_U, 22], [P.RELIEF_U, 44], 0)
  );
}

// ---------------------------------------------------------------- main view: AXIAL SECTION, 1:1
const mainView =
  `<g data-geom="main">` +
  `<g data-role="phantom">${P.phantomRam(VM)}<g transform="${P.socketTransform(VM, 1)}">${P.socketOutline(VM)}</g></g>` +
  staticParts(VM, "main") +
  oil(VM, "main") +
  valves(VM, "main") +
  release(VM, "main") +
  ramGroup(VM, "main") +
  pumpHead(VM, "main") +
  centrelines(VM) +
  `</g>`;

const liftDim = (h) =>
  K.dim(VM, [-17, M.CLOSED_H], [-17, M.CLOSED_H + h], { dir: "v", off: 130 - VM.p([-17, 0])[0], text: `h=${h.toFixed(1)}`, id: "dim-lift" });

const mainDims =
  K.dim(VM, [-70, 0], [-17, M.CLOSED_H], { dir: "v", off: 36 - VM.p([-70, 0])[0] }) +
  K.dim(VM, [-17, M.CLOSED_H], [-17, M.CLOSED_H + M.LIFT_MAX], { dir: "v", off: 110 - VM.p([-17, 0])[0], text: `LIFT ${M.LIFT_MAX}` }) +
  K.dim(VM, [-70, 0], [100, 0], { dir: "h", off: 22 }) +
  `<g id="dim-lift-wrap">${liftDim(0)}</g>`;

const mainMarks = X.cuttingPlane(VM, P.AA_V, -84, 104, "A") + K.viewLabel(210, 46, "AXIAL SECTION", "SCALE 1:1") + K.detailMark(VM, [-50, 28], 20, "D", 115) + K.detailMark(VM, [62, 34], 36, "B", 32);

// Balloons on static parts; those on the ram ride with it in mvb-main; the rest are redrawn live.
const mainBalloons =
  K.balloon(VM, [-38, 180], [84, 392], 4, { target: 4 }) +
  K.balloon(VM, [-26, 206], [84, 360], 10, { target: 10 }) +
  K.balloon(VM, [-33.75, 150], [84, 470], 3, { target: 3 }) +
  K.balloon(VM, [-18, 160], [84, 432], 2, { target: 2 }) +
  K.balloon(VM, [16.8, 201.5], [338, 418], 7, { target: 7 }) +
  K.balloon(VM, [85, 66], [446, 672], 12, { target: 12 }) +
  K.balloon(VM, [81.1, 85.2], [446, 645], 15, { target: 15 }) +
  K.balloon(VM, [97.5, P.GAL_V + 1], [446, 700], 29, { target: 29 }) +
  `<g id="mvb-main">` +
  K.balloon(VM, [16, 229], [395, 318], 9, { target: 9 }) +
  K.balloon(VM, [10, 219], [395, 350], 8, { target: 8 }) +
  K.balloon(VM, [14, 209], [395, 382], 5, { target: 5 }) +
  `</g>` +
  `<g id="dynb">${X.liveBalloons({ VM, VB }, 0, 0)}</g>`;

// ---------------------------------------------------------------- DETAIL D: release valve, 2:1
const detailD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>` +
  staticParts(VD, "D") +
  oil(VD, "D") +
  release(VD, "D") +
  `<g id="ram-D">${P.ram(VD)}</g>` +
  K.centerline(VD, [-86, 28], [-4, 28], 0) +
  K.centerline(VD, [0, 12], [0, 44], 0) +
  K.centerline(VD, [P.DROP_U, 12], [P.DROP_U, 44], 0) +
  `</g><rect class="thin" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/>` +
  K.balloon(VD, [-76, 31], [452, 294], 27, { target: 27 }) +
  K.balloon(VD, [-46.75, 30.9], [452, 340], 28, { target: 28 }) +
  K.balloon(VD, [-21.05, 37.6], [740, 404], 11, { target: 11 }) +
  K.viewLabel(D.x + D.w / 2, D.y + D.h + 18, "DETAIL D", "RELEASE VALVE · SCALE 2:1");

// ---------------------------------------------------------------- DETAIL B: pump valves, 2:1
const detailB =
  `<g data-geom="B" clip-path="url(#clip-B)"><rect class="paper" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}"/>` +
  staticParts(VB, "B") +
  oil(VB, "B") +
  valves(VB, "B") +
  P.pumpCylinder(VB) +
  plungerGroup(VB, "B") +
  K.centerline(VB, [M.PUMP_U, 0], [M.PUMP_U, 72], 0) +
  K.centerline(VB, [16, 24], [99, 24], 0) +
  K.centerline(VB, [P.RELIEF_U, 20], [P.RELIEF_U, 46], 0) +
  `</g><rect class="thin" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10"/>` +
  K.balloon(VB, [21.5, 62], [488, 424], 13, { target: 13 }) +
  K.balloon(VB, [P.RELIEF_U + 0.8, 31.9], [516, 424], 24, { target: 24 }) +
  K.balloon(VB, [P.RELIEF_U + 2.2, 34.96], [544, 424], 25, { target: 25 }) +
  K.balloon(VB, [P.RELIEF_U + 3.3, 39.6], [572, 424], 26, { target: 26 }) +
  K.balloon(VB, [45, 12], [492, 795], 1, { target: 1 }) +
  K.balloon(VB, [44.3, 26.7], [520, 795], 23, { target: 23 }) +
  K.balloon(VB, [56.4, 24.9], [548, 795], 21, { target: 21 }) +
  K.balloon(VB, [64, 26.5], [696, 795], 22, { target: 22 }) +
  K.balloon(VB, [74.6, 20.9], [724, 795], 20, { target: 20 }) +
  K.viewLabel(B.x + B.w / 2, B.y + B.h + 18, "DETAIL B", "PUMP VALVES · SCALE 2:1");

// ---------------------------------------------------------------- SECTION A-A: plan at v = 40, 1:1
const sectionA =
  `<g data-geom="A">` +
  P.planBase(VA) +
  P.planRing(VA, 2, 16, 20, "steel", 135) +
  P.planRing(VA, 12, 6, 12, "steel", 135) +
  P.planSetScrew(VA) +
  `<g data-role="fluid"><path id="oil-a-ram" class="tint" fill-opacity="0.15" d="${K.d(VA, K.circle(0, 0, 16, 64))}"/>` +
  `<path id="oil-a-pump" class="tint" fill-opacity="0.15" d="${K.d(VA, K.circle(M.PUMP_U, 0, 6, 40))}"/>` +
  `<path class="tint" fill-opacity="0.15" d="${K.d(VA, K.circle(P.DROP_U, 0, 2.5, 20))}${K.d(VA, K.circle(P.RELIEF_U, 0, 1, 16))}"/></g>` +
  `<g id="aa-ram">${P.planRam(VA, 0)}</g><g id="aa-pl">${P.planPlunger(VA, 0)}</g>` +
  P.planBreaks(VA) +
  K.centerMark(VA, [0, 0], 20, 5) +
  K.centerMark(VA, [M.PUMP_U, 0], 12, 5) +
  K.centerMark(VA, [P.DROP_U, 0], 2.5, 4) +
  K.centerMark(VA, [P.RELIEF_U, 0], 4, 4) +
  `</g>` +
  K.dim(VA, [-16, 0], [16, 0], { dir: "h", off: 44 - VA.p([0, 0])[1], prefix: "Ø" }) +
  K.dim(VA, [M.PUMP_U - 6, 0], [M.PUMP_U + 6, 0], { dir: "h", off: 44 - VA.p([0, 0])[1], prefix: "Ø" }) +
  K.viewLabel(VA.p([30, 0])[0], 222, "SECTION A-A", "AREA RATIO 32²:12² = 7.1 · SCALE 1:1");

// ---------------------------------------------------------------- DIAGRAM 1: ram lift against pump strokes
const CH = { x0: 510, x1: 762, y0: 52, y1: 192, nMax: 32, hMax: 120 };
const chX = (n) => K.r2(CH.x0 + (n / CH.nMax) * (CH.x1 - CH.x0));
const chY = (h) => K.r2(CH.y1 - (h / CH.hMax) * (CH.y1 - CH.y0));
function chart() {
  let grid = "";
  let labels = "";
  for (let h = 0; h <= CH.hMax; h += 20) {
    grid += `M${CH.x0} ${chY(h)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 6}" y="${K.r2(chY(h) + 2.7)}" text-anchor="end">${h}</text>`;
  }
  for (let n = 0; n <= CH.nMax; n += 4) {
    grid += `M${chX(n)} ${CH.y0}V${CH.y1}`;
    labels += `<text class="t t-sm" x="${chX(n)}" y="${CH.y1 + 11}" text-anchor="middle">${n}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 24}" text-anchor="middle">PUMP STROKES N</text>`;
  const my = (CH.y0 + CH.y1) / 2;
  labels += `<text class="t t-sm t-mute" x="482" y="${my}" text-anchor="middle" transform="rotate(-90 482 ${my})">RAM LIFT h, mm</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="hid" d="M${CH.x0} ${CH.y1}L${CH.x1} ${chY(M.RISE * CH.nMax)}"/>` +
    `<polyline id="trace-prev" class="thin" points=""/>` +
    `<polyline id="trace-now" class="vis accent" points=""/>` +
    `<circle id="chart-dot" class="accent-fill" cx="${CH.x0}" cy="${CH.y1}" r="2.6"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 240, "DIAGRAM 1", `ACCENT: THIS LIFT · THIN: LAST · DASHED: ${M.RISE.toFixed(2)} mm PER STROKE`)
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "BASE", "EN-GJS-500-7", "1"],
  ["2", "RAM CYLINDER Ø40×4", "E355+SR EN 10305-1", "1"],
  ["3", "RESERVOIR TUBE Ø70×2.5", "E235", "1"],
  ["4", "TOP NUT M70×1.5", "C45", "1"],
  ["5", "RAM Ø32 / Ø30", "C45, HARD CHROME", "1"],
  ["6", "U-CUP SEAL 32×25×8", "PU 93 ShA", "1"],
  ["7", "WIPER 30×37×5", "NBR 90", "1"],
  ["8", "EXTENSION SCREW M24×2", "42CrMo4", "1"],
  ["9", "SADDLE Ø34, SERRATED", "C45, HARDENED", "1"],
  ["10", "FILLER PLUG", "NBR 70", "1"],
  ["11", "O-RING 40×2.5", "NBR 90", "1"],
  ["12", "PUMP CYLINDER M24×1.5", "C45", "1"],
  ["13", "OIL ISO VG 15, 300 cm³", "HYDRAULIC OIL HL", "1"],
  ["14", "PUMP PLUNGER Ø12", "100Cr6, HARDENED", "1"],
  ["15", "O-RING 12×2.5 + BACK-UP", "NBR 90 / PTFE", "1"],
  ["16", "LINK", "S235 t4", "2"],
  ["17", "HANDLE SOCKET", "S235, PRESSED", "1"],
  ["18", "HANDLE Ø22×2", "E235", "1"],
  ["19", "CLEVIS PIN Ø6 ISO 2341-B", "STEEL", "3"],
  ["20", "SUCTION BALL Ø6 ISO 3290 G10", "100Cr6", "1"],
  ["21", "DELIVERY BALL Ø6 ISO 3290 G10", "100Cr6", "1"],
  ["22", "DELIVERY SEAT Ø7", "CuZn39Pb3", "1"],
  ["23", "DELIVERY SPRING", "EN 10270-1 Ø0.6", "1"],
  ["24", "RELIEF BALL Ø4 ISO 3290 G10", "100Cr6", "1"],
  ["25", "RELIEF SPRING", "EN 10270-1 Ø0.5", "1"],
  ["26", "SET SCREW M8×1×4 ISO 4026", "45H, DRILLED Ø2", "1"],
  ["27", "RELEASE SCREW M12×1", "C45, TIP HARDENED", "1"],
  ["28", "O-RING 4×1.3", "NBR 90", "1"],
  ["29", "EXPANDER PLUG Ø7 / Ø5", "STEEL", "2"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const ROW = 12.4;
const bomTop = TB.y - (16 + BOM.length * ROW);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 30, align: "center", title: "ITEM" },
    { w: 206, title: "DESCRIPTION" },
    { w: 134, title: "MATERIAL" },
    { w: 30, align: "center", title: "QTY" },
  ],
  BOM,
  { rowH: ROW, headH: 16 }
);

const notes = K.notes(790, 260, "NOTES", [
  `PASCAL: ONE p IN ALL CONNECTED OIL, F = p·A. A RAM ${K.fmt(M.A_RAM, 0)} mm², PLUNGER ${K.fmt(M.A_PL, 0)} mm².`,
  `PER STROKE ${(M.V_STROKE / 1000).toFixed(2)} cm³ (Ø${M.PLUNGER_D} × ${M.PUMP_STROKE}) LIFTS THE RAM ${M.RISE.toFixed(2)} mm. LEVER ${M.HANDLE_L}:${M.ARM}.`,
  `RATED ${M.RATED} kg = ${Math.round(M.pressureFor(M.RATED))} bar. RELIEF BALL 24 CRACKS AT ${M.P_RELIEF} bar (${Math.round(M.loadAt(M.P_RELIEF))} kg).`,
  `RAM, PLUNGER, SCREWS, BALLS, PINS NOT HATCHED. ITEM 13 FILLS THE OIL SHOWN.`,
], 12.5);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "BOTTLE JACK 2 t · SECTION", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-005", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:1" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · bar · kg" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE HANDLE · SPACE PUMPS · O OPENS THE RELEASE · L LOAD", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const clips = ["main", "D", "B"].map((id) => {
  const V = { main: VM, D: VD, B: VB }[id];
  return `<clipPath id="cb-${id}">${P.baseClip(V)}</clipPath>`;
});
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="oil" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="oil-dot" cx="0.8" cy="0.8" r="0.62"/><circle class="oil-dot" cx="2.4" cy="2.4" r="0.62"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  clips.join("") +
  `<clipPath id="clip-D"><rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-B"><rect x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10"/></clipPath>` +
  `</defs>`;

const [hx0, hy0] = VM.p([30, 172]);
const [hx1, hy1] = VM.p([126, 100]);
const hit =
  `<rect class="hit" data-drag="main" x="${hx0}" y="${hy0}" width="${K.r2(hx1 - hx0)}" height="${K.r2(hy1 - hy0)}"/>` +
  `<rect class="hit" data-drag="B" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a two-tonne hydraulic bottle jack cut through its ram and pump. Drag the handle or use the arrow keys to pump; the oil pressure, the ram lift and the chart follow. O opens the release valve, L changes the load." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  mainMarks +
  mainBalloons +
  detailD +
  detailB +
  sectionA +
  chart() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the handle · <kbd>↑</kbd> <kbd>↓</kbd> stroke · <kbd>Space</kbd> pump · <kbd>O</kbd> release valve · <kbd>L</kbd> load · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "bottle-jack.html"), {
  title: "Bottle Jack Section",
  description: "A live engineering drawing of a 2-tonne hydraulic bottle jack: the pump, check valves, ram and release valve move, and the pressures and lift come from Pascal's principle.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#oil)}.bp-sheet .oil-dot{fill:var(--bp-accent)}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}` +
    `.bp-sheet .wall{fill:none;stroke:var(--bp-ink);stroke-width:2.3px;stroke-linejoin:miter}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "extra.mjs"), "X"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHART__", JSON.stringify(CH)),
});
console.log(
  `bottle-jack.html  ${(size / 1024).toFixed(0)} KB  ratio ${M.AREA_RATIO.toFixed(2)}  rise ${M.RISE.toFixed(3)} mm/stroke  ` +
    `p(1500 kg) ${M.pressureFor(1500).toFixed(0)} bar  hand ${M.handleForce(M.pressureFor(1500)).toFixed(0)} N`
);
