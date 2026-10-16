// Builds stirling.html: a live A2 drawing of a beta-type Stirling demonstrator with a rhombic drive.
//   node examples/stirling/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k1 = K.PX_PER_MM;

// ---------------------------------------------------------------- views
const D = { cx: 605, cy: 386, r: 121, u: 26, v: 155 }; // DETAIL D, 5:1, the hot joint and the gap
const E = { x: 508, y: 574, w: 194, h: 162 }; // DETAIL E, 2:1, the piston, riding with it
const VIEWS = {
  main: { x: 250, y: 560, scale: 1 },
  D: { x: D.cx - D.u * 5 * k1, y: D.cy + D.v * 5 * k1, scale: 5 },
  E: { x: E.x + E.w / 2, y: E.y + (P.PT0 + 6) * 2 * k1, scale: 2 },
  B: { x: 960, y: 115, scale: 1 / 2.5 },
};
const VM = K.view(VIEWS.main);
const VD = K.view(VIEWS.D);
const VE = K.view(VIEWS.E);
const VB = K.view(VIEWS.B);

// ---------------------------------------------------------------- the engine, shared by every section view
function gasLayer(V, id) {
  let bands = "";
  for (let i = 0; i < P.GAP_BANDS; i++) bands += `<path id="gap-${id}-${i}" class="tint" fill-opacity="0.5" d="${P.shapes(V, P.gapBand(i))}"/>`;
  return (
    `<g data-role="fluid">` +
    `<path id="gas-h-${id}" class="tint" fill-opacity="1" d="${P.shapes(V, P.hotGas(0))}"/>` +
    `<path id="gas-c-${id}" class="tint" fill-opacity="0.2" d="${P.shapes(V, P.coldGas(0))}"/>` +
    `<g id="gap-${id}">${bands}</g>` +
    `</g>`
  );
}

const staticParts = (V) =>
  P.base(V) + P.woodScrews(V) + P.crankcase(V) + P.liner(V) + P.cylinder(V) + P.gasket(V) + P.hotCap(V) + P.capScrews(V) + P.shield(V) + P.burner(V);

const gears = (V, id) =>
  `<g id="gear-l-${id}">${P.gear(V, -1)}</g><g id="gear-r-${id}">${P.gear(V, 1)}</g>` +
  P.gearShaft(V, -1) + P.gearShaft(V, 1);

const displacerGroup = (V, id) => `<g id="disp-${id}">${P.displacer(V)}</g>`;
const dispLowGroup = (V, id) => `<g id="dlow-${id}">${P.dispRod(V)}${P.dispYoke(V)}</g>`;
const pistonGroup = (V, id) => `<g id="pist-${id}">${P.tube(V)}${P.pistonYoke(V)}${P.piston(V)}</g>`;

function centrelines(V) {
  return (
    K.centerline(V, [0, -82], [0, 226], 0) +
    K.centerline(V, [-M.E - 24, 0], [M.E + 24, 0], 0) +
    K.centerline(V, [-M.E, -24], [-M.E, 24], 0) +
    K.centerline(V, [M.E, -24], [M.E, 24], 0) +
    // the paths of the crank pins and the pitch circles of the gears
    K.line(V, K.circle(-M.E, 0, M.R_CRANK, 48), "ctr", true) +
    K.line(V, K.circle(M.E, 0, M.R_CRANK, 48), "ctr", true) +
    K.line(V, K.circle(-M.E, 0, M.E, 72), "ctr", true) +
    K.line(V, K.circle(M.E, 0, M.E, 72), "ctr", true) +
    K.centerline(V, [-P.BOLT_R, 50], [-P.BOLT_R, 77], 0) +
    K.centerline(V, [P.BOLT_R, 50], [P.BOLT_R, 77], 0) +
    K.centerline(V, [-P.BOLT_R, 140], [-P.BOLT_R, 163], 0) +
    K.centerline(V, [P.BOLT_R, 140], [P.BOLT_R, 163], 0) +
    K.centerline(V, [-58, -82], [-58, -48], 0) +
    K.centerline(V, [58, -82], [58, -48], 0) +
    K.centerline(V, [P.PIPE.from - 2, P.RING.v], [P.PIPE.end + 3, P.RING.v], 0)
  );
}

// The displacer at the bottom of its travel, in phantom: the far end of the hot space's breathing.
const phiDispLow = M.DISP.at[0];
const phantom = (V) => {
  const db = M.dispBottom(phiDispLow);
  const dt = db + M.DISP_L;
  const R = M.DISP_D / 2;
  return K.line(V, [[-R, db + 12], [-R, dt - 3], ...K.arc(-R + 3, dt - 3, 3, 180, 90, 4), ...K.arc(R - 3, dt - 3, 3, 90, 0, 4), [R, db + 12]], "phan");
};

// ---------------------------------------------------------------- main view: AXIAL SECTION
const mainView =
  `<g data-geom="main">` +
  gasLayer(VM, "main") +
  staticParts(VM) +
  gears(VM, "main") +
  dispLowGroup(VM, "main") +
  pistonGroup(VM, "main") +
  `<g id="link-main">${P.linkage(VM, 0)}</g>` +
  displacerGroup(VM, "main") +
  `<g data-role="fluid" id="flame-main">${P.flames(VM, 1, 0)}</g>` +
  `<g data-role="phantom">${phantom(VM)}</g>` +
  centrelines(VM) +
  `</g>`;

const dimHot = (phi) => {
  const top = M.dispTop(phi);
  return K.dim(VM, [-20, M.CAP_TOP], [-20, top], { dir: "v", off: VM.p([-47, 0])[0] - VM.p([-20, 0])[0], text: `e=${K.fmt(M.CAP_TOP - top, 1)}`, id: "dim-hot" });
};

const mainDims =
  K.dim(VM, [P.BASE.half, P.BASE.bot], [P.SHIELD.r1, P.SHIELD.top], { dir: "v", off: 440 - VM.p([P.BASE.half, 0])[0] }) +
  K.dim(VM, [-P.BASE.half, P.BASE.bot], [P.BASE.half, P.BASE.bot], { dir: "h", off: 22 }) +
  K.dim(VM, [-P.SHIELD.r1, P.SHIELD.top], [P.SHIELD.r1, P.SHIELD.top], { dir: "h", off: -18, prefix: "Ø" }) +
  `<g id="dim-hot-wrap">${dimHot(0)}</g>`;

// Balloons. Static parts on the left; the drive's moving parts on the right, their dots riding.
const mainBalloons =
  K.balloon(VM, [-33.4, 210], [104, 128], 22, { target: 22 }) +
  K.balloon(VM, [-28.5, 164.5], [104, 218], 23, { target: 23 }) +
  K.balloon(VM, [-35, 117.9], [104, 330], 17, { target: 17 }) +
  K.balloon(VM, [-49, 20], [104, 520], 2, { target: 2 }) +
  K.balloon(VM, [-58, -51], [104, 640], 3, { target: 3 }) +
  K.balloon(VM, [-75, -72], [56, 700], 1, { target: 1 }) +
  `<g id="mvb-main"></g>`;

// moving balloons: [item, circle, dot(phi)] — the page re-renders them each frame
const RIDE = [
  [21, [104, 270], (phi) => [-10, M.dispBottom(phi) + 44]],
  [9, [404, 466], (phi) => [12, M.yokeP(phi) + 2.5]],
  [8, [404, 492], (phi) => [M.YOKE_A + 1, M.yokeP(phi) + 1]],
  [7, [404, 518], (phi) => { const a = [M.YOKE_A, M.yokeP(phi)]; const b = M.pinR(phi); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }],
  [6, [404, 544], (phi) => { const b = M.pinR(phi); return [b[0] + 1, b[1] - 1]; }],
  [4, [404, 570], () => [M.E + 5.2, -0.6]],
  [10, [404, 610], (phi) => [12, M.yokeD(phi) - 2.5]],
  [25, [404, 640], (phi) => [3.6, M.yokeD(phi) - 7]],
];
const rideBalloons = (phi) => RIDE.map(([n, at, f]) => K.balloon(VM, f(phi), at, n, { target: n })).join("");

// The detail marks: D is fixed on the hot joint; E rides with the piston.
const markE = (dy = 0) => {
  const [x, y] = VM.p([0, P.PT0 - 14]);
  const R = 24 * VM.k;
  return `<g data-role="label" id="mark-E" transform="translate(0 ${dy})"><circle class="thin mark" cx="${x}" cy="${y}" r="${K.r2(R)}"/><text class="t t-lg" x="${VM.p([-45, 0])[0]}" y="${K.r2(y + 4)}" text-anchor="middle">E</text><path class="thin" d="M${VM.p([-42, 0])[0]} ${y}H${K.r2(x - R)}"/></g>`;
};
const mainMarks =
  K.detailMark(VM, [D.u, D.v], D.r / (5 * k1), "D", -20) +
  markE() +
  K.viewLabel(250, 46, "AXIAL SECTION", "SCALE 1:1");

// ---------------------------------------------------------------- DETAIL D: hot joint and regenerator gap, 5:1
const detailD =
  `<g data-geom="D" clip-path="url(#clip-D)"><circle class="paper" cx="${D.cx}" cy="${D.cy}" r="${D.r}"/>` +
  gasLayer(VD, "D") +
  staticParts(VD) +
  displacerGroup(VD, "D") +
  K.centerline(VD, [P.BOLT_R, 138], [P.BOLT_R, 165], 0) +
  `</g><circle class="thin" cx="${D.cx}" cy="${D.cy}" r="${D.r}"/>` +
  K.balloon(VD, [20.5, 161], [458, 300], 20, { target: 20 }) +
  K.balloon(VD, [25.5, 150.5], [458, 360], 19, { target: 19 }) +
  K.balloon(VD, [22, 146], [458, 420], 16, { target: 16 }) +
  K.balloon(VD, [32.2, 147], [752, 440], 18, { target: 18 }) +
  K.viewLabel(D.cx, D.cy + D.r + 18, "DETAIL D", "HOT JOINT, GAP REGENERATOR · SCALE 5:1");

// ---------------------------------------------------------------- DETAIL E: the piston, 2:1, riding with it
const detailE =
  `<g data-geom="E" clip-path="url(#clip-E)"><rect class="paper" x="${E.x}" y="${E.y}" width="${E.w}" height="${E.h}"/>` +
  `<g data-role="fluid"><path id="gas-c-E" class="tint" fill-opacity="0.2" d="${P.shapes(VE, [K.rect(-20, P.PT0, 20, P.PT0 + 30)])}"/></g>` +
  `<g id="liner-E">${P.liner(VE)}${P.part(17, K.cut(VE, K.rect(P.LINER.r1, 50, 27, 160), { mat: "alu", angle: 135 }) + K.cut(VE, K.rect(-27, 50, -P.LINER.r1, 160), { mat: "alu", angle: 135 }))}</g>` +
  `<g id="drod-E">${P.dispRod(VE)}</g>` +
  P.tube(VE) +
  P.piston(VE) +
  `<g id="disp-E">${P.displacer(VE)}</g>` +
  K.centerline(VE, [0, P.PT0 - 40], [0, P.PT0 + 10], 0) +
  `</g><rect class="thin" x="${E.x}" y="${E.y}" width="${E.w}" height="${E.h}" rx="10"/>` +
  K.balloon(VE, [-11, P.PT0 - 5], [470, 600], 13, { target: 13 }) +
  K.balloon(VE, [-19.3, P.PT0 - 4.75], [470, 640], 14, { target: 14 }) +
  K.balloon(VE, [-3.7, P.PT0 - 3], [470, 680], 15, { target: 15 }) +
  K.balloon(VE, [4.25, P.PB0 + 2], [740, 700], 11, { target: 11 }) +
  K.balloon(VE, [0, P.PB0 + 4], [740, 660], 12, { target: 12 }) +
  K.viewLabel(E.x + E.w / 2, E.y + E.h + 18, "DETAIL E", "PISTON 13–15, RIDING WITH IT · 2:1");

// ---------------------------------------------------------------- REAR VIEW: the flywheel, 1:2.5
// Seen from behind, u is mirrored: the flywheel on the right gear's shaft appears on the left.
const FLY_U = -M.E;
function viewB() {
  const V = VB;
  const c = P.CASE;
  const baseB = K.body(V, K.rect(-P.BASE.half, P.BASE.bot, P.BASE.half, P.BASE.top)) + K.line(V, [[-P.BASE.half, P.BASE.bot + 2], [P.BASE.half, P.BASE.bot + 2]], "thin");
  const caseB =
    K.body(V, [[-c.flange, c.bot], [c.flange, c.bot], [c.flange, c.floor], [c.out, c.floor], [c.out, c.top], [-c.out, c.top], [-c.out, c.floor], [-c.flange, c.floor]]) +
    K.line(V, K.circle(-FLY_U, 0, 13, 48), "vis", true) +
    K.line(V, K.circle(-FLY_U, 0, 7, 32), "vis", true);
  // the cooler cylinder, broken off above its second fin
  const top = 100;
  let cyl = K.line(V, [[-27, 92], [-27, 70], [-36, 70], [-36, 62], [36, 62], [36, 70], [27, 70], [27, 92]]);
  for (let k = 0; k < 2; k++) cyl += K.body(V, K.rect(-38, 92 + 5 * k, 38, 94 + 5 * k));
  cyl += K.lines(V, [[[-27, 99], [-27, top]], [[27, 99], [27, top]]]);
  cyl += K.lines(V, [[[-27, 94], [-27, 97]], [[27, 94], [27, 97]]]);
  return (
    `<g data-geom="B">` +
    P.part(1, baseB) + P.part(2, caseB) + P.part(17, cyl) +
    K.breakLine(V, [-31, top], [31, top]) +
    `<g id="fly-B">${P.flywheel(V, FLY_U)}</g>` +
    P.shaftEnd(V, FLY_U) +
    K.centerMark(V, [FLY_U, 0], 60, 0) +
    K.centerMark(V, [-FLY_U, 0], 16, 0) +
    K.centerline(V, [0, 56], [0, top + 2], 0) +
    `</g>` +
    K.dim(V, [FLY_U - P.FLY.r, 0], [FLY_U + P.FLY.r, 0], { dir: "h", off: VB.p([0, -80])[1] - VB.p([0, 0])[1] + 17, prefix: "Ø" }) +
    K.balloon(V, [FLY_U - 50, 10], [822, 70], 24, { target: 24 }) +
    K.balloon(V, [FLY_U + 6.5, -2], [822, 112], 5, { target: 5 }) +
    K.viewLabel(1112, 124, "REAR VIEW", "FLYWHEEL ON SHAFT 5") +
    `<g data-role="label"><text class="t t-sm" x="1112" y="148" text-anchor="middle">SCALE 1:2.5</text></g>`
  );
}

// ---------------------------------------------------------------- DIAGRAM 1: the P–V loop
const CH = { x0: 486, x1: 756, y0: 56, y1: 196, vMin: 15, vMax: 45, pMin: 0.5, pMax: 3 };
const chX = (v) => K.r2(CH.x0 + ((v - CH.vMin) / (CH.vMax - CH.vMin)) * (CH.x1 - CH.x0));
const chY = (p) => K.r2(CH.y1 - ((p - CH.pMin) / (CH.pMax - CH.pMin)) * (CH.y1 - CH.y0));
const loopPts = (th, tc) => {
  const pts = [];
  for (let i = 0; i < 120; i++) {
    const phi = (i / 120) * 2 * Math.PI;
    pts.push(`${chX(M.vTotal(phi))},${chY(M.pressure(phi, th, tc))}`);
  }
  return pts.join(" ");
};
function chart() {
  let grid = "";
  let labels = "";
  for (let p = CH.pMin; p <= CH.pMax + 1e-9; p += 0.5) {
    grid += `M${CH.x0} ${chY(p)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 6}" y="${K.r2(chY(p) + 2.7)}" text-anchor="end">${p.toFixed(1)}</text>`;
  }
  for (let v = CH.vMin; v <= CH.vMax; v += 5) {
    grid += `M${chX(v)} ${CH.y0}V${CH.y1}`;
    labels += `<text class="t t-sm" x="${chX(v)}" y="${CH.y1 + 11}" text-anchor="middle">${v}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 24}" text-anchor="middle">GAS VOLUME V, cm³</text>`;
  labels += `<text class="t t-sm t-mute" x="452" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 452 ${(CH.y0 + CH.y1) / 2})">PRESSURE p, bar abs</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polygon id="loop-area" class="accent-area" points="${loopPts(M.TH_MAX, M.TC)}"/>` +
    `<polygon id="loop-full" class="hid" points="${loopPts(M.TH_MAX, M.TC)}"/>` +
    `<polyline id="trace-prev" class="thin" points=""/>` +
    `<polyline id="trace-now" class="vis accent" points=""/>` +
    `<circle id="chart-dot" class="accent-fill" cx="${CH.x0}" cy="${CH.y1}" r="2.6"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<text id="q-1" class="t t-sm" x="${CH.x1 - 6}" y="${CH.y0 + 13}" text-anchor="end"></text>` +
    `<text id="q-2" class="t t-sm" x="${CH.x1 - 6}" y="${CH.y0 + 25}" text-anchor="end"></text>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 246, "DIAGRAM 1", "P–V · ACCENT: THIS TURN · SHADED: W = ∮p dV · DASHED: FULL FLAME")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "BASE 170×100×20", "OAK, OILED", "1"],
  ["2", "CRANKCASE", "EN AC-43000", "1"],
  ["3", "WOOD SCREW 6×25 DIN 571", "STEEL, ZINC", "4"],
  ["4", "SPUR GEAR m1 z40", "C45", "2"],
  ["5", "GEAR SHAFT Ø8, NUT M8", "C45 / STEEL 8", "2"],
  ["6", "CRANK PIN Ø6", "100Cr6", "2"],
  ["7", "CONNECTING ROD, 34 CTRS", "EN AW-7075", "4"],
  ["8", "YOKE PIN 6m6×16 ISO 8734", "STEEL, HARDENED", "4"],
  ["9", "PISTON YOKE", "C45", "1"],
  ["10", "DISPLACER YOKE", "C45", "1"],
  ["11", "PISTON ROD TUBE Ø10×1.5", "E355", "1"],
  ["12", "DISPLACER ROD Ø5", "1.4301", "1"],
  ["13", "POWER PISTON Ø40", "EN AW-2618", "1"],
  ["14", "PISTON RING Ø40×1.4", "PTFE + 25% CARBON", "2"],
  ["15", "ROD BUSHING Ø5/Ø10×14", "CuSn8", "1"],
  ["16", "CYLINDER LINER Ø40/Ø46", "EN-GJL-250", "1"],
  ["17", "COOLER CYLINDER, 10 FINS", "EN AW-6082", "1"],
  ["18", "CAP SCREW M5×12 ISO 4762", "STEEL 12.9", "10"],
  ["19", "GASKET Ø40/Ø76×1", "GRAPHITE FOIL", "1"],
  ["20", "HOT CAP Ø42×1, ON FLANGE", "1.4841 / 1.4301", "1"],
  ["21", "DISPLACER Ø38×80", "1.4301, 0.5", "1"],
  ["22", "HEAT SHIELD Ø67.6×0.8", "1.4301", "1"],
  ["23", "BURNER RING Ø6×1, 12 JETS", "CuZn37", "1"],
  ["24", "FLYWHEEL Ø110", "EN-GJL-250", "1"],
  ["25", "HEX NUT M5 ISO 4032", "STEEL 8", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const bomTop = TB.y - (18 + BOM.length * 16);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 34, align: "center", title: "ITEM" },
    { w: 196, title: "DESCRIPTION" },
    { w: 136, title: "MATERIAL" },
    { w: 34, align: "center", title: "QTY" },
  ],
  BOM
);

const lead = M.LEAD;
const notes = K.notes(
  790,
  226,
  "NOTES",
  [
    `SCHMIDT: ISOTHERMAL SPACES, p = mR/(Ve/Th + Vr/Tr + Vc/Tc), Tr LOG MEAN.`,
    `SWEPT ${K.fmt(M.SWEPT, 1)} cm³; GAP REGENERATOR 1 mm, ${K.fmt(M.V_REG, 1)} cm³; Ve LEADS Vc ${Math.round(lead)}°.`,
    `AIR SEALED AT 20 °C, 1 atm. W = ∮p dV; TORQUE W/2π AGAINST FRICTION.`,
    `STALLS BELOW Th ≈ ${Math.round(M.stallTh())} K. MOTION DRAWN AT 1/20 OF ENGINE SPEED.`,
  ],
  12
);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "STIRLING ENGINE · BETA", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-020", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:1" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · K · bar abs" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE FLYWHEEL OR GEARS · ↑ ↓ BURNER · SPACE FLAME", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="air" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="air-dot" cx="0.8" cy="0.8" r="0.62"/><circle class="air-dot" cx="2.4" cy="2.4" r="0.62"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-D"><circle cx="${D.cx}" cy="${D.cy}" r="${D.r}"/></clipPath>` +
  `<clipPath id="clip-E"><rect x="${E.x}" y="${E.y}" width="${E.w}" height="${E.h}" rx="10"/></clipPath>` +
  `</defs>`;

const [cx0, cy0] = VM.p([-P.CASE.out, P.CASE.top]);
const [cx1, cy1] = VM.p([P.CASE.out, P.CASE.bot]);
const [fx, fy] = VB.p([FLY_U, 0]);
const hit =
  `<rect class="hit" data-drag="main" x="${cx0}" y="${cy0}" width="${K.r2(cx1 - cx0)}" height="${K.r2(cy1 - cy0)}"/>` +
  `<circle class="hit" data-drag="B" cx="${fx}" cy="${fy}" r="${K.r2(P.FLY.r * VB.k)}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a beta-type Stirling engine cut through its cylinder: a burner heats the cap, the displacer shuttles the air between the hot and cold ends, and a rhombic drive turns the flywheel. Drag the flywheel or gears to turn it; the up and down arrows set the burner." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  mainBalloons +
  mainMarks +
  detailD +
  detailE +
  viewB() +
  chart() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the flywheel or gears · <kbd>←</kbd> <kbd>→</kbd> turn · <kbd>↑</kbd> <kbd>↓</kbd> burner · <kbd>Space</kbd> flame on/off · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "stirling.html"), {
  title: "Stirling Engine Section",
  description: "A live engineering drawing of a beta-type Stirling demonstrator: the displacer shuttles the air between hot cap and cooler, a rhombic drive turns the flywheel, and a Schmidt model draws the P–V loop.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet [data-drag]{cursor:grab}.bp-sheet .tint{fill:url(#air)}.bp-sheet .air-dot{fill:var(--bp-accent)}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet .accent-area{fill:var(--bp-accent);fill-opacity:.16;stroke:none}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHART__", JSON.stringify(CH)).replace("__RIDE__", RIDE.map(([n, at, f]) => `[${n}, ${JSON.stringify(at)}, ${f.toString()}]`).join(",\n  ")),
});
console.log(
  `stirling.html  ${(size / 1024).toFixed(0)} KB  swept ${M.SWEPT.toFixed(1)} cm³  Vreg ${M.V_REG.toFixed(1)} cm³  lead ${lead.toFixed(0)}°  ` +
    `strokes ${M.STROKE_P.toFixed(1)}/${M.STROKE_D.toFixed(1)}  W(760K) ${M.work(760, M.TC).toFixed(2)} J  ${M.rpm(M.steadyOmega(760)).toFixed(0)} rpm  stall ${M.stallTh().toFixed(0)} K`
);
