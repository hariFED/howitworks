// Truth first: the floor pump's dimensions and its air. Pure, no imports, no DOM.
// The geometry, the dimensions on the sheet, the readout, the gauge and the chart all read this.
//
// Air model: isothermal (a slow stroke), pV = n·R·T, so p·V is the amount of air in bar·cm³.
// Pressures are absolute inside the model; the sheet shows gauge pressure (above atmosphere).
// The cup seal is the inlet valve: on the upstroke it folds and lets air past once the chamber
// falls below atmosphere. The ball check valve in the base is the outlet: it opens whenever the
// chamber is above the hose, and the two then share one pressure.

export const P_ATM = 1.01325; // bar, absolute

// Barrel and stroke (mm)
export const BORE = 32;
export const BARREL_OD = 35;
export const STROKE = 350;
export const FLOOR = 34; // chamber floor, the bottom of the barrel socket
export const PISTON_LOW = 36; // the nut's underside at the bottom of the stroke
export const SEAL = 10.5; // the cup seal's lip, measured up from the nut's underside
export const POCKET = 14.5; // the underside of the cup's web: air below it is chamber air too
export const ROD = 430; // rod length, from the nut's underside to the handle
export const AREA = Math.PI * (BORE / 2) ** 2; // mm²

// Base passages (mm): a drilling down from the chamber floor, then across to the valve seat.
export const DRILL_U = 10;
export const PASSAGE_D = 6;
export const PASSAGE_V = 29; // centre height of the cross passage and the valve
export const SEAT_U = 40; // seat edge, where the Ø6 passage meets the Ø12 valve chamber
export const BALL_D = 8;
export const VALVE_D = 12;
export const BALL_LIFT = 1.6; // full lift off the seat, mm

// Volumes (cm³)
const mm3 = 1 / 1000;
const NUT_AF = 17;
const NUT_H = 8;
const WASHER_R = 10;
const WASHER_H = 2;
const nutVolume = (Math.sqrt(3) / 2) * NUT_AF ** 2 * NUT_H * mm3; // nut with the rod end inside it
const washerVolume = Math.PI * WASHER_R ** 2 * WASHER_H * mm3;
const passageArea = Math.PI * (PASSAGE_D / 2) ** 2;
const cupPocket = Math.PI * (13.8 ** 2 - 8 ** 2) * (POCKET - SEAL) * mm3; // under the web, inside the lip
const passages = passageArea * ((FLOOR - (PASSAGE_V - PASSAGE_D / 2)) + (SEAT_U - DRILL_U)) * mm3;
export const SWEPT = AREA * STROKE * mm3;
export const V_DEAD = AREA * (PISTON_LOW + SEAL - FLOOR) * mm3 - nutVolume - washerVolume + cupPocket + passages;
export const V_TYRE = 800; // a 700×28C road tyre, approximately

export const START_GAUGE = 2.0; // bar, a soft tyre
export const RESET_GAUGE = 6.8; // the tour lets the tyre down again here

export const NUT = { af: NUT_AF, h: NUT_H };
export const WASHER = { r: WASHER_R, h: WASHER_H };

// x is the stroke: 0 with the handle up, 1 at the bottom.
export const chamberVolume = (x) => V_DEAD + SWEPT * (1 - x);
export const pistonV = (x) => PISTON_LOW + STROKE * (1 - x);
export const gauge = (p) => p - P_ATM;
// Force on the handle to hold the piston against the chamber: (p − p_atm)·A. bar·mm² × 0.1 = N.
export const force = (p) => Math.max(0, p - P_ATM) * AREA * 0.1;
export const ratio = (V_DEAD + SWEPT) / V_DEAD; // the highest pressure ratio one stroke can reach

export function pump(gaugeStart = START_GAUGE) {
  const s = { x: 0, mc: 0, mt: 0, p: P_ATM, pt: 0, open: false, intake: false, strokes: 0 };
  s.mc = P_ATM * chamberVolume(0);
  s.mt = (gaugeStart + P_ATM) * V_TYRE;
  s.pt = s.mt / V_TYRE;
  return s;
}

// Move the piston to x and settle the air. Works for any path, dragged or toured.
export function advance(s, x) {
  const V = chamberVolume(x);
  const wasDown = s.x;
  let p = s.mc / V;
  const pt = s.mt / V_TYRE;
  s.open = false;
  s.intake = false;
  if (p > pt) {
    const pe = (s.mc + s.mt) / (V + V_TYRE);
    s.mc = pe * V;
    s.mt = pe * V_TYRE;
    p = pe;
    s.open = true;
  } else if (p < P_ATM) {
    s.mc = P_ATM * V;
    p = P_ATM;
    s.intake = true;
  }
  if (wasDown > 0.98 && x <= 0.98) s.strokes++;
  s.x = x;
  s.p = p;
  s.pt = s.mt / V_TYRE;
  return s;
}

export function setTyre(s, gaugeBar) {
  s.mt = (gaugeBar + P_ATM) * V_TYRE;
  s.pt = s.mt / V_TYRE;
}
