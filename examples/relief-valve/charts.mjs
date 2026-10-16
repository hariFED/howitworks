// The three diagrams' frames and curves. Pure: the build draws them, the page redraws the
// curves that depend on the set pressure and the live traces.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

// Diagram 1: lift against vessel pressure (the hysteresis loop)
export const D1 = { x0: 846, x1: 1150, y0: 46, y1: 176, p0: 8.5, p1: 10.75, h1: 6.5 };
// Diagram 2: vessel pressure against time (the last 30 s)
export const D2 = { x0: 82, x1: 392, y0: 612, y1: 712, p0: 8.5, p1: 10.5, span: 30 };
// Diagram 3: discharge against lift, at the present pressure
export const D3 = { x0: 666, x1: 762, y0: 478, y1: 690, h1: 6.5, q1: 3600 };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const x1 = (p) => K.r2(D1.x0 + ((clamp(p, D1.p0, D1.p1) - D1.p0) / (D1.p1 - D1.p0)) * (D1.x1 - D1.x0));
export const y1 = (h) => K.r2(D1.y1 - (clamp(h, 0, D1.h1) / D1.h1) * (D1.y1 - D1.y0));
export const x2 = (age) => K.r2(D2.x1 - (clamp(age, 0, D2.span) / D2.span) * (D2.x1 - D2.x0));
export const y2 = (p) => K.r2(D2.y1 - ((clamp(p, D2.p0, D2.p1) - D2.p0) / (D2.p1 - D2.p0)) * (D2.y1 - D2.y0));
export const x3 = (h) => K.r2(D3.x0 + (clamp(h, 0, D3.h1) / D3.h1) * (D3.x1 - D3.x0));
export const y3 = (q) => K.r2(D3.y1 - (clamp(q, 0, D3.q1) / D3.q1) * (D3.y1 - D3.y0));

// The static equilibrium p_eq(h) split into its stable and unstable parts.
export function loopPaths(F0) {
  const ch = M.characteristic(F0);
  let hPop = 0;
  for (let h = 0; h <= M.H_B; h += 0.005) if (M.pEq(F0, h) >= ch.set - 1e-9) hPop = h;
  const pts = (a, b) => {
    const out = [];
    for (let h = a; h <= b + 1e-9; h += 0.02) out.push(`${x1(M.pEq(F0, h))},${y1(h)}`);
    return out.join(" ");
  };
  const stable =
    `M${x1(D1.p0)} ${y1(0)}H${x1(ch.start)}` + // seated
    `M${pts(0, hPop).replace(/ /g, "L")}` + // simmer
    `M${pts(ch.hReseat, M.H_MAX).replace(/ /g, "L")}H${x1(D1.p1)}`; // relieving, then on the stop
  const unstable = `M${pts(hPop, ch.hReseat).replace(/ /g, "L")}`;
  const jumps = `M${x1(ch.set)} ${y1(hPop)}V${y1(upperLift(F0, ch.set))}M${x1(ch.reseat)} ${y1(ch.hReseat)}V${y1(0)}`;
  return { stable, unstable, jumps, ch };
}

// The lift on the relieving branch at a pressure.
export function upperLift(F0, p) {
  const ch = M.characteristic(F0);
  for (let h = ch.hReseat; h <= M.H_MAX; h += 0.01) if (M.pEq(F0, h) >= p) return h;
  return M.H_MAX;
}

export function flowPath(p) {
  const out = [];
  for (let h = 0; h <= M.H_MAX + 1e-9; h += 0.1) out.push(`${x3(h)},${y3(M.massFlow(p, h) * 3600)}`);
  return out.join(" ");
}

// The set and reseat pressures and the blowdown between them.
export function d1Marks(c) {
  const xs = x1(c.set);
  const xr = x1(c.reseat);
  const y = D1.y0 + 15;
  const head = (x, dir) => `M${x} ${y}L${K.r2(x - dir * 7)} ${K.r2(y - 1.75)}L${K.r2(x - dir * 7)} ${K.r2(y + 1.75)}Z`;
  return (
    `<path class="thin" d="M${xr} ${y}H${xs}M${xr} ${D1.y0}V${y + 4}M${xs} ${D1.y0}V${y + 4}"/><path class="head" d="${head(xr, -1)}${head(xs, 1)}"/>` +
    `<text class="t t-sm" x="${K.r2((xr + xs) / 2)}" y="${y - 3}" text-anchor="middle">BLOWDOWN ${(c.blowdown * 100).toFixed(0)} %</text>` +
    `<text class="t t-sm" x="${xr - 4}" y="${D1.y1 - 4}" text-anchor="end">RESEAT ${c.reseat.toFixed(2)}</text>` +
    `<text class="t t-sm" x="${xs + 4}" y="${D1.y1 - 4}" text-anchor="start">SET ${c.set.toFixed(2)}</text>`
  );
}
