// Truth first: a 125 cc air-cooled single, DOHC two-valve, and the gas inside it. Pure, no DOM.
// The geometry, the dimensions on the sheet, the readout and both diagrams read this.
//
// Crank angle phi runs 0..720 over one working cycle: 0 is the gas-exchange TDC (intake starts),
// 360 is the firing TDC. The crank turns clockwise in the section; the cams turn the same way at
// half its speed. The cycle is computed at RPM, wide-open throttle, as a single-zone model:
// mass and energy balance, compressible flow through each valve's curtain area (from the cam's
// lift), and a Wiebe heat release from the spark. Pressures are absolute, in bar.

// ---------------------------------------------------------------- crank train (mm)
export const BORE = 56.5;
export const STROKE = 49.5;
export const CRANK_R = STROKE / 2;
export const ROD = 98; // centre to centre
export const COMP_H = 27; // gudgeon pin centre to crown
export const DECK = 150.75; // top of liner and barrel, from the crank axis
export const GASKET = 0.8; // head gasket, compressed
export const HEAD_FACE = DECK + GASKET;
export const DOME_H = 8.2; // hemispherical chamber depth above the head face
export const AREA = (Math.PI / 4) * BORE ** 2; // mm²

const rad = Math.PI / 180;
export const crownAtTDC = CRANK_R + ROD + COMP_H;
export const pinV = (phi) => {
  const t = phi * rad;
  return CRANK_R * Math.cos(t) + Math.sqrt(ROD ** 2 - (CRANK_R * Math.sin(t)) ** 2);
};
export const crown = (phi) => pinV(phi) + COMP_H;
export const crankPin = (phi) => [CRANK_R * Math.sin(phi * rad), CRANK_R * Math.cos(phi * rad)];
export const rodAngle = (phi) => Math.asin((CRANK_R * Math.sin(phi * rad)) / ROD); // rad; + puts the big end right
export const travel = (phi) => crownAtTDC - crown(phi); // piston down from TDC, mm

// ---------------------------------------------------------------- chamber (mm, cm³)
const A_DOME = BORE / 2;
export const SPHERE_R = (A_DOME ** 2 + DOME_H ** 2) / (2 * DOME_H);
export const SPHERE_V = HEAD_FACE + DOME_H - SPHERE_R; // the dome's centre, on the cylinder axis
const capVolume = (Math.PI * DOME_H * (3 * A_DOME ** 2 + DOME_H ** 2)) / 6;
export const V_SWEPT = (AREA * STROKE) / 1000; // cm³
export const V_CLEAR = (AREA * (HEAD_FACE - crownAtTDC) + capVolume) / 1000;
export const CR = (V_SWEPT + V_CLEAR) / V_CLEAR;
export const volume = (phi) => V_CLEAR + (AREA * travel(phi)) / 1000; // cm³

// ---------------------------------------------------------------- valves and cams (mm, degrees)
// Both valves lie in the section plane, each tipped VALVE_ANGLE off the cylinder axis, their axes
// through the dome's centre. s is measured along a valve's axis from the dome centre, outward.
export const VALVE_ANGLE = 20;
export const STEM_R = 2.75;
export const TIP_S = 131.5; // valve tip, closed, both valves
export const RB = 16; // cam base circle radius
export const SHIM_T = 2.5;
export const CROWN_T = 3; // bucket crown
export const CAM_S = TIP_S + CROWN_T + SHIM_T + RB; // camshaft axis, along the valve axis
export const LIFT_MAX = 7.0; // cam lift
export const HALF = 66; // half the lobe's duration in cam degrees, base circle to base circle
const SHAPE = 0.7;

export const VALVES = {
  in: { side: -1, rv: 11, lash: 0.1, centre: 108, d: 22 },
  ex: { side: 1, rv: 9.25, lash: 0.15, centre: 608, d: 18.5 },
};
for (const v of Object.values(VALVES)) v.s0 = Math.sqrt(SPHERE_R ** 2 - v.rv ** 2);

// Lobe law: cam lift against cam angle from the nose, x = angle / HALF in −1..1.
// (1 − x²)²(1 + 0.7x²): a flat nose (its radius stays positive under a flat follower), gentle ramps.
export function camLift(camDeg) {
  const x = camDeg / HALF;
  if (Math.abs(x) >= 1) return 0;
  return LIFT_MAX * (1 - x * x) ** 2 * (1 + SHAPE * x * x);
}
const camLiftD = (camDeg) => (camLift(camDeg + 0.01) - camLift(camDeg - 0.01)) / 0.02 / rad; // mm per rad

// Cam angle from the nose at crank angle phi (cam turns at half speed), wrapped to −180..180.
export function camRel(key, phi) {
  const a = (phi - VALVES[key].centre) / 2;
  return ((((a + 180) % 360) + 360) % 360) - 180;
}
export const camLiftAt = (key, phi) => camLift(camRel(key, phi));
export const valveLift = (key, phi) => Math.max(0, camLiftAt(key, phi) - VALVES[key].lash);

// The cam outline under a flat follower: support h(ψ) = RB + L(ψ); the contact point is
// h·u(ψ) + h'·u'(ψ). Returned in the cam's own frame with the nose along +x, as [x, y] mm.
export function camProfile(n = 144) {
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

// Valve events, read off the cam: the crank angles where the cam lift passes the lash.
function events(key) {
  const v = VALVES[key];
  let lo = 0;
  let hi = HALF;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (camLift(m) > v.lash) lo = m;
    else hi = m;
  }
  return { open: v.centre - 2 * lo, close: v.centre + 2 * lo, duration: 4 * lo };
}
export const EVENTS = { in: events("in"), ex: events("ex") };
// IVO before TDC, IVC after BDC, EVO before BDC, EVC after TDC (crank degrees)
export const TIMING = {
  ivo: -EVENTS.in.open,
  ivc: EVENTS.in.close - 180,
  evo: 540 - EVENTS.ex.open,
  evc: EVENTS.ex.close - 720,
};

// ---------------------------------------------------------------- the gas
export const RPM = 6000;
export const SPARK = 335; // 25° before firing TDC
export const BURN = 55; // Wiebe duration, crank degrees
export const P_IN = 0.97; // bar, intake port at wide-open throttle
export const T_IN = 305; // K
export const P_EX = 1.08; // bar, exhaust port
export const T_EX = 820; // K, gas that flows back from the exhaust
export const AFR = 13.5; // rich of 14.7, for power
export const LHV = 43.4e6; // J/kg petrol
export const ETA = 0.8; // combustion, less the heat lost to the walls
export const RESIDUAL = 0.07; // burned gas left from the last cycle
const R = 287;
export const GAMMA = 1.32;
const CV = R / (GAMMA - 1);
const CP = CV + R;
const CD = 0.7;
export const THROAT = 0.89; // port throat diameter / valve diameter

export const wrap = (phi) => ((phi % 720) + 720) % 720;
const wiebe = (a) => (a <= 0 ? 0 : 1 - Math.exp(-5 * (a / BURN) ** 3));
export const burned = (phi) => wiebe(wrap(phi) - SPARK); // mass fraction burned, 0..1

// Mass flow (kg/s) from (p1, T1) to p2 through area A (m²); negative when it runs backwards.
function flow(A, p1, T1, p2, T2) {
  if (A <= 0) return 0;
  const fwd = p1 >= p2;
  const [pu, pd, Tu] = fwd ? [p1, p2, T1] : [p2, p1, T2];
  const crit = (2 / (GAMMA + 1)) ** (GAMMA / (GAMMA - 1));
  const pr = Math.max(pd / pu, crit);
  const psi = Math.sqrt(((2 * GAMMA) / (GAMMA - 1)) * (pr ** (2 / GAMMA) - pr ** ((GAMMA + 1) / GAMMA)));
  return ((fwd ? 1 : -1) * CD * A * pu * psi) / Math.sqrt(R * Tu);
}
// Curtain area of a poppet valve at a lift (m²), limited by its port throat.
export function valveArea(key, lift) {
  const v = VALVES[key];
  const curtain = Math.PI * (v.d - 1) * lift * Math.SQRT1_2;
  const throat = (Math.PI / 4) * ((THROAT * v.d) ** 2 - (2 * STEM_R) ** 2);
  return Math.min(curtain, throat) * 1e-6;
}

// Run the cycle until it repeats; returns a table at every crank degree 0..720.
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
        table[k / every] = { p: p / 1e5, V: V * 1e6, T, m: m * 1e6, xb: burned(phi), li: valveLift("in", phi), le: valveLift("ex", phi) };
      }
      if (k === Math.round(SPARK / step)) {
        trapped = m;
        qTotal = (m * (1 - RESIDUAL) * LHV * ETA) / (AFR + 1);
      }
      const V2 = volume(phi + step) * 1e-6;
      const dQ = qTotal * (wiebe(phi + step - SPARK) - wiebe(phi - SPARK));
      const mi = flow(valveArea("in", valveLift("in", phi)), P_IN * 1e5, T_IN, p, T) * dt; // into the cylinder
      const me = flow(valveArea("ex", valveLift("ex", phi)), p, T, P_EX * 1e5, T_EX) * dt; // out of it
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
  let tPeak = 0;
  for (let i = 1; i <= 720; i++) {
    work += ((table[i].p + table[i - 1].p) / 2) * 1e5 * (table[i].V - table[i - 1].V) * 1e-6;
    if (table[i].p > peak) [peak, peakAt] = [table[i].p, i];
    tPeak = Math.max(tPeak, table[i].T);
  }
  const imep = work / (V_SWEPT * 1e-6) / 1e5;
  const power = (work * rpm) / 120 / 1000;
  const qIn = trapped ? ((trapped * (1 - RESIDUAL) * LHV) / (AFR + 1)) : 1;
  return { table, work, imep, power, peak, peakAt, tPeak, trapped: trapped * 1e6, eff: work / qIn, rpm };
}

// The ideal Otto cycle at this compression ratio, for comparison: η = 1 − 1/CR^(γ−1).
export const ottoEfficiency = (gamma = 1.4) => 1 - 1 / CR ** (gamma - 1);

// Linear lookup in a cycle table at any crank angle.
export function at(tab, phi) {
  const f = wrap(phi);
  const i = Math.min(719, Math.floor(f));
  const a = tab[i];
  const b = tab[i + 1];
  const k = f - i;
  const out = {};
  for (const key of Object.keys(a)) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}

export const STROKES = ["INTAKE", "COMPRESSION", "POWER", "EXHAUST"];
export const strokeOf = (phi) => STROKES[Math.floor(wrap(phi) / 180) % 4];
