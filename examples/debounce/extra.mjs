// Local helpers the shared kit lacks: an involute pinion, a rack, an angular dimension and a
// cutting-plane line. Pure, world mm in, SVG strings or point lists out, like kit/draft.mjs.

import * as K from "../../kit/draft.mjs";

const rad = Math.PI / 180;
const inv = (a) => Math.tan(a) - a;

// Spur gear outline (world points), z teeth of module m, 20° pressure angle, centre (cu, cv),
// one tooth centred at angle rot (degrees, counter-clockwise). shift: profile shift coefficient;
// the tip stays at rp + m (tip shortened), the root moves out with the shift.
export function gear(cu, cv, z, m, rot = 90, shift = 0, steps = 6) {
  const rp = (m * z) / 2;
  const rb = rp * Math.cos(20 * rad);
  const ra = rp + m;
  const rf = rp - (1.25 - shift) * m;
  const half = (r) => Math.PI / (2 * z) + (2 * shift * Math.tan(20 * rad)) / z + inv(20 * rad) - inv(Math.acos(Math.min(1, rb / r)));
  const pts = [];
  const at = (r, a) => [cu + r * Math.cos(a), cv + r * Math.sin(a)];
  const pitch = (2 * Math.PI) / z;
  for (let i = 0; i < z; i++) {
    const c = rot * rad + i * pitch;
    const hb = half(rb);
    // root arc from the middle of the gap before this tooth
    const g0 = c - pitch / 2;
    for (let j = 0; j <= 2; j++) pts.push(at(rf, g0 + ((c - hb - g0) * j) / 2));
    // right flank up (clockwise side), tip, left flank down
    for (let j = 0; j <= steps; j++) {
      const r = rb + ((ra - rb) * j) / steps;
      pts.push(at(r, c - half(r)));
    }
    for (let j = steps; j >= 0; j--) {
      const r = rb + ((ra - rb) * j) / steps;
      pts.push(at(r, c + half(r)));
    }
    for (let j = 0; j <= 2; j++) pts.push(at(rf, c + hb + ((c + pitch / 2 - c - hb) * j) / 2));
  }
  return pts;
}

// A rack along u, teeth pointing to -v (toward a pinion below), pitch line at v = vp.
// Returns the toothed edge from u0 to u1 on the root line, gaps centred at u = 0 + k·p.
export function rackEdge(u0, u1, vp, m) {
  const p = Math.PI * m;
  const tan = Math.tan(20 * rad);
  const ha = m;
  const hf = 1.25 * m;
  const tipHalf = p / 4 - ha * tan;
  const rootHalf = p / 4 + hf * tan;
  const out = [[u0, vp + hf]];
  for (let k = Math.floor(u0 / p) - 1; k <= Math.ceil(u1 / p) + 1; k++) {
    const c = p / 2 + k * p; // tooth centre
    if (c - rootHalf < u0 + 0.3 || c + rootHalf > u1 - 0.3) continue;
    out.push([c - rootHalf, vp + hf], [c - tipHalf, vp - ha], [c + tipHalf, vp - ha], [c + rootHalf, vp + hf]);
  }
  out.push([u1, vp + hf]);
  return out;
}

// An angular dimension: an arc of sheet radius R about world point c from world angle a0 to a1
// (degrees, counter-clockwise), arrows at both ends, text centred outside the arc. When the arc is
// too short the arrows go outside pointing in and the text sits beyond a1.
export function angleDim(V, c, R, a0, a1, text, { id = "" } = {}) {
  // text that does not fit goes beyond the a0 end
  const [cx, cy] = V.p(c);
  const pt = (a, r = R) => [K.r2(cx + r * Math.cos(-a * rad)), K.r2(cy + r * Math.sin(-a * rad))];
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  const span = ((hi - lo) * rad) * R;
  const tw = K.textWidth(text);
  const inside = span >= K.ARROW * 2 + 4;
  const textIn = span >= tw + K.ARROW * 2 + 10;
  const arcPts = (from, to) => {
    const n = Math.max(2, Math.ceil(Math.abs(to - from) / 3));
    let s = "";
    for (let i = 0; i <= n; i++) {
      const [x, y] = pt(from + ((to - from) * i) / n);
      s += `${i ? "L" : "M"}${x} ${y}`;
    }
    return s;
  };
  const ext = (K.ARROW + 6) / R / rad;
  const textGap = (tw / 2 + K.ARROW + 12) / R / rad;
  let path = inside ? arcPts(lo, hi) : arcPts(lo - ext, hi + ext);
  const head = (a, dir) => {
    // tangent direction on the sheet for increasing angle is (-sin, -cos) of the world angle
    const [x, y] = pt(a);
    const t = [-Math.sin(a * rad) * dir, -Math.cos(a * rad) * dir];
    const ux = t[0];
    const uy = t[1];
    const bx = x - ux * K.ARROW;
    const by = y - uy * K.ARROW;
    const h = K.ARROW * 0.25;
    return `M${x} ${y}L${K.r2(bx - uy * h)} ${K.r2(by + ux * h)}L${K.r2(bx + uy * h)} ${K.r2(by - ux * h)}Z`;
  };
  const heads = inside ? head(lo, -1) + head(hi, 1) : head(lo, 1) + head(hi, -1);
  let ta = (lo + hi) / 2;
  if (!textIn) {
    const sgn = a0 <= a1 ? -1 : 1;
    ta = a0 + sgn * textGap;
    path += arcPts(a0 + sgn * ext, ta + sgn * textGap * 0.6);
  }
  const [tx, ty] = pt(ta, R + 8);
  return (
    `<g data-role="dim"${id ? ` id="${id}"` : ""}><path class="thin" d="${path}"/><path class="head" d="${heads}"/>` +
    `<text class="t" x="${tx}" y="${K.r2(ty + 3.4)}" text-anchor="middle">${text}</text></g>`
  );
}

// A cutting-plane line across a view: thin chain, thick at the ends, arrows giving the direction
// of view, a letter at each end. a, b: world end points; dir: the sheet direction of the arrows.
export function cuttingPlane(V, a, b, [dx, dy], letter) {
  const [ax, ay] = V.p(a);
  const [bx, by] = V.p(b);
  const len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const thick = 12;
  const arrowLen = 16;
  let out = `<path class="ctr" d="M${ax} ${ay}L${bx} ${by}"/>`;
  out += `<path class="vis" d="M${ax} ${ay}L${K.r2(ax + ux * thick)} ${K.r2(ay + uy * thick)}M${bx} ${by}L${K.r2(bx - ux * thick)} ${K.r2(by - uy * thick)}"/>`;
  let heads = "";
  let letters = "";
  for (const [x, y, end] of [[ax + ux * 4, ay + uy * 4, -1], [bx - ux * 4, by - uy * 4, 1]]) {
    const tx = x + dx * arrowLen;
    const ty = y + dy * arrowLen;
    out += `<path class="thin" d="M${K.r2(x)} ${K.r2(y)}L${K.r2(tx - dx * K.ARROW)} ${K.r2(ty - dy * K.ARROW)}"/>`;
    const h = K.ARROW * 0.25;
    const bx2 = tx - dx * K.ARROW;
    const by2 = ty - dy * K.ARROW;
    heads += `M${K.r2(tx)} ${K.r2(ty)}L${K.r2(bx2 - dy * h)} ${K.r2(by2 + dx * h)}L${K.r2(bx2 + dy * h)} ${K.r2(by2 - dx * h)}Z`;
    // the letter sits beside the arrow, beyond the end of the line
    letters += `<text class="t t-lg" x="${K.r2(x + dx * arrowLen * 0.55 + ux * end * 9)}" y="${K.r2(y + dy * arrowLen * 0.55 + uy * end * 9 + 4.2)}" text-anchor="middle">${letter}</text>`;
  }
  return `<g data-role="label">${out}<path class="head" d="${heads}"/>${letters}</g>`;
}

// A bar of width w between two world points with round ends (an arm seen from above).
export function bar(a, b, w, steps = 8) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) / rad;
  return [...K.arc(b[0], b[1], w / 2, ang - 90, ang + 90, steps), ...K.arc(a[0], a[1], w / 2, ang + 90, ang + 270, steps)];
}

// Rotate world points about a centre (degrees, counter-clockwise).
export function rotate(pts, [cu, cv], deg) {
  const c = Math.cos(deg * rad);
  const s = Math.sin(deg * rad);
  return pts.map(([u, v]) => [cu + (u - cu) * c - (v - cv) * s, cv + (u - cu) * s + (v - cv) * c]);
}
