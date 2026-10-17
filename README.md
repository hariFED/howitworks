<p align="center">
  <img src="https://raw.githubusercontent.com/hariFED/howitworks/main/assets/logo.svg" width="76" alt="howitworks logo: a gear cut in half, the cut face hatched">
</p>

<h1 align="center">howitworks</h1>

<p align="center">
  <b>An interactive engineering-drawing skill for Claude Code</b> that explains mechanisms and software concepts through physical cutaways and live simulations.
</p>

<p align="center">
  <a href="https://harifed.github.io/howitworks/"><b>Website</b></a> ·
  <a href="https://harifed.github.io/howitworks/collection.html">All 21 sheets, live</a> ·
  <a href="#install">Install</a> ·
  <a href="#the-kit">The kit</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/hariFED/howitworks/main/assets/readme/banner.png" alt="Five live 3D cutaways drawn by howitworks: a four-stroke engine, a flyball governor, a gear pump, a centrifugal pump and a circuit breaker">
</p>

<p align="center"><code>npx howitworks</code> &nbsp;·&nbsp; <code>npx skills add hariFED/howitworks</code> &nbsp;·&nbsp; <code>/plugin install howitworks --marketplace hariFED/howitworks</code></p>

```
/howitworks explain how a pin tumbler lock opens
```

That one line becomes a real A2 engineering sheet: a section through the mechanism, details at a larger scale, true dimensions, numbered balloons, a parts list and a title block. Then **the parts move**, the dimensions re-measure themselves, and every number on the sheet comes from one physical model. Ask for `3d` and you also get a cutaway you can turn, cut open and take apart.

## Who it's for

| | |
|---|---|
| **Engineering students and educators** | Explore mechanisms, forces, pressure, motion and thermodynamic cycles interactively: real sections, real dimensions, physics you can push. Boyle's law, the Otto cycle, Pascal's principle, pump curves, feedback control. |
| **Developers** | Understand abstract software concepts as machines: rate limiting is a cistern, back-pressure a relief valve, authentication a pin tumbler lock, debounce a door closer, a state machine a click pen. |
| **Technical product teams** | Explain how a physical product works in documentation and training: a live, sectioned drawing of the seal, the valve, the spring, with a part card on every part. |

## See it work

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="https://raw.githubusercontent.com/hariFED/howitworks/main/assets/readme/sheet-live.gif" alt="A bicycle floor pump sheet running live: the handle pumps, the chart traces, the gauge rises, and hovering balloon 17 opens a card naming the check ball">
      <p><b>A live sheet.</b> The floor pump pumps itself: air thickens under the piston, the check ball lifts when the chamber passes tyre pressure, the gauge and the P–s chart follow. Hover any balloon and a card names the part and says what it does. <a href="https://harifed.github.io/howitworks/sheets/floor-pump.html">Open it →</a></p>
    </td>
    <td width="50%" valign="top">
      <img src="https://raw.githubusercontent.com/hariFED/howitworks/main/assets/readme/cutaway-3d.gif" alt="A 3D gear pump cut in half, its gears turning and the oil carried round in the tooth spaces, then taken apart along its shafts and put back together">
      <p><b>The same machine, solid.</b> The gear pump's involute gears turn in the cut body, oil riding round in the tooth spaces. Press <kbd>E</kbd> and it comes apart along its shafts; drag to turn it; <kbd>C</kbd> cuts it open. <a href="https://harifed.github.io/howitworks/3d/gear-pump.html">Open it →</a></p>
    </td>
  </tr>
</table>

## The idea

> **The cut is the explanation.**

Most explanations of how something works are boxes and arrows. A drafting office never drew boxes: it drew the thing itself, cut open along the plane where the mechanism lives, every part named, measured and made of something.

So Claude first chooses the **real object whose working _is_ the idea**, then the one cutting plane that exposes it. Software ideas become mechanisms first:

| You ask about | Claude draws | Because |
|---|---|---|
| Rate limiting | a WC cistern | a fixed refill jet *is* a token bucket |
| Debounce | a hydraulic door closer | every push restarts the closing |
| The circuit breaker pattern | a miniature circuit breaker | closed, open, half-open |
| Authentication | a pin tumbler lock | every pin must match the secret |
| Load balancing | a car's differential | one input split between two outputs |
| Back-pressure | a safety relief valve | it opens, sheds, and reseats |

## Examples

Every one was drafted by Claude with this skill, passes the layout check at a dozen moments of its tour, and runs live. Click a picture for the 3D view, or the name for the full sheet.

<table>
  <tr>
    <td align="center" width="33%"><a href="https://harifed.github.io/howitworks/3d/four-stroke.html"><img src="https://raw.githubusercontent.com/hariFED/howitworks/main/docs/thumbs/four-stroke-3d.png" alt="Four-stroke engine in 3D cutaway"></a><br><a href="https://harifed.github.io/howitworks/sheets/four-stroke.html"><b>Four-stroke engine</b></a><br><sub>Otto cycle, live P–V loop</sub></td>
    <td align="center" width="33%"><a href="https://harifed.github.io/howitworks/3d/escapement.html"><img src="https://raw.githubusercontent.com/hariFED/howitworks/main/docs/thumbs/escapement-3d.png" alt="Swiss lever escapement in 3D"></a><br><a href="https://harifed.github.io/howitworks/sheets/escapement.html"><b>Lever escapement</b></a><br><sub>how a watch makes equal ticks</sub></td>
    <td align="center" width="33%"><a href="https://harifed.github.io/howitworks/3d/governor.html"><img src="https://raw.githubusercontent.com/hariFED/howitworks/main/docs/thumbs/governor-3d.png" alt="Porter flyball governor in 3D"></a><br><a href="https://harifed.github.io/howitworks/sheets/governor.html"><b>Flyball governor</b></a><br><sub>feedback control, with droop</sub></td>
  </tr>
  <tr>
    <td align="center"><a href="https://harifed.github.io/howitworks/3d/token-bucket.html"><img src="https://raw.githubusercontent.com/hariFED/howitworks/main/docs/thumbs/token-bucket-3d.png" alt="WC cistern as a token bucket, in 3D"></a><br><a href="https://harifed.github.io/howitworks/sheets/token-bucket.html"><b>WC cistern</b></a><br><sub>token bucket rate limiting</sub></td>
    <td align="center"><a href="https://harifed.github.io/howitworks/3d/pin-tumbler.html"><img src="https://raw.githubusercontent.com/hariFED/howitworks/main/docs/thumbs/pin-tumbler-3d.png" alt="Pin tumbler lock in 3D"></a><br><a href="https://harifed.github.io/howitworks/sheets/pin-tumbler.html"><b>Pin tumbler lock</b></a><br><sub>authentication</sub></td>
    <td align="center"><a href="https://harifed.github.io/howitworks/3d/circuit-breaker.html"><img src="https://raw.githubusercontent.com/hariFED/howitworks/main/docs/thumbs/circuit-breaker-3d.png" alt="Miniature circuit breaker in 3D"></a><br><a href="https://harifed.github.io/howitworks/sheets/circuit-breaker.html"><b>Circuit breaker</b></a><br><sub>closed, open, half-open</sub></td>
  </tr>
  <tr>
    <td align="center"><a href="https://harifed.github.io/howitworks/3d/differential.html"><img src="https://raw.githubusercontent.com/hariFED/howitworks/main/docs/thumbs/differential-3d.png" alt="Open differential in 3D"></a><br><a href="https://harifed.github.io/howitworks/sheets/differential.html"><b>Differential</b></a><br><sub>load balancing</sub></td>
    <td align="center"><a href="https://harifed.github.io/howitworks/3d/centrifugal-pump.html"><img src="https://raw.githubusercontent.com/hariFED/howitworks/main/docs/thumbs/centrifugal-pump-3d.png" alt="Centrifugal pump in 3D"></a><br><a href="https://harifed.github.io/howitworks/sheets/centrifugal-pump.html"><b>Centrifugal pump</b></a><br><sub>the operating point</sub></td>
    <td align="center"><a href="https://harifed.github.io/howitworks/3d/stirling.html"><img src="https://raw.githubusercontent.com/hariFED/howitworks/main/docs/thumbs/stirling-3d.png" alt="Stirling engine in 3D"></a><br><a href="https://harifed.github.io/howitworks/sheets/stirling.html"><b>Stirling engine</b></a><br><sub>heat into work, live P–V loop</sub></td>
  </tr>
  <tr>
    <td align="center"><a href="https://harifed.github.io/howitworks/3d/debounce.html"><img src="https://raw.githubusercontent.com/hariFED/howitworks/main/docs/thumbs/debounce-3d.png" alt="Hydraulic door closer in 3D"></a><br><a href="https://harifed.github.io/howitworks/sheets/debounce.html"><b>Door closer</b></a><br><sub>debounce</sub></td>
    <td align="center"><a href="https://harifed.github.io/howitworks/3d/pressure-cooker.html"><img src="https://raw.githubusercontent.com/hariFED/howitworks/main/docs/thumbs/pressure-cooker-3d.png" alt="Pressure cooker in 3D"></a><br><a href="https://harifed.github.io/howitworks/sheets/pressure-cooker.html"><b>Pressure cooker</b></a><br><sub>boiling point, and an interlock</sub></td>
    <td align="center"><a href="https://harifed.github.io/howitworks/3d/carburettor.html"><img src="https://raw.githubusercontent.com/hariFED/howitworks/main/docs/thumbs/carburettor-3d.png" alt="Carburettor in 3D"></a><br><a href="https://harifed.github.io/howitworks/sheets/carburettor.html"><b>Carburettor</b></a><br><sub>Bernoulli: one flow meters another</sub></td>
  </tr>
</table>

<p align="center"><a href="https://harifed.github.io/howitworks/collection.html"><b>See all 21 sheets →</b></a></p>

## Install

```
npx howitworks
```

This copies the skill into `~/.claude/skills/howitworks`. Add `--project` to install into this project's `.claude/skills` instead, `--no-examples` for a smaller install, or `--force` to replace an existing one. Other ways to install:

```
# the skills CLI (Claude Code, Cursor, Codex and other agents)
npx skills add hariFED/howitworks

# as a Claude Code plugin
/plugin install howitworks --marketplace hariFED/howitworks

# or clone it
git clone https://github.com/hariFED/howitworks ~/.claude/skills/howitworks
```

Agents can read the whole project at a glance from [llms.txt](https://harifed.github.io/howitworks/llms.txt).

Needs Node.js 20 or later, and Chrome, Chromium or Edge for the checks. Restart Claude Code, then:

```
/howitworks explain how a mechanical watch keeps time
/howitworks draw debounce as a real mechanism
/howitworks a hydraulic bottle jack, paper theme
/howitworks explain a gear pump, in 3d
```

| Add to the request | You get |
|---|---|
| `3d` | a companion 3D page: turn it, cut it, explode it, drive it |
| `paper`, `white`, `dark` | that theme as the default (every sheet has blueprint, paper, white and dark) |
| `set` | several sheets of one machine, one sub-assembly per sheet |
| `still` | the drawing without the live layer |

## What every sheet has

- **A real object, cut open.** A section through the mechanism, details at 2:1 to 50:1 where the parts are small, a view in a named direction, and a chart of the model's key relation.
- **Drafting rules a checker would sign.** ISO 128 line weights, hatching by material, shafts, balls and bolts left uncut, thin walls blacked in, dimensions measured from the geometry and never typed.
- **One physical model.** Pressure, flow, speed, force: the readout, the dial, the chart and the drawing all read the same pure functions, so they can't disagree.
- **Live.** An idle tour that loops, drag and keyboard controls, dimensions that re-measure every frame, a screen-reader readout, stillness under reduced motion.
- **Part cards.** Hover, tap or focus any numbered balloon to see the part's name, size, material and what it does; the part lights up.
- **Checked like a drafting office.** A headless browser plays the tour to a dozen moments and fails on any collision; then Claude reads 4× close-ups of every junction.
- **One file.** A sheet is a standalone HTML page with inline SVG. Open it from disk, host it anywhere, put it in an iframe.

## The kit

`kit/draft.mjs` is pure functions that return SVG strings, so the same code runs in Node and in the page:

```js
import * as K from "howitworks/kit/draft";

const V = K.view({ x: 190, y: 780, scale: 1 / 2.5 });              // world mm → sheet units
const barrel = K.revolve([[16, 34], [17.5, 34], [17.5, 384], [16, 384]]);
let svg = K.section(V, barrel, { mat: "alu", angle: 45 });           // hatched cut faces + bore edges
svg += K.dim(V, [-17.5, 384], [17.5, 384], { dir: "h", off: -24, prefix: "Ø" });
svg += K.balloon(V, [17, 200], [120, 560], 3, { target: 3 });
```

| Module | What it does |
|---|---|
| `kit/draft.mjs` | views, geometry, `revolve`, sections, hatching, dimensions, balloons, frame, parts list, title block |
| `kit/live.mjs` | the runtime: damped motion, idle tour, drag, `?t=` frames, themes |
| `kit/solid3d.mjs` | the 3D mode: lathes, extrusions, gears, springs, hatched section caps, explode, balloons (three.js r170) |
| `kit/info.mjs` | part cards on hover, tap or focus |
| `kit/selfcheck.mjs` | the in-page layout check |
| `kit/page.mjs` | writes one standalone HTML page |

Every sheet understands the same addresses: `?t=6.5` renders the tour at 6.5 s, `?theme=white`, `?zoom=x,y,w,h` for close-ups, `?check=1` runs the layout check. 3D pages add `?view`, `?cut`, `?explode`, `?embed=1`.

## Develop

```
npm run build     # build every example page, 2D and 3D
npm run check     # layout check of every sheet at its tour times and phone width
npm run check3d   # render and self-test every 3D view
npm run site      # build the website into docs/
```

`SKILL.md` is what Claude reads: the one idea, the 11-step workflow and the rules. The details live in `references/` (drafting conventions, the kit API, sheet planning, the 3D guide) and the 21 worked examples in `examples/`.
