// A vertical live dimension whose text never lands below the span: with a short span the arrows go
// outside pointing in and the text sits above the upper end (the kit's dim puts it below, which here
// would be on the valve disc). Same line weights, arrowheads and lettering as the kit.
import * as K from "../../kit/draft.mjs";

function head([x, y], dy) {
  const s = Math.sign(dy);
  const by = y - s * K.ARROW;
  const half = K.ARROW * 0.25;
  return `M${K.r2(x)} ${K.r2(y)}L${K.r2(x - half)} ${K.r2(by)}L${K.r2(x + half)} ${K.r2(by)}Z`;
}

// a: the moving point, b: the fixed one; the dimension line sits at a's u (off = 0) and b's extension
// line runs across to it. text reads from the right, left of the line.
export function liftDim(V, a, b, { text, id = "" }) {
  const [ax, ay] = V.p(a);
  const [bx, by] = V.p(b);
  const x = ax;
  const top = Math.min(ay, by);
  const bot = Math.max(ay, by);
  const span = bot - top;
  const sgn = Math.sign(x - bx) || 1;
  let d = `M${K.r2(bx + sgn * K.GAP)} ${K.r2(by)}L${K.r2(x + sgn * K.OVER)} ${K.r2(by)}`;
  let heads;
  const tw = K.textWidth(text);
  let ty;
  if (span >= K.ARROW * 2 + 3) {
    d += `M${K.r2(x)} ${K.r2(top)}L${K.r2(x)} ${K.r2(bot)}`;
    heads = head([x, top], -1) + head([x, bot], 1);
    ty = span >= tw + K.ARROW * 2 + 6 ? (top + bot) / 2 : top - K.ARROW - 6 - tw / 2;
  } else {
    d += `M${K.r2(x)} ${K.r2(top - K.ARROW - 4 - tw - 4)}L${K.r2(x)} ${K.r2(bot + K.ARROW + 5)}`;
    heads = head([x, top], 1) + head([x, bot], -1);
    ty = top - K.ARROW - 6 - tw / 2;
  }
  const tx = x - 3;
  return (
    `<g data-role="dim"${id ? ` id="${id}"` : ""}><path class="thin" d="${d}"/><path class="head" d="${heads}"/>` +
    `<text class="t" x="${K.r2(tx)}" y="${K.r2(ty)}" text-anchor="middle" transform="rotate(-90 ${K.r2(tx)} ${K.r2(ty)})">${text}</text></g>`
  );
}
