// Local drawing helpers the kit does not have: rotation about a point, a convex hull, polygon offset,
// bands with holes, an angular dimension, a cutting-plane line, a freehand break line, force arrows and
// the third-angle projection symbol. Pure, returns SVG strings, runs in node and in the page.
import * as K from "../../kit/draft.mjs";

const rad = Math.PI / 180;

// Rotate world points about c by deg (counter-clockwise, v up).
export function rot(pts, [cu, cv], deg) {
  if (!deg) return pts;
  const c = Math.cos(deg * rad);
  const s = Math.sin(deg * rad);
  return pts.map(([u, v]) => [cu + (u - cu) * c - (v - cv) * s, cv + (u - cu) * s + (v - cv) * c]);
}

// Convex hull (monotone chain).
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
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

const signedArea = (pts) => pts.reduce((s, [x0, y0], i) => { const [x1, y1] = pts[(i + 1) % pts.length]; return s + x0 * y1 - x1 * y0; }, 0) / 2;

// Offset a closed polygon inward by d (mitred, the mitre clamped at sharp corners). Keeps the point order,
// so point i of the result is the inside partner of point i.
export function inset(pts, d) {
  const n = pts.length;
  const ccw = signedArea(pts) > 0 ? 1 : -1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n];
    const b = pts[i];
    const c = pts[(i + 1) % n];
    const n1 = norm([-(b[1] - a[1]) * ccw, (b[0] - a[0]) * ccw]);
    const n2 = norm([-(c[1] - b[1]) * ccw, (c[0] - b[0]) * ccw]);
    let m = norm([n1[0] + n2[0], n1[1] + n2[1]]);
    const cosh = Math.max(0.35, m[0] * n2[0] + m[1] * n2[1]);
    out.push([b[0] + (m[0] * d) / cosh, b[1] + (m[1] * d) / cosh]);
  }
  return out;
}
function norm([x, y]) {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

// A closed outline with holes, drawn as a cut face (hatch) or blacked in, using the even-odd rule.
export function cutHoles(V, outer, holes, { mat = "steel", angle = 45 } = {}) {
  const dd = [outer, ...holes].map((p) => K.d(V, p)).join("");
  if (mat === "solid") return `<path class="solid" fill-rule="evenodd" d="${dd}"/>`;
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path fill="url(#h-${mat}-${angle})" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
}
// A thin skin: an outline and its inset, blacked in between.
export const skin = (V, pts, t) => cutHoles(V, pts, [inset(pts, t)], { mat: "solid" });

// An angular dimension: an arc of sheet radius R about world point c from world angle a0 to a1
// (degrees, counter-clockwise in the view), arrows at both ends, text outside the arc's middle, or
// beyond its a1 end when the arc is too short.
export function angleDim(V, c, R, a0, a1, text, { id = "", gap = 8 } = {}) {
  const [cx, cy] = V.p(c);
  const pt = (a, r = R) => [K.r2(cx + r * Math.cos(-a * rad)), K.r2(cy + r * Math.sin(-a * rad))];
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  const span = (hi - lo) * rad * R;
  const tw = K.textWidth(text);
  const inside = span >= K.ARROW * 2 + 4;
  const arcPts = (from, to) => {
    const n = Math.max(2, Math.ceil(Math.abs(to - from) / 3));
    let s = "";
    for (let i = 0; i <= n; i++) {
      const [x, y] = pt(from + ((to - from) * i) / n);
      s += `${i ? "L" : "M"}${x} ${y}`;
    }
    return s;
  };
  const ext = (K.ARROW + 5) / R / rad;
  const path = inside ? arcPts(lo, hi) : arcPts(lo - ext, hi + ext);
  const head = (a, dir) => {
    const [x, y] = pt(a);
    const ux = -Math.sin(a * rad) * dir;
    const uy = -Math.cos(a * rad) * dir;
    const bx = x - ux * K.ARROW;
    const by = y - uy * K.ARROW;
    const h = K.ARROW * 0.25;
    return `M${x} ${y}L${K.r2(bx - uy * h)} ${K.r2(by + ux * h)}L${K.r2(bx + uy * h)} ${K.r2(by - ux * h)}Z`;
  };
  const heads = lo === hi ? "" : inside ? head(lo, -1) + head(hi, 1) : head(lo, 1) + head(hi, -1);
  const mid = (lo + hi) / 2;
  const [mx, my] = pt(mid, R + gap);
  // text centred on the arc's bisector, pushed out so its box clears the arc
  const ax = Math.cos(-mid * rad);
  const tx = K.r2(mx + ax * (tw / 2));
  return (
    `<g data-role="dim"${id ? ` id="${id}"` : ""}><path class="thin" d="${path}"/><path class="head" d="${heads}"/>` +
    `<text class="t" x="${tx}" y="${K.r2(my + 3.4)}" text-anchor="middle">${text}</text></g>`
  );
}

// A cutting-plane line across a view: thin chain, thick at the ends, arrows giving the direction of
// view, a letter at each end. a, b: world end points; [dx, dy]: the sheet direction of the arrows.
export function cuttingPlane(V, a, b, [dx, dy], letter) {
  const [ax, ay] = V.p(a);
  const [bx, by] = V.p(b);
  const len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const thick = 9;
  const arrowLen = 15;
  let out = `<path class="ctr" d="M${ax} ${ay}L${bx} ${by}"/>`;
  out += `<path class="vis" d="M${ax} ${ay}L${K.r2(ax + ux * thick)} ${K.r2(ay + uy * thick)}M${bx} ${by}L${K.r2(bx - ux * thick)} ${K.r2(by - uy * thick)}"/>`;
  let heads = "";
  let letters = "";
  for (const [x, y, end] of [[ax - ux * 3, ay - uy * 3, -1], [bx + ux * 3, by + uy * 3, 1]]) {
    const tx = x + dx * arrowLen;
    const ty = y + dy * arrowLen;
    out += `<path class="thin" d="M${K.r2(x)} ${K.r2(y)}L${K.r2(tx - dx * K.ARROW)} ${K.r2(ty - dy * K.ARROW)}"/>`;
    const h = K.ARROW * 0.25;
    const bx2 = tx - dx * K.ARROW;
    const by2 = ty - dy * K.ARROW;
    heads += `M${K.r2(tx)} ${K.r2(ty)}L${K.r2(bx2 - dy * h)} ${K.r2(by2 + dx * h)}L${K.r2(bx2 + dy * h)} ${K.r2(by2 - dx * h)}Z`;
    letters += `<text class="t t-lg" x="${K.r2(x + ux * end * 10)}" y="${K.r2(y + uy * end * 10 + 4.2)}" text-anchor="middle">${letter}</text>`;
  }
  return `<g data-role="label">${out}<path class="head" d="${heads}"/>${letters}</g>`;
}

// A freehand break line (ISO 128 type C: thin, continuous, irregular) through world points.
export function freehand(V, pts, amp = 0.9, seed = 1) {
  let s = "";
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280 - 0.5) * 2;
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = V.p(pts[i]);
    if (i === 0) {
      s += `M${x} ${y}`;
      continue;
    }
    const [x0, y0] = V.p(pts[i - 1]);
    const n = Math.max(2, Math.round(Math.hypot(x - x0, y - y0) / 5));
    const nx = -(y - y0) / (Math.hypot(x - x0, y - y0) || 1);
    const ny = (x - x0) / (Math.hypot(x - x0, y - y0) || 1);
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const w = k === n ? 0 : amp * rnd();
      s += `L${K.r2(x0 + (x - x0) * t + nx * w)} ${K.r2(y0 + (y - y0) * t + ny * w)}`;
    }
  }
  return `<path class="thin" d="${s}"/>`;
}

// A force arrow from world point a, along sheet direction [dx, dy] (unit), length len sheet units.
export function arrow(V, a, [dx, dy], len, cls = "vis") {
  const [x, y] = V.p(a);
  const tx = x + dx * len;
  const ty = y + dy * len;
  const L = Math.max(0, len - K.ARROW);
  const h = K.ARROW * 0.32;
  const bx = x + dx * L;
  const by = y + dy * L;
  const head = `M${K.r2(tx)} ${K.r2(ty)}L${K.r2(bx - dy * h)} ${K.r2(by + dx * h)}L${K.r2(bx + dy * h)} ${K.r2(by - dx * h)}Z`;
  return `<path class="${cls}" d="M${K.r2(x)} ${K.r2(y)}L${K.r2(bx)} ${K.r2(by)}"/><path class="${cls === "vis accent" || cls.includes("accent") ? "accent-fill" : "head"}" d="${head}"/>`;
}

// The ISO 5456-2 third-angle projection symbol in a box at sheet (x, y), height h: the end view (two
// circles) on the left, the side view of the truncated cone on the right, small end toward the circles.
export function thirdAngle(x, y, h = 12) {
  const r1 = h / 2;
  const r2 = h / 4;
  const cx = x + r1;
  const cy = y + r1;
  const x0 = x + h + 4;
  const x1 = x0 + h * 1.2;
  return (
    `<circle class="thin" cx="${K.r2(cx)}" cy="${K.r2(cy)}" r="${K.r2(r1)}"/><circle class="thin" cx="${K.r2(cx)}" cy="${K.r2(cy)}" r="${K.r2(r2)}"/>` +
    `<path class="thin" d="M${K.r2(x0)} ${K.r2(cy - r2)}L${K.r2(x1)} ${K.r2(cy - r1)}L${K.r2(x1)} ${K.r2(cy + r1)}L${K.r2(x0)} ${K.r2(cy + r2)}Z"/>` +
    `<path class="ctr" d="M${K.r2(x - 2)} ${K.r2(cy)}H${K.r2(x1 + 2)}M${K.r2(cx)} ${K.r2(y - 2)}V${K.r2(y + h + 2)}"/>`
  );
}

// The centre-of-gravity symbol: a circle with opposite quarters blacked in.
export function cgSymbol(V, at, r = 5) {
  const [x, y] = V.p(at);
  const q = (a0) => {
    const p = (a) => [K.r2(x + r * Math.cos(a * rad)), K.r2(y + r * Math.sin(a * rad))];
    const [ax, ay] = p(a0);
    const [bx, by] = p(a0 + 90);
    return `M${x} ${y}L${ax} ${ay}A${r} ${r} 0 0 1 ${bx} ${by}Z`;
  };
  return `<circle class="paper" cx="${x}" cy="${y}" r="${r}"/><path class="solid" d="${q(0)}${q(180)}"/><circle class="thin" cx="${x}" cy="${y}" r="${r}"/>`;
}
