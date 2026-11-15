/**
 * Drafts: a rounded tray holding six article sheets. The sheet under the
 * pointer stands up and lifts; the ones in front lean forward and the ones
 * behind lean back, staggered outwards from it. Each sheet carries a heading
 * bar, text lines and its number as dots in the top corner. At rest the front
 * sheet's sign-off mark is bright: the one waiting for approval. The slider is
 * the stagger, in ms.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, proj, rad, ringAt, rrect, run, seg,
  tdone, tset, tval, tween, disposer, mk, place, pointer, reflect, register,
} = HL;

const N = 6, W = 62, H = 80, G = 15, TK = 1.4;
const REST = -14, BACK = -26, FWD = 18, LIFT = 18;
const X0 = -6, X1 = W + 6, Y0 = -10, Y1 = (N - 1) * G + 10, WH = 22, WR = 6, WT = 2.4;

const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** The tray: `far` painted before the sheets, `near` after them. */
function tray(P, front, outer, inner) {
  const far = [
    [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), "sil"],
    [poly(ringAt(P, inner, WH)), "nf"],
    [open(ringAt(P, run(inner, (q) => !front(q)), 2.5)), "nf lo"],
  ];
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
  const near = [
    [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"],
    [open(oT), "nf lo"],
    [open(iF), "nf"],
    [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil"],
  ];
  return { far, near };
}

/** A sheet with one folded-down corner, upright in its own plane. */
const SHAPE = fillet([[0, 0], [W, 0], [W, H - 10], [W - 10, H], [0, H]], [1, 1, 1.2, 1.2, 2.6]);

/** Sheet i leaning th degrees and lifted by `lift`: its paths and where its dots sit. */
function pose(P, i, th, lift, n) {
  const yb = i * G, s = Math.sin(rad(th)), c = Math.cos(rad(th));
  const w = (u, v) => P(u, yb + v * s, v * c + lift);
  const wb = (u, v) => P(u, yb + v * s - TK * c, v * c + TK * s + lift);
  const dots = [];
  for (let k = 0; k < N; k++) dots.push(w(8 + k * 3.4, H - 7));
  return {
    back: poly(SHAPE.map((p) => wb(p[0], p[1]))),
    face: poly(SHAPE.map((p) => w(p[0], p[1]))),
    fold: open([w(W - 10, H), w(W - 10, H - 10), w(W, H - 10)]),
    head: seg(w(8, H - 18), w(W - 14, H - 18)) + seg(w(8, H - 23), w(W - 26, H - 23)),
    rules: [H - 34, H - 40, H - 46, H - 52, H - 58].map((v, k) => seg(w(8, v), w(W - (k === 4 ? 24 : 8), v))).join(""),
    sign: open([w(W - 22, 12), w(W - 8, 12)]),
    dots: dots.slice(0, n),
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.5);
  fit(C, [[X0, Y0, 0], [X1, Y1, -8], [X1, Y0, 0], [X0, Y1, 0], [X0, Y0, H], [X1, Y0, H + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);
  const outer = rrect(X0, Y0, X1, Y1, WR, 6), inner = rrect(X0 + WT, Y0 + WT, X1 - WT, Y1 - WT, WR - WT, 6);
  const paths = tray(P, front, outer, inner);

  const g = mk("g", {}, svg);
  reflect(svg, g, P, front, outer, 0, 14);
  for (const [d, cls] of paths.far) mk("path", { d, class: cls }, g);

  const sheets = [];
  for (let i = 0; i < N; i++) {
    const n = i + 1, grp = mk("g", {}, g);
    const back = mk("path", { class: "lo" }, grp), face = mk("path", { class: "sil" }, grp);
    const fold = mk("path", { class: "nf lo" }, grp), head = mk("path", { class: "nf" }, grp);
    const rules = mk("path", { class: "nf lo" }, grp), sign = mk("path", { class: "nf lo" }, grp);
    const dots = [];
    for (let k = 0; k < n; k++) dots.push(mk("circle", { r: 1.05, class: "dot off" }, grp));
    sheets.push({ n, back, face, fold, head, rules, sign, dots, a: tween(REST), z: tween(0) });
  }
  for (const [d, cls] of paths.near) mk("path", { d, class: cls }, g);

  // hit bands along the RESTING top edges, which never move
  const top = (i) => P(W / 2, i * G + H * Math.sin(rad(REST)), H * Math.cos(rad(REST)));
  const c0 = top(0), c1 = top(1), d = [c1[0] - c0[0], c1[1] - c0[1]];
  const px0 = P(0, 0, 0), px1 = P(1, 0, 0), ex = [px1[0] - px0[0], px1[1] - px0[1]];
  const HALF = W / 2 + 6, det = d[0] * ex[1] - d[1] * ex[0];
  function hit([x, y]) {
    const qx = x - c0[0], qy = y - c0[1];
    const s = (qx * ex[1] - qy * ex[0]) / det, r = (d[0] * qy - d[1] * qx) / det;
    if (Math.abs(r) > HALF || s < -0.5 || s > N + 1) return -1;
    return clamp(Math.round(s), 0, N - 1);
  }

  function draw(i, th, lift) {
    const sh = sheets[i], q = pose(P, i, th, lift, sh.n);
    sh.back.setAttribute("d", q.back);
    sh.face.setAttribute("d", q.face);
    sh.fold.setAttribute("d", q.fold);
    sh.head.setAttribute("d", q.head);
    sh.rules.setAttribute("d", q.rules);
    sh.sign.setAttribute("d", q.sign);
    sh.dots.forEach((el, k) => place(el, q.dots[k]));
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    sheets.forEach((sh, i) => { draw(i, tval(sh.a, now), tval(sh.z, now)); if (!tdone(sh.a, now) || !tdone(sh.z, now)) moving = true; });
    return moving;
  });
  bag.add(B.unregister);

  let act = -2;
  /** Pulls sheet a; -1 puts them back, with the front sheet's sign-off line bright. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : Math.max(act, 0);
    act = a;
    sheets.forEach((sh, i) => {
      const delay = Math.abs(i - from) * stag;
      const th = a < 0 ? REST : i < a ? BACK : i > a ? FWD : 0;
      tset(sh.a, th, now, delay); tset(sh.z, a === i ? LIFT : 0, now, delay);
      sh.face.classList.toggle("hi", i === a);
      sh.sign.classList.toggle("hi", a < 0 && i === N - 1);
      sh.sign.classList.toggle("lo", !(a < 0 && i === N - 1));
      sh.dots.forEach((el) => el.setAttribute("class", i === a ? "dot" : "dot off"));
    });
    read.textContent = a < 0 ? "rest" : "article " + sheets[a].n;
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
  name: "drafts",
  means: "Six article drafts in a tray: the one under the pointer stands up for review, its neighbours lean away in turn.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[170, 150], [215, 130], [255, 110], null],
  mount,
});
