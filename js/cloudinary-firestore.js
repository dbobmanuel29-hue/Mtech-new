/* M-TECH — enrich existing Firestore media writes with Cloudinary metadata. */
(function () {
  "use strict";
  if (window.MTECH_CLOUDINARY_FIRESTORE_WIRED || !window.MTECH_DB || !window.MTECH_CLOUDINARY) return;
  window.MTECH_CLOUDINARY_FIRESTORE_WIRED = true;

  function mediaFor(urls) { return MTECH_CLOUDINARY.getMediaForUrls(urls || []); }
  function enrichSingle(data, field) {
    var copy = Object.assign({}, data), url = copy[field], media = url ? mediaFor([url])[0] : null;
    if (media && media.publicId) { copy[field + "PublicId"] = media.publicId; copy[field + "ResourceType"] = media.resourceType || "image"; }
    return copy;
  }
  function enrichArray(data, field) {
    var copy = Object.assign({}, data), urls = Array.isArray(copy[field]) ? copy[field] : [], media = mediaFor(urls);
    var ids = media.filter(function (m) { return m.publicId; }).map(function (m) { return m.publicId; });
    if (ids.length) copy[field + "PublicIds"] = ids;
    if (media.some(function (m) { return m.publicId; })) copy[field + "Media"] = media;
    return copy;
  }
  async function deleteAsset(publicId, resourceType) {
    if (!publicId || !MTECH_CONFIG.auth || !MTECH_CONFIG.auth.currentUser) return;
    try {
      var token = await MTECH_CONFIG.auth.currentUser.getIdToken();
      await fetch("/api/cloudinary/delete", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify({ publicId: publicId, resourceType: resourceType || "image" }) });
    } catch (e) { console.warn("Cloudinary cleanup skipped:", e.message); }
  }

  /* Profile uploads already update photoURL in account.html. This bridge adds
     the Cloudinary public ID without changing the working profile flow. */
  var originalUpload = MTECH_CLOUDINARY.uploadFile;
  MTECH_CLOUDINARY.uploadFile = async function (file, folder, onProgress, options) {
    var result = await originalUpload.call(MTECH_CLOUDINARY, file, folder, onProgress, options);
    if (String(folder || "").indexOf("m-tech/profiles") === 0 && MTECH_CONFIG.auth && MTECH_CONFIG.auth.currentUser && MTECH_CONFIG.isEnabled) {
      try {
        await MTECH_CONFIG.db.collection("users").doc(MTECH_CONFIG.auth.currentUser.uid).update({ photoPublicId: result.publicId || "", photoResourceType: result.resourceType || "image" });
      } catch (e) { console.warn("Profile media metadata update skipped:", e.message); }
    }
    return result;
  };

  var originalProduct = MTECH_DB.saveProduct;
  MTECH_DB.saveProduct = async function (id, data) {
    var copy = enrichArray(data, "images");
    var main = copy.thumbnail || copy.image, mainMedia = main ? mediaFor([main])[0] : null;
    if (mainMedia && mainMedia.publicId) { copy.imagePublicId = mainMedia.publicId; copy.imageResourceType = mainMedia.resourceType || "image"; }
    var old = null;
    try { var oldSnap = await MTECH_CONFIG.db.collection("products").doc(id).get(); if (oldSnap.exists) old = oldSnap.data(); } catch (_) {}
    var result = await originalProduct.call(MTECH_DB, id, copy);
    var oldIds = (old && Array.isArray(old.imagePublicIds)) ? old.imagePublicIds : [];
    var newIds = Array.isArray(copy.imagePublicIds) ? copy.imagePublicIds : [];
    var removed = oldIds.filter(function (pid) { return newIds.indexOf(pid) === -1; });
    await Promise.all(removed.map(function (pid) { return deleteAsset(pid, "image"); }));
    return result;
  };

  var originalCategory = MTECH_DB.saveCategory;
  MTECH_DB.saveCategory = async function (id, data) {
    var copy = enrichSingle(data, "image"), old = null;
    try { var snap = await MTECH_CONFIG.db.collection("categories").doc(id).get(); if (snap.exists) old = snap.data(); } catch (_) {}
    var result = await originalCategory.call(MTECH_DB, id, copy);
    if (old && old.imagePublicId && copy.imagePublicId && old.imagePublicId !== copy.imagePublicId) await deleteAsset(old.imagePublicId, old.imageResourceType || "image");
    return result;
  };

  var originalTestimonial = MTECH_DB.saveTestimonial;
  MTECH_DB.saveTestimonial = function (id, data) { return originalTestimonial.call(MTECH_DB, id, enrichSingle(data, "image")); };
  var originalPromotion = MTECH_DB.savePromotion;
  MTECH_DB.savePromotion = function (id, data) { return originalPromotion.call(MTECH_DB, id, enrichSingle(data, "image")); };
  var originalSell = MTECH_DB.saveSellRequest;
  MTECH_DB.saveSellRequest = function (data) { return originalSell.call(MTECH_DB, enrichArray(data, "images")); };
  var originalSwap = MTECH_DB.saveSwapRequest;
  MTECH_DB.saveSwapRequest = function (data) { return originalSwap.call(MTECH_DB, enrichArray(data, "images")); };
})();
