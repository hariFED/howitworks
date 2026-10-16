// Page code for gear-pump-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit draws, frames, explodes and labels; this file runs the sheet's model (the same tour, the
// same controls), turns the gear-shafts and carries the oil round in their tooth spaces.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });
const rad = Math.PI / 180;

// ---------------------------------------------------------------- state: the 2D sheet's
let th = 0; // turned angle of the drive gear, rad (clockwise in A-A)
let p = 30; // outlet pressure, bar
let pWant = 30;
let n = M.N_RATED;
let nWant = M.N_RATED;
let paused = false;
let dragging = false;

// The tour, as on the sheet: 20 s at 1500 rpm (shown 1/300), the outlet pressure rising from 30 to
// 250 bar, holding, and falling back. Twenty tooth pitches, so it loops.
const TOUR = 20;
function tourP(t) {
  const u = t % TOUR;
  if (u < 2) return 30;
  if (u < 8) return 30 + 220 * L.ease((u - 2) / 6);
  if (u < 12) return 250;
  if (u < 17) return 250 - 220 * L.ease((u - 12) / 5);
  return 30;
}
let tourT = 0;

function step(dt, live) {
  const sub = Math.max(1, Math.ceil(dt * 240));
  const h = dt / sub;
  for (let i = 0; i < sub; i++) {
    if (live.touring) {
      tourT += h;
      pWant = tourP(tourT);
      nWant = M.N_RATED;
    }
    p = live.reduced && !live.touring ? pWant : L.follow(p, pWant, live.touring ? 40 : 8, h);
    n = live.reduced && !live.touring ? nWant : L.follow(n, nWant, 8, h);
    if (!dragging && !paused && !(live.reduced && !live.touring)) th += M.degPerSec(n) * rad * h;
  }
  th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.abs(p - pWant) > 0.05 || Math.abs(n - nWant) > 0.5;
}

// ---------------------------------------------------------------- the oil meshes, in scene order
// (the kit poses fluids only by offset; a batch must turn with its gear, so its mesh is turned here)
const OIL = [];
V.world.traverse((o) => o.isMesh && o.material?.userData?.role === "fluid" && OIL.push(o));
const SPACE_MESH = OIL.slice(0, SC.SPACES.length);
function turnAbout(mesh, cx, a) {
  mesh.rotation.set(0, 0, a);
  mesh.position.set(cx - cx * Math.cos(a), -cx * Math.sin(a), 0);
}
// the sheet's density bands (P.bandOf), stretched so the inlet oil is pale and the outlet oil dark
const density = (s) => 0.12 + (0.88 * (P.bandOpacity(P.bandOf(s)) - 0.3)) / 0.7;
const wash = (d) => 0.04 + 0.42 * d * d;

// ---------------------------------------------------------------- render
function render(live) {
  V.set(4, { rot: [0, 0, -th] });
  V.set(11, { rot: [0, 0, -th] });
  V.set(5, { rot: [0, 0, th] });
  const sp = P.spaces(th, p);
  sp.forEach((s, i) => {
    const m = SPACE_MESH[i];
    turnAbout(m, s.gear === 1 ? P.C1[0] : P.C2[0], s.gear === 1 ? -th : th);
    const d = density(s);
    V.fluid(SC.SPACES[i].name, { density: d, wash: wash(d) });
  });
  const dOut = density({ state: "deliver", p });
  const dIn = density({ state: "fill", p: 0 });
  for (const f of ["outlet", "outlet-ridge"]) V.fluid(f, { density: dOut, wash: wash(dOut) });
  for (const f of ["inlet", "inlet-ridge"]) V.fluid(f, { density: dIn, wash: wash(dIn) });

  const Q = M.flow(n, p);
  const eta = M.etaV(n, p);
  const sealed = sp.filter((s) => s.state !== "fill" && s.p > 1).length;
  $("readout").textContent =
    `${Math.round(n)} rpm · ${Math.round(p)} bar · Q ${Q.toFixed(1)} L/min · ηv ${eta.toFixed(3)} · ` +
    `T ${M.torque(p).toFixed(1)} N·m · ${M.powerIn(n, p).toFixed(2)} kW`;
  say(`${Math.round(n)} rpm at ${Math.round(p)} bar: flow ${Q.toFixed(1)} litres a minute, volumetric efficiency ${Math.round(eta * 100)} percent, ${sealed} tooth spaces under pressure.`, live.clock);
  $("pause")?.setAttribute("aria-pressed", String(paused));
}
const say = L.announcer($("sr"), 2.5);

// ---------------------------------------------------------------- controls, as on the sheet
// drag either gear: the value is the drive gear's turn, which grows as its top moves right (+x)
V.drag([4, 5], {
  axis: [1, 0, 0],
  length: M.RW,
  start: () => {
    dragging = true;
    return th;
  },
  move: (v) => (th = v),
  end: () => (dragging = false),
});
V.key("ArrowUp", () => (pWant = Math.min(M.P_MAX, pWant + 10)));
V.key("ArrowDown", () => (pWant = Math.max(0, pWant - 10)));
V.key("ArrowRight", () => (nWant = Math.min(M.N_MAX, nWant + 250)));
V.key("ArrowLeft", () => (nWant = Math.max(M.N_MIN, nWant - 250)));
V.key(" ", () => (paused = !paused));
$("pause")?.addEventListener("click", () => {
  paused = !paused;
  V.input();
});
// E explodes along the shafts and lifts the cut, so the cover and the rear bushings (in the cut-away
// half) come out with the rest; E again closes it up and opens the section
V.key("e", () => {
  const ex = $("explode");
  const to = V.explode > 0.5 || Number(ex.value) > 0.5 ? 0 : 1;
  ex.value = String(to);
  ex.dispatchEvent(new Event("input"));
  if ((to === 1) === V.cut) $("cut").click();
});

// the page's own self-tests (?selftest=1)
V.test("gear drag turns the gears", ({ ptr, project }) => {
  const g = project([P.C1[0], M.RF - 4, 0]);
  const t0 = th;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0] + 60, g[1]);
  const t1 = th;
  ptr("pointerup", g[0] + 60, g[1]);
  return { pass: Math.abs(t1 - t0) > 0.2, info: [t0, t1] };
});
V.test("arrow up raises the pressure", ({ key }) => {
  const a = pWant;
  key("ArrowUp");
  const b = pWant;
  key("ArrowDown");
  return { pass: b > a || b === M.P_MAX, info: [a, b] };
});
V.test("space pauses", ({ key }) => {
  const a = paused;
  key(" ");
  const b = paused;
  key(" ");
  return { pass: a !== b, info: [a, b] };
});
V.test("oil batches turn with the gears", () => {
  const before = SPACE_MESH[0].rotation.z;
  th += 0.3;
  render({ clock: 0 });
  const after = SPACE_MESH[0].rotation.z;
  th -= 0.3;
  return { pass: Math.abs(after - before + 0.3) < 1e-3, info: [before, after] }; // the drive gear turns clockwise
});

V.run({ step, render, still: 9 });
