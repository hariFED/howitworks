// Truth first: an ISO 2858 end-suction pump, size 50-32-160, and the pipe it feeds.
// Pure, no imports, no DOM. The sheet, the chart, the readout and the water all read this.
//
// Pump. The characteristic at the rated speed n0 is a fitted quadratic in Q (m³/h):
//   H0(Q) = A + B·Q − C·Q²            head, m
//   P0(Q) = P_A + P_B·Q − P_C·Q²       shaft power, kW
// At any other speed n the affinity laws carry each point along a parabola through the origin:
//   Q ∝ n, H ∝ n², P ∝ n³, so H(Q, n) = r²·H0(Q/r), P(Q, n) = r³·P0(Q/r) with r = n/n0,
// and efficiency η = ρ·g·Q·H / P is unchanged along that parabola.
//
// System. The pump lifts water through a static head and pushes it through pipe friction and a
// globe valve: H_sys = H_STATIC + K_PIPE·Q² + Δh_valve, with the valve loss from its flow
// coefficient, Δp = (Q/Kv)² bar (Q in m³/h), Kv rising linearly with the plug's lift.
// The duty point is where the two curves cross; below the speed whose shut-off head equals
// the static head, the pump cannot lift the water at all and Q = 0.

export const RHO = 998; // kg/m³, water at 20 °C
export const G = 9.81;
export const N0 = 2900; // rpm, a 2-pole motor at 50 Hz
export const N_MAX = 2900;

// Fitted 50-32-160 characteristic at 2900 rpm, impeller Ø169.
export const A = 36.0;
export const B = 0.12;
export const C = 0.0322;
export const P_A = 0.75;
export const P_B = 0.098;
export const P_C = 0.0011;

// Impeller and casing (mm). The geometry reads these.
export const D2 = 169; // impeller outlet diameter
export const B2 = 6; // outlet width
export const D_EYE = 56; // impeller eye
export const VANES = 6;
export const BETA2 = 25; // vane outlet angle, degrees from the tangent
export const DN_S = 50; // suction nozzle
export const DN_D = 32; // discharge nozzle
export const R_TONGUE = 92; // base circle of the volute, at the tongue (cutwater)
export const R_THROAT = 118; // volute outer radius at the throat, 360° on
export const TONGUE_DEG = 58; // where the tongue sits, from +x, counter-clockwise (as seen in B-B)

// The pipe system (m) and the valve.
export const H_STATIC = 12; // lift from the suction tank surface to the delivery tank surface
export const Z_SUCTION = 1.5; // suction tank surface above the pump axis (flooded suction)
export const K_PIPE = 0.035; // pipe friction, m per (m³/h)²
export const K_SUCTION = 0.004; // the share of it on the suction side
export const KVS = 16; // valve Kv fully open, m³/h at 1 bar
export const KV0 = 0.8; // leakage-level Kv at the seat
export const LIFT_MAX = 12; // plug lift fully open, mm
export const BAR_M = 1e5 / (RHO * G); // metres of water per bar, 10.21

export const H0 = (q) => A + B * q - C * q * q;
export const P0 = (q) => P_A + P_B * q - P_C * q * q;

// Head and shaft power at speed n. q in m³/h, n in rpm.
export function head(q, n) {
  const r = n / N0;
  return r * r * A + r * B * q - C * q * q;
}
export function power(q, n) {
  const r = n / N0;
  if (r <= 0) return 0;
  return r * r * r * P0(q / r);
}
export const hydraulicKW = (q, h) => (RHO * G * (q / 3600) * h) / 1000;
export function efficiency(q, n) {
  const p = power(q, n);
  return p > 1e-6 ? hydraulicKW(q, head(q, n)) / p : 0;
}

export const kv = (lift) => KV0 + (KVS - KV0) * Math.min(1, Math.max(0, lift / LIFT_MAX));
export const valveLoss = (q, lift) => BAR_M * (q / kv(lift)) ** 2; // m
export const systemHead = (q, lift) => H_STATIC + K_PIPE * q * q + valveLoss(q, lift);

// The duty point: solve head(q, n) = systemHead(q, lift), both quadratic in q.
export function duty(n, lift) {
  const kSys = K_PIPE + BAR_M / kv(lift) ** 2;
  const r = n / N0;
  const a = C + kSys;
  const b = -r * B;
  const c = H_STATIC - r * r * A;
  if (c >= 0) return { q: 0, h: Math.max(0, r * r * A), flowing: false };
  const q = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  return { q, h: head(q, n), flowing: true };
}

// Speed at which the shut-off head just equals the static lift: below it nothing flows.
export const N_LIFT = N0 * Math.sqrt(H_STATIC / A);

// Best efficiency point at n0, found numerically once.
export const BEP = (() => {
  let best = { q: 0, eta: 0 };
  for (let q = 0.5; q < 34; q += 0.01) {
    const e = efficiency(q, N0);
    if (e > best.eta) best = { q, eta: e };
  }
  return { q: best.q, h: head(best.q, N0), eta: best.eta, p: power(best.q, N0) };
})();

// Specific speed n_q = n·√Q / H^0.75 (Q in m³/s): a radial impeller sits around 10–30.
export const NQ = (N0 * Math.sqrt(BEP.q / 3600)) / BEP.h ** 0.75;
export const U2 = (Math.PI * (D2 / 1000) * N0) / 60; // impeller tip speed, m/s

// Everything the sheet shows at one moment.
export function state(n, lift) {
  const d = duty(n, lift);
  const q = d.q;
  const h = d.h;
  const p = power(q, n);
  const eta = efficiency(q, n);
  const pSuction = (Z_SUCTION - K_SUCTION * q * q) / BAR_M; // bar gauge at the suction flange
  const pDischarge = pSuction + h / BAR_M;
  const dpValve = valveLoss(q, lift) / BAR_M;
  return { n, lift, q, h, p, eta, flowing: d.flowing, pSuction, pDischarge, pAfterValve: pDischarge - dpValve, dpValve };
}

// Fluid pressure through the impeller, as a share of the pump's rise: a radial impeller makes about
// two thirds of its head as static pressure; the volute recovers the rest from velocity.
export const REACTION = 0.65;
