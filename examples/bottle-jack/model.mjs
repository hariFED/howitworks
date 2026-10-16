// Truth first: a 2-tonne hydraulic bottle jack. Pure, no imports, no DOM.
// The geometry, the dimensions on the sheet, the readout and the chart all read this.
//
// Hydraulics: Pascal's principle. The oil is incompressible and every connected volume is at one
// pressure. A downstroke of the Ø12 pump plunger pushes oil past the delivery ball into the ram
// chamber; the Ø32 ram rises by the same volume over its larger area, so force multiplies by the
// area ratio and travel divides by it. On the upstroke the suction ball lifts and the plunger draws
// oil from the reservoir. The release screw is a needle valve back to the reservoir: the load drives
// oil out through it (orifice flow, Q = Cd·A·√(2p/ρ)). The relief ball limits the pump pressure.

export const G = 9.81;
export const RHO = 870; // kg/m³, ISO VG 15 jack oil
export const CD = 0.62; // discharge coefficient, sharp-edged seat

// Bores and strokes (mm)
export const RAM_D = 32; // the ram head, the pressure area
export const RAM_ROD_D = 30; // the ram above its head, through the top nut
export const PLUNGER_D = 12;
export const PUMP_STROKE = 25;
export const LIFT_MAX = 115; // the ram head meets the top nut
export const A_RAM = (Math.PI * RAM_D ** 2) / 4; // mm²
export const A_PL = (Math.PI * PLUNGER_D ** 2) / 4; // mm²
export const AREA_RATIO = A_RAM / A_PL;
export const V_STROKE = A_PL * PUMP_STROKE; // mm³ moved per stroke
export const RISE = V_STROKE / A_RAM; // mm of ram per stroke

// Heights along the jack's axis (mm, base underside v = 0)
export const BASE_TOP = 44;
export const RES_FLOOR = 41; // floor of the reservoir, where the outer tube sits
export const CYL_SEAT = 35; // the cylinder's seat in its counterbore
export const RAM_LOW = 36; // the ram head's underside, fully down
export const HEAD_H = 39; // ram head length: at full lift it meets the top nut
export const TUBE_TOP = 190; // both tubes end under the top nut
export const RAM_TOP = 214; // the ram's top face, fully down
export const CLOSED_H = 232; // the saddle's top, fully down
export const OIL_LEVEL = 152; // reservoir oil level with the ram down

// Reservoir: the annulus between the cylinder (Ø40) and the outer tube bore (Ø65)
export const RES_RI = 20;
export const RES_RO = 32.5;
export const A_RES = Math.PI * (RES_RO ** 2 - RES_RI ** 2);
export const levelAt = (h) => OIL_LEVEL - (A_RAM * h) / A_RES;

// Pump and handle (mm). The plunger's bottom face sits at PL_UP with the handle up.
export const PUMP_U = 74;
export const PL_UP = 51;
export const PL_LEN = 94; // plunger bottom face to its pin
export const LINK_B = [44, 104.5]; // the link's lower pin, on the pump cylinder's lug
export const LINK_L = 28;
export const ARM = 30; // fulcrum pin to plunger pin, on the socket
export const HANDLE_L = 450; // fulcrum to the hand
export const LEVER = HANDLE_L / ARM;

// Valves (mm)
export const SEAT_D = 3; // release needle seat
export const NEEDLE_HALF = 15; // the needle's half angle, degrees
export const RELEASE_PITCH = 1; // M12×1: one turn opens 1 mm
export const BALL_LIFT = 1.2;

// Loads
export const RAM_MASS = 1.6; // kg: ram, extension screw and saddle
export const RATED = 2000; // kg
export const P_RELIEF = 275; // bar, the relief valve's cracking pressure (about 2250 kg)
export const LOADS = [1500, 2000, 2400, 800];
export const SETTLE = 6; // mm/s, how fast an overload bleeds the ram down through the relief valve

export const pressureFor = (kg) => ((kg + RAM_MASS) * G) / A_RAM * 10; // N/mm² -> bar
export const loadAt = (bar) => (bar / 10) * A_RAM / G; // kg the ram holds at this pressure
export const plungerV = (x) => PL_UP - PUMP_STROKE * x; // x: 0 handle up, 1 handle down
export const pinV = (x) => plungerV(x) + PL_LEN;
export const needleArea = (e) => Math.PI * SEAT_D * Math.max(0, e) * Math.sin((NEEDLE_HALF * Math.PI) / 180); // mm²

// The socket is a lever: the plunger pin P moves straight up and down, the fulcrum F swings on the
// link about LINK_B. F is where the circle of the link meets the circle of the arm.
export function socketPose(x) {
  const P = [PUMP_U, pinV(x)];
  const [bx, by] = LINK_B;
  const dx = P[0] - bx;
  const dy = P[1] - by;
  const dd = Math.hypot(dx, dy);
  const a = (LINK_L ** 2 - ARM ** 2 + dd ** 2) / (2 * dd);
  const hh = Math.sqrt(Math.max(0, LINK_L ** 2 - a ** 2));
  const mx = bx + (a * dx) / dd;
  const my = by + (a * dy) / dd;
  const F = [mx - (hh * dy) / dd, my + (hh * dx) / dd]; // the upper intersection
  const angle = (Math.atan2(P[1] - F[1], P[0] - F[0]) * 180) / Math.PI; // degrees, v up
  return { P, F, angle };
}

export function jack(load = LOADS[0]) {
  return {
    x: 0,
    h: 0, // ram lift, mm
    load, // kg on the saddle
    e: 0, // release needle off its seat, mm
    p: pressureFor(load), // ram chamber, bar
    pp: 0, // pump chamber, bar
    delivering: false,
    suction: false,
    relief: false,
    lowering: false,
    travel: 0, // total plunger travel, mm: strokes = travel / (2·stroke)
    pumped: 0, // oil delivered to the ram, mm³
  };
}

// Move the plunger to x over dt seconds and let the oil settle. Works for any path.
export function advance(s, x, dt) {
  const dx = x - s.x;
  s.travel += Math.abs(dx) * PUMP_STROKE;
  const need = pressureFor(s.load);
  s.delivering = false;
  s.suction = false;
  s.relief = false;
  s.lowering = false;
  if (dx > 1e-7) {
    // downstroke: the pump chamber rises to the ram's pressure, or to the relief setting
    const blocked = s.h >= LIFT_MAX - 1e-6;
    if (need >= P_RELIEF || blocked) {
      s.pp = P_RELIEF;
      s.relief = true;
    } else {
      const dV = A_PL * PUMP_STROKE * dx;
      s.h = Math.min(LIFT_MAX, s.h + dV / A_RAM);
      s.pumped += dV;
      s.pp = need;
      s.delivering = true;
    }
  } else if (dx < -1e-7) {
    s.pp = -0.3; // a slight vacuum draws oil past the suction ball
    s.suction = true;
  } else if (s.pp > 0) s.pp = Math.max(0, s.pp - 4000 * dt);
  s.p = s.h > 0 || s.delivering ? need : 0; // fully down, the base carries the load
  if (need >= P_RELIEF && s.h > 0) {
    // overloaded: the relief ball lifts and lets the ram settle until the load sits on the base
    s.relief = true;
    s.p = P_RELIEF;
    s.h = Math.max(0, s.h - SETTLE * dt);
  }
  if (s.e > 0 && s.h > 0) {
    // orifice flow through the needle seat, m³/s -> mm³/s
    const q = CD * needleArea(s.e) * 1e-6 * Math.sqrt((2 * s.p * 1e5) / RHO) * 1e9;
    s.h = Math.max(0, s.h - (q * dt) / A_RAM);
    s.lowering = s.h > 0;
  }
  s.x = x;
  return s;
}

export const strokes = (s) => s.travel / (2 * PUMP_STROKE);
export const handleForce = (bar) => (Math.max(0, bar) / 10) * A_PL / LEVER; // N
export const ramForce = (bar) => (Math.max(0, bar) / 10) * A_RAM; // N
export const lowerRate = (s) => (s.e > 0 ? (CD * needleArea(s.e) * 1e-6 * Math.sqrt((2 * s.p * 1e5) / RHO) * 1e9) / A_RAM : 0);
