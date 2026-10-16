// Builds carburettor-3d.html: the float-bowl carburettor of BP-017 as a live 3D technical illustration,
// from the 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/carburettor/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "carburettor-3d.html"), {
  title: "Carburettor 3D",
  description: "The BP-017 float-bowl carburettor as a live isometric half-section through its bore and float bowl: the throttle and choke plates turning on their spindles, the float and its needle valve, and the fuel Bernoulli lifts through the main jet, the emulsion tube and the pilot circuit, driven by the 2D sheet's model.",
  heading: "CARBURETTOR · BP-017 · 3D",
  titleText: "CARBURETTOR · ISOMETRIC HALF-SECTION",
  dwg: "BP-017-3D",
  parts: parts.length,
  units: "mm · g/s · mbar",
  sheet2d: "carburettor.html",
  buttons: `<button type="button" id="choke" aria-pressed="false">CHOKE</button>`,
  hint: "DRAG TO ORBIT · DRAG THE THROTTLE PLATE OR ← → · K CHOKE · [ ] MIXTURE SCREW · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-017 · DRAG THE PLATE · ← → THROTTLE · K CHOKE",
  aria: "Isometric half-section of a float-bowl carburettor. Drag to orbit; drag the throttle plate or use the arrow keys to open the throttle, K works the choke and the square brackets turn the mixture screw. The fuel in the bowl, the emulsion tube and the pilot circuit, the float and its needle follow the same model as the 2D sheet.",
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
console.log(`carburettor-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js from jsDelivr)`);
