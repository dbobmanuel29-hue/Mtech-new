/* ==========================================================================
   M-TECH Premium Gadget Store — Main
   Boots navigation, catalogs, product modal, FAQ accordions, reveals, forms.
   ========================================================================== */

window.MTECHUI = (function () {
  var revealObserver = null;

  function observeReveals(scope) {
    var nodes = (scope || document).querySelectorAll(".reveal:not(.is-in)");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    }
    nodes.forEach(function (n) { revealObserver.observe(n); });
  }

  return { observeReveals: observeReveals };
})();

/* ------------------------------------------------------------ FAQ ----- */
function initFAQ() {
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var btn = item.querySelector(".faq-q");
    var ans = item.querySelector(".faq-a");
    if (!btn || !ans) return;
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function () {
      var open = item.classList.contains("is-open");
      var group = item.closest(".faq");
      if (group) {
        group.querySelectorAll(".faq-item.is-open").forEach(function (other) {
          if (other !== item) {
            other.classList.remove("is-open");
            other.querySelector(".faq-a").style.maxHeight = null;
            other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
          }
        });
      }
      item.classList.toggle("is-open", !open);
      btn.setAttribute("aria-expanded", String(!open));
      ans.style.maxHeight = open ? null : ans.scrollHeight + "px";
    });
  });
}

/* -------------------------------------------------- product modal ----- */
function initProductModal() {
  if (document.getElementById("product-modal")) return;
  var modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "product-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "product-modal-title");
  modal.innerHTML =
    '<div class="modal-backdrop" data-close></div>' +
    '<div class="modal-card">' +
      '<button class="modal-close" type="button" data-close aria-label="Close product details">&times;</button>' +
      '<div class="modal-grid" id="product-modal-body"></div>' +
    '</div>';
  document.body.appendChild(modal);

  var lastFocus = null;

  function close() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  modal.addEventListener("click", function (e) {
    if (e.target.hasAttribute("data-close")) close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });

  window.openProductModal = function (id) {
    var p = getProduct(id);
    if (!p) return;
    lastFocus = document.activeElement;

    /* lightweight analytics + recently viewed (session de-duplicated) */
    if (window.MTECH_DB && window.MTECH_CONFIG && MTECH_CONFIG.isEnabled) {
      MTECH_DB.incrementProductViews(p.id);
    }
    if (window.MTECH_WISHLIST) {
      MTECH_WISHLIST.pushRecentlyViewed(p);
    }
    var specs = (p.specs || []).map(function (s) {
      return "<div><span>" + escapeHTML(s[0]) + "</span><span>" + escapeHTML(s[1]) + "</span></div>";
    }).join("");
    document.getElementById("product-modal-body").innerHTML =
      '<div class="thumb">' +
        '<img src="' + productImage(p) + '" alt="' + escapeHTML(p.alt) + '" width="700" height="700" decoding="async" onload="MTECH_IMG.ok(this)" onerror="MTECH_IMG.fail(this)">' +
      '</div>' +
      '<div class="modal-info">' +
        '<span class="p-brand">' + escapeHTML(p.brand) + ' &middot; ' + escapeHTML(p.category) + '</span>' +
        '<h3 id="product-modal-title">' + escapeHTML(p.name) + '</h3>' +
        '<p class="muted">' + escapeHTML(p.long || p.description) + '</p>' +
        '<div class="spec-list">' + specs +
          (p.variants ? '<div><span>Variants</span><span>' + escapeHTML(p.variants) + '</span></div>' : '') +
          '<div><span>Availability</span><span>' + escapeHTML(p.availability) + '</span></div>' +
          '<div><span>Price</span><span>On request &mdash; confirm on WhatsApp</span></div>' +
        '</div>' +
        '<div class="btn-row" style="margin-top:8px">' +
          '<a class="btn btn--wa" href="' + waProductLink(p.name) + '" target="_blank" rel="noopener">' + waIconSVG() + 'Enquire on WhatsApp</a>' +
          '<a class="btn btn--ghost" href="buy-sell-swap.html">Swap towards this</a>' +
        '</div>' +
        '<p class="tiny muted" style="margin-top:14px">Photographs are representative of the model. Colours and included accessories vary by unit &mdash; confirm exact details with M-TECH before purchase.</p>' +
      '</div>';
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    modal.querySelector(".modal-close").focus();
  };

  /* delegated: any "View details" button anywhere on the page */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".js-view");
    if (!btn) return;
    window.openProductModal(btn.getAttribute("data-id"));
  });
}

/* ------------------------------------------------------ page boot ----- */
document.addEventListener("DOMContentLoaded", function () {
  initNavigation();
  initProductModal();
  initFAQ();

  /* Forms are a page-level dependency. Product/account/login pages can load
     main.js without loading forms.js, so never crash the rest of the page
     boot when the optional form module is intentionally absent. On pages that
     include forms.js, initForms remains the original initializer and all form
     behaviour is preserved. */
  if (typeof initForms === "function") {
    initForms();
  }

  /* categories grid (homepage) */
  if (document.querySelector("[data-categories]")) renderCategories("[data-categories]");

  /* every catalog block on the page */
  document.querySelectorAll("[data-catalog]").forEach(function (block) { initCatalog(block); });

  /* static product strips: <div data-products="iphone-16,iphone-17"> */
  document.querySelectorAll("[data-products]").forEach(function (el) {
    var ids = el.getAttribute("data-products").split(",").map(function (s) { return s.trim(); });
    var list = ids.map(getProduct).filter(Boolean);
    renderProducts(el, list, { eager: false });
  });

  /* featured / popular picks */
  document.querySelectorAll("[data-featured]").forEach(function (el) {
    var limit = parseInt(el.getAttribute("data-featured"), 10) || 8;
    renderProducts(el, products.filter(function (p) { return p.featured; }).slice(0, limit));
  });

  initWhatsAppLinks(document);
  window.MTECHUI.observeReveals(document);

  /* current year in footers */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* images already in the HTML: mark loaded so the shimmer clears */
  document.querySelectorAll(".thumb img, .frame img").forEach(function (img) {
    if (img.complete && img.naturalWidth > 0) MTECH_IMG.ok(img);
  });
});