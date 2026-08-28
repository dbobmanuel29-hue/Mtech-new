/* ==========================================================================
   M-TECH Premium Gadget Store — Authentication Services
   ========================================================================== */

async function getUserProfile(user) {
  if (!user || !MTECH_CONFIG.db) return null;

  const page = window.location.pathname || "unknown";
  const userRef = MTECH_CONFIG.db.collection("users").doc(user.uid);
  const doc = await userRef.get();
  const data = doc.exists ? doc.data() : null;

  console.info("[M-TECH auth] auth/profile state", {
    page,
    authenticated: true,
    uid: user.uid,
    email: user.email || null,
    provider: (user.providerData || []).map(p => p.providerId).join(",") || "unknown",
    profileExists: doc.exists,
    role: data && data.role ? data.role : null,
    isActive: data && typeof data.isActive === "boolean" ? data.isActive : null
  });

  return data;
}

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
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized. Please configure credentials first.");
    const auth = MTECH_CONFIG.auth;
    const db = MTECH_CONFIG.db;
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const userDoc = {
      uid: user.uid,
      name,
      email,
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
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");
    const auth = MTECH_CONFIG.auth;
    const db = MTECH_CONFIG.db;
    const persistence = remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
    await auth.setPersistence(persistence);
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const userRef = db.collection("users").doc(user.uid);
    const doc = await userRef.get();
    if (doc.exists) {
      await userRef.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
      return doc.data();
    }
    const fallbackDoc = {
      uid: user.uid,
      name: user.displayName || email.split("@")[0],
      email,
      photoURL: user.photoURL || "",
      role: "customer",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };
    await userRef.set(fallbackDoc);
    return fallbackDoc;
  },

  logInWithGoogle: async () => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");

    const auth = MTECH_CONFIG.auth;
    const provider = new firebase.auth.GoogleAuthProvider();
    const authInstance = auth;

    console.info("[M-TECH auth] Google button authentication starting", {
      page: window.location.pathname || "unknown",
      firebaseProjectId: authInstance.app && authInstance.app.options ? authInstance.app.options.projectId : null,
      authDomain: authInstance.app && authInstance.app.options ? authInstance.app.options.authDomain : null,
      authAppName: authInstance.app ? authInstance.app.name : null,
      provider: provider.providerId,
      currentUser: authInstance.currentUser ? authInstance.currentUser.uid : null
    });

    try {
      console.info("[M-TECH auth] Starting Google sign-in with popup", {
        page: window.location.pathname || "unknown"
      });

      await authInstance.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      console.info("[M-TECH auth] Google persistence set to LOCAL");

      const userCredential = await authInstance.signInWithPopup(provider);
      const user = userCredential && userCredential.user;

      if (!user) {
        const error = new Error("Firebase signInWithPopup completed without returning a user.");
        error.code = "auth/no-user-returned";
        throw error;
      }

      console.info("[M-TECH auth] Google sign-in succeeded", {
        page: window.location.pathname || "unknown",
        uid: user.uid,
        email: user.email || null,
        provider: (user.providerData || []).map(p => p.providerId).join(",") || "unknown",
        currentUser: !!authInstance.currentUser
      });

      return await ensureGoogleUserDoc(user);
    } catch (error) {
      console.error("[M-TECH auth] Google sign-in failed", {
        page: window.location.pathname || "unknown",
        firebaseProjectId: authInstance.app && authInstance.app.options ? authInstance.app.options.projectId : null,
        authDomain: authInstance.app && authInstance.app.options ? authInstance.app.options.authDomain : null,
        provider: provider.providerId,
        currentUser: authInstance.currentUser ? authInstance.currentUser.uid : null,
        code: error && error.code ? error.code : "unknown",
        message: error && error.message ? error.message : "unknown"
      });

      const redirectFallbackCodes = [
        "auth/popup-blocked",
        "auth/operation-not-supported-in-this-environment"
      ];

      if (error && redirectFallbackCodes.includes(error.code)) {
        try {
          await authInstance.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
          console.info("[M-TECH auth] Google popup unavailable; starting redirect", {
            page: window.location.pathname || "unknown",
            reason: error.code
          });
          await authInstance.signInWithRedirect(provider);
          return null;
        } catch (redirectError) {
          console.error("[M-TECH auth] Google redirect fallback failed", {
            page: window.location.pathname || "unknown",
            code: redirectError && redirectError.code ? redirectError.code : "unknown",
            message: redirectError && redirectError.message ? redirectError.message : "unknown"
          });
          throw redirectError;
        }
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

    try {
      const result = await MTECH_CONFIG.auth.getRedirectResult();
      if (result && result.user) {
        console.info("[M-TECH auth] Google redirect authentication succeeded", {
          page: window.location.pathname || "unknown",
          uid: result.user.uid,
          email: result.user.email || null,
          provider: (result.user.providerData || []).map(p => p.providerId).join(",") || "unknown",
          currentUser: !!MTECH_CONFIG.auth.currentUser
        });
        return await ensureGoogleUserDoc(result.user);
      }
      console.info("[M-TECH auth] no Google redirect result", {
        page: window.location.pathname || "unknown",
        currentUser: !!MTECH_CONFIG.auth.currentUser
      });
      return null;
    } catch (error) {
      console.error("[M-TECH auth] Google redirect result failed", {
        page: window.location.pathname || "unknown",
        code: error && error.code ? error.code : "unknown",
        message: error && error.message ? error.message : "unknown"
      });
      throw error;
    }
  },

  resetPassword: async (email) => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");
    await MTECH_CONFIG.auth.sendPasswordResetEmail(email);
  },

  logOut: async () => {
    if (MTECH_CONFIG.isEnabled) await MTECH_CONFIG.auth.signOut();
  },

  getCurrentUserDoc: async () => {
    if (!MTECH_CONFIG.isEnabled) return null;
    const user = MTECH_CONFIG.auth.currentUser;
    if (!user) return null;
    return await getUserProfile(user);
  },

  onAuthStateChanged: (callback) => {
    if (!MTECH_CONFIG.isEnabled) {
      setTimeout(() => callback(null), 50);
      return () => {};
    }

    return MTECH_CONFIG.auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.info("[M-TECH auth] auth state: signed out", {
          page: window.location.pathname || "unknown",
          currentUser: false
        });
        callback(null);
        return;
      }

      console.info("[M-TECH auth] auth state: signed in", {
        page: window.location.pathname || "unknown",
        uid: user.uid,
        email: user.email || null,
        provider: (user.providerData || []).map(p => p.providerId).join(",") || "unknown"
      });

      try {
        const data = await getUserProfile(user);
        if (data) callback({ ...user, ...data });
        else callback(user);
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
