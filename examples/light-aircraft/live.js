// Page code for light-aircraft.html. K (kit), L (runtime), C (self-check), M (model), X (helpers) and
// P (parts) are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VS = K.view(specs.side);
const VP = K.view(specs.plan);
const VF = K.view(specs.front);
const VA = K.view(specs.AA);
const VC = K.view(specs.C);
const CH = __CHART__;
const AA = __AA__;
const $ = (id) => document.getElementById(id);
const say = L.announcer($("sr"), 2);
const deg = Math.PI / 180;

// ---------------------------------------------------------------- state
let v = 110; // airspeed, kt CAS
let vT = 110;
let flap = 0; // deg, the flap's actual angle (the motor runs it at M.FLAP_RATE)
let flapT = 0;
let phi = 0; // bank, deg (+ right wing down)
let phiT = 0;
let p = 0; // roll rate, deg/s
let da = 0; // mean aileron, deg (+ rolls right)
let elev = M.flight(110, 0, 0).elevator;
let psi = 0.35; // propeller angle, rad
let auto = false;
const tour = { t: 0 };
// the propeller is shown turning at 1/60 of its 2400 rpm cruise speed (40 rpm), so the blades can be seen
const PROP_SHOWN = ((2 * Math.PI * 2400) / 60) / 60;

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  const driven = live.touring || auto;
  for (let i = 0; i < n; i++) {
    if (driven) {
      tour.t += h;
      const g = M.tourAt(tour.t);
      vT = g.v;
      flapT = g.flap;
      phiT = g.bank;
    }
    v = live.reduced && !driven ? vT : L.follow(v, vT, driven ? 9 : 3, h);
    const df = flapT - flap;
    flap += Math.sign(df) * Math.min(Math.abs(df), M.FLAP_RATE * h * (live.reduced && !driven ? 1e6 : 1));
    da = M.aileronFor(phi, phiT, v);
    p = L.follow(p, M.rollRate(da, v), 4, h); // roll mode, time constant 0.25 s
    phi += p * h;
    const fl = M.flight(v, flap, phi);
    elev = L.follow(elev, fl.elevator, 10, h);
    psi = (psi + PROP_SHOWN * h) % (2 * Math.PI);
  }
  return true;
}

// ---------------------------------------------------------------- render
const el = {};
for (const id of ["s-elev", "s-rud", "s-flap", "s-ail", "s-prop", "p-elev", "p-rud", "p-flap", "p-ail", "p-prop", "f-elev", "f-rud", "f-flap", "f-ail", "f-prop", "aa-flap", "aa-roller", "aa-live", "asi-needle", "ch-cur", "ch-need", "ch-vs", "ch-dot", "readout"]) el[id] = $(id);
const shown = {};
const changed = (key, val, eps) => {
  if (shown[key] !== undefined && Math.abs(shown[key] - val) < eps) return false;
  shown[key] = val;
  return true;
};
const chX = (vk) => K.r2(CH.x0 + ((Math.min(CH.v1, Math.max(CH.v0, vk)) - CH.v0) / (CH.v1 - CH.v0)) * (CH.x1 - CH.x0));
const chY = (kn) => K.r2(CH.y1 - (Math.min(CH.l1, Math.max(0, kn)) / CH.l1) * (CH.y1 - CH.y0));
function liftCurve(f) {
  const pts = [];
  for (let vk = CH.v0; vk <= CH.v1; vk += 1) {
    const Lk = M.liftMax(vk, f) / 1000;
    if (Lk > CH.l1) {
      const L0 = M.liftMax(vk - 1, f) / 1000;
      pts.push(`${chX(vk - 1 + (CH.l1 - L0) / (Lk - L0))},${chY(CH.l1)}`);
      break;
    }
    pts.push(`${chX(vk)},${chY(Lk)}`);
  }
  return pts.join(" ");
}
const sgn = (x) => (x >= 0 ? "+" : "−");
const fmt1 = (x) => `${sgn(x)}${Math.abs(x).toFixed(Math.abs(x) < 9.95 ? 1 : 0)}`;

function aaLive(fl) {
  // relative wind: from ahead and below by the body angle of attack; the wing's AoA adds the incidence
  const a = fl.alpha * deg;
  const [lx, ly] = VA.p([-AA.le[0], AA.le[1]]);
  const wx = -Math.cos(a);
  const wy = -Math.sin(a); // sheet direction the air moves (aft and up)
  const nx = -wy;
  const ny = wx;
  let wind = "";
  // two streamlines either side of the one that meets the leading edge (the α text sits on that one)
  for (const k of [-1, 1]) {
    const sx = lx + 72 * -wx + k * 19 * nx;
    const sy = ly + 72 * -wy + k * 19 * ny;
    wind += X.arrow({ p: () => [sx, sy] }, [0, 0], [wx, wy], 32, "thin");
  }
  // the upstream leg of the angle, from the leading edge to the arc, and the angle of attack to the chord
  const up = `<path class="thin" d="M${K.r2(lx)} ${K.r2(ly)}L${K.r2(lx - wx * 48)} ${K.r2(ly - wy * 48)}"/>`;
  const aDim = X.angleDim(VA, [-AA.le[0], AA.le[1]], 44, -fl.alpha, M.INCIDENCE, `α ${fl.alphaWing.toFixed(1)}°`, { gap: 7 });
  // lift, perpendicular to the wind, from the quarter chord; a tick where n·W would be
  const [ax, ay] = VA.p([-AA.ac[0], AA.ac[1]]);
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const len = (fl.lift / 1000) * AA.k;
  const need = (fl.need / 1000) * AA.k;
  const tick = `<path class="thin" d="M${K.r2(ax + ux * need - uy * 7)} ${K.r2(ay + uy * need + ux * 7)}L${K.r2(ax + ux * need + uy * 7)} ${K.r2(ay + uy * need - ux * 7)}"/>`;
  const lift = X.arrow({ p: () => [ax, ay] }, [0, 0], [ux, uy], len, "vis accent");
  // stalled: the flow leaves the upper surface behind the front spar and rolls up in a wake
  let wake = "";
  if (fl.stalled) {
    for (const k of [0, 1, 2]) {
      const pts = [];
      for (let xi = 0.3 + k * 0.1; xi <= 1.16; xi += 0.02) {
        const eta = P.upAt(Math.min(1, xi)) + 0.008 + (xi - 0.3 - k * 0.1) * (0.05 + 0.025 * k) + 0.006 * Math.sin(xi * 46 + k * 2);
        const [f, w] = P.surfOn([[xi, eta]], P.AA_WS)[0];
        pts.push(VA.p([-f, w]).join(" "));
      }
      wake += `<path class="thin" d="M${pts.join("L")}"/>`;
    }
  }
  return `<g data-role="label">${wind}${up}${tick}</g><g data-role="fluid">${lift}${wake}</g>${aDim}`;
}

function render(live) {
  const fl = M.flight(v, flap, phi);
  const ail = M.ailerons(da);
  const dr = M.rudderFor(da);
  if (changed("elev", elev, 0.05)) {
    el["s-elev"].innerHTML = P.elevatorSideP(VS, elev);
    el["p-elev"].innerHTML = P.elevatorPlan(VP, elev);
    el["f-elev"].innerHTML = P.elevatorFront(VF, elev);
  }
  if (changed("rud", dr, 0.05)) {
    el["s-rud"].innerHTML = P.rudderSide(VS, dr);
    el["p-rud"].innerHTML = P.rudderPlan(VP, dr);
    el["f-rud"].innerHTML = P.rudderFront(VF, dr);
  }
  if (changed("ail", da, 0.05)) {
    el["s-ail"].innerHTML = P.aileronSide(VS, ail.stbd);
    el["p-ail"].innerHTML = P.aileronPlan(VP, ail.port, ail.stbd);
    el["f-ail"].innerHTML = P.aileronFront(VF, ail.port, ail.stbd);
  }
  if (changed("flap", flap, 0.05)) {
    el["s-flap"].innerHTML = P.flapSide(VS, flap);
    el["p-flap"].innerHTML = P.flapPlan(VP, flap);
    el["f-flap"].innerHTML = P.flapFront(VF, flap);
    el["aa-flap"].innerHTML = P.sectionAA(VA, flap).flap;
    el["aa-roller"].innerHTML = `<g data-part="14">${P.rollerCircle(VA, flap)}</g>`;
    el["ch-cur"].setAttribute("points", liftCurve(flap));
  }
  if (changed("psi", psi, 0.002)) {
    el["s-prop"].innerHTML = P.propSide(VS, psi);
    el["p-prop"].innerHTML = P.propPlan(VP, psi);
    el["f-prop"].innerHTML = P.propFront(VF, psi);
  }
  if (changed("asi", v, 0.05)) el["asi-needle"].innerHTML = P.asiNeedle(VC, v);
  el["aa-live"].innerHTML = aaLive(fl);
  const need = fl.need / 1000;
  el["ch-need"].setAttribute("d", `M${CH.x0} ${chY(need)}H${CH.x1}`);
  el["ch-vs"].setAttribute("d", `M${chX(fl.vs)} ${chY(need)}V${CH.y1}`);
  el["ch-dot"].setAttribute("cx", chX(v));
  el["ch-dot"].setAttribute("cy", chY(fl.lift / 1000));
  const state = fl.stalled ? "STALL" : `VS ${Math.round(fl.vs)}`;
  el.readout.textContent = `${Math.round(v)} kt · α ${fl.alphaWing.toFixed(1)}° · δe ${fmt1(elev)}° · FLAP ${Math.round(flap)} · φ ${Math.round(phi)}° · L ${(fl.lift / 1000).toFixed(1)} kN · ${state}`;
  say(
    fl.stalled
      ? `Stalled at ${Math.round(v)} knots: the wing would need a lift coefficient of ${fl.clReq.toFixed(2)} but can make only ${fl.clmax.toFixed(2)} with ${Math.round(flap)} degrees of flap. Lift ${(fl.lift / 1000).toFixed(1)} kilonewtons, less than the ${need.toFixed(1)} needed.`
      : `${Math.round(v)} knots, angle of attack ${fl.alphaWing.toFixed(1)} degrees, flaps ${Math.round(flap)}, bank ${Math.round(phi)} degrees. Lift ${need.toFixed(1)} kilonewtons; the stall comes at ${Math.round(fl.vs)} knots.`,
    live.clock
  );
}

// ---------------------------------------------------------------- input
const live = L.run({ root: svg, step, render, idleAfter: 5, onFrozen: () => q.check && C.selfCheck(svg) });

if (live.reduced && !live.frozen) {
  // a still, telling moment: the tour at 13 s, slow with full flap
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 13; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const clampV = (x) => Math.min(160, Math.max(40, x));
// drag along the lift diagram: the pointer's x is the airspeed
const hit = svg.querySelector('[data-drag="chart"]');
let dragId = null;
const toV = (e) => {
  const m = svg.getScreenCTM();
  const x = m ? (e.clientX - m.e) / m.a : e.clientX;
  return clampV(CH.v0 + ((x - CH.x0) / (CH.x1 - CH.x0)) * (CH.v1 - CH.v0));
};
hit?.addEventListener("pointerdown", (e) => {
  dragId = e.pointerId;
  hit.setPointerCapture(dragId);
  auto = false;
  vT = toV(e);
  live.input();
  e.preventDefault();
});
hit?.addEventListener("pointermove", (e) => {
  if (e.pointerId !== dragId) return;
  vT = toV(e);
  live.input();
});
const stop = (e) => {
  if (e.pointerId === dragId) dragId = null;
};
hit?.addEventListener("pointerup", stop);
hit?.addEventListener("pointercancel", stop);

svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowUp" || k === "ArrowDown") vT = clampV(Math.round(vT / 5) * 5 + (k === "ArrowUp" ? 5 : -5));
  else if (k === "ArrowLeft" || k === "ArrowRight") phiT = Math.min(60, Math.max(-60, Math.round(phiT / 15) * 15 + (k === "ArrowRight" ? 15 : -15)));
  else if (k === "f" || k === "F") {
    const i = M.FLAP_STOPS.indexOf(flapT);
    flapT = M.FLAP_STOPS[(i + (e.shiftKey ? M.FLAP_STOPS.length - 1 : 1)) % M.FLAP_STOPS.length];
  } else if (k === "Home") {
    vT = 110;
    flapT = 0;
    phiT = 0;
  } else if (k === " ") auto = !auto;
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.2 : live.slow === 0.2 ? 0.05 : 1;
  else return;
  e.preventDefault();
  if (k !== " " && k !== "s" && k !== "S") auto = false;
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
