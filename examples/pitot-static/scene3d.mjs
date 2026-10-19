// The pitot-static system's 3D view (pitot-static-3d.html), built with kit/solid3d.mjs from the sheet's
// own numbers (model.mjs) and profiles (parts.mjs). Pure data.
//
// The parts are laid out side by side on one board, each on its own section, not in their installed
// places (NTS): the three instruments stacked behind a strip of the panel (ASI over altimeter over VSI,
// x along each axis from the case's back to the panel, y up, z = −the pilot's right, so the cut keeps
// the pilot's right half where the movement's arm, link and sector tail are); the pitot head above
// them on its vertical mid-plane; a slice of the tail cone (its radius drawn 150 mm, NTS) with the two
// ports and the cross-over tee, lying in the board's plane as section C-C does; the drain traps at the
// lines' low points; the alternate static valve with its knob through the panel. Lines are bent tubes
// on z = 0 (warped lathes), the air in them thin sheets on the plane.
// NTS simplifications (the sheet is the authority): the instruments' glasses, dial plates, front
// bridges, pillars, the ALT and VSI hairsprings and the links are left out; each rocking shaft is the
// boss of its crank; the traps are round; the head's pressure tube runs straight to its elbow.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

export const IY = { asi: 420, alt: 300, vsi: 180 };
export const XP = -560; // the pitot head's tip
export const YP = 560; // and its axis
export const RING = { x: -330, y: 170, r: 150, t: 1.6 };
export const TRAPS = { p: [-45, 373], s: [-160, 27] };
export const VX = 56; // the valve's body starts here (its panel face meets the panel at x 104)
export const VY = 100;
const rad = Math.PI / 180;

// ---------------------------------------------------------------- bent tubes along a polyline on z = 0
function fillet(pts, r = 10) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    const la = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const k = Math.min(r, la / 2, lc / 2);
    const p0 = [b[0] + ((a[0] - b[0]) * k) / la, b[1] + ((a[1] - b[1]) * k) / la];
    const p2 = [b[0] + ((c[0] - b[0]) * k) / lc, b[1] + ((c[1] - b[1]) * k) / lc];
    for (let j = 0; j <= 3; j++) {
      const t = j / 3;
      out.push([(1 - t) ** 2 * p0[0] + 2 * t * (1 - t) * b[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * t * (1 - t) * b[1] + t * t * p2[1]]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function arcTable(pts) {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return s;
}
// a tube of radii ro/ri bent along pts (x, y): a lathe along x, warped onto the path
export function bentTube(path, ro, ri, o = {}) {
  const pts = fillet(path);
  const s = arcTable(pts);
  const L = s[s.length - 1];
  const at = (x) => {
    let i = 1;
    while (i < s.length - 1 && s[i] < x) i++;
    const t = Math.min(1, Math.max(0, (x - s[i - 1]) / Math.max(1e-9, s[i] - s[i - 1])));
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], n: [-(b[1] - a[1]) / len, (b[0] - a[0]) / len] };
  };
  const loop = [...s.map((x) => [ro, x]), ...s.slice().reverse().map((x) => [ri, x])];
  void L;
  return { ...S.lathe(loop, { axis: "x", at: [0, 0], segments: 10 }), smooth: false, warp: (x, y, z) => { const f = at(x); return [f.p[0] + f.n[0] * y, f.p[1] + f.n[1] * y, z]; }, ...o };
}
// the air in a line: a thin sheet on the plane, the bore's width
export const lineSheet = (path, ri) => S.extrude(P.boreOf(fillet(path), ri - 0.05), { along: "z", from: -0.8, to: -0.05 });

// ---------------------------------------------------------------- the routes on the board
const ROD = M.LINE.od / 2;
const RID = M.LINE_ID / 2;
const TL = P.TR.w + P.TR_STUB; // a trap's stub ends, either side of its axis
export const PATHS = {
  pitotA: [[XP + 460, YP + P.HD.top + 10], [XP + 460, YP + 112], [-75, YP + 112], [-75, TRAPS.p[1] + 7], [TRAPS.p[0] - TL, TRAPS.p[1] + 7]],
  pitotB: [[TRAPS.p[0] + TL, TRAPS.p[1] + 7], [-18, TRAPS.p[1] + 7], [-18, IY.asi], [-10, IY.asi]],
  portL: [[RING.x - RING.r + 21, RING.y], [RING.x - RING.r + 26, RING.y - 70], [RING.x - 70, 40], [RING.x - 22, 34]],
  portR: [[RING.x + RING.r - 21, RING.y], [RING.x + RING.r - 26, RING.y - 70], [RING.x + 70, 40], [RING.x + 22, 34]],
  static0: [[RING.x + 22, 34], [TRAPS.s[0] - TL, 34]],
  static1: [[TRAPS.s[0] + TL, 34], [VX + P.AV.A, 34], [VX + P.AV.A, VY - P.AV.R - 14]],
  manifold: [[VX + P.AV.B, VY + P.AV.R + 14], [VX + P.AV.B, 130], [-30, 130], [-30, IY.vsi], [-10, IY.vsi]],
  toAlt: [[-30, IY.vsi + 4], [-30, IY.alt], [-10, IY.alt]],
  toAsi: [[-30, IY.alt + 4], [-30, IY.asi - 24], [-10, IY.asi - 24]],
};

// ---------------------------------------------------------------- instruments
const IC = P.IC;
const CASE = [[2.2, -10], [6.4, -10], [6.4, -4], [3.5, -4], [3.5, 0], [IC.Ro, 0], [IC.Ro, 97], [IC.flange[2], 100], [IC.flange[2], 104], [IC.Ri, 104], [IC.Ri, 3], [2.2, 3]];
const xLathe = (loop, y, o = {}) => S.lathe(loop, { axis: "x", at: [y, 0], segments: 48, ...o });
// a capsule's sheet (front or rear) as a thin lathe, touching the axis
export function capSheet(x0, gap, R, dl, front) {
  const { front: f, rear: r } = P.capsulePts(x0, gap, R, dl, { n: 16 });
  const pts = front ? f : r;
  const t = front ? 0.3 : -0.3;
  const a = pts.map(([x, rr]) => [rr, x]);
  const b = pts.map(([x, rr]) => [rr, x + t]).reverse();
  return front ? [...b, ...a] : [...a, ...b];
}
function movement(id, kind, y, { piv, rs, pinR, armZ, l1, t0, pointers, extra = [] }) {
  const xr = P.PLATES.rock;
  // the crank about the rocking shaft (its boss), authored at rest, and arm 2 beyond the plane
  const th = t0 * rad;
  const pin = [xr - l1 * Math.cos(th), y - l1 * Math.sin(th)];
  const crank = [...P.strip([[xr, y], pin], 0.7), ...[]];
  const arc = P.gearPts(piv, rs, Math.round((12 * rs) / pinR), 0, { arc: [72, 108] });
  const loc = [...arc, [piv[0] - 3, piv[1] - 2.2], [piv[0] + 3, piv[1] - 2.2], [armZ, piv[1] - 1], [armZ, piv[1] + 1]];
  const sect = loc.map(([u, v]) => [-u, y + v]);
  return [
    xLathe([[0, P.PLATES.rear[0]], [34, P.PLATES.rear[0]], [34, P.PLATES.rear[1]], [0, P.PLATES.rear[1]]], y, { own: true, hatch: "solid", live: "plate" }),
    { ...S.cylinder({ axis: "x", at: [y, 0], r: 0.8, from: 30, to: pin[0] - 0.7 }), own: true, hatch: "none", live: "rod" },
    { ...S.extrude(crank, { along: "z", from: -0.6, to: 0.6 }), own: true, hatch: "solid", pivot: [xr, y, 0], live: "crank" },
    { ...S.extrude([...P.strip([[xr, y], [xr + 12, y]], 0.7)], { along: "z", from: -(armZ + 0.6), to: -(armZ - 0.6) }), own: true, hatch: "solid", pivot: [xr, y, 0], live: "arm" },
    { ...S.extrude(sect, { along: "x", from: P.PLATES.sector[0], to: P.PLATES.sector[1] }), own: true, hatch: "solid", pivot: [70, y + piv[1], -piv[0]], live: "sector" },
    { ...S.gear({ teeth: 12, module: (2 * pinR) / 12, along: "x", at: [0, y], from: P.PLATES.pinion[0], to: IC.ptr[0] - 0.2 }), own: true, hatch: "none", pivot: [70, y, 0], live: "pinion" },
    ...pointers,
    ...extra,
  ];
}
const blade = (y, L, w, x0, name) => ({ ...S.extrude([[-w, y - 6], [w, y - 6], [w * 0.5, y + L], [-w * 0.5, y + L]], { along: "x", from: x0, to: x0 + 0.6 }), role: "ink", own: true, pivot: [x0, y, 0], live: name });
function dialTexture(kind) {
  return (g, size, tk) => {
    const s = size / 2 / 38;
    g.translate(size / 2, size / 2);
    g.strokeStyle = g.fillStyle = tk.ink;
    // seen from +x the pilot's right is −z: the canvas is drawn as the pilot sees it, mirrored by the disc
    const at = (r, cw) => [r * s * Math.sin(cw * rad), -r * s * Math.cos(cw * rad)];
    const tick = (cw, r0, r1, w) => {
      g.lineWidth = w * s;
      g.beginPath();
      g.moveTo(...at(r0, cw));
      g.lineTo(...at(r1, cw));
      g.stroke();
    };
    const txt = (t, r, cw, px = 5) => {
      g.font = `600 ${px * s}px ui-monospace, Consolas, monospace`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(t, ...at(r, cw));
    };
    g.lineWidth = 0.8 * s;
    g.beginPath();
    g.arc(0, 0, 37 * s, 0, 2 * Math.PI);
    g.stroke();
    if (kind === "asi") {
      for (let v = 30; v <= 170; v += 5) tick(M.asiDeg(v), v % 10 ? 32 : 30.4, 34.2, v % 10 ? 0.35 : 0.7);
      for (let v = 40; v <= 160; v += 20) txt(String(v), 24.5, M.asiDeg(v));
      g.lineWidth = 2 * s;
      g.beginPath();
      for (let v = M.VS1; v <= M.V_SPEEDS.vno; v += 1) g.lineTo(...at(35.6, M.asiDeg(v)));
      g.stroke();
      txt("KNOTS", 12, 180, 4);
    } else if (kind === "alt") {
      for (let i = 0; i < 50; i++) tick(i * 7.2, i % 5 ? 32.4 : 30.2, 34.6, i % 5 ? 0.35 : 0.7);
      for (let n = 0; n < 10; n++) txt(String(n), 25, n * 36);
      txt("1013", 22, 90, 3.6);
    } else {
      for (let f = -2000; f <= 2000; f += 100) tick(270 + M.vsiDeg(f), f % 500 ? 32.4 : 30.2, 34.6, f % 500 ? 0.35 : 0.7);
      for (const f of [-2000, -1000, 0, 1000, 2000]) txt(String(Math.abs(f / 1000)), 25, 270 + M.vsiDeg(f));
      txt("UP", 14, 300, 4);
      txt("DOWN", 14, 240, 4);
    }
  };
}
const decal = (kind, y) => S.disc([IC.dial[1], y, 0], 37.5, { normal: "x", role: "decal", texture: dialTexture(kind), own: true });

export function parts() {
  const out = [];
  const A0 = P.INSTR.asi.cap;
  const L0 = P.INSTR.alt.cap;
  const W0 = P.INSTR.vsi.cap;
  const ya = IY.asi;
  const yl = IY.alt;
  const yv = IY.vsi;
  // ================================================================ the airspeed indicator
  out.push(S.part(12, "ASI CASE AND DIAL", [xLathe(CASE, ya), decal("asi", ya),
    xLathe([[RID - 0.4, -10], [6.4, -10], [6.4, -4], [3.5, -4], [3.5, 3], [RID - 0.4, 3]], ya - 24, { own: true, hatch: ["brass", 135] }),
    S.bore(S.cylinder({ axis: "x", at: [ya - 24, 0], r: 1.8, from: 0, to: 3 }))],
  { mat: "alu", angle: 45, explode: [-60, 0, 0], anchor: { cut: [50, ya + 39.1, 0], out: { c: [50, ya, 0], r: IC.Ro, axis: "x" } } }));
  out.push(S.part(13, "ASI CAPSULE", [xLathe(capSheet(A0.x0, A0.gap, A0.R, 0, true), ya, { live: "cf" }), xLathe(capSheet(A0.x0, A0.gap, A0.R, 0, false), ya, { live: "cr" })],
    { hatch: "solid", explode: [-30, 0, 0], anchor: { cut: [A0.x0, ya + A0.R, 0], out: { c: [A0.x0, ya, 0], r: A0.R, axis: "x" } } }));
  const asiMov = movement(14, "asi", ya, { piv: P.PIV, rs: 19.6, pinR: 1.9, armZ: 12, l1: 12, t0: 0, pointers: [blade(ya, 30, 1.3, IC.ptr[0], "ptr")] });
  out.push(S.part(14, "ROCKING SHAFT, CRANKS, PUSH ROD", [asiMov[0], asiMov[1], asiMov[2], asiMov[3]], { hatch: "solid", explode: [0, 0, 0], anchor: { cut: [45, ya, 0], out: { c: [45, ya, 0], r: 0 } } }));
  out.push(S.part(15, "ASI SECTOR", [asiMov[4]], { hatch: "solid", explode: [20, 0, -30], anchor: { cut: [70, ya - 12, 0], out: { c: [70, ya - 12, 0], r: 0 } } }));
  out.push(S.part(16, "PINION ARBOR AND POINTER", [asiMov[5], asiMov[6]], { hatch: "none", explode: [40, 0, 0], anchor: { cut: [80, ya, 0], out: { c: [80, ya, 0], r: 0 } } }));
  const spiral = [];
  for (let i = 0; i <= 90; i++) {
    const t = i / 90;
    const r = 2.3 + 6.1 * t;
    const a = (20 + 360 * 6 * (t - 1)) * rad;
    spiral.push([-r * Math.cos(a), ya + r * Math.sin(a)]);
  }
  out.push(S.part(17, "HAIRSPRING", [S.extrude(P.strip(spiral, 0.18), { along: "x", from: P.PLATES.hair - 0.3, to: P.PLATES.hair + 0.3 })], { hatch: "solid", explode: [60, 0, 0], anchor: { cut: [P.PLATES.hair, ya + 5, 0], out: { c: [P.PLATES.hair, ya, 0], r: 8, axis: "x" } } }));
  // ================================================================ the altimeter
  const half = 0;
  const x2 = L0.x0 + 2 * L0.gap + 1 + half + L0.gap;
  out.push(S.part(18, "ALTIMETER CASE AND DIAL", [xLathe(CASE, yl), decal("alt", yl)], { mat: "alu", angle: 45, explode: [-60, 0, 0], anchor: { cut: [50, yl + 39.1, 0], out: { c: [50, yl, 0], r: IC.Ro, axis: "x" } } }));
  out.push(S.part(19, "ANEROID CAPSULE STACK", [
    xLathe(capSheet(L0.x0, L0.gap, L0.R, 0, false), yl), xLathe(capSheet(L0.x0, L0.gap, L0.R, 0, true), yl, { live: "c1" }),
    xLathe(capSheet(x2, L0.gap, L0.R, 0, false), yl, { live: "c2r" }), xLathe(capSheet(x2, L0.gap, L0.R, 0, true), yl, { live: "c2" }),
  ], { hatch: "solid", explode: [-30, 0, 0], anchor: { cut: [L0.x0, yl + L0.R, 0], out: { c: [L0.x0, yl, 0], r: L0.R, axis: "x" } } }));
  const w1 = P.ALT_W1;
  const altMov = movement(20, "alt", yl, { piv: P.ALT_PIV, rs: 18, pinR: 1.6, armZ: P.ALT_PIV[0] + 12, l1: 5, t0: -50, pointers: [] });
  out.push(S.part(20, "ALTIMETER MOVEMENT", [altMov[0], altMov[1], altMov[2], altMov[3], altMov[4],
    { ...S.gear({ teeth: 60, module: 25 / 60, along: "x", at: [-w1[0], yl + w1[1]], from: 72.2, to: 72.8 }), own: true, hatch: "solid", pivot: [72, yl + w1[1], -w1[0]], live: "wheel" },
    { ...S.gear({ teeth: 10, module: 0.25, along: "x", at: [0, yl], from: 66, to: IC.ptr[0] - 0.2 }), own: true, hatch: "none", pivot: [70, yl, 0], live: "pinion" },
  ], { hatch: "solid", explode: [20, 0, -30], anchor: { cut: [45, yl, 0], out: { c: [45, yl, 0], r: 0 } } }));
  out.push(S.part(21, "POINTERS", [blade(yl, 31, 1.1, IC.ptr[0] + 0.8, "long"), blade(yl, 18, 1.8, IC.ptr[0], "short")], { hatch: "none", explode: [40, 0, 0], anchor: { cut: [IC.ptr[0], yl + 10, 0], out: { c: [IC.ptr[0], yl, 0], r: 0 } } }));
  out.push(S.part(22, "BARO KNOB", [S.cylinder({ axis: "x", at: [yl + P.KNOB[1], -P.KNOB[0]], r: 7, from: IC.panel[1] + 2, to: IC.panel[1] + 12 }), S.cylinder({ axis: "x", at: [yl + P.KNOB[1], -P.KNOB[0]], r: 2.5, from: 96, to: IC.panel[1] + 2, own: true })],
    { mat: "plastic", angle: 45, explode: [50, 0, 0], anchor: { cut: [IC.panel[1] + 7, yl - 30, 30], out: { c: [IC.panel[1] + 12, yl - 30, 30], r: 0 } } }));
  // ================================================================ the VSI
  out.push(S.part(23, "VSI CASE AND DIAL", [xLathe(CASE, yv), decal("vsi", yv)], { mat: "alu", angle: 45, explode: [-60, 0, 0], anchor: { cut: [50, yv + 39.1, 0], out: { c: [50, yv, 0], r: IC.Ro, axis: "x" } } }));
  out.push(S.part(24, "VSI CAPSULE", [xLathe(capSheet(W0.x0, W0.gap, W0.R, 0, true), yv, { live: "cf" }), xLathe(capSheet(W0.x0, W0.gap, W0.R, 0, false), yv)],
    { hatch: "solid", explode: [-30, 0, 0], anchor: { cut: [W0.x0, yv + W0.R, 0], out: { c: [W0.x0, yv, 0], r: W0.R, axis: "x" } } }));
  out.push(S.part(25, "METERING UNIT", [S.box([IC.back, yv + P.MU.y[0], -6], [P.MU.x[1], yv + P.MU.y[1], 6])], { mat: "brass", angle: 135, explode: [-20, -20, 0], anchor: { cut: [8, yv - 26, 0], out: { c: [8, yv - 24, 6], r: 0 } } }));
  const vsiMov = movement(26, "vsi", yv, { piv: P.PIV, rs: 19.6, pinR: 1.9, armZ: 12, l1: 12, t0: -30, pointers: [blade(yv, 30, 1.3, IC.ptr[0], "ptr")] });
  out.push(S.part(26, "VSI MOVEMENT AND POINTER", vsiMov, { hatch: "solid", explode: [20, 0, -30], anchor: { cut: [70, yv - 12, 0], out: { c: [70, yv - 12, 0], r: 0 } } }));
  // ================================================================ the panel strip
  const holes = [S.circle(0, ya, 40.6, 64), S.circle(0, yl, 40.6, 64), S.circle(0, yv, 40.6, 64), S.circle(-(-P.KNOB[0]), yl + P.KNOB[1], 2.6, 16), S.circle(0, VY, 3.1, 16)];
  out.push(S.part(11, "INSTRUMENT PANEL (STRIP)", [S.extrude(K.rect(-60, 60, 60, 470), { along: "x", from: IC.panel[0], to: IC.panel[1], holes })], { mat: "alu", angle: 135, explode: [110, 0, 0], anchor: { cut: [105.5, 465, 0], out: { c: [107, 465, -40], r: 0 } } }));
  // ================================================================ the pitot head
  const hl = (loop, y) => S.lathe(loop.map(([r, s]) => [r, s + XP]), { axis: "x", at: [y, 0], segments: 40 });
  out.push(S.part(1, "PITOT HEAD", [hl(P.HEAD_LOOP, YP), S.bore(S.cylinder({ axis: "y", at: [XP + P.HD.drainX, 0], r: 0.4, from: YP - 12.1, to: YP - 6.9 }))],
    { mat: "brass", angle: 45, explode: [-40, 0, 0], anchor: { cut: [XP + 80, YP + 10.5, 0], out: { c: [XP + 80, YP, 0], r: 12, axis: "x" } } }));
  out.push(S.part(2, "HEATER", [S.helix({ axis: "x", at: [YP, 0], from: XP + P.HD.coil[0], to: XP + P.HD.coil[1], radius: P.HD.bore - 0.85, wire: 1.5, turns: P.HD.coil[2], segments: 24 })], { hatch: "solid", explode: [0, -40, 0], anchor: { cut: [XP + 70, YP + 8.1, 0], out: { c: [XP + 70, YP, 0], r: 9, axis: "x" } } }));
  out.push(S.part(3, "DAM AND PRESSURE TUBE", [
    S.extrude(S.circle(0, YP, P.HD.bore - 0.05, 48), { along: "x", from: XP + P.HD.dam[0], to: XP + P.HD.dam[1], holes: [S.circle(0, YP + P.HD.ptY, 1.55, 16)] }),
    S.tube({ axis: "x", at: [YP + P.HD.ptY, 0], r0: 1.0, r1: 1.5, from: XP + P.HD.dam[1], to: XP + 460 + 1.5, own: true }),
    S.tube({ axis: "y", at: [XP + 460, 0], r0: 1.0, r1: 1.5, from: YP + P.HD.ptY + 1.5, to: YP + P.HD.top + 10, own: true }),
  ], { mat: "brass", angle: 135, explode: [0, 40, 0], anchor: { cut: [XP + 37.2, YP - 5, 0], out: { c: [XP + 37.2, YP, 0], r: 9, axis: "x" } } }));
  const [m0, m1] = P.HD.mastX;
  out.push(S.part(4, "PITOT MAST AND FLANGE", [
    S.extrude(K.rrect(XP + m0, -7, XP + m1, 7, 6), { along: "y", from: YP + P.HD.R, to: YP + P.HD.top - 5, holes: [K.rrect(XP + m0 + 2, -5, XP + m1 - 2, 5, 4)] }),
    S.box([XP + m0 - 22, YP + P.HD.top - 5, -20], [XP + m1 + 22, YP + P.HD.top, 20], { own: true }),
  ], { mat: "alu", angle: 135, explode: [0, 60, 0], anchor: { cut: [XP + m0 + 1, YP + 50, 0], out: { c: [XP + m0, YP + 50, 0], r: 0 } } }));
  // ================================================================ the lines
  out.push(S.part(5, "PITOT LINE", [bentTube(PATHS.pitotA, ROD, RID), bentTube(PATHS.pitotB, ROD, RID)], { hatch: "solid", explode: [0, 30, 0], anchor: { cut: [-75 - ROD + 0.3, 520, 0], out: { c: [-75, 520, 0], r: ROD, axis: "y" } } }));
  out.push(S.part(8, "STATIC LINES AND CROSS-OVER TEE", [
    bentTube(PATHS.portL, ROD, RID), bentTube(PATHS.portR, ROD, RID), bentTube(PATHS.static0, ROD, RID), bentTube(PATHS.static1, ROD, RID),
    bentTube(PATHS.manifold, ROD, RID), bentTube(PATHS.toAlt, ROD, RID), bentTube(PATHS.toAsi, ROD, RID),
    S.box([RING.x - 22, 26, -8], [RING.x + 22, 42, 8], { own: true }),
  ], { hatch: "solid", explode: [0, -30, 0], anchor: { cut: [-30 - ROD + 0.3, 240, 0], out: { c: [-30, 240, 0], r: ROD, axis: "y" } } }));
  // the traps: a round body and clear bowl, at each line's low point
  const trap = ([x, y]) => S.lathe([[0, y - 44], [12, y - 44], [12, y + 14], [ROD + 0.05, y + 14], [ROD + 0.05, y + 11], [10, y + 11], [10, y - 41], [0, y - 41]].map(([r, s]) => [r, s]), { axis: "y", at: [x, 0], segments: 32 });
  out.push(S.part(6, "DRAIN TRAPS", [trap(TRAPS.p), trap(TRAPS.s)], { mat: "plastic", angle: 135, explode: [0, -40, 0], anchor: { cut: [TRAPS.s[0] + 11, TRAPS.s[1] - 20, 0], out: { c: [TRAPS.s[0], TRAPS.s[1] - 20, 0], r: 12, axis: "y" } } }));
  // the tail-cone slice and its two flush ports (ring NTS)
  const port = (sg) => {
    const half = [[P.SP.hole, -2], [P.SP.head, -2], [P.SP.head, -0.8], [P.SP.shank, -0.8], [P.SP.shank, P.SP.nip[0]], [P.SP.nipR, P.SP.nip[0]], [P.SP.nipR, P.SP.nip[1]], [P.SP.hole, P.SP.nip[1]]];
    const s0 = RING.x - sg * RING.r;
    return S.lathe(half.map(([r, n]) => [r, s0 + sg * n]), { axis: "x", at: [RING.y, 0], segments: 24 });
  };
  out.push(S.part(7, "STATIC PORTS IN THE TAIL-CONE SKIN (NTS)", [
    port(1), port(-1),
    S.tube({ axis: "z", at: [RING.x, RING.y], r0: RING.r - RING.t, r1: RING.r, from: -70, to: 70, own: true, hatch: "solid", segments: 96 }),
  ], { mat: "brass", angle: 135, explode: [0, 0, 0], anchor: { cut: [RING.x - RING.r + 5, RING.y + 5, 0], out: { c: [RING.x - RING.r, RING.y, 0], r: 0 } } }));
  // ================================================================ the alternate static valve
  const AV = P.AV;
  out.push(S.part(9, "ALTERNATE STATIC VALVE BODY", [
    S.lathe([[0, VX], [AV.R, VX], [AV.R, VX + AV.len], [AV.bore, VX + AV.len], [AV.bore, VX + 4], [0, VX + 4]], { axis: "x", at: [VY, 0], segments: 32 }),
    S.bore(S.cylinder({ axis: "y", at: [VX + AV.A, 0], r: RID, from: VY - AV.R, to: VY - AV.bore })),
    S.bore(S.cylinder({ axis: "y", at: [VX + AV.B, 0], r: RID, from: VY + AV.bore, to: VY + AV.R })),
    S.bore(S.cylinder({ axis: "y", at: [VX + AV.C, 0], r: M.ALT_HOLE / 2, from: VY + AV.bore, to: VY + AV.R })),
  ], { mat: "alu", angle: 45, explode: [0, -50, 0], anchor: { cut: [VX + 30, VY - 8, 0], out: { c: [VX + 30, VY, 0], r: AV.R, axis: "x" } } }));
  const b = AV.bore - 0.05;
  out.push(S.part(10, "SPOOL AND KNOB", [
    S.lathe([[0, 4.5], [b, 4.5], [b, 8.5], [3, 8.5], [3, 25], [b, 25], [b, 42], [3, 42], [3, AV.knob[0]], [0, AV.knob[0]]].map(([r, s]) => [r, s + VX]), { axis: "x", at: [VY, 0], hatch: "none", segments: 24 }),
    S.cylinder({ axis: "x", at: [VY, 0], r: 8, from: VX + AV.knob[0], to: VX + AV.knob[1], own: true, hatch: ["plastic", 45] }),
  ], { hatch: "none", explode: [70, 0, 0], anchor: { cut: [VX + AV.knob[0] + 5, VY + 6, 0], out: { c: [VX + AV.knob[1], VY, 0], r: 0 } } }));
  return out;
}

// ---------------------------------------------------------------- the air
export function fluids() {
  const A0 = P.INSTR.asi.cap;
  const W0 = P.INSTR.vsi.cap;
  const capAir = (c, y) => S.lathe(P.capsulePts(c.x0, c.gap, c.R, 0, { n: 16 }).front.map(([x, r]) => [r, x]).concat(P.capsulePts(c.x0, c.gap, c.R, 0, { n: 16 }).rear.map(([x, r]) => [r, x]).reverse()), { axis: "x", at: [y, 0], segments: 32 });
  return [
    S.fluid("head", S.lathe([[0, XP], [P.HD.ram - 0.05, XP], [P.HD.ram - 0.05, XP + 4], [P.HD.ch - 0.05, XP + 6], [P.HD.ch - 0.05, XP + P.HD.dam[0]], [0, XP + P.HD.dam[0]]], { axis: "x", at: [YP, 0] })),
    S.fluid("pitotA", lineSheet(PATHS.pitotA, RID)),
    S.fluid("pitotB", lineSheet(PATHS.pitotB, RID)),
    S.fluid("static", lineSheet([...PATHS.static1], RID)),
    S.fluid("manifold", lineSheet(PATHS.manifold, RID)),
    S.fluid("asiCap", capAir(A0, IY.asi)),
    S.fluid("vsiCap", capAir(W0, IY.vsi)),
  ];
}
export const centres = () => [
  [[-14, IY.asi, 0], [112, IY.asi, 0]], [[-14, IY.alt, 0], [112, IY.alt, 0]], [[-14, IY.vsi, 0], [112, IY.vsi, 0]],
  [[XP - 8, YP, 0], [XP + P.HD.len + 8, YP, 0]],
];
export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
