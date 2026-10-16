// The cistern's solids for its 3D view (token-bucket-3d.html), in the same world mm as parts.mjs:
// u is x (along the cistern), v is y (the inside floor at y = 0), w is -z (into the page), and the
// sheet's cutting plane A-A, through both valve axes, is z = 0. Pure data built with kit/solid3d.mjs.
// Numbers come from model.mjs and parts.mjs (exported constants and functions); the profile numbers
// parts.mjs keeps inside its drawing functions are retyped here with the same values, next to the
// function they come from. Moving parts are built at rest, as on the sheet (plug shut, plunger on the
// jet, arm horizontal, dose float with its underside at y = 0); live3d.js poses them from the model.
//
// Turned parts may carry `cutouts` that the kit ignores and live3d.js reads (as the pressure cooker's
// do): it re-turns every lathe with fewer segments and removes each cutout's sub-profile over its
// angular ranges, so the valve body has its port down into the shroud and the drop valve's cage its
// four windows. Angles are the kit's lathe angle t (x = r cos t, z = -r sin t about the lathe axis).

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

// The sheet hatches vitreous china with its own pattern (a line and a dotted line); the kit has no
// china, so add the nearest kind, with the sheet's 5.2 spacing, under that name.
K.MATERIALS.china ??= { kind: "dashed", gap: 5.2 };

const { UF, VA, PIVOT, ARM_R, IN, OUT, FLOOR_T, HOLE_R, LID_T, KNOB_V, BRIDGE_TOP } = P;
const RIM = M.RIM;
const ZI = M.IN_W / 2; // 75, inside half-width
const ZO = ZI + P.WALL; // 85
const BAND = [VA - 20, VA + 20]; // the left wall's band round the shank hole, an x extrusion
const MID = [UF - 40, UF + 40]; // the floor's middle piece round the outlet hole, a y extrusion
export const CC = 62; // CC bolts at w = ±62 (parts.mjs planStatic)
const rs = (pts) => pts.map(([s, r]) => [r, s]); // the sheet's [s, r] half-sections → lathe [r, s]
const onVA = (loop, o = {}) => S.lathe(loop, { axis: "x", at: [VA, 0], ...o });
const onUF = (loop, o = {}) => S.lathe(loop, { axis: "y", at: [UF, 0], ...o });

// ---------------------------------------------------------------- cistern (parts.mjs cistern())
function cistern() {
  const leftL = [[-OUT, BAND[0]], [-IN, BAND[0]], ...K.arc(-IN + 4, 4, 4, 180, 270, 3), [MID[0], 0], [MID[0], -FLOOR_T], ...K.arc(-OUT + 6, -FLOOR_T + 6, 6, 270, 180, 4)];
  const upper = [[-OUT, BAND[1]], [-IN, BAND[1]], [-IN, RIM - 1], [-IN - 1, RIM], [-OUT + 2, RIM], [-OUT, RIM - 2]];
  const rightL = [[MID[1], 0], ...K.arc(IN - 4, 4, 4, 270, 360, 3), [IN, RIM - 1], [IN + 1, RIM], [OUT - 2, RIM], [OUT, RIM - 2], ...K.arc(OUT - 6, -FLOOR_T + 6, 6, 0, -90, 4), [MID[1], -FLOOR_T]];
  const wall = [[-OUT, RIM - 2], [-OUT + 2, RIM], [OUT - 2, RIM], [OUT, RIM - 2], ...K.arc(OUT - 6, -FLOOR_T + 6, 6, 0, -90, 4), ...K.arc(-OUT + 6, -FLOOR_T + 6, 6, 270, 180, 4)];
  const z = { along: "z", from: -ZI, to: ZI };
  return [
    S.extrude(leftL, z),
    S.extrude(upper, z),
    S.extrude(rightL, z),
    // the band of the left wall with the shank's Ø22 hole (an x extrusion: shape [z, y])
    S.extrude([[-ZI, BAND[0]], [ZI, BAND[0]], [ZI, BAND[1]], [-ZI, BAND[1]]], { along: "x", from: -OUT, to: -IN, holes: [S.circle(0, VA, 11, 48)] }),
    // the floor round the outlet (Ø62) and the two CC bolt holes (a y extrusion: shape [x, z])
    S.extrude([[MID[0], -ZI], [MID[1], -ZI], [MID[1], ZI], [MID[0], ZI]], {
      along: "y", from: -FLOOR_T, to: 0, holes: [S.circle(UF, 0, HOLE_R, 64), S.circle(UF, -CC, 4.1, 20), S.circle(UF, CC, 4.1, 20)],
    }),
    S.extrude(wall, { along: "z", from: -ZO, to: -ZI }),
    S.extrude(wall, { along: "z", from: ZI, to: ZO }),
  ];
}

// ---------------------------------------------------------------- lid (parts.mjs lid(), lidBush())
function lid() {
  return [
    S.extrude(S.rrectAt(0, 0, OUT + 3, ZO + 3, 12), { along: "y", from: RIM, to: RIM + LID_T, holes: [S.circle(UF, 0, 9.05, 40)] }),
    // the locating lip inside the walls, 3.5 thick, 8 deep
    S.extrude(S.rrectAt(0, 0, IN - 0.5, ZI - 0.5, 5), { along: "y", from: RIM - 8, to: RIM, holes: [S.rrectAt(0, 0, IN - 4, ZI - 4, 2)] }),
  ];
}
const BUSH = [[3.2, RIM - 4], [11, RIM - 4], [11, RIM], [9, RIM], [9, RIM + LID_T], [13, RIM + LID_T], [13, RIM + LID_T + 3], [3.2, RIM + LID_T + 3]];

// ---------------------------------------------------------------- fill valve, axis x at y = VA
// valveBody(): the upper half-section, with the port down into the shroud cut from the lower half
// (lowA/lowB leave s -166 .. -158 open at r 12 .. 18), as a cutout over the bottom (t = 0).
const BODY = rs([[-232, 5], [-232, 10.5], [-187, 10.5], [-187, 18], [-166, 18], [-158, 18], [-152, 18], [-152, 12], [-158, 12], [-166, 12], [-170, 12], [-170, 5]]);
export const PORT_HALF = 16; // degrees either side of straight down: the Ø8 port at r 15
const PORT = rs([[-166, 12], [-166, 18], [-158, 18], [-158, 12]]);
const NOZZLE = [[2.5, -200], [5, -200], [5, -170], [4, -166], [4, -154], [1.75, -154], [1.75, -158], [2.5, -160]];
const BACKNUT = [[10.5, -215], [15, -215], [16.5, -213.5], [16.5, -203], [10.5, -203]];
// diaphragm(): its centre gap mm off the jet, its rim clamped
export const diaphragmLoop = (gap) => [[0, -154 + gap], [9, -154 + gap], [13, -152], [18, -152], [18, -150], [13, -150], [9, -152 + gap], [0, -152 + gap]];
const CAP = rs([[-157, 18], [-157, 21], [-136, 21], [-136, 3.2], [-140, 3.2], [-140, 13], [-150, 13], [-150, 18]]);
// the fork's two cheeks behind and in front of the plane (plan: |w| <= 6), carrying the pin
const CHEEK = [[-136, PIVOT[1] - 7], [PIVOT[0], PIVOT[1] - 7], ...K.arc(PIVOT[0], PIVOT[1], 7, -90, 90, 8).slice(1, -1), [PIVOT[0], PIVOT[1] + 7], [-136, PIVOT[1] + 7]];
const PIN_HOLE = () => S.circle(PIVOT[0], PIVOT[1], 1.55, 16);
// plunger(): head Ø14 on the diaphragm, stem Ø6 out through the cap to the cam (at gap 0)
const PLUNGER_END = -128;
const PLUNGER = [[0, -152], [7, -152], [7, -148], [3, -148], [3, PLUNGER_END], [0, PLUNGER_END]];

// The float arm (parts.mjs arm()), at angle 0: the hub on the pin, the cam whose nose (r 2.5) meets
// the plunger's end at the shut-off angle, and the strip out to the ball's boss. One outline.
const NOSE_R = 2.5;
const noseAt0 = [PLUNGER_END + NOSE_R, VA];
const NOSE_RC = Math.hypot(noseAt0[0] - PIVOT[0], noseAt0[1] - PIVOT[1]);
const NOSE_A = (Math.atan2(noseAt0[1] - PIVOT[1], noseAt0[0] - PIVOT[0]) * 180) / Math.PI - P.armAngle(M.L_FULL);
const BALL_U = PIVOT[0] + ARM_R; // ball centre at angle 0
const BOSS = [BALL_U - M.BALL_D / 2 - 2, 5]; // ball(): the boss on the ball, out to u = c - 37, r 5
function armOutline() {
  const [pu, pv] = PIVOT;
  const hub = 5.5;
  const hw = 3; // the strip, 6 × 6
  const sw = 2.5; // the cam's stalk, 5 wide
  const E = BOSS[0] - pu; // the strip ends on the ball's boss
  const deg = Math.PI / 180;
  const a1 = Math.asin(hw / hub) / deg;
  const t0 = Math.sqrt(hub * hub - sw * sw);
  const as = Math.atan2(sw, t0) / deg;
  const A = NOSE_A;
  const d = [Math.cos(A * deg), Math.sin(A * deg)];
  const nR = [Math.sin(A * deg), -Math.cos(A * deg)];
  const pts = [[E, -hw], [E, hw], [Math.sqrt(hub * hub - hw * hw), hw]];
  pts.push(...K.arc(0, 0, hub, a1, A - as, 8).slice(1));
  pts.push(...K.arc(NOSE_RC * d[0], NOSE_RC * d[1], NOSE_R, A - 90, A + 90, 8));
  pts.push([t0 * d[0] - sw * nR[0], t0 * d[1] - sw * nR[1]]);
  pts.push(...K.arc(0, 0, hub, A + as, 360 - a1, 24).slice(1)); // ends on the strip's underside
  return pts.map(([x, y]) => [pu + x, pv + y]);
}
// ball(): a Ø70 shell 1.6 thick with its boss, turned about the arm's line (axis x through the pivot)
function ballLoop() {
  const c = BALL_U;
  const R = M.BALL_D / 2;
  const Ri = R - 1.6;
  const deg = Math.PI / 180;
  const p0 = -Math.acos(BOSS[1] / R) / deg; // where the boss meets the shell
  const out = [];
  for (let i = 0; i <= 28; i++) {
    const a = (p0 + ((90 - p0) * i) / 28) * deg;
    out.push([R * Math.cos(a), c + R * Math.sin(a)]);
  }
  const inn = [];
  for (let i = 0; i <= 28; i++) {
    const a = (90 - (180 * i) / 28) * deg;
    inn.push([Math.max(0, Ri * Math.cos(a)), c + Ri * Math.sin(a)]);
  }
  out[out.length - 1][0] = 0;
  inn[0][0] = 0;
  inn[inn.length - 1][0] = 0;
  return [[0, BOSS[0]], [BOSS[1], BOSS[0]], ...out, ...inn];
}

// ---------------------------------------------------------------- drop valve, axis y at x = UF
// housing(): the tail, flange, seat and cage as one profile; the cage has four windows from 14 to 48
// between posts whose edges the sheet draws at u = UF ± 19 and ± 27 (the far side, seen through).
const HOUSING = [
  [26, -48], [29.8, -48], [29.8, 3], [46, 3], [46, 9], [33, 9], [33, 14], [33, 48], [33, M.LIP_V], [37, M.LIP_V], [37, M.LIP_V + 3], [30, M.LIP_V + 3],
  [30, 48], [30, 14], [30, 9], [24, 9], [24, M.SEAT_V], [20, M.SEAT_V], [20, 7], [26, 3],
];
const WINDOW = [[33, 14], [33, 48], [30, 48], [30, 14]];
const postA = (x) => (Math.acos(x / 31.5) * 180) / Math.PI;
const [P0, P1] = [postA(27), postA(19)]; // a post spans t = P0 .. P1 (about 31° .. 53°)
export const WINDOWS = [[-P0, P0], [P1, 180 - P1], [180 - P0, 180 + P0], [180 + P1, 360 - P1]];
const PLUG = [[14, 4], [16, 4], [16, 16], [26, 16], [26, 21], [19, 25], [16, 25], [16, M.CREST], [14, M.CREST]];
const KNOB = (k = KNOB_V) => [[3, k], [10, k], [10, k + 4], [14, k + 7], [14, k + 16], [11, k + 20], [0, k + 20], [0, k + 12], [3, k + 12]];
// doseFloat(): hollow, walls 1.6, built with its underside at y = 0
const FLOAT_OUT = [[36, 0], [46, 0], [46, M.FLOAT_H], [36, M.FLOAT_H]];
const FLOAT_IN = [[37.6, 1.6], [44.4, 1.6], [44.4, M.FLOAT_H - 1.6], [37.6, M.FLOAT_H - 1.6]];

// ---------------------------------------------------------------- explode
// The drop valve comes up and out of the tank on a jogged line JOG to the right; the fill valve
// lifts FY out over the rim and comes apart along its own axis; the arm and ball come out of the fork.
export const JOG = 300;
const HY = 40; // the housing's lift on the jogged line
const PY = HY + 215; // the plug, tube, bridge, rod and knob: the tube clears the cage
export const FY = 170;
const ex = (x, y, z = 0) => [x, y, z];

export const PARTS = 26;
export function parts() {
  const anchorF = (u, r, dv = 0) => ({ cut: [u, VA + r + dv, 0], out: { c: [u, VA, 0], r: r, axis: "x" } });
  const anchorV = (r, v, rc = r) => ({ cut: [UF + r, v, 0], out: { c: [UF, v, 0], r: rc, axis: "y" } });
  return [
    // ---- the tank and its lid
    S.part(1, "CISTERN BODY 380×150 INSIDE", cistern(), { mat: "china", angle: 45, anchor: { cut: [195, 40, 0], out: { c: [195, 40, ZO] } } }),
    S.part(2, "LID", lid(), { mat: "china", angle: 135, explode: ex(0, 200), anchor: { cut: [-60, RIM + 8, 0], out: { c: [-60, RIM + LID_T, 40] } } }),
    S.part(25, "LID BUSH", [onUF(BUSH)], { mat: "plastic", angle: 45, explode: ex(0, 232), anchor: anchorV(11, RIM + LID_T + 1.5, 13) }),
    S.part(14, "CC BOLT M8×80 ISO 4017, NUT", [-CC, CC].flatMap((w) => [
      S.extrude(S.hexagon(13, UF, w), { along: "y", from: 0, to: 5.3 }),
      S.cylinder({ at: [UF, w], r: 4, from: -74.7, to: 0 }),
      S.extrude(S.hexagon(13, UF, w), { along: "y", from: -66.5, to: -60, holes: [S.circle(UF, w, 4.05, 24)] }),
    ]), { explode: ex(0, -120), anchor: { cut: [UF, 3, -CC], out: { c: [UF, 3, -CC], r: 7.5, axis: "box" } } }),

    // ---- the fill valve (static parts; the diaphragm, plunger, arm and ball move)
    S.part(3, "VALVE BODY, SHANK G1/2", [onVA(BODY, { cutouts: [{ q: PORT, ranges: [[-PORT_HALF, PORT_HALF]] }] })], {
      mat: "plastic", angle: 45, explode: ex(0, FY), anchor: anchorF(-176, 15),
    }),
    S.part(4, "NOZZLE, JET Ø3.5", [onVA(NOZZLE)], { mat: "brass", angle: 135, explode: ex(70, FY), anchor: anchorF(-185, 3.75) }),
    S.part(5, "BACKNUT G1/2", [onVA(BACKNUT)], { mat: "plastic", angle: 135, explode: ex(-100, FY), anchor: anchorF(-209, 13.5) }),
    S.part(6, "TANK WASHER 1/2\"", [
      onVA([[10.5, -203], [16, -203], [16, -200], [10.5, -200]], { explode: ex(-60, 0) }),
      onVA([[10.5, -190], [16, -190], [16, -187], [10.5, -187]], { explode: ex(-25, 0) }),
    ], { mat: "rubber", explode: ex(0, FY), anchor: { ...anchorF(-188.5, 13.25), solid: 1 } }),
    S.part(7, "DIAPHRAGM Ø36×2", [onVA(diaphragmLoop(0), { live: "diaphragm" })], { mat: "rubber", explode: ex(90, FY), anchor: anchorF(-151, 15.5) }),
    S.part(8, "DIAPHRAGM CAP WITH FORK", [
      onVA(CAP),
      S.extrude(CHEEK, { along: "z", from: 3.05, to: 6, holes: [PIN_HOLE()] }),
      S.extrude(CHEEK, { along: "z", from: -6, to: -3.05, holes: [PIN_HOLE()] }),
    ], { mat: "plastic", angle: 135, explode: ex(120, FY), anchor: anchorF(-146, 16) }),
    S.part(9, "PLUNGER Ø6", [onVA(PLUNGER)], { explode: { to: ex(160, FY) }, anchor: anchorF(-136, 1.5) }),
    S.part(13, "OUTLET SHROUD", [S.tube({ at: [-162, 0], r0: 2.5, r1: 4, from: 196, to: 216 })], {
      mat: "plastic", angle: 135, explode: ex(0, FY - 40), anchor: { cut: [-165.2, 204, 0], out: { c: [-162, 204, 0], r: 4, axis: "y" } },
    }),
    S.part(10, "PIVOT PIN Ø3×16 ISO 2338", [S.cylinder({ axis: "z", at: PIVOT, r: 1.5, from: -8, to: 8 })], {
      hatch: "solid", explode: ex(220, FY, 40), anchor: { cut: [PIVOT[0], PIVOT[1], 0], out: { c: [PIVOT[0], PIVOT[1], 8] } },
    }),
    S.part(11, "FLOAT ARM", [S.extrude(armOutline(), { along: "z", from: -3, to: 3, holes: [PIN_HOLE()] })], {
      pivot: [...PIVOT, 0], explode: { to: ex(220, FY) }, anchor: { cut: [PIVOT[0] + 95, PIVOT[1], 0], out: { c: [PIVOT[0] + 95, PIVOT[1], 3] } },
    }),
    S.part(12, "BALL FLOAT Ø70", [S.lathe(ballLoop(), { axis: "x", at: [PIVOT[1], 0] })], {
      hatch: "solid", pivot: [...PIVOT, 0], explode: { to: ex(240, FY) },
      anchor: { cut: [BALL_U + 6, PIVOT[1] + 34.2, 0], out: { c: [BALL_U, PIVOT[1], 0], r: 35, axis: "sphere" } },
    }),

    // ---- the drop valve (static: housing, washers, nuts, collar; moving: plug group, dose float)
    S.part(15, "DROP VALVE HOUSING G2", [onUF(HOUSING, { cutouts: [{ q: WINDOW, ranges: WINDOWS }] })], {
      mat: "plastic", angle: 135, explode: ex(JOG, HY), anchor: anchorV(-31.5, 120, 33),
    }),
    S.part(16, "SEAT WASHER Ø92×3", [onUF([[30, 0], [46, 0], [46, 3], [30, 3]])], { mat: "rubber", explode: ex(JOG, 10), anchor: anchorV(41, 1.5, 46) }),
    S.part(17, "BACKNUT G2", [onUF([[30, -24], [42, -24], [44, -22], [44, -FLOOR_T], [30, -FLOOR_T]])], {
      mat: "plastic", angle: 30, explode: ex(JOG, -50), anchor: anchorV(38, -18, 44),
    }),
    S.part(18, "DOUGHNUT WASHER", [onUF([[30, -48], [42, -48], [60, -16], [60, -FLOOR_T], [45, -FLOOR_T], [45, -24], [30, -24]])], {
      mat: "foam", explode: ex(JOG, -110), anchor: anchorV(-40, -36, 46),
    }),
    S.part(22, "STOP COLLAR", [onUF([[33, M.STOP_V - 4], [37, M.STOP_V - 4], [37, M.STOP_V], [33, M.STOP_V]])], {
      mat: "plastic", angle: 60, explode: ex(JOG, HY + 20), anchor: anchorV(35, M.STOP_V - 2, 37),
    }),
    S.part(21, "DOSE FLOAT Ø92, HOLLOW", [onUF(FLOAT_OUT), S.bore(onUF(FLOAT_IN))], {
      hatch: "solid", explode: { to: ex(JOG, HY + 130) }, anchor: anchorV(-45.2, 15, 46),
    }),
    S.part(19, "PLUG, OVERFLOW TUBE Ø32×2", [onUF(PLUG)], { mat: "plastic", angle: 45, explode: { to: ex(JOG, PY) }, anchor: anchorV(-15, 120, 16) }),
    S.part(20, "PLUG SEAL Ø52×4", [onUF([[18, M.SEAT_V], [26, M.SEAT_V], [26, 16], [18, 16]])], { mat: "rubber", explode: { to: ex(JOG, PY - 20) }, anchor: anchorV(22, 14, 26) }),
    S.part(23, "BRIDGE", [S.extrude([[UF - 18.5, 165], [UF - 16, 165], [UF - 16, BRIDGE_TOP - 5], [UF + 16, BRIDGE_TOP - 5], [UF + 16, 165], [UF + 18.5, 165], [UF + 18.5, BRIDGE_TOP], [UF - 18.5, BRIDGE_TOP]], { along: "z", from: -4, to: 4 })], {
      explode: { to: ex(JOG, PY + 20) }, anchor: { cut: [UF + 17.2, 180, 0], out: { c: [UF + 17.2, 180, 4] } },
    }),
    S.part(24, "PULL ROD Ø6", [S.cylinder({ at: [UF, 0], r: 3, from: BRIDGE_TOP, to: KNOB_V + 12 })], { explode: { to: ex(JOG, PY + 40) }, anchor: anchorV(-1.5, 230, 3) }),
    S.part(26, "PULL KNOB Ø28", [onUF(KNOB())], { mat: "plastic", angle: 135, explode: { to: ex(JOG, PY + 70) }, anchor: anchorV(12, KNOB_V + 12, 14) }),
  ];
}

// ---------------------------------------------------------------- the water the model talks about
// The tank: a box from the floor, its top stretched to the level (convex, so it may take a wash).
// The rest are the sheet's passages, 0.03 mm inside the walls round them: the mains in the shank and
// the nozzle (always full), the diaphragm chamber, the port and shroud, the refill stream (rebuilt
// to the level in live3d.js), the overflow tube's bore and the outlet under the seat.
export const STREAM_U = -162;
export const streamLoop = (L) => [[0, Math.min(L, 195)], [2.47, Math.min(L, 195)], [2.47, 196], [0, 196]];
export function fluids() {
  return [
    S.fluid("tank", S.extrude([[-IN + 0.05, -ZI + 0.05], [IN - 0.05, -ZI + 0.05], [IN - 0.05, ZI - 0.05], [-IN + 0.05, ZI - 0.05]], { along: "y", from: 0.02, to: 1 }), { stretch: { from: 0.5 } }),
    S.fluid("inlet", onVA([[0, -232], [4.97, -232], [4.97, -200], [2.47, -200], [2.47, -160], [1.72, -158], [1.72, -154], [0, -154]])),
    S.fluid("chamber", onVA([[0, -170], [11.97, -170], [11.97, -152.03], [0, -152.03]])),
    S.fluid("port", S.lathe([[0, 196], [2.47, 196], [2.47, 216], [3.97, 216], [3.97, 217.5], [0, 217.5]], { at: [STREAM_U, 0] })),
    // tested against its whole drop (0 .. 196); its mesh runs from the level up
    S.fluid("stream", S.lathe([[0, 0], [2.47, 0], [2.47, 196], [0, 196]], { at: [STREAM_U, 0] })),
    S.fluid("tube", onUF([[0, 4.03], [13.97, 4.03], [13.97, M.CREST], [0, M.CREST]])),
    S.fluid("outlet", onUF([[0, -48], [25.97, -48], [25.97, 3], [19.97, 7], [19.97, M.SEAT_V], [0, M.SEAT_V]])),
  ];
}

// centre lines: the fill valve's axis, the drop valve's, and the pivot's
export const centres = () => [
  { line: [[-254, VA, 0], [-118, VA, 0]], part: 3 },
  { line: [[UF, -80, 0], [UF, KNOB_V + 24 + M.LIFT, 0]], part: 15 },
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
