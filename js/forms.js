/* ==========================================================================
   M-TECH Premium Gadget Store — Forms
   No backend, no database: every form composes a WhatsApp message and opens
   the chat with M-TECH (+234 907 311 2162) pre-filled.
   ========================================================================== */

function showStatus(form, message, isError) {
  var box = form.querySelector(".form-status");
  if (!box) return;
  box.textContent = message;
  box.classList.add("is-visible");
  box.classList.toggle("is-error", !!isError);
  box.setAttribute("role", "status");
}

function val(form, name) {
  var f = form.elements[name];
  return f ? String(f.value || "").trim() : "";
}

function openWhatsApp(message) {
  var url = waLink(message);
  var win = window.open(url, "_blank", "noopener");
  if (!win) window.location.href = url;
}

/* ------------------------------------------------ contact page form ---- */
function initContactForm() {
  var form = document.getElementById("contact-form");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var msg =
      "Hello M-TECH, I would like to make an enquiry." +
      "\n\nName: " + val(form, "name") +
      "\nPhone: " + val(form, "phone") +
      (val(form, "email") ? "\nEmail: " + val(form, "email") : "") +
      (val(form, "topic") ? "\nTopic: " + val(form, "topic") : "") +
      "\n\nMessage: " + val(form, "message");
    openWhatsApp(msg);
    showStatus(form, "Opening WhatsApp with your message to M-TECH. If nothing opens, chat with us directly on " + MTECH.phoneDisplay + ".");
    form.reset();
  });
}

/* --------------------------------------------- buy / sell / swap form -- */
function initTradeForm() {
  var form = document.getElementById("trade-form");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var intent = val(form, "intent");
    var lines = [
      "Hello M-TECH, I would like to " + (intent ? intent.toLowerCase() : "trade") + " a device.",
      "",
      "Name: " + val(form, "name"),
      "Phone: " + val(form, "phone"),
      "Device: " + val(form, "device"),
      "Storage: " + val(form, "storage"),
      "Condition: " + val(form, "condition"),
      "Battery health: " + val(form, "battery"),
      "I want to: " + intent
    ];
    if (val(form, "target")) lines.push("Interested in: " + val(form, "target"));
    if (val(form, "message")) lines.push("", "Message: " + val(form, "message"));
    openWhatsApp(lines.join("\n"));
    showStatus(form, "Opening WhatsApp with your device details. M-TECH will review and reply with the next step.");
    form.reset();
  });
}

/* ------------------------------------------------ quick enquiry forms -- */
function initQuickForms() {
  document.querySelectorAll("form[data-wa-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var intro = form.getAttribute("data-wa-form") || "Hello M-TECH, I have an enquiry.";
      var parts = [intro, ""];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === "submit" || !el.value) return;
        var label = form.querySelector('label[for="' + el.id + '"]');
        parts.push((label ? label.textContent.replace("*", "").trim() : el.name) + ": " + el.value.trim());
      });
      openWhatsApp(parts.join("\n"));
      showStatus(form, "Opening WhatsApp so you can send this to M-TECH.");
      form.reset();
    });
  });
}

function initForms() {
  initContactForm();
  initTradeForm();
  initQuickForms();
}
