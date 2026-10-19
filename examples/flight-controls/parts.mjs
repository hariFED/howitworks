// The flight controls' parts, drawn in the pictorial views. Every point is an (FS, BL, WL) of the
// aircraft (model.mjs's arrangement) projected by the view's own projection (V.pr, see proj()): the
// airframe is phantom (adjacent parts), the control parts are bodies, the cables the accent. The main view
// and Detail E draw the same parts from the same code, each from its own direction and scale; the page
// redraws them from the model every frame. The flat details (sections A-A, D-D, details B, C) are in
// details.mjs.

import * as K from "../../kit/draft.mjs";
import * as A from "../light-aircraft/model.mjs";
import * as M from "./model.mjs";
import * as X from "./extra.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const rad = Math.PI / 180;
const { sub, add, mul, cross, norm } = M.V3;

// ================================================================ the pictorial projections
// A pictorial view turns AZ about the vertical and looks down EL: u (sheet right) = FS·cos AZ + BL·sin AZ;
// depth w = −FS·sin AZ + BL·cos AZ (+ away); v = WL·cos EL + w·sin EL. The main view looks from above,
// behind and well to the left (the aircraft's length across the sheet); Detail E from further behind, so
// the control wheels and the pedals face the reader.
export function proj(az, el) {
  const ca = Math.cos(az * rad);
  const sa = Math.sin(az * rad);
  const ce = Math.cos(el * rad);
  const se = Math.sin(el * rad);
  return {
    az,
    el,
    pv: ([fs, bl, wl]) => [fs * ca + bl * sa, wl * ce + (-fs * sa + bl * ca) * se],
    depth: ([fs, bl, wl]) => (-fs * sa + bl * ca) * ce - wl * se, // larger is farther
  };
}
export const PROJ = proj(22, 24);
export const PROJ_E = proj(55, 20);
export const pv = PROJ.pv;
const PR = (V) => V?.pr ?? PROJ;
export const toV = (pts, V) => pts.map(PR(V).pv);

// a circle of radius r about centre c, in the plane ⟂ n (3D points)
export function circle3(c, n, r, k = 24) {
  const nn = norm(n);
  const ref = Math.abs(nn[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const e1 = norm(cross(nn, ref));
  const e2 = cross(nn, e1);
  return Array.from({ length: k }, (_, i) => {
    const t = (2 * Math.PI * i) / k;
    return add(c, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t))));
  });
}
// a rod from a to b (world 2D) of radius r, as its outline; a thin web blacked in
export function rodOutline2([ax, ay], [bx, by], r) {
  const len = Math.hypot(bx - ax, by - ay) || 1e-6;
  const nx = (-(by - ay) / len) * r;
  const ny = ((bx - ax) / len) * r;
  return [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
}
export const web = (V, [a, b], t) => K.cut(V, rodOutline2(a, b, t / 2), { mat: "solid" });
// a straight rod of radius r from a to b (3D), as its projected outline
export const rodOutline = (a, b, r, V) => rodOutline2(PR(V).pv(a), PR(V).pv(b), r);
export const rod = (V, a, b, r) => K.body(V, rodOutline(a, b, r, V));
export const hullBody = (V, pts3) => K.body(V, X.hull(toV(pts3, V)));
export const disc3 = (V, c, n, r, k = 16) => K.body(V, toV(circle3(c, n, r, k), V));

// ================================================================ the airframe, phantom (adjacent parts)
const C = A.CABIN;
const TPL = A.TAILPLANE;
// the cabin's rounded-box section at one FS
function cabinRing(fs) {
  const a = C.half;
  const pts = [];
  const corner = (cb, cw, r, a0) => {
    for (let i = 0; i <= 4; i++) {
      const t = (a0 + 22.5 * i) * rad;
      pts.push([fs, cb + r * Math.cos(t), cw + r * Math.sin(t)]);
    }
  };
  corner(a - C.rTop, C.roof - C.rTop, C.rTop, 0);
  corner(-a + C.rTop, C.roof - C.rTop, C.rTop, 90);
  corner(-a + C.rBottom, C.floor + C.rBottom, C.rBottom, 180);
  corner(a - C.rBottom, C.floor + C.rBottom, C.rBottom, 270);
  return pts;
}
const ring = (fs, axisWl, r, k = 32) => circle3([fs, 0, axisWl], [1, 0, 0], r, k);
const closed = (p) => [...p, p[0]];
// wing planform at the mid-plane: LE, TE and the tips, each side
function wingPlan(side) {
  const pts = [];
  for (const ws of [C.half, A.BREAK_WS, A.TIP_WS]) pts.push([A.leAt(ws), side * ws, M.wingWl(ws, 0.25)]);
  for (const ws of [A.TIP_WS, A.BREAK_WS, C.half]) pts.push([A.TE_FS, side * ws, M.wingWl(ws, 1)]);
  return pts;
}
const stabPlan = (side) => [[TPL.le, side * 300, TPL.wl], [TPL.tipLe, (side * TPL.span) / 2, TPL.wl], [TPL.hinge, (side * TPL.span) / 2, TPL.wl], [TPL.hinge, side * 300, TPL.wl]];
export const FIN = { le0: [5350, 1650], le1: [6330, 2720], top1: 6560, rudTop: A.FIN_TOP, rudTe0: 7230, rudTe1: 6900, root: 1560 };
export function airframe(V) {
  const L = [];
  for (const fs of [-860, -600, -300, 0]) L.push(closed(ring(fs, A.COWL.axis, A.cowlR(fs))));
  for (const fs of [0, C.fs1]) L.push(closed(cabinRing(fs)));
  for (const [bl, wl] of [[C.half, C.roof - 40], [-C.half, C.roof - 40], [C.half, C.floor + 60], [-C.half, C.floor + 60], [C.half, C.sill], [-C.half, C.sill]]) L.push([[0, bl, wl], [C.fs1, bl, wl]]);
  for (const s of [-1, 1]) L.push([[0, s * C.half, A.WINDSCREEN.base[1]], [A.WINDSCREEN.top[0], s * C.half, C.roof - 40]]);
  const cf = [C.fs1, 3500, 4600, 5600, A.TAILCONE.fs1];
  for (const fs of cf) L.push(closed(ring(fs, A.TAILCONE.axis, A.coneR(fs), 24)));
  for (const [db, dw] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) L.push(cf.map((fs) => [fs, db * A.coneR(fs), A.TAILCONE.axis + dw * A.coneR(fs)]));
  for (const s of [-1, 1]) {
    L.push(closed(wingPlan(s)));
    for (const [a, b] of [M.AIL_WS, A.FLAP_WS]) L.push([[A.TE_FS, s * a, M.wingWl(a, 1)], [M.HINGE_FS, s * a, M.AIL_HINGE_WL(a)], [M.HINGE_FS, s * b, M.AIL_HINGE_WL(b)], [A.TE_FS, s * b, M.wingWl(b, 1)]]);
    L.push([[1200, s * C.half, C.floor + 120], [1180, s * 2900, M.wingWl(2900, 0.25) - 70]]);
    L.push(stabPlan(s));
  }
  L.push([[FIN.le0[0], 0, FIN.le0[1]], [FIN.le1[0], 0, FIN.le1[1]], [FIN.top1, 0, FIN.le1[1]], [A.RUDDER_HINGE_FS, 0, FIN.le1[1]], [A.RUDDER_HINGE_FS, 0, FIN.root], [FIN.le0[0], 0, FIN.root]]);
  const nw = [A.NOSE_GEAR.fs, 0, A.NOSE_GEAR.tyreD / 2];
  L.push([[A.NOSE_GEAR.fs, 0, 700], nw], closed(circle3(nw, [0, 1, 0], A.NOSE_GEAR.tyreD / 2, 20)));
  for (const s of [-1, 1]) {
    const g = A.MAIN_GEAR;
    const wc = [g.fs, (s * g.track) / 2, g.tyreD / 2];
    L.push([[g.fs, s * 400, C.floor], wc], closed(circle3(wc, [0, 1, 0], g.tyreD / 2, 20)));
  }
  return `<g data-role="phantom">${L.map((p) => K.line(V, toV(p, V), "phan")).join("")}</g>`;
}
// the corners of the aircraft, for sizing the main view
export function extents() {
  const pts = [];
  for (const fs of [-1060, 0, C.fs1]) for (const s of [-1, 1]) pts.push([fs, s * C.half, C.roof], [fs, s * C.half, 0]);
  for (const s of [-1, 1]) pts.push([A.leAt(A.TIP_WS), s * A.TIP_WS, M.wingWl(A.TIP_WS)], [A.TE_FS, s * A.TIP_WS, M.wingWl(A.TIP_WS)], [TPL.te, (s * TPL.span) / 2, TPL.wl]);
  pts.push([FIN.top1, 0, A.FIN_TOP], [FIN.rudTe0, 0, FIN.root], [A.NOSE_GEAR.fs, 0, 0], [A.MAIN_GEAR.fs, A.MAIN_GEAR.track / 2, 0], [A.MAIN_GEAR.fs, -A.MAIN_GEAR.track / 2, 0]);
  return pts;
}

// ================================================================ the control system in the pictorial views
const R = M.PULLEY_D / 2;
// a wedge-section surface hinged on a line: hinge points h0, h1, chord direction at rest cdir (unit),
// chords c0, c1, half-thickness t at the hinge along `up`; turned deg about `axis` through each hinge
// point. Its six corner points (the page draws their projected hull).
function surface(h0, h1, cdir, c0, c1, t, axis, deg, up = [0, 0, 1]) {
  const pts = [];
  for (const [h, c] of [[h0, c0], [h1, c1]]) for (const p of [add(h, mul(up, t)), add(h, mul(up, -t)), add(h, mul(cdir, c))]) pts.push(M.rotAbout(p, h, axis, deg));
  return pts;
}
export const YOKE = [[-130, 150], [-130, -40], [-100, -80], [100, -80], [130, -40], [130, 150], [100, 150], [100, -30], [80, -50], [-80, -50], [-100, -30], [-100, 150]];
// the horn tip of an aileron (side −1 left, +1 right) turned δ (TE up +: a turn about −BL)
export function hornTip(side, dl) {
  const hh = [M.HINGE_FS, side * M.HORN_WS, M.AIL_HINGE_WL(M.HORN_WS)];
  const t = M.rotAbout([hh[0] - M.HORN * Math.sin(M.PSI0 * rad), hh[1], hh[2] + M.HORN * Math.cos(M.PSI0 * rad)], hh, [0, 1, 0], -dl);
  return { hh, t };
}
const rudChord = (wl) => FIN.rudTe0 - A.RUDDER_HINGE_FS + ((FIN.rudTe1 - FIN.rudTe0) * (wl - FIN.root)) / (FIN.rudTop - FIN.root);
// a point on the rudder at chord fraction f and height wl, turned with it (for balloons)
export const rudderPoint = (dr, f, wl) => M.rotAbout([A.RUDDER_HINGE_FS + f * rudChord(wl), 0, wl], [A.RUDDER_HINGE_FS, 0, wl], [0, 0, 1], dr);
// the elevator's stop bolts: where the bellcrank's arms land at full travel (fixed to a frame)
export function stopBolts() {
  const eh = [TPL.hinge, 0, TPL.wl];
  const at = (de, arm) => M.rotAbout([eh[0] - 12, -50, eh[2] + arm], eh, [0, 1, 0], de);
  const s1 = at(-M.ELEV_UP - 4, M.ELEV_ARM * 0.9);
  const s2 = at(M.ELEV_DOWN + 4, -M.ELEV_ARM * 0.9);
  return [[add(s1, [-60, 0, 0]), s1], [add(s2, [-60, 0, 0]), s2]];
}
// a steering bungee: from a lug under the pedal tube (moving with the pedals) to the nose gear's horn
export function bungeeEnds(s, yw) {
  return [[M.PED.fs + (s * yw.s * 60) / M.PED_ARM, s * M.PED.bl, M.PED.wl - 60], [M.NOSE_HORN.fs, s * M.NOSE_HORN.bl, M.NOSE_HORN.wl]];
}
// The control parts for one solved state sol and pose ps, as depth-sorted pieces { id, d, svg }.
export function controls(V, sol, ps) {
  const out = [];
  const pr = PR(V);
  const put = (id, pts3, svg) => out.push({ id, d: pts3.reduce((s, p) => s + pr.depth(p), 0) / pts3.length, svg });
  const { r, pt, yw } = sol;
  const eh = [TPL.hinge, 0, TPL.wl];
  // 1 wheels, 2 columns, 3 panel bearings, 4 sprockets, 5 chains, 14 push tubes
  for (const s of [-1, 1]) {
    const hub = [M.WHEEL.fs + pt.x, s * M.WHEEL.bl, M.WHEEL.wl];
    // wheel right: the top of the wheel moves to starboard (+BL), a turn about −FS
    const yp = YOKE.map(([b, w]) => M.rotAbout([hub[0], hub[1] + b, hub[2] + w - 40], hub, [-1, 0, 0], r.theta));
    put(1, yp, K.body(V, toV(yp, V)) + disc3(V, hub, [1, 0, 0], 26));
    const fwd = [M.COLUMN.fwd + pt.x, s * M.WHEEL.bl, M.WHEEL.wl];
    put(2, [hub, fwd], rod(V, hub, fwd, M.COLUMN.r));
    const brg = [M.PANEL_FS, s * M.WHEEL.bl, M.WHEEL.wl];
    put(3, [brg], disc3(V, brg, [1, 0, 0], 30));
    const sc = [M.SPR.fs, s * M.WHEEL.bl, M.WHEEL.wl];
    const marks = [0, 90, 180, 270].map((a) => pr.pv(M.rotAbout([sc[0], sc[1], sc[2] + M.R_SPR - 2], sc, [-1, 0, 0], a + r.theta)));
    put(4, [sc], disc3(V, sc, [1, 0, 0], M.R_SPR + 3, 24) + K.lines(V, [[marks[0], marks[2]], [marks[1], marks[3]]], "thin"));
    const ends = s < 0 ? [ps.chain.LL, ps.chain.LR] : [ps.chain.RL, ps.chain.RR];
    put(5, ends, ends.map((e) => rod(V, [e[0], e[1], M.WHEEL.wl], e, 4.8)).join(""));
    const lug = [M.COLUMN.collar + pt.x, s * M.COLUMN.lug, M.WHEEL.wl];
    const tip = s < 0 ? ps.idler.rodL : ps.idler.rodR;
    put(14, [lug, tip], rod(V, lug, tip, 7) + rod(V, [lug[0], s * M.WHEEL.bl, lug[2]], lug, 9));
  }
  // 15 the idler: cross shaft, rod arms, cable arms
  {
    const io = ps.idler.o;
    const a = [io[0], -M.IDLER.bl, io[2]];
    const b = [io[0], M.IDLER.bl, io[2]];
    const arms = [[a, ps.idler.rodL], [b, ps.idler.rodR]].map(([p, q]) => rod(V, p, q, 8)).join("");
    const mid = [ps.idler.aft[0], -40, ps.idler.aft[2]];
    put(15, [a, b], rod(V, a, b, 12) + arms + rod(V, ps.idler.fwd, mid, 9) + rod(V, mid, ps.idler.aft, 6));
  }
  // 11 bellcranks, 12 rods, 13 ailerons (with horns)
  for (const [side, bc, dl] of [[-1, ps.bcL, r.left], [1, ps.bcR, r.right]]) {
    put(11, [bc.o], hullBody(V, [...circle3(bc.o, [0, 0, 1], 14, 10), bc.aft, bc.fwd, bc.rod]));
    const { hh, t } = hornTip(side, dl);
    put(12, [bc.rod, t], rod(V, bc.rod, t, 6));
    const [w0, w1] = M.AIL_WS;
    const h0 = [M.HINGE_FS, side * w0, M.AIL_HINGE_WL(w0)];
    const h1 = [M.HINGE_FS, side * w1, M.AIL_HINGE_WL(w1)];
    const sp = surface(h0, h1, [1, 0, 0], A.TE_FS - M.HINGE_FS, A.TE_FS - M.HINGE_FS, 28, [0, 1, 0], -dl);
    put(13, sp, hullBody(V, sp) + rod(V, hh, t, 5));
  }
  // 17 elevator bellcrank, 18 stop bolts, 19 elevator, 29 tab, 27 actuator, 28 trim rod
  {
    const up = [ps.ebc.up[0], -50, ps.ebc.up[2]];
    const dn = [ps.ebc.down[0], -50, ps.ebc.down[2]];
    put(17, [up, dn], rod(V, up, dn, 9) + disc3(V, [eh[0], -50, eh[2]], [0, 1, 0], 16, 12));
    for (const q of stopBolts()) put(18, q, rod(V, q[0], q[1], 9));
    const ch = TPL.te - TPL.hinge;
    const tipCh = TPL.tipTe - TPL.hinge;
    for (const s of [-1, 1]) {
      const sp = surface([TPL.hinge, s * 250, TPL.wl], [TPL.hinge, (s * TPL.span) / 2, TPL.wl], [1, 0, 0], ch, tipCh, 30, [0, 1, 0], pt.de);
      put(19, sp, hullBody(V, sp));
    }
    put(19, [[eh[0], -250, eh[2]], [eh[0], 250, eh[2]]], rod(V, [eh[0], -250, eh[2]], [eh[0], 250, eh[2]], 16));
    // the tab on the port elevator's trailing edge: its hinge turns with the elevator
    const th0 = ps.elv([M.TAB.fs, M.TAB.bl[0], TPL.wl]);
    const th1 = ps.elv([M.TAB.fs, M.TAB.bl[1], TPL.wl]);
    const cd = norm(sub(ps.elv([TPL.te, 0, TPL.wl]), ps.elv([TPL.hinge, 0, TPL.wl])));
    const upE = M.rotAbout([0, 0, 1], [0, 0, 0], [0, 1, 0], pt.de);
    const tp = surface(th0, th1, cd, M.TAB_CHORD, M.TAB_CHORD, 5, [0, 1, 0], sol.tab, upE);
    put(29, tp, hullBody(V, tp));
    const a0 = ps.elv([TPL.hinge + M.ACT.u, M.ACT.bl, TPL.wl + M.ACT.v]);
    const a1 = ps.elv([TPL.hinge + M.ACT.u + M.ACT.len, M.ACT.bl, TPL.wl + M.ACT.v]);
    put(27, [a0, a1], rod(V, a0, a1, 12));
    const ht = M.rotAbout(ps.elv([M.TAB.fs, M.ACT.bl, TPL.wl - M.TAB_HORN]), ps.elv([M.TAB.fs, M.ACT.bl, TPL.wl]), [0, 1, 0], sol.tab);
    const nut = ps.elv([TPL.hinge + M.ACT.u + M.ACT.len - M.nutFor(sol.tab), M.ACT.bl, TPL.wl + M.ACT.v]);
    put(28, [nut, ht], rod(V, nut, ht, 4));
  }
  // 20 pedals, 24 bungees
  {
    const tube = [[M.PED.fs, -470, M.PED.wl], [M.PED.fs, 470, M.PED.wl]];
    const pedal = (bl, dy) => {
      const base = [M.PED.fs, bl, M.PED.wl];
      const top = [M.PED.fs - dy, bl, M.PED.wl + Math.sqrt(M.PED_PAD ** 2 - dy * dy)];
      return rod(V, base, top, 7) + hullBody(V, [add(top, [0, -45, -30]), add(top, [0, 45, -30]), add(top, [-20, 45, 30]), add(top, [-20, -45, 30])]);
    };
    let svg = rod(V, tube[0], tube[1], 12);
    for (const bl of [-450, 290]) svg += pedal(bl, -yw.y); // the left pedals, both seats
    for (const bl of [-290, 450]) svg += pedal(bl, yw.y); // the right pedals: forward by y
    svg += rod(V, [M.PED.fs, -M.PED.bl, M.PED.wl], ps.ped.L, 6) + rod(V, [M.PED.fs, M.PED.bl, M.PED.wl], ps.ped.R, 6);
    put(20, tube, svg);
    for (const s of [-1, 1]) {
      const b = bungeeEnds(s, yw);
      put(24, b, rod(V, b[0], b[1], 9));
    }
  }
  // 22 rudder horn, 23 rudder
  {
    const rh = [M.RUD_HORN.fs, 0, M.RUD_HORN.wl];
    put(22, [ps.horn.L, ps.horn.R], rod(V, ps.horn.L, ps.horn.R, 9) + disc3(V, rh, [0, 0, 1], 18, 12));
    const sp = surface([A.RUDDER_HINGE_FS, 0, FIN.root], [A.RUDDER_HINGE_FS, 0, FIN.rudTop], [1, 0, 0], FIN.rudTe0 - A.RUDDER_HINGE_FS, FIN.rudTe1 - A.RUDDER_HINGE_FS, 32, [0, 0, 1], yw.dr, [0, 1, 0]);
    put(23, sp, hullBody(V, sp));
  }
  // 25 trim wheel and drum
  {
    const c = [M.TRIM.fs, 0, M.TRIM.wl];
    const sp = [0, 60, 120].map((a) => {
      const p = M.rotAbout([c[0], 0, c[2] + M.TRIM_WHEEL_D / 2 - 6], c, [0, 1, 0], a + sol.trimTurns * 360);
      return [pr.pv(p), pr.pv(M.rotAbout(p, c, [0, 1, 0], 180))];
    });
    const drum = [M.TRIM.fs, M.TRIM.drumBl, M.TRIM.wl];
    put(25, [c, drum], disc3(V, c, [0, 1, 0], M.TRIM_WHEEL_D / 2, 28) + K.lines(V, sp, "thin") + rod(V, c, drum, 8) + disc3(V, drum, [0, 1, 0], M.TRIM_DRUM_R));
  }
  return out;
}
// the fixed pulleys, from the rest pose's routes (each one's plane from the cable's way in and out)
export function pulleyPlanes() {
  const sol = M.solve(M.state());
  const ps = M.pose(sol);
  const seen = new Map();
  for (const [, run] of M.cables(ps, sol)) for (const w of run.wraps) seen.set(w.name, w);
  return [...seen.values()];
}
export const pulleys = (V, planes) => part(7, planes.map((w) => disc3(V, w.c, w.axis, R, 20)).join(""));
// a point at arc length l along a polyline, and the unit direction there
export function along(pts, l) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(...sub(pts[i], pts[i - 1]));
    if (acc + seg >= l || i === pts.length - 1) {
      const t = Math.min(1, Math.max(0, (l - acc) / (seg || 1)));
      return { p: add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), t)), dir: norm(sub(pts[i], pts[i - 1])) };
    }
    acc += seg;
  }
  return { p: pts[0], dir: [1, 0, 0] };
}
// the cables: one accent path per run, its part number by system
export const CABLE_PART = { ail: 6, elev: 16, rud: 21, trim: 26 };
export const cablePaths = (V, runs, pre = "cab") => runs.map(([name, run]) => part(CABLE_PART[name.split("-")[0]], `<path class="cable" id="${pre}-${name}" d="${K.d(V, toV(run.pts, V), false)}"/>`)).join("");
// turnbuckles ride on the cables: [run, arc length from its start at rest]
export const TURNBUCKLES = [["ail-B", 3100], ["elev-U", 2300], ["elev-D", 2400], ["rud-L", 2250], ["rud-R", 2250], ["trim-A", 2000], ["trim-B", 2150]];
export function turnbucklePos(runs) {
  const by = Object.fromEntries(runs.map(([n, r, t]) => [n, [r, t]]));
  return TURNBUCKLES.map(([name, l]) => {
    const [run, t] = by[name];
    return along(run.pts, l - t);
  });
}
export const turnbuckles = (V, runs) => part(10, turnbucklePos(runs).map(({ p, dir }) => rod(V, add(p, mul(dir, -34)), add(p, mul(dir, 34)), 7)).join(""));
// fairleads: where the tail cables pass the bulkheads
export function fairleadPoints(runs) {
  const hits = [];
  for (const fs of M.BULKHEADS)
    for (const [name, run] of runs) {
      if (!/^(elev|rud|trim)/.test(name)) continue;
      const pts = run.pts;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        if ((a[0] - fs) * (b[0] - fs) <= 0 && a[0] !== b[0]) hits.push(add(a, mul(sub(b, a), (fs - a[0]) / (b[0] - a[0]))));
      }
    }
  return hits;
}
export const fairleads = (V, runs) => part(9, fairleadPoints(runs).map((h) => disc3(V, h, [1, 0, 0], 11, 10)).join("") + [M.ROOT_FAIRLEAD, M.mirror(M.ROOT_FAIRLEAD)].map((h) => disc3(V, h, [0, 1, 0], 11, 10)).join(""));
