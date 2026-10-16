// Builds gear-pump.html: a live A2 drawing of an external gear pump, group 2, 8 cm³/rev.
//   node examples/gear-pump/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k1 = K.PX_PER_MM;
const k5 = 5 * k1;

// ---------------------------------------------------------------- views
const DC = { cx: 674, cy: 168, r: 98 }; // detail C circle on the sheet
const DD = { x: 574, y: 500, w: 194, h: 262 }; // detail D window on the sheet
const DD_W = { u0: -36, z0: -38 }; // its top-left corner in the world
const VIEWS = {
  A: { x: 295, y: 250, scale: 2 },
  C: { x: DC.cx, y: DC.cy, scale: 5 },
  B: { x: 200, y: 623.3, scale: 1 },
  D: { x: DD.x - DD_W.u0 * k5, y: DD.y - DD_W.z0 * k5, scale: 5 },
  F: { x: 674, y: 378, scale: 2 },
};
const VA = K.view(VIEWS.A);
const VC = K.view(VIEWS.C);
const VB = K.view(VIEWS.B);
const VD = K.view(VIEWS.D);
const VF = K.view(VIEWS.F);
const P_START = 30;

// ---------------------------------------------------------------- the oil (the accent)
const oilLayer = (V, id) => {
  const bands = P.oilBands(V, 0, P_START);
  return (
    `<g data-role="fluid">` +
    bands.map((d, i) => `<path id="oil-${id}-${i}" class="tint" fill-opacity="${P.bandOpacity(i)}" d="${d}"/>`).join("") +
    `</g>`
  );
};

const gears = (V, id) =>
  `<g data-part="4" id="g1-${id}">${P.gearA(V, 1, 0)}</g><g data-part="5" id="g2-${id}">${P.gearA(V, 2, 0)}</g>`;

// ---------------------------------------------------------------- SECTION A-A, across the shafts, 2:1
const H = M.HOUSING;
const centresA =
  P.gearMarks(VA) +
  K.centerline(VA, [0, 13], [0, 44], 0) +
  K.centerline(VA, [0, -19], [0, -44], 0) +
  [-1, 1].map((su) => [-1, 1].map((sv) => K.centerMark(VA, [su * M.BOLT.u, sv * M.BOLT.v], 6, 2)).join("")).join("");

const viewA =
  `<g data-geom="A">` +
  P.bushingFace(VA) +
  oilLayer(VA, "A") +
  gears(VA, "A") +
  P.housingA(VA) +
  P.boltsA(VA) +
  centresA +
  `</g>`;

// The stepped cutting plane B-B: through both axes, stepping out to pass through two screws.
function cuttingPlaneB() {
  const j = 44.5;
  const e = 64;
  const bv = M.BOLT.v;
  const chain = K.line(VA, [[-e, bv], [-j, bv], [-j, 0], [j, 0], [j, bv], [e, bv]], "ctr");
  const thick = K.lines(VA, [[[-e, bv], [-e + 6, bv]], [[e - 6, bv], [e, bv]], [[-j - 3, bv], [-j, bv], [-j, bv - 3]], [[-j, 3], [-j, 0], [-j + 3, 0]], [[j - 3, 0], [j, 0], [j, 3]], [[j, bv - 3], [j, bv], [j + 3, bv]]], "vis cut-plane");
  let out = chain + thick;
  for (const s of [-1, 1]) {
    const [x, y] = VA.p([s * e, bv]);
    out += `<path class="thin" d="M${x} ${y}V${K.r2(y + 20)}"/><path class="head" d="M${x} ${K.r2(y + 27)}L${K.r2(x - 1.75)} ${K.r2(y + 20)}L${K.r2(x + 1.75)} ${K.r2(y + 20)}Z"/>`;
    out += `<text class="t t-lg" x="${x}" y="${K.r2(y + 44)}" text-anchor="middle">B</text>`;
  }
  return `<g data-role="label">${out}</g>`;
}

// Detail C's mark: a circle round the mesh, its letter in the inlet drilling below it.
const markC = (() => {
  const [x, y] = VA.p([0, 0]);
  const r = K.r2((DC.r / k5) * VA.k);
  const [lx, ly] = VA.p([0, -15.4]);
  return `<g data-role="label"><circle class="thin mark" cx="${x}" cy="${y}" r="${r}"/><text class="t t-lg" x="${lx}" y="${K.r2(ly + 4)}" text-anchor="middle">C</text></g>`;
})();

const dimsA =
  K.dim(VA, [-M.BOLT.u, M.BOLT.v], [M.BOLT.u, M.BOLT.v], { dir: "h", off: 42 - VA.p([0, M.BOLT.v])[1] }) +
  K.dim(VA, P.C1, P.C2, { dir: "h", off: 58 - VA.p(P.C1)[1], text: K.fmt(M.A, 2) }) +
  K.dim(VA, [-M.OUTLET.major, H.v], [M.OUTLET.major, H.v], { dir: "h", off: -14, text: M.OUTLET.thread }) +
  K.dim(VA, [-M.INLET.major, -H.v], [M.INLET.major, -H.v], { dir: "h", off: 14, text: M.INLET.thread }) +
  K.dim(VA, [-H.u, -H.v], [H.u, -H.v], { dir: "h", off: 32 }) +
  K.dim(VA, [H.u, -H.v], [H.u, H.v], { dir: "v", off: 568 - VA.p([H.u, 0])[0] });

const balloonsA =
  K.balloon(VA, [-56, 30], [72, 70], 1, { target: 1 }) +
  K.balloon(VA, [P.C1[0] - 6, 10], [158, 70], 4, { target: 4 }) +
  K.balloon(VA, [P.C2[0] + 6, 10], [432, 70], 5, { target: 5 }) +
  K.balloon(VA, [M.BOLT.u + 1.6, M.BOLT.v + 1.6], [520, 70], 12, { target: 12 });

const labelA = K.viewLabel(VA.x, 462, "SECTION A-A", "ACROSS THE SHAFTS · SCALE 2:1");

// ---------------------------------------------------------------- DETAIL C: the mesh, 5:1
const detailC =
  `<g data-geom="C" clip-path="url(#clip-C)"><circle class="paper" cx="${DC.cx}" cy="${DC.cy}" r="${DC.r}"/>` +
  P.bushingFace(VC) +
  oilLayer(VC, "C") +
  gears(VC, "C") +
  K.line(VC, K.circle(P.C1[0], 0, M.RB, 160), "thin", true) +
  K.line(VC, K.circle(P.C2[0], 0, M.RB, 160), "thin", true) +
  P.gearMarks(VC) +
  K.centerline(VC, P.T1, P.T2, 4) +
  `<g id="contacts-C"></g>` +
  `</g><circle class="thin" cx="${DC.cx}" cy="${DC.cy}" r="${DC.r}"/>` +
  K.viewLabel(DC.cx, DC.cy + DC.r + 18, "DETAIL C", `THE MESH · ε = ${M.EPS.toFixed(2)} · SCALE 5:1`);

// ---------------------------------------------------------------- SECTION B-B, along the shafts, 1:1
const staticB = (V) =>
  P.flangeB(V) +
  P.bodyB(V) +
  P.coverB(V) +
  P.bushingsB(V, 6, P.Z.front, 0) +
  P.bushingsB(V, 7, M.B, P.Z.rear) +
  P.bearingsB(V) +
  P.sealB(V) +
  P.circlipB(V) +
  P.balanceSealB(V) +
  P.oringsB(V);

const oilBLayer = (V, id) =>
  `<g data-role="fluid">${["l", "m", "r"].map((k) => `<path id="oilB-${id}-${k}" class="tint" fill-opacity="0.5" d=""/>`).join("")}</g>`;

const shaftsB = (V, id) =>
  `<g data-part="4" id="s1-${id}">${P.gearShaftB(V, 1, 0)}</g><g data-part="5" id="s2-${id}">${P.gearShaftB(V, 2, 0)}</g><g data-part="11" id="key-${id}"></g>`;

const centresB = (V) =>
  K.centerline(V, P.P_UZ(P.C1[0], P.Z.shaftEnd), P.P_UZ(P.C1[0], P.Z.rear), 5) +
  K.centerline(V, P.P_UZ(P.C2[0], P.Z.front), P.P_UZ(P.C2[0], P.Z.rear), 5) +
  K.centerline(V, P.P_UZ(-M.BOLT.u, P.Z.boltEnd - 2), P.P_UZ(-M.BOLT.u, P.Z.head + 8), 4) +
  K.centerline(V, P.P_UZ(M.BOLT.u, P.Z.boltEnd - 2), P.P_UZ(M.BOLT.u, P.Z.head + 8), 4);

const viewB =
  `<g data-geom="B">` + oilBLayer(VB, "B") + staticB(VB) + shaftsB(VB, "B") + P.boltsB(VB) + P.pitchLinesB(VB) + centresB(VB) + `</g>`;

function cuttingPlaneA() {
  const zc = M.B / 2;
  const e = 66;
  const chain = K.line(VB, [P.P_UZ(-e, zc), P.P_UZ(e, zc)], "ctr");
  const thick = K.lines(VB, [[P.P_UZ(-e, zc), P.P_UZ(-e + 5, zc)], [P.P_UZ(e - 5, zc), P.P_UZ(e, zc)]], "vis cut-plane");
  let out = chain + thick;
  for (const s of [-1, 1]) {
    const [x, y] = VB.p(P.P_UZ(s * e, zc));
    out += `<path class="thin" d="M${x} ${y}V${K.r2(y - 20)}"/><path class="head" d="M${x} ${K.r2(y - 27)}L${K.r2(x - 1.75)} ${K.r2(y - 20)}L${K.r2(x + 1.75)} ${K.r2(y - 20)}Z"/>`;
    out += `<text class="t t-lg" x="${x}" y="${K.r2(y - 32)}" text-anchor="middle">A</text>`;
  }
  return `<g data-role="label">${out}</g>`;
}

// Detail D's window marked in B-B, its letter outside it.
const markD = (() => {
  const [x0, y0] = VB.p(P.P_UZ(DD_W.u0, DD_W.z0));
  const w = K.r2((DD.w / k5) * VB.k);
  const h = K.r2((DD.h / k5) * VB.k);
  return `<g data-role="label"><rect class="thin mark" x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3"/><text class="t t-lg" x="${K.r2(x0 - 9)}" y="${K.r2(y0 + 2)}" text-anchor="middle">D</text></g>`;
})();

const dimsB =
  K.dim(VB, P.P_UZ(H.u, P.Z.flangeFace), P.P_UZ(H.u, P.Z.coverOut), { dir: "v", off: 22 }) +
  K.dim(VB, P.P_UZ(P.C1[0] + 7.5, P.Z.shaftEnd), P.P_UZ(P.C1[0] + 14, P.Z.spigot), { dir: "v", off: 24 });

const balloonsB =
  K.balloon(VB, [-58, 24], [44, 560], 2, { target: 2 }) +
  K.balloon(VB, [-36, -34], [120, 758], 3, { target: 3 }) +
  K.balloon(VB, [-42.2, 15.7], [44, 640], 14, { target: 14 }) +
  K.balloon(VB, [-36, -20], [44, 690], 7, { target: 7 }) +
  K.balloon(VB, [-55, -41.4], [70, 758], 13, { target: 13 });

const viewArrowF = K.viewArrow(VB, P.P_UZ(P.C1[0], P.Z.shaftEnd - 1), [0, 1], "F");
const labelB = K.viewLabel(VB.x, 790, "SECTION B-B", "ALONG THE SHAFTS · SCALE 1:1");

// ---------------------------------------------------------------- DETAIL D: the shaft seal, 5:1
const detailD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${DD.x}" y="${DD.y}" width="${DD.w}" height="${DD.h}"/>` +
  P.flangeB(VD) +
  P.bushingsB(VD, 6, P.Z.front, 0) +
  P.bearingsB(VD) +
  P.sealB(VD) +
  P.circlipB(VD) +
  P.balanceSealB(VD) +
  `<g data-part="4">${P.gearShaftB(VD, 1, 0)}</g>` +
  K.centerline(VD, P.P_UZ(P.C1[0], DD_W.z0 - 1), P.P_UZ(P.C1[0], DD_W.z0 + DD.h / k5 + 1), 0) +
  `</g><rect class="thin" x="${DD.x}" y="${DD.y}" width="${DD.w}" height="${DD.h}" rx="10"/>` +
  K.balloon(VD, [P.C1[0] - 13.5, 31], [556, 580], 9, { target: 9 }) +
  K.balloon(VD, [-34, 15.7], [556, 700], 15, { target: 15 }) +
  K.balloon(VD, [P.C1[0] - 8.5, 13.2], [556, 728], 8, { target: 8 }) +
  K.balloon(VD, [-32, 13.2], [556, 754], 6, { target: 6 }) +
  K.viewLabel(DD.x + DD.w / 2, DD.y + DD.h + 18, "DETAIL D", "SHAFT SEAL · SCALE 5:1");

// ---------------------------------------------------------------- VIEW F: the shaft end, 2:1, turning
const viewF =
  `<g data-geom="F">` +
  P.shaftEndF(VF) +
  `<g id="shaft-F">${P.shaftF(VF)}</g>` +
  K.centerMark(VF, [0, 0], 16, 3) +
  `</g>` +
  K.dim(VF, [-7.5, 0], [7.5, 0], { dir: "h", off: 14.5 * VF.k + 12, prefix: "Ø" }) +
  K.balloon(VF, [-12.8, 3.5], [592, 316], 10, { target: 10 }) +
  `<g id="balloon-key">${K.balloon(VF, P.keyPointF(0), P.KEY_BALLOON, 11, { target: 11 })}</g>` +
  K.viewLabel(VF.x, 478, "VIEW F", "SHAFT END · ANTICLOCKWISE · 2:1");

// ---------------------------------------------------------------- DIAGRAM 1: flow against pressure
const CH = { x0: 834, x1: 1130, y0: 52, y1: 196, pMax: M.P_MAX, qMax: 26, eMin: 0.6 };
const chE = (e) => K.r2(CH.y1 - ((e - CH.eMin) / (1 - CH.eMin)) * (CH.y1 - CH.y0));
const chX = (p) => K.r2(CH.x0 + (p / CH.pMax) * (CH.x1 - CH.x0));
const chY = (q) => K.r2(CH.y1 - (q / CH.qMax) * (CH.y1 - CH.y0));
const curve = (n) => {
  const pts = [];
  for (let p = 0; p <= CH.pMax; p += 10) pts.push(`${chX(p)},${chY(M.flow(n, p))}`);
  return pts.join(" ");
};
function chart1() {
  let grid = "";
  let labels = "";
  for (let q = 0; q <= CH.qMax; q += 2) {
    grid += `M${CH.x0} ${chY(q)}H${CH.x1}`;
    if (q % 4 === 0) labels += `<text class="t t-sm" x="${CH.x0 - 6}" y="${K.r2(chY(q) + 2.7)}" text-anchor="end">${q}</text>`;
  }
  for (let e = 0.7; e <= 1.001; e += 0.1) labels += `<text class="t t-sm" x="${CH.x1 + 5}" y="${K.r2(chE(e) + 2.7)}">${e.toFixed(1)}</text>`;
  labels += `<text class="t t-sm t-mute" x="1166" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 1166 ${(CH.y0 + CH.y1) / 2})">ηv</text>`;
  for (let p = 0; p <= CH.pMax; p += 20) {
    grid += `M${chX(p)} ${CH.y0}V${CH.y1}`;
    if (p % 40 === 0) labels += `<text class="t t-sm" x="${chX(p)}" y="${CH.y1 + 11}" text-anchor="middle">${p}</text>`;
  }
  let speeds = "";
  for (const n of [1000, 2000, 3000]) {
    speeds += `<polyline class="thin" points="${curve(n)}"/>`;
    labels += `<text class="t t-sm t-mute" x="${CH.x1 - 4}" y="${K.r2(chY(M.flow(n, CH.pMax)) - 4)}" text-anchor="end">${n}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 24}" text-anchor="middle">OUTLET PRESSURE p, bar</text>`;
  labels += `<text class="t t-sm t-mute" x="804" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 804 ${(CH.y0 + CH.y1) / 2})">FLOW Q, L/min</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    speeds +
    `<path id="q-theory" class="hid" d="M${CH.x0} ${chY(M.qTheory(M.N_RATED))}H${CH.x1}"/>` +
    `<polyline id="eta-now" class="thin eta" points=""/>` +
    `<polyline id="q-now" class="vis accent" points="${curve(M.N_RATED)}"/>` +
    `<path id="op-drop" class="thin accent" d=""/>` +
    `<circle id="op-dot" class="accent-fill" cx="${chX(P_START)}" cy="${chY(M.flow(M.N_RATED, P_START))}" r="2.8"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 246, "DIAGRAM 1", "ACCENT: Q AT THIS SPEED · DASHED: V·n · DOTTED: ηv · THIN: rpm")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: pressure in a tooth space on its way round
const C2H = { x0: 398, x1: 538, y0: 520, y1: 640, aMax: 360 };
const c2X = (deg) => K.r2(C2H.x0 + (deg / C2H.aMax) * (C2H.x1 - C2H.x0));
const c2Y = (p) => K.r2(C2H.y1 - (p / M.P_MAX) * (C2H.y1 - C2H.y0));
const ARC = (M.SEAL_ARC * 180) / Math.PI;
function chart2() {
  let grid = "";
  let labels = "";
  for (let p = 0; p <= M.P_MAX; p += 40) {
    grid += `M${C2H.x0} ${c2Y(p)}H${C2H.x1}`;
    if (p % 80 === 0) labels += `<text class="t t-sm" x="${C2H.x0 - 5}" y="${K.r2(c2Y(p) + 2.7)}" text-anchor="end">${p}</text>`;
  }
  for (let a = 0; a <= 360; a += 30) grid += `M${c2X(a)} ${C2H.y0}V${C2H.y1}`;
  for (const a of [0, 120, 240, 360]) labels += `<text class="t t-sm" x="${c2X(a)}" y="${C2H.y1 + 11}" text-anchor="middle">${a}</text>`;
  labels += `<text class="t t-sm t-mute" x="${(C2H.x0 + C2H.x1) / 2}" y="${C2H.y1 + 24}" text-anchor="middle">TRAVEL FROM INLET, °</text>`;
  labels += `<text class="t t-sm t-mute" x="368" y="${(C2H.y0 + C2H.y1) / 2}" text-anchor="middle" transform="rotate(-90 368 ${(C2H.y0 + C2H.y1) / 2})">SPACE p, bar</text>`;
  let dots = "";
  for (let i = 0; i < M.Z; i++) dots += `<circle class="accent-fill" id="pk-${i}" cx="${C2H.x0}" cy="${C2H.y1}" r="2.2"/>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${C2H.x0}" y="${C2H.y0}" width="${C2H.x1 - C2H.x0}" height="${C2H.y1 - C2H.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="hid" d="M${c2X(ARC)} ${C2H.y0}V${C2H.y1}"/>` +
    `<polyline id="p-curve" class="vis accent" points=""/>` +
    dots +
    `<rect class="vis" x="${C2H.x0}" y="${C2H.y0}" width="${C2H.x1 - C2H.x0}" height="${C2H.y1 - C2H.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((C2H.x0 + C2H.x1) / 2, 690, "DIAGRAM 2", "ONE TOOTH SPACE · DASHED: OUTLET")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "BODY, 2-BORE", "EN AW-6082 T6", "1"],
  ["2", "FRONT FLANGE, SPIGOT Ø50", "EN AC-46000", "1"],
  ["3", "REAR COVER", "EN-GJL-250", "1"],
  ["4", "DRIVE GEAR SHAFT z12 m3 x+0.3", "16MnCr5, CASE 58 HRC", "1"],
  ["5", "DRIVEN GEAR SHAFT z12 m3 x+0.3", "16MnCr5, CASE 58 HRC", "1"],
  ["6", "FRONT BUSHING, D-FORM", "CuSn12-C", "2"],
  ["7", "REAR BUSHING, D-FORM", "CuSn12-C", "2"],
  ["8", "PLAIN BEARING 16×18×14 ISO 3547", "STEEL / PTFE", "4"],
  ["9", "SHAFT SEAL 16×28×7 DIN 3760 A", "FKM 75", "1"],
  ["10", "CIRCLIP 28×1.2 DIN 472", "C75S", "1"],
  ["11", "PARALLEL KEY 5×5×16 DIN 6885 A", "C45+C", "1"],
  ["12", "SCREW M8×70 ISO 4762", "STEEL 10.9", "4"],
  ["13", "WASHER 8 ISO 7089", "STEEL 300 HV", "4"],
  ["14", "BODY SEAL, FIGURE-8, Ø2 CORD", "NBR 90", "2"],
  ["15", "BALANCE SEAL, 3-FORM", "FKM 80", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const bomTop = TB.y - (18 + BOM.length * 17);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 34, align: "center", title: "ITEM" },
    { w: 202, title: "DESCRIPTION" },
    { w: 130, title: "MATERIAL" },
    { w: 34, align: "center", title: "QTY" },
  ],
  BOM,
  { rowH: 17 }
);

const notes = K.notes(790, 280, "NOTES", [
  `GEARS z ${M.Z}, m ${M.MOD}, α 20°, x +${M.XSHIFT}: a ${K.fmt(M.A, 2)}, αw ${((M.ALPHA_W * 180) / Math.PI).toFixed(1)}°, da Ø${(2 * M.RA).toFixed(2)}, b ${M.B}.`,
  `V = 2π·b·(ra² − rw² − pb²/12) = ${M.V_DISP.toFixed(2)} cm³/rev; EACH SPACE ${(M.BATCH * 1000).toFixed(0)} mm³.`,
  `Q = V·n·ηv. LEAKAGE QL = ${M.C_LEAK}·p·(1 + p/${M.P_C}) L/min, ISO VG 46 AT 50 °C.`,
  `T = V·p / (20π·ηhm) + ${M.T0} N·m, ηhm = ${M.ETA_HM}. ${M.P_RATED} bar NEEDS ${K.fmt(M.torque(M.P_RATED), 1)} N·m.`,
  `RELIEF GROOVES IN 6 VENT THE SPACE TRAPPED WHILE ε > 1.`,
  `B-B STEPPED THROUGH TWO SCREWS; SHAFTS, SCREWS, KEY, WASHERS NOT HATCHED.`,
  `DRIVE ANTICLOCKWISE SEEN ON THE SHAFT END. INLET G1/2, OUTLET G3/8.`,
  `MOTION SHOWN AT 1/${M.SLOWDOWN} OF REAL SPEED.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "EXTERNAL GEAR PUMP 8 cm³", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-016", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "2:1" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · bar · L/min" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE GEARS · ↑↓ PRESSURE · ←→ SPEED · SPACE PAUSES", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="oil" patternUnits="userSpaceOnUse" width="2.6" height="2.6"><circle class="oil-dot" cx="0.65" cy="0.65" r="0.55"/><circle class="oil-dot" cx="1.95" cy="1.95" r="0.55"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-C"><circle cx="${DC.cx}" cy="${DC.cy}" r="${DC.r}"/></clipPath>` +
  `<clipPath id="clip-D"><rect x="${DD.x}" y="${DD.y}" width="${DD.w}" height="${DD.h}" rx="10"/></clipPath>` +
  `</defs>`;

const [ax0, ay0] = VA.p([-H.u, H.v]);
const [ax1, ay1] = VA.p([H.u, -H.v]);
const hit =
  `<rect class="hit" data-turn="A" x="${ax0}" y="${ay0}" width="${K.r2(ax1 - ax0)}" height="${K.r2(ay1 - ay0)}"/>` +
  `<circle class="hit" data-turn="C" cx="${DC.cx}" cy="${DC.cy}" r="${DC.r}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of an external gear pump, cut across and along its shafts. Drag the gears to turn them, the up and down arrows set the outlet pressure and the left and right arrows the speed; the oil carried in the tooth spaces, the flow chart and the readout follow." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  viewA +
  cuttingPlaneB() +
  markC +
  dimsA +
  balloonsA +
  labelA +
  detailC +
  viewB +
  cuttingPlaneA() +
  markD +
  dimsB +
  balloonsB +
  viewArrowF +
  labelB +
  detailD +
  viewF +
  chart1() +
  chart2() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the gears · <kbd>↑</kbd> <kbd>↓</kbd> pressure · <kbd>←</kbd> <kbd>→</kbd> speed · <kbd>Space</kbd> pause · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const CHART1 = { ...CH };
const size = writePage(join(here, "gear-pump.html"), {
  title: "External Gear Pump",
  description: "A live engineering drawing of an external gear pump: the involute gears turn, the oil rides round in the tooth spaces, and flow, leakage and torque come from one model.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet [data-turn]{cursor:grab;touch-action:none}.bp-sheet .tint{fill:url(#oil)}.bp-sheet .oil-dot{fill:var(--bp-accent)}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet .eo{fill-rule:evenodd}.bp-sheet .cut-plane{stroke-width:1.6px}.bp-sheet .eta{stroke-dasharray:1.2 1.6}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHART1__", JSON.stringify(CH)).replace("__CHART2__", JSON.stringify(C2H)),
});
console.log(`gear-pump.html  ${(size / 1024).toFixed(0)} KB  V ${M.V_DISP.toFixed(3)} cm³  a ${M.A.toFixed(3)}  ε ${M.EPS.toFixed(3)}  ηv(1500, 250) ${M.etaV(1500, 250).toFixed(3)}`);
