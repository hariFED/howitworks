// Page code for click-pen-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit does the drawing, the camera, explode, balloons and the controls; this file runs the
// push-push cam exactly as the sheet's live.js does (M.settle), poses the rotator, the plunger, the
// refill and the spring from it, and adds the pen's own controls.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });

// ---------------------------------------------------------------- the wrapped cam solids (a kit gap)
// The kit has no solid wrapped round an axis; scene3d.mjs builds those bodies as triangles and leaves
// a placeholder box carrying the spec. Swap the geometry in before anything is measured or drawn.
for (const p of SC.parts()) {
  const rec = V.part(p.id);
  rec.holders.forEach((h) => {
    if (!h.spec.wrap) return;
    const m = SC.wrapMesh(h.spec.wrap);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(m.position, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(m.normal, 3));
    h.mesh.geometry.dispose();
    h.mesh.geometry = geo;
    if (h.lines) {
      h.lines.geometry.dispose();
      h.lines.geometry = new THREE.EdgesGeometry(geo, 35);
    }
  });
}

// ---------------------------------------------------------------- not cut, and the accent
// As on the sheet, the rotator and the plunger are drawn in view, not cut (teeth are never hatched):
// their materials get their own cut switch, held off. The rotator, the part the toggle is about, is
// toned in the accent.
const shared = V.part(1).holders[0].mesh.material.uniforms;
const ACC = { uLit: new THREE.Color(), uMid: new THREE.Color(), uDark: new THREE.Color() };
const MIX = { uLit: 0.38, uMid: 0.62, uDark: 0.7 };
for (const id of SC.WHOLE) {
  for (const h of V.part(id).holders) {
    h.mesh.material.uniforms.uCutOn = { value: 0 };
    if (h.lines) h.lines.material.uniforms.uCutOn = { value: 0 };
    if (id === 11) for (const k of Object.keys(ACC)) h.mesh.material.uniforms[k] = { value: ACC[k] };
  }
}
// The ridges face the axis like the sleeve they hang from, so the toon tones alone cannot tell them
// apart: they are shaded one step darker (grey, not the accent), so the teeth and slots read.
const RIDGE = { uLit: new THREE.Color(), uMid: new THREE.Color(), uDark: new THREE.Color() };
for (const h of V.part(12).holders) if (h.spec.wrap) for (const k of Object.keys(RIDGE)) h.mesh.material.uniforms[k] = { value: RIDGE[k] };
function tones() {
  RIDGE.uLit.copy(shared.uMid.value).lerp(shared.uDark.value, 0.85);
  RIDGE.uMid.copy(shared.uDark.value).lerp(shared.uInk.value, 0.1);
  RIDGE.uDark.copy(shared.uDark.value).lerp(shared.uInk.value, 0.22);
  for (const k of Object.keys(ACC)) ACC[k].copy(shared[k].value).lerp(shared.uAccent.value, MIX[k]);
}

// ---------------------------------------------------------------- state: the 2D sheet's, from the same model
const pen = M.pen();
let push = 0; // button push the thumb applies, mm
let target = 0;
let offX = 0; // display offsets that ease the spring-driven snaps (as the sheet)
let offY = 0;
let dragging = false;
let clickT = -1; // a keyed click in progress

// The tour, as on the sheet: rest, click, write, click, retracted again. Two clicks turn the rotator
// 120°, which brings its three lugs back to the same picture: one full cycle of the toggle.
const PERIOD = 5;
const press = (t, t0) => {
  if (t < t0) return 0;
  if (t < t0 + 0.45) return M.PUSH_MAX * L.ease((t - t0) / 0.45);
  if (t < t0 + 0.6) return M.PUSH_MAX;
  if (t < t0 + 1.05) return M.PUSH_MAX * (1 - L.ease((t - t0 - 0.6) / 0.45));
  return 0;
};
const tour = { t: 0 };
const tourPush = (t) => {
  const p = t % PERIOD;
  return p < 2.9 ? press(p, 0.8) : press(p, 3.4);
};

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    let driven = false;
    if (live.touring && !dragging) {
      tour.t += h;
      push = tourPush(tour.t);
      driven = true;
    } else if (clickT >= 0) {
      clickT += h;
      target = press(clickT, 0);
      if (clickT > 1.1) clickT = -1;
    }
    if (!driven) push = live.reduced ? target : L.follow(push, target, 30, h);
    const q0 = pen.q;
    const x0 = pen.X;
    const y0 = pen.Y;
    M.settle(pen, push);
    if (pen.q !== q0) {
      offX += x0 - pen.X;
      offY += y0 - pen.Y;
    }
    offX = live.reduced ? 0 : L.follow(offX, 0, 40, h);
    offY = live.reduced ? 0 : L.follow(offY, 0, 40, h);
  }
  return Math.abs(push - target) > 1e-4 || Math.abs(offX) > 0.01 || Math.abs(offY) > 1e-3 || clickT >= 0;
}

// ---------------------------------------------------------------- poses from the model
const PLUNGER = [13, 14];
function pose(X, Y, yPt) {
  const du = M.refillEnd(Y) - M.U_R_EXT; // parts are built at EXTENDED
  for (const id of SC.REFILL) V.set(id, { pos: [du, 0, 0] });
  V.set(11, { pos: [du, 0, 0] });
  for (const h of V.part(11).holders) h.holder.rotation.x = (X * Math.PI) / 180;
  V.solid(4, "spring").scale.x = (SC.SPRING_LEN + du) / SC.SPRING_LEN;
  for (const id of PLUNGER) V.set(id, { pos: [yPt - M.YPT_TOP, 0, 0] });
}
// frame the whole travel, so the zoom never pumps
V.frame([() => pose(0, M.Y_RET, M.YPT_TOP), () => pose(30, M.Y_MIN, M.YPT_TOP - M.PUSH_MAX)]);

// Balloons whose anchors fall outside the window (a close-up) are left out: a leader to nowhere says
// nothing. The kit draws a balloon for every part with an anchor, so the anchor is parked meanwhile.
const ANCHORS = new Map(SC.parts().map((p) => [p.id, p.anchor]));
const stage = $("stage");
function pruneBalloons() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  for (const [id, a] of ANCHORS) {
    const rec = V.part(id);
    rec.inner.updateMatrixWorld(true);
    const c = V.cut ? a.cut : a.out.c;
    const p = new THREE.Vector3(...c).applyMatrix4(rec.inner.matrixWorld);
    const [sx, sy] = V.project(p);
    rec.spec.anchor = sx > 40 && sx < w - 40 && sy > 40 && sy < h - 40 ? a : null;
  }
}
let settled = false;

const camAngle = (X) => ((Math.round(X) % 360) + 360) % 360;
const say = L.announcer($("sr"), 2);
function render(live) {
  const X = pen.X + offX;
  const Y = pen.Y + offY;
  pose(X, Y, pen.yPt);
  tones();
  pruneBalloons();
  if (!settled) {
    // the first frame's camera is not placed yet: draw once more with it
    settled = true;
    setTimeout(() => V.redraw(), 0);
  }
  const tip = -M.tipU(Y);
  const state = M.stateName(pen.q);
  const b = M.buttonDepth(pen);
  $("readout").textContent = `${state} · CAM ${camAngle(X)}° · b ${b.toFixed(1)} · TIP ${tip >= 0 ? "+" : "−"}${Math.abs(tip).toFixed(1)} · F ${M.springForce(Y).toFixed(2)} N`;
  say(`${state.toLowerCase()}, cam at ${camAngle(X)} degrees, button in ${b.toFixed(1)} millimetres, tip ${tip >= 0 ? "out" : "in"} ${Math.abs(tip).toFixed(1)}, spring ${M.springForce(Y).toFixed(1)} newtons.`, live.clock);
  $("click")?.setAttribute("aria-pressed", String(clickT >= 0));
}

// the one live dimension: the button's travel b, beside the button, while assembled
function overlay() {
  const b = M.buttonDepth(pen);
  if (V.explode > 0.05 || b < 0.3) return "";
  const top = M.YPT_TOP + P.PL.button + P.PL.buttonH;
  return V.dim([top, 0, 0], [top - b, 0, 0], { text: `b=${b.toFixed(1)}`, off: 40 });
}

// ---------------------------------------------------------------- the pen's controls
// drag the button (or the plunger) in along -x; let go and the spring returns it
const clamp = (v) => Math.min(M.PUSH_MAX, Math.max(0, v));
V.drag([14, 13], {
  axis: [-1, 0, 0],
  length: M.PUSH_MAX,
  start: () => {
    dragging = true;
    clickT = -1;
    target = push;
    return push / M.PUSH_MAX;
  },
  move: (v) => (target = clamp(v * M.PUSH_MAX)),
  end: () => {
    dragging = false;
    target = 0;
  },
});
const click = () => (clickT = 0);
V.key(" ", click);
V.key("Enter", click);
V.key("ArrowLeft", () => ((clickT = -1), (target = clamp(target + 1))));
V.key("ArrowRight", () => ((clickT = -1), (target = clamp(target - 1))));
V.key("Home", () => ((clickT = -1), (target = 0)));
$("click")?.addEventListener("click", () => {
  click();
  V.input();
});

// the page's own self-tests (?selftest=1): push the button in by dragging it; Space clicks
V.test("button drag pushes", ({ ptr, project }) => {
  const g = project([M.YPT_TOP + P.PL.button + 3, 2.4, 2.4]);
  const t0 = target;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0] - 120, g[1] - 60);
  const t1 = target;
  ptr("pointerup", g[0] - 120, g[1] - 60);
  return { pass: t1 > t0 + 1 && target === 0, info: [t0, t1] };
});
V.test("space clicks", ({ key }) => {
  clickT = -1;
  key(" ");
  const ok = clickT === 0;
  clickT = -1;
  return { pass: ok, info: ok };
});
V.test("arrows press and release", ({ key }) => {
  target = 0;
  key("ArrowLeft");
  const a = target;
  key("ArrowRight");
  return { pass: a === 1 && target === 0, info: [a, target] };
});

V.run({ step, render, overlay, still: 2.6, idleAfter: 5 });
