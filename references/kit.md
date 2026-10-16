# Kit reference

All of `kit/draft.mjs` is pure and returns SVG strings. World units are millimetres of the real object: u to the right, v up (or away, in a plan view).

## Views

```js
const V = K.view({ x: 190, y: 780, scale: 1 / 2.5 }); // world origin at sheet (190, 780)
V.k            // sheet units per world mm
V.p([u, v])    // -> [x, y] on the sheet
K.d(V, pts)    // path data for a closed polygon (pass false for an open one)
K.scaleLabel(1 / 2.5) // "1:2.5"
```

Place a detail by solving for its origin: to put world point (52, 38) at sheet (560, 625) at 2:1, `x = 560 - 52 * k2`, `y = 625 + 38 * k2` with `k2 = 2 * K.PX_PER_MM`.

## Geometry (world point lists)

`rect(u0, v0, u1, v1)`, `rrect(u0, v0, u1, v1, r)`, `arc(cu, cv, r, a0, a1)` (degrees, counter-clockwise, v up), `circle(cu, cv, r)`, `move(pts, du, dv)`, `flipU(pts, about)`, `flipV(pts, about)`, `inside(pt, poly)`.

### revolve

```js
// half-profile [r, s]: r from the axis, s along it; a hollow ring here
const rev = K.revolve([[16, 34], [17.5, 34], [17.5, 430], [16, 430]]);          // vertical axis at u = 0
const hose = K.revolve(loop, { axis: "u", at: 29 });                              // horizontal axis at v = 29
rev.cuts   // one polygon if the profile touches the axis (solid), else two (left and right walls)
rev.edges  // lines across the bore at every inner circle, seen through the cut
K.section(V, rev, { mat: "brass", angle: 135 })
K.section(V, { ...rev, edges: [] }, opts) // when another part covers the bore
```

A solid profile must have one edge *on* the axis (two consecutive points with r = 0).

## Drawing

| Call | Draws |
|---|---|
| `cut(V, pts, { mat, angle })` | A cut face: paper, hatch, thick outline. `mat: "solid"` blacks it in. |
| `section(V, rev, opts)` | All cut faces of a revolved part, plus its bore edges |
| `body(V, pts)` | An unsectioned solid: paper and a thick outline |
| `line(V, pts, cls, closed)` / `lines(V, list, cls)` | Lines of a class: `vis`, `thin`, `hid`, `ctr`, `phan` |
| `centerline(V, a, b, over)` / `centerMark(V, c, r)` | Axes and hole centres |
| `springSection(V, { from, to, radius, wire, turns, axis, at })` | A compression spring cut along its axis |
| `breakLine(V, a, b)` | A thin break across a part that runs out of the view |

`hatchDefs()` goes in `<defs>` once. Materials: `steel iron alu brass bronze rubber plastic foam wood`; angles `45 135 30 60`.

## Annotation

```js
K.dim(V, a, b, { dir: "h" | "v", off, text, prefix: "Ø", id })
```
`off` is the sheet distance from point `a` to the dimension line (negative = up or left). The value is measured from `a` and `b` unless `text` is given. A live dimension is re-rendered into a wrapper each frame: `wrap.innerHTML = K.dim(...)`.

```js
K.balloon(V, at, [bx, by], n, { target })   // dot at world point `at`, circle at sheet (bx, by)
K.viewLabel(x, y, "DETAIL B", "CHECK VALVE · SCALE 2:1")
K.detailMark(V, centre, r, "B", angleDeg)    // circle in the parent view with its letter
K.viewArrow(V, at, [dx, dy], "C")            // sheet direction
```

`target` must equal the `data-part` of the part the dot sits on; the check verifies it.

## Sheet

```js
K.frame()                                   // trim, border, zones 1–8 × A–F, centring marks
K.table(x, y, cols, rows)                   // parts list: rows in item order, drawn bottom-up
K.titleBlock(x, y, w, h, cells)             // cells: { x, y, w, h, label, value, size, id }
K.notes(x, y, "NOTES", lines)
```

## Groups the check understands

- `data-part="n"` on each part's group (`P.part(n, svg)` in the example).
- `data-geom="name"` on each view's geometry group; text must not sit on it.
- `data-role` on annotation groups: `dim`, `balloon`, `label`, `notes`, `bom`, `title`, `chart`, `frame`, `engraved` (text allowed on the object), `fluid` (accent air, ignored), `phantom` (ignored).
- A clipped detail: `clip-path="url(#clip-B)"` on its geom group; the check uses the clip's box.

## Runtime (`kit/live.mjs`)

```js
const q = L.setupPage(svg);             // theme buttons, ?theme, ?zoom
const live = L.run({ root: svg, step, render, idleAfter: 5, onFrozen });
// step(dt, live): advance; live.touring is true while the idle tour drives; return true while settling
// render(live): write attributes only
live.input();                            // call on every user input: stops the tour, wakes the loop
L.follow(at, want, rate, dt)             // critically damped approach
L.dragY(svg, el, { start, move(dySheet), end })
L.announcer(el, seconds)                 // polite aria-live text, throttled
```

`?t=` runs `step` at 240 Hz from 0 to t with `touring: true`, renders once and calls `onFrozen` (where the example runs the self-check). Subdivide `step` so the model sees small steps (the pump uses 480 Hz).

## Page

```js
writePage(out, { title, description, svg, bar, css, modules: [[kitPath("draft.mjs"), "K"], [here + "/model.mjs", "M"]], main })
```
Modules are inlined in order as `const NAME = (() => { ... })()`; write each with `import * as NAME from ...` and the same names, and they work unchanged in node and in the page.

## 3D view (`kit/solid3d.mjs`, `writePage3d`)

A companion 3D page per example, from the same model. The full guide is `references/3d.md`; in brief:

```js
// scene3d.mjs (pure data)
S.part(3, "BARREL", [S.tube({ r0: 16, r1: 17.5, from: 34, to: 430 })], { hatch: "solid", explode: [0, 112, 0], anchor: { cut: [-16.75, 250, 0] } })
S.lathe(loop, { axis: "y", at })  S.extrude(shape, { along, from, to, holes, conform })  S.gear(...)  S.helix(...)
S.bore(solid)  S.fluid(name, solid, { stretch })
// live3d.js
const V = S.create({ scene: SC.scene() });
V.set(id, { pos, rot });  V.solid(id, "name").rotation.y = a;  V.fluid(name, { density, stretch });  V.frame([...poses]);
V.drag(ids, { axis, length, start, move });  V.run({ step, render, overlay });
// build3d.mjs
writePage3d(out, { title, heading, titleText, dwg, parts, sheet2d, buttons, modules: [[K], [L], [S], [M], [P], [SC]], main })
```

`node scripts/check3d.mjs page-3d.html` and `node scripts/shot3d.mjs page-3d.html --view iso --cut 1` verify it.

