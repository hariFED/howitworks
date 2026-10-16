// The pump's parts, in world mm. Each function draws one part into a view and returns SVG, so the
// main section and its details draw the same geometry at their own scale.
//
// SECTION A-A (and Details C, D): u along the shaft, positive toward the drive end, v up; the shaft
// axis is v = 0 and the impeller's outlet centre plane is u = 0.
// SECTION B-B: x right, y up, the shaft axis at the origin, looking from the suction side toward
// the drive end, so the impeller turns counter-clockwise.
// VALVE: u along the pipe (flow left to right), v up the stem; the stem axis is u = 0 and the seat
// plane is v = 4. The stem, plug and handwheel are drawn closed (lift 0) and moved by a transform.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;

const mirror = (pts) => K.flipV(pts, 0);
const both = (V, pts, opts) => K.cut(V, pts, opts) + K.cut(V, mirror(pts), opts);
const bothBody = (V, pts) => K.body(V, pts) + K.body(V, mirror(pts));
// [r, u] lists (radius first, as revolve profiles are written) to [u, v] points
const ru = (list) => list.map(([r, u]) => [u, r]);

// A cut face with holes: paper, hatch and outline drawn with the even-odd rule.
export function cutEO(V, loops, { mat = "steel", angle = 45 } = {}) {
  const dd = loops.map((p) => K.d(V, p)).join("");
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path fill="url(#h-${mat}-${angle})" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
}

// ================================================================ SECTION A-A

// ---------------------------------------------------------------- casing (1)
const casingTop = [
  [-112, 25], [-46, 25], [-46, 38], [-30, 38],
  [-28, 40], [-24, 43], [-20, 48], [-16.5, 56], [-13.5, 68], [-11.5, 80], [-10.5, 88],
  [-12, 91], [-9, 94.3], [8, 94.3], [11, 91], [10, 88],
  [13, 88], [13, 98], [26, 98], [26, 142],
  [70, 142], [70, 160], [39, 160], [39, 162], [16, 162],
  [16, 130], [12, 112], [12, 102], [-12, 102], [-12, 112], [-16, 130], [-16, 162],
  [-39, 162], [-39, 160], [-70, 160], [-70, 142], [-26, 142],
  [-26, 128], [-23, 112], [-22, 100], [-22, 86], [-25, 72], [-30, 60], [-38, 50], [-50, 42], [-60, 34],
  [-92, 34], [-92, 82.5], [-110, 82.5], [-110, 49.5], [-112, 49.5],
];
const casingLow = [
  [-112, -25], [-46, -25], [-46, -38], [-30, -38],
  [-28, -40], [-24, -43], [-20, -48], [-16.5, -56], [-13.5, -68], [-11.5, -80], [-10.5, -88],
  [-14, -93], [-16, -100], [-14, -105], [-8, -107.3], [8, -107.3], [14, -105], [16, -100], [14, -93], [10, -88],
  [13, -88], [13, -98], [26, -98], [26, -132], [-56, -132], [-56, -122], [-30, -122], [-24, -116],
  [-22, -100], [-22, -86], [-25, -72], [-30, -60], [-38, -50], [-50, -42], [-60, -34],
  [-92, -34], [-92, -82.5], [-110, -82.5], [-110, -49.5], [-112, -49.5],
];

export function casing(V) {
  return part(1, K.cut(V, casingTop, { mat: "iron", angle: 45 }) + K.cut(V, casingLow, { mat: "iron", angle: 45 }));
}

// ---------------------------------------------------------------- impeller (2), meridional section
// Shrouds and hub are cut; the vanes are revolved into the plane and only their inlet edge shows.
export const frontShroud = ru([
  [28, -44], [28, -30], [29, -24], [32, -18], [38, -13], [46, -9.5], [58, -6.6], [72, -4.4], [84.5, -3],
  [84.5, -7.5], [72, -9], [58, -11.5], [47, -15], [40, -19], [35, -24], [32, -30], [32, -44],
]);
export const hubLoop = ru([
  [10, -14], [17, -14], [19, -11], [21, -6], [24, -1], [30, 2], [40, 3], [84.5, 3],
  [84.5, 7.5], [40, 8.5], [26, 10], [20, 12], [20, 14], [10, 14],
]);

export function impeller(V) {
  const inlet = [[-18, 32], [-3, 24.6]];
  return part(
    2,
    both(V, frontShroud, { mat: "bronze", angle: 135 }) +
      both(V, hubLoop, { mat: "bronze", angle: 135 }) +
      K.lines(V, [inlet, inlet.map(([u, v]) => [u, -v])], "vis")
  );
}

export function wearRing(V) {
  return part(3, both(V, K.rect(-46, 32.3, -30, 38), { mat: "steel", angle: 30 }));
}

export function impellerNut(V) {
  const top = [[-14, 12], [-26, 12], [-28, 10.5], [-30.5, 7], [-31.6, 3], [-32, 0]];
  const outline = [...top, ...mirror(top).slice(1)];
  return part(4, K.body(V, outline) + K.lines(V, [[[-14.6, 6], [-25.6, 6]], [[-14.6, -6], [-25.6, -6]]], "thin"));
}

export function impellerKey(V) {
  return part(5, K.body(V, K.rrect(-12, 6.5, 12, 12.5, 0.8)));
}

// ---------------------------------------------------------------- shaft (6)
const shaftTop = [
  [-26, 7], [-25, 8], [-14, 8], [-14, 10], [14, 10], [14, 12], [88, 12], [88, 12.5], [107, 12.5], [107, 15],
  [216, 15], [216, 12.5], [236, 12.5], [236, 12], [315, 12], [316, 11],
];
export function shaft(V) {
  const outline = [...shaftTop, ...mirror(shaftTop)];
  const steps = [14, 88, 107, 216, 236].map((u) => {
    const r = Math.min(...shaftTop.filter(([su]) => su === u).map(([, v]) => v));
    return [[u, r], [u, -r]];
  });
  // the M16 thread inside the cap nut: crest thick, root thin
  return part(6, K.body(V, outline) + K.lines(V, steps, "vis") + K.lines(V, [[[-25, 6.9], [-14.5, 6.9]], [[-25, -6.9], [-14.5, -6.9]]], "thin"));
}

// ---------------------------------------------------------------- casing gasket (7), cover (8)
export function gasket(V) {
  return part(7, both(V, K.rect(26, 98, 27, 128), { mat: "solid" }));
}

const coverTop = [
  [14, 22], [14, 98], [26, 98], [27, 98], [27, 128], [35, 128], [35, 40], [40, 32], [60, 32], [60, 19.5], [52, 19.5], [52, 22],
];
export function cover(V) {
  return part(8, both(V, coverTop, { mat: "iron", angle: 135 }));
}

// ---------------------------------------------------------------- mechanical seal (9, 10, 11)
export const sealSpring = { from: 17, to: 32.6, radius: 16.6, wire: 1.8, turns: 4 };
export function sealRotary(V) {
  const retainer = K.rect(14.5, 12, 17, 19);
  const shell = [[32.6, 14.5], [33.4, 14.5], [33.4, 18.4], [44, 18.4], [44, 19.2], [32.6, 19.2]];
  const bellows = [[33.4, 12], [42, 12], [42, 18.4], [39.6, 18.4], [37.7, 15.4], [35.8, 18.4], [33.4, 18.4]];
  const carbon = [[42, 13.4], [42, 18.4], [48, 18.4], [48, 17.2], [50, 17.2], [50, 14.6], [48, 14.6], [48, 13.4]];
  return part(
    9,
    both(V, retainer, { mat: "steel", angle: 45 }) +
      both(V, bellows, { mat: "rubber", angle: 45 }) +
      both(V, carbon, { mat: "plastic", angle: 135 }) +
      both(V, shell, { mat: "solid" }) +
      K.springSection(V, { ...sealSpring, axis: "u", at: 0 })
  );
}

const seatTop = [[50, 13], [50, 21.5], [52, 21.5], [52, 19.3], [54.6, 19.3], [54.6, 16.6], [57.4, 16.6], [57.4, 19.3], [60, 19.3], [60, 13]];
export function sealSeat(V) {
  return part(10, both(V, seatTop, { mat: "steel", angle: 60 }));
}
export function seatRing(V) {
  const c = K.circle(56, 18.15, 1.3, 20);
  return part(11, both(V, c, { mat: "rubber", angle: 45 }));
}

// ---------------------------------------------------------------- casing bolt (12): through bracket and cover into the casing
export const BOLT_V = -114;
export function casingBolt(V) {
  const v = BOLT_V;
  const shank = [[15, v - 6], [47, v - 6], [47, v + 6], [15, v + 6], [14.4, v + 5.4], [14.4, v - 5.4]];
  const head = [[47, v - 10.4], [54, v - 10.4], [55, v - 9.4], [55, v + 9.4], [54, v + 10.4], [47, v + 10.4]];
  return part(
    12,
    K.body(V, shank) +
      K.body(V, head) +
      K.lines(V, [[[15.2, v - 5], [26, v - 5]], [[15.2, v + 5], [26, v + 5]], [[47.6, v - 5.2], [54.4, v - 5.2]], [[47.6, v + 5.2], [54.4, v + 5.2]]], "thin")
  );
}

// ---------------------------------------------------------------- bearing bracket (13)
const bracketTop = [
  [35, 92], [35, 128], [47, 128], [47, 100], [88, 50], [100, 46], [255, 46], [255, 31], [216, 31], [216, 28],
  [107, 28], [107, 31], [90, 31], [90, 16], [78, 16], [78, 34], [47, 90], [40, 92],
];
const bracketLow = bracketTop.map(([u, v]) => [u, -v]);
// The foot's web lies in the cutting plane: a rib, drawn but not hatched. The foot plate is cut.
const footRib = [[150, -46], [236, -46], [248, -122], [138, -122]];
export function bracket(V) {
  return part(
    13,
    K.cut(V, bracketTop, { mat: "iron", angle: 45 }) +
      K.cut(V, bracketLow, { mat: "iron", angle: 45 }) +
      K.body(V, footRib) +
      K.cut(V, K.rect(128, -132, 256, -122), { mat: "iron", angle: 45 })
  );
}

export function thrower(V) {
  const p = [[64, 12], [70, 12], [70, 14.5], [77.6, 20.4], [76.6, 21.8], [68.4, 16.5], [64, 16.5]];
  return part(14, both(V, p, { mat: "rubber", angle: 135 }));
}

// ---------------------------------------------------------------- bearings (15): 6305-2Z, 25 × 62 × 17
function bearingAt(V, a) {
  const c = a + 8.5;
  const pc = 21.75;
  const gr = 5.8;
  const dx = Math.sqrt(gr * gr - 3.55 * 3.55);
  const ang = (Math.atan2(3.55, dx) * 180) / Math.PI;
  const inner = [[a, 12.5], [a + 17, 12.5], [a + 17, 18.2], [c + dx, 18.2], ...K.arc(c, pc, gr, -ang, -180 + ang, 8), [c - dx, 18.2], [a, 18.2]];
  const outer = [[a, 25.3], [c - dx, 25.3], ...K.arc(c, pc, gr, 180 - ang, ang, 8), [c + dx, 25.3], [a + 17, 25.3], [a + 17, 31], [a, 31]];
  const shields = [K.rect(a + 0.9, 18.7, a + 1.5, 26.2), K.rect(a + 15.5, 18.7, a + 16.1, 26.2)];
  return (
    both(V, inner, { mat: "steel", angle: 45 }) +
    both(V, outer, { mat: "steel", angle: 135 }) +
    shields.map((s) => both(V, s, { mat: "solid" })).join("") +
    bothBody(V, K.circle(c, pc, 5.6, 28))
  );
}
export const BEARINGS = [90, 216];
export function bearings(V) {
  return part(15, BEARINGS.map((a) => bearingAt(V, a)).join(""));
}

export function circlip(V) {
  return part(16, both(V, K.rect(233.3, 12, 234.6, 15.6), { mat: "solid" }));
}

const bearingCoverTop = [[233, 24], [233, 31], [255, 31], [255, 52], [263, 52], [263, 20], [255.6, 20], [255.6, 24]];
export function bearingCover(V) {
  return part(17, both(V, bearingCoverTop, { mat: "steel", angle: 60 }));
}

export function lipSeal(V) {
  const p = [[255.6, 20], [262.4, 20], [262.4, 14.2], [259.6, 12], [258, 13.2], [258, 16.6], [255.6, 16.6]];
  return part(18, both(V, p, { mat: "rubber", angle: 45 }) + both(V, K.circle(260.6, 14.6, 0.75, 12), { mat: "solid" }));
}

export function capScrews(V) {
  const top = [[244, 37], [263, 37], [263, 35], [269, 35], [269, 45], [263, 45], [263, 43], [244, 43], [243.4, 42.4], [243.4, 37.6]];
  return part(19, bothBody(V, top) + K.lines(V, [[[244.4, 37.9], [254, 37.9]], [[244.4, 42.1], [254, 42.1]], [[244.4, -37.9], [254, -37.9]], [[244.4, -42.1], [254, -42.1]]], "thin"));
}

// ---------------------------------------------------------------- coupling (20, 21, 22) and the motor half in phantom
export function couplingHub(V) {
  const hub = [[272, 12], [306, 12], [306, 27.5], [274, 27.5], [272, 25.5]];
  return part(20, both(V, hub, { mat: "alu", angle: 45 }));
}
export function spider(V) {
  return part(21, both(V, K.rect(306, 15, 322, 27.5), { mat: "rubber", angle: 135 }));
}
export function couplingKey(V) {
  return part(22, K.body(V, K.rrect(276, 8, 302, 15, 1)));
}
export function motorHalf(V) {
  const hub = [[322, 27.5], [354, 27.5], [356, 25.5], [356, 12], [376, 12], [376, -12], [356, -12], [356, -25.5], [354, -27.5], [322, -27.5]];
  return K.line(V, hub, "phan", true) + K.line(V, [[356, 12], [356, -12]], "phan");
}

// ---------------------------------------------------------------- the water in A-A, by pressure zone
// suction · inner impeller · outer impeller with the side gaps and seal chamber · volute and discharge
export const waterA = {
  s: [K.rect(-112, -25, -44, 25), K.rect(-44.01, -28, -20, 28), K.rect(-30, 27.99, -20, 31), K.rect(-30, -31, -20, -27.99), K.rect(-46, 24.99, -43.99, 32.3), K.rect(-46, -32.3, -43.99, -24.99)],
  // the leak back through the wear ring gap sees a pressure between the two
  i: [K.rect(-20.01, -56, 4, 56), K.rect(-30, 32.3, -20, 56), K.rect(-30, -56, -20, -32.3), K.rect(-44, 32, -29.99, 32.3), K.rect(-44, -32.3, -29.99, -32)],
  o: [
    K.rect(-14, 55.99, 8, 88), K.rect(-14, -88, 8, -55.99), K.rect(3.99, -88, 14, 88),
    [[14, 12], [42, 12], [42, 17.6], [50, 17.6], [50, 22], [14, 22]],
    [[14, -12], [42, -12], [42, -17.6], [50, -17.6], [50, -22], [14, -22]],
  ],
  d: [K.rect(-12, 87.99, 11, 94.3), K.rect(-16, -107.3, 16, -87.99), K.rect(-16, 101, 16, 162)],
};

export const path = (V, shapes) => shapes.map((s) => K.d(V, s)).join("");

// ================================================================ SECTION B-B, through the volute

export const rv = (deg) => M.R_TONGUE + ((M.R_THROAT - M.R_TONGUE) * (deg - M.TONGUE_DEG)) / 360;
const polar = (r, deg) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
const T0 = M.TONGUE_DEG;

const spiralIn = [];
for (let a = T0; a <= T0 + 360 + 1e-9; a += 4) spiralIn.push(polar(rv(a), a));
const throatIn = polar(M.R_THROAT, T0);
const throatOut = polar(M.R_THROAT + 10, T0);
const nozzleRightIn = [[52, 116], [34, 128], [16, 140], [16, 162]];
const nozzleLeftIn = [[-16, 162], [-16, 120], [-10, 108], [0, 102], [12, 99], [30, 92]];

// The water's boundary in the mid-plane: volute from the tongue round to the throat, then the nozzle.
export const voluteWater = [...spiralIn, ...nozzleRightIn, ...nozzleLeftIn];

function casingBB() {
  const outer = [];
  for (let a = T0 + 360; a >= 112; a -= 4) {
    if (a < 292 && a > 248) continue;
    outer.push(polar(rv(a) + 10, a));
    if (a === 294) outer.push(polar(rv(290) + 10, 290), [44, -122], [75, -122], [75, -132], [-75, -132], [-75, -122], [-44, -122], polar(rv(250) + 10, 250));
  }
  return [
    [16, 162], [39, 162], [39, 160], [70, 160], [70, 142], [26, 142], [42, 135], [60, 122], throatOut,
    ...outer,
    [-26, 120], [-26, 142], [-70, 142], [-70, 160], [-39, 160], [-39, 162], [-16, 162],
    ...nozzleLeftIn.slice(1),
    ...spiralIn,
    ...nozzleRightIn.slice(0, -1),
  ];
}
export const CASING_BB = casingBB();

export function casingSection(V) {
  return part(1, K.cut(V, CASING_BB, { mat: "iron", angle: 45 }));
}

// Drain plug G3/8 DIN 910, screwed radially into the bottom of the volute.
export const DRAIN_DEG = 318;
export function drainPlug(V) {
  const s0 = rv(DRAIN_DEG);
  const s1 = s0 + 10;
  const local = [[s0, -8.3], [s1, -8.3], [s1, -11], [s1 + 3, -11], [s1 + 3, -7.5], [s1 + 9, -7.5], [s1 + 9, 7.5], [s1 + 3, 7.5], [s1 + 3, 11], [s1, 11], [s1, 8.3], [s0, 8.3]];
  const c = Math.cos((DRAIN_DEG * Math.PI) / 180);
  const s = Math.sin((DRAIN_DEG * Math.PI) / 180);
  const at = ([a, b]) => [a * c - b * s, a * s + b * c];
  const thread = [[[s0 + 0.6, -7.2], [s1 - 0.6, -7.2]], [[s0 + 0.6, 7.2], [s1 - 0.6, 7.2]], [[s1 + 3.6, -3.8], [s1 + 8.6, -3.8]], [[s1 + 3.6, 3.8], [s1 + 8.6, 3.8]]];
  return part(23, K.body(V, local.map(at)) + K.lines(V, thread.map((l) => l.map(at)), "thin"));
}
export const drainPoint = () => {
  const r = rv(DRAIN_DEG) + 15;
  return polar(r, DRAIN_DEG);
};

// The rotor in B-B: shaft and key cut across (hatched), the impeller hub and six backward-curved vanes.
const R_HUB = 26;
const R_LE = 30;
const VANE_T = 4;
function vane(k) {
  const tanB = Math.tan((M.BETA2 * Math.PI) / 180);
  const th0 = 90 + k * (360 / M.VANES);
  const centre = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const r = R_LE + ((M.D2 / 2 - R_LE) * i) / n;
    const th = th0 - ((Math.log(r / R_LE) / tanB) * 180) / Math.PI;
    centre.push(polar(r, th));
  }
  const left = [];
  const right = [];
  for (let i = 0; i <= n; i++) {
    const a = centre[Math.max(0, i - 1)];
    const b = centre[Math.min(n, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const l = Math.hypot(tx, ty);
    const nx = -ty / l;
    const ny = tx / l;
    const h = VANE_T / 2;
    left.push([centre[i][0] + nx * h, centre[i][1] + ny * h]);
    right.push([centre[i][0] - nx * h, centre[i][1] - ny * h]);
  }
  // round the leading edge with a half circle about the first centre point, through the nose
  const [c0x, c0y] = centre[0];
  const aL = (Math.atan2(left[0][1] - c0y, left[0][0] - c0x) * 180) / Math.PI;
  const nose = K.arc(c0x, c0y, VANE_T / 2, aL + 180, aL, 8).slice(1, -1);
  // trim the trailing edge onto the outlet circle
  const R2 = M.D2 / 2;
  const onCircle = ([x, y]) => {
    const r = Math.hypot(x, y);
    return [(x * R2) / r, (y * R2) / r];
  };
  left[n] = onCircle(left[n]);
  right[n] = onCircle(right[n]);
  return [...left, ...right.slice().reverse(), ...nose];
}
export const VANE_PTS = Array.from({ length: M.VANES }, (_, k) => vane(k));
export const vaneMid = (k = 0, f = 0.55) => {
  const pts = VANE_PTS[k];
  const n = 26;
  // average of the two flanks at the same station: left[i] and right[i]
  const i = Math.round(f * n);
  const a = pts[i];
  const b = pts[2 * n + 1 - i];
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
};

const keyway = [[-3, 6.5], [3, 6.5], [3, 12.5], [-3, 12.5]];
export function rotorBB(V) {
  const shaftCut = [...K.arc(0, 0, 10, 72.5, 360 + 107.5, 40), [-3, 9.54], [-3, 6.5], [3, 6.5], [3, 9.54]];
  const hubOuter = K.circle(0, 0, R_HUB, 64);
  const hubInner = [...K.arc(0, 0, 10, 107.5, 360 + 72.5, 40).reverse(), [3, 9.54], [3, 12.5], [-3, 12.5], [-3, 9.54]];
  return (
    K.line(V, K.circle(0, 0, M.D2 / 2, 96), "vis", true) +
    part(2, cutEO(V, [hubOuter, hubInner], { mat: "bronze", angle: 135 }) + VANE_PTS.map((p) => K.cut(V, p, { mat: "bronze", angle: 135 })).join("")) +
    part(6, K.cut(V, shaftCut, { mat: "steel", angle: 45 })) +
    part(5, K.cut(V, keyway, { mat: "steel", angle: 135 }))
  );
}

// Water in B-B by zone. Each is a ring (even-odd), so the zones never stack their stipple.
export const waterB = {
  i: [K.circle(0, 0, 56, 72), K.circle(0, 0, R_HUB - 0.5, 48)],
  o: [K.circle(0, 0, M.D2 / 2, 96), K.circle(0, 0, 56, 72)],
  d: [voluteWater, K.circle(0, 0, M.D2 / 2, 96)],
};

// ================================================================ DISCHARGE VALVE (globe, DN32 PN16)

const bodyA = [
  [-92, 16], [-34, 16], [-28, 8], [-22, -2], [-16, -2], [-16, 4], [-22, 4], [-27, 10], [-30, 22], [-30, 36], [-28, 40], [-28, 56],
  [-50, 56], [-50, 48], [-62, 40], [-72, 46], [-72, 70], [-90, 70], [-90, 39], [-92, 39],
];
const bodyD = [
  [92, 16], [36, 16], [34, 30], [28, 40], [28, 56], [50, 56], [50, 48], [62, 40], [72, 46], [72, 70], [90, 70], [90, 39], [92, 39],
];
const bodyBC = [
  [-92, -16], [-34, -16], [-28, -30], [-12, -38], [10, -38], [24, -36], [30, -34], [30, -22], [27, -10], [22, -2], [16, -2], [16, 4], [22, 4], [28, -4], [36, -16],
  [92, -16], [92, -39], [90, -39], [90, -70], [72, -70], [72, -46], [56, -46], [36, -52], [0, -54], [-36, -52], [-56, -46],
  [-72, -46], [-72, -70], [-90, -70], [-90, -39], [-92, -39],
];
export function valveBody(V) {
  return part(24, [bodyA, bodyD, bodyBC].map((p) => K.cut(V, p, { mat: "iron", angle: 45 })).join(""));
}

export const valveWater = {
  in: [[[-92, -16], [-92, 16], [-34, 16], [-28, 8], [-22, -2], [-16, -2], [-16, 4], [16, 4], [16, -2], [22, -2], [27, -10], [30, -22], [30, -34], [24, -36], [10, -38], [-12, -38], [-28, -30], [-34, -16]]],
  out: [[[-16, 4.01], [-22, 4], [-27, 10], [-30, 22], [-30, 36], [-28, 40], [-28, 48], [28, 48], [28, 40], [34, 30], [36, 16], [92, 16], [92, -16], [36, -16], [28, -4], [22, 4], [16, 4.01]]],
};

const bonnetR = [
  [21, 48], [27.8, 48], [27.8, 56], [50, 56], [50, 66], [27, 66], [27, 162], [8.2, 162], [8.2, 150], [20, 150], [20, 66],
  [18, 66], [18, 126], [13, 126], [13, 96], [7.3, 96], [7.3, 58], [21, 58],
];
export function bonnet(V) {
  const thread = [[[8.2, 150.6], [8.2, 161.4]], [[-8.2, 150.6], [-8.2, 161.4]]];
  return part(27, K.cut(V, bonnetR, { mat: "iron", angle: 135 }) + K.cut(V, K.flipU(bonnetR), { mat: "iron", angle: 135 }) + K.lines(V, thread, "thin"));
}

export function packing(V) {
  const rings = [96, 102, 108].map((v) => K.rect(7.3, v, 13, v + 6));
  return part(28, rings.map((r) => K.cut(V, r, { mat: "rubber", angle: 45 }) + K.cut(V, K.flipU(r), { mat: "rubber", angle: 45 })).join(""));
}

const glandR = [[7.5, 114], [12.8, 114], [12.8, 126], [17, 126], [17, 131], [7.5, 131]];
export function gland(V) {
  return part(29, K.cut(V, glandR, { mat: "brass", angle: 135 }) + K.cut(V, K.flipU(glandR), { mat: "brass", angle: 135 }));
}

// Moving: plug, stem and handwheel, drawn closed.
const plugLoop = [[0, -8], [7, -8], [11, -4.5], [14, -0.5], [16, 4], [20, 8.5], [20, 16], [0, 16]];
export function plug(V) {
  return part(25, K.section(V, { ...K.revolve(plugLoop), edges: [] }, { mat: "steel", angle: 135 }));
}
const stemOutline = [[-7, 10], [7, 10], [7, 138], [8, 140], [8, 206], [7, 207], [-7, 207], [-8, 206], [-8, 140], [-7, 138]];
export function stem(V) {
  return part(26, K.body(V, stemOutline) + K.lines(V, [[[6.8, 141], [6.8, 187]], [[-6.8, 141], [-6.8, 187]]], "thin"));
}
export const RIM = { r: 56, v: 199, w: 6 };
export function handwheel(V) {
  const hub = [[8, 188], [16, 188], [16, 200], [8, 200]];
  const spoke = [[16, 191], [50.4, 196.4], [50.4, 201.6], [16, 197]];
  const rim = K.circle(RIM.r, RIM.v, RIM.w, 28);
  return part(
    30,
    K.cut(V, hub, { mat: "iron", angle: 45 }) + K.cut(V, K.flipU(hub), { mat: "iron", angle: 45 }) +
      K.body(V, spoke) + K.body(V, K.flipU(spoke)) +
      K.cut(V, rim, { mat: "iron", angle: 45 }) + K.cut(V, K.flipU(rim), { mat: "iron", angle: 45 })
  );
}

// The moving assembly in its other extreme (closed), as phantom lines.
export function valvePhantom(V) {
  const rimR = K.circle(RIM.r, RIM.v, RIM.w, 28);
  return (
    K.line(V, [[-16, 188], [16, 188], [16, 191], [50.4, 196.4], [50.4, 201.6], [16, 197], [16, 200], [8, 200], [8, 206], [7, 207], [-7, 207], [-8, 206], [-8, 200], [-16, 200], [-16, 197], [-50.4, 201.6], [-50.4, 196.4], [-16, 191]], "phan", true) +
    K.line(V, rimR, "phan", true) +
    K.line(V, K.flipU(rimR), "phan", true)
  );
}
