// Builds main-gear.html: a live A2 drawing of a light aircraft's fixed main landing gear, cut on the
// leg's mid-plane looking aft: the tapered spring-steel leg in its gear box, the wheel and its disc
// brake, the toe-brake master cylinder and the brake lines.
//   node examples/main-gear/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k5 = 0.2 * K.PX_PER_MM;
const k25 = 0.4 * K.PX_PER_MM;
const k2 = 0.5 * K.PX_PER_MM;
const A0 = M.AXLE_STATIC;

// ---------------------------------------------------------------- views
const C = { x: 616, y: 40, w: 220, h: 170, u0: 140, v1: 787 }; // Detail C window, 1:2.5 (fuselage frame)
const B = { x: 72, y: 516, w: 246, h: 244, s0: -172, r1: 212 }; // Detail B window, 1:2 (axle frame)
const D = { x: 372, y: 518, w: 194, h: 182, m0: -42, q1: 102 }; // Section D-D window, 1:2 (MC frame)
const VIEWS = {
  main: { x: 32, y: 438, scale: 0.2 },
  A: { x: K.r2(32 + A0[0] * k5), y: K.r2(438 - A0[1] * k5), scale: 0.2 }, // the tip assembly in the main view
  C: { x: K.r2(C.x - C.u0 * k25), y: K.r2(C.y + C.v1 * k25), scale: 0.4 },
  B: { x: K.r2(B.x - B.s0 * k2), y: K.r2(B.y + B.r1 * k2), scale: 0.5 },
  D: { x: K.r2(D.x - D.m0 * k2), y: K.r2(D.y + D.q1 * k2), scale: 0.5 },
  E: { x: 386, y: 150, scale: 0.4 },
  F: { x: 534, y: 150, scale: 0.4 },
};
const VM = K.view(VIEWS.main);
const VA = K.view(VIEWS.A);
const VC = K.view(VIEWS.C);
const VB = K.view(VIEWS.B);
const VD = K.view(VIEWS.D);
const VE = K.view(VIEWS.E);
const VF = K.view(VIEWS.F);
const M_FLOOR_RAIL = P.FLOOR + 14;
const F0 = M.F_STATIC; // drawn at the static load; the page bends it

// ---------------------------------------------------------------- MAIN VIEW: SECTION A-A, 1:5
const calFluid = (V, id) => `<path id="${id}" class="tint" d="${P.calFluid(0).map((s) => K.d(V, s)).join("")}"/>`;
// the tip assembly rides on the leg's end; the runway flattens the tyre where it meets it (a clip)
const tipMain =
  `<g clip-path="url(#clip-tyre)"><g id="tip-main">` + P.tipAssembly(VA, { tip: false }) + `<g data-role="fluid">${calFluid(VA, "cal-main")}</g>` + `</g></g>`;
const fuselage = (V) => P.bulkhead(V) + P.floor(V) + P.skin(V) + P.fitting(V) + P.saddle(V) + P.cap(V);
const mainView =
  `<g data-geom="main">` +
  fuselage(VM) +
  `<g data-role="phantom">${P.legPhantom(VM)}<g transform="translate(${K.r2((M.AXLE_REST[0] - A0[0]) * k5)} ${K.r2(-(M.AXLE_REST[1] - A0[1]) * k5)}) rotate(${K.r2((M.axleTilt(0) * -180) / Math.PI)} ${VA.x} ${VA.y})">${P.tyrePhantom(VA)}</g></g>` +
  `<g id="leg-main">${P.legPart(VM, F0)}</g>` +
  `<g id="line-main">${P.brakeLine(VM, F0)}</g>` +
  P.inboardBolt(VM) +
  tipMain +
  K.centerline(VM, [0, -70], [0, 850], 0) +
  `</g>` +
  `<g data-role="phantom" id="ground"><path class="vis" d="M${VM.p([920, 0])[0]} 0H${VM.p([1440, 0])[0]}"/><path class="thin" d="${Array.from({ length: 26 }, (_, i) => `M${K.r2(VM.p([930 + i * 20, 0])[0])} 0l-5 6`).join("")}"/></g>`;

const LOOK = P.LOOK;
const planeE = (V) => P.planeMark(V, M.legPoint(0, -55), M.legPoint(0, 205), "E", LOOK);
const planeF = P.planeF;
const DIM_Y = 496;
const DX = 595;
const dimTrack = (F, vg) => P.dimTrack(VM, F, vg, DIM_Y);
const dimDefl = (F) => P.dimDefl(VM, F, DX);
const mainDims = `<g id="dim-t-wrap">${dimTrack(F0, 0)}</g><g id="dim-d-wrap">${dimDefl(F0)}</g>`;

// balloons: the leg and its line are live (dots ride on the bending leg); the tyre rides with the wheel
const LIVE = {
  1: { x: 180, y: 0, at: [178, 300] },
  25: { x: 640, y: 1, at: [296, 300] },
};
const liveBalloons = Object.keys(LIVE).map((n) => `<g id="lb-${n}"></g>`).join("");
const mainBalloons =
  K.balloon(VM, [P.RAILS[0], M_FLOOR_RAIL], [52, 84], 8, { target: 8 }) +
  K.balloon(VM, [160, 760], [86, 84], 7, { target: 7 }) +
  K.balloon(VM, [120, P.BELLY - 1], [86, 300], 9, { target: 9 }) +
  liveBalloons +
  `<g id="mvb-main">` +
  K.balloon(VA, [-40, 205], [462, 252], 18, { target: 18 }) +
  K.detailMark(VA, [-40, 40], 190, "B", 120) +
  `</g>`;
const mainMarks =
  `<g data-role="label">${planeE(VM)}</g><g data-role="label" id="plane-f">${planeF(VM, F0)}</g>` +
  K.detailMark(VM, [285, 690], 105, "C", 90) +
  K.viewLabel(300, 48, "SECTION A-A", "ON THE LEG'S MID-PLANE · LOOKING AFT · LEFT GEAR · 1:5");

// removed sections E-E (through the saddle) and F-F (halfway along the leg), 1:2.5
const viewE =
  `<g data-geom="E">${P.sectionE(VE)}${K.centerline(VE, [-80, 0], [80, 0], 0)}</g>` +
  K.dim(VE, [-M.B0 / 2, M.H0 / 2], [M.B0 / 2, M.H0 / 2], { dir: "h", off: -52 }) +
  K.dim(VE, [-M.B0 / 2, M.H0 / 2], [-M.B0 / 2, -M.H0 / 2], { dir: "v", off: -42 }) +
  K.balloon(VE, [56.5, 30], [VE.x + 76, 106], 4, { target: 4 }) +
  K.viewLabel(VE.x, 207, "SECTION E-E", "THROUGH THE SADDLE · 1:2.5");
const viewF =
  `<g data-geom="F">${P.sectionF(VF)}${K.centerline(VF, [-46, 0], [46, 0], 0)}</g>` +
  K.dim(VF, [-M.breadth(P.XF) / 2, -M.thick(P.XF) / 2], [M.breadth(P.XF) / 2, -M.thick(P.XF) / 2], { dir: "h", off: 26 }) +
  K.dim(VF, [M.breadth(P.XF) / 2, M.thick(P.XF) / 2], [M.breadth(P.XF) / 2, -M.thick(P.XF) / 2], { dir: "v", off: 16 }) +
  K.viewLabel(VF.x, 207, "SECTION F-F", "HALFWAY ALONG · 1:2.5");

// ---------------------------------------------------------------- DETAIL C: the leg's attachment, 1:2.5
const detailC =
  `<g data-geom="C" clip-path="url(#clip-C)"><rect class="paper" x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}"/>` +
  fuselage(VC) +
  `<g id="leg-C">${P.legPart(VC, F0)}</g>` +
  P.brakeLine(VC, F0) +
  P.inboardBolt(VC) +
  P.capBoltsHidden(VC) +
  K.centerline(VC, M.legPoint(-M.A_IN, -70), M.legPoint(-M.A_IN, 46), 0) +
  K.centerline(VC, M.legPoint(-60, 0), M.legPoint(120, 0), 0) +
  `</g><rect class="thin" x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="10"/>` +
  K.balloon(VC, M.legPoint(-185, -M.H0 / 2 - 18), [646, 226], 5, { target: 5 }) +
  K.balloon(VC, M.legPoint(-M.A_IN, M.H0 / 2 + 4), [690, 226], 6, { target: 6 }) +
  K.balloon(VC, M.legPoint(-10, M.H0 / 2 + 10), [734, 226], 2, { target: 2 }) +
  K.balloon(VC, M.legPoint(10, -M.H0 / 2 - 6), [778, 226], 3, { target: 3 }) +
  K.viewLabel(C.x + C.w / 2, 254, "DETAIL C", "THE LEG'S ATTACHMENT · 1:2.5");

// ---------------------------------------------------------------- DETAIL B: wheel and brake, 1:2.5
const detailB =
  `<g data-geom="B" clip-path="url(#clip-B)"><rect class="paper" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}"/>` +
  P.tipAssembly(VB, { tip: true }) +
  `<g data-role="fluid">${calFluid(VB, "cal-B")}</g>` +
  K.centerline(VB, [-168, 0], [80, 0], 0) +
  K.centerline(VB, [-122, 78], [-74, 78], 0) +
  `</g><rect class="thin" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10"/>` +
  K.dim(VB, [-M.TYRE_W / 2, 140], [M.TYRE_W / 2, 140], { dir: "h", off: 508 - VB.p([0, 140])[1] }) +
  `__BALLOONS_B__` +
  K.viewLabel(B.x + B.w / 2, 782, "DETAIL B", "WHEEL AND BRAKE ON THE AXLE'S PLANE · RIDES WITH THE WHEEL · 1:2");
// Detail B's balloons, sorted down two columns by their dots
const BB = [
  [20, [-117, 112]], [23, [-80, 108]], [24, [-90, 100.5]], [22, [-95, 78]], [21, [-108, 66]], [12, [-123, 40]], [11, P.tipPt(30, -M.thick(M.L - 30) / 2 - 1.6)], [10, [-170, -14]],
  [13, [-36, 73]], [14, [-44, 55]], [19, [-89.2, 58]], [15, [-50, 27.8]], [16, [-63, 24]], [17, [70, 17]],
];
// place a column's balloons as near their dots' heights as a 21-unit pitch allows
function column(list, x, y0, y1) {
  const items = list.map(([n, at]) => ({ n, at, y: VB.p(at)[1] })).sort((a, b) => a.y - b.y);
  for (let i = 0; i < items.length; i++) items[i].y = Math.max(items[i].y, i ? items[i - 1].y + 21 : y0);
  for (let i = items.length - 1; i >= 0; i--) items[i].y = Math.min(items[i].y, i < items.length - 1 ? items[i + 1].y - 21 : y1);
  return items.map((it) => K.balloon(VB, it.at, [x, K.r2(it.y)], it.n, { target: it.n })).join("");
}
function balloonsB() {
  return column(BB.slice(0, 8), 48, 532, 750) + column(BB.slice(8), 338, 532, 750);
}

// ---------------------------------------------------------------- SECTION D-D: master cylinder, 1:2
const mcFluid = (V) =>
  `<g data-role="fluid"><path id="mc-hi" class="tint" d="${P.mcFluidHigh(0).map((s) => K.d(V, s)).join("")}"/>` +
  `<path id="mc-lo" class="tint" fill-opacity="0.18" d="${P.mcFluidLow().map((s) => K.d(V, s)).join("")}"/></g>`;
const DIM_S_Y = -88; // the rod's travel, measured below the window
function dimStroke(x) {
  if (x < 1) return "";
  const a = [P.rodEnd(0) + 9, -6];
  const b = [P.rodEnd(x) + 9, -6];
  return K.dim(VD, a, b, { dir: "h", off: VD.p([0, DIM_S_Y])[1] - VD.p([0, -6])[1], text: `${K.fmt(x, 1)}`, id: "dim-s" });
}
const sectionD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>` +
  `<g data-role="phantom">${P.rudderPedalPhantom(VD)}<g>${K.line(VD, P.pedalPts(), "phan", true)}</g></g>` +
  mcFluid(VD) +
  P.mcBody(VD) +
  `<g id="mc-spring">${P.mcSpring(VD, 0)}</g>` +
  `<g id="mc-piston">${P.mcPiston(VD, 0)}</g>` +
  `<g id="mc-pedal">${P.pedal(VD, 0)}</g>` +
  K.centerline(VD, [-34, 0], [128, 0], 0) +
  `</g><rect class="thin" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/>` +
  K.dim(VD, [0, M.MC_BORE / 2], [0, -M.MC_BORE / 2], { dir: "v", off: D.x - 12 - VD.p([0, 0])[0], prefix: "Ø" }) +
  `<g id="dim-s-wrap"></g>` +
  K.balloon(VD, [10, 12], [588, 532], 26, { target: 26 }) +
  `<g id="lb-27"></g><g id="lb-28"></g><g id="lb-29"></g>` +
  K.viewLabel(D.x + D.w / 2, 738, "SECTION D-D", "TOE BRAKE, MASTER CYLINDER · 1:2");
const LIVE_D = { 27: { at: [588, 574] }, 28: { at: [588, 612] }, 29: { at: [588, 650] } };

// ---------------------------------------------------------------- DIAGRAM 1: leg load against deflection
const CH = { x0: 656, x1: 812, y0: 292, y1: 396, dMax: 100, fMax: 8 };
const fx = (d) => K.r2(CH.x0 + (Math.max(0, Math.min(CH.dMax, d)) / CH.dMax) * (CH.x1 - CH.x0));
const fy = (F) => K.r2(CH.y1 - (Math.max(0, Math.min(CH.fMax, F / 1000)) / CH.fMax) * (CH.y1 - CH.y0));
function chartLoad() {
  let grid = "";
  let labels = "";
  for (let F = 0; F <= CH.fMax; F += 2) {
    grid += `M${CH.x0} ${fy(F * 1000)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 4}" y="${K.r2(fy(F * 1000) + 2.7)}" text-anchor="end">${F}</text>`;
  }
  for (const s of [0, 200, 400]) labels += `<text class="t t-sm" x="${CH.x1 + 4}" y="${K.r2(fy(s / M.SIGMA_MAX1) + 2.7)}" text-anchor="start">${s}</text>`;
  for (let d = 0; d <= CH.dMax; d += 20) {
    grid += `M${fx(d)} ${CH.y0}V${CH.y1}`;
    if (d % 40 === 0) labels += `<text class="t t-sm" x="${fx(d)}" y="${CH.y1 + 10}" text-anchor="middle">${d}</text>`;
  }
  const legLine = `M${fx(0)} ${fy(0)}L${fx(CH.dMax)} ${fy(M.K_LEG * CH.dMax)}`;
  // with the tyre in series: the airframe's travel for the same load
  let series = "";
  for (let F = 0; F <= CH.fMax * 1000; F += 250) series += `${series ? "L" : "M"}${fx(F / M.K_LEG + (F / M.K_TYRE) * 1000)} ${fy(F)}`;
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 21}" text-anchor="middle">AXLE DEFLECTION δ, mm</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x0 - 18}" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH.x0 - 18} ${(CH.y0 + CH.y1) / 2})">LOAD F, kN</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x1 + 24}" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(90 ${CH.x1 + 24} ${(CH.y0 + CH.y1) / 2})">σ MAX, MPa</text>`;
  labels += `<text class="t t-sm" x="${fx(3)}" y="${K.r2(fy(M.F_STATIC) - 3)}">STATIC</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="vis" d="${legLine}"/><path class="hid" d="${series}"/><path class="thin" d="M${CH.x0} ${fy(M.F_STATIC)}H${fx(M.deflection(M.F_STATIC))}"/>` +
    `<circle class="dot" cx="${fx(M.deflection(M.F_STATIC))}" cy="${fy(M.F_STATIC)}" r="2.4"/>` +
    `<polyline id="fc-trail" class="vis accent" points=""/>` +
    `<circle id="fc-dot" class="accent-fill" cx="${fx(0)}" cy="${fy(0)}" r="2.8"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel(726, 444, "DIAGRAM 1 · LEG LOAD", "THICK: BEAM · DASHED: + TYRE · ACCENT: LAST 2 s")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: brake pressure over the tour
const TRACE = M.tourTrace(1 / 2000, 40);
const CT = { x0: 884, x1: 1140, y0: 50, y1: 146, tMax: M.TOUR, pMax: 50 };
const tx = (t) => K.r2(CT.x0 + (t / CT.tMax) * (CT.x1 - CT.x0));
const py = (p) => K.r2(CT.y1 - (Math.min(CT.pMax, p) / CT.pMax) * (CT.y1 - CT.y0));
function chartBrakes() {
  let grid = "";
  let labels = "";
  for (let p = 0; p <= CT.pMax; p += 10) {
    grid += `M${CT.x0} ${py(p)}H${CT.x1}`;
    if (p % 20 === 0) labels += `<text class="t t-sm" x="${CT.x0 - 4}" y="${K.r2(py(p) + 2.7)}" text-anchor="end">${p}</text>`;
  }
  const tPer = M.brakeTorque(1); // N·m per bar
  for (const T of [0, 200, 400]) labels += `<text class="t t-sm" x="${CT.x1 + 4}" y="${K.r2(py(T / tPer) + 2.7)}" text-anchor="start">${T}</text>`;
  for (let t = 0; t <= CT.tMax; t += 2) {
    grid += `M${tx(t)} ${CT.y0}V${CT.y1}`;
    if (t % 4 === 0) labels += `<text class="t t-sm" x="${tx(t)}" y="${CT.y1 + 10}" text-anchor="middle">${t}</text>`;
  }
  const lLine = TRACE.map(([t, , , pl]) => `${tx(t)},${py(pl)}`).join(" ");
  const rLine = TRACE.map(([t, , , , pr]) => `${tx(t)},${py(pr)}`).join(" ");
  const tag = (t, s) => `<text class="t t-sm" x="${tx(t)}" y="${CT.y0 + 9}" text-anchor="middle">${s}</text>`;
  labels += tag(1.4, "TD") + tag(6.6, "BOTH") + tag(11.6, "LEFT") + tag(14.8, "RIGHT") + tag(17.1, "STOP");
  labels += `<text class="t t-sm t-mute" x="${(CT.x0 + CT.x1) / 2}" y="${CT.y1 + 21}" text-anchor="middle">TOUR TIME t, s</text>`;
  labels += `<text class="t t-sm t-mute" x="${CT.x0 - 20}" y="${(CT.y0 + CT.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CT.x0 - 20} ${(CT.y0 + CT.y1) / 2})">p, bar</text>`;
  labels += `<text class="t t-sm t-mute" x="${CT.x1 + 26}" y="${(CT.y0 + CT.y1) / 2}" text-anchor="middle" transform="rotate(90 ${CT.x1 + 26} ${(CT.y0 + CT.y1) / 2})">T, N·m</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CT.x0}" y="${CT.y0}" width="${CT.x1 - CT.x0}" height="${CT.y1 - CT.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline class="hid" points="${rLine}"/>` +
    `<polyline class="vis" points="${lLine}"/>` +
    `<path id="ct-cursor" class="thin" d="M${CT.x0} ${CT.y0}V${CT.y1}"/>` +
    `<circle id="ct-l" class="accent-fill" cx="${CT.x0}" cy="${py(0)}" r="2.8"/>` +
    `<circle id="ct-r" class="dot" cx="${CT.x0}" cy="${py(0)}" r="2.2"/>` +
    `<rect class="vis" x="${CT.x0}" y="${CT.y0}" width="${CT.x1 - CT.x0}" height="${CT.y1 - CT.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CT.x0 + CT.x1) / 2, 184, "DIAGRAM 2 · THE BRAKES OVER THE TOUR", "THICK: LEFT · DASHED: RIGHT · ACCENT: NOW")
  );
}

// ---------------------------------------------------------------- DIAGRAM 3: the brake system, schematic
const SC = { x: 616, y: 476, w: 220, h: 214 };
function schematic() {
  const cx = SC.x + SC.w / 2;
  const top = SC.y + 26;
  // pedal + master cylinder symbols for each side, the lines aft to each wheel's caliper
  const side = (sg, id) => {
    const px = cx + sg * 40;
    const mc = `<rect class="vis" x="${px - 7}" y="${top + 6}" width="14" height="30"/><rect class="thin" x="${px - 7}" y="${top - 6}" width="14" height="12"/><path class="vis" d="M${px - 7} ${top + 18}H${px + 7}"/>`;
    const wx = cx + sg * 86;
    const wy = SC.y + 156;
    const wheelSym = `<rect class="vis" x="${wx - 9}" y="${wy - 24}" width="18" height="48" rx="5"/><rect class="vis" x="${wx - sg * 18 - 5}" y="${wy - 10}" width="10" height="20"/><path class="thin" d="M${wx - 12} ${wy}H${wx + 12}"/>`;
    const route = `M${px} ${top + 36}V${top + 70}H${wx - sg * 18}V${wy - 10}`;
    return (
      mc +
      `<path id="sch-line-${id}" class="tint line" d="${route}"/>` +
      `<path class="thin" d="${route}"/>` +
      wheelSym +
      `<text class="t t-sm" x="${px}" y="${top - 10}" text-anchor="middle">${id.toUpperCase()} TOE</text>` +
      `<text class="t t-sm" x="${wx}" y="${wy + 36}" text-anchor="middle">${id === "l" ? "LEFT" : "RIGHT"} BRAKE</text>` +
      `<text class="t t-sm" id="sch-p-${id}" x="${px + sg * 12}" y="${top + 60}" text-anchor="${sg < 0 ? "end" : "start"}">0 bar</text>`
    );
  };
  // the airframe's centre line and a plan outline, thin
  const outline = `<path class="ctr" d="M${cx} ${SC.y + 8}V${SC.y + 196}"/>`;
  return (
    `<g data-role="chart">` +
    outline +
    side(-1, "l") +
    side(1, "r") +
    `<text class="t t-sm" id="sch-yaw" x="${cx}" y="${SC.y + 206}" text-anchor="middle">STRAIGHT</text>` +
    `</g>` +
    K.viewLabel(cx, 724, "DIAGRAM 3 · BRAKES", "SCHEMATIC · NOSE UP · ONE TOE, ONE WHEEL")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "MAIN GEAR LEG, TAPERED 90×30–60×18", "6150 STEEL HRC 46–50", "1"],
  ["2", "SADDLE FORGING, OUTBOARD", "7075-T7351", "1"],
  ["3", "SADDLE CAP", "4130 STEEL", "1"],
  ["4", "CAP BOLT AN7, NUT AN365", "STEEL, CAD PL.", "2"],
  ["5", "INBOARD FITTING", "4130 STEEL", "1"],
  ["6", "INBOARD BOLT AN8, NUT AN310", "STEEL, CAD PL.", "1"],
  ["7", "GEAR BOX BULKHEAD", "2024-T3, 1.6", "2"],
  ["8", "CABIN FLOOR AND SEAT RAILS", "2024-T3 / 6061-T6", "1"],
  ["9", "SKIN, BELLY AND SIDE", "2024-T3 ALCLAD 0.8", "1"],
  ["10", "AXLE Ø31.75 WITH BLOCK, SPACER", "4340 STEEL, HT", "1"],
  ["11", "AXLE BOLT AN6 + TAPERED SHIM", "STEEL / 2024-T4", "4"],
  ["12", "TORQUE PLATE", "4130 STEEL", "1"],
  ["13", "WHEEL 6.00-6, TWO HALVES", "356-T6 CASTING", "1"],
  ["14", "WHEEL TIE BOLT AN5", "STEEL, CAD PL.", "4"],
  ["15", "TAPERED ROLLER BEARING Ø31.75", "52100 STEEL", "2"],
  ["16", "GREASE SEAL", "NBR / STEEL", "2"],
  ["17", "AXLE NUT, COTTER PIN", "STEEL, CAD PL.", "1"],
  ["18", "TYRE 6.00-6 4 PLY + TUBE", "NR / NYLON", "1"],
  ["19", "BRAKE DISC Ø190.5×6.35", "1045 STEEL", "1"],
  ["20", "CALIPER CYLINDER", "2024-T351", "1"],
  ["21", "PISTON Ø44.45 + O-RING", "6061-T6 ANOD. / NBR", "1"],
  ["22", "PRESSURE PLATE AND LINING", "STEEL / ORGANIC", "1"],
  ["23", "BACK PLATE AND LINING", "STEEL / ORGANIC", "1"],
  ["24", "ANCHOR BOLT", "4130 STEEL", "2"],
  ["25", "BRAKE LINE Ø4.76 AND HOSE", "5052-O / MIL-H HOSE", "1 SET"],
  ["26", "MASTER CYLINDER Ø12.7 + RESERVOIR", "A356-T6 CASTING", "1"],
  ["27", "PISTON, CUP AND ROD", "2024-T4 / EPDM", "1"],
  ["28", "RETURN SPRING", "302 STAINLESS", "1"],
  ["29", "TOE BRAKE PEDAL", "2024-T4", "1"],
];
const TB = { x: 850, w: 326, h: 140 };
TB.y = 824 - TB.h;
const rowH = 12.5;
const bomTop = TB.y - (18 + BOM.length * rowH);
const bom = K.table(TB.x, bomTop, [
  { w: 26, align: "center", title: "ITEM" },
  { w: 168, title: "DESCRIPTION" },
  { w: 104, title: "MATERIAL" },
  { w: 28, align: "center", title: "QTY" },
], BOM, { rowH });

const pct = (x) => Math.round(x * 1000) / 10;
const notes = K.notes(860, 212, "NOTES", [
  `QUANTITIES PER SIDE. LEFT GEAR SHOWN, THE RIGHT IS OPPOSITE HAND.`,
  `LEG: A BEAM ON BOLT 6 AND SADDLE 2. σ = 6M/bh², E ${M.E / 1000} GPa.`,
  `STATIC ${K.fmt(M.F_STATIC / 1000, 2)} kN A WHEEL (${pct(M.MAIN_SHARE / 2)} % OF ${M.MTOW} kg): δ ${Math.round(M.deflection(M.F_STATIC))}, σ ${Math.round(M.sigmaMax(M.F_STATIC))} MPa.`,
  `SHIMS 11 SET CAMBER 0° AT THE STATIC LOAD (+${K.fmt(M.camber(0), 1)}° UNLOADED).`,
  `NO DAMPER: TYRE SCRUB AND FITTING FRICTION ONLY, ζ ≈ ${M.ZETA}.`,
  `p = F/A: ${K.fmt(M.PEDAL_RATIO, 1)}:1 PEDAL, Ø${M.MC_BORE} TO Ø${M.CAL_BORE}. MIL-PRF-5606.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 236, h: 32, label: "TITLE", value: "MAIN LANDING GEAR", size: "lg" },
  { x: 236, y: 0, w: 90, h: 32, label: "DWG NO", value: "BP-103", size: "lg" },
  { x: 0, y: 32, w: 50, h: 25, label: "SCALE", value: "1:5" },
  { x: 50, y: 32, w: 40, h: 25, label: "SIZE", value: "A2" },
  { x: 90, y: 32, w: 50, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 140, y: 32, w: 86, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 226, y: 32, w: 100, h: 25, label: "DATE", value: "2026-10-18" },
  { x: 0, y: 57, w: 110, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 110, y: 57, w: 96, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 206, y: 57, w: 120, h: 25, label: "UNITS", value: "mm · N · bar" },
  { x: 0, y: 82, w: 326, h: 29, label: "LIVE · LEG · DRAG THE WHEEL OR ↑ ↓ TO LOAD IT", value: "", id: "readout", size: "sm" },
  { x: 0, y: 111, w: 326, h: 29, label: "LIVE · BRAKES · HOLD ← LEFT TOE · → RIGHT TOE · B BOTH · SPACE: A LANDING", value: "", id: "readout2", size: "sm" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="oil" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="oil-dot" cx="0.8" cy="0.8" r="0.62"/><circle class="oil-dot" cx="2.4" cy="2.4" r="0.62"/></pattern>` +
  `<pattern id="airdots" patternUnits="userSpaceOnUse" width="6" height="6"><circle class="air-dot" cx="1.5" cy="1.5" r="0.5"/><circle class="air-dot" cx="4.5" cy="4.5" r="0.5"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-C"><rect x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-B"><rect x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-D"><rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-tyre"><rect id="clip-tyre-r" x="24" y="24" width="1152" height="${K.r2(VM.p([0, 0])[1] - 24)}"/></clipPath>` +
  `<clipPath id="clip-ground"><rect x="300" y="250" width="300" height="236"/></clipPath>` +
  `</defs>`;

const wheelBox = [VM.p([1150, 470]), VM.p([1400, -110])];
const hit =
  `<rect class="hit" data-drag="main" x="${K.r2(wheelBox[0][0])}" y="${K.r2(wheelBox[0][1])}" width="${K.r2(wheelBox[1][0] - wheelBox[0][0])}" height="${K.r2(wheelBox[1][1] - wheelBox[0][1])}"/>`;

const groundAt = mainView.lastIndexOf('<g data-role="phantom" id="ground">');
const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of the fixed main landing gear of a four-seat light aircraft, cut on the leg's mid-plane looking aft: a tapered spring-steel leg clamped in the fuselage between a bolt and a saddle, the axle, the 6.00-6 wheel and its single-disc brake, and the toe-brake master cylinder. The tour lands on the gear: the leg bends as a beam, the track widens and the wheel leans in; then both toe brakes press, the line pressure clamps the disc and the aeroplane slows; then each toe alone turns it. Drag the wheel or use the up and down arrows to load the leg; hold the left or right arrow for a toe brake." ` +
  `data-views='${JSON.stringify(VIEWS)}' data-live='${JSON.stringify(LIVE)}' data-lived='${JSON.stringify(LIVE_D)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  `<g clip-path="url(#clip-ground)">${mainView.slice(groundAt)}</g>` +
  mainView.slice(0, groundAt) +
  mainDims +
  mainBalloons +
  mainMarks +
  viewE +
  viewF +
  detailC +
  detailB.replace("__BALLOONS_B__", balloonsB()) +
  sectionD +
  chartLoad() +
  chartBrakes() +
  schematic() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the wheel · <kbd>↑</kbd> <kbd>↓</kbd> load · hold <kbd>←</kbd> <kbd>→</kbd> toe brakes · <kbd>B</kbd> both · <kbd>Space</kbd> a landing · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "main-gear.html"), {
  title: "Main Landing Gear",
  description: "A live engineering drawing of a light aircraft's fixed main gear: a tapered spring-steel leg that bends as a beam on landing, widening the track and leaning the wheel, and a single-disc hydraulic brake worked by a toe-pedal master cylinder, all from one model.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#oil)}.bp-sheet .tint.air{fill:url(#airdots)}.bp-sheet .oil-dot{fill:var(--bp-accent)}.bp-sheet .air-dot{fill:var(--bp-muted)}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet [data-drag]{cursor:grab}` +
    `.bp-sheet .tint.line{fill:none;stroke:var(--bp-accent);stroke-width:3.2px;stroke-linejoin:round}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHARTS__", JSON.stringify({ CH, CT, DX, DIM_Y, DIM_S_Y })),
});
const peak = TRACE.reduce((m, r) => Math.max(m, r[2]), 0);
console.log(`main-gear.html  ${(size / 1024).toFixed(0)} KB  K ${M.K_LEG.toFixed(1)} N/mm  static δ ${M.deflection(M.F_STATIC).toFixed(1)} mm σ ${M.sigmaMax(M.F_STATIC).toFixed(0)} MPa  touchdown peak ${(peak / 1000).toFixed(2)} kN σ ${M.sigmaMax(peak).toFixed(0)} MPa  camber0 ${M.camber(0).toFixed(2)}°`);
