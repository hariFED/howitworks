// Page code for centrifugal-pump-3d.html (an ES module). Inlined above it: K (kit/draft.mjs),
// L (kit/live.mjs), S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs)
// and SC (scene3d.mjs). The kit draws, frames, explodes and labels; this file runs the sheet's model
// with the sheet's tour and controls, turns the rotor at the sheet's 1/100 of shaft speed and sets the
// water's density zone by zone from the pressures the model gives.

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const V = S.create({ scene: SC.scene() });
const rad = Math.PI / 180;

// (every lathe takes half the kit's segments: `segments` in scene3d.mjs)

// ---------------------------------------------------------------- the vanes, bent onto the shrouds
// Each vane is built as a flat prism (scene3d.mjs); its two faces move onto the front shroud's inner
// surface and the hub's, radius by radius, so it spans the passage from the eye to the outlet.
for (let k = 0; k < M.VANES; k++) {
  const h = V.part(2).live["v" + k];
  const geo = h.mesh.geometry;
  const p = geo.attributes.position;
  const [u0, u1] = SC.VANE_U;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getX(i) - u0) / (u1 - u0);
    p.setX(i, SC.vaneU(t, Math.hypot(p.getY(i), p.getZ(i))));
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  h.lines.geometry.dispose();
  h.lines.geometry = new THREE.EdgesGeometry(geo, 35);
}

// ---------------------------------------------------------------- joints that are not edges
// Pieces of one casting (or one turned part split where a keyway or bolt holes begin) meet face to
// face; each piece's own crease lines would draw the joint across what is one smooth face. Drop the
// crease segments that lie on such a joint: the casing's suction face (x = −22) inside its outline,
// the front wall's joint with the shell round the outside (x = −14), the casing's u = 14 step where the shell and the rear flange share an outline, and the circles
// where a slotted bore ring or a bolted flange meets its lathe on a common face.
const near = (a, b, e = 0.05) => Math.abs(a - b) < e;
function distTo(poly, y, z) {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((z - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    d = Math.min(d, Math.hypot(z - ax - t * dx, y - ay - t * dy));
  }
  return d;
}
const SEAMS = {
  1: (x, y, z) =>
    (near(x, -22) && distTo(SC.OUTER, y, z) > 0.3) ||
    ((near(x, -14) || near(x, -14.1)) && distTo(SC.OUTER, y, z) < 0.05) || ((near(x, 14) || near(x, 13.9)) && distTo(SC.OUTER, y, z) < 0.05 && distTo(SC.REAR, y, z) < 0.05),
  2: (x, y, z) => near(Math.abs(x), 14) && near(Math.hypot(y, z), 13),
  6: (x, y, z) => (near(x, 276, 0.15) || near(x, 302, 0.15)) && near(Math.hypot(y, z), 12),
  13: (x, y, z) => near(x, 242, 0.15) && near(Math.hypot(y, z), 46, 0.1),
  17: (x, y, z) => near(x, 263) && near(Math.hypot(y, z), 31),
  20: (x, y, z) => (near(x, 272) || near(x, 306)) && near(Math.hypot(y, z), 15.8),
};
for (const [id, seam] of Object.entries(SEAMS)) {
  for (const h of V.part(Number(id)).holders) {
    if (!h.lines) continue;
    const p = h.lines.geometry.attributes.position;
    const keep = [];
    for (let i = 0; i < p.count; i += 2) {
      const a = [p.getX(i), p.getY(i), p.getZ(i)];
      const b = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)];
      if (!(seam(...a) && seam(...b))) keep.push(...a, ...b);
    }
    h.lines.geometry.dispose();
    h.lines.geometry = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(keep, 3));
  }
}

// ---------------------------------------------------------------- state: the 2D sheet's
let n = 0; // shaft speed, rpm
let lift = M.LIFT_MAX; // discharge valve lift, mm (the valve is on the sheet; here only its effect)
let nTarget = 0;
let liftTarget = M.LIFT_MAX;
let angle = 0; // the rotor as drawn, degrees, at 1/100 of shaft speed
let auto = false;
let dragging = false;

// The tour, as on the sheet: start the motor, throttle the valve and open it again, slow down, stop.
const PERIOD = 26;
const KEYS = [
  [0, 0, M.LIFT_MAX],
  [1, 0, M.LIFT_MAX],
  [5, M.N0, M.LIFT_MAX],
  [7, M.N0, M.LIFT_MAX],
  [11, M.N0, 1.5],
  [13, M.N0, 1.5],
  [16, M.N0, M.LIFT_MAX],
  [17, M.N0, M.LIFT_MAX],
  [19.5, 1900, M.LIFT_MAX],
  [21.5, 1900, M.LIFT_MAX],
  [24, 0, M.LIFT_MAX],
  [26, 0, M.LIFT_MAX],
];
let tourT = 0;
function tour(h) {
  tourT = (tourT + h) % PERIOD;
  for (let i = 1; i < KEYS.length; i++) {
    const [t1, n1, l1] = KEYS[i];
    const [t0, n0, l0] = KEYS[i - 1];
    if (tourT <= t1) {
      const e = L.ease((tourT - t0) / (t1 - t0));
      nTarget = n0 + (n1 - n0) * e;
      liftTarget = l0 + (l1 - l0) * e;
      return;
    }
  }
}

function step(dt, live) {
  const steps = Math.max(1, Math.ceil(dt * 240));
  const h = dt / steps;
  const driven = (live.touring || auto) && !dragging;
  for (let i = 0; i < steps; i++) {
    if (driven) tour(h);
    n = live.reduced && !driven ? nTarget : L.follow(n, nTarget, driven ? 12 : 5, h);
    lift = live.reduced && !driven ? liftTarget : L.follow(lift, liftTarget, driven ? 12 : 8, h);
    angle = (angle + (n / 100) * 6 * h) % 360; // n/100 rpm is n/100·6 degrees a second
  }
  return Math.abs(n - nTarget) > 0.5 || Math.abs(lift - liftTarget) > 0.005 || n > 1;
}

// ---------------------------------------------------------------- render
// The rotor turns counter-clockwise seen from the suction side (B-B), which is −θ about +x. The
// round parts look the same at any angle, so only what shows the turn is turned: the vanes, the
// keys, the shaft's key seats, the hubs' slotted bores and the seal spring. Their balloons stay put.
const TURN = [
  ...Array.from({ length: M.VANES }, (_, k) => [2, "v" + k]),
  [2, "bore"],
  [6, "seat5"],
  [6, "seat22"],
  [20, "bore"],
  [9, "spring"],
];
const tint = (p) => 0.12 + 0.88 * Math.min(1, Math.max(0, p / 3.8)); // the sheet's stipple density
const say = L.announcer($("sr"), 2);

function render(live) {
  const s = M.state(n, lift);
  const a = -angle * rad;
  for (const [id, key] of TURN) V.solid(id, key).rotation.x = a;
  V.set(5, { rot: [a, 0, 0] });
  V.set(22, { rot: [a, 0, 0] });

  // the water: suction, through the impeller (two thirds of the rise as static pressure), volute
  const rise = s.pDischarge - s.pSuction;
  const levels = { s: s.pSuction, i: s.pSuction + rise * M.REACTION * 0.45, o: s.pSuction + rise * M.REACTION, d: s.pDischarge };
  for (const [z, names] of Object.entries(SC.ZONES)) {
    const d = tint(levels[z]);
    for (const f of names) V.fluid(f, { density: d, wash: 0.03 + 0.17 * d * d });
  }

  $("readout").textContent = `n ${Math.round(n)} rpm · Q ${s.q.toFixed(1)} m³/h · H ${s.h.toFixed(1)} m · η ${Math.round(100 * s.eta)} % · P ${s.p.toFixed(2)} kW · h ${lift.toFixed(1)} mm`;
  say(
    s.flowing
      ? `${Math.round(n)} rpm, ${s.q.toFixed(1)} cubic metres an hour at ${s.h.toFixed(1)} metres, efficiency ${Math.round(100 * s.eta)} percent, ${s.p.toFixed(2)} kilowatts.`
      : `${Math.round(n)} rpm, no flow: the pump cannot lift the water ${M.H_STATIC} metres.`,
    live.clock
  );
  $("run")?.setAttribute("aria-pressed", String(auto));
}

// ---------------------------------------------------------------- the view into the volute
// The hero: an isometric look from the suction side, down into the cut volute and the vane passages.
// The kit's named views all sit on the drive side, so this one is reached by orbiting from wherever
// the camera is (a synthetic drag on an empty corner of the canvas).
const EYE = { az: -38, el: 30 };
const gl = $("gl");
function orbitTo(az, el, from) {
  let az0 = from?.[0];
  let el0 = from?.[1];
  if (az0 == null) {
    const d = new THREE.Vector3().setFromMatrixColumn(V.camera.matrixWorld, 2);
    az0 = Math.atan2(d.x, d.z) / rad;
    el0 = Math.asin(Math.max(-1, Math.min(1, d.y))) / rad;
  }
  const r = gl.getBoundingClientRect();
  const ev = (type, x, y) => gl.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 9, clientX: r.left + x, clientY: r.top + y, button: 0 }));
  const dAz = ((((az0 - az) % 360) + 540) % 360) - 180; // the short way round
  ev("pointerdown", 2, 2);
  ev("pointermove", 2 + dAz / 0.4, 2 + (el - el0) / 0.4);
  ev("pointerup", 2 + dAz / 0.4, 2 + (el - el0) / 0.4);
}
const eyeView = () => orbitTo(EYE.az, EYE.el);

// the opening view is the look into the volute, unless the address asks for a named one (before any
// part is registered for dragging, so the synthetic press cannot land on one)
if (!Q.get("view") || Q.get("view") === "eye") orbitTo(EYE.az, EYE.el, [45, 35.264]);

// ---------------------------------------------------------------- controls, as on the sheet
const clampN = (v) => Math.min(M.N_MAX, Math.max(0, v));
const clampL = (v) => Math.min(M.LIFT_MAX, Math.max(0, v));
// drag the impeller or the coupling up to speed it up: 200 mm of travel is the full 2900 rpm
V.drag([2, 20, 21], {
  axis: [0, 1, 0],
  length: 200,
  start: () => {
    dragging = true;
    auto = false;
    nTarget = n;
    return n / M.N_MAX;
  },
  move: (v) => (nTarget = clampN(v * M.N_MAX)),
  end: () => (dragging = false),
});
const manual = (fn) => () => {
  fn();
  auto = false;
};
V.key("ArrowUp", manual(() => (nTarget = clampN(nTarget + 100))));
V.key("ArrowDown", manual(() => (nTarget = clampN(nTarget - 100))));
V.key("ArrowRight", manual(() => (liftTarget = clampL(liftTarget + 1))));
V.key("ArrowLeft", manual(() => (liftTarget = clampL(liftTarget - 1))));
V.key("Home", manual(() => (nTarget = 0)));
V.key("End", manual(() => (nTarget = M.N0)));
V.key(" ", () => (auto = !auto));
V.key("5", eyeView);
$("run")?.addEventListener("click", () => {
  auto = !auto;
  V.input();
});
$("eye")?.addEventListener("click", eyeView);

// the page's own self-tests (?selftest=1)
V.test("impeller drag sets the speed", ({ ptr, project }) => {
  const g = project([5.6, -62, 0]);
  const n0 = nTarget;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] - 160);
  const n1 = nTarget;
  ptr("pointerup", g[0], g[1] - 160);
  return { pass: n1 > n0 + 500, info: [Math.round(n0), Math.round(n1)] };
});
V.test("arrow up raises the speed", ({ key }) => {
  const a = nTarget;
  key("ArrowUp");
  const b = nTarget;
  key("ArrowDown");
  return { pass: b > a || b === M.N_MAX, info: [a, b] };
});
V.test("arrow left throttles the valve", ({ key }) => {
  const a = liftTarget;
  key("ArrowLeft");
  const b = liftTarget;
  key("ArrowRight");
  return { pass: b < a || b === 0, info: [a, b] };
});
V.test("space runs the tour", ({ key }) => {
  const a = auto;
  key(" ");
  const b = auto;
  key(" ");
  return { pass: a !== b, info: [a, b] };
});
V.test("vanes turn with the shaft", () => {
  const v = V.solid(2, "v0");
  const a0 = v.rotation.x;
  angle += 30;
  render({ clock: 0 });
  const a1 = v.rotation.x;
  angle -= 30;
  render({ clock: 0 });
  return { pass: Math.abs(a1 - a0 + 30 * rad) < 1e-6, info: [a0, a1] };
});
V.test("water thickens toward the discharge at speed", () => {
  const s = M.state(M.N0, M.LIFT_MAX);
  return { pass: s.pDischarge > s.pSuction + 2, info: [s.pSuction, s.pDischarge] };
});
V.test("key 5 looks from the suction side", ({ key, draw }) => {
  key("5");
  draw();
  const d = new THREE.Vector3().setFromMatrixColumn(V.camera.matrixWorld, 2);
  const az = Math.atan2(d.x, d.z) / rad;
  key("1");
  return { pass: Math.abs(az - EYE.az) < 1, info: az };
});

V.run({ step, render, still: 9 });
