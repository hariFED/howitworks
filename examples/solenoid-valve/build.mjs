// Builds solenoid-valve.html: a live A2 drawing of a pilot-operated 2/2 NC solenoid valve, G1/2.
//   node examples/solenoid-valve/build.mjs
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
const PC = { u: 4, v: 37.5 }; // Detail P's centre, world
const DP = { cx: 600, cy: 545, r: 150 };
const VIEWS = {
  main: { x: 210, y: 520, scale: 2 },
  P: { x: DP.cx - PC.u * k5, y: DP.cy + PC.v * k5, scale: 5 },
  C: { x: 210, y: 652, scale: 2 },
};
const VM = K.view(VIEWS.main);
const VP = K.view(VIEWS.P);
const VC = K.view(VIEWS.C);
const CH = { x0: 470, x1: 760, y0: 52, y1: 212, tMax: M.TOUR.end * 1000, iMax: 0.5, lMax: 4, qMax: 50, strip: 46, gap: 11 };
const FG = { x0: 832, x1: 1160, y0: 52, y1: 192, gMax: 3.5, fMax: 30 };

// ---------------------------------------------------------------- the valve, shared by the section and Detail P
function water(V, id) {
  return (
    `<g data-role="fluid">` +
    `<path id="w-c-${id}" class="tint tint-c" fill-opacity="0.55" d="${P.waterPath(V, P.chamberWater)}"/>` +
    `<path id="w-in-${id}" class="tint tint-in" fill-opacity="0.55" d="${P.waterPath(V, P.inletWater(0))}"/>` +
    `<path id="w-out-${id}" class="tint tint-out" fill-opacity="0.14" d="${P.waterPath(V, P.outletWater(0))}"/>` +
    `</g>`
  );
}

function valve(V, id) {
  return (
    water(V, id) +
    P.body(V) +
    `<g id="dia-${id}">${P.diaphragm(V, 0)}</g>` +
    `<g id="mz-${id}">${P.sleeve(V)}${P.washer(V)}${P.bleedBush(V)}</g>` +
    P.cover(V) +
    P.oring(V) +
    P.tubeBase(V) +
    P.tube(V) +
    `<g id="mx-${id}">${P.plunger(V)}${P.seal(V)}</g>` +
    `<g id="spring-${id}">${P.spring(V, 0)}</g>` +
    P.housing(V) +
    P.frame(V) +
    P.yoke(V) +
    P.bobbin(V) +
    P.winding(V) +
    P.pole(V) +
    P.coilWasher(V) +
    P.nut(V)
  );
}

// ---------------------------------------------------------------- main view: axial section through both ports, 2:1
const mainView =
  `<g data-geom="main">` +
  valve(VM, "main") +
  K.centerline(VM, [0, -2], [0, 108], 0) +
  K.centerline(VM, [-38, M.PORT_V], [38, M.PORT_V], 0) +
  `</g>`;

const gapDim = (x) =>
  K.dim(VM, [M.PLUNGER_R, M.POLE_FACE], [M.PLUNGER_R, M.PLUNGER_TOP + x], { dir: "v", off: 312 - VM.p([M.PLUNGER_R, 0])[0], text: (M.STROKE - x).toFixed(2), id: "dim-gap" });

const mainDims =
  K.dim(VM, [36, 0], [3, 106], { dir: "v", off: 380 - VM.p([36, 0])[0] }) +
  K.dim(VM, [-36, M.PORT_V - 10.48], [-36, M.PORT_V + 10.48], { dir: "v", off: -16, text: "G1/2" }) +
  K.dim(VM, [-21, 98], [21, 98], { dir: "h", off: 75 - VM.p([0, 98])[1] }) +
  `<g id="dim-gap-wrap">${gapDim(0)}</g>`;

// Static balloons: every dot sits where its part is at every lift.
const R = 346; // right column
const Lx = 64; // left column
const mainBalloons =
  K.balloon(VM, [3.6, 102.5], [R, 112], 21, { target: 21 }) +
  K.balloon(VM, [5.2, 98.8], [R, 134], 20, { target: 20 }) +
  K.balloon(VM, [1.75, M.POLE_FACE - 0.2], [R, 180], 14, { target: 14 }) +
  K.balloon(VM, [3.5, 89], [R, 158], 11, { target: 11 }) +
  K.balloon(VM, [12, 56.5], [R, 290], 15, { target: 15 }) +
  K.balloon(VM, [14, 54.5], [R, 312], 18, { target: 18 }) +
  K.balloon(VM, [10.5, 50.2], [R, 334], 9, { target: 9 }) +
  K.balloon(VM, [10.1, 47.1], [R, 356], 8, { target: 8 }) +
  K.balloon(VM, [30, 26], [R, 390], 1, { target: 1 }) +
  K.balloon(VM, [-18, 82], [Lx, 140], 17, { target: 17 }) +
  K.balloon(VM, [-12, 76], [Lx, 162], 16, { target: 16 }) +
  K.balloon(VM, [-20, 66], [Lx, 184], 19, { target: 19 }) +
  K.balloon(VM, [-6.25, 62], [Lx, 228], 10, { target: 10 }) +
  K.balloon(VM, [-3.8, 58], [Lx, 250], 12, { target: 12 }) +
  K.balloon(VM, [-21, 42], [Lx, 330], 6, { target: 6 });

// The detail mark: a circle round the pilot, its letter outside the valve on a short leader.
const markR = DP.r / k5;
const [mcx, mcy] = VM.p([PC.u, PC.v]);
const mR = markR * VM.k;
const letterAt = [96, 382];
const edge = [K.r2(mcx - mR), K.r2(mcy + 3)];
const mainMarks =
  `<g data-role="label"><circle class="thin mark" cx="${mcx}" cy="${mcy}" r="${K.r2(mR)}"/>` +
  `<path class="thin" d="M${edge[0]} ${edge[1]}L${letterAt[0] + 9} ${letterAt[1] - 4}"/>` +
  `<text class="t t-lg" x="${letterAt[0]}" y="${letterAt[1]}" text-anchor="middle">P</text></g>` +
  K.viewArrow(VM, [12, 98], [0, 1], "C") +
  K.viewLabel(112, 46, "AXIAL SECTION", "SCALE 2:1");

// ---------------------------------------------------------------- DETAIL P: the pilot, 5:1
const detailP =
  `<g data-geom="P" clip-path="url(#clip-P)"><circle class="paper" cx="${DP.cx}" cy="${DP.cy}" r="${DP.r}"/>` +
  valve(VP, "P") +
  `<g data-role="phantom">${P.phantomOpen(VP, M.STROKE - 0.06, M.STROKE)}</g>` +
  K.centerline(VP, [0, 22], [0, 53], 0) +
  K.centerline(VP, [M.BLEED_U, 32.5], [M.BLEED_U, 37], 0) +
  `</g><circle class="thin" cx="${DP.cx}" cy="${DP.cy}" r="${DP.r}"/>` +
  K.viewLabel(DP.cx, DP.cy + DP.r + 20, "DETAIL P", "PILOT AND BLEED · SCALE 5:1");

const detailBalloons = P.PILOT_BALLOONS.map((b) => `<g id="pb-${b.n}">${P.pilotBalloon(VP, b, 0, 0)}</g>`).join("");
const liftDim = (z) => K.dim(VP, [-8, M.SEAT_TOP], [-8, M.SEAT_TOP + z], { dir: "v", off: 432 - VP.p([-8, 0])[0], text: `h=${z.toFixed(2)}`, id: "dim-lift" });
const detailDims = `<g id="dim-lift-wrap">${liftDim(0)}</g>`;

// ---------------------------------------------------------------- VIEW C: from above, 2:1
const screwMarks = [[-19, -19], [19, -19], [19, 19], [-19, 19]].map((c) => K.centerMark(VC, c, 4.25, 2)).join("");
const [p1x, p1y] = VC.p([-30.5, 0]);
const [p2x, p2y] = VC.p([30.5, 0]);
const viewC =
  `<g data-geom="C">${P.plan(VC)}` +
  K.centerline(VC, [-38, 0], [38, 0], 0) +
  K.centerline(VC, [0, -27], [0, 27], 0) +
  screwMarks +
  `<g data-role="engraved"><text class="t t-lg" x="${p1x}" y="${p1y + 13}" text-anchor="middle">1</text><text class="t t-lg" x="${p2x}" y="${p2y + 13}" text-anchor="middle">2</text>` +
  `<text class="t t-sm" x="${VC.p([0, -11.5])[0]}" y="${VC.p([0, -11.5])[1]}" text-anchor="middle">24 V DC  10 W</text></g>` +
  `</g>` +
  K.dim(VC, [-36, -16.17], [36, -16.17], { dir: "h", off: 772 - VC.p([0, -16.17])[1] }) +
  K.dim(VC, [-25, -25], [-25, 25], { dir: "v", off: 44 - VC.p([-25, 0])[0] }) +
  K.dim(VC, [-19, 19], [19, 19], { dir: "h", off: 538 - VC.p([0, 19])[1], prefix: "□" }) +
  K.balloon(VC, [21.6, 21.6], [R, 566], 7, { target: 7 }) +
  K.viewLabel(210, 796, "VIEW C", "FROM ABOVE · PORT 1 IN, 2 OUT · SCALE 2:1");

// ---------------------------------------------------------------- DIAGRAM 1: current, lift and flow against time
const sY = (k) => CH.y0 + k * (CH.strip + CH.gap); // top of strip k
const tX = (ms) => K.r2(CH.x0 + (ms / CH.tMax) * (CH.x1 - CH.x0));
function chart1() {
  const strips = [
    { name: "I, A", max: CH.iMax, ticks: [0, 0.25, 0.5], fmt: (v) => v.toFixed(2) },
    { name: "LIFT, mm", max: CH.lMax, ticks: [0, 2, 4], fmt: (v) => String(v) },
    { name: "Q, L/min", max: CH.qMax, ticks: [0, 25, 50], fmt: (v) => String(v) },
  ];
  let out = "";
  let grid = "";
  let labels = "";
  strips.forEach((s, k) => {
    const top = sY(k);
    const bot = top + CH.strip;
    out += `<rect class="paper" x="${CH.x0}" y="${top}" width="${CH.x1 - CH.x0}" height="${CH.strip}"/>`;
    for (const v of s.ticks) {
      const y = K.r2(bot - (v / s.max) * CH.strip);
      grid += `M${CH.x0} ${y}H${CH.x1}`;
      labels += `<text class="t t-sm" x="${CH.x0 - 5}" y="${K.r2(y + 2.7)}" text-anchor="end">${s.fmt(v)}</text>`;
    }
    for (let ms = 0; ms <= CH.tMax; ms += 200) grid += `M${tX(ms)} ${top}V${bot}`;
    const my = K.r2((top + bot) / 2);
    labels += `<text class="t t-sm t-mute" x="433" y="${my}" text-anchor="middle" transform="rotate(-90 433 ${my})">${s.name}</text>`;
    out += `<rect class="vis" x="${CH.x0}" y="${top}" width="${CH.x1 - CH.x0}" height="${CH.strip}"/>`;
  });
  for (let ms = 0; ms <= CH.tMax; ms += 200) labels += `<text class="t t-sm" x="${tX(ms)}" y="${CH.y1 + 11}" text-anchor="middle">${ms}</text>`;
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 23}" text-anchor="middle">TIME t, ms (SHOWN 10× SLOWER)</text>`;
  const traces =
    `<polyline id="tr-i-prev" class="thin" points=""/><polyline id="tr-i" class="vis" points=""/>` +
    `<polyline id="tr-x-prev" class="thin" points=""/><polyline id="tr-x" class="vis" points=""/>` +
    `<polyline id="tr-z-prev" class="thin" points=""/><polyline id="tr-z" class="hid" points=""/>` +
    `<polyline id="tr-q-prev" class="thin" points=""/><polyline id="tr-q" class="vis accent" points=""/>` +
    `<path id="ev-on" class="hid" d="M${tX(M.TOUR.on * 1000)} ${CH.y0}V${CH.y1}"/>` +
    `<path id="ev-off" class="hid" d="M${tX(M.TOUR.off * 1000)} ${CH.y0}V${CH.y1}"/>` +
    `<path id="cursor" class="thin" d="M${CH.x0} ${CH.y0}V${CH.y1}"/>` +
    `<circle id="q-dot" class="accent-fill" cx="${CH.x0}" cy="${sY(2) + CH.strip}" r="2.4"/>`;
  return (
    `<g data-role="chart">${out}<path class="thin grid-line" d="${grid}"/>${traces}${labels}` +
    `<text id="ev-on-t" class="t t-sm" x="${tX(M.TOUR.on * 1000)}" y="${CH.y0 - 4}" text-anchor="middle">ON</text>` +
    `<text id="ev-off-t" class="t t-sm" x="${tX(M.TOUR.off * 1000)}" y="${CH.y0 - 4}" text-anchor="middle">OFF</text></g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 266, "DIAGRAM 1", "SOLID: PLUNGER · DASHED: DIAPHRAGM · ACCENT: WATER · THIN: LAST CYCLE")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: magnet pull against air gap
const gX = (g) => K.r2(FG.x0 + (g / FG.gMax) * (FG.x1 - FG.x0));
const fY = (f) => K.r2(FG.y1 - (Math.min(FG.fMax, Math.max(0, f)) / FG.fMax) * (FG.y1 - FG.y0));
function pullCurve(i) {
  const pts = [];
  for (let g = M.G_RES; g <= M.gapOf(0) + 1e-9; g += 0.025) {
    const f = M.pullAt(i, g);
    if (f > FG.fMax * 1.2) continue;
    pts.push(`${gX(g)},${fY(f)}`);
  }
  return pts.join(" ");
}
function chart2() {
  let grid = "";
  let labels = "";
  for (let f = 0; f <= FG.fMax; f += 5) {
    grid += `M${FG.x0} ${fY(f)}H${FG.x1}`;
    labels += `<text class="t t-sm" x="${FG.x0 - 5}" y="${K.r2(fY(f) + 2.7)}" text-anchor="end">${f}</text>`;
  }
  for (let g = 0; g <= FG.gMax + 1e-9; g += 0.5) {
    grid += `M${gX(g)} ${FG.y0}V${FG.y1}`;
    if (g > 0) labels += `<text class="t t-sm" x="${gX(g)}" y="${FG.y1 + 11}" text-anchor="middle">${g.toFixed(1)}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(FG.x0 + FG.x1) / 2}" y="${FG.y1 + 23}" text-anchor="middle">MAGNETIC AIR GAP g, mm</text>`;
  const my = (FG.y0 + FG.y1) / 2;
  labels += `<text class="t t-sm t-mute" x="800" y="${my}" text-anchor="middle" transform="rotate(-90 800 ${my})">FORCE, N</text>`;
  const load = (p) => {
    const pts = [];
    for (let x = 0; x <= M.STROKE + 1e-9; x += 0.1) pts.push(`${gX(M.gapOf(x))},${fY(M.springForce(x) + M.PLUNGER_MASS * M.G + (x < 0.05 ? M.pilotLoad(p) : 0))}`);
    return pts.join(" ");
  };
  return (
    `<g data-role="chart"><rect class="paper" x="${FG.x0}" y="${FG.y0}" width="${FG.x1 - FG.x0}" height="${FG.y1 - FG.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline class="vis" points="${pullCurve(M.I_RATED)}"/>` +
    `<polyline id="load-line" class="hid" points="${load(M.P_SUPPLY)}"/>` +
    `<polyline id="fg-trace" class="thin" points=""/>` +
    `<circle id="fg-dot" class="dot" cx="${gX(M.gapOf(0))}" cy="${fY(0)}" r="2.4"/>` +
    `<rect class="vis" x="${FG.x0}" y="${FG.y0}" width="${FG.x1 - FG.x0}" height="${FG.y1 - FG.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((FG.x0 + FG.x1) / 2, 236, "DIAGRAM 2", `BOLD: PULL AT ${M.I_RATED.toFixed(2)} A · DASHED: SPRING + PILOT · THIN: THIS CYCLE`)
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "VALVE BODY G1/2, DN13 SEAT", "CW617N, HOT-FORGED", "1"],
  ["2", "DIAPHRAGM Ø35, FABRIC INSERT", "EPDM 70", "1"],
  ["3", "PILOT SLEEVE, ORIFICE Ø1.6", "CW614N", "1"],
  ["4", "SUPPORT WASHER Ø12×1", "CW614N", "1"],
  ["5", "BLEED BUSH, ORIFICE Ø0.8", "1.4305", "1"],
  ["6", "COVER 50×50", "CW617N", "1"],
  ["7", "CAP SCREW M5×16 ISO 4762", "A2-70", "4"],
  ["8", "O-RING 20×1.8 ISO 3601", "EPDM 70", "1"],
  ["9", "TUBE BASE M18×1", "CW614N", "1"],
  ["10", "ARMATURE TUBE Ø13×0.5", "1.4306", "1"],
  ["11", "POLE PIECE WITH STUD M6", "1.4105", "1"],
  ["12", "PLUNGER Ø11.2", "1.4105", "1"],
  ["13", "PILOT SEAL Ø4×2", "FKM 75", "1"],
  ["14", `PLUNGER SPRING Ø0.4, ${M.SPRING_TURNS} TURNS`, "EN 10270-3 1.4310", "1"],
  ["15", "COIL BOBBIN", "PA66-GF30", "1"],
  ["16", `WINDING ${M.TURNS} TURNS Ø${M.WIRE_D}`, "Cu-ETP, GRADE 2", "1"],
  ["17", "YOKE FRAME 2 mm", "DC01", "1"],
  ["18", "YOKE PLATE 3 mm", "DC01", "1"],
  ["19", "COIL HOUSING, OVERMOULDED", "PA6-GF30", "1"],
  ["20", "WASHER 6.4 ISO 7089", "A2", "1"],
  ["21", "HEX NUT M6 ISO 4032", "A2-70", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const bomTop = TB.y - (18 + BOM.length * 16);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 30, align: "center", title: "ITEM" },
    { w: 214, title: "DESCRIPTION" },
    { w: 126, title: "MATERIAL" },
    { w: 30, align: "center", title: "QTY" },
  ],
  BOM
);

const sim = M.simulate();
const tc = sim.s.tc;
const notes = K.notes(790, 268, "NOTES", [
  `COIL 24 V DC, R ${K.fmt(M.R_COIL, 1)} Ω, ${M.I_RATED.toFixed(2)} A, ${K.fmt(M.POWER, 1)} W; L/R ${K.fmt(M.TAU_OPEN * 1000, 1)} ms OPEN GAP, ${K.fmt(M.TAU_SHUT * 1000, 0)} ms SHUT.`,
  `PILOT Ø${M.PILOT_D} DRAINS THE CHAMBER, BLEED Ø${M.BLEED_D} REFILLS IT: Δp 0.3 TO ${K.fmt(M.bar(M.MOPD), 1)} bar (MOPD).`,
  `AT ${M.bar(M.P_SUPPLY)} bar: Q ${K.fmt(M.lpm(M.Q_FULL), 0)} L/min, Kv ${K.fmt(M.KV, 1)} m³/h; DIAPHRAGM FOLLOWS PLUNGER.`,
  `SHUTS IN ${Math.round(tc * 1000)} ms: SURGE ${K.fmt(M.bar(M.surge(tc)), 1)} bar IN ${M.PIPE_L} m OF Ø22, NOT ${Math.round(M.bar(M.JOUKOWSKY))} bar.`,
  `WATER STIPPLED, DENSITY = PRESSURE. POLE, NUT, WASHER NOT CUT.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "SOLENOID VALVE 2/2 NC · G1/2", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-019", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "2:1" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · bar (gauge)" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE, 10× SLOWER · SPACE OR TAP SWITCHES THE COIL · ↑ ↓ OR DRAG SETS SUPPLY", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const dots = (id) =>
  `<pattern id="${id}" patternUnits="userSpaceOnUse" width="2.8" height="2.8"><circle class="water-dot" cx="0.7" cy="0.7" r="0.58"/><circle class="water-dot" cx="2.1" cy="2.1" r="0.58"/></pattern>`;
const defs =
  `<defs>${K.hatchDefs()}${dots("w-c")}${dots("w-in")}${dots("w-out")}` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-P"><circle cx="${DP.cx}" cy="${DP.cy}" r="${DP.r}"/></clipPath>` +
  `</defs>`;

const [hx0, hy0] = VM.p([-40, 110]);
const [hx1, hy1] = VM.p([40, -2]);
const hit =
  `<rect class="hit" data-drag="main" x="${hx0}" y="${hy0}" width="${K.r2(hx1 - hx0)}" height="${K.r2(hy1 - hy0)}"/>` +
  `<circle class="hit" data-drag="P" cx="${DP.cx}" cy="${DP.cy}" r="${DP.r}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a pilot-operated solenoid valve cut through its axis. Press space or tap the valve to switch the coil; drag or use the arrow keys to set the supply pressure. The plunger, the diaphragm, the water and the charts follow." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  mainBalloons +
  mainMarks +
  detailP +
  detailDims +
  detailBalloons +
  viewC +
  chart1() +
  chart2() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span><kbd>Space</kbd> or tap: switch the coil · <kbd>↑</kbd> <kbd>↓</kbd> or drag: supply pressure · <kbd>S</kbd> slower</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "solenoid-valve.html"), {
  title: "Solenoid Valve Section",
  description: "A live engineering drawing of a pilot-operated solenoid valve: a 10 W coil lifts a plunger, the pilot drains the chamber, and the diaphragm lets 35 L/min of water through.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .tint-c{fill:url(#w-c)}.bp-sheet .tint-in{fill:url(#w-in)}.bp-sheet .tint-out{fill:url(#w-out)}` +
    `.bp-sheet .water-dot{fill:var(--bp-accent)}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet [data-drag]{cursor:pointer}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8")
    .replace("__CHART__", JSON.stringify(CH))
    .replace("__FG__", JSON.stringify(FG)),
});
console.log(
  `solenoid-valve.html  ${(size / 1024).toFixed(0)} KB  R ${M.R_COIL.toFixed(1)} Ω  I ${M.I_RATED.toFixed(3)} A  Q ${M.lpm(M.Q_FULL).toFixed(1)} L/min  shut ${(tc * 1000).toFixed(0)} ms  MOPD ${M.bar(M.MOPD).toFixed(2)} bar`
);
