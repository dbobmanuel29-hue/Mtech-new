/* ==========================================================================
   M-TECH Premium Gadget Store — Firebase & Cloudinary Config
   --------------------------------------------------------------------------
   Configure your Firebase Spark Plan credentials and Cloudinary details below.
   You do NOT need a paid plan.
   ========================================================================== */

// --- FIREBASE CONFIGURATION (M-TECH Gadget Store — live Firebase project) ---
const firebaseConfig = {
  apiKey: "AIzaSyBIfqI7gLRqoWjNjOFG6yb6egP5do405Ac",
  authDomain: "m-tech-gadget-store.firebaseapp.com",
  projectId: "m-tech-gadget-store",
  storageBucket: "m-tech-gadget-store.firebasestorage.app",
  messagingSenderId: "343823032838",
  appId: "1:343823032838:web:0289a8291c9815fe21d987"
};

// --- CLOUDINARY CONFIGURATION (Paste your unsigned upload details from Cloudinary) ---
const cloudinaryConfig = {
  cloudName: "YOUR_CLOUD_NAME",
  uploadPreset: "YOUR_UPLOAD_PRESET" // MUST be an "unsigned" preset
};

// ==========================================================================
// Initialization & Fallback Checks
// ==========================================================================

let isFirebaseEnabled = false;

// Real config = present, non-placeholder, and shaped like genuine Firebase values.
// (String-matching alone was too fragile — this also protects against a
// half-pasted config silently limping along in "offline" mode.)
function looksLikeRealFirebaseConfig(cfg) {
  return !!(
    cfg &&
    cfg.apiKey && cfg.apiKey.indexOf("YOUR_") !== 0 && cfg.apiKey.length > 20 &&
    cfg.projectId && cfg.projectId.indexOf("YOUR_") !== 0 &&
    cfg.appId && cfg.appId.indexOf("YOUR_") !== 0 && cfg.appId.indexOf(":") > -1 &&
    cfg.authDomain && cfg.authDomain.indexOf("YOUR_") !== 0
  );
}

if (typeof firebase === "undefined") {
  // The Firebase SDK <script> tags failed to load (network issue, ad-blocker,
  // wrong script order, etc). This is a genuine failure — surface it clearly.
  console.error(
    "M-TECH: The Firebase SDK did not load (window.firebase is undefined). " +
    "Check that the firebase-app/auth/firestore <script> tags load BEFORE js/firebase-config.js, " +
    "and that no ad-blocker/network policy is blocking www.gstatic.com."
  );
} else if (!looksLikeRealFirebaseConfig(firebaseConfig)) {
  console.warn("M-TECH Firebase running in OFFLINE/STATIC fallback mode. Paste real Firebase credentials in js/firebase-config.js.");
} else {
  try {
    // Guard against accidental double-initialization (e.g. a script included twice).
    const app = firebase.apps && firebase.apps.length
      ? firebase.apps[0]
      : firebase.initializeApp(firebaseConfig);

    // Touch auth/firestore now so a bad API key or disabled service fails loudly,
    // right here, instead of silently later on first use.
    firebase.auth();
    firebase.firestore();

    isFirebaseEnabled = true;
    console.log("M-TECH Firebase initialized successfully for project:", firebaseConfig.projectId);
  } catch (error) {
    isFirebaseEnabled = false;
    console.error("M-TECH Firebase initialization failed:", error);
  }
}

// Global configurations helper
const MTECH_CONFIG = {
  get db() {
    return isFirebaseEnabled ? firebase.firestore() : null;
  },
  get auth() {
    return isFirebaseEnabled ? firebase.auth() : null;
  },
  get isEnabled() {
    return isFirebaseEnabled;
  },
  get cloudinary() {
    return cloudinaryConfig;
  }
};

// Top-level const/let bindings are not exposed as window properties in
// browsers. Several pages intentionally check window.MTECH_CONFIG before using
// Firebase, so expose the shared singleton explicitly.
window.firebaseConfig = firebaseConfig;
window.cloudinaryConfig = cloudinaryConfig;
window.MTECH_CONFIG = MTECH_CONFIG;
