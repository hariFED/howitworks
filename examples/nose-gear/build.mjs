// Builds nose-gear.html: a live A2 drawing of a light aircraft's steerable oleo-pneumatic nose gear,
// cut through the strut on the aircraft's centre line, with the steering in plan and the wheel in front.
//   node examples/nose-gear/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k1 = 1 * K.PX_PER_MM;
const k2 = 0.5 * K.PX_PER_MM;
const k25 = 0.4 * K.PX_PER_MM;

// ---------------------------------------------------------------- views
const C = { x: 452, y: 66, w: 162, h: 210, u: 0, top: 592 }; // Detail C window, 1:1, fixed frame
const D = { x: 642, y: 66, w: 118, h: 196, top: 690 }; // View D window, developed cams, 1:2
const B = { x: 452, y: 478, w: 226, h: 230, top: 186 }; // Section B-B window, 1:2.5, the wheel's frame
const VIEWS = {
  main: { x: 200, y: 471, scale: 0.2 },
  C: { x: C.x + C.w / 2, y: C.y + C.top * k1, scale: 1 },
  D: { x: D.x + D.w / 2, y: D.y + D.top * k2, scale: 0.5 },
  E: { x: 530, y: 380, scale: 0.2 },
  B: { x: B.x + B.w / 2, y: B.y + B.top * k25, scale: 0.4 },
};
const VM = K.view(VIEWS.main);
const VC = K.view(VIEWS.C);
const VD = K.view(VIEWS.D);
const VE = K.view(VIEWS.E);
const VB = K.view(VIEWS.B);
const c0 = 0; // everything is drawn fully extended; the page moves it

// ---------------------------------------------------------------- fluids
function fluids(V, id) {
  return (
    `<g data-role="fluid">` +
    `<path id="air-${id}" class="tint air" d="${P.fluidPath(V, P.airShape(c0))}"/>` +
    `<path id="oil-a-${id}" class="tint" fill-opacity="0.35" d="${P.fluidPath(V, P.oilAbove(c0))}"/>` +
    `<path id="oil-b-${id}" class="tint" fill-opacity="0.35" d="${P.fluidPath(V, P.oilBelow(c0))}"/>` +
    `</g>`
  );
}

// ---------------------------------------------------------------- MAIN VIEW: SECTION A-A, 1:5
const fixedParts = (V, { top = true } = {}) =>
  (top ? P.mountSide(V) : "") +
  P.bracketSide(V) +
  P.damperSide(V) +
  P.bungeeSide(V) +
  P.outerCylinder(V) +
  (top ? P.topFitting(V) + P.airValve(V) + P.clampSide(V) : "") +
  P.gland(V) +
  P.wiper(V) +
  P.seals(V) +
  P.fixedCam(V) +
  P.orificeTube(V) +
  P.plate(V) +
  P.collar(V);

// the cutting plane of B-B rides with the wheel; it is drawn in the main view's moving group
function planeBB(V) {
  const x = V.p([0, 0])[0];
  const yT = V.p([0, 196])[1];
  const yB = V.p([0, -196])[1];
  const head = (y) => `M${K.r2(x - 15)} ${y}L${K.r2(x - 8)} ${K.r2(y - 1.8)}L${K.r2(x - 8)} ${K.r2(y + 1.8)}Z`;
  return (
    `<g data-role="label">` +
    `<path class="vis" d="M${x} ${K.r2(yT - 8)}V${yT}M${x} ${yB}V${K.r2(yB + 8)}M${x} ${K.r2(yT - 8)}H${K.r2(x - 8)}M${x} ${K.r2(yB + 8)}H${K.r2(x - 8)}"/>` +
    `<path class="head" d="${head(K.r2(yT - 8))}${head(K.r2(yB + 8))}"/>` +
    `<text class="t t-lg" x="${K.r2(x - 22)}" y="${K.r2(yT - 4)}" text-anchor="middle">B</text>` +
    `<text class="t t-lg" x="${K.r2(x - 22)}" y="${K.r2(yB + 12)}" text-anchor="middle">B</text>` +
    `</g>`
  );
}
// E-E: across the strut at the horns, looking down
function planeEE(V) {
  const y = V.p([0, M.HORN_V])[1];
  const xl = V.p([-202, 0])[0];
  const xr = V.p([318, 0])[0];
  const head = (x) => `M${K.r2(x)} ${K.r2(y + 13)}L${K.r2(x - 1.8)} ${K.r2(y + 6)}L${K.r2(x + 1.8)} ${K.r2(y + 6)}Z`;
  return (
    `<g data-role="label">` +
    `<path class="ctr" d="M${K.r2(xl + 8)} ${y}H${K.r2(xr - 8)}"/>` +
    `<path class="vis" d="M${K.r2(xl)} ${y}h8M${K.r2(xr)} ${y}h-8M${K.r2(xl + 0.5)} ${y}v6M${K.r2(xr - 0.5)} ${y}v6"/>` +
    head(xl + 0.5) +
    head(xr - 0.5) +
    `<text class="t t-lg" x="${K.r2(xl - 8)}" y="${K.r2(y + 4)}" text-anchor="middle">E</text>` +
    `<text class="t t-lg" x="${K.r2(xr + 8)}" y="${K.r2(y + 4)}" text-anchor="middle">E</text>` +
    `</g>`
  );
}

const mainView =
  `<g data-geom="main">` +
  fluids(VM, "main") +
  fixedParts(VM) +
  `<g data-role="phantom">${P.linksPhantom(VM, M.STROKE)}</g>` +
  `<g id="mv-main">${P.strutMoving(VM)}</g>` +
  `<g id="links-main">${P.links(VM, c0)}</g>` +
  K.centerline(VM, [0, -190], [0, 968], 0) +
  `</g>` +
  `<g data-role="phantom" id="ground"><path class="vis" d="M${VM.p([-215, 0])[0]} 0H${VM.p([215, 0])[0]}"/><path class="thin" d="${Array.from({ length: 22 }, (_, i) => `M${K.r2(VM.p([-205 + i * 19.5, 0])[0])} 0l-5 6`).join("")}"/></g>`;

// live dimensions, right of the strut: the stroke from the phantom of full extension, and the length
// of chromed tube showing below the gland (what a pilot checks on the walk-round)
const DX = 300; // sheet x of the stroke dimension line
const dimX = (c) => K.dim(VM, [25.4, M.CROWN_TOP + c], [25.4, M.GLAND_BOT], { dir: "v", off: DX + 26 - VM.p([25.4, 0])[0], text: `${Math.round(M.GLAND_BOT - M.CROWN_TOP - c)}`, id: "dim-x" });
const mainDims =
  K.dim(VM, [-M.OUTER_OD / 2, 800], [M.OUTER_OD / 2, 800], { dir: "h", off: -24, prefix: "Ø" }) +
  `<g data-role="phantom">${K.line(VM, [[26, M.CROWN_TOP], [46, M.CROWN_TOP]], "phan")}</g>` +
  `<g id="dim-c-wrap"></g><g id="dim-x-wrap">${dimX(c0)}</g>`;

// Balloons. Static parts on the left and right; what rides on the piston tube rides with it (mvb);
// the torque links' balloons stay put and their dots follow the links (live).
const LIVE = {
  19: { at: [58, 330] },
  21: { at: [58, 362] },
  20: { at: [58, 394] },
};
const liveBalloons = Object.keys(LIVE).map((n) => `<g id="lb-${n}"></g>`).join("");
const mainBalloons =
  K.balloon(VM, [-38, 904], [58, 100], 2, { target: 2 }) +
  K.balloon(VM, [-35.7, 760], [58, 160], 1, { target: 1 }) +
  K.balloon(VM, [-42, 548], [58, 214], 23, { target: 23 }) +
  K.balloon(VM, [-62, 474], [58, 268], 18, { target: 18 }) +
  K.balloon(VM, [-26.9, 464.5], [58, 298], 15, { target: 15 }) +
  K.balloon(VM, [62, 904], [318, 62], 3, { target: 3 }) +
  K.balloon(VM, [250, 842], [410, 140], 29, { target: 29 }) +
  K.balloon(VM, [52, 695], [410, 196], 30, { target: 30 }) +
  liveBalloons +
  `<g id="mvb-main">` +
  K.balloon(VM, [12, 252], [410, 380], 10, { target: 10 }) +
  K.balloon(VM, [35, 248], [410, 410], 16, { target: 16 }) +
  K.balloon(VM, [46.5, M.BOLT_V], [410, 440], 17, { target: 17 }) +
  planeBB(VM) +
  `</g>`;

const mainMarks =
  planeEE(VM) +
  K.detailMark(VM, [0, 540], 54, "C", 30) +
  K.viewLabel(200, 46, "SECTION A-A", "ON THE AIRCRAFT'S CENTRE LINE · SCALE 1:5");

// ---------------------------------------------------------------- DETAIL C: orifice, metering pin, cams, 1:1
const detailC =
  `<g data-geom="C" clip-path="url(#clip-C)"><rect class="paper" x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}"/>` +
  fluids(VC, "C") +
  P.outerCylinder(VC) +
  P.gland(VC) +
  P.seals(VC) +
  P.fixedCam(VC) +
  P.orificeTube(VC, 640) +
  `<g id="mv-C">${P.pistonTube(VC)}${P.pin(VC)}${P.movingCam(VC)}<g class="snub">${P.snubber(VC)}</g>${P.head(VC)}</g>` +
  P.plate(VC) +
  `<g data-role="fluid"><path id="flow-c" class="tint flow" d=""/><path id="flow-heads" class="tint flow-head" d=""/></g>` +
  K.centerline(VC, [0, 490], [0, 590], 0) +
  `</g><rect class="thin" x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="10"/>` +
  K.balloon(VC, [-23.8, 520], [438, 200], 9, { target: 9 }) +
  K.balloon(VC, [-30, 503.6], [438, 236], 4, { target: 4 }) +
  K.balloon(VC, [-27.4, 491.6], [438, 266], 14, { target: 14 }) +
  K.balloon(VC, [13.5, 578], [626, 92], 12, { target: 12 }) +
  K.balloon(VC, [10, 545], [626, 150], 13, { target: 13 }) +
  K.balloon(VC, [0, 508], [626, 226], 11, { target: 11 }) +
  K.viewLabel(C.x + C.w / 2, 296, "DETAIL C", "ORIFICE AND METERING PIN · 1:1");

// ---------------------------------------------------------------- VIEW D: the centering cams developed, 1:2
const LIVE_D = { 6: { at: [680, 276], s: -20, v: 531 }, 7: { at: [708, 276], s: 15, v: 538 }, 8: { at: [736, 276], s: 45, v: 556 } };
const viewD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>` +
  P.camFixedDev(VD) +
  `<g id="mv-D">${P.camMovingDev(VD)}<g id="snub-D">${P.part(7, K.body(VD, K.rect(-110, M.SNUB_BOT, 110, M.SNUB_BOT + M.SNUB_T)))}</g></g>` +
  K.centerline(VD, [0, 500], [0, 545], 0) +
  `</g><rect class="thin" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/>` +
  K.balloon(VD, [-44, 509], [652, 276], 5, { target: 5 }) +
  Object.keys(LIVE_D).map((n) => `<g id="lb-${n}"></g>`).join("") +
  `<g id="dim-d-wrap"></g><g id="dim-s-wrap"></g>` +
  K.viewLabel(D.x + D.w / 2, 300, "VIEW D", "CAMS 5, 6 UNROLLED · 1:2");

// ---------------------------------------------------------------- SECTION E-E: steering, 1:5
const viewE =
  `<g data-geom="E">` +
  `<g id="rot-E">${P.tyrePlan(VE)}${P.forkPlan(VE)}<g id="links-E">${P.linksPlan(VE, c0)}</g>${P.collarPlan(VE)}</g>` +
  P.strutPlan(VE) +
  `<g data-role="fluid"><path id="oil-E" class="tint" fill-opacity="0.35" d="${K.d(VE, K.circle(0, 0, 22.2, 48))}"/><path id="oil-damper" class="tint" fill-opacity="0.35" d="${P.damperOil(VE)}"/></g>` +
  `<g id="pin-E">${P.part(11, K.body(VE, K.circle(0, 0, 4, 24)))}</g>` +
  `<g id="damper-E">${P.damperPlan(VE)}</g>` +
  `<g id="bungee-E">${P.bungeePlan(VE, 1)}${P.bungeePlan(VE, -1)}</g>` +
  K.centerMark(VE, [0, 0], 52, 3) +
  `</g>` +
  K.balloon(VE, [-100, 88.6], [470, 330], 22, { target: 22 }) +
  K.balloon(VE, [150, 90.4], [612, 330], 24, { target: 24 }) +
  K.viewLabel(VIEWS.E.x + 40, 448, "SECTION E-E", "STEERING, LOOKING DOWN · NOSE LEFT · 1:5");

// ---------------------------------------------------------------- SECTION B-B: wheel, axle, fork, 1:2.5
const viewB =
  `<g data-geom="B" clip-path="url(#clip-B)"><rect class="paper" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}"/>` +
  P.tyreFront(VB) +
  `<g transform="translate(0 ${K.r2(2 * VB.p([0, 0])[1])}) scale(1 -1)">${P.tyreFront(VB)}</g>` +
  P.wheelFront(VB) +
  `<g transform="translate(0 ${K.r2(2 * VB.p([0, 0])[1])}) scale(1 -1)">${P.wheelFront(VB, false)}</g>` +
  P.bearingsFront(VB) +
  `<g transform="translate(0 ${K.r2(2 * VB.p([0, 0])[1])}) scale(1 -1)">${P.bearingsFront(VB)}</g>` +
  P.axleFront(VB) +
  P.forkFront(VB) +
  K.centerline(VB, [-112, 0], [112, 0], 0) +
  K.centerline(VB, [0, -40], [0, 184], 0) +
  `</g><rect class="thin" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10"/>` +
  K.balloon(VB, [20, 168], [700, 494], 28, { target: 28 }) +
  K.balloon(VB, [4, 45], [700, 540], 26, { target: 26 }) +
  K.balloon(VB, [32, 23.4], [700, 586], 27, { target: 27 }) +
  K.balloon(VB, [60, 9], [700, 626], 25, { target: 25 }) +
  K.viewLabel(B.x + B.w / 2, 730, "SECTION B-B", "THROUGH THE AXLE, LOOKING AFT · RIDES WITH THE WHEEL · 1:2.5");

// ---------------------------------------------------------------- DIAGRAM 1: strut force against stroke
const CH = { x0: 96, x1: 400, y0: 590, y1: 746, cMax: 160, fMax: 5 };
const fx = (c) => K.r2(CH.x0 + (c / CH.cMax) * (CH.x1 - CH.x0));
const fy = (F) => K.r2(CH.y1 - (Math.max(0, Math.min(CH.fMax, F / 1000)) / CH.fMax) * (CH.y1 - CH.y0));
function chartFC() {
  let grid = "";
  let labels = "";
  for (let F = 0; F <= CH.fMax; F += 1) {
    grid += `M${CH.x0} ${fy(F * 1000)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 5}" y="${K.r2(fy(F * 1000) + 2.7)}" text-anchor="end">${F}</text>`;
  }
  for (let c = 0; c <= CH.cMax; c += 20) {
    grid += `M${fx(c)} ${CH.y0}V${CH.y1}`;
    if (c % 40 === 0) labels += `<text class="t t-sm" x="${fx(c)}" y="${CH.y1 + 10}" text-anchor="middle">${c}</text>`;
  }
  let air = "";
  for (let c = 0; c <= CH.cMax; c += 1) {
    const F = M.airForce(c);
    if (F / 1000 > CH.fMax) break;
    air += `${air ? "L" : "M"}${fx(c)} ${fy(F)}`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 21}" text-anchor="middle">STROKE c, mm</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x0 - 22}" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH.x0 - 22} ${(CH.y0 + CH.y1) / 2})">STRUT FORCE F, kN</text>`;
  labels += `<text class="t t-sm" x="${fx(4)}" y="${K.r2(fy(M.W_NOSE) - 4)}">NOSE LOAD ${K.fmt(M.W_NOSE / 1000, 2)} kN</text>`;
  labels += `<text class="t t-sm" x="${fx(118)}" y="${K.r2(fy(M.airForce(118)) + 3)}" text-anchor="start">AIR</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="vis" d="${air}"/>` +
    `<path class="hid" d="M${CH.x0} ${fy(M.W_NOSE)}H${CH.x1}"/>` +
    `<circle class="dot" cx="${fx(M.C_STATIC)}" cy="${fy(M.W_NOSE)}" r="2.4"/>` +
    `<polyline id="fc-trail" class="vis accent" points=""/>` +
    `<circle id="fc-dot" class="accent-fill" cx="${fx(0)}" cy="${fy(M.airForce(0))}" r="2.8"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, 786, "DIAGRAM 1 · STRUT FORCE", "THICK: AIR SPRING p·V^1.1 · ACCENT: AIR + ORIFICE + SNUBBER, LAST 2 s")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: the tour, stroke and wheel angle
const TRACE = M.tourTrace(1 / 2000, 40);
const CT = { x0: 826, x1: 1148, y0: 52, y1: 152, tMax: M.TOUR, cMax: 160, psiMax: 12 };
const tx = (t) => K.r2(CT.x0 + (t / CT.tMax) * (CT.x1 - CT.x0));
const cy = (c) => K.r2(CT.y1 - (c / CT.cMax) * (CT.y1 - CT.y0));
const py = (p) => K.r2((CT.y0 + CT.y1) / 2 - (p / CT.psiMax) * ((CT.y1 - CT.y0) / 2));
function chartTour() {
  let grid = "";
  let labels = "";
  for (let c = 0; c <= CT.cMax; c += 40) {
    grid += `M${CT.x0} ${cy(c)}H${CT.x1}`;
    if (c % 80 === 0) labels += `<text class="t t-sm" x="${CT.x0 - 5}" y="${K.r2(cy(c) + 2.7)}" text-anchor="end">${c}</text>`;
  }
  for (const p of [-10, 0, 10]) labels += `<text class="t t-sm" x="${CT.x1 + 4}" y="${K.r2(py(p) + 2.7)}" text-anchor="start">${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p)}</text>`;
  for (let t = 0; t <= CT.tMax; t += 2) {
    grid += `M${tx(t)} ${CT.y0}V${CT.y1}`;
    labels += `<text class="t t-sm" x="${tx(t)}" y="${CT.y1 + 10}" text-anchor="middle">${t}</text>`;
  }
  const cLine = TRACE.map(([t, c]) => `${tx(t)},${cy(c)}`).join(" ");
  const pLine = TRACE.map(([t, , p]) => `${tx(t)},${py(p)}`).join(" ");
  const tag = (t, s, dy = 0) => `<text class="t t-sm" x="${tx(t)}" y="${CT.y0 + 9 + dy}" text-anchor="middle">${s}</text>`;
  labels += tag(1.4, "TD") + tag(4.8, "LEFT", 0) + tag(7.2, "BUMP") + tag(9.6, "RIGHT") + tag(12.9, "LIFT-OFF") + tag(14.9, "CLIMB");
  labels += `<text class="t t-sm t-mute" x="${(CT.x0 + CT.x1) / 2}" y="${CT.y1 + 21}" text-anchor="middle">TOUR TIME t, s</text>`;
  labels += `<text class="t t-sm t-mute" x="${CT.x0 - 24}" y="${(CT.y0 + CT.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CT.x0 - 24} ${(CT.y0 + CT.y1) / 2})">c, mm</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CT.x0}" y="${CT.y0}" width="${CT.x1 - CT.x0}" height="${CT.y1 - CT.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline class="hid" points="${pLine}"/>` +
    `<polyline class="vis" points="${cLine}"/>` +
    `<path id="ct-cursor" class="thin" d="M${CT.x0} ${CT.y0}V${CT.y1}"/>` +
    `<circle id="ct-dot" class="accent-fill" cx="${CT.x0}" cy="${cy(0)}" r="2.8"/>` +
    `<circle id="ct-pdot" class="dot" cx="${CT.x0}" cy="${py(0)}" r="2.2"/>` +
    `<rect class="vis" x="${CT.x0}" y="${CT.y0}" width="${CT.x1 - CT.x0}" height="${CT.y1 - CT.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CT.x0 + CT.x1) / 2, 190, "DIAGRAM 2 · THE TOUR", "THICK: STROKE c · DASHED: WHEEL ANGLE ψ, ° (RIGHT) · ACCENT: NOW")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "OUTER CYLINDER Ø76.2×4.75", "4130 STEEL, NORM.", "1"],
  ["2", "TOP FITTING WITH TRUNNION LUG", "2014-T6 FORGING", "1"],
  ["3", "AIR FILLER VALVE, HIGH PRESS.", "BRASS, BOUGHT OUT", "1"],
  ["4", "GLAND NUT, LOWER BEARING", "C95400 Al BRONZE", "1"],
  ["5", "CENTERING CAM, FIXED", "4140 STEEL, HARD.", "1"],
  ["6", "CENTERING CAM, MOVING", "4140 STEEL, HARD.", "1"],
  ["7", "SNUBBER RING, 3 BLEEDS Ø3", "17-7PH STEEL", "1"],
  ["8", "PISTON HEAD, UPPER BEARING", "2024-T351", "1"],
  ["9", "PISTON TUBE Ø50.8×3.2, CHROMED", "4130 STEEL, HT", "1"],
  ["10", "LOWER PLUG", "4130 STEEL", "1"],
  ["11", "METERING PIN Ø6.3–Ø3", "17-4PH H1025", "1"],
  ["12", "ORIFICE TUBE Ø30×3", "6061-T6", "1"],
  ["13", "ORIFICE PLATE, Ø7.5 ORIFICE", "C63000 Al BRONZE", "1"],
  ["14", "O-RING + BACKUP, MS28775/MS28774", "NBR 70, PTFE", "1 SET"],
  ["15", "WIPER RING Ø50.8", "PU 90 ShA", "1"],
  ["16", "FORK", "2014-T6 FORGING", "1"],
  ["17", "FORK BOLT AN8, NUT AN310", "STEEL, CAD PL.", "1"],
  ["18", "STEERING COLLAR WITH HORNS", "2014-T6 FORGING", "1"],
  ["19", "TORQUE LINK, UPPER", "2014-T6 FORGING", "1"],
  ["20", "TORQUE LINK, LOWER", "2014-T6 FORGING", "1"],
  ["21", "TORQUE LINK BOLT AN5", "STEEL, CAD PL.", "3"],
  ["22", "SHIMMY DAMPER Ø28", "BOUGHT OUT", "1"],
  ["23", "DAMPER BRACKET, CLAMPED", "4130 STEEL", "1"],
  ["24", "BUNGEE SPRING CARTRIDGE", "4130 / 17-7PH SPR.", "2"],
  ["25", "AXLE Ø25.4, SPACERS, BOLT AN7", "4130 STEEL", "1"],
  ["26", "WHEEL 5.00-5, SPLIT HUB", "356-T6 CASTING", "1"],
  ["27", "TAPERED ROLLER BEARING Ø25.4", "52100 STEEL", "2"],
  ["28", "TYRE 5.00-5 6 PLY + INNER TUBE", "NR / NYLON", "1"],
  ["29", "ENGINE MOUNT, LOWER LEGS", "4130 TUBE, WELDED", "1"],
  ["30", "STRUT CLAMP", "4130 STEEL", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const rowH = 13;
const bomTop = TB.y - (18 + BOM.length * rowH);
const bom = K.table(TB.x, bomTop, [
  { w: 30, align: "center", title: "ITEM" },
  { w: 200, title: "DESCRIPTION" },
  { w: 132, title: "MATERIAL" },
  { w: 38, align: "center", title: "QTY" },
], BOM, { rowH });

const notes = K.notes(790, 214, "NOTES", [
  `CHARGE ${M.P_CHARGE_G} bar g (45 psi), EXTENDED, UNLOADED. OIL MIL-PRF-5606.`,
  `AIR p·V^${M.N_POLY} ON Ø${M.PISTON_OD}: ${K.fmt(M.airForce(0), 0)} N EXTENDED. NOSE LOAD ${K.fmt(M.W_NOSE, 0)} N, ${Math.round(M.NOSE_SHARE * 100)} % OF ${M.MTOW} kg.`,
  `STATIC c ${K.fmt(M.C_STATIC, 0)} AT ${K.fmt(M.P_STATIC - M.P_ATM, 1)} bar g. ORIFICE Δp = ½ρ(Q/Cd·A)², Cd ${M.CD}.`,
  `PEDALS ±${M.STEER_MAX}° VIA BUNGEES 24. CAMS 5, 6 CENTRE THE WHEEL AT c < ${M.CAM_DEPTH}.`,
  `A-A WITH THE WHEEL STRAIGHT. FORK LEG, 22, 23, 24 BEYOND.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "NOSE LANDING GEAR · SECTION", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-102", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:5" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-18" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · N · bar" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE WHEEL · ← → PEDALS · SPACE: A LANDING · B: A BUMP · S: SLOW", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="oil" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="oil-dot" cx="0.8" cy="0.8" r="0.62"/><circle class="oil-dot" cx="2.4" cy="2.4" r="0.62"/></pattern>` +
  `<pattern id="airdots" patternUnits="userSpaceOnUse" width="6" height="6"><circle class="air-dot" cx="1.5" cy="1.5" r="0.5"/><circle class="air-dot" cx="4.5" cy="4.5" r="0.5"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-C"><rect x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-D"><rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-B"><rect x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-ground"><rect x="40" y="380" width="380" height="172"/></clipPath>` +
  `</defs>`;

const wheelBox = [VM.p([-180, 200]), VM.p([180, -180])];
const hit = `<rect class="hit" data-drag="main" x="${K.r2(wheelBox[0][0])}" y="${K.r2(wheelBox[0][1])}" width="${K.r2(wheelBox[1][0] - wheelBox[0][0])}" height="${K.r2(wheelBox[1][1] - wheelBox[0][1])}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of the steerable oleo-pneumatic nose landing gear of a four-seat light aircraft, cut through the strut on the aircraft's centre line. The tour lands on the nose wheel, steers left and right with the pedals, rolls over a bump and lifts off: the piston tube slides into the cylinder, the metering pin closes the orifice, the torque links fold, and on lift-off the centering cams straighten the wheel. Drag the wheel or use the up and down arrows to stroke the strut; the left and right arrows work the pedals." ` +
  `data-views='${JSON.stringify(VIEWS)}' data-live='${JSON.stringify(LIVE)}' data-lived='${JSON.stringify(LIVE_D)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  `<g clip-path="url(#clip-ground)">${mainView.slice(mainView.lastIndexOf('<g data-role="phantom" id="ground">'))}</g>` +
  mainView.slice(0, mainView.lastIndexOf('<g data-role="phantom" id="ground">')) +
  mainDims +
  mainBalloons +
  mainMarks +
  detailC +
  viewD +
  viewE +
  viewB +
  chartFC() +
  chartTour() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the wheel · <kbd>↑</kbd> <kbd>↓</kbd> stroke · <kbd>←</kbd> <kbd>→</kbd> pedals · <kbd>Space</kbd> a landing · <kbd>B</kbd> a bump · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "nose-gear.html"), {
  title: "Nose Landing Gear",
  description: "A live engineering drawing of a light aircraft's steerable oleo-pneumatic nose gear: it lands, taxis over a bump, steers with the pedals and lifts off, and the air spring, metering pin, snubber, torque links and centering cams all move from one model.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#oil)}.bp-sheet .tint.air{fill:url(#airdots)}.bp-sheet .oil-dot{fill:var(--bp-accent)}.bp-sheet .air-dot{fill:var(--bp-muted)}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet [data-drag]{cursor:grab}` +
    `.bp-sheet .tint.flow{fill:none;stroke:var(--bp-accent);stroke-width:1.6px;stroke-dasharray:5 3.5;stroke-linecap:butt;stroke-linejoin:round}.bp-sheet .tint.flow-head{fill:var(--bp-accent)}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHARTS__", JSON.stringify({ CH, CT, DX })),
});
const peak = TRACE.reduce((m, r) => Math.max(m, r[1]), 0);
console.log(`nose-gear.html  ${(size / 1024).toFixed(0)} KB  static c ${M.C_STATIC.toFixed(1)} mm at ${(M.P_STATIC - M.P_ATM).toFixed(2)} bar g  touchdown peak c ${peak.toFixed(1)} mm  oil top ${M.OIL_TOP0.toFixed(0)}→${M.oilTop(M.STROKE).toFixed(0)}`);
