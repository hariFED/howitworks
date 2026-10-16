// Local drawing helpers the kit does not have: rotation about a point, unions of cut faces,
// hulls of circles, tension springs between any two points, braids, bent strips and an angular
// dimension. Pure, returns SVG strings, runs in node and in the page.
import * as K from "../../kit/draft.mjs";

const rad = (d) => (d * Math.PI) / 180;

// Rotate world points about c by deg (counter-clockwise, v up).
export function rot(pts, [cu, cv], deg) {
  if (!deg) return pts;
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return pts.map(([u, v]) => [cu + (u - cu) * c - (v - cv) * s, cv + (u - cu) * s + (v - cv) * c]);
}
export const rotPt = (p, c, deg) => rot([p], c, deg)[0];

// Convex hull (monotone chain) of a point cloud.
export function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
// The hull of several circles [[u, v, r], ...]: a link plate or a lever with rounded ends.
export const hullCircles = (cs, steps = 28) => hull(cs.flatMap(([u, v, r]) => K.circle(u, v, r, steps)));

// One cut face made of several overlapping polygons: the union's outline only.
// Strokes go first at twice the weight, then every fill covers the inner half of every stroke.
export function cutUnion(V, polys, { mat = "steel", angle = 45 } = {}) {
  const dd = polys.map((p) => K.d(V, p)).join("");
  if (mat === "solid") return `<path class="solid" d="${dd}"/>`;
  return `<path class="vis2" d="${dd}"/><path class="paper" d="${dd}"/><path fill="url(#h-${mat}-${angle})" d="${dd}"/>`;
}
export function bodyUnion(V, polys) {
  const dd = polys.map((p) => K.d(V, p)).join("");
  return `<path class="vis2" d="${dd}"/><path class="paper" d="${dd}"/>`;
}

// A tension spring cut along its axis between two world points: wire sections blacked in on
// both sides, joined by the back half of each turn, with a hook loop at each end.
export function springBetween(V, a, b, { radius = 1, wire = 0.4, turns = 8, hook = 1.2 } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / L;
  const uy = (b[1] - a[1]) / L;
  const at = (s, r) => [a[0] + ux * s - uy * r, a[1] + uy * s + ux * r];
  const from = hook + radius * 0.6;
  const to = L - hook - radius * 0.6;
  const pitch = (to - from - wire) / turns;
  const start = from + wire / 2;
  const back = [];
  let sections = "";
  for (let i = 0; i <= turns; i++) {
    const s = start + i * pitch;
    sections += K.cut(V, K.circle(...at(s, radius), wire / 2, 10), { mat: "solid" });
    if (i < turns) {
      sections += K.cut(V, K.circle(...at(s + pitch / 2, -radius), wire / 2, 10), { mat: "solid" });
      back.push([at(s, radius), at(s + pitch / 2, -radius)]);
    }
  }
  // hooks: a half loop from the end coil to the anchor point
  const hookA = [at(start, radius), at(hook * 0.9, radius * 0.9), at(hook * 0.3, radius * 0.5), at(0, 0)];
  const hookB = [at(start + turns * pitch, radius), at(L - hook * 0.9, radius * 0.9), at(L - hook * 0.3, radius * 0.5), at(L, 0)];
  return K.lines(V, back, "vis spring") + K.lines(V, [hookA, hookB], "vis") + sections;
}

// Points along a quadratic Bézier.
export function quad(a, c, b, n = 16) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const m = 1 - t;
    out.push([m * m * a[0] + 2 * m * t * c[0] + t * t * b[0], m * m * a[1] + 2 * m * t * c[1] + t * t * b[1]]);
  }
  return out;
}

// A band of width w along a polyline (a flexible braid or a bent strip).
export function band(line, w) {
  const left = [];
  const right = [];
  for (let i = 0; i < line.length; i++) {
    const p = line[Math.max(0, i - 1)];
    const q = line[Math.min(line.length - 1, i + 1)];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const nx = -(q[1] - p[1]) / L;
    const ny = (q[0] - p[0]) / L;
    left.push([line[i][0] + (nx * w) / 2, line[i][1] + (ny * w) / 2]);
    right.push([line[i][0] - (nx * w) / 2, line[i][1] - (ny * w) / 2]);
  }
  return [...left, ...right.reverse()];
}

// Angular dimension: an arc about c from angle a0 to a1 (degrees), arrowheads, text beyond a1.
export function angDim(V, c, r, a0, a1, text, { id = "" } = {}) {
  const [cx, cy] = V.p(c);
  const R = r * V.k;
  const pt = (a, rr = R) => [K.r2(cx + rr * Math.cos(rad(a))), K.r2(cy - rr * Math.sin(rad(a)))];
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  let arcD = "";
  const n = Math.max(2, Math.ceil((hi - lo) / 3));
  for (let i = 0; i <= n; i++) {
    const [x, y] = pt(lo + ((hi - lo) * i) / n);
    arcD += `${i ? "L" : "M"}${x} ${y}`;
  }
  const head = (a, dir) => {
    // arrow tip at angle a, pointing along the arc (dir +1 = increasing angle)
    const [x, y] = pt(a);
    const tx = -Math.sin(rad(a)) * dir;
    const ty = -Math.cos(rad(a)) * dir;
    const bx = x - tx * K.ARROW;
    const by = y - ty * K.ARROW;
    const h = K.ARROW * 0.25;
    return `M${x} ${y}L${K.r2(bx - ty * h)} ${K.r2(by + tx * h)}L${K.r2(bx + ty * h)} ${K.r2(by - tx * h)}Z`;
  };
  const span = ((hi - lo) * Math.PI * R) / 180;
  const heads = span > 2 * K.ARROW + 2 ? head(hi, 1) + head(lo, -1) : "";
  const [tx, ty] = pt(lo - 5, R + 4);
  const ext = [a0, a1].map((a) => {
    const [x1, y1] = pt(a, R - 3);
    const [x2, y2] = pt(a, R + 3.5);
    return `M${x1} ${y1}L${x2} ${y2}`;
  });
  return (
    `<g data-role="dim"${id ? ` id="${id}"` : ""}><path class="thin" d="${arcD}${ext.join("")}"/>` +
    (heads ? `<path class="head" d="${heads}"/>` : "") +
    `<text class="t" x="${tx}" y="${K.r2(ty + 3)}" text-anchor="start">${text}</text></g>`
  );
}

// The centre of wire section i (on the +radius side) of springBetween with the same options.
export function springPoint(a, b, { radius = 1, wire = 0.4, turns = 8, hook = 1.2 } = {}, i = 4) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / L;
  const uy = (b[1] - a[1]) / L;
  const from = hook + radius * 0.6;
  const to = L - hook - radius * 0.6;
  const pitch = (to - from - wire) / turns;
  const sp = from + wire / 2 + i * pitch;
  return [a[0] + ux * sp - uy * radius, a[1] + uy * sp + ux * radius];
}
