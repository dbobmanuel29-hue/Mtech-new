/* ========================================================================== 
   M-TECH Premium Gadget Store — Authentication Services
   ========================================================================== */

function mtechAuthTrace(label, details) {
  if (details === undefined) console.info("[M-TECH AUTH TRACE] " + label);
  else console.info("[M-TECH AUTH TRACE] " + label, details);
}

console.info("[M-TECH GOOGLE DEBUG] AUTH MODULE LOADED", { build: "google-trace-2026-08-28-01", url: window.location.href });

/* Capture-phase diagnostic: this runs before normal bubbling handlers and never
   invokes authentication. It proves whether the browser's click reaches the
   actual #google-btn element at all. */
document.addEventListener("click", function (event) {
  var target = event && event.target;
  var button = target && typeof target.closest === "function" ? target.closest("#google-btn") : null;
  if (!button) return;
  console.info("[M-TECH GOOGLE EVENT] CAPTURE CLICK DETECTED", {
    targetTag: target && target.tagName ? target.tagName : null,
    targetId: target && target.id ? target.id : null,
    buttonId: button.id,
    buttonDisabled: !!button.disabled,
    defaultPrevented: !!event.defaultPrevented,
    currentUrl: window.location.href
  });
  setTimeout(function () {
    console.info("[M-TECH GOOGLE EVENT] AFTER CAPTURE CLICK", {
      buttonStillInDom: document.getElementById("google-btn") === button,
      defaultPrevented: !!event.defaultPrevented,
      currentUser: MTECH_CONFIG && MTECH_CONFIG.auth && MTECH_CONFIG.auth.currentUser ? MTECH_CONFIG.auth.currentUser.uid : null,
      currentUrl: window.location.href
    });
  }, 0);
}, true);

function mtechSafeAuthState(auth) {
  var user = auth && auth.currentUser;
  return {
    state: user ? "signed in" : "signed out",
    uid: user ? user.uid : null,
    email: user ? (user.email || null) : null,
    provider: user ? ((user.providerData || []).map(function(p){ return p.providerId; }).join(",") || "unknown") : null,
    url: window.location.href
  };
}

function mtechStorageDiagnostics() {
  var result = { localStorage: false, sessionStorage: false, indexedDB: false };
  try { var k="__mtech_storage_test__"; localStorage.setItem(k,"1"); localStorage.removeItem(k); result.localStorage=true; } catch(e) {}
  try { var s="__mtech_session_test__"; sessionStorage.setItem(s,"1"); sessionStorage.removeItem(s); result.sessionStorage=true; } catch(e) {}
  try { result.indexedDB = !!window.indexedDB; } catch(e) {}
  mtechAuthTrace("BROWSER STORAGE", result);
  return result;
}

async function getUserProfile(user) {
  if (!user || !MTECH_CONFIG.db) return null;
  const page = window.location.pathname || "unknown";
  const userRef = MTECH_CONFIG.db.collection("users").doc(user.uid);
  const doc = await userRef.get();
  const data = doc.exists ? doc.data() : null;
  console.info("[M-TECH auth] auth/profile state", { page, authenticated: true, uid: user.uid, email: user.email || null, provider: (user.providerData || []).map(p => p.providerId).join(",") || "unknown", profileExists: doc.exists, role: data && data.role ? data.role : null, isActive: data && typeof data.isActive === "boolean" ? data.isActive : null });
  return data;
}

async function ensureGoogleUserDoc(user) {
  const db = MTECH_CONFIG.db;
  const userRef = db.collection("users").doc(user.uid);
  const doc = await userRef.get();
  if (!doc.exists) {
    const userDoc = { uid: user.uid, name: user.displayName || "Google User", email: user.email, photoURL: user.photoURL || "", role: "customer", createdAt: firebase.firestore.FieldValue.serverTimestamp(), lastLogin: firebase.firestore.FieldValue.serverTimestamp(), isActive: true };
    await userRef.set(userDoc);
    console.info("[M-TECH auth] Google profile created as customer", { page: window.location.pathname || "unknown", uid: user.uid, role: "customer", isActive: true });
    return userDoc;
  }
  await userRef.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
  const data = doc.data();
  console.info("[M-TECH auth] Google profile found", { page: window.location.pathname || "unknown", uid: user.uid, role: data.role || null, isActive: typeof data.isActive === "boolean" ? data.isActive : null });
  return data;
}

const MTECH_AUTH = {
  signUp: async (email, password, name) => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized. Please configure credentials first.");
    const auth = MTECH_CONFIG.auth;
    const db = MTECH_CONFIG.db;
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const userDoc = { uid: user.uid, name, email, photoURL: "", role: "customer", createdAt: firebase.firestore.FieldValue.serverTimestamp(), lastLogin: firebase.firestore.FieldValue.serverTimestamp(), isActive: true };
    await db.collection("users").doc(user.uid).set(userDoc);
    await user.updateProfile({ displayName: name });
    return userDoc;
  },

  logIn: async (email, password, remember = true) => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");
    const auth = MTECH_CONFIG.auth;
    const db = MTECH_CONFIG.db;
    const persistence = remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
    await auth.setPersistence(persistence);
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const userRef = db.collection("users").doc(user.uid);
    const doc = await userRef.get();
    if (doc.exists) { await userRef.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() }); return doc.data(); }
    const fallbackDoc = { uid: user.uid, name: user.displayName || email.split("@")[0], email, photoURL: user.photoURL || "", role: "customer", createdAt: firebase.firestore.FieldValue.serverTimestamp(), lastLogin: firebase.firestore.FieldValue.serverTimestamp(), isActive: true };
    await userRef.set(fallbackDoc);
    return fallbackDoc;
  },

  logInWithGoogle: async () => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");
    const auth = MTECH_CONFIG.auth;
    const provider = new firebase.auth.GoogleAuthProvider();
    const authInstance = auth;
    mtechAuthTrace("GOOGLE AUTH FUNCTION ENTERED", { url: window.location.href, provider: provider.providerId, firebaseApps: typeof firebase !== "undefined" && firebase.apps ? firebase.apps.length : null, firebaseAppName: firebase.app().name, sameAuthInstance: MTECH_CONFIG.auth === firebase.auth(), authState: mtechSafeAuthState(authInstance) });
    mtechStorageDiagnostics();
    console.info("[M-TECH auth] Google button authentication starting", { page: window.location.pathname || "unknown", firebaseProjectId: authInstance.app && authInstance.app.options ? authInstance.app.options.projectId : null, authDomain: authInstance.app && authInstance.app.options ? authInstance.app.options.authDomain : null, authAppName: authInstance.app ? authInstance.app.name : null, provider: provider.providerId, currentUser: authInstance.currentUser ? authInstance.currentUser.uid : null });
    try {
      console.info("[M-TECH auth] Starting Google sign-in with popup", { page: window.location.pathname || "unknown" });
      await authInstance.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      console.info("[M-TECH auth] Google persistence set to LOCAL");
      mtechAuthTrace("BEFORE signInWithPopup", { providerId: provider.providerId, authState: mtechSafeAuthState(authInstance), url: window.location.href });
      let userCredential;
      try {
        var popupSettled = false;
        var popupPromise = authInstance.signInWithPopup(provider);
        popupPromise.then(function () { popupSettled = true; }, function () { popupSettled = true; });
        setTimeout(function () {
          if (!popupSettled) {
            mtechAuthTrace("signInWithPopup STILL PENDING", { elapsedMs: 10000, authState: mtechSafeAuthState(authInstance), providerId: provider.providerId, url: window.location.href, storage: mtechStorageDiagnostics() });
          }
        }, 10000);
        userCredential = await popupPromise;
        mtechAuthTrace("signInWithPopup RESOLVED", { hasCredential: !!userCredential, hasUser: !!(userCredential && userCredential.user), authState: mtechSafeAuthState(authInstance), providerId: provider.providerId, url: window.location.href });
      } catch (error) {
        mtechAuthTrace("signInWithPopup REJECTED", { code: error && error.code ? error.code : "unknown", message: error && error.message ? error.message : "unknown", name: error && error.name ? error.name : "unknown", providerId: provider.providerId, authStateBeforeAfter: mtechSafeAuthState(authInstance), url: window.location.href });
        throw error;
      }
      const user = userCredential && userCredential.user;
      if (!user) { const error = new Error("Firebase signInWithPopup completed without returning a user."); error.code = "auth/no-user-returned"; throw error; }
      console.info("[M-TECH auth] Google sign-in succeeded", { page: window.location.pathname || "unknown", uid: user.uid, email: user.email || null, provider: (user.providerData || []).map(p => p.providerId).join(",") || "unknown", currentUser: !!authInstance.currentUser });
      return await ensureGoogleUserDoc(user);
    } catch (error) {
      console.error("[M-TECH auth] Google sign-in failed", { page: window.location.pathname || "unknown", firebaseProjectId: authInstance.app && authInstance.app.options ? authInstance.app.options.projectId : null, authDomain: authInstance.app && authInstance.app.options ? authInstance.app.options.authDomain : null, provider: provider.providerId, currentUser: authInstance.currentUser ? authInstance.currentUser.uid : null, code: error && error.code ? error.code : "unknown", message: error && error.message ? error.message : "unknown", name: error && error.name ? error.name : "unknown" });
      const redirectFallbackCodes = ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"];
      if (error && redirectFallbackCodes.includes(error.code)) {
        try { await authInstance.setPersistence(firebase.auth.Auth.Persistence.LOCAL); console.info("[M-TECH auth] Google popup unavailable; starting redirect", { page: window.location.pathname || "unknown", reason: error.code }); await authInstance.signInWithRedirect(provider); return null; }
        catch (redirectError) { console.error("[M-TECH auth] Google redirect fallback failed", { page: window.location.pathname || "unknown", code: redirectError && redirectError.code ? redirectError.code : "unknown", message: redirectError && redirectError.message ? redirectError.message : "unknown", name: redirectError && redirectError.name ? redirectError.name : "unknown" }); throw redirectError; }
      }
      throw error;
    }
  },

  completeGoogleRedirectSignIn: async () => {
    if (!MTECH_CONFIG.isEnabled) return null;
    mtechAuthTrace("getRedirectResult START", { url: window.location.href, authState: mtechSafeAuthState(MTECH_CONFIG.auth) });
    console.info("[M-TECH auth] checking Google redirect result", { page: window.location.pathname || "unknown", currentUser: !!MTECH_CONFIG.auth.currentUser });
    try {
      const result = await MTECH_CONFIG.auth.getRedirectResult();
      mtechAuthTrace("getRedirectResult RESOLVED", { hasResult: !!result, hasCredential: !!(result && result.credential), hasUser: !!(result && result.user), authState: mtechSafeAuthState(MTECH_CONFIG.auth), url: window.location.href });
      if (result && result.user) { console.info("[M-TECH auth] Google redirect authentication succeeded", { page: window.location.pathname || "unknown", uid: result.user.uid, email: result.user.email || null, provider: (result.user.providerData || []).map(p => p.providerId).join(",") || "unknown", currentUser: !!MTECH_CONFIG.auth.currentUser }); return await ensureGoogleUserDoc(result.user); }
      console.info("[M-TECH auth] no Google redirect result", { page: window.location.pathname || "unknown", currentUser: !!MTECH_CONFIG.auth.currentUser });
      return null;
    } catch (error) {
      mtechAuthTrace("getRedirectResult REJECTED", { code: error && error.code ? error.code : "unknown", message: error && error.message ? error.message : "unknown", name: error && error.name ? error.name : "unknown", authState: mtechSafeAuthState(MTECH_CONFIG.auth), url: window.location.href });
      console.error("[M-TECH auth] Google redirect result failed", { page: window.location.pathname || "unknown", code: error && error.code ? error.code : "unknown", message: error && error.message ? error.message : "unknown" });
      throw error;
    }
  },

  resetPassword: async (email) => { if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized."); await MTECH_CONFIG.auth.sendPasswordResetEmail(email); },
  logOut: async () => { if (MTECH_CONFIG.isEnabled) await MTECH_CONFIG.auth.signOut(); },
  getCurrentUserDoc: async () => { if (!MTECH_CONFIG.isEnabled) return null; const user = MTECH_CONFIG.auth.currentUser; if (!user) return null; return await getUserProfile(user); },
  onAuthStateChanged: (callback) => {
    if (!MTECH_CONFIG.isEnabled) { setTimeout(() => callback(null), 50); return () => {}; }
    mtechAuthTrace("AUTH STATE LISTENER REGISTERED", { firebaseApps: firebase.apps.length, firebaseAppName: firebase.app().name, sameAuthInstance: MTECH_CONFIG.auth === firebase.auth(), authState: mtechSafeAuthState(MTECH_CONFIG.auth) });
    return MTECH_CONFIG.auth.onAuthStateChanged(async (user) => {
      mtechAuthTrace("AUTH STATE CHANGED", { signedIn: !!user, uid: user ? user.uid : null, email: user ? (user.email || null) : null, provider: user ? ((user.providerData || []).map(p => p.providerId).join(",") || "unknown") : null, url: window.location.href });
      if (!user) { console.info("[M-TECH auth] auth state: signed out", { page: window.location.pathname || "unknown", currentUser: false }); callback(null); return; }
      console.info("[M-TECH auth] auth state: signed in", { page: window.location.pathname || "unknown", uid: user.uid, email: user.email || null, provider: (user.providerData || []).map(p => p.providerId).join(",") || "unknown" });
      try { const data = await getUserProfile(user); if (data) callback({ ...user, ...data }); else callback(user); }
      catch (error) { console.error("[M-TECH auth] Firestore profile lookup failed", { page: window.location.pathname || "unknown", uid: user.uid, code: error && error.code ? error.code : "unknown", message: error && error.message ? error.message : "unknown" }); callback(user); }
    });
  }
};

window.MTECH_AUTH = MTECH_AUTH;
