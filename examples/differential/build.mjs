// Builds differential.html: a live A2 drawing of an open bevel-gear differential in a rear axle.
//   node examples/differential/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k2 = 2 * K.PX_PER_MM;

// ---------------------------------------------------------------- views
const E = { cx: 692, cy: 352, r: 74, u: 106, v: 33 };
const D = { x: 436, y: 540, w: 250, h: 222 };
const PV = { x: 600, y: 34, w: 568, h: 186 };
const VIEWS = {
  main: { x: 300, y: 300, scale: 1 / 2.5 },
  E: { x: E.cx - E.u * k2, y: E.cy + E.v * k2, scale: 2 },
  D: { x: D.x + D.w / 2, y: D.y + D.h / 2, scale: 1 },
  P: { x: 884, y: 166, scale: 1 / 50 },
};
const VM = K.view(VIEWS.main);
const VE = K.view(VIEWS.E);
const VD = K.view(VIEWS.D);
const VP = K.view(VIEWS.P);

// ---------------------------------------------------------------- the axle, cut through its axes
function axle(V, id) {
  return (
    P.housing(V) +
    P.tubes(V) +
    P.cover(V) +
    P.coverScrews(V) +
    P.carrier(V) +
    P.crown(V) +
    P.crownBolts(V) +
    P.carrierBearings(V) +
    P.shims(V) +
    P.sideGears(V) +
    P.sideWashers(V) +
    P.spiders(V) +
    P.sideGearHidden(V) +
    P.spiderWashers(V) +
    P.crossPin(V) +
    P.rollPin(V) +
    P.halfShafts(V) +
    P.wheelBearings(V) +
    P.pinionBearings(V) +
    P.spacer(V) +
    P.companionFlange(V) +
    P.pinionGear(V) +
    P.crownMeshHidden(V) +
    P.seal(V) +
    P.pinionNut(V) +
    P.part(25, `<g id="studs-R-${id}">${P.studs(V, 1, 0)}</g><g id="studs-L-${id}">${P.studs(V, -1, 0)}</g>`)
  );
}

function spiderTint(V, id) {
  const shapes = [1, -1].flatMap((sv) => [1, -1].map((su) => P.spiderOutline(sv, su)));
  return `<g data-role="fluid"><path id="tint-${id}" class="tint" fill-opacity="0.15" d="${shapes.map((s) => K.d(V, s)).join("")}"/></g>`;
}

function axleLines(V) {
  return (
    K.centerline(V, [-300, 0], [300, 0], 0) +
    K.centerline(V, [0, -140], [0, 289], 0) +
    K.centerline(V, [-19, 47.5], [19, 47.5], 0) +
    [85, -85].map((v) => K.centerline(V, [32, v], [71, v], 0)).join("") +
    [120, -120].map((u) => K.centerline(V, [u, -121], [u, -89], 0)).join("") +
    [P.BREAK[0], P.BREAK[1], -P.BREAK[0], -P.BREAK[1]].map((u) => K.breakLine(V, [u, -43], [u, 43])).join("")
  );
}

const mainView = `<g data-geom="main">` + axle(VM, "main") + spiderTint(VM, "main") + axleLines(VM) + `</g>`;

const mainDims =
  K.dim(VM, [-P.FL.u1, -P.FL.r], [P.FL.u1, -P.FL.r], { dir: "h", off: 100, text: String(2 * (P.FL.u1 + P.OUT_SHIFT)) }) +
  K.dim(VM, [-55, 255], [-296, 0], { dir: "v", off: VM.p([-300, 0])[0] - VM.p([-55, 255])[0] });

const mainMarks =
  K.detailMark(VM, [E.u, E.v], 19, "E", 150) +
  K.viewLabel(300, 472, "PLAN SECTION", "THROUGH AXLE AND PINION AXES · CROSS PIN IN THE PLANE · SCALE 1:2.5");

// ---------------------------------------------------------------- DETAIL E: carrier bearing, 2:1
const detailE =
  `<g data-geom="E" clip-path="url(#clip-E)"><circle class="paper" cx="${E.cx}" cy="${E.cy}" r="${E.r}"/>` +
  axle(VE, "E") +
  K.centerline(VE, [80, 0], [130, 0], 0) +
  `</g><circle class="thin" cx="${E.cx}" cy="${E.cy}" r="${E.r}"/>` +
  K.viewLabel(E.cx, E.cy + E.r + 18, "DETAIL E", "CARRIER BEARING · 2:1");

// ---------------------------------------------------------------- VIEW D: the gear cluster in the carrier's frame, 1:1
const carrierPhantom = () => {
  const outer = [[-62, 44], [-52, 47.5], [-32, 49.5], [-22, 53], [-17, 56], [17, 56], [22, 55], [35, 58.5], [35, 63], [50, 63], [50, 100]];
  const halfR = outer.filter(([u]) => u >= 0);
  return K.line(VD, [...outer.slice(0, 5), ...halfR], "phan") + K.line(VD, K.flipV([...outer.slice(0, 5), ...halfR]), "phan");
};
const viewD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>` +
  `<g data-role="phantom">${carrierPhantom()}</g>` +
  P.part(23, [1, -1].map((su) => K.body(VD, su > 0 ? K.rect(46, -15, 75, 15) : K.rect(-75, -15, -46, 15))).join("")) +
  P.part(19, `<g id="spider-top">${P.spiderViewBody(VD, 1)}${P.spiderTeeth(VD, 1, 0)}</g><g id="spider-bot">${P.spiderViewBody(VD, -1)}${P.spiderTeeth(VD, -1, 0)}</g>`) +
  `<g data-role="fluid"><path id="tint-D" class="tint" fill-opacity="0.15" d="${K.d(VD, P.spiderSil(1)) + K.d(VD, P.spiderSil(-1))}"/></g>` +
  P.part(17, `<g id="side-R">${P.sideViewBody(VD, 1)}${P.sideTeeth(VD, 1, 0)}</g><g id="side-L">${P.sideViewBody(VD, -1)}${P.sideTeeth(VD, -1, 0)}</g>`) +
  P.part(21, K.body(VD, K.rect(-10, -21.07, 10, 21.07))) +
  K.centerline(VD, [0, -60], [0, 60], 0) +
  K.centerline(VD, [-62, 0], [62, 0], 0) +
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => K.line(VD, [[0, 0], [a * (P.SIDE.pH[1] + 3), b * (P.SIDE.pH[0] + 4.8)]], "ctr")).join("") +
  `</g><rect class="thin" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/>` +
  K.viewLabel(D.x + D.w / 2, D.y + D.h + 20, "VIEW D", "FROM ABOVE, CARRIER 14 BROKEN AWAY, RIDING WITH IT · 1:1");

// ---------------------------------------------------------------- PLAN: the car in a turn, 1:100
const C = P.CAR;
const planStatic =
  `<g data-role="phantom">${P.carBody(VP)}</g>` +
  K.line(VP, [[-C.track / 2, 0], [C.track / 2, 0]], "vis") +
  K.line(VP, [[-C.track / 2, C.base], [C.track / 2, C.base]], "thin") +
  K.line(VP, [[0, 160], [0, 1900]], "vis") +
  K.body(VP, K.rrect(-170, -140, 170, 160, 60, 3)) +
  K.body(VP, K.rrect(-300, 1900, 300, 2500, 80, 3)) +
  K.centerline(VP, [0, -700], [0, 3600], 0);
const viewP =
  `<g data-geom="P" clip-path="url(#clip-P)">` +
  `<g id="ice" opacity="0"><path class="ice" d="${K.d(VP, K.rrect(C.track / 2 - 650, -900, C.track / 2 + 650, 900, 300, 4))}"/><path class="thin" d="${K.d(VP, K.rrect(C.track / 2 - 650, -900, C.track / 2 + 650, 900, 300, 4))}"/></g>` +
  `<g id="paths"></g>` +
  planStatic +
  `<g id="tyres"></g>` +
  `</g><rect class="thin" x="${PV.x}" y="${PV.y}" width="${PV.w}" height="${PV.h}" rx="10"/>` +
  K.dim(VP, [-C.track / 2, 0], [C.track / 2, 0], { dir: "h", off: 50 }) +
  `<g id="dim-R-wrap"></g>` +
  K.viewLabel(PV.x + PV.w / 2, PV.y + PV.h + 18, "PLAN", "THE CAR IN A TURN, REAR WHEEL PATHS, BONNET CROPPED · SCALE 1:50");

// ---------------------------------------------------------------- DIAGRAM 1: wheel speeds against time
const CH = { x0: 74, x1: 372, y0: 522, y1: 716, W: M.CYCLE, nMax: 400 };
const chY = (n) => K.r2(CH.y1 - (n / CH.nMax) * (CH.y1 - CH.y0));
const chX = (age) => K.r2(CH.x1 - (age / CH.W) * (CH.x1 - CH.x0));
function chart() {
  let grid = "";
  let labels = "";
  for (let n = 0; n <= CH.nMax; n += 50) {
    grid += `M${CH.x0} ${chY(n)}H${CH.x1}`;
    if (n % 100 === 0 && n > 0) labels += `<text class="t t-sm" x="${CH.x0 - 6}" y="${K.r2(chY(n) + 2.7)}" text-anchor="end">${n}</text>`;
  }
  for (let a = 0; a <= CH.W; a += 4) {
    grid += `M${chX(a)} ${CH.y0}V${CH.y1}`;
    labels += `<text class="t t-sm" x="${chX(a)}" y="${CH.y1 + 11}" text-anchor="middle">${a ? -a : 0}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 24}" text-anchor="middle">TIME, s (NOW AT RIGHT)</text>`;
  labels += `<text class="t t-sm t-mute" x="44" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 44 ${(CH.y0 + CH.y1) / 2})">WHEEL SPEED n, rpm</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path id="band" class="tint" fill-opacity="0.9" d=""/>` +
    `<polyline id="trace-C" class="thin" points=""/>` +
    `<polyline id="trace-R" class="hid trace" points=""/>` +
    `<polyline id="trace-L" class="vis" points=""/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    `<g data-role="label"><text class="t t-lg" x="${(CH.x0 + CH.x1) / 2}" y="760" text-anchor="middle">DIAGRAM 1</text>` +
    `<text class="t t-sm" x="${(CH.x0 + CH.x1) / 2}" y="772" text-anchor="middle">SOLID: LEFT WHEEL · DASHED: RIGHT · THIN: CARRIER</text>` +
    `<text class="t t-sm" x="${(CH.x0 + CH.x1) / 2}" y="783" text-anchor="middle">ACCENT: THE GAP THE SPIDERS TAKE UP BY SPINNING</text></g>`
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "AXLE HOUSING, SALISBURY TYPE", "EN-GJS-500-7", "1"],
  ["2", "REAR COVER 2.5", "DC04", "1"],
  ["3", "HEX SCREW M8×20 ISO 4017", "STEEL 8.8", "10"],
  ["4", "AXLE TUBE Ø76×6, END FLANGE", "E355 + S355J2", "2"],
  ["5", "DRIVE PINION 10T, SPIRAL BEVEL", "20MnCr5, CASE HARD.", "1"],
  ["6", "TAPER ROLLER BRG 32307 ISO 355", "100Cr6", "1"],
  ["7", "TAPER ROLLER BRG 30306 ISO 355", "100Cr6", "1"],
  ["8", "COLLAPSIBLE SPACER Ø37×2", "C15E", "1"],
  ["9", "SHAFT SEAL 45×72×10 ISO 6194", "FKM / DC01", "1"],
  ["10", "COMPANION FLANGE Ø110", "C45", "1"],
  ["11", "PINION NUT M24×1.5, COLLAR", "STEEL 10", "1"],
  ["12", "CROWN WHEEL 39T, Ø224 PCD", "20MnCr5, CASE HARD.", "1"],
  ["13", "HEX BOLT M12×1.5×30 ISO 8765", "STEEL 10.9", "10"],
  ["14", "DIFFERENTIAL CARRIER", "EN-GJS-600-3", "1"],
  ["15", "TAPER ROLLER BRG 32010 X ISO 355", "100Cr6", "2"],
  ["16", "SHIM PACK Ø80/Ø64", "C75S", "2"],
  ["17", "SIDE GEAR 16T m4.2, 28T SPLINE", "20MnCr5, CASE HARD.", "2"],
  ["18", "THRUST WASHER Ø60/Ø45×0.8", "CuSn8", "2"],
  ["19", "SPIDER GEAR 10T m4.2", "20MnCr5, CASE HARD.", "2"],
  ["20", "SPHERICAL WASHER SR40×1.3", "CuSn8", "2"],
  ["21", "CROSS PIN Ø20×112", "16MnCr5, CASE HARD.", "1"],
  ["22", "SPRING PIN Ø6×32 ISO 8752", "SPRING STEEL", "1"],
  ["23", "HALF-SHAFT Ø30, 28T SPLINE", "41Cr4, IND. HARD.", "2"],
  ["24", "BALL BEARING 6207-2RS ISO 15", "100Cr6", "2"],
  ["25", "WHEEL STUD M12×1.5×45", "STEEL 10.9", "10"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const ROW = 14;
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

const tq = M.torques(false);
const tqIce = M.torques(true);
const notes = K.notes(790, 268, "NOTES", [
  `CARRIER SPEED IS THE MEAN OF THE WHEELS: ωC = (ωL + ωR)/2.`,
  `SPIDERS 19 SPIN ON PIN 21 ONLY WHEN ωL ≠ ωR: ωS = (ωL − ωR)/2 × 16/10.`,
  `TORQUE SPLITS EQUALLY, TL = TR: ${K.fmt(tq.each, 0)} N·m EACH FROM ${M.T_PINION} N·m AT 3.9:1.`,
  `ONE WHEEL ON ICE (μ ${M.MU_ICE}): BOTH GET ONLY μ·N·r = ${K.fmt(tqIce.each, 0)} N·m.`,
  `SHAFTS, PIN, BOLTS, STUDS AND ROLLERS NOT CUT. TUBES SHOWN BROKEN.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "OPEN DIFFERENTIAL · REAR AXLE", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-012", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:2.5" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · rpm · N·m" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE PLAN SIDEWAYS TO STEER · ↑↓ SPEED · I ICE · S SLOW", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- balloons
const B = (V, at, xy, n) => K.balloon(V, at, xy, n, { target: n });
const balloons =
  // the pinion and its bearings, from the left and right of the nose
  B(VM, [-15, 270], [226, 80], 11) +
  B(VM, [-45, 250], [226, 104], 10) +
  B(VM, [-30, 224], [226, 128], 9) +
  B(VM, [-34, 205], [226, 152], 7) +
  B(VM, [-17.5, 160], [226, 176], 8) +
  B(VM, [8, 175], [374, 152], 5) +
  B(VM, [37, 140], [374, 176], 6) +
  // the crown wheel side
  B(VM, [40, 100], [420, 176], 12) +
  B(VM, [64, 85], [420, 200], 13) +
  // housing, tube, shaft, wheel end
  B(VM, [-120, 85], [170, 200], 1) +
  B(VM, [-170, 35], [130, 224], 4) +
  B(VM, [-180, 8], [150, 380], 23) +
  B(VM, [-243.5, -34], [118, 380], 24) +
  B(VM, [0, -136.25], [330, 430], 2) +
  B(VM, [120, -115], [420, 425], 3) +
  // the cluster, from the cavity
  B(VM, [-60, -44], [240, 370], 14) +
  B(VM, [-27.4, -26], [262, 370], 18) +
  B(VM, [-14, -38.27], [284, 370], 20) +
  B(VM, [-13, 47.5], [268, 247], 22) +
  // the wheel studs: the balloon stays, its leader finds a stud
  `<g id="b25">${B(VM, [P.FL.tip - 3, 0], [548, 380], 25)}</g>` +
  // VIEW D
  B(VD, [20, 33], [712, 580], 19) +
  B(VD, [40, 15], [712, 620], 17) +
  B(VD, [-5, -12], [410, 690], 21) +
  // DETAIL E
  B(VE, [107, 38], [650, 268], 15) +
  B(VE, [116, 36], [740, 268], 16);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="stip" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="stip-dot" cx="0.8" cy="0.8" r="0.62"/><circle class="stip-dot" cx="2.4" cy="2.4" r="0.62"/></pattern>` +
  `<pattern id="ice-h" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(30)"><path class="hl" d="M0 1H3M3 4H6"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-E"><circle cx="${E.cx}" cy="${E.cy}" r="${E.r}"/></clipPath>` +
  `<clipPath id="clip-D"><rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-P"><rect x="${PV.x}" y="${PV.y}" width="${PV.w}" height="${PV.h}" rx="10"/></clipPath>` +
  `</defs>`;

const hit = `<rect class="hit" data-drag="plan" x="${PV.x}" y="${PV.y}" width="${PV.w}" height="${PV.h}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a car's open differential cut through the axle, with a plan view of the car turning. Drag the plan view sideways to steer, use the arrow keys for speed, and press I to put the right wheel on ice; the gears, wheel speeds and chart follow." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  mainMarks +
  detailE +
  viewD +
  viewP +
  chart() +
  balloons +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the plan view sideways to steer · <kbd>←</kbd> <kbd>→</kbd> steer · <kbd>↑</kbd> <kbd>↓</kbd> speed · <kbd>I</kbd> right wheel on ice · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "differential.html"), {
  title: "Open Differential Section",
  description: "A live engineering drawing of a car's open differential: the spider gears spin only when the wheels turn at different speeds, and the carrier always turns at their mean.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#stip)}.bp-sheet .stip-dot{fill:var(--bp-accent)}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet .ice{fill:url(#ice-h)}` +
    `.bp-sheet .vis.tooth{stroke-width:.8px}.bp-sheet .track{fill:none;stroke:var(--bp-ink);stroke-width:var(--bp-thin);stroke-dasharray:6 4}` +
    `.bp-sheet [data-drag="plan"]{cursor:ew-resize}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHART__", JSON.stringify(CH)).replace("__PLAN__", JSON.stringify(PV)),
});
const t = M.torques(false);
console.log(`differential.html  ${(size / 1024).toFixed(0)} KB  ratio ${M.RATIO}  crown cone ${M.CONE.toFixed(1)} mm  each wheel ${t.each.toFixed(0)} N·m`);
