# Blueprint

**A skill for Claude Code.** Name a mechanism, or an idea, and Claude drafts the live engineering drawing that explains it: an A2 sheet with a section through the mechanism, ISO line types and material hatching, true dimensions, detail views, balloons, a parts list and a title block. The parts move, and every number on the sheet comes from one physical model.

**Website and all example sheets, live:** https://harifed.github.io/blueprint/

## Install

```
npx @harifed/blueprint
```

This copies the skill into `~/.claude/skills/blueprint`. Options: `--project` installs into `./.claude/skills` instead, `--no-examples` skips the example sheets, and `--force` replaces an existing install. You can also clone it:

```
git clone https://github.com/hariFED/blueprint ~/.claude/skills/blueprint
```

Requires Node.js 20+, plus Chrome, Chromium or Edge for the checks. Restart Claude Code, then:

```
/blueprint explain how a pin tumbler lock opens
/blueprint draw debounce as a real mechanism
```

## The idea

**The cut is the explanation.** Choose the real object whose mechanism *is* the idea, then choose the one cutting plane that exposes it. Abstract ideas become mechanisms first: a rate limiter is a cistern with a fixed refill, debounce is a door closer.

## What's in the box

- `SKILL.md`: the rules and the 11-step workflow Claude follows.
- `kit/`: the drafting kit (pure SVG functions), the live runtime, the in-page check and the page builder.
- `scripts/`: headless-Chrome screenshots and the layout check (`check.mjs`, `shot.mjs`, `build-all.mjs`, `check-all.mjs`).
- `references/`: drafting conventions, the kit API and sheet planning.
- `examples/`: example sheets, each with a model, parts, a build script and its page code.
- `site/`: the website generator (writes `docs/`).

## Use the kit in your own code

```js
import * as K from "@harifed/blueprint/kit/draft";

const V = K.view({ x: 190, y: 780, scale: 1 / 2.5 });
const tube = K.revolve([[16, 34], [17.5, 34], [17.5, 384], [16, 384]]);
const svg = K.section(V, tube, { mat: "alu", angle: 45 });
```

## Develop

```
npm run build     # build every example page
npm run check     # layout check of every example at its tour times and phone width
npm run site      # build the website into docs/
```

## Licence

MIT. Inspired by Ryan's [Anatomy](https://skills.wheresryan.sh/anatomy).
