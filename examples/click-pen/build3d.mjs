// Builds click-pen-3d.html: the click pen of BP-014 as a live 3D technical illustration, from the
// 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/click-pen/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "click-pen-3d.html"), {
  title: "Click Pen 3D",
  description: "The BP-014 click pen as a live isometric half-section: the push-push cam inside the cut barrel, the rotator turning 30° on each press and 30° more on each release into a long or a short slot, driven by the 2D sheet's own state machine.",
  heading: "CLICK PEN · BP-014 · 3D",
  titleText: "CLICK PEN · ISOMETRIC HALF-SECTION",
  dwg: "BP-014-3D",
  parts: parts.length,
  units: "mm · N · deg",
  sheet2d: "click-pen.html",
  buttons: `<button type="button" id="click" aria-pressed="false">CLICK</button>`,
  hint: "DRAG TO ORBIT · DRAG THE BUTTON IN OR SPACE TO CLICK · ← → PRESS AND RELEASE · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-014 · DRAG THE BUTTON · SPACE CLICKS",
  aria: "Isometric half-section of a retractable ballpoint pen. Drag to orbit; drag the button in or press Space to click. The rotator, not cut, turns 30 degrees on each press and 30 more on each release, into a long slot (retracted) or a short slot (extended), from the same state machine as the 2D sheet.",
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
console.log(`click-pen-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
