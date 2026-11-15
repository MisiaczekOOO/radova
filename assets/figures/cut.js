/**
 * Cut: one article plate sliced into five post tiles. When the pointer comes
 * over the row the slices part, the gaps opening on a spring; the tile under
 * the pointer lifts and takes the bright edge, its neighbours following,
 * staggered by distance. At rest the slices sit almost closed, as one sheet,
 * and the first post's heading is bright. The slider is the widest gap.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, seg, spring, stepS,
  tset, tval, tween, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 5, TW = 30, TD = 70, TH = 4, LIFT = 14, REST_GAP = 2.5, STEP = 45;
const DROP = [0, 3, 1, 4, 2];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let gapMax = value;

  const span = (gap) => N * TW + (N - 1) * gap;
  const C = Cam(45, 0.5, 1.6);
  const far = span(16);
  fit(C, [[0, 0, 0], [far, TD, 0], [far, 0, 0], [0, TD, 0], [0, 0, TH + LIFT], [far, 0, TH + LIFT]], 200, 170);
  const P = proj(C), front = facing(C);

  // the base the sheet was cut on: a thin board, which never moves
  const base = solid(mk("g", {}, svg));
  const [br, bi] = rings(-6, -6, span(REST_GAP) + 8, TD + 10, 8, 2);
  put(base, prism(P, front, br, bi, -5, 0));

  const g = mk("g", {}, svg), tiles = [];
  for (let i = 0; i < N; i++) {
    const el = solid(mk("g", {}, g));
    const head = mk("path", { class: "nf" }, el.g), lines = mk("path", { class: "nf lo" }, el.g);
    tiles.push({ el, head, lines, z: tween(0), drawn: "" });
  }

  const gap = spring(REST_GAP, { eps: 0.02 });
  const x0 = (i, gp) => i * (TW + gp) + DROP[i] * 0.4;

  function drawTile(i, gp, now) {
    const t = tiles[i], z = tval(t.z, now), a = x0(i, gp), key = gp.toFixed(2) + "," + z.toFixed(2);
    if (key === t.drawn) return;
    t.drawn = key;
    const y0 = DROP[i] * 1.2, [ring, inner] = rings(a, y0, a + TW, y0 + TD, 3, 1);
    put(t.el, prism(P, front, ring, inner, z, z + TH));
    const top = z + TH, w = (u, v) => P(a + u, y0 + v, top);
    t.head.setAttribute("d", seg(w(5, 10), w(TW - 5, 10)) + seg(w(5, 15), w(TW - 11, 15)));
    t.lines.setAttribute("d", [26, 32, 38, 44, 50, 56].map((v, k) => seg(w(5, v), w(TW - (k % 3 === 2 ? 12 : 5), v))).join(""));
  }

  const B = register(stage, (dt, now) => {
    let m = stepS(gap, dt);
    for (let i = 0; i < N; i++) { drawTile(i, gap.x, now); if (!tdone(tiles[i].z, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  // hit: the tile whose REST centre (at the open gap the pointer will cause) is nearest on screen
  const centre = (i) => P(x0(i, gapMax) + TW / 2, DROP[i] * 1.2 + TD / 2, TH);
  function hit([x, y]) {
    const c = Array.from({ length: N }, (_, i) => centre(i));
    const ys = c.map((p) => p[1]);
    if (y < Math.min(...ys) - 60 || y > Math.max(...ys) + 50) return -1;
    let best = 0;
    c.forEach((p, i) => { if (Math.abs(p[0] - x) < Math.abs(c[best][0] - x)) best = i; });
    return Math.abs(c[best][0] - x) > TW * 1.6 ? -1 : best;
  }

  let act = -2;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : Math.max(act, 0);
    act = a;
    gap.t = a < 0 ? REST_GAP : gapMax;
    tiles.forEach((t, i) => {
      const lift = a < 0 ? 0 : LIFT * clamp(1 - Math.abs(i - a) / 2.5, 0, 1);
      tset(t.z, lift, now, Math.abs(i - from) * STEP);
      t.el.sil.classList.toggle("hi", i === a);
      t.head.classList.toggle("hi", a < 0 && i === 0);
    });
    read.textContent = a < 0 ? "rest" : "post " + (a + 1);
    B.wake();
  }
  setActive(-1);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { gapMax = v; if (act >= 0) { gap.t = v; B.wake(); } },
    destroy: bag.dispose,
  };
}

hairline({
  name: "cut",
  means: "One article cut into five posts: the slices part under the pointer and the post it picks lifts.",
  rules: [1, 2, 3, 8],
  range: [6, 10, 16],
  tour: [[150, 150], [200, 175], [255, 200], null],
  mount,
});
