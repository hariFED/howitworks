// Builds relief-valve.html: a live A2 drawing of a DN25 spring-loaded safety relief valve,
// cut through its axis and its outlet.
//   node examples/relief-valve/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as G from "./charts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k2 = 2 * K.PX_PER_MM;
const k1 = K.PX_PER_MM;

// ---------------------------------------------------------------- views
const B = { cx: 600, cy: 222, r: 178, u: 0, v: 95 };
const C = { x: 448, y: 470, u0: -36, u1: 36, v0: 280, v1: 412 };
C.w = K.r2((C.u1 - C.u0) * k1);
C.h = K.r2((C.v1 - C.v0) * k1);
const VIEWS = {
  main: { x: 215, y: 507, scale: 1 / 2 },
  B: { x: B.cx - B.u * k2, y: B.cy + B.v * k2, scale: 2 },
  C: { x: C.x - C.u0 * k1, y: C.y + C.v1 * k1, scale: 1 },
};
const VM = K.view(VIEWS.main);
const VB = K.view(VIEWS.B);
const VC = K.view(VIEWS.C);
const ch = M.characteristic(M.F0_NOM);

// ---------------------------------------------------------------- one drawing of the valve, any view
function gasLayer(V, id) {
  return (
    `<g data-role="fluid">` +
    `<path id="gas-out-${id}" class="tint" fill-opacity="0.1" d="${P.gasPath(V, P.outletGas)}"/>` +
    `<path id="gas-hud-${id}" class="tint" fill-opacity="0.1" d="${P.gasPath(V, P.huddleGas(0))}"/>` +
    `<path id="gas-in-${id}" class="tint" fill-opacity="0.8" d="${P.gasPath(V, P.inletGas(0))}"/>` +
    `</g>`
  );
}

const moving = (V, id) => `<g id="mv-${id}">${P.discAssembly(V)}</g>`;
const setGroup = (V, id) => `<g id="set-${id}">${P.setParts(V)}</g>`;
const springWrap = (V, id) => `<g id="spring-${id}">${P.spring(V, 0, M.F0_NOM)}</g>`;

function drawValve(V, id) {
  return gasLayer(V, id) + P.fixedParts(V) + setGroup(V, id) + springWrap(V, id) + moving(V, id);
}

function centrelines(V) {
  return (
    K.centerline(V, [0, -4], [0, 414], 0) +
    K.centerline(V, [38, P.OUT_V], [110, P.OUT_V], 0) +
    [-1, 1].map((s) => K.centerline(V, [s * P.STUD_R, 128], [s * P.STUD_R, 176], 0) + K.centerline(V, [s * 42.5, -2], [s * 42.5, 22], 0)).join("") +
    K.centerline(V, [94, 150], [94, 156], 0) +
    K.centerline(V, [94, 34], [94, 46], 0) +
    K.centerline(V, [-47, 76], [-18, 76], 0) +
    K.centerline(V, [60, 51], [60, 75], 0)
  );
}

// ---------------------------------------------------------------- main view: AXIAL SECTION 1:2
const Y = (v) => VM.p([0, v])[1];
const mainView =
  `<g data-geom="main">` +
  drawValve(VM, "main") +
  `<g data-role="phantom">${P.leverPhantom(VM)}</g>` +
  centrelines(VM) +
  `</g>`;

const springDim = (V, h, F0) => {
  const a = [-27, P.PLATE_V + h];
  const len = M.springLength(F0, h);
  return K.dim(V, a, [-27, P.PLATE_V + h + len], { dir: "v", off: V.p([-50, 0])[0] - V.p(a)[0], text: `L=${len.toFixed(1)}`, id: "dim-spring" });
};

const mainDims =
  K.dim(VM, [-34, 0], [-28, 408], { dir: "v", off: 50 - VM.p([-34, 0])[0] }) +
  K.dim(VM, [34, 0], [P.OUT_FACE, P.OUT_V], { dir: "v", off: 352 - VM.p([34, 0])[0] }) +
  K.dim(VM, [-57.5, 2], [57.5, 2], { dir: "h", off: 30, prefix: "Ø" }) +
  K.dim(VM, [0, 0], [P.OUT_FACE, 51], { dir: "h", off: 54 }) +
  `<g id="dim-spring-wrap">${springDim(VM, 0, M.F0_NOM)}</g>`;

// Balloons: fixed parts on the left and right; those on the disc assembly and the spring are
// redrawn each frame with their dots on the moving part and their circles fixed.
const dyn = (id, html) => `<g id="${id}">${html}</g>`;
const BALLOONS = {
  15: { view: "main", b: [352, Y(262)] },
  14: { view: "main", b: [352, Y(205)] },
  5: { view: "B", b: [392, 232] },
  6: { view: "B", b: [392, 192] },
  9: { view: "B", b: [392, 152] },
  22: { view: "C", b: [432, 530] },
  8: { view: "C", b: [432, 592] },
  17: { view: "C", b: [432, 664] },
  16: { view: "C", b: [432, 702] },
};
const viewOf = { main: VM, B: VB, C: VC };
const dots0 = P.movingDots(0, M.F0_NOM);
const balloonAt = (n) => K.balloon(viewOf[BALLOONS[n].view], dots0[n], BALLOONS[n].b, n, { target: n });
const dynBalloons = (view) => Object.keys(BALLOONS).filter((n) => BALLOONS[n].view === view).map((n) => dyn(`bal-${n}`, balloonAt(n))).join("");

const mainBalloons =
  K.balloon(VM, [-28, 385], [110, Y(386)], 19, { target: 19 }) +
  K.balloon(VM, [-33, 296], [110, Y(326)], 10, { target: 10 }) +
  K.balloon(VM, [-41, 146.75], [110, Y(136)], 13, { target: 13 }) +
  K.balloon(VM, [-34, 143], [110, Y(112)], 7, { target: 7 }) +
  K.balloon(VM, [-44.5, 76], [110, Y(84)], 4, { target: 4 }) +
  K.balloon(VM, [-27, 40], [110, Y(50)], 1, { target: 1 }) +
  K.balloon(VM, [57, 167], [352, Y(176)], 12, { target: 12 }) +
  K.balloon(VM, [51, 152], [352, Y(148)], 11, { target: 11 }) +
  K.balloon(VM, [70, 365], [352, Y(330)], 20, { target: 20 }) +
  K.balloon(VM, [62, 56], [300, Y(-14)], 23, { target: 23 }) +
  dynBalloons("main");

// Detail marks: B is deep inside the body, so its letter sits outside on a short leader.
const markB = (() => {
  const [cx, cy] = VM.p([B.u, B.v]);
  const r = K.r2((B.r / k2) * VM.k);
  const [lx, ly] = VM.p([-75, 101]);
  const a = Math.atan2(ly - cy, lx - cx);
  return (
    `<g data-role="label"><circle class="thin mark" cx="${cx}" cy="${cy}" r="${r}"/>` +
    `<path class="thin" d="M${K.r2(cx + r * Math.cos(a))} ${K.r2(cy + r * Math.sin(a))}L${K.r2(lx + 6)} ${K.r2(ly + 1)}"/>` +
    `<text class="t t-lg" x="${lx}" y="${ly + 4}" text-anchor="middle">B</text></g>`
  );
})();
const markC = (() => {
  const [x0, y0] = VM.p([C.u0, C.v1]);
  const [x1, y1] = VM.p([C.u1, C.v0]);
  const [lx, ly] = VM.p([C.u1 + 6, C.v1 - 2]);
  return `<g data-role="label"><rect class="thin mark" x="${x0}" y="${y0}" width="${K.r2(x1 - x0)}" height="${K.r2(y1 - y0)}" rx="5"/><text class="t t-lg" x="${lx}" y="${ly + 4}" text-anchor="middle">C</text></g>`;
})();
const mainMarks = markB + markC + K.viewLabel(215, 50, "AXIAL SECTION", "SCALE 1:2");

// ---------------------------------------------------------------- DETAIL B: seat and huddling chamber, 5:1
const liftDim = (V, h) => {
  const a = [-11.5, P.SEAT_V];
  return K.dim(V, a, [-11.5, P.SEAT_V + h], { dir: "v", off: V.p([-5, 0])[0] - V.p(a)[0], text: `h=${h.toFixed(2)}`, id: "dim-lift" });
};
const detailB =
  `<g data-geom="B" clip-path="url(#clip-B)"><circle class="paper" cx="${B.cx}" cy="${B.cy}" r="${B.r}"/>` +
  drawValve(VB, "B") +
  `<g data-role="phantom">${P.discPhantom(VB)}</g>` +
  K.centerline(VB, [0, 50], [0, 140], 0) + K.centerline(VB, [38, P.OUT_V], [60, P.OUT_V], 0) + K.centerline(VB, [-47, 76], [-18, 76], 0) +
  `<g id="dim-lift-wrap">${liftDim(VB, 0)}</g>` +
  `</g><circle class="thin" cx="${B.cx}" cy="${B.cy}" r="${B.r}"/>` +
  K.balloon(VB, [-14, 70], [392, 330], 2, { target: 2 }) +
  K.balloon(VB, [-18.5, 81], [392, 282], 3, { target: 3 }) +
  dynBalloons("B") +
  K.viewLabel(B.cx, B.cy + B.r + 20, "DETAIL B", "NOZZLE, DISC AND GUIDE · SCALE 2:1");

// ---------------------------------------------------------------- DETAIL C: setting and lifting gear, 1:1
const detailC =
  `<g data-geom="C" clip-path="url(#clip-C)"><rect class="paper" x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}"/>` +
  drawValve(VC, "C") +
  K.centerline(VC, [0, C.v0], [0, C.v1], 0) +
  `</g><rect class="thin" x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="10"/>` +
  K.balloon(VC, [-15, 330], [432, 630], 18, { target: 18 }) +
  K.balloon(VC, P.PIN, [432, 561], 21, { target: 21 }) +
  dynBalloons("C") +
  K.viewLabel(C.x + C.w / 2, C.y + C.h + 20, "DETAIL C", "SETTING AND LIFTING GEAR · 1:1");

// ---------------------------------------------------------------- DIAGRAM 1: lift against pressure
function chartFrame(D, { xTicks, yTicks, xLab, yLab, xTitle, yTitle, yTitleX }) {
  let grid = "";
  let labels = "";
  for (const [x, s] of xTicks) {
    grid += `M${x} ${D.y0}V${D.y1}`;
    if (s) labels += `<text class="t t-sm" x="${x}" y="${D.y1 + 11}" text-anchor="middle">${s}</text>`;
  }
  for (const [y, s] of yTicks) {
    grid += `M${D.x0} ${y}H${D.x1}`;
    if (s) labels += `<text class="t t-sm" x="${D.x0 - 5}" y="${K.r2(y + 2.7)}" text-anchor="end">${s}</text>`;
  }
  const my = (D.y0 + D.y1) / 2;
  labels += `<text class="t t-sm t-mute" x="${(D.x0 + D.x1) / 2}" y="${D.y1 + 24}" text-anchor="middle">${xTitle}</text>`;
  labels += `<text class="t t-sm t-mute" x="${yTitleX}" y="${my}" text-anchor="middle" transform="rotate(-90 ${yTitleX} ${my})">${yTitle}</text>`;
  return { grid, labels, bg: `<rect class="paper" x="${D.x0}" y="${D.y0}" width="${D.x1 - D.x0}" height="${D.y1 - D.y0}"/>`, box: `<rect class="vis" x="${D.x0}" y="${D.y0}" width="${D.x1 - D.x0}" height="${D.y1 - D.y0}"/>` };
}

function diagram1() {
  const D = G.D1;
  const xs = [];
  for (let p = 8.5; p <= 10.751; p += 0.25) xs.push([G.x1(p), Math.abs(p * 2 - Math.round(p * 2)) < 1e-6 ? p.toFixed(1) : ""]);
  const ys = [0, 1, 2, 3, 4, 5, 6].map((h) => [G.y1(h), h ? String(h) : ""]);
  const f = chartFrame(D, { xTicks: xs, yTicks: ys, xTitle: "VESSEL PRESSURE p, bar g", yTitle: "LIFT h, mm", yTitleX: 818 });
  const lp = G.loopPaths(M.F0_NOM);
  return (
    `<g data-role="chart">${f.bg}<path class="thin grid-line" d="${f.grid}"/>` +
    `<path id="d1-stable" class="thin" d="${lp.stable}"/>` +
    `<path id="d1-unstable" class="hid" d="${lp.unstable}"/>` +
    `<path id="d1-jumps" class="hid" d="${lp.jumps}"/>` +
    `<polyline id="d1-trace" class="vis accent" points=""/>` +
    `<circle id="d1-dot" class="accent-fill" cx="${G.x1(M.P_START)}" cy="${G.y1(0)}" r="2.6"/>` +
    f.box +
    f.labels +
    `<g id="d1-marks">${G.d1Marks(lp.ch)}</g>` +
    `</g>` +
    K.viewLabel((D.x0 + D.x1) / 2, 222, "DIAGRAM 1", "LIFT AGAINST PRESSURE · ACCENT: LAST CYCLE · DASHED: UNSTABLE")
  );
}

function diagram2() {
  const D = G.D2;
  const xs = [30, 25, 20, 15, 10, 5, 0].map((a) => [G.x2(a), a ? `−${a}` : "0"]);
  const ys = [8.5, 9, 9.5, 10, 10.5].map((p) => [G.y2(p), p > 8.5 ? p.toFixed(1) : ""]);
  const f = chartFrame(D, { xTicks: xs, yTicks: ys, xTitle: "TIME t, s (NOW AT RIGHT)", yTitle: "p, bar g", yTitleX: 52 });
  return (
    `<g data-role="chart">${f.bg}<path class="thin grid-line" d="${f.grid}"/>` +
    `<path id="d2-set" class="hid" d="M${D.x0} ${G.y2(ch.set)}H${D.x1}"/>` +
    `<path id="d2-reseat" class="hid" d="M${D.x0} ${G.y2(ch.reseat)}H${D.x1}"/>` +
    `<polyline id="d2-trace" class="vis accent" points=""/>` +
    `<circle id="d2-dot" class="accent-fill" cx="${D.x1}" cy="${G.y2(M.P_START)}" r="2.6"/>` +
    f.box +
    f.labels +
    `</g>` +
    K.viewLabel((D.x0 + D.x1) / 2, 760, "DIAGRAM 2", "RECEIVER PRESSURE · DASHED: SET AND RESEAT")
  );
}

function diagram3() {
  const D = G.D3;
  const xs = [0, 2, 4, 6].map((h) => [G.x3(h), String(h)]);
  const ys = [0, 1000, 2000, 3000].map((q) => [G.y3(q), String(q)]);
  const f = chartFrame(D, { xTicks: xs, yTicks: ys, xTitle: "LIFT h, mm", yTitle: "DISCHARGE, kg/h", yTitleX: 628 });
  const xt = G.x3(M.H_THROAT);
  return (
    `<g data-role="chart">${f.bg}<path class="thin grid-line" d="${f.grid}"/>` +
    `<path class="hid" d="M${xt} ${D.y0}V${D.y1}"/>` +
    `<polyline id="d3-set" class="thin" points="${G.flowPath(ch.set)}"/>` +
    `<polyline id="d3-now" class="vis accent" points="${G.flowPath(M.P_START)}"/>` +
    `<circle id="d3-dot" class="accent-fill" cx="${G.x3(0)}" cy="${G.y3(0)}" r="2.6"/>` +
    f.box +
    f.labels +
    `<text class="t t-sm" x="${xt - 3}" y="${D.y1 - 6}" text-anchor="end">THROAT</text>` +
    `</g>` +
    K.viewLabel((D.x0 + D.x1) / 2 - 10, C.y + C.h + 20, "DIAGRAM 3", "DISCHARGE · THIN: AT SET")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "BODY DN25 PN40 × DN40 PN16", "GP240GH (1.0619)", "1"],
  ["2", "NOZZLE d0 23, M42×2", "X6CrNiMoTi17-12-2", "1"],
  ["3", "ADJUSTING RING M34×1.5", "X2CrNiMo17-12-2", "1"],
  ["4", "RING LOCK SCREW M10×25 ISO 4028", "A4-70", "1"],
  ["5", "DISC Ø30, SEAT Ø24", "X39CrMo17-1", "1"],
  ["6", "DISC HOLDER, SKIRT Ø31", "X2CrNiMo17-12-2", "1"],
  ["7", "GUIDE", "X20Cr13", "1"],
  ["8", "SPINDLE Ø14/Ø12", "X20Cr13", "1"],
  ["9", "SPLIT RING", "X10CrNi18-8", "1"],
  ["10", "BONNET", "GP240GH (1.0619)", "1"],
  ["11", "STUD M12×42 EN 1515-1", "25CrMo4", "4"],
  ["12", "HEX NUT M12 ISO 4032", "C35E, CLASS 8", "4"],
  ["13", "GASKET Ø124×Ø76×1.5", "GRAPHITE, 316 INSERT", "1"],
  ["14", "LOWER SPRING PLATE", "C45E", "1"],
  ["15", `SPRING d${M.WIRE} D${M.COIL_D} n${M.ACTIVE} L0 ${M.FREE_LENGTH.toFixed(0)}`, "EN 10270-2 VDSiCr", "1"],
  ["16", "UPPER SPRING PLATE", "C45E", "1"],
  ["17", "ADJUSTING SCREW M24×2", "X20Cr13", "1"],
  ["18", "LOCK NUT M24×2 ISO 8675", "STEEL 05", "1"],
  ["19", "CAP", "EN-GJS-400-18", "1"],
  ["20", "LIFTING LEVER", "S235JR", "1"],
  ["21", "LEVER PIN Ø8×40 ISO 2338", "C45E", "1"],
  ["22", "LIFTING NUT M12 ISO 4035", "STEEL 04", "1"],
  ["23", "DRAIN PLUG G1/4 DIN 910", "11SMnPb30", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const rowH = 15;
const bomTop = TB.y - (18 + BOM.length * rowH);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 30, align: "center", title: "ITEM" },
    { w: 198, title: "DESCRIPTION" },
    { w: 140, title: "MATERIAL" },
    { w: 32, align: "center", title: "QTY" },
  ],
  BOM,
  { rowH }
);

const qRated = M.massFlow(ch.set * 1.1, M.H_MAX) * 3600;
const notes = K.notes(790, 256, "NOTES", [
  `SET ${ch.set.toFixed(1)} bar g = PRELOAD ${M.F0_NOM.toFixed(0)} N ON SEAT Ø${M.D_SEAT} (${M.A_SEAT.toFixed(0)} mm²); k ${M.K_SPRING.toFixed(1)} N/mm.`,
  `SIMMERS FROM ${ch.start.toFixed(2)}; GAS IN HUDDLING CHAMBER Ø${M.D_HUD} POPS THE DISC.`,
  `RESEATS AT ${ch.reseat.toFixed(2)}: BLOWDOWN ${(ch.blowdown * 100).toFixed(0)} %. FULL LIFT ${M.H_MAX} mm ≥ d0/4.`,
  `AIR, CHOKED, Kdr ${M.KD}: ${Math.round(qRated / 10) * 10} kg/h AT +10 %. RECEIVER ${M.V_RX * 1000} L,`,
  `COMPRESSOR ${(M.M_COMP * 3600).toFixed(0)} kg/h. SPINDLE, SCREWS, STUDS, NUTS NOT CUT.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "RELIEF VALVE · AXIAL SECTION", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-011", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:2" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · bar (gauge)" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG = VESSEL PRESSURE · ← → ADJUSTING SCREW · SPACE COMPRESSOR · S SLOW", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="gas" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="gas-dot" cx="0.8" cy="0.8" r="0.62"/><circle class="gas-dot" cx="2.4" cy="2.4" r="0.62"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-B"><circle cx="${B.cx}" cy="${B.cy}" r="${B.r}"/></clipPath>` +
  `<clipPath id="clip-C"><rect x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="10"/></clipPath>` +
  `</defs>`;

const [mx0] = VM.p([-64, 0]);
const [mx1] = VM.p([106, 0]);
const hit =
  `<rect class="hit" data-drag="p" x="${mx0}" y="${Y(410)}" width="${K.r2(mx1 - mx0)}" height="${K.r2(Y(0) - Y(410))}"/>` +
  `<rect class="hit" data-drag="p" x="${G.D1.x0}" y="${G.D1.y0}" width="${G.D1.x1 - G.D1.x0}" height="${G.D1.y1 - G.D1.y0}"/>` +
  `<rect class="hit" data-drag="p" x="${G.D2.x0}" y="${G.D2.y0}" width="${G.D2.x1 - G.D2.x0}" height="${G.D2.y1 - G.D2.y0}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a DN25 spring-loaded safety relief valve cut through its axis. A compressor fills the receiver; the valve simmers, pops open, blows down and reseats. Drag up or down to set the vessel pressure; left and right arrows turn the adjusting screw." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  mainBalloons +
  mainMarks +
  detailB +
  detailC +
  diagram1() +
  diagram2() +
  diagram3() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag ↕ vessel pressure · <kbd>↑</kbd> <kbd>↓</kbd> pressure · <kbd>←</kbd> <kbd>→</kbd> adjusting screw · <kbd>Space</kbd> compressor · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "relief-valve.html"), {
  title: "Relief Valve Section",
  description: "A live engineering drawing of a spring-loaded safety relief valve: a compressor fills the receiver, the disc simmers, pops on its huddling chamber, blows down and reseats.",
  svg,
  bar,
  css: `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#gas)}.bp-sheet .gas-dot{fill:var(--bp-accent)}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "charts.mjs"), "G"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__BALLOONS__", JSON.stringify(BALLOONS)),
});
console.log(`relief-valve.html  ${(size / 1024).toFixed(0)} KB  set ${ch.set.toFixed(3)}  reseat ${ch.reseat.toFixed(3)}  blowdown ${(ch.blowdown * 100).toFixed(1)}%  rated ${qRated.toFixed(0)} kg/h`);
