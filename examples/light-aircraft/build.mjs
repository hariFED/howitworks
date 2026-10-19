// Builds light-aircraft.html: a live A2 general-arrangement drawing of a generic four-seat, high-wing,
// single-engine light aircraft, in third-angle projection: side elevation (forward fuselage in section),
// plan (port wing skin peeled over the tank) and front view at 1:50, the wing in Section A-A at 1:10,
// the airspeed indicator at 1:1 and the lift–airspeed diagram. The control surfaces, the lift and the
// readout all come from model.mjs.
//   node examples/light-aircraft/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as X from "./extra.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k50 = K.PX_PER_MM / 50;
const k10 = K.PX_PER_MM / 10;

// ---------------------------------------------------------------- views (sheet units)
const AA_LE = { x: 800, y: 392 }; // where Section A-A puts the leading edge
const aaWL = M.WL_LE + M.dihedralRise(P.AA_WS);
const VIEWS = {
  side: { x: 360, y: 625, scale: 1 / 50 },
  plan: { x: 360, y: 256, scale: 1 / 50 },
  front: { x: 680, y: 625, scale: 1 / 50 },
  AA: { x: AA_LE.x + M.LE_FS * k10, y: AA_LE.y + aaWL * k10, scale: 1 / 10 },
  C: { x: 1047, y: 132, scale: 1 },
};
const VS = K.view(VIEWS.side);
const VP = K.view(VIEWS.plan);
const VF = K.view(VIEWS.front);
const VA = K.view(VIEWS.AA);
const VC = K.view(VIEWS.C);
// a world point or a list of them into a view's (u, v)
const each = (f) => (x) => (Array.isArray(x[0]) ? x.map(f) : f(x));
const sv = each(([fs, wl]) => [-fs, wl]);
const pv = each(([fs, bl]) => [-fs, -bl]);
const fv = each(([bl, wl]) => [-bl, wl]);

const S0 = M.flight(110, 0, 0); // the drawing at rest: cruise, flaps up, wings level
const D0 = { elev: S0.elevator, rud: 0, flap: 0, ail: M.ailerons(0), psi: 0.35 };

// ---------------------------------------------------------------- SIDE ELEVATION
const wrap = (id, svg) => `<g id="${id}">${svg}</g>`;
const sideView =
  `<g data-geom="side">` +
  P.fuselageSide(VS) +
  P.finSide(VS) +
  wrap("s-rud", P.rudderSide(VS, D0.rud)) +
  P.stabSide(VS) +
  wrap("s-elev", P.elevatorSideP(VS, D0.elev)) +
  P.mountSide(VS) +
  P.batterySide(VS) +
  P.engineSide(VS) +
  P.controlsSide(VS) +
  P.panelSide(VS) +
  P.seatsSide(VS) +
  P.windscreenSide(VS) +
  P.cowlSide(VS) +
  P.noseGearSide(VS) +
  wrap("s-prop", P.propSide(VS, D0.psi)) +
  P.wingSide(VS) +
  wrap("s-flap", P.flapSide(VS, D0.flap)) +
  wrap("s-ail", P.aileronSide(VS, D0.ail.stbd)) +
  P.strutSide(VS) +
  P.mainGearSide(VS) +
  K.centerline(VS, sv([M.SPINNER.tip - 60, M.THRUST_WL]), sv([-120, M.THRUST_WL]), 0) +
  `<path class="thin" d="M${VS.p(sv([M.SPINNER.tip - 180, 0])).join(" ")}H${VS.p(sv([M.TAIL_TE_FS + 160, 0]))[0]}"/>` +
  `</g>` +
  `<g data-role="phantom">` +
  K.line(VS, sv([[M.PROP_FS, M.THRUST_WL - M.PROP_D / 2], [M.PROP_FS, M.THRUST_WL + M.PROP_D / 2]]), "phan") +
  K.line(VS, sv(P.surfOn(P.flapLocal(30), M.FLAP_WS[1])), "phan", true) +
  `</g>`;

// stations and principal dimensions below and beside the side elevation
const ground = VS.p([0, 0])[1];
const fsX = (fs) => VS.p(sv([fs, 0]))[0];
function stationRuler(y) {
  let ticks = "";
  let labels = "";
  for (let fs = -1000; fs <= 7000; fs += 1000) {
    const x = fsX(fs);
    ticks += `M${x} ${y - 3}V${y + 3}`;
    labels += `<text class="t t-sm" x="${x}" y="${y + 12}" text-anchor="middle">${fs}</text>`;
  }
  for (let fs = -500; fs <= 7000; fs += 1000) ticks += `M${fsX(fs)} ${y - 1.5}V${y + 1.5}`;
  // the CG range at MTOW, as a bar on the ruler with its symbol above
  const c0 = fsX(M.CG_AFT);
  const c1 = fsX(M.CG_FWD);
  return (
    `<g data-role="dim"><path class="thin" d="M${fsX(-1050)} ${y}H${fsX(7100)}${ticks}"/>${labels}` +
    `<text class="t t-sm" x="${fsX(7180)}" y="${y + 3}" text-anchor="end">FS</text>` +
    `<path class="solid" d="M${c0} ${y - 2.2}H${c1}V${y + 2.2}H${c0}Z"/></g>` +
    `<g data-role="label">${X.cgSymbol({ p: () => [fsX(M.CG_TOUR), y - 9] }, [0, 0], 4.2)}</g>`
  );
}
const finTopX = VS.p(sv([6330, 2700]));
const sideDims =
  K.dim(VS, sv([M.NOSE_GEAR.fs, M.NOSE_GEAR.tyreD / 2]), sv([M.MAIN_GEAR.fs, M.MAIN_GEAR.tyreD / 2]), { dir: "h", off: ground + 42 - VS.p(sv([M.NOSE_GEAR.fs, M.NOSE_GEAR.tyreD / 2]))[1] }) +
  K.dim(VS, sv([M.TAIL_TE_FS, 1700]), sv([M.SPINNER.tip, M.THRUST_WL]), { dir: "h", off: ground + 58 - VS.p(sv([M.TAIL_TE_FS, 1700]))[1] }) +
  K.dim(VS, sv([6800, 0]), sv([6600, M.FIN_TOP]), { dir: "v", off: 44 - VS.p(sv([6800, 0]))[0] }) +
  K.dim(VS, sv([M.PROP_FS, M.THRUST_WL - M.PROP_D / 2]), sv([M.PROP_FS, M.THRUST_WL + M.PROP_D / 2]), { dir: "v", off: 450 - VS.p(sv([M.PROP_FS, 0]))[0], prefix: "Ø" }) +
  stationRuler(ground + 78);

const sideBalloons =
  // above
  K.balloon(VS, sv([6950, 2250]), [92, 496], 13, { target: 13 }) +
  K.balloon(VS, sv([4300, 1400]), [178, 496], 1, { target: 1 }) +
  K.balloon(VS, sv([330, 1880]), [424, 508], 21, { target: 21 }) +
  K.balloon(VS, sv([-160, 1560]), [424, 528], 19, { target: 19 }) +
  // right of the nose
  K.balloon(VS, sv([-935, 1295]), [424, 548], 6, { target: 6 }) +
  K.balloon(VS, sv([-860, cowlTopAt(-860) - 12]), [424, 568], 8, { target: 8 }) +
  K.balloon(VS, sv([-470, 1060]), [424, 588], 5, { target: 5 }) +
  K.balloon(VS, sv([M.NOSE_GEAR.fs, 80]), [424, 608], 16, { target: 16 }) +
  // below
  K.balloon(VS, sv([6852, M.TAILPLANE.wl]), [77, 641], 12, { target: 12 }) +
  K.balloon(VS, sv([M.MAIN_GEAR.fs, 120]), [300, 645], 15, { target: 15 }) +
  K.balloon(VS, sv([1200, 1060]), [320, 645], 20, { target: 20 }) +
  K.balloon(VS, sv([577, 1450]), [340, 645], 10, { target: 10 }) +
  K.balloon(VS, sv([316, 1350]), [360, 645], 18, { target: 18 }) +
  K.balloon(VS, sv([-165, 1300]), [380, 645], 7, { target: 7 });
function cowlTopAt(fs) {
  return P.cowlTop(fs);
}

const sideLabel = K.viewLabel(240, 738, "SIDE ELEVATION", "FROM STARBOARD · FORWARD FUSELAGE IN SECTION ON CENTRELINE · SCALE 1:50");
const viewCArrow = "";

// ---------------------------------------------------------------- PLAN
const planView =
  `<g data-geom="plan">` +
  P.tailplanePlan(VP) +
  wrap("p-elev", P.elevatorPlan(VP, D0.elev)) +
  P.fuselagePlan(VP) +
  P.finPlan(VP) +
  wrap("p-rud", P.rudderPlan(VP, D0.rud)) +
  P.windscreenPlan(VP) +
  P.cowlPlan(VP) +
  P.wingPlan(VP) +
  P.tankPlan(VP) +
  wrap("p-flap", P.flapPlan(VP, D0.flap)) +
  wrap("p-ail", P.aileronPlan(VP, D0.ail.port, D0.ail.stbd)) +
  P.pitotPlan(VP) +
  P.hiddenPlan(VP) +
  wrap("p-prop", P.propPlan(VP, D0.psi)) +
  K.centerline(VP, pv([M.SPINNER.tip - 80, 0]), pv([M.TAIL_TE_FS + 80, 0]), 0) +
  `</g>`;
const wsY = (ws) => VP.p(pv([0, ws]))[1];
const tipLe = M.leAt(M.TIP_WS);
const planDims =
  K.dim(VP, pv([M.TE_FS, 0]), pv([M.TE_FS, M.FLAP_WS[0]]), { dir: "v", off: 250 - VP.p(pv([M.TE_FS, 0]))[0] }) +
  K.dim(VP, pv([M.TE_FS, 0]), pv([M.TE_FS, M.FLAP_WS[1]]), { dir: "v", off: 234 - VP.p(pv([M.TE_FS, 0]))[0] }) +
  K.dim(VP, pv([M.TE_FS, 0]), pv([M.TE_FS, M.TIP_WS]), { dir: "v", off: 218 - VP.p(pv([M.TE_FS, 0]))[0] }) +
  K.dim(VP, pv([M.TAILPLANE.te, -M.TAILPLANE.span / 2]), pv([M.TAILPLANE.te, M.TAILPLANE.span / 2]), { dir: "v", off: 40 - VP.p(pv([M.TAILPLANE.te, 0]))[0] });
void wsY;
void tipLe;
const planBalloons =
  K.balloon(VP, pv([2100, -4600]), [236, 66], 11, { target: 11 }) +
  K.balloon(VP, pv([1500, -3300]), [236, 120], 2, { target: 2 }) +
  K.balloon(VP, pv([6600, -1100]), [60, 150], 4, { target: 4 }) +
  K.balloon(VP, pv([P.PITOT.fs0 + 60, -P.PITOT.ws]), [420, 102], 17, { target: 17 }) +
  K.balloon(VP, pv([2100, -2000]), [236, 174], 14, { target: 14 }) +
  K.balloon(VP, pv([1400, -1200]), [236, 228], 9, { target: 9 });
const planMarks =
  X.cuttingPlane(VP, pv([M.LE_FS - 160, -P.AA_WS]), pv([M.TE_FS + 220, -P.AA_WS]), [0, -1], "A") +
  K.viewLabel(136, 48, "PLAN", "SKIN BROKEN AWAY OVER TANK · 1:50");

// ---------------------------------------------------------------- FRONT VIEW
const frontView =
  `<g data-geom="front">` +
  P.tailFront(VF) +
  wrap("f-elev", P.elevatorFront(VF, D0.elev)) +
  wrap("f-rud", P.rudderFront(VF, D0.rud)) +
  P.fuselageFront(VF) +
  P.windscreenFront(VF) +
  P.wingFront(VF) +
  wrap("f-flap", P.flapFront(VF, D0.flap)) +
  wrap("f-ail", P.aileronFront(VF, D0.ail.port, D0.ail.stbd)) +
  P.strutFront(VF) +
  P.mainGearFront(VF) +
  P.noseGearFront(VF) +
  P.cowlFront(VF) +
  P.pitotFront(VF) +
  wrap("f-prop", P.propFront(VF, D0.psi)) +
  K.centerline(VF, fv([0, 80]), fv([0, 2780]), 0) +
  `<path class="thin" d="M${VF.p(fv([M.TIP_WS + 150, 0])).join(" ")}H${VF.p(fv([-M.TIP_WS - 150, 0]))[0]}"/>` +
  `</g>` +
  `<g data-role="phantom">${K.line(VF, fv(K.circle(0, M.THRUST_WL, M.PROP_D / 2, 72)), "phan", true)}</g>`;
const frontDims =
  K.dim(VF, fv([M.MAIN_GEAR.track / 2, 0]), fv([-M.MAIN_GEAR.track / 2, 0]), { dir: "h", off: 20 }) +
  K.dim(VF, fv([M.TIP_WS, P.wingLowAt(M.TIP_WS)]), fv([-M.TIP_WS, P.wingLowAt(M.TIP_WS)]), { dir: "h", off: ground + 36 - VF.p(fv([M.TIP_WS, P.wingLowAt(M.TIP_WS)]))[1] });
const strutWL = (ws) => P.STRUT.wl0 + ((ws - M.CABIN.half) / (P.STRUT.ws1 - M.CABIN.half)) * (P.strutTopWL() - P.STRUT.wl0);
const frontBalloons = K.balloon(VF, fv([-1900, strutWL(1900)]), [870, 596], 3, { target: 3 });
const frontLabel = K.viewLabel(680, 694, "FRONT VIEW", "FROM AHEAD · PORT ON THE RIGHT · SCALE 1:50");

// ---------------------------------------------------------------- SECTION A-A: the wing at WS 1500, 1:10
function aaGeom(flap) {
  const s = P.sectionAA(VA, flap);
  return s;
}
const AA0 = aaGeom(D0.flap);
const track = P.flapTrack();
const acPt = M.toWing([0.25, 0.02], M.ROOT_CHORD, M.LE_FS, aaWL); // where the lift arrow starts
export const LIFT_K = 3.3; // sheet units per kN
const sectionAAView =
  `<g data-geom="AA">` +
  `<g data-part="2">${K.body(VA, sv(track.bracket))}</g>` +
  AA0.wingBack +
  AA0.tank +
  AA0.wing +
  wrap("aa-flap", AA0.flap) +
  `<g data-role="phantom">${K.line(VA, sv(P.surfOn(P.flapLocal(30), P.AA_WS)), "phan", true)}</g>` +
  `<path class="ctr" d="${K.d(VA, sv(track.slot), false)}"/>` +
  wrap("aa-roller", `<g data-part="14">${P.rollerCircle(VA, 0)}</g>`) +
  K.line(VA, sv([[M.LE_FS - 140, aaWL + 140 * Math.sin((M.INCIDENCE * Math.PI) / 180)], [M.TE_FS + 60, aaWL - (M.ROOT_CHORD + 60) * Math.sin((M.INCIDENCE * Math.PI) / 180)]]), "ctr") +
  `</g>`;
const aaDims = K.dim(VA, sv([M.TE_FS, aaWL]), sv([M.LE_FS, aaWL]), { dir: "h", off: -46 });
const aaBalloons = "";
const aaLabel = K.viewLabel(660, 490, "SECTION A-A", "WING AT WS 1500, LOOKING OUTBOARD · NACA 2412 · SCALE 1:10");

// ---------------------------------------------------------------- VIEW C: airspeed indicator, 1:1
const ASI = P.ASI;
const asiAngle = P.asiAngle;
function asiBand(v0, v1, r0, r1) {
  const a = asiAngle(v0);
  const b = asiAngle(v1);
  return [...K.arc(0, 0, r1, a, b, Math.max(3, Math.ceil(Math.abs(a - b) / 4))), ...K.arc(0, 0, r0, b, a, Math.max(3, Math.ceil(Math.abs(a - b) / 4)))];
}
function asiFace(V) {
  const vs0 = M.stallSpeed(30);
  const vs1 = M.stallSpeed(0);
  let out = K.body(V, K.circle(0, 0, ASI.r, 72)) + K.line(V, K.circle(0, 0, ASI.r - 3, 72), "vis", true);
  out += K.cut(V, asiBand(vs1, M.V_SPEEDS.vno, 33.4, 35.6), { mat: "solid" });
  out += K.line(V, asiBand(vs0, M.V_SPEEDS.vfe, 31.0, 32.8), "thin", true);
  out += K.cut(V, asiBand(M.V_SPEEDS.vno, M.V_SPEEDS.vne, 33.4, 35.6), { mat: "steel", angle: 45 });
  const red = asiAngle(M.V_SPEEDS.vne) * (Math.PI / 180);
  out += K.cut(V, X.rot(K.rect(30.4, -0.6, 36.6, 0.6), [0, 0], asiAngle(M.V_SPEEDS.vne)), { mat: "solid" });
  void red;
  const ticks = [];
  for (let v = 30; v <= 170; v += 5) {
    const a = (asiAngle(v) * Math.PI) / 180;
    const r0 = v % 20 === 0 ? 27 : 28.6;
    ticks.push([[r0 * Math.cos(a), r0 * Math.sin(a)], [30.6 * Math.cos(a), 30.6 * Math.sin(a)]]);
  }
  out += K.lines(V, ticks, "thin");
  let nums = "";
  for (let v = 40; v <= 160; v += 20) {
    const a = (asiAngle(v) * Math.PI) / 180;
    const [x, y] = V.p([21.5 * Math.cos(a), 21.5 * Math.sin(a)]);
    nums += `<text class="t t-sm" x="${x}" y="${K.r2(y + 2.7)}" text-anchor="middle">${v}</text>`;
  }
  const [kx, ky] = V.p([0, -12]);
  nums += `<text class="t t-sm" x="${kx}" y="${ky}" text-anchor="middle">KNOTS</text>`;
  return P.part(18, out) + `<g data-role="engraved">${nums}</g>`;
}
const viewC =
  `<g data-geom="C">${asiFace(VC)}<g id="asi-needle">${P.asiNeedle(VC, 110)}</g></g>` +
  K.dim(VC, [-ASI.r, 0], [ASI.r, 0], { dir: "h", off: ASI.r * VC.k + 14, prefix: "Ø" }) +
  K.viewLabel(1047, 260, "AIRSPEED INDICATOR", "ON PANEL 18, AS THE PILOT SEES IT · SCALE 1:1");

// ---------------------------------------------------------------- DIAGRAM 1: lift against airspeed
const CH = { x0: 488, x1: 888, y0: 52, y1: 232, v0: 30, v1: 130, l1: 24 };
const chX = (v) => K.r2(CH.x0 + ((v - CH.v0) / (CH.v1 - CH.v0)) * (CH.x1 - CH.x0));
const chY = (kn) => K.r2(CH.y1 - (Math.min(CH.l1, Math.max(0, kn)) / CH.l1) * (CH.y1 - CH.y0));
export function liftCurve(f) {
  const pts = [];
  for (let v = CH.v0; v <= CH.v1; v += 1) {
    const L = M.liftMax(v, f) / 1000;
    if (L > CH.l1) {
      const vPrev = v - 1;
      const v1 = vPrev + (CH.l1 - M.liftMax(vPrev, f) / 1000) / (L - M.liftMax(vPrev, f) / 1000);
      pts.push(`${chX(v1)},${chY(CH.l1)}`);
      break;
    }
    pts.push(`${chX(v)},${chY(L)}`);
  }
  return pts.join(" ");
}
function chart() {
  let grid = "";
  let labels = "";
  for (let l = 0; l <= CH.l1; l += 4) {
    grid += `M${CH.x0} ${chY(l)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 6}" y="${K.r2(chY(l) + 2.7)}" text-anchor="end">${l}</text>`;
  }
  for (let v = CH.v0; v <= CH.v1; v += 10) {
    grid += `M${chX(v)} ${CH.y0}V${CH.y1}`;
    labels += `<text class="t t-sm" x="${chX(v)}" y="${CH.y1 + 11}" text-anchor="middle">${v}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 24}" text-anchor="middle">AIRSPEED V, kt CAS</text>`;
  labels += `<text class="t t-sm t-mute" x="458" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 458 ${(CH.y0 + CH.y1) / 2})">LIFT L, kN</text>`;
  let curves = "";
  for (const f of M.FLAP_STOPS) curves += `<polyline class="thin" points="${liftCurve(f)}"/>`;
  // the outer curves named where they leave the top: flap 30° on the left, flap 0° on the right
  labels += `<text class="t t-sm" x="${chX(M.stallSpeed(30, (CH.l1 * 1000) / M.W)) - 3}" y="${CH.y0 - 4}" text-anchor="end">FLAP 30°</text>`;
  labels += `<text class="t t-sm" x="${chX(M.stallSpeed(0, (CH.l1 * 1000) / M.W)) + 3}" y="${CH.y0 - 4}" text-anchor="start">0°</text>`;
  const W = M.W / 1000;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    curves +
    `<path class="thin" d="M${CH.x0} ${chY(W)}H${CH.x1}"/>` +
    `<text class="t t-sm" x="${CH.x1 - 4}" y="${chY(W) + 10}" text-anchor="end">W = ${W.toFixed(1)} kN</text>` +
    `<path id="ch-need" class="hid" d="M${CH.x0} ${chY(W)}H${CH.x1}"/>` +
    `<path id="ch-vs" class="hid" d="M${chX(53)} ${chY(W)}V${CH.y1}"/>` +
    `<polyline id="ch-cur" class="vis accent" points="${liftCurve(0)}"/>` +
    `<circle id="ch-dot" class="accent-fill" cx="${chX(110)}" cy="${chY(W)}" r="2.8"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `<rect class="hit" data-drag="chart" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 282, "DIAGRAM 1", "MAXIMUM LIFT ½ρV²S·C_L,MAX BY FLAP · ACCENT: THIS FLAP · DASHED: n·W NEEDED")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "FUSELAGE, SEMI-MONOCOQUE", "2024-T3 ALCLAD", "1"],
  ["2", "WING, NACA 2412, 2 SPARS", "2024-T3 ALCLAD", "2"],
  ["3", "WING STRUT, STREAMLINE", "6061-T6", "2"],
  ["4", "FIN AND TAILPLANE", "2024-T3 ALCLAD", "1"],
  ["5", "ENGINE FLAT-4, 120 kW", "BOUGHT OUT", "1"],
  ["6", "PROPELLER Ø1905, 2-BLADE", "2025-T6 FORGED", "1"],
  ["7", "ENGINE MOUNT", "4130 STEEL TUBE", "1"],
  ["8", "COWLING", "GFRP / 2024-T3", "1"],
  ["9", "FUEL TANK, 106 L", "5052-H32", "2"],
  ["10", "CONTROL WHEEL, CABLES", "4130, 7×19 CABLE", "SET"],
  ["11", "AILERON, DIFFERENTIAL", "2024-T3", "2"],
  ["12", "ELEVATOR WITH TRIM TAB", "2024-T3", "1"],
  ["13", "RUDDER", "2024-T3", "1"],
  ["14", "FLAP, SINGLE-SLOTTED", "2024-T3", "2"],
  ["15", "MAIN GEAR, SPRING LEG", "6150 STEEL", "2"],
  ["16", "NOSE GEAR, OLEO 5.00-5", "4130 / 2024-T4", "1"],
  ["17", "PITOT HEAD, HEATED", "BOUGHT OUT", "1"],
  ["18", "INSTRUMENT PANEL", "2024-T3", "1"],
  ["19", "BATTERY 24 V 13.6 Ah", "BOUGHT OUT", "1"],
  ["20", "SEAT", "4130 / PU FOAM", "4"],
  ["21", "WINDSCREEN AND WINDOWS", "PMMA 6 mm", "SET"],
];
const TB = { x: 800, y: 708, w: 376, h: 116 };
const BX = 918;
const bomTop = TB.y - (18 + BOM.length * 16);
const bom = K.table(
  BX,
  bomTop,
  [
    { w: 24, align: "center", title: "ITEM" },
    { w: 130, title: "DESCRIPTION" },
    { w: 80, title: "MATERIAL" },
    { w: 24, align: "center", title: "QTY" },
  ],
  BOM
);

const notes = K.notes(32, 764, "NOTES", [
  `GENERAL ARRANGEMENT, THIRD-ANGLE PROJECTION. FS AFT OF DATUM (FIREWALL FRONT FACE), WL ABOVE GROUND AT REST, WS FROM CENTRELINE. DIMENSIONS mm.`,
  `WING NACA 2412, S ${M.S.toFixed(1)} m², AR ${M.AR.toFixed(1)}, MAC ${Math.round(M.MAC)} AT FS ${Math.round(M.LEMAC)}, INCIDENCE ${M.INCIDENCE}°, DIHEDRAL ${M.DIHEDRAL}°. CG AT MTOW ${M.MTOW} kg: FS ${M.CG_FWD}–${M.CG_AFT} (${Math.round(M.pctMAC(M.CG_FWD))}–${Math.round(M.pctMAC(M.CG_AFT))} % MAC).`,
  `STEADY LEVEL COORDINATED FLIGHT, ISA SEA LEVEL: L = ½ρV²S·C_L = n·W, n = 1/cos φ. C_L,MAX FROM PUBLISHED STALL SPEEDS ${M.VS_PUBLISHED[0]} / ${M.VS_PUBLISHED[10]} / ${M.VS_PUBLISHED[30]} kt CAS (FLAP 0 / 10 / 30°).`,
  `ELEVATOR FROM C_m = 0, AILERON ROLL RATE AND COORDINATING RUDDER FROM TYPICAL CLASS DERIVATIVES. ASI ARCS FROM THE MODEL'S STALL SPEEDS.`,
], 12);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 280, h: 32, label: "TITLE", value: "LIGHT AIRCRAFT · G.A.", size: "lg" },
  { x: 280, y: 0, w: 96, h: 32, label: "DWG NO", value: "BP-022", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:50" },
  { x: 64, y: 32, w: 40, h: 25, label: "SIZE", value: "A2" },
  { x: 104, y: 32, w: 48, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 152, y: 32, w: 58, h: 25, label: "PROJ.", value: "" },
  { x: 210, y: 32, w: 70, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 96, h: 25, label: "DATE", value: "2026-10-18" },
  { x: 0, y: 57, w: 124, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 124, y: 57, w: 104, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 228, y: 57, w: 148, h: 25, label: "UNITS", value: "mm · kt · kN · deg" },
  { x: 0, y: 82, w: 376, h: 34, label: "LIVE · ↑ ↓ AIRSPEED · F FLAPS · ← → BANK · DRAG THE DIAGRAM", value: "", id: "readout" },
]);
const projSymbol = `<g data-role="title">${X.thirdAngle(TB.x + 152 + 14, TB.y + 32 + 11, 10)}</g>`;

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `</defs>`;

// live overlays on Section A-A: the relative wind, the lift and the angles
export const AA_LIVE = { ac: acPt, k: LIFT_K, le: [M.LE_FS, aaWL] };

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="General-arrangement drawing of a four-seat high-wing light aircraft in side elevation, plan and front view, with the wing in section. Arrow keys change airspeed and bank, F steps the flaps; the control surfaces, the lift arrow, the lift diagram and the airspeed indicator follow a lift model." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  planView +
  planDims +
  planBalloons +
  planMarks +
  sideView +
  sideDims +
  sideBalloons +
  sideLabel +
  viewCArrow +
  frontView +
  frontDims +
  frontBalloons +
  frontLabel +
  sectionAAView +
  `<g id="aa-live"></g>` +
  aaDims +
  aaBalloons +
  aaLabel +
  viewC +
  chart() +
  notes +
  bom +
  title +
  projSymbol +
  `</svg>`;

const bar =
  `<span><kbd>↑</kbd> <kbd>↓</kbd> airspeed · <kbd>F</kbd> flaps · <kbd>←</kbd> <kbd>→</kbd> bank · drag the diagram · <kbd>Space</kbd> tour · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "light-aircraft.html"), {
  title: "Light Aircraft Arrangement",
  description: "A live general-arrangement drawing of a four-seat high-wing light aircraft: the control surfaces move, and the lift, angle of attack and stall speed come from L = ½ρV²SC_L.",
  svg,
  bar,
  css: `.bp-sheet .hit{fill:transparent;cursor:ew-resize}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "extra.mjs"), "X"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHART__", JSON.stringify(CH)).replace("__ASI__", JSON.stringify(ASI)).replace("__AA__", JSON.stringify(AA_LIVE)),
});
console.log(`light-aircraft.html  ${(size / 1024).toFixed(0)} KB  S ${M.S.toFixed(2)} m²  MAC ${M.MAC.toFixed(0)}  Vs ${M.stallSpeed(0).toFixed(1)}/${M.stallSpeed(30).toFixed(1)} kt`);
