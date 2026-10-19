// Builds airframe.html: a live A2 drawing of the airframe of the four-seat high-wing strut-braced
// light aircraft (BP-022): an isometric cutaway of its structure with the skin removed, the port wing
// from ahead with its lift and the front spar's stress, the shear and bending-moment diagrams with and
// without the strut, the wing cut at the strut station, the front spar's section, a cabin frame
// section and the strut's wing fitting, all from one structural model.
//   node examples/airframe/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "../light-aircraft/model.mjs";
import * as X from "../light-aircraft/extra.mjs";
import * as G from "./geom.mjs";
import * as ST from "./model.mjs";
import * as DP from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const LA = join(here, "..", "light-aircraft");
const C = M.CABIN;
const PX = K.PX_PER_MM;
const fmt = (v, d = 1) => K.fmt(v, d);

// ---------------------------------------------------------------- views
const k25 = PX / 25;
const k10 = PX / 10;
const k20 = PX / 20;
const k2 = PX / 2.5;
// the isometric cutaway: fit its projected extent into x 40…556, y 52…432
const ext = (() => {
  const pts = [];
  for (const fs of [0, ...G.FRAMES]) for (const [b, w] of G.boxOutline(G.sectionAt(fs), 0)) pts.push(DP.iso([fs, w, b]));
  for (const ws of G.RIB_WS) for (const [fs, wl] of G.on(G.wingSection(ws), ws)) pts.push(DP.iso([fs, wl, -ws]));
  for (const [fs, wl] of G.FIN) pts.push(DP.iso([fs, wl, 0]));
  for (const [fs, wl] of G.tpSection(1700)) pts.push(DP.iso([fs, wl, -1700]));
  pts.push(DP.iso([M.TE_FS, 2100, -5480]));
  const us = pts.map((p) => p[0]);
  const vs = pts.map((p) => p[1]);
  return { u0: Math.min(...us), u1: Math.max(...us), v0: Math.min(...vs), v1: Math.max(...vs) };
})();
const ISO_BOX = { x0: 64, x1: 548, y0: 64, y1: 418 };
const kI = Math.min((ISO_BOX.x1 - ISO_BOX.x0) / (ext.u1 - ext.u0), (ISO_BOX.y1 - ISO_BOX.y0) / (ext.v1 - ext.v0));
const isoScale = kI / PX;
const VIEWS = {
  I: { x: K.r2((ISO_BOX.x0 + ISO_BOX.x1) / 2 - ((ext.u0 + ext.u1) / 2) * kI), y: K.r2((ISO_BOX.y0 + ISO_BOX.y1) / 2 + ((ext.v0 + ext.v1) / 2) * kI), scale: isoScale },
  B: { x: 640, y: K.r2(112 + 2100 * k25), scale: 1 / 25 },
  C: { x: K.r2(64 + 1830 * k10), y: K.r2(552 + 2200 * k10), scale: 1 / 10 },
  D: { x: 130, y: 722, scale: 1 / 2.5 },
  E: { x: 404, y: K.r2(686 + 730 * k20), scale: 1 / 20 },
  F: { x: 0, y: 0, scale: 1 / 2.5 },
};
// Detail F: the bolt at sheet (672, 626)
{
  const bolt = [ST.YS, G.STRUT_HI.wl - 30];
  VIEWS.F.x = K.r2(672 - bolt[0] * k2);
  VIEWS.F.y = K.r2(626 + bolt[1] * k2);
}
const VI = K.view(VIEWS.I);
const VB = K.view(VIEWS.B);
const VC = K.view(VIEWS.C);
const VD = K.view(VIEWS.D);
const VE = K.view(VIEWS.E);
const VF = K.view(VIEWS.F);

// balloons round a view: slots on a rectangle, matched to anchors in angular order (no crossings for a
// convex spread), the offset that gives the shortest leaders
function ring(V, anchors, box, step = 22) {
  // angles about the anchors' centroid, so leaders fan out from where the dots are
  const ps = anchors.map((q) => V.p(q.at));
  const cx = ps.reduce((s, p) => s + p[0], 0) / ps.length;
  const cy = ps.reduce((s, p) => s + p[1], 0) / ps.length;
  const slots = [];
  for (let x = box.x0; x <= box.x1; x += step) slots.push([x, box.y0]);
  for (let y = box.y0 + step; y <= box.y1; y += step) slots.push([box.x1, y]);
  for (let x = box.x1 - step; x >= box.x0; x -= step) slots.push([x, box.y1]);
  for (let y = box.y1 - step; y > box.y0; y -= step) slots.push([box.x0, y]);
  const usable = slots.filter((s) => !(box.skip ?? []).some((k) => s[0] >= k.x0 && s[0] <= k.x1 && s[1] >= k.y0 && s[1] <= k.y1));
  const ang = (x, y) => Math.atan2(y - cy, x - cx);
  const A = anchors.map((a) => ({ ...a, s: V.p(a.at) })).sort((p, q) => ang(...p.s) - ang(...q.s));
  const S = usable.slice().sort((p, q) => ang(...p) - ang(...q));
  let best = null;
  for (let off = 0; off < S.length; off++) {
    const pick = A.map((_, i) => S[(off + Math.round((i * S.length) / A.length)) % S.length]);
    const cost = pick.reduce((s, p, i) => s + Math.hypot(p[0] - A[i].s[0], p[1] - A[i].s[1]) ** 1.5, 0);
    if (!best || cost < best.cost) best = { cost, pick };
  }
  return A.map((a, i) => K.balloon(V, a.at, best.pick[i], a.n, { target: a.n })).join("");
}

// ---------------------------------------------------------------- ISOMETRIC CUTAWAY
const iso = DP.isoCutaway(VI);
const P3 = (q) => DP.iso(q);
const isoAnchors = [
  { n: 1, at: P3([...G.sparTop(G.FRONT_X, 2400), -2400].map((v, i) => (i === 1 ? v - 30 : v))) },
  { n: 2, at: P3([...G.sparTop(G.rearX(4400), 4400).map((v, i) => (v + G.sparBot(G.rearX(4400), 4400)[i]) / 2), -4400]) },
  { n: 3, at: P3([...G.on([[0.45, (G.up(0.45) + G.lo(0.45)) / 2]], 1800)[0], -1800]) },
  { n: 4, at: P3([...G.on([[0.3, G.up(0.3)]], 5000)[0], -5000]) },
  { n: 5, at: P3([G.STRUT_HI.fs - 35, G.STRUT_HI.wl - 30, -3000]) },
  { n: 6, at: P3(G.strutAt(0.45)) },
  { n: 7, at: P3([G.STRUT_LO.fs - 45, G.STRUT_LO.wl, -C.half - 15]) },
  { n: 8, at: P3([G.ROOF_FRAMES[1] - 35, C.roof + 25, -C.half + 30]) },
  { n: 9, at: P3([0, 1000, -300]) },
  { n: 10, at: P3([4200, ...G.boxOutline(G.sectionAt(4200), 20).filter(([b]) => b < 0).map(([b, w]) => [w, b]).sort((a, b) => a[0] - b[0])[0]]) },
  { n: 11, at: P3(G.longeronAt(G.LONGERONS[2], 3300, 4)) },
  { n: 12, at: P3(G.stringerAt(G.STRINGERS[0], 4500, 3)) },
  { n: 13, at: P3([5200, M.TAILCONE.axis + M.coneR(5200) * 0.4, M.coneR(5200) * 0.9]) },
  { n: 14, at: P3([G.DOOR.fs1 + 20, 1400, -C.half - 1]) },
  { n: 15, at: P3([G.TP_FRONT, G.tpHalf(1000, G.TP_FRONT)[1] - 3, -1000]) },
  { n: 16, at: P3([...G.tpSection(1140).reduce((s, p, i, a) => [s[0] + p[0] / a.length, s[1] + p[1] / a.length], [0, 0]), -1140]) },
  { n: 17, at: P3([6250, 2400, 0]) },
];
const isoView =
  `<g data-geom="I">${iso.svg}</g>` +
  iso.phantom +
  ring(VI, isoAnchors, { x0: 40, x1: 566, y0: 40, y1: 440, skip: [{ x0: 200, x1: 420, y0: 430, y1: 460 }] }, 21) +
  K.viewLabel(304, 458, "ISOMETRIC CUTAWAY", "SKIN REMOVED ABOVE THE WING AND ON THE PORT SIDE · ENGINE OFF · NTS");

// ---------------------------------------------------------------- FRONT VIEW: the port wing, 1:25
const fvw = DP.frontView(VB);
const strutMid = [(G.STRUT_LO.bl + G.STRUT_HI.bl) / 2, (G.STRUT_LO.wl + G.STRUT_HI.wl) / 2];
const frontBalloons =
  K.balloon(VB, [1700, DP.sparBand(1700)[0] + 18], [800, 238], 1, { target: 1 }) +
  K.balloon(VB, [4800, DP.wingLowAt(4800) + 6], [1000, 238], 4, { target: 4 }) +
  K.balloon(VB, [G.STRUT_LO.bl + 0.25 * (G.STRUT_HI.bl - G.STRUT_LO.bl), G.STRUT_LO.wl + 0.25 * (G.STRUT_HI.wl - G.STRUT_LO.wl)], [720, 238], 6, { target: 6 });
const frontView =
  `<g data-geom="B">${fvw.svg}</g>` +
  `<g data-role="fluid" id="b-lift"></g>` +
  `<g id="b-strut"></g>` +
  frontBalloons +
  K.viewLabel(1100, 172, "FRONT VIEW", "PORT WING · 1:25") ;
// the lift's scale: N/mm per sheet unit, so 4.4 g fills 58 units
const W1MAX = (ST.W / 2) * ST.schrenk(0);
const LIFT_K = 58 / (4.4 * W1MAX);

// ---------------------------------------------------------------- DIAGRAMS: shear and bending moment
const CH = { x0: VB.p([0, 0])[0], x1: VB.p([M.TIP_WS, 0])[0], sY0: 252, sY1: 318, mY0: 334, mY1: 420, v0: -32, v1: 22, m0: -6, m1: 42 };
const wx = (ws) => K.r2(VB.p([ws, 0])[0]);
const sy = (v) => K.r2(CH.sY1 - ((Math.max(CH.v0, Math.min(CH.v1, v)) - CH.v0) / (CH.v1 - CH.v0)) * (CH.sY1 - CH.sY0));
const my = (m) => K.r2(CH.mY1 - ((Math.max(CH.m0, Math.min(CH.m1, m)) - CH.m0) / (CH.m1 - CH.m0)) * (CH.mY1 - CH.mY0));
const allowM = ST.YS_GRID.map((y) => (ST.F_TY * ST.hFront(y) * ST.CAP_A) / ST.frontShare(y) / 1e6); // kN·m at F_ty
function charts() {
  let grid = "";
  let labels = "";
  for (let v = -30; v <= 20; v += 10) {
    grid += `M${CH.x0} ${sy(v)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 4}" y="${K.r2(sy(v) + 2.7)}" text-anchor="end">${v}</text>`;
  }
  for (let m = 0; m <= 40; m += 10) {
    grid += `M${CH.x0} ${my(m)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 4}" y="${K.r2(my(m) + 2.7)}" text-anchor="end">${m}</text>`;
  }
  for (let ws = 0; ws <= 5500; ws += 1000) {
    grid += `M${wx(ws)} ${CH.sY0}V${CH.sY1}M${wx(ws)} ${CH.mY0}V${CH.mY1}`;
    labels += `<text class="t t-sm" x="${wx(ws)}" y="${CH.mY1 + 10}" text-anchor="middle">${ws}</text>`;
  }
  const zero = `M${CH.x0} ${sy(0)}H${CH.x1}M${CH.x0} ${my(0)}H${CH.x1}`;
  const marks = [ST.Y0, ST.YS].map((ws) => `M${wx(ws)} ${CH.sY0}V${CH.sY1}M${wx(ws)} ${CH.mY0}V${CH.mY1}`).join("");
  const allow = ST.YS_GRID.map((y, i) => `${wx(y)},${my(allowM[i])}`).join(" ");
  labels += `<text class="t t-sm" x="${wx(ST.Y0) + 3}" y="${CH.sY0 + 9}">ROOT</text><text class="t t-sm" x="${wx(ST.YS) + 3}" y="${CH.sY0 + 9}">STRUT</text>`;
  labels += `<text class="t t-sm" x="${wx(4300)}" y="${K.r2(my(allowM[ST.idxOf(4300)]) - 3)}" text-anchor="middle">F_ty</text>`;
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.mY1 + 21}" text-anchor="middle">WING STATION WS, mm</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x0 - 24}" y="${(CH.sY0 + CH.sY1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH.x0 - 24} ${(CH.sY0 + CH.sY1) / 2})">SHEAR V, kN</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x0 - 24}" y="${(CH.mY0 + CH.mY1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH.x0 - 24} ${(CH.mY0 + CH.mY1) / 2})">MOMENT M, kN·m</text>`;
  const box = (y0, y1) => `<rect class="paper" x="${CH.x0}" y="${y0}" width="${K.r2(CH.x1 - CH.x0)}" height="${y1 - y0}"/>`;
  const frame = (y0, y1) => `<rect class="vis" x="${CH.x0}" y="${y0}" width="${K.r2(CH.x1 - CH.x0)}" height="${y1 - y0}"/>`;
  return (
    `<g data-role="chart">` +
    box(CH.sY0, CH.sY1) +
    box(CH.mY0, CH.mY1) +
    `<path class="thin grid-line" d="${grid}"/><path class="thin" d="${zero}"/><path class="ctr" d="${marks}"/>` +
    `<polyline class="phan" points="${allow}"/>` +
    `<polyline id="s-free" class="hid" points=""/><polyline id="s-cur" class="vis accent" points=""/>` +
    `<polyline id="m-free" class="hid" points=""/><polyline id="m-cur" class="vis accent" points=""/>` +
    `<circle id="m-dot" class="accent-fill" cx="0" cy="0" r="3"/>` +
    frame(CH.sY0, CH.sY1) +
    frame(CH.mY0, CH.mY1) +
    labels +
    `<text id="m-peak" class="t t-sm t-accent" x="${wx(3200)}" y="${CH.mY0 + 10}"></text>` +
    `<text id="m-freet" class="t t-sm" x="${wx(700)}" y="${CH.mY0 + 10}"></text>` +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 458, "DIAGRAMS 1 AND 2 · SHEAR AND BENDING MOMENT, ONE WING", "ACCENT: STRUT-BRACED, NOW · DASHED: SAME WING WITHOUT THE STRUT · PHANTOM: F_ty IN THE CAPS")
  );
}

// ---------------------------------------------------------------- SECTION C-C, DETAIL D, SECTION E-E, DETAIL F
const sc = DP.sectionC(VC);
const sectionC =
  `<g data-geom="C">${sc.svg}</g>` +
  K.dim(VC, sc.le, [sc.rear[0], sc.le[1]], { dir: "h", off: -50, text: `${Math.round(M.chordAt(DP.CC_WS) * G.rearX(DP.CC_WS))}` }) +
  K.dim(VC, [sc.front.up[0], sc.le[1]], [sc.rear[0], sc.le[1]], { dir: "h", off: -36, text: `${Math.round(sc.front.up[0] - sc.rear[0])}` }) +
  K.detailMark(VC, [(sc.front.up[0] + sc.front.lo[0]) / 2, (sc.front.up[1] + sc.front.lo[1]) / 2], 120, "D", 135) +
  K.balloon(VC, sc.ribAt, [300, 492], 3, { target: 3 }) +
  K.balloon(VC, sc.rearMid, [70, 500], 2, { target: 2 }) +
  K.balloon(VC, sc.skinAt, [290, 600], 4, { target: 4 }) +
  K.balloon(VC, sc.fitAt, [40, 560], 5, { target: 5 }) +
  K.balloon(VC, sc.strutAt, [40, 588], 6, { target: 6 });
const labelC = K.viewLabel(165, 618, "SECTION C-C", "WING AT THE STRUT, WS 3000, LOOKING OUTBOARD · 1:10");
const dd = DP.detailD(VD);
const detailD =
  `<g data-geom="D">${dd.svg}</g>` +
  K.dim(VD, [46, dd.top + 1.6], [46, dd.bot - 1.6], { dir: "v", off: 34, text: `${fmt(ST.sparDepth(DP.CC_WS) + 2 * ST.SKIN, 0)}` }) +
  K.dim(VD, [ST.WEB_T / 2 + ST.CAP.w, dd.top - ST.capCentroid], [ST.WEB_T / 2 + ST.CAP.w, dd.bot + ST.capCentroid], { dir: "v", off: 14, text: `h ${fmt(ST.hFront(DP.CC_WS), 0)}` }) +
  K.balloon(VD, [-(ST.WEB_T / 2 + ST.CAP.w) + 6, dd.bot + ST.CAP.t / 2], [62, 770], 1, { target: 1 }) +
  K.balloon(VD, [-30, dd.bot - 0.8], [62, 740], 4, { target: 4 }) +
  K.viewLabel(130, 806, "DETAIL D", "FRONT SPAR, WS 3000 · 1:2.5");
const se = DP.sectionE(VE);
const sectionE =
  `<g data-geom="E">${se.svg}</g>` +
  K.dim(VE, [-C.half, C.floor], [C.half, C.floor], { dir: "h", off: 14 }) +
  K.balloon(VE, se.frameAt, [312, 600], 10, { target: 10 }) +
  K.balloon(VE, se.longAt[0], [312, 540], 11, { target: 11 }) +
  K.balloon(VE, se.roofAt, [360, 522], 8, { target: 8 }) +
  K.balloon(VE, se.skinAt, [470, 690], 13, { target: 13 }) +
  K.balloon(VE, se.lowAt, [312, 650], 7, { target: 7 }) +
  K.viewLabel(404, 728, "SECTION E-E", "CABIN AT FS 1590, LOOKING FORWARD · 1:20");
const sf = DP.detailF(VF);
const detailF =
  `<g data-geom="F">${sf.svg}</g>` +
  K.dim(VF, [sf.bolt[0] - ST.FITTING_BOLT.d / 2, sf.bolt[1]], [sf.bolt[0] + ST.FITTING_BOLT.d / 2, sf.bolt[1]], { dir: "h", off: 30, prefix: "Ø", text: "9.5" }) +
  `<g data-role="fluid" id="f-arrow"></g>` +
  K.balloon(VF, sf.plateAt, [790, 560], 5, { target: 5 }) +
  K.balloon(VF, sf.webAt, [560, 500], 1, { target: 1 }) +
  K.balloon(VF, sf.forkAt, [540, 640], 6, { target: 6 }) +
  `<text id="f-t" class="t t-sm t-accent" x="600" y="708"></text>` +
  K.viewLabel(680, 728, "DETAIL F", "STRUT TO WING FITTING, FROM AHEAD · AN6 BOLT IN DOUBLE SHEAR · 1:2.5");

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "FRONT SPAR, CAPS 2 L 22×22×3.2", "2024-T3", "2"],
  ["2", "REAR SPAR, CHANNEL 1.0, CAPS", "2024-T3", "2"],
  ["3", "WING RIB, FORMED 0.5, NOSE AND MAIN", "2024-T3", "26"],
  ["4", "WING SKIN 0.64", "2024-T3 ALCLAD", "1 SET"],
  ["5", "STRUT FITTING, WING, AN6 BOLT", "4130 STEEL", "2"],
  ["6", "WING STRUT, STREAMLINE 100×40×1.6", "6061-T6", "2"],
  ["7", "STRUT FITTING, FUSELAGE", "4130 STEEL", "2"],
  ["8", "WING ATTACH FITTING, CABIN ROOF", "4130 STEEL", "4"],
  ["9", "FIREWALL 0.4", "AISI 321", "1"],
  ["10", "FRAME (BULKHEAD), FORMED 0.8", "2024-T3", "12"],
  ["11", "LONGERON, L 25×25×1.6", "2024-T3", "4"],
  ["12", "STRINGER, Z 0.6", "2024-T3", "4"],
  ["13", "FUSELAGE SKIN 0.6–0.8", "2024-T3 ALCLAD", "1 SET"],
  ["14", "CABIN DOOR FRAME AND DOUBLER", "2024-T3", "2"],
  ["15", "TAILPLANE SPARS, FRONT AND REAR", "2024-T3", "2"],
  ["16", "TAILPLANE RIB", "2024-T3", "12"],
  ["17", "FIN: SPAR, RIBS, SKIN", "2024-T3", "1"],
];
const TB = { x: 850, w: 326, h: 140 };
TB.y = 824 - TB.h;
const rowH = 11;
const bomTop = TB.y - (18 + BOM.length * rowH);
const bom = K.table(TB.x, bomTop, [
  { w: 26, align: "center", title: "ITEM" },
  { w: 178, title: "DESCRIPTION" },
  { w: 90, title: "MATERIAL" },
  { w: 32, align: "center", title: "QTY" },
], BOM, { rowH });
const L38 = ST.loads(ST.N_LIMIT);
const notes = K.notes(268, 752, "NOTES", [
  `LIFT n·W ${fmt(ST.W / 1000, 2)} kN × n, SPREAD BY SCHRENK; ${Math.round(100 * ST.OUTBOARD)} % OF EACH HALF OUTBOARD OF THE ROOT PIN. NO INERTIA RELIEF.`,
  `STRUT AT ${fmt(ST.STRUT_ANGLE, 1)}°: AT 1 g R ${fmt(ST.R1 / 1000, 2)} kN, T ${fmt(ST.T1 / 1000, 2)} kN, SPAR PUSH ${fmt(ST.P1 / 1000, 2)} kN. NEGATIVE g PUTS IT IN COMPRESSION.`,
  `σ = M_f / (h·A): AT 3.8 g ${Math.round(L38.sigma)} MPa ≤ F_ty ${ST.F_TY}; ×1.5 = ${Math.round(1.5 * L38.sigma)} ≤ F_tu ${ST.F_TU} (RF ${fmt(L38.rfUlt, 2)}). UNBRACED: ${Math.round(L38.sigmaFree)}.`,
  `GUST: U ${ST.U_DE} m/s AT V_C ${ST.V_C} kt, μ ${fmt(ST.MU_G, 1)}, K_g ${fmt(ST.K_G, 2)}: n ${fmt(ST.N_GUST, 2)}. LIMIT +3.8 / −1.52 g, NORMAL CATEGORY.`,
  `AN6 BOLT, DOUBLE SHEAR ${fmt(ST.BOLT_ULT / 1000, 0)} kN ULT. AGAINST 1.5 T = ${fmt((1.5 * L38.T) / 1000, 1)} kN AT 3.8 g. ALL RIVETS MS20470AD.`,
]);
const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 236, h: 32, label: "TITLE", value: "AIRFRAME STRUCTURE", size: "lg" },
  { x: 236, y: 0, w: 90, h: 32, label: "DWG NO", value: "BP-111", size: "lg" },
  { x: 0, y: 32, w: 60, h: 25, label: "SCALE", value: "AS SHOWN" },
  { x: 60, y: 32, w: 34, h: 25, label: "SIZE", value: "A2" },
  { x: 94, y: 32, w: 46, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 140, y: 32, w: 86, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 226, y: 32, w: 100, h: 25, label: "DATE", value: "2026-10-18" },
  { x: 0, y: 57, w: 110, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 110, y: 57, w: 96, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 206, y: 57, w: 120, h: 25, label: "UNITS", value: "mm · kN · MPa" },
  { x: 0, y: 82, w: 326, h: 29, label: "LIVE · LOAD · ↑ ↓ LOAD FACTOR n · SPACE: TOUR · S: SLOW", value: "", id: "readout", size: "sm" },
  { x: 0, y: 111, w: 326, h: 29, label: "LIVE · FRONT SPAR CAP AND STRUT, 2024-T3 / 6061-T6", value: "", id: "readout2", size: "sm" },
]);

// ---------------------------------------------------------------- the sheet
const defs = `<defs>${K.hatchDefs()}<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern></defs>`;
const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of the airframe of a four-seat high-wing strut-braced light aircraft: an isometric cutaway of the structure with the skin removed, showing the wing's front and rear spars, ribs and skin, the strut and its fittings, the fuselage's frames, longerons, stringers, firewall and door frame, and the tailplane and fin; the port wing from ahead with its lift distribution and the front spar's stress shaded; the shear and bending-moment diagrams with and without the strut; the wing cut at the strut station; the front spar's section; a cabin frame section; and the strut's wing fitting. The tour runs 1 g cruise, a 2 g turn, the 3.8 g limit pull-up and a gust; the up and down arrows set the load factor." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  isoView +
  frontView +
  charts() +
  sectionC +
  labelC +
  detailD +
  sectionE +
  detailF +
  notes +
  bom +
  title +
  `</svg>`;

const bar =
  `<span><kbd>↑</kbd> <kbd>↓</kbd> load factor · <kbd>Space</kbd> tour · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const DATA = {
  CH,
  LIFT_K,
  bays: iso.bays.map((b) => [b.i, ST.idxOf(b.a), ST.idxOf(b.b)]),
  cells: ST.NY,
  strutA: [G.STRUT_LO.bl + 30, G.STRUT_LO.wl],
  strutB: [G.STRUT_HI.bl, G.STRUT_HI.wl],
  fBolt: sf.bolt,
  fDir: sf.dir,
};
const size = writePage(join(here, "airframe.html"), {
  title: "Airframe",
  description: "A live engineering drawing of a light aircraft's airframe: an isometric cutaway of the spars, ribs, strut, frames, longerons and tail; the wing's lift, shear and bending moment with and without its strut; the spar cap's stress against the 2024-T3 allowable; and the sections and fittings that carry it, from 1 g cruise to the 3.8 g limit and a gust.",
  svg,
  bar,
  css: `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet .lift{fill:var(--bp-accent);fill-opacity:.14;stroke:var(--bp-accent);stroke-width:1px}.bp-sheet .head-a{fill:var(--bp-accent)}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(LA, "model.mjs"), "M"],
    [join(LA, "extra.mjs"), "X"],
    [join(LA, "parts.mjs"), "P"],
    [join(here, "model.mjs"), "ST"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA)),
});
void X;
console.log(
  `airframe.html  ${(size / 1024).toFixed(0)} KB  iso 1:${(1 / isoScale).toFixed(1)}  strut ${ST.STRUT_ANGLE.toFixed(1)}° L ${ST.STRUT_L.toFixed(0)}  1 g: R ${(ST.R1 / 1000).toFixed(2)} T ${(ST.T1 / 1000).toFixed(2)} kN  3.8 g: M ${(L38.mMax / 1e6).toFixed(2)} kN·m σ ${L38.sigma.toFixed(0)} MPa RF ${L38.rfUlt.toFixed(2)}  free σ ${L38.sigmaFree.toFixed(0)}  gust n ${ST.N_GUST.toFixed(2)}`
);
