// Builds electrical.html: a live A2 drawing of a light aircraft's 28 V DC electrical system: the
// alternator in axial section and across its stator, the starter with its Bendix pinion at the ring
// gear, the battery across its plates, one panel breaker in section, the panel's switches, ammeter,
// annunciator and breakers, the wiring schematic, and three diagrams, all from one model.
//   node examples/electrical/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as A from "../light-aircraft/model.mjs";
import * as AS from "../light-aircraft/scene3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- the aircraft and this sheet agree
const same = (name, a, b, tol = 1e-9) => {
  if (Math.abs(a - b) > tol) throw new Error(`${name}: BP-022 has ${a}, this sheet ${b}`);
};
same("rated rpm", A.ENGINE.rpm, M.RPM.max);
// the parent's battery (part 19) is a 160 × 190 × 180 box ahead of the firewall: this battery fills it
const bat = AS.scene().parts.find((p) => String(p.id) === "19").solids[0];
const SC_K = 10; // the parent's 3D scene is in centimetres
same("battery length", (bat.max[0] - bat.min[0]) * SC_K, P.BT.L);
same("battery height", (bat.max[1] - bat.min[1]) * SC_K, P.BT.post.studTop);

// ---------------------------------------------------------------- views
export const SLOW = { rotor: 250, ring: 25 }; // the turning views are slowed so a reader can follow them
const VIEWS = {
  A: { x: 72, y: 180, scale: 1 },
  B: { x: 98, y: 446, scale: 0.5 },
  D: { x: 214, y: 462, scale: 0.5 },
  E: { x: 46, y: 762, scale: 0.4 },
  G: { x: 300, y: 640, scale: 2 },
  F: { x: 452, y: 600, scale: 0.5 },
};
const VA = K.view(VIEWS.A);
const VB = K.view(VIEWS.B);
const VD = K.view(VIEWS.D);
const VE = K.view(VIEWS.E);
const VG = K.view(VIEWS.G);
const VF = K.view(VIEWS.F);
const S0 = M.tourStart();

// ---------------------------------------------------------------- SECTION A-A: the alternator
const AL = P.AL;
const sectionA =
  `<g data-geom="A">` +
  P.part(4, P.shaftA(VA)) +
  P.part(9, P.pulleyFan(VA)) +
  P.part(11, P.beltA(VA), ` id="a-belt"`) +
  P.part(1, P.deFrame(VA)) +
  P.part(10, P.bearingsA(VA)) +
  P.part(3, P.stator(VA) + P.statorCopper(VA)) +
  P.part(4, P.rotor(VA)) +
  P.part(5, P.fieldCoil(VA)) +
  P.part(6, P.slipRings(VA)) +
  P.part(2, P.sreFrame(VA) + P.brushHolder(VA)) +
  P.part(7, P.brushes(VA)) +
  P.part(8, P.rectifier(VA)) +
  K.centerline(VA, [AL.shaft.front - 6, 0], [AL.shaft.end + 8, 0], 0) +
  `</g>` +
  // the cutting plane of Section B-B through the stack's middle, both ends, arrows looking aft
  (() => {
    const x = K.r2(VA.p([AL.rotor.mid, 0])[0]);
    const end = (y0, y1, ya) => `<path class="vis" d="M${x} ${y0}V${y1}"/><path class="thin" d="M${x} ${ya}H${x + 9}"/><path class="head" d="M${x + 13} ${ya}L${x + 6} ${ya - 1.75}L${x + 6} ${ya + 1.75}Z"/><text class="t t-lg" x="${x + 19}" y="${ya + 4}" text-anchor="middle">B</text>`;
    const top = VA.p([0, AL.stator.ro])[1];
    const bot = VA.p([0, -AL.stator.ro])[1];
    return `<g data-role="label">${end(top - 3, top - 13, top - 8)}${end(bot + 3, bot + 13, bot + 8)}</g>`;
  })();
const balloonsA =
  K.balloon(VA, [-5, 9], [62, 40], 4, { target: 4 }) +
  K.balloon(VA, [10, 33.5], [86, 40], 11, { target: 11 }) +
  K.balloon(VA, [30, 34], [110, 40], 9, { target: 9 }) +
  K.balloon(VA, [40, 50], [134, 40], 1, { target: 1 }) +
  K.balloon(VA, [70, 58], [180, 40], 3, { target: 3 }) +
  K.balloon(VA, [77, 33], [204, 40], 5, { target: 5 }) +
  K.balloon(VA, [103, 10.5], [262, 40], 6, { target: 6 }) +
  K.balloon(VA, [108.5, 17], [284, 40], 7, { target: 7 }) +
  K.balloon(VA, [116, 59], [306, 40], 2, { target: 2 }) +
  K.balloon(VA, [125, 30], [334, 40], 8, { target: 8 }) +
  K.balloon(VA, [43, -14.2], [120, 318], 10, { target: 10 });
const labelA = K.viewLabel(214, 342, "SECTION A-A", "ALTERNATOR 28 V 60 A, AXIAL · 1:1");

// ---------------------------------------------------------------- SECTION B-B: across the stator
const rB = P.rotorB(VB);
const slots = Array.from({ length: P.BB.n }, (_, k) => `<path class="solid" d="${K.d(VB, P.slotCopper(k))}"/>`).join("");
const slotsHot = Array.from({ length: P.BB.n }, (_, k) => `<path id="b-slot${k}" class="cu" d="${K.d(VB, P.slotCopper(k))}"/>`).join("");
const sectionB =
  `<g data-geom="B">` +
  P.part(3, P.statorRing(VB) + slots + `<g data-role="fluid">${slotsHot}</g>`) +
  `<g id="b-rotor">` +
  P.part(4, rB.claws + P.shaftB(VB)) +
  P.part(5, P.coreB(VB)) +
  `</g>` +
  K.centerMark(VB, [0, 0], 66) +
  `</g>`;
const labelB = K.viewLabel(98, 524, "SECTION B-B", "STATOR AND ROTOR · 1:2");

// ---------------------------------------------------------------- SECTION D-D: the starter
const sectionD =
  `<g data-geom="D"><g data-role="phantom">${P.ringGearPhantom(VD)}</g>` +
  P.part(18, P.starterFrames(VD)) +
  P.part(19, P.starterShaft(VD) + P.armature(VD)) +
  `<g id="d-drive">${P.part(20, P.pinion(VD, 0) + P.driveSpring(VD, 0))}</g>` +
  K.centerline(VD, [P.ST.shaft.u0 - 6, 0], [P.ST.shaft.u1 + 8, 0], 0) +
  `</g>` +
  K.breakLine(VD, [P.RINGG.u0 - 9, M.CENTRES - 128 + 16], [P.RINGG.u1 + 3, M.CENTRES - 128 + 16]);
const balloonsD =
  K.balloon(VD, [61, -40], [332, 524], 18, { target: 18 }) +
  K.balloon(VD, [112, -16], [356, 524], 19, { target: 19 });
const LIVE = { 20: { at: [196, 524] } };
const labelD =
  K.viewLabel(258, 552, "SECTION D-D", "STARTER, BENDIX DRIVE AT THE RING GEAR · 1:2") +
  K.viewArrow(VD, [P.RINGG.u0 - 1, 4], [1, 0], "H", 22) +
  (() => {
    const [ax, ay] = VD.p([P.RINGG.u0 + 4, M.CENTRES - 128 + 10]);
    return `<g data-role="label"><path class="thin" d="M${K.r2(ax)} ${K.r2(ay)}L206 410H210"/><circle class="dot" cx="${K.r2(ax)}" cy="${K.r2(ay)}" r="1.2"/><text class="t t-sm" x="212" y="412.6">RING GEAR 149 T, PHANTOM</text></g>`;
  })();

// ---------------------------------------------------------------- VIEW H: the pinion in the ring gear
const H = { x: 738, y: 506, w: 98, h: 124 };
const VH = K.view({ x: 787, y: 604, scale: 1 });
const viewH =
  `<g data-geom="H" clip-path="url(#clip-H)"><rect class="paper" x="${H.x}" y="${H.y}" width="${H.w}" height="${H.h}"/>` +
  `<g data-role="phantom">${K.line(VH, K.arc(0, M.CENTRES, 112, -100, -80, 12), "phan")}</g>` +
  `<g id="h-ring">${K.body(VH, P.ringArc(0))}</g>` +
  `<g id="h-pinion">${P.part(20, K.body(VH, P.pinionGear(0)) + K.body(VH, K.circle(0, 0, 7, 24)))}</g>` +
  K.centerMark(VH, [0, 0], 15) +
  K.centerline(VH, [0, 0], [0, 50], 0) +
  `</g><rect class="thin" x="${H.x}" y="${H.y}" width="${H.w}" height="${H.h}" rx="8"/>` +
  K.viewLabel(H.x + H.w / 2, 650, "VIEW H", "ALONG THE CRANK · 1:1");

// ---------------------------------------------------------------- SECTION E-E: the battery
const BT = P.BT;
const sectionE =
  `<g data-geom="E">` +
  `<g data-role="fluid">${Array.from({ length: BT.cells }, (_, i) => `<path id="e-acid${i}" class="tint acid" d="${K.d(VE, P.electrolyte(i))}"/>`).join("")}</g>` +
  P.part(14, P.cellElements(VE)) +
  P.part(13, P.batteryCase(VE)) +
  `</g>`;
const balloonsE =
  K.balloon(VE, [BT.L - 1.75, 80], [196, 650], 13, { target: 13 }) +
  K.balloon(VE, [P.plates(4)[3][0] + 1, 60], [196, 700], 14, { target: 14 });
const labelE = K.viewLabel(112, 790, "SECTION E-E", "BATTERY, ONE ROW OF SIX CELLS · 1:2.5");
const dimE = K.dim(VE, [0, 0], [BT.L, 0], { dir: "h", off: 12 });

// ---------------------------------------------------------------- DETAIL G: one panel breaker
const G = P.CBG;
const detailG =
  `<g data-geom="G"><g data-role="phantom">${K.line(VG, K.rect(-14, G.panel[0], -G.bush.ro - 0.4, G.panel[1]), "phan", true)}${K.line(VG, K.rect(G.bush.ro + 0.4, G.panel[0], 14, G.panel[1]), "phan", true)}</g>` +
  P.part(25, P.breakerBody(VG) + P.breakerTerminals(VG) + `<g id="g-plunger">${P.plunger(VG, 0)}</g><g id="g-bimetal">${P.bimetal(VG, 0)}</g>`) +
  K.centerline(VG, [0, G.term.v0 + 0.5], [0, G.plunger.top + G.stroke + 2], 0) +
  `</g>`;
const balloonG = K.balloon(VG, [-G.body.ro + 0.75, -24], [248, 690], 25, { target: 25 });
const calloutsG = (() => {
  const items = [
    [[G.bimetal.u + 0.3, -20], [354, 706], "BIMETAL"],
    [[G.plunger.r - 0.5, G.plunger.notch[1] - 0.5], [354, 672], "LATCH"],
    [[G.contact.u + 0.6, G.contact.v[0] + 0.3], [354, 690], "CONTACTS"],
    [[-1.4, -27], [244, 742], "SPRING"],
    [[-G.plunger.r + 0.4, G.bush.v1 + 1.3], [244, 600], "BAND"],
  ];
  return `<g data-role="label">${items
    .map(([at, [x, y], s]) => {
      const [ax, ay] = VG.p(at);
      const left = x < ax;
      return `<path class="thin" d="M${K.r2(ax)} ${K.r2(ay)}L${x} ${y}H${x + (left ? -3 : 3)}"/><circle class="dot" cx="${K.r2(ax)}" cy="${K.r2(ay)}" r="1.2"/><text class="t t-sm" x="${x + (left ? -5 : 5)}" y="${y + 2.6}" text-anchor="${left ? "end" : "start"}">${s}</text>`;
    })
    .join("")}</g>`;
})();
const labelG = K.viewLabel(378, 790, "DETAIL G", "ONE BREAKER · 2:1");

// ---------------------------------------------------------------- VIEW F: the panel
const PF = P.PF;
const eng = (V, xy, s, cls = "t t-sm", anchor = "middle") => `<text class="${cls}" x="${K.r2(V.p(xy)[0])}" y="${K.r2(V.p(xy)[1] + 2.6)}" text-anchor="${anchor}">${s}</text>`;
function panelF() {
  let out = `<g data-geom="F"><g data-role="phantom">${P.panelPhantom(VF)}<g id="f-key">${P.keySwitch(VF, "OFF")}</g>`;
  out += `<g data-role="engraved">${["OFF", "R", "L", "BOTH", "START"].map((p) => eng(VF, P.keyLabelAt(p, { OFF: 22, R: 19, L: 18, BOTH: 20, START: 25 }[p]), p, "t t-cap")).join("")}</g></g>`;
  out += P.part(17, `<g id="f-alt">${P.rocker(VF, PF.sw.alt, PF.sw.v, false)}</g><g id="f-bat">${P.rocker(VF, PF.sw.bat, PF.sw.v, false)}</g>`);
  out += P.part(22, `<g id="f-avn">${P.rocker(VF, PF.sw.avn, PF.sw.v, false)}</g>`);
  out += P.part(23, P.ammeterFace(VF) + `<g id="f-needle">${P.ammeterNeedle(VF, 0)}</g>`);
  out += P.part(24, `${K.body(VF, K.rect(PF.lv.u[0], PF.lv.v[0], PF.lv.u[1], PF.lv.v[1]))}<path id="f-lv" class="tint lit" d="${K.d(VF, K.rect(PF.lv.u[0] + 1, PF.lv.v[0] + 1, PF.lv.u[1] - 1, PF.lv.v[1] - 1))}"/>`);
  out += P.part(25, M.CB.map((c, i) => `<g id="f-cb${i}">${P.breakerFace(VF, i, false)}</g>`).join(""));
  // engraved: switch and instrument names, breaker names and ratings
  let t = "";
  t += eng(VF, [(PF.sw.alt[0] + PF.sw.bat[1]) / 2, PF.sw.v[1] + 5], "MASTER", "t t-cap");
  t += eng(VF, [(PF.sw.alt[0] + PF.sw.alt[1]) / 2, PF.sw.v[0] - 5], "ALT", "t t-cap") + eng(VF, [(PF.sw.bat[0] + PF.sw.bat[1]) / 2, PF.sw.v[0] - 5], "BAT", "t t-cap");
  t += eng(VF, [(PF.sw.avn[0] + PF.sw.avn[1]) / 2, PF.sw.v[1] + 5], "AVIONICS", "t t-cap");
  t += eng(VF, [PF.amm.c[0], PF.amm.c[1] - 12], "AMPS", "t t-cap");
  t += [-6, 0, 6].map((i) => eng(VF, P.ammLabelAt(i, PF.amm.r - 14), i === 0 ? "0" : i < 0 ? "−60" : "+60", "t t-cap")).join("");
  t += eng(VF, [(PF.lv.u[0] + PF.lv.u[1]) / 2, (PF.lv.v[0] + PF.lv.v[1]) / 2], "LOW VOLTS", "t t-cap");
  t += M.CB.map((c, i) => eng(VF, [P.cbU(i), PF.cb.v + 11], c.tag, "t t-cap") + eng(VF, [P.cbU(i), PF.cb.v - 10.5], String(c.In), "t t-cap")).join("");
  out += `<g data-role="engraved">${t}</g>`;
  out += `</g>`;
  return out;
}
const balloonsF =
  K.balloon(VF, [PF.sw.bat[1] - 2, PF.sw.v[0] + 3], [508, 494], 17, { target: 17 }) +
  K.balloon(VF, [PF.amm.c[0] + PF.amm.r - 1, PF.amm.c[1] + 8], [646, 494], 23, { target: 23 }) +
  K.balloon(VF, [PF.lv.u[1] - 1, PF.lv.v[1] - 1], [712, 494], 24, { target: 24 });
const labelF = K.viewLabel(588, 625, "VIEW F", "THE PANEL'S ELECTRICAL GROUP, FROM THE PILOT'S SEAT · 1:2");

// ---------------------------------------------------------------- the schematic (NTS)
// Sheet coordinates. Every wire is a polyline drawn from its source toward its load, so the sign of its
// current says which way the dashes run. W: id → { points, current key }.
const VS = K.view({ x: 0, y: 0, scale: 1 / K.PX_PER_MM }); // world = sheet units, v down
const sp = ([x, y]) => [x, -y];
const SX = { bus: 640, busTop: 74, busBot: 404, avn: 736, avnTop: 290, avnBot: 384 };
const ROWS = { warn: 92, nav: 126, land: 160, pitot: 194, flap: 228, turn: 262, avn: 300, com: 326, xpdr: 362 };
const W = {};
const wire = (id, pts, key) => (W[id] = { pts, key });
let sym = ""; // symbols
let words = ""; // and their words
const txt = (x, y, s, anchor = "start", cls = "t t-sm") => (words += `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`);
const CBP = {};
const cbSym = (x, y, id) => ((CBP[id] = [x, y]), `<g id="s-cb-${id}"><rect class="vis paper-fill" x="${x}" y="${y - 5}" width="20" height="10"/><path id="s-cb-${id}-l" class="thin" d="M${x} ${y}H${x + 20}"/></g>`);
const SWP = {};
const swSym = (x, y, id, closed = true) => ((SWP[id] = [x, y]), `<g id="s-sw-${id}"><circle class="vis paper-fill" cx="${x}" cy="${y}" r="1.6"/><circle class="vis paper-fill" cx="${x + 20}" cy="${y}" r="1.6"/><path id="s-sw-${id}-b" class="vis" d="M${x + 1.6} ${y}L${x + 19} ${closed ? y : y - 8}"/></g>`);
const ground = (x, y) => `<path class="vis" d="M${x} ${y}V${y + 6}M${x - 7} ${y + 6}H${x + 7}M${x - 4.5} ${y + 9}H${x + 4.5}M${x - 2} ${y + 12}H${x + 2}"/>`;
const lamp = (x, y, id = "") => `<g${id ? ` id="${id}"` : ""}><circle class="vis paper-fill" cx="${x}" cy="${y}" r="8"/><path class="thin" d="M${x - 5.6} ${y - 5.6}L${x + 5.6} ${y + 5.6}M${x - 5.6} ${y + 5.6}L${x + 5.6} ${y - 5.6}"/></g>`;
const motor = (x, y, r = 8) => `<circle class="vis paper-fill" cx="${x}" cy="${y}" r="${r}"/><text class="t t-sm" x="${x}" y="${y + 2.7}" text-anchor="middle">M</text>`;
const heater = (x, y) => `<rect class="vis paper-fill" x="${x - 8}" y="${y - 8}" width="16" height="16"/><path class="vis" d="M${x - 8} ${y}L${x - 6} ${y - 4}L${x - 3} ${y + 4}L${x} ${y - 4}L${x + 3} ${y + 4}L${x + 6} ${y - 4}L${x + 8} ${y}"/>`;
const node = (x, y) => `<circle class="dot" cx="${x}" cy="${y}" r="2"/>`;
const coil = (x, y, w = 18, h = 9) => `<rect class="vis paper-fill" x="${x}" y="${y}" width="${w}" height="${h}"/><path class="thin" d="M${x + 3} ${y + h}L${x + w - 3} ${y}"/>`;
// ---- the right-hand branches off the main bus: breaker, the pilot's switch where there is one, the load
const BR = [
  { id: "warn", sw: false, load: "lamp", name: "LOW VOLTS" },
  { id: "nav", sw: true, load: "lamp", name: "NAV LIGHTS" },
  { id: "land", sw: true, load: "lamp", name: "LANDING LT" },
  { id: "pitot", sw: true, load: "heat", name: "PITOT HEAT" },
  { id: "flap", sw: false, load: "motor", name: "FLAP MOTOR" },
  { id: "turn", sw: false, load: "motor", name: "TURN COORD" },
];
const X = { cb: 652, sw: 690, load: 740, lbl: 758 };
for (const b of BR) {
  const y = ROWS[b.id];
  const c = M.CB[M.CB_INDEX[b.id]];
  wire(`w-${b.id}`, [[SX.bus + 2, y], [X.cb, y], [X.cb + 20, y], ...(b.sw ? [[X.sw, y], [X.sw + 20, y]] : []), [X.load - 8, y]], b.id);
  wire(`w-${b.id}-g`, [[X.load, y + 8], [X.load, y + 10]], b.id);
  sym += cbSym(X.cb, y, b.id);
  if (b.sw) sym += swSym(X.sw, y, b.id, false);
  sym += b.load === "lamp" ? lamp(X.load, y, b.id === "warn" ? "s-lv" : "") : b.load === "heat" ? heater(X.load, y) : motor(X.load, y);
  sym += ground(X.load, y + 10);
  txt(X.cb + 10, y - 7, `${c.In}`, "middle", "t t-cap");
  txt(X.lbl, y + 2.6, b.name);
}
// ---- the avionics branch: breaker, the avionics master, the avionics bus, two radios
{
  const y = ROWS.avn;
  wire("w-avn", [[SX.bus + 2, y], [X.cb, y], [X.cb + 20, y], [X.sw, y], [X.sw + 20, y], [SX.avn - 2, y]], "avn");
  sym += cbSym(X.cb, y, "avn") + swSym(X.sw, y, "avn", false);
  txt(X.cb + 10, y - 7, "15", "middle", "t t-cap");
  txt(X.sw + 10, y + 11, "AVN MASTER", "middle", "t t-cap");
  for (const id of ["com", "xpdr"]) {
    const yy = ROWS[id];
    wire(`w-${id}`, [[SX.avn + 2, yy], [SX.avn + 12, yy], [SX.avn + 32, yy], [SX.avn + 44, yy]], id);
    sym += cbSym(SX.avn + 12, yy, id) + `<rect class="vis paper-fill" x="${SX.avn + 44}" y="${yy - 7}" width="22" height="14"/>` + ground(SX.avn + 55, yy + 7);
    txt(SX.avn + 22, yy - 7, "5", "middle", "t t-cap");
    txt(SX.avn + 72, yy + 2.6, id === "com" ? "COM/NAV" : "XPDR");
  }
  txt(SX.avn, SX.avnBot + 10, "AVN BUS", "middle", "t t-cap");
}
// ---- the alternator: B+ through the bridge and the 60 A breaker to the bus; its field from the bus
// through the field breaker, the ALT half of the master and the regulator's switch
const ALT_C = [494, 108];
const REG = { x: 448, y: 168, w: 92, h: 40 };
wire("w-bplus", [[ALT_C[0] + 20, ALT_C[1]], [560, ALT_C[1]], [584, ALT_C[1]], [604, ALT_C[1]], [SX.bus - 2, ALT_C[1]]], "alt");
sym += `<circle class="vis paper-fill" cx="${ALT_C[0]}" cy="${ALT_C[1]}" r="20"/><text class="t t-sm" x="${ALT_C[0]}" y="${ALT_C[1] - 3}" text-anchor="middle">ALT</text><path class="thin" d="M${ALT_C[0] - 8} ${ALT_C[1] + 7}C${ALT_C[0] - 5} ${ALT_C[1] + 1} ${ALT_C[0] - 2} ${ALT_C[1] + 1} ${ALT_C[0]} ${ALT_C[1] + 7}S${ALT_C[0] + 5} ${ALT_C[1] + 13} ${ALT_C[0] + 8} ${ALT_C[1] + 7}"/>`;
sym += `<path class="vis paper-fill" d="M528 ${ALT_C[1] - 6}L540 ${ALT_C[1]}L528 ${ALT_C[1] + 6}Z"/><path class="vis" d="M540 ${ALT_C[1] - 6}V${ALT_C[1] + 6}"/>`;
sym += cbSym(584, ALT_C[1], "alt");
txt(594, ALT_C[1] - 7, "60", "middle", "t t-cap");
txt(534, ALT_C[1] - 10, "6 DIODES", "middle", "t t-cap");
const FIELD_Y = 150;
sym += `<path class="vis" d="M${ALT_C[0] - 12} ${ALT_C[1] + 16}V${FIELD_Y - 8}M${ALT_C[0] - 12} ${FIELD_Y - 8}h3a3 3 0 0 1 6 0a3 3 0 0 1 6 0a3 3 0 0 1 6 0h3V${ALT_C[1] + 16}"/>`;
txt(ALT_C[0] + 20, FIELD_Y - 9, "FIELD", "start", "t t-cap");
wire("w-field", [[SX.bus - 2, REG.y + 20], [624, REG.y + 20], [604, REG.y + 20], [586, REG.y + 20], [566, REG.y + 20], [REG.x + REG.w, REG.y + 20]], "field");
wire("w-field2", [[REG.x + REG.w / 2 + 16, REG.y], [REG.x + REG.w / 2 + 16, FIELD_Y], [ALT_C[0] + 12, FIELD_Y], [ALT_C[0] + 12, FIELD_Y - 8]], "field");
wire("w-field3", [[ALT_C[0] - 12, FIELD_Y - 8], [ALT_C[0] - 12, FIELD_Y], [REG.x + 14, FIELD_Y], [REG.x + 14, REG.y]], "field");
sym += cbSym(604, REG.y + 20, "field") + swSym(566, REG.y + 20, "alt", false);
txt(614, REG.y + 13, "5", "middle", "t t-cap");
txt(576, REG.y + 31, "MASTER ALT", "middle", "t t-cap");
txt(REG.x + 6, REG.y + 11, "REGULATOR 28.0 V");
sym += `<path id="s-pwm" class="vis accent-line" d=""/>`;
// ---- the battery, its contactor, the ammeter's shunt, the starter's contactor and the starter
const BATP = { x: 452, top: 334, bot: 374 };
const BC = { x0: 482, x1: 512, y: 300 }; // the battery contactor's contacts
const SH = { x0: 528, x1: 546 }; // the ammeter's shunt
const NODE = [570, 300]; // the starter's tap, ahead of the shunt
const BCOIL = { x: 488, y: 266, w: 18, h: 9 };
const SC = { y0: 330, y1: 350 }; // the starter contactor's contacts
const SCOIL = { x: 582, y: 335, w: 18, h: 9 };
wire("w-bat", [[BATP.x, BATP.top], [BATP.x, BC.y], [BC.x0, BC.y], [BC.x1, BC.y], [SH.x0, BC.y], [SH.x1, BC.y], [NODE[0], NODE[1]]], "bat");
wire("w-shunt", [[NODE[0], NODE[1]], [SX.bus - 2, NODE[1]]], "shunt");
wire("w-start", [[NODE[0], NODE[1]], [NODE[0], SC.y0], [NODE[0], SC.y1], [NODE[0], 402]], "start");
wire("w-bcoil", [[BATP.x, BC.y], [BATP.x, BCOIL.y + BCOIL.h / 2], [BCOIL.x, BCOIL.y + BCOIL.h / 2]], "bcoil");
wire("w-bcoil2", [[BCOIL.x + BCOIL.w, BCOIL.y + BCOIL.h / 2], [518, BCOIL.y + BCOIL.h / 2], [538, BCOIL.y + BCOIL.h / 2], [546, BCOIL.y + BCOIL.h / 2]], "bcoil");
wire("w-scoil", [[SX.bus - 2, 384], [612, 384], [592, 384], [SCOIL.x + SCOIL.w / 2, 384], [SCOIL.x + SCOIL.w / 2, SCOIL.y + SCOIL.h]], "scoil");
wire("w-scoil2", [[SCOIL.x + SCOIL.w, SCOIL.y + SCOIL.h / 2], [608, SCOIL.y + SCOIL.h / 2]], "scoil");
sym += `<g id="s-batt">${[0, 1, 2, 3].map((i) => `<path class="vis" d="M${BATP.x - 12} ${BATP.top + 4 + i * 9}H${BATP.x + 12}"/><path class="vis thick2" d="M${BATP.x - 6} ${BATP.top + 8 + i * 9}H${BATP.x + 6}"/>`).join("")}</g>`;
sym += `<path class="vis" d="M${BATP.x} ${BATP.top}V${BATP.top + 4}M${BATP.x} ${BATP.top + 35}V${BATP.bot}"/>` + ground(BATP.x, BATP.bot);
txt(BATP.x + 16, BATP.top + 8, "+", "start");
txt(BATP.x + 16, BATP.top + 22, "24 V", "start", "t t-cap");
txt(BATP.x + 16, BATP.top + 31, "13.6 Ah", "start", "t t-cap");
// the contactors: a pair of contacts on the line, a coil beside them, linked (dashed)
sym += `<g id="s-bc"><circle class="vis paper-fill" cx="${BC.x0}" cy="${BC.y}" r="1.6"/><circle class="vis paper-fill" cx="${BC.x1}" cy="${BC.y}" r="1.6"/><path id="s-bc-bar" class="vis" d=""/></g>`;
sym += `<path class="hid" d="M${BCOIL.x + BCOIL.w / 2} ${BCOIL.y + BCOIL.h}V${BC.y - 7}"/>`;
sym += swSym(518, BCOIL.y + BCOIL.h / 2, "bat", false) + ground(546, BCOIL.y + BCOIL.h / 2);
sym += node(BATP.x, BC.y);
txt(BCOIL.x + BCOIL.w / 2, BCOIL.y - 6, "BAT CONT", "middle", "t t-cap");
txt(530, BC.y - 10, "MASTER BAT", "middle", "t t-cap");
sym += `<rect class="vis paper-fill" x="${SH.x0}" y="${BC.y - 3.5}" width="${SH.x1 - SH.x0}" height="7"/><path class="thin" d="M${SH.x0 + 2} ${BC.y + 3.5}V${BC.y + 12}M${SH.x1 - 2} ${BC.y + 3.5}V${BC.y + 12}"/>`;
const AMM = [(SH.x0 + SH.x1) / 2, BC.y + 20];
sym += `<circle class="vis paper-fill" cx="${AMM[0]}" cy="${AMM[1]}" r="8"/><text class="t t-sm" x="${AMM[0]}" y="${AMM[1] + 2.7}" text-anchor="middle">A</text>`;
txt(AMM[0] - 11, AMM[1] + 2.2, "AMMETER", "end", "t t-cap");
sym += node(NODE[0], NODE[1]);
sym += `<g id="s-sc"><circle class="vis paper-fill" cx="${NODE[0]}" cy="${SC.y0}" r="1.6"/><circle class="vis paper-fill" cx="${NODE[0]}" cy="${SC.y1}" r="1.6"/><path id="s-sc-bar" class="vis" d=""/></g>`;
sym += `<path class="hid" d="M${SCOIL.x} ${SCOIL.y + SCOIL.h / 2}H${NODE[0] + 4}"/>`;
sym += ground(608, SCOIL.y + SCOIL.h / 2);
sym += swSym(592, 384, "start", false);
txt(602, 397, "KEY START", "middle", "t t-cap");
txt(NODE[0] - 6, SC.y0 + 13, "START CONT", "end", "t t-cap");
sym += motor(NODE[0], 410) + ground(NODE[0], 418);
txt(NODE[0] - 12, 413, "STARTER", "end", "t t-cap");
txt(SX.bus, SX.busBot + 10, "MAIN BUS", "middle", "t t-cap");
// ---- the wires: a current band in the accent under each (its dashes run with the current), a thin line
const wireSvg =
  `<g data-role="fluid">${Object.entries(W).map(([id, w]) => `<path id="${id}" class="cur" d="M${w.pts.map((p) => p.join(" ")).join("L")}"/>`).join("")}</g>` +
  `<path class="vis wire" d="${Object.values(W).map((w) => `M${w.pts.map((p) => p.join(" ")).join("L")}`).join("")}"/>`;
const schematic =
  `<g data-geom="S">` +
  wireSvg +
  P.part(21, `<rect class="vis bus" x="${SX.bus - 2}" y="${SX.busTop}" width="4" height="${SX.busBot - SX.busTop}"/>`) +
  P.part(22, `<rect class="vis bus" x="${SX.avn - 2}" y="${SX.avnTop}" width="4" height="${SX.avnBot - SX.avnTop}"/>`) +
  P.part(12, `<rect class="vis paper-fill" x="${REG.x}" y="${REG.y}" width="${REG.w}" height="${REG.h}"/>`) +
  P.part(15, coil(BCOIL.x, BCOIL.y, BCOIL.w, BCOIL.h)) +
  P.part(16, coil(SCOIL.x, SCOIL.y, SCOIL.w, SCOIL.h)) +
  sym +
  words +
  `</g>`;
const balloonsS =
  K.balloon(VS, sp([REG.x + 2, REG.y + REG.h - 2]), [442, 226], 12, { target: 12 }) +
  K.balloon(VS, sp([BCOIL.x + 2, BCOIL.y + 2]), [462, 250], 15, { target: 15 }) +
  K.balloon(VS, sp([SCOIL.x + SCOIL.w - 3, SCOIL.y + SCOIL.h - 2]), [618, 362], 16, { target: 16 }) +
  K.balloon(VS, sp([SX.bus + 1, 80]), [618, 64], 21, { target: 21 }) +
  K.balloon(VS, sp([SX.avn - 1, SX.avnBot - 12]), [716, 362], 22, { target: 22 });
const labelS = K.viewLabel(636, 466, "SCHEMATIC", "28 V DC · CURRENT IN THE ACCENT, ITS DASHES RUN WITH IT · NTS");

// ---------------------------------------------------------------- DIAGRAM 1: alternator output
const C1 = { x0: 886, x1: 1146, y0: 42, y1: 108, rMax: 2800, iMax: 100 };
const c1x = (r) => K.r2(C1.x0 + (Math.min(C1.rMax, Math.max(0, r)) / C1.rMax) * (C1.x1 - C1.x0));
const c1y = (i) => K.r2(C1.y1 - (Math.min(C1.iMax, Math.max(0, i)) / C1.iMax) * (C1.y1 - C1.y0));
function chart1() {
  let grid = "";
  let labels = "";
  for (let i = 0; i <= C1.iMax; i += 20) {
    grid += `M${C1.x0} ${c1y(i)}H${C1.x1}`;
    labels += `<text class="t t-sm" x="${C1.x0 - 4}" y="${K.r2(c1y(i) + 2.7)}" text-anchor="end">${i}</text>`;
  }
  for (let r = 0; r <= C1.rMax; r += 400) {
    grid += `M${c1x(r)} ${C1.y0}V${C1.y1}`;
    if (r % 800 === 0) labels += `<text class="t t-sm" x="${c1x(r)}" y="${C1.y1 + 10}" text-anchor="middle">${r}</text>`;
  }
  const full = range(0, C1.rMax, 70).map((r) => `${c1x(r)},${c1y(M.altCurrent(r * M.ALT_RATIO, M.IF_FULL, 28))}`).join(" ");
  const lim = `M${C1.x0} ${c1y(M.I_LIMIT)}H${C1.x1}`;
  const rated = `M${C1.x0} ${c1y(M.ALT.rated)}H${C1.x1}`;
  const cut = M.CUT_IN / M.ALT_RATIO;
  labels += `<text class="t t-sm" x="${c1x(cut)}" y="${C1.y1 - 4}" text-anchor="middle">CUT-IN</text>`;
  labels += `<text class="t t-sm" x="${C1.x1 - 3}" y="${K.r2(c1y(M.I_LIMIT) + 9)}" text-anchor="end">SELF-LIMIT ${Math.round(M.I_LIMIT)} A</text>`;
  labels += `<text class="t t-sm" x="${c1x(1650)}" y="${K.r2(c1y(M.ALT.rated) - 3)}" text-anchor="end">RATED 60</text>`;
  labels += `<text class="t t-sm t-mute" x="${(C1.x0 + C1.x1) / 2}" y="${C1.y1 + 21}" text-anchor="middle">ENGINE rpm (ALTERNATOR ×${M.ALT_RATIO.toFixed(0)})</text>`;
  labels += `<text class="t t-sm t-mute" x="${C1.x0 - 22}" y="${(C1.y0 + C1.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${C1.x0 - 22} ${(C1.y0 + C1.y1) / 2})">A</text>`;
  const ticks = [[M.RPM.idle, "IDLE"], [M.RPM.cruise, "CRUISE"]].map(([r]) => `M${c1x(r)} ${C1.y1}V${C1.y1 - 4}`).join("");
  return (
    `<g data-role="chart"><rect class="paper" x="${C1.x0}" y="${C1.y0}" width="${C1.x1 - C1.x0}" height="${C1.y1 - C1.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="hid" d="${lim}"/><path class="thin" d="${rated}${ticks}"/>` +
    `<polyline class="vis" points="${full}"/>` +
    `<polyline id="c1-now" class="thin accent-line" points=""/>` +
    `<circle id="c1-dot" class="accent-fill" cx="${C1.x0}" cy="${C1.y1}" r="3"/>` +
    `<rect class="vis" x="${C1.x0}" y="${C1.y0}" width="${C1.x1 - C1.x0}" height="${C1.y1 - C1.y0}"/>` +
    labels +
    `<rect class="hit" data-drag="rpm" x="${C1.x0}" y="${C1.y0}" width="${C1.x1 - C1.x0}" height="${C1.y1 - C1.y0}"/>` +
    `</g>` +
    K.viewLabel((C1.x0 + C1.x1) / 2, 144, "DIAGRAM 1 · ALTERNATOR OUTPUT AT 28 V", "THICK: FULL FIELD · ACCENT: THIS FIELD, NOW · DRAG FOR rpm")
  );
}
function range(a, b, step) {
  const out = [];
  for (let x = a; x <= b + 1e-9; x += step) out.push(x);
  return out;
}

// ---------------------------------------------------------------- DIAGRAM 2: breaker trip curve
const C2 = { x0: 886, x1: 1146, y0: 176, y1: 238, lx: [0, Math.log10(20)], ly: [-1, 3] };
const c2x = (r) => K.r2(C2.x0 + ((Math.log10(Math.max(1, r)) - C2.lx[0]) / (C2.lx[1] - C2.lx[0])) * (C2.x1 - C2.x0));
const c2y = (t) => K.r2(C2.y1 - ((Math.min(C2.ly[1], Math.max(C2.ly[0], Math.log10(t))) - C2.ly[0]) / (C2.ly[1] - C2.ly[0])) * (C2.y1 - C2.y0));
function chart2() {
  let grid = "";
  let labels = "";
  for (let e = C2.ly[0]; e <= C2.ly[1]; e++) {
    grid += `M${C2.x0} ${c2y(10 ** e)}H${C2.x1}`;
    labels += `<text class="t t-sm" x="${C2.x0 - 4}" y="${K.r2(c2y(10 ** e) + 2.7)}" text-anchor="end">${10 ** e >= 1 ? 10 ** e : 10 ** e}</text>`;
  }
  for (const r of [1, 2, 3, 5, 10, 20]) {
    grid += `M${c2x(r)} ${C2.y0}V${C2.y1}`;
    labels += `<text class="t t-sm" x="${c2x(r)}" y="${C2.y1 + 10}" text-anchor="middle">${r}</text>`;
  }
  const pts = [];
  for (let lr = Math.log10(M.BREAKER.k * 1.0005); lr <= C2.lx[1]; lr += 0.01) {
    const t = M.tripTime(10 ** lr);
    if (t <= 10 ** C2.ly[1]) pts.push(`${c2x(10 ** lr)},${c2y(t)}`);
  }
  labels += `<text class="t t-sm" x="${c2x(1.27) + 3}" y="${C2.y0 + 9}">${Math.round(M.BREAKER.k * 100)} %: NEVER BELOW</text>`;
  labels += `<text class="t t-sm" x="${c2x(4.5)}" y="${K.r2(c2y(M.tripTime(4.5)) - 5)}">I²t = τ·(1.25 In)²</text>`;
  labels += `<text class="t t-sm t-mute" x="${(C2.x0 + C2.x1) / 2}" y="${C2.y1 + 21}" text-anchor="middle">CURRENT / RATING</text>`;
  labels += `<text class="t t-sm t-mute" x="${C2.x0 - 26}" y="${(C2.y0 + C2.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${C2.x0 - 26} ${(C2.y0 + C2.y1) / 2})">TRIP, s</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${C2.x0}" y="${C2.y0}" width="${C2.x1 - C2.x0}" height="${C2.y1 - C2.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="hid" d="M${c2x(M.BREAKER.k)} ${C2.y0}V${C2.y1}"/>` +
    `<polyline class="vis" points="${pts.join(" ")}"/>` +
    `<path id="c2-bar" class="thin accent-line" d=""/>` +
    `<circle id="c2-dot" class="accent-fill" cx="${C2.x0}" cy="${C2.y1}" r="3"/>` +
    `<rect class="vis" x="${C2.x0}" y="${C2.y0}" width="${C2.x1 - C2.x0}" height="${C2.y1 - C2.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((C2.x0 + C2.x1) / 2, 274, "DIAGRAM 2 · THERMAL BREAKER, INVERSE TIME", "FROM COLD · ACCENT: THE HOTTEST BREAKER, ITS HEAT SO FAR")
  );
}

// ---------------------------------------------------------------- DIAGRAM 3: the tour
const TRACE = M.tourTrace(1 / 480, 24);
const C3 = { x0: 486, x1: 812, y0: 676, y1: 760, tMax: M.TOUR, vMin: 14, vMax: 30, iLim: 40 };
const c3x = (t) => K.r2(C3.x0 + (Math.min(C3.tMax, Math.max(0, t)) / C3.tMax) * (C3.x1 - C3.x0));
const c3v = (v) => K.r2(C3.y1 - ((Math.min(C3.vMax, Math.max(C3.vMin, v)) - C3.vMin) / (C3.vMax - C3.vMin)) * (C3.y1 - C3.y0));
const c3i = (i) => K.r2((C3.y0 + C3.y1) / 2 - (Math.min(C3.iLim, Math.max(-C3.iLim, i)) / C3.iLim) * ((C3.y1 - C3.y0) / 2));
function chart3() {
  let grid = "";
  let labels = "";
  for (let v = C3.vMin; v <= C3.vMax; v += 4) {
    grid += `M${C3.x0} ${c3v(v)}H${C3.x1}`;
    labels += `<text class="t t-sm" x="${C3.x0 - 4}" y="${K.r2(c3v(v) + 2.7)}" text-anchor="end">${v}</text>`;
  }
  for (const i of [-40, -20, 0, 20, 40]) labels += `<text class="t t-sm" x="${C3.x1 + 4}" y="${K.r2(c3i(i) + 2.7)}">${i > 0 ? "+" : ""}${i}</text>`;
  for (let t = 0; t <= C3.tMax; t += 5) {
    grid += `M${c3x(t)} ${C3.y0}V${C3.y1}`;
    if (t % 10 === 0 && t < C3.tMax) labels += `<text class="t t-sm" x="${c3x(t)}" y="${C3.y1 + 10}" text-anchor="middle">${t}</text>`;
  }
  const vLine = TRACE.map((r) => `${c3x(r[0])},${c3v(r[1])}`).join(" ");
  const iLine = TRACE.map((r) => `${c3x(r[0])},${c3i(r[4])}`).join(" ");
  const peak = TRACE.reduce((a, r) => (r[2] > a[2] ? r : a), TRACE[0]);
  const tag = (t, s) => `<text class="t t-sm" x="${c3x(t)}" y="${C3.y0 + 9}" text-anchor="middle">${s}</text>`;
  labels += tag((M.T.start + M.T.alt) / 2, "START") + tag((M.T.alt + M.T.loads) / 2, "ALT") + tag((M.T.loads + M.T.belt) / 2, "LOADS") + tag((M.T.belt + M.T.shed) / 2, "BELT") + tag((M.T.shed + M.T.short) / 2, "SHED") + tag((M.T.short + M.TOUR) / 2, "SHORT");
  grid += [M.T.start, M.T.alt, M.T.loads, M.T.belt, M.T.shed, M.T.short].map((t) => `M${c3x(t)} ${C3.y0}V${C3.y0 + 12}`).join("");
  labels += `<text class="t t-sm" x="${c3x(peak[0]) + 4}" y="${C3.y1 - 4}">${Math.round(peak[2])} A INRUSH</text>`;
  labels += `<text class="t t-sm t-mute" x="${(C3.x0 + C3.x1) / 2}" y="${C3.y1 + 21}" text-anchor="middle">TOUR TIME, s</text>`;
  labels += `<text class="t t-sm t-mute" x="${C3.x0 - 20}" y="${(C3.y0 + C3.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${C3.x0 - 20} ${(C3.y0 + C3.y1) / 2})">BUS, V</text>`;
  labels += `<text class="t t-sm t-mute" x="${C3.x1 + 26}" y="${(C3.y0 + C3.y1) / 2}" text-anchor="middle" transform="rotate(90 ${C3.x1 + 26} ${(C3.y0 + C3.y1) / 2})">AMMETER, A</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${C3.x0}" y="${C3.y0}" width="${C3.x1 - C3.x0}" height="${C3.y1 - C3.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="thin" d="M${C3.x0} ${c3i(0)}H${C3.x1}"/>` +
    `<polyline class="hid" points="${iLine}"/>` +
    `<polyline class="vis" points="${vLine}"/>` +
    `<path id="c3-cursor" class="thin" d="M${C3.x0} ${C3.y0}V${C3.y1}"/>` +
    `<circle id="c3-v" class="accent-fill" cx="${C3.x0}" cy="${C3.y1}" r="2.8"/>` +
    `<circle id="c3-i" class="dot" cx="${C3.x0}" cy="${c3i(0)}" r="2.2"/>` +
    `<rect class="vis" x="${C3.x0}" y="${C3.y0}" width="${C3.x1 - C3.x0}" height="${C3.y1 - C3.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((C3.x0 + C3.x1) / 2, 800, "DIAGRAM 3 · THE TOUR", "THICK: BUS VOLTAGE · DASHED: AMMETER, + CHARGING · ACCENT: NOW")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "DRIVE-END FRAME", "A356-T6", "1"],
  ["2", "SLIP-RING-END FRAME, BRUSH HOLDER", "A356-T6 / PA66-GF", "1"],
  ["3", "STATOR, 42 SLOTS, 3-PHASE STAR", "M19 LAMS / Cu", "1"],
  ["4", "CLAW-POLE ROTOR, 14 POLES, SHAFT", "1010 / 4140", "1"],
  ["5", "FIELD WINDING ON BOBBIN, 8.4 Ω", "Cu / PA66", "1"],
  ["6", "SLIP RINGS ON INSULATOR", "Cu / PHENOLIC", "2"],
  ["7", "BRUSHES 3×6, SPRINGS", "ELECTROGRAPHITE", "2"],
  ["8", "RECTIFIER, 6 DIODES, B+ STUD", "Si / 6063-T5", "1"],
  ["9", "PULLEY Ø68 PITCH, FAN", "1045 / 1010", "1"],
  ["10", "BALL BEARING 6203, 6201", "52100", "2"],
  ["11", "ALTERNATOR V-BELT", "CR, POLYESTER", "1"],
  ["12", "VOLTAGE REGULATOR 28.0 V", "BOUGHT OUT", "1"],
  ["13", "BATTERY CASE, LID, VENT CAPS", "PP", "1"],
  ["14", "CELL ELEMENTS, ELECTROLYTE", "Pb-Ca / PbO₂ / H₂SO₄", "12"],
  ["15", "BATTERY CONTACTOR", "BOUGHT OUT", "1"],
  ["16", "STARTER CONTACTOR", "BOUGHT OUT", "1"],
  ["17", "SPLIT MASTER SWITCH ALT / BAT", "BOUGHT OUT", "1"],
  ["18", "STARTER FRAMES, MAGNETS, BRUSHES", "STEEL / ALU / FERRITE", "1"],
  ["19", "STARTER ARMATURE, COMMUTATOR", "M19 / Cu", "1"],
  ["20", "BENDIX DRIVE, PINION 11 T", "8620, CARBURIZED", "1"],
  ["21", "MAIN BUS BAR", "Cu C11000", "1"],
  ["22", "AVIONICS MASTER SWITCH AND BUS", "BOUGHT OUT / Cu", "1"],
  ["23", "AMMETER ±60 A, SHUNT 50 mV", "BOUGHT OUT", "1"],
  ["24", "LOW-VOLTAGE ANNUNCIATOR", "BOUGHT OUT", "1"],
  ["25", "CIRCUIT BREAKER, PUSH-PULL, THERMAL", "BOUGHT OUT", "11"],
];
const TB = { x: 850, w: 326, h: 140 };
TB.y = 824 - TB.h;
const rowH = 12;
const bomTop = TB.y - (18 + BOM.length * rowH);
const bom = K.table(TB.x, bomTop, [
  { w: 26, align: "center", title: "ITEM" },
  { w: 164, title: "DESCRIPTION" },
  { w: 108, title: "MATERIAL" },
  { w: 28, align: "center", title: "QTY" },
], BOM, { rowH });

const notes = K.notes(856, 304, "NOTES", [
  `ALTERNATOR AT ${M.ALT_RATIO.toFixed(0)} × CRANK. E AND X BOTH ∝ n, SO I → ${Math.round(M.I_LIMIT)} A.`,
  `BATTERY OCV = 12 (SG + 0.84) V, R ${Math.round(M.BAT.R0 * 1000)} mΩ, PEUKERT k = ${M.BAT.peukert}.`,
  `BREAKERS dθ/dt = ((I / 1.25 In)² − θ)/τ, τ = ${M.BREAKER.tau} s; TRIP AT θ = 1.`,
  `SHOWN SLOWED: B-B'S ROTOR 1/${SLOW.rotor}, VIEW H'S GEARS 1/${SLOW.ring}.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 236, h: 32, label: "TITLE", value: "28 V ELECTRICAL SYSTEM", size: "lg" },
  { x: 236, y: 0, w: 90, h: 32, label: "DWG NO", value: "BP-110", size: "lg" },
  { x: 0, y: 32, w: 50, h: 25, label: "SCALE", value: "AS SHOWN" },
  { x: 50, y: 32, w: 40, h: 25, label: "SIZE", value: "A2" },
  { x: 90, y: 32, w: 50, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 140, y: 32, w: 86, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 226, y: 32, w: 100, h: 25, label: "DATE", value: "2026-10-18" },
  { x: 0, y: 57, w: 110, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 110, y: 57, w: 96, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 206, y: 57, w: 120, h: 25, label: "UNITS", value: "mm · V · A · s" },
  { x: 0, y: 82, w: 326, h: 29, label: "LIVE · BUS · B A V MASTERS · HOLD K: START · ↑ ↓ rpm · Z BELT", value: "", id: "readout", size: "sm" },
  { x: 0, y: 111, w: 326, h: 29, label: "LIVE · BATTERY · N L P · F FLAPS · X SHORT · 1–9 0 − BREAKERS", value: "", id: "readout2", size: "sm" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="acid" patternUnits="userSpaceOnUse" width="3" height="3"><circle class="acid-dot" cx="0.75" cy="0.75" r="0.5"/><circle class="acid-dot" cx="2.25" cy="2.25" r="0.5"/></pattern>` +
  `<pattern id="lit" patternUnits="userSpaceOnUse" width="2.4" height="2.4"><circle class="lit-dot" cx="0.6" cy="0.6" r="0.55"/><circle class="lit-dot" cx="1.8" cy="1.8" r="0.55"/></pattern>` +
  `<pattern id="cu" patternUnits="userSpaceOnUse" width="2" height="2"><circle class="lit-dot" cx="0.5" cy="0.5" r="0.5"/><circle class="lit-dot" cx="1.5" cy="1.5" r="0.5"/></pattern>` +
  `<clipPath id="clip-H"><rect x="${H.x}" y="${H.y}" width="${H.w}" height="${H.h}" rx="8"/></clipPath>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `</defs>`;

const hits =
  M.CB.map((c, i) => `<rect class="hit" data-cb="${i}" x="${K.r2(VF.p([P.cbU(i) - 8, 0])[0])}" y="${K.r2(VF.p([0, PF.cb.v + 8])[1])}" width="${K.r2(16 * VF.k)}" height="${K.r2(16 * VF.k)}"/>`).join("") +
  ["alt", "bat", "avn"].map((k) => `<rect class="hit" data-sw="${k}" x="${K.r2(VF.p([PF.sw[k][0], 0])[0])}" y="${K.r2(VF.p([0, PF.sw.v[1]])[1])}" width="${K.r2((PF.sw[k][1] - PF.sw[k][0]) * VF.k)}" height="${K.r2((PF.sw.v[1] - PF.sw.v[0]) * VF.k)}"/>`).join("") +
  `<rect class="hit" data-key="1" x="${K.r2(VF.p([PF.key.c[0] - PF.key.r, 0])[0])}" y="${K.r2(VF.p([0, PF.key.c[1] + PF.key.r])[1])}" width="${K.r2(2 * PF.key.r * VF.k)}" height="${K.r2(2 * PF.key.r * VF.k)}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of the 28 volt DC electrical system of a four-seat high-wing light aircraft: the belt-driven alternator in axial section with its claw-pole rotor, field winding, slip rings, brushes, stator and six-diode rectifier; the stator and rotor in cross-section; the starter with its Bendix pinion at the ring gear; the lead-acid battery across its plates; one push-pull thermal breaker in section; the panel's master switch, avionics master, ammeter, low-voltage light and eleven breakers; the wiring schematic with current shown along every wire; and diagrams of the alternator's output, the breaker's trip curve and the bus voltage over the tour. The tour turns the battery master on, cranks the engine with a 300 ampere inrush and a sag to 17 volts, brings the alternator on line to recharge the battery, switches the loads on, breaks the alternator's belt so the battery discharges with the low-voltage light on and the endurance left computed, sheds loads, and shorts the nav light circuit until its breaker trips." ` +
  `data-views='${JSON.stringify(VIEWS)}' data-live='${JSON.stringify(LIVE)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  sectionA + balloonsA + labelA +
  sectionB + labelB +
  sectionD + balloonsD + `<g id="lb-20"></g>` + labelD +
  sectionE + `<g data-role="dim">${dimE.replace(/^<g data-role="dim">|<\/g>$/g, "")}</g>` + balloonsE + labelE +
  detailG + balloonG + calloutsG + labelG +
  panelF() + balloonsF + labelF +
  viewH +
  schematic + balloonsS + labelS +
  chart1() + chart2() + chart3() +
  notes + bom + title + hits +
  `</svg>`;

const bar =
  `<span><kbd>B</kbd> <kbd>A</kbd> masters · hold <kbd>K</kbd> start · <kbd>V</kbd> avionics · <kbd>N</kbd> <kbd>L</kbd> <kbd>P</kbd> loads · <kbd>F</kbd> flaps · <kbd>↑</kbd> <kbd>↓</kbd> rpm · <kbd>Z</kbd> belt · <kbd>X</kbd> short · <kbd>1</kbd>–<kbd>9</kbd> <kbd>0</kbd> <kbd>−</kbd> breakers · <kbd>Space</kbd> tour</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "electrical.html"), {
  title: "28 V Aircraft Electrical System",
  description: "A live engineering drawing of a light aircraft's 28 V DC electrical system: the alternator with its claw-pole rotor, slip rings and diode bridge, the regulator, the battery, the starter's Bendix pinion at the ring gear, the master switch, contactors, buses, ammeter, low-voltage light and push-pull thermal breakers, from one model.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet [data-cb],.bp-sheet [data-sw],.bp-sheet [data-key]{cursor:pointer}.bp-sheet [data-drag]{cursor:ew-resize}` +
    `.bp-sheet .tint.acid{fill:url(#acid)}.bp-sheet .acid-dot{fill:var(--bp-muted)}.bp-sheet .tint.lit,.bp-sheet .cu{fill:url(#lit)}.bp-sheet .lit-dot{fill:var(--bp-accent)}` +
    `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet .paper-fill{fill:var(--bp-paper)}.bp-sheet .paper-line{stroke:var(--bp-paper);stroke-width:.3px;fill:none}` +
    `.bp-sheet .wire{fill:none;stroke-width:.8px;stroke-linejoin:round}.bp-sheet .bus{fill:var(--bp-ink)}.bp-sheet .thick2{stroke-width:2.4px}` +
    `.bp-sheet .cur{fill:none;stroke:var(--bp-accent);stroke-width:3.2px;stroke-linejoin:round;stroke-dasharray:2.2 3.2}` +
    `.bp-sheet .accent-line{stroke:var(--bp-accent);fill:none}.bp-sheet polyline.accent-line{stroke-width:1.1px}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "../light-aircraft/model.mjs"), "A"],
    [join(here, "../fuel-system/model.mjs"), "FS"],
    [join(here, "../wing-flaps/model.mjs"), "WF"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHARTS__", JSON.stringify({ SLOW, H, C1, C2, C3, REG, CBP, SWP, BCOIL, SCOIL, WIRES: Object.fromEntries(Object.entries(W).map(([k, w]) => [k, w.key])), BC, NODE, SC })),
});
const tr = M.tourTrace(1 / 480, 12);
console.log(
  `electrical.html  ${(size / 1024).toFixed(0)} KB  cut-in ${Math.round(M.CUT_IN / M.ALT_RATIO)} rpm  limit ${M.I_LIMIT.toFixed(0)} A  inrush ${Math.max(...tr.map((r) => r[2])).toFixed(0)} A  sag ${Math.min(...tr.filter((r) => r[0] > 2).map((r) => r[1])).toFixed(1)} V  ring ${M.RING.teeth}/${M.PINION.teeth} m ${M.MODULE.toFixed(3)}`
);
