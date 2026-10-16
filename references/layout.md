# Planning the sheet

## A2 in sheet units

The sheet is 1200 × 848. The frame's inner border sits 24 in from the edge; zone letters and numbers live in the margin. A workable plan for a Sheet:

```
x 24 ─────────── 380 ───────────── 770 ──────────────── 1176
  │ MAIN VIEW      │ DIAGRAM        │ VIEW C / dial       │  y 24
  │ (the section,  │                │                     │
  │  full height)  │ DETAIL D       │ NOTES               │  y 260
  │                │                ├─────────────────────┤
  │                │ DETAIL B       │ PARTS LIST          │  y ~350
  │                │ (circle)       │                     │
  │                │                ├─────────────────────┤  y 708
  │                │                │ TITLE BLOCK + LIVE  │
  └────────────────┴────────────────┴─────────────────────┘  y 824
```

Fit the main view first: the tallest pose of the moving parts (with its phantom) must fit between the view title and the lowest dimension. Work out every view's origin as numbers before writing geometry, and keep them in one `VIEWS` object that the page reads back (`data-views`), so the build and the page agree.

## Moving parts and annotations

A sheet that moves has to be clear in every frame, not only at rest:

- **Sweep zones.** For each moving assembly, mark the band its silhouette sweeps. No static balloon, label or dimension may sit in it. In the pump, every static balloon on the left sits below the handle's lowest position.
- **Ride along.** Balloons on moving parts go in a group that gets the same transform as the parts (`mvb-main`). Put them where the assembly's own empty space is (below the grips), so they never meet static ones.
- **Rigid bodies move together.** Things on the same rigid assembly never collide with each other, so annotate a moving assembly from its own side of the sheet.
- **Details that ride along.** A detail of a moving part (Detail D) can be drawn in the part's own frame: the piston stays put on the paper and the barrel wall is the same at every height, so the detail is static and only what changes *shape* (the cup lip) is redrawn.
- **Live dimensions** run from a fixed reference (the phantom extreme position) to the moving part, on the side away from other annotations. When the span is short the kit moves arrows and text outside; leave room for that.
- **Phantoms** show the other extreme of travel. They are `data-role="phantom"`, so annotations may cross them.

Run `scripts/check.mjs` with `--times` spread across a whole cycle of the tour (and the tour's reset): a collision usually happens in one pose only.

## The accent

Pick the one thing to watch. For a machine that moves a fluid, it is the fluid: stipple it with the accent (`url(#air)` in the example) and set its `fill-opacity` from the model, so pressure reads as density. Use the same accent for the chart's current curve and its dot. Nothing else gets the accent.
