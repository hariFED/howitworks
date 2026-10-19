# Atlas: a whole machine you can zoom into (plan and shared interface)

Status: wave 1 in progress. This file is the contract the kit, the aircraft and the system pages build to.
When the kit work lands, `references/atlas.md` documents it for skill users and this plan can go.

## The idea

One big object, cut open (level 0). Every system in it is a doorway: click it and the camera flies in,
then hands over to that system's own example (level 1), whose parts can in turn open the detailed
mechanisms (level 2) — many of which already exist as examples. A breadcrumb leads back up.

```
L0  light-aircraft        whole aircraft: 2D general-arrangement sheet + 3D cutaway (systems as parts)
L1  aero-engine, …        one example per system (2D sheet + 3D view), same kit as today
L2  four-stroke, …        detailed mechanisms; existing examples where they fit
```

## The aircraft

A generic **four-seat, high-wing, single-engine light aircraft** (the class of the most common training
aircraft). Never a brand or model name on any page; use published class figures:
span ≈ 11.0 m, length ≈ 8.3 m, height ≈ 2.7 m, wing area ≈ 16.2 m², MTOW ≈ 1,100 kg,
flat-four air-cooled engine ≈ 5.2 L, 120 kW (160 hp) at 2,700 rpm, fixed-pitch two-blade propeller
Ø ≈ 1.9 m, fixed tricycle gear (spring-steel mains, oleo nose strut), strut-braced wing, cable controls,
electric flaps, two wing tanks gravity-feeding an updraft carburettor, dual magnetos, 14 V or 28 V DC.

## Slugs (fixed: link to these even before they exist)

| L1 slug | System | L2 children (existing ✓ / new) |
|---|---|---|
| `aero-engine` | Flat-four piston engine | four-stroke ✓, carburettor ✓, gear-pump ✓ (oil pump), magneto, valve-train |
| `propeller` | Fixed-pitch propeller, hub, spinner | — |
| `fuel-system` | Wing tanks, selector, strainer, primer | carburettor ✓, fuel-selector |
| `flight-controls` | Yoke, cables, pulleys, bellcranks, surfaces, trim | trim-tab |
| `wing-flaps` | Electric flap motor, jackscrew, flap tracks | — |
| `main-gear` | Spring-steel legs, wheels, brakes, master cylinders | disc-brake ✓ |
| `nose-gear` | Oleo strut, shimmy damper, steering | shock-absorber ✓ |
| `pitot-static` | Pitot, static ports, ASI, altimeter, VSI | — |
| `gyro-instruments` | Vacuum pump, attitude and heading indicators | — |
| `electrical` | Alternator, battery, master, bus | circuit-breaker ✓ |
| `airframe` | Wing spar and ribs, strut, fuselage frames, empennage | — |

## The interface

**info.json** (per example, existing format) — a part that is a doorway adds `"open"`:

```json
{ "3": { "name": "Engine", "spec": "…", "material": "…", "note": "…", "open": "aero-engine" } }
```

**meta.json** — a child names its parent; the top names itself as an atlas:

```json
{ "slug": "aero-engine", "parent": "light-aircraft", "parentPart": "3", "level": 1 }
{ "slug": "light-aircraft", "atlas": true, "level": 0 }
```

An existing example becomes a level-2 child by adding `parent`/`parentPart`/`level: 2` to its meta.json
(its own drawing is unchanged).

**Kit behaviour** (kit/info.mjs, kit/solid3d.mjs, kit/page.mjs, kit/draft or live as needed):

- The part card of a doorway shows a "Look inside →" action, plus the child's one-line `idea`.
  If the child doesn't exist yet, the card says so quietly ("drawing in progress") and has no link.
- On a 3D page, activating it (the card link, Enter on a focused balloon, or double-click on the part)
  flies the camera in: zoom and look ease toward the part's anchor over about 0.9 s, the other parts fade,
  then the page navigates to the child (its 3D page if `has3d`, else its sheet). Reduced motion: no flight.
- On a 2D sheet the same action eases the viewBox in on the part, then navigates.
- The child arrives with `?from=<parent>`; a breadcrumb in the bar (Aircraft › Engine › Cylinder) is built
  at build time from the meta.json chain. Each crumb links to its page with `?focus=<part>`, which starts
  that page zoomed on the part and eases out to the whole object (the way back feels like zooming out).
- Links are resolved at build time by page.mjs into a `BP_LINKS` table; examples/ uses
  `../<slug>/<slug>-3d.html` / `../<slug>/<slug>.html`; site/build.mjs rewrites to `../3d/<slug>.html` /
  `../sheets/<slug>.html` the way it already rewrites the 3D button.
- The site gets an atlas section (the aircraft as the hero of it, its systems as a grid) and the
  collection groups children under their parent. sitemap and llms.txt include the new pages.

## Rules for everyone

- Same kit, same standards as the 21 examples (references/kit.md, conventions.md, 3d.md).
- **Level 0 is light.** The whole-aircraft 3D scene stays inside the 3d.md budget (≤150k triangles,
  ≤250 draw calls, ≤60 parts): each system is a simple, recognisable solid at this level; detail lives
  one level down.
- **Machine load:** run headless Chrome checks one at a time, never in parallel; prefer `--gpu` for 3D
  shots; make sure no Chrome you started is left running when you finish.
- Don't commit, push or publish. Leave the work in the tree for review.
