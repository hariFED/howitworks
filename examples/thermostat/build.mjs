// Builds thermostat.html: a live A2 drawing of a wax-pellet coolant thermostat in its housing.
//   node examples/thermostat/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as X from "./extra.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k5 = 5 * K.PX_PER_MM;

// ---------------------------------------------------------------- views
const VIEWS = {
  main: { x: 258, y: 255, scale: 2 },
  B: { x: 644, y: 46 - 0.5 * k5, scale: 5 }, // the pellet, in the cup's own frame
  D: { x: 545 + 27 * k5, y: 525 + 3.5 * k5, scale: 5 }, // jiggle valve and seat, world frame
  C: { x: 868, y: 104, scale: 1 },
};
const VM = K.view(VIEWS.main);
const VB = K.view(VIEWS.B);
const VD = K.view(VIEWS.D);
const VC = K.view(VIEWS.C);
const winB = (() => {
  const [x0, y0] = VB.p([-9.5, -0.5]);
  const [x1, y1] = VB.p([9.5, -41]);
  return { x: x0, y: y0, w: K.r2(x1 - x0), h: K.r2(y1 - y0) };
})();
const winD = (() => {
  const [x0, y0] = VD.p([-27, 3.5]);
  const [x1, y1] = VD.p([-8, -12]);
  return { x: x0, y: y0, w: K.r2(x1 - x0), h: K.r2(y1 - y0) };
})();

// ---------------------------------------------------------------- shared drawing
function coolant(V, id, flow = false) {
  return (
    `<g data-role="fluid">` +
    `<path id="tint-e-${id}" class="tint" fill-opacity="0.2" d="${P.airPath(V, P.engineSide)}"/>` +
    `<path id="tint-r-${id}" class="tint" fill-opacity="0.12" d="${P.airPath(V, P.radiatorSide)}"/>` +
    `<path id="tint-b-${id}" class="tint" fill-opacity="0.2" d="${P.airPath(V, P.bypassSide)}"/>` +
    (flow
      ? `<path id="flow-r-${id}" class="flow" d="${P.flowPath(V, P.flowRad)}"/><path id="flow-b-${id}" class="flow" d="${P.flowPath(V, P.flowByp)}"/>`
      : "") +
    `</g>`
  );
}

const staticParts = (V) =>
  P.housing(V) + P.cover(V) + P.seal(V) + P.bolt(V) + P.sensorWasher(V) + P.sensor(V) + P.hose(V) + P.clip(V) + P.flange(V) + P.stirrup(V) + P.jigglePin(V);

// Moving: springs re-drawn, the pellet assembly and the bypass disc translated, wax and sock re-drawn.
const moving = (V, id) =>
  `<g id="spring-${id}">${P.mainSpring(V, 0)}</g>` +
  `<g id="bpspring-${id}">${P.bypassSpring(V, 0)}</g>` +
  `<g id="mv-${id}">${P.pellet(V)}<g id="in-${id}">${P.inside(V, 0, 0)}</g></g>` +
  `<g id="bpd-${id}">${P.bypassDisc(V)}</g>` +
  P.pin(V) +
  P.bridge(V);

function centrelines(V) {
  return K.centerline(V, [0, P.BOTTOM - 4], [0, 18], 0) + K.centerline(V, [P.BOLT_U, -21], [P.BOLT_U, 15.5], 0) + K.centerline(V, [14, P.SENSOR_V], [58, P.SENSOR_V], 0) + K.centerline(V, [40, 22], [P.HOSE_END + 4, 22], 0);
}

// ---------------------------------------------------------------- main view: SECTION A-A, 2:1
const mainView =
  `<g data-geom="main">` +
  coolant(VM, "main", true) +
  staticParts(VM) +
  moving(VM, "main") +
  `<g data-role="phantom">${P.phantomOpen(VM)}</g>` +
  centrelines(VM) +
  `</g>`;

const mainDims =
  K.dim(VM, [-P.PORT_R, P.BOTTOM], [P.PORT_R, P.BOTTOM], { dir: "h", off: 18, prefix: "Ø" });

// Static balloons sit left, right and above; those on the bypass parts ride in with the inlet.
const mainBalloons =
  K.balloon(VM, [P.BOLT_U - 2, 12], [62, 166], 4, { target: 4 }) +
  K.balloon(VM, [P.BOLT_U - 5, 8.8], [62, 200], 5, { target: 5 }) +
  K.balloon(VM, [-30, -66], [62, 540], 1, { target: 1 }) +
  K.balloon(VM, [48, 41.85], [430, 64], 23, { target: 23 }) +
  K.balloon(VM, [58, 40.2], [476, 64], 22, { target: 22 }) +
  K.balloon(VM, [54, 35.5], [522, 104], 2, { target: 2 }) +
  K.balloon(VM, [10, 11.75], [522, 140], 7, { target: 7 }) +
  K.balloon(VM, [14, SPRING_LOW()], [522, 386], 14, { target: 14 }) +
  K.balloon(VM, [42, P.SENSOR_V + 7], [522, 420], 20, { target: 20 }) +
  K.balloon(VM, [38.75, P.SENSOR_V - 7.6], [522, 512], 21, { target: 21 }) +
  `<g id="mvb-main">` +
  K.balloon(VM, [5.5, -38.4], [44, 404], 18, { target: 18 }) +
  K.balloon(VM, [-3.1, P.BP_DISC - 0.55], [44, 476], 16, { target: 16 }) +
  `</g><g id="bpb-main">` +
  K.balloon(VM, [-9, P.BP_DISC + 0.75], [44, 440], 17, { target: 17 }) +
  `</g>`;
function SPRING_LOW() {
  return P.SPRING_SEAT + 1;
}

const mainMarks =
  K.viewArrow(VM, [-12, 37], [0, 1], "C") +
  K.viewLabel(258, 44, "SECTION A-A", "SCALE 2:1 · DRAWN COLD, VALVE SHUT; PHANTOM: FULLY OPEN");

// ---------------------------------------------------------------- DETAIL B: the pellet, 5:1, riding with it
const detailB =
  `<g data-geom="B" clip-path="url(#clip-B)"><rect class="paper" x="${winB.x}" y="${winB.y}" width="${winB.w}" height="${winB.h}"/>` +
  `<g data-role="fluid"><path id="tint-e-B" class="tint" fill-opacity="0.2" d="${K.d(VB, K.rect(-12, -45, 12, P.SEAT_V))}"/>` +
  `<path id="tint-r-B" class="tint" fill-opacity="0.12" d="${K.d(VB, K.rect(-12, P.SEAT_V, 12, 2))}"/></g>` +
  `<g id="bpspring-B">${P.bypassSpring(VB, 0)}</g>` +
  P.pellet(VB) +
  `<g id="in-B">${P.inside(VB, 0, 0)}</g>` +
  `<g id="pin-B">${P.pin(VB)}</g>` +
  K.centerline(VB, [0, -43], [0, 1], 0) +
  `</g><rect class="thin" x="${winB.x}" y="${winB.y}" width="${winB.w}" height="${winB.h}" rx="10"/>` +
  K.balloon(VB, [9, -3.25], [762, 66], 13, { target: 13 }) +
  K.balloon(VB, [1.2, -9], [762, 120], 8, { target: 8 }) +
  K.balloon(VB, [5, -12], [762, 170], 12, { target: 12 }) +
  K.balloon(VB, [3.05, -20.25], [762, 226], 24, { target: 24 }) +
  K.balloon(VB, [6.2, -21.5], [762, 276], 9, { target: 9 }) +
  K.balloon(VB, [4.5, -33], [762, 336], 11, { target: 11 }) +
  K.balloon(VB, [7.75, -30], [762, 390], 10, { target: 10 }) +
  K.viewLabel(winB.x + winB.w / 2, winB.y + winB.h + 20, "DETAIL B", "PELLET, RIDING WITH IT · 5:1");

// ---------------------------------------------------------------- DETAIL D: jiggle valve and seat, 5:1 (world)
const liftDim = (L) => X.liftDim(VD, [-10, P.SEAT_V - L], [-17, P.SEAT_V], { text: L.toFixed(1), id: "dim-lift" });
const detailD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${winD.x}" y="${winD.y}" width="${winD.w}" height="${winD.h}"/>` +
  coolant(VD, "D") +
  P.housing(VD) +
  P.cover(VD) +
  P.seal(VD) +
  P.flange(VD) +
  P.stirrup(VD) +
  P.jigglePin(VD) +
  `<g id="spring-D">${P.mainSpring(VD, 0)}</g>` +
  `<g id="mv-D">${P.disc(VD)}</g>` +
  P.bridge(VD) +
  K.centerline(VD, [P.JIG_U, -6], [P.JIG_U, 3], 0) +
  `<g id="dim-lift-wrap">${liftDim(0)}</g>` +
  `</g><rect class="thin" x="${winD.x}" y="${winD.y}" width="${winD.w}" height="${winD.h}" rx="10"/>` +
  K.balloon(VD, [-26.4, -2.3], [528, 560], 3, { target: 3 }) +
  K.balloon(VD, [-20.15, -8], [528, 640], 15, { target: 15 }) +
  K.balloon(VD, [P.JIG_U - 1.2, 0.4], [592, 506], 19, { target: 19 }) +
  K.balloon(VD, [-17.6, -0.75], [648, 506], 6, { target: 6 }) +
  K.viewLabel(winD.x + winD.w / 2, winD.y + winD.h + 20, "DETAIL D", "JIGGLE VALVE, SEAT, LIFT · 5:1");

// ---------------------------------------------------------------- VIEW C: from above, cover removed, 1:1
const cutLine = (() => {
  const [x0, y] = VC.p([-40, 0]);
  const [x1] = VC.p([40, 0]);
  const arrow = (x) =>
    `<path class="vis" d="M${x} ${y}V${y - 14}"/><path class="head" d="M${x} ${y - 16}L${x - 1.75} ${y - 9}L${x + 1.75} ${y - 9}Z"/>` +
    `<text class="t t-lg" x="${x}" y="${y - 21}" text-anchor="middle">A</text>`;
  return (
    `<g data-role="label"><path class="ctr" d="M${x0} ${y}H${x1}"/><path class="vis" d="M${x0} ${y}h8M${x1} ${y}h-8"/>` +
    arrow(x0) +
    arrow(x1) +
    `</g>`
  );
})();
const stamp = (() => {
  const [x, y] = VC.p([0, -22.4]);
  const [x2, y2] = VC.p([0, 21.4]);
  return `<g data-role="engraved"><text class="t t-sm" x="${x}" y="${K.r2(y + 2.6)}" text-anchor="middle">${M.T_OPEN}°C</text><text class="t t-sm" x="${x2}" y="${K.r2(y2 + 2.6)}" text-anchor="middle">↑ AIR</text></g>`;
})();
const viewC =
  `<g data-geom="C">${P.planView(VC)}${K.centerMark(VC, [0, 0], 29, 4)}</g>` +
  stamp +
  cutLine +
  K.dim(VC, [-29, 0], [29, 0], { dir: "h", off: 29 * VC.k + 14, prefix: "Ø" }) +
  K.viewLabel(VIEWS.C.x, 198, "VIEW C", "COVER 2 REMOVED · 1:1");

// ---------------------------------------------------------------- DIAGRAM 1: lift against pellet temperature
const CH = { x0: 108, x1: 452, y0: 614, y1: 742, T0: 80, T1: 104, L1: 10 };
const chX = (T) => K.r2(CH.x0 + ((T - CH.T0) / (CH.T1 - CH.T0)) * (CH.x1 - CH.x0));
const chY = (L) => K.r2(CH.y1 - (L / CH.L1) * (CH.y1 - CH.y0));
const dv0 = M.V_CRACK - M.V_WAX; // wax ΔV (from 20 °C) when the pin starts to move
function chart() {
  let grid = "";
  let labels = "";
  for (let L = 0; L <= CH.L1; L += 2) {
    grid += `M${CH.x0} ${chY(L)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 6}" y="${K.r2(chY(L) + 2.7)}" text-anchor="end">${L}</text>`;
  }
  for (let T = CH.T0; T <= CH.T1; T += 4) {
    grid += `M${chX(T)} ${CH.y0}V${CH.y1}`;
    labels += `<text class="t t-sm" x="${chX(T)}" y="${CH.y1 + 11}" text-anchor="middle">${T}</text>`;
  }
  let ticks = "";
  for (let dv = 100; dv <= 250; dv += 50) {
    const y = chY((dv - dv0) / M.PIN_A);
    ticks += `M${CH.x1} ${y}h4`;
    labels += `<text class="t t-sm" x="${CH.x1 + 7}" y="${K.r2(y + 2.7)}">${dv}</text>`;
  }
  const pts = (list) => list.map(([T, L]) => `${chX(T)},${chY(L)}`).join(" ");
  const mid = (CH.y0 + CH.y1) / 2;
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 24}" text-anchor="middle">PELLET TEMPERATURE, °C</text>`;
  labels += `<text class="t t-sm t-mute" x="78" y="${mid}" text-anchor="middle" transform="rotate(-90 78 ${mid})">LIFT, mm</text>`;
  labels += `<text class="t t-sm t-mute" x="494" y="${mid}" text-anchor="middle" transform="rotate(-90 494 ${mid})">WAX ΔV, mm³</text>`;
  labels += `<text class="t t-sm" x="${chX(M.T_OPEN)}" y="${CH.y0 - 5}" text-anchor="middle">${M.T_OPEN}</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="hid" d="M${chX(M.T_OPEN)} ${CH.y0}V${CH.y1}"/>` +
    `<polyline class="thin" points="${pts(M.branch(true, CH.T0, CH.T1))}"/>` +
    `<polyline class="hid" points="${pts(M.branch(false, CH.T0, CH.T1))}"/>` +
    `<polyline id="trace" class="vis accent" points=""/>` +
    `<circle id="chart-dot" class="accent-fill" cx="${chX(20)}" cy="${CH.y1}" r="2.6"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin" d="${ticks}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 798, "DIAGRAM 1", "LIFT vs PELLET T · THIN: HEATING · DASHED: COOLING · ACCENT: THIS RUN")
  );
}

// ---------------------------------------------------------------- data, notes, parts list, title block
function dataTable(x, y, w, rows) {
  const rh = 15;
  let out = `<g data-role="notes"><text class="t t-head" x="${x}" y="${y - 6}">THERMOSTAT DATA</text><rect class="paper" x="${x}" y="${y}" width="${w}" height="${rows.length * rh}"/>`;
  let rules = "";
  rows.forEach(([k, v], i) => {
    const ty = y + i * rh + rh - 4.5;
    out += `<text class="t t-sm" x="${x + 4}" y="${ty}">${k}</text><text class="t t-sm" x="${x + w - 4}" y="${ty}" text-anchor="end">${v}</text>`;
    if (i) rules += `M${x} ${y + i * rh}H${x + w}`;
  });
  return out + `<path class="thin" d="${rules}"/><rect class="vis" x="${x}" y="${y}" width="${w}" height="${rows.length * rh}"/></g>`;
}
const fullOpen = M.branch(true, 80, 110, 600).find(([, L]) => L >= M.LIFT_MAX - 0.01)[0];
const data = dataTable(976, 52, 194, [
  ["STARTS TO OPEN", `${M.T_OPEN} °C`],
  ["FULLY OPEN", `${K.fmt(fullOpen, 0)} °C`],
  ["LIFT (STOP)", `${M.LIFT_MAX} mm`],
  ["HYSTERESIS", `${M.HYST} K`],
  ["SEAT / BYPASS", `Ø${M.SEAT_D} / Ø${M.BYPASS_D}`],
  ["SPRING, SHUT–OPEN", `${M.springForce(0)}–${K.fmt(M.springForce(M.LIFT_MAX), 0)} N`],
  ["WAX PRESSURE, OPEN", `${K.fmt(M.waxPressure(M.LIFT_MAX), 1)} MPa`],
  ["JIGGLE ANNULUS", `${K.fmt(M.A_JIGGLE, 1)} mm²`],
]);

const BOM = [
  ["1", "WATER OUTLET HOUSING", "EN AC-46000 (AlSi9Cu3)", "1"],
  ["2", "THERMOSTAT COVER, SPIGOT Ø30", "PA66-GF35", "1"],
  ["3", "FLANGE SEAL Ø58×3", "EPDM 70", "1"],
  ["4", "HEX BOLT M6×25 ISO 4017", "STEEL 8.8, Zn", "3"],
  ["5", "WASHER 6.4 ISO 7089", "STEEL 200 HV", "3"],
  ["6", "FLANGE AND SEAT Ø54×1.5", "DC04 +ZnNi", "1"],
  ["7", "BRIDGE 8×1.5", "DC04 +ZnNi", "1"],
  ["8", "PIN Ø5×44", "X5CrNi18-10", "1"],
  ["9", "SLEEVE (SOCK DIAPHRAGM)", "HNBR 70", "1"],
  ["10", "PELLET CUP Ø17", "CuZn37", "1"],
  ["11", `WAX CHARGE ${K.fmt(M.V_WAX / 1000, 2)} cm³`, "PARAFFIN + Cu POWDER", "1"],
  ["12", "PISTON GUIDE", "CuZn39Pb3", "1"],
  ["13", "VALVE DISC Ø37.6×1.5", "DC04 +ZnNi", "1"],
  ["14", "MAIN SPRING Ø2, 6 TURNS", "EN 10270-1 SH", "1"],
  ["15", "SPRING STIRRUP 8×1.5", "DC04 +ZnNi", "1"],
  ["16", "BYPASS STEM Ø5", "CuZn39Pb3", "1"],
  ["17", "BYPASS DISC Ø25×1.5", "DC04 +ZnNi", "1"],
  ["18", "BYPASS SPRING Ø0.8, 4 TURNS", "EN 10270-1 SH", "1"],
  ["19", "JIGGLE PIN Ø2.4", "CuZn37", "1"],
  ["20", "COOLANT TEMP. SENSOR M12×1.5", "BOUGHT OUT (NTC)", "1"],
  ["21", "SEALING RING A12×16 DIN 7603", "Cu", "1"],
  ["22", "RADIATOR HOSE 30×4.5", "EPDM", "1"],
  ["23", "HOSE CLIP 32–50 DIN 3017", "W4 STAINLESS", "1"],
  ["24", "BACK-UP RING 5×7×1.5", "PTFE", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const bomTop = TB.y - (18 + BOM.length * 16);
const bom = K.table(TB.x, bomTop, [{ w: 34, align: "center", title: "ITEM" }, { w: 196, title: "DESCRIPTION" }, { w: 136, title: "MATERIAL" }, { w: 34, align: "center", title: "QTY" }], BOM);

const notes = K.notes(790, 234, "NOTES", [
  `WAX ${K.fmt(M.V_WAX, 0)} mm³ GAINS ${M.DV_MELT * 100} % MELTING ${M.MELT[0]}–${M.MELT[1]} °C; LIFT = ΔV / ${K.fmt(M.PIN_A, 1)} mm² (PIN Ø${M.PIN_D}).`,
  `PIN 8 BEARS ON BRIDGE 7: THE CUP MOVES DOWN, VALVE 13 OPENS, BYPASS 17 SHUTS.`,
  `PUMP ${M.PUMP} L/min SPLITS BY PATH AREA; BYPASS SHUT FROM ${M.BYPASS_GAP} mm LIFT.`,
  `ENGINE ${M.C_ENGINE} kJ/K, RADIATOR ${M.G_AIR} kW/K AIR SIDE; TOUR 15–30× REAL TIME.`,
  `PIN, BOLT, STEM, JIGGLE PIN NOT CUT. TWO BOLTS 4 AT ±120° NOT SHOWN.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "WAX THERMOSTAT · SECTION A-A", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-010", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "2:1" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · °C · kW" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG UP/DOWN TO SET ENGINE LOAD · H HILL · R COLD START · S SPEED", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="cool" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="air-dot" cx="0.8" cy="0.8" r="0.62"/><circle class="air-dot" cx="2.4" cy="2.4" r="0.62"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-B"><rect x="${winB.x}" y="${winB.y}" width="${winB.w}" height="${winB.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-D"><rect x="${winD.x}" y="${winD.y}" width="${winD.w}" height="${winD.h}" rx="10"/></clipPath>` +
  `</defs>`;

const [hx0, hy0] = VM.p([-48, 42]);
const [hx1, hy1] = VM.p([P.HOSE_END, P.BOTTOM]);
const hit = `<rect class="hit" data-drag="main" x="${hx0}" y="${hy0}" width="${K.r2(hx1 - hx0)}" height="${K.r2(hy1 - hy0)}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a wax-pellet engine coolant thermostat in its housing, cut through its axis. Drag up or down, or use the arrow keys, to set the engine load; the wax melts, the valve opens and the coolant temperature settles near 88 degrees." ` +
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
  data +
  chart() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag up/down: engine load · <kbd>↑</kbd> <kbd>↓</kbd> load · <kbd>H</kbd> hill · <kbd>R</kbd> cold start · <kbd>S</kbd> speed</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "thermostat.html"), {
  title: "Wax Thermostat Section",
  description: "A live engineering drawing of an engine coolant thermostat: the wax melts, the pin pushes the valve open and the engine settles near 88 °C.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#cool)}.bp-sheet .air-dot{fill:var(--bp-accent)}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}` +
    `.bp-sheet .flow{fill:none;stroke:var(--bp-accent);stroke-width:1.3px;stroke-dasharray:3 6;stroke-linecap:round;stroke-linejoin:round}`,
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
console.log(`thermostat.html  ${(size / 1024).toFixed(0)} KB  wax ${M.V_WAX.toFixed(0)} mm³  full open ${fullOpen.toFixed(1)} °C`);
