// Layout self-check, run in the page with ?check=1 (scripts/check.mjs drives it headlessly).
// It writes a JSON report into <pre id="bp-check"> and to the console. A clean sheet reports
// zero failures in every category.
//
//   text-overlap      two pieces of lettering touch
//   text-on-geometry  lettering sits on a part or on another annotation's lines
//   outside-frame     an annotation or a view crosses the drawing frame
//   balloon-target    a balloon's dot is not on the part it names
//   balloon-on-geom   a balloon circle sits on a part
//   hard-colour       a fill or stroke is a literal colour instead of a token
//   sideways-scroll   the page scrolls horizontally

const roleOf = (el) => el.closest("[data-role]")?.dataset.role ?? "";

// A clipped group's box is its clip region's box (getBoundingClientRect ignores clipping).
function clippedBox(el) {
  const ref = el.getAttribute("clip-path")?.match(/url\(#([^)]+)\)/)?.[1];
  const shape = ref && document.getElementById(ref)?.firstElementChild;
  if (!shape) return el.getBoundingClientRect();
  const b = shape.getBBox();
  const m = shape.ownerSVGElement.getScreenCTM();
  const x0 = m.a * b.x + m.e;
  const y0 = m.d * b.y + m.f;
  return { left: x0, top: y0, right: x0 + m.a * b.width, bottom: y0 + m.d * b.height };
}

export function selfCheck(svg) {
  const fails = [];
  const fail = (kind, what) => fails.push({ kind, what });
  const label = (el) => {
    const g = el.closest("[data-role],[data-part],[data-geom]");
    const name = g?.id || g?.dataset.part || g?.dataset.target || g?.dataset.role || g?.dataset.geom || el.tagName;
    return `${name}: "${(el.textContent || "").trim().slice(0, 24)}"`;
  };
  const shown = (el) => {
    const b = el.getBoundingClientRect();
    if (b.width < 0.5 || b.height < 0.5) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
  };
  const texts = [...svg.querySelectorAll("text")].filter(shown);
  const boxes = texts.map((t) => t.getBoundingClientRect());
  const grow = 0.4;
  const hit = (a, b) => a.left < b.right - grow && b.left < a.right - grow && a.top < b.bottom - grow && b.top < a.bottom - grow;

  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++) if (hit(boxes[i], boxes[j])) fail("text-overlap", `${label(texts[i])} × ${label(texts[j])}`);

  const geomOf = (el) => el.closest("[data-geom]");
  for (const [i, t] of texts.entries()) {
    const role = roleOf(t);
    if (role === "engraved" || role === "frame") continue;
    const own = t.closest("[data-role]");
    const b = boxes[i];
    const seen = new Set();
    for (let ix = 0; ix < 4; ix++)
      for (let iy = 0; iy < 2; iy++) {
        const x = b.left + b.width * (0.15 + ix * 0.233);
        const y = b.top + b.height * (0.3 + iy * 0.4);
        for (const el of document.elementsFromPoint(x, y)) {
          if (el === t || el.tagName === "text" || el.tagName === "svg" || el.closest("defs")) continue;
          if (el.classList.contains("tint") || el.classList.contains("hit") || el.closest('[data-role="phantom"]')) continue;
          if (own && own.contains(el)) continue;
          const g = geomOf(el);
          const other = el.closest("[data-role]");
          const bad = (g && !g.contains(t)) || (other && other !== own && other.dataset.role !== "frame" && other.dataset.role !== "chart-bg");
          if (bad && !el.classList.contains("sheet-bg") && !el.classList.contains("grid")) {
            const key = el.closest("[data-part],[data-role],[data-geom]");
            if (!seen.has(key)) {
              seen.add(key);
              fail("text-on-geometry", `${label(t)} on ${key?.dataset.part || key?.id || key?.dataset.role || key?.dataset.geom || el.tagName}`);
            }
          }
        }
      }
  }

  const frameRect = svg.querySelector('[data-role="frame"] rect.vis')?.getBoundingClientRect();
  if (frameRect) {
    for (const el of svg.querySelectorAll("[data-role]:not([data-role=frame]), [data-geom]")) {
      if (el.parentElement?.closest("[data-role]:not([data-role=frame]), [data-geom]")) continue;
      if (!shown(el)) continue;
      const b = clippedBox(el);
      const tol = 0.5;
      if (b.left < frameRect.left - tol || b.right > frameRect.right + tol || b.top < frameRect.top - tol || b.bottom > frameRect.bottom + tol)
        fail("outside-frame", el.id || el.dataset.geom || el.dataset.role);
    }
  }

  for (const g of svg.querySelectorAll('[data-role="balloon"]')) {
    if (!shown(g)) continue;
    const dot = g.querySelector("circle.dot").getBoundingClientRect();
    const x = dot.left + dot.width / 2;
    const y = dot.top + dot.height / 2;
    const target = g.dataset.target;
    const under = document.elementsFromPoint(x, y).some((el) => el.closest(`[data-part="${target}"]`));
    if (!under) fail("balloon-target", `balloon ${g.textContent.trim()} → ${target}`);
    const c = g.querySelector("circle.balloon").getBoundingClientRect();
    const pts = [
      [c.left + c.width * 0.5, c.top + c.height * 0.5],
      [c.left + c.width * 0.2, c.top + c.height * 0.5],
      [c.left + c.width * 0.8, c.top + c.height * 0.5],
      [c.left + c.width * 0.5, c.top + c.height * 0.2],
      [c.left + c.width * 0.5, c.top + c.height * 0.8],
    ];
    if (pts.some(([px, py]) => document.elementsFromPoint(px, py).some((el) => geomOf(el) && !el.classList.contains("tint") && !el.closest('[data-role="phantom"]'))))
      fail("balloon-on-geom", `balloon ${g.textContent.trim()}`);
  }

  for (const el of svg.querySelectorAll("[fill],[stroke]")) {
    if (el.closest("defs") && el.tagName !== "path" && el.tagName !== "circle") continue;
    for (const a of ["fill", "stroke"]) {
      const v = el.getAttribute(a);
      if (v && v !== "none" && !v.startsWith("url(") && v !== "currentColor") fail("hard-colour", `${el.tagName} ${a}=${v}`);
    }
  }

  if (document.documentElement.scrollWidth > window.innerWidth + 1) fail("sideways-scroll", `${document.documentElement.scrollWidth} > ${window.innerWidth}`);

  const kinds = ["text-overlap", "text-on-geometry", "outside-frame", "balloon-target", "balloon-on-geom", "hard-colour", "sideways-scroll"];
  const counts = Object.fromEntries(kinds.map((k) => [k, fails.filter((f) => f.kind === k).length]));
  const report = { ok: fails.length === 0, counts, fails, texts: texts.length, parts: svg.querySelectorAll("[data-part]").length };
  let pre = document.getElementById("bp-check");
  if (!pre) {
    pre = document.createElement("pre");
    pre.id = "bp-check";
    pre.hidden = true;
    document.body.append(pre);
  }
  pre.textContent = JSON.stringify(report);
  console.log("bp-check", JSON.stringify(report.counts));
  return report;
}
