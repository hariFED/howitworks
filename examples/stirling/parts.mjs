// The Stirling demonstrator's parts, in world mm (u right, v up, the cylinder axis at u = 0, the
// gear centres at v = 0). Each function draws one part into a view and returns SVG, so the main
// view and every detail draw the same geometry at their own scale. Moving parts are drawn at
// phi = 0 and the page moves them with a transform; the rods and the gas are redrawn per frame.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const both = (pts) => [pts, K.flipU(pts)];
const cutBoth = (V, pts, opts) => both(pts).map((p) => K.cut(V, p, opts)).join("");

// Rest positions (phi = 0)
export const YP0 = M.yokeP(0);
export const YD0 = M.yokeD(0);
export const PB0 = YP0 + M.LP; // piston underside
export const PT0 = PB0 + M.PISTON_H; // piston crown
export const DB0 = M.dispBottom(0);
export const DT0 = DB0 + M.DISP_L;
export const CT = M.CAP_TOP;

// Fixed heights (mm)
export const BASE = { top: -60, bot: -80, half: 85 };
export const CASE = { bot: -60, floor: -54, roof: 54, top: 62, wall: 46, out: 52, flange: 64 };
export const CYL = { bot: 62, top: 150, flangeTop: 70, finFrom: 92, finN: 10, finPitch: 5, finT: 2, upper: 141, core: 27, fin: 38 };
export const LINER = { bot: 54, top: 150, r0: M.BORE / 2, r1: 24 };
export const BOLT_R = 31; // the pitch radius of both screw circles
export const SHIELD = { r0: 33, r1: 33.8, bot: 161, top: 222 };
export const RING = { r: 28.5, v: 167, tube: 3, bore: 2 };
export const PIPE = { from: 31.5, to: 50, nut: 58, end: 64 };

// ---------------------------------------------------------------- base and crankcase

export function base(V) {
  const { top, bot, half } = BASE;
  // one board, with the two wood screws' holes cut through the plane
  const pocket = (u) => [[u + 3, top], [u + 3, bot + 9], [u, bot + 4.6], [u - 3, bot + 9], [u - 3, top]];
  const board = [[-half, bot], [half, bot], [half, top], ...pocket(58), ...pocket(-58), [-half, top]];
  return part(1, K.cut(V, board, { mat: "wood", angle: 30 }));
}

export function crankcase(V) {
  const { bot, floor, roof, top, wall, out, flange } = CASE;
  const r = 3;
  // one cut piece: floor, side walls and roof; the roof carries tapped M5 holes for the cylinder
  const shell = [
    [-55, bot], [55, bot], [55, floor], [out, floor], [out, top], [33.05, top], [33.05, top - 6],
    [31, top - 7.2], [28.95, top - 6], [28.95, top], [LINER.r1, top], [LINER.r1, roof],
    ...K.arc(wall - r, roof - r, r, 90, 0, 3), ...K.arc(wall - r, floor + r, r, 0, -90, 3),
    ...K.arc(-wall + r, floor + r, r, 270, 180, 3), ...K.arc(-wall + r, roof - r, r, 180, 90, 3),
    [-LINER.r1, roof], [-LINER.r1, top], [-28.95, top], [-28.95, top - 6], [-31, top - 7.2], [-33.05, top - 6], [-33.05, top],
    [-out, top], [-out, floor], [-55, floor],
  ];
  const lug = [[61, bot], [flange, bot], [flange, floor], [61, floor]];
  return part(2, K.cut(V, shell, { mat: "alu", angle: 45 }) + cutBoth(V, lug, { mat: "alu", angle: 45 }) +
    // the bearing bosses on the rear wall, seen through the open front
    K.line(V, K.circle(-M.E, 0, 13, 48), "thin", true) + K.line(V, K.circle(M.E, 0, 13, 48), "thin", true));
}

export function woodScrews(V) {
  const s = (u) => {
    const head = [[u - 5, CASE.floor], [u + 5, CASE.floor], [u + 5, CASE.floor + 3.4], [u + 4.4, CASE.floor + 4], [u - 4.4, CASE.floor + 4], [u - 5, CASE.floor + 3.4]];
    const shank = [[u - 3, CASE.floor], [u + 3, CASE.floor], [u + 3, BASE.bot + 9], [u + 0.4, BASE.bot + 4.6], [u - 0.4, BASE.bot + 4.6], [u - 3, BASE.bot + 9]];
    return K.body(V, shank) + K.body(V, head) + K.lines(V, [[[u - 2.2, BASE.top - 2], [u - 2.2, BASE.bot + 8]], [[u + 2.2, BASE.top - 2], [u + 2.2, BASE.bot + 8]]], "thin") +
      K.lines(V, [[[u - 1.7, CASE.floor + 0.6], [u - 1.7, CASE.floor + 3.4]], [[u + 1.7, CASE.floor + 0.6], [u + 1.7, CASE.floor + 3.4]]], "thin");
  };
  return part(3, s(58) + s(-58));
}

// ---------------------------------------------------------------- cylinder, liner, cap

export function liner(V) {
  return part(16, cutBoth(V, K.rect(LINER.r0, LINER.bot, LINER.r1, LINER.top), { mat: "iron", angle: 135 }));
}

export function cylinder(V) {
  const c = CYL;
  const pts = [[LINER.r1, c.bot], [28.25, c.bot], [28.25, c.flangeTop], [c.core, c.flangeTop]];
  for (let k = 0; k < c.finN; k++) {
    const v = c.finFrom + k * c.finPitch;
    pts.push([c.core, v], [c.fin, v], [c.fin, v + c.finT], [c.core, v + c.finT]);
  }
  pts.push([c.core, c.upper], [c.fin, c.upper], [c.fin, c.top], [33.05, c.top], [33.05, c.top - 6.5], [31, c.top - 7.7], [28.95, c.top - 6.5], [28.95, c.top], [LINER.r1, c.top]);
  const lug = K.rect(33.75, c.bot, 36, c.flangeTop);
  return part(17, cutBoth(V, pts, { mat: "alu", angle: 135 }) + cutBoth(V, lug, { mat: "alu", angle: 135 }));
}

export function gasket(V) {
  return part(19, [K.rect(LINER.r0, 150, 28.25, 151), K.rect(33.75, 150, 38, 151)].map((p) => cutBoth(V, p, { mat: "solid" })).join(""));
}

export function hotCap(V) {
  const shell = [
    [21, 151], ...K.arc(16, CT - 4, 5, 0, 90, 5), ...K.arc(-16, CT - 4, 5, 90, 180, 5), [-21, 151], [-20, 151],
    ...K.arc(-16, CT - 4, 4, 180, 90, 5), ...K.arc(16, CT - 4, 4, 90, 0, 5), [20, 151],
  ];
  const flange = [K.rect(21, 151, 28.25, 156), K.rect(33.75, 151, 38, 156)];
  return part(20, K.cut(V, shell, { mat: "solid" }) + flange.map((p) => cutBoth(V, p, { mat: "steel", angle: 45 })).join(""));
}

// Socket head cap screws M5: six hold the cap (into the cylinder), four the cylinder (into the case).
export function screw(V, u, seat, len) {
  const head = [[u - 4.25, seat], [u + 4.25, seat], [u + 4.25, seat + 4.6], [u + 3.85, seat + 5], [u - 3.85, seat + 5], [u - 4.25, seat + 4.6]];
  const end = seat - len;
  const shank = [[u - 2.5, seat], [u + 2.5, seat], [u + 2.5, end + 0.5], [u + 2, end], [u - 2, end], [u - 2.5, end + 0.5]];
  return (
    K.body(V, shank) + K.body(V, head) +
    K.lines(V, [[[u - 2.05, end + 0.4], [u - 2.05, end + 9]], [[u + 2.05, end + 0.4], [u + 2.05, end + 9]]], "thin") +
    K.line(V, [[u - 2, seat + 5], [u - 2, seat + 2.4], [u + 2, seat + 2.4], [u + 2, seat + 5]], "hid")
  );
}
export function capScrews(V) {
  return part(18, screw(V, BOLT_R, 156, 12) + screw(V, -BOLT_R, 156, 12) + screw(V, BOLT_R, CYL.flangeTop, 12) + screw(V, -BOLT_R, CYL.flangeTop, 12));
}

// ---------------------------------------------------------------- heat source

export function shield(V) {
  const { r0, r1, bot, top } = SHIELD;
  const hole = 3.2;
  return part(22, K.cut(V, K.rect(-r1, bot, -r0, top), { mat: "solid" }) + K.cut(V, K.rect(r0, bot, r1, RING.v - hole), { mat: "solid" }) + K.cut(V, K.rect(r0, RING.v + hole, r1, top), { mat: "solid" }));
}

export function burner(V) {
  const { r, v, tube, bore } = RING;
  const ringSec = (u) => K.cut(V, K.circle(u, v, tube, 28), { mat: "solid" }) + `<path class="paper" d="${K.d(V, K.circle(u, v, bore, 24))}"/>`;
  // the jets: Ø0.8 drillings on the ring's upper inside, seen as short lines through the wall
  const jet = (s) => K.line(V, [[s * (r - 2.1), v + 2.1], [s * (r - 2.9), v + 2.9]], "thin");
  const pipe = K.revolve([[bore, PIPE.from], [tube, PIPE.from], [tube, PIPE.to], [bore, PIPE.to]], { axis: "u", at: v });
  const nut = [[PIPE.to, v - 5.5], [PIPE.nut, v - 5.5], [PIPE.nut + 0.6, v - 4.9], [PIPE.nut + 0.6, v + 4.9], [PIPE.nut, v + 5.5], [PIPE.to, v + 5.5]];
  const stub = K.revolve([[bore, PIPE.nut + 0.6], [tube, PIPE.nut + 0.6], [tube, PIPE.end], [bore, PIPE.end]], { axis: "u", at: v });
  return part(
    23,
    ringSec(r) + ringSec(-r) + jet(1) + jet(-1) +
      K.section(V, { ...pipe, edges: [] }, { mat: "solid" }) +
      `<path class="paper" d="${K.d(V, K.rect(PIPE.from, v - bore, PIPE.to, v + bore))}"/>` +
      K.body(V, nut) + K.lines(V, [[[PIPE.to + 1, v - 2.6], [PIPE.nut - 0.4, v - 2.6]], [[PIPE.to + 1, v + 2.6], [PIPE.nut - 0.4, v + 2.6]]], "thin") +
      K.section(V, { ...stub, edges: [] }, { mat: "solid" }) +
      K.breakLine(V, [PIPE.end, v - 4.5], [PIPE.end, v + 4.5])
  );
}

// Flames: tongues from the jets licking up the cap, their height from the burner setting.
export function flames(V, b, t) {
  if (b < 0.02) return "";
  let out = "";
  for (const s of [1, -1]) {
    for (let i = 0; i < 2; i++) {
      const wob = 1 + 0.1 * Math.sin(t * (6.3 + i * 2.9) + i * 1.7 + (s > 0 ? 0 : 2.4));
      const h = (7 + 21 * b) * wob * (i ? 0.62 : 1);
      const u0 = s * (RING.r - 2.4 - i * 1.4);
      const v0 = RING.v + 2.5;
      const lean = s * (21.8 - Math.abs(u0)) * 0.9; // drawn in towards the cap as it rises
      const w = 1.5 + 0.9 * b - i * 0.4;
      const sway = 0.5 * Math.sin(t * 4.1 + i * 2 + s);
      const side = (dir) => {
        const pts = [];
        for (let k = 0; k <= 12; k++) {
          const f = dir > 0 ? k / 12 : 1 - k / 12;
          const c = u0 + lean * Math.sin((Math.PI / 2) * Math.min(1, f * 1.6)) + sway * f * f;
          const hw = w * Math.sin(Math.PI * Math.min(1, f ** 0.55)) * (1 - 0.25 * f);
          pts.push([c + dir * hw, v0 + h * f]);
        }
        return pts;
      };
      out += K.line(V, [...side(1), ...side(-1)], "thin", true);
    }
  }
  return out;
}

// ---------------------------------------------------------------- displacer (drawn at phi = 0)

export function displacer(V, db = DB0) {
  const dt = db + M.DISP_L;
  const R = M.DISP_D / 2;
  const shell = [
    [R, db], ...K.arc(R - 3, dt - 3, 3, 0, 90, 4), ...K.arc(-R + 3, dt - 3, 3, 90, 180, 4), [-R, db], [-R + 0.5, db],
    ...K.arc(-R + 3, dt - 3, 2.5, 180, 90, 4), ...K.arc(R - 3, dt - 3, 2.5, 90, 0, 4), [R - 0.5, db],
  ];
  const plug = [[-R + 0.5, db], [-2.5, db], [-2.5, db + 5], [2.5, db + 5], [2.5, db], [R - 0.5, db], [R - 0.5, db + 6], [-R + 0.5, db + 6]];
  return part(
    21,
    `<path class="paper" d="${K.d(V, K.rect(-R, db, R, dt))}"/>` + K.cut(V, shell, { mat: "solid" }) + K.cut(V, plug, { mat: "alu", angle: 30 }) +
      // the vent-sealing weld bead on the crown's underside is not drawn; the crown's far edge is
      K.line(V, [[-R + 3, dt - 0.5], [R - 3, dt - 0.5]], "thin")
  );
}

export function dispRod(V, yd = YD0, db = DB0) {
  const lo = yd - 10.5;
  const hi = db + 5;
  const rod = [[-2.5, lo + 0.5], [-2, lo], [2, lo], [2.5, lo + 0.5], [2.5, hi], [-2.5, hi]];
  return part(12, K.body(V, rod) + K.lines(V, [[[-2.05, lo + 0.4], [-2.05, yd + 6]], [[2.05, lo + 0.4], [2.05, yd + 6]], [[-2.05, db - 6], [-2.05, hi]], [[2.05, db - 6], [2.05, hi]]], "thin"));
}

export function dispYoke(V, yd = YD0) {
  const piece = [[2.5, yd - 5], [14, yd - 5], [14, yd + 5], [2.5, yd + 5]];
  const nut = [[-4.6, yd - 9], [4.6, yd - 9], [4.6, yd - 5.4], [4.2, yd - 5], [-4.2, yd - 5], [-4.6, yd - 5.4]];
  return (
    part(10, cutBoth(V, piece, { mat: "steel", angle: 135 })) +
    part(25, K.body(V, nut) + K.lines(V, [[[-2.3, yd - 9], [-2.3, yd - 5]], [[2.3, yd - 9], [2.3, yd - 5]]], "thin"))
  );
}

// ---------------------------------------------------------------- power piston (drawn at phi = 0)

export function pistonYoke(V, yp = YP0) {
  const piece = [[5, yp + 5], [14, yp + 5], [14, yp - 5], [3.5, yp - 5], [3.5, yp - 1], [5, yp - 1]];
  return part(9, cutBoth(V, piece, { mat: "steel", angle: 45 }));
}

export function tube(V, yp = YP0) {
  const pb = yp + M.LP;
  return part(11, cutBoth(V, K.rect(3.5, yp - 1, 5, pb + 10), { mat: "steel", angle: 135 }) +
    K.lines(V, [[[4.6, yp - 0.6], [4.6, yp + 5]], [[-4.6, yp - 0.6], [-4.6, yp + 5]], [[4.6, pb], [4.6, pb + 9.6]], [[-4.6, pb], [-4.6, pb + 9.6]]], "thin"));
}

export function pistonLoop(pb = PB0) {
  const pt = pb + M.PISTON_H;
  return [
    [5, pt], [20, pt], [20, pt - 4], [18.5, pt - 4], [18.5, pt - 5.5], [20, pt - 5.5], [20, pt - 9], [18.5, pt - 9], [18.5, pt - 10.5], [20, pt - 10.5],
    [20, pb + 0.6], [19.4, pb], [17, pb], [17, pb + 14], ...K.arc(14, pb + 14, 3, 0, 90, 3), [11, pb + 17], ...K.arc(11, pb + 14, 3, 90, 180, 3), [8, pb],
    [5, pb], [5, pb + 10], [3.5, pb + 10], [3.5, pt - 14], [5, pt - 14],
  ];
}

export function piston(V, pb = PB0) {
  const pt = pb + M.PISTON_H;
  const ring = (v) => K.rect(18.6, v, 20, v + 1.4);
  return (
    part(13, cutBoth(V, pistonLoop(pb), { mat: "alu", angle: 45 })) +
    part(14, [ring(pt - 5.45), ring(pt - 10.45)].map((r) => cutBoth(V, r, { mat: "solid" })).join("")) +
    part(15, cutBoth(V, K.rect(2.5, pt - 14, 5, pt), { mat: "bronze", angle: 135 }))
  );
}

// ---------------------------------------------------------------- rhombic drive

// A spur gear outline: z teeth of module m, pitch radius rp, about (cu, cv), turned by rot degrees.
export function gearOutline(cu, cv, z, m, rot = 0) {
  const rp = (z * m) / 2;
  const ra = rp + m;
  const rf = rp - 1.25 * m;
  const pitch = 360 / z;
  const pts = [];
  for (let i = 0; i < z; i++) {
    const a = rot + i * pitch;
    // a trapezoid tooth: half-widths in degrees at root, pitch and tip
    const at = (r, da) => [cu + r * Math.cos(((a + da) * Math.PI) / 180), cv + r * Math.sin(((a + da) * Math.PI) / 180)];
    pts.push(at(rf, -pitch * 0.32), at(rp, -pitch * 0.25), at(ra, -pitch * 0.15), at(ra, pitch * 0.15), at(rp, pitch * 0.25), at(rf, pitch * 0.32));
  }
  return pts;
}

// One gear seen through the open front, behind the rods; the crank pin on its face is cut across.
// side -1: the left gear (turns with phi), +1: the right gear (its mirror). Drawn at phi = 0.
export function gear(V, side) {
  const cu = side * M.E;
  const rot = side < 0 ? 0 : 180 + 4.5; // the right gear is offset half a tooth so the teeth mesh
  const holes = [45, 135, 225, 315].map((a) => K.line(V, K.circle(cu + 11.5 * Math.cos(((a + (side < 0 ? 0 : 180)) * Math.PI) / 180), 11.5 * Math.sin((a * Math.PI) / 180), 3.2, 24), "vis", true)).join("");
  return part(4, K.body(V, gearOutline(cu, 0, 40, 1, rot)) + K.line(V, K.circle(cu, 0, 16.2, 64), "thin", true) + K.line(V, K.circle(cu, 0, 6.5, 32), "vis", true) + holes);
}

export function gearShaft(V, side) {
  const cu = side * M.E;
  return part(5, K.body(V, K.circle(cu, 0, 4, 28)) + K.lines(V, [[[cu - 1.2, 4.6], [cu - 1.2, 6.5]], [[cu + 1.2, 4.6], [cu + 1.2, 6.5]]], "thin"));
}

export function crankPin(V, side) {
  const cu = side * M.E - side * M.R_CRANK; // at phi = 0 the pins point at each other
  return part(6, K.cut(V, K.circle(cu, 0, 3, 24), { mat: "steel", angle: side < 0 ? 45 : 135 }));
}

// A connecting rod: a capsule round its two eye centres.
export function rodShape([ua, va], [ub, vb], r = 4.5) {
  const ang = (Math.atan2(vb - va, ub - ua) * 180) / Math.PI;
  return [...K.arc(ub, vb, r, ang - 90, ang + 90, 8), ...K.arc(ua, va, r, ang + 90, ang + 270, 8)];
}

// The four rods and the yoke pins at drive angle phi (absolute positions; redrawn each frame).
export function linkage(V, phi) {
  const pl = M.pinL(phi);
  const pr = M.pinR(phi);
  const yp = M.yokeP(phi);
  const yd = M.yokeD(phi);
  const a = M.YOKE_A;
  const rods = [
    [[-a, yd], pl], [[a, yd], pr], // the displacer's rods, behind
    [[-a, yp], pl], [[a, yp], pr], // the piston's rods, in front
  ];
  const pins = [[-a, yp], [a, yp], [-a, yd], [a, yd]];
  return (
    part(7, rods.map(([p, q]) => K.body(V, rodShape(p, q))).join("")) +
    part(6, [pl, pr].map((p, i) => K.cut(V, K.circle(p[0], p[1], 3, 24), { mat: "steel", angle: i ? 45 : 135 })).join("")) +
    part(8, pins.map((p, i) => K.cut(V, K.circle(p[0], p[1], 3, 24), { mat: "steel", angle: i % 2 ? 135 : 45 })).join(""))
  );
}

// ---------------------------------------------------------------- the working gas

// Hot (expansion) space above the displacer, cold (compression) space above the piston; both bore
// wide. The regenerator gap is drawn in bands that ride with the displacer, cold at the bottom.
export function hotGas(phi) {
  const v = M.dispTop(phi);
  return [[[-20, v], [20, v], ...K.arc(16, CT - 4, 4, 0, 90, 5), ...K.arc(-16, CT - 4, 4, 90, 180, 5)]];
}
export function coldGas(phi) {
  return [K.rect(-20, M.pistonTop(phi), 20, M.dispBottom(phi))];
}
export const GAP_BANDS = 8;
export function gapBand(i, db = DB0) {
  const h = M.DISP_L / GAP_BANDS;
  const v0 = db + i * h;
  return [K.rect(-20, v0, -19, v0 + h + 0.01), K.rect(19, v0, 20, v0 + h + 0.01)];
}
export const shapes = (V, list) => list.map((s) => K.d(V, s)).join("");

// ---------------------------------------------------------------- flywheel (VIEW B, from the rear)

export const FLY = { r: 55, rim: 46, hub: 11, spokes: 5 };

export function flywheel(V, cu) {
  let out = K.body(V, K.circle(cu, 0, FLY.r, 96));
  out += K.line(V, K.circle(cu, 0, FLY.r - 1.2, 96), "thin", true);
  // the web between rim and hub, with five lightening windows
  const n = FLY.spokes;
  for (let i = 0; i < n; i++) {
    const a0 = (i * 360) / n + 11;
    const a1 = ((i + 1) * 360) / n - 11;
    const win = [...K.arc(cu, 0, FLY.rim, a0, a1, 10), ...K.arc(cu, 0, FLY.hub + 5, a1 - 6, a0 + 6, 6)];
    out += K.line(V, win, "vis", true);
  }
  out += K.line(V, K.circle(cu, 0, FLY.hub, 40), "vis", true);
  return part(24, out);
}

export function shaftEnd(V, cu) {
  const hex = [0, 60, 120, 180, 240, 300].map((a) => [cu + 7.5 * Math.cos(((a + 30) * Math.PI) / 180), 7.5 * Math.sin(((a + 30) * Math.PI) / 180)]);
  return part(5, K.body(V, hex) + K.line(V, K.circle(cu, 0, 6.4, 32), "thin", true) + K.line(V, K.circle(cu, 0, 4, 24), "vis", true));
}
