// The click pen's parts, in world mm. Axial views: u along the axis (nose face u = 0, toward the
// button), v up. The cutting plane runs through θS (top of the sheet) and θS + 180° (bottom), so it
// cuts a LONG SLOT of the cam guide at the top and a SHORT SLOT at the bottom. The rotator and the
// plunger are not cut (teeth are never hatched); they are drawn in view, their near halves
// projected: a point at radius r and angle θ lands at v = r·cos(θ − θS).
//
// Moving parts are drawn at a reference pose and moved with a transform: the refill and the
// spring's free end at EXTENDED (u_r = 96), the plunger with the button fully out. The rotator is
// re-drawn every frame because it turns.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;

export const THETA_S = -7.5; // the cutting plane: mid long slot at the top, mid short slot below
const rad = (a) => (a * Math.PI) / 180;
const cosS = (theta) => Math.cos(rad(theta - THETA_S));
const sinS = (theta) => Math.sin(rad(theta - THETA_S));

export const R = {
  barrelO: 4.85, barrelI: 4.5, guideI: 3.9, ridge: 3.05,
  lugO: 3.75, hub: 1.8, base: 2.6, plO: 2.95, plI: 2.0, stem: 2.5, collar: 3.75,
};

// Mirror a half-profile [u, r] to both sides of the axis: two polygons.
const both = (pts) => [pts.map(([u, r]) => [u, r]), pts.map(([u, r]) => [u, -r]).reverse()];

// A strip of width t along a polyline (for the clip): a closed polygon.
function strip(path, t) {
  const left = [];
  const right = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(path.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const n = Math.hypot(dx, dy) || 1;
    const [nx, ny] = [-dy / n, dx / n];
    left.push([path[i][0] + (nx * t) / 2, path[i][1] + (ny * t) / 2]);
    right.push([path[i][0] - (nx * t) / 2, path[i][1] - (ny * t) / 2]);
  }
  return [...left, ...right.reverse()];
}

function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up = [];
  for (const q of p.reverse()) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

// The accent body: paper, an accent tint and an accent outline.
export const camBody = (V, pts) => {
  const dd = K.d(V, pts);
  return `<path class="paper" d="${dd}"/><path class="cam-tint" d="${dd}"/><path class="vis cam-line" d="${dd}"/>`;
};

// ---------------------------------------------------------------- fixed parts

export function barrel(V) {
  return part(1, K.section(V, { ...K.revolve([[R.barrelI, 15], [R.barrelO, 15], [R.barrelO, 121.5], [R.barrelI, 121.5]], { axis: "u" }), edges: [] }, { mat: "solid" }));
}

// Thread bush pressed into the barrel: M8×0.5 inside. Engaged threads: the screw's crest hides
// the nut's, so the hatching runs to the major diameter.
export function bush(V) {
  const loop = [[4.0, 15], [4.5, 15], [4.5, 24], [3.3, 24], [3.3, 21.6], [4.0, 21]];
  return part(2, K.section(V, { ...K.revolve(loop, { axis: "u" }), edges: [] }, { mat: "brass", angle: 45 }));
}

export function nose(V) {
  const loop = [
    [1.3, 0], [2.0, 0], [4.85, 15], [4.0, 15], [4.0, 20.6], [3.75, 21], [3.2, 21],
    [3.2, 13], [2.5, 13], [2.5, M.SEAT_U], [1.7, M.SEAT_U], [1.7, 1], [1.3, 1],
  ];
  const rev = K.revolve(loop, { axis: "u" });
  const roots = [[[15, 3.7], [20.6, 3.7]], [[15, -3.7], [20.6, -3.7]]];
  return part(3, K.section(V, rev, { mat: "brass", angle: 135 }) + K.lines(V, roots, "thin"));
}

export function guide(V) {
  const notchRoof = M.ridgeBottom(THETA_S + 180);
  const top = [[91.4, R.guideI], [91, R.guideI + 0.4], [91, R.barrelI], [M.GUIDE_TOP, R.barrelI], [M.GUIDE_TOP, R.guideI]];
  const bottom = [
    [91.4, -R.guideI], [notchRoof, -R.guideI], [notchRoof, -R.ridge], [M.GUIDE_TOP - 0.4, -R.ridge],
    [M.GUIDE_TOP, -R.ridge - 0.4], [M.GUIDE_TOP, -R.barrelI], [91, -R.barrelI], [91, -R.guideI - 0.4],
  ];
  // seen beyond the plane: the far wall of the long slot (top) and of the short slot (bottom)
  const c = Math.cos(rad(7.5));
  const yL = M.ridgeBottom(-15);
  const beyond = [
    [[yL, R.ridge * c], [M.GUIDE_TOP, R.ridge * c]], [[yL, R.ridge * c], [yL, R.guideI * c]],
    [[M.Y_G, -R.ridge * c], [notchRoof, -R.ridge * c]], [[M.Y_G, -R.ridge * c], [M.Y_G, -R.guideI * c]],
  ];
  return part(12, K.lines(V, beyond) + K.cut(V, top, { mat: "plastic", angle: 45 }) + K.cut(V, bottom, { mat: "plastic", angle: 45 }));
}

export const CAP = { spigot: 118.35, flange: 122, top: 125 };

export function topCap(V) {
  const loop = [[2.6, CAP.spigot], [R.barrelI, CAP.spigot], [R.barrelI, CAP.flange], [R.barrelO, CAP.flange], [R.barrelO, CAP.top - 0.5], [R.barrelO - 0.5, CAP.top], [2.6, CAP.top]];
  return part(15, K.section(V, { ...K.revolve(loop, { axis: "u" }), edges: [] }, { mat: "brass", angle: 45 }));
}

export function clip(V) {
  const path = [[121.75, 4.55], [121.75, 5.85], [121.2, 6.3], [118.5, 6.35], [86, 5.75], [82.2, 5.6]];
  const ring = K.rect(121.5, -R.barrelO, 122, -R.barrelI);
  const ball = K.circle(81.6, 5.35, 0.5, 20);
  return part(16, K.cut(V, strip(path, 0.5), { mat: "solid" }) + K.cut(V, ball, { mat: "solid" }) + K.cut(V, ring, { mat: "solid" }));
}

// ---------------------------------------------------------------- refill (drawn at EXTENDED)

export const S0 = M.U_R_EXT - M.REFILL_L; // u of s = 0 at the reference pose
const at = (s) => s + S0;

// The point, cut through one of its five ink grooves at the top; the bottom half is between grooves.
export function point(V) {
  const outer = [[0.3, 0.62], [3.5, 1.15], [14, 1.15]];
  const innerTop = [[14, 0.6], [2.6, 0.6], [2.6, 0.2], [1.12, 0.2], [1.02, 0.51], [0.45, 0.51], [0.3, 0.462]];
  const innerBot = [[14, 0.6], [2.6, 0.6], [2.6, 0.2], [0.96, 0.2], [0.854, 0.354], [0.62, 0.51], [0.45, 0.51], [0.3, 0.462]];
  const top = [...outer, ...innerTop].map(([s, r]) => [at(s), r]);
  const bot = [...outer, ...innerBot].map(([s, r]) => [at(s), -r]);
  return part(5, K.cut(V, top, { mat: "bronze", angle: 135 }) + K.cut(V, bot, { mat: "bronze", angle: 135 }));
}

export function ball(V) {
  return part(6, K.body(V, K.circle(at(0.5), 0, 0.5, 48)));
}

export function holder(V) {
  const loop = [[1.15, 10], [1.4, 10], [1.8, 11.6], [1.8, M.COLLAR_S], [2.9, M.COLLAR_S], [2.9, 23], [2.7, 23], [2.7, 28], [0.9, 28], [0.9, 14], [1.15, 14]];
  const rev = K.revolve(loop.map(([r, s]) => [r, at(s)]), { axis: "u" });
  return part(7, K.section(V, { ...rev, edges: [] }, { mat: "brass", angle: 45 }));
}

export function tube(V) {
  return part(8, K.section(V, { ...K.revolve([[2.7, at(23)], [3.0, at(23)], [3.0, at(96)], [2.7, at(96)]], { axis: "u" }), edges: [] }, { mat: "solid" }));
}

export function follower(V) {
  return part(9, K.cut(V, K.rect(at(70), -2.7, at(74), 2.7), { mat: "rubber", angle: 45 }));
}

export function endPlug(V) {
  const loop = [[0, at(93)], [2.7, at(93)], [2.7, at(96)], [3.0, at(96)], [3.0, at(98)], [0, at(98)]];
  return part(10, K.section(V, { ...K.revolve(loop, { axis: "u" }), edges: [] }, { mat: "plastic", angle: 135 }));
}

// The ink: a liquid, drawn with level lines. In the tube, the holder, the point and its grooves.
export const inkShapes = () => [
  K.rect(at(28), -2.7, at(70), 2.7),
  K.rect(at(14), -0.9, at(28), 0.9),
  K.rect(at(2.6), -0.6, at(14), 0.6),
  K.rect(at(0.9), -0.2, at(2.6), 0.2),
];
export function ink(V) {
  const d = inkShapes().map((p) => K.d(V, p)).join("");
  return part(17, `<path class="paper" d="${d}"/><path class="ink" d="${d}"/>`);
}

export const refill = (V) => tube(V) + ink(V) + follower(V) + endPlug(V) + holder(V) + point(V) + ball(V);

// The spring between the nose cone's seat and the holder's collar; re-drawn as it compresses.
export function spring(V, Y) {
  const to = M.refillEnd(Y) - M.REFILL_L + M.COLLAR_S;
  return part(4, K.springSection(V, { from: M.SEAT_U, to, radius: M.SPRING.D / 2, wire: M.SPRING.d, turns: M.SPRING.n, axis: "u", at: 0 }));
}

// ---------------------------------------------------------------- plunger and button (in view)

export const PL = { key: 2, tube: 13.6, collar: 14.6, button: 27.775, buttonH: 4.5, stem: 31.275 };

function teethCurve(yPt, r, from, to, n = 72) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const th = from + ((to - from) * i) / n;
    out.push([M.plungerBottom(th, yPt), r * cosS(th)]);
  }
  return out;
}

// Plunger at tooth tips yPt. The far half's teeth show through the bore (seen first, behind).
export function plunger(V, yPt = M.YPT_TOP) {
  const far = [...teethCurve(yPt, R.plI, THETA_S + 180, THETA_S + 360), [yPt + 2.6, R.plI], [yPt + 2.6, -R.plI]];
  const near = [
    ...teethCurve(yPt, R.plO, THETA_S, THETA_S + 180),
    [yPt + PL.tube, -R.plO], [yPt + PL.tube, -R.collar], [yPt + PL.collar, -R.collar], [yPt + PL.collar, -R.stem],
    [yPt + PL.stem, -R.stem], [yPt + PL.stem, R.stem], [yPt + PL.collar, R.stem], [yPt + PL.collar, R.collar],
    [yPt + PL.key, R.collar], [yPt + PL.key, R.plO],
  ];
  // the key in the long slot at 105°–120°, on the near face
  const k0 = R.plO * cosS(105);
  const k1 = R.lugO * cosS(105);
  const k2 = R.lugO * cosS(120);
  const key = [[yPt + PL.key, k0], [yPt + PL.tube, k0], [yPt + PL.tube, k2], [yPt + PL.key, k2]];
  return {
    far: part(13, K.body(V, far)),
    near: part(13, K.body(V, near) + K.body(V, key) + K.line(V, [[yPt + PL.key, k1], [yPt + PL.tube, k1]]) + K.line(V, [[yPt + PL.tube, R.plO], [yPt + PL.tube, R.collar]], "thin")),
  };
}

export function button(V, yPt = M.YPT_TOP) {
  const b = yPt + PL.button;
  const dome = [];
  for (let a = 0; a <= 90; a += 15) dome.push([3.5 * Math.cos(rad(a)), b + 3.3 + 1.2 * Math.sin(rad(a))]);
  const loop = [[2.5, b], [3.5, b], ...dome, [0, b + PL.buttonH], [0, b + 3.5], [2.5, b + 3.5]];
  return part(14, K.section(V, { ...K.revolve(loop, { axis: "u" }), edges: [] }, { mat: "steel", angle: 135 }));
}

// ---------------------------------------------------------------- rotator (in view, the accent)

// The rotator with its lugs' leading corners at angle X (deg) and height Y (u of the corner).
// The lug's angular span split into the near half (in front of the cutting plane) and the far half.
function halves(a, b) {
  const ra = (((a - THETA_S) % 360) + 360) % 360;
  const rb = ra + (b - a);
  const out = [];
  for (const [lo, hi, near] of [[0, 180, true], [180, 360, false], [360, 540, true]]) {
    const x0 = Math.max(ra, lo);
    const x1 = Math.min(rb, hi);
    if (x1 > x0 + 0.05) out.push({ a: x0 + a - ra, b: x1 + a - ra, near });
  }
  return out;
}

function lugView(V, phi, Y, a, b, bot, closedA, closedB) {
  const pts = [];
  for (let j = 0; j <= 6; j++) {
    const th = a + ((b - a) * j) / 6;
    const top = M.lugTop(th, phi, Y);
    for (const r of [R.hub, R.lugO]) pts.push([bot, r * cosS(th)], [top, r * cosS(th)]);
  }
  const edges = [];
  if (closedA) edges.push([[bot, R.lugO * cosS(a)], [M.lugTop(a, phi, Y), R.lugO * cosS(a)]]);
  if (closedB) edges.push([[bot, R.lugO * cosS(b)], [M.lugTop(b, phi, Y), R.lugO * cosS(b)]]);
  return camBody(V, hull(pts)) + (edges.length ? K.lines(V, edges, "vis cam-line") : "");
}

// The rotator with its lugs' leading corners at angle X (deg) and height Y (u of the corner).
// far: the lug portions behind the cutting plane (drawn under the cut faces); near: the rest.
export function rotator(V, X, Y) {
  const ur = M.refillEnd(Y);
  const bot = ur + 1;
  let far = "";
  let near = "";
  for (let i = 0; i < M.LUGS; i++) {
    const phi = X + 120 * i;
    const a = phi - M.LUG_W + 0.5;
    const b = phi - 0.5;
    for (const h of halves(a, b)) {
      const svg = lugView(V, phi, Y, h.a, h.b, bot, Math.abs(h.a - a) < 0.01, Math.abs(h.b - b) < 0.01);
      if (h.near) near += svg;
      else far += svg;
    }
  }
  const base = camBody(V, [[ur, -R.base], [ur + 1, -R.base], [ur + 1, R.base], [ur, R.base]]);
  const hub = camBody(V, [[ur + 1, -R.hub], [ur + 8, -R.hub], [ur + 8, R.hub], [ur + 1, R.hub]]);
  return { far: part(11, far, ` class="cam"`), near: part(11, base + hub + near, ` class="cam"`) };
}

// ---------------------------------------------------------------- phantom extreme positions

export function phantoms(V) {
  // the point at EXTENDED (the writing position)
  const tip = [[at(0.3), 0.62], [at(3.5), 1.15], [at(8), 1.15]];
  const tipLine = K.line(V, [...tip, ...tip.map(([u, v]) => [u, -v]).reverse()], "phan");
  // the button fully out (RETRACTED, at rest)
  const b = M.YPT_TOP + PL.button;
  const btn = [[b, 3.5], [b + 3.3, 3.5], [b + 3.9, 2.4], [b + PL.buttonH, 0], [b + 3.9, -2.4], [b + 3.3, -3.5], [b, -3.5]];
  return tipLine + K.line(V, btn, "phan", true);
}

// ---------------------------------------------------------------- DEVELOPED VIEW E (world: θ·MMD, u)

const dx = (theta) => theta * M.MMD;

export function devRidges(V, from, to) {
  let out = "";
  for (let base = -360; base <= 360; base += 120) {
    // one ridge runs from a long slot's right wall (base) to the next long slot's left wall
    const pts = [[dx(base), 111]];
    for (let k = 0; k < 2; k++) {
      const e = base + 60 * k;
      pts.push([dx(e), M.Y_G]);
      const steps = 8;
      for (let j = 1; j <= steps; j++) {
        const t = (45 * j) / steps;
        pts.push([dx(e + t), M.Y_G + M.SLOPE * M.MMD * t]);
      }
      if (k === 0) {
        pts.push([dx(e + 45), M.ridgeBottom(e + 45.001)]);
        pts.push([dx(e + 60), M.Y_V + M.NOTCH]);
      }
    }
    pts.push([dx(base + 105), 111]);
    if (dx(base + 105) < dx(from) || dx(base) > dx(to)) continue;
    out += K.cut(V, pts, { mat: "plastic", angle: 45 });
  }
  return part(12, out);
}

export function devLugs(V, X, Y, from, to) {
  let out = "";
  const ur = M.refillEnd(Y);
  for (let i = -3; i <= 6; i++) {
    const phi = X + 120 * i;
    const a = phi - M.LUG_W + 0.5;
    const b = phi - 0.5;
    if (b < from - 20 || a > to + 20) continue;
    out += camBody(V, [[dx(a), ur + 1], [dx(b), ur + 1], [dx(b), M.lugTop(b, phi, Y)], [dx(a), M.lugTop(a, phi, Y)]]);
  }
  return part(11, out, ` class="cam"`);
}

// The plunger's teeth (radius 2–2.95, inside the ridges) projected onto the track: an adjacent part.
export function devPlunger(V, from, to, yPt = M.YPT_TOP) {
  const pts = [];
  for (let th = from - 20; th <= to + 20; th += 1.25) pts.push([dx(th), M.plungerBottom(th, yPt)]);
  let keys = "";
  for (let c = -360; c <= 720; c += 120) {
    if (c < from - 20 || c - 15 > to + 20) continue;
    keys += K.line(V, [[dx(c - 15), 113], [dx(c - 15), yPt + PL.key], [dx(c), yPt + PL.key], [dx(c), 113]], "phan");
  }
  return K.line(V, pts, "phan", false) + keys;
}

// The path of a lug's leading corner through one revolution.
export function lugPath(from, to) {
  const pts = [];
  const yIdx = M.Y_G + M.H_R / 2;
  const yLow = M.Y_MIN + M.H_R / 2;
  for (let q = -4; q <= 16; q += 2) {
    const e = q * 30;
    const top = M.slotKind(q) === "long" ? M.Y_RET : M.Y_N;
    pts.push([e, top], [e, M.Y_G], [e + 30, yIdx], [e + 30, yLow], [e + 30, yIdx], [e + 60, M.Y_V]);
  }
  return pts.filter(([th]) => th >= from - 30 && th <= to + 30).map(([th, u]) => [dx(th), u]);
}

// ---------------------------------------------------------------- SECTION B-B (world: across the axis)

// Looking toward the tip: angle θ appears at the top for θ = θS and turns counter-clockwise.
export const polar = (r, theta) => [-r * sinS(theta), r * cosS(theta)];

function ringPath(V, rOut, rInner) {
  const outer = [];
  const inner = [];
  for (let i = 0; i < 360; i += 2) outer.push(polar(rOut, i));
  for (let i = 0; i < 720; i++) inner.push(polar(rInner(i / 2), i / 2));
  return K.d(V, outer) + K.d(V, inner.reverse());
}

export function annulusCut(V, d, mat, angle) {
  if (mat === "solid") return `<path class="solid" fill-rule="evenodd" d="${d}"/>`;
  return `<path class="paper" fill-rule="evenodd" d="${d}"/><path fill-rule="evenodd" fill="url(#h-${mat}-${angle})" d="${d}"/><path class="vis" d="${d}"/>`;
}

// What the riding plane at height h cuts of the guide: the wall, and the ridges below h.
export function bbGuide(V, h) {
  const inner = (th) => (M.ridgeBottom(th) < h ? R.ridge : R.guideI);
  return part(12, annulusCut(V, ringPath(V, R.barrelI, inner), "plastic", 45));
}

export function bbBarrel(V) {
  return part(1, annulusCut(V, ringPath(V, R.barrelO, () => R.barrelI), "solid"));
}

// The plunger's teeth below h, cut: sectors of its tube.
export function bbPlunger(V, h, yPt) {
  let out = "";
  let run = null;
  const flush = (end) => {
    if (!run) return;
    const pts = [];
    for (let th = run; th <= end; th += 0.5) pts.push(polar(R.plO, th));
    for (let th = end; th >= run; th -= 0.5) pts.push(polar(R.plI, th));
    out += K.cut(V, pts, { mat: "plastic", angle: 135 });
    run = null;
  };
  for (let th = 0; th <= 360; th += 0.5) {
    const cutHere = M.plungerBottom(th, yPt) < h && th < 360;
    if (cutHere && run === null) run = th;
    if (!cutHere && run !== null) flush(th);
  }
  flush(360);
  return out ? part(13, out) : "";
}

// The rotator cut at its lugs, drawn with its leading corner at angle 0; the page rotates it.
export function bbRotator(V) {
  const pts = [];
  for (let i = 0; i < M.LUGS; i++) {
    const phi = 120 * i;
    const a = phi - M.LUG_W + 0.5;
    const b = phi - 0.5;
    for (let th = b - 120; th <= a; th += 2) pts.push(polar(R.hub, th));
    pts.push(polar(R.hub, a));
    for (let th = a; th <= b; th += 1.5) pts.push(polar(R.lugO, th));
    pts.push(polar(R.lugO, b), polar(R.hub, b));
  }
  const dd = K.d(V, pts);
  return part(11, `<path class="paper" d="${dd}"/><path fill="url(#h-cam)" d="${dd}"/><path class="vis cam-line" d="${dd}"/>`, ` class="cam"`);
}

// Seen beyond the plane: the rotator's thrust collar and the refill's end.
export function bbBeyond(V) {
  return part(10, K.line(V, K.circle(0, 0, 3.0, 72), "vis", true)) + K.line(V, K.circle(0, 0, R.base, 72), "vis", true);
}
