// Builds fuel-system-3d.html: the selector valve and the strainer of BP-105 as a live 3D technical
// illustration, from the 2D sheet's own model (model.mjs, unchanged) and profiles (parts.mjs), with
// kit/solid3d.mjs.
//   node examples/fuel-system/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const items = new Set(SC.parts().map((p) => String(p.id).replace(/[ab]$/, "")));

const size = writePage3d(join(here, "fuel-system-3d.html"), {
  title: "Gravity-Feed Fuel System 3D",
  description: "The BP-105 fuel system's selector valve and strainer as a live isometric half-section: the rotor turns from BOTH to LEFT to RIGHT, the fuel in each port follows the flow the gravity head drives, water drops settle in the strainer's bowl and drain away, from the sheet's own model.",
  heading: "FUEL SYSTEM · BP-105 · 3D",
  titleText: "SELECTOR AND STRAINER · HALF-SECTION",
  dwg: "BP-105-3D",
  parts: items.size,
  units: "mm · L/h · kPa",
  sheet2d: "fuel-system.html",
  buttons: `<button type="button" id="both">BOTH</button><button type="button" id="drain">DRAIN</button>`,
  hint: "DRAG TO ORBIT · DRAG THE HANDLE OR L B R O TO TURN THE SELECTOR · V VENT · D DRAIN · W REFUEL · SPACE TOUR · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-105 · L B R O SELECTOR · D DRAIN",
  aria: "Isometric half-section of a light aircraft's fuel selector valve and fuel strainer, side by side. The selector lies on its back, cut on the plane of its two inlet ports: its brass rotor turns under the handle, and its window uncovers both ports (BOTH), the left or the right one, or neither (OFF). The strainer stands upright, cut through its inlet and outlet: fuel falls round the screen into the bowl and leaves through the screen; water drops settle to the bowl's floor and the drain valve lets them out. The tour runs the sheet's model: water settles and is drained, the engine runs on BOTH, the selector goes to LEFT, the left vent blocks and the flow fails, then RIGHT.",
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
console.log(`fuel-system-3d.html  ${(size / 1024).toFixed(0)} KB  ${items.size} items  (+ three.js from jsDelivr)`);
