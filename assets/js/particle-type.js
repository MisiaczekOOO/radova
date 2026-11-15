/* Cursor-driven particle typography (vanilla port of the React component).
   Renders the text of [data-particle-type] as a field of dots on a canvas;
   the pointer pushes dots away and they spring back to their origin.

   Options via data attributes on the host element:
     data-text      text to draw (falls back to the element's textContent)
     data-density   px between sampled dots (default 6)
     data-size      dot radius in px (default 1.5)
     data-disperse  repulsion strength (default 15)
     data-return    spring back speed (default 0.08)
   Colour comes from the host's CSS `color`. */
(function () {
  "use strict";

  var RADIUS = 120;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function Particle(x, y, o) {
    this.x = x + (Math.random() - 0.5) * 10;
    this.y = y + (Math.random() - 0.5) * 10;
    this.ox = x;
    this.oy = y;
    this.vx = (Math.random() - 0.5) * 5;
    this.vy = (Math.random() - 0.5) * 5;
    this.o = o;
  }

  Particle.prototype.update = function (mx, my) {
    var dx = mx - this.x;
    var dy = my - this.y;
    var d = Math.sqrt(dx * dx + dy * dy);

    if (d < RADIUS && d > 0 && mx !== -1000) {
      var f = (RADIUS - d) / RADIUS;
      this.vx -= (dx / d) * f * this.o.disperse;
      this.vy -= (dy / d) * f * this.o.disperse;
    }

    this.vx += (this.ox - this.x) * this.o.ret;
    this.vy += (this.oy - this.y) * this.o.ret;
    this.vx *= 0.85;
    this.vy *= 0.85;

    var ex = this.x - this.ox;
    var ey = this.y - this.oy;
    if (ex * ex + ey * ey < 1 && Math.random() > 0.95) {
      this.vx += (Math.random() - 0.5) * 0.2;
      this.vy += (Math.random() - 0.5) * 0.2;
    }

    this.x += this.vx;
    this.y += this.vy;
  };

  function mount(host) {
    var text = host.getAttribute("data-text") || host.textContent.trim();
    var o = {
      density: parseFloat(host.getAttribute("data-density")) || 6,
      size: parseFloat(host.getAttribute("data-size")) || 1.5,
      disperse: parseFloat(host.getAttribute("data-disperse")) || 15,
      ret: parseFloat(host.getAttribute("data-return")) || 0.08
    };

    host.textContent = "";
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);

    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    var particles = [];
    var mx = -1000, my = -1000;
    var w = 0, h = 0, colour = "#fff";
    var raf = 0;

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = colour;
      ctx.beginPath();
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        ctx.moveTo(p.x + o.size, p.y);
        ctx.arc(p.x, p.y, o.size, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    function init() {
      w = host.clientWidth;
      h = host.clientHeight;
      if (!w || !h) return;

      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      colour = getComputedStyle(host).color || "#fff";
      var family = getComputedStyle(host).fontFamily;

      // Fit the text to the box: start from the height, shrink to the width.
      var fs = h * 0.9;
      ctx.font = "700 " + fs + "px " + family;
      var tw = ctx.measureText(text).width;
      if (tw > w * 0.92) fs = fs * (w * 0.92) / tw;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#000";
      ctx.font = "700 " + fs + "px " + family;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, w / 2, h / 2);

      var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Smaller text needs a tighter grid to stay legible.
      var density = w < 600 ? o.density * 0.7 : o.density;
      var step = Math.max(1, Math.floor(density * dpr));
      particles = [];
      for (var y = 0; y < img.height; y += step) {
        for (var x = 0; x < img.width; x += step) {
          if (img.data[(y * img.width + x) * 4 + 3] > 128) {
            particles.push(new Particle(x / dpr, y / dpr, o));
          }
        }
      }

      if (reduce.matches) {
        particles.forEach(function (p) { p.x = p.ox; p.y = p.oy; });
      }
      draw(); // replace the sampling text right away, never show it
    }

    function tick() {
      for (var i = 0; i < particles.length; i++) particles[i].update(mx, my);
      draw();
      raf = requestAnimationFrame(tick);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (!reduce.matches) raf = requestAnimationFrame(tick);
    }

    function move(e) {
      var r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    }
    function leave() { mx = -1000; my = -1000; }

    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerdown", move);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") leave(); });
    canvas.addEventListener("pointercancel", leave);

    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(function () {
      init();
      start();
      new ResizeObserver(init).observe(host);
      reduce.addEventListener("change", function () { init(); start(); });
    });

    // Pause while the tab is hidden.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    });
  }

  document.querySelectorAll("[data-particle-type]").forEach(mount);
})();
