// The flap system's parts, drawn into the sheet's views. World geometry is in the model's frames
// (model.mjs): the section (x aft, y up, at the inboard track, WS 760), the plan (x aft, w = WS to
// starboard), the actuator's own frame (a along the screw from the mount pin, q across, + aft) and the
// selector's (u, v about its pivot). Each view maps its frame onto the sheet's (u, v):
//   SECTION A-A, looking inboard on the starboard wing:  u = −x (nose right), v = y
//   PLAN, nose up:                                       u = w (starboard right), v = −x
//   SECTION C-C through the actuator, from above:        u = a (outboard right), v = −q (forward up)
// Moving parts are functions of the state, re-drawn each frame by live.js.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";
import * as X from "./extra.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
export const sec = (pts) => pts.map(([x, y]) => [-x, y]);
export const pln = (pts) => pts.map(([x, w]) => [w, -x]);
export const act = (pts) => pts.map(([a, q]) => [a, -q]);
const rad = Math.PI / 180;
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
// a skin drawn at least `min` sheet units thick so it reads at the view's scale
const tVis = (V, t, min = 0.95) => Math.max(t, min / V.k);

// ---------------------------------------------------------------- SECTION: the fixed wing
export const X_BREAK = 788; // the section is broken off ahead of here
const SA = M.SPAR.aft;
export const upperPath = (x0, x1, n = 30) => range(x0, x1, n).map((x) => [x, M.up(x)]);
export const lowerPath = (x0, x1, n = 30) => range(x0, x1, n).map((x) => [x, M.lo(x)]);
// the rear spar: web and two flanges, 1.6 mm: blacked in
export function sparPts(V) {
  const t = tVis(V, M.SPAR.web, 0.9);
  const sk = tVis(V, M.SKIN);
  const yTop = M.up(SA) - sk;
  const yBot = M.lo(SA) + sk;
  const web = [[SA - t, yBot], [SA, yBot], [SA, yTop], [SA - t, yTop]];
  const fu = X.band(upperPath(SA - M.SPAR.flange, SA, 4).map(([x, y]) => [x, y - sk]), t);
  const fl = X.band(lowerPath(SA, SA - M.SPAR.flange, 4).map(([x, y]) => [x, y + sk]), t);
  return [web, fu, fl];
}
export function spar(V) {
  return part(1, sparPts(V).map((p) => K.cut(V, sec(p), { mat: "solid" })).join(""));
}
// the upper skin and its shroud, with the lip doubler; the lower skin to the cove's lower lip
export const COVE_LIP = SA + 5;
export function upperSkin(V) {
  const t = tVis(V, M.SKIN);
  const skin = X.band(upperPath(X_BREAK, M.LIP_X, 40), t);
  const dbl = X.band(upperPath(M.LIP_X - 24, M.LIP_X, 6).map(([x, y]) => [x, y - t]), tVis(V, 1.0, 0.7));
  return part(2, K.cut(V, sec(skin), { mat: "solid" }) + K.cut(V, sec(dbl), { mat: "solid" }));
}
// the cove panel: 7 mm off the flap's nose at 0°, from the lower lip up into the shroud
export const COVE = (() => {
  const [cx, cy] = M.NOSE_C;
  const a = M.FLAP.a + 7;
  const bu = M.flapUp(cx) - cy + 7;
  const bl = cy - M.lo(cx) + 7;
  const pts = [];
  for (let t = -160; t >= -262; t -= 6) {
    const r = t * rad;
    const p = [cx + a * Math.cos(r), cy + (Math.sin(r) < 0 ? bl : bu) * Math.sin(r)];
    if (p[1] >= M.up(p[0]) - M.SKIN - 0.3) break;
    pts.push(p);
  }
  // join the lower lip, and run the top up under the shroud
  const last = pts[pts.length - 1];
  return [[COVE_LIP, M.lo(COVE_LIP) + 0.4], ...pts, [last[0] + 6, M.up(last[0] + 6) - M.SKIN]];
})();
export function lowerSkin(V) {
  const t = tVis(V, M.SKIN);
  const skin = X.band(lowerPath(COVE_LIP, X_BREAK, 40), t);
  const cove = X.band(COVE, tVis(V, 0.6, 0.8));
  return part(3, K.cut(V, sec(skin), { mat: "solid" }) + K.cut(V, sec(cove), { mat: "solid" }));
}
// the break at the section's forward end
export function sectionBreak(V) {
  return X.freehand(V, sec([[X_BREAK, M.up(X_BREAK) + 6]])[0], sec([[X_BREAK, M.lo(X_BREAK) - 6]])[0], 1.6, 5);
}
// the wing box's inside beyond the cut: the root rib's face (paper)
export function boxBehind(V) {
  const top = upperPath(X_BREAK, SA, 20);
  const bot = lowerPath(SA, X_BREAK, 20);
  return `<path class="paper" d="${K.d(V, sec([...top, ...bot]))}"/>`;
}

// ---------------------------------------------------------------- SECTION: the flap
const FP = M.FLAP_PTS;
// the outline split at the flap spar: the aft part (cut, at the plane) and the nose (beyond: the side
// of the notch the track runs in)
const FS = M.FLAP.spar;
export const FLAP_UP_AFT = range(FS, M.FLAP.te - 2, 24).map((x) => [x, M.flapUp(x)]);
export const FLAP_LO_AFT = range(M.FLAP.te - 2, FS, 24).map((x) => [x, M.lo(x)]);
export function flapLocal(V) {
  const t = tVis(V, M.SKIN);
  const skinU = X.band(FLAP_UP_AFT, t);
  const skinL = X.band(FLAP_LO_AFT, t);
  const te = [[M.FLAP.te - 26, M.flapUp(M.FLAP.te - 26) - t], [M.FLAP.te - 2, M.flapUp(M.FLAP.te - 2)], [M.FLAP.te, M.flapUp(M.FLAP.te) + 0.6], [M.FLAP.te, M.flapUp(M.FLAP.te) - 1.4], [M.FLAP.te - 2, M.lo(M.FLAP.te - 2)], [M.FLAP.te - 26, M.lo(M.FLAP.te - 26) + t]];
  const w = tVis(V, 1.0, 0.9);
  const sparWeb = [[FS, M.lo(FS) + t], [FS + w, M.lo(FS) + t], [FS + w, M.flapUp(FS) - t], [FS, M.flapUp(FS) - t]];
  const f = M.flapParts();
  const nose = [[FS, M.lo(FS)], ...f.lower.filter(([x]) => x < FS), ...f.nose, ...f.upper.filter(([x]) => x < FS && x > f.nose[f.nose.length - 1][0] + 0.5), [FS, M.flapUp(FS)]];
  return { outline: FP, skins: [skinU, skinL, te, sparWeb], nose };
}
// the nose (beyond) and the aft part (cut) placed for the forward roller's travel s
export function flapNose(V, s) {
  const P = M.poseOfS(s);
  const L = flapLocal(V);
  const pl = (pts) => sec(pts.map((p) => M.place(p, P)));
  return part(4, `<path class="paper" d="${K.d(V, pl(L.outline))}"/><path class="vis" d="${K.d(V, pl(L.nose), false)}"/>`);
}
export function flapAft(V, s) {
  const P = M.poseOfS(s);
  const L = flapLocal(V);
  const pl = (pts) => sec(pts.map((p) => M.place(p, P)));
  const aft = [...FLAP_UP_AFT, [M.FLAP.te, M.flapUp(M.FLAP.te)], ...FLAP_LO_AFT];
  return part(4, `<path class="paper" d="${K.d(V, pl(aft))}"/>` + L.skins.map((p) => K.cut(V, pl(p), { mat: "solid" })).join(""));
}
// the flap's outline at a pose, for phantoms and details
export const flapOutlineAt = (s) => FP.map((p) => M.place(p, M.poseOfS(s)));

// ---------------------------------------------------------------- SECTION: the track, bracket, rollers
const SLOT_PATH = (() => {
  const s2end = M.poseAt(M.S_MAX + M.S_OVER + 1.5).s2;
  return range(-M.S_OVER - 1.5, s2end, 60).map((s) => M.slotAt(s));
})();
export const SLOT_HOLE = X.capsule(SLOT_PATH, M.SLOT.w / 2, 8);
// the plate: round the slot with 11 mm of steel, and up to the spar web, where an angle bolts it on
export const TRACK = (() => {
  // 6 mm of steel above the slot (the roller bracket shows above it), 14 below
  const outer = X.capsule(SLOT_PATH.map(([x, y]) => [x, y - 4]), M.SLOT.w / 2 + 10, 10);
  const attach = [[SA + 0.1, M.lo(SA) + 3], [SA + 0.1, 14], [SA + 22, 14], [SA + 40, -6]];
  return X.hull([...outer, ...attach]);
})();
export const TRACK_ANGLE = [[SA, M.lo(SA) + 3], [SA + 3, M.lo(SA) + 3], [SA + 3, 11], [SA + 22, 11], [SA + 22, 14], [SA, 14]];
export const TRACK_BOLTS = [-14, 2];
export function track(V) {
  let bolts = "";
  for (const y of TRACK_BOLTS) bolts += K.body(V, sec(K.rect(SA - 4.5, y - 2.4, SA + 5.5, y + 2.4)));
  return part(5, X.cutHoles(V, sec(TRACK), [sec(SLOT_HOLE)], { mat: "steel", angle: 45 }) + K.cut(V, sec(TRACK_ANGLE), { mat: "steel", angle: 135 }) + bolts);
}
// the slot's centre line (path of motion of the rollers)
export const slotCentre = (V) => `<path class="ctr" d="${K.d(V, sec(SLOT_PATH), false)}"/>`;
// the roller bracket's cheek (flap frame): round both rollers, up to the flap's spar and lower skin
const R1_0 = M.SLOT.r1;
const R2_0 = M.R2_0;
export const BRACKET = X.hull([
  ...K.circle(R1_0[0], R1_0[1], 16, 16),
  ...K.circle(R2_0[0], R2_0[1], 16, 16),
  [M.FLAP.spar + 14, M.lo(M.FLAP.spar + 14) - 0.3],
  [M.FLAP.spar - 70, M.lo(M.FLAP.spar - 70) - 0.3],
]);
export function bracket(V, s) {
  const P = M.poseOfS(s);
  return part(6, K.body(V, sec(BRACKET.map((p) => M.place(p, P)))));
}
export function rollers(V, s) {
  const P = M.poseOfS(s);
  let out = "";
  for (const c of [P.r1, P.r2]) {
    out += X.cutHoles(V, sec(K.circle(c[0], c[1], M.ROLLER_D / 2, 28)), [sec(K.circle(c[0], c[1], 6.5, 18))], { mat: "steel", angle: 135 });
    out += K.cut(V, sec(K.circle(c[0], c[1], 3.2, 14)), { mat: "steel", angle: 45 });
  }
  return part(7, out);
}
// the drive lug on the notch rib, with the rod end's bolt
export const LUG_PTS = X.hull([...K.circle(M.LUG[0], M.LUG[1], 11, 16), [M.FLAP.spar - 0.5, -14], [M.FLAP.spar - 0.5, 16]]);
export function lug(V, s) {
  const P = M.poseOfS(s);
  const pl = (pts) => sec(pts.map((p) => M.place(p, P)));
  const c = M.place(M.LUG, P);
  return part(8, K.body(V, pl(LUG_PTS)) + K.body(V, sec(K.circle(c[0], c[1], 3.2, 14))));
}
// the push-pull rod, seen beyond the cut (foreshortened): lug to the bellcrank's hole R
export function rodSection(V, s) {
  const b = M.betaOf(s);
  const a = M.lugAt(s);
  const h = M.holeOf(b, "R");
  const end = [h[0], M.ROD_Y];
  const body = X.strip([a, end], 12.7);
  const eye = (p) => K.body(V, sec(K.circle(p[0], p[1], 8, 18)));
  return part(9, K.body(V, sec(body)) + eye(a) + eye(end));
}
// the bellcrank seen edge-on beyond the cut (a 6.35 plate), with its pivot bolt and brackets
export function bellcrankEdge(V, s) {
  const b = M.betaOf(s);
  const xs = ["R", "A", "C1", "C2", "F"].map((k) => M.holeOf(b, k)[0]);
  const x0 = Math.min(...xs) - 13;
  const x1 = Math.max(...xs) + 13;
  return part(10, K.body(V, sec(K.rect(x0, M.BC.y - 3.2, x1, M.BC.y + 3.2))));
}
export function pivotEdge(V) {
  const y0 = M.BC.y;
  const brk = (y) => K.body(V, sec([[M.BC.x - 14, y - 1.6], [SA - 1.6, y - 1.6], [SA - 1.6, y + 1.6], [M.BC.x - 14, y + 1.6]]));
  const bolt = K.body(V, sec(K.rect(M.BC.x - 3.9, y0 - 24, M.BC.x + 3.9, y0 + 22)));
  return part(11, brk(y0 + 17) + brk(y0 - 19) + bolt);
}
// the actuator seen end on beyond the cut: gearbox, motor and tube (its axis is nearly spanwise)
export function actuatorEnd(V, s) {
  const b = M.betaOf(s);
  const A = M.holeOf(b, "A");
  const ax = A[0];
  const y = M.ACT.y;
  const box = K.rrect(M.ACT.mount[0] - 26 - 0.8 * (ax - M.ACT.mount[0]) * 0, y - 30, M.ACT.mount[0] + 26, y + 30, 6);
  void box;
  const gb = K.rrect(M.ACT.mount[0] - 112, y - 38, M.ACT.mount[0] + 44, y + 38, 6);
  return (
    part(15, K.body(V, sec(gb))) +
    part(14, K.body(V, sec(K.circle(M.ACT.mount[0] - M.QM, y, 28, 36)))) +
    part(20, K.body(V, sec(K.circle(M.ACT.mount[0] + (ax - M.ACT.mount[0]) * 0.55, y, 16, 28)))) +
    part(19, K.body(V, sec(K.circle(ax, y, 11, 24))) + K.body(V, sec(K.circle(ax, y, 3.2, 12))))
  );
}

// ---------------------------------------------------------------- SECTION: the slot's air
// Three lines through the slot: between the cove panel and shroud (the fixed wall) and the flap's
// nose (the moving one), at fractions of the way across; then on over the flap's upper surface.
export const WALL = (() => {
  const lip = [M.LIP_X, M.up(M.LIP_X) - M.SKIN - 1];
  const top = COVE[COVE.length - 1];
  const under = range(top[0], M.LIP_X, 10).map((x) => [x, M.up(x) - M.SKIN - 1.2]);
  return [...COVE.slice(1, -1), ...under, lip];
})();
function nearestOn(pts, q) {
  let best = null;
  let bd = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const r = pts[(i + 1) % pts.length];
    const dx = r[0] - p[0];
    const dy = r[1] - p[1];
    const t = Math.max(0, Math.min(1, ((q[0] - p[0]) * dx + (q[1] - p[1]) * dy) / (dx * dx + dy * dy || 1)));
    const c = [p[0] + t * dx, p[1] + t * dy];
    const d = Math.hypot(c[0] - q[0], c[1] - q[1]);
    if (d < bd) {
      bd = d;
      best = { c, i, t, d };
    }
  }
  return best;
}
export function slotFlow(s) {
  const g = M.geometry(s);
  const pts = flapOutlineAt(s);
  // the flap's upper surface, aft of its nose's top, placed
  const fp = M.flapParts();
  const upper = [...fp.nose.slice(8, -1), ...fp.upper].map((p) => M.place(p, g.P));
  const lines = [];
  for (const k of [0.3, 0.55, 0.8]) {
    const out = [];
    for (const w of WALL) {
      const n = nearestOn(pts, w);
      if (n.d > 150) continue;
      out.push([w[0] + k * (n.c[0] - w[0]), w[1] + k * (n.c[1] - w[1])]);
    }
    if (out.length < 3) continue;
    // in from below the wing, past the track's hanger
    const first = out[0];
    out.unshift([first[0] + 10 * k, first[1] - 95 - 20 * k], [first[0] + 4, first[1] - 40], [first[0] + 2, first[1] - 16]);
    // on over the flap, at the height it left the lip, closing in slowly
    const last = out[out.length - 1];
    const ln = nearestOn(upper.slice(0, -1).concat([]), last);
    const h0 = ln.d;
    let i0 = 0;
    let bd = Infinity;
    upper.forEach((p, i) => {
      const d = Math.hypot(p[0] - last[0], p[1] - last[1]);
      if (d < bd) {
        bd = d;
        i0 = i;
      }
    });
    for (let i = i0 + 1; i < Math.min(upper.length - 1, i0 + 18); i += 1) {
      const a = upper[i];
      const b = upper[i + 1];
      const nx = -(b[1] - a[1]);
      const ny = b[0] - a[0];
      const L = Math.hypot(nx, ny) || 1;
      const f = 1 - 0.3 * ((i - i0) / 18);
      out.push([a[0] + (nx / L) * h0 * f, a[1] + (ny / L) * h0 * f]);
    }
    lines.push(out);
  }
  return { lines, gap: g.gap };
}
// the stipple density / line strength the flow gets: nothing through a closed slot
export const flowStrength = (gap) => Math.max(0, Math.min(1, (gap - 2.5) / 14));

// ---------------------------------------------------------------- PLAN: the drive linkage, nose up
// Both wing roots, between breaks through the flaps; the port side is the mirror image (w → −w).
export const PLAN = { w1: 900, x0: 820, x1: 1440 };
export const NOTCH = [735, 785]; // the flap's nose is cut away here for the track, the rod and the lug
const side = (sg) => (pts) => (sg > 0 ? pts : pts.map(([x, w]) => [x, -w]));
export function planFixed(V) {
  const SAp = M.SPAR.aft;
  let out = "";
  // the fixed trailing edge over the cabin, between the flaps
  out += part(2, K.body(V, pln(K.rect(SAp, -592, PLAN.x1, 592))));
  for (const sg of [-1, 1]) {
    // the lower skin's edge (the cove's lower lip) along each flap, and the root rib's cap
    out += K.line(V, pln(side(sg)([[COVE_LIP, 600], [COVE_LIP, PLAN.w1]])), "vis");
    out += part(1, K.body(V, pln(side(sg)(K.rect(PLAN.x0, 586, SAp - 30, 590)))));
  }
  return out;
}
export function planSpar(V) {
  const SAp = M.SPAR.aft;
  return part(1, K.body(V, pln(K.rect(SAp - M.SPAR.flange, -PLAN.w1, SAp, PLAN.w1))));
}
export function planBreaks(V) {
  const { w1, x0, x1 } = PLAN;
  return (
    X.freehand(V, pln([[x0, -w1]])[0], pln([[x0, w1]])[0], 1.0, 7) +
    X.freehand(V, pln([[x1, -w1]])[0], pln([[x1, w1]])[0], 1.0, 8) +
    X.freehand(V, pln([[x0, -w1]])[0], pln([[x1, -w1]])[0], 1.0, 9) +
    X.freehand(V, pln([[x0, w1]])[0], pln([[x1, w1]])[0], 1.0, 10)
  );
}
export const TRACK_X1 = Math.max(...TRACK.map((p) => p[0]));
export function planTracks(V) {
  return part(5, [-1, 1].map((sg) => K.body(V, pln(side(sg)(K.rect(M.SPAR.aft, 760 - 3.2, TRACK_X1, 760 + 3.2))))).join(""));
}
// a flap's planform at a pose, from the posed nose aft to the view's break, notched at the track
export function planFlap(V, s, sg) {
  const g = M.geometry(s);
  const pts = flapOutlineAt(s);
  const x0 = Math.min(...pts.map((p) => p[0]));
  const x1 = Math.min(PLAN.x1, Math.max(...pts.map((p) => p[0])));
  const xs = M.place([M.FLAP.spar, (M.lo(M.FLAP.spar) + M.flapUp(M.FLAP.spar)) / 2], g.P)[0];
  const outline = [[x0, 600], [x0, NOTCH[0]], [xs, NOTCH[0]], [xs, NOTCH[1]], [x0, NOTCH[1]], [x0, PLAN.w1], [x1, PLAN.w1], [x1, 600]];
  return part(4, K.body(V, pln(side(sg)(outline))));
}
// the bellcrank: a plate round its five holes, its bolt; the port one is the mirror image
export const BC_HOLES = ["R", "A", "C1", "C2", "F"];
export function planBellcrank(V, b, sg) {
  const hs = BC_HOLES.map((k) => M.holeOf(b, k));
  const outline = X.hull([...hs.flatMap(([x, w]) => K.circle(x, w, 12, 12)), ...K.circle(M.BC.x, M.BC.w, 19, 16)]);
  let out = K.body(V, pln(side(sg)(outline)));
  for (const [x, w] of hs) out += K.line(V, pln(side(sg)(K.circle(x, w, 3.3, 10))), "thin", true);
  return part(10, out) + part(11, K.body(V, pln(side(sg)(K.circle(M.BC.x, M.BC.w, 7.5, 16)))));
}
export function planRod(V, s, sg) {
  const b = M.betaOf(s);
  const h = M.holeOf(b, "R");
  const l = M.lugAt(s);
  const a = [h[0], h[1]];
  const e = [l[0], M.ROD_W];
  const eye = (p) => K.body(V, pln(side(sg)(K.circle(p[0], p[1], 8, 14))));
  return part(9, K.body(V, pln(side(sg)(X.strip([a, e], 12.7)))) + eye(a) + eye(e));
}
export function planLug(V, s, sg) {
  const l = M.lugAt(s);
  return part(8, K.body(V, pln(side(sg)(K.rect(l[0] - 12, M.ROD_W - 12, l[0] + 30, M.ROD_W - 6)))));
}
// the interconnect: starboard C1 to port C2 and starboard C2 to port C1, crossing on the centre line,
// each with a turnbuckle
export function planCables(V, s) {
  const b = M.betaOf(s);
  const S1 = M.holeOf(b, "C1");
  const S2 = M.holeOf(b, "C2");
  const P1 = M.mirror(S1);
  const P2 = M.mirror(S2);
  let out = "";
  for (const [a, c, k] of [[S1, P2, 0.25], [S2, P1, 0.75]]) {
    out += K.line(V, pln([a, c]), "vis");
    const m = [a[0] + (c[0] - a[0]) * k, a[1] + (c[1] - a[1]) * k];
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const d = [(c[0] - a[0]) / L, (c[1] - a[1]) / L];
    out += K.body(V, pln(X.strip([[m[0] - d[0] * 40, m[1] - d[1] * 40], [m[0] + d[0] * 40, m[1] + d[1] * 40]], 10)));
  }
  return part(12, out);
}
// the follow-up cable: from the starboard bellcrank's hole F inboard to a pulley at WS 60, then down
// through the cabin roof to the selector
export const FU_PULLEY = { w: 60, r: 25 };
export function planFollowUp(V, s) {
  const b = M.betaOf(s);
  const F = M.holeOf(b, "F");
  const P0 = [F[0], FU_PULLEY.w];
  return part(13, K.line(V, pln([F, P0]), "vis") + K.body(V, pln(K.rect(P0[0] - FU_PULLEY.r, FU_PULLEY.w - 5, P0[0] + FU_PULLEY.r, FU_PULLEY.w + 5))));
}
// the actuator in plan, from its own frame (a along the screw, q across, + aft)
export function actFrame(b) {
  const A = M.holeOf(b, "A");
  const m = M.ACT.mount;
  const L = Math.hypot(A[0] - m[0], A[1] - m[1]);
  const ax = [(A[0] - m[0]) / L, (A[1] - m[1]) / L];
  const nq = [ax[1], -ax[0]]; // + aft
  return { L, at: ([a, q]) => [m[0] + a * ax[0] + q * nq[0], m[1] + a * ax[1] + q * nq[1]] };
}
export const ACT_BOX = { a0: 14, a1: 64, q0: -112, q1: 44 };
export function planActuator(V, s) {
  const b = M.betaOf(s);
  const F = actFrame(b);
  const to = (pts) => pln(pts.map(F.at));
  let out = "";
  out += part(23, K.body(V, to(K.rect(-24, -24, 10, 24))));
  out += part(15, K.body(V, to(K.rrect(ACT_BOX.a0, ACT_BOX.q0, ACT_BOX.a1, ACT_BOX.q1, 6))) + K.body(V, to(K.rect(-12, -10, ACT_BOX.a0, 10))));
  out += part(14, K.body(V, to(K.rrect(64, -106, 176, -50, 5))));
  out += part(20, K.body(V, to(K.rect(64, -16, 262, 16))));
  out += part(22, K.body(V, to(K.rect(SW.up.a0, 26, SW.up.a1, 38))) + K.body(V, to(K.rect(SW.down.a0, 26, SW.down.a1, 38))));
  out += part(19, K.body(V, to(K.rect(262, -11, F.L - 16, 11))) + K.body(V, to(K.circle(F.L, 0, 12, 16))) + K.body(V, to(K.circle(F.L, 0, 3.2, 10))));
  out += K.body(V, to(K.circle(0, 0, 3.2, 10)));
  return out;
}

// ---------------------------------------------------------------- SECTION C-C: the actuator, from above
// (a, q) frame; the section plane holds the screw's, the idler's and the motor's axes.
export const QI = M.Q_IDLER;
export const QM = -M.QM;
const pitchR = (z) => (z * M.GEAR.m) / 2;
export function actHousing(V) {
  const outer = K.rrect(ACT_BOX.a0, ACT_BOX.q0, ACT_BOX.a1, ACT_BOX.q1, 6);
  const lugO = [[-12, -10], [ACT_BOX.a0, -10], [ACT_BOX.a0, 10], [-12, 10]];
  const cavity = K.rrect(20, -106, 56, 38, 3);
  const holes = [
    cavity,
    K.rect(14, -8, 20.01, 8), // the screw's inboard bearing
    K.rect(14, QI - 6, 20.01, QI + 6), // the idler's bearings
    K.rect(55.99, QI - 6, 64, QI + 6),
    K.rect(55.99, -15, 64, 15), // the angular-contact pair
    K.rect(55.99, QM - 6, 64, QM + 6), // the motor's shaft
    K.circle(0, 0, 3.25, 14), // the mount pin
  ];
  const body = X.hull([...outer, ...lugO]);
  return part(15, X.cutHoles(V, act(body), holes.map(act), { mat: "alu", angle: 45 }));
}
// a spur gear cut through its axis: the web hatched, the teeth not (ISO), the pitch line chained
function gearSec(V, a0, a1, q0, z, hub, { mat = "steel", angle = 135 } = {}) {
  const r = pitchR(z);
  const ra = r + M.GEAR.m;
  const rf = r - 1.25 * M.GEAR.m;
  let out = "";
  for (const sg of [-1, 1]) {
    out += K.cut(V, act(K.rect(a0, q0 + sg * hub, a1, q0 + sg * rf)), { mat, angle });
    out += K.body(V, act(K.rect(a0, q0 + sg * rf, a1, q0 + sg * ra)));
    out += K.line(V, act([[a0 - 1.5, q0 + sg * r], [a1 + 1.5, q0 + sg * r]]), "ctr");
  }
  return out;
}
export function actGears(V) {
  const g = M.GEAR;
  let out = "";
  out += gearSec(V, 26, 36, 0, g.z4, 5, { angle: 135 }); // screw gear
  out += gearSec(V, 40, 50, QI, g.z2, 5, { angle: 45 }); // idler gear
  // the idler pinion and the motor pinion are cut on their shafts: teeth and shaft, unhatched
  out += K.body(V, act(K.rect(26, QI - pitchR(g.z3) - g.m, 36, QI + pitchR(g.z3) + g.m)));
  out += K.line(V, act([[24.5, QI - pitchR(g.z3)], [37.5, QI - pitchR(g.z3)]]), "ctr") + K.line(V, act([[24.5, QI + pitchR(g.z3)], [37.5, QI + pitchR(g.z3)]]), "ctr");
  out += K.body(V, act(K.rect(40, QM - pitchR(g.z1) - g.m, 50, QM + pitchR(g.z1) + g.m)));
  out += K.line(V, act([[38.5, QM + pitchR(g.z1)], [51.5, QM + pitchR(g.z1)]]), "ctr");
  return part(16, out);
}
// shafts: the idler's (with its pinion), the motor's (with its pinion), drawn unhatched
export function actShafts(V) {
  return part(16, K.body(V, act(K.rect(15, QI - 5, 63, QI + 5)))) + part(14, K.body(V, act(K.rect(38, QM - 3, 172, QM + 3))));
}
// bearings: a box with a ball (ISO simplified); the screw's angular-contact pair drawn as two
function bearing(V, a0, a1, q0, q1) {
  const lo = Math.min(q0, q1);
  const hi = Math.max(q0, q1);
  const c = [(a0 + a1) / 2, (lo + hi) / 2];
  const r = Math.min(a1 - a0, hi - lo) * 0.3;
  return K.body(V, act(K.rect(a0, lo, a1, hi))) + K.line(V, act(K.circle(c[0], c[1], r, 12)), "thin", true);
}
export function actBearings(V) {
  let out = "";
  for (const sg of [-1, 1]) {
    out += bearing(V, 56, 60, sg * 5, sg * 15) + bearing(V, 60, 64, sg * 5, sg * 15);
    out += bearing(V, 14, 20, sg * 5, sg * 8);
    out += bearing(V, 14, 20, QI + sg * 5, QI + sg * 6) + bearing(V, 56, 64, QI + sg * 5, QI + sg * 6);
  }
  return part(21, out);
}
// the jackscrew: journal and threaded length, unhatched; its crests drawn as the helix's slanting
// lines, which run along it as it turns (spin, rad)
export const SCREW_A = [12, 252];
export function actScrew(V, spin) {
  const L0 = 66;
  let out = K.body(V, act([[SCREW_A[0], -5], [L0 - 2, -5], [L0, -8], [SCREW_A[1], -8], [SCREW_A[1], 8], [L0, 8], [L0 - 2, 5], [SCREW_A[0], 5]]));
  const p = M.SCREW.lead;
  const ph = ((((spin / (2 * Math.PI)) * p) % p) + p) % p;
  let crest = "";
  for (let a = L0 + ph; a < SCREW_A[1] - p / 2 - 0.5; a += p) crest += K.d(V, act([[a, -8], [a + p / 2, 8]]), false);
  out += `<path class="thin" d="${crest}"/>`;
  out += K.line(V, act([[L0, -6.4], [SCREW_A[1], -6.4]]), "thin") + K.line(V, act([[L0, 6.4], [SCREW_A[1], 6.4]]), "thin");
  return part(17, out);
}
// the motor: flange, can, magnets, armature, commutator and brushes
export function actMotor(V) {
  let out = "";
  out += X.cutHoles(V, act(K.rect(64, QM - 32, 70, QM + 32)), [act(K.rect(63.99, QM - 6, 70.01, QM + 6))], { mat: "steel", angle: 135 });
  for (const sg of [-1, 1]) {
    out += K.cut(V, act(K.rect(70, QM + sg * 26.5, 176, QM + sg * 28)), { mat: "solid" });
    out += K.cut(V, act(K.rect(84, QM + sg * 20.5, 148, QM + sg * 26.5)), { mat: "iron", angle: 135 });
    out += K.cut(V, act(K.rect(86, QM + sg * 3, 146, QM + sg * 18.5)), { mat: "steel", angle: 45 });
    out += K.cut(V, act(K.rect(150, QM + sg * 3, 162, QM + sg * 9)), { mat: "brass", angle: 45 });
    out += K.cut(V, act(K.rect(153, QM + sg * 9.6, 159, QM + sg * 16)), { mat: "solid" });
  }
  out += K.cut(V, act(K.rect(174.5, QM - 26.5, 176, QM + 26.5)), { mat: "solid" });
  out += bearing(V, 166, 173, QM + 3, QM + 9) + bearing(V, 166, 173, QM - 9, QM - 3);
  return part(14, out);
}
// the housing tube with the striker's slot on its aft side, and the bronze bush at its end
export const SLOT_A = [72, M.ACTL.nut0 + 26 + M.NUT_MAX];
export function actTube(V) {
  let out = "";
  out += K.cut(V, act(K.rect(64, -16, 262, -14)), { mat: "solid" });
  out += K.cut(V, act(K.rect(64, 14, SLOT_A[0], 16)), { mat: "solid" }) + K.cut(V, act(K.rect(SLOT_A[1], 14, 262, 16)), { mat: "solid" });
  for (const sg of [-1, 1]) out += K.cut(V, act(K.rect(250, sg * 11.2, 262, sg * 14)), { mat: "bronze", angle: 45 });
  return part(20, out);
}
// the nut (bronze, threaded on the screw) with its striker key through the slot
export const nutA = (n) => M.ACTL.nut0 + n;
export function actNut(V, n) {
  const a = nutA(n);
  let out = "";
  for (const sg of [-1, 1]) out += K.cut(V, act(K.rect(a, sg * 8, a + M.ACTL.nutL, sg * 13.5)), { mat: "bronze", angle: 135 });
  out += K.body(V, act(K.rect(a + 8, 13.5, a + 22, 23)));
  return part(18, out);
}
// the actuating tube from the nut to the rod end
export function actRod(V, n, L) {
  const a = nutA(n) + M.ACTL.nutL;
  const e = L;
  let out = "";
  for (const sg of [-1, 1]) out += K.cut(V, act(K.rect(a, sg * 9, e - 18, sg * 11)), { mat: "solid" });
  out += K.body(V, act(K.rect(e - 18, -6, e - 8, 6)));
  out += X.bodyHoles(V, act(K.circle(e, 0, 12, 24)), [act(K.circle(e, 0, 3.3, 12))]);
  return part(19, out);
}
// the limit switches: body, lever and roller; the striker presses a roller at the end of the travel
// rollers placed so the striker meets them exactly at the nut's two ends of travel (flap 0 and 30)
const ROLL_UP = M.ACTL.nut0 + 8 - 2.5;
const ROLL_DN = M.ACTL.nut0 + 22 + M.NUT_MAX + 2.5;
export const SW = { up: { a0: 64.5, a1: ROLL_UP - 1.5, roll: ROLL_UP }, down: { a0: ROLL_DN + 1.5, a1: ROLL_DN + 19.5, roll: ROLL_DN } };
export function limitPress(n) {
  const a = nutA(n);
  const up = Math.max(0, Math.min(2.5, SW.up.roll + 2.5 - (a + 8)));
  const dn = Math.max(0, Math.min(2.5, a + 22 - (SW.down.roll - 2.5)));
  return { up, dn };
}
export function actSwitches(V, n) {
  const pr = limitPress(n);
  let out = "";
  for (const [k, s] of Object.entries(SW)) {
    out += K.cut(V, act(K.rect(s.a0, 26, s.a1, 38)), { mat: "plastic", angle: 60 });
    const push = k === "up" ? -pr.up : pr.dn;
    const r = [s.roll + push, 20.5];
    const pivot = [k === "up" ? s.a1 - 3 : s.a0 + 3, 26];
    out += K.line(V, act([pivot, [r[0] + (k === "up" ? 1.5 : -1.5), r[1] + 1.8]]), "vis");
    out += K.body(V, act(K.circle(r[0], r[1], 2.5, 12)));
  }
  return part(22, out);
}
// the mount: the bracket's clevis pin through the gearbox's lug
export function actMount(V) {
  return part(23, K.cut(V, act(K.rect(-26, -22, -12.5, 22)), { mat: "steel", angle: 135 }) + K.body(V, act(K.circle(0, 0, 3.2, 12))));
}

// ---------------------------------------------------------------- VIEW D: the selector (u, v about the pivot)
export const LEVER0 = 160; // the lever's direction (deg) at flaps 0; + turns the knob down
export const SCALE0 = 250; // the pointer's direction at flaps 0
export const PANEL_U = -72;
export const leverDir = (lv) => LEVER0 + lv;
export function selPanel(V) {
  const t = 1.6;
  const top = K.rect(PANEL_U, 38, PANEL_U + t, 96);
  const bot = K.rect(PANEL_U, -112, PANEL_U + t, -48);
  return part(24, K.cut(V, top, { mat: "solid" }) + K.cut(V, bot, { mat: "solid" }));
}
// the scale the pointer reads: marks at the carrier's angles for 0, 10, 20 and 30 (uneven)
export function selScale(V) {
  let out = "";
  const arc = (r0, r1, a0, a1) => [...K.arc(0, 0, r1, a0, a1, 20), ...K.arc(0, 0, r0, a1, a0, 20)];
  out += K.body(V, arc(84, 98, SCALE0 - 8, SCALE0 + M.MARKS[30] + 8));
  for (const f of M.FLAP_STOPS) {
    const a = (SCALE0 + M.MARKS[f]) * rad;
    out += K.line(V, [[90 * Math.cos(a), 90 * Math.sin(a)], [98 * Math.cos(a), 98 * Math.sin(a)]], "vis");
  }
  return part(24, out);
}
export function selScaleText(V) {
  let out = "";
  for (const f of M.FLAP_STOPS) {
    const a = (SCALE0 + M.MARKS[f]) * rad;
    const [x, y] = V.p([106 * Math.cos(a), 106 * Math.sin(a)]);
    out += `<text class="t t-sm" x="${x}" y="${K.r2(y + 2.6)}" text-anchor="middle">${f}</text>`;
  }
  return `<g data-role="engraved">${out}</g>`;
}
// the switch carrier: a disc with the follow-up cable's groove (R 60) and the pointer
export function selCarrier(V, cv) {
  const r = M.PULLEY_R;
  const rotp = (pts) => X.rot(pts, [0, 0], cv);
  let out = "";
  out += K.body(V, rotp(K.circle(0, 0, r, 48)));
  out += K.line(V, rotp(K.circle(0, 0, r - 4, 48)), "thin", true);
  const pa = SCALE0 * rad;
  const ptr = [[r - 4, -3], [92, -1], [94, 0], [92, 1], [r - 4, 3]].map(([u, v]) => [u * Math.cos(pa) - v * Math.sin(pa), u * Math.sin(pa) + v * Math.cos(pa)]);
  out += K.body(V, rotp(ptr));
  return part(25, out);
}
// the carrier's DOWN and UP micro-switches either side of the lever's cam
export const SW_R = 42; // the switches' rollers and the cam, on the lever's tail behind the pivot
const CAM_HALF = 2.6; // mm each side of the cam lobe
const ROLL_R = 2.4;
// the rollers sit so the cam meets one when the lever leads the carrier by DB_ON
export const SW_GAP = ((CAM_HALF + ROLL_R) / SW_R) * (180 / Math.PI) + M.DB_ON;
export function selSwitches(V, cv, lv) {
  let out = "";
  for (const sg of [1, -1]) {
    const a = LEVER0 + 180 + cv + sg * SW_GAP;
    const body = X.rot(K.rrect(SW_R + 4, -4.5, SW_R + 18, 4.5, 1.2), [0, 0], a);
    out += K.cut(V, body, { mat: "plastic", angle: 60 });
    // the cam pushes the roller round when the lever leads by more than DB_ON
    const lead = sg > 0 ? lv - cv : cv - lv;
    const push = Math.max(0, Math.min(2.5, lead - M.DB_ON));
    const rp = X.rot([[SW_R, 0]], [0, 0], a + sg * push)[0];
    const pv = X.rot([[SW_R + 4, sg * 3.5]], [0, 0], a)[0];
    out += K.line(V, [pv, rp], "vis");
    out += K.body(V, K.circle(rp[0], rp[1], ROLL_R, 12));
  }
  return part(25, out);
}
// the lever: hub, arm through the panel, flap-shaped knob; the tail behind the pivot with its cam
export function selLever(V, lv) {
  const a = leverDir(lv);
  const rotp = (pts) => X.rot(pts, [0, 0], a);
  let out = "";
  out += K.body(V, rotp([[-SW_R + 4, -5], [0, -7], [114, -4], [114, 4], [0, 7], [-SW_R + 4, 5]]));
  const knob = [[112, -5], [118, -9], [128, -10.5], [140, -7], [146, -2], [146, 2], [134, 6], [118, 7], [112, 5]];
  out += K.body(V, rotp(knob));
  out += K.body(V, rotp([[-SW_R + 5, -CAM_HALF], [-SW_R - 4, -CAM_HALF], [-SW_R - 5.5, 0], [-SW_R - 4, CAM_HALF], [-SW_R + 5, CAM_HALF]]));
  out += K.body(V, K.circle(0, 0, 10, 24)) + K.line(V, K.circle(0, 0, 4, 12), "thin", true);
  return part(24, out);
}
export function selDetent(V) {
  const notches = M.FLAP_STOPS.map((f) => LEVER0 + M.leverOf(f));
  const outer = [];
  const a0 = LEVER0 - M.OVER - 8;
  const a1 = LEVER0 + M.leverOf(30) + 8;
  for (let a = a0; a <= a1 + 0.01; a += 1) {
    const dmin = Math.min(...notches.map((n) => Math.abs(n - a)));
    const r = dmin < 2.1 ? 26 - (2.1 - dmin) * 1.6 : 26;
    outer.push([r * Math.cos(a * rad), r * Math.sin(a * rad)]);
  }
  const inner = K.arc(0, 0, 15, a1, a0, 30);
  return part(24, K.body(V, [...outer, ...inner]));
}
// the follow-up cable round the groove, leaving the bottom aft toward the wing; the return spring on top
export function selCable(V, cv) {
  const r = M.PULLEY_R - 2;
  return part(13, K.line(V, [...K.arc(0, 0, r, 200 + cv, 270, 10), [118, -r]], "vis"));
}
export function selSpring(V, cv) {
  const r = M.PULLEY_R - 2;
  return part(25, K.line(V, K.arc(0, 0, r, 130 + cv, 90, 8), "vis") + K.line(V, [[0, r], [8, r]], "vis") + K.springSection(V, { from: 8, to: 106, radius: 4, wire: 1.2, turns: 10, axis: "u", at: r }) + K.body(V, K.rect(106, r - 7, 114, r + 7)));
}
export function selBreaker(V) {
  return part(26, K.body(V, K.rect(PANEL_U + 1.6, -82, PANEL_U + 30, -66)) + K.body(V, K.rect(PANEL_U - 13, -78.5, PANEL_U, -69.5)));
}

// ---------------------------------------------------------------- DIAGRAM 4: one branch of the circuit
// a limit switch (normally closed; open at its end of travel) over the selector's changeover switch
// (motor terminal to ground at rest, to the bus when it operates), at sheet x bx below the bus at y
export function circuitBranch(bx, y, xMid, limClosed, swOn) {
  const out = bx < xMid ? -1 : 1;
  const lim = limClosed ? `M${bx} ${y + 44}V${y + 66}` : `M${bx} ${y + 44}V${y + 50}L${bx + 7 * out} ${y + 61}M${bx} ${y + 62}V${y + 66}`;
  const sw = swOn ? `M${bx} ${y + 66}V${y + 84}L${bx} ${y + 100}V${y + 112}` : `M${bx} ${y + 66}V${y + 84}M${bx} ${y + 100}V${y + 112}M${bx} ${y + 100}L${bx + 16 * out} ${y + 104}`;
  return `<path class="vis" d="${lim}${sw}"/><circle class="dot" cx="${bx}" cy="${y + 84}" r="1.4"/><circle class="dot" cx="${bx}" cy="${y + 100}" r="1.4"/>`;
}

// the same, horizontal: a branch from the split at x to the selector switch's common at x + 84. The
// changeover's rest contact (to ground) lies toward the ground bar: below the branch (side 1) or above
// it (side −1).
export function circuitBranchH(x, y, side, limClosed, swOn) {
  const lim = limClosed ? `M${x + 4} ${y}H${x + 24}` : `M${x + 4} ${y}L${x + 21} ${y - 7}M${x + 24} ${y}H${x + 24}`;
  const nc = [x + 62, y + side * 12];
  const blade = swOn ? `M${x + 84} ${y}L${x + 62} ${y}` : `M${x + 84} ${y}L${nc[0] + 1} ${nc[1] - side * 1}`;
  const wires = `M${x} ${y}H${x + 4}M${x + 24} ${y}H${x + 62}M${nc[0]} ${nc[1]}V${y + side * 24}`;
  const dots = [[x + 4, y], [x + 24, y], [x + 62, y], [nc[0], nc[1]], [x + 84, y]].map(([a, b]) => `<circle class="dot" cx="${a}" cy="${b}" r="1.3"/>`).join("");
  return `<path class="vis" d="${wires}${lim}${blade}"/>${dots}`;
}

// ---------------------------------------------------------------- SECTION B-B: between the tracks
// The flap cut in full (no notch out here): its skin all round, its spar, the trailing edge's filler.
export function flapFull(V, s) {
  const P = M.poseOfS(s);
  const t = tVis(V, M.SKIN);
  const pl = (pts) => sec(pts.map((p) => M.place(p, P)));
  const w = tVis(V, 1.0, 0.9);
  const FSx = M.FLAP.spar;
  const web = [[FSx, M.lo(FSx) + t], [FSx + w, M.lo(FSx) + t], [FSx + w, M.flapUp(FSx) - t], [FSx, M.flapUp(FSx) - t]];
  const te = [[M.FLAP.te - 26, M.flapUp(M.FLAP.te - 26) - t], [M.FLAP.te - 2, M.flapUp(M.FLAP.te - 2)], [M.FLAP.te, M.flapUp(M.FLAP.te) + 0.6], [M.FLAP.te, M.flapUp(M.FLAP.te) - 1.4], [M.FLAP.te - 2, M.lo(M.FLAP.te - 2)], [M.FLAP.te - 26, M.lo(M.FLAP.te - 26) + t]];
  return part(4, `<path class="paper" d="${K.d(V, pl(FP))}"/>` + X.cutHoles(V, pl(FP), [pl(X.inset(FP, t))], { mat: "solid" }) + K.cut(V, pl(web), { mat: "solid" }) + K.cut(V, pl(te), { mat: "solid" }));
}
export function sectionBetween(V) {
  return `<path class="paper" d="${K.d(V, sec([...upperPath(X_BREAK, SA, 20), ...lowerPath(SA, X_BREAK, 20)]))}"/>` + lowerSkin(V) + upperSkin(V) + spar(V);
}
