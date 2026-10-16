// Builds gear-pump-3d.html: the external gear pump of BP-016 as a live 3D technical illustration,
// from the 2D sheet's own model (model.mjs, unchanged) and profiles (parts.mjs), with kit/solid3d.mjs.
//   node examples/gear-pump/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "gear-pump-3d.html"), {
  title: "Gear Pump 3D",
  description: "The BP-016 external gear pump as a live isometric section across its shafts: the involute gears turning, the oil carried round in the tooth spaces and squeezed out at the mesh, an exploded view along the shafts, from the 2D sheet's model.",
  heading: "GEAR PUMP · BP-016 · 3D",
  titleText: "EXTERNAL GEAR PUMP 8 cm³ · ISOMETRIC SECTION A-A",
  dwg: "BP-016-3D",
  parts: parts.length,
  units: "mm · bar · L/min",
  sheet2d: "gear-pump.html",
  buttons: `<button type="button" id="pause" aria-pressed="false">PAUSE</button>`,
  hint: "DRAG TO ORBIT · DRAG A GEAR TO TURN IT · ↑↓ PRESSURE · ←→ SPEED · SPACE PAUSE · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-016 · DRAG A GEAR · ↑↓ PRESSURE",
  aria: "Isometric section of an external gear pump across its shafts. The two involute gears turn and carry oil from the inlet below round the outside of the bore to the outlet above; the oil darkens as each tooth space is pressurised. Drag a gear to turn it, arrows change pressure and speed.",
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
console.log(`gear-pump-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
