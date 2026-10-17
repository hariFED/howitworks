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

export function attach({ info, root = document }) {
  if (!info || !Object.keys(info).length) return null;
  const card = document.createElement("div");
  card.className = "bp-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-live", "polite");
  card.hidden = true;
  document.body.appendChild(card);

  let shown = null;
  let pinned = false;

  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
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
    const raw = String(b.dataset.target || b.dataset.part || b.querySelector("text")?.textContent || "").trim();
    // a second copy of a part ("3u" in a 3D scene) shares its card with the item number it starts with
    const n = info[raw] ? raw : raw.match(/^\d+/)?.[0];
    return n && info[n] ? n : null;
  };

  function light(id) {
    for (const el of document.querySelectorAll(".bp-hl")) el.classList.remove("bp-hl");
    if (id != null) for (const el of document.querySelectorAll(`svg [data-part="${CSS.escape(id)}"]`)) if (!el.closest("#ov")) el.classList.add("bp-hl");
    document.dispatchEvent(new CustomEvent("bp:part", { detail: { id } }));
  }

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
      card.innerHTML =
        `<div class="bp-card-h"><span class="bp-card-n">${esc(id)}</span><b>${esc(p.name)}</b></div>` +
        (sub ? `<div class="bp-card-s">${sub}</div>` : "") +
        (p.note ? `<p>${esc(p.note)}</p>` : "") +
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

  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && shown) hide();
  });

  // keyboard: static (2D) balloons are focusable buttons; Enter or focus shows the card
  for (const b of root.querySelectorAll('[data-role="balloon"]')) {
    const id = numberOf(b);
    if (!id) continue;
    b.setAttribute("tabindex", "0");
    b.setAttribute("role", "button");
    b.setAttribute("aria-label", `Part ${id}: ${info[id].name}`);
    const at = () => { const r = b.getBoundingClientRect(); return [r.right, r.top]; };
    b.addEventListener("focus", () => show(id, ...at()));
    b.addEventListener("blur", () => { if (!pinned) hide(); });
    b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pinned = true; shown = null; show(id, ...at()); } });
  }

  addEventListener("scroll", () => { if (shown && !pinned) hide(); }, { passive: true });
  return { show, hide };
}
