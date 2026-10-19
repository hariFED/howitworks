// Truth first: the gravity-feed fuel system of a four-seat high-wing light aircraft with a carburetted
// flat-four. Two welded tanks in the wing roots feed by their own weight down the front door posts to
// a BOTH / LEFT / RIGHT / OFF selector under the cabin floor, then forward through a shut-off valve
// to the strainer (gascolator) at the firewall's low point and up to the updraft carburettor's float
// valve. Pure, no imports, no DOM: the geometry, the readouts, the diagrams and the 3D view read this.
//
// Frames (mm), the parent sheet's: FS aft of the firewall's front face, WL up from the ground at
// rest, BL from the centre line, + to starboard; WS the wing station along the span.
// Physics, per branch: the head ρg·Δz from each tank's surface (plus its ullage pressure) to the
// junction in the selector, less the line's losses (Darcy–Weisbach with f = 64/Re in laminar flow,
// which is Hagen–Poiseuille, Blasius above Re 4000, and minor losses K·½ρv² at the fittings);
// then the common line to the carburettor's float needle, an orifice Q = Cd·A·√(2Δp/ρ).
// SI inside (Pa, m³/s), litres and L/h at the edges.

export const G = 9.81;
export const P_ATM = 101325; // Pa
export const RHO = 721; // kg/m³, aviation gasoline at 15 °C
export const MU = 0.43e-3; // Pa·s (ν ≈ 0.6 mm²/s)
export const RHO_W = 998; // water
export const RHO_AIR = 1.225;
export const LPH = 1 / 3.6e6; // m³/s per L/h

// ---------------------------------------------------------------- the wing and its tanks (class figures)
// The parent's wing: NACA 2412, root chord 1626 at FS 660, 1.5° incidence, 1.73° dihedral.
export const WING = { le: 660, chord: 1626, wlLe: 2073.82, inc: 1.5, dih: 1.73 };
const rad = Math.PI / 180;
export const wlLeAt = (ws) => WING.wlLe + ws * Math.tan(WING.dih * rad);
// NACA 2412 in chord fractions: upper and lower surface at ξ
function naca(xi) {
  const t = 0.12;
  const m = 0.02;
  const p = 0.4;
  const yt = 5 * t * (0.2969 * Math.sqrt(xi) - 0.126 * xi - 0.3516 * xi ** 2 + 0.2843 * xi ** 3 - 0.1015 * xi ** 4);
  const yc = xi < p ? (m / p ** 2) * (2 * p * xi - xi ** 2) : (m / (1 - p) ** 2) * (1 - 2 * p + 2 * p * xi - xi ** 2);
  return [yc + yt, yc - yt];
}
// the wing's outer surfaces at (FS, WS): [lower WL, upper WL] (thin-aerofoil placement, incidence applied)
export function wingAt(fs, ws) {
  const c = WING.chord;
  const xi = Math.min(1, Math.max(0, (fs - WING.le) / c));
  const [u, l] = naca(xi);
  const drop = (fs - WING.le) * Math.tan(WING.inc * rad);
  const base = wlLeAt(ws) - drop;
  return [base + l * c, base + u * c];
}
// The tank fills the bay between the front spar (+22) and the rear spar (−18), from the root rib's bay
// at WS 920 to WS 1800, its walls INSET in from the wing's outer surfaces (skin, clearance, its own wall).
export const TANK = { fs0: 1039.7, fs1: 1812.7, ws0: 920, ws1: 1800, inset: 4.5, wall: 1.0 };
export const tankLo = (fs, ws) => wingAt(fs, ws)[0] + TANK.inset;
export const tankHi = (fs, ws) => wingAt(fs, ws)[1] - TANK.inset;
// Volume below a level surface at WL h (litres), integrated over the bay: precomputed as a table.
const NW = 22;
const NF = 30;
const DW = (TANK.ws1 - TANK.ws0) / NW;
const DF = (TANK.fs1 - TANK.fs0) / NF;
const CELLS = [];
for (let i = 0; i < NW; i++)
  for (let j = 0; j < NF; j++) {
    const ws = TANK.ws0 + (i + 0.5) * DW;
    const fs = TANK.fs0 + (j + 0.5) * DF;
    CELLS.push([tankLo(fs, ws), tankHi(fs, ws)]);
  }
export const TANK_BOTTOM = Math.min(...CELLS.map((c) => c[0]));
export const TANK_TOP = Math.max(...CELLS.map((c) => c[1]));
const volBelow = (h) => (CELLS.reduce((s, [lo, hi]) => s + Math.max(0, Math.min(h, hi) - lo), 0) * DW * DF) / 1e6;
const HTAB = [];
for (let h = Math.floor(TANK_BOTTOM); h <= Math.ceil(TANK_TOP) + 1; h += 1) HTAB.push([h, volBelow(h)]);
export const TANK_VOL = volBelow(TANK_TOP + 1); // internal volume, litres
export const FULL = 106; // L, filled to the bottom of the filler neck (published total)
export function volumeAt(h) {
  if (h <= HTAB[0][0]) return 0;
  const i = Math.min(HTAB.length - 2, Math.floor(h - HTAB[0][0]));
  const [h0, v0] = HTAB[i];
  const [, v1] = HTAB[i + 1];
  return v0 + (v1 - v0) * Math.min(1, h - h0);
}
export function levelAt(v) {
  if (v <= 0) return HTAB[0][0];
  if (v >= HTAB[HTAB.length - 1][1]) return HTAB[HTAB.length - 1][0];
  let i = 0;
  while (i < HTAB.length - 2 && HTAB[i + 1][1] < v) i++;
  const [h0, v0] = HTAB[i];
  const [h1, v1] = HTAB[i + 1];
  return h0 + ((v - v0) / Math.max(1e-9, v1 - v0)) * (h1 - h0);
}
// Section B-B cuts the tank spanwise at FS 1150, near the bay's lowest line (the aerofoil's lower
// surface, tilted by the incidence, is lowest about a third of the chord back). The outlet leaves
// through the inboard end wall (the dihedral makes that end the low one), a finger strainer reaching
// out from it into the tank with its lowest slots PICKUP above the floor: fuel below them is unusable,
// and the sump under them is where water and sediment settle, over the drain.
export const FS_B = 1150;
export const OUTLET = { fs: FS_B, ws: 920 };
export const OUTLET_FLOOR = tankLo(FS_B, 925);
export const PICKUP = 24; // mm above the floor at the outlet: the strainer's lowest slots
export const STRAINER_R = 9.5; // the finger strainer, Ø19
export const OUTLET_WL = OUTLET_FLOOR + PICKUP + STRAINER_R; // its axis
export const UNUSABLE = volumeAt(OUTLET_FLOOR + PICKUP);
export const USABLE = FULL - UNUSABLE;
// the tanks' centroid span station, for the head a sideslip adds (see slipHead)
export const WS_C = (TANK.ws0 + TANK.ws1) / 2;
export const FILLER = { fs: FS_B, ws: 1250, r: 30 };
// the vent: from the tank's high (outboard) end, down through a check valve to a forward-facing tube
// under the wing (it catches ram air: CP of the dynamic pressure)
export const VENT = { ws: 1840, cp: 0.8 };
export const SENDER = { ws: 1800, arm: 330 }; // pivot on the outboard end wall, float on the arm

// ---------------------------------------------------------------- the lines (route in FS, BL, WL)
// 3/8 in × 0.035 in 5052-O tube.
export const D_OUT = 9.525;
export const D_LINE = 9.525 - 2 * 0.889; // 7.747 mm
export const A_LINE = (Math.PI / 4) * (D_LINE / 1000) ** 2; // m²
// Route of the port branch (the starboard is its mirror): outlet, along the root rib inboard, forward
// along the root to the front door post, down it, inboard under the floor to the selector's port.
// Each point: [FS, BL, WL, K] where K is the minor loss at that fitting.
export const SELECTOR = { fs: 720, bl: 0, wl: 830 }; // the ports' plane, under the floorboards
export const STRAINER = { fs: -60, bl: -110, wl: 805 }; // inlet port, on the firewall's forward face
export const CARB = { fs: -250, bl: -40, wl: 850 }; // the float valve's inlet
export const FLOORBOARD = 880;
export const FIREWALL = [0, 20];
export const PANEL_FS = 300;
const branchRoute = (sg) => [
  [OUTLET.fs, sg * (OUTLET.ws + 60), OUTLET_WL, 1.5], // the finger strainer's tip: entry and screen
  [OUTLET.fs, sg * 640, OUTLET_WL, 0.3],
  [660, sg * 600, 1995, 0.3], // top of the front door post
  [660, sg * 600, SELECTOR.wl + 40, 0.3], // bottom of the post
  [660, sg * 70, SELECTOR.wl, 0.3],
  [SELECTOR.fs, sg * 20, SELECTOR.wl, 0], // the selector port (its loss is the rotor's, below)
];
export const ROUTE = { L: branchRoute(-1), R: branchRoute(1) };
// the common line: down out of the selector, forward to the shut-off at the firewall, through it to
// the strainer, then up and forward to the carburettor
export const COMMON = [
  [SELECTOR.fs, 0, SELECTOR.wl, 1.0], // the selector's body: turns down to the outlet
  [SELECTOR.fs, 0, 790, 0.3],
  [80, 0, 790, 0.5], // the shut-off valve, open
  [30, 0, 790, 0.3],
  [STRAINER.fs, STRAINER.bl, STRAINER.wl, 3.0], // the strainer: in, down round the screen, through it, up
  [-120, STRAINER.bl, 840, 0.3],
  [CARB.fs, CARB.bl, CARB.wl, 0.6], // the carburettor's inlet fitting and its small screen
];
const segLen = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]), 0) / 1000;
export const L_BRANCH = segLen(ROUTE.L); // m
export const L_COMMON = segLen(COMMON); // m
const kSum = (pts) => pts.reduce((s, p) => s + p[3], 0);
export const K_BRANCH = kSum(ROUTE.L);
export const K_COMMON = kSum(COMMON);

// Darcy friction factor: laminar (Hagen–Poiseuille), Blasius when turbulent, blended across transition
export function friction(re) {
  const lam = 64 / Math.max(re, 1e-6);
  const tur = 0.3164 / Math.max(re, 1) ** 0.25;
  if (re < 2300) return lam;
  if (re > 4000) return tur;
  const w = (re - 2300) / 1700;
  return (1 - w) * (64 / 2300) + w * (0.3164 / 4000 ** 0.25);
}
export const reynolds = (q) => (RHO * (Math.abs(q) / A_LINE) * (D_LINE / 1000)) / MU;
// pressure loss (Pa, signed with the flow) along L metres of line with minor losses K, at flow q (m³/s)
export function lineLoss(q, L, K) {
  const v = Math.abs(q) / A_LINE;
  if (v < 1e-9) return 0;
  const f = friction(reynolds(q));
  return Math.sign(q) * (f * (L / (D_LINE / 1000)) + K) * 0.5 * RHO * v * v;
}

// ---------------------------------------------------------------- the selector valve
// A brass rotor turns in the body. The two inlet ports enter the bore 45° either side of forward; the
// rotor's window spans WINDOW either side of where the handle points; a port is open by the share of
// its width the window overlaps. Handle positions (degrees, clockwise from forward, seen from above):
export const POS = { LEFT: -90, BOTH: 0, RIGHT: 90, OFF: 180 };
export const PORT_ANGLE = { L: -45, R: 45 };
export const WINDOW = 60; // half-angle of the rotor's window
export const PORT_HALF = 12; // half-angle the port's Ø7.75 bore subtends at the Ø36 rotor face
export const ROTOR_R = 18;
export const K_PORT = 1.2; // a fully open port, with the turn into the rotor
const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
export function portOpen(theta, port) {
  const c = wrap(PORT_ANGLE[port] - theta); // the port's angle in the rotor's frame
  const lo = Math.max(c - PORT_HALF, -WINDOW);
  const hi = Math.min(c + PORT_HALF, WINDOW);
  return Math.max(0, hi - lo) / (2 * PORT_HALF);
}
export const ROTATE_RATE = 240; // deg/s, a hand turning it
export function posName(theta) {
  for (const [k, v] of Object.entries(POS)) if (Math.abs(theta - v) < 3) return k;
  return "TURNING";
}

// ---------------------------------------------------------------- the carburettor's float valve
// A Ø3.2 seat (Cd 0.62): the float lifts the needle into it as the bowl fills, so the valve passes
// what the engine draws as long as the head can push that much through it wide open.
export const SEAT_D = 3.2;
export const A_SEAT = (Math.PI / 4) * (SEAT_D / 1000) ** 2;
export const CD_SEAT = 0.62;
export const BOWL_FULL = 60; // mL in the float bowl at the float's level
export const BOWL_BAND = 4; // mL: the needle goes from shut to wide open over this much fall
export const BOWL_LEAN = 30; // mL: below this the main jet starts to suck air: the engine runs lean

// ---------------------------------------------------------------- the network
// Each tank's driving pressure at the junction (Pa gauge, with no flow): its ullage pressure plus the
// head from its surface down to the selector, with the lateral share of a sideslip's apparent gravity.
export const slipHead = (sg, slipDeg) => sg * WS_C * Math.tan(slipDeg * rad); // mm, sg −1 port
export function sourceP(tank, sg, slipDeg) {
  const z = levelAt(tank.v) + slipHead(sg, slipDeg);
  return tank.pu - P_ATM + RHO * G * ((z - SELECTOR.wl) / 1000);
}
// The flow (m³/s) a line of L metres with minor losses K (and an orifice's kq·q|q| at its end) passes
// under a pressure difference dp: exact for laminar flow plus the quadratic losses, then a few Newton
// steps where the friction turns turbulent.
const A_HP = (128 * MU) / (Math.PI * (D_LINE / 1000) ** 4); // Pa per (m³/s) per metre: Hagen–Poiseuille
export function pipeQ(dp, L, K, kq = 0) {
  if (Math.abs(dp) < 1e-9) return 0;
  const sg = Math.sign(dp);
  const P = Math.abs(dp);
  const a = A_HP * L;
  const b = (K * 0.5 * RHO) / (A_LINE * A_LINE) + kq;
  let q = b > 0 ? (-a + Math.sqrt(a * a + 4 * b * P)) / (2 * b) : P / a;
  const F = (x) => lineLoss(x, L, K) + kq * x * x - P;
  for (let i = 0; i < 6; i++) {
    const f = F(q);
    if (Math.abs(f) < 1e-3) break;
    const h = Math.max(1e-10, q * 1e-4);
    const d = (F(q + h) - f) / h;
    if (!(d > 0)) break;
    q = Math.max(q * 0.2, q - f / d);
  }
  return sg * q;
}
// the flow out of one branch when the junction is at pj
function branchQ(src, open, pj) {
  if (open < 0.01) return 0;
  return pipeQ(src - pj, L_BRANCH, K_BRANCH + K_PORT / (open * open));
}
// the flow down the common line into the bowl when the junction is at pj and the needle `needle` open
const DZ_COMMON = (SELECTOR.wl - CARB.wl) / 1000;
const kNeedle = (open) => (0.5 * RHO) / (CD_SEAT * A_SEAT * open) ** 2;
function commonQ(pj, needle, shut) {
  if (shut || needle < 1e-4) return 0;
  const dp = pj + RHO * G * DZ_COMMON;
  if (dp <= 0) return 0; // the needle's seat holds: nothing flows back out of the bowl
  return pipeQ(dp, L_COMMON, K_COMMON, kNeedle(needle));
}
// Solve the junction: the branches' flows must add up to the common line's (or to demandQ). Returns
// flows in m³/s and pressures in Pa gauge. Illinois false position on the junction pressure.
export function solve(s, { needle = 1, demandQ = null } = {}) {
  const open = { L: portOpen(s.theta, "L"), R: portOpen(s.theta, "R") };
  const src = { L: sourceP(s.tanks.L, -1, s.slip), R: sourceP(s.tanks.R, 1, s.slip) };
  const any = open.L >= 0.01 || open.R >= 0.01;
  const shut = s.shut && demandQ == null;
  const net = (pj) => branchQ(src.L, open.L, pj) + branchQ(src.R, open.R, pj) - (demandQ ?? commonQ(pj, needle, shut));
  let pj = 0;
  if (any) {
    let a = Math.min(src.L, src.R) - 4e4;
    let b = Math.max(src.L, src.R) + 1;
    let fa = net(a);
    let fb = net(b);
    let side = 0;
    for (let i = 0; i < 60; i++) {
      pj = (a * fb - b * fa) / (fb - fa);
      const f = net(pj);
      if (Math.abs(f) < 1e-10 || Math.abs(b - a) < 0.01) break;
      if (f > 0) {
        a = pj;
        fa = f;
        if (side === 1) fb /= 2;
        side = 1;
      } else {
        b = pj;
        fb = f;
        if (side === -1) fa /= 2;
        side = -1;
      }
    }
  }
  const qL = branchQ(src.L, open.L, pj);
  const qR = branchQ(src.R, open.R, pj);
  const q = any ? qL + qR : 0;
  return { qL, qR, q, pj, src, open, pc: pj + RHO * G * DZ_COMMON - lineLoss(q, L_COMMON, K_COMMON) };
}

// ---------------------------------------------------------------- the strainer (gascolator)
// Fuel enters at the top, falls round the screen into the bowl, turns and passes in through the
// screen to the outlet. Water is 38 % heavier than the fuel: a drop settles at its terminal speed
// (drag by Schiller–Naumann), and the fuel's own speed in the bowl is far slower, so it stays there.
export const BOWL = { r: 26.5, depth: 72, screenR: 13 }; // inside radius, depth below the casting, screen
export const A_BOWL = Math.PI * ((BOWL.r / 1000) ** 2 - (BOWL.screenR / 1000) ** 2);
export function settleSpeed(d) {
  // d in m; returns m/s
  const dRho = RHO_W - RHO;
  let v = (dRho * G * d * d) / (18 * MU);
  for (let i = 0; i < 30; i++) {
    const re = Math.max(1e-6, (RHO * v * d) / MU);
    const cd = (24 / re) * (1 + 0.15 * re ** 0.687);
    v = Math.sqrt((4 * dRho * G * d) / (3 * cd * RHO));
  }
  return v;
}
// the smallest drop that still settles against the fuel's speed down through the bowl at flow q
export function dCrit(q) {
  const up = Math.abs(q) / A_BOWL;
  let lo = 1e-6;
  let hi = 2e-3;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (settleSpeed(m) < up) lo = m;
    else hi = m;
  }
  return hi;
}
// the drain: a spring-closed poppet at the bowl's lowest point, Ø3 when pulled open
export const DRAIN_D = 3;
export const A_DRAIN = (Math.PI / 4) * (DRAIN_D / 1000) ** 2;
export const STRAINER_BOTTOM = STRAINER.wl - 40 - BOWL.depth; // WL of the bowl's floor
// representative water drops after refuelling: diameter (mm), start height above the bowl floor (mm)
export const DROPS = Array.from({ length: 16 }, (_, i) => {
  const r = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  const f = r - Math.floor(r);
  return { d: 0.28 + 0.34 * f, h0: 8 + ((i * 37) % 54), x: -19 + ((i * 23) % 38) };
});
export const WATER0 = 6; // mL of water settling out after refuelling

// ---------------------------------------------------------------- the primer
// A plunger pump on the panel: pulled out it draws fuel from the strainer's top port past one ball
// check valve; pushed in it sends it through the other to the cylinders' intake ports.
export const PRIMER = { bore: 14.3, stroke: 45 };
export const A_PRIMER = (Math.PI / 4) * PRIMER.bore ** 2; // mm²
export const PRIMER_ML = (A_PRIMER * PRIMER.stroke) / 1000; // mL a stroke

// ---------------------------------------------------------------- the engine
export const FLOW = { idle: 8, takeoff: 48, cruise: 38 }; // L/h
export const RPM = { idle: 700, takeoff: 2700, cruise: 2450 };
export const V_CRUISE = 110; // kt
export const qDyn = (kt) => 0.5 * RHO_AIR * (kt * 0.514444) ** 2;

// ---------------------------------------------------------------- state and step
export function system() {
  const tank = () => ({ v: FULL, pu: P_ATM, air: 0 });
  const s = {
    t: 0, // tour time (s)
    ft: 0, // flight time (s): runs faster than t when the tour fast-forwards
    tanks: { L: tank(), R: tank() },
    theta: POS.BOTH,
    shut: false,
    vent: { L: true, R: true }, // open
    slip: 0,
    kt: 0,
    run: false,
    demand: 0, // L/h the engine wants
    burn: 0, // L/h it gets
    bowl: BOWL_FULL,
    needle: 0,
    q: 0, qL: 0, qR: 0, pj: 0, pc: 0, qMax: 0,
    water: 0, // mL settled on the bowl floor
    drops: [], // heights above the floor (mm) of the drops still falling; null once settled
    drained: { water: 0, fuel: 0 },
    drain: 0, // 0 shut … 1 open
    primer: 0, // plunger out (mm)
    primerV: 0, // its speed (mm/s): + drawing in
    primed: 0, // mL sent to the cylinders
    rpm: 0,
    waterH: 0,
  };
  for (const k of ["L", "R"]) s.tanks[k].air = s.tanks[k].pu * (TANK_VOL - s.tanks[k].v);
  return s;
}
export function refuel(s) {
  s.tanks.L.v = s.tanks.R.v = FULL;
  for (const k of ["L", "R"]) s.tanks[k].air = s.tanks[k].pu * (TANK_VOL - s.tanks[k].v);
  s.drops = DROPS.map((d) => d.h0);
  s.water = 0;
  s.drained = { water: 0, fuel: 0 };
}

// Advance by dt real seconds, with the tanks' processes fast-forwarded by `warp`. ctl: { sel (deg),
// vent: { L, R }, shut, slip (deg), kt, run, demand (L/h), primer (target mm), drain (0..1) }.
export function stepSystem(s, dt, ctl, warp = 1) {
  s.t += dt;
  const dtf = dt * warp;
  s.ft += dtf;
  // the hand on the selector
  const d = ctl.sel - s.theta;
  s.theta += Math.sign(d) * Math.min(Math.abs(d), ROTATE_RATE * dt);
  s.shut = !!ctl.shut;
  s.slip = ctl.slip ?? 0;
  s.kt = ctl.kt ?? 0;
  s.vent = ctl.vent ?? s.vent;
  s.run = !!ctl.run;
  s.demand = s.run ? ctl.demand : 0;
  // ullage: open vents hold it at ambient plus the ram the forward-facing tube catches
  const ram = VENT.cp * qDyn(s.kt);
  for (const k of ["L", "R"]) {
    const T = s.tanks[k];
    const vu = Math.max(0.05, TANK_VOL - T.v); // litres
    if (s.vent[k]) {
      T.pu = P_ATM + ram;
      T.air = T.pu * vu;
    } else T.pu = T.air / vu; // a sealed ullage: Boyle, p·V constant
  }
  // the float valve: open by how far the bowl has fallen below its level
  const needle = Math.min(1, Math.max(0, (BOWL_FULL - s.bowl) / BOWL_BAND));
  const sol = solve(s, { needle });
  s.needle = needle;
  // the engine draws from the bowl; the bowl takes what the valve passes
  const want = s.demand * LPH;
  const lean = Math.min(1, Math.max(0, s.bowl / BOWL_LEAN));
  const draw = want * lean;
  s.bowl = Math.min(BOWL_FULL, Math.max(0, s.bowl + (sol.q - draw) * 1e6 * dt));
  s.burn = draw / LPH;
  s.q = sol.q;
  s.qL = sol.qL;
  s.qR = sol.qR;
  s.pj = sol.pj;
  s.pc = sol.pc;
  // what the line could pass with the needle wide open (the margin over demand)
  s.qMax = solve(s, { needle: 1 }).q;
  const target = s.run ? (s.demand >= FLOW.takeoff - 1 ? RPM.takeoff : s.demand <= FLOW.idle + 1 ? RPM.idle : RPM.cruise) : 0;
  s.rpm += (target * Math.min(1, lean * 1.15) ** 0.5 - s.rpm) * Math.min(1, dt * 3);
  // the strainer's drain and the primer draw a little more through the lines
  const drainOpen = (s.drain = s.drain + (Math.min(1, Math.max(0, ctl.drain ?? 0)) - s.drain) * Math.min(1, dt * 20));
  let extra = 0;
  if (drainOpen > 0.02) {
    const dpBottom = Math.max(0, sol.pj + RHO * G * ((SELECTOR.wl - STRAINER_BOTTOM) / 1000));
    const rhoOut = s.water > 0 ? RHO_W : RHO;
    const qd = 0.6 * A_DRAIN * drainOpen * Math.sqrt((2 * dpBottom) / rhoOut) * 1e6; // mL/s
    if (s.water > 0) {
      const w = Math.min(s.water, qd * dt);
      s.water -= w;
      s.drained.water += w;
      s.drained.fuel += qd * dt - w;
    } else s.drained.fuel += qd * dt;
    extra += qd * dt;
  }
  const want_p = Math.min(PRIMER.stroke, Math.max(0, ctl.primer ?? 0));
  const p0 = s.primer;
  s.primer += Math.sign(want_p - p0) * Math.min(Math.abs(want_p - p0), 110 * dt);
  s.primerV = (s.primer - p0) / Math.max(dt, 1e-9);
  if (s.primer < p0) s.primed += ((p0 - s.primer) * A_PRIMER) / 1000;
  else extra += ((s.primer - p0) * A_PRIMER) / 1000;
  // water drops settle at their terminal speed less the fuel's speed down the bowl (here, slower)
  const up = (Math.abs(s.q) / A_BOWL) * 1000; // mm/s
  s.drops = s.drops.map((h, i) => {
    if (h == null) return null;
    const v = settleSpeed(DROPS[i].d / 1000) * 1000 + up * 0.2;
    const nh = h - v * dt;
    if (nh <= s.waterH) {
      s.water += WATER0 / DROPS.length;
      return null;
    }
    return nh;
  });
  s.waterH = waterHeight(s.water);
  // the tanks: each gives what its branch carries. The steady part (what the engine burns, and any
  // cross-feed) runs at the fast-forward; the bowl refilling is a real-time transient, drawn from the
  // feeding tanks in proportion to what each gives.
  const excess = Math.max(0, sol.q - draw); // m³/s refilling the bowl
  const pos = Math.max(0, sol.qL) + Math.max(0, sol.qR);
  for (const k of ["L", "R"]) {
    const qk = k === "L" ? sol.qL : sol.qR;
    const share = pos > 1e-12 ? Math.max(0, qk) / pos : 0;
    const out = qk * 1000 * dtf - share * excess * 1000 * (dtf - dt) + share * (extra / 1000);
    s.tanks[k].v = Math.max(0, Math.min(TANK_VOL - 0.05, s.tanks[k].v - out));
  }
  return s;
}
// height (mm) of the water layer on the bowl's floor for w mL (the floor is flat, the bowl round)
export const waterHeight = (w) => (w * 1000) / (Math.PI * BOWL.r ** 2);

// ---------------------------------------------------------------- the tour (loops)
// The tanks' processes are fast-forwarded in flight (×120, ×40 while the vent is blocked); the
// valves, the primer, the strainer and the engine's response run in real time.
//  0.0  refuelled, engine off, BOTH: water drops settle in the strainer bowl
//  4.4  the strainer drain is pulled: water out first, then clear fuel; released
//  6.4  two strokes of the primer
//  9.6  start, idle; 11 take-off and climb at full power; 14 cruise at 75 % on BOTH, in a slight
//       sideslip: the tanks drain unevenly until their surfaces stand level in the tilted gravity
// 20.5  the selector to LEFT: the right port closes, the left tank feeds alone
// 25.0  the left vent is blocked (ice, an insect's nest): the ullage pressure falls as fuel leaves,
//       the flow falls with it, the bowl empties and the engine starves
// 34.6  the selector to RIGHT (through BOTH): the right tank feeds, the engine recovers
// 40.0  loop
export const TOUR = 40;
const ramp = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const sm = (x) => x * x * (3 - 2 * x);
export const T = { drain: [4.4, 6.0], prime: [6.4, 9.0], start: 9.6, takeoff: 11, cruise: 14, left: 20.5, block: 25, right: 34.6 };
export function tourCtl(t) {
  const run = t >= T.start;
  let demand = FLOW.idle;
  if (t >= T.takeoff) demand = FLOW.idle + (FLOW.takeoff - FLOW.idle) * sm(ramp(t, T.takeoff, T.takeoff + 0.6));
  if (t >= T.cruise) demand = FLOW.takeoff + (FLOW.cruise - FLOW.takeoff) * sm(ramp(t, T.cruise, T.cruise + 0.8));
  const kt = t < T.takeoff ? 0 : t < T.cruise ? 60 + 25 * sm(ramp(t, T.takeoff, T.cruise)) : 85 + (V_CRUISE - 85) * sm(ramp(t, T.cruise, T.cruise + 1.5));
  const sel = t >= T.right ? POS.RIGHT : t >= T.left ? POS.LEFT : POS.BOTH;
  // the primer: two strokes, out 0.55 s, in 0.55 s
  let primer = 0;
  const pt = t - T.prime[0];
  if (pt > 0 && pt < 2.6) {
    const k = pt % 1.3;
    primer = k < 0.55 ? PRIMER.stroke : 0;
  }
  return {
    sel,
    vent: { L: !(t >= T.block), R: true },
    shut: false,
    slip: t >= T.cruise ? 0.25 : 0,
    kt,
    run,
    demand,
    primer,
    drain: t >= T.drain[0] && t < T.drain[1] ? 1 : 0,
  };
}
export function warpAt(t) {
  if (t < T.start + 0.8) return 1;
  if (t < T.block) return 1 + 119 * sm(ramp(t, T.start + 0.8, T.takeoff + 0.5));
  if (t < T.right + 1) return 40;
  return 40 + 80 * sm(ramp(t, T.right + 1, T.right + 2.5));
}
export function tourStep(s, dt) {
  const t = s.t + dt;
  stepSystem(s, dt, tourCtl(t), warpAt(t));
  return s;
}
export function tourStart() {
  const s = system();
  refuel(s);
  s.waterH = 0;
  return s;
}
export function phase(s) {
  if (!s.run) {
    if (s.drain > 0.05) return "DRAINING THE STRAINER";
    if (s.primer > 0.5 || s.primerV !== 0) return "PRIMING";
    if (s.drops.some((h) => h != null)) return "WATER SETTLING";
    return "ENGINE OFF";
  }
  if (s.bowl < BOWL_LEAN * 0.9) return "STARVING";
  const fed = (k) => portOpen(s.theta, k) > 0.01;
  if ((!s.vent.L && fed("L")) || (!s.vent.R && fed("R"))) return s.qMax < s.demand * LPH ? "FLOW FALLING" : "VENT BLOCKED";
  if (s.demand <= FLOW.idle + 0.5) return "IDLE";
  if (s.demand > FLOW.cruise + 1) return "TAKE-OFF, CLIMB";
  return "CRUISE";
}

// The whole tour sampled (for the diagrams): [t, flight min, L, R, q (L/h), pu,L (kPa gauge), bowl]
export function tourTrace(dt = 1 / 240, every = 24) {
  const s = tourStart();
  const out = [];
  let i = 0;
  while (s.t < TOUR) {
    tourStep(s, dt);
    if (i++ % every === 0) out.push([s.t, s.ft / 60, s.tanks.L.v, s.tanks.R.v, s.q / LPH, (s.tanks.L.pu - P_ATM) / 1000, s.bowl]);
  }
  return out;
}

// ---------------------------------------------------------------- along the line (Diagram 1)
// Stations along the port branch then the common line: [s (m), WL (mm)], and the hydraulic grade
// line (WL of the fuel's pressure head, mm) at flow: it starts at the tank's surface (plus the ullage
// pressure's head) and falls by every loss.
export function profile(s, side = "L") {
  const route = [...ROUTE[side], ...COMMON];
  const nB = ROUTE[side].length;
  const T0 = s.tanks[side];
  const sg = side === "L" ? -1 : 1;
  const q = side === "L" ? s.qL : s.qR;
  const surf = levelAt(T0.v) + slipHead(sg, s.slip);
  let hgl = surf + ((T0.pu - P_ATM) / (RHO * G)) * 1000;
  const open = portOpen(s.theta, side);
  const pts = [];
  let dist = 0;
  for (let i = 0; i < route.length; i++) {
    const p = route[i];
    const flow = i < nB ? q : s.q;
    if (i > 0) {
      const a = route[i - 1];
      const len = Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]) / 1000;
      dist += len;
      hgl -= (lineLoss(flow, len, 0) / (RHO * G)) * 1000;
    }
    pts.push([dist, p[2], hgl]);
    let k = p[3];
    if (i === nB - 1) k += open > 0.01 ? K_PORT / (open * open) : 0;
    hgl -= (lineLoss(flow, 0, k) / (RHO * G)) * 1000;
    if (i === nB - 1) {
      // past the port the common line starts from the junction's solved pressure (on BOTH both
      // branches set it; a closed port leaves its branch standing at its tank's head)
      if (open > 0.01) pts[pts.length - 1].push(hgl);
      hgl = SELECTOR.wl + (s.pj / (RHO * G)) * 1000;
    }
  }
  return { pts, surf, total: dist };
}
