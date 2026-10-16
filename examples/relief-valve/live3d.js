// Page code for relief-valve-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit does the drawing, the camera, explode, balloons and the controls; this file runs the
// model exactly as the sheet's live.js does, poses the disc assembly, spring and setting from it,
// and sets the gas's stipple from the vessel pressure and the discharge.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });

// ---------------------------------------------------------------- state: the 2D sheet's, from the same model
const s = M.valve();
let F0 = M.F0_NOM; // spring preload, follows the adjusting screw
let F0want = M.F0_NOM;
let ch = M.characteristic(F0);
let chF0 = F0;
let dragging = false;
let holdWant = s.p;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// The tour, as on the sheet: the compressor fills the receiver, the valve simmers, pops, blows down
// and reseats, and the cycle repeats.
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 960));
  const h = dt / n;
  if (live.touring && !dragging) {
    s.comp = true;
    F0want = M.F0_NOM;
  }
  for (let i = 0; i < n; i++) {
    F0 = L.follow(F0, F0want, 6, h);
    s.F0 = F0;
    const hold = dragging ? L.follow(s.p, holdWant, 10, h) : null;
    M.advance(s, h, { hold });
  }
  if (Math.abs(F0 - chF0) > 0.05) {
    ch = M.characteristic(F0);
    chF0 = F0;
  }
  return dragging || (s.comp && !live.reduced) || Math.abs(s.v) > 0.01 || Math.abs(F0 - F0want) > 0.05;
}

// ---------------------------------------------------------------- poses from the model
const DISC = [5, 6, 8, 9, 14, 22]; // disc, holder, spindle, split ring, lower plate, lifting nut
const SET = [16, 17]; // upper plate and adjusting screw
function pose(h, F0p) {
  for (const id of DISC) V.set(id, { pos: [0, h, 0] });
  const dz = P.screwOffset(F0p);
  for (const id of SET) V.set(id, { pos: [0, dz, 0] });
  V.set(15, { pos: [0, h, 0] });
  const spring = V.solid(15, "spring");
  spring.rotation.y = Math.PI / 2; // wire sections on the plane where the sheet draws them
  spring.scale.y = M.springLength(F0p, h) / M.L_SET;
}
// frame full lift with the screw at both ends of its range, so the zoom never breathes
V.frame([() => pose(0, M.preloadFor(11.5)), () => pose(M.H_MAX, M.preloadFor(8.5))]);

const say = L.announcer($("sr"), 2);
function render(live) {
  const h = s.h;
  pose(h, F0);
  // the gas, as on the sheet: inlet density follows vessel pressure, the discharge side the flow,
  // and the huddling chamber fills toward vessel pressure once the disc has cracked open
  const out = 0.08 + 0.72 * clamp(s.m / 0.6, 0, 1);
  const inl = 0.2 + 0.7 * clamp(s.p / 10.5, 0, 1);
  const hud = Math.min(inl, out + (inl - out) * M.ETA_H * 2.4 * M.psi(h) + (h > 0.004 && h < M.H_A ? 0.25 : 0));
  V.fluid("inlet", { density: inl, wash: 0.04 + 0.12 * inl, stretch: h });
  V.fluid("huddle", { density: hud, wash: 0.04 + 0.12 * hud, offset: [0, h, 0] });
  for (const f of SC.OUTLET) V.fluid(f, { density: out, wash: 0.03 + 0.1 * out });

  const st = M.state(s);
  const kgh = Math.round(s.m * 3600);
  $("readout").textContent = `p ${s.p.toFixed(2)} bar · SET ${ch.set.toFixed(1)} · h ${h.toFixed(2)} mm · ${kgh} kg/h · ${st}`;
  say(`Vessel ${s.p.toFixed(1)} bar, set ${ch.set.toFixed(1)}, lift ${h.toFixed(1)} millimetres, discharge ${kgh} kilograms per hour, ${st.toLowerCase()}.`, live.clock);
  $("comp")?.setAttribute("aria-pressed", String(s.comp));
}

// the live spring length beside the bonnet (right, clear of the balloon leaders), while assembled (as on the sheet's main view)
function overlay() {
  if (V.explode > 0.05) return "";
  const h = s.h;
  const a = P.PLATE_V + h;
  const len = M.springLength(F0, h);
  return V.dim([36, a, 0], [36, a + len, 0], { text: `L=${len.toFixed(1)}`, off: 46 });
}

// ---------------------------------------------------------------- the valve's controls
// drag the body up or down: hold the vessel pressure there (7.5 … 11 bar), as on the sheet
const PRANGE = [7.5, 11];
const pv = (p) => (p - PRANGE[0]) / (PRANGE[1] - PRANGE[0]);
V.drag([1], {
  axis: [0, 1, 0],
  length: 160,
  start: () => {
    dragging = true;
    holdWant = s.p;
    V.input();
    return pv(s.p);
  },
  move: (v) => (holdWant = clamp(PRANGE[0] + v * (PRANGE[1] - PRANGE[0]), ...PRANGE)),
  end: () => (dragging = false),
});
V.key("ArrowUp", () => (s.p = clamp(s.p + 0.1, ...PRANGE)));
V.key("ArrowDown", () => (s.p = clamp(s.p - 0.1, ...PRANGE)));
const screwTo = (d) => () => (F0want = M.preloadFor(clamp(M.characteristic(F0want).set + d, 8.5, 11.5)));
V.key("ArrowRight", screwTo(0.25));
V.key("ArrowLeft", screwTo(-0.25));
V.key(" ", () => (s.comp = !s.comp));
$("comp")?.addEventListener("click", () => {
  s.comp = !s.comp;
  V.input();
});

// the page's own self-tests (?selftest=1)
V.test("body drag holds vessel pressure", ({ ptr, project }) => {
  const g = project([-40, 110, 0]);
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] - 120);
  const want = holdWant;
  const was = dragging;
  ptr("pointerup", g[0], g[1] - 120);
  return { pass: was && want > s.p + 0.5, info: [s.p, want] };
});
V.test("arrow keys set the adjusting screw", ({ key }) => {
  const a = F0want;
  key("ArrowRight");
  const b = F0want;
  key("ArrowLeft");
  return { pass: b > a + 1, info: [a, b] };
});
V.test("space toggles the compressor", ({ key }) => {
  const a = s.comp;
  key(" ");
  const b = s.comp;
  key(" ");
  return { pass: a !== b, info: [a, b] };
});

V.run({ step, render, overlay, still: 5.3, idleAfter: 6 });
