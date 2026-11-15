/* Design helper: a small panel for choosing the 10% "signal" colour.
   It sets --color-signal on :root, remembers the choice in this browser,
   and shows the hex to paste into style.css. Remove this file (and its
   <script> tag) before launch. */
(function () {
  "use strict";

  var KEY = "radova-signal";
  var PRESETS = [
    ["#f5b84b", "Amber"],
    ["#ff8a5c", "Coral"],
    ["#a78bfa", "Violet"],
    ["#60b8f0", "Sky"],
    ["#f472b6", "Pink"],
    ["#e8f06a", "Citron"],
    ["#5eead4", "Aqua"],
    ["#fafafa", "None (snow)"]
  ];
  var root = document.documentElement;
  var DEFAULT = getComputedStyle(root).getPropertyValue("--color-signal").trim() || "#f5b84b";

  var store = {
    get: function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} },
    del: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };

  var apply = function (hex, save) {
    root.style.setProperty("--color-signal", hex);
    document.dispatchEvent(new CustomEvent("signalchange", { detail: hex }));
    if (save) store.set(hex);
    if (ui) sync(hex);
  };

  var saved = store.get();
  if (saved) apply(saved, false);

  /* UI */
  var ui = document.createElement("aside");
  ui.className = "ap";
  ui.setAttribute("aria-label", "Accent colour panel");
  ui.innerHTML =
    '<button class="ap__toggle" type="button" aria-expanded="true" aria-controls="ap-body">' +
      '<span class="ap__chip" aria-hidden="true"></span><span>Accent 10%</span>' +
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 10l4-4 4 4"/></svg>' +
    "</button>" +
    '<div class="ap__body" id="ap-body">' +
      '<p class="ap__hint">Results, data and what content brings in. Green stays for actions and approval.</p>' +
      '<div class="ap__swatches" role="radiogroup" aria-label="Preset colours"></div>' +
      '<div class="ap__row">' +
        '<input class="ap__picker" type="color" aria-label="Custom colour">' +
        '<input class="ap__hex" type="text" spellcheck="false" maxlength="7" aria-label="Hex value">' +
        '<button class="ap__btn" type="button" data-copy>Copy</button>' +
      "</div>" +
      '<div class="ap__row ap__row--end"><button class="ap__link" type="button" data-reset>Reset to default</button></div>' +
    "</div>";
  document.body.appendChild(ui);

  var sw = ui.querySelector(".ap__swatches");
  PRESETS.forEach(function (p) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ap__sw";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-label", p[1] + " " + p[0]);
    b.title = p[1] + " · " + p[0];
    b.dataset.hex = p[0];
    b.style.setProperty("--sw", p[0]);
    sw.appendChild(b);
  });

  var picker = ui.querySelector(".ap__picker");
  var hexIn = ui.querySelector(".ap__hex");
  var chip = ui.querySelector(".ap__chip");

  var norm = function (v) {
    v = String(v || "").trim().toLowerCase();
    if (v[0] !== "#") v = "#" + v;
    if (/^#[0-9a-f]{3}$/.test(v)) v = "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    return /^#[0-9a-f]{6}$/.test(v) ? v : null;
  };
  function sync(hex) {
    hex = norm(hex) || DEFAULT;
    picker.value = hex;
    if (document.activeElement !== hexIn) hexIn.value = hex;
    chip.style.background = hex;
    sw.querySelectorAll(".ap__sw").forEach(function (b) {
      b.setAttribute("aria-checked", b.dataset.hex === hex ? "true" : "false");
    });
  }
  sync(saved || DEFAULT);

  sw.addEventListener("click", function (e) {
    var b = e.target.closest(".ap__sw");
    if (b) apply(b.dataset.hex, true);
  });
  picker.addEventListener("input", function () { apply(picker.value, true); });
  hexIn.addEventListener("input", function () { var v = norm(hexIn.value); if (v) apply(v, true); });
  hexIn.addEventListener("blur", function () { sync(picker.value); });
  ui.querySelector("[data-reset]").addEventListener("click", function () {
    store.del(); apply(DEFAULT, false);
  });
  ui.querySelector("[data-copy]").addEventListener("click", function (e) {
    var btn = e.currentTarget, text = "--color-signal: " + picker.value + ";";
    var done = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy"; }, 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
  });
  var toggle = ui.querySelector(".ap__toggle");
  toggle.addEventListener("click", function () {
    var open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", open ? "false" : "true");
    ui.classList.toggle("is-closed", open);
  });
})();
