// The monotube damper's parts, in world mm (u right, v up, the axis at u = 0, the lower eye at v = 0).
// Each function draws one part into a view and returns SVG, so the main view and the details draw
// the same geometry at their own scale. The rod assembly is drawn fully extended (c = 0) and the
// page moves it with a transform; only the shims (they bend) and the oil are redrawn per frame.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;

const both = (V, pts, opts) => K.cut(V, pts, opts) + K.cut(V, K.flipU(pts), opts);
const bodyBoth = (V, pts) => K.body(V, pts) + K.body(V, K.flipU(pts));

// An annulus cut square to its axis (an eye ring, a bush): hatched, with its hole left open.
export function annulus(V, [cu, cv], r0, r1, { mat = "steel", angle = 45 } = {}) {
  const dd = K.d(V, K.circle(cu, cv, r1, 72)) + K.d(V, K.circle(cu, cv, r0, 72));
  if (mat === "solid") return `<path class="solid" fill-rule="evenodd" d="${dd}"/>`;
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path fill="url(#h-${mat}-${angle})" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
}

// ---------------------------------------------------------------- eyes: ring, rubber bush, sleeve
// The eye's axis is square to the sheet, so the cut shows it as three rings round the bolt hole.
// side +1: the base cap is above the ring (lower eye); -1: the dust shield is below it (upper eye).
export function eye(V, vc, side) {
  const R = M.EYE_R;
  const face = vc + side * R; // where the ring meets the part it is welded to
  const weld = (sgn) => {
    const pts = [[sgn * 11, face]];
    for (let i = 0; i <= 8; i++) {
      const u = sgn * (11 - (11 - 6.5) * (i / 8));
      pts.push([u, vc + side * Math.sqrt(R * R - u * u)]);
    }
    pts.push([sgn * 6.5, face]);
    return K.cut(V, pts, { mat: "solid" });
  };
  return (
    part(3, annulus(V, [0, vc], 16, R, { mat: "steel", angle: 45 }) + weld(-1) + weld(1)) +
    part(4, annulus(V, [0, vc], 8, 16, { mat: "rubber" })) +
    part(5, annulus(V, [0, vc], 6, 8, { mat: "steel", angle: 135 })) +
    K.centerMark(V, [0, vc], 6, 4)
  );
}

// ---------------------------------------------------------------- the body: cap, tube, plug
export function baseCap(V) {
  const B = M.CAP_BOT;
  // the axial and radial fill drillings split the section in two
  const left = [
    [-23.5, B], [25 - 1, B], [25, B + 1], [25, 23], [-2, 23], [-2, M.FLOOR], [-22.2, M.FLOOR], [-23, M.FLOOR - 0.8],
    [-23, M.TUBE_BOT], [-23.6, M.TUBE_BOT], [-25, M.TUBE_BOT - 1.4], [-25, B + 1], [-24, B],
  ];
  const right = [[2, 27], [25, 27], [25, M.TUBE_BOT - 1.4], [23.6, M.TUBE_BOT], [23, M.TUBE_BOT], [23, M.FLOOR - 0.8], [22.2, M.FLOOR], [2, M.FLOOR]];
  const weld = (s) => K.cut(V, [[s * 25.3, M.TUBE_BOT - 1.4], [s * 25.3, M.TUBE_BOT + 1.4], [s * 23.6, M.TUBE_BOT]], { mat: "solid" });
  return part(2, K.cut(V, left, { mat: "steel", angle: 135 }) + K.cut(V, right, { mat: "steel", angle: 135 }) + weld(-1) + weld(1));
}

export function fillPlug(V) {
  return part(6, K.cut(V, K.rrect(19, 23, 25.4, 27, 0.6), { mat: "rubber" }));
}

// The pressure tube with the retaining-ring groove under its mouth.
export function tube(V, from = M.TUBE_BOT, to = M.TUBE_TOP) {
  const g0 = M.GUIDE_TOP;
  const g1 = M.GUIDE_TOP + 1.75;
  const foot = from === M.TUBE_BOT ? [[23, from], [23.6, from], [25, from + 1.4]] : [[23, from], [25, from]];
  const loop = [...foot, [25, to], [23.6, to], [23, to - 0.6]];
  if (to > g1) loop.push([23, g1], [23.9, g1], [23.9, g0], [23, g0]);
  return part(1, K.section(V, { ...K.revolve(loop), edges: [] }, { mat: "steel", angle: 45 }));
}

// ---------------------------------------------------------------- floating piston (moves with c / FP_RATIO)
export function floatingPiston(V, b = M.FP_BOT0) {
  const P = M.FP_POCKET;
  const loop = [
    [0, P.h], [P.r, P.h], [P.r, 0], [22.6, 0], [22.9, 0.3], [22.9, 7], [20.3, 7], [20.3, 13], [22.9, 13], [22.9, 19.7], [22.6, 20], [0, 20],
  ].map(([r, s]) => [r, b + s]);
  const ring = K.rrect(20.3, b + 8.6, 22.95, b + 11.4, 1.2);
  return part(7, K.section(V, K.revolve(loop), { mat: "alu", angle: 135 })) + part(8, both(V, ring, { mat: "rubber" }));
}

// ---------------------------------------------------------------- rod guide and seals (fixed)
export function guide(V) {
  const g = M.GUIDE_BOT;
  const loop = [
    [9, 0], [22.6, 0], [23, 0.4], [23, 4], [20.5, 4], [20.5, 8], [23, 8], [23, 30], [12, 30], [12, 26], [13, 26], [13, 18], [7.4, 18], [7.4, 14], [9, 14],
  ].map(([r, s]) => [r, g + s]);
  const bush = K.rect(7, g, 9, g + 14);
  const seal = [[7, g + 18.7], [7.7, g + 18], [13, g + 18], [13, g + 26], [9.2, g + 26], [7, g + 24.2], [7.9, g + 21.6]];
  const wiper = [[9, g + 26], [12, g + 26], [12, g + 30], [11.2, g + 32.5], [8.6, g + 32.5], [7, g + 31.4], [7, g + 30.4], [9, g + 28.6]];
  const ring = K.rrect(20.5, g + 4.3, 23, g + 7.7, 1.2);
  const clip = K.rect(21.2, M.GUIDE_TOP, 23.85, M.GUIDE_TOP + 1.75);
  const garter = (s) => K.cut(V, K.circle(s * 10.4, g + 21.4, 0.75, 12), { mat: "solid" });
  return (
    part(18, K.section(V, { ...K.revolve(loop), edges: [] }, { mat: "alu", angle: 135 })) +
    part(19, both(V, bush, { mat: "bronze", angle: 45 })) +
    part(20, both(V, seal, { mat: "rubber" }) + garter(-1) + garter(1)) +
    part(21, both(V, wiper, { mat: "plastic", angle: 45 })) +
    part(22, both(V, ring, { mat: "rubber" })) +
    part(23, both(V, clip, { mat: "solid" }))
  );
}

// ---------------------------------------------------------------- the piston and its valving
// Piston coordinates: r from the axis, z from the piston's mid-plane. The right half is cut through
// a compression port (in at the bottom outside the rebound stack, out at the top under the compression
// stack); the left half through a rebound port, the same shape turned over (an aligned section).
const PORT_IN = [17.32, 21.18]; // inlet edges at the face, r
const PORT_OUT = [8.82, 12.68]; // outlet edges in the recess
const inner = [[5.1, -6], [8, -6], [8, -5], [14.5, -5], [14.5, -6], [16, -6], [16, -5.5], [PORT_IN[0], -5.5], [PORT_OUT[0], 5], [8, 5], [8, 6], [5.1, 6]];
const outer = [
  [PORT_IN[1], -5.5], [22.2, -5.5], [22.7, -5], [22.7, -4], [22, -4], [22, 4], [22.7, 4], [22.7, 5], [22.2, 5.5], [16, 5.5], [16, 6], [14.5, 6], [14.5, 5], [PORT_OUT[1], 5],
];
export const PORT_R_MID = (PORT_IN[0] + PORT_IN[1] + PORT_OUT[0] + PORT_OUT[1]) / 4; // where the ports cross the mid-plane
export const PORT_TILT = Math.atan((PORT_IN[0] - PORT_OUT[0]) / 10.5);

export function piston(V, nut = M.NUT0) {
  const zc = nut + M.S_PM;
  const R = (pts) => pts.map(([r, z]) => [r, zc + z]);
  const L = (pts) => pts.map(([r, z]) => [-r, zc - z]).reverse();
  const opts = { mat: "steel", angle: 135 };
  const pistonSvg = [R(inner), R(outer), L(inner), L(outer)].map((p) => K.cut(V, p, opts)).join("");
  const band = K.rect(22, zc - 4, 23, zc + 4);
  return part(9, pistonSvg) + part(10, both(V, band, { mat: "plastic", angle: 60 }));
}

// One stack of shims, bent about the clamp washer's rim (r = 8) by `lift` at r = 17.
// dir +1: the compression stack on top, bending up; −1: the rebound stack below, bending down.
export const bend = (r, lift) => (r <= 8 ? 0 : lift * ((r - 8) / 9) ** 2);
export function shims(V, nut, dir, lift) {
  const list = dir > 0 ? M.COMP_SHIMS : M.REB_SHIMS;
  const face = dir > 0 ? nut + M.S_PT : nut + M.S_PB;
  let out = "";
  list.forEach((dia, j) => {
    // compression stack: j = 0 sits on the piston; rebound stack: the last one sits on it
    const k = dir > 0 ? j : list.length - 1 - j;
    const R0 = 5.1;
    const R1 = dia / 2;
    const rs = [R0, 8];
    for (let r = 8.5; r < R1; r += 0.5) rs.push(r);
    rs.push(R1);
    const a = k * M.SHIM_T + 0.02;
    const b = (k + 1) * M.SHIM_T - 0.02;
    const near = rs.map((r) => [r, face + dir * (a + bend(r, lift))]);
    const far = rs.map((r) => [r, face + dir * (b + bend(r, lift))]).reverse();
    const pts = [...near, ...far];
    out += K.cut(V, pts, { mat: "solid" }) + K.cut(V, K.flipU(pts), { mat: "solid" });
  });
  return part(dir > 0 ? 11 : 12, out);
}

export function nutAndWashers(V, nut = M.NUT0) {
  const n = [[-7.2, nut], [7.2, nut], [8, nut + 0.8], [8, nut + M.NUT_H - 0.8], [7.2, nut + M.NUT_H], [-7.2, nut + M.NUT_H], [-8, nut + M.NUT_H - 0.8], [-8, nut + 0.8]];
  const lowW = K.rect(-8, nut + M.NUT_H, 8, nut + M.S_REB);
  const upW = K.rect(-8, nut + M.S_PT + M.COMP_SHIMS.length * M.SHIM_T, 8, nut + M.S_SHOULDER);
  return (
    part(13, K.body(V, lowW) + K.body(V, upW)) +
    part(14, K.body(V, n) + K.lines(V, [[[-4.4, nut + 0.4], [-4.4, nut + M.NUT_H - 0.4]], [[4.4, nut + 0.4], [4.4, nut + M.NUT_H - 0.4]]], "thin"))
  );
}

// ---------------------------------------------------------------- the rod and what rides on it
export const ROD_TOP0 = M.PLATE_TOP0 + 2;

export function rod(V, nut = M.NUT0, top = ROD_TOP0) {
  const s = nut + M.S_SHOULDER;
  const pts = [[-4.4, nut - 1], [4.4, nut - 1], [5, nut - 0.4], [5, s], [7, s], [7, top], [-7, top], [-7, s], [-5, s], [-5, nut - 0.4]];
  return part(15, K.body(V, pts) + K.line(V, [[-4.3, nut - 0.6], [-4.3, nut]], "thin") + K.line(V, [[4.3, nut - 0.6], [4.3, nut]], "thin"));
}

export function reboundStop(V, nut = M.NUT0) {
  const s = nut + M.S_STOP;
  const ring = K.rect(7, s, 11, s + 3);
  const buffer = [[7, s + 3], [12, s + 3], [12.5, s + 3.5], [12.5, s + 11], [10, nut + M.S_BUFFER_TOP], [7, nut + M.S_BUFFER_TOP]];
  return part(16, both(V, ring, { mat: "steel", angle: 45 })) + part(17, both(V, buffer, { mat: "rubber" }));
}

export function bumpStop(V, bot = M.BUMPER_BOT0) {
  const top = M.PLATE_TOP0 - 1;
  const pts = [[7.5, bot], [11.5, bot], [14, bot + 2.5]];
  let z = bot + 2.5;
  let out = true;
  while (z + 3.5 < top - 4) {
    const r = out ? 16 : 13.6;
    pts.push([r, z + 1.2], [r, z + 3.5 - 1.2]);
    z += 3.5;
    out = !out;
  }
  pts.push([16, top - 2.5], [16, top], [7.5, top]);
  return part(24, both(V, pts, { mat: "foam" }));
}

export function dustShield(V) {
  const t = M.PLATE_TOP0;
  const pts = [[30, M.SHIELD_BOT0], [31, M.SHIELD_BOT0], [31, t], [7, t], [7, t - 1], [30, t - 1]];
  const weld = (s) => K.cut(V, [[s * 7, t - 1], [s * 9.4, t - 1], [s * 7, t - 3.4]], { mat: "solid" });
  return part(25, K.cut(V, pts, { mat: "solid" }) + K.cut(V, K.flipU(pts), { mat: "solid" }) + weld(-1) + weld(1));
}

// Everything that moves with the rod, drawn at c = 0.
export function rodAssembly(V, { shimsOn = true } = {}) {
  const nut = M.NUT0;
  return (
    dustShield(V) +
    bumpStop(V) +
    rod(V) +
    reboundStop(V) +
    piston(V) +
    (shimsOn ? `<g class="shim-comp">${shims(V, nut, 1, 0)}</g><g class="shim-reb">${shims(V, nut, -1, 0)}</g>` : "") +
    nutAndWashers(V) +
    eye(V, M.EYE_TOP0, -1)
  );
}

// The rod assembly fully extended, as phantom lines.
export function phantomExtended(V) {
  const t = M.PLATE_TOP0;
  const shield = [[-31, M.SHIELD_BOT0], [31, M.SHIELD_BOT0], [31, t], [-31, t]];
  return K.line(V, shield, "phan", true) + K.line(V, K.circle(0, M.EYE_TOP0, M.EYE_R, 72), "phan", true);
}

// ---------------------------------------------------------------- fluids
// Oil below the piston (compression chamber) and above it (rebound chamber), and the nitrogen.
export function oilBelow(c) {
  return [K.rect(-23, M.fpV(c) + M.FP_H - 0.3, 23, M.nutV(c) + M.S_PM)];
}
export function oilAbove(c) {
  return [K.rect(-23, M.nutV(c) + M.S_PM, 23, M.GUIDE_BOT + 0.5)];
}
export function gas(c) {
  const b = M.fpV(c);
  return [
    K.rect(-23, M.FLOOR - 0.3, 23, b + 0.3),
    K.rect(-M.FP_POCKET.r, b, M.FP_POCKET.r, b + M.FP_POCKET.h + 0.3),
    K.rect(-2, 23, 2, M.FLOOR),
    K.rect(2, 23, 19.2, 27),
  ];
}
export const fluidPath = (V, shapes) => shapes.map((s) => K.d(V, s)).join("");

// The oil's path through the open port and past the lifted shims, in piston coordinates.
// dir +1: compression (up through the right-hand port), −1: rebound (down through the left).
export function flowPath(V, nut, dir, lift) {
  const zc = nut + M.S_PM;
  const inR = (PORT_IN[0] + PORT_IN[1]) / 2;
  const outR = (PORT_OUT[0] + PORT_OUT[1]) / 2;
  const gap = (r) => 6 + Math.max(0.16, 0.5 * bend(r, lift) + 0.04);
  const pts = [
    [inR, -13], [inR, -5.5], [outR, 5], [12.8, 5.5], [15.25, gap(15.25)], [17.2, 6 + Math.max(0.3, bend(17.2, lift) + 0.3)], [19.6, 8.4], [20.2, 12.5],
  ];
  const place = dir > 0 ? ([r, z]) => [r, zc + z] : ([r, z]) => [-r, zc - z];
  return pts.map(place);
}

// ---------------------------------------------------------------- SECTION A-A: across the piston's mid-plane
// Looking down the axis: tube, band, piston with its six ports (three each way, alternating), the post.
// An inclined port cut square to the axis shows as an ellipse, long in the radial direction.
export function sectionAA(V) {
  const ring = (r0, r1) => K.d(V, K.circle(0, 0, r1, 96)) + K.d(V, K.circle(0, 0, r0, 96));
  const hatch = (dd, mat, angle) => `<path class="paper" fill-rule="evenodd" d="${dd}"/><path fill="url(#h-${mat}-${angle})" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
  const rad = 1.5 / Math.cos(PORT_TILT);
  const ports = [];
  for (let k = 0; k < 6; k++) {
    const a = (k * 60 * Math.PI) / 180;
    const cu = PORT_R_MID * Math.cos(a);
    const cv = PORT_R_MID * Math.sin(a);
    const pts = [];
    for (let i = 0; i < 28; i++) {
      const f = (i / 28) * 2 * Math.PI;
      const x = rad * Math.cos(f);
      const y = 1.5 * Math.sin(f);
      pts.push([cu + x * Math.cos(a) - y * Math.sin(a), cv + x * Math.sin(a) + y * Math.cos(a)]);
    }
    ports.push(pts);
  }
  const pistonD = ring(5.1, 22) + ports.map((p) => K.d(V, p)).join("");
  return (
    part(1, hatch(ring(23, 25), "steel", 45)) +
    part(10, hatch(ring(22, 23), "plastic", 60)) +
    part(9, hatch(pistonD, "steel", 135)) +
    part(15, hatch(K.d(V, K.circle(0, 0, 5, 48)), "steel", 45)) +
    K.line(V, K.circle(0, 0, PORT_R_MID, 96), "ctr", true) +
    K.centerMark(V, [0, 0], 27, 0) +
    ports.map((p, k) => {
      const a = (k * 60 * Math.PI) / 180;
      return K.centerline(V, [(PORT_R_MID - 3) * Math.cos(a), (PORT_R_MID - 3) * Math.sin(a)], [(PORT_R_MID + 3) * Math.cos(a), (PORT_R_MID + 3) * Math.sin(a)], 0);
    }).join("")
  );
}

// ---------------------------------------------------------------- DIAGRAM 3: the quarter car, schematic
// Sheet units. Masses move by QC.zk sheet units per mm; the road scrolls under the wheel.
export const QC = { x: 667, road: 504, mu: 458, ms: 388, zk: 0.42, mPerUnit: 1 / 60, x0: 572, x1: 762 };

function zig(x, y0, y1, w = 7, n = 6) {
  const pts = [[x, y0], [x, y0 + (y1 - y0) * 0.12]];
  for (let i = 0; i < n; i++) pts.push([x + (i % 2 ? -w : w), y0 + (y1 - y0) * (0.12 + (0.76 * (i + 0.5)) / n)]);
  pts.push([x, y0 + (y1 - y0) * 0.88], [x, y1]);
  return `<path class="thin" d="${pts.map(([a, b], i) => `${i ? "L" : "M"}${K.r2(a)} ${K.r2(b)}`).join("")}"/>`;
}

export function quarterCar({ zs, zu, X, humps, on }) {
  const q = QC;
  const ys = q.ms - zs * 1000 * q.zk; // body underside... top of body box is ys - 30
  const yu = q.mu - zu * 1000 * q.zk;
  const roadAt = (x) => q.road - M.road(X + (x - q.x) * q.mPerUnit, humps) * 1000 * q.zk;
  let road = "";
  for (let x = q.x0; x <= q.x1; x += 2) road += `${x === q.x0 ? "M" : "L"}${x} ${K.r2(roadAt(x))}`;
  let ground = "";
  for (let x = q.x0 + 4; x <= q.x1; x += 8) ground += `M${x} ${q.road + 6}l-5 6`;
  const yc = roadAt(q.x);
  const box = (x, y, w, h) => `<rect class="paper" x="${K.r2(x)}" y="${K.r2(y)}" width="${w}" height="${h}"/><rect class="vis" x="${K.r2(x)}" y="${K.r2(y)}" width="${w}" height="${h}"/>`;
  const t = (x, y, s, a = "middle") => `<text class="t t-sm" x="${K.r2(x)}" y="${K.r2(y)}" text-anchor="${a}">${s}</text>`;
  const ks = q.x - 22;
  const dm = q.x + 22;
  const top = yu - 20;
  const bot = ys;
  const mid = (top + bot) / 2;
  // damper symbol: a cylinder hanging from the wheel, a piston rod from the body
  const cylTop = top - 0.62 * (top - bot);
  const damper =
    `<path class="thin" d="M${dm} ${K.r2(top)}V${K.r2(top - 6)}M${dm - 7} ${K.r2(top - 6)}H${dm + 7}V${K.r2(cylTop)}M${dm - 7} ${K.r2(top - 6)}V${K.r2(cylTop)}` +
    `M${dm} ${K.r2(bot)}V${K.r2(mid + 1)}M${dm - 5} ${K.r2(mid + 1)}H${dm + 5}"/>`;
  return (
    `<path class="thin" d="${ground}"/><path class="vis" d="${road}"/>` +
    `<circle class="dot" cx="${q.x}" cy="${K.r2(yc)}" r="1.4"/>` +
    zig(q.x, yu, yc, 6, 5) +
    box(q.x - 34, yu - 20, 68, 20) +
    zig(ks, top, bot, 7, 7) +
    damper +
    box(q.x - 58, ys - 30, 116, 30) +
    t(q.x, ys - 12, `SPRUNG ${M.MS} kg`) +
    t(q.x, yu - 7, `WHEEL ${M.MU} kg`) +
    t(ks - 10, mid + 2.5, `${M.KS / 1000} N/mm`, "end") +
    t(dm + 11, mid + 2.5, on ? "c(v)" : "OFF", "start") +
    t(q.x + 10, (yu + yc) / 2 + 2.5, `${M.KT / 1000} N/mm`, "start")
  );
}
