/* M-TECH Admin CRUD persistence repair
   --------------------------------------------------------------------------
   Firestore is the source of truth for Admin CRUD operations.
   This layer preserves the existing Admin forms and schema while making every
   mutation server-verified. It also bootstraps the existing static catalogue
   into Firestore when the products collection is genuinely empty, because the
   repository already contains an explicit initial catalogue but was not
   invoking its initialization routine.

   Authentication, Firestore rules, Firebase configuration and UI are untouched.
*/
(function () {
  "use strict";

  function dbReady() {
    return !!(window.MTECH_CONFIG && MTECH_CONFIG.isEnabled && MTECH_CONFIG.db);
  }

  /* MTECH_DB is a top-level const in firebase-db.js. Top-level const bindings
     are available to later classic scripts but are not window properties. */
  function dbServiceReady() {
    return (typeof MTECH_DB !== "undefined" && MTECH_DB);
  }

  function firebaseError(error, action, collection, id) {
    var code = error && error.code ? error.code : "unknown";
    var message = error && error.message ? error.message : String(error || "Unknown Firestore error");
    var detail = action + " " + collection + "/" + id + " failed [" + code + "]: " + message;
    console.error("[M-TECH CRUD] " + detail, error);
    var wrapped = new Error(detail);
    wrapped.code = code;
    wrapped.originalError = error;
    return wrapped;
  }

  async function ensureOnline() {
    if (!dbReady()) throw new Error("Firebase is not initialized.");
    await MTECH_CONFIG.db.enableNetwork();
    return MTECH_CONFIG.db;
  }

  async function verifyWrite(collection, id) {
    var db = MTECH_CONFIG.db;
    var snap = await db.collection(collection).doc(id).get({ source: "server" });
    if (!snap.exists) {
      var missing = new Error("Firestore did not confirm " + collection + "/" + id + " after the save.");
      missing.code = "mtech/verification-failed";
      throw missing;
    }
    console.log("[M-TECH CRUD] SERVER VERIFIED SAVE", collection + "/" + id, snap.data());
    return { id: snap.id, data: snap.data() };
  }

  async function verifyDelete(collection, id) {
    var db = MTECH_CONFIG.db;
    var snap = await db.collection(collection).doc(id).get({ source: "server" });
    if (snap.exists) {
      var stillThere = new Error("Firestore still contains " + collection + "/" + id + " after delete.");
      stillThere.code = "mtech/delete-verification-failed";
      throw stillThere;
    }
    console.log("[M-TECH CRUD] SERVER VERIFIED DELETE", collection + "/" + id);
  }

  function wrapSave(name, collection) {
    var service = dbServiceReady();
    if (!service || typeof service[name] !== "function") return false;
    if (service[name].__mtechCrudRepair) return true;

    var original = service[name];
    var wrapped = async function (id, data) {
      try {
        var db = await ensureOnline();
        if (!id) throw new Error("A document ID is required for " + collection + ".");
        if (!data || typeof data !== "object") throw new Error("Valid content data is required.");

        await db.collection(collection).doc(id).set(data, { merge: true });
        return await verifyWrite(collection, id);
      } catch (error) {
        throw firebaseError(error, "Save", collection, id || "<missing-id>");
      }
    };
    wrapped.__mtechCrudRepair = true;
    wrapped.__original = original;
    service[name] = wrapped;
    return true;
  }

  function wrapDelete(name, collection) {
    var service = dbServiceReady();
    if (!service || typeof service[name] !== "function") return false;
    if (service[name].__mtechCrudRepair) return true;

    var original = service[name];
    var wrapped = async function (id) {
      try {
        var db = await ensureOnline();
        if (!id) throw new Error("A document ID is required for " + collection + ".");
        await db.collection(collection).doc(id).delete();
        await verifyDelete(collection, id);
        return true;
      } catch (error) {
        throw firebaseError(error, "Delete", collection, id || "<missing-id>");
      }
    };
    wrapped.__mtechCrudRepair = true;
    wrapped.__original = original;
    service[name] = wrapped;
    return true;
  }

  function wrapSettings() {
    var service = dbServiceReady();
    if (!service || typeof service.updateSettings !== "function") return false;
    if (service.updateSettings.__mtechCrudRepair) return true;

    var original = service.updateSettings;
    var wrapped = async function (data) {
      try {
        var db = await ensureOnline();
        var ref = db.collection("siteSettings").doc("main");
        await ref.set(data, { merge: true });
        var snap = await ref.get({ source: "server" });
        if (!snap.exists) {
          var missing = new Error("Firestore did not confirm siteSettings/main after save.");
          missing.code = "mtech/verification-failed";
          throw missing;
        }
        console.log("[M-TECH CRUD] SERVER VERIFIED SAVE siteSettings/main", snap.data());
        return snap.data();
      } catch (error) {
        throw firebaseError(error, "Save", "siteSettings", "main");
      }
    };
    wrapped.__mtechCrudRepair = true;
    wrapped.__original = original;
    service.updateSettings = wrapped;
    return true;
  }

  async function bootstrapExistingProducts() {
    var db = await ensureOnline();
    var existing = await db.collection("products").limit(1).get({ source: "server" });
    if (!existing.empty) return false;

    if (typeof products === "undefined" || !Array.isArray(products) || !products.length) {
      console.warn("[M-TECH CRUD] Products collection is empty and no static catalogue is available to bootstrap.");
      return false;
    }

    console.log("[M-TECH CRUD] Products collection is empty; bootstrapping the existing catalogue into Firestore.");
    var batch = db.batch();
    products.forEach(function (p) {
      if (!p || !p.id) return;
      var ref = db.collection("products").doc(String(p.id));
      batch.set(ref, Object.assign({}, p, {
        status: p.status || "published",
        stockQuantity: p.stockQuantity == null ? (p.category === "Accessories" ? 25 : 5) : p.stockQuantity,
        showStockQuantity: p.showStockQuantity === true,
        views: Number(p.views || 0),
        whatsappClicks: Number(p.whatsappClicks || 0),
        createdAt: p.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }), { merge: true });
    });
    await batch.commit();

    var verify = await db.collection("products").get({ source: "server" });
    if (verify.empty) {
      var failed = new Error("The catalogue bootstrap completed without any products being readable from Firestore.");
      failed.code = "mtech/bootstrap-verification-failed";
      throw failed;
    }
    console.log("[M-TECH CRUD] SERVER VERIFIED CATALOGUE BOOTSTRAP", verify.size + " products");
    return true;
  }

  async function install() {
    if (!dbReady() || !dbServiceReady()) {
      setTimeout(install, 100);
      return;
    }

    wrapSave("saveProduct", "products");
    wrapDelete("deleteProduct", "products");
    wrapSave("saveCategory", "categories");
    wrapDelete("deleteCategory", "categories");
    wrapSave("saveTestimonial", "testimonials");
    wrapDelete("deleteTestimonial", "testimonials");
    wrapSave("savePromotion", "promotions");
    wrapDelete("deletePromotion", "promotions");
    wrapSettings();

    console.log("[M-TECH CRUD] Firestore server-verified CRUD layer installed");

    /* The repository already has an initial catalogue, but its existing
       initializeDatabase() routine is not invoked anywhere. Bootstrap only
       when Firestore truly has zero products, then reload once so the Admin
       list is populated from Firestore rather than the static array. */
    try {
      if (window.__MTECH_PRODUCT_BOOTSTRAP_STARTED) return;
      window.__MTECH_PRODUCT_BOOTSTRAP_STARTED = true;
      var seeded = await bootstrapExistingProducts();
      if (seeded && location.pathname.toLowerCase().indexOf("admin.html") !== -1) {
        window.location.reload();
      }
    } catch (error) {
      console.error("[M-TECH CRUD] Product bootstrap failed", error);
      /* Do not hide this failure: the Admin form/list remains usable and the
         exact error is available in the console. */
    }
  }

  install();
})();
