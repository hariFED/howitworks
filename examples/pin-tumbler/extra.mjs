// Sheet helpers this drawing needs beyond the kit: the moving balloons, the cutting-plane ends,
// the live insertion dimension, the torque arrow and the gap chart. Pure, like the kit.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

// The key withdrawn (tip at the face), in phantom: the other end of its travel.
export function phantomKey(V) {
  const shift = M.BLADE_LEN;
  const top = [];
  const bot = [];
  for (let w = P.KEY_BREAK; w <= M.BLADE_LEN + 1e-9; w += 0.1) {
    const ww = Math.min(w, M.BLADE_LEN);
    top.push([ww - shift, M.keyTop(M.RIGHT, ww)]);
    bot.push([ww - shift, ww < 0 ? M.SHANK.bot : Math.max(M.BLADE_BOT, M.BLADE_BOT + (ww - (M.BLADE_LEN - 1)))]);
  }
  top.splice(1, 0, [-shift, M.SHANK.top]);
  return K.line(V, [...top, ...bot.reverse()], "phan", true);
}

// Live dimension: from the key's shoulder to the plug face, the travel still to go.
export const DIM_Y = 420;
export function insertDim(V, e) {
  const sh = -(M.BLADE_LEN - e);
  const a = [sh, M.SHANK.bot];
  return K.dim(V, a, [0, -M.BODY_R], { dir: "h", off: DIM_Y - V.p(a)[1], text: (M.BLADE_LEN - e).toFixed(1), id: "dim-in" });
}

// The ends of a cutting plane (ISO 128-40): thick ends, arrows in the viewing direction, letters.
export function planeEnds(V, at, top, bot, [dx], letter, beside = false) {
  let out = "";
  const ends = [
    [top, -1],
    [bot, 1],
  ];
  for (const [[zOut, zIn], side] of ends) {
    const [x, y0] = V.p([at, zOut]);
    const [, y1] = V.p([at, zIn]);
    const tip = K.r2(x + dx * 17);
    out += `<path class="vis" d="M${x} ${y0}L${x} ${y1}"/>`;
    out += `<path class="thin" d="M${x} ${y0}L${K.r2(tip - dx * 6)} ${y0}"/>`;
    const h = 1.8;
    out += `<path class="head" d="M${tip} ${y0}L${K.r2(tip - dx * 7)} ${K.r2(y0 - h)}L${K.r2(tip - dx * 7)} ${K.r2(y0 + h)}Z"/>`;
    const ly = beside ? y0 + 4 : side < 0 ? y0 - 6 : y0 + 13;
    const lx = beside ? x + dx * 25 : x + dx * 9;
    out += `<text class="t t-lg" x="${K.r2(lx)}" y="${K.r2(ly)}" text-anchor="middle">${letter}</text>`;
  }
  return `<g data-role="label">${out}</g>`;
}

// A curved arrow round VIEW B: the torque on the key.
export function torqueArrow(cx, cy, r) {
  const a0 = (-125 * Math.PI) / 180;
  const a1 = (-62 * Math.PI) / 180;
  const p = (a) => [K.r2(cx + r * Math.cos(a)), K.r2(cy + r * Math.sin(a))];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const tx = -Math.sin(a1);
  const ty = Math.cos(a1);
  const nx = Math.cos(a1);
  const ny = Math.sin(a1);
  const L = 7;
  const head = `M${x1} ${y1}L${K.r2(x1 - tx * L + nx * 1.8)} ${K.r2(y1 - ty * L + ny * 1.8)}L${K.r2(x1 - tx * L - nx * 1.8)} ${K.r2(y1 - ty * L - ny * 1.8)}Z`;
  return `<path class="thin" d="M${x0} ${y0}A${r} ${r} 0 0 1 ${K.r2(x1 - tx * 4)} ${K.r2(y1 - ty * 4)}"/><path class="head" d="${head}"/>`;
}

// Balloons that follow their parts: key pins (hidden when the turned plug has carried them out of
// the plane), the spring's lowest wire and the key.
export function movingBalloons(V, st, phi, e, moving, row) {
  let out = "";
  for (const [i, bx] of moving.pins) {
    const dot = P.keyPinDot(st[i], i, phi);
    const b = K.balloon(V, dot ?? [M.pinU(i), 3], [bx, row], P.PIN_ITEM[i], { target: P.PIN_ITEM[i] });
    out += dot ? b : `<g visibility="hidden">${b}</g>`;
  }
  const [si, sx] = moving.spring;
  out += K.balloon(V, P.springDot(st[si], si), [sx, row], 9, { target: 9 });
  const kd = P.keyDot(e);
  const [kx, ky] = V.p(kd);
  out += K.balloon(V, kd, [K.r2(kx - 22), K.r2(ky - 82)], 15, { target: 15 });
  return out;
}

// SECTION C-C: the gap (driver's underside) in the accent, and the two moving balloons.
export function gapAcross(V, s) {
  return `<path class="gap" d="${K.d(V, [[-M.PIN_R, s.top], [M.PIN_R, s.top]], false)}"/>`;
}

export function ccBalloons(V, s, phi) {
  const pin = M.rot([0.35, s.nose + 1.7], phi); // low on the pin, so it stays inside the clip when turned
  return (
    K.balloon(V, [0.5, (s.top + s.dTop) / 2], [706, 560], 8, { target: 8 }) +
    K.balloon(V, pin, [706, 640], P.PIN_ITEM[2], { target: P.PIN_ITEM[2] })
  );
}

// DIAGRAM 1: each key pin's crown against the shear line, one bar per pin.
export const chartY = (CH, off) => K.r2((CH.y0 + CH.y1) / 2 - (Math.max(-CH.lim, Math.min(CH.lim, off)) / CH.lim) * ((CH.y1 - CH.y0) / 2));
export const chartX = (CH, i) => K.r2(CH.x0 + ((i + 0.5) * (CH.x1 - CH.x0)) / M.PINS);
export const BAR_W = 26;

export function barPath(CH, i, off) {
  const x = chartX(CH, i) - BAR_W / 2;
  const y0 = chartY(CH, 0);
  const y1 = chartY(CH, off);
  const h = Math.abs(y1 - y0) < 0.6 ? 0.6 : y1 - y0;
  return `M${K.r2(x)} ${y0}H${K.r2(x + BAR_W)}V${K.r2(y0 + h)}H${K.r2(x)}Z`;
}

export function chart(CH) {
  let grid = "";
  let labels = "";
  for (let g = -CH.lim; g <= CH.lim; g++) {
    grid += `M${CH.x0} ${chartY(CH, g)}H${CH.x1}`;
    labels += `<text class="t t-sm" x="${CH.x0 - 6}" y="${K.r2(chartY(CH, g) + 2.7)}" text-anchor="end">${g > 0 ? "+" + g : g < 0 ? "−" + -g : "0"}</text>`;
  }
  let bars = "";
  for (let i = 0; i < M.PINS; i++) {
    labels += `<text class="t t-sm" x="${chartX(CH, i)}" y="${CH.y1 + 11}" text-anchor="middle">PIN ${i + 1}</text>`;
    labels += `<text class="t t-sm" id="cv-${i}" x="${chartX(CH, i)}" y="${CH.y1 + 22}" text-anchor="middle">0.0</text>`;
    bars += `<path id="bar-${i}" class="bar" d="${barPath(CH, i, 0)}"/>`;
  }
  const ym = (CH.y0 + CH.y1) / 2;
  labels += `<text class="t t-sm t-mute" x="${CH.x0 - 26}" y="${ym}" text-anchor="middle" transform="rotate(-90 ${CH.x0 - 26} ${ym})">CROWN − SHEAR LINE, mm</text>`;
  const tol = `M${CH.x0} ${chartY(CH, M.TOL)}H${CH.x1}M${CH.x0} ${chartY(CH, -M.TOL)}H${CH.x1}`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<path class="hid" d="${tol}"/>` +
    bars +
    `<path class="shear" d="M${CH.x0} ${chartY(CH, 0)}H${CH.x1}"/>` +
    `<rect class="vis" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}"/>` +
    labels +
    `</g>`
  );
}
