// The flight controls' solids for their 3D view (flight-controls-3d.html). Pure data, kit/solid3d.mjs.
//
// Frame: the aircraft's 3D frame (light-aircraft scene3d.mjs): x = −FS (forward), y = WL, z = BL (to
// starboard), so the kit's cut z = 0 is the fuselage centre line and the half it removes is the starboard
// one: the left seat's wheel and pedals, the port wing's aileron run, the elevator, tab and rudder stay.
// Everything is written in mm from model.mjs (the same arrangement and routes the sheet draws), then
// scaled to centimetres (UNIT), as the aircraft is, so an 11 m aeroplane fits the kit's camera.
//
// The airframe is glass: outlines only, capped where the cut passes through it (the cabin roof, the
// tail cone's skin, the wing and tail roots), so the runs inside stay in view. The wing's taper and
// dihedral, the fin's sweep and the tailplane's taper are the kit's `warp`; those glass solids are never
// cut away from their root, where the warp leaves the section unchanged.
//
// NTS simplifications (the sheet is the authority): the cables are drawn Ø16 instead of Ø3.2 so they show
// at the scale of the whole aeroplane, and the pulleys a little under their groove radius so the thick
// cables ride on them; the cables are fixed solids along the rest pose's routes (their ends move a few
// mm with the arms; the turnbuckles ride them to show the travel); the actuator is a closed body (Section
// D-D shows its screw and nut); the rudder pedals' cable arms are short plates.

import * as A from "../light-aircraft/model.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as D from "./details.mjs";

export const UNIT = 0.1; // scene units per mm
const EXPLODE = 2.5; // the parts' explode offsets, written for a person-sized assembly, opened out for an 8 m aeroplane
const rad = Math.PI / 180;
const { sub, add, mul, cross, norm } = M.V3;
// (FS, BL, WL) → the scene's (x, y, z) in mm
export const s3 = ([fs, bl, wl]) => [-fs, wl, bl];
const TPL = A.TAILPLANE;
const C = A.CABIN;
const R = M.PULLEY_D / 2;
const CABLE_R = 8; // drawn Ø16 (NTS)
const REST = (() => {
  const sol = M.solve(M.state());
  const ps = M.pose(sol);
  return { sol, ps, runs: M.cables(ps, sol) };
})();
export const runsAtRest = () => REST.runs;

// ---------------------------------------------------------------- helpers
// a frame (e1, e2) perpendicular to unit t
function perp(t) {
  const ref = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const e1 = norm(cross(t, ref));
  return [e1, cross(t, e1)];
}
// a cable: a round section swept along a polyline (aircraft frame), as one warped extrusion
function cableSolid(pts, live) {
  const seg = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(...sub(pts[i], pts[i - 1]));
    if (d < 1e-6) continue;
    seg.push({ a: pts[i - 1], b: pts[i], l0: L, d, t: norm(sub(pts[i], pts[i - 1])) });
    L += d;
  }
  const at = (x) => {
    let k = seg.findIndex((g) => x <= g.l0 + g.d);
    if (k < 0) k = seg.length - 1;
    const g = seg[k];
    return { p: add(g.a, mul(g.t, Math.min(g.d, Math.max(0, x - g.l0)))), t: g.t };
  };
  // along x the shape is [z, y]; the warp puts each slice on the path, square to it
  return S.extrude(S.circle(0, 0, CABLE_R, 8), {
    along: "x",
    from: 0,
    to: L,
    steps: Math.max(8, Math.ceil(L / 30)),
    hatch: "none",
    own: true,
    live,
    smooth: 50,
    warp: ([x, y, z]) => {
      const { p, t } = at(x);
      const [e1, e2] = perp(t);
      return s3(add(p, add(mul(e1, z), mul(e2, y))));
    },
  });
}
// a pulley: a ring about its own axis, placed by a rigid warp
function pulleySolid(w, wide = false) {
  const n = w.axis;
  const [e1, e2] = perp(n);
  const r1 = R - CABLE_R - 1;
  const h = wide ? 30 : 7;
  // two pulleys far apart on one cross shaft (the rudder cables' floor pulleys): discs and the shaft
  const loop = typeof wide === "number" ? [[4, -wide - 8], [r1, -wide - 8], [r1, -wide + 8], [8, -wide + 8], [8, wide - 8], [r1, wide - 8], [r1, wide + 8], [4, wide + 8]] : [[4, -h], [r1, -h], [r1, h], [4, h]];
  return S.lathe(loop, {
    axis: "z",
    at: [0, 0],
    segments: 20,
    own: true,
    warp: ([x, y, z]) => s3(add(w.c, add(mul(e1, x), add(mul(e2, y), mul(n, z))))),
  });
}
// a straight round bar from a to b (aircraft frame), radius r
function bar(a, b, r, o = {}) {
  const t = norm(sub(b, a));
  const [e1, e2] = perp(t);
  const L = Math.hypot(...sub(b, a));
  return S.extrude(S.circle(0, 0, r, 12), { along: "x", from: 0, to: L, ...o, warp: ([x, y, z]) => s3(add(a, add(mul(t, x), add(mul(e1, z), mul(e2, y))))) });
}
// an extruded plate: an outline in the (FS, WL) plane, from BL b0 to b1
const xyFsWl = (pts) => pts.map(([fs, wl]) => [-fs, wl]);
const plate = (pts, b0, b1, o = {}) => S.extrude(xyFsWl(pts), { along: "z", from: Math.min(b0, b1), to: Math.max(b0, b1), ...o });
// a point for an anchor: { cut, out } on the part
const anchorAt = (p) => ({ cut: s3(p), out: { c: s3(p), r: 0 } });

// ---------------------------------------------------------------- the airframe, glass
function airframe() {
  const glass = { role: "glass", hatch: "none", own: true };
  const out = [];
  // cabin: the roof and the two sides (thin skins)
  out.push(S.extrude([[C.half, C.roof - 12], [-C.half, C.roof - 12], [-C.half, C.roof], [C.half, C.roof]], { along: "x", from: -C.fs1, to: 0, ...glass }));
  // the port side (the starboard one is the half the cut takes away)
  out.push(S.extrude([[-C.half, C.floor], [-(C.half - 12), C.floor], [-(C.half - 12), C.roof - 12], [-C.half, C.roof - 12]], { along: "x", from: -C.fs1, to: 0, ...glass }));
  // tail cone: a hollow body of revolution, 12 mm skin
  const fsS = [C.fs1, 3000, 3600, 4200, 4800, 5400, 6000, A.TAILCONE.fs1];
  const outer = fsS.map((fs) => [A.coneR(fs), -fs]);
  const inner = fsS.map((fs) => [A.coneR(fs) - 12, -fs]).reverse();
  out.push(S.lathe([...outer, ...inner], { axis: "x", at: [A.TAILCONE.axis, 0], segments: 40, ...glass }));
  // wing: the root section swept tip to tip; the warp tapers the outer panels to the straight trailing
  // edge and lifts every station by the dihedral (the section at the root is the true one)
  const af = A.naca2412(16);
  const sec = [...af.upper, ...af.lower.slice(1, -1).reverse()].map(([x, y]) => A.toWing([x, y]));
  out.push(S.extrude(sec.map(([fs, wl]) => [-fs, wl]), {
    along: "z", from: -A.TIP_WS, to: A.TIP_WS, steps: 24, ...glass,
    warp: ([x, y, z]) => {
      const ws = Math.abs(z);
      const k = A.chordAt(ws) / A.ROOT_CHORD;
      const fs = A.TE_FS - (A.TE_FS - -x) * k;
      return [-fs, A.WL_LE + (y - A.WL_LE) * k + A.dihedralRise(ws) + (1 - k) * 40, z];
    },
  }));
  // tailplane: a symmetric 9 % section from its leading edge to the hinge, tapering to the tip
  const tsec = [];
  for (let i = 0; i <= 10; i++) {
    const x = 0.5 - 0.5 * Math.cos((Math.PI * i) / 10);
    tsec.push([x, 0.6 * 0.09 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4)]);
  }
  const ch0 = TPL.hinge - TPL.le;
  const stab = [...tsec.map(([x, t]) => [-(TPL.le + x * ch0), TPL.wl + t * ch0 * 1.6]), ...tsec.slice(1, -1).reverse().map(([x, t]) => [-(TPL.le + x * ch0), TPL.wl - t * ch0 * 1.6])];
  out.push(S.extrude(stab, {
    along: "z", from: -TPL.span / 2, to: TPL.span / 2, steps: 6, ...glass,
    warp: ([x, y, z]) => {
      const k = 1 - (Math.abs(z) / (TPL.span / 2)) * (1 - (TPL.hinge - TPL.tipLe) / ch0);
      return [-(TPL.hinge - (TPL.hinge - -x) * k), TPL.wl + (y - TPL.wl) * k, z];
    },
  }));
  // fin: its section in plan (x, z) from the leading edge to the rudder hinge, swept back with height
  const F = P.FIN;
  const fc = A.RUDDER_HINGE_FS - F.le0[0];
  const fsec = [...tsec.map(([x, t]) => [-(F.le0[0] + x * fc), t * fc * 1.4]), ...tsec.slice(1, -1).reverse().map(([x, t]) => [-(F.le0[0] + x * fc), -t * fc * 1.4])];
  out.push(S.extrude(fsec, {
    along: "y", from: F.le0[1], to: F.le1[1], steps: 6, ...glass,
    warp: ([x, y, z]) => {
      const h = (y - F.le0[1]) / (F.le1[1] - F.le0[1]);
      const le = F.le0[0] + (F.le1[0] - F.le0[0]) * h;
      const k = (A.RUDDER_HINGE_FS - le) / fc;
      return [-(A.RUDDER_HINGE_FS - (A.RUDDER_HINGE_FS - -x) * k), y, z * k];
    },
  }));
  return S.part("af", "AIRFRAME (GHOST)", out, { hatch: "none" });
}

// ---------------------------------------------------------------- the control parts
export const SURF = {}; // pivots the page turns parts about (scene mm)
export function partsMM() {
  const out = [];
  const { ps, runs, sol } = REST;
  const W = M.WHEEL;
  // 1 wheels: the yoke as a plate in (BL, WL), turning about the column's axis
  const yoke = (s) => {
    const hub = [W.fs, s * W.bl, W.wl];
    const pts = P.YOKE.map(([b, w]) => [s * W.bl + b, W.wl + w - 40]).reverse();
    return S.extrude(pts.map(([bl, wl]) => [bl, wl]), { along: "x", from: -(W.fs + 14), to: -(W.fs - 14), pivot: s3(hub), live: s < 0 ? "wL" : "wR", own: true });
  };
  out.push(S.part(1, "CONTROL WHEEL", [yoke(-1), yoke(1)], { mat: "alu", angle: 45, explode: [-250, 0, 0], anchor: anchorAt([W.fs, -W.bl - 130, W.wl + 80]) }));
  // 2 columns
  out.push(S.part(2, "CONTROL COLUMN TUBE Ø31.8", [-1, 1].map((s) => S.cylinder({ axis: "x", at: [W.wl, s * W.bl], r: M.COLUMN.r, from: -(W.fs - 14), to: -M.COLUMN.fwd, own: true })), { mat: "steel", angle: 135, explode: [-120, 0, 0], anchor: anchorAt([450, -W.bl, W.wl + M.COLUMN.r]) }));
  // 4 sprockets (12-tooth, on the fixed splined shafts), turning with the wheel
  out.push(S.part(4, "SPROCKET 12T", [-1, 1].map((s) => S.gear({ teeth: 12, module: (2 * M.R_SPR) / 12, along: "x", at: [s * W.bl, W.wl], from: -(M.SPR.fs + 6), to: -(M.SPR.fs - 6), bore: 6, pivot: s3([M.SPR.fs, s * W.bl, W.wl]), live: s < 0 ? "sL" : "sR" })), { mat: "steel", angle: 45, explode: [0, 120, 0], anchor: anchorAt([M.SPR.fs, -W.bl, W.wl + M.R_SPR]) }));
  // 5 chains: over each sprocket, the two strands hanging to the cable joints
  const chain = (s) => {
    const c = s * W.bl;
    const r = M.R_SPR + 3;
    const L = M.SPR.chain;
    const loop = [[c - r - 4.5, W.wl - L], ...Array.from({ length: 13 }, (_, i) => [c - (r + 4.5) * Math.cos((i * 15) * rad), W.wl + (r + 4.5) * Math.sin((i * 15) * rad)]), [c + r + 4.5, W.wl - L], [c + r - 4.5, W.wl - L], ...Array.from({ length: 13 }, (_, i) => [c + (r - 4.5) * Math.cos((i * 15) * rad), W.wl + (r - 4.5) * Math.sin((i * 15) * rad)]).reverse(), [c - r + 4.5, W.wl - L]];
    return S.extrude(loop.reverse(), { along: "x", from: -(M.SPR.fs + 5), to: -(M.SPR.fs - 5), own: true });
  };
  out.push(S.part(5, "ROLLER CHAIN 3/8 in", [chain(-1), chain(1)], { hatch: "solid", explode: [0, 120, 0], anchor: anchorAt([M.SPR.fs, -W.bl - M.R_SPR - 3, W.wl - 120]) }));
  // 14 push tubes: collar lug to the idler's arm (posed by the page as one rigid pair)
  const lug0 = [M.COLUMN.collar, -M.COLUMN.lug, W.wl];
  SURF.push = s3(lug0);
  out.push(S.part(14, "ELEVATOR PUSH TUBE", [-1, 1].map((s) => bar([M.COLUMN.collar, s * M.COLUMN.lug, W.wl], [M.IDLER.fs, s * M.COLUMN.lug, W.wl], 7, { own: true })), { mat: "alu", angle: 45, pivot: SURF.push, explode: [-80, 60, 0], anchor: anchorAt([220, -M.COLUMN.lug, W.wl + 7]) }));
  // 15 idler: cross shaft, rod arms and cable arms, turning φ about its shaft
  const io = [M.IDLER.fs, 0, M.IDLER.wl];
  SURF.idler = s3(io);
  out.push(S.part(15, "ELEVATOR IDLER", [
    S.cylinder({ axis: "z", at: [-io[0], io[2]], r: 12, from: -M.IDLER.bl - 8, to: M.IDLER.bl + 8, own: true }),
    ...[-1, 1].map((s) => plate([[io[0] - 9, io[2]], [io[0] + 9, io[2]], [io[0] + 9, io[2] + M.IDL_ROD], [io[0] - 9, io[2] + M.IDL_ROD]], s * M.IDLER.bl - 6, s * M.IDLER.bl + 6, { own: true })),
    plate([[io[0] - M.IDL_CABLE - 8, io[2] - 9], [io[0] + M.IDL_CABLE + 8, io[2] - 9], [io[0] + M.IDL_CABLE + 8, io[2] + 9], [io[0] - M.IDL_CABLE - 8, io[2] + 9]], -66, -34, { own: true }),
  ], { mat: "steel", angle: 30, pivot: SURF.idler, explode: [0, 150, 0], anchor: anchorAt([io[0], -200, io[2] + 12]) }));
  // 11 wing bellcranks (plan triangles), turning about their vertical pivots
  for (const s of [-1, 1]) {
    const bc = s < 0 ? ps.bcL : ps.bcR;
    SURF["bc" + s] = s3(bc.o);
  }
  const bcPlate = (s) => {
    const bc = s < 0 ? ps.bcL : ps.bcR;
    const tri = [bc.fwd, bc.rod, bc.aft].map((p) => [-p[0], p[1]]);
    const hull = [[tri[0][0], tri[0][1] - s * 0], ...tri];
    void hull;
    const pts = [[-bc.fwd[0], bc.fwd[1]], [-bc.rod[0], bc.rod[1]], [-bc.aft[0], bc.aft[1]], [-bc.o[0] - 0, bc.o[1] - s * 22]];
    // along y the shape is [x, z]
    const ccw = s < 0 ? pts : pts.slice().reverse();
    return S.extrude(ccw, { along: "y", from: M.BC_WL - 5, to: M.BC_WL + 5, pivot: s3(bc.o), live: s < 0 ? "bL" : "bR", own: true });
  };
  out.push(S.part(11, "AILERON BELLCRANK", [bcPlate(-1), bcPlate(1)], { mat: "alu", angle: 135, explode: [0, 200, 0], anchor: anchorAt(ps.bcL.o) }));
  // 12 aileron rods: separate parts, posed by the page from their two ends
  for (const s of [-1, 1]) {
    const bc = s < 0 ? ps.bcL : ps.bcR;
    const { t } = P.hornTip(s, 0);
    SURF["rod" + s] = { a: bc.rod, b: t };
    out.push(S.part(s < 0 ? 12 : "12b", "AILERON PUSH-PULL ROD", [bar(bc.rod, t, 6.35)], { hatch: "none", pivot: s3(bc.rod), explode: [0, 260, 0], anchor: s < 0 ? anchorAt(add(bc.rod, [120, 0, 6])) : null }));
  }
  // 13 ailerons: the Section A-A outline swept along the span, lifted by the dihedral, turning on the hinge
  const ailLoop = D.aileronLoop();
  for (const s of [-1, 1]) {
    const hWl = M.AIL_HINGE_WL(M.HORN_WS);
    const pivot = [M.HINGE_FS, s * M.HORN_WS, hWl];
    SURF["ail" + s] = s3(pivot);
    const horn = D.hornPts(0).outline.map(([u, v]) => [-(M.HINGE_FS + u), hWl + v]);
    out.push(S.part(s < 0 ? 13 : "13b", "AILERON WITH HORN", [
      S.extrude(ailLoop.map(([u, v]) => [-(M.HINGE_FS + u), hWl + v]), { along: "z", from: s < 0 ? -M.AIL_WS[1] : M.AIL_WS[0], to: s < 0 ? -M.AIL_WS[0] : M.AIL_WS[1], steps: 4, warp: ([x, y, z]) => [x, y + A.dihedralRise(Math.abs(z)) - A.dihedralRise(M.HORN_WS), z] }),
      S.extrude(horn, { along: "z", from: s * M.HORN_WS - 4, to: s * M.HORN_WS + 4, own: true }),
    ], { mat: "alu", angle: 45, pivot: s3(pivot), explode: [-300, 0, s * 300], anchor: s < 0 ? anchorAt([M.HINGE_FS + 200, s * 4400, hWl + 30]) : null }));
  }
  // 16, 6, 21, 26 cables (the rest pose's routes)
  const cab = (names) => runs.filter(([n]) => names.includes(n)).map(([, r]) => cableSolid(r.pts));
  const ru = Object.fromEntries(runs.map(([n, r]) => [n, r]));
  const mid = (n, k) => ru[n].pts[Math.floor(ru[n].pts.length * k)];
  out.push(S.part(6, "AILERON CABLES Ø3.2 7×19", cab(["ail-L", "ail-I", "ail-R", "ail-B"]), { hatch: "none", anchor: anchorAt(mid("ail-L", 0.62)) }));
  out.push(S.part(16, "ELEVATOR CABLES Ø3.2 7×19", cab(["elev-U", "elev-D"]), { hatch: "none", anchor: anchorAt(P.along(ru["elev-U"].pts, 4200).p) }));
  out.push(S.part(21, "RUDDER CABLES Ø3.2 7×19", cab(["rud-L", "rud-R"]), { hatch: "none", anchor: anchorAt(P.along(ru["rud-L"].pts, 3600).p) }));
  out.push(S.part(26, "TRIM CABLES Ø2.4 7×19", cab(["trim-A", "trim-B"]), { hatch: "none", anchor: anchorAt(P.along(ru["trim-A"].pts, 5200).p) }));
  // 7 pulleys (the pairs on one bolt as one wide pulley)
  const planes = P.pulleyPlanes();
  const pair = { E2U: "E2D", T1A: "T1B", T2A: "T2B", R1L: "R1R" };
  const skip = new Set(Object.values(pair));
  const pl = planes.filter((w) => !skip.has(w.name)).map((w) => {
    if (pair[w.name]) {
      const o = planes.find((x) => x.name === pair[w.name]);
      const span = Math.hypot(...sub(w.c, o.c)) / 2;
      return pulleySolid({ ...w, c: mul(add(w.c, o.c), 0.5) }, span > 40 ? span : true);
    }
    return pulleySolid(w);
  });
  out.push(S.part(7, "PULLEY Ø76.2", pl, { mat: "plastic", angle: 45, anchor: anchorAt(planes.find((w) => w.name === "E3U").c) }));
  // 9 fairlead blocks at the two bulkheads, holes round every cable that passes
  const fl = P.fairleadPoints(runs);
  for (const [i, fs] of M.BULKHEADS.entries()) {
    const hits = fl.filter((p) => Math.abs(p[0] - fs) < 1);
    const zs = hits.map((p) => p[1]);
    const ys = hits.map((p) => p[2]);
    const box = [[Math.min(...zs) - 30, Math.min(...ys) - 30], [Math.max(...zs) + 30, Math.min(...ys) - 30], [Math.max(...zs) + 30, Math.max(...ys) + 30], [Math.min(...zs) - 30, Math.max(...ys) + 30]];
    const solid = S.extrude(box, { along: "x", from: -(fs + 6), to: -(fs - 6), holes: hits.map((p) => S.circle(p[1], p[2], CABLE_R + 2, 12)), own: true });
    if (i === 0) out.push(S.part(9, "FAIRLEAD, SPLIT", [solid], { mat: "plastic", angle: 135, anchor: anchorAt([fs, Math.min(...zs) - 15, Math.max(...ys) + 25]) }));
  }
  // 10 turnbuckles on the elevator cables: ride with them (posed by the page)
  for (const [j, name] of ["elev-U", "elev-D"].entries()) {
    const { p, dir } = P.along(ru[name].pts, 2300);
    SURF["tb" + j] = { name, dir };
    out.push(S.part(j ? "10b" : 10, "TURNBUCKLE MS21251", [bar(add(p, mul(dir, -34)), add(p, mul(dir, 34)), 10.5)], { mat: "brass", angle: 45, anchor: j ? null : anchorAt(add(p, [0, 0, 10])) }));
  }
  // 17 elevator bellcrank, 19 elevator, on the hinge
  const eh = [TPL.hinge, 0, TPL.wl];
  SURF.eh = s3(eh);
  out.push(S.part(17, "ELEVATOR BELLCRANK", [plate([[eh[0] - 9, eh[2] - M.ELEV_ARM - 8], [eh[0] + 9, eh[2] - M.ELEV_ARM - 8], [eh[0] + 9, eh[2] + M.ELEV_ARM + 8], [eh[0] - 9, eh[2] + M.ELEV_ARM + 8]], -70, -30)], { mat: "alu", angle: 135, pivot: SURF.eh, explode: [0, 250, 0], anchor: anchorAt([eh[0], -50, eh[2] + 60]) }));
  const st = P.stopBolts();
  out.push(S.part(18, "STOP BOLT AN3", st.map(([a, b]) => bar(a, b, 4, { own: true })), { hatch: "none", explode: [200, 250, 0], anchor: anchorAt(st[0][0]) }));
  const ELEV = D.ELEV_LOOP.map(([u, v]) => [-(TPL.hinge + u), TPL.wl + v]);
  const TEstrip = D.TE_STRIP.map(([u, v]) => [-(TPL.hinge + u), TPL.wl + v]);
  out.push(S.part(19, "ELEVATOR", [
    S.extrude(ELEV, { along: "z", from: -TPL.span / 2, to: TPL.span / 2 }),
    S.extrude(TEstrip, { along: "z", from: -TPL.span / 2, to: M.TAB.bl[0] - 2, own: true }),
    S.extrude(TEstrip, { along: "z", from: M.TAB.bl[1] + 2, to: TPL.span / 2, own: true }),
  ], { mat: "alu", angle: 45, pivot: SURF.eh, explode: [-400, 0, 0], anchor: anchorAt([TPL.hinge + 150, -1100, TPL.wl + 18]) }));
  // 29 tab, 27 actuator, 28 trim rod: in the elevator's frame (posed by the page)
  const tabH = [M.TAB.fs, 0, TPL.wl];
  SURF.tab = s3(tabH);
  out.push(S.part(29, "TRIM TAB", [S.extrude(D.TAB_LOOP.map(([u, v]) => [-(TPL.hinge + u), TPL.wl + v]), { along: "z", from: M.TAB.bl[0], to: M.TAB.bl[1] })], { mat: "alu", angle: 135, pivot: SURF.tab, explode: [-600, 0, 0], anchor: anchorAt([M.TAB.fs + 30, -485, TPL.wl + 3]) }));
  const a0 = [TPL.hinge + M.ACT.u, M.ACT.bl, TPL.wl + M.ACT.v];
  out.push(S.part(27, "TRIM ACTUATOR, JACKSCREW", [
    // the drum and the housing as one body of revolution on the screw's axis
    S.lathe([[0, -(a0[0] - 10)], [M.ACT_DRUM_R, -(a0[0] - 10)], [M.ACT_DRUM_R, -(a0[0] + 10)], [9, -(a0[0] + 10)], [9, -(a0[0] + M.ACT.len)], [0, -(a0[0] + M.ACT.len)]], { axis: "x", at: [a0[2], a0[1]] }),
  ], { mat: "steel", angle: 45, pivot: SURF.eh, explode: [-250, 200, 0], anchor: anchorAt([a0[0] + 60, a0[1], a0[2] + 9]) }));
  const nut0 = [TPL.hinge + M.ACT.u + M.ACT.len, M.ACT.bl, TPL.wl + M.ACT.v];
  const horn0 = [M.TAB.fs, M.ACT.bl, TPL.wl - M.TAB_HORN];
  SURF.trimRod = { a: nut0, b: horn0 };
  out.push(S.part(28, "TRIM PUSH-PULL ROD", [bar(nut0, horn0, 3)], { hatch: "none", pivot: s3(nut0), explode: [-500, 200, 0], anchor: anchorAt(add(mul(add(nut0, horn0), 0.5), [0, 0, 3])) }));
  // 20 pedals: the cross tube, four pedals on it, the two cable arms (each turning about the tube)
  const pt = [M.PED.fs, 0, M.PED.wl];
  SURF.ped = s3(pt);
  const pedal = (bl, name) => plate([[M.PED.fs - 10, M.PED.wl], [M.PED.fs + 10, M.PED.wl], [M.PED.fs + 10, M.PED.wl + M.PED_PAD - 30], [M.PED.fs - 25, M.PED.wl + M.PED_PAD + 30], [M.PED.fs - 45, M.PED.wl + M.PED_PAD + 20], [M.PED.fs - 10, M.PED.wl + M.PED_PAD - 40]], bl - 40, bl + 40, { pivot: SURF.ped, live: name, own: true });
  const arm = (s, name) => plate([[M.PED.fs - 8, M.PED.wl], [M.PED.fs + 8, M.PED.wl], [M.PED.fs + 8, M.PED.wl + M.PED_ARM + 8], [M.PED.fs - 8, M.PED.wl + M.PED_ARM + 8]], s * M.PED.bl - 5, s * M.PED.bl + 5, { pivot: SURF.ped, live: name, own: true });
  out.push(S.part(20, "RUDDER PEDALS", [
    S.cylinder({ axis: "z", at: [-pt[0], pt[2]], r: 12, from: -470, to: 470, own: true }),
    pedal(-450, "pLL"), pedal(-290, "pLR"), pedal(290, "pRL"), pedal(450, "pRR"), arm(-1, "aL"), arm(1, "aR"),
  ], { mat: "steel", angle: 30, explode: [-300, 150, 0], anchor: anchorAt([M.PED.fs - 20, -450, M.PED.wl + M.PED_PAD]) }));
  // 24 steering bungees
  out.push(S.part(24, "STEERING BUNGEE", [-1, 1].map((s) => {
    const [a, b] = P.bungeeEnds(s, { s: 0 });
    return bar(a, b, 10, { own: true });
  }), { mat: "steel", angle: 45, explode: [200, -150, 0], anchor: anchorAt(add(mul(add(...P.bungeeEnds(-1, { s: 0 })), 0.5), [0, 0, 10])) }));
  // 22 rudder horn and 23 rudder, on the rudder hinge (vertical)
  const rh = [A.RUDDER_HINGE_FS, 0, M.RUD_HORN.wl];
  SURF.rh = s3(rh);
  out.push(S.part(22, "RUDDER HORN", [S.extrude([[-(rh[0] - 12), -M.RUD_ARM - 8], [-(rh[0] + 12), -M.RUD_ARM - 8], [-(rh[0] + 12), M.RUD_ARM + 8], [-(rh[0] - 12), M.RUD_ARM + 8]], { along: "y", from: rh[2] - 6, to: rh[2] + 6 })], { mat: "steel", angle: 135, pivot: SURF.rh, explode: [0, -200, 0], anchor: anchorAt([rh[0], -90, rh[2] + 6]) }));
  const F = P.FIN;
  const rsec = [];
  for (let i = 0; i <= 8; i++) {
    const x = i / 8;
    rsec.push([x, 32 * (1 - x) + 2]);
  }
  const rc0 = F.rudTe0 - A.RUDDER_HINGE_FS;
  const rudder = [...rsec.map(([x, t]) => [-(A.RUDDER_HINGE_FS + 4 + x * rc0), t]), ...rsec.slice().reverse().map(([x, t]) => [-(A.RUDDER_HINGE_FS + 4 + x * rc0), -t])];
  out.push(S.part(23, "RUDDER", [S.extrude(rudder, {
    along: "y", from: F.root + 10, to: F.rudTop, steps: 4,
    warp: ([x, y, z]) => {
      const h = (y - F.root) / (F.rudTop - F.root);
      const k = (F.rudTe0 + (F.rudTe1 - F.rudTe0) * h - A.RUDDER_HINGE_FS) / rc0;
      return [-(A.RUDDER_HINGE_FS + (-x - A.RUDDER_HINGE_FS) * k), y, z];
    },
  })], { mat: "alu", angle: 45, pivot: SURF.rh, explode: [-400, 0, 0], anchor: anchorAt([A.RUDDER_HINGE_FS + 150, 0, 2100]) }));
  // 25 trim wheel with its drum, turning about BL
  const tw = [M.TRIM.fs, 0, M.TRIM.wl];
  SURF.tw = s3(tw);
  out.push(S.part(25, "TRIM WHEEL AND DRUM", [S.lathe([[6, 12], [M.TRIM_WHEEL_D / 2, 12], [M.TRIM_WHEEL_D / 2, -12], [14, -12], [14, M.TRIM.drumBl + 14], [M.TRIM_DRUM_R, M.TRIM.drumBl + 14], [M.TRIM_DRUM_R, M.TRIM.drumBl - 14], [6, M.TRIM.drumBl - 14]], { axis: "z", at: [-tw[0], tw[2]], segments: 48, pivot: SURF.tw, live: "wheel" })], { mat: "plastic", angle: 45, explode: [0, 200, 0], anchor: anchorAt([tw[0], 12, tw[2] + 80]) }));
  return out;
}

// ---------------------------------------------------------------- scale to scene units (as the aircraft)
const sc = (v) => v * UNIT;
const sp = (p) => p.map(sc);
const sl = (loop) => loop.map(sp);
function scaleSolid(s) {
  const o = { ...s };
  if (o.kind === "lathe") Object.assign(o, { loop: sl(o.loop), at: sp(o.at) });
  if (o.kind === "extrude") Object.assign(o, { shape: sl(o.shape), holes: (o.holes ?? []).map(sl), from: sc(o.from), to: sc(o.to), bevel: sc(o.bevel ?? 0), conform: o.conform ? { x: sc(o.conform.x), r: sc(o.conform.r) } : null });
  if (o.kind === "box") Object.assign(o, { min: sp(o.min), max: sp(o.max) });
  if (o.kind === "gear") Object.assign(o, { module: sc(o.module), at: sp(o.at), from: sc(o.from), to: sc(o.to), bore: sc(o.bore ?? 0) });
  if (o.pivot) o.pivot = sp(o.pivot);
  if (Array.isArray(o.explode)) o.explode = sp(o.explode.map((v) => v * EXPLODE));
  // the warps here take and give [x, y, z] in mm; the kit's takes (x, y, z) and gives [x, y, z] in scene units
  if (s.warp) o.warp = (x, y, z) => sp(s.warp([x / UNIT, y / UNIT, z / UNIT]));
  return o;
}
function scalePart(p) {
  const a = p.anchor;
  return {
    ...p,
    pivot: p.pivot ? sp(p.pivot) : p.pivot,
    explode: Array.isArray(p.explode) ? sp(p.explode.map((v) => v * EXPLODE)) : p.explode?.to ? { to: sp(p.explode.to) } : p.explode,
    anchor: a ? { ...a, cut: a.cut ? sp(a.cut) : a.cut, out: a.out ? { ...a.out, c: sp(a.out.c), r: sc(a.out.r ?? 0) } : a.out } : a,
    solids: p.solids.map(scaleSolid),
  };
}
export const parts = () => [airframe(), ...partsMM()].map(scalePart);
export const centres = () => [
  [sp(s3([TPL.hinge, -TPL.span / 2 - 100, TPL.wl])), sp(s3([TPL.hinge, TPL.span / 2 + 100, TPL.wl]))],
  [sp(s3([A.RUDDER_HINGE_FS, 0, P.FIN.root - 60])), sp(s3([A.RUDDER_HINGE_FS, 0, A.FIN_TOP + 60]))],
];
export const scene = () => ({ parts: parts(), fluids: [], centres: centres() });
export const sp3 = (p) => sp(s3(p)); // an (FS, BL, WL) point in scene units
