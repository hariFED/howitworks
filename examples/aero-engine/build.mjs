// Builds aero-engine.html: a live A2 drawing of the flat-four aircraft engine, cut in plan through all
// four cylinders, with a transverse section through cylinder 1 and its valve train.
//   node examples/aero-engine/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CYC = M.cycle();
const TAB = CYC.table;
const PC = M.powerCurve();

// ---------------------------------------------------------------- views
const C = { cx: 590, cy: 404, r: 78, u: 300, z: 0 }; // Detail C circle, on the chamber
const D = { x: 44, y: 462, w: 190, h: 150, u: 0, v: 268 }; // Detail D window, on the crank nose
const E = { x: 262, y: 462, w: 200, h: 150, u: 44, z: 125 }; // Detail E window, on the tappet
const k25 = 0.4 * K.PX_PER_MM;
const k2 = 1 * K.PX_PER_MM;
const VIEWS = {
  main: { x: 230, y: 262, scale: 0.2 },
  AA: { x: 690, y: 160, scale: 0.2 },
  C: { x: C.cx + C.u * k25, y: C.cy + C.z * k25, scale: 0.4 },
  D: { x: D.x + D.w / 2 - D.u * k25, y: D.y + D.h / 2 + D.v * k25, scale: 0.4 },
  E: { x: E.x + E.w / 2 + E.u * k2, y: E.y + E.h / 2 + E.z * k2, scale: 1 },
};
const VM = K.view(VIEWS.main);
const VAw = K.view(VIEWS.AA);
const VA = P.aa(VAw); // A-A in (u, z)
const VCw = K.view(VIEWS.C);
const VC = P.aa(VCw);
const VD = K.view(VIEWS.D);
const VEw = K.view(VIEWS.E);
const VE = P.aa(VEw);
const PA0 = M.pinA(0); // pistons are drawn at TDC; the page slides them

// ---------------------------------------------------------------- shared layers
const tint = (p) => K.r2(0.2 + 0.8 * Math.min(1, Math.max(0, Math.log(p / 0.7) / Math.log(55 / 0.7))));
function planCylinder(k) {
  const VL = P.plan(VM, k);
  return P.barrel(VL) + P.headPlan(VL);
}
const planGas = () =>
  `<g data-role="fluid">` + M.IDS.map((k) => `<path id="gas-p${k}" class="tint" fill-opacity="0.3" d="${K.d(P.plan(VM, k), P.cylinderGas(0))}"/>`).join("") + `</g>`;
const planMoving = () =>
  M.IDS.map((k) => {
    const VL = P.plan(VM, k);
    return `<g id="rod-p${k}">${P.part(5, P.rodPlan(VL, 0))}</g><g id="pist-p${k}">${P.pistonPlan(VL, PA0)}${P.pinPlan(VL, PA0)}</g>`;
  }).join("");

function aaStatic(V, opts = {}) {
  return (
    (opts.noCase ? "" : P.caseAA(V, 1) + P.caseAA(V, -1)) +
    (opts.noSump ? "" : P.sump(V) + `<g data-role="fluid"><path class="oil" d="${K.d(V, P.oilShape())}"/><path class="thin" d="${K.d(V, P.oilShape().slice(0, 2), false)}"/></g>` + P.carburettor(V)) +
    P.barrel(V) +
    P.headAA(V) +
    P.cover(V) +
    P.part(14, P.shroud(V))
  );
}
function aaGas(VL, id) {
  return (
    `<g data-role="fluid">` +
    `<path class="tint" fill-opacity="${tint(M.P_IN)}" d="${P.gasPath(VL, P.portGas())}"/>` +
    `<path class="tint" fill-opacity="${tint(M.P_IN)}" d="${K.d(VL, P.pipeGas())}"/>` +
    `<path id="gas-${id}" class="tint" fill-opacity="0.3" d="${K.d(VL, P.cylinderGas(0))}"/>` +
    P.PLUGS.map((pl, i) => `<circle id="flame-${id}-${i}" class="tint burn" clip-path="url(#clip-gas-${id})" cx="${VL.p(P.plugGap(pl))[0]}" cy="${VL.p(P.plugGap(pl))[1]}" r="0"/>`).join("") +
    `</g>`
  );
}
const aaMoving = (V, id, { train = true } = {}) =>
  `<g id="crank-${id}">${P.crankAA(V, 0)}</g>` +
  `<g id="rod-${id}">${P.rodAA(V, M.crankPin(1, 0), [PA0, 0])}</g>` +
  `<g id="pist-${id}">${P.pistonAA(V, PA0)}${P.pinAA(V, PA0)}</g>` +
  (train
    ? `<g id="cam-${id}">${P.cam(V, 0)}</g>` +
      `<g id="tap-${id}">${P.part(15, P.tappet(V, 0, id === "E"))}${P.part(14, P.pushrod(V, 0))}</g>` +
      `<g id="valve-${id}">${P.valve(V)}${P.part(12, P.retainer(V))}</g>` +
      `<g id="spr-${id}">${P.part(12, P.springs(V, 0))}</g>` +
      `<g id="rocker-${id}">${P.rocker(V, 0)}</g>`
    : `<g id="valve-${id}">${P.valve(V)}</g>`);

// A detail circle whose letter sits clear of the drawing, joined to the circle by a thin leader.
function detailMarkOut(V, c, r, letter, [lx, ly]) {
  const [x, y] = V.p(c);
  const R = r * V.k;
  const a = Math.atan2(ly - 4 - y, lx - x);
  const ex = K.r2(x + R * Math.cos(a));
  const ey = K.r2(y + R * Math.sin(a));
  return `<g data-role="label"><circle class="thin mark" cx="${x}" cy="${y}" r="${K.r2(R)}"/><path class="thin" d="M${ex} ${ey}L${K.r2(lx + 8 * Math.cos(a + Math.PI))} ${K.r2(ly - 4)}"/><text class="t t-lg" x="${lx}" y="${ly}" text-anchor="middle">${letter}</text></g>`;
}

// ---------------------------------------------------------------- PLAN SECTION (main view)
const mainView =
  `<g data-geom="main">` +
  P.caseHalf(VM, 1) +
  P.caseHalf(VM, -1) +
  P.shellsPlan(VM) +
  P.seal(VM) +
  `<g id="crank-main">${P.crankPlan(VM, 0)}</g>` +
  M.IDS.map(planCylinder).join("") +
  planGas() +
  planMoving() +
  P.accessoryHousing(VM) +
  P.crankGear(VM) +
  P.magnetoGears(VM) +
  P.oilPump(VM) +
  P.magnetos(VM) +
  K.centerline(VM, [0, -258], [0, 336], 4) +
  M.IDS.map((k) => K.centerline(P.plan(VM, k), [100, 0], [418, 0], 0)).join("") +
  [1, -1].map((sg) => K.centerline(VM, [sg * P.MAG_U, -222], [sg * P.MAG_U, -376], 0)).join("") +
  `</g>`;

// stepped cutting plane A-A: through cylinder 1's axis, then its inlet valve; arrows look aft (down)
function cuttingPlane() {
  const yA = VM.p([0, M.CYL[1].v])[1];
  const yB = VM.p([0, M.CYL[1].v - P.INLET_OFF])[1];
  const x0 = VM.p([-440, 0])[0];
  const xs = VM.p([205, 0])[0];
  const x1 = VM.p([430, 0])[0];
  const head = (x, y) => `M${x} ${y + 15}L${K.r2(x - 1.75)} ${y + 8}L${K.r2(x + 1.75)} ${y + 8}Z`;
  return (
    `<g data-role="label">` +
    `<path class="ctr" d="M${x0 + 12} ${yA}H${xs}V${yB}H${x1 - 12}"/>` +
    `<path class="vis" d="M${x0} ${yA}H${x0 + 12}M${xs - 6} ${yA}H${xs}V${yB}H${xs + 6}M${x1 - 12} ${yB}H${x1}"/>` +
    `<path class="thin" d="M${x0 + 3} ${yA}V${yA + 8}M${x1 - 3} ${yB}V${yB + 8}"/>` +
    `<path class="head" d="${head(x0 + 3, yA)}${head(x1 - 3, yB)}"/>` +
    `<text class="t t-lg" x="${K.r2(x0 + 4)}" y="${K.r2(yA - 5)}" text-anchor="middle">A</text>` +
    `<text class="t t-lg" x="${K.r2(x1 + 7)}" y="${K.r2(yB + 4)}" text-anchor="middle">A</text>` +
    `</g>`
  );
}

const dimTravel = (psi) =>
  K.dim(P.plan(VM, 3), [M.crownAtTDC, -M.BORE / 2], [M.crown(psi), -M.BORE / 2], { dir: "h", off: K.r2(VM.p([0, -212])[1] - VM.p([0, -72.5 - M.BORE / 2])[1]), text: `s₃=${K.fmt(M.travel(psi), 1)}`, id: "dim-travel" });

const mainDims =
  K.dim(VM, [-P.HEAD_END, M.CYL[2].v], [P.HEAD_END, M.CYL[1].v], { dir: "h", off: K.r2(106 - VM.p([0, M.CYL[2].v])[1]) }) +
  K.dim(VM, [P.FLANGE.pilotR, P.FLANGE.pilot], [P.MAG_U + 18, P.MAG.v1], { dir: "v", off: K.r2(412 - VM.p([P.FLANGE.pilotR, 0])[0]) }) +
  `<g id="dim-travel-wrap">${dimTravel(M.local(3, 0))}</g>`;

// Balloons whose circle stays put while the dot follows a moving part are redrawn every frame.
const LIVE_BALLOONS = {
  5: { at: [438, 346], k: 3 },
  8: { at: [438, 326], k: 3 },
  6: { at: [438, 306], k: 3 },
  7: { at: [438, 286], k: 3 },
};
const liveBalloons = Object.keys(LIVE_BALLOONS).map((n) => `<g id="lb-${n}"></g>`).join("");

const mainBalloons =
  K.balloon(VM, [-120, 230], [44, 196], 2, { target: 2 }) +
  K.balloon(VM, [120, 10], [438, 186], 1, { target: 1 }) +
  K.balloon(VM, [-P.SHELL_R + 1.6, 0], [44, 252], 3, { target: 3 }) +
  K.balloon(VM, [0, 280], [44, 150], 4, { target: 4 }) +
  K.balloon(VM, [-330, M.CYL[4].v + 90], [44, 290], 10, { target: 10 }) +
  K.balloon(VM, [-153, M.CYL[2].v + 90], [44, 330], 9, { target: 9 }) +
  K.balloon(VM, [-100, -236], [44, 368], 23, { target: 23 }) +
  K.balloon(VM, [-P.MAG_U - 30, -330], [44, 404], 21, { target: 21 }) +
  K.balloon(VM, [P.MAG_U + 36, -236], [438, 404], 20, { target: 20 }) +
  K.balloon(VM, [20, -282], [438, 430], 22, { target: 22 }) +
  K.balloon(VM, [-37, -237], [44, 436], 19, { target: 19 }) +
  liveBalloons;

const mainMarks =
  cuttingPlane() +
  K.viewLabel(VM.p([0, 0])[0], 56, "PLAN SECTION", "THROUGH ALL FOUR CYLINDER AXES · SCALE 1:5") +
  detailMarkOut(VM, [0, 268], 98, "D", [150, 128]);

// ---------------------------------------------------------------- SECTION A-A
const aaView =
  `<g data-geom="AA" clip-path="url(#clip-AA)">` +
  aaStatic(VA) +
  aaGas(VA, "AA") +
  aaMoving(VA, "AA") +
  P.plugs(VA) +
  P.intakePipe(VA) +
  K.centerline(VA, [-60, 0], [418, 0], 0) +
  K.centerMark(VA, [0, 0], 10, 3) +
  K.centerMark(VA, P.CAM_C, 8, 3) +
  `<path class="ctr" d="${K.d(VA, K.circle(0, 0, M.CRANK_R, 72))}"/>` +
  `</g>` +
  K.breakLine(VAw, [94, 172], [94, -230]);
const aaBalloons =
  K.balloon(VA, P.W(0, 150), [752, 76], 11, { target: 11 }) +
  K.balloon(VA, P.PIVOT, [500, 76], 13, { target: 13 }) +
  K.balloon(VA, [P.BOX.a0 + 40, P.BOX.top + 11.5], [500, 104], 18, { target: 18 }) +
  K.balloon(VA, [200, 120], [752, 104], 14, { target: 14 }) +
  K.balloon(VA, [P.PLUGS[1].tip[0] + 60 * P.PLUGS[1].d[0], P.PLUGS[1].tip[1] + 60 * P.PLUGS[1].d[1]], [500, 250], 17, { target: 17 }) +
  K.balloon(VA, [110, -160], [752, 214], 24, { target: 24 }) +
  K.balloon(VA, [200, P.PIPE_Z - 18], [500, 222], 25, { target: 25 }) +
  K.balloon(VA, [-40, P.SUMP.floor - 60], [752, 262], 26, { target: 26 }) +
  K.balloon(VA, [0, 137], [752, 132], 16, { target: 16 }) +
  K.balloon(VA, [60, 134], [752, 160], 15, { target: 15 }) +
  `<g id="lb-12"></g>`;
const aaMarks =
  K.viewLabel(VAw.x - 120, 56, "SECTION A-A", "STEPPED TO THE INLET VALVE · LOOKING AFT · 1:5") +
  detailMarkOut(VA, [C.u, C.z], C.r / k25, "C", [556, 262]) +
  detailMarkOut(VA, [E.u, E.z], 48, "E", [700, 84]);

// ---------------------------------------------------------------- DETAIL C: chamber and the two plugs, 1:2.5
const detailC =
  `<g data-geom="C" clip-path="url(#clip-C)"><circle class="paper" cx="${C.cx}" cy="${C.cy}" r="${C.r}"/>` +
  aaStatic(VC, { noSump: true }) +
  aaGas(VC, "C") +
  aaMoving(VC, "C", { train: false }) +
  P.plugs(VC) +
  K.centerline(VC, [200, 0], [400, 0], 0) +
  `</g><circle class="thin" cx="${C.cx}" cy="${C.cy}" r="${C.r}"/>` +
  K.balloon(VC, [P.PLUGS[0].tip[0] + 30 * P.PLUGS[0].d[0] + 6, P.PLUGS[0].tip[1] + 30 * P.PLUGS[0].d[1]], [686, 346], 17, { target: 17 }) +
  K.viewLabel(C.cx, C.cy + C.r + 18, "DETAIL C", "DUAL IGNITION: TWO PLUGS, TWO FLAMES · 1:2.5");

// ---------------------------------------------------------------- DETAIL D: crank nose and propeller flange, 1:2.5
const detailD =
  `<g data-geom="D" clip-path="url(#clip-D)"><rect class="paper" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/>` +
  P.caseHalf(VD, 1) + P.caseHalf(VD, -1) + P.shellsPlan(VD) + P.seal(VD) +
  `<g id="crank-D">${P.crankPlan(VD, 0)}</g>` +
  K.centerline(VD, [0, 200], [0, 336], 0) +
  `</g><rect class="thin" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/>` +
  K.balloon(VD, [-(P.NOSE_R + 6), P.SEAL.v0 + 4], [D.x + 14, D.y + D.h + 14], 27, { target: 27 }) +
  K.viewLabel(D.x + D.w / 2, D.y + D.h + 34, "DETAIL D", "CRANK NOSE, SEAL, PROPELLER FLANGE · 1:2.5");

// ---------------------------------------------------------------- DETAIL E: cam, hydraulic tappet and pushrod, 1:2
const detailE =
  `<g data-geom="E" clip-path="url(#clip-E)"><rect class="paper" x="${E.x}" y="${E.y}" width="${E.w}" height="${E.h}"/>` +
  P.caseAA(VE, 1) + P.caseAA(VE, -1) + P.part(14, P.shroud(VE)) +
  `<g id="cam-E">${P.cam(VE, 0)}</g>` +
  `<g id="tap-E">${P.part(15, P.tappet(VE, 0, true))}${P.part(14, P.pushrod(VE, 0))}</g>` +
  K.centerMark(VE, P.CAM_C, 8, 3) +
  `</g><rect class="thin" x="${E.x}" y="${E.y}" width="${E.w}" height="${E.h}" rx="10"/>` +
  K.viewLabel(E.x + E.w / 2, E.y + E.h + 34, "DETAIL E", "CAM, HYDRAULIC TAPPET, PUSHROD · 1:1");

// ---------------------------------------------------------------- DIAGRAM 1: torque on the crank
const TQ = (() => {
  const rows = [];
  for (let f = 0; f <= 720; f += 2) {
    const e = M.engine(TAB, f);
    rows.push({ f, total: e.total, ...Object.fromEntries(M.IDS.map((k) => [k, e.cyl[k].tq])) });
  }
  return rows;
})();
const TC = { x0: 826, x1: 1160, y0: 56, y1: 178, tMin: -1000, tMax: 3000 };
const tcX = (f) => K.r2(TC.x0 + (f / 720) * (TC.x1 - TC.x0));
const tcY = (t) => K.r2(TC.y1 - ((Math.max(TC.tMin, Math.min(TC.tMax, t)) - TC.tMin) / (TC.tMax - TC.tMin)) * (TC.y1 - TC.y0));
function torqueChart() {
  let grid = "";
  let labels = "";
  for (let t = TC.tMin; t <= TC.tMax; t += 1000) {
    grid += `M${TC.x0} ${tcY(t)}H${TC.x1}`;
    labels += `<text class="t t-sm" x="${TC.x0 - 5}" y="${K.r2(tcY(t) + 2.7)}" text-anchor="end">${t}</text>`;
  }
  for (let f = 0; f <= 720; f += 180) {
    grid += `M${tcX(f)} ${TC.y0}V${TC.y1}`;
    labels += `<text class="t t-sm" x="${tcX(f)}" y="${TC.y1 + 11}" text-anchor="middle">${f}</text>`;
  }
  const cyl = M.IDS.map((k) => `<polyline class="thin" points="${TQ.map((r) => `${tcX(r.f)},${tcY(r[k])}`).join(" ")}"/>`).join("");
  const total = TQ.map((r) => `${tcX(r.f)},${tcY(r.total)}`).join(" ");
  for (const k of M.IDS) {
    const peak = M.CYL[k].offset + 360 + 16;
    const f = peak % 720;
    labels += `<text class="t t-sm" x="${K.r2(tcX(f) + 3)}" y="${K.r2(TC.y0 + 9)}">${k}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(TC.x0 + TC.x1) / 2}" y="${TC.y1 + 23}" text-anchor="middle">CRANK ANGLE φ, ° (CYL 1 FIRES AT 360)</text>`;
  labels += `<text class="t t-sm t-mute" x="794" y="${(TC.y0 + TC.y1) / 2}" text-anchor="middle" transform="rotate(-90 794 ${(TC.y0 + TC.y1) / 2})">TORQUE, N·m</text>`;
  const mean = CYC.torque;
  return (
    `<g data-role="chart"><rect class="paper" x="${TC.x0}" y="${TC.y0}" width="${TC.x1 - TC.x0}" height="${TC.y1 - TC.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    cyl +
    `<polyline class="vis" points="${total}"/>` +
    `<path class="hid" d="M${TC.x0} ${tcY(mean)}H${TC.x1}"/>` +
    `<polyline id="tq-now" class="vis accent" points=""/>` +
    `<circle id="tq-dot" class="accent-fill" cx="${TC.x0}" cy="${tcY(0)}" r="2.6"/>` +
    `<path id="tq-cursor" class="thin" d="M${TC.x0} ${TC.y0}V${TC.y1}"/>` +
    `<rect class="vis" x="${TC.x0}" y="${TC.y0}" width="${TC.x1 - TC.x0}" height="${TC.y1 - TC.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((TC.x0 + TC.x1) / 2, 222, "DIAGRAM 1 · TORQUE ON THE CRANK", `THIN: EACH CYLINDER · THICK: SUM · DASHED: BRAKE MEAN ${Math.round(mean)} N·m`)
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: power against rpm
const PW = { x0: 96, x1: 440, y0: 676, y1: 756, r0: 1500, r1: 3000, pMax: 150 };
const pwX = (r) => K.r2(PW.x0 + ((r - PW.r0) / (PW.r1 - PW.r0)) * (PW.x1 - PW.x0));
const pwY = (p) => K.r2(PW.y1 - (p / PW.pMax) * (PW.y1 - PW.y0));
function powerChart() {
  let grid = "";
  let labels = "";
  for (let p = 0; p <= PW.pMax; p += 50) {
    grid += `M${PW.x0} ${pwY(p)}H${PW.x1}`;
    if (p > 0) labels += `<text class="t t-sm" x="${PW.x0 - 5}" y="${K.r2(pwY(p) + 2.7)}" text-anchor="end">${p}</text>`;
  }
  for (let r = PW.r0; r <= PW.r1; r += 300) {
    grid += `M${pwX(r)} ${PW.y0}V${PW.y1}`;
    labels += `<text class="t t-sm" x="${pwX(r)}" y="${PW.y1 + 11}" text-anchor="middle">${r}</text>`;
  }
  const eng = PC.map((c) => `${pwX(c.rpm)},${pwY(c.power)}`).join(" ");
  const prop = [];
  for (let r = PW.r0; r <= PW.r1; r += 50) prop.push(`${pwX(r)},${pwY(M.propPower(r, CYC.power))}`);
  labels += `<text class="t t-sm t-mute" x="${(PW.x0 + PW.x1) / 2}" y="${PW.y1 + 23}" text-anchor="middle">ENGINE SPEED, rpm</text>`;
  labels += `<text class="t t-sm t-mute" x="66" y="${(PW.y0 + PW.y1) / 2}" text-anchor="middle" transform="rotate(-90 66 ${(PW.y0 + PW.y1) / 2})">POWER, kW</text>`;
  labels += `<text class="t t-sm" x="${pwX(1560)}" y="${pwY(98)}">FULL THROTTLE</text>`;
  labels += `<text class="t t-sm" x="${pwX(2180)}" y="${pwY(30)}">FIXED-PITCH PROPELLER</text>`;
  labels += `<text class="t t-sm" x="${pwX(2680)}" y="${pwY(CYC.power) + 14}" text-anchor="end">${M.RPM} rpm · ${Math.round(CYC.power)} kW</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${PW.x0}" y="${PW.y0}" width="${PW.x1 - PW.x0}" height="${PW.y1 - PW.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline class="vis" points="${eng}"/>` +
    `<polyline class="hid" points="${prop.join(" ")}"/>` +
    `<circle class="dot" cx="${pwX(M.RPM)}" cy="${pwY(CYC.power)}" r="2.8"/>` +
    `<rect class="vis" x="${PW.x0}" y="${PW.y0}" width="${PW.x1 - PW.x0}" height="${PW.y1 - PW.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((PW.x0 + PW.x1) / 2, 798, "DIAGRAM 2 · POWER", "FULL-THROTTLE CYCLE, LESS FRICTION, AGAINST THE PROPELLER'S DEMAND")
  );
}

// ---------------------------------------------------------------- parts list, notes, title block
const BOM = [
  ["1", "CRANKCASE, RIGHT HALF", "A356-T6 (AlSi7Mg0.3)", "1"],
  ["2", "CRANKCASE, LEFT HALF", "A356-T6 (AlSi7Mg0.3)", "1"],
  ["3", "MAIN BEARING SHELL Ø60.3", "STEEL / CuPb24Sn", "3 PR"],
  ["4", "CRANKSHAFT, 4 THROWS, FLANGE", "34CrNiMo6, NITRIDED", "1"],
  ["5", "CONNECTING ROD, H, 175 C/C", "34CrNiMo6", "4"],
  ["6", "PISTON Ø130.2", "AlSi12CuNiMg", "4"],
  ["7", "RING SET, HALF-WEDGE, 3 RINGS", "GJL / STEEL, CHROMED", "4"],
  ["8", "PISTON PIN Ø28, FLOATING", "16MnCr5 + AL PLUGS", "4"],
  ["9", "CYLINDER BARREL Ø130.2, FINNED", "34CrNiMo6, NITRIDED", "4"],
  ["10", "CYLINDER HEAD + ROCKER BOX", "A242 (AlCu4Ni2Mg2)", "4"],
  ["11", "VALVE, IN Ø49 / EX Ø41", "X45CrSi9-3 / NIMONIC 80A", "8"],
  ["12", "VALVE SPRING PAIR + RETAINER", "EN 10270-2", "8"],
  ["13", "ROCKER ARM, RATIO 1.45", "42CrMo4", "8"],
  ["14", "PUSHROD Ø9.5 + SHROUD TUBE", "25CrMo4 / AlMg3", "8"],
  ["15", "HYDRAULIC TAPPET Ø21", "GJL CHILLED / 100Cr6", "8"],
  ["16", "CAMSHAFT", "16MnCr5, CASE HARD.", "1"],
  ["17", "SPARK PLUG 18×1.5, SHIELDED", "BOUGHT OUT", "8"],
  ["18", "ROCKER BOX COVER", "AlSi10Mg", "4"],
  ["19", "CRANKSHAFT GEAR z24 m3", "18CrNiMo7-6", "1"],
  ["20", "MAGNETO DRIVE GEAR z24 m3", "18CrNiMo7-6", "2"],
  ["21", "MAGNETO, 4-CYL, 1:1", "BOUGHT OUT", "2"],
  ["22", "OIL PUMP, GEAR TYPE", "BOUGHT OUT", "1"],
  ["23", "ACCESSORY HOUSING", "A356-T6", "1"],
  ["24", "OIL SUMP + INDUCTION RISER", "A356-T6", "1"],
  ["25", "INTAKE PIPE Ø38×2", "EN AW-5754", "4"],
  ["26", "CARBURETTOR, UPDRAFT, FLOAT", "BOUGHT OUT", "1"],
  ["27", "CRANKSHAFT OIL SEAL Ø68", "FKM", "1"],
];
const TB = { x: 776, y: 708, w: 400, h: 116 };
const ROW = 15;
const bomTop = TB.y - (18 + BOM.length * ROW);
const bom = K.table(TB.x, bomTop, [
  { w: 30, align: "center", title: "ITEM" },
  { w: 190, title: "DESCRIPTION" },
  { w: 144, title: "MATERIAL" },
  { w: 36, align: "center", title: "QTY" },
], BOM, { rowH: ROW });

const T = M.TIMING;
const slow = Math.round((M.RPM * 6) / 90);
const notes = K.notes(486, 560, "NOTES", [
  `FLAT-FOUR, DIRECT DRIVE. ${M.BORE} × ${M.STROKE}: ${K.fmt(M.DISPLACEMENT, 2)} L.`,
  `CLEARANCE ${K.fmt(M.V_CLEAR, 1)} cm³ A CYLINDER; CR ${M.CR.toFixed(2)} : 1.`,
  `FIRING ORDER 1-3-2-4: A POWER STROKE EVERY 180°.`,
  `TWO MAGNETOS, TWO PLUGS A CYLINDER, BOTH 25° BTDC.`,
  `CYCLE AT ${M.RPM} rpm, FULL THROTTLE, SHOWN ${slow}× SLOWER.`,
  `PEAK ${K.fmt(CYC.peak, 0)} bar AT ${CYC.peakAt - 360}° ATDC · IMEP ${K.fmt(CYC.imep, 1)} · FMEP ${K.fmt(CYC.fmep, 1)} bar.`,
  `BRAKE ${Math.round(CYC.torque)} N·m, ${K.fmt(CYC.power, 1)} kW (${Math.round(CYC.power / 0.7457)} hp).`,
  `IVO ${K.fmt(T.ivo, 0)}° BTDC · IVC ${K.fmt(T.ivc, 0)}° ABDC.`,
  `EVO ${K.fmt(T.evo, 0)}° BBDC · EVC ${K.fmt(T.evc, 0)}° ATDC.`,
  `HYDRAULIC TAPPETS: NO VALVE LASH TO SET.`,
  `EXHAUST VALVE ${2 * P.INLET_OFF} FORWARD OF THE INLET, OUT OF A-A.`,
  `CRANK, RODS AND PIN SHOWN IN VIEW IN THE PLAN.`,
  `WET SUMP 5.7 L; INTAKE RISER RUNS THROUGH THE OIL.`,
  `PROPELLER FLANGE Ø${2 * P.FLANGE.r}, 6 BUSHINGS ON Ø${2 * P.FLANGE.bolt}.`,
]);

const title = K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
  { x: 0, y: 0, w: 290, h: 32, label: "TITLE", value: "FLAT-FOUR AERO ENGINE · PLAN", size: "lg" },
  { x: 290, y: 0, w: 110, h: 32, label: "DWG NO", value: "BP-101", size: "lg" },
  { x: 0, y: 32, w: 64, h: 25, label: "SCALE", value: "1:5" },
  { x: 64, y: 32, w: 50, h: 25, label: "SIZE", value: "A2" },
  { x: 114, y: 32, w: 56, h: 25, label: "SHEET", value: "1 / 1" },
  { x: 170, y: 32, w: 110, h: 25, label: "DRAWN", value: "CLAUDE" },
  { x: 280, y: 32, w: 120, h: 25, label: "DATE", value: "2026-10-18" },
  { x: 0, y: 57, w: 140, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
  { x: 140, y: 57, w: 120, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
  { x: 260, y: 57, w: 140, h: 25, label: "UNITS", value: "mm · bar abs · N·m" },
  { x: 0, y: 82, w: 400, h: 34, label: "LIVE · DRAG THE CRANK IN A-A · ← → TURN · SPACE RUNS · S SLOW", value: "", id: "readout" },
]);

// ---------------------------------------------------------------- the sheet
const defs =
  `<defs>${K.hatchDefs()}` +
  `<pattern id="gas-c" patternUnits="userSpaceOnUse" width="3" height="3"><circle class="gas-dot" cx="0.75" cy="0.75" r="0.55"/><circle class="gas-dot" cx="2.25" cy="2.25" r="0.55"/></pattern>` +
  `<pattern id="gas-b" patternUnits="userSpaceOnUse" width="4.4" height="4.4"><circle class="gas-dot" cx="1.1" cy="1.1" r="0.95"/><circle class="gas-dot" cx="3.3" cy="3.3" r="0.95"/></pattern>` +
  `<pattern id="oil" patternUnits="userSpaceOnUse" width="6" height="3.2"><path class="hl" d="M0 1.6H3"/></pattern>` +
  `<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>` +
  `<clipPath id="clip-AA"><rect x="${VAw.p([-430, 0])[0]}" y="80" width="${K.r2(VAw.p([94, 0])[0] - VAw.p([-430, 0])[0])}" height="${300 - 80}"/></clipPath>` +
  `<clipPath id="clip-C"><circle cx="${C.cx}" cy="${C.cy}" r="${C.r}"/></clipPath>` +
  `<clipPath id="clip-D"><rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-E"><rect x="${E.x}" y="${E.y}" width="${E.w}" height="${E.h}" rx="10"/></clipPath>` +
  `<clipPath id="clip-gas-AA"><path id="clipgas-AA" d=""/></clipPath>` +
  `<clipPath id="clip-gas-C"><path id="clipgas-C" d=""/></clipPath>` +
  `</defs>`;

const crankAAc = VA.p([0, 0]);
const hit = `<circle class="hit" data-drag="crank" cx="${crankAAc[0]}" cy="${crankAAc[1]}" r="${K.r2(70 * VA.k)}"/>`;

const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of a flat-four air-cooled aircraft engine cut in plan through all four cylinders, with a section through cylinder 1 and its valve train. Drag the crank in section A-A or use the arrow keys to turn it; the opposed pistons, rods, cam, tappet, pushrod, rocker and valve move, the four cylinders fire in the order 1-3-2-4, and the torque diagram traces the crank torque." ` +
  `data-views='${JSON.stringify(VIEWS)}' data-live='${JSON.stringify(LIVE_BALLOONS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  mainView +
  mainDims +
  mainBalloons +
  mainMarks +
  aaView +
  aaBalloons +
  aaMarks +
  detailC +
  detailD +
  detailE +
  torqueChart() +
  powerChart() +
  notes +
  bom +
  title +
  hit +
  `</svg>`;

const bar =
  `<span>Drag the crank in A-A · <kbd>←</kbd> <kbd>→</kbd> turn · <kbd>Space</kbd> run · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;

const size = writePage(join(here, "aero-engine.html"), {
  title: "Flat-Four Aero Engine",
  description: "A live engineering drawing of a light aircraft's flat-four air-cooled engine: a plan section through all four cylinders and a section through one cylinder's valve train, firing 1-3-2-4 from a computed cycle.",
  svg,
  bar,
  css:
    `.bp-sheet .hit{fill:transparent}.bp-sheet .tint{fill:url(#gas-c)}.bp-sheet .tint.burn{fill:url(#gas-b)}` +
    `.bp-sheet .gas-dot{fill:var(--bp-accent)}.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet [data-drag]{cursor:grab}` +
    `.bp-sheet .oil{fill:url(#oil)}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8")
    .replace("__TC__", JSON.stringify(TC))
    .replace("__PA0__", String(PA0))
    .replace("__C__", JSON.stringify(C)),
});
console.log(`aero-engine.html  ${(size / 1024).toFixed(0)} KB  CR ${M.CR.toFixed(2)}  peak ${CYC.peak.toFixed(1)} bar at ${CYC.peakAt}°  IMEP ${CYC.imep.toFixed(2)}  BMEP ${CYC.bmep.toFixed(2)} bar  ${CYC.torque.toFixed(0)} N·m  ${CYC.power.toFixed(1)} kW`);
console.log("timing", Object.entries(T).map(([k, v]) => `${k} ${v.toFixed(1)}`).join("  "), " power", PC.map((c) => `${c.rpm}:${c.power.toFixed(0)}`).join(" "));
