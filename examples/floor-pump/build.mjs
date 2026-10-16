// Builds floor-pump.html: a live A2 drawing of a bicycle floor pump, cut through its axis.
//   node examples/floor-pump/build.mjs
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k2 = 2 * K.PX_PER_MM;

// ---------------------------------------------------------------- views
const VIEWS = {
  main: { x: 190, y: 780, scale: 1 / 2.5 },
  B: { x: 560 - 52 * k2, y: 625 + 38 * k2, scale: 2 },
  D: { x: 580, y: 340 + (P.VP + 14) * k2, scale: 2 },
  C: { x: 985, y: 122, scale: 1 },
};
const VM = K.view(VIEWS.main);
const VB = K.view(VIEWS.B);
const VD = K.view(VIEWS.D);
const VC = K.view(VIEWS.C);
const B = { cx: 560, cy: 625, r: 153 };
const D = { x: 500, y: 267, w: 160, h: 146 };

// ---------------------------------------------------------------- shared drawing of the pump
function staticParts(V) {
  return (
    P.treads(V) + P.casting(V) + P.clampScrew(V) + P.barrel(V) + P.oring(V) + P.cap(V) + P.bushing(V) + P.hose(V) + P.barb(V) + P.gaugeBody(V)
  );
}

function airLayer(V, id) {
  return (
    `<g data-role="fluid">` +
    `<path id="tint-t-${id}" class="tint" fill-opacity="0.3" d="${P.airPath(V, P.tyreAir)}"/>` +
    `<path id="tint-c-${id}" class="tint" fill-opacity="0.12" d="${P.airPath(V, P.chamberAir(1))}"/>` +
    `</g>`
  );
}

const valve = (V, id) => `<g id="valve-${id}">${P.ball(V, 0)}${P.spring(V, 0)}</g>`;

function moving(V, id) {
  return `<g id="mv-${id}">${P.rod(V)}<g id="cup-${id}">${P.cup(V, 0)}</g>${P.piston(V)}${P.handle(V)}</g>`;
}

function centrelines(V) {
  return (
    K.centerline(V, [0, -3], [0, 846], 0) +
    K.centerline(V, [36, M.PASSAGE_V], [118, M.PASSAGE_V], 0) +
    K.centerline(V, [P.GAUGE_U, 54], [P.GAUGE_U, 103], 0)
  );
}

// ---------------------------------------------------------------- main view: SECTION A-A
const hcTop = P.handleCentre(M.pistonV(0));
const hcLow = P.handleCentre(P.VP);
const mainView =
  `<g data-geom="main">` +
  airLayer(VM, "main") +
  staticParts(VM) +
  valve(VM, "main") +
  `<g id="needle-main">${P.needleSection(VM, M.START_GAUGE)}</g>` +
  `<g data-role="phantom">${P.phantomTop(VM)}</g>` +
  moving(VM, "main") +
  centrelines(VM) +
  `</g>`;

const dimTravel = (x) => {
  const travel = M.STROKE * x;
  return K.dim(VM, [140, hcTop], [140, hcTop - travel], { dir: "v", off: 16, text: `s=${Math.round(travel)}`, id: "dim-travel" });
};

const mainDims =
  K.dim(VM, [-118, 0], [-100, hcTop + 16], { dir: "v", off: 44 - VM.p([-118, 0])[0] }) +
  K.dim(VM, [-40, 66], [-118, 0], { dir: "v", off: 64 - VM.p([-40, 66])[0] }) +
  K.dim(VM, [-118, 0], [118, 0], { dir: "h", off: 22 }) +
  K.dim(VM, [-140, hcTop + 13], [140, hcTop + 13], { dir: "h", off: -18 }) +
  `<g id="dim-travel-wrap">${dimTravel(0)}</g>`;

// Balloons on static parts sit to the left; those on the handle ride with it, below the grips.
const hcY = VM.p([0, hcLow])[1];
const mainBalloons =
  K.balloon(VM, [-110, 2], [76, 792], 2, { target: 2 }) +
  K.balloon(VM, [-90, 12], [100, 700], 1, { target: 1 }) +
  K.balloon(VM, [-43, 50], [122, 655], 5, { target: 5 }) +
  K.balloon(VM, [-16.75, 250], [120, 560], 3, { target: 3 }) +
  K.balloon(VM, [-19, 420], [120, 470], 6, { target: 6 }) +
  K.balloon(VM, [-9.5, 441.5], [110, 432], 7, { target: 7 }) +
  K.balloon(VM, [140, M.PASSAGE_V + 7], [335, 715], 20, { target: 20 }) +
  `<g id="mvb-main">` +
  K.balloon(VM, [4, P.VP + M.ROD - 13 - 8], [214, hcY + 40], 8, { target: 8 }) +
  K.balloon(VM, [12, hcLow - 18], [239, hcY + 40], 13, { target: 13 }) +
  K.balloon(VM, [80, hcLow - 14], [268, hcY + 40], 15, { target: 15 }) +
  K.balloon(VM, [128.5, hcLow - 10.25], [300, hcY + 40], 14, { target: 14 }) +
  K.balloon(VM, [138, hcLow], [340, hcY + 30], 16, { target: 16 }) +
  `</g>`;

const mainMarks =
  K.detailMark(VM, [52, 38], 38, "B", -90) +
  K.viewArrow(VM, [P.GAUGE_U, 100], [0, 1], "C") +
  K.viewLabel(190, 46, "AXIAL SECTION", "SCALE 1:2.5");

// ---------------------------------------------------------------- DETAIL B: check valve, 2:1
const detailB =
  `<g data-geom="B" clip-path="url(#clip-B)"><circle class="paper" cx="${B.cx}" cy="${B.cy}" r="${B.r}"/>` +
  airLayer(VB, "B") +
  staticParts(VB) +
  valve(VB, "B") +
  moving(VB, "B") +
  centrelines(VB) +
  `</g><circle class="thin" cx="${B.cx}" cy="${B.cy}" r="${B.r}"/>` +
  K.balloon(VB, [18.5, 41.5], [392, 600], 4, { target: 4 }) +
  K.balloon(VB, [P.ballU(0) + 0.8, M.PASSAGE_V + 2], [740, 648], 17, { target: 17 }) +
  K.balloon(VB, [65.55, M.PASSAGE_V + 4], [740, 612], 18, { target: 18 }) +
  K.balloon(VB, [84, M.PASSAGE_V + 7], [740, 576], 19, { target: 19 }) +
  K.viewLabel(B.cx, B.cy + B.r + 18, "DETAIL B", "CHECK VALVE · SCALE 2:1");

// ---------------------------------------------------------------- DETAIL D: the piston, 2:1, riding with it
const vpD = P.VP;
const detailD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>` +
  `<g data-role="fluid"><path id="tint-c-D" class="tint" fill-opacity="0.12" d="${K.d(VD, K.rect(-16, vpD - 30, 16, vpD + M.POCKET))}"/></g>` +
  P.part(3, K.section(VD, { ...K.revolve([[16, vpD - 30], [17.5, vpD - 30], [17.5, vpD + 60], [16, vpD + 60]]), edges: [] }, { mat: "solid" })) +
  P.rod(VD) +
  `<g id="cup-D">${P.cup(VD, 0)}</g>` +
  P.piston(VD) +
  K.centerline(VD, [0, vpD - 30], [0, vpD + 60], 0) +
  `</g><rect class="thin" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/>` +
  K.balloon(VD, [10, vpD + 23], [700, 290], 9, { target: 9 }) +
  K.balloon(VD, [15.2, vpD + 15], [700, 330], 10, { target: 10 }) +
  K.balloon(VD, [-8, vpD + 9], [460, 350], 11, { target: 11 }) +
  K.balloon(VD, [-7, vpD + 4], [460, 388], 12, { target: 12 }) +
  K.viewLabel(D.x + D.w / 2, D.y + D.h + 18, "DETAIL D", "PISTON 9–12, RIDING WITH IT · 2:1");

// ---------------------------------------------------------------- VIEW C: gauge dial, 1:1
const viewC =
  `<g data-geom="C">${P.gaugeFace(VC)}<g id="needle-face">${P.needleFace(VC, M.START_GAUGE)}</g></g>` +
  K.dim(VC, [-35.4, 0], [35.4, 0], { dir: "h", off: 35.4 * VC.k + 16, prefix: "Ø" }) +
  K.balloon(VC, [-24, 24], [880, 56], 21, { target: 21 }) +
  K.viewLabel(985, 236, "VIEW C", "GAUGE DIAL · SCALE 1:1");

// ---------------------------------------------------------------- DIAGRAM 1: chamber pressure against travel
const CH = { x0: 446, x1: 752, y0: 58, y1: 190, sMax: M.STROKE, gMax: 8 };
const chX = (s) => K.r2(CH.x0 + (s / CH.sMax) * (CH.x1 - CH.x0));
const chY = (g) => K.r2(CH.y1 - (g / CH.gMax) * (CH.y1 - CH.y0));
function chart() {
  let grid = "";
  let labels = "";
  for (let g = 0; g <= CH.gMax; g++) {
    grid += `M${CH.x0} ${chY(g)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 6}" y="${K.r2(chY(g) + 2.7)}" text-anchor="end">${g}</text>`;
  }
  for (let s = 0; s <= CH.sMax; s += 50) {
    grid += `M${chX(s)} ${CH.y0}V${CH.y1}`;
    labels += `<text class="t t-sm" x="${chX(s)}" y="${CH.y1 + 11}" text-anchor="middle">${s}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 24}" text-anchor="middle">PISTON TRAVEL s, mm</text>`;
  labels += `<text class="t t-sm t-mute" x="414" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 414 ${(CH.y0 + CH.y1) / 2})">CHAMBER p, bar</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path id="chart-tyre" class="hid" d="M${CH.x0} ${chY(M.START_GAUGE)}H${CH.x1}"/>` +
    `<polyline id="trace-prev" class="thin" points=""/>` +
    `<polyline id="trace-now" class="vis accent" points=""/>` +
    `<circle id="chart-dot" class="accent-fill" cx="${CH.x0}" cy="${CH.y1}" r="2.6"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 240, "DIAGRAM 1", "ACCENT: THIS STROKE · THIN: LAST STROKE · DASHED: TYRE")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "BASE", "AlSi12 DIE CASTING", "1"],
  ["2", "TREAD PAD", "NBR 70", "2"],
  ["3", "BARREL TUBE Ø35×1.5", "E235 STEEL", "1"],
  ["4", "O-RING 33×2", "NBR 70", "1"],
  ["5", "CLAMP SCREW M6×28 ISO 4762", "STEEL 8.8", "1"],
  ["6", "TOP CAP", "PA6", "1"],
  ["7", "ROD BUSHING", "CuSn8", "1"],
  ["8", "PISTON ROD Ø10", "C45, HARD CHROME", "1"],
  ["9", "PISTON HUB", "EN AW-6082", "1"],
  ["10", "CUP SEAL Ø32", "NBR 70", "1"],
  ["11", "WASHER Ø20×2", "STEEL", "1"],
  ["12", "HEX NUT M10 ISO 4032", "STEEL 8", "1"],
  ["13", "HANDLE HUB", "PA6-GF30", "1"],
  ["14", "HANDLE TUBE Ø22×1.5", "E235 STEEL", "1"],
  ["15", "GRIP", "EPDM FOAM", "2"],
  ["16", "END PLUG", "PE-LD", "2"],
  ["17", "CHECK BALL Ø8", "100Cr6", "1"],
  ["18", "VALVE SPRING, 5 TURNS", "EN 10270 Ø0.9", "1"],
  ["19", "HOSE BARB G1/8", "CuZn39Pb3", "1"],
  ["20", "HOSE 12×6", "PVC", "1"],
  ["21", "GAUGE Ø71, 0–11 bar", "BOUGHT OUT", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const bomTop = TB.y - (18 + BOM.length * 16);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 34, align: "center", title: "ITEM" },
    { w: 200, title: "DESCRIPTION" },
    { w: 132, title: "MATERIAL" },
    { w: 34, align: "center", title: "QTY" },
  ],
  BOM
);

const force7 = M.force(7 + M.P_ATM);
const notes = K.notes(790, 266, "NOTES", [
  `AIR ISOTHERMAL, p·V = CONST; READINGS IN bar ABOVE ATMOSPHERE.`,
  `SWEPT ${K.fmt(M.SWEPT, 1)} cm³ (Ø${M.BORE} × ${M.STROKE}); DEAD VOLUME ${K.fmt(M.V_DEAD, 1)} cm³.`,
  `CUP SEAL 10 IS THE INLET VALVE, BALL 17 THE OUTLET.`,
  `HANDLE FORCE F = p·A, A = ${K.fmt(M.AREA, 0)} mm²: 7 bar NEEDS ${K.fmt(force7, 0)} N.`,
  `TYRE 700×28C ≈ ${M.V_TYRE} cm³. ROD, NUT, BALL, SCREW NOT CUT.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "FLOOR PUMP · AXIAL SECTION", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-001", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:2.5" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · bar (gauge)" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE HANDLE · SPACE PUMPS · R LETS THE TYRE DOWN", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="air" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="air-dot" cx="0.8" cy="0.8" r="0.62"/><circle class="air-dot" cx="2.4" cy="2.4" r="0.62"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-B"><circle cx="${B.cx}" cy="${B.cy}" r="${B.r}"/></clipPath>` +
  `<clipPath id="clip-D"><rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/></clipPath>` +
  `</defs>`;

const [mx0] = VM.p([-150, 0]);
const [mx1] = VM.p([150, 0]);
const hit =
  `<rect class="hit" data-drag="main" x="${mx0}" y="40" width="${K.r2(mx1 - mx0)}" height="${K.r2(VM.p([0, 300])[1] - 40)}"/>` +
  `<rect class="hit" data-drag="D" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a bicycle floor pump cut through its axis. Drag the handle or use the arrow keys to move the piston; the chamber and tyre pressures, the gauge and the chart follow." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  mainBalloons +
  mainMarks +
  detailB +
  detailD +
  viewC +
  chart() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the handle · <kbd>↑</kbd> <kbd>↓</kbd> stroke · <kbd>Space</kbd> pump · <kbd>R</kbd> let the tyre down · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "floor-pump.html"), {
  title: "Floor Pump Section",
  description: "A live engineering drawing of a bicycle floor pump: the piston, cup seal and check valve move, and the pressures come from Boyle's law.",
  svg,
  bar,
  css: `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#air)}.bp-sheet .air-dot{fill:var(--bp-accent)}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: (await import("node:fs")).readFileSync(join(here, "live.js"), "utf8").replace("__CHART__", JSON.stringify(CH)),
});
console.log(`floor-pump.html  ${(size / 1024).toFixed(0)} KB  swept ${M.SWEPT.toFixed(1)} cm³  dead ${M.V_DEAD.toFixed(2)} cm³  ratio ${M.ratio.toFixed(1)}`);
