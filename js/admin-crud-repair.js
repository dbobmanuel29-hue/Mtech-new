/* M-TECH Admin CRUD persistence repair
   --------------------------------------------------------------------------
   Firestore is the source of truth for Admin CRUD operations.
   This layer preserves the existing Admin forms and schema while making every
   mutation server-verified. It also bootstraps the existing static catalogue
   into Firestore when the products collection is genuinely empty.

   Authentication, Firestore rules, Firebase configuration and UI are untouched.
*/
(function () {
  "use strict";

  function dbReady() {
    return !!(window.MTECH_CONFIG && MTECH_CONFIG.isEnabled && MTECH_CONFIG.db);
  }

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

  /* Firestore does not permit arrays directly inside arrays. The existing
     static catalogue stores specs as pairs such as ["Display", "..."] inside
     a specs array. Convert those pairs to Firestore-safe maps while retaining
     the same information and field name. All other product fields are kept. */
  function firestoreSafeProduct(product) {
    var safe = Object.assign({}, product);
    if (Array.isArray(product.specs)) {
      safe.specs = product.specs.map(function (spec) {
        if (Array.isArray(spec)) {
          return {
            label: spec.length > 0 && spec[0] != null ? String(spec[0]) : "",
            value: spec.length > 1 && spec[1] != null ? String(spec[1]) : ""
          };
        }
        return spec;
      });
    }
    return safe;
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

    products.forEach(function (product) {
      if (!product || !product.id) return;
      var ref = db.collection("products").doc(String(product.id));
      var data = firestoreSafeProduct(product);
      data.status = product.status || "published";
      data.stockQuantity = product.stockQuantity == null
        ? (product.category === "Accessories" ? 25 : 5)
        : product.stockQuantity;
      data.showStockQuantity = product.showStockQuantity === true;
      data.views = Number(product.views || 0);
      data.whatsappClicks = Number(product.whatsappClicks || 0);
      data.createdAt = product.createdAt || firebase.firestore.FieldValue.serverTimestamp();
      data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      batch.set(ref, data, { merge: true });
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

    try {
      if (window.__MTECH_PRODUCT_BOOTSTRAP_STARTED) return;
      window.__MTECH_PRODUCT_BOOTSTRAP_STARTED = true;
      var seeded = await bootstrapExistingProducts();
      if (seeded && location.pathname.toLowerCase().indexOf("admin.html") !== -1) {
        window.location.reload();
      }
    } catch (error) {
      console.error("[M-TECH CRUD] Product bootstrap failed", error);
    }
  }

  install();
})();
