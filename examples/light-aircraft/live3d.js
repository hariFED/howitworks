// Page code for light-aircraft-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the sheet's model, unchanged), X (extra.mjs), P (parts.mjs) and
// SC (scene3d.mjs). The kit draws, frames, explodes and labels; this file runs the sheet's flight model
// with the sheet's tour and keys, deflects the surfaces, turns the propeller and draws the lift.

const $ = (id) => document.getElementById(id);
// the page opens framed on the half the cut leaves standing (the kit frames the whole aeroplane)
const SCENE = SC.scene();
// az −30: from aft of the starboard beam, a little more from the side than a true isometric, so the
// cut shows the panel's dials, the wheel, the cabin, the engine bay and the open wing bay at once; el 19,
// lower than an isometric's 35.26, so the port main wheel shows under the fuselage (at 35 the cabin
// floor hides it; at 22 only a sliver of tyre shows). The title block reads AXONOMETRIC (the kit).
const V = S.create({ scene: SCENE, start: { az: -30, el: 19, zoom: 1.75, look: SC.s3([-2600, 1200, -1900]) } });

// the lofts (scene3d.mjs: tail cone, cowling, tapered wing, twisted blades) are the kit's `warp`, applied
// as it builds them, so this file only poses them
const rad = Math.PI / 180;
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state: the sheet's, from the same model
let v = 110;
let vT = 110;
let flap = 0;
let flapT = 0;
let phi = 0;
let phiT = 0;
let p = 0;
let da = 0;
let elev = M.flight(110, 0, 0).elevator;
let psi = 0.35;
let auto = false;
let dragging = false;
const tour = { t: 0 };
const PROP_SHOWN = ((2 * Math.PI * 2400) / 60) / 60; // 1/60 of 2400 rpm, as on the sheet

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  const driven = (live.touring || auto) && !dragging;
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
    p = L.follow(p, M.rollRate(da, v), 4, h);
    phi += p * h;
    elev = L.follow(elev, M.flight(v, flap, phi).elevator, 10, h);
    psi = (psi + PROP_SHOWN * h) % (2 * Math.PI);
  }
  return true;
}

// ---------------------------------------------------------------- poses from the model
function render(live) {
  const fl = M.flight(v, flap, phi);
  const ail = M.ailerons(da);
  const dr = M.rudderFor(da);
  // trailing edge down is a positive turn about +z here (x points forward); rudder TE to starboard about +y
  // each surface turns on its hinge, then rises with its wing's dihedral (about the root's hinge point)
  V.solid(14, "port").rotation.set(SC.DIHEDRAL, 0, flap * rad);
  V.solid(14, "stbd").rotation.set(-SC.DIHEDRAL, 0, flap * rad);
  V.solid(11, "port").rotation.set(SC.DIHEDRAL, 0, ail.port * rad);
  V.solid(11, "stbd").rotation.set(-SC.DIHEDRAL, 0, ail.stbd * rad);
  V.set(12, { rot: [0, 0, elev * rad] });
  V.solid(12, "tab").rotation.z = 6 * rad; // trimmed for the cruise
  V.set(13, { rot: [0, dr * rad, 0] });
  V.solid(6, "blades").rotation.x = psi;
  for (const [name] of SC.SIX) V.solid(18, name).rotation.y = Math.PI; // the dials face aft, toward the pilot
  // exploded, the panel swings round to face the camera square on
  const e = Math.min(1, Math.max(0, V.explode));
  V.set(18, { rot: [0, (e * e * (3 - 2 * e) * 60 * Math.PI) / 180, 0] });
  const state = fl.stalled ? "STALL" : `VS ${Math.round(fl.vs)}`;
  $("readout").textContent = `${Math.round(v)} kt · α ${fl.alphaWing.toFixed(1)}° · δe ${elev >= 0 ? "+" : "−"}${Math.abs(elev).toFixed(1)}° · FLAP ${Math.round(flap)} · φ ${Math.round(phi)}° · L ${(fl.lift / 1000).toFixed(1)} kN · ${state}`;
  say(
    fl.stalled
      ? `Stalled at ${Math.round(v)} knots: lift ${(fl.lift / 1000).toFixed(1)} kilonewtons, less than the ${(fl.need / 1000).toFixed(1)} needed.`
      : `${Math.round(v)} knots, angle of attack ${fl.alphaWing.toFixed(1)} degrees, flaps ${Math.round(flap)}, bank ${Math.round(phi)} degrees; stall at ${Math.round(fl.vs)} knots.`,
    live.clock
  );
  $("tour")?.setAttribute("aria-pressed", String(auto));
}

// the lift on each wing (half of L, from mid semi-span) and the load it holds up (n·W at the CG), as
// arrows in the drawing's accent: 1 kN draws as 110 mm of aeroplane. Hidden while exploded.
const KN = 110;
function arrow(a, b, cls) {
  const [x0, y0] = V.project(SC.s3(a));
  const [x1, y1] = V.project(SC.s3(b));
  const l = Math.hypot(x1 - x0, y1 - y0);
  if (l < 4) return "";
  const ux = (x1 - x0) / l;
  const uy = (y1 - y0) / l;
  const h = Math.min(9, l * 0.4);
  const bx = x1 - ux * h;
  const by = y1 - uy * h;
  return `<path class="${cls}" d="M${x0.toFixed(1)} ${y0.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}"/><path class="${cls}-h" d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${(bx - uy * h * 0.35).toFixed(1)} ${(by + ux * h * 0.35).toFixed(1)}L${(bx + uy * h * 0.35).toFixed(1)} ${(by - ux * h * 0.35).toFixed(1)}Z"/>`;
}
function overlay() {
  if (V.explode > 0.05) return "";
  const fl = M.flight(v, flap, phi);
  const half = (fl.lift / 2000) * KN;
  let out = "";
  for (const s of V.cut ? [-1] : [-1, 1]) {
    const a = SC.LIFT_AT(s);
    out += arrow(a, [a[0], a[1] + half, a[2]], "lift");
  }
  const c = SC.CG_AT;
  out += arrow(c, [c[0], c[1] - (fl.need / 1000) * KN * (V.cut ? 0.5 : 1), c[2]], "load");
  return out;
}

// ---------------------------------------------------------------- the aeroplane's own controls
// drag the elevator: up (pull the wheel back) trims to a higher angle of attack, so a lower airspeed
const vOf = (u) => 160 - u * 115;
const uOf = (vk) => (160 - vk) / 115;
V.drag([12], {
  axis: [0, 1, 0],
  length: 250,
  start: () => {
    dragging = true;
    auto = false;
    return uOf(vT);
  },
  move: (u) => (vT = vOf(Math.min(1, Math.max(0, u)))),
  end: () => (dragging = false),
});
// drag a flap down to lower it, to the nearest stop
V.drag([14], {
  axis: [0, -1, 0],
  length: 60,
  start: () => {
    dragging = true;
    auto = false;
    return flapT / 30;
  },
  move: (u) => (flapT = M.FLAP_STOPS.reduce((b, f) => (Math.abs(f - u * 30) < Math.abs(b - u * 30) ? f : b), 0)),
  end: () => (dragging = false),
});
const manual = (fn) => () => {
  fn();
  auto = false;
};
const clampV = (x) => Math.min(160, Math.max(40, x));
V.key("ArrowUp", manual(() => (vT = clampV(Math.round(vT / 5) * 5 + 5))));
V.key("ArrowDown", manual(() => (vT = clampV(Math.round(vT / 5) * 5 - 5))));
V.key("ArrowRight", manual(() => (phiT = Math.min(60, Math.round(phiT / 15) * 15 + 15))));
V.key("ArrowLeft", manual(() => (phiT = Math.max(-60, Math.round(phiT / 15) * 15 - 15))));
V.key("f", manual(() => (flapT = M.FLAP_STOPS[(M.FLAP_STOPS.indexOf(flapT) + 1) % M.FLAP_STOPS.length])));
V.key("F", manual(() => (flapT = M.FLAP_STOPS[(M.FLAP_STOPS.indexOf(flapT) + 1) % M.FLAP_STOPS.length])));
V.key("Home", manual(() => ((vT = 110), (flapT = 0), (phiT = 0))));
V.key(" ", () => (auto = !auto));
$("tour")?.addEventListener("click", () => {
  auto = !auto;
  V.input();
});

// the page's own self-tests (?selftest=1)
V.test("elevator drag sets the airspeed", ({ ptr, project }) => {
  const g = project(SC.s3([-7000, 1400, -1200]));
  const v0 = vT;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] - 60);
  const v1 = vT;
  ptr("pointerup", g[0], g[1] - 60);
  return { pass: v1 < v0 - 5, info: [Math.round(v0), Math.round(v1)] };
});
V.test("F steps the flaps", ({ key }) => {
  const a = flapT;
  key("f");
  const b = flapT;
  key("f");
  key("f");
  key("f");
  return { pass: b !== a && flapT === a, info: [a, b] };
});
V.test("arrow up raises the airspeed", ({ key }) => {
  const a = vT;
  key("ArrowUp");
  const b = vT;
  key("ArrowDown");
  return { pass: b > a || b === 160, info: [a, b] };
});
V.test("arrows bank the aeroplane", ({ key }) => {
  const a = phiT;
  key("ArrowRight");
  const b = phiT;
  key("ArrowLeft");
  return { pass: b > a || b === 60, info: [a, b] };
});
V.test("space runs the tour", ({ key }) => {
  const a = auto;
  key(" ");
  const b = auto;
  key(" ");
  return { pass: a !== b, info: [a, b] };
});
V.test("the propeller turns", () => {
  const b = V.solid(6, "blades");
  const a0 = b.rotation.x;
  psi += 0.5;
  render({ clock: 0 });
  const a1 = b.rotation.x;
  psi -= 0.5;
  render({ clock: 0 });
  return { pass: Math.abs(a1 - a0 - 0.5) < 1e-6, info: [a0, a1] };
});
V.test("flaps deflect with the model", () => {
  const f = V.solid(14, "port");
  const keep = flap;
  flap = 30;
  render({ clock: 0 });
  const a = f.rotation.z;
  flap = keep;
  render({ clock: 0 });
  return { pass: Math.abs(a - 30 * rad) < 1e-6, info: a };
});

V.run({ step, render, overlay, still: 13 });
