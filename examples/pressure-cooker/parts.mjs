// The pressure cooker's parts, in world mm (u right, v up, the pot's axis at u = 0, v = 0 under
// the base). Each function draws one part into a view and returns SVG, so the section and every
// detail draw the same geometry at their own scale. Parts on the lid are drawn with the lid
// seated (lift 0) and moved with a transform; the gasket, the safety valve and the steam change
// shape and are redrawn.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const mirror = (pts) => K.flipU(pts);
const both = (V, pts, opts) => K.cut(V, pts, opts) + K.cut(V, mirror(pts), opts);
const bodyBoth = (V, pts) => K.body(V, pts) + K.body(V, mirror(pts));
const under = (r) => M.lidTop(r) - M.LID_T;
// Sheet metal is blacked in where it is thinner than 6 sheet units, hatched where a detail enlarges it.
const sheet = (V, t, angle) => (V.k * t < 6 ? { mat: "solid" } : { mat: "steel", angle });

// ---------------------------------------------------------------- positions (mm)
export const SAFETY_U = -24;
export const PIN_U = 94;
export const PIN_DOWN = 165.7; // underside of the pin head, pin down
export const SCREW_U = 79; // lid-handle screw
export const PH_SCREW = 165; // main-handle screw, radius
export const HH_SCREW = 140; // helper-handle screw, radius
export const WINDOW = [106, 112]; // the gasket release window in the lid flange (left side)

// ---------------------------------------------------------------- pot, base

export function pot(V) {
  const loop = [
    [0, M.FLOOR], [98, M.FLOOR], ...K.arc(98, 19, 12, -90, 0, 6).slice(1), [110, M.RIM],
    [118, M.RIM], [118, 159], [113, 159], [113, 160], [117, 160], [117, 167], [111, 167],
    ...K.arc(98, 19, 13, 0, -90, 6), [0, 6],
  ];
  return part(1, K.section(V, { ...K.revolve(loop), edges: [] }, sheet(V, M.WALL, 45)));
}

export function capsule(V) {
  const loop = [[0, 0], [90, 0], ...K.arc(90, 3, 3, -90, 0, 4).slice(1), [93, 6], [92.4, 6], ...K.arc(90, 3, 2.4, 0, -90, 4), [0, 0.6]];
  return part(2, K.section(V, { ...K.revolve(loop), edges: [] }, { mat: "solid" }));
}

export function disc(V) {
  const loop = [[0, 0.6], [90, 0.6], ...K.arc(90, 3, 2.4, -90, 0, 4).slice(1), [92.4, 6], [0, 6]];
  return part(3, K.section(V, { ...K.revolve(loop), edges: [] }, { mat: "alu", angle: 45 }));
}

// ---------------------------------------------------------------- lid

// One stretch of the lid plate between two holes, r0 < r1 (right-hand side, mirror for the left).
function plate(r0, r1) {
  const rs = [r0];
  for (let r = Math.ceil(r0 / 2) * 2; r < r1; r += 2) if (r > r0) rs.push(r);
  rs.push(r1);
  return [...rs.map((r) => [r, under(r)]), ...rs.slice().reverse().map((r) => [r, M.lidTop(r)])];
}
// The plate from r0 out to the rim: inner skirt, flange over the pot, outer skirt and lug.
function rim(r0, window = false) {
  const rs = [r0];
  for (let r = Math.ceil(r0 / 2) * 2; r < M.SKIRT_R; r += 2) if (r > r0) rs.push(r);
  const top = rs.slice().reverse().map((r) => [r, M.lidTop(r)]);
  const inner = [...rs.map((r) => [r, under(r)]), [M.SKIRT_R, under(M.SKIRT_R)], [M.SKIRT_R, M.SKIRT_BOT], [105.2, M.SKIRT_BOT], [105.2, 172.8]];
  const outer = [[121, 172.8], [121, M.LUG_TOP], [114, M.LUG_TOP], [114, 157], [M.LID_OUT, 157], [M.LID_OUT, 174]];
  if (!window) return [[...inner, ...outer, [M.SKIRT_R, 174], ...top]];
  return [
    [...inner, [WINDOW[0], 172.8], [WINDOW[0], 174], [M.SKIRT_R, 174], ...top],
    [[WINDOW[1], 172.8], ...outer, [WINDOW[1], 174]],
  ];
}

export function lid(V) {
  const right = [plate(4.1, SCREW_U - 2.6), plate(SCREW_U + 2.6, PIN_U - 3), ...rim(PIN_U + 3)];
  const left = [plate(4.1, -SAFETY_U - 4.1), ...rim(-SAFETY_U + 4.1, true)];
  // The back half of the inner skirt's lower edge, seen across the steam; the window's far end.
  const back = K.line(V, [[-M.SKIRT_R, M.SKIRT_BOT], [M.SKIRT_R, M.SKIRT_BOT]]) + K.lines(V, [[[-WINDOW[1], 172.8], [-WINDOW[0], 172.8]], [[-WINDOW[1], 174], [-WINDOW[0], 174]]]);
  const m = sheet(V, M.LID_T, 135);
  return part(4, right.map((p) => K.cut(V, p, m)).join("") + left.map((p) => K.cut(V, mirror(p), m)).join("") + back);
}

// The gasket: an L-section ring held in the lid, sealing on the bore and on the pot's flange.
// lift: the lid's rise; the lower lip slides up the bore, the flange lobe stretches.
export function gasketLoop(lift) {
  const L = lift;
  return [[105.2, 161 + L], [109.4, 161 + L], [110, 161.8 + L], [110, M.RIM], [114, M.RIM], [114.6, M.RIM + 0.6], [114.6, 172.8 + L], [105.2, 172.8 + L]];
}
export function gasket(V, lift) {
  const g = gasketLoop(lift);
  return part(5, K.cut(V, g, { mat: "rubber", angle: 45 }) + K.cut(V, mirror(g), { mat: "rubber", angle: 45 }));
}

// ---------------------------------------------------------------- handles

const phBottom = (r) => 141 + ((r - 128) * 6) / 142;
export function potHandle(V) {
  const b = phBottom;
  const s = PH_SCREW;
  const lowFront = [[128, 141], [s - 5.5, b(s - 5.5)], [s - 5.5, 146.5], [s - 2.75, 146.5], [s - 2.75, 152], [128, 152]];
  const big = [
    [s + 5.5, b(s + 5.5)], [258, b(258)], [258, 170], [153, 170], [153, 165], [139, 165], [139, 170], [128, 170], [128, 154],
    [s - 2.5, 154], [s - 2.5, 163], [s, 164.4], [s + 2.5, 163], [s + 2.5, 154], [176, 154], [176, 152], [s + 2.75, 152], [s + 2.75, 146.5], [s + 5.5, 146.5],
  ];
  const tip = [[266, b(266)], [270, b(270)], [275, 149], [279, 153], [280, 158], [279, 164], [275, 168.5], [270, 170], [266, 170]];
  return part(6, [lowFront, big, tip].map((p) => K.cut(V, p, { mat: "plastic", angle: 135 })).join("") + K.line(V, [[143, 165], [143, 170]], "thin"));
}

export function helperHandle(V) {
  const b = (r) => 143 + ((r - 128) * 2) / 34;
  const s = HH_SCREW;
  const lowFront = [[128, 143], [s - 5.5, b(s - 5.5)], [s - 5.5, 146.5], [s - 2.75, 146.5], [s - 2.75, 152], [128, 152]];
  const rest = [
    [s + 5.5, b(s + 5.5)], [162, 145], [166.5, 147], [169.5, 151], [170, 156], [169, 161], [166, 165], [162, 167], [128, 167], [128, 154],
    [s - 2.5, 154], [s - 2.5, 162], [s, 163.4], [s + 2.5, 162], [s + 2.5, 154], [150, 154], [150, 152], [s + 2.75, 152], [s + 2.75, 146.5], [s + 5.5, 146.5],
  ];
  return part(8, [lowFront, rest].map((p) => K.cut(V, mirror(p), { mat: "plastic", angle: 45 })).join(""));
}

export function brackets(V) {
  const arm = (end, s) => [
    [[111, 136], [113, 136], [113, 152], [s - 2.75, 152], [s - 2.75, 154], [111, 154]],
    [[s + 2.75, 152], [end, 152], [end, 154], [s + 2.75, 154]],
  ];
  const right = arm(176, PH_SCREW);
  const left = arm(150, HH_SCREW).map(mirror);
  return part(7, [...right, ...left].map((p) => K.cut(V, p, sheet(V, 2, 30))).join(""));
}

// A pan-head or button-head screw seen in section (not cut): head, shank and thread roots.
function screwBody(V, u, headV, headDown, k, dk, len) {
  const r = 2.5;
  const shank = headDown ? [[u - r, headV], [u + r, headV], [u + r, headV + len - 0.4], [u + r - 0.4, headV + len], [u - r + 0.4, headV + len], [u - r, headV + len - 0.4]] : null;
  const h0 = headV - k;
  const head = [[u - dk / 2, headV], [u - dk / 2, h0 + k * 0.45], [u - dk / 2 + 1, h0], [u + dk / 2 - 1, h0], [u + dk / 2, h0 + k * 0.45], [u + dk / 2, headV]];
  const roots = K.lines(V, [[[u - r + 0.45, headV + 1.5], [u - r + 0.45, headV + len - 0.5]], [[u + r - 0.45, headV + 1.5], [u + r - 0.45, headV + len - 0.5]]], "thin");
  return K.body(V, shank) + K.body(V, head) + roots;
}

export function handleScrews(V) {
  const ph = screwBody(V, PH_SCREW, 146.5, true, 3.5, 9.5, 16);
  const hh = screwBody(V, -HH_SCREW, 146.5, true, 3.5, 9.5, 14.5);
  const slot = (u) => K.line(V, K.rect(u - 0.6, 143, u + 0.6, 144.6), "hid", true);
  return part(10, ph + hh + slot(PH_SCREW) + slot(-HH_SCREW));
}

// The lid handle, cut along its length: a phenolic moulding with the pin bore and sight hole,
// the channel the lock slide runs in, its spring pocket, the knob slot and the tab slot.
const lhTopPts = [[70, 190], [74, 194], [100, 197], [250, 192], [258, 190], [262, 186]];
function lhTop(r) {
  for (let i = 1; i < lhTopPts.length; i++) {
    const [r0, v0] = lhTopPts[i - 1];
    const [r1, v1] = lhTopPts[i];
    if (r <= r1) return v0 + ((v1 - v0) * (r - r0)) / (r1 - r0);
  }
  return 186;
}
const topRun = (r1, r0) => {
  const pts = [[r1, lhTop(r1)]];
  for (const [r, v] of lhTopPts.slice().reverse()) if (r < r1 && r > r0) pts.push([r, v]);
  pts.push([r0, lhTop(r0)]);
  return pts;
};
export const SLIDE = { v0: 178, v1: 179.5, chan0: 177.9, chan1: 179.7, r0: 88, r1: 150, tab: 140, pocket: 163 };
export function lidHandle(V) {
  const sb = SCREW_U;
  const lidRun = (r0, r1) => {
    const pts = [];
    for (let r = r0; r < r1; r += 2) pts.push([r, M.lidTop(r)]);
    pts.push([r1, M.lidTop(r1)]);
    return pts;
  };
  const p1 = [
    [70, 190], [70, M.lidTop(70)], ...lidRun(70, sb - 2.5).slice(1), [sb - 2.5, 186], [sb, 187.5], [sb + 2.5, 186], ...lidRun(sb + 2.5, 84),
    [90.8, 174], [90.8, SLIDE.chan0], [87, SLIDE.chan0], [87, SLIDE.chan1], [90.8, SLIDE.chan1], [90.8, 184], [92, 184], ...topRun(92, 70).slice(0, -1),
  ];
  const p2 = [[97.2, SLIDE.chan1], [118, SLIDE.chan1], ...topRun(118, 96), [96, 184], [97.2, 184]];
  const p3 = [[97.2, 174], [139.5, 174], [139.5, SLIDE.chan0], [97.2, SLIDE.chan0]];
  const p4 = [
    [136, SLIDE.chan1], [SLIDE.r1, SLIDE.chan1], [SLIDE.r1, 180.8], [SLIDE.pocket, 180.8], [SLIDE.pocket, 176.6], [SLIDE.r1, 176.6], [SLIDE.r1, SLIDE.chan0],
    [142.5, SLIDE.chan0], [142.5, 174], [260, 174], [262, 177], ...topRun(262, 136),
  ];
  return part(9, [p1, p2, p3, p4].map((p) => K.cut(V, p, { mat: "plastic", angle: 45 })).join(""));
}

export function lidScrew(V) {
  const u = SCREW_U;
  const hv = under(u);
  return part(23, screwBody(V, u, hv, true, 2.75, 9.5, 12) + K.line(V, K.rect(u - 1.5, hv - 2.75, u + 1.5, hv - 1.2), "hid", true));
}

// The lock slide (sheet steel) with its tab, in the locked position; its knob; its spring.
export function slide(V) {
  const { v0, v1, r0, r1, tab } = SLIDE;
  const a = [[r0, v0], [PIN_U - 2.7, v0], [PIN_U - 2.7, v1], [r0, v1]];
  const b = [[PIN_U + 2.7, v0], [tab, v0], [tab, 166], [tab + 1.5, 166], [tab + 1.5, v0], [r1, v0], [r1, v1], [PIN_U + 2.7, v1]];
  const m = sheet(V, 1.5, 30);
  return part(17, K.cut(V, a, m) + K.cut(V, b, m));
}
export function knob(V) {
  return part(24, K.cut(V, K.rrect(120, SLIDE.v1, 128, 199.5, 1.4), { mat: "plastic", angle: 135 }));
}
export function slideSpring(V) {
  return part(18, K.springSection(V, { from: SLIDE.r1, to: SLIDE.pocket, radius: 1.75, wire: 0.45, turns: 5, axis: "u", at: 178.7 }));
}

// ---------------------------------------------------------------- operating valve

export function stem(V) {
  const loop = [[1.5, 184], [6.5, 184], [7, 184.5], [7, 186.8], [4, 186.8], [4, 198], [3, 199], [3, 211], [2.2, M.NOZZLE_TOP], [1.5, M.NOZZLE_TOP]];
  const roots = K.lines(V, [[[3.4, 187], [3.4, 197.6]], [[-3.4, 187], [-3.4, 197.6]]], "thin");
  return part(11, K.section(V, K.revolve(loop), { mat: "brass", angle: 135 }) + roots);
}

const washerLoop = [[4, 186.8], [7, 186.8], [7, 188.8], [4, 188.8]];
const nutHalf = (v0, v1) => [[4, v0], [6.5, v0], [6.5, v1 - 0.6], [5.9, v1], [4, v1]];
const nutHalfDown = (v0, v1) => [[4, v0], [5.9, v0], [6.5, v0 + 0.6], [6.5, v1], [4, v1]];
export function stemNuts(V) {
  const top = nutHalf(190, 194);
  const sv = (pts) => K.move(pts, SAFETY_U, 0);
  const low = nutHalfDown(182.8, 186.8);
  return part(12, bodyBoth(V, top) + K.body(V, sv(low)) + K.body(V, sv(mirror(low))));
}
export function washers(V) {
  const sv = (pts) => K.move(pts, SAFETY_U, 0);
  return part(14, both(V, washerLoop, { mat: "rubber", angle: 135 }) + K.cut(V, sv(washerLoop), { mat: "rubber", angle: 135 }) + K.cut(V, sv(mirror(washerLoop)), { mat: "rubber", angle: 135 }));
}

// The weight, drawn seated; the page lifts and rocks it.
export function weight(V) {
  return part(13, K.section(V, { ...K.revolve(M.WEIGHT_PROFILE), edges: [] }, { mat: "brass", angle: 45 }));
}

// ---------------------------------------------------------------- safety valve (axis at SAFETY_U)

export function safetyBody(V) {
  const at = SAFETY_U;
  const low = K.revolve([[1.5, 182], [4, 182], [4, 190], [6, 190], [6, 193], [3, 193], [3, 184], [1.5, 184]], { at });
  const high = K.revolve([[3, 195], [6, 195], [6, 199], [1.6, 199], [1.6, 197.2], [3, 197.2]], { at });
  const roots = K.lines(V, [[[at - 3.4, 182.4], [at - 3.4, 189.6]], [[at + 3.4, 182.4], [at + 3.4, 189.6]]], "thin");
  return part(19, K.section(V, { ...low, edges: [] }, { mat: "steel", angle: 45 }) + K.section(V, { ...high, edges: [] }, { mat: "steel", angle: 45 }) + roots);
}

// Plunger, seal and spring, lifted s mm off the seat.
export function safetyMoving(V, s = 0) {
  const at = SAFETY_U;
  const plunger = [[at - 2.6, 185 + s], [at + 2.6, 185 + s], [at + 2.6, 186 + s], [at + 1.4, 186 + s], [at + 1.4, 201 + s], [at - 1.4, 201 + s], [at - 1.4, 186 + s], [at - 2.6, 186 + s]];
  const seal = K.rrect(at - 2.6, 184 + s, at + 2.6, 185 + s, 0.3, 2);
  return (
    part(20, K.body(V, plunger)) +
    part(21, K.cut(V, seal, { mat: "rubber", angle: 45 })) +
    part(22, K.springSection(V, { from: 186 + s, to: 197.2, radius: 2.15, wire: 0.5, turns: 6, axis: "v", at }))
  );
}

// ---------------------------------------------------------------- lock pin, drawn down

export function pin(V) {
  const v = PIN_DOWN;
  const u = PIN_U;
  const body = [
    [u - 4.5, v], [u + 4.5, v], [u + 4.5, v + 1.5], [u + 2.5, v + 1.5], [u + 2.5, v + 11.4], [u + 2, v + 11.9],
    [u - 2, v + 11.9], [u - 2.5, v + 11.4], [u - 2.5, v + 1.5], [u - 4.5, v + 1.5],
  ];
  const ring = (c) => K.cut(V, K.circle(c, v + 2.3, 0.8, 16), { mat: "rubber", angle: 45 });
  return part(15, K.body(V, body)) + part(16, ring(u - 3.3) + ring(u + 3.3));
}

// ---------------------------------------------------------------- water and steam

export function waterPoly(level) {
  return [
    [-M.R_IN, level], ...K.arc(-98, 19, 12, 180, 270, 6), ...K.arc(98, 19, 12, 270, 360, 6), [M.R_IN, level],
  ];
}

// The steam space: from the water up to the lid's underside, inside the gasket.
export function steamPoly(level, lift) {
  const L = lift;
  const rs = [];
  for (let r = M.SKIRT_R; r >= -M.SKIRT_R; r -= 4) rs.push(r);
  return [
    [-M.R_IN, level], [M.R_IN, level], [M.R_IN, 162 + L], [M.SKIRT_R, 162 + L],
    ...rs.map((r) => [r, under(r) + L]),
    [-M.SKIRT_R, 162 + L], [-M.R_IN, 162 + L],
  ];
}

export const path = (V, shapes) => shapes.map((s) => K.d(V, s)).join("");

// Bubbles rising through boiling water: deterministic in the clock.
export function bubbles(V, level, clock, n) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const u = -96 + ((i * 53.7) % 192);
    const rate = 0.55 + ((i * 37) % 11) / 20;
    const ph = (clock * rate + i * 0.137) % 1;
    const v = M.FLOOR + 2 + ph * (level - M.FLOOR - 3.5);
    const r = 0.7 + 0.9 * ph;
    const [x, y] = V.p([u + Math.sin(clock * 3 + i) * 1.2, v]);
    out += `M${K.r2(x - r * V.k)} ${y}a${K.r2(r * V.k)} ${K.r2(r * V.k)} 0 1 0 ${K.r2(2 * r * V.k)} 0a${K.r2(r * V.k)} ${K.r2(r * V.k)} 0 1 0 ${K.r2(-2 * r * V.k)} 0`;
  }
  return out;
}

// Puffs of steam leaving a vent: n blobs drifting out and up from (u, v), mirrored when two-sided.
export function puffs(V, { u, v, dir, rise, spread, size, clock, n, rate = 1.6, sides = 2 }) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const ph = (clock * rate + i / n) % 1;
    const side = sides === 2 ? (i % 2 ? -1 : 1) : dir;
    const pu = u * (sides === 2 ? side : 1) + side * spread * ph;
    const pv = v + rise * Math.pow(ph, 0.8);
    const r = size * (0.35 + ph);
    out.push({ c: V.p([pu, pv]), r: K.r2(r * V.k), o: K.r2(1 - ph) });
  }
  return out;
}

// ---------------------------------------------------------------- the hob, an adjacent part (phantom)
export function hob(V) {
  return K.line(V, K.rect(-150, -6, 150, 0), "phan", true);
}
