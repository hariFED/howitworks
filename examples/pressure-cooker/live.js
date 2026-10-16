// Page code for pressure-cooker.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
// are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const V = { main: K.view(specs.main), B: K.view(specs.B), C: K.view(specs.C), D: K.view(specs.D) };
const CH = __CHART__;
const $ = (id) => document.getElementById(id);
const ids = ["main", "B", "C", "D"];

const el = {
  lid: ids.map((id) => [$(`lid-${id}`), V[id]]),
  mvb: [["main", V.main], ["B", V.B], ["C", V.C], ["D", V.D]].map(([id, v]) => [$(`mvb-${id}`), v]),
  wt: [["main", V.main], ["B", V.B]].map(([id, v]) => [$(`wt-${id}`), v]),
  wtb: $("wtb-B"),
  pin: ids.map((id) => [$(`pin-${id}`), V[id]]),
  pinb: [$("pinb-D"), $("ringb-D")],
  sv: [["main", V.main], ["B", V.B]].map(([id, v]) => [$(`sv-${id}`), v]),
  gk: [["main", V.main], ["C", V.C]].map(([id, v]) => [$(`gk-${id}`), v]),
  steam: ids.map((id) => [$(`steam-${id}`), V[id]]),
  wash: ids.map((id) => [$(`wash-${id}`), V[id]]),
  water: $("water-main"),
  surf: $("surf-main"),
  bub: $("bub-main"),
  plume: ids.map((id) => [$(`plume-${id}`), V[id]]),
  dimDepth: $("dim-depth-wrap"),
  dimPin: $("dim-pin-wrap"),
  traceNow: $("trace-now"),
  tracePrev: $("trace-prev"),
  dot: $("chart-dot"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
let s = M.cooker();
let anim = 0; // sheet seconds, for the jiggle, bubbles and puffs
let lift = 0; // the lid's rise, mm
let rise = 0; // the lock pin's rise, mm
let vent = 0; // smoothed steam flow at the weight, kg/s
let hand = 0; // the weight lifted by hand, mm
let handTarget = 0;
let safetyLift = 0;
let dragging = false;
let now = [];
let prev = [];

// The tour: heat, seal, cook four minutes on the weight, hob off, let it cool, refill, again.
const COOK = 240;
const tour = { mode: "heat", cooked: 0, modeT: 0, from: 0 };
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
      prev = now;
      now = [];
      tour.cooked = 0;
      next("heat");
    }
  }
}
function next(mode) {
  tour.mode = mode;
  tour.modeT = 0;
}

function refill() {
  s = M.cooker();
  prev = now;
  now = [];
}

// ---------------------------------------------------------------- step and render
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
  if (now.length < 2000) {
    const last = now[now.length - 1];
    if (!last || Math.abs(last[0] - s.T) > 0.15 || Math.abs(last[1] - s.p) > 0.4) now.push([s.T, s.p]);
  }
  return !live.reduced;
}

const chX = (T) => K.r2(CH.x0 + ((Math.min(CH.t1, Math.max(CH.t0, T)) - CH.t0) / (CH.t1 - CH.t0)) * (CH.x1 - CH.x0));
const chY = (p) => K.r2(CH.y1 - (Math.min(CH.p1, Math.max(0, p)) / CH.p1) * (CH.y1 - CH.y0));
const pts = (list) => list.map(([T, p]) => `${chX(T)},${chY(p)}`).join(" ");
let shown = { lift: -1, safety: -1 };

function weightPose() {
  const j = Math.min(1, vent / M.ventFull);
  const jiggle = j * 0.55 * (0.62 + 0.38 * Math.sin(2 * Math.PI * 5.3 * anim));
  const tilt = j * 1.6 * Math.sin(2 * Math.PI * 2.9 * anim);
  return { up: Math.max(hand, jiggle), tilt: hand > 0.05 ? 0 : tilt, j };
}

function puffsFor(v, pose) {
  const list = [];
  const flow = s.manual > 0.05 ? Math.min(1, 1.5 * s.vent / M.ventFull) : pose.j;
  if (flow > 0.02) list.push(...P.puffs(v, { u: M.WEIGHT_R + 0.6, v: M.WEIGHT_BOT + pose.up + lift, rise: 30, spread: 16, size: 3.2, clock: anim, n: 10, rate: 1.4 }).map((b) => ({ ...b, o: b.o * flow })));
  if (safetyLift > 0.05) list.push(...P.puffs(v, { u: 0, v: 194 + lift, rise: 18, spread: 14, size: 2.2, clock: anim + 0.3, n: 6, rate: 1.8, sides: 1, dir: -1 }).map((b) => ({ ...b, c: [b.c[0] + P.SAFETY_U * v.k - 6 * v.k, b.c[1]], o: b.o * safetyLift })));
  // before the pin seals, steam leaks up the pin's bore and out of the sight hole
  const leak = !s.sealed && s.T > 99 ? Math.min(1, (s.T - 99) / 1.2) : 0;
  if (leak > 0.02) list.push(...P.puffs(v, { u: P.PIN_U, v: 197 + lift, rise: 16, spread: 0, size: 1.8, clock: anim, n: 4, rate: 1.2, sides: 1, dir: 1 }).map((b) => ({ ...b, o: b.o * leak })));
  return list.map((b) => `<circle class="tint" cx="${b.c[0]}" cy="${b.c[1]}" r="${b.r}" fill-opacity="${K.r2(b.o * 0.9)}"/>`).join("");
}

function render(live) {
  const pose = weightPose();
  for (const [node, v] of el.lid) node.setAttribute("transform", `translate(0 ${K.r2(-lift * v.k)})`);
  for (const [node, v] of el.mvb) node.setAttribute("transform", `translate(0 ${K.r2(-lift * v.k)})`);
  for (const [node, v] of el.wt) {
    const [sx, sy] = v.p([0, M.NOZZLE_TOP]);
    node.setAttribute("transform", `translate(0 ${K.r2(-pose.up * v.k)}) rotate(${K.r2(pose.tilt)} ${sx} ${sy})`);
  }
  el.wtb.setAttribute("transform", `translate(0 ${K.r2(-pose.up * V.B.k)})`);
  for (const [node, v] of el.pin) node.setAttribute("transform", `translate(0 ${K.r2(-rise * v.k)})`);
  for (const node of el.pinb) node.setAttribute("transform", `translate(0 ${K.r2(-(rise + lift) * V.D.k)})`);
  if (Math.abs(lift - shown.lift) > 0.002) {
    for (const [node, v] of el.gk) node.innerHTML = P.gasket(v, lift);
    shown.lift = lift;
  }
  if (Math.abs(safetyLift - shown.safety) > 0.002) {
    for (const [node, v] of el.sv) node.innerHTML = P.safetyMoving(v, safetyLift);
    shown.safety = safetyLift;
  }
  // water, its surface, bubbles; steam density from the saturated vapour
  const level = M.waterLevel(s);
  const rho = M.rhoSteam(s.T);
  const op = K.r2(0.06 + 0.94 * Math.min(1, rho / M.rhoSteam(M.T_SET)));
  for (const [node, v] of el.steam) {
    node.setAttribute("d", K.d(v, P.steamPoly(level, lift)));
    node.setAttribute("fill-opacity", op);
  }
  for (const [node, v] of el.wash) {
    node.setAttribute("d", K.d(v, P.steamPoly(level, lift)));
    node.setAttribute("fill-opacity", K.r2(0.22 * op));
  }
  el.water.setAttribute("d", K.d(V.main, P.waterPoly(level)));
  el.surf.setAttribute("d", K.d(V.main, [[-M.R_IN, level], [M.R_IN, level]], false));
  const boiling = s.vent > 0 || (s.heat && s.T > 99.5);
  el.bub.setAttribute("d", boiling ? P.bubbles(V.main, level, anim, Math.round(6 + 10 * Math.min(1, s.vent / M.ventFull + 0.3))) : "");
  for (const [node, v] of el.plume) node.innerHTML = puffsFor(v, pose);
  el.dimDepth.innerHTML = K.dim(V.main, [98, M.FLOOR], [98, level], { dir: "v", off: V.main.p([128, 0])[0] - V.main.p([98, 0])[0], text: K.fmt(level - M.FLOOR, 1), id: "dim-depth" });
  el.dimPin.innerHTML = K.dim(V.D, [P.PIN_U - 4.5, P.PIN_DOWN + 1.5], [P.PIN_U - 4.5, P.PIN_DOWN + 1.5 + rise + lift], { dir: "v", off: specs.pinDimX - V.D.p([P.PIN_U - 4.5, 0])[0], text: K.fmt(rise + lift, 1), id: "dim-pin" });
  // chart
  el.traceNow.setAttribute("points", pts(now));
  el.tracePrev.setAttribute("points", pts(prev));
  el.dot.setAttribute("cx", chX(s.T));
  el.dot.setAttribute("cy", chY(s.p));
  // readout
  const pg = M.gauge(s);
  const t = Math.floor(s.time);
  const clock = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  const pin = s.sealed ? "PIN UP, LOCKED" : "PIN DOWN, FREE";
  const flow = s.vent * 1000;
  const text = `${clock} HOB ${s.heat ? "ON " : "OFF"} · ${s.T.toFixed(1)} °C · ${(pg / 100).toFixed(2)} bar · ${pin} · VENT ${flow.toFixed(2)} g/s`;
  el.readout.textContent = text;
  say(`Water ${s.T.toFixed(0)} degrees, ${(pg / 100).toFixed(2)} bar, lock pin ${s.sealed ? "up, lid locked" : "down, lid free"}, hob ${s.heat ? "on" : "off"}.`, live.clock);
}

// ---------------------------------------------------------------- input
const live = L.run({
  root: svg,
  step,
  render,
  idleAfter: 6,
  onFrozen: () => q.check && C.selfCheck(svg),
});

if (live.reduced && !live.frozen) {
  // A still, true moment: the tour played to 11 s (the weight venting), drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 11; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const clamp = (x) => Math.min(3, Math.max(0, x));
for (const hit of svg.querySelectorAll("[data-drag]")) {
  const k = V[hit.dataset.drag].k;
  L.dragY(svg, hit, {
    start: () => {
      dragging = true;
      live.input();
    },
    move: (dy) => {
      handTarget = clamp(-dy / k);
      live.input();
    },
    end: () => {
      dragging = false;
      handTarget = 0;
      live.input();
    },
  });
}

svg.addEventListener("keydown", (e) => {
  const key = e.key;
  if (key === "ArrowUp" || key === "ArrowDown") handTarget = clamp(handTarget + (key === "ArrowUp" ? 0.5 : -0.5));
  else if (key === " ") s.heat = !s.heat;
  else if (key === "b" || key === "B") s.blocked = !s.blocked;
  else if (key === "r" || key === "R") refill();
  else if (key === "s" || key === "S") live.slow = live.slow === 1 ? 0.2 : live.slow === 0.2 ? 0.05 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
