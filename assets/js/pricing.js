/* Packages section: port of ink-orbit-pricing to vanilla JS.
   Reveals once on screen, and the period toggle counts each plan's
   article volume between per-month and per-term (3-month minimum). */
(function () {
  "use strict";

  var root = document.querySelector("[data-ip]");
  if (!root) return;

  var TERM_MONTHS = 3;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Reveal once on screen */
  var reveal = root.querySelector("[data-ip-reveal]");
  if (reveal) {
    if (typeof IntersectionObserver !== "function" || reduced) {
      reveal.setAttribute("data-in", "true");
    } else {
      root.classList.add("ip-js");
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          reveal.setAttribute("data-in", "true");
          io.disconnect();
        }
      }, { threshold: 0.15 });
      io.observe(reveal);
    }
  }

  /* Number ticker: ease-out cubic over 500 ms from the value on screen */
  function ease(t) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3); }
  function tick(el, to) {
    var from = parseFloat(el.getAttribute("data-shown") || el.textContent) || 0;
    cancelAnimationFrame(el._raf || 0);
    if (reduced) { el.textContent = String(to); el.setAttribute("data-shown", String(to)); return; }
    var t0 = performance.now();
    var step = function (now) {
      var t = Math.min(1, (now - t0) / 500);
      var v = from + (to - from) * ease(t);
      el.setAttribute("data-shown", String(v));
      el.textContent = String(Math.round(v));
      if (t < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  /* Period toggle */
  var toggle = root.querySelector(".ip-toggle");
  var buttons = root.querySelectorAll("[data-ip-period]");
  function setPeriod(period) {
    var term = period === "term";
    toggle.setAttribute("data-period", period);
    buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-ip-period") === period)); });
    root.querySelectorAll("[data-ip-count]").forEach(function (el) {
      var monthly = parseInt(el.getAttribute("data-ip-count"), 10);
      tick(el, term ? monthly * TERM_MONTHS : monthly);
    });
    root.querySelectorAll("[data-ip-per]").forEach(function (el) {
      el.textContent = term ? "articles / 3 months" : "articles / month";
    });
    root.querySelectorAll("[data-ip-note]").forEach(function (el) {
      el.textContent = term ? "Over the 3-month minimum term" : "Billed monthly, after onboarding";
    });
  }
  buttons.forEach(function (b) {
    b.addEventListener("click", function () { setPeriod(b.getAttribute("data-ip-period")); });
  });
})();
