/**
 * Months: twelve columns on a long plinth, one a month, their heights the
 * program's growth: a slow first quarter, then a steady climb with one dip.
 * The pointer picks a month; its column lifts and takes the bright edge, its
 * neighbours rise less, staggered outwards from it. At rest the last month's
 * lid carries the bright dot: where the review starts. The slider is the
 * stagger, in ms.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, tset, tval, tween, tdone,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const N = 12, CELL = 15, FOOT = 11, D = 16, LIFT = 16, PB = 4;
const H0 = [6, 8, 11, 17, 22, 26, 24, 31, 37, 42, 47, 54];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const EXT = N * CELL;

  const C = Cam(45, 0.5, 1.95);
  fit(C, [[-6, -6, -PB], [EXT + 6, D + 6, -PB], [EXT + 6, -6, 0], [-6, D + 6, -PB], [EXT, 0, 54 + LIFT], [0, 0, 6 + LIFT]], 200, 170);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-6, -6, EXT + 6, D + 6, 6, 1.6);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  const cols = H0.map((h, i) => {
    const x0 = i * CELL + (CELL - FOOT) / 2, [ring, inner] = rings(x0, 2.5, x0 + FOOT, 2.5 + FOOT, 2.4, 0.9);
    return { i, h, x0, ring, inner, el: solid(g), z: tween(0), drawn: NaN };
  });

  const mark = mk("g", {}, g), md = [];
  for (let k = 0; k < 4; k++) md.push(flatDot(mark, C, 0.6, k === 0 ? "dot" : "dot m"));
  let mc = null, want = cols[N - 1];
  function drawMark(now) {
    if (want !== mc) { mc = want; mc.el.g.after(mark); }
    const top = mc.h + tval(mc.z, now), cx = mc.x0 + FOOT / 2, cy = 2.5 + FOOT / 2;
    md.forEach((el, k) => place(el, P(cx + ((k % 2) - 0.5) * 3, cy + (Math.floor(k / 2) - 0.5) * 3, top)));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const c of cols) {
      const top = c.h + tval(c.z, now);
      if (!tdone(c.z, now)) m = true;
      if (top === c.drawn) continue;
      c.drawn = top;
      put(c.el, prism(P, front, c.ring, c.inner, 0, top));
    }
    drawMark(now);
    return m;
  });
  bag.add(B.unregister);

  // hit: the month whose REST centre is nearest the pointer's screen x, inside the figure's band
  const centres = cols.map((c) => P(c.x0 + FOOT / 2, 2.5 + FOOT / 2, c.h / 2));
  function hit([x, y]) {
    let best = 0;
    centres.forEach((p, i) => { if (Math.abs(p[0] - x) < Math.abs(centres[best][0] - x)) best = i; });
    const p = centres[best];
    if (Math.abs(p[0] - x) > CELL * 1.6 || y < p[1] - 90 || y > p[1] + 45) return -1;
    return best;
  }

  let act = -2;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : Math.max(act, 0);
    act = a;
    cols.forEach((c, i) => {
      const lift = a < 0 ? 0 : LIFT * clamp(1 - Math.abs(i - a) / 3, 0, 1);
      tset(c.z, lift, now, Math.abs(i - from) * stag);
      c.el.sil.classList.toggle("hi", i === a);
    });
    want = a < 0 ? cols[N - 1] : cols[a];
    md.forEach((el, k) => el.setAttribute("class", a < 0 && k === 0 ? "dot" : a < 0 ? "dot m" : "dot off"));
    read.textContent = a < 0 ? "rest" : "month " + (a + 1);
    B.wake();
  }
  setActive(-1);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "months",
  means: "Twelve months of a content program as columns: the month under the pointer lifts, its neighbours follow in turn.",
  rules: [1, 2, 5, 8],
  range: [0, 40, 80],
  tour: [[120, 150], [200, 175], [280, 120], null],
  mount,
});
