/**
 * Rank: a field of 49 pillars on a rounded plinth, one pillar a topic. The
 * pointer is projected onto the ground and each pillar takes its height from
 * its distance to it, on its own spring: topics near the one you push gain
 * rank. At rest the field is a slope with one clear peak, the topic already
 * winning, marked with a dot cluster. The slider is the reach, in cells.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, unproj, spring, stepS,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const N = 7, CELL = 17, FOOT = 13, HMAX = 62, EXT = N * CELL, PB = 5;

const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.417 ? 1 - (u / 0.417) * 0.6875 : u <= 1 ? 0.3125 - ((u - 0.417) / 0.583) * 0.2185 : 0.094;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.75);
  fit(C, [[-6, -6, -PB], [EXT + 6, EXT + 6, -PB], [EXT + 6, -6, -PB], [-6, EXT + 6, -PB], [0, 0, HMAX * 0.8]], 200, 168);
  const P = proj(C), front = facing(C);
  let R = value * CELL, over = null;

  const g = mk("g", {}, svg), cols = [];
  const [pr, pi] = rings(-6, -6, EXT + 6, EXT + 6, 9, 2.2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  for (let s = 0; s <= 2 * (N - 1); s++) for (let i = 0; i < N; i++) {
    const j = s - i;
    if (j < 0 || j >= N) continue;
    const u = i / (N - 1), v = j / (N - 1);
    // a slope rising to the far left, and one peak: the topic already ranking
    const h0 = 3 + 14 * (1 - u) * (1 - v) + 30 * Math.exp(-((u - 0.3) ** 2 + (v - 0.3) ** 2) / 0.03);
    const x0 = i * CELL + (CELL - FOOT) / 2, y0 = j * CELL + (CELL - FOOT) / 2;
    const [ring, inner] = rings(x0, y0, x0 + FOOT, y0 + FOOT, 2.8, 1);
    cols.push({ i, j, h0, ring, inner, sp: spring(h0, { eps: 0.04 }), el: solid(g), drawn: NaN });
  }

  const mark = mk("g", {}, g), md = [];
  for (let k = 0; k < 9; k++) md.push(flatDot(mark, C, 0.6, k === 4 ? "dot" : "dot m"));
  const peak = cols.reduce((a, b) => (b.h0 > a.h0 ? b : a));
  const byCell = new Map();
  cols.forEach((c) => byCell.set(c.i + "," + c.j, c));
  let mc = null, want = peak;

  function drawMark() {
    if (want !== mc) { mc = want; mc.el.g.after(mark); }
    const cx = (mc.i + 0.5) * CELL, cy = (mc.j + 0.5) * CELL, h = Math.max(0.6, mc.sp.x);
    md.forEach((el, k) => place(el, P(cx + ((k % 3) - 1) * 2.8, cy + (Math.floor(k / 3) - 1) * 2.8, h)));
  }
  function drawCol(c) {
    const h = Math.max(0.6, c.sp.x);
    if (h === c.drawn) return;
    c.drawn = h;
    put(c.el, prism(P, front, c.ring, c.inner, 0, h));
    c.el.sil.classList.toggle("hi", c === want);
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const c of cols) { if (stepS(c.sp, dt)) m = true; drawCol(c); }
    drawMark();
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    let next = peak;
    if (over && over[0] > -CELL && over[1] > -CELL && over[0] < EXT + CELL && over[1] < EXT + CELL) {
      const i = clamp(Math.floor(over[0] / CELL), 0, N - 1), j = clamp(Math.floor(over[1] / CELL), 0, N - 1);
      next = byCell.get(i + "," + j);
      for (const c of cols) {
        const dx = (c.i + 0.5) * CELL - over[0], dy = (c.j + 0.5) * CELL - over[1];
        c.sp.t = HMAX * falloff(Math.hypot(dx, dy) / R);
      }
      read.textContent = `topic ${i + 1}·${j + 1}`;
    } else {
      for (const c of cols) c.sp.t = c.h0;
      read.textContent = "rest";
    }
    if (next !== want) { want = next; for (const c of cols) { c.drawn = NaN; } }
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { R = v * CELL; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "rank",
  means: "A field of topics: the ones near the pointer rise in rank, falling off with distance.",
  rules: [1, 3, 5, 9],
  range: [1.2, 2.4, 4],
  tour: [[150, 150], [255, 160], [205, 215], null],
  mount,
});
