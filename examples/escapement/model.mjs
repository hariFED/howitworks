// Truth first: a Swiss lever escapement at 28 800 beats an hour. Pure, no imports, no DOM.
// The geometry, the live dimension, the readout and the chart all read this.
//
// Balance: a harmonic oscillator, I·θ'' = −k·θ − (I·ω0/Q)·θ' + τ_impulse. I comes from the rim and
// arms; the hairspring's active length is the one that gives k = I·ω0² for 4 Hz (the regulator sets
// it), k = E·b·h³ / (12·L).
// Escapement: the pallet fork follows the impulse jewel while the jewel is in the fork slot
// (|φ| < banking); the escape wheel, pushed by the train, sits wherever its teeth first touch a
// pallet stone. That one contact rule gives lock, draw, unlocking, impulse, drop and the next lock.
// The torque on the balance is the train's torque times dψ/dθ, the gear ratio of that contact.
//
// Plan coordinates, mm: u right, v up, origin at the pallet arbor P. Escape wheel centre E to the
// left, balance centre B to the right, all on the line of centres v = 0 (a straight-line lever).

const RAD = Math.PI / 180;

// ---------------------------------------------------------------- rate
export const BPH = 28800;
export const FREQ = BPH / 3600 / 2; // Hz: two beats per oscillation
export const PERIOD = 1 / FREQ; // s
export const OMEGA0 = 2 * Math.PI * FREQ;

// ---------------------------------------------------------------- balance, Glucydur (CuBe2), mm
export const RHO_BAL = 8.3; // mg/mm³
export const BAL = { ro: 4.5, ri: 4.0, h: 0.5, arms: 3, armW: 0.5, armH: 0.3, hub: 0.55 };
const rimMass = RHO_BAL * Math.PI * (BAL.ro ** 2 - BAL.ri ** 2) * BAL.h; // mg
const armMass = RHO_BAL * BAL.armW * BAL.armH * (BAL.ri - BAL.hub);
export const I_RIM = (rimMass * (BAL.ro ** 2 + BAL.ri ** 2)) / 2; // mg·mm²
export const I_ARMS = (BAL.arms * armMass * (BAL.ri ** 2 + BAL.ri * BAL.hub + BAL.hub ** 2)) / 3;
export const I_STAFF = 6; // staff, double roller, collet and inner coils, mg·mm² (estimated)
export const INERTIA = I_RIM + I_ARMS + I_STAFF; // mg·mm²
export const BAL_MASS = rimMass + BAL.arms * armMass; // mg
const I_SI = INERTIA * 1e-12; // kg·m²

// ---------------------------------------------------------------- hairspring, Nivarox 1
export const E_SPRING = 195e9; // Pa
export const HS = { b: 0.12, h: 0.034, r0: 0.62, r1: 3.15 }; // height, thickness, inner and outer radius, mm
export const K_SPRING = I_SI * OMEGA0 ** 2; // N·m/rad, the stiffness that gives 4 Hz
export const HS_LENGTH = (E_SPRING * (HS.b * 1e-3) * (HS.h * 1e-3) ** 3) / (12 * K_SPRING) * 1e3; // mm, active length
export const HS_TURNS = HS_LENGTH / (Math.PI * (HS.r0 + HS.r1));
export const periodOf = (inertiaMgMm2, kNmRad) => 2 * Math.PI * Math.sqrt((inertiaMgMm2 * 1e-12) / kNmRad);

// ---------------------------------------------------------------- train and losses
export const Q = 260; // quality factor of the free balance (air, pivots, hairspring)
export const M_BARREL = 8.4; // N·mm, mainspring torque at the barrel, half wound
export const TRAIN = [ // [wheel, pinion]: barrel → centre → third → fourth → escape
  [84, 10],
  [80, 10],
  [75, 10],
  [112, 7],
];
export const TRAIN_RATIO = TRAIN.reduce((r, [w, p]) => r * (w / p), 1); // escape turns per barrel turn
export const ETA_TRAIN = 0.92 ** TRAIN.length;
export const T_ESCAPE = ((M_BARREL * 1e-3) / TRAIN_RATIO) * ETA_TRAIN; // N·m on the escape wheel
export const ETA_FORK = 0.72; // friction at the pallet faces and the impulse jewel

// ---------------------------------------------------------------- escapement geometry, mm and degrees
export const TEETH = 15;
export const PITCH = 360 / TEETH; // 24°
// The wheel is drawn from a 2.7 mm design scaled by EWS; angles do not change with scale.
export const EWS = 2.35 / 2.7;
export const R_TIP = 2.7 * EWS; // escape wheel, locking circle radius (the locking corners)
export const R_ROOT = 2.04 * EWS;
export const R_RIM = 1.62 * EWS; // inner edge of the rim
export const EW_D = R_TIP / Math.cos(30 * RAD); // E to P: pallets embrace 2½ teeth, tangent at ±30°
export const E = [-EW_D, 0];
export const CLUB = 5.4; // tooth club (impulse face) length, degrees of the wheel
export const H_TOOTH = 0.09 * EWS; // rise of the club face from the locking corner to the heel
export const R_OUT = R_TIP + H_TOOTH; // outer circle, through the heels
export const ROOT_FRONT = 7.4; // the tooth's stem meets the root circle between these angles
export const ROOT_BACK = 10.4;
// Stones: width, and how much deeper the impulse face's exit corner sits than its locking corner.
// The exit stone works on the far side of its tangent point, so it needs a steeper face for the same lift.
export const ENTRY_W = 0.245 * EWS;
export const ENTRY_HP = 0.078 * EWS;
export const EXIT_W = 0.245 * EWS;
export const EXIT_HP = 0.13 * EWS;
export const STONE_L = 1.25 * EWS;
export const DRAW = 12; // locking faces lean 12° so the tooth pulls the stone in
export const BANK = 5; // fork angle at the bankings, ± degrees
export const UNLOCK = 3; // |φ| at which a stone's locking corner reaches the tip circle

// Balance, fork and impulse jewel: φ(±LIFT/2) = ∓BANK.
export const LIFT = 52; // balance lift angle, degrees
export const R_JEWEL = 0.8; // impulse jewel pitch radius on the roller
export const D_PB = R_JEWEL * Math.cos((LIFT / 2) * RAD) + (R_JEWEL * Math.sin((LIFT / 2) * RAD)) / Math.tan(BANK * RAD);
export const B = [D_PB, 0];
export const FORK_L = D_PB - R_JEWEL; // pallet arbor to the jewel at rest

// ---------------------------------------------------------------- small 2-D helpers
const rot = ([u, v], a, [cu, cv] = [0, 0]) => {
  const c = Math.cos(a * RAD);
  const s = Math.sin(a * RAD);
  const du = u - cu;
  const dv = v - cv;
  return [cu + du * c - dv * s, cv + du * s + dv * c];
};
export const rotate = (pts, a, c = [0, 0]) => pts.map((p) => rot(p, a, c));
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const polar = (c, r, a) => [c[0] + r * Math.cos(a * RAD), c[1] + r * Math.sin(a * RAD)];

// ---------------------------------------------------------------- pallet stones (pallet frame, φ = 0)
// Each stone is defined where its locking corner just meets the tip circle (φ = ±UNLOCK) and turned
// back to φ = 0. n: outward radial of the wheel at the tangent point, t: the teeth's direction there.
function stoneAt(polarDeg, sign, w, hp) {
  const T = polar(E, R_TIP, polarDeg);
  const n = [Math.cos(polarDeg * RAD), Math.sin(polarDeg * RAD)];
  const t = [Math.sin(polarDeg * RAD), -Math.cos(polarDeg * RAD)]; // clockwise wheel
  const f = add([n[0] * Math.cos(DRAW * RAD), n[1] * Math.cos(DRAW * RAD)], t, Math.sin(DRAW * RAD)); // along the locking face, outward
  const L = T;
  const X = add(add(T, t, w), n, -hp);
  const shape = [L, X, add(X, f, STONE_L), add(L, f, STONE_L - 0.02)];
  return rotate(shape, -sign * UNLOCK);
}
export const STONE_ENTRY = stoneAt(30, 1, ENTRY_W, ENTRY_HP); // locked when φ > +3°
export const STONE_EXIT = stoneAt(-30, -1, EXIT_W, EXIT_HP); // locked when φ < −3°

// ---------------------------------------------------------------- escape wheel tooth (wheel frame)
// Tooth 0 has its locking corner at polar angle 30° when ψ = 0. ψ turns the wheel clockwise.
export function toothLocal(k = 0) {
  const a = 30 + PITCH * k;
  const P = (r, da) => polar([0, 0], r, a + da);
  const Q = (r, da) => P(r * EWS, da); // design radii for the 2.7 mm wheel
  return [
    Q(2.04, ROOT_FRONT),
    Q(2.16, 5.8),
    Q(2.35, 3.6),
    Q(2.55, 1.3),
    Q(2.7, 0), // locking corner
    Q(2.7 + 0.09, CLUB), // heel (letting-off corner) on the outer circle
    Q(2.75, 6.4),
    Q(2.63, 6.3),
    Q(2.54, 4.4), // under the club
    Q(2.35, 6.2),
    Q(2.16, 8.4),
    Q(2.04, ROOT_BACK),
  ];
}
export const toothWorld = (k, psi) => rotate(toothLocal(k), -psi).map((p) => add(p, E));

// ---------------------------------------------------------------- contact solver
function segX(a, b, c, d) {
  const d1 = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d2 = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
  const d3 = (d[0] - c[0]) * (a[1] - c[1]) - (d[1] - c[1]) * (a[0] - c[0]);
  const d4 = (d[0] - c[0]) * (b[1] - c[1]) - (d[1] - c[1]) * (b[0] - c[0]);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
function inPoly([u, v], poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, vi] = poly[i];
    const [uj, vj] = poly[j];
    if (vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) hit = !hit;
  }
  return hit;
}
function overlap(A, Bp) {
  for (let i = 0; i < A.length; i++) {
    const a = A[i];
    const b = A[(i + 1) % A.length];
    for (let j = 0; j < Bp.length; j++) if (segX(a, b, Bp[j], Bp[(j + 1) % Bp.length])) return true;
  }
  return inPoly(A[0], Bp) || inPoly(Bp[0], A);
}

// Teeth that can reach the pallets: the wheel turns clockwise, so only those near ±30°.
function collides(phi, psi) {
  const stones = [rotate(STONE_ENTRY, phi), rotate(STONE_EXIT, phi)];
  for (let k = -3; k <= 2; k++) {
    const tooth = toothWorld(k, psi);
    for (const s of stones) if (overlap(tooth, s)) return true;
  }
  return false;
}

// The wheel's angle for fork angle φ: start behind the lock and turn until a tooth touches a stone.
function contact(phi, psiFrom) {
  let lo = psiFrom;
  let hi = psiFrom;
  const step = 0.4;
  for (let i = 0; i < 80; i++) {
    hi = lo + step;
    if (collides(phi, hi)) break;
    lo = hi;
  }
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (collides(phi, mid)) hi = mid;
    else lo = mid;
  }
  return lo;
}

// Tables of ψ(φ) for each locked side, s = +1 (entry stone locked, fork on the +BANK banking) and
// s = −1 (exit stone locked). ψ is in degrees, relative to the wheel's tooth count at the beat's start.
export const TABLE_N = 400;
export const phiAt = (i) => -BANK + (2 * BANK * i) / TABLE_N;
// Each table follows its beat from the locked banking across to the other one.
function buildTable(s, start) {
  const out = new Float64Array(TABLE_N + 1);
  let psi = start;
  const order = s > 0 ? [...Array(TABLE_N + 1).keys()].reverse() : [...Array(TABLE_N + 1).keys()];
  for (const i of order) {
    psi = contact(phiAt(i), psi - 0.6);
    out[i] = psi;
  }
  return out;
}
// The page receives these tables precomputed by the build (globalThis.ESC_TAB); node computes them.
const PRE = globalThis.ESC_TAB;
export const TAB_ENTRY = PRE ? Float64Array.from(PRE.entry) : buildTable(1, -3);
export const TAB_EXIT = PRE ? Float64Array.from(PRE.exit) : buildTable(-1, PITCH / 2 - 3);

// Where each beat drops: the first φ, moving away from the locked banking, where ψ jumps.
function dropOf(tab, s) {
  const idx = s > 0 ? [...Array(TABLE_N).keys()].reverse() : [...Array(TABLE_N).keys()];
  for (const i of idx) {
    const [a, b] = s > 0 ? [i + 1, i] : [i, i + 1];
    if (tab[b] - tab[a] > 0.4) return { phi: (phiAt(a) + phiAt(b)) / 2, before: tab[a], after: tab[b] };
  }
  return null;
}
export const DROP_ENTRY = dropOf(TAB_ENTRY, 1);
export const DROP_EXIT = dropOf(TAB_EXIT, -1);

export function psiOf(tab, phi) {
  const x = ((phi + BANK) / (2 * BANK)) * TABLE_N;
  const i = Math.max(0, Math.min(TABLE_N - 1, Math.floor(x)));
  const f = Math.max(0, Math.min(1, x - i));
  return tab[i] + (tab[i + 1] - tab[i]) * f;
}

// Fork angle from the balance angle (degrees): the jewel drives the fork while it is in the slot.
export function forkOf(theta) {
  const t = theta * RAD;
  const raw = Math.atan2(-R_JEWEL * Math.sin(t), D_PB - R_JEWEL * Math.cos(t)) / RAD;
  const inSlot = Math.abs(theta) < 90 && Math.abs(raw) < BANK;
  return { phi: Math.max(-BANK, Math.min(BANK, Math.abs(theta) >= 90 ? (theta > 0 ? -BANK : BANK) : raw)), inSlot };
}

// Energy budget: impulse wheel travel per beat, and the amplitude where it balances the losses.
export const PSI_LOCK_ENTRY = psiOf(TAB_ENTRY, BANK);
export const PSI_LOCK_EXIT = psiOf(TAB_EXIT, -BANK);
export const IMPULSE_PSI = DROP_ENTRY.before - Math.min(...TAB_ENTRY); // wheel degrees under impulse
export const DROP_PSI = DROP_ENTRY.after - DROP_ENTRY.before;
export const ENERGY_BEAT = ETA_FORK * T_ESCAPE * IMPULSE_PSI * RAD; // J per beat into the balance
// Loss per beat (half a period) is π·E/Q with E = ½kA².
export const AMP_STEADY = Math.sqrt((2 * Q * ENERGY_BEAT) / (Math.PI * K_SPRING)) / RAD; // degrees

// ---------------------------------------------------------------- the running escapement
export const I_WHEEL = 2.0e-13; // kg·m², escape wheel and pinion
export const DT = 1 / 9600; // s, integration step

export function start(amp = AMP_STEADY) {
  return {
    t: 0,
    th: amp, // balance angle, degrees (0: jewel on the line of centres)
    om: 0, // deg/s
    phi: BANK * (amp > 0 ? -1 : 1),
    side: amp > 0 ? -1 : 1, // which stone is locked
    base: 0, // wheel degrees completed before this beat
    psi: amp > 0 ? PSI_LOCK_EXIT : PSI_LOCK_ENTRY,
    psiDot: 0,
    beats: 0,
    stage: "locked",
    impulse: false,
    held: false,
    lastDrop: -1,
    amp: Math.abs(amp),
    peak: Math.abs(amp),
  };
}

const tabOf = (side) => (side > 0 ? TAB_ENTRY : TAB_EXIT);

// The wheel's contact angle at fork angle φ for the current beat, absolute degrees.
function wheelTarget(s, phi) {
  return s.base + psiOf(tabOf(s.side), phi);
}

// One integration step. hold: a balance angle the reader is holding (drag), or null.
export function step(s, dt = DT, hold = null) {
  const kDeg = OMEGA0 ** 2; // θ'' = −ω0²θ in any angle unit
  const damp = OMEGA0 / Q;
  const fork0 = forkOf(s.th);
  // torque from the escape wheel: τ = η·T·dψ/dθ, as angular acceleration in deg/s²
  const h = 0.05;
  const pA = forkOf(s.th - h).phi;
  const pB = forkOf(s.th + h).phi;
  const dpsi = (wheelTarget(s, pB) - wheelTarget(s, pA)) / (2 * h);
  const touching = s.psi >= wheelTarget(s, fork0.phi) - 0.02;
  const tq = touching && fork0.inSlot ? ETA_FORK * T_ESCAPE * dpsi : 0; // N·m
  const acc = -kDeg * s.th - damp * s.om + tq / I_SI / RAD;
  if (hold == null) {
    s.om += acc * dt;
    s.th += s.om * dt;
  } else {
    const next = hold;
    if (dt > 0) s.om = (next - s.th) / dt; // a zero step (the first frame) keeps the last rate
    s.th = next;
  }
  s.held = hold != null;
  // fork, then the wheel: it cannot pass the stones, and falls freely (drop) when they let it go
  const { phi, inSlot } = forkOf(s.th);
  s.phi = phi;
  let target = wheelTarget(s, phi);
  const drop = s.side > 0 ? DROP_ENTRY : DROP_EXIT;
  if ((s.side > 0 && phi < drop.phi) || (s.side < 0 && phi > drop.phi)) {
    // the stone has let the tooth go: the beat is done and the other stone takes the lock
    if (s.side < 0) s.base += PITCH;
    s.side = -s.side;
    s.beats++;
    s.lastDrop = s.t;
    target = wheelTarget(s, phi);
  }
  if (s.psi > target) {
    s.psi = target; // pushed back by the stone (draw, or a reversing balance)
    s.psiDot = 0;
  } else {
    const wAcc = (T_ESCAPE / I_WHEEL) / RAD; // deg/s²
    s.psiDot += wAcc * dt;
    s.psi += s.psiDot * dt;
    if (s.psi >= target) {
      s.psi = target;
      s.psiDot = 0;
    }
  }
  // stage, for the readout and the accent
  const u = s.side > 0 ? (BANK - phi) / (2 * BANK) : (BANK + phi) / (2 * BANK);
  const pitch = s.psi < target - 0.05;
  s.impulse = !pitch && inSlot && dpsi * Math.sign(s.om || 1) > 0.05 && u > 0.12;
  const away = s.side * s.om > 0; // the fork leaving the locked stone's banking
  s.stage = pitch ? "drop" : !inSlot ? "locked" : s.impulse ? "impulse" : u < 0.35 && away ? "unlocking" : "locking";
  // amplitude: the last turning point
  if (Math.sign(s.om) !== Math.sign(s.om - acc * dt) || (s.om === 0 && !s.held)) s.peak = Math.abs(s.th);
  s.t += dt;
  return s;
}

// Which tooth touches a stone now (for the accent), or -1.
export function toothInAction(s) {
  const psi = s.psi;
  const a0 = s.side > 0 ? 0 : -60; // corner polar angle relative to 30°: entry near 30°, exit near −30°
  const k = Math.round((psi + a0 - 6) / PITCH);
  return ((k % TEETH) + TEETH) % TEETH;
}
