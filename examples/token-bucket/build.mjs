// Builds token-bucket.html: a live A2 drawing of a WC cistern working as a token bucket.
//   node examples/token-bucket/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k25 = K.PX_PER_MM / 2.5;
const k2 = 2 * K.PX_PER_MM;

// ---------------------------------------------------------------- views
const B = { cx: 630, cy: 152, r: 105, u: -148, v: 222 }; // detail B: jet, diaphragm and cam, 2:1
const D = { x: 529, y: 300, w: 202, h: 202, u0: 105, v1: 47 }; // detail D: the drop valve seat, 1:1
const VIEWS = {
  main: { x: 265, y: 341, scale: 1 / 2.5 },
  B: { x: B.cx - B.u * k2, y: B.cy + B.v * k2, scale: 2 },
  D: { x: D.x - D.u0 * K.PX_PER_MM, y: D.y + D.v1 * K.PX_PER_MM, scale: 1 },
  C: { x: 976, y: 118, scale: 1 / 2.5 },
};
const VM = K.view(VIEWS.main);
const VB = K.view(VIEWS.B);
const VD = K.view(VIEWS.D);
const VC = K.view(VIEWS.C);

const L_SHOT = M.L_FULL;
const deg0 = P.armAngle(L_SHOT);

// ---------------------------------------------------------------- layers shared by the section and the details
function waterLayer(V, id) {
  return (
    `<g data-role="fluid">` +
    `<path id="water-${id}" class="water tint" d="${K.d(V, P.tankWater(L_SHOT))}"/>` +
    `<path class="dry tint" id="dry-o-${id}" d="${K.d(V, P.outletBore)}"/>` +
    `<path class="dry tint" id="dry-t-${id}" d="${K.d(V, P.tubeBore(0))}"/>` +
    `<path id="flow-o-${id}" class="water tint" fill-opacity="0" d="${K.d(V, P.outletBore)}"/>` +
    `<path id="flow-t-${id}" class="water tint" fill-opacity="0" d="${K.d(V, P.tubeBore(0))}"/>` +
    `<path id="stream-${id}" class="water tint" fill-opacity="0" d="${K.d(V, P.stream(L_SHOT))}"/>` +
    `<path id="chamber-${id}" class="water tint" fill-opacity="0" d="${K.d(V, P.chamberWater)}"/>` +
    `<path class="water tint" d="${K.d(V, P.inletBore)}"/>` +
    `<path id="surf-${id}" class="vis accent" d="${K.d(V, [[-P.IN, L_SHOT], [P.IN, L_SHOT]], false)}"/>` +
    `</g>`
  );
}


function fillValve(V, id) {
  return (
    P.valveBody(V) +
    P.nozzle(V) +
    P.backnutG12(V) +
    P.tankWashers(V) +
    P.cap(V) +
    `<g id="diaph-${id}">${P.diaphragm(V, 0)}</g>` +
    `<g id="plunger-${id}">${P.plunger(V, 0)}</g>` +
    P.shroud(V)
  );
}

function flushStatic(V) {
  return P.housing(V) + P.seatWasher(V) + P.backnutG2(V) + P.doughnut(V) + P.collar(V);
}

function plugGroup(V, id) {
  return `<g id="plug-${id}">${P.plug(V)}${P.seal(V)}${P.bridge(V)}${P.rod(V)}${P.knob(V)}</g>`;
}

const armGroup = (V, id) => `<g id="arm-${id}" transform="rotate(${K.r2(-deg0)} ${V.p(P.PIVOT).join(" ")})">${P.arm(V)}${P.ball(V)}</g>`;

// The water-level symbol: an inverted triangle on the surface with two short lines under it,
// drawn at v = 0 and moved to the level.
function levelSymbol(V, u) {
  const [x, y] = V.p([u, 0]);
  return `<path class="head" d="M${x} ${y}L${K.r2(x - 4)} ${K.r2(y - 6)}L${K.r2(x + 4)} ${K.r2(y - 6)}Z"/><path class="thin" d="M${K.r2(x - 5)} ${K.r2(y + 2.5)}H${K.r2(x + 5)}M${K.r2(x - 3)} ${K.r2(y + 5)}H${K.r2(x + 3)}"/>`;
}

// ---------------------------------------------------------------- main view: SECTION A-A
const supplyPhantom = K.line(VM, K.rect(-254, P.VA - 12, -232, P.VA + 12), "phan", true);
const mainView =
  `<g data-geom="main">` +
  waterLayer(VM, "main") +
  P.cistern(VM) +
  P.lid(VM) +
  P.lidBush(VM) +
  fillValve(VM, "main") +
  flushStatic(VM) +
  `<g id="dose-main" transform="translate(0 ${K.r2(-M.dFloat(L_SHOT) * VM.k)})">${P.doseFloat(K.view({ ...VIEWS.main }))}</g>` +
  plugGroup(VM, "main") +
  `<g data-role="phantom">${P.armPhantom(VM)}${P.knobPhantom(VM)}${P.panPhantom(VM)}${supplyPhantom}</g>` +
  armGroup(VM, "main") +
  P.pin(VM) +
  P.tokenMarks(VM) +
  `<g data-role="fluid"><g id="wl-main" transform="translate(0 ${K.r2(-L_SHOT * VM.k)})">${levelSymbol(VM, -140)}</g></g>` +
  K.centerline(VM, [P.UF, -76], [P.UF, P.KNOB_V + 20 + M.LIFT], 0) +
  K.centerline(VM, [-254, P.VA], [-132, P.VA], 0) +
  `</g>`;

// The level, measured inside the tank from the floor to the water.
const DIM_U = -118;
const dimLevel = (L) => K.dim(VM, [DIM_U, 0], [DIM_U, L], { dir: "v", off: 0, text: `L=${Math.round(L)}`, id: "dim-level" });

const mainDims =
  K.dim(VM, [-P.OUT, -P.FLOOR_T], [P.OUT, -P.FLOOR_T], { dir: "h", off: 412 - VM.p([0, -P.FLOOR_T])[1] }) +
  K.dim(VM, [-P.OUT - 3, M.RIM + P.LID_T], [-P.OUT, -P.FLOOR_T], { dir: "v", off: 36 - VM.p([-P.OUT - 3, 0])[0] }) +
  K.dim(VM, [-232, P.VA], [-P.OUT, -P.FLOOR_T], { dir: "v", off: 56 - VM.p([-232, 0])[0] }) +
  `<g id="dim-level-wrap">${dimLevel(L_SHOT)}</g>`;

// Balloons on moving parts are redrawn each frame (their dots ride with the parts); see live.js.
const mainBalloons =
  K.balloon(VM, [P.UF + 11, M.RIM + P.LID_T + 1.5], [478, 116], 25, { target: 25 }) +
  K.balloon(VM, [170, M.RIM + 8], [478, 140], 2, { target: 2 }) +
  K.balloon(VM, [195, 40], [478, 306], 1, { target: 1 }) +
  K.balloon(VM, [P.UF + 35, M.STOP_V - 2], [478, 276], 22, { target: 22 }) +
  K.balloon(VM, [-209, P.VA + 14], [74, 96], 5, { target: 5 }) +
  K.balloon(VM, [-188.5, P.VA + 14], [100, 96], 6, { target: 6 }) +
  `<g id="mvb-main"></g>`;

// A rectangular detail mark (the kit's mark is a circle): thin rounded box, letter at a corner.
function detailBox(V, u0, v0, u1, v1, letter) {
  const [x0, y0] = V.p([u0, v1]);
  const [x1, y1] = V.p([u1, v0]);
  return `<g data-role="label"><rect class="thin mark" x="${x0}" y="${y0}" width="${K.r2(x1 - x0)}" height="${K.r2(y1 - y0)}" rx="5"/><text class="t t-lg" x="${K.r2(x1 + 8)}" y="${K.r2(y1 + 4)}" text-anchor="middle">${letter}</text></g>`;
}

const mainMarks =
  K.detailMark(VM, [B.u, B.v], B.r / k2, "B", 60) +
  detailBox(VM, D.u0, D.v1 - 100, D.u0 + 100, D.v1, "D") +
  K.viewArrow(VM, [-150, M.RIM + P.LID_T], [0, 1], "C") +
  K.viewLabel(245, 46, "SECTION A-A", "SCALE 1:2.5");

// ---------------------------------------------------------------- DETAIL B: fill valve, 2:1
const detailB =
  `<g data-geom="B" clip-path="url(#clip-B)"><circle class="sheet-bg" cx="${B.cx}" cy="${B.cy}" r="${B.r}"/>` +
  waterLayer(VB, "B") +
  P.cistern(VB) +
  P.lid(VB) +
  fillValve(VB, "B") +
  `<g data-role="phantom">${K.line(VB, K.rect(-254, P.VA - 12, -232, P.VA + 12), "phan", true)}</g>` +
  armGroup(VB, "B") +
  P.pin(VB) +
  K.centerline(VB, [-232, P.VA], [-124, P.VA], 0) +
  `</g><circle class="thin" cx="${B.cx}" cy="${B.cy}" r="${B.r}"/>` +
  K.dim(VB, [-156, P.VA + 1.75], [-156, P.VA - 1.75], { dir: "v", off: -6 * k2, prefix: "Ø" }) +
  K.balloon(VB, [-158, P.VA + 15], [512, 60], 3, { target: 3 }) +
  K.balloon(VB, [-160, P.VA + 3], [512, 120], 4, { target: 4 }) +
  K.balloon(VB, [-151, P.VA + 16], [758, 58], 7, { target: 7 }) +
  K.balloon(VB, [-145, P.VA + 16], [758, 84], 8, { target: 8 }) +
  K.balloon(VB, [-165.2, 206], [512, 228], 13, { target: 13 }) +
  K.balloon(VB, [P.PIVOT[0], P.PIVOT[1]], [758, 200], 10, { target: 10 }) +
  `<g id="mvb-B"></g>` +
  K.viewLabel(B.cx, B.cy + B.r + 18, "DETAIL B", "FILL VALVE, JET Ø3.5 · SCALE 2:1");

// ---------------------------------------------------------------- DETAIL D: drop valve seat, 2:1
const detailD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>` +
  waterLayer(VD, "D") +
  P.cistern(VD) +
  flushStatic(VD) +
  `<g id="plugD">${P.plug(VD)}${P.seal(VD)}</g>` +
  `<g data-role="phantom">${P.panPhantom(VD)}</g>` +
  K.centerline(VD, [P.UF, -52], [P.UF, 48], 0) +
  `</g><rect class="thin" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/>` +
  K.balloon(VD, [P.UF + 44, 6], [758, 366], 15, { target: 15 }) +
  K.balloon(VD, [P.UF + 41, 1.5], [758, 392], 16, { target: 16 }) +
  K.balloon(VD, [P.UF + 38, -18], [758, 428], 17, { target: 17 }) +
  K.balloon(VD, [P.UF + 52, -30], [758, 462], 18, { target: 18 }) +
  `<g id="mvb-D"></g>` +
  K.viewLabel(D.x + D.w / 2, D.y + D.h + 18, "DETAIL D", "DROP VALVE SEAT, LIFT 24 · SCALE 1:1");

// ---------------------------------------------------------------- VIEW C: plan, lid removed, 1:2.5
function cuttingPlane(V) {
  const [x0, y] = V.p([-236, 0]);
  const [x1] = V.p([224, 0]);
  const arrow = (x) => `<path class="head" d="M${x} ${K.r2(y - 20)}L${K.r2(x - 2.2)} ${K.r2(y - 12)}L${K.r2(x + 2.2)} ${K.r2(y - 12)}Z"/><path class="vis" d="M${x} ${y}V${K.r2(y - 12)}"/>`;
  return (
    `<g data-role="label">` +
    `<path class="ctr" d="M${x0} ${y}H${x1}"/>` +
    `<path class="vis cut-plane" d="M${x0} ${y}H${K.r2(x0 + 10)}M${K.r2(x1 - 10)} ${y}H${x1}"/>` +
    arrow(x0) +
    arrow(x1) +
    `<text class="t t-lg" x="${K.r2(x0 + 9)}" y="${K.r2(y - 14)}" text-anchor="start">A</text>` +
    `<text class="t t-lg" x="${K.r2(x1 - 9)}" y="${K.r2(y - 14)}" text-anchor="end">A</text>` +
    `</g>`
  );
}

const viewC =
  `<g data-geom="C">` +
  `<g data-role="fluid"><path id="water-C" class="water tint" d="${K.d(VC, K.rrect(-P.IN, -M.IN_W / 2, P.IN, M.IN_W / 2, 5, 4))}"/></g>` +
  P.planStatic(VC) +
  `<g id="planarm-C">${P.planArm(VC, deg0)}</g>` +
  P.planFlush(VC) +
  K.centerMark(VC, [P.UF, 0], 46, 4) +
  K.centerline(VC, [P.UF, -62], [P.UF, 62], 12) +
  `</g>` +
  cuttingPlane(VC) +
  K.balloon(VC, [P.UF + 5, 62 + 3], [1160, 54], 14, { target: 14 }) +
  K.viewLabel(976, 212, "VIEW C", "LID 2 REMOVED · SCALE 1:2.5");

// ---------------------------------------------------------------- DIAGRAM 1: tokens against time
const CH = { x0: 96, x1: 726, y0: 586, y1: 752, tMax: 120, kMax: 5, strip: 572 };
const chX = (t) => K.r2(CH.x0 + (t / CH.tMax) * (CH.x1 - CH.x0));
const chY = (k) => K.r2(CH.y1 - (k / CH.kMax) * (CH.y1 - CH.y0));
function chart() {
  let grid = "";
  let labels = "";
  for (let k = 0; k <= CH.kMax; k++) {
    grid += `M${CH.x0} ${chY(k)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 6}" y="${K.r2(chY(k) + 2.7)}" text-anchor="end">${k}</text>`;
    if (k) labels += `<text class="t t-sm t-mute" x="${CH.x1 + 5}" y="${K.r2(chY(k) + 2.7)}">${Math.round(M.levelOf(k))}</text>`;
  }
  for (let t = 0; t <= CH.tMax; t += 10) {
    grid += `M${chX(t)} ${CH.y0}V${CH.y1}`;
    labels += `<text class="t t-sm" x="${chX(t)}" y="${CH.y1 + 11}" text-anchor="middle">${t}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 24}" text-anchor="middle">TIME t, s (MODEL CLOCK)</text>`;
  const ym = (CH.y0 + CH.y1) / 2;
  labels += `<text class="t t-sm t-mute" x="70" y="${ym}" text-anchor="middle" transform="rotate(-90 70 ${ym})">TOKENS IN TANK</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x0 - 6}" y="${CH.strip + 2.7}" text-anchor="end">REQ</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x1 + 5}" y="${CH.strip + 2.7}">L, mm</text>`;
  const yCap = chY(M.CAP);
  const yOne = chY(1);
  const yCrest = chY(M.tokens(M.CREST));
  labels += `<text class="t t-sm t-mute" x="${CH.x1 - 4}" y="${K.r2(yCap - 3)}" text-anchor="end">CAPACITY, FLOAT VALVE SHUT</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x1 - 4}" y="${K.r2(yCrest + 9)}" text-anchor="end">OVERFLOW CREST</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x1 - 4}" y="${K.r2(yOne - 3)}" text-anchor="end">ONE TOKEN: BELOW IT A PULL IS REFUSED</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="hid" d="M${CH.x0} ${yCap}H${CH.x1}M${CH.x0} ${yOne}H${CH.x1}"/>` +
    `<path class="phan" d="M${CH.x0} ${yCrest}H${CH.x1}"/>` +
    `<path class="thin" d="M${CH.x0} ${CH.strip - 7}H${CH.x1}M${CH.x0} ${CH.strip + 7}H${CH.x1}"/>` +
    `<polyline id="trace-prev" class="thin" points=""/>` +
    `<polyline id="trace-now" class="vis accent" points=""/>` +
    `<g id="chart-marks"></g>` +
    `<circle id="chart-dot" class="accent-fill" cx="${CH.x0}" cy="${chY(M.CAP)}" r="2.6"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 790, "DIAGRAM 1", "ACCENT: WATER = TOKENS · ● ACCEPTED · × REFUSED · THIN: LAST CYCLE")
  );
}

// ---------------------------------------------------------------- TABLE 1: the analogy, row by row
function analogy(x, y) {
  const cols = [
    { w: 118, title: "TOKEN BUCKET" },
    { w: 226, title: "CISTERN" },
    { w: 116, title: "VALUE" },
  ];
  const rows = [
    ["BUCKET SIZE b", "LEVEL L0 TO FLOAT SHUT-OFF", `${M.CAP} TOKENS = ${M.CAP * M.DOSE} L`],
    ["ONE TOKEN", `ONE DOSE, ${K.fmt(M.TOKEN_H, 1)} mm OF LEVEL`, `${M.DOSE} L`],
    ["REFILL RATE r", `JET 4, Ø${M.JET_D} AT ${M.P_MAINS} bar, LEVEL-FREE`, `${K.fmt(M.RATE, 3)} TOKEN/s`],
    ["REQUEST", "A PULL ON KNOB 26", "TAKES 1 TOKEN"],
    ["REJECT (HTTP 429)", "DOSE FLOAT 21 ON STOP 22, KNOB LOCKED", "BELOW 1 TOKEN"],
    ["TOKENS ABOVE b LOST", "FLOAT SHUTS; TUBE 19 OVERFLOWS IF HELD", `CREST ${M.CREST}`],
  ];
  const rowH = 14;
  const headH = 16;
  const w = cols.reduce((a, c) => a + c.w, 0);
  const h = headH + rows.length * rowH;
  let rules = `M${x} ${y + headH}H${x + w}`;
  let text = "";
  let cx = x;
  for (const [i, c] of cols.entries()) {
    if (i) rules += `M${cx} ${y}V${y + h}`;
    text += `<text class="t t-sm t-head" x="${cx + 4}" y="${y + headH - 5}">${c.title}</text>`;
    rows.forEach((r, j) => (text += `<text class="t t-sm" x="${cx + 4}" y="${y + headH + j * rowH + rowH - 4.4}">${r[i]}</text>`));
    cx += c.w;
  }
  for (let j = 1; j < rows.length; j++) rules += `M${x} ${y + headH + j * rowH}H${x + w}`;
  return (
    `<g data-role="notes"><rect class="paper" x="${x}" y="${y}" width="${w}" height="${h}"/><path class="thin" d="${rules}"/><rect class="vis" x="${x}" y="${y}" width="${w}" height="${h}"/>${text}` +
    `<text class="t t-sm t-head" x="${x}" y="${y - 6}">TABLE 1 · TOKEN BUCKET ↔ CISTERN</text></g>`
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "CISTERN BODY 380×150 INSIDE", "VITREOUS CHINA EN 997", "1"],
  ["2", "LID", "VITREOUS CHINA", "1"],
  ["3", "VALVE BODY, SHANK G1/2", "POM-C", "1"],
  ["4", "NOZZLE, JET Ø3.5 (REFILL ORIFICE)", "CuZn39Pb3", "1"],
  ["5", "BACKNUT G1/2", "PA66", "1"],
  ["6", "TANK WASHER 1/2\"", "EPDM 70", "2"],
  ["7", "DIAPHRAGM Ø36×2", "EPDM 60", "1"],
  ["8", "DIAPHRAGM CAP WITH FORK", "POM-C", "1"],
  ["9", "PLUNGER Ø6", "POM-C", "1"],
  ["10", "PIVOT PIN Ø3×16 ISO 2338", "A2 STAINLESS", "1"],
  ["11", "FLOAT ARM", "PA66-GF30", "1"],
  ["12", "BALL FLOAT Ø70", "PP", "1"],
  ["13", "OUTLET SHROUD", "PP", "1"],
  ["14", "CC BOLT M8×80 ISO 4017, NUT", "A2-70", "2"],
  ["15", "DROP VALVE HOUSING G2", "PP", "1"],
  ["16", "SEAT WASHER Ø92×3", "EPDM 70", "1"],
  ["17", "BACKNUT G2", "PP", "1"],
  ["18", "DOUGHNUT WASHER", "EPDM CELLULAR", "1"],
  ["19", "PLUG, OVERFLOW TUBE Ø32×2", "PP", "1"],
  ["20", "PLUG SEAL Ø52×4", "NBR 70", "1"],
  ["21", "DOSE FLOAT Ø92, HOLLOW", "PP", "1"],
  ["22", "STOP COLLAR", "POM-C", "1"],
  ["23", "BRIDGE", "PP", "1"],
  ["24", "PULL ROD Ø6", "PA6", "1"],
  ["25", "LID BUSH", "POM-C", "1"],
  ["26", "PULL KNOB Ø28", "ABS", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const ROW = 14;
const bomTop = TB.y - (18 + BOM.length * ROW);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 34, align: "center", title: "ITEM" },
    { w: 196, title: "DESCRIPTION" },
    { w: 136, title: "MATERIAL" },
    { w: 34, align: "center", title: "QTY" },
  ],
  BOM,
  { rowH: ROW }
);

const notes = K.notes(790, 240, "NOTES", [
  `1 TOKEN = 1 DOSE = ${M.DOSE} L = ${K.fmt(M.TOKEN_H, 1)} mm OF LEVEL; CAPACITY ${M.CAP} TOKENS.`,
  `REFILL THROUGH JET 4, Ø${M.JET_D} AT ${M.P_MAINS} bar: Q = Cd·a·√(2Δp/ρ) = ${K.fmt(M.Q_FILL, 3)} L/s.`,
  `Q DOES NOT DEPEND ON THE LEVEL: ONE TOKEN EVERY ${K.fmt(1 / M.RATE, 1)} s. FLOAT SHUTS AT L=${Math.round(M.L_FULL)}.`,
  `A PULL IS ACCEPTED ONLY WITH ONE TOKEN IN THE TANK: DOSE FLOAT 21 OFF STOP 22.`,
  `DOSE DRAINS BY TORRICELLI, Q = Cd·A·√(2gh), Ø${M.SEAT_D} SEAT. CREST ${M.CREST}: HARD CAP.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "WC CISTERN · TOKEN BUCKET", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-006", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:2.5" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · L · s" },
  { x: 0, y: 82, w: 400, h: 34, label: `LIVE · CLOCK ${M.SPEED}× · PULL THE KNOB OR SPACE = REQUEST · H HOLDS FLOAT · R REFILL`, value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const chinaHatch = [45, 135]
  .map(
    (a) =>
      `<pattern id="h-china-${a}" patternUnits="userSpaceOnUse" width="5.2" height="5.2" patternTransform="rotate(${a})">` +
      `<path class="hl" d="M0 -1V6.2"/><path class="hl hl-dot" d="M2.6 -1V6.2"/></pattern>`
  )
  .join("");
const defs =
  `<defs>${K.hatchDefs()}${chinaHatch}` +
  `<pattern id="water" patternUnits="userSpaceOnUse" width="6" height="3.4"><path class="water-dash" d="M0.6 1.7H3.4"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-B"><circle cx="${B.cx}" cy="${B.cy}" r="${B.r}"/></clipPath>` +
  `<clipPath id="clip-D"><rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/></clipPath>` +
  `</defs>`;

const [kx, ky] = VM.p([P.UF, P.KNOB_V + 20]);
const hit = `<rect class="hit" data-drag="knob" x="${K.r2(kx - 22)}" y="${K.r2(ky - 34)}" width="44" height="64"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a WC cistern cut through its length, used as a token bucket rate limiter. Pull the knob or press Space to send a request; the water level, floats, valves, chart and readout follow." ` +
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
  analogy(40, 452) +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Pull the knob · <kbd>Space</kbd> request · <kbd>H</kbd> hold the float down · <kbd>R</kbd> refill · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "token-bucket.html"), {
  title: "Cistern Token Bucket",
  description: "A live engineering drawing of a WC cistern working as a token bucket rate limiter: a fixed refill orifice adds tokens, each request drains one dose, and a pull is refused when less than one token is left.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .dry{fill:var(--bp-paper)}.bp-sheet [data-drag]{cursor:pointer}.bp-sheet .water{fill:url(#water)}.bp-sheet .water-dash{fill:none;stroke:var(--bp-accent);stroke-width:.7px}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet .hl-dot{stroke-dasharray:.5 1.6}.bp-sheet .cut-plane{stroke-width:2.2px}` +
    `.bp-sheet .mark-x{fill:none;stroke:var(--bp-ink);stroke-width:1px}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHART__", JSON.stringify(CH)),
});
console.log(`token-bucket.html  ${(size / 1024).toFixed(0)} KB  token ${M.TOKEN_H.toFixed(1)} mm  refill ${M.Q_FILL.toFixed(3)} L/s  ${(1 / M.RATE).toFixed(1)} s/token  full ${M.L_FULL.toFixed(1)}`);
