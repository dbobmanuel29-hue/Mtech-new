/* M-TECH category sync bridge
   Keeps Firestore categories as the source of truth while preserving the
   existing designed pages/images for built-in categories.
*/
(function () {
  "use strict";

  var DEFAULTS = {
    iphone: {
      name: "iPhone", page: "iphone.html",
      image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-17.jpg",
      alt: "Apple iPhone handsets arranged on a clean white surface at M-TECH Port Harcourt"
    },
    samsung: {
      name: "Samsung", page: "samsung.html",
      image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s26-ultra-new.jpg",
      alt: "Samsung Galaxy flagship smartphone displayed with its retail box"
    },
    redmi: {
      name: "Redmi", page: "redmi.html",
      image: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-15-global.jpg",
      alt: "Redmi smartphones displayed at M-TECH"
    },
    laptops: {
      name: "Laptops", page: "laptops.html",
      image: "https://images.pexels.com/photos/129205/pexels-photo-129205.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
      alt: "Laptop open on a minimalist desk, ready for work and study"
    },
    accessories: {
      name: "Accessories", page: "accessories.html",
      image: "https://images.pexels.com/photos/37933313/pexels-photo-37933313.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
      alt: "Phone accessories displayed at M-TECH"
    }
  };

  var GENERIC_CATEGORY_IMAGE = "https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200";

  function esc(value) {
    if (typeof escapeHTML === "function") return escapeHTML(value == null ? "" : value);
    return String(value == null ? "" : value).replace(/[&<>\"']/g, function (c) {
      return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c];
    });
  }

  function slug(value) {
    return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function normalizeCategory(c) {
    c = c || {};
    var id = slug(c.id || c.name);
    var base = DEFAULTS[id] || {};
    var page = c.page && c.page !== "index.html#shop" && c.page !== "#shop"
      ? c.page
      : "index.html?category=" + encodeURIComponent(id) + "#shop";
    return Object.assign({}, base, c, {
      id: c.id || id,
      name: c.name || base.name || id,
      page: page,
      image: c.image || base.image || GENERIC_CATEGORY_IMAGE,
      alt: c.alt || base.alt || ((c.name || id) + " category at M-TECH Port Harcourt")
    });
  }

  function categoryHref(c) {
    var n = normalizeCategory(c);
    return n.page || ("index.html?category=" + encodeURIComponent(n.id) + "#shop");
  }

  function renderPublicCategories(categories) {
    var grids = document.querySelectorAll("[data-categories]");
    if (!grids.length) return;
    grids.forEach(function (grid) {
      grid.innerHTML = categories.map(function (c, i) {
        return '<a class="cat-card reveal" href="' + esc(categoryHref(c)) + '" data-category-link="' + esc(c.id) + '" aria-label="Shop ' + esc(c.name) + ' at M-TECH Port Harcourt">' +
          '<div class="thumb"><img src="' + esc(c.image) + '" alt="' + esc(c.alt) + '" width="800" height="600" loading="' + (i < 2 ? "eager" : "lazy") + '" decoding="async" onload="MTECH_IMG.ok(this)" onerror="MTECH_IMG.fail(this)"></div>' +
          '<div class="cat-card__body"><span class="eyebrow">Category</span><h3>' + esc(c.name) + '</h3><p>' + esc(c.blurb || "Browse the latest " + c.name + " products available from M-TECH.") + '</p><span class="cat-card__link">Shop ' + esc(c.name) + ' <span aria-hidden="true">→</span></span></div>' +
        '</a>';
      }).join("");
      if (window.MTECHUI && window.MTECHUI.observeReveals) window.MTECHUI.observeReveals(grid);
    });
  }

  function syncNavigation(categories) {
    var desktop = document.querySelector(".nav-list > .nav-has-sub .nav-sub");
    if (desktop) {
      desktop.innerHTML = categories.map(function (c) {
        return '<li role="none"><a class="nav-sub-link" href="' + esc(categoryHref(c)) + '" role="menuitem">' + esc(c.name) + '</a></li>';
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
        categories.forEach(function (c) {
          var a = document.createElement("a");
          a.className = "m-link";
          a.href = categoryHref(c);
          a.innerHTML = esc(c.name) + ' <span>→</span>';
          mobile.insertBefore(a, services);
        });
      }
    }
  }

  function applyRequestedCategory() {
    var params = new URLSearchParams(window.location.search);
    var requested = slug(params.get("category"));
    if (!requested) return;

    function apply() {
      var target = requested;
      var list = Array.isArray(window.products) ? window.products.filter(function (p) {
        return slug(p.category || p.categoryName) === target || slug(p.brand) === target;
      }) : [];
      var blocks = document.querySelectorAll("[data-catalog]");
      blocks.forEach(function (block) {
        var grid = block.querySelector("[data-catalog-grid]");
        if (!grid || typeof renderProducts !== "function") return;
        renderProducts(grid, list, { eager: false });
        var chips = block.querySelectorAll("[data-filter]");
        chips.forEach(function (chip) { chip.classList.remove("is-active"); });
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

  async function run() {
    if (!window.MTECH_CONFIG || !MTECH_CONFIG.isEnabled || !MTECH_CONFIG.db) return;
    try {
      var snap = await MTECH_CONFIG.db.collection("categories").orderBy("displayOrder", "asc").get();
      var categories = [];
      snap.forEach(function (doc) { categories.push(normalizeCategory(Object.assign({ id: doc.id }, doc.data()))); });

      if (!categories.length && Array.isArray(window.CATEGORIES)) {
        categories = window.CATEGORIES.map(normalizeCategory);
      }

      renderPublicCategories(categories);
      syncNavigation(categories);

      /* Built-in Firestore categories historically lacked images. Keep the
         existing designed artwork for those records without changing their
         Firestore documents. */
      if (Array.isArray(window.CATEGORIES)) {
        window.CATEGORIES.splice.apply(window.CATEGORIES, [0, window.CATEGORIES.length].concat(categories));
      }

      applyRequestedCategory();
    } catch (err) {
      console.error("[M-TECH CATEGORY] Live category sync failed:", err);
    }
  }

  function enrichAdminCategoryImages() {
    var grid = document.getElementById("cat-grid");
    if (!grid) return;
    grid.querySelectorAll(".card").forEach(function (card) {
      var heading = card.querySelector("h3");
      var img = card.querySelector("img");
      if (!heading || img) return;
      var id = slug(heading.textContent);
      var meta = DEFAULTS[id];
      var src = meta ? meta.image : GENERIC_CATEGORY_IMAGE;
      var wrap = card.querySelector(".thumb");
      if (!wrap) return;
      wrap.innerHTML = '<img src="' + esc(src) + '" alt="' + esc(meta ? meta.alt : heading.textContent + " category") + '" style="width:100%;height:100%;object-fit:cover" loading="lazy" decoding="async" onload="MTECH_IMG.ok(this)" onerror="MTECH_IMG.fail(this)">';
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    run();
    enrichAdminCategoryImages();
    var grid = document.getElementById("cat-grid");
    if (grid && window.MutationObserver) {
      new MutationObserver(function () { enrichAdminCategoryImages(); }).observe(grid, { childList: true, subtree: true });
    }
  });
})();
