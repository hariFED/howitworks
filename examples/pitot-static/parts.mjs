// The pitot-static system's parts, in world mm. Each function draws one part into a view and returns
// SVG, so the main views and the details draw the same geometry at their own scale.
//
// Frames.
//   PLAN (from above): u = FS (aft to the right, nose left), v = BL (starboard up).
//   SIDE (from port): u = FS, v = WL.
//   PITOT HEAD (section A-A on its vertical mid-plane): u = x, from the tip aft; v = y up from the axis.
//   TAIL CONE (section C-C at the ports' station, looking forward): u = BL (starboard right), v = WL.
//   STATIC PORT (detail D, the left port): u = BL, v = WL, as in C-C.
//   DRAIN TRAP (section F-F) and ALTERNATE VALVE (section E-E): their own axes, u across, v up / u along.
//   INSTRUMENTS: x along the axis from the case's back face (0) to the panel's aft face (107), aft to
//   the right; y up; z to the pilot's right. Sections (side, from port) u = x, v = y; front views
//   (from the pilot) u = z, v = y.

import * as K from "../../kit/draft.mjs";
import * as A from "../light-aircraft/model.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const rad = Math.PI / 180;
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
export const rot = (pts, [cu, cv], deg) => {
  const c = Math.cos(deg * rad);
  const s = Math.sin(deg * rad);
  return pts.map(([u, v]) => [cu + (u - cu) * c - (v - cv) * s, cv + (u - cu) * s + (v - cv) * c]);
};
const pol = (c, r, deg) => [c[0] + r * Math.cos(deg * rad), c[1] + r * Math.sin(deg * rad)];
// clockwise-from-twelve dial angle → math angle
const dialPt = (c, r, cw) => pol(c, r, 90 - cw);
// a strip of half-width w along a polyline (a tube wall, a crank)
export function strip(pts, w0, w1 = w0) {
  const L = [];
  const R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const w = w0 + ((w1 - w0) * i) / Math.max(1, pts.length - 1);
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return [...L, ...R.reverse()];
}
// offset a polyline sideways by d (for the two walls of a tube seen in section)
export function offset(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [p[0] - ((b[1] - a[1]) / len) * d, p[1] + ((b[0] - a[0]) / len) * d];
  });
}
// a tube cut lengthwise: two thin walls (blacked in), bore between them
export const tubeCut = (V, pts, ro, ri) => K.cut(V, [...offset(pts, ri), ...offset(pts, ro).reverse()], { mat: "solid" }) + K.cut(V, [...offset(pts, -ro), ...offset(pts, -ri).reverse()], { mat: "solid" });
export const boreOf = (pts, ri) => [...offset(pts, ri), ...offset(pts, -ri).reverse()];
const disc = (V, c, r, cls = "solid", n = 20) => `<path class="${cls}" d="${K.d(V, K.circle(c[0], c[1], r, n))}"/>`;
// a hole through a cut face (evenodd)
export function cutHoles(V, outer, holes, { mat = "steel", angle = 45 } = {}) {
  const dd = K.d(V, outer) + holes.map((h) => K.d(V, h)).join("");
  if (mat === "solid") return `<path class="solid" fill-rule="evenodd" d="${dd}"/>`;
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path fill="url(#h-${mat}-${angle})" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
}
// a spur gear's outline (simple straight-flank teeth): pitch radius rp, n teeth, turned by deg
export function gearPts(c, rp, n, deg = 0, { arc = [0, 360], addendum = null } = {}) {
  const m = (2 * rp) / n;
  const ra = rp + (addendum ?? m);
  const rf = rp - 1.25 * m;
  const pitch = 360 / n;
  const out = [];
  const a0 = arc[0];
  const a1 = arc[1];
  const full = a1 - a0 >= 359.9;
  for (let k = 0; k < Math.round((a1 - a0) / pitch); k++) {
    const a = a0 + k * pitch + deg;
    out.push(pol(c, rf, a), pol(c, rf, a + pitch * 0.22), pol(c, ra, a + pitch * 0.36), pol(c, ra, a + pitch * 0.64), pol(c, rf, a + pitch * 0.78));
  }
  if (!full) out.push(pol(c, rf, a1 + deg));
  return out;
}

// ================================================================ the airframe, phantom (the parent's shapes)
const C = A.CABIN;
const CT = A.TAILCONE;
const cowlTop = (fs) => A.THRUST_WL + A.cowlR(fs);
const cowlBot = (fs) => A.THRUST_WL - A.cowlR(fs);
const coneTop = (fs) => CT.axis + A.coneR(fs);
const coneBot = (fs) => CT.axis - A.coneR(fs);
export const VIEW_FS = [-1120, 3560]; // the schematic views stop here (a break aft of the ports)
export const VIEW_WS = 4420; // and the port wing breaks here, outboard of the pitot
export function sideOutline() {
  const top = [...range(A.COWL.front, 0, 16).map((f) => [f, cowlTop(f)]), A.WINDSCREEN.top, ...range(CT.fs0, VIEW_FS[1], 10).map((f) => [f, coneTop(f)])];
  const bot = [...range(A.COWL.front, 0, 16).map((f) => [f, cowlBot(f)]), [0, C.floor], [CT.fs0, C.floor], ...range(CT.fs0, VIEW_FS[1], 10).map((f) => [f, coneBot(f)])];
  return [...top, ...bot.reverse()];
}
// the wing's root section (FS, WL), its chord line turned by the incidence: the parent's placement
export function wingSide(ws = 0) {
  const af = A.naca2412(30);
  const c = A.chordAt(ws);
  const le = A.leAt(ws);
  const wl = A.WL_LE + A.dihedralRise(ws);
  return [...af.upper.map((p) => A.toWing(p, c, le, wl)), ...af.lower.slice(1, -1).reverse().map((p) => A.toWing(p, c, le, wl))];
}
export const halfWidth = (fs) => (fs < 0 ? A.cowlR(fs) : fs < CT.fs0 ? C.half : A.coneR(fs));
export function planOutline() {
  const fsList = [...range(A.COWL.front, -1, 14), 0, CT.fs0 - 1, ...range(CT.fs0, VIEW_FS[1], 8)];
  const right = fsList.map((f) => [f, halfWidth(f)]);
  return [...right, ...right.slice().reverse().map(([f, b]) => [f, -b])];
}
// the port wing in plan (FS, BL): leading edge, tip break, trailing edge
export function wingPlan() {
  const ws = range(C.half, VIEW_WS, 12);
  return [...ws.map((w) => [A.leAt(w), -w]), ...ws.slice().reverse().map((w) => [A.TE_FS, -w])];
}
export function wingPlanStbd() {
  return [[A.LE_FS, C.half], [A.LE_FS, C.half + 900], [A.TE_FS, C.half + 900], [A.TE_FS, C.half]];
}

// ---------------------------------------------------------------- the system in the schematic views
const PS = M.PITOT;
// a route as (u, v) in a view: plan (FS, BL) or side (FS, WL)
export const routePlan = (r) => r.map(([fs, bl]) => [fs, bl]);
export const routeSide = (r) => r.map(([fs, , wl]) => [fs, wl]);
export function pitotPlanSym(V) {
  const w = PS.ws;
  return K.body(V, [[PS.fs0 + 14, -w - PS.r], [PS.aft, -w - PS.r], [PS.aft, -w + PS.r], [PS.fs0 + 14, -w + PS.r], [PS.fs0, -w + 5], [PS.fs0, -w - 5]]) + K.line(V, K.rect(PS.mast[0], -w - 9, PS.mast[1], -w + 9), "thin", true);
}
export function pitotSideSym(V) {
  const y = M.PITOT_WL;
  const tube = [[PS.fs0, y - 5], [PS.fs0 + 14, y - PS.r], [PS.aft, y - PS.r], [PS.aft, y + PS.r], [PS.fs0 + 14, y + PS.r], [PS.fs0, y + 5]];
  const mast = [[PS.mast[0], y + PS.r], [PS.mast[1], y + PS.r], [PS.mast[1] + 4, M.MAST_TOP_WL], [PS.mast[0] - 4, M.MAST_TOP_WL]];
  return K.body(V, mast) + K.body(V, tube);
}
// a static port seen from outside (side view) or edge-on (plan): a ring symbol at true size ×3
export const portSideSym = (V) => disc(V, [M.PORT_FS, M.PORT_WL], 33, "paper") + K.line(V, K.circle(M.PORT_FS, M.PORT_WL, 33, 16), "vis", true) + disc(V, [M.PORT_FS, M.PORT_WL], 11, "solid", 10);
export const portPlanSym = (V, sg) => K.body(V, K.rect(M.PORT_FS - 33, sg * M.PORT_R - 12, M.PORT_FS + 33, sg * M.PORT_R + 12));
// a drain trap or the valve as a small block symbol, at 3× true size
export const trapSym = (V, [fs, wl]) => K.body(V, K.rect(fs - 45, wl - 110, fs + 45, wl + 40));
export const valveSym = (V, [fs, wl]) => K.body(V, K.rect(fs - 70, wl - 33, fs + 70, wl + 33));
// the three instruments, schematic: their cases behind the panel
export const instSide = (V, wl) => K.body(V, K.rect(A.CABIN.fs0 + 192, wl - 40, M.PANEL.fs, wl + 40));
export const panelSide = (V) => K.cut(V, K.rect(M.PANEL.fs, M.PANEL.wl0, M.PANEL.fs + M.PANEL.t, M.PANEL.wl1), { mat: "alu", angle: 135 });

// ================================================================ SECTION A-A: the heated pitot head
// x from the tip aft, y up, axis y = 0. Ram hole Ø3.2, chamber Ø14 to the dam at x 36, bore Ø18 aft;
// drain hole Ø0.8 in the chamber's floor; the pressure tube from the dam's top hole aft and up the
// mast; the heater coiled inside the wall from x 40 to 140; the mast at x 445–475 up to the wing.
export const HD = { R: PS.r, ram: M.HEAD.ram / 2, ch: 7, bore: 9, dam: [36, 38.5], drainX: 30, pt: [1.5, 1.0], ptY: 5.6, len: M.HEAD.len, coil: [40, 100, 10], mastX: [PS.mast[0] - PS.fs0, PS.mast[1] - PS.fs0], top: M.MAST_TOP_WL - M.PITOT_WL };
// the ogive nose: r from the ram mouth's lip to the tube's radius over 28 mm
const nose = range(0, 28, 10).map((x) => [3.6 + (HD.R - 3.6) * Math.sin(((x / 28) * Math.PI) / 2), x]);
// the head's body (brass, nickel plated) in [r, s] for revolve along u: outer skin, aft cap, inner walls
export const HEAD_LOOP = [
  [HD.ram, 0], ...nose, [HD.R, HD.len - 6], [HD.R - 4, HD.len], [0, HD.len], [0, HD.len - 4], [HD.bore, HD.len - 4],
  [HD.bore, HD.dam[0]], [HD.ch, HD.dam[0]], [HD.ch, 6], [HD.ram, 4],
];
// the break in the section: the drawn x runs 0–XB0, then XB1–len shifted left by SHIFT
export const XB0 = 110;
export const XB1 = 430;
export const SHIFT = XB1 - XB0 - 12;
export const hx = (x) => (x <= XB0 + 6 ? x : x - SHIFT);
const hpts = (pts) => pts.map(([x, y]) => [hx(x), y]);
// the body's outer radius at x, and its walls as cut faces (split at the break unless full)
export const headR = (x) => (x <= 28 ? 3.6 + (HD.R - 3.6) * Math.sin(((x / 28) * Math.PI) / 2) : x <= HD.len - 6 ? HD.R : HD.R - ((x - (HD.len - 6)) * 4) / 6);
function wallPts(x0, x1) {
  const out = [];
  for (const x of range(0, 28, 12)) if (x >= x0 && x <= x1) out.push([x, headR(x)]);
  if (x1 > 28) out.push([Math.max(28, x0), headR(Math.max(28, x0))], [x1, headR(x1)]);
  const inner = [[HD.len, HD.bore], [HD.dam[0], HD.bore], [HD.dam[0], HD.ch], [6, HD.ch], [4, HD.ram], [0, HD.ram]];
  const rIn = (x) => (x < 4 ? HD.ram : x < 6 ? HD.ram + ((x - 4) * (HD.ch - HD.ram)) / 2 : x < HD.dam[0] ? HD.ch : HD.bore);
  out.push([x1, rIn(x1 - 1e-9)]);
  for (const [x, r] of inner) if (x < x1 && x > x0) out.push([x, r]);
  out.push([x0, rIn(x0)]);
  return out;
}
const mirrorY = (pts) => pts.map(([x, y]) => [x, -y]).reverse();
export function headBody(V, { full = false } = {}) {
  const segs = full ? [[0, HD.len - 4]] : [[0, XB0], [XB1, HD.len - 4]];
  const m = full ? (p) => p : hpts;
  let out = "";
  for (const [a, b] of segs) {
    const w = wallPts(a, b);
    out += K.cut(V, m(w), { mat: "brass", angle: 45 }) + K.cut(V, m(mirrorY(w)), { mat: "brass", angle: 45 });
  }
  const e = HD.len - 4;
  const cap = [[e, -headR(e)], [HD.len, -(HD.R - 4)], [HD.len, HD.R - 4], [e, headR(e)]];
  out += K.cut(V, m(cap), { mat: "brass", angle: 45 });
  return out;
}
// the drain hole, a gap in the lower wall at x 30 (drawn as a paper slot over the wall)
export function drainHole(V, blocked) {
  const x = HD.drainX;
  const w = M.HEAD.drain / 2;
  const slot = [[x - w, -HD.ch + 0.05], [x + w, -HD.ch + 0.05], [x + w, -headR(x) - 0.4], [x - w, -headR(x) - 0.4]];
  return `<path class="paper" d="${K.d(V, slot)}"/>` + K.line(V, [slot[0], slot[3]], "vis") + K.line(V, [slot[1], slot[2]], "vis") + (blocked ? `<path class="ice" d="${K.d(V, slot)}"/>` : "");
}
// the dam: a disc across the bore with the pressure tube's mouth at its top
export function dam(V, map = hpts) {
  const [x0, x1] = HD.dam;
  const r = HD.bore;
  const y0 = HD.ptY - HD.pt[0];
  const y1 = HD.ptY + HD.pt[0];
  return K.cut(V, map([[x0, -r], [x1, -r], [x1, y0], [x0, y0]]), { mat: "brass", angle: 135 }) + K.cut(V, map([[x0, y1], [x1, y1], [x1, r], [x0, r]]), { mat: "brass", angle: 135 });
}
// the pressure tube: from the dam aft along the top of the bore, up the mast to the union
export const PT_PATH = [[HD.dam[0], HD.ptY], [HD.mastX[0] + 9, HD.ptY], [HD.mastX[0] + 15, HD.ptY + 6], [HD.mastX[0] + 15, HD.top + 6]];
export function pressureTube(V, map = hpts) {
  const segs = [PT_PATH.slice(0, 2).map(([x, y]) => [Math.min(x, XB0), y]), [[XB1, HD.ptY], ...PT_PATH.slice(1)]];
  return segs.map((s) => tubeCut(V, map(s), HD.pt[0], HD.pt[1])).join("");
}
export const ptBores = () => [boreOf(hpts([[HD.dam[0], HD.ptY], [XB0, HD.ptY]]), HD.pt[1]), boreOf(hpts([[XB1, HD.ptY], ...PT_PATH.slice(1)]), HD.pt[1])];
// the heater coil: a helix of Ø1.6 sheathed wire against the wall, blacked in both sides
export function heater(V, map = hpts) {
  const [x0, x1, n] = HD.coil;
  const p = (x1 - x0) / n;
  const r = HD.bore - 0.85;
  let out = "";
  for (let i = 0; i <= n; i++) {
    const x = x0 + i * p;
    if (x > XB0 - 1 && map === hpts) continue;
    out += disc(V, map([[x, r]])[0], 0.8, "solid", 10) + disc(V, map([[x + p / 2, -r]])[0], 0.8, "solid", 10);
  }
  // the two leads, along the bottom of the bore and up the mast's rear wall
  const lead = (dy) => [[x1, -r + dy], [HD.mastX[1] - 4, -r + dy], [HD.mastX[1] - 4 - dy, HD.top + 4]];
  for (const dy of [0.2, 2.2]) {
    const L = lead(dy);
    if (map === hpts) out += K.line(V, map([[x1, L[0][1]], [XB0, L[0][1]]]), "vis") + K.line(V, map([[XB1, L[0][1]], ...L.slice(1)]), "vis");
    else out += K.line(V, map(L), "vis");
  }
  return out;
}
// the mast: an aerofoil strut, hollow, from the tube's top to its flange under the wing skin
export function mast(V, map = hpts) {
  const [a, b] = HD.mastX;
  const t = 2;
  const y0 = Math.sqrt(HD.R ** 2 - 0) - 0.6;
  const flange = [[a - 22, HD.top - 5], [b + 22, HD.top - 5], [b + 22, HD.top], [a - 22, HD.top]];
  const front = [[a, y0], [a + t, y0], [a + t, HD.top - 5], [a, HD.top - 5]];
  const rear = [[b - t, y0], [b, y0], [b, HD.top - 5], [b - t, HD.top - 5]];
  return K.cut(V, map(front), { mat: "alu", angle: 135 }) + K.cut(V, map(rear), { mat: "alu", angle: 135 }) + K.cut(V, map(flange), { mat: "alu", angle: 45 }) + K.line(V, map([[a + t, y0], [b - t, y0]]), "thin");
}
// the wing's lower skin over the mast, a strip cut (phantom beyond)
export const wingSkin = (V, map = hpts) => K.cut(V, map([[HD.mastX[0] - 60, HD.top], [HD.mastX[1] + 60, HD.top], [HD.mastX[1] + 60, HD.top + 1.0], [HD.mastX[0] - 60, HD.top + 1.0]]), { mat: "solid" });
// the union on the flange and the start of the pitot line (5), going inboard
export function union(V, map = hpts) {
  const x = HD.mastX[0] + 15;
  const y = HD.top + 1;
  const nut = [[x - 7, y], [x + 7, y], [x + 7, y + 9], [x - 7, y + 9]];
  return K.body(V, map(nut)) + K.line(V, map([[x - 7, y + 4.5], [x + 7, y + 4.5]]), "thin");
}
export function lineStub(V, map = hpts) {
  const x = HD.mastX[0] + 15;
  const y = HD.top + 10;
  return tubeCut(V, map([[x, y], [x, y + 8], [x + 6, y + 14], [x + 40, y + 14]]), M.LINE.od / 2, M.LINE_ID / 2);
}
export const lineStubBore = (map = hpts) => {
  const x = HD.mastX[0] + 15;
  const y = HD.top + 10;
  return boreOf(map([[x, y - 9], [x, y + 8], [x + 6, y + 14], [x + 40, y + 14]]), M.LINE_ID / 2);
};
// the air in the head: ram hole and chamber up to the dam, as one region (the accent)
export function headAir(full = false) {
  const m = full ? (p) => p : hpts;
  return m([[0, -HD.ram], [4, -HD.ram], [6, -HD.ch], [HD.dam[0], -HD.ch], [HD.dam[0], HD.ch], [6, HD.ch], [4, HD.ram], [0, HD.ram]]);
}

// ================================================================ SECTION C-C: the tail cone at the ports, looking forward
// u = BL, v = WL. The skin (0.8, blacked in), a frame (Z-section, alu), the two ports, their lines down
// the skin to the tee at the bottom and the static line leaving forward (seen end-on).
export const CONE = { r: M.PORT_R, axis: M.PORT_WL, skin: 0.8 };
export function coneSkin(V) {
  const o = K.circle(0, CONE.axis, CONE.r, 96);
  const i = K.circle(0, CONE.axis, CONE.r - 10, 96).reverse();
  return cutHoles(V, o, [i], { mat: "solid" });
}
// the frame at this station: a ring of Z-section behind the cut, seen as its inner flange edge
export const coneFrame = (V) => K.line(V, K.circle(0, CONE.axis, CONE.r - 40, 96), "vis", true) + K.line(V, K.circle(0, CONE.axis, CONE.r - 46, 96), "thin", true);
// the port lines in C-C (u = BL, v = WL): from each port's nipple to the tee
export const coneRoute = (sg) => (sg < 0 ? M.ROUTE.portL : M.ROUTE.portR).map(([, bl, wl]) => [bl, wl]);
export function teeC(V) {
  const [, , wl] = M.TEE;
  return K.body(V, K.rect(-30, wl - 18, 30, wl + 18)) + K.line(V, K.circle(0, wl, 12, 16), "thin", true);
}
// the static port seen in C-C (×1 at 1:20 it is a few units: drawn as its body outline)
export const portC = (V, sg) => K.body(V, K.rect(sg * CONE.r - (sg > 0 ? 30 : -30) - (sg > 0 ? 0 : 0), CONE.axis - 14, sg * CONE.r, CONE.axis + 14).map(([u, v]) => [u, v]));

// ================================================================ DETAIL D: the left static port, 2:1
// The skin's true curvature about the cone's axis; the port's axis is the BL line through the axis.
// n: inward along +u from the skin's outer surface (BL = −PORT_R + n); t: along the WL.
export const SP = { head: 8, headT: 1.2, shank: 4, nut: [2.4, 6.4, 5.5], nip: [9, 21], nipR: M.LINE.od / 2, hole: M.PORT_HOLE / 2, doubler: [0.8, 2.4], dR: 17 };
const R0 = CONE.r;
// a point on the skin's arc: n inward from the outer surface, t along it
export const spP = (n, t) => [-(R0 - n) * Math.cos(Math.asin(t / (R0 - n))), CONE.axis + t];
const spArc = (n, t0, t1, k = 16) => range(t0, t1, k).map((t) => spP(n, t));
export function spSkin(V, t0 = -24, t1 = 24) {
  // the skin, with the head's hole
  const h = SP.head + 0.1;
  const a = [...spArc(0, t0, -h, 6), ...spArc(0.8, -h, t0, 6).reverse()];
  const b = [...spArc(0, h, t1, 6), ...spArc(0.8, t1, h, 6).reverse()];
  return K.cut(V, a, { mat: "solid" }) + K.cut(V, b, { mat: "solid" });
}
export function spDoubler(V) {
  const [n0, n1] = SP.doubler;
  const R = SP.dR;
  const h = SP.shank + 0.1;
  const hh = SP.head + 0.1;
  // counterbored for the head (0.4 of its 1.2 thickness sits in the doubler)
  const up = [...spArc(n0, hh, R, 6), [spP(n1, R)[0] + 0, spP(n1, R)[1]], ...spArc(n1, R, h, 6).reverse().slice(1), spP(1.2, h), spP(1.2, hh)];
  const dn = [...spArc(n0, -R, -hh, 6), spP(1.2, -hh), spP(1.2, -h), ...spArc(n1, -h, -R, 6)];
  return K.cut(V, up, { mat: "alu", angle: 45 }) + K.cut(V, dn, { mat: "alu", angle: 45 });
}
// the port button: a turned brass part (head, shank, nipple) with its bore, and the nut (unhatched)
export function spButton(V) {
  const n = (v) => -R0 + v;
  const H = SP.head;
  const s = SP.shank;
  const r = SP.nipR;
  const ho = SP.hole;
  const [n0, n1] = SP.nip;
  // half profile in (n, t) for t ≥ 0, mirrored
  const half = [[0, ho], [0, H], [SP.headT, H], [SP.headT, s], [n0, s], [n0, r], [n1 - 2, r], [n1 - 1, r + 0.6], [n1, r - 0.4], [n1, ho]];
  const pts = (sg) => half.map(([a, t]) => [n(a), CONE.axis + sg * t]);
  const up = pts(1);
  const dn = pts(-1).reverse();
  const nut = K.rect(n(SP.nut[0]), CONE.axis - SP.nut[2] * 1.15, n(SP.nut[1]), CONE.axis + SP.nut[2] * 1.15);
  return K.cut(V, up, { mat: "brass", angle: 135 }) + K.cut(V, dn, { mat: "brass", angle: 135 }) + K.body(V, nut) + K.line(V, [[n(SP.nut[0]), CONE.axis + SP.nut[2] * 0.58], [n(SP.nut[1]), CONE.axis + SP.nut[2] * 0.58]], "thin") + K.line(V, [[n(SP.nut[0]), CONE.axis - SP.nut[2] * 0.58], [n(SP.nut[1]), CONE.axis - SP.nut[2] * 0.58]], "thin");
}
export const spBore = () => [[-R0 - 0.3, CONE.axis - SP.hole], [-R0 + SP.nip[1] + 14, CONE.axis - SP.hole], [-R0 + SP.nip[1] + 14, CONE.axis + SP.hole], [-R0 - 0.3, CONE.axis + SP.hole]];
// the hose on the nipple (rubber, cut)
export function spHose(V) {
  const n = (v) => -R0 + v;
  const ri = SP.nipR;
  const ro = ri + 2.6;
  const a = n(SP.nip[0] + 4);
  const b = n(SP.nip[1] + 14);
  return K.cut(V, [[a, CONE.axis + ri], [b, CONE.axis + ri], [b, CONE.axis + ro], [a, CONE.axis + ro]], { mat: "rubber", angle: 45 }) + K.cut(V, [[a, CONE.axis - ro], [b, CONE.axis - ro], [b, CONE.axis - ri], [a, CONE.axis - ri]], { mat: "rubber", angle: 45 });
}
export const spIce = () => [[-R0 - 1.4, CONE.axis - SP.head + 1], [-R0 + 0.1, CONE.axis - SP.head + 1], [-R0 + 0.1, CONE.axis + SP.head - 1], [-R0 - 1.4, CONE.axis + SP.head - 1]];

// ================================================================ SECTION F-F: a drain trap (pitot and static alike), 1:1
// u across, v up from the bowl's seat; the line passes through the body at v = 7.
export const TR = { w: 15, top: 15, bowl: [12, 10, -42], floor: 3, line: 7, plug: [4, -48] };
export function trapBody(V) {
  const { w, top, line } = TR;
  const ri = M.LINE_ID / 2;
  const up = [[-w, line + ri], [w, line + ri], [w, top - 1.5], [w - 1.5, top], [-w + 1.5, top], [-w, top - 1.5]];
  const lo = [[-w, 0], [-2.5, 0], [-2.5, line - ri], [-w, line - ri]];
  const lo2 = [[2.5, 0], [w, 0], [w, line - ri], [2.5, line - ri]];
  // the bowl's spigot below the body
  const sp = [[-TR.bowl[1] - 0.05, -6], [-2.5, -6], [-2.5, 0], [-TR.bowl[1] - 0.05, 0]];
  const sp2 = [[2.5, -6], [TR.bowl[1] + 0.05, -6], [TR.bowl[1] + 0.05, 0], [2.5, 0]];
  return [up, lo, lo2, sp, sp2].map((p) => K.cut(V, p, { mat: "brass", angle: 45 })).join("");
}
export function trapBowl(V) {
  const [ro, ri, z] = TR.bowl;
  const f = TR.floor;
  const wall = (sg) => [[sg * ri, -6], [sg * ro, -6], [sg * ro, z + 2], [sg * (ro - 2), z], [sg * 4.05, z], [sg * 4.05, z + f], [sg * ri, z + f]];
  const L = wall(-1);
  const R = wall(1).reverse();
  return K.cut(V, L, { mat: "plastic", angle: 135 }) + K.cut(V, R, { mat: "plastic", angle: 135 }) + K.line(V, [[-ro, 0.05], [-ro, -6]], "thin");
}
export function trapPlug(V) {
  const z = TR.bowl[2];
  const plug = [[-4, z + TR.floor + 1], [4, z + TR.floor + 1], [4, z - 1], [6.5, z - 1], [6.5, z - 7], [-6.5, z - 7], [-6.5, z - 1], [-4, z - 1]];
  return K.body(V, plug) + K.line(V, [[-6.5, z - 4], [6.5, z - 4]], "thin") + disc(V, [-4.4, z + 1.5], 0.7, "solid", 8) + disc(V, [4.4, z + 1.5], 0.7, "solid", 8);
}
export const TR_STUB = 8;
export const trapLines = (V) => [-1, 1].map((sg) => tubeCut(V, [[sg * TR.w, TR.line], [sg * (TR.w + TR_STUB), TR.line]], M.LINE.od / 2, M.LINE_ID / 2)).join("");
export const trapAir = () => [[-TR.w - TR_STUB, TR.line - M.LINE_ID / 2], [-2.5, TR.line - M.LINE_ID / 2], [-2.5, -6], [-TR.bowl[1], -6], [-TR.bowl[1], TR.bowl[2] + TR.floor], [TR.bowl[1], TR.bowl[2] + TR.floor], [TR.bowl[1], -6], [2.5, -6], [2.5, TR.line - M.LINE_ID / 2], [TR.w + TR_STUB, TR.line - M.LINE_ID / 2], [TR.w + TR_STUB, TR.line + M.LINE_ID / 2], [-TR.w - TR_STUB, TR.line + M.LINE_ID / 2]];
export const trapWater = (h) => [[-TR.bowl[1], TR.bowl[2] + TR.floor], [TR.bowl[1], TR.bowl[2] + TR.floor], [TR.bowl[1], TR.bowl[2] + TR.floor + h], [-TR.bowl[1], TR.bowl[2] + TR.floor + h]];

// ================================================================ SECTION E-E: the alternate static valve, 1:1
// u along the spool (aft, toward the pilot, to the right), v up; body x 0–44, bore Ø10; ports: A from
// the static ports (below, x 12), B to the instruments (above, x 22), C the cabin (above, x 32, Ø3.2).
export const AV = { len: 44, R: 11, bore: 5, A: 12, B: 22, C: 32, travel: 9, panel: [48, 51], knob: [55, 66] };
export function valveBody(V) {
  const { len, R, bore } = AV;
  const ri = M.LINE_ID / 2;
  const hc = M.ALT_HOLE / 2;
  const top = [[0, bore], [AV.B - ri, bore], [AV.B - ri, R], [0, R]];
  const top2 = [[AV.B + ri, bore], [AV.C - hc, bore], [AV.C - hc, R], [AV.B + ri, R]];
  const top3 = [[AV.C + hc, bore], [len, bore], [len, R], [AV.C + hc, R]];
  const bot = [[0, -R], [AV.A - ri, -R], [AV.A - ri, -bore], [0, -bore]];
  const bot2 = [[AV.A + ri, -R], [len, -R], [len, -bore], [AV.A + ri, -bore]];
  const end = [[0, -bore], [4, -bore], [4, bore], [0, bore]];
  return [top, top2, top3, bot, bot2, end].map((p) => K.cut(V, p, { mat: "alu", angle: 45 })).join("") + K.line(V, [[AV.C - hc, R], [AV.C + hc, R]], "thin");
}
// the spool at travel s (0 normal, 9 pulled): lands with O-rings, the rod and the knob
export function valveSpool(V, s) {
  const b = AV.bore - 0.05;
  const g = 3;
  const x = (v) => v + s;
  const land1 = [[x(4.5), -b], [x(8.5), -b], [x(8.5), b], [x(4.5), b]];
  const neck = [[x(8.5), -g], [x(25), -g], [x(25), g], [x(8.5), g]];
  const land2 = [[x(25), -b], [x(42), -b], [x(42), b], [x(25), b]];
  const rod = [[x(42), -3], [x(AV.knob[0]), -3], [x(AV.knob[0]), 3], [x(42), 3]];
  return K.body(V, [...land1]) + K.body(V, neck) + K.body(V, land2) + K.body(V, rod) + [6.5, 28].map((xx) => disc(V, [x(xx), b - 0.2], 1.0, "solid", 10) + disc(V, [x(xx), -b + 0.2], 1.0, "solid", 10)).join("");
}
export function valveKnob(V, s) {
  const [a, b] = AV.knob;
  return K.cut(V, [[a + s, -8], [b + s, -8], [b + s, 8], [a + s, 8]], { mat: "plastic", angle: 45 }) + K.line(V, [[b + s - 3, -8], [b + s - 3, 8]], "thin");
}
export const valvePanel = (V) => K.cut(V, [[AV.panel[0], 3.3], [AV.panel[1], 3.3], [AV.panel[1], 17], [AV.panel[0], 17]], { mat: "alu", angle: 135 }) + K.cut(V, [[AV.panel[0], -17], [AV.panel[1], -17], [AV.panel[1], -3.3], [AV.panel[0], -3.3]], { mat: "alu", angle: 135 });
export const valveLines = (V) => tubeCut(V, [[AV.A, -AV.R], [AV.A, -AV.R - 14]], M.LINE.od / 2, M.LINE_ID / 2) + tubeCut(V, [[AV.B, AV.R], [AV.B, AV.R + 14]], M.LINE.od / 2, M.LINE_ID / 2);
// the air the spool connects: the passages and the groove
export function valveAir(s) {
  const ri = M.LINE_ID / 2;
  const hc = M.ALT_HOLE / 2;
  const b = AV.bore;
  return {
    A: [[AV.A - ri, -AV.R - 14], [AV.A + ri, -AV.R - 14], [AV.A + ri, -b], [AV.A - ri, -b]],
    B: [[AV.B - ri, AV.R + 14], [AV.B + ri, AV.R + 14], [AV.B + ri, b], [AV.B - ri, b]],
    C: [[AV.C - hc, AV.R], [AV.C + hc, AV.R], [AV.C + hc, b], [AV.C - hc, b]],
    groove: [[8.5 + s, -b], [25 + s, -b], [25 + s, b], [8.5 + s, b]],
  };
}

// ================================================================ the instruments
// The case: a 3⅛ in aluminium die casting, closed at the back, with the glass and its gasket and spring
// ring at the front and the square mounting flange behind the panel. The panel plate is cut too.
export const IC = { Ro: 39.7, Ri: 38.5, back: 3, front: 100, flange: [100, 104, 41.25], panel: [104, 107, 46], glass: [95, 97.5], dial: [86, 87], ptr: [89, 89.6] };
export const PLATES = { rear: [64, 65.2], front: [76, 77.2], sector: [69.7, 70.3], pinion: [68.5, 71.5], hair: 79.2, rock: 62 };
export function caseSection(V, { boss = [] } = {}) {
  const { Ro, Ri, back, front } = IC;
  const [f0, f1, fr] = IC.flange;
  const wall = (sg) => [[back, sg * Ri], [f0, sg * Ri], [f0, sg * (Ri + 0.4)], [f1, sg * (Ri + 0.4)], [f1, sg * fr], [f0, sg * fr], [f0 - 3, sg * Ro], [back, sg * Ro]].map(([x, y]) => [x, y]);
  let out = K.cut(V, wall(1), { mat: "alu", angle: 45 }) + K.cut(V, wall(-1).reverse(), { mat: "alu", angle: 45 });
  // the back wall, with the fittings' holes (boss: [y, r] list)
  const holes = boss.slice().sort((a, b) => b[0] - a[0]);
  let y = Ro;
  const segs = [];
  for (const [yc, r] of holes) {
    segs.push([yc + r, y]);
    y = yc - r;
  }
  segs.push([-Ro, y]);
  for (const [a, b] of segs) if (b - a > 0.2) out += K.cut(V, [[0, a], [back, a], [back, b], [0, b]], { mat: "alu", angle: 45 });
  void front;
  return out;
}
export function glass(V) {
  const [g0, g1] = IC.glass;
  const r = IC.Ri - 0.05;
  return K.cut(V, [[g0, -r], [g1, -r], [g1, r], [g0, r]], { mat: "plastic", angle: 60 }) +
    [1, -1].map((sg) => K.cut(V, [[g1, sg * (r - 1.6)], [g1 + 1.4, sg * (r - 1.6)], [g1 + 1.4, sg * r], [g1, sg * r]], { mat: "solid" }) + K.cut(V, [[g0 - 0.8, sg * (r - 1.6)], [g0, sg * (r - 1.6)], [g0, sg * r], [g0 - 0.8, sg * r]], { mat: "solid" })).join("");
}
export function panelCut(V) {
  const [p0, p1, r] = IC.panel;
  return K.cut(V, [[p0, 40.5], [p1, 40.5], [p1, r], [p0, r]], { mat: "alu", angle: 135 }) + K.cut(V, [[p0, -r], [p1, -r], [p1, -40.5], [p0, -40.5]], { mat: "alu", angle: 135 });
}
export function dialSide(V, hole = 1.6) {
  const [d0, d1] = IC.dial;
  const r = IC.Ri - 1;
  return K.cut(V, [[d0, hole], [d1, hole], [d1, r], [d0, r]], { mat: "solid" }) + K.cut(V, [[d0, -r], [d1, -r], [d1, -hole], [d0, -hole]], { mat: "solid" });
}
// the movement's two plates, the pillars and the dial feet (section on z = 0)
export function platesSide(V, { rearSpan = [-36, 36], frontSpan = [-18, 5], gap = [] } = {}) {
  const [r0, r1] = PLATES.rear;
  const [f0, f1] = PLATES.front;
  let out = "";
  // the rear plate, with a hole for the pointer arbor's rear pivot and gaps where things pass
  const cuts = [[rearSpan[0], rearSpan[1]]];
  for (const g of gap) {
    const c = cuts.pop();
    cuts.push([c[0], g[0]], [g[1], c[1]]);
  }
  for (const [a, b] of cuts) if (b - a > 0.3) out += K.cut(V, [[r0, a], [r1, a], [r1, b], [r0, b]], { mat: "solid" });
  out += K.cut(V, [[f0, frontSpan[0]], [f1, frontSpan[0]], [f1, frontSpan[1]], [f0, frontSpan[1]]], { mat: "solid" });
  // pillars at y ±30 (unhatched rods), dial feet at y ±32
  for (const sg of [1, -1]) {
    out += K.body(V, [[r1, sg * 28.5], [IC.dial[0], sg * 28.5], [IC.dial[0], sg * 31.5], [r1, sg * 31.5]]);
  }
  return out;
}
// the movement's moving parts in section: push rod (from the capsule's stud), crank 1, rocking shaft,
// arm 2 (beyond the plane), sector edge-on, its arbor, the pinion arbor and pinion, hairspring, pointer
export function movementSide(V, g, { rockDeg, ptrLen, ptrDeg, studX, l1 = 12, toggle0 = 0, crank = "toggle", sectorY = -21.5, sectorTop = -2.2, l2 = 12, extra = "" }) {
  const xr = PLATES.rock;
  const th = (toggle0 + rockDeg) * rad;
  const pin = [xr - l1 * Math.cos(th), -l1 * Math.sin(th)];
  // the push rod: from the stud to the pad that bears on crank 1's pin
  const padX = pin[0] - 0.6;
  let out = K.body(V, [[studX, -0.75], [padX - 0.8, -0.75], [padX - 0.8, 0.75], [studX, 0.75]]);
  out += K.body(V, [[padX - 0.8, Math.min(-1.5, pin[1] - 2)], [padX, Math.min(-1.5, pin[1] - 2)], [padX, Math.max(2, pin[1] + 2)], [padX - 0.8, Math.max(2, pin[1] + 2)]]);
  // crank 1 (a thin plate in the plane) and the rocking shaft, cut across
  out += K.cut(V, strip([[xr, 0], pin], 0.55), { mat: "solid" }) + disc(V, pin, 0.8, "paper", 10) + K.line(V, K.circle(pin[0], pin[1], 0.8, 10), "vis", true);
  out += disc(V, [xr, 0], 1.0, "solid", 12);
  // arm 2 at z = 8, beyond the plane: from the shaft to the sector's plane
  const tip = [xr + l2 * Math.cos(rockDeg * rad), l2 * Math.sin(rockDeg * rad)];
  out += `<g class="beyond">${K.line(V, [[xr, 0], tip], "thin")}${K.line(V, [tip, [tip[0], sectorY]], "thin")}</g>`;
  // the sector edge-on (thin, blacked in) and its arbor between the plates (unhatched)
  const [s0, s1] = PLATES.sector;
  out += K.body(V, [[PLATES.rear[1], sectorY - 0.6], [PLATES.front[0], sectorY - 0.6], [PLATES.front[0], sectorY + 0.6], [PLATES.rear[1], sectorY + 0.6]]);
  out += K.cut(V, [[s0, sectorY - 2.6], [s1, sectorY - 2.6], [s1, sectorTop], [s0, sectorTop]], { mat: "solid" });
  // the pointer arbor (on the axis) through the front plate and the dial, the pinion on it
  const [p0, p1] = PLATES.pinion;
  out += K.body(V, [[PLATES.rear[0], -0.6], [IC.ptr[1] + 0.6, -0.6], [IC.ptr[1] + 0.6, 0.6], [PLATES.rear[0], 0.6]]);
  out += K.body(V, [[p0, -2.3], [p1, -2.3], [p1, 2.3], [p0, 2.3]]) + K.lines(V, [[[p0, -1.9], [p1, -1.9]], [[p0, 1.9], [p1, 1.9]]], "thin");
  // the hairspring, its coils edge-on in front of the front plate
  for (let k = 0; k <= 5; k++) out += disc(V, [PLATES.hair, 2.2 + k * 1.16], 0.2, "solid", 6) + disc(V, [PLATES.hair, -(2.2 + k * 1.16)], 0.2, "solid", 6);
  // the pointer: its hub and its blade, foreshortened by its angle from the vertical
  const [q0, q1] = IC.ptr;
  const c = Math.cos(ptrDeg * rad);
  out += K.body(V, [[q0 - 0.8, -2], [q1 + 0.4, -2], [q1 + 0.4, 2], [q0 - 0.8, 2]]);
  if (Math.abs(c) > 0.02) out += K.cut(V, [[q0, 0], [q1, 0], [q1, ptrLen * c], [q0, ptrLen * c]], { mat: "solid" });
  void g;
  void crank;
  return out + extra;
}

// ---------------------------------------------------------------- capsules (section)
// A pair of corrugated diaphragms soldered at the rim, Ø46: rear face fixed at xr, front face's centre
// moved by δ (the rim stays). Returns the two blacked-in diaphragm strips and the air inside.
const RIPPLE = (r, R) => 0.45 * Math.sin((r / R) * Math.PI * 4.5) * (1 - r / R);
export function capsulePts(x0, gap, R, dl, { n = 28 } = {}) {
  // x0: rim plane; gap: the half-gap at the centre; dl: the front centre's extra travel
  const rs = range(0, R, n);
  const front = rs.map((r) => [x0 + (gap + dl) * (1 - (r / R) ** 2) + RIPPLE(r, R), r]);
  const rear = rs.map((r) => [x0 - gap * (1 - (r / R) ** 2) - RIPPLE(r, R), r]);
  return { front, rear };
}
export function capsuleSection(V, x0, gap, R, dl, { stem = null, studOut = true } = {}) {
  const { front, rear } = capsulePts(x0, gap, R, dl);
  const t = 0.16;
  const sheet = (pts, sg) => {
    const up = pts.map(([x, r]) => [x, sg * r]);
    const dn = pts.map(([x, r]) => [x + (pts === front ? t : -t), sg * r]).reverse();
    return K.cut(V, [...up, ...dn], { mat: "solid" });
  };
  let out = sheet(front, 1) + sheet(front, -1) + sheet(rear, 1) + sheet(rear, -1);
  // the rim (soldered seam)
  out += K.cut(V, [[x0 - 0.5, R - 0.3], [x0 + 0.5, R - 0.3], [x0 + 0.5, R + 0.5], [x0 - 0.5, R + 0.5]], { mat: "solid" }) + K.cut(V, [[x0 - 0.5, -R - 0.5], [x0 + 0.5, -R - 0.5], [x0 + 0.5, -R + 0.3], [x0 - 0.5, -R + 0.3]], { mat: "solid" });
  // the centre stud on the front face
  if (studOut) out += K.body(V, [[front[0][0] + t, -2.2], [front[0][0] + t + 2.4, -2.2], [front[0][0] + t + 2.4, 2.2], [front[0][0] + t, 2.2]]);
  if (stem) out += stem;
  return out;
}
export function capsuleAir(x0, gap, R, dl) {
  const { front, rear } = capsulePts(x0, gap, R, dl, { n: 20 });
  const fr = front.map(([x, r]) => [x + 0.16, r]);
  const re = rear.map(([x, r]) => [x - 0.16, r]);
  return [...fr, ...re.slice().reverse(), ...re.map(([x, r]) => [x, -r]), ...fr.slice().reverse().map(([x, r]) => [x, -r])];
}
// (front centre) x of a capsule
export const capFront = (x0, gap, dl) => x0 + gap + dl;

// ---------------------------------------------------------------- fittings at the back (section)
export function fitting(V, y, { len = 10, label = "" } = {}) {
  const ri = M.LINE_ID / 2 - 0.4;
  const hex = [[-len, y - 6.4], [-len + 6, y - 6.4], [-len + 6, y + 6.4], [-len, y + 6.4]];
  const body = (sg) => [[-len, y + sg * ri], [IC.back + 0.01, y + sg * ri], [IC.back + 0.01, y + sg * 3.5], [-len + 6, y + sg * 3.5], [-len + 6, y + sg * 6.4], [-len, y + sg * 6.4]];
  void hex;
  void label;
  return K.cut(V, body(1), { mat: "brass", angle: 135 }) + K.cut(V, body(-1).reverse(), { mat: "brass", angle: 135 });
}
export const fittingBore = (y, len = 10) => [[-len, y - (M.LINE_ID / 2 - 0.4)], [IC.back, y - (M.LINE_ID / 2 - 0.4)], [IC.back, y + (M.LINE_ID / 2 - 0.4)], [-len, y + (M.LINE_ID / 2 - 0.4)]];

// ---------------------------------------------------------------- front views (dial half and movement half)
// The bezel opening and the case, as seen from the pilot: the panel's hole edge and the flange square
export function faceFrame(V) {
  // from the pilot's side the flange is behind the panel: the panel's hole, the bezel and the glass
  return K.line(V, K.circle(0, 0, 40.5, 72), "vis", true) + K.line(V, K.circle(0, 0, IC.Ri, 72), "thin", true);
}
// the dial plate's half, broken along the vertical diameter: side "L" keeps u < 0, "R" keeps u > 0
export function dialHalf(V, side) {
  const r = IC.Ri - 1;
  const sg = side === "L" ? -1 : 1;
  const arc = K.arc(0, 0, r, sg < 0 ? 90 : -90, sg < 0 ? 270 : 90, 36);
  // a freehand break line along the diameter (a gentle zigzag)
  const brk = range(1, -1, 12).map((t, i) => [sg * (i % 2 ? 0.9 : -0.4), (sg < 0 ? 1 : -1) * t * r]);
  return K.body(V, [...arc, ...brk.slice(1, -1)]);
}
// the rear plate as seen through the broken-away half (a disc, the background of the movement)
export const rearPlateFront = (V, side) => {
  const sg = side === "L" ? -1 : 1;
  const r = 36;
  const screw = (c) => K.body(V, K.circle(c[0], c[1], 2.2, 16)) + K.line(V, [[c[0] - 1.6, c[1] + 0.6], [c[0] + 1.6, c[1] - 0.6]], "thin");
  return K.body(V, [...K.arc(0, 0, r, sg < 0 ? 90 : -90, sg < 0 ? 270 : 90, 30)]) + screw([sg * 27, 20]) + screw([sg * 27, -22]);
};
// graduations: a list of [cwDeg, r0, r1, cls] in the dial's half; numbers at [cwDeg, r, text]
export function grads(V, side, ticks, nums, { tSize = "t-sm" } = {}) {
  const keep = (cw) => (side === "L" ? Math.sin(cw * rad) < -0.02 : Math.sin(cw * rad) > 0.02);
  const thin = [];
  const thick = [];
  for (const [cw, r0, r1, cls] of ticks) if (keep(cw)) (cls === "vis" ? thick : thin).push([dialPt([0, 0], r0, cw), dialPt([0, 0], r1, cw)]);
  let out = (thin.length ? K.lines(V, thin, "thin") : "") + (thick.length ? K.lines(V, thick, "vis") : "");
  let txt = "";
  for (const [cw, r, s] of nums) {
    if (!keep(cw)) continue;
    const [x, y] = V.p(dialPt([0, 0], r, cw));
    txt += `<text class="t ${tSize}" x="${x}" y="${K.r2(y + 2.6)}" text-anchor="middle">${s}</text>`;
  }
  return { lines: out, text: txt };
}
// a band (arc) on the dial between two clockwise angles, radii r0..r1
export const dialBand = (cw0, cw1, r0, r1) => {
  const n = Math.max(3, Math.ceil(Math.abs(cw1 - cw0) / 4));
  return [...range(cw0, cw1, n).map((a) => dialPt([0, 0], r1, a)), ...range(cw1, cw0, n).map((a) => dialPt([0, 0], r0, a))];
};
// clip a dial band to one half
export function bandHalf(side, cw0, cw1) {
  const lo = side === "L" ? 180 : 0;
  const hi = side === "L" ? 360 : 180;
  const a = Math.max(lo + 0.5, cw0);
  const b = Math.min(hi - 0.5, cw1);
  return b > a ? [a, b] : null;
}
// a pointer: a tapered blade of length L and a counterweight tail, turned to cw (clockwise from twelve)
export function pointer(V, cw, L, { w = 1.2, tail = 8, hub = 2.4, shape = "blade" } = {}) {
  const base = shape === "wide" ? [[0, -w * 1.8], [L - 5, -w * 1.5], [L, 0], [L - 5, w * 1.5], [0, w * 1.8], [-tail, w * 1.4], [-tail, -w * 1.4]] : [[L, 0], [L * 0.2, w], [-tail, w * 0.8], [-tail, -w * 0.8], [L * 0.2, -w]];
  const pts = rot(base, [0, 0], 90 - cw);
  return K.cut(V, pts, { mat: "solid" }) + disc(V, [0, 0], hub, "solid", 16) + disc(V, [0, 0], 0.7, "paper", 8);
}
// the movement as seen through the broken half: the sector on its arbor (turned by sDeg about piv), its
// tail out to armZ and the link to arm 2's tip, the pinion turned with the pointer, the front bridge.
export function movementFront(V, { piv = [0, -13.5], rs = 12.3, sDeg = 0, ptrCw = 0, rockDeg = 0, armZ = 8, l2 = 8, pinR = 1.15, pinAt = [0, 0], pinCw = null, teeth = 12, bridge = null, sectorArc = [60, 120], sg = 1 }) {
  let out = "";
  // the rocking shaft behind the rear plate (hidden), arm 2's tip through its slot in the plate
  out += K.line(V, [[-6, 0], [armZ + 4 * Math.sign(armZ), 0]], "hid");
  const tipY = l2 * Math.sin(rockDeg * rad);
  const slot = K.rrect(armZ - 1.6, -4.2, armZ + 1.6, 4.2, 1.4);
  out += `<path class="paper" d="${K.d(V, slot)}"/>` + K.line(V, slot, "thin", true);
  // the sector: a plate from its arbor to a toothed arc, and its tail arm out to the link
  const tail = rot([[armZ, piv[1]]], piv, sg * sDeg)[0];
  const nT = Math.round((teeth * rs) / pinR);
  const teethPts = gearPts(piv, rs, nT, sg * sDeg, { arc: sectorArc });
  const hub = rot([[piv[0] + 3, piv[1] - 2.2], [piv[0] - 3, piv[1] - 2.2]], piv, sg * sDeg);
  out += K.body(V, [...teethPts, ...hub]);
  out += K.body(V, strip([piv, tail], 1.1));
  out += K.line(V, [tail, [tail[0], tipY]], "vis") + disc(V, tail, 0.7, "solid", 8) + disc(V, [tail[0], tipY], 0.9, "solid", 8);
  out += disc(V, piv, 1.5, "paper", 12) + K.line(V, K.circle(piv[0], piv[1], 1.5, 12), "vis", true) + disc(V, piv, 0.5, "solid", 6);
  // the pinion, turned with its arbor
  out += K.body(V, gearPts(pinAt, pinR, teeth, -(pinCw ?? ptrCw)));
  if (bridge) out += K.body(V, bridge);
  return out;
}
// the hairspring: an Archimedean spiral of 5 turns from the collet (turned with the pointer) to its stud
export function hairspring(V, ptrCw, { r0 = 1.3, r1 = 5.2, turns = 5, stud = 30 } = {}) {
  const n = 120;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = r0 + (r1 - r0) * t;
    const a = stud + 360 * turns * (t - 1) - ptrCw * (1 - t) * 0.6;
    pts.push(pol([0, 0], r, a));
  }
  return K.line(V, pts, "vis") + disc(V, pol([0, 0], r1, stud), 0.6, "solid", 8) + disc(V, [0, 0], 1.0, "paper", 10) + K.line(V, K.circle(0, 0, 1.0, 10), "vis", true);
}

// ================================================================ the three instruments: states and drawings
// Each movement's angles from the model's indications (all degrees):
//   ASI: sector = (pointer − stop)/N, toggle crank at dead centre at rest, so the stud's travel is
//        l1(1 − cos θ): about Δp, while θ and the pointer go about as airspeed (the square root).
//   ALT: sector = pressure-altitude pointer turn / (11.7 × 10), turned clockwise; crank at −50°.
//   VSI: sector = pointer/N either way from nine o'clock; crank at −30°, so a shrinking capsule
//        (static falling in a climb, the case lagging) turns it up.
export const HS_STUD = [8.4 * Math.cos((20 * Math.PI) / 180), 8.4 * Math.sin((20 * Math.PI) / 180)]; // the hairspring's outer stud
export const PIV = [0, -21.5]; // the ASI's and VSI's sector arbor (front view)
export const ALT_W1 = [12.5, -5.73]; // the altimeter's intermediate wheel: 12.5 + 1.25 from the centre
export const ALT_PIV = [12.5, -5.73 - 19.6]; // its sector's arbor, 18 + 1.6 below the wheel
export const INSTR = {
  asi: { N: 19.6 / 1.9, l1: 12, t0: 0, sg: 1, cap: { x0: 24, gap: 1.6, R: 23 }, ptr: 30 },
  alt: { N: (18 / 1.6) * 10, l1: 5, t0: -50, sg: -1, cap: { x0: 18, gap: 1.6, R: 22 }, ptr: 30 },
  vsi: { N: 19.6 / 1.9, l1: 12, t0: -30, sg: 1, cap: { x0: 24, gap: 1.6, R: 23 }, ptr: 30 },
};
const toggle = (I, th) => I.l1 * (Math.cos(I.t0 * rad) - Math.cos((I.t0 + th) * rad)); // the stud's travel
export function asiState(ind) {
  const cw = M.asiDeg(ind.ias);
  const s = (cw - M.ASI.stop) / INSTR.asi.N;
  return { cw, sDeg: s, rock: s, dl: toggle(INSTR.asi, s) };
}
export function altState(ind, setPa) {
  const h = ind.hInd;
  const pa = ind.hPress;
  const paDeg = (pa / 1000) * 360;
  const s = paDeg / INSTR.alt.N;
  const cradle = (((h - pa) / 1000) * 360) / 11;
  return { h, cw1: (h / 1000) * 360, cw10: (h / 10000) * 360, cw100: (h / 100000) * 360, sDeg: s, rock: -s, dl: toggle(INSTR.alt, -s), cradle, set: setPa / M.HPA, wheel: s * (18 / 1.6) };
}
export function vsiState(ind) {
  const cw = M.vsiDeg(ind.vsi);
  const s = cw / INSTR.vsi.N;
  return { cw, sDeg: s, rock: s, dl: toggle(INSTR.vsi, s) };
}

// ---------------------------------------------------------------- sections (side, from port; z > 0 beyond)
const STEM = (V, x1) => tubeCut(V, [[-0.5, 0], [x1, 0]], 1.6, 0.8);
// the static (unchanging) half of each section
export function asiStatic(V) {
  return (
    part(12, caseSection(V, { boss: [[0, 1.65], [24, M.LINE_ID / 2 - 0.4]] }) + glass(V) + dialSide(V) + fitting(V, 0) + fitting(V, 24)) +
    part(11, panelCut(V)) +
    part(14, platesSide(V, { frontSpan: [-18, 5] }))
  );
}
export function vsiStatic(V) {
  return (
    part(23, caseSection(V, { boss: [[0, 1.65]] }) + glass(V) + dialSide(V) + fitting(V, 0)) +
    part(11, panelCut(V)) +
    part(26, platesSide(V, { frontSpan: [-18, 5] })) +
    part(25, meteringUnit(V))
  );
}
export function altStatic(V) {
  // the bridge that carries the capsule stack off the back wall
  const br = [[IC.back, 24], [13, 24], [13, -24], [IC.back, -24], [IC.back, -21], [10.5, -21], [10.5, 21], [IC.back, 21]];
  return (
    part(18, caseSection(V, { boss: [[-30, M.LINE_ID / 2 - 0.4]] }) + glass(V) + dialSide(V, 2.6) + fitting(V, -30) + K.cut(V, br, { mat: "alu", angle: 135 })) +
    part(11, panelCut(V)) +
    part(20, platesSide(V, { frontSpan: [-26, 7] }))
  );
}
// the VSI's metering unit: a block on the back wall below the stem, the capillary from the stem's
// passage (drilled in the back wall) out into the case
export const MU = { x: [IC.back, 13], y: [-30, -18], cap: -24 };
export function meteringUnit(V) {
  const [x0, x1] = MU.x;
  const [y0, y1] = MU.y;
  const c = MU.cap;
  return K.cut(V, [[x0, y0], [x1, y0], [x1, c - 0.35], [x0 + 3, c - 0.35], [x0 + 3, c - 1.2], [x0, c - 1.2]], { mat: "brass", angle: 135 }) +
    K.cut(V, [[x0, c + 1.2], [x0 + 3, c + 1.2], [x0 + 3, c + 0.35], [x1, c + 0.35], [x1, y1], [x0, y1]], { mat: "brass", angle: 135 });
}
// the VSI's passages: the stem's drilling in the back wall down to the unit, and the capillary
export const vsiPassage = () => [[0.6, -1.0], [2.4, -1.0], [2.4, MU.cap + 1.2], [IC.back + 3, MU.cap + 1.2], [IC.back + 3, MU.cap + 0.35], [MU.x[1] + 0.2, MU.cap + 0.35], [MU.x[1] + 0.2, MU.cap - 0.35], [IC.back + 3, MU.cap - 0.35], [IC.back + 3, MU.cap - 1.2], [0.6, MU.cap - 1.2]];
// the moving half: capsule, stud, push rod, crank, shaft, arm 2, sector, arbor, pinion, hairspring, pointer
export function asiMoving(V, st) {
  const c = INSTR.asi.cap;
  const stem = STEM(V, c.x0 - c.gap - 0.2);
  return (
    part(13, capsuleSection(V, c.x0, c.gap, c.R, st.dl, { stem })) +
    part(14, movementSide(V, 0, { rockDeg: st.rock, studX: capFront(c.x0, c.gap, st.dl) + 2.4, l1: INSTR.asi.l1, toggle0: INSTR.asi.t0, ptrLen: INSTR.asi.ptr, ptrDeg: st.cw }))
  );
}
export function vsiMoving(V, st) {
  const c = INSTR.vsi.cap;
  const stem = STEM(V, c.x0 - c.gap - 0.2);
  return (
    part(24, capsuleSection(V, c.x0, c.gap, c.R, st.dl, { stem })) +
    part(26, movementSide(V, 0, { rockDeg: st.rock, studX: capFront(c.x0, c.gap, st.dl) + 2.4, l1: INSTR.vsi.l1, toggle0: INSTR.vsi.t0, ptrLen: INSTR.vsi.ptr, ptrDeg: st.cw + 270 }))
  );
}
export function altMoving(V, st) {
  const c = INSTR.alt.cap;
  const half = st.dl / 2;
  const x2 = c.x0 + 2 * c.gap + 1 + half + c.gap; // the second capsule's rim
  const spacer = K.body(V, [[capFront(c.x0, c.gap, half) + 0.16, -2.4], [x2 - c.gap - 0.16, -2.4], [x2 - c.gap - 0.16, 2.4], [capFront(c.x0, c.gap, half) + 0.16, 2.4]]);
  const rearStud = K.body(V, [[13, -2.4], [c.x0 - c.gap - 0.16, -2.4], [c.x0 - c.gap - 0.16, 2.4], [13, 2.4]]);
  const stack = capsuleSection(V, c.x0, c.gap, c.R, half, { studOut: false }) + capsuleSection(V, x2, c.gap, c.R, half) + spacer + rearStud;
  // wheel 1 (z +9.9) and the motion work beyond the plane, edge-on
  const wheel = `<g class="beyond">${K.line(V, K.rect(72.2, ALT_W1[1] - 12.5, 72.8, ALT_W1[1] + 12.5), "thin", true)}${K.line(V, K.rect(PLATES.rear[1], ALT_W1[1] - 0.5, PLATES.front[0], ALT_W1[1] + 0.5), "thin", true)}</g>`;
  const work = K.body(V, [[80.5, -1.4], [IC.ptr[0] - 0.3, -1.4], [IC.ptr[0] - 0.3, 1.4], [80.5, 1.4]]) + K.body(V, [[82, -2.4], [IC.ptr[0] - 1.2, -2.4], [IC.ptr[0] - 1.2, 2.4], [82, 2.4]]);
  return (
    part(19, stack) +
    part(20, movementSide(V, 0, { rockDeg: st.rock, studX: capFront(x2, c.gap, half) + 2.4, l1: INSTR.alt.l1, toggle0: INSTR.alt.t0, ptrLen: 0, ptrDeg: 90, sectorY: ALT_PIV[1], sectorTop: ALT_W1[1] - 1.9, extra: wheel + work })) +
    part(21, altPointersSide(V, st))
  );
}
function altPointersSide(V, st) {
  const [q0, q1] = IC.ptr;
  const bar = (x0, x1, L, cw) => {
    const c = Math.cos(cw * rad);
    return Math.abs(c) > 0.02 ? K.cut(V, [[x0, 0], [x1, 0], [x1, L * c], [x0, L * c]], { mat: "solid" }) : "";
  };
  return bar(q0 + 1.4, q1 + 1.4, 30, st.cw1) + bar(q0 - 0.6, q0 - 0.1, 19, st.cw10) + bar(q0 + 0.4, q0 + 0.9, 33, st.cw100) + K.body(V, [[q0 - 1.2, -2.2], [q1 + 1.8, -2.2], [q1 + 1.8, 2.2], [q0 - 1.2, 2.2]]);
}

// ---------------------------------------------------------------- front views (from the pilot)
const ASI_TICKS = () => {
  const t = [];
  for (let v = 30; v <= 170; v += 5) t.push([M.asiDeg(v), v % 10 === 0 ? 30.4 : 32, 34.2, v % 10 === 0 ? "vis" : "thin"]);
  return t;
};
export function asiDial(V) {
  const side = "L";
  let out = dialHalf(V, side);
  const g = grads(V, side, ASI_TICKS(), [100, 120, 140, 160].map((v) => [M.asiDeg(v), 24.5, String(v)]));
  // the arcs: green from the clean stall to the structural cruise speed, yellow to the never-exceed line
  const green = bandHalf(side, M.asiDeg(M.VS1), M.asiDeg(M.V_SPEEDS.vno));
  const yellow = bandHalf(side, M.asiDeg(M.V_SPEEDS.vno), M.asiDeg(M.V_SPEEDS.vne));
  if (green) out += K.cut(V, dialBand(green[0], green[1], 34.6, 36.6), { mat: "solid" });
  if (yellow) out += K.cut(V, dialBand(yellow[0], yellow[1], 34.6, 36.6), { mat: "steel", angle: 45 });
  out += K.cut(V, rot(K.rect(30, -0.6, 36.8, 0.6), [0, 0], 90 - M.asiDeg(M.V_SPEEDS.vne)), { mat: "solid" });
  const [kx, ky] = V.p([-15, -8]);
  return { geom: out + g.lines, text: g.text + `<text class="t t-sm" x="${kx}" y="${ky}" text-anchor="middle">KNOTS</text>` };
}
export function asiFrontMoving(V, st) {
  const bridge = K.rrect(-4, -25, 4, 4, 3);
  return (
    part(15, movementFront(V, { piv: PIV, rs: 19.6, sDeg: st.sDeg, rockDeg: st.rock, armZ: 12, l2: 12, ptrCw: st.cw, pinR: 1.9, teeth: 12, sectorArc: [72, 108] })) +
    part(16, K.body(V, bridge) + disc(V, PIV, 0.7, "solid", 6)) +
    part(17, hairspring(V, st.cw, { stud: 20, r0: 2.3, r1: 8.4, turns: 6 })) +
    part(16, pointer(V, st.cw, INSTR.asi.ptr, { w: 1.3, tail: 7 }))
  );
}
// the altimeter's dial: 0–9 hundreds of feet round, ticks every 20 ft
export function altDial(V) {
  const side = "L";
  const t = [];
  for (let i = 0; i < 50; i++) t.push([i * 7.2, i % 5 === 0 ? 30.2 : 32.4, 34.6, i % 5 === 0 ? "vis" : "thin"]);
  const out = dialHalf(V, side);
  const g = grads(V, side, t, [5, 6, 7, 8, 9].map((n) => [n * 36, 25, String(n)]));
  const [kx, ky] = V.p([-9, -11]);
  return { geom: out + g.lines, text: g.text + `<text class="t t-sm" x="${kx}" y="${ky}" text-anchor="middle">100 FT</text>` };
}
// the baro knob at the lower left of the flange and its pinion (under the dial: hidden)
export const KNOB = [-30, -30];
export function baroKnob(V) {
  return K.body(V, K.circle(KNOB[0], KNOB[1], 7, 24)) + K.line(V, K.circle(KNOB[0], KNOB[1], 5.4, 24), "thin", true) + K.line(V, K.circle(-24.4, -24.4, 3.2, 16), "hid", true);
}
// the Kollsman scale ring (behind the dial, seen in the broken half), turned by the setting; 4° a hPa
export const kollsmanCw = (hpa) => 90 - (hpa - 1013.25) * 4;
export function kollsman(V, setHpa) {
  const ring = `<path class="paper" fill-rule="evenodd" d="${K.d(V, K.circle(0, 0, 33.6, 72))}${K.d(V, K.circle(0, 0, 26.4, 72).reverse())}"/>` + K.line(V, K.circle(0, 0, 33.6, 72), "thin", true) + K.line(V, K.circle(0, 0, 26.4, 72), "thin", true);
  const ticks = [];
  let txt = "";
  for (let h = 950; h <= 1050; h += 2) {
    const cw = kollsmanCw(h) + (setHpa - 1013.25) * 4;
    if (Math.sin(cw * rad) < 0.08) continue;
    ticks.push([dialPt([0, 0], h % 10 === 0 ? 30.2 : 31.6, cw), dialPt([0, 0], 33.6, cw)]);
    if (h % 20 === 0 && Math.sin(cw * rad) > 0.35) {
      const [x, y] = V.p(dialPt([0, 0], 28.4, cw));
      txt += `<text class="t t-sm" x="${x}" y="${K.r2(y + 2.6)}" text-anchor="middle">${h}</text>`;
    }
  }
  return { geom: ring + (ticks.length ? K.lines(V, ticks, "thin") : ""), text: txt };
}
// the window's index at three o'clock (fixed, on the case)
export const kollsmanIndex = (V) => K.cut(V, [[35.2, 0], [37.6, 1.6], [37.6, -1.6]], { mat: "solid" });
export function altFrontMoving(V, st) {
  // the cradle carries the sector and wheel 1; it turns with the setting
  const piv = ALT_PIV;
  const w1 = ALT_W1;
  const inner =
    movementFront(V, { piv, rs: 18, sDeg: st.sDeg, rockDeg: st.rock, armZ: piv[0] + 12, l2: 12, pinR: 1.6, pinAt: w1, pinCw: -st.wheel, teeth: 10, sectorArc: [74, 106], sg: -1 }) +
    K.body(V, gearPts(w1, 12.5, 60, -st.wheel)) + disc(V, w1, 1.3, "paper", 10) + K.line(V, K.circle(w1[0], w1[1], 1.3, 10), "vis", true) + K.body(V, gearPts(w1, 1.6, 10, -st.wheel));
  const [ox, oy] = V.p([0, 0]);
  const cradle = `<g transform="rotate(${K.r2(st.cradle)} ${ox} ${oy})">${inner}</g>`;
  // the cradle's ring gear (an arc, visible in the broken half)
  const ringPts = [...gearPts([0, 0], 24.6, 120, -st.cradle, { arc: [-80, 80], addendum: 0.4 }), ...K.arc(0, 0, 22.8, 80 - st.cradle, -80 - st.cradle, 24)];
  const pin2 = K.body(V, gearPts([0, 0], 1.25, 10, -st.cw1)) + disc(V, [0, 0], 0.5, "solid", 6);
  return part(22, K.body(V, ringPts)) + part(20, cradle + pin2) + part(21, altPointers(V, st));
}
export function altPointers(V, st) {
  const tri = rot([[31, 0], [35, 1.8], [35, -1.8]], [0, 0], 90 - st.cw100);
  const thin = rot([[0, -0.35], [31, -0.35], [31, 0.35], [0, 0.35]], [0, 0], 90 - st.cw100);
  return K.cut(V, thin, { mat: "solid" }) + K.cut(V, tri, { mat: "solid" }) + pointer(V, st.cw10, 18, { w: 1.6, tail: 4, shape: "wide", hub: 3.2 }) + pointer(V, st.cw1, 31, { w: 1.1, tail: 8, hub: 2.2 });
}
// the VSI dial: zero at nine o'clock, UP above, DOWN below
export function vsiDial(V) {
  const side = "L";
  const t = [];
  for (let f = -2000; f <= 2000; f += 100) t.push([270 + M.vsiDeg(f), f % 500 === 0 ? 30.2 : 32.4, 34.6, f % 500 === 0 ? "vis" : "thin"]);
  const out = dialHalf(V, side);
  const g = grads(V, side, t, [[270, 25.5, "0"], [270 + M.vsiDeg(500), 25, ".5"], [270 + M.vsiDeg(-500), 25, ".5"]]);
  const [ux, uy] = V.p([-12, 9]);
  const [dx, dy] = V.p([-12, -10]);
  const [fx, fy] = V.p([-9, -27]);
  return { geom: out + g.lines, text: g.text + `<text class="t t-sm" x="${ux}" y="${uy}" text-anchor="middle">UP</text><text class="t t-sm" x="${dx}" y="${dy}" text-anchor="middle">DOWN</text><text class="t t-sm" x="${fx}" y="${fy}" text-anchor="middle">1000 FT/MIN</text>` };
}
export function vsiFrontMoving(V, st) {
  const bridge = K.rrect(-4, -25, 4, 4, 3);
  const cw = 270 + st.cw;
  return part(26, movementFront(V, { piv: PIV, rs: 19.6, sDeg: st.sDeg, rockDeg: st.rock, armZ: 12, l2: 12, ptrCw: cw, pinR: 1.9, teeth: 12, sectorArc: [72, 108] }) + K.body(V, bridge) + disc(V, PIV, 0.7, "solid", 6) + hairspring(V, cw, { stud: 20, r0: 2.3, r1: 8.4, turns: 6 }) + pointer(V, cw, INSTR.vsi.ptr, { w: 1.3, tail: 7 }));
}
