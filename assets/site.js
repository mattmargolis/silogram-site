// Silogram website behaviour: mobile menu, product tabs, value calculator, copy email.
// Every page works without this script: the menu and all tab panels simply stay open.
(function () {
  "use strict";

  // iOS Safari applies :active (the press feedback on buttons, tabs and menu rows) only once the page
  // listens for touches.
  document.addEventListener("touchstart", function () {}, { passive: true });

  /* Mobile menu: a card over the page. It opens on the section of the current page and closes on
     Escape, a tap outside it, or a tap on one of its links. */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  var shell = toggle && toggle.closest(".nav-shell");
  var setMenu = function (open) {
    nav.classList.toggle("is-open", open);
    if (shell) shell.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Close" : "Menu";
    if (open) {
      var current = nav.querySelector(".nav-menu > summary.is-current");
      if (current) current.parentNode.open = true;
    }
  };
  if (toggle && nav) {
    toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("is-open")) return;
      if (!e.target.closest(".nav-bar") || e.target.closest("#site-nav a")) setMenu(false);
    });
    // The dimmed area is the shell's ::before. iOS Safari doesn't send a tap on an element without its
    // own click handler to a listener on document, so the shell listens too.
    if (shell) shell.addEventListener("click", function (e) { if (e.target === shell) setMenu(false); });
  }

  /* Navigation menus (<details>): one open at a time; close on an outside click or Escape */
  var menus = Array.prototype.slice.call(document.querySelectorAll(".nav-menu"));
  menus.forEach(function (m) {
    m.addEventListener("toggle", function () {
      if (m.open) menus.forEach(function (o) { if (o !== m) o.open = false; });
    });
  });
  document.addEventListener("click", function (e) {
    if (toggle && toggle.contains(e.target)) return; // the phone menu toggle opens the current section
    menus.forEach(function (m) { if (m.open && !m.contains(e.target)) m.open = false; });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    menus.forEach(function (m) {
      if (m.open) {
        m.open = false;
        m.querySelector("summary").focus();
      }
    });
  });

  /* Tabs: [data-tabs] holds a .tablist of buttons and .tabpanel siblings in the same order */
  Array.prototype.forEach.call(document.querySelectorAll("[data-tabs]"), function (set) {
    var buttons = Array.prototype.slice.call(set.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(set.querySelectorAll('[role="tabpanel"]'));
    // Choosing a tab puts it in the address (#tab-documents) so the link can be shared. Setting up the
    // page does not touch the address, so links to other sections (#reproduce, #how) still scroll.
    function select(i, focus, chosen) {
      buttons.forEach(function (b, j) {
        var on = i === j;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      if (focus) buttons[i].focus();
      if (chosen && history.replaceState) history.replaceState(null, "", "#" + panels[i].id);
    }
    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () { select(i, false, true); });
      b.addEventListener("keydown", function (e) {
        var n = buttons.length;
        if (e.key === "ArrowRight") { e.preventDefault(); select((i + 1) % n, true, true); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); select((i - 1 + n) % n, true, true); }
        else if (e.key === "Home") { e.preventDefault(); select(0, true, true); }
        else if (e.key === "End") { e.preventDefault(); select(n - 1, true, true); }
      });
    });
    var start = panels.findIndex(function (p) { return "#" + p.id === location.hash; });
    select(start >= 0 ? start : 0, false, false);
    // Hiding the other panels moves everything below them, so land on the link's target again: a link
    // to a tab (#tab-documents) lands on the tab bar, any other link on its section, below the navigation.
    var target = null;
    try { target = start >= 0 ? set : location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) { /* malformed hash */ }
    if (target) {
      var land = function () {
        try { target.scrollIntoView({ block: "start", behavior: "instant" }); } catch (e) { /* leave the browser's own scroll */ }
      };
      land();
      // The browser keeps scrolling to the panel itself until the page loads; land on the tab bar after it.
      if (start >= 0) window.addEventListener("load", function () { requestAnimationFrame(land); });
    }
  });

  /* Value calculator */
  var calc = document.getElementById("value-calc");
  if (calc) {
    var money = function (n) {
      var a = Math.abs(n);
      var s = a >= 1e9 ? (a / 1e9).toFixed(a >= 1e10 ? 0 : 1) + "B" : a >= 1e6 ? (a / 1e6).toFixed(a >= 1e8 ? 0 : 1) + "M" : a >= 1e3 ? Math.round(a / 1e3) + "K" : String(Math.round(a));
      return "$" + s.replace(/\.0(?=[BMK])/, "");
    };
    // Accepts "50000000", "$50,000,000", "50M", "1.2B", "750k" and "50 million", and a decimal comma
    // ("1,5M") from keypads that have no point.
    var parseAmount = function (raw) {
      var t = String(raw).toLowerCase().replace(/[$\s]/g, "").replace(/^(\d+),(\d{1,2})([a-z]*)$/, "$1.$2$3").replace(/,/g, "");
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
      // Select the whole figure on focus, so a phone user can type over "50,000,000".
      revenueInput.addEventListener("focus", function () { setTimeout(function () { revenueInput.select(); }, 0); });
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
