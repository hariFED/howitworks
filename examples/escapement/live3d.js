// Page code for escapement-3d.html (an ES module). Inlined above it: T (tables.js, the contact tables),
// K (kit/draft.mjs), L (kit/live.mjs), S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model,
// unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit does the drawing, the camera, explode, balloons and the controls; this file runs the
// escapement exactly as the sheet's live.js does (the same model, time warp and tour), poses the
// balance, fork and wheel from it, and lights the tooth and stone at work in the accent.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });
const RAD = Math.PI / 180;

// ---------------------------------------------------------------- the escapement proper is not cut
// The frame, the balance and its staff, the hairspring and the pallet arbor are sectioned on the line
// of centres (SECTION A-A); the wheel, fork, stones, pins, rollers and jewel stay whole so the
// escapement can be watched. Their materials get their own cut switch, held off.
for (const id of SC.WHOLE) {
  for (const h of V.part(id).holders) {
    h.mesh.material.uniforms.uCutOn = { value: 0 };
    if (h.lines) h.lines.material.uniforms.uCutOn = { value: 0 };
  }
}

// ---------------------------------------------------------------- the accent: the tooth and stone at work
// Their tones are their own uniforms, mixed from the theme's toon tones toward the accent.
const accentMeshes = { entry: V.part(17).holders[0].mesh, exit: V.part(18).holders[0].mesh, tooth: V.part(20).live.acc.mesh };
for (const m of Object.values(accentMeshes)) for (const u of ["uLit", "uMid", "uDark"]) m.material.uniforms[u] = { value: new THREE.Color() };
const tone = {};
function readTones() {
  const cs = getComputedStyle(document.documentElement);
  const col = (n) => {
    const v = cs.getPropertyValue(n).trim();
    const m = v.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const [r, g, b] = m[1].split(",").map(Number);
      return new THREE.Color(r / 255, g / 255, b / 255);
    }
    return new THREE.Color(v || "#888");
  };
  const acc = col("--bp-accent");
  tone.base = [col("--bp3-lit"), col("--bp3-mid"), col("--bp3-dark")];
  tone.acc = [acc.clone().lerp(col("--bp-paper"), 0.35), acc.clone(), acc.clone().lerp(col("--bp-ink"), 0.3)];
}
readTones();
new MutationObserver(() => {
  readTones();
  V.redraw();
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
function light(mesh, a) {
  const u = mesh.material.uniforms;
  ["uLit", "uMid", "uDark"].forEach((n, i) => u[n].value.copy(tone.base[i]).lerp(tone.acc[i], a));
}

// ---------------------------------------------------------------- state: the 2D sheet's, from the same model
let s = M.start();
let paused = false;
let dragging = false;
let dragTarget = 0;
let rate = 1;
let glow = 0; // the accent's strength, eased

// The tour slows time where the escapement works: ×1/90 inside the lift, ×1/14 in the free swing.
function warp(th) {
  const a = Math.abs(th);
  const w = a < 32 ? 1 : a > 90 ? 0 : 1 - (a - 32) / 58;
  return 1 / 14 + (1 / 90 - 1 / 14) * L.ease(w);
}
const restart = () => {
  s = M.start();
};

function step(dt, live) {
  if (live.touring && paused) paused = false;
  if (live.touring && s.peak < 120 && !dragging) restart();
  if (paused && !dragging) return false;
  rate = warp(s.th);
  const sim = dt * rate;
  const n = Math.max(1, Math.ceil(sim / M.DT));
  const h = sim / n;
  const hold = dragging ? L.follow(s.th, dragTarget, 18, dt) : null;
  for (let i = 0; i < n; i++) M.step(s, h, hold);
  const want = s.stage === "impulse" ? 1 : s.stage === "drop" ? 0.12 : 0.38;
  glow = live.reduced || dt === 0 ? want : L.follow(glow, want, 14, dt);
  return true;
}

// ---------------------------------------------------------------- poses from the model
const say = L.announcer($("sr"), 2);
let shownHs = null;
function render(live) {
  const th = s.th;
  // balance (whole solids turn about the staff, so its balloons stay put): plan +θ is rot.y −θ
  for (const [id, key] of [[9, "arms"], [13, "safety"], [14, "jewel"]]) V.solid(id, key).rotation.y = -th * RAD;
  if (shownHs === null || Math.abs(th - shownHs) > 0.4) {
    V.reshape(10, "hs", { shape: SC.hairspringShape(th) });
    shownHs = th;
    V.part(10).spec.anchor.cut = SC.hairspringCut(th); // its balloon follows the coil on the plane
  }
  // pallet fork about P
  for (const id of SC.FORK) V.set(id, { rot: [0, -s.phi * RAD, 0] });
  // escape wheel about E: ψ turns it clockwise in plan
  V.solid(20, "wheel").rotation.y = (s.psi % 360) * RAD;
  V.solid(21, "leaves").rotation.y = (s.psi % 360) * RAD;
  const kTooth = M.toothInAction(s);
  V.solid(20, "acc").rotation.y = ((s.psi - M.PITCH * kTooth) % 360) * RAD;
  // the accent: the locked side's stone and the tooth on it, full while it gives impulse
  light(accentMeshes.entry, s.side > 0 ? glow : 0);
  light(accentMeshes.exit, s.side < 0 ? glow : 0);
  light(accentMeshes.tooth, glow);

  const stage = { locked: "LOCKED", unlocking: "UNLOCKING", impulse: "IMPULSE", drop: "DROP", locking: "LOCKING" }[s.stage];
  const stone = s.side > 0 ? "ENTRY" : "EXIT";
  const sgn = (x) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(0);
  const speedTxt = paused ? "PAUSED" : `×1/${Math.round(1 / (rate * live.slow))}`;
  $("readout").textContent = `θ ${sgn(th)}° · A ${s.peak.toFixed(0)}° · φ ${s.phi >= 0 ? "+" : "−"}${Math.abs(s.phi).toFixed(1)}° · ${stage} ${stone} · TOOTH ${kTooth + 1} · ${speedTxt}`;
  $("pause")?.setAttribute("aria-pressed", String(paused));
  say(`Balance at ${Math.round(th)} degrees, amplitude ${Math.round(s.peak)}, ${stage.toLowerCase()} on the ${stone.toLowerCase()} stone, beat ${s.beats}.`, live.clock);
}

// ---------------------------------------------------------------- the escapement's controls
// Drag the balance across (its rim, arms, rollers or hairspring): 9 mm of drag swings it 300°; let go
// and it runs from there, as on the sheet.
V.drag([9, 10, 11, 13, 14], {
  axis: [Math.SQRT1_2, 0, -Math.SQRT1_2],
  length: 2 * M.BAL.ro * SC.k,
  start: () => {
    dragging = true;
    dragTarget = s.th;
    return -s.th / 300;
  },
  move: (v) => {
    dragTarget = Math.max(-320, Math.min(320, -v * 300));
  },
  end: () => {
    dragging = false;
    s.om = 0; // let go from rest
    s.peak = Math.abs(s.th);
  },
});
const kick = (d) => () => {
  s.om += d;
};
V.key("ArrowLeft", kick(2500));
V.key("ArrowRight", kick(-2500));
V.key(" ", () => {
  paused = !paused;
});
V.key("r", restart);
$("pause")?.addEventListener("click", () => {
  paused = !paused;
  V.input();
});
$("restart")?.addEventListener("click", () => {
  restart();
  V.input();
});

// the page's own self-tests (?selftest=1)
V.test("drag the balance swings it", ({ ptr, project }) => {
  const g = project(SC.RIM_GRIP);
  ptr("pointerdown", g[0], g[1]);
  const t0 = dragTarget;
  const was = dragging;
  ptr("pointermove", g[0] + 120, g[1]);
  const t1 = dragTarget;
  ptr("pointerup", g[0] + 120, g[1]);
  return { pass: was && Math.abs(t1 - t0) > 20 && !dragging, info: [was, t0, t1] };
});
V.test("arrow kicks the balance", ({ key }) => {
  const a = s.om;
  key("ArrowLeft");
  return { pass: s.om > a + 2000, info: [a, s.om] };
});
V.test("space pauses", ({ key }) => {
  const a = paused;
  key(" ");
  const b = paused;
  key(" ");
  return { pass: a !== b && paused === a, info: [a, b] };
});
V.test("R restarts", ({ key }) => {
  s.beats = 99;
  key("r");
  return { pass: s.beats === 0, info: s.beats };
});

V.run({ step, render, still: SC.STILL, idleAfter: 6 });
