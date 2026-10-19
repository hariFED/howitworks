// The gyro instruments' solids for the 3D view (gyro-instruments-3d.html). Pure data built with
// kit/solid3d.mjs from model.mjs and the sheet's own outlines (parts.mjs).
//
// One cutting plane for the whole system: z = 0, across the aircraft, with z toward the viewer = aft
// (the pilot's side), so FRONT looks forward like the sheet's sections A-A and B-B. The components are
// laid out side by side on that plane, a bench arrangement NTS (the sheet's Diagram 3 gives their
// order and the parent sheet their places): the pump, the regulator and filter, the suction gauge,
// then the attitude, heading and turn instruments with their faces aft (they open when the cut is
// off), and the hoses between them in the plane. NTS simplifications: the heading indicator and the
// turn coordinator are cut on this plane (the sheet cuts them in plan and square to the gimbal); the
// cases are plain tubes; the turn coordinator's springs ride on the gimbal; no hose fittings.
import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const rad = Math.PI / 180;
export const POS = {
  pump: [-345, -40],
  reg: [-232, -40],
  fil: [-232, 78],
  gauge: [-142, 128],
  ai: [-62, 0],
  hi: [42, 0],
  tc: [146, 0],
};
const mv = (pts, c) => pts.map(([x, y]) => [x + c[0], y + c[1]]);
const FACE = { dial: 40, card: 41.2, glass: [45, 46.2], bezel: [44, 50], back: -104 };
export const CANT = M.CANT * rad;

// ---------------------------------------------------------------- dial textures (canvas, theme tokens)
function face(g, size) {
  g.translate(size / 2, size / 2);
  return size / 2 / 40;
}
const pol = (s, r, deg) => [r * s * Math.cos((deg * Math.PI) / 180), -r * s * Math.sin((deg * Math.PI) / 180)];
function text(g, s, txt, x, y, px = 5) {
  g.font = `600 ${px * s}px ui-monospace, Consolas, monospace`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(txt, x * s, y * s);
}
function tick(g, s, a, r0, r1, w) {
  g.lineWidth = w * s;
  g.beginPath();
  g.moveTo(...pol(s, r0, a));
  g.lineTo(...pol(s, r1, a));
  g.stroke();
}
// the horizon card: sky over ground, the pitch ladder and the bank pointer (it turns with the gimbals)
function aiCard(g, size, tk) {
  const s = face(g, size);
  g.fillStyle = tk.muted;
  g.globalAlpha = 0.4;
  g.fillRect(-40 * s, 0, 80 * s, 40 * s);
  g.globalAlpha = 1;
  g.strokeStyle = g.fillStyle = tk.ink;
  g.lineWidth = 1.1 * s;
  g.beginPath();
  g.moveTo(-40 * s, 0);
  g.lineTo(40 * s, 0);
  g.stroke();
  g.lineWidth = 0.45 * s;
  for (const p of [-20, -10, 10, 20]) {
    const w = Math.abs(p) === 10 ? 6 : 9;
    g.beginPath();
    g.moveTo(-w * s, -p * 1.1 * s);
    g.lineTo(w * s, -p * 1.1 * s);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(0, -27 * s);
  g.lineTo(-2.4 * s, -22.5 * s);
  g.lineTo(2.4 * s, -22.5 * s);
  g.closePath();
  g.fill();
  g.lineWidth = 0.8 * s;
  g.beginPath();
  g.arc(0, 0, 36 * s, 0, 2 * Math.PI);
  g.stroke();
}
function hiCard(g, size, tk) {
  const s = face(g, size);
  g.strokeStyle = g.fillStyle = tk.ink;
  for (let h = 0; h < 360; h += 5) tick(g, s, 90 - h, h % 10 ? 33 : 31, 36, h % 30 ? 0.35 : 0.8);
  for (let h = 0; h < 360; h += 30) {
    const lab = { 0: "N", 90: "E", 180: "S", 270: "W" }[h] ?? String(h / 10);
    const [x, y] = pol(1, 26, 90 - h);
    g.save();
    g.translate(x * s, y * s);
    g.rotate((h * Math.PI) / 180);
    text(g, s, lab, 0, 0, 5);
    g.restore();
  }
  g.lineWidth = 0.8 * s;
  g.beginPath();
  g.arc(0, 0, 37.5 * s, 0, 2 * Math.PI);
  g.stroke();
}
function tcDial(g, size, tk) {
  const s = face(g, size);
  g.strokeStyle = g.fillStyle = tk.ink;
  for (const a of [0, 180, -M.TC_MARK, 180 + M.TC_MARK]) tick(g, s, a, 31, 36, 1);
  text(g, s, "L", ...pol(1, 26, 180 + M.TC_MARK + 12), 5);
  text(g, s, "R", ...pol(1, 26, -M.TC_MARK - 12), 5);
  text(g, s, "2 MIN", 0, -22, 4);
  g.lineWidth = 0.8 * s;
  g.beginPath();
  g.arc(0, 0, 37.5 * s, 0, 2 * Math.PI);
  g.stroke();
}
const SUC_A = (x) => 225 - Math.max(0, Math.min(10.5, x)) * 27;
function sucDial(g, size, tk) {
  const s = face(g, size) * (40 / 27);
  g.strokeStyle = g.fillStyle = tk.ink;
  for (let x = 0; x <= 10; x++) tick(g, s, SUC_A(x), 20, x % 2 ? 22 : 23.5, 0.5);
  for (const x of [0, 2, 4, 6, 8, 10]) text(g, s, String(x), ...pol(1, 15, SUC_A(x)), 4.2);
  text(g, s, "INHG", 0, 10, 3.4);
  g.lineWidth = 2 * s;
  g.beginPath();
  g.arc(0, 0, 22.5 * s, -SUC_A(M.GREEN[0]) * rad, -SUC_A(M.GREEN[1]) * rad);
  g.stroke();
}

// ---------------------------------------------------------------- hoses: two walls and the air between, in the plane
function offsetLine(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    const n = Math.hypot(nx, ny) || 1;
    nx /= n;
    ny /= n;
    // at a corner, push out by 1/cos of half the turn so the walls stay parallel
    let k = 1;
    if (i > 0 && i < pts.length - 1) {
      const u = [p[0] - a[0], p[1] - a[1]];
      const v = [b[0] - p[0], b[1] - p[1]];
      const cu = Math.hypot(...u) || 1;
      const cv = Math.hypot(...v) || 1;
      const cos = (u[0] * v[0] + u[1] * v[1]) / (cu * cv);
      k = 1 / Math.sqrt(Math.max(0.2, (1 + cos) / 2));
      const n1 = [-u[1] / cu, u[0] / cu];
      const n2 = [-v[1] / cv, v[0] / cv];
      nx = (n1[0] + n2[0]) / 2;
      ny = (n1[1] + n2[1]) / 2;
      const m = Math.hypot(nx, ny) || 1;
      nx /= m;
      ny /= m;
    }
    return [p[0] + nx * d * k, p[1] + ny * d * k];
  });
}
const band = (pts, d0, d1) => [...offsetLine(pts, d0), ...offsetLine(pts, d1).reverse()];
export const HOSE = { ri: 4.75, ro: 6.4 };
export function hoseRuns() {
  const { pump, reg, fil, gauge, ai, hi } = POS;
  const pc = P.BORE_C[1] + (P.PH.port[0] + P.PH.port[1]) / 2; // the pump's port height
  const rm = (P.RG.port[0] + P.RG.port[1]) / 2;
  return {
    feed: [[fil[0] + 38, fil[1]], [ai[0] - 52, fil[1]], [ai[0] - 52, 26], [ai[0] - 40, 26]],
    feed2: [[ai[0] - 52, fil[1]], [hi[0], fil[1]], [hi[0], 40]],
    out: [[hi[0], -40], [hi[0], -62], [reg[0] + 34, -62], [reg[0] + 34, reg[1] + rm], [reg[0] + P.RG.r, reg[1] + rm]],
    out2: [[ai[0], -40], [ai[0], -62]],
    suct: [[reg[0] - P.RG.r, reg[1] + rm], [reg[0] - 34, reg[1] + rm], [reg[0] - 34, pump[1] + pc], [pump[0] + P.PH.boss, pump[1] + pc]],
    exh: [[pump[0] - P.PH.boss, pump[1] + pc], [pump[0] - 72, pump[1] + pc], [pump[0] - 72, -112]],
  };
}

// ---------------------------------------------------------------- the parts
export function parts() {
  const out = [];
  const { pump, reg, fil, gauge, ai, hi, tc } = POS;
  // ---------------- the pump (1–5): its axis fore and aft, cut across the rotor like B-B
  const ph = P.pumpHousing(null);
  const pz = [-24, 24];
  out.push(S.part(1, "PUMP HOUSING", [
    S.extrude(mv(ph.out, pump), { along: "z", from: pz[0], to: pz[1], holes: ph.holes.slice(0, 3).map((h) => mv(h, pump)) }),
    // end plates: the front one with the drive's bore
    S.extrude(mv(K.circle(P.BORE_C[0], P.BORE_C[1], P.PH.r, 72), pump), { along: "z", from: pz[0] - 6, to: pz[0], holes: [mv(K.circle(0, 0, 8, 32), pump)], own: true }),
  ], { mat: "alu", angle: 60, anchor: { cut: [pump[0] - 36, pump[1] + 32, 0], out: { c: [pump[0] - 36, pump[1] + 32, 0], r: 30, axis: "z" } } }));
  out.push(S.part(2, "LINER", [
    S.extrude(mv(P.linerSeg(P.WIN.in[1], P.WIN.out[0]), pump), { along: "z", from: pz[0], to: pz[1] }),
    S.extrude(mv(P.linerSeg(P.WIN.out[1], 360 + P.WIN.in[0]), pump), { along: "z", from: pz[0], to: pz[1], own: false }),
  ], { mat: "steel", angle: 135, explode: [0, 0, 50], anchor: { cut: [pump[0], pump[1] + P.BORE_C[1] + 29, 0], out: { c: [pump[0], pump[1] + P.BORE_C[1] + 29, 24], r: 0 } } }));
  const R = M.PUMP;
  out.push(S.part(3, "ROTOR", [
    S.extrude(mv(P.rotorOutline(), pump), { along: "z", from: -R.L / 2 - 0.05 + 4, to: R.L / 2 - 4, holes: [mv(P.spline(P.SPLINE.r0 + 0.05, P.SPLINE.r1 + 0.05), pump)], pivot: [pump[0], pump[1], 0], live: "rotor" }),
  ], { mat: "iron", angle: 45, explode: [0, 0, 100], anchor: { cut: [pump[0] + 12, pump[1] - 12, 0], out: { c: [pump[0], pump[1], 16], r: 0 } } }));
  out.push(S.part(4, "VANE", Array.from({ length: R.z }, (_, k) => S.extrude(mv(P.vanePts(k * 60), pump), { along: "z", from: -R.L / 2 + 4.05, to: R.L / 2 - 4.05, live: `v${k}`, own: true })), {
    mat: "iron", angle: 135, explode: [0, 0, 150], anchor: { cut: [pump[0] - 18, pump[1] + 12, 0], out: { c: [pump[0] - 18, pump[1] + 12, 16], r: 0 } },
  }));
  out.push(S.part(5, "DRIVE SHAFT AND COUPLING", [
    S.extrude(mv(P.spline(P.SPLINE.r0, P.SPLINE.r1), pump), { along: "z", from: -40, to: R.L / 2 - 4, pivot: [pump[0], pump[1], 0], live: "shaft" }),
  ], { hatch: "none", explode: [0, 0, -80], layer: 1, anchor: { cut: [pump[0], pump[1] + 3, 0], out: { c: [pump[0], pump[1], -46], r: 9, axis: "z" } } }));
  // ---------------- the regulator (6–8), axis vertical
  const rv = (loop) => S.lathe(loop.map(([r, s]) => [r, reg[1] + s]), { axis: "y", at: [reg[0], 0] });
  const RG = P.RG;
  out.push(S.part(6, "REGULATOR BODY, CAP, SCREEN", [
    rv([[3.05, RG.bot], [RG.r, RG.bot], [RG.r, RG.top], [RG.seat, RG.top], [RG.seat, RG.ch[1]], [RG.chR, RG.ch[1]], [RG.chR, RG.ch[0]], [3.05, RG.ch[0]]]),
    S.bore(S.cylinder({ axis: "x", at: [reg[1] + (RG.port[0] + RG.port[1]) / 2, 0], r: 2.4, from: reg[0] - RG.r - 0.1, to: reg[0] + RG.r + 0.1 })),
    { ...rv([[RG.r - 1.5, RG.top + 5], [RG.r, RG.top + 5], [RG.r, RG.cap], [0, RG.cap], [0, RG.cap - 1.5], [RG.r - 1.5, RG.cap - 1.5]]), own: true, explode: [0, 30, 0] },
    { ...rv([[4.2, RG.top + 0.4], [RG.r - 1.6, RG.top + 0.4], [RG.r - 1.6, RG.cap - 1.6], [4.2, RG.cap - 1.6]]), own: true, hatch: ["foam", 45], explode: [0, 22, 0] },
  ], { mat: "alu", angle: 45, anchor: { cut: [reg[0] + 10, reg[1] + 0, 0], out: { c: [reg[0], reg[1], 0], r: RG.r, axis: "y" } } }));
  out.push(S.part(7, "REGULATOR POPPET", [
    { ...rv([[0, -2 - 9], [1.4, -2 - 9], [1.4, -3.6], [6, -3.6], [6, -2.02], [0, -2.02]]), live: "pop" },
  ], { mat: "brass", angle: 135, explode: [0, -12, 0], anchor: { cut: [reg[0] - 4.5, reg[1] - 2.8, 0], out: { c: [reg[0], reg[1] - 2.8, 0], r: 6, axis: "y" } } }));
  out.push(S.part(8, "REGULATOR SPRING", [
    S.helix({ axis: "y", at: [reg[0], 0], from: reg[1] - 15, to: reg[1] - 3.62, radius: 3.6, wire: 0.7, turns: 5, pivot: [reg[0], reg[1] - 15, 0], live: "spring" }),
  ], { hatch: "solid", explode: [0, -20, 0], anchor: { cut: [reg[0] + 3.6, reg[1] - 10, 0], out: { c: [reg[0], reg[1] - 10, 0], r: 4, axis: "y" } } }));
  // ---------------- the filter (9)
  const fv = (loop, o = {}) => S.lathe(loop.map(([r, s]) => [r, fil[1] + s]), { axis: "y", at: [fil[0], 0], ...o });
  const F = P.FL;
  out.push(S.part(9, "CENTRAL AIR FILTER", [
    fv([[F.out, -F.h - 10], [F.out + 2, -F.h - 10], [F.out + 2, -F.h], [F.r, -F.h], [F.r, F.h - 6], [F.r - 1.6, F.h - 6], [F.r - 1.6, -F.h + 1.6], [F.out, -F.h + 1.6]]),
    { ...fv([[F.el[0], -F.h + 1.6 + F.cap], [F.el[1], -F.h + 1.6 + F.cap], [F.el[1], F.h - 1.6 - F.cap], [F.el[0], F.h - 1.6 - F.cap]]), own: true, hatch: ["wood", 135], explode: [0, 50, 0] },
    { ...fv([[F.el[0] - 1, -F.h + 1.6], [F.el[1] + 1, -F.h + 1.6], [F.el[1] + 1, -F.h + 1.6 + F.cap], [F.el[0] - 1, -F.h + 1.6 + F.cap]]), own: true, hatch: ["rubber", 45], explode: [0, 50, 0] },
    { ...fv([[F.el[0] - 1, F.h - 1.6 - F.cap], [F.el[1] + 1, F.h - 1.6 - F.cap], [F.el[1] + 1, F.h - 1.6], [F.el[0] - 1, F.h - 1.6]]), own: true, hatch: ["rubber", 45], explode: [0, 50, 0] },
  ], { mat: "plastic", angle: 45, anchor: { cut: [fil[0] + 24, fil[1] + 6, 0], out: { c: [fil[0], fil[1], 0], r: F.r, axis: "y" } } }));
  // ---------------- the hoses (10): two walls each, in the plane
  const H = HOSE;
  const walls = [];
  for (const pts of Object.values(hoseRuns())) {
    const L = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    const trim = (q, d) => { const a = q[0]; const b = q[1]; const k = d / L(a, b); const z = q[q.length - 1]; const y = q[q.length - 2]; const k2 = d / L(y, z); return [[a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], ...q.slice(1, -1), [z[0] + (y[0] - z[0]) * k2, z[1] + (y[1] - z[1]) * k2]]; };
    walls.push(S.extrude(band(pts, -H.ro, H.ro), { along: "z", from: -H.ro, to: H.ro, holes: [band(trim(pts, 0.6), -H.ri, H.ri)], own: walls.length > 0 }));
  }
  out.push(S.part(10, "LINES", walls, { mat: "rubber", angle: 45, anchor: { cut: [hi[0] - 40, fil[1] + H.ri + 0.8, 0], out: { c: [hi[0] - 40, fil[1] + H.ro, 0], r: 0 } } }));
  // ---------------- the suction gauge (11)
  out.push(S.part(11, "SUCTION GAUGE", [
    S.tube({ axis: "z", at: [gauge[0], gauge[1]], r0: 27, r1: 29, from: -40, to: 26 }),
    S.disc([gauge[0], gauge[1], 20], 26.9, { normal: "z", role: "decal", texture: sucDial, own: true }),
    S.extrude([[gauge[0] - 0.9, gauge[1]], [gauge[0], gauge[1] + 21], [gauge[0] + 0.9, gauge[1]]], { along: "z", from: 20.2, to: 21, role: "ink", pivot: [gauge[0], gauge[1], 20.6], live: "needle", own: true }),
  ], { mat: "alu", angle: 135, explode: [0, 0, 60], anchor: { cut: [gauge[0] - 28, gauge[1] + 6, 0], out: { c: [gauge[0], gauge[1], 21], r: 0 } } }));
  // ---------------- the three cases (12)
  const caseOf = (c) => [
    S.tube({ axis: "z", at: [c[0], c[1]], r0: P.CASE.r0, r1: P.CASE.r1, from: FACE.back, to: FACE.bezel[0], segments: 72 }),
    { ...S.extrude(mv(K.rrect(-41.25, -41.25, 41.25, 41.25, 5), c), { along: "z", from: FACE.bezel[0], to: FACE.bezel[1], holes: [mv(K.circle(0, 0, 37, 72), c)] }), own: true, explode: [0, 0, 70] },
  ];
  out.push(S.part(12, "INSTRUMENT CASE", [...caseOf(ai), ...caseOf(hi), ...caseOf(tc)], {
    mat: "alu", angle: 135, explode: [0, 0, -110], anchor: { cut: [ai[0] - 39, ai[1] + 18, 0], out: { c: [ai[0], ai[1], 0], r: 40, axis: "z" } },
  }));
  // ---------------- the attitude indicator (13–17): turns as one about the roll axis (z) through its centre
  const AP = [ai[0], ai[1], 0];
  const yv = (loop, o = {}) => S.lathe(loop.map(([r, s]) => [r, ai[1] + s]), { axis: "y", at: [ai[0], 0], ...o });
  out.push(S.part(13, "AI ROTOR", [{ ...yv(M.AI_ROTOR), pivot: AP, live: "rotor" }], { mat: "brass", angle: 45, pivot: AP, explode: [0, 70, 0], anchor: { cut: [ai[0] + 19, ai[1] + 6, 0], out: { c: [ai[0], ai[1] + 10, 0], r: 22, axis: "y" } } }));
  const VU = P.VU;
  out.push(S.part(14, "AI ROTOR HOUSING", [
    yv([[2.05, P.AIH.cav], [2.05, P.AIH.boss], [5, P.AIH.boss], [5, P.AIH.top], [P.AIH.rout, P.AIH.top], [P.AIH.rout, -P.AIH.top], [9.5, -P.AIH.top], [9.5, -P.AIH.cav], [P.AIH.rin, -P.AIH.cav], [P.AIH.rin, P.AIH.cav]]),
    { ...yv([[2.05, -P.AIH.cav], [7, -P.AIH.cav], [7, -P.AIH.top], [5, -P.AIH.top], [5, -P.AIH.boss], [2.05, -P.AIH.boss]]), own: false },
    { ...S.cylinder({ axis: "x", at: [ai[1], 0], r: P.AIH.pin, from: ai[0] - P.AIH.pinOut, to: ai[0] - P.AIH.rout + 0.3, segments: 16 }), hatch: "none", own: true },
    { ...S.cylinder({ axis: "x", at: [ai[1], 0], r: P.AIH.pin, from: ai[0] + P.AIH.rout - 0.3, to: ai[0] + P.AIH.pinOut, segments: 16 }), hatch: "none", own: true },
    // the vane unit: a box with its chamber, under the housing
    S.extrude(mv(K.rect(-VU.half, VU.bot, VU.half, VU.top), ai), { along: "z", from: -VU.half, to: VU.half, holes: [mv(K.rect(-VU.half + VU.wall, VU.bot + VU.floor, VU.half - VU.wall, VU.top - 0.01), ai)], own: true, hatch: ["alu", 135] }),
  ], { mat: "alu", angle: 45, pivot: AP, explode: [0, 0, 0], anchor: { cut: [ai[0] - 24.25, ai[1] - 6, 0], out: { c: [ai[0], ai[1], 0], r: 25, axis: "y" } } }));
  const G = P.AIG;
  out.push(S.part(15, "AI OUTER GIMBAL", [
    S.box([ai[0] + G.u0, ai[1] - G.h, -30], [ai[0] + G.u1, ai[1] + G.h, 30]),
    { ...S.box([ai[0] - G.u1, ai[1] - G.h, -30], [ai[0] - G.u0, ai[1] + G.h, 30]), own: false },
    { ...S.box([ai[0] - G.u0, ai[1] - 4, -30], [ai[0] + G.u0, ai[1] + 4, -27]), own: false },
    { ...S.box([ai[0] - G.u0, ai[1] - 4, 27], [ai[0] + G.u0, ai[1] + 4, 30]), own: false },
  ], { mat: "alu", angle: 30, pivot: AP, explode: [0, -60, 0], anchor: { cut: [ai[0] + 30.9, ai[1] - 10, 0], out: { c: [ai[0] + 30.9, ai[1] - 10, 30], r: 0 } } }));
  out.push(S.part(16, "PENDULOUS VANES", [
    ...[-1, 1].map((sg) => S.box([ai[0] + sg * (VU.half + 0.45) - 0.3, ai[1] + VU.top - 9.5, -4], [ai[0] + sg * (VU.half + 0.45) + 0.3, ai[1] + VU.top - 0.6, 4])),
    { ...S.box([ai[0] - 4, ai[1] + VU.top - 8, VU.half + 0.15], [ai[0], ai[1] + VU.top - 0.4, VU.half + 0.75]), own: true, live: "aft", pivot: [ai[0] - 2, ai[1] + P.VANE_PIVOT[1], 0] },
  ], { mat: "alu", angle: 60, pivot: AP, explode: [0, -40, 0], anchor: { cut: [ai[0] - VU.half - 0.45, ai[1] - 18.5, 0], out: { c: [ai[0] - VU.half - 0.45, ai[1] - 18.5, 0], r: 0 } } }));
  out.push(S.part(17, "HORIZON CARD", [
    { ...S.disc([ai[0], ai[1], FACE.card], 36.8, { normal: "z", role: "decal", texture: aiCard }), pivot: [ai[0], ai[1], FACE.card], live: "card" },
    { ...S.extrude(mv([[-18, -0.6], [-5, -0.6], [-3, -2.6], [3, -2.6], [5, -0.6], [18, -0.6], [18, 0.6], [4.4, 0.6], [2.2, -1.4], [-2.2, -1.4], [-4.4, 0.6], [-18, 0.6]], ai), { along: "z", from: FACE.card + 1.2, to: FACE.card + 2.2 }), role: "ink", own: true },
  ], { mat: "plastic", angle: 45, explode: [0, 0, 70], anchor: { cut: [ai[0] + 20, ai[1] - 10, FACE.card], out: { c: [ai[0] + 20, ai[1] - 10, FACE.card], r: 0 } } }));
  // ---------------- the heading indicator (18–22): the gyro turns about the vertical through its centre
  const HP = [hi[0], hi[1], 0];
  const xv = (loop, o = {}) => S.lathe(loop.map(([r, s]) => [r, hi[0] + s]), { axis: "x", at: [hi[1], 0], ...o });
  out.push(S.part(18, "HI ROTOR", [{ ...xv(M.HI_ROTOR), pivot: HP, live: "rotor" }], { mat: "brass", angle: 135, pivot: HP, explode: [0, 70, 0], anchor: { cut: [hi[0] + 5, hi[1] + 18, 0], out: { c: [hi[0], hi[1], 0], r: 21, axis: "x" } } }));
  const HH = P.HIH;
  out.push(S.part(19, "HI ROTOR HOUSING", [
    xv([[2.05, HH.len - 1.5], [2.05, HH.len + 4], [5, HH.len + 4], [5, HH.len], [HH.rout, HH.len], [HH.rout, -HH.len], [5, -HH.len], [5, -HH.len - 4], [2.05, -HH.len - 4], [2.05, -HH.len + 1.5], [HH.rin, -HH.len + 1.5], [HH.rin, HH.len - 1.5]]),
  ], { mat: "alu", angle: 45, pivot: HP, explode: [0, 0, 0], anchor: { cut: [hi[0] - 6, hi[1] + 23.25, 0], out: { c: [hi[0], hi[1], 0], r: 24, axis: "x" } } }));
  const ringShape = [...K.arc(0, 0, P.HIG.b1, -150, 150, 50), ...K.arc(0, 0, P.HIG.b0, 150, -150, 50)].map(([b, y]) => [b, hi[1] + y]);
  out.push(S.part(20, "HI VERTICAL GIMBAL", [
    S.extrude(ringShape.map(([z, y]) => [z, y]), { along: "x", from: hi[0] - P.HIG.t, to: hi[0] + P.HIG.t }),
    { ...S.tube({ axis: "y", at: [hi[0], 0], r0: P.CROWN.r0, r1: P.CROWN.r1, from: hi[1] - 37, to: hi[1] - 34, segments: 72 }), own: true, hatch: ["brass", 45] },
  ], { mat: "alu", angle: 30, pivot: HP, explode: [0, -70, 0], anchor: { cut: [hi[0] + 30, hi[1] - 8, 0], out: { c: [hi[0], hi[1] - 35.5, 0], r: P.CROWN.r1, axis: "y" } } }));
  out.push(S.part(21, "COMPASS CARD", [
    { ...S.disc([hi[0], hi[1], FACE.card], 36.8, { normal: "z", role: "decal", texture: hiCard }), pivot: [hi[0], hi[1], FACE.card], live: "card" },
    { ...S.extrude(mv([[-0.6, -7], [0.6, -7], [0.6, -0.6], [9, -0.6], [9, 0.6], [0.6, 0.6], [0.6, 8], [-0.6, 8], [-0.6, 0.6], [-9, 0.6], [-9, -0.6], [-0.6, -0.6]], hi), { along: "z", from: FACE.card + 1.2, to: FACE.card + 2.2 }), role: "ink", own: true },
  ], { mat: "alu", angle: 45, explode: [0, 0, 70], anchor: { cut: [hi[0] + 20, hi[1] + 14, FACE.card], out: { c: [hi[0] + 20, hi[1] + 14, FACE.card], r: 0 } } }));
  out.push(S.part(22, "HEADING SET KNOB", [
    S.cylinder({ axis: "z", at: [hi[0] - 35.2, hi[1] - 35.2], r: 5.8, from: FACE.bezel[1], to: FACE.bezel[1] + 9, segments: 32 }),
  ], { hatch: "none", explode: [0, 0, 120], anchor: { cut: [hi[0] - 35.2, hi[1] - 35.2, 10], out: { c: [hi[0] - 35.2, hi[1] - 35.2, FACE.bezel[1] + 9], r: 0 } } }));
  // ---------------- the turn coordinator (23–28): the gimbal group is built with its axis along z and
  // canted 30° nose-up (and deflected) by live3d.js
  const TP = [tc[0], tc[1], 0];
  const tx = (loop, o = {}) => S.lathe(loop.map(([r, s]) => [r, tc[0] + s]), { axis: "x", at: [tc[1], 0], ...o });
  out.push(S.part(23, "TC GYRO MOTOR", [
    { ...tx(M.TC_ROTOR), pivot: TP, live: "rotor" },
    { ...tx([[2.05, -2.5], [13.6, -2.5], [13.6, 6.5], [2.05, 6.5]]), hatch: ["iron", 135], own: true },
  ], { mat: "steel", angle: 45, pivot: TP, explode: [0, 60, 0], anchor: { cut: [tc[0] + 2, tc[1] + 15.75, 0], out: { c: [tc[0], tc[1], 0], r: 17, axis: "x" } } }));
  const TG = P.TCG;
  const TD = P.TC_DAMP;
  out.push(S.part(24, "TC GIMBAL", [
    S.box([tc[0] + TG.arm[0], tc[1] + TG.bot, -8], [tc[0] + TG.arm[1], tc[1] + TG.top, 8]),
    { ...S.box([tc[0] + TG.armL[0] - 2.2, tc[1] + TG.bot, -8], [tc[0] + TG.armL[0], tc[1] + TG.top, 8]), own: false },
    { ...S.cylinder({ axis: "x", at: [tc[1], 0], r: TG.spindle - 0.05, from: tc[0] + TG.armL[0] - 2.2, to: tc[0] + TG.arm[0], segments: 16 }), hatch: "none", own: true },
    { ...S.box([tc[0] - 1.2, tc[1] + TG.top, -1.2], [tc[0] + 1.2, tc[1] + P.TC_SPRING.pin[1], 1.2]), hatch: "none", own: true },
    { ...S.box([tc[0] - 1.2, tc[1] - TD.post + 0.6, -1.2], [tc[0] + 1.2, tc[1] + TG.bot, 1.2]), hatch: "none", own: true },
    { ...S.box([tc[0] - 1.2, tc[1] - TD.r1 + 0.4, -6], [tc[0] + 1.2, tc[1] - TD.post + 0.6, 6]), hatch: ["alu", 135], own: true },
  ], { mat: "alu", angle: 30, pivot: TP, explode: [0, 0, -60], anchor: { cut: [tc[0] + 18.4, tc[1] - 8, 0], out: { c: [tc[0] + 18.4, tc[1] - 8, 8], r: 0 } } }));
  out.push(S.part(25, "CENTRING SPRING", P.TC_SPRING.anchors.map((a) => S.helix({ axis: "x", at: [tc[1] + (a[1] + P.TC_SPRING.pin[1]) / 2, 0], from: tc[0] + Math.min(0, a[0]) + (a[0] < 0 ? 2 : 1.6), to: tc[0] + Math.max(0, a[0]) - (a[0] < 0 ? 1.6 : 2), radius: 2.2, wire: 0.7, turns: 7 })), {
    hatch: "solid", pivot: TP, explode: [0, 40, 0], anchor: { cut: [tc[0] - 11, tc[1] + 23.75 + 2.2, 0], out: { c: [tc[0] - 11, tc[1] + 23.75, 0], r: 2.6, axis: "x" } },
  }));
  const sector = [...K.arc(0, 0, TD.r1 + TD.wall, -90 - TD.a - 3, -90 + TD.a + 3, 30), ...K.arc(0, 0, TD.r1, -90 + TD.a + 3, -90 - TD.a - 3, 30)];
  out.push(S.part(26, "DAMPER", [
    S.extrude(mv(sector, tc), { along: "z", from: -7, to: 7 }),
  ], { mat: "brass", angle: 45, pivot: TP, explode: [0, -50, 0], anchor: { cut: [tc[0] + 20, tc[1] - 27.5, 0], out: { c: [tc[0] + 20, tc[1] - 27.5, 7], r: 0 } } }));
  out.push(S.part(27, "MINIATURE AIRCRAFT", [
    { ...S.extrude(mv([[-24, -0.9], [24, -0.9], [24, 0.9], [2.6, 0.9], [1.2, 7], [-1.2, 7], [-2.6, 0.9], [-24, 0.9]], tc), { along: "z", from: FACE.dial + 1.4, to: FACE.dial + 2.4 }), role: "ink", pivot: [tc[0], tc[1], 0], live: "plane" },
    { ...S.disc([tc[0], tc[1], FACE.dial], 37, { normal: "z", role: "decal", texture: tcDial }), own: true },
  ], { mat: "alu", angle: 45, explode: [0, 0, 80], anchor: { cut: [tc[0] - 16, tc[1], FACE.dial + 2.4], out: { c: [tc[0] - 16, tc[1], FACE.dial + 2.4], r: 0 } } }));
  // the inclinometer: an arc of glass tube (a torus) on the face's lower half, its ball riding the arc
  const TUBE_C = [tc[0], tc[1] - 27 + M.TUBE_R, FACE.dial + 3.4];
  out.push(S.part(28, "INCLINOMETER", [
    { ...S.torus(TUBE_C, M.TUBE_R, 3.7, { axis: "z", arc: [270 - 19, 270 + 19] }), role: "glass" },
    { ...S.sphere([tc[0], tc[1] - 27, FACE.dial + 3.4], 3.2), hatch: "none", pivot: TUBE_C, live: "ball", own: true },
  ], { mat: "plastic", angle: 45, explode: [0, -20, 90], anchor: { cut: [tc[0] + 9, tc[1] - 26.2, FACE.dial + 3.4], out: { c: [tc[0] + 9, tc[1] - 26.2, FACE.dial + 3.4], r: 3.7, axis: "sphere" } } }));
  return out;
}

// ---------------------------------------------------------------- the air: in the pump's chambers, the
// regulator, the filter and the hoses (the gyro cases' air turns with the gimbals, so it is left out)
export function fluids() {
  const { pump, reg, fil } = POS;
  const out = [
    S.fluid("pump", S.extrude(mv(K.circle(P.BORE_C[0], P.BORE_C[1], M.PUMP.Rb - 0.05, 96), pump), { along: "z", from: -M.PUMP.L / 2 + 4.1, to: M.PUMP.L / 2 - 4.1 })),
    S.fluid("reg", S.lathe([[0, reg[1] + P.RG.ch[0] + 0.05], [P.RG.chR - 0.05, reg[1] + P.RG.ch[0] + 0.05], [P.RG.chR - 0.05, reg[1] + P.RG.ch[1] - 0.05], [0, reg[1] + P.RG.ch[1] - 0.05]], { axis: "y", at: [reg[0], 0] })),
    S.fluid("fil", S.lathe([[0, fil[1] - P.FL.h + 1.7], [P.FL.el[0] - 0.05, fil[1] - P.FL.h + 1.7], [P.FL.el[0] - 0.05, fil[1] + P.FL.h - 1.7], [0, fil[1] + P.FL.h - 1.7]], { axis: "y", at: [fil[0], 0] })),
  ];
  for (const [k, pts] of Object.entries(hoseRuns())) out.push(S.fluid(`h-${k}`, S.extrude(band(pts, -HOSE.ri + 0.05, HOSE.ri - 0.05), { along: "z", from: -HOSE.ri, to: HOSE.ri })));
  return out;
}
export const centres = () => [
  [[POS.ai[0], POS.ai[1] - 30, 0], [POS.ai[0], POS.ai[1] + 24, 0]],
  [[POS.pump[0], POS.pump[1] - 30, 0], [POS.pump[0], POS.pump[1] + 56, 0]],
  [[POS.reg[0], POS.reg[1] - 26, 0], [POS.reg[0], POS.reg[1] + 15, 0]],
];
export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
export const SUC_ANGLE = SUC_A;
