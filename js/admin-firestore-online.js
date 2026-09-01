/* M-TECH Admin Firestore online/consistency guard.
   Admin CRUD must read the real Firestore backend rather than silently
   presenting an empty/stale local cache as the database state. */
(function () {
  "use strict";

  if (!window.firebase || !window.MTECH_CONFIG || !MTECH_CONFIG.isEnabled) return;

  var db = MTECH_CONFIG.db;

  // Keep the admin console online. A failed enableNetwork is surfaced by the
  // normal CRUD operation instead of being hidden as a successful save.
  db.enableNetwork().catch(function (err) {
    console.warn("[M-TECH ADMIN FIRESTORE] Network enable failed:", err && err.message);
  });

  // Dashboard reads keep the normal Firestore SDK behaviour. We verify
  // successful CRUD writes against the server below, but do not globally
  // force every read to source:"server" because a temporary transport failure
  // would otherwise leave the whole dashboard blank.

  async function verifySaved(collection, id) {
    var snap = await db.collection(collection).doc(id).get({ source: "server" });
    if (!snap.exists) {
      throw new Error("Firestore did not confirm the saved " + collection + " record. The write did not reach the server.");
    }
    console.log("[M-TECH ADMIN FIRESTORE] Confirmed server save:", collection + "/" + id);
    return snap;
  }

  function wrapSave(name, collection) {
    if (!window.MTECH_DB || typeof MTECH_DB[name] !== "function") return;
    var original = MTECH_DB[name];
    if (original.__mtechVerified) return;

    var wrapped = async function (id, data) {
      await db.enableNetwork();
      await original.call(MTECH_DB, id, data);
      await verifySaved(collection, id);
    };
    wrapped.__mtechVerified = true;
    MTECH_DB[name] = wrapped;
  }

  wrapSave("saveProduct", "products");
  wrapSave("saveCategory", "categories");
  wrapSave("saveTestimonial", "testimonials");
  wrapSave("savePromotion", "promotions");
})();
