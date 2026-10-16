// Builds thermostat-3d.html: the wax-pellet thermostat of BP-010 as a live 3D technical illustration,
// from the 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/thermostat/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "thermostat-3d.html"), {
  title: "Wax Thermostat 3D",
  description: "The BP-010 wax-pellet coolant thermostat as a live isometric half-section in its housing: hatched cut faces, an exploded view with balloons, and the pellet, valve, bypass disc and springs driven by the 2D sheet's wax-and-engine model.",
  heading: "WAX THERMOSTAT · BP-010 · 3D",
  titleText: "WAX THERMOSTAT · HALF-SECTION",
  dwg: "BP-010-3D",
  parts: parts.length,
  units: "mm · °C · kW",
  sheet2d: "thermostat.html",
  buttons: `<button type="button" id="hill" aria-pressed="false">HILL</button><button type="button" id="cold">COLD START</button>`,
  hint: "DRAG TO ORBIT · DRAG THE VALVE TO LOAD THE ENGINE · ↑ ↓ LOAD · H HILL · R COLD START · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-010 · DRAG THE VALVE · H HILL",
  aria: "Isometric half-section of a wax-pellet coolant thermostat in its housing. Drag to orbit, drag the valve or use the arrow keys to change the engine load; the wax melts, the valve opens to the radiator and the bypass disc shuts, from the same model as the 2D sheet.",
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
console.log(`thermostat-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
