// Helpers the kit lacks, for this sheet: a cutting-plane line, and balloons whose dots ride on
// parts that rotate or slide while their circles stay put outside every sweep.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

// ISO 128 cutting plane: thin chain across, thick at the ends, arrows showing the viewing
// direction (here down: the plan is seen from above) and the letter at each end.
export function cuttingPlane(V, v, u0, u1, letter) {
  const [x0, y] = V.p([u0, v]);
  const [x1] = V.p([u1, v]);
  const end = 12;
  const arrow = (x) => {
    const tip = y + 15;
    return `M${x} ${y}V${tip - K.ARROW}` + "";
  };
  const heads = (x) => {
    const tip = y + 15;
    const half = K.ARROW * 0.25;
    return `M${x} ${tip}L${K.r2(x - half)} ${K.r2(tip - K.ARROW)}L${K.r2(x + half)} ${K.r2(tip - K.ARROW)}Z`;
  };
  return (
    `<g data-role="label">` +
    `<path class="ctr" d="M${x0 + end} ${y}H${x1 - end}"/>` +
    `<path class="vis" d="M${x0} ${y}H${x0 + end}M${x1 - end} ${y}H${x1}"/>` +
    `<path class="thin" d="${arrow(x0 + 3)}${arrow(x1 - 3)}"/>` +
    `<path class="head" d="${heads(x0 + 3)}${heads(x1 - 3)}"/>` +
    `<text class="t t-lg" x="${K.r2(x0 + 5)}" y="${K.r2(y - 5)}" text-anchor="middle">${letter}</text>` +
    `<text class="t t-lg" x="${K.r2(x1 + 7)}" y="${K.r2(y - 4)}" text-anchor="middle">${letter}</text>` +
    `</g>`
  );
}

// Balloons on the socket, handle, pins, link, U-cup and plunger. The circles never move; the
// dots follow their parts for a pose x (plunger stroke) and a ram lift h.
export function liveBalloons({ VM, VB }, x, h) {
  const { F } = M.socketPose(x);
  const [bu, bv] = M.LINK_B;
  const t = 13 / M.LINK_L;
  const onLink = [bu + (F[0] - bu) * t, bv + (F[1] - bv) * t];
  const sv = P.P0[1];
  return (
    K.balloon(VM, P.onSocket(x, [P.HANDLE_END - 3, sv + 10]), [452, 410], 18, { target: 18 }) +
    K.balloon(VM, P.onSocket(x, [104, sv + 12]), [424, 410], 17, { target: 17 }) +
    K.balloon(VM, P.onSocket(x, P.F0), [342, 452], 19, { target: 19 }) +
    K.balloon(VM, onLink, [262, 452], 16, { target: 16 }) +
    K.balloon(VM, [-14.3, M.RAM_LOW + 9 + h], [52, 640], 6, { target: 6 }) +
    K.balloon(VB, [M.PUMP_U - 3, M.plungerV(x) + 10], [600, 424], 14, { target: 14 })
  );
}
