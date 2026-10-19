// Local drawing helpers the kit does not have (copied from the light-aircraft and propeller sheets and
// extended): rotation, a convex hull, polygon inset, cut faces with holes, sheet-metal bands, a slot's
// outline round a centre line, a cut face broken off freehand, a cutting-plane line, an angular
// dimension and arrows. Pure, returns SVG strings or world point lists; runs in node and in the page.
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
function norm([x, y]) {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}
// Offset a closed polygon inward by d (mitred, clamped at sharp corners), keeping the point order.
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
    const m = norm([n1[0] + n2[0], n1[1] + n2[1]]);
    const cosh = Math.max(0.35, m[0] * n2[0] + m[1] * n2[1]);
    out.push([b[0] + (m[0] * d) / cosh, b[1] + (m[1] * d) / cosh]);
  }
  return out;
}

// A closed outline with holes, drawn as a cut face (hatch) or blacked in, using the even-odd rule.
export function cutHoles(V, outer, holes, { mat = "steel", angle = 45 } = {}) {
  const dd = [outer, ...holes].map((p) => K.d(V, p)).join("");
  if (mat === "solid") return `<path class="solid" fill-rule="evenodd" d="${dd}"/>`;
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path fill="url(#h-${mat}-${angle})" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
}
// A body with holes (paper and a thick outline, unhatched).
export function bodyHoles(V, outer, holes) {
  const dd = [outer, ...holes].map((p) => K.d(V, p)).join("");
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
}

// A band of thickness t to the right of an open path (sheet metal along its face): a closed outline.
export function band(path, t) {
  const n = path.length;
  const nrm = (i) => {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    return [dy / L, -dx / L];
  };
  const off = path.map((p, i) => {
    const [nx, ny] = nrm(i);
    let k = 1;
    if (i > 0 && i < n - 1) {
      const a = path[i - 1];
      const c = path[i + 1];
      const d1 = [p[0] - a[0], p[1] - a[1]];
      const d2 = [c[0] - p[0], c[1] - p[1]];
      const l1 = Math.hypot(...d1) || 1;
      const l2 = Math.hypot(...d2) || 1;
      const cos = (d1[0] * d2[0] + d1[1] * d2[1]) / (l1 * l2);
      k = 1 / Math.max(0.5, Math.sqrt((1 + cos) / 2));
    }
    return [p[0] + nx * t * k, p[1] + ny * t * k];
  });
  return [...path, ...off.reverse()];
}
// An open path offset sideways by d (+ to its right).
export function offsetPath(path, d) {
  const b = band(path, d);
  return b.slice(path.length).reverse();
}
// A strip of width w centred on an open path (a rod, a cable, a tube seen from the side).
export function strip(path, w) {
  const a = offsetPath(path, -w / 2);
  const b = offsetPath(path, w / 2);
  return [...a, ...b.reverse()];
}
// A slot of half-width r round an open centre line, with round ends.
export function capsule(path, r, steps = 10) {
  const n = path.length;
  const left = offsetPath(path, -r);
  const right = offsetPath(path, r);
  const cap = (p, q, flip) => {
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]) / rad;
    return K.arc(p[0], p[1], r, a + (flip ? 90 : -90), a + (flip ? -90 : 90) - 360 * 0, steps).slice(1, -1);
  };
  const endCap = (() => {
    const p = path[n - 1];
    const a = Math.atan2(p[1] - path[n - 2][1], p[0] - path[n - 2][0]) / rad;
    return K.arc(p[0], p[1], r, a + 90, a - 90, steps).slice(1, -1);
  })();
  const startCap = (() => {
    const p = path[0];
    const a = Math.atan2(path[1][1] - p[1], path[1][0] - p[0]) / rad;
    return K.arc(p[0], p[1], r, a - 90, a - 270, steps).slice(1, -1);
  })();
  void cap;
  return [...left, ...endCap, ...right.reverse(), ...startCap];
}

// Freehand points (ISO 128 type C) from a to b in world units, with a small irregular wave.
export function freehandPts(a, b, amp = 1.2, seed = 1, n = 9) {
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280 - 0.5) * 2;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = -(b[1] - a[1]) / L;
  const ny = (b[0] - a[0]) / L;
  const out = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const w = k === 0 || k === n ? 0 : amp * rnd();
    out.push([a[0] + (b[0] - a[0]) * t + nx * w, a[1] + (b[1] - a[1]) * t + ny * w]);
  }
  return out;
}
// A freehand break line between two world points (thin, irregular).
export function freehand(V, a, b, amp = 1.2, seed = 1) {
  return `<path class="thin" d="${K.d(V, freehandPts(a, b, amp, seed), false)}"/>`;
}

// A cutting-plane line: thin chain, thick at the ends, arrows giving the direction of view, a letter
// beyond each end. a, b: world end points; [dx, dy]: the sheet direction of the arrows.
export function cuttingPlane(V, a, b, [dx, dy], letter, { chain = true } = {}) {
  const [ax, ay] = V.p(a);
  const [bx, by] = V.p(b);
  const len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const thick = 8;
  const arrowLen = 14;
  let out = chain ? `<path class="ctr" d="M${ax} ${ay}L${bx} ${by}"/>` : "";
  out += `<path class="vis" d="M${ax} ${ay}L${K.r2(ax + ux * thick)} ${K.r2(ay + uy * thick)}M${bx} ${by}L${K.r2(bx - ux * thick)} ${K.r2(by - uy * thick)}"/>`;
  let heads = "";
  let letters = "";
  for (const [x, y, end] of [[ax, ay, -1], [bx, by, 1]]) {
    const tx = x + dx * arrowLen;
    const ty = y + dy * arrowLen;
    out += `<path class="thin" d="M${K.r2(x)} ${K.r2(y)}L${K.r2(tx - dx * K.ARROW)} ${K.r2(ty - dy * K.ARROW)}"/>`;
    const h = K.ARROW * 0.25;
    const bx2 = tx - dx * K.ARROW;
    const by2 = ty - dy * K.ARROW;
    heads += `M${K.r2(tx)} ${K.r2(ty)}L${K.r2(bx2 - dy * h)} ${K.r2(by2 + dx * h)}L${K.r2(bx2 + dy * h)} ${K.r2(by2 - dx * h)}Z`;
    letters += `<text class="t t-lg" x="${K.r2(x + ux * end * 9 - dx * 7)}" y="${K.r2(y + uy * end * 9 + 4.2 - dy * 7)}" text-anchor="middle">${letter}</text>`;
  }
  return `<g data-role="label">${out}<path class="head" d="${heads}"/>${letters}</g>`;
}

// An angular dimension: an arc of sheet radius R about world point c from world angle a0 to a1
// (degrees, counter-clockwise in the view), arrows at both ends, text outside the arc's middle.
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
  const ax = Math.cos(-mid * rad);
  const tx = K.r2(mx + ax * (tw / 2));
  return (
    `<g data-role="dim"${id ? ` id="${id}"` : ""}><path class="thin" d="${path}"/><path class="head" d="${heads}"/>` +
    `<text class="t" x="${tx}" y="${K.r2(my + 3.4)}" text-anchor="middle">${text}</text></g>`
  );
}

// A vector arrow in sheet units, from (x0, y0) to (x1, y1): a line and a filled head.
export function vec(x0, y0, x1, y1, cls = "thin", headCls = "head", size = 5.5) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  if (L < 0.5) return "";
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  const s = Math.min(size, L * 0.6);
  const bx = x1 - ux * s;
  const by = y1 - uy * s;
  const h = s * 0.32;
  return (
    `<path class="${cls}" d="M${K.r2(x0)} ${K.r2(y0)}L${K.r2(bx)} ${K.r2(by)}"/>` +
    `<path class="${headCls}" d="M${K.r2(x1)} ${K.r2(y1)}L${K.r2(bx - uy * h)} ${K.r2(by + ux * h)}L${K.r2(bx + uy * h)} ${K.r2(by - ux * h)}Z"/>`
  );
}
// A polyline in world points with an arrow head at its end (sheet size), for flow lines.
export function flowLine(V, pts, cls = "flow", headCls = "flow-head", size = 4.5) {
  if (pts.length < 2) return "";
  const sp = pts.map((p) => V.p(p));
  const n = sp.length;
  const [x1, y1] = sp[n - 1];
  const [x0, y0] = sp[n - 2];
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  const bx = x1 - ux * size;
  const by = y1 - uy * size;
  const h = size * 0.34;
  const d = sp.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("");
  return `<path class="${cls}" d="${d}"/><path class="${headCls}" d="M${K.r2(x1)} ${K.r2(y1)}L${K.r2(bx - uy * h)} ${K.r2(by + ux * h)}L${K.r2(bx + uy * h)} ${K.r2(by - ux * h)}Z"/>`;
}

// An aligned dimension between two world points, its line offset by off sheet units to the left of
// a→b, arrows at both ends (outside when short), the text beyond b's end or at the middle.
export function alignedDim(V, a, b, text, { off = 0, id = "", textAt = "mid" } = {}) {
  const A = V.p(a);
  const B = V.p(b);
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
  const ux = (B[0] - A[0]) / L;
  const uy = (B[1] - A[1]) / L;
  const nx = uy;
  const ny = -ux;
  const P = [A[0] + nx * off, A[1] + ny * off];
  const Q = [B[0] + nx * off, B[1] + ny * off];
  const inside = L >= K.ARROW * 2 + 3;
  const head = (p, d) => {
    const bx = p[0] - d[0] * K.ARROW;
    const by = p[1] - d[1] * K.ARROW;
    const h = K.ARROW * 0.25;
    return `M${K.r2(p[0])} ${K.r2(p[1])}L${K.r2(bx - d[1] * h)} ${K.r2(by + d[0] * h)}L${K.r2(bx + d[1] * h)} ${K.r2(by - d[0] * h)}Z`;
  };
  let line;
  let heads;
  if (inside) {
    line = `M${K.r2(P[0])} ${K.r2(P[1])}L${K.r2(Q[0])} ${K.r2(Q[1])}`;
    heads = head(P, [-ux, -uy]) + head(Q, [ux, uy]);
  } else {
    const e = K.ARROW + 6;
    line = `M${K.r2(P[0] - ux * e)} ${K.r2(P[1] - uy * e)}L${K.r2(Q[0] + ux * e)} ${K.r2(Q[1] + uy * e)}`;
    heads = head(P, [ux, uy]) + head(Q, [-ux, -uy]);
  }
  let ext = "";
  if (Math.abs(off) > K.GAP) {
    const s = Math.sign(off);
    for (const E of [A, B]) ext += `M${K.r2(E[0] + nx * s * K.GAP)} ${K.r2(E[1] + ny * s * K.GAP)}L${K.r2(E[0] + nx * (off + s * K.OVER))} ${K.r2(E[1] + ny * (off + s * K.OVER))}`;
  }
  const tw = K.textWidth(text);
  let tx;
  let ty;
  if (textAt === "mid" && L >= tw + K.ARROW * 2 + 6) {
    tx = (P[0] + Q[0]) / 2 + nx * 4;
    ty = (P[1] + Q[1]) / 2 + ny * 4 + 3.2;
  } else {
    const e = (inside ? 4 : K.ARROW + 8) + tw / 2;
    tx = Q[0] + ux * e;
    ty = Q[1] + uy * e + 3.2;
  }
  return `<g data-role="dim"${id ? ` id="${id}"` : ""}><path class="thin" d="${ext}${line}"/><path class="head" d="${heads}"/><text class="t" x="${K.r2(tx)}" y="${K.r2(ty)}" text-anchor="middle">${text}</text></g>`;
}
