// Builds gyro-instruments.html: a live A2 drawing of a light aircraft's gyroscopic flight instruments
// and the vacuum system that drives two of them: the attitude indicator cut across its gyro, the
// heading indicator in plan on its spin axis, the electric turn coordinator square to its canted
// gimbal axis, the carbon-vane dry pump across its rotor, the regulator, the central filter, the
// pendulous vanes and the inclinometer in detail, the panel as the pilot sees it, the system in the
// aircraft's side and two diagrams.
//   node examples/gyro-instruments/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const rad = Math.PI / 180;
const k1 = K.PX_PER_MM;

// ---------------------------------------------------------------- views
const L = { x: 290, y: 306, w: 136, h: 104, c: [-1.6, -17.8] }; // Detail L window, 5:1 (housing frame)
const KD = { x: 290, y: 444, w: 136, h: 98, c: [0, 1.0] }; // Detail K window, 2:1 (tube frame)
const VIEWS = {
  A: { x: 150, y: 158, scale: 1 },
  B: { x: 442, y: 162, scale: 1 },
  D: { x: 714, y: 158, scale: 1 },
  C: { x: 150, y: 425, scale: 1 },
  L: { x: K.r2(L.x + L.w / 2 - L.c[0] * 5 * k1), y: K.r2(L.y + L.h / 2 + L.c[1] * 5 * k1), scale: 5 },
  K: { x: K.r2(KD.x + KD.w / 2 - KD.c[0] * 2 * k1), y: K.r2(KD.y + KD.h / 2 + KD.c[1] * 2 * k1), scale: 2 },
  F: { x: 748, y: 367, scale: 2 },
  H: { x: 474, y: 650, scale: 0.5 },
  E: { x: 0, y: 0, scale: 0.5 }, // faces: each placed by its own translate
};
const FACES = { suc: [500, 362], ai: [596, 362], tc: [500, 456], hi: [596, 456] };
const V = Object.fromEntries(Object.entries(VIEWS).map(([k, s]) => [k, K.view(s)]));
const VE = (c) => K.view({ x: c[0], y: c[1], scale: 0.5 });

// ---------------------------------------------------------------- SECTION A-A: attitude indicator, 1:1
const VA = V.A;
const aiGyro = (Vw, idp = "") =>
  `<g data-role="fluid">${P.aiAir(Vw, `ai-air${idp}`)}</g>` + P.aiHousing(Vw) + P.aiRotor(Vw) + P.aiGimbal(Vw) + P.aiSideVanes(Vw) + P.aiCentres(Vw);
const sectionA =
  `<g data-geom="A">` +
  P.part(12, P.caseRing(VA)) +
  `<g id="ai-gyro">${aiGyro(VA)}</g>` +
  K.centerMark(VA, [0, 0], 4) +
  `</g>` +
  K.balloon(VA, [-39, 10], [52, 112], 12, { target: 12 }) +
  `<g id="lb-13"></g><g id="lb-14"></g><g id="lb-15"></g><g id="lb-16"></g>` +
  `<g data-role="label"><circle class="thin mark" cx="${VA.p([0, -18])[0]}" cy="${VA.p([0, -18])[1]}" r="${K.r2(8 * VA.k)}"/><text class="t t-lg" x="78" y="232" text-anchor="middle">L</text></g>` +
  K.viewLabel(150, 268, "SECTION A-A", "ATTITUDE INDICATOR · LOOKING FORWARD · 1:1");
const LIVE_A = { 13: { at: [19, 7], b: [252, 102] }, 14: { at: [24.25, 6], b: [252, 126] }, 15: { at: [30.9, -10], b: [252, 150] }, 16: { at: [-VU().half - 0.45, -18.5], b: [52, 214] } };
function VU() {
  return P.VU;
}

// ---------------------------------------------------------------- DETAIL L: the aft vane, 5:1
const VL = V.L;
const detailL =
  `<g data-geom="L" clip-path="url(#clip-L)"><rect class="paper" x="${L.x}" y="${L.y}" width="${L.w}" height="${L.h}"/>` +
  P.blockFace(VL) +
  `<g data-role="fluid"><path id="l-jet" class="tint" d=""/></g>` +
  `<g id="l-vane">${P.vane(VL, 0)}</g>` +
  `<g data-role="label" id="l-plumb"></g>` +
  K.centerline(VL, [P.VANE_PIVOT[0] + 2, P.VANE_PIVOT[1] + 1.5], [P.VANE_PIVOT[0] + 2, -23], 0) +
  `</g><rect class="thin" x="${L.x}" y="${L.y}" width="${L.w}" height="${L.h}" rx="10"/>` +
  K.viewLabel(L.x + L.w / 2, L.y + L.h + 14, "DETAIL L", "AFT VANE · HOUSING'S FRAME · 5:1");

// ---------------------------------------------------------------- SECTION C-C: heading indicator, plan, 1:1
const VC = V.C;
const hiGyro = (Vw) => `<g data-role="fluid">${P.hiAir(Vw, 0)}</g>` + P.hiGimbal(Vw) + P.hiHousing(Vw) + P.hiRotor(Vw) + P.hiCentres(Vw);
const sectionC =
  `<g data-geom="C">` +
  `<g id="hi-knob">${P.hiKnob(VC, 0)}</g>` +
  P.part(12, P.hiCase(VC)) +
  `<g id="hi-gyro">${hiGyro(VC)}</g>` +
  P.hiCard(VC) +
  K.breakLine(VC, [-44, P.HIC.back], [44, P.HIC.back]) +
  K.centerMark(VC, [0, 0], 4) +
  `</g>` +
  `<g id="lb-18"></g><g id="lb-19"></g><g id="lb-20"></g>` +
  K.balloon(VC, [10, P.HIC.face], [252, 486], 21, { target: 21 }) +
  K.balloon(VC, [P.HIC.knobU + 3, P.HIC.knobV0 + 4], [52, 540], 22, { target: 22 }) +
  K.viewLabel(150, 566, "SECTION C-C", "HEADING INDICATOR · PLAN, SPIN AXIS · 1:1");
const LIVE_C = { 18: { at: [7, 18], b: [252, 380] }, 19: { at: [-7, 23.25], b: [52, 360] }, 20: { at: [-1.5, 29.9], b: [52, 396] } };

// ---------------------------------------------------------------- SECTION D-D: turn coordinator, 1:1
const VD = V.D;
const sectionD =
  `<g data-geom="D">` +
  P.part(12, P.tcCase(VD) + P.tcLugs(VD)) +
  `<g data-role="fluid"><g id="tc-air">${P.tcAir(VD)}</g></g>` +
  P.tcDamper(VD) +
  `<g id="tc-gimbal">${P.tcMotor(VD)}${P.tcGimbal(VD)}${P.tcPaddle(VD)}${K.centerline(VD, [-22, 0], [24, 0], 0)}</g>` +
  `<g id="tc-springs">${P.tcSprings(VD, 0)}</g>` +
  K.centerMark(VD, [0, 0], 4) +
  `</g>` +
  `<g id="lb-23"></g><g id="lb-24"></g><g id="lb-25"></g>` +
  K.balloon(VD, [(P.TC_DAMP.r1 + 0.8) * Math.cos(-58 * rad), (P.TC_DAMP.r1 + 0.8) * Math.sin(-58 * rad)], [812, 232], 26, { target: 26 }) +
  K.viewLabel(714, 268, "SECTION D-D", "TURN COORDINATOR · SQUARE TO ITS GIMBAL · 1:1");
const LIVE_D = { 23: { at: [3, 15.75], b: [812, 92] }, 24: { at: [18.4, -8], b: [812, 160] }, 25: { at: "spring", b: [812, 66] } };

// ---------------------------------------------------------------- SECTION B-B: the pump, 1:1
const VB = V.B;
const sectionB =
  `<g data-geom="B">` +
  `<g data-role="fluid">${P.pumpChambers(VB)}</g>` +
  P.pumpHousing(VB) +
  P.pumpLiner(VB) +
  `<g id="pump-rotor">${P.pumpRotor(VB)}${P.pumpShaft(VB)}</g>` +
  `<g id="pump-vanes">${P.pumpVanes(VB, 0)}</g>` +
  P.part(10, P.pumpFittings(VB)) +
  K.centerMark(VB, [0, 0], 4) +
  K.centerline(VB, [0, P.BORE_C[1] - 31], [0, P.BORE_C[1] + 48], 0) +
  `</g>` +
  K.balloon(VB, [-36, 30], [346, 64], 1, { target: 1 }) +
  K.balloon(VB, [0, P.BORE_C[1] + 29], [442, 46], 2, { target: 2 }) +
  `<g id="lb-3"></g><g id="lb-4"></g>` +
  K.balloon(VB, [0, 4.2], [372, 252], 5, { target: 5 }) +
  K.balloon(VB, [65, P.BORE_C[1] + 16.5], [536, 64], 10, { target: 10 }) +
  K.viewLabel(442, 268, "SECTION B-B", "DRY VACUUM PUMP · ACROSS THE ROTOR · 1:1");
const LIVE_B = { 3: { b: [512, 252] }, 4: { b: [342, 214] } };

// ---------------------------------------------------------------- SECTION F-F: regulator, 2:1
const VF = V.F;
const sectionF =
  `<g data-geom="F">` +
  `<g data-role="fluid"><g id="reg-air">${P.regAir(VF, 0)}</g></g>` +
  P.regBody(VF) +
  P.part(10, P.regFittings(VF)) +
  `<g id="reg-poppet">${P.regPoppet(VF, 0)}</g>` +
  `<g id="reg-spring">${P.regSpring(VF, 0)}</g>` +
  K.centerline(VF, [0, -24], [0, 13], 0) +
  `</g>` +
  K.balloon(VF, [11, 0], [826, 330], 6, { target: 6 }) +
  K.balloon(VF, [-5, -2.8], [672, 372], 7, { target: 7 }) +
  K.balloon(VF, [-3.6, -14.6], [672, 444], 8, { target: 8 }) +
  `<g id="dim-x-wrap"></g>` +
  K.viewLabel(748, 482, "SECTION F-F", "VACUUM REGULATOR · AXIAL · 2:1");

// ---------------------------------------------------------------- SECTION H-H: central filter, 1:2
const VH = V.H;
const sectionH =
  `<g data-geom="H">` +
  `<g data-role="fluid">${P.filterAir(VH)}</g>` +
  P.filter(VH) +
  K.centerline(VH, [0, -40], [0, 31], 0) +
  `</g>` +
  K.balloon(VH, [24, 10], [522, 604], 9, { target: 9 }) +
  K.viewLabel(474, 712, "SECTION H-H", "CENTRAL AIR FILTER · 1:2");

// ---------------------------------------------------------------- DIAGRAM 3: the air's path, schematic
function schematic() {
  const t = (x, y, str, { anchor = "middle", id = "", cls = "t t-sm" } = {}) => `<text class="${cls}"${id ? ` id="${id}"` : ""} x="${x}" y="${y}" text-anchor="${anchor}">${str}</text>`;
  const box = (x0, y0, x1, y1, label) => `<rect class="paper" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="3"/><rect class="vis" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="3"/>` + t((x0 + x1) / 2, (y0 + y1) / 2 + 2.7, label);
  const head = (x, y, dx, dy) => `<path class="head" d="M${x} ${y}l${-dx * 6 - dy * 2} ${-dy * 6 - dx * 2}l${dy * 4} ${dx * 4}Z"/>`;
  const ln = (d, k) => `<path class="tint line" data-line="${k}" d="${d}"/><path class="thin" d="${d}"/>`;
  let s = "";
  // the lines first (the air: accent, its density by the flow), then the boxes over them
  s += ln("M44 668H82", "in") + ln("M130 668H152V642H178M152 668V694H178", "in");
  s += ln("M236 642H262V694H236M262 668H282", "out") + ln("M344 668H360", "suct");
  s += ln("M312 618V654", "bleed") + ln("M384 682V714", "exh");
  s += head(178, 642, 1, 0) + head(178, 694, 1, 0) + head(282, 668, 1, 0) + head(360, 668, 1, 0) + head(312, 654, 0, 1) + head(384, 714, 0, 1) + head(82, 668, 1, 0);
  s += box(82, 654, 130, 682, "FILTER 9") + box(178, 630, 236, 654, "AI 13") + box(178, 682, 236, 706, "HI 18") + box(282, 654, 344, 682, "REG 6") + box(360, 654, 408, 682, "PUMP 1");
  // the gauge reads the suction across the instruments
  s += `<path class="hid" d="M199 610H152V642M215 610H262V642"/><circle class="paper" cx="207" cy="610" r="8"/><circle class="vis" cx="207" cy="610" r="8"/>` + t(207, 612.7, "11");
  s += t(195, 601, "SUCTION GAUGE", { anchor: "end" });
  // the turn coordinator: on the 14 V bus, no air
  s += `<path class="vis" d="M120 750H178"/>` + box(178, 738, 236, 762, "TC 23") + t(116, 752.7, "14 V BUS", { anchor: "end" }) + t(244, 752.7, "ELECTRIC: NO AIR", { anchor: "start" });
  s += t(63, 660, "CABIN") + t(312, 610, "OUTSIDE AIR") + t(384, 726, "OVERBOARD");
  s += t(106, 696, "", { id: "sch-in" }) + t(384, 648, "", { id: "sch-pump" }) + t(313, 696, "", { id: "sch-bleed" }) + t(220, 601, "", { id: "sch-s", anchor: "start" });
  return (
    `<g data-role="chart" id="sch">${s}</g>` +
    K.viewLabel(222, 790, "DIAGRAM 3 · THE AIR'S PATH", "SCHEMATIC · ACCENT: THE AIR, BY ITS FLOW")
  );
}

// ---------------------------------------------------------------- DETAIL K: the inclinometer, 2:1
const VK = V.K;
const TUBE = { R: M.TUBE_R, ri: 3.7, ro: 4.5, a: 19, ball: 3.2 };
const arcTube = (r, a0, a1) => K.arc(0, M.TUBE_R, r, 270 + a0, 270 + a1, 40);
function tube(Vw, { fluid = true, id = "" } = {}) {
  const { R, ri, ro, a } = TUBE;
  const wall = (r0, r1) => [...arcTube(r1, -a, a), ...arcTube(r0, a, -a)];
  let s = K.cut(Vw, wall(R + ri, R + ro), { mat: "solid" }) + K.cut(Vw, wall(R - ro, R - ri), { mat: "solid" });
  // the end plugs
  for (const sg of [-1, 1]) {
    const e = (r, aa) => [Math.sin(aa * rad) * r, M.TUBE_R - Math.cos(aa * rad) * r];
    s += K.cut(Vw, [e(R - ri, sg * (a - 2)), e(R + ri, sg * (a - 2)), e(R + ri, sg * a), e(R - ri, sg * a)], { mat: "rubber", angle: 45 });
  }
  const inner = [...arcTube(R + ri, -a + 2, a - 2), ...arcTube(R - ri, a - 2, -a + 2)];
  return (fluid ? `<g data-role="fluid"><path${id ? ` id="${id}"` : ""} class="tint oil" d="${K.d(Vw, inner)}"/></g>` : "") + s;
}
export const ballAt = (b) => [Math.sin(b * rad) * M.TUBE_R, M.TUBE_R - Math.cos(b * rad) * M.TUBE_R];
const ballSvg = (Vw) => K.body(Vw, K.circle(0, 0, TUBE.ball, 32));
const detailK =
  `<g data-geom="K" clip-path="url(#clip-K)"><rect class="paper" x="${KD.x}" y="${KD.y}" width="${KD.w}" height="${KD.h}"/>` +
  P.part(28, tube(VK, { id: "k-oil" }) + `<g id="k-ball">${ballSvg(VK)}</g>` + K.line(VK, [[-TUBE.ball - 0.4, -1], [-TUBE.ball - 0.4, 2 * TUBE.ri + 1]], "vis") + K.line(VK, [[TUBE.ball + 0.4, -1], [TUBE.ball + 0.4, 2 * TUBE.ri + 1]], "vis")) +
  `<g data-role="label" id="k-arrows"></g>` +
  `</g><rect class="thin" x="${KD.x}" y="${KD.y}" width="${KD.w}" height="${KD.h}" rx="10"/>` +
  K.balloon(VK, [14.6, M.TUBE_R - Math.cos(Math.asin(14.6 / (M.TUBE_R + 4.1))) * (M.TUBE_R + 4.1)], [452, 500], 28, { target: 28 }) +
  K.viewLabel(KD.x + KD.w / 2, KD.y + KD.h + 14, "DETAIL K", "BALL · ARROWS g, TURN, SUM · 2:1");

// ---------------------------------------------------------------- VIEW E: the panel, as the pilot sees it, 1:2
const eng = (x, y, s, { cls = "t t-sm", anchor = "middle", rot = 0 } = {}) => `<text class="${cls}" x="${K.r2(x)}" y="${K.r2(y)}" text-anchor="${anchor}"${rot ? ` transform="rotate(${K.r2(rot)} ${K.r2(x)} ${K.r2(y)})"` : ""}>${s}</text>`;
const pol = (Vw, r, a) => Vw.p([r * Math.cos(a * rad), r * Math.sin(a * rad)]);
const tick = (Vw, r0, r1, a, cls = "thin") => K.line(Vw, [[r0 * Math.cos(a * rad), r0 * Math.sin(a * rad)], [r1 * Math.cos(a * rad), r1 * Math.sin(a * rad)]], cls);
const bezel = (Vw, half = P.CASE.bezel) => {
  let s = K.body(Vw, K.rrect(-half, -half, half, half, 5)) + K.line(Vw, K.circle(0, 0, 37, 72), "vis", true);
  for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) s += K.line(Vw, K.circle(x * (half - 4.5), y * (half - 4.5), 1.7, 12), "thin", true);
  return s;
};
function faceAI(c) {
  const Vw = VE(c);
  const [cx, cy] = c;
  let card = `<rect class="paper" x="${cx - 70}" y="${cy - 70}" width="140" height="140"/><rect class="gnd" x="${cx - 70}" y="${cy}" width="140" height="70"/>`;
  card += `<path class="vis" d="M${cx - 70} ${cy}H${cx + 70}"/>`;
  for (const p of [-20, -15, -10, -5, 5, 10, 15, 20]) {
    const w = p % 10 === 0 ? 9 : 5;
    const y = Vw.p([0, -p * 1.1])[1];
    card += `<path class="thin" d="M${Vw.p([-w, 0])[0]} ${y}H${Vw.p([w, 0])[0]}"/>`;
  }
  // the bank pointer, on the card under the fixed scale
  card += `<path class="solid" d="M${cx} ${K.r2(Vw.p([0, 29.6])[1])}l-2.6 5h5.2Z"/>`;
  let fixed = K.cut(Vw, P.annulus(30.2, 37, 0, 359.99, 72), { mat: "solid" }).replace('class="solid"', 'class="paper"') + K.line(Vw, K.circle(0, 0, 30.2, 72), "thin", true);
  for (const b of [0, 10, 20, 30, 45, 60, 90]) for (const sg of b ? [-1, 1] : [1]) fixed += tick(Vw, 30.2, b % 30 === 0 ? 35.4 : 33.4, 90 + sg * b, b % 30 === 0 ? "vis" : "thin");
  // the miniature aircraft, fixed to the case
  const plane = `<path class="vis wing" d="M${Vw.p([-17, 0])[0]} ${cy}H${Vw.p([-5, 0])[0]}l1.6 2.4M${Vw.p([17, 0])[0]} ${cy}H${Vw.p([5, 0])[0]}l-1.6 2.4"/>` + `<circle class="dot" cx="${cx}" cy="${cy}" r="1.1"/>`;
  return (
    P.part(12, bezel(Vw)) +
    `<g clip-path="url(#clip-ai)">` + P.part(17, `<g id="ai-card">${card}</g>`) + `</g>` +
    P.part(12, fixed + plane)
  );
}
function faceHI(c) {
  const Vw = VE(c);
  const [cx, cy] = c;
  let card = K.body(Vw, K.circle(0, 0, 33, 96));
  let nums = "";
  for (let h = 0; h < 360; h += 5) {
    const a = 90 - h;
    card += tick(Vw, h % 10 === 0 ? 27.6 : 29.6, 32.6, a, h % 30 === 0 ? "vis" : "thin");
    if (h % 30 === 0) {
      const lab = { 0: "N", 90: "E", 180: "S", 270: "W" }[h] ?? String(h / 10);
      const [x, y] = pol(Vw, 24, a);
      nums += eng(x, y + 2, lab, { rot: h, cls: "t t-xs" });
    }
  }
  const fixed = K.line(Vw, [[0, 33.2], [0, 36.6]], "vis") + [45, 135, 225, 315].map((a) => tick(Vw, 33.4, 36.2, a, "thin")).join("") +
    `<path class="vis wing" d="M${Vw.p([-9, 0])[0]} ${cy}H${Vw.p([9, 0])[0]}M${cx} ${Vw.p([0, 8])[1]}V${Vw.p([0, -7])[1]}M${Vw.p([-3.5, -6])[0]} ${Vw.p([0, -6])[1]}H${Vw.p([3.5, -6])[0]}"/>`;
  const knob = K.body(Vw, K.circle(-35.2, -35.2, 5.8, 32)) + K.line(Vw, K.circle(-35.2, -35.2, 3.6, 24), "thin", true);
  return (
    P.part(12, bezel(Vw)) +
    P.part(21, `<g id="hi-card">${card}<g data-role="engraved">${nums}</g></g>`) +
    P.part(12, fixed) +
    `<g id="hi-knob-face">${P.part(22, knob)}</g>`
  );
}
function faceTC(c) {
  const Vw = VE(c);
  const [cx, cy] = c;
  let fixed = K.line(Vw, K.circle(0, 0, 30.6, 72), "thin", true);
  for (const a of [0, 180, -M.TC_MARK, 180 + M.TC_MARK]) fixed += tick(Vw, 30.6, 35.6, a, "vis");
  const txt = `<g data-role="engraved">` + eng(...pol(Vw, 26, 180 + M.TC_MARK + 13).map((v, i) => v + (i ? 2.6 : 0)), "L") + eng(...pol(Vw, 26, -M.TC_MARK - 13).map((v, i) => v + (i ? 2.6 : 0)), "R") + eng(cx, Vw.p([0, 23])[1], "2 MIN") + `</g>`;
  // the miniature aircraft (27), banked by the gimbal through its linkage
  const plane = `<path class="vis wing" d="M${Vw.p([-24, 0])[0]} ${cy}H${Vw.p([24, 0])[0]}M${cx} ${Vw.p([0, 7])[1]}V${cy}"/><circle class="solid" cx="${cx}" cy="${cy}" r="2.6"/>`;
  // the inclinometer (28) across the dial's lower half
  const tubeC = [0, -27];
  const Vt = K.view({ x: cx, y: Vw.p(tubeC)[1], scale: 0.5 });
  return (
    P.part(12, bezel(Vw) + fixed) +
    txt +
    P.part(28, tube(Vt, { fluid: true, id: "tc-oil" }) + `<g id="tc-ball">${ballSvg(Vt)}</g>` + K.line(Vt, [[-TUBE.ball - 0.4, -0.6], [-TUBE.ball - 0.4, 2 * TUBE.ri + 0.6]], "thin") + K.line(Vt, [[TUBE.ball + 0.4, -0.6], [TUBE.ball + 0.4, 2 * TUBE.ri + 0.6]], "thin")) +
    P.part(27, `<g id="tc-plane">${plane}</g>`)
  );
}
const SUC = { r: 29, a0: 225, span: 270 / 10 }; // 0–10 inHg over 270°
export const sucAngle = (inHg) => SUC.a0 - Math.max(0, Math.min(10.5, inHg)) * SUC.span;
function faceSuc(c) {
  const Vw = VE(c);
  const [cx, cy] = c;
  let s = K.body(Vw, K.circle(0, 0, SUC.r, 72)) + K.line(Vw, K.circle(0, 0, SUC.r - 3, 72), "thin", true);
  for (let x = 0; x <= 10; x++) s += tick(Vw, 20.5, x % 2 ? 22.5 : 24, sucAngle(x), "thin");
  const green = K.arc(0, 0, 23.2, sucAngle(M.GREEN[1]), sucAngle(M.GREEN[0]), 10);
  s += `<path class="vis band" d="${K.d(Vw, green, false)}"/>`;
  let nums = "";
  for (const x of [0, 2, 4, 6, 8, 10]) {
    const [px, py] = pol(Vw, 15.4, sucAngle(x));
    nums += eng(px, py + 2.6, String(x));
  }
  nums += eng(cx, Vw.p([0, -23])[1], "INHG", { cls: "t t-xs" });
  const needle = `<g id="suc-needle"><path class="solid" d="M${cx - 0.9} ${cy}L${cx} ${K.r2(cy - 22)}L${cx + 0.9} ${cy}Z"/><circle class="solid" cx="${cx}" cy="${cy}" r="2"/></g>`;
  return P.part(11, s + `<g data-role="engraved">${nums}</g>` + needle);
}
const viewE =
  `<g data-geom="E">` + faceSuc(FACES.suc) + faceAI(FACES.ai) + faceTC(FACES.tc) + faceHI(FACES.hi) + `</g>` +
  K.balloon(VE(FACES.suc), [-SUC.r + 1.4, 0], [452, 398], 11, { target: 11 }) +
  K.balloon(VE(FACES.ai), [20, -12], [648, 326], 17, { target: 17 }) +
  K.balloon(VE(FACES.hi), [26, 12], [648, 430], 21, { target: 21 }) +
  K.balloon(VE(FACES.hi), [-35.2, -35.2], [540, 514], 22, { target: 22 }) +
  K.balloon(VE(FACES.tc), [0, 0], [452, 452], 27, { target: 27 }) +
  K.viewLabel(548, 540, "VIEW E · THE PANEL", "AS THE PILOT SEES IT · 1:2");

// ---------------------------------------------------------------- DIAGRAM 1: the rotors over the tour
const TRACE = M.tourTrace(1 / 120, 6);
const CT = { x0: 892, x1: 1146, y0: 44, y1: 142, tMax: M.TOUR, rMax: 25000 };
const tx = (t) => K.r2(CT.x0 + (Math.min(CT.tMax, Math.max(0, t)) / CT.tMax) * (CT.x1 - CT.x0));
const ry = (r) => K.r2(CT.y1 - (Math.min(CT.rMax, Math.max(0, r)) / CT.rMax) * (CT.y1 - CT.y0));
function chartRotors() {
  let grid = "";
  let labels = "";
  for (let r = 0; r <= CT.rMax; r += 5000) {
    grid += `M${CT.x0} ${ry(r)}H${CT.x1}`;
    if (r % 10000 === 0) labels += `<text class="t t-sm" x="${CT.x0 - 4}" y="${K.r2(ry(r) + 2.7)}" text-anchor="end">${r / 1000}</text>`;
  }
  for (const s of [0, 5]) labels += `<text class="t t-sm" x="${CT.x1 + 4}" y="${K.r2(ry(s * 2500) + 2.7)}" text-anchor="start">${s}</text>`;
  for (let t = 0; t <= CT.tMax; t += 8) grid += `M${tx(t)} ${CT.y0}V${CT.y1}`;
  for (const t of [0, 16, 32, 48]) labels += `<text class="t t-sm" x="${tx(t)}" y="${CT.y1 + 10}" text-anchor="middle">${t}</text>`;
  const curve = (i, k = 1) => TRACE.map((r) => `${tx(r[0])},${ry(r[i] * k)}`).join(" ");
  const tag = (t, s) => `<text class="t t-sm" x="${tx(t)}" y="${CT.y0 - 3}" text-anchor="middle">${s}</text>`;
  labels += tag(4.8, "START ×30") + tag(16, "TURN") + tag(27, "SKID SLIP") + tag(40.5, "FAILS ×60") + tag(51.5, "TC");
  labels += `<text class="t t-sm t-mute" x="${(CT.x0 + CT.x1) / 2}" y="${CT.y1 + 21}" text-anchor="middle">TOUR TIME t, s</text>`;
  labels += `<text class="t t-sm t-mute" x="${CT.x0 - 18}" y="${(CT.y0 + CT.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CT.x0 - 18} ${(CT.y0 + CT.y1) / 2})">1000 rpm</text>`;
  labels += `<text class="t t-sm t-mute" x="${CT.x1 + 20}" y="${(CT.y0 + CT.y1) / 2}" text-anchor="middle" transform="rotate(90 ${CT.x1 + 20} ${(CT.y0 + CT.y1) / 2})">SUCTION inHg</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CT.x0}" y="${CT.y0}" width="${CT.x1 - CT.x0}" height="${CT.y1 - CT.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline class="thin" points="${curve(3)}"/>` +
    `<polyline class="phan" points="${curve(4, 2500)}"/>` +
    `<polyline class="hid" points="${curve(2)}"/>` +
    `<polyline class="vis" points="${curve(1)}"/>` +
    `<path id="ct-cursor" class="thin" d="M${CT.x0} ${CT.y0}V${CT.y1}"/>` +
    `<circle id="ct-ai" class="accent-fill" cx="${CT.x0}" cy="${ry(0)}" r="2.8"/>` +
    `<circle id="ct-hi" class="dot" cx="${CT.x0}" cy="${ry(0)}" r="2.2"/>` +
    `<rect class="vis" x="${CT.x0}" y="${CT.y0}" width="${CT.x1 - CT.x0}" height="${CT.y1 - CT.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CT.x0 + CT.x1) / 2, 180, "DIAGRAM 1 · THE ROTORS OVER THE TOUR", "THICK AI · DASHED HI · THIN TC · PHANTOM SUCTION")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: suction against engine speed
const CS = { x0: 576, x1: 820, y0: 604, y1: 716, nMax: 2800, sMax: 12 };
const nx = (n) => K.r2(CS.x0 + (Math.min(CS.nMax, Math.max(0, n)) / CS.nMax) * (CS.x1 - CS.x0));
const sy = (s) => K.r2(CS.y1 - (Math.min(CS.sMax, Math.max(0, s)) / CS.sMax) * (CS.y1 - CS.y0));
function chartSuction() {
  let grid = "";
  let labels = "";
  for (let s = 0; s <= CS.sMax; s += 2) {
    grid += `M${CS.x0} ${sy(s)}H${CS.x1}`;
    labels += `<text class="t t-sm" x="${CS.x0 - 4}" y="${K.r2(sy(s) + 2.7)}" text-anchor="end">${s}</text>`;
  }
  for (let n = 0; n <= CS.nMax; n += 400) {
    grid += `M${nx(n)} ${CS.y0}V${CS.y1}`;
    if (n % 800 === 0) labels += `<text class="t t-sm" x="${nx(n)}" y="${CS.y1 + 10}" text-anchor="middle">${n}</text>`;
  }
  let reg = "";
  let free = "";
  for (let n = 0; n <= CS.nMax; n += 40) {
    reg += `${reg ? "L" : "M"}${nx(n)} ${sy(M.suctionFor(n) / M.INHG)}`;
    free += `${free ? "L" : "M"}${nx(n)} ${sy(M.suctionFor(n, { regulated: false }) / M.INHG)}`;
  }
  const band = `M${CS.x0} ${sy(M.GREEN[0])}H${CS.x1}M${CS.x0} ${sy(M.GREEN[1])}H${CS.x1}`;
  const tagN = (n, s) => `<text class="t t-sm" x="${nx(n)}" y="${CS.y0 - 3}" text-anchor="middle">${s}</text>`;
  labels += tagN(M.RPM_IDLE, "IDLE") + tagN(M.RPM_CRUISE, "CRUISE");
  labels += `<text class="t t-sm" x="${nx(150)}" y="${K.r2(sy(M.GREEN[1]) - 3)}">GREEN ARC</text>`;
  labels += `<text class="t t-sm" x="${nx(1500)}" y="${K.r2(sy(10.2))}" text-anchor="end">NO REGULATOR</text>`;
  labels += `<text class="t t-sm t-mute" x="${(CS.x0 + CS.x1) / 2}" y="${CS.y1 + 21}" text-anchor="middle">ENGINE SPEED, rpm</text>`;
  labels += `<text class="t t-sm t-mute" x="${CS.x0 - 18}" y="${(CS.y0 + CS.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CS.x0 - 18} ${(CS.y0 + CS.y1) / 2})">SUCTION, inHg</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CS.x0}" y="${CS.y0}" width="${CS.x1 - CS.x0}" height="${CS.y1 - CS.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/><path class="thin" d="${band}"/>` +
    `<path class="hid" d="${free}"/><path class="vis" d="${reg}"/>` +
    `<path id="cs-cursor" class="thin" d="M${CS.x0} ${CS.y0}V${CS.y1}"/>` +
    `<circle id="cs-dot" class="accent-fill" cx="${CS.x0}" cy="${sy(0)}" r="2.8"/>` +
    `<rect class="vis" x="${CS.x0}" y="${CS.y0}" width="${CS.x1 - CS.x0}" height="${CS.y1 - CS.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CS.x0 + CS.x1) / 2, 758, "DIAGRAM 2 · PUMP AND REGULATOR", "THICK: REGULATED · DASHED: PUMP ALONE · ACCENT: NOW")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "PUMP HOUSING, 2 PORTS, 4 BOLTS", "A356-T6 CASTING", "1"],
  ["2", "LINER Ø54 BORE", "52100 STEEL, HARDENED", "1"],
  ["3", "ROTOR Ø44.9, 6 SLOTS", "CARBON GRAPHITE", "1"],
  ["4", "VANE 14×4×40", "CARBON GRAPHITE", "6"],
  ["5", "DRIVE SHAFT + SHEAR COUPLING", "4140 STEEL / NYLON", "1"],
  ["6", "REGULATOR BODY, CAP, SCREEN", "6061-T6 / PU FOAM", "1"],
  ["7", "REGULATOR POPPET Ø12", "C36000 BRASS", "1"],
  ["8", "REGULATOR SPRING 0.15 N/mm", "302 STAINLESS", "1"],
  ["9", "CENTRAL AIR FILTER Ø76", "PA66 / RESIN PAPER", "1"],
  ["10", "LINES, HOSE ID 9.5, FITTINGS", "NBR HOSE / BRASS", "1 SET"],
  ["11", "SUCTION GAUGE 0–10 inHg Ø57", "BOUGHT OUT", "1"],
  ["12", "INSTRUMENT CASE Ø80, BEZEL 82.5", "A380 / PMMA", "3"],
  ["13", "AI ROTOR Ø44 21 000 rpm", "C36000 BRASS", "1"],
  ["14", "AI HOUSING (INNER GIMBAL)", "6061-T6", "1"],
  ["15", "AI OUTER GIMBAL (ROLL)", "6061-T6", "1"],
  ["16", "PENDULOUS VANE", "1100-H14, 0.5", "4"],
  ["17", "HORIZON CARD AND BANK POINTER", "ABS, PAINTED", "1"],
  ["18", "HI ROTOR Ø42 18 000 rpm", "C36000 BRASS", "1"],
  ["19", "HI HOUSING (INNER GIMBAL)", "6061-T6", "1"],
  ["20", "HI VERTICAL GIMBAL, CROWN GEAR", "6061-T6 / BRASS", "1"],
  ["21", "COMPASS CARD, SHAFT, PINION", "ALU / BRASS", "1"],
  ["22", "HEADING SET KNOB, SHAFT, GEAR", "PA6 / BRASS", "1"],
  ["23", "TC GYRO MOTOR Ø34 9 000 rpm 14 V", "STEEL / Cu / Si-Fe", "1"],
  ["24", "TC GIMBAL AND SPINDLE", "6061-T6 / 303", "1"],
  ["25", "CENTRING SPRING", "Be-Cu", "2"],
  ["26", "AIR DASHPOT DAMPER", "C36000 / 303", "1"],
  ["27", "MINIATURE AIRCRAFT (TC)", "ALU, PAINTED", "1"],
  ["28", "INCLINOMETER: TUBE, BALL, FLUID", "GLASS / AGATE", "1"],
];
const TB = { x: 850, w: 326, h: 140 };
TB.y = 824 - TB.h;
const rowH = 12.5;
const bomTop = TB.y - (18 + BOM.length * rowH);
const bom = K.table(TB.x, bomTop, [
  { w: 26, align: "center", title: "ITEM" },
  { w: 168, title: "DESCRIPTION" },
  { w: 104, title: "MATERIAL" },
  { w: 28, align: "center", title: "QTY" },
], BOM, { rowH });

const f1 = (x) => x.toFixed(1);
const H3 = (x) => x.toPrecision(2);
const steepRate = M.turnRate(M.STEEP[3], M.STEEP[1]);
const notes = K.notes(860, 206, "NOTES", [
  `SUCTION SET ${f1(M.S_SET / M.INHG)} inHg, GREEN ${M.GREEN[0]}–${M.GREEN[1]}. AI + HI DRAW ${Math.round(M.instrFlow(M.S_SET))} L/min.`,
  `PUMP ${f1(M.PUMP_VD)} cm³/rev AT ${M.PUMP.drive}× ENGINE. ROTOR SHOWN AT 1/150.`,
  `H = Iω: AI ${H3(M.AI.H0)}, HI ${H3(M.HI.H0)}, TC ${H3(M.TC.H0)} N·m·s. Ω = τ/H.`,
  `HI DRIFT ${f1(M.EARTH)}°/h EARTH (15.04·sin ${M.LATITUDE}°) + 10°/h PIVOTS.`,
  `AI ERECTS ${f1(M.ERECT_RATE)}°/min TO THE APPARENT VERTICAL.`,
  `STANDARD RATE ${M.STD_RATE}°/s = ${f1(M.BANK_STD)}° BANK AT ${M.V_CRUISE} kt.`,
  `BP-022: ${M.STEEP[3]}° AT ${M.STEEP[1]} kt = ${f1(steepRate)}°/s, TC ON ITS STOP.`,
  `TOUR TIME WARPED: START-UP ×30, PUMP FAILURE ×60.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 236, h: 32, label: "TITLE", value: "GYRO INSTRUMENTS, VACUUM", size: "lg" },
  { x: 236, y: 0, w: 90, h: 32, label: "DWG NO", value: "BP-109", size: "lg" },
  { x: 0, y: 32, w: 50, h: 25, label: "SCALE", value: "1:1" },
  { x: 50, y: 32, w: 40, h: 25, label: "SIZE", value: "A2" },
  { x: 90, y: 32, w: 50, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 140, y: 32, w: 86, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 226, y: 32, w: 100, h: 25, label: "DATE", value: "2026-10-18" },
  { x: 0, y: 57, w: 110, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 110, y: 57, w: 96, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 206, y: 57, w: 120, h: 25, label: "UNITS", value: "mm · inHg · rpm" },
  { x: 0, y: 82, w: 326, h: 29, label: "LIVE · VACUUM · ROTORS AI HI TC rpm · ↑ ↓ RPM · V PUMP · W WARP", value: "", id: "readout", size: "sm" },
  { x: 0, y: 111, w: 326, h: 29, label: "LIVE · FLIGHT · ← → BANK · HOLD A D RUDDER · H OR KNOB: SET HI", value: "", id: "readout2", size: "sm" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="air" patternUnits="userSpaceOnUse" width="3.2" height="3.2"><circle class="air-dot" cx="0.8" cy="0.8" r="0.6"/><circle class="air-dot" cx="2.4" cy="2.4" r="0.6"/></pattern>` +
  `<pattern id="oildots" patternUnits="userSpaceOnUse" width="4" height="4"><circle class="oil-dot" cx="1" cy="1" r="0.45"/><circle class="oil-dot" cx="3" cy="3" r="0.45"/></pattern>` +
  `<pattern id="gndp" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)"><path class="hl" d="M0 -1V4"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-L"><rect x="${L.x}" y="${L.y}" width="${L.w}" height="${L.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-K"><rect x="${KD.x}" y="${KD.y}" width="${KD.w}" height="${KD.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-ai"><circle cx="${FACES.ai[0]}" cy="${FACES.ai[1]}" r="${K.r2(30.2 * 0.5 * k1)}"/></clipPath>` +
  `</defs>`;

const knobBox = (c, r) => `<rect class="hit" data-drag="knob" x="${K.r2(c[0] - r)}" y="${K.r2(c[1] - r)}" width="${2 * r}" height="${2 * r}"/>`;
const hits =
  knobBox(VE(FACES.hi).p([-35.2, -35.2]), 9) +
  knobBox(VC.p([P.HIC.knobU, P.HIC.knobV0 + 5]), 12) +
  `<rect class="hit" data-drag="bank" x="${FACES.ai[0] - 30}" y="${FACES.ai[1] - 30}" width="60" height="60"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of the gyroscopic flight instruments of a four-seat light aircraft and their vacuum system: an engine-driven dry pump with carbon vanes cut across its rotor, the regulator, the central air filter, the attitude indicator cut across its air-driven gyro with the pendulous erection vanes, the heading indicator in plan on its spin axis with the card and the setting knob, the electric turn coordinator cut square to its canted gimbal, and the ball. The tour starts the engine and the rotors spin up and the horizon erects, flies a standard-rate turn, a skid and a slip, then the pump fails: the attitude indicator topples and the heading drifts while the turn coordinator keeps working. Left and right arrows bank, A and D hold rudder, V fails the pump, H sets the heading indicator, W warps time." ` +
  `data-views='${JSON.stringify(VIEWS)}' data-faces='${JSON.stringify(FACES)}' data-live='${JSON.stringify({ A: LIVE_A, C: LIVE_C, D: LIVE_D, B: LIVE_B })}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  sectionA +
  detailL +
  sectionB +
  sectionD +
  sectionC +
  detailK +
  viewE +
  sectionF +
  sectionH +
  schematic() +
  chartRotors() +
  chartSuction() +
  notes +
  bom +
  title +
  hits +
  `</svg>`;

const bar =
  `<span><kbd>←</kbd> <kbd>→</kbd> bank · hold <kbd>A</kbd> <kbd>D</kbd> rudder · <kbd>↑</kbd> <kbd>↓</kbd> rpm · <kbd>V</kbd> pump · <kbd>H</kbd> set HI · <kbd>W</kbd> warp · drag the knob · <kbd>Space</kbd> tour · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "gyro-instruments.html"), {
  title: "Gyro Instruments",
  description: "A live engineering drawing of a light aircraft's gyroscopic instruments and vacuum system: a carbon-vane dry pump and regulator spin the attitude and heading gyros on jets of cabin air, the electric turn coordinator precesses against its spring in a turn, and when the pump fails the horizon topples and the heading drifts, all from one model.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#air)}.bp-sheet .tint.oil{fill:url(#oildots)}.bp-sheet .air-dot{fill:var(--bp-accent)}.bp-sheet .oil-dot{fill:var(--bp-muted)}` +
    `.bp-sheet .gnd{fill:url(#gndp)}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet [data-drag]{cursor:grab}` +
    `.bp-sheet .tint.line{fill:none;stroke:var(--bp-accent);stroke-width:2.6px;stroke-linejoin:round}.bp-sheet .hosew{fill:none;stroke:transparent;stroke-width:4px}` +
    `.bp-sheet .vis.band{stroke-width:2.6px}.bp-sheet .t-xs{font-size:5.6px}.bp-sheet .vis.wing{stroke-width:1.8px}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "../light-aircraft/model.mjs"), "A"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHARTS__", JSON.stringify({ CT, CS, SUC, TUBE, L, KD })),
});
console.log(`gyro-instruments.html  ${(size / 1024).toFixed(0)} KB  H AI ${M.AI.H0.toFixed(3)} HI ${M.HI.H0.toFixed(3)} TC ${M.TC.H0.toFixed(4)} N·m·s  erect ${M.ERECT_RATE.toFixed(1)}°/min  std bank ${M.BANK_STD.toFixed(1)}°  suction@cruise ${(M.suctionFor(M.RPM_CRUISE) / M.INHG).toFixed(2)} inHg`);
