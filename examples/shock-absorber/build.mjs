// Builds shock-absorber.html: a live A2 drawing of a monotube gas-charged damper, cut through its axis.
//   node examples/shock-absorber/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k2 = 2 * K.PX_PER_MM;
const k5 = 5 * K.PX_PER_MM;

// ---------------------------------------------------------------- views
// Detail B is drawn in the piston's own frame (it rides with it); window s = 5 … 28.5 above the nut.
const B = { x: 266, y: 64, w: 500, h: 237 };
const Ctop = 379.5;
const C = { x: 266, y: 585, w: 170, h: 200 };
const VIEWS = {
  main: { x: 138, y: 772, scale: 1 / 2 },
  B: { x: B.x + B.w / 2, y: B.y + (M.NUT0 + 28.5) * k5, scale: 5 },
  C: { x: C.x + 9 * k2, y: C.y + Ctop * k2, scale: 2 },
  A: { x: 600, y: 682, scale: 2 },
};
const VM = K.view(VIEWS.main);
const VB = K.view(VIEWS.B);
const VC = K.view(VIEWS.C);
const VA = K.view(VIEWS.A);

// ---------------------------------------------------------------- fluids
function fluids(V, id, c = M.C0) {
  return (
    `<g data-role="fluid">` +
    `<path id="gas-${id}" class="tint gas" d="${P.fluidPath(V, P.gas(c))}"/>` +
    `<path id="oil-b-${id}" class="tint" fill-opacity="0.4" d="${P.fluidPath(V, P.oilBelow(c))}"/>` +
    `<path id="oil-a-${id}" class="tint" fill-opacity="0.4" d="${P.fluidPath(V, P.oilAbove(c))}"/>` +
    `</g>`
  );
}

// ---------------------------------------------------------------- main view: AXIAL SECTION, 1:2
const eyeTopY = VM.p([0, M.EYE_TOP0])[1];
const mainView =
  `<g data-geom="main">` +
  fluids(VM, "main") +
  P.eye(VM, 0, 1) +
  P.baseCap(VM) +
  P.fillPlug(VM) +
  P.tube(VM) +
  `<g id="fp-main">${P.floatingPiston(VM)}</g>` +
  P.guide(VM) +
  `<g data-role="phantom">${P.phantomExtended(VM)}</g>` +
  `<g id="mv-main">${P.rodAssembly(VM, { shimsOn: true })}</g>` +
  K.centerline(VM, [0, -24], [0, M.EYE_TOP0 + 24], 0) +
  `</g>`;

const dimL = (c) => K.dim(VM, [20, 0], [20, M.eyeV(c)], { dir: "v", off: 218 - VM.p([20, 0])[0], text: `${Math.round(M.length(c))}`, id: "dim-L" });
const dimC = (c) => K.dim(VM, [20, M.EYE_TOP0], [20, M.eyeV(c)], { dir: "v", off: 240 - VM.p([20, 0])[0], text: `c=${Math.round(c)}`, id: "dim-c" });
const mainDims =
  K.dim(VM, [20, 0], [25, M.TUBE_TOP], { dir: "v", off: 196 - VM.p([20, 0])[0] }) +
  K.dim(VM, [-20, 0], [20, 0], { dir: "h", off: M.EYE_R * VM.k + 12, prefix: "Ø" }) +
  `<g id="dim-L-wrap">${dimL(M.C0)}</g><g id="dim-c-wrap">${dimC(M.C0)}</g>`;

// The cutting plane of SECTION A-A rides with the piston: thin chain, thick ends, arrows looking down.
function planeAA(V, v) {
  const [xl, y] = V.p([-34, v]);
  const [xr] = V.p([34, v]);
  const head = (x) => `<path class="head" d="M${K.r2(x)} ${K.r2(y + 12)}L${K.r2(x - 1.8)} ${K.r2(y + 5)}L${K.r2(x + 1.8)} ${K.r2(y + 5)}Z"/>`;
  return (
    `<g data-role="label">` +
    `<path class="ctr" d="M${K.r2(xl + 7)} ${y}H${K.r2(xr - 7)}"/>` +
    `<path class="vis" d="M${K.r2(xl)} ${y}h8M${K.r2(xr)} ${y}h-8M${K.r2(xl + 0.5)} ${y}v6M${K.r2(xr - 0.5)} ${y}v6"/>` +
    head(xl + 0.5) +
    head(xr - 0.5) +
    `<text class="t t-lg" x="${K.r2(xl - 7)}" y="${K.r2(y + 4)}" text-anchor="middle">A</text>` +
    `<text class="t t-lg" x="${K.r2(xr + 7)}" y="${K.r2(y + 4)}" text-anchor="middle">A</text>` +
    `</g>`
  );
}

// Balloons: static parts on the left below the rod assembly's sweep; the rod assembly's ride with it.
const fpMid = M.FP_BOT0;
const nut0 = M.NUT0;
const mainBalloons =
  K.balloon(VM, [-24, 72], [60, 712], 1, { target: 1 }) +
  K.balloon(VM, [-15, 37], [60, 746], 2, { target: 2 }) +
  K.balloon(VM, [22, 25], [236, 744], 6, { target: 6 }) +
  `<g id="mvb-fp">` +
  K.balloon(VM, [-10, fpMid + 17], [60, 628], 7, { target: 7 }) +
  K.balloon(VM, [-21.6, fpMid + 10], [60, 664], 8, { target: 8 }) +
  `</g>` +
  `<g id="mvb-main">` +
  K.balloon(VM, [-3, M.EYE_TOP0 + 7], [60, 130], 5, { target: 5 }) +
  K.balloon(VM, [-10, M.EYE_TOP0 + 6], [60, 155], 4, { target: 4 }) +
  K.balloon(VM, [-17, M.EYE_TOP0 + 2], [60, 180], 3, { target: 3 }) +
  K.balloon(VM, [-10.5, 548], [60, 222], 24, { target: 24 }) +
  K.balloon(VM, [-30.5, 500], [60, 262], 25, { target: 25 }) +
  K.balloon(VM, [-3.5, 470], [60, 300], 15, { target: 15 }) +
  K.balloon(VM, [-10, nut0 + 55], [60, 405], 17, { target: 17 }) +
  K.balloon(VM, [-9, nut0 + M.S_STOP + 1.5], [60, 440], 16, { target: 16 }) +
  planeAA(VM, nut0 + M.S_PM) +
  K.detailMark(VM, [0, nut0 + M.S_PM], 30, "B", 30) +
  `</g>`;

const mainMarks =
  K.detailMark(VM, [12, 356], 28, "C", -30) +
  K.viewLabel(138, 52, "AXIAL SECTION", "SCALE 1:2");

// ---------------------------------------------------------------- DETAIL B: piston valving, 5:1
const detailB =
  `<g data-geom="B" clip-path="url(#clip-B)"><rect class="paper" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}"/>` +
  `<g data-role="fluid">` +
  `<path id="oil-b-B" class="tint" fill-opacity="0.4" d="${K.d(VB, K.rect(-23, nut0, 23, nut0 + M.S_PM))}"/>` +
  `<path id="oil-a-B" class="tint" fill-opacity="0.4" d="${K.d(VB, K.rect(-23, nut0 + M.S_PM, 23, nut0 + 40))}"/>` +
  `</g>` +
  P.tube(VB, nut0 - 10, nut0 + 40) +
  P.rod(VB, nut0, nut0 + 40) +
  P.piston(VB) +
  `<g id="shim-c-B">${P.shims(VB, nut0, 1, 0)}</g><g id="shim-r-B">${P.shims(VB, nut0, -1, 0)}</g>` +
  P.nutAndWashers(VB) +
  `<g data-role="fluid"><path id="flow-c" class="tint flow" d=""/><path id="flow-r" class="tint flow" d=""/><path id="flow-heads" class="tint flow-head" d=""/></g>` +
  K.centerline(VB, [0, nut0 + 4], [0, nut0 + 30], 0) +
  `</g><rect class="thin" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10"/>` +
  K.balloon(VB, [-19, nut0 + M.S_PM + 2], [330, 47], 9, { target: 9 }) +
  K.balloon(VB, [-6.5, nut0 + M.S_PT + 1.2 + 1], [450, 47], 13, { target: 13 }) +
  K.balloon(VB, [10, nut0 + M.S_PT + 0.45], [650, 47], 11, { target: 11 }) +
  K.balloon(VB, [-6, nut0 + 6], [440, 318], 14, { target: 14 }) +
  K.balloon(VB, [10, nut0 + M.S_PB - 0.45], [630, 318], 12, { target: 12 }) +
  K.balloon(VB, [22.5, nut0 + M.S_PM - 2], [745, 318], 10, { target: 10 }) +
  K.viewLabel(B.x + B.w / 2, 344, "DETAIL B", "VALVING, RIDES WITH IT · 5:1");

// ---------------------------------------------------------------- DETAIL C: rod guide and seals, 2:1
const detailC =
  `<g data-geom="C" clip-path="url(#clip-C)"><rect class="paper" x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}"/>` +
  `<g data-role="fluid"><path id="oil-a-C" class="tint" fill-opacity="0.4" d="${K.d(VC, K.rect(-23, 300, 23, M.GUIDE_BOT + 0.5))}"/></g>` +
  P.tube(VC, 300, M.TUBE_TOP) +
  P.guide(VC) +
  `<g id="mv-C">${P.dustShield(VC)}${P.bumpStop(VC)}${P.rod(VC)}${P.reboundStop(VC)}</g>` +
  K.centerline(VC, [0, 326], [0, 383], 0) +
  `</g><rect class="thin" x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="10"/>` +
  K.balloon(VC, [10.5, M.GUIDE_BOT + 31.5], [456, 600], 21, { target: 21 }) +
  K.balloon(VC, [22.5, M.GUIDE_TOP + 0.9], [456, 628], 23, { target: 23 }) +
  K.balloon(VC, [11, M.GUIDE_BOT + 22], [456, 656], 20, { target: 20 }) +
  K.balloon(VC, [16, M.GUIDE_BOT + 12], [456, 690], 18, { target: 18 }) +
  K.balloon(VC, [21.75, M.GUIDE_BOT + 6], [456, 718], 22, { target: 22 }) +
  K.balloon(VC, [8, M.GUIDE_BOT + 5], [456, 746], 19, { target: 19 }) +
  K.viewLabel(C.x + C.w / 2, 801, "DETAIL C", "ROD GUIDE · SCALE 2:1");

// ---------------------------------------------------------------- SECTION A-A: across the piston, 2:1
const sectionA =
  `<g data-geom="A">${P.sectionAA(VA)}</g>` +
  K.dim(VA, [-25, 0], [25, 0], { dir: "h", off: -(25 * VA.k + 12), prefix: "Ø" }) +
  K.viewLabel(VIEWS.A.x, 798, "SECTION A-A", "PISTON MID-PLANE · SCALE 2:1");

// ---------------------------------------------------------------- DIAGRAM 1: force against velocity
const CH = { x0: 314, x1: 534, y0: 376, y1: 496, vMax: 1.5, fMin: -1.5, fMax: 2.5 };
const fx = (v) => K.r2(CH.x0 + ((v + CH.vMax) / (2 * CH.vMax)) * (CH.x1 - CH.x0));
const fy = (F) => K.r2(CH.y1 - ((F / 1000 - CH.fMin) / (CH.fMax - CH.fMin)) * (CH.y1 - CH.y0));
function chartFV() {
  let grid = "";
  let labels = "";
  for (let F = CH.fMin; F <= CH.fMax + 1e-9; F += 0.5) {
    grid += `M${CH.x0} ${fy(F * 1000)}H${CH.x1}`;
    if (Math.abs(F % 1) < 1e-9) labels += `<text class="t t-sm" x="${CH.x0 - 5}" y="${K.r2(fy(F * 1000) + 2.7)}" text-anchor="end">${F}</text>`;
  }
  for (let v = -CH.vMax; v <= CH.vMax + 1e-9; v += 0.25) {
    grid += `M${fx(v)} ${CH.y0}V${CH.y1}`;
    if (Math.abs((v * 2) % 1) < 1e-9) labels += `<text class="t t-sm" x="${fx(v)}" y="${CH.y1 + 10}" text-anchor="middle">${v}</text>`;
  }
  let on = "";
  for (let v = -CH.vMax; v <= CH.vMax + 1e-9; v += 0.02) on += `${on ? "L" : "M"}${fx(v)} ${fy(M.damperForce(v))}`;
  const off = `M${fx(-CH.vMax)} ${fy(M.damperForce(-CH.vMax, false))}L${fx(CH.vMax)} ${fy(M.damperForce(CH.vMax, false))}`;
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 21}" text-anchor="middle">v, m/s · COMPRESSION − / REBOUND +</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x0 - 22}" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH.x0 - 22} ${(CH.y0 + CH.y1) / 2})">DAMPER F, kN</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="thin" d="M${fx(0)} ${CH.y0}V${CH.y1}M${CH.x0} ${fy(0)}H${CH.x1}"/>` +
    `<path class="vis" d="${on}"/><path class="hid" d="${off}"/>` +
    `<polyline id="fv-trail" class="vis accent" points=""/>` +
    `<circle id="fv-dot" class="accent-fill" cx="${fx(0)}" cy="${fy(0)}" r="2.8"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 535, "DIAGRAM 1", "F–v · ACCENT: NOW · DASHED: VALVES BYPASSED")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: body and road against time
const CT = { x0: 820, x1: 1160, y0: 50, y1: 168, tMax: 5, zMin: -50, zMax: 75 };
function chartZT() {
  const tx = (t) => K.r2(CT.x0 + (t / CT.tMax) * (CT.x1 - CT.x0));
  const zy = (z) => K.r2(CT.y1 - ((z - CT.zMin) / (CT.zMax - CT.zMin)) * (CT.y1 - CT.y0));
  let grid = "";
  let labels = "";
  for (let z = CT.zMin; z <= CT.zMax; z += 25) {
    grid += `M${CT.x0} ${zy(z)}H${CT.x1}`;
    labels += `<text class="t t-sm" x="${CT.x0 - 5}" y="${K.r2(zy(z) + 2.7)}" text-anchor="end">${z}</text>`;
  }
  for (let t = 0; t <= CT.tMax; t += 0.5) {
    grid += `M${tx(t)} ${CT.y0}V${CT.y1}`;
    if (t % 1 === 0) labels += `<text class="t t-sm" x="${tx(t)}" y="${CT.y1 + 10}" text-anchor="middle">${t}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CT.x0 + CT.x1) / 2}" y="${CT.y1 + 21}" text-anchor="middle">TIME SINCE THE PASS BEGAN t, s</text>`;
  labels += `<text class="t t-sm t-mute" x="${CT.x0 - 27}" y="${(CT.y0 + CT.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CT.x0 - 27} ${(CT.y0 + CT.y1) / 2})">z, mm</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CT.x0}" y="${CT.y0}" width="${CT.x1 - CT.x0}" height="${CT.y1 - CT.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="thin" d="M${CT.x0} ${zy(0)}H${CT.x1}"/>` +
    `<polyline id="zt-road" class="hid" points=""/>` +
    `<polyline id="zt-prev" class="thin" points=""/>` +
    `<polyline id="zt-now" class="vis accent" points=""/>` +
    `<circle id="zt-dot" class="accent-fill" cx="${CT.x0}" cy="${zy(0)}" r="2.6"/>` +
    `<rect class="vis" x="${CT.x0}" y="${CT.y0}" width="${CT.x1 - CT.x0}" height="${CT.y1 - CT.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CT.x0 + CT.x1) / 2, 206, "DIAGRAM 2", "BODY z · ACCENT: THIS PASS · THIN: LAST PASS · DASHED: ROAD")
  );
}

// ---------------------------------------------------------------- DIAGRAM 3: the quarter car
const s0 = M.car();
const diagramQC =
  `<g data-role="chart" id="qc">${P.quarterCar(s0)}</g>` +
  K.viewLabel(P.QC.x - 2, 535, "DIAGRAM 3", "QUARTER CAR · NOT TO SCALE");

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "PRESSURE TUBE Ø50×2", "E355+SR EN 10305-2", "1"],
  ["2", "BASE CAP", "C22E", "1"],
  ["3", "EYE RING Ø40×4", "S355J2", "2"],
  ["4", "EYE BUSH Ø32/Ø16×40", "NR 60 ShA", "2"],
  ["5", "INNER SLEEVE Ø16×2×40", "E235+C", "2"],
  ["6", "GAS FILL PLUG Ø4", "NBR 90", "1"],
  ["7", "FLOATING PISTON Ø46", "EN AW-6082 T6", "1"],
  ["8", "O-RING 40×3 ISO 3601-1", "FKM 75", "1"],
  ["9", "PISTON Ø46×12, 3+3 PORTS", "SINTERED SINT-D11", "1"],
  ["10", "PISTON BAND 46×8×1", "PTFE + 25% BRONZE", "1"],
  ["11", "COMPRESSION SHIM Ø34–Ø20×0.3", "C75S 1.1248", "4"],
  ["12", "REBOUND SHIM Ø34–Ø20×0.3", "C75S 1.1248", "5"],
  ["13", "CLAMP WASHER Ø16×Ø10.2×2", "C45 QT", "2"],
  ["14", "HEX NUT M10×1 ISO 8673", "STEEL 8", "1"],
  ["15", "PISTON ROD Ø14, M10×1 POST", "42CrMo4 + HARD Cr", "1"],
  ["16", "REBOUND STOP RING Ø22", "C45", "1"],
  ["17", "REBOUND BUFFER Ø25×12", "PU 90 ShA", "1"],
  ["18", "ROD GUIDE", "EN AW-6082 T6", "1"],
  ["19", "GUIDE BUSHING Ø14×Ø18×14", "STEEL/CuSn/PTFE", "1"],
  ["20", "ROD SEAL Ø14×Ø26×8", "FKM 80", "1"],
  ["21", "DUST WIPER Ø14×Ø24", "PU 92 ShA", "1"],
  ["22", "O-RING 41×2.5 ISO 3601-1", "NBR 70", "1"],
  ["23", "RETAINING RING DIN 472-46", "C75S", "1"],
  ["24", "BUMP STOP Ø32×43", "PU MICROCELLULAR", "1"],
  ["25", "DUST SHIELD Ø62×1", "DC04", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const rowH = 14;
const bomTop = TB.y - (18 + BOM.length * rowH);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 32, align: "center", title: "ITEM" },
    { w: 206, title: "DESCRIPTION" },
    { w: 130, title: "MATERIAL" },
    { w: 32, align: "center", title: "QTY" },
  ],
  BOM,
  { rowH }
);

const notes = K.notes(790, 236, "NOTES", [
  `OIL ISO VG 15. N₂ ${M.P_GAS0} bar abs AT FULL EXTENSION, POLYTROPIC n = ${M.N_POLY}.`,
  `GAS FORCE (p − p_atm)·A_rod: ${K.fmt(M.gasForce(0), 0)} N EXTENDED, ${K.fmt(M.gasForce(M.STROKE), 0)} N AT FULL BUMP.`,
  `ROD DISPLACES ${K.fmt(M.A_ROD, 0)} mm³/mm; FLOATING PISTON 7 MOVES ${K.fmt(M.FP_RATIO, 3)} × ROD TRAVEL.`,
  `ALIGNED SECTION: RIGHT PORT COMPRESSION, LEFT REBOUND. BLEED NOTCH IN 1ST SHIM.`,
  `QUARTER CAR f = ${K.fmt(M.fBody, 2)} Hz: A 2ND-ORDER LOW-PASS FILTER ON THE ROAD.`,
  `ROD, NUT, WASHERS NOT CUT. SHIM LIFT TRUE TO SCALE IN DETAIL B.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "MONOTUBE DAMPER · SECTION", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-013", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:2" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · N · bar abs" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE ROD EYE · SPACE: A BUMP · D: DAMPING ON/OFF · S: SLOW", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="oil" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="oil-dot" cx="0.8" cy="0.8" r="0.62"/><circle class="oil-dot" cx="2.4" cy="2.4" r="0.62"/></pattern>` +
  `<pattern id="gasdots" patternUnits="userSpaceOnUse" width="6" height="6"><circle class="gas-dot" cx="1.5" cy="1.5" r="0.5"/><circle class="gas-dot" cx="4.5" cy="4.5" r="0.5"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-B"><rect x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-C"><rect x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="10"/></clipPath>` +
  `</defs>`;

const hit =
  `<rect class="hit" data-drag="main" x="${VM.p([-40, 0])[0]}" y="100" width="${K.r2(80 * VM.k)}" height="${K.r2(VM.p([0, 260])[1] - 100)}"/>` +
  `<rect class="hit" data-drag="C" x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a monotube gas-charged shock absorber cut through its axis. A quarter car drives over a speed hump; the rod strokes, the shims bend, the oil flows through the piston ports and the charts trace force against velocity and body movement against time. Drag the rod eye or use the arrow keys to stroke it by hand; D switches the damping off." ` +
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
  sectionA +
  chartFV() +
  chartZT() +
  diagramQC +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the rod eye · <kbd>↑</kbd> <kbd>↓</kbd> stroke · <kbd>Space</kbd> drive over a hump · <kbd>D</kbd> damping on/off · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "shock-absorber.html"), {
  title: "Monotube Damper Section",
  description: "A live engineering drawing of a gas-charged monotube shock absorber: a quarter car drives over a hump, the shims lift, the oil flows through the piston and the body's motion is smoothed.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#oil)}.bp-sheet .tint.gas{fill:url(#gasdots)}.bp-sheet .oil-dot{fill:var(--bp-accent)}.bp-sheet .gas-dot{fill:var(--bp-muted)}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}` +
    `.bp-sheet .tint.flow{fill:none;stroke:var(--bp-accent);stroke-width:1.6px;stroke-dasharray:5 3.5;stroke-linecap:butt;stroke-linejoin:round}.bp-sheet .tint.flow-head{fill:var(--bp-accent)}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHARTS__", JSON.stringify({ CH, CT })),
});
console.log(`shock-absorber.html  ${(size / 1024).toFixed(0)} KB  gas ${M.V_GAS0.toFixed(1)} cm³  p ${M.pGas(0).toFixed(1)}→${M.pGas(M.STROKE).toFixed(1)} bar  f ${M.fBody.toFixed(2)} Hz`);
