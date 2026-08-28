/* ==========================================================================
   M-TECH Premium Gadget Store — Authentication Services
   ========================================================================== */

/*
 * Resolve the application profile only after Firebase Auth has produced a
 * real user. This keeps the browser-side role check tied to the same
 * users/{uid} document used by the admin security model.
 */
async function getUserProfile(user) {
  if (!user || !MTECH_CONFIG.db) return null;

  const page = window.location.pathname || "unknown";
  const userRef = MTECH_CONFIG.db.collection("users").doc(user.uid);
  const doc = await userRef.get();
  const data = doc.exists ? doc.data() : null;

  // Safe diagnostics: UID/role/status only. Never log tokens or credentials.
  console.info("[M-TECH auth] auth/profile state", {
    page,
    authenticated: true,
    uid: user.uid,
    provider: (user.providerData || []).map(p => p.providerId).join(",") || "unknown",
    profileExists: doc.exists,
    role: data && data.role ? data.role : null,
    isActive: data && typeof data.isActive === "boolean" ? data.isActive : null
  });

  return data;
}

/* Shared helper: create/refresh the Firestore users/{uid} doc for a Google
   sign-in. Existing admin/customer roles are NEVER overwritten. */
async function ensureGoogleUserDoc(user) {
  const db = MTECH_CONFIG.db;
  const userRef = db.collection("users").doc(user.uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    const userDoc = {
      uid: user.uid,
      name: user.displayName || "Google User",
      email: user.email,
      photoURL: user.photoURL || "",
      role: "customer",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };
    await userRef.set(userDoc);
    console.info("[M-TECH auth] Google profile created as customer", {
      page: window.location.pathname || "unknown",
      uid: user.uid,
      role: "customer",
      isActive: true
    });
    return userDoc;
  }

  await userRef.update({
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  });
  const data = doc.data();
  console.info("[M-TECH auth] Google profile found", {
    page: window.location.pathname || "unknown",
    uid: user.uid,
    role: data.role || null,
    isActive: typeof data.isActive === "boolean" ? data.isActive : null
  });
  return data;
}

const MTECH_AUTH = {
  signUp: async (email, password, name) => {
    if (!MTECH_CONFIG.isEnabled) {
      throw new Error("Firebase is not initialized. Please configure credentials first.");
    }

    const auth = MTECH_CONFIG.auth;
    const db = MTECH_CONFIG.db;
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    const userDoc = {
      uid: user.uid,
      name: name,
      email: email,
      photoURL: "",
      role: "customer",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };

    await db.collection("users").doc(user.uid).set(userDoc);
    await user.updateProfile({ displayName: name });
    return userDoc;
  },

  logIn: async (email, password, remember = true) => {
    if (!MTECH_CONFIG.isEnabled) {
      throw new Error("Firebase is not initialized.");
    }

    const auth = MTECH_CONFIG.auth;
    const db = MTECH_CONFIG.db;
    const persistence = remember
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;

    await auth.setPersistence(persistence);
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const userRef = db.collection("users").doc(user.uid);
    const doc = await userRef.get();

    if (doc.exists) {
      await userRef.update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
      return doc.data();
    }

    const fallbackDoc = {
      uid: user.uid,
      name: user.displayName || email.split("@")[0],
      email: email,
      photoURL: user.photoURL || "",
      role: "customer",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };
    await userRef.set(fallbackDoc);
    return fallbackDoc;
  },

  /* Google login uses popup as the primary flow. The previous implementation
     automatically fell back to redirect for several popup-related errors.
     That made mobile/preview browsers vulnerable to a second problem: the
     OAuth return could race onAuthStateChanged and the login page could make
     a decision before getRedirectResult() had completed. */
  logInWithGoogle: async () => {
    if (!MTECH_CONFIG.isEnabled) {
      throw new Error("Firebase is not initialized.");
    }

    const auth = MTECH_CONFIG.auth;
    const provider = new firebase.auth.GoogleAuthProvider();

    // Make the Google session persistence explicit instead of inheriting an
    // unrelated previous auth choice. Firebase documents LOCAL persistence as
    // the browser persistence that survives page navigation/reloads.
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

    console.info("[M-TECH auth] starting Google popup", {
      page: window.location.pathname || "unknown",
      currentUser: !!auth.currentUser
    });

    try {
      const userCredential = await auth.signInWithPopup(provider);
      const user = userCredential.user;
      console.info("[M-TECH auth] Google authentication succeeded", {
        page: window.location.pathname || "unknown",
        uid: user.uid,
        currentUser: !!auth.currentUser
      });
      return await ensureGoogleUserDoc(user);
    } catch (error) {
      console.error("[M-TECH auth] Google sign-in failed", {
        page: window.location.pathname || "unknown",
        code: error && error.code ? error.code : "unknown",
        message: error && error.message ? error.message : "unknown"
      });

      /* Only genuine popup-blocking/environment errors should enter the
         redirect fallback. A cancelled/closed popup is a user action and
         should not unexpectedly navigate away from the login page. */
      const redirectFallbackCodes = [
        "auth/popup-blocked",
        "auth/operation-not-supported-in-this-environment"
      ];

      if (error && redirectFallbackCodes.includes(error.code)) {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        console.info("[M-TECH auth] Google popup unavailable; starting redirect", {
          page: window.location.pathname || "unknown",
          reason: error.code
        });
        await auth.signInWithRedirect(provider);
        return null;
      }

      throw error;
    }
  },

  completeGoogleRedirectSignIn: async () => {
    if (!MTECH_CONFIG.isEnabled) return null;

    console.info("[M-TECH auth] checking Google redirect result", {
      page: window.location.pathname || "unknown",
      currentUser: !!MTECH_CONFIG.auth.currentUser
    });

    const result = await MTECH_CONFIG.auth.getRedirectResult();
    if (result && result.user) {
      console.info("[M-TECH auth] Google redirect authentication succeeded", {
        page: window.location.pathname || "unknown",
        uid: result.user.uid,
        currentUser: !!MTECH_CONFIG.auth.currentUser
      });
      return await ensureGoogleUserDoc(result.user);
    }

    console.info("[M-TECH auth] no Google redirect result", {
      page: window.location.pathname || "unknown",
      currentUser: !!MTECH_CONFIG.auth.currentUser
    });
    return null;
  },

  resetPassword: async (email) => {
    if (!MTECH_CONFIG.isEnabled) {
      throw new Error("Firebase is not initialized.");
    }
    await MTECH_CONFIG.auth.sendPasswordResetEmail(email);
  },

  logOut: async () => {
    if (MTECH_CONFIG.isEnabled) {
      await MTECH_CONFIG.auth.signOut();
    }
  },

  getCurrentUserDoc: async () => {
    if (!MTECH_CONFIG.isEnabled) return null;
    const user = MTECH_CONFIG.auth.currentUser;
    if (!user) return null;
    return await getUserProfile(user);
  },

  /* Resolve Auth state and the Firestore profile together. The callback is
     never called before the Auth SDK has supplied a real user, preventing an
     admin guard from treating an in-progress Google redirect as a logged-out
     session. */
  onAuthStateChanged: (callback) => {
    if (!MTECH_CONFIG.isEnabled) {
      setTimeout(() => callback(null), 50);
      return () => {};
    }

    return MTECH_CONFIG.auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.info("[M-TECH auth] auth state: signed out", {
          page: window.location.pathname || "unknown"
        });
        callback(null);
        return;
      }

      try {
        const data = await getUserProfile(user);
        if (data) {
          callback({ ...user, ...data });
        } else {
          callback(user);
        }
      } catch (error) {
        console.error("[M-TECH auth] Firestore profile lookup failed", {
          page: window.location.pathname || "unknown",
          uid: user.uid,
          code: error && error.code ? error.code : "unknown",
          message: error && error.message ? error.message : "unknown"
        });
        callback(user);
      }
    });
  }
};

window.MTECH_AUTH = MTECH_AUTH;
