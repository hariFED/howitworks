// Truth first: a generic four-seat, high-wing, single-engine light aircraft and how it holds itself up.
// Pure, no imports, no DOM. The general-arrangement sheet, the wing section, the lift diagram, the
// airspeed dial, the readout and the 3D cutaway all read this file.
//
// Frames (mm). FS: fuselage station, aft of the datum (the firewall's front face). WL: water line,
// height above the ground at rest. BL: butt line, from the centreline, + to starboard. WS: wing
// station, from the centreline along the span. The 3D scene uses x = −FS (forward), y = WL, z = BL.
//
// Flight model: steady, level, coordinated flight at sea level (ISA, ρ = 1.225 kg/m³), CAS = TAS.
//   Lift must equal n·W, n = 1/cos φ in a level turn at bank φ.
//   L = ½ ρ V² S C_L, so the C_L the wing must make is n·W / (q S); the angle of attack follows from it.
//   The wing stalls when that C_L passes C_L,max, which depends on the flap. C_L,max is not guessed:
//   it is worked back from the class's published stall speeds at maximum weight.
//   Pitch trim: C_m = C_m0 + C_mα α + C_mδe δe = 0 gives the elevator needed for that α.
//   Roll: steady roll rate p = −(C_lδa / C_lp) δa (2V / b); the rudder cancels aileron adverse yaw,
//   δr = −(C_nδa / C_nδr) δa. Derivatives are typical published values for this class of aeroplane.

export const G = 9.80665;
export const RHO = 1.225; // kg/m³, ISA sea level
export const KT = 0.514444; // m/s per knot

// ---------------------------------------------------------------- principal dimensions (mm)
export const SPAN = 11000;
export const LENGTH = 8280;
export const HEIGHT = 2720;
export const MTOW = 1100; // kg
export const W = MTOW * G; // N

// ---------------------------------------------------------------- wing: constant-chord inner panel, tapered outer
export const ROOT_CHORD = 1626;
export const TIP_CHORD = 1066;
export const BREAK_WS = 2500; // where the taper starts
export const TIP_WS = SPAN / 2;
export const LE_FS = 660; // the inner panel's leading edge
export const TE_FS = LE_FS + ROOT_CHORD; // the trailing edge is straight from root to tip
export const INCIDENCE = 1.5; // deg, chord line to the fuselage reference line, nose up
export const DIHEDRAL = 1.73; // deg
export const HINGE_X = 0.72; // flap and aileron hinge line (rear spar), fraction of the root chord
export const HINGE_FS = LE_FS + HINGE_X * ROOT_CHORD;
export const FLAP_WS = [600, 3280];
export const AILERON_WS = [3300, 5480];
export const SPAR_X = 0.22; // front spar, fraction of chord
export const chordAt = (ws) => (ws <= BREAK_WS ? ROOT_CHORD : ROOT_CHORD - ((ws - BREAK_WS) * (ROOT_CHORD - TIP_CHORD)) / (TIP_WS - BREAK_WS));
export const leAt = (ws) => TE_FS - chordAt(ws);
export const dihedralRise = (ws) => ws * Math.tan((DIHEDRAL * Math.PI) / 180);

// Wing area, mean aerodynamic chord and its leading edge, integrated from the plan (both wings).
function integrate(f, a, b, n = 400) {
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + ((i + 0.5) * (b - a)) / n);
  return (s * (b - a)) / n;
}
export const AREA_MM2 = 2 * integrate(chordAt, 0, TIP_WS);
export const S = AREA_MM2 / 1e6; // m²
export const MAC = (2 * integrate((y) => chordAt(y) ** 2, 0, TIP_WS)) / AREA_MM2;
export const LEMAC = (2 * integrate((y) => chordAt(y) * leAt(y), 0, TIP_WS)) / AREA_MM2;
export const AR = (SPAN / 1000) ** 2 / S;

// Centre of gravity limits at maximum weight (published class figures), FS mm.
export const CG_FWD = 1041;
export const CG_AFT = 1201;
export const pctMAC = (fs) => (100 * (fs - LEMAC)) / MAC;
export const CG_TOUR = 1120; // the loading the readout assumes

// ---------------------------------------------------------------- the rest of the arrangement (mm)
export const THRUST_WL = 1250; // propeller shaft
export const PROP_D = 1905; // two-blade fixed pitch
export const PROP_FS = -930;
export const SPINNER = { tip: -1060, base: -880, r: 170 };
export const FIN_TOP = HEIGHT;
export const TAIL_TE_FS = LENGTH + SPINNER.tip; // the rudder's trailing edge
export const TAILPLANE = { span: 3450, wl: 1400, le: 6100, hinge: 6820, te: 7180, tipLe: 6300, tipTe: 7120 };
export const RUDDER_HINGE_FS = 6500;
export const MAIN_GEAR = { fs: 1470, track: 2540, tyreD: 445, tyreW: 152 }; // 6.00-6 tyres
export const NOSE_GEAR = { fs: -180, tyreD: 360, tyreW: 127 }; // 5.00-5 tyre
export const WHEELBASE = MAIN_GEAR.fs - NOSE_GEAR.fs;

// Fuselage. Cowling: a body of revolution on the thrust line, an elliptic nose. Cabin: a constant
// rounded-box section. Tail cone: a body of revolution on its own axis, starting at the cabin's height.
export const COWL = { axis: THRUST_WL, front: -880, r0: 330, r1: 520 };
export const CABIN = { fs0: 0, fs1: 2450, half: 590, floor: 730, roof: 1990, rBottom: 200, rTop: 60, sill: 1420, winTop: 1930 };
export const TAILCONE = { axis: 1360, fs0: 2450, fs1: 6700, r0: 630, r1: 110 };
export const WINDSCREEN = { base: [0, 1770], top: [650, 1990] };
export const cowlR = (fs) => COWL.r0 + (COWL.r1 - COWL.r0) * Math.sqrt(Math.max(0, 1 - (Math.min(0, fs) / COWL.front) ** 2));
export const coneR = (fs) => TAILCONE.r1 + (TAILCONE.r0 - TAILCONE.r1) * (1 - Math.min(1, Math.max(0, (fs - TAILCONE.fs0) / (TAILCONE.fs1 - TAILCONE.fs0)))) ** 1.25;
const sample = (f, a, b, n) => Array.from({ length: n + 1 }, (_, i) => { const x = a + ((b - a) * i) / n; return [x, f(x)]; });
export const COWL_PTS = sample(cowlR, COWL.front, 0, 12); // [FS, r]
export const CONE_PTS = sample(coneR, TAILCONE.fs0, TAILCONE.fs1, 14);
export function lerpTable(tab, x) {
  if (x <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    if (x <= tab[i][0]) {
      const [x0, y0] = tab[i - 1];
      const [x1, y1] = tab[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return tab[tab.length - 1][1];
}

// Engine: flat-four, air cooled, 5.2 L, 120 kW at 2700 rpm.
export const ENGINE = { litres: 5.2, kW: 120, rpm: 2700, bore: 130.2, stroke: 98.4 };
export const FUEL_L = 106; // each wing tank, litres

// ---------------------------------------------------------------- the aerofoil: NACA 2412
// 2 % camber at 40 % chord, 12 % thick; the standard four-digit formulae, closed trailing edge.
export function naca2412(n = 36) {
  const m = 0.02;
  const p = 0.4;
  const t = 0.12;
  const upper = [];
  const lower = [];
  for (let i = 0; i <= n; i++) {
    const x = 0.5 - 0.5 * Math.cos((Math.PI * i) / n);
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    const yc = x < p ? (m / p ** 2) * (2 * p * x - x * x) : (m / (1 - p) ** 2) * (1 - 2 * p + 2 * p * x - x * x);
    const dy = x < p ? ((2 * m) / p ** 2) * (p - x) : ((2 * m) / (1 - p) ** 2) * (p - x);
    const th = Math.atan(dy);
    upper.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]);
    lower.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
  }
  return { upper, lower };
}
// One surface's height (chord fractions) at x, by interpolation.
export function surfaceAt(pts, x) {
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][0] >= x) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / Math.max(1e-9, x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}

// Wing section frame: chordwise ξ and normal η (both in chord fractions) to FS and WL, with the
// incidence turning the chord nose-up about the leading edge. WL_LE puts the section's lowest point
// on the cabin roof at the root.
const inc = (INCIDENCE * Math.PI) / 180;
export const toWing = ([xi, eta], c = ROOT_CHORD, le = LE_FS, wlLe = WL_LE) => [le + c * (xi * Math.cos(inc) + eta * Math.sin(inc)), wlLe + c * (eta * Math.cos(inc) - xi * Math.sin(inc))];
const AF = naca2412();
const lowest = Math.min(...AF.lower.map(([x, y]) => y * Math.cos(inc) - x * Math.sin(inc)));
export const WL_LE = CABIN.roof - ROOT_CHORD * lowest + 4;

// The flap runs on curved tracks: modelled as a turn about a point below and ahead of its nose, so
// the nose moves aft and down and a slot opens behind the wing (single-slotted flap).
export const FLAP_PIVOT = [0.62, -0.15]; // ξ, η in root chords
export const FLAP_STOPS = [0, 10, 20, 30];
export const FLAP_RATE = 3.4; // deg/s, electric motor and jackscrew: 0–30° in about 9 s (wing-flaps works it out: 8.9 s)
export const ELEVATOR_LIMITS = [-28, 23]; // deg, TE up negative
export const AILERON_LIMITS = [20, 15]; // deg up, down (differential)
export const RUDDER_LIMIT = 17;

// ---------------------------------------------------------------- aerodynamics
// Published class stall speeds at MTOW, power off, knots CAS (20° interpolated between 10° and 30°).
export const VS_PUBLISHED = { 0: 53, 10: 51, 20: 49.5, 30: 48 };
const clmaxFromVs = (vs) => (2 * W) / (RHO * (vs * KT) ** 2 * S);
export const CLMAX = Object.fromEntries(FLAP_STOPS.map((f) => [f, clmaxFromVs(VS_PUBLISHED[f])]));
// Lift added by the slotted flap at a given angle of attack, estimated for this flap size.
export const DCL_FLAP = { 0: 0, 10: 0.25, 20: 0.45, 30: 0.6 };
const byFlap = (tab, f) => lerpTable(FLAP_STOPS.map((s) => [s, tab[s]]), f);
export const clmax = (f) => byFlap(CLMAX, f);
export const dclFlap = (f) => byFlap(DCL_FLAP, f);

// Typical class derivatives, per radian, α measured from the fuselage reference line.
export const D = { CL0: 0.307, CLa: 4.41, CLde: 0.43, Cm0: 0.04, Cma: -0.613, Cmde: -1.122, Clda: 0.229, Clp: -0.484, Cnda: -0.0216, Cndr: -0.0645 };
export const POST_STALL = 0.82; // C_L falls to this share of C_L,max once the wing has stalled
export const V_SPEEDS = { vfe: 85, vno: 129, vne: 163 }; // knots, flap limit, structural cruise, never exceed

export const q = (vkt) => 0.5 * RHO * (vkt * KT) ** 2; // Pa
export const liftMax = (vkt, f) => q(vkt) * S * clmax(f); // N
export const stallSpeed = (f, n = 1) => Math.sqrt((2 * n * W) / (RHO * S * clmax(f))) / KT; // kt
export const loadFactor = (phiDeg) => 1 / Math.cos((Math.min(75, Math.abs(phiDeg)) * Math.PI) / 180);
const DEN = D.CLa - (D.CLde * D.Cma) / D.Cmde;
const CL_TRIM0 = D.CL0 - (D.CLde * D.Cm0) / D.Cmde;
const alphaFor = (cl, f) => (cl - CL_TRIM0 - dclFlap(f)) / DEN; // rad
const elevatorFor = (a) => -(D.Cm0 + D.Cma * a) / D.Cmde; // rad, TE down positive

// The state of the aeroplane at airspeed V (kt), flap f (deg) and bank φ (deg).
export function flight(vkt, f, phiDeg) {
  const n = loadFactor(phiDeg);
  const qS = q(vkt) * S;
  const clReq = (n * W) / qS;
  const cmax = clmax(f);
  const stalled = clReq > cmax;
  const cl = stalled ? cmax * POST_STALL : clReq;
  const alpha = stalled ? alphaFor(cmax, f) + (3 * Math.PI) / 180 : alphaFor(clReq, f);
  let de = stalled ? (ELEVATOR_LIMITS[0] * Math.PI) / 180 : elevatorFor(alpha);
  de = Math.min((ELEVATOR_LIMITS[1] * Math.PI) / 180, Math.max((ELEVATOR_LIMITS[0] * Math.PI) / 180, de));
  const deg = 180 / Math.PI;
  return {
    v: vkt,
    flap: f,
    phi: phiDeg,
    n,
    q: q(vkt),
    clReq,
    clmax: cmax,
    cl,
    lift: qS * cl, // N
    need: n * W, // N
    stalled,
    alpha: alpha * deg, // body angle of attack
    alphaWing: alpha * deg + INCIDENCE,
    elevator: de * deg,
    vs: stallSpeed(f, n),
    margin: vkt / stallSpeed(f, n),
  };
}

// Roll: the aileron a simple attitude-hold pilot would use to reach bank φt, and the roll rate it gives.
export const rollGain = (vkt) => (-D.Clda / D.Clp) * ((2 * vkt * KT) / (SPAN / 1000)); // rad/s per rad of aileron
export function aileronFor(phi, phiTarget, vkt) {
  const pWant = Math.max(-0.6, Math.min(0.6, 1.4 * ((phiTarget - phi) * Math.PI) / 180)); // rad/s
  const da = pWant / Math.max(1e-3, rollGain(vkt)); // rad
  return Math.max(-15, Math.min(15, (da * 180) / Math.PI)); // deg, + rolls right
}
export const rollRate = (daDeg, vkt) => rollGain(vkt) * daDeg; // deg/s for δa in deg (rad/s per rad)
// Rolling right, the port aileron goes down and its extra drag yaws the nose left (adverse yaw); right
// rudder (+: trailing edge to starboard, nose right) of |C_nδa / C_nδr| times the aileron cancels it.
export const rudderFor = (daDeg) => Math.abs(D.Cnda / D.Cndr) * daDeg;
// The two ailerons for a mean deflection δa (+ rolls right): the up-going one takes the full angle,
// the down-going one 3/4 of it (differential ailerons reduce adverse yaw). Returns TE down positive.
export function ailerons(daDeg) {
  const up = (a) => -Math.min(AILERON_LIMITS[0], a);
  const down = (a) => Math.min(AILERON_LIMITS[1], 0.75 * a);
  return daDeg >= 0 ? { stbd: up(daDeg), port: down(daDeg) } : { stbd: down(-daDeg), port: up(-daDeg) };
}

// ---------------------------------------------------------------- the tour
// Cruise, slow down, flaps out, slow into the stall, recover, a 60° turn, back to cruise.
export const TOUR = [
  // t (s), V (kt), flap (deg), bank (deg)
  [0, 110, 0, 0],
  [2, 110, 0, 0],
  [7, 62, 0, 0],
  [8, 62, 30, 0],
  [14.5, 52, 30, 0],
  [16.5, 45, 30, 0],
  [18, 45, 30, 0],
  [20.5, 75, 0, 0],
  [24, 92, 0, 0],
  [25, 92, 0, 60],
  [29.5, 92, 0, 60],
  [30.5, 92, 0, 0],
  [34, 110, 0, 0],
];
export const TOUR_PERIOD = 34;
export function tourAt(t) {
  const tt = ((t % TOUR_PERIOD) + TOUR_PERIOD) % TOUR_PERIOD;
  let i = 1;
  while (i < TOUR.length - 1 && TOUR[i][0] <= tt) i++;
  const a = TOUR[i - 1];
  const b = TOUR[i];
  const k = Math.min(1, Math.max(0, (tt - a[0]) / Math.max(1e-6, b[0] - a[0])));
  const e = 0.5 - 0.5 * Math.cos(Math.PI * k);
  // the flap is commanded to its stop at once (the motor sets the rate); bank and speed ease
  return { v: a[1] + (b[1] - a[1]) * e, flap: b[2] !== a[2] ? b[2] : a[2], bank: a[3] + (b[3] - a[3]) * e };
}
