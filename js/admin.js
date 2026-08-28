/* M-TECH admin loader: preserve the existing dashboard core while adding the secure Users module. */
(function () {
  function load(src) { document.write('<script src="' + src + '"><\/script>'); }
  load("/admin-core.js");
  load("/admin-users.js");
})();
