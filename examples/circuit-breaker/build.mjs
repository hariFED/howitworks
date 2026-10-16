// Builds circuit-breaker.html: a live A2 drawing of a B16 miniature circuit breaker, cut on its
// centre plane.
//   node examples/circuit-breaker/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as X from "./extra.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k2 = 2 * K.PX_PER_MM;
const k5 = 5 * K.PX_PER_MM;

// ---------------------------------------------------------------- views
const DET = { r: 100 };
const B = { cx: 645, cy: 140, at: [13.5, 63.5] };
const C = { cx: 645, cy: 395, at: [34, 55] };
const D = { cx: 645, cy: 650, at: [28, 29.5] };
const VIEWS = {
  main: { x: 125, y: 468, scale: 2 },
  B: { x: B.cx - B.at[0] * k5, y: B.cy + B.at[1] * k5, scale: 5 },
  C: { x: C.cx - C.at[0] * k5, y: C.cy + C.at[1] * k5, scale: 5 },
  D: { x: D.cx - D.at[0] * k5, y: D.cy + D.at[1] * k5, scale: 5 },
  E: { x: 52, y: 236, scale: 1 },
};
const VM = K.view(VIEWS.main);
const VB = K.view(VIEWS.B);
const VCc = K.view({ ...VIEWS.C, name: "C" });
const VE = K.view(VIEWS.E);
const VD = K.view(VIEWS.D);
const S0 = { ...P.CLOSED, f: M.deflection(M.dTss(M.LOAD_NORMAL)) };
S0.lever = M.leverAngle(S0.f, 0);

// ---------------------------------------------------------------- the breaker, drawn into any view
function staticParts(V) {
  return (
    `<g data-role="phantom">${P.rail(V)}${P.wires(V)}${P.handlePhantom(V, M.HANDLE_OFF)}${P.bimetalCold(V)}</g>` +
    P.housing(V) + P.clip(V) + P.cages(V) + P.screws(V) + P.lineStrip(V) + P.fixedTip(V) + P.runner(V) + P.plates(V) +
    P.yoke(V) + P.former(V) + P.coil(V) + P.leadStrip(V) + P.loadStrip(V)
  );
}
function moving(V, S) {
  return (
    P.cradle(V, S.c) + P.pawl(V, S.c, S.pawl) + P.link(V, S.h, S.c) + P.lever(V, S.lever) + P.bimetal(V, S.f) + P.braids(V, S.a, S.f) +
    P.arm(V, S.a) + (V.name === "C" ? P.latchBreakout(V, S) : "") + P.handle(V, S.h) + P.springs(V, S.h, S.a) + P.plunger(V, S.plunger) + P.striker(V, S.plunger) + P.plungerSpring(V, S.plunger)
  );
}
const flowD = (V, S) => P.currentPath(S).map((l) => K.d(V, l, false)).join("");
function centrelines(V) {
  return K.centerline(V, [4, P.VC], [26, P.VC], 2) + K.centerline(V, [43.2, 70], [43.2, 92], 0) + K.centerline(V, [43.2, -2], [43.2, 20], 0) + K.centerMark(V, P.H, 2.4, 2) + K.centerMark(V, P.MP, 1.6, 2) + K.centerMark(V, P.T, 1.6, 2);
}
const layer = (V, id) =>
  staticParts(V) +
  `<g id="mech-${id}">${moving(V, S0)}</g>` +
  centrelines(V) +
  `<g data-role="fluid"><path id="flow-${id}" class="tint flow" d="${flowD(V, S0)}"/><path id="arc-${id}" class="tint arc" d=""/></g>`;

// ---------------------------------------------------------------- main view: section on the centre plane
const mainView = `<g data-geom="main">${layer(VM, "main")}</g>`;
const mainDims =
  K.dim(VM, [60, 90], [60, 0], { dir: "v", off: 510 - VM.p([60, 90])[0] }) +
  K.dim(VM, [70, 67.5], [70, 22.5], { dir: "v", off: 490 - VM.p([70, 67.5])[0] }) +
  K.dim(VM, [0, 0], [60, 0], { dir: "h", off: 44 }) +
  K.dim(VM, [0, 0], [70, 22.5], { dir: "h", off: 60 }) +
  `<g id="dim-handle-wrap">${X.angDim(VM, P.H, 31, M.HANDLE_OFF, M.HANDLE_ON, "40°", { id: "dim-handle" })}</g>`;
const mainMarks =
  K.detailMark(VM, B.at, DET.r / k5, "B", 80) +
  K.detailMark(VM, C.at, DET.r / k5, "C", 0) +
  K.detailMark(VM, D.at, DET.r / k5, "D", -60) +
  K.viewLabel(265, 46, "SECTION A-A", "ON THE CENTRE PLANE · SCALE 2:1");


// ---------------------------------------------------------------- VIEW E: front, 1:1, with the cutting plane A-A
function planeEnd(vTip, vIn, dirUp) {
  const [x, y0] = VE.p([0, vIn]);
  const [, y1] = VE.p([0, vTip]);
  const ay = y1;
  const head = `M${x + 14} ${ay}L${x + 7} ${K.r2(ay - 1.75)}L${x + 7} ${K.r2(ay + 1.75)}Z`;
  void dirUp;
  return `<path class="vis" d="M${x} ${y0}L${x} ${y1}M${x} ${ay}L${x + 8} ${ay}"/><path class="head" d="${head}"/><text class="t t-lg" x="${x + 21}" y="${K.r2(ay + 4.5)}" text-anchor="middle">A</text>`;
}
const viewE =
  `<g data-geom="E">` +
  `<g data-role="phantom">${K.line(VE, [[-3, 90], [-3, 93], [3, 93], [3, 90]], "phan")}${K.line(VE, [[-3, 0], [-3, -3], [3, -3], [3, 0]], "phan")}</g>` +
  P.frontView(VE) + `<g id="front-handle">${P.frontHandle(VE, M.HANDLE_ON)}</g>` + P.frontText(VE) +
  K.centerline(VE, [0, 91], [0, -1], 0) +
  `</g>` +
  `<g data-role="label">${planeEnd(96, 91, true)}${planeEnd(-5, -1, false)}</g>` +
  K.viewLabel(56, 270, "VIEW E", "FRONT 1:1");

// ---------------------------------------------------------------- details, 5:1
function detail(V, c, id, letter, title) {
  return (
    `<g data-geom="${id}" clip-path="url(#clip-${id})"><circle class="paper" cx="${c.cx}" cy="${c.cy}" r="${DET.r}"/>${layer(V, id)}${id === "D" ? `<g id="dim-f-wrap"></g>` : ""}</g>` +
    `<circle class="thin" cx="${c.cx}" cy="${c.cy}" r="${DET.r}"/>` +
    K.viewLabel(c.cx, c.cy + DET.r + 18, `DETAIL ${letter}`, title)
  );
}
const details =
  detail(VB, B, "B", "B", "CONTACTS AND ARC CHUTE · SCALE 5:1") +
  detail(VCc, C, "C", "C", "LATCH · SCALE 5:1") +
  detail(VD, D, "D", "D", "THERMAL AND MAGNETIC TRIP · SCALE 5:1");

// ---------------------------------------------------------------- DIAGRAM 1: time-current curve (log-log)
const CH = { x0: 92, x1: 470, y0: 566, y1: 742, i0: 0.5, i1: 100, t0: 0.001, t1: 10000 };
const lx = (m) => K.r2(CH.x0 + (Math.log10(m / CH.i0) / Math.log10(CH.i1 / CH.i0)) * (CH.x1 - CH.x0));
const ly = (t) => K.r2(CH.y1 - (Math.log10(Math.min(CH.t1, Math.max(CH.t0, t)) / CH.t0) / Math.log10(CH.t1 / CH.t0)) * (CH.y1 - CH.y0));
function curvePts() {
  const pts = [];
  const ic = M.I_CONV / M.IN;
  for (let m = ic * 1.0005; m < M.IM / M.IN; m *= 1.02) pts.push([m, M.thermalTime(m * M.IN)]);
  const im = M.IM / M.IN;
  pts.push([im, M.thermalTime(M.IM)]);
  for (let m = im * 1.0002; m <= CH.i1; m *= 1.03) pts.push([m, M.tripTime(m * M.IN)]);
  return pts.filter(([, t]) => t <= CH.t1 * 1.01).map(([m, t]) => `${lx(m)},${ly(t)}`).join(" ");
}
function chart() {
  let grid = "";
  let labels = "";
  for (let e = -3; e <= 4; e++) {
    const t = 10 ** e;
    grid += `M${CH.x0} ${ly(t)}H${CH.x1}`;
    const s = e < 0 ? String(t) : e < 4 ? String(t) : "10⁴";
    labels += `<text class="t t-sm" x="${CH.x0 - 8}" y="${K.r2(ly(t) + 2.7)}" text-anchor="end">${s}</text>`;
    for (const k of [2, 5]) if (e < 4) grid += `M${CH.x0} ${ly(t * k)}H${CH.x1}`;
  }
  for (const m of [0.5, 1, 2, 3, 5, 10, 20, 30, 50, 100]) {
    grid += `M${lx(m)} ${CH.y0}V${CH.y1}`;
    labels += `<text class="t t-sm" x="${lx(m)}" y="${CH.y1 + 11}" text-anchor="middle">${m}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 24}" text-anchor="middle">CURRENT I / In  (In = ${M.IN} A)</text>`;
  const ym = (CH.y0 + CH.y1) / 2;
  labels += `<text class="t t-sm t-mute" x="46" y="${ym}" text-anchor="middle" transform="rotate(-90 46 ${ym})">TRIP TIME t, s</text>`;
  // EN 60898-1 type B: magnetic band 3–5 In; thermal test points
  const band = `M${lx(3)} ${ly(0.1)}V${CH.y1}M${lx(5)} ${ly(0.1)}V${CH.y1}M${lx(3)} ${ly(0.1)}H${lx(5)}`;
  const tests =
    `M${lx(1.13)} ${ly(3600)}V${CH.y0}M${lx(1.13) - 3} ${ly(3600)}H${lx(1.13) + 3}` +
    `M${lx(1.45)} ${ly(3600)}V${CH.y1}M${lx(1.45) - 3} ${ly(3600)}H${lx(1.45) + 3}` +
    `M${lx(2.55)} ${ly(1)}V${ly(60)}M${lx(2.55) - 3} ${ly(1)}H${lx(2.55) + 3}M${lx(2.55) - 3} ${ly(60)}H${lx(2.55) + 3}`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="hid" d="${band}"/><path class="thin" d="${tests}"/>` +
    `<polyline class="vis" points="${curvePts()}"/>` +
    `<polyline id="trace" class="thin accent" points=""/>` +
    `<circle id="trip-mark" class="thin" cx="${CH.x0}" cy="${CH.y1}" r="3.2" style="display:none"/>` +
    `<circle id="chart-dot" class="accent-fill" cx="${CH.x0}" cy="${CH.y1}" r="2.8" style="display:none"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 790, "DIAGRAM 1", "TIME–CURRENT CURVE, TYPE B · ACCENT: OPERATING POINT · DASHED: 3–5 In BAND")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: states
const ST = { y: 84, h: 24, nodes: { closed: [850, 84], open: [990, 84], half: [1118, 84] }, w: 92 };
function states() {
  const node = (id, [x, y], text) =>
    `<g id="st-${id}"><rect class="st-box" x="${x - ST.w / 2}" y="${y - ST.h / 2}" width="${ST.w}" height="${ST.h}" rx="4"/>` +
    `<text class="t st-t" x="${x}" y="${y + 3.4}" text-anchor="middle">${text}</text></g>`;
  const arrow = (pts, id) => {
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("");
    const [ax, ay] = pts[pts.length - 1];
    const [bx, by] = pts[pts.length - 2];
    const L = Math.hypot(ax - bx, ay - by);
    const ux = (ax - bx) / L;
    const uy = (ay - by) / L;
    const h = `M${ax} ${ay}L${K.r2(ax - ux * 7 - uy * 1.8)} ${K.r2(ay - uy * 7 + ux * 1.8)}L${K.r2(ax - ux * 7 + uy * 1.8)} ${K.r2(ay - uy * 7 - ux * 1.8)}Z`;
    return `<path class="thin" d="${d}"/><path class="head" d="${h}"/>`;
  };
  const { closed: c, open: o, half: hf } = ST.nodes;
  const w2 = ST.w / 2;
  const lab = (x, y, s, a = "middle") => `<text class="t t-sm" x="${x}" y="${y}" text-anchor="${a}">${s}</text>`;
  return (
    `<g data-role="chart">` +
    arrow([[c[0] + w2, c[1] - 5], [o[0] - w2, o[1] - 5]]) + lab((c[0] + o[0]) / 2, c[1] - 9, "TRIP") +
    arrow([[o[0] + w2, o[1] - 5], [hf[0] - w2, hf[1] - 5]]) + lab((o[0] + hf[0]) / 2, o[1] - 9, "COOLED") +
    arrow([[hf[0] - w2, hf[1] + 5], [o[0] + w2, o[1] + 5]]) + lab((o[0] + hf[0]) / 2, o[1] + 15, "FAULT") +
    arrow([[hf[0], hf[1] - ST.h / 2], [hf[0], 50], [c[0], 50], [c[0], c[1] - ST.h / 2]]) + lab((c[0] + hf[0]) / 2, 46, "RESET HOLDS") +
    arrow([[c[0], c[1] + ST.h / 2], [c[0], 124]]) + lab(c[0] + 6, 121, "HANDLE DOWN", "start") +
    `<g id="st-off"><rect class="st-box" x="${c[0] - 26}" y="124" width="52" height="18" rx="4"/><text class="t t-sm st-t" x="${c[0]}" y="135.5" text-anchor="middle">OFF</text></g>` +
    node("closed", c, "CLOSED") + node("open", o, "OPEN") + node("half", hf, "HALF-OPEN") +
    `</g>` +
    K.viewLabel(1000, 160, "DIAGRAM 2", "STATES · THE SOFTWARE PATTERN'S NAMES")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "HOUSING HALF", "PA66-GF25, UL 94 V-0", "2"],
  ["2", "DIN RAIL CLIP", "POM-C", "1"],
  ["3", "TERMINAL CAGE 12×14", "DC01 + Zn", "2"],
  ["4", "SCREW M5×12 ISO 7045-PZ", "STEEL 4.8 + Zn", "2"],
  ["5", "LINE STRIP 6×1.6, UPPER RUNNER", "Cu-ETP CW004A", "1"],
  ["6", "FIXED CONTACT TIP 4×1.2", "AgC 4", "1"],
  ["7", "LOWER ARC RUNNER 6×1.6", "Cu-ETP CW004A", "1"],
  ["8", "SPLITTER PLATE 0.8, V-NOTCH", "DC01, Ni PLATED", "9"],
  ["9", "COIL LEAD STRIP 6×1.6", "Cu-ETP CW004A", "1"],
  ["10", "MOVING CONTACT ARM", "CuCrZr CW106C", "1"],
  ["11", "MOVING CONTACT TIP 4×1.2", "AgNi 10", "1"],
  ["12", "MAIN PIVOT PIN Ø2×12 ISO 2338", "1.4305", "1"],
  ["13", "CRADLE, 2 PLATES, RIVETED", "DC04 1.0", "1"],
  ["14", "LATCH PAWL", "C60E +QT", "1"],
  ["15", "TRIP LEVER", "PA66-GF30", "1"],
  ["16", "COUPLING LINK Ø1.2", "1.4310 WIRE", "1"],
  ["17", "TOGGLE HANDLE", "PA66", "1"],
  ["18", "HANDLE PIN Ø3×14 ISO 2338", "1.4305", "1"],
  ["19", "HANDLE SPRING Ø0.6, 9 TURNS", "EN 10270-1 SH", "1"],
  ["20", "ARM SPRING Ø0.7, 9 TURNS", "EN 10270-1 SH", "1"],
  ["21", "SOLENOID COIL, 7 TURNS Ø1.8", "Cu, IEC 60317-13", "1"],
  ["22", "COIL FORMER", "PA46", "1"],
  ["23", "MAGNET YOKE WITH CORE", "DC01 / C10", "1"],
  ["24", "PLUNGER Ø6×6.5", "C10, ANNEALED", "1"],
  ["25", "STRIKER PIN Ø1.6", "1.4305", "1"],
  ["26", "PLUNGER SPRING Ø0.35, 4 TURNS", "1.4310", "1"],
  ["27", "FLEXIBLE BRAID 4 mm²", "Cu, TINNED", "2"],
  ["28", "BIMETAL 26×6×0.6, RIVETED", "TB 1577 (DIN 1715)", "1"],
  ["29", "LOAD STRIP 6×1.6", "Cu-ETP CW004A", "1"],
  ["30", "SET SCREW M2×4 ISO 4026", "STEEL 45H", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const ROW = 14;
const bomTop = TB.y - (18 + BOM.length * ROW);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 32, align: "center", title: "ITEM" },
    { w: 200, title: "DESCRIPTION" },
    { w: 136, title: "MATERIAL" },
    { w: 32, align: "center", title: "QTY" },
  ],
  BOM,
  { rowH: ROW }
);

const notes = K.notes(790, 186, "NOTES", [
  `BIMETAL 28: R = ${K.fmt(M.R_BI * 1000, 2)} mΩ, τ = Rth·C = ${M.TAU} s; TRIPS AT f = ${M.F_TRIP} mm, ΔT = ${Math.round(M.DT_TRIP)} K.`,
  `THERMAL: t = τ·ln(ΔTss / (ΔTss − ${Math.round(M.DT_TRIP)} K)), ΔTss = Rth·R·I². NO TRIP BELOW ${K.fmt(M.I_CONV, 1)} A.`,
  `MAGNETIC: COIL 21 BEATS SPRING 26 (${M.SPRING_F0} N) ABOVE Im = ${K.fmt(M.IM, 0)} A = ${K.fmt(M.IM / M.IN, 1)} In.`,
  `A RESET HOLDS ONLY WHEN f < ${M.F_RESET} mm (ΔT < ${Math.round(M.DT_RESET)} K): OPEN → HALF-OPEN.`,
  `CRADLE 13, PAWL 14 BEHIND THE PLANE. MOTION SLOWED: A FAULT CLEARS IN ≈ 5 ms.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "MCB B16 · CENTRE SECTION", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-009", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "2:1" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · A · s · K" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE HANDLE · 1 2 3 LOAD · ← → CURRENT · SPACE TOUR", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  [B, C, D].map((c, i) => `<clipPath id="clip-${"BCD"[i]}"><circle cx="${c.cx}" cy="${c.cy}" r="${DET.r}"/></clipPath>`).join("") +
  `</defs>`;

const [h0x, h0y] = VM.p([48, 62]);
const [h1x, h1y] = VM.p([88, 28]);
const hit = `<rect class="hit" data-drag="handle" x="${h0x}" y="${h0y}" width="${K.r2(h1x - h0x)}" height="${K.r2(h1y - h0y)}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a B16 miniature circuit breaker cut on its centre plane. Drag the handle or use the arrow keys; keys 1, 2 and 3 set normal load, overload and a short circuit. The bimetal, the latch, the arc and the trip curve follow." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  viewE +
  mainDims +
  `<g id="balloons"></g>` +
  mainMarks +
  details +
  chart() +
  states() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the handle · <kbd>↑</kbd> <kbd>↓</kbd> on/off · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> normal, overload, short · <kbd>←</kbd> <kbd>→</kbd> current · <kbd>Space</kbd> tour · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const css =
  `.bp-sheet .hit{fill:transparent}` +
  `.bp-sheet .vis2{fill:none;stroke:var(--bp-ink);stroke-width:calc(var(--bp-thick) * 2);stroke-linejoin:round}` +
  `.bp-sheet .tint.flow{fill:none;stroke:var(--bp-accent);stroke-width:1.3px;stroke-dasharray:4.5 3.5;stroke-linecap:round;stroke-linejoin:round}` +
  `.bp-sheet .tint.arc{fill:none;stroke:var(--bp-accent);stroke-width:1.4px;stroke-linecap:round;stroke-linejoin:round}` +
  `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}` +
  `.bp-sheet .st-box{fill:var(--bp-paper);stroke:var(--bp-ink);stroke-width:var(--bp-thin)}` +
  `.bp-sheet .on .st-box{fill:var(--bp-ink);stroke-width:var(--bp-thick)}` +
  `.bp-sheet .on .st-t{fill:var(--bp-paper);font-weight:600}`;

const size = writePage(join(here, "circuit-breaker.html"), {
  title: "Circuit Breaker Section",
  description: "A live engineering drawing of a B16 miniature circuit breaker: the bimetal bends with I²t, the coil snaps the latch above 4 In, and the arc dies in the splitter plates.",
  svg,
  bar,
  css,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "extra.mjs"), "X"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHART__", JSON.stringify(CH)).replace("__DETAILS__", JSON.stringify({ B, C, D, r: DET.r })),
});
console.log(`circuit-breaker.html  ${(size / 1024).toFixed(0)} KB  Ic ${M.I_CONV.toFixed(1)} A  Im ${M.IM.toFixed(1)} A  tau ${M.TAU} s  arm open ${M.ARM_OPEN.toFixed(1)}°`);
