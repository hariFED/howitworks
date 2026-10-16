// Live runtime for a blueprint sheet: one time-based loop, an idle tour, input wake-ups,
// offscreen and hidden-tab pauses, reduced motion, and deterministic frames for checks.
//
// URL parameters (all optional):
//   ?t=6.5            render the tour at 6.5 s, deterministically, and stop (for screenshots)
//   ?theme=paper      blueprint | paper | dark
//   ?zoom=x,y,w,h     show only this sheet region, filling the window (for 4x close-ups)
//   ?check=1          run the layout self-check after the first frame (see selfcheck.mjs)

export function params() {
  const q = new URLSearchParams(location.search);
  return {
    t: q.has("t") ? Number(q.get("t")) : null,
    theme: q.get("theme"),
    zoom: q.get("zoom"),
    check: q.has("check"),
  };
}

export const THEMES = ["blueprint", "paper", "dark"];

export function setupPage(svg) {
  const q = params();
  // the page's own default (writePage's `theme`), then a saved choice, then ?theme=, which wins but isn't saved
  const fallback = document.documentElement.dataset.theme || "blueprint";
  const pick = (name, save) => {
    if (!THEMES.includes(name)) return;
    document.documentElement.dataset.theme = name;
    for (const b of document.querySelectorAll("[data-theme-pick]")) b.setAttribute("aria-pressed", String(b.dataset.themePick === name));
    if (save) {
      try {
        localStorage.setItem("bp-theme", name);
      } catch {}
    }
  };
  let saved = null;
  try {
    saved = localStorage.getItem("bp-theme");
  } catch {}
  pick(q.theme ?? saved ?? fallback, false);
  for (const b of document.querySelectorAll("[data-theme-pick]")) b.addEventListener("click", () => pick(b.dataset.themePick, true));
  if (q.zoom) {
    const box = q.zoom.split(",").map(Number);
    if (box.length === 4 && box.every(Number.isFinite)) {
      svg.setAttribute("viewBox", box.join(" "));
      document.body.classList.add("bp-zoom");
    }
  }
  return q;
}

// Critically damped follow toward a target: calm, no overshoot, frame-rate independent.
export function follow(at, want, rate, dt) {
  return want + (at - want) * Math.exp(-rate * dt);
}

export const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

// run({ root, step, render, idleAfter })
//   step(dt, live) advances the model; live.touring says whether the idle tour drives it.
//   It returns true while something is still settling, so a reduced-motion page can sleep.
//   render(live) writes attributes; it never rebuilds static geometry.
export function run({ root, step, render, idleAfter = 4, onFrozen }) {
  const q = params();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const live = { clock: 0, slow: 1, lastInput: -Infinity, reduced, touring: !reduced, frozen: q.t != null };
  live.input = () => {
    live.lastInput = live.clock;
    live.touring = false;
    wake();
  };

  if (live.frozen) {
    const dt = 1 / 240;
    for (let t = 0; t < q.t; t += dt) {
      live.clock = t;
      live.touring = true;
      step(dt, live);
    }
    render(live);
    onFrozen?.(live);
    return live;
  }

  let raf = 0;
  let last = 0;
  let visible = true;
  function frame(now) {
    raf = 0;
    const real = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    live.clock += real;
    live.touring = !reduced && live.clock - live.lastInput > idleAfter;
    const busy = step(real * live.slow, live);
    render(live);
    if (visible && !document.hidden && (!reduced || busy)) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  function wake() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  live.wake = wake;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    }).observe(root);
  }
  document.addEventListener("visibilitychange", wake);
  render(live);
  wake();
  return live;
}

// Vertical drag on an element, reported as a sheet-unit delta since the press.
export function dragY(svg, el, { start, move, end }) {
  let id = null;
  let y0 = 0;
  const toSheet = (e) => {
    const m = svg.getScreenCTM();
    return m ? (e.clientY - m.f) / m.d : e.clientY;
  };
  el.addEventListener("pointerdown", (e) => {
    id = e.pointerId;
    el.setPointerCapture(id);
    y0 = toSheet(e);
    start?.();
    e.preventDefault();
  });
  el.addEventListener("pointermove", (e) => {
    if (e.pointerId === id) move(toSheet(e) - y0);
  });
  const stop = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    end?.();
  };
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointercancel", stop);
}

// Announce a readout to screen readers at most every `every` seconds.
export function announcer(el, every = 1.5) {
  let lastAt = -Infinity;
  let lastText = "";
  return (text, clock) => {
    if (text === lastText || clock - lastAt < every) return;
    lastAt = clock;
    lastText = text;
    el.textContent = text;
  };
}
