// Builds floor-pump-3d.html: the floor pump of BP-001 as a live 3D technical illustration, from the
// 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/floor-pump/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "floor-pump-3d.html"), {
  title: "Floor Pump 3D",
  description: "The BP-001 floor pump as a live isometric half-section: hatched cut faces, an exploded view with balloons, and the piston, cup seal and check ball driven by the 2D sheet's Boyle's-law model.",
  heading: "FLOOR PUMP · BP-001 · 3D",
  titleText: "FLOOR PUMP · ISOMETRIC HALF-SECTION",
  dwg: "BP-001-3D",
  parts: parts.length,
  units: "mm · bar",
  sheet2d: "floor-pump.html",
  buttons: `<button type="button" id="pump" aria-pressed="false">PUMP</button>`,
  hint: "DRAG TO ORBIT · DRAG THE HANDLE OR SPACE TO PUMP · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS · R LET DOWN",
  live: "LIVE · SAME MODEL AS BP-001 · DRAG THE HANDLE · SPACE PUMPS",
  aria: "Isometric half-section of a bicycle floor pump. Drag to orbit, drag the handle or press Space to pump; the piston, cup seal, check ball and gauge follow the same Boyle's-law model as the 2D sheet.",
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
console.log(`floor-pump-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
