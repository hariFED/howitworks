// Live runtime for a blueprint sheet: one time-based loop, an idle tour, input wake-ups,
// offscreen and hidden-tab pauses, reduced motion, and deterministic frames for checks.
//
// URL parameters (all optional):
//   ?t=6.5            render the tour at 6.5 s, deterministically, and stop (for screenshots)
//   ?theme=paper      blueprint | paper | white | dark
//   ?zoom=x,y,w,h     show only this sheet region, filling the window (for 4x close-ups)
//   ?mask=x,y,w,h     blank everything outside this box, so one view stands alone
//   ?check=1          run the layout self-check after the first frame (see selfcheck.mjs)

export function params() {
  const q = new URLSearchParams(location.search);
  return {
    t: q.has("t") ? Number(q.get("t")) : null,
    theme: q.get("theme"),
    zoom: q.get("zoom"),
    mask: q.get("mask"),
    check: q.has("check"),
  };
}

export const THEMES = ["blueprint", "paper", "white", "dark"];

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
  // ?mask=x,y,w,h paints the page colour over everything outside one box, so a view stands alone
  if (q.mask) {
    const [x, y, w, h] = q.mask.split(",").map(Number);
    if ([x, y, w, h].every(Number.isFinite)) {
      const m = document.createElementNS("http://www.w3.org/2000/svg", "path");
      m.setAttribute("d", `M-9999 -9999H9999V9999H-9999Z M${x} ${y}V${y + h}H${x + w}V${y}Z`);
      m.setAttribute("fill-rule", "evenodd");
      m.setAttribute("style", "fill:var(--bp-page);pointer-events:none");
      m.dataset.role = "mask";
      svg.appendChild(m);
    }
  }
  // The sheet's keys listen on the svg. Make them work without clicking the sheet first: a press on the
  // sheet focuses it (drag handlers cancel pointerdown, which would otherwise skip focus), and a key typed
  // while nothing is focused is passed on to the sheet.
  svg.addEventListener("pointerdown", (e) => {
    if (document.activeElement !== svg && !e.target.closest?.("[tabindex]:not(svg), a, button, input, select, textarea")) svg.focus({ preventScroll: true });
  });
  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || svg.contains(e.target)) return;
    const a = document.activeElement;
    if (a && a !== document.body && a !== document.documentElement) return;
    const fwd = new KeyboardEvent("keydown", { key: e.key, code: e.code, shiftKey: e.shiftKey, repeat: e.repeat, bubbles: true, cancelable: true });
    if (!svg.dispatchEvent(fwd)) e.preventDefault();
  });
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
    // the first frame (and the first after a pause) has no elapsed time: models that divide by the step
    // (a speed from two positions) would turn NaN and stay NaN, so a zero step is not taken
    const busy = real > 0 ? step(real * live.slow, live) : true;
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
