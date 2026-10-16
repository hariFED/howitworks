// Builds differential-3d.html: the open differential of BP-012 as a live 3D technical illustration,
// from the 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with
// kit/solid3d.mjs and the meshes in scene3d.mjs.
//   node examples/differential/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "differential-3d.html"), {
  title: "Open Differential 3D",
  description: "The BP-012 rear-axle open differential as a live isometric half-section: the housing and carrier cut, the crown wheel, pinion, spider and side gears meshing, an explosion along the axle, driven by the 2D sheet's own model through straight running, turns and a wheel on ice.",
  heading: "OPEN DIFFERENTIAL · BP-012 · 3D",
  titleText: "OPEN DIFFERENTIAL · ISOMETRIC HALF-SECTION",
  dwg: "BP-012-3D",
  parts: parts.length,
  units: "mm · rpm · N·m",
  sheet2d: "differential.html",
  buttons: `<button type="button" id="ice" aria-pressed="false">ICE</button>`,
  hint: "DRAG TO ORBIT · DRAG THE CROWN WHEEL SIDEWAYS TO STEER · ←→ STEER · ↑↓ SPEED · I RIGHT WHEEL ON ICE · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS · TURNING SHOWN AT 1/8",
  live: "LIVE · SAME MODEL AS BP-012 · DRAG THE CROWN WHEEL TO STEER · I ICE",
  aria: "Isometric half-section of a rear-axle open differential. Drag to orbit, drag the crown wheel sideways or use the arrow keys to steer, I puts the right wheel on ice; the carrier, spider gears, side gears and half-shafts turn from the same model as the 2D sheet.",
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
console.log(`differential-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
