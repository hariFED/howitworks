// Builds fuel-system.html: a live A2 drawing of a light aircraft's gravity-feed fuel system: the system
// schematic in the parent aircraft's plan and side outlines, the port tank in section with its vent,
// finger strainer and sump, the selector valve in plan and axial section, the strainer (gascolator)
// and the primer in section, the gauge and the selector's placard, and two diagrams.
//   node examples/fuel-system/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const kk = (scale) => scale * K.PX_PER_MM;

// ---------------------------------------------------------------- views
const VIEWS = {
  plan: { x: 294.5, y: 236, scale: 0.05 },
  side: { x: 294.5, y: 702.8, scale: 0.05 },
  B: { x: 1201.6, y: 957.9, scale: 0.2 },
  D: { x: 536, y: 442.8, scale: 1 },
  C: { x: 748, y: 477, scale: 1 },
  G: { x: 748, y: 662, scale: 0.5 },
  J: { x: 2679, y: 4404.2, scale: 1 },
  E: { x: 112, y: 735, scale: 1 },
  F: { x: 932, y: 240, scale: 1 },
  H: { x: 1082, y: 240, scale: 0.5 },
};
const VP = K.view(VIEWS.plan);
const VS = K.view(VIEWS.side);
const VB = K.view(VIEWS.B);
const VD = K.view(VIEWS.D);
const VC = K.view(VIEWS.C);
const VG = K.view(VIEWS.G);
const VE = K.view(VIEWS.E);
const VF = K.view(VIEWS.F);
const VH = K.view(VIEWS.H);
const VJ = K.view(VIEWS.J);
const S0 = M.tourStart();

// ---------------------------------------------------------------- PLAN: the system schematic
const RL = M.ROUTE.L;
const RR = M.ROUTE.R;
const RC = M.COMMON;
const planGeom =
  `<g data-geom="plan" clip-path="url(#clip-plan)"><g data-role="phantom">${P.airframePlan(VP)}</g>` +
  P.part(1, P.tankPlan(VP, -1) + P.tankPlan(VP, 1)) +
  P.part(2, P.fillerPlan(VP, -1) + P.fillerPlan(VP, 1)) +
  P.part(6, K.line(VP, P.pv(P.ventPlanPts(-1)), "hid") + K.line(VP, P.pv(P.ventPlanPts(1)), "hid")) +
  P.part(8, P.lineSym(VP, RL, "pl-L", true) + P.lineSym(VP, RR, "pl-R", true)) +
  P.part(14, P.lineSym(VP, RC.slice(0, 5), "pl-C", true)) +
  P.part(22, P.lineSym(VP, RC.slice(4), "pl-C2", true)) +
  P.part(9, P.selectorSym(VP, true)) +
  P.part(15, P.shutoffSym(VP, true)) +
  P.part(16, P.strainerSym(VP, true)) +
  P.part(23, P.carbSym(VP, true)) +
  P.part(24, P.primerSym(VP, true)) +
  P.part(27, P.primerRoute().map((r) => K.line(VP, P.pv(P.route2(r, true)), "thin")).join("")) +
  K.centerline(VP, [-VIEW_FS(0) + 60, 0], [-VIEW_FS(1) + 30, 0], 0) +
  `</g>` +
  `<g data-role="label">${P.breaksPlan(VP)}</g>`;
function VIEW_FS(i) {
  return P.VIEW_FS[i];
}
const planBalloons =
  K.balloon(VP, [-905, 620], [250, 196], 8, { target: 8 }) +
  K.balloon(VP, [-400, 0], [270, 216], 14, { target: 14 });
const planLabel = K.viewLabel(222, 440, "PLAN", "SYSTEM SCHEMATIC IN THE AIRCRAFT'S OUTLINE · LINES NTS · 1:20");

// ---------------------------------------------------------------- SIDE: from starboard
const levelR0 = M.levelAt(M.FULL);
const sideGeom =
  `<g data-geom="side"><g data-role="phantom">${P.airframeSide(VS)}</g>` +
  P.part(1, K.cut(VS, P.sv(P.tankSidePts()), { mat: "solid" }).replace('class="solid"', 'class="paper"') + `<path id="tank-side" class="tint" d="${K.d(VS, P.sv(P.tankSideFuel(levelR0)))}"/>` + K.line(VS, P.sv(P.tankSidePts()), "vis", true)) +
  P.part(6, K.line(VS, P.sv([[M.FS_B, M.wingAt(M.FS_B, M.VENT.ws)[0]], [M.FS_B, M.wingAt(M.FS_B, M.VENT.ws)[0] - 46], [M.FS_B - 110, M.wingAt(M.FS_B, M.VENT.ws)[0] - 46]]), "vis")) +
  P.part(8, P.lineSym(VS, RR, "sd-R", false)) +
  P.part(14, P.lineSym(VS, RC.slice(0, 5), "sd-C", false)) +
  P.part(22, P.lineSym(VS, RC.slice(4), "sd-C2", false)) +
  P.part(9, P.selectorSym(VS, false)) +
  P.part(15, P.shutoffSym(VS, false)) +
  P.part(16, P.strainerSym(VS, false)) +
  P.part(23, P.carbSym(VS, false)) +
  P.part(24, P.primerSym(VS, false)) +
  P.part(28, P.gaugeSym(VS)) +
  P.part(27, P.primerRoute().map((r) => K.line(VS, P.sv(P.route2(r, false)), "thin")).join("")) +
  `</g>` +
  `<g data-role="label">${P.breaksSide(VS)}</g>`;
const DIM_H_X = 412;
const dimHead = (level) => K.dim(VS, [-M.CARB.fs, M.CARB.wl], [-M.TANK.fs0, level], { dir: "v", off: DIM_H_X - VS.p([-M.CARB.fs, 0])[0], text: `h ${Math.round(level - M.CARB.wl)}`, id: "dim-h" });
const sideBalloons =
  K.balloon(VS, [-80, 790 + 12], [270, 648], 15, { target: 15 }) +
  K.balloon(VS, [-(M.CARB.fs + 60) , 846], [300, 648], 22, { target: 22 }) +
  K.balloon(VS, [-(P.CARB_BOX.fs0 + 60), 900], [356, 648], 23, { target: 23 });
const sideLabel = K.viewLabel(150, 654, "SIDE ELEVATION", "FROM STARBOARD · 1:20");

// ---------------------------------------------------------------- SECTION B-B: the port tank
const levelL0 = M.levelAt(M.FULL);
const tankB =
  `<g data-geom="B"><g data-role="phantom">${P.wingB(VB)}</g>` +
  `<g data-role="fluid"><path id="b-fuel" class="tint" d="${K.d(VB, P.fuelPoly(levelL0, 0))}"/><path id="b-air" class="tint air" d="${K.d(VB, P.ullagePoly(levelL0, 0))}"/></g>` +
  P.part(1, P.tankShell(VB) + P.outletFitting(VB)) +
  `<g data-role="fluid"><path class="paper" d="${K.d(VB, P.bv(K.rect(M.TANK.ws0 - M.TANK.wall - 14, M.OUTLET_WL - 4.8, M.TANK.ws0 + 1, M.OUTLET_WL + 4.8)))}"/><path id="b-out" class="tint" d="${K.d(VB, P.bv(K.rect(M.TANK.ws0 - M.TANK.wall - 14, M.OUTLET_WL - 4.8, M.TANK.ws0 + 1, M.OUTLET_WL + 4.8)))}"/></g>` +
  P.fingerStrainer(VB) +
  P.part(8, P.tubeCut(VB, P.bv(P.feedB()), 4.76, 3.88) + `<g data-role="fluid"><path id="b-feed" class="tint" d="${K.d(VB, P.offsetLine(P.bv(P.feedB()), -3.88, 3.88))}"/></g>`) +
  P.filler(VB) +
  P.sumpDrain(VB) +
  `<g id="b-sender">${P.sender(VB, P.senderAngle(levelL0, 0))}</g>` +
  P.ventLine(VB) +
  `<g data-role="fluid">${P.ventBore().map((b, i) => `<path id="b-vent${i}" class="tint air" d="${K.d(VB, P.offsetLine(P.bv(b), -3.88, 3.88))}"/>`).join("")}<path id="b-check" class="tint air" d="${K.d(VB, P.checkBore())}"/></g>` +
  P.checkValve(VB) +
  `<g data-role="fluid" id="b-block" style="display:none">${K.cut(VB, P.bv(K.circle(M.VENT.ws, M.wingAt(M.FS_B, M.VENT.ws)[0] - 46, 3.6, 14)), { mat: "solid" })}</g>` +
  `</g>` +
  K.breakLine(VB, [-(P.B_WS[0] - 26), M.OUTLET_WL - 9], [-(P.B_WS[0] - 26), M.OUTLET_WL + 9]);
const bBalloons =
  K.balloon(VB, [-1600, P.hi(1600) + 0.5], [600, 36], 1, { target: 1 }) +
  K.balloon(VB, [-(M.FILLER.ws + 33), M.wingAt(M.FS_B, M.FILLER.ws)[1]], [640, 36], 2, { target: 2 }) +
  K.detailMark(VB, [-945, 2040], 42, "J", -30) +
  K.balloon(VB, [-(M.TANK.ws1 + 12), P.SEND.wl], [428, 76], 5, { target: 5 }) +
  K.balloon(VB, [-(M.VENT.ws - 4.3), M.wingAt(M.FS_B, M.VENT.ws)[0] - 25], [428, 144], 6, { target: 6 }) +
  K.balloon(VB, [-(M.VENT.ws + 8), P.CHECK.wl0 + 14], [428, 110], 7, { target: 7 });
const bLabel = K.viewLabel(640, 176 + 12, "SECTION B-B", "PORT TANK AT FS 1150 · LOOKING FORWARD · 1:5");

// ---------------------------------------------------------------- DETAIL J: the outlet and the sump, 1:1
const J = { x: 708, y: 212, w: 136, h: 142 };
const detailJ =
  `<g data-geom="J" clip-path="url(#clip-J)"><rect class="paper" x="${J.x}" y="${J.y}" width="${J.w}" height="${J.h}"/>` +
  `<g data-role="phantom">${P.wingB(VJ)}</g>` +
  `<g data-role="fluid"><path id="j-fuel" class="tint" d="${K.d(VJ, P.fuelPoly(levelL0, 0))}"/></g>` +
  P.part(1, P.tankShell(VJ) + P.outletFitting(VJ)) +
  `<g data-role="fluid"><path class="paper" d="${K.d(VJ, P.bv(K.rect(M.TANK.ws0 - M.TANK.wall - 14, M.OUTLET_WL - 4.8, M.TANK.ws0 + 1, M.OUTLET_WL + 4.8)))}"/><path id="j-out" class="tint" d="${K.d(VJ, P.bv(K.rect(M.TANK.ws0 - M.TANK.wall - 14, M.OUTLET_WL - 4.8, M.TANK.ws0 + 1, M.OUTLET_WL + 4.8)))}"/></g>` +
  P.fingerStrainer(VJ) +
  P.part(8, P.tubeCut(VJ, P.bv(P.feedB()), 4.76, 3.88) + `<g data-role="fluid"><path id="j-feed" class="tint" d="${K.d(VJ, P.offsetLine(P.bv(P.feedB()), -3.88, 3.88))}"/></g>`) +
  P.sumpDrain(VJ) +
  K.centerline(VJ, [-(M.TANK.ws0 - 30), M.OUTLET_WL], [-(M.TANK.ws0 + 70), M.OUTLET_WL], 0) +
  `</g><rect class="thin" x="${J.x}" y="${J.y}" width="${J.w}" height="${J.h}" rx="10"/>` +
  K.dim(VJ, [-(M.TANK.ws0 + 40), P.lo(M.TANK.ws0 + 40)], [-(M.TANK.ws0 + 40), M.OUTLET_WL - M.STRAINER_R], { dir: "v", off: J.x - 8 - VJ.p([-(M.TANK.ws0 + 40), 0])[0] }) +
  K.balloon(VJ, [-953.5, M.OUTLET_WL + M.STRAINER_R], [694, 236], 3, { target: 3 }) +
  K.balloon(VJ, [-(P.SUMP_WS + 5), P.lo(P.SUMP_WS) - 6], [828, 366], 4, { target: 4 }) +
  K.viewLabel(J.x + J.w / 2, J.y + J.h + 22, "DETAIL J", "OUTLET AND SUMP · 1:1");

// ---------------------------------------------------------------- SECTION C-C: the selector in plan
const selC =
  `<g data-geom="C">` +
  P.selBody(VC) +
  P.part(8, P.portFitting(VC, "L") + P.portFitting(VC, "R") + ["L", "R"].map((s) => P.tubeCut(VC, P.portLine(s, P.SEL.fit, 66), 4.76, 3.88)).join("") + `<g data-role="fluid">${["L", "R"].map((s) => `<path id="c-line-${s}" class="tint" d="${K.d(VC, P.offsetLine(P.portLine(s, P.SEL.lug - 0.5, 66), -3.88, 3.88))}"/>`).join("")}</g>`) +
  `<g id="c-rotor">` + `<g data-role="fluid"><path id="c-win" class="tint" d="${K.d(VC, P.windowShape())}"/></g>` + P.rotorPlan(VC) + `</g>` +
  K.centerMark(VC, [0, 0], 22) +
  `</g>` +
  ["L", "R"].map((s) => K.breakLine(VC, ...P.portLine(s, 64, 68).map((p, i) => [p[0] + (i ? 1 : -1) * 6 * P.portAxis(s)[1], p[1] - (i ? 1 : -1) * 6 * P.portAxis(s)[0]]))).join("");
const cBalloons = K.balloon(VC, [26, -8], [826, 545], 9, { target: 9 }) + `<g id="lb-10"></g>`;
const LIVE = { 10: { at: [668, 545] } };
const cLabel = K.viewLabel(748, 566, "SECTION C-C", "SELECTOR, PORTS' PLANE, FROM ABOVE · 1:1");

// ---------------------------------------------------------------- SECTION G-G: the selector, axial
const selG =
  `<g data-geom="G">` +
  `<g data-role="phantom">${K.line(VG, P.gv(P.floorG()), "phan", true)}<g id="g-handle">${P.handlePhantom(VG, M.POS.BOTH)}</g></g>` +
  P.selBodyAxial(VG) +
  P.coverPlate(VG) +
  `<g data-role="fluid"><path id="g-centre" class="tint" d="${K.d(VG, P.ggCentre())}"/><path id="g-out" class="tint" d="${K.d(VG, P.ggBore())}"/><g id="g-win"></g></g>` +
  `<g id="g-rotor"></g>` +
  P.orings(VG) +
  P.detent(VG) +
  P.shaftHandle(VG, 0) +
  P.part(14, P.tubeCut(VG, P.gv([[0, P.GG.bodyBot - 0.2], [0, P.GG.bodyBot - 14]]), 4.76, 3.88)) +
  K.centerline(VG, [0, P.GG.bodyBot - 16], [0, P.GG.handle + 6], 0) +
  `</g>`;
const gBalloons =
  K.balloon(VG, [-(P.ROT.r - 1.3), P.ORING_Z[0]], [672, 652], 11, { target: 11 }) +
  K.balloon(VG, [-12, P.GG.bodyTop + 1.6], [672, 622], 12, { target: 12 });
const gLabel = K.viewLabel(748, 712, "SECTION G-G", "SELECTOR, AXIAL, LEFT PORT'S AXIS · 1:2");

// ---------------------------------------------------------------- SECTION D-D: the strainer
const W0 = M.waterHeight(0);
const gasc =
  `<g data-geom="D">` +
  `<g data-role="fluid"><path id="d-bowl" class="tint" d="${K.d(VD, [[-P.BOWL_IN.r, P.BOWL_IN.z0], [P.BOWL_IN.r, P.BOWL_IN.z0], [P.BOWL_IN.r, P.BOWL_IN.z1], [-P.BOWL_IN.r, P.BOWL_IN.z1]])}"/>` +
  `<path id="d-water" class="tint water" d=""/><path id="d-water-top" class="thin" d=""/><g id="d-drops"></g></g>` +
  P.casting(VD) +
  P.castingPassages().map((q) => `<path class="paper" d="${K.d(VD, q)}"/>`).join("") +
  `<g data-role="fluid">${P.castingPassages().map((q, i) => `<path id="d-pass${i}" class="tint" d="${K.d(VD, q)}"/>`).join("")}</g>` +
  P.castingPassages().map((q, i) => (i === 1 ? K.line(VD, [q[0], q[3]]) + K.line(VD, [q[1], q[2]]) : i === 2 ? K.line(VD, [q[0], q[3]]) + K.line(VD, [q[1], q[2]]) : i === 4 ? K.line(VD, [q[0], q[3]]) + K.line(VD, [q[1], q[2]]) : K.line(VD, [q[0], q[1]]) + K.line(VD, [q[3], q[2]]))).join("") +
  P.bowl(VD) +
  P.gasket(VD) +
  P.nut(VD) +
  P.screen(VD) +
  `<g data-role="fluid"><path class="paper" d="${K.d(VD, P.drainBore())}"/><path id="d-drain" class="tint" d="${K.d(VD, P.drainBore())}"/></g>` +
  `<g id="d-valve">${P.drainValve(VD, 0)}</g>` +
  P.part(14, P.gsFitting(VD, -1) + P.tubeCut(VD, P.gsLine(-1), 4.76, 3.88)) +
  P.part(22, P.gsFitting(VD, 1) + P.tubeCut(VD, P.gsLine(1), 4.76, 3.88)) +
  `<g data-role="fluid">${[-1, 1].map((sg) => `<path id="d-line${sg < 0 ? "L" : "R"}" class="tint" d="${K.d(VD, P.offsetLine(P.gsLine(sg), -3.88, 3.88))}"/>`).join("")}</g>` +
  P.part(27, P.tubeCut(VD, [[P.GS.xp, P.GS.top], [P.GS.xp, P.GS.top + 8]], 1.59, 1.0)) +
  K.centerline(VD, [0, -122], [0, 40], 0) +
  `</g>`;
const dBalloons =
  K.balloon(VD, [-30, 30], [470, 360], 16, { target: 16 }) +
  K.balloon(VD, [-28, -50], [446, 480], 17, { target: 17 }) +
  K.balloon(VD, [13, -30], [626, 500], 18, { target: 18 }) +
  K.balloon(VD, [27.6, -8.6], [640, 448], 19, { target: 19 }) +
  K.balloon(VD, [-35, -8], [446, 424], 20, { target: 20 }) +
  K.balloon(VD, [-7, -99], [446, 660], 21, { target: 21 });
const dLabel = K.viewLabel(536, 704 + 4, "SECTION D-D", "STRAINER (GASCOLATOR), AXIAL · 1:1");

// ---------------------------------------------------------------- SECTION E-E: the primer
const primerE =
  `<g data-geom="E">` +
  `<g data-role="phantom">${K.line(VE, P.panelPts(), "phan", true)}</g>` +
  P.primerBody(VE) +
  P.primerNut(VE) +
  `<g data-role="fluid">${P.primerPassages(0).map((q, i) => `<path id="e-pass${i}" class="tint" d="${K.d(VE, q)}"/>`).join("")}${P.primerLineBores().map((q, i) => `<path id="e-line${i}" class="tint" d="${K.d(VE, q)}"/>`).join("")}</g>` +
  `<g id="e-balls">${P.checkBalls(VE, 0, 0)}</g>` +
  `<g id="e-plunger">${P.plunger(VE, 0)}</g>` +
  P.primerLines(VE) +
  K.centerline(VE, [-34, 0], [108, 0], 0) +
  `</g>`;
const eBalloons =
  K.balloon(VE, [-24, 9], [56, 684], 24, { target: 24 }) +
  K.balloon(VE, [P.PORT_S + 1.3, -P.PR.bh - 11], [56, 772], 27, { target: 27 }) +
  K.balloon(VE, [P.PORT_S + 0.6, P.ballZ(true, 0) + 0.6], [150, 772], 26, { target: 26 }) +
  `<g id="lb-25"></g>`;
LIVE[25] = { at: [356, 684] };
const eLabel = K.viewLabel(222, 800 + 6, "SECTION E-E", "PRIMER, AXIAL · 1:1");

// ---------------------------------------------------------------- VIEW F: the gauge; VIEW H: the placard
const GR = P.GAUGE.r;
function gaugeFace(V) {
  let ticks = "";
  for (const sg of [-1, 1]) for (let i = 0; i <= 4; i++) ticks += K.line(V, [P.gaugeAt(sg, i / 4, 12.5), P.gaugeAt(sg, i / 4, i % 2 ? 14 : 15.5)], i % 2 ? "thin" : "vis");
  const t = (xy, s) => `<text class="t t-sm" x="${V.p(xy)[0]}" y="${K.r2(V.p(xy)[1] + 2.6)}" text-anchor="middle">${s}</text>`;
  const text = [-1, 1].map((sg) => t(P.gaugeAt(sg, 1, 18.5), "F") + t(P.gaugeAt(sg, 0, 18.5), "E") + t([sg * 7, -16], sg < 0 ? "L" : "R")).join("") + t([0, 15.5], "FUEL");
  return (
    `<g data-geom="F">` +
    P.part(28, K.body(V, K.circle(0, 0, GR, 48)) + K.line(V, K.circle(0, 0, GR - 2.4, 48), "thin", true) + ticks + `<g data-role="engraved">${text}</g>` + `<g id="f-needles">${P.gaugeNeedles(V, 1, 1)}</g>`) +
    `</g>`
  );
}
const viewF = gaugeFace(VF) + K.balloon(VF, [GR - 1.2, -GR * 0.3], [1000, 290], 28, { target: 28 }) + K.viewLabel(932, 306, "VIEW F", "FUEL GAUGE ON THE PANEL · 1:1");
function placard(V) {
  const p = (xy) => V.p(xy);
  const t = (deg, r, s) => {
    const xy = [Math.sin((deg * Math.PI) / 180) * r, Math.cos((deg * Math.PI) / 180) * r];
    return `<text class="t t-sm" x="${p(xy)[0]}" y="${K.r2(p(xy)[1] + 2.6)}" text-anchor="middle">${s}</text>`;
  };
  return (
    `<g data-geom="H"><g data-role="phantom">${K.line(V, K.circle(0, 0, 54, 48), "phan", true)}</g>` +
    `<g data-role="engraved">${t(-90, 37, "LEFT") + t(0, 32, "BOTH") + t(90, 39, "RIGHT") + t(180, 32, "OFF")}</g>` +
    `<g id="h-handle">${P.part(13, handleTop(V))}</g>` +
    `</g>`
  );
}
function handleTop(V) {
  const arm = [[-5, -12], [5, -12], [3, 22], [-3, 22]];
  return K.body(V, arm) + K.body(V, K.circle(0, 0, 9, 24)) + K.line(V, K.circle(0, 0, 4.75, 16), "thin", true);
}
const viewH = placard(VH) + K.balloon(VH, [6.5, -6], [1150, 290], 13, { target: 13 }) + K.viewLabel(1082, 306, "VIEW H", "SELECTOR HANDLE AND PLACARD · 1:2");

// ---------------------------------------------------------------- DIAGRAM 1: head along the line
const CH = { x0: 480, x1: 680, y0: 228, y1: 296, sMax: 4, zMin: 600, zMax: 2600 };
const prof0 = M.profile(S0, "L");
const hx = (s) => K.r2(CH.x0 + (Math.min(CH.sMax, Math.max(0, s)) / CH.sMax) * (CH.x1 - CH.x0));
const hy = (z) => K.r2(CH.y1 - ((Math.min(CH.zMax, Math.max(CH.zMin, z)) - CH.zMin) / (CH.zMax - CH.zMin)) * (CH.y1 - CH.y0));
function chartHead() {
  let grid = "";
  let labels = "";
  for (let z = 1000; z <= CH.zMax; z += 400) {
    grid += `M${CH.x0} ${hy(z)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 4}" y="${K.r2(hy(z) + 2.7)}" text-anchor="end">${K.fmt(z / 1000, 1)}</text>`;
  }
  for (let s = 0; s <= CH.sMax; s += 0.5) {
    grid += `M${hx(s)} ${CH.y0}V${CH.y1}`;
    if (s % 1 === 0) labels += `<text class="t t-sm" x="${hx(s)}" y="${CH.y1 + 10}" text-anchor="middle">${s}</text>`;
  }
  const pipe = prof0.pts.map(([s, z]) => `${hx(s)},${hy(z)}`).join(" ");
  const nB = M.ROUTE.L.length;
  const tag = (s, z, txt, dy = -4) => `<text class="t t-sm" x="${hx(s)}" y="${K.r2(hy(z) + dy)}" text-anchor="middle">${txt}</text>`;
  labels += tag(prof0.pts[0][0] + 0.05, prof0.pts[0][1], "", 0);
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 21}" text-anchor="middle">FROM THE PORT TANK s, m</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x0 - 22}" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH.x0 - 22} ${(CH.y0 + CH.y1) / 2})">WL, m</text>`;
  const marks = [
    [prof0.pts[2][0], "POST"],
    [prof0.pts[nB - 1][0], "SELECTOR"],
    [prof0.pts[prof0.pts.length - 1][0] - 0.12, "CARB"],
  ];
  let ticks = "";
  for (const [s, name] of marks) {
    ticks += `M${hx(s)} ${CH.y1}V${CH.y1 - 4}`;
    labels += `<text class="t t-sm" x="${hx(s)}" y="${CH.y0 - 3}" text-anchor="middle">${name}</text>`;
  }
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path id="hd-press" class="tint" d=""/>` +
    `<polyline class="vis" points="${pipe}"/>` +
    `<path class="thin" d="${ticks}"/>` +
    `<polyline id="hd-R" class="hid accent" points=""/>` +
    `<polyline id="hd-L" class="vis accent" points=""/>` +
    `<circle id="hd-surf" class="accent-fill" cx="${hx(0)}" cy="${hy(prof0.surf)}" r="2.6"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 334 + 4, "DIAGRAM 1 · HEAD", "THICK: THE LINE · ACCENT: z + p/ρg · STIPPLE: p")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: fuel over the flight
const TRACE = M.tourTrace(1 / 240, 24);
const FT_MAX = Math.ceil(TRACE[TRACE.length - 1][1] / 5) * 5;
const CT = { x0: 886, x1: 1146, y0: 44, y1: 118, tMax: FT_MAX, vMin: 85, vMax: 107 };
const tx = (m) => K.r2(CT.x0 + (Math.min(CT.tMax, Math.max(0, m)) / CT.tMax) * (CT.x1 - CT.x0));
const vy = (v) => K.r2(CT.y1 - ((Math.min(CT.vMax, Math.max(CT.vMin, v)) - CT.vMin) / (CT.vMax - CT.vMin)) * (CT.y1 - CT.y0));
function chartFuel() {
  let grid = "";
  let labels = "";
  for (let v = 85; v <= 105; v += 5) {
    grid += `M${CT.x0} ${vy(v)}H${CT.x1}`;
    labels += `<text class="t t-sm" x="${CT.x0 - 4}" y="${K.r2(vy(v) + 2.7)}" text-anchor="end">${v}</text>`;
  }
  for (let m = 0; m <= CT.tMax; m += 5) {
    grid += `M${tx(m)} ${CT.y0}V${CT.y1}`;
    if (m % 10 === 0) labels += `<text class="t t-sm" x="${tx(m)}" y="${CT.y1 + 10}" text-anchor="middle">${m}</text>`;
  }
  const lLine = TRACE.map((r) => `${tx(r[1])},${vy(r[2])}`).join(" ");
  const rLine = TRACE.map((r) => `${tx(r[1])},${vy(r[3])}`).join(" ");
  const at = (t) => TRACE.find((r) => r[0] >= t) ?? TRACE[TRACE.length - 1];
  const tag = (t, s) => `<text class="t t-sm" x="${tx(at(t)[1])}" y="${CT.y1 - 4}" text-anchor="middle">${s}</text>`;
  labels += tag((M.T.cruise + M.T.left) / 2, "BOTH") + tag((M.T.left + M.T.block) / 2, "LEFT") + tag((M.T.block + M.T.right) / 2 + 0.6, "VENT") + tag(M.TOUR - 1.6, "RIGHT");
  labels += `<text class="t t-sm t-mute" x="${(CT.x0 + CT.x1) / 2}" y="${CT.y1 + 21}" text-anchor="middle">FLIGHT TIME, min</text>`;
  labels += `<text class="t t-sm t-mute" x="${CT.x0 - 20}" y="${(CT.y0 + CT.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CT.x0 - 20} ${(CT.y0 + CT.y1) / 2})">L</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CT.x0}" y="${CT.y0}" width="${CT.x1 - CT.x0}" height="${CT.y1 - CT.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline class="hid" points="${rLine}"/>` +
    `<polyline class="vis" points="${lLine}"/>` +
    `<path id="ct-cursor" class="thin" d="M${CT.x0} ${CT.y0}V${CT.y1}"/>` +
    `<circle id="ct-l" class="accent-fill" cx="${CT.x0}" cy="${vy(106)}" r="2.8"/>` +
    `<circle id="ct-r" class="dot" cx="${CT.x0}" cy="${vy(106)}" r="2.2"/>` +
    `<rect class="vis" x="${CT.x0}" y="${CT.y0}" width="${CT.x1 - CT.x0}" height="${CT.y1 - CT.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CT.x0 + CT.x1) / 2, 156 + 4, "DIAGRAM 2 · FUEL IN THE TANKS", "THICK: LEFT · DASHED: RIGHT · ACCENT: NOW")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "FUEL TANK, WELDED, 106 L", "5052-H32, 1.0", "2"],
  ["2", "FILLER ADAPTER, LOCKING CAP", "A356-T6 / FVMQ", "2"],
  ["3", "FINGER STRAINER Ø19, 8 MESH", "BRASS C26000", "2"],
  ["4", "SUMP QUICK-DRAIN VALVE", "BRASS C36000", "2"],
  ["5", "QUANTITY SENDER, FLOAT ARM", "NITROPHYL / BRASS", "2"],
  ["6", "VENT LINE Ø9.53, RAM TUBE", "5052-O", "2"],
  ["7", "VENT CHECK VALVE, FLAPPER", "BRASS / FKM", "2"],
  ["8", "FEED LINE Ø9.53×0.89", "5052-O", "2"],
  ["9", "SELECTOR BODY AND COVER", "A356-T6", "1"],
  ["10", "SELECTOR ROTOR Ø36", "BRASS C36000", "1"],
  ["11", "ROTOR O-RING 2-024", "FVMQ", "2"],
  ["12", "DETENT BALL Ø4.8, SPRING", "302 STAINLESS", "1"],
  ["13", "SELECTOR SHAFT AND HANDLE", "2024-T4 / PHENOLIC", "1"],
  ["14", "LINE Ø9.53, SELECTOR–STRAINER", "5052-O", "1"],
  ["15", "SHUT-OFF VALVE, PUSH-PULL", "BRASS / NBR", "1"],
  ["16", "STRAINER TOP CASTING", "A356-T6", "1"],
  ["17", "STRAINER BOWL", "6061-T6", "1"],
  ["18", "SCREEN 100 MESH, CAP, SPRING", "304 SST / BRASS", "1"],
  ["19", "BOWL GASKET", "NBR", "1"],
  ["20", "BOWL RETAINING NUT", "2024-T4", "1"],
  ["21", "STRAINER DRAIN VALVE", "BRASS / FKM", "1"],
  ["22", "HOSE, STRAINER–CARBURETTOR", "NBR, SST BRAID", "1"],
  ["23", "CARBURETTOR, UPDRAFT, FLOAT", "BOUGHT OUT", "1"],
  ["24", "PRIMER BODY AND VALVE BLOCK", "BRASS C36000", "1"],
  ["25", "PRIMER PLUNGER AND KNOB", "BRASS / PHENOLIC", "1"],
  ["26", "PRIMER CHECK BALL Ø4.76", "440C / 302 SST", "2"],
  ["27", "PRIMER LINES Ø3.18", "COPPER / 5052-O", "1 SET"],
  ["28", "FUEL QUANTITY GAUGE, DUAL", "BOUGHT OUT", "1"],
];
const TB = { x: 850, w: 326, h: 140 };
TB.y = 824 - TB.h;
const rowH = 12;
const bomTop = TB.y - (18 + BOM.length * rowH);
const bom = K.table(TB.x, bomTop, [
  { w: 26, align: "center", title: "ITEM" },
  { w: 168, title: "DESCRIPTION" },
  { w: 104, title: "MATERIAL" },
  { w: 28, align: "center", title: "QTY" },
], BOM, { rowH });

const sNow = M.system();
const q38 = M.solve(sNow, { demandQ: M.FLOW.cruise * M.LPH });
const qMax2 = M.solve(sNow, { needle: 1 }).q / M.LPH;
sNow.theta = M.POS.LEFT;
const qMax1 = M.solve(sNow, { needle: 1 }).q / M.LPH;
const lossKPa = (q38.src.L - q38.pc - M.RHO * M.G * ((M.SELECTOR.wl - M.CARB.wl) / 1000)) / 1000;
const notes = K.notes(440, 736, "NOTES", [
  `GRAVITY FEED: Δp = ρgh, h ${((M.levelAt(M.FULL) - M.CARB.wl) / 1000).toFixed(2)} m FULL. AVGAS ρ ${M.RHO} kg/m³. LINES 5052-O.`,
  `LOSSES: f = 64/Re (HAGEN–POISEUILLE) TO Re 2300, BLASIUS ABOVE, + K·ρv²/2.`,
  `${M.FLOW.cruise} L/h LOSES ${lossKPa.toFixed(1)} kPa; ${(q38.pc / 1000).toFixed(1)} kPa AT THE FLOAT VALVE. WIDE OPEN ${Math.round(qMax2)} L/h.`,
  `${M.FULL} L A TANK, ${Math.round(M.USABLE)} USABLE: ${K.fmt(M.UNUSABLE, 1)} L UNDER STRAINER 3, IN THE SUMP.`,
  `VENTS 6 FACE FORWARD: +${(M.VENT.cp * M.qDyn(M.V_CRUISE) / 1000).toFixed(1)} kPa. BLOCKED, p·V = CONST.`,
  `TOUR: TANKS ×120 IN CRUISE, ×40 VENT BLOCKED; THE REST REAL TIME.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 236, h: 32, label: "TITLE", value: "GRAVITY FUEL SYSTEM", size: "lg" },
  { x: 236, y: 0, w: 90, h: 32, label: "DWG NO", value: "BP-105", size: "lg" },
  { x: 0, y: 32, w: 50, h: 25, label: "SCALE", value: "AS SHOWN" },
  { x: 50, y: 32, w: 40, h: 25, label: "SIZE", value: "A2" },
  { x: 90, y: 32, w: 50, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 140, y: 32, w: 86, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 226, y: 32, w: 100, h: 25, label: "DATE", value: "2026-10-18" },
  { x: 0, y: 57, w: 110, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 110, y: 57, w: 96, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 206, y: 57, w: 120, h: 25, label: "UNITS", value: "mm · L · kPa" },
  { x: 0, y: 82, w: 326, h: 29, label: "LIVE · FLOW · L B R O SELECTOR · ↑ ↓ POWER · V VENT · F SHUT-OFF", value: "", id: "readout", size: "sm" },
  { x: 0, y: 111, w: 326, h: 29, label: "LIVE · TANKS · P PRIME · HOLD D DRAIN · W REFUEL · SPACE TOUR", value: "", id: "readout2", size: "sm" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="fuel" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="fuel-dot" cx="0.8" cy="0.8" r="0.62"/><circle class="fuel-dot" cx="2.4" cy="2.4" r="0.62"/></pattern>` +
  `<pattern id="airdots" patternUnits="userSpaceOnUse" width="6" height="6"><circle class="air-dot" cx="1.5" cy="1.5" r="0.5"/><circle class="air-dot" cx="4.5" cy="4.5" r="0.5"/></pattern>` +
  `<pattern id="water" patternUnits="userSpaceOnUse" width="3.6" height="1.8"><path class="water-dash" d="M0.3 0.9H2.6"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-J"><rect x="${J.x}" y="${J.y}" width="${J.w}" height="${J.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-plan"><rect x="30" y="${K.r2(VP.p([0, P.PLAN_BL + 10])[1])}" width="${K.r2(VP.p([-P.VIEW_FS[0] + 20, 0])[0] - 30)}" height="${K.r2(VP.p([0, -P.PLAN_BL - 10])[1] - VP.p([0, P.PLAN_BL + 10])[1])}"/></clipPath>` +
  `</defs>`;

const hits =
  `<rect class="hit" data-drag="handle" x="${VIEWS.H.x - 30}" y="${VIEWS.H.y - 30}" width="60" height="60"/>` +
  `<rect class="hit" data-drag="primer" x="${K.r2(VE.p([70, 0])[0])}" y="${K.r2(VE.p([0, 16])[1])}" width="${K.r2(VE.p([150, 0])[0] - VE.p([70, 0])[0])}" height="${K.r2(32 * VE.k)}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of the gravity-feed fuel system of a four-seat high-wing light aircraft: the system schematic in plan and side elevation, the port wing tank in section with its finger strainer, sump drain, quantity sender, filler and vent with its check valve, the BOTH LEFT RIGHT OFF selector valve in plan and axial section, the fuel strainer and the primer in section, the fuel gauge, the selector placard, the head along the line and the fuel over the flight. The tour lets water settle in the strainer and drains it, primes, starts and cruises on BOTH as the tanks drain unevenly, selects LEFT, blocks the left vent so that the tank's pressure falls and the engine starves, then selects RIGHT and recovers. Keys L B R O turn the selector, V blocks the vent, P primes, D drains, up and down set the power." ` +
  `data-views='${JSON.stringify(VIEWS)}' data-live='${JSON.stringify(LIVE)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  planGeom + planBalloons + planLabel +
  sideGeom + `<g id="dim-h-wrap">${dimHead(levelR0)}</g>` + sideBalloons + sideLabel +
  tankB + bBalloons + bLabel +
  detailJ +
  selC + cBalloons + cLabel +
  selG + gBalloons + gLabel +
  gasc + dBalloons + dLabel +
  primerE + eBalloons + eLabel +
  viewF + viewH +
  chartHead() +
  chartFuel() +
  notes +
  bom +
  title +
  hits +
  `</svg>`;

const bar =
  `<span><kbd>L</kbd> <kbd>B</kbd> <kbd>R</kbd> <kbd>O</kbd> selector · drag the handle · <kbd>↑</kbd> <kbd>↓</kbd> power · <kbd>V</kbd> vent · <kbd>P</kbd> prime · hold <kbd>D</kbd> drain · <kbd>Space</kbd> tour · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "fuel-system.html"), {
  title: "Gravity-Feed Fuel System",
  description: "A live engineering drawing of a light aircraft's gravity-feed fuel system: wing tanks with vents, finger strainers and sumps, the BOTH/LEFT/RIGHT/OFF selector, the strainer, the primer and the line to the carburettor, with the head, the line losses and the tanks' quantities from one model.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#fuel)}.bp-sheet .tint.air{fill:url(#airdots)}.bp-sheet .tint.water{fill:url(#water)}` +
    `.bp-sheet .fuel-dot{fill:var(--bp-accent)}.bp-sheet .air-dot{fill:var(--bp-muted)}.bp-sheet .water-dash{stroke:var(--bp-ink);stroke-width:.75px;fill:none}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet [data-drag]{cursor:grab}` +
    `.bp-sheet .fuel-line{fill:none;stroke:var(--bp-accent);stroke-width:3px;stroke-linejoin:round;stroke-linecap:round}` +
    `.bp-sheet .drop{fill:var(--bp-paper);stroke:var(--bp-ink);stroke-width:.6px}.bp-sheet polyline.accent{fill:none}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHARTS__", JSON.stringify({ CH, CT, GR, DIM_H_X })),
});
console.log(`fuel-system.html  ${(size / 1024).toFixed(0)} KB  usable ${M.USABLE.toFixed(1)} L  unusable ${M.UNUSABLE.toFixed(2)} L  Qmax ${qMax2.toFixed(0)} / ${qMax1.toFixed(0)} L/h  pc ${(q38.pc / 1000).toFixed(2)} kPa  Re ${M.reynolds(M.FLOW.cruise * M.LPH).toFixed(0)}`);
