# Atlas: a whole machine you can zoom into

An atlas is a set of examples that are levels of one machine. The top (level 0) is the whole object, cut open, with each system in it as one part. Every such part is a **doorway**: open its card and choose *Look inside*, and the view flies in on the part and hands over to that system's own example (level 1), whose parts can in turn open the detailed mechanisms (level 2). A breadcrumb in the bar leads back out, and the way back feels like zooming out.

Nothing about drawing changes. Each level is an ordinary example (sheet, part cards, optional 3D view) built with the same kit and the same standards. The atlas is two small additions to the JSON files every example already has; `kit/page.mjs` resolves them when the page is built.

## 1. When to use it

Use it when the request is a whole machine whose systems each deserve a sheet: an aircraft, a car, a washing machine, a power station. One sheet cannot hold a 300-part machine at a readable scale; an atlas keeps each level a normal sheet (15 to 30 parts) and lets the reader travel between them. Don't use it to link unrelated examples: a doorway must be a part that physically *contains* the example it opens.

**Level 0 is light.** At the top each system is a simple, recognisable solid (the engine a block with its cylinders, a wheel a disc and tyre); detail lives one level down. A level-0 3D scene keeps inside the `references/3d.md` budget: ≤150k triangles, ≤250 draw calls, ≤60 parts.

## 2. Files

Slugs are fixed first and linked before the children exist: a doorway to a child that isn't drawn yet shows "drawing in progress" and has no link, and starts working as soon as the child is built and the parent rebuilt.

**info.json** (the part cards, unchanged otherwise): a doorway part adds `"open"`, the child's slug. Add `"openLabel"` when the child is a general explainer rather than this very part (a single-cylinder engine behind an aero engine's piston): `"openLabel": "How one cylinder works"` replaces "Look inside" on the card, so a student is never told it is the same part.

```json
{
  "3": { "name": "Engine", "spec": "5.2 L flat-four", "material": "…", "qty": "1", "note": "…", "open": "aero-engine" }
}
```

**meta.json**: a child names its parent and the part number that opens it; the top names itself as an atlas.

```json
{ "slug": "light-aircraft", "atlas": true, "level": 0, … }
{ "slug": "aero-engine", "parent": "light-aircraft", "parentPart": "3", "level": 1, "crumb": "Engine", … }
{ "slug": "four-stroke", "parent": "aero-engine", "parentPart": "7", "level": 2, … }
```

| Field | Where | What it does |
|---|---|---|
| `open` | info.json part | The slug this part opens. Several parts may open the same child |
| `atlas` | meta.json, top only | Marks the whole machine; the site gives it its own section |
| `parent`, `parentPart` | meta.json, every child | Builds the breadcrumb; its crumb links back to the parent zoomed on `parentPart` |
| `level` | meta.json | 0 top, 1 system, 2 mechanism. Informational; the chain comes from `parent` |
| `crumb` | meta.json, optional | The short name in breadcrumbs ("Engine"); the title otherwise |

An existing example becomes a level-2 child by adding `parent`, `parentPart` and `level: 2` to its meta.json and rebuilding it. Its drawing is unchanged.

**Build order.** Links are resolved at build time from the sibling folders in `examples/`, so rebuild a parent after a child first appears (`node scripts/build-all.mjs` does everything). A child counts as drawn when its folder has `meta.json` and `<slug>.html` (or `build.mjs`); its 3D view counts when `"has3d": true` and `<slug>-3d.html` (or `build3d.mjs`) exist.

## 3. What the reader gets

- **The card.** A doorway's card adds the child's one-line `idea` and a *Look inside →* link (a real link: a middle click opens the child in a new tab), or "Inside: drawing in progress".
- **Activating it**: the card's link; **Enter** on a focused doorway balloon (2D); on a 3D page, Tab reaches a short list of the doorways (out of sight until focused, since a 3D page's balloons are redrawn each frame and can't hold focus), where each shows its card at its balloon and Enter goes in; or a **double-click** on a doorway part, its balloon or the part itself (3D), anywhere else double-click still resets the zoom.
- **The flight.** 3D: zoom and look ease toward the part's anchor over 0.9 s while every other part, the outlines and the balloons fade toward the paper, then the page goes to the child's 3D view (its sheet if it has none). 2D: the sheet's viewBox eases in on the part (in the view nearest its balloon) and lights it, then goes to the child's sheet. Under reduced motion, in a `?t=` frame or a `?check` run there is no flight: the page goes straight there.
- **Arrival.** The child opens with `?from=<parent>` and starts slightly zoomed in, then eases out to the whole object, so the flight reads as one move.
- **The breadcrumb** in the bar: `Aircraft › Engine › Cylinder` on a sheet; on a 3D page the ancestors run into the bar's own heading. Each crumb links to its page with `?focus=<part>`: that page starts zoomed on the part you came out of, standing out (lit on a sheet, the rest faded in 3D), and eases out to the whole object. The way back from a child and the way in to it are the same flight, reversed.
- **Back button.** A page restored from the browser's cache comes back whole, not at the end of its flight.

URL parameters, on both page kinds: `?focus=<part number>` (start on the part, ease out) and `?from=<slug>` (a short zoom-out). Both are ignored with `?t=`, under reduced motion, and on a sheet with `?zoom=`.

## 4. How it is built (for kit work)

`writePage` and `writePage3d` (kit/page.mjs) call `atlasOf(out, "2d" | "3d")`, which reads the page's own meta.json and info.json and its siblings' meta.json:

```js
atlasOf(out, kind) → { slug, kind, level, parent, parentPart, atlas, title,
  links: { "<child slug>": { title, idea, has3d, href, href2d, href3d } | null },   // null: not drawn yet
  chain: [{ slug, part, title, href }],   // root first, ending at the parent
  active }                                // in an atlas at all: else the page is exactly as before
crumbs(A, { current }) → the bar's <nav class="bp-crumbs">
```

`href` is the page the doorway opens from this kind of page (a 3D page opens a child's 3D view when it has one). Hrefs are in the examples/ layout, `../<slug>/<slug>.html` and `../<slug>/<slug>-3d.html`; `site/build.mjs` rewrites both to the site's `../sheets/<slug>.html` and `../3d/<slug>.html`, the way it rewrites the 3D button.

The page inlines the table as `BP_LINKS` and its place as `BP_ATLAS` before kit/info.mjs, which renders the card, handles the keys and the double-click, and, on a sheet, flies the viewBox and answers `?focus`/`?from`. A 3D page's flight is kit/solid3d.mjs's: info.mjs dispatches a cancelable `bp:open` event (`detail: { id, href, go }`); solid3d cancels it, flies the camera (a `uFade` uniform fades every part but the kept one, through the colour, crease and outline passes), then calls `go`. A double-click on the canvas reads the part under the pointer from the id pass and dispatches `bp:dblpart` (`detail: { id }`); if the part is a doorway info.mjs cancels it and goes in. A page with neither info.json nor atlas fields gets none of this.

## 5. Checks

- Build the parent and every child, then open the parent's sheet and 3D view: every doorway's card shows *Look inside →* or "drawing in progress", and each link lands on the right child.
- In the child, the breadcrumb names the chain and each crumb opens its page zoomed on the right part.
- `node scripts/check.mjs` on each sheet and `node scripts/check3d.mjs` on each 3D page as usual; the breadcrumb lives in the bar, outside the sheet the check measures.
- After `node site/build.mjs`, repeat the first two checks on `docs/sheets/` and `docs/3d/`: no link may point into `examples/`.
