// The relief valve's parts, in world mm: u right, v up, the valve's axis at u = 0, the inlet
// flange face at v = 0, the outlet on the right. Each function draws one part into a view and
// returns SVG, so the section and both details draw the same geometry at their own scale.
// The disc assembly (disc, holder, split ring, spindle, lower spring plate, lifting nut) is drawn
// seated (h = 0) and lifted with a transform; the adjusting screw and upper spring plate are drawn
// at the nominal set and moved with a transform; only the spring is redrawn.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const L = (pts) => pts.map(([r, v]) => [-r, v]).reverse(); // a right-hand outline mirrored left
const both = (V, pts, opts) => K.cut(V, pts, opts) + K.cut(V, L(pts), opts);
const bothBody = (V, pts) => K.body(V, pts) + K.body(V, L(pts));
const mirrorLines = (list) => [...list, ...list.map((pts) => pts.map(([r, v]) => [-r, v]))];

// Key heights (mm)
export const SEAT_V = 88; // seat plane
export const PLATE_V = 176; // lower spring plate face, seated
export const SPRING_TOP = PLATE_V + M.L_SET; // upper spring plate face at nominal set
export const OUT_V = 95; // outlet axis
export const OUT_R = 21.5; // outlet bore
export const OUT_FACE = 105; // outlet flange face, from the valve axis
export const PIN = [-17, 365]; // lever pivot
export const STUD_R = 51;

// ---------------------------------------------------------------- body, cut through both axes

export function body(V) {
  const s = { mat: "steel", angle: 45 };
  // left: below and above the ring lock screw's tapped hole (M10, minor Ø8.4 at v = 76)
  const lowLeft = [[18, 0], [34, 0], [34, 2], [35.5, 2], [35.5, 20], [32, 20], [32, 46], [44, 58], [44, 71.8], [36, 71.8], [36, 58], [25, 58], [25, 52], [20, 52], [20, 28], [18, 28]];
  const highLeft = [[44, 80.2], [44, 124], [48, 128], [63, 128], [63, 146], [56.05, 146], [56.05, 133], [51, 130], [45.95, 133], [45.95, 146], [37.5, 146], [37.5, 140], [31, 140], [31, 122], [36, 122], [36, 80.2]];
  const ring = [[49.5, 2], [57.5, 2], [57.5, 20], [49.5, 20]];
  // right: below the outlet (split by the drain), above it, and the outlet flange beyond its holes
  const lowRight = [[18, 0], [34, 0], [34, 2], [35.5, 2], [35.5, 20], [32, 20], [32, 50], [40, 62], [54.1, 62], [54.1, 73.5], [36, 73.5], [36, 58], [25, 58], [25, 52], [20, 52], [20, 28], [18, 28]];
  const outletLow = [[65.9, 62], [85, 62], [85, 49], [103, 49], [103, 51], [105, 51], [105, 73.5], [65.9, 73.5]];
  const outletFoot = [[85, 20], [103, 20], [103, 31], [85, 31]];
  const highRight = [
    [36, 116.5], [105, 116.5], [105, 139], [103, 139], [103, 141], [85, 141], [85, 128], [63, 128], [63, 146],
    [56.05, 146], [56.05, 133], [51, 130], [45.95, 133], [45.95, 146], [37.5, 146], [37.5, 140], [31, 140], [31, 122], [36, 122],
  ];
  const outletTop = [[85, 159], [103, 159], [103, 170], [85, 170]];
  const pieces = [L(lowLeft), L(highLeft), L(ring), lowRight, outletLow, outletFoot, highRight, outletTop, ring];
  // thread majors (thin) in the tapped stud holes, M12
  const threads = mirrorLines([[[45, 134], [45, 146]], [[57, 134], [57, 146]]]);
  return part(1, pieces.map((p) => K.cut(V, p, s)).join("") + K.lines(V, threads, "thin"));
}

export function nozzle(V) {
  const loop = [[14.5, 30], [21, 30], [21, 52], [24, 52], [24, 61], [23, 62], [17, 62], [17, 81], [14, 81], [14, 86.5], [12.5, 88], [11.5, 88], [11.5, 44]];
  const rev = K.revolve(loop);
  const roots = mirrorLines([[[20, 31], [20, 51.5]], [[16.2, 63], [16.2, 80]]]);
  return part(2, K.section(V, rev, { mat: "steel", angle: 135 }) + K.lines(V, roots, "thin"));
}

// The blowdown ring on the nozzle; the lock screw's dog point sits in a gap between its teeth.
export function ring(V) {
  const right = [[17, 70], [22, 70], [22, 80.5], [20.5, 82], [17, 82]];
  const left = [[17, 70], [22, 70], [22, 72.3], [20.2, 72.3], [20.2, 79.7], [22, 79.7], [22, 80.5], [20.5, 82], [17, 82]];
  const s = { mat: "steel", angle: 30 };
  return part(3, K.cut(V, right, s) + K.cut(V, L(left), s));
}

export function lockScrew(V) {
  const pts = [[-20.2, 72.5], [-25.2, 72.5], [-25.2, 71], [-44.6, 71], [-45.2, 71.6], [-45.2, 80.4], [-44.6, 81], [-25.2, 81], [-25.2, 79.5], [-20.2, 79.5]];
  return part(
    4,
    K.body(V, pts) +
      K.lines(V, [[[-26, 71.8], [-44, 71.8]], [[-26, 80.2], [-44, 80.2]]], "thin") +
      K.line(V, K.rect(-45.2, 73.5, -40, 78.5), "hid", true)
  );
}

export function drainPlug(V) {
  const pts = [[51, 54], [69, 54], [69, 61], [66.6, 61], [66.6, 71.4], [66, 72], [54, 72], [53.4, 71.4], [53.4, 61], [51, 61]];
  return part(23, K.body(V, pts) + K.lines(V, [[[54.1, 62], [54.1, 71]], [[65.9, 62], [65.9, 71]], [[51, 57.5], [69, 57.5]]], "thin"));
}

// ---------------------------------------------------------------- disc assembly (moves with lift)

export function disc(V) {
  const rev = K.revolve([[0, 88], [15, 88], [15, 94.2], [14.2, 95], [5, 95], [5, 99], [0, 99]]);
  return part(5, K.section(V, rev, { mat: "steel", angle: 45 }));
}

export const holderLoop = [[15.5, 84], [19, 84], [20, 85], [20, 113.2], [19.2, 114], [7.2, 114], [7.2, 103], [8.6, 103], [8.6, 101], [7.2, 101], [7.2, 97], [5.2, 97], [5.2, 95], [15.5, 95]];

export function holder(V) {
  return part(6, K.section(V, { ...K.revolve(holderLoop), edges: [] }, { mat: "steel", angle: 135 }));
}

export function splitRing(V) {
  return part(9, bothBody(V, K.rect(5.6, 101.1, 8.5, 102.9)));
}

const spindleR = [[3, 99], [5.5, 100.2], [5.5, 103], [7, 103.6], [7, 170], [6, 170], [6, 379.4], [5.4, 380]];
export function spindle(V) {
  const pts = [...spindleR, ...L(spindleR)];
  return part(8, K.body(V, pts) + K.lines(V, mirrorLines([[[5, 362], [5, 379]]]), "thin"));
}

export function lowerPlate(V) {
  const rev = K.revolve([[6.2, 170], [27, 170], [27, PLATE_V], [19.5, PLATE_V], [19.5, 181], [18.5, 182], [6.2, 182]]);
  return part(14, K.section(V, { ...rev, edges: [] }, { mat: "steel", angle: 60 }));
}

export function liftingNut(V) {
  const pts = [[6, 370], [9, 370], [9, 375.4], [8.4, 376], [6, 376]];
  return part(22, bothBody(V, pts));
}

export const discAssembly = (V) => holder(V) + disc(V) + splitRing(V) + spindle(V) + lowerPlate(V) + liftingNut(V);

// The disc and holder at full lift, in phantom lines.
export function discPhantom(V) {
  const up = (pts) => K.move(pts, 0, M.H_MAX);
  const discR = [[15, 88], [15, 94.2], [14.2, 95], [5, 95]];
  const out = [[15.5, 95], ...holderLoop.slice(0, 6)].map(([r, v]) => [r, v]);
  return (
    K.line(V, up([...L(out), ...out]), "phan") +
    K.line(V, up([[-15, 88], [15, 88]]), "phan") +
    K.line(V, up(discR), "phan") +
    K.line(V, up(L(discR)), "phan")
  );
}

// ---------------------------------------------------------------- guide, bonnet, studs

export function guide(V) {
  const rev = K.revolve([[7.5, 120], [20.5, 120], [20.5, 100], [25, 100], [25, 140], [37, 140], [37, 147.5], [7.5, 147.5]]);
  return part(7, K.section(V, { ...rev, edges: [] }, { mat: "steel", angle: 60 }));
}

export function gasket(V) {
  return part(13, both(V, K.rect(38, 146, 44, 147.5), { mat: "solid" }) + both(V, K.rect(58, 146, 62, 147.5), { mat: "solid" }));
}

export function bonnet(V) {
  const main = [[30, 147.5], [44, 147.5], [44, 161.5], [40, 161.5], [36, 165.5], [36, 308], [32, 312], [26, 312], [26, 324], [10.4, 324], [10.4, 300], [30, 300]];
  const rim = [[58, 147.5], [63, 147.5], [63, 161.5], [58, 161.5]];
  const s = { mat: "steel", angle: 135 };
  const threads = mirrorLines([[[12, 300], [12, 324]], [[24.9, 313], [24.9, 323]]]);
  return part(10, both(V, main, s) + both(V, rim, s) + K.lines(V, threads, "thin"));
}

export function studs(V) {
  const pts = [[45, 134], [57, 134], [57, 173.9], [56.4, 174.5], [45.6, 174.5], [45, 173.9]];
  const roots = [[[45.95, 135], [45.95, 146]], [[56.05, 135], [56.05, 146]]];
  return part(11, K.body(V, pts) + K.body(V, K.flipU(pts)) + K.lines(V, mirrorLines(roots), "thin"));
}

export function nuts(V) {
  const pts = [[41, 161.5], [61, 161.5], [61, 171.3], [60, 172.3], [42, 172.3], [41, 171.3]];
  return part(12, K.body(V, pts) + K.body(V, K.flipU(pts)) + K.lines(V, mirrorLines([[[44, 161.5], [44, 172.3]], [[58, 161.5], [58, 172.3]]]), "thin"));
}

// ---------------------------------------------------------------- spring and its setting

// dz: the upper plate's offset from its nominal position (down is negative), from the preload.
export const screwOffset = (F0) => (M.F0_NOM - F0) / M.K_SPRING;

export function spring(V, h, F0) {
  const from = PLATE_V + h;
  const to = PLATE_V + h + M.springLength(F0, h);
  return part(15, K.springSection(V, { from, to, radius: M.COIL_D / 2, wire: M.WIRE, turns: M.ACTIVE, axis: "v", at: 0 }));
}

// A point on the spring's second wire section on the left, for its balloon.
export function springDot(h, F0) {
  const from = PLATE_V + h;
  const len = M.springLength(F0, h);
  const pitch = (len - M.WIRE) / M.ACTIVE;
  return [-M.COIL_D / 2, from + M.WIRE / 2 + pitch / 2 + pitch];
}

export function upperPlate(V) {
  const b = SPRING_TOP;
  const rev = K.revolve([[7, b - 5], [19.5, b - 5], [19.5, b], [27, b], [27, b + 8], [7, b + 8]]);
  return part(16, K.section(V, { ...rev, edges: [] }, { mat: "steel", angle: 30 }));
}

export function screw(V) {
  const b = SPRING_TOP + 8;
  const pts = [[7, b], [11.5, b], [12, b + 0.5], [12, 343], [11, 344], [10, 344], [10, 355.4], [9.4, 356], [7, 356]];
  return part(17, bothBody(V, pts) + K.lines(V, mirrorLines([[[10.4, b + 1], [10.4, 342]]]), "thin"));
}

export function lockNut(V) {
  const pts = [[12, 324], [18, 324], [18, 335], [17, 336], [12, 336]];
  return part(18, bothBody(V, pts));
}

// ---------------------------------------------------------------- cap and lifting gear

export function cap(V) {
  const main = [[-26, 312], [-32, 312], [-32, 404], [-28, 408], [28, 408], [32, 404], [32, 371], [24, 371], [24, 400], [-24, 400], [-24, 324], [-26, 324]];
  const low = [[26, 312], [32, 312], [32, 359], [24, 359], [24, 324], [26, 324]];
  const s = { mat: "iron", angle: 45 };
  return part(19, K.cut(V, main, s) + K.cut(V, low, s));
}

const leverOutline = () => {
  const [pu, pv] = PIN;
  const left = [[-6.5, 362], [-6.5, 368], ...K.arc(pu, pv, 6.5, 27.5, 332.5, 14)];
  const right = [[6.5, 362], [92, 362], ...K.arc(92, 365, 3, -90, 90, 6), [6.5, 368]];
  return { left, right };
};

export function lever(V) {
  const { left, right } = leverOutline();
  const s = { mat: "steel", angle: 30 };
  return part(20, K.cut(V, left, s) + K.cut(V, right, s));
}

export function pin(V) {
  return part(21, K.cut(V, K.circle(PIN[0], PIN[1], 4, 24), { mat: "steel", angle: 135 }) + K.centerMark(V, PIN, 4, 3));
}

const rot = ([u, v], deg) => {
  const a = (deg * Math.PI) / 180;
  const du = u - PIN[0];
  const dv = v - PIN[1];
  return [PIN[0] + du * Math.cos(a) - dv * Math.sin(a), PIN[1] + du * Math.sin(a) + dv * Math.cos(a)];
};

// The lever raised for a test lift (8°), in phantom lines.
export function leverPhantom(V) {
  const out = [[34, 368], [34, 362], [92, 362], ...K.arc(92, 365, 3, -90, 90, 6), [92, 368], [34, 368]];
  return K.line(V, out.map((p) => rot(p, 8)), "phan");
}

// ---------------------------------------------------------------- the gas

// The vessel side: inlet bore, nozzle bore, and the curtain between seat and disc.
export function inletGas(h) {
  const top = SEAT_V + h;
  const r = [[18, 0], [18, 30.01], [14.5, 30.01], [11.5, 44], [11.5, SEAT_V], [12.5, SEAT_V], [12.5, top]];
  return [[...r, ...L(r)]];
}

// The huddling chamber: under the disc, inside the skirt.
export const huddleGas = (h) => [K.rect(-15.5, 84 + h, 15.5, SEAT_V + h)];

// The discharge side: body cavity around the nozzle and the outlet bore.
export const outletGas = [
  K.rect(-36, 58, 36, 100),
  K.rect(-36, 99.99, -25, 122),
  K.rect(25, 99.99, 36, 122),
  K.rect(35.99, 73.5, OUT_FACE, 116.5),
];

export const gasPath = (V, shapes) => shapes.map((s) => K.d(V, s)).join("");

// ---------------------------------------------------------------- static assemblies

export const fixedParts = (V) =>
  body(V) + nozzle(V) + ring(V) + lockScrew(V) + drainPlug(V) + guide(V) + gasket(V) + bonnet(V) + studs(V) + nuts(V) + cap(V) + lever(V) + pin(V) + lockNut(V);

export const setParts = (V) => upperPlate(V) + screw(V);

// ---------------------------------------------------------------- dots for the balloons that move

// Where the balloon dots sit on the moving parts, for a lift h and a preload F0.
export function movingDots(h, F0) {
  const dz = screwOffset(F0);
  return {
    15: springDot(h, F0),
    14: [25, 171.5 + h],
    5: [-10, 91.5 + h],
    6: [-18, 100 + h],
    9: [-7, 102 + h],
    8: [-3, 359 + h],
    22: [-7.5, 373 + h],
    16: [-22, 290 + dz],
    17: [-11, 318 + dz],
  };
}
