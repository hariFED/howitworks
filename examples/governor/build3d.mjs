// Builds governor-3d.html: the Porter governor of BP-003 as a live 3D technical illustration, from the
// 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/governor/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "governor-3d.html"), {
  title: "Porter Governor 3D",
  description: "The BP-003 Porter governor as a live isometric half-section: the bevel drive in its cut gear case, the flyballs swinging out on their arms as the spindle turns, the weighted sleeve lifting, and the bell crank closing the double-beat throttle valve, all from the 2D sheet's closed-loop model.",
  heading: "PORTER GOVERNOR · BP-003 · 3D",
  titleText: "PORTER GOVERNOR · ISOMETRIC HALF-SECTION",
  dwg: "BP-003-3D",
  parts: parts.length,
  units: "mm · rpm · N·m",
  sheet2d: "governor.html",
  buttons: `<button type="button" id="step" aria-pressed="false">HEAVY LOAD</button>`,
  hint: "DRAG TO ORBIT · DRAG THE BALLS OR SLEEVE UP FOR LOAD · ↑↓ LOAD · SPACE STEPS IT · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS · SPINDLE SHOWN AT 1/20 SPEED",
  live: "LIVE · SAME MODEL AS BP-003 · DRAG THE BALLS · SPACE STEPS THE LOAD",
  aria: "Isometric half-section of a Porter flyball governor driving a double-beat throttle valve. The spindle and balls turn; drag the balls or sleeve up, or use the arrow keys, to load the engine: it slows, the balls drop, the sleeve falls and the bell crank opens the valve, as in the 2D sheet's model.",
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
console.log(`governor-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
