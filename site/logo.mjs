// The howitworks mark: a spur gear cut on its centre line. The left half is the gear's outside; the
// right half is the cut face, hatched in the accent, with the bore and a centre line through it —
// "the cut is the explanation" as a symbol. Pure: returns SVG strings.

const f = (n) => Math.round(n * 100) / 100;

// A gear outline: `teeth` trapezoid teeth between a root and a tip radius.
export function gearPath({ cx = 0, cy = 0, teeth = 10, tip = 10, root = 7.9, phase = 0 } = {}) {
  const pts = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step + phase;
    // root land, flank up, tip land, flank down (tip land narrower than the root land)
    for (const [r, t] of [[root, -0.5], [root, -0.27], [tip, -0.17], [tip, 0.17], [root, 0.27]]) {
      pts.push([cx + r * Math.cos(a + t * step), cy + r * Math.sin(a + t * step)]);
    }
  }
  return "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "Z";
}

// The mark, in a 32 × 32 box. `ink` and `accent` are CSS colours (tokens on the page).
export function mark({ size = 32, ink = "currentColor", accent = "#e2552c", id = "hiw", title = "howitworks" } = {}) {
  const c = 16;
  const gear = gearPath({ cx: c, cy: c, teeth: 10, tip: 12.4, root: 9.8, phase: Math.PI / 10 });
  const bore = 3.6;
  // hatch lines across the right half, clipped to the gear minus the bore
  let hatch = "";
  for (let x = -40; x <= 32; x += 2.3) hatch += `M${f(c + x)} ${f(c - 16)}L${f(c + x + 32)} ${f(c + 16)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}" role="img" aria-label="${title}">
<title>${title}</title>
<defs>
<clipPath id="${id}-r"><rect x="${c}" y="0" width="16" height="32"/></clipPath>
<clipPath id="${id}-l"><rect x="0" y="0" width="${c}" height="32"/></clipPath>
<mask id="${id}-m"><path d="${gear}" fill="#fff"/><circle cx="${c}" cy="${c}" r="${bore}" fill="#000"/></mask>
</defs>
<g clip-path="url(#${id}-r)">
<path d="${gear}" fill="${accent}" fill-opacity=".1" mask="url(#${id}-m)"/>
<path d="${hatch}" stroke="${accent}" stroke-width=".75" mask="url(#${id}-m)"/>
<path d="${gear}" fill="none" stroke="${ink}" stroke-width="1.15" stroke-linejoin="round"/>
<circle cx="${c}" cy="${c}" r="${bore}" fill="none" stroke="${ink}" stroke-width="1"/>
</g>
<g clip-path="url(#${id}-l)">
<path d="${gear}" fill="none" stroke="${ink}" stroke-width="1.15" stroke-linejoin="round"/>
<circle cx="${c}" cy="${c}" r="${f(bore + 2.6)}" fill="none" stroke="${ink}" stroke-width=".55"/>
<circle cx="${c}" cy="${c}" r="${bore}" fill="none" stroke="${ink}" stroke-width="1"/>
</g>
<path d="M${c} 0.8V31.2" stroke="${ink}" stroke-width=".55" stroke-dasharray="4.2 1.3 .9 1.3"/>
</svg>`;
}

// The margin pointer: the same gear, small, all ink-and-accent, turned by CSS as it travels.
export function pointer({ id = "hiwp" } = {}) {
  const c = 8;
  const gear = gearPath({ cx: c, cy: c, teeth: 8, tip: 7, root: 5.4, phase: Math.PI / 8 });
  return `<svg class="ptr" viewBox="0 0 16 16" aria-hidden="true"><g class="ptr-g"><path d="${gear}" fill="var(--accent)" fill-opacity=".14" stroke="var(--accent)" stroke-width="1.1" stroke-linejoin="round"/><circle cx="${c}" cy="${c}" r="2" fill="none" stroke="var(--accent)" stroke-width="1"/><path d="M${c} 1.4V14.6" stroke="var(--accent)" stroke-width=".6"/></g></svg>`;
}
