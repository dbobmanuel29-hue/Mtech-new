/* ==========================================================================
   M-TECH Premium Gadget Store — Authentication Services
   ========================================================================= */

/* Shared helper: create/refresh the Firestore users/{uid} doc for a Google
   sign-in, used by both the popup and redirect code paths so behaviour is
   identical no matter which flow actually completes the sign-in. */
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
    return userDoc;
  }

  await userRef.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
  return doc.data();
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
      await userRef.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
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

  /* Google popup is deliberately invoked directly from the caller's click
     task. Do not await persistence setup before opening the popup: doing so
     can consume the browser's transient user activation and cause Firebase
     to treat the popup as blocked, which then incorrectly enters redirect
     fallback. Firebase applies the pending persistence setting to the sign-in
     operation itself. */
  logInWithGoogle: async () => {
    if (!MTECH_CONFIG.isEnabled) {
      throw new Error("Firebase is not initialized.");
    }

    const auth = MTECH_CONFIG.auth;
    const provider = new firebase.auth.GoogleAuthProvider();

    try {
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      const userCredential = await auth.signInWithPopup(provider);
      return await ensureGoogleUserDoc(userCredential.user);
    } catch (error) {
      const popupBlockedCodes = [
        "auth/popup-blocked",
        "auth/operation-not-supported-in-this-environment",
        "auth/cancelled-popup-request"
      ];
      if (popupBlockedCodes.includes(error.code)) {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        await auth.signInWithRedirect(provider);
        return null;
      }
      throw error;
    }
  },

  completeGoogleRedirectSignIn: async () => {
    if (!MTECH_CONFIG.isEnabled) return null;
    const result = await MTECH_CONFIG.auth.getRedirectResult();
    if (result && result.user) {
      return await ensureGoogleUserDoc(result.user);
    }
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
    const doc = await MTECH_CONFIG.db.collection("users").doc(user.uid).get();
    return doc.exists ? doc.data() : null;
  },

  onAuthStateChanged: (callback) => {
    if (!MTECH_CONFIG.isEnabled) {
      setTimeout(() => callback(null), 50);
      return () => {};
    }

    return MTECH_CONFIG.auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const doc = await MTECH_CONFIG.db.collection("users").doc(user.uid).get();
          if (doc.exists) {
            callback({ ...user, ...doc.data() });
          } else {
            callback(user);
          }
        } catch (error) {
          console.error("Error reading user Firestore doc on state change:", error);
          callback(user);
        }
      } else {
        callback(null);
      }
    });
  }
};

window.MTECH_AUTH = MTECH_AUTH;
