// Builds escapement.html: a live A2 drawing of a Swiss lever escapement at 28 800 beats an hour.
//   node examples/escapement/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as X from "./extra.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k50 = 50 * K.PX_PER_MM;

// ---------------------------------------------------------------- views
// Detail B: both stones and their teeth at 50:1. Detail C: the upper jewel bearing at 50:1.
const DB = { x: 630, y: 456, w: 138, h: 360, at: [-0.365, -0.28] };
const DC = { x: 440, y: 466, w: 160, h: 114, r0: -0.62, zc: 3.12 };
const VIEWS = {
  plan: { x: 322, y: 246, scale: 20 },
  B: { x: DB.x + DB.w / 2 - DB.at[0] * k50, y: DB.y + DB.h / 2 + DB.at[1] * k50, scale: 50 },
  C: { x: DC.x - DC.r0 * k50, y: DC.y + DC.h / 2 + DC.zc * k50, scale: 50 },
  S: { x: 300, y: 720, scale: 20 },
};
const VP = K.view(VIEWS.plan);
const VB = K.view(VIEWS.B);
const VC = K.view(VIEWS.C);
const VS = K.view(VIEWS.S);

// ---------------------------------------------------------------- plan and detail: the same parts
// Painter's order from the dial side: hairspring furthest, then balance, roller table, wheel,
// pallets and fork, jewel, safety roller, pins nearest.
function escapement(V, id, { balance = true } = {}) {
  const [bx, by] = V.p(M.B);
  const [ex, ey] = V.p(M.E);
  const [px, py] = V.p([0, 0]);
  const rotB = `rotate(0 ${bx} ${by})`;
  let out = "";
  if (balance) {
    out += `<g id="hs-${id}">${P.hairspring(V, 0)}</g>`;
    out += P.stud(V);
    out += `<g class="rb-${id}" transform="${rotB}">${P.collet(V)}${P.balanceArms(V)}</g>${P.balanceRim(V)}<g class="rb-${id}" transform="${rotB}">${P.rollerTable(V)}</g>`;
  } else {
    out += P.balance(V);
  }
  out += `<g id="wheel-${id}" transform="rotate(0 ${ex} ${ey})">${P.wheel(V)}` +
    `<path id="tooth-${id}" class="accent-fill" fill-opacity="0.35" d="${K.d(V, P.toothShape(0))}"/>${P.pinion(V)}</g>`;
  out += `<g data-role="phantom">${P.forkPhantom(V, M.BANK)}${P.forkPhantom(V, -M.BANK)}</g>`;
  out += `<g id="fork-${id}" transform="rotate(0 ${px} ${py})">${P.pallet(V)}${P.stoneEntry(V)}${P.stoneExit(V)}${P.guardPinPlan(V)}` +
    K.centerline(V, [0.35, 0], [M.FORK_L - 0.45, 0], 0) + `</g>`;
  out += `<g class="rb-${id}" transform="${rotB}">${P.jewelPlan(V)}${P.safetyRoller(V)}</g>`;
  if (balance) out += P.staffPlan(V);
  out += P.arborPlan(V) + P.bankingPins(V);
  return out;
}

function centrelines(V, full = true) {
  const [u0, u1] = full ? [M.E[0] - M.R_OUT - 0.25, M.B[0] + M.BAL.ro + 0.25] : [-2.6, 1.0];
  let out = K.centerline(V, [u0, 0], [u1, 0], 0);
  out += K.centerline(V, [M.E[0], -M.R_OUT - 0.2], [M.E[0], M.R_OUT + 0.2], 0);
  out += K.centerline(V, [0, -2.55], [0, 1.95], 0);
  out += K.line(V, K.circle(M.E[0], M.E[1], M.R_TIP, 160), "ctr", true);
  if (full) {
    out += K.centerline(V, [M.B[0], -M.BAL.ro - 0.2], [M.B[0], M.BAL.ro + 0.2], 0);
    out += K.line(V, K.circle(M.B[0], M.B[1], M.R_JEWEL, 48), "ctr", true);
  }
  return out;
}

// ---------------------------------------------------------------- PLAN VIEW, 20:1
const planView = `<g data-geom="plan">${escapement(VP, "plan")}${centrelines(VP)}</g>`;

const [pX, pY] = VP.p([0, 0]);
const planDims =
  X.radius(VP, M.E, M.R_OUT, 214, `R${K.fmt(M.R_OUT, 2)}`) +
  K.dim(VP, [M.E[0], -M.R_OUT - 0.2], [0, -M.R_OUT - 0.2], { dir: "h", off: 448 - VP.p([0, -M.R_OUT - 0.2])[1], text: K.fmt(M.EW_D, 2) }) +
  K.dim(VP, [0, -M.R_OUT - 0.2], [M.B[0], -M.BAL.ro - 0.2], { dir: "h", off: 448 - VP.p([0, -M.R_OUT - 0.2])[1], text: K.fmt(M.D_PB, 2) }) +
  `<g id="dim-phi-wrap">${X.forkAngle(VP, 0)}</g>`;

const planBalloons =
  K.balloon(VP, at(M.B, M.BAL.ro - 0.25, -38), [742, 360], 9, { target: 9 }) +
  K.balloon(VP, at(M.B, M.HS.r1, P.STUD_A - 14), [742, 120], 10, { target: 10 }) +
  K.balloon(VP, at(M.B, M.HS.r1 + 0.05, P.STUD_A + 2), [742, 88], 12, { target: 12 }) +
  K.balloon(VP, [M.E[0] - 1.6, 0.05], [60, 176], 20, { target: 20 }) +
  K.balloon(VP, [M.E[0] - 0.2, -0.02], [60, 204], 21, { target: 21 }) +
  K.balloon(VP, [0.1, 0.06], [352, 100], 16, { target: 16 }) +
  K.balloon(VP, P.bankCentre(-1), [370, 414], 22, { target: 22 });

function at(c, r, a) {
  return [c[0] + r * Math.cos((a * Math.PI) / 180), c[1] + r * Math.sin((a * Math.PI) / 180)];
}

const planMarks =
  K.detailMark(VP, [-0.55, -0.2], 1.95, "B", 100) +
  X.cutPlane(VP, [M.E[0] - M.R_OUT - 0.55, 0], [M.B[0] + M.BAL.ro + 0.55, 0], "A") +
  K.viewLabel(178, 50, "PLAN VIEW", "FROM DIAL SIDE, MAINPLATE REMOVED · 20:1");

// ---------------------------------------------------------------- DETAIL B, 50:1
const rectClip = (R) => `<rect x="${R.x}" y="${R.y}" width="${R.w}" height="${R.h}" rx="10"/>`;
const detailB =
  `<g data-geom="B" clip-path="url(#clip-B)"><rect class="paper" x="${DB.x}" y="${DB.y}" width="${DB.w}" height="${DB.h}"/>` +
  escapement(VB, "B", { balance: false }) +
  centrelines(VB, false) +
  `</g><rect class="thin" x="${DB.x}" y="${DB.y}" width="${DB.w}" height="${DB.h}" rx="10"/>` +
  K.balloon(VB, X.mid(M.STONE_ENTRY, 0.4), [614, 640], 17, { target: 17 }) +
  K.balloon(VB, X.mid(M.STONE_EXIT, 0.4), [614, 740], 18, { target: 18 }) +
  K.viewLabel(578, 792, "DETAIL B", "PALLETS · 50:1");

// ---------------------------------------------------------------- DETAIL C, 50:1: the upper bearing
function sectionParts(V) {
  return (
    P.plateSec(V) +
    P.cockSec(V) +
    P.bearing(V, -1) +
    P.bearing(V, 1) +
    P.balanceSec(V) +
    P.rollerSec(V) +
    P.forkSec(V) +
    P.guardPinSec(V) +
    P.jewelSec(V) +
    P.colletSec(V) +
    P.hairspringSec(V) +
    P.staffSec(V)
  );
}
const detailC =
  `<g data-geom="C" clip-path="url(#clip-C)"><rect class="paper" x="${DC.x}" y="${DC.y}" width="${DC.w}" height="${DC.h}"/>` +
  sectionParts(VC) +
  K.centerline(VC, [0, 2.5], [0, 3.8], 0) +
  `</g><rect class="thin" x="${DC.x}" y="${DC.y}" width="${DC.w}" height="${DC.h}" rx="10"/>` +
  K.balloon(VC, [0.45, 3.245], [614, 482], 7, { target: 7 }) +
  K.balloon(VC, [0.3, 3.16], [614, 504], 6, { target: 6 }) +
  K.balloon(VC, [0.78, 3.0], [614, 526], 3, { target: 3 }) +
  K.balloon(VC, [0.55, 2.95], [614, 548], 4, { target: 4 }) +
  K.balloon(VC, [0.3, 2.93], [614, 570], 5, { target: 5 }) +
  K.viewLabel(DC.x + DC.w / 2, DC.y + DC.h + 18, "DETAIL C", "UPPER BEARING · 50:1");

// ---------------------------------------------------------------- SECTION A-A, 20:1
const sectionView =
  `<g data-geom="S">` +
  sectionParts(VS) +
  K.centerline(VS, [0, -0.6], [0, 3.7], 0) +
  K.breakLine(VS, [-3.8, P.SZ.plateLo - 0.05], [-3.8, P.SZ.plateHi + 0.05]) +
  K.breakLine(VS, [3.8, P.SZ.plateLo - 0.05], [3.8, P.SZ.plateHi + 0.05]) +
  K.breakLine(VS, [3.4, P.SZ.cockLo - 0.05], [3.4, P.SZ.cockHi + 0.05]) +
  `</g>`;

const sectionDims = K.dim(VS, [-M.BAL.ro, M.BAL.ro > 0 ? 1.45 : 0], [M.BAL.ro, 1.45], { dir: "h", off: 762 - VS.p([0, 1.45])[1], prefix: "Ø" });

const sectionBalloons =
  K.balloon(VS, [2.6, 3.2], [405, 552], 2, { target: 2 }) +
  K.balloon(VS, [0.45, 2.45], [450, 614], 11, { target: 11 }) +
  K.balloon(VS, [0.1, 2.1], [430, 632], 8, { target: 8 }) +
  K.balloon(VS, [0.6, 1.31], [430, 667], 13, { target: 13 }) +
  K.balloon(VS, [-2.6, 1.03], [40, 700], 15, { target: 15 }) +
  K.balloon(VS, [-0.8, (720 - 673.2) / VS.k], [90, 673.2], 14, { target: 14 }) +
  K.balloon(VS, [-0.9, 0.89], [40, 724], 19, { target: 19 }) +
  K.balloon(VS, [-3.0, -0.05], [40, 760], 1, { target: 1 });

const sectionMarks = K.detailMark(VS, [0, 3.1], 0.85, "C", 45) + K.viewLabel(300, 790, "SECTION A-A", "BALANCE STAFF AND BEARINGS · 20:1");

// ---------------------------------------------------------------- DIAGRAM 1: balance angle against time
const CH = { x0: 834, x1: 1138, y0: 52, y1: 172, tMax: 0.5, aMax: 300, psiMax: 48 };
function chart() {
  const chX = (t) => K.r2(CH.x0 + (t / CH.tMax) * (CH.x1 - CH.x0));
  const chY = (a) => K.r2((CH.y0 + CH.y1) / 2 - (a / CH.aMax) * ((CH.y1 - CH.y0) / 2));
  const psY = (p) => K.r2(CH.y1 - (p / CH.psiMax) * (CH.y1 - CH.y0));
  let grid = "";
  let labels = "";
  for (let a = -300; a <= 300; a += 100) {
    grid += `M${CH.x0} ${chY(a)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 5}" y="${K.r2(chY(a) + 2.7)}" text-anchor="end">${a}</text>`;
  }
  for (let p = 12; p <= CH.psiMax; p += 12) labels += `<text class="t t-sm" x="${CH.x1 + 5}" y="${K.r2(psY(p) + 2.7)}">${p}</text>`;
  for (let i = 0; i <= 4; i++) {
    const t = i * 0.125;
    grid += `M${chX(t)} ${CH.y0}V${CH.y1}`;
    labels += `<text class="t t-sm" x="${chX(t)}" y="${CH.y1 + 11}" text-anchor="middle">${Math.round(t * 1000)}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 23}" text-anchor="middle">TIME, ms (ONE BEAT = 125 ms)</text>`;
  const ly = (CH.y0 + CH.y1) / 2;
  labels += `<text class="t t-sm t-mute" x="801" y="${ly}" text-anchor="middle" transform="rotate(-90 801 ${ly})">BALANCE θ, °</text>`;
  labels += `<text class="t t-sm t-mute" x="1166" y="${ly}" text-anchor="middle" transform="rotate(-90 1166 ${ly})">WHEEL ψ, °</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="hid" d="M${CH.x0} ${chY(M.LIFT / 2)}H${CH.x1}M${CH.x0} ${chY(-M.LIFT / 2)}H${CH.x1}"/>` +
    `<polyline id="trace-prev" class="thin" points=""/>` +
    `<polyline id="psi-now" class="hid" points=""/>` +
    `<polyline id="trace-now" class="vis" points=""/>` +
    `<path id="imp-now" class="accent imp" d=""/>` +
    `<path id="imp-ticks" class="accent imp" d=""/>` +
    `<circle id="chart-dot" class="dot" cx="${CH.x0}" cy="${CH.y0}" r="2.4"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 222, "DIAGRAM 1", "ACCENT: IMPULSE · DASHED: WHEEL ψ AND ±26° LIFT")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "MAINPLATE (PART)", "CuZn39Pb3, Ni PLATED", "1"],
  ["2", "BALANCE COCK", "CuZn39Pb3, Ni PLATED", "1"],
  ["3", "SHOCK BLOCK Ø1.9", "CuZn39Pb3", "2"],
  ["4", "CHATON Ø1.2", "CuZn39Pb3", "2"],
  ["5", "HOLE JEWEL Ø1.0×0.2, OLIVE", "SYNTH. RUBY Al2O3", "2"],
  ["6", "CAP JEWEL Ø1.0×0.12", "SYNTH. RUBY Al2O3", "2"],
  ["7", "LYRE SPRING Ø0.05 WIRE", "X10CrNi18-8", "2"],
  ["8", "BALANCE STAFF, PIVOTS Ø0.09", "C100S, HARDENED", "1"],
  ["9", "BALANCE Ø9.0, 3 ARMS", "GLUCYDUR CuBe2", "1"],
  ["10", `HAIRSPRING ${M.HS.h}×${M.HS.b}, L ${K.fmt(M.HS_LENGTH, 0)}`, "NIVAROX 1", "1"],
  ["11", "HAIRSPRING COLLET Ø1.2", "CuZn39Pb3", "1"],
  ["12", "HAIRSPRING STUD", "X10CrNi18-8", "1"],
  ["13", "DOUBLE ROLLER Ø2.0/Ø0.9", "C100S, HARDENED", "1"],
  ["14", "IMPULSE JEWEL Ø0.28, D", "SYNTH. RUBY Al2O3", "1"],
  ["15", "PALLET FORK", "C100S, HARDENED", "1"],
  ["16", "PALLET ARBOR, PIVOTS Ø0.09", "C100S, HARDENED", "1"],
  ["17", "ENTRY PALLET STONE 0.245", "SYNTH. RUBY Al2O3", "1"],
  ["18", "EXIT PALLET STONE 0.245", "SYNTH. RUBY Al2O3", "1"],
  ["19", "GUARD PIN Ø0.10", "CuBe2", "1"],
  ["20", `ESCAPE WHEEL ${M.TEETH} CLUB TEETH`, "C100S, HARDENED", "1"],
  ["21", "ESCAPE PINION z=7, m 0.065", "20AP, HARDENED", "1"],
  ["22", "BANKING PIN Ø0.30", "C100S", "2"],
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

const notes = K.notes(790, 254, "NOTES", [
  `${M.BPH} BEATS/h, f = ${K.fmt(M.FREQ, 0)} Hz. I = ${K.fmt(M.INERTIA / 100, 1)} mg·cm² (RIM + ARMS), k = I·ω² = ${K.fmt(M.K_SPRING * 1e6, 2)} µN·m/rad.`,
  `HAIRSPRING ${M.HS.h}×${M.HS.b}, E ${M.E_SPRING / 1e9} GPa: L = E·b·h³/12k = ${K.fmt(M.HS_LENGTH, 0)} mm, ${K.fmt(M.HS_TURNS, 1)} TURNS.`,
  `LIFT ${M.LIFT}°, LOCK 2°; WHEEL ${K.fmt(M.IMPULSE_PSI, 1)}° IMPULSE + ${K.fmt(M.DROP_PSI, 1)}° DROP PER BEAT, 24° PER TWO.`,
  `T(WHEEL) ${K.fmt(M.T_ESCAPE * 1e6, 2)} µN·m = ${M.M_BARREL} N·mm ÷ ${M.TRAIN_RATIO} × η; Q ${M.Q} → AMPLITUDE ${K.fmt(M.AMP_STEADY, 0)}°.`,
  `STAFF, ARBOR, PINS, JEWEL NOT CUT. TOUR SLOWS TIME AT EACH IMPULSE.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "SWISS LEVER ESCAPEMENT", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-004", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "20:1" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-f" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · deg · ms" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE BALANCE · ← → KICK · SPACE PAUSE · S SPEED · R RESTART", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-B">${rectClip(DB)}</clipPath><clipPath id="clip-C">${rectClip(DC)}</clipPath>` +
  `</defs>`;

const [bx, by] = VP.p(M.B);
const hit = `<circle class="hit" data-drag="balance" cx="${bx}" cy="${by}" r="${K.r2((M.BAL.ro + 0.2) * VP.k)}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a Swiss lever watch escapement: escape wheel, pallet fork and balance in plan at 20 to 1, a detail of the pallets at 50 to 1 and a section through the balance staff and its jewel bearings. Drag the balance to turn it and let it go; the fork, the escape wheel and the chart follow." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  planView +
  planDims +
  planBalloons +
  planMarks +
  detailB +
  detailC +
  sectionView +
  sectionDims +
  sectionBalloons +
  sectionMarks +
  chart() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the balance · <kbd>←</kbd> <kbd>→</kbd> kick · <kbd>Space</kbd> pause · <kbd>S</kbd> speed · <kbd>R</kbd> restart</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

// The contact tables, computed here once and handed to the page's model.
const tablesFile = join(here, "tables.js");
writeFileSync(tablesFile, `// Generated by build.mjs: the escape wheel's contact angle ψ(φ) for each locked stone.
globalThis.ESC_TAB = ${JSON.stringify({ entry: [...M.TAB_ENTRY].map((x) => +x.toFixed(5)), exit: [...M.TAB_EXIT].map((x) => +x.toFixed(5)) })};
`);

const size = writePage(join(here, "escapement.html"), {
  title: "Lever Escapement",
  description: "A live engineering drawing of a Swiss lever watch escapement: the balance swings at 4 Hz, the fork unlocks, the tooth gives impulse and drops, and the wheel advances one tooth every two beats.",
  svg,
  bar,
  css: `.bp-sheet .hit{fill:transparent;cursor:grab;touch-action:none}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet .imp{stroke-width:2.4px;fill:none;stroke-linecap:butt}`,
  modules: [
    [tablesFile, "T"],
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "extra.mjs"), "X"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHART__", JSON.stringify(CH)),
});
console.log(
  `escapement.html  ${(size / 1024).toFixed(0)} KB  I ${M.INERTIA.toFixed(0)} mg·mm²  L ${M.HS_LENGTH.toFixed(1)} mm  A ${M.AMP_STEADY.toFixed(1)}°  drops ${M.DROP_ENTRY.phi.toFixed(2)}/${M.DROP_EXIT.phi.toFixed(2)}`
);
