// The door closer's parts, in world mm.
// SECTION A-A is a plan section through the cylinder axis: u along the axis (+u toward the valve
// end and the hinge), v across the body (+v away from the door face), the spindle axis at (0, 0).
// Each function draws one part into a view and returns SVG, so the section, Detail C and Detail F
// draw the same geometry at their own scale. The piston is drawn at x = 0 (door shut) and moved
// with a transform; only parts whose shape changes (spring, pinion angle, needles, ball) are
// redrawn.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";
import * as X from "./extra.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;

const rad = Math.PI / 180;
export const BODY = { u0: -175, u1: 80, v: 32, w: 34 };
export const DRILL_V = 26; // the valve drillings and galleries, both sides
const GAL = 1.25; // Ø2.5 gallery
const STEM_BORE = 1.75; // Ø3.5 needle bore
const THREAD = 2.5; // M5
const PR = M.PORT_D / 2;

// ---------------------------------------------------------------- body (cut)

// One wall of the body, drawn for +v; the other side is the same with its own seat and port.
function wall(seat, port) {
  const g0 = DRILL_V - GAL;
  const g1 = DRILL_V + GAL;
  const s0 = DRILL_V - STEM_BORE;
  const s1 = DRILL_V + STEM_BORE;
  const t0 = DRILL_V - THREAD;
  const t1 = DRILL_V + THREAD;
  const { u0, u1, v } = BODY;
  return [
    [[u0, g1], [seat, g1], [seat, s1], [70, s1], [70, t1], [u1, t1], [u1, v - 1], [u1 - 1, v], [u0 + 1, v], [u0, v - 1]],
    [[u0, 21], [-166, 21], [-166, 20], [-159, 20], [-149, g0], [u0, g0]],
    [[-156.5, 20], [port - PR, 20], [port - PR, s0], [seat, s0], [seat, g0], [-146.5, g0]],
    [[port + PR, 20], [71, 20], [71, 21], [u1, 21], [u1, t0], [70, t0], [70, s0], [port + PR, s0]],
  ];
}
const flip = (pts) => K.flipV(pts, 0);

export function body(V) {
  const up = wall(M.LATCH_SEAT, M.LATCH_U);
  const down = wall(M.SWEEP_SEAT, M.SWEEP_U).map(flip);
  const cuts = [...up, ...down].map((p) => K.cut(V, p, { mat: "alu", angle: 45 })).join("");
  // tapped holes for the plugs and screws: the minor diameter is hidden by the thread in them
  return part(1, cuts);
}

// ---------------------------------------------------------------- end plugs, O-rings

const plugLoop = (inner, dir) => {
  // dir +1: plug on the right (valve end), -1: on the left (spring end)
  const s = (d) => inner + dir * d;
  const len = dir > 0 ? 13 : 15;
  const spig = dir > 0 ? 4 : 6;
  const g0 = dir > 0 ? 1 : 1.6;
  return [[0, s(0)], [20, s(0)], [20, s(g0)], [18.4, s(g0)], [18.4, s(g0 + 2.4)], [20, s(g0 + 2.4)], [20, s(spig)], [21, s(spig)], [21, s(len)], [5.8, s(len)], [5.8, s(len - 5)], [0, s(len - 5)]];
};

function plug(V, n, inner, dir, angle) {
  const loop = plugLoop(inner, dir);
  const rev = K.revolve(loop, { axis: "u", at: 0 });
  const spig = dir > 0 ? 4 : 6;
  const len = dir > 0 ? 13 : 15;
  const a = inner + dir * (spig + 0.4);
  const b = inner + dir * len;
  const roots = [[[a, 20.2], [b, 20.2]], [[a, -20.2], [b, -20.2]]];
  return part(n, K.section(V, { ...rev, edges: [] }, { mat: "steel", angle }) + K.lines(V, roots, "thin") +
    // the bottom of the hex socket, seen through it
    K.line(V, [[inner + dir * (len - 5), -5.8], [inner + dir * (len - 5), 5.8]], "vis"));
}
export const plugL = (V) => plug(V, 2, M.PLUG_L, -1, 135);
export const plugR = (V) => plug(V, 3, M.PLUG_R, 1, 135);

export function plugOrings(V) {
  const ring = (inner, dir) => {
    const g0 = dir > 0 ? 1 : 1.6;
    const a = inner + dir * g0;
    const b = inner + dir * (g0 + 2.4);
    const s0 = Math.min(a, b) + 0.15;
    const s1 = Math.max(a, b) - 0.15;
    return [K.rrect(s0, 18.4, s1, 20, 0.7), K.rrect(s0, -20, s1, -18.4, 0.7)];
  };
  return part(4, [...ring(M.PLUG_L, -1), ...ring(M.PLUG_R, 1)].map((p) => K.cut(V, p, { mat: "rubber" })).join(""));
}

// ---------------------------------------------------------------- piston (drawn at x = 0)

const RACK_VP = M.R_P + M.SHIFT * M.MODULE; // the rack's reference line, for the shifted pinion
const RACK_ROOT = RACK_VP + 1.25 * M.MODULE;
export const WIN = { l: -17, r: 45, back: -16.6 };
export const CHECK = { seat: 50, pin: 56, cham: 57, face: M.FACE_R, r0: 1.25, r1: 2.2, ball: 2 };
export const ballSeatU = CHECK.seat + Math.sqrt(CHECK.ball ** 2 - CHECK.r0 ** 2);

export function pistonLoops() {
  const F = M.FACE_R;
  const H = M.HEAD_L;
  const { l, r, back } = WIN;
  const c = CHECK;
  const rack = X.rackEdge(l, r, RACK_VP, M.MODULE);
  const upper = [
    [H, 9.5], [l, 9.5], ...rack, [r, c.r0], [c.seat, c.r0], [c.seat, c.r1], [c.cham, c.r1], [c.cham, c.r0], [F, c.r0],
    [F, 19.2], [F - 0.8, 20], [57, 20], [57, 18.5], [53, 18.5], [53, 20], [H + 0.8, 20], [H, 19.2],
  ];
  const mid = K.rect(H, -4.5, l, 4.5);
  const lower = [
    [H, -19.2], [H + 0.8, -20], [53, -20], [53, -18.5], [57, -18.5], [57, -20], [F - 0.8, -20], [F, -19.2],
    [F, -c.r0], [c.cham, -c.r0], [c.cham, -c.r1], [c.seat, -c.r1], [c.seat, -c.r0], [r, -c.r0], [r, back], [l, back], [l, -9.5], [H, -9.5],
  ];
  return { upper, mid, lower };
}

export function piston(V) {
  const { upper, mid, lower } = pistonLoops();
  const o = { mat: "steel", angle: 135 };
  return part(5, K.cut(V, upper, o) + K.cut(V, mid, o) + K.cut(V, lower, o));
}

export function pistonRing(V) {
  return part(6, [K.rect(53, 18.5, 57, 20), K.rect(53, -20, 57, -18.5)].map((p) => K.cut(V, p, { mat: "plastic", angle: 45 })).join(""));
}

export function ball(V, lift = 0) {
  return part(9, K.body(V, K.circle(ballSeatU + lift, 0, CHECK.ball, 40)));
}

export function pin(V) {
  return part(10, K.cut(V, K.circle(CHECK.pin, 0, 0.75, 20), { mat: "steel", angle: 45 }));
}

// ---------------------------------------------------------------- spring (redrawn)

export function spring(V, x) {
  return part(7, K.springSection(V, { from: M.PLUG_L, to: M.HEAD_L - x, radius: M.COIL_D / 2, wire: M.WIRE, turns: M.COILS, axis: "u", at: 0 }));
}

// ---------------------------------------------------------------- pinion (cut across, rotates)

export function pinion(V, phiDeg = 0) {
  const g = X.gear(0, 0, M.Z, M.MODULE, 90 + phiDeg, M.SHIFT);
  return part(8, K.cut(V, g, { mat: "steel", angle: 30 }));
}

// ---------------------------------------------------------------- regulating screws (not cut)

// The screw along v = side·26, its needle seat at `seat`, backed off by `lift` mm. The cone seals on
// the sharp edge of the Ø2.5 drilling; a neck behind it leaves the port room to feed the seat.
export const NEEDLE = { tipR: 0.3, coneR: 1.5, neckR: 1.0, neck: 4, stemR: 1.65 };
export function needleScrew(V, n, side, seat, lift) {
  const a = M.NEEDLE_HALF * rad;
  const N = NEEDLE;
  const apex = seat - GAL / Math.tan(a) + lift;
  const tip = apex + N.tipR / Math.tan(a);
  const cone = apex + N.coneR / Math.tan(a);
  const e = 80.5 + lift;
  const c = side * DRILL_V;
  const prof = [
    [tip, N.tipR], [cone, N.coneR], [cone + 0.3, N.neckR], [cone + N.neck - 0.3, N.neckR], [cone + N.neck, N.stemR],
    [66.5, N.stemR], [66.5, 1.15], [68.5, 1.15], [68.5, N.stemR], [70.2, N.stemR], [70.6, 2.5],
    [e - 0.3, 2.5], [e, 2.2], [e, 0.4], [e - 1.2, 0.4],
  ];
  const pts = [...prof.map(([u, r]) => [u, c + r]), ...prof.slice().reverse().map(([u, r]) => [u, c - r])];
  const roots = [[[71.2, c + 2.1], [e - 0.4, c + 2.1]], [[71.2, c - 2.1], [e - 0.4, c - 2.1]]];
  return part(n, K.body(V, pts) + K.lines(V, roots, "thin"));
}

export const sweepScrew = (V, lift = M.lift(M.SWEEP_TURNS)) => needleScrew(V, 11, -1, M.SWEEP_SEAT, lift);
export const latchScrew = (V, lift = M.lift(M.LATCH_TURNS)) => needleScrew(V, 12, 1, M.LATCH_SEAT, lift);

export function screwOrings(V) {
  const ring = (side) => {
    const c = side * DRILL_V;
    return [K.rect(66.65, c + 1.15, 68.35, c + 1.75), K.rect(66.65, c - 1.75, 68.35, c - 1.15)];
  };
  return part(13, [...ring(1), ...ring(-1)].map((p) => K.cut(V, p, { mat: "solid" })).join(""));
}

export function sealBalls(V) {
  return part(14, K.body(V, K.circle(BODY.u0 + GAL, DRILL_V, GAL, 24)) + K.body(V, K.circle(BODY.u0 + GAL, -DRILL_V, GAL, 24)));
}

// ---------------------------------------------------------------- oil

// The pressure chamber and everything open to it, at piston position x.
export function oilHigh(x) {
  const f = M.faceU(x);
  const c = CHECK;
  return [
    K.rect(f - 0.01, -20, M.PLUG_R + 0.01, 20),
    K.rect(M.LATCH_U - PR, 19.99, M.LATCH_U + PR, DRILL_V),
    K.rect(M.LATCH_SEAT, DRILL_V - STEM_BORE, 70.01, DRILL_V + STEM_BORE),
    K.rect(M.SWEEP_U - PR, -DRILL_V, M.SWEEP_U + PR, -19.99),
    K.rect(M.SWEEP_SEAT, -DRILL_V - STEM_BORE, 70.01, -DRILL_V + STEM_BORE),
    K.rect(c.seat - x, -c.r1, f + 0.01, c.r1),
  ];
}

// The spring side: spring chamber, the window round the pinion, the galleries back from the seats.
export function oilLow(x) {
  const H = M.HEAD_L - x;
  const sh = (u) => u - x;
  return [
    K.rect(M.PLUG_L - 0.01, -20, H + 0.01, 20),
    K.rect(H, 4.5, sh(WIN.l), 9.5),
    K.rect(H, -9.5, sh(WIN.l), -4.5),
    K.rect(sh(WIN.l) - 0.01, WIN.back, sh(WIN.r) + 0.01, RACK_ROOT),
    K.rect(sh(WIN.r) - 0.01, -CHECK.r0, sh(CHECK.seat) + 0.01, CHECK.r0),
    K.rect(BODY.u0 + 2 * GAL, DRILL_V - GAL, M.LATCH_SEAT + 0.01, DRILL_V + GAL),
    K.rect(BODY.u0 + 2 * GAL, -DRILL_V - GAL, M.SWEEP_SEAT + 0.01, -DRILL_V + GAL),
    [[-159, 20.01], [-156.5, 20.01], [-146.5, DRILL_V - GAL + 0.01], [-149, DRILL_V - GAL + 0.01]],
    [[-159, -20.01], [-149, -DRILL_V + GAL - 0.01], [-146.5, -DRILL_V + GAL - 0.01], [-156.5, -20.01]],
  ];
}

export const oilPath = (V, shapes) => shapes.map((s) => K.d(V, s)).join("");

// The way the oil goes when the door closes, through each needle (accent flow lines).
// Each runs from the pressure chamber down its port, over the needle's neck, through the throat at
// the seat, along the cone and the gallery, and back into the spring chamber.
function flowPath(side, seat, port, start) {
  const s = side;
  const D = DRILL_V;
  const a = M.NEEDLE_HALF * rad;
  const apex = seat - GAL / Math.tan(a);
  const gap = (u) => Math.min(GAL - 0.25, (u - apex) * Math.tan(a) + 0.25);
  return [
    start, [port, s * 18.5], [port, s * (D - STEM_BORE - 0.3)], [seat + 1.4, s * (D - STEM_BORE - 0.3)], [seat, s * (D - GAL + 0.06)],
    [seat - 3, s * (D - gap(seat - 3))], [seat - 6, s * (D - gap(seat - 6))], [apex - 1, s * D], [-146.5, s * D], [-148, s * 24.6], [-157.6, s * 20.2],
  ];
}
export const flowSweep = (x) => flowPath(-1, M.SWEEP_SEAT, M.SWEEP_U, [M.faceU(x) + 2.4, -11]);
export const flowLatch = () => flowPath(1, M.LATCH_SEAT, M.LATCH_U, [M.LATCH_U, 11]);

// ---------------------------------------------------------------- PLAN E (door and arm from above)

// Door-frame coordinates: along the leaf from the hinge (a), out of the pull face (n).
export function doorFrame(theta) {
  const t = theta * rad;
  const d = [-Math.cos(t), Math.sin(t)];
  const n = [Math.sin(t), Math.cos(t)];
  return ([a, s]) => [a * d[0] + s * n[0], a * d[1] + s * n[1]];
}

export function leaf(theta) {
  const P = doorFrame(theta);
  return [[8, 0], [M.DOOR_W, 0], [M.DOOR_W, -M.DOOR_T], [8, -M.DOOR_T], [0, -M.DOOR_T + 8]].map(P);
}

export function closerTop(theta) {
  const P = doorFrame(theta);
  // the body from above: valve end toward the hinge
  return K.rrect(M.SPINDLE_A - BODY.u1, 0, M.SPINDLE_A - BODY.u0, 2 * BODY.v, 4).map(P);
}

export function planMoving(V, theta) {
  const L = M.link(theta);
  const S = L.S;
  const E = L.E;
  const F = M.SHOE;
  let out = "";
  out += part(21, K.body(V, leaf(theta)));
  out += part(1, K.body(V, closerTop(theta)));
  out += part(17, K.body(V, X.bar(E, F, 14)));
  out += part(16, K.body(V, X.bar(S, E, 18)));
  out += part(20, K.body(V, K.circle(E[0], E[1], 4, 16)));
  out += part(19, K.body(V, K.circle(S[0], S[1], 5, 20)));
  return out;
}

export function planPhantom(V, theta) {
  const L = M.link(theta);
  return (
    K.line(V, leaf(theta), "phan", true) +
    K.line(V, closerTop(theta), "phan", true) +
    K.line(V, X.bar(L.S, L.E, 18), "phan", true) +
    K.line(V, X.bar(L.E, M.SHOE, 14), "phan", true)
  );
}

export function shoe(V) {
  const [u, v] = M.SHOE;
  return part(18, K.body(V, K.rrect(u - 22, 0, u + 22, v + 9, 2)) + K.body(V, K.circle(u, v, 4, 16)));
}

// ---------------------------------------------------------------- SECTION B-B: across the cylinder at the spindle

// In SECTION B-B, world (v, w): v to the right, w (height) up, the spindle axis vertical at v = 0.
// A cut face with holes in it (galleries cut across), filled even-odd.
function cutWithHoles(V, outer, holes, { mat, angle }) {
  const dd = K.d(V, outer) + holes.map((h) => K.d(V, h)).join("");
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path fill="url(#h-${mat}-${angle})" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
}

const BRG = { r: 11, cup: 0.6, roller: 2.4, w0: 20.6, w1: 30.6, seal: 33.6 };
export const SP = { journal: 8, square: 5.5, face: 12, top: 46, shoulder: 35 };

export function bodyB(V) {
  const { v, w } = BODY;
  const yb = Math.sqrt(M.R_BORE ** 2 - BRG.r ** 2);
  const a0 = (Math.atan2(yb, -BRG.r) * 180) / Math.PI;
  const left = [
    [-BRG.r, w], [-v + 1, w], [-v, w - 1], [-v, -w + 1], [-v + 1, -w], [-BRG.r, -w], [-BRG.r, -yb],
    ...K.arc(0, 0, M.R_BORE, 360 - a0, a0, 24),
    [-BRG.r, yb],
  ];
  const hole = (c) => K.circle(c, 0, GAL, 20);
  return part(1, cutWithHoles(V, left, [hole(-DRILL_V)], { mat: "alu", angle: 45 }) + cutWithHoles(V, K.flipU(left), [hole(DRILL_V)], { mat: "alu", angle: 45 }));
}

export function pistonB(V) {
  const seg = (v0, side) => {
    const h = Math.sqrt(M.R_BORE ** 2 - v0 ** 2);
    const a = (Math.atan2(h, v0) * 180) / Math.PI;
    return side > 0 ? [[v0, -h], ...K.arc(0, 0, M.R_BORE, -a, a, 10), [v0, h]] : [[v0, h], ...K.arc(0, 0, M.R_BORE, 180 - a, 180 + a, 10), [v0, -h]];
  };
  const o = { mat: "steel", angle: 135 };
  return part(5, K.cut(V, seg(RACK_ROOT, 1), o) + K.cut(V, seg(WIN.back, -1), o));
}

export function spindleB(V) {
  const s = SP;
  const right = [[s.square, s.top], [s.square, s.shoulder], [s.journal, s.shoulder], [s.journal, s.face], [M.R_P + M.MODULE - 0.5, s.face], [M.R_P + M.MODULE, s.face - 0.5]];
  const half = [...right, ...K.flipV(right, 0).map(([a, b]) => [a, b])];
  const outline = [...half, ...K.flipU(half, 0)];
  const rf = M.R_P - (1.25 - M.SHIFT) * M.MODULE;
  const roots = [[[rf, -s.face], [rf, s.face]], [[-rf, -s.face], [-rf, s.face]]];
  return part(8, K.body(V, outline) + K.lines(V, roots, "thin"));
}

export function bearingsB(V) {
  let out = "";
  for (const sw of [1, -1])
    for (const sv of [1, -1]) {
      const cup = K.rect(sv > 0 ? BRG.r - BRG.cup : -BRG.r, sw > 0 ? BRG.w0 : -BRG.w1, sv > 0 ? BRG.r : -BRG.r + BRG.cup, sw > 0 ? BRG.w1 : -BRG.w0);
      const rv0 = sv > 0 ? SP.journal : -BRG.r + BRG.cup;
      const roller = K.rect(rv0, sw > 0 ? BRG.w0 + 0.9 : -BRG.w1 + 0.9, rv0 + BRG.roller, sw > 0 ? BRG.w1 - 0.9 : -BRG.w0 - 0.9);
      out += K.cut(V, cup, { mat: "solid" }) + K.body(V, roller);
    }
  return part(22, out);
}

export function sealsB(V) {
  let out = "";
  for (const sw of [1, -1])
    for (const sv of [1, -1]) {
      const r = K.rect(sv > 0 ? SP.journal : -BRG.r, sw > 0 ? BRG.w1 + 0.3 : -BRG.seal, sv > 0 ? BRG.r : -SP.journal, sw > 0 ? BRG.seal : -BRG.w1 - 0.3);
      out += K.cut(V, r, { mat: "rubber" });
    }
  return part(23, out);
}

export function oilB() {
  return [K.circle(0, 0, M.R_BORE - 0.01, 72)];
}
