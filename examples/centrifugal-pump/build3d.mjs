// Builds centrifugal-pump-3d.html: the BP-015 pump as a live 3D technical illustration, from the
// 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/centrifugal-pump/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "centrifugal-pump-3d.html"), {
  title: "Centrifugal Pump 3D",
  description: "The BP-015 end-suction pump as a live isometric half-section through the shaft: the spiral volute and the closed impeller's backward-curved vanes seen from the suction side, the water thickening from the eye to the discharge, the rotor turning at the 2D sheet's model speed, and an exploded view along the shaft.",
  heading: "CENTRIFUGAL PUMP · BP-015 · 3D",
  titleText: "CENTRIFUGAL PUMP 50-32-160 · HALF-SECTION",
  dwg: "BP-015-3D",
  parts: parts.length,
  units: "mm · m³/h · m · kW",
  sheet2d: "centrifugal-pump.html",
  buttons: `<button type="button" id="eye">EYE</button><button type="button" id="run" aria-pressed="false">RUN</button>`,
  hint: "DRAG TO ORBIT · DRAG THE IMPELLER OR ↑↓ SPEED · ←→ VALVE · SPACE TOUR · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS · 5 EYE",
  live: "LIVE · SAME MODEL AS BP-015 · DRAG THE IMPELLER · ↑↓ SPEED · ←→ VALVE",
  aria: "Isometric half-section of an end-suction centrifugal pump, seen from the suction side into the cut volute. Drag to orbit, drag the impeller or press the arrow keys to change speed and valve lift; the rotor and the water's density follow the same model as the 2D sheet.",
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
console.log(`centrifugal-pump-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
