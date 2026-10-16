// The circuit breaker's parts, in world mm: u from the back of the case (on the DIN rail) to the
// front, v up from the load end. Each function draws one part into a view and returns SVG, so the
// section and every detail draw the same geometry at their own scale. Moving parts take a pose
//   S = { h, c, a, pawl, lever, plunger, f }
// (handle, cradle and arm angles in degrees CCW; pawl CCW; trip lever CW; plunger travel and
// bimetal tip deflection in mm) and are drawn at it.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";
import * as X from "./extra.mjs";

export const part = (id, inner) => `<g data-part="${id}">${inner}</g>`;

export const H = M.H;
export const MP = M.M;
export const T = M.T;
export const VC = 35; // solenoid axis
export const CLOSED = { h: M.HANDLE_ON, c: 0, a: 0, pawl: 0, lever: 0, plunger: 0, f: 0 };

const peg = (V, [u, v], r) => K.cut(V, K.circle(u, v, r, 20), { mat: "plastic", angle: 45 });
const pin = (V, [u, v], r, angle = 45) => K.cut(V, K.circle(u, v, r, 20), { mat: "steel", angle });

// ---------------------------------------------------------------- housing (cut on its centre plane)

export const SPRING_POST_ARM = [41, 67.4];
export const SPRING_POST_HANDLE = [40.5, 40.5];

export function housing(V) {
  const back = [
    [0, 27.5], [0, 62.6], [-1.1, 62.6], [-1.1, 60.8], [-1.8, 60.8], [-1.8, 65.5], [0, 65.5],
    [0, 89], [1, 90], [39.6, 90], [39.6, 88], [2, 88], [2, 29.5], [5, 29.5], [5, 2], [39.6, 2], [39.6, 0], [4, 0], [3, 1], [3, 27.5],
  ];
  const topFront = [[46.8, 90], [59, 90], [60, 89], [60, 83], [58, 83], [58, 88], [46.8, 88]];
  const humpTop = [[58, 77], [60, 77], [60, 67.5], [69, 67.5], [70, 66.5], [70, 54.5], [68, 54.5], [68, 65.5], [58, 65.5]];
  const humpLow = [[68, 35.5], [70, 35.5], [70, 23.5], [69, 22.5], [60, 22.5], [60, 13], [58, 13], [58, 24.5], [68, 24.5]];
  const lowFront = [[58, 7], [60, 7], [60, 1], [59, 0], [46.8, 0], [46.8, 2], [58, 2]];
  const walls = [back, topFront, humpTop, humpLow, lowFront].map((p) => K.cut(V, p, { mat: "plastic", angle: 45 })).join("");
  // moulded pegs that carry the pivots and the springs, cut across
  const pegs = peg(V, T, 1) + peg(V, SPRING_POST_ARM, 1) + peg(V, SPRING_POST_HANDLE, 1);
  // bosses of the far half, seen beyond the plane
  const bosses = K.line(V, K.circle(...H, 8.6, 40), "vis", true);
  return part(1, bosses + walls + pegs);
}

// The DIN rail clip: a POM slider in a channel at the back, its nose under the rail's lower brim.
export function clip(V) {
  const slider = [
    [0.3, -3], [2.7, -3], [2.7, 25.5], [0.3, 27.4], [-1.1, 27.4], [-1.1, 29.2], [-1.8, 29.2], [-1.8, 25.5], [0.3, 25.5],
  ];
  const tab = K.line(V, [[0.6, -1.6], [2.4, -1.6]], "thin");
  const slot = K.line(V, K.rrect(0.9, 4, 2.1, 20, 0.6), "vis", true);
  return part(2, K.cut(V, slider, { mat: "plastic", angle: 135 }) + tab + slot);
}

// The DIN rail TH35-7.5 (EN 60715) and the mounting plate: adjacent parts, phantom.
export function rail(V) {
  const prof = [
    [0, 27.5], [0, 31.5], [-6.5, 31.5], [-6.5, 58.5], [0, 58.5], [0, 62.5], [-1, 62.5], [-1, 59.5],
    [-7.5, 59.5], [-7.5, 30.5], [-1, 30.5], [-1, 27.5],
  ];
  return K.line(V, prof, "phan", true);
}

// ---------------------------------------------------------------- terminals

// A box terminal: cage walls either side of the wire, the screw through the front wall.
function cage(V, vs) {
  const wall = (u0, u1) => K.cut(V, K.rect(u0, vs - 6, u1, vs + 6), { mat: "steel", angle: 135 });
  const front = K.cut(V, K.rect(52.8, vs - 6, 54, vs - 2.5), { mat: "steel", angle: 135 }) + K.cut(V, K.rect(52.8, vs + 2.5, 54, vs + 6), { mat: "steel", angle: 135 });
  return wall(39, 40.2) + front;
}
export function cages(V) {
  return part(3, cage(V, 80) + cage(V, 10));
}

// Terminal screw M5×12, pan head, captive in the cage (not hatched: a screw cut lengthwise).
function screw(V, vs) {
  const shank = [[47.8, vs - 2.1], [48.2, vs - 2.5], [54, vs - 2.5], [54, vs + 2.5], [48.2, vs + 2.5], [47.8, vs + 2.1]];
  const head = [[54, vs - 4.2], [55, vs - 4.75], [57, vs - 4.75], [57.5, vs - 4.2], [57.5, vs + 4.2], [57, vs + 4.75], [55, vs + 4.75], [54, vs + 4.2]];
  const roots = [[[48.4, vs - 2.07], [52.8, vs - 2.07]], [[48.4, vs + 2.07], [52.8, vs + 2.07]]];
  const recess = [[57.5, vs - 1.6], [56, vs - 1.6], [55.4, vs], [56, vs + 1.6], [57.5, vs + 1.6]];
  return K.body(V, shank) + K.body(V, head) + K.lines(V, roots, "thin") + K.line(V, recess, "hid");
}
export function screws(V) {
  return part(4, screw(V, 80) + screw(V, 10));
}

// The conductors on each side of the cage, phantom: adjacent parts.
export function wires(V) {
  return K.line(V, [[40.2, 96], [40.2, 74.5], [46.2, 74.5], [46.2, 96]], "phan") + K.line(V, [[40.2, -6], [40.2, 15.5], [46.2, 15.5], [46.2, -6]], "phan");
}

// Line strip: up the cage, down and back over the contacts, and on as the upper arc runner.
export function lineStrip(V) {
  const s = [
    [46.2, 86.5], [46.2, 73.6], ...K.arc(44.6, 73.6, 1.6, 0, -90, 3).slice(1), [3.2, 72], [3.2, 67.4], [4.8, 67.4], [4.8, 70.4],
    [44.6, 70.4], ...K.arc(44.6, 73.6, 3.2, -90, 0, 4).slice(1), [47.8, 86.5],
  ];
  return part(5, K.cut(V, s, { mat: "bronze", angle: 45 }));
}

export const FIXED_TIP = K.rect(14.5, 69.2, 18.5, 70.4);
export function fixedTip(V) {
  return part(6, K.cut(V, FIXED_TIP, { mat: "brass", angle: 135 }));
}

// Lower arc runner: under the plates and up their front edge; the coil's back lead lands on it.
export function runner(V) {
  const s = [[3.2, 45], [12.6, 45], [13.8, 46.2], [13.8, 58], [12.6, 58], [12.6, 46.6], [3.2, 46.6]];
  return part(7, K.cut(V, s, { mat: "bronze", angle: 135 }));
}

// Splitter plates: steel, V-notched towards the contacts; the notch's flanks seen beyond the cut.
export const PLATE_V = Array.from({ length: 9 }, (_, i) => 48.2 + 2.2 * i);
export function plates(V) {
  let out = "";
  for (const v0 of PLATE_V) {
    out += K.cut(V, K.rect(3.2, v0, 8, v0 + 0.8), { mat: "steel", angle: 45 });
    out += K.line(V, [[8, v0 + 0.8], [11, v0 + 0.8], [11, v0], [8, v0]], "vis");
  }
  return part(8, out);
}

// ---------------------------------------------------------------- solenoid (axis along u at v = VC)

export function yoke(V) {
  const c = VC;
  const low = [
    [24, c - 1], [20, c - 1], [20, c - 1.8], [18, c - 1.8], [18, c - 3], [22.5, c - 3], [22.5, c - 6.5], [6, c - 6.5], [6, c + 6.5], [4.5, c + 6.5], [4.5, c - 8], [24, c - 8],
  ];
  const up = [[24, c + 1], [24, c + 8], [22.5, c + 8], [22.5, c + 3], [18, c + 3], [18, c + 1.8], [20, c + 1.8], [20, c + 1]];
  const back = [[4.5, c + 6.5], [6, c + 6.5], [6, c + 8], [4.5, c + 8]];
  const side = K.line(V, [[6, c + 8], [22.5, c + 8]], "vis") + K.line(V, [[6, c - 8], [22.5, c - 8]], "vis");
  return part(23, side + [low, up, back].map((p) => K.cut(V, p, { mat: "steel", angle: 45 })).join(""));
}

export function former(V) {
  const c = VC;
  const half = (sgn) =>
    [[6.2, 3.2], [22.3, 3.2], [22.3, 6], [21.5, 6], [21.5, 3.8], [7, 3.8], [7, 6], [6.2, 6]].map(([u, r]) => [u, c + sgn * r]);
  return part(22, K.cut(V, half(1), { mat: "plastic", angle: 135 }) + K.cut(V, half(-1), { mat: "plastic", angle: 135 }));
}

export const TURNS = Array.from({ length: 7 }, (_, i) => 7.9 + 1.9 * i); // top sections; the bottom ones sit half a pitch on
export function coil(V) {
  const c = VC;
  let out = K.body(V, K.rect(7.05, c + 4.7, 8.75, 45)); // back lead up to the runner
  out += K.body(V, K.rect(19.6, 27.6, 21.25, c - 4.7)); // front lead down to the lead strip
  const back = TURNS.map((u) => [[u, c + 4.7], [u + 0.95, c - 4.7]]);
  out += K.lines(V, back, "thin");
  for (const u of TURNS) out += K.cut(V, K.circle(u, c + 4.7, 0.9, 14), { mat: "solid" }) + K.cut(V, K.circle(u + 0.95, c - 4.7, 0.9, 14), { mat: "solid" });
  return part(21, out);
}

// The coil's front lead strip, down past the trip lever's foot to the bimetal's foot.
export function leadStrip(V) {
  const s = [[19.7, 28], [21.3, 28], [21.3, 6], [36, 6], [36, 4.4], [20.7, 4.4], [19.7, 5.4]];
  return part(9, K.cut(V, s, { mat: "bronze", angle: 45 }));
}

export function plunger(V, p) {
  const c = VC;
  const body = [[8.5 + p, c - 2.6], [8.9 + p, c - 3], [14.6 + p, c - 3], [15 + p, c - 2.6], [15 + p, c + 2.6], [14.6 + p, c + 3], [8.9 + p, c + 3], [8.5 + p, c + 2.6]];
  return part(24, K.body(V, body) + K.line(V, [[13 + p, c - 0.8], [15 + p, c - 0.8]], "hid") + K.line(V, [[13 + p, c + 0.8], [15 + p, c + 0.8]], "hid"));
}
export const strikerTip = (p) => 26.5 - M.STRIKER_GAP + p;
export function striker(V, p) {
  const c = VC;
  const tip = strikerTip(p);
  return part(25, K.body(V, [[15 + p, c - 0.8], [tip - 0.3, c - 0.8], [tip, c - 0.5], [tip, c + 0.5], [tip - 0.3, c + 0.8], [15 + p, c + 0.8]]));
}
export function plungerSpring(V, p) {
  return part(26, K.springSection(V, { from: 15 + p, to: 20, radius: 1.3, wire: 0.35, turns: 4, axis: "u", at: VC }));
}

// ---------------------------------------------------------------- bimetal (riveted on the lead strip)

export const BI_BACK = 31.3; // the strip's back face, cold
export const BI_V0 = 7; // bending starts above the rivet
export const BI_TIP = 27;
// The back face's u at height v for tip deflection f (constant curvature: f·x²/L²).
export const biShift = (v, f) => -f * Math.max(0, (v - BI_V0) / (BI_TIP - BI_V0)) ** 2;
function biLayer(u0, u1, f) {
  const left = [];
  const right = [];
  for (let v = 6; v <= BI_TIP + 1e-6; v += 1) {
    const s = biShift(v, f);
    left.push([u0 + s, v]);
    right.push([u1 + s, v]);
  }
  return [...left, ...right.reverse()];
}
export function bimetal(V, f) {
  const s = M.BI_S / 2;
  const layers = K.cut(V, biLayer(BI_BACK, BI_BACK + s - 0.04, f), { mat: "solid" }) + K.cut(V, biLayer(BI_BACK + s + 0.04, BI_BACK + 2 * s, f), { mat: "solid" });
  const foot = K.cut(V, [[BI_BACK, 6], [35, 6], [35, 6.6], [BI_BACK + 2 * s, 6.6], [BI_BACK + 2 * s, 7], [BI_BACK, 7]], { mat: "solid" });
  const rivet = K.body(V, [[33.1, 3.9], [34.5, 3.9], [34.5, 4.4], [34.2, 4.4], [34.2, 6.6], [34.6, 6.6], [34.6, 7.2], [33, 7.2], [33, 6.6], [33.4, 6.6], [33.4, 4.4], [33.1, 4.4]]);
  return part(28, foot + layers + rivet);
}
export const biTip = (f) => [BI_BACK + M.BI_S + biShift(BI_TIP, f), BI_TIP - 0.6];
export function bimetalCold(V) {
  const u = BI_BACK + M.BI_S;
  return K.line(V, [[BI_BACK, 18], [BI_BACK, BI_TIP], [u, BI_TIP], [u, 18]], "phan");
}

// ---------------------------------------------------------------- trip lever (CW positive)

export const LEVER_SCREW_V = 26;
export function lever(V, deg) {
  const t = T;
  const base = [
    [26.5, 53], [29.5, 53], [29.5, 32], ...K.arc(t[0], t[1], 2.5, 53.13, 0, 6), [30.6, 30], [30.6, 22.8], [26.5, 22.8], [26.5, 28],
    ...K.arc(t[0], t[1], 2.5, 233.13, 126.87, 8), [26.5, 32],
  ];
  const r = (pts) => X.rot(pts, t, -deg);
  const screw = r([[27, LEVER_SCREW_V - 1], [31, LEVER_SCREW_V - 1], [31, LEVER_SCREW_V + 1], [27, LEVER_SCREW_V + 1]]);
  const roots = r([[27.2, LEVER_SCREW_V - 0.8], [30.6, LEVER_SCREW_V - 0.8]]).concat();
  const roots2 = r([[27.2, LEVER_SCREW_V + 0.8], [30.6, LEVER_SCREW_V + 0.8]]);
  const socket = r([[27, LEVER_SCREW_V - 0.6], [28.4, LEVER_SCREW_V - 0.6], [28.4, LEVER_SCREW_V + 0.6], [27, LEVER_SCREW_V + 0.6]]);
  return (
    part(15, K.cut(V, r(base), { mat: "plastic", angle: 135 }) + peg(V, t, 1)) +
    part(30, K.body(V, screw) + K.lines(V, [roots, roots2], "thin") + K.line(V, socket, "hid"))
  );
}

// ---------------------------------------------------------------- the mechanism

export const P0 = [33.6, 53.4]; // pawl pivot on the cradle, closed
const HOOK = [31.6, 56.7];
const TAIL = [30.3, 52];
export const LUG_HOLE = [40.8, 57.6]; // arm's spring hook, closed

export function cradle(V, c) {
  const polys = [X.hullCircles([[...MP, 3.6], [...M.B0, 1.9]]), X.hullCircles([[...MP, 3.6], [...P0, 1.7]])].map((p) => X.rot(p, MP, c));
  return part(13, X.bodyUnion(V, polys) + pin(V, X.rotPt(P0, MP, c), 0.6, 135));
}

export function pawl(V, c, pd) {
  const P = X.rotPt(P0, MP, c);
  const pts = (q) => X.rot(X.rot([q], MP, c), P, pd)[0];
  const polys = [X.hullCircles([[...P, 1.3], [...pts(HOOK), 0.9]]), X.hullCircles([[...P, 1.3], [...pts(TAIL), 0.8]])];
  return part(14, X.bodyUnion(V, polys));
}

// The contact arm, closed at a = 0: tip block, a bar up to the hub, the latch lug and the spring lug.
const ARM = [
  K.rect(13.8, 65.4, 20.2, 68),
  X.hullCircles([[19.2, 66.6, 1.4], [...MP, 3.2]]),
  X.hullCircles([[...MP, 3.2], [...LUG_HOLE, 1.5]]),
  K.rrect(30.6, 57.6, 33, 61, 0.4),
];
export const MOVING_TIP = K.rect(14.5, 68, 18.5, 69.2);
export function arm(V, a) {
  const polys = ARM.map((p) => X.rot(p, MP, a));
  const hole = X.rotPt(LUG_HOLE, MP, a);
  return (
    part(10, X.cutUnion(V, polys, { mat: "bronze", angle: 135 }) + `<path class="paper" d="${K.d(V, K.circle(...hole, 0.6, 12))}"/>` + K.line(V, K.circle(...hole, 0.6, 12), "vis", true)) +
    part(11, K.cut(V, X.rot(MOVING_TIP, MP, a), { mat: "brass", angle: 45 })) +
    part(12, pin(V, MP, 1, 45))
  );
}

export function handle(V, h) {
  const blade = [[5.6, -3.2], [14.5, -3.2], [14.5, -3.9], [16, -3.9], [16, -3.4], [17.5, -3.4], [17.5, -3.9], [19, -3.9], [19, -3.4], [20.5, -3.4], [20.5, -3.9], [26.4, -3.9], [27.6, -2.8], [27.6, 2.8], [26.4, 3.9], [20.5, 3.9], [20.5, 3.4], [19, 3.4], [19, 3.9], [17.5, 3.9], [17.5, 3.4], [16, 3.4], [16, 3.9], [14.5, 3.9], [14.5, 3.2], [5.6, 3.2]];
  const place = (p) => X.rot(p.map(([x, y]) => [H[0] + x, H[1] + y]), H, h);
  const lugHole = handleLug(h);
  const crank = M.crankPin(h);
  const hole = (p, r) => `<path class="paper" d="${K.d(V, K.circle(...p, r, 12))}"/>` + K.line(V, K.circle(...p, r, 12), "vis", true);
  return part(17, K.cut(V, place([...blade, ...hubArc()]), { mat: "plastic", angle: 60 }) + hole(lugHole, 0.6) + hole(crank, 0.75)) + part(18, pin(V, H, 1.5, 45));
}
// The hub outline from the blade's upper root, round the back (with the lug), to its lower root.
function hubArc() {
  const out = [];
  for (let t = 29.5; t <= 330.5; t += 4) {
    const bump = 1.9 * Math.exp(-(((t - 200) / 13) ** 2));
    const r = 6.5 + bump;
    out.push([r * Math.cos((t * Math.PI) / 180), r * Math.sin((t * Math.PI) / 180)]);
  }
  return out;
}
export const handleTip = (h) => X.rotPt([H[0] + 27.6, H[1]], H, h);
export const handleLug = (h) => X.rotPt([H[0] + 8 * Math.cos((200 * Math.PI) / 180), H[1] + 8 * Math.sin((200 * Math.PI) / 180)], H, h);

export function handlePhantom(V, h) {
  const blade = [[5.6, -3.2], [26.4, -3.9], [27.6, -2.8], [27.6, 2.8], [26.4, 3.9], [5.6, 3.2]];
  const pts = X.rot([...blade, ...hubArc()].map(([x, y]) => [H[0] + x, H[1] + y]), H, h);
  return K.line(V, pts, "phan", true);
}

export function link(V, h, c) {
  const A = M.crankPin(h);
  const B = X.rotPt(M.B0, MP, c);
  const end = (p) => K.cut(V, K.circle(...p, 0.6, 12), { mat: "solid" });
  return part(16, K.body(V, X.hull([...K.circle(...A, 0.6, 10), ...K.circle(...B, 0.6, 10)])) + end(A) + end(B));
}

export const ARM_SPRING = { radius: 0.9, wire: 0.35, turns: 9, hook: 1.4 };
export const HANDLE_SPRING = { radius: 0.8, wire: 0.3, turns: 9, hook: 1.4 };
export const armSpringDot = (a) => X.springPoint(X.rotPt(LUG_HOLE, MP, a), SPRING_POST_ARM, ARM_SPRING, 5);
export const handleSpringDot = (h) => X.springPoint(handleLug(h), SPRING_POST_HANDLE, HANDLE_SPRING, 5);
export function springs(V, h, a) {
  const lug = X.rotPt(LUG_HOLE, MP, a);
  return part(20, X.springBetween(V, lug, SPRING_POST_ARM, ARM_SPRING)) + part(19, X.springBetween(V, handleLug(h), SPRING_POST_HANDLE, HANDLE_SPRING));
}
// The centre of the plunger spring's wire section i, on the upper side.
export function plungerSpringDot(p, i = 2) {
  const pitch = (20 - (15 + p) - 0.35) / 4;
  return [15 + p + 0.175 + i * pitch, VC + 1.3];
}

// Flexible braids: arm → arc runner (and the coil's back lead), bimetal tip → load strip.
export const BRAID1_ARM = [24.5, 62.2];
export function braids(V, a, f) {
  const p = X.rotPt(BRAID1_ARM, MP, a);
  const one = X.quad(p, [17, 54 + 0.3 * (p[1] - 62)], [13.2, 47.4], 14);
  const tip = biTip(f);
  const two = X.quad([tip[0] - 0.2, tip[1]], [36.5, 25], [36.4, 18.4], 12);
  return part(27, K.cut(V, X.band(one, 1.6), { mat: "rubber", angle: 45 }) + K.cut(V, X.band(two, 1.6), { mat: "rubber", angle: 45 }));
}

// ---------------------------------------------------------------- load strip

export function loadStrip(V) {
  const s = [
    [46.2, 3.5], [46.2, 15.4], ...K.arc(44.6, 15.4, 1.6, 0, 90, 3).slice(1), [35.5, 17], [35.5, 18.6], [44.6, 18.6],
    ...K.arc(44.6, 15.4, 3.2, 90, 0, 4).slice(1), [47.8, 3.5],
  ];
  return part(29, K.cut(V, s, { mat: "bronze", angle: 45 }));
}

// ---------------------------------------------------------------- the current path (the accent)

// Centrelines of the conductors, line terminal to load terminal, at pose S. Returns polylines.
export function currentPath(S, { closed = true, lowerFromRunner = false } = {}) {
  const line = [[43.2, 95], [43.2, 81], [47, 81], [47, 73.6], ...K.arc(44.6, 73.6, 2.4, 0, -90, 3).slice(1), [16.5, 71.2], [16.5, 69.8]];
  const tipC = X.rotPt([16.5, 68.6], MP, S.a);
  const armLine = [tipC, X.rotPt([17.6, 66.7], MP, S.a), X.rotPt(BRAID1_ARM, MP, S.a)];
  const p = X.rotPt(BRAID1_ARM, MP, S.a);
  const braid1 = X.quad(p, [17, 54 + 0.3 * (p[1] - 62)], [13.2, 47.4], 14);
  const runnerTail = [[13.2, 47.4], [13.2, 45.8], [7.9, 45.8], [7.9, 39.7]];
  const coilZig = [];
  for (const u of TURNS) coilZig.push([u, VC + 4.7], [u + 0.95, VC - 4.7]);
  const tip = biTip(S.f);
  const bim = [];
  for (let v = 6.4; v <= BI_TIP - 0.6 + 1e-6; v += 1) bim.push([BI_BACK + M.BI_S / 2 + biShift(v, S.f), v]);
  const braid2 = X.quad([tip[0] - 0.2, tip[1]], [36.5, 25], [36.4, 18.4], 12);
  const load = [[36.4, 17.8], [44.6, 17.8], ...K.arc(44.6, 15.4, 2.4, 90, 0, 3).slice(1), [47, 9], [43.2, 9], [43.2, -5]];
  const lower = [...coilZig, [20.4, 28], [20.5, 5.2], [BI_BACK + M.BI_S / 2, 5.2], ...bim, ...braid2, ...load];
  if (closed) return [[...line, ...armLine, ...braid1, ...runnerTail, ...lower]];
  if (lowerFromRunner) return [line, [[13.2, 58], ...runnerTail.slice(1), ...lower]];
  return [line, [tipC, ...armLine.slice(1), ...braid1, ...runnerTail, ...lower]];
}

// The arc as the contacts part, 0 <= lam <= 1: between the contacts, then its roots run back
// along the runners, then the splitter plates cut it into short arcs in series and it goes out.
const jit = (i, seed, amp) => amp * (Math.sin(i * 12.9898 + seed * 78.233) * 0.6 + Math.sin(i * 4.1 + seed * 3.7) * 0.4);
export function arcPaths(S, lam, seed = 0) {
  const top = [16.5, 69.2];
  const bot = X.rotPt([16.5, 69.2], MP, S.a);
  const zig = (a, b, amp, n, s0) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bow = Math.sin(Math.PI * t);
      out.push([a[0] + (b[0] - a[0]) * t + (i && i < n ? jit(i, seed + s0, amp) : 0) - bow * 0, a[1] + (b[1] - a[1]) * t + (i && i < n ? jit(i + 7, seed + s0, amp * 0.5) : 0)]);
    }
    return out;
  };
  if (lam < 0.4) {
    const k = lam / 0.4;
    const mid = [Math.min(top[0], bot[0]) - 2.5 * k, (top[1] + bot[1]) / 2];
    return [[...zig(top, mid, 0.35, 4, 1), ...zig(mid, bot, 0.35, 4, 2).slice(1)]];
  }
  if (lam < 0.75) {
    const k = (lam - 0.4) / 0.35;
    const up = [14 - 6.5 * k, 70.4];
    const low = [13.8, 58 - 9 * k];
    const mid = [12.5 - 4 * k, (up[1] + low[1]) / 2];
    return [[...zig(up, mid, 0.45, 5, 3), ...zig(mid, low, 0.45, 5, 4).slice(1)]];
  }
  const out = [];
  const levels = [70.4, ...PLATE_V.slice().reverse().flatMap((v) => [v + 0.8, v]), 46.6];
  for (let i = 0; i + 1 < levels.length; i += 2) {
    const u = 6.2 + jit(i, seed, 0.4);
    out.push(zig([u, levels[i]], [u + jit(i + 3, seed, 0.5), levels[i + 1]], 0.3, 3, 5 + i));
  }
  return out;
}

// The pawl's edges where the arm hides them: dashed, to show the hook under the arm's lug.
export function pawlHidden(V, c, pd) {
  const P = X.rotPt(P0, MP, c);
  const pts = (q) => X.rot(X.rot([q], MP, c), P, pd)[0];
  return K.line(V, X.hullCircles([[...P, 1.3], [...pts(HOOK), 0.9]]), "hid", true);
}

// ---------------------------------------------------------------- VIEW E: the front, looking at the handle
// World here is [w, v]: w across the 17.5 mm module, v up, as in the section.
export const MOD = 17.5;
export function frontView(V) {
  const hw = MOD / 2;
  const outline = [[-hw + 0.6, 0], [hw - 0.6, 0], [hw, 0.6], [hw, 89.4], [hw - 0.6, 90], [-hw + 0.6, 90], [-hw, 89.4], [-hw, 0.6]];
  const steps = K.lines(V, [[[-hw, 22.5], [hw, 22.5]], [[-hw, 67.5], [hw, 67.5]], [[-hw, 23.5], [hw, 23.5]], [[-hw, 66.5], [hw, 66.5]]], "vis");
  const windowE = K.line(V, K.rrect(-5, 35.5, 5, 54.5, 0.8), "vis", true);
  const screwHole = (v) =>
    K.line(V, K.circle(0, v, 3, 32), "vis", true) + K.line(V, K.circle(0, v, 2.4, 32), "thin", true) + K.lines(V, [[[-1.2, v], [1.2, v]], [[0, v - 1.2], [0, v + 1.2]]], "vis");
  const label = K.line(V, K.rect(-6, 25.5, 6, 31.5), "thin", true);
  return part(1, K.body(V, outline) + steps + windowE + label + screwHole(80) + screwHole(10)) + K.centerMark(V, [0, 80], 3, 2) + K.centerMark(V, [0, 10], 3, 2);
}
// The handle seen from the front: the part of its blade beyond the hump face, projected on v.
export function frontHandle(V, h) {
  const blade = [[5.6, -3.9], [27.6, -3.9], [27.6, 3.9], [5.6, 3.9]];
  const pts = X.rot(blade.map(([x, y]) => [H[0] + x, H[1] + y]), H, h);
  // clip the blade outline to u >= 70 and take its extent in v
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    for (let t = 0; t <= 1; t += 0.02) {
      const u = a[0] + (b[0] - a[0]) * t;
      const v = a[1] + (b[1] - a[1]) * t;
      if (u >= 69.9) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
  }
  const tipV = X.rotPt([H[0] + 27.6, H[1]], H, h)[1];
  const ribs = [16, 19].map((x) => X.rotPt([H[0] + x, H[1] + 3.9], H, h)[1]);
  return part(17, K.body(V, K.rrect(-4.5, lo, 4.5, hi, 0.6)) + K.lines(V, [[[-4.5, tipV], [4.5, tipV]], ...ribs.map((v) => [[-4.5, v], [4.5, v]])], "thin"));
}
export function frontText(V) {
  const t = (v, s, w = 0) => {
    const [x, y] = V.p([w, v]);
    return `<text class="t t-sm" x="${x}" y="${K.r2(y + 2.7)}" text-anchor="middle">${s}</text>`;
  };
  return `<g data-role="engraved">${t(61.5, "B16")}${t(51, "I", -6.9)}${t(28.5, "6000")}${t(38.5, "O", -6.9)}</g>`;
}

// DETAIL C's local section: the arm broken out round the pawl's hook, so the hook under the
// arm's lug shows. Thin freehand boundary; the pawl and the lug's bent tab seen through it.
export function latchBreakout(V, S) {
  const P = X.rotPt(P0, MP, S.c);
  const hookAt = X.rot(X.rot([HOOK], MP, S.c), P, S.pawl)[0];
  const c = X.rotPt([31.8, 57.1], MP, S.c);
  const edge = [];
  for (let i = 0; i < 40; i++) {
    const th = (i / 40) * 2 * Math.PI;
    const r = 2.3 * (1 + 0.07 * Math.sin(5 * th) + 0.04 * Math.sin(11 * th + 1));
    edge.push([c[0] + r * Math.cos(th), c[1] + r * Math.sin(th)]);
  }
  const pts = (q) => X.rot(X.rot([q], MP, S.c), P, S.pawl)[0];
  const pawlPoly = X.hullCircles([[...P, 1.3], [...pts(HOOK), 0.9]]);
  const lug = X.rot(K.rrect(30.6, 57.6, 33, 61, 0.4), MP, S.a);
  void hookAt;
  return (
    `<clipPath id="bo-${V.name || "x"}"><path d="${K.d(V, edge)}"/></clipPath>` +
    `<path class="paper" d="${K.d(V, edge)}"/>` +
    `<g clip-path="url(#bo-${V.name || "x"})">${part(14, K.body(V, pawlPoly))}${K.body(V, lug)}</g>` +
    K.line(V, edge, "thin", true)
  );
}
