// The trim tab's parts as geometry and SVG. Pure: every function returns world point lists or SVG for
// one state, so the build draws the sheet and the page redraws the moving pieces with the same code,
// and the 3D scene takes the same profiles.
//   Elevator frame (Section A-A, Details B and C): u aft of the elevator hinge, v up from the chord line,
//   at the actuator's centre plane BL −485, mm. Section A-A turns it by the elevator's angle; the
//   details stay in the elevator's own frame.
//   Pedestal and cable run (Views D and E): FS aft, WL up, from the port side.

import * as K from "../../kit/draft.mjs";
import * as A from "../light-aircraft/model.mjs";
import * as FC from "../flight-controls/model.mjs";
import * as X from "../flight-controls/extra.mjs";
import * as M from "./model.mjs";

const rad = Math.PI / 180;
const r2 = K.r2;
export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- the elevator's section at BL −485
// The tailplane's symmetric section (BP-106 Section D-D's), its chord at the actuator's station.
const TP = M.TP;
const SB = -M.ACT_BL / (TP.span / 2);
export const DLE = TP.le + (TP.tipLe - TP.le) * SB;
export const DTE = TP.te + (TP.tipTe - TP.te) * SB;
export const DC = DTE - DLE;
const yt12 = (x) => 0.6 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
const xiOf = (u) => (u + TP.hinge - DLE) / DC;
export const half = (u) => DC * yt12(clamp(xiOf(u), 0, 1)); // the section's half-thickness at u
export const TE_U = DTE - TP.hinge;
export const XI_E = xiOf(0);
export const RNE = half(0) - 3; // the elevator's balance nose round the hinge
export const SKIN = 1; // skins and webs (0.8 drawn 1.0 so they read at 1:2.5)
export const SPAR_U = 8; // the elevator's front spar web
export const WEB_U = 281.6; // the elevator's rear spar web, aft face (the hinge's fixed leaf on it)
export const TAB_U = M.TAB_U; // 284, the tab hinge
export const KNUCKLE = 2.4; // piano hinge knuckle radius
export const WIRE = 0.8; // hinge wire radius (Ø1.6)
export const LEAF = 0.8;
export const TSPAR_U = 286.6; // the tab's spar web, front face (its leaf on it)
export const SLOT = [130, 250]; // the slot in the lower skin the rod passes through
// a surface between u0 and u1 (s = +1 upper, −1 lower), n points
export function surface(u0, u1, s, n = 16) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n;
    out.push([u, s * half(u)]);
  }
  return out;
}
// the elevator's skin, nose and upper: from the lower surface at SLOT[0] forward, round the nose, aft
// along the upper surface to the rear web; the band lies inside it
const nosePath = () => {
  const lo = surface(SLOT[0], 12, -1, 14);
  const nose = K.arc(0, 0, RNE, 270, 90, 14); // bottom → front → top: clockwise round the nose
  const up = surface(12, WEB_U, 1, 22);
  // join the nose arc to the surfaces with short straight runs (the skin's tangent at u 12)
  return [...lo, ...nose.slice(0), ...up];
};
export const skinUpper = () => band(nosePath(), SKIN);
export const skinLowerAft = () => band(surface(WEB_U, SLOT[1], -1, 10), SKIN);
export const skinLowerSlot = () => band(surface(SLOT[1], SLOT[0], -1, 8), SKIN); // the slot's sides (3D only)
// a band of thickness t to the right of an open path
export function band(path, t) {
  const n = path.length;
  const off = path.map((p, i) => {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(n - 1, i + 1)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [p[0] + ((b[1] - a[1]) / L) * t, p[1] - ((b[0] - a[0]) / L) * t];
  });
  return [...path, ...off.reverse()];
}
// spar webs: the front one at SPAR_U, the rear one at WEB_U (between the skins)
export const frontSpar = () => K.rect(SPAR_U, -half(SPAR_U) + SKIN, SPAR_U + SKIN, half(SPAR_U) - SKIN);
export const rearSpar = () => K.rect(WEB_U - SKIN, -half(WEB_U) + SKIN, WEB_U, half(WEB_U) - SKIN);
// the tab, in its own position (δt = 0): skins from its spar round the trailing edge, and the spar web
const TSK = () => [...surface(TSPAR_U + SKIN, TE_U, -1, 12), ...surface(TE_U, TSPAR_U + SKIN, 1, 12).slice(1)];
export const tabSkin = () => band(TSK().reverse(), SKIN); // clockwise outline, band inside
export const tabSpar = () => K.rect(TSPAR_U, -half(TSPAR_U), TSPAR_U + SKIN, half(TSPAR_U));
export const tabOutline = () => [[TSPAR_U, -half(TSPAR_U)], ...surface(TSPAR_U, TE_U, -1, 12).slice(1), ...surface(TE_U, TSPAR_U, 1, 12).slice(1)];
export const elevOutline = () => [...surface(WEB_U, 12, -1, 18), ...K.arc(0, 0, RNE, 270, 90, 14), ...surface(12, WEB_U, 1, 18)];
// the tab's horn: a plate riveted under the tab's skin, its pin TAB_HORN below the tab hinge
export const HORN_PIN = [TAB_U, -M.TAB_HORN];
export const hornPlate = () => [[TSPAR_U + 2.5, -half(TSPAR_U + 2.5) - 0.1], [TSPAR_U + 16, -half(TSPAR_U + 16) - 0.1], [TAB_U + 4.5, HORN_PIN[1] - 1], [TAB_U + 2, HORN_PIN[1] - 4.2], [TAB_U - 2.5, HORN_PIN[1] - 3.6], [TAB_U - 4, HORN_PIN[1]], [TSPAR_U + 1.5, -half(TSPAR_U) - 2]];
// the piano hinge: the fixed leaf on the elevator's rear web with the knuckle; the tab's leaf on its spar
export const fixedLeaf = () => [[WEB_U, -half(WEB_U) + 1.6], [WEB_U + LEAF, -half(WEB_U) + 1.6], [WEB_U + LEAF, -1.1], ...K.arc(TAB_U, 0, KNUCKLE, 207, 207 + 333, 18).slice(1)];
export const knuckleBore = () => K.circle(TAB_U, 0, WIRE + 0.05, 16);
export const tabLeaf = () => [[TSPAR_U - LEAF, 3.1], [TSPAR_U, 3.1], [TSPAR_U, half(TSPAR_U) - 1.2], [TSPAR_U - LEAF, half(TSPAR_U) - 1.2]];

// ---------------------------------------------------------------- the actuator (Detail B), on its axis
export const AXV = M.AXIS_V; // −6
export const DRUM = { u0: 12, u1: 50, r: M.ACT_DRUM_R, groove: 1.3, pitch: 2.6, wraps: 2.5 };
export const BRG = { u0: 52, u1: 60, ri: 5, ro: 13, ball: 2.4 }; // 6000: 10 × 26 × 8
export const HOUS = { u0: 50, boss: 64, u1: 178, rBoss: 15, rTube: 12, bore: 9, end: 168 };
export const BUSH = { u0: 168, u1: 178, ri: 4.55, ro: 6 };
export const SCR = { u0: 12, u1: 178, r: M.SCREW.d / 2, root: M.SCREW.d / 2 - M.SCREW.lead / 2, journal: 4.5, t0: 80, t1: 138 };
export const NUT = { c0: 112, half: 9, r: 8.5, lug: 4, pinV: -20.5, lugBot: -23.6 };
export const nutC = (nut) => NUT.c0 - nut; // the nut runs forward for nose-up trim
export const PIN_R = 1.6;
export const EYE_R = 3.4;
export const ROD_R = 2.4;
const cMin = nutC(M.nutFor(M.TAB_LIMITS[1]));
const cMax = nutC(M.nutFor(M.TAB_LIMITS[0]));
export const STOPS = { f: [cMin - NUT.lug - 4.5, cMin - NUT.lug], a: [cMax + NUT.lug, cMax + NUT.lug + 4.5] }; // the slot's ends
export const SLOT_H = [STOPS.f[0], STOPS.a[1]]; // the housing's bottom slot
// The Acme thread's outline radius at u for a screw turned so its thread has moved by `shift` along the
// axis: a 29° trapezoid, crest and root each about a third of the lead. side −1: the far flank, half a
// lead on (one start).
export function threadR(u, shift, side = 1) {
  const p = M.SCREW.lead;
  const x = ((((u - shift - (side < 0 ? p / 2 : 0)) % p) + p) % p) / p;
  const lo = SCR.root;
  const hi = SCR.r;
  if (x < 0.36) return hi;
  if (x < 0.5) return hi - ((x - 0.36) / 0.14) * (hi - lo);
  if (x < 0.86) return lo;
  return lo + ((x - 0.86) / 0.14) * (hi - lo);
}
const threadEdge = (u0, u1, shift, side) => {
  const out = [];
  const n = Math.ceil((u1 - u0) / 0.125);
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n;
    out.push([u, AXV + side * threadR(u, shift, side)]);
  }
  // keep only the corners (where the slope changes), so the outline stays light
  return out.filter((q, i) => i === 0 || i === out.length - 1 || Math.abs(q[1] - out[i - 1][1] - (out[i + 1][1] - q[1])) > 1e-6);
};
// the screw's outline: front shank in the drum and bearing, the thread, the plain shank, the aft journal
export function screwOutline(shift) {
  const top = [[SCR.u0 + 0.6, AXV + SCR.r], [SCR.t0, AXV + SCR.r], ...threadEdge(SCR.t0, SCR.t1, shift, 1), [SCR.t1, AXV + SCR.r], [BUSH.u0 - 1, AXV + SCR.r], [BUSH.u0 - 0.5, AXV + SCR.journal], [SCR.u1 - 0.5, AXV + SCR.journal], [SCR.u1, AXV + SCR.journal - 0.5]];
  const bot = [[SCR.u1, AXV - SCR.journal + 0.5], [SCR.u1 - 0.5, AXV - SCR.journal], [BUSH.u0 - 0.5, AXV - SCR.journal], [BUSH.u0 - 1, AXV - SCR.r], [SCR.t1, AXV - SCR.r], ...threadEdge(SCR.t0, SCR.t1, shift, -1).reverse(), [SCR.t0, AXV - SCR.r], [SCR.u0 + 0.6, AXV - SCR.r], [SCR.u0, AXV - SCR.r + 0.6]];
  return [[SCR.u0, AXV + SCR.r - 0.6], ...top, ...bot];
}
// the nut, cut on the axis: its upper half, and its lower half with the lug and the pin's hole
export function nutHalves(nut, shift) {
  const c = nutC(nut);
  const u0 = c - NUT.half;
  const u1 = c + NUT.half;
  const inner = (side) => threadEdge(u0, u1, shift, side);
  const upper = [...inner(1), [u1, AXV + NUT.r], [u0, AXV + NUT.r]];
  // the lower half: along the thread, then out round the lug
  const lo = [...inner(-1), [u1, AXV - NUT.r], [c + NUT.lug, AXV - NUT.r], [c + NUT.lug, NUT.lugBot + 1.2], [c + NUT.lug - 1.2, NUT.lugBot], [c - NUT.lug + 1.2, NUT.lugBot], [c - NUT.lug, NUT.lugBot + 1.2], [c - NUT.lug, AXV - NUT.r], [u0, AXV - NUT.r]];
  return { upper, lower: lo, pin: [c, NUT.pinV] };
}
// the drum, cut: its upper and lower halves with the helical groove's profile, moved by `shift`
export function drumHalves(shift) {
  const g = DRUM.groove;
  const p = DRUM.pitch;
  const edge = (side) => {
    const out = [];
    const ph = ((shift % p) + p) % p + (side < 0 ? p / 2 : 0);
    for (let k = -1; k < 20; k++) {
      const c = DRUM.u0 + 1.4 + ph + k * p;
      if (c - g < DRUM.u0 + 0.6 || c + g > DRUM.u1 - 0.6) continue;
      for (let i = 0; i <= 6; i++) {
        const a = Math.PI - (Math.PI * i) / 6;
        out.push([c + g * Math.cos(a), AXV + side * (DRUM.r - g * Math.sin(a))]);
      }
    }
    return [[DRUM.u0 + 0.6, AXV + side * DRUM.r], ...out, [DRUM.u1 - 0.6, AXV + side * DRUM.r]];
  };
  const up = [[DRUM.u0, AXV + SCR.r + 0.05], [DRUM.u0, AXV + DRUM.r - 0.6], ...edge(1), [DRUM.u1, AXV + DRUM.r - 0.6], [DRUM.u1, AXV + SCR.r + 0.05]];
  const lo = [[DRUM.u1, AXV - SCR.r - 0.05], [DRUM.u1, AXV - DRUM.r + 0.6], ...edge(-1).reverse(), [DRUM.u0, AXV - DRUM.r + 0.6], [DRUM.u0, AXV - SCR.r - 0.05]];
  return { up, lo };
}
// where the two strands leave the drum: the cable is wound DRUM.wraps turns; both ends walk along the
// drum by one groove pitch a turn of the screw
const SCREW_T0 = M.screwTurns(M.TAB_LIMITS[0]);
export function strands(screwTurns) {
  const u = DRUM.u0 + 2.7 + (screwTurns - SCREW_T0) * DRUM.pitch;
  return { top: [u, AXV + DRUM.r - DRUM.groove + M.CABLE_D / 2], bot: [u + DRUM.wraps * DRUM.pitch, AXV - DRUM.r + DRUM.groove - M.CABLE_D / 2] };
}
// the housing, cut: the boss with the bearing's seat, the tube (its bottom slotted), the end wall with the bush
export function housingPieces() {
  const H = HOUS;
  const top = [[H.u0, AXV + BRG.ro], [H.u0, AXV + H.rBoss], [H.boss, AXV + H.rBoss], [H.boss, AXV + H.rTube], [H.u1, AXV + H.rTube], [H.u1, AXV + BUSH.ro], [H.end, AXV + BUSH.ro], [H.end, AXV + H.bore], [BRG.u1 + 0.0, AXV + H.bore], [BRG.u1, AXV + BRG.ro]];
  const botF = [[BRG.u1, AXV - BRG.ro], [BRG.u1, AXV - H.bore], [SLOT_H[0], AXV - H.bore], [SLOT_H[0], AXV - H.rTube], [H.boss, AXV - H.rTube], [H.boss, AXV - H.rBoss], [H.u0, AXV - H.rBoss], [H.u0, AXV - BRG.ro]];
  const botA = [[SLOT_H[1], AXV - H.bore], [H.end, AXV - H.bore], [H.end, AXV - BUSH.ro], [H.u1, AXV - BUSH.ro], [H.u1, AXV - H.rTube], [SLOT_H[1], AXV - H.rTube]];
  return [top, botF, botA];
}
export const stopBlocks = () => [K.rect(STOPS.f[0], AXV - HOUS.rTube, STOPS.f[1], AXV - HOUS.bore), K.rect(STOPS.a[0], AXV - HOUS.rTube, STOPS.a[1], AXV - HOUS.bore)];
export const bushHalves = () => [K.rect(BUSH.u0, AXV + BUSH.ri, BUSH.u1, AXV + BUSH.ro), K.rect(BUSH.u0, AXV - BUSH.ro, BUSH.u1, AXV - BUSH.ri)];
// the bearing: inner and outer rings cut, the balls (not hatched)
export function bearingPieces() {
  const b = BRG;
  const m = (b.ri + b.ro) / 2;
  const rings = [];
  for (const s of [1, -1]) {
    rings.push(K.rect(b.u0, AXV + s * b.ri, b.u1, AXV + s * (m - b.ball * 0.62)));
    rings.push(K.rect(b.u0, AXV + s * (m + b.ball * 0.62), b.u1, AXV + s * b.ro));
  }
  const balls = [1, -1].map((s) => K.circle((b.u0 + b.u1) / 2, AXV + s * m, b.ball, 16));
  return { inner: [rings[0], rings[2]], outer: [rings[1], rings[3]], balls };
}

// ---------------------------------------------------------------- the moving geometry for one state
// the tab's and the horn's pin for tab angle dt; the rod between the nut's pin and the horn's (or, with
// the rod off, hanging from the nut)
export const tabRot = (pts, dt) => X.rot(pts, [TAB_U, 0], -dt);
export function rodEnds(sol) {
  const a = [nutC(sol.nut), NUT.pinV];
  const hp = tabRot([HORN_PIN], sol.tab)[0];
  if (!sol.fail) return { a, b: hp, hp };
  // disconnected: the rod end has come off the horn and sags a little behind it
  const L = Math.hypot(hp[0] - a[0], hp[1] - a[1]) - 9;
  const ang = Math.atan2(HORN_PIN[1] - a[1], HORN_PIN[0] - a[0]) - 3 * rad;
  return { a, b: [a[0] + L * Math.cos(ang), a[1] + L * Math.sin(ang)], hp };
}
export function rodOutline([ax, ay], [bx, by], r) {
  const len = Math.hypot(bx - ax, by - ay) || 1e-6;
  const nx = (-(by - ay) / len) * r;
  const ny = ((bx - ax) / len) * r;
  return [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
}
// the rod with its two eyes: one outline (the union of a strip and two circles, hull of each end)
export function rodShape(a, b) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) / rad;
  const eA = K.arc(a[0], a[1], EYE_R, ang + 90, ang + 270, 12);
  const eB = K.arc(b[0], b[1], EYE_R, ang - 90, ang + 90, 12);
  const s = rodOutline(a, b, ROD_R);
  // strip edges meet the eyes where the eye is wider than the rod
  return [...eA, s[3], s[2], ...eB, s[1], s[0]].filter((q, i, arr) => i === 0 || Math.hypot(q[0] - arr[i - 1][0], q[1] - arr[i - 1][1]) > 0.01);
}

// ---------------------------------------------------------------- SVG pieces
const cut = (V, T, pts, mat, angle) => K.cut(V, T(pts), { mat, angle });
const body = (V, T, pts) => K.body(V, T(pts));
const solid = (V, T, pts) => K.cut(V, T(pts), { mat: "solid" });
const circleAt = (V, [u, v], r, cls = "vis") => {
  const [x, y] = V.p([u, v]);
  return `<circle class="${cls}" cx="${r2(x)}" cy="${r2(y)}" r="${r2(r * V.k)}"/>`;
};
const I = (p) => p;
// the elevator's structure (18): skins, spars, the hinge bolt
export function elevator(V, T = I, { slotSides = false } = {}) {
  let out = solid(V, T, skinUpper()) + solid(V, T, skinLowerAft()) + solid(V, T, frontSpar()) + solid(V, T, rearSpar());
  // the lower skin beyond the rod's slot (the plane runs along the slot): its edges, seen
  out += K.lines(V, [T(surface(SLOT[0], SLOT[1], -1, 12)), T(surface(SLOT[0], SLOT[1], -1, 12).map(([u, v]) => [u, v + SKIN]))], "vis");
  if (slotSides) out += "";
  out += body(V, T, K.circle(0, 0, 3.2, 16)) + circleAt(V, T([[0, 0]])[0], 1.2, "thin");
  return part(18, out);
}
// the actuator in the elevator: drum (7), screw (8), nut (9), bearing (10), housing (11), bush (12),
// stops (13); `fine` adds the thread and groove profiles (Detail B), else plain outlines (Section A-A)
export function actuator(V, sol, T = I, fine = true) {
  const shift = -sol.nut;
  const scr = fine ? screwOutline(shift) : K.rect(SCR.u0, AXV - SCR.r, SCR.u1, AXV + SCR.r);
  const roots = fine ? "" : K.lines(V, [-1, 1].map((s) => T([[SCR.t0, AXV + s * SCR.root], [SCR.t1, AXV + s * SCR.root]])), "thin");
  const dr = fine ? drumHalves(sol.screw * DRUM.pitch) : { up: K.rect(DRUM.u0, AXV + SCR.r, DRUM.u1, AXV + DRUM.r), lo: K.rect(DRUM.u0, AXV - DRUM.r, DRUM.u1, AXV - SCR.r) };
  const nut = fine ? nutHalves(sol.nut, shift) : (() => {
    const c = nutC(sol.nut);
    return {
      upper: K.rect(c - NUT.half, AXV + SCR.r, c + NUT.half, AXV + NUT.r),
      lower: [[c - NUT.half, AXV - SCR.r], [c + NUT.half, AXV - SCR.r], [c + NUT.half, AXV - NUT.r], [c + NUT.lug, AXV - NUT.r], [c + NUT.lug, NUT.lugBot], [c - NUT.lug, NUT.lugBot], [c - NUT.lug, AXV - NUT.r], [c - NUT.half, AXV - NUT.r]],
      pin: [c, NUT.pinV],
    };
  })();
  const br = bearingPieces();
  const hs = housingPieces();
  const st = strands(sol.screw);
  const drumPin = K.lines(V, [T([[DRUM.u0 + 5, AXV + SCR.r], [DRUM.u0 + 5, AXV + DRUM.r - DRUM.groove - 1]])], "thin");
  return (
    part(11, hs.map((p) => cut(V, T, p, "alu", 135)).join("")) +
    part(10, br.inner.map((p) => cut(V, T, p, "steel", 30)).join("") + br.outer.map((p) => cut(V, T, p, "steel", 60)).join("") + br.balls.map((p) => body(V, T, p)).join("")) +
    part(12, bushHalves().map((p) => cut(V, T, p, "bronze", 45)).join("")) +
    part(13, stopBlocks().map((p) => cut(V, T, p, "steel", 45)).join("")) +
    part(8, body(V, T, scr) + roots) +
    part(7, cut(V, T, dr.up, "alu", 45) + cut(V, T, dr.lo, "alu", 45) + drumPin) +
    part(9, cut(V, T, nut.upper, "bronze", 45) + cut(V, T, nut.lower, "bronze", 45)) +
    part(5, [st.top, st.bot].map((c) => body(V, T, K.circle(c[0], c[1], M.CABLE_D / 2, 12))).join(""))
  );
}
// the rod (14) with its pins, the horn (15), the tab (17) with its leaf; T is the elevator's transform
export function rodHornTab(V, sol, T = I) {
  const tt = (pts) => T(tabRot(pts, sol.tab));
  const e = rodEnds(sol);
  const rod = body(V, T, rodShape(e.a, e.b)) + circleAt(V, T([e.a])[0], PIN_R) + (sol.fail ? circleAt(V, T([e.b])[0], PIN_R * 0.9, "thin") : "");
  const hornPin = circleAt(V, tt([HORN_PIN])[0], PIN_R);
  return (
    part(17, solid(V, tt, tabSkin()) + solid(V, tt, tabSpar())) +
    part(15, cut(V, tt, hornPlate(), "steel", 135) + hornPin) +
    part(14, rod)
  );
}
// the piano hinge (16): the fixed leaf and its knuckle, the wire, the tab's leaf (turns with the tab)
export function hinge(V, sol, T = I) {
  const tt = (pts) => T(tabRot(pts, sol.tab));
  return part(16, solid(V, T, fixedLeaf()) + `<path class="paper" d="${K.d(V, T(knuckleBore()))}"/>` + body(V, T, K.circle(TAB_U, 0, WIRE, 16)) + solid(V, tt, tabLeaf()));
}
// rivets in Detail C: through each leaf and its web
export function rivets(V, sol, T = I) {
  const tt = (pts) => T(tabRot(pts, sol.tab));
  const r = (u0, u1, v) => K.rect(u0, v - 0.8, u1, v + 0.8);
  return body(V, T, r(WEB_U - SKIN - 0.6, WEB_U + LEAF + 0.6, -half(WEB_U) + 3.6)) + body(V, tt, r(TSPAR_U - LEAF - 0.6, TSPAR_U + SKIN + 0.6, half(TSPAR_U) - 3.2));
}

// ---------------------------------------------------------------- hinge-moment arrows (Section A-A)
// a curved arrow about centre c (sheet), radius R: sweep ∝ |m|, clockwise for m > 0 (TE down)
export function momentArrow(c, R, m, a0, cls = "vis") {
  const sweep = Math.min(150, 26 + 110 * Math.abs(m));
  const dir = m > 0 ? 1 : -1;
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const a = (a0 + (dir * sweep * i) / 14) * rad;
    pts.push([c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)]);
  }
  const [ex, ey] = pts[14];
  const [px, py] = pts[13];
  const l = Math.hypot(ex - px, ey - py) || 1;
  const ux = (ex - px) / l;
  const uy = (ey - py) / l;
  const head = `M${r2(ex + ux * 6)} ${r2(ey + uy * 6)}L${r2(ex - uy * 2.4)} ${r2(ey + ux * 2.4)}L${r2(ex + uy * 2.4)} ${r2(ey - ux * 2.4)}Z`;
  return `<path class="${cls}" fill="none" d="M${pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join("L")}"/><path class="${cls.includes("accent") ? "accent-fill" : "head"}" d="${head}"/>`;
}

// ---------------------------------------------------------------- View D: the pedestal, from the port side
export const PED = { fs0: 262, fs1: 628, wl0: A.CABIN.floor, wl1: 1012, slot: [300, 560] };
export const WHEEL = { fs: FC.TRIM.fs, wl: FC.TRIM.wl, r: M.TRIM_WHEEL_D / 2, rim: 14, hub: 22 };
export const IND = { fs: 288, wl0: 925, wl1: 995 };
export const indWl = (ind) => IND.wl0 + ((ind + M.IND_SWEEP / 2) / M.IND_SWEEP) * (IND.wl1 - IND.wl0);
export function pedestal(V) {
  const P = PED;
  const o = [[P.fs0, P.wl0], [P.fs1, P.wl0], [P.fs1, P.wl1 - 40], [P.fs1 - 40, P.wl1], [P.slot[1], P.wl1], [P.slot[1], P.wl1 - 8], [P.slot[0], P.wl1 - 8], [P.slot[0], P.wl1], [P.fs0 + 20, P.wl1], [P.fs0, P.wl1 - 20]];
  const inner = [[P.fs0 + 14, P.wl0], [P.fs0 + 14, P.wl1 - 26], [P.fs1 - 14, P.wl1 - 26], [P.fs1 - 14, P.wl0]];
  // the indicator's slot in the side plate
  const sl = K.rrect(IND.fs - 4, IND.wl0 - 6, IND.fs + 4, IND.wl1 + 6, 4);
  return part(4, `<path class="paper" d="${K.d(V, o)}"/><path class="vis" d="${K.d(V, o)}"/>` + K.line(V, inner, "hid") + `<path class="vis" d="${K.d(V, sl)}"/>`);
}
export function trimWheel(V, turns) {
  const W = WHEEL;
  const a0 = -turns * 360; // roll the top aft (clockwise from the port side) for nose up
  const rim = X.cutHoles(V, K.circle(W.fs, W.wl, W.r, 72), [K.circle(W.fs, W.wl, W.r - W.rim, 72)], { mat: "solid" }).replace(/class="solid"/, 'class="paper"');
  let grips = [];
  for (let i = 0; i < 36; i++) {
    const a = (a0 + i * 10) * rad;
    grips.push([[W.fs + (W.r - 4) * Math.cos(a), W.wl + (W.r - 4) * Math.sin(a)], [W.fs + W.r * Math.cos(a), W.wl + W.r * Math.sin(a)]]);
  }
  let spokes = "";
  for (let i = 0; i < 3; i++) {
    const a = a0 + 90 + i * 120;
    const s = X.rot(K.rect(W.fs + W.hub - 2, W.wl - 7, W.fs + W.r - W.rim + 1, W.wl + 7), [W.fs, W.wl], a);
    spokes += K.body(V, s);
  }
  const ring = `<path class="paper" fill-rule="evenodd" d="${K.d(V, K.circle(W.fs, W.wl, W.r, 72))}${K.d(V, K.circle(W.fs, W.wl, W.r - W.rim, 72))}"/><path class="vis" fill-rule="evenodd" fill="none" d="${K.d(V, K.circle(W.fs, W.wl, W.r, 72))}${K.d(V, K.circle(W.fs, W.wl, W.r - W.rim, 72))}"/>`;
  void rim;
  return part(1, ring + K.lines(V, grips, "thin") + spokes + K.body(V, K.circle(W.fs, W.wl, W.hub, 24)) + K.centerMark(V, [W.fs, W.wl], 8));
}
// the cockpit drum behind the wheel (hidden but for the spokes' gaps: drawn dashed), and its strands
export function cockpitDrum(V) {
  const W = WHEEL;
  const R = M.TRIM_DRUM_R;
  return part(2, `<path class="hid" fill="none" d="${K.d(V, K.circle(W.fs, W.wl, R, 36))}"/>`);
}
export function indicator(V, ind) {
  const w = indWl(ind);
  const p = [[IND.fs - 9, w - 2.5], [IND.fs + 6, w - 2.5], [IND.fs + 12, w], [IND.fs + 6, w + 2.5], [IND.fs - 9, w + 2.5]];
  return part(3, K.body(V, p));
}
export function indicatorScale(V) {
  // marks on the side plate beside the slot: nose down, take-off, nose up
  const marks = [M.TAB_LIMITS[0], M.TAKEOFF_TAB, M.TAB_LIMITS[1]].map((dt) => indWl(M.indicatorFor(dt)));
  return K.lines(V, marks.map((w, i) => [[IND.fs + 8, w], [IND.fs + (i === 1 ? 20 : 15), w]]), "thin");
}

// ---------------------------------------------------------------- View E: the trim cable run, from the port side
export function cableRun() {
  const sol = FC.solve(FC.state());
  const ps = FC.pose(sol);
  const runs = FC.cables(ps, sol).filter(([n]) => n.startsWith("trim"));
  return runs.map(([n, run]) => ({ name: n, pts: run.pts.map(([fs, , wl]) => [fs, wl]), wraps: run.wraps.map((w) => ({ name: w.name, c: [w.c[0], w.c[2]] })) }));
}
export function fuselage(V) {
  const C = A.CABIN;
  const T = A.TAILCONE;
  const L = [];
  L.push([[0, C.floor], [C.fs1, C.floor]]);
  L.push([[0, 1770], [650, C.roof], [C.fs1, C.roof]]);
  L.push([[0, C.floor - 60], [0, 1770]]);
  const up = [];
  const lo = [];
  for (let i = 0; i <= 12; i++) {
    const fs = T.fs0 + ((T.fs1 - T.fs0) * i) / 12;
    const r = A.coneR(fs);
    up.push([fs, Math.min(C.roof, T.axis + r)]);
    lo.push([fs, T.axis - r]);
  }
  L.push(up, lo, [[C.fs1, C.roof], up[0]], [[C.fs1, C.floor], lo[0]]);
  // the tailplane's chord line and the fin's leading edge
  L.push([[TP.le, TP.wl], [TP.te, TP.wl]]);
  return `<g data-role="phantom">${L.map((p) => K.line(V, p, "phan")).join("")}</g>`;
}
