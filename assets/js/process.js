/* Process section: on wide screens the section pins and vertical scroll
   slides the four steps sideways. Narrow screens, reduced motion and
   no-JS get a plain stacked list. */
(function () {
  "use strict";

  var section = document.querySelector("[data-process]");
  if (!section) return;

  var pin = section.querySelector(".process__pin");
  var track = section.querySelector("[data-process-track]");

  var wide = window.matchMedia("(min-width: 861px)");
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");
  var distance = 0;
  var ticking = false;

  var update = function () {
    ticking = false;
    if (!section.classList.contains("is-horizontal")) return;
    var rect = section.getBoundingClientRect();
    var span = rect.height - window.innerHeight;
    var p = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 0;
    track.style.transform = "translate3d(" + (-p * distance).toFixed(1) + "px,0,0)";
  };

  var requestUpdate = function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };

  var layout = function () {
    var on = wide.matches && !still.matches;
    section.classList.toggle("is-horizontal", on);
    if (!on) {
      section.style.height = "";
      track.style.transform = "";
      return;
    }
    distance = Math.max(0, track.scrollWidth - pin.clientWidth);
    // Scrolling this many extra pixels moves the track from start to end.
    section.style.height = (distance + window.innerHeight) + "px";
    update();
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", layout);
  if (wide.addEventListener) { wide.addEventListener("change", layout); still.addEventListener("change", layout); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  layout();
})();
