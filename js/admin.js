/* M-TECH admin loader: preserve the existing dashboard core while adding the secure Users module. */
(function () {
  function load(src) { document.write('<script src="' + src + '"><\\/script>'); }
  load("/js/cloudinary-firestore.js");
  load("/js/admin-firestore-online.js");
  load("/admin-core.js");
  load("/admin-users.js");
  load("/js/admin-crud-repair.js");
  load("/js/admin-ui-fix.js");
})();
