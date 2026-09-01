/* M-TECH admin loader.
   Use dynamically inserted script elements instead of document.write so
   admin.html can initialize reliably after parsing. Authentication code is
   not modified here. */
(function () {
  "use strict";

  var scripts = [
    "/js/cloudinary-firestore.js",
    "/js/admin-firestore-online.js",
    "/admin-core.js",
    "/admin-users.js",
    "/js/admin-crud-repair.js",
    "/js/admin-ui-fix.js"
  ];

  function loadNext(index) {
    if (index >= scripts.length) {
      console.log("[M-TECH ADMIN] All admin modules loaded");
      return;
    }

    var script = document.createElement("script");
    script.src = scripts[index];
    script.async = false;
    script.onload = function () { loadNext(index + 1); };
    script.onerror = function () {
      console.error("[M-TECH ADMIN] Failed to load:", scripts[index]);
      loadNext(index + 1);
    };
    (document.head || document.body).appendChild(script);
  }

  loadNext(0);
})();
