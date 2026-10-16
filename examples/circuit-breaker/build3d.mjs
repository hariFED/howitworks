// Builds circuit-breaker-3d.html: the B16 MCB of BP-009 as a live 3D technical illustration, from the
// 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/circuit-breaker/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PARTS = 30; // the parts list; the arc is drawn as a part but has no item number

const size = writePage3d(join(here, "circuit-breaker-3d.html"), {
  title: "Circuit Breaker 3D",
  description: "The BP-009 B16 miniature circuit breaker as a live isometric half-section: the case cut on its centre plane, the mechanism whole inside it, the current path glowing in the accent, a thermal trip on overload and a magnetic trip with an arc running into the splitter plates, all from the 2D sheet's model.",
  heading: "CIRCUIT BREAKER · BP-009 · 3D",
  titleText: "MCB B16 · ISOMETRIC HALF-SECTION",
  dwg: "BP-009-3D",
  parts: PARTS,
  units: "mm · A · s · K",
  sheet2d: "circuit-breaker.html",
  buttons: `<button type="button" id="tour" aria-pressed="false">TOUR</button><button type="button" id="normal" aria-pressed="false">12 A</button><button type="button" id="over" aria-pressed="false">40 A</button><button type="button" id="short" aria-pressed="false">SHORT</button>`,
  hint: "DRAG TO ORBIT · DRAG THE HANDLE OR ↑ ↓ ON/OFF · ← → CURRENT · N O X NORMAL, OVERLOAD, SHORT · SPACE TOUR · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-009 · DRAG THE HANDLE · ← → CURRENT",
  aria: "Isometric half-section of a B16 miniature circuit breaker, the case cut on its centre plane. Drag to orbit, drag the handle to switch it, and change the current: the bimetal heats and trips on overload, the coil's plunger trips at once on a short circuit and the arc runs into the splitter plates, from the same model as the 2D sheet.",
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("solid3d.mjs"), "S"],
    [join(here, "model.mjs"), "M"],
    [join(here, "extra.mjs"), "X"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "scene3d.mjs"), "SC"],
  ],
  main: readFileSync(join(here, "live3d.js"), "utf8"),
});
console.log(`circuit-breaker-3d.html  ${(size / 1024).toFixed(0)} KB  ${SC.parts().length} parts  (+ three.js r170 from jsDelivr)`);
