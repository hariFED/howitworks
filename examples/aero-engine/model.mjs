// Truth first: the flat-four, air-cooled, direct-drive engine of a four-seat light aircraft
// (class figures: 5.24 L, 120 kW / 160 hp at 2,700 rpm, bore 130.2, stroke 98.4, CR 8.5, firing
// order 1-3-2-4, two magnetos, two plugs a cylinder, updraft carburettor, wet sump). Pure, no DOM.
// The geometry, the dimensions on the sheet, the readout and both diagrams read this.
//
// Frame: u across the engine (+ = right bank, cylinders 1 and 3), v along the crank (+ = forward,
// the propeller), the crank axis on v, its centre main bearing at v = 0. z is up.
//
// Crank angle phi runs 0..720 over one working cycle: at 0 cylinder 1 is at its gas-exchange TDC,
// at 360 at its firing TDC. Each cylinder runs the same cycle, offset by the firing order:
// 1 at 0, 3 at 180, 2 at 360, 4 at 540 (one power stroke every half turn). The crank turns
// clockwise seen from the rear, at RPM. Single-zone cycle per cylinder: mass and energy balance,
// compressible flow through each valve's curtain area (from the cam lift), Wiebe heat release from
// the sparks. Pressures absolute, bar.

const rad = Math.PI / 180;

// ---------------------------------------------------------------- crank train (mm)
export const BORE = 130.2; // 5.125 in
export const STROKE = 98.4; // 3.875 in
export const CRANK_R = STROKE / 2;
export const ROD = 175; // centre to centre
export const COMP_H = 48; // gudgeon pin centre to crown
export const AREA = (Math.PI / 4) * BORE ** 2; // mm²
export const CYLS = 4;
export const V_SWEPT = (AREA * STROKE) / 1000; // cm³ per cylinder
export const DISPLACEMENT = (CYLS * V_SWEPT) / 1000; // litres
export const CR_SPEC = 8.5;

export const crownAtTDC = CRANK_R + ROD + COMP_H; // from the crank axis, along the cylinder
export const DECK = crownAtTDC + 1.5; // barrel top = head face
export const HEAD_FACE = DECK;

// Cylinder k (1..4): its bank (side, +1 right), its axis station on v, its throw and its offset in
// the cycle. Throws: 1 and 4 at one angle, 2 and 3 opposite, so each opposed pair (1-2, 3-4) moves
// out and in together: the pistons box against each other and their shaking forces cancel.
export const THROW_V = { 1: 127.5, 2: 72.5, 3: -72.5, 4: -127.5 };
export const CYL = {
  1: { side: 1, v: THROW_V[1], offset: 0 },
  2: { side: -1, v: THROW_V[2], offset: 360 },
  3: { side: 1, v: THROW_V[3], offset: 180 },
  4: { side: -1, v: THROW_V[4], offset: 540 },
};
export const FIRING = [1, 3, 2, 4];
export const IDS = [1, 2, 3, 4];

export const wrap = (phi) => ((phi % 720) + 720) % 720;
export const local = (k, phi) => wrap(phi - CYL[k].offset); // cylinder k's own cycle angle
// gudgeon pin distance from the crank axis, along the cylinder, at a cylinder's own angle
export const pinA = (psi) => {
  const t = psi * rad;
  return CRANK_R * Math.cos(t) + Math.sqrt(ROD ** 2 - (CRANK_R * Math.sin(t)) ** 2);
};
export const crown = (psi) => pinA(psi) + COMP_H;
export const travel = (psi) => crownAtTDC - crown(psi);
// crankpin of cylinder k at crank angle phi, as [u, z] (seen from the rear: clockwise)
export function crankPin(k, phi) {
  const s = CYL[k].side;
  const t = local(k, phi) * rad;
  return [s * CRANK_R * Math.cos(t), -s * CRANK_R * Math.sin(t)];
}
// the rod's lean in its own cylinder's frame (rad): + puts the big end on the -z side for the right bank
export const rodAngle = (psi) => Math.asin((CRANK_R * Math.sin(psi * rad)) / ROD);

// ---------------------------------------------------------------- chamber: a spherical cap in the head
export const CLEAR_GAP = DECK - crownAtTDC; // crown to head face at TDC
const A_DOME = BORE / 2;
const capVol = (h) => (Math.PI * h * (3 * A_DOME ** 2 + h ** 2)) / 6;
const wantClear = (V_SWEPT * 1000) / (CR_SPEC - 1); // mm³
function solveDome() {
  let lo = 1;
  let hi = 60;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (AREA * CLEAR_GAP + capVol(m) < wantClear) lo = m;
    else hi = m;
  }
  return Math.round(((lo + hi) / 2) * 100) / 100;
}
export const DOME_H = solveDome();
export const SPHERE_R = (A_DOME ** 2 + DOME_H ** 2) / (2 * DOME_H);
export const SPHERE_A = HEAD_FACE + DOME_H - SPHERE_R; // the dome's centre on the cylinder axis
export const V_CLEAR = (AREA * CLEAR_GAP + capVol(DOME_H)) / 1000; // cm³
export const CR = (V_SWEPT + V_CLEAR) / V_CLEAR;
export const volume = (psi) => V_CLEAR + (AREA * travel(psi)) / 1000; // cm³

// ---------------------------------------------------------------- valves, cam and tappets
// Two valves a cylinder, pushrod-operated from one camshaft above the crank, through hydraulic
// tappets (zero lash: the tappet's oil-filled plunger takes up the clearance) and rockers.
export const ROCKER_RATIO = 1.45;
export const CAM_LIFT = 7.9; // lobe lift, mm
export const LIFT_MAX = CAM_LIFT * ROCKER_RATIO; // at the valve, ≈ 11.5 mm
export const HALF = 64; // half the lobe's duration in cam degrees
const SHAPE = 0.7;
export const VALVES = {
  in: { centre: 110, d: 49 }, // inlet ≈ 1.94 in head
  ex: { centre: 610, d: 41 }, // exhaust ≈ 1.6 in head
};
export const STEM_R = 5.55; // Ø 11.1 (7/16 in) stems
export function camLift(camDeg) {
  const x = camDeg / HALF;
  if (Math.abs(x) >= 1) return 0;
  return CAM_LIFT * (1 - x * x) ** 2 * (1 + SHAPE * x * x);
}
export function camRel(key, psi) {
  const a = (psi - VALVES[key].centre) / 2;
  return ((((a + 180) % 360) + 360) % 360) - 180;
}
export const RB = 19; // cam base circle radius
const camLiftD = (camDeg) => (camLift(camDeg + 0.01) - camLift(camDeg - 0.01)) / 0.02 / rad;
// The lobe's outline under a flat-faced tappet (support h = RB + L(ψ)), nose along +x, as [x, y] mm.
export function camProfile(n = 120) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const psi = -180 + (360 * i) / n;
    const h = RB + camLift(psi);
    const hd = camLiftD(psi);
    const c = Math.cos(psi * rad);
    const s = Math.sin(psi * rad);
    out.push([h * c - hd * s, h * s + hd * c]);
  }
  return out;
}
export const tappetLift = (key, psi) => valveLift(key, psi) / ROCKER_RATIO; // at the tappet and pushrod
const RAMP = 0.02; // the lobe's lift where the valve leaves its seat, mm (a hydraulic tappet has no lash)
export const valveLift = (key, psi) => Math.max(0, camLift(camRel(key, psi)) - RAMP) * ROCKER_RATIO;
function events(key) {
  let lo = 0;
  let hi = HALF;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (camLift(m) > RAMP) lo = m;
    else hi = m;
  }
  return { open: VALVES[key].centre - 2 * lo, close: VALVES[key].centre + 2 * lo, duration: 4 * lo };
}
export const EVENTS = { in: events("in"), ex: events("ex") };
export const TIMING = {
  ivo: -EVENTS.in.open,
  ivc: EVENTS.in.close - 180,
  evo: 540 - EVENTS.ex.open,
  evc: EVENTS.ex.close - 720,
};

// ---------------------------------------------------------------- the gas
export const RPM = 2700;
export const SPARK = 335; // 25° before firing TDC, both plugs together
export const BURN = 62; // Wiebe duration, crank degrees (two flames from two plugs)
export const P_IN = 0.99; // bar, intake port at full throttle, sea level (less the carburettor venturi's loss)
export const T_IN = 300; // K: the fuel's evaporation cools the charge; the riser in the warm sump takes some back
export const P_EX = 1.06;
export const T_EX = 900;
export const AFR = 12.0; // rich at full power: the extra fuel cools the cylinder
export const LHV = 43.5e6; // J/kg, aviation gasoline
export const ETA = 0.84; // burned fraction of the fuel's energy, less the heat lost to the fins
export const RESIDUAL = 0.05;
const R = 287;
export const GAMMA = 1.32;
const CV = R / (GAMMA - 1);
const CP = CV + R;
const CD = 0.7;
export const THROAT = 0.88;

const wiebe = (a) => (a <= 0 ? 0 : 1 - Math.exp(-5 * (a / BURN) ** 3));
export const burned = (psi) => wiebe(wrap(psi) - SPARK);

function flow(A, p1, T1, p2, T2) {
  if (A <= 0) return 0;
  const fwd = p1 >= p2;
  const [pu, pd, Tu] = fwd ? [p1, p2, T1] : [p2, p1, T2];
  const crit = (2 / (GAMMA + 1)) ** (GAMMA / (GAMMA - 1));
  const pr = Math.max(pd / pu, crit);
  const psi = Math.sqrt(((2 * GAMMA) / (GAMMA - 1)) * (pr ** (2 / GAMMA) - pr ** ((GAMMA + 1) / GAMMA)));
  return ((fwd ? 1 : -1) * CD * A * pu * psi) / Math.sqrt(R * Tu);
}
export function valveArea(key, lift) {
  const d = VALVES[key].d;
  const curtain = Math.PI * (d - 1.5) * lift * Math.SQRT1_2;
  const throat = (Math.PI / 4) * ((THROAT * d) ** 2 - (2 * STEM_R) ** 2);
  return Math.min(curtain, throat) * 1e-6;
}

// Friction mean effective pressure, bar (Chen–Flynn form: rubbing, pumping the oil, driving the
// accessories): rises with mean piston speed.
export const fmep = (rpm, peak) => {
  const sp = (2 * STROKE * rpm) / 60 / 1000; // m/s
  return 0.137 + 0.005 * peak + 0.162 * sp + 0.0081 * sp * sp;
};

// One cylinder's cycle, run until it repeats; a table at every degree of its own angle 0..720.
export function cycle({ rpm = RPM, step = 0.05, cycles = 3 } = {}) {
  let p = P_EX * 1e5;
  let T = 900;
  let V = volume(0) * 1e-6;
  let m = (p * V) / (R * T);
  let qTotal = 0;
  let trapped = 0;
  const dt = step / (6 * rpm);
  const n = Math.round(720 / step);
  const every = Math.round(1 / step);
  const table = [];
  for (let c = 0; c < cycles; c++) {
    const last = c === cycles - 1;
    for (let k = 0; k < n; k++) {
      const phi = k * step;
      if (last && k % every === 0) {
        table[k / every] = { p: p / 1e5, V: V * 1e6, T, xb: burned(phi), li: valveLift("in", phi), le: valveLift("ex", phi) };
      }
      if (k === Math.round(SPARK / step)) {
        trapped = m;
        qTotal = (m * (1 - RESIDUAL) * LHV * ETA) / (AFR + 1);
      }
      const V2 = volume(phi + step) * 1e-6;
      const dQ = qTotal * (wiebe(phi + step - SPARK) - wiebe(phi - SPARK));
      const mi = flow(valveArea("in", valveLift("in", phi)), P_IN * 1e5, T_IN, p, T) * dt;
      const me = flow(valveArea("ex", valveLift("ex", phi)), p, T, P_EX * 1e5, T_EX) * dt;
      const U = m * CV * T + dQ - p * (V2 - V) + mi * CP * (mi >= 0 ? T_IN : T) - me * CP * (me >= 0 ? T : T_EX);
      m += mi - me;
      V = V2;
      T = U / (m * CV);
      p = (m * R * T) / V;
    }
  }
  table[720] = { ...table[0] };
  let work = 0;
  let peak = 0;
  let peakAt = 0;
  for (let i = 1; i <= 720; i++) {
    work += ((table[i].p + table[i - 1].p) / 2) * 1e5 * (table[i].V - table[i - 1].V) * 1e-6;
    if (table[i].p > peak) [peak, peakAt] = [table[i].p, i];
  }
  // gas torque on the crank from this cylinder at each degree of its own angle, N·m
  for (let i = 0; i <= 720; i++) table[i].tq = gasTorque(table[i].p, i);
  const imep = work / (V_SWEPT * 1e-6) / 1e5;
  const f = fmep(rpm, peak);
  const bmep = imep - f;
  const vd = DISPLACEMENT * 1e-3; // m³
  const torque = (bmep * 1e5 * vd) / (4 * Math.PI); // brake, N·m
  const power = (torque * 2 * Math.PI * rpm) / 60 / 1000; // kW
  const indicated = (CYLS * work * rpm) / 120 / 1000;
  const mixture = (trapped * (1 - RESIDUAL)) / (1 + 1 / AFR) / AFR; // fuel per cylinder per cycle, kg
  const fuel = (mixture * CYLS * rpm) / 120; // kg/s
  return { table, work, imep, fmep: f, bmep, torque, power, indicated, peak, peakAt, rpm, fuelLph: (fuel * 3600) / 0.72, bsfc: (fuel * 3.6e9) / (power * 1000) };
}

// Torque on the crank from a cylinder's gas at its own angle psi (N·m): the force on the crown
// times the crank's lever, which the rod's lean lengthens or shortens.
export function gasTorque(p, psi) {
  const t = psi * rad;
  const s = Math.sin(t);
  const c = Math.cos(t);
  const F = (p - 1.0) * 1e5 * AREA * 1e-6; // N, crankcase at 1 bar
  const lever = CRANK_R * 1e-3 * s * (1 + (CRANK_R * c) / Math.sqrt(ROD ** 2 - (CRANK_R * s) ** 2));
  return F * lever;
}

export function at(tab, psi) {
  const f = wrap(psi);
  const i = Math.min(719, Math.floor(f));
  const a = tab[i];
  const b = tab[i + 1];
  const k = f - i;
  const out = {};
  for (const key of Object.keys(a)) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}

// The four cylinders at crank angle phi, from one cylinder's table.
export function engine(tab, phi) {
  const cyl = {};
  let total = 0;
  for (const k of IDS) {
    const psi = local(k, phi);
    const s = at(tab, psi);
    cyl[k] = { psi, ...s, stroke: strokeOf(psi) };
    total += s.tq;
  }
  return { cyl, total };
}

// Full-throttle power across the rpm range, and a fixed-pitch propeller's demand (P ∝ n³), sized
// to absorb the engine's full-throttle power at rated speed in level flight: where they cross is
// where the engine runs.
export const RPM_RANGE = [1500, 1800, 2100, 2400, 2700, 3000];
export function powerCurve() {
  return RPM_RANGE.map((rpm) => {
    const c = cycle({ rpm, step: 0.1, cycles: 2 });
    return { rpm, power: c.power, torque: c.torque };
  });
}
export const propPower = (rpm, rated) => rated * (rpm / RPM) ** 3;

export const STROKES = ["INTAKE", "COMPRESSION", "POWER", "EXHAUST"];
export const strokeOf = (psi) => STROKES[Math.floor(wrap(psi) / 180) % 4];
