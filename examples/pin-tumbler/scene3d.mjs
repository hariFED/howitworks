// The pin tumbler cylinder's solids for its 3D view (pin-tumbler-3d.html), in the same world mm as
// parts.mjs: the sheet's u is x, its z (fin up) is y, and the end views' s (across, seen from the
// front) is z. The longitudinal section A-A, through the axis and the five pin stacks, is z = 0.
// Pure data built with kit/solid3d.mjs from model.mjs and parts.mjs (KEYWAY_SHAPE, CAM_SHAPE).
//
// Moving parts are built at a reference pose and live3d.js moves them:
//   key pins with their nose at y = 0 (V.set moves them to the model's nose height, turned with the plug);
//   drivers from y = 0 to DRIVER_L (each moved by its own solid's inner offset);
//   springs between the drivers' tops for the right key home and the caps (scaled about the cap end);
//   the key home (shoulder on the plug face, so x = w, the distance from the shoulder).

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const R = M.PLUG_R;
const PR = M.PIN_R;
const FIT = 0.03; // pins and their bores: a sliding fit, so no two surfaces coincide
const PIN_R = PR - FIT;
const BORE_R = PR + FIT;
const FIN_Z = Math.sqrt(M.BODY_R ** 2 - (M.FIN_W / 2) ** 2);
export const REST = M.stacks(M.RIGHT, M.BLADE_LEN); // every gap on the line: the scene's reference pose
export const CROWN = 0.25; // the lit slice at the top of each key pin (the key-pin/driver interface)

// ---------------------------------------------------------------- the euro profile (z, y), DIN 18252
const b0 = (Math.atan2(FIN_Z, M.FIN_W / 2) * 180) / Math.PI;
export const PROFILE = [[-M.FIN_W / 2, M.FIN_TOP], [-M.FIN_W / 2, FIN_Z], ...K.arc(0, 0, M.BODY_R, 180 - b0, 360 + b0, 72).slice(1, -1), [M.FIN_W / 2, FIN_Z], [M.FIN_W / 2, M.FIN_TOP]];

// ---------------------------------------------------------------- the key: its profile swept, its top cut
// The blade's cross-section (parts.mjs KEY_SHAPE: the wards that fit the keyway) is built as slabs in
// s, each a side outline (x = w, y) extruded across its s range; the 45° flanks of the wards are taken
// at their mid height. Each slab runs between its own y limits and the key's bitted top / bottom.
export const KEY_SLABS = [
  { s: [-0.45, 0.45], y: [-Infinity, Infinity] },
  { s: [-1.0, -0.45], y: [-0.375, Infinity] },
  { s: [-1.0, -0.45], y: [-Infinity, -2.425] },
  { s: [0.45, 1.0], y: [1.225, Infinity] },
  { s: [0.45, 0.6], y: [-Infinity, -0.625] },
  { s: [0.6, 1.0], y: [-3.5, -0.9] },
];
const L = M.BLADE_LEN;
export const keyBot = (w) => Math.max(M.BLADE_BOT, M.BLADE_BOT + (w - (L - 1)));

// The w where the key's top or bottom has a corner: both are piecewise linear between them.
function corners(bitting) {
  const ws = [0, L, L - 1, L - (M.BLADE_TOP - M.TIP_LOW)];
  const f = M.ROOT_FLAT / 2;
  for (let i = 0; i < M.PINS; i++) {
    const u = M.pinU(i);
    const d = M.BLADE_TOP - M.root(bitting[i]);
    ws.push(u - f, u + f, u - f - d, u + f + d);
    if (i < M.PINS - 1) ws.push((M.root(bitting[i + 1]) - M.root(bitting[i]) + u + M.pinU(i + 1)) / 2);
  }
  const r5 = M.root(bitting[M.PINS - 1]);
  ws.push((M.TIP_LOW + L - r5 + M.pinU(M.PINS - 1) + f) / 2);
  return ws.filter((w) => w >= 0 && w <= L);
}

// The slab's outline pieces: runs of w where its top is above its bottom.
export function slabOutlines(bitting, { y: [ylo, yhi] }) {
  const top = (w) => Math.min(yhi, M.keyTop(bitting, w));
  const bot = (w) => Math.max(ylo, keyBot(w));
  const base = [...new Set(corners(bitting).map((w) => Math.round(w * 1e6) / 1e6))].sort((a, b) => a - b);
  // add the crossings of the top and bottom with the slab's limits and with each other
  const ws = [];
  for (let k = 0; k < base.length; k++) {
    ws.push(base[k]);
    if (k === base.length - 1) break;
    const a = base[k];
    const b = base[k + 1];
    const fns = [(w) => M.keyTop(bitting, w) - yhi, (w) => M.keyTop(bitting, w) - ylo, (w) => keyBot(w) - ylo, (w) => keyBot(w) - yhi, (w) => top(w) - bot(w)];
    for (const g of fns) {
      const ga = g(a);
      const gb = g(b);
      if (Number.isFinite(ga) && Number.isFinite(gb) && ga * gb < 0) ws.push(a + ((b - a) * ga) / (ga - gb));
    }
  }
  const all = [...new Set(ws.map((w) => Math.round(w * 1e6) / 1e6))].sort((a, b) => a - b);
  const out = [];
  let cur = null;
  for (const w of all) {
    const t = top(w);
    const bt = bot(w);
    if (t - bt > 1e-6) {
      if (!cur) out.push((cur = { top: [], bot: [] }));
      cur.top.push([w, t]);
      cur.bot.push([w, bt]);
    } else {
      if (cur) {
        cur.top.push([w, t]);
        cur = null;
      }
      // a run may start here
      const next = all[all.indexOf(w) + 1];
      if (next != null && top(next) - bot(next) > 1e-6) out.push((cur = { top: [[w, t]], bot: [] }));
    }
  }
  const polys = out.map((r) => {
    let pts = [...r.top, ...r.bot.reverse()];
    pts = pts.filter((p, i) => {
      const q = pts[(i + 1) % pts.length];
      return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6;
    });
    // drop points on a straight run (fewer triangles, no spurious creases)
    return pts.filter((p, i) => {
      const a = pts[(i - 1 + pts.length) % pts.length];
      const b = pts[(i + 1) % pts.length];
      return Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) > 1e-7;
    });
  });
  return polys.filter((p) => p.length >= 3);
}

// Is the point (w, y, s) inside the key (the slabs' union)? live3d.js uses it to drop crease lines
// along the seams between slabs, which are not edges of the key.
export function inKey(bitting, w, y, s) {
  if (w < 0 || w > L) return false;
  if (y > M.keyTop(bitting, w) || y < keyBot(w)) return false;
  return KEY_SLABS.some((sl) => s >= sl.s[0] && s <= sl.s[1] && y >= sl.y[0] && y <= sl.y[1]);
}

export const BOW = { x0: -28, x1: -6, y: -0.25, hy: 12, hw: 1.25, hole: [-23, 3] };
function keySolids(bitting, tag) {
  const out = [];
  for (const sl of KEY_SLABS) for (const poly of slabOutlines(bitting, sl)) out.push(S.extrude(poly, { along: "z", from: sl.s[0], to: sl.s[1], live: tag ? `${tag}${out.length}` : undefined }));
  // shank behind the shoulder, then the bow with its ring hole
  out.push(S.extrude(K.rect(BOW.x1, M.SHANK.bot, 0, M.SHANK.top), { along: "z", from: -M.BLADE_HW, to: M.BLADE_HW }));
  out.push(S.extrude(S.rrectAt((BOW.x0 + BOW.x1) / 2, BOW.y, (BOW.x1 - BOW.x0) / 2, BOW.hy, 6, 6), { along: "z", from: -BOW.hw, to: BOW.hw, holes: [S.circle(BOW.hole[0], BOW.y, BOW.hole[1], 40)] }));
  return out;
}
// Both keys are solids of item 15; live3d.js shows one (the tour swaps them while the key is out).
export const KEY_SPLIT = keySolids(M.RIGHT).length;

// The keyway as bored: the sheet's profile, its far (s < 0) wall above the lower ward set back to the
// pins' radius. The key pins are Ø3 and the keyway 2.4 wide, so where a cone dips into the keyway the
// pin's back face lies behind the true far wall, which would draw over the pin's cut face (2D model,
// 3D truth); behind the plane, 0.35 mm of extra depth is invisible.
const KEYWAY_BORE = [[-BORE_R, M.KEYWAY.top], [-BORE_R, 0.2], ...P.KEYWAY_SHAPE.slice(1)];

// ---------------------------------------------------------------- the stacks
// The chamber bores are volumes, not holes, so the fin's top face runs over them: the caps stand
// 0.03 mm proud of it, or their faces would fight it.
const CAP_TOP = M.FIN_TOP + 0.03;
const keyPinLoop = (len) => [[0, 0], [M.NOSE_FLAT / 2, 0], [PIN_R, PIN_R - M.NOSE_FLAT / 2], [PIN_R, len - CROWN], [0, len - CROWN]];
const crownLoop = (len) => [[0, len - CROWN], [PIN_R, len - CROWN], [PIN_R, len], [0, len]];
const c = 0.2;
const driverLoop = [[0, 0], [PIN_R - c, 0], [PIN_R, c], [PIN_R, M.DRIVER_L - c], [PIN_R - c, M.DRIVER_L], [0, M.DRIVER_L]];
export const SPRING_LEN = M.CAP_BOT - REST[0].dTop;

// the lowest wire section on the plane's left of a spring, from the helix: a point always on the wire
function springAnchor(i) {
  const from = REST[i].dTop;
  const t = 7.5 / (2 * P.SPR.turns);
  return [M.pinU(i) - P.SPR.radius, from + P.SPR.wire / 2 + t * (SPRING_LEN - P.SPR.wire), 0];
}

export function parts() {
  const pins = [];
  for (let i = 0; i < M.PINS; i++) {
    const len = M.KEY_PINS[i];
    const at = [M.pinU(i), 0];
    pins.push(
      S.part(P.PIN_ITEM[i], `KEY PIN Ø3×${len}, CODE ${M.RIGHT[i]}, PIN ${i + 1}`, [
        S.lathe(keyPinLoop(len), { at }),
        S.lathe(crownLoop(len), { at, hatch: "solid", live: "crown" }),
      ], {
        explode: { to: [0, 28, 0] },
        anchor: { cut: [M.pinU(i) - 0.4, len * 0.55, 0], out: { c: [M.pinU(i), len * 0.55, 0], r: PIN_R, axis: "y" } },
      })
    );
  }
  const axisX = (loop) => S.lathe(loop, { axis: "x", at: [0, 0] });
  return [
    // ---- the body: the euro profile in pieces along the axis, each with its own through holes
    S.part(1, "BODY, EURO PROFILE DIN 18252, 30/10", [
      S.extrude(PROFILE, { along: "x", from: 0, to: M.COLLAR_L, holes: [S.circle(0, 0, M.COLLAR_R + 0.05, 96), S.circle(0, 10, PR + 0.05, 32)] }),
      S.extrude(PROFILE, { along: "x", from: M.COLLAR_L, to: 2.5, holes: [S.circle(0, 0, R + 0.05, 96), S.circle(0, 10, PR + 0.05, 32)] }),
      S.extrude(PROFILE, { along: "x", from: 2.5, to: M.SLOT[0], holes: [S.circle(0, 0, R + 0.05, 96)] }),
      // the bridge over the cam slot, with the fixing screw's hole across it
      S.extrude(K.rect(M.SLOT[0], M.BRIDGE, M.SLOT[1], M.FIN_TOP), { along: "z", from: -M.FIN_W / 2, to: M.FIN_W / 2, holes: [S.circle(M.SCREW.u, M.SCREW.z, M.SCREW.d / 2 + 0.05, 48)] }),
      S.extrude(PROFILE, { along: "x", from: M.SLOT[1], to: M.REAR_CB, holes: [S.circle(0, 0, M.REAR_BORE_R, 72)] }),
      S.extrude(PROFILE, { along: "x", from: M.REAR_CB, to: M.BODY_L, holes: [S.circle(0, 0, M.REAR_CB_R, 96)] }),
      // the five pin chambers, from the shear line up through the fin (the caps close them)
      ...Array.from({ length: M.PINS }, (_, i) => S.bore(S.cylinder({ at: [M.pinU(i), 0], r: BORE_R, from: R, to: M.FIN_TOP }))),
    ], { mat: "brass", angle: 45, anchor: { cut: [37.2, 16, 0], out: { c: [37.2, 16, 0], r: M.FIN_W / 2, axis: "box" } } }),

    // ---- the plug: collar, plug, spigot and its groove, as the sheet's half-profile; keyway and pin holes bored
    // (the pin holes are drilled on through the keyway, so no false floor shows under a pin at its top)
    S.part(2, "PLUG Ø13, 5 CHAMBERS, PITCH 4", [
      axisX([[0, 0], [7.2, 0], [M.COLLAR_R, 0.3], [M.COLLAR_R, M.COLLAR_L], [R, M.COLLAR_L], [R, M.PLUG_END], [M.SPIGOT_R, M.PLUG_END], [M.SPIGOT_R, M.GROOVE[0]], [3, M.GROOVE[0]], [3, M.GROOVE[1]], [M.SPIGOT_R, M.GROOVE[1]], [M.SPIGOT_R, M.SPIGOT_END - 0.3], [M.SPIGOT_R - 0.3, M.SPIGOT_END], [0, M.SPIGOT_END]]),
      S.bore(S.extrude(KEYWAY_BORE, { along: "x", from: 0, to: M.KEYWAY_END })),
      ...Array.from({ length: M.PINS }, (_, i) => S.bore(S.cylinder({ at: [M.pinU(i), 0], r: BORE_R, from: M.KEYWAY.bot, to: R }))),
    ], { mat: "brass", angle: 135, explode: [-44, 0, 0], anchor: { cut: [23.6, 5.0, 0], out: { c: [23.6, 0, 0], r: R, axis: "x" } } }),

    ...pins,

    S.part(8, "DRIVER PIN Ø3×5", Array.from({ length: M.PINS }, (_, i) => S.lathe(driverLoop, { at: [M.pinU(i), 0] })), {
      explode: [0, 32, 0], anchor: { cut: [M.pinU(2) + 0.6, 2.5, 0], out: { c: [M.pinU(2), 2.5, 0], r: PIN_R, axis: "y" }, solid: 2 },
    }),
    S.part(9, "PIN SPRING Ø2.55×0.25, 7 TURNS", Array.from({ length: M.PINS }, (_, i) =>
      S.helix({ axis: "y", at: [M.pinU(i), 0], from: REST[i].dTop, to: M.CAP_BOT, radius: P.SPR.radius, wire: P.SPR.wire, turns: P.SPR.turns, pivot: [M.pinU(i), M.CAP_BOT, 0] })
    ), { hatch: "solid", explode: [0, 37, 0], anchor: { cut: springAnchor(3), out: { c: [M.pinU(3), 17, 0], r: 1.3, axis: "y" }, solid: 3 } }),
    S.part(10, "CHAMBER CAP Ø3×2, PRESSED", Array.from({ length: M.PINS }, (_, i) =>
      S.lathe([[0, M.CAP_BOT], [PR - 0.2, M.CAP_BOT], [PR, M.CAP_BOT + 0.2], [PR, CAP_TOP], [0, CAP_TOP]], { at: [M.pinU(i), 0] })
    ), { explode: [0, 42, 0], anchor: { cut: [M.pinU(4) + 0.6, 23.5, 0], out: { c: [M.pinU(4), M.FIN_TOP, 0], r: 0.6, axis: "z" }, solid: 4 } }),

    // the cam turns with the plug's tail, cut like the sheet's section
    S.part(11, "CAM, 30/10", [S.extrude(P.CAM_SHAPE, { along: "x", from: M.CAM[0], to: M.CAM[1], holes: [S.circle(0, 0, M.SPIGOT_R + 0.05, 64)] })], {
      mat: "steel", angle: 60, explode: [0, -20, 0], anchor: { cut: [30, 8.2, 0], out: { c: [M.CAM[1], 0, 0], r: 6.3, axis: "x" } },
    }),
    S.part(12, "RETAINING WASHER DIN 6799-6", [S.tube({ axis: "x", at: [0, 0], r0: 3.02, r1: 6.15, from: M.GROOVE[0], to: M.GROOVE[1] })], {
      mat: "steel", angle: 60, explode: [18, 0, 0], anchor: { cut: [38.25, 5.4, 0], out: { c: [38.25, 0, 0], r: 6.15, axis: "x" } },
    }),
    S.part(13, "ANTI-DRILL PIN Ø3×2.5", [S.lathe([[0, 0.05], [PR - 0.25, 0.05], [PR, 0.3], [PR, 2.5], [0, 2.5]], { axis: "x", at: [10, 0] })], {
      explode: [-12, 0, 0], anchor: { cut: [1.4, 10.6, 0], out: { c: [0.05, 10, 0] } },
    }),
    S.part(14, "FIXING SCREW M5×70", [S.cylinder({ axis: "z", at: [M.SCREW.u, M.SCREW.z], r: M.SCREW.d / 2, from: -14, to: M.FIN_W / 2 })], {
      mat: "steel", angle: 135, explode: [0, 0, -22], anchor: { cut: [M.SCREW.u + 1.2, M.SCREW.z + 1.0, 0], out: { c: [M.SCREW.u, M.SCREW.z, -14], r: 1, axis: "z" } },
    }),
    // the key, whole (not cut): its bitting and the wards of its profile are what fits the lock
    S.part(15, "KEY, BITTING 2-4-1-6-3", [...keySolids(M.RIGHT, "r"), ...keySolids(M.WRONG, "w")], {
      explode: { to: [-74, 0, 0] }, anchor: { cut: [-12, 6, BOW.hw], out: { c: [-12, 6, BOW.hw] } },
    }),
    S.part(16, "THRUST WASHER Ø8.4×Ø12×0.5", [S.tube({ axis: "x", at: [0, 0], r0: M.SPIGOT_R + 0.2, r1: 6.0, from: M.REAR_CB, to: M.GROOVE[0] })], {
      hatch: "solid", explode: [10, 0, 0], anchor: { cut: [37.65, -5.2, 0], out: { c: [37.65, 0, 0], r: 6, axis: "x" } },
    }),

    // ---- the accent: a thin band lying on the plane along the shear line (not a part: no balloon)
    S.part(90, "SHEAR LINE", [S.box([M.COLLAR_L, R - 0.2, -0.1], [M.PLUG_END, R + 0.2, 0])], { hatch: "solid" }),
  ];
}

// centre lines: the plug's axis and the five chamber axes
export const centres = () => [
  [[-32, 0, 0], [M.BODY_L + 4, 0, 0]],
  ...Array.from({ length: M.PINS }, (_, i) => [[M.pinU(i), M.KEYWAY.top, 0], [M.pinU(i), M.FIN_TOP + 1.5, 0]]),
];

export const scene = () => ({ parts: parts(), fluids: [], centres: centres() });
