/* M-TECH — enrich existing Firestore media writes with Cloudinary metadata. */
(function () {
  "use strict";
  if (window.MTECH_CLOUDINARY_FIRESTORE_WIRED || !window.MTECH_DB || !window.MTECH_CLOUDINARY) return;
  window.MTECH_CLOUDINARY_FIRESTORE_WIRED = true;
  function mediaFor(urls) { return MTECH_CLOUDINARY.getMediaForUrls(urls || []); }
  function enrichSingle(data, field) { var copy = Object.assign({}, data), url = copy[field], media = url ? mediaFor([url])[0] : null; if (media && media.publicId) { copy[field + "PublicId"] = media.publicId; copy[field + "ResourceType"] = media.resourceType || "image"; } return copy; }
  function enrichArray(data, field) { var copy = Object.assign({}, data), urls = Array.isArray(copy[field]) ? copy[field] : [], media = mediaFor(urls); var ids = media.filter(function (m) { return m.publicId; }).map(function (m) { return m.publicId; }); if (ids.length) copy[field + "PublicIds"] = ids; if (media.some(function (m) { return m.publicId; })) copy[field + "Media"] = media; return copy; }
  var originalProduct = MTECH_DB.saveProduct;
  MTECH_DB.saveProduct = function (id, data) { var copy = enrichArray(data, "images"), main = copy.thumbnail || copy.image, mainMedia = main ? mediaFor([main])[0] : null; if (mainMedia && mainMedia.publicId) { copy.imagePublicId = mainMedia.publicId; copy.imageResourceType = mainMedia.resourceType || "image"; } return originalProduct.call(MTECH_DB, id, copy); };
  var originalCategory = MTECH_DB.saveCategory; MTECH_DB.saveCategory = function (id, data) { return originalCategory.call(MTECH_DB, id, enrichSingle(data, "image")); };
  var originalTestimonial = MTECH_DB.saveTestimonial; MTECH_DB.saveTestimonial = function (id, data) { return originalTestimonial.call(MTECH_DB, id, enrichSingle(data, "image")); };
  var originalPromotion = MTECH_DB.savePromotion; MTECH_DB.savePromotion = function (id, data) { return originalPromotion.call(MTECH_DB, id, enrichSingle(data, "image")); };
  var originalSell = MTECH_DB.saveSellRequest; MTECH_DB.saveSellRequest = function (data) { return originalSell.call(MTECH_DB, enrichArray(data, "images")); };
  var originalSwap = MTECH_DB.saveSwapRequest; MTECH_DB.saveSwapRequest = function (data) { return originalSwap.call(MTECH_DB, enrichArray(data, "images")); };
})();
