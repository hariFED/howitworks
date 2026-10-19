// The light aircraft's parts, drawn into the general-arrangement views. World geometry is in the
// aircraft's own frame (FS aft of the datum, WL above the ground, BL to starboard, all mm, model.mjs);
// each view maps it onto its own (u, v):
//   side elevation, seen from starboard:  u = −FS (nose right), v = WL
//   plan, seen from above:                u = −FS,              v = −BL (port up)
//   front view, seen from ahead:          u = −BL (port right), v = WL
// Moving surfaces are functions of their deflection, re-drawn each frame. Third-angle projection.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";
import * as X from "./extra.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;

const sv = (pts) => pts.map(([fs, wl]) => [-fs, wl]);
const pv = (pts) => pts.map(([fs, bl]) => [-fs, -bl]);
const fv = (pts) => pts.map(([bl, wl]) => [-bl, wl]);
const rad = Math.PI / 180;

// ---------------------------------------------------------------- the aerofoil and the wing's sections
const AF = M.naca2412(40);
export const upAt = (x) => M.surfaceAt(AF.upper, x);
export const loAt = (x) => M.surfaceAt(AF.lower, x);
// The outline between chord stations a < b, in (ξ, η) chord fractions, closed by straight faces.
export function foilPart(a, b) {
  const up = [[a, upAt(a)], ...AF.upper.filter(([x]) => x > a + 1e-6 && x < b - 1e-6), [b, upAt(b)]];
  const lo = [[a, loAt(a)], ...AF.lower.filter(([x]) => x > a + 1e-6 && x < b - 1e-6), [b, loAt(b)]];
  const out = [...up.reverse(), ...lo.slice(a === 0 ? 1 : 0)];
  if (b >= 1) out.pop();
  return out;
}
// The wing section frame at a wing station: chord, leading edge FS, chord-line WL at the LE.
export const sectionAt = (ws) => ({ c: M.chordAt(ws), le: M.leAt(ws), wl: M.WL_LE + M.dihedralRise(ws) - (M.leAt(ws) - M.LE_FS) * Math.sin((M.INCIDENCE * Math.PI) / 180) });
export const onSection = (pts, ws) => {
  const s = sectionAt(ws);
  return pts.map((p) => M.toWing(p, s.c, s.le, s.wl));
};
// flap and aileron sections, in root-chord fractions, both from the hinge line aft (straight TE)
export const GAP = 0.008;
export const SURF = foilPart(M.HINGE_X + GAP, 1);
export const AIL_HINGE = [M.HINGE_X + GAP + 0.012, (upAt(M.HINGE_X + 0.02) + loAt(M.HINGE_X + 0.02)) / 2];
// root-chord fractions → FS/WL on a station (the surface keeps the root section, the frame moves)
export const surfOn = (pts, ws) => {
  const wl = M.WL_LE + M.dihedralRise(ws);
  return pts.map(([xi, eta]) => M.toWing([xi, eta], M.ROOT_CHORD, M.LE_FS, wl));
};
export const flapLocal = (deg) => X.rot(SURF, M.FLAP_PIVOT, -deg);
export const aileronLocal = (deg) => X.rot(SURF, AIL_HINGE, -deg);
// the fixed part of the wing ahead of the hinge line at a station, in FS/WL
export function fixedSection(ws) {
  const s = sectionAt(ws);
  const h = (M.HINGE_FS - s.le) / s.c;
  return onSection(foilPart(0, h), ws);
}
const wlRange = (pts) => [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))];
const fsRange = (pts) => [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];

// ---------------------------------------------------------------- tail surfaces: symmetric sections
function symFoil(le, te, wl, t = 0.09, n = 16) {
  const c = te - le;
  const up = [];
  const lo = [];
  for (let i = 0; i <= n; i++) {
    const x = 0.5 - 0.5 * Math.cos((Math.PI * i) / n);
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    up.push([le + c * x, wl + c * yt]);
    lo.push([le + c * x, wl - c * yt]);
  }
  return { up, lo, c };
}
const TP = M.TAILPLANE;
const TAIL = symFoil(TP.le, TP.te, TP.wl, 0.09);
// the tailplane ahead of the hinge, and the elevator behind it (FS, WL), in the side view's plane
export const STAB_SEC = [...TAIL.up.filter(([f]) => f <= TP.hinge), ...TAIL.lo.filter(([f]) => f <= TP.hinge).reverse()];
export const ELEV_SEC = [...TAIL.up.filter(([f]) => f > TP.hinge + 8), ...TAIL.lo.filter(([f]) => f > TP.hinge + 8).reverse()];
export const ELEV_HINGE = [TP.hinge + 20, TP.wl];
export const elevatorSide = (deg) => X.rot(ELEV_SEC, ELEV_HINGE, -deg);
// fin and rudder, side profiles (FS, WL)
export const FIN = [[5250, 1360 + M.coneR(5250) + 4], [6330, 2700], [M.RUDDER_HINGE_FS - 10, 2700], [M.RUDDER_HINGE_FS - 10, 1360 + M.coneR(6490) + 4]];
export const RUDDER = [[M.RUDDER_HINGE_FS + 10, 2720], [6860, 2720], [6980, 2600], [M.TAIL_TE_FS, 1900], [M.TAIL_TE_FS, 1640], [7040, 1560], [M.RUDDER_HINGE_FS + 10, 1560]];
const FIN_T = 100; // fin and rudder thickness at the root, mm
// the fin's root section seen from above (FS, BL), and the rudder's, turned about the hinge
const finTop = (() => {
  const s = symFoil(5250, M.TAIL_TE_FS, 0, 0.11);
  const fin = [...s.up.filter(([f]) => f < M.RUDDER_HINGE_FS - 10), ...s.lo.filter(([f]) => f < M.RUDDER_HINGE_FS - 10).reverse()];
  const rud = [...s.up.filter(([f]) => f > M.RUDDER_HINGE_FS + 10), ...s.lo.filter(([f]) => f > M.RUDDER_HINGE_FS + 10).reverse()];
  return { fin, rud };
})();
export const rudderTop = (deg) => X.rot(finTop.rud, [M.RUDDER_HINGE_FS, 0], deg);

// ---------------------------------------------------------------- fuselage outlines
const N = 24;
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
export const cowlTop = (fs) => M.THRUST_WL + M.cowlR(fs);
export const cowlBot = (fs) => M.THRUST_WL - M.cowlR(fs);
export const coneTop = (fs) => M.TAILCONE.axis + M.coneR(fs);
export const coneBot = (fs) => M.TAILCONE.axis - M.coneR(fs);
const C = M.CABIN;
const CT = M.TAILCONE;
export const topLine = () => [
  ...range(M.COWL.front, 0, N).map((f) => [f, cowlTop(f)]),
  M.WINDSCREEN.top,
  ...range(CT.fs0, CT.fs1, N).map((f) => [f, coneTop(f)]),
];
export const botLine = () => [
  ...range(M.COWL.front, 0, N).map((f) => [f, cowlBot(f)]),
  ...range(CT.fs0, CT.fs1, N).map((f) => [f, coneBot(f)]),
];
export const sideOutline = () => [...topLine(), ...botLine().reverse()];
// plan: half-widths
export const halfWidth = (fs) => (fs < 0 ? M.cowlR(fs) : fs < CT.fs0 ? C.half : M.coneR(fs));
export function planOutline() {
  const fsList = [...range(M.COWL.front, -1, N), 0, CT.fs0 - 1, ...range(CT.fs0, CT.fs1, N)];
  const right = fsList.map((f) => [f, halfWidth(f)]);
  return [...right, ...right.slice().reverse().map(([f, b]) => [f, -b])];
}
// the cabin's rounded-box section (BL, WL), for the front view and the 3D cabin
export function cabinSection(inset = 0) {
  const h = C.half - inset;
  const b = C.floor + inset;
  const t = C.roof - inset;
  const rb = Math.max(1, C.rBottom - inset);
  const rt = Math.max(1, C.rTop - inset);
  return [...K.arc(h - rb, b + rb, rb, -90, 0, 6), ...K.arc(h - rt, t - rt, rt, 0, 90, 4), ...K.arc(-h + rt, t - rt, rt, 90, 180, 4), ...K.arc(-h + rb, b + rb, rb, 180, 270, 6)];
}

// ---------------------------------------------------------------- SIDE ELEVATION (from starboard)
// The forward fuselage, FS −880 to 2430, is drawn in section on the centreline (a broken-out
// section) so the engine bay and the cabin show; aft of the break the tail cone is seen from outside.
export const BREAK_FS = 2430;
const T = 15; // skin, drawn thickness in mm (0.6 sheet units at 1:50: blacked in)

export function fuselageSide(V) {
  const out = sideOutline();
  // the top and bottom skins cut on the centreline, from the cowl lip to the break
  const top = topLine().filter(([f]) => f <= BREAK_FS);
  top.push([BREAK_FS, C.roof]);
  const band = (line, s) => [...line, ...line.slice().reverse().map(([f, w]) => [f, w + s * T])];
  const roof = top.filter(([f]) => f >= M.WINDSCREEN.top[0]);
  const frames = [1000, 1600].map((f) => K.cut(V, sv(K.rect(f, C.roof - T - 40, f + 40, C.roof - T)), { mat: "solid" }) + K.cut(V, sv(K.rect(f, C.floor + T, f + 40, C.floor + T + 50)), { mat: "solid" }));
  // the far (port) wall seen through the section: windows and the door
  const win = [
    [[60, C.sill], [980, C.sill], [980, C.winTop], [520, C.winTop], [60, 1790]],
    [[1040, C.sill], [1560, C.sill], [1560, C.winTop], [1040, C.winTop]],
    [[1640, C.sill], [2380, C.sill], [2380, 1820], [1640, C.winTop]],
  ];
  const door = [[640, C.floor + 40], [1590, C.floor + 40], [1590, 1950], [640, 1950]];
  return part(
    1,
    K.body(V, sv(out)) +
      win.map((w) => K.line(V, sv(w), "vis", true)).join("") +
      K.line(V, sv(door), "thin", true) +
      K.cut(V, sv(band(roof, -1)), { mat: "solid" }) +
      K.cut(V, sv(band([[0, C.floor], [BREAK_FS, C.floor]], 1)), { mat: "solid" }) +
      K.cut(V, sv(K.rect(0, C.floor + T, 20, 1755)), { mat: "solid" }) + // firewall
      K.cut(V, sv(K.rect(20, 880, BREAK_FS, 896)), { mat: "solid" }) + // cabin floor
      frames.join("") +
      X.freehand(V, sv([[BREAK_FS, C.floor - 1], [BREAK_FS + 20, 1150], [BREAK_FS - 10, 1500], [BREAK_FS + 15, 1800], [BREAK_FS, C.roof + 1]]), 1.1, 3)
  );
}

export function windscreenSide(V) {
  const g = [M.WINDSCREEN.base, M.WINDSCREEN.top];
  const band = [...g, ...g.slice().reverse().map(([f, w]) => [f + 8, w - 16])];
  return part(21, K.cut(V, sv(band), { mat: "plastic", angle: 135 }));
}

export function engineSide(V) {
  const T0 = M.THRUST_WL;
  const caseOut = [
    [-800, 1150], [-790, 1395], [-170, 1395], [-150, 1375], [-150, 1150], [-300, 1130], [-300, 1040], [-330, 1025], [-610, 1025], [-640, 1040], [-640, 1130],
  ];
  const crank = K.rect(-905, T0 - 28, -170, T0 + 28);
  const flange = K.rect(-905, T0 - 80, -890, T0 + 80);
  const carb = [[-440, 905], [-330, 905], [-330, 1025], [-440, 1025]];
  const mag = K.rect(-140, 1330, -60, 1395);
  const alt = K.rect(-830, 1050, -720, 1140);
  const vac = K.rect(-140, 1170, -70, 1250);
  return part(
    5,
    K.body(V, sv(alt)) + K.body(V, sv(mag)) + K.body(V, sv(vac)) +
      K.cut(V, sv(caseOut), { mat: "alu", angle: 45 }) +
      K.body(V, sv(crank)) + K.body(V, sv(flange)) +
      K.cut(V, sv(carb), { mat: "alu", angle: 135 }) +
      K.line(V, sv([[-385, 905], [-385, 1025]]), "thin")
  );
}

export function mountSide(V) {
  const tube = (a, b, w = 24) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    const nx = (-dy / l) * (w / 2);
    const ny = (dx / l) * (w / 2);
    return K.body(V, sv([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]));
  };
  const A = [0, 1010];
  const B = [0, 1600];
  const c = [-160, 1170];
  const d = [-160, 1380];
  return part(7, tube(A, c) + tube(A, d) + tube(B, d) + tube(B, c) + K.body(V, sv(K.rect(-180, 1140, -150, 1410))));
}

export function batterySide(V) {
  return part(19, K.body(V, sv(K.rect(-240, 1460, -80, 1650))) + K.body(V, sv(K.rect(-210, 1650, -180, 1672))) + K.body(V, sv(K.rect(-140, 1650, -110, 1672))));
}

export function cowlSide(V) {
  // the cowling's lip at the inlet and its join to the firewall, cut on the centreline; the skins are
  // drawn with the fuselage outline (the cowl is a separate part: its balloon lands on the lip)
  const lip = [[M.COWL.front, cowlTop(M.COWL.front)], [M.COWL.front + 40, cowlTop(M.COWL.front + 40)], [M.COWL.front + 40, cowlTop(M.COWL.front + 40) - 26], [M.COWL.front, cowlTop(M.COWL.front) - 26]];
  const lipB = [[M.COWL.front, cowlBot(M.COWL.front)], [M.COWL.front + 40, cowlBot(M.COWL.front + 40)], [M.COWL.front + 40, cowlBot(M.COWL.front + 40) + 26], [M.COWL.front, cowlBot(M.COWL.front) + 26]];
  const top = range(M.COWL.front + 40, 0, N).map((f) => [f, cowlTop(f)]);
  const bot = range(M.COWL.front + 40, 0, N).map((f) => [f, cowlBot(f)]);
  const band = (line, s) => [...line, ...line.slice().reverse().map(([f, w]) => [f, w + s * T])];
  return part(8, K.cut(V, sv(band(top, -1)), { mat: "solid" }) + K.cut(V, sv(band(bot, 1)), { mat: "solid" }) + K.cut(V, sv(lip), { mat: "plastic", angle: 45 }) + K.cut(V, sv(lipB), { mat: "plastic", angle: 45 }));
}

export function panelSide(V) {
  const inst = [1600, 1420].map((w) => K.body(V, sv(K.rect(170, w - 42, 300, w + 42)))).join("");
  return part(18, inst + K.cut(V, sv(K.rect(300, 1250, 332, 1758)), { mat: "alu", angle: 135 }) + K.cut(V, sv([[332, 1758], [470, 1772], [470, 1790], [300, 1790], [300, 1758]]), { mat: "plastic", angle: 45 }));
}

export function controlsSide(V) {
  const col = K.rect(332, 1468, 560, 1498);
  const wheel = K.rrect(560, 1370, 594, 1640, 14);
  const pedal = [[120, 900], [160, 900], [215, 1060], [185, 1070]];
  return part(10, K.body(V, sv(col)) + K.body(V, sv(wheel)) + K.body(V, sv(pedal)) + K.line(V, sv([[600, 845], [BREAK_FS, 845]]), "thin") + K.line(V, sv([[600, 862], [BREAK_FS, 862]]), "thin"));
}

export function seatsSide(V) {
  const cushion = [[1000, 1000], [1440, 1010], [1450, 1110], [1010, 1120]];
  const back = [[1400, 1110], [1500, 1110], [1600, 1770], [1530, 1790]];
  const rails = K.rect(980, 896, 1480, 930);
  const bench = [[1950, 905], [2380, 905], [2380, 1040], [1960, 1050]];
  const bback = [[2280, 1040], [2380, 1040], [2420, 1700], [2340, 1710]];
  return part(20, K.body(V, sv(rails)) + K.body(V, sv(cushion)) + K.body(V, sv(back)) + K.cut(V, sv(bench), { mat: "foam" }) + K.cut(V, sv(bback), { mat: "foam" }));
}

// the near (starboard) wing seen from the side: the fixed wing's silhouette over every station
export function wingSide(V) {
  const pts = [];
  for (let ws = 0; ws <= M.TIP_WS; ws += 250) pts.push(...fixedSection(ws));
  const sil = X.hull(pts);
  const tip = fixedSection(M.TIP_WS);
  return part(2, K.body(V, sv(sil)) + K.line(V, sv(tip), "vis", true));
}

// the near flap: its silhouette over its span (it keeps its section; only the dihedral lifts it)
export function flapSide(V, deg) {
  const a = surfOn(flapLocal(deg), M.FLAP_WS[0]);
  const b = surfOn(flapLocal(deg), M.FLAP_WS[1]);
  return part(14, K.body(V, sv(X.hull([...a, ...b]))) + K.line(V, sv(b), "thin", true));
}
export function aileronSide(V, deg) {
  const a = surfOn(aileronLocal(deg), M.AILERON_WS[0]);
  const b = surfOn(aileronLocal(deg), M.AILERON_WS[1]);
  return part(11, K.body(V, sv(X.hull([...a, ...b]))) + K.line(V, sv(b), "thin", true));
}

// the strut from the fuselage side to the wing's underside at WS 3000
export const STRUT = { fs0: 1150, wl0: 930, bl0: C.half, ws1: 3000, fs1: 1060, chord: 100, width: 60 };
export const strutTopWL = () => {
  const s = fixedSection(STRUT.ws1);
  // the lower surface at the strut's FS
  const lower = s.filter(([, w], i) => i >= s.length / 2);
  let best = lower[0];
  for (const p of lower) if (Math.abs(p[0] - STRUT.fs1) < Math.abs(best[0] - STRUT.fs1)) best = p;
  return best[1] - 4;
};
export function strutSide(V) {
  const w1 = strutTopWL();
  const c = STRUT.chord / 2;
  return part(3, K.body(V, sv([[STRUT.fs0 - c, STRUT.wl0], [STRUT.fs0 + c, STRUT.wl0], [STRUT.fs1 + c, w1], [STRUT.fs1 - c, w1]])));
}

export function mainGearSide(V) {
  const g = M.MAIN_GEAR;
  const r = g.tyreD / 2;
  const leg = [[g.fs - 38, C.floor], [g.fs + 38, C.floor], [g.fs + 26, r + 30], [g.fs - 26, r + 30]];
  return part(
    15,
    K.body(V, sv(leg)) +
      K.body(V, sv(K.circle(g.fs, r, r, 48))) +
      K.line(V, sv(K.circle(g.fs, r, r - 32, 40)), "thin", true) +
      K.body(V, sv(K.circle(g.fs, r, 115, 32))) +
      K.body(V, sv(K.rect(g.fs + 60, r - 40, g.fs + 130, r + 40))) +
      K.body(V, sv(K.circle(g.fs, r, 30, 16)))
  );
}

export function noseGearSide(V) {
  const g = M.NOSE_GEAR;
  const r = g.tyreD / 2;
  const strut = K.rect(g.fs - 40, 420, g.fs + 40, 1000);
  const lower = K.rect(g.fs - 28, 300, g.fs + 28, 430);
  const fork = [[g.fs - 120, 300], [g.fs + 60, 300], [g.fs + 30, r], [g.fs - 30, r], [g.fs - 120, 330]];
  const damper = K.rect(g.fs + 40, 600, g.fs + 230, 632);
  return part(
    16,
    K.body(V, sv(damper)) + K.body(V, sv(strut)) + K.body(V, sv(lower)) +
      K.body(V, sv(fork)) +
      K.body(V, sv(K.circle(g.fs, r, r, 44))) +
      K.line(V, sv(K.circle(g.fs, r, r - 28, 36)), "thin", true) +
      K.body(V, sv(K.circle(g.fs, r, 64, 24))) +
      K.body(V, sv(K.circle(g.fs, r, 22, 12)))
  );
}

export function spinnerSide(V) {
  const S = M.SPINNER;
  const T0 = M.THRUST_WL;
  const sp = [[S.tip, T0], [S.tip + 50, T0 + 118], [S.tip + 120, T0 + 160], [S.base, T0 + S.r], [S.base, T0 - S.r], [S.tip + 120, T0 - 160], [S.tip + 50, T0 - 118]];
  return X.skin(V, sv(sp), 5);
}
// a blade seen edge-on from the side or from above: its length along the view is R·cos ψ
export function bladeEdge(V, psi, view) {
  const R = M.PROP_D / 2;
  const T0 = M.THRUST_WL;
  const k = view === "side" ? Math.cos(psi) : Math.sin(psi);
  const half = 38;
  let out = "";
  for (const sgn of [1, -1]) {
    const L = sgn * k * R;
    const r0 = sgn * k * 175;
    if (Math.abs(L - r0) < 1) continue;
    const pts = [[M.PROP_FS - half, r0], [M.PROP_FS + half, r0], [M.PROP_FS + half * 0.8, L * 0.93], [M.PROP_FS, L], [M.PROP_FS - half * 0.8, L * 0.93]];
    out += K.body(V, view === "side" ? sv(pts.map(([f, s]) => [f, T0 + s])) : pv(pts.map(([f, s]) => [f, s])));
  }
  return out;
}
export const propSide = (V, psi) => part(6, bladeEdge(V, psi, "side") + spinnerSide(V) + K.cut(V, sv(K.rect(-965, M.THRUST_WL - 70, -905, M.THRUST_WL + 70)), { mat: "alu", angle: 135 }));

export const finSide = (V) => part(4, K.body(V, sv(FIN)) + K.line(V, sv([[5250, 1360 + M.coneR(5250) + 4], [M.RUDDER_HINGE_FS - 10, 1360 + M.coneR(6490) + 4]]), "thin"));
export const stabSide = (V) => part(4, K.body(V, sv(STAB_SEC)));
export function rudderSide(V, deg) {
  const c = Math.cos(deg * rad);
  return part(13, K.body(V, sv(RUDDER.map(([f, w]) => [M.RUDDER_HINGE_FS + (f - M.RUDDER_HINGE_FS) * c, w]))));
}
export const elevatorSideP = (V, deg) => part(12, K.body(V, sv(elevatorSide(deg))));


// ---------------------------------------------------------------- PLAN (from above)
export function fuselagePlan(V) {
  const o = planOutline();
  const screen = [[0, -560], [M.WINDSCREEN.top[0], -560], [M.WINDSCREEN.top[0], 560], [0, 560]];
  return part(1, K.body(V, pv(o)) + K.line(V, pv([[CT.fs0, -C.half], [CT.fs0, C.half]]), "thin"));
}
export const windscreenPlan = (V) => part(21, K.body(V, pv([[4, -560], [M.WINDSCREEN.top[0] - 4, -575], [M.WINDSCREEN.top[0] - 4, 575], [4, 560]])) + K.line(V, pv([[40, -530], [40, 530]]), "thin"));
export const cowlPlan = (V) => part(8, K.body(V, pv([...range(M.COWL.front, 0, N).map((f) => [f, M.cowlR(f)]), ...range(0, M.COWL.front, N).map((f) => [f, -M.cowlR(f)])])) + K.line(V, pv([[-600, -120], [-600, 120]]), "thin"));
export function spinnerPlan(V) {
  const S = M.SPINNER;
  return [[S.tip, 0], [S.tip + 50, 118], [S.tip + 120, 160], [S.base, S.r], [S.base, -S.r], [S.tip + 120, -160], [S.tip + 50, -118]];
}
export const propPlan = (V, psi) => part(6, K.body(V, pv(spinnerPlan(V))) + bladeEdge(V, psi, "plan"));

// fixed wing in plan, one side (sgn −1 port, +1 starboard), with the root fairing behind the hinge
export function wingPlanOutline(sgn) {
  const s = (pts) => pts.map(([f, b]) => [f, sgn * b]);
  return s([[M.LE_FS, 0], [M.LE_FS, M.BREAK_WS], [M.leAt(M.TIP_WS), M.TIP_WS], [M.HINGE_FS, M.TIP_WS], [M.HINGE_FS, M.FLAP_WS[0]], [M.TE_FS, M.FLAP_WS[0]], [M.TE_FS, 0]]);
}
// the peeled bay of the port wing: upper skin removed between the spars to show the tank and ribs
export const PEEL = { ws0: 880, ws1: 2470, fs0: 985, fs1: M.HINGE_FS - 2 };
export function wingPlan(V) {
  const sp = M.LE_FS + M.SPAR_X * M.ROOT_CHORD;
  const peel = [[PEEL.fs0, -PEEL.ws0], [PEEL.fs1, -PEEL.ws0], [PEEL.fs1, -PEEL.ws1], [PEEL.fs0, -PEEL.ws1]];
  const ribs = [900, 1820, 2450].map((w) => K.body(V, pv(K.rect(sp + 14, -w - 8, M.HINGE_FS - 14, -w + 8)))).join("");
  return part(
    2,
    K.body(V, pv(wingPlanOutline(1))) +
      K.body(V, pv(wingPlanOutline(-1))) +
      K.line(V, pv([[sp, 0], [sp, M.BREAK_WS], [M.leAt(M.TIP_WS) + M.SPAR_X * M.TIP_CHORD, M.TIP_WS - 60]]), "hid") +
      `<path class="paper" d="${K.d(V, pv(peel))}"/>` +
      X.freehand(V, pv([[PEEL.fs0 + 6, -PEEL.ws0], [PEEL.fs0, -1300], [PEEL.fs0 + 10, -1800], [PEEL.fs0 - 4, -2200], [PEEL.fs0 + 4, -PEEL.ws1]]), 1, 7) +
      X.freehand(V, pv([[PEEL.fs0 + 4, -PEEL.ws1], [1300, -PEEL.ws1 - 10], [1600, -PEEL.ws1 + 6], [PEEL.fs1, -PEEL.ws1]]), 1, 9) +
      X.freehand(V, pv([[PEEL.fs0 + 6, -PEEL.ws0], [1300, -PEEL.ws0 + 8], [1600, -PEEL.ws0 - 6], [PEEL.fs1, -PEEL.ws0]]), 1, 11) +
      K.body(V, pv(K.rect(sp - 12, -PEEL.ws1 + 4, sp + 12, -PEEL.ws0 - 4))) +
      ribs
  );
}
export const TANK = { ws0: 920, ws1: 1800, fs0: M.LE_FS + M.SPAR_X * M.ROOT_CHORD + 22, fs1: M.HINGE_FS - 18 };
export function tankPlan(V) {
  const t = TANK;
  return part(9, K.body(V, pv(K.rrect(t.fs0, -t.ws1, t.fs1, -t.ws0, 20))) + K.body(V, pv(K.circle(1250, -1250, 45, 20))) + K.line(V, pv(K.circle(1250, -1250, 28, 16)), "thin", true) + K.line(V, pv([[t.fs0 + 30, -t.ws0 - 40], [t.fs0 + 30, -t.ws1 + 40]]), "thin"));
}
// moving surfaces in plan: their chord shows foreshortened, from the deflected section's FS extent
export function flapPlan(V, deg) {
  const [f0, f1] = fsRange(surfOn(flapLocal(deg), M.FLAP_WS[0]));
  return part(14, [-1, 1].map((s) => K.body(V, pv(K.rect(f0, s * M.FLAP_WS[0], f1, s * M.FLAP_WS[1])))).join(""));
}
export function aileronPlan(V, port, stbd) {
  const one = (deg, s) => {
    const [f0, f1] = fsRange(surfOn(aileronLocal(deg), M.AILERON_WS[0]));
    return K.body(V, pv(K.rect(f0, s * M.AILERON_WS[0], f1, s * M.AILERON_WS[1])));
  };
  return part(11, one(port, -1) + one(stbd, 1));
}
export function tailplanePlan(V) {
  const s = (sg) => [[TP.le, 0], [TP.tipLe, sg * TP.span / 2], [TP.hinge, sg * TP.span / 2], [TP.hinge, 0]];
  return part(4, K.body(V, pv(s(-1))) + K.body(V, pv(s(1))));
}
export function finPlan(V) {
  return part(4, K.body(V, pv(finTop.fin)));
}
export const rudderPlan = (V, deg) => part(13, K.body(V, pv(rudderTop(deg))));
export function elevatorPlan(V, deg) {
  const c = Math.cos(deg * rad);
  const te = (bl) => TP.te + ((TP.tipTe - TP.te) * Math.abs(bl)) / (TP.span / 2);
  const half = (sg) => {
    const a = 250;
    const b = TP.span / 2;
    return [[TP.hinge + 12, sg * a], [TP.hinge + 12 + (te(a) - TP.hinge) * c, sg * a], [TP.hinge + 12 + (te(b) - TP.hinge) * c, sg * b], [TP.hinge + 12, sg * b]];
  };
  return part(12, K.body(V, pv(half(-1))) + K.body(V, pv(half(1))));
}
export const PITOT = { ws: 3800, fs0: 560, fs1: 1060 };
export function pitotPlan(V) {
  const p = PITOT;
  const le = M.leAt(p.ws);
  return part(17, K.body(V, pv([[p.fs0, -p.ws - 13], [le, -p.ws - 13], [le, -p.ws + 13], [p.fs0, -p.ws + 13]])) + K.line(V, pv([[le, -p.ws - 13], [p.fs1, -p.ws - 13], [p.fs1, -p.ws + 13], [le, -p.ws + 13]]), "hid"));
}
// hidden under the wing: struts and main wheels; under the cowl: the nose wheel
export function hiddenPlan(V) {
  const g = M.MAIN_GEAR;
  const n = M.NOSE_GEAR;
  let out = "";
  for (const s of [-1, 1]) {
    out += K.line(V, pv([[STRUT.fs0, s * C.half], [STRUT.fs1, s * STRUT.ws1]]), "hid");
    out += K.line(V, pv(K.rect(g.fs - g.tyreD / 2, s * (g.track / 2) - g.tyreW / 2, g.fs + g.tyreD / 2, s * (g.track / 2) + g.tyreW / 2)), "hid", true);
  }
  out += K.line(V, pv(K.rect(n.fs - n.tyreD / 2, -n.tyreW / 2, n.fs + n.tyreD / 2, n.tyreW / 2)), "hid", true);
  return out;
}

// ---------------------------------------------------------------- FRONT VIEW (from ahead)
// the fixed wing's outline seen from ahead, one side, with dihedral
export function wingFrontOutline(sgn) {
  const top = [];
  const bot = [];
  for (let ws = 0; ws <= M.TIP_WS; ws += 250) {
    const [lo, hi] = wlRange(fixedSection(ws));
    top.push([sgn * ws, hi]);
    bot.push([sgn * ws, lo]);
  }
  return [...top, ...bot.reverse()];
}
export const wingLowAt = (ws) => wlRange(fixedSection(ws))[0];
export const wingTopAt = (ws) => wlRange(fixedSection(ws))[1];
export function wingFront(V) {
  return part(2, K.body(V, fv(wingFrontOutline(-1))) + K.body(V, fv(wingFrontOutline(1))));
}
// a deflected surface seen from ahead: the band it shows below (or above) the wing between two stations
function surfaceBand(local, ws0, ws1, sgn) {
  const [lo0, hi0] = wlRange(surfOn(local, ws0));
  const [lo1, hi1] = wlRange(surfOn(local, ws1));
  let out = [];
  const wl0 = wingLowAt(ws0);
  const wl1 = wingLowAt(ws1);
  if (lo0 < wl0 - 1) out.push([[sgn * ws0, wl0 + 1], [sgn * ws1, wl1 + 1], [sgn * ws1, lo1], [sgn * ws0, lo0]]);
  const wt0 = wingTopAt(ws0);
  const wt1 = wingTopAt(ws1);
  if (hi0 > wt0 + 1) out.push([[sgn * ws0, wt0 - 1], [sgn * ws1, wt1 - 1], [sgn * ws1, hi1], [sgn * ws0, hi0]]);
  return out;
}
export function flapFront(V, deg) {
  const local = flapLocal(deg);
  const bands = [-1, 1].flatMap((s) => surfaceBand(local, M.FLAP_WS[0], M.FLAP_WS[1], s));
  return part(14, bands.map((b) => K.body(V, fv(b))).join(""));
}
export function aileronFront(V, port, stbd) {
  const bands = [...surfaceBand(aileronLocal(port), M.AILERON_WS[0], M.AILERON_WS[1], -1), ...surfaceBand(aileronLocal(stbd), M.AILERON_WS[0], M.AILERON_WS[1], 1)];
  return part(11, bands.map((b) => K.body(V, fv(b))).join(""));
}
export function fuselageFront(V) {
  const box = cabinSection(0);
  // the tail cone's widest ring shows beside the cabin box
  const ring = K.circle(0, CT.axis, CT.r0, 72);
  const side = (s) => ring.filter(([b, w]) => s * b > C.half - 30 && w > C.floor + C.rBottom && w < C.roof - C.rTop);
  return part(1, K.line(V, fv(side(1)), "vis") + K.line(V, fv(side(-1)), "vis") + K.body(V, fv(box)) + K.line(V, fv([[-C.half + 20, M.WINDSCREEN.base[1]], [C.half - 20, M.WINDSCREEN.base[1]]]), "thin"));
}
export function cowlFront(V) {
  return part(8, K.body(V, fv(K.circle(0, M.THRUST_WL, M.COWL.r1 - 2, 72))) + K.line(V, fv(K.circle(0, M.THRUST_WL, M.COWL.r0, 64)), "vis", true) + K.line(V, fv(K.circle(0, M.THRUST_WL, M.COWL.r0 - 20, 64)), "thin", true));
}
// a blade in its own plane: planform rotated by ψ about the shaft (front view: seen from ahead)
export function bladePlanform() {
  const R = M.PROP_D / 2;
  const w = (r) => {
    const x = r / R;
    return 46 + 60 * Math.sin(Math.PI * Math.min(1, (x - 0.12) / 0.95)) * (x < 0.92 ? 1 : 0.6);
  };
  const rs = range(165, R * 0.97, 14);
  const lead = rs.map((r) => [w(r), r]);
  const trail = rs.map((r) => [-w(r) * 0.7, r]).reverse();
  return [...lead, ...K.arc(0, R * 0.97, 30, 0, 180, 6).map(([a, b]) => [a * 1, b + 0]).slice(1, -1), ...trail];
}
export function propFront(V, psi) {
  const blade = bladePlanform();
  const one = (a) => X.rot(blade, [0, 0], a).map(([x, y]) => [x, M.THRUST_WL + y]);
  const deg = (psi * 180) / Math.PI;
  // front view: u = −BL; the blade angle ψ is measured from vertical, rotating anticlockwise seen from ahead
  return part(6, K.body(V, fv(one(-deg))) + K.body(V, fv(one(180 - deg))) + K.body(V, fv(K.circle(0, M.THRUST_WL, M.SPINNER.r, 40))) + K.line(V, fv(K.circle(0, M.THRUST_WL, 60, 20)), "thin", true));
}
export function strutFront(V) {
  const w1 = strutTopWL();
  const one = (s) => {
    const a = [s * C.half, STRUT.wl0];
    const b = [s * STRUT.ws1, w1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    const nx = (-dy / l) * (STRUT.width / 2);
    const ny = (dx / l) * (STRUT.width / 2);
    return K.body(V, fv([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]));
  };
  return part(3, one(-1) + one(1));
}
export function mainGearFront(V) {
  const g = M.MAIN_GEAR;
  const one = (s) => {
    const x = s * (g.track / 2);
    const leg = [[s * 330, C.floor], [s * 410, C.floor], [x - s * (g.tyreW / 2 + 4), g.tyreD / 2 + 24], [x - s * (g.tyreW / 2 + 4), g.tyreD / 2 - 24]];
    return K.body(V, fv(leg)) + K.body(V, fv(K.rrect(x - g.tyreW / 2, 0, x + g.tyreW / 2, g.tyreD, 62))) + K.line(V, fv([[x, 40], [x, g.tyreD - 40]]), "thin");
  };
  return part(15, one(-1) + one(1));
}
export function noseGearFront(V) {
  const g = M.NOSE_GEAR;
  const fork = [[-95, 440], [95, 440], [95, g.tyreD / 2], [76, g.tyreD / 2], [76, 400], [-76, 400], [-76, g.tyreD / 2], [-95, g.tyreD / 2]];
  return part(16, K.body(V, fv(K.rect(-40, 440, 40, cowlBot(g.fs) + 2))) + K.body(V, fv(K.rrect(-g.tyreW / 2, 0, g.tyreW / 2, g.tyreD, 50))) + K.body(V, fv(fork)));
}
export function tailFront(V) {
  const stab = (s) => [[s * 640, TP.wl - 45], [s * TP.span / 2, TP.wl - 30], [s * TP.span / 2, TP.wl + 30], [s * 640, TP.wl + 45]];
  return part(4, K.body(V, fv(stab(-1))) + K.body(V, fv(stab(1))) + K.body(V, fv([[-FIN_T / 2, C.roof - 2], [FIN_T / 2, C.roof - 2], [24, 2700], [-24, 2700]])));
}
export function rudderFront(V, deg) {
  const sn = Math.sin(deg * rad);
  if (Math.abs(sn) < 0.01) return part(13, "");
  // the rudder's trailing edge swings sideways by (FS − hinge)·sin δ at each height; below the cabin roof
  // the fuselage hides it. TE to starboard is +BL.
  const te = [[C.roof, M.TAIL_TE_FS - ((M.TAIL_TE_FS - 6980) * (C.roof - 1900)) / 700], [2600, 6980], [2720, 6860]];
  const half = 24 * Math.sign(sn);
  const pts = [[half, C.roof], ...te.map(([w, f]) => [half + (f - M.RUDDER_HINGE_FS) * sn, w]), [half, 2720]];
  return part(13, K.body(V, fv(pts)));
}
export function elevatorFront(V, deg) {
  const s = Math.sin(deg * rad);
  const ce = TP.te - TP.hinge;
  const dz = -ce * s; // TE down positive: the TE moves down
  if (Math.abs(dz) < 6) return part(12, "");
  const wl = TP.wl + Math.sign(dz) * 30;
  const half = (sg) => [[sg * 640, wl], [sg * TP.span / 2, wl], [sg * TP.span / 2, TP.wl + dz], [sg * 640, TP.wl + dz]];
  return part(12, K.body(V, fv(half(-1))) + K.body(V, fv(half(1))));
}
export function pitotFront(V) {
  const p = PITOT;
  const w = wingLowAt(p.ws);
  return part(17, K.body(V, fv(K.rect(-p.ws - 8, w - 70, -p.ws + 8, w + 2))) + K.body(V, fv(K.circle(-p.ws, w - 80, 16, 16))));
}
export function windscreenFront(V) {
  return part(21, K.body(V, fv([[-C.half + 30, M.WINDSCREEN.base[1] + 6], [C.half - 30, M.WINDSCREEN.base[1] + 6], [C.half - 30, C.roof - 30], [-C.half + 30, C.roof - 30]])));
}

// ---------------------------------------------------------------- SECTION A-A: the port wing at WS 1500
export const AA_WS = 1500;
export function sectionAA(V, flapDeg) {
  const ws = AA_WS;
  const sp = M.SPAR_X;
  const h = M.HINGE_X;
  const nose = onSection(foilPart(0, h), ws);
  const t = 4; // skins at 1:10, drawn 4 mm (0.8 units, thickened to read): blacked in
  const sparAt = (x, w) => {
    const u = upAt(x);
    const l = loAt(x);
    return onSection([[x, l], [x + w, l], [x + w, u], [x, u]], ws);
  };
  const spar1 = X.inset(sparAt(sp, 0.018), 0.4);
  const spar2 = X.inset(sparAt(h - 0.014, 0.014), 0.4);
  const tank = onSection(foilPart(sp + 0.03, h - 0.03), ws);
  const tankIn = X.inset(tank, 9);
  return {
    wingBack: part(2, `<path class="paper" d="${K.d(V, sv(nose))}"/>`),
    wing: part(2, X.skin(V, sv(nose), t) + K.cut(V, sv(spar1), { mat: "solid" }) + K.cut(V, sv(spar2), { mat: "solid" })),
    tank: part(9, `<path class="paper" d="${K.d(V, sv(X.inset(tank, 6)))}"/>` + X.cutHoles(V, sv(X.inset(tank, 6)), [sv(X.inset(tank, 9))], { mat: "solid" })),
    flap: part(14, `<path class="paper" d="${K.d(V, sv(surfOn(flapLocal(flapDeg), ws)))}"/>` + X.skin(V, sv(surfOn(flapLocal(flapDeg), ws)), t)),
    tankIn,
  };
}
// the flap track: a steel bracket below the rear spar whose slot is an arc about the flap's virtual
// hinge; the roller on the flap's nose runs in it. Returns world (FS, WL) geometry at WS 1500.
export const ROLLER = [M.HINGE_X + GAP + 0.03, loAt(M.HINGE_X + 0.04) + 0.012];
export function flapTrack() {
  const P = M.FLAP_PIVOT;
  const r = Math.hypot(ROLLER[0] - P[0], ROLLER[1] - P[1]);
  const a0 = (Math.atan2(ROLLER[1] - P[1], ROLLER[0] - P[0]) * 180) / Math.PI;
  const slot = K.arc(P[0], P[1], r, a0 - 31, a0, 12);
  const pts = [[M.HINGE_X - 0.07, loAt(M.HINGE_X - 0.07) + 0.004], [M.HINGE_X - 0.01, loAt(M.HINGE_X - 0.01) + 0.004], ...K.arc(P[0], P[1], r + 0.02, a0 - 34, a0 + 3, 10), ...K.arc(P[0], P[1], r - 0.02, a0 - 34, a0 + 3, 10)];
  return { bracket: onSection(X.hull(pts), AA_WS), slot: surfOn(slot, AA_WS), r, a0 };
}
export const rollerAt = (deg) => surfOn(X.rot([ROLLER], M.FLAP_PIVOT, -deg), AA_WS)[0];

// ---------------------------------------------------------------- VIEW C: the airspeed indicator (1:1)
export const ASI = { r: 40, v0: 30, v1: 170, a0: 15, a1: 330 };
// dial angle (degrees, counter-clockwise from +u) for an airspeed: 30 kt near twelve o'clock, clockwise
export const asiAngle = (v) => 90 - (ASI.a0 + ((Math.min(ASI.v1, Math.max(ASI.v0, v)) - ASI.v0) / (ASI.v1 - ASI.v0)) * (ASI.a1 - ASI.a0));
export function asiNeedle(V, v) {
  const pts = X.rot([[27, 0], [0, 1.1], [-6, 0.8], [-6, -0.8], [0, -1.1]], [0, 0], asiAngle(v));
  return K.cut(V, pts, { mat: "solid" }) + K.body(V, K.circle(0, 0, 2.4, 16));
}
export const rollerCircle = (V, deg) => K.body(V, sv(K.circle(...rollerAt(deg), 14, 16)));
