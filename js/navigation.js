/* ==========================================================================
   M-TECH Premium Gadget Store — Navigation
   Handles: sticky header, mobile menu, dropdown toggle,
            current-page marker, back-to-top, smooth scrolling.
   Account/Auth UI is handled by js/nav-account-btn.js.
   ========================================================================== */

function initNavigation() {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var panel  = document.getElementById("mobile-menu");

  /* ─── Mobile menu ───────────────────────────────────────────────────── */
  function closeMenu() {
    if (!panel || !toggle) return;
    panel.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }
  function openMenu() {
    if (!panel || !toggle) return;
    panel.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-open");
  }

  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      toggle.getAttribute("aria-expanded") === "true" ? closeMenu() : openMenu();
    });
    panel.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 819) closeMenu();
    });
  }

  /* ─── Desktop dropdowns (hover + click for touch) ───────────────────── */
  var dropItems = document.querySelectorAll(".nav-has-sub");

  dropItems.forEach(function (item) {
    var trigger = item.querySelector(".nav-link--dropdown");
    if (!trigger) return;

    trigger.addEventListener("click", function (e) {
      if (window.innerWidth <= 819) return; // mobile panel handles it
      var isOpen = item.classList.contains("is-open");
      // Close siblings
      dropItems.forEach(function (s) { s.classList.remove("is-open"); });
      item.classList.toggle("is-open", !isOpen);
      trigger.setAttribute("aria-expanded", String(!isOpen));
      e.preventDefault();
    });
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".nav-has-sub")) {
      dropItems.forEach(function (s) {
        s.classList.remove("is-open");
        var t = s.querySelector(".nav-link--dropdown");
        if (t) t.setAttribute("aria-expanded", "false");
      });
    }
  });

  /* ─── Sticky header shadow ───────────────────────────────────────────── */
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ─── Current-page marker ────────────────────────────────────────────── */
  var path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link, .nav-sub-link, .m-link").forEach(function (link) {
    var href = (link.getAttribute("href") || "").split("#")[0];
    if (href && href === path) link.setAttribute("aria-current", "page");
  });

  /* ─── Back to top ────────────────────────────────────────────────────── */
  var toTop = document.querySelector(".to-top");
  if (toTop) {
    window.addEventListener("scroll", function () {
      toTop.classList.toggle("is-visible", window.scrollY > 620);
    }, { passive: true });
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ─── Smooth in-page scrolling ───────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (!id || id === "#" || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY
              - (header ? header.offsetHeight + 14 : 14);
      window.scrollTo({ top: top, behavior: "smooth" });
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });

  /* ─── Data-year ──────────────────────────────────────────────────────── */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
}
