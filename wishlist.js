/* ==========================================================================
   M-TECH Premium Gadget Store — Wishlist, Recently Viewed & Light Analytics
   --------------------------------------------------------------------------
   - Wishlist lives in Firestore at users/{uid}/wishlist/{productId}
   - Recently viewed lives in localStorage (zero Firestore cost)
   - Product views / WhatsApp clicks are de-duplicated per browser session
   ========================================================================== */

var MTECH_WISHLIST = (function () {
  var currentUser = null;
  var savedIds = {};      // { productId: true }
  var isReady = false;

  /* ---------------------------------------------------------- rendering */
  function paintButton(btn, saved) {
    btn.innerHTML = saved ? "&#9829;" : "&#9825;";
    btn.style.color = saved ? "#e0245e" : "var(--ink-70)";
    btn.style.borderColor = saved ? "#e0245e" : "var(--line)";
    btn.style.background = saved ? "#fff" : "rgba(255,255,255,.92)";
    btn.setAttribute("aria-label", saved ? "Remove from saved gadgets" : "Save to saved gadgets");
    btn.setAttribute("aria-pressed", String(!!saved));
    btn.dataset.saved = saved ? "1" : "0";
  }

  function paintAll() {
    document.querySelectorAll(".js-wishlist-toggle").forEach(function (btn) {
      paintButton(btn, !!savedIds[btn.getAttribute("data-id")]);
    });
  }

  /* ------------------------------------------------------------- toast */
  function toast(message, isError) {
    var el = document.createElement("div");
    el.textContent = message;
    el.style.cssText =
      "position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:1100;" +
      "background:" + (isError ? "#95271f" : "var(--ink)") + ";color:#fff;padding:12px 20px;" +
      "border-radius:999px;font-size:.85rem;font-weight:600;box-shadow:var(--shadow-lg);" +
      "opacity:0;transition:opacity .25s ease,transform .25s ease;max-width:90vw;text-align:center";
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      el.style.opacity = "1";
      el.style.transform = "translateX(-50%) translateY(-6px)";
    });
    setTimeout(function () {
      el.style.opacity = "0";
      setTimeout(function () { el.remove(); }, 300);
    }, 2400);
  }

  /* ---------------------------------------------------------- load set */
  async function loadSavedIds(uid) {
    savedIds = {};
    if (!window.MTECH_CONFIG || !MTECH_CONFIG.isEnabled) return;
    try {
      var snap = await MTECH_CONFIG.db.collection("users").doc(uid).collection("wishlist").get();
      snap.forEach(function (doc) { savedIds[doc.id] = true; });
    } catch (e) {
      console.warn("Wishlist read skipped:", e.message);
    }
  }

  /* --------------------------------------------------------- delegate */
  document.addEventListener("click", async function (e) {
    var btn = e.target.closest(".js-wishlist-toggle");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    var productId = btn.getAttribute("data-id");

    if (!currentUser) {
      toast("Please log in to save gadgets.");
      setTimeout(function () {
        sessionStorage.setItem("mtech_redirect_after_login", window.location.pathname.split("/").pop());
        window.location.href = "login.html";
      }, 1200);
      return;
    }

    btn.disabled = true;
    try {
      var nowSaved = await MTECH_DB.toggleWishlist(currentUser.uid, productId);
      if (nowSaved) { savedIds[productId] = true; } else { delete savedIds[productId]; }
      paintButton(btn, nowSaved);
      toast(nowSaved ? "Saved to your gadgets." : "Removed from saved gadgets.");
    } catch (err) {
      toast("Could not update saved gadgets. Please try again.", true);
    }
    btn.disabled = false;
  });

  /* ---------------------------------------------- recently viewed (LS) */
  function pushRecentlyViewed(product) {
    if (!product) return;
    try {
      var key = "mtech_recently_viewed";
      var list = JSON.parse(localStorage.getItem(key) || "[]");
      list = list.filter(function (item) { return item.id !== product.id; });
      list.unshift({
        id: product.id,
        name: product.name,
        brand: product.brand,
        image: (typeof productImage === "function") ? productImage(product) : product.image
      });
      if (list.length > 10) list = list.slice(0, 10);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) { /* storage disabled — silently ignore */ }
  }

  function getRecentlyViewed() {
    try {
      return JSON.parse(localStorage.getItem("mtech_recently_viewed") || "[]");
    } catch (e) { return []; }
  }

  function renderRecentlyViewed(targetSelector) {
    var el = document.querySelector(targetSelector);
    if (!el) return;
    var list = getRecentlyViewed();
    var section = el.closest("section");

    if (!list.length) {
      if (section) section.style.display = "none";
      return;
    }
    if (section) section.style.display = "";

    var html = "";
    list.slice(0, 5).forEach(function (item) {
      html +=
        '<button type="button" class="card js-view" data-id="' + item.id + '" ' +
        'style="text-align:left;display:flex;gap:12px;align-items:center;padding:12px;cursor:pointer">' +
          '<span style="width:56px;height:56px;flex:none;border-radius:10px;overflow:hidden;background:var(--off);display:grid;place-items:center">' +
            '<img src="' + item.image + '" alt="' + escapeHTML(item.name) + '" ' +
            'style="width:100%;height:100%;object-fit:contain;padding:6px" loading="lazy" decoding="async">' +
          '</span>' +
          '<span>' +
            '<span class="p-brand" style="display:block">' + escapeHTML(item.brand) + '</span>' +
            '<span style="font-weight:700;font-size:.92rem">' + escapeHTML(item.name) + '</span>' +
          '</span>' +
        '</button>';
    });
    el.innerHTML = html;
  }

  /* ------------------------------------------------------------- init */
  function init() {
    if (window.MTECH_AUTH) {
      MTECH_AUTH.onAuthStateChanged(async function (user) {
        currentUser = user;
        if (user) {
          await loadSavedIds(user.uid);
        } else {
          savedIds = {};
        }
        isReady = true;
        paintAll();
      });
    }

    /* Re-paint whenever a grid re-renders */
    window.addEventListener("mtech-catalog-reload", function () {
      setTimeout(paintAll, 60);
    });

    /* Track WhatsApp enquiry clicks (does NOT delay the redirect) */
    document.addEventListener("click", function (e) {
      var link = e.target.closest("a[href*='wa.me']");
      if (!link) return;
      var card = link.closest(".product-card");
      var productId = card ? card.getAttribute("data-id") : null;
      if (productId && window.MTECH_DB) {
        var k = "mtech_wa_" + productId;
        if (!sessionStorage.getItem(k)) {
          sessionStorage.setItem(k, "1");
          MTECH_DB.logEnquiry(productId, "whatsapp_click");
        }
      }
    });

    /* Render the "Recently viewed" strip if the page has a slot for it */
    if (document.querySelector("[data-recently-viewed]")) {
      renderRecentlyViewed("[data-recently-viewed]");
    }
  }

  return {
    init: init,
    paintAll: paintAll,
    pushRecentlyViewed: pushRecentlyViewed,
    getRecentlyViewed: getRecentlyViewed,
    renderRecentlyViewed: renderRecentlyViewed,
    toast: toast,
    isSaved: function (id) { return !!savedIds[id]; }
  };
})();

document.addEventListener("DOMContentLoaded", function () {
  MTECH_WISHLIST.init();
});
