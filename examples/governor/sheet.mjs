// The sheet's plan and its live pieces: view origins, the moving group, live dimensions, balloons
// that ride with their parts, and both diagrams. Pure; runs in the build and, inlined, in the page.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const k1 = K.PX_PER_MM; // 1:1

// Detail windows on the sheet, and the world points they show.
export const BOX = {
  B: { cx: 630, cy: 628, r: 124, at: [M.UV, 2] },
  C: { x: 522, y: 268, w: 218, h: 180, u0: -9, v1: 261 },
};
export const VIEWS = {
  main: { x: 180, y: 540, scale: 1 / 2.5 },
  B: { x: K.r2(BOX.B.cx - BOX.B.at[0] * k1), y: K.r2(BOX.B.cy + BOX.B.at[1] * k1), scale: 1 },
  C: { x: K.r2(BOX.C.x - BOX.C.u0 * k1), y: K.r2(BOX.C.y + BOX.C.v1 * k1), scale: 1 },
  D: { x: 878, y: 121, scale: 1 / 5 },
};
// The detail circles in the main view, in world mm.
export const MARK = {
  B: { c: BOX.B.at, r: BOX.B.r / k1 },
  C: { c: [BOX.C.u0 + BOX.C.w / k1 / 2, BOX.C.v1 - BOX.C.h / k1 / 2], r: Math.hypot(BOX.C.w, BOX.C.h) / k1 / 2 },
};
export const LABEL_D = { x: 1078, y: 104 };

// Everything that moves with the arm angle, in drawing order.
export function moving(V, Q) {
  return (
    P.valve(V, Q) +
    P.stemNut(V, Q) +
    P.stem(V, Q) +
    P.links(V, Q) +
    P.sleeve(V, Q) +
    P.arms(V, Q) +
    P.balls(V, Q) +
    P.ballPins(V, Q) +
    P.valveLink(V, Q) +
    P.collar(V, Q) +
    P.collarPin(V, Q) +
    P.bellCrank(V, Q) +
    P.crankPins(V, Q)
  );
}

// ---------------------------------------------------------------- live dimensions (main view)
const H_AT = 236; // u of the h dimension line
const X_AT = -96; // u of the sleeve-lift dimension line

export function dimH(V, Q) {
  const a = [M.OFFSET + 11, M.VT];
  const b = [Q.ball[0], Q.ball[1]];
  return K.dim(V, a, b, { dir: "v", off: V.p([H_AT, 0])[0] - V.p(a)[0], text: `h=${Math.round(M.heightH(Q.a))}`, id: "dim-h" });
}

export function dimX(V, Q) {
  const ref = [-22, P.STOP_LO + 14];
  const now = [-M.SLEEVE.neckR, Q.lug + M.SLEEVE.bot];
  return K.dim(V, ref, now, { dir: "v", off: V.p([X_AT, 0])[0] - V.p(ref)[0], text: `x=${Math.round(now[1] - ref[1])}`, id: "dim-x" });
}

// ---------------------------------------------------------------- balloons
// Static parts: circles in the free columns beside the view.
export function balloonsMain(V) {
  const b = (at, xy, n) => K.balloon(V, at, xy, n, { target: n });
  const u = M.UV;
  return (
    b([-88, 60], [52, 370], 1) +
    b([-60, 22], [52, 405], 3) +
    b([-147, 13], [52, 440], 7) +
    b([-150, -57], [40, 612], 6) +
    b([18, P.STOP_LO + 7], [278, 420], 9) +
    b([6, 125], [278, 446], 8) +
    b([30, 66], [278, 472], 4) +
    b([40, -6], [278, 498], 2) +
    b([63, 14.25], [278, 524], 5) +
    b([-29, 556], [128, 99], 10) +
    b([-12, 575], [128, 73], 11) +
    b([u + P.POST.r0 + 9, 120], [464, 412], 24) +
    b([u + 30, 82], [464, 470], 25) +
    b([u + 66, 56], [464, 496], 27) +
    b([u + 92, -60], [464, 590], 23)
  );
}

// Moving parts: the circles stay put outside every sweep; the dots ride on the parts.
export function balloonsMainMoving(V, Q) {
  const [br, bv] = Q.ball;
  const along = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
  const b = (at, xy, n) => K.balloon(V, at, xy, n, { target: n });
  const ballDot = [br + 14, bv + 14];
  const armDot = along([M.OFFSET, M.VT], [br, bv], 0.45);
  const linkDot = along([-br, bv], [-M.OFFSET, Q.lug], 0.4);
  const sleeveDot = [-48, Q.lug - 40];
  const fu = M.F[0];
  const fv = M.F[1];
  const crankDot = [fu - 40 * Math.cos(Q.psi), fv - 40 * Math.sin(Q.psi)];
  const linkV = along(Q.E, Q.G, 0.5);
  return (
    b(ballDot, [330, 132], 13) +
    b(armDot, [300, 92], 12) +
    b(linkDot, [52, 300], 14) +
    b(sleeveDot, [52, 340], 16) +
    b(crankDot, [372, 300], 18) +
    b(linkV, [464, 380], 19)
  );
}

export function balloonsB(V) {
  const b = (at, xy, n) => K.balloon(V, at, xy, n, { target: n });
  const u = M.UV;
  return (
    b([u - 29, 15], [490, 560], 22) +
    b([u - 47, -10], [490, 610], 23) +
    b([u + 11, 59], [770, 520], 26) +
    b([u + 4, 30], [770, 600], 20) +
    b([u + 11, -10], [770, 640], 21) +
    b([u + 9, -44], [770, 680], 28)
  );
}

export function balloonsC(V, Q) {
  const b = (at, xy, n) => K.balloon(V, at, xy, n, { target: n });
  return b([Q.C[0] + 2.5, Q.C[1] + 2.5], [757, 300], 15) + b([30, Q.lug + M.SLEEVE.grooveLo + 3], [507, 400], 17);
}

export const balloonsD = () => "";

// ---------------------------------------------------------------- DIAGRAM 1: the governor's characteristic
export const CH1 = { x0: 538, x1: 762, y0: 52, y1: 178, n0: 106, n1: 126, x0mm: 0, x1mm: 50 };
export const c1x = (n) => K.r2(CH1.x0 + ((n - CH1.n0) / (CH1.n1 - CH1.n0)) * (CH1.x1 - CH1.x0));
export const c1y = (x) => K.r2(CH1.y1 - (Math.min(CH1.x1mm, Math.max(0, x)) / CH1.x1mm) * (CH1.y1 - CH1.y0));

export function governorCurve() {
  const pts = [[CH1.n0, 0]];
  for (let i = 0; i <= 40; i++) {
    const a = M.ALPHA_MIN + ((M.ALPHA_MAX - M.ALPHA_MIN) * i) / 40;
    pts.push([M.spindleRpm(a) / M.RATIO, M.sleeveLift(a)]);
  }
  pts.push([CH1.n1, M.LIFT_MAX]);
  return pts.filter(([n]) => n <= CH1.n1 + 1e-9).map(([n, x]) => `${c1x(Math.min(n, CH1.n1))},${c1y(x)}`).join(" ");
}

export function engineLine(load) {
  const pts = [];
  for (let n = CH1.n0; n <= CH1.n1 + 1e-9; n += 0.5) pts.push(`${c1x(n)},${c1y(M.liftNeeded(load, M.toRad(n)))}`);
  return pts.join(" ");
}

export function chart1() {
  let grid = "";
  let labels = "";
  for (let x = 0; x <= CH1.x1mm; x += 10) {
    grid += `M${CH1.x0} ${c1y(x)}H${CH1.x1}`;
    labels += `<text class="t t-sm" x="${CH1.x0 - 10}" y="${K.r2(c1y(x) + 2.7)}" text-anchor="end">${x}</text>`;
  }
  for (let n = CH1.n0; n <= CH1.n1; n += 4) {
    grid += `M${c1x(n)} ${CH1.y0}V${CH1.y1}`;
    labels += `<text class="t t-sm" x="${c1x(n)}" y="${CH1.y1 + 11}" text-anchor="middle">${n}</text>`;
  }
  const midY = (CH1.y0 + CH1.y1) / 2;
  labels += `<text class="t t-sm t-mute" x="${(CH1.x0 + CH1.x1) / 2}" y="${CH1.y1 + 24}" text-anchor="middle">ENGINE SPEED n, rpm</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH1.x0 - 31}" y="${midY}" text-anchor="middle" transform="rotate(-90 ${CH1.x0 - 31} ${midY})">SLEEVE LIFT x, mm</text>`;
  const sL = M.steady(M.LOAD_LIGHT);
  const sH = M.steady(M.LOAD_HEAVY);
  const tag = (s, txt, dy) => {
    const n = M.toRpm(s.omega);
    return `<text class="t t-sm t-mute" x="${K.r2(c1x(CH1.n0) + 4)}" y="${K.r2(c1y(M.sleeveLift(s.alpha)) + dy)}">${txt}</text>`;
  };
  return (
    `<g data-role="chart"><rect class="paper" x="${CH1.x0}" y="${CH1.y0}" width="${CH1.x1 - CH1.x0}" height="${CH1.y1 - CH1.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline class="hid" points="${engineLine(M.LOAD_LIGHT)}"/>` +
    `<polyline class="hid" points="${engineLine(M.LOAD_HEAVY)}"/>` +
    `<polyline id="c1-load" class="thin" points="${engineLine(M.LOAD_LIGHT)}"/>` +
    `<polyline class="vis" points="${governorCurve()}"/>` +
    `<polyline id="c1-trail" class="thin accent" points=""/>` +
    `<circle id="c1-dot" class="accent-fill" cx="${c1x(M.toRpm(sL.omega))}" cy="${c1y(M.sleeveLift(sL.alpha))}" r="2.8"/>` +
    tag(sL, `${M.LOAD_LIGHT} N·m`, -3) +
    tag(sH, `${M.LOAD_HEAVY} N·m`, 9) +
    `<rect class="vis" x="${CH1.x0}" y="${CH1.y0}" width="${CH1.x1 - CH1.x0}" height="${CH1.y1 - CH1.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH1.x0 + CH1.x1) / 2, CH1.y1 + 46, "DIAGRAM 1", "SOLID: GOVERNOR · DASHED: ENGINE AT LOAD · ACCENT: NOW")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: the last 16 s
export const CH2 = { x0: 80, x1: 438, y0: 656, y1: 746, span: 16, n0: 106, n1: 126, l1: 2000 };
export const c2x = (age) => K.r2(CH2.x1 - (age / CH2.span) * (CH2.x1 - CH2.x0));
export const c2n = (n) => K.r2(CH2.y1 - ((Math.min(CH2.n1, Math.max(CH2.n0, n)) - CH2.n0) / (CH2.n1 - CH2.n0)) * (CH2.y1 - CH2.y0));
export const c2f = (f) => K.r2(CH2.y1 - Math.min(1, Math.max(0, f)) * (CH2.y1 - CH2.y0));

export function chart2() {
  let grid = "";
  let labels = "";
  for (let i = 0; i <= 5; i++) {
    const y = K.r2(CH2.y1 - (i / 5) * (CH2.y1 - CH2.y0));
    grid += `M${CH2.x0} ${y}H${CH2.x1}`;
    labels += `<text class="t t-sm" x="${CH2.x0 - 11}" y="${K.r2(y + 2.7)}" text-anchor="end">${CH2.n0 + (i * (CH2.n1 - CH2.n0)) / 5}</text>`;
    labels += `<text class="t t-sm" x="${CH2.x1 + 11}" y="${K.r2(y + 2.7)}">${i * 20}</text>`;
  }
  for (let age = 0; age <= CH2.span; age += 4) {
    grid += `M${c2x(age)} ${CH2.y0}V${CH2.y1}`;
    labels += `<text class="t t-sm" x="${c2x(age)}" y="${CH2.y1 + 11}" text-anchor="middle">${age ? -age : "NOW"}</text>`;
  }
  const midY = (CH2.y0 + CH2.y1) / 2;
  labels += `<text class="t t-sm t-mute" x="${(CH2.x0 + CH2.x1) / 2}" y="${CH2.y1 + 24}" text-anchor="middle">TIME, s</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH2.x0 - 36}" y="${midY}" text-anchor="middle" transform="rotate(-90 ${CH2.x0 - 36} ${midY})">ENGINE n, rpm</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH2.x1 + 34}" y="${midY}" text-anchor="middle" transform="rotate(90 ${CH2.x1 + 34} ${midY})">VALVE f, %</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH2.x0}" y="${CH2.y0}" width="${CH2.x1 - CH2.x0}" height="${CH2.y1 - CH2.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline id="c2-load" class="hid" points=""/>` +
    `<polyline id="c2-f" class="thin" points=""/>` +
    `<polyline id="c2-n" class="vis accent" points=""/>` +
    `<rect class="vis" x="${CH2.x0}" y="${CH2.y0}" width="${CH2.x1 - CH2.x0}" height="${CH2.y1 - CH2.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH2.x0 + CH2.x1) / 2, CH2.y1 + 46, "DIAGRAM 2", "ACCENT: ENGINE SPEED · THIN: VALVE OPENING · DASHED: LOAD, 100 = 2000 N·m")
  );
}
