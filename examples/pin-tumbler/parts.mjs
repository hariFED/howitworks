// The pin tumbler cylinder's parts, in world mm.
// Longitudinal views: u along the axis from the front face, z up (fin up).
// End views (VIEW B, SECTION C-C, both looking towards the back): s across (sheet right), z up.
// Each function draws one part into a view and returns SVG, so the main view and the enlarged
// section draw the same geometry at their own scale. Parts that turn with the plug are drawn at
// phi = 0 in the end views and turned by the page with a transform; in the longitudinal section a
// turned plug is a different cut, so it is re-drawn as the plane's true intersection.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;

const R = M.PLUG_R;
const PR = M.PIN_R;
const rad = (deg) => (deg * Math.PI) / 180;

// ---------------------------------------------------------------- the cutting plane through a turned plug
// A feature of the plug that is a prism along the axis (or a radial pin) has, in the plug's own
// frame, a half-width hw across and a radial range [a, b]. With the plug turned by phi, the plane
// of the longitudinal section meets it where |z·sin phi| <= hw and a <= z·cos phi <= b.
export function interval(a, b, hw, phi) {
  const s = Math.abs(Math.sin(rad(phi)));
  const c = Math.cos(rad(phi));
  let lo = s > 1e-9 ? -hw / s : -Infinity;
  let hi = s > 1e-9 ? hw / s : Infinity;
  if (c > 1e-9) {
    lo = Math.max(lo, a / c);
    hi = Math.min(hi, b / c);
  } else if (!(a <= 0 && 0 <= b)) return null;
  return lo < hi ? [lo, hi] : null;
}

// Runs of non-empty intervals along u, as polygons (top chain forward, bottom chain back).
function runs(samples) {
  const out = [];
  let cur = null;
  samples.forEach(([u, iv], idx) => {
    if (!iv) {
      cur = null;
      return;
    }
    if (!cur) out.push((cur = { start: idx, top: [], bot: [] }));
    cur.top.push([u, iv[1]]);
    cur.bot.push([u, iv[0]]);
  });
  return out.map((r) => ({ start: r.start, pts: [...r.top, ...r.bot.reverse()] }));
}

// ---------------------------------------------------------------- body (static)
const W = [0, 1, 2, 3].map((i) => [M.pinU(i) + PR, M.pinU(i + 1) - PR]);
const lastHole = M.pinU(4) + PR;

export function body(V) {
  const A = [[0, 7.5], [1.2, 7.5], [1.2, R], [M.pinU(0) - PR, R], [M.pinU(0) - PR, M.FIN_TOP], [0.5, M.FIN_TOP], [0, M.FIN_TOP - 0.5], [0, 11.5], [2.5, 11.5], [2.5, 8.5], [0, 8.5]];
  const webs = W.map(([u0, u1]) => K.rect(u0, R, u1, M.FIN_TOP));
  const B = [
    [lastHole, R], [M.SLOT[0], R], [M.SLOT[0], M.BRIDGE], [M.SLOT[1], M.BRIDGE], [M.SLOT[1], M.REAR_BORE_R], [M.REAR_CB, M.REAR_BORE_R],
    [M.REAR_CB, M.REAR_CB_R], [M.BODY_L, M.REAR_CB_R], [M.BODY_L, M.FIN_TOP - 0.5], [M.BODY_L - 0.5, M.FIN_TOP], [lastHole, M.FIN_TOP],
  ];
  const C = [[0, -7.5], [1.2, -7.5], [1.2, -R], [M.SLOT[0], -R], [M.SLOT[0], -M.BODY_R], [0.5, -M.BODY_R], [0, -M.BODY_R + 0.5]];
  const D = [[M.SLOT[1], -M.BODY_R], [M.BODY_L - 0.5, -M.BODY_R], [M.BODY_L, -M.BODY_R + 0.5], [M.BODY_L, -M.REAR_CB_R], [M.REAR_CB, -M.REAR_CB_R], [M.REAR_CB, -M.REAR_BORE_R], [M.SLOT[1], -M.REAR_BORE_R]];
  return part(1, [A, ...webs, B, C, D].map((p) => K.cut(V, p, { mat: "brass", angle: 45 })).join(""));
}

export function caps(V) {
  let out = "";
  for (let i = 0; i < M.PINS; i++) {
    const u = M.pinU(i);
    out += K.body(V, [[u - PR + 0.2, M.CAP_BOT], [u + PR - 0.2, M.CAP_BOT], [u + PR, M.CAP_BOT + 0.2], [u + PR, M.FIN_TOP], [u - PR, M.FIN_TOP], [u - PR, M.CAP_BOT + 0.2]]);
  }
  return part(10, out);
}

export function antiDrill(V) {
  return part(13, K.body(V, [[0.3, 8.5], [2.5, 8.5], [2.5, 11.5], [0.3, 11.5], [0.05, 11.25], [0.05, 8.75]]));
}

export function screw(V) {
  const { u, z, d, minor } = M.SCREW;
  return part(
    14,
    K.cut(V, K.circle(u, z, d / 2, 40), { mat: "steel", angle: 135 }) +
      K.line(V, K.arc(u, z, minor / 2, 100, 370, 30), "thin")
  );
}

export function washer(V) {
  const top = K.rect(M.REAR_CB, 4.2, M.GROOVE[0], 6.0);
  return part(16, K.cut(V, top, { mat: "solid" }) + K.cut(V, K.flipV(top), { mat: "solid" }));
}

export function clip(V) {
  const top = K.rect(M.GROOVE[0], 3.0, M.GROOVE[1], 6.15);
  return part(12, K.cut(V, top, { mat: "steel", angle: 60 }) + K.cut(V, K.flipV(top), { mat: "steel", angle: 60 }));
}

// ---------------------------------------------------------------- stacks (move up and down)
export function drivers(V, st) {
  let out = "";
  st.forEach((s, i) => {
    const u = M.pinU(i);
    const b = s.top;
    const t = s.dTop;
    out += K.body(V, [[u - PR + 0.2, b], [u + PR - 0.2, b], [u + PR, b + 0.2], [u + PR, t - 0.2], [u + PR - 0.2, t], [u - PR + 0.2, t], [u - PR, t - 0.2], [u - PR, b + 0.2]]);
  });
  return part(8, out);
}

export const SPR = { radius: (M.SPRING.mean / 2), wire: M.SPRING.wire, turns: M.SPRING.turns };
export function springs(V, st) {
  let out = "";
  st.forEach((s, i) => {
    out += K.springSection(V, { from: s.dTop, to: M.CAP_BOT, radius: SPR.radius, wire: SPR.wire, turns: SPR.turns, axis: "v", at: M.pinU(i) });
  });
  return part(9, out);
}
// The centre of the lowest wire section on the right of stack i: a point always on the spring.
export const springDot = (s, i) => [M.pinU(i) + SPR.radius, s.dTop + SPR.wire / 2];

// Key pins, at phi = 0 their true shape, turned their cut through the plane (they stay in the plug).
export function keyPin(V, s, i, phi) {
  const u = M.pinU(i);
  if (phi < 0.05) {
    const n = s.nose;
    const f = M.NOSE_FLAT / 2;
    return K.body(V, [[u - f, n], [u + f, n], [u + PR, n + PR - f], [u + PR, s.top], [u - PR, s.top], [u - PR, n + PR - f]]);
  }
  const samples = [];
  for (let k = 0; k <= 40; k++) {
    const du = -PR + (2 * PR * k) / 40;
    const iv = interval(s.nose, Infinity, Math.sqrt(Math.max(0, PR * PR - du * du)), phi);
    samples.push([u + du, iv && [iv[0], Math.min(R, iv[1])]]);
  }
  return runs(samples).map((r) => K.body(V, r.pts)).join("");
}

// item numbers: pins 1..5 are items 3, 4, 5, 6, 7
export const PIN_ITEM = [3, 4, 5, 6, 7];
export const keyPins = (V, st, phi) => st.map((s, i) => part(PIN_ITEM[i], keyPin(V, s, i, phi))).join("");

// A point on key pin i in the plane, or null when the turned plug has carried it out of the plane.
export function keyPinDot(s, i, phi) {
  if (phi < 0.05) return [M.pinU(i), (s.nose + PR + s.top) / 2];
  const iv = interval(s.nose, Infinity, PR, phi);
  if (!iv) return null;
  const lo = iv[0];
  const hi = Math.min(R, iv[1]);
  return hi - lo > 0.5 ? [M.pinU(i), (lo + hi) / 2] : null;
}

// ---------------------------------------------------------------- the plug, cut by the plane
const PLUG_TOP = [[0, 7.2], [0.3, 7.5], [1.2, 7.5], [1.2, R], [M.PLUG_END, R], [M.PLUG_END, M.SPIGOT_R], [M.GROOVE[0], M.SPIGOT_R], [M.GROOVE[0], 3], [M.GROOVE[1], 3], [M.GROOVE[1], M.SPIGOT_R], [M.SPIGOT_END - 0.3, M.SPIGOT_R], [M.SPIGOT_END, M.SPIGOT_R - 0.3]];
const PLUG_OUTLINE = [...PLUG_TOP, ...PLUG_TOP.map(([u, z]) => [u, -z]).reverse()];

export function keywayBand(phi) {
  const iv = interval(M.KEYWAY.bot, M.KEYWAY.top, M.KEYWAY.hw, phi);
  return [Math.max(-R, iv[0]), Math.min(R, iv[1])];
}

export function plug(V, phi) {
  const [kb, kt] = keywayBand(phi);
  const eps = 1e-6;
  const lenses = [];
  for (let i = 0; i < M.PINS; i++) {
    const u = M.pinU(i);
    const samples = [];
    for (let k = 0; k <= 40; k++) {
      const du = -PR + (2 * PR * k) / 40;
      const iv = interval(M.KEYWAY.top, Infinity, Math.sqrt(Math.max(0, PR * PR - du * du)), phi);
      samples.push([u + du, iv && [Math.max(kt, iv[0]), Math.min(R, iv[1])]]);
    }
    for (const r of runs(samples)) if (r.pts.length > 2) lenses.push(r.pts);
  }
  // fills: the whole plug hatched, the keyway and the pin holes as voids
  let fill = `<path class="paper" d="${K.d(V, PLUG_OUTLINE)}"/><path fill="url(#h-brass-135)" d="${K.d(V, PLUG_OUTLINE)}"/>`;
  fill += `<path class="paper" d="${K.d(V, K.rect(-0.01, kb, M.KEYWAY_END, kt))}${lenses.map((p) => K.d(V, p)).join("")}"/>`;
  // edges: the outline, broken where the keyway opens at the face and the holes open at the top
  const openTop = [];
  const openKey = [];
  for (const p of lenses) {
    const top = p.filter(([, z]) => z >= R - eps).map(([u]) => u);
    const bot = p.filter(([, z]) => z <= kt + eps).map(([u]) => u);
    if (top.length > 1) openTop.push([Math.min(...top), Math.max(...top)]);
    if (bot.length > 1) openKey.push([Math.min(...bot), Math.max(...bot)]);
  }
  const along = (z, u0, u1, gaps) => {
    const segs = [];
    let at = u0;
    for (const [g0, g1] of gaps.sort((a, b) => a[0] - b[0])) {
      if (g0 > at) segs.push([[at, z], [g0, z]]);
      at = Math.max(at, g1);
    }
    if (u1 > at) segs.push([[at, z], [u1, z]]);
    return segs;
  };
  const edges = [
    [[0, kt], [0, 7.2], [0.3, 7.5], [1.2, 7.5], [1.2, R]],
    ...along(R, 1.2, M.PLUG_END, openTop),
    [...PLUG_TOP.slice(4), ...PLUG_TOP.slice(4).map(([u, z]) => [u, -z]).reverse(), [1.2, -R], [1.2, -7.5], [0.3, -7.5], [0, -7.2], [0, kb]],
    ...along(kt, 0, M.KEYWAY_END, openKey),
    [[M.KEYWAY_END, kt], [M.KEYWAY_END, kb], [0, kb]],
  ];
  for (const p of lenses) {
    for (let j = 0; j < p.length; j++) {
      const a = p[j];
      const b = p[(j + 1) % p.length];
      const onTop = a[1] >= R - eps && b[1] >= R - eps;
      const onKey = a[1] <= kt + eps && b[1] <= kt + eps;
      if (!onTop && !onKey) edges.push([a, b]);
    }
  }
  return part(2, fill + K.lines(V, edges));
}

// ---------------------------------------------------------------- the key, cut by the plane
const keyBot = (w) => (w < 0 ? M.SHANK.bot : Math.max(M.BLADE_BOT, M.BLADE_BOT + (w - (M.BLADE_LEN - 1))));
export const KEY_BREAK = -3; // the shank is broken off 3 mm behind the shoulder

function keyWs(bitting) {
  const ws = [KEY_BREAK, -1e-4];
  for (let w = 0; w <= M.BLADE_LEN + 1e-9; w += 0.1) ws.push(w);
  for (let i = 0; i < M.PINS; i++) for (const d of [-M.ROOT_FLAT / 2, M.ROOT_FLAT / 2]) ws.push(M.pinU(i) + d);
  ws.push(M.BLADE_LEN);
  return [...new Set(ws.map((w) => Math.round(w * 1e4) / 1e4))].filter((w) => w <= M.BLADE_LEN).sort((a, b) => a - b);
}

export function key(V, bitting, e, phi) {
  const shift = M.BLADE_LEN - e;
  const samples = keyWs(bitting).map((w) => {
    const top = M.keyTop(bitting, w);
    return [w - shift, interval(keyBot(w), top, w < 0 ? M.BLADE_HW : M.BLADE_HW, phi)];
  });
  let out = "";
  for (const r of runs(samples)) {
    const dd = K.d(V, r.pts);
    out += `<path class="paper" d="${dd}"/>`;
    if (r.start === 0) {
      out += `<path class="vis" d="${K.d(V, r.pts, false)}"/>`;
      const a = r.pts[r.pts.length - 1];
      const b = r.pts[0];
      out += K.breakLine(V, a, b);
    } else out += `<path class="vis" d="${dd}"/>`;
  }
  return part(15, out);
}
export const keyDot = (e) => [KEY_BREAK + 1.2 - (M.BLADE_LEN - e), 0];

// ---------------------------------------------------------------- the cam
function hull(points) {
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
export const CAM_SHAPE = hull([...K.circle(0, 0, M.CAM_HUB, 72), ...K.circle(0, M.CAM_TIP.at, M.CAM_TIP.r, 36)]);

// Where the plane (s = 0) meets the turned cam: [zlo, zhi].
export function camSpan(phi) {
  const pts = CAM_SHAPE.map((p) => M.rot(p, phi));
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j < pts.length; j++) {
    const [s0, z0] = pts[j];
    const [s1, z1] = pts[(j + 1) % pts.length];
    if ((s0 <= 0 && s1 >= 0) || (s0 >= 0 && s1 <= 0)) {
      const z = s1 === s0 ? z0 : z0 + ((0 - s0) / (s1 - s0)) * (z1 - z0);
      lo = Math.min(lo, z);
      hi = Math.max(hi, z);
    }
  }
  return [lo, hi];
}

export function cam(V, phi) {
  const [lo, hi] = camSpan(phi);
  const [u0, u1] = M.CAM;
  return part(11, K.cut(V, K.rect(u0, M.SPIGOT_R, u1, hi), { mat: "steel", angle: 60 }) + K.cut(V, K.rect(u0, lo, u1, -M.SPIGOT_R), { mat: "steel", angle: 60 }));
}

// ---------------------------------------------------------------- accent: the shear line and the gaps
export function shearLine(V) {
  return `<path class="shear" d="${K.d(V, [[1.2, R], [M.PLUG_END, R]], false)}"/>`;
}
export function gaps(V, st) {
  return st.map((s, i) => `<path class="gap" d="${K.d(V, [[M.pinU(i) - PR, s.top], [M.pinU(i) + PR, s.top]], false)}"/>`).join("");
}

// ---------------------------------------------------------------- end views (s across, z up)
const ZS = Math.sqrt(R * R - PR * PR); // where a pin hole meets the plug surface
const FIN_Z = Math.sqrt(M.BODY_R ** 2 - (M.FIN_W / 2) ** 2);

export const KEYWAY_SHAPE = [
  [-1.2, 3.4], [-1.2, -0.15], [-0.6, -0.75], [-0.6, -2.05], [-1.2, -2.65], [-1.2, -5.3],
  [0.75, -5.3], [0.75, -3.8], [1.2, -3.35], [1.2, -1.05], [0.6, -0.45], [0.6, 0.85], [1.2, 1.45], [1.2, 3.4],
];
const KEY_SHAPE = (top) => [
  [-1.0, top], [-1.0, -0.1], [-0.45, -0.65], [-0.45, -2.15], [-1.0, -2.7], [-1.0, -5.0],
  [0.6, -5.0], [0.6, -3.7], [1.0, -3.3], [1.0, -1.1], [0.45, -0.55], [0.45, 0.95], [1.0, 1.5], [1.0, top],
];

// Clip a polygon to z <= top (Sutherland–Hodgman, one half-plane).
function clipBelow(poly, top) {
  const out = [];
  for (let j = 0; j < poly.length; j++) {
    const a = poly[j];
    const b = poly[(j + 1) % poly.length];
    const ain = a[1] <= top;
    const bin = b[1] <= top;
    if (ain) out.push(a);
    if (ain !== bin) out.push([a[0] + ((top - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), top]);
  }
  return out;
}

// The key's cross-section at plug position u (a plane across the axis), or "" if the key is not there.
export function keySection(V, bitting, e, u, { mat = "bronze", angle = 30 } = {}) {
  const w = M.keyW(u, e);
  if (w > M.BLADE_LEN || w < KEY_BREAK) return "";
  if (w < 0) return part(15, K.cut(V, K.rect(-M.BLADE_HW, M.SHANK.bot, M.BLADE_HW, M.SHANK.top), { mat, angle }));
  const top = M.keyTop(bitting, w);
  const poly = clipBelow(KEY_SHAPE(Math.max(top, -4.9)), top);
  return poly.length > 2 ? part(15, K.cut(V, poly, { mat, angle })) : "";
}

// The plug cut across a pin hole: a disc with the keyway and the hole up to the surface.
export function plugAcross(V) {
  const a0 = (Math.atan2(ZS, PR) * 180) / Math.PI;
  const poly = [[PR, ZS], ...K.arc(0, 0, R, a0, -180 - a0, 64), [-PR, ZS], [-PR, 3.4], ...KEYWAY_SHAPE, [PR, 3.4]];
  return part(2, K.cut(V, poly, { mat: "brass", angle: 135 }));
}

// The key pin seen across: cone nose below, crown domed to the plug's radius.
export function keyPinAcross(V, s, item) {
  const f = M.NOSE_FLAT / 2;
  const c = s.top - R;
  const crown = [];
  for (let k = 0; k <= 12; k++) {
    const x = PR - (2 * PR * k) / 12;
    crown.push([x, c + Math.sqrt(R * R - x * x)]);
  }
  return part(item, K.body(V, [[-f, s.nose], [f, s.nose], [PR, s.nose + PR - f], ...crown, [-PR, s.nose + PR - f]]));
}

export function driverAcross(V, s) {
  const b = s.top;
  const t = s.dTop;
  return part(8, K.body(V, [[-PR + 0.2, b], [PR - 0.2, b], [PR, b + 0.2], [PR, t - 0.2], [PR - 0.2, t], [-PR + 0.2, t], [-PR, t - 0.2], [-PR, b + 0.2]]));
}

export function springAcross(V, s) {
  return part(9, K.springSection(V, { from: s.dTop, to: M.CAP_BOT, radius: SPR.radius, wire: SPR.wire, turns: SPR.turns, axis: "v", at: 0 }));
}

// The body cut across a pin chamber.
export function bodyAcross(V) {
  const b0 = (Math.atan2(FIN_Z, M.FIN_W / 2) * 180) / Math.PI; // where the round meets the fin
  const a0 = (Math.atan2(ZS, PR) * 180) / Math.PI;
  const poly = [
    [PR, M.FIN_TOP], [PR, ZS], ...K.arc(0, 0, R, a0, -180 - a0, 64), [-PR, ZS], [-PR, M.FIN_TOP],
    [-M.FIN_W / 2, M.FIN_TOP], [-M.FIN_W / 2, FIN_Z], ...K.arc(0, 0, M.BODY_R, 180 - b0, 360 + b0, 64), [M.FIN_W / 2, FIN_Z], [M.FIN_W / 2, M.FIN_TOP],
  ];
  return part(1, K.cut(V, poly, { mat: "brass", angle: 45 }));
}

// VIEW B: the front face.
export function faceBody(V) {
  const b0 = (Math.atan2(FIN_Z, M.FIN_W / 2) * 180) / Math.PI;
  const out = [[-M.FIN_W / 2, M.FIN_TOP], [-M.FIN_W / 2, FIN_Z], ...K.arc(0, 0, M.BODY_R, 180 - b0, 360 + b0, 64), [M.FIN_W / 2, FIN_Z], [M.FIN_W / 2, M.FIN_TOP]];
  const ch = 0.5;
  const z1 = Math.sqrt((M.BODY_R - ch) ** 2 - (M.FIN_W / 2 - ch) ** 2);
  const b1 = (Math.atan2(z1, M.FIN_W / 2 - ch) * 180) / Math.PI;
  const inner = [[-(M.FIN_W / 2 - ch), M.FIN_TOP], [-(M.FIN_W / 2 - ch), z1], ...K.arc(0, 0, M.BODY_R - ch, 180 - b1, 360 + b1, 64), [M.FIN_W / 2 - ch, z1], [M.FIN_W / 2 - ch, M.FIN_TOP]];
  return part(1, K.body(V, out) + K.line(V, inner, "vis") + K.line(V, K.circle(0, 0, M.COLLAR_R, 72), "vis", true));
}
export const SILHOUETTE = (() => {
  const b0 = (Math.atan2(FIN_Z, M.FIN_W / 2) * 180) / Math.PI;
  return [[-M.FIN_W / 2, 40], [-M.FIN_W / 2, FIN_Z], ...K.arc(0, 0, M.BODY_R, 180 - b0, 360 + b0, 64), [M.FIN_W / 2, FIN_Z], [M.FIN_W / 2, 40]];
})();

export function faceAntiDrill(V) {
  return part(13, K.body(V, K.circle(0, 10, PR, 32)) + K.line(V, K.circle(0, 10, PR - 0.25, 32), "thin", true));
}

// The plug face turns: collar chamfer and the keyway.
export function facePlug(V) {
  return part(2, `<path class="paper" d="${K.d(V, K.circle(0, 0, M.COLLAR_R - 0.02, 72))}"/>` + K.line(V, K.circle(0, 0, M.COLLAR_R - 0.3, 72), "vis", true) + K.line(V, KEYWAY_SHAPE, "vis", true));
}

export function faceCam(V, cls) {
  return K.line(V, CAM_SHAPE, cls, true);
}
