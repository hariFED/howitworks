// Truth first: a WC cistern as a token bucket. Pure, no imports, no DOM.
// The geometry, the dimensions, the readout, the floats and the chart all read this.
//
// Tokens are water. The bucket is the tank between the reserve level L0 (zero tokens) and the
// level at which the float valve shuts, L_FULL (capacity). One token is one dose of water, the
// volume one request takes out through the drop valve. The fill valve refills through a fixed
// orifice at mains pressure, so the refill rate does not depend on the level: a constant token
// rate, cut off by the float when the bucket is full. A request is accepted only when at least
// one whole token is in the tank; otherwise the dose float rests on its stop and the pull knob is
// locked out. The overflow tube is the hard cap if the float valve is ever held open.

export const G = 9.81; // m/s²
export const RHO = 1000; // kg/m³

// Tank (mm). The inside floor is v = 0.
export const IN_L = 380; // internal length, along the section
export const IN_W = 150; // internal width, into the page
export const AREA = IN_L * IN_W; // plan area, mm² (walls vertical; float displacement neglected)
export const RIM = 260; // top of the walls, where the lid sits

// Tokens
export const DOSE = 1.5; // litres per request: one token
export const CAP = 4; // bucket size, tokens
export const TOKEN_H = (DOSE * 1e6) / AREA; // level per token, mm
export const L0 = 60; // reserve level: zero tokens
export const L_FULL = L0 + CAP * TOKEN_H; // the float valve shuts here
export const CREST = 185; // overflow crest, ≥ 20 mm above L_FULL

// Fill valve: diaphragm valve with a fixed orifice (the jet), BS 1212 type.
export const P_MAINS = 3.0; // bar gauge
export const JET_D = 3.5; // mm
export const CD_JET = 0.62;
export const JET_A = Math.PI * (JET_D / 2) ** 2; // mm²
export const JET_V = Math.sqrt((2 * P_MAINS * 1e5) / RHO); // m/s
export const Q_FILL = CD_JET * JET_A * 1e-6 * JET_V * 1000; // L/s, independent of the level
export const RATE = Q_FILL / DOSE; // tokens per second
export const BAND = 4; // mm of level over which the diaphragm closes on the jet
export const GAP_MAX = 2; // diaphragm clear of the jet, mm, fully open

// Drop valve: Torricelli through the seat while a dose is draining.
export const SEAT_D = 44; // mm
export const SEAT_V = 12; // seat height above the inside floor, mm
export const CD_SEAT = 0.6;
export const SEAT_A = Math.PI * (SEAT_D / 2) ** 2; // mm²
export const LIFT = 24; // plug lift, mm

// Overflow: a sharp-crested weir round the tube's rim.
export const TUBE_D = 32;
export const CD_WEIR = 0.62;

// Dose float: annular, rides on the water with this draft, rests on its stop below one token.
export const DRAFT = 12;
export const FLOAT_H = 30;
export const STOP_V = L0 + TOKEN_H - DRAFT; // the stop collar's top face
export const LIP_V = 197; // the cage's top lip: the float cannot rise past it

// Ball float on the arm: its centre rides this far above the water line.
export const BALL_D = 70;
export const BALL_RISE = 8;

export const SPEED = 4; // the sheet's clock runs at this many seconds per real second

export const tokens = (L) => (L - L0) / TOKEN_H;
export const levelOf = (tok) => L0 + tok * TOKEN_H;
export const open = (L) => Math.min(1, Math.max(0, (L_FULL - L) / BAND)); // fill valve opening 0..1
export const outflow = (L) => CD_SEAT * SEAT_A * 1e-6 * Math.sqrt(2 * G * Math.max(0, L - SEAT_V) / 1000) * 1000; // L/s
export function weir(L) {
  const h = Math.max(0, L - CREST) / 1000;
  return CD_WEIR * (2 / 3) * Math.sqrt(2 * G) * Math.PI * TUBE_D * 1e-3 * h ** 1.5 * 1000; // L/s
}
export const dFloat = (L) => Math.min(LIP_V - FLOAT_H, Math.max(STOP_V, L - DRAFT)); // dose float underside

export function tank() {
  return { t: 0, L: L_FULL, pending: 0, held: false, qin: 0, qout: 0, qover: 0, accepted: 0, refused: 0, last: "" };
}

// The level the tank will settle to once any dose in progress has drained: the tokens on hand.
export const committed = (s) => s.L - (s.pending * 1e6) / AREA;

// A request: take one token if there is one.
export function request(s) {
  if (tokens(committed(s)) >= 1 - 1e-9) {
    s.pending += DOSE;
    s.accepted++;
    s.last = "ACCEPTED";
    return true;
  }
  s.refused++;
  s.last = "REFUSED";
  return false;
}

// Advance dt seconds of model time.
export function advance(s, dt) {
  s.qin = s.held ? Q_FILL : Q_FILL * open(s.L);
  s.qout = s.pending > 0 ? Math.min(outflow(s.L), s.pending / dt) : 0;
  s.pending = Math.max(0, s.pending - s.qout * dt);
  s.qover = weir(s.L);
  s.L += ((s.qin - s.qout - s.qover) * dt * 1e6) / AREA;
  s.t += dt;
  return s;
}
