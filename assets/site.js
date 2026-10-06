// Silogram website behaviour: mobile menu, product tabs, value calculator, copy email.
// Every page works without this script: the menu and all tab panels simply stay open.
(function () {
  "use strict";

  /* Mobile menu */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Menu";
        toggle.focus();
      }
    });
  }

  /* Tabs: [data-tabs] holds a .tablist of buttons and .tabpanel siblings in the same order */
  Array.prototype.forEach.call(document.querySelectorAll("[data-tabs]"), function (set) {
    var buttons = Array.prototype.slice.call(set.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(set.querySelectorAll('[role="tabpanel"]'));
    function select(i, focus) {
      buttons.forEach(function (b, j) {
        var on = i === j;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      if (focus) buttons[i].focus();
      if (history.replaceState) history.replaceState(null, "", "#" + panels[i].id);
    }
    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () { select(i, false); });
      b.addEventListener("keydown", function (e) {
        var n = buttons.length;
        if (e.key === "ArrowRight") { e.preventDefault(); select((i + 1) % n, true); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); select((i - 1 + n) % n, true); }
        else if (e.key === "Home") { e.preventDefault(); select(0, true); }
        else if (e.key === "End") { e.preventDefault(); select(n - 1, true); }
      });
    });
    var start = panels.findIndex(function (p) { return "#" + p.id === location.hash; });
    select(start >= 0 ? start : 0, false);
    if (start < 0 && history.replaceState) history.replaceState(null, "", location.pathname + location.search);
  });

  /* Value calculator */
  var calc = document.getElementById("value-calc");
  if (calc) {
    var money = function (n) {
      var a = Math.abs(n);
      var s = a >= 1e9 ? (a / 1e9).toFixed(a >= 1e10 ? 0 : 1) + "B" : a >= 1e6 ? (a / 1e6).toFixed(a >= 1e8 ? 0 : 1) + "M" : a >= 1e3 ? Math.round(a / 1e3) + "K" : String(Math.round(a));
      return "$" + s.replace(/\.0(?=[BMK])/, "");
    };
    // Accepts "50000000", "$50,000,000", "50M", "1.2B", "750k" and "50 million".
    var parseAmount = function (raw) {
      var t = String(raw).toLowerCase().replace(/[$,\s]/g, "");
      var m = /^(\d+(?:\.\d+)?)(k|thousand|m|mm|million|b|bn|billion)?$/.exec(t);
      if (!m) return 0;
      var mult = { k: 1e3, thousand: 1e3, m: 1e6, mm: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9 }[m[2] || ""] || 1;
      return parseFloat(m[1]) * mult;
    };
    var num = function (id) {
      var v = parseAmount(document.getElementById(id).value);
      return isFinite(v) && v > 0 ? v : 0;
    };
    var revenueInput = document.getElementById("calc-revenue");
    if (revenueInput) {
      revenueInput.addEventListener("blur", function () {
        var v = parseAmount(revenueInput.value);
        if (v > 0) revenueInput.value = Math.round(v).toLocaleString("en-US");
      });
    }
    var update = function () {
      var revenue = num("calc-revenue");
      var weeks = num("calc-weeks");
      var docs = Math.max(1, Math.round(num("calc-docs")) || 1);
      var perWeek = revenue / 52;
      document.getElementById("out-total").textContent = money(perWeek * weeks * docs);
      document.getElementById("out-week").textContent = money(perWeek);
      document.getElementById("out-day").textContent = money(revenue / 365);
      document.getElementById("out-explain").textContent =
        weeks * docs > 0
          ? weeks + " week" + (weeks === 1 ? "" : "s") + " earlier on " + docs + " decision" + (docs === 1 ? "" : "s") + " at " + money(revenue) + " a year each."
          : "Enter the weeks you expect to gain.";
    };
    calc.addEventListener("input", update);
    calc.addEventListener("submit", function (e) { e.preventDefault(); update(); });
    update();
  }

  /* Copy email */
  var button = document.getElementById("copy-email");
  var address = document.getElementById("email");
  var status = document.getElementById("copy-status");
  if (button && address) {
    var timer;
    var show = function (label, message) {
      button.textContent = label;
      if (status) status.textContent = message;
      clearTimeout(timer);
      timer = setTimeout(function () { button.textContent = "Copy"; }, 2500);
    };
    var selectAddress = function () {
      var selection = window.getSelection ? window.getSelection() : null;
      if (selection) {
        var range = document.createRange();
        range.selectNodeContents(address);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      show("Selected", "Email address selected. Copy it with your keyboard.");
    };
    button.addEventListener("click", function () {
      try {
        navigator.clipboard.writeText(address.textContent.trim()).then(function () { show("Copied", "Email address copied."); }, selectAddress);
      } catch {
        selectAddress();
      }
    });
  }
})();
