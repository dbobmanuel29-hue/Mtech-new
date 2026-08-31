/* M-TECH Admin CRUD persistence repair
   --------------------------------------------------------------------------
   This layer sits after admin-core.js so the existing dashboard forms remain
   unchanged. It makes Firestore the source of truth for Admin CRUD operations:
   - every write is sent to the backend with the network enabled
   - every write is read back from the server and verified
   - deletes are also verified against the server
   - failures are surfaced to the existing form error handler

   Authentication, Firestore rules, Firebase configuration and UI are untouched.
*/
(function () {
  "use strict";

  function dbReady() {
    return !!(window.MTECH_CONFIG && MTECH_CONFIG.isEnabled && MTECH_CONFIG.db);
  }

  function firebaseError(error, action, collection, id) {
    var code = error && error.code ? error.code : "unknown";
    var message = error && error.message ? error.message : String(error || "Unknown Firestore error");
    var detail = "" + action + " " + collection + "/" + id + " failed [" + code + "]: " + message;
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
      throw new Error("Firestore did not confirm " + collection + "/" + id + " after the save. The write did not reach the server.");
    }
    console.log("[M-TECH CRUD] SERVER VERIFIED SAVE", collection + "/" + id);
    return { id: snap.id, data: snap.data() };
  }

  async function verifyDelete(collection, id) {
    var db = MTECH_CONFIG.db;
    var snap = await db.collection(collection).doc(id).get({ source: "server" });
    if (snap.exists) {
      throw new Error("Firestore still contains " + collection + "/" + id + " after delete. The delete was not confirmed by the server.");
    }
    console.log("[M-TECH CRUD] SERVER VERIFIED DELETE", collection + "/" + id);
  }

  function wrapSave(name, collection) {
    if (!window.MTECH_DB || typeof MTECH_DB[name] !== "function") return;
    if (MTECH_DB[name].__mtechCrudRepair) return;

    var original = MTECH_DB[name];
    var wrapped = async function (id, data) {
      try {
        var db = await ensureOnline();
        var ref = db.collection(collection).doc(id);

        /* Use the existing schema/data assembled by the Admin dashboard. */
        await ref.set(data, { merge: true });
        var verified = await verifyWrite(collection, id);

        /* Preserve the existing API contract while returning the verified data. */
        return verified;
      } catch (error) {
        throw firebaseError(error, "Save", collection, id);
      }
    };
    wrapped.__mtechCrudRepair = true;
    wrapped.__original = original;
    MTECH_DB[name] = wrapped;
  }

  function wrapDelete(name, collection) {
    if (!window.MTECH_DB || typeof MTECH_DB[name] !== "function") return;
    if (MTECH_DB[name].__mtechCrudRepair) return;

    var original = MTECH_DB[name];
    var wrapped = async function (id) {
      try {
        var db = await ensureOnline();
        await db.collection(collection).doc(id).delete();
        await verifyDelete(collection, id);
        return true;
      } catch (error) {
        throw firebaseError(error, "Delete", collection, id);
      }
    };
    wrapped.__mtechCrudRepair = true;
    wrapped.__original = original;
    MTECH_DB[name] = wrapped;
  }

  function wrapSettings() {
    if (!window.MTECH_DB || typeof MTECH_DB.updateSettings !== "function") return;
    if (MTECH_DB.updateSettings.__mtechCrudRepair) return;

    var original = MTECH_DB.updateSettings;
    var wrapped = async function (data) {
      try {
        var db = await ensureOnline();
        var ref = db.collection("siteSettings").doc("main");
        await ref.set(data, { merge: true });
        var snap = await ref.get({ source: "server" });
        if (!snap.exists) throw new Error("Firestore did not confirm siteSettings/main after save.");
        console.log("[M-TECH CRUD] SERVER VERIFIED SAVE siteSettings/main");
        return snap.data();
      } catch (error) {
        throw firebaseError(error, "Save", "siteSettings", "main");
      }
    };
    wrapped.__mtechCrudRepair = true;
    wrapped.__original = original;
    MTECH_DB.updateSettings = wrapped;
  }

  function install() {
    if (!window.MTECH_DB) {
      console.warn("[M-TECH CRUD] MTECH_DB is not available yet; retrying.");
      setTimeout(install, 50);
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
