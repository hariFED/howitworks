// Builds carburettor.html: a live A2 drawing of a fixed-jet float-bowl carburettor, cut through its bore.
//   node examples/carburettor/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k5 = 5 * K.PX_PER_MM;

// ---------------------------------------------------------------- views
const B = { x: 577, y: 52, w: 190, h: 156, u0: -43.5, v0: -19 }; // detail windows: top-left world point
const D = { x: 577, y: 268, w: 190, h: 232, u0: 17.5, v0: -11 };
const VIEWS = {
  main: { x: 325, y: 225, scale: 2 },
  B: { x: B.x - B.u0 * k5, y: B.y + B.v0 * k5, scale: 5 },
  D: { x: D.x - D.u0 * k5, y: D.y + D.v0 * k5, scale: 5 },
  C: { x: 671, y: 626, scale: 1 },
};
const VM = K.view(VIEWS.main);
const VB = K.view(VIEWS.B);
const VD = K.view(VIEWS.D);
const VC = K.view(VIEWS.C);

// The state the static page shows before the script runs: idle, choke open, bowl at its idle level.
const idle = M.solve(0);
const LEVEL0 = M.steadyLevel(idle.fuelVol);
const TURNS = M.SCREW_TURNS;

// ---------------------------------------------------------------- the carburettor in any view
function fuelLayer(V, id) {
  return (
    `<g data-role="fluid">` +
    `<path id="f-bowl-${id}" class="tint" fill-opacity="0.55" d="${P.pathOf(V, P.bowlFuel(LEVEL0))}"/>` +
    `<path id="f-supply-${id}" class="tint" fill-opacity="0.55" d="${P.pathOf(V, P.supplyFuel(0))}"/>` +
    `<path id="f-stream-${id}" class="tint" fill-opacity="0.45" d=""/>` +
    `<path id="f-col-${id}" class="tint" fill-opacity="0.55" d="${P.pathOf(V, P.mainColumn(LEVEL0))}"/>` +
    `<path id="f-emul-${id}" class="tint" fill-opacity="0" d="${P.pathOf(V, P.mainEmulsion())}"/>` +
    `<path id="f-spray-${id}" class="tint" fill-opacity="0" d="${K.d(V, P.spray(0))}"/>` +
    `<path id="f-pilot-${id}" class="tint" fill-opacity="0.55" d="${P.pathOf(V, P.pilotFuel())}"/>` +
    `<path id="f-pemul-${id}" class="tint" fill-opacity="0.3" d="${P.pathOf(V, P.pilotEmulsion(0))}"/>` +
    `<path id="f-plume-${id}" class="tint" fill-opacity="0.3" d="${K.d(V, P.idlePlume(0.2))}"/>` +
    `<path id="f-pplume-${id}" class="tint" fill-opacity="0" d="${K.d(V, P.idlePlume(0, M.PROG_U))}"/>` +
    `</g>`
  );
}

function staticParts(V) {
  return (
    P.body(V) + P.bowl(V) + P.gasket(V) + P.bowlScrews(V) + P.drainWasher(V) + P.drainPlug(V) + P.mainJet(V) + P.emulsionTube(V) + P.nozzle(V) +
    P.mainAirJet(V) + P.pilotJet(V) + P.pilotAirJet(V) + P.seat(V) + P.pivotPin(V) + P.chokeSpindle(V) + P.throttleSpindle(V) + P.ballPlugs(V) + P.ventNipple(V)
  );
}

function movingParts(V, id) {
  return (
    `<g id="float-${id}">${P.float(V, LEVEL0)}${P.floatArm(V, LEVEL0)}</g>` +
    P.pivotPin(V) +
    `<g id="needle-${id}">${P.needle(V, M.needleLift(LEVEL0))}</g>` +
    `<g id="screw-${id}">${P.mixtureScrew(V, TURNS)}${P.screwSpring(V, TURNS)}</g>` +
    `<g id="choke-${id}">${P.chokePlate(V, 0)}</g>` +
    P.chokeSpindle(V) +
    `<g id="plate-${id}">${P.throttlePlate(V, 0)}</g>` +
    P.throttleSpindle(V)
  );
}

function centrelines(V) {
  return (
    K.centerline(V, [-60, 0], [48, 0], 0) +
    K.centerline(V, [P.NZ, -6], [P.NZ, -43], 0) +
    K.centerline(V, [P.PJ_U, -16], [P.PJ_U, -37.5], 0) +
    K.centerline(V, [P.SCREW_U, -12], [P.SCREW_U, -38], 0) +
    K.centerline(V, [M.NEEDLE_U, -19], [M.NEEDLE_U, -29.5], 0) +
    K.centerline(V, [M.SPINDLE_U, -4], [M.SPINDLE_U, 4], 0) +
    K.centerline(V, [M.CHOKE_U, -3.5], [M.CHOKE_U, 3.5], 0) +
    K.centerline(V, [M.PIVOT[0] - 3.5, M.PIVOT[1]], [M.PIVOT[0] + 3.5, M.PIVOT[1]], 0) +
    K.centerline(V, [41, 25], [47, 25], 0) +
    K.centerline(V, [41, -25], [47, -25], 0)
  );
}

// Phantoms: the throttle plate wide open and the choke shut, the far ends of their travel.
function phantoms(V) {
  const wot = P.platePoint(M.SPINDLE_U, 90, M.PLATE_R);
  const shut = (s) => P.platePoint(M.CHOKE_U, M.chokePhi(1), s * 13.15);
  const plate = K.line(V, [[M.SPINDLE_U - M.PLATE_R, 0.6], [wot[0], 0.6], [wot[0], -0.6], [M.SPINDLE_U - M.PLATE_R, -0.6]], "phan", true);
  const choke = K.line(V, [shut(1), shut(-1)], "phan");
  return `<g data-role="phantom">${plate}${choke}</g>`;
}

// ---------------------------------------------------------------- main view: AXIAL SECTION, 2:1
const mainView =
  `<g data-geom="main">` +
  fuelLayer(VM, "main") +
  staticParts(VM) +
  movingParts(VM, "main") +
  P.threadRoots(VM) +
  phantoms(VM) +
  centrelines(VM) +
  `</g>`;

const mainDims =
  K.dim(VM, [-58, 20], [46, 32], { dir: "h", off: 80 - VM.p([-58, 20])[1] }) +
  K.dim(VM, [-54.5, 21.5], [P.NZ - 6, -66], { dir: "v", off: 44 - VM.p([-54.5, 21.5])[0] }) +
  K.dim(VM, [46, 13], [46, -13], { dir: "v", off: 20, prefix: "Ø" }) +
  K.dim(VM, [-45, -58], [19, -58], { dir: "h", off: 506 - VM.p([-45, -58])[1] });

// Balloons. Those on the plates are re-drawn each frame so their dots ride on the plates.
const by = (v) => VM.p([0, v])[1];
const LEFT = 64;
const TOP = 112;
const BOTTOM = 532;
const balloonChoke = (c) => K.balloon(VM, P.platePoint(M.CHOKE_U, M.chokePhi(c), 11.4), [LEFT, by(9)], 20, { target: 20 });
const balloonPlate = (th) => K.balloon(VM, P.platePoint(M.SPINDLE_U, M.phiOf(th), 9), [470, TOP], 22, { target: 22 });
const e = P.BOWL_TOP - 4;
const mainBalloons =
  `<g id="b-choke">${balloonChoke(0)}</g>` +
  `<g id="b-plate">${balloonPlate(0)}</g>` +
  K.balloon(VM, [M.CHOKE_U + 1.2, -1.3], [LEFT, by(-3)], 21, { target: 21 }) +
  K.balloon(VM, [P.MAJ_U - 1.05, -14.2], [LEFT, by(-13)], 10, { target: 10 }) +
  K.balloon(VM, [-57.4, P.MA.v], [LEFT, by(-18.25)], 24, { target: 24 }) +
  K.balloon(VM, [-55, -20.3], [LEFT, by(-23.5)], 1, { target: 1 }) +
  K.balloon(VM, [-51.6, -26.4], [LEFT, by(-28.5)], 3, { target: 3 }) +
  K.balloon(VM, [-51, e - 1.4], [LEFT, by(-33.5)], 4, { target: 4 }) +
  K.balloon(VM, [-50, -38.25], [LEFT, by(-38.5)], 25, { target: 25 }) +
  K.balloon(VM, [-44, -48], [LEFT, by(-47)], 2, { target: 2 }) +
  K.balloon(VM, [P.NZ - 1.9, -21], [230, TOP], 8, { target: 8 }) +
  K.balloon(VM, [P.NZ - 1.9, -9.5], [270, TOP], 9, { target: 9 }) +
  K.balloon(VM, [M.SPINDLE_U - 0.8, 1.6], [430, TOP], 23, { target: 23 }) +
  K.balloon(VM, [-14, -37.6], [230, BOTTOM], 15, { target: 15 }) +
  K.balloon(VM, [P.NZ - 4, -64.2], [282, BOTTOM], 5, { target: 5 }) +
  K.balloon(VM, [P.NZ + 3.3, -39.5], [372, BOTTOM], 7, { target: 7 }) +
  K.balloon(VM, [P.NZ + 6, -61.5], [334, BOTTOM], 6, { target: 6 }) +
  K.balloon(VM, [P.PJ_U + 2.6, -27.5], [420, BOTTOM], 11, { target: 11 });

const mainMarks =
  K.detailMark(VM, [-34, -26.5], 14, "B", 90) +
  K.detailMark(VM, [27, -21], 11, "D", -30) +
  K.viewArrow(VM, [-60, 23], [1, 0], "C") +
  K.viewLabel(VM.p([-6, 0])[0], 44, "AXIAL SECTION", "THROUGH THE BORE · SCALE 2:1");

// ---------------------------------------------------------------- DETAIL B: float needle valve, 5:1
function detail(V, box, id, extra = "") {
  return (
    `<g data-geom="${id}" clip-path="url(#clip-${id})"><rect class="paper" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"/>` +
    fuelLayer(V, id) +
    staticParts(V) +
    movingParts(V, id) +
    P.threadRoots(V) +
    extra +
    centrelines(V) +
    `</g><rect class="thin" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="8"/>`
  );
}
const setLine = `<g data-role="phantom">${K.line(VB, [[-42.5, M.LEVEL_SET], [-24.5, M.LEVEL_SET]], "phan")}</g>`;
const dimLevel = (level) => K.dim(VB, [-41.5, -26], [-41.5, level], { dir: "v", off: 562 - VB.p([-41.5, -26])[0], text: (-26 - level).toFixed(2), id: "dim-level" });
const detailB =
  detail(VB, B, "B", setLine) +
  `<g id="dim-level-wrap">${dimLevel(LEVEL0)}</g>` +
  K.balloon(VB, [M.NEEDLE_U - 1, -25.5], [800, 66], 18, { target: 18 }) +
  K.balloon(VB, [M.NEEDLE_U + 3.2, -26.6], [800, 112], 19, { target: 19 }) +
  K.balloon(VB, [M.PIVOT[0] + 0.3, M.PIVOT[1] - 0.4], [800, 194], 17, { target: 17 }) +
  K.balloon(VB, [-36.5, M.PIVOT[1] + 0.5], [800, 158], 16, { target: 16 }) +
  K.viewLabel(B.x + B.w / 2, B.y + B.h + 17, "DETAIL B", "FLOAT NEEDLE VALVE · SCALE 5:1");

// ---------------------------------------------------------------- DETAIL D: idle and progression ports, 5:1
const dTop = D.y - 14;
const dimEdge = (theta) => {
  const e = M.plateEdgeU(theta);
  if (e < D.u0 + 1) return "";
  const ev = -M.PLATE_R * Math.cos((M.phiOf(theta) * Math.PI) / 180);
  return K.dim(VD, [M.PROG_U, -13], [e, ev], { dir: "h", off: dTop - VD.p([M.PROG_U, -13])[1], text: (e - M.PROG_U).toFixed(2), id: "dim-edge" });
};
const detailD =
  detail(VD, D, "D") +
  `<g id="dim-edge-wrap">${dimEdge(0)}</g>` +
  K.balloon(VD, [P.PAJ_U + 0.9, -15], [559, 300], 12, { target: 12 }) +
  K.balloon(VD, [P.SCREW_U - 1.8, -26], [559, 380], 13, { target: 13 }) +
  K.balloon(VD, [P.SCREW_U + 3, -30.25], [559, 430], 14, { target: 14 }) +
  K.viewLabel(D.x + D.w / 2, D.y + D.h + 17, "DETAIL D", "IDLE AND PROGRESSION PORTS · 5:1");

// ---------------------------------------------------------------- VIEW C: from the air horn, 1:1
const viewC =
  `<g data-geom="C">${P.endView(VC, { theta: 0, choke: 0 })}</g>` +
  K.dim(VC, [-20.5, 0], [20.5, 0], { dir: "h", off: -(32 * VC.k) - 12, prefix: "Ø" }) +
  K.dim(VC, [-20, 32], [-20, -32], { dir: "v", off: -12 }) +
  K.balloon(VC, [31, -21.6], [752, 650], 26, { target: 26 }) +
  K.viewLabel(VIEWS.C.x, 790, "VIEW C", "FROM THE AIR HORN · SCALE 1:1");

// ---------------------------------------------------------------- DIAGRAM 1: AFR against throttle
const C1 = { x0: 112, x1: 500, y0: 572, y1: 736, tMax: 80, aMin: 4, aMax: 22 };
// ---------------------------------------------------------------- DIAGRAM 2: Bernoulli and the fuel it lifts
const C2 = { x0: 884, x1: 1128, y0: 48, y1: 150, mMax: 20, dpMax: 25, fMax: 1.6 };

function axes(C, xs, ys, fx, fy) {
  let grid = "";
  let labels = "";
  for (const [v, s] of ys) {
    grid += `M${C.x0} ${fy(v)}H${C.x1}`;
    labels += `<text class="t t-sm" x="${C.x0 - 6}" y="${K.r2(fy(v) + 2.7)}" text-anchor="end">${s}</text>`;
  }
  for (const [v, s] of xs) {
    grid += `M${fx(v)} ${C.y0}V${C.y1}`;
    labels += `<text class="t t-sm" x="${fx(v)}" y="${C.y1 + 11}" text-anchor="middle">${s}</text>`;
  }
  return { grid, labels };
}
const c1x = (t) => K.r2(C1.x0 + (t / C1.tMax) * (C1.x1 - C1.x0));
const c1y = (a) => K.r2(C1.y1 - ((Math.min(C1.aMax, Math.max(C1.aMin, a)) - C1.aMin) / (C1.aMax - C1.aMin)) * (C1.y1 - C1.y0));
function chart1() {
  const xs = [0, 10, 20, 30, 40, 50, 60, 70, 80].map((t) => [t, t]);
  const ys = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((a) => [a, a]);
  const { grid, labels } = axes(C1, xs, ys, c1x, c1y);
  const mid = (C1.y0 + C1.y1) / 2;
  return (
    `<g data-role="chart"><rect class="paper" x="${C1.x0}" y="${C1.y0}" width="${C1.x1 - C1.x0}" height="${C1.y1 - C1.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="ctr" d="M${C1.x0} ${c1y(M.STOICH)}H${C1.x1}"/>` +
    `<g clip-path="url(#clip-c1)"><polyline id="c1-main" class="thin" points=""/><polyline id="c1-choke" class="hid" points=""/><polyline id="c1-afr" class="vis accent" points=""/></g>` +
    `<circle id="c1-dot" class="accent-fill" cx="${C1.x0}" cy="${c1y(14)}" r="2.8"/>` +
    `<rect class="vis" x="${C1.x0}" y="${C1.y0}" width="${C1.x1 - C1.x0}" height="${C1.y1 - C1.y0}"/>` +
    labels +
    `<text class="t t-sm t-mute" x="${(C1.x0 + C1.x1) / 2}" y="${C1.y1 + 24}" text-anchor="middle">THROTTLE θ FROM THE STOP, °</text>` +
    `<text class="t t-sm t-mute" x="84" y="${mid}" text-anchor="middle" transform="rotate(-90 84 ${mid})">AIR–FUEL RATIO, kg/kg</text>` +
    `</g>` +
    K.viewLabel((C1.x0 + C1.x1) / 2, 788, "DIAGRAM 1", "ACCENT: MIXTURE · THIN: MAIN JET ALONE · DASHED: CHOKE SHUT · CHAIN: 14.7")
  );
}
const c2x = (m) => K.r2(C2.x0 + (m / C2.mMax) * (C2.x1 - C2.x0));
const c2y = (dp) => K.r2(C2.y1 - (Math.min(C2.dpMax, dp) / C2.dpMax) * (C2.y1 - C2.y0));
const c2f = (f) => K.r2(C2.y1 - (Math.min(C2.fMax, f) / C2.fMax) * (C2.y1 - C2.y0));
function chart2() {
  const xs = [0, 4, 8, 12, 16, 20].map((m) => [m, m]);
  const ys = [0, 5, 10, 15, 20, 25].map((d) => [d, d]);
  const { grid, labels } = axes(C2, xs, ys, c2x, c2y);
  let right = "";
  for (const f of [0, 0.4, 0.8, 1.2, 1.6]) right += `<text class="t t-sm" x="${C2.x1 + 6}" y="${K.r2(c2f(f) + 2.7)}">${f.toFixed(1)}</text>`;
  // Bernoulli at the throat, and the fuel the carburettor delivers, along the throttle's sweep
  let dp = "";
  let fuel = "";
  let rich = "";
  for (let t = 0; t <= M.THETA_MAX + 1e-9; t += M.THETA_MAX / 80) {
    const r = M.solve(t, { level: LEVEL0 });
    dp += `${c2x(r.mEng * 1000)},${c2y(r.dpThroat / 100)} `;
    fuel += `${c2x(r.mEng * 1000)},${c2f(r.fuel * 1000)} `;
  }
  rich = `M${c2x(0)} ${c2f(0)}L${c2x(C2.mMax)} ${c2f(C2.mMax / M.STOICH)}`;
  const mid = (C2.y0 + C2.y1) / 2;
  return (
    `<g data-role="chart"><rect class="paper" x="${C2.x0}" y="${C2.y0}" width="${C2.x1 - C2.x0}" height="${C2.y1 - C2.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="ctr" d="${rich}"/>` +
    `<polyline class="thin" points="${dp.trim()}"/>` +
    `<polyline class="vis accent" points="${fuel.trim()}"/>` +
    `<circle id="c2-dp" class="dot" cx="${C2.x0}" cy="${C2.y1}" r="2.2"/>` +
    `<circle id="c2-dot" class="accent-fill" cx="${C2.x0}" cy="${C2.y1}" r="2.8"/>` +
    `<rect class="vis" x="${C2.x0}" y="${C2.y0}" width="${C2.x1 - C2.x0}" height="${C2.y1 - C2.y0}"/>` +
    labels +
    right +
    `<text class="t t-sm t-mute" x="${(C2.x0 + C2.x1) / 2}" y="${C2.y1 + 24}" text-anchor="middle">AIR FLOW, g/s</text>` +
    `<text class="t t-sm t-mute" x="856" y="${mid}" text-anchor="middle" transform="rotate(-90 856 ${mid})">THROAT Δp, mbar</text>` +
    `<text class="t t-sm t-mute" x="1162" y="${mid}" text-anchor="middle" transform="rotate(90 1162 ${mid})">FUEL, g/s</text>` +
    `</g>` +
    K.viewLabel((C2.x0 + C2.x1) / 2, 194, "DIAGRAM 2", "THIN: Δp = ½ρv² AT THE THROAT · ACCENT: FUEL · CHAIN: AIR/14.7")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const j = (d) => `#${Math.round(d * 100)}`;
const BOM = [
  ["1", "BODY, Ø26 BORE, Ø20 VENTURI", "EN AC-46000 DIE CAST.", "1"],
  ["2", "FLOAT BOWL", "EN AC-46000 DIE CAST.", "1"],
  ["3", "BOWL GASKET 0.8", "NBR 70", "1"],
  ["4", "SCREW M4×10 ISO 7045", "STEEL 4.8, ZINC", "2"],
  ["5", "DRAIN PLUG M10×1.25", "CuZn39Pb3", "1"],
  ["6", "SEALING WASHER 10×14×1", "Cu-ETP", "1"],
  ["7", `MAIN JET ${j(M.JETS.main)} M6×0.75`, "CuZn39Pb3", "1"],
  ["8", "EMULSION TUBE, 6× Ø0.8 BLEEDS", "CuZn39Pb3", "1"],
  ["9", "MAIN NOZZLE Ø5×2.6", "CuZn39Pb3", "1"],
  ["10", `MAIN AIR JET Ø${M.JETS.mainAir}`, "CuZn39Pb3", "1"],
  ["11", `PILOT JET ${j(M.JETS.pilot)} M5`, "CuZn39Pb3", "1"],
  ["12", `PILOT AIR JET Ø${M.JETS.pilotAir}`, "CuZn39Pb3", "1"],
  ["13", "MIXTURE SCREW M5×0.5, 10°", "X10CrNi18-8", "1"],
  ["14", "SCREW SPRING Ø6, 3 TURNS", "EN 10270-1 Ø0.5", "1"],
  ["15", "FLOAT, HOLLOW, 0.8 WALL", "POM-C", "1"],
  ["16", "FLOAT ARM 0.8", "CuZn37 R350", "1"],
  ["17", "HINGE PIN Ø2×12", "X10CrNi18-8", "1"],
  ["18", "FLOAT NEEDLE, FKM TIP", "X46Cr13", "1"],
  ["19", "NEEDLE SEAT M6×0.75, Ø1.5", "CuZn39Pb3", "1"],
  ["20", "CHOKE PLATE 0.8, 2× Ø6.5", "CuZn37", "1"],
  ["21", "CHOKE SPINDLE Ø4", "X10CrNi18-8", "1"],
  ["22", "THROTTLE PLATE Ø26.1×1.2", "CuZn37", "1"],
  ["23", "THROTTLE SPINDLE Ø5", "X10CrNi18-8", "1"],
  ["24", "BALL PLUG Ø2", "100Cr6", "2"],
  ["25", "BOWL VENT TUBE Ø4×0.5", "CuZn37", "1"],
  ["26", "FUEL INLET NIPPLE Ø6", "CuZn37", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const ROW = 15;
const bomTop = TB.y - (18 + BOM.length * ROW);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 30, align: "center", title: "ITEM" },
    { w: 210, title: "DESCRIPTION" },
    { w: 130, title: "MATERIAL" },
    { w: 30, align: "center", title: "QTY" },
  ],
  BOM,
  { rowH: ROW }
);

const thr = M.mainThreshold(M.LEVEL_SET);
const notes = K.notes(790, 222, "NOTES", [
  `BERNOULLI: THROAT Δp = ½ρv²; THE BOWL IS VENTED, SO Δp LIFTS THE FUEL.`,
  `MAIN JET FLOWS ONCE Δp > ρgh = ${K.fmt(thr, 0)} Pa (h = ${M.BLEED_V - M.LEVEL_SET} mm, LEVEL TO BLEEDS).`,
  `BELOW THAT, THE PILOT CIRCUIT: IDLE PORT, THEN 2 PROGRESSION PORTS.`,
  `250 cm³ SINGLE, η 0.85, ROAD LOAD 1400–9000 rpm; PETROL 740 kg/m³.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "CARBURETTOR · AXIAL SECTION", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-017", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "2:1" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · g/s · mbar" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE PLATE · ← → THROTTLE · C CHOKE · [ ] MIXTURE SCREW", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const clipRect = (id, b) => `<clipPath id="clip-${id}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8"/></clipPath>`;
const [tcx, tcy] = VC.p([0, 0]);
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="fuel" patternUnits="userSpaceOnUse" width="2.6" height="2.6"><circle class="fuel-dot" cx="0.65" cy="0.65" r="0.6"/><circle class="fuel-dot" cx="1.95" cy="1.95" r="0.6"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  clipRect("B", B) +
  clipRect("D", D) +
  `<clipPath id="clip-bore"><circle cx="${tcx}" cy="${tcy}" r="${K.r2(13 * VC.k)}"/></clipPath>` +
  `<clipPath id="clip-throat"><circle cx="${tcx}" cy="${tcy}" r="${K.r2(10 * VC.k)}"/></clipPath>` +
  `<clipPath id="clip-c1"><rect x="${C1.x0}" y="${C1.y0}" width="${C1.x1 - C1.x0}" height="${C1.y1 - C1.y0}"/></clipPath>` +
  `</defs>`;

const [sx, sy] = VM.p([M.SPINDLE_U, 0]);
const hit =
  `<circle class="hit" data-drag="main" cx="${sx}" cy="${sy}" r="${K.r2(15 * VM.k)}"/>` +
  `<rect class="hit" data-drag="D" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a float-bowl carburettor cut through its bore. Drag the throttle plate or use the arrow keys to open the throttle; C works the choke and the square brackets turn the mixture screw. The fuel, the float, the needle valve, the readout and both diagrams follow." ` +
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
  chart1() +
  chart2() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the throttle plate · <kbd>←</kbd> <kbd>→</kbd> throttle · <kbd>C</kbd> choke · <kbd>[</kbd> <kbd>]</kbd> mixture screw · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "carburettor.html"), {
  title: "Carburettor Section",
  description: "A live engineering drawing of a float-bowl carburettor: the throttle, choke, float and needle valve move, and the fuel each circuit lifts comes from Bernoulli's principle.",
  svg,
  bar,
  css: `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#fuel)}.bp-sheet .fuel-dot{fill:var(--bp-accent)}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet [data-drag]{cursor:grab}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__C1__", JSON.stringify(C1)).replace("__C2__", JSON.stringify(C2)).replace("__B__", JSON.stringify(B)).replace("__D__", JSON.stringify(D)),
});
console.log(`carburettor.html  ${(size / 1024).toFixed(0)} KB  idle AFR ${idle.afr.toFixed(1)}  level ${LEVEL0.toFixed(2)}  WOT AFR ${M.solve(M.THETA_MAX).afr.toFixed(1)}`);
