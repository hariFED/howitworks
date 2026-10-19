// The light aircraft's solids for its 3D cutaway (light-aircraft-3d.html). Pure data, kit/solid3d.mjs.
//
// Frame: x = −FS (forward), y = WL (up), z = BL (to starboard), so the kit's cutting plane z = 0 is the
// fuselage centreline and the half it removes (z > 0) is the starboard half: the classic cutaway, with
// the port wing, the cabin, the engine bay and the gear left standing. Everything is written in mm from
// model.mjs and parts.mjs, then scaled to centimetres (UNIT) at the end: the kit's camera sits 4.5 m
// from the scene's centre, so an 11 m aeroplane is modelled at 1/10 (the 3D view is NTS anyway).
//
// Level 0 stays light: each system is a few recognisable solids; the detail lives one level down.
//
// Lofts. The kit's solids are lathes and straight prisms, but an aeroplane is lofted: the tail cone runs
// from the cabin's rounded box to a small oval, the cowling from a round nose to the cabin's box, the
// outer wing tapers and every wing station rises with the dihedral, the blades twist. So a solid may
// carry the kit's `warp` (references/3d.md), written here as a pure function of a point [x, y, z] in mm
// in this frame (scaleSolid wraps it for the kit's (x, y, z) in scene units): the kit applies it once, at
// build time, to the solid's vertices and its crease lines, and smooths the normals across shallow
// angles: a prism of the root section becomes the tapered panel, a prism of the cabin section becomes
// the tail cone. Warps leave z = 0 where they touch the cut, so the section the kit draws is the true
// one. Every warped solid is role "solid": no bore, fluid or glass here is warped. Big but simple lathes
// (the cowl nose, the cylinders, the wheels) take fewer `segments` than the kit's default (the budget).

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

export const UNIT = 0.1; // scene units per mm

// ---------------------------------------------------------------- helpers (mm)
const C = M.CABIN;
const T0 = M.THRUST_WL;
const AX = M.TAILCONE.axis;
const rad = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const xy = (pts) => pts.map(([fs, wl]) => [-fs, wl]); // (FS, WL) → extrude-along-z [x, y]
const root = (pts) => xy(P.onSection(pts, 0)); // wing section at the root, (ξ, η) → [x, y]
const d = 15 / M.ROOT_CHORD; // wing skin, as a chord fraction
const up = P.upAt;
const lo = P.loAt;
const AF = M.naca2412(40);
const between = (pts, a, b) => pts.filter(([x]) => x > a + 1e-6 && x < b - 1e-6);
// many steps along a prism, so a warp can bend it between its ends
const STEPS = { steps: 24 };
// stretch-free ring sampler for a closed outline: a point every `step` mm along each edge
function dense(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

// ---------------------------------------------------------------- fuselage sections (BL, WL)
// A rounded box: half width a, top and bottom WL, top and bottom corner radii. The cabin is one, the
// tail cone and the cowling are lofted between them and round sections.
export const CAB = { a: C.half, top: C.roof, bot: C.floor, rt: C.rTop, rb: C.rBottom };
function boxSection(sec, inset = 0, step = 110) {
  const a = sec.a - inset;
  const top = sec.top - inset;
  const bot = sec.bot + inset;
  const rt = Math.max(1, sec.rt - inset);
  const rb = Math.max(1, sec.rb - inset);
  const pts = [];
  const line = (p, q) => {
    const n = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / step));
    for (let i = 0; i < n; i++) pts.push([p[0] + ((q[0] - p[0]) * i) / n, p[1] + ((q[1] - p[1]) * i) / n]);
  };
  const arc = (cz, cy, r, a0, a1, n = 8) => {
    for (let i = 0; i < n; i++) {
      const t = (a0 + ((a1 - a0) * i) / n) * rad;
      pts.push([cz + r * Math.cos(t), cy + r * Math.sin(t)]);
    }
  };
  // anticlockwise from the bottom centre, seen from ahead with +BL to the right
  line([0, bot], [a - rb, bot]);
  arc(a - rb, bot + rb, rb, -90, 0);
  line([a, bot + rb], [a, top - rt]);
  arc(a - rt, top - rt, rt, 0, 90);
  line([a - rt, top], [-(a - rt), top]);
  arc(-(a - rt), top - rt, rt, 90, 180);
  line([-a, top - rt], [-a, bot + rb]);
  arc(-(a - rb), bot + rb, rb, 180, 270);
  line([-(a - rb), bot], [0, bot]);
  return pts;
}
function insideBox(sec, z, y) {
  const az = Math.abs(z);
  if (az > sec.a || y > sec.top || y < sec.bot) return false;
  if (y > sec.top - sec.rt && az > sec.a - sec.rt) return Math.hypot(az - (sec.a - sec.rt), y - (sec.top - sec.rt)) <= sec.rt;
  if (y < sec.bot + sec.rb && az > sec.a - sec.rb) return Math.hypot(az - (sec.a - sec.rb), y - (sec.bot + sec.rb)) <= sec.rb;
  return true;
}
// distance from (0, cy) to the section's outline along the direction th
function reach(sec, cy, th) {
  let a = 0;
  let b = 4000;
  const cz = Math.cos(th);
  const sy = Math.sin(th);
  for (let i = 0; i < 36; i++) {
    const m = (a + b) / 2;
    if (insideBox(sec, m * cz, cy + m * sy)) a = m;
    else b = m;
  }
  return a;
}
// A loft along x: every vertex of a prism of the `base` section (centred on WL cy0) keeps its direction
// from the centre and its depth inside the outline, and lands on the section secAt(fs) (centred on cyAt(fs)).
function loft(base, cy0, secAt, cyAt) {
  return ([x, y, z]) => {
    const fs = -x;
    const th = Math.atan2(y - cy0, z);
    const depth = reach(base, cy0, th) - Math.hypot(z, y - cy0);
    const r = reach(secAt(fs), cyAt(fs), th) - depth;
    return [x, cyAt(fs) + r * Math.sin(th), r * Math.cos(th)];
  };
}
// the tail cone: the cabin's box at FS 2450 to a small oval at FS 6700, on the sheet's side outline
// (top and bottom at the cone axis ± coneR) and plan (half width in proportion)
const CT = M.TAILCONE;
export function coneSection(fs) {
  const t = clamp((fs - CT.fs0) / (CT.fs1 - CT.fs0), 0, 1);
  const r = M.coneR(fs);
  const a = (C.half * r) / CT.r0;
  const m = Math.min(a, r) * 0.999;
  const k = t ** 0.55;
  return { a, top: AX + r, bot: AX - r, rt: lerp(C.rTop, m, k), rb: lerp(C.rBottom, m, k) };
}
const coneWarp = loft(CAB, AX, coneSection, () => AX);
// the cowling behind its round nose: a circle at FS −600 (the sheet's cowl radius) to the cabin's
// lower box at the firewall (WL 730 to the windscreen's foot at 1770, half width 590)
const COWL_JOIN = -720;
const NOSE_R = M.cowlR(COWL_JOIN);
const circleSec = (r, cy) => ({ a: r, top: cy + r, bot: cy - r, rt: r, rb: r });
export function cowlSection(fs) {
  const u = clamp((fs - COWL_JOIN) / -COWL_JOIN, 0, 1) ** 1.6;
  const r = M.cowlR(fs);
  const a = lerp(r, C.half, u);
  const m = Math.min(a, r) * 0.999;
  return { a, top: T0 + r, bot: T0 - r, rt: Math.min(m, lerp(r, 40, u)), rb: Math.min(m, lerp(r, C.rBottom, u)) };
}
const cowlWarp = loft(circleSec(NOSE_R, T0), T0, cowlSection, () => T0);

// ---------------------------------------------------------------- the wing
// The wing's prisms are drawn on the root section; wingWarp moves each vertex to its own station: the
// dihedral lifts it, and outboard of the break the section shrinks with the chord about the straight
// hinge line (the fixed wing ahead of the hinge keeps its aerofoil, the flap and aileron keep the root's).
const INC = M.INCIDENCE * rad;
function toXiEta([fs, wl]) {
  const a = (fs - M.LE_FS) / M.ROOT_CHORD;
  const b = (wl - M.WL_LE) / M.ROOT_CHORD;
  return [a * Math.cos(INC) - b * Math.sin(INC), a * Math.sin(INC) + b * Math.cos(INC)];
}
export function wingWarp([x, y, z]) {
  const ws = Math.abs(z);
  const [xi, eta] = toXiEta([-x, y]);
  const s = P.sectionAt(ws);
  const h = (M.HINGE_FS - s.le) / s.c; // the hinge line's chord fraction at this station
  const xi2 = xi * (h / M.HINGE_X);
  const t0 = up(xi) - lo(xi);
  const f = t0 > 1e-5 ? (eta - lo(xi)) / t0 : 0.5;
  const eta2 = t0 > 1e-5 ? lo(xi2) + f * (up(xi2) - lo(xi2)) : eta;
  const [fs, wl] = M.toWing([xi2, eta2], s.c, s.le, s.wl);
  return [-fs, wl, z];
}
const wingAt = (xi, eta, ws) => wingWarp([...root([[xi, eta]])[0], -ws]);

// the wing's skin pieces in (ξ, η): D-nose + lower skin + rear web as one C-shaped band, over the peeled
// bay (the upper skin between the spars left off); inboard of it the whole skin, a ring
function shellA() {
  const s0 = M.SPAR_X;
  const h = M.HINGE_X;
  const outer = [[s0, up(s0)], ...between(AF.upper, 0, s0).reverse(), [0, 0], ...between(AF.lower, 0, h), [h, lo(h)], [h, up(h) - d]];
  const inner = [[h - d, up(h - d) - d], [h - d, lo(h - d) + d], ...between(AF.lower, 0.01, h - d).reverse().map(([x, y]) => [x, y + d]), [d * 1.2, 0], ...between(AF.upper, 0.01, s0).map(([x, y]) => [x, y - d]), [s0, up(s0) - d]];
  return [...outer, ...inner];
}
// a band between the inner skins from ξ a to b (ribs, the tank, the hole of the skin ring), inset `pad`
function bay(a, b, pad = 0) {
  const t = d + pad;
  const top = [[a, up(a) - t], ...between(AF.upper, a, b).map(([x, y]) => [x, y - t]), [b, up(b) - t]];
  const bot = [[a, lo(a) + t], ...between(AF.lower, a, b).map(([x, y]) => [x, y + t]), [b, lo(b) + t]];
  return [...top, ...bot.reverse()];
}
// the front spar: an I, web and two caps hugging the skins
const SPAR = { a: M.SPAR_X - 0.022, b: M.SPAR_X + 0.034, w0: M.SPAR_X, w1: M.SPAR_X + 0.012, ft: 0.009 };
function sparI() {
  const { a, b, w0, w1, ft } = SPAR;
  const U = (x) => up(x) - d;
  const Lo = (x) => lo(x) + d;
  const capTop = [[a, U(a)], ...between(AF.upper, a, b).map(([x, y]) => [x, y - d]), [b, U(b)]];
  const capBot = [[b, Lo(b)], ...between(AF.lower, a, b).reverse().map(([x, y]) => [x, y + d]), [a, Lo(a)]];
  return [
    ...capTop,
    [b, U(b) - ft], [w1, U(w1) - ft], [w1, Lo(w1) + ft], [b, Lo(b) + ft],
    ...capBot,
    [a, Lo(a) + ft], [w0, Lo(w0) + ft], [w0, U(w0) - ft], [a, U(a) - ft],
  ];
}
const RIB_A = SPAR.b + 0.002;
const RIB_B = M.HINGE_X - d - 0.001;
function ribHoles() {
  return [0.39, 0.57].map((x) => {
    const [cx, cy] = root([[x, (up(x) + lo(x)) / 2]])[0];
    return S.circle(cx, cy, 0.3 * (up(x) - lo(x)) * M.ROOT_CHORD, 20);
  });
}

// ---------------------------------------------------------------- where things are (mm)
export const FLAP_PIVOT = xy(P.surfOn([M.FLAP_PIVOT], 0))[0];
export const AIL_PIVOT = xy(P.surfOn([P.AIL_HINGE], 0))[0];
export const ELEV_PIVOT = [-P.ELEV_HINGE[0], P.ELEV_HINGE[1], 0];
export const RUDDER_PIVOT = [-M.RUDDER_HINGE_FS, 2000, 0];
export const PROP_PIVOT = [-M.PROP_FS, T0, 0];
export const PANEL_PIVOT = [-316, 1500, 0];
export const DIHEDRAL = M.DIHEDRAL * rad;
const STRUT_FS = { lo: 1150, hi: 1060 };
// where each wing's lift acts (quarter chord of the mean chord, mid semi-span), for the lift arrows
export const LIFT_AT = (s) => [-(M.LEMAC + 0.25 * M.MAC), P.wingTopAt(2400) + 40, s * 2400];
export const CG_AT = [-M.CG_TOUR, 1400, 0];
// the wing's lower surface WL at a station and FS (for the strut and the pitot mast)
function wingLowAtFs(ws, fs, half = 0) {
  const sec = P.onSection(AF.lower, ws);
  const at = (f) => {
    for (let i = 1; i < sec.length; i++) {
      if (sec[i][0] >= f) {
        const [f0, w0] = sec[i - 1];
        const [f1, w1] = sec[i];
        return w0 + ((w1 - w0) * (f - f0)) / (f1 - f0);
      }
    }
    return sec[sec.length - 1][1];
  };
  let m = Infinity;
  for (let k = -4; k <= 4; k++) m = Math.min(m, at(fs + (half * k) / 4));
  return m;
}

// ---------------------------------------------------------------- the panel's six instruments (decals)
function face(g, size) {
  const s = size / 2 / 40;
  g.translate(size / 2, size / 2);
  return s;
}
const pol = (s, r, deg) => [r * s * Math.cos((deg * Math.PI) / 180), -r * s * Math.sin((deg * Math.PI) / 180)];
function bezel(g, s, tk) {
  g.strokeStyle = g.fillStyle = tk.ink;
  g.lineWidth = 0.8 * s;
  g.beginPath();
  g.arc(0, 0, 37 * s, 0, 2 * Math.PI);
  g.stroke();
}
function ticks(g, s, from, to, n, r0, r1, w = 0.35) {
  g.lineWidth = w * s;
  for (let i = 0; i <= n; i++) {
    const a = from + ((to - from) * i) / n;
    g.beginPath();
    g.moveTo(...pol(s, r0, a));
    g.lineTo(...pol(s, r1, a));
    g.stroke();
  }
}
function label(g, s, txt, x, y, px = 5) {
  g.font = `600 ${px * s}px ui-monospace, Consolas, monospace`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(txt, x * s, y * s);
}
function needle(g, s, deg, r, w = 1.6) {
  g.lineWidth = w * s;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(...pol(s, r, deg));
  g.stroke();
  g.beginPath();
  g.arc(0, 0, 2.2 * s, 0, 2 * Math.PI);
  g.fill();
}
function asiDial(g, size, tk) {
  const s = face(g, size);
  bezel(g, s, tk);
  const band = (v0, v1, r0, r1) => {
    g.beginPath();
    for (let v = v0; v <= v1; v += 1) g.lineTo(...pol(s, r1, P.asiAngle(v)));
    for (let v = v1; v >= v0; v -= 1) g.lineTo(...pol(s, r0, P.asiAngle(v)));
    g.closePath();
  };
  band(M.stallSpeed(0), M.V_SPEEDS.vno, 33.4, 35.6);
  g.fill();
  band(M.stallSpeed(30), M.V_SPEEDS.vfe, 31, 32.8);
  g.stroke();
  for (let v = 30; v <= 170; v += 10) ticks(g, s, P.asiAngle(v), P.asiAngle(v), 0, 27, 30.6);
  for (let v = 40; v <= 160; v += 40) label(g, s, String(v), ...pol(1, 21, P.asiAngle(v)));
  label(g, s, "KT", 0, 10, 4);
  needle(g, s, P.asiAngle(110), 26);
}
function attitude(g, size, tk) {
  const s = face(g, size);
  g.save();
  g.beginPath();
  g.arc(0, 0, 34 * s, 0, 2 * Math.PI);
  g.clip();
  g.fillStyle = tk.muted;
  g.globalAlpha = 0.35;
  g.fillRect(-40 * s, 2 * s, 80 * s, 40 * s);
  g.globalAlpha = 1;
  g.strokeStyle = tk.ink;
  g.lineWidth = 0.9 * s;
  g.beginPath();
  g.moveTo(-40 * s, 2 * s);
  g.lineTo(40 * s, 2 * s);
  g.stroke();
  g.lineWidth = 0.4 * s;
  for (const p of [-10, -5, 5, 10]) {
    const w = Math.abs(p) === 10 ? 9 : 5;
    g.beginPath();
    g.moveTo(-w * s, (2 - p * 1.1) * s);
    g.lineTo(w * s, (2 - p * 1.1) * s);
    g.stroke();
  }
  g.restore();
  bezel(g, s, tk);
  ticks(g, s, 30, 150, 4, 31, 35, 0.5);
  g.strokeStyle = tk.accent;
  g.lineWidth = 1.4 * s;
  g.beginPath();
  g.moveTo(-18 * s, 0);
  g.lineTo(-6 * s, 0);
  g.lineTo(-3 * s, 3 * s);
  g.moveTo(18 * s, 0);
  g.lineTo(6 * s, 0);
  g.lineTo(3 * s, 3 * s);
  g.stroke();
}
function altimeter(g, size, tk) {
  const s = face(g, size);
  bezel(g, s, tk);
  ticks(g, s, 90, -270, 50, 31, 34, 0.3);
  ticks(g, s, 90, -270, 10, 29, 34, 0.6);
  for (let i = 0; i < 10; i++) label(g, s, String(i), ...pol(1, 23, 90 - i * 36));
  needle(g, s, 90 - 0.45 * 360, 18, 2.2);
  needle(g, s, 90 - 0.5 * 360 * 0.1 - 160, 27, 1.1);
}
function turnCoord(g, size, tk) {
  const s = face(g, size);
  bezel(g, s, tk);
  g.lineWidth = 1.2 * s;
  g.beginPath();
  g.moveTo(-20 * s, 0);
  g.lineTo(20 * s, 0);
  g.moveTo(0, -4 * s);
  g.lineTo(0, 0);
  g.stroke();
  g.beginPath();
  g.arc(0, 0, 3 * s, 0, 2 * Math.PI);
  g.fill();
  ticks(g, s, 180 + 20, 180 + 20, 0, 26, 33, 0.8);
  ticks(g, s, -20, -20, 0, 26, 33, 0.8);
  g.lineWidth = 0.6 * s;
  g.beginPath();
  g.arc(0, -40 * s, 56 * s, (65 * Math.PI) / 180, (115 * Math.PI) / 180);
  g.stroke();
  g.beginPath();
  g.arc(0, 15.6 * s, 2.6 * s, 0, 2 * Math.PI);
  g.fill();
  label(g, s, "L", -22, 10, 4);
  label(g, s, "R", 22, 10, 4);
}
function heading(g, size, tk) {
  const s = face(g, size);
  bezel(g, s, tk);
  ticks(g, s, 0, 360, 72, 30, 33, 0.3);
  ticks(g, s, 0, 360, 12, 28, 33, 0.6);
  ["N", "E", "S", "W"].forEach((c, i) => label(g, s, c, ...pol(1, 22, 90 - i * 90 - 30)));
  g.lineWidth = 1.1 * s;
  g.beginPath();
  g.moveTo(0, 14 * s);
  g.lineTo(0, -16 * s);
  g.moveTo(-8 * s, -4 * s);
  g.lineTo(8 * s, -4 * s);
  g.moveTo(-4 * s, 10 * s);
  g.lineTo(4 * s, 10 * s);
  g.stroke();
  g.strokeStyle = tk.accent;
  g.beginPath();
  g.moveTo(0, -36 * s);
  g.lineTo(0, -29 * s);
  g.stroke();
}
function vsi(g, size, tk) {
  const s = face(g, size);
  bezel(g, s, tk);
  const ang = (v) => 180 - (v / 20) * 170;
  for (let v = -20; v <= 20; v += 5) ticks(g, s, ang(v), ang(v), 0, 26, 33, Math.abs(v) % 10 === 0 ? 0.7 : 0.35);
  for (const v of [0, 10, 20]) label(g, s, String(v), ...pol(1, 20, ang(v)));
  for (const v of [10, 20]) label(g, s, String(v), ...pol(1, 20, ang(-v)));
  label(g, s, "UP", -8, -10, 3.6);
  label(g, s, "DN", -8, 10, 3.6);
  needle(g, s, ang(0), 27);
}
// the six-pack on the pilot's side, two rows of three
export const SIX = [
  ["asi", asiDial, -470, 1652],
  ["ai", attitude, -370, 1652],
  ["alt", altimeter, -270, 1652],
  ["tc", turnCoord, -470, 1553],
  ["hi", heading, -370, 1553],
  ["vsi", vsi, -270, 1553],
];

// ---------------------------------------------------------------- tail surfaces
const TP = M.TAILPLANE;
// the tailplane and elevator keep the root's symmetric section, scaled with the chord along the span
const tpLe = (bl) => lerp(TP.le, TP.tipLe, clamp(Math.abs(bl) / (TP.span / 2), 0, 1));
const tpTe = (bl) => lerp(TP.te, TP.tipTe, clamp(Math.abs(bl) / (TP.span / 2), 0, 1));
const tpK = (bl) => (tpTe(bl) - tpLe(bl)) / (TP.te - TP.le);
function stabWarp([x, y, z]) {
  const fs = -x;
  const le = tpLe(z);
  return [-(le + ((fs - TP.le) * (TP.hinge - le)) / (TP.hinge - TP.le)), TP.wl + (y - TP.wl) * tpK(z), z];
}
function elevWarp([x, y, z]) {
  const fs = -x;
  const te = tpTe(z);
  return [-(TP.hinge + ((fs - TP.hinge) * (te - TP.hinge)) / (TP.te - TP.hinge)), TP.wl + (y - TP.wl) * tpK(z), z];
}
// fin and rudder: the root's plan section (FS, BL) swept up, its leading edge and the rudder's trailing
// edge following the sheet's side outlines, the thickness with the chord; the fin's foot on the cone
const coneTop = (fs) => AX + M.coneR(fs);
const finLe = (wl) => lerp(P.FIN[0][0], P.FIN[1][0], clamp((wl - P.FIN[0][1]) / (P.FIN[1][1] - P.FIN[0][1]), 0, 1));
const RTE = [[1560, 7040], [1640, M.TAIL_TE_FS], [1900, M.TAIL_TE_FS], [2600, 6980], [2720, 6860]];
const rudTe = (wl) => M.lerpTable(RTE, wl);
const FIN_ROOT = { le: 5250, te: M.TAIL_TE_FS };
const finK = (wl) => (rudTe(wl) - finLe(wl)) / (FIN_ROOT.te - FIN_ROOT.le);
const FIN_Y = [2000, 2700];
function finWarp([x, y, z]) {
  const fs = -x;
  const t = (y - FIN_Y[0]) / (FIN_Y[1] - FIN_Y[0]);
  const foot = coneTop(fs) + 3;
  const wl = lerp(foot, M.FIN_TOP - 20, t);
  const le = finLe(wl);
  const h = M.RUDDER_HINGE_FS - 10;
  return [-(le + ((fs - FIN_ROOT.le) * (h - le)) / (h - FIN_ROOT.le)), wl, z * finK(wl)];
}
function rudderWarp([x, y, z]) {
  const fs = -x;
  const h = M.RUDDER_HINGE_FS + 10;
  const te = rudTe(y);
  return [-(h + ((fs - h) * (te - h)) / (FIN_ROOT.te - h)), y, z * finK(y)];
}
// a convex outline clipped to FS a … b (Sutherland–Hodgman on the two vertical lines)
function clipFs(pts, a, b) {
  const cut = (poly, keep, f0) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const ip = keep(p[0]);
      const iq = keep(q[0]);
      if (ip) out.push(p);
      if (ip !== iq) {
        const t = (f0 - p[0]) / (q[0] - p[0]);
        out.push([f0, p[1] + (q[1] - p[1]) * t]);
      }
    }
    return out;
  };
  return cut(cut(pts, (f) => f >= a, a), (f) => f <= b, b);
}

// ---------------------------------------------------------------- the propeller blade's twist
const PITCH = 1500; // mm per turn, a cruise prop
function bladeWarp([x, y, z]) {
  const r = y - T0;
  const R = Math.abs(r);
  const sg = Math.sign(r) || 1;
  const beta = Math.atan(PITCH / (2 * Math.PI * Math.max(R, 150)));
  const th = lerp(1.3, 0.45, clamp(R / (M.PROP_D / 2), 0, 1));
  const dx = (x - -M.PROP_FS) * th;
  return [-M.PROP_FS + dx * Math.cos(beta) + sg * z * Math.sin(beta), y, z * Math.cos(beta) - sg * dx * Math.sin(beta)];
}

// ---------------------------------------------------------------- the parts (mm)
function partsMM() {
  const g = M.MAIN_GEAR;
  const n = M.NOSE_GEAR;
  const W = M.WINDSCREEN;
  const front = (fs) => M.WINDSCREEN.base[1] + ((fs - W.base[0]) * (W.top[1] - W.base[1])) / (W.top[0] - W.base[0]);

  // ---- fuselage skins: the cabin box below the side panels and over the roof, the side panels with
  // their windows and the door's gaps, the lofted tail cone; frames at the sheet's stations
  const outer = boxSection(CAB, 0);
  const inner = boxSection(CAB, 20);
  const below = (pts, wl) => pts.filter(([, y]) => y <= wl + 1e-6);
  const above = (pts, wl) => pts.filter(([, y]) => y >= wl - 1e-6);
  const SIDE = C.floor + C.rBottom; // 930: the flat side starts
  const TOPS = C.roof - C.rTop; // 1930: the roof's corner starts
  const lowerShell = (() => {
    const o = below(outer, SIDE).filter(([z]) => z >= 0);
    const o2 = below(outer, SIDE).filter(([z]) => z < 0);
    const i = below(inner, SIDE).filter(([z]) => z >= 0);
    const i2 = below(inner, SIDE).filter(([z]) => z < 0);
    // outer from port 930 round the bottom to stbd 930, then the inner back
    return [...o2, ...o, ...i.reverse(), ...i2.reverse()].filter((p, k, arr) => k === 0 || Math.hypot(p[0] - arr[k - 1][0], p[1] - arr[k - 1][1]) > 0.01);
  })();
  const roofShell = [...above(outer, TOPS), ...above(inner, TOPS).reverse()];
  // a side panel in (FS, WL): the flat side from WL 930 to 1930, behind the windscreen's slope; three
  // windows and the door's three gaps (its top is the roof joint)
  const panel = [[0, SIDE], [C.fs1, SIDE], [C.fs1, TOPS], [473, TOPS], [0, front(0)]];
  const WIN = [
    [[80, C.sill], [975, C.sill], [975, 1895], [540, 1895], [80, front(80) - 28]],
    [[1045, C.sill], [1555, C.sill], [1555, 1895], [1045, 1895]],
    [[1645, C.sill], [2370, C.sill], [2370, 1800], [1645, 1895]],
  ];
  const DOOR = [
    K.rect(637, 952, 643, C.sill - 12),
    K.rect(1587, 952, 1593, 1890),
    K.rect(650, 942, 1580, 948),
  ];
  const sidePanel = (s) => S.extrude(xy(panel), { along: "z", from: s < 0 ? -C.half : C.half - 20, to: s < 0 ? -(C.half - 20) : C.half, holes: [...WIN, ...DOOR].map(xy), own: true });
  const glass = (s) => S.extrude(xy([[60, C.sill - 20], [2390, C.sill - 20], [2390, 1915], [498, 1915], [60, front(60) - 12]]), { along: "z", from: s < 0 ? -(C.half + 6) : C.half + 0.5, to: s < 0 ? -(C.half + 0.5) : C.half + 6, role: "glass", explode: [0, 0, s * 300] });
  const frameRing = (sec, fs, w = 40, inset0 = 20.5, depth = 60) => S.extrude(boxSection(sec, inset0, 90), { along: "x", from: -(fs + w), to: -fs, holes: [boxSection(sec, inset0 + depth, 90)], own: true });
  // a tail cone frame on the lofted section at its station (just inside the skin's inner face)
  const coneFrame = (fs) => {
    const sec = coneSection(fs + 15);
    const o = Array.from({ length: 56 }, (_, i) => {
      const th = (i / 56) * 2 * Math.PI;
      const r = reach(sec, AX, th) - 23;
      return [r * Math.cos(th), AX + r * Math.sin(th)];
    });
    const ii = o.map(([z, y]) => {
      const th = Math.atan2(y - AX, z);
      const r = Math.hypot(z, y - AX) - 45;
      return [r * Math.cos(th), AX + r * Math.sin(th)];
    });
    return S.extrude(o, { along: "x", from: -(fs + 30), to: -fs, holes: [ii], own: true });
  };
  // the firewall: the cabin's inside section up to just under the windscreen's foot
  const firewallShape = (() => {
    const t = 20.2;
    const top = 1750;
    const f = boxSection(CAB, t).filter(([, y]) => y <= top);
    const k = f.findIndex((p, i) => i > 0 && p[0] < 0 && f[i - 1][0] > 0);
    return [...f.slice(0, k), [C.half - t, top], [-(C.half - t), top], ...f.slice(k)];
  })();

  // ---- the cowling: a round nose lathe and the lofted rear to the firewall
  const cowlNose = (() => {
    const fsList = Array.from({ length: 14 }, (_, i) => COWL_JOIN + ((M.COWL.front - COWL_JOIN) * i) / 13);
    const out = fsList.map((fs) => [M.cowlR(fs), -fs]);
    const back = 14;
    const innerR = (fs) => M.cowlR(fs) - 15;
    const fsIn = fsList.filter((fs) => fs > M.COWL.front + back).reverse();
    return [...out, [188, -M.COWL.front], [188, -(M.COWL.front + back)], ...[[innerR(M.COWL.front + back), -(M.COWL.front + back)]], ...fsIn.map((fs) => [innerR(fs), -fs])];
  })();
  // the lofted rear, with its upper port access panel off (100°–155° round from the top, seen from
  // ahead with +BL to the right), so the far cylinders show from above as well as through the cut
  const cowlRear = (() => {
    const arc = (r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => {
      const t = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
      return [r * Math.cos(t), T0 + r * Math.sin(t)];
    });
    const band = [...arc(NOSE_R, 155, 460, 62), ...arc(NOSE_R - 15, 460, 155, 62)];
    return S.extrude(band, { along: "x", from: 0, to: -COWL_JOIN, ...STEPS, warp: cowlWarp });
  })();

  // ---- the propeller blade's planform (twisted by its warp)
  const blade = (() => {
    const R = M.PROP_D / 2;
    const w = (r) => 46 + 60 * Math.sin(Math.PI * Math.min(1, (r / R - 0.12) / 0.95)) * (r / R < 0.92 ? 1 : 0.6);
    const rs = Array.from({ length: 13 }, (_, i) => 60 + ((R * 0.97 - 60) * i) / 12);
    const lead1 = rs.map((r) => [w(r), T0 + r]);
    const trail1 = rs.map((r) => [-0.7 * w(r), T0 + r]).reverse();
    const lead2 = rs.map((r) => [-w(r), T0 - r]);
    const trail2 = rs.map((r) => [0.7 * w(r), T0 - r]).reverse();
    return [...lead1, [0, T0 + R], ...trail1, ...lead2, [0, T0 - R], ...trail2];
  })();

  // ---- the engine: a flat-four, two finned cylinders a side staggered along the crankshaft
  const CYL = [[610, -1], [480, 1], [380, -1], [250, 1]]; // x (−FS) of each cylinder, side
  const cylinder = (x, s) => S.lathe(cylinderProfile(s), { axis: "z", at: [x, 1290], segments: 48, own: true });

  // ---- landing gear
  // a wheel on its axle along z (q from the inboard side): axle stub, hub, rounded tyre
  const wheelLoop = (rT, rH, wT, wH, axIn, axOut) => [[0, -axIn], [18, -axIn], [18, -wH], [rH, -wH], [rH, -wT + 10], [rT - 40, -wT], [rT - 8, -wT + 22], [rT, -wT + 50], [rT, wT - 50], [rT - 8, wT - 22], [rT - 40, wT], [rH, wT - 10], [rH, wH], [18, wH], [18, axOut], [0, axOut]];
  const mainWheel = (s) => S.lathe(wheelLoop(g.tyreD / 2, 110, g.tyreW / 2, 62, 118, 70).map(([r, q]) => [r, s * (g.track / 2 + q)]), { axis: "z", at: [-g.fs, g.tyreD / 2], segments: 96, own: true });
  // a spring-steel leg: a tapered bar curving out and down from under the floor to the axle, in the
  // front view's plane, 70 mm fore and aft
  const leg = (s) => {
    const A = [330, C.floor - 46];
    const B = [780, C.floor - 60];
    const E = [g.track / 2 - 120, g.tyreD / 2 + 10];
    const pts = Array.from({ length: 12 }, (_, i) => {
      const t = i / 11;
      const p = [(1 - t) ** 2 * A[0] + 2 * t * (1 - t) * B[0] + t * t * E[0], (1 - t) ** 2 * A[1] + 2 * t * (1 - t) * B[1] + t * t * E[1]];
      const dz = 2 * (1 - t) * (B[0] - A[0]) + 2 * t * (E[0] - B[0]);
      const dy = 2 * (1 - t) * (B[1] - A[1]) + 2 * t * (E[1] - B[1]);
      const l = Math.hypot(dz, dy);
      return { p, nrm: [-dy / l, dz / l], w: lerp(90, 46, t) / 2 };
    });
    const a = pts.map(({ p, nrm, w }) => [p[0] + nrm[0] * w, p[1] + nrm[1] * w]);
    const b = pts.map(({ p, nrm, w }) => [p[0] - nrm[0] * w, p[1] - nrm[1] * w]).reverse();
    return S.extrude([...a, ...b].map(([z, y]) => [s * z, y]), { along: "x", from: -(g.fs + 35), to: -(g.fs - 35), own: true });
  };
  const noseWheel = S.lathe(wheelLoop(n.tyreD / 2, 64, n.tyreW / 2, 44, 92, 92), { axis: "z", at: [-n.fs, n.tyreD / 2], own: true });
  const cowlBotAtNose = T0 - reach(cowlSection(n.fs), T0, -Math.PI / 2);

  // ---- the wing strut: a streamline tube swept from the cabin side to the wing at WS 3000
  const strut = (s) => {
    const top = wingLowAtFs(3000, STRUT_FS.hi, 56) - 5;
    const A = [-STRUT_FS.lo, 930, s * (C.half + 26)];
    const B = [-STRUT_FS.hi, top, s * 3000];
    const sec = [[50, 0], [34, 13], [8, 20], [-22, 17], [-46, 8], [-52, 0], [-46, -8], [-22, -17], [8, -20], [34, -13]];
    return S.extrude(sec, {
      along: "y", from: 0, to: 1000, own: true,
      warp: ([x, y, z]) => {
        const t = y / 1000;
        return [A[0] + (B[0] - A[0]) * t + x, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t + z];
      },
    });
  };
  // a point a fraction t up the port strut's centre line
  const strutAt = (t) => [-STRUT_FS.lo + (STRUT_FS.lo - STRUT_FS.hi) * t, 930 + (wingLowAtFs(3000, STRUT_FS.hi, 56) - 5 - 930) * t, -(C.half + 26) - (3000 - C.half - 26) * t];
  const PIT = P.PITOT;
  const pitotWL = wingLowAtFs(PIT.ws, 1000, 60) - 90;
  const elevSec = (a, b) => clipFs(P.ELEV_SEC, a, b);

  return [
    // ---- airframe: skins, frames, firewall and floor
    S.part(1, "FUSELAGE", [
      S.extrude(lowerShell, { along: "x", from: -C.fs1, to: 0 }),
      S.extrude(roofShell, { along: "x", from: -C.fs1, to: -W.top[0], own: true }),
      sidePanel(-1),
      sidePanel(1),
      S.extrude(boxSection(CAB, 0), { along: "x", from: -CT.fs1, to: -CT.fs0, holes: [boxSection(CAB, 20)], ...STEPS, warp: coneWarp, own: true }),
      S.lathe([[0, -CT.fs1], [0.94 * M.coneR(CT.fs1), -CT.fs1], [80, -(CT.fs1 + 70)], [40, -(CT.fs1 + 120)], [0, -(CT.fs1 + 135)]], { axis: "x", at: [AX, 0], own: true }),
      S.extrude(firewallShape, { along: "x", from: -20, to: 0, own: true }),
      S.box([-(C.fs1 - 25), 880, -485], [-20, 896, 485], { own: true }),
      frameRing(CAB, 1000),
      frameRing(CAB, 1580),
      coneFrame(3300),
      coneFrame(4250),
    ], { hatch: "solid", anchor: { cut: [-3600, coneTop(3600) - 10, 0], out: { c: [-3600, AX, 0], r: M.coneR(3600), axis: "x" } } }),
    S.part(21, "WINDSCREEN AND WINDOWS", [
      S.extrude(xy([[2, front(2) + 2], [W.top[0] - 2, C.roof - 6], [W.top[0] - 2, C.roof - 32], [24, front(24) - 26]]), { along: "z", from: -(C.half - 22), to: C.half - 22, role: "glass" }),
      glass(-1),
      glass(1),
    ], { mat: "plastic", angle: 135, explode: [0, 700, 0], anchor: { cut: [-330, front(330) - 12, 0], out: { c: [-330, front(330), 0], r: 0 } } }),
    S.part(8, "COWLING", [
      S.lathe(cowlNose, { axis: "x", at: [T0, 0], segments: 96 }),
      cowlRear,
      S.disc([-M.COWL.front + 0.6, T0 + 30, -255], 52, { normal: "x", role: "mouth" }),
    ], { hatch: "solid", explode: [400, 1100, 0], anchor: { cut: [700, T0 + M.cowlR(-700) - 7, 0], out: { c: [700, T0, 0], r: M.cowlR(-700), axis: "x" } } }),
    // ---- engine bay
    S.part(5, "ENGINE", [
      S.extrude(xy([[-800, 1150], [-790, 1340], [-190, 1340], [-170, 1320], [-170, 1150], [-320, 1130], [-320, 1040], [-350, 1022], [-590, 1022], [-620, 1040], [-620, 1130], [-700, 1120]]), { along: "z", from: -180, to: 180, bevel: 18 }),
      ...CYL.map(([x, s]) => cylinder(x, s)),
      // rocker covers on the two port heads (the starboard pair is cut away)
      ...CYL.filter(([, s]) => s < 0).map(([x]) => S.box([x - 50, 1352, -404], [x + 50, 1392, -322], { own: true })),
      S.lathe([[0, 790], [45, 790], [45, 880], [82, 880], [82, 896], [0, 896]], { axis: "x", at: [T0, 0], own: true }),
    ], { mat: "alu", angle: 45, explode: [900, 0, 0], anchor: { cut: [480, 1250, 0], out: { c: [480, 1280, 0], r: 400, axis: "z" } } }),
    S.part(7, "ENGINE MOUNT", [
      ...[-1, 1].map((s) => S.extrude(mountTruss(), { along: "z", from: s < 0 ? -318 : 290, to: s < 0 ? -290 : 318, holes: mountHoles(), own: true })),
      S.box([118, 1140, -290], [150, 1170, 290], { own: true }),
    ], { hatch: "none", explode: [350, 0, 0], anchor: { cut: [135, 1155, 0], out: { c: [75, 1310, -300], r: 0 } } }),
    S.part(19, "BATTERY", [S.box([80, 1460, -270], [240, 1650, -90])], { mat: "plastic", angle: 45, explode: [500, 300, 0], anchor: { cut: [160, 1560, -90], out: { c: [160, 1650, -180], r: 0 } } }),
    S.part(6, "PROPELLER", [
      S.lathe(spinnerLoop(), { axis: "x", at: [T0, 0] }),
      S.lathe([[0, 904], [70, 904], [70, 985], [0, 985]], { axis: "x", at: [T0, 0], segments: 48, own: true, hatch: ["alu", 135] }),
      S.extrude(blade, { along: "x", from: 912, to: 948, pivot: PROP_PIVOT, live: "blades", own: true, hatch: ["alu", 135], warp: bladeWarp }),
    ], { hatch: "solid", explode: [1600, 0, 0], anchor: { cut: [944, T0 + 40, 0], out: { c: [-M.SPINNER.tip - 60, T0, 0], r: 120, axis: "x" } } }),
    // ---- cabin: the panel and its six instruments, the wheel, the seats
    S.part(18, "INSTRUMENT PANEL", [
      S.extrude(xy([[300, 1250], [332, 1250], [332, 1752], [470, 1768], [470, 1786], [300, 1786]]), { along: "z", from: -(C.half - 30), to: C.half - 30 }),
      S.box([-344, 1290, -120], [-332.5, 1690, 120], { own: true, hatch: "none" }),
      ...SIX.map(([name, draw, z, y]) => S.disc([-332.6, y, z], 44, { normal: "x", role: "decal", texture: draw, pivot: [-332.6, y, z], live: name, own: true })),
    ], { mat: "alu", angle: 135, pivot: PANEL_PIVOT, explode: [0, 0, 1000], anchor: { cut: [-316, 1350, 0], out: { c: [-316, 1350, -300], r: 0 } } }),
    S.part(10, "CONTROL WHEEL AND CABLES", [
      S.cylinder({ axis: "x", at: [1483, -370], r: 15, from: -560, to: -333 }),
      S.extrude(yokeShape(-370, 1483), { along: "x", from: -594, to: -560, own: true }),
      S.extrude(xy(cableBand()), { along: "z", from: -46, to: -40, own: true, explode: [0, 0, -1300] }), // the cable run stays in the fuselage
    ], { hatch: "none", explode: [0, 0, 1300], anchor: { cut: [-577, 1560, -485], out: { c: [-577, 1560, -485], r: 0 } } }),
    S.part(20, "SEATS", [
      S.extrude(xy(seatOutline()), { along: "z", from: -490, to: -150, bevel: 12 }),
      S.extrude(xy(benchOutline()), { along: "z", from: -(C.half - 40), to: C.half - 40, bevel: 12, own: true }),
    ], { mat: "foam", explode: [0, 0, 1100], anchor: { cut: [-2160, 980, 0], out: { c: [-1250, 1060, -335], r: 0 } } }),
    // ---- wing: the port inner panel open (skins, spar, ribs), the rest closed; all lofted by wingWarp
    S.part(2, "WING", [
      S.extrude(root(P.foilPart(0, M.HINGE_X)), { along: "z", from: -P.PEEL.ws0, to: 40, holes: [root(bay(0.016, M.HINGE_X - d))], warp: wingWarp }),
      S.extrude(root(shellA()), { along: "z", from: -M.BREAK_WS, to: -P.PEEL.ws0, warp: wingWarp }),
      S.extrude(root(sparI()), { along: "z", from: -M.BREAK_WS, to: 40, own: true, ...STEPS, warp: wingWarp }),
      ...[900, 1820, 2450].map((ws) => S.extrude(root(bay(RIB_A, RIB_B)), { along: "z", from: -(ws + 8), to: -(ws - 8), holes: ribHoles(), own: true, hatch: "none", warp: wingWarp })),
      S.extrude(root(P.foilPart(0, M.HINGE_X)), { along: "z", from: -M.TIP_WS, to: -M.BREAK_WS, own: true, warp: wingWarp }),
      S.extrude(root(P.foilPart(0, M.HINGE_X)), { along: "z", from: 40, to: M.BREAK_WS, own: true, warp: wingWarp }),
      S.extrude(root(P.foilPart(0, M.HINGE_X)), { along: "z", from: M.BREAK_WS, to: M.TIP_WS, own: true, warp: wingWarp }),
      // the root fairing behind the hinge, between the flaps across the cabin
      S.extrude(root(P.SURF), { along: "z", from: -(M.FLAP_WS[0] - 12), to: M.FLAP_WS[0] - 12, own: true, hatch: ["alu", 135], warp: wingWarp }),
    ], { hatch: "solid", explode: [0, 1100, 0], anchor: { cut: wingAt(SPAR.a + 0.01, up(SPAR.a + 0.01) - d, 1500), out: { c: wingAt(SPAR.a + 0.01, up(SPAR.a + 0.01), 1500), r: 0 } } }),
    S.part(9, "FUEL TANK", [S.extrude(root(bay(RIB_A + 0.004, RIB_B - 0.006, 0.005)), { along: "z", from: -1805, to: -915, bevel: 0, warp: wingWarp })], {
      mat: "alu", angle: 135, explode: [0, 1900, 0], anchor: { cut: wingAt(0.47, up(0.47) - d - 0.006, 1360), out: { c: wingAt(0.47, up(0.47) - d - 0.006, 1360), r: 0 } },
    }),
    S.part(14, "FLAP", [
      S.extrude(root(P.SURF), { along: "z", from: -M.FLAP_WS[1], to: -M.FLAP_WS[0], pivot: [...FLAP_PIVOT, 0], live: "port" }),
      S.extrude(root(P.SURF), { along: "z", from: M.FLAP_WS[0], to: M.FLAP_WS[1], pivot: [...FLAP_PIVOT, 0], live: "stbd" }),
    ], { mat: "alu", angle: 45, explode: [-500, 1100, 0], anchor: { cut: [...root([[0.86, up(0.86)]])[0], -2000], out: { c: [...root([[0.86, up(0.86)]])[0], -2000], r: 0 }, solid: 0 } }),
    S.part(11, "AILERON", [
      S.extrude(root(P.SURF), { along: "z", from: -M.AILERON_WS[1], to: -M.AILERON_WS[0], pivot: [...AIL_PIVOT, 0], live: "port" }),
      S.extrude(root(P.SURF), { along: "z", from: M.AILERON_WS[0], to: M.AILERON_WS[1], pivot: [...AIL_PIVOT, 0], live: "stbd" }),
    ], { mat: "alu", angle: 135, explode: [-500, 1100, 0], anchor: { cut: [...root([[0.86, up(0.86)]])[0], -4600], out: { c: [...root([[0.86, up(0.86)]])[0], -4600], r: 0 }, solid: 0 } }),
    S.part(3, "WING STRUT", [-1, 1].map((s) => strut(s)), { hatch: "none", explode: [0, 600, 0], anchor: { cut: strutAt(0.4), out: { c: strutAt(0.4), r: 0 } } }),
    S.part(17, "PITOT HEAD", [
      S.cylinder({ axis: "x", at: [pitotWL, -PIT.ws], r: 12, from: -1100, to: -560 }),
      S.box([-1035, pitotWL + 11, -PIT.ws - 9], [-1005, wingLowAtFs(PIT.ws, 1020, 18) - 2, -PIT.ws + 9], { own: true }),
    ], { hatch: "none", explode: [0, 700, 0], anchor: { cut: [-700, pitotWL, -PIT.ws], out: { c: [-700, pitotWL, -PIT.ws], r: 0 } } }),
    // ---- tail
    S.part(4, "FIN AND TAILPLANE", [
      // the fin as a skin over a spar and a rib, like the wing: the cut opens it on its chord plane
      S.extrude(xy(finPlan()), { along: "y", from: FIN_Y[0], to: FIN_Y[1], holes: [xy(finHole(FIN_ROOT.le + 40, M.RUDDER_HINGE_FS - 25))], ...STEPS, hatch: "solid", warp: finWarp }),
      S.extrude(xy(finSpar(5760)), { along: "y", from: FIN_Y[0], to: FIN_Y[1], ...STEPS, hatch: "solid", own: true, warp: finWarp }),
      S.extrude(xy(finHole(FIN_ROOT.le + 40.5, M.RUDDER_HINGE_FS - 25.5, 0.5)), { along: "y", from: 2300, to: 2316, hatch: "solid", own: true, warp: finWarp }),
      S.extrude(xy(P.STAB_SEC), { along: "z", from: -TP.span / 2, to: TP.span / 2, own: true, ...STEPS, warp: stabWarp }),
    ], { mat: "alu", angle: 45, explode: [-1000, 0, 0], anchor: { cut: [-5900, 2100, 0], out: { c: [-5900, 2100, 0], r: 40, axis: "z" } } }),
    S.part(12, "ELEVATOR", [
      S.extrude(xy(P.ELEV_SEC), { along: "z", from: -TP.span / 2, to: -720, warp: elevWarp }),
      S.extrude(xy(elevSec(0, 7096)), { along: "z", from: -720, to: -250, warp: elevWarp }),
      S.extrude(xy(elevSec(7104, 9999)), { along: "z", from: -700, to: -270, own: true, pivot: [-7104, TP.wl, 0], live: "tab", warp: elevWarp }),
      S.extrude(xy(P.ELEV_SEC), { along: "z", from: 250, to: TP.span / 2, warp: elevWarp }),
    ], { mat: "alu", angle: 135, pivot: ELEV_PIVOT, explode: [-1500, 0, 0], anchor: { cut: [-6960, TP.wl + 10, -1450], out: { c: [-6960, TP.wl + 10, -1450], r: 0 } } }),
    S.part(13, "RUDDER", [S.extrude(xy(rudderPlan()), { along: "y", from: 1560, to: M.FIN_TOP, holes: [xy(finHole(M.RUDDER_HINGE_FS + 25, 7050))], ...STEPS, warp: rudderWarp })], {
      mat: "alu", angle: 135, pivot: RUDDER_PIVOT, explode: [-1400, 400, 0], anchor: { cut: [-6900, 2300, 0], out: { c: [-6900, 2300, 0], r: 30, axis: "z" } },
    }),
    // ---- landing gear
    // the legs plug into a steel box across the belly under the cabin floor: the cut opens it
    S.part(15, "MAIN GEAR", [leg(-1), mainWheel(-1), leg(1), mainWheel(1), S.box([-(g.fs + 35), 760, -420], [-(g.fs - 35), 862, 420], { own: true, hatch: ["steel", 45] })], {
      hatch: "none", explode: [0, -500, 0], anchor: { cut: [-g.fs, 811, 0], out: { c: [-g.fs, g.tyreD / 2, -g.track / 2], r: g.tyreD / 2, axis: "z" } },
    }),
    S.part(16, "NOSE GEAR", [
      S.lathe([[0, 332], [28, 332], [28, 470], [42, 470], [42, cowlBotAtNose - 0.6], [0, cowlBotAtNose - 0.6]], { axis: "y", at: [-n.fs, 0] }),
      S.extrude([[-95, 170], [-95, 332], [95, 332], [95, 170], [76, 170], [76, 312], [-76, 312], [-76, 170]], { along: "x", from: -(n.fs + 40), to: -(n.fs - 40), own: true }),
      noseWheel,
    ], { hatch: "none", explode: [0, -600, 0], anchor: { cut: [-n.fs, 600, 0], out: { c: [-n.fs, 600, 0], r: 42, axis: "y" } } }),
  ];
}

function cylinderProfile(s) {
  // a finned barrel and head on its axis along z, from the crankcase face outward (s: −1 port, +1 stbd)
  const pts = [[0, 180], [72, 180], [72, 192], [60, 192]];
  for (let k = 0; k < 5; k++) {
    const z = 200 + k * 24;
    pts.push([60, z], [80, z + 3], [80, z + 11], [60, z + 14]);
  }
  pts.push([64, 322], [84, 325], [84, 335], [64, 340], [84, 345], [84, 355], [66, 360], [74, 366], [74, 400], [56, 418], [0, 418]);
  return pts.map(([r, z]) => [r, s * z]);
}
function mountTruss() {
  return [[0, 1000], [150, 1140], [150, 1410], [0, 1620]];
}
function mountHoles() {
  // the truss's two triangles, inset by the tube
  const tri = (a, b, c, t = 22) => {
    const ctr = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
    const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    const per = Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1]) + Math.hypot(a[0] - c[0], a[1] - c[1]);
    const k = 1 - t / ((2 * area) / per);
    return [a, b, c].map((p) => [ctr[0] + (p[0] - ctr[0]) * k, ctr[1] + (p[1] - ctr[1]) * k]);
  };
  const [A, B, Cc, D] = mountTruss();
  return [tri(A, B, D), tri(B, Cc, D)];
}
function spinnerLoop() {
  // a thin shell and its back plate, on the shaft axis (r, x): outside from the tip to the rim, the back
  // plate's two faces, then the inside of the shell back to the tip
  return [[0, 1060], [70, 1046], [118, 1010], [150, 966], [166, 924], [170, 896], [60, 896], [60, 904], [162, 904], [158, 924], [142, 962], [112, 1002], [66, 1037], [0, 1050]];
}
function seatOutline() {
  // a front seat seen from the side (FS, WL): rails, cushion, back, rounded by the extrude's bevel
  return [[1030, 908], [1440, 908], [1450, 1000], [1470, 1060], [1530, 1095], [1600, 1720], [1590, 1760], [1535, 1765], [1440, 1150], [1400, 1112], [1040, 1112], [1010, 1060], [1010, 1000]];
}
function benchOutline() {
  return [[1960, 908], [2370, 908], [2375, 1030], [2425, 1680], [2405, 1712], [2350, 1712], [2290, 1068], [2250, 1060], [1975, 1060], [1960, 1030]];
}
function yokeShape(z0, y0) {
  return [[z0 - 130, y0 + 150], [z0 - 130, y0 - 40], [z0 - 100, y0 - 80], [z0 + 100, y0 - 80], [z0 + 130, y0 - 40], [z0 + 130, y0 + 150], [z0 + 100, y0 + 150], [z0 + 100, y0 - 30], [z0 + 80, y0 - 50], [z0 - 80, y0 - 50], [z0 - 100, y0 - 30], [z0 - 100, y0 + 150]];
}
function cableBand() {
  // the elevator cable run: under the cabin floor, then rising through the tail cone to the bellcrank
  const a = [600, 845];
  const b = [C.fs1, 845];
  const c = [6350, 1330];
  return [a, b, c, [c[0], c[1] + 8], [b[0] - 4, b[1] + 8], [a[0], a[1] + 8]];
}
// the fin and rudder's root section in plan (FS, BL): the sheet's 11 % symmetric section, cut at the
// hinge line (fin ahead, rudder behind), each half closed by a straight face on its side of the gap
function finSection(f0, f1, n = 14) {
  const c = FIN_ROOT.te - FIN_ROOT.le;
  const yt = (x) => c * 5 * 0.11 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4);
  const x0 = (f0 - FIN_ROOT.le) / c;
  const x1 = (f1 - FIN_ROOT.le) / c;
  const top = Array.from({ length: n + 1 }, (_, i) => {
    const x = x0 + (x1 - x0) * (0.5 - 0.5 * Math.cos((Math.PI * i) / n));
    return [FIN_ROOT.le + c * x, Math.max(yt(x), 2)];
  });
  const bot = top.slice().reverse().map(([f, b]) => [f, -b]);
  if (x0 === 0) bot.pop();
  return [...top, ...bot];
}
const finPlan = () => finSection(FIN_ROOT.le, M.RUDDER_HINGE_FS - 10, 16);
// the inside of the fin or rudder skin (15 mm) between two stations, inset `pad` more
function finHole(f0, f1, pad = 0) {
  const c = FIN_ROOT.te - FIN_ROOT.le;
  const yt = (f) => {
    const x = (f - FIN_ROOT.le) / c;
    return c * 5 * 0.11 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4);
  };
  const top = Array.from({ length: 13 }, (_, i) => {
    const f = f0 + ((f1 - f0) * i) / 12;
    return [f, Math.max(4, yt(f) - 15 - pad)];
  });
  return [...top, ...top.slice().reverse().map(([f, b]) => [f, -b])];
}
// a fin spar web at FS f, 14 mm, from skin to skin
function finSpar(f) {
  const c = FIN_ROOT.te - FIN_ROOT.le;
  const x = (f - FIN_ROOT.le) / c;
  const b = c * 5 * 0.11 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4) - 14.5;
  return [[f, -b], [f + 14, -b], [f + 14, b], [f, b]];
}
const rudderPlan = () => finSection(M.RUDDER_HINGE_FS + 10, FIN_ROOT.te, 10);

// ---------------------------------------------------------------- scale to scene units
const sc = (v) => v * UNIT;
const sp = (p) => p.map(sc);
const sl = (loop) => loop.map(sp);
function scaleSolid(s) {
  const o = { ...s };
  if (o.kind === "lathe") Object.assign(o, { loop: sl(o.loop), at: sp(o.at) });
  if (o.kind === "extrude") Object.assign(o, { shape: sl(o.shape), holes: (o.holes ?? []).map(sl), from: sc(o.from), to: sc(o.to), bevel: sc(o.bevel ?? 0), conform: o.conform ? { x: sc(o.conform.x), r: sc(o.conform.r) } : null });
  if (o.kind === "box") Object.assign(o, { min: sp(o.min), max: sp(o.max) });
  if (o.kind === "sphere") Object.assign(o, { c: sp(o.c), r: sc(o.r) });
  if (o.kind === "torus") Object.assign(o, { c: sp(o.c), R: sc(o.R), r: sc(o.r) });
  if (o.kind === "helix") Object.assign(o, { at: sp(o.at), from: sc(o.from), to: sc(o.to), radius: sc(o.radius), wire: sc(o.wire) });
  if (o.kind === "disc") Object.assign(o, { c: sp(o.c), r: sc(o.r) });
  if (o.pivot) o.pivot = sp(o.pivot);
  if (Array.isArray(o.explode)) o.explode = sp(o.explode);
  if (o.stretch) o.stretch = { from: sc(o.stretch.from) };
  // the warps here take and give [x, y, z] in mm; the kit's takes (x, y, z) and gives [x, y, z] in scene units
  if (s.warp) o.warp = (x, y, z) => sp(s.warp([x / UNIT, y / UNIT, z / UNIT]));
  return o;
}
function scalePart(p) {
  const a = p.anchor;
  return {
    ...p,
    pivot: p.pivot ? sp(p.pivot) : p.pivot,
    explode: Array.isArray(p.explode) ? sp(p.explode) : p.explode?.to ? { to: sp(p.explode.to) } : p.explode,
    anchor: a ? { ...a, cut: a.cut ? sp(a.cut) : a.cut, out: a.out ? { ...a.out, c: sp(a.out.c), r: sc(a.out.r ?? 0) } : a.out } : a,
    solids: p.solids.map(scaleSolid),
  };
}
export const parts = () => partsMM().map(scalePart);
export const centres = () => [
  [sp([-(M.SPINNER.tip - 150), T0, 0]), sp([150, T0, 0])],
  [sp([-2400, AX, 0]), sp([-(CT.fs1 + 200), AX, 0])],
];
export const scene = () => ({ parts: parts(), fluids: [], centres: centres() });
export const s3 = sp;
