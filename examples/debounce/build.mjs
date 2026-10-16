// Builds debounce.html: a live A2 drawing of an overhead hydraulic door closer, cut through its
// cylinder, with the door and arm in plan. Pushes on the door only restart the closing.
//   node examples/debounce/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as X from "./extra.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PX = K.PX_PER_MM;

// ---------------------------------------------------------------- views
const C = { cx: 165, cy: 432, r: 112, at: [57.6, -23.6] }; // Detail C, 10:1, round
const F = { x: 322, y: 348, w: 232, h: 172, at: [53, 0] }; // Detail F, 5:1, rides with the piston
const VIEWS = {
  main: { x: 410, y: 170, scale: 1 },
  C: { x: C.cx - C.at[0] * 10 * PX, y: C.cy + C.at[1] * 10 * PX, scale: 10 },
  F: { x: F.x + F.w / 2 - F.at[0] * 5 * PX, y: F.y + F.h / 2 + F.at[1] * 5 * PX, scale: 5 },
  B: { x: 698, y: 168, scale: 1 },
  E: { x: 330, y: 766, scale: 1 / 10 },
};
const VM = K.view(VIEWS.main);
const VC = K.view(VIEWS.C);
const VF = K.view(VIEWS.F);
const VE = K.view(VIEWS.E);
const VB = K.view(VIEWS.B);

// ---------------------------------------------------------------- the section, drawn into any view
function oilLayer(V, id) {
  return (
    `<g data-role="fluid" data-part="15">` +
    `<path id="oil-lo-${id}" class="tint" fill-opacity="0.16" d="${P.oilPath(V, P.oilLow(0))}"/>` +
    `<path id="oil-hi-${id}" class="tint" fill-opacity="0.16" d="${P.oilPath(V, P.oilHigh(0))}"/>` +
    `</g>`
  );
}

const flowLines = (V, id) =>
  `<g data-role="fluid"><path id="flow-s-${id}" class="flow" stroke-opacity="0" d="${K.d(V, P.flowSweep(0), false)}"/>` +
  `<path id="flow-l-${id}" class="flow" stroke-opacity="0" d="${K.d(V, P.flowLatch(), false)}"/></g>`;

function staticParts(V) {
  return P.body(V) + P.plugL(V) + P.plugR(V) + P.plugOrings(V) + P.sealBalls(V) + P.screwOrings(V);
}

const screws = (V, id) => `<g id="scr-s-${id}">${P.sweepScrew(V)}</g><g id="scr-l-${id}">${P.latchScrew(V)}</g>`;

function moving(V, id) {
  return `<g id="mv-${id}">${P.piston(V)}${P.pistonRing(V)}<g id="ball-${id}">${P.ball(V, 0)}</g>${P.pin(V)}</g>`;
}

const springG = (V, id) => `<g id="spring-${id}">${P.spring(V, 0)}</g>`;
const pinionG = (V, id) => `<g id="pinion-${id}">${P.pinion(V, 0)}</g>`;

function centrelines(V) {
  return (
    K.centerline(V, [M.PLUG_L - 18, 0], [P.BODY.u1 + 4, 0], 0) +
    K.centerline(V, [-12, 0], [12, 0], 6) +
    K.centerline(V, [0, -18], [0, 18], 0) +
    K.centerline(V, [-178, P.DRILL_V], [P.BODY.u1 + 4, P.DRILL_V], 0) +
    K.centerline(V, [-178, -P.DRILL_V], [P.BODY.u1 + 4, -P.DRILL_V], 0)
  );
}

// ---------------------------------------------------------------- SECTION A-A, 1:1
const xMax = M.X_MAX;
const phantomPiston = (() => {
  const { upper, mid, lower } = P.pistonLoops();
  const sh = (pts) => K.move(pts, -xMax, 0);
  return K.line(VM, sh(K.rect(M.HEAD_L, -20, M.FACE_R, 20)), "phan", true);
})();

const mainView =
  `<g data-geom="main">` +
  oilLayer(VM, "main") +
  staticParts(VM) +
  springG(VM, "main") +
  `<g data-role="phantom">${phantomPiston}</g>` +
  moving(VM, "main") +
  pinionG(VM, "main") +
  screws(VM, "main") +
  flowLines(VM, "main") +
  centrelines(VM) +
  `</g>`;

const dimX = (x) =>
  K.dim(VM, [M.FACE_R, 20], [M.FACE_R - x, 20], { dir: "h", off: -40, text: `x=${x.toFixed(1)}`, id: "dim-x" });

const [bx0, by0] = VM.p([P.BODY.u0, P.BODY.v]);
const mainDims =
  K.dim(VM, [P.BODY.u0, -P.BODY.v], [P.BODY.u1, -P.BODY.v], { dir: "h", off: 54 }) +
  K.dim(VM, [P.BODY.u0, P.BODY.v], [P.BODY.u0, -P.BODY.v], { dir: "v", off: 38 - bx0 }) +
  `<g id="dim-x-wrap">${dimX(0)}</g>`;

const mainBalloons =
  K.balloon(VM, [-173.75, 26], [48, 84], 14, { target: 14 }) +
  K.balloon(VM, [-171, 12], [74, 84], 2, { target: 2 }) +
  K.balloon(VM, [-163.3, 19.2], [100, 84], 4, { target: 4 }) +
  K.balloon(VM, [-157, 15.5], [126, 84], 7, { target: 7 }) +
  K.balloon(VM, [-100, 29.5], [210, 84], 1, { target: 1 }) +
  K.balloon(VM, [-2.5, 2.5], [372, 84], 8, { target: 8 }) +
  K.balloon(VM, [76, P.DRILL_V], [606, 104], 12, { target: 12 }) +
  K.balloon(VM, [76, 12], [606, 132], 3, { target: 3 }) +
  K.balloon(VM, [67.5, -P.DRILL_V - 1.45], [606, 212], 13, { target: 13 }) +
  K.balloon(VM, [76, -P.DRILL_V], [606, 240], 11, { target: 11 }) +
  K.balloon(VM, [65.2, -9], [560, 262], 15, { target: 15 }) +
  `<g id="mvb-main">` +
  K.balloon(VM, [33, -18.3], [468, 272], 5, { target: 5 }) +
  K.balloon(VM, [55, -19.25], [502, 272], 6, { target: 6 }) +
  `</g>`;

const mainMarks =
  (() => {
    const [mx, my] = VM.p(C.at);
    const R = K.r2(5.6 * VM.k);
    return `<g data-role="label"><circle class="thin mark" cx="${mx}" cy="${my}" r="${R}"/><text class="t t-lg" x="${mx}" y="${K.r2(VM.p([0, -P.BODY.v])[1] + 16)}" text-anchor="middle">C</text></g>`;
  })() +
  X.cuttingPlane(VM, [0, P.BODY.v + 5], [0, -P.BODY.v - 5], [-1, 0], "B") +
  K.viewLabel(314, 50, "SECTION A-A", "PLAN SECTION THROUGH THE CYLINDER AXIS · SCALE 1:1");

// ---------------------------------------------------------------- DETAIL C: sweep needle, 10:1
const detailC =
  `<g data-geom="C" clip-path="url(#clip-C)"><circle class="paper" cx="${C.cx}" cy="${C.cy}" r="${C.r}"/>` +
  oilLayer(VC, "C") +
  staticParts(VC) +
  moving(VC, "C") +
  screws(VC, "C") +
  flowLines(VC, "C") +
  centrelines(VC) +
  `</g><circle class="thin" cx="${C.cx}" cy="${C.cy}" r="${C.r}"/>` +
  K.viewLabel(C.cx, C.cy + C.r + 22, "DETAIL C", "SWEEP NEEDLE AND PORT · SCALE 10:1");

// ---------------------------------------------------------------- DETAIL F: check valve, 5:1, in the piston
const detailF =
  `<g data-geom="F" clip-path="url(#clip-F)"><rect class="paper" x="${F.x}" y="${F.y}" width="${F.w}" height="${F.h}"/>` +
  `<g data-role="fluid" data-part="15"><path id="oil-lo-F" class="tint" fill-opacity="0.16" d="${P.oilPath(VF, [K.rect(30, -12, 45.01, 12), K.rect(44.99, -1.25, 50.01, 1.25)])}"/>` +
  `<path id="oil-hi-F" class="tint" fill-opacity="0.16" d="${P.oilPath(VF, [K.rect(50, -2.2, 62.01, 2.2), K.rect(62, -12, 80, 12)])}"/></g>` +
  P.piston(VF) +
  `<g id="ball-F">${P.ball(VF, 0)}</g>` +
  P.pin(VF) +
  K.centerline(VF, [40, 0], [66, 0], 0) +
  K.centerMark(VF, [CHECK().pin, 0], 0.75, 4) +
  `</g><rect class="thin" x="${F.x}" y="${F.y}" width="${F.w}" height="${F.h}" rx="10"/>` +
  K.balloon(VF, [P.ballSeatU + 0.6, 1.2], [F.x + F.w + 22, F.y + 40], 9, { target: 9 }) +
  K.balloon(VF, [CHECK().pin + 0.3, -0.35], [F.x + F.w + 22, F.y + F.h - 40], 10, { target: 10 }) +
  K.viewLabel(F.x + F.w / 2, F.y + F.h + 22, "DETAIL F", "CHECK VALVE IN PISTON 5, RIDING WITH IT · 5:1");
function CHECK() {
  return P.CHECK;
}

// ---------------------------------------------------------------- SECTION B-B: across the spindle, 1:1
const sectionB =
  `<g data-geom="B">` +
  `<g data-role="fluid" data-part="15"><path id="oil-B" class="tint" fill-opacity="0.16" d="${P.oilPath(VB, P.oilB())}"/></g>` +
  P.bodyB(VB) +
  P.pistonB(VB) +
  P.spindleB(VB) +
  P.bearingsB(VB) +
  P.sealsB(VB) +
  K.centerline(VB, [0, -P.SP.top - 2], [0, P.SP.top + 2], 0) +
  K.centerline(VB, [-P.BODY.v - 3, 0], [P.BODY.v + 3, 0], 0) +
  K.centerMark(VB, [-P.DRILL_V, 0], 1.25, 3) +
  K.centerMark(VB, [P.DRILL_V, 0], 1.25, 3) +
  `</g>` +
  X.cuttingPlane(VB, [-P.BODY.v - 2, 0], [P.BODY.v + 2, 0], [0, 1], "A") +
  K.balloon(VB, [-9.5, 32.4], [652, 80], 23, { target: 23 }) +
  K.balloon(VB, [-9.2, -26], [652, 258], 22, { target: 22 }) +
  K.viewLabel(698, 290, "SECTION B-B", "ACROSS THE SPINDLE · 1:1");

// ---------------------------------------------------------------- PLAN E: door and arm, 1:10
const ANG_R = 150;
const angleDim = (theta) => X.angleDim(VE, [0, 0], ANG_R, 180 - theta, 180, `θ=${Math.round(theta)}°`, { id: "dim-theta" });
const PB = [[21, 648], [16, 676], [17, 704], [20, 732], [19, 760]];
const planBalloons = (theta) => {
  const L = M.link(theta);
  const along = (s, e, t) => [s[0] + (e[0] - s[0]) * t, s[1] + (e[1] - s[1]) * t];
  const at = {
    21: P.doorFrame(theta)([330, -22]),
    16: along(L.S, L.E, 0.62),
    17: along(L.E, M.SHOE, 0.5),
    20: [L.E[0] + 2, L.E[1] + 1],
    19: [L.S[0] + 1.5, L.S[1] + 1.5],
  };
  return PB.map(([n, y]) => K.balloon(VE, at[n], [414, y], n, { target: n })).join("");
};
const planView =
  `<g data-geom="E">` +
  `<g data-role="phantom">${K.line(VE, K.rect(-1000, -110, 60, 0), "phan", true)}${P.planPhantom(VE, M.THETA_MAX)}</g>` +
  P.shoe(VE) +
  `<g id="plan-mv">${P.planMoving(VE, 0)}</g>` +
  K.centerMark(VE, [0, 0], 14, 3) +
  `</g>` +
  `<g id="theta-wrap">${angleDim(0)}</g>` +
  `<g id="plan-b">${planBalloons(0)}</g>` +
  K.balloon(VE, [M.SHOE[0] + 15, 4], [414, 790], 18, { target: 18 }) +
  K.viewLabel(230, 802, "PLAN E", "DOOR AND ARM FROM ABOVE · HEAD REMOVED · 1:10");

// ---------------------------------------------------------------- DIAGRAM 1: door angle against time
const CH = { x0: 846, x1: 1160, y0: 50, y1: 236, tMax: 15, aMax: 100 };
const chX = (t) => K.r2(CH.x0 + (t / CH.tMax) * (CH.x1 - CH.x0));
const chY = (a) => K.r2(CH.y1 - (a / CH.aMax) * (CH.y1 - CH.y0));
function chart1() {
  let grid = "";
  let labels = "";
  for (let a = 0; a <= CH.aMax; a += 20) {
    grid += `M${CH.x0} ${chY(a)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 6}" y="${K.r2(chY(a) + 2.7)}" text-anchor="end">${a}</text>`;
  }
  for (let t = 0; t <= CH.tMax; t += 1) {
    grid += `M${chX(t)} ${CH.y0}V${CH.y1}`;
    if (t % 3 === 0) labels += `<text class="t t-sm" x="${chX(t)}" y="${CH.y1 + 11}" text-anchor="middle">${t}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 24}" text-anchor="middle">TIME t, s</text>`;
  labels += `<text class="t t-sm t-mute" x="816" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 816 ${(CH.y0 + CH.y1) / 2})">DOOR θ, °</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="hid" d="M${CH.x0} ${chY(M.LATCH_ZONE)}H${CH.x1}"/>` +
    `<path id="c1-prev" class="thin" d=""/>` +
    `<path id="c1-push" class="vis" d=""/>` +
    `<path id="c1-close" class="vis accent" d=""/>` +
    `<path id="c1-marks" class="head" d=""/>` +
    `<path id="c1-due" class="hid" d=""/>` +
    `<circle id="c1-dot" class="accent-fill" cx="${CH.x0}" cy="${CH.y1}" r="2.6"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 282, "DIAGRAM 1", "▼ PUSH · THICK: HELD · ACCENT: OIL CLOSING · DASHED: LATCH DUE")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: the debounce interval
const D2 = { x0: 636, x1: 760, y0: 336, y1: 478, aMax: 110, tMax: 7 };
const d2X = (a) => K.r2(D2.x0 + (a / D2.aMax) * (D2.x1 - D2.x0));
const d2Y = (t) => K.r2(D2.y1 - (t / D2.tMax) * (D2.y1 - D2.y0));
function chart2() {
  let grid = "";
  let labels = "";
  for (let t = 0; t <= D2.tMax; t += 1) {
    grid += `M${D2.x0} ${d2Y(t)}H${D2.x1}`;
    labels += `<text class="t t-sm" x="${D2.x0 - 6}" y="${K.r2(d2Y(t) + 2.7)}" text-anchor="end">${t}</text>`;
  }
  for (let a = 0; a <= D2.aMax; a += 10) {
    grid += `M${d2X(a)} ${D2.y0}V${D2.y1}`;
    if (a % 50 === 0) labels += `<text class="t t-sm" x="${d2X(a)}" y="${D2.y1 + 11}" text-anchor="middle">${a}</text>`;
  }
  let curve = "";
  for (let a = 0; a <= D2.aMax; a += 1) curve += `${a ? "L" : "M"}${d2X(a)} ${d2Y(M.closeTime(a))}`;
  labels += `<text class="t t-sm t-mute" x="${(D2.x0 + D2.x1) / 2}" y="${D2.y1 + 24}" text-anchor="middle">LEFT AT θ, °</text>`;
  labels += `<text class="t t-sm t-mute" x="${D2.x0 - 28}" y="${(D2.y0 + D2.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${D2.x0 - 28} ${(D2.y0 + D2.y1) / 2})">QUIET NEEDED, s</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${D2.x0}" y="${D2.y0}" width="${D2.x1 - D2.x0}" height="${D2.y1 - D2.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="hid" d="M${d2X(M.LATCH_ZONE)} ${D2.y0}V${D2.y1}"/>` +
    `<path class="vis" d="${curve}"/>` +
    `<circle id="d2-dot" class="accent-fill" cx="${D2.x0}" cy="${D2.y1}" r="2.6"/>` +
    `<rect class="vis" x="${D2.x0}" y="${D2.y0}" width="${D2.x1 - D2.x0}" height="${D2.y1 - D2.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((D2.x0 + D2.x1) / 2 - 8, 526, "DIAGRAM 2", "TIME TO LATCH FROM θ")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "BODY, BORE Ø40", "EN AC-46000 (AlSi9Cu3)", "1"],
  ["2", "END PLUG M42×1.5, SPRING SIDE", "11SMnPb30", "1"],
  ["3", "END PLUG M42×1.5, VALVE SIDE", "11SMnPb30", "1"],
  ["4", "O-RING 37×2", "NBR 70", "2"],
  ["5", "PISTON WITH RACK m2.5", "42CrMo4, RACK HARDENED", "1"],
  ["6", "PISTON RING Ø40×1.5", "PTFE + 25% BRONZE", "1"],
  ["7", "CLOSING SPRING Ø6×Ø37, 14 COILS", "EN 10270-1 SH", "1"],
  ["8", "PINION SPINDLE z10 m2.5", "42CrMo4", "1"],
  ["9", "CHECK BALL Ø4 G10", "100Cr6", "1"],
  ["10", "PIN Ø1.5×10 ISO 8734", "STEEL, HARDENED", "1"],
  ["11", "REGULATING SCREW 1, SWEEP M5×0.5", "CuZn39Pb3", "1"],
  ["12", "REGULATING SCREW 2, LATCH M5×0.5", "CuZn39Pb3", "1"],
  ["13", "O-RING 2.4×0.6", "FKM 75", "2"],
  ["14", "SEALING BALL Ø2.5, PRESSED", "100Cr6", "2"],
  ["15", "HYDRAULIC OIL ISO VG 15", "HV 15", "1"],
  ["16", "MAIN ARM 250", "DC01 PRESSED", "1"],
  ["17", "FOREARM 220", "DC01 PRESSED", "1"],
  ["18", "ARM SHOE", "ZP5 (EN 12844)", "1"],
  ["19", "ARM SCREW M6×16 ISO 4762", "STEEL 8.8", "1"],
  ["20", "ELBOW RIVET Ø8", "C15", "1"],
  ["21", "DOOR LEAF 950×44 (REF.)", "BY OTHERS", "1"],
  ["22", "NEEDLE BEARING HK 1610", "BOUGHT OUT", "2"],
  ["23", "SHAFT SEAL 16×22×3", "NBR 70", "2"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const bomTop = TB.y - (18 + BOM.length * 16);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 30, align: "center", title: "ITEM" },
    { w: 196, title: "DESCRIPTION" },
    { w: 144, title: "MATERIAL" },
    { w: 30, align: "center", title: "QTY" },
  ],
  BOM
);

const fmtBar = (mpa) => K.fmt(mpa * 10, 1);
const notes = K.notes(448, 612, "NOTES", [
  `SPRING 7 DRIVES PISTON 5; OIL EXITS ONLY VIA NEEDLES 11, 12.`,
  `NEEDLE = ORIFICE: Q = Cd·A·√(2p/ρ), Cd ${M.CD}, ρ ${M.RHO} kg/m³.`,
  `p = F/A = ${fmtBar(M.pressure(0))}–${fmtBar(M.pressure(M.X_MAX))} bar. BELOW ${Math.round(M.LATCH_ZONE)}° THE PISTON SHUTS THE SWEEP`,
  `PORT AND ONLY NEEDLE 12 (LATCH) PASSES OIL.`,
  `OPENING, BALL 9 LIFTS AND THE OIL RETURNS FREE.`,
  `EVERY PUSH RESTARTS THE CLOSING: FROM ${M.PUSH_TO}° IT LATCHES ${K.fmt(M.closeTime(M.PUSH_TO), 1)} s AFTER`,
  `THE LAST PUSH, NOT BEFORE.`,
  `CLOSING MOMENT ${K.fmt(M.doorMoment(0), 0)} N·m AT 0° (EN 1154 SIZE 3: ≥ 18 N·m).`,
  `SCREWS, BALLS, ROLLERS AND SPINDLE NOT CUT LENGTHWISE.`,
], 13);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "DOOR CLOSER · SECTION A-A", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-007", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:1" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · bar · s" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · SPACE OR CLICK PUSHES THE DOOR · DRAG IT IN PLAN E · S SLOW", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="oil" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="oil-dot" cx="0.8" cy="0.8" r="0.62"/><circle class="oil-dot" cx="2.4" cy="2.4" r="0.62"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-C"><circle cx="${C.cx}" cy="${C.cy}" r="${C.r}"/></clipPath>` +
  `<clipPath id="clip-F"><rect x="${F.x}" y="${F.y}" width="${F.w}" height="${F.h}" rx="10"/></clipPath>` +
  `</defs>`;

const [hx, hy] = VE.p([0, 0]);
const hit =
  `<rect class="hit" data-drag="plan" x="${K.r2(hx - 200)}" y="${K.r2(hy - 200)}" width="280" height="212"/>` +
  `<rect class="hit" data-push="main" x="${bx0}" y="${by0}" width="${K.r2((P.BODY.u1 - P.BODY.u0) * VM.k)}" height="${K.r2(2 * P.BODY.v * VM.k)}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of an overhead hydraulic door closer cut through its cylinder, with the door and arm in plan. Press Space or click the closer to push the door open; drag the door in the plan. Each push restarts the closing; the door latches only after the pushes stop for long enough." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  mainBalloons +
  mainMarks +
  detailC +
  detailF +
  sectionB +
  planView +
  chart1() +
  chart2() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span><kbd>Space</kbd> or click the closer: push the door · drag the door in plan E · <kbd>R</kbd> shut it · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "debounce.html"), {
  title: "Door Closer Section",
  description: "A live engineering drawing of an overhead hydraulic door closer: oil through two needle valves times the closing, and every push restarts it, which is debounce.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet [data-push]{cursor:pointer}.bp-sheet [data-drag="plan"]{cursor:grab;touch-action:none}` +
    `.bp-sheet .tint{fill:url(#oil)}.bp-sheet .oil-dot{fill:var(--bp-accent)}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}` +
    `.bp-sheet .flow{fill:none;stroke:var(--bp-accent);stroke-width:1.3px;stroke-dasharray:3 4;stroke-linecap:round;stroke-linejoin:round}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "extra.mjs"), "X"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHART1__", JSON.stringify(CH)).replace("__CHART2__", JSON.stringify(D2)).replace("__PB__", JSON.stringify(PB)),
});
console.log(`debounce.html  ${(size / 1024).toFixed(0)} KB  k ${M.K.toFixed(1)} N/mm  x max ${M.X_MAX.toFixed(1)} mm  close from 90° ${M.closeTime(90).toFixed(2)} s  latch zone ${M.LATCH_ZONE.toFixed(1)}°`);
