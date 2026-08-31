/* M-TECH Admin CRUD persistence repair
   --------------------------------------------------------------------------
   Firestore is the source of truth for Admin CRUD operations.
   This layer deliberately uses the existing MTECH_DB service and preserves
   every form/schema already assembled by admin-core.js.

   Authentication, Firestore rules, Firebase configuration and UI are untouched.
*/
(function () {
  "use strict";

  function dbReady() {
    return !!(window.MTECH_CONFIG && MTECH_CONFIG.isEnabled && MTECH_CONFIG.db);
  }

  /* MTECH_DB is declared as a top-level const in firebase-db.js, so it is a
     global lexical binding but not a window property. The previous repair
     incorrectly checked window.MTECH_DB and therefore never installed. */
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
        if (!data || typeof data !== "object") throw new Error("Valid product/content data is required.");

        /* Preserve the exact schema produced by the existing Admin forms. */
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

  function install() {
    if (!dbReady()) {
      setTimeout(install, 100);
      return;
    }
    if (!dbServiceReady()) {
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
  }

  install();
})();
