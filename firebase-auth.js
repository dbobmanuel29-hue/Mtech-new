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
      role: "customer", // default customer role — never admin on self sign-in
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
  // Sign up a new user with Email/Password
  signUp: async (email, password, name) => {
    if (!MTECH_CONFIG.isEnabled) {
      throw new Error("Firebase is not initialized. Please configure credentials first.");
    }
    
    const auth = MTECH_CONFIG.auth;
    const db = MTECH_CONFIG.db;
    
    // Create Firebase Auth user
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Create Firestore user document with "customer" default role
    const userDoc = {
      uid: user.uid,
      name: name,
      email: email,
      photoURL: "",
      role: "customer", // Enforced as customer by Security Rules (admin cannot be set via client signup)
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };
    
    await db.collection("users").doc(user.uid).set(userDoc);
    
    // Update profile in Auth
    await user.updateProfile({ displayName: name });
    
    return userDoc;
  },

  // Log in with Email/Password
  logIn: async (email, password, remember = true) => {
    if (!MTECH_CONFIG.isEnabled) {
      throw new Error("Firebase is not initialized.");
    }
    
    const auth = MTECH_CONFIG.auth;
    const db = MTECH_CONFIG.db;
    
    // Set persistence
    const persistence = remember 
      ? firebase.auth.Auth.Persistence.LOCAL 
      : firebase.auth.Auth.Persistence.SESSION;
      
    await auth.setPersistence(persistence);
    
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Update lastLogin timestamp in Firestore
    const userRef = db.collection("users").doc(user.uid);
    const doc = await userRef.get();
    
    if (doc.exists) {
      await userRef.update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
      return doc.data();
    } else {
      // Document fallback in case auth exists but Firestore document is missing
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
    }
  },

  // Log in/Sign up with Google Sign-In.
  // Tries a popup first (best UX). If the browser/embedding context blocks
  // popups (common inside sandboxed preview iframes, in-app browsers, or
  // with popup blockers enabled), it automatically falls back to a full-page
  // redirect. In that case this function returns null immediately — the real
  // result is picked up by completeGoogleRedirectSignIn() after the browser
  // navigates back.
  logInWithGoogle: async () => {
    if (!MTECH_CONFIG.isEnabled) {
      throw new Error("Firebase is not initialized.");
    }

    const auth = MTECH_CONFIG.auth;
    const provider = new firebase.auth.GoogleAuthProvider();

    try {
      const userCredential = await auth.signInWithPopup(provider);
      return await ensureGoogleUserDoc(userCredential.user);
    } catch (error) {
      const popupBlockedCodes = [
        "auth/popup-blocked",
        "auth/operation-not-supported-in-this-environment",
        "auth/cancelled-popup-request"
      ];
      if (popupBlockedCodes.includes(error.code)) {
        // Fall back to redirect flow — the page will navigate away and back.
        await auth.signInWithRedirect(provider);
        return null;
      }
      throw error;
    }
  },

  // Call this once on page load of login.html / signup.html to pick up the
  // result of a Google sign-in that completed via signInWithRedirect().
  // Returns the user doc if a redirect sign-in just completed, or null if
  // there was nothing to complete (the normal case on a fresh page load).
  completeGoogleRedirectSignIn: async () => {
    if (!MTECH_CONFIG.isEnabled) return null;
    const result = await MTECH_CONFIG.auth.getRedirectResult();
    if (result && result.user) {
      return await ensureGoogleUserDoc(result.user);
    }
    return null;
  },

  // Password Reset Email
  resetPassword: async (email) => {
    if (!MTECH_CONFIG.isEnabled) {
      throw new Error("Firebase is not initialized.");
    }
    await MTECH_CONFIG.auth.sendPasswordResetEmail(email);
  },

  // Log out current user
  logOut: async () => {
    if (MTECH_CONFIG.isEnabled) {
      await MTECH_CONFIG.auth.signOut();
    }
  },

  // Get current user document details
  getCurrentUserDoc: async () => {
    if (!MTECH_CONFIG.isEnabled) return null;
    const user = MTECH_CONFIG.auth.currentUser;
    if (!user) return null;
    
    const doc = await MTECH_CONFIG.db.collection("users").doc(user.uid).get();
    return doc.exists ? doc.data() : null;
  },

  // Listen to Auth State Changes
  onAuthStateChanged: (callback) => {
    if (!MTECH_CONFIG.isEnabled) {
      // Running offline fallback - execute with null user
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

// Expose the shared auth service for pages that check window.MTECH_AUTH.
window.MTECH_AUTH = MTECH_AUTH;
