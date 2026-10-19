// Builds trim-tab.html: a live A2 drawing of the elevator trim tab of a four-seat high-wing light
// aircraft (one level below BP-106, the flight controls): the port elevator cut at the actuator, the
// jackscrew actuator in full section, the piano hinge, the pedestal's trim wheel and indicator, the
// cable run, and why it works: the tab's hinge moment against the elevator's, the stick force against
// airspeed, the screw's friction cone and the wheel's turns. Every number shared with BP-106 is
// imported from its model.
//   node examples/trim-tab/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as FC from "../flight-controls/model.mjs";
import * as M from "./model.mjs";
import * as S from "./sheet.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- this sheet and BP-106 agree
const same = (name, a, b, tol = 1e-9) => {
  if (Math.abs(a - b) > tol) throw new Error(`${name}: BP-106 has ${a}, this sheet ${b}`);
};
for (const v of [65, 80, 110]) same(`trimmed tab ${v} kt`, FC.trimmed(v).tab, M.trimmed(v).tab);
same("untrimmed pull 65 kt", FC.forceAt(65, FC.trimmed(110).tab), M.forceAt(65, M.trimmed(110).tab));
same("lead angle", FC.LEAD_ANGLE, M.LEAD_ANGLE);
same("wheel turns", FC.trimWheelTurns(25), M.trimWheelTurns(25));
{
  // the two shares of the hinge moment add up to BP-106's hinge moment
  const fl = FC.trimmed(65);
  const m = M.moments(65, fl.elevator, 2, fl.alpha);
  same("hinge moment", FC.hinge(65, fl.elevator, 2, fl.alpha), m.net, 1e-9);
  // trimmed, the elevator floats exactly where the flight needs it
  same("float = need at 65 kt", M.floatAngle(fl.tab, fl.alpha), fl.elevator, 1e-6);
}

// ---------------------------------------------------------------- the sheet
const st = M.state();
const sol = M.solve(st);
const defs = `<defs>${K.hatchDefs()}<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>${S.defs()}</defs>`;
const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of the elevator trim tab of a four-seat high-wing light aircraft: the port elevator cut at the trim actuator with the tab, its horn and push-pull rod; the jackscrew actuator in full section with its grooved cable drum, Acme screw, bronze nut, ball bearing, slotted housing, stops and bush; the piano hinge; the pedestal's trim wheel, drum and position indicator; and the trim cable run from the cockpit to the tail. The tour cruises trimmed, slows to 65 knots so the pull builds, rolls the trim wheel until the tab is down, the elevator floats up and the pull is gone, returns to cruise, and shows a disconnected rod letting the tab flutter. T and G trim nose up and down, the left and right arrows change the airspeed, F disconnects the rod." ` +
  `data-views='${JSON.stringify(S.VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  S.sheet(sol) +
  `</svg>`;

const bar =
  `<span><kbd>T</kbd> <kbd>G</kbd> trim · <kbd>←</kbd> <kbd>→</kbd> airspeed · <kbd>F</kbd> rod off · <kbd>Space</kbd> tour · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;
const css =
  `.bp-sheet .cable{fill:none;stroke:var(--bp-accent);stroke-width:1.15px;stroke-linejoin:round;stroke-linecap:round}` +
  `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}`;
const size = writePage(join(here, "trim-tab.html"), {
  title: "Elevator Trim Tab",
  description: "A live engineering drawing of a light aircraft's elevator trim tab: the trim wheel, cables and self-locking jackscrew actuator in section, the push rod, horn, piano hinge and tab, with the tab's hinge moment balancing the elevator's, the stick force going to zero as the tab is trimmed, the screw's friction cone, and what a disconnected rod does.",
  svg,
  bar,
  css,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "../light-aircraft/model.mjs"), "A"],
    [join(here, "../nose-gear/model.mjs"), "N"],
    [join(here, "../flight-controls/model.mjs"), "FC"],
    [join(here, "../flight-controls/extra.mjs"), "X"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "sheet.mjs"), "S"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8"),
});
const t110 = M.trimmed(110).tab;
console.log(`trim-tab.html  ${(size / 1024).toFixed(0)} KB  tab ${t110.toFixed(1)}° at 110, ${M.trimmed(65).tab.toFixed(1)}° at 65  pull ${M.forceAt(65, t110).toFixed(1)} N  λ ${M.LEAD_ANGLE.toFixed(1)}° φ ${M.FRICTION_ANGLE.toFixed(1)}° η ${(100 * M.EFF).toFixed(0)} %  turns ${(M.TRIM_TURNS[1] - M.TRIM_TURNS[0]).toFixed(2)}`);
