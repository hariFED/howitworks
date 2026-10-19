// The gyro instruments' parts, in world mm. Each function draws one part into a view and returns SVG.
// Frames:
//   AI  section A-A, on the gyro's centre across the aircraft, looking forward: (u starboard, v up),
//       origin on the gyro's centre (the roll and pitch axes cross there). The gyro assembly is drawn
//       upright and turned as a whole about the origin by the gimbal's roll in the case.
//   L   the vane unit's aft face in the rotor housing's own frame (same axes as AI, housing upright).
//   HI  section C-C, a plan on the spin axis, looking down: (u starboard, v forward), origin on the
//       vertical gimbal axis. The gyro is drawn in its gimbal frame (a along the spin axis, b across)
//       and turned about the origin by the gimbal's angle in the case.
//   TC  section D-D, square to the canted gimbal axis, looking forward and down along it: (u starboard,
//       w up in that plane), origin on the gimbal axis; the gimbal turns about it.
//   PUMP section B-B across the rotor, looking forward: (u, v) with the rotor (drive) axis at the
//       origin and the liner's bore centred e above it.
//   REG section F-F on the regulator's axis: (u, v), origin on the seat.
//   FIL section H-H on the filter's axis: (u, v), origin on the element's centre.
import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const rad = Math.PI / 180;
// rotate world points CCW by a degrees about c
export const rot = (pts, a, c = [0, 0]) => {
  const ca = Math.cos(a * rad);
  const sa = Math.sin(a * rad);
  return pts.map(([u, v]) => [c[0] + (u - c[0]) * ca - (v - c[1]) * sa, c[1] + (u - c[0]) * sa + (v - c[1]) * ca]);
};
export const rotPt = (p, a, c) => rot([p], a, c)[0];
export const annulus = (r0, r1, a0, a1, n) => [...K.arc(0, 0, r1, a0, a1, n), ...K.arc(0, 0, r0, a1, a0, n)];
export const ellipse = (rx, ry, n = 64, c = [0, 0]) => Array.from({ length: n }, (_, i) => [c[0] + rx * Math.cos((2 * Math.PI * i) / n), c[1] + ry * Math.sin((2 * Math.PI * i) / n)]);
export function cutHoles(V, outer, holes, { mat = "steel", angle = 45 } = {}) {
  const dd = K.d(V, outer) + holes.map((h) => K.d(V, h)).join("");
  if (mat === "solid") return `<path class="solid" fill-rule="evenodd" d="${dd}"/>`;
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path fill="url(#h-${mat}-${angle})" fill-rule="evenodd" d="${dd}"/><path class="vis" fill-rule="evenodd" d="${dd}"/>`;
}
export const bodyHoles = (V, outer, holes) => {
  const dd = K.d(V, outer) + holes.map((h) => K.d(V, h)).join("");
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
};
const disc = (V, c, r, cls = "solid", n = 20) => `<path class="${cls}" d="${K.d(V, K.circle(c[0], c[1], r, n))}"/>`;
const tint = (V, polys, id = "", op = 0.6) => `<path${id ? ` id="${id}"` : ""} class="tint" fill-rule="evenodd" fill-opacity="${op}" d="${polys.map((p) => K.d(V, p)).join("")}"/>`;
// a revolved section about an axis turned to angle a (deg, CCW from +u), centred at c
function revolveAt(V, loop, a, c, opts, { axis = "v" } = {}) {
  const rev = K.revolve(loop, { axis, at: 0 });
  const tf = (pts) => rot(pts, a).map(([u, v]) => [u + c[0], v + c[1]]);
  return rev.cuts.map((p) => K.cut(V, tf(p), opts)).join("") + rev.edges.map((e) => K.line(V, tf(e))).join("");
}
// a coil spring between two world points, cut along its axis (wire sections black, back halves thin)
export function coil(V, a, b, { radius, wire, turns }) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const pitch = (L - wire) / turns;
  const place = (s, r) => rotPt([s, r], ang, [0, 0]).map((x, i) => x + a[i]);
  let secs = "";
  const back = [];
  for (let i = 0; i <= turns; i++) {
    const s = wire / 2 + i * pitch;
    secs += K.cut(V, K.circle(...place(s, radius), wire / 2, 10), { mat: "solid" });
    if (i < turns) {
      secs += K.cut(V, K.circle(...place(s + pitch / 2, -radius), wire / 2, 10), { mat: "solid" });
      back.push([place(s, radius), place(s + pitch / 2, -radius)]);
    }
  }
  return K.lines(V, back, "vis spring") + secs;
}

// ---------------------------------------------------------------- the instrument case (12), shared
export const CASE = { r0: 38, r1: 40, bezel: 82.5 / 2 };
export const caseRing = (V) => K.cut(V, annulus(CASE.r0, CASE.r1, 0, 359.99, 96), { mat: "alu", angle: 135 });

// ================================================================ ATTITUDE INDICATOR (section A-A)
// rotor housing (14), the inner gimbal: a can round the rotor with its bearing bosses, the pitch pivots
// (hollow on the right: the air comes in through it) and the vane unit below
export const AIH = { rin: 23.5, rout: 25, top: 13, cav: 11.5, boss: 17, pin: 1.5, pinOut: 29.2 };
export const VU = { half: 10, wall: 1.5, top: -13, bot: -22, floor: 1.5, slot: [-15.2, -18.2] }; // vane unit block
const housingTop = [[2.05, AIH.cav], [2.05, AIH.boss], [5, AIH.boss], [5, AIH.top], [AIH.rout, AIH.top], [AIH.rout, -AIH.top], [9.5, -AIH.top], [9.5, -AIH.cav], [AIH.rin, -AIH.cav], [AIH.rin, AIH.cav]];
const housingFloor = [[2.05, -AIH.cav], [7, -AIH.cav], [7, -AIH.top], [5, -AIH.top], [5, -AIH.boss], [2.05, -AIH.boss]];
export function aiRotor(V, c = [0, 0], a = 0) {
  return part(13, revolveAt(V, M.AI_ROTOR, a, c, { mat: "brass", angle: 45 }));
}
// the vane unit block, cut through its middle: side walls with the two side slots, a floor
function vaneBlock() {
  const { half, wall, top, bot, floor, slot } = VU;
  const L = (sg) => {
    const u0 = sg * (half - wall);
    const u1 = sg * half;
    const lo = sg > 0 ? [u0, u1] : [u1, u0];
    return [K.rect(lo[0], slot[0], lo[1], top), K.rect(lo[0], bot + floor, lo[1], slot[1])];
  };
  return [...L(-1), ...L(1), K.rect(-half, bot, half, bot + floor)];
}
export function aiHousing(V) {
  const o = { mat: "alu", angle: 45 };
  const rev = K.revolve(housingTop, { axis: "v" });
  const rev2 = K.revolve(housingFloor, { axis: "v" });
  let s = rev.cuts.map((p) => K.cut(V, p, o)).join("") + rev2.cuts.map((p) => K.cut(V, p, o)).join("");
  s += rev.edges.map((e) => K.line(V, e)).join("");
  // the pitch pivots: pins (not hatched), the right one drilled for the air
  for (const sg of [-1, 1]) s += K.body(V, sg < 0 ? K.rect(-AIH.pinOut, -AIH.pin, -AIH.rout, AIH.pin) : K.rect(AIH.rout, -AIH.pin, AIH.pinOut, AIH.pin));
  s += K.line(V, [[AIH.rout, -0.5], [AIH.pinOut, -0.5]], "hid") + K.line(V, [[AIH.rout, 0.5], [AIH.pinOut, 0.5]], "hid");
  // the vane unit block under the housing (part of it), with the two side vanes seen edge-on
  for (const p of vaneBlock()) s += K.cut(V, p, { mat: "alu", angle: 135 });
  return part(14, s);
}
export function aiAir(V, id = "ai-air") {
  // the air in the housing round the rotor, in the vane unit and in the pivot's drilling
  const cav = [[AIH.rin, AIH.cav], [-AIH.rin, AIH.cav], [-AIH.rin, -AIH.cav], [AIH.rin, -AIH.cav]];
  const rotor = [...M.AI_ROTOR.map(([r, s]) => [r, s]), ...M.AI_ROTOR.slice().reverse().map(([r, s]) => [-r, s])];
  const unit = K.rect(-(VU.half - VU.wall), VU.bot + VU.floor, VU.half - VU.wall, VU.top);
  const boss = K.rect(-5, -AIH.boss, 5, VU.top);
  return tint(V, [cav, rotor], id) + tint(V, [unit, boss], id + "-u") + tint(V, [K.rect(AIH.rout, -0.5, AIH.pinOut, 0.5)], id + "-p");
}
// outer (roll) gimbal (15): its two side members in the plane, with the pitch bearings
export const AIG = { u0: 29.4, u1: 32.4, h: 17 };
export function aiGimbal(V) {
  const o = { mat: "alu", angle: 30 };
  let s = "";
  for (const sg of [-1, 1]) {
    const a = sg * AIG.u0;
    const b = sg * AIG.u1;
    const [l, r] = sg < 0 ? [b, a] : [a, b];
    s += K.cut(V, K.rect(l, AIH.pin + 0.05, r, AIG.h), o) + K.cut(V, K.rect(l, -AIG.h, r, -AIH.pin - 0.05), o);
    s += K.line(V, [[l, AIH.pin + 0.05], [r, AIH.pin + 0.05]], "thin") + K.line(V, [[l, -AIH.pin - 0.05], [r, -AIH.pin - 0.05]], "thin");
  }
  // the members join fore and aft of the plane (beyond it, seen): their top and bottom edges
  s += K.line(V, [[-AIG.u1, AIG.h], [AIG.u1, AIG.h]], "hid") + K.line(V, [[-AIG.u1, -AIG.h], [AIG.u1, -AIG.h]], "hid");
  // the air comes in along the roll pivot and down the right member's drilling
  s += K.line(V, [[AIG.u0 + 1, 1.6], [AIG.u0 + 1, AIG.h - 1]], "hid") + K.line(V, [[AIG.u1 - 1, 1.6], [AIG.u1 - 1, AIG.h - 1]], "hid");
  return part(15, s);
}
// pendulous vanes (16): the two side vanes edge-on in A-A (they swing in pitch, across the plane)
export function aiSideVanes(V) {
  let s = "";
  for (const sg of [-1, 1]) {
    const u = sg * (VU.half + 0.45);
    s += K.cut(V, K.rect(u - 0.3, VU.top - 9.5, u + 0.3, VU.top - 0.6), { mat: "solid" });
    s += disc(V, [sg * (VU.half + 0.45), VU.top - 1.4], 0.75, "paper") + K.line(V, K.circle(sg * (VU.half + 0.45), VU.top - 1.4, 0.75, 10), "vis", true);
  }
  return part(16, s);
}
export const aiCentres = (V) => K.centerline(V, [0, -27], [0, 21], 0) + K.centerline(V, [-34, 0], [34, 0], 0);

// ================================================================ DETAIL L: the aft vane, in the housing's frame
export const VANE_PIVOT = [-2, -14.2];
export const VANE_SLOT = { u: 0, v0: -21, v1: -19, half: M.VANE.slotHalf };
VANE_SLOT.v = (VANE_SLOT.v0 + VANE_SLOT.v1) / 2;
export const vaneShape = () => K.rect(-4.2, VANE_PIVOT[1] - 7.6, 0, VANE_PIVOT[1] + 0.9);
export function blockFace(V) {
  // the vane unit's aft face, in view (not cut): its outline, the slot and the housing's floor above
  const face = K.rect(-VU.half, VU.bot, VU.half, VU.top);
  const slot = K.rect(-VANE_SLOT.half, VANE_SLOT.v0, VANE_SLOT.half, VANE_SLOT.v1);
  return part(14, bodyHoles(V, face, [slot]) + K.body(V, K.rect(-AIH.rout, VU.top, AIH.rout, VU.top + 2)) + K.line(V, K.rect(-VANE_SLOT.half, VANE_SLOT.v0, VANE_SLOT.half, VANE_SLOT.v1), "vis", true));
}
// the vane hangs plumb along the apparent vertical: a, its swing from the housing's own vertical (deg)
export function vane(V, a) {
  const pts = rot(vaneShape(), a, VANE_PIVOT);
  return part(16, K.cut(V, pts, { mat: "alu", angle: 60 }) + disc(V, VANE_PIVOT, 0.55, "paper", 16) + K.line(V, K.circle(VANE_PIVOT[0], VANE_PIVOT[1], 0.55, 16), "vis", true));
}
// how much of the slot the vane leaves open: the jet that leaves it
export function slotOpen(a) {
  const edge = VANE_PIVOT[0] + 2 + (VANE_SLOT.v - VANE_PIVOT[1]) * -Math.sin(a * rad); // knife edge at slot height
  return Math.max(-VANE_SLOT.half, Math.min(VANE_SLOT.half, edge));
}

// ================================================================ HEADING INDICATOR (section C-C, plan)
export const HIH = { rin: 22.5, rout: 24, len: 10.5, wall: 1.5, pinOut: 28.2, pin: 1.5 };
export const HIG = { b0: 28.4, b1: 31.4, t: 3 }; // vertical gimbal ring, where the plane cuts it
export const HIC = { face: -40, glass: -49, bezel: -52, back: 56, knobU: -26, knobV0: -62, knobV1: -52 };
export const CROWN = { r0: 27, r1: 31.4 }; // the vertical gimbal's crown gear (below the plane)
// the gyro in its gimbal frame (a along the spin axis, b across): drawn at angle g (deg CCW)
const hiHousingLoop = [[2.05, HIH.len - 1.5], [2.05, HIH.len + 4], [5, HIH.len + 4], [5, HIH.len], [HIH.rout, HIH.len], [HIH.rout, -HIH.len], [5, -HIH.len], [5, -HIH.len - 4], [2.05, -HIH.len - 4], [2.05, -HIH.len + 1.5], [HIH.rin, -HIH.len + 1.5], [HIH.rin, HIH.len - 1.5]];
export function hiRotor(V, g = 0) {
  return part(18, revolveAt(V, M.HI_ROTOR, g, [0, 0], { mat: "brass", angle: 135 }, { axis: "u" }));
}
export function hiHousing(V, g = 0) {
  let s = revolveAt(V, hiHousingLoop, g, [0, 0], { mat: "alu", angle: 45 }, { axis: "u" });
  for (const sg of [-1, 1]) s += K.body(V, rot(K.rect(-HIH.pin, sg < 0 ? -HIH.pinOut : HIH.rout, HIH.pin, sg < 0 ? -HIH.rout : HIH.pinOut), g));
  return part(19, s);
}
export function hiGimbal(V, g = 0) {
  let s = "";
  for (const sg of [-1, 1]) {
    const [b0, b1] = sg < 0 ? [-HIG.b1, -HIG.b0] : [HIG.b0, HIG.b1];
    s += K.cut(V, rot(K.rect(-HIG.t, b0, -HIH.pin - 0.05, b1), g), { mat: "alu", angle: 30 }) + K.cut(V, rot(K.rect(HIH.pin + 0.05, b0, HIG.t, b1), g), { mat: "alu", angle: 30 });
  }
  // the crown gear on the ring's lower end, below the plane and seen: its rim and teeth circles
  s += K.line(V, K.circle(0, 0, CROWN.r1, 96), "vis", true) + K.line(V, K.circle(0, 0, CROWN.r0, 96), "thin", true);
  // the air jet on the ring, aimed at the rotor's buckets (its nozzle seen beyond the plane)
  s += K.line(V, rot([[-HIG.t, HIG.b0 - 0.6], [-HIG.t - 3, HIH.rout + 0.4]], g), "vis");
  return part(20, s);
}
export function hiAir(V, g = 0, id = "hi-air") {
  const cav = K.rect(-HIH.len + 1.5, -HIH.rin, HIH.len - 1.5, HIH.rin);
  const rotor = [...M.HI_ROTOR.map(([r, s]) => [s, r]), ...M.HI_ROTOR.slice().reverse().map(([r, s]) => [s, -r])];
  return tint(V, [rot(cav, g), rot(rotor, g)], id);
}
// the case in plan: side walls, front flange, bezel, glass, the dial plate and the card edge-on
export function hiCase(V) {
  const o = { mat: "alu", angle: 135 };
  const { face, glass, bezel, back } = HIC;
  let s = "";
  for (const sg of [-1, 1]) {
    const [u0, u1] = sg < 0 ? [-CASE.r1, -CASE.r0] : [CASE.r0, CASE.r1];
    s += K.cut(V, K.rect(u0, face - 3, u1, back), o);
    // bezel, square 82.5, clamping the glass
    const [b0, b1] = sg < 0 ? [-CASE.bezel, -CASE.r0 + 1] : [CASE.r0 - 1, CASE.bezel];
    s += K.cut(V, K.rect(b0, bezel, b1, face - 3), o);
  }
  // the glass (a thin section)
  s += K.cut(V, K.rect(-CASE.r0 + 1, glass - 1.4, CASE.r0 - 1, glass), { mat: "solid" });
  return s;
}
// compass card (21): the dial disc edge-on behind the glass, its shaft and bevel pinion (below the plane, seen)
export function hiCard(V) {
  let s = K.cut(V, K.rect(-34, HIC.face - 0.5, 34, HIC.face + 0.5), { mat: "solid" });
  s += K.body(V, K.rect(-1.5, HIC.face + 0.5, 1.5, -CROWN.r1 - 3.2)) + K.body(V, [[-4.5, -CROWN.r1 - 3.2], [4.5, -CROWN.r1 - 3.2], [3, -CROWN.r1 + 0.6], [-3, -CROWN.r1 + 0.6]]);
  return part(21, s);
}
// heading-set knob (22): knob, shaft through the bezel, and the gear that meets the crown when pushed in
export const KNOB_GEAR_V = -Math.sqrt(CROWN.r1 ** 2 - HIC.knobU ** 2) - 0.3;
export function hiKnob(V, push = 0) {
  const u = HIC.knobU;
  const dv = push * 2.5;
  let s = K.body(V, K.rrect(u - 6, HIC.knobV0 + dv, u + 6, HIC.knobV1 + dv, 1.5));
  for (let i = 1; i < 6; i++) s += K.line(V, [[u - 6 + i * 2, HIC.knobV0 + dv], [u - 6 + i * 2, HIC.knobV0 + dv + 3]], "thin");
  s += K.body(V, K.rect(u - 1.5, HIC.knobV1 + dv, u + 1.5, KNOB_GEAR_V - 3.2 + dv));
  s += K.body(V, K.rect(u - 3.5, KNOB_GEAR_V - 3.2 + dv, u + 3.5, KNOB_GEAR_V - 0.5 + dv));
  return part(22, s);
}
export const hiCentres = (V, g = 0) => K.centerline(V, rot([[-27, 0]], g)[0], rot([[27, 0]], g)[0], 0) + K.centerline(V, rot([[0, -34]], g)[0], rot([[0, 34]], g)[0], 0);

// ================================================================ TURN COORDINATOR (section D-D)
export const TCG = { arm: [17.4, 19.4], spindle: 2, top: 15, bot: -15, armL: [-15.4, -13.4] };
export const TC_SPRING = { pin: [0, 21], anchors: [[-22, 26.5], [22, 26.5]] };
export const TC_DAMP = { r0: 27, r1: 33, wall: 1.6, a: 50, post: 25.5 }; // a rotary air dashpot under the gimbal
export const tcCaseOutline = (r) => ellipse(r, r / Math.cos(M.CANT * rad), 96);
export function tcCase(V) {
  return cutHoles(V, tcCaseOutline(CASE.r1), [tcCaseOutline(CASE.r0)], { mat: "alu", angle: 135 });
}
// the motor's rotor bell on its bearings, the stator and windings inside it (23)
export function tcMotor(V) {
  const o = { mat: "steel", angle: 45 };
  let s = revolveAt(V, M.TC_ROTOR, 0, [0, 0], o, { axis: "u" });
  // stator: laminated core on the spindle with its windings (copper)
  for (const sg of [-1, 1]) {
    const core = K.rect(-2.5, sg < 0 ? -13.6 : 2.05, 6.5, sg < 0 ? -2.05 : 13.6);
    s += K.cut(V, core, { mat: "iron", angle: 135 });
    s += K.cut(V, K.rect(-2, sg < 0 ? -10.8 : 6.2, 6, sg < 0 ? -6.2 : 10.8), { mat: "bronze", angle: 60 });
  }
  return part(23, s);
}
// the gimbal (24): a yoke of two arms joined beyond the plane, the fixed spindle, the spring and damper pins
export function tcGimbal(V) {
  const o = { mat: "alu", angle: 30 };
  const [a0, a1] = TCG.arm;
  const [l0, l1] = TCG.armL;
  let s = K.cut(V, K.rect(a0, TCG.bot, a1, TCG.top), o) + K.cut(V, K.rect(l0 - 2.2, TCG.bot, l0, TCG.top), o);
  // spindle (not hatched): through the left arm's bore, the bearings and the stator, into the right arm
  s += K.body(V, K.rect(l0 - 2.2, -TCG.spindle, a1, TCG.spindle));
  // the cross members fore and aft (beyond), and the posts up to the spring pin and down to the damper's
  s += K.line(V, [[l0 - 2.2, TCG.top], [a1, TCG.top]], "hid") + K.line(V, [[l0 - 2.2, TCG.bot], [a1, TCG.bot]], "hid");
  s += K.body(V, K.rect(-1.2, TCG.top, 1.2, TC_SPRING.pin[1])) + K.body(V, K.rect(-1.2, -TC_DAMP.post + 0.6, 1.2, TCG.bot));
  s += disc(V, TC_SPRING.pin, 1.6, "paper", 16) + K.line(V, K.circle(...TC_SPRING.pin, 1.6, 16), "vis", true);
  return part(24, s);
}
// the centring springs (25) from the gimbal's pin to two lugs on the case: d is the gimbal's deflection
export function tcSprings(V, d) {
  const pin = rotPt(TC_SPRING.pin, -d, [0, 0]);
  let s = "";
  for (const a of TC_SPRING.anchors) {
    s += coil(V, [a[0] + (pin[0] - a[0]) * 0.12, a[1] + (pin[1] - a[1]) * 0.12], [pin[0] + (a[0] - pin[0]) * 0.1, pin[1] + (a[1] - pin[1]) * 0.1], { radius: 2.4, wire: 0.8, turns: 6 });
    s += K.line(V, [a, [a[0] + (pin[0] - a[0]) * 0.12, a[1] + (pin[1] - a[1]) * 0.12]], "vis") + K.line(V, [pin, [pin[0] + (a[0] - pin[0]) * 0.1, pin[1] + (a[1] - pin[1]) * 0.1]], "vis");
  }
  return part(25, s);
}
export function tcLugs(V) {
  let s = "";
  for (const a of TC_SPRING.anchors) s += K.cut(V, K.rect(a[0] - 2, a[1] - 1.4, a[0] + 2, a[1] + 8), { mat: "alu", angle: 135 });
  return s;
}
// damper (26): a rotary air dashpot fixed to the case under the gimbal: an arc-shaped chamber, closed
// at both ends, and a paddle on the gimbal's lower post that must push the air round its edges
const polar = (r, a) => [r * Math.cos(a * rad), r * Math.sin(a * rad)];
export function tcDamper(V) {
  const { r0, r1, wall, a } = TC_DAMP;
  const o = { mat: "brass", angle: 45 };
  let s = K.cut(V, annulus(r1, r1 + wall, -90 - a - 3, -90 + a + 3, 36), o);
  for (const sg of [-1, 1]) {
    const th = -90 + sg * (a + 1.5);
    const t = [Math.cos((th + 90) * rad), Math.sin((th + 90) * rad)];
    const p = (r, w) => { const q = polar(r, th); return [q[0] + t[0] * w, q[1] + t[1] * w]; };
    s += K.cut(V, [p(r0, -1.5), p(r1 + 0.01, -1.5), p(r1 + 0.01, 1.5), p(r0, 1.5)], o);
  }
  return part(26, s);
}
// the paddle rides on the gimbal (drawn in its frame)
export function tcPaddle(V) {
  const { r1 } = TC_DAMP;
  return part(26, K.cut(V, K.rect(-1.2, -r1 + 0.4, 1.2, -TC_DAMP.post + 0.6), { mat: "alu", angle: 135 }));
}
export function tcAir(V, id = "tc-air") {
  const { r0, r1, a } = TC_DAMP;
  return tint(V, [annulus(r0, r1, -90 - a, -90 + a, 36)], id, 0.35);
}

// ================================================================ THE PUMP (section B-B)
const P_ = M.PUMP;
export const BORE_C = [0, P_.e]; // the liner's bore centre, above the drive axis
export const PH = { r: 45, liner: 31, port: [3, 18], boss: 60, bossH: [0, 21] };
// port windows through the liner (deg about the bore centre): inlet on the right, outlet on the left
export const WIN = { in: [0, 38], out: [142, 180] };
export function rotorOutline() {
  // the rotor's rim with six radial slots, in its own frame (slot k at k·60°)
  const R = P_.Rr;
  const w = (P_.t + 0.1) / 2;
  const d = R - P_.slot;
  const out = [];
  for (let k = 0; k < P_.z; k++) {
    const a = (k * 360) / P_.z;
    const half = (Math.asin(w / R) * 180) / Math.PI;
    const next = ((k + 1) * 360) / P_.z;
    // into the slot (left side), across its bottom, out (right side)… then the rim to the next slot
    out.push(...rot([[R, w], [d, w], [d, -w], [R, -w]].reverse(), a));
    out.push(...K.arc(0, 0, R, a + half, next - half, 8).slice(1, -1));
  }
  return out;
}
export const spline = (r0, r1, n = 6) => {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k * 360) / n;
    pts.push(...K.arc(0, 0, r1, a - 14, a + 14, 3), ...K.arc(0, 0, r0, a + 20, a + 360 / n - 20, 3));
  }
  return pts;
};
export const SPLINE = { r0: 5.6, r1: 7.2 };
export function pumpRotor(V) {
  return part(3, cutHoles(V, rotorOutline(), [spline(SPLINE.r0 + 0.05, SPLINE.r1 + 0.05)], { mat: "iron", angle: 45 }));
}
export function pumpShaft(V) {
  return part(5, K.cut(V, spline(SPLINE.r0, SPLINE.r1), { mat: "steel", angle: 135 }) + disc(V, [0, 0], 1.6, "paper", 12) + K.line(V, K.circle(0, 0, 1.6, 12), "vis", true));
}
// one vane at rotor angle th (deg, CCW, measured like the rotor): it slides out to the bore
export function vanePts(th, broken = false) {
  const a = th * rad;
  const reach = M.boreReach(a - Math.PI / 2) - 0.03; // the bore is centred above (+v): its line of centres is 90°
  const r1 = reach;
  const r0 = reach - (broken ? P_.vane * 0.45 : P_.vane);
  const w = P_.t / 2;
  return rot([[r0, -w], [r1, -w], [r1, w], [r0, w]], th);
}
export function pumpVanes(V, th, broken = -1) {
  let s = "";
  for (let k = 0; k < P_.z; k++) s += K.cut(V, vanePts(th + (k * 360) / P_.z, k === broken), { mat: "iron", angle: 135 });
  return part(4, s);
}
export const linerSeg = (a0, a1) => annulus(P_.Rb, PH.liner, a0, a1, Math.ceil((a1 - a0) / 4)).map(([u, v]) => [u + BORE_C[0], v + BORE_C[1]]);
export function pumpLiner(V) {
  const seg = linerSeg;
  return part(2, K.cut(V, seg(WIN.in[1], WIN.out[0]), { mat: "steel", angle: 135 }) + K.cut(V, seg(WIN.out[1], 360 + WIN.in[0]), { mat: "steel", angle: 135 }));
}
// housing (1): round body round the liner, two port bosses with their passages
// a port passage from the liner's outside (traced along it) out to the boss's face
export function passage(sg, R = PH.liner + 0.02, end = PH.boss + 0.01) {
  const c = BORE_C;
  const [p0, p1] = PH.port;
  const a0 = (Math.asin(p0 / R) * 180) / Math.PI;
  const a1 = (Math.asin(p1 / R) * 180) / Math.PI;
  const pts = [...K.arc(c[0], c[1], R, a1, a0, 8), [end, c[1] + p0], [end, c[1] + p1]];
  return sg > 0 ? pts : K.flipU(pts);
}
export function pumpHousing(V) {
  const c = BORE_C;
  const pas = (sg) => passage(sg);
  // outline: the round body plus the two bosses
  const out = [];
  const bossTop = c[1] + PH.bossH[1];
  const bossBot = c[1] + PH.bossH[0] - 1;
  const aT = (Math.asin((bossTop - c[1]) / PH.r) * 180) / Math.PI;
  const aB = (Math.asin((bossBot - c[1]) / PH.r) * 180) / Math.PI;
  out.push([PH.boss, bossBot], [PH.boss, bossTop]);
  out.push(...K.arc(c[0], c[1], PH.r, aT, 180 - aT, 48));
  out.push([-PH.boss, bossTop], [-PH.boss, bossBot]);
  out.push(...K.arc(c[0], c[1], PH.r, 180 - aB, 360 + aB, 64));
  const holes = [K.circle(c[0], c[1], PH.liner + 0.02, 96), pas(1), pas(-1)];
  // four through-bolt holes for the end plates
  for (const a of [45, 135, 225, 315]) holes.push(K.circle(c[0] + 38 * Math.cos(a * rad), c[1] + 38 * Math.sin(a * rad), 2.6, 16));
  if (!V) return { out, holes };
  let s = cutHoles(V, out, holes, { mat: "alu", angle: 60 });
  // the through-bolts (not hatched)
  for (const a of [45, 135, 225, 315]) s += K.body(V, K.circle(c[0] + 38 * Math.cos(a * rad), c[1] + 38 * Math.sin(a * rad), 2.5, 16));
  return part(1, s);
}
export const pumpChambers = (V, id = "pump-air") =>
  `<path id="${id}" class="tint" fill-rule="evenodd" d="${K.d(V, K.circle(BORE_C[0], BORE_C[1], P_.Rb, 96)) + K.d(V, K.circle(0, 0, P_.Rr, 96))}"/>` +
  tint(V, [passage(1, P_.Rb, PH.boss + 10)], id + "-in") +
  tint(V, [passage(-1, P_.Rb, PH.boss + 10)], id + "-out");
// the hose fittings in the bosses (part of 10, the lines): barbed nipples, the hose broken off
export function pumpFittings(V) {
  const c = BORE_C[1];
  const [p0, p1] = PH.port;
  const mid = c + (p0 + p1) / 2;
  let s = "";
  for (const sg of [-1, 1]) {
    const x0 = sg * PH.boss;
    const x1 = sg * (PH.boss + 10);
    const [l, r] = sg < 0 ? [x1, x0] : [x0, x1];
    s += cutHoles(V, K.rect(l, mid - 7.5, r, mid + 7.5), [K.rect(l - 0.01, mid - 4.5, r + 0.01, mid + 4.5)], { mat: "brass", angle: 45 });
  }
  return s;
}

// ================================================================ THE REGULATOR (section F-F)
export const RG = { r: 12, bot: -20, ch: [-16, -2], chR: 8.5, seat: M.REG.seat / 2, top: 4, cap: 12, port: [-12.5, -7.5], stub: 22 };
export function regBody(V) {
  const o = { mat: "alu", angle: 45 };
  const { r, bot, ch, chR, seat, top, cap, port } = RG;
  let s = "";
  for (const sg of [-1, 1]) {
    const f = (pts) => (sg > 0 ? pts : K.flipU(pts));
    // the wall: below the port, above it up to the seat lip and the top
    s += K.cut(V, f([[chR, bot + 4], [r, bot + 4], [r, port[0]], [chR, port[0]]]), o);
    s += K.cut(V, f([[seat, ch[1]], [chR, ch[1]], [chR, port[1]], [r, port[1]], [r, top], [seat, top]]), o);
    // the cap over the top: its wall with the ambient windows, and its roof
    s += K.cut(V, f([[r - 1.5, top], [r, top], [r, top + 1.5], [r - 1.5, top + 1.5]]), o) + K.cut(V, f([[r - 1.5, top + 5], [r, top + 5], [r, cap], [r - 1.5, cap]]), o);
    // the threaded bottom wall round the adjusting screw
    s += K.cut(V, f([[3.05, bot], [r, bot], [r, bot + 4], [3.05, bot + 4]]), o);
  }
  s += K.cut(V, K.rect(-r, cap - 1.5, r, cap), o);
  // the filter screen (foam ring) under the cap
  for (const sg of [-1, 1]) s += K.cut(V, sg > 0 ? K.rect(4.2, top + 0.4, r - 1.6, cap - 1.6) : K.rect(-r + 1.6, top + 0.4, -4.2, cap - 1.6), { mat: "foam", angle: 45 });
  // the adjusting screw (not hatched) and its lock nut
  s += K.body(V, K.rect(-3, bot - 3, 3, -15)) + K.line(V, [[-2.4, bot - 3], [-2.4, -15]], "thin") + K.line(V, [[2.4, bot - 3], [2.4, -15]], "thin");
  s += K.body(V, K.rect(-6, bot - 3, 6, bot)) + K.line(V, [[-1, bot - 3], [-1, bot - 1.6]], "vis");
  return part(6, s);
}
export function regFittings(V) {
  let s = "";
  const mid = (RG.port[0] + RG.port[1]) / 2;
  for (const sg of [-1, 1]) {
    const [l, r] = sg < 0 ? [-RG.stub, -RG.r] : [RG.r, RG.stub];
    s += cutHoles(V, K.rect(l, mid - 3.4, r, mid + 3.4), [K.rect(l - 0.01, mid - 2.3, r + 0.01, mid + 2.3)], { mat: "brass", angle: 135 });
  }
  return s;
}
// poppet (7) at lift x (mm): a disc held up against the seat's underside, a stem in the spring
export const poppetTop = (x) => RG.ch[1] - x;
export function regPoppet(V, x) {
  const t = poppetTop(x);
  return part(7, K.cut(V, K.rect(-6, t - 1.6, 6, t), { mat: "brass", angle: 135 }) + K.body(V, K.rect(-1.4, t - 9, 1.4, t - 1.6)));
}
export function regSpring(V, x) {
  const t = poppetTop(x) - 1.6;
  return part(8, coil(V, [0, -15], [0, t], { radius: 3.6, wire: 0.7, turns: 5 }));
}
export function regAir(V, x, id = "reg-air") {
  const t = poppetTop(x);
  const ch = K.rect(-RG.chR, RG.ch[0], RG.chR, RG.ch[1]);
  const pop = K.rect(-6, t - 1.6, 6, t);
  const mid = (RG.port[0] + RG.port[1]) / 2;
  const pts = [ch, pop, K.rect(-RG.stub, mid - 2.3, -RG.chR, mid + 2.3), K.rect(RG.chR, mid - 2.3, RG.stub, mid + 2.3)];
  return `<path id="${id}" class="tint" fill-rule="evenodd" d="${K.d(V, ch) + K.d(V, pop)}"/>` + tint(V, pts.slice(2), id + "-p");
}

// ================================================================ THE CENTRAL AIR FILTER (section H-H)
export const FL = { r: 38, h: 28, el: [17, 31], cap: 2.5, out: 6 };
export function filter(V) {
  const o = { mat: "plastic", angle: 45 };
  const { r, h, el, cap, out } = FL;
  let s = "";
  for (const sg of [-1, 1]) {
    const f = (pts) => (sg > 0 ? pts : K.flipU(pts));
    // the canister wall and its floor with the outlet; the lid is a screen (air in round its edge)
    s += K.cut(V, f([[out + 2, -h], [r, -h], [r, h - 6], [r - 1.6, h - 6], [r - 1.6, -h + 1.6], [out + 2, -h + 1.6]]), o);
    s += K.cut(V, f([[el[0], h - 1.6], [r - 3, h - 1.6], [r - 3, h], [el[0], h]]), o);
    // the pleated paper element between its two end caps
    s += K.cut(V, f([[el[0], -h + 1.6 + cap], [el[1], -h + 1.6 + cap], [el[1], h - 1.6 - cap], [el[0], h - 1.6 - cap]]), { mat: "wood", angle: 135 });
    s += K.cut(V, f([[el[0] - 1, -h + 1.6], [el[1] + 1, -h + 1.6], [el[1] + 1, -h + 1.6 + cap], [el[0] - 1, -h + 1.6 + cap]]), { mat: "rubber", angle: 45 });
    s += K.cut(V, f([[el[0] - 1, h - 1.6 - cap], [el[1] + 1, h - 1.6 - cap], [el[1] + 1, h - 1.6], [el[0] - 1, h - 1.6]]), { mat: "rubber", angle: 45 });
    // the outlet spigot
    s += K.cut(V, f([[out, -h - 10], [out + 2, -h - 10], [out + 2, -h + 1.6], [out, -h + 1.6]]), o);
  }
  // the lid's centre (solid plate over the element's core)
  s += K.cut(V, K.rect(-el[0], h - 1.6, el[0], h), o);
  return part(9, s);
}
export function filterAir(V, id = "fil-air") {
  const { r, h, el, cap, out } = FL;
  const outer = (sg) => (sg > 0 ? K.rect(el[1] + 1, -h + 1.6, r - 1.6, h - 1.6) : K.rect(-r + 1.6, -h + 1.6, -el[1] - 1, h - 1.6));
  return tint(V, [outer(1), outer(-1)], id + "-o", 0.25) + tint(V, [K.rect(-el[0] + 1, -h + 1.6 + cap, el[0] - 1, h - 1.6 - cap), K.rect(-out, -h - 10, out, -h + 1.6)], id);
}

// a wire section of the left centring spring at gimbal deflection d (for its balloon's dot)
export function tcSpringDot(d) {
  const pin = rotPt(TC_SPRING.pin, -d, [0, 0]);
  const an = TC_SPRING.anchors[0];
  const a = [an[0] + (pin[0] - an[0]) * 0.12, an[1] + (pin[1] - an[1]) * 0.12];
  const b = [pin[0] + (an[0] - pin[0]) * 0.1, pin[1] + (an[1] - pin[1]) * 0.1];
  const Lh = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const s = 0.4 + 3 * ((Lh - 0.8) / 6);
  return rotPt([s, 2.4], ang, [0, 0]).map((x, i) => x + a[i]);
}
