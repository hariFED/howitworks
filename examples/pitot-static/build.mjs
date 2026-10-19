// Builds pitot-static.html: a live A2 drawing of a light aircraft's pitot-static system: the system
// schematic in the parent aircraft's plan and side outlines, the heated pitot head in section, the
// tail cone at the static ports with their cross-connection, a port, a drain trap and the alternate
// static valve in section, and the three instruments it feeds, each in section and from the front
// with half its dial broken away to show the movement; a pneumatic diagram and two charts.
//   node examples/pitot-static/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as A from "../light-aircraft/model.mjs";
import * as LP from "../light-aircraft/parts.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const kk = (scale) => scale * K.PX_PER_MM;

// The two pages must agree: the parent's pitot head and its airspeed dial are this sheet's.
for (const k of ["ws", "fs0", "fs1"]) if (LP.PITOT[k] !== M.PITOT[k]) throw new Error(`pitot ${k} differs from the parent's`);
for (const k of ["r", "v0", "v1", "a0", "a1"]) if (LP.ASI[k] !== M.ASI[k]) throw new Error(`ASI dial ${k} differs from the parent's`);
for (const v of [40, 80, 110, 160]) if (Math.abs(90 - M.asiDeg(v) - LP.asiAngle(v)) > 1e-9) throw new Error("ASI dial law differs from the parent's");

// ---------------------------------------------------------------- views
const KB = { x: 236, y: 178, w: 164, h: 118 }; // DETAIL B window, 2:1
const KD = { x: 206, y: 446, w: 128, h: 106 }; // DETAIL D window, 2:1
const IY = [127, 393, 659]; // the instruments' axes
const VIEWS = {
  plan: { x: 75.25, y: 60.3, scale: 0.02 },
  side: { x: 75.25, y: 397, scale: 0.02 },
  A: { x: 238, y: 128, scale: 0.4 },
  B: { x: KB.x + 6, y: KB.y + KB.h / 2 + 1, scale: 2 },
  C: { x: 110, y: K.r2(528 + M.PORT_WL * kk(0.05)), scale: 0.05 },
  D: { x: K.r2(KD.x + 12 + M.PORT_R * kk(2)), y: K.r2(KD.y + KD.h / 2 + M.PORT_WL * kk(2)), scale: 2 },
  F: { x: 389, y: 494, scale: 1 },
  E: { x: 238, y: 704, scale: 1 },
  asiS: { x: 470.2, y: IY[0], scale: 1 },
  asiF: { x: 772, y: IY[0], scale: 1 },
  altS: { x: 470.2, y: IY[1], scale: 1 },
  altF: { x: 772, y: IY[1], scale: 1 },
  vsiS: { x: 470.2, y: IY[2], scale: 1 },
  vsiF: { x: 772, y: IY[2], scale: 1 },
};
const V = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, K.view(v)]));
const S0 = M.tourStart();
const I0 = M.indications(S0);
const A0 = P.asiState(I0);
const L0 = P.altState(I0, S0.set);
const W0 = P.vsiState(I0);
const tint = (p) => K.r2(Math.min(1, Math.max(0.12, (p - 40000) / 64000)));
const fl = (id, pts, Vv, cls = "tint", op = null) => `<path id="${id}" class="${cls}"${op != null ? ` fill-opacity="${op}"` : ""} d="${K.d(Vv, pts)}"/>`;

// ---------------------------------------------------------------- PLAN: the system in the aircraft's outline
const R = M.ROUTE;
const lineSym = (Vv, pts, id, cls) => `<path id="${id}" class="air-line ${cls}" d="${K.d(Vv, pts, false)}"/>`;
const planGeom =
  `<g data-geom="plan" clip-path="url(#clip-plan)"><g data-role="phantom">` +
  K.line(V.plan, P.planOutline(), "phan", true) + K.line(V.plan, P.wingPlan(), "phan", false) + K.line(V.plan, P.wingPlanStbd(), "phan", false) +
  K.line(V.plan, K.rect(M.PANEL.fs, -560, M.PANEL.fs + M.PANEL.t, 560), "phan", true) +
  `</g>` +
  P.part(1, P.pitotPlanSym(V.plan)) +
  P.part(5, lineSym(V.plan, P.routePlan(R.pitot), "pl-pitot", "pit")) +
  P.part(8, ["portL", "portR", "static", "manifold", "vsiTee", "asiStatic"].map((k) => lineSym(V.plan, P.routePlan(R[k]), `pl-${k}`, "st")).join("")) +
  P.part(7, P.portPlanSym(V.plan, -1) + P.portPlanSym(V.plan, 1)) +
  P.part(6, K.body(V.plan, K.rect(M.TRAP_P[0] - 45, M.TRAP_P[1] - 45, M.TRAP_P[0] + 45, M.TRAP_P[1] + 45)) + K.body(V.plan, K.rect(M.TRAP_S[0] - 45, M.TRAP_S[1] - 45, M.TRAP_S[0] + 45, M.TRAP_S[1] + 45))) +
  P.part(9, K.body(V.plan, K.rect(M.ALT_VALVE[0] - 70, M.ALT_VALVE[1] - 33, M.ALT_VALVE[0] + 70, M.ALT_VALVE[1] + 33))) +
  K.centerline(V.plan, [P.VIEW_FS[0] + 40, 0], [P.VIEW_FS[1] - 30, 0], 0) +
  `</g>` +
  K.breakLine(V.plan, [P.VIEW_FS[1], -820], [P.VIEW_FS[1], 820]) +
  K.breakLine(V.plan, [A.leAt(P.VIEW_WS) - 60, -P.VIEW_WS], [A.TE_FS + 60, -P.VIEW_WS]);
const planBalloons =
  K.balloon(V.plan, [700, -M.PITOT.ws], [44, 238], 1, { target: 1 }) +
  K.balloon(V.plan, P.routePlan(R.pitot)[3], [200, 118], 5, { target: 5 });
const planLabel = K.viewLabel(126, 262, "PLAN", "SYSTEM SCHEMATIC · LINES NTS · 1:50");

// ---------------------------------------------------------------- SIDE ELEVATION, from port
const sideGeom =
  `<g data-geom="side" clip-path="url(#clip-side)"><g data-role="phantom">` +
  K.line(V.side, P.sideOutline(), "phan", true) + K.line(V.side, P.wingSide(0), "phan", true) +
  `</g>` +
  P.part(11, P.panelSide(V.side)) +
  P.part(12, P.instSide(V.side, M.INST.asi[1])) +
  P.part(23, P.instSide(V.side, M.INST.vsi[1])) +
  P.part(1, P.pitotSideSym(V.side)) +
  P.part(5, lineSym(V.side, P.routeSide(R.pitot), "sd-pitot", "pit")) +
  P.part(8, ["portL", "static", "manifold", "vsiTee", "asiStatic"].map((k) => lineSym(V.side, P.routeSide(R[k]), `sd-${k}`, "st")).join("")) +
  P.part(7, P.portSideSym(V.side)) +
  P.part(6, P.trapSym(V.side, [M.TRAP_P[0], M.TRAP_P[2]]) + P.trapSym(V.side, [M.TRAP_S[0], M.TRAP_S[2]])) +
  P.part(9, P.valveSym(V.side, [M.ALT_VALVE[0], M.ALT_VALVE[2]])) +
  `</g>` +
  K.breakLine(V.side, [P.VIEW_FS[1], 760], [P.VIEW_FS[1], 1960]);
const sideBalloons =
  K.balloon(V.side, [M.PORT_FS, M.PORT_WL + 22], [196, 292], 7, { target: 7 }) +
  K.balloon(V.side, [1500, 800], [150, 410], 8, { target: 8 }) +
  K.balloon(V.side, [M.TRAP_S[0], M.TRAP_S[2] - 60], [96, 410], 6, { target: 6 });
const sideLabel = K.viewLabel(126, 442, "SIDE ELEVATION", "FROM PORT · 1:50");

// ---------------------------------------------------------------- SECTION A-A: the pitot head, 1:2.5
const hd = P.HD;
const aAir = `<g data-role="fluid">${fl("a-air", P.headAir(), V.A)}${P.ptBores().map((b, i) => fl(`a-pt${i}`, b, V.A)).join("")}${fl("a-line", P.lineStubBore(), V.A)}</g>`;
const aGeom =
  `<g data-geom="A">` +
  `<g data-role="phantom">${K.line(V.A, P.ptBores()[0].slice(0, 1), "phan")}</g>` +
  aAir +
  P.part(1, P.headBody(V.A)) +
  P.part(3, P.dam(V.A) + P.pressureTube(V.A)) +
  P.part(2, P.heater(V.A)) +
  P.part(4, P.mast(V.A)) +
  P.part(5, P.union(V.A) + P.lineStub(V.A)) +
  `<g data-role="phantom">${P.wingSkin(V.A)}</g>` +
  `<g id="a-ice"></g>` +
  K.centerline(V.A, [-6, 0], [P.hx(hd.len) + 6, 0], 0) +
  `</g>` +
  [-1, 1].map((sg) => K.breakLine(V.A, [P.XB0 + 3, sg * 16], [P.XB0 + 3, sg * 16])).join("") +
  K.breakLine(V.A, [P.XB0 + 3, -16], [P.XB0 + 3, 16]) +
  K.detailMark(V.A, [24, 0], 26, "B", 135);
const aDims =
  K.dim(V.A, [P.hx(hd.mastX[0]) - 0, -hd.R], [P.hx(hd.mastX[0]), hd.R], { dir: "v", off: 0, text: "" }).slice(0, 0) +
  K.dim(V.A, [P.hx(hd.len) + 0, -hd.R], [P.hx(hd.len), hd.R], { dir: "v", off: 10, prefix: "Ø" });
const aBalloons =
  K.balloon(V.A, [60, hd.R - 1.2], [252, 96], 1, { target: 1 }) +
  K.balloon(V.A, [P.hx(hd.mastX[0]) + 1, 40], [334, 74], 4, { target: 4 }) +
  K.balloon(V.A, [hd.coil[0] + 3 * (hd.coil[1] - hd.coil[0]) / hd.coil[2], hd.bore - 0.85], [296, 96], 2, { target: 2 });
const aLabel = K.viewLabel(322, 160, "SECTION A-A", "PITOT HEAD · 1:2.5");

// ---------------------------------------------------------------- DETAIL B: the head's tip, 2:1
const bMap = (p) => p;
const bGeom =
  `<g data-geom="B" clip-path="url(#clip-B)"><rect class="paper" x="${KB.x}" y="${KB.y}" width="${KB.w}" height="${KB.h}"/>` +
  `<g data-role="fluid">${fl("b-air", P.headAir(true), V.B)}${fl("b-pt", P.boreOf([[hd.dam[0], hd.ptY], [80, hd.ptY]], hd.pt[1]), V.B)}</g>` +
  P.part(1, P.headBody(V.B, { full: true })) +
  `<g id="b-drain">${P.drainHole(V.B, false)}</g>` +
  P.part(3, P.dam(V.B, bMap) + P.tubeCut(V.B, [[hd.dam[0], hd.ptY], [80, hd.ptY]], hd.pt[0], hd.pt[1])) +
  P.part(2, P.heater(V.B, bMap)) +
  `<g id="b-ice"></g>` +
  K.centerline(V.B, [-2, 0], [50, 0], 0) +
  `</g><rect class="thin" x="${KB.x}" y="${KB.y}" width="${KB.w}" height="${KB.h}" rx="10"/>` +
  K.dim(V.B, [0, -hd.ram], [0, hd.ram], { dir: "v", off: -12, prefix: "Ø" }).replace("Ø3.2", "Ø3.2") +
  K.balloon(V.B, [hd.dam[0] + 1.2, -6], [416, 278], 3, { target: 3 }) +
  K.viewLabel(KB.x + KB.w / 2, KB.y + KB.h + 20, "DETAIL B", "RAM HOLE, DRAIN, DAM, HEATER · 2:1");

// ---------------------------------------------------------------- SECTION C-C: the tail cone at the ports, 1:20
const cAir = `<g data-role="fluid">${[-1, 1].map((sg) => `<path id="c-${sg < 0 ? "L" : "R"}" class="air-line st" d="${K.d(V.C, P.coneRoute(sg), false)}"/>`).join("")}</g>`;
const cGeom =
  `<g data-geom="C">` +
  P.part(7, P.portC(V.C, -1) + P.portC(V.C, 1)) +
  `<g data-role="phantom">${P.coneFrame(V.C)}</g>` +
  `<g>${P.coneSkin(V.C)}</g>` +
  cAir +
  P.part(8, P.teeC(V.C)) +
  `<g id="c-ice"></g>` +
  K.centerline(V.C, [-M.PORT_R - 40, M.PORT_WL], [M.PORT_R + 40, M.PORT_WL], 0) +
  K.centerline(V.C, [0, M.PORT_WL - M.PORT_R - 40], [0, M.PORT_WL + M.PORT_R + 40], 0) +
  `</g>` +
  K.detailMark(V.C, [-M.PORT_R, M.PORT_WL], 70, "D", 150);
const cDims = K.dim(V.C, [0, M.PORT_WL + M.PORT_R], [0, M.PORT_WL - M.PORT_R], { dir: "v", off: K.r2(M.PORT_R * V.C.k + 16), prefix: "Ø" });
const cBalloons = K.balloon(V.C, [20, M.TEE[2] - 10], [162, 596], 8, { target: 8 });
const cLabel = K.viewLabel(104, 622, "SECTION C-C", `TAIL CONE, FS ${M.PORT_FS} · 1:20`);

// ---------------------------------------------------------------- DETAIL D: the left static port, 2:1
const dGeom =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${KD.x}" y="${KD.y}" width="${KD.w}" height="${KD.h}"/>` +
  `<g data-role="fluid">${fl("d-bore", P.spBore(), V.D)}</g>` +
  `<g>${P.spSkin(V.D)}</g>` +
  P.part(7, P.spDoubler(V.D) + P.spButton(V.D)) +
  P.part(8, P.spHose(V.D)) +
  `<g id="d-ice"></g>` +
  K.centerline(V.D, [-M.PORT_R - 4, M.PORT_WL], [-M.PORT_R + 40, M.PORT_WL], 0) +
  `</g><rect class="thin" x="${KD.x}" y="${KD.y}" width="${KD.w}" height="${KD.h}" rx="10"/>` +
  K.balloon(V.D, [-M.PORT_R + 1.6, M.PORT_WL + 6.4], [222, 434], 7, { target: 7 }) +
  K.viewLabel(KD.x + KD.w / 2, KD.y + KD.h + 18, "DETAIL D", "LEFT STATIC PORT · 2:1");

// ---------------------------------------------------------------- SECTION F-F: a drain trap, 1:1
const fGeom =
  `<g data-geom="F">` +
  `<g data-role="fluid">${fl("f-air", P.trapAir(), V.F)}<path id="f-water" class="water" d="${K.d(V.F, P.trapWater(4))}"/></g>` +
  P.part(6, P.trapBody(V.F) + P.trapBowl(V.F) + P.trapPlug(V.F)) +
  P.part(5, P.trapLines(V.F)) +
  K.centerline(V.F, [0, 18], [0, P.TR.bowl[2] - 10], 0) +
  `</g>` +
  K.balloon(V.F, [P.TR.bowl[0] - 1, -20], [424, 548], 6, { target: 6 });
const fLabel = K.viewLabel(389, 614, "SECTION F-F", "DRAIN TRAP · 2 OFF · 1:1");

// ---------------------------------------------------------------- SECTION E-E: the alternate static valve, 1:1
const air0 = P.valveAir(0);
const eGeom =
  `<g data-geom="E">` +
  `<g data-role="fluid">${fl("e-A", air0.A, V.E)}${fl("e-B", air0.B, V.E)}${fl("e-C", air0.C, V.E)}<path id="e-groove" class="tint" d="${K.d(V.E, air0.groove)}"/></g>` +
  P.part(9, P.valveBody(V.E)) +
  P.part(11, P.valvePanel(V.E)) +
  P.part(8, P.valveLines(V.E)) +
  `<g id="e-spool">${P.part(10, P.valveSpool(V.E, 0) + P.valveKnob(V.E, 0))}</g>` +
  K.centerline(V.E, [-4, 0], [P.AV.knob[1] + 14, 0], 0) +
  `</g>` +
  K.balloon(V.E, [30, -P.AV.R + 0.5], [300, 756], 9, { target: 9 }) +
  `<g id="lb-10"></g>`;
const eLabel = K.viewLabel(304, 784, "SECTION E-E", "ALTERNATE STATIC VALVE · 1:1");
const LIVE = { 10: { at: [366, 664] } };

// ---------------------------------------------------------------- the instruments: sections and front views
function instrument(kind, staticFn, movingFn, dialFn, frontFn, st, extraS = "", extraF = "") {
  const VS = V[`${kind}S`];
  const VF = V[`${kind}F`];
  const dial = dialFn(VF);
  const sec = `<g data-geom="${kind}S">${extraS}${staticFn(VS)}<g id="${kind}-s">${movingFn(VS, st)}</g>${K.centerline(VS, [-12, 0], [IC.panel[1] + 4, 0], 0)}</g>`;
  const front = `<g data-geom="${kind}F">${P.faceFrame(VF)}${P.part(kind === "asi" ? 12 : kind === "alt" ? 18 : 23, P.rearPlateFront(VF, "R").replace("", ""))}${extraF}<g>${dial.geom}</g><g data-role="engraved">${dial.text}</g><g id="${kind}-f">${frontFn(VF, st)}</g>${K.centerMark(VF, [0, 0], 0)}</g>`;
  return sec + front;
}
const IC = P.IC;
// the air: in each section, the fittings' bores; the ASI's and VSI's capsules ride in the moving group
const fitAir = (kind, ys) => `<g data-role="fluid">${ys.map((y, i) => fl(`${kind}-fit${i}`, P.fittingBore(y), V[`${kind}S`])).join("")}</g>`;
const asiSec = instrument("asi", P.asiStatic, (Vv, st) => asiMovingWithAir(Vv, st), P.asiDial, P.asiFrontMoving, A0, fitAir("asi", [0, 24]));
function asiMovingWithAir(Vv, st) {
  const c = P.INSTR.asi.cap;
  return `<g data-role="fluid">${fl("asi-cap", P.capsuleAir(c.x0, c.gap, c.R, st.dl), Vv)}</g>` + P.asiMoving(Vv, st);
}
function vsiMovingWithAir(Vv, st) {
  const c = P.INSTR.vsi.cap;
  return `<g data-role="fluid">${fl("vsi-cap", P.capsuleAir(c.x0, c.gap, c.R, st.dl), Vv)}</g>` + P.vsiMoving(Vv, st);
}
const altSec = instrument("alt", P.altStatic, P.altMoving, P.altDial, P.altFrontMoving, L0, fitAir("alt", [-30]),
  `<g id="alt-k">${kollsmanSvg(L0.set)}</g>` );
function kollsmanSvg(hpa) {
  const k = P.kollsman(V.altF, hpa);
  return k.geom + `<g data-role="engraved">${k.text}</g>`;
}
const vsiSec = instrument("vsi", P.vsiStatic, vsiMovingWithAir, P.vsiDial, P.vsiFrontMoving, W0, fitAir("vsi", [0]) + `<g data-role="fluid">${fl("vsi-mu", P.vsiPassage(), V.vsiS)}</g>`);
const instLabels =
  K.viewLabel(586, 240, "SECTION G-G", "AIRSPEED INDICATOR · 1:1") +
  K.viewLabel(772, 240, "VIEW H", "HALF DIAL AWAY · 1:1") +
  K.viewLabel(586, 506, "SECTION J-J", "ALTIMETER · 1:1") +
  K.viewLabel(772, 506, "VIEW K", "HALF DIAL AWAY · 1:1") +
  K.viewLabel(586, 772, "SECTION L-L", "VERTICAL SPEED INDICATOR · 1:1") +
  K.viewLabel(772, 772, "VIEW N", "HALF DIAL AWAY · 1:1");
// balloons for a front view sit in the four corners round its bezel: 0 upper left, 1 upper right,
// 2 lower left, 3 lower right; each entry [dot (world), item, corner]
function corners(view, ...list) {
  const Vv = V[view];
  const d = 38 * Vv.k;
  return list.map(([at, n, c]) => K.balloon(Vv, at, [K.r2(Vv.x + (c % 2 ? d : -d)), K.r2(Vv.y + (c < 2 ? -d : d))], n, { target: n })).join("");
}
const instBalloons =
  K.balloon(V.asiS, [IC.back + 10, IC.Ro - 0.6], [470, 34], 12, { target: 12 }) +
  K.balloon(V.asiS, [24, 23.1], [500, 34], 13, { target: 13 }) +
  K.balloon(V.asiS, [40, -0.5], [530, 34], 14, { target: 14 }) +
  K.balloon(V.asiS, [IC.panel[0] + 1.5, 44], [706, 34], 11, { target: 11 }) +
  corners("asiF", [[P.PIV[0] + 1.2, P.PIV[1]], 15, 1], [[0, -14], 16, 3], [P.HS_STUD, 17, 0]) +
  K.balloon(V.altS, [IC.back + 10, IC.Ro - 0.6], [470, 296], 18, { target: 18 }) +
  K.balloon(V.altS, [P.INSTR.alt.cap.x0, P.INSTR.alt.cap.R + 0.1], [500, 296], 19, { target: 19 }) +
  corners("altF", [[P.ALT_W1[0] + 1.2, P.ALT_W1[1]], 20, 1], [[0.4, 0.4], 21, 0], [[23.9, -8], 22, 3]) +
  K.balloon(V.vsiS, [IC.back + 10, IC.Ro - 0.6], [470, 562], 23, { target: 23 }) +
  K.balloon(V.vsiS, [24, 23.1], [500, 562], 24, { target: 24 }) +
  K.balloon(V.vsiS, [8, -20], [470, 760], 25, { target: 25 }) +
  corners("vsiF", [[P.PIV[0] + 1.2, P.PIV[1]], 26, 1]);

// ---------------------------------------------------------------- DIAGRAM 1: IAS and TAS with height
const CH = { x0: 900, x1: 1150, y0: 36, y1: 104, vMin: 60, vMax: 150, hMax: 10000 };
const cx = (v) => K.r2(CH.x0 + ((Math.min(CH.vMax, Math.max(CH.vMin, v)) - CH.vMin) / (CH.vMax - CH.vMin)) * (CH.x1 - CH.x0));
const cy = (h) => K.r2(CH.y1 - (Math.min(CH.hMax, Math.max(0, h)) / CH.hMax) * (CH.y1 - CH.y0));
function chartTas() {
  let grid = "";
  let labels = "";
  for (let h = 0; h <= CH.hMax; h += 2000) {
    grid += `M${CH.x0} ${cy(h)}H${CH.x1}`;
    if (h > 0) labels += `<text class="t t-sm" x="${CH.x0 - 4}" y="${K.r2(cy(h) + 2.7)}" text-anchor="end">${h / 1000}</text>`;
  }
  for (let v = CH.vMin; v <= CH.vMax; v += 10) {
    grid += `M${cx(v)} ${CH.y0}V${CH.y1}`;
    if (v % 30 === 0) labels += `<text class="t t-sm" x="${cx(v)}" y="${CH.y1 + 10}" text-anchor="middle">${v}</text>`;
  }
  // thin: TAS for 80 and 110 kt IAS; the live curve for the IAS now in the accent
  const curve = (ias) => Array.from({ length: 21 }, (_, i) => `${cx(M.tasKt(ias, (i * CH.hMax) / 20))},${cy((i * CH.hMax) / 20)}`).join(" ");
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 21}" text-anchor="middle">AIRSPEED, kt</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x0 - 18}" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH.x0 - 18} ${(CH.y0 + CH.y1) / 2})">ALT, 1000 ft</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline class="hid" points="${curve(M.VY)}"/><polyline class="hid" points="${curve(M.V_CRUISE)}"/>` +
    `<path id="c1-ias" class="vis" d=""/><polyline id="c1-tas" class="vis accent" points=""/>` +
    `<circle id="c1-dot" class="accent-fill" cx="${CH.x0}" cy="${CH.y1}" r="2.8"/><circle id="c1-idot" class="dot" cx="${CH.x0}" cy="${CH.y1}" r="2.2"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 140, "DIAGRAM 1 · IAS AND TAS", "THICK: IAS · ACCENT: ITS TAS · DASHED: 74, 110 kt")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: the VSI's lag, the last 24 s
const CT = { x0: 900, x1: 1150, y0: 166, y1: 230, span: 24, fMax: 1000 };
function chartVsi() {
  let grid = "";
  let labels = "";
  const fy = (f) => K.r2((CT.y0 + CT.y1) / 2 - (f / CT.fMax) * ((CT.y1 - CT.y0) / 2));
  for (let f = -CT.fMax; f <= CT.fMax; f += 500) {
    grid += `M${CT.x0} ${fy(f)}H${CT.x1}`;
    if (f > -CT.fMax && f % 1000 === 0) labels += `<text class="t t-sm" x="${CT.x0 - 4}" y="${K.r2(fy(f) + 2.7)}" text-anchor="end">${f / 1000}</text>`;
  }
  for (let t = 0; t <= CT.span; t += 4) {
    const x = K.r2(CT.x0 + (t / CT.span) * (CT.x1 - CT.x0));
    grid += `M${x} ${CT.y0}V${CT.y1}`;
    if (t % 8 === 0) labels += `<text class="t t-sm" x="${x}" y="${CT.y1 + 10}" text-anchor="middle">${t - CT.span}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CT.x0 + CT.x1) / 2}" y="${CT.y1 + 21}" text-anchor="middle">FLIGHT TIME, s (NOW = 0)</text>`;
  labels += `<text class="t t-sm t-mute" x="${CT.x0 - 16}" y="${(CT.y0 + CT.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CT.x0 - 16} ${(CT.y0 + CT.y1) / 2})">1000 ft/min</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CT.x0}" y="${CT.y0}" width="${CT.x1 - CT.x0}" height="${CT.y1 - CT.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline id="c2-true" class="vis" points=""/><polyline id="c2-ind" class="vis accent" points=""/>` +
    `<rect class="vis" x="${CT.x0}" y="${CT.y0}" width="${CT.x1 - CT.x0}" height="${CT.y1 - CT.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CT.x0 + CT.x1) / 2, 266, "DIAGRAM 2 · THE VSI'S LAG", `THICK: TRUE · ACCENT: VSI · τ ${K.fmt(M.TAU0, 1)} s AT SL`)
  );
}

// ---------------------------------------------------------------- DIAGRAM 3: the pneumatics, schematic
const PN = { x: 34, y: 646 };
function pneumatics() {
  const x = PN.x;
  const y = PN.y;
  const box = (bx, by, w, h, t, id) => `<rect class="vis" x="${bx}" y="${by}" width="${w}" height="${h}"/><text class="t t-sm" x="${bx + w / 2}" y="${by + 9}" text-anchor="middle">${t}</text><text class="t t-sm" id="${id}" x="${bx + w / 2}" y="${by + h - 4}" text-anchor="middle"></text>`;
  const hole = (hx, hy, t, id) => `<path class="vis" d="M${hx - 4} ${hy - 4}L${hx + 4} ${hy + 4}M${hx - 4} ${hy + 4}L${hx + 4} ${hy - 4}"/><text class="t t-sm" x="${hx}" y="${hy - 7}" text-anchor="middle">${t}</text><path id="${id}" class="ice-x" d="M${hx - 6} ${hy}H${hx + 6}"/>`;
  return (
    `<g data-role="chart">` +
    box(x + 50, y + 4, 70, 30, "PITOT SIDE", "n-pit") +
    box(x + 50, y + 70, 70, 30, "STATIC SIDE", "n-st") +
    box(x + 50, y + 120, 70, 30, "VSI CASE", "n-vc") +
    `<path class="thin" d="M${x + 10} ${y + 19}H${x + 50}M${x + 10} ${y + 52}H${x + 30}V${y + 34}M${x + 10} ${y + 85}H${x + 50}M${x + 120} ${y + 85}H${x + 160}M${x + 85} ${y + 100}V${y + 120}"/>` +
    hole(x + 22, y + 19, "RAM", "n-ram") + hole(x + 18, y + 52, "DRAIN", "n-drain") + hole(x + 22, y + 85, "PORTS", "n-ports") + hole(x + 140, y + 85, "ALT", "n-alt") +
    `<path class="vis" d="M${x + 80} ${y + 106}h10M${x + 80} ${y + 110}h10M${x + 80} ${y + 114}h10"/><text class="t t-sm" x="${x + 94}" y="${y + 114}">CAPILLARY</text>` +
    `<text class="t t-sm" x="${x + 166}" y="${y + 88}">CABIN</text>` +
    `<path class="thin" d="M${x + 120} ${y + 19}H${x + 150}V${y + 70}"/><text class="t t-sm" x="${x + 152}" y="${y + 45}">ASI</text>` +
    `</g>` +
    K.viewLabel(x + 96, y + 160, "DIAGRAM 3 · PNEUMATICS", "×: A HOLE · Δp TO STATIC, Pa")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "PITOT HEAD Ø24, HEATED", "C36000 BRASS, NI PL.", "1"],
  ["2", "HEATER ELEMENT, 28 V 110 W", "NICHROME / MgO / SST", "1"],
  ["3", "WATER DAM AND PRESSURE TUBE", "BRASS C26000", "1"],
  ["4", "PITOT MAST AND FLANGE", "A356-T6", "1"],
  ["5", "PITOT LINE Ø6.35×0.89", "5052-O", "1"],
  ["6", "DRAIN TRAP, CLEAR BOWL", "BRASS / PC", "2"],
  ["7", "STATIC PORT, FLUSH, DOUBLER", "BRASS / 2024-T3", "2"],
  ["8", "STATIC LINES, CROSS-OVER TEE", "5052-O / NYLON", "1 SET"],
  ["9", "ALTERNATE STATIC VALVE BODY", "6061-T6", "1"],
  ["10", "SPOOL, O-RINGS AND KNOB", "BRASS / NBR / PHENOLIC", "1"],
  ["11", "INSTRUMENT PANEL (BP-022 ITEM 18)", "2024-T3", "REF"],
  ["12", "ASI CASE, GLASS, DIAL", "A380 / GLASS", "1"],
  ["13", "ASI DIAPHRAGM CAPSULE Ø46", "BERYLLIUM COPPER", "1"],
  ["14", "ROCKING SHAFT, CRANKS, PUSH ROD", "BRASS / SST", "1"],
  ["15", "ASI SECTOR AND LINK", "BRASS C34000", "1"],
  ["16", "PINION ARBOR AND POINTER", "SST / ALU", "1"],
  ["17", "HAIRSPRING", "PHOSPHOR BRONZE", "1"],
  ["18", "ALTIMETER CASE, GLASS, DIAL", "A380 / GLASS", "1"],
  ["19", "ANEROID CAPSULE STACK, EVACUATED", "BERYLLIUM COPPER", "1"],
  ["20", "ALTIMETER MOVEMENT AND CRADLE", "BRASS / SST", "1"],
  ["21", "POINTERS 1000/10 000/100 000 FT", "ALU", "3"],
  ["22", "BARO KNOB, RING GEAR, SCALE", "BRASS / ALU", "1"],
  ["23", "VSI CASE, GLASS, DIAL", "A380 / GLASS", "1"],
  ["24", "VSI DIAPHRAGM CAPSULE Ø46", "BERYLLIUM COPPER", "1"],
  ["25", `METERING UNIT, CAPILLARY Ø${M.CAP.d}×${M.CAP.len}`, "BRASS / RUBY", "1"],
  ["26", "VSI MOVEMENT AND POINTER", "BRASS / SST", "1"],
];
const TB = { x: 866, w: 310, h: 140 };
TB.y = 824 - TB.h;
const rowH = 11;
const bomTop = TB.y - (18 + BOM.length * rowH);
const bom = K.table(TB.x, bomTop, [
  { w: 22, align: "center", title: "ITEM" },
  { w: 160, title: "DESCRIPTION" },
  { w: 102, title: "MATERIAL" },
  { w: 26, align: "center", title: "QTY" },
], BOM, { rowH });

const s6500 = M.tasKt(M.V_CRUISE, M.H_HIGH);
const notes = K.notes(870, 296, "NOTES", [
  `ISA: p = QNH(T/T0)^${K.fmt(M.EXP, 3)}, ρ0 ${M.RHO0} kg/m³ AS BP-022.`,
  `ASI READS q_c = p_t − p_s: ${M.V_CRUISE} IAS = ${K.fmt(s6500, 1)} TAS AT ${M.H_HIGH} ft.`,
  `VSI LEAK Ø${M.CAP.d}×${M.CAP.len}, CASE ${Math.round(M.V_CASE.vsi * 1e6)} cm³: τ = 8μLV/πr⁴p = ${K.fmt(M.TAU0, 1)} s.`,
  `HOLES: RAM Ø${M.HEAD.ram}, DRAIN Ø${M.HEAD.drain}, PORT Ø${M.PORT_HOLE}, ALT Ø${M.ALT_HOLE}.`,
  `CABIN p = p_s ${Math.round(M.CP_CABIN * 100)} % OF q. TOUR TIME WARPED.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 220, h: 32, label: "TITLE", value: "PITOT-STATIC SYSTEM", size: "lg" },
  { x: 220, y: 0, w: 90, h: 32, label: "DWG NO", value: "BP-108", size: "lg" },
  { x: 0, y: 32, w: 60, h: 25, label: "SCALE", value: "AS SHOWN" },
  { x: 60, y: 32, w: 36, h: 25, label: "SIZE", value: "A2" },
  { x: 96, y: 32, w: 44, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 140, y: 32, w: 76, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 216, y: 32, w: 94, h: 25, label: "DATE", value: "2026-10-18" },
  { x: 0, y: 57, w: 104, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 104, y: 57, w: 92, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 196, y: 57, w: 114, h: 25, label: "UNITS", value: "mm · Pa · kt · ft" },
  { x: 0, y: 82, w: 310, h: 29, label: "LIVE · TRUE · ← → AIRSPEED · ↑ ↓ CLIMB · [ ] BARO", value: "", id: "readout", size: "sm" },
  { x: 0, y: 111, w: 310, h: 29, label: "LIVE · SHOWN · P PITOT · D DRAIN · O PORTS · A ALTERNATE · H HEAT", value: "", id: "readout2", size: "sm" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="airdots" patternUnits="userSpaceOnUse" width="2.6" height="2.6"><circle class="air-dot" cx="0.65" cy="0.65" r="0.5"/><circle class="air-dot" cx="1.95" cy="1.95" r="0.5"/></pattern>` +
  `<pattern id="icepat" patternUnits="userSpaceOnUse" width="3.4" height="3.4"><path class="ice-line" d="M0.5 1.7H2.9M1.7 0.5V2.9"/></pattern>` +
  `<pattern id="waterpat" patternUnits="userSpaceOnUse" width="3.6" height="1.8"><path class="water-dash" d="M0.3 0.9H2.6"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-B"><rect x="${KB.x}" y="${KB.y}" width="${KB.w}" height="${KB.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-D"><rect x="${KD.x}" y="${KD.y}" width="${KD.w}" height="${KD.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-plan"><rect x="28" y="30" width="${K.r2(V.plan.p([P.VIEW_FS[1], 0])[0] - 28)}" height="${K.r2(V.plan.p([0, -P.VIEW_WS])[1] - 30)}"/></clipPath>` +
  `<clipPath id="clip-side"><rect x="28" y="270" width="${K.r2(V.side.p([P.VIEW_FS[1], 0])[0] - 28)}" height="140"/></clipPath>` +
  `</defs>`;

const hits =
  `<rect class="hit" data-drag="knob" x="${K.r2(V.altF.p(P.KNOB)[0] - 16)}" y="${K.r2(V.altF.p(P.KNOB)[1] - 16)}" width="32" height="32"/>` +
  `<rect class="hit" data-drag="spool" x="${K.r2(V.E.p([P.AV.knob[0], 0])[0])}" y="${K.r2(V.E.p([0, 9])[1])}" width="${K.r2(32 * V.E.k)}" height="${K.r2(18 * V.E.k)}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of the pitot-static system of a four-seat high-wing light aircraft: the system schematic in plan and side elevation, the heated pitot head in section with its ram hole, drain hole, water dam and heater, the tail cone cut at the two cross-connected static ports, a port, a drain trap and the alternate static valve in section, and the airspeed indicator, the altimeter and the vertical speed indicator, each in section and from the front with half its dial broken away to show the capsule, rocking shaft, sector, pinion and hairspring. The tour climbs from 2000 to 6500 feet, cruises, then shows a blocked pitot with the drain open, a blocked pitot and drain, blocked static ports and the alternate static source, and descends. Keys P, D and O block the pitot, the drain and the ports; A opens the alternate source; H the pitot heat; the square brackets set the baro; the arrows fly." ` +
  `data-views='${JSON.stringify(VIEWS)}' data-live='${JSON.stringify(LIVE)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  planGeom + planBalloons + planLabel +
  sideGeom + sideBalloons + sideLabel +
  aGeom + aDims + aBalloons + aLabel +
  bGeom +
  cGeom + cDims + cBalloons + cLabel +
  dGeom +
  fGeom + fLabel +
  eGeom + eLabel +
  asiSec + altSec + vsiSec + instLabels + instBalloons +
  chartTas() + chartVsi() + pneumatics() +
  notes + bom + title + hits +
  `</svg>`;

const bar =
  `<span><kbd>P</kbd> pitot · <kbd>D</kbd> drain · <kbd>O</kbd> ports · <kbd>A</kbd> alternate · <kbd>H</kbd> heat · <kbd>[</kbd> <kbd>]</kbd> baro · drag the knob · <kbd>←</kbd> <kbd>→</kbd> speed · <kbd>↑</kbd> <kbd>↓</kbd> climb · <kbd>Space</kbd> tour · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "pitot-static.html"), {
  title: "Pitot-Static System",
  description: "A live engineering drawing of a light aircraft's pitot-static system: the heated pitot head, the cross-connected static ports, the drain traps and the alternate static source, and the airspeed indicator, altimeter and vertical speed indicator in section with their capsules, rocking shafts, sectors and pinions, all from one ISA model with the classic blockages.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet [data-drag]{cursor:grab}.bp-sheet .tint{fill:url(#airdots)}.bp-sheet .air-dot{fill:var(--bp-accent)}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet polyline.accent{fill:none}` +
    `.bp-sheet .air-line{fill:none;stroke:var(--bp-accent);stroke-width:2.2px;stroke-linejoin:round;stroke-linecap:round}.bp-sheet .air-line.st{stroke-dasharray:5 2.2}` +
    `.bp-sheet .ice{fill:url(#icepat);stroke:var(--bp-ink);stroke-width:.5px}.bp-sheet .ice-line{stroke:var(--bp-ink);stroke-width:.45px;fill:none}` +
    `.bp-sheet .water{fill:url(#waterpat)}.bp-sheet .water-dash{stroke:var(--bp-ink);stroke-width:.7px;fill:none}` +
    `.bp-sheet .beyond path{stroke-width:var(--bp-thin)}.bp-sheet .ice-x{stroke:var(--bp-accent);stroke-width:2.4px;fill:none;opacity:0}.bp-sheet .ice-x.on{opacity:1}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "../light-aircraft/model.mjs"), "A"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHARTS__", JSON.stringify({ CH, CT })),
});
console.log(`pitot-static.html  ${(size / 1024).toFixed(0)} KB  τ0 ${M.TAU0.toFixed(2)} s  V_pitot ${(M.V_PITOT * 1e6).toFixed(0)} cm³  V_static ${(M.V_STATIC * 1e6).toFixed(0)} cm³  TAS(110 kt, 6500 ft) ${s6500.toFixed(1)} kt  lines ${Math.round(M.LEN.pitot)} / ${Math.round(M.LEN.static)} mm`);
