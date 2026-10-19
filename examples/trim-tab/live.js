// Page code for trim-tab.html. K, L, C (kit), A (aircraft), N (nose gear), FC (flight controls), X
// (BP-106's drawing helpers), M (model), P (parts) and S (sheet) are inlined above this script. One
// state (model.mjs) drives every view: the trim setting turns the wheel, the drums and the screw, the
// nut moves the rod and the horn, the tab turns, the elevator sits where the flight needs it and the
// diagrams show what holds it there.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const $ = (id) => document.getElementById(id);
const say = L.announcer($("sr"), 2);

let st = M.state();
const shown = { key: "" };

function step(dt, live) {
  if (live.touring && st.mode !== "tour") {
    st = M.state();
  }
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  for (let i = 0; i < n; i++) M.step(st, h);
  return st.mode === "tour" || st.fail || Math.abs(st.v - st.vT) > 0.05 || Math.abs(st.set - st.tabT) > 0.01;
}

function render(live) {
  const sol = M.solve(st);
  const key = `${sol.tab.toFixed(3)}|${sol.v.toFixed(2)}|${sol.set.toFixed(3)}|${sol.fail}`;
  if (key !== shown.key) {
    $("aa-mov").innerHTML = S.aaMoving(sol);
    $("aa-float").innerHTML = S.aaFloat(sol);
    $("aa-mom").innerHTML = S.aaMoments(sol);
    $("aa-bal").innerHTML = S.aaBalloons(sol);
    $("b-mov").innerHTML = S.bMoving(sol);
    $("b-bal").innerHTML = S.bBalloons(sol);
    $("b-dim").innerHTML = S.bDims(sol);
    $("c-mov").innerHTML = S.cMoving(sol);
    $("c-bal").innerHTML = S.cBalloons(sol);
    $("d-mov").innerHTML = S.dMoving(sol);
    $("d-bal").innerHTML = S.dBalloons(sol);
    $("d1-dyn").innerHTML = S.chart1Dyn(sol);
    $("d2-dyn").innerHTML = S.chart2Dyn(sol);
    $("d3-dyn").innerHTML = S.chart3Dyn(sol);
    const t3 = S.chart3Text(sol);
    $("d3-F").textContent = t3.F;
    $("d3-T").textContent = t3.T;
    $("d3-B").textContent = t3.B;
    const [x4, y4] = S.d4(sol);
    $("d4-dot").setAttribute("cx", x4);
    $("d4-dot").setAttribute("cy", y4);
    shown.key = key;
  }
  const F = sol.F;
  const force = Math.abs(F) < 0.5 ? "NO FORCE" : `${F > 0 ? "PULL" : "PUSH"} ${Math.abs(F).toFixed(1)} N`;
  $("readout").textContent = `${M.phase(st)} · ${Math.round(sol.v)} kt · TAB ${sol.tab >= 0 ? "+" : ""}${sol.tab.toFixed(1)}° · ELEV ${sol.de.toFixed(1)}° · ${force}`;
  $("readout2").textContent = sol.fail
    ? `ROD OFF · TAB FREE ±${Math.min(30, sol.amp).toFixed(0)}° · SHOWN AT ${M.FLUTTER_HZ_SHOWN} Hz, REALLY ~${M.FLUTTER_HZ} Hz`
    : `FLOATS ${sol.float.toFixed(1)}° · WHEEL ${sol.turns >= 0 ? "+" : ""}${sol.turns.toFixed(2)} T · NUT ${sol.nut >= 0 ? "+" : ""}${sol.nut.toFixed(1)} mm · ROD ${sol.load.rod.toFixed(1)} N · HOLDS`;
  say(`${M.phase(st).toLowerCase()}, ${Math.round(sol.v)} knots, tab ${sol.tab.toFixed(0)} degrees, ${force.toLowerCase()}.`, live.clock);
}

const live = L.run({ root: svg, step, render, idleAfter: 8, onFrozen: () => q.check && C.selfCheck(svg) });

if (live.reduced && !live.frozen) {
  // a still, true moment: trimmed at 65 kt, hands off
  for (let t = 0; t < 13; t += 1 / 240) M.step(st, 1 / 240);
  render(live);
}

function toHand() {
  if (st.mode === "tour") {
    st.mode = "hand";
    st.vT = st.v;
    st.tabT = st.set;
    st.fail = false;
  }
}
svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "t" || k === "T" || k === "g" || k === "G") {
    toHand();
    // a quarter turn of the wheel a press: T rolls the top aft (nose up)
    const turns = M.trimWheelTurns(st.tabT) + (k === "t" || k === "T" ? 0.25 : -0.25);
    let lo = M.TAB_LIMITS[0];
    let hi = M.TAB_LIMITS[1];
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (M.trimWheelTurns(m) < turns) lo = m;
      else hi = m;
    }
    st.tabT = (lo + hi) / 2;
  } else if (k === "ArrowLeft" || k === "ArrowRight") {
    toHand();
    st.vT = Math.max(55, Math.min(140, Math.round(st.vT + (k === "ArrowRight" ? 5 : -5))));
  } else if (k === "f" || k === "F") {
    toHand();
    st.fail = !st.fail;
    st.amp = 0;
  } else if (k === " ") {
    st = M.state();
  } else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
