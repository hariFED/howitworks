// The gear pump's solids for its 3D view (gear-pump-3d.html), from the 2D sheet's own numbers:
// model.mjs (gear geometry, ports, housing, bolts) and parts.mjs (the involute outlines, the tooth
// spaces, the B-B profiles and stations). Pure data built with kit/solid3d.mjs.
//
// Frame: x = the sheet's u, y = its v (outlet up, inlet down), z = along the shafts. The sheet's
// Section A-A looks from the rear toward the flange, so the viewer sits at the cover end: world
// z = B-B's z − B/2. The cutting plane z = 0 is the gears' mid-plane, the plane of A-A. Behind it
// (−z): front bushings, flange, shaft seal, drive shaft end. In front (removed by the cut): rear
// bushings, cover, screw heads.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const Z = P.Z;
export const ZO = M.B / 2;
export const zw = (z) => z - ZO; // B-B's z → world z
const RW = M.RW;
const BR = M.BORE_R;
const [C1x] = P.C1;
const [C2x] = P.C2;
const H = M.HOUSING;
const BOLTS = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([su, sv]) => [su * M.BOLT.u, sv * M.BOLT.v]);
const RJ = 8; // journals Ø16 (parts.mjs)

// ---------------------------------------------------------------- outlines

// The union of two circles of radius R round the gear centres (the pocket, the O-ring), CCW.
export function fig8(R, n = 40) {
  const phi = Math.acos(RW / R);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = phi + ((2 * Math.PI - 2 * phi) * i) / n;
    out.push([C1x + R * Math.cos(a), R * Math.sin(a)]);
  }
  for (let i = 1; i < n; i++) {
    const a = -Math.PI + phi + ((2 * Math.PI - 2 * phi) * i) / n;
    out.push([C2x + R * Math.cos(a), R * Math.sin(a)]);
  }
  return out;
}

// A D-shaped bushing: its gear's bore circle cut off on the joint u = 0. The face layer carries the
// trapping-relief grooves either side of the mesh (parts.mjs RELIEF) as notches in the flat.
function dShape(s, R, relief = false) {
  const c = s < 0 ? C1x : C2x;
  const phi = Math.acos(RW / R);
  const out = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = s < 0 ? phi + ((2 * Math.PI - 2 * phi) * i) / n : -Math.PI + phi + ((2 * Math.PI - 2 * phi) * i) / n;
    out.push([c + R * Math.cos(a), R * Math.sin(a)]);
  }
  if (relief) {
    const g = P.RELIEF;
    const x = s * g.half;
    // along the flat from the end of the arc: up for the left D, down for the right one
    const steps = [g.inl[0], g.inl[1], g.out[0], g.out[1]];
    const vs = s < 0 ? steps : [...steps].reverse();
    for (let i = 0; i < 4; i += 2) {
      out.push([0, vs[i]], [x, vs[i]], [x, vs[i + 1]], [0, vs[i + 1]]);
    }
  }
  return out;
}

// Where a port's drilling (radius d) meets the bore, and the cusp between the bores it opens.
const vMeet = (d) => Math.sqrt(BR ** 2 - (RW - d) ** 2);
function cusp(d, sign) {
  const vb = vMeet(d);
  const out = [[-d, vb]];
  const a0 = Math.atan2(vb, RW - d);
  const a1 = Math.atan2(P.WAIST, RW);
  for (let i = 1; i <= 8; i++) {
    const a = a0 + ((a1 - a0) * i) / 8;
    out.push([C1x + BR * Math.cos(a), BR * Math.sin(a)]);
  }
  for (let i = 1; i < 8; i++) {
    const a = Math.PI - a1 + ((a1 - a0) * i) / 8;
    out.push([C2x + BR * Math.cos(a), BR * Math.sin(a)]);
  }
  out.push([d, vb]);
  return out.map(([x, y]) => [x, sign * y]);
}
// The tapped port and its drilling as a half-profile [r, v] round the y axis (parts.mjs portWall).
function portLoop(p, sign, inset = 0) {
  const face = H.v;
  const ch = p.major + 0.5;
  const tip = (p.minor - p.drill) / Math.tan((59 * Math.PI) / 180);
  const vb = vMeet(p.drill);
  const loop = [[0, vb], [p.drill - inset, vb], [p.drill - inset, face - p.depth - tip], [p.minor - inset, face - p.depth], [p.minor - inset, face - (ch - p.minor)], [ch - inset, face], [0, face]];
  return loop.map(([r, v]) => [r, sign * v]);
}

const rr = (inset = 0) => S.rrectAt(0, 0, H.u - inset, H.v - inset, H.r - inset, 4);
const boltHoles = (r) => BOLTS.map(([x, y]) => S.circle(x, y, r, 32));
const ax = (c) => ({ axis: "z", at: [c, 0] });
const zl = (loop) => loop.map(([r, z]) => [r, zw(z)]); // [r, B-B z] → [r, world z]

// ---------------------------------------------------------------- the gear-shafts
function shaftLoops(drive) {
  const front = drive
    ? [[0, Z.shaftEnd], [7, Z.shaftEnd], [7.5, Z.shaftEnd + 0.5], [7.5, Z.step], [RJ, Z.step + 0.5]]
    : [[0, Z.front + 0.5], [7.5, Z.front + 0.5], [RJ, Z.front + 1]];
  return [
    zl([...front, [RJ, Z.g0 - 0.6], [RJ + 0.6, Z.g0], [0, Z.g0]]),
    zl([[0, Z.g1], [RJ + 0.6, Z.g1], [RJ, Z.g1 + 0.6], [RJ, Z.rear - 1], [7.5, Z.rear - 0.5], [0, Z.rear - 0.5]]),
  ];
}

// ---------------------------------------------------------------- explode (along the shafts; the body stays)
export const EX = {
  screws: 230, washers: 155, cover: 150, oringR: 125, rear: 105, gears: 70,
  front: -50, oringF: -68, flange: -80,
  seal: [0, 72, -100], clip: [0, 72, -118], // jogged up clear of the flange, as they go in from behind it
};

export function parts() {
  const zb0 = zw(Z.front);
  const zb1 = zw(Z.rear);
  const [f0, f1] = [zw(Z.front), zw(0)]; // front bushings
  const [r0, r1] = [zw(M.B), zw(Z.rear)]; // rear bushings
  const g0 = zw(Z.g0);
  const g1 = zw(Z.g1);
  const out = [];

  // 1 BODY: the block, the figure-8 pocket and bolt holes through it, the two ports as bores
  out.push(
    S.part(1, "BODY, 2-BORE", [
      S.extrude(rr(), { along: "z", from: zb0, to: zb1, holes: [fig8(BR, 48), ...boltHoles(4.5)] }),
      S.bore(S.lathe(portLoop(M.OUTLET, 1), { axis: "y", at: [0, 0] })),
      S.bore(S.lathe(portLoop(M.INLET, -1), { axis: "y", at: [0, 0] })),
      // the drillings break through the ridge between the bores: open it as deep as the drill reaches
      S.bore(S.extrude(cusp(M.OUTLET.drill, 1), { along: "z", from: -M.OUTLET.drill + 0.6, to: M.OUTLET.drill - 0.6 })),
      S.bore(S.extrude(cusp(M.INLET.drill, -1), { along: "z", from: -M.INLET.drill + 0.6, to: M.INLET.drill - 0.6 })),
      S.disc([0, H.v + 0.03, 0], M.OUTLET.major + 0.5, { normal: "y", role: "mouth" }),
    ], { mat: "alu", angle: 45, anchor: { cut: [-50, -12, 0], out: { c: [-50, -12, zb1] } } }),
  );

  // 4, 5 GEAR SHAFTS: the sheet's involute outline (fillets, profile shift, tip cut) extruded, and journals
  for (const [id, name, c, rot, ang, drive] of [
    [4, "DRIVE GEAR SHAFT z12 m3 x+0.3", C1x, P.rot1(0), 135, true],
    [5, "DRIVEN GEAR SHAFT z12 m3 x+0.3", C2x, P.rot2(0), 60, false],
  ]) {
    const [fj, rj] = shaftLoops(drive);
    const sx = drive ? -1 : 1;
    out.push(
      S.part(id, name, [
        S.extrude(P.gearPoly([c, 0], rot), { along: "z", from: g0, to: g1 }),
        S.lathe(fj, ax(c)),
        S.lathe(rj, ax(c)),
      ], { mat: "steel", angle: ang, pivot: [c, 0, 0], explode: [0, 0, EX.gears], anchor: { cut: [c + sx * 9, sx * 5, 0], out: { c: [c, 0, zw(Z.rear - 0.5)] } } }),
    );
  }
  // 11 KEY: in the drive shaft's end, turning with it (built at th = 0: on −u, as View F shows it)
  out.push(
    S.part(11, "PARALLEL KEY 5×5×16", [S.box([C1x - 9.5, -2.5, zw(-58)], [C1x - 6.6, 2.5, zw(-42)])], {
      pivot: [C1x, 0, 0], explode: [0, 32, 0], anchor: { cut: [C1x - 9.5, 0, zw(-50)], out: { c: [C1x - 9.5, 0, zw(-50)] } },
    }),
  );

  // 6, 7 BUSHINGS: D-shaped pairs meeting on u = 0, a Ø18 bore for the bearing
  const dPair = (z0, z1, relief) => {
    const solids = [];
    for (const s of [-1, 1]) {
      const c = s < 0 ? C1x : C2x;
      const hatch = ["bronze", s < 0 ? 30 : 60];
      const hole = [S.circle(c, 0, 9.05, 64)];
      if (relief) {
        solids.push(S.extrude(dShape(s, BR - 0.05), { along: "z", from: z0, to: z1 - 1.5, holes: hole, hatch, own: true }));
        solids.push(S.extrude(dShape(s, BR - 0.05, true), { along: "z", from: z1 - 1.5, to: z1, holes: hole, hatch, own: true }));
      } else solids.push(S.extrude(dShape(s, BR - 0.05), { along: "z", from: z0, to: z1, holes: hole, hatch, own: true }));
    }
    return solids;
  };
  out.push(
    S.part(6, "FRONT BUSHING, D-FORM", dPair(f0, f1, true), {
      mat: "bronze", angle: 30, explode: [0, 0, EX.front], anchor: { cut: [C1x - 4, -12, f1], out: { c: [C1x - 4, -BR + 0.5, f1 - 6] } },
    }),
    S.part(7, "REAR BUSHING, D-FORM", dPair(r0, r1, false), {
      mat: "bronze", angle: 60, explode: [0, 0, EX.rear], anchor: { cut: [C2x + 4, 14, r0], out: { c: [C2x + 4, BR - 0.5, r1 - 3] } },
    }),
  );
  // 8 PLAIN BEARINGS: steel-backed, 1 mm wall, blacked in; each rides with its bushing
  const bearings = [];
  for (const c of [C1x, C2x]) {
    bearings.push(S.tube({ ...ax(c), r0: RJ + 0.05, r1: 9, from: zw(Z.front + 0.5), to: zw(-0.5), explode: [0, 0, EX.front] }));
    bearings.push(S.tube({ ...ax(c), r0: RJ + 0.05, r1: 9, from: zw(Z.g1 + 0.5), to: zw(Z.rear - 0.5), explode: [0, 0, EX.rear] }));
  }
  out.push(S.part(8, "PLAIN BEARING 16×18×14", bearings, { hatch: "solid", anchor: { cut: [C1x + 8.5, 0, zw(-8)], out: { c: [C1x, 9, zw(-8)] }, solid: 0 } }));

  // 2 FRONT FLANGE: the plate, the seal bore (a ring fills it to Ø20 ahead of the seal), the spigot
  // with the circlip groove; the tapped holes show as mouths on its face
  const sp = 25;
  out.push(
    S.part(2, "FRONT FLANGE, SPIGOT Ø50", [
      S.extrude(rr(), { along: "z", from: zw(Z.flangeFace), to: zw(Z.front), holes: [S.circle(C1x, 0, 14, 64)] }),
      S.lathe(zl([[10, Z.front], [14.02, Z.front], [14.02, Z.sealIn], [10, Z.sealIn]]), ax(C1x)),
      S.lathe(zl([[14, Z.flangeFace], [sp, Z.flangeFace], [sp, Z.spigot + 0.6], [sp - 0.6, Z.spigot], [14.4, Z.spigot], [14, Z.spigot + 0.4], [14, P.CLIP.z0], [P.CLIP.groove, P.CLIP.z0], [P.CLIP.groove, P.CLIP.z1], [14, P.CLIP.z1]]), ax(C1x)),
      ...BOLTS.map(([x, y]) => S.disc([x, y, zb0 + 0.03], 4, { normal: "z", role: "mouth" })),
    ], { mat: "alu", angle: 135, explode: [0, 0, EX.flange], anchor: { cut: [H.u, -14, zw(-24)], out: { c: [H.u, -14, zw(-24)] } } }),
  );

  // 3 REAR COVER
  out.push(
    S.part(3, "REAR COVER", [S.extrude(rr(0.8), { along: "z", from: zb1, to: zw(Z.coverOut), bevel: 0.8, holes: boltHoles(5.3) })], {
      mat: "iron", angle: 135, explode: [0, 0, EX.cover], anchor: { cut: [H.u, 10, zb1 + 0.5], out: { c: [-30, -30, zw(Z.coverOut)] } },
    }),
  );

  // 9 SHAFT SEAL DIN 3760 A 16×28×7: the sheet's rubber profile, its moulded case and garter spring
  const seal = P.SPRING;
  out.push(
    S.part(9, "SHAFT SEAL 16×28×7", [
      S.lathe(zl(SEAL_RUBBER.map(([r, z]) => [Math.min(r, 13.95), z])), ax(C1x)),
      S.lathe(zl(SEAL_CASE), { ...ax(C1x), hatch: "solid", own: true }),
      S.torus([C1x, 0, zw(seal[1])], seal[0], 0.62, { axis: "z", hatch: "solid", own: true }),
    ], { mat: "rubber", angle: 45, explode: EX.seal, anchor: { cut: [C1x, 12.5, zw(-29)], out: { c: [C1x, 0, zw(-29)], r: 14, axis: "z" } } }),
  );
  // 10 CIRCLIP DIN 472
  out.push(
    S.part(10, "CIRCLIP 28×1.2", [S.tube({ ...ax(C1x), r0: 12.1, r1: P.CLIP.groove - 0.1, from: zw(P.CLIP.z0 + 0.1), to: zw(P.CLIP.z1 - 0.1) })], {
      hatch: "solid", explode: EX.clip, anchor: { cut: [C1x, -13.3, zw(-34)], out: { c: [C1x, 0, zw(-34)], r: 14.6, axis: "z" } },
    }),
  );

  // 12 SCREWS M8×70 through the cover and body into the flange; 13 WASHERS under their heads
  // in two pieces split at the flange joint: the cut face of the head piece then sits on the joint,
  // in front of the flange face, instead of at the screw's end inside the (unbored) flange
  const screw = zl([[0, Z.front], [3.95, Z.front], [3.95, Z.head], [6.5, Z.head], [6.5, Z.head + 7.4], [5.9, Z.head + 8], [0, Z.head + 8]]);
  const tail = zl([[0, Z.boltEnd], [3.4, Z.boltEnd], [3.95, Z.boltEnd + 0.6], [3.95, Z.front], [0, Z.front]]);
  out.push(
    S.part(12, "SCREW M8×70 ISO 4762", [
      ...BOLTS.map(([x, y]) => S.lathe(screw, { axis: "z", at: [x, y] })),
      ...BOLTS.map(([x, y]) => S.lathe(tail, { axis: "z", at: [x, y] })),
      ...BOLTS.map(([x, y]) => S.disc([x, y, zw(Z.head + 8) + 0.03], 3.46, { normal: "z", role: "mouth" })),
    ], { mat: "steel", angle: 135, explode: [0, 0, EX.screws], anchor: { cut: [M.BOLT.u, M.BOLT.v, 0], out: { c: [M.BOLT.u, M.BOLT.v, zw(Z.head + 4)], r: 6.5, axis: "z" } } }),
    S.part(13, "WASHER 8 ISO 7089", BOLTS.map(([x, y]) => S.tube({ axis: "z", at: [x, y], r0: 4.2, r1: 8, from: zw(Z.coverOut), to: zw(Z.head) })), {
      explode: [0, 0, EX.washers], anchor: { cut: [H.u, 0, zw(Z.head) - 0.5], out: { c: [M.BOLT.u, -M.BOLT.v, zw(Z.head)], r: 8, axis: "z" } },
    }),
  );

  // 14 BODY SEALS, figure-8 cord round the pocket, front (flange) and rear (cover); 15 BALANCE SEAL
  // behind the front bushings. Their grooves are not modelled: the seals sit in the flange and cover.
  const OR = P.OR;
  const band = (z0, z1, ex) => S.extrude(fig8(OR.u1 - 0.15 - RW, 48), { along: "z", from: z0, to: z1, holes: [fig8(OR.u0 + 0.15 - RW, 48).reverse()], explode: [0, 0, ex] });
  out.push(
    S.part(14, "BODY SEAL, FIGURE-8", [band(zw(Z.front - OR.depth + 0.05), zb0, EX.oringF), band(zb1, zw(Z.rear + OR.depth - 0.05), EX.oringR)], {
      mat: "rubber", angle: 135, anchor: { cut: [-(OR.u0 + OR.u1) / 2, 0, zb0], out: { c: [-(OR.u0 + OR.u1) / 2, 0, zb0] }, solid: 0 },
    }),
  );
  // a "3": two rings round the journals; B-B crosses each at the sheet's BAL stations
  const bal = [];
  const rIn = (Math.abs(P.BAL[0][1] - C1x) + Math.abs(P.BAL[1][0] - C1x)) / 2 + 0.2;
  const rOut = (Math.abs(P.BAL[0][0] - C1x) + Math.abs(P.BAL[1][1] - C1x)) / 2 - 0.2;
  for (const c of [C1x, C2x]) bal.push(S.tube({ ...ax(c), r0: rIn, r1: rOut, from: zw(Z.front - 1.5), to: zb0 }));
  out.push(
    S.part(15, "BALANCE SEAL, 3-FORM", bal, {
      mat: "rubber", angle: 45, explode: [0, 0, EX.oringF], anchor: { cut: [C2x, 15, zb0], out: { c: [C2x, 15, zb0] } },
    }),
  );
  return out;
}

// parts.mjs keeps these two profiles private: the sheet's numbers, retyped from its sealB()
const SEAL_RUBBER = [
  [14, -32.2], [14, -25.6], [13.6, -25.2], [12.9, -25.2], [12.9, -29.6], [11.0, -29.6],
  [10.2, -28.6], [10.0, -27.9], [8.0, -27.2], [8.0, -26.7], [10.0, -25.3], [10.8, -25.3],
  [10.8, -25.9], [10.1, -26.2], [10.1, -27.4], [11.6, -28.1], [11.9, -28.1], [11.9, -30.1], [10.4, -30.1], [10.4, -32.2],
];
const SEAL_CASE = [[13.2, -31.8], [13.2, -25.9], [13.6, -25.9], [13.6, -32.0], [10.9, -32.0], [10.9, -31.6], [13.2, -31.6]];

// ---------------------------------------------------------------- the oil
// One fluid per tooth space (both gears, in P.spaces order), each the sheet's spacePoly at th = 0,
// turned with its gear at run time: the batches travel round. Plus the oil in the two ports.
export const SPACES = [];
for (let k = 0; k < M.Z; k++) {
  SPACES.push({ name: `s1-${k}`, gear: 1, c: P.rot1(0) + k * M.PITCH });
  SPACES.push({ name: `s2-${k}`, gear: 2, c: P.rot2(0) + k * M.PITCH });
}
export function fluids() {
  const h = M.B / 2 - 0.05;
  const out = SPACES.map((s) => S.fluid(s.name, S.extrude(P.spacePoly(s.gear === 1 ? P.C1 : P.C2, s.c), { along: "z", from: -h, to: h })));
  out.push(S.fluid("outlet", S.lathe(portLoop(M.OUTLET, 1, 0.03), { axis: "y", at: [0, 0] })));
  out.push(S.fluid("inlet", S.lathe(portLoop(M.INLET, -1, 0.03), { axis: "y", at: [0, 0] })));
  out.push(S.fluid("outlet-ridge", S.extrude(cusp(M.OUTLET.drill, 1), { along: "z", from: -M.OUTLET.drill + 0.65, to: M.OUTLET.drill - 0.65 })));
  out.push(S.fluid("inlet-ridge", S.extrude(cusp(M.INLET.drill, -1), { along: "z", from: -M.INLET.drill + 0.65, to: M.INLET.drill - 0.65 })));
  return out;
}

// centre lines: the two shaft axes and the ports' axis, as the sheet draws them
export const centres = () => [
  [[C1x, 0, zw(Z.shaftEnd) - 6], [C1x, 0, zw(Z.head + 8) + 6]],
  [[C2x, 0, zw(Z.front) - 6], [C2x, 0, zw(Z.head + 8) + 6]],
  [[0, 13, 0], [0, H.v + 6, 0]],
  [[0, -19, 0], [0, -H.v - 6, 0]],
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
