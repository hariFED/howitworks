// Page code for stirling-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit draws, frames, explodes and labels; this file runs the sheet's engine (the same tour, the
// same controls, the same Schmidt model and flywheel), turns the gears, poses the four rods, both
// yokes, the piston and the displacer from the drive angle, rebuilds the hot and cold gas spaces and
// shades the gas by temperature, and draws the burner's flames round the cap.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });

// ---------------------------------------------------------------- state: the 2D sheet's
const TH0 = M.TH_MAX;
let phi = 0.6; // drive angle, rad (the left gear's)
let omega = M.steadyOmega(TH0); // engine speed, rad/s
let th = TH0; // hot cap, K
let burner = 1; // burner setting 0..1
let flame = true;
let dragging = false;
let simT = 0;

// work per cycle is a 720-step loop integral: cached against the hot temperature
let wAt = -1;
let cyc = { w: 0, qh: 0, qc: 0 };
const cycleAt = (t) => {
  if (Math.abs(t - wAt) > 0.25) {
    wAt = t;
    cyc = M.cycle(t, M.TC);
  }
  return cyc;
};

// the tour, as on the sheet: steady at full flame, burner down, watch it slow, burner up again
const PERIOD = 24;
let tourT = 0;
function tourBurner(t) {
  const s = t % PERIOD;
  if (s < 7) return 1;
  if (s < 9) return 1 - 0.78 * L.ease((s - 7) / 2);
  if (s < 15) return 0.22;
  if (s < 17) return 0.22 + 0.78 * L.ease((s - 15) / 2);
  return 1;
}

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  const still = live.reduced && !live.frozen;
  for (let i = 0; i < n; i++) {
    simT += h;
    if (live.touring) {
      tourT += h;
      burner = tourBurner(tourT);
      flame = true;
    }
    const want = flame ? M.burnerTh(burner) : M.TC;
    th = still ? want : L.follow(th, want, M.HEAT_RATE, h);
    if (dragging) omega = 0;
    else {
      const drive = cycleAt(th).w / (2 * Math.PI);
      const drag = (omega > 0.01 ? M.T_FRICTION : Math.min(M.T_FRICTION, Math.abs(drive))) + M.B_FRICTION * omega;
      omega = Math.max(0, omega + ((drive - drag) / M.INERTIA) * h);
      if (!still) phi += M.DIR * omega * M.MOTION * h;
    }
  }
  return !live.reduced || dragging;
}

// ---------------------------------------------------------------- poses from the drive angle
const a = M.YOKE_A;
const PISTON = [8, 9, 11, 13, 14, 15];
const DISPLACER = ["8D", 10, 25, 12, 21];
function rod(id, [ax, ay], [bx, by]) {
  V.set(id, { pos: [ax, ay, 0], rot: [0, 0, Math.atan2(by - ay, bx - ax)] });
}
function pose(f) {
  for (const id of [4, 5, 6, 24]) V.set(id, { rot: [0, 0, -f] }); // the right gear and the flywheel on its shaft
  for (const id of ["4L", "5L", "6L"]) V.set(id, { rot: [0, 0, f] });
  const yp = M.yokeP(f);
  const yd = M.yokeD(f);
  for (const id of PISTON) V.set(id, { pos: [0, yp - P.YP0, 0] });
  for (const id of DISPLACER) V.set(id, { pos: [0, yd - P.YD0, 0] });
  const pl = M.pinL(f);
  const pr = M.pinR(f);
  rod(7, [a, yp], pr);
  rod("7L", [-a, yp], pl);
  rod("7D", [a, yd], pr);
  rod("7DL", [-a, yd], pl);
}
// frame the whole turn (the yokes' extremes are not at round angles), so the zoom never breathes
V.frame([0, 1, 2, 3, 4, 5, M.PISTON.at[0], M.PISTON.at[1], M.DISP.at[0], M.DISP.at[1]].map((f) => () => pose(f)));

// balloons on turning parts stay put: their anchors are turned back by the part's own angle
const STILL = [4, 24].map((id) => {
  const rec = V.part(id);
  return { rec, cut: rec.spec.anchor.cut.slice(), out: rec.spec.anchor.out.c.slice(), pivot: rec.pivot };
});
const unturn = ([x, y, z], [px, py], ang) => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return [px + c * (x - px) - s * (y - py), py + s * (x - px) + c * (y - py), z];
};

// ---------------------------------------------------------------- the gas
const GAS = {};
{
  const meshes = [];
  V.world.traverse((o) => o.isMesh && o.material?.userData?.role === "fluid" && meshes.push(o));
  ["hot", "cold", ...Array.from({ length: SC.BANDS }, (_, i) => `gap-${i}`)].forEach((n, i) => (GAS[n] = meshes[i]));
}
// a space whose shape the model changes: its geometry and the profile the shader tests it against
function setSpace(name, loop) {
  const m = GAS[name];
  m.geometry.dispose();
  m.geometry = S.geometryOf(S.lathe(loop));
  const u = m.material.uniforms;
  loop.forEach(([r, s], i) => u.uProf.value[i].set(r, s));
  u.uProfN.value = loop.length;
}
// stipple density follows the temperature of the space, as the sheet shades it; the hot gas also
// carries a warm wash, the cold gas almost none
const tempK = (t) => Math.min(1, Math.max(0, (t - 293) / (M.TH_MAX - 293)));
const density = (t) => 0.2 + 0.8 * tempK(t);
const wash = (t) => 0.02 + 0.3 * tempK(t) ** 1.5;
let shownGas = null;
function gas(f) {
  const dt = M.dispTop(f);
  const db = M.dispBottom(f);
  const pt = M.pistonTop(f);
  if (!shownGas || Math.abs(shownGas[0] - dt) > 0.005 || Math.abs(shownGas[1] - pt) > 0.005) {
    setSpace("hot", SC.hotLoop(dt));
    setSpace("cold", SC.coldLoop(pt, db));
    shownGas = [dt, pt];
  }
  V.fluid("hot", { density: density(th), wash: wash(th) });
  V.fluid("cold", { density: density(M.TC), wash: wash(M.TC) });
  for (let i = 0; i < SC.BANDS; i++) {
    const t = M.TC + ((th - M.TC) * (i + 0.5)) / SC.BANDS;
    V.fluid(`gap-${i}`, { offset: [0, db - P.DB0, 0], density: density(t), wash: wash(t) });
  }
}

// ---------------------------------------------------------------- render
const say = L.announcer($("sr"), 2.5);
const flameSize = () => (flame ? Math.min(1, ((th - M.TC) / (M.TH_MAX - M.TC)) * 0.6 + burner * 0.4) : 0);
function render(live) {
  pose(phi);
  for (const s of STILL) {
    s.rec.spec.anchor.cut = unturn(s.cut, s.pivot, phi);
    s.rec.spec.anchor.out.c = unturn(s.out, s.pivot, phi);
  }
  gas(phi);
  const p = M.pressure(phi, th, M.TC);
  const w = cycleAt(th).w;
  const rpm = M.rpm(omega);
  $("readout").textContent = `Th ${Math.round(th)} K · Tc ${M.TC} K · p ${p.toFixed(2)} bar · ${Math.round(rpm)} rpm · W ${w.toFixed(2)} J · P ${((w * rpm) / 60).toFixed(1)} W`;
  say(`Hot cap ${Math.round(th)} kelvin, cooler ${M.TC} kelvin, ${Math.round(rpm)} revolutions per minute, ${w.toFixed(2)} joules per cycle.`, live.clock);
  $("flame")?.setAttribute("aria-pressed", String(flame));
}

// ---------------------------------------------------------------- overlay: the flames and the hot space
// The flames are the sheet's own (parts.mjs flames(), its flicker and its size from the burner): each
// of the twelve jets throws one tongue up its radial plane, leaning in on the cap. They are drawn as
// thin lines, as the sheet draws them, and hidden where the cap or the shield stands in front.
const CAPTURE = { p: ([u, v]) => [u, v] };
function tongue(b, t) {
  const m = P.flames(CAPTURE, b, t).match(/d="([^"]+)"/);
  if (!m) return null;
  const n = m[1].replace(/[MLZ]/g, " ").trim().split(/\s+/).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  return pts;
}
// does the ray from p toward the viewer meet a vertical cylinder (radius r, y0..y1) in what is left
// of the model (z <= zc)? solid: anywhere inside it; else only its wall
function meets(p, d, r, y0, y1, zc, solid) {
  let lo = 1e-3;
  let hi = Infinity;
  if (Math.abs(d[2]) > 1e-9) {
    const tz = (zc - p[2]) / d[2];
    if (d[2] > 0) hi = Math.min(hi, tz);
    else lo = Math.max(lo, tz);
  }
  if (Math.abs(d[1]) > 1e-9) {
    let ta = (y0 - p[1]) / d[1];
    let tb = (y1 - p[1]) / d[1];
    if (ta > tb) [ta, tb] = [tb, ta];
    lo = Math.max(lo, ta);
    hi = Math.min(hi, tb);
  } else if (p[1] < y0 || p[1] > y1) return false;
  if (lo >= hi) return false;
  const qa = d[0] * d[0] + d[2] * d[2];
  const qb = 2 * (p[0] * d[0] + p[2] * d[2]);
  const qc = p[0] * p[0] + p[2] * p[2] - r * r;
  if (qa < 1e-12) return solid && qc < 0;
  const disc = qb * qb - 4 * qa * qc;
  if (disc <= 0) return false;
  const t1 = (-qb - Math.sqrt(disc)) / (2 * qa);
  const t2 = (-qb + Math.sqrt(disc)) / (2 * qa);
  if (solid) return Math.max(lo, t1) < Math.min(hi, t2);
  return (t1 > lo && t1 < hi) || (t2 > lo && t2 < hi);
}
const JETS = 12;
function flames() {
  const b = flameSize();
  if (b < 0.02 || V.explode > 0.05) return "";
  const d = new V.THREE.Vector3(0, 0, 1).applyQuaternion(V.camera.quaternion).toArray();
  const zc = V.cut ? Number($("offset")?.value ?? 0) : Infinity;
  const SH = P.SHIELD;
  const hidden = (q) => q[2] > zc + 1e-6 || meets(q, d, M.DISP_D / 2 + 2, 151, M.CAP_TOP + 1, zc, true) || meets(q, d, (SH.r0 + SH.r1) / 2, SH.bot, SH.top, zc, false);
  let path = "";
  for (let j = 0; j < JETS; j++) {
    const pts = tongue(b, simT + j * 0.83);
    if (!pts) continue;
    const ang = (j * 2 * Math.PI) / JETS;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    let run = [];
    let all = true;
    const flush = () => {
      if (run.length > 1) path += "M" + run.map((q) => q.map((v) => v.toFixed(1)).join(" ")).join("L");
      run = [];
    };
    for (const [u, v] of pts) {
      const q = [u * c, v, -u * s];
      if (hidden(q)) {
        all = false;
        flush();
      } else run.push(V.project(q));
    }
    if (all) path += "M" + run.map((q) => q.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
    else flush();
  }
  return path ? `<path class="flame" d="${path}"/>` : "";
}
// the hot space's height e, beside the cap as on the sheet (the one live dimension)
function overlay() {
  let svg = flames();
  if (V.explode > 0.05 || !V.cut) return svg;
  const top = M.dispTop(phi);
  const A = V.project([-20, M.CAP_TOP, 0]);
  const F = V.project([-47, M.CAP_TOP, 0]);
  svg += V.dim([-20, M.CAP_TOP, 0], [-20, top, 0], { text: `e=${K.fmt(M.CAP_TOP - top, 1)}`, off: -Math.abs(A[0] - F[0]) });
  return svg;
}

// ---------------------------------------------------------------- controls, as on the sheet
// turn the engine by hand: drag either gear (or the flywheel) round; the engine stops while held
function advance(d) {
  phi += d;
}
const turnBy = (axis, length) => ({
  axis,
  length,
  start: () => {
    dragging = true;
    return phi;
  },
  move: (v) => advance(v - phi),
  end: () => (dragging = false),
});
V.drag([4, 5, 6, 24], turnBy([1, 0, 0], M.E)); // the right gear turns by -phi: its top moves +x as phi grows
V.drag(["4L", "5L", "6L"], turnBy([-1, 0, 0], M.E));
V.key("ArrowUp", () => {
  burner = Math.min(1, burner + 0.1);
  flame = true;
});
V.key("ArrowDown", () => {
  burner = Math.max(0, burner - 0.1);
  flame = true;
});
V.key("ArrowRight", () => advance(M.DIR * (Math.PI / 12)));
V.key("ArrowLeft", () => advance(-M.DIR * (Math.PI / 12)));
V.key(" ", () => (flame = !flame));
$("flame")?.addEventListener("click", () => {
  flame = !flame;
  V.input();
});

// the page's own self-tests (?selftest=1)
V.test("gear drag turns the drive", ({ ptr, project }) => {
  const g = project([-M.E - 15, 8, SC.Z.gear[1]]);
  const f0 = phi;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0] - 60, g[1]);
  const f1 = phi;
  ptr("pointerup", g[0] - 60, g[1]);
  return { pass: f1 - f0 > 0.2 && !dragging, info: [f0, f1] };
});
V.test("arrow right turns 15°", ({ key }) => {
  const f0 = phi;
  key("ArrowRight");
  const f1 = phi;
  key("ArrowLeft");
  return { pass: Math.abs(Math.abs(f1 - f0) - Math.PI / 12) < 1e-9 && Math.abs(phi - f0) < 1e-9, info: [f0, f1] };
});
V.test("arrows set the burner", ({ key }) => {
  const b0 = burner;
  key("ArrowDown");
  const b1 = burner;
  key("ArrowUp");
  return { pass: b1 < b0 && Math.abs(burner - b0) < 1e-9, info: [b0, b1] };
});
V.test("space puts the flame out", ({ key }) => {
  const f0 = flame;
  key(" ");
  const f1 = flame;
  key(" ");
  return { pass: f0 !== f1 && flame === f0, info: [f0, f1] };
});
V.test("the yokes follow the model", () => {
  const keep = phi;
  phi = 1.1;
  render({ clock: 0 });
  const y9 = V.part(9).base.pos[1];
  const y21 = V.part(21).base.pos[1];
  phi = keep;
  render({ clock: 0 });
  const want9 = M.yokeP(1.1) - P.YP0;
  const want21 = M.yokeD(1.1) - P.YD0;
  return { pass: Math.abs(y9 - want9) < 1e-6 && Math.abs(y21 - want21) < 1e-6, info: [y9, want9, y21, want21] };
});

V.run({ step, render, overlay, still: 5, idleAfter: 8 });
