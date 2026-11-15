/**
 * Pipeline: five blocks on a long plinth, one per step from a product
 * release to its reach: shipped, Slack ping, owner, post live, views. They
 * grow from left to right as the release turns into content and attention.
 * The pointer picks a step; its block lifts and takes the bright edge, its
 * neighbours rise less, staggered outwards from it. At rest the last block's
 * lid carries the bright dot: the views the post earned. The slider is the
 * stagger, in ms.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, tset, tval, tween, tdone,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const STAGES = ["shipped", "slack ping", "owner", "post live", "views"];
const SIZE = [20, 20, 20, 20, 20];
const H0 = [8, 13, 19, 27, 38];
const GAP = 8, D = 26, LIFT = 16, PB = 4;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  let x = 0;
  const xs = SIZE.map((s) => { const x0 = x; x += s + GAP; return x0; });
  const EXT = x - GAP;

  const C = Cam(45, 0.5, 1.95);
  fit(C, [[-6, -6, -PB], [EXT + 6, D + 6, -PB], [EXT + 6, -6, 0], [-6, D + 6, -PB], [0, D / 2, 8 + LIFT], [EXT, D / 2, 38 + LIFT]], 200, 170);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-6, -6, EXT + 6, D + 6, 6, 1.6);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  const blocks = SIZE.map((s, i) => {
    const x0 = xs[i], y0 = (D - s) / 2;
    const [ring, inner] = rings(x0, y0, x0 + s, y0 + s, Math.min(3, s / 5), 1);
    return { i, s, h: H0[i], x0, y0, ring, inner, el: solid(g), z: tween(0), drawn: NaN };
  });

  const mark = mk("g", {}, g), md = [];
  for (let k = 0; k < 4; k++) md.push(flatDot(mark, C, 0.6, k === 0 ? "dot" : "dot m"));
  let mc = null, want = blocks[blocks.length - 1];
  function drawMark(now) {
    if (want !== mc) { mc = want; mc.el.g.after(mark); }
    const top = mc.h + tval(mc.z, now), cx = mc.x0 + mc.s / 2, cy = mc.y0 + mc.s / 2;
    md.forEach((el, k) => place(el, P(cx + ((k % 2) - 0.5) * 3, cy + (Math.floor(k / 2) - 0.5) * 3, top)));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const b of blocks) {
      const top = b.h + tval(b.z, now);
      if (!tdone(b.z, now)) m = true;
      if (top === b.drawn) continue;
      b.drawn = top;
      put(b.el, prism(P, front, b.ring, b.inner, 0, top));
    }
    drawMark(now);
    return m;
  });
  bag.add(B.unregister);

  // hit: the stage whose rest centre is nearest the pointer's screen x, inside the figure's band
  const centres = blocks.map((b) => P(b.x0 + b.s / 2, b.y0 + b.s / 2, b.h / 2));
  function hit([px, py]) {
    let best = 0;
    centres.forEach((p, i) => { if (Math.abs(p[0] - px) < Math.abs(centres[best][0] - px)) best = i; });
    const p = centres[best];
    if (Math.abs(p[0] - px) > 60 || py < p[1] - 110 || py > p[1] + 60) return -1;
    return best;
  }

  let act = -2;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : Math.max(act, 0);
    act = a;
    blocks.forEach((b, i) => {
      const lift = a < 0 ? 0 : LIFT * clamp(1 - Math.abs(i - a) / 2, 0, 1);
      tset(b.z, lift, now, Math.abs(i - from) * stag);
      b.el.sil.classList.toggle("hi", i === a);
    });
    want = a < 0 ? blocks[blocks.length - 1] : blocks[a];
    md.forEach((el, k) => el.setAttribute("class", a < 0 && k === 0 ? "dot" : a < 0 ? "dot m" : "dot off"));
    read.textContent = a < 0 ? "rest" : STAGES[a];
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
  name: "pipeline",
  means: "Five steps from a product release to views, growing left to right: the step under the pointer lifts, its neighbours follow in turn.",
  rules: [1, 2, 5, 8],
  range: [0, 60, 120],
  tour: [[120, 150], [200, 175], [280, 160], null],
  mount,
});
