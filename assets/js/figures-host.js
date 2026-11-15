/*
 * Hosts Hairline figures on the site. Each figure file (assets/figures/*.js,
 * loaded as a module) ends with hairline({ name, means, range, mount, ... });
 * this mounts it into the element with the matching data-figure attribute.
 * The kernel (hairline-kernel.js) is the unchanged @lucasmarkes/hairline core.
 */
(function () {
  "use strict";
  if (!window.HL) return;
  HL.inject(document);

  window.hairline = function (figure) {
    var stage = document.querySelector('[data-figure="' + figure.name + '"]');
    if (!stage || stage.hasAttribute("data-hairline")) return;
    var out = document.querySelector('[data-figure-read="' + figure.name + '"]');

    stage.setAttribute("data-hairline", figure.name);
    stage.setAttribute("role", "img");
    if (!stage.getAttribute("aria-label")) stage.setAttribute("aria-label", figure.means);

    var svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);
    var text = "rest";
    var read = {
      get textContent() { return text; },
      set textContent(v) { text = v == null ? "" : String(v); if (out) out.textContent = text; }
    };
    // the slider's default: the middle of the figure's range
    figure.mount({ stage: stage, svg: svg, read: read }, figure.range[1]);
  };
})();
