// The airframe's parts, drawn into the sheet's views (build time only; the page redraws only the live
// layers, from data build.mjs hands it). World geometry comes from geom.mjs in the aircraft's frame
// (FS aft, WL up, BL to starboard, mm). Each view maps it onto its own (u, v):
//   ISOMETRIC CUTAWAY  seen from ahead, port side and above: iso([FS, WL, BL])
//   FRONT VIEW         from ahead, the port wing:         u = WS (= −BL), v = WL
//   SECTION C-C        the wing at WS 3000, looking outboard: u = −FS (nose right), v = WL
//   SECTION E-E        the cabin at FS 1590, looking forward: u = BL (port left), v = WL

import * as K from "../../kit/draft.mjs";
import * as M from "../light-aircraft/model.mjs";
import * as P from "../light-aircraft/parts.mjs";
import * as X from "../light-aircraft/extra.mjs";
import * as G from "./geom.mjs";
import * as ST from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const C = M.CABIN;
const rad = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const sv = (pts) => pts.map(([fs, wl]) => [-fs, wl]);

// ---------------------------------------------------------------- the isometric projection
const R2 = Math.SQRT2;
const R6 = Math.sqrt(6);
const R3 = Math.sqrt(3);
export const iso = ([fs, wl, bl]) => [(fs - bl) / R2, (fs + 2 * wl + bl) / R6];
export const depth = ([fs, wl, bl]) => (-fs + wl - bl) / R3; // larger: nearer the eye
const centroid = (pts) => pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]);
// a section in its own plane lifted to 3D: (FS, WL) at BL, or (BL, WL) at FS, or (FS, BL) at WL
const atBL = (pts, bl) => pts.map(([fs, wl]) => [fs, wl, bl]);
const atFS = (pts, fs) => pts.map(([bl, wl]) => [fs, wl, bl]);
// an item to paint: a 3D polygon (or a ring with holes), its part, its class
function poly(id, pts3, { holes = [], cls = "body", extra = "", d = null } = {}) {
  return { id, pts3, holes, cls, extra, depth: d ?? depth(centroid(pts3)) };
}
function paint(V, it) {
  const pts = it.pts3.map(iso);
  if (it.cls === "line") return part(it.id, K.line(V, pts, "vis"));
  if (it.cls === "thin") return part(it.id, K.line(V, pts, "thin"));
  const dd = [pts, ...it.holes.map((h) => h.map(iso))].map((p) => K.d(V, p)).join("");
  return part(it.id, `<path class="paper" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>${it.extra}`);
}
const sortPaint = (V, items) => items.sort((a, b) => a.depth - b.depth).map((it) => paint(V, it)).join("");
// a thin band along a 3D polyline (longerons, stringers, the strut), w sheet units wide
function band(V, id, pts3, w) {
  const p = pts3.map((q) => V.p(iso(q)));
  const left = [];
  const right = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[Math.max(0, i - 1)];
    const b = p[Math.min(p.length - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (-(b[1] - a[1]) / l) * (w / 2);
    const ny = ((b[0] - a[0]) / l) * (w / 2);
    left.push([K.r2(p[i][0] + nx), K.r2(p[i][1] + ny)]);
    right.push([K.r2(p[i][0] - nx), K.r2(p[i][1] - ny)]);
  }
  const all = [...left, ...right.reverse()];
  return part(id, `<path class="paper" d="M${all.map((q) => q.join(" ")).join("L")}Z"/><path class="vis" d="M${all.map((q) => q.join(" ")).join("L")}Z"/>`);
}
// a box's three faces toward the eye (front: the smaller FS, top, port: the smaller BL)
function isoBox(id, [f0, f1], [w0, w1], [b0, b1]) {
  return [
    poly(id, [[f0, w0, b0], [f0, w1, b0], [f0, w1, b1], [f0, w0, b1]]),
    poly(id, [[f0, w1, b0], [f1, w1, b0], [f1, w1, b1], [f0, w1, b1]]),
    poly(id, [[f0, w0, b0], [f1, w0, b0], [f1, w1, b0], [f0, w1, b0]]),
  ].map((p) => ({ ...p, depth: depth([f0, w1, b0]) }));
}

// ---------------------------------------------------------------- ISOMETRIC CUTAWAY
export function isoCutaway(V) {
  // --- fuselage: the far skin as a backdrop, then frames, longerons, stringers, the door frame
  const rings = [];
  for (const fs of [G.FIREWALL_FS, ...G.ROOF_FRAMES, ...G.FRAMES, M.TAILCONE.fs1]) rings.push(...atFS(G.boxOutline(G.sectionAt(fs), 0), fs));
  const hull = X.hull(rings.map(iso));
  const skin = part(13, `<path class="paper" d="${K.d(V, hull)}"/><path class="vis" d="${K.d(V, hull)}"/>`);
  const fus = [];
  for (const fs of G.FRAMES) {
    const sec = G.sectionAt(fs);
    fus.push(poly(10, atFS(G.boxOutline(sec, 2), fs), { holes: [atFS(G.boxOutline(sec, G.FRAME_DEPTH(fs)), fs)] }));
  }
  // roof carry-through frames: the roof's band between the upper longerons
  for (const fs of G.ROOF_FRAMES) {
    const o = G.boxOutline(G.sectionAt(fs), 2).filter(([, w]) => w > C.roof - C.rTop - 30);
    const i = G.boxOutline(G.sectionAt(fs), 60).filter(([, w]) => w > C.roof - C.rTop - 30);
    fus.push(poly(10, atFS([...o, ...i.reverse()], fs)));
  }
  // the firewall, broken off above the engine mount's upper bolts (the engine is removed)
  const fw = G.boxOutline(G.sectionAt(0), 2).filter(([, w]) => w < 1500);
  fus.push(poly(9, atFS([...fw, [-(C.half - 2), 1500], [-200, 1560], [200, 1480], [C.half - 2, 1500]], 0), { d: -1e9 }));
  const longs = G.LONGERONS.map((l) => ({ l, pts: G.LONGERON_FS.map((fs) => G.longeronAt(l, fs, 4)) }));
  const strs = G.STRINGERS.map((s) => ({ s, pts: G.STRINGER_FS.map((fs) => G.stringerAt(s, fs, 3)) }));
  const far = (q) => q[2] > 1;
  const longFar = longs.filter((x) => far(x.pts[0])).map((x) => band(V, 11, x.pts, 2.6)).join("");
  const longNear = longs.filter((x) => !far(x.pts[0])).map((x) => band(V, 11, x.pts, 2.6)).join("");
  const strFar = strs.filter((x) => x.s.side > 0).map((x) => band(V, 12, x.pts, 1.8)).join("");
  const strNear = strs.filter((x) => x.s.side <= 0).map((x) => band(V, 12, x.pts, 1.8)).join("");
  // the door frame on the port side: a ring round the door's opening
  const D = G.DOOR;
  const door = poly(14, atBL([[D.fs0 - D.w, D.wl0 - D.w], [D.fs1 + D.w, D.wl0 - D.w], [D.fs1 + D.w, D.wl1 + D.w], [D.fs0 - D.w, D.wl1 + D.w]], -C.half - 1), {
    holes: [atBL([[D.fs0, D.wl0], [D.fs1, D.wl0], [D.fs1, D.wl1], [D.fs0, D.wl1]], -C.half - 1)],
  });
  // fittings: the roof's wing attach fittings over the front and rear spar frames, the strut's at the floor
  const roofFit = G.ROOF_FRAMES.flatMap((fs) => isoBox(8, [fs - 35, fs + 35], [C.roof - 10, C.roof + 55], [-C.half + 10, -C.half + 50]));
  const lowFit = isoBox(7, [G.STRUT_LO.fs - 45, G.STRUT_LO.fs + 45], [G.STRUT_LO.wl - 40, G.STRUT_LO.wl + 40], [-C.half - 30, -C.half]);
  const fusOut = skin + strFar + longFar + sortPaint(V, fus) + longNear + strNear + sortPaint(V, [door, ...roofFit, ...lowFit]);

  // --- the strut and its wing fitting (under the wing, so before it)
  const strut = band(V, 6, [G.strutAt(0.02), G.strutAt(0.98)], 4.2);

  // --- the port wing: the lower skin as a backdrop, then ribs, spar bays and the outboard upper skin
  const sil = [];
  for (const ws of G.RIB_WS) sil.push([...G.on([[0, 0]], ws)[0], -ws], [...G.sparBot(G.rearX(ws), ws), -ws], [...G.sparTop(G.rearX(ws), ws), -ws]);
  for (let ws = 0; ws <= M.TIP_WS; ws += 500) sil.push([...G.on([[0, 0]], ws)[0], -ws]);
  const wingSil = X.hull(sil.map((q) => iso([q[0], q[1], q[2]])));
  const lowerSkin = part(4, `<path class="paper" d="${K.d(V, wingSil)}"/><path class="vis" d="${K.d(V, wingSil)}"/>`);
  const wing = [];
  const lift = (pts, ws) => G.on(pts, ws).map(([fs, wl]) => [fs, wl, -ws]);
  for (const ws of G.RIB_WS) {
    wing.push(poly(3, lift(G.ribMain(ws), ws)));
    wing.push(poly(3, lift(G.ribNose(), ws)));
  }
  // spar webs bay by bay (front spar bays carry the stress colour)
  const bays = [];
  for (let i = 0; i + 1 < G.RIB_WS.length; i++) {
    const a = G.RIB_WS[i];
    const b = G.RIB_WS[i + 1];
    for (const [id, xa, xb] of [[1, G.FRONT_X, G.FRONT_X], [2, G.rearX(a), G.rearX(b)]]) {
      const q = [[...G.sparTop(xa, a), -a], [...G.sparTop(xb, b), -b], [...G.sparBot(xb, b), -b], [...G.sparBot(xa, a), -a]];
      const it = poly(id, q);
      if (id === 1) {
        it.extra = `<path class="accent-fill" id="isb-${i}" fill-opacity="0" d="${K.d(V, q.map(iso))}"/>`;
        bays.push({ i, a, b });
      }
      wing.push(it);
    }
  }
  // the root attach: the spars run in to the roof fittings at WS 590
  // outboard upper skin left on from WS 4200 to the tip, broken off along its inboard edge
  const skinUp = (ws) => P.foilPart(0, G.rearX(ws)).filter(([, e]) => e >= 0);
  const tipSkin = [];
  for (const ws of [4200, 4600, 5000, 5440]) tipSkin.push(lift([[0.004, up0(0.004)]], ws)[0]);
  const ups = [];
  for (const ws of [5440, 5000, 4600, 4200].reverse()) ups.push(lift([[G.rearX(ws), G.up(G.rearX(ws))]], ws)[0]);
  const brk = [];
  for (let k = 0; k <= 8; k++) {
    const x = lerp(G.rearX(4200), 0.004, k / 8);
    const ws = 4200 + (k % 2 ? 70 : 0);
    brk.push(lift([[x, G.up(x)]], ws)[0]);
  }
  void skinUp;
  const upperSkin = poly(4, [...tipSkin, ...ups.reverse(), ...brk], { d: 1e9 });
  const wingOut = lowerSkin + sortPaint(V, wing) + paint(V, upperSkin);
  // the wing's strut fitting under the front spar at WS 3000
  const wf = sortPaint(V, isoBox(5, [G.STRUT_HI.fs - 35, G.STRUT_HI.fs + 35], [G.STRUT_HI.wl - 45, G.STRUT_HI.wl + 8], [-3015, -2985]));
  // phantom: the flap and aileron behind the rear spar (they are BP-022's and BP-107's)
  const te = [];
  for (const ws of [600, 3290, 5480]) te.push(iso([M.TE_FS, G.on([[1, 0]], ws)[0][1], -ws]));
  const hingeL = [600, 3290, 5480].map((ws) => iso([...G.sparTop(G.rearX(ws), ws), -ws]));
  const phantom =
    `<g data-role="phantom">` +
    K.line(V, [...hingeL, ...te.slice().reverse()], "phan", true) +
    K.line(V, [iso([M.TE_FS, G.on([[1, 0]], 3290)[0][1], -3290]), iso([...G.sparTop(G.rearX(3290), 3290), -3290])], "phan") +
    `</g>`;

  // --- empennage: the fin (its far skin, spar and ribs), then the port tailplane
  const fin = [];
  const finProfile = atBL(G.FIN.map(([fs, wl]) => [fs, wl]), 0);
  fin.push(poly(17, finProfile));
  const spTop = 2690;
  fin.push(poly(17, atBL([[G.FIN_SPAR - 8, G.finFoot(G.FIN_SPAR)], [G.FIN_SPAR + 8, G.finFoot(G.FIN_SPAR)], [G.FIN_SPAR + 8, spTop], [G.FIN_SPAR - 8, spTop]], -1)));
  for (const wl of G.FIN_RIBS) fin.push(poly(17, atBL([[G.finLeAt(wl) + 10, wl - 6], [G.FIN_TE, wl - 6], [G.FIN_TE, wl + 6], [G.finLeAt(wl) + 10, wl + 6]], -2)));
  const finOut = fin.map((it) => paint(V, it)).join("");
  const tp = [];
  for (const bl of G.TP_RIBS) tp.push(poly(16, atBL(G.tpSection(bl), -bl)));
  for (let i = 0; i + 1 < G.TP_RIBS.length; i++) {
    const a = G.TP_RIBS[i];
    const b = G.TP_RIBS[i + 1];
    for (const fs of [G.TP_FRONT, G.TP_REAR]) {
      const ha = G.tpHalf(a, fs);
      const hb = G.tpHalf(b, fs);
      tp.push(poly(15, [[fs, ha[1], -a], [fs, hb[1], -b], [fs, hb[0], -b], [fs, ha[0], -a]]));
    }
  }
  const tpOut = sortPaint(V, tp);

  return { svg: fusOut + strut + finOut + tpOut + wingOut + wf, phantom, bays };
}
const up0 = (x) => G.up(x);

// ---------------------------------------------------------------- FRONT VIEW: the port wing from ahead
const fv = (pts) => pts.map(([bl, wl]) => [-bl, wl]);
export const wingLowAt = (ws) => P.wingLowAt(ws);
export const wingTopAt = (ws) => P.wingTopAt(ws);
// the front spar's elevation band: its caps' outer faces at each station
export const sparBand = (ws) => [G.sparBot(G.FRONT_X, ws)[1], G.sparTop(G.FRONT_X, ws)[1]];
export function frontView(V) {
  // the cabin's port half, cut on the centreline
  const box = G.boxOutline(G.sectionAt(1150), 0).filter(([b]) => b <= 0.5);
  const half = [[0, C.floor], ...box.filter(([b]) => b < 0).reverse(), [0, C.roof]].map(([b, w]) => [-b, w]);
  const cabin = part(13, K.body(V, half)) + K.line(V, [[0, C.floor - 40], [0, C.roof + 260]], "ctr");
  // the wing in outline, the front spar over it with its stress strip (one cell a grid step)
  const wsList = [];
  for (let ws = C.half; ws <= M.TIP_WS + 1e-6; ws += 245.5) wsList.push(ws);
  const wingSkin = part(4, K.body(V, [...wsList.map((ws) => [ws, wingTopAt(ws)]), ...wsList.slice().reverse().map((ws) => [ws, wingLowAt(ws)])]));
  const spar = [];
  for (let ws = C.half; ws <= M.TIP_WS - 60 + 1e-6; ws += 245.5) spar.push(ws);
  const top = spar.map((ws) => [ws, sparBand(ws)[1]]);
  const bot = spar.map((ws) => [ws, sparBand(ws)[0]]);
  const sparPoly = [...top, ...bot.reverse()];
  const cells = [];
  for (let i = 0; i < ST.NY; i++) {
    const a = ST.YS_GRID[i];
    const b = ST.YS_GRID[i + 1];
    if (b > M.TIP_WS - 60) break;
    const q = [[a, sparBand(a)[1]], [b, sparBand(b)[1]], [b, sparBand(b)[0]], [a, sparBand(a)[0]]];
    cells.push(`<path class="accent-fill" id="fsb-${i}" fill-opacity="0" d="${K.d(V, q)}"/>`);
  }
  const sparSvg = part(1, `<path class="paper" d="${K.d(V, sparPoly)}"/>` + cells.join("") + `<path class="vis" d="${K.d(V, sparPoly)}"/>`);
  // the strut, its fittings, the root fitting at the roof
  const a = [G.STRUT_LO.bl, G.STRUT_LO.wl];
  const b = [G.STRUT_HI.bl, G.STRUT_HI.wl];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = [(-(b[1] - a[1]) / l) * 20, ((b[0] - a[0]) / l) * 20];
  const strut = part(6, K.body(V, [[a[0] + 30 + n[0], a[1] + n[1]], [b[0] + n[0], b[1] + n[1]], [b[0] - n[0], b[1] - n[1] - 10], [a[0] + 30 - n[0], a[1] - n[1]]]));
  const fitLo = part(7, K.body(V, [[C.half, a[1] - 45], [C.half + 70, a[1] - 30], [C.half + 70, a[1] + 30], [C.half, a[1] + 45]]));
  const fitHi = part(5, K.body(V, [[b[0] - 45, wingLowAt(b[0]) + 2], [b[0] + 45, wingLowAt(b[0]) + 2], [b[0] + 30, b[1] - 40], [b[0] - 30, b[1] - 40]]));
  const fitRoot = part(8, K.body(V, [[C.half - 40, C.roof - 6], [C.half + 30, C.roof - 6], [C.half + 30, wingLowAt(C.half) + 30], [C.half - 40, wingLowAt(C.half) + 30]]));
  return { svg: cabin + wingSkin + sparSvg + strut + fitLo + fitRoot + fitHi };
}

// ---------------------------------------------------------------- SECTION C-C: the wing at WS 3000
export const CC_WS = ST.YS;
const SK = 3; // the skins, drawn 3 mm thick at 1:10 so they read (0.64 mm true)
export function sectionC(V) {
  const ws = CC_WS;
  const c = M.chordAt(ws);
  const xr = G.rearX(ws);
  const fx = G.FRONT_X;
  const outline = sv(G.on(G.wingSection(ws), ws));
  const rib = sv(G.on(G.ribMain(ws), ws));
  const nose = sv(G.on(G.ribNose(), ws));
  const k = 1 / c; // mm → chord fraction
  // the front spar: web and the two caps (angles back to back), on the section
  const sp = (x, e) => sv(G.on([[x, e]], ws))[0];
  const capT = ST.CAP.t * k;
  const capW = ST.CAP.w * k;
  const tSkin = SK * k;
  const webT = 2 * k; // 1.6 mm, drawn 2
  const xu = fx + SPAR_HALF();
  const upE = (x) => G.up(x) - tSkin;
  const loE = (x) => G.lo(x) + tSkin;
  const capUp = [[xu - webT / 2 - capW, upE(xu - webT / 2 - capW)], [xu + webT / 2 + capW, upE(xu + webT / 2 + capW)], [xu + webT / 2 + capW, upE(xu + webT / 2 + capW) - capT], [xu + webT / 2 + capT, upE(xu) - capT], [xu + webT / 2 + capT, upE(xu) - capW], [xu - webT / 2 - capT, upE(xu) - capW], [xu - webT / 2 - capT, upE(xu) - capT], [xu - webT / 2 - capW, upE(xu - webT / 2 - capW) - capT]];
  const capLo = [[xu - webT / 2 - capW, loE(xu - webT / 2 - capW)], [xu + webT / 2 + capW, loE(xu + webT / 2 + capW)], [xu + webT / 2 + capW, loE(xu + webT / 2 + capW) + capT], [xu + webT / 2 + capT, loE(xu) + capT], [xu + webT / 2 + capT, loE(xu) + capW], [xu - webT / 2 - capT, loE(xu) + capW], [xu - webT / 2 - capT, loE(xu) + capT], [xu - webT / 2 - capW, loE(xu - webT / 2 - capW) + capT]];
  const web = [[xu - webT / 2, upE(xu) - capT], [xu + webT / 2, upE(xu) - capT], [xu + webT / 2, loE(xu) + capT], [xu - webT / 2, loE(xu) + capT]];
  const toS = (pts) => sv(G.on(pts, ws));
  // the rear spar: a channel, flanges forward
  const rw = 1.5 * k;
  const rf = 18 * k;
  const rx = xr - 0.003;
  const rear = [[rx - rf, upE(rx - rf)], [rx, upE(rx)], [rx, loE(rx)], [rx - rf, loE(rx - rf)], [rx - rf, loE(rx - rf) + rw], [rx - rw, loE(rx) + rw], [rx - rw, upE(rx) - rw], [rx - rf, upE(rx - rf) - rw]];
  // the strut fitting: a steel lug under the lower cap, through the skin, with its bolt and the strut's end
  const lowAt = G.on([[xu, G.lo(xu)]], ws)[0];
  const fx0 = lowAt[0];
  const fw0 = lowAt[1];
  const fit = [[fx0 - 34, fw0 + 30], [fx0 + 34, fw0 + 30], [fx0 + 34, fw0 + 2], [fx0 + 22, fw0 - 46], [fx0 - 22, fw0 - 46], [fx0 - 34, fw0 + 2]];
  const boltC = [fx0, fw0 - 30];
  const strutEnd = [[fx0 - 16, fw0 - 18], [fx0 + 16, fw0 - 18], [fx0 + 20, fw0 - 70], [fx0 - 20, fw0 - 70]];
  return {
    svg:
      part(3, K.body(V, rib) + K.body(V, nose) + K.line(V, rib.map(([u, v]) => [u, v]), "thin", true)) +
      part(4, X.skin(V, outline, SK)) +
      part(1, K.cut(V, toS(capUp), { mat: "alu", angle: 45 }) + K.cut(V, toS(capLo), { mat: "alu", angle: 45 }) + K.cut(V, toS(web), { mat: "solid" })) +
      part(2, K.cut(V, toS(rear), { mat: "solid" })) +
      part(6, K.body(V, sv(strutEnd))) +
      part(5, X.cutHoles(V, sv(fit), [sv(K.circle(boltC[0], boltC[1], 6.5, 20))], { mat: "steel", angle: 135 }) + K.body(V, sv(K.circle(boltC[0], boltC[1], 4.76, 20)))) +
      K.centerMark(V, sv([boltC])[0], 4.76),
    sparU: sv([[G.on([[xu, 0]], ws)[0][0], 0]])[0][0],
    front: { up: toS([[xu, G.up(xu)]])[0], lo: toS([[xu, G.lo(xu)]])[0] },
    rear: toS([[rx, G.up(rx)]])[0],
    rearLo: toS([[rx, G.lo(rx)]])[0],
    rearMid: toS([[rx - rw / 2, (G.up(rx) + G.lo(rx)) / 2]])[0],
    le: sv(G.on([[0, 0]], ws))[0],
    bolt: sv([boltC])[0],
    capUp: toS([[xu + webT / 2 + capW * 0.7, upE(xu + webT / 2 + capW * 0.7) - capT / 2]])[0],
    ribAt: sv(G.on([[0.45, (G.up(0.45) + G.lo(0.45)) / 2]], ws))[0],
    skinAt: sv(G.on([[0.55, G.lo(0.55) + 0.001]], ws))[0],
    fitAt: sv([[fx0 + 26, fw0 + 10]])[0],
    strutAt: sv([[fx0, fw0 - 60]])[0],
  };
}
const SPAR_HALF = () => G.SPAR_W / 2;

// ---------------------------------------------------------------- DETAIL D: the front spar's section, 1:2.5
// Drawn locally: u across the chord (FS aft to the left: −FS), v up, centred on the web at WS 3000.
export function detailD(V) {
  const h = ST.sparDepth(CC_WS); // skin to skin
  const t = ST.CAP.t;
  const w = ST.CAP.w;
  const wb = ST.WEB_T;
  const s = 1.6; // skins drawn 1.6 (0.64 true)
  const top = h / 2;
  const bot = -h / 2;
  const L = (sx, sy) => {
    // one angle in the upper (sy = 1) or lower (sy = −1) cap, on the sx side of the web
    const y0 = sy * (top - 0.0);
    const pts = [[wb / 2, y0], [wb / 2 + w, y0], [wb / 2 + w, y0 - sy * t], [wb / 2 + t, y0 - sy * t], [wb / 2 + t, y0 - sy * w], [wb / 2, y0 - sy * w]];
    return pts.map(([u, v]) => [sx * u, v]);
  };
  const web = [[-wb / 2, top - 1], [wb / 2, top - 1], [wb / 2, bot + 1], [-wb / 2, bot + 1]];
  const skinU = [[-46, top], [46, top], [46, top + s], [-46, top + s]];
  const skinL = [[-46, bot - s], [46, bot - s], [46, bot], [-46, bot]];
  const rivets = [[-14, top - t / 2], [14, top - t / 2], [-14, bot + t / 2], [14, bot + t / 2]];
  return {
    svg:
      part(4, K.cut(V, skinU, { mat: "solid" }) + K.cut(V, skinL, { mat: "solid" })) +
      part(1, K.cut(V, web, { mat: "solid" }) + [L(1, 1), L(-1, 1), L(1, -1), L(-1, -1)].map((p, i) => K.cut(V, p, { mat: "alu", angle: i % 2 ? 135 : 45 })).join("")) +
      rivets.map((r) => K.line(V, [[r[0], r[1] + 5], [r[0], r[1] - 5]], "ctr")).join(""),
    h,
    top,
    bot,
  };
}

// ---------------------------------------------------------------- SECTION E-E: the cabin at FS 1590, looking forward
export const EE_FS = 1590;
export function sectionE(V) {
  const sec = G.sectionAt(EE_FS);
  const fv2 = (pts) => pts.map(([b, w]) => [b, w]); // u = BL: port to the left, looking forward
  const outer = G.boxOutline(sec, 0, 8);
  const skin = X.skin(V, fv2(outer), 4);
  const frame = X.cutHoles(V, fv2(G.boxOutline(sec, 4.5, 8)), [fv2(G.boxOutline(sec, 60, 8))], { mat: "alu", angle: 45 });
  void frame;
  const frameBody = `<path class="paper" fill-rule="evenodd" d="${K.d(V, G.boxOutline(sec, 4.5, 8))}${K.d(V, G.boxOutline(sec, 60, 8))}"/><path class="vis" d="${K.d(V, G.boxOutline(sec, 4.5, 8))}${K.d(V, G.boxOutline(sec, 60, 8))}"/>`;
  // longerons: angles 25 × 25 × 1.6 in the corners (cut: solid)
  const longs = G.LONGERONS.map((l) => {
    const [, w, b] = G.longeronAt(l, EE_FS, 6);
    const sx = Math.sign(b);
    const sy = l.which === "top" ? 1 : -1;
    const a = 25;
    const t = 3;
    const pts = [[0, 0], [-sx * a, 0], [-sx * a, -sy * t], [-sx * t, -sy * t], [-sx * t, -sy * a], [0, -sy * a]].map(([u, v]) => [b + u * 0.7071 - v * 0.7071 * sx * sy * 0 + u * 0, w + v]);
    return { pts, at: [b - sx * 8, w - sy * 1.5] };
  });
  // the wing attach fittings over the roof corners (ahead, at the front spar frame) and the wing's root
  const roofFit = [-1, 1].map((sx) => [[sx * (C.half - 40), C.roof - 4], [sx * (C.half + 20), C.roof - 4], [sx * (C.half + 20), C.roof + 70], [sx * (C.half - 40), C.roof + 70]]);
  const wingRoot = [-1, 1].map((sx) => [[sx * C.half, C.roof + 6], [sx * (C.half + 220), C.roof + 6 + 220 * Math.tan(M.DIHEDRAL * rad)], [sx * (C.half + 220), C.roof + 200], [sx * C.half, C.roof + 200]]);
  // the strut fittings at the floor's corners (ahead, FS 1150), and the struts leaving them
  const lowFit = [-1, 1].map((sx) => [[sx * C.half, C.floor + 160], [sx * (C.half + 60), C.floor + 170], [sx * (C.half + 60), C.floor + 230], [sx * C.half, C.floor + 240]]);
  const ang = ST.STRUT_ANGLE * rad;
  const strut = [-1, 1].map((sx) => {
    const a = [sx * (C.half + 50), C.floor + 200];
    const L = 210;
    const b = [a[0] + sx * L * Math.cos(ang), a[1] + L * Math.sin(ang)];
    const n = [-Math.sin(ang) * 20 * sx, Math.cos(ang) * 20];
    return [[a[0] + n[0], a[1] + n[1]], [b[0] + n[0], b[1] + n[1]], [b[0] - n[0], b[1] - n[1]], [a[0] - n[0], a[1] - n[1]]];
  });
  return {
    svg:
      part(10, frameBody) +
      part(13, skin) +
      part(11, longs.map((l) => K.cut(V, l.pts, { mat: "solid" })).join("")) +
      part(8, roofFit.map((p) => K.body(V, p)).join("")) +
      part(7, lowFit.map((p) => K.body(V, p)).join("")) +
      part(6, strut.map((p) => K.body(V, p)).join("")) +
      `<g data-role="phantom">${wingRoot.map((p) => K.line(V, p, "phan", true)).join("")}</g>` +
      K.centerline(V, [0, C.floor - 40], [0, C.roof + 40], 0),
    longAt: longs.map((l) => l.at),
    frameAt: [-(C.half - 30), (C.floor + C.roof) / 2],
    skinAt: [0, C.floor + 2],
    roofAt: [-(C.half - 10), C.roof + 50],
    lowAt: [-(C.half + 30), C.floor + 200],
    strutAt: strut[0].map((p) => p).reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]),
  };
}

// ---------------------------------------------------------------- DETAIL F: the strut's wing fitting, 1:2.5
// Front view (from ahead), port wing: u = WS, v = WL, centred on the bolt.
export function detailF(V) {
  const ws = ST.YS;
  const bolt = [ws, G.STRUT_HI.wl - 30];
  const lowSkin = wingLowAt(ws); // the wing's lower surface at the strut station
  const [sb] = sparBand(ws);
  const capT = ST.CAP.t;
  const capH = ST.CAP.w;
  // spar web (paper), lower cap band, lower skin line; the fitting plate bolted to the web
  const span = [ws - 120, ws + 120];
  const web = [[span[0], sb + capH], [span[1], sb + capH], [span[1], sb + 150], [span[0], sb + 150]];
  const cap = [[span[0], sb], [span[1], sb], [span[1], sb + capH], [span[0], sb + capH]];
  const skin = [[span[0], lowSkin - 1.6], [span[1], lowSkin - 1.6], [span[1], lowSkin], [span[0], lowSkin]];
  const plate = [[ws - 60, sb + 110], [ws + 60, sb + 110], [ws + 60, sb + 4], [ws + 24, bolt[1] - 22], [ws - 24, bolt[1] - 22], [ws - 60, sb + 4]];
  const boltsAt = [[ws - 38, sb + 90], [ws + 38, sb + 90], [ws - 38, sb + 40], [ws + 38, sb + 40]];
  // the strut's forged end, along the strut's line, down and inboard
  const ang = ST.STRUT_ANGLE * rad;
  const dir = [-Math.cos(ang), -Math.sin(ang)];
  const nrm = [-dir[1], dir[0]];
  const p = (s, n) => [bolt[0] + dir[0] * s + nrm[0] * n, bolt[1] + dir[1] * s + nrm[1] * n];
  const fork = [p(-16, 15), p(-16, -15), p(60, -15), p(76, -22), p(170, -22), p(170, 22), p(76, 22), p(60, 15)];
  return {
    svg:
      part(1, K.body(V, web) + K.body(V, cap)) +
      part(4, K.cut(V, skin, { mat: "solid" })) +
      part(6, K.body(V, fork) + K.breakLine(V, p(170, -26), p(170, 26))) +
      part(5, K.body(V, plate) + boltsAt.map((b) => K.body(V, K.circle(b[0], b[1], 3.2, 16))).join("") + K.body(V, K.circle(bolt[0], bolt[1], ST.FITTING_BOLT.d / 2 + 0.01, 24)) + K.line(V, K.circle(bolt[0], bolt[1], 7.5, 6), "thin", true)) +
      K.centerMark(V, bolt, 7) +
      K.centerline(V, p(-30, 0), p(160, 0), 0),
    bolt,
    dir,
    p,
    plateAt: [ws + 46, sb + 60],
    webAt: [ws - 100, sb + 130],
    forkAt: p(120, 10),
    sb,
  };
}
