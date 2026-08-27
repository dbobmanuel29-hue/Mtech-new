/* ==========================================================================
   M-TECH — Account Button Renderer
   Runs immediately after navigation.js wires auth state.
   Ensures a visible Account/Login button is ALWAYS in the header
   and mobile panel, driven by Firebase auth state.
   ========================================================================== */
(function () {
  "use strict";

  /* Inline SVG icons */
  var USER_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
  var ADMIN_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';

  /* Escape helper (products.js may not be loaded on auth pages) */
  function esc(s) {
    return (typeof escapeHTML === "function")
      ? escapeHTML(s == null ? "" : s)
      : String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
  }

  /* Truncate name for nav display */
  function shortName(name) {
    if (!name) return "Account";
    var parts = name.trim().split(" ");
    return parts[0].length > 12 ? parts[0].slice(0, 10) + "…" : parts[0];
  }

  /* ------------------------------------------------------------------
     Render the account area inside .nav-actions (desktop)
     and inside .mobile-panel .container (mobile).
     Called by auth state listener.
  ------------------------------------------------------------------ */
  function render(user) {
    /* ---------- DESKTOP ---------- */
    var actions = document.querySelector(".nav-actions");
    if (actions) {
      // Remove any previous auth btn so we don't duplicate
      var prev = actions.querySelector(".auth-acc-btn-wrap");
      if (prev) prev.remove();

      var wrap = document.createElement("div");
      wrap.className = "auth-acc-btn-wrap";
      wrap.style.cssText = "display:flex;align-items:center;gap:8px";

      if (!user) {
        wrap.innerHTML =
          '<a class="btn btn--light btn--sm" href="login.html" style="display:flex;align-items:center;gap:6px">' +
            USER_ICON + ' Login' +
          '</a>' +
          '<a class="btn btn--dark btn--sm" href="signup.html">Sign Up</a>';
      } else {
        var isAdmin = user.role === "admin";
        var avatar = user.photoURL
          ? '<img src="' + esc(user.photoURL) + '" alt="" style="width:26px;height:26px;border-radius:50%;object-fit:cover;flex:none">'
          : '<span style="width:26px;height:26px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;flex:none;font-size:.7rem;font-weight:800">' +
              esc((user.name || user.email || "U")[0].toUpperCase()) +
            '</span>';

        wrap.innerHTML =
          '<a class="btn btn--light btn--sm" href="account.html" style="display:flex;align-items:center;gap:7px;max-width:160px;overflow:hidden">' +
            avatar +
            '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(shortName(user.name)) + '</span>' +
          '</a>' +
          (isAdmin
            ? '<a class="btn btn--sm" href="admin.html" style="display:flex;align-items:center;gap:6px;background:var(--wa);color:#fff;border:none">' +
                ADMIN_ICON + ' Admin</a>'
            : '') +
          '<button class="btn btn--ghost btn--sm js-logout" title="Log out">&#10005;</button>';
      }

      // Insert before the WA button
      var waBtn = actions.querySelector("[data-wa]");
      if (waBtn) {
        actions.insertBefore(wrap, waBtn);
      } else {
        actions.insertBefore(wrap, actions.firstChild);
      }
    }

    /* ---------- MOBILE ---------- */
    var mobileContainer = document.querySelector(".mobile-panel .container");
    if (mobileContainer) {
      var existing = mobileContainer.querySelector(".mobile-auth-section");
      if (existing) existing.remove();

      var mSection = document.createElement("div");
      mSection.className = "mobile-auth-section";

      if (!user) {
        mSection.innerHTML =
          '<p class="m-group-title">My Account</p>' +
          '<a class="m-link" href="login.html">Login <span>&rarr;</span></a>' +
          '<a class="m-link" href="signup.html">Create Account <span>&rarr;</span></a>';
      } else {
        var isAdmin = user.role === "admin";
        mSection.innerHTML =
          '<p class="m-group-title">Hi, ' + esc(shortName(user.name)) + '</p>' +
          '<a class="m-link" href="account.html">My Account <span>&rarr;</span></a>' +
          '<a class="m-link" href="account.html#saved">Saved Gadgets <span>&rarr;</span></a>' +
          '<a class="m-link" href="account.html#requests">My Requests <span>&rarr;</span></a>' +
          (isAdmin
            ? '<a class="m-link" href="admin.html" style="font-weight:700;color:var(--wa)">Admin Dashboard <span>&rarr;</span></a>'
            : '') +
          '<a class="m-link js-logout" href="#" style="color:#d98b84">Sign Out <span>&rarr;</span></a>';
      }

      // Insert before .mobile-cta
      var mobileCta = mobileContainer.querySelector(".mobile-cta");
      if (mobileCta) {
        mobileContainer.insertBefore(mSection, mobileCta);
      } else {
        mobileContainer.appendChild(mSection);
      }

      // Bind logout inside mobile section
      mSection.querySelectorAll(".js-logout").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          if (window.MTECH_AUTH) MTECH_AUTH.logOut().then(function () { window.location.href = "index.html"; });
        });
      });
    }

    // Desktop logout buttons
    document.querySelectorAll(".auth-acc-btn-wrap .js-logout").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        if (window.MTECH_AUTH) MTECH_AUTH.logOut().then(function () { window.location.href = "index.html"; });
      });
    });
  }

  /* ------------------------------------------------------------------
     Boot: wait for MTECH_AUTH to be available, then listen.
  ------------------------------------------------------------------ */
  function boot() {
    if (window.MTECH_AUTH) {
      MTECH_AUTH.onAuthStateChanged(function (user) {
        render(user);
      });
    } else {
      // Firebase not configured — show guest nav immediately
      render(null);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
