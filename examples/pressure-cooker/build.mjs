// Builds pressure-cooker.html: a live A2 drawing of a 6 L stovetop pressure cooker in section.
//   node examples/pressure-cooker/build.mjs
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
const at = (sx, sy, [u, v], k) => ({ x: K.r2(sx - u * k), y: K.r2(sy + v * k) });

// ---------------------------------------------------------------- layout (sheet units)
const B = { x: 588, y: 62, w: 182, h: 238, c: [-10.5, 208] }; // DETAIL B, rect, 2:1
const C = { cx: 145, cy: 560, r: 105, c: [-113, 165] }; // DETAIL C, circle, 5:1
const D = { x: 592, y: 335, w: 176, h: 290, c: [94, 180] }; // DETAIL D, rect, 5:1
const E = { cx: 418, cy: 615 }; // VIEW E, plan, 1:5
const T1 = { x: 600, y: 672 }; // TABLE 1
const VIEWS = {
  main: { x: 262, y: 352, scale: 1 / 2 },
  pinDimX: 584,
  B: { ...at(B.x + B.w / 2, B.y + B.h / 2, B.c, k2), scale: 2 },
  C: { ...at(C.cx, C.cy, C.c, k5), scale: 5 },
  D: { ...at(D.x + D.w / 2, D.y + D.h / 2, D.c, k5), scale: 5 },
  E: { x: E.cx, y: E.cy, scale: 1 / 2.5 },
};
const VM = K.view(VIEWS.main);
const VB = K.view(VIEWS.B);
const VC = K.view(VIEWS.C);
const VD = K.view(VIEWS.D);
const VE = K.view(VIEWS.E);

// ---------------------------------------------------------------- the cooker, drawn into any view
const level0 = M.waterLevel(M.cooker());

function potParts(V) {
  return P.capsule(V) + P.disc(V) + P.pot(V) + P.brackets(V) + P.potHandle(V) + P.helperHandle(V) + P.handleScrews(V);
}

// Everything carried by the lid, in one group the page lifts by the lid's rise.
function lidParts(V, id) {
  return (
    `<g id="lid-${id}">` +
    P.lid(V) +
    P.lidHandle(V) +
    P.lidScrew(V) +
    P.slide(V) +
    P.knob(V) +
    P.slideSpring(V) +
    P.washers(V) +
    P.stem(V) +
    P.stemNuts(V) +
    P.safetyBody(V) +
    `<g id="sv-${id}">${P.safetyMoving(V, 0)}</g>` +
    `<g id="pin-${id}">${P.pin(V)}</g>` +
    `<g id="wt-${id}">${P.weight(V)}</g>` +
    `</g>`
  );
}

function fluid(V, id, { water = true } = {}) {
  return (
    `<g data-role="fluid">` +
    `<path id="wash-${id}" class="tint wash" fill-opacity="0.02" d="${K.d(V, P.steamPoly(level0, 0))}"/>` +
    `<path id="steam-${id}" class="tint" fill-opacity="0.1" d="${K.d(V, P.steamPoly(level0, 0))}"/>` +
    `</g>` +
    (water ? `<path id="water-${id}" class="water" d="${K.d(V, P.waterPoly(level0))}"/><path id="surf-${id}" class="thin" d=""/><path id="bub-${id}" class="thin" d=""/>` : "")
  );
}
const plume = (id) => `<g data-role="fluid" id="plume-${id}"></g>`;

function centrelines(V, { main = false } = {}) {
  return (
    K.centerline(V, [0, -10], [0, 236], 0) +
    K.centerline(V, [P.SAFETY_U, 180], [P.SAFETY_U, 204], 0) +
    K.centerline(V, [P.PIN_U, 162], [P.PIN_U, main ? 186 : 199], 0) +
    (main ? "" : K.centerline(V, [P.SCREW_U, 168], [P.SCREW_U, 190], 0))
  );
}

// ---------------------------------------------------------------- main view: SECTION A-A, 1:2
const mainView =
  `<g data-geom="main">` +
  fluid(VM, "main") +
  potParts(VM) +
  `<g id="gk-main">${P.gasket(VM, 0)}</g>` +
  lidParts(VM, "main") +
  `<g data-role="phantom">${P.hob(VM)}</g>` +
  centrelines(VM, { main: true }) +
  plume("main") +
  `</g>`;

const depthDim = (level) =>
  K.dim(VM, [98, M.FLOOR], [98, level], { dir: "v", off: VM.p([128, 0])[0] - VM.p([98, 0])[0], text: K.fmt(level - M.FLOOR, 1), id: "dim-depth" });

const [, yBase] = VM.p([0, 0]);
const mainDims =
  K.dim(VM, [-170, 0], [0, 229], { dir: "v", off: 52 - VM.p([-170, 0])[0] }) +
  K.dim(VM, [-170, 156], [280, 158], { dir: "h", off: yBase + 42 - VM.p([-170, 156])[1] }) +
  K.dim(VM, [-93, 0], [93, 0], { dir: "h", off: 22, prefix: "Ø" }) +
  K.dim(VM, [-M.R_IN, 120], [M.R_IN, 120], { dir: "h", off: 0, prefix: "Ø" }) +
  `<g id="dim-depth-wrap">${depthDim(level0)}</g>`;

// Balloons on the pot sit left and right of it; those on the lid ride with the lid.
const mainBalloons =
  K.balloon(VM, [-92.7, 3], [128, 372], 2, { target: 2 }) +
  K.balloon(VM, [-80, 3.3], [104, 330], 3, { target: 3 }) +
  K.balloon(VM, [-110.5, 80], [104, 290], 1, { target: 1 }) +
  K.balloon(VM, [-112, 140], [80, 248], 7, { target: 7 }) +
  K.balloon(VM, [-158, 156], [80, 160], 8, { target: 8 }) +
  K.balloon(VM, [220, 158], [470, 252], 6, { target: 6 }) +
  K.balloon(VM, [P.PH_SCREW, 156], [430, 270], 10, { target: 10 }) +
  `<g id="mvb-main">` +
  K.balloon(VM, [60, M.lidTop(60) - 0.6], [296, 100], 4, { target: 4 }) +
  K.balloon(VM, [P.SCREW_U, 171.5], [326, 100], 23, { target: 23 }) +
  K.balloon(VM, [124, 194], [420, 100], 24, { target: 24 }) +
  K.balloon(VM, [210, 184], [470, 120], 9, { target: 9 }) +
  K.balloon(VM, [150.225, 178.7 + 1.75], [500, 140], 18, { target: 18 }) +
  `</g>`;

const mainMarks =
  K.detailMark(VM, B.c, 30, "B", 120) +
  K.detailMark(VM, C.c, 11, "C", 120) +
  K.detailMark(VM, D.c, 18, "D", 100) +
  K.viewLabel(262, 52, "SECTION A-A", "SCALE 1:2");

// ---------------------------------------------------------------- DETAIL B: the valves, 2:1
const detailB =
  `<g data-geom="B" clip-path="url(#clip-B)"><rect class="paper" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}"/>` +
  fluid(VB, "B", { water: false }) +
  P.pot(VB) +
  lidParts(VB, "B") +
  centrelines(VB) +
  plume("B") +
  `</g><rect class="thin" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10"/>` +
  `<g id="mvb-B">` +
  K.balloon(VB, [-24 - 4.5, 197.5], [570, 150], 19, { target: 19 }) +
  K.balloon(VB, [-24, 200.5], [570, 120], 20, { target: 20 }) +
  K.balloon(VB, [-24 + 1.6, 184.5], [570, 250], 21, { target: 21 }) +
  K.balloon(VB, [-24 + 2.15, 186 + 0.25 + ((11.2 - 0.5) / 6) * 2], [570, 210], 22, { target: 22 }) +
  K.balloon(VB, [5, 192], [790, 196], 12, { target: 12 }) +
  K.balloon(VB, [6.5, 185.3], [790, 252], 11, { target: 11 }) +
  K.balloon(VB, [5.5, 187.8], [790, 224], 14, { target: 14 }) +
  `<g id="wtb-B">${K.balloon(VB, [7, 214], [790, 150], 13, { target: 13 })}</g>` +
  `</g>` +
  K.viewLabel(B.x + B.w / 2, B.y + B.h + 18, "DETAIL B", "VALVES · SCALE 2:1");

// ---------------------------------------------------------------- DETAIL C: rim, lugs, gasket, window, 5:1
const detailC =
  `<g data-geom="C" clip-path="url(#clip-C)"><circle class="paper" cx="${C.cx}" cy="${C.cy}" r="${C.r}"/>` +
  fluid(VC, "C", { water: false }) +
  potParts(VC) +
  `<g id="gk-C">${P.gasket(VC, 0)}</g>` +
  lidParts(VC, "C") +
  plume("C") +
  `</g><circle class="thin" cx="${C.cx}" cy="${C.cy}" r="${C.r}"/>` +
  `<g id="mvb-C">${K.balloon(VC, [-110.5, 171], [272, 470], 5, { target: 5 })}</g>` +
  K.viewArrow(VC, [-109, 174.2], [0, 1], "W", 34) +
  K.viewLabel(C.cx, C.cy + C.r + 18, "DETAIL C", "BAYONET LUG, GASKET, WINDOW · 5:1");

// ---------------------------------------------------------------- DETAIL D: lock pin and slide, 5:1
const PIN_DIM_X = 584;
const pinUp = () => {
  const v = P.PIN_DOWN;
  const u = P.PIN_U;
  return K.line(VD, [[u - 4.5, v], [u + 4.5, v], [u + 4.5, v + 1.5], [u + 2.5, v + 1.5], [u + 2.5, v + 11.9], [u - 2.5, v + 11.9], [u - 2.5, v + 1.5], [u - 4.5, v + 1.5]], "phan", true);
};
const pinDim = (rise) =>
  K.dim(VD, [P.PIN_U - 4.5, P.PIN_DOWN + 1.5], [P.PIN_U - 4.5, P.PIN_DOWN + 1.5 + rise], { dir: "v", off: PIN_DIM_X - VD.p([P.PIN_U - 4.5, 0])[0], text: K.fmt(rise, 1), id: "dim-pin" });
const detailD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>` +
  fluid(VD, "D", { water: false }) +
  lidParts(VD, "D") +
  `<g data-role="phantom">${pinUp()}</g>` +
  centrelines(VD) +
  plume("D") +
  `</g><rect class="thin" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/>` +
  `<g id="dim-pin-wrap">${pinDim(0)}</g>` +
  `<g id="pinb-D">${K.balloon(VD, [P.PIN_U - 1, P.PIN_DOWN + 6], [575, 474], 15, { target: 15 })}</g>` +
  `<g id="ringb-D">${K.balloon(VD, [P.PIN_U - 3.3, P.PIN_DOWN + 2.3], [575, 516], 16, { target: 16 })}</g>` +
  `<g id="mvb-D">${K.balloon(VD, [89.6, 178.75], [575, 380], 17, { target: 17 })}</g>` +
  K.viewLabel(D.x + D.w / 2, D.y + D.h + 18, "DETAIL D", "LOCK PIN AND SLIDE · 5:1");

// ---------------------------------------------------------------- VIEW E: the lid from above, 1:5
function planView() {
  const V = VE;
  const circ = (r, cls, u = 0, w = 0) => K.line(V, K.circle(u, w, r, 72), cls, true);
  let out = "";
  // pot and helper handle, then the lid, then what sits on it
  // the handles run on past the break at r = 205
  const cutOff = (pts) => `<path class="paper" d="${K.d(V, pts)}"/>` + K.line(V, pts, "vis", false);
  out += cutOff([[160, -15.7], [128, -16], [128, 16], [160, 15.7]]);
  out += K.body(V, K.flipU([[128, -26], [150, -24], ...K.arc(150, 0, 20, -90, 90, 10).slice(1), [128, 26]]));
  out += K.body(V, K.circle(0, 0, M.LID_OUT, 96));
  const lugs = [];
  for (let i = 0; i < M.LUGS; i++) {
    const a0 = i * 60 - 14;
    lugs.push([...K.arc(0, 0, 121, a0, a0 + 28, 8), ...K.arc(0, 0, 114, a0 + 28, a0, 8), K.arc(0, 0, 121, a0, a0, 1)[0]]);
  }
  out += K.lines(V, lugs, "hid");
  // the release window, left, on the cutting plane
  out += K.line(V, [...K.arc(-109, 6, 3, 0, 180, 6), ...K.arc(-109, -6, 3, 180, 360, 6)], "vis", true);
  // lid handle with its knob slot, knob and sight hole
  out += cutOff([[160, -17.3], [70, -19], [70, 19], [160, 17.3]]);
  out += K.breakLine(V, [160, -22], [160, 22]);
  out += K.line(V, K.rrect(118, -6.5, 136, 6.5, 2), "vis", true) + K.body(V, K.rrect(120, -5.5, 128, 5.5, 1.4));
  out += circ(2, "vis", P.PIN_U, 0);
  // valves
  out += circ(M.WEIGHT_R, "vis") + circ(7.5, "vis") + circ(5, "vis");
  const hex = [];
  for (let i = 0; i < 6; i++) hex.push([P.SAFETY_U + 6.93 * Math.cos((i * Math.PI) / 3), 6.93 * Math.sin((i * Math.PI) / 3)]);
  out += K.line(V, hex, "vis", true) + circ(1.4, "vis", P.SAFETY_U, 0);
  out += K.centerline(V, [0, -128], [0, 128], 0);
  return `<g data-geom="E">${out}</g>`;
}
// The cutting plane A-A: a chain line, thick at the ends, arrows showing the direction of view.
function cuttingPlane() {
  const [x0, y] = VE.p([-186, 0]);
  const [x1] = VE.p([172, 0]);
  const arrow = (x) => `<path class="thin" d="M${x} ${y}V${y - 13}"/><path class="head" d="M${x} ${y - 19}L${x - 1.75} ${y - 12}L${x + 1.75} ${y - 12}Z"/><text class="t t-lg" x="${x}" y="${y - 23}" text-anchor="middle">A</text>`;
  return (
    `<g data-role="label"><path class="ctr" d="M${x0} ${y}H${x1}"/><path class="vis cut-end" d="M${x0} ${y}h9M${x1} ${y}h-9"/>` +
    arrow(x0) + arrow(x1) + `</g>`
  );
}
const viewE = planView() + cuttingPlane() + K.viewLabel(E.cx - 8, E.cy + 120, "VIEW E", "LID FROM ABOVE, BROKEN · 1:2.5");

// ---------------------------------------------------------------- TABLE 1: saturated steam, from the model
function steamTable() {
  const cols = [34, 40, 40, 52];
  const head = ["T °C", "p kPa", "bar g", "hfg kJ/kg"];
  const Ts = [100, 105, 110, 115, M.T_SET, 120, 125, M.tsat(M.P_ATM + M.P_SAFETY)];
  const rowH = 12;
  const w = cols.reduce((a, b) => a + b, 0);
  const h = 16 + Ts.length * rowH;
  let rules = "";
  let text = "";
  let x = T1.x;
  for (const [i, c] of cols.entries()) {
    if (i) rules += `M${x} ${T1.y}V${T1.y + h}`;
    text += `<text class="t t-sm t-head" x="${x + c - 4}" y="${T1.y + 12}" text-anchor="end">${head[i]}</text>`;
    x += c;
  }
  Ts.forEach((T, j) => {
    const y = T1.y + 16 + j * rowH;
    rules += `M${T1.x} ${y}H${T1.x + w}`;
    const p = M.psat(T);
    const vals = [K.fmt(T, 1), p.toFixed(1), ((p - M.P_ATM) / 100).toFixed(2), (M.latent(T) / 1000).toFixed(0)];
    let cx = T1.x;
    const cls = Math.abs(T - M.T_SET) < 0.01 ? "t t-sm t-head" : "t t-sm";
    vals.forEach((v, i) => {
      text += `<text class="${cls}" x="${cx + cols[i] - 4}" y="${y + rowH - 3.6}" text-anchor="end">${v}</text>`;
      cx += cols[i];
    });
  });
  return (
    `<g data-role="notes"><rect class="paper" x="${T1.x}" y="${T1.y}" width="${w}" height="${h}"/><path class="thin" d="${rules}"/><rect class="vis" x="${T1.x}" y="${T1.y}" width="${w}" height="${h}"/>${text}</g>` +
    K.viewLabel(T1.x + w / 2, T1.y + h + 18, "TABLE 1", "SATURATED STEAM · BOLD: WEIGHT")
  );
}

// ---------------------------------------------------------------- DIAGRAM 1: the saturation curve
const CH = { x0: 846, x1: 1112, y0: 50, y1: 164, t0: 20, t1: 130, p1: 280 };
const chX = (T) => K.r2(CH.x0 + ((T - CH.t0) / (CH.t1 - CH.t0)) * (CH.x1 - CH.x0));
const chY = (p) => K.r2(CH.y1 - (p / CH.p1) * (CH.y1 - CH.y0));
function chart() {
  let grid = "";
  let labels = "";
  for (let p = 0; p <= CH.p1; p += 40) {
    grid += `M${CH.x0} ${chY(p)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 5}" y="${K.r2(chY(p) + 2.7)}" text-anchor="end">${p}</text>`;
  }
  for (let T = 20; T <= 130; T += 10) {
    grid += `M${chX(T)} ${CH.y0}V${CH.y1}`;
    if (T % 20 === 0 || T === 130) labels += `<text class="t t-sm" x="${chX(T)}" y="${CH.y1 + 11}" text-anchor="middle">${T}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 23}" text-anchor="middle">WATER TEMPERATURE T, °C</text>`;
  const my = (CH.y0 + CH.y1) / 2;
  labels += `<text class="t t-sm t-mute" x="816" y="${my}" text-anchor="middle" transform="rotate(-90 816 ${my})">p ABSOLUTE, kPa</text>`;
  let curve = "";
  for (let T = CH.t0; T <= CH.t1; T += 1) curve += `${curve ? "L" : "M"}${chX(T)} ${chY(M.psat(T))}`;
  const lines = [
    [M.P_ATM, "ATM"],
    [M.P_ATM + M.P_SET, "WEIGHT"],
    [M.P_ATM + M.P_SAFETY, "SAFETY"],
  ];
  let refs = "";
  for (const [p, name] of lines) {
    refs += `<path class="hid" d="M${CH.x0} ${chY(p)}H${CH.x1}"/>`;
    labels += `<text class="t t-sm" x="${CH.x1 + 4}" y="${K.r2(chY(p) + 2.7)}">${name}</text>`;
  }
  // the two boiling points: open pan and under the weight
  const drop = (T, p) => `M${chX(T)} ${chY(p)}V${CH.y1}`;
  refs += `<path class="thin" d="${drop(100, M.P_ATM)}${drop(M.T_SET, M.P_ATM + M.P_SET)}"/>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    refs +
    `<path class="vis" d="${curve}"/>` +
    `<polyline id="trace-prev" class="thin" points=""/>` +
    `<polyline id="trace-now" class="vis accent" points=""/>` +
    `<circle id="chart-dot" class="accent-fill" cx="${chX(20)}" cy="${chY(M.P_ATM)}" r="2.6"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 210, "DIAGRAM 1", "THICK: SATURATION p(T) · ACCENT: THIS BATCH · THIN: LAST")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "POT BODY Ø222×1, 6 L", "X5CrNi18-10", "1"],
  ["2", "BASE CAPSULE Ø186×0.6", "X6Cr17", "1"],
  ["3", "HEAT DISC Ø185×5.4", "EN AW-1050A", "1"],
  ["4", "LID Ø244×1.2", "X5CrNi18-10", "1"],
  ["5", "GASKET Ø220, L-SECTION", "VMQ 60 ShA", "1"],
  ["6", "MAIN HANDLE", "PF31 PHENOLIC", "1"],
  ["7", "HANDLE BRACKET 2 mm, WELDED", "X5CrNi18-10", "2"],
  ["8", "HELPER HANDLE", "PF31 PHENOLIC", "1"],
  ["9", "LID HANDLE", "PF31 PHENOLIC", "1"],
  ["10", "PAN SCREW M5×16 ISO 7045", "A2-70", "2"],
  ["11", "VALVE STEM M8×1, BORE Ø3", "CuZn39Pb3", "1"],
  ["12", "THIN NUT M8×1 ISO 8675", "A2-70", "2"],
  ["13", `OPERATING WEIGHT ${Math.round(M.WEIGHT_G)} g`, "CuZn39Pb3, Ni", "1"],
  ["14", "SEAL WASHER Ø14×Ø8×2", "VMQ 60 ShA", "2"],
  ["15", "LOCK PIN Ø5", "X8CrNiS18-9", "1"],
  ["16", "O-RING 5×1.6 ISO 3601", "VMQ 70 ShA", "1"],
  ["17", "LOCK SLIDE 1.5 mm", "X6Cr17", "1"],
  ["18", "SLIDE SPRING Ø4×0.45", "EN 10270-3", "1"],
  ["19", "SAFETY VALVE BODY M8×1", "X8CrNiS18-9", "1"],
  ["20", "SAFETY PLUNGER", "X8CrNiS18-9", "1"],
  ["21", "SAFETY SEAL Ø5.2×1", "VMQ 70 ShA", "1"],
  ["22", "SAFETY SPRING Ø4.3×0.5", "EN 10270-3", "1"],
  ["23", "BUTTON SCREW M5×12 ISO 7380", "A2-70", "1"],
  ["24", "SLIDE KNOB", "PA66", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const ROW = 14;
const bomTop = TB.y - (18 + BOM.length * ROW);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 34, align: "center", title: "ITEM" },
    { w: 206, title: "DESCRIPTION" },
    { w: 126, title: "MATERIAL" },
    { w: 34, align: "center", title: "QTY" },
  ],
  BOM,
  { rowH: ROW }
);

const kN = M.lidForce(M.P_SET) / 1000;
const notes = K.notes(790, 274, "NOTES", [
  `p_sat FROM ANTOINE: log10 p = 8.07131 − 1730.63 / (233.426 + T), p IN mmHg.`,
  `WEIGHT 13, ${K.fmt(M.WEIGHT_G, 1)} g ON Ø${M.ORIFICE_D} BORE: m·g/A = ${K.fmt(M.P_SET / 100, 2)} bar, SO WATER BOILS AT ${K.fmt(M.T_SET, 1)} °C.`,
  `PIN 15 RISES AT ${M.P_LIFT} kPa, SEALS AND ENTERS SLIDE 17: THE LID CANNOT TURN.`,
  `LID LOAD ON 6 LUGS ${K.fmt(kN, 1)} kN. SAFETY VALVE ${M.P_SAFETY / 100} bar; THEN GASKET 5 VENTS AT W.`,
  `${M.WATER0} L WATER, ${M.Q_HOB / 1000} kW IN, TOUR ×${M.TIME_WARP}. PINS, SCREWS, NUTS NOT CUT. EN 12778.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "PRESSURE COOKER 6 L · SECTION", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-018", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:2" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · bar (gauge)" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · SPACE HOB · DRAG THE WEIGHT TO VENT · B BLOCKS IT · R REFILLS", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="steam" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="steam-dot" cx="0.8" cy="0.8" r="0.62"/><circle class="steam-dot" cx="2.4" cy="2.4" r="0.62"/></pattern>` +
  `<pattern id="water" patternUnits="userSpaceOnUse" width="14" height="4.2"><path class="hl" d="M1 2.1h6"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-B"><rect x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-C"><circle cx="${C.cx}" cy="${C.cy}" r="${C.r}"/></clipPath>` +
  `<clipPath id="clip-D"><rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/></clipPath>` +
  `</defs>`;

// Drag the weight: in the section and in Detail B.
const hitW = (V, pad) => {
  const [x0, y0] = V.p([-M.WEIGHT_R - pad, 232]);
  const [x1, y1] = V.p([M.WEIGHT_R + pad, 198]);
  return `<rect class="hit" data-drag="${V === VM ? "main" : "B"}" x="${x0}" y="${y0}" width="${K.r2(x1 - x0)}" height="${K.r2(y1 - y0)}"/>`;
};

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a stovetop pressure cooker cut through its axis. Space switches the hob; drag the weight or press the arrow keys to vent by hand. Temperature, pressure, the lock pin and the saturation chart follow." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  mainBalloons +
  mainMarks +
  detailB +
  detailC +
  detailD +
  viewE +
  steamTable() +
  chart() +
  notes +
  bom +
  title +
  hitW(VM, 4) +
  hitW(VB, 2) +
  `</svg>`;

const bar =
  `<span><kbd>Space</kbd> hob on/off · drag the weight or <kbd>↑</kbd> <kbd>↓</kbd> to vent by hand · <kbd>B</kbd> block the vent · <kbd>R</kbd> refill · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "pressure-cooker.html"), {
  title: "Pressure Cooker Section",
  description: "A live engineering drawing of a stovetop pressure cooker: the weight vents, the lock pin rises and the boiling point follows the saturation curve.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#steam)}.bp-sheet .steam-dot{fill:var(--bp-accent)}.bp-sheet .tint.wash{fill:var(--bp-accent)}` +
    `.bp-sheet .water{fill:url(#water)}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet .cut-end{stroke-width:2.2px}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHART__", JSON.stringify(CH)),
});
console.log(
  `pressure-cooker.html  ${(size / 1024).toFixed(0)} KB  weight ${M.WEIGHT_G.toFixed(1)} g  set ${M.P_SET.toFixed(1)} kPa  T ${M.T_SET.toFixed(2)} °C  V ${M.V_POT.toFixed(2)}+${M.V_CROWN.toFixed(2)} L  lid ${kN.toFixed(2)} kN`
);
