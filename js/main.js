/* M-TECH — load the Cloudinary/Firestore media bridge after Firebase DB + uploader are ready. */
(function () { if (!window.MTECH_CLOUDINARY_FIRESTORE_WIRED) document.write('<script src="/js/cloudinary-firestore.js"><\/script>'); })();

/* ==========================================================================
   M-TECH Premium Gadget Store — Main
   Boots navigation, live Firestore storefront data, product modal, FAQ,
   reveals and forms. Static product/category data remains the offline fallback.
   ========================================================================== */

window.MTECHUI = (function () {
  var revealObserver = null;
  function observeReveals(scope) {
    var nodes = (scope || document).querySelectorAll(".reveal:not(.is-in)");
    if (!("IntersectionObserver" in window)) { nodes.forEach(function (n) { n.classList.add("is-in"); }); return; }
    if (!revealObserver) revealObserver = new IntersectionObserver(function (entries) { entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add("is-in"); revealObserver.unobserve(entry.target); } }); }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    nodes.forEach(function (n) { revealObserver.observe(n); });
  }
  return { observeReveals: observeReveals };
})();

function initFAQ() {
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var btn = item.querySelector(".faq-q"), ans = item.querySelector(".faq-a"); if (!btn || !ans) return;
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function () {
      var open = item.classList.contains("is-open"), group = item.closest(".faq");
      if (group) group.querySelectorAll(".faq-item.is-open").forEach(function (other) { if (other !== item) { other.classList.remove("is-open"); other.querySelector(".faq-a").style.maxHeight = null; other.querySelector(".faq-q").setAttribute("aria-expanded", "false"); } });
      item.classList.toggle("is-open", !open); btn.setAttribute("aria-expanded", String(!open)); ans.style.maxHeight = open ? null : ans.scrollHeight + "px";
    });
  });
}

function initProductModal() {
  if (document.getElementById("product-modal")) return;
  var modal = document.createElement("div"); modal.className = "modal"; modal.id = "product-modal"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-labelledby", "product-modal-title");
  modal.innerHTML = '<div class="modal-backdrop" data-close></div><div class="modal-card"><button class="modal-close" type="button" data-close aria-label="Close product details">&times;</button><div class="modal-grid" id="product-modal-body"></div></div>';
  document.body.appendChild(modal);
  var lastFocus = null;
  function close() { modal.classList.remove("is-open"); document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
  modal.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close")) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("is-open")) close(); });
  window.openProductModal = function (id) {
    var p = getProduct(id); if (!p) return; lastFocus = document.activeElement;
    if (window.MTECH_DB && window.MTECH_CONFIG && MTECH_CONFIG.isEnabled) MTECH_DB.incrementProductViews(p.id);
    if (window.MTECH_WISHLIST) MTECH_WISHLIST.pushRecentlyViewed(p);
    var specs = (p.specs || []).map(function (s) { return "<div><span>" + escapeHTML(s[0]) + "</span><span>" + escapeHTML(s[1]) + "</span></div>"; }).join("");
    document.getElementById("product-modal-body").innerHTML = '<div class="thumb"><img src="' + productImage(p) + '" alt="' + escapeHTML(p.alt || p.name) + '" width="700" height="700" decoding="async" onload="MTECH_IMG.ok(this)" onerror="MTECH_IMG.fail(this)"></div><div class="modal-info"><span class="p-brand">' + escapeHTML(p.brand) + ' &middot; ' + escapeHTML(p.category) + '</span><h3 id="product-modal-title">' + escapeHTML(p.name) + '</h3><p class="muted">' + escapeHTML(p.long || p.description || "") + '</p><div class="spec-list">' + specs + (p.variants ? '<div><span>Variants</span><span>' + escapeHTML(p.variants) + '</span></div>' : '') + '<div><span>Availability</span><span>' + escapeHTML(p.availability || "Confirm on WhatsApp") + '</span></div><div><span>Price</span><span>On request &mdash; confirm on WhatsApp</span></div></div><div class="btn-row" style="margin-top:8px"><a class="btn btn--wa" href="' + waProductLink(p.name) + '" target="_blank" rel="noopener">' + waIconSVG() + 'Enquire on WhatsApp</a><a class="btn btn--ghost" href="buy-sell-swap.html">Swap towards this</a></div><p class="tiny muted" style="margin-top:14px">Photographs are representative of the model. Colours and included accessories vary by unit &mdash; confirm exact details with M-TECH before purchase.</p></div>';
    modal.classList.add("is-open"); document.body.style.overflow = "hidden"; modal.querySelector(".modal-close").focus();
  };
  document.addEventListener("click", function (e) { var btn = e.target.closest(".js-view"); if (btn) window.openProductModal(btn.getAttribute("data-id")); });
}

function renderLiveTestimonials(items) {
  var note = document.querySelector(".review-note");
  if (!note) return;
  var section = note.closest("section");
  var grid = section ? section.querySelector(".grid.g-3") : null;
  if (!grid) return;

  if (!Array.isArray(items) || !items.length) {
    grid.innerHTML = '<p class="muted" style="grid-column:1/-1">No approved customer testimonials yet.</p>';
    note.textContent = "Only approved customer testimonials are shown here.";
    return;
  }

  note.textContent = "Verified testimonials published by M-TECH.";
  grid.innerHTML = items.map(function (t, index) {
    var rating = Math.max(1, Math.min(5, Number(t.rating) || 5));
    var stars = Array.from({ length: 5 }, function (_, i) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true" style="opacity:' + (i < rating ? "1" : ".25") + '"><path d="M12 2l3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3 2 9.4l7-.9z"/></svg>';
    }).join("");
    var image = t.image || "";
    var imageMarkup = image
      ? '<img src="' + escapeHTML(image) + '" alt="' + escapeHTML((t.name || "Customer") + " testimonial") + '" width="88" height="88" loading="lazy" decoding="async" onload="MTECH_IMG.ok(this)" onerror="MTECH_IMG.fail(this)">' 
      : '<span class="review-avatar" aria-hidden="true">' + escapeHTML(String(t.name || "M").trim().charAt(0).toUpperCase()) + '</span>';
    return '<article class="review-card reveal"' + (index ? ' data-delay="' + Math.min(index, 3) + '"' : '') + '>' +
      '<div class="stars" aria-label="' + rating + ' out of 5 rating">' + stars + '</div>' +
      '<p>&ldquo;' + escapeHTML(t.review || t.message || "") + '&rdquo;</p>' +
      '<div class="reviewer">' + imageMarkup + '<span><b>' + escapeHTML(t.name || "M-TECH customer") + '</b><span>' + escapeHTML(t.product ? "Purchased " + t.product : "M-TECH customer") + '</span></span></div>' +
    '</article>';
  }).join("");
  window.MTECHUI.observeReveals(grid);
}

function renderLivePromotions(items) {
  var existing = document.getElementById("mtech-live-promotions");
  if (existing) existing.remove();
  if (!Array.isArray(items) || !items.length) return;

  var now = new Date();
  var live = items.filter(function (p) {
    if (!p || p.active !== true) return false;
    if (p.startDate && new Date(p.startDate) > now) return false;
    if (p.endDate && new Date(p.endDate + "T23:59:59") < now) return false;
    return true;
  });
  if (!live.length) return;

  var anchor = document.getElementById("shop") || document.querySelector("main > section");
  if (!anchor || !anchor.parentNode) return;
  var section = document.createElement("section");
  section.id = "mtech-live-promotions";
  section.className = "section section--ink";
  section.innerHTML = '<div class="container"><div class="section-head"><span class="eyebrow" style="color:rgba(255,255,255,.6)">M-TECH offers</span><h2 style="color:#fff">Current promotions.</h2><p class="lede" style="color:rgba(255,255,255,.72)">Live offers published from the M-TECH Admin Dashboard.</p></div><div class="grid g-3" data-promotion-grid></div></div>';
  anchor.parentNode.insertBefore(section, anchor);

  var grid = section.querySelector("[data-promotion-grid]");
  grid.innerHTML = live.map(function (p) {
    var image = p.image ? '<div class="frame" style="margin-bottom:16px"><img src="' + escapeHTML(p.image) + '" alt="' + escapeHTML(p.title || "M-TECH promotion") + '" loading="lazy" decoding="async" onload="MTECH_IMG.ok(this)" onerror="MTECH_IMG.fail(this)"></div>' : '';
    var cta = p.ctaLink ? '<a class="btn btn--light btn--sm" href="' + escapeHTML(p.ctaLink) + '">' + escapeHTML(p.ctaText || "Shop the deal") + '</a>' : '';
    return '<article class="card reveal" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14);color:#fff">' + image + '<h3>' + escapeHTML(p.title || "Promotion") + '</h3>' + (p.description ? '<p style="color:rgba(255,255,255,.72)">' + escapeHTML(p.description) + '</p>' : '') + (cta ? '<div class="btn-row" style="margin-top:16px">' + cta + '</div>' : '') + '</article>';
  }).join("");
  window.MTECHUI.observeReveals(section);
}

async function syncPublicFirestoreData() {
  if (!window.MTECH_CONFIG || !MTECH_CONFIG.isEnabled || !window.MTECH_DB) return;

  var db = MTECH_CONFIG.db;

  /* Products: use the exact public Firestore visibility rule. The query is
     intentionally allowed to return zero rows so deletions/drafts are also
     reflected publicly instead of silently falling back to stale static data. */
  try {
    var productSnap = await db.collection("products").where("status", "==", "published").get();
    var liveProducts = [];
    productSnap.forEach(function (doc) { liveProducts.push(Object.assign({ id: doc.id }, doc.data())); });
    if (Array.isArray(window.products)) {
      window.products.splice.apply(window.products, [0, window.products.length].concat(liveProducts));
    }
    window.dispatchEvent(new CustomEvent("mtech-catalog-reload"));
    document.querySelectorAll("[data-products]").forEach(function (el) {
      var ids = el.getAttribute("data-products").split(",").map(function (s) { return s.trim(); });
      renderProducts(el, ids.map(getProduct).filter(Boolean), { eager: false });
    });
    document.querySelectorAll("[data-featured]").forEach(function (el) {
      var limit = parseInt(el.getAttribute("data-featured"), 10) || 8;
      renderProducts(el, products.filter(function (p) { return p.featured; }).slice(0, limit));
    });
  } catch (error) {
    console.error("Public products could not be synchronized:", error);
  }

  /* Categories: same live categories collection used by Admin. */
  try {
    var categorySnap = await db.collection("categories").orderBy("displayOrder", "asc").get();
    var liveCategories = [];
    categorySnap.forEach(function (doc) { liveCategories.push(Object.assign({ id: doc.id }, doc.data())); });
    if (Array.isArray(window.CATEGORIES)) {
      window.CATEGORIES.splice.apply(window.CATEGORIES, [0, window.CATEGORIES.length].concat(liveCategories));
    }
    if (typeof renderCategories === "function" && document.querySelector("[data-categories]")) renderCategories("[data-categories]");
  } catch (error) {
    console.error("Public categories could not be synchronized:", error);
  }

  /* Testimonials: only approved Firestore records are public. */
  try {
    var testimonialSnap = await db.collection("testimonials").where("status", "==", "approved").get();
    var testimonials = [];
    testimonialSnap.forEach(function (doc) { testimonials.push(Object.assign({ id: doc.id }, doc.data())); });
    renderLiveTestimonials(testimonials);
  } catch (error) {
    console.error("Public testimonials could not be synchronized:", error);
  }

  /* Promotions: public read is limited by the Firestore rule to active records;
     dates are additionally checked client-side so expired/scheduled offers stay
     out of the public storefront. */
  try {
    var promoSnap = await db.collection("promotions").where("active", "==", true).get();
    var promotions = [];
    promoSnap.forEach(function (doc) { promotions.push(Object.assign({ id: doc.id }, doc.data())); });
    renderLivePromotions(promotions);
  } catch (error) {
    console.error("Public promotions could not be synchronized:", error);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initNavigation(); initProductModal(); initFAQ();
  if (typeof initForms === "function") initForms();
  if (document.querySelector("[data-categories]")) renderCategories("[data-categories]");
  document.querySelectorAll("[data-catalog]").forEach(function (block) { initCatalog(block); });
  document.querySelectorAll("[data-products]").forEach(function (el) { var ids = el.getAttribute("data-products").split(",").map(function (s) { return s.trim(); }); var list = ids.map(getProduct).filter(Boolean); renderProducts(el, list, { eager: false }); });
  document.querySelectorAll("[data-featured]").forEach(function (el) { var limit = parseInt(el.getAttribute("data-featured"), 10) || 8; renderProducts(el, products.filter(function (p) { return p.featured; }).slice(0, limit)); });
  initWhatsAppLinks(document); window.MTECHUI.observeReveals(document);
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  document.querySelectorAll(".thumb img, .frame img").forEach(function (img) { if (img.complete && img.naturalWidth > 0) MTECH_IMG.ok(img); });

  /* The initial render above is the offline/static fallback. This live sync
     then replaces it with the exact current Firestore records, so Admin CRUD
     changes propagate to the public site on the next page load. */
  syncPublicFirestoreData();
});
