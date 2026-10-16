// Annotation helpers this sheet needs and the kit lacks: a radius dimension, an angular
// dimension (the fork's live angle), and the cutting-plane marks for SECTION A-A.
// Pure, like the kit: they run in the build and, inlined, in the page.

import * as K from "../../kit/draft.mjs";

const RAD = Math.PI / 180;

function head([x, y], [dx, dy]) {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const bx = x - ux * K.ARROW;
  const by = y - uy * K.ARROW;
  const h = K.ARROW * 0.25;
  return `M${K.r2(x)} ${K.r2(y)}L${K.r2(bx - uy * h)} ${K.r2(by + ux * h)}L${K.r2(bx + uy * h)} ${K.r2(by - ux * h)}Z`;
}

// A radius: a leader from the centre through the circle at angle a (degrees), arrow on the circle,
// a short shoulder and the value beyond it.
export function radius(V, c, r, a, text) {
  const [cx, cy] = V.p(c);
  const [x, y] = V.p([c[0] + r * Math.cos(a * RAD), c[1] + r * Math.sin(a * RAD)]);
  const ux = (x - cx) / Math.hypot(x - cx, y - cy);
  const uy = (y - cy) / Math.hypot(x - cx, y - cy);
  const ex = x + ux * 16;
  const ey = y + uy * 16;
  const left = ux < 0;
  const sx = ex + (left ? -10 : 10);
  const tw = K.textWidth(text);
  const tx = left ? sx - 3 - tw / 2 : sx + 3 + tw / 2;
  return (
    `<g data-role="dim"><path class="thin" d="M${K.r2(x - ux * 0.5)} ${K.r2(y - uy * 0.5)}L${K.r2(ex)} ${K.r2(ey)}H${K.r2(sx)}"/>` +
    `<path class="head" d="${head([x, y], [-ux, -uy])}"/>` +
    `<text class="t" x="${K.r2(tx)}" y="${K.r2(ey + 3.3)}" text-anchor="middle">${text}</text></g>`
  );
}

// The fork's angle φ, measured at the pallet arbor between the fixed vertical through it and the
// pallet's own centre line (perpendicular to the fork), which turns with the pallet.
export const PHI_R = [1.95, 3.05]; // the witness lines run between these radii, mm
export const PHI_ARC = 2.8;
export function forkAngle(V, phi) {
  const [px, py] = V.p([0, 0]);
  const k = V.k;
  const pt = (r, a) => [px + r * k * Math.cos(a * RAD), py - r * k * Math.sin(a * RAD)];
  const a0 = 90;
  const a1 = 90 + phi;
  const fixed = [pt(PHI_R[0], a0), pt(PHI_R[1], a0)];
  const turned = [pt(PHI_R[0] + 0.2, a1), pt(PHI_R[1], a1)];
  const R = PHI_ARC * k;
  const span = Math.abs(phi) * RAD * R;
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  const ext = (11 / R) / RAD; // the arc runs on past both lines when the arrows sit outside
  const inside = span >= K.ARROW * 2 + 3;
  const from = inside ? lo : lo - ext;
  const to = inside ? hi : hi + ext;
  let arc = "";
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const [x, y] = pt(PHI_ARC, from + ((to - from) * i) / n);
    arc += `${i ? "L" : "M"}${K.r2(x)} ${K.r2(y)}`;
  }
  // tangent directions at the two ends of the measured span (sheet y down)
  const tan = (a, s) => [-Math.sin(a * RAD) * s, -Math.cos(a * RAD) * s];
  let heads = "";
  if (span > 0.6) {
    const pLo = pt(PHI_ARC, lo);
    const pHi = pt(PHI_ARC, hi);
    heads = inside
      ? head(pLo, tan(lo, -1)) + head(pHi, tan(hi, 1))
      : head(pLo, tan(lo, 1)) + head(pHi, tan(hi, -1));
  }
  const ext1 = `M${K.r2(fixed[0][0])} ${K.r2(fixed[0][1])}L${K.r2(fixed[1][0])} ${K.r2(fixed[1][1])}`;
  const ext2 = `M${K.r2(turned[0][0])} ${K.r2(turned[0][1])}L${K.r2(turned[1][0])} ${K.r2(turned[1][1])}`;
  const [lx, ly] = pt(PHI_ARC, 90);
  const sign = phi > 0.05 ? "+" : phi < -0.05 ? "−" : "";
  const text = `φ ${sign}${Math.abs(phi).toFixed(1)}°`;
  return (
    `<g data-role="dim" id="dim-phi"><path class="ctr" d="${ext1}"/><path class="thin" d="${ext2}${arc}"/>` +
    (heads ? `<path class="head" d="${heads}"/>` : "") +
    `<text class="t" x="${K.r2(lx - 22)}" y="${K.r2(ly + 3.3)}" text-anchor="end">${text}</text></g>`
  );
}

// Cutting plane marks: thick ends on the plane's line, arrows for the viewing direction (sheet up),
// and the letter at each arrow.
export function cutPlane(V, a, b, letter) {
  const [ax, ay] = V.p(a);
  const [bx, by] = V.p(b);
  const L = 14;
  const arrow = (x, y) => `M${x} ${y}V${K.r2(y - 22 + K.ARROW)}`;
  return (
    `<g data-role="label"><path class="vis" d="M${ax} ${ay}H${ax + L}M${bx - L} ${by}H${bx}${arrow(ax + 2, ay)}${arrow(bx - 2, by)}"/>` +
    `<path class="head" d="${head([ax + 2, ay - 22], [0, -1])}${head([bx - 2, by - 22], [0, -1])}"/>` +
    `<text class="t t-lg" x="${ax + 2}" y="${ay - 27}" text-anchor="middle">${letter}</text>` +
    `<text class="t t-lg" x="${bx - 2}" y="${by - 27}" text-anchor="middle">${letter}</text></g>`
  );
}

// A point on a stone's centre line, a fraction f of the way from its tip to its back end.
export function mid(stone, f) {
  const [L, X, Xb, Lb] = stone;
  const tip = [(L[0] + X[0]) / 2, (L[1] + X[1]) / 2];
  const back = [(Lb[0] + Xb[0]) / 2, (Lb[1] + Xb[1]) / 2];
  return [tip[0] + (back[0] - tip[0]) * f, tip[1] + (back[1] - tip[1]) * f];
}
