/* Hero backdrop: a faint dot grid. Dots near the pointer light up softly,
   and short green "data packets" run along rows and columns now and then.
   Everything is dimmed behind the headline so it never competes with it. */
(function () {
  "use strict";

  var bg = document.querySelector("[data-hero-bg]");
  var canvas = document.querySelector("[data-hero-grid]");
  if (!bg || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var hero = bg.closest(".hero");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var GAP = 28;          // grid spacing, css px
  var DOT = 1.75;        // dot size, css px
  var BASE = 0.17;       // resting dot opacity
  var SPOT_R = 190;      // pointer light radius
  var SPOT = 0.5;        // extra opacity at the pointer
  var MAX_PACKETS = 5;

  var dpr = 1, W = 0, H = 0, cols = 0, rows = 0, ox = 0, oy = 0;
  var weight, heat, hue; // per dot: text-safe dimming, packet glow, packet colour
  var spawned = 0;
  var signal = "#f5b84b";
  var readSignal = function () {
    var v = getComputedStyle(document.documentElement).getPropertyValue("--color-signal").trim();
    if (v) signal = v;
  };
  readSignal();
  document.addEventListener("signalchange", function () { readSignal(); draw(); });
  var packets = [];
  var pointer = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, onT: 0 };
  var lastSpawn = 0;

  var setup = function () {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = bg.clientWidth; H = bg.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / GAP) + 1; rows = Math.ceil(H / GAP) + 1;
    ox = (W - (cols - 1) * GAP) / 2; oy = (H - (rows - 1) * GAP) / 2;
    weight = new Float32Array(cols * rows);
    heat = new Float32Array(cols * rows);
    hue = new Uint8Array(cols * rows);
    // Dim an ellipse around the headline and lede (upper-middle of the layer).
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var nx = (ox + c * GAP - W / 2) / (Math.min(W, 1200) * 0.42);
      var ny = (oy + r * GAP - H * 0.42) / (H * 0.3);
      var d = Math.sqrt(nx * nx + ny * ny);
      weight[r * cols + c] = 0.4 + 0.6 * Math.min(1, Math.max(0, (d - 0.55) / 0.6));
    }
    packets = [];
  };

  var spawn = function () {
    var horiz = Math.random() < 0.6;
    var p = {
      c: Math.floor(Math.random() * cols),
      r: Math.floor(Math.random() * rows),
      dc: horiz ? (Math.random() < 0.5 ? -1 : 1) : 0,
      dr: horiz ? 0 : (Math.random() < 0.5 ? -1 : 1),
      left: 5 + Math.floor(Math.random() * 7),
      sig: (spawned++ % 3) === 2 ? 1 : 0,
      acc: 0
    };
    packets.push(p);
  };

  var draw = function () {
    ctx.clearRect(0, 0, W, H);
    var px = pointer.x, py = pointer.y, on = pointer.on;
    var R2 = SPOT_R * SPOT_R, half = DOT / 2;
    // Pass 1: grey dots.
    ctx.fillStyle = "#fafafa";
    for (var r = 0; r < rows; r++) {
      var y = oy + r * GAP;
      for (var c = 0; c < cols; c++) {
        var i = r * cols + c, x = ox + c * GAP;
        var a = BASE * weight[i];
        if (on > 0.01) {
          var dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
          if (d2 < R2) { var f = 1 - d2 / R2; a += SPOT * f * f * on * (0.5 + 0.5 * weight[i]); }
        }
        ctx.globalAlpha = a;
        ctx.fillRect(x - half, y - half, DOT, DOT);
      }
    }
    // Pass 2: green packets and their trails.
    for (var k = 0; k < heat.length; k++) {
      var h = heat[k];
      if (h < 0.02) continue;
      ctx.fillStyle = hue[k] ? signal : "#3ecf8e";
      var cc = k % cols, rr = (k - cc) / cols;
      ctx.globalAlpha = Math.min(1, h * 0.95 * (0.45 + 0.6 * weight[k]));
      var s = DOT + h * 1.2;
      ctx.fillRect(ox + cc * GAP - s / 2, oy + rr * GAP - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  };

  setup();
  draw();

  var resizeT = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { setup(); draw(); }, 120);
  });
  if (reduceMotion) return;

  hero.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    var r = bg.getBoundingClientRect();
    pointer.tx = e.clientX - r.left; pointer.ty = e.clientY - r.top;
    if (pointer.onT === 0 && pointer.on < 0.02) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    pointer.onT = 1;
  });
  hero.addEventListener("pointerleave", function () { pointer.onT = 0; });

  var visible = true, raf = 0, prev = 0;
  var tick = function (now) {
    raf = 0;
    if (!visible || document.hidden) return;
    var dt = Math.min(64, now - (prev || now)); prev = now;

    pointer.x += (pointer.tx - pointer.x) * 0.12;
    pointer.y += (pointer.ty - pointer.y) * 0.12;
    pointer.on += (pointer.onT - pointer.on) * 0.06;

    if (packets.length < MAX_PACKETS && now - lastSpawn > 700 + Math.random() * 900) { spawn(); lastSpawn = now; }
    for (var p = packets.length - 1; p >= 0; p--) {
      var q = packets[p];
      q.acc += dt;
      while (q.acc > 70 && q.left > 0) {        // ~14 cells per second
        q.acc -= 70;
        if (q.c >= 0 && q.c < cols && q.r >= 0 && q.r < rows) { heat[q.r * cols + q.c] = 1; hue[q.r * cols + q.c] = q.sig; }
        q.c += q.dc; q.r += q.dr; q.left--;
      }
      if (q.left <= 0) packets.splice(p, 1);
    }
    var decay = Math.pow(0.9, dt / 16);
    for (var k = 0; k < heat.length; k++) if (heat[k]) heat[k] = heat[k] < 0.02 ? 0 : heat[k] * decay;

    draw();
    raf = requestAnimationFrame(tick);
  };
  var start = function () { if (!raf) { prev = 0; raf = requestAnimationFrame(tick); } };

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }).observe(bg);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
  start();
})();
