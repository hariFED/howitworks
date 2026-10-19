// The fuel system's parts, in world mm. Each function draws one part into a view and returns SVG, so
// the schematic views and the sections draw the same geometry at their own scales.
//
// Frames. PLAN and SIDE (the system schematic in the parent aircraft's outline): u = −FS (the nose to
// the right, as on the parent sheet), v = −BL in plan (port at the top), v = WL in the side view, seen
// from starboard. SECTION B-B (the port tank, spanwise at FS 1150, looking forward): u = −WS
// (outboard to the left), v = WL. SECTION C-C (the selector, plan section through its ports, seen
// from above): x to starboard, y forward. SECTION G-G (the selector, axial, on the left port's axis):
// x along that axis (outboard-forward to the left), z up from the ports' plane. SECTION D-D (the
// strainer, axial through its ports): x across, z up from the casting's lower face. SECTION E-E (the
// primer, axial): s aft from the valve block's face, r up.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const rad = Math.PI / 180;
export const pv = (pts) => pts.map(([fs, bl]) => [-fs, -bl]);
export const sv = (pts) => pts.map(([fs, wl]) => [-fs, wl]);
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
export const rot = (pts, [cx, cy], deg) => {
  const c = Math.cos(deg * rad);
  const s = Math.sin(deg * rad);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
};
// a strip of half-width w either side of a polyline (a tube, a skin)
export function strip(pts, w0, w1 = w0) {
  const L = [];
  const R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const n = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    L.push([pts[i][0] + n[0] * w0, pts[i][1] + n[1] * w0]);
    R.push([pts[i][0] - n[0] * w1, pts[i][1] - n[1] * w1]);
  }
  return [...L, ...R.reverse()];
}
export function cutHoles(V, outer, holes, { mat = "steel", angle = 45 } = {}) {
  const dd = K.d(V, outer) + holes.map((h) => K.d(V, h)).join("");
  if (mat === "solid") return `<path class="solid" fill-rule="evenodd" d="${dd}"/>`;
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path fill="url(#h-${mat}-${angle})" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
}
// a passage painted over a cut face: paper, the fuel's stipple, and its walls as open lines
export const fuelFill = (V, pts, id = "", cls = "tint") => `<path${id ? ` id="${id}"` : ""} class="${cls}" d="${K.d(V, pts)}"/>`;
const paper = (V, pts) => `<path class="paper" d="${K.d(V, pts)}"/>`;
// a tube in section: two black walls along a centre line, its bore the fuel
export function tubeCut(V, pts, ro, ri) {
  return K.cut(V, offsetLine(pts, ri, ro), { mat: "solid" }) + K.cut(V, offsetLine(pts, -ro, -ri), { mat: "solid" });
}
// the band between offsets a and b (signed, left of the direction of travel) of a polyline
export function offsetLine(pts, a, b) {
  const sideOf = (w) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[Math.max(0, i - 1)];
      const q = pts[Math.min(pts.length - 1, i + 1)];
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      out.push([pts[i][0] - ((q[1] - p[1]) / len) * w, pts[i][1] + ((q[0] - p[0]) / len) * w]);
    }
    return out;
  };
  return [...sideOf(a), ...sideOf(b).reverse()];
}
const bend = (a, c, b, n = 6) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [(1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1]];
  });

// ================================================================ the parent aircraft (phantom)
// The parent's class figures (examples/light-aircraft/model.mjs): cowling, cabin, tail cone, wing.
const COWL = { axis: 1250, front: -880, r0: 330, r1: 520 };
const CABIN = { half: 590, floor: 730, roof: 1990 };
const CONE = { axis: 1360, fs0: 2450, fs1: 6700, r0: 630, r1: 110 };
const cowlR = (fs) => COWL.r0 + (COWL.r1 - COWL.r0) * Math.sqrt(Math.max(0, 1 - (Math.min(0, fs) / COWL.front) ** 2));
const coneR = (fs) => CONE.r1 + (CONE.r0 - CONE.r1) * (1 - Math.min(1, Math.max(0, (fs - CONE.fs0) / (CONE.fs1 - CONE.fs0)))) ** 1.25;
export const VIEW_FS = [-1080, 2520];
export const PLAN_BL = 1880;
const TE = M.WING.le + M.WING.chord;
export function airframePlan(V) {
  const fs1 = VIEW_FS[1];
  const half = (fs) => (fs < 0 ? cowlR(fs) : fs < CONE.fs0 ? CABIN.half : coneR(fs));
  const side = (sg) => [...range(COWL.front, -1, 16), 0, CONE.fs0 - 1, ...range(CONE.fs0, fs1, 2)].map((f) => [f, sg * half(f)]);
  const nose = range(-90, 90, 12).map((a) => [COWL.front + 60 - 60 * Math.cos(a * rad), COWL.r0 * Math.sin(a * rad) * 0.9]);
  let out = K.line(V, pv(side(1)), "phan") + K.line(V, pv(side(-1)), "phan") + K.line(V, pv(nose), "phan");
  for (const sg of [-1, 1]) {
    out += K.line(V, pv([[M.WING.le, sg * CABIN.half], [M.WING.le, sg * PLAN_BL]]), "phan");
    out += K.line(V, pv([[TE, sg * CABIN.half], [TE, sg * PLAN_BL]]), "phan");
  }
  out += K.line(V, pv([[0, -CABIN.half], [0, CABIN.half]]), "phan") + K.line(V, pv([[20, -CABIN.half], [20, CABIN.half]]), "phan");
  out += K.line(V, pv([[M.PANEL_FS, -CABIN.half + 20], [M.PANEL_FS, CABIN.half - 20]]), "phan");
  // the front door posts, where the lines come down
  for (const sg of [-1, 1]) out += K.line(V, pv(K.rect(640, sg * (CABIN.half - 30), 680, sg * CABIN.half)), "phan", true);
  return out;
}
export function breaksPlan(V) {
  let out = "";
  for (const sg of [-1, 1]) out += K.breakLine(V, [-(M.WING.le - 20), -sg * PLAN_BL], [-(TE + 20), -sg * PLAN_BL]);
  out += K.breakLine(V, [-VIEW_FS[1], -coneR(VIEW_FS[1]) - 20], [-VIEW_FS[1], coneR(VIEW_FS[1]) + 20]);
  return out;
}
export const wingLoAt = (fs, ws) => M.wingAt(fs, ws)[0];
export function airframeSide(V) {
  const fs1 = VIEW_FS[1];
  const top = [...range(COWL.front, 0, 16).map((f) => [f, COWL.axis + cowlR(f)]), [650, CABIN.roof], [CONE.fs0, CABIN.roof], ...range(CONE.fs0, fs1, 2).map((f) => [f, CONE.axis + coneR(f)])];
  const bot = [...range(COWL.front, 0, 16).map((f) => [f, COWL.axis - cowlR(f)]), [0, CABIN.floor], [CONE.fs0, CABIN.floor], ...range(CONE.fs0, fs1, 2).map((f) => [f, CONE.axis - coneR(f)])];
  const nose = range(-90, 90, 12).map((a) => [COWL.front + 60 - 60 * Math.cos(a * rad), COWL.axis + COWL.r0 * Math.sin(a * rad) * 0.9]);
  // the wing at the root: its section at WS 600
  const xs = range(0, 1, 30);
  const up = xs.map((x) => [M.WING.le + x * M.WING.chord, M.wingAt(M.WING.le + x * M.WING.chord, 600)[1]]);
  const lo = xs.map((x) => [M.WING.le + x * M.WING.chord, M.wingAt(M.WING.le + x * M.WING.chord, 600)[0]]);
  let out = K.line(V, sv(top), "phan") + K.line(V, sv(bot), "phan") + K.line(V, sv(nose), "phan") + K.line(V, sv([...up, ...lo.reverse()]), "phan", true);
  out += K.line(V, sv(K.rect(0, CABIN.floor + 15, 20, 1755)), "phan", true); // firewall
  out += K.line(V, sv([[20, M.FLOORBOARD], [CONE.fs0, M.FLOORBOARD]]), "phan"); // floorboards
  out += K.line(V, sv([[640, M.FLOORBOARD], [640, 1950], [1590, 1950], [1590, M.FLOORBOARD]]), "phan"); // the door
  out += K.line(V, sv([[M.PANEL_FS, 1250], [M.PANEL_FS, 1640]]), "phan"); // the panel
  out += K.line(V, sv(K.rrect(-760, 960, -60, 1430, 40)), "phan", true); // the engine
  return out;
}
export function breaksSide(V) {
  return K.breakLine(V, [-VIEW_FS[1], CONE.axis - coneR(VIEW_FS[1]) - 20], [-VIEW_FS[1], CONE.axis + coneR(VIEW_FS[1]) + 20]);
}

// ================================================================ the schematic: the system in plan and side
// Lines are drawn as their centre line: a band of the fuel's stipple (live), NTS width.
export const route2 = (pts, plan) => pts.map(([fs, bl, wl]) => (plan ? [fs, bl] : [fs, wl]));
export function lineSym(V, pts, id, plan, cls = "") {
  const p = plan ? pv(route2(pts, true)) : sv(route2(pts, false));
  return `<path${id ? ` id="${id}"` : ""} class="fuel-line${cls ? " " + cls : ""}" d="${K.d(V, p, false)}"/><path class="thin" d="${K.d(V, p, false)}"/>`;
}
export const PRIMER_AT = { fs: M.PANEL_FS, bl: -260, wl: 1420 };
export const GAUGE_AT = { fs: M.PANEL_FS, bl: -120, wl: 1540 };
export const INTAKE = [[-520, -330, 1170], [-520, 330, 1170]]; // the primer nozzles, in the intake ports
export const STRAINER_PRIMER = [M.STRAINER.fs, M.STRAINER.bl + 14, M.STRAINER.wl + 34];
export function primerRoute() {
  const a = STRAINER_PRIMER;
  return [
    [a, [a[0], a[1], 1000], [40, a[1], 1000], [40, PRIMER_AT.bl, PRIMER_AT.wl - 30], [PRIMER_AT.fs - 30, PRIMER_AT.bl, PRIMER_AT.wl - 30]],
    [[PRIMER_AT.fs - 30, PRIMER_AT.bl, PRIMER_AT.wl + 30], [40, PRIMER_AT.bl, PRIMER_AT.wl + 30], [40, -330, 1300], [-520, -330, 1300], INTAKE[0]],
    [[-520, -330, 1300], [-520, 330, 1300], INTAKE[1]],
  ];
}
export function tankPlan(V, sg) {
  const t = M.TANK;
  const box = K.rrect(t.fs0, t.ws0, t.fs1, t.ws1, 20).map(([f, w]) => [f, sg * w]);
  return `<path class="paper" d="${K.d(V, pv(box))}"/><path id="tank-plan-${sg < 0 ? "L" : "R"}" class="tint" d="${K.d(V, pv(box))}"/><path class="vis" d="${K.d(V, pv(box))}"/>`;
}
export function fillerPlan(V, sg) {
  return K.body(V, pv(K.circle(M.FILLER.fs, sg * M.FILLER.ws, 36, 20))) + K.line(V, pv(K.circle(M.FILLER.fs, sg * M.FILLER.ws, 20, 14)), "thin", true);
}
export const ventPlanPts = (sg) => [[M.FS_B, sg * 1800], [M.FS_B, sg * M.VENT.ws], [M.FS_B - 120, sg * M.VENT.ws]];
export const selectorSym = (V, plan) =>
  plan ? K.body(V, pv(K.circle(M.SELECTOR.fs, 0, 34, 16))) : K.body(V, sv(K.rect(M.SELECTOR.fs - 34, 805, M.SELECTOR.fs + 34, 855))) + K.line(V, sv([[M.SELECTOR.fs, 855], [M.SELECTOR.fs, 935]]), "vis") + K.line(V, sv([[M.SELECTOR.fs - 45, 935], [M.SELECTOR.fs + 45, 935]]), "vis");
export const shutoffSym = (V, plan) => {
  const c = plan ? [80, 0] : [80, 790];
  const box = K.rect(c[0] - 30, c[1] - 22, c[0] + 30, c[1] + 22);
  const knob = plan ? [[80, 22], [80, 120], [M.PANEL_FS, 120]] : [[80, 812], [80, 1320], [M.PANEL_FS, 1320]];
  return K.body(V, plan ? pv(box) : sv(box)) + K.line(V, plan ? pv(knob) : sv(knob), "thin");
};
export const strainerSym = (V, plan) => {
  const S = M.STRAINER;
  if (plan) return K.body(V, pv(K.circle(S.fs, S.bl, 36, 16)));
  return K.body(V, sv(K.rect(S.fs - 36, S.wl - 22, S.fs + 36, S.wl + 12))) + K.body(V, sv(K.rect(S.fs - 30, M.STRAINER_BOTTOM, S.fs + 30, S.wl - 22))) + K.line(V, sv([[S.fs, M.STRAINER_BOTTOM], [S.fs, M.STRAINER_BOTTOM - 30]]), "vis");
};
export const CARB_BOX = { fs0: -340, fs1: -160, wl0: 780, wl1: 940 };
export const carbSym = (V, plan) => {
  const c = CARB_BOX;
  if (plan) return K.body(V, pv(K.rect(c.fs0, -90, c.fs1, 90)));
  return K.body(V, sv(K.rect(c.fs0, c.wl0 + 40, c.fs1, c.wl1))) + K.body(V, sv(K.rect(c.fs0 + 20, c.wl0, c.fs1 - 20, c.wl0 + 40)));
};
export const primerSym = (V, plan) => {
  const p = PRIMER_AT;
  return plan ? K.body(V, pv(K.rect(p.fs - 30, p.bl - 14, p.fs + 90, p.bl + 14))) : K.body(V, sv(K.rect(p.fs - 30, p.wl - 14, p.fs + 90, p.wl + 14)));
};
export const gaugeSym = (V) => K.body(V, sv(K.rect(GAUGE_AT.fs - 10, GAUGE_AT.wl - 30, GAUGE_AT.fs + 20, GAUGE_AT.wl + 30)));
// the tank in the side view: its chordwise section at the outlet's station (the fuel level is live)
export const tankSidePts = (ws = 960) => {
  const t = M.TANK;
  const fs = range(t.fs0, t.fs1, 24);
  return [...fs.map((f) => [f, M.tankLo(f, ws)]), ...fs.slice().reverse().map((f) => [f, M.tankHi(f, ws)])];
};
export function tankSideFuel(level, ws = 960) {
  const t = M.TANK;
  const fs = range(t.fs0, t.fs1, 24);
  const lo = fs.map((f) => [f, M.tankLo(f, ws)]);
  const top = fs.map((f) => [f, Math.max(M.tankLo(f, ws), Math.min(M.tankHi(f, ws), level))]);
  return [...lo, ...top.reverse()];
}

// ================================================================ SECTION B-B: the port tank (WS, WL)
const FB = M.FS_B;
export const lo = (ws) => M.tankLo(FB, ws);
export const hi = (ws) => M.tankHi(FB, ws);
const T = M.TANK;
const WAL = T.wall;
export const bv = (pts) => pts.map(([ws, wl]) => [-ws, wl]);
const wsList = range(T.ws0, T.ws1, 22);
// the tank's inside, as a closed outline
export const tankInner = () => [...wsList.map((w) => [w, lo(w)]), ...wsList.slice().reverse().map((w) => [w, hi(w)])];
export function tankShell(V) {
  // the welded shell: floor, roof and end walls, too thin to hatch (blacked in), with the openings
  const outer = [...wsList.map((w) => [w, lo(w) - WAL]), [T.ws1 + WAL, lo(T.ws1) - WAL], [T.ws1 + WAL, hi(T.ws1) + WAL], ...wsList.slice().reverse().map((w) => [w, hi(w) + WAL]), [T.ws0 - WAL, hi(T.ws0) + WAL], [T.ws0 - WAL, lo(T.ws0) - WAL]];
  return cutHoles(V, bv(outer), [bv(tankInner())], { mat: "solid" });
}
// the fuel below a level surface tilted by the slip (rising outboard on the port side by tan ε per mm)
export function fuelPoly(level, slipDeg) {
  const tilt = Math.tan(slipDeg * rad);
  const surf = (w) => level + (w - M.WS_C) * tilt;
  const top = wsList.map((w) => [w, Math.max(lo(w), Math.min(hi(w), surf(w)))]);
  return bv([...wsList.map((w) => [w, lo(w)]), ...top.reverse()]);
}
export function ullagePoly(level, slipDeg) {
  const tilt = Math.tan(slipDeg * rad);
  const surf = (w) => level + (w - M.WS_C) * tilt;
  const bot = wsList.map((w) => [w, Math.max(lo(w), Math.min(hi(w), surf(w)))]);
  return bv([...bot, ...wsList.slice().reverse().map((w) => [w, hi(w)])]);
}
// the wing round the tank, phantom: skins at FS 1150 and the ribs either end
export const B_WS = [880, 1900];
export function wingB(V) {
  const ws = range(B_WS[0], B_WS[1], 20);
  const up = ws.map((w) => [w, M.wingAt(FB, w)[1]]);
  const dn = ws.map((w) => [w, M.wingAt(FB, w)[0]]);
  const rib = (w, t) => [[w, M.wingAt(FB, w)[0]], [w, M.wingAt(FB, w)[1]], [w + t, M.wingAt(FB, w + t)[1]], [w + t, M.wingAt(FB, w + t)[0]]];
  return K.line(V, bv(up), "phan") + K.line(V, bv(dn), "phan") + K.line(V, bv(rib(T.ws0 - 16, 6)), "phan", true) + K.line(V, bv(rib(T.ws1 + 60, 6)), "phan", true);
}
// 2 FILLER: an adapter ring riveted into the tank's roof, and the locking cap flush with the skin
export const FIL = { r0: 26, r1: 31 };
export function filler(V) {
  const w = M.FILLER.ws;
  const roof = hi(w);
  const skin = M.wingAt(FB, w)[1];
  const bot = M.levelAt(M.FULL);
  const neck = (sg) => [[w + sg * FIL.r0, bot], [w + sg * FIL.r1, bot], [w + sg * FIL.r1, roof + WAL], [w + sg * (FIL.r1 + 8), roof + WAL], [w + sg * (FIL.r1 + 8), roof + 3], [w + sg * FIL.r1, skin - 4], [w + sg * FIL.r0, skin - 4]];
  const capPts = [[w - 37, skin - 4], [w + 37, skin - 4], [w + 37, skin + 4], [w + 12, skin + 4], [w + 12, skin + 10], [w - 12, skin + 10], [w - 12, skin + 4], [w - 37, skin + 4]];
  const plug = [[w - FIL.r0 + 0.5, skin - 4], [w + FIL.r0 - 0.5, skin - 4], [w + FIL.r0 - 0.5, skin - 16], [w - FIL.r0 + 0.5, skin - 16]];
  const seal = (sg) => K.circle(w + sg * (FIL.r0 - 2.2), skin - 9, 1.8, 10);
  return (
    part(2, K.cut(V, bv(neck(1)), { mat: "alu", angle: 45 }) + K.cut(V, bv(neck(-1)), { mat: "alu", angle: 45 }) + K.cut(V, bv(plug), { mat: "alu", angle: 135 }) + K.cut(V, bv(capPts), { mat: "alu", angle: 135 }) + K.cut(V, bv(seal(1)), { mat: "solid" }) + K.cut(V, bv(seal(-1)), { mat: "solid" }))
  );
}
// 3 FINGER STRAINER: a brass mesh tube on the outlet fitting, reaching out from the inboard end wall
export const FINGER = { len: 62, r: M.STRAINER_R };
export function fingerStrainer(V) {
  const a = M.OUTLET_WL;
  const w0 = T.ws0;
  const r = FINGER.r;
  // the mesh, cut lengthwise: two thin walls, slotted, and its closed end
  const wall = (sg) => {
    let out = "";
    const n = 7;
    for (let i = 0; i < n; i++) {
      const s0 = w0 + 10 + (i * (FINGER.len - 12)) / n;
      out += K.cut(V, bv(K.rect(s0, a + sg * r - 0.6, s0 + (FINGER.len - 12) / n - 2.6, a + sg * r + 0.6)), { mat: "solid" });
    }
    return out;
  };
  const end = K.rect(w0 + FINGER.len - 2, a - r - 0.6, w0 + FINGER.len, a + r + 0.6);
  const collar = (sg) => K.rect(w0, a + sg * (r - 0.6), w0 + 10, a + sg * (r + 1.4));
  return part(3, wall(1) + wall(-1) + K.cut(V, bv(end), { mat: "brass", angle: 45 }) + K.cut(V, bv(collar(1)), { mat: "brass", angle: 45 }) + K.cut(V, bv(collar(-1)), { mat: "brass", angle: 45 }));
}
// the outlet fitting through the inboard end wall and the feed line (8) leaving inboard
export function outletFitting(V) {
  const a = M.OUTLET_WL;
  const w0 = T.ws0;
  const boss = (sg) => [[w0 - WAL - 14, a + sg * 4.8], [w0 + 2, a + sg * 4.8], [w0 + 2, a + sg * 11], [w0 - WAL - 4, a + sg * 11], [w0 - WAL - 4, a + sg * 8], [w0 - WAL - 14, a + sg * 8]];
  return K.cut(V, bv(boss(1)), { mat: "brass", angle: 135 }) + K.cut(V, bv(boss(-1)), { mat: "brass", angle: 135 });
}
export const feedB = () => [[T.ws0 - WAL - 14, M.OUTLET_WL], [B_WS[0] - 4, M.OUTLET_WL]];
// 4 SUMP DRAIN: a quick-drain valve at the sump's lowest point, through the lower skin
export const SUMP_WS = 940;
export function sumpDrain(V) {
  const w = SUMP_WS;
  const f = lo(w);
  const skin = M.wingAt(FB, w)[0];
  const body = (sg) => [[w + sg * 3, f + 1.5], [w + sg * 7, f + 1.5], [w + sg * 7, f - WAL], [w + sg * 9, f - WAL], [w + sg * 9, skin - 14], [w + sg * 3, skin - 14], [w + sg * 3, skin - 8], [w + sg * 3, f - 4]];
  const stem = [[w - 2.6, f + 1], [w + 2.6, f + 1], [w + 2.6, skin - 20], [w - 2.6, skin - 20]];
  return part(4, K.cut(V, bv(body(1)), { mat: "brass", angle: 45 }) + K.cut(V, bv(body(-1)), { mat: "brass", angle: 45 }) + K.body(V, bv(stem)));
}
// 5 QUANTITY SENDER: a float on an arm pivoted at the outboard end wall; its rheostat outside the wall
export const SEND = { ws: T.ws1 - 12, wl: 0 };
SEND.wl = (lo(T.ws1) + hi(T.ws1)) / 2 + 8;
export function senderAngle(level, slipDeg) {
  const tilt = Math.tan(slipDeg * rad);
  // the float rides on the surface: find the arm's angle whose tip sits at the surface there
  let a = 0;
  for (let i = 0; i < 30; i++) {
    const fw = SEND.ws - M.SENDER.arm * Math.cos(a);
    const want = level + (fw - M.WS_C) * tilt + 3;
    const s = Math.max(-0.9, Math.min(0.9, (want - SEND.wl) / M.SENDER.arm));
    a = Math.asin(s);
  }
  const lim = [Math.asin((lo(SEND.ws - 300) + 14 - SEND.wl) / M.SENDER.arm), Math.asin((hi(SEND.ws - 300) - 14 - SEND.wl) / M.SENDER.arm)];
  return Math.max(lim[0], Math.min(lim[1], a));
}
export function sender(V, a) {
  const p = [SEND.ws, SEND.wl];
  const tip = [p[0] - M.SENDER.arm * Math.cos(a), p[1] + M.SENDER.arm * Math.sin(a)];
  const arm = strip([p, tip], 1.6);
  const flt = K.rrect(tip[0] - 22, tip[1] - 11, tip[0] + 22, tip[1] + 11, 6).map(([x, y]) => [x, y]);
  const housing = K.rect(T.ws1 + WAL, SEND.wl - 20, T.ws1 + 24, SEND.wl + 20);
  return part(5, K.cut(V, bv(housing), { mat: "plastic", angle: 45 }) + K.body(V, bv(arm)) + K.cut(V, bv(flt), { mat: "foam", angle: 45 }) + K.body(V, bv(K.circle(p[0], p[1], 5, 12))));
}
export const senderTip = (a) => [SEND.ws - M.SENDER.arm * Math.cos(a), SEND.wl + M.SENDER.arm * Math.sin(a)];
// 6 VENT LINE: out of the outboard end wall at the top, down through the bay, out under the wing
export const ventPts = () => {
  const w = M.VENT.ws;
  const top = hi(T.ws1) - 10;
  const skin = M.wingAt(FB, w)[0];
  return [[T.ws1 - 4, top], [w - 14, top], ...bend([w - 14, top], [w, top], [w, top - 14], 4).slice(1), [w, skin - 46]];
};
export const CHECK = { wl0: 0, wl1: 0 };
CHECK.wl1 = hi(T.ws1) - 40;
CHECK.wl0 = CHECK.wl1 - 40;
export function ventLine(V) {
  const p = ventPts();
  const above = p.filter(([, wl]) => wl >= CHECK.wl1 - 0.01);
  const below = [[M.VENT.ws, CHECK.wl0], [M.VENT.ws, M.wingAt(FB, M.VENT.ws)[0] - 46]];
  // under the skin it bends forward, into the airflow: seen here end-on, its mouth
  const mouth = K.circle(M.VENT.ws, M.wingAt(FB, M.VENT.ws)[0] - 46, 4.76, 16);
  return part(6, tubeCut(V, bv(above), 4.76, 3.88) + tubeCut(V, bv(below), 4.76, 3.88) + `<path class="paper" d="${K.d(V, bv(mouth))}"/>` + K.line(V, bv(mouth), "vis", true) + K.line(V, bv(K.circle(M.VENT.ws, M.wingAt(FB, M.VENT.ws)[0] - 46, 3.88, 16)), "vis", true));
}
export const ventBore = () => [ventPts().filter(([, wl]) => wl >= CHECK.wl1 - 0.01), [[M.VENT.ws, CHECK.wl0], [M.VENT.ws, M.wingAt(FB, M.VENT.ws)[0] - 46]]];
// 7 VENT CHECK VALVE: a brass body with a light flapper: air in freely, fuel not out
export function checkValve(V, open = 1) {
  const w = M.VENT.ws;
  const body = (sg) => [[w + sg * 5, CHECK.wl1], [w + sg * 9, CHECK.wl1], [w + sg * 9, CHECK.wl0], [w + sg * 5, CHECK.wl0], [w + sg * 5, CHECK.wl0 + 6], [w + sg * 7, CHECK.wl0 + 6], [w + sg * 7, CHECK.wl1 - 6], [w + sg * 5, CHECK.wl1 - 6]];
  const seat = (sg) => [[w + sg * 7, CHECK.wl1 - 14], [w + sg * 3.2, CHECK.wl1 - 14], [w + sg * 3.2, CHECK.wl1 - 17], [w + sg * 7, CHECK.wl1 - 17]];
  // the flapper hinged at its outboard edge, lifting (upward, into the tank side) as air comes in
  const flap = rot([[w - 6, CHECK.wl1 - 18.6], [w + 6, CHECK.wl1 - 18.6], [w + 6, CHECK.wl1 - 17.2], [w - 6, CHECK.wl1 - 17.2]], [w - 6, CHECK.wl1 - 17.9], 0);
  return part(7, K.cut(V, bv(body(1)), { mat: "brass", angle: 135 }) + K.cut(V, bv(body(-1)), { mat: "brass", angle: 135 }) + K.cut(V, bv(seat(1)), { mat: "brass", angle: 135 }) + K.cut(V, bv(seat(-1)), { mat: "brass", angle: 135 }) + `<g id="flap-B">${K.cut(V, bv(flap), { mat: "solid" })}</g>`);
}
export const flapPivot = () => [M.VENT.ws - 6, CHECK.wl1 - 17.9];
export const checkBore = () => bv(K.rect(M.VENT.ws - 5, CHECK.wl0 + 0.1, M.VENT.ws + 5, CHECK.wl1 - 0.1));

// ================================================================ SECTION C-C: the selector valve, plan (x, y)
// The body: a round boss, the two port bosses forward-left and forward-right at ±45°, two mounting
// ears aft. Its star-shaped outline is sampled in polar angle (clockwise from forward).
export const SEL = { boss: 30, bore: 18.05, port: 3.88, lug: 44, lugW: 10, ear: 41, earW: 8, earHole: 3.3, earR: 34, fit: 54 };
const dirOf = (deg) => [Math.sin(deg * rad), Math.cos(deg * rad)];
export function selOutline() {
  const lugs = [[-45, SEL.lug, SEL.lugW], [45, SEL.lug, SEL.lugW], [-135, SEL.ear, SEL.earW], [135, SEL.ear, SEL.earW]];
  const pts = [];
  for (let k = 0; k < 360; k += 1.5) {
    const phi = k - 180;
    let r = SEL.boss;
    for (const [d, R, w] of lugs) {
      const dl = ((phi - d + 540) % 360) - 180;
      if (Math.abs(dl) < 89) r = Math.max(r, Math.min(R / Math.cos(dl * rad), w / Math.max(1e-6, Math.abs(Math.sin(dl * rad)))));
    }
    const [x, y] = dirOf(phi);
    pts.push([x * r, y * r]);
  }
  return pts;
}
export const portAxis = (side) => dirOf(M.PORT_ANGLE[side]);
// the port drilling from the bore out to the boss face, as a band along its axis
export const portBand = (side, r0 = SEL.bore - 1, r1 = SEL.lug + 0.6, w = SEL.port) => {
  const [x, y] = portAxis(side);
  const n = [y, -x];
  return [[x * r0 + n[0] * w, y * r0 + n[1] * w], [x * r1 + n[0] * w, y * r1 + n[1] * w], [x * r1 - n[0] * w, y * r1 - n[1] * w], [x * r0 - n[0] * w, y * r0 - n[1] * w]];
};
export const earHoles = () => [-135, 135].map((d) => K.circle(dirOf(d)[0] * SEL.earR, dirOf(d)[1] * SEL.earR, SEL.earHole, 16));
export function selBody(V) {
  const walls = ["L", "R"].map((s) => {
    const b = portBand(s, SEL.bore, SEL.lug);
    return K.line(V, [b[0], b[1]]) + K.line(V, [b[3], b[2]]);
  });
  return part(
    9,
    cutHoles(V, selOutline(), [K.circle(0, 0, SEL.bore, 72), ...earHoles()], { mat: "alu", angle: 45 }) +
      ["L", "R"].map((s) => paper(V, portBand(s))).join("") +
      `<g data-role="fluid">${["L", "R"].map((s) => fuelFill(V, portBand(s), `sel-port-${s}`)).join("")}</g>` +
      walls.join("") +
      earCentres().map((c) => K.cut(V, K.circle(c[0], c[1], SEL.earHole - 0.3, 14), { mat: "steel", angle: 135 })).join("")
  );
}
// earHoles' centres, for the bolts cut across in them
export const earCentres = () => [-135, 135].map((d) => [dirOf(d)[0] * SEL.earR, dirOf(d)[1] * SEL.earR]);
// 10 ROTOR at angle 0 (window forward): the annulus outside its centre bore, less the window
export const ROT = { r: 18, bore: 6.5 };
export function rotorShape() {
  const a0 = M.WINDOW;
  const outer = range(a0, 360 - a0, 48).map((a) => [Math.sin(a * rad) * ROT.r, Math.cos(a * rad) * ROT.r]);
  const inner = range(360 - a0, a0, 40).map((a) => [Math.sin(a * rad) * ROT.bore, Math.cos(a * rad) * ROT.bore]);
  return [...outer, ...inner];
}
export function windowShape() {
  const a0 = M.WINDOW;
  const outer = range(-a0, a0, 24).map((a) => [Math.sin(a * rad) * ROT.r, Math.cos(a * rad) * ROT.r]);
  const inner = range(a0, 360 - a0, 30).map((a) => [Math.sin(a * rad) * ROT.bore, Math.cos(a * rad) * ROT.bore]);
  return [...outer, ...inner];
}
export function rotorPlan(V) {
  return part(10, K.cut(V, rotorShape(), { mat: "brass", angle: 135 }));
}
// the port fittings and the feed lines (8) leaving the bosses
export const portLine = (side, r0 = SEL.lug, r1 = 66) => {
  const [x, y] = portAxis(side);
  return [[x * r0, y * r0], [x * r1, y * r1]];
};
export function portFitting(V, side) {
  const [x, y] = portAxis(side);
  const n = [y, -x];
  const band = (r0, r1, w0, w1) => [[x * r0 + n[0] * w0, y * r0 + n[1] * w0], [x * r1 + n[0] * w0, y * r1 + n[1] * w0], [x * r1 + n[0] * w1, y * r1 + n[1] * w1], [x * r0 + n[0] * w1, y * r0 + n[1] * w1]];
  return K.cut(V, band(SEL.lug, SEL.fit, SEL.port, 8), { mat: "steel", angle: 135 }) + K.cut(V, band(SEL.lug, SEL.fit, -8, -SEL.port), { mat: "steel", angle: 135 });
}

// ================================================================ SECTION G-G: the selector, axial (x, z)
// On the left port's axis: x outward along it (to the left on the sheet: u = −x), z up from the ports'
// plane. The cover plate, the shaft and the handle above; the outlet below.
export const GG = { bodyTop: 26, bodyBot: -24, cover: 6, floor: [40, 52], handle: 58 };
export const gv = (pts) => pts.map(([x, z]) => [-x, z]);
export function selBodyAxial(V) {
  // the body's walls cut on the plane: the boss out to the port lug on the left, plain boss on the right
  // in G-G's own x (+ along the left port, outward): the port lug on that side, the aft ear opposite
  const left = [[SEL.bore, GG.bodyBot + 8], [SEL.bore, GG.bodyTop], [SEL.boss, GG.bodyTop], [SEL.boss, 14], [SEL.lug, 14], [SEL.lug, -14], [SEL.boss, -14], [SEL.boss, GG.bodyBot], [6.5, GG.bodyBot], [6.5, GG.bodyBot + 8]];
  const right = [[-SEL.bore, GG.bodyBot + 8], [-SEL.bore, GG.bodyTop], [-SEL.boss, GG.bodyTop], [-SEL.boss, 14], [-SEL.ear, 14], [-SEL.ear, -14], [-SEL.boss, -14], [-SEL.boss, GG.bodyBot], [-6.5, GG.bodyBot], [-6.5, GG.bodyBot + 8]];
  // the aft ear's bolt hole, through the band
  const hole = [[-SEL.earR + SEL.earHole, -14.6], [-SEL.earR - SEL.earHole, -14.6], [-SEL.earR - SEL.earHole, 14.6], [-SEL.earR + SEL.earHole, 14.6]];
  // the port drilling in the left wall, from the bore to the lug face
  const port = [[SEL.bore - 1, -SEL.port], [SEL.lug + 0.6, -SEL.port], [SEL.lug + 0.6, SEL.port], [SEL.bore - 1, SEL.port]];
  return part(9, K.cut(V, gv(left), { mat: "alu", angle: 45 }) + K.cut(V, gv(right), { mat: "alu", angle: 45 }) + paper(V, gv(hole)) + K.line(V, gv([hole[0], hole[3]])) + K.line(V, gv([hole[1], hole[2]])) + paper(V, gv(port)) + `<g data-role="fluid">${fuelFill(V, gv(port), "gg-port")}</g>` + K.line(V, gv([port[0], port[1]])) + K.line(V, gv([port[3], port[2]])));
}
export const ggBore = () => gv(K.rect(-6.5, GG.bodyBot - 0.4, 6.5, GG.bodyBot + 8.4));
// 10 ROTOR in the axial section: a plug with its centre bore; on each side of the axis the window is
// open where the rotor's window faces that side of the plane at angle θ
export function rotorAxial(V, theta) {
  const sideOpen = (phi) => {
    const c = ((phi - theta + 540) % 360) - 180;
    return Math.abs(c) < M.WINDOW;
  };
  const leftOpen = sideOpen(M.PORT_ANGLE.L);
  const rightOpen = sideOpen(M.PORT_ANGLE.L + 180);
  const zt = GG.bodyTop - 1;
  const zb = GG.bodyBot + 8.5;
  const half = (sg, open) => {
    const xo = sg * ROT.r;
    const xi = sg * ROT.bore;
    if (!open) return [[[xi, zb], [xo, zb], [xo, zt], [xi, zt]]];
    // the window: a slot through the wall at the ports' plane
    return [[[xi, 7], [xo, 7], [xo, zt], [xi, zt]], [[xi, zb], [xo, zb], [xo, -7], [xi, -7]]];
  };
  const pieces = [...half(1, leftOpen), ...half(-1, rightOpen)];
  const win = [];
  if (leftOpen) win.push([[ROT.bore - 0.1, -7], [ROT.r + 0.6, -7], [ROT.r + 0.6, 7], [ROT.bore - 0.1, 7]]);
  if (rightOpen) win.push([[-ROT.bore + 0.1, -7], [-ROT.r - 0.1, -7], [-ROT.r - 0.1, 7], [-ROT.bore + 0.1, 7]]);
  // the plug's top, across the axis above the bore
  const cap = [[-ROT.r, zt - 5], [ROT.r, zt - 5], [ROT.r, zt], [-ROT.r, zt]];
  const groove = (pts) => {
    // cut the O-ring grooves out of a wall piece [[xi, z0], [xo, z0], [xo, z1], [xi, z1]]
    const [[xi, z0], [xo], , [, z1]] = pts;
    const sg = Math.sign(xo);
    const g = ORING_Z.filter((z) => z - ORING.groove[1] > z0 && z + ORING.groove[1] < z1).sort((a, b) => a - b);
    const out = [[xi, z0], [xo, z0]];
    for (const z of g) out.push([xo, z - ORING.groove[1]], [sg * ORING.groove[0], z - ORING.groove[1]], [sg * ORING.groove[0], z + ORING.groove[1]], [xo, z + ORING.groove[1]]);
    out.push([xo, z1], [xi, z1]);
    return out;
  };
  const out = pieces.map((p) => K.cut(V, gv(groove(p.map(([x, z]) => [x, Math.min(z, zt - 5)]))), { mat: "brass", angle: 135 })).join("") + K.cut(V, gv(cap), { mat: "brass", angle: 135 });
  return { svg: out, win: win.map((w) => gv(w)) };
}
export const ggCentre = () => gv(K.rect(-ROT.bore, GG.bodyBot + 8.4, ROT.bore, GG.bodyTop - 6));
// 11 O-RINGS above and below the ports' plane, in the rotor's grooves
export const ORING_Z = [16, -11];
export const ORING = { R: 16.55, r: 1.4, groove: [15.1, 1.6] };
export function orings(V) {
  let out = "";
  for (const z of ORING_Z) for (const sg of [-1, 1]) out += K.cut(V, gv(K.circle(sg * ORING.R, z, ORING.r, 12)), { mat: "solid" });
  return part(11, out);
}
// 13 SHAFT AND HANDLE: the shaft from the rotor up through the cover and the floorboard to the handle
export function shaftHandle(V, theta) {
  const s = 4.75;
  void theta;
  const shaft = [[-s, GG.bodyTop - 1], [s, GG.bodyTop - 1], [s, GG.handle], [-s, GG.handle]];
  return part(13, K.body(V, gv(shaft)));
}
// the handle above the floor, out of the plane: phantom, its reach along the plane foreshortened
export function handlePhantom(V, theta) {
  const reach = 58 * Math.cos((theta - M.PORT_ANGLE.L) * rad);
  const hub = [[-11, GG.handle], [11, GG.handle], [11, GG.handle + 12], [-11, GG.handle + 12]];
  const arm = [[0, GG.handle + 3], [reach, GG.handle + 3], [reach, GG.handle + 10], [0, GG.handle + 10]];
  return K.line(V, gv(hub), "phan", true) + (Math.abs(reach) > 12 ? K.line(V, gv(arm), "phan", true) : "");
}
// 12 DETENT: a ball pressed by a spring in the cover into the rotor's top, one dimple per position
export function detent(V) {
  const x = 12;
  return part(12, K.body(V, gv(K.circle(x, GG.bodyTop + 1.6, 2.4, 14))) + K.springSection(V, { from: GG.bodyTop + 4, to: GG.bodyTop + GG.cover, radius: 1.7, wire: 0.5, turns: 3, axis: "v", at: -x }));
}
export function coverPlate(V) {
  // part of the body (9): the cover bolted on its top, with the detent's pocket
  const c = [[-SEL.boss, GG.bodyTop], [SEL.boss, GG.bodyTop], [SEL.boss, GG.bodyTop + GG.cover], [-SEL.boss, GG.bodyTop + GG.cover]];
  void c;
  const pieces = [
    [[-SEL.boss, GG.bodyTop], [-4.9, GG.bodyTop], [-4.9, GG.bodyTop + GG.cover], [-SEL.boss, GG.bodyTop + GG.cover]],
    [[4.9, GG.bodyTop], [9.4, GG.bodyTop], [9.4, GG.bodyTop + GG.cover - 1], [14.6, GG.bodyTop + GG.cover - 1], [14.6, GG.bodyTop], [SEL.boss, GG.bodyTop], [SEL.boss, GG.bodyTop + GG.cover], [4.9, GG.bodyTop + GG.cover]],
  ];
  return part(9, pieces.map((q) => K.cut(V, gv(q), { mat: "alu", angle: 135 })).join(""));
}
export const floorG = () => [[-60, GG.floor[0]], [60, GG.floor[0]], [60, GG.floor[1]], [-60, GG.floor[1]]];

// ================================================================ SECTION D-D: the strainer (x, z)
// z = 0 is the casting's lower face, the bowl hangs below it. Drillings: the inlet from the left, down
// into the bowl outside the screen; the outlet from the centre, up inside the screen, out to the right;
// the primer's tapping off the outlet, up through the top.
export const GS = { w: 36, top: 34, spig: 33, spigBot: -10, zc: 22, r: 3.88, xi: -20, cp: 5, xp: 14, rp: 1.6 };
export function castingPieces() {
  const g = GS;
  const groove = (sg) => [[sg * 29, g.spigBot], [sg * 29, -7.5], [sg * 26.2, -7.5], [sg * 26.2, g.spigBot]];
  const left = [[-g.w, g.zc - g.r], [g.xi - g.r, g.zc - g.r], [g.xi - g.r, g.spigBot], ...groove(-1).reverse(), [-g.spig, g.spigBot], [-g.spig, 0], [-g.w, 0]];
  const mid = [[-g.w, g.zc + g.r], [g.xi + g.r, g.zc + g.r], [g.xi + g.r, g.spigBot], [-g.cp, g.spigBot], [-g.cp, g.zc + g.r], [g.xp - g.rp, g.zc + g.r], [g.xp - g.rp, g.top], [-g.w + 2, g.top], [-g.w, g.top - 2]];
  const topR = [[g.xp + g.rp, g.zc + g.r], [g.w, g.zc + g.r], [g.w, g.top - 2], [g.w - 2, g.top], [g.xp + g.rp, g.top]];
  const right = [[g.cp, g.spigBot], [g.cp, g.zc - g.r], [g.w, g.zc - g.r], [g.w, 0], [g.spig, 0], [g.spig, g.spigBot], ...groove(1)];
  return [left, mid, topR, right];
}
// the passages (for the fuel): inlet, down-drilling, centre, outlet, primer tapping
export function castingPassages() {
  const g = GS;
  return [
    [[-g.w - 0.6, g.zc - g.r], [g.xi + g.r, g.zc - g.r], [g.xi + g.r, g.zc + g.r], [-g.w - 0.6, g.zc + g.r]],
    [[g.xi - g.r, g.spigBot - 0.6], [g.xi + g.r, g.spigBot - 0.6], [g.xi + g.r, g.zc - g.r + 0.01], [g.xi - g.r, g.zc - g.r + 0.01]],
    [[-g.cp, g.spigBot - 0.6], [g.cp, g.spigBot - 0.6], [g.cp, g.zc + g.r], [-g.cp, g.zc + g.r]],
    [[g.cp - 0.01, g.zc - g.r], [g.w + 0.6, g.zc - g.r], [g.w + 0.6, g.zc + g.r], [g.cp - 0.01, g.zc + g.r]],
    [[g.xp - g.rp, g.zc + g.r - 0.01], [g.xp + g.rp, g.zc + g.r - 0.01], [g.xp + g.rp, g.top + 0.6], [g.xp - g.rp, g.top + 0.6]],
  ];
}
export function casting(V) {
  return part(16, castingPieces().map((p) => K.cut(V, p, { mat: "alu", angle: 45 })).join(""));
}
// bodies of revolution about the strainer's axis: half-profiles [r, z]
export const BOWL_PROFILE = [[26.5, -10], [32.8, -10], [32.8, -12.5], [29, -12.5], [29, -84], [27, -86], [8, -86], [8, -94], [5, -94], [5, -82], [26.5, -82]];
export const GASKET_PROFILE = [[26.2, -10], [29, -10], [29, -7.5], [26.2, -7.5]];
export const NUT_PROFILE = [[29.2, -15.5], [37, -15.5], [37, -1], [33.05, -1], [33.05, -12.5], [29.2, -12.5]];
export const SCREEN_RING = [[9, -14], [13.6, -14], [13.6, -10], [9, -10]];
export const SCREEN_CAP = [[0, -60], [13.6, -60], [13.6, -58], [0, -58]];
export const SCREEN_MESH = { r0: 12.8, r1: 13.2, z0: -58, z1: -14 };
export const BOWL_IN = { r: 26.5, z0: -82, z1: -10 };
export function bowl(V) {
  return part(17, K.section(V, { ...K.revolve(BOWL_PROFILE), edges: [] }, { mat: "alu", angle: 135 }));
}
export function gasket(V) {
  return part(19, K.section(V, { ...K.revolve(GASKET_PROFILE), edges: [] }, { mat: "solid" }));
}
export function nut(V) {
  return part(20, K.section(V, { ...K.revolve(NUT_PROFILE), edges: [] }, { mat: "alu", angle: 45 }));
}
export function screen(V) {
  const m = SCREEN_MESH;
  let mesh = "";
  for (const sg of [-1, 1]) {
    const n = 9;
    for (let i = 0; i < n; i++) {
      const z0 = m.z0 + (i * (m.z1 - m.z0)) / n;
      mesh += K.cut(V, K.rect(sg > 0 ? m.r0 : -m.r1, z0 + 0.8, sg > 0 ? m.r1 : -m.r0, z0 + (m.z1 - m.z0) / n - 0.8), { mat: "solid" });
    }
  }
  return part(18, K.section(V, { ...K.revolve(SCREEN_RING), edges: [] }, { mat: "brass", angle: 135 }) + K.section(V, { ...K.revolve(SCREEN_CAP), edges: [] }, { mat: "brass", angle: 135 }) + mesh + K.springSection(V, { from: -82, to: -60, radius: 9.5, wire: 1.2, turns: 5, axis: "v", at: 0 }));
}
// 21 DRAIN VALVE: a brass body screwed into the bowl's boss; a poppet seals on the floor from inside,
// held down by a spring under the body; the cable from the cabin pushes it up, open, by DRN.stroke
export const DRN = { stroke: 2.6 };
export const DRAIN_BODY = [[3.4, -86.5], [4.95, -86.5], [4.95, -94], [9.5, -94], [9.5, -104], [3.4, -104]];
export function drainValve(V, open) {
  const dz = DRN.stroke * open;
  const body = K.section(V, { ...K.revolve(DRAIN_BODY), edges: [] }, { mat: "brass", angle: 45 });
  const head = [[-6.5, -81.2 + dz], [6.5, -81.2 + dz], [6.5, -78.6 + dz], [-6.5, -78.6 + dz]];
  const seal = [[-6.2, -82 + dz], [6.2, -82 + dz], [6.2, -81.2 + dz], [-6.2, -81.2 + dz]];
  const stem = [[-1.6, -116 + dz], [1.6, -116 + dz], [1.6, -81.2 + dz], [-1.6, -81.2 + dz]];
  const collar = [[-4.6, -119 + dz], [4.6, -119 + dz], [4.6, -116 + dz], [-4.6, -116 + dz]];
  return part(21, body + K.body(V, stem) + K.body(V, head) + K.cut(V, seal, { mat: "solid" }) + K.body(V, collar) + K.springSection(V, { from: -116 + dz, to: -104, radius: 3.6, wire: 0.6, turns: 4, axis: "v", at: 0 }));
}
// the drain's bore round the stem, for the fuel (and the water first)
export const drainBore = () => [[-3.4, -104], [3.4, -104], [3.4, -86.5], [5, -86.5], [5, -82], [-5, -82], [-5, -86.5], [-3.4, -86.5]];
// the fittings and lines at the ports: from the shut-off on the left (14), to the carburettor (22)
export function gsFitting(V, sg) {
  const g = GS;
  const x0 = sg * g.w;
  const x1 = sg * (g.w + 13);
  const f = (s) => [[x0, g.zc + s * g.r], [x1, g.zc + s * g.r], [x1, g.zc + s * 7.5], [x0 + sg * 3, g.zc + s * 7.5], [x0 + sg * 3, g.zc + s * 6], [x0, g.zc + s * 6]];
  return K.cut(V, f(1), { mat: "steel", angle: 135 }) + K.cut(V, f(-1), { mat: "steel", angle: 135 });
}
export const gsLine = (sg) => [[sg * (GS.w + 13), GS.zc], [sg * (GS.w + 19), GS.zc]];

// ================================================================ SECTION E-E: the primer (s, r)
// The valve block (s −30…0) with the chamber in its face, the inlet check below and the outlet check
// above on one axis (s = PORT_S); the barrel (0…65) through the panel; the gland; the plunger and knob.
export const PR = { block: [-30, 0], bh: 14, barrel: [0, 65], ro: 10, ri: M.PRIMER.bore / 2, panel: [45, 47.5], nut: [39, 45], gland: [65, 75], head: 12, rod: 3.2, knob: [77, 102], kr: 12.5 };
export const PORT_S = -14;
const PD = { cav: 3.2, seat: 1.6, pass: 1.6, inSeat: -11, outSeat: 8 };
// the passages: inlet seat hole and cavity below, the cross passage to the chamber, outlet above
export function primerPassages(x) {
  const p = PR;
  const S = PORT_S;
  return [
    [[S - PD.seat, -p.bh - 0.6], [S + PD.seat, -p.bh - 0.6], [S + PD.seat, PD.inSeat], [S - PD.seat, PD.inSeat]],
    [[S - PD.cav, PD.inSeat - 0.01], [S + PD.cav, PD.inSeat - 0.01], [S + PD.cav, -PD.pass], [S - PD.cav, -PD.pass]],
    [[S - PD.cav, -PD.pass], [-8 + 0.01, -PD.pass], [-8 + 0.01, PD.pass], [S - PD.cav, PD.pass]],
    [[S - PD.seat, PD.pass - 0.01], [S + PD.seat, PD.pass - 0.01], [S + PD.seat, PD.outSeat], [S - PD.seat, PD.outSeat]],
    [[S - PD.cav, PD.outSeat - 0.01], [S + PD.cav, PD.outSeat - 0.01], [S + PD.cav, p.bh + 0.6], [S - PD.cav, p.bh + 0.6]],
    [[-8, -p.ri], [1 + x, -p.ri], [1 + x, p.ri], [-8, p.ri]],
  ];
}
export function primerBody(V) {
  const p = PR;
  const block = [[p.block[0], -p.bh], [p.block[1], -p.bh], [p.block[1], p.bh], [p.block[0], p.bh]];
  const barrel = (sg) => [[p.barrel[0], sg * p.ri], [p.barrel[1], sg * p.ri], [p.barrel[1], sg * p.ro], [p.barrel[0], sg * p.ro]];
  const gland = (sg) => [[p.gland[0], sg * (p.rod + 0.1)], [p.gland[1], sg * (p.rod + 0.1)], [p.gland[1], sg * (p.ro + 1.5)], [p.gland[0] - 6, sg * (p.ro + 1.5)], [p.gland[0] - 6, sg * p.ro], [p.gland[0], sg * p.ro]];
  const pass = primerPassages(0).slice(0, 5);
  const walls = pass.map((q) => K.line(V, [q[0], q[3]]) + K.line(V, [q[1], q[2]])).join("");
  return part(
    24,
    K.cut(V, block, { mat: "brass", angle: 45 }) +
      paper(V, [[-8, -p.ri], [0.4, -p.ri], [0.4, p.ri], [-8, p.ri]]) +
      pass.map((q) => paper(V, q)).join("") +
      [1, -1].map((sg) => K.cut(V, barrel(sg), { mat: "brass", angle: 45 }) + K.cut(V, gland(sg), { mat: "brass", angle: 135 })).join("") +
      walls +
      K.line(V, [[-8, -p.ri], [-8, -PD.pass]]) + K.line(V, [[-8, PD.pass], [-8, p.ri]])
  );
}
// the panel nut (with the body) and the panel itself (phantom)
export function primerNut(V) {
  return part(24, [1, -1].map((sg) => K.cut(V, [[PR.nut[0], sg * PR.ro], [PR.nut[1], sg * PR.ro], [PR.nut[1], sg * 16], [PR.nut[0], sg * 16]], { mat: "steel", angle: 135 })).join(""));
}
export const panelPts = () => [[PR.panel[0], -30], [PR.panel[1], -30], [PR.panel[1], 30], [PR.panel[0], 30]];
// 25 PLUNGER: the piston head with its O-ring, the rod through the gland, the knob; out by x mm
export function plunger(V, x) {
  const p = PR;
  const h0 = 1 + x;
  const head = [[h0, -p.ri + 0.05], [h0 + p.head, -p.ri + 0.05], [h0 + p.head, p.ri - 0.05], [h0, p.ri - 0.05]];
  const rod = [[h0 + p.head, -p.rod], [p.knob[0] + x, -p.rod], [p.knob[0] + x, p.rod], [h0 + p.head, p.rod]];
  const knob = K.rrect(p.knob[0] + x, -p.kr, p.knob[1] + x, p.kr, 4);
  const ring = (sg) => K.circle(h0 + p.head / 2, sg * (p.ri - 1.5), 1.4, 12);
  return part(25, K.body(V, head) + K.body(V, rod) + K.cut(V, knob, { mat: "plastic", angle: 45 }) + K.cut(V, ring(1), { mat: "solid" }) + K.cut(V, ring(-1), { mat: "solid" }));
}
// 26 CHECK VALVES: each a ball on its seat; the outlet's held by a light spring. lift 0..1
export const BALL_R = 2.38;
const BALL_REST = Math.sqrt(BALL_R ** 2 - PD.seat ** 2);
export const ballZ = (inlet, lift) => (inlet ? PD.inSeat : PD.outSeat) + BALL_REST + lift * 1.4;
export function checkBalls(V, liftIn, liftOut) {
  const ball = (z) => K.body(V, K.circle(PORT_S, z, BALL_R, 16));
  const zo = ballZ(false, liftOut);
  return part(26, ball(ballZ(true, liftIn)) + ball(zo) + K.springSection(V, { from: zo + BALL_R, to: PR.bh + 5, radius: 1.8, wire: 0.5, turns: 3, axis: "v", at: PORT_S }));
}
// 27 PRIMER LINES: Ø3.18 tubes with their nuts in the block's ports
export function primerLines(V) {
  const nutP = (sg) => [[PORT_S - 6, sg * PR.bh], [PORT_S + 6, sg * PR.bh], [PORT_S + 6, sg * (PR.bh + 8)], [PORT_S - 6, sg * (PR.bh + 8)]];
  const holeP = (sg) => [[PORT_S - 1.6, sg * PR.bh], [PORT_S + 1.6, sg * PR.bh], [PORT_S + 1.6, sg * (PR.bh + 8.6)], [PORT_S - 1.6, sg * (PR.bh + 8.6)]];
  return part(27, [1, -1].map((sg) => cutHoles(V, nutP(sg), [], { mat: "steel", angle: 135 }) + paper(V, holeP(sg))).join("") + tubeCut(V, [[PORT_S, PR.bh + 8], [PORT_S, PR.bh + 14]], 1.59, 1.0) + tubeCut(V, [[PORT_S, -PR.bh - 8], [PORT_S, -PR.bh - 14]], 1.59, 1.0));
}
export const primerLineBores = () => [[[PORT_S - 1, PR.bh], [PORT_S + 1, PR.bh], [PORT_S + 1, PR.bh + 14], [PORT_S - 1, PR.bh + 14]], [[PORT_S - 1, -PR.bh - 14], [PORT_S + 1, -PR.bh - 14], [PORT_S + 1, -PR.bh], [PORT_S - 1, -PR.bh]]];
export const panelHalf = 30;

// ================================================================ VIEW F: the dual gauge (x, y), and its needles
// Each needle pivots below the centre and sweeps its own side, E low to F high.
export const GAUGE = { r: 25.4, a0: 0, a1: 80, len: 14, pivot: [2.5, -9] };
export const gaugeAt = (sg, frac, r) => {
  const a = (GAUGE.a0 + (GAUGE.a1 - GAUGE.a0) * Math.min(1, Math.max(0, frac))) * rad;
  const c = [sg * GAUGE.pivot[0], GAUGE.pivot[1]];
  return [c[0] + sg * r * Math.cos(a), c[1] + r * Math.sin(a)];
};
export function gaugeNeedles(V, fl, fr) {
  const pv0 = (sg) => [sg * GAUGE.pivot[0], GAUGE.pivot[1]];
  const one = (sg, f) => K.cut(V, strip([pv0(sg), gaugeAt(sg, f, GAUGE.len)], 0.6, 0.6), { mat: "solid" });
  return one(-1, fl) + one(1, fr) + K.body(V, K.circle(...pv0(1), 1.6, 12)) + K.body(V, K.circle(...pv0(-1), 1.6, 12));
}
