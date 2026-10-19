// Builds wing-flaps.html: a live A2 drawing of the electrically driven single-slotted flaps of a
// four-seat high-wing light aircraft: the wing cut through the inboard flap track, the slot and its
// air, the actuator in section, the drive linkage in plan, the cockpit selector with its follow-up,
// the circuit, and the aerodynamics (C_L against α by flap, stall speed by flap).
//   node examples/wing-flaps/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as A from "../light-aircraft/model.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as X from "./extra.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- the aircraft and this sheet agree
const same = (name, a, b, tol = 1e-9) => {
  if (Math.abs(a - b) > tol) throw new Error(`${name}: BP-022 has ${a}, this sheet ${b}`);
};
same("root chord", A.ROOT_CHORD, M.ROOT_CHORD);
same("hinge line", A.HINGE_X, M.HINGE_X);
same("flap span", A.FLAP_WS[0] + A.FLAP_WS[1], M.FLAP_WS[0] + M.FLAP_WS[1]);
same("wing area", A.S, M.S);
same("weight", A.W, M.W);
for (const f of A.FLAP_STOPS) {
  same(`C_L,max ${f}°`, A.CLMAX[f], M.CLMAX[f]);
  same(`ΔC_L ${f}°`, A.DCL_FLAP[f], M.DCL_FLAP[f]);
  same(`V_S ${f}°`, A.stallSpeed(f), M.stallSpeed(f), 1e-6);
}
same("V_FE", A.V_SPEEDS.vfe, M.V_FE);
for (const v of [55, 60, 70]) for (const f of [0, 10, 20, 30]) same(`α ${v} kt ${f}°`, A.flight(v, f, 0).alphaWing, M.flight(v, f).alpha, 0.01);

// ---------------------------------------------------------------- views
const k5 = 0.2 * K.PX_PER_MM;
const k2 = 0.5 * K.PX_PER_MM;
const k25 = 0.4 * K.PX_PER_MM;
const k10 = 0.1 * K.PX_PER_MM;
const B = { cx: 548, cy: 136, r: 92, wx: 1268, wy: -6 }; // Section B-B: a circle round world (wx, wy)
const VIEWS = {
  A: { x: K.r2(40 + 1722 * k5), y: 104, scale: 0.2 },
  B: { x: K.r2(B.cx + B.wx * k25), y: K.r2(B.cy + B.wy * k25), scale: 0.4 },
  C: { x: K.r2(46 + 26 * k25), y: K.r2(300 + 112 * k25), scale: 0.4 },
  P: { x: 250, y: K.r2(520 - 820 * k10), scale: 0.1 },
  D: { x: 620, y: 368, scale: 0.5 },
};
const VA = K.view(VIEWS.A);
const VB = K.view(VIEWS.B);
const VC = K.view(VIEWS.C);
const VP = K.view(VIEWS.P);
const VD = K.view(VIEWS.D);
const S0 = 0; // drawn with the flaps up; the page moves them
const wrap = (id, inner = "") => `<g id="${id}">${inner}</g>`;
const sec = P.sec;

// ---------------------------------------------------------------- SECTION A-A, 1:5
// The section's layers, far to near: the wing box's inside (the root rib), the actuator end on, the
// bellcrank edge on, the notch's rib face (the flap's nose), the lug, the rod, the bracket's far
// cheek, then the cut faces: the flap's aft part, the track, the rollers, the skins and the spar.
function sectionLayers(V, pre) {
  return (
    P.boxBehind(V) +
    wrap(`${pre}-act`, P.actuatorEnd(V, S0)) +
    P.pivotEdge(V) +
    wrap(`${pre}-bc`, P.bellcrankEdge(V, S0)) +
    wrap(`${pre}-nose`, P.flapNose(V, S0)) +
    wrap(`${pre}-lug`, P.lug(V, S0)) +
    wrap(`${pre}-rod`, P.rodSection(V, S0)) +
    wrap(`${pre}-bracket`, P.bracket(V, S0)) +
    wrap(`${pre}-aft`, P.flapAft(V, S0)) +
    P.track(V) +
    wrap(`${pre}-rollers`, P.rollers(V, S0)) +
    P.lowerSkin(V) +
    P.upperSkin(V) +
    P.spar(V)
  );
}
const TE_PATH = Array.from({ length: 31 }, (_, i) => M.geometry(M.sOfFlap(i)).te);
const chordY = 0;
const sectionA =
  `<g data-geom="A">` +
  sectionLayers(VA, "a") +
  P.sectionBreak(VA) +
  P.slotCentre(VA) +
  `<path class="ctr" d="${K.d(VA, sec([[X_LINE0(), chordY], [1745, chordY]]), false)}"/>` +
  `<path class="ctr" d="${K.d(VA, sec(TE_PATH), false)}"/>` +
  `</g>` +
  `<g data-role="phantom">${K.line(VA, sec(P.flapOutlineAt(M.S_MAX)), "phan", true)}</g>` +
  `<g data-role="fluid" id="a-flow"></g>`;
function X_LINE0() {
  return 1440;
}
// live: the trailing edge's travel aft (Fowler) and the flap's angle
const TE0 = M.geometry(0).te;
const DIM_TE_Y = 234;
function dimFowler(V, s) {
  const g = M.geometry(s);
  if (g.te[0] - TE0[0] < 1) return "";
  return K.dim(V, sec([TE0])[0], sec([g.te])[0], { dir: "h", off: DIM_TE_Y - V.p(sec([TE0])[0])[1], text: `${Math.round(g.te[0] - TE0[0])}`, id: "dim-te" });
}
function dimAngle(V, s) {
  const g = M.geometry(s);
  if (g.flap < 1) return "";
  const n = M.place(M.NOSE_C, g.P);
  return X.angleDim(V, sec([n])[0], 84, 180, 180 + g.flap, `${K.fmt(g.flap, 1)}°`, { id: "dim-ang" });
}
// static dimensions: the flap's chord, the slot's radius
const dimsA =
  K.dim(VA, sec([[M.FLAP.te, 0]])[0], sec([[M.FLAP.nose, 0]])[0], { dir: "h", off: 60 - VA.p(sec([[M.FLAP.te, 0]])[0])[1] }) +
  `<g id="a-dyn">${dimFowler(VA, S0)}${dimAngle(VA, S0)}</g>`;
// balloons: static ones in a row above and to the right; moving ones (flap, bracket, rollers, lug,
// rod, bellcrank) re-drawn each frame with their dots on their parts
const LIVE_A = {
  4: { at: [134, 214] },
  6: { at: [208, 214] },
  7: { at: [232, 214] },
  8: { at: [196, 36] },
  9: { at: [222, 36] },
  10: { at: [356, 36] },
};
const balloonsA =
  K.balloon(VA, sec([[M.SPAR.aft - 0.8, 60]])[0], [262, 36], 1, { target: 1 }) +
  K.balloon(VA, sec([[1060, M.up(1060) - 0.4]])[0], [306, 36], 2, { target: 2 }) +
  K.balloon(VA, sec([[960, M.lo(960) + 0.5]])[0], [428, 150], 3, { target: 3 }) +
  K.balloon(VA, sec([[1352, -118]])[0], [170, 214], 5, { target: 5 }) +
  K.balloon(VA, sec([[M.BC.x, M.BC.y - 22]])[0], [428, 126], 11, { target: 11 }) +
  Object.keys(LIVE_A).map((n) => wrap(`lb-${n}`)).join("");
const labelA = K.viewLabel(220, 258, "SECTION A-A", "STARBOARD WING, INBOARD TRACK, WS 760, LOOKING INBOARD · 1:5");

// ---------------------------------------------------------------- DETAIL B: the slot, 1:2
const detailB =
  `<g data-geom="B" clip-path="url(#clip-B)"><circle class="paper" cx="${B.cx}" cy="${B.cy}" r="${B.r}"/>` +
  wrap("b-flap", P.flapFull(VB, S0)) +
  P.sectionBetween(VB) +
  `<g id="b-dyn"></g>` +
  `</g>` +
  `<g clip-path="url(#clip-B)"><g data-role="fluid" id="b-flow"></g><g data-role="phantom">${K.line(VB, sec(P.flapOutlineAt(M.S_MAX)), "phan", true)}</g></g>` +
  `<circle class="thin" cx="${B.cx}" cy="${B.cy}" r="${B.r}"/>` +
  K.viewLabel(B.cx, 246, "SECTION B-B", "BETWEEN THE TRACKS, WS 860 · THE SLOT · 1:2.5");
const markB = "";

// ---------------------------------------------------------------- SECTION C-C: the actuator, 1:2.5
const act = P.act;
const L0 = M.LEN0;
const sectionC =
  `<g data-geom="C">` +
  P.actMount(VC) +
  P.actHousing(VC) +
  P.actGears(VC) +
  P.actShafts(VC) +
  P.actBearings(VC) +
  P.actMotor(VC) +
  wrap("c-screw", P.actScrew(VC, 0)) +
  P.actTube(VC) +
  wrap("c-nut", P.actNut(VC, 0)) +
  wrap("c-rod", P.actRod(VC, 0, L0)) +
  wrap("c-sw", P.actSwitches(VC, 0)) +
  K.centerline(VC, act([[-30, 0]])[0], act([[490, 0]])[0], 0) +
  K.centerline(VC, act([[30, M.Q_IDLER]])[0], act([[70, M.Q_IDLER]])[0], 0) +
  K.centerline(VC, act([[36, -M.QM]])[0], act([[180, -M.QM]])[0], 0) +
  `</g>` +
  `<g data-role="phantom">${K.line(VC, act(K.circle(L0 + M.NUT_MAX, 0, 12, 24)), "phan", true)}</g>`;
const DIM_C_Y = 434;
function dimStroke(V, n) {
  if (n < 2) return "";
  return K.dim(V, act([[L0, 0]])[0], act([[L0 + n, 0]])[0], { dir: "h", off: DIM_C_Y - V.p(act([[L0, 0]])[0])[1], text: `${K.fmt(n, 1)}`, id: "dim-stroke" });
}
const dimsC =
  K.dim(VC, act([[0, 0]])[0], act([[L0, 0]])[0], { dir: "h", off: DIM_C_Y + 12 - VC.p(act([[0, 0]])[0])[1] }) +
  `<g id="c-dyn"></g>`;
const balloonsC =
  K.balloon(VC, act([[-19, -14]])[0], [52, 300], 23, { target: 23 }) +
  K.balloon(VC, act([[17, -95]])[0], [76, 284], 15, { target: 15 }) +
  K.balloon(VC, act([[45, M.Q_IDLER - 20]])[0], [100, 284], 16, { target: 16 }) +
  K.balloon(VC, act([[120, -M.QM - 23.5]])[0], [168, 284], 14, { target: 14 }) +
  K.balloon(VC, act([[58, 10]])[0], [124, 284], 21, { target: 21 }) +
  K.balloon(VC, act([[180, -15]])[0], [236, 284], 20, { target: 20 }) +
  K.balloon(VC, act([[244, 0]])[0], [284, 284], 17, { target: 17 }) +
  wrap("lb-18") +
  wrap("lb-19") +
  K.balloon(VC, act([[240, 32]])[0], [252, 458], 22, { target: 22 });
const LIVE_C = { 18: { at: [140, 458] }, 19: { at: [420, 346] } };
const labelC = K.viewLabel(250, 476, "ACTUATOR · AXIAL SECTION", "ON THE SCREW, IDLER AND MOTOR AXES, FROM ABOVE · 1:2.5");

// ---------------------------------------------------------------- PLAN: the drive, 1:10
const pv = P.pln;
const planView =
  `<g data-geom="P">` +
  P.planFixed(VP) +
  P.planTracks(VP) +
  wrap("p-flap", P.planFlap(VP, S0, 1) + P.planFlap(VP, S0, -1)) +
  wrap("p-rods", P.planRod(VP, S0, 1) + P.planRod(VP, S0, -1) + P.planLug(VP, S0, 1) + P.planLug(VP, S0, -1)) +
  P.planSpar(VP) +
  wrap("p-act", P.planActuator(VP, S0)) +
  wrap("p-bc", P.planBellcrank(VP, M.betaOf(S0), 1) + P.planBellcrank(VP, M.betaOf(S0), -1)) +
  wrap("p-cables", P.planCables(VP, S0) + P.planFollowUp(VP, S0)) +
  P.planBreaks(VP) +
  K.centerline(VP, pv([[P.PLAN.x0 - 8, 0]])[0], pv([[P.PLAN.x1 + 8, 0]])[0], 0) +
  `</g>`;
const marksP =
  X.cuttingPlane(VP, pv([[P.PLAN.x0 - 14, 760]])[0], pv([[P.PLAN.x1 + 14, 760]])[0], [-1, 0], "A") +
  X.cuttingPlane(VP, pv([[P.PLAN.x0 - 14, 860]])[0], pv([[P.PLAN.x1 + 14, 860]])[0], [-1, 0], "B");
const balloonsP = wrap("lb-12") + wrap("lb-13");
const LIVE_P = { 12: { at: [50, 580], w: -330 }, 13: { at: [450, 548], w: 330 } };
const labelP = K.viewLabel(250, 676, "PLAN", "THE DRIVE, UPPER SKIN AND SHROUD REMOVED · NOSE UP · STARBOARD RIGHT · 1:10");

// ---------------------------------------------------------------- VIEW D: the selector, 1:2.5
const viewD =
  `<g data-geom="D">` +
  P.selScale(VD) +
  wrap("d-carrier", P.selCarrier(VD, 0)) +
  wrap("d-cable", P.selCable(VD, 0)) +
  wrap("d-spring", P.selSpring(VD, 0)) +
  wrap("d-sw", P.selSwitches(VD, 0, M.leverOf(0))) +
  P.selDetent(VD) +
  wrap("d-lever", P.selLever(VD, M.leverOf(0))) +
  P.selPanel(VD) +
  P.selBreaker(VD) +
  `</g>` +
  P.selScaleText(VD);
const balloonsD = wrap("lb-24") + K.balloon(VD, [30, -42], [790, 300], 25, { target: 25 }) + K.balloon(VD, [-60, -77], [490, 470], 26, { target: 26 });
const LIVE_D = { 24: { at: [490, 282] } };
const labelD = K.viewLabel(640, 496, "VIEW D", "FLAP SELECTOR, COVER OFF, FROM THE RIGHT · 1:2");

// ---------------------------------------------------------------- DIAGRAM 1: C_L against α by flap
const CH = { x0: 690, x1: 890, y0: 48, y1: 190, a0: -4, a1: 22, c0: 0, c1: 2 };
const cx = (a) => K.r2(CH.x0 + ((a - CH.a0) / (CH.a1 - CH.a0)) * (CH.x1 - CH.x0));
const cy = (c) => K.r2(CH.y1 - ((Math.max(CH.c0, Math.min(CH.c1, c)) - CH.c0) / (CH.c1 - CH.c0)) * (CH.y1 - CH.y0));
const curvePts = (f) => {
  const out = [];
  for (let a = CH.a0; a <= Math.min(CH.a1, M.alphaPeak(f) + 4.5); a += 0.25) out.push(`${cx(a)},${cy(M.clCurve(a, f))}`);
  return out.join(" ");
};
function chartCL() {
  let grid = "";
  let labels = "";
  for (let c = 0; c <= CH.c1 + 1e-9; c += 0.5) {
    grid += `M${CH.x0} ${cy(c)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 4}" y="${K.r2(cy(c) + 2.7)}" text-anchor="end">${c.toFixed(1)}</text>`;
  }
  for (let a = 0; a <= CH.a1; a += 5) {
    grid += `M${cx(a)} ${CH.y0}V${CH.y1}`;
    labels += `<text class="t t-sm" x="${cx(a)}" y="${CH.y1 + 10}" text-anchor="middle">${a}</text>`;
  }
  let curves = "";
  for (const f of M.FLAP_STOPS) {
    curves += `<polyline class="thin" points="${curvePts(f)}"/>`;
    const ap = M.alphaPeak(f);
    const [x, y] = [cx(ap), cy(M.clmax(f))];
    curves += `<circle class="dot" cx="${x}" cy="${y}" r="1.6"/>`;
    labels += `<text class="t t-sm" x="${K.r2(cx(0.5) - 3)}" y="${K.r2(cy(M.clCurve(0.5, f)) - 2)}" text-anchor="end">${f}°</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 21}" text-anchor="middle">WING ANGLE OF ATTACK α, °</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x0 - 22}" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH.x0 - 22} ${(CH.y0 + CH.y1) / 2})">LIFT COEFFICIENT C_L</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    curves +
    `<path id="cl-need" class="hid" d="M${CH.x0} ${CH.y1}H${CH.x1}"/>` +
    `<polyline id="cl-cur" class="vis accent" points="${curvePts(0)}"/>` +
    `<circle id="cl-dot" class="accent-fill" cx="${CH.x0}" cy="${CH.y1}" r="3"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 228, "DIAGRAM 1 · C_L AGAINST α", "THIN: 0/10/20/30° · ACCENT: NOW · DASHED: C_L NEEDED")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: stall speed by flap
const CV = { x0: 948, x1: 1150, y0: 48, y1: 190, f1: 30, v0: 40, v1: 80 };
const vx = (f) => K.r2(CV.x0 + (f / CV.f1) * (CV.x1 - CV.x0));
const vy = (v) => K.r2(CV.y1 - ((Math.max(CV.v0, Math.min(CV.v1, v)) - CV.v0) / (CV.v1 - CV.v0)) * (CV.y1 - CV.y0));
function chartVs() {
  let grid = "";
  let labels = "";
  for (let v = CV.v0; v <= CV.v1; v += 10) {
    grid += `M${CV.x0} ${vy(v)}H${CV.x1}`;
    labels += `<text class="t t-sm" x="${CV.x0 - 4}" y="${K.r2(vy(v) + 2.7)}" text-anchor="end">${v}</text>`;
  }
  for (const f of M.FLAP_STOPS) {
    grid += `M${vx(f)} ${CV.y0}V${CV.y1}`;
    labels += `<text class="t t-sm" x="${vx(f)}" y="${CV.y1 + 10}" text-anchor="middle">${f}</text>`;
  }
  const vs = [];
  const vref = [];
  for (let f = 0; f <= 30; f += 0.5) {
    vs.push(`${vx(f)},${vy(M.stallSpeed(f))}`);
    vref.push(`${vx(f)},${vy(1.3 * M.stallSpeed(f))}`);
  }
  let dots = "";
  for (const f of M.FLAP_STOPS) dots += `<circle class="dot" cx="${vx(f)}" cy="${vy(M.VS_PUBLISHED[f])}" r="1.8"/>`;
  labels += `<text class="t t-sm" x="${vx(1)}" y="${K.r2(vy(M.stallSpeed(0)) - 4)}">V_S</text>`;
  labels += `<text class="t t-sm" x="${vx(1)}" y="${K.r2(vy(1.3 * M.stallSpeed(0)) - 4)}">1.3 V_S</text>`;
  labels += `<text class="t t-sm t-mute" x="${(CV.x0 + CV.x1) / 2}" y="${CV.y1 + 21}" text-anchor="middle">FLAP δ, °</text>`;
  labels += `<text class="t t-sm t-mute" x="${CV.x0 - 22}" y="${(CV.y0 + CV.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CV.x0 - 22} ${(CV.y0 + CV.y1) / 2})">AIRSPEED, kt CAS</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CV.x0}" y="${CV.y0}" width="${CV.x1 - CV.x0}" height="${CV.y1 - CV.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline class="vis" points="${vs.join(" ")}"/><polyline class="hid" points="${vref.join(" ")}"/>` +
    dots +
    `<path id="vs-v" class="thin" d="M${CV.x0} ${vy(60)}H${CV.x1}"/>` +
    `<circle id="vs-dot" class="accent-fill" cx="${vx(0)}" cy="${vy(M.stallSpeed(0))}" r="3"/>` +
    `<text id="vs-vt" class="t t-sm" x="${CV.x1 - 3}" y="${vy(60) - 3}" text-anchor="end">60 kt</text>` +
    `<rect class="vis" x="${CV.x0}" y="${CV.y0}" width="${CV.x1 - CV.x0}" height="${CV.y1 - CV.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CV.x0 + CV.x1) / 2, 228, "DIAGRAM 2 · STALL SPEED", `${M.MTOW} kg, POWER OFF · DOTS: PUBLISHED · THIN: NOW`)
  );
}

// ---------------------------------------------------------------- DIAGRAM 3: what the nut's travel does
const CK = { x0: 524, x1: 812, y0: 540, y1: 700, n1: 135, y1v: 35, c1: 7 };
const kx = (n) => K.r2(CK.x0 + (Math.max(0, Math.min(CK.n1, n)) / CK.n1) * (CK.x1 - CK.x0));
const ky = (v) => K.r2(CK.y1 - (Math.max(0, Math.min(CK.y1v, v)) / CK.y1v) * (CK.y1 - CK.y0));
const kc = (pc) => K.r2(CK.y1 - (Math.max(0, Math.min(CK.c1, pc)) / CK.c1) * (CK.y1 - CK.y0));
const KIN = [];
for (let n = 0; n <= M.NUT_MAX + 1e-6; n += 1) {
  const s = M.sOfNut(n);
  const g = M.geometry(s);
  KIN.push([n, g.flap, g.gap, (100 * (g.chord - M.C)) / M.C]);
}
function chartKin() {
  let grid = "";
  let labels = "";
  for (let v = 0; v <= CK.y1v; v += 5) {
    grid += `M${CK.x0} ${ky(v)}H${CK.x1}`;
    if (v % 10 === 0) labels += `<text class="t t-sm" x="${CK.x0 - 4}" y="${K.r2(ky(v) + 2.7)}" text-anchor="end">${v}</text>`;
  }
  for (let c = 0; c <= CK.c1; c += 2) labels += `<text class="t t-sm" x="${CK.x1 + 4}" y="${K.r2(kc(c) + 2.7)}" text-anchor="start">${c}</text>`;
  for (let n = 0; n <= CK.n1; n += 20) {
    grid += `M${kx(n)} ${CK.y0}V${CK.y1}`;
    if (n % 40 === 0) labels += `<text class="t t-sm" x="${kx(n)}" y="${CK.y1 + 10}" text-anchor="middle">${n}</text>`;
  }
  const line = (i, f) => KIN.map((r) => `${kx(r[0])},${f(r[i])}`).join(" ");
  let stops = "";
  for (const f of [10, 20, 30]) {
    const n = M.nutOf(M.sOfFlap(f));
    stops += `<path class="thin" d="M${kx(n)} ${ky(f)}V${CK.y1}"/>`;
  }
  labels += `<text class="t t-sm" x="${kx(84)}" y="${K.r2(ky(16) - 3)}" text-anchor="end">δ, °</text>`;
  labels += `<text class="t t-sm" x="${kx(96)}" y="${K.r2(ky(8) + 9)}" text-anchor="start">GAP, mm</text>`;
  labels += `<text class="t t-sm" x="${kx(30)}" y="${K.r2(kc(3.6) - 4)}" text-anchor="middle">Δc, %</text>`;
  labels += `<text class="t t-sm t-mute" x="${(CK.x0 + CK.x1) / 2}" y="${CK.y1 + 21}" text-anchor="middle">NUT TRAVEL n, mm</text>`;
  labels += `<text class="t t-sm t-mute" x="${CK.x0 - 20}" y="${(CK.y0 + CK.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CK.x0 - 20} ${(CK.y0 + CK.y1) / 2})">δ, ° · GAP, mm</text>`;
  labels += `<text class="t t-sm t-mute" x="${CK.x1 + 20}" y="${(CK.y0 + CK.y1) / 2}" text-anchor="middle" transform="rotate(90 ${CK.x1 + 20} ${(CK.y0 + CK.y1) / 2})">CHORD GAIN Δc, %</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CK.x0}" y="${CK.y0}" width="${CK.x1 - CK.x0}" height="${CK.y1 - CK.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    stops +
    `<polyline class="vis" points="${line(1, ky)}"/><polyline class="thin" points="${line(2, ky)}"/><polyline class="hid" points="${line(3, kc)}"/>` +
    `<path id="k-cur" class="thin" d="M${kx(0)} ${CK.y0}V${CK.y1}"/>` +
    `<circle id="k-dot" class="accent-fill" cx="${kx(0)}" cy="${ky(0)}" r="3"/>` +
    `<rect class="vis" x="${CK.x0}" y="${CK.y0}" width="${CK.x1 - CK.x0}" height="${CK.y1 - CK.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CK.x0 + CK.x1) / 2, 738, "DIAGRAM 3 · THE TRACK'S WORK", "THICK: FLAP δ · THIN: SLOT GAP · DASHED: CHORD GAIN · ACCENT: NOW")
  );
}

// ---------------------------------------------------------------- DIAGRAM 4: the circuit
const EC = { x: 92, y: 712 };
function circuit() {
  const x = EC.x;
  const y = EC.y;
  const yd = y + 6; // the DOWN branch
  const yu = y + 54; // the UP branch
  let out = "";
  // the bus and the breaker, then the two branches
  out += `<path class="vis" d="M${x} ${y - 4}V${y + 64}"/>`;
  out += `<text class="t t-sm" x="${x - 4}" y="${y + 33}" text-anchor="end">28 V</text>`;
  out += `<path class="vis" d="M${x} ${y + 30}H${x + 14}M${x + 34} ${y + 30}H${x + 44}M${x + 44} ${yd}V${yu}M${x + 44} ${yd}H${x + 66}M${x + 44} ${yu}H${x + 66}"/>`;
  out += `<rect class="vis" x="${x + 14}" y="${y + 25}" width="20" height="10"/><path class="thin" d="M${x + 14} ${y + 30}H${x + 34}"/>`;
  out += `<text class="t t-sm" x="${x + 24}" y="${y + 47}" text-anchor="middle">CB</text>`;
  out += `<g id="e-dn">${P.circuitBranchH(x + 66, yd, 1, true, false)}</g><g id="e-up">${P.circuitBranchH(x + 66, yu, -1, true, false)}</g>`;
  out += `<text class="t t-sm" x="${x + 78}" y="${yd - 5}" text-anchor="middle">DN LIMIT</text><text class="t t-sm" x="${x + 78}" y="${yu + 13}" text-anchor="middle">UP LIMIT</text>`;
  out += `<text class="t t-sm" x="${x + 134}" y="${yd - 5}" text-anchor="middle">DN SW</text><text class="t t-sm" x="${x + 134}" y="${yu + 13}" text-anchor="middle">UP SW</text>`;
  // the ground bar between the branches, the motor across their ends
  out += `<path class="vis" d="M${x + 128} ${y + 30}H${x + 164}M${x + 164} ${y + 24}V${y + 36}M${x + 167} ${y + 26}V${y + 34}M${x + 170} ${y + 28}V${y + 32}"/>`;
  out += `<path class="vis" d="M${x + 150} ${yd}H${x + 214}V${y + 19}M${x + 150} ${yu}H${x + 214}V${y + 41}"/>`;
  out += `<circle class="vis" cx="${x + 214}" cy="${y + 30}" r="11"/><text class="t t-sm" x="${x + 214}" y="${y + 33}" text-anchor="middle">M</text>`;
  out += `<text class="t t-sm" x="${x + 232}" y="${y + 33}" id="e-run">STOPPED</text>`;
  return `<g data-role="chart">${out}</g>` + K.viewLabel(x + 160, 794, "DIAGRAM 4 · CIRCUIT", "AT REST BOTH MOTOR LEADS ARE GROUNDED: A DYNAMIC BRAKE");
}
// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "REAR SPAR, CHANNEL 1.6", "2024-T3", "2"],
  ["2", "UPPER SKIN AND SHROUD 0.8", "2024-T3 ALCLAD", "2"],
  ["3", "LOWER SKIN AND COVE PANEL 0.6", "2024-T3 ALCLAD", "2"],
  ["4", "FLAP, SINGLE-SLOTTED, CHORD 442", "2024-T3", "2"],
  ["5", "FLAP TRACK, ONE SLOT, 6.35 PLATE", "4130 STEEL", "4"],
  ["6", "ROLLER BRACKET, TWO CHEEKS", "2024-T4", "4"],
  ["7", "TRACK ROLLER Ø22 ON AN4 BOLT", "52100 / STEEL", "8"],
  ["8", "DRIVE LUG ON THE NOTCH RIB", "2024-T4", "2"],
  ["9", "PUSH-PULL ROD Ø12.7, ROD ENDS", "4130 STEEL", "2"],
  ["10", "BELLCRANK, 6.35 PLATE", "7075-T6", "2"],
  ["11", "BELLCRANK BOLT AN5, BRACKETS", "STEEL / 2024-T4", "2"],
  ["12", "INTERCONNECT CABLE 1/8 7×19", "GALV. STEEL", "2"],
  ["13", "FOLLOW-UP CABLE 1/16 7×7", "GALV. STEEL", "1"],
  ["14", "FLAP MOTOR 28 V DC, PM", "BOUGHT OUT", "1"],
  ["15", "GEARBOX HOUSING", "A356-T6", "1"],
  ["16", "SPUR GEARS m1 12/60, 14/70", "4140 STEEL", "1 SET"],
  ["17", "JACKSCREW Tr16×4", "4140 STEEL", "1"],
  ["18", "NUT AND STRIKER KEY", "C93200 BRONZE", "1"],
  ["19", "ACTUATING TUBE Ø22×2, ROD END", "4130 STEEL", "1"],
  ["20", "HOUSING TUBE Ø32×2, BUSH", "6061-T6 / BRONZE", "1"],
  ["21", "BALL BEARINGS, 7200 PAIR + 3", "52100", "1 SET"],
  ["22", "LIMIT SWITCH, UP AND DOWN", "BOUGHT OUT", "2"],
  ["23", "ACTUATOR MOUNT BRACKET, PIN", "4130 STEEL", "1"],
  ["24", "SELECTOR LEVER, DETENT, SCALE", "2024-T4 / PC", "1"],
  ["25", "SWITCH CARRIER, SWITCHES, SPRING", "2024-T4 / B.O.", "1"],
  ["26", "CIRCUIT BREAKER 10 A", "BOUGHT OUT", "1"],
];
const TB = { x: 850, w: 326, h: 140 };
TB.y = 824 - TB.h;
const rowH = 11;
const bomTop = TB.y - (18 + BOM.length * rowH);
const bom = K.table(TB.x, bomTop, [
  { w: 26, align: "center", title: "ITEM" },
  { w: 168, title: "DESCRIPTION" },
  { w: 98, title: "MATERIAL" },
  { w: 34, align: "center", title: "QTY" },
], BOM, { rowH });

const g30 = M.geometry(M.S_MAX);
const t030 = (() => {
  const st = M.system(30, 0);
  st.v = 60;
  let t = 0;
  while (st.n < M.NUT_MAX - 0.05 && t < 40) {
    M.step(st, 1 / 480);
    t += 1 / 480;
  }
  return t;
})();
const notes = K.notes(860, 264, "NOTES", [
  `FLAP CHORD ${Math.round(M.FLAP_CHORD)}: ${Math.round((100 * M.FLAP_CHORD) / M.C)}–${Math.round((100 * M.FLAP_CHORD) / M.chordAt(M.FLAP_WS[1]))} % c. TWO TRACKS A FLAP. PORT OPPOSITE HAND.`,
  `TRACK SLOT: STRAIGHT ${M.SLOT.ls} AT ${-M.SLOT.th0}°, THEN R${M.SLOT.rho}; ROLLERS ${M.SLOT.d} APART.`,
  `AT 30°: GAP ${Math.round(g30.gap)} (${K.fmt((100 * g30.gap) / M.C, 1)} % c), OVERLAP ${Math.round(g30.overlap)}, CHORD +${K.fmt((100 * (g30.chord - M.C)) / M.C, 1)} %.`,
  `Tr16×4 SELF-LOCKING: λ ${K.fmt(M.LEAD_ANGLE / M.deg, 1)}° < φ ${K.fmt(M.FRICTION_ANGLE / M.deg, 1)}°, η ${Math.round(100 * M.SCREW_EFF)} %. NO BACK-DRIVE.`,
  `0–30° IN ${K.fmt(t030, 1)} s AT 60 kt. NO LOAD RELIEF: EXTEND BELOW V_FE ${M.V_FE} kt.`,
  `C_L,MAX FROM PUBLISHED V_S ${M.VS_PUBLISHED[0]}/${M.VS_PUBLISHED[10]}/${M.VS_PUBLISHED[20]}/${M.VS_PUBLISHED[30]} kt, BP-022.`,
  `SLOT: AIR FROM BELOW RE-ENERGISES THE FLAP'S BOUNDARY LAYER.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 236, h: 32, label: "TITLE", value: "WING FLAPS AND DRIVE", size: "lg" },
  { x: 236, y: 0, w: 90, h: 32, label: "DWG NO", value: "BP-107", size: "lg" },
  { x: 0, y: 32, w: 60, h: 25, label: "SCALE", value: "AS SHOWN" },
  { x: 60, y: 32, w: 34, h: 25, label: "SIZE", value: "A2" },
  { x: 94, y: 32, w: 46, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 140, y: 32, w: 86, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 226, y: 32, w: 100, h: 25, label: "DATE", value: "2026-10-18" },
  { x: 0, y: 57, w: 110, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 110, y: 57, w: 96, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 206, y: 57, w: 120, h: 25, label: "UNITS", value: "mm · kt · °" },
  { x: 0, y: 82, w: 326, h: 29, label: "LIVE · DRIVE · ↑ ↓ OR DRAG THE KNOB: SELECTOR · 0–3: 0/10/20/30°", value: "", id: "readout", size: "sm" },
  { x: 0, y: 111, w: 326, h: 29, label: "LIVE · AIR · ← → AIRSPEED · SPACE: TOUR · S: SLOW", value: "", id: "readout2", size: "sm" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-B"><circle cx="${B.cx}" cy="${B.cy}" r="${B.r}"/></clipPath>` +
  `</defs>`;
const knob = VD.p([146 * Math.cos((P.LEVER0 + 20) * (Math.PI / 180)), 146 * Math.sin((P.LEVER0 + 20) * (Math.PI / 180))]);
const hit = `<rect class="hit" data-drag="knob" x="${K.r2(VD.p([-150, 0])[0])}" y="${K.r2(VD.p([0, 80])[1])}" width="${K.r2(70 * VD.k)}" height="${K.r2(170 * VD.k)}"/>`;
void knob;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of the electrically driven single-slotted flaps of a four-seat high-wing light aircraft: the wing cut through the inboard flap track, with the flap, its rollers in the track's curved slot, the slot's air, the actuator (motor, gearbox, jackscrew, nut and limit switches) in section, the drive linkage of bellcranks, push-pull rods and crossed cables in plan, and the cockpit selector with its follow-up switches. The tour selects 10, 20 and 30 degrees, then retracts: the screw turns, the nut travels, the bellcranks swing, the flap slides aft and then turns down, the slot opens and the lift curve moves up. The up and down arrows move the selector, left and right change the airspeed." ` +
  `data-views='${JSON.stringify(VIEWS)}' data-live='${JSON.stringify({ A: LIVE_A, C: LIVE_C, D: LIVE_D, P: LIVE_P })}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  sectionA +
  dimsA +
  balloonsA +
  labelA +
  markB +
  detailB +
  sectionC +
  dimsC +
  balloonsC +
  labelC +
  planView +
  marksP +
  balloonsP +
  labelP +
  viewD +
  balloonsD +
  labelD +
  chartCL() +
  chartVs() +
  chartKin() +
  circuit() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span><kbd>↑</kbd> <kbd>↓</kbd> or drag the knob: selector · <kbd>0</kbd>–<kbd>3</kbd> stops · <kbd>←</kbd> <kbd>→</kbd> airspeed · <kbd>Space</kbd> tour · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "wing-flaps.html"), {
  title: "Wing Flaps",
  description: "A live engineering drawing of a light aircraft's electric single-slotted flaps: the wing cut through a flap track whose curved slot first slides the flap aft and then turns it down, opening the slot; the 28 V actuator, jackscrew and limit switches in section; the bellcranks, rods and crossed cables in plan; the cockpit selector's follow-up; and the lift curves and stall speeds the flap buys, all from one model.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet [data-drag]{cursor:grab}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}` +
    `.bp-sheet .flow{fill:none;stroke:var(--bp-accent);stroke-width:1px;stroke-linejoin:round}.bp-sheet .flow-head{fill:var(--bp-accent)}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "extra.mjs"), "X"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHARTS__", JSON.stringify({ CH, CV, CK, EC, DIM_TE_Y, DIM_C_Y, B })),
});
console.log(
  `wing-flaps.html  ${(size / 1024).toFixed(0)} KB  stroke ${M.NUT_MAX.toFixed(1)} mm  rod ${M.ROD_L.toFixed(1)}  β ${M.BETA0.toFixed(1)}…${M.betaOf(M.S_MAX).toFixed(1)}°  0–30° ${t030.toFixed(2)} s  gap30 ${g30.gap.toFixed(1)} overlap30 ${g30.overlap.toFixed(1)}  marks ${Object.values(M.MARKS).map((v) => v.toFixed(1)).join("/")}`
);
