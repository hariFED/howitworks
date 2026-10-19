// Page code for airframe-3d.html (an ES module). Inlined above it: K, L, S (kit), M, X, P, LA (the
// aircraft's model, helpers, parts and 3D scene), ST (the structural model), GE (geometry), SC (scene3d).
// The structure doesn't move; the load does. The overlay draws the lift along the port wing, the front
// spar's stress colour (its cap against F_ty, cell by cell) and the strut's force, all from ST at n.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene(), start: { zoom: 1.2, look: [-250, 170, -170], el: 30 } });

let n = 1;
let nT = 1;
let mode = "tour";
let tourT = 0;
let phase = ST.phaseAt(0);
function step(dt, live) {
  if (live.touring && mode !== "tour") {
    mode = "tour";
    tourT = 0;
  }
  const k = Math.max(1, Math.ceil(dt * 240));
  const h = dt / k;
  for (let i = 0; i < k; i++) {
    if (mode === "tour") {
      tourT = (tourT + h) % ST.TOUR_PERIOD;
      const s = ST.tourAt(tourT);
      n = nT = s.n;
      phase = s.phase;
    } else n = live.reduced ? nT : L.follow(n, nT, 6, h);
  }
  return mode === "tour" || Math.abs(n - nT) > 0.002;
}

const say = L.announcer($("sr"), 2);
function render(live) {
  const Ld = ST.loads(n);
  $("readout").textContent = `n ${n.toFixed(2)} g · ${mode === "tour" ? phase : "BY HAND"} · STRUT T ${(Ld.T / 1000).toFixed(1)} kN · σ CAP ${Math.round(Ld.sigma)} MPa · RF ${Ld.rfUlt > 99 ? "—" : Ld.rfUlt.toFixed(2)}`;
  say(`Load factor ${n.toFixed(1)} g, strut ${(Ld.T / 1000).toFixed(1)} kilonewtons, spar cap ${Math.round(Ld.sigma)} megapascals.`, live.clock);
}

// ---------------------------------------------------------------- overlay: lift, stress colour, strut force
const pr = (q) => V.project(SC.s3(q));
const f1 = (v) => v.toFixed(1);
function arrow(a, b, cls) {
  const [x0, y0] = pr(a);
  const [x1, y1] = pr(b);
  const l = Math.hypot(x1 - x0, y1 - y0);
  if (l < 4) return "";
  const ux = (x1 - x0) / l;
  const uy = (y1 - y0) / l;
  const h = Math.min(8, l * 0.4);
  const bx = x1 - ux * h;
  const by = y1 - uy * h;
  return `<path class="${cls}" d="M${f1(x0)} ${f1(y0)}L${f1(bx)} ${f1(by)}"/><path class="${cls}-h" d="M${f1(x1)} ${f1(y1)}L${f1(bx - uy * h * 0.35)} ${f1(by + ux * h * 0.35)}L${f1(bx + uy * h * 0.35)} ${f1(by - ux * h * 0.35)}Z"/>`;
}
const LIFT_MM = 900 / ((ST.W / 2) * ST.schrenk(0) * 4); // mm of arrow per N/mm of lift: 4 g at the root = 900 mm
const CELLS = [];
for (let i = 0; i < ST.NY; i += 7) CELLS.push(i);
function overlay() {
  if (V.explode > 0.05) return "";
  let out = "";
  // lift along the port wing
  for (let ws = 900; ws <= 5300; ws += 550) {
    const a = SC.liftBase(ws);
    const w = (ST.W / 2) * ST.schrenk(ws) * n * LIFT_MM;
    out += arrow(a, [a[0], a[1] + w, a[2]], "lift");
  }
  // the front spar's stress, a band of cells along its top
  for (const i of CELLS) {
    const j = Math.min(ST.NY, i + 7);
    const [x0, y0] = pr(SC.sparTopAt(ST.YS_GRID[i]));
    const [x1, y1] = pr(SC.sparTopAt(ST.YS_GRID[j]));
    let u = 0;
    for (let k = i; k < j; k++) u = Math.max(u, ST.usage(n, k));
    out += `<path class="sig" stroke-opacity="${Math.min(1, 0.12 + 0.88 * u).toFixed(2)}" d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}"/>`;
  }
  // the strut's force, at its middle
  const T = (n * ST.T1) / 1000;
  const [mx, my] = pr(SC.strutAt(0.5));
  out += `<text class="t ft" x="${f1(mx + 10)}" y="${f1(my + 22)}">T ${T.toFixed(1)} kN</text>`;
  const t = T >= 0;
  out += t ? arrow(SC.strutAt(0.35), SC.strutAt(0.15), "lift") + arrow(SC.strutAt(0.65), SC.strutAt(0.85), "lift") : arrow(SC.strutAt(0.15), SC.strutAt(0.32), "lift") + arrow(SC.strutAt(0.85), SC.strutAt(0.68), "lift");
  return out;
}

// ---------------------------------------------------------------- controls, as on the sheet
function hand(d) {
  if (mode === "tour") nT = Math.round(n * 5) / 5;
  mode = "hand";
  nT = Math.max(ST.N_NEG, Math.min(ST.N_ULT, Math.round((nT + d) * 100) / 100));
}
V.key("ArrowUp", () => hand(0.2));
V.key("ArrowDown", () => hand(-0.2));
V.key(" ", () => {
  mode = "tour";
  tourT = 0;
});
for (const [id, v] of [["n1", 1], ["n2", 2], ["n38", ST.N_LIMIT]]) $(id)?.addEventListener("click", () => ((mode = "hand"), (nT = v), V.input()));

V.test("up arrow raises the load factor", ({ key }) => {
  mode = "hand";
  nT = 1;
  key("ArrowUp");
  return { pass: Math.abs(nT - 1.2) < 1e-6 && mode === "hand", info: [nT, mode] };
});
V.test("strut reaction balances the moment about the root pin", () => {
  const r = ST.loads(ST.N_LIMIT);
  const mo = ST.N_LIMIT * ST.MO1;
  return { pass: Math.abs(r.R * (ST.YS - ST.Y0) - mo) / mo < 1e-9 && Math.abs(ST.M1[0]) < 1, info: [r.R, ST.M1[0]] };
});
V.test("the limit load stays inside the 2024-T3 allowables", () => {
  const r = ST.loads(ST.N_LIMIT);
  return { pass: r.sigma < ST.F_TY && r.rfUlt > 1, info: [r.sigma, r.rfUlt] };
});

V.run({ step, render, overlay, still: 13, idleAfter: 8 });
