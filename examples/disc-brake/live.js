// Page code for disc-brake.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
// are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VM = K.view(specs.main);
const VD = K.view(specs.D);
const VB = K.view(specs.B);
const VE = K.view(specs.E);
const PG = __PAGE__;
const CH = PG.CH;
const $ = (id) => document.getElementById(id);

const el = {
  lever: $("lever-main"),
  pist: [[$("pist-main"), VM], [$("pist-D"), VD]],
  springs: [[$("spring-main"), VM], [$("spring-D"), VD]],
  boot: $("boot-main"),
  oilC: [[$("oil-c-main"), VM], [$("oil-c-D"), VD]],
  oilA: $("oil-c-A"),
  cal: [["B", VB], ["E", VE]].map(([id, V]) => ({
    V,
    padO: $(`pad-o-${id}`),
    padI: $(`pad-i-${id}`),
    cpO: $(`cp-o-${id}`),
    cpI: $(`cp-i-${id}`),
    seal: $(`seal-${id}`),
    spring: $(`pspring-${id}`),
    oil: $(`oil-cal-${id}`),
  })),
  dimS: $("dim-s-wrap"),
  dimRoll: $("dim-roll-wrap"),
  mvb: { main: [$("mvb-main"), VM], D: [$("mvb-D"), VD], E: [$("mvb-E"), VE] },
  trace: $("trace"),
  dot: $("chart-dot"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
let theta = 0; // lever angle, rad
let target = 0;
let y = 0; // caliper piston travel, follows the oil with a little lag (the seals pulling back)
let auto = false;
let dragging = false;
let trace = [];
let pulled = false;

// The tour: rest, pull slowly through free stroke, gap and contact, hold, release, rest.
const PERIOD = 6;
const tour = { t: 0 };
function tourTarget(h) {
  tour.t = (tour.t + h) % PERIOD;
  const t = tour.t;
  if (t < 0.5) return 0;
  if (t < 2.9) return M.THETA_MAX * L.ease((t - 0.5) / 2.4);
  if (t < 3.7) return M.THETA_MAX;
  if (t < 4.9) return M.THETA_MAX * (1 - L.ease((t - 3.7) / 1.2));
  return 0;
}

// ---------------------------------------------------------------- step and render
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  const driven = (live.touring || auto) && !dragging;
  for (let i = 0; i < n; i++) {
    if (driven) target = tourTarget(h);
    theta = live.reduced && !driven ? target : L.follow(theta, target, driven ? 40 : 20, h);
    theta = Math.min(M.THETA_MAX, Math.max(0, theta));
    const want = M.brake(theta).y;
    y = live.reduced && !driven ? want : L.follow(y, want, 30, h);
  }
  // one trace per pull: a new one starts when the lever leaves rest again
  if (theta > 0.02) pulled = true;
  if (pulled && theta < 0.002) {
    pulled = false;
    trace = [];
  }
  const s = M.RF * theta;
  if (trace.length < 1200 && (!trace.length || Math.abs(trace[trace.length - 1][0] - s) > 0.02)) trace.push([s, M.brake(theta).clamp]);
  return Math.abs(theta - target) > 1e-5 || Math.abs(y - M.brake(theta).y) > 1e-4;
}

const px = (s) => K.r2(CH.x0 + (s / CH.sMax) * (CH.x1 - CH.x0));
const py = (f) => K.r2(CH.y1 - (Math.min(CH.fMax, Math.max(0, f)) / CH.fMax) * (CH.y1 - CH.y0));
const tint = (p) => K.r2(0.55 + 0.45 * Math.min(1, Math.max(0, p / M.P_MAX)));

function balloons(list, V, st) {
  return list
    .map(([n, at, c, kind]) => {
      let p = at;
      if (kind === "lever") p = P.rot(at, M.PIVOT, st.theta);
      if (kind === "piston") p = [at[0], at[1] - st.x];
      if (kind === "calpiston") p = [at[0] - st.y, at[1]];
      return K.balloon(V, p, c, n, { target: n });
    })
    .join("");
}

function render(live) {
  const b = M.brake(theta);
  const x = b.x;
  const yp = Math.min(y, M.GAP);
  el.lever.innerHTML = P.lever(VM, theta) + P.barrel(VM, theta) + P.pushrod(VM, theta, x);
  for (const [node, V] of el.pist) node.setAttribute("transform", `translate(0 ${K.r2(x * V.k)})`);
  for (const [node, V] of el.springs) node.innerHTML = P.spring(V, x);
  el.boot.innerHTML = P.boot(VM, x);
  for (const [node, V] of el.oilC) {
    node.setAttribute("d", P.oilPath(V, P.chamberOil(x)));
    node.setAttribute("fill-opacity", tint(b.p));
  }
  el.oilA.setAttribute("fill-opacity", tint(b.p));
  for (const c of el.cal) {
    const k = c.V.k;
    c.padO.setAttribute("transform", `translate(${K.r2(-yp * k)} 0)`);
    c.padI.setAttribute("transform", `translate(${K.r2(yp * k)} 0)`);
    c.cpO.setAttribute("transform", `translate(${K.r2(-y * k)} 0)`);
    c.cpI.setAttribute("transform", `translate(${K.r2(y * k)} 0)`);
    c.seal.innerHTML = P.seal(c.V, 1, y) + P.seal(c.V, -1, y);
    c.spring.innerHTML = P.padSpring(c.V, yp);
    c.oil.setAttribute("d", P.oilPath(c.V, P.caliperOil(y)));
    c.oil.setAttribute("fill-opacity", tint(b.p));
  }
  const now = P.rot(P.FINGER, M.PIVOT, theta);
  el.dimS.innerHTML = K.dim(VM, P.FINGER, now, { dir: "v", off: VM.p([70, 0])[0] - VM.p(P.FINGER)[0], text: `s=${K.fmt(b.s, 1)}`, id: "dim-s" });
  const top = PG.E.cy - PG.E.r - 7;
  el.dimRoll.innerHTML = K.dim(VE, [12.25, 11], [12.25 - y, 11], { dir: "h", off: -(VE.p([0, 11])[1] - top), text: `δ=${y.toFixed(2)}`, id: "dim-roll" });
  const st = { theta, x, y };
  for (const [key, [node, V]] of Object.entries(el.mvb)) node.innerHTML = balloons(PG.MOVING[key], V, st);
  el.trace.setAttribute("points", trace.map(([s, f]) => `${px(s)},${py(f)}`).join(" "));
  el.dot.setAttribute("cx", px(b.s));
  el.dot.setAttribute("cy", py(b.clamp));
  const text = `s ${b.s.toFixed(1)} mm · ${Math.round(b.finger)} N · ${(b.p * 10).toFixed(1)} bar · CLAMP ${(b.clamp / 1000).toFixed(2)} kN · ${Math.round(b.torque)} N·m · ${b.decel.toFixed(1)} m/s²`;
  el.readout.textContent = text;
  say(
    `${b.phase === "FREE" ? "Free stroke, timing port open" : b.phase === "GAP" ? "Port shut, pads closing the gap" : "Pads on the rotor"}: finger travel ${b.s.toFixed(0)} millimetres, ${(b.p * 10).toFixed(0)} bar, clamp ${Math.round(b.clamp)} newtons, deceleration ${b.decel.toFixed(1)} metres per second squared.`,
    live.clock
  );
}

// ---------------------------------------------------------------- input
const live = L.run({
  root: svg,
  step,
  render,
  idleAfter: 5,
  onFrozen: () => q.check && C.selfCheck(svg),
});

if (live.reduced && !live.frozen) {
  // A still, true moment: the tour played to 3.2 s, pads on the rotor, drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 3.2; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const clamp = (v) => Math.min(M.THETA_MAX, Math.max(0, v));
for (const hit of svg.querySelectorAll("[data-drag]")) {
  let th0 = 0;
  L.dragY(svg, hit, {
    start: () => {
      dragging = true;
      auto = false;
      th0 = theta;
      target = theta;
      live.input();
    },
    move: (dy) => {
      target = clamp(th0 + dy / (M.RF * VM.k));
      live.input();
    },
    end: () => {
      dragging = false;
      live.input();
    },
  });
}

svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowDown" || k === "ArrowUp") target = clamp(target + (k === "ArrowDown" ? 1 : -1) * M.THETA_MAX / 8);
  else if (k === "End") target = M.THETA_MAX;
  else if (k === "Home") target = 0;
  else if (k === " ") auto = !auto;
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.2 : live.slow === 0.2 ? 0.05 : 1;
  else return;
  e.preventDefault();
  if (k !== " " && k.length > 1) auto = false;
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
