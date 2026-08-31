/* M-TECH category navigation
   --------------------------------------------------------------------------
   The five storefront categories are permanent because each has a dedicated
   page. Firestore products remain dynamic, but category creation is not.
*/
(function () {
  "use strict";

  var OFFICIAL = [
    { id: "iphone", name: "iPhone", page: "iphone.html", blurb: "Pro Max, Pro, Air and standard models — chosen by the exact variant you want.", image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-17.jpg", alt: "Apple iPhone handsets arranged on a clean white surface at M-TECH Port Harcourt" },
    { id: "samsung", name: "Samsung", page: "samsung.html", blurb: "Galaxy S flagships, Z foldables and everyday Galaxy A devices.", image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s26-ultra-new.jpg", alt: "Samsung Galaxy flagship smartphone displayed with its retail box" },
    { id: "redmi", name: "Redmi", page: "redmi.html", blurb: "Big batteries, strong screens and serious value from the Redmi line-up.", image: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-15-global.jpg", alt: "Three Redmi smartphones laid out on a bright background" },
    { id: "laptops", name: "Laptops", page: "laptops.html", blurb: "HP, Lenovo, Dell and MacBook machines for work, school and business.", image: "https://images.pexels.com/photos/129205/pexels-photo-129205.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", alt: "Laptop open on a minimalist desk, ready for work and study" },
    { id: "accessories", name: "Accessories", page: "accessories.html", blurb: "Cases, screen protection, fast chargers, cables, power banks and earbuds.", image: "https://images.pexels.com/photos/37933313/pexels-photo-37933313.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", alt: "Phone accessories including cases and cables displayed on a shop counter" }
  ];

  function esc(value) {
    if (typeof escapeHTML === "function") return escapeHTML(value == null ? "" : value);
    return String(value == null ? "" : value).replace(/[&<>\"']/g, function (c) {
      return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c];
    });
  }

  function renderPublicCategories() {
    var grids = document.querySelectorAll("[data-categories]");
    grids.forEach(function (grid) {
      grid.innerHTML = OFFICIAL.map(function (c, i) {
        return '<a class="cat-card reveal" href="' + esc(c.page) + '" data-category-link="' + esc(c.id) + '" aria-label="Shop ' + esc(c.name) + ' at M-TECH Port Harcourt">' +
          '<div class="thumb"><img src="' + esc(c.image) + '" alt="' + esc(c.alt) + '" width="800" height="600" loading="' + (i < 2 ? "eager" : "lazy") + '" decoding="async" onload="MTECH_IMG.ok(this)" onerror="MTECH_IMG.fail(this)"></div>' +
          '<div class="cat-card__body"><span class="eyebrow">Category</span><h3>' + esc(c.name) + '</h3><p>' + esc(c.blurb) + '</p><span class="cat-card__link">Shop ' + esc(c.name) + ' <span aria-hidden="true">→</span></span></div>' +
        '</a>';
      }).join("");
      if (window.MTECHUI && window.MTECHUI.observeReveals) window.MTECHUI.observeReveals(grid);
    });
  }

  function syncNavigation() {
    var desktop = document.querySelector(".nav-list > .nav-has-sub .nav-sub");
    if (desktop) {
      desktop.innerHTML = OFFICIAL.map(function (c) {
        return '<li role="none"><a class="nav-sub-link" href="' + esc(c.page) + '" role="menuitem">' + esc(c.name) + '</a></li>';
      }).join("");
    }

    var mobile = document.querySelector(".mobile-panel");
    if (mobile) {
      var titles = Array.from(mobile.querySelectorAll(".m-group-title"));
      var title = titles.find(function (el) { return el.textContent.trim().toLowerCase() === "categories"; });
      var services = titles.find(function (el) { return el.textContent.trim().toLowerCase() === "services"; });
      if (title && services) {
        var node = title.nextElementSibling;
        while (node && node !== services) {
          var next = node.nextElementSibling;
          node.remove();
          node = next;
        }
        OFFICIAL.forEach(function (c) {
          var a = document.createElement("a");
          a.className = "m-link";
          a.href = c.page;
          a.innerHTML = esc(c.name) + ' <span>→</span>';
          mobile.insertBefore(a, services);
        });
      }
    }
  }

  function applyRequestedCategory() {
    var params = new URLSearchParams(window.location.search);
    var requested = String(params.get("category") || "").toLowerCase().trim();
    if (!requested) return;
    var allowed = OFFICIAL.some(function (c) { return c.id === requested; });
    if (!allowed) return;

    function apply() {
      var target = requested;
      var list = Array.isArray(window.products) ? window.products.filter(function (p) {
        return String(p.category || "").toLowerCase().trim() === target;
      }) : [];
      var blocks = document.querySelectorAll("[data-catalog]");
      blocks.forEach(function (block) {
        var grid = block.querySelector("[data-catalog-grid]");
        if (!grid || typeof renderProducts !== "function") return;
        renderProducts(grid, list, { eager: false });
        block.querySelectorAll("[data-filter]").forEach(function (chip) { chip.classList.remove("is-active"); });
      });
      var shop = document.getElementById("shop");
      if (shop && !window.__MTECH_CATEGORY_SCROLLED) {
        window.__MTECH_CATEGORY_SCROLLED = true;
        setTimeout(function () { shop.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
      }
    }
    window.addEventListener("mtech-catalog-reload", apply);
    setTimeout(apply, 900);
  }

  function exposeFixedCategories() {
    if (Array.isArray(window.CATEGORIES)) {
      window.CATEGORIES.splice.apply(window.CATEGORIES, [0, window.CATEGORIES.length].concat(OFFICIAL));
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    exposeFixedCategories();
    renderPublicCategories();
    syncNavigation();
    applyRequestedCategory();
  });
})();
