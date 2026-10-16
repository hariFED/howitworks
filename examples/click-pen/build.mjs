// Builds click-pen.html: a live A2 drawing of a retractable ballpoint pen, cut along its axis.
//   node examples/click-pen/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const k5 = 5 * K.PX_PER_MM;
const k10 = 10 * K.PX_PER_MM;
const k20 = 20 * K.PX_PER_MM;

// ---------------------------------------------------------------- views
const D = { x: 40, y: 276, w: 318, h: 186 };
const E = { x: 440, y: 282, w: 216, h: 222, th0: -25, th1: 155, uTop: 107 };
const F = { cx: 150, cy: 664, r: 96 };
const BB = { cx: 662, cy: 664 };
const VIEWS = {
  main: { x: 92, y: 150, scale: 2 },
  D: { x: D.x - 88.4 * k5, y: D.y + D.h / 2, scale: 5 },
  E: { x: E.x - E.th0 * M.MMD * k10, y: E.y + E.uTop * k10, scale: 10 },
  F: { x: F.cx - (P.S0 + 1.4) * k20, y: F.cy, scale: 20 },
  BB: { x: BB.cx, y: BB.cy, scale: 10 },
};
const VM = K.view(VIEWS.main);
const VD = K.view(VIEWS.D);
const VE = K.view(VIEWS.E);
const VF = K.view(VIEWS.F);
const VB = K.view(VIEWS.BB);

// ---------------------------------------------------------------- the pen, in any axial view
const X0 = 0;
const Y0 = M.Y_RET; // the tour starts RETRACTED

function axial(V, id) {
  const pl = P.plunger(V);
  const rot = P.rotator(V, X0, Y0);
  const du = (M.refillEnd(Y0) - M.U_R_EXT) * V.k;
  return (
    `<g id="rotfar-${id}">${rot.far}</g>` +
    `<g id="plfar-${id}">${pl.far}</g>` +
    P.barrel(V) + P.bush(V) + P.nose(V) + P.guide(V) + P.topCap(V) + P.clip(V) +
    `<g id="spring-${id}">${P.spring(V, Y0)}</g>` +
    `<g id="refill-${id}" transform="translate(${K.r2(du)} 0)">${P.refill(V)}</g>` +
    `<g id="rotnear-${id}">${rot.near}</g>` +
    `<g id="pl-${id}">${pl.near}${P.button(V)}</g>`
  );
}

const centre = (V, u0, u1) => K.centerline(V, [u0, 0], [u1, 0], 0);

// ---------------------------------------------------------------- main view: LONGITUDINAL SECTION 2:1
const mainView =
  `<g data-geom="main">` +
  axial(VM, "main") +
  `<g data-role="phantom">${P.phantoms(VM)}</g>` +
  centre(VM, -8, 139) +
  `</g>`;

const tipDim = (Y) => {
  const t = M.tipU(Y);
  const txt = `${t <= 0 ? "+" : "−"}${Math.abs(t).toFixed(1)}`;
  return K.dim(VM, [0, -1.3], [t, -0.5], { dir: "h", off: 26, text: txt, id: "dim-tip" });
};
const btnTop = (yPt) => yPt + P.PL.button + P.PL.buttonH;
const btnDim = (yPt) => {
  const b = M.YPT_TOP - yPt;
  return K.dim(VM, [btnTop(M.YPT_TOP), 0.8], [btnTop(yPt), 0.4], { dir: "h", off: -48, text: `b=${b.toFixed(1)}`, id: "dim-btn" });
};
const mainDims =
  K.dim(VM, [0, -2.0], [P.CAP.top, -4.85], { dir: "h", off: 92 }) +
  K.dim(VM, [P.CAP.top - 0.3, 4.85], [P.CAP.top - 0.3, -4.85], { dir: "v", off: VM.p([141, 0])[0] - VM.p([P.CAP.top - 0.3, 0])[0], prefix: "Ø", text: "Ø9.7" }) +
  `<g id="dim-tip-wrap">${tipDim(Y0)}</g>` +
  `<g id="dim-btn-wrap">${btnDim(M.YPT_TOP)}</g>`;

// Balloons: static ones in rows above and below; those on the refill and plunger ride with them.
const yUp = 86;
const yDn = 214;
const mainBalloons =
  K.balloon(VM, [6.2, M.SPRING.D / 2], [112, yUp], 4, { target: 4 }) +
  K.balloon(VM, [23.2, 4.25], [176, yUp], 2, { target: 2 }) +
  K.balloon(VM, [48, 4.68], [236, yUp], 1, { target: 1 }) +
  K.balloon(VM, [100, 6.05], [470, yUp], 16, { target: 16 }) +
  K.balloon(VM, [123.6, 3.6], [606, yUp], 15, { target: 15 }) +
  K.balloon(VM, [13, -4.15], [150, yDn], 3, { target: 3 }) +
  `<g id="mvb-refill" transform="translate(${K.r2((M.refillEnd(Y0) - M.U_R_EXT) * VM.k)} 0)">` +
  K.balloon(VM, [P.S0 + 21.5, -2.4], [198, yDn], 7, { target: 7 }) +
  K.balloon(VM, [P.S0 + 45, 1.0], [300, yUp], 17, { target: 17 }) +
  K.balloon(VM, [P.S0 + 52, -2.85], [292, yDn], 8, { target: 8 }) +
  K.balloon(VM, [P.S0 + 72, -1.6], [372, yDn], 9, { target: 9 }) +
  K.balloon(VM, [P.S0 + 97, -2.0], [424, yDn], 10, { target: 10 }) +
  `</g>` +
  `<g id="mvb-pl">` +
  K.balloon(VM, [M.YPT_TOP + P.PL.button + 1.5, -3.2], [634, yDn], 14, { target: 14 }) +
  `</g>`;

const mainMarks =
  `<g data-role="label">` +
  `<rect class="thin mark" x="${VM.p([88.6, 0])[0]}" y="${VM.p([0, 7.6])[1]}" width="${K.r2(31 * VM.k)}" height="${K.r2(15.2 * VM.k)}" rx="6"/>` +
  `<text class="t t-lg" x="${VM.p([88.6, 0])[0] - 9}" y="${VM.p([0, 7.6])[1] + 4}" text-anchor="middle">D</text>` +
  `</g>` +
  K.detailMark(VM, [-1.6, 0], 4.6, "F", 135) +
  K.viewLabel(365, 46, "LONGITUDINAL SECTION", "THROUGH A LONG SLOT (TOP) AND A SHORT SLOT (BOTTOM) · SCALE 2:1");

// ---------------------------------------------------------------- DETAIL D: the mechanism, 5:1
const bbMark = (Y) => {
  const u = Y - 0.5;
  const [x] = VD.p([u, 0]);
  const yT = VD.p([0, 8.7])[1];
  const yB = VD.p([0, -8.7])[1];
  const aT = VD.p([0, 7.0])[1];
  const aB = VD.p([0, -7.0])[1];
  const head = (y, dir) => `M${K.r2(x - 9)} ${y}L${K.r2(x - 9 + 6)} ${K.r2(y - 1.8 * dir)}L${K.r2(x - 9 + 6)} ${K.r2(y + 1.8 * dir)}Z`;
  return (
    `<path class="vis" d="M${x} ${yT}V${aT}M${x} ${yB}V${aB}M${x} ${yT}H${K.r2(x - 9)}M${x} ${yB}H${K.r2(x - 9)}"/>` +
    `<path class="head" d="${head(yT, 1)}${head(yB, 1)}"/>` +
    `<text class="t t-lg" x="${K.r2(x - 16)}" y="${K.r2(yT + 4)}" text-anchor="middle">B</text>` +
    `<text class="t t-lg" x="${K.r2(x - 16)}" y="${K.r2(yB + 4)}" text-anchor="middle">B</text>`
  );
};
const detailD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>` +
  axial(VD, "D") +
  centre(VD, 88, 120) +
  `<g id="bbmark" data-role="engraved">${bbMark(Y0)}</g>` +
  `</g><rect class="thin" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/>` +
  K.balloon(VD, [104, 4.2], [96, D.y + D.h + 20], 12, { target: 12 }) +
  `<g id="mvb-D-rot" transform="translate(0 0)">` +
  K.balloon(VD, [M.refillEnd(Y0) + 2.5, 0.6], [210, D.y + D.h + 20], 11, { target: 11 }) +
  `</g><g id="mvb-D-pl">` +
  K.balloon(VD, [M.YPT_TOP + 12.4, -1.9], [292, D.y + D.h + 20], 13, { target: 13 }) +
  `</g>` +
  K.viewLabel(D.x + D.w / 2, D.y + D.h + 50, "DETAIL D", "CAM MECHANISM · ROTATOR 11 AND PLUNGER 13 NOT CUT · 5:1");

// ---------------------------------------------------------------- DEVELOPED VIEW E: the cam track, 10:1
const dx = (th) => th * M.MMD;
const devE =
  `<g data-geom="E" clip-path="url(#clip-E)"><rect class="paper" x="${E.x}" y="${E.y}" width="${E.w}" height="${E.h}"/>` +
  P.devRidges(VE, E.th0, E.th1) +
  `<path class="vis accent path-dash" d="${K.d(VE, P.lugPath(E.th0, E.th1), false)}"/>` +
  `<g id="dev-lugs">${P.devLugs(VE, X0, Y0, E.th0, E.th1)}</g>` +
  `<g id="dev-pl" data-role="phantom">${P.devPlunger(VE, E.th0, E.th1)}</g>` +
  `<circle id="dev-dot" class="accent-fill" cx="${VE.p([dx(X0), Y0])[0]}" cy="${VE.p([dx(X0), Y0])[1]}" r="2.6"/>` +
  `</g><rect class="thin" x="${E.x}" y="${E.y}" width="${E.w}" height="${E.h}" rx="6"/>`;
const slotLabels = [];
for (let th = 0; th <= 150; th += 60) {
  const q = th / 30;
  const [x] = VE.p([dx(th - 7.5), 0]);
  slotLabels.push(`<text class="t t-sm" x="${x}" y="${E.y - 6}" text-anchor="middle">${M.slotKind(q) === "long" ? "LONG" : "SHORT"}</text>`);
}
const uBot = E.uTop - E.h / k10;
const devDims =
  `<g data-role="label">${slotLabels.join("")}</g>` +
  K.dim(VE, [dx(0), uBot], [dx(60), uBot], { dir: "h", off: 16, text: "60°" }) +
  K.dim(VE, [dx(60), uBot], [dx(120), uBot], { dir: "h", off: 16, text: "60°" }) +
  K.viewLabel(E.x + E.w / 2, E.y + E.h + 48, "DEVELOPED VIEW E", "CAM TRACK UNROLLED AT Ø6.8 · PLUNGER PHANTOM · 10:1");

// ---------------------------------------------------------------- DETAIL F: the point, 20:1, riding with the refill
const detailF =
  `<g data-geom="F" clip-path="url(#clip-F)"><circle class="paper" cx="${F.cx}" cy="${F.cy}" r="${F.r}"/>` +
  P.ink(VF) + P.point(VF) + P.ball(VF) +
  centre(VF, P.S0 - 1, P.S0 + 5) +
  `</g><circle class="thin" cx="${F.cx}" cy="${F.cy}" r="${F.r}"/>` +
  K.dim(VF, [P.S0 + 0.5, 0.5], [P.S0 + 0.5, -0.5], { dir: "v", off: -70, prefix: "Ø" }) +
  K.dim(VF, [P.S0, 0.2], [P.S0 + 0.3, 0.62], { dir: "h", off: -102, text: "0.3" }) +
  K.balloon(VF, [P.S0 + 2.2, 0.75], [F.cx + 90, F.cy - 90], 5, { target: 5 }) +
  K.balloon(VF, [P.S0 + 0.4, -0.15], [F.cx - 78, F.cy + 86], 6, { target: 6 }) +
  K.viewLabel(F.cx, F.cy + F.r + 22, "DETAIL F", "BALL AND SOCKET · 20:1");

// ---------------------------------------------------------------- SECTION B-B: at the lug tops, 10:1
const sectionBB =
  `<g data-geom="BB">` +
  P.bbBeyond(VB) +
  `<g id="bb-guide">${P.bbGuide(VB, Y0 - 0.5)}</g>` +
  P.bbBarrel(VB) +
  `<g id="bb-pl">${P.bbPlunger(VB, Y0 - 0.5, M.YPT_TOP)}</g>` +
  `<g id="bb-rot" transform="rotate(${-X0} ${BB.cx} ${BB.cy})">${P.bbRotator(VB)}</g>` +
  K.centerMark(VB, [0, 0], 5.2, 0) +
  `</g>` +
  K.viewLabel(BB.cx, BB.cy + 4.85 * k10 + 24, "SECTION B-B", "AT THE LUG TOPS, RIDING WITH THE ROTATOR · 10:1");

// ---------------------------------------------------------------- DIAGRAM 1: the state machine
const SD = { x: 792, y: 44, w: 370, h: 200 };
const node = (id, x, y, title, sub) =>
  `<g id="${id}"><rect class="paper" x="${x}" y="${y}" width="148" height="40" rx="4"/><rect class="vis sd-box" x="${x}" y="${y}" width="148" height="40" rx="4"/>` +
  `<text class="t" x="${x + 74}" y="${y + 17}" text-anchor="middle">${title}</text><text class="t t-sm" x="${x + 74}" y="${y + 31}" text-anchor="middle">${sub}</text></g>`;
const arrow = (x1, y1, x2, y2) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = x2 - Math.cos(a) * 7;
  const hy = y2 - Math.sin(a) * 7;
  return `<path class="thin" d="M${x1} ${y1}L${K.r2(hx)} ${K.r2(hy)}"/><path class="head" d="M${x2} ${y2}L${K.r2(hx - Math.sin(a) * 1.8)} ${K.r2(hy + Math.cos(a) * 1.8)}L${K.r2(hx + Math.sin(a) * 1.8)} ${K.r2(hy - Math.cos(a) * 1.8)}Z"/>`;
};
const n0 = { x: SD.x + 6, y: SD.y + 14 };
const n1 = { x: SD.x + SD.w - 154, y: SD.y + 14 };
const n2 = { x: SD.x + SD.w - 154, y: SD.y + 126 };
const n3 = { x: SD.x + 6, y: SD.y + 126 };
const stateDiagram =
  `<g data-role="chart">` +
  node("sd-0", n0.x, n0.y, "RETRACTED", `LONG SLOT · TIP −${Math.abs(M.tipU(M.Y_RET)).toFixed(1)}`) +
  node("sd-1", n1.x, n1.y, "INDEXED", "ON A PLUNGER TOOTH") +
  node("sd-2", n2.x, n2.y, "EXTENDED", `SHORT SLOT · TIP +${Math.abs(M.tipU(M.Y_N)).toFixed(1)}`) +
  node("sd-3", n3.x, n3.y, "INDEXED", "ON A PLUNGER TOOTH") +
  arrow(n0.x + 152, n0.y + 20, n1.x - 4, n1.y + 20) +
  arrow(n1.x + 74, n1.y + 44, n2.x + 74, n2.y - 4) +
  arrow(n2.x - 4, n2.y + 20, n3.x + 152, n3.y + 20) +
  arrow(n3.x + 74, n3.y - 4, n0.x + 74, n0.y + 44) +
  `<text class="t t-sm" x="${SD.x + SD.w / 2}" y="${n0.y + 14}" text-anchor="middle">PRESS</text>` +
  `<text class="t t-sm" x="${SD.x + SD.w / 2}" y="${n0.y + 34}" text-anchor="middle">+30°</text>` +
  `<text class="t t-sm" x="${SD.x + SD.w / 2}" y="${n2.y + 14}" text-anchor="middle">PRESS</text>` +
  `<text class="t t-sm" x="${SD.x + SD.w / 2}" y="${n2.y + 34}" text-anchor="middle">+30°</text>` +
  `<text class="t t-sm" x="${n1.x + 82}" y="${SD.y + 104}" text-anchor="start">RELEASE +30°</text>` +
  `<text class="t t-sm" x="${n0.x + 66}" y="${SD.y + 104}" text-anchor="end">RELEASE +30°</text>` +
  `<text class="t t-sm t-mute" x="${SD.x + SD.w / 2}" y="${SD.y + 97}" text-anchor="middle">1 CLICK = 60°</text>` +
  `<text class="t t-sm t-mute" x="${SD.x + SD.w / 2}" y="${SD.y + 108}" text-anchor="middle">b ≥ ${(M.Y_RET - M.Y_G).toFixed(2)} mm</text>` +
  `</g>` +
  K.viewLabel(SD.x + SD.w / 2, SD.y + SD.h + 6, "DIAGRAM 1", "THE TOGGLE AS A STATE MACHINE · ACCENT: NOW");

// ---------------------------------------------------------------- DIAGRAM 2: spring force against compression
const CH = { x0: 318, x1: 516, y0: 574, y1: 712, xMax: 12, fMax: 3.5 };
const chX = (x) => K.r2(CH.x0 + (x / CH.xMax) * (CH.x1 - CH.x0));
const chY = (f) => K.r2(CH.y1 - (f / CH.fMax) * (CH.y1 - CH.y0));
function springChart() {
  let grid = "";
  let labels = "";
  for (let f = 0; f <= CH.fMax; f += 0.5) {
    grid += `M${CH.x0} ${chY(f)}H${CH.x1}`;
    if (f % 1 === 0) labels += `<text class="t t-sm" x="${CH.x0 - 6}" y="${K.r2(chY(f) + 2.7)}" text-anchor="end">${f}</text>`;
  }
  for (let x = 0; x <= CH.xMax; x += 2) {
    grid += `M${chX(x)} ${CH.y0}V${CH.y1}`;
    labels += `<text class="t t-sm" x="${chX(x)}" y="${CH.y1 + 11}" text-anchor="middle">${x}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH.x0 + CH.x1) / 2}" y="${CH.y1 + 24}" text-anchor="middle">SPRING COMPRESSION, mm</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH.x0 - 22}" y="${(CH.y0 + CH.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH.x0 - 22} ${(CH.y0 + CH.y1) / 2})">FORCE F, N</text>`;
  const marks = [
    ["RET", M.compression(M.Y_RET)],
    ["EXT", M.compression(M.Y_N)],
    ["STOP", M.compression(M.Y_MIN)],
  ];
  let pts = "";
  for (const [name, x] of marks) {
    const f = M.RATE * x;
    pts += `<path class="hid" d="M${chX(x)} ${CH.y1}V${chY(f)}"/><circle class="dot" cx="${chX(x)}" cy="${chY(f)}" r="1.8"/>`;
    labels += `<text class="t t-sm" x="${K.r2(chX(x) - 4)}" y="${K.r2(chY(f) - 6)}" text-anchor="end">${name}</text>`;
  }
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="vis" d="M${chX(0)} ${chY(0)}L${chX(CH.xMax)} ${chY(M.RATE * CH.xMax)}"/>` +
    pts +
    `<circle id="chart-dot" class="accent-fill" cx="${chX(M.compression(Y0))}" cy="${chY(M.springForce(Y0))}" r="3"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH.x0 + CH.x1) / 2, CH.y1 + 58, "DIAGRAM 2", `RETURN SPRING · k = ${M.RATE.toFixed(3)} N/mm`)
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "BARREL TUBE Ø9.7×0.35", "X5CrNi18-10", "1"],
  ["2", "THREAD BUSH M8×0.5", "CuZn39Pb3", "1"],
  ["3", "NOSE CONE M8×0.5", "CuZn39Pb3, Cr PLATED", "1"],
  ["4", "RETURN SPRING Ø0.4×Ø4.3×19, 10 TURNS", "EN 10270-3 1.4310", "1"],
  ["5", "POINT, 5 INK GROOVES", "CuNi18Zn20", "1"],
  ["6", "BALL Ø1.0 ISO 12757-2", "WC-Co", "1"],
  ["7", "POINT HOLDER", "CuZn39Pb3", "1"],
  ["8", "REFILL TUBE Ø6×0.3", "CuZn37", "1"],
  ["9", "INK FOLLOWER", "SILICONE GREASE", "1"],
  ["10", "END PLUG", "PP", "1"],
  ["11", "ROTATOR, 3 LUGS", "POM-C", "1"],
  ["12", "CAM GUIDE, 3 LONG + 3 SHORT SLOTS", "PA66", "1"],
  ["13", "PLUNGER, 6 TEETH", "POM-H", "1"],
  ["14", "BUTTON CAP", "X5CrNi18-10", "1"],
  ["15", "TOP CAP", "CuZn39Pb3, Cr PLATED", "1"],
  ["16", "CLIP, 0.5 STRIP", "X10CrNi18-8", "1"],
  ["17", "INK, ISO 12757-2 G2", "OIL-BASED PASTE", "0.6 g"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const bomTop = TB.y - (18 + BOM.length * 16);
const bom = K.table(
  TB.x,
  bomTop,
  [
    { w: 34, align: "center", title: "ITEM" },
    { w: 200, title: "DESCRIPTION" },
    { w: 128, title: "MATERIAL" },
    { w: 38, align: "center", title: "QTY" },
  ],
  BOM
);

const notes = K.notes(790, 296, "NOTES", [
  `6 PLUNGER TEETH, 6 RIDGE TEETH, 3 LUGS: ONE CLICK TURNS ROTATOR 11 BY 60°.`,
  `PRESS b ≥ ${(M.Y_RET - M.Y_G).toFixed(2)}: LUG CLEARS THE RIDGE, PLUNGER FLANK TURNS IT 30°.`,
  `RELEASE: RIDGE FLANK TURNS IT 30° MORE, INTO THE NEXT SLOT.`,
  `LONG SLOT = RETRACTED, SHORT SLOT = EXTENDED: A TOGGLE (T FLIP-FLOP).`,
  `k = Gd⁴/8D³n = ${M.RATE.toFixed(3)} N/mm; SOLID ${M.SOLID.toFixed(1)} mm. PLUNGER, ROTATOR, BALL NOT CUT.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "CLICK PEN · PUSH-PUSH CAM", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-014", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "2:1" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-15" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-f" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · N · deg" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE BUTTON IN · SPACE CLICKS · ← → PRESS AND RELEASE", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="h-cam" patternUnits="userSpaceOnUse" width="2.6" height="2.6" patternTransform="rotate(45)"><path class="cam-hl" d="M0 -1V3.6"/></pattern>` +
  `<pattern id="ink" patternUnits="userSpaceOnUse" width="6" height="2.4"><path class="hl" d="M0.6 1.2H3.6"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-D"><rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-E"><rect x="${E.x}" y="${E.y}" width="${E.w}" height="${E.h}" rx="6"/></clipPath>` +
  `<clipPath id="clip-F"><circle cx="${F.cx}" cy="${F.cy}" r="${F.r}"/></clipPath>` +
  `</defs>`;

const hit =
  `<rect class="hit" data-drag="main" x="${VM.p([100, 0])[0]}" y="${VM.p([0, 9])[1]}" width="${K.r2(40 * VM.k)}" height="${K.r2(18 * VM.k)}"/>` +
  `<rect class="hit" data-drag="D" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a retractable ballpoint pen cut along its axis. Drag the button in, or press Space, to click it; the rotator turns 60 degrees per click and the refill toggles between retracted and extended." ` +
  `data-views='${JSON.stringify(VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  mainBalloons +
  mainMarks +
  detailD +
  devE +
  devDims +
  detailF +
  sectionBB +
  stateDiagram +
  springChart() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the button in · <kbd>Space</kbd> click · <kbd>←</kbd> <kbd>→</kbd> press and release · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const css =
  `.bp-sheet .hit{fill:transparent}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}` +
  `.bp-sheet .cam-tint{fill:var(--bp-accent);fill-opacity:.38}.bp-sheet .cam-line{stroke:var(--bp-accent)}` +
  `.bp-sheet .cam-hl{fill:none;stroke:var(--bp-accent);stroke-width:.6px}` +
  `.bp-sheet .ink{fill:url(#ink)}.bp-sheet .path-dash{stroke-dasharray:3 2}` +
  `.bp-sheet .sd-box.on{stroke:var(--bp-accent);stroke-width:2px}` +
  `.bp-sheet [data-drag]{cursor:ew-resize}`;

const size = writePage(join(here, "click-pen.html"), {
  title: "Click Pen Section",
  description: "A live engineering drawing of a retractable ballpoint pen: each click turns the rotating cam by one tooth pitch and toggles the refill between a long slot and a short slot.",
  svg,
  bar,
  css,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8").replace("__CHART__", JSON.stringify(CH)).replace("__LAYOUT__", JSON.stringify({ D, E, F, BB })),
});
console.log(`click-pen.html  ${(size / 1024).toFixed(0)} KB  k ${M.RATE.toFixed(3)} N/mm  index at b ${(M.Y_RET - M.Y_G).toFixed(2)} mm`);
