// Builds stirling-3d.html: the Stirling demonstrator of BP-020 as a live 3D technical illustration,
// from the 2D sheet's own model (model.mjs, unchanged) and profiles (parts.mjs), with kit/solid3d.mjs.
//   node examples/stirling/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();
const items = new Set(parts.map((p) => p.id).filter((id) => typeof id === "number")).size; // 4L, 7D… repeat an item

const size = writePage3d(join(here, "stirling-3d.html"), {
  title: "Stirling Engine 3D",
  description: "The BP-020 beta-type Stirling demonstrator as a live isometric half-section: the gas shaded by temperature from the hot cap to the finned cooler, the displacer and power piston driven by a rhombic drive of two meshing gears, four rods and two yokes, the burner's flames, and an exploded view, all from the 2D sheet's Schmidt model.",
  heading: "STIRLING ENGINE · BP-020 · 3D",
  titleText: "STIRLING ENGINE · BETA · ISOMETRIC HALF-SECTION",
  dwg: "BP-020-3D",
  parts: items,
  units: "mm · K · bar abs",
  sheet2d: "stirling.html",
  css: "#ov .flame { fill: none; stroke: var(--bp-ink); stroke-width: 1px; stroke-linejoin: round; }",
  buttons: `<button type="button" id="flame" aria-pressed="true">FLAME</button>`,
  hint: "DRAG TO ORBIT · DRAG A GEAR TO TURN THE ENGINE · ←→ TURN · ↑↓ BURNER · SPACE FLAME · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS · S SLOW",
  live: "LIVE · SAME MODEL AS BP-020 · DRAG A GEAR · ↑↓ BURNER · SPACE FLAME",
  aria: "Isometric half-section of a beta-type Stirling engine. A burner heats the cap; the displacer shuttles one charge of air between the hot cap and the finned cooler through a 1 mm gap regenerator, and the power piston below it is driven with it by a rhombic drive of two meshing gears, four rods and two yokes. The gas is shaded by temperature. Drag a gear to turn the engine, the up and down arrows set the burner, Space puts the flame out.",
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
console.log(`stirling-3d.html  ${(size / 1024).toFixed(0)} KB  ${items} items, ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
