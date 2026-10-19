// Part cards: hover, tap or focus a balloon and a small card names the part, gives its size and
// material, and says in a sentence what it does. The part it points to lights up in the accent.
//
// Works on both pages: a 2D sheet's balloons are <g data-role="balloon" data-target="n">, a 3D page's
// are <g data-part="n"> in its overlay (re-drawn every frame, so everything here is delegated and
// keyed on the number, never on the element). The data comes from examples/<slug>/info.json, which
// kit/page.mjs inlines as BP_INFO when it exists:
//   { "4": { "name": "O-ring", "spec": "33 × 2", "material": "NBR 70", "note": "Seals the barrel..." } }
// 2D: the part's [data-part] groups get the class bp-hl.  3D: a "bp:part" event (detail.id, or null)
// that kit/solid3d.mjs answers by tinting the part.
//
// Atlas (references/atlas.md): a part with "open": "<slug>" is a doorway into another example. Its card
// adds the child's idea and a "Look inside →" link (or "drawing in progress" while the child is not
// drawn). Activating it (the link, Enter on the focused balloon, double-click on the part in 3D) flies
// in and then navigates: a "bp:open" event (detail { id, href, go }) that kit/solid3d.mjs takes over
// by calling preventDefault (it flies the camera, then calls go); on a 2D sheet the viewBox eases in on
// the part here. links: page.mjs's BP_LINKS; atlas: BP_ATLAS, the page's own slug and place.
// The page also answers ?focus=<part> (start zoomed on that part, ease out) and ?from=<slug> (a short
// zoom-out on arrival); on a 3D page kit/solid3d.mjs does both.

export function attach({ info = {}, links = null, atlas = null, root = document }) {
  info = info || {};
  const has = Object.keys(info).length > 0;
  const Q = new URLSearchParams(location.search);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const is3d = !!document.getElementById("gl");
  // no flights in a deterministic frame, a sheet's ?zoom= close-up or a check run
  const still = reduced || Q.has("t") || Q.has("check") || (!is3d && Q.has("zoom"));
  const sheet = is3d ? null : root.querySelector("svg.bp-sheet");
  if (!has && !atlas) return null;

  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

  function light(id) {
    for (const el of document.querySelectorAll(".bp-hl")) el.classList.remove("bp-hl");
    if (id != null) for (const el of document.querySelectorAll(`svg [data-part="${CSS.escape(id)}"]`)) if (!el.closest("#ov")) el.classList.add("bp-hl");
    document.dispatchEvent(new CustomEvent("bp:part", { detail: { id } }));
  }

  // ---- atlas: where a doorway leads, and the flight there
  // { slug, href } for a doorway whose child is drawn, { slug, wip: true } while it is not, else null
  const doorway = (id) => {
    const slug = info[id]?.open;
    if (!slug) return null;
    const l = links?.[slug];
    const href = l ? (is3d ? l.href3d || l.href2d : l.href2d) || l.href : null;
    if (!href) return { slug, wip: true };
    const from = atlas?.slug ? `${href.includes("?") ? "&" : "?"}from=${encodeURIComponent(atlas.slug)}` : "";
    return { slug, href: href + from, title: l.title, idea: l.idea };
  };
  let going = false;
  function go(id) {
    const d = doorway(id);
    if (!d?.href || going) return;
    going = true;
    // inside a frame (a landing-page hero) the whole window goes, not the little frame
    const nav = () => {
      const abs = new URL(d.href, location.href).href;
      try { if (window.top !== window) return window.top.location.assign(abs); } catch {}
      location.assign(abs);
    };
    if (still) return nav();
    hide();
    // a 3D page flies its camera and calls go; otherwise a sheet zooms its viewBox; else straight there
    const ev = new CustomEvent("bp:open", { cancelable: true, detail: { id, href: d.href, go: nav } });
    if (!document.dispatchEvent(ev)) return;
    if (sheet) flySheet(id, nav);
    else nav();
  }

  // 2D: the sheet's viewBox, eased between two boxes [x, y, w, h]
  const full = sheet ? (sheet.getAttribute("viewBox") || "0 0 1200 848").split(/[\s,]+/).map(Number) : null;
  let anim = 0;
  function tween(a, b, ms, done) {
    cancelAnimationFrame(anim);
    const t0 = performance.now();
    const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
    const step = (now) => {
      const k = ease((now - t0) / ms);
      sheet.setAttribute("viewBox", a.map((v, i) => +(v + (b[i] - v) * k).toFixed(2)).join(" "));
      if (now - t0 < ms) anim = requestAnimationFrame(step);
      else done?.();
    };
    anim = requestAnimationFrame(step);
  }
  // the part's box in sheet units: of the view (data-geom) nearest its balloon's leader end, padded
  // and grown to the sheet's aspect
  function partBox(id) {
    if (!sheet) return null;
    const inv = sheet.getScreenCTM()?.inverse();
    if (!inv) return null;
    const pt = (x, y) => new DOMPoint(x, y).matrixTransform(inv);
    const groups = new Map();
    for (const el of sheet.querySelectorAll(`[data-part="${CSS.escape(id)}"]`)) {
      if (el.closest('[data-role="balloon"]')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      const a = pt(r.left, r.top);
      const b = pt(r.right, r.bottom);
      const key = el.closest("[data-geom]") ?? sheet;
      const g = groups.get(key) ?? [Infinity, Infinity, -Infinity, -Infinity];
      groups.set(key, [Math.min(g[0], a.x), Math.min(g[1], a.y), Math.max(g[2], b.x), Math.max(g[3], b.y)]);
    }
    if (!groups.size) return null;
    const at = sheet.querySelector(`[data-role="balloon"][data-target="${CSS.escape(id)}"]`)?.dataset.at?.split(/\s+/).map(Number);
    let best = null;
    let score = Infinity;
    for (const g of groups.values()) {
      const s = at ? Math.hypot((g[0] + g[2]) / 2 - at[0], (g[1] + g[3]) / 2 - at[1]) : -(g[2] - g[0]) * (g[3] - g[1]);
      if (s < score) [score, best] = [s, g];
    }
    const [x0, y0, x1, y1] = best;
    let w = Math.max(24, (x1 - x0) * 1.5);
    let h = Math.max(24, (y1 - y0) * 1.5);
    const aspect = full[2] / full[3];
    if (w / h < aspect) w = h * aspect;
    else h = w / aspect;
    w = Math.min(w, full[2]);
    h = Math.min(h, full[3]);
    return [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h];
  }
  function flySheet(id, nav) {
    const box = partBox(id);
    if (!box) return nav();
    light(id);
    sheet.classList.add("bp-flying");
    tween(full, box, 900, nav);
  }
  // back to this page from the browser's cache: the whole sheet, not the end of the flight
  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    going = false;
    if (sheet) {
      cancelAnimationFrame(anim);
      sheet.setAttribute("viewBox", full.join(" "));
      sheet.classList.remove("bp-flying");
      light(null);
    }
  });
  // arriving: ?focus=<part> starts on that part and eases out to the whole sheet; ?from= a short zoom-out
  if (sheet && !still) {
    const focus = Q.get("focus");
    const box = focus ? partBox(focus) : null;
    if (box) {
      sheet.setAttribute("viewBox", box.join(" "));
      if (info[focus]) light(focus);
      tween(box, full, 900, () => setTimeout(() => light(null), 600));
    } else if (Q.has("from")) {
      const z = 1 / 1.35;
      const a = [full[0] + (full[2] * (1 - z)) / 2, full[1] + (full[3] * (1 - z)) / 2, full[2] * z, full[3] * z];
      sheet.setAttribute("viewBox", a.join(" "));
      tween(a, full, 650);
    }
  }
  if (!has) return null;

  const card = document.createElement("div");
  card.className = "bp-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-live", "polite");
  card.hidden = true;
  document.body.appendChild(card);

  let shown = null;
  let pinned = false;

  // the balloon under an element, and its part number
  const balloonOf = (el) => el?.closest?.('[data-role="balloon"], #ov [data-part], .v3-stage [data-part]');
  // the balloon at a point: look through transparent drag targets (a sheet's hit rectangles lie over
  // its balloons in places), never through real geometry
  const balloonAt = (x, y) => {
    for (const el of document.elementsFromPoint(x, y)) {
      const b = balloonOf(el);
      if (b) return b;
      if (!el.matches?.("[data-drag], .hit")) return null;
    }
    return null;
  };
  const numberOf = (b) => {
    if (!b) return null;
    return partNo(b.dataset.target || b.dataset.part || b.querySelector("text")?.textContent);
  };
  // a second copy of a part ("3u" in a 3D scene) shares its card with the item number it starts with
  const partNo = (v) => {
    const raw = String(v ?? "").trim();
    const n = info[raw] ? raw : raw.match(/^\d+/)?.[0];
    return n && info[n] ? n : null;
  };

  function place(x, y) {
    const pad = 12;
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    let left = x + 16;
    let top = y + 16;
    if (left + w > innerWidth - pad) left = x - w - 16;
    if (left < pad) left = pad;
    if (top + h > innerHeight - pad) top = y - h - 16;
    if (top < pad) top = pad;
    card.style.left = `${left + scrollX}px`;
    card.style.top = `${top + scrollY}px`;
  }

  function show(id, x, y) {
    const p = info[id];
    if (!p) return hide();
    if (shown !== id) {
      const sub = [p.spec, p.material, p.qty && p.qty !== "1" ? `× ${p.qty}` : ""].filter(Boolean).map(esc).join(" · ");
      const d = doorway(id);
      const door = !d
        ? ""
        : d.href
          ? (d.idea ? `<p class="bp-card-i">${esc(d.idea)}</p>` : "") + `<a class="bp-card-go" href="${esc(d.href)}" data-open="${esc(id)}">${esc(info[id].openLabel || "Look inside")} →</a>`
          : `<div class="bp-card-wip">Inside: drawing in progress</div>`;
      card.innerHTML =
        `<div class="bp-card-h"><span class="bp-card-n">${esc(id)}</span><b>${esc(p.name)}</b></div>` +
        (sub ? `<div class="bp-card-s">${sub}</div>` : "") +
        (p.note ? `<p>${esc(p.note)}</p>` : "") +
        door +
        (pinned ? `<div class="bp-card-x">Esc or click elsewhere to close</div>` : "");
      card.hidden = false;
      shown = id;
      light(id);
    }
    place(x, y);
  }

  function hide() {
    card.hidden = true;
    shown = null;
    pinned = false;
    light(null);
  }

  card.addEventListener("click", (e) => {
    const a = e.target.closest?.("[data-open]");
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return; // a new tab: let the link be a link
    e.preventDefault();
    go(a.dataset.open);
  });

  // hover (pointer): follow whatever balloon is under the pointer; the 3D overlay is re-drawn each
  // frame, so ask the document what is under the pointer rather than trusting enter/leave events
  addEventListener("pointermove", (e) => {
    if (pinned || e.pointerType === "touch") return;
    const id = numberOf(balloonAt(e.clientX, e.clientY));
    if (id) show(id, e.clientX, e.clientY);
    else if (shown) hide();
  }, { passive: true });

  // click or tap pins the card; it must not start an orbit or a drag underneath
  addEventListener("pointerdown", (e) => {
    const b = balloonAt(e.clientX, e.clientY);
    const id = numberOf(b);
    if (id) {
      e.stopPropagation();
      e.preventDefault();
      pinned = false;
      shown = null;
      pinned = true;
      show(id, e.clientX, e.clientY);
    } else if (pinned && !card.contains(e.target)) hide();
  }, true);
  // double-click a doorway's balloon: straight in
  addEventListener("dblclick", (e) => {
    const id = numberOf(balloonAt(e.clientX, e.clientY));
    if (id && doorway(id)?.href) {
      e.preventDefault();
      go(id);
    }
  });
  // double-click on a doorway part in 3D: kit/solid3d.mjs names the part under the pointer
  document.addEventListener("bp:dblpart", (e) => {
    const id = partNo(e.detail?.id);
    if (id && doorway(id)?.href) {
      e.preventDefault();
      go(id);
    }
  });

  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && shown) hide();
  });

  // keyboard: static (2D) balloons are focusable buttons; focus shows the card, Enter or Space pins
  // it, and Enter on a doorway's balloon looks inside
  for (const b of root.querySelectorAll('[data-role="balloon"]')) {
    const id = numberOf(b);
    if (!id) continue;
    const d = doorway(id);
    b.setAttribute("tabindex", "0");
    b.setAttribute("role", "button");
    b.setAttribute("aria-label", `Part ${id}: ${info[id].name}${d?.href ? `. Enter to look inside: ${d.title}` : d ? ". Inside: drawing in progress" : ""}`);
    const at = () => { const r = b.getBoundingClientRect(); return [r.right, r.top]; };
    b.addEventListener("focus", () => show(id, ...at()));
    b.addEventListener("blur", () => { if (!pinned) hide(); });
    b.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && d?.href) { e.preventDefault(); go(id); return; }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pinned = true; shown = null; show(id, ...at()); }
    });
  }

  // keyboard on a 3D page: its balloons are drawn afresh every frame and can't hold focus, so the
  // doorways get a short list of real buttons, out of sight until focused; each shows its card at
  // its balloon, Enter looks inside
  const doors = Object.keys(info).filter((id) => doorway(id));
  const stage = document.getElementById("stage");
  if (is3d && stage && doors.length) {
    const nav = document.createElement("nav");
    nav.className = "bp-doors";
    nav.setAttribute("aria-label", "Look inside a part");
    nav.innerHTML = doors.map((id) => { const d = doorway(id); return `<button type="button" data-door="${esc(id)}"${d.href ? "" : " aria-disabled=\"true\""}>${esc(id)} ${esc(info[id].name)}${d.href ? " →" : " · in progress"}</button>`; }).join("");
    stage.before(nav); // not inside the stage: it is role="img", whose children are presentational
    const where = (id, btn) => {
      const g = document.querySelector(`#ov [data-part="${CSS.escape(id)}"]`);
      const r = (g ?? btn).getBoundingClientRect();
      return [r.right, r.top];
    };
    nav.addEventListener("focusin", (e) => { const id = e.target.dataset?.door; if (id) { shown = null; show(id, ...where(id, e.target)); } });
    nav.addEventListener("focusout", () => { if (!pinned) hide(); });
    nav.addEventListener("click", (e) => { const id = e.target.closest?.("[data-door]")?.dataset.door; if (id) go(id); });
    nav.addEventListener("keydown", (e) => e.stopPropagation()); // its keys are its own, not the stage's
  }

  addEventListener("scroll", () => { if (shown && !pinned) hide(); }, { passive: true });
  return { show, hide, go };
}
