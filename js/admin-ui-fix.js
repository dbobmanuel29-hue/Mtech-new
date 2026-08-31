/* M-TECH Admin UI policy
   --------------------------------------------------------------------------
   Categories are part of the permanent storefront architecture. They are not
   user-created content. This layer locks the admin category UI to the five
   official category pages while preserving category artwork and product CRUD.
*/
(function () {
  "use strict";

  var OFFICIAL = ["iPhone", "Samsung", "Redmi", "Laptops", "Accessories"];
  var META = {
    iphone: { image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-17.jpg", alt: "Apple iPhone handsets at M-TECH" },
    samsung: { image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s26-ultra-new.jpg", alt: "Samsung Galaxy smartphone at M-TECH" },
    redmi: { image: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-15-global.jpg", alt: "Redmi smartphones at M-TECH" },
    laptops: { image: "https://images.pexels.com/photos/129205/pexels-photo-129205.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", alt: "Laptop at M-TECH" },
    accessories: { image: "https://images.pexels.com/photos/37933313/pexels-photo-37933313.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", alt: "Phone accessories at M-TECH" }
  };
  var PAGE = { iPhone: "iphone.html", Samsung: "samsung.html", Redmi: "redmi.html", Laptops: "laptops.html", Accessories: "accessories.html" };

  function esc(v) {
    if (typeof escapeHTML === "function") return escapeHTML(v == null ? "" : v);
    return String(v == null ? "" : v).replace(/[&<>\"']/g, function (c) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]; });
  }
  function key(v) { return String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"); }

  function fixedCategories() {
    var source = Array.isArray(window.CATEGORIES) ? window.CATEGORIES : [];
    return OFFICIAL.map(function (name) {
      var found = source.find(function (c) { return String(c.name || "").toLowerCase() === name.toLowerCase(); }) || {};
      var meta = META[key(name)] || {};
      return {
        id: key(name),
        name: name,
        page: PAGE[name],
        blurb: found.blurb || ("Browse " + name + " products available from M-TECH."),
        image: found.image || meta.image,
        alt: found.alt || meta.alt
      };
    });
  }

  function renderFixedAdminCategories() {
    var grid = document.getElementById("cat-grid");
    if (!grid) return;
    var cats = fixedCategories();
    grid.innerHTML = cats.map(function (c) {
      return '<article class="card" style="padding:0;overflow:hidden">' +
        '<div class="thumb" style="aspect-ratio:16/10;background:var(--off)">' +
          '<img src="' + esc(c.image) + '" alt="' + esc(c.alt) + '" style="width:100%;height:100%;object-fit:cover" loading="lazy" decoding="async" onload="MTECH_IMG.ok(this)" onerror="MTECH_IMG.fail(this)">' +
        '</div>' +
        '<div style="padding:16px">' +
          '<span class="eyebrow">Permanent category</span>' +
          '<h3 style="font-size:1.1rem">' + esc(c.name) + '</h3>' +
          '<p class="small muted" style="margin:6px 0 0">' + esc(c.blurb) + '</p>' +
          '<p class="tiny muted" style="margin-top:10px">' + esc(c.page) + '</p>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  function lockCategoryControls() {
    var add = document.getElementById("btn-new-category");
    if (add) {
      add.style.display = "none";
      add.setAttribute("aria-hidden", "true");
    }
    var panel = document.getElementById("p-categories");
    if (panel) {
      var note = panel.querySelector(".lede");
      if (note) note.textContent = "These five categories are permanent storefront sections. Category creation and deletion are disabled.";
    }

    document.querySelectorAll("[data-del-cat], [data-edit-cat]").forEach(function (el) {
      el.remove();
    });

    /* Product forms may only assign products to an official category. */
    var catSelect = document.getElementById("f-cat");
    if (catSelect) {
      var current = catSelect.value;
      catSelect.innerHTML = OFFICIAL.map(function (name) {
        return '<option' + (current === name ? " selected" : "") + '>' + esc(name) + '</option>';
      }).join("");
      if (OFFICIAL.indexOf(current) === -1) catSelect.value = OFFICIAL[0];
    }
  }

  function enforce() {
    lockCategoryControls();
    if (document.getElementById("p-categories") && document.getElementById("p-categories").classList.contains("is-active")) {
      renderFixedAdminCategories();
    }
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("#btn-new-category")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    if (e.target.closest("[data-del-cat], [data-edit-cat]")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    enforce();
    var observer = window.MutationObserver ? new MutationObserver(function () { enforce(); }) : null;
    if (observer) {
      var grid = document.getElementById("cat-grid");
      if (grid) observer.observe(grid, { childList: true, subtree: true });
      var shell = document.getElementById("shell");
      if (shell) observer.observe(shell, { childList: true, subtree: true });
    }
  });
})();
