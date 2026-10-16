// Builds token-bucket-3d.html: the WC cistern of BP-006 as a live 3D technical illustration, from the
// 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/token-bucket/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const size = writePage3d(join(here, "token-bucket-3d.html"), {
  title: "Cistern Token Bucket 3D",
  description: "The BP-006 WC cistern as a live isometric half-section: the water is the tokens, a fixed Ø3.5 jet refills it at a constant rate, each pull of the knob drains one dose, and the dose float refuses a pull when less than one token is left. Driven by the 2D sheet's model.",
  heading: "CISTERN TOKEN BUCKET · BP-006 · 3D",
  titleText: "WC CISTERN · TOKEN BUCKET · ISOMETRIC HALF-SECTION",
  dwg: "BP-006-3D",
  parts: SC.PARTS,
  units: "mm · L · s",
  sheet2d: "token-bucket.html",
  buttons: `<button type="button" id="pull">PULL</button><button type="button" id="hold" aria-pressed="false">HOLD FLOAT</button>`,
  hint: "DRAG TO ORBIT · PULL THE KNOB OR SPACE = REQUEST · H HOLDS THE FLOAT · R REFILLS · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: `LIVE · SAME MODEL AS BP-006 · CLOCK ${M.SPEED}× · PULL THE KNOB OR SPACE`,
  aria: "Isometric half-section of a WC cistern used as a token bucket rate limiter. Drag to orbit; pull the knob or press Space to send a request. The water level drops one token per accepted pull and refills at a constant rate through the jet; the float valve, the drop valve and the dose float follow the same model as the 2D sheet.",
  css: `#ov .tag-no .t{font-weight:700}#ov .tag-ok .t{fill:var(--bp-accent-ink,var(--bp-ink))}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("solid3d.mjs"), "S"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "scene3d.mjs"), "SC"],
  ],
  main: readFileSync(join(here, "live3d.js"), "utf8"),
});
console.log(`token-bucket-3d.html  ${(size / 1024).toFixed(0)} KB  ${SC.PARTS} parts  (+ three.js from jsDelivr)`);
