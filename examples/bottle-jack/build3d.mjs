// Builds bottle-jack-3d.html: the bottle jack of BP-005 as a live 3D technical illustration, from the
// 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/bottle-jack/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "bottle-jack-3d.html"), {
  title: "Bottle Jack 3D",
  description: "The BP-005 2-tonne bottle jack as a live isometric half-section through the ram and the pump: hatched cut faces, the drillings in the base, the check balls and release needle, oil under pressure in the accent, and the pump and ram driven by the 2D sheet's Pascal's-principle model.",
  heading: "BOTTLE JACK · BP-005 · 3D",
  titleText: "BOTTLE JACK · ISOMETRIC HALF-SECTION",
  dwg: "BP-005-3D",
  parts: parts.length,
  units: "mm · bar · kg",
  sheet2d: "bottle-jack.html",
  buttons: `<button type="button" id="pump" aria-pressed="false">PUMP</button><button type="button" id="release" aria-pressed="false">RELEASE</button>`,
  hint: "DRAG TO ORBIT · DRAG THE HANDLE OR SPACE TO PUMP · O RELEASE · L LOAD · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-005 · DRAG THE HANDLE · SPACE PUMPS · O RELEASES",
  aria: "Isometric half-section of a two-tonne hydraulic bottle jack, cut through the ram and the pump plunger. Drag to orbit, drag the handle or press Space to pump, O to open the release valve; the plunger, check balls, ram and oil pressure follow the same model as the 2D sheet.",
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
console.log(`bottle-jack-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
