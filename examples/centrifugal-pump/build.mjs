// Builds centrifugal-pump.html: a live A2 drawing of an ISO 2858 end-suction pump, 50-32-160.
//   node examples/centrifugal-pump/build.mjs
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
const C = { x: 345, y: 445, w: 226, h: 110 }; // Detail C window on the sheet
const D = { x: 347, y: 652, w: 222, h: 121 }; // Detail D window
const VIEWS = {
  A: { x: 165, y: 262, scale: 1 / 2 },
  B: { x: 680, y: 262, scale: 1 / 2 },
  C: { x: C.x - 8 * k2, y: C.y + 33 * k2, scale: 2 },
  D: { x: D.x + 47 * k5, y: D.y + 37 * k5, scale: 5 },
  E: { x: 705, y: 709, scale: 1 / 2 },
};
const VA = K.view(VIEWS.A);
const VB = K.view(VIEWS.B);
const VC = K.view(VIEWS.C);
const VD = K.view(VIEWS.D);
const VE = K.view(VIEWS.E);

// ---------------------------------------------------------------- the pump in A-A, shared with the details
function waterA(V, id) {
  const z = (name, op) => `<path id="tint-${id}-${name}" class="tint" fill-opacity="${op}" d="${P.path(V, P.waterA[name])}"/>`;
  return `<g data-role="fluid">${z("s", 0.15)}${z("i", 0.15)}${z("o", 0.15)}${z("d", 0.15)}</g>`;
}
function pumpParts(V) {
  return (
    P.casing(V) + P.wearRing(V) + P.cover(V) + P.gasket(V) + P.bracket(V) + P.sealRotary(V) + P.shaft(V) + P.impeller(V) + P.impellerKey(V) + P.impellerNut(V) +
    P.sealSeat(V) + P.seatRing(V) + P.casingBolt(V) + P.thrower(V) + P.bearings(V) + P.circlip(V) + P.bearingCover(V) +
    P.lipSeal(V) + P.capScrews(V) + P.couplingHub(V) + P.spider(V) + P.couplingKey(V)
  );
}

// The cutting plane of another view: thick ends outside the outline, arrows in the viewing direction.
function planeEnds(V, top, bottom, dir, letter) {
  let out = "";
  for (const [end, sgn] of [[top, -1], [bottom, 1]]) {
    const [x, y] = V.p(end);
    const y2 = K.r2(y + sgn * 9);
    const ax = K.r2(x + dir * 16);
    out +=
      `<path class="vis" d="M${x} ${y}V${y2}H${ax}"/>` +
      `<path class="head" d="M${ax} ${y2}L${K.r2(ax - dir * 7)} ${K.r2(y2 - 1.75)}L${K.r2(ax - dir * 7)} ${K.r2(y2 + 1.75)}Z"/>` +
      `<text class="t t-lg" x="${K.r2(ax + dir * 9)}" y="${K.r2(y2 + 4.2)}" text-anchor="middle">${letter}</text>`;
  }
  return `<g data-role="label">${out}</g>`;
}

const mainA =
  `<g data-geom="A">` +
  waterA(VA, "A") +
  pumpParts(VA) +
  `<g data-role="phantom">${P.motorHalf(VA)}</g>` +
  K.centerline(VA, [-112, 0], [378, 0], 6) +
  K.centerline(VA, [0, 98], [0, 162], 6) +
  `</g>` +
  planeEnds(VA, [0, 164], [0, -134], 1, "B") +
  K.detailMark(VA, [36, 22], 22, "C", 60) +
  K.detailMark(VA, [-37, 33], 9, "D", 222) +
  K.viewLabel(250, 50, "SECTION A-A", "THROUGH THE SHAFT · SCALE 1:2");

const dimsA =
  K.dim(VA, [-118, 0], [-41, 162], { dir: "v", off: 38 - VA.p([-118, 0])[0] }) +
  K.dim(VA, [-118, 0], [-56, -132], { dir: "v", off: 38 - VA.p([-118, 0])[0] }) +
  K.dim(VA, [-112, -25], [316, -12], { dir: "h", off: VA.p([0, -153])[1] - VA.p([0, -25])[1] });

// ---------------------------------------------------------------- SECTION B-B through the volute
function waterB(V, id) {
  const z = (name) => `<path id="tint-${id}-${name}" class="tint" fill-rule="evenodd" fill-opacity="0.15" d="${P.path(V, P.waterB[name])}"/>`;
  return `<g data-role="fluid">${z("i")}${z("o")}${z("d")}</g>`;
}
const [bx, by] = VB.p([0, 0]);
const viewB =
  `<g data-geom="B">` +
  waterB(VB, "B") +
  P.casingSection(VB) +
  P.drainPlug(VB) +
  `<g id="rotor-B">${P.rotorBB(VB)}</g>` +
  K.centerline(VB, [-118, 0], [118, 0], 6) +
  K.centerline(VB, [0, -128], [0, 166], 6) +
  `<path class="ctr" d="${K.d(VB, K.circle(0, 0, M.R_TONGUE, 120))}"/>` +
  `</g>` +
  planeEnds(VB, [0, 164], [0, -134], -1, "A") +
  K.dim(VB, [-75, -132], [75, -132], { dir: "h", off: 28 }) +
  K.viewLabel(bx, 50, "SECTION B-B", "THROUGH THE VOLUTE · SCALE 1:2");

// ---------------------------------------------------------------- DETAIL C: the mechanical seal, 2:1
const detailC =
  `<g data-geom="C" clip-path="url(#clip-C)"><rect class="paper" x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}"/>` +
  waterA(VC, "C") +
  pumpParts(VC) +
  
  `</g><rect class="thin" x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="10"/>` +
  K.viewLabel(C.x + C.w / 2, C.y + C.h + 18, "DETAIL C", "MECHANICAL SEAL · SCALE 2:1");

// ---------------------------------------------------------------- DETAIL D: the wear ring gap, 5:1
// The gap is 0.3 mm: arrows from outside pointing in, the figure below in the eye's water.
function clearanceDim(V, u) {
  const [x, y0] = V.p([u, 32]);
  const [, y1] = V.p([u, 32.3]);
  const [, yLo] = V.p([u, 25.6]);
  const [, yHi] = V.p([u, 34.2]);
  const head = (y, s) => `M${x} ${y}L${K.r2(x - 1.75)} ${K.r2(y + s * 7)}L${K.r2(x + 1.75)} ${K.r2(y + s * 7)}Z`;
  const ty = K.r2(V.p([u, 26.55])[1]);
  const tx = K.r2(x - 3);
  const value = K.fmt(32.3 - 32);
  return (
    `<g data-role="dim"><path class="thin" d="M${x} ${yLo}V${yHi}"/><path class="head" d="${head(y0, 1)}${head(y1, -1)}"/>` +
    `<text class="t" x="${tx}" y="${ty}" text-anchor="middle" transform="rotate(-90 ${tx} ${ty})">${value}</text></g>`
  );
}
const detailD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>` +
  waterA(VD, "D") +
  P.casing(VD) + P.wearRing(VD) + P.impeller(VD) +
  clearanceDim(VD, -37) +
  `</g><rect class="thin" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/>` +
  K.viewLabel(D.x + D.w / 2, D.y + D.h + 18, "DETAIL D", "WEAR RING CLEARANCE · SCALE 5:1");

// ---------------------------------------------------------------- the discharge valve
function valveWater(V, id) {
  return (
    `<g data-role="fluid">` +
    `<path id="tint-${id}-in" class="tint" fill-opacity="0.15" d="${P.path(V, P.valveWater.in)}"/>` +
    `<path id="tint-${id}-out" class="tint" fill-opacity="0.15" d="${P.path(V, P.valveWater.out)}"/>` +
    `</g>`
  );
}
const valve =
  `<g data-geom="E">` +
  valveWater(VE, "E") +
  P.valveBody(VE) +
  P.bonnet(VE) +
  P.packing(VE) +
  P.gland(VE) +
  `<g data-role="phantom">${P.valvePhantom(VE)}</g>` +
  `<g id="mv-E">${P.plug(VE)}${P.stem(VE)}${P.handwheel(VE)}</g>` +
  K.centerline(VE, [0, -56], [0, 220], 6) +
  K.centerline(VE, [-92, 0], [92, 0], 6) +
  `</g>` +
  K.viewLabel(VE.p([0, 0])[0], 800, "DISCHARGE VALVE", "GLOBE DN32 PN16 · SCALE 1:2");

const liftDim = (lift) =>
  K.dim(VE, [62, RIM.v + RIM.w], [62, RIM.v + RIM.w + lift], { dir: "v", off: 12, text: `h=${lift.toFixed(1)}`, id: "dim-lift" });
const RIM = P.RIM;

// ---------------------------------------------------------------- DIAGRAM 1: H–Q
const CH = { x0: 72, x1: 318, y0: 452, y1: 676, qMax: 35, hMax: 40 };
const qx = (q) => K.r2(CH.x0 + (q / CH.qMax) * (CH.x1 - CH.x0));
const hy = (h) => K.r2(CH.y1 - (Math.min(CH.hMax, Math.max(0, h)) / CH.hMax) * (CH.y1 - CH.y0));
const curve = (f, q1 = CH.qMax) => {
  let s = "";
  for (let i = 0; i <= 70; i++) {
    const q = (q1 * i) / 70;
    const h = f(q);
    if (h < 0) break;
    s += `${i ? "L" : "M"}${qx(q)} ${hy(h)}`;
  }
  return s;
};
function chart1() {
  let grid = "";
  let labels = "";
  for (let h = 0; h <= CH.hMax; h += 5) {
    grid += `M${CH.x0} ${hy(h)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 5}" y="${K.r2(hy(h) + 2.7)}" text-anchor="end">${h}</text>`;
  }
  for (let q = 0; q <= CH.qMax; q += 5) {
    grid += `M${qx(q)} ${CH.y0}V${CH.y1}`;
    labels += `<text class="t t-sm" x="${qx(q)}" y="${CH.y1 + 11}" text-anchor="middle">${q}</text>`;
  }
  let family = "";
  for (const n of [1450, 2000, 2500, 2900]) {
    family += curve((q) => M.head(q, n));
    labels += `<text class="t t-sm t-mute" x="${qx(0.6)}" y="${K.r2(hy(M.head(0, n)) - 2.5)}">${n}</text>`;
  }
  const bep = `<circle class="thin" cx="${qx(M.BEP.q)}" cy="${hy(M.BEP.h)}" r="2.4"/>`;
  labels += `<text class="t t-sm t-mute" x="${qx(M.BEP.q)}" y="${K.r2(hy(M.BEP.h) - 5)}" text-anchor="middle">BEP</text>`;
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 24}" text-anchor="middle">FLOW Q, m³/h</text>`;
  const my = (CH.y0 + CH.y1) / 2;
  labels += `<text class="t t-sm t-mute" x="46" y="${my}" text-anchor="middle" transform="rotate(-90 46 ${my})">HEAD H, m</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="thin" d="${family}"/>` +
    bep +
    `<path id="sys-now" class="hid" d=""/>` +
    `<path id="pc-now" class="vis" d=""/>` +
    `<path id="duty-lines" class="thin accent dash" d=""/>` +
    `<circle id="duty-dot" class="accent-fill" cx="${CH.x0}" cy="${CH.y1}" r="3.2"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, CH.y1 + 52, "DIAGRAM 1", "THICK: PUMP AT n · DASHED: SYSTEM · DOT: DUTY")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: η and P against Q
const C2 = { x0: 852, x1: 1128, y0: 46, y1: 124, qMax: 35, eMax: 80, pMax: 3 };
const qx2 = (q) => K.r2(C2.x0 + (q / C2.qMax) * (C2.x1 - C2.x0));
const ey2 = (e) => K.r2(C2.y1 - (Math.min(C2.eMax, Math.max(0, e)) / C2.eMax) * (C2.y1 - C2.y0));
const py2 = (p) => K.r2(C2.y1 - (Math.min(C2.pMax, Math.max(0, p)) / C2.pMax) * (C2.y1 - C2.y0));
function chart2() {
  let grid = "";
  let labels = "";
  for (let i = 0; i <= 4; i++) {
    const e = i * 20;
    grid += `M${C2.x0} ${ey2(e)}H${C2.x1}`;
    labels += `<text class="t t-sm" x="${C2.x0 - 5}" y="${K.r2(ey2(e) + 2.7)}" text-anchor="end">${e}</text>`;
    labels += `<text class="t t-sm" x="${C2.x1 + 5}" y="${K.r2(ey2(e) + 2.7)}">${K.fmt((e / C2.eMax) * C2.pMax, 2)}</text>`;
  }
  for (let q = 0; q <= C2.qMax; q += 5) {
    grid += `M${qx2(q)} ${C2.y0}V${C2.y1}`;
    labels += `<text class="t t-sm" x="${qx2(q)}" y="${C2.y1 + 11}" text-anchor="middle">${q}</text>`;
  }
  const my = (C2.y0 + C2.y1) / 2;
  labels += `<text class="t t-sm t-mute" x="828" y="${my}" text-anchor="middle" transform="rotate(-90 828 ${my})">η, %</text>`;
  labels += `<text class="t t-sm t-mute" x="1162" y="${my}" text-anchor="middle" transform="rotate(-90 1162 ${my})">P, kW</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${C2.x0}" y="${C2.y0}" width="${C2.x1 - C2.x0}" height="${C2.y1 - C2.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path id="eta-now" class="vis" d=""/>` +
    `<path id="pow-now" class="hid" d=""/>` +
    `<circle id="eta-dot" class="accent-fill" cx="${C2.x0}" cy="${C2.y1}" r="2.6"/>` +
    `<circle id="pow-dot" class="accent-fill" cx="${C2.x0}" cy="${C2.y1}" r="2.6"/>` +
    `<rect class="vis" x="${C2.x0}" y="${C2.y0}" width="${C2.x1 - C2.x0}" height="${C2.y1 - C2.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((C2.x0 + C2.x1) / 2, C2.y1 + 30, "DIAGRAM 2", "AT n · SOLID: EFFICIENCY η · DASHED: SHAFT POWER P · Q IN m³/h")
  );
}

// ---------------------------------------------------------------- balloons
// A-A: the top row reads the bracket end, left to right; the left pocket the wet end.
const top = 125;
const balloonsA =
  K.balloon(VA, [-20, 110], [95, 132], 1, { target: 1 }) +
  K.balloon(VA, [-9, 62], [95, 158], 2, { target: 2 }) +
  K.balloon(VA, [-29, 4], [95, 184], 4, { target: 4 }) +
  K.balloon(VA, [-6, 9.5], [95, 208], 5, { target: 5 }) +
  K.balloon(VA, [26.5, 126], [252, top], 7, { target: 7 }) +
  K.balloon(VA, [50, 31], [296, top], 8, { target: 8 }) +
  K.balloon(VA, [60, 85], [274, top], 13, { target: 13 }) +
  K.balloon(VA, [74, 19.4], [318, top], 14, { target: 14 }) +
  K.balloon(VA, [160, 10], [340, top], 6, { target: 6 }) +
  K.balloon(VA, [224.5, 29.5], [362, top], 15, { target: 15 }) +
  K.balloon(VA, [234, 14.5], [384, top], 16, { target: 16 }) +
  K.balloon(VA, [259, 49], [406, top], 17, { target: 17 }) +
  K.balloon(VA, [261, 18.5], [428, top], 18, { target: 18 }) +
  K.balloon(VA, [266, 40], [450, top], 19, { target: 19 }) +
  K.balloon(VA, [290, 11.5], [472, top], 22, { target: 22 }) +
  K.balloon(VA, [288, -22], [474, 330], 20, { target: 20 }) +
  K.balloon(VA, [314, -22], [506, 330], 21, { target: 21 }) +
  K.balloon(VA, [51, P.BOLT_V], [246, 384], 12, { target: 12 });
const balloonsB = K.balloon(VB, P.drainPoint(), [796, 384], 23, { target: 23 });
const balloonsC =
  K.balloon(VC, [45, 16], [536, C.y + C.h + 14], 9, { target: 9 }) +
  K.balloon(VC, [58, 15.5], [558, C.y + C.h + 14], 10, { target: 10 }) +
  K.balloon(VC, [56, 18.15], [586, C.y + C.h - 10], 11, { target: 11 });
const balloonsD = K.balloon(VD, [-44.5, 35], [336, D.y + 50], 3, { target: 3 });
// Valve: the bonnet's parts on the left, the body and plug on the right; plug, stem and wheel ride with the lift.
const balloonsE =
  K.balloon(VE, [-24, 80], [632, 624], 27, { target: 27 }) +
  K.balloon(VE, [-10, 105], [632, 602], 28, { target: 28 }) +
  K.balloon(VE, [-15, 128.5], [632, 580], 29, { target: 29 }) +
  K.balloon(VE, [81, 60], [805, 625], 24, { target: 24 }) +
  `<g id="mvb-E">` +
  K.balloon(VE, [-56, 199], [632, 530], 30, { target: 30 }) +
  K.balloon(VE, [-3, 140], [632, 554], 26, { target: 26 }) +
  K.balloon(VE, [14, 12], [790, 590], 25, { target: 25 }) +
  `</g>`;
const balloons = balloonsA + balloonsB + balloonsC + balloonsD + balloonsE;

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "VOLUTE CASING 50-32-160", "EN-GJL-250", "1"],
  ["2", "IMPELLER Ø169, 6 VANES, CLOSED", "CuSn10 (CC480K)", "1"],
  ["3", "CASING WEAR RING Ø64", "1.4408", "1"],
  ["4", "IMPELLER CAP NUT M16 DIN 1587", "A4-70", "1"],
  ["5", "KEY 6×6×24 DIN 6885-A", "C45+C", "1"],
  ["6", "PUMP SHAFT Ø25", "1.4021", "1"],
  ["7", "CASING GASKET 1 mm", "ARAMID FIBRE AFM 34", "1"],
  ["8", "CASING COVER", "EN-GJL-250", "1"],
  ["9", "SEAL ROTARY UNIT EN 12756 U024", "CARBON / EPDM / 1.4571", "1"],
  ["10", "SEAL SEAT Ø24", "SSiC", "1"],
  ["11", "O-RING 34.6×2.62 ISO 3601", "EPDM 70", "1"],
  ["12", "HEX BOLT M12×40 ISO 4017", "STEEL 8.8", "8"],
  ["13", "BEARING BRACKET", "EN-GJL-250", "1"],
  ["14", "V-RING 25 A (THROWER)", "NBR 70", "1"],
  ["15", "BALL BEARING 6305-2Z ISO 15", "100Cr6", "2"],
  ["16", "RETAINING RING 25×1.2 DIN 471", "C75S", "1"],
  ["17", "BEARING COVER", "S235JR", "1"],
  ["18", "SHAFT SEAL 24×40×7 ISO 6194", "NBR 70", "1"],
  ["19", "CAP SCREW M6×25 ISO 4762", "STEEL 8.8", "4"],
  ["20", "COUPLING HUB Ø55, PUMP SIDE", "EN AW-6082", "1"],
  ["21", "COUPLING SPIDER 92 ShA", "TPU", "1"],
  ["22", "KEY 8×7×28 DIN 6885-A", "C45+C", "1"],
  ["23", "DRAIN PLUG G3/8 DIN 910", "1.4571", "1"],
  ["24", "VALVE BODY DN32 PN16", "EN-GJL-250", "1"],
  ["25", "VALVE PLUG, PARABOLIC", "1.4021", "1"],
  ["26", "VALVE STEM Tr16×4", "1.4021", "1"],
  ["27", "BONNET WITH YOKE", "EN-GJL-250", "1"],
  ["28", "PACKING RING 6×6", "PTFE / GRAPHITE", "3"],
  ["29", "GLAND FOLLOWER", "CuZn39Pb3", "1"],
  ["30", "HANDWHEEL Ø125", "EN-GJL-200", "1"],
];
const TB = { x: 820, y: 708, w: 356, h: 116 };
const ROW = 14;
const bomTop = TB.y - (18 + BOM.length * ROW);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 30, align: "center", title: "ITEM" },
    { w: 170, title: "DESCRIPTION" },
    { w: 122, title: "MATERIAL" },
    { w: 34, align: "center", title: "QTY" },
  ],
  BOM,
  { rowH: ROW }
);

const notes = K.notes(
  830,
  bomTop - 76,
  "NOTES",
  [
    `AFFINITY: Q ∝ n, H ∝ n², P ∝ n³. DUTY POINT WHERE PUMP MEETS SYSTEM.`,
    `AT ${M.N0} rpm, BEP ${K.fmt(M.BEP.q, 1)} m³/h, ${K.fmt(M.BEP.h, 1)} m, η ${Math.round(M.BEP.eta * 100)} %, ${M.BEP.p.toFixed(2)} kW; n_q ${Math.round(M.NQ)}.`,
    `SYSTEM ${M.H_STATIC} m STATIC + ${M.K_PIPE}·Q² + VALVE (Q/Kv)², Kvs ${M.KVS}.`,
    `BELOW ${Math.round(M.N_LIFT)} rpm THE SHUT-OFF HEAD CANNOT LIFT ${M.H_STATIC} m: NO FLOW.`,
    `IMPELLER DRAWN AT 1/100 SPEED; CW SEEN FROM THE DRIVE END.`,
  ],
  12.5
);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 252, h: 32, label: "TITLE", value: "CENTRIFUGAL PUMP 50-32-160", size: "lg" },
  { x: 252, y: 0, w: 104, h: 32, label: "DWG NO", value: "BP-015", size: "lg" },
  { x: 0, y: 32, w: 58, h: 25, label: "SCALE", value: "1:2" },
  { x: 58, y: 32, w: 44, h: 25, label: "SIZE", value: "A2" },
  { x: 102, y: 32, w: 52, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 154, y: 32, w: 96, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 250, y: 32, w: 106, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 120, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 120, y: 57, w: 110, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 230, y: 57, w: 126, h: 25, label: "UNITS", value: "mm · m³/h · m · kW" },
  { x: 0, y: 82, w: 356, h: 34, label: "LIVE · DRAG THE PUMP: SPEED · DRAG THE HANDWHEEL: VALVE · ← → ↑ ↓", value: "", size: "sm", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="water" patternUnits="userSpaceOnUse" width="3" height="3"><circle class="water-dot" cx="0.75" cy="0.75" r="0.6"/><circle class="water-dot" cx="2.25" cy="2.25" r="0.6"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-C"><rect x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-D"><rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/></clipPath>` +
  `</defs>`;

const hit =
  `<rect class="hit" data-drag="speed" x="40" y="80" width="770" height="330"/>` +
  `<rect class="hit" data-drag="valve" x="${VE.p([-70, 0])[0]}" y="${VE.p([0, 240])[1]}" width="${K.r2(140 * VE.k)}" height="${K.r2(110 * VE.k)}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of an end-suction centrifugal pump cut through its shaft and through its volute, with the globe valve on its discharge. Drag the pump or use the up and down keys to change the speed; drag the handwheel or use the left and right keys to throttle the valve. The duty point, head, flow, efficiency and power follow." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainA +
  dimsA +
  viewB +
  detailC +
  detailD +
  valve +
  `<g id="dim-lift-wrap">${liftDim(M.LIFT_MAX)}</g>` +
  chart1() +
  chart2() +
  balloons +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the pump · <kbd>↑</kbd> <kbd>↓</kbd> speed · drag the handwheel · <kbd>←</kbd> <kbd>→</kbd> valve · <kbd>Space</kbd> tour · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "centrifugal-pump.html"), {
  title: "Centrifugal Pump Section",
  description:
    "A live engineering drawing of an end-suction centrifugal pump: the impeller turns, the water's pressure rises through it, and the duty point moves along the pump and system curves as the speed ramps and the valve throttles.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#water)}.bp-sheet .water-dot{fill:var(--bp-accent)}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet .dash{stroke-dasharray:3 2}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHARTS__", JSON.stringify({ CH, C2 })),
});
const d0 = M.state(M.N0, M.LIFT_MAX);
console.log(
  `centrifugal-pump.html  ${(size / 1024).toFixed(0)} KB  BEP ${M.BEP.q.toFixed(1)} m³/h ${M.BEP.h.toFixed(1)} m η ${(M.BEP.eta * 100).toFixed(0)}%  ` +
    `duty ${d0.q.toFixed(1)} m³/h ${d0.h.toFixed(1)} m  n_q ${M.NQ.toFixed(1)}  n_lift ${M.N_LIFT.toFixed(0)}`
);
