/* ==========================================================================
   M-TECH Premium Gadget Store — Firestore Database Services
   ========================================================================= */

const MTECH_DB = {
  // Sync local default categories and products to Firestore if empty
  initializeDatabase: async () => {
    if (!MTECH_CONFIG.isEnabled) return;
    const db = MTECH_CONFIG.db;
    
    try {
      // 1. Check & Sync Categories
      const catSnap = await db.collection("categories").limit(1).get();
      if (catSnap.empty) {
        console.log("Seeding Firestore categories...");
        const batch = db.batch();
        CATEGORIES.forEach((cat, index) => {
          const ref = db.collection("categories").doc(cat.id);
          batch.set(ref, {
            ...cat,
            displayOrder: index,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
      }

      // 2. Check & Sync Products
      const prodSnap = await db.collection("products").limit(1).get();
      if (prodSnap.empty) {
        console.log("Seeding Firestore products...");
        // Batch size limit is 500, we have ~29 products, so safe
        const batch = db.batch();
        products.forEach(p => {
          const ref = db.collection("products").doc(p.id);
          batch.set(ref, {
            ...p,
            status: "published", // default status
            stockQuantity: p.category === "Accessories" ? 25 : 5,
            showStockQuantity: false,
            views: 0,
            whatsappClicks: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
        console.log("Database seeded successfully!");
      }
    } catch (e) {
      console.error("Database seed failed:", e);
    }
  },

  // Get active site settings
  getSettings: async () => {
    const brand = (typeof MTECH !== "undefined") ? MTECH : {
      name: "M-TECH Premium Gadget Store",
      phoneDisplay: "+234 907 311 2162"
    };
    const fallbackSettings = {
      businessName: brand.name,
      tagline: "Good tech. A simpler way to choose it.",
      whatsappNumber: brand.phoneDisplay,
      contactEmail: "info@mtechpremium.com",
      description: "M-TECH Premium Gadget Store supplies premium iPhones, Samsung, Redmi, laptops and accessories in Port Harcourt, Rivers State, Nigeria.",
      announcementBar: "Port Harcourt, Rivers State · Phones, laptops & accessories · Buy • Sell • Swap",
      facebook: "",
      instagram: "https://www.instagram.com/",
      twitter: ""
    };

    if (!MTECH_CONFIG.isEnabled) return fallbackSettings;

    try {
      const doc = await MTECH_CONFIG.db.collection("siteSettings").doc("main").get();
      if (doc.exists) {
        return { ...fallbackSettings, ...doc.data() };
      } else {
        // ONLY administrators are allowed to create/write the siteSettings doc in Firestore.
        // Public guests/customers will just use the fallback settings.
        const user = MTECH_CONFIG.auth.currentUser;
        if (user) {
          const userDoc = await MTECH_CONFIG.db.collection("users").doc(user.uid).get();
          if (userDoc.exists && userDoc.data().role === "admin") {
            await MTECH_CONFIG.db.collection("siteSettings").doc("main").set(fallbackSettings);
          }
        }
        return fallbackSettings;
      }
    } catch (e) {
      console.error("Error reading site settings:", e);
      return fallbackSettings;
    }
  },

  // Save/Update site settings (Admin only)
  updateSettings: async (settingsData) => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");
    await MTECH_CONFIG.db.collection("siteSettings").doc("main").set(settingsData, { merge: true });

    // Update MTECH global in real-time (guarded — products.js may not be loaded)
    if (typeof MTECH !== "undefined") {
      if (settingsData.businessName) MTECH.name = settingsData.businessName;
      if (settingsData.whatsappNumber) {
        MTECH.phoneDisplay = settingsData.whatsappNumber;
        MTECH.phoneIntl = settingsData.whatsappNumber.replace(/[^0-9]/g, "");
        MTECH.phoneTel = "+" + MTECH.phoneIntl;
      }
    }
  },

  // Get categories
  getCategories: async () => {
    const localCats = (typeof CATEGORIES !== "undefined") ? CATEGORIES : [];
    if (!MTECH_CONFIG.isEnabled) return localCats;

    try {
      const snap = await MTECH_CONFIG.db.collection("categories").orderBy("displayOrder", "asc").get();
      const list = [];
      snap.forEach(doc => list.push(doc.data()));
      return list.length ? list : localCats;
    } catch (e) {
      console.error("Error fetching categories:", e);
      return localCats;
    }
  },

  // Save/Edit category
  saveCategory: async (id, categoryData) => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");
    await MTECH_CONFIG.db.collection("categories").doc(id).set(categoryData, { merge: true });
  },

  // Delete category
  deleteCategory: async (id) => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");
    await MTECH_CONFIG.db.collection("categories").doc(id).delete();
  },

  // Fetch Products based on filtering, search, and sorting
  getProducts: async (options = {}) => {
    const onlyPublished = options.onlyPublished !== false;
    
    // OFFLINE fallback
    if (!MTECH_CONFIG.isEnabled) {
      if (typeof products === "undefined") return [];
      let filtered = products.slice();
      if (options.category && options.category !== "all") {
        filtered = filtered.filter(p => p.category.toLowerCase() === options.category.toLowerCase());
      }
      if (options.featured) {
        filtered = filtered.filter(p => p.featured);
      }
      if (options.search) {
        const q = options.search.toLowerCase();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
      }
      return filtered;
    }

    try {
      let query = MTECH_CONFIG.db.collection("products");
      
      if (onlyPublished) {
        query = query.where("status", "==", "published");
      }
      
      if (options.category && options.category !== "all") {
        query = query.where("category", "==", options.category);
      }
      
      if (options.featured) {
        query = query.where("featured", "==", true);
      }

      const snap = await query.get();
      let list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));

      // Client-side search and sorting for complete flexibility & performance
      if (options.search) {
        const q = options.search.toLowerCase();
        list = list.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.brand.toLowerCase().includes(q) || 
          p.description.toLowerCase().includes(q)
        );
      }

      // Sort
      if (options.sortBy) {
        if (options.sortBy === "price_low") {
          list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        } else if (options.sortBy === "price_high") {
          list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        } else if (options.sortBy === "newest") {
          list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        }
      }

      return list;
    } catch (e) {
      console.error("Error fetching products:", e);
      return [];
    }
  },

  // Get single product
  getProduct: async (id) => {
    if (!MTECH_CONFIG.isEnabled) {
      if (typeof products === "undefined") return null;
      return products.find(p => p.id === id) || null;
    }
    
    try {
      const doc = await MTECH_CONFIG.db.collection("products").doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (e) {
      console.error("Error reading product:", e);
      return null;
    }
  },

  // Save or Update a product (Admin only)
  saveProduct: async (id, data) => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");
    const ref = MTECH_CONFIG.db.collection("products").doc(id);
    
    const docData = {
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await ref.set(docData, { merge: true });
  },

  // Delete product
  deleteProduct: async (id) => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");
    await MTECH_CONFIG.db.collection("products").doc(id).delete();
  },

  // Record an enquiry click anonymously or for logged in customer
  logEnquiry: async (productId, type = "whatsapp_click") => {
    if (!MTECH_CONFIG.isEnabled) return;
    
    try {
      const db = MTECH_CONFIG.db;
      const user = MTECH_CONFIG.auth.currentUser;
      
      const prodDoc = await db.collection("products").doc(productId).get();
      const pName = prodDoc.exists ? prodDoc.data().name : "Unknown Product";

      // Secure Analytics Logging: Guests/customers must not update products doc.
      // Instead, we log a click event in the analytics collection.
      // NOTE: field is "eventType" (not "type") to match Firestore Security Rules validation.
      await db.collection("analytics").add({
        eventType: "whatsapp_click",
        productId: productId,
        productName: pName,
        userId: user ? user.uid : "guest",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Add record to enquiries list
      await db.collection("enquiries").add({
        productId: productId,
        productName: pName,
        userId: user ? user.uid : "guest",
        userEmail: user ? user.email : "guest",
        enquiryType: type,
        status: "new",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Create Admin notification (validated and handled safely)
      await MTECH_DB.createNotification("enquiry", `New WhatsApp Enquiry`, `Someone clicked WhatsApp on ${pName}.`);
    } catch (e) {
      console.error("Error logging product enquiry:", e);
    }
  },

  // Increment product view
  incrementProductViews: async (productId) => {
    if (!MTECH_CONFIG.isEnabled) return;
    
    // Use session storage to avoid spamming Firestore reads/writes
    const sessionKey = `mtech_viewed_${productId}`;
    if (sessionStorage.getItem(sessionKey)) return;
    
    try {
      const db = MTECH_CONFIG.db;
      const user = MTECH_CONFIG.auth.currentUser;

      // Secure Analytics Logging: Avoid updating products collection directly from guests.
      // We write to the independent analytics collection, keeping products strictly read-only for public.
      // NOTE: field is "eventType" (not "type") to match Firestore Security Rules validation.
      await db.collection("analytics").add({
        eventType: "product_view",
        productId: productId,
        userId: user ? user.uid : "guest",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      sessionStorage.setItem(sessionKey, "1");
    } catch (e) {
      console.warn("Product views increment skipped:", e.message);
    }
  },

  // Create notifications (Secure & Validated — field shape must match firestore.rules exactly)
  createNotification: async (type, title, message, link = "", targetUserId = null) => {
    if (!MTECH_CONFIG.isEnabled) return;
    try {
      const payload = {
        type: type,
        title: title,
        message: message,
        link: link,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (targetUserId) {
        // Customer notification — requires the caller to be authenticated as that exact user.
        const user = MTECH_CONFIG.auth.currentUser;
        if (!user || user.uid !== targetUserId) {
          console.warn("Refusing to create customer notification for a different UID than the signed-in user.");
          return;
        }
        payload.recipientRole = "customer";
        payload.userId = targetUserId;
        payload.createdBy = user.uid; // required by security rules
      } else {
        // Admin notification — fixed, predictable shape (see firestore.rules validation).
        payload.recipientRole = "admin";
        payload.userId = "admin";
      }

      await MTECH_CONFIG.db.collection("notifications").add(payload);
    } catch (e) {
      console.error("Error creating notification:", e);
    }
  },

  // Submit Sell Request (Secure & Enforced User ID)
  saveSellRequest: async (requestData) => {
    if (!MTECH_CONFIG.isEnabled) {
      console.warn("Firebase not configured. Sell request mock-saved locally.");
      return "offline_mock_id";
    }

    const db = MTECH_CONFIG.db;
    const ref = db.collection("sellRequests").doc();
    const docId = ref.id;

    // Enforce auth UID consistency
    const user = MTECH_CONFIG.auth.currentUser;
    const resolvedUserId = user ? user.uid : "guest";

    const document = {
      ...requestData,
      id: docId,
      userId: resolvedUserId,
      status: "new",
      adminNotes: "",
      estimatedOffer: "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await ref.set(document);
    
    // Notify admin
    await MTECH_DB.createNotification("sell", `New Sell Request`, `${requestData.name} submitted a ${requestData.deviceBrand} ${requestData.deviceModel} for valuation.`);
    
    return docId;
  },

  // Submit Swap Request (Secure & Enforced User ID)
  saveSwapRequest: async (requestData) => {
    if (!MTECH_CONFIG.isEnabled) {
      console.warn("Firebase not configured. Swap request mock-saved locally.");
      return "offline_mock_id";
    }

    const db = MTECH_CONFIG.db;
    const ref = db.collection("swapRequests").doc();
    const docId = ref.id;

    // Enforce auth UID consistency
    const user = MTECH_CONFIG.auth.currentUser;
    const resolvedUserId = user ? user.uid : "guest";

    const document = {
      ...requestData,
      id: docId,
      userId: resolvedUserId,
      status: "new",
      adminNotes: "",
      estimatedTopUp: "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await ref.set(document);
    
    // Notify admin
    await MTECH_DB.createNotification("swap", `New Swap Request`, `${requestData.name} wants to swap a ${requestData.currentDevice} for ${requestData.desiredProductName}.`);
    
    return docId;
  },

  // Toggle wishlist
  toggleWishlist: async (uid, productId) => {
    if (!MTECH_CONFIG.isEnabled) return false;
    
    const ref = MTECH_CONFIG.db.collection("users").doc(uid).collection("wishlist").doc(productId);
    const doc = await ref.get();
    
    if (doc.exists) {
      await ref.delete();
      return false; // removed
    } else {
      await ref.set({
        productId: productId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true; // added
    }
  },

  // Check wishlist state
  isInWishlist: async (uid, productId) => {
    if (!MTECH_CONFIG.isEnabled) return false;
    const doc = await MTECH_CONFIG.db.collection("users").doc(uid).collection("wishlist").doc(productId).get();
    return doc.exists;
  },

  // Get user wishlist
  getWishlist: async (uid) => {
    if (!MTECH_CONFIG.isEnabled) return [];
    
    const snap = await MTECH_CONFIG.db.collection("users").doc(uid).collection("wishlist").get();
    const ids = [];
    snap.forEach(doc => ids.push(doc.id));
    
    if (ids.length === 0) return [];
    
    // Resolve each saved product (skips deleted / unpublished gracefully)
    const items = [];
    for (let i = 0; i < ids.length; i++) {
      const p = await MTECH_DB.getProduct(ids[i]);
      if (p) items.push(p);
    }
    return items;
  },

  // Testimonials
  getTestimonials: async (onlyApproved = true) => {
    const fallbackTestimonials = [
      { name: "John PH", review: "Great service, swapped my iPhone 13 for 15 pro. Best valuation in Rivers state.", rating: 5, status: "approved" },
      { name: "Blessing PH", review: "Friendly customer care. Pointed me to the right Redmi phone.", rating: 5, status: "approved" }
    ];

    if (!MTECH_CONFIG.isEnabled) return fallbackTestimonials;
    
    try {
      let query = MTECH_CONFIG.db.collection("testimonials");
      if (onlyApproved) {
        query = query.where("status", "==", "approved");
      }
      const snap = await query.get();
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      return list.length ? list : fallbackTestimonials;
    } catch (e) {
      console.error("Error testimonials:", e);
      return fallbackTestimonials;
    }
  },

  saveTestimonial: async (id, data) => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");
    await MTECH_CONFIG.db.collection("testimonials").doc(id).set(data, { merge: true });
  },

  deleteTestimonial: async (id) => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");
    await MTECH_CONFIG.db.collection("testimonials").doc(id).delete();
  },

  // Promotions
  getPromotions: async (onlyActive = true) => {
    if (!MTECH_CONFIG.isEnabled) return [];
    try {
      let query = MTECH_CONFIG.db.collection("promotions");
      if (onlyActive) {
        query = query.where("active", "==", true);
      }
      const snap = await query.get();
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      return list;
    } catch (e) {
      console.error("Error promotions:", e);
      return [];
    }
  },

  savePromotion: async (id, data) => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");
    await MTECH_CONFIG.db.collection("promotions").doc(id).set(data, { merge: true });
  },

  deletePromotion: async (id) => {
    if (!MTECH_CONFIG.isEnabled) throw new Error("Firebase is not initialized.");
    await MTECH_CONFIG.db.collection("promotions").doc(id).delete();
  }
};

// Expose the shared Firestore service for storefront/account/admin scripts.
window.MTECH_DB = MTECH_DB;

/* Automatic catalogue seeding is intentionally disabled.
   The database is now the source of truth and the admin CRUD layer handles
   explicit, verified mutations. Running an automatic seed during dashboard
   startup created a second concurrent Firestore write/read path and could
   race with the admin loaders. Existing products and categories are preserved. */
window.MTECH_DB_AUTO_SEED_DISABLED = true;
