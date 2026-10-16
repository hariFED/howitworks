# Drafting conventions

The rules a checker would mark you down for. Based on ISO 128 (lines, sections), ISO 129 (dimensions), ISO 5455 (scales), ISO 7200 (title blocks) and common ANSI hatch patterns. On an A2 sheet drawn 1200 units wide, 1 sheet mm ≈ 2.02 units.

## Lines

| Line | Class | Use |
|---|---|---|
| Continuous thick | `vis` | Visible edges and outlines, cut-face boundaries |
| Continuous thin | `thin` | Dimension and extension lines, leaders, hatching, thread roots, short centre marks, break lines, imaginary intersections |
| Dashed thin | `hid` | Hidden edges, only where they clarify (a socket in a screw head) |
| Long-dash dot thin | `ctr` | Axes, centre lines, pitch circles, paths of motion |
| Long-dash double-dot thin | `phan` | Alternate and extreme positions of moving parts, adjacent parts |

Thick is twice thin (`--bp-thick` 1.15, `--bp-thin` 0.55). Centre lines run a little past the outline and cross on dashes, not gaps. Never use a thick line for annotation.

## Sections

- **Cutting plane.** Choose the plane through the mechanism. A full section through an axis of symmetry needs no cutting-plane line if it's labelled (AXIAL SECTION); otherwise draw the plane in another view (chain, thick at the ends, arrows, letters) and label the view SECTION A-A.
- **Removed material.** Everything in front of the plane is gone. What is behind it is drawn: in a bore, every circle on the inner surface shows edge-on as a line across the bore (`revolve` computes these; switch them off where another part covers them).
- **Hatching.** Thin lines, usually at 45°. Spacing set in sheet units and the *same in every view*, regardless of scale. Different materials get different patterns (`MATERIALS`: steel, iron, alu, brass, bronze, rubber, plastic, foam, wood). Adjacent parts get different angles (45 / 135 / 30 / 60). One part keeps one pattern and angle in every view.
- **Not hatched when cut lengthwise:** shafts, rods, spindles, pins, keys, rivets, bolts, screws, nuts, washers in bolt joints, balls and rollers, ribs and webs, spokes, teeth. Draw them as `body` (paper fill, visible outline).
- **Thin sections** (sheet metal, tube walls, gaskets under ~1.5 units): solid black (`mat: "solid"`), with a small white gap between adjacent ones.
- **Springs in section:** wire cross-sections blacked in on both sides, half a pitch apart, joined by the back half of each turn.
- **Threads:** crests thick, roots thin. In a tapped hole in section, the minor diameter is thick and hatching runs to it.

## Dimensions

- Measure from the geometry, never type the number. A live dimension updates its value from the model each frame.
- Extension lines start a small gap from the object and run a few units past the dimension line.
- Filled arrowheads, about 3 mm (7 units) long. If the arrows don't fit, put them outside pointing in; if the text doesn't fit, put it beyond the end.
- Text sits just above a horizontal dimension line and reads from the right on a vertical one (rotated −90°).
- Dimension each feature once, in the view where it is clearest, outside the outline where you can. Never to a hidden line. Stack parallel dimensions with the shorter inside, at least 7 mm (14 units) apart.
- Diameters carry `Ø`, radii `R`. Units (mm) go in the title block, not after every number.

## Scales

Standard: 1:1, 1:2, 1:2.5, 1:5, 1:10, 1:20 and 2:1, 5:1, 10:1. Every view states its scale under its title. Hatch spacing, line weights, arrowheads and lettering never scale with the view.

## Views

- **Main view** shows the mechanism, usually as a section.
- **Detail** (DETAIL B, 2:1): a thin circle with its letter in the parent view, the enlarged geometry clipped to a circle or rounded rectangle, labelled and scaled. Same geometry functions, a bigger view.
- **View in a direction** (VIEW C): an arrow with a letter pointing at the face, the view drawn and labelled elsewhere.
- **Diagram**: a chart of the model's key relation, drawn with the sheet's line types, its curve in the accent.

## Balloons and the parts list

- One balloon per part, a circle with the item number, a thin leader ending in a dot on the part (an arrow if it touches an edge). Leaders don't cross each other and cross as few lines as possible.
- Arrange balloons in tidy rows or columns.
- The parts list sits on the title block, item 1 at the bottom, columns ITEM, DESCRIPTION (with standard size), MATERIAL (a real grade), QTY. Standard parts name their standard (ISO 4762, ISO 4032).

## Title block

Bottom right. Title, drawing number, scale, sheet size, sheet number, drawn by, date, material, general tolerances (ISO 2768-m), units, and here the live readout with its hint as the caption.

## Lettering

Capitals, one typeface, 3.5 mm (≈ 9.5 units) for general text, 2.5 mm (7.6) for tables and captions, 5 mm (12) for view titles. Lettering never touches a line. Inside the drawing only engraved markings that belong to the object (dial numbers, a stamped label).
