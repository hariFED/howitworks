// Builds four-stroke.html: a live A2 drawing of a 125 cc four-stroke single, cut through its cylinder axis.
//   node examples/four-stroke/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k2 = 2 * K.PX_PER_MM;
const CYC = M.cycle();

// ---------------------------------------------------------------- views
const C = { cx: 662, cy: 305, r: 88, u: 1.5, v: 157 };
const B = { x: 566, y: 442, w: 182, h: 140, u0: -7, w0: 33 };
const VIEWS = {
  main: { x: 290, y: 660, scale: 1 },
  C: { x: C.cx - C.u * k2, y: C.cy + C.v * k2, scale: 2 },
  B: { x: B.x - B.u0 * k2, y: B.y + B.w0 * k2, scale: 2 },
};
const VM = K.view(VIEWS.main);
const VC = K.view(VIEWS.C);
const VB = K.view(VIEWS.B);
const PV0 = M.pinV(0); // moving parts are drawn at TDC; the page moves them

// ---------------------------------------------------------------- layers shared by the section and Detail C
function staticParts(V) {
  return P.crankcase(V) + P.liner(V) + P.barrel(V) + P.gasket(V) + P.head(V) + P.manifold(V) + P.exhaustPipe(V) + P.cover(V);
}
function gasLayer(V, id) {
  const op = (p) => K.r2(0.2 + 0.8 * Math.min(1, Math.max(0, Math.log(p / 0.7) / Math.log(60 / 0.7))));
  return (
    `<g data-role="fluid">` +
    `<path class="tint" fill-opacity="${op(M.P_IN)}" d="${P.gasPath(V, P.portGas("in"))}"/>` +
    `<path class="tint burn" fill-opacity="${op(M.P_EX)}" d="${P.gasPath(V, P.portGas("ex"))}"/>` +
    `<path id="gas-${id}" class="tint" fill-opacity="0.3" d="${K.d(V, P.cylinderGas(0))}"/>` +
    `<circle id="under-${id}" class="tint under" clip-path="url(#clip-gas-${id})" cx="${V.p(P.GAP)[0]}" cy="${V.p(P.GAP)[1]}" r="0"/>` +
    `<circle id="flame-${id}" class="tint burn" clip-path="url(#clip-gas-${id})" cx="${V.p(P.GAP)[0]}" cy="${V.p(P.GAP)[1]}" r="0"/>` +
    `</g>`
  );
}
const valveTrain = (V, id) =>
  ["in", "ex"]
    .map(
      (key) =>
        P.insert(V, key) +
        P.guide(V, key) +
        `<g id="spring-${key}-${id}">${P.spring(V, key, 0)}</g>` +
        `<g id="valve-${key}-${id}">${P.valveSet(V, key)}</g>`
    )
    .join("");
const pistonGroup = (V, id) => `<g id="piston-${id}">${P.piston(V, PV0)}</g>`;

// ---------------------------------------------------------------- main view: AXIAL SECTION
const crankC = VM.p([0, 0]);
const mainView =
  `<g data-geom="main">` +
  staticParts(VM) +
  gasLayer(VM, "main") +
  `<g data-role="phantom">${P.pistonPhantom(VM)}</g>` +
  `<g id="web-main">${P.web(VM)}</g>` +
  pistonGroup(VM, "main") +
  `<g id="rod-main">${P.rodSet(VM, 0)}</g>` +
  valveTrain(VM, "main") +
  `<g id="cams-main">${P.cam(VM, "in", 0)}${P.cam(VM, "ex", 0)}</g>` +
  P.plug(VM) +
  K.centerline(VM, [0, -64], [0, 152], 4) +
  K.centerline(VM, [P.PLUG_U, 166], [P.PLUG_U, 223], 4) +
  ["in", "ex"].map((key) => K.centerline(VM, P.W(key, 0, 47), P.W(key, 0, 178), 0) + K.centerMark(VM, P.camCentre(key), 6, 3)).join("") +
  K.centerMark(VM, [0, 0], 8, 3) +
  `<path class="ctr" d="${K.d(VM, K.circle(0, 0, M.CRANK_R, 72))}"/>` +
  `</g>`;

const crownTop = M.crownAtTDC;
const dimTravel = (phi) =>
  K.dim(VM, [M.BORE / 2, crownTop], [M.BORE / 2, M.crown(phi)], { dir: "v", off: K.r2(VM.p([82, 0])[0] - VM.p([M.BORE / 2, 0])[0]), text: `s=${K.fmt(M.travel(phi), 1)}`, id: "dim-travel" });

const mainDims =
  K.dim(VM, [-14, -64], [-65, 281], { dir: "v", off: K.r2(42 - VM.p([-14, 0])[0]) }) +
  K.dim(VM, [-84, 214], [84, 214], { dir: "h", off: K.r2(VM.p([0, 284])[1] - VM.p([0, 214])[1] - 10) }) +
  `<g id="dim-travel-wrap">${dimTravel(0)}</g>`;

// Balloons with a fixed circle whose dot follows a moving part are redrawn each frame.
const LIVE_BALLOONS = {
  2: { at: [470, 735] },
  3: { at: [470, 645] },
  4: { at: [470, 615] },
  5: { at: [470, 585] },
  21: { at: [500, 168] },
  22: { at: [500, 198] },
};
const liveBalloons = Object.entries(LIVE_BALLOONS).map(([n, b]) => `<g id="lb-${n}"></g>`).join("");

const mainBalloons =
  K.balloon(VM, [-82, 245], [70, 182], 26, { target: 26 }) +
  K.balloon(VM, [-65.3, 250.8], [70, 146], 24, { target: 24 }) +
  K.balloon(VM, P.W("in", -12.4, 121.5), [70, 218], 23, { target: 23 }) +
  K.balloon(VM, [-51, 202], [70, 254], 14, { target: 14 }) +
  K.balloon(VM, [-88, 197.2], [70, 292], 28, { target: 28 }) +
  K.balloon(VM, P.W("in", 0, 74), [70, 330], 17, { target: 17 }) +
  K.balloon(VM, [-40, 151.15], [70, 410], 13, { target: 13 }) +
  K.balloon(VM, [-62, 104.3], [70, 470], 12, { target: 12 }) +
  K.balloon(VM, [-58, 20], [70, 640], 1, { target: 1 }) +
  K.balloon(VM, [65.3, 250.8], [500, 136], 25, { target: 25 }) +
  K.balloon(VM, P.W("ex", 9.5, P.FLOOR("ex") + 1.4), [500, 228], 20, { target: 20 }) +
  K.balloon(VM, P.W("ex", 6.2, P.FLOOR("ex") + 5), [527, 248], 19, { target: 19 }) +
  K.balloon(VM, [100, P.EXHAUST_C + 12.75], [527, 272], 29, { target: 29 }) +
  K.balloon(VM, P.W("ex", -4.2, P.GUIDE_LOW("ex") + 8), [500, 360], 16, { target: 16 }) +
  K.balloon(VM, P.W("ex", 0, 74), [500, 390], 18, { target: 18 }) +
  liveBalloons;

// A detail circle whose letter sits clear of the drawing, joined to the circle by a thin leader.
function detailMarkOut(V, c, r, letter, [lx, ly]) {
  const [x, y] = V.p(c);
  const R = r * V.k;
  const a = Math.atan2(ly - 4 - y, lx - x);
  const ex = K.r2(x + R * Math.cos(a));
  const ey = K.r2(y + R * Math.sin(a));
  return `<g data-role="label"><circle class="thin mark" cx="${x}" cy="${y}" r="${K.r2(R)}"/><path class="thin" d="M${ex} ${ey}L${K.r2(lx + 8 * Math.cos(a + Math.PI))} ${K.r2(ly - 4)}"/><text class="t t-lg" x="${lx}" y="${ly}" text-anchor="middle">${letter}</text></g>`;
}
const mainMarks =
  detailMarkOut(VM, [C.u, C.v], C.r / k2, "C", [128, 366]) +
  K.viewLabel(VM.p([0, 0])[0], 46, "AXIAL SECTION", "THROUGH CYLINDER AND VALVE AXES · SCALE 1:1");

// ---------------------------------------------------------------- DETAIL C: chamber, valve seats and plug, 2:1
const detailC =
  `<g data-geom="C" clip-path="url(#clip-C)"><circle class="paper" cx="${C.cx}" cy="${C.cy}" r="${C.r}"/>` +
  P.liner(VC, 120) + P.barrel(VC) + P.gasket(VC) + P.head(VC) +
  gasLayer(VC, "C") +
  pistonGroup(VC, "C") +
  valveTrain(VC, "C") +
  P.plug(VC) +
  K.centerline(VC, [P.PLUG_U, 150], [P.PLUG_U, 180], 0) +
  ["in", "ex"].map((key) => K.centerline(VC, P.W(key, 0, 44), P.W(key, 0, 80), 0)).join("") +
  `</g><circle class="thin" cx="${C.cx}" cy="${C.cy}" r="${C.r}"/>` +
  K.balloon(VC, P.W("ex", -10.2, M.VALVES.ex.s0 + 4), [762, 268], 15, { target: 15 }) +
  K.balloon(VC, [P.PLUG_U + 7.5, 176], [762, 236], 27, { target: 27 }) +
  K.viewLabel(C.cx, C.cy + C.r + 18, "DETAIL C", "CHAMBER, SEATS AND PLUG · 2:1");

// ---------------------------------------------------------------- DETAIL B: ring pack, 2:1, riding with the piston
const detailB =
  `<g data-geom="B" clip-path="url(#clip-B)"><rect class="paper" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}"/>` +
  `<g data-role="fluid"><path id="gas-B" class="tint" fill-opacity="0.3" d="${K.d(VB, K.rect(B.u0 - 2, M.COMP_H - 1.2, M.BORE / 2, B.w0 + 2))}"/></g>` +
  P.liner(VB, -40, 60) +
  P.part(12, K.cut(VB, K.rect(32, -40, 40, 60), { mat: "alu", angle: 135 })) +
  P.piston(VB, 0) +
  P.part(5, K.cut(VB, [...K.arc(0, 0, 10.5, 200, -20, 30), [4.4, -30], [-4.4, -30]], { mat: "steel", angle: 135 })) +
  P.gudgeon(VB, 0) +
  K.centerline(VB, [0, -12], [0, 36], 0) +
  `</g><rect class="thin" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10"/>` +
  K.balloon(VB, [27.4, M.COMP_H - 5], [762, 468], 8, { target: 8 }) +
  K.balloon(VB, [27.4, M.COMP_H - 9.1], [762, 498], 9, { target: 9 }) +
  K.balloon(VB, [27.4, M.COMP_H - 12.75], [762, 528], 10, { target: 10 }) +
  K.balloon(VB, [30.1, 4], [762, 566], 11, { target: 11 }) +
  K.balloon(VB, [20, M.COMP_H - 3], [549, 470], 7, { target: 7 }) +
  K.balloon(VB, [-5.7, 1.5], [549, 560], 6, { target: 6 }) +
  K.viewLabel(B.x + B.w / 2, B.y + B.h + 18, "DETAIL B", "RING PACK, RIDING WITH THE PISTON · 2:1");

// ---------------------------------------------------------------- DIAGRAM 1: P–V, log p
const PVC = { x0: 826, x1: 1160, y0: 48, y1: 172, vMax: 150, pMin: 0.5, pMax: 100 };
const pvX = (v) => K.r2(PVC.x0 + (v / PVC.vMax) * (PVC.x1 - PVC.x0));
const pvY = (p) => K.r2(PVC.y1 - (Math.log(Math.max(PVC.pMin, p) / PVC.pMin) / Math.log(PVC.pMax / PVC.pMin)) * (PVC.y1 - PVC.y0));
function pvChart() {
  let grid = "";
  let labels = "";
  for (const p of [0.5, 1, 2, 5, 10, 20, 50, 100]) {
    grid += `M${PVC.x0} ${pvY(p)}H${PVC.x1}`;
    labels += `<text class="t t-sm" x="${PVC.x0 - 5}" y="${K.r2(pvY(p) + 2.7)}" text-anchor="end">${p}</text>`;
  }
  for (let v = 0; v <= PVC.vMax; v += 25) {
    grid += `M${pvX(v)} ${PVC.y0}V${PVC.y1}`;
    labels += `<text class="t t-sm" x="${pvX(v)}" y="${PVC.y1 + 11}" text-anchor="middle">${v}</text>`;
  }
  const loop = CYC.table.map((s) => `${pvX(s.V)},${pvY(s.p)}`).join(" ");
  const tdc = `M${pvX(M.V_CLEAR)} ${PVC.y0}V${PVC.y1}M${pvX(M.V_CLEAR + M.V_SWEPT)} ${PVC.y0}V${PVC.y1}`;
  labels += `<text class="t t-sm t-mute" x="${(PVC.x0 + PVC.x1) / 2}" y="${PVC.y1 + 23}" text-anchor="middle">CYLINDER VOLUME V, cm³</text>`;
  labels += `<text class="t t-sm t-mute" x="797" y="${(PVC.y0 + PVC.y1) / 2}" text-anchor="middle" transform="rotate(-90 797 ${(PVC.y0 + PVC.y1) / 2})">p, bar (LOG)</text>`;
  labels += `<text class="t t-sm" x="${pvX(M.V_CLEAR) + 4}" y="${PVC.y0 + 9}">TDC</text><text class="t t-sm" x="${pvX(M.V_CLEAR + M.V_SWEPT) - 4}" y="${PVC.y0 + 9}" text-anchor="end">BDC</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${PVC.x0}" y="${PVC.y0}" width="${PVC.x1 - PVC.x0}" height="${PVC.y1 - PVC.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="hid" d="${tdc}"/>` +
    `<polyline class="thin" points="${loop}"/>` +
    `<polyline id="pv-now" class="vis accent" points=""/>` +
    `<circle id="pv-dot" class="accent-fill" cx="${PVC.x0}" cy="${PVC.y1}" r="2.6"/>` +
    `<rect class="vis" x="${PVC.x0}" y="${PVC.y0}" width="${PVC.x1 - PVC.x0}" height="${PVC.y1 - PVC.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((PVC.x0 + PVC.x1) / 2, 216, "DIAGRAM 1 · P–V", "ACCENT: THIS CYCLE · THIN: THE COMPUTED CYCLE")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: valve lift and the four strokes
const LC = { x0: 576, x1: 762, y0: 60, y1: 134, lMax: 8 };
const lcX = (phi) => K.r2(LC.x0 + (phi / 720) * (LC.x1 - LC.x0));
const lcY = (l) => K.r2(LC.y1 - (l / LC.lMax) * (LC.y1 - LC.y0));
function liftChart() {
  let grid = "";
  let labels = "";
  for (let l = 0; l <= LC.lMax; l += 2) {
    grid += `M${LC.x0} ${lcY(l)}H${LC.x1}`;
    labels += `<text class="t t-sm" x="${LC.x0 - 5}" y="${K.r2(lcY(l) + 2.7)}" text-anchor="end">${l}</text>`;
  }
  for (let f = 0; f <= 720; f += 180) labels += `<text class="t t-sm" x="${lcX(f)}" y="${LC.y1 + 11}" text-anchor="middle">${f}</text>`;
  let bands = "";
  const names = ["1 INTAKE", "2 COMP.", "3 POWER", "4 EXHAUST"];
  for (let i = 0; i < 4; i++) {
    grid += `M${lcX(i * 180)} ${LC.y0 - 12}V${LC.y1}`;
    bands += `<text class="t t-sm" x="${lcX(i * 180 + 90)}" y="${LC.y0 - 3.5}" text-anchor="middle">${names[i]}</text>`;
  }
  const curve = (key) => {
    const pts = [];
    for (let f = 0; f <= 720; f += 2) pts.push(`${lcX(f)},${lcY(M.valveLift(key, f))}`);
    return pts.join(" ");
  };
  const spark = `M${lcX(M.SPARK)} ${LC.y1}V${LC.y1 - 12}`;
  labels += `<text class="t t-sm t-mute" x="${(LC.x0 + LC.x1) / 2}" y="${LC.y1 + 23}" text-anchor="middle">CRANK ANGLE φ, °</text>`;
  labels += `<text class="t t-sm t-mute" x="557" y="${(LC.y0 + LC.y1) / 2}" text-anchor="middle" transform="rotate(-90 557 ${(LC.y0 + LC.y1) / 2})">LIFT, mm</text>`;
  labels += `<text class="t t-sm" x="${lcX(162)}" y="${lcY(5.6)}">IN</text><text class="t t-sm" x="${lcX(556)}" y="${lcY(5.6)}" text-anchor="end">EX</text>`;
  labels += `<text class="t t-sm" x="${lcX(M.SPARK) - 3}" y="${LC.y1 - 4}" text-anchor="end">IGN</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${LC.x0}" y="${LC.y0 - 12}" width="${LC.x1 - LC.x0}" height="${LC.y1 - LC.y0 + 12}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="thin" d="M${LC.x0} ${LC.y0}H${LC.x1}"/>` +
    `<polyline class="vis" points="${curve("in")}"/>` +
    `<polyline class="hid" points="${curve("ex")}"/>` +
    `<path class="thin" d="${spark}"/>` +
    `<path id="lift-cursor" class="thin" d="M${LC.x0} ${LC.y0 - 12}V${LC.y1}"/>` +
    `<rect class="vis" x="${LC.x0}" y="${LC.y0 - 12}" width="${LC.x1 - LC.x0}" height="${LC.y1 - LC.y0 + 12}"/>` +
    bands +
    labels +
    `</g>` +
    K.viewLabel((LC.x0 + LC.x1) / 2, 186, "DIAGRAM 2 · VALVE LIFT", "FROM THE CAM PROFILES · DASHED: EXHAUST")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "CRANKCASE", "EN AC-46000 (AlSi9Cu3)", "1"],
  ["2", "FLYWHEEL WEB, COUNTERWEIGHTED", "42CrMo4", "2"],
  ["3", "CRANKPIN Ø22", "20MnCr5, CASE HARD.", "1"],
  ["4", "NEEDLE CAGE K 22×28×17", "100Cr6", "1"],
  ["5", "CONNECTING ROD, 98 C/C", "42CrMo4", "1"],
  ["6", "GUDGEON PIN Ø14×Ø9×44", "17Cr3, CASE HARD.", "1"],
  ["7", "PISTON Ø56.5", "AlSi12CuNiMg", "1"],
  ["8", "TOP RING 56.5×1.0", "STEEL, NITRIDED", "1"],
  ["9", "SECOND RING 56.5×1.2, TAPER", "EN-GJL-250", "1"],
  ["10", "OIL RING 56.5×2.0, 3-PIECE", "STEEL", "1"],
  ["11", "CYLINDER LINER Ø56.5×Ø64", "EN-GJL-250", "1"],
  ["12", "CYLINDER BARREL, FINNED", "EN AC-46000", "1"],
  ["13", "HEAD GASKET 0.8", "MLS STEEL", "1"],
  ["14", "CYLINDER HEAD, FINNED", "EN AC-42100 T6", "1"],
  ["15", "VALVE SEAT INSERT", "SINTERED Fe-Cu", "2"],
  ["16", "VALVE GUIDE Ø5.5", "CuNi2Si", "2"],
  ["17", "INLET VALVE Ø22", "X45CrSi9-3", "1"],
  ["18", "EXHAUST VALVE Ø18.5", "X53CrMnNiN21-9", "1"],
  ["19", "VALVE STEM SEAL", "FKM", "2"],
  ["20", "VALVE SPRING, 6 TURNS", "EN 10270-2 Ø2.8", "2"],
  ["21", "SPRING RETAINER", "42CrMo4", "2"],
  ["22", "VALVE COLLET, PAIR", "C15", "2"],
  ["23", "BUCKET TAPPET Ø26 + SHIM", "16MnCr5", "2"],
  ["24", "INLET CAMSHAFT", "EN-GJL CHILLED", "1"],
  ["25", "EXHAUST CAMSHAFT", "EN-GJL CHILLED", "1"],
  ["26", "CAM COVER", "EN AC-46000", "1"],
  ["27", "SPARK PLUG M10×1, 12.7 REACH", "BOUGHT OUT", "1"],
  ["28", "INLET MANIFOLD", "EN AC-46000", "1"],
  ["29", "EXHAUST PIPE Ø27×1.5", "X5CrNi18-10", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const ROW = 15;
const bomTop = TB.y - (18 + BOM.length * ROW);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 30, align: "center", title: "ITEM" },
    { w: 186, title: "DESCRIPTION" },
    { w: 152, title: "MATERIAL" },
    { w: 32, align: "center", title: "QTY" },
  ],
  BOM,
  { rowH: ROW }
);

const T = M.TIMING;
const notes = K.notes(548, 650, "NOTES", [
  `BORE × STROKE ${M.BORE} × ${M.STROKE}; SWEPT ${K.fmt(M.V_SWEPT, 1)} cm³.`,
  `CLEARANCE ${K.fmt(M.V_CLEAR, 1)} cm³; CR ${M.CR.toFixed(2)} : 1.`,
  `CYCLE AT ${M.RPM} rpm, FULL THROTTLE,`,
  `SHOWN 400× SLOWER. PEAK ${K.fmt(CYC.peak, 0)} bar AT ${CYC.peakAt - 360}° ATDC.`,
  `IMEP ${K.fmt(CYC.imep, 1)} bar · ${K.fmt(CYC.power, 1)} kW INDICATED.`,
  `IVO ${K.fmt(T.ivo, 0)}° BTDC · IVC ${K.fmt(T.ivc, 0)}° ABDC.`,
  `EVO ${K.fmt(T.evo, 0)}° BBDC · EVC ${K.fmt(T.evc, 0)}° ATDC.`,
  `IGNITION ${360 - M.SPARK}° BTDC. CAMS AT ½ CRANK.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "125 cc FOUR-STROKE · SECTION", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-002", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:1" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · bar abs · °" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE CRANK · ← → TURN · SPACE RUNS · S SLOW", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="gas-c" patternUnits="userSpaceOnUse" width="3" height="3"><circle class="gas-dot" cx="0.75" cy="0.75" r="0.55"/><circle class="gas-dot" cx="2.25" cy="2.25" r="0.55"/></pattern>` +
  `<pattern id="gas-b" patternUnits="userSpaceOnUse" width="4.4" height="4.4"><circle class="gas-dot" cx="1.1" cy="1.1" r="0.95"/><circle class="gas-dot" cx="3.3" cy="3.3" r="0.95"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-C"><circle cx="${C.cx}" cy="${C.cy}" r="${C.r}"/></clipPath>` +
  `<clipPath id="clip-B"><rect x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-gas-main"><path id="clipgas-main" d=""/></clipPath>` +
  `<clipPath id="clip-gas-C"><path id="clipgas-C" d=""/></clipPath>` +
  `</defs>`;

const hit = `<circle class="hit" data-drag="crank" cx="${crankC[0]}" cy="${crankC[1]}" r="${K.r2(62 * VM.k)}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a 125 cc four-stroke single cut through its cylinder and valve axes. Drag the crank or use the arrow keys to turn it; the piston, rod, cams and valves move, the gas changes, and the P–V diagram traces the cycle." ` +
  `data-views='${JSON.stringify(VIEWS)}' data-live='${JSON.stringify(LIVE_BALLOONS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  mainBalloons +
  mainMarks +
  detailC +
  detailB +
  pvChart() +
  liftChart() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the crank · <kbd>←</kbd> <kbd>→</kbd> turn · <kbd>Space</kbd> run · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "four-stroke.html"), {
  title: "Four-Stroke Engine",
  description: "A live engineering drawing of a 125 cc four-stroke single in section: the crank, piston, cams and valves move, and the cylinder pressure comes from a computed Otto cycle.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#gas-c)}.bp-sheet .tint.burn{fill:url(#gas-b)}.bp-sheet .tint.under{fill:var(--bp-paper);fill-opacity:1}` +
    `.bp-sheet .gas-dot{fill:var(--bp-accent)}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet [data-drag]{cursor:grab}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8")
    .replace("__PV__", JSON.stringify(PVC))
    .replace("__LC__", JSON.stringify(LC))
    .replace("__C__", JSON.stringify(C))
    .replace("__PV0__", String(PV0)),
});
console.log(
  `four-stroke.html  ${(size / 1024).toFixed(0)} KB  CR ${M.CR.toFixed(2)}  peak ${CYC.peak.toFixed(1)} bar at ${CYC.peakAt}°  IMEP ${CYC.imep.toFixed(2)} bar  ${CYC.power.toFixed(2)} kW  eff ${CYC.eff.toFixed(3)}`
);
console.log("timing", Object.entries(T).map(([k, v]) => `${k} ${v.toFixed(1)}`).join("  "), " guide cross", P.GUIDE_LOW("in").toFixed(1), P.GUIDE_LOW("ex").toFixed(1));
