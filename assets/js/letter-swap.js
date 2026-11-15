/* Random letter swap: on hover/focus every letter of a button label rolls up
   while a copy rolls in from below, letters picked in random order. */
(function () {
  "use strict";

  var STAGGER = 20; // ms between letters

  var shuffle = function (n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = a[j]; a[j] = a[k]; a[k] = t;
    }
    return a;
  };

  var build = function (el) {
    var label = el.textContent.replace(/\s+/g, " ").trim();
    if (!label || el.querySelector(".lswap")) return;

    var sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = label;

    var wrap = document.createElement("span");
    wrap.className = "lswap";
    wrap.setAttribute("aria-hidden", "true");

    var chars = [];
    Array.from(label).forEach(function (c) {
      var ch = document.createElement("span");
      ch.className = "lswap__ch";
      var a = document.createElement("span");
      var b = document.createElement("span");
      a.textContent = b.textContent = c;
      ch.appendChild(a);
      ch.appendChild(b);
      wrap.appendChild(ch);
      chars.push(ch);
    });

    el.textContent = "";
    el.appendChild(sr);
    el.appendChild(wrap);

    var set = function (on) {
      if (on && el.disabled) return;
      if (el.classList.contains("is-swapped") === on) return;
      shuffle(chars.length).forEach(function (idx, order) {
        chars[idx].style.setProperty("--d", order * STAGGER + "ms");
      });
      el.classList.toggle("is-swapped", on);
    };

    el.addEventListener("mouseenter", function () { set(true); });
    el.addEventListener("mouseleave", function () { set(false); });
    el.addEventListener("focus", function () { if (el.matches(":focus-visible")) set(true); });
    el.addEventListener("blur", function () { set(false); });
  };

  document.querySelectorAll(".btn").forEach(build);
})();
