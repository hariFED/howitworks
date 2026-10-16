// Builds disc-brake.html: a live A2 drawing of a bicycle hydraulic disc brake, the lever's master
// cylinder cut in the plane of the lever, the caliper cut through both pistons.
//   node examples/disc-brake/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PX = K.PX_PER_MM;

// ---------------------------------------------------------------- views
const D = { x: 572, y: 58, w: 202, h: 222 }; // DETAIL D window, sheet units
const E = { cx: 420, cy: 670, r: 86 }; // DETAIL E circle
const EW = [11.4, 11.5]; // DETAIL E centre, world (caliper)
const VIEWS = {
  main: { x: 230, y: 386, scale: 2 },
  D: { x: D.x - 3 * 10 * PX, y: D.y + 36.3 * 10 * PX, scale: 10 },
  A: { x: 362, y: 440, scale: 2 },
  B: { x: 162, y: 678, scale: 2 },
  E: { x: E.cx - EW[0] * 20 * PX, y: E.cy + EW[1] * 20 * PX, scale: 20 },
  C: { x: 662, y: 646, scale: 0.5 },
};
const VM = K.view(VIEWS.main);
const VD = K.view(VIEWS.D);
const VB = K.view(VIEWS.B);
const VE = K.view(VIEWS.E);
const VC = K.view(VIEWS.C);
const VA = K.view(VIEWS.A);

const rest = M.brake(0);

// ---------------------------------------------------------------- the lever and master cylinder, drawn into any view
function masterOil(V, id) {
  return (
    `<g data-role="fluid" data-part="15">` +
    `<path id="oil-r-${id}" class="tint" fill-opacity="0.55" d="${P.oilPath(V, P.reservoirOil)}"/>` +
    `<path id="oil-c-${id}" class="tint" fill-opacity="0.55" d="${P.oilPath(V, P.chamberOil(0))}"/>` +
    `</g>`
  );
}
const pistonGroup = (V, id) => `<g id="pist-${id}">${P.piston(V)}${P.primaryCup(V)}${P.secondarySeal(V)}</g>`;

function master(V, id, { fitting = true } = {}) {
  return (
    P.body(V) +
    masterOil(V, id) +
    P.clampHalf(V) +
    P.cap(V) +
    P.bladder(V) +
    (fitting ? P.masterFitting(V) : "") +
    P.circlip(V) +
    `<g id="spring-${id}">${P.spring(V, 0)}</g>` +
    pistonGroup(V, id) +
    `<g id="boot-${id}">${P.boot(V, 0)}</g>` +
    `<g id="lever-${id}">${P.lever(V, 0)}${P.barrel(V, 0)}${P.pushrod(V, 0, 0)}</g>` +
    P.pivotPin(V)
  );
}

// ---------------------------------------------------------------- main view: the lever in its own plane, 2:1
const mainView =
  `<g data-geom="main">` +
  `<g data-role="phantom">${P.bar(VM)}${P.phantomLever(VM)}</g>` +
  master(VM, "main") +
  K.breakLine(VM, [P.HOSE_BREAK_U, 17], [P.HOSE_BREAK_U, 24]) +
  K.centerline(VM, [0, 15], [0, 70], 0) +
  K.centerline(VM, [-44, 20.5], [-3, 20.5], 0) +
  K.centerline(VM, [-44, 0], [2, 0], 0) +
  `</g>`;

// finger travel, live: from the rest position of the finger point to where it is now
const dimTravel = (th) => {
  const now = P.rot(P.FINGER, M.PIVOT, th);
  return K.dim(VM, P.FINGER, now, { dir: "v", off: VM.p([70, 0])[0] - VM.p(P.FINGER)[0], text: `s=${K.fmt(M.RF * th, 1)}`, id: "dim-s" });
};
const mainDims =
  K.dim(VM, M.PIVOT, P.BARREL, { dir: "h", off: -48 }) +
  K.dim(VM, M.PIVOT, P.FINGER, { dir: "h", off: -66 }) +
  `<g id="dim-s-wrap">${dimTravel(0)}</g>`;

// Balloons. Static ones sit outside the lever's sweep; moving ones are redrawn each frame (their
// circles stay put, their dots ride on the part).
const MOVING = {
  main: [
    // [item, world point at rest, balloon circle, kind]: lever rotates, piston slides
    [3, [36, 61], [400, 105], "lever"],
    [5, [-2.4, 60], [275, 105], "lever"],
    [6, [0, P.BALL_V], [66, 194], "piston"],
    [9, [-4.4, M.PISTON_FRONT + 12.2], [66, 216], "piston"],
    [7, [-2.9, 37], [66, 238], "piston"],
  ],
  D: [[8, [4.4, M.PISTON_FRONT + 2.9], [552, 250], "piston"]],
  E: [[22, [12.6, 10.0], [532, 722], "calpiston"]],
};
const staticBalloons =
  K.balloon(VM, [-24, 30], [66, 262], 1, { target: 1 }) +
  K.balloon(VM, [-24.4, 61.6], [95, 105], 4, { target: 4 }) +
  K.balloon(VM, [3.4, 18.3], [262, 364], 10, { target: 10 }) +
  K.balloon(VM, [-4.9, 44.9], [66, 172], 11, { target: 11 }) +
  K.balloon(VM, [-6.6, 48.5], [66, 150], 12, { target: 12 }) +
  K.balloon(VM, [30.5, 21], [420, 290], 13, { target: 13 }) +
  K.balloon(VM, [23.5, 35.1], [420, 236], 14, { target: 14 }) +
  K.balloon(VM, [13, 24], [420, 262], 15, { target: 15 }) +
  K.balloon(VM, [-35, 16.6], [68, 354], 16, { target: 16 }) +
  K.balloon(VM, [-26, 17.6], [92, 354], 17, { target: 17 }) +
  K.balloon(VM, [-27, 19.67], [116, 354], 18, { target: 18 }) +
  K.balloon(VM, [-41, 18.8], [44, 354], 19, { target: 19 });

function balloonsLive(V, list, st) {
  return list
    .map(([n, at, c, kind]) => {
      let p = at;
      if (kind === "lever") p = P.rot(at, M.PIVOT, st.theta);
      if (kind === "piston") p = [at[0], at[1] - st.x];
      if (kind === "calpiston") p = [at[0] - st.y, at[1]];
      return K.balloon(V, p, c, n, { target: n });
    })
    .join("");
}

// A detail's circle in its parent view, its letter set clear of the drawing on a short leader.
function detailRing(V, centre, r, letter, [lx, ly]) {
  const [x, y] = V.p(centre);
  const R = r * V.k;
  const a = Math.atan2(ly - y, lx - x);
  return (
    `<g data-role="label"><circle class="thin mark" cx="${x}" cy="${y}" r="${K.r2(R)}"/>` +
    `<path class="thin" d="M${K.r2(x + R * Math.cos(a))} ${K.r2(y + R * Math.sin(a))}L${K.r2(lx - 9 * Math.cos(a))} ${K.r2(ly - 9 * Math.sin(a))}"/>` +
    `<text class="t t-lg" x="${lx}" y="${ly + 4.5}" text-anchor="middle">${letter}</text></g>`
  );
}

const mainMarks =
  detailRing(VM, [6, 30.5], 6.5, "D", [420, 324]) +
  cuttingPlane(VM, P.AA_U, -19, 70, "A") +
  K.viewLabel(250, 46, "SECTION IN THE PLANE OF THE LEVER", "LEVER AND MASTER CYLINDER · SCALE 2:1");

// ---------------------------------------------------------------- DETAIL D: timing port, 10:1
const detailD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>` +
  P.body(VD) +
  masterOil(VD, "D") +
  `<g id="spring-D">${P.spring(VD, 0)}</g>` +
  pistonGroup(VD, "D") +
  `</g><rect class="thin" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/>` +
  K.dim(VD, [5, M.LIP], [5, M.PORT_V - M.PORT_D / 2], { dir: "v", off: D.x - 16 - VD.p([5, 0])[0], text: K.fmt(M.FREE, 2) }) +
  K.dim(VD, [7, M.PORT_V - M.PORT_D / 2], [7, M.PORT_V + M.PORT_D / 2], { dir: "v", off: D.x - 36 - VD.p([7, 0])[0], text: `Ø${M.PORT_D}` }) +
  K.viewLabel(D.x + D.w / 2, D.y + D.h + 18, "DETAIL D", "TIMING PORT · SCALE 10:1");

// ---------------------------------------------------------------- SECTION B-B: caliper, 2:1
function caliperMoving(V, id) {
  return (
    `<g id="pad-o-${id}">${P.pad(V, 1)}</g><g id="pad-i-${id}">${P.pad(V, -1)}</g>` +
    `<g id="cp-o-${id}">${P.calPiston(V, 1)}</g><g id="cp-i-${id}">${P.calPiston(V, -1)}</g>` +
    `<g id="seal-${id}">${P.seal(V, 1, 0)}${P.seal(V, -1, 0)}</g>` +
    `<g id="pspring-${id}">${P.padSpring(V, 0)}</g>`
  );
}
const calOil = (V, id) => `<g data-role="fluid"><path id="oil-cal-${id}" class="tint" fill-opacity="0.55" d="${P.oilPath(V, P.caliperOil(0))}"/></g>`;

const sectionB =
  `<g data-geom="B">` +
  P.rotor(VB, -22) +
  P.caliper(VB) +
  calOil(VB, "B") +
  P.oring(VB) +
  P.caliperFitting(VB) +
  caliperMoving(VB, "B") +
  P.padPin(VB) +
  K.breakLine(VB, [-2.5, -22], [2.5, -22]) +
  K.breakLine(VB, [-17, 46], [-11, 46]) +
  K.centerline(VB, [-27, 0], [27, 0], 4) +
  K.centerline(VB, [0, -24], [0, 36], 0) +
  K.centerline(VB, [-14, 24], [-14, 46], 0) +
  `</g>` +
  K.dim(VB, [-11, -11], [-11, 11], { dir: "v", off: VB.p([-29.5, 0])[0] - VB.p([-11, 0])[0], prefix: "Ø" }) +
  K.balloon(VB, [-22, -10], [62, 772], 20, { target: 20 }) +
  K.balloon(VB, [22, -10], [292, 705], 21, { target: 21 }) +
  K.balloon(VB, [-3, -4], [132, 776], 24, { target: 24 }) +
  K.balloon(VB, [-2, 18.6], [185, 512], 25, { target: 25 }) +
  K.balloon(VB, [20, 16], [292, 560], 26, { target: 26 }) +
  K.balloon(VB, [0.45, 21.15], [215, 512], 28, { target: 28 }) +
  detailRing(VB, EW, 2.7, "E", [298, 625]) +
  K.viewArrow(VB, [27.6, 3], [-1, 0], "C") +
  K.viewLabel(162, 800, "SECTION B-B", "CALIPER · SCALE 2:1");

// ---------------------------------------------------------------- SECTION A-A: the split clamp, removed section, 2:1
const sectionA =
  `<g data-geom="A">` +
  `<g data-role="phantom">${K.line(VA, K.circle(0, 0, 11.1, 72), "phan", true)}${K.line(VA, K.circle(0, 0, 9.1, 72), "phan", true)}</g>` +
  P.clampSection(VA) +
  `<g data-role="fluid"><path id="oil-c-A" class="tint" fill-opacity="0.55" d="${P.oilPath(VA, P.aaOil)}"/></g>` +
  K.centerMark(VA, [0, 0], 13, 3) +
  K.centerline(VA, [-13, 16.5], [8, 16.5], 2) +
  K.centerline(VA, [-13, -16.5], [8, -16.5], 2) +
  `</g>` +
  K.dim(VA, [0, 11.1], [0, -11.1], { dir: "v", off: VA.p([-17.5, 0])[0] - VA.p([0, 0])[0], text: "Ø22.2" }) +
  K.balloon(VA, [-3.5, 19], [292, 362], 2, { target: 2 }) +
  K.balloon(VA, [-10.5, -18.5], [300, 520], 29, { target: 29 }) +
  K.viewLabel(440, 541, "SECTION A-A", "SPLIT CLAMP · SCALE 2:1");

// ---------------------------------------------------------------- DETAIL E: square seal, 20:1
const detailE =
  `<g data-geom="E" clip-path="url(#clip-E)"><circle class="paper" cx="${E.cx}" cy="${E.cy}" r="${E.r}"/>` +
  P.caliper(VE) +
  calOil(VE, "E") +
  caliperMoving(VE, "E") +
  P.padPin(VE) +
  `<g data-role="phantom">${P.sealRest(VE)}</g>` +
  `</g><circle class="thin" cx="${E.cx}" cy="${E.cy}" r="${E.r}"/>` +
  K.balloon(VE, [11.9, 12.4], [532, 612], 23, { target: 23 }) +
  K.viewLabel(E.cx, E.cy + E.r + 22, "DETAIL E", "SQUARE SEAL ROLLBACK · SCALE 20:1");

const dimRoll = (y) => K.dim(VE, [12.25, 11], [12.25 - y, 11], { dir: "h", off: -(VE.p([0, 11])[1] - (E.cy - E.r - 7)), text: `δ=${y.toFixed(2)}`, id: "dim-roll" });

// ---------------------------------------------------------------- VIEW C: rotor and caliper from outboard, 1:2
function cuttingPlane(V, x, y0, y1, letter) {
  const [sx, sa] = V.p([x, y1]);
  const [, sb] = V.p([x, y0]);
  const arrow = (y) => `<path class="thin" d="M${sx} ${y}H${sx - 16}"/><path class="head" d="M${sx - 18} ${y}l7 -1.8v3.6z"/><text class="t t-lg" x="${sx - 24}" y="${y + 4}" text-anchor="end">${letter}</text>`;
  return (
    `<g data-role="label"><path class="ctr" d="M${sx} ${sa}V${sb}"/><path class="vis" d="M${sx} ${sa}v10M${sx} ${sb}v-10"/>` +
    arrow(sa) +
    arrow(sb) +
    `</g>`
  );
}
const viewC =
  `<g data-geom="C">${P.rotorFace(VC)}${P.caliperFace(VC)}${K.centerMark(VC, [0, 0], 20, 6)}</g>` +
  cuttingPlane(VC, 0, -88, M.R_EFF + 40, "B") +
  K.dim(VC, [0, -80], [0, 80], { dir: "v", off: -(80 * VC.k + 14), prefix: "Ø" }) +
  K.dim(VC, [0, 0], [0, M.R_EFF], { dir: "v", off: 80 * VC.k + 16, prefix: "R" }) +
  K.balloon(VC, [-52, -52], [600, 762], 27, { target: 27 }) +
  K.viewLabel(662, 790, "VIEW C", "ROTOR Ø160 · SCALE 1:2");

// ---------------------------------------------------------------- DIAGRAM 1: clamp force against finger travel
const CH = { x0: 818, x1: 1150, y0: 62, y1: 168, sMax: 18, fMax: 2000 };
const chX = (s) => K.r2(CH.x0 + (s / CH.sMax) * (CH.x1 - CH.x0));
const chY = (f) => K.r2(CH.y1 - (Math.min(CH.fMax, Math.max(0, f)) / CH.fMax) * (CH.y1 - CH.y0));
function chart() {
  let grid = "";
  let labels = "";
  for (let f = 0; f <= CH.fMax; f += 500) {
    grid += `M${CH.x0} ${chY(f)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 6}" y="${K.r2(chY(f) + 2.7)}" text-anchor="end">${K.fmt(f / 1000, 1)}</text>`;
  }
  for (let s = 0; s <= CH.sMax; s += 2) {
    grid += `M${chX(s)} ${CH.y0}V${CH.y1}`;
    labels += `<text class="t t-sm" x="${chX(s)}" y="${CH.y1 + 11}" text-anchor="middle">${s}</text>`;
  }
  const phases =
    `<path class="hid" d="M${chX(M.S_FREE)} ${CH.y0}V${CH.y1}M${chX(M.S_BITE)} ${CH.y0}V${CH.y1}"/>` +
    `<text class="t t-sm t-mute" x="${chX(M.S_FREE / 2)}" y="${CH.y0 + 11}" text-anchor="middle">FREE</text>` +
    `<text class="t t-sm t-mute" x="${chX((M.S_FREE + M.S_BITE) / 2)}" y="${CH.y0 + 11}" text-anchor="middle">PAD GAP</text>` +
    `<text class="t t-sm t-mute" x="${chX(M.S_BITE + (CH.sMax - M.S_BITE) / 2)}" y="${CH.y1 - 8}" text-anchor="middle">CONTACT</text>`;
  const model = M.curve().map(([s, f]) => `${chX(s)},${chY(f)}`).join(" ");
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 24}" text-anchor="middle">FINGER TRAVEL s, mm</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x0 - 30}" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH.x0 - 30} ${(CH.y0 + CH.y1) / 2})">CLAMP F, kN</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    phases +
    `<polyline class="thin" points="${model}"/>` +
    `<polyline id="trace" class="vis accent" points=""/>` +
    `<circle id="chart-dot" class="accent-fill" cx="${CH.x0}" cy="${CH.y1}" r="2.6"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 216, "DIAGRAM 1", "THIN: MODEL · ACCENT: THIS PULL")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "LEVER BODY", "EN AW-6061-T6", "1"],
  ["2", "CLAMP HALF Ø22.2", "EN AW-6061-T6", "1"],
  ["3", "LEVER BLADE", "EN AW-7075-T6", "1"],
  ["4", "PIVOT PIN Ø6", "1.4305", "1"],
  ["5", "BARREL NUT M4", "CuZn39Pb3", "1"],
  ["6", "PUSHROD M4, BALL Ø4.8", "1.4305", "1"],
  ["7", "MASTER PISTON Ø10", "EN AW-2011", "1"],
  ["8", "PRIMARY CUP Ø10", "HNBR 70", "1"],
  ["9", "SECONDARY SEAL Ø10", "HNBR 70", "1"],
  ["10", "RETURN SPRING, 5 TURNS", "EN 10270-3 Ø0.6", "1"],
  ["11", "CIRCLIP 10 DIN 472", "C75S", "1"],
  ["12", "DUST BOOT", "EPDM 50", "1"],
  ["13", "RESERVOIR CAP", "PA6-GF30", "1"],
  ["14", "BLADDER", "HNBR 50", "1"],
  ["15", "MINERAL BRAKE OIL", "ISO VG 7", "25 ml"],
  ["16", "COMPRESSION NUT M8×0.75", "CuZn39Pb3", "2"],
  ["17", "OLIVE Ø5", "CuZn37", "2"],
  ["18", "HOSE INSERT Ø2.1", "1.4305", "2"],
  ["19", "HOSE Ø5×2.1, 1000 LONG", "PA12/ARAMID", "1"],
  ["20", "CALIPER HALF, INBOARD", "EN AW-6061-T6", "1"],
  ["21", "CALIPER HALF, OUTBOARD", "EN AW-6061-T6", "1"],
  ["22", "CALIPER PISTON Ø22", "PF PHENOLIC", "2"],
  ["23", "SQUARE SEAL Ø22", "HNBR 70", "2"],
  ["24", "PAD, RESIN ON STEEL", "DC01 + RESIN", "2"],
  ["25", "PAD SPRING t0.4", "1.4310", "1"],
  ["26", "PAD PIN Ø3, M3", "1.4305", "1"],
  ["27", "ROTOR Ø160×1.8", "X46Cr13", "1"],
  ["28", "O-RING 3×1", "HNBR 70", "1"],
  ["29", "CLAMP SCREW M5×16 ISO 4762", "STEEL 8.8", "2"],
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
    { w: 126, title: "MATERIAL" },
    { w: 44, align: "center", title: "QTY" },
  ],
  BOM,
  { rowH: ROW }
);

const full = M.brake(M.THETA_MAX);
const notes = K.notes(566, 352, "NOTES", [
  `OIL 15 IN ACCENT; p IN bar (GAUGE).`,
  `LEVER ${M.RF}/${M.RP} = ${K.fmt(M.LEVER_RATIO, 2)}; Ø22²/Ø10² = ${K.fmt(M.HYD_RATIO, 2)}.`,
  `CUP 8 SHUTS PORT Ø${M.PORT_D} AFTER ${K.fmt(M.FREE, 2)}.`,
  `PAD GAP ${M.GAP} A SIDE = SEAL ROLLBACK.`,
  `T = 2·μ·F·R; μ ${M.MU}, R ${M.R_EFF}.`,
  `${M.MASS} kg ON 29×2.4: ${K.fmt(full.finger, 0)} N → ${K.fmt(full.decel, 1)} m/s².`,
  `PINS, ROD, NUT, BALL NOT CUT.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "HYDRAULIC DISC BRAKE", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-021", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "2:1" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · bar · N" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · s, FINGER F, OIL p, CLAMP, TORQUE, DECEL · DRAG THE LEVER · ↑ ↓ · SPACE", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="oil" patternUnits="userSpaceOnUse" width="2.6" height="2.6"><circle class="oil-dot" cx="0.65" cy="0.65" r="0.68"/><circle class="oil-dot" cx="1.95" cy="1.95" r="0.68"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-D"><rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-E"><circle cx="${E.cx}" cy="${E.cy}" r="${E.r}"/></clipPath>` +
  `</defs>`;

const [hx0, hy0] = VM.p([-34, 72]);
const [hx1, hy1] = VM.p([66, 38]);
const hit = `<rect class="hit" data-drag="lever" x="${hx0}" y="${hy0}" width="${K.r2(hx1 - hx0)}" height="${K.r2(hy1 - hy0)}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a bicycle hydraulic disc brake: the lever's master cylinder cut in the plane of the lever, and the two-piston caliper cut through its pistons. Drag the lever or use the arrow keys; the oil pressure, the pads, the seals and the chart follow." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  staticBalloons +
  `<g id="mvb-main">${balloonsLive(VM, MOVING.main, { theta: 0, x: 0, y: 0 })}</g>` +
  mainMarks +
  detailD +
  `<g id="mvb-D">${balloonsLive(VD, MOVING.D, { theta: 0, x: 0, y: 0 })}</g>` +
  sectionB +
  sectionA +
  detailE +
  `<g id="dim-roll-wrap">${dimRoll(0)}</g>` +
  `<g id="mvb-E">${balloonsLive(VE, MOVING.E, { theta: 0, x: 0, y: 0 })}</g>` +
  viewC +
  chart() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the lever · <kbd>↑</kbd> <kbd>↓</kbd> pull and release · <kbd>Space</kbd> squeeze · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const page = { CH, MOVING, E, EW };
const size = writePage(join(here, "disc-brake.html"), {
  title: "Hydraulic Disc Brake",
  description: "A live engineering drawing of a bicycle hydraulic disc brake: pull the lever and the master cylinder shuts its timing port, the caliper pistons close the pad gap, the clamp force climbs and the square seals pull the pistons back on release.",
  svg,
  bar,
  css: `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#oil)}.bp-sheet .oil-dot{fill:var(--bp-accent)}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet .cav{fill:none;stroke:var(--bp-ink);stroke-width:calc(var(--bp-thick) * 2);stroke-linejoin:miter}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__PAGE__", JSON.stringify(page)),
});
console.log(
  `disc-brake.html  ${(size / 1024).toFixed(0)} KB  free ${M.FREE} mm  bite ${M.X_BITE.toFixed(2)} mm  full ${M.X_MAX.toFixed(2)} mm (θ ${((M.THETA_MAX * 180) / Math.PI).toFixed(1)}°)  clamp ${full.clamp.toFixed(0)} N  T ${full.torque.toFixed(0)} N·m  a ${full.decel.toFixed(2)} m/s²  finger ${full.finger.toFixed(0)} N`
);
