// The lever escapement's solids for its 3D view (escapement-3d.html). Pure data built with
// kit/solid3d.mjs from the 2D sheet's own geometry: model.mjs (wheel, stones, balance, hairspring)
// and parts.mjs (every outline and section profile).
//
// World frame: x = the plan's u, y = the section's z (up, from the lower pivot's end), z = the plan's
// v. The cutting plane z = 0 is the line of centres, SECTION A-A's plane. A watch is small and the
// kit's cut-face bias is 0.25 world mm, so the world is the model at 20:1 (the sheet's plan scale):
// one world mm is 0.05 mm of watch. Plan angles turn into world rot.y with a minus sign
// (a counter-clockwise plan turn of β is rot.y = −β): the plan is seen from the dial side, the 3D
// view from above, so the 3D view is the plan's mirror image, as the real movement is.
//
// What is cut: what SECTION A-A cuts — the frame (mainplate, cock, the two shock-absorbing bearings,
// the stud, the banking pins), the balance staff, rim, arms, collet and hairspring — and the pallet
// arbor. With the
// near half of the balance gone, the double roller, impulse jewel and fork beneath it show. The
// escapement proper (wheel and pinion, fork, stones, guard pin, rollers, jewel) is left
// whole so it can be watched working: WHOLE lists it and live3d.js keeps the cut off its materials.
//
// What the sheet does not draw and the 3D view had to invent, kept plain:
//   - the mainplate as a 17 × 11 mm slice with pivot holes for the pallet and escape arbors;
//   - the cock as a round head on an arm along the line of centres, with a foot on the plate;
//   - the wheel and fork heights (the sheet's section only gives the balance's), the escape arbor and
//     the pallet arbor's shape; no pallet bridge or train (the arbors' upper pivots stand free).

import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

export const k = 20; // world mm per model mm
const Z = P.SZ;
const RAD = Math.PI / 180;
const B = M.B;
const E = M.E;
export const BX = B[0] * k;
export const EX = E[0] * k;
const w = (u, zz, v = 0) => [u * k, zz * k, v * k];
const wp = ([u, v], zz) => w(u, zz, v); // a plan point [u, v] at height zz
const plan = (pts) => pts.map(([u, v]) => [u * k, v * k]); // a plan outline for extrude along y: [x, z]
const prof = (pts) => pts.map(([r, zz]) => [r * k, zz * k]); // a section half-profile for a lathe
const ring = (c, r, n = 96) => S.circle(c[0] * k, c[1] * k, r * k, n);
const flat = (shape, z0, z1, o = {}) => S.extrude(plan(shape), { along: "y", from: z0 * k, to: z1 * k, ...o });

// ---------------------------------------------------------------- the sheet's outlines, read back from parts.mjs
// parts.mjs draws into a view: a view whose p() keeps world mm gives back its exact outlines and
// section profiles, so nothing is retyped. Returns Map(part id → [path, …]), a path being its subpaths.
const CAPTURE = { p: ([u, v]) => [u, v], k: 1, x: 0, y: 0, scale: 1 };
function paths(svg) {
  const out = new Map();
  for (const g of svg.matchAll(/<g data-part="(\d+)"[^>]*>(.*?)<\/g>/gs)) {
    const id = Number(g[1]);
    const list = out.get(id) ?? [];
    let last = null;
    for (const m of g[2].matchAll(/ d="([^"]+)"/g)) {
      if (m[1] === last) continue; // K.cut writes each outline three times (paper, hatch, line)
      last = m[1];
      list.push(m[1].split("M").filter((s) => s.trim()).map((sp) => sp.replace(/Z/g, "").split("L").map((t) => t.trim().split(/\s+/).map(Number))));
    }
    out.set(id, list);
  }
  return out;
}
const grab = (fn, ...a) => paths(fn(CAPTURE, ...a));
// the right half (r ≥ 0) of a section part drawn both sides of its axis
const right = (list, du = 0) => list.map((p) => p[0].map(([u, v]) => [u - du, v])).find((p) => Math.min(...p.map(([u]) => u)) >= -1e-9);

// ---------------------------------------------------------------- profiles
const staffSvg = grab(P.staffSec).get(8)[0][0];
const stop = staffSvg.findIndex(([u], i) => i > 0 && Math.abs(u) < 1e-9);
export const STAFF = staffSvg.slice(0, stop + 1); // [r, z] from the lower pivot's end to the upper's

function bearingLoops(dir) {
  const g = grab(P.bearing, dir);
  const cap = g.get(6)[0][0].map(([u, v]) => [Math.max(0, u), v]);
  return { block: right(g.get(3)), chaton: right(g.get(4)), hole: right(g.get(5)), cap, lyre: right(g.get(7)) };
}
export const UPPER = bearingLoops(1);
export const LOWER = bearingLoops(-1);

const rollerRight = right(grab(P.rollerSec).get(13));
const collet = right(grab(P.colletSec).get(11));

// ---------------------------------------------------------------- plan outlines
const wheelSvg = grab(P.wheel).get(20)[0]; // [outline, five windows]
const pinionLeaves = grab(P.pinion).get(21)[0][0];
const palletSvg = grab(P.pallet).get(15)[0][0];
const guard = grab(P.guardPinPlan).get(19)[0][0];
const safety = grab(P.safetyRoller).get(13)[0][0];
const jewel = grab(P.jewelPlan).get(14)[0][0];
const studBlock = grab(P.stud).get(12)[0][0];

// The hairspring: the sheet's spiral (P.spiral) given its 0.034 mm thickness, a flat strip
// extruded through its 0.12 mm height. Rebuilt by live3d.js as the balance turns.
export function hairspringShape(th) {
  const c = P.spiral(th, 6);
  const h = M.HS.h / 2;
  const side = (sg) =>
    c.map((p, i) => {
      const a = c[Math.max(0, i - 1)];
      const b = c[Math.min(c.length - 1, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return [p[0] - (sg * h * (b[1] - a[1])) / l, p[1] + (sg * h * (b[0] - a[0])) / l];
    });
  return plan([...side(1), ...side(-1).reverse()]);
}

// Where the hairspring's outermost coil on the near side (u < B) crosses the cutting plane: its
// balloon's anchor, moved by live3d.js as the coils breathe.
export function hairspringCut(th) {
  const aIn = P.STUD_A - 360 * M.HS_TURNS + th;
  const a = 180 - 360 * Math.ceil((180 - P.STUD_A) / 360);
  const r = M.HS.r0 + ((M.HS.r1 - M.HS.r0) * (a - aIn)) / (P.STUD_A - aIn);
  return w(B[0] - r, (Z.hs[0] + Z.hs[1]) / 2);
}

// A polygon grown outward by d (mitred): the accent tooth sits a hair outside the wheel's own.
function grow(pts, d) {
  const n = pts.length;
  const A = pts.reduce((s, [x0, y0], i) => s + x0 * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * y0, 0);
  const sg = A > 0 ? 1 : -1;
  const nrm = (a, b) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(sg * (b[1] - a[1])) / l, (-sg * (b[0] - a[0])) / l];
  };
  return pts.map((p, i) => {
    const n0 = nrm(pts[(i + n - 1) % n], p);
    const n1 = nrm(p, pts[(i + 1) % n]);
    const m = 1 + n0[0] * n1[0] + n0[1] * n1[1];
    const f = d / Math.max(0.3, m);
    return [p[0] + (n0[0] + n1[0]) * f, p[1] + (n0[1] + n1[1]) * f];
  });
}

// ---------------------------------------------------------------- heights the sheet does not give (mm)
export const WHEEL_Z = [0.96, 1.1]; // escape wheel, in the fork's plane
export const PINION_Z = [0.45, 0.96];
export const STONE_Z = [0.9, 1.16]; // the stones stand proud of the fork's arms
const PIN_TOP = 1.2; // banking pins, from under the plate
const ACC = 0.006; // the accent tooth's skin, mm
const PLATE = { u0: E[0] - 3.0, u1: B[0] + 6.2, v: 5.2, r: 2.0 };
const COCK = { head: 1.7, hw: 1.1, foot: [4.85, 5.95] };

// rounded rectangle in plan
function rrect(u0, v0, u1, v1, r, n = 10) {
  const out = [];
  const corner = (cu, cv, a0) => {
    for (let i = 0; i <= n; i++) {
      const a = (a0 + (90 * i) / n) * RAD;
      out.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]);
    }
  };
  corner(u1 - r, v0 + r, -90);
  corner(u1 - r, v1 - r, 0);
  corner(u0 + r, v1 - r, 90);
  corner(u0 + r, v0 + r, 180);
  return out;
}

function cockOutline() {
  const { head, hw, foot } = COCK;
  const a = Math.asin(hw / head) / RAD;
  const arc = [];
  for (let i = 0; i <= 48; i++) {
    const t = (a + ((360 - 2 * a) * i) / 48) * RAD;
    arc.push([B[0] + head * Math.cos(t), head * Math.sin(t)]);
  }
  const end = B[0] + foot[1];
  return [...arc, [end - 0.3, -hw], [end, -hw + 0.3], [end, hw - 0.3], [end - 0.3, hw]];
}

// The balance's hub and three arms in one outline (P.balanceArms' arms at 90°, 210°, 330°).
function spider() {
  const { ri, armW, hub } = M.BAL;
  const R = hub + 0.12;
  const hw = armW / 2;
  const out = [];
  const arms = [90, 210, 330];
  const da = Math.asin(hw / R) / RAD;
  arms.forEach((a, i) => {
    const c = Math.cos(a * RAD);
    const s = Math.sin(a * RAD);
    const p = (r, ww) => [B[0] + r * c - ww * s, B[1] + r * s + ww * c];
    const rh = Math.sqrt(R * R - hw * hw);
    out.push(p(rh, -hw), p(ri + 0.04, -hw), p(ri + 0.04, hw), p(rh, hw));
    const a1 = arms[(i + 1) % 3] + (i === 2 ? 360 : 0);
    for (let j = 1; j < 10; j++) {
      const t = (a + da + ((a1 - da - (a + da)) * j) / 10) * RAD;
      out.push([B[0] + R * Math.cos(t), B[1] + R * Math.sin(t)]);
    }
  });
  return out;
}

// ---------------------------------------------------------------- explode (mm, up the staff's axis)
const EXP = { plate: -3.2, chaton: -4.4, cap: -5.2, lyre: -5.8, esc: 1.4, balance: 4.0, cock: 7.6, uChaton: 8.6, uCap: 9.4, uLyre: 10.0 };
const up = (mm) => [0, mm * k, 0];

// The parts the cut leaves whole (live3d.js turns the cut off their materials).
export const WHOLE = [13, 14, 15, 17, 18, 19, 20, 21];
export const BALANCE = [8, 9, 10, 11, 13, 14];
export const FORK = [15, 16, 17, 18, 19];

export function parts() {
  const lathe = (loop, o = {}) => S.lathe(prof(loop), { at: [BX, 0], ...o });
  const bearing = (key, ex) => [lathe(UPPER[key], { explode: up(ex[0]) }), lathe(LOWER[key], { explode: up(ex[1]) })];
  const pivotB = [BX, 0, 0];
  const pivotE = [EX, 0, 0];
  const [s0, s1, t0, t1] = [rollerRight[0][1], rollerRight[2][1], rollerRight[4][1], rollerRight[6][1]];
  const rN = rollerRight[3][0]; // the neck between the rollers
  const rT = rollerRight[5][0]; // the impulse table
  const rS = rollerRight[0][0]; // the staff's seat
  const { ro, ri } = M.BAL;
  const ch = 0.05;
  const pinLoop = [[0, -0.02], [0.03, -0.02], [0.045, 0], [0.045, 0.36], [0.1, 0.38], [0.16, 0.42]];
  const arbor = (r, top) => [...pinLoop, [r, 0.42], [r, top - 0.22], [0.1, top - 0.2], [0.045, top - 0.18], [0.045, top - 0.02], [0.03, top], [0, top]];
  return [
    // ---- the frame, cut on the line of centres
    S.part(1, "MAINPLATE (PART)", [
      flat(rrect(PLATE.u0, -PLATE.v, PLATE.u1, PLATE.v, PLATE.r), Z.plateLo, Z.plateHi, {
        holes: [ring(B, 0.955), ring([0, 0], 0.06, 32), ring(E, 0.06, 32), ...[1, -1].map((sg) => ring(P.bankCentre(sg), P.BANK_R + 0.005, 48))],
      }),
    ], { mat: "brass", angle: 45, explode: up(EXP.plate), anchor: { cut: w(-4.6, -0.05), out: { c: w(-4.6, Z.plateHi, -2.5) } } }),
    S.part(2, "BALANCE COCK", [
      flat(cockOutline(), Z.cockLo, Z.cockHi, { holes: [ring(B, 0.955)] }),
      flat(rect(B[0] + COCK.foot[0], -COCK.hw, B[0] + COCK.foot[1], COCK.hw), Z.plateHi, Z.cockLo),
    ], { mat: "brass", angle: 45, explode: up(EXP.cock), anchor: { cut: w(B[0] + 3.2, 3.2), out: { c: w(B[0] + 3.2, Z.cockHi, -0.5) } } }),
    S.part(3, "SHOCK BLOCK Ø1.9", bearing("block", [EXP.cock, EXP.plate]), {
      mat: "steel", angle: 135, anchor: { cut: w(B[0] + 0.9, 3.0), out: { c: w(B[0], 3.3), r: 0.95 * k, axis: "y" }, solid: 0 },
    }),
    S.part(4, "CHATON Ø1.2", bearing("chaton", [EXP.uChaton, EXP.chaton]), {
      mat: "brass", angle: 30, anchor: { cut: w(B[0] - 0.55, 2.94), out: { c: w(B[0], 3.0), r: 0.6 * k, axis: "y" }, solid: 0 },
    }),
    S.part(5, "HOLE JEWEL Ø1.0×0.2, OLIVE", bearing("hole", [EXP.uChaton, EXP.chaton]), {
      mat: "plastic", angle: 60, anchor: { cut: w(B[0] + 0.32, 2.93), out: { c: w(B[0], 2.93), r: 0.5 * k, axis: "y" }, solid: 0 },
    }),
    S.part(6, "CAP JEWEL Ø1.0×0.12", bearing("cap", [EXP.uCap, EXP.cap]), {
      mat: "plastic", angle: 135, anchor: { cut: w(B[0] - 0.3, 3.16), out: { c: w(B[0], 3.16), r: 0.5 * k, axis: "y" }, solid: 0 },
    }),
    S.part(7, "LYRE SPRING Ø0.05 WIRE", bearing("lyre", [EXP.uLyre, EXP.lyre]).map((s) => ({ ...s, hatch: "solid" })), {
      anchor: { cut: w(B[0] + 0.6, 3.245), out: { c: w(B[0], 3.245), r: 0.84 * k, axis: "y" }, solid: 0 },
    }),
    S.part(12, "HAIRSPRING STUD", [flat(studBlock, Z.hs[0] - 0.12, Z.cockLo)], {
      mat: "steel", angle: 45, explode: up(EXP.cock), anchor: { cut: wp(studAt(), 2.5), out: { c: wp(studAt(), 2.5) } },
    }),
    // ---- the balance: staff (cut), rim and arms, rollers, jewel, hairspring and collet (whole)
    S.part(8, "BALANCE STAFF, PIVOTS Ø0.09", [lathe(STAFF)], {
      explode: up(EXP.balance), anchor: { cut: w(B[0] - 0.1, 2.1), out: { c: w(B[0], 2.1), r: 0.25 * k, axis: "y" } },
    }),
    S.part(9, "BALANCE Ø9.0, 3 ARMS", [
      lathe([[ri, Z.rim[0]], [ro - ch, Z.rim[0]], [ro, Z.rim[0] + ch], [ro, Z.rim[1] - ch], [ro - ch, Z.rim[1]], [ri, Z.rim[1]]]),
      flat(spider(), Z.hub[0], Z.hub[1], { holes: [ring(B, 0.305, 48)], pivot: pivotB, live: "arms" }),
    ], { mat: "bronze", angle: 45, explode: up(EXP.balance), anchor: { cut: w(B[0] + (ro + ri) / 2, (Z.rim[0] + Z.rim[1]) / 2), out: { c: w(B[0], Z.rim[1]), r: ro * k, axis: "y" } } }),
    S.part(10, "HAIRSPRING 0.034×0.12", [flat(unplan(hairspringShape(0)), Z.hs[0], Z.hs[1], { live: "hs" })], {
      hatch: "solid", explode: up(EXP.balance), anchor: { cut: hairspringCut(0), out: { c: w(B[0], Z.hs[1]), r: M.HS.r1 * k, axis: "y" } },
    }),
    S.part(11, "HAIRSPRING COLLET Ø1.2", [lathe(collet)], {
      mat: "brass", angle: 135, explode: up(EXP.balance), anchor: { cut: w(B[0] + 0.45, (Z.collet[0] + Z.collet[1]) / 2), out: { c: w(B[0], (Z.collet[0] + Z.collet[1]) / 2), r: 0.6 * k, axis: "y" } },
    }),
    S.part(13, "DOUBLE ROLLER Ø2.0/Ø0.9", [
      lathe([[rS, s1], [rN, s1], [rN, t0], [rT, t0], [rT, t1], [rS, t1]]),
      flat(safety, s0, s1, { holes: [ring(B, rS + 0.005, 48)], pivot: pivotB, live: "safety" }),
    ], { mat: "steel", angle: 45, explode: up(EXP.balance), anchor: { cut: w(B[0] + 0.45, t1, 0.25), out: { c: w(B[0] + 0.45, t1, 0.25) } } }),
    S.part(14, "IMPULSE JEWEL Ø0.28, D", [flat(jewel, 0.95, t1 + 0.04, { pivot: pivotB, live: "jewel" })], {
      explode: up(EXP.balance), anchor: { cut: w(B[0] - M.R_JEWEL, t1 + 0.04, 0.05), out: { c: w(B[0] - M.R_JEWEL, t1 + 0.04, 0.05) }, solid: 0 },
    }),
    // ---- pallet fork (turns about P, the origin)
    S.part(15, "PALLET FORK", [flat(palletSvg, Z.fork[0], Z.fork[1], { holes: [ring([0, 0], 0.165, 48)] })], {
      mat: "steel", angle: 30, explode: up(EXP.esc), anchor: { cut: w(2.2, Z.fork[1], -0.1), out: { c: w(2.2, Z.fork[1], -0.1) } },
    }),
    S.part(16, "PALLET ARBOR, PIVOTS Ø0.09", [lathe(arbor(0.16, 1.55), { at: [0, 0] })], {
      explode: up(EXP.esc), anchor: { cut: w(0.06, 1.25), out: { c: w(0, 1.25), r: 0.16 * k, axis: "y" } },
    }),
    S.part(17, "ENTRY PALLET STONE 0.245", [flat(M.STONE_ENTRY, ...STONE_Z)], {
      mat: "plastic", angle: 60, explode: up(EXP.esc), anchor: { cut: w(...mid(M.STONE_ENTRY, STONE_Z[1])), out: { c: w(...mid(M.STONE_ENTRY, STONE_Z[1])) } },
    }),
    S.part(18, "EXIT PALLET STONE 0.245", [flat(M.STONE_EXIT, ...STONE_Z)], {
      mat: "plastic", angle: 60, explode: up(EXP.esc), anchor: { cut: w(...mid(M.STONE_EXIT, STONE_Z[1])), out: { c: w(...mid(M.STONE_EXIT, STONE_Z[1])) } },
    }),
    S.part(19, "GUARD PIN Ø0.10", [flat(guard, Z.fork[0] - 0.1, Z.fork[0])], {
      explode: up(EXP.esc), anchor: { cut: w(P.GUARD_TIP - 0.15, Z.fork[0] - 0.1, 0), out: { c: w(P.GUARD_TIP - 0.15, Z.fork[0] - 0.1, 0) } },
    }),
    // ---- escape wheel and pinion (turn about E)
    S.part(20, "ESCAPE WHEEL 15 CLUB TEETH", [
      flat(wheelSvg[0], ...WHEEL_Z, { holes: [...wheelSvg.slice(1), S.circle(E[0], E[1], 0.125, 48)].map(plan), pivot: pivotE, live: "wheel" }),
      flat(grow(M.toothLocal(0).map(([u, v]) => [u + E[0], v + E[1]]), ACC), WHEEL_Z[0] - ACC, WHEEL_Z[1] + ACC, { pivot: pivotE, live: "acc", own: true }),
    ], { mat: "steel", angle: 135, explode: up(EXP.esc), anchor: { cut: wp(polarE(1.6, 150), WHEEL_Z[1]), out: { c: wp(polarE(1.6, 150), WHEEL_Z[1]) } } }),
    S.part(21, "ESCAPE PINION z=7, m 0.065", [
      flat(pinionLeaves, ...PINION_Z, { pivot: pivotE, live: "leaves" }),
      lathe(arbor(0.12, 1.5), { at: [EX, 0] }),
    ], { explode: up(EXP.esc), anchor: { cut: w(E[0] + 0.03, 1.4), out: { c: w(E[0], 1.4), r: 0.045 * k, axis: "y" } } }),
    S.part(22, "BANKING PIN Ø0.30", [1, -1].map((sg) => S.cylinder({ at: plan([P.bankCentre(sg)])[0], r: P.BANK_R * k, from: Z.plateLo * k, to: PIN_TOP * k })), {
      explode: up(EXP.plate), anchor: { cut: wp(P.bankCentre(-1), PIN_TOP), out: { c: wp(P.bankCentre(-1), PIN_TOP) } },
    }),
  ];
}

function polarE(r, a) {
  return [E[0] + r * Math.cos(a * RAD), E[1] + r * Math.sin(a * RAD)];
}
function mid(stone, zz) {
  const u = stone.reduce((s, p) => s + p[0], 0) / stone.length;
  const v = stone.reduce((s, p) => s + p[1], 0) / stone.length;
  return [u, zz, v];
}
function studAt() {
  const u = studBlock.reduce((s, p) => s + p[0], 0) / studBlock.length;
  const v = studBlock.reduce((s, p) => s + p[1], 0) / studBlock.length;
  return [u, v];
}
function rect(u0, v0, u1, v1) {
  return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
}
const unplan = (pts) => pts.map(([x, z]) => [x / k, z / k]);

export const centres = () => [
  { line: [w(B[0], -0.8), w(B[0], 3.9)], part: 8 },
  { line: [w(0, -0.8), w(0, 1.9)], part: 16 },
  { line: [w(E[0], -0.8), w(E[0], 1.85)], part: 21 },
];

export const scene = () => ({ parts: parts(), centres: centres() });

// the tour time shown under reduced motion: half way through an entry-stone impulse
export const STILL = 4.25;
// a point on the rim's near side, for the drag self-test
export const RIM_GRIP = w(B[0], Z.rim[1], M.BAL.ro - 0.25);
