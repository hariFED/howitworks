// Truth first: the click pen's push-push indexing mechanism and its return spring.
// Pure, no imports, no DOM. The geometry, the dimensions, the readout and both diagrams read this.
//
// Coordinates. u is along the pen's axis in mm, from the front face of the nose cone (u = 0) to
// the button. Angles θ are in degrees about the axis. The cam track is developed (unrolled) at
// radius R_DEV, where the ridges of the guide and the lugs of the rotator overlap; a degree of
// track is MMD mm of arc there.
//
// Three parts make the toggle:
//   the CAM GUIDE (fixed) has 6 ridge teeth, pitch 60°, with a sawtooth bottom. Every second
//   valley opens into a LONG SLOT (channel, open to the top); the others into a SHORT SLOT (notch).
//   the PLUNGER (slides, never turns) has 6 V teeth, pitch 60°, half a pitch out of phase.
//   the ROTATOR (slides and turns) has 3 lugs, 15° wide, with tops at the same slope.
// A press pushes the lug below the ridge teeth and the plunger tooth turns it 30°; on release the
// ridge tooth turns it another 30° into the next slot. One click = 60°, long and short alternate,
// so the state toggles. The refill rides on the rotator against the return spring.

export const R_DEV = 3.4; // mm, developed radius of the cam track
export const MMD = (2 * Math.PI * R_DEV) / 360; // mm of arc per degree
export const PITCH = 60; // deg, one tooth pitch = one click
export const LUG_W = 15; // deg, lug and slot width
export const LUGS = 3;
export const SLOPE = 0.5; // axial mm per mm of arc on every cam face
const s1 = SLOPE * MMD; // axial mm per degree
export const H_R = s1 * PITCH; // rise of one ridge tooth
export const H_P = s1 * 45; // rise of a plunger tooth's long flank (45°); the short flank is 15°
export const LUG_DROP = s1 * LUG_W; // the lug top falls this much across its width
export const NOTCH = 1.0; // depth of a short slot above its valley

// Axial layout (u, mm)
export const LUG_TOP = 5.0; // the lug's top corner above the rotator's front face
export const THROW = 3.2; // refill travel between the two stable states
export const U_R_EXT = 96.0; // rotator front face (= refill rear end) when extended
export const Y_N = U_R_EXT + LUG_TOP; // lug corner in a short slot
export const Y_G = Y_N - NOTCH - H_R; // the ridge teeth's tips
export const Y_V = Y_G + H_R; // a ridge valley
export const Y_RET = Y_N + THROW; // lug corner in a long slot (plunger collar against the top cap)
export const PUSH_MAX = 6.23; // button travel to the stop
export const Y_MIN = Y_RET - PUSH_MAX; // lug corner at the bottom of a press
export const YPT_TOP = Y_RET - LUG_DROP; // plunger tooth tips, button fully out
export const GUIDE_TOP = 111; // top of the cam guide

// Refill (ISO 12757-2 G2 size): s measured from the front of the ball.
export const REFILL_L = 98;
export const COLLAR_S = 20; // the spring bears on the refill's point holder collar here
export const SEAT_U = 6; // and on this step inside the nose cone

// Return spring: EN 10270-3 1.4310 wire, G = 70 000 N/mm².
export const SPRING = { d: 0.4, D: 4.3, n: 10, L0: 19, G: 70000 };
export const RATE = (SPRING.G * SPRING.d ** 4) / (8 * SPRING.D ** 3 * SPRING.n); // N/mm
export const SOLID = (SPRING.n + 2) * SPRING.d;

export const refillEnd = (Y) => Y - LUG_TOP; // u of the rotator's front face
export const tipU = (Y) => refillEnd(Y) - REFILL_L; // u of the ball's front
export const springLength = (Y) => refillEnd(Y) - REFILL_L + COLLAR_S - SEAT_U;
export const compression = (Y) => SPRING.L0 - springLength(Y);
export const springForce = (Y) => RATE * compression(Y);

const mod = (a, m) => ((a % m) + m) % m;

// Slot kind at a ridge valley: q counts half pitches (30°) of the lug's leading corner.
export const slotKind = (q) => (mod(q, 4) === 0 ? "long" : "short");

// The ridge's bottom edge at angle θ (u, mm). Infinity inside a long slot.
export function ridgeBottom(theta) {
  const t = mod(theta, PITCH) || PITCH; // (0, 60] past the valley at the left of this tooth
  const valley = theta - t + PITCH; // the valley this tooth rises to
  if (t <= PITCH - LUG_W) return Y_G + s1 * t;
  if (mod(Math.round(valley), 120) === 0) return Infinity;
  return Y_V + NOTCH - s1 * (PITCH - t);
}

// The plunger's bottom edge at angle θ, its tooth tips at yPt. V teeth: tips at 45° + 60°k,
// a 45° flank rising to the valley at 30° + 60°k, then a 15° flank falling to the next tip.
export function plungerBottom(theta, yPt) {
  const t = mod(theta + 15, PITCH);
  return t <= 45 ? yPt + s1 * t : yPt + H_P - 3 * s1 * (t - 45);
}

// The lug's top at angle θ for a lug whose leading corner is at angle phi, height Y.
export const lugTop = (theta, phi, Y) => Y - s1 * (phi - theta);

// ---------------------------------------------------------------- the indexing state machine
//
// state: q (integer half pitches; even = in a slot, odd = indexed on a plunger tooth),
// and the pose it settles to for a given button push (mm, 0 = released).
export function pen() {
  return { q: 0, push: 0, Y: Y_RET, X: 0, yPt: YPT_TOP, clicks: 0 };
}

// Settle the mechanism for a button push. Works for any path, toured, dragged or keyed.
export function settle(s, push) {
  s.push = Math.min(PUSH_MAX, Math.max(0, push));
  const yUser = YPT_TOP - s.push; // the lowest the thumb lets the plunger rise to
  for (let guard = 0; guard < 4; guard++) {
    if (mod(s.q, 2) === 0) {
      // In a slot: the spring holds the lug up against the slot's end or the plunger.
      const top = slotKind(s.q) === "long" ? Y_RET : Y_N;
      s.Y = Math.min(top, yUser + LUG_DROP);
      s.X = s.q * 30;
      s.yPt = s.Y - LUG_DROP;
      if (s.Y < Y_G) {
        s.q++; // clear of the ridge tip: the plunger's long flank turns the lug 30°
        continue;
      }
      return s;
    }
    // Indexed: the lug sits in a plunger valley until it meets a ridge tooth, then rides it.
    const Xv = s.q * 30;
    const dX = (yUser - (Y_G - LUG_DROP)) / (4 * s1);
    if (dX <= 0) {
      s.X = Xv;
      s.yPt = yUser;
      s.Y = yUser + H_P;
      return s;
    }
    if (dX < 15) {
      s.X = Xv + dX;
      s.Y = Y_G + H_R / 2 + s1 * dX;
      s.yPt = yUser;
      return s;
    }
    s.q++; // past the plunger tip: the spring drives the lug up the ridge into the next slot
    s.clicks++;
  }
  return s;
}

export function stateName(q) {
  const m = mod(q, 4);
  return m === 0 ? "RETRACTED" : m === 1 ? "INDEXING" : m === 2 ? "EXTENDED" : "INDEXING";
}

export const buttonDepth = (s) => YPT_TOP - s.yPt;
