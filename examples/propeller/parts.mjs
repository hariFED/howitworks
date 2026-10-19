// The propeller's parts, in world mm, for the sheet's views. Each function draws one part into a view
// and returns SVG, so views at different scales draw the same geometry.
//
// SECTION A-A (the hub): the plane through the shaft axis and both blades' pitch axes. World u = −s
// (s forward from the crankshaft flange's front face, so the nose points left), v = r (up: blade 1,
// down: blade 2). The section is symmetric about the axis: each part is drawn for r > 0 and mirrored.
// The bolt circle is indexed so a bolt lies under each blade: two bolts are cut lengthwise.
// VIEW FROM AHEAD: u = X (blade 2 to the right), v = Y; looking aft, the propeller turns anticlockwise.
// BLADE SECTIONS: u = t (along the plane of rotation, toward the trailing edge), v = z (forward); the
// pitch axis at the origin, looking outboard.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";
import * as X from "./extra.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const rad = Math.PI / 180;
// (s, r) → world, upper half; lo() mirrors to the lower half
const W = (pts) => pts.map(([s, r]) => [-s, r]);
const lo = (pts) => pts.map(([u, v]) => [u, -v]).reverse();
const both = (fn) => fn(1) + fn(-1);
const sideOf = (sg, pts) => (sg > 0 ? W(pts) : lo(W(pts)));
const BC = M.FLANGE.bolt; // bolt circle radius, 60.3
const RB = M.BUSH_D / 2; // 9.525
const RH = 5.7; // bolt clearance hole
const RCB = 9.6; // counterbore and plate holes for the bushings
const BORE = 30.25; // hub and support bore on the Ø60 pilot

// ---------------------------------------------------------------- the blade
// the section's axial extent where the plane through the pitch axis (t = 0) cuts it
export function zRange(r) {
  const P = M.sectionAt(Math.max(M.R_SHANK, r));
  const zs = [];
  for (let i = 0; i < P.length; i++) {
    const [t0, z0] = P[i];
    const [t1, z1] = P[(i + 1) % P.length];
    if ((t0 <= 0 && t1 > 0) || (t1 <= 0 && t0 > 0)) zs.push(z0 + ((0 - t0) / (t1 - t0)) * (z1 - z0));
  }
  return [Math.min(...zs), Math.max(...zs)];
}
export const R_BREAK = 182; // the blades are broken off here in section A-A
export const S_TIP = M.SPIN_TIP;

// spinner skin, outer radius at s (cylindrical to s 100, then an ellipse to the tip)
export const S_DOME = 100;
export function rSpin(s) {
  if (s <= S_DOME) return M.SPIN_R;
  const e = (s - S_DOME) / (S_TIP - S_DOME);
  return M.SPIN_R * Math.sqrt(Math.max(0, 1 - e * e));
}
export const CUT0 = 22; // the spinner's blade cutouts run from s 22 to 103
export const CUT1 = 103;

// 1 PROPELLER: hub and blade roots, cut on the plane of both pitch axes (upper half drawn, mirrored)
export function hubSection(V) {
  const fr = 8; // fillet at the shank root
  const [z0, z1] = zRange(M.R_SHANK);
  const sR = M.BLADE_S + z0; // the shank aft side
  const sF = M.BLADE_S + z1; // its forward side
  const rs = [];
  for (let r = M.R_HUB + fr; r < R_BREAK; r += 6) rs.push(r);
  rs.push(R_BREAK);
  const fwdUp = rs.map((r) => [M.BLADE_S + zRange(r)[1], r]);
  const aftDown = rs.map((r) => [M.BLADE_S + zRange(r)[0], r]).reverse();
  const head = [[M.HUB_S0, BC + RCB], [M.HUB_S0 + 13, BC + RCB], [M.HUB_S0 + 13, BC + RH], [M.HUB_S1, BC + RH], [M.HUB_S1, M.R_HUB - 3], [M.HUB_S1 - 3, M.R_HUB]];
  const fFil = K.arc(sF + fr, M.R_HUB + fr, fr, 270, 180, 6).slice(0, -1);
  const aFil = K.arc(sR - fr, M.R_HUB + fr, fr, 0, -90, 6).slice(1);
  const loop = [...head, ...fFil, ...fwdUp, ...aftDown, ...aFil, [M.HUB_S0 + 3, M.R_HUB], [M.HUB_S0, M.R_HUB - 3]];
  const iBreak = head.length + fFil.length + fwdUp.length - 1;
  const inner = [[M.HUB_S0, BORE], [M.HUB_S0, BC - RCB], [M.HUB_S0 + 13, BC - RCB], [M.HUB_S0 + 13, BC - RH], [M.HUB_S1, BC - RH], [M.HUB_S1, BORE]];
  const side = (sg) => {
    const w = sideOf(sg, loop);
    const idx = sg > 0 ? iBreak : w.length - 2 - iBreak;
    return X.cutBroken(V, w, idx, { mat: "alu", angle: 45, seed: sg > 0 ? 5 : 9 }) + K.cut(V, sideOf(sg, inner), { mat: "alu", angle: 45 });
  };
  // the hub front face, seen across the bore beyond the plane
  const edges = K.lines(V, [[[-M.HUB_S1, -BORE], [-M.HUB_S1, BORE]]], "vis");
  return part(1, side(1) + side(-1) + edges);
}

// 2 SPINNER: 0.8 skin, its base over the rear bulkhead's lip, cut out round each blade
export function spinnerPts() {
  const outer = [];
  for (let i = 0; i <= 40; i++) {
    const e = 1 - (1 - i / 40) ** 1.6; // denser near the tip
    const s = CUT1 + (S_TIP - CUT1) * e;
    outer.push([s, rSpin(s)]);
  }
  outer[outer.length - 1] = [S_TIP, 0];
  // the inner face, offset along the normal
  const inner = outer.map(([s, r], i) => {
    const a = outer[Math.max(0, i - 1)];
    const b = outer[Math.min(outer.length - 1, i + 1)];
    const ds = b[0] - a[0];
    const dr = b[1] - a[1];
    const L = Math.hypot(ds, dr) || 1;
    // the inward normal of a curve running forward and down is (−dr, ds)/L rotated: toward the axis and aft
    return [s + (dr / L) * M.SPIN_SKIN, r - (ds / L) * M.SPIN_SKIN];
  });
  inner[inner.length - 1] = [S_TIP - M.SPIN_SKIN, 0];
  return { outer, inner };
}
export function spinner(V) {
  const { outer, inner } = spinnerPts();
  const dome = [...outer, ...inner.reverse()];
  const base = [[M.HUB_S0, M.SPIN_R - M.SPIN_SKIN], [CUT0, M.SPIN_R - M.SPIN_SKIN], [CUT0, M.SPIN_R], [M.HUB_S0, M.SPIN_R]];
  return part(2, both((sg) => K.cut(V, sideOf(sg, dome), { mat: "solid" }) + K.cut(V, sideOf(sg, base), { mat: "solid" })));
}

// 3 FRONT BULKHEAD: a flat ring under the crush plate, a cone, a lip under the skin; 1.6 thick
export const FB = { lip0: 148, lip1: 172, ring: 92 };
export function frontBulkheadPts() {
  const path = [[M.HUB_S1, BC + RH], [M.HUB_S1, FB.ring]];
  for (let s = FB.lip0; s <= FB.lip1 + 0.01; s += 4) path.push([s, rSpin(s) - M.SPIN_SKIN]);
  // band to the right of the path: forward on the flat ring, inward under the skin
  return { outer: X.band(path, M.BULK_F_T), inner: K.rect(M.HUB_S1, BORE, M.HUB_S1 + M.BULK_F_T, BC - RH) };
}
export function frontBulkhead(V) {
  const { outer, inner } = frontBulkheadPts();
  return part(3, both((sg) => K.cut(V, sideOf(sg, outer), { mat: "solid" }) + K.cut(V, sideOf(sg, inner), { mat: "solid" })));
}

// 4 REAR BULKHEAD: a 2.0 disc between the gear support and the hub, its lip turned forward
export const RBK = { s0: M.SUPPORT_T, s1: M.HUB_S0, lip: 20 };
export function rearBulkheadPts() {
  const ri = M.SPIN_R - M.SPIN_SKIN - M.BULK_R_T;
  return {
    outer: [[RBK.s0, BC + RCB], [RBK.s1, BC + RCB], [RBK.s1, ri], [RBK.lip, ri], [RBK.lip, ri + M.BULK_R_T], [RBK.s0, ri + M.BULK_R_T]],
    inner: K.rect(RBK.s0, BORE, RBK.s1, BC - RCB),
  };
}
export function rearBulkhead(V) {
  const { outer, inner } = rearBulkheadPts();
  return part(4, both((sg) => K.cut(V, sideOf(sg, outer), { mat: "solid" }) + K.cut(V, sideOf(sg, inner), { mat: "solid" })));
}

// 5 CRUSH PLATE: a steel ring under the bolt heads, spreading their clamp over the hub's face
export const CP = { r0: 45, r1: 78, s0: M.HUB_S1 + M.BULK_F_T, s1: M.CRUSH_S1 };
export function crushPlate(V) {
  const a = K.rect(CP.s0, CP.r0, CP.s1, BC - RH);
  const b = K.rect(CP.s0, BC + RH, CP.s1, CP.r1);
  const edges = K.lines(V, [[[-CP.s0, -CP.r0], [-CP.s0, CP.r0]], [[-CP.s1, -CP.r0], [-CP.s1, CP.r0]]], "vis");
  return part(5, both((sg) => K.cut(V, sideOf(sg, a), { mat: "steel", angle: 135 }) + K.cut(V, sideOf(sg, b), { mat: "steel", angle: 135 })) + edges);
}

// 6 PROPELLER BOLT 7/16-20, drilled head; 7 WASHER. One under each blade is cut lengthwise; the next
// pair, 60° round, shows beyond the plane in front of the crush plate.
export const BOLT = { tail: -12, head0: M.CRUSH_S1 + 1.6, head1: M.CRUSH_S1 + 1.6 + 7.6, af: 7.95, r: M.BOLT_D / 2 };
export const BEYOND = BC * Math.cos(60 * rad); // 30.15: where the next bolt projects
export function boltPts(c = BC) {
  const { tail, head0, head1, af, r } = BOLT;
  return [[tail, c - r + 0.6], [tail + 0.6, c - r], [head0, c - r], [head0, c - af], [head1 - 0.8, c - af], [head1, c - af + 0.8], [head1, c + af - 0.8], [head1 - 0.8, c + af], [head0, c + af], [head0, c + r], [tail + 0.6, c + r], [tail, c + r - 0.6]];
}
export function bolts(V) {
  const cut = (sg) => {
    const thread = [[BOLT.tail + 0.6, BC - 4.75], [2, BC - 4.75]].map(([s, r]) => [-s, sg * r]);
    const thread2 = [[BOLT.tail + 0.6, BC + 4.75], [2, BC + 4.75]].map(([s, r]) => [-s, sg * r]);
    const hole = K.circle(-(BOLT.head0 + 3.8), sg * BC, 0.9, 12);
    return K.body(V, sideOf(sg, boltPts())) + K.lines(V, [thread, thread2, [[-2, sg * (BC - 4.75)], [-2, sg * (BC + 4.75)]]], "thin") + K.line(V, hole, "thin", true);
  };
  const beyond = (sg) => {
    const h = [[BOLT.head0, BEYOND - BOLT.af], [BOLT.head1 - 0.8, BEYOND - BOLT.af], [BOLT.head1, BEYOND - BOLT.af + 0.8], [BOLT.head1, BEYOND + BOLT.af - 0.8], [BOLT.head1 - 0.8, BEYOND + BOLT.af], [BOLT.head0, BEYOND + BOLT.af]];
    return K.body(V, sideOf(sg, h)) + K.line(V, sideOf(sg, [[BOLT.head0 + 3.8, BEYOND - BOLT.af], [BOLT.head0 + 3.8, BEYOND + BOLT.af]]), "thin");
  };
  return part(6, both(cut) + both(beyond));
}
export const WASHER = { s0: M.CRUSH_S1, s1: M.CRUSH_S1 + 1.6, ri: RH, ro: 11 };
export function washers(V) {
  const w = (c) => [K.rect(WASHER.s0, c - WASHER.ro, WASHER.s1, c - WASHER.ri), K.rect(WASHER.s0, c + WASHER.ri, WASHER.s1, c + WASHER.ro)];
  const beyond = K.rect(WASHER.s0, BEYOND - WASHER.ro, WASHER.s1, BEYOND + WASHER.ro);
  return part(7, both((sg) => w(BC).map((p) => K.body(V, sideOf(sg, p))).join("") + K.body(V, sideOf(sg, beyond))));
}

// 8 DRIVE BUSHING Ø19.05: pressed into the flange, standing 25 proud into the hub's counterbore;
// the bolt screws into its thread. It, not the bolt, carries the torque in shear.
export const BUSH = { s0: -M.FLANGE.t, s1: M.BUSH_FWD };
export function bushings(V) {
  const a = K.rect(BUSH.s0, BC - RB, BUSH.s1, BC - BOLT.r);
  const b = K.rect(BUSH.s0, BC + BOLT.r, BUSH.s1, BC + RB);
  return part(8, both((sg) => K.cut(V, sideOf(sg, a), { mat: "steel", angle: 60 }) + K.cut(V, sideOf(sg, b), { mat: "steel", angle: 60 })));
}

// 9 CRANKSHAFT, FLANGE AND PILOT (the engine's; not hatched: a shaft cut lengthwise)
export const CRANK = { s0: -62, nose: 34 };
export function crank(V) {
  const F = M.FLANGE;
  const half = [[CRANK.s0, CRANK.nose], [-F.t, CRANK.nose], [-F.t, BC - RB], [0, BC - RB], [0, F.pilotR], [F.pilotL - 1.5, F.pilotR], [F.pilotL, F.pilotR - 1.5]];
  const loop = [...W(half), ...lo(W(half))];
  // the break edge runs from the last lower point back to the first upper point
  const ring = K.rect(-F.t, BC + RB, 0, F.r);
  return part(9, X.cutBroken(V, loop, loop.length - 1, { body: true, amp: 1.6, seed: 4 }) + both((sg) => K.body(V, sideOf(sg, ring))));
}

// 10 STARTER RING GEAR SUPPORT: a cast plate on the flange, a skirt with the alternator's V pulley
export const SUP = { skirt0: 92, skirt1: 104, back: -40, ring: 128 };
export function supportPts() {
  const T = M.SUPPORT_T;
  return {
    outer: [[0, BC + RCB], [T, BC + RCB], [T, SUP.skirt1], [-12, SUP.skirt1], [-16, 96], [-24, 96], [-28, SUP.skirt1], [-32, SUP.skirt1], [-32, SUP.ring], [SUP.back, SUP.ring], [SUP.back, SUP.skirt0], [0, SUP.skirt0]],
    inner: K.rect(0, BORE, T, BC - RCB),
  };
}
export function support(V) {
  const { outer, inner } = supportPts();
  return part(10, both((sg) => K.cut(V, sideOf(sg, outer), { mat: "alu", angle: 135 }) + K.cut(V, sideOf(sg, inner), { mat: "alu", angle: 135 })));
}
// 11 STARTER RING GEAR: a hatched rim, the teeth (not hatched) beyond it
export const GEAR = { s0: -44, s1: -30, rim: 135, tip: 142 };
export function ringGear(V) {
  const rim = K.rect(GEAR.s0, SUP.ring, GEAR.s1, GEAR.rim);
  const teeth = [[GEAR.s0, GEAR.rim], [GEAR.s1, GEAR.rim], [GEAR.s1, GEAR.tip - 1], [GEAR.s1 - 1, GEAR.tip], [GEAR.s0 + 1, GEAR.tip], [GEAR.s0, GEAR.tip - 1]];
  return part(11, both((sg) => K.cut(V, sideOf(sg, rim), { mat: "steel", angle: 45 }) + K.body(V, sideOf(sg, teeth)) + K.line(V, sideOf(sg, [[GEAR.s0, 138], [GEAR.s1, 138]]), "thin")));
}
// 14 ALTERNATOR V-BELT in the pulley groove
export const BELT = [[-11, 106], [-15, 98], [-25, 98], [-29, 106]];
export function belt(V) {
  return part(14, both((sg) => K.cut(V, sideOf(sg, BELT), { mat: "rubber", angle: 45 })));
}

// 12 SPINNER SCREW No 8 and 13 ANCHOR NUTPLATE, one pair on each lip, on the plane
export const SCREWS = [
  { s: 16, rOut: M.SPIN_R, lipIn: M.SPIN_R - M.SPIN_SKIN - M.BULK_R_T },
  { s: 160, rOut: rSpin(160), lipIn: rSpin(160) - M.SPIN_SKIN - M.BULK_F_T },
];
export function screwPts({ s, rOut, lipIn }) {
  const hw = 4; // pan head Ø8
  const sh = 2.1; // shank Ø4.2
  return [[s - sh, lipIn - 5.5], [s - sh, rOut], [s - hw, rOut], [s - hw + 0.6, rOut + 1.6], [s - 1.8, rOut + 2.4], [s + 1.8, rOut + 2.4], [s + hw - 0.6, rOut + 1.6], [s + hw, rOut], [s + sh, rOut], [s + sh, lipIn - 5.5]];
}
export const nutplatePts = ({ s, lipIn }) => K.rect(s - 3.8, lipIn - 6, s + 3.8, lipIn);
export function screws(V) {
  return part(12, both((sg) => SCREWS.map((c) => K.body(V, sideOf(sg, screwPts(c)))).join("")));
}
export function nutplates(V) {
  return part(13, both((sg) => SCREWS.map((c) => K.body(V, sideOf(sg, nutplatePts(c))) + K.line(V, sideOf(sg, [[c.s - 2.1, c.lipIn - 6], [c.s - 2.1, c.lipIn]]), "hid") + K.line(V, sideOf(sg, [[c.s + 2.1, c.lipIn - 6], [c.s + 2.1, c.lipIn]]), "hid")).join("")));
}
// 15 SAFETY WIRE: each pair of bolt heads wired together, the twist running round to the next head
export const WIRE = [[BOLT.head0 + 3, BEYOND + BOLT.af + 0.2], [BOLT.head0 + 4.6, BEYOND + BOLT.af + 0.2], [BOLT.head0 + 4.6, BC - BOLT.af - 0.2], [BOLT.head0 + 3, BC - BOLT.af - 0.2]];
export function wire(V) {
  const twist = (sg) => {
    let d = "";
    for (let r = BEYOND + BOLT.af + 2; r < BC - BOLT.af - 1; r += 2.2) d += K.d(V, [[-(BOLT.head0 + 3), sg * r], [-(BOLT.head0 + 4.6), sg * (r + 1.4)]], false);
    return `<path class="paper-line" d="${d}"/>`;
  };
  return part(15, both((sg) => K.cut(V, sideOf(sg, WIRE), { mat: "solid" }) + twist(sg)));
}

// ================================================================ VIEW FROM AHEAD (X, Y)
// the projected planform of blade 2 (to the right), from the spinner out to the tip
export function planformPts(rFrom = M.SPIN_R, rTo = M.R) {
  const top = [];
  const bot = [];
  const rs = [];
  for (let r = rFrom; r < M.R * 0.95; r += 12) rs.push(r);
  for (let i = 0; i <= 10; i++) rs.push(M.R * (0.95 + 0.05 * Math.sin((i / 10) * (Math.PI / 2))));
  for (const r of rs) {
    if (r > rTo) break;
    const [a, b] = M.projected(Math.min(r, M.R - 0.01));
    // looking aft the blade turns anticlockwise: its leading edge is up (−t)
    top.push([r, -a]);
    bot.unshift([r, -b]);
  }
  return [...top, ...bot];
}
export function planform(V) {
  const blade = planformPts();
  // blade 1 (to the left) is the same turned half a revolution, broken off past the spinner
  const stub = planformPts(M.SPIN_R, 236).map(([x, y]) => [-x, -y]);
  const n = stub.length / 2;
  const axis = K.line(V, [[M.SPIN_R, 0], [M.R + 6, 0]], "ctr");
  return part(1, K.body(V, blade) + X.cutBroken(V, stub, n - 1, { body: true, amp: 1.4, seed: 7 }) + axis);
}
// the spinner seen from ahead, with the hub, bolts and bulkhead hidden behind it
export function spinnerAhead(V) {
  return part(2, K.body(V, K.circle(0, 0, M.SPIN_R, 96)) + K.line(V, K.circle(0, 0, 3, 16), "thin", true));
}
export function hiddenAhead(V) {
  let bolts = "";
  for (let k = 0; k < 6; k++) {
    const a = k * 60 * rad;
    bolts += K.line(V, K.circle(BC * Math.cos(a), BC * Math.sin(a), BOLT.af, 6), "hid", true);
  }
  return part(1, K.line(V, K.circle(0, 0, M.R_HUB, 72), "hid", true)) + part(6, bolts);
}

// ================================================================ BLADE SECTIONS (t, z)
export function bladeSection(V, r) {
  return part(1, K.cut(V, M.sectionAt(r), { mat: "alu", angle: 45 }));
}
// the section's leading edge and quarter-chord point, in (t, z)
export function sectionPoints(r) {
  const c = M.chord(r);
  const tc = M.thickRatio(r);
  const k = tc / 0.117;
  const [le, qc, te] = M.placeSection([[0, 0.035 * k * c], [0.25 * c, 0.06 * k * c], [c, 0]], r);
  return { le, qc, te, c };
}
