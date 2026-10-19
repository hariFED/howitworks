// The flight controls' details, diagrams and sheet furniture. Pure: each function returns SVG for one
// solved state, so the build draws the sheet and the page redraws the moving pieces with the same code.
//   Section A-A  the right aileron at its horn (WS 3450), looking outboard, 1:5: u = FS − hinge (aft +),
//                v = WL − hinge. The differential is the horn's forward lean.
//   Detail B     a 3 in pulley on its mid-plane with its bracket and guard pins, 1:2 (pulley frame).
//   Detail C     a turnbuckle on its axis, 1:1, in the up elevator cable.
//   Section D-D  the port elevator at the trim actuator (BL −485), in the elevator's own frame, 1:2.5.
//   Detail E     the cockpit, the same pictorial as the main view at 1:10.
//   Diagrams     aileron angles against the wheel; stick force against airspeed.

import * as K from "../../kit/draft.mjs";
import * as A from "../light-aircraft/model.mjs";
import * as M from "./model.mjs";
import * as X from "./extra.mjs";
import * as P from "./parts.mjs";

const rad = Math.PI / 180;
const part = P.part;
const r2 = K.r2;

// ---------------------------------------------------------------- views (sheet units)
const k = (s) => s * K.PX_PER_MM;
export const BOX = {
  E: { x: 828, y: 30, w: 342, h: 246 },
  AA: { x: 30, y: 452, w: 290, h: 150 },
  B: { x: 328, y: 452, w: 102, h: 150 },
  D: { x: 438, y: 452, w: 330, h: 150 },
  C: { x: 30, y: 676, w: 300, h: 60 },
};
const E_AT = [300, -60, 1260]; // the cockpit point at the middle of Detail E
const eUV = P.PROJ_E.pv(E_AT);
export const VIEWS = {
  main: { x: 104, y: 302, scale: 1 / 33 }, // the pictorial: NTS, the scale only sizes it
  E: { x: BOX.E.x + BOX.E.w / 2 - eUV[0] * k(0.1), y: BOX.E.y + BOX.E.h / 2 + eUV[1] * k(0.1), scale: 0.1 },
  AA: { x: BOX.AA.x + 190 * k(0.2), y: BOX.AA.y + 168 * k(0.2), scale: 0.2 },
  B: { x: BOX.B.x + BOX.B.w / 2 + 4, y: BOX.B.y + 70, scale: 0.5 },
  D: { x: BOX.D.x + 44 * k(0.4), y: BOX.D.y + 80 * k(0.4), scale: 0.4 },
  C: { x: BOX.C.x + BOX.C.w / 2, y: BOX.C.y + BOX.C.h / 2, scale: 1 },
};
const VM = { ...K.view(VIEWS.main), pr: P.PROJ };
const VE = { ...K.view(VIEWS.E), pr: P.PROJ_E };
const VA = K.view(VIEWS.AA);
const VB = K.view(VIEWS.B);
const VD = K.view(VIEWS.D);
const VC = K.view(VIEWS.C);
export const V = { main: VM, E: VE, AA: VA, B: VB, D: VD, C: VC };

// ---------------------------------------------------------------- balloons in the pictorial views
// The cables' dots sit on straight runs between fixed pulleys (static); the moving parts' dots ride with
// them (live: the page redraws those every frame).
const REST = (() => {
  const sol = M.solve(M.state());
  const ps = M.pose(sol);
  const w = {};
  for (const [name, run] of M.cables(ps, sol)) w[name] = Object.fromEntries(run.wraps.map((x) => [x.name, x]));
  return { w, ps, runs: M.cables(ps, sol) };
})();
const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export const PICT = [
  // main view
  { n: 6, v: "main", at: [62, 150], dot: () => lerp3(REST.w["ail-L"].A2L.tout, REST.w["ail-L"].A3L.tin, 0.5) },
  { n: 26, v: "main", at: [290, 398], dot: () => lerp3(REST.w["trim-A"].T1A.tout, REST.w["trim-A"].T2A.tin, 0.45) },
  { n: 21, v: "main", at: [316, 398], dot: () => lerp3(REST.w["rud-L"].R2L.tout, REST.ps.horn.L, 0.55) },
  { n: 9, v: "main", at: [342, 398], dot: () => P.fairleadPoints(REST.runs).find((p) => p[0] === 4300) },
  { n: 16, v: "main", at: [368, 398], dot: () => lerp3(REST.w["elev-U"].E2U.tout, REST.w["elev-U"].E3U.tin, 0.62) },
  { n: 22, v: "main", at: [448, 398], dot: () => [M.RUD_HORN.fs, 0, M.RUD_HORN.wl] },
  { n: 18, v: "main", at: [474, 398], dot: () => lerp3(...P.stopBolts()[0], 0.5) },
  { n: 17, v: "main", at: [500, 398], dot: () => [A.TAILPLANE.hinge, -50, A.TAILPLANE.wl] },
  { n: 23, v: "main", at: [548, 226], live: true, dot: (sol) => P.rudderPoint(sol.yw.dr, 0.3, 2100) },
  // Detail E
  { n: 4, v: "E", at: [806, 84], dot: () => [M.SPR.fs, -M.WHEEL.bl, M.WHEEL.wl] },
  { n: 3, v: "E", at: [806, 110], dot: () => [M.PANEL_FS, -M.WHEEL.bl, M.WHEEL.wl - 28] },
  { n: 14, v: "E", at: [806, 58], live: true, dot: (sol) => lerp3([M.COLUMN.collar + sol.pt.x, -M.COLUMN.lug, M.WHEEL.wl], M.pose(sol).idler.rodL, 0.5) },
  { n: 5, v: "E", at: [806, 188], dot: () => [M.SPR.fs, -M.WHEEL.bl - M.R_SPR, M.WHEEL.wl - 200] },
  { n: 2, v: "E", at: [806, 136], live: true, dot: (sol) => [M.WHEEL.fs - 120 + sol.pt.x, -M.WHEEL.bl, M.WHEEL.wl] },
  { n: 1, v: "E", at: [806, 162], live: true, dot: (sol) => [M.WHEEL.fs + sol.pt.x, -M.WHEEL.bl, M.WHEEL.wl] },
  { n: 15, v: "E", at: [930, 290], dot: () => [M.IDLER.fs, 120, M.IDLER.wl] },
  { n: 25, v: "E", at: [970, 290], dot: () => [M.TRIM.fs, 0, M.TRIM.wl + 40] },
  { n: 20, v: "E", at: [1010, 290], dot: () => [M.PED.fs, 380, M.PED.wl] },
  { n: 24, v: "E", at: [1050, 290], dot: () => lerp3(...P.bungeeEnds(1, { s: 0 }), 0.6) },
];
export const pictBalloon = (b, sol) => K.balloon(V[b.v], V[b.v].pr.pv(b.dot(sol)), b.at, b.n, { target: b.n });
const clipRect = (id, b) => `<clipPath id="clip-${id}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10"/></clipPath>`;
export const defs = () => Object.entries(BOX).map(([id, b]) => clipRect(id, b)).join("");
const frameRect = (b) => `<rect class="thin" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10"/>`;
const paperRect = (b) => `<rect class="paper" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>`;

// ================================================================ SECTION A-A: the right aileron at its horn
const AW = M.HORN_WS;
const AF = A.naca2412(40);
const AC = A.chordAt(AW);
const ALE = A.leAt(AW);
const HWL = M.AIL_HINGE_WL(AW);
// a section point (ξ, η) of the wing at WS 3450 in A-A's frame
const aa = ([xi, eta]) => {
  const [fs, wl] = A.toWing([xi, eta], AC, ALE, A.WL_LE);
  return [fs - M.HINGE_FS, wl + A.dihedralRise(AW) - HWL];
};
const XI_H = (M.HINGE_FS - ALE) / AC;
const upAt = (x) => A.surfaceAt(AF.upper, x);
const loAt = (x) => A.surfaceAt(AF.lower, x);
// the aileron: a round nose about the hinge, then the aerofoil's surfaces to the trailing edge
const RN = (aa([XI_H, upAt(XI_H)])[1] - aa([XI_H, loAt(XI_H)])[1]) / 2 - 3;
export function aileronLoop() {
  const top = [];
  const bot = [];
  for (let i = 0; i <= 16; i++) {
    const x = XI_H + 0.012 + ((1 - XI_H - 0.012) * i) / 16;
    top.push(aa([x, upAt(x)]));
    bot.push(aa([x, loAt(x)]));
  }
  const nose = K.arc(0, 0, RN, 90, 270, 12);
  // join the nose to the surfaces: upper from (0, RN) to the first top point, lower likewise
  return [...nose, ...bot, ...top.reverse()];
}
const AIL = aileronLoop();
const turn = (pts, deg, c = [0, 0]) => X.rot(pts, c, deg);
// the horn: a plate from the hinge, leaning ψ0 forward, its tip at HORN
export const hornPts = (deg) => {
  const L = M.HORN;
  const lean = M.PSI0 + deg;
  const tip = [-L * Math.sin(lean * rad), L * Math.cos(lean * rad)];
  return { tip, outline: X.hull([...K.circle(0, 0, 9, 12), ...K.circle(tip[0], tip[1], 8, 12)]) };
};
const T0 = hornPts(0).tip;
const BREAK = { at: -100, gap: 140 }; // the rod is drawn broken: 100 mm left out
// the rod from the horn tip to the break (its first drawn length)
export function aaRodA(sol) {
  const h = hornPts(sol.r.right);
  const fwd = [T0[0] - M.ROD_L - sol.r.d + BREAK.gap, T0[1]];
  const x = BREAK.at + 6;
  return [h.tip, [x, fwd[1] + (h.tip[1] - fwd[1]) * ((x - fwd[0]) / (h.tip[0] - fwd[0]))]];
}
export function aaMoving(sol) {
  const dl = sol.r.right;
  const d = sol.r.d;
  const h = hornPts(dl);
  const fwd = [T0[0] - M.ROD_L - d + BREAK.gap, T0[1]]; // the bellcrank arm's end, drawn with the break
  const brk = BREAK.at;
  const rodA = [h.tip, [brk + 6, fwd[1] + (h.tip[1] - fwd[1]) * ((brk + 6 - fwd[0]) / (h.tip[0] - fwd[0]))]];
  const rodB = [[brk - 6, fwd[1] + (h.tip[1] - fwd[1]) * ((brk - 6 - fwd[0]) / (h.tip[0] - fwd[0]))], fwd];
  const rodBody = ([a, b]) => K.body(VA, P.rodOutline2(a, b, 6.35));
  return (
    part(13, X.skin(VA, turn(AIL, dl), 2.2) + P.web(VA, turn([[10, RN - 4], [10, -RN + 4]], dl), 1.6) + K.body(VA, h.outline) + `<circle class="vis" cx="${r2(VA.p(h.tip)[0])}" cy="${r2(VA.p(h.tip)[1])}" r="${r2(3 * VA.k)}"/>`) +
    part(12, rodBody(rodA) + rodBody(rodB) + X.freehand(VA, [[brk + 6, rodA[1][1] + 9], [brk + 6, rodA[1][1] - 9]], 0.6, 3) + X.freehand(VA, [[brk - 6, rodB[0][1] + 9], [brk - 6, rodB[0][1] - 9]], 0.6, 5)) +
    part(11, K.body(VA, K.rrect(fwd[0] - 22, fwd[1] - 7, fwd[0] + 4, fwd[1] + 7, 3)) + `<circle class="vis" cx="${r2(VA.p(fwd)[0])}" cy="${r2(VA.p(fwd)[1])}" r="${r2(3 * VA.k)}"/>`)
  );
}
function aaStatic() {
  // the wing's aft part and its rear spar, phantom (adjacent structure)
  const wU = [];
  const wL = [];
  for (let i = 0; i <= 10; i++) {
    const x = XI_H - 0.135 + (0.135 - 0.045) * (i / 10);
    wU.push(aa([x, upAt(x)]));
    wL.push(aa([x, loAt(x)]));
  }
  const spar = wU[wU.length - 1][0];
  const cove = K.arc(0, 0, RN + 4, 100, 260, 10);
  const phan = [wU, wL, [wU[wU.length - 1], [spar, wU[wU.length - 1][1] - 20]], [[spar, wL[wL.length - 1][1] + 20], wL[wL.length - 1]], cove, [[spar, cove[0][1]], cove[0]], [[spar, cove[cove.length - 1][1]], cove[cove.length - 1]]];
  const ext = (deg) => turn(AIL, deg);
  return (
    `<g data-role="phantom">${phan.map((p) => K.line(VA, p, "phan")).join("")}${K.line(VA, ext(M.UP_MAX), "phan", true)}${K.line(VA, ext(-M.DOWN_MAX), "phan", true)}` +
    `${K.line(VA, [[0, 0], T0], "phan")}</g>`
  );
}
// the trailing edge (the loop's point furthest aft)
const TE_I = AIL.reduce((bi, p, i) => (p[0] > AIL[bi][0] ? i : bi), 0);
export const TE_AT = () => AIL[TE_I];
// angular dimensions: the travel each way at the trailing edge (the words beyond each arc's end, clear of
// the aileron's sweep), and the horn's lean from the vertical at neutral
function aaDims() {
  const te = AIL[TE_I];
  const R = Math.hypot(...te) * VA.k + 8;
  const neutral = Math.atan2(te[1], te[0]) / rad;
  const word = (deg, text, dy) => {
    const [cx, cy] = VA.p([0, 0]);
    const x = cx + R * Math.cos(deg * rad) - 8;
    const y = cy - R * Math.sin(deg * rad) + dy;
    return `<g data-role="dim"><text class="t" x="${r2(x)}" y="${r2(y)}" text-anchor="middle">${text}</text></g>`;
  };
  const [hx, hy] = VA.p([0, 0]);
  return (
    X.angleDim(VA, [0, 0], R, neutral, neutral + M.UP_MAX, "") +
    word(neutral + M.UP_MAX, `${M.UP_MAX}° UP`, -7) +
    X.angleDim(VA, [0, 0], R, neutral - M.DOWN_MAX, neutral, "") +
    word(neutral - M.DOWN_MAX, `${M.DOWN_MAX}° DOWN`, 13) +
    `<g data-role="dim"><path class="thin" d="M${r2(hx)} ${r2(hy - 8)}V${r2(hy - 33)}"/></g>` +
    X.angleDim(VA, [0, 0], 30, 90, 90 + M.PSI0, `${K.fmt(M.PSI0, 1)}°`, { gap: 7 })
  );
}

// ================================================================ DETAIL B: a pulley and its cable guard
const PB = { r: M.PULLEY_D / 2, flange: 42, hub: 11, holes: 6, holeR: 5, holeAt: 24.5, cr: M.CABLE_D / 2 };
const PIN_AT = [160, 290]; // guard pins (deg), where the cable enters and leaves the groove
const pinXY = (a) => [(PB.flange + 3.4) * Math.cos(a * rad), (PB.flange + 3.4) * Math.sin(a * rad)];
// the pulley turns as the cable runs over it (rad of turn = travel / pitch radius)
export function bRotor(travel) {
  const turnDeg = -(travel / PB.r) / rad;
  const holes = Array.from({ length: PB.holes }, (_, i) => K.circle(PB.holeAt * Math.cos((i * 60 + turnDeg) * rad), PB.holeAt * Math.sin((i * 60 + turnDeg) * rad), PB.holeR, 16));
  const body = X.cutHoles(VB, K.circle(0, 0, PB.r - PB.cr * 2, 72), [K.circle(0, 0, PB.hub + 3, 36), ...holes], { mat: "plastic", angle: 45 });
  const tick = K.line(VB, [[(PB.r - 9) * Math.cos(turnDeg * rad), (PB.r - 9) * Math.sin(turnDeg * rad)], [(PB.r - 4) * Math.cos(turnDeg * rad), (PB.r - 4) * Math.sin(turnDeg * rad)]], "vis");
  return part(7, body + tick);
}
function bStatic() {
  const flangeRim = `<g data-part="7"><circle class="vis" cx="${r2(VB.p([0, 0])[0])}" cy="${r2(VB.p([0, 0])[1])}" r="${r2(PB.flange * VB.k)}"/></g>`;
  // the bracket plate behind the pulley (its near plate is cut away), with the guard pins
  const plate = X.hull([...K.circle(0, 0, 18, 16), ...PIN_AT.map(pinXY).flatMap(([x, y]) => K.circle(x, y, 7, 12)), [-30, 52], [30, 52]]);
  const bracket = part(8, K.body(VB, plate) + PIN_AT.map((a) => K.cut(VB, K.circle(...pinXY(a), 2.4, 16), { mat: "steel", angle: 135 })).join(""));
  // the bearing: outer and inner races cut, the bolt cut across, balls not hatched
  const bearing = part(7, X.cutHoles(VB, K.circle(0, 0, PB.hub + 3, 36), [K.circle(0, 0, PB.hub, 36)], { mat: "steel", angle: 45 }) + X.cutHoles(VB, K.circle(0, 0, 6.2, 24), [K.circle(0, 0, 2.4, 16)], { mat: "steel", angle: 135 }) + Array.from({ length: 8 }, (_, i) => K.body(VB, K.circle(8.6 * Math.cos(i * 45 * rad), 8.6 * Math.sin(i * 45 * rad), 2.2, 10))).join(""));
  const bolt = part(8, K.cut(VB, K.circle(0, 0, 2.4, 16), { mat: "steel", angle: 45 }));
  // the cable in the groove: down the left side, round the bottom, away to the right (90° of wrap)
  const cr = PB.r;
  const band = (pts, w) => X.cutHoles(VB, pts, [], { mat: "solid" });
  void band;
  const path = [[-cr, 64], ...K.arc(0, 0, cr, 180, 270, 12), [64, -cr]];
  const cable = part(16, `<path class="cable cable-b" d="${K.d(VB, path, false)}"/>`);
  return { flangeRim, bracket, bearing, bolt, cable, plate };
}

// ================================================================ DETAIL C: a turnbuckle, 1:1
const TB = { L: 64, od: 9.5, bore: 4.8, ins: 18, sleeve: 7.1, sleeveL: 26, fork: 0 };
function cStatic() {
  const h = TB.od / 2;
  const b = TB.bore / 2;
  const L2 = TB.L / 2;
  // barrel: half-section above the axis (cut, hatched), outside view below
  const barrelCut = K.cut(VC, [[-L2, b], [L2, b], [L2, h - 0.6], [L2 - 0.6, h], [-L2 + 0.6, h], [-L2, h - 0.6]], { mat: "brass", angle: 45 });
  const barrelOut = K.body(VC, [[-L2, -b], [L2, -b], [L2, -h + 0.6], [L2 - 0.6, -h], [-L2 + 0.6, -h], [-L2, -h + 0.6]]);
  const flats = K.lines(VC, [[[-L2 + 8, -h], [-L2 + 8, -b]], [[L2 - 8, -h], [L2 - 8, -b]], [[-3, -h], [-3, -b]], [[3, -h], [3, -b]]], "thin");
  const barrel = part(10, barrelCut + barrelOut + flats);
  // the two threaded terminals (RH left, LH right), not hatched; thread roots thin
  const term = (s) => {
    const x0 = s * (L2 - TB.ins);
    const x1 = s * (L2 + 3);
    const x2 = s * (L2 + 3 + 3);
    const x3 = s * (L2 + 6 + TB.sleeveL);
    const pts = [[x0, b], [x1, b], [x2, TB.sleeve / 2], [x3, TB.sleeve / 2], [x3 + s * 4, M.CABLE_D / 2 + 0.4], [x3 + s * 4, -M.CABLE_D / 2 - 0.4], [x3, -TB.sleeve / 2], [x2, -TB.sleeve / 2], [x1, -b], [x0, -b]];
    const roots = [[[x0, b - 0.55], [x1, b - 0.55]], [[x0, -b + 0.55], [x1, -b + 0.55]]];
    const hand = Array.from({ length: 8 }, (_, i) => {
      const xx = x0 + ((x1 - x0) * (i + 0.5)) / 8;
      return [[xx - s * 0.6, b], [xx + s * 0.6, -b]];
    });
    return K.body(VC, s > 0 ? pts.reverse() : pts) + K.lines(VC, roots, "thin") + K.lines(VC, hand, "thin");
  };
  // safety clips in the barrel's slots and the terminals' grooves (wire, blacked)
  const clip = (s) => K.cut(VC, [[s * 3, h + 0.4], [s * (L2 + 4), h + 0.4], [s * (L2 + 4), h + 1.3], [s * 3, h + 1.3]], { mat: "solid" });
  const ends = part(10, term(-1) + term(1) + clip(-1) + clip(1));
  // the cable each side, broken off
  const xc = L2 + 10 + TB.sleeveL;
  const cab = (s) => K.body(VC, s > 0 ? [[xc, -1.6], [xc + 26, -1.6], [xc + 26, 1.6], [xc, 1.6]] : [[-xc - 26, -1.6], [-xc, -1.6], [-xc, 1.6], [-xc - 26, 1.6]]);
  const cable = part(16, cab(-1) + cab(1) + X.freehand(VC, [[xc + 26, 3.5], [xc + 26, -3.5]], 0.4, 2) + X.freehand(VC, [[-xc - 26, 3.5], [-xc - 26, -3.5]], 0.4, 4));
  const axis = K.centerline(VC, [-xc - 30, 0], [xc + 30, 0], 0);
  return barrel + ends + cable + axis;
}

// ================================================================ SECTION D-D: the elevator at the actuator
const DB = M.ACT.bl;
const DLE = A.TAILPLANE.le + (A.TAILPLANE.tipLe - A.TAILPLANE.le) * (-DB / (A.TAILPLANE.span / 2));
const DTE = A.TAILPLANE.te + (A.TAILPLANE.tipTe - A.TAILPLANE.te) * (-DB / (A.TAILPLANE.span / 2));
const DC = DTE - DLE;
const XI_E = (A.TAILPLANE.hinge - DLE) / DC;
const yt12 = (x) => 0.6 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
const dd = (x, s) => [DLE + DC * x - A.TAILPLANE.hinge, s * DC * yt12(x)];
const TAB_U = M.TAB.fs - A.TAILPLANE.hinge; // the tab hinge, in the elevator's frame
const RNE = DC * yt12(XI_E) - 3;
export function elevatorLoop(x0, x1, nose) {
  const top = [];
  const bot = [];
  for (let i = 0; i <= 14; i++) {
    const x = x0 + ((x1 - x0) * i) / 14;
    top.push(dd(x, 1));
    bot.push(dd(x, -1));
  }
  return nose ? [...nose, ...bot, ...top.reverse()] : [...bot, ...top.reverse()];
}
const XI_T = (M.TAB.fs - DLE) / DC;
const ELEV = elevatorLoop(XI_E + 0.012, XI_T - 0.004, K.arc(0, 0, RNE, 90, 270, 10));
const TABL = elevatorLoop(XI_T + 0.004, 1, K.arc(TAB_U, 0, DC * yt12(XI_T) - 0.5, 90, 270, 6));
// the elevator and tab sections, for the 3D view (the strips beside the tab are the tab's section)
export const ELEV_LOOP = ELEV;
export const TAB_LOOP = TABL;
export const TE_STRIP = TABL;
const ACT = { drum: [30, M.ACT.v], r: M.ACT_DRUM_R, screw0: 44, screw1: 160, nut0: 136, nutL: 18, v: M.ACT.v };
export function dMoving(sol) {
  const dt = sol.tab;
  const z = M.nutFor(dt);
  // the nut runs forward for nose-up trim (tab TE down), pulling the rod and the horn
  const nx = ACT.nut0 - z;
  const nut = K.cut(VD, K.rect(nx, ACT.v - 7, nx + ACT.nutL, ACT.v + 7), { mat: "bronze", angle: 135 });
  const turnTab = (pts) => X.rot(pts, [TAB_U, 0], -dt);
  const horn = turnTab([[TAB_U + 2, -1], [TAB_U + 2, -M.TAB_HORN], [TAB_U - 6, -M.TAB_HORN], [TAB_U - 6, -2]]);
  const hornTip = turnTab([[TAB_U - 2, -M.TAB_HORN + 3]])[0];
  const rodFrom = [nx + ACT.nutL, ACT.v];
  const rod = K.body(VD, P.rodOutline2(rodFrom, hornTip, 2.4));
  // air loads, for the hinge moment: on the tab (its own lift) and the hinge moment as a curved arrow
  const H = sol.H;
  const lt = -(M.CH.t * dt * rad) * 600; // a sheet length ∝ the tab's lift
  const arrows = Math.abs(lt) > 3 ? X.arrow(VD, [TAB_U + 26, 0], [0, lt > 0 ? -1 : 1], Math.min(36, Math.abs(lt))) : "";
  const hm = Math.max(-1, Math.min(1, H / 12));
  const arc = Math.abs(hm) > 0.04 ? hingeArrow(hm) : "";
  return (
    part(29, X.skin(VD, turnTab(TABL), 1.4) + K.body(VD, horn)) +
    part(27, nut + K.lines(VD, [[[nx + 3, ACT.v - 7], [nx + 3, ACT.v + 7]], [[nx + 9, ACT.v - 7], [nx + 9, ACT.v + 7]]], "thin")) +
    part(28, rod + `<circle class="vis" cx="${r2(VD.p(hornTip)[0])}" cy="${r2(VD.p(hornTip)[1])}" r="${r2(1.6 * VD.k)}"/>`) +
    `<g data-role="label">${arrows}${arc}</g>`
  );
}
// the hinge moment as a curved arrow about the hinge: clockwise (TE down) for H > 0
function hingeArrow(hm) {
  const [cx, cy] = VD.p([0, 0]);
  const R = 30;
  const a0 = -60;
  const sweep = 120 * Math.abs(hm) + 20;
  const dir = hm > 0 ? 1 : -1; // + clockwise on the sheet (y down)
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const a = (a0 + dir * (sweep * i) / 12) * rad;
    pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
  }
  const [ex, ey] = pts[pts.length - 1];
  const [px, py] = pts[pts.length - 2];
  const l = Math.hypot(ex - px, ey - py) || 1;
  const ux = (ex - px) / l;
  const uy = (ey - py) / l;
  const head = `M${r2(ex + ux * 5)} ${r2(ey + uy * 5)}L${r2(ex - uy * 2.2)} ${r2(ey + ux * 2.2)}L${r2(ex + uy * 2.2)} ${r2(ey - ux * 2.2)}Z`;
  return `<path class="vis" d="M${pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join("L")}"/><path class="head" d="${head}"/>`;
}
function dStatic() {
  const elev = X.skin(VD, ELEV, 1.4);
  const spar = P.web(VD, [[8, RNE - 1], [8, -RNE + 1]], 1.4);
  const hingeBolt = part(19, K.body(VD, K.circle(0, 0, 3.2, 16)));
  // the actuator: drum and housing cut (hatched), the screw not hatched
  const drum = X.cutHoles(VD, K.circle(...ACT.drum, ACT.r, 36), [K.circle(...ACT.drum, 4, 16)], { mat: "alu", angle: 45 });
  const housing = K.cut(VD, [[ACT.screw0 - 2, ACT.v + 9], [ACT.screw1 + 6, ACT.v + 9], [ACT.screw1 + 6, ACT.v + 7.5], [ACT.screw0, ACT.v + 7.5], [ACT.screw0, ACT.v - 7.5], [ACT.screw1 + 6, ACT.v - 7.5], [ACT.screw1 + 6, ACT.v - 9], [ACT.screw0 - 2, ACT.v - 9]], { mat: "alu", angle: 135 });
  const screw = K.body(VD, K.rect(ACT.drum[0], ACT.v - M.SCREW.d / 2, ACT.screw1, ACT.v + M.SCREW.d / 2));
  const thread = K.lines(VD, [-1, 1].map((sg) => [[ACT.screw0, ACT.v + sg * (M.SCREW.d / 2 - 1.1)], [ACT.screw1, ACT.v + sg * (M.SCREW.d / 2 - 1.1)]]), "thin"); // the roots, thin
  // the trim cables on the drum (they come in along the hinge line, end-on here)
  const cab = part(26, [ACT.r + 1.2, -(ACT.r + 1.2)].map((dy) => K.body(VD, K.circle(ACT.drum[0], ACT.v + dy, 1.2, 10))).join(""));
  return part(19, elev + spar) + hingeBolt + part(27, housing + screw + thread + drum) + cab;
}

// ================================================================ DETAIL E: the cockpit, pictorial 1:10
const E_PARTS = new Set([1, 2, 3, 4, 5, 14, 15, 20, 24, 25]);
const E_PULLEYS = ["A1L", "A2L", "A1R", "A2R", "I1", "I2", "E1U", "E1D", "R1L", "R1R", "A3L"];
export function eAirframe() {
  const C = A.CABIN;
  const L = [];
  const ringPts = (fs, k = 4) => [[fs, -C.half, C.floor + 60], [fs, -C.half, C.roof - 40], [fs, C.half, C.roof - 40], [fs, C.half, C.floor + 60]];
  void ringPts;
  // the firewall, the floor, the panel and the door posts
  L.push([[0, -C.half, C.floor], [0, C.half, C.floor], [0, C.half, 1770], [0, -C.half, 1770], [0, -C.half, C.floor]]);
  L.push([[0, -C.half, C.floor], [900, -C.half, C.floor], [900, C.half, C.floor]]);
  L.push([[M.PANEL_FS, -C.half + 20, 1250], [M.PANEL_FS, C.half - 20, 1250], [M.PANEL_FS, C.half - 20, 1700], [M.PANEL_FS, -C.half + 20, 1700], [M.PANEL_FS, -C.half + 20, 1250]]);
  for (const s of [-1, 1]) L.push([[0, s * C.half, 1770], [650, s * C.half, C.roof - 40]], [[0, s * C.half, C.floor], [0, s * C.half, 1770]]);
  return `<g data-role="phantom">${L.map((p) => K.line(VE, P.toV(p, VE), "phan")).join("")}</g>`;
}
export function eMoving(pieces) {
  return pieces.filter((q) => E_PARTS.has(q.id)).map((q) => part(q.id, q.svg)).join("");
}
export const ePulleys = (planes) => P.pulleys(VE, planes.filter((w) => E_PULLEYS.includes(w.name)));

// ================================================================ DIAGRAMS
export const CH1 = { x0: 618, x1: 766, y0: 62, y1: 162, th: 90, d: 25 }; // aileron angle against wheel angle
export const CH2 = { x0: 618, x1: 766, y0: 236, y1: 336, v0: 50, v1: 160, f: 60 }; // stick force against airspeed
export const c1x = (th) => r2(CH1.x0 + ((th + CH1.th) / (2 * CH1.th)) * (CH1.x1 - CH1.x0));
export const c1y = (d) => r2((CH1.y0 + CH1.y1) / 2 - (d / CH1.d) * ((CH1.y1 - CH1.y0) / 2));
export const c2x = (v) => r2(CH2.x0 + ((Math.min(CH2.v1, Math.max(CH2.v0, v)) - CH2.v0) / (CH2.v1 - CH2.v0)) * (CH2.x1 - CH2.x0));
export const c2y = (f) => r2((CH2.y0 + CH2.y1) / 2 - (Math.max(-CH2.f, Math.min(CH2.f, f)) / CH2.f) * ((CH2.y1 - CH2.y0) / 2));
function chart1() {
  let grid = "";
  let lab = "";
  for (let th = -90; th <= 90; th += 30) {
    grid += `M${c1x(th)} ${CH1.y0}V${CH1.y1}`;
    lab += `<text class="t t-sm" x="${c1x(th)}" y="${CH1.y1 + 10}" text-anchor="middle">${th > 0 ? "+" : th < 0 ? "−" : ""}${Math.abs(th)}</text>`;
  }
  for (let d = -20; d <= 20; d += 10) {
    grid += `M${CH1.x0} ${c1y(d)}H${CH1.x1}`;
    lab += `<text class="t t-sm" x="${CH1.x0 - 4}" y="${r2(c1y(d) + 2.7)}" text-anchor="end">${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d)}</text>`;
  }
  const right = [];
  const left = [];
  const lin = [];
  for (let th = -M.WHEEL_MAX; th <= M.WHEEL_MAX + 1e-6; th += M.WHEEL_MAX / 40) {
    const r = M.roll(th);
    right.push(`${c1x(th)},${c1y(r.right)}`);
    left.push(`${c1x(th)},${c1y(r.left)}`);
  }
  const mean = (M.UP_MAX + M.DOWN_MAX) / 2;
  lin.push(`${c1x(-M.WHEEL_MAX)},${c1y(-mean)}`, `${c1x(M.WHEEL_MAX)},${c1y(mean)}`);
  lab += `<text class="t t-sm t-mute" x="${(CH1.x0 + CH1.x1) / 2}" y="${CH1.y1 + 21}" text-anchor="middle">WHEEL θ, ° (+ RIGHT)</text>`;
  lab += `<text class="t t-sm t-mute" x="${CH1.x0 - 20}" y="${(CH1.y0 + CH1.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH1.x0 - 20} ${(CH1.y0 + CH1.y1) / 2})">TE UP, °</text>`;
  lab += `<text class="t t-sm" x="${c1x(50)}" y="${r2(c1y(20) + 3)}" text-anchor="end">R</text><text class="t t-sm" x="${c1x(50)}" y="${r2(c1y(-11) + 9)}" text-anchor="end">L</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH1.x0}" y="${CH1.y0}" width="${CH1.x1 - CH1.x0}" height="${CH1.y1 - CH1.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline class="hid" points="${lin.join(" ")}"/>` +
    `<polyline class="vis" points="${right.join(" ")}"/><polyline class="vis" points="${left.join(" ")}"/>` +
    `<circle id="c1-r" class="accent-fill" cx="${c1x(0)}" cy="${c1y(0)}" r="2.6"/><circle id="c1-l" class="accent-fill" cx="${c1x(0)}" cy="${c1y(0)}" r="2.6"/>` +
    `<rect class="vis" x="${CH1.x0}" y="${CH1.y0}" width="${CH1.x1 - CH1.x0}" height="${CH1.y1 - CH1.y0}"/>` +
    lab +
    `</g>` +
    K.viewLabel((CH1.x0 + CH1.x1) / 2 - 8, 200, "DIAGRAM 1 · AILERONS", "R, L: EACH TE UP + · DASHED: EQUAL THROWS")
  );
}
export function forceCurve(tab) {
  const pts = [];
  for (let v = 56; v <= CH2.v1; v += 2) pts.push(`${c2x(v)},${c2y(M.forceAt(v, tab))}`);
  return pts.join(" ");
}
function chart2() {
  let grid = "";
  let lab = "";
  for (let v = 60; v <= 160; v += 20) {
    grid += `M${c2x(v)} ${CH2.y0}V${CH2.y1}`;
    lab += `<text class="t t-sm" x="${c2x(v)}" y="${CH2.y1 + 10}" text-anchor="middle">${v}</text>`;
  }
  for (let f = -60; f <= 60; f += 30) {
    grid += `M${CH2.x0} ${c2y(f)}H${CH2.x1}`;
    lab += `<text class="t t-sm" x="${CH2.x0 - 4}" y="${r2(c2y(f) + 2.7)}" text-anchor="end">${f > 0 ? "+" : f < 0 ? "−" : ""}${Math.abs(f)}</text>`;
  }
  const cruise = M.trimmed(M.V_CRUISE).tab;
  lab += `<text class="t t-sm t-mute" x="${(CH2.x0 + CH2.x1) / 2}" y="${CH2.y1 + 21}" text-anchor="middle">AIRSPEED V, kt</text>`;
  lab += `<text class="t t-sm t-mute" x="${CH2.x0 - 22}" y="${(CH2.y0 + CH2.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH2.x0 - 22} ${(CH2.y0 + CH2.y1) / 2})">PULL F, N</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH2.x0}" y="${CH2.y0}" width="${CH2.x1 - CH2.x0}" height="${CH2.y1 - CH2.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline class="hid" points="${forceCurve(M.TAB_LIMITS[0])}"/><polyline class="hid" points="${forceCurve(M.TAB_LIMITS[1])}"/>` +
    `<polyline class="vis" points="${forceCurve(cruise)}"/>` +
    `<polyline id="c2-now" class="vis accent" points="${forceCurve(cruise)}"/>` +
    `<circle id="c2-dot" class="accent-fill" cx="${c2x(110)}" cy="${c2y(0)}" r="2.8"/>` +
    `<rect class="vis" x="${CH2.x0}" y="${CH2.y0}" width="${CH2.x1 - CH2.x0}" height="${CH2.y1 - CH2.y0}"/>` +
    lab +
    `</g>` +
    K.viewLabel((CH2.x0 + CH2.x1) / 2 - 8, 374, "DIAGRAM 2 · STICK FORCE", "LEVEL FLIGHT · ACCENT: THE TAB NOW")
  );
}

// ================================================================ parts list, notes, title block
export const BOM = [
  ["1", "CONTROL WHEEL", "A356-T6 / ABS", "2"],
  ["2", "CONTROL COLUMN TUBE Ø31.8×1.6", "4130 STEEL", "2"],
  ["3", "COLUMN BEARING, PANEL", "BRONZE, PTFE LINED", "2"],
  ["4", "SPROCKET 12T 3/8 in, SPLINED SHAFT", "1045 STEEL", "2"],
  ["5", "ROLLER CHAIN 3/8 in, ANSI 35", "STEEL, BOUGHT OUT", "2"],
  ["6", "AILERON CABLE Ø3.2 7×19", "CRES 302/304", "4"],
  ["7", "PULLEY Ø76.2, BALL BEARING", "PHENOLIC", "24"],
  ["8", "PULLEY BRACKET, GUARD PINS", "2024-T3", "24"],
  ["9", "FAIRLEAD, SPLIT", "PTFE", "14"],
  ["10", "TURNBUCKLE MS21251, CLIPS", "BRASS / CRES", "7"],
  ["11", "AILERON BELLCRANK", "2024-T351", "2"],
  ["12", "AILERON PUSH-PULL ROD Ø12.7", "6061-T6", "2"],
  ["13", "AILERON WITH HORN", "2024-T3", "2"],
  ["14", "ELEVATOR PUSH TUBE", "6061-T6", "2"],
  ["15", "ELEVATOR IDLER ON CROSS SHAFT", "4130 STEEL", "1"],
  ["16", "ELEVATOR CABLE Ø3.2 7×19", "CRES 302/304", "2"],
  ["17", "ELEVATOR BELLCRANK", "2024-T351", "1"],
  ["18", "STOP BOLT AN3, JAM NUT", "STEEL, CAD PL.", "2"],
  ["19", "ELEVATOR", "2024-T3", "1"],
  ["20", "RUDDER PEDALS ON CROSS TUBES", "4130 / 2024-T3", "1 SET"],
  ["21", "RUDDER CABLE Ø3.2 7×19", "CRES 302/304", "2"],
  ["22", "RUDDER HORN", "4130 STEEL", "1"],
  ["23", "RUDDER", "2024-T3", "1"],
  ["24", "STEERING BUNGEE TO NOSE GEAR", "4130 / SPRING", "2"],
  ["25", "TRIM WHEEL, CABLE DRUM Ø60", "PA6-GF30 / 6061", "1"],
  ["26", "TRIM CABLE Ø2.4 7×19", "CRES 302/304", "1 LOOP"],
  ["27", "TRIM ACTUATOR, JACKSCREW Ø10×2", "STEEL, BRONZE NUT", "1"],
  ["28", "TRIM PUSH-PULL ROD", "CRES 304", "1"],
  ["29", "TRIM TAB", "2024-T3", "1"],
];
export const TBK = { x: 776, y: 708, w: 400, h: 116 };
const rowH = 12;
export const bomTop = TBK.y - (18 + BOM.length * rowH);
function bom() {
  return K.table(TBK.x, bomTop, [
    { w: 30, align: "center", title: "ITEM" },
    { w: 196, title: "DESCRIPTION" },
    { w: 128, title: "MATERIAL" },
    { w: 46, align: "center", title: "QTY" },
  ], BOM, { rowH });
}
function notes() {
  return K.notes(340, 676, "NOTES", [
    `CABLES Ø${M.CABLE_D} 7×19 CRES (TRIM Ø${M.TRIM_CABLE_D}) AT ${M.T_RIG} N (${M.T_BAND[0]}–${M.T_BAND[1]}), 21 °C; ${M.T_PER_C} N LESS PER °C COLDER.`,
    `STOPS: ELEVATOR ${M.ELEV_UP}° UP ${M.ELEV_DOWN}° DN, AILERONS ${M.UP_MAX}° UP ${M.DOWN_MAX}° DN, RUDDER ±${M.RUDDER_MAX}°, TAB ${-M.TAB_LIMITS[0]}° UP ${M.TAB_LIMITS[1]}° DN.`,
    `WHEEL ±${K.fmt(M.WHEEL_MAX, 1)}°: CABLE ±${K.fmt(M.S_AIL_MAX, 1)}, BELLCRANK ±${K.fmt(M.BETA_MAX, 1)}°, ROD ±${K.fmt(M.D_MAX, 1)}; HORN LEAN ${K.fmt(M.PSI0, 1)}° → ${M.UP_MAX}/${M.DOWN_MAX}°.`,
    `COLUMN +${Math.round(M.X_PULL)} / −${Math.round(-M.X_PUSH)}. TOE ±${Math.round(M.PED_MAX)}. TRIM WHEEL ${K.fmt(M.TRIM_TURNS[0], 1)} TO +${K.fmt(M.TRIM_TURNS[1], 1)} TURNS, NOSE UP +.`,
    `F = H·dδe/dx; H = q·S·c·(C_hα·α_t + C_hδ·δe + C_hδt·δt). THE TAB TRIMS WHEN H = 0.`,
    `SCREW LEAD ${K.fmt(M.LEAD_ANGLE, 1)}° < FRICTION ${K.fmt(M.FRICTION_ANGLE, 1)}°: SELF-LOCKING, THE AIR CANNOT TURN IT BACK.`,
    `GUARD PINS < ½ CABLE Ø OFF THE FLANGE. FAIRLEADS ≤ 3°. TURNBUCKLES ≤ 3 THREADS, CLIPPED.`,
  ], 12);
}
function title() {
  return K.titleBlock(TBK.x, TBK.y, TBK.w, TBK.h, [
    { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "PRIMARY FLIGHT CONTROLS", size: "lg" },
    { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-106", size: "lg" },
    { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "AS SHOWN" },
    { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
    { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
    { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
    { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-18" },
    { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
    { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
    { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · N · ° · kt" },
    { x: 0, y: 82, w: 400, h: 34, label: "LIVE · ← → WHEEL · ↑ ↓ COLUMN · Z X PEDALS · T G TRIM · SPACE: TOUR · S: SLOW", value: "", id: "readout" },
  ]);
}

// ================================================================ the whole of it
// a point in the middle of a thin skin: between point i of the loop and its inset partner
const midSkin = (loop, t, i) => {
  const q = X.inset(loop, t)[i];
  return [(loop[i][0] + q[0]) / 2, (loop[i][1] + q[1]) / 2];
};
const AIL_SKIN = midSkin(AIL, 2.2, 13 + 4); // on the lower skin, a third of the way aft
const ELEV_SKIN = midSkin(ELEV, 1.4, ELEV.length - 6); // on the upper skin, aft
const TAB_SKIN = midSkin(TABL, 1.4, TABL.length - 3);
// balloons in the flat views whose dots ride on moving parts (the page redraws them): circle, dot(sol)
export const LIVE = {
  11: { view: "AA", at: [46, 614], dot: (sol) => [T0[0] - M.ROD_L - sol.r.d + BREAK.gap - 12, T0[1]] },
  12: { view: "AA", at: [94, 614], dot: (sol) => {
    const [a, b] = aaRodA(sol);
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  } },
  13: { view: "AA", at: [216, 614], dot: (sol) => X.rot([AIL_SKIN], [0, 0], sol.r.right)[0] },
  29: { view: "D", at: [752, 614], dot: (sol) => X.rot([TAB_SKIN], [TAB_U, 0], -sol.tab)[0] },
  28: { view: "D", at: [706, 614], dot: (sol) => {
    const nx = ACT.nut0 - M.nutFor(sol.tab) + ACT.nutL;
    const tip = X.rot([[TAB_U - 2, -M.TAB_HORN + 3]], [TAB_U, 0], -sol.tab)[0];
    return [nx + (tip[0] - nx) * 0.5, ACT.v + (tip[1] - ACT.v) * 0.5];
  } },
};
export const liveBalloon = (n, sol) => K.balloon(V[LIVE[n].view], LIVE[n].dot(sol), LIVE[n].at, n, { target: n });
const liveGroups = (view, sol) => Object.keys(LIVE).filter((n) => LIVE[n].view === view).map((n) => `<g id="lb-${n}">${liveBalloon(n, sol)}</g>`).join("");
const pictGroups = (view, sol) => PICT.filter((b) => b.v === view).map((b) => (b.live ? `<g id="pb-${b.n}">${pictBalloon(b, sol)}</g>` : pictBalloon(b, sol))).join("");
// the live labels inside the details: the cable tensions at the turnbuckle, the tab and hinge moment
export function cLabel(sol) {
  const [x, y] = VC.p([-TB.L / 2 - 30, 9]);
  return `<text class="t t-sm" x="${r2(x)}" y="${r2(y)}">T UP ${Math.round(sol.T.up)} N · DOWN ${Math.round(sol.T.down)} N</text>`;
}
const sgn = (v) => (Math.abs(v) < 0.05 ? "0.0" : `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}`);
export function dLabel(sol) {
  const [x, y] = VD.p([70, 45]);
  const H = sol.H;
  return `<text class="t t-sm" x="${r2(x)}" y="${r2(y)}">TAB ${sgn(sol.tab)}° · HINGE MOMENT ${sgn(H)} N·m</text>`;
}

export function sheet(sol, ps, planes) {
  const runs = M.cables(ps, sol);
  const piecesM = P.controls(VM, sol, ps).sort((a, b) => b.d - a.d);
  const piecesE = P.controls(VE, sol, ps).sort((a, b) => b.d - a.d);
  const main =
    `<g data-geom="main">` +
    P.airframe(VM) +
    P.pulleys(VM, planes) +
    `<g id="mv-parts">${piecesM.map((q) => part(q.id, q.svg)).join("")}</g>` +
    `<g id="mv-cab">${P.cablePaths(VM, runs, "cab")}</g>` +
    `<g id="mv-tb">${P.turnbuckles(VM, runs)}</g>` +
    P.fairleads(VM, M.cables(REST.ps, M.solve(M.state()))) +
    `</g>` +
    pictGroups("main", sol) +
    K.viewLabel(150, 46, "PICTORIAL VIEW", "CONTROL RUNS IN THE AIRFRAME (PHANTOM) · NOT TO SCALE");
  const b = bStatic();
  const aa =
    `<g data-geom="AA" clip-path="url(#clip-AA)">${paperRect(BOX.AA)}${aaStatic()}<g id="aa-mv">${aaMoving(sol)}</g>${aaDims()}${K.centerline(VA, [-12, 0], [12, 0], 0)}${K.centerline(VA, [0, -12], [0, 12], 0)}</g>` +
    frameRect(BOX.AA) +
    liveGroups("AA", sol) +
    K.viewLabel(BOX.AA.x + BOX.AA.w / 2 + 40, 640, "SECTION A-A", "RIGHT AILERON AT ITS HORN, LOOKING OUTBOARD · 1:5");
  const bb =
    `<g data-geom="B" clip-path="url(#clip-B)">${paperRect(BOX.B)}${b.bracket}${b.flangeRim}<g id="b-rot">${bRotor(0)}</g>${b.bearing}${b.bolt}${b.cable}${K.centerline(VB, [-50, 0], [50, 0], 0)}${K.centerline(VB, [0, -50], [0, 50], 0)}</g>` +
    frameRect(BOX.B) +
    K.balloon(VB, [-8.6, 8.6], [BOX.B.x + 18, 614], 7, { target: 7 }) +
    K.balloon(VB, pinXY(PIN_AT[0]), [BOX.B.x + 44, 614], 8, { target: 8 }) +
    K.viewLabel(BOX.B.x + BOX.B.w / 2 + 14, 640, "DETAIL B", "PULLEY · 1:2");
  const cc =
    `<g data-geom="C" clip-path="url(#clip-C)">${paperRect(BOX.C)}${cStatic()}<g id="c-t">${cLabel(sol)}</g></g>` +
    frameRect(BOX.C) +
    K.balloon(VC, [-20, 4.2], [BOX.C.x + 16, BOX.C.y + BOX.C.h + 14], 10, { target: 10 }) +
    K.viewLabel(BOX.C.x + BOX.C.w / 2 + 16, BOX.C.y + BOX.C.h + 26, "DETAIL C", "TURNBUCKLE IN THE UP CABLE · RH / LH THREADS · 1:1");
  const ddd =
    `<g data-geom="D" clip-path="url(#clip-D)">${paperRect(BOX.D)}<g data-role="phantom">${K.line(VD, X.rot(TABL, [TAB_U, 0], -M.TAB_LIMITS[0]), "phan", true)}${K.line(VD, X.rot(TABL, [TAB_U, 0], -M.TAB_LIMITS[1]), "phan", true)}</g>${dStatic()}<g id="d-mv">${dMoving(sol)}</g><g id="d-t">${dLabel(sol)}</g>${K.centerline(VD, [-14, 0], [DC - (A.TAILPLANE.hinge - DLE) + 6, 0], 0)}</g>` +
    frameRect(BOX.D) +
    liveGroups("D", sol) +
    K.balloon(VD, [60, ACT.v + 8.25], [614, 614], 27, { target: 27 }) +
    K.balloon(VD, ELEV_SKIN, [660, 614], 19, { target: 19 }) +
    K.viewLabel(BOX.D.x + BOX.D.w / 2 - 30, 640, "SECTION D-D", "PORT ELEVATOR AT THE TRIM ACTUATOR, IN ITS OWN FRAME · 1:2.5");
  const ee =
    `<g data-geom="E" clip-path="url(#clip-E)">${paperRect(BOX.E)}${eAirframe()}${ePulleys(planes)}<g id="e-mv">${eMoving(piecesE)}</g><g id="e-cab">${P.cablePaths(VE, runs, "ecab")}</g></g>` +
    frameRect(BOX.E) +
    pictGroups("E", sol) +
    K.viewLabel(BOX.E.x + BOX.E.w / 2, BOX.E.y + BOX.E.h + 48, "DETAIL E", "THE COCKPIT FROM BEHIND · PICTORIAL · 1:10");
  return main + aa + bb + cc + ddd + ee + chart1() + chart2() + notes() + bom() + title();
}
