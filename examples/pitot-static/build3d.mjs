// Builds pitot-static-3d.html: the pitot-static system of BP-108 as a live 3D technical illustration,
// from the sheet's own model (model.mjs, unchanged) and profiles (parts.mjs), with kit/solid3d.mjs.
//   node examples/pitot-static/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const items = new Set(SC.parts().map((p) => String(p.id).replace(/[ab]$/, "")));

const size = writePage3d(join(here, "pitot-static-3d.html"), {
  title: "Pitot-Static System 3D",
  description: "The BP-108 light-aircraft pitot-static system as a live isometric half-section: the heated pitot head, the cross-connected static ports, the drain traps, the alternate static valve and the airspeed indicator, altimeter and VSI with their capsules, rocking shafts, sectors and pinions, driven by the sheet's ISA model through the tour's climb, descent and blockages.",
  heading: "PITOT-STATIC · BP-108 · 3D",
  titleText: "PITOT-STATIC SYSTEM · HALF-SECTION · NTS LAYOUT",
  dwg: "BP-108-3D",
  parts: items.size,
  units: "mm · Pa · kt · ft",
  sheet2d: "pitot-static.html",
  buttons: `<button type="button" id="ice">PITOT ICE</button><button type="button" id="alt">ALT STATIC</button>`,
  hint: "DRAG TO ORBIT · DRAG THE BARO KNOB · P PITOT · D DRAIN · O PORTS · A ALTERNATE · H HEAT · [ ] BARO · ARROWS FLY · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-108 · P D O A H · [ ] · SPACE TOUR",
  aria: "Isometric half-section of a light aircraft's pitot-static system laid out on one board: the heated pitot head with its ram hole, drain and water dam, the tail cone's two cross-connected static ports, the drain traps, the alternate static valve and the three instruments, each cut through its axis to show its capsule, push rod, rocking shaft, sector, pinion and pointer. The tour climbs, cruises, and shows the classic blockages.",
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("solid3d.mjs"), "S"],
    [join(here, "../light-aircraft/model.mjs"), "A"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "scene3d.mjs"), "SC"],
  ],
  main: readFileSync(join(here, "live3d.js"), "utf8"),
});
console.log(`pitot-static-3d.html  ${(size / 1024).toFixed(0)} KB  ${items.size} items  (+ three.js from jsDelivr)`);
