---
name: blueprint
description: Build live engineering drawings that explain how something works, as a real drafted sheet - orthographic views, a section cut through the mechanism, ISO line types and material hatching, true dimensions, detail views at larger scale, part balloons with a parts list, notes and a title block - where the parts move, the dimensions re-measure themselves and a live readout and chart come from one physical model. Use it whenever someone wants a blueprint, a technical drawing, a cutaway or cross-section, an engineering-style or drafting-style diagram, an "exploded"/"how it works" sheet, or an interactive explainer of a mechanism, a machine, a device, a process or an abstract idea drawn as a mechanism, even if they never say "blueprint". Framework-free JS that writes SVG and one standalone HTML page, with blueprint, paper and dark themes.
license: MIT
compatibility: Needs Node.js 20+, and Chrome, Chromium or Edge for the checks.
---

# Blueprint

This skill makes a drawing sheet the way a drafting office would: an A2 sheet with a frame and zone references, a main view cut through the mechanism, details enlarged to show the small parts that matter, a view in the direction that reads a dial, balloons on every part, a parts list, notes and a title block. Then it comes alive. The parts move, the cut air changes density with pressure, a dimension measures the stroke as it happens, a gauge needle follows, a chart traces the cycle, and the title block's readout states the numbers. All of it reads one small model, so nothing on the sheet can disagree with anything else.

Twenty-one complete example sheets ship with the skill. Open the reference sheet before you start:

- `examples/floor-pump/` is a bicycle floor pump in axial section: barrel, piston with a cup seal, a ball check valve in a die-cast base, hose barb and a gauge. A Boyle's-law model (`model.mjs`) drives everything. The cup seal folds in on the upstroke (it is the inlet valve), the ball lifts off its seat when the chamber passes tyre pressure (it is the outlet), and a P–s diagram shows the curve flatten when the valve opens. It has 21 parts, four views (section 1:2.5, Detail B 2:1, Detail D 2:1 riding with the piston, View C 1:1), live dimensions and moving balloons. `node examples/floor-pump/build.mjs` writes `floor-pump.html`.

Then open the example closest to your subject. Each has `model.mjs`, `parts.mjs`, `build.mjs`, `live.js` and a `meta.json`; some add an `extra.mjs` with helpers the kit lacks (gears, racks, rotary drag, cut faces with holes, cutting-plane lines, angular dimensions), which you can copy.

| DWG | Folder | Object | The idea it explains | Parts |
|---|---|---|---|---|
| BP-001 | `floor-pump/` | Bicycle floor pump in axial section | Positive-displacement compression through two one-way valves | 21 |
| BP-002 | `four-stroke/` | 125 cc air-cooled DOHC single, cut through cylinder and valves | Turning heat into rotation through a four-phase cycle | 29 |
| BP-003 | `governor/` | Porter flyball governor with a double-beat throttle valve | Negative-feedback proportional control, with droop | 28 |
| BP-004 | `escapement/` | Swiss lever watch escapement in plan, staff and jewels in section | Equal ticks from stored energy: a clock-driven scheduler | 22 |
| BP-005 | `bottle-jack/` | 2-tonne hydraulic bottle jack | Force multiplication by area ratio (Pascal) | 29 |
| BP-006 | `token-bucket/` | WC cistern with a float valve and a fixed refill jet | Token bucket rate limiting | 26 |
| BP-007 | `debounce/` | Overhead hydraulic door closer, EN 1154 size 3 | Debounce: act only once the input has stopped | 23 |
| BP-008 | `pin-tumbler/` | Five-pin euro-profile cylinder and key | Authentication by matching a secret: every factor must match | 16 |
| BP-009 | `circuit-breaker/` | B16 miniature circuit breaker | The circuit breaker pattern: closed, open, half-open | 30 |
| BP-010 | `thermostat/` | Wax-pellet coolant thermostat in its housing | A setpoint controller with no electronics | 24 |
| BP-011 | `relief-valve/` | DN25 spring-loaded safety relief valve | A threshold with hysteresis; back-pressure and load shedding | 23 |
| BP-012 | `differential/` | Rear-axle open bevel differential, with the car in a turn | One input split between two outputs: load balancing | 25 |
| BP-013 | `shock-absorber/` | Monotube gas-charged damper | Smoothing a noisy input: a low-pass filter | 25 |
| BP-014 | `click-pen/` | Retractable ballpoint pen | A toggle (finite state machine) built from geometry | 17 |
| BP-015 | `centrifugal-pump/` | ISO 2858 end-suction pump with discharge valve | The operating point where supply meets demand | 30 |
| BP-016 | `gear-pump/` | External gear pump, 8 cm³/rev, true involute gears | Positive displacement: a conveyor of fixed-size batches | 15 |
| BP-017 | `carburettor/` | Float-bowl carburettor, 26 mm bore | Bernoulli: one flow metering another | 26 |
| BP-018 | `pressure-cooker/` | 6 L stovetop pressure cooker | Boiling point raised by pressure; an interlock guarding a resource | 24 |
| BP-019 | `solenoid-valve/` | Pilot-operated 2/2 NC solenoid valve, G1/2 | A small signal controlling a big flow | 21 |
| BP-020 | `stirling/` | Beta-type Stirling engine with rhombic drive | Heat flowing from hot to cold does work | 25 |
| BP-021 | `disc-brake/` | Bicycle hydraulic disc brake, lever and caliper | A master–replica pair: one writes, the other follows | 29 |

`npm run build` rebuilds every sheet and `npm run check` runs the layout check on all of them at their `meta.json` times.

## The one idea that matters

**The cut is the explanation.** A blueprint explains by showing what is inside. Choose the real object whose mechanism *is* the idea, then choose the one cutting plane that exposes it: the bore, the valve, the passage, the spring. Everything the reader needs to understand must lie in, or be drawn in, a view. If the mechanism can't be seen, it isn't explained.

| Idea | Object | The cut that shows it |
|---|---|---|
| Positive-displacement compression, one-way valves | Floor pump | Axial section: piston, cup seal, check ball |
| A thermostat holding a setpoint | Wax-pellet thermostat valve | Axial section through pellet, spring and poppet |
| A rate limiter / token bucket | A cistern with a float valve and a fixed orifice | Section through tank, float arm and outlet |
| Debounce | A dashpot door closer | Section through piston, oil and needle valve |
| A mutex | A single-key lock-out hasp on a valve | Plan and section through hasp and key |
| Back-pressure in a queue | A gravity feed hopper with a gate | Section through hopper, chute and gate |
| A cache | A card index with tabbed guide cards | Section along the drawer showing the tab order |

Abstract ideas still become physical mechanisms first; then they get drawn as a drafter would draw them. Two ways this fails:

- **A diagram dressed as a drawing.** Boxes with hatching, arrows with dimension heads. A drawing has *parts*, made of *materials*, that touch and hold each other.
- **A drawing that shows nothing.** An outside view of a closed casing. Cut it.

**Every sheet is dense and correct.** At 1× it reads as one drawing with a clear main view. At 4× every region still holds something true: a chamfer, a thread, an O-ring groove, a drill point, a wire section. A bare rectangle is unfinished.

## Workflow

Work in this order. Write the concept, the model and the parts list before any geometry.

1. **Size it.** A **Sheet** is one assembly, 15–30 parts, 3–5 views: build it without asking (about an hour). A **Set** is several sheets or a sub-assembly per sheet (several hours): say so and propose one Sheet first. Have a page that opens within the first 30 minutes and deepen it.
2. **Truth first.** Write `model.mjs`: real dimensions, real physics, pure functions, no DOM. The geometry, the dimensions, the readout and the chart all read it. Derive what you can (dead volume from the geometry, force from pressure × area) instead of typing numbers twice.
3. **Choose the object and the cut.** Say in one sentence what moves and what that motion means, and which cutting plane shows it.
4. **Parts list = BOM.** Number every part: description with its standard size (M6×28 ISO 4762, Ø35×1.5), material (real grade), quantity. 15+ items for a Sheet. Each part touches and is held by another.
5. **Plan the sheet.** Main view (the section) at a standard scale (1:1, 1:2, 1:2.5, 1:5, 1:10, 2:1, 5:1); a detail at 2:1 or 5:1 for each place where the mechanism is too small; a view in a named direction (VIEW C) for faces that matter (dials, ports); an optional diagram for the model's key curve. Fixed furniture: frame, parts list stacked on the title block at bottom right, notes above. Lay the sheet out on paper in sheet units (A2 = 1200 × 848) before drawing.
6. **Geometry once, in world mm.** Each part is a function `(V) => svg` that draws into any view, so details are the same code at a larger scale. Bodies of revolution are half-profiles through `revolve`. Moving parts are drawn at one rest position and moved with a transform; only parts whose *shape* changes (springs, seals, needles) are re-drawn per frame.
7. **Draw by the rules** (`references/conventions.md`): visible edges thick, everything else thin; hatch every cut face by material, adjacent parts at different angles, the same part the same in every view; shafts, rods, pins, keys, balls, nuts, bolts and ribs cut lengthwise are *not* hatched; sections thinner than ~1.5 sheet units are blacked in; edges seen through a bore are drawn; centre lines on every axis and hole.
8. **Annotate.** Dimensions are measured from the geometry (`dim` reads the points, never a typed number unless it's a live label). Dimensions sit outside the views where possible, never on hidden lines, never twice. Every part gets one balloon; the leader ends in a dot *on* the part. Words live in dimensions, balloons, labels, notes, the parts list and the title block, never floating on the drawing (engraved dial numbers are part of the object).
9. **One accent.** Exactly one thing carries the accent colour: what the reader should watch, usually the working fluid (stippled, its density following pressure) or the one moving subject. The same accent marks it in the chart.
10. **Make it live** (`kit/live.mjs`): time-based motion with critically damped follows, an idle tour that loops a full cycle, drag and keys, pause offscreen, stillness under reduced motion, a readout in the title block, a polite screen-reader announcement. Moving balloons and live dimensions ride with their parts. Show the alternate position of a moving assembly in phantom lines.
11. **Verify like a checker.** A drawing office has a checker; be one.
    - `node scripts/check.mjs page.html --phone` must print `check passed` at every moment it samples (it plays the tour to several times). It catches lettering that overlaps, lettering on parts or other annotations' lines, anything outside the frame, balloons whose dot misses their part, balloon circles on parts, hard-coded colours and sideways scrolling. Moving parts are where it fails: a balloon that is clear at rest is crossed by the handle mid-stroke.
    - Screenshots: `node scripts/shot.mjs page.html --t 1.0` for the whole sheet; `--zoom x,y,w,h --width 1200 --height 1200` for 4× close-ups of every detail, every junction and every moving part at both ends of its travel; `--theme paper` and `--theme dark`. Read every PNG.
    - Ask: is it instantly a real drawing of a real object? Does the cut expose the mechanism? Would a drafter sign it: right line weights, right hatches, unhatched shafts, dimensions that measure? Is the readout true? Iterate until yes.

## Setup

Copy the example folder, rename it, and replace `model.mjs`, `parts.mjs`, `build.mjs` and `live.js`. The kit stays shared:

- `kit/draft.mjs`: views, world geometry (`rect`, `rrect`, `arc`, `circle`, `move`, `flipU`, `revolve`), drawing (`cut`, `section`, `body`, `line`, `lines`, `centerline`, `centerMark`, `springSection`), annotation (`dim`, `balloon`, `viewLabel`, `detailMark`, `viewArrow`, `breakLine`), sheet furniture (`frame`, `table`, `titleBlock`, `notes`) and `hatchDefs`. Pure: it also runs in the page. See `references/kit.md`.
- `kit/live.mjs`: the runtime (`run`, `follow`, `ease`, `dragY`, `announcer`, `setupPage`).
- `kit/selfcheck.mjs`: the in-page layout check.
- `kit/page.mjs`: inlines modules as namespaces and writes one standalone HTML page.
- `kit/sheet.css`: the three themes as tokens. Every colour in a drawing is a token.

URL parameters every page supports: `?t=6.5` (render the tour at 6.5 s, deterministically), `?theme=paper`, `?zoom=x,y,w,h`, `?check=1`.

## References

- `references/conventions.md`: line types, hatching, sectioning, dimensioning, scales, balloons, title block. Read before drawing.
- `references/kit.md`: the kit API with the patterns the example uses.
- `references/layout.md`: planning a sheet and making moving parts and annotations coexist.
