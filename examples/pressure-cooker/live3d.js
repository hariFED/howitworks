// Page code for pressure-cooker-3d.html (an ES module). Inlined above it: K (kit/draft.mjs),
// L (kit/live.mjs), S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs)
// and SC (scene3d.mjs). The kit draws, frames, explodes and labels; this file re-turns the lathes
// (fewer segments, and the cutouts that make the lid's holes, window and bayonet lugs and the pot's
// rim lugs), runs the sheet's model with the sheet's tour, and poses everything from it: the lid's
// rise, the lock pin, the weight lifting and rocking, the safety valve, the water level, the steam's
// density and the puffs.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });
const rad = Math.PI / 180;

// ---------------------------------------------------------------- turned solids, re-turned
// The kit turns a lathe with 144 segments above r 20; the lid and the steam alone would cost 70k
// triangles. Every lathe is turned again here with fewer (the kit's construction otherwise: one strip
// per profile edge, wound outward), and a lathe spec's `cutouts` [{ q: sub-profile, ranges: [[a0, a1]
// degrees] }] are removed: their strips are skipped over each range, the sub-profile's new edges
// become walls and the sub-profile itself closes each end, so the solid stays closed.
const segFor = (r) => (r > 60 ? 96 : r > 20 ? 64 : r > 6 ? 40 : 24);
const norm360 = (a) => ((a % 360) + 360) % 360;
const kp = (p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
const signOf = (loop) => {
  let a = 0;
  for (let i = 0; i < loop.length; i++) {
    const [r0, s0] = loop[i];
    const [r1, s1] = loop[(i + 1) % loop.length];
    a += r0 * s1 - r1 * s0;
  }
  return a > 0 ? 1 : -1;
};
function turn(loop, seg, cutouts = []) {
  const pos = [];
  const nor = [];
  const idx = [];
  const v3 = (i) => new THREE.Vector3(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]);
  // one triangle, wound so its face agrees with the wanted normal
  const tri = (a, b, c, want) => {
    const cr = v3(b).sub(v3(a)).cross(v3(c).sub(v3(a)));
    if (cr.lengthSq() < 1e-12) return;
    if (cr.dot(want) >= 0) idx.push(a, b, c);
    else idx.push(a, c, b);
  };
  const vert = (r, s, t, n) => {
    pos.push(r * Math.cos(t), s, -r * Math.sin(t));
    nor.push(...n);
    return pos.length / 3 - 1;
  };
  const strip = ([r0, s0], [r1, s1], nr, ns, ta, tb) => {
    const N = (t) => [nr * Math.cos(t), ns, -nr * Math.sin(t)];
    const a = vert(r0, s0, ta, N(ta));
    const b = vert(r1, s1, ta, N(ta));
    const c = vert(r0, s0, tb, N(tb));
    const d = vert(r1, s1, tb, N(tb));
    const want = new THREE.Vector3(...N((ta + tb) / 2));
    tri(a, b, d, want);
    tri(a, d, c, want);
  };
  // the angle grid: uniform, plus every cutout boundary
  const grid = new Set([360]);
  for (let j = 0; j < seg; j++) grid.add((j * 360) / seg);
  for (const c of cutouts) for (const [a0, a1] of c.ranges) grid.add(norm360(a0)).add(norm360(a1));
  const ts = [...grid].sort((a, b) => a - b).filter((t, i, all) => i === 0 || t - all[i - 1] > 1e-7);
  const within = (t, [a0, a1]) => norm360(t - a0) < a1 - a0;
  const cut = cutouts.map((c) => {
    const edges = new Set();
    c.q.forEach((p, i) => {
      const q = c.q[(i + 1) % c.q.length];
      edges.add(kp(p) + "|" + kp(q)).add(kp(q) + "|" + kp(p));
    });
    return { ...c, edges };
  });
  const loopEdges = new Set();
  const sign = signOf(loop);
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i];
    const q = loop[(i + 1) % loop.length];
    loopEdges.add(kp(p) + "|" + kp(q)).add(kp(q) + "|" + kp(p));
    if (p[0] === 0 && q[0] === 0) continue;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 1e-9) continue;
    const skip = cut.filter((c) => c.edges.has(kp(p) + "|" + kp(q)));
    for (let j = 0; j + 1 < ts.length; j++) {
      const tm = (ts[j] + ts[j + 1]) / 2;
      if (skip.some((c) => c.ranges.some((r) => within(tm, r)))) continue;
      strip(p, q, (sign * (q[1] - p[1])) / len, (-sign * (q[0] - p[0])) / len, ts[j] * rad, ts[j + 1] * rad);
    }
  }
  for (const c of cut) {
    const sq = signOf(c.q);
    // the sub-profile's new edges: walls facing into the cutout
    c.q.forEach((p, i) => {
      const q = c.q[(i + 1) % c.q.length];
      if (loopEdges.has(kp(p) + "|" + kp(q))) return;
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      for (let j = 0; j + 1 < ts.length; j++) {
        const tm = (ts[j] + ts[j + 1]) / 2;
        if (c.ranges.some((r) => within(tm, r))) strip(p, q, (-sq * (q[1] - p[1])) / len, (sq * (q[0] - p[0])) / len, ts[j] * rad, ts[j + 1] * rad);
      }
    });
    // and the sub-profile closing each end, facing out of the material beside the range
    const tris = THREE.ShapeUtils.triangulateShape(c.q.map(([r, s]) => new THREE.Vector2(r, s)), []);
    for (const [a0, a1] of c.ranges) {
      for (const [t, n] of [[a0 * rad, [-Math.sin(a0 * rad), 0, -Math.cos(a0 * rad)]], [a1 * rad, [Math.sin(a1 * rad), 0, Math.cos(a1 * rad)]]]) {
        const ids = c.q.map(([r, s]) => vert(r, s, t, n));
        for (const [i, j, k] of tris) tri(ids[i], ids[j], ids[k], new THREE.Vector3(...n));
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}
function axisM(axis, [a, b]) {
  const m = new THREE.Matrix4();
  if (axis === "x") m.makeRotationZ(-Math.PI / 2).setPosition(0, a, b);
  else if (axis === "z") m.makeRotationX(Math.PI / 2).setPosition(a, b, 0);
  else m.makeTranslation(a, 0, b);
  return m;
}
const turned = (spec, loop = spec.loop) => turn(loop, segFor(Math.max(...loop.map(([r]) => r))), spec.cutouts ?? []).applyMatrix4(axisM(spec.axis, spec.at));
function setGeo(h, geo) {
  h.mesh.geometry.dispose();
  h.mesh.geometry = geo;
  if (h.lines) {
    h.lines.geometry.dispose();
    h.lines.geometry = new THREE.EdgesGeometry(geo, 35);
  }
}
for (const p of SC.parts()) for (const h of V.part(p.id).holders) if (h.spec.kind === "lathe") setGeo(h, turned(h.spec));
const FL = [];
V.world.traverse((o) => o.isMesh && o.material?.userData?.role === "fluid" && FL.push(o));
SC.fluids().forEach((f, i) => {
  FL[i].geometry.dispose();
  FL[i].geometry = turn(f.loop, i < 2 ? segFor(Math.max(...f.loop.map(([r]) => r))) : 16).applyMatrix4(axisM(f.axis, f.at));
});
const PUFF = FL.slice(2);

// ---------------------------------------------------------------- the hob's zone, redrawn when it switches
const zone = V.part("H").live.zone.mesh.material.uniforms.uTex.value;
function drawZone(on) {
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const g = zone.image.getContext("2d");
  const size = zone.image.width;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = css("--bp-paper");
  g.fillRect(0, 0, size, size);
  SC.hobZone(g, size, { paper: css("--bp-paper"), ink: css("--bp-ink"), muted: css("--bp-muted"), accent: css("--bp-accent") }, on);
  zone.needsUpdate = true;
}
let zoneOn = null;
new MutationObserver(() => {
  zoneOn = null;
  V.redraw();
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

// ---------------------------------------------------------------- state: the 2D sheet's, from the same model
let s = M.cooker();
let anim = 0; // sheet seconds, for the jiggle, bubbles and puffs
let lift = 0; // the lid's rise, mm
let rise = 0; // the lock pin's rise, mm
let vent = 0; // smoothed steam flow at the weight, kg/s
let hand = 0; // the weight lifted by hand, mm
let handTarget = 0;
let safetyLift = 0;
let dragging = false;

// The tour, as on the sheet: heat, seal, cook four minutes on the weight, hob off, cool, refill, again.
const COOK = 240;
const tour = { mode: "heat", cooked: 0, modeT: 0, from: 0 };
function next(mode) {
  tour.mode = mode;
  tour.modeT = 0;
}
function tourStep(h) {
  tour.modeT += h;
  if (tour.mode === "heat") {
    s.heat = true;
    if (s.vent > 0) tour.cooked += h * M.TIME_WARP;
    if (tour.cooked >= COOK) next("cool");
  } else if (tour.mode === "cool") {
    s.heat = false;
    if (!s.sealed && s.T < 97) next("rest");
  } else if (tour.mode === "rest") {
    if (tour.modeT > 1) {
      next("refill");
      tour.from = s.T;
    }
  } else if (tour.mode === "refill") {
    const k = Math.min(1, tour.modeT / 1.5);
    const T = tour.from + (M.T_AMB - tour.from) * L.ease(k);
    s = { ...M.cooker(T), heat: false, time: s.time };
    if (k >= 1) {
      s = M.cooker();
      tour.cooked = 0;
      next("heat");
    }
  }
}
const refill = () => (s = M.cooker());

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    if (live.touring && !dragging) tourStep(h);
    hand = live.reduced ? handTarget : L.follow(hand, handTarget, 25, h);
    s.manual = hand;
    M.advance(s, h * M.TIME_WARP);
    const pg = M.gauge(s);
    lift = L.follow(lift, s.sealed ? (M.LUG_CLEAR - 0.15) * Math.min(1, Math.max(0, pg - 0.3) / 1.5) : 0, 30, h);
    rise = L.follow(rise, s.sealed ? M.PIN_TRAVEL : 0, 24, h);
    vent = L.follow(vent, s.manual > 0.05 ? 0 : s.vent, 8, h);
    safetyLift = L.follow(safetyLift, s.safety ? 1 : 0, 20, h);
    anim += h;
  }
  return !live.reduced;
}

// ---------------------------------------------------------------- poses from the model
function weightPose() {
  const j = Math.min(1, vent / M.ventFull);
  const jiggle = j * 0.55 * (0.62 + 0.38 * Math.sin(2 * Math.PI * 5.3 * anim));
  const tilt = j * 1.6 * Math.sin(2 * Math.PI * 2.9 * anim);
  return { up: Math.max(hand, jiggle), tilt: hand > 0.05 ? 0 : tilt, j };
}
const ON_LID = [4, 9, 11, 12, 14, 17, 18, 19, 22, 23, 24];
function pose(L0, up, tilt, pin, sv) {
  for (const id of ON_LID) V.set(id, { pos: [0, L0, 0] });
  V.set(15, { pos: [0, L0 + pin, 0] });
  V.set(16, { pos: [0, L0 + pin, 0] });
  V.set(13, { pos: [0, L0 + up, 0], rot: [0, 0, -tilt * rad] });
  V.set(20, { pos: [0, L0 + sv, 0] });
  V.set(21, { pos: [0, L0 + sv, 0] });
  V.solid(22, "spring").scale.y = (197.2 - (186 + sv)) / 11.2;
}
// frame the whole travel, so the zoom never pumps
V.frame([() => pose(0, 0, 0, 0, 0), () => pose(M.LUG_CLEAR, 3 + M.LUG_CLEAR, 0, M.PIN_TRAVEL, 1)]);

// steam density from the saturated vapour, as the sheet tints it
// (the stipple's share of cells; no wash, which would double where a ray leaves the dome-shaped volume twice)
const steamDensity = (T) => 0.05 + 0.5 * Math.min(1, M.rhoSteam(T) / M.rhoSteam(M.T_SET));
const AIR = steamDensity(100); // a puff, at atmospheric pressure
const MM = { p: ([u, v]) => [u, v], k: 1 }; // the sheet's puffs(), in mm
function puffs(p) {
  const list = [];
  const flow = s.manual > 0.05 ? Math.min(1, (1.5 * s.vent) / M.ventFull) : p.j;
  if (flow > 0.02) list.push(...P.puffs(MM, { u: M.WEIGHT_R + 0.6, v: M.WEIGHT_BOT + p.up + lift, rise: 30, spread: 16, size: 3.2, clock: anim, n: 10, rate: 1.4 }).map((b) => ({ ...b, o: b.o * flow })));
  if (safetyLift > 0.05) list.push(...P.puffs(MM, { u: 0, v: 194 + lift, rise: 18, spread: 14, size: 2.2, clock: anim + 0.3, n: 6, rate: 1.8, sides: 1, dir: -1 }).map((b) => ({ ...b, c: [b.c[0] + P.SAFETY_U - 6, b.c[1]], o: b.o * safetyLift })));
  // before the pin seals, steam leaks up the pin's bore and out of the sight hole
  const leak = !s.sealed && s.T > 99 ? Math.min(1, (s.T - 99) / 1.2) : 0;
  if (leak > 0.02) list.push(...P.puffs(MM, { u: P.PIN_U, v: 197 + lift, rise: 16, spread: 0, size: 1.8, clock: anim, n: 4, rate: 1.2, sides: 1, dir: 1 }).map((b) => ({ ...b, o: b.o * leak })));
  return list;
}

let shown = { lift: -1, level: -1 };
let level = SC.level0;
const say = L.announcer($("sr"), 2);
function render(live) {
  const p = weightPose();
  pose(lift, p.up, p.tilt, rise, safetyLift);
  if (Math.abs(lift - shown.lift) > 0.01) {
    setGeo(V.part(5).live.gasket, turned(V.part(5).live.gasket.spec, SC.gasketLoop(lift)));
    shown.lift = lift;
  }
  level = M.waterLevel(s);
  if (Math.abs(level - shown.level) > 0.02) {
    setGeo(V.part("W").live.water, turned(V.part("W").live.water.spec, SC.waterLoop(level)));
    FL[0].geometry.dispose();
    FL[0].geometry = turn(SC.steamLoop(level + 0.02), 96);
    shown.level = level;
  }
  if (zoneOn !== s.heat) {
    drawZone(s.heat);
    zoneOn = s.heat;
  }
  const d = steamDensity(s.T);
  V.fluid("steam", { density: d, wash: 0, stretch: lift });
  V.fluid("bore", { density: Math.min(1, 1.6 * d), wash: 0 });
  const list = puffs(p);
  PUFF.forEach((m, i) => {
    const b = list[i];
    m.visible = !!b && b.o > 0.02;
    if (!m.visible) return;
    m.position.set(b.c[0], b.c[1], 0);
    m.scale.setScalar(b.r);
    m.material.uniforms.uDensity.value = Math.min(1, 1.5 * AIR * (0.4 + 0.6 * b.o));
    m.material.uniforms.uWash.value = 0.14 * b.o;
  });
  // readout
  const pg = M.gauge(s);
  const t = Math.floor(s.time);
  const clock = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  $("readout").textContent = `${clock} HOB ${s.heat ? "ON" : "OFF"} · ${s.T.toFixed(1)} °C · ${(pg / 100).toFixed(2)} bar · ${s.sealed ? "PIN UP, LOCKED" : "PIN DOWN, FREE"} · VENT ${(s.vent * 1000).toFixed(2)} g/s${s.blocked ? " · VENT BLOCKED" : ""}`;
  say(`Water ${s.T.toFixed(0)} degrees, ${(pg / 100).toFixed(2)} bar, lock pin ${s.sealed ? "up, lid locked" : "down, lid free"}, hob ${s.heat ? "on" : "off"}.`, live.clock);
  $("hob")?.setAttribute("aria-pressed", String(s.heat));
  $("block")?.setAttribute("aria-pressed", String(s.blocked));
}

// the bubbles on the water's cut face (the sheet's own, projected) and the water depth, assembled
function overlay() {
  if (V.explode > 0.05 || !V.cut) return "";
  const o = V.project([0, 0, 0]);
  const e = V.project([0, 1, 0]);
  const view = { p: ([u, v]) => V.project([u, v, 0]).map((x) => K.r2(x)), k: Math.hypot(e[0] - o[0], e[1] - o[1]) };
  const boiling = s.vent > 0 || (s.heat && s.T > 99.5);
  let out = boiling ? `<path class="thin" d="${P.bubbles(view, level, anim, Math.round(6 + 10 * Math.min(1, s.vent / M.ventFull + 0.3)))}"/>` : "";
  out += V.dim([-70, M.FLOOR, 0], [-70, level, 0], { text: K.fmt(level - M.FLOOR, 1), off: 18 });
  return out;
}

// ---------------------------------------------------------------- the cooker's controls
// drag the weight up to vent by hand (as on the sheet: up to 3 mm, released it drops back)
const clamp3 = (x) => Math.min(3, Math.max(0, x));
V.drag([13], {
  axis: [0, 1, 0],
  length: 40,
  start: () => {
    dragging = true;
    return handTarget / 3;
  },
  move: (v) => (handTarget = clamp3(3 * v)),
  end: () => {
    dragging = false;
    handTarget = 0;
  },
});
V.key("ArrowUp", () => (handTarget = clamp3(handTarget + 0.5)));
V.key("ArrowDown", () => (handTarget = clamp3(handTarget - 0.5)));
V.key(" ", () => (s.heat = !s.heat));
V.key("x", () => (s.blocked = !s.blocked));
V.key("r", refill);
$("hob")?.addEventListener("click", () => {
  s.heat = !s.heat;
  V.input();
});
$("block")?.addEventListener("click", () => {
  s.blocked = !s.blocked;
  V.input();
});

V.test("weight drag vents by hand", ({ ptr, project }) => {
  const g = project([0, 222 + lift, 0]);
  const t0 = handTarget;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] - 80);
  const t1 = handTarget;
  ptr("pointerup", g[0], g[1] - 80);
  return { pass: t1 > t0 + 0.5 && handTarget === 0, info: [t0, t1] };
});
V.test("space switches the hob", ({ key }) => {
  const a = s.heat;
  key(" ");
  const b = s.heat;
  key(" ");
  return { pass: a !== b && s.heat === a, info: [a, b] };
});
V.test("X blocks the vent", ({ key }) => {
  const a = s.blocked;
  key("x");
  const b = s.blocked;
  key("x");
  return { pass: a !== b, info: [a, b] };
});

V.run({ step, render, overlay, still: 11 });
