// Page code for circuit-breaker-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), X (extra.mjs), P (parts.mjs) and
// SC (scene3d.mjs). The kit draws, frames, explodes and labels; this file runs the sheet's state machine
// and tour (the same thermal and magnetic model, the same latch rules), poses the handle, the four-bar,
// the latch, the trip lever, the plunger and the bimetal from it, and lights the current path and the arc.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });
const rad = Math.PI / 180;
const H = (id) => V.part(id).holders;
const shared = H(1)[0].mesh.material.uniforms; // the theme's tones and accent (shared uniform objects)

// ---------------------------------------------------------------- fewer draw calls
// Pieces of one part that never move apart (a case half, the plate stack, the cages, the yoke) are
// merged into one mesh and one set of creases: they share a material and a frame.
function mergeGeo(geos) {
  const pos = [];
  const nor = [];
  const idx = [];
  for (const g of geos) {
    const base = pos.length / 3;
    const p = g.attributes.position;
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i));
    else for (let i = 0; i < p.count; i++) idx.push(base + i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}
const hide = (h) => {
  h.mesh.visible = false;
  if (h.lines) {
    h.lines.userData.crease = false;
    h.lines.visible = false;
  }
};
function merge(id, keep) {
  const hs = H(id).filter(keep);
  const geo = mergeGeo(hs.map((h) => h.mesh.geometry));
  hs[0].mesh.geometry.dispose();
  hs[0].mesh.geometry = geo;
  hs[0].lines.geometry.dispose();
  hs[0].lines.geometry = new THREE.EdgesGeometry(geo, 35);
  hs.slice(1).forEach(hide);
}
merge(1, (h) => !h.spec.front);
merge(1, (h) => h.spec.front);
for (const id of [3, 8, 23]) merge(id, () => true);
merge(10, (h) => h.spec.live !== "flow");
merge(13, () => true);

// ---------------------------------------------------------------- whole parts, the front half, the accent
// The mechanism is drawn whole: its materials get their own cut switch, held off (the case is cut).
for (const id of SC.WHOLE) {
  for (const h of H(id)) {
    h.mesh.material.uniforms.uCutOn = { value: 0 };
    if (h.lines) h.lines.material.uniforms.uCutOn = { value: 0 };
  }
}
// The front half: assembled, the plane takes it all away; exploded, the plane sweeps out through it,
// so it comes forward whole and shows the case from outside.
for (const h of H(1)) {
  if (!h.spec.front) continue;
  for (const o of [h.mesh, h.lines]) {
    const before = o.onBeforeRender;
    o.onBeforeRender = function (...args) {
      before?.apply(this, args);
      o.material.uniforms.uShift.value.z = V.explode * (SC.DZF + SC.HALF + 0.6);
    };
  }
}
// The current's dashes and the arc are ink in the accent; their creases are not drawn.
const FLOW = new Map();
for (const id of [...SC.CONDUCTORS, 31]) {
  for (const h of H(id)) {
    if (h.spec.live !== "flow" && h.spec.live !== "arc") continue;
    h.mesh.material.uniforms.uInk = shared.uAccent;
    h.mesh.frustumCulled = false;
    hide(h);
    h.mesh.visible = false;
    if (h.spec.live === "flow") FLOW.set(id, h);
  }
}
const ARC = H(31)[0];
// The conductors glow: their toon tones are pulled toward the accent while current flows.
const GLOW = { uLit: 0.3, uMid: 0.55, uDark: 0.66 };
const tone = new Map();
for (const id of SC.CONDUCTORS) {
  for (const h of H(id)) {
    if (h.spec.live === "flow" || !h.mesh.visible) continue;
    const t = { uLit: new THREE.Color(), uMid: new THREE.Color(), uDark: new THREE.Color(), k: -1 };
    for (const k of Object.keys(GLOW)) h.mesh.material.uniforms[k] = { value: t[k] };
    tone.set(h, t);
  }
}
let themeGen = 0;
new MutationObserver(() => {
  themeGen++;
  V.redraw();
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
function glow(h, k) {
  const t = tone.get(h);
  if (!t || (t.k === k && t.gen === themeGen)) return;
  for (const [u, m] of Object.entries(GLOW)) t[u].copy(shared[u].value).lerp(shared.uAccent.value, m * k);
  t.k = k;
  t.gen = themeGen;
}

// ---------------------------------------------------------------- state: the 2D sheet's, from the same model
const ON = M.HANDLE_ON;
const OFF = M.HANDLE_OFF;
const s = {
  load: M.LOAD_NORMAL,
  dT: M.dTss(M.LOAD_NORMAL),
  h: ON,
  a: 0,
  c: 0,
  pawl: 0,
  plunger: 0,
  pulse: 0,
  held: true,
  latched: true,
  tripped: false,
  arc: -1,
  arcSeed: 1,
  phase: 0,
  last: null,
  loadSince: 0,
  note: "",
};
let clock = 0;
let dragging = false;
let dragH = OFF;
let auto = false; // Space: run the tour even while the reader is at the controls
let pushUp = false;
let pushDown = false; // the down key drives the handle to OFF (clearing held alone let it re-close at once)

const f = () => M.deflection(s.dT);
const current = () => (s.held && s.a < 0.5 ? s.load : 0);
function stateName() {
  if (s.held) return "closed";
  if (s.tripped) return f() >= M.F_RESET || !s.latched ? "open" : "half";
  return "off";
}
function trip(kind, I, t) {
  s.latched = false;
  s.held = false;
  s.tripped = true;
  s.arc = 0;
  s.arcSeed = (s.arcSeed * 7 + 3) % 97;
  s.last = { m: I / M.IN, t, kind, I };
  if (kind === "MAGNETIC") s.pulse = 0.35;
}
function tryClose() {
  if (!s.latched || s.held) return;
  if (f() >= M.F_RESET) {
    trip("HOT", s.load, 0);
    s.arc = -1;
    s.note = "RESET REFUSED: STILL HOT";
    return;
  }
  s.held = true;
  s.tripped = false;
  s.loadSince = clock;
  s.note = "";
}

// The tour, as on the sheet: normal load, an overload that trips on heat, the cool-down, a reset; a
// short circuit that trips at once with an arc into the plates, a reset into the fault, then cleared.
const tour = { i: 0, t: 0 };
const PH = [
  { load: M.LOAD_NORMAL, until: (t) => t > 4 },
  { load: M.LOAD_OVER, until: () => s.tripped && !s.held },
  { until: (t) => stateName() === "half" && s.h < OFF + 0.5 && tour.ready(t, 1.2) },
  { load: M.LOAD_NORMAL, raise: true, until: (t) => t > 1.3 },
  { until: (t) => t > 3 },
  { load: M.LOAD_FAULT, until: (t) => t > 2.4 },
  { raise: true, until: (t) => t > 2.2 },
  { load: M.LOAD_NORMAL, raise: true, until: (t) => t > 1.4 },
  { until: (t) => t > 2.6, next: 1 },
];
tour.ready = (t, wait) => {
  if (tour.okAt == null) tour.okAt = t;
  return t - tour.okAt > wait;
};
function tourStep(dt) {
  const p = PH[tour.i];
  if (tour.t === 0 && p.load != null) setLoad(p.load);
  tour.t += dt;
  const want = p.raise && tour.t < 1.1 ? OFF + (ON - OFF) * L.ease(tour.t / 0.9) : null;
  if (p.until(tour.t)) {
    tour.i = p.next ?? (tour.i + 1) % PH.length;
    tour.t = 0;
    tour.okAt = null;
  }
  return want;
}
function setLoad(I) {
  if (I === s.load) return;
  s.load = I;
  s.loadSince = clock;
}

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  const driven = (live.touring || auto) && !dragging;
  for (let i = 0; i < n; i++) {
    clock += h;
    let want = s.held ? ON : OFF;
    if (driven) {
      const w = tourStep(h);
      if (w != null) want = w;
    }
    if (pushUp) want = ON;
    if (pushDown) want = OFF;
    if (dragging) want = dragH;
    const rate = want > s.h ? 16 : s.held ? 16 : 11;
    s.h = live.reduced && !driven ? want : L.follow(s.h, want, rate, h);
    if (pushDown && s.h <= OFF + 1) pushDown = false;
    if (!s.held && !pushDown && s.h >= ON - 1) {
      tryClose();
      pushUp = false;
    }
    if (s.held && s.h < ON - 12) s.held = false; // switched off by hand
    if (!s.latched && s.h <= OFF + 1) s.latched = true; // the pawl drops back under the arm's lug
    const c = M.cradleAngle(s.h);
    s.a = L.follow(s.a, s.latched ? c : M.ARM_OPEN, s.latched ? 40 : 55, h);
    s.c = c;
    const I = current();
    if (I > 0 && I >= M.IM) {
      const tm = M.magneticTime(I);
      s.dT += (I * I * M.R_BI * tm) / M.C_TH;
      trip("MAGNETIC", I, tm);
    } else {
      s.dT = M.heat(s.dT, I, h);
      if (I > 0 && f() >= M.F_TRIP) trip("THERMAL", I, clock - s.loadSince);
    }
    if (s.pulse > 0) s.pulse -= h;
    s.plunger = L.follow(s.plunger, s.pulse > 0 ? M.GAP_G : 0, s.pulse > 0 ? 70 : 18, h);
    s.pawl = L.follow(s.pawl, !s.latched && c < 4 ? 24 : 0, 30, h);
    if (s.arc >= 0) {
      s.arc += h / 0.5;
      if (s.arc > 1) s.arc = -1;
    }
    s.phase += h * (I > 0 || s.arc >= 0 ? 4 + 5 * Math.log10(1 + Math.max(I, s.arc >= 0 ? s.load : 0)) : 0);
  }
  return true;
}

// ---------------------------------------------------------------- poses from the model
const LINK0 = 0;
function pose(S) {
  V.set(17, { rot: [0, 0, S.h * rad] });
  V.set(13, { rot: [0, 0, S.c * rad] });
  for (const id of [10, 11]) V.set(id, { rot: [0, 0, S.a * rad] });
  const P0 = X.rotPt(P.P0, P.MP, S.c);
  V.set(14, { pos: [P0[0] - P.P0[0], P0[1] - P.P0[1], 0], rot: [0, 0, (S.c + S.pawl) * rad] });
  for (const id of [15, 30]) V.set(id, { rot: [0, 0, -S.lever * rad] });
  const A = M.crankPin(S.h);
  const B = X.rotPt(M.B0, P.MP, S.c);
  V.set(16, { pos: [A[0], A[1], 0], rot: [0, 0, Math.atan2(B[1] - A[1], B[0] - A[0]) - LINK0] });
  for (const id of [24, 25]) V.set(id, { pos: [S.plunger, 0, 0] });
  V.solid(26, "coil").scale.x = (20 - (15 + S.plunger)) / 5;
  spring(20, X.rotPt(P.LUG_HOLE, P.MP, S.a), P.SPRING_POST_ARM, SC.ARM_L0);
  spring(19, P.handleLug(S.h), P.SPRING_POST_HANDLE, SC.HANDLE_L0);
}
function spring(id, a, b, l0) {
  V.set(id, { pos: [a[0], a[1], 0], rot: [0, 0, Math.atan2(b[1] - a[1], b[0] - a[0])] });
  V.solid(id, "coil").scale.x = Math.hypot(b[0] - a[0], b[1] - a[1]) / l0;
}
const poseOf = () => ({ h: s.h, c: M.cradleAngle(s.h), a: s.a, pawl: s.pawl, lever: M.leverAngle(f(), s.plunger), plunger: s.plunger, f: f() });
const at = (h, a) => ({ h, c: M.cradleAngle(h), a, pawl: 0, lever: 0, plunger: 0, f: 0 });
V.frame([() => pose(at(ON, 0)), () => pose(at(OFF, M.ARM_OPEN))]);

// ---------------------------------------------------------------- the current's dashes and the arc
// Dashes on a conductor's front face, marching from the line terminal to the load terminal.
const DASH = 1.5;
const PERIOD = 3.6;
function dashes(lines, phase, quads = []) {
  for (const { pts, z, w = 0.75 } of lines) {
    let s0 = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 1e-6) continue;
      const ux = (bx - ax) / len;
      const uy = (by - ay) / len;
      const k0 = Math.floor((s0 - phase) / PERIOD) - 1;
      for (let k = k0; ; k++) {
        const d0 = k * PERIOD + phase;
        if (d0 > s0 + len) break;
        const a = Math.max(s0, d0);
        const b = Math.min(s0 + len, d0 + DASH);
        if (b - a > 0.05) quads.push([ax + ux * (a - s0), ay + uy * (a - s0), ax + ux * (b - s0), ay + uy * (b - s0), -uy, ux, z, w]);
      }
      s0 += len;
    }
  }
  return quads;
}
function quadGeo(quads) {
  const pos = [];
  const nor = [];
  const idx = [];
  for (const [ax, ay, bx, by, nx, ny, z, w] of quads) {
    const b = pos.length / 3;
    const o = w / 2;
    pos.push(ax + nx * o, ay + ny * o, z, ax - nx * o, ay - ny * o, z, bx - nx * o, by - ny * o, z, bx + nx * o, by + ny * o, z);
    nor.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
    idx.push(b + 1, b + 2, b + 3, b + 1, b + 3, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}
function setGeo(h, geo) {
  h.mesh.geometry.dispose();
  h.mesh.geometry = geo;
}
// The arc as P.arcPaths gives it: a crackling column between the contacts and up the runners, then
// short arcs in series in the gaps between the splitter plates, across their full width, dying out.
function arcGeo(S, lam, seed) {
  const paths = P.arcPaths(S, lam, seed);
  const geos = [];
  if (lam < 0.75) {
    for (const p of paths) {
      const curve = new THREE.CatmullRomCurve3(p.map(([x, y]) => new THREE.Vector3(x, y, 0)));
      geos.push(new THREE.TubeGeometry(curve, p.length * 4, 0.45, 6, false));
    }
  } else {
    const w = 0.5 * (1 - (lam - 0.75) / 0.25) + 0.12;
    for (const p of paths) {
      const u = p.reduce((a, q) => a + q[0], 0) / p.length;
      const v0 = Math.min(...p.map((q) => q[1]));
      const v1 = Math.max(...p.map((q) => q[1]));
      geos.push(new THREE.BoxGeometry(w, v1 - v0, 11.2).translate(u, (v0 + v1) / 2, 0.4));
    }
  }
  return mergeGeo(geos);
}

// ---------------------------------------------------------------- render
let shownF = -1;
let shownA = -1e9;
const say = L.announcer($("sr"), 2);
function render(live) {
  const S = poseOf();
  pose(S);
  // the bimetal bends and the braids follow (rebuilt only when they move)
  if (Math.abs(S.f - shownF) > 0.004) {
    V.reshape(28, "la", { shape: SC.biLayer(...SC.BI_LAYERS[0], S.f) });
    V.reshape(28, "lb", { shape: SC.biLayer(...SC.BI_LAYERS[1], S.f) });
    V.reshape(27, "b2", { shape: X.band(SC.braid2Line(S.f), 1.6) });
    shownF = S.f;
  }
  if (Math.abs(S.a - shownA) > 0.02) {
    V.reshape(27, "b1", { shape: X.band(SC.braid1Line(S.a), 1.6) });
    shownA = S.a;
  }
  // the current path: lit while current flows or an arc burns; once the arc has left the contacts
  // for the runners, the arm and its braid carry nothing
  const I = current();
  const arcing = s.arc >= 0;
  const lit = I > 0 || arcing;
  const armLit = I > 0 || (arcing && s.arc < 0.4);
  const assembled = V.explode < 0.02;
  const lines = SC.flowLines(S);
  for (const id of SC.CONDUCTORS) {
    const on = id === 6 || id === 10 || id === 11 ? armLit : lit;
    for (const h of H(id)) {
      if (!tone.has(h)) continue;
      glow(h, (id === 27 ? (h.spec.live === "b1" ? armLit : lit) : on) ? 1 : 0);
    }
    const fh = FLOW.get(id);
    if (!fh) continue;
    const ls = (lines[id] ?? []).filter((l) => (id === 27 && l.group === "arm") || id === 10 || id === 6 ? armLit : lit);
    const show = assembled && ls.length > 0 && lit;
    fh.mesh.visible = show;
    if (show) setGeo(fh, quadGeo(dashes(ls, s.phase % PERIOD)));
  }
  ARC.mesh.visible = arcing && assembled;
  if (ARC.mesh.visible) setGeo(ARC, arcGeo(S, s.arc, s.arcSeed + Math.floor(s.arc * 24)));

  const name = stateName();
  const label = { closed: "CLOSED", open: "OPEN", half: "HALF-OPEN", off: "OFF" }[name];
  let tail;
  if (name === "closed") {
    const tt = M.timeToTrip(I, s.dT);
    tail = I >= M.IM ? "TRIP NOW" : Number.isFinite(tt) ? `TRIP IN ${tt.toFixed(1)} s` : "NO TRIP";
  } else if (name === "open") {
    tail = s.note || (s.last && s.last.kind === "MAGNETIC" ? `MAGNETIC TRIP IN ${(s.last.t * 1000).toFixed(1)} ms` : `RESET IN ${M.coolTime(s.dT).toFixed(1)} s`);
    if (!s.note && s.last && s.last.kind === "MAGNETIC" && f() >= M.F_RESET) tail = `RESET IN ${M.coolTime(s.dT).toFixed(1)} s`;
  } else if (name === "half") tail = "RESET ARMED";
  else tail = "SWITCHED OFF";
  if (name === "closed") s.note = "";
  const amps = I > 0 ? `${I.toFixed(I >= 100 ? 0 : 1)} A = ${(I / M.IN).toFixed(2)} In` : "0 A";
  $("readout").textContent = `${label} · I ${amps} · ΔT ${Math.round(s.dT)} K · f ${S.f.toFixed(2)} mm · ${tail}`;
  say(`${label}. Current ${Math.round(I)} amps, bimetal ${Math.round(s.dT)} kelvin above ambient. ${tail.toLowerCase()}.`, live.clock);
  $("tour")?.setAttribute("aria-pressed", String(auto));
  for (const [b, I0] of LOAD_BUTTONS) $(b)?.setAttribute("aria-pressed", String(s.load === I0));
}

// ---------------------------------------------------------------- controls, as on the sheet
// drag the handle down to switch off, up to switch on (or reset): the tip moves 19 mm along -y
const TRAVEL = 2 * 27.6 * Math.sin(((ON - OFF) / 2) * rad);
V.drag([17], {
  axis: [0, -1, 0],
  length: TRAVEL,
  start: () => {
    dragging = true;
    pushDown = false;
    auto = false;
    dragH = s.h;
    return (ON - s.h) / (ON - OFF);
  },
  move: (v) => (dragH = ON - Math.min(1, Math.max(0, v)) * (ON - OFF)),
  end: () => (dragging = false),
});
const LOADS = [0, 6, 12, 16, 18, 20, 24, 30, 40, 50, 64, 100, 200, 480];
const LOAD_BUTTONS = [["normal", M.LOAD_NORMAL], ["over", M.LOAD_OVER], ["short", M.LOAD_FAULT]];
const nudgeLoad = (d) => () => {
  const i = LOADS.findIndex((v) => v >= s.load - 1e-9);
  setLoad(LOADS[Math.min(LOADS.length - 1, Math.max(0, (i < 0 ? LOADS.length - 1 : i) + d))]);
  auto = false;
};
V.key("ArrowUp", () => ((pushUp = !s.held), (pushDown = false), (auto = false)));
V.key("ArrowDown", () => {
  pushUp = false;
  auto = false;
  pushDown = s.held || s.h > OFF + 1;
});
V.key("ArrowRight", nudgeLoad(1));
V.key("ArrowLeft", nudgeLoad(-1));
V.key("n", () => setLoad(M.LOAD_NORMAL));
V.key("o", () => setLoad(M.LOAD_OVER));
V.key("x", () => setLoad(M.LOAD_FAULT));
V.key(" ", () => (auto = !auto));
for (const [b, I0] of LOAD_BUTTONS) {
  $(b)?.addEventListener("click", () => {
    auto = false;
    setLoad(I0);
    V.input();
  });
}
$("tour")?.addEventListener("click", () => {
  auto = !auto;
  V.input();
});

// the page's own self-tests (?selftest=1)
V.test("dragging the handle down switches off", ({ ptr, project }) => {
  const g = project(X.rotPt([P.H[0] + 22, P.H[1]], P.H, s.h).concat(4.5));
  const h0 = s.h;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] + 80);
  const h1 = dragH;
  ptr("pointerup", g[0], g[1] + 80);
  return { pass: dragging === false && h1 < h0 - 10, info: [h0, h1] };
});
V.test("arrow right raises the current", ({ key }) => {
  const a = s.load;
  key("ArrowRight");
  const b = s.load;
  key("ArrowLeft");
  return { pass: b > a, info: [a, b] };
});
V.test("a short circuit trips at once", () => {
  const keep = JSON.stringify(s);
  Object.assign(s, { held: true, latched: true, tripped: false, h: ON, a: 0, load: M.LOAD_FAULT, dT: 0 });
  step(1 / 240, { touring: false, reduced: false });
  const ok = s.tripped && s.last.kind === "MAGNETIC";
  Object.assign(s, JSON.parse(keep));
  return { pass: ok, info: s.last };
});
V.test("space toggles the tour", ({ key }) => {
  const a = auto;
  key(" ");
  const b = auto;
  key(" ");
  return { pass: a !== b, info: [a, b] };
});

V.run({ step, render, still: 9, idleAfter: 8 });
