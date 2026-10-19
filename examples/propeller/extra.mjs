// Local drawing helpers the kit does not have (copied from the light-aircraft sheet and extended):
// cut faces with holes, a cut face broken off with a freehand line, a band of sheet metal along a
// path, a cutting-plane line, a freehand break line and a vector arrow. Pure, returns SVG strings.
import * as K from "../../kit/draft.mjs";

// A closed outline with holes, drawn as a cut face (hatch) or blacked in, using the even-odd rule.
export function cutHoles(V, outer, holes, { mat = "steel", angle = 45 } = {}) {
  const dd = [outer, ...holes].map((p) => K.d(V, p)).join("");
  if (mat === "solid") return `<path class="solid" fill-rule="evenodd" d="${dd}"/>`;
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path fill="url(#h-${mat}-${angle})" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
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

// A part that runs out of the view: a cut face (or a body) whose edge from pts[i] to pts[i + 1] is a
// freehand break, drawn thin; every other edge is a thick visible outline.
export function cutBroken(V, pts, i, { mat = "steel", angle = 45, body = false, amp = 1.2, seed = 3 } = {}) {
  const a = pts[i];
  const b = pts[(i + 1) % pts.length];
  const fh = freehandPts(a, b, amp, seed);
  const loop = [...pts.slice(0, i + 1), ...fh.slice(1, -1), ...pts.slice(i + 1)];
  const dd = K.d(V, loop);
  const open = [...pts.slice(i + 1), ...pts.slice(0, i + 1)];
  const fill = body ? `<path class="paper" d="${dd}"/>` : `<path class="paper" d="${dd}"/><path fill="url(#h-${mat}-${angle})" d="${dd}"/>`;
  return fill + `<path class="vis" d="${K.d(V, open, false)}"/><path class="thin" d="${K.d(V, fh, false)}"/>`;
}

// A band of thickness t to the right of a path (sheet metal along its face): a closed outline.
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
    // mitre at a corner so the thickness holds
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

// A cutting-plane line: thin chain, thick at the ends, arrows giving the direction of view, a letter
// beyond each end. a, b: world end points; [dx, dy]: the sheet direction of the arrows. ends: false
// draws only the thick ends (the chain already lies on a centre line).
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

// A freehand break line through world points (thin, irregular).
export function freehand(V, a, b, amp = 1.2, seed = 1) {
  return `<path class="thin" d="${K.d(V, freehandPts(a, b, amp, seed), false)}"/>`;
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
