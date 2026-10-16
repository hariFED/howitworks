// The thermostat and its housing, in world mm: u right, v up, the thermostat's axis at u = 0,
// the flange's top face at v = 0. The engine side (hot coolant in) is below, the radiator side above.
// Each function draws one part into a view and returns SVG, so the section and the details draw the
// same geometry at their own scale. The pellet assembly (cup, guide, valve disc, bypass stem) is
// drawn cold, valve shut, and the page moves it down by the lift; the pin is fixed in the bridge.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const both = (V, pts, opts) => K.cut(V, pts, opts) + K.cut(V, K.flipU(pts), opts);
const revCut = (V, loop, opts, o = {}) => K.section(V, { ...K.revolve(loop, o), edges: [] }, opts);

// ---------------------------------------------------------------- key positions (mm)
export const CHAMBER_R = 24;
export const FLOOR = -61;
export const SEAT_V = -2.5; // the seat bead's underside: the valve disc's top, shut
export const PORT_R = M.BYPASS_D / 2;
export const BOSS_V = -59; // the bypass seat, where the bypass disc lands
export const BOTTOM = -72;
export const INLET = [-56, -36]; // engine coolant in, from the head (v range)
export const SENSOR_V = -48;
export const BOLT_U = -36;
export const JIG_U = -23;
export const SPRING_SEAT = -42.5; // the stirrup's top face
export const BP_DISC = -52; // the bypass disc's underside, cold
export const HOSE_END = 61;

// ---------------------------------------------------------------- housing 1, cover 2, seal 3

export function housing(V) {
  const upLeft = [
    [-24, -36], [-24, -3], [-29, -3], [-29, 0], [-33, 0], [-33, -16], [-33.5, -16], [-33.5, -18],
    [-36, -19.5], [-38.5, -18], [-38.5, -16], [-39, -16], [-39, 0], [-43, 0], [-43, -27], [-45, -30], [-48, -30], [-48, -36],
  ];
  const lowLeft = [
    [-48, -56], [-24, -56], [-24, FLOOR], [-13.5, FLOOR], [-13.5, -59.5], [-13, BOSS_V], [-PORT_R, BOSS_V], [-PORT_R, BOTTOM],
    [-40, BOTTOM], [-43, -69], [-43, -65], [-45, -62], [-48, -62],
  ];
  const upRight = [[24, -42], [24, -3], [29, -3], [29, 0], [38, 0], [38, -4], [34, -8], [34, -36], [38, -38], [38, -42]];
  const lowRight = [
    [PORT_R, BOSS_V], [13, BOSS_V], [13.5, -59.5], [13.5, FLOOR], [24, FLOOR], [24, -54], [38, -54], [38, -58], [34, -62],
    [34, -69], [31, BOTTOM], [PORT_R, BOTTOM],
  ];
  // M12×1.5 tapped hole for the sensor: thread roots thin, beyond the sensor's own thread
  const thread = [[[24, -42.6], [38, -42.6]], [[24, -53.4], [38, -53.4]]];
  return part(
    1,
    [upLeft, lowLeft, upRight, lowRight].map((p) => K.cut(V, p, { mat: "alu", angle: 45 })).join("") +
      K.lines(V, thread, "thin") +
      K.breakLine(V, [-48, -63], [-48, -29])
  );
}

export function cover(V) {
  const main = [
    [-26, 0], [-32.7, 0], [-32.7, 8], [-29.5, 8], [-29.5, 33], ...K.arc(-25.5, 33, 4, 180, 90, 4).slice(1, -1), [-25.5, 37],
    [51, 37], [52.5, 38.2], [55, 38.2], [56, 37], [56, 34], [-22, 34], ...K.arc(-22, 30, 4, 90, 180, 4).slice(1, -1), [-26, 30],
  ];
  const right = [[26, 0], [40, 0], [40, 4], [43, 7], [51, 7], [52.5, 5.8], [55, 5.8], [56, 7], [56, 10], [26, 10]];
  const lug = [[-43, 0.6], [-42.4, 0], [-39.3, 0], [-39.3, 8], [-42.4, 8], [-43, 7.4]];
  return part(2, [main, right, lug].map((p) => K.cut(V, p, { mat: "plastic", angle: 135 })).join(""));
}

export function seal(V) {
  return part(3, both(V, [[25.5, -3], [29, -3], [29, 0], [27, 0], [27, -1.5], [25.5, -1.5]], { mat: "rubber" }));
}

// ---------------------------------------------------------------- bolt 4, washer 5 (not cut)

export function bolt(V) {
  const u = BOLT_U;
  const head = [[u - 5, 10.2], [u - 4.4, 9.6], [u + 4.4, 9.6], [u + 5, 10.2], [u + 5, 13], [u + 4.4, 13.6], [u - 4.4, 13.6], [u - 5, 13]];
  const shank = [[u - 3, 9.6], [u + 3, 9.6], [u + 3, -14.8], [u + 2.4, -15.4], [u - 2.4, -15.4], [u - 3, -14.8]];
  const washer = K.rect(u - 6, 8, u + 6, 9.6);
  return (
    part(5, K.body(V, washer)) +
    part(4, K.body(V, shank) + K.body(V, head) + K.lines(V, [[[u - 2.5, -14.9], [u - 2.5, -1]], [[u + 2.5, -14.9], [u + 2.5, -1]], [[u - 1.6, 9.6], [u - 1.6, 13.6]], [[u + 1.6, 9.6], [u + 1.6, 13.6]]], "thin"))
  );
}

// ---------------------------------------------------------------- the thermostat's frame: flange 6, bridge 7, stirrup 15

export function flange(V) {
  const right = [[17, SEAT_V], [18.2, SEAT_V], [18.2, -1.5], [27, -1.5], [27, 0], [17, 0]];
  const h = M.JIGGLE.hole;
  const inner = [[-17, SEAT_V], [-17, 0], [JIG_U + h, 0], [JIG_U + h, -1.5], [-18.2, -1.5], [-18.2, SEAT_V]];
  const outer = [[JIG_U - h, 0], [-27, 0], [-27, -1.5], [JIG_U - h, -1.5]];
  return part(6, [right, inner, outer].map((p) => K.cut(V, p, { mat: "steel", angle: 45 })).join(""));
}

export function bridgePoly() {
  const outer = [[0, 14], [3.6, 14], [5.1, 12.5], [12.9, 12.5], [20.6, 4.8], [20.6, 0]];
  const inner = [[19.1, 0], [19.1, 4.2], [12.3, 11], [4.5, 11], [3, 12.5], [0, 12.5]];
  const right = [...outer, ...inner];
  const left = right.map(([u, v]) => [-u, v]).reverse();
  return [...right, ...left.slice(1, -1)];
}

export function bridge(V) {
  return part(7, K.cut(V, bridgePoly(), { mat: "steel", angle: 135 }));
}

export function stirrup(V) {
  const leg = [[19.4, -1.5], [20.9, -1.5], [20.9, -43], [19.9, -44], [9.5, -44], [9.5, SPRING_SEAT], [19.4, SPRING_SEAT]];
  return part(15, both(V, leg, { mat: "steel", angle: 135 }));
}

// ---------------------------------------------------------------- pin 8 (fixed in the bridge, not cut)

export function pin(V) {
  const e = M.PIN_END;
  const r = M.PIN_D / 2;
  const tip = K.arc(0, e + r, r, 180, 360, 8);
  return part(8, K.body(V, [...tip, [r, 12], [r - 0.5, 12.5], [-r + 0.5, 12.5], [-r, 12]]));
}

// ---------------------------------------------------------------- the pellet assembly, cup frame (drawn cold)

export const guideLoop = [
  [2.6, -1], [4.5, -1], [4.5, -4], [6.5, -4], [6.5, -5.5], [5, -5.5], [5, -16.5], [6.5, -17.5], [7.5, -18.5], [7.5, -21],
  [3.5, -21], [3.5, -19.5], [2.6, -19.5],
];
export const cupLoop = [
  [0, M.CUP.floor], [M.CUP.ri, M.CUP.floor], [M.CUP.ri, M.WAX_TOP], [7.5, M.WAX_TOP], [7.5, -18.5], [6.5, -17.5], [7.2, -16.8],
  [M.CUP.ro, -18.1], [M.CUP.ro, -38], [4, -38], [4, -40], [2.5, -40], [2.5, -37], [0, -37],
];
export const discLoop = [[4.5, SEAT_V], [18.8, SEAT_V], [18.8, -5.5], [17.8, -5.5], [17.8, -4], [4.5, -4]];

export function cup(V) {
  return part(10, revCut(V, cupLoop, { mat: "brass", angle: 135 }));
}
export function guide(V) {
  return part(12, revCut(V, guideLoop, { mat: "brass", angle: 45 }));
}
export function ring(V) {
  return part(24, revCut(V, [[2.5, -21], [3.5, -21], [3.5, -19.5], [2.5, -19.5]], { mat: "plastic", angle: 30 }));
}
export function disc(V) {
  return part(13, revCut(V, discLoop, { mat: "steel", angle: 135 }));
}
export function stem(V) {
  const s = [[-2.5, -37], [2.5, -37], [2.5, BP_DISC], [3.5, BP_DISC], [3.5, -52.6], [3, -53.1], [-3, -53.1], [-3.5, -52.6], [-3.5, BP_DISC], [-2.5, BP_DISC]];
  return part(16, K.body(V, s));
}

// The rigid moving assembly (everything but the wax, sleeve and springs, which change shape).
export const pellet = (V) => cup(V) + guide(V) + ring(V) + disc(V) + stem(V);

// The wax and the rubber sock, cup frame. L is the lift, f the melt fraction.
// The pin's end sits L higher in the cup; below it the wax has pinched the sock shut.
export function sleeveLoop(L) {
  const pe = M.PIN_END + L;
  const r = M.PIN_D / 2;
  const tail = 1 + 0.35 * L;
  const outer = [];
  for (let i = 0; i <= 8; i++) {
    const a = (-Math.PI / 2) * (i / 8);
    outer.push([M.SLEEVE.ro * Math.cos(a), pe + r + (r + tail) * Math.sin(a)]);
  }
  const inner = K.arc(0, pe + r, r, -90, 0, 6); // (0, pe) up to (r, pe + r)
  return [[r, -21], [7.5, -21], [7.5, M.WAX_TOP], [M.SLEEVE.ro, M.WAX_TOP], ...outer, ...inner];
}

export function waxCore(f) {
  const s = Math.sqrt(Math.max(0, 1 - f));
  if (s < 0.04) return null;
  const rs = M.CUP.ri * s;
  const bottom = M.CUP.floor + 6 * (1 - s);
  return K.rrect(-rs, bottom, rs, M.WAX_TOP, Math.min(1.2, rs * 0.5), 3);
}

export function inside(V, L, f) {
  const cavity = K.rect(-M.CUP.ri, M.CUP.floor, M.CUP.ri, M.WAX_TOP);
  const core = waxCore(f);
  const wax = (f > 0.002 ? K.cut(V, cavity, { mat: "foam" }) : "") + (core ? K.cut(V, core, { mat: "plastic", angle: 60 }) : "");
  return part(11, wax) + part(9, K.section(V, { ...K.revolve(sleeveLoop(L)), edges: [] }, { mat: "rubber" }));
}

// ---------------------------------------------------------------- springs 14, 18 and the bypass disc 17 (world)

export function mainSpring(V, L) {
  return part(14, K.springSection(V, { from: SPRING_SEAT, to: SEAT_V - 1.5 - L, radius: 14, wire: 2, turns: 6, axis: "v", at: 0 }));
}

export const bypassDrop = (L) => Math.min(L, M.BYPASS_GAP);

export function bypassSpring(V, L) {
  return part(18, K.springSection(V, { from: BP_DISC + 1.5 - bypassDrop(L), to: -38 - L, radius: 5.5, wire: 0.8, turns: 4, axis: "v", at: 0 }));
}

export function bypassDisc(V) {
  return part(17, revCut(V, [[2.6, BP_DISC], [12.5, BP_DISC], [12.5, BP_DISC + 1.5], [2.6, BP_DISC + 1.5]], { mat: "steel", angle: 45 }));
}

// ---------------------------------------------------------------- jiggle valve 19

export function jigglePin(V) {
  const u = JIG_U;
  const r = M.JIGGLE.pin;
  const p = [
    [u - 2, 0.8], [u + 2, 0.8], [u + 2, 0], [u + r, 0], [u + r, -3.2], [u + 1.8, -3.2], [u + 1.8, -4], [u - 1.8, -4], [u - 1.8, -3.2], [u - r, -3.2], [u - r, 0], [u - 2, 0],
  ];
  return part(19, K.body(V, p));
}

// ---------------------------------------------------------------- sensor 20, sealing ring 21

export function sensor(V) {
  const at = SENSOR_V;
  const body = [
    [2, 16.5], [3, 17.5], [3, 24], [5.9, 24], [5.9, 38], [5, 38], [5, 39.5], [8.5, 39.5], [8.5, 46], [4.5, 46], [4.5, 44], [1.8, 44], [1.8, 18.5], [0, 18.5], [0, 16.5],
  ];
  const plug = [[0, 46], [7, 46], [7, 56], [5.5, 56], [5.5, 49], [0, 49]];
  const pins = [-2.5, 2.5].map((dv) => K.body(V, K.rect(47, at + dv - 0.6, 54.5, at + dv + 0.6))).join("");
  const wires = [[[20.5, at + 0.6], [43, at + 0.6], [45.5, at + 2.5], [47, at + 2.5]], [[20.5, at - 0.6], [43, at - 0.6], [45.5, at - 2.5], [47, at - 2.5]]];
  const thread = [[[24.6, at + 5.2], [37.4, at + 5.2]], [[24.6, at - 5.2], [37.4, at - 5.2]]];
  return part(
    20,
    revCut(V, body, { mat: "brass", angle: 135 }, { axis: "u", at }) +
      revCut(V, plug, { mat: "plastic", angle: 60 }, { axis: "u", at }) +
      K.cut(V, K.rrect(18.5, at - 1.2, 20.8, at + 1.2, 0.8, 2), { mat: "solid" }) +
      K.lines(V, wires, "thin") +
      K.lines(V, thread, "thin") +
      pins
  );
}

export function sensorWasher(V) {
  return part(21, revCut(V, [[6, 38], [8, 38], [8, 39.5], [6, 39.5]], { mat: "bronze", angle: 45 }, { axis: "u", at: SENSOR_V }));
}

// ---------------------------------------------------------------- radiator hose 22, clip 23

export function hose(V) {
  const low = [[43.5, 6.2], [44.3, 2.5], [HOSE_END, 2.5], [HOSE_END, 7], [56, 7], [55, 5.8], [52.5, 5.8], [51, 7], [44.3, 7]];
  const high = [[44.3, 37], [51, 37], [52.5, 38.2], [55, 38.2], [56, 37], [HOSE_END, 37], [HOSE_END, 41.5], [44.3, 41.5], [43.5, 37.8]];
  return part(22, K.cut(V, low, { mat: "rubber" }) + K.cut(V, high, { mat: "rubber" }) + K.breakLine(V, [HOSE_END, 1.5], [HOSE_END, 42.5]));
}

export function clip(V) {
  return part(23, K.cut(V, K.rect(45, 41.5, 51, 42.2), { mat: "solid" }) + K.cut(V, K.rect(45, 1.8, 51, 2.5), { mat: "solid" }));
}

// ---------------------------------------------------------------- coolant (accent), world

export const engineSide = [
  K.rect(-CHAMBER_R, FLOOR, CHAMBER_R, -3),
  K.rect(-25.5, -3.01, 25.5, -1.5),
  K.rect(-48.5, INLET[0], -CHAMBER_R + 0.01, INLET[1]),
  K.rect(-PORT_R, BOSS_V - 2.01, PORT_R, BOSS_V),
];
export const radiatorSide = [
  [[-17, SEAT_V], [17, SEAT_V], [17, 0], [26, 0], [26, 10], [HOSE_END, 10], [HOSE_END, 34], [-22, 34], [-26, 30], [-26, 0], [-17, 0]],
  K.rect(56, 7, HOSE_END, 10.01),
  K.rect(56, 33.99, HOSE_END, 37),
];
export const bypassSide = [K.rect(-PORT_R, BOTTOM, PORT_R, BOSS_V - 2)];
export const airPath = (V, shapes) => shapes.map((s) => K.d(V, s)).join("");

// Flow lines (dashed, the accent, animated by the flow): engine in, out to the radiator and to the bypass.
export const flowRad = [[-48.5, -44], [-30, -44], [-22.5, -38], [-22.5, -9], [-17.6, -4], [-13, 4], [-8, 22], [20, 22], [HOSE_END + 0.5, 22]];
export const flowByp = [[-48.5, -50], [-30, -50], [-18, -55], [-7, -57.5], [-5, -63], [-5, BOTTOM - 0.5]];
export const flowPath = (V, pts) => K.d(V, pts, false);

// ---------------------------------------------------------------- phantom: the pellet assembly at full lift

export function phantomOpen(V) {
  const L = M.LIFT_MAX;
  const outline = (loop, dv) => {
    const pts = loop.map(([r, s]) => [r, s - dv]);
    return K.line(V, [...pts, ...K.flipU(pts)], "phan", true);
  };
  const discOut = [[18.8, SEAT_V], [18.8, -5.5], [17.8, -5.5], [17.8, -4], [6.5, -4], [6.5, -5.5], [5, -5.5], [5, -16.5], [7.2, -16.8], [8.5, -18.1], [8.5, -38], [4, -38], [4, -40], [2.5, -40], [2.5, BP_DISC], [3.5, BP_DISC], [3.5, -53.1]];
  const top = [[4.5, SEAT_V], [4.5, -1], [0, -1]];
  return (
    outline(discOut, L) +
    K.line(V, top.map(([r, s]) => [r, s - L]).concat(top.map(([r, s]) => [-r, s - L]).reverse()), "phan") +
    K.line(V, K.rect(-12.5, BP_DISC - M.BYPASS_GAP, 12.5, BP_DISC - M.BYPASS_GAP + 1.5), "phan", true)
  );
}

// ---------------------------------------------------------------- VIEW C: the thermostat from above, 1:1

export function planView(V) {
  const ring = (r) => K.circle(0, 0, r, 72);
  let out = part(3, K.body(V, ring(29)) + K.line(V, ring(27), "vis", true));
  // the flange, its seat opening and the disc seen through it
  out += part(6, K.body(V, ring(27)) + K.line(V, ring(17), "vis", true));
  out += part(13, K.body(V, ring(17)) + K.line(V, ring(4.5), "vis", true));
  // the bridge strip, 8 wide, welded at both feet, with the pin's dimple
  const w = 4;
  const strip = [[-20.6, -w], [20.6, -w], [20.6, w], [-20.6, w]];
  out += part(7, K.body(V, strip) + K.line(V, K.circle(0, 0, 3.6, 24), "vis", true) + K.lines(V, [[[-19.1, -w], [-19.1, w]], [[19.1, -w], [19.1, w]], [[-12.9, -w], [-12.9, w]], [[12.9, -w], [12.9, w]]], "thin"));
  out += part(19, K.body(V, K.circle(JIG_U, 0, 2, 20)) + K.line(V, K.circle(JIG_U, 0, M.JIGGLE.pin, 12), "thin", true));
  return out;
}
