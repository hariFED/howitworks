// The Porter governor's solids for its 3D view (governor-3d.html), in the 2D sheet's own world mm:
// x = the sheet's u, y = its v, the spindle axis at x = 0, the drive-shaft axis at y = 0, and the
// section plane through the spindle, the drive shaft and the valve axis is z = 0. Pure data built
// with kit/solid3d.mjs from model.mjs and parts.mjs.
//
// Two kinds of part:
//   cut  - the gear case, the drive line, the spindle, sleeve, collar, bell crank and the whole
//          valve: closed solids sectioned on z = 0, as on the sheet. The spinning ones (wheel,
//          pinion, shaft, spindle, sleeve) turn about their own axes, solid by solid, in live3d.js.
//   whole - the head, its nut, the arms, the flyballs, the links and their pins (`whole: true`):
//          live3d.js moves their cutting plane out of the way, so they stay round and swing
//          through the section as the spindle turns them.
// Moving parts are built at the lower stop, α = ALPHA_MIN, valve on its seats (lift 0) and the
// bell crank level; live3d.js poses them from the model.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const UV = M.UV;
const VT = M.VT;
const SL = M.SLEEVE;
export const A0 = M.ALPHA_MIN; // the build pose
const Q0 = P.pose(A0);
export const LUG0 = Q0.lug;
export const BALL0 = Q0.ball; // [r, v]
export const C0 = Q0.C; // swivel collar pin
export const F = M.F; // bell crank fulcrum
export const E0 = P.crankShape().E; // crank's short-arm pin, crank level
export const G0 = [UV, M.PIN_G_SHUT]; // stem clevis pin, valve shut
export const EL = M.pinE(M.crankTurn(M.ALPHA_MAX)); // the link is built where it shuts the valve

// ---------------------------------------------------------------- small outline helpers
const dedupe = (pts) => pts.filter((p, i) => {
  const q = pts[(i + 1) % pts.length];
  return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6;
});
// a circle of radius r with a key slot of half-width w out to d from the centre (d < r: a keyway
// in a shaft; d > r: a keyway in a hub's bore), the slot pointing at angle `dir` (deg)
function keyed(cx, cy, r, w, d, dir, n = 64) {
  const da = (Math.asin(w / r) * 180) / Math.PI;
  const pts = K.arc(0, 0, r, 90 + da, 450 - da, n);
  pts.push([w, d], [-w, d]);
  const t = ((dir - 90) * Math.PI) / 180;
  return pts.map(([a, b]) => [cx + a * Math.cos(t) - b * Math.sin(t), cy + a * Math.sin(t) + b * Math.cos(t)]);
}
// keep the part of a polygon where f(p) >= 0 (f linear), Sutherland-Hodgman
function clip(poly, f) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const fa = f(a);
    const fb = f(b);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return dedupe(out);
}
const rectXY = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const ring = (cx, cy, r, n = 96) => S.circle(cx, cy, r, n);
const CL = 0.05; // running and push fits

// ---------------------------------------------------------------- bevel teeth
// An involute outline with backlash, at the heel. The kit's gearOutline has none, and these teeth
// mesh across the cutting plane, so they are thinned by `back` mm on the pitch circle.
export function toothOutline({ teeth, module: m, phase = 0, back = 0.9, dedendum = 1.25 }) {
  const r = (m * teeth) / 2;
  const a0 = (20 * Math.PI) / 180;
  const rb = r * Math.cos(a0);
  const ra = r + m;
  const rf = r - dedendum * m;
  const inv = (a) => Math.tan(a) - a;
  const thin = back / 2 / r;
  const half = (rho) => Math.PI / (2 * teeth) + inv(a0) - inv(Math.acos(Math.min(1, rb / rho))) - thin;
  const lo = Math.max(rf, rb);
  const out = [];
  const at = (rho, ang) => out.push([rho * Math.cos(ang), rho * Math.sin(ang)]);
  for (let k = 0; k < teeth; k++) {
    const c = (2 * Math.PI * k) / teeth + (phase * Math.PI) / 180;
    if (rf < rb) at(rf, c - half(rb));
    for (let i = 0; i <= 4; i++) at(lo + ((ra - lo) * i) / 4, c - half(lo + ((ra - lo) * i) / 4));
    for (let i = 4; i >= 0; i--) at(lo + ((ra - lo) * i) / 4, c + half(lo + ((ra - lo) * i) / 4));
    if (rf < rb) at(rf, c + half(rb));
    const e0 = c + half(lo);
    const e1 = (2 * Math.PI * (k + 1)) / teeth + (phase * Math.PI) / 180 - half(lo);
    for (let i = 1; i < 3; i++) at(rf, e0 + ((e1 - e0) * i) / 3);
  }
  return out;
}
// Straight bevel teeth: the heel outline scaled toward the pitch-cone apex (the origin) from the
// heel (k = 1, at `heel` mm along the axis) to the toe (k = k0), round a bore of radius `hole`
// that stays cylindrical. live3d.js builds the mesh (bevelGeometry); here is the recipe.
export const BEVEL = {
  wheel: { teeth: 30, module: 4, heel: 40, k0: 0.72, hole: 30 + CL, phase: 6, axis: "-x" },
  pinion: { teeth: 20, module: 4, heel: 60, k0: 0.72, hole: 20 + CL, phase: 0, axis: "y" },
};
const toe = (b) => b.heel * b.k0;

// ---------------------------------------------------------------- explode (vertical; the case and the valve body stay)
export const EX = {
  drive: -160, // the drive line drops out under the case
  spindle: 180, stopLo: 100, stopHi: 200, sleeve: 150, head: 300, nut: 340,
  valve: 100, bonnet: 180, packing: 220, gland: 240, studs: 270,
  crank: [60, 240, 0], link: [100, 130, 0], // jogged clear of the bonnet and its studs
};
const up = (dy) => [0, dy, 0];

// The head in plan (x, z): the boss r17 with, each side, a forked lug of two cheeks the arm swings in
function headPlan() {
  const R = 17;
  const zi = 4 + CL;
  const zo = 8;
  const deg = (z) => (Math.asin(z / R) * 180) / Math.PI;
  const out = [];
  for (const s of [1, -1]) {
    const base = s > 0 ? 0 : 180;
    // up the side from the gap below: outer cheek's lower edge, slot, upper cheek
    out.push(...K.arc(0, 0, R, base - 90, base - deg(zo), 6).slice(s > 0 ? 0 : 1));
    out.push([s * 31, -s * zo], [s * 31, -s * zi]);
    out.push(...K.arc(0, 0, R, base - deg(zi), base + deg(zi), 4));
    out.push([s * 31, s * zi], [s * 31, s * zo]);
    out.push(...K.arc(0, 0, R, base + deg(zo), base + 90, 6));
  }
  return dedupe(out);
}

// ---------------------------------------------------------------- parts
export function parts() {
  const out = [];
  const Zi = 72; // gear case inside half-depth
  const Zo = 84;

  // 1 GEAR CASE: walls, top with the spindle boss, floor and foot, built round its cavity
  out.push(
    S.part(1, "GEAR CASE", [
      S.extrude(rectXY(-Zo, -74, Zo, 98), { along: "x", from: -100, to: -76, holes: [ring(0, 0, 16 + CL)] }),
      S.extrude(rectXY(-Zo, -74, Zo, 98), { along: "x", from: 50, to: 62, holes: [ring(0, 0, 16 + CL)] }),
      S.lathe([[16 + CL, 62], [22, 62], [22, 85], [21, 86], [0, 86], [0, 74], [16 + CL, 74]], { axis: "x", at: 0 }),
      S.extrude(rectXY(-76, -68, 50, 84), { along: "z", from: Zi, to: Zo }),
      S.extrude(rectXY(-76, -68, 50, 84), { along: "z", from: -Zo, to: -Zi }),
      S.extrude(rectXY(-76, -Zo, 50, Zo), { along: "y", from: 84, to: 98, holes: [ring(0, 0, 12.5 + CL, 64)] }),
      S.extrude(rectXY(-76, -Zo, 50, Zo), { along: "y", from: -74, to: -68 }),
      S.extrude(K.rrect(-135, -Zo - 12, 100, Zo + 12, 6), { along: "y", from: -84, to: -74 }),
      S.lathe([[12.5 + CL, 98], [32, 98], [26, 104], [26, 160], [12.5 + CL, 160]]),
      ...[[-118, 0], [82, 0]].map(([x, z]) => S.bore(S.lathe([[0, -84], [5, -84], [5, -74], [0, -74]], { at: [x, z] }))),
    ], { mat: "iron", angle: 45, anchor: { cut: [-88, 60, 0], out: { c: [-100, 60, 0], r: Zo, axis: "z" } } }),
  );

  // 2 DRIVE SHAFT Ø25 with its two keyways (rods are not hatched)
  const kx = (from, to) => S.extrude(keyed(0, 0, 12.5, 4 + CL, 9, 90, 48), { along: "x", from, to });
  out.push(
    S.part(2, "DRIVE SHAFT Ø25", [
      S.lathe([[0, -176], [11.5, -176], [12.5, -175], [12.5, -158], [0, -158]], { axis: "x", at: 0 }),
      kx(-158, -137),
      S.lathe([[0, -137], [12.5, -137], [12.5, -70], [0, -70]], { axis: "x", at: 0 }),
      kx(-70, -51),
      S.lathe([[0, -51], [12.5, -51], [12.5, 72], [11.5, 73], [0, 73]], { axis: "x", at: 0 }),
    ], { explode: up(EX.drive), anchor: { cut: [-115, 5, 0], out: { c: [-115, 0, 0], r: 12.5, axis: "x" } } }),
  );

  // 3 BEVEL WHEEL z30 on the drive shaft (teeth toward -x), 4 BEVEL PINION z20 on the spindle
  const W = BEVEL.wheel;
  const hubX = (r, from, to) => S.extrude(ring(0, 0, r), { along: "x", from, to, holes: [keyed(0, 0, 12.5 + CL, 4 + CL, 16 + CL, 90)] });
  out.push(
    S.part(3, "BEVEL WHEEL z30 m4", [
      hubX(30, -48, -toe(W)),
      hubX(28, -72, -48),
      S.lathe([[30, -40], [51, -40], [51, -44.5], [47.5, -48], [30, -48]], { axis: "x", at: 0 }),
      // placeholder for the teeth: live3d.js replaces it with the bevel mesh (same volume, toothed)
      S.lathe([[W.hole, -W.heel], [60, -W.heel], [60 * W.k0, -toe(W)], [W.hole, -toe(W)]], { axis: "x", at: 0, bevel: "wheel", hatch: "none", live: "teeth" }),
    ], { mat: "steel", angle: 45, explode: up(EX.drive), anchor: { cut: [-44, -40, 0], out: { c: [-44, 0, 0], r: 51, axis: "x" } } }),
  );
  const Pn = BEVEL.pinion;
  out.push(
    S.part(4, "BEVEL PINION z20 m4", [
      S.extrude(ring(0, 0, 20, 72), { along: "y", from: toe(Pn), to: 82, holes: [keyed(0, 0, 12.5 + CL, 4 + CL, 16 + CL, 0)] }),
      S.lathe([[20, 60], [34, 60], [34, 64], [30, 68], [20, 68]]),
      S.lathe([[Pn.hole, toe(Pn)], [40 * Pn.k0, toe(Pn)], [40, Pn.heel], [Pn.hole, Pn.heel]], { bevel: "pinion", hatch: "none", live: "teeth" }),
    ], { mat: "steel", angle: 135, anchor: { cut: [27, 64, 0], out: { c: [0, 64, 0], r: 34, axis: "y" } } }),
  );

  // 5 BUSHES, 6 PULLEY (keyed hub, web, crowned rim), 7 KEYS
  out.push(
    S.part(5, "BUSH Ø25/32×24", [
      S.tube({ axis: "x", r0: 12.5 + CL, r1: 16, from: -100, to: -76 }),
      S.tube({ axis: "x", r0: 12.5 + CL, r1: 16, from: 52, to: 74 }),
    ], { mat: "bronze", angle: 135, explode: up(EX.drive), anchor: { cut: [63, 14.3, 0], out: { c: [63, 0, 0], r: 16, axis: "x" } } }),
    S.part(6, "FLAT-BELT PULLEY Ø120×45", [
      S.extrude(ring(0, 0, 22, 72), { along: "x", from: -162, to: -133, holes: [keyed(0, 0, 12.5 + CL, 4 + CL, 16 + CL, 90)] }),
      S.lathe([[22, -152], [52, -152], [54, -154], [54, -170], [59, -170], [60, -147.5], [59, -125], [54, -125], [54, -141], [52, -143], [22, -143]], { axis: "x", at: 0 }),
    ], { mat: "iron", angle: 135, explode: up(EX.drive), anchor: { cut: [-150, -57, 0], out: { c: [-150, 0, 0], r: 60, axis: "x" } } }),
    S.part(7, "PARALLEL KEY 8×7", [
      S.box([-158, 9, -4], [-137, 16, 4], { explode: up(EX.drive) }),
      S.box([-70, 9, -4], [-51, 16, 4], { explode: up(EX.drive) }),
      S.box([9, 50, -4], [16, 79, 4]),
    ], { anchor: { cut: [-147, 12.5, 0], solid: 0, out: { c: [-147, 12.5, 0], r: 4, axis: "z" } } }),
  );

  // 8 SPINDLE Ø25 (keyway under the pinion, M20 thread at the top), 9 STOP COLLARS
  out.push(
    S.part(8, "SPINDLE Ø25", [
      S.lathe([[0, 42], [11.5, 42], [12.5, 43], [12.5, 50], [0, 50]]),
      S.extrude(keyed(0, 0, 12.5, 4 + CL, 9, 0, 48), { along: "y", from: 50, to: 79 }),
      S.lathe([[0, 79], [12.5, 79], [12.5, 530], [10, 530], [10, 581], [9, 582], [0, 582]]),
    ], { explode: up(EX.spindle), anchor: { cut: [6, 125, 0], out: { c: [0, 125, 0], r: 12.5, axis: "y" } } }),
  );
  const collar = (v0, dy) => S.lathe([[12.5 + CL, v0], [21, v0], [22, v0 + 1], [22, v0 + 13], [21, v0 + 14], [12.5 + CL, v0 + 14]], { explode: up(dy) });
  out.push(
    S.part(9, "STOP COLLAR Ø44×14", [collar(P.STOP_LO, EX.stopLo), collar(P.STOP_HI, EX.stopHi)], {
      mat: "steel", angle: 135, anchor: { cut: [18, P.STOP_LO + 7, 0], solid: 0, out: { c: [0, P.STOP_LO + 7, 0], r: 22, axis: "y" } },
    }),
  );

  // ---- the flying parts: whole, in the plane of the arms (θ = 0 is the sheet's plane)
  const whole = { whole: true };
  const side = [1, -1];
  // 10 HEAD: the boss and, each side, a forked lug the arm swings in
  out.push(
    S.part(10, "HEAD", [
      S.lathe([[10 + CL, VT - 20], [17, VT - 20], [17, VT - 10], [10 + CL, VT - 10]], whole),
      S.extrude(headPlan(), { along: "y", from: VT - 10, to: VT + 10, holes: [ring(0, 0, 10 + CL, 48)], ...whole }),
      S.lathe([[10 + CL, VT + 10], [17, VT + 10], [17, VT + 12], [10 + CL, VT + 12]], whole),
    ], { mat: "steel", angle: 45, explode: up(EX.head), anchor: { cut: [24, VT + 10, 6], out: { c: [24, VT + 10, 6] } } }),
    S.part(11, "HEX NUT M20", [S.extrude(S.hexagon(30), { along: "y", from: VT + 12, to: VT + 28, holes: [ring(0, 0, 10 + CL, 48)], ...whole })], {
      explode: up(EX.nut), anchor: { cut: [14, VT + 20, 0], out: { c: [14, VT + 20, 0] } },
    }),
  );
  // 12 UPPER ARMS (pivot on the head pin), 13 FLYBALLS, 14 LOWER LINKS (pivot on the sleeve's pin)
  const [br, bv] = BALL0;
  out.push(
    S.part(12, "UPPER ARM 150 C/C", side.map((s) => S.extrude(P.linkOutline([s * M.OFFSET, VT], [s * br, bv], 8, 5.5), { along: "z", from: -4, to: 4, pivot: [s * M.OFFSET, VT, 0], ...whole })), {
      explode: up(EX.head), anchor: { cut: armMid(1, br, bv), solid: 0, out: { c: armMid(1, br, bv) } },
    }),
    S.part(13, `FLYBALL Ø${M.BALL_D}`, side.map((s) => S.sphere([s * br, bv, 0], M.BALL_D / 2, whole)), {
      explode: up(EX.head), anchor: { cut: [br, bv, 0], solid: 0, out: { c: [br, bv, 0] } },
    }),
    S.part(14, "LOWER LINK 150 C/C", side.map((s) => S.extrude(P.linkOutline([s * br, bv], [s * M.OFFSET, LUG0], 6.5, 4.5), { along: "z", from: -4, to: 4, pivot: [s * M.OFFSET, LUG0, 0], ...whole })), {
      explode: up(EX.head), anchor: { cut: linkMid(1, br, bv), solid: 0, out: { c: linkMid(1, br, bv) } },
    }),
  );

  // 15 PINS Ø10: head ×2 (whole, turning with the head); collar C, fulcrum F, crank E, stem G (cut
  // across: hatched). The ball and sleeve pins sit wholly inside the balls and the link eyes, unseen.
  const pin = (x, y, z0, z1, o = {}) => S.cylinder({ axis: "z", at: [x, y], r: 5, from: z0, to: z1, ...o });
  const hx = { explode: up(EX.head), ...whole };
  out.push(
    S.part(15, "PIN Ø10", [
      ...side.map((s) => pin(s * M.OFFSET, VT, -8, 8, hx)),
      pin(C0[0], C0[1], -13, 13),
      pin(F[0], F[1], -13, 13, { explode: EX.crank }),
      pin(E0[0], E0[1], -7, 7, { explode: EX.link }),
      pin(G0[0], G0[1], -10, 10, { explode: EX.link }),
    ], { mat: "steel", angle: 45, anchor: { cut: [F[0], F[1] + 2, 0], solid: 3, out: { c: [F[0], F[1], 13] } } }),
  );

  // 16 SLEEVE (the load): the sheet's half-profile to the top of its body, then a hub slotted for
  // the links (cut through, and turning with the spindle)
  const sl = P.sleeveLoop(LUG0);
  const sleeveBody = [[12.5 + 0.1, sl[0][1]], ...sl.slice(1, 14), [12.5 + 0.1, LUG0 + SL.bodyTop]];
  const hubR = SL.hubR;
  const sw = 4.1; // slot half-width
  const da = (Math.asin(sw / hubR) * 180) / Math.PI;
  const slotted = [...K.arc(0, 0, hubR, da, 180 - da, 24), [-13.4, sw], [-13.4, -sw], ...K.arc(0, 0, hubR, 180 + da, 360 - da, 24), [13.4, -sw], [13.4, sw]];
  out.push(
    S.part(16, "SLEEVE (LOAD)", [
      S.lathe(sleeveBody),
      S.extrude(slotted, { along: "y", from: LUG0 + SL.bodyTop, to: LUG0 + SL.top, holes: [ring(0, 0, 12.6, 64)] }),
    ], { mat: "iron", angle: 45, explode: up(EX.sleeve), anchor: { cut: [-50, LUG0 - 40, 0], out: { c: [0, LUG0 - 40, 0], r: SL.bodyR, axis: "y" } } }),
  );

  // 17 SWIVEL COLLAR in the sleeve's groove (does not turn): the ring, and the fork for pin C
  const lo = LUG0 + SL.grooveLo + 0.5;
  const hi = LUG0 + SL.grooveHi - 0.5;
  const c = C0[1];
  const cheek = [[37, c - 6], [M.PIN_C_U, c - 6], ...K.arc(M.PIN_C_U, c, 6, -90, 90, 10).slice(1, -1), [M.PIN_C_U, c + 6], [37, c + 6]];
  out.push(
    S.part(17, "SWIVEL COLLAR, SPLIT", [
      S.lathe([[20.5, lo], [37.5, lo], [39, lo + 1.5], [39, hi - 1.5], [37.5, hi], [20.5, hi]]),
      S.extrude(cheek, { along: "z", from: 7 + CL, to: 13, holes: [ring(C0[0], c, 5 + CL, 32)] }),
      S.extrude(cheek, { along: "z", from: -13, to: -7 - CL, holes: [ring(C0[0], c, 5 + CL, 32)] }),
    ], { mat: "bronze", angle: 135, anchor: { cut: [-30, c, 0], out: { c: [0, c, 0], r: 39, axis: "y" } } }),
  );

  // 18 BELL CRANK, level: one plate, its short arm's eye split into a fork for the valve link
  const { outline, slot } = P.crankShape();
  const d2 = [Math.cos((M.ARM2_AT * Math.PI) / 180), Math.sin((M.ARM2_AT * Math.PI) / 180)];
  const along2 = (p) => (p[0] - F[0]) * d2[0] + (p[1] - F[1]) * d2[1];
  const CUT2 = M.ARM2 - 12;
  const plate = clip(dedupe(outline), (p) => CUT2 - along2(p));
  const eye = clip(dedupe(outline), (p) => along2(p) - CUT2);
  out.push(
    S.part(18, "BELL CRANK 130/55, 120°", [
      S.extrude(plate, { along: "z", from: -7, to: 7, holes: [slot, ring(F[0], F[1], 5 + CL, 32)] }),
      S.extrude(eye, { along: "z", from: 4 + CL, to: 7, holes: [ring(E0[0], E0[1], 5 + CL, 32)] }),
      S.extrude(eye, { along: "z", from: -7, to: -4 - CL, holes: [ring(E0[0], E0[1], 5 + CL, 32)] }),
    ], { mat: "iron", angle: 135, pivot: [F[0], F[1], 0], explode: EX.crank, anchor: { cut: [110, F[1], 0], out: { c: [110, F[1], 7] } } }),
  );

  // 19 VALVE LINK (a rod: not hatched), between the crank's fork and the stem's clevis
  out.push(
    S.part(19, `VALVE LINK ${M.LINK.toFixed(0)} C/C`, [
      S.extrude(P.linkOutline(EL, G0, 8, 4.5), { along: "z", from: -4, to: 4, holes: [ring(EL[0], EL[1], 5 + CL, 32), ring(G0[0], G0[1], 5 + CL, 32)] }),
    ], { pivot: [G0[0], G0[1], 0], explode: EX.link, anchor: { cut: [(EL[0] + G0[0]) / 2 + 1, (EL[1] + G0[1]) / 2, 0], out: { c: [(EL[0] + G0[0]) / 2, (EL[1] + G0[1]) / 2, 4] } } }),
  );

  // ---- the valve, on its axis x = UV, shut
  const g = M.PIN_G_SHUT;
  const ax = (loop, o = {}) => S.lathe(loop, { at: [UV, 0], ...o });
  out.push(
    S.part(20, "VALVE STEM Ø16", [
      ax([[0, -54], [7.5, -54], [8, -53.5], [8, g - 14], [0, g - 14]]),
      S.box([UV - 10, g - 14, -10], [UV + 10, g - 10, 10]),
      S.extrude(rectXY(UV - 10, g - 10, UV + 10, g + 8), { along: "z", from: 4 + CL, to: 10, holes: [ring(UV, g, 5 + CL, 32)] }),
      S.extrude(rectXY(UV - 10, g - 10, UV + 10, g + 8), { along: "z", from: -10, to: -4 - CL, holes: [ring(UV, g, 5 + CL, 32)] }),
    ], { explode: up(EX.valve), anchor: { cut: [UV - 3, 92, 0], out: { c: [UV, 92, 0], r: 8, axis: "y" } } }),
    S.part(21, "DOUBLE-BEAT VALVE Ø48/Ø56", [
      ax([[8 + CL, -38], [23.5, -38], [23.5, -33], [24, -32.5], [26.5, -30], [26.5, -25], [14, -25], [14, 9], [27, 9], [27, 16.5], [30.5, 20], [30.5, 26], [8 + CL, 26]]),
    ], { mat: "bronze", angle: 45, explode: up(EX.valve), anchor: { cut: [UV - 20, -28, 0], out: { c: [UV, -28, 0], r: 26.5, axis: "y" } } }),
    S.part(22, "SEAT RING Ø48, Ø56", [
      ax([[24, -40], [32, -40], [32, -30], [26.5, -30], [24, -32.5]]),
      ax([[28, 10], [36, 10], [36, 20], [30.5, 20], [28, 17.5]]),
    ], { mat: "bronze", angle: 135, anchor: { cut: [UV + 33, 15, 0], out: { c: [UV, 15, 0], r: 36, axis: "y" } } }),
  );

  // 23 VALVE BODY: the sheet's section, built as walls swept across the plane and horizontal webs
  // with round holes (the outlet, the two seat pockets, the bonnet opening), closed front and back
  const Zb = 46; // inside half-depth
  const Zv = 56; // outside
  const yPlate = (x0, x1, y0, y1, z, holes = []) => S.extrude(rectXY(UV + x0, -z, UV + x1, z), { along: "y", from: y0, to: y1, holes: holes.map((r) => ring(UV, 0, r)) });
  const zWall = (x0, y0, x1, y1, z) => S.extrude(rectXY(UV + x0, y0, UV + x1, y1), { along: "z", from: -z, to: z });
  const studXZ = [[UV - 66, 0], [UV + 66, 0], [UV, -66], [UV, 66]];
  out.push(
    S.part(23, "VALVE BODY DN50", [
      yPlate(-72, 72, -72, -62, Zv, [30]),
      yPlate(-72, 44, -62, -56, Zv, [30]),
      zWall(-72, -56, -62, 34, Zv),
      zWall(30, -56, 44, -46, Zb),
      yPlate(-50, 44, -46, -40, Zb, [30]),
      zWall(44, -44, 88, -40, Zb),
      yPlate(-50, 88, -40, -30, Zb, [32 + CL]),
      zWall(-50, -30, -44, 8, Zb),
      yPlate(-50, 88, 8, 10, Zb, [34]),
      yPlate(-50, 88, 10, 20, Zb, [36 + CL]),
      zWall(40, 20, 50, 34, Zb),
      S.extrude(rectXY(UV - 72, -72, UV + 72, 72), { along: "y", from: 34, to: 40, holes: [ring(UV, 0, 40), ...studXZ.map(([x, z]) => ring(x, z, 4 + CL, 24))] }),
      S.extrude(rectXY(-Zv, -70, Zv, 48), { along: "x", from: UV + 88, to: UV + 100, holes: [ring(0, -11, 19, 64)] }),
      S.extrude(rectXY(UV - 62, -56, UV + 88, 34), { along: "z", from: Zb, to: Zv }),
      S.extrude(rectXY(UV - 62, -56, UV + 88, 34), { along: "z", from: -Zv, to: -Zb }),
    ], { mat: "iron", angle: 45, anchor: { cut: [UV - 67, -10, 0], out: { c: [UV - 67, -10, 0], r: Zv, axis: "z" } } }),
  );

  // 24 BONNET with the fulcrum post and its forked cheeks, 25 GLAND, 26 PACKING, 27 STUDS, 28 NUT
  const PO = P.POST;
  const fr = F[0];
  const postCheek = [[UV + PO.r0, PO.top], [UV + PO.r0, F[1]], ...K.arc(fr, F[1], 18.5, 180, 0, 16).slice(1), [fr + 18.5, F[1] - 6], [UV + PO.r1 + 6, PO.top]];
  out.push(
    S.part(24, "BONNET WITH FULCRUM POST", [
      S.extrude(ring(UV, 0, 72, 144), { along: "y", from: 40, to: 52, holes: [ring(UV, 0, 8 + CL, 48), ...studXZ.map(([x, z]) => ring(x, z, 4 + CL, 24))] }),
      ax([[8 + CL, 52], [30, 52], [30, 56], [8 + CL, 56]]),
      S.extrude(ring(UV, 0, 30, 96), { along: "y", from: 56, to: 78, holes: [ring(UV, 0, 14 + CL, 64), ring(UV - 23, 0, 4 + CL, 24), ring(UV + 23, 0, 4 + CL, 24)] }),
      S.extrude(rectXY(UV + PO.r0, -13, UV + PO.r1, 13), { along: "y", from: 52, to: PO.top }),
      S.extrude(postCheek, { along: "z", from: 7 + CL, to: 13, holes: [ring(F[0], F[1], 5 + CL, 32)] }),
      S.extrude(postCheek, { along: "z", from: -13, to: -7 - CL, holes: [ring(F[0], F[1], 5 + CL, 32)] }),
    ], { mat: "iron", angle: 135, explode: up(EX.bonnet), anchor: { cut: [UV + PO.r0 + 9, 120, 0], out: { c: [UV + PO.r0 + 9, 120, 13] } } }),
    S.part(25, "GLAND", [
      ax([[8.5, 68], [13.5, 68], [13.5, 78], [8.5, 78]]),
      S.extrude(ring(UV, 0, 34, 96), { along: "y", from: 78, to: 84, holes: [ring(UV, 0, 8.5, 48), ring(UV - 23, 0, 4 + CL, 24), ring(UV + 23, 0, 4 + CL, 24)] }),
    ], { mat: "brass", angle: 45, explode: up(EX.gland), anchor: { cut: [UV + 30, 81, 0], out: { c: [UV, 81, 0], r: 34, axis: "y" } } }),
    // three rings, drawn as one stack with the joints notched
    S.part(26, "PACKING RING 6 SQ", [ax([[8 + CL, 56], [14, 56], [14, 59.5], [13.3, 60], [14, 60.5], [14, 63.5], [13.3, 64], [14, 64.5], [14, 68], [8 + CL, 68]])], {
      mat: "rubber", angle: 45, explode: up(EX.packing), anchor: { cut: [UV - 11, 62, 0], out: { c: [UV, 62, 0], r: 14, axis: "y" } } }),
  );
  const stud = (x, z, s0, s1, nut) => [
    S.lathe([[0, s0], [4, s0], [4, s1 - 1], [3, s1], [0, s1]], { at: [x, z] }),
    S.extrude(S.hexagon(13, x, z), { along: "y", from: nut, to: nut + 6.6, holes: [ring(x, z, 4 + CL, 24)] }),
  ];
  out.push(
    S.part(27, "STUD M8×32 + NUT", [
      ...studXZ.flatMap(([x, z]) => stud(x, z, 34, 62, 52)),
      ...[UV - 23, UV + 23].flatMap((x) => stud(x, 0, 70, 93, 84)),
    ], { explode: up(EX.studs), anchor: { cut: [UV + 66, 46, 0], out: { c: [UV + 66, 56, 0], r: 6.5, axis: "y" } } }),
    S.part(28, "HEX NUT M16", [S.extrude(S.hexagon(24, UV, 0), { along: "y", from: -50, to: -38, holes: [ring(UV, 0, 8 + CL, 48)] })], {
      explode: up(EX.valve), anchor: { cut: [UV - 10, -44, 0], out: { c: [UV, -44, 0], r: 12, axis: "box" } } }),
  );
  return out;
}

// balloon anchors on the arm and link of side s, at the build pose
export function armMid(s, br = BALL0[0], bv = BALL0[1]) {
  return [s * (M.OFFSET + br) / 2, (VT + bv) / 2, 4];
}
export function linkMid(s, br = BALL0[0], bv = BALL0[1]) {
  return [s * (M.OFFSET + br) / 2, (LUG0 + bv) / 2, 4];
}

// centre lines: the spindle (riding with it), the drive shaft, the valve and its inlet
export const centres = () => [
  { line: [[0, 30, 0], [0, 600, 0]], part: 8 },
  { line: [[-184, 0, 0], [92, 0, 0]], part: 2 },
  { line: [[UV, -84, 0], [UV, 132, 0]], part: 23 },
  { line: [[UV + 64, -11, 0], [UV + 112, -11, 0]], part: 23 },
];

export const scene = () => ({ parts: parts(), fluids: [], centres: centres() });
