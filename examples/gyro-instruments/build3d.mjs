// Builds gyro-instruments-3d.html: the gyro instruments and vacuum system of BP-109 as a live 3D
// technical illustration, from the 2D sheet's own model (model.mjs) and outlines (parts.mjs).
//   node examples/gyro-instruments/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const items = SC.parts().length;

const size = writePage3d(join(here, "gyro-instruments-3d.html"), {
  title: "Gyro Instruments 3D",
  description: "The BP-109 gyro instruments as a live isometric half-section: the carbon-vane vacuum pump turns, the regulator holds 5 inHg, the attitude gyro holds the horizon as the case banks round it, the heading gyro holds its direction, and the electric turn coordinator's canted gimbal precesses in a turn, all from the sheet's model.",
  heading: "GYRO INSTRUMENTS · BP-109 · 3D",
  titleText: "GYRO INSTRUMENTS · HALF-SECTION · NTS",
  dwg: "BP-109-3D",
  parts: items,
  units: "mm · inHg · rpm",
  sheet2d: "gyro-instruments.html",
  buttons: `<button type="button" id="fail">PUMP</button><button type="button" id="sethi">SET HI</button>`,
  hint: "DRAG TO ORBIT · ← → BANK · A D RUDDER · ↑ ↓ RPM · V PUMP · H SET HI · W WARP · SPACE TOUR · E EXPLODE · C CUT (FACES) · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-109 · ROTORS AND PUMP SHOWN SLOWED · TOUR TIME-WARPED",
  aria: "Isometric half-section of a light aircraft's gyro instruments and vacuum system laid out on one plane: the dry vane pump, the regulator, the central filter, the suction gauge, the attitude indicator with its gyro in gimbals and pendulous vanes, the heading indicator with its card and knob, and the turn coordinator with its canted gimbal and ball, joined by the hoses. The tour starts them, turns, skids and slips, then fails the pump.",
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
console.log(`gyro-instruments-3d.html  ${(size / 1024).toFixed(0)} KB  ${items} parts`);
