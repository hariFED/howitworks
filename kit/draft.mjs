// Blueprint drafting kit: orthographic views, sections, hatching, dimensions and sheet furniture.
// Every function here is pure and returns SVG markup strings, so the same code runs in the build
// and, inlined, in the page (live dimensions, moving springs, needles).
//
// Units. World geometry is in millimetres of the real object: u to the right, v up (a front view),
// or u right, v away from the viewer (a plan view). The sheet is an A2 drawing, 594 mm wide, drawn
// 1200 units wide; a view maps world mm to sheet units through its drawing scale.

export const SHEET = { w: 1200, h: 848 };
export const PX_PER_MM = SHEET.w / 594;

// ISO 128 line widths and ISO 3098 lettering, in sheet units (A2: 0.5 / 0.25 mm lines, 3.5 mm text).
export const THICK = 1.15;
export const THIN = 0.55;
export const TEXT = 9.5;
export const ARROW = 7;
export const GAP = 2.2; // extension lines start this far from the object
export const OVER = 3.5; // and run this far past the dimension line

export const r2 = (n) => Math.round(n * 100) / 100;

export function fmt(n, digits = 1) {
  const near = Math.round(n);
  if (Math.abs(n - near) < 0.05) return String(near);
  return n.toFixed(digits);
}

// ---------------------------------------------------------------- views

// A view is a window from world mm onto the sheet. scale is the drawing scale (1/2.5 for "1:2.5").
export function view({ x, y, scale, name = "" }) {
  const k = scale * PX_PER_MM;
  return { x, y, scale, k, name, p: ([u, v]) => [r2(x + u * k), r2(y - v * k)] };
}

export const scaleLabel = (scale) => (scale >= 1 ? `${fmt(scale)}:1` : `1:${fmt(1 / scale)}`);

export function d(V, pts, closed = true) {
  let out = "";
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = V.p(pts[i]);
    out += `${i ? "L" : "M"}${x} ${y}`;
  }
  return closed ? out + "Z" : out;
}

// ---------------------------------------------------------------- world geometry (point lists)

export const rect = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

export function arc(cu, cv, r, a0, a1, steps) {
  const n = steps ?? Math.max(3, Math.ceil(Math.abs(a1 - a0) / 7.5));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    out.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]);
  }
  return out;
}

export const circle = (cu, cv, r, steps = 48) => arc(cu, cv, r, 0, 360 - 360 / steps, steps - 1);

// A rectangle with filleted corners.
export function rrect(u0, v0, u1, v1, r, steps = 4) {
  const q = Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2);
  return [
    ...arc(u1 - q, v0 + q, q, -90, 0, steps),
    ...arc(u1 - q, v1 - q, q, 0, 90, steps),
    ...arc(u0 + q, v1 - q, q, 90, 180, steps),
    ...arc(u0 + q, v0 + q, q, 180, 270, steps),
  ];
}

export const move = (pts, du, dv) => pts.map(([u, v]) => [u + du, v + dv]);
export const flipU = (pts, about = 0) => pts.map(([u, v]) => [2 * about - u, v]).reverse();
export const flipV = (pts, about = 0) => pts.map(([u, v]) => [u, 2 * about - v]).reverse();

export function inside([u, v], poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, vi] = poly[i];
    const [uj, vj] = poly[j];
    if (vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) hit = !hit;
  }
  return hit;
}

// A body of revolution cut through its axis.
// loop is the half-profile as [r, s] pairs: r >= 0 measured from the axis, s along the axis.
// axis "v" is a vertical axis at u = at; axis "u" a horizontal axis at v = at.
// Returns the cut faces (hatched) and the edges seen through the bore behind the cutting plane:
// every circle on an inner surface shows edge-on as a straight line across the bore.
export function revolve(loop, { axis = "v", at = 0 } = {}) {
  const place = axis === "v" ? (r, s) => [at + r, s] : (r, s) => [s, at + r];
  const n = loop.length;
  const onAxis = loop.findIndex(([r], i) => r === 0 && loop[(i + 1) % n][0] === 0);
  let cuts;
  if (onAxis >= 0) {
    const chain = Array.from({ length: n }, (_, j) => loop[(onAxis + 1 + j) % n]);
    const right = chain.map(([r, s]) => place(r, s));
    const left = chain.slice(1, -1).reverse().map(([r, s]) => place(-r, s));
    cuts = [[...right, ...left]];
  } else {
    cuts = [loop.map(([r, s]) => place(r, s)), loop.map(([r, s]) => place(-r, s)).reverse()];
  }
  const eps = 1e-3;
  const across = new Map();
  const clear = (r, s) => [0.02, 0.25, 0.5, 0.75, 0.98].every((t) => !inside([t * r, s], loop));
  for (const [r, s] of loop) {
    if (r <= 0) continue;
    if (clear(r, s + eps) && clear(r, s - eps)) across.set(s, Math.max(across.get(s) ?? 0, r));
  }
  const edges = [...across].map(([s, r]) => [place(-r, s), place(r, s)]);
  return { cuts, edges };
}

// ---------------------------------------------------------------- hatching

// ANSI/ISO-style material hatches. Spacing is in sheet units and never scales with the view,
// so a detail at 2:1 shows the same density as the main view, as on a real drawing.
export const MATERIALS = {
  steel: { kind: "lines", gap: 3.4 },
  iron: { kind: "lines", gap: 5.6 },
  alu: { kind: "pairs", gap: 5.2, pair: 1.5 },
  brass: { kind: "dashed", gap: 4.6 },
  bronze: { kind: "dashed", gap: 3.6 },
  rubber: { kind: "cross", gap: 3.2 },
  plastic: { kind: "lines", gap: 2.3 },
  foam: { kind: "dots", gap: 2.6 },
  wood: { kind: "grain", gap: 4 },
};
export const ANGLES = [45, 135, 30, 60];

export function hatchDefs() {
  let out = "";
  for (const [name, m] of Object.entries(MATERIALS)) {
    for (const angle of ANGLES) {
      const g = m.gap;
      let body = "";
      if (m.kind === "lines") body = `<path class="hl" d="M0 -1V${g + 1}"/>`;
      if (m.kind === "pairs") body = `<path class="hl" d="M0 -1V${g + 1}M${m.pair} -1V${g + 1}"/>`;
      if (m.kind === "dashed") body = `<path class="hl" d="M0 -1V${g + 1}"/><path class="hl hl-dash" d="M${g / 2} -1V${g + 1}"/>`;
      if (m.kind === "cross") body = `<path class="hl" d="M0 -1V${g + 1}M-1 0H${g + 1}"/>`;
      if (m.kind === "dots") body = `<circle class="hd" cx="${g / 2}" cy="${g / 2}" r="0.42"/>`;
      if (m.kind === "grain") body = `<path class="hl" d="M0 -1V${g + 1}"/><path class="hl" d="M${g * 0.55} -1C${g * 0.75} ${g * 0.3} ${g * 0.35} ${g * 0.7} ${g * 0.55} ${g + 1}"/>`;
      out += `<pattern id="h-${name}-${angle}" patternUnits="userSpaceOnUse" width="${g}" height="${g}" patternTransform="rotate(${angle})">${body}</pattern>`;
    }
  }
  return out;
}

// ---------------------------------------------------------------- drawing parts

// A cut face: paper underneath (it hides what is behind), the material hatch, a thick outline.
// mat "solid" blacks the section in, the ISO convention for sections too thin to hatch.
export function cut(V, pts, { mat = "steel", angle = 45 } = {}) {
  const dd = d(V, pts);
  if (mat === "solid") return `<path class="solid" d="${dd}"/>`;
  return `<path class="paper" d="${dd}"/><path fill="url(#h-${mat}-${angle})" d="${dd}"/><path class="vis" d="${dd}"/>`;
}

// A body of revolution in section, with the edges behind the cut.
export function section(V, rev, opts) {
  return rev.cuts.map((c) => cut(V, c, opts)).join("") + rev.edges.map((e) => line(V, e)).join("");
}

// An unsectioned solid (shafts, rods, pins, balls, nuts and ribs are never hatched in a section).
export function body(V, pts) {
  const dd = d(V, pts);
  return `<path class="paper" d="${dd}"/><path class="vis" d="${dd}"/>`;
}

export const line = (V, pts, cls = "vis", closed = false) => `<path class="${cls}" d="${d(V, pts, closed)}"/>`;
export const lines = (V, list, cls = "vis") => `<path class="${cls}" d="${list.map((pts) => d(V, pts, false)).join("")}"/>`;

// A centre line, run a little past the outline at both ends.
export function centerline(V, a, b, over = 6) {
  const [ax, ay] = V.p(a);
  const [bx, by] = V.p(b);
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  return `<path class="ctr" d="M${r2(ax - ux * over)} ${r2(ay - uy * over)}L${r2(bx + ux * over)} ${r2(by + uy * over)}"/>`;
}

// Centre mark for a circle in a view: two crossed centre lines.
export function centerMark(V, [cu, cv], r, over = 5) {
  return centerline(V, [cu - r, cv], [cu + r, cv], over) + centerline(V, [cu, cv - r], [cu, cv + r], over);
}

// A compression spring cut along its axis: wire sections (blacked in) on both sides, half a pitch
// apart, joined by the back half of each turn. from/to are positions along the axis.
export function springSection(V, { from, to, radius, wire, turns, axis = "u", at = 0 }) {
  const place = axis === "u" ? (s, r) => [s, at + r] : (s, r) => [at + r, s];
  const pitch = (to - from - wire) / turns;
  const start = from + wire / 2;
  const back = [];
  let sections = "";
  for (let i = 0; i <= turns; i++) {
    const sTop = start + i * pitch;
    sections += cut(V, circle(...place(sTop, radius), wire / 2, 12), { mat: "solid" });
    if (i < turns) {
      const sBot = sTop + pitch / 2;
      sections += cut(V, circle(...place(sBot, -radius), wire / 2, 12), { mat: "solid" });
      back.push([place(sTop, radius), place(sBot, -radius)]);
    }
  }
  return lines(V, back, "vis spring") + sections;
}

// ---------------------------------------------------------------- annotation

function arrowHead([x, y], [dx, dy]) {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const bx = x - ux * ARROW;
  const by = y - uy * ARROW;
  const half = ARROW * 0.25;
  return `M${r2(x)} ${r2(y)}L${r2(bx - uy * half)} ${r2(by + ux * half)}L${r2(bx + uy * half)} ${r2(by - ux * half)}Z`;
}

export const textWidth = (s, size = TEXT) => String(s).length * size * 0.6;

// A linear dimension between two world points, measured along dir ("h" or "v").
// off is the sheet distance from point a to the dimension line (negative: up or left).
// The value is measured from the geometry unless text is given, so a dimension cannot lie.
export function dim(V, a, b, { dir = "h", off = 18, text, prefix = "", suffix = "", id = "", cls = "" } = {}) {
  const A = V.p(a);
  const B = V.p(b);
  const value = text ?? prefix + fmt(Math.abs(dir === "h" ? b[0] - a[0] : b[1] - a[1])) + suffix;
  const h = dir === "h";
  const main = h ? 0 : 1; // the axis the dimension measures along
  const side = 1 - main;
  const at = A[side] + off; // where the dimension line sits
  const pt = (m, s) => (h ? [m, s] : [s, m]);
  let ext = "";
  for (const P of [A, B]) {
    const gapTo = at - P[side];
    if (Math.abs(gapTo) <= GAP) continue;
    const sgn = Math.sign(gapTo);
    const [x1, y1] = pt(P[main], P[side] + sgn * GAP);
    const [x2, y2] = pt(P[main], at + sgn * OVER);
    ext += `M${r2(x1)} ${r2(y1)}L${r2(x2)} ${r2(y2)}`;
  }
  const lo = Math.min(A[main], B[main]);
  const hi = Math.max(A[main], B[main]);
  const span = hi - lo;
  const tw = textWidth(value);
  const arrowsIn = span >= ARROW * 2 + 3;
  const textIn = span >= tw + ARROW * 2 + 6;
  let lineD;
  let heads;
  let tm; // text position along the measured axis
  let anchor = "middle";
  if (arrowsIn) {
    const [x1, y1] = pt(lo, at);
    const [x2, y2] = pt(hi, at);
    lineD = `M${r2(x1)} ${r2(y1)}L${r2(x2)} ${r2(y2)}`;
    heads = arrowHead(pt(lo, at), pt(-1, 0)) + arrowHead(pt(hi, at), pt(1, 0));
  } else {
    const [x1, y1] = pt(lo - ARROW - 7, at);
    const [x2, y2] = pt(hi + ARROW + 7, at);
    lineD = `M${r2(x1)} ${r2(y1)}L${r2(x2)} ${r2(y2)}`;
    heads = arrowHead(pt(lo, at), pt(1, 0)) + arrowHead(pt(hi, at), pt(-1, 0));
  }
  if (textIn) tm = (lo + hi) / 2;
  else {
    tm = hi + ARROW + 10 + tw / 2;
    const [x2, y2] = pt(tm + tw / 2, at);
    lineD += `L${r2(x2)} ${r2(y2)}`;
  }
  // ISO: text sits just above a horizontal line and reads from the right on a vertical one.
  const [tx, ty] = pt(tm, at - 3);
  const textEl = h
    ? `<text class="t" x="${r2(tx)}" y="${r2(ty)}" text-anchor="${anchor}">${value}</text>`
    : `<text class="t" x="${r2(tx)}" y="${r2(ty)}" text-anchor="${anchor}" transform="rotate(-90 ${r2(tx)} ${r2(ty)})">${value}</text>`;
  return `<g data-role="dim"${id ? ` id="${id}"` : ""}${cls ? ` class="${cls}"` : ""}><path class="thin" d="${ext}${lineD}"/><path class="head" d="${heads}"/>${textEl}</g>`;
}

// A part balloon: a dot on the part, a thin leader, a circled item number.
export function balloon(V, at, [bx, by], n, { target = "", r = 8.5 } = {}) {
  const [ax, ay] = V.p(at);
  const a = Math.atan2(ay - by, ax - bx);
  const ex = r2(bx + r * Math.cos(a));
  const ey = r2(by + r * Math.sin(a));
  return (
    `<g data-role="balloon" data-target="${target}" data-at="${ax} ${ay}">` +
    `<path class="thin" d="M${ex} ${ey}L${ax} ${ay}"/><circle class="dot" cx="${ax}" cy="${ay}" r="1.5"/>` +
    `<circle class="balloon" cx="${bx}" cy="${by}" r="${r}"/>` +
    `<text class="t" x="${bx}" y="${r2(by + 3.3)}" text-anchor="middle">${n}</text></g>`
  );
}

// A view title: SECTION A-A over its scale, centred under the view.
export function viewLabel(x, y, title, sub = "") {
  return (
    `<g data-role="label"><text class="t t-lg" x="${x}" y="${y}" text-anchor="middle">${title}</text>` +
    (sub ? `<text class="t t-sm" x="${x}" y="${y + 12}" text-anchor="middle">${sub}</text>` : "") +
    `</g>`
  );
}

// The circle that marks a detail in its parent view, with its letter.
export function detailMark(V, [cu, cv], r, letter, angle = 45) {
  const [x, y] = V.p([cu, cv]);
  const R = r * V.k;
  const a = (-angle * Math.PI) / 180;
  const lx = r2(x + (R + 9) * Math.cos(a));
  const ly = r2(y + (R + 9) * Math.sin(a) + 4);
  return `<g data-role="label"><circle class="thin mark" cx="${x}" cy="${y}" r="${r2(R)}"/><text class="t t-lg" x="${lx}" y="${ly}" text-anchor="middle">${letter}</text></g>`;
}

// A viewing-direction arrow (VIEW C): a thick-tipped arrow pointing at the surface, with its letter.
export function viewArrow(V, at, [dx, dy], letter, len = 26) {
  const [x, y] = V.p(at);
  const n = Math.hypot(dx, dy) || 1;
  const ux = dx / n;
  const uy = dy / n;
  const sx = r2(x - ux * len);
  const sy = r2(y - uy * len);
  return (
    `<g data-role="label"><path class="vis" d="M${sx} ${sy}L${r2(x - ux * ARROW)} ${r2(y - uy * ARROW)}"/>` +
    `<path class="head" d="${arrowHead([x, y], [ux, uy])}"/>` +
    `<text class="t t-lg" x="${r2(sx - uy * 10)}" y="${r2(sy + ux * 10 + 4)}" text-anchor="middle">${letter}</text></g>`
  );
}

// A long-break line across a part (thin, with one zigzag), for parts that run out of the view.
export function breakLine(V, a, b) {
  const [ax, ay] = V.p(a);
  const [bx, by] = V.p(b);
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const z = 3.5;
  const p = (t, s) => `${r2(mx + ux * t - uy * s)} ${r2(my + uy * t + ux * s)}`;
  return `<path class="thin" d="M${r2(ax - ux * 4)} ${r2(ay - uy * 4)}L${p(-z, 0)}L${p(-z / 2, z * 1.6)}L${p(z / 2, -z * 1.6)}L${p(z, 0)}L${r2(bx + ux * 4)} ${r2(by + uy * 4)}"/>`;
}

// ---------------------------------------------------------------- sheet furniture

// The drawing frame: trimmed edge, a thick border, zone references and centring marks.
export function frame({ w = SHEET.w, h = SHEET.h, trim = 8, m = 24, cols = 8, rows = 6 } = {}) {
  let out = `<g data-role="frame"><rect class="thin" x="${trim}" y="${trim}" width="${w - trim * 2}" height="${h - trim * 2}"/>`;
  out += `<rect class="vis" x="${m}" y="${m}" width="${w - m * 2}" height="${h - m * 2}"/>`;
  const cw = (w - m * 2) / cols;
  const rh = (h - m * 2) / rows;
  let ticks = "";
  let labels = "";
  for (let i = 0; i <= cols; i++) {
    const x = r2(m + i * cw);
    if (i > 0 && i < cols) ticks += `M${x} ${trim}V${m}M${x} ${h - m}V${h - trim}`;
    if (i < cols) {
      const cx = r2(m + (i + 0.5) * cw);
      labels += `<text class="t t-sm" x="${cx}" y="${r2((trim + m) / 2 + 3)}" text-anchor="middle">${i + 1}</text>`;
      labels += `<text class="t t-sm" x="${cx}" y="${r2(h - (trim + m) / 2 + 3)}" text-anchor="middle">${i + 1}</text>`;
    }
  }
  for (let j = 0; j <= rows; j++) {
    const y = r2(m + j * rh);
    if (j > 0 && j < rows) ticks += `M${trim} ${y}H${m}M${w - m} ${y}H${w - trim}`;
    if (j < rows) {
      const cy = r2(m + (j + 0.5) * rh + 3);
      const letter = String.fromCharCode(65 + j);
      labels += `<text class="t t-sm" x="${r2((trim + m) / 2)}" y="${cy}" text-anchor="middle">${letter}</text>`;
      labels += `<text class="t t-sm" x="${r2(w - (trim + m) / 2)}" y="${cy}" text-anchor="middle">${letter}</text>`;
    }
  }
  const cm = `M${w / 2} ${trim}V${m + 10}M${w / 2} ${h - trim}V${h - m - 10}M${trim} ${h / 2}H${m + 10}M${w - trim} ${h / 2}H${w - m - 10}`;
  out += `<path class="thin" d="${ticks}"/><path class="vis" d="${cm}"/>${labels}</g>`;
  return out;
}

// A ruled table (parts list). cols: [{ w, align, title }]. rows: arrays of cell strings.
// Item numbers count up from the bottom, as a parts list sits on top of the title block.
export function table(x, y, cols, rows, { rowH = 16, role = "bom", headH = 18 } = {}) {
  const w = cols.reduce((s, c) => s + c.w, 0);
  const h = headH + rows.length * rowH;
  let rules = "";
  let text = "";
  let cx = x;
  for (const [i, c] of cols.entries()) {
    if (i > 0) rules += `M${r2(cx)} ${y}V${y + h}`;
    const tx = c.align === "center" ? cx + c.w / 2 : c.align === "right" ? cx + c.w - 4 : cx + 4;
    const anchor = c.align === "center" ? "middle" : c.align === "right" ? "end" : "start";
    text += `<text class="t t-sm t-head" x="${r2(tx)}" y="${y + h - 5.5}" text-anchor="${anchor}">${c.title}</text>`;
    rows.forEach((row, j) => {
      text += `<text class="t t-sm" x="${r2(tx)}" y="${r2(y + (rows.length - 1 - j) * rowH + rowH - 4.8)}" text-anchor="${anchor}">${row[i]}</text>`;
    });
    cx += c.w;
  }
  for (let j = 1; j <= rows.length; j++) rules += `M${x} ${r2(y + j * rowH)}H${x + w}`;
  return `<g data-role="${role}"><rect class="paper" x="${x}" y="${y}" width="${w}" height="${h}"/><path class="thin" d="${rules}"/><rect class="vis" x="${x}" y="${y}" width="${w}" height="${h}"/>${text}</g>`;
}

// A title-block cell: a small caption over a value. size: "sm" | "md" | "lg".
export function cell({ x, y, w, h, label, value = "", size = "md", id = "" }) {
  const cls = size === "lg" ? "t t-xl" : size === "sm" ? "t t-sm" : "t";
  const vy = size === "lg" ? y + h - 7 : y + h - 5;
  return (
    `<rect class="thin" x="${x}" y="${y}" width="${w}" height="${h}"/>` +
    `<text class="t t-cap" x="${x + 4}" y="${y + 9}">${label}</text>` +
    `<text class="${cls}" x="${x + 4}" y="${vy}"${id ? ` id="${id}"` : ""}>${value}</text>`
  );
}

export function titleBlock(x, y, w, h, cells) {
  return `<g data-role="title"><rect class="paper" x="${x}" y="${y}" width="${w}" height="${h}"/>${cells.map((c) => cell({ ...c, x: x + c.x, y: y + c.y })).join("")}<rect class="vis" x="${x}" y="${y}" width="${w}" height="${h}"/></g>`;
}

// A notes block: a heading and numbered lines.
export function notes(x, y, heading, items, lead = 13) {
  let out = `<g data-role="notes"><text class="t t-head" x="${x}" y="${y}">${heading}</text>`;
  items.forEach((s, i) => {
    out += `<text class="t t-sm" x="${x}" y="${r2(y + lead * (i + 1) + 2)}">${i + 1}. ${s}</text>`;
  });
  return out + `</g>`;
}
