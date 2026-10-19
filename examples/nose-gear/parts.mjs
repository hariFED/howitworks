// The nose gear's parts, in world mm. Side section A-A: (u, v), u forward-negative (the nose points
// left), v up, the strut axis at u = 0, the axle centre at v = 0 with the strut fully extended.
// Plan section E-E: (u, y), y toward the aircraft's right (up on the sheet). Front section B-B: (y, v)
// about the axle centre, in the wheel's own frame. Developed view D: (s, v), s = arc length on Ø2·R_CAM.
// Each function draws one part into a view and returns SVG, so the main view and the details draw the
// same geometry at their own scale. Everything below the outer cylinder is drawn fully extended
// (c = 0) and moved by the page with a transform; the torque links, the snubber ring and the fluids
// are redrawn per frame.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const both = (V, pts, opts) => K.cut(V, pts, opts) + K.cut(V, K.flipU(pts), opts);
const bodyBoth = (V, pts) => K.body(V, pts) + K.body(V, K.flipU(pts));
const rad = Math.PI / 180;

// A cut face with holes (evenodd): hatched round the holes, which stay open.
export function cutHoles(V, outer, holes, { mat = "steel", angle = 45 } = {}) {
  const dd = K.d(V, outer) + holes.map((h) => K.d(V, h)).join("");
  if (mat === "solid") return `<path class="solid" fill-rule="evenodd" d="${dd}"/>`;
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path fill="url(#h-${mat}-${angle})" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
}
export const ring = (V, c, r0, r1, opts) => cutHoles(V, K.circle(c[0], c[1], r1, 72), [K.circle(c[0], c[1], r0, 72)], opts);
const disc = (V, c, r, cls = "solid") => `<path class="${cls}" d="${K.d(V, K.circle(c[0], c[1], r, 24))}"/>`;
const bodyHoles = (V, outer, holes) => {
  const dd = K.d(V, outer) + holes.map((h) => K.d(V, h)).join("");
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
};
// a round-ended bar from a to b (a link, a lug), half-width w, end radius re
export function bar([ax, ay], [bx, by], w, re = w) {
  const a = Math.atan2(by - ay, bx - ax);
  const n = [-Math.sin(a), Math.cos(a)];
  const pts = [];
  const cap = (cx, cy, from) => {
    for (let i = 0; i <= 12; i++) {
      const t = from - (Math.PI * i) / 12;
      pts.push([cx + re * Math.cos(t), cy + re * Math.sin(t)]);
    }
  };
  pts.push([ax + n[0] * w, ay + n[1] * w], [bx + n[0] * w, by + n[1] * w]);
  cap(bx, by, a + Math.PI / 2); // round the far end, left side to right side
  pts.push([bx - n[0] * w, by - n[1] * w], [ax - n[0] * w, ay - n[1] * w]);
  cap(ax, ay, a - Math.PI / 2); // and the near end
  return pts;
}

// ================================================================ SIDE SECTION A-A (u, v)

// 1 OUTER CYLINDER Ø76.2×4.75, threaded inside at both ends
export function outerCylinder(V) {
  const loop = [[M.OUTER_ID / 2, M.OUTER_BOT], [M.OUTER_OD / 2, M.OUTER_BOT], [M.OUTER_OD / 2, M.OUTER_TOP], [M.OUTER_ID / 2, M.OUTER_TOP]];
  const roots = [[[-34.3, M.OUTER_BOT], [-34.3, 497]], [[34.3, M.OUTER_BOT], [34.3, 497]], [[-34.3, M.CAP_BOT], [-34.3, M.OUTER_TOP]], [[34.3, M.CAP_BOT], [34.3, M.OUTER_TOP]]];
  return part(1, K.section(V, { ...K.revolve(loop), edges: [] }, { mat: "steel", angle: 45 }) + K.lines(V, roots, "thin"));
}

// 2 TOP FITTING: spigot screwed into the cylinder, flange, trunnion lug; the air passage to the valve
export function topFitting(V) {
  const a = [
    [-31.5, M.CAP_BOT], [-15, M.CAP_BOT], [-15, 885], [-2.5, 885], [-2.5, 906.5], [30, 906.5], [30, 909], [44, 909], [44, 918], [22, 918], [22, 950],
    ...K.arc(0, 950, 22, 0, 180, 12).slice(1, -1), [-22, 950], [-22, 918], [-44, 918], [-44, 890], [-33.3, 890], [-33.3, 882], [-30.5, 882], [-30.5, 876], [-33.3, 876], [-33.3, 872],
  ];
  const b = [[15, M.CAP_BOT], [31.5, M.CAP_BOT], [33.3, 872], [33.3, 876], [30.5, 876], [30.5, 882], [33.3, 882], [33.3, 890], [44, 890], [44, 899], [30, 899], [30, 901.5], [2.5, 901.5], [2.5, 885], [15, 885]];
  const o = { mat: "alu", angle: 135 };
  return part(2, cutHoles(V, a, [K.circle(0, 940, 6.6, 36)], o) + K.cut(V, b, o) + K.lines(V, [[[-16, M.CAP_BOT], [-16, 885]], [[16, M.CAP_BOT], [16, 885]]], "thin"));
}

// 3 AIR FILLER VALVE (high-pressure type), screwed into the fitting's aft face
export function airValve(V) {
  const top = [[30.5, 905.5], [30.5, 908.6], [44, 908.6], [44, 912], [56, 912], [56, 908], [66, 908], [66, 905.5]];
  const bot = top.map(([u, v]) => [u, 2 * 904 - v]).reverse();
  return part(3, K.cut(V, top, { mat: "brass", angle: 45 }) + K.cut(V, bot, { mat: "brass", angle: 45 }) + K.body(V, [[34, 902.6], [64, 902.6], [64, 905.4], [34, 905.4]]) + K.body(V, K.rrect(66, 899.5, 73, 908.5, 1)));
}

// 4 GLAND NUT: the lower bearing, with the piston seal, a static O-ring and the wiper
export const GLAND = [
  [25.6, M.GLAND_BOT], [44, M.GLAND_BOT], [44, M.OUTER_BOT], [M.OUTER_ID / 2, M.OUTER_BOT], [M.OUTER_ID / 2, 497], [31, 497], [31, 502], [M.OUTER_ID / 2, 502], [M.OUTER_ID / 2, M.GLAND_TOP],
  [25.6, M.GLAND_TOP], [25.6, 496], [29.6, 496], [29.6, 488], [25.6, 488], [25.6, 467], [28.5, 467], [28.5, 461], [25.6, 461],
];
export function gland(V) {
  return part(4, K.section(V, { ...K.revolve(GLAND), edges: [] }, { mat: "bronze", angle: 135 }) + K.lines(V, [[[-34.3, M.OUTER_BOT], [-34.3, 497]], [[34.3, M.OUTER_BOT], [34.3, 497]]], "thin"));
}

// 14 O-RING PACKINGS: piston seal and backup ring in the gland, gland static ring, spigot ring
export function seals(V) {
  const o = (u, v, r) => K.cut(V, K.circle(u, v, r, 16), { mat: "solid" });
  const backup = K.rect(25.6, 494.6, 29.6, 495.9);
  let s = "";
  for (const sg of [-1, 1]) s += o(sg * 27.4, 491.6, 1.75) + o(sg * 32.15, 499.5, 1.15) + o(sg * 31.9, 879, 1.35);
  return part(14, s + both(V, backup, { mat: "solid" }));
}
// 15 WIPER RING, in the gland's lowest groove
export function wiper(V) {
  return part(15, both(V, [[25.45, 461], [28.5, 461], [28.5, 467], [26.4, 467], [25.45, 464.2]], { mat: "rubber", angle: 45 }));
}

// 5 CENTERING CAM, FIXED: a ring on the gland nut, a V notch fore and aft (the section plane is
// through both). Beyond the plane the notch's flanks rise to the ring's top.
export function fixedCam(V) {
  const nb = M.CAM_TOP - M.CAM_DEPTH;
  const cutF = K.rect(25.9, M.CAM_BOT, 33.3, nb);
  const flank = (sg) => [[sg * 33.3, nb], [sg * 33.3 * Math.cos(M.CAM_HALF * rad), M.CAM_TOP], [sg * 25.9, M.CAM_TOP]];
  return part(5, both(V, cutF, { mat: "steel", angle: 30 }) + K.line(V, flank(-1)) + K.line(V, flank(1)));
}

// 6 CENTERING CAM, MOVING: a ring pinned on the piston tube, its V teeth hanging into the notches
export function movingCam(V) {
  const nb = M.CAM_TOP - M.CAM_DEPTH;
  return part(6, both(V, [[25.45, M.MCAM_BOT], [25.9, M.MCAM_BOT], [25.9, nb], [33.2, nb], [33.2, M.MCAM_TOP], [25.45, M.MCAM_TOP]], { mat: "steel", angle: 135 }));
}

// 7 SNUBBER RING: floats in the cavity under the head; lifted (shut) it covers the head's ports
export const snubberV = (shut) => (shut ? M.SNUB_TOP - M.SNUB_T : M.SNUB_BOT);
export function snubber(V, shut = false) {
  const v = snubberV(shut);
  return part(7, both(V, K.rect(27.5, v, 31.5, v + M.SNUB_T), { mat: "solid" }));
}

// 8 PISTON HEAD: the upper bearing, screwed on the tube; the orifice tube passes through it
export function head(V) {
  const loop = [[15.5, M.TUBE_TOP], [25.45, M.TUBE_TOP], [25.45, M.HEAD_BOT], [33.2, M.HEAD_BOT], [33.2, M.HEAD_TOP - 1], [32.2, M.HEAD_TOP], [15.5, M.HEAD_TOP]];
  return part(8, K.section(V, { ...K.revolve(loop), edges: [] }, { mat: "alu", angle: 45 }) + K.lines(V, [[[-24.6, M.HEAD_BOT], [-24.6, M.TUBE_TOP]], [[24.6, M.HEAD_BOT], [24.6, M.TUBE_TOP]]], "thin"));
}

// 9 PISTON TUBE Ø50.8×3.2, hard chromed
export function pistonTube(V) {
  return part(9, both(V, K.rect(22.225, M.PISTON_BOT, 25.4, M.TUBE_TOP), { mat: "steel", angle: 135 }));
}

// 10 LOWER PLUG, welded in the tube's end; the metering pin screws into it
export function plug(V) {
  const loop = [[0, M.PLUG_BOT], [22.2, M.PLUG_BOT], [22.2, M.PLUG_TOP], [4, M.PLUG_TOP], [4, M.PLUG_TOP - 10], [0, M.PLUG_TOP - 10]];
  return part(10, K.section(V, K.revolve(loop), { mat: "steel", angle: 45 }));
}

// 11 METERING PIN: a shank, then a taper from Ø6.3 down to Ø3 at the tip (not hatched: a pin)
export function pinProfile() {
  const t = M.PIN_TIP;
  const z1 = t - M.PIN_LEN;
  return [[4, M.PLUG_TOP - 10], [4, z1 - 4], [M.PIN_D1 / 2, z1], [M.PIN_D0 / 2, t - 0.6], [M.PIN_D0 / 2 - 0.6, t]];
}
export function pin(V) {
  const p = pinProfile();
  const pts = [...p, ...p.map(([r, v]) => [-r, v]).reverse()];
  return part(11, K.body(V, pts) + K.lines(V, [[[-3.3, M.PLUG_TOP - 9.5], [-3.3, M.PLUG_TOP]], [[3.3, M.PLUG_TOP - 9.5], [3.3, M.PLUG_TOP]]], "thin"));
}

// 12 ORIFICE TUBE Ø30×3, hanging from the fitting; vent holes near its top
export function orificeTube(V, top = 885) {
  const lo = K.rect(12, M.PLATE_TOP, 15, M.VENT - 3);
  const hi = K.rect(12, M.VENT + 3, 15, top);
  return part(12, both(V, lo, { mat: "alu", angle: 60 }) + (top > M.VENT + 3 ? both(V, hi, { mat: "alu", angle: 60 }) : ""));
}
// 13 ORIFICE PLATE with the Ø7.5 metering orifice
export function plate(V) {
  return part(13, both(V, [[M.D_ORIFICE / 2, M.PLATE_BOT], [15, M.PLATE_BOT], [15, M.PLATE_TOP], [M.D_ORIFICE / 2 + 0.8, M.PLATE_TOP], [M.D_ORIFICE / 2, M.PLATE_TOP - 0.8]], { mat: "bronze", angle: 45 }));
}

// 16 FORK: crown boss round the tube, the torque-link lug forward; the far leg beyond the plane
export const LUG_BOT = [M.LINK_BOT0[0], M.LINK_BOT0[1]];
export function forkLegBeyond(V) {
  return part(16, K.body(V, [[-34, M.CROWN_BOT], [34, M.CROWN_BOT], [24, 18], [-24, 18]]) + K.line(V, K.circle(0, 0, 24, 48), "vis", true));
}
export function forkCrown(V) {
  const [lu, lv] = LUG_BOT;
  const lugPts = [[-36, lv - 12], [lu, lv - 12]];
  for (let i = 1; i < 12; i++) {
    const a = (-90 - (180 * i) / 12) * rad;
    lugPts.push([lu + 12 * Math.cos(a), lv + 12 * Math.sin(a)]);
  }
  lugPts.push([lu, lv + 12], [-36, lv + 12]);
  const boss = [[25.4, M.CROWN_BOT], [36, M.CROWN_BOT], [36, M.CROWN_TOP], [25.4, M.CROWN_TOP]];
  const o = { mat: "alu", angle: 135 };
  return part(16, cutHoles(V, lugPts, [K.circle(lu, lv, 4.1, 20)], o) + both(V, boss, o));
}
// 17 FORK BOLT, fore and aft through crown, tube and plug (cut lengthwise: not hatched)
export function forkBolt(V) {
  const v = M.BOLT_V;
  const shank = [[-36, v - 6.35], [44, v - 6.35], [44, v + 6.35], [-36, v + 6.35]];
  return part(17, K.body(V, shank) + K.body(V, K.rect(-45, v - 10, -36, v + 10)) + K.body(V, [[36, v - 10.5], [45, v - 10.5], [45, v + 10.5], [36, v + 10.5]]) + K.lines(V, [[[38.5, v - 10.5], [38.5, v + 10.5]], [[42.5, v - 10.5], [42.5, v + 10.5]], [[45, v - 5.4], [49, v - 5.4]], [[45, v + 5.4], [49, v + 5.4]]], "thin") + K.body(V, K.rect(45, v - 5.4, 49, v + 5.4)));
}

// 18 STEERING COLLAR: turns on the cylinder; forward lug for the torque links (the horns are out of
// the plane, on either side; they show in E-E)
export function collar(V) {
  const [lu, lv] = M.LINK_TOP;
  const lugPts = [[-47, lv - 10], [lu, lv - 10]];
  for (let i = 1; i < 12; i++) {
    const a = (-90 - (180 * i) / 12) * rad;
    lugPts.push([lu + 10 * Math.cos(a), lv + 10 * Math.sin(a)]);
  }
  lugPts.push([lu, lv + 10], [-47, lv + 10]);
  const o = { mat: "alu", angle: 135 };
  return part(18, both(V, K.rect(38.2, M.COLLAR_BOT, 47, M.COLLAR_TOP), o) + cutHoles(V, lugPts, [K.circle(lu, lv, 4.1, 20)], o));
}

// 19, 20 TORQUE LINKS and 21 their bolts, posed for stroke c (redrawn per frame)
export function links(V, c) {
  const top = M.LINK_TOP;
  const bot = [M.LINK_BOT0[0], M.LINK_BOT0[1] + c];
  const k = M.knee(c);
  const hole = (p) => K.circle(p[0], p[1], 4.1, 20);
  const up = part(19, cutHoles(V, bar(top, k, 7, 10), [hole(top), hole(k)], { mat: "alu", angle: 45 }));
  const lo = part(20, cutHoles(V, bar(k, bot, 6, 9), [hole(k), hole(bot)], { mat: "alu", angle: 135 }));
  const bolts = part(21, [top, k, bot].map((p) => disc(V, p, 4)).join(""));
  return up + lo + bolts;
}
// the torque-link fold at stroke c (for the main view's phantom of full compression)
export function linksPhantom(V, c) {
  const top = M.LINK_TOP;
  const bot = [M.LINK_BOT0[0], M.LINK_BOT0[1] + c];
  const k = M.knee(c);
  return K.line(V, bar(top, k, 7, 10), "phan", true) + K.line(V, bar(k, bot, 6, 9), "phan", true);
}

// 22 SHIMMY DAMPER (beyond the plane, at the right horn) and 23 its bracket
export const DAMPER = { eye: -178, body0: -165, body1: -48, rod: 4, r: 14 };
export function damperSide(V) {
  const v = M.HORN_V;
  const D = DAMPER;
  return part(22, K.body(V, K.rect(D.body1, v - D.rod, -38, v + D.rod)) + K.body(V, K.rrect(D.body0, v - D.r, D.body1, v + D.r, 2)) + bodyHoles(V, K.circle(D.eye, v, 8, 24), [K.circle(D.eye, v, 3.5, 16)]) + K.body(V, K.rect(D.eye + 7, v - 5, D.body0, v + 5)));
}
export function bracketSide(V) {
  const v = M.HORN_V;
  const arm = [[-46, 555], [-46, 530], [-150, 523], [DAMPER.eye - 2, 521], [DAMPER.eye - 12, 516], [DAMPER.eye - 12, 506], [-150, 540], [-60, 555]];
  return part(23, K.body(V, arm) + both(V, K.rect(38.2, 530, 46, 555), { mat: "steel", angle: 60 }) + K.centerMark(V, [DAMPER.eye, v], 4, 2));
}
// 24 BUNGEE CARTRIDGE (the right one, beyond the plane), from the horn aft to the pedals
export function bungeeSide(V) {
  const v = M.HORN_V;
  return part(24, K.body(V, K.rect(40, v - 5, 72, v + 5)) + K.body(V, K.rrect(72, v - 16, 212, v + 16, 2)) + K.body(V, K.rect(212, v - 5, 300, v + 5)) + K.lines(V, [[[80, v - 16], [80, v + 16]], [[204, v - 16], [204, v + 16]]], "thin"));
}

// 25 AXLE, its spacer and through-bolt; 26 WHEEL (web at the split line, tie bolts); 28 TYRE AND TUBE:
// cut on the wheel's mid-plane, so they show as rings round the axle
export function wheelSide(V) {
  const c0 = [0, 0];
  const ties = [90, 210, 330].map((a) => [42 * Math.cos(a * rad), 42 * Math.sin(a * rad)]);
  const web = cutHoles(V, K.circle(0, 0, 63.5, 96), [K.circle(0, 0, 21, 48), ...ties.map((p) => K.circle(p[0], p[1], 4, 16))], { mat: "alu", angle: 45 });
  return (
    part(25, ring(V, c0, 5.6, 12.7, { mat: "steel", angle: 135 }) + ring(V, c0, 12.75, 16, { mat: "solid" }) + K.cut(V, K.circle(0, 0, 5.55, 24), { mat: "steel", angle: 45 })) +
    part(26, web + ties.map((p) => disc(V, p, 3.9)).join("") + K.centerMark(V, [0, 0], 30, 3)) +
    part(28, ring(V, c0, 63.5, 65.2, { mat: "solid" }) + ring(V, c0, 162.4, 164.1, { mat: "solid" }) + ring(V, c0, 164.2, M.TYRE_R, { mat: "rubber", angle: 45 }))
  );
}
// the air in the tyre (muted stipple), drawn under the rings
export const tyreAir = (V) => K.d(V, K.circle(0, 0, 162.4, 96)) + K.d(V, K.circle(0, 0, 65.2, 48));

// 29 ENGINE MOUNT (beyond: lug plate round the trunnion, two legs aft to the firewall) and 30 CLAMP
export function mountSide(V) {
  const plate = [[-34, 922], [44, 922], [44, 962], [-20, 962], [-34, 950]];
  const tube = (a, b, r) => {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const n = [-Math.sin(ang) * r, Math.cos(ang) * r];
    return [[a[0] + n[0], a[1] + n[1]], [b[0] + n[0], b[1] + n[1]], [b[0] - n[0], b[1] - n[1]], [a[0] - n[0], a[1] - n[1]]];
  };
  const up = tube([44, 942], [330, 958], 11);
  const lo = tube([72, 702], [330, 905], 11);
  return part(29, K.body(V, plate) + K.body(V, up) + K.body(V, lo) + K.cut(V, K.circle(0, 940, 6.35, 24), { mat: "steel", angle: 30 })) + K.breakLine(V, [330, 942], [330, 974]) + K.breakLine(V, [330, 890], [330, 920]);
}
export function clampSide(V) {
  const ear = [[44, 690], [70, 690], ...K.arc(70, 702.5, 12.5, -90, 90, 8).slice(1, -1), [70, 715], [44, 715]];
  const o = { mat: "steel", angle: 135 };
  return part(30, both(V, K.rect(38.2, 690, 44, 715), o) + cutHoles(V, ear, [K.circle(70, 702.5, 4, 16)], o) + disc(V, [70, 702.5], 3.9));
}

// Everything that moves with the piston tube, drawn at c = 0.
export function strutMoving(V, { shut = false } = {}) {
  return (
    forkLegBeyond(V) +
    `<path class="paper" d="${tyreAir(V)}" fill-rule="evenodd"/><path class="tint air" d="${tyreAir(V)}" fill-rule="evenodd"/>` +
    wheelSide(V) +
    pistonTube(V) +
    plug(V) +
    pin(V) +
    forkCrown(V) +
    forkBolt(V) +
    movingCam(V) +
    `<g class="snub">${snubber(V, shut)}</g>` +
    head(V)
  );
}

// ---------------------------------------------------------------- fluids (side view)
// "above": the oil on the air side of the orifice (the cylinder, the orifice tube, the recoil annulus)
// "below": the oil in the piston tube under the orifice plate, at the higher pressure
export const oilAbove = (c) => [K.rect(-M.OUTER_ID / 2, M.CAM_TOP - M.CAM_DEPTH, M.OUTER_ID / 2, M.oilTop(c))];
export const oilBelow = (c) => [K.rect(-22.2, M.PLUG_TOP + c, 22.2, M.PLATE_BOT)];
export const airShape = (c) => [K.rect(-M.OUTER_ID / 2, M.oilTop(c), M.OUTER_ID / 2, M.CAP_BOT), K.rect(-12, M.CAP_BOT - 1, 12, 885)];
export const fluidPath = (V, shapes) => shapes.map((s) => K.d(V, s)).join("");

// The oil's path through the orifice at stroke c: up past the pin in compression, down in rebound.
export function flowPath(c, dir) {
  const x = M.D_ORIFICE / 2 - 0.9;
  const pts = [[x + 6, M.PLATE_BOT - 24], [x + 1.2, M.PLATE_BOT - 8], [x, M.PLATE_BOT - 1], [x, M.PLATE_TOP + 1], [x + 1.2, M.PLATE_TOP + 10], [x + 4, M.PLATE_TOP + 26]];
  return dir > 0 ? pts : pts.slice().reverse();
}

// ================================================================ DEVELOPED VIEW D (s, v)
export const R_CAM = 29.6; // mean radius of the cam faces
export const S_HALF = R_CAM * M.CAM_HALF * rad; // the notch's half-width at its top, as arc length
export function camFixedDev(V, span = 70) {
  const nb = M.CAM_TOP - M.CAM_DEPTH;
  const pts = [[-span, M.CAM_BOT], [span, M.CAM_BOT], [span, M.CAM_TOP], [S_HALF, M.CAM_TOP], [0, nb], [-S_HALF, M.CAM_TOP], [-span, M.CAM_TOP]];
  return part(5, K.body(V, pts)) + part(4, K.body(V, K.rect(-span, M.GLAND_TOP - 12, span, M.GLAND_TOP)));
}
// the moving cam, its snubber ring and the head, at stroke c and steering ψ (degrees): drawn at the
// rest pose and moved by the page (translate by s = R_CAM·ψ, v = c)
export function camMovingDev(V, span = 110) {
  const nb = M.CAM_TOP - M.CAM_DEPTH;
  const b = M.MCAM_BOT;
  const pts = [[-span, b], [-S_HALF, b], [0, nb], [S_HALF, b], [span, b], [span, M.MCAM_TOP], [-span, M.MCAM_TOP]];
  return part(6, K.body(V, pts)) + part(8, K.body(V, K.rect(-span, M.HEAD_BOT, span, M.HEAD_TOP)));
}

// ================================================================ PLAN SECTION E-E (u, y) at v = HORN_V
// Below the plane (seen): tyre, fork crown, torque links, all turning with ψ. In the plane (cut): the
// cylinder, cam, tube, pin, collar with horns (turning), the shimmy damper and the two bungees.
export function tyrePlan(V) {
  const L = M.TYRE_R;
  const W = M.TYRE_W / 2;
  const pts = [];
  // a tyre seen from above: straight sides, rounded shoulders front and back
  for (let i = 0; i <= 16; i++) {
    const a = (-90 + (180 * i) / 16) * rad;
    pts.push([L - 30 + 30 * Math.cos(a) * 1, W * Math.sin(a)]);
  }
  for (let i = 0; i <= 16; i++) {
    const a = (90 + (180 * i) / 16) * rad;
    pts.push([-(L - 30) + 30 * Math.cos(a), W * Math.sin(a)]);
  }
  return part(28, K.body(V, pts) + K.lines(V, [[[-(L - 8), -W + 18], [L - 8, -W + 18]], [[-(L - 8), W - 18], [L - 8, W - 18]]], "thin"));
}
export function forkPlan(V) {
  return part(16, K.body(V, K.rrect(-32, -92, 32, 92, 8)) + K.body(V, K.rect(-24, -92, 24, -74)) + K.body(V, K.rect(-24, 74, 24, 92)));
}
export function linksPlan(V, c) {
  const k = M.knee(c);
  return part(19, K.body(V, bar([M.LINK_TOP[0], 0], [k[0], 0], 9, 10))) + part(21, K.centerMark(V, [k[0], 0], 5, 2));
}
export function collarOutline(R0 = 47, w = 12, reach = M.HORN_R, re = 12) {
  const a0 = Math.acos(w / R0) / rad;
  const pts = [];
  const arcC = (from, to) => {
    const n = Math.max(2, Math.ceil(Math.abs(to - from) / 4));
    for (let i = 0; i <= n; i++) {
      const a = (from + ((to - from) * i) / n) * rad;
      pts.push([R0 * Math.cos(a), R0 * Math.sin(a)]);
    }
  };
  const horn = (sg) => {
    pts.push([sg * w, sg * reach]);
    for (let i = 1; i < 12; i++) {
      const a = ((sg > 0 ? 0 : 180) + (180 * i) / 12) * rad;
      pts.push([re * Math.cos(a), sg * reach + re * Math.sin(a)]);
    }
    pts.push([-sg * w, sg * reach]);
  };
  // CCW from the +y horn's aft root: horn, forward side, −y horn, aft side
  pts.push([w, R0 * Math.sin(a0 * rad)]);
  horn(1);
  arcC(180 - a0, 180 + a0);
  horn(-1);
  arcC(360 - a0, 360 + a0);
  pts.pop();
  return pts;
}
export function collarPlan(V) {
  const o = { mat: "alu", angle: 135 };
  const holes = [K.circle(0, 0, 38.2, 72), K.circle(0, -M.HORN_R, 4.1, 16), K.circle(0, M.HORN_R, 4.1, 16)];
  return part(18, cutHoles(V, collarOutline(), holes, o) + disc(V, [0, -M.HORN_R], 4) + disc(V, [0, M.HORN_R], 4));
}
export function strutPlan(V) {
  return (
    part(1, ring(V, [0, 0], M.OUTER_ID / 2, M.OUTER_OD / 2, { mat: "steel", angle: 45 })) +
    part(5, ring(V, [0, 0], 25.9, 33.3, { mat: "steel", angle: 30 })) +
    part(9, ring(V, [0, 0], 22.225, 25.4, { mat: "steel", angle: 135 }))
  );
}
// the shimmy damper cut along its axis at y = +HORN_R: body fixed, the rod follows the horn (xh)
export function damperPlan(V, xh = 0) {
  const y = M.HORN_R;
  const D = DAMPER;
  const wall = (sg) => K.cut(V, K.rect(D.body0 + 8, y + sg * (D.r - 1.6), D.body1, y + sg * D.r), { mat: "solid" });
  const ends = K.cut(V, K.rect(D.body0, y - D.r, D.body0 + 8, y + D.r), { mat: "steel", angle: 45 }) + K.cut(V, K.rect(D.body1 - 6, y - D.r, D.body1, y - D.rod - 0.3), { mat: "steel", angle: 45 }) + K.cut(V, K.rect(D.body1 - 6, y + D.rod + 0.3, D.body1, y + D.r), { mat: "steel", angle: 45 });
  const eye = cutHoles(V, K.circle(D.eye, y, 8, 24), [K.circle(D.eye, y, 4.1, 16)], { mat: "steel", angle: 45 }) + K.body(V, K.rect(D.eye + 7.5, y - 5, D.body0, y + 5)) + disc(V, [D.eye, y], 4);
  const p = -110 + xh; // piston centre
  const rod = K.body(V, [[p - 4, y - D.rod], [xh - 8, y - D.rod], [xh - 8, y + D.rod], [p - 4, y + D.rod]]) + K.body(V, K.rect(p - 5, y - D.r + 1.7, p + 5, y + D.r - 1.7));
  const rodEye = bodyHoles(V, K.circle(xh, y, 8, 24), [K.circle(xh, y, 4.1, 16)]);
  return part(22, wall(-1) + wall(1) + ends + eye + rod + rodEye);
}
export const damperOil = (V, xh = 0) => K.d(V, K.rect(DAMPER.body0 + 8, M.HORN_R - DAMPER.r + 1.6, DAMPER.body1 - 6, M.HORN_R + DAMPER.r - 1.6));
// a bungee cut along its axis at y = sg·HORN_R: tube with the horn (xh), plunger with the pedal (xp)
export function bungeePlan(V, sg, xh = 0, xp = 0) {
  const y = sg * M.HORN_R;
  const t0 = 72 + xh;
  const t1 = 212 + xh;
  const wall = (s) => K.cut(V, K.rect(t0 + 6, y + s * 14.4, t1 - 6, y + s * 16), { mat: "solid" });
  const caps = K.cut(V, K.rect(t0, y - 16, t0 + 6, y + 16), { mat: "steel", angle: 45 }) + K.cut(V, K.rect(t1 - 6, y - 16, t1, y - 5.3), { mat: "steel", angle: 45 }) + K.cut(V, K.rect(t1 - 6, y + 5.3, t1, y + 16), { mat: "steel", angle: 45 });
  const fwdRod = K.body(V, K.rect(xh + 7, y - 5, t0, y + 5)) + bodyHoles(V, K.circle(xh, y, 8, 24), [K.circle(xh, y, 4.1, 16)]);
  const pc = 142 + xp; // plunger disc centre
  const plunger = K.body(V, K.rect(pc - 3, y - 13.6, pc + 3, y + 13.6)) + K.body(V, K.rect(pc + 3, y - 5, 300, y + 5));
  const springA = K.springSection(V, { from: t0 + 6, to: pc - 3, radius: 10.5, wire: 2.6, turns: 6, axis: "u", at: y });
  const springB = K.springSection(V, { from: pc + 3, to: t1 - 6, radius: 10.5, wire: 2.6, turns: 6, axis: "u", at: y });
  return part(24, wall(-1) + wall(1) + caps + fwdRod + plunger + springA + springB) + K.breakLine(V, [300, y - 9], [300, y + 9]);
}

// ================================================================ FRONT SECTION B-B (y, v), wheel frame
// Half-profiles (y ≥ 0) of the wheel half, the bearing and the tyre; the page mirrors them.
export const WHEEL_HALF = [
  [0, 21], [20, 21], [20, 25.15], [44, 25.15], [44, 32], [8, 32], [8, 60], [42, 60], [45, 62], [45, 70], [49, 74], [52, 74], [52, 68], [48.5, 63.5], [0, 63.5],
];
export function wheelFront(V, ties = true) {
  const o = { mat: "alu", angle: 45 };
  const tie = K.body(V, K.rect(-14, 42 - 3.97, 14, 42 + 3.97)) + K.body(V, K.rect(-20, 42 - 6.5, -14, 42 + 6.5)) + K.body(V, K.rect(14, 42 - 6.5, 20, 42 + 6.5));
  const half = (pts) => cutHoles(V, pts, [], o);
  // the tie bolt runs through both webs at r 42: leave its hole in each web
  const right = WHEEL_HALF.map(([y, r]) => [y, r]);
  return part(26, half(right) + half(K.flipU(right)) + (ties ? tie : "") + K.line(V, [[0, 21], [0, 63.5]], "vis"));
}
export function bearingsFront(V) {
  let s = "";
  for (const sg of [-1, 1]) {
    const f = (pts) => pts.map(([y, r]) => [sg * y, r]);
    const cone = f([[20.5, 12.75], [40, 12.75], [40, 16.5], [24, 18.5], [20.5, 18.5]]);
    const cup = f([[22, 25.15], [44, 25.15], [44, 21.6], [26, 21.6]]);
    const roller = f([[25, 19.2], [38.5, 17.4], [39, 20.6], [25.5, 22.2]]);
    s += K.cut(V, cone, { mat: "steel", angle: 135 }) + K.cut(V, cup, { mat: "steel", angle: 45 }) + K.body(V, roller);
  }
  return part(27, s);
}
export function axleFront(V) {
  const o = { mat: "steel", angle: 135 };
  const wall = (sg) => K.cut(V, K.rect(-96, sg * 5.6, 96, sg * 12.7), o);
  const spacer = (sg) => K.cut(V, K.rect(-20.3, sg * 12.75, 20.3, sg * 16), { mat: "solid" });
  const sleeves = (sg) => K.cut(V, K.rect(sg * 44.2, 12.75, sg * 73.8, 18), { mat: "steel", angle: 45 }) + K.cut(V, K.rect(sg * 44.2, -18, sg * 73.8, -12.75), { mat: "steel", angle: 45 });
  const bolt = K.body(V, K.rect(-104, -5.55, 106, 5.55)) + K.body(V, K.rect(-112, -10, -104, 10)) + K.body(V, K.rect(98, -10.5, 106, 10.5)) + K.body(V, K.rect(106, -5.5, 110, 5.5));
  return part(25, wall(1) + wall(-1) + spacer(1) + spacer(-1) + [1, -1].map(sleeves).join("") + bolt);
}
// the fork legs, cut; each a boss round the axle
export function forkFront(V, top = 190) {
  const o = { mat: "alu", angle: 135 };
  const leg = (sg) => {
    const a = [[74, 12.75], [96, 12.75], [96, 24], [90, top], [74, top], [74, 24]].map(([y, v]) => [sg * y, v]);
    const b = [[74, -12.75], [96, -12.75], [96, -26], [88, -36], [76, -36], [74, -26]].map(([y, v]) => [sg * y, v]);
    return K.cut(V, a, o) + K.cut(V, b, o);
  };
  return part(16, leg(1) + leg(-1));
}
// the tyre's section: its shell over the crown from bead to bead, the inner tube inside it
export function tyreShell(a, b, cv, from = 66, n = 40) {
  const pts = [];
  const t0 = Math.acos(Math.max(-1, Math.min(1, (from - cv) / b)));
  for (let i = 0; i <= n; i++) {
    const t = -t0 + (2 * t0 * i) / n;
    pts.push([a * Math.sin(t), cv + b * Math.cos(t)]);
  }
  return pts; // from the left bead over the crown to the right
}
// the tyre's section (y, r): heel on the rim flange, up the outside over the crown, back inside
export function tyreProfile(n = 40) {
  const outer = tyreShell(M.TYRE_W / 2, M.TYRE_R - 110, 110, 75, n);
  const inner = tyreShell(M.TYRE_W / 2 - 7, M.TYRE_R - 110 - 11, 110, 66, n);
  return [[-34, 63.5], [-48.6, 63.5], [-52.2, 68], [-52.2, 74.4], ...outer, [52.2, 74.4], [52.2, 68], [48.6, 63.5], [34, 63.5], ...inner.slice().reverse()];
}
export function tyreFront(V) {
  const fix = tyreProfile();
  const tube = [...tyreShell(M.TYRE_W / 2 - 7.2, M.TYRE_R - 110 - 11.2, 110, 66), [27, 65.4], [-27, 65.4]];
  const tubeIn = [...tyreShell(M.TYRE_W / 2 - 8.9, M.TYRE_R - 110 - 12.9, 110, 67), [25.8, 67.1], [-25.8, 67.1]];
  return part(28, `<path class="tint air" d="${K.d(V, tubeIn)}"/>` + K.cut(V, [...fix], { mat: "rubber", angle: 45 }) + cutHoles(V, tube, [tubeIn], { mat: "solid" }) + disc(V, [-40, 67.5], 2.4) + disc(V, [40, 67.5], 2.4));
}
