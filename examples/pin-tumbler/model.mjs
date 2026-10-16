// Truth first: a 5-pin euro-profile half cylinder and its key. Pure, no imports, no DOM.
// The geometry, the dimensions on the sheet, the readout and the chart all read this.
//
// Frame: u along the plug axis from the front face (mm), z up from the axis. The sheet draws the
// cylinder fin-up, so the pin stacks stand above the plug.
//
// Key model. Each cut is a 90° V with a 0.6 mm flat root; depth code n puts the root
// 0.5·n mm below the uncut blade top. A key pin cut for code n is 3.5 + 0.5·n long, so on its own
// cut its crown lands exactly on the shear line. A key pin's nose is a 90° cone with a 0.6 mm
// flat, so as the key slides the pin rides the highest point of the profile under its cone.
// The plug may turn only when every key pin's crown sits on the shear line (AND over five pins).

// ---------------------------------------------------------------- profile and plug (mm)
export const PLUG_R = 6.5; // Ø13 plug: its surface is the shear line
export const SHEAR = PLUG_R;
export const COLLAR_R = 7.5; // Ø15 front collar in a counterbore
export const COLLAR_L = 1.2;
export const BODY_R = 8.5; // DIN 18252 profile: Ø17 round
export const FIN_W = 10; // and a 10 mm fin
export const FIN_TOP = 24.5; // 33 mm overall
export const BODY_L = 40; // half cylinder 30/10
export const CAM_U = 30; // cam centre from the front face
export const SLOT = [25.6, 34.4]; // cam slot
export const CAM = [25.8, 34.2]; // cam faces
export const PLUG_END = SLOT[0];
export const KEYWAY_END = 25.0;
export const SPIGOT_R = 4; // plug tail through the cam
export const SPIGOT_END = 39.4;
export const GROOVE = [37.9, 38.6]; // retaining-washer groove, Ø6 root
export const REAR_BORE_R = 4.1;
export const REAR_CB = 37.4; // rear counterbore Ø13 from here to the back face
export const REAR_CB_R = 6.5;
export const BRIDGE = 12.5; // the fin bridge over the cam starts here
export const SCREW = { u: CAM_U, z: 18, d: 5, minor: 4.134 }; // M5 fixing screw, perpendicular to the cut

// ---------------------------------------------------------------- pins
export const PINS = 5;
export const PIN_D = 3.0;
export const PIN_R = PIN_D / 2;
export const FIRST = 4.5;
export const PITCH = 4.0;
export const pinU = (i) => FIRST + PITCH * i;
export const NOSE_FLAT = 0.6; // Ø of the flat on the key pin's 90° cone
export const DRIVER_L = 5.0;
export const CAP_BOT = 22.5; // chamber caps Ø3×2, pressed in flush with the fin top
export const SPRING = { free: 16, rate: 0.05, wire: 0.25, mean: 2.3, turns: 7 }; // N/mm

// ---------------------------------------------------------------- key and keyway
export const STEP = 0.5; // depth increment
export const DEPTHS = 7; // codes 0..6
export const BLADE_TOP = 3.0; // uncut blade top, above the axis
export const BLADE_BOT = -5.0;
export const BLADE_LEN = 24.8; // shoulder to tip: also the full insertion
export const ROOT_FLAT = 0.6;
export const TIP_LOW = -1.5; // the tip's 45° ramp starts this high at the tip
export const SHANK = { top: 5.5, bot: -6.0 }; // behind the shoulder
export const KEYWAY = { top: 3.4, bot: -5.3, hw: 1.2 };
export const BLADE_HW = 1.0; // 2 mm blade
export const PIN_REST = -0.3; // nose height with no key: the cone seats on the keyway ward
export const TOL = 0.15; // a gap this close to the shear line lets the plug turn

export const root = (code) => BLADE_TOP - STEP * code;
export const keyPinLength = (code) => SHEAR - root(code);

// The lock is pinned for this key; the tour also tries a key one cut wrong.
export const RIGHT = [2, 4, 1, 6, 3];
export const WRONG = [2, 4, 3, 6, 3];
export const KEY_PINS = RIGHT.map(keyPinLength);
export const COMBINATIONS = DEPTHS ** PINS;
export const codeText = (b) => b.join("-");

// The key's top edge at w (mm from the shoulder towards the tip), in plug z.
export function keyTop(bitting, w) {
  if (w < 0) return SHANK.top;
  if (w > BLADE_LEN) return -Infinity;
  let z = Math.min(BLADE_TOP, TIP_LOW + (BLADE_LEN - w));
  for (let i = 0; i < PINS; i++) z = Math.min(z, root(bitting[i]) + Math.max(0, Math.abs(w - pinU(i)) - ROOT_FLAT / 2));
  return z;
}

// Plug u under key w, with the key inserted e mm (0: tip at the face; BLADE_LEN: home).
export const keyW = (u, e) => u + (BLADE_LEN - e);

// The key pin's nose height: the highest point of the profile under its cone, or the rest stop.
export function nose(bitting, e, i) {
  const u = pinU(i);
  let best = PIN_REST;
  for (let k = -30; k <= 30; k++) {
    const du = (k / 30) * PIN_R;
    const w = keyW(u + du, e);
    if (w < 0 || w > BLADE_LEN) continue;
    const z = keyTop(bitting, w) - Math.max(0, Math.abs(du) - NOSE_FLAT / 2);
    if (z > best) best = z;
  }
  return best;
}

// The five stacks for a key inserted e mm.
export function stacks(bitting, e) {
  const out = [];
  for (let i = 0; i < PINS; i++) {
    const n = nose(bitting, e, i);
    const top = n + KEY_PINS[i];
    const dTop = top + DRIVER_L;
    const len = CAP_BOT - dTop;
    out.push({ nose: n, top, off: top - SHEAR, dTop, spring: len, force: SPRING.rate * (SPRING.free - len) });
  }
  return out;
}

export const aligned = (s) => Math.abs(s.off) <= TOL;
export const free = (st) => st.every(aligned);
export const blocking = (st) => st.map((s, i) => (aligned(s) ? -1 : i)).filter((i) => i >= 0);
export const springForce = (st) => st.reduce((f, s) => f + s.force, 0);

// ---------------------------------------------------------------- the cam, in its own plane
// The cam is drawn in an end view (s across, z up) with its lobe up at rest; the hull of the
// Ø12.6 hub and a R2 tip 9 mm out.
export const CAM_HUB = 6.3;
export const CAM_TIP = { at: 9.0, r: 2.0 };
export const CAM_TURN = 90; // the tour turns the key a quarter turn

// Rotate a point of the plug's own frame by phi (degrees, clockwise seen from the front).
export function rot([s, z], phi) {
  const a = (phi * Math.PI) / 180;
  return [s * Math.cos(a) + z * Math.sin(a), -s * Math.sin(a) + z * Math.cos(a)];
}
