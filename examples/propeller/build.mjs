// Builds propeller.html: a live A2 drawing of a light aircraft's fixed-pitch, two-blade propeller,
// its spinner and its bolting to the crankshaft flange; the blade drawn the way propeller drawings do
// it (projected planform, removed sections at four stations, blade data), with the blade-element
// velocity triangles live at every station.
//   node examples/propeller/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as X from "./extra.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k5 = 0.2 * K.PX_PER_MM;
const k25 = 0.4 * K.PX_PER_MM;

// ---------------------------------------------------------------- views
// Section boxes (B-B … E-E), 1:2.5, each with its own origin on the blade's pitch axis.
const BOXES = [
  { x: 432, y: 228 },
  { x: 607, y: 228 },
  { x: 432, y: 416 },
  { x: 607, y: 416 },
].map((b) => ({ ...b, w: 165, h: 140 }));
export const KV = 0.24; // sheet units per m/s in the velocity triangles
export const KL = 0.009; // sheet units per N/m of lift per blade
// place each section so the aerofoil, the velocity triangle (to 2900 rpm, 140 kt) and the lift fit
function placeBox(b, x) {
  const r = x * M.R;
  const pts = M.sectionAt(r).map(([t, z]) => [t * k25, z * k25]);
  const { le } = P.sectionPoints(r);
  const utMax = (2800 / 60) * 2 * Math.PI * (r / 1000) * KV;
  const uaMax = 85 * KV;
  const minX = Math.min(...pts.map((p) => p[0]), le[0] * k25 - utMax);
  const maxX = Math.max(...pts.map((p) => p[0]));
  const maxY = Math.max(...pts.map((p) => p[1]), le[1] * k25 + uaMax, 26);
  const minY = Math.min(...pts.map((p) => p[1]));
  const ox = b.x + (b.w - (maxX - minX)) / 2 - minX;
  const oy = b.y + (b.h - (maxY - minY)) / 2 + maxY;
  return { x: K.r2(ox), y: K.r2(oy), scale: 0.4 };
}
const VIEWS = {
  plan: { x: 150, y: 118, scale: 0.2 },
  A: { x: 330, y: 414, scale: 0.4 },
  ...Object.fromEntries(M.STATIONS.map((x, i) => [M.LETTERS[i], placeBox(BOXES[i], x)])),
};
const VP = K.view(VIEWS.plan);
const VA = K.view(VIEWS.A);
const VS = M.LETTERS.map((L) => K.view(VIEWS[L]));

// ---------------------------------------------------------------- VIEW FROM AHEAD, 1:5
const stationLines = M.STATIONS.map((x, i) => {
  const r = x * M.R;
  const [a, b] = M.projected(r);
  return X.cuttingPlane(VP, [r, -a + 26], [r, -b - 26], [1, 0], M.LETTERS[i], { chain: true });
}).join("");
const rotArrow = (() => {
  const pts = K.arc(0, 0, 205, 196, 236, 14);
  const [x1, y1] = VP.p(pts[pts.length - 1]);
  const [x0, y0] = VP.p(pts[pts.length - 2]);
  return `<g data-role="label">${K.line(VP, pts.slice(0, -1), "thin")}${X.vec(x0, y0, x1, y1, "thin", "head", 6)}</g>`;
})();
const planView =
  `<g data-geom="plan">` +
  P.planform(VP) +
  P.spinnerAhead(VP) +
  P.hiddenAhead(VP) +
  K.lines(VP, [K.circle(0, 0, M.FLANGE.bolt, 72)], "ctr") +
  K.centerline(VP, [-252, 0], [-M.SPIN_R - 4, 0], 0) +
  K.centerline(VP, [-M.SPIN_R - 6, 0], [M.SPIN_R + 6, 0], 0) +
  K.centerline(VP, [0, -M.SPIN_R - 6], [0, M.SPIN_R + 6], 0) +
  `</g>` +
  stationLines +
  X.cuttingPlane(VP, [-262, 0], [M.R + 22, 0], [0, 1], "A", { chain: false }) +
  rotArrow +
  K.dim(VP, [0, 0], [M.R, 0], { dir: "h", off: -72, prefix: "R" }) +
  K.balloon(VP, [640, 6], [468, 172], 1, { target: 1 }) +
  K.viewLabel(300, 200, "VIEW FROM AHEAD", "LOOKING AFT · BLADE 2 PROJECTED · ROTATION ANTICLOCKWISE · 1:5");

// ---------------------------------------------------------------- SECTION A-A: the hub, 1:2.5
const S = (s, r) => [-s, r];
const hubView =
  `<g data-geom="A">` +
  P.crank(VA) +
  P.support(VA) +
  P.ringGear(VA) +
  P.belt(VA) +
  P.bushings(VA) +
  P.rearBulkhead(VA) +
  P.hubSection(VA) +
  P.frontBulkhead(VA) +
  P.crushPlate(VA) +
  P.washers(VA) +
  P.bolts(VA) +
  P.wire(VA) +
  P.spinner(VA) +
  P.nutplates(VA) +
  P.screws(VA) +
  K.centerline(VA, S(P.S_TIP + 8, 0), S(-70, 0), 0) +
  K.centerline(VA, S(M.BLADE_S, 70), S(M.BLADE_S, P.R_BREAK + 6), 0) +
  K.centerline(VA, S(M.BLADE_S, -70), S(M.BLADE_S, -P.R_BREAK - 6), 0) +
  `</g>`;
const by = 270;
const bl = 568;
const hubBalloons =
  // above: upper half
  K.balloon(VA, S(250, P.rSpin(250) - 0.4), [86, by], 2, { target: 2 }) +
  K.balloon(VA, S(166, P.rSpin(166) - 1.6), [130, by], 3, { target: 3 }) +
  K.balloon(VA, S(118.8, 72), [174, by], 5, { target: 5 }) +
  K.balloon(VA, S(127.4, 46), [212, by], 15, { target: 15 }) +
  K.balloon(VA, S(11, 140), [336, by], 4, { target: 4 }) +
  K.balloon(VA, S(-20, 104.5), [362, by], 14, { target: 14 }) +
  K.balloon(VA, S(-37, 132), [388, by + 18], 11, { target: 11 }) +
  // below: lower half
  K.balloon(VA, S(16, -152.5), [214, bl], 12, { target: 12 }) +
  K.balloon(VA, S(160, -147.5), [100, bl], 13, { target: 13 }) +
  K.balloon(VA, S(128, -(M.FLANGE.bolt + 3)), [150, bl], 6, { target: 6 }) +
  K.balloon(VA, S(122.8, -(M.FLANGE.bolt + 9)), [184, bl], 7, { target: 7 }) +
  K.balloon(VA, S(5, -(M.FLANGE.bolt + 7.6)), [326, bl], 8, { target: 8 }) +
  K.balloon(VA, S(-6, -98), [360, bl], 10, { target: 10 }) +
  K.balloon(VA, S(-40, -20), [394, bl - 16], 9, { target: 9 });
const hubLabels =
  K.dim(VA, S(M.HUB_S0, M.SPIN_R), S(M.HUB_S0, -M.SPIN_R), { dir: "v", off: K.r2(404 - VA.p(S(M.HUB_S0, 0))[0]), prefix: "Ø" }) +
  K.viewLabel(196, 238, "SECTION A-A", "ON BOTH BLADES' PITCH AXES · HUB, SPINNER, BOLTING · 1:2.5");

// ---------------------------------------------------------------- SECTIONS B-B … E-E, 1:2.5
const STA = M.STATIONS.map((x, i) => {
  const r = x * M.R;
  const b = BOXES[i];
  const V = VS[i];
  const oy = V.p([0, 0])[1];
  const L = M.LETTERS[i];
  // the plane of rotation through the pitch axis, and the face line (the blade angle's reference)
  const face = M.placeSection([[-60, 0], [M.chord(r) + 30, 0]], r);
  return (
    `<g data-geom="${L}" clip-path="url(#clip-${L})"><rect class="paper" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>` +
    `<g data-role="fluid"><path id="flow-${L}" class="tint flow" d=""/></g>` +
    `<path class="ctr" d="M${b.x + 4} ${oy}H${b.x + b.w - 4}"/>` +
    K.line(V, face, "phan") +
    P.bladeSection(V, r) +
    K.centerMark(V, [0, 0], 4, 2) +
    `<g id="vt-${L}"></g>` +
    `</g><rect class="thin" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8"/>` +
    `<g data-role="label">` +
    `<text class="t t-lg" x="${b.x + b.w / 2}" y="${b.y + b.h + 14}" text-anchor="middle">SECTION ${L}-${L}</text>` +
    `<text class="t t-sm" x="${b.x + b.w / 2}" y="${b.y + b.h + 25}" text-anchor="middle">${Math.round(x * 100)} % R · r ${Math.round(r)} · β ${K.fmt(M.beta(r), 1)}° · 1:2.5</text>` +
    `<text class="t t-sm t-accent" id="st-${L}" x="${b.x + b.w / 2}" y="${b.y + b.h + 36}" text-anchor="middle"></text>` +
    `</g>`
  );
}).join("");

// ---------------------------------------------------------------- BLADE DATA table
const BD = { x: 566, y: 40, cols: [["STA", 26], ["r/R", 30], ["r", 34], ["CHORD", 40], ["t", 32], ["β, °", 44]], rowH: 13, headH: 16 };
function bladeData() {
  const rows = [0.2, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9, 0.95];
  const w = BD.cols.reduce((s, c) => s + c[1], 0);
  const h = BD.headH + rows.length * BD.rowH;
  let rules = "";
  let text = "";
  let cx = BD.x;
  BD.cols.forEach(([title, cw], i) => {
    if (i) rules += `M${cx} ${BD.y}V${BD.y + h}`;
    text += `<text class="t t-sm t-head" x="${cx + cw / 2}" y="${BD.y + 11}" text-anchor="middle">${title}</text>`;
    rows.forEach((x, j) => {
      const r = x * M.R;
      const k = M.STATIONS.findIndex((s) => Math.abs(s - x) < 1e-6);
      const cells = [k >= 0 ? M.LETTERS[k] : "", x.toFixed(2), Math.round(r), Math.round(M.chord(r)), K.fmt(M.thickness(r), 1), K.fmt(M.beta(r), 1)];
      text += `<text class="t t-sm" x="${cx + cw / 2}" y="${BD.y + BD.headH + j * BD.rowH + 9.4}" text-anchor="middle">${cells[i]}</text>`;
    });
    cx += cw;
  });
  rules += `M${BD.x} ${BD.y + BD.headH}H${BD.x + w}`;
  for (let j = 1; j < rows.length; j++) rules += `M${BD.x} ${BD.y + BD.headH + j * BD.rowH}H${BD.x + w}`;
  return (
    `<g data-role="bom"><rect class="paper" x="${BD.x}" y="${BD.y}" width="${w}" height="${h}"/><path class="thin" d="${rules}"/><rect class="vis" x="${BD.x}" y="${BD.y}" width="${w}" height="${h}"/>${text}</g>` +
    K.viewLabel(BD.x + w / 2, BD.y + h + 16, "BLADE DATA", "mm · β FROM THE FLAT FACE · FACE PITCH 1473")
  );
}

// ---------------------------------------------------------------- DIAGRAM 1: C_T, C_P and η against J
const C1 = { x0: 840, x1: 1128, y0: 166, y1: 372, jMax: 1.2, cMin: -0.02, cMax: 0.14 };
const jx = (J) => K.r2(C1.x0 + (Math.min(C1.jMax, Math.max(0, J)) / C1.jMax) * (C1.x1 - C1.x0));
const cy1 = (c) => K.r2(C1.y1 - ((Math.min(C1.cMax, Math.max(C1.cMin, c)) - C1.cMin) / (C1.cMax - C1.cMin)) * (C1.y1 - C1.y0));
const ey1 = (e) => cy1(e * C1.cMax);
function chartJ() {
  let grid = "";
  let labels = "";
  for (let c = C1.cMin; c <= C1.cMax + 1e-9; c += 0.02) {
    grid += `M${C1.x0} ${cy1(c)}H${C1.x1}`;
    if (c > C1.cMin + 1e-9) labels += `<text class="t t-sm" x="${C1.x0 - 4}" y="${K.r2(cy1(c) + 2.7)}" text-anchor="end">${c.toFixed(2)}</text>`;
  }
  for (let e = 0; e <= 1.0001; e += 0.2) labels += `<text class="t t-sm" x="${C1.x1 + 4}" y="${K.r2(ey1(e) + 2.7)}" text-anchor="start">${e.toFixed(1)}</text>`;
  for (let J = 0; J <= C1.jMax + 1e-9; J += 0.1) {
    grid += `M${jx(J)} ${C1.y0}V${C1.y1}`;
    if (Math.round(J * 10) % 2 === 0) labels += `<text class="t t-sm" x="${jx(J)}" y="${C1.y1 + 10}" text-anchor="middle">${J.toFixed(1)}</text>`;
  }
  let ct = "";
  let cp = "";
  let et = "";
  for (const row of M.TABLE) {
    if (row.J > C1.jMax + 1e-9) break;
    ct += `${ct ? "L" : "M"}${jx(row.J)} ${cy1(row.CT)}`;
    cp += `${cp ? "L" : "M"}${jx(row.J)} ${cy1(row.CP)}`;
    if (row.CT > 0 && row.CP > 0) et += `${et ? "L" : "M"}${jx(row.J)} ${ey1(row.eta)}`;
  }
  et += `L${jx(M.J_ZERO_T)} ${ey1(0)}`; // η falls to nothing where the thrust does
  const at = (J) => M.atJ(J);
  labels += `<text class="t t-sm" x="${jx(0.04)}" y="${K.r2(cy1(at(0.04).CT) - 4)}">C_T</text>`;
  labels += `<text class="t t-sm" x="${jx(0.04)}" y="${K.r2(cy1(at(0.04).CP) + 10)}">C_P</text>`;
  labels += `<text class="t t-sm" x="${jx(0.64)}" y="${K.r2(ey1(at(0.64).eta) + 15)}">η</text>`;
  labels += `<text class="t t-sm" x="${K.r2(jx(M.J_ZERO_T) - 3)}" y="${K.r2(cy1(0) + 10)}" text-anchor="end">T = 0</text>`;
  const tag = (J, s) => `<text class="t t-sm t-mute" x="${jx(J)}" y="${C1.y0 + 9}" text-anchor="middle">${s}</text>`;
  labels += tag(0.07, "RUN-UP") + tag(0.51, "CLIMB") + tag(0.74, "CRUISE") + tag(1.0, "GLIDE");
  labels += `<text class="t t-sm t-mute" x="${(C1.x0 + C1.x1) / 2}" y="${C1.y1 + 21}" text-anchor="middle">ADVANCE RATIO J = V / nD</text>`;
  labels += `<text class="t t-sm t-mute" x="${C1.x0 - 28}" y="${(C1.y0 + C1.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${C1.x0 - 28} ${(C1.y0 + C1.y1) / 2})">C_T = T/ρn²D⁴ · C_P = P/ρn³D⁵</text>`;
  labels += `<text class="t t-sm t-mute" x="${C1.x1 + 24}" y="${(C1.y0 + C1.y1) / 2}" text-anchor="middle" transform="rotate(90 ${C1.x1 + 24} ${(C1.y0 + C1.y1) / 2})">EFFICIENCY η = TV / P</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${C1.x0}" y="${C1.y0}" width="${C1.x1 - C1.x0}" height="${C1.y1 - C1.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="thin" d="M${C1.x0} ${cy1(0)}H${C1.x1}"/>` +
    `<path class="thin" d="${ct}"/><path class="hid" d="${cp}"/><path class="vis" d="${et}"/>` +
    `<path id="j-cursor" class="thin accent" d=""/>` +
    `<circle id="j-ct" class="accent-fill" r="2.4" cx="${jx(0)}" cy="${cy1(0)}"/><circle id="j-cp" class="accent-fill" r="2.4" cx="${jx(0)}" cy="${cy1(0)}"/><circle id="j-eta" class="accent-fill" r="3" cx="${jx(0)}" cy="${ey1(0)}"/>` +
    `<rect class="vis" x="${C1.x0}" y="${C1.y0}" width="${C1.x1 - C1.x0}" height="${C1.y1 - C1.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((C1.x0 + C1.x1) / 2, C1.y1 + 44, "DIAGRAM 1 · THRUST, POWER, EFFICIENCY", "BEM, THIS BLADE · THICK: η · THIN: C_T · DASHED: C_P · ACCENT: NOW")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: angles along the blade
const C2 = { x0: 76, x1: 396, y0: 618, y1: 766, xMin: 0.2, xMax: 1.0, aMin: 0, aMax: 60 };
const ax2 = (x) => K.r2(C2.x0 + ((x - C2.xMin) / (C2.xMax - C2.xMin)) * (C2.x1 - C2.x0));
const ay2 = (a) => K.r2(C2.y1 - ((Math.min(C2.aMax, Math.max(C2.aMin, a)) - C2.aMin) / (C2.aMax - C2.aMin)) * (C2.y1 - C2.y0));
function chartSpan() {
  let grid = "";
  let labels = "";
  for (let a = C2.aMin; a <= C2.aMax; a += 10) {
    grid += `M${C2.x0} ${ay2(a)}H${C2.x1}`;
    if (a > C2.aMin) labels += `<text class="t t-sm" x="${C2.x0 - 4}" y="${K.r2(ay2(a) + 2.7)}" text-anchor="end">${a}</text>`;
  }
  for (let x = 0.2; x <= 1.0001; x += 0.1) {
    grid += `M${ax2(x)} ${C2.y0}V${C2.y1}`;
    labels += `<text class="t t-sm" x="${ax2(x)}" y="${C2.y1 + 10}" text-anchor="middle">${x.toFixed(1)}</text>`;
  }
  const curve = (f) => {
    let d = "";
    for (let x = 0.2; x <= 0.995; x += 0.01) d += `${d ? "L" : "M"}${ax2(x)} ${ay2(f(x * M.R))}`;
    return d;
  };
  const beta = curve((r) => M.beta(r));
  const stall = curve((r) => M.beta(r) - M.ALPHA_STALL);
  const zero = curve((r) => M.beta(r) - M.ALPHA_L0);
  let marks = "";
  M.STATIONS.forEach((x, i) => {
    marks += `M${ax2(x)} ${C2.y0}V${C2.y1}`;
    labels += `<text class="t t-sm" x="${ax2(x) + 2}" y="${C2.y0 + 9}" text-anchor="start">${M.LETTERS[i]}</text>`;
  });
  const xl = 0.97;
  labels += `<text class="t t-sm" x="${ax2(xl)}" y="${K.r2(ay2(M.beta(xl * M.R)) - 3)}" text-anchor="end">β</text>`;
  labels += `<text class="t t-sm t-mute" x="${ax2(0.66)}" y="${K.r2(ay2(M.beta(0.66 * M.R) - M.ALPHA_L0 + 7))}" text-anchor="middle">ZERO LIFT</text>`;
  labels += `<text class="t t-sm t-mute" x="${ax2(0.25)}" y="${K.r2(ay2(M.beta(0.25 * M.R) - M.ALPHA_STALL - 9))}" text-anchor="middle">STALL</text>`;
  labels += `<text class="t t-sm t-mute" x="${(C2.x0 + C2.x1) / 2}" y="${C2.y1 + 21}" text-anchor="middle">STATION r / R</text>`;
  labels += `<text class="t t-sm t-mute" x="${C2.x0 - 22}" y="${(C2.y0 + C2.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${C2.x0 - 22} ${(C2.y0 + C2.y1) / 2})">ANGLE, °</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${C2.x0}" y="${C2.y0}" width="${C2.x1 - C2.x0}" height="${C2.y1 - C2.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/><path class="thin" d="${marks}"/>` +
    `<path id="span-alpha" class="tint span-fill" d=""/>` +
    `<path class="hid" d="${stall}"/><path class="hid" d="${zero}"/><path class="vis" d="${beta}"/>` +
    `<path id="span-phi" class="vis accent" d=""/>` +
    `<rect class="vis" x="${C2.x0}" y="${C2.y0}" width="${C2.x1 - C2.x0}" height="${C2.y1 - C2.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((C2.x0 + C2.x1) / 2, C2.y1 + 40, "DIAGRAM 2 · ALONG THE BLADE", "THICK: β · DASHED: β − α_s (STALL), β − α₀ (ZERO LIFT) · ACCENT: φ · GAP: α = β − φ")
  );
}

// ---------------------------------------------------------------- DIAGRAM 3: the tour
const TRACE = M.tourTrace(1 / 500, 25);
const C3 = { x0: 462, x1: 742, y0: 618, y1: 766, tMax: M.TOUR, rpmMax: 3000, tkMax: 3 };
const tx3 = (t) => K.r2(C3.x0 + (Math.min(C3.tMax, Math.max(0, t)) / C3.tMax) * (C3.x1 - C3.x0));
const ry3 = (rpm) => K.r2(C3.y1 - (Math.min(C3.rpmMax, Math.max(0, rpm)) / C3.rpmMax) * (C3.y1 - C3.y0));
const ty3 = (T) => K.r2(C3.y1 - (Math.min(C3.tkMax, Math.max(0, T / 1000)) / C3.tkMax) * (C3.y1 - C3.y0));
function chartTour() {
  let grid = "";
  let labels = "";
  for (let rpm = 0; rpm <= C3.rpmMax; rpm += 500) {
    grid += `M${C3.x0} ${ry3(rpm)}H${C3.x1}`;
    if (rpm % 1000 === 0) labels += `<text class="t t-sm" x="${C3.x0 - 4}" y="${K.r2(ry3(rpm) + 2.7)}" text-anchor="end">${rpm}</text>`;
  }
  for (let T = 0; T <= C3.tkMax; T += 1) labels += `<text class="t t-sm" x="${C3.x1 + 4}" y="${K.r2(ty3(T * 1000) + 2.7)}" text-anchor="start">${T}</text>`;
  for (let t = 0; t <= C3.tMax; t += 2) {
    grid += `M${tx3(t)} ${C3.y0}V${C3.y1}`;
    if (t % 4 === 0) labels += `<text class="t t-sm" x="${tx3(t)}" y="${C3.y1 + 10}" text-anchor="middle">${t}</text>`;
  }
  const rl = TRACE.map(([t, rpm]) => `${tx3(t)},${ry3(rpm)}`).join(" ");
  const tl = TRACE.map(([t, , , T]) => `${tx3(t)},${ty3(T)}`).join(" ");
  const tag = (t, s, dy = 0) => `<text class="t t-sm t-mute" x="${tx3(t)}" y="${C3.y1 - 6 - dy}" text-anchor="middle">${s}</text>`;
  labels += tag(3.6, "RUN-UP") + tag(7.3, "T/O") + tag(11, "CLIMB") + tag(17.2, "CRUISE") + tag(22.6, "GLIDE");
  labels += `<text class="t t-sm t-mute" x="${(C3.x0 + C3.x1) / 2}" y="${C3.y1 + 21}" text-anchor="middle">TOUR TIME t, s</text>`;
  labels += `<text class="t t-sm t-mute" x="${C3.x0 - 28}" y="${(C3.y0 + C3.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${C3.x0 - 28} ${(C3.y0 + C3.y1) / 2})">n, rpm</text>`;
  labels += `<text class="t t-sm t-mute" x="${C3.x1 + 18}" y="${(C3.y0 + C3.y1) / 2}" text-anchor="middle" transform="rotate(90 ${C3.x1 + 18} ${(C3.y0 + C3.y1) / 2})">T, kN</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${C3.x0}" y="${C3.y0}" width="${C3.x1 - C3.x0}" height="${C3.y1 - C3.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline class="hid" points="${tl}"/><polyline class="vis" points="${rl}"/>` +
    `<path id="t-cursor" class="thin" d="M${C3.x0} ${C3.y0}V${C3.y1}"/>` +
    `<circle id="t-rpm" class="accent-fill" cx="${C3.x0}" cy="${ry3(0)}" r="2.8"/><circle id="t-thr" class="dot" cx="${C3.x0}" cy="${ty3(0)}" r="2.2"/>` +
    `<rect class="vis" x="${C3.x0}" y="${C3.y0}" width="${C3.x1 - C3.x0}" height="${C3.y1 - C3.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((C3.x0 + C3.x1) / 2, C3.y1 + 40, "DIAGRAM 3 · THE TOUR", "THICK: SHAFT SPEED n · DASHED: THRUST T (RIGHT) · ACCENT: NOW")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "PROPELLER Ø1905, 2 BLADES, FIXED PITCH", "2025-T6 FORGING", "1"],
  ["2", "SPINNER DOME Ø320 × 0.8", "2024-T3", "1"],
  ["3", "SPINNER FRONT BULKHEAD 1.6", "2024-T3", "1"],
  ["4", "SPINNER REAR BULKHEAD 2.0", "2024-T3", "1"],
  ["5", "CRUSH PLATE 6.4", "4130 STEEL", "1"],
  ["6", "BOLT 7/16-20 UNF, DRILLED HEAD", "ALLOY STEEL, CAD PL.", "6"],
  ["7", "WASHER 7/16, AN960", "STEEL, CAD PL.", "6"],
  ["8", "DRIVE BUSHING Ø19.05, 7/16-20", "4140 STEEL, HT", "6"],
  ["9", "CRANKSHAFT FLANGE Ø165, PILOT Ø60", "34CrNiMo6 (ENGINE)", "REF"],
  ["10", "RING GEAR SUPPORT WITH PULLEY", "A356-T6 CASTING", "1"],
  ["11", "STARTER RING GEAR, 149 TEETH", "1045 STEEL, IND. HARD.", "1"],
  ["12", "SPINNER SCREW No 8, PAN HEAD", "CRES", "12"],
  ["13", "ANCHOR NUTPLATE No 8", "STEEL, CAD PL.", "12"],
  ["14", "ALTERNATOR V-BELT", "CR RUBBER / POLYESTER", "1"],
  ["15", "SAFETY WIRE Ø0.8, MS20995C32", "CRES 302", "A/R"],
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

const notes = K.notes(790, 42, "NOTES", [
  `CLASS FIXED PITCH Ø${M.D} (75 in), FACE PITCH ${M.PITCH} (58 in): tan β = P / 2πr.`,
  `SECTIONS B-E LOOK OUTBOARD: LEADING EDGE LEFT, FORWARD UP, TRUE β.`,
  `BEM: α = β − φ, c_l = 0.9·2π(α − α₀), α₀ ${M.ALPHA_L0}° FROM THE FACE, STALL AT ${M.CL_MAX}.`,
  `MOMENTUM INFLOW, PRANDTL TIP LOSS, ISA S.L. NO Re, MACH, BENDING: ±10 %.`,
  `ENGINE 120 kW AT ${M.RPM_RATED} rpm, DIRECT: n IS WHERE THE TWO TORQUES MEET.`,
  `6 BOLTS ON Ø${K.fmt(2 * M.FLANGE.bolt, 1)}, ${M.BOLT_TORQUE} N·m, WIRED IN PAIRS: BUSHINGS DRIVE, BOLTS CLAMP.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "FIXED-PITCH PROPELLER · HUB", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-104", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "AS SHOWN" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-18" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · N · kW" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · ↑ ↓ AIRSPEED · ← → THROTTLE · DRAG THE SECTIONS · SPACE: TOUR · S: SLOW", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const clips = BOXES.map((b, i) => `<clipPath id="clip-${M.LETTERS[i]}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8"/></clipPath>`).join("");
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  clips +
  `</defs>`;

const hitBox = `<rect class="hit" data-drag="sections" x="${BOXES[0].x}" y="${BOXES[0].y}" width="${BOXES[1].x + BOXES[1].w - BOXES[0].x}" height="${BOXES[2].y + BOXES[2].h - BOXES[0].y}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of the fixed-pitch two-blade propeller of a four-seat light aircraft: the blade from ahead with four section stations, the sections at 30, 50, 75 and 90 per cent radius at their true blade angles, and the hub, spinner and bolting to the crankshaft flange in section. The tour runs the engine up on the ground, takes off, climbs, cruises and glides with the throttle closed: at every station the velocity triangle of forward speed and blade speed turns, the angle of attack falls from stalled at the root to small in cruise and negative when the propeller windmills, and the diagrams follow thrust, power and efficiency against advance ratio. Up and down arrows change the airspeed, left and right the throttle." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  planView +
  hubView +
  hubLabels +
  hubBalloons +
  STA +
  bladeData() +
  chartJ() +
  chartSpan() +
  chartTour() +
  notes +
  bom +
  title +
  hitBox +
  `</svg>`;

const bar =
  `<span><kbd>↑</kbd> <kbd>↓</kbd> airspeed · <kbd>←</kbd> <kbd>→</kbd> throttle · drag the sections · <kbd>Space</kbd> tour · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "propeller.html"), {
  title: "Fixed-Pitch Propeller",
  description: "A live engineering drawing of a light aircraft's fixed-pitch propeller: blade sections at four stations with their velocity triangles, the hub, spinner and bolting in section, and thrust, power and efficiency from blade-element theory through a run-up, climb, cruise and windmilling glide.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet [data-drag]{cursor:ns-resize}` +
    `.bp-sheet .tint.flow{fill:none;stroke:var(--bp-accent);stroke-width:.7px;stroke-dasharray:7 5;stroke-opacity:.6}` +
    `.bp-sheet .tint.span-fill{fill:var(--bp-accent);fill-opacity:.16}` +
    `.bp-sheet .paper-line{fill:none;stroke:var(--bp-paper);stroke-width:.45px}` +
    `.bp-sheet .vis.accent{stroke:var(--bp-accent)}.bp-sheet .head.accent-fill{fill:var(--bp-accent)}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "extra.mjs"), "X"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHARTS__", JSON.stringify({ C1, C2, C3, KV, KL, BOXES })),
});
const st = M.shaft();
console.log(`propeller.html  ${(size / 1024).toFixed(0)} KB  idle ${st.rpm.toFixed(0)} rpm  static ${M.equilibriumRpm(0, 1).toFixed(0)} rpm  J(T=0) ${M.J_ZERO_T.toFixed(3)}  ηmax ${M.ETA_MAX.eta.toFixed(3)} at J ${M.ETA_MAX.J.toFixed(2)}`);
