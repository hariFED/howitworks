// Builds pin-tumbler-3d.html: the pin tumbler cylinder of BP-008 as a live 3D technical illustration,
// from the 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/pin-tumbler/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts().filter((p) => p.anchor);

const size = writePage3d(join(here, "pin-tumbler-3d.html"), {
  title: "Pin Tumbler 3D",
  description: "The BP-008 five-pin euro cylinder as a live isometric half-section through its pin stacks: the wrong key stops pin 3 a millimetre short of the shear line, the right key brings all five gaps onto it and the plug and cam turn, from the 2D sheet's own model.",
  heading: "PIN TUMBLER · BP-008 · 3D",
  titleText: "PIN TUMBLER · ISOMETRIC HALF-SECTION",
  dwg: "BP-008-3D",
  parts: parts.length,
  units: "mm · deg",
  sheet2d: "pin-tumbler.html",
  buttons: `<button type="button" id="tour" aria-pressed="false">TOUR</button>`,
  hint: "DRAG TO ORBIT · DRAG THE KEY OR ← → TO INSERT · ↑ ↓ TURN · K OTHER KEY · SPACE TOUR · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-008 · DRAG THE KEY · ↑ TURNS",
  aria: "Isometric half-section of a five-pin euro cylinder and its key, cut through the pin stacks. Drag to orbit; drag the key or use the arrow keys to insert it and turn it, K swaps the key. The plug turns only when every key-pin crown sits on the shear line, from the same model as the 2D sheet.",
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
console.log(`pin-tumbler-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
