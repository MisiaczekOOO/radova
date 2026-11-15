/* How the content system works: a looping run of the content system.
   Data dots travel from the inputs into the engine, the engine's stages
   light in turn, content goes out to the channels, and results travel the
   feedback wire back to the inputs. Pauses off screen. */
(function () {
  "use strict";
  var sys = document.querySelector("[data-sys]");
  if (!sys) return;
  var svg = sys.querySelector("[data-sys-wires]");
  var engine = sys.querySelector("[data-sys-engine]");
  var stateEl = sys.querySelector("[data-sys-state]");
  var loopEl = sys.querySelector("[data-sys-loop]");
  var ins = Array.prototype.slice.call(sys.querySelectorAll(".sys__chip--in"));
  var outs = Array.prototype.slice.call(sys.querySelectorAll(".sys__chip--out"));
  var stages = Array.prototype.slice.call(sys.querySelectorAll(".sys__stage"));
  var NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STAGE_TEXT = ["Building product knowledge", "Choosing topics", "Drafting", "Human check"];

  var inWires = [], outWires = [], fbWire = null;

  var wiresShown = function () { return getComputedStyle(svg).display !== "none"; };

  var path = function (d, cls) {
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    if (cls) p.setAttribute("class", cls);
    svg.appendChild(p);
    return p;
  };

  var layout = function () {
    svg.innerHTML = "";
    inWires = []; outWires = []; fbWire = null;
    if (!wiresShown()) return;
    var b = sys.getBoundingClientRect();
    var e = engine.getBoundingClientRect();
    var ex = e.left - b.left, exr = e.right - b.left, emy = e.top - b.top + e.height / 2;
    var curve = function (x1, y1, x2, y2) {
      var dx = (x2 - x1) / 2;
      return "M" + x1 + " " + y1 + " C" + (x1 + dx) + " " + y1 + " " + (x2 - dx) + " " + y2 + " " + x2 + " " + y2;
    };
    ins.forEach(function (c, i) {
      var r = c.getBoundingClientRect();
      inWires.push(path(curve(r.right - b.left, r.top - b.top + r.height / 2, ex, emy + (i - (ins.length - 1) / 2) * 14)));
    });
    outs.forEach(function (c, i) {
      var r = c.getBoundingClientRect();
      outWires.push(path(curve(exr, emy + (i - (outs.length - 1) / 2) * 14, r.left - b.left, r.top - b.top + r.height / 2), "is-out"));
    });
    // Feedback: from under the outputs, along the bottom, up into the inputs.
    var lo = outs[outs.length - 1].getBoundingClientRect();
    var li = ins[ins.length - 1].getBoundingClientRect();
    var l = loopEl.getBoundingClientRect();
    var ox = lo.left - b.left + lo.width / 2, ix = li.left - b.left + li.width / 2;
    var y0o = lo.bottom - b.top, y0i = li.bottom - b.top;
    var y = l.top - b.top - 2, r = 12;
    fbWire = path("M" + ox + " " + y0o + " V" + (y - r) + " Q" + ox + " " + y + " " + (ox - r) + " " + y +
      " H" + (ix + r) + " Q" + ix + " " + y + " " + ix + " " + (y - r) + " V" + y0i, "sys__fb");
  };

  /* Pausing: every wait resolves only while the section is on screen. */
  var visible = false, wake = null;
  var whenVisible = function () {
    return visible ? Promise.resolve() : new Promise(function (res) { wake = res; });
  };
  var wait = function (ms) {
    return new Promise(function (res) { setTimeout(res, ms); }).then(whenVisible);
  };

  var dot = function (p, ms, signal) {
    if (!p || !wiresShown()) return wait(ms);
    var len = p.getTotalLength();
    var c = document.createElementNS(NS, "circle");
    c.setAttribute("r", "3");
    if (signal) c.setAttribute("class", "is-signal");
    svg.appendChild(c);
    return new Promise(function (res) {
      var t0 = null;
      var step = function (now) {
        if (t0 === null) t0 = now;
        var k = Math.min(1, (now - t0) / ms);
        var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var pt = p.getPointAtLength(e * len);
        c.setAttribute("cx", pt.x); c.setAttribute("cy", pt.y);
        if (k < 1) requestAnimationFrame(step); else { c.remove(); res(); }
      };
      requestAnimationFrame(step);
    });
  };

  var on = function (el, v) { if (el) el.classList.toggle("is-on", v); };
  var clear = function () {
    ins.concat(outs, stages, [engine, loopEl]).forEach(function (el) { el.classList.remove("is-on", "is-done"); });
    inWires.concat(outWires, [fbWire]).forEach(function (p) { if (p) p.classList.remove("is-on"); });
  };

  var run = async function () {
    for (;;) {
      await whenVisible();
      clear();
      stateEl.textContent = "Reading your data";
      // 1. Inputs flow in.
      var arrivals = ins.map(function (c, i) {
        return wait(i * 260).then(function () {
          on(c, true); on(inWires[i], true);
          return dot(inWires[i], 1000);
        });
      });
      await Promise.all(arrivals);
      on(engine, true);
      // 2. The engine works through its stages.
      for (var k = 0; k < stages.length; k++) {
        if (k) { stages[k - 1].classList.remove("is-on"); stages[k - 1].classList.add("is-done"); }
        on(stages[k], true);
        stateEl.textContent = STAGE_TEXT[k];
        await wait(1300);
      }
      stages[stages.length - 1].classList.remove("is-on");
      stages[stages.length - 1].classList.add("is-done");
      // 3. Content goes out.
      stateEl.textContent = "Publishing";
      await Promise.all(outs.map(function (c, i) {
        return wait(i * 260).then(function () {
          on(outWires[i], true);
          return dot(outWires[i], 1000, true).then(function () { on(c, true); });
        });
      }));
      await wait(700);
      // 4. Results feed back.
      stateEl.textContent = "Learning from results";
      on(loopEl, true); on(fbWire, true);
      await dot(fbWire, 1800, true);
      ins.forEach(function (c) { on(c, false); });
      await wait(1200);
      on(engine, false);
      await wait(400);
    }
  };

  layout();
  var rt = 0;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(layout, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  if (reduceMotion) {
    ins.concat(outs, [engine]).forEach(function (el) { el.classList.add("is-on"); });
    stages.forEach(function (s) { s.classList.add("is-done"); });
    stateEl.textContent = "Monthly loop";
    return;
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && wake) { var w = wake; wake = null; w(); }
    }, { threshold: 0.25 }).observe(sys);
  } else {
    visible = true;
  }
  run();
})();
