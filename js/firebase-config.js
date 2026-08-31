/* ==========================================================================
   M-TECH Premium Gadget Store — Firebase & Cloudinary Config
   --------------------------------------------------------------------------
   Firebase client configuration is safe to expose in the browser.
   Cloudinary private credentials are NEVER stored here; the uploader gets
   the public cloud name/upload preset from /api/cloudinary/config.
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyBIfqI7gLRqoWjNjOFG6yb6egP5do405Ac",
  authDomain: "m-tech-gadget-store.firebaseapp.com",
  projectId: "m-tech-gadget-store",
  storageBucket: "m-tech-gadget-store.firebasestorage.app",
  messagingSenderId: "343823032838",
  appId: "1:343823032838:web:0289a8291c9815fe21d987"
};

// Cloudinary public values are normally supplied by /api/cloudinary/config.
// Do not place an API secret or private credential in this file.
const cloudinaryConfig = { cloudName: "", uploadPreset: "" };

let isFirebaseEnabled = false;

function looksLikeRealFirebaseConfig(cfg) {
  return !!(
    cfg && cfg.apiKey && cfg.apiKey.indexOf("YOUR_") !== 0 && cfg.apiKey.length > 20 &&
    cfg.projectId && cfg.projectId.indexOf("YOUR_") !== 0 &&
    cfg.appId && cfg.appId.indexOf("YOUR_") !== 0 && cfg.appId.indexOf(":") > -1 &&
    cfg.authDomain && cfg.authDomain.indexOf("YOUR_") !== 0
  );
}

if (typeof firebase === "undefined") {
  console.error("M-TECH: The Firebase SDK did not load. Check the Firebase script order and network policy.");
} else if (!looksLikeRealFirebaseConfig(firebaseConfig)) {
  console.warn("M-TECH Firebase running in OFFLINE/STATIC fallback mode. Paste real Firebase credentials in js/firebase-config.js.");
} else {
  try {
    const app = firebase.apps && firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(firebaseConfig);
    firebase.auth();
    firebase.firestore();
    isFirebaseEnabled = true;
    console.log("M-TECH Firebase initialized successfully for project:", firebaseConfig.projectId);
  } catch (error) {
    isFirebaseEnabled = false;
    console.error("M-TECH Firebase initialization failed:", error);
  }
}

const MTECH_CONFIG = {
  get db() { return isFirebaseEnabled ? firebase.firestore() : null; },
  get auth() { return isFirebaseEnabled ? firebase.auth() : null; },
  get isEnabled() { return isFirebaseEnabled; },
  get cloudinary() { return cloudinaryConfig; }
};

window.firebaseConfig = firebaseConfig;
window.cloudinaryConfig = cloudinaryConfig;
window.MTECH_CONFIG = MTECH_CONFIG;

/* Load the category bridge without interfering with Firebase/auth startup. */
(function () {
  var s = document.createElement("script");
  s.src = "/js/category-sync-fix.js";
  s.async = false;
  document.head.appendChild(s);
})();
