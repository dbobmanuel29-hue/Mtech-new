/* ==========================================================================
   M-TECH Premium Gadget Store — Admin Dashboard Controller
   --------------------------------------------------------------------------
   Access is gated twice:
     1. Client gate below (UX)
     2. Firestore Security Rules (real enforcement — see firestore.rules)
   ========================================================================== */

(function () {
  "use strict";

  var ADMIN = { user: null, products: [], categories: [], page: 1, perPage: 20 };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return (typeof escapeHTML === "function") ? escapeHTML(s == null ? "" : s) : String(s == null ? "" : s); };

  function money(v) {
    if (v === "" || v == null || isNaN(Number(v))) return "On request";
    return "\u20A6 " + Number(v).toLocaleString();
  }
  function fmtDate(ts) {
    if (!ts) return "—";
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function slugify(s) {
    return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function waLinkFor(phone, message) {
    var digits = String(phone || "").replace(/[^0-9]/g, "");
    if (digits.startsWith("0")) digits = "234" + digits.slice(1);
    if (!digits.startsWith("234")) digits = "234" + digits;
    return "https://wa.me/" + digits + "?text=" + encodeURIComponent(message);
  }

  /* ------------------------------------------------------------- drawer */
  var drawer = $("drawer");
  function openDrawer(title, html) {
    $("drawer-title").textContent = title;
    $("drawer-content").innerHTML = html;
    drawer.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    drawer.classList.remove("is-open");
    document.body.style.overflow = "";
    $("drawer-content").innerHTML = "";
  }
  document.addEventListener("click", function (e) {
    if (e.target.hasAttribute("data-drawer-close")) closeDrawer();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
  });

  function toast(msg, isError) {
    if (window.MTECH_WISHLIST) return MTECH_WISHLIST.toast(msg, isError);
    var el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText = "position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:1200;background:" +
      (isError ? "#95271f" : "var(--ink)") + ";color:#fff;padding:12px 20px;border-radius:999px;font-size:.85rem;font-weight:600";
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  /* ------------------------------------------------------- access gate */
  function showDenied(title, msg) {
    $("gate-title").textContent = title;
    $("gate-msg").textContent = msg;
    $("gate-actions").style.display = "flex";
  }

  function boot(user) {
    ADMIN.user = user;
    $("gate").style.display = "none";
    $("shell").style.display = "grid";
    $("admin-who").textContent = "Signed in as " + (user.name || user.email) + " · Administrator";
    if (typeof initWhatsAppLinks === "function") initWhatsAppLinks(document);

    loadOverview();
    loadProducts();
    loadCategories();
    loadSellRequests();
    loadSwapRequests();
    loadEnquiries();
    loadTestimonials();
    loadPromotions();
    loadSettings();
    watchNotifications();
  }

  /* Admin core is loaded dynamically by js/admin.js. If we wait only for
     DOMContentLoaded here, that event may already have fired before this
     module is inserted, leaving the access gate stuck forever. */
  function initAdminAccessGate() {
    if (window.__MTECH_ADMIN_ACCESS_GATE_INITIALIZED) return;
    window.__MTECH_ADMIN_ACCESS_GATE_INITIALIZED = true;

    if (!window.MTECH_CONFIG || !MTECH_CONFIG.isEnabled) {
      showDenied(
        "Firebase is not configured yet",
        "Add your Firebase credentials in js/firebase-config.js, then create your admin account and set role to \"admin\" in the Firestore console."
      );
      return;
    }

    if (!window.MTECH_AUTH || typeof MTECH_AUTH.onAuthStateChanged !== "function") {
      window.__MTECH_ADMIN_ACCESS_GATE_INITIALIZED = false;
      setTimeout(initAdminAccessGate, 50);
      return;
    }

    MTECH_AUTH.onAuthStateChanged(function (user) {
      if (!user) {
        showDenied("You need to sign in", "Log in with an M-TECH administrator account to open this dashboard.");
        return;
      }
      if (user.role !== "admin") {
        showDenied("You don't have permission to access this page", "This area is restricted to M-TECH administrators. If you believe this is a mistake, contact the store owner.");
        return;
      }
      boot(user);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminAccessGate, { once: true });
  } else {
    initAdminAccessGate();
  }

  /* -------------------------------------------------------- navigation */
  document.addEventListener("click", function (e) {
    var link = e.target.closest(".side-link[data-panel]");
    if (!link) return;
    document.querySelectorAll(".side-link").forEach(function (l) { l.classList.remove("is-active"); });
    link.classList.add("is-active");
    document.querySelectorAll(".admin-panel").forEach(function (p) { p.classList.remove("is-active"); });
    var panel = $(link.getAttribute("data-panel"));
    if (panel) panel.classList.add("is-active");
    $("panel-title").textContent = link.textContent.trim().replace(/\d+$/, "").trim();
    if (window.innerWidth <= 900) $("side").classList.remove("is-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.addEventListener("click", function (e) {
    if (e.target.closest("#burger")) $("side").classList.toggle("is-open");
    else if (!e.target.closest("#side") && window.innerWidth <= 900) $("side").classList.remove("is-open");
  });

  document.addEventListener("click", function (e) {
    if (e.target.closest(".js-logout")) {
      e.preventDefault();
      MTECH_AUTH.logOut().then(function () { window.location.href = "index.html"; });
    }
  });

  /* ----------------------------------------------------- Firestore reads */
  async function readAdminCollection(name) {
    var ref = MTECH_CONFIG.db.collection(name);
    var lastError = null;

    // Prefer the backend so the admin does not mistake an old empty cache for
    // the database. If the backend is temporarily unavailable, fall back to
    // the SDK's normal read behaviour rather than blanking the entire console.
    try {
      return await ref.get({ source: "server" });
    } catch (err) {
      lastError = err;
      console.warn("[M-TECH ADMIN] Server read failed for " + name + ", retrying:", err && err.code, err && err.message);
      try {
        return await ref.get();
      } catch (fallbackErr) {
        fallbackErr.mtechPreviousError = lastError;
        throw fallbackErr;
      }
    }
  }

  function setStat(id, value) {
    var el = $(id);
    if (el) el.textContent = String(value);
  }

  /* ---------------------------------------------------------- overview */
  async function loadOverview() {
    // Each dashboard metric is loaded independently. One unavailable collection
    // must never leave products, users and every other card stuck at "—".
    var names = ["products", "sellRequests", "swapRequests", "enquiries", "users"];
    var results = await Promise.allSettled(names.map(readAdminCollection));

    var byName = {};
    names.forEach(function (name, index) {
      byName[name] = results[index];
      if (results[index].status === "rejected") {
        console.error("[M-TECH ADMIN] Could not load " + name + ":", results[index].reason);
      }
    });

    var productList = [];
    if (byName.products.status === "fulfilled") {
      byName.products.value.forEach(function (d) {
        productList.push(Object.assign({ id: d.id }, d.data()));
      });
    }

    setStat("s-total", productList.length);
    setStat("s-avail", productList.filter(function (p) {
      return p.availability !== "Out of stock" && (p.status || "published") === "published";
    }).length);
    setStat("s-out", productList.filter(function (p) {
      return p.status === "out_of_stock" || p.availability === "Out of stock";
    }).length);
    setStat("s-feat", productList.filter(function (p) { return p.featured; }).length);
    setStat("c-products", productList.length);

    function countWhere(name, predicate) {
      if (!byName[name] || byName[name].status !== "fulfilled") return 0;
      var count = 0;
      byName[name].value.forEach(function (d) { if (predicate(d.data())) count++; });
      return count;
    }

    var sellCount = countWhere("sellRequests", function (d) { return d.status === "new"; });
    var swapCount = countWhere("swapRequests", function (d) { return d.status === "new"; });
    var enqCount = byName.enquiries && byName.enquiries.status === "fulfilled" ? byName.enquiries.value.size : 0;
    var userCount = byName.users && byName.users.status === "fulfilled" ? byName.users.value.size : 0;

    setStat("s-sell", sellCount);
    setStat("s-swap", swapCount);
    setStat("s-enq", enqCount);
    setStat("s-users", userCount);
    setStat("c-sell", sellCount);
    setStat("c-swap", swapCount);
    setStat("c-enq", enqCount);

    var viewed = productList.slice().sort(function (a, b) { return (b.views || 0) - (a.views || 0); }).slice(0, 5);
    $("top-viewed").innerHTML = viewed.length
      ? viewed.map(function (p) {
          return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)"><span>' +
            esc(p.name) + '</span><b>' + (p.views || 0) + ' views</b></div>';
        }).join("")
      : '<p class="muted">No view data yet.</p>';

    var clicked = productList.slice().sort(function (a, b) { return (b.whatsappClicks || 0) - (a.whatsappClicks || 0); }).slice(0, 5);
    $("top-clicked").innerHTML = clicked.length
      ? clicked.map(function (p) {
          return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)"><span>' +
            esc(p.name) + '</span><b>' + (p.whatsappClicks || 0) + ' clicks</b></div>';
        }).join("")
      : '<p class="muted">No enquiry data yet.</p>';
  }

  /* ---------------------------------------------------------- products */
  async function loadProducts() {
    try {
      var snap = await readAdminCollection("products");
      ADMIN.products = [];
      snap.forEach(function (d) { ADMIN.products.push(Object.assign({ id: d.id }, d.data())); });
      ADMIN.page = 1;
      renderProducts();
      setStat("c-products", ADMIN.products.length);
      console.log("[M-TECH ADMIN] Loaded " + ADMIN.products.length + " products from Firestore.");
    } catch (err) {
      console.error("[M-TECH ADMIN] Product loader failed:", err);
      $("prod-tbody").innerHTML = '<tr><td colspan="6" style="padding:30px;text-align:center;color:#95271f">Could not load products: ' + esc((err.code ? err.code + " — " : "") + err.message) + '</td></tr>';
    }
  }

  function filteredProducts() {
    var q = ($("adm-search").value || "").toLowerCase().trim();
    var cat = $("adm-filter-cat").value;
    var st = $("adm-filter-status").value;
    return ADMIN.products.filter(function (p) {
      if (cat !== "all" && p.category !== cat) return false;
      if (st !== "all" && (p.status || "published") !== st) return false;
      if (!q) return true;
      return (p.name + " " + p.brand + " " + (p.description || "")).toLowerCase().indexOf(q) > -1;
    });
  }

  function renderProducts() {
    var list = filteredProducts();
    var shown = list.slice(0, ADMIN.page * ADMIN.perPage);
    $("prod-count").textContent = list.length;

    if (!shown.length) {
      $("prod-tbody").innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center" class="muted">No products found. Try changing your search or filters.</td></tr>';
      $("load-more-products").style.display = "none";
      return;
    }

    $("prod-tbody").innerHTML = shown.map(function (p) {
      var img = p.thumbnail || (p.images && p.images[0]) || p.image || "";
      var status = p.status || "published";
      var flags = [];
      if (p.featured) flags.push("Featured");
      if (p.isNew) flags.push("New");
      if (p.isPopular) flags.push("Popular");
      return '<tr>' +
        '<td><div style="display:flex;align-items:center;gap:12px">' +
          (img ? '<img class="adm-thumb" src="' + img + '" alt="">' : '<span class="adm-thumb"></span>') +
          '<div><b style="display:block">' + esc(p.name) + '</b><span class="tiny muted">' + esc(p.brand) + '</span></div>' +
        '</div></td>' +
        '<td>' + esc(p.category) + '</td>' +
        '<td>' + money(p.price) + '</td>' +
        '<td><span class="pill-status s-' + status + '">' + status.replace(/_/g, " ") + '</span></td>' +
        '<td class="tiny muted">' + (flags.join(", ") || "—") + '</td>' +
        '<td style="text-align:right;white-space:nowrap">' +
          '<button class="icon-btn" data-edit-product="' + p.id + '">Edit</button> ' +
          '<button class="icon-btn" data-dup-product="' + p.id + '">Duplicate</button> ' +
          '<button class="icon-btn danger" data-del-product="' + p.id + '">Delete</button>' +
        '</td>' +
      '</tr>';
    }).join("");

    $("load-more-products").style.display = list.length > shown.length ? "inline-flex" : "none";
  }

  ["adm-search", "adm-filter-cat", "adm-filter-status"].forEach(function (id) {
    document.addEventListener("input", function (e) { if (e.target.id === id) { ADMIN.page = 1; renderProducts(); } });
    document.addEventListener("change", function (e) { if (e.target.id === id) { ADMIN.page = 1; renderProducts(); } });
  });
  document.addEventListener("click", function (e) {
    if (e.target.id === "load-more-products") { ADMIN.page++; renderProducts(); }
  });

  /* ------------------------------------------------- product edit form */
  function productForm(p) {
    p = p || {};
    var specs = p.specs || p.specifications || [];
    var specRows = specs.map(function (s, i) {
      return '<div class="spec-row" data-spec-row>' +
        '<input type="text" class="spec-key" placeholder="Label (e.g. Display)" value="' + esc(s[0]) + '">' +
        '<input type="text" class="spec-val" placeholder="Value (e.g. 6.7-inch OLED)" value="' + esc(s[1]) + '">' +
        '<button type="button" class="icon-btn danger" data-remove-spec>&times;</button>' +
      '</div>';
    }).join("");

    return '' +
    '<form id="product-form" novalidate>' +
      '<p class="side-group" style="color:var(--grey);margin:0 0 10px">Basic information</p>' +
      '<div class="form-grid">' +
        '<div class="field full"><label for="f-name">Product name *</label><input id="f-name" type="text" required value="' + esc(p.name) + '" placeholder="e.g. iPhone 17 Pro Max"></div>' +
        '<div class="field"><label for="f-brand">Brand *</label><input id="f-brand" type="text" required value="' + esc(p.brand) + '" placeholder="Apple / Samsung / Xiaomi Redmi"></div>' +
        '<div class="field"><label for="f-cat">Category *</label><select id="f-cat" required>' +
          ["iPhone", "Samsung", "Redmi", "Laptops", "Accessories", "Other Gadgets"].map(function (c) {
            return '<option' + (p.category === c ? " selected" : "") + '>' + c + '</option>';
          }).join("") +
        '</select></div>' +
        '<div class="field full"><label for="f-desc">Short description *</label><textarea id="f-desc" required placeholder="One clear sentence for the product card.">' + esc(p.description) + '</textarea></div>' +
        '<div class="field full"><label for="f-long">Full description</label><textarea id="f-long" placeholder="Longer copy shown in the product modal.">' + esc(p.long) + '</textarea></div>' +
      '</div>' +

      '<p class="side-group" style="color:var(--grey);margin:22px 0 10px">Pricing</p>' +
      '<div class="form-grid">' +
        '<div class="field"><label for="f-price">Price (NGN)</label><input id="f-price" type="number" min="0" step="1" value="' + esc(p.price) + '" placeholder="Leave blank for contact-for-price"></div>' +
        '<div class="field"><label for="f-oprice">Original price (NGN)</label><input id="f-oprice" type="number" min="0" step="1" value="' + esc(p.originalPrice) + '" placeholder="Shows a strike-through"></div>' +
        '<div class="field full"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="f-contact" style="width:auto"' + (p.price ? "" : " checked") + '> Contact for price (hide figure publicly)</label></div>' +
      '</div>' +

      '<p class="side-group" style="color:var(--grey);margin:22px 0 10px">Specifications</p>' +
      '<div class="field"><label for="f-variants">Variants / storage line</label><input id="f-variants" type="text" value="' + esc(p.variants) + '" placeholder="256GB · 512GB · 1TB (subject to stock)"></div>' +
      '<div id="spec-list" style="margin-top:12px">' + specRows + '</div>' +
      '<button type="button" class="icon-btn" id="add-spec" style="margin-top:6px">+ Add specification field</button>' +

      '<p class="side-group" style="color:var(--grey);margin:22px 0 10px">Inventory &amp; visibility</p>' +
      '<div class="form-grid">' +
        '<div class="field"><label for="f-status">Status</label><select id="f-status">' +
          [["published","Published"],["draft","Draft"],["limited_stock","Limited stock"],["out_of_stock","Out of stock"],["coming_soon","Coming soon"]].map(function (s) {
            return '<option value="' + s[0] + '"' + ((p.status || "published") === s[0] ? " selected" : "") + '>' + s[1] + '</option>';
          }).join("") +
        '</select></div>' +
        '<div class="field"><label for="f-stock">Stock quantity</label><input id="f-stock" type="number" min="0" value="' + esc(p.stockQuantity == null ? "" : p.stockQuantity) + '"></div>' +
        '<div class="field full"><label for="f-avail">Availability text (public)</label><input id="f-avail" type="text" value="' + esc(p.availability || "Ask on WhatsApp for today\u2019s stock") + '"></div>' +
        '<div class="field"><label for="f-badge">Badge label</label><input id="f-badge" type="text" value="' + esc(p.badge) + '" placeholder="e.g. Flagship"></div>' +
        '<div class="field"><label for="f-tags">Tags (comma separated)</label><input id="f-tags" type="text" value="' + esc((p.tags || []).join(", ")) + '"></div>' +
        '<div class="field full" style="display:flex;gap:20px;flex-wrap:wrap">' +
          '<label style="display:flex;align-items:center;gap:7px;cursor:pointer"><input type="checkbox" id="f-featured" style="width:auto"' + (p.featured ? " checked" : "") + '> Featured</label>' +
          '<label style="display:flex;align-items:center;gap:7px;cursor:pointer"><input type="checkbox" id="f-isnew" style="width:auto"' + (p.isNew ? " checked" : "") + '> New</label>' +
          '<label style="display:flex;align-items:center;gap:7px;cursor:pointer"><input type="checkbox" id="f-popular" style="width:auto"' + (p.isPopular ? " checked" : "") + '> Popular</label>' +
          '<label style="display:flex;align-items:center;gap:7px;cursor:pointer"><input type="checkbox" id="f-showstock" style="width:auto"' + (p.showStockQuantity ? " checked" : "") + '> Show stock publicly</label>' +
        '</div>' +
      '</div>' +

      '<p class="side-group" style="color:var(--grey);margin:22px 0 10px">Product images</p>' +
      '<div id="product-uploader"></div>' +
      '<p class="tiny muted" style="margin-top:8px">Select images from your phone gallery, camera or computer. The first image (marked MAIN) becomes the thumbnail. Cloudinary URLs are saved automatically — you never paste a link.</p>' +

      '<p class="form-status" id="prod-form-status"></p>' +
      '<div class="btn-row">' +
        '<button class="btn btn--dark" type="submit" id="save-prod-btn">' + (p.id ? "Save changes" : "Create product") + '</button>' +
        '<button class="btn btn--ghost" type="button" data-drawer-close>Cancel</button>' +
      '</div>' +
    '</form>';
  }

  function wireProductForm(existing) {
    existing = existing || {};
    var uploader = MTECH_CLOUDINARY.createUploader("product-uploader", { folder: "m-tech/products", maxFiles: 8 });
    var existingImages = existing.images && existing.images.length
      ? existing.images
      : (existing.image ? [existing.image] : []);
    if (existingImages.length) uploader.setFiles(existingImages);

    $("add-spec").addEventListener("click", function () {
      $("spec-list").insertAdjacentHTML("beforeend",
        '<div class="spec-row" data-spec-row>' +
          '<input type="text" class="spec-key" placeholder="Label"><input type="text" class="spec-val" placeholder="Value">' +
          '<button type="button" class="icon-btn danger" data-remove-spec>&times;</button>' +
        '</div>');
    });
    $("spec-list").addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-remove-spec")) e.target.closest("[data-spec-row]").remove();
    });

    $("product-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var form = e.target;
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var btn = $("save-prod-btn");
      var status = $("prod-form-status");
      btn.disabled = true;
      status.className = "form-status is-visible";
      status.textContent = "Uploading images…";

      try {
        var urls = await uploader.uploadAll();
        if (uploader.hasErrors()) throw new Error("Some images failed to upload. Retry or remove them, then save again.");

        status.textContent = "Saving product…";

        var specs = [];
        $("spec-list").querySelectorAll("[data-spec-row]").forEach(function (row) {
          var k = row.querySelector(".spec-key").value.trim();
          var v = row.querySelector(".spec-val").value.trim();
          if (k && v) specs.push([k, v]);
        });

        var contactForPrice = $("f-contact").checked;
        var name = $("f-name").value.trim();
        var id = existing.id || slugify(name) || ("product-" + Date.now());
        var thumb = uploader.getThumbnail() || urls[0] || existing.thumbnail || "";

        var data = {
          id: id,
          name: name,
          slug: slugify(name),
          brand: $("f-brand").value.trim(),
          category: $("f-cat").value,
          categoryName: $("f-cat").value,
          description: $("f-desc").value.trim(),
          long: $("f-long").value.trim(),
          price: contactForPrice ? "" : ($("f-price").value || ""),
          originalPrice: $("f-oprice").value || "",
          priceDisplay: contactForPrice ? "Contact for price" : money($("f-price").value),
          currency: "NGN",
          images: urls,
          image: thumb,
          thumbnail: thumb,
          localImage: existing.localImage || "",
          alt: name + " product photograph at M-TECH Port Harcourt",
          specs: specs,
          variants: $("f-variants").value.trim(),
          availability: $("f-avail").value.trim(),
          status: $("f-status").value,
          stockQuantity: $("f-stock").value === "" ? null : Number($("f-stock").value),
          showStockQuantity: $("f-showstock").checked,
          badge: $("f-badge").value.trim(),
          tags: $("f-tags").value.split(",").map(function (t) { return t.trim().toLowerCase(); }).filter(Boolean),
          featured: $("f-featured").checked,
          isNew: $("f-isnew").checked,
          isPopular: $("f-popular").checked,
          views: existing.views || 0,
          whatsappClicks: existing.whatsappClicks || 0,
          createdBy: ADMIN.user.uid
        };
        if (!existing.id) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();

        await MTECH_DB.saveProduct(id, data);
        closeDrawer();
        toast(existing.id ? "Product updated." : "Product created.");
        loadProducts();
        loadOverview();
      } catch (err) {
        btn.disabled = false;
        status.className = "form-status is-visible is-error";
        status.textContent = err.message;
      }
    });
  }

  document.addEventListener("click", function (e) {
    var newBtn = e.target.closest("#btn-new-product");
    if (newBtn) { openDrawer("Add product", productForm({})); wireProductForm({}); return; }

    var editId = e.target.closest("[data-edit-product]");
    if (editId) {
      var p = ADMIN.products.find(function (x) { return x.id === editId.getAttribute("data-edit-product"); });
      if (p) { openDrawer("Edit product", productForm(p)); wireProductForm(p); }
      return;
    }

    var dupId = e.target.closest("[data-dup-product]");
    if (dupId) {
      var src = ADMIN.products.find(function (x) { return x.id === dupId.getAttribute("data-dup-product"); });
      if (src) {
        var copy = Object.assign({}, src);
        delete copy.id;
        copy.name = src.name + " (copy)";
        openDrawer("Duplicate product", productForm(copy));
        wireProductForm({ images: src.images, localImage: src.localImage });
      }
      return;
    }

    var delId = e.target.closest("[data-del-product]");
    if (delId) {
      var pid = delId.getAttribute("data-del-product");
      if (!confirm("Delete this product permanently? This cannot be undone.")) return;
      MTECH_DB.deleteProduct(pid).then(function () {
        toast("Product deleted.");
        loadProducts(); loadOverview();
      }).catch(function (err) { toast(err.message, true); });
    }
  });

  /* -------------------------------------------------------- categories */
  async function loadCategories() {
    try {
      ADMIN.categories = await MTECH_DB.getCategories();
      $("cat-grid").innerHTML = ADMIN.categories.map(function (c) {
        return '<div class="card" style="padding:0;overflow:hidden">' +
          '<div class="thumb" style="aspect-ratio:16/10;background:var(--off)">' +
            (c.image ? '<img src="' + c.image + '" alt="" style="width:100%;height:100%;object-fit:cover">' : '') +
          '</div>' +
          '<div style="padding:16px">' +
            '<h3 style="font-size:1.1rem">' + esc(c.name) + '</h3>' +
            '<p class="small muted" style="margin:6px 0 12px">' + esc(c.blurb) + '</p>' +
            '<button class="icon-btn" data-edit-cat="' + c.id + '">Edit</button> ' +
            '<button class="icon-btn danger" data-del-cat="' + c.id + '">Delete</button>' +
          '</div>' +
        '</div>';
      }).join("") || '<p class="muted">No categories yet.</p>';
    } catch (err) {
      $("cat-grid").innerHTML = '<p style="color:#95271f">' + esc(err.message) + '</p>';
    }
  }

  function categoryForm(c) {
    c = c || {};
    return '<form id="cat-form" novalidate>' +
      '<div class="form-grid">' +
        '<div class="field full"><label for="c-name">Category name *</label><input id="c-name" type="text" required value="' + esc(c.name) + '"></div>' +
        '<div class="field full"><label for="c-blurb">Short blurb</label><textarea id="c-blurb">' + esc(c.blurb) + '</textarea></div>' +
        '<div class="field"><label for="c-page">Links to page</label><input id="c-page" type="text" value="' + esc(c.page || "index.html#shop") + '"></div>' +
        '<div class="field"><label for="c-order">Display order</label><input id="c-order" type="number" min="0" value="' + esc(c.displayOrder == null ? 0 : c.displayOrder) + '"></div>' +
      '</div>' +
      '<p class="side-group" style="color:var(--grey);margin:20px 0 10px">Category image</p>' +
      '<div id="cat-uploader"></div>' +
      '<p class="form-status" id="cat-status"></p>' +
      '<div class="btn-row"><button class="btn btn--dark" type="submit" id="save-cat-btn">Save category</button>' +
      '<button class="btn btn--ghost" type="button" data-drawer-close>Cancel</button></div>' +
    '</form>';
  }

  function wireCategoryForm(existing) {
    existing = existing || {};
    var up = MTECH_CLOUDINARY.createUploader("cat-uploader", { folder: "m-tech/categories", maxFiles: 1 });
    if (existing.image) up.setFiles([existing.image]);

    $("cat-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!e.target.checkValidity()) { e.target.reportValidity(); return; }
      var btn = $("save-cat-btn"), status = $("cat-status");
      btn.disabled = true;
      status.className = "form-status is-visible";
      status.textContent = "Saving…";
      try {
        var urls = await up.uploadAll();
        var name = $("c-name").value.trim();
        var id = existing.id || slugify(name);
        await MTECH_DB.saveCategory(id, {
          id: id, name: name,
          blurb: $("c-blurb").value.trim(),
          page: $("c-page").value.trim(),
          displayOrder: Number($("c-order").value || 0),
          image: urls[0] || existing.image || "",
          localImage: existing.localImage || "",
          alt: name + " category at M-TECH Port Harcourt"
        });
        closeDrawer(); toast("Category saved."); loadCategories();
      } catch (err) {
        btn.disabled = false;
        status.className = "form-status is-visible is-error";
        status.textContent = err.message;
      }
    });
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("#btn-new-category")) { openDrawer("Add category", categoryForm({})); wireCategoryForm({}); return; }
    var ec = e.target.closest("[data-edit-cat]");
    if (ec) {
      var c = ADMIN.categories.find(function (x) { return x.id === ec.getAttribute("data-edit-cat"); });
      if (c) { openDrawer("Edit category", categoryForm(c)); wireCategoryForm(c); }
      return;
    }
    var dc = e.target.closest("[data-del-cat]");
    if (dc) {
      if (!confirm("Delete this category?")) return;
      MTECH_DB.deleteCategory(dc.getAttribute("data-del-cat"))
        .then(function () { toast("Category deleted."); loadCategories(); })
        .catch(function (err) { toast(err.message, true); });
    }
  });

  /* ------------------------------------------------------ sell / swap */
  var SELL = [], SWAP = [];

  async function loadSellRequests() {
    try {
      var snap = await MTECH_CONFIG.db.collection("sellRequests").orderBy("createdAt", "desc").limit(100).get();
      SELL = []; snap.forEach(function (d) { SELL.push(Object.assign({ id: d.id }, d.data())); });
      $("sell-tbody").innerHTML = SELL.length ? SELL.map(function (r) {
        return '<tr>' +
          '<td><b>' + esc(r.name) + '</b><br><span class="tiny muted">' + esc(r.phone) + '</span></td>' +
          '<td>' + esc(r.deviceBrand) + ' ' + esc(r.deviceModel) + '<br><span class="tiny muted">' + esc(r.storage) + '</span></td>' +
          '<td class="tiny">' + esc((r.condition || "").split("—")[0]) + '</td>' +
          '<td class="tiny">' + fmtDate(r.createdAt) + '</td>' +
          '<td><span class="pill-status s-' + (r.status || "new") + '">' + esc(r.status || "new") + '</span></td>' +
          '<td style="text-align:right"><button class="icon-btn" data-view-sell="' + r.id + '">Open</button></td>' +
        '</tr>';
      }).join("") : '<tr><td colspan="6" style="padding:40px;text-align:center" class="muted">No sell requests yet.</td></tr>';
    } catch (err) {
      $("sell-tbody").innerHTML = '<tr><td colspan="6" style="padding:30px;text-align:center;color:#95271f">' + esc(err.message) + '</td></tr>';
    }
  }

  async function loadSwapRequests() {
    try {
      var snap = await MTECH_CONFIG.db.collection("swapRequests").orderBy("createdAt", "desc").limit(100).get();
      SWAP = []; snap.forEach(function (d) { SWAP.push(Object.assign({ id: d.id }, d.data())); });
      $("swap-tbody").innerHTML = SWAP.length ? SWAP.map(function (r) {
        return '<tr>' +
          '<td><b>' + esc(r.name) + '</b><br><span class="tiny muted">' + esc(r.phone) + '</span></td>' +
          '<td>' + esc(r.currentDevice) + '</td>' +
          '<td>' + esc(r.desiredProductName) + '</td>' +
          '<td class="tiny">' + fmtDate(r.createdAt) + '</td>' +
          '<td><span class="pill-status s-' + (r.status || "new") + '">' + esc(r.status || "new") + '</span></td>' +
          '<td style="text-align:right"><button class="icon-btn" data-view-swap="' + r.id + '">Open</button></td>' +
        '</tr>';
      }).join("") : '<tr><td colspan="6" style="padding:40px;text-align:center" class="muted">No swap requests yet.</td></tr>';
    } catch (err) {
      $("swap-tbody").innerHTML = '<tr><td colspan="6" style="padding:30px;text-align:center;color:#95271f">' + esc(err.message) + '</td></tr>';
    }
  }

  function requestDetail(r, kind) {
    var photos = (r.images || []).map(function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener"><img src="' + u + '" alt="Device photo" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:10px;border:1px solid var(--line)"></a>';
    }).join("");

    var rows = kind === "sell"
      ? [["Device", r.deviceBrand + " " + r.deviceModel], ["Storage", r.storage], ["Condition", r.condition],
         ["Battery health", r.batteryHealth], ["Charger", r.chargerAvailable], ["Box", r.boxAvailable]]
      : [["Customer has", r.currentDevice], ["Wants", r.desiredProductName], ["Condition", r.condition],
         ["Battery health", r.batteryHealth], ["Budget", r.budget]];

    var offerLabel = kind === "sell" ? "Estimated offer (NGN)" : "Estimated top-up (NGN)";
    var offerVal = kind === "sell" ? r.estimatedOffer : r.estimatedTopUp;

    return '<div>' +
      '<div class="card" style="margin-bottom:18px">' +
        '<h3 style="font-size:1.1rem;margin-bottom:8px">' + esc(r.name) + '</h3>' +
        '<p class="small muted">' + esc(r.phone) + (r.email ? " · " + esc(r.email) : "") + '</p>' +
        '<p class="tiny muted" style="margin-top:4px">Submitted ' + fmtDate(r.createdAt) + '</p>' +
        '<a class="btn btn--wa btn--sm" style="margin-top:14px" target="_blank" rel="noopener" href="' +
          waLinkFor(r.phone, "Hello " + (r.name || "") + ", this is M-TECH regarding your " + (kind === "sell" ? "sell" : "swap") + " request.") +
        '">Chat with customer on WhatsApp</a>' +
      '</div>' +

      '<div class="spec-list card" style="margin-bottom:18px">' +
        rows.map(function (x) {
          return '<div style="display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid var(--line)">' +
            '<span class="muted small">' + esc(x[0]) + '</span><b style="font-size:.88rem;text-align:right">' + esc(x[1] || "—") + '</b></div>';
        }).join("") +
      '</div>' +

      (r.notes ? '<div class="note-box" style="margin-bottom:18px"><b>Customer notes:</b><br>' + esc(r.notes) + '</div>' : '') +

      (photos ? '<p class="side-group" style="color:var(--grey);margin:0 0 10px">Device photos</p>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-bottom:20px">' + photos + '</div>' : '') +

      '<form id="req-form">' +
        '<div class="form-grid">' +
          '<div class="field"><label for="r-status">Status</label><select id="r-status">' +
            ["new", "reviewing", "contacted", "accepted", "rejected", "completed"].map(function (s) {
              return '<option' + ((r.status || "new") === s ? " selected" : "") + '>' + s + '</option>';
            }).join("") +
          '</select></div>' +
          '<div class="field"><label for="r-offer">' + offerLabel + '</label><input id="r-offer" type="number" min="0" value="' + esc(offerVal) + '"></div>' +
          '<div class="field full"><label for="r-notes">Internal admin notes (visible to the customer in their account)</label><textarea id="r-notes">' + esc(r.adminNotes) + '</textarea></div>' +
        '</div>' +
        '<p class="form-status" id="req-status"></p>' +
        '<div class="btn-row"><button class="btn btn--dark" type="submit">Save update</button>' +
        '<button class="btn btn--ghost" type="button" data-drawer-close>Close</button></div>' +
      '</form>' +
    '</div>';
  }

  function wireRequestForm(r, kind) {
    $("req-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var status = $("req-status");
      status.className = "form-status is-visible";
      status.textContent = "Saving…";
      try {
        var payload = {
          status: $("r-status").value,
          adminNotes: $("r-notes").value.trim(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        payload[kind === "sell" ? "estimatedOffer" : "estimatedTopUp"] = $("r-offer").value || "";
        await MTECH_CONFIG.db.collection(kind === "sell" ? "sellRequests" : "swapRequests").doc(r.id).update(payload);
        closeDrawer();
        toast("Request updated.");
        kind === "sell" ? loadSellRequests() : loadSwapRequests();
        loadOverview();
      } catch (err) {
        status.className = "form-status is-visible is-error";
        status.textContent = err.message;
      }
    });
  }

  document.addEventListener("click", function (e) {
    var s = e.target.closest("[data-view-sell]");
    if (s) {
      var r = SELL.find(function (x) { return x.id === s.getAttribute("data-view-sell"); });
      if (r) { openDrawer("Sell request", requestDetail(r, "sell")); wireRequestForm(r, "sell"); }
      return;
    }
    var w = e.target.closest("[data-view-swap]");
    if (w) {
      var r2 = SWAP.find(function (x) { return x.id === w.getAttribute("data-view-swap"); });
      if (r2) { openDrawer("Swap request", requestDetail(r2, "swap")); wireRequestForm(r2, "swap"); }
    }
  });

  /* --------------------------------------------------------- enquiries */
  async function loadEnquiries() {
    try {
      var snap = await MTECH_CONFIG.db.collection("enquiries").orderBy("createdAt", "desc").limit(80).get();
      var rows = [];
      snap.forEach(function (d) { rows.push(Object.assign({ id: d.id }, d.data())); });
      $("enq-tbody").innerHTML = rows.length ? rows.map(function (r) {
        return '<tr>' +
          '<td>' + esc(r.productName || r.productId) + '</td>' +
          '<td class="tiny">' + esc(r.userEmail === "guest" ? "Guest visitor" : r.userEmail) + '</td>' +
          '<td class="tiny">' + esc(r.enquiryType) + '</td>' +
          '<td class="tiny">' + fmtDate(r.createdAt) + '</td>' +
          '<td><span class="pill-status s-' + (r.status || "new") + '">' + esc(r.status || "new") + '</span></td>' +
          '<td style="text-align:right"><select class="icon-btn" data-enq-status="' + r.id + '" style="padding:5px">' +
            ["new", "viewed", "contacted", "completed", "closed"].map(function (s) {
              return '<option' + ((r.status || "new") === s ? " selected" : "") + '>' + s + '</option>';
            }).join("") + '</select></td>' +
        '</tr>';
      }).join("") : '<tr><td colspan="6" style="padding:40px;text-align:center" class="muted">No enquiries recorded yet.</td></tr>';
    } catch (err) {
      $("enq-tbody").innerHTML = '<tr><td colspan="6" style="padding:30px;text-align:center;color:#95271f">' + esc(err.message) + '</td></tr>';
    }
  }

  document.addEventListener("change", function (e) {
    var sel = e.target.closest("[data-enq-status]");
    if (!sel) return;
    MTECH_CONFIG.db.collection("enquiries").doc(sel.getAttribute("data-enq-status"))
      .update({ status: sel.value })
      .then(function () { toast("Enquiry updated."); })
      .catch(function (err) { toast(err.message, true); });
  });

  /* ------------------------------------------------------ testimonials */
  async function loadTestimonials() {
    try {
      var snap = await MTECH_CONFIG.db.collection("testimonials").get();
      var rows = [];
      snap.forEach(function (d) { rows.push(Object.assign({ id: d.id }, d.data())); });
      $("testi-grid").innerHTML = rows.length ? rows.map(function (t) {
        return '<div class="card">' +
          '<span class="pill-status s-' + (t.status || "pending") + '">' + esc(t.status || "pending") + '</span>' +
          '<h3 style="font-size:1.05rem;margin:10px 0 6px">' + esc(t.name) + '</h3>' +
          '<p class="small muted">' + esc(t.review) + '</p>' +
          '<p class="tiny muted" style="margin-top:8px">Rating: ' + esc(t.rating || 5) + '/5' + (t.product ? " · " + esc(t.product) : "") + '</p>' +
          '<div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap">' +
            '<button class="icon-btn" data-testi-approve="' + t.id + '">Approve</button>' +
            '<button class="icon-btn" data-testi-hide="' + t.id + '">Hide</button>' +
            '<button class="icon-btn danger" data-testi-del="' + t.id + '">Delete</button>' +
          '</div>' +
        '</div>';
      }).join("") : '<p class="muted">No testimonials yet. Only publish real, permissioned customer reviews.</p>';
    } catch (err) {
      $("testi-grid").innerHTML = '<p style="color:#95271f">' + esc(err.message) + '</p>';
    }
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("#btn-new-testimonial")) {
      openDrawer("Add testimonial",
        '<form id="testi-form" novalidate><div class="form-grid">' +
          '<div class="field full"><label for="t-cust">Customer name *</label><input id="t-cust" type="text" required></div>' +
          '<div class="field full"><label for="t-rev">Review *</label><textarea id="t-rev" required></textarea></div>' +
          '<div class="field"><label for="t-rate">Rating</label><select id="t-rate"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></div>' +
          '<div class="field"><label for="t-prod">Product purchased</label><input id="t-prod" type="text"></div>' +
          '<div class="field"><label for="t-stat">Status</label><select id="t-stat"><option value="pending">Pending</option><option value="approved">Approved</option><option value="hidden">Hidden</option></select></div>' +
        '</div>' +
        '<p class="side-group" style="color:var(--grey);margin:18px 0 10px">Optional photo</p><div id="testi-uploader"></div>' +
        '<p class="form-status" id="testi-status"></p>' +
        '<div class="btn-row"><button class="btn btn--dark" type="submit">Save testimonial</button>' +
        '<button class="btn btn--ghost" type="button" data-drawer-close>Cancel</button></div></form>');

      var up = MTECH_CLOUDINARY.createUploader("testi-uploader", { folder: "m-tech/testimonials", maxFiles: 1 });
      $("testi-form").addEventListener("submit", async function (ev) {
        ev.preventDefault();
        if (!ev.target.checkValidity()) { ev.target.reportValidity(); return; }
        var st = $("testi-status");
        st.className = "form-status is-visible"; st.textContent = "Saving…";
        try {
          var urls = await up.uploadAll();
          var id = "testi-" + Date.now();
          await MTECH_DB.saveTestimonial(id, {
            id: id,
            name: $("t-cust").value.trim(),
            review: $("t-rev").value.trim(),
            rating: Number($("t-rate").value),
            product: $("t-prod").value.trim(),
            image: urls[0] || "",
            status: $("t-stat").value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          closeDrawer(); toast("Testimonial saved."); loadTestimonials();
        } catch (err) {
          st.className = "form-status is-visible is-error"; st.textContent = err.message;
        }
      });
      return;
    }

    var ap = e.target.closest("[data-testi-approve]");
    if (ap) return MTECH_DB.saveTestimonial(ap.getAttribute("data-testi-approve"), { status: "approved" })
      .then(function () { toast("Approved."); loadTestimonials(); }).catch(function (er) { toast(er.message, true); });

    var hd = e.target.closest("[data-testi-hide]");
    if (hd) return MTECH_DB.saveTestimonial(hd.getAttribute("data-testi-hide"), { status: "hidden" })
      .then(function () { toast("Hidden."); loadTestimonials(); }).catch(function (er) { toast(er.message, true); });

    var dl = e.target.closest("[data-testi-del]");
    if (dl) {
      if (!confirm("Delete this testimonial?")) return;
      MTECH_DB.deleteTestimonial(dl.getAttribute("data-testi-del"))
        .then(function () { toast("Deleted."); loadTestimonials(); }).catch(function (er) { toast(er.message, true); });
    }
  });

  /* -------------------------------------------------------- promotions */
  async function loadPromotions() {
    try {
      var list = await MTECH_DB.getPromotions(false);
      $("promo-grid").innerHTML = list.length ? list.map(function (p) {
        var live = isPromoLive(p);
        return '<div class="card" style="padding:0;overflow:hidden">' +
          (p.image ? '<div class="thumb" style="aspect-ratio:16/9"><img src="' + p.image + '" alt="" style="width:100%;height:100%;object-fit:cover"></div>' : '') +
          '<div style="padding:16px">' +
            '<span class="pill-status ' + (live ? "s-published" : "s-draft") + '">' + (live ? "live now" : "not showing") + '</span>' +
            '<h3 style="font-size:1.05rem;margin:10px 0 6px">' + esc(p.title) + '</h3>' +
            '<p class="small muted">' + esc(p.description) + '</p>' +
            '<p class="tiny muted" style="margin-top:8px">' + esc(p.startDate || "—") + ' → ' + esc(p.endDate || "—") + '</p>' +
            '<div style="margin-top:14px;display:flex;gap:6px">' +
              '<button class="icon-btn" data-promo-toggle="' + p.id + '" data-active="' + (p.active ? "1" : "0") + '">' + (p.active ? "Deactivate" : "Activate") + '</button>' +
              '<button class="icon-btn danger" data-promo-del="' + p.id + '">Delete</button>' +
            '</div>' +
          '</div></div>';
      }).join("") : '<p class="muted">No promotions yet.</p>';
    } catch (err) {
      $("promo-grid").innerHTML = '<p style="color:#95271f">' + esc(err.message) + '</p>';
    }
  }

  function isPromoLive(p) {
    if (!p.active) return false;
    var now = new Date();
    if (p.startDate && new Date(p.startDate) > now) return false;
    if (p.endDate && new Date(p.endDate + "T23:59:59") < now) return false;
    return true;
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("#btn-new-promo")) {
      openDrawer("Add promotion",
        '<form id="promo-form" novalidate><div class="form-grid">' +
          '<div class="field full"><label for="pr-title">Title *</label><input id="pr-title" type="text" required></div>' +
          '<div class="field full"><label for="pr-desc">Description</label><textarea id="pr-desc"></textarea></div>' +
          '<div class="field"><label for="pr-cta">CTA text</label><input id="pr-cta" type="text" placeholder="Shop the deal"></div>' +
          '<div class="field"><label for="pr-link">CTA link</label><input id="pr-link" type="text" placeholder="iphone.html"></div>' +
          '<div class="field"><label for="pr-start">Start date</label><input id="pr-start" type="date"></div>' +
          '<div class="field"><label for="pr-end">End date</label><input id="pr-end" type="date"></div>' +
          '<div class="field full"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="pr-active" style="width:auto" checked> Active</label></div>' +
        '</div>' +
        '<p class="side-group" style="color:var(--grey);margin:18px 0 10px">Banner image</p><div id="promo-uploader"></div>' +
        '<p class="form-status" id="promo-status"></p>' +
        '<div class="btn-row"><button class="btn btn--dark" type="submit">Save promotion</button>' +
        '<button class="btn btn--ghost" type="button" data-drawer-close>Cancel</button></div></form>');

      var up = MTECH_CLOUDINARY.createUploader("promo-uploader", { folder: "m-tech/promotions", maxFiles: 1 });
      $("promo-form").addEventListener("submit", async function (ev) {
        ev.preventDefault();
        if (!ev.target.checkValidity()) { ev.target.reportValidity(); return; }
        var st = $("promo-status");
        st.className = "form-status is-visible"; st.textContent = "Saving…";
        try {
          var urls = await up.uploadAll();
          var id = "promo-" + Date.now();
          await MTECH_DB.savePromotion(id, {
            id: id,
            title: $("pr-title").value.trim(),
            description: $("pr-desc").value.trim(),
            ctaText: $("pr-cta").value.trim(),
            ctaLink: $("pr-link").value.trim(),
            image: urls[0] || "",
            startDate: $("pr-start").value,
            endDate: $("pr-end").value,
            active: $("pr-active").checked,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          closeDrawer(); toast("Promotion saved."); loadPromotions();
        } catch (err) {
          st.className = "form-status is-visible is-error"; st.textContent = err.message;
        }
      });
      return;
    }

    var tg = e.target.closest("[data-promo-toggle]");
    if (tg) {
      var next = tg.getAttribute("data-active") !== "1";
      MTECH_DB.savePromotion(tg.getAttribute("data-promo-toggle"), { active: next })
        .then(function () { toast(next ? "Promotion activated." : "Promotion deactivated."); loadPromotions(); })
        .catch(function (er) { toast(er.message, true); });
      return;
    }

    var pd = e.target.closest("[data-promo-del]");
    if (pd) {
      if (!confirm("Delete this promotion?")) return;
      MTECH_DB.deletePromotion(pd.getAttribute("data-promo-del"))
        .then(function () { toast("Deleted."); loadPromotions(); }).catch(function (er) { toast(er.message, true); });
    }
  });

  /* ---------------------------------------------------------- settings */
  async function loadSettings() {
    try {
      var s = await MTECH_DB.getSettings();
      $("set-name").value = s.businessName || "";
      $("set-tag").value = s.tagline || "";
      $("set-wa").value = s.whatsappNumber || "";
      $("set-email").value = s.contactEmail || "";
      $("set-ann").value = s.announcementBar || "";
      $("set-desc").value = s.description || "";
      $("set-ig").value = s.instagram || "";
      $("set-fb").value = s.facebook || "";
    } catch (err) { console.error(err); }
  }

  document.addEventListener("submit", async function (e) {
    if (e.target.id !== "settings-form") return;
    e.preventDefault();
    var st = $("settings-status"), btn = $("save-settings-btn");
    btn.disabled = true;
    st.className = "form-status is-visible"; st.textContent = "Saving settings…";
    try {
      await MTECH_DB.updateSettings({
        businessName: $("set-name").value.trim(),
        tagline: $("set-tag").value.trim(),
        whatsappNumber: $("set-wa").value.trim(),
        contactEmail: $("set-email").value.trim(),
        announcementBar: $("set-ann").value.trim(),
        description: $("set-desc").value.trim(),
        instagram: $("set-ig").value.trim(),
        facebook: $("set-fb").value.trim()
      });
      btn.disabled = false;
      st.className = "form-status is-visible"; st.textContent = "Settings saved successfully.";
    } catch (err) {
      btn.disabled = false;
      st.className = "form-status is-visible is-error"; st.textContent = err.message;
    }
  });

  /* ----------------------------------------------------- notifications */
  async function watchNotifications() {
    /* Use a one-time read instead of a long-lived Firestore listener here.
       The dashboard does not need a persistent stream just to paint the
       notification panel, and this avoids the Firestore listen-channel
       assertion that was breaking the rest of the admin session. */
    try {
      var snap = await MTECH_CONFIG.db.collection("notifications")
        .where("recipientRole", "==", "admin")
        .orderBy("createdAt", "desc").limit(20).get();

      var items = [];
      snap.forEach(function (d) { items.push(Object.assign({ id: d.id }, d.data())); });
      var unread = items.filter(function (n) { return !n.read; }).length;
      var dot = $("notif-dot");
      if (dot) {
        dot.style.display = unread ? "grid" : "none";
        dot.textContent = unread > 9 ? "9+" : unread;
      }

      var list = $("notif-list");
      if (list) {
        list.innerHTML = items.length ? items.map(function (n) {
          return '<div class="notif-item' + (n.read ? "" : " unread") + '" data-notif="' + n.id + '">' +
            '<b style="display:block;font-size:.84rem">' + esc(n.title) + '</b>' +
            '<span class="tiny muted">' + esc(n.message) + '</span>' +
            '<div class="tiny muted" style="margin-top:4px">' + fmtDate(n.createdAt) + '</div>' +
          '</div>';
        }).join("") : '<div class="notif-item muted">No notifications yet.</div>';
      }
    } catch (err) {
      console.warn("[M-TECH ADMIN] Notifications read skipped:", err && err.code, err && err.message);
      var list = $("notif-list");
      if (list) list.innerHTML = '<div class="notif-item muted">Notifications unavailable right now.</div>';
    }
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("#notif-btn")) {
      $("notif-panel").classList.toggle("is-open");
      return;
    }
    if (!e.target.closest(".notif-wrap")) $("notif-panel").classList.remove("is-open");

    if (e.target.closest("#mark-all-read")) {
      MTECH_CONFIG.db.collection("notifications").where("read", "==", false).get().then(function (snap) {
        var batch = MTECH_CONFIG.db.batch();
        snap.forEach(function (d) { batch.update(d.ref, { read: true }); });
        return batch.commit();
      }).then(function () { toast("All notifications marked read."); })
        .catch(function (er) { toast(er.message, true); });
      return;
    }

    var n = e.target.closest("[data-notif]");
    if (n) {
      MTECH_CONFIG.db.collection("notifications").doc(n.getAttribute("data-notif")).update({ read: true }).catch(function () {});
    }
  });

})();
