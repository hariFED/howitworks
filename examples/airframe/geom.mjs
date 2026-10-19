// The airframe's members, as geometry both the sheet (parts.mjs) and the 3D view (scene3d.mjs) read.
// Pure. Built on the aircraft's own lines: its wing sections (light-aircraft parts.mjs, inlined as P),
// its cabin and tail-cone sections (light-aircraft scene3d.mjs's coneSection, inlined as LA) and the
// structural model (model.mjs, as ST). Frames as BP-022: FS aft, WL up, BL to starboard (mm); the port
// wing is drawn, WS = −BL.

import * as K from "../../kit/draft.mjs";
import * as M from "../light-aircraft/model.mjs";
import * as P from "../light-aircraft/parts.mjs";
import * as LA from "../light-aircraft/scene3d.mjs";
import * as ST from "./model.mjs";

const C = M.CABIN;
const CT = M.TAILCONE;
const rad = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- wing
export const RIB_WS = [600, 1000, 1400, 1800, 2200, 2600, 3000, 3400, 3800, 4200, 4600, 5000, 5440];
export const FRONT_X = ST.SPAR_X;
export const SPAR_W = 0.012; // front spar's chordwise width (caps), chord fraction
export const rearX = ST.rearX;
export const up = P.upAt;
export const lo = P.loAt;
// (ξ, η) local chord fractions → [FS, WL] at a station
export const on = (pts, ws) => P.onSection(pts, ws);
// rib outlines in (ξ, η): the main rib between the spars, the nose rib ahead of the front spar
export const ribMain = (ws) => P.foilPart(FRONT_X + SPAR_W, rearX(ws) - 0.004);
export const ribNose = () => P.foilPart(0.006, FRONT_X);
// a spar's upper and lower surface points at a station
export const sparTop = (x, ws) => on([[x, up(x)]], ws)[0];
export const sparBot = (x, ws) => on([[x, lo(x)]], ws)[0];
// the whole fixed section ahead of the rear spar at a station
export const wingSection = (ws) => P.foilPart(0, rearX(ws));

// ---------------------------------------------------------------- fuselage sections (BL, WL)
// cabin: the rounded box; tail cone: the aircraft's own lofted section at that FS
export const sectionAt = (fs) => (fs <= CT.fs0 ? { a: C.half, top: C.roof, bot: C.floor, rt: C.rTop, rb: C.rBottom } : LA.coneSection(fs));
// a rounded box outline, inset; anticlockwise seen from ahead (+BL right), from the bottom centre
export function boxOutline(sec, inset = 0, n = 6) {
  const a = sec.a - inset;
  const top = sec.top - inset;
  const bot = sec.bot + inset;
  const rt = Math.max(0.5, sec.rt - inset);
  const rb = Math.max(0.5, sec.rb - inset);
  return [
    ...K.arc(a - rb, bot + rb, rb, -90, 0, n),
    ...K.arc(a - rt, top - rt, rt, 0, 90, n),
    ...K.arc(-(a - rt), top - rt, rt, 90, 180, n),
    ...K.arc(-(a - rb), bot + rb, rb, 180, 270, n),
  ];
}
// cabin frames (full rings), roof carry-through frames over the spars (top arc only), cone frames
export const FIREWALL_FS = 0;
export const CABIN_FRAMES = [640, 1590, 2450];
export const ROOF_FRAMES = [Math.round(M.LE_FS + M.SPAR_X * M.ROOT_CHORD), Math.round(M.HINGE_FS)]; // 1018, 1831
export const CONE_FRAMES = [3000, 3600, 4200, 4800, 5400, 6000, 6490];
export const FRAMES = [...CABIN_FRAMES, ...CONE_FRAMES];
export const FRAME_DEPTH = (fs) => (fs <= CT.fs0 ? 60 : 45); // mm, frame's depth inward from the skin
// longerons at the four corners, stringers on the cone's sides, top and bottom: a point at a station
const corner = (sec, which) => {
  const r = which === "top" ? sec.rt : sec.rb;
  const cy = which === "top" ? sec.top - r : sec.bot + r;
  const s = which === "top" ? 1 : -1;
  return [sec.a - r + r * Math.cos(45 * rad), cy + s * r * Math.sin(45 * rad)];
};
export const LONGERONS = [
  { side: -1, which: "top" },
  { side: 1, which: "top" },
  { side: -1, which: "bot" },
  { side: 1, which: "bot" },
];
export const longeronAt = (l, fs, inset = 0) => {
  const sec = sectionAt(fs);
  const [b, w] = corner({ ...sec, a: sec.a - inset, top: sec.top - inset, bot: sec.bot + inset, rt: Math.max(1, sec.rt - inset), rb: Math.max(1, sec.rb - inset) }, l.which);
  return [fs, w, l.side * b];
};
export const LONGERON_FS = [FIREWALL_FS, ...FRAMES];
// stringers: from the cabin's rear frame to the tail post
export const STRINGERS = [
  { side: -1, k: 0.5 },
  { side: 1, k: 0.5 },
  { side: 0, k: 1 },
  { side: 0, k: 0 },
];
export const STRINGER_FS = CONE_FRAMES.slice();
STRINGER_FS.unshift(C.fs1);
export function stringerAt(s, fs, inset = 0) {
  const sec = sectionAt(fs);
  if (s.side === 0) return [fs, s.k ? sec.top - inset : sec.bot + inset, 0];
  return [fs, (sec.top + sec.bot) / 2, s.side * (sec.a - inset)];
}
// the cabin door's frame on the port side, FS and WL (the door is 640…1590 between its posts)
export const DOOR = { fs0: 640, fs1: 1590, wl0: 952, wl1: 1890, w: 40 };

// ---------------------------------------------------------------- strut and fittings
export const STRUT_LO = ST.STRUT_LO;
export const STRUT_HI = ST.STRUT_HI;
// [FS, WL, BL] of a point a fraction t up the port strut
export const strutAt = (t) => [lerp(STRUT_LO.fs, STRUT_HI.fs, t), lerp(STRUT_LO.wl, STRUT_HI.wl, t), -lerp(STRUT_LO.bl, STRUT_HI.bl, t)];

// ---------------------------------------------------------------- empennage
const TP = M.TAILPLANE;
export const TP_FRONT = 6400; // tailplane front spar, FS
export const TP_AFT = Math.max(...P.STAB_SEC.map(([fs]) => fs)); // the tailplane's aft face, at the elevator hinge
export const TP_REAR = TP_AFT - 10; // rear spar
export const TP_RIBS = [60, 420, 780, 1140, 1500, TP.span / 2 - 20];
const tpLe = (bl) => lerp(TP.le, TP.tipLe, clamp(Math.abs(bl) / (TP.span / 2), 0, 1));
const tpTe = (bl) => lerp(TP.te, TP.tipTe, clamp(Math.abs(bl) / (TP.span / 2), 0, 1));
const tpK = (bl) => (tpTe(bl) - tpLe(bl)) / (TP.te - TP.le);
// the tailplane's root section ahead of the hinge (FS, WL), taken to station bl as the aircraft does
export const tpSection = (bl) => P.STAB_SEC.map(([fs, wl]) => [tpLe(bl) + ((fs - TP.le) * (TP.hinge - tpLe(bl))) / (TP.hinge - TP.le), TP.wl + (wl - TP.wl) * tpK(bl)]);
export const tpHalf = (bl, fs) => {
  // the section's half thickness at FS fs (for the spars)
  const s = tpSection(bl);
  let hi = -Infinity;
  let lo2 = Infinity;
  for (let i = 0; i < s.length; i++) {
    const a = s[i];
    const b = s[(i + 1) % s.length];
    if ((a[0] - fs) * (b[0] - fs) <= 0 && a[0] !== b[0]) {
      const w = a[1] + ((b[1] - a[1]) * (fs - a[0])) / (b[0] - a[0]);
      hi = Math.max(hi, w);
      lo2 = Math.min(lo2, w);
    }
  }
  return [lo2, hi];
};
export const tpLeAt = tpLe;
// fin: the aircraft's side profile; its rear spar ahead of the rudder hinge, ribs at three water lines
export const FIN = P.FIN;
export const FIN_SPAR = M.RUDDER_HINGE_FS - 50; // the fin's rear spar, ahead of the rudder hinge
export const FIN_RIBS = [2050, 2300, 2550];
export const finLeAt = (wl) => lerp(P.FIN[0][0], P.FIN[1][0], clamp((wl - P.FIN[0][1]) / (P.FIN[1][1] - P.FIN[0][1]), 0, 1));
export const FIN_TE = M.RUDDER_HINGE_FS - 10;
export const finFoot = (fs) => M.TAILCONE.axis + M.coneR(fs) + 4;
