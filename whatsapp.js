/* ==========================================================================
   M-TECH Premium Gadget Store — WhatsApp helpers
   All enquiries route to +234 907 311 2162 (wa.me/2349073112162)
   ========================================================================== */

var WA_NUMBER = "2349073112162";

function waLink(message) {
  return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(message);
}

/* Product enquiry — always includes the exact product name. */
function waProductLink(productName) {
  return waLink("Hello M-TECH, I'm interested in the " + productName + ". Please tell me the current price and availability.");
}

function waGeneralLink() {
  return waLink("Hello M-TECH, I would like to ask about a gadget. Please assist me.");
}

function waIconSVG() {
  return '<svg class="wa-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.02a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.18 4.23-9.4 9.43-9.4a9.36 9.36 0 0 1 6.66 2.76 9.32 9.32 0 0 1 2.76 6.65c0 5.18-4.23 9.41-9.43 9.41M20.46 3.53A11.7 11.7 0 0 0 12.05 0C5.57 0 .3 5.26.3 11.72c0 2.07.54 4.08 1.57 5.86L.2 24l6.57-1.72a11.8 11.8 0 0 0 5.28 1.26h.01c6.48 0 11.75-5.26 11.75-11.72 0-3.13-1.22-6.07-3.44-8.29"/></svg>';
}

/* Wire every element that should open WhatsApp:
   data-wa            -> general enquiry
   data-wa-product    -> product enquiry with that exact product name
   data-wa-message    -> custom message                                   */
function initWhatsAppLinks(scope) {
  var root = scope || document;
  root.querySelectorAll("[data-wa-product]").forEach(function (el) {
    el.setAttribute("href", waProductLink(el.getAttribute("data-wa-product")));
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  });
  root.querySelectorAll("[data-wa-message]").forEach(function (el) {
    el.setAttribute("href", waLink(el.getAttribute("data-wa-message")));
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  });
  root.querySelectorAll("[data-wa]").forEach(function (el) {
    if (!el.getAttribute("href") || el.getAttribute("href") === "#") {
      el.setAttribute("href", waGeneralLink());
    }
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  });
}
