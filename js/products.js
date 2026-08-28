/* ==========================================================================
   M-TECH Premium Gadget Store — Product data + catalog rendering
   --------------------------------------------------------------------------
   IMAGE POLICY
   Every product below has ONE image that belongs to that product only.
   - item.image      -> the photograph shipped with this build (licensed stock)
   - item.localImage -> the in-repo path used when you drop in your own studio
                        photographs (images/products/<category>/<id>.webp)

   Switch the whole site to your own photo library by changing IMAGE_SOURCE to
   "local" and saving each file at the matching localImage path. Nothing is
   swapped, proxied or rewritten after render: the resolved src is written once
   into the markup. If a file is missing the card shows "Image unavailable" and
   NEVER substitutes a different product's photograph.
   ========================================================================== */

var IMAGE_SOURCE = "cdn"; /* "cdn" | "local" */

var MTECH = {
  name: "M-TECH Premium Gadget Store",
  shortName: "M-TECH",
  phoneIntl: "2349073112162",
  phoneDisplay: "+234 907 311 2162",
  phoneTel: "+2349073112162",
  city: "Port Harcourt",
  state: "Rivers State",
  country: "Nigeria",
  site: "https://mtechpremiumgadgets.vercel.app",
  hours: "Monday – Saturday, 9:00am – 7:00pm"
};

/* Resolve the image for a record — evaluated BEFORE markup is written. */
function productImage(item) {
  return IMAGE_SOURCE === "local" ? item.localImage : item.image;
}

/* Image state handlers (no fallback artwork, no substitutions). */
var MTECH_IMG = {
  ok: function (img) {
    var wrap = img.closest(".thumb") || img.parentElement;
    if (wrap) wrap.classList.add("is-loaded");
  },
  fail: function (img) {
    var wrap = img.closest(".thumb") || img.parentElement;
    img.style.display = "none";
    if (wrap) {
      wrap.classList.remove("is-loaded");
      wrap.classList.add("img-missing");
    }
  }
};

/* ------------------------------------------------------------- categories */
var CATEGORIES = [
  {
    id: "iphone", name: "iPhone", page: "iphone.html",
    blurb: "Pro Max, Pro, Air and standard models — chosen by the exact variant you want.",
    image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-17.jpg",
    localImage: "images/categories/iphone.webp",
    alt: "Apple iPhone handsets arranged on a clean white surface at M-TECH Port Harcourt"
  },
  {
    id: "samsung", name: "Samsung", page: "samsung.html",
    blurb: "Galaxy S flagships, Z foldables and everyday Galaxy A devices.",
    image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s26-ultra-new.jpg",
    localImage: "images/categories/samsung.webp",
    alt: "Samsung Galaxy flagship smartphone displayed with its retail box"
  },
  {
    id: "redmi", name: "Redmi", page: "redmi.html",
    blurb: "Big batteries, strong screens and serious value from the Redmi line-up.",
    image: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-15-global.jpg",
    localImage: "images/categories/redmi.webp",
    alt: "Three Redmi smartphones laid out on a bright background"
  },
  {
    id: "laptops", name: "Laptops", page: "laptops.html",
    blurb: "HP, Lenovo, Dell and MacBook machines for work, school and business.",
    image: "https://images.pexels.com/photos/129205/pexels-photo-129205.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    localImage: "images/categories/laptops.webp",
    alt: "Laptop open on a minimalist desk, ready for work and study"
  },
  {
    id: "accessories", name: "Accessories", page: "accessories.html",
    blurb: "Cases, screen protection, fast chargers, cables, power banks and earbuds.",
    image: "https://images.pexels.com/photos/37933313/pexels-photo-37933313.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    localImage: "images/categories/accessories.webp",
    alt: "Phone accessories including cases and cables displayed on a shop counter"
  }
];

/* --------------------------------------------------------------- products */
var products = [
  /* ------------------------------- iPhone ------------------------------- */
  {
    id: "iphone-17-pro-max",
    name: "iPhone 17 Pro Max",
    brand: "Apple",
    category: "iPhone",
    image: "https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-17-pro-max-1.jpg",
    localImage: "images/products/iphone/iphone-17-pro-max.webp",
    alt: "Official Apple iPhone 17 Pro Max product image showing the exact iPhone 17 Pro Max model",
    description: "The largest Pro iPhone — biggest display, biggest battery and the full Pro camera system.",
    long: "If you want everything Apple puts in an iPhone in one device, this is it. The Pro Max pairs the largest display in the line-up with the longest battery life, the full Pro camera system and the ProMotion display. It is the model most customers pick for photography, video and all-day heavy use.",
    specs: [["Display", "Large ProMotion display"], ["Camera", "Pro camera system"], ["Battery", "Largest in the iPhone line-up"], ["Port", "USB-C"]],
    variants: "256GB · 512GB · 1TB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Flagship",
    featured: true,
    tags: ["pro", "flagship", "camera", "big battery"]
  },
  {
    id: "iphone-17-pro",
    name: "iPhone 17 Pro",
    brand: "Apple",
    category: "iPhone",
    image: "https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-17-pro-1.jpg",
    localImage: "images/products/iphone/iphone-17-pro.webp",
    alt: "Official Apple iPhone 17 Pro product image showing the exact iPhone 17 Pro model",
    description: "Same Pro power in a more pocketable body — for people who want flagship without the size.",
    long: "The iPhone 17 Pro gives you the Pro chipset, Pro camera system and premium build in a frame that is easier to hold and carry. A favourite for customers who want top-level performance but find the Pro Max too large.",
    specs: [["Display", "ProMotion display"], ["Camera", "Pro camera system"], ["Build", "Premium metal and glass"], ["Port", "USB-C"]],
    variants: "256GB · 512GB · 1TB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Pro",
    featured: true,
    tags: ["pro", "flagship", "compact"]
  },
  {
    id: "iphone-air",
    name: "iPhone Air",
    brand: "Apple",
    category: "iPhone",
    image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-air.jpg",
    localImage: "images/products/iphone/iphone-air.webp",
    alt: "Official Apple iPhone Air product image showing the model in multiple colours",
    description: "The thin, light iPhone — designed around portability without giving up a large screen.",
    long: "iPhone Air is built for customers who care about weight and feel in the hand. It keeps a large display in an unusually slim body, which makes it comfortable for one-handed use, travel and long days out.",
    specs: [["Design", "Ultra-thin, lightweight frame"], ["Display", "Large edge-to-edge screen"], ["Camera", "Advanced single-system camera"], ["Port", "USB-C"]],
    variants: "256GB · 512GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Thin & light",
    featured: true,
    tags: ["light", "slim", "design"]
  },
  {
    id: "iphone-17",
    name: "iPhone 17",
    brand: "Apple",
    category: "iPhone",
    image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-17.jpg",
    localImage: "images/products/iphone/iphone-17.webp",
    alt: "Official Apple iPhone 17 product image showing the exact iPhone 17 model",
    description: "The balanced iPhone — current generation performance at the standard model price point.",
    long: "For most people the standard iPhone 17 is the sweet spot: current-generation chip, excellent main camera, all-day battery and the same iOS experience as the Pro models. It is the model we recommend most often for everyday users upgrading from an older iPhone.",
    specs: [["Display", "Super Retina display"], ["Camera", "Dual camera system"], ["Battery", "All-day battery"], ["Port", "USB-C"]],
    variants: "128GB · 256GB · 512GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Most balanced",
    featured: true,
    tags: ["everyday", "value", "popular"]
  },
  {
    id: "iphone-17e",
    name: "iPhone 17e",
    brand: "Apple",
    category: "iPhone",
    image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-17e.jpg",
    localImage: "images/products/iphone/iphone-17e.webp",
    alt: "Official Apple iPhone 17e product image showing the exact iPhone 17e model",
    description: "The most affordable way into the current iPhone generation.",
    long: "iPhone 17e trims the extras and keeps what matters — a modern chip, a clean single-camera system, Face ID and current iOS support. Ideal for first-time iPhone buyers or anyone moving over from Android on a controlled budget.",
    specs: [["Display", "Super Retina display"], ["Camera", "Single advanced camera"], ["Security", "Face ID"], ["Port", "USB-C"]],
    variants: "128GB · 256GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Entry Apple",
    featured: false,
    tags: ["affordable", "entry", "first iphone"]
  },
  {
    id: "iphone-16",
    name: "iPhone 16",
    brand: "Apple",
    category: "iPhone",
    image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16.jpg",
    localImage: "images/products/iphone/iphone-16.webp",
    alt: "Official Apple iPhone 16 product image showing the exact iPhone 16 model",
    description: "Previous-generation flagship value — still one of the smartest iPhone buys in Port Harcourt.",
    long: "The iPhone 16 remains a strong buy. You get USB-C, the Action button, a very capable dual camera and battery life that comfortably covers a full day, usually at a friendlier figure than the newest release. A popular choice for swaps and upgrades.",
    specs: [["Display", "Super Retina XDR"], ["Camera", "Dual camera with 2x telephoto crop"], ["Extras", "Action button, USB-C"], ["Battery", "Full-day battery"]],
    variants: "128GB · 256GB · 512GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Best value",
    featured: true,
    tags: ["value", "upgrade", "popular"]
  },

  /* ------------------------------ Samsung ------------------------------- */
  {
    id: "galaxy-s26-ultra",
    name: "Galaxy S26 Ultra",
    brand: "Samsung",
    category: "Samsung",
    image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s26-ultra-new.jpg",
    localImage: "images/products/samsung/galaxy-s26-ultra.webp",
    alt: "Official Samsung Galaxy S26 Ultra product image showing the exact Galaxy S26 Ultra model",
    description: "Samsung's do-everything flagship: S Pen, huge display and the strongest Galaxy camera set.",
    long: "The Ultra is the complete Galaxy. Built-in S Pen, the largest and brightest Galaxy display, a multi-lens camera system with long-range zoom and the biggest battery in the S series. This is the Android flagship for people who want no compromises.",
    specs: [["Display", "Large Dynamic AMOLED"], ["Camera", "Quad camera with long zoom"], ["Stylus", "Built-in S Pen"], ["Battery", "Largest in the S series"]],
    variants: "256GB · 512GB · 1TB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Flagship",
    featured: true,
    tags: ["ultra", "s pen", "zoom", "flagship"]
  },
  {
    id: "galaxy-s26-plus",
    name: "Galaxy S26+",
    brand: "Samsung",
    category: "Samsung",
    image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s26-plus.jpg",
    localImage: "images/products/samsung/galaxy-s26-plus.webp",
    alt: "Official Samsung Galaxy S26 Plus product image showing the exact Galaxy S26 Plus model",
    description: "Bigger screen and bigger battery than the standard S26, without the Ultra price.",
    long: "The S26+ is the middle child that many people end up preferring: a large flagship display, a noticeably bigger battery than the base model and the same core performance — all in a lighter body than the Ultra.",
    specs: [["Display", "Large flagship AMOLED"], ["Camera", "Triple camera system"], ["Battery", "Extended capacity"], ["Charging", "Fast wired and wireless"]],
    variants: "256GB · 512GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Big screen",
    featured: true,
    tags: ["plus", "battery", "flagship"]
  },
  {
    id: "galaxy-s26",
    name: "Galaxy S26",
    brand: "Samsung",
    category: "Samsung",
    image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s26.jpg",
    localImage: "images/products/samsung/galaxy-s26.webp",
    alt: "Official Samsung Galaxy S26 product image showing the exact Galaxy S26 model",
    description: "Compact flagship power — the easiest Galaxy S to hold and still fully flagship inside.",
    long: "The standard Galaxy S26 keeps the flagship chipset and camera quality in the most manageable size in the range. If you want top-tier Android performance without a large phone in your pocket, start here.",
    specs: [["Display", "Compact Dynamic AMOLED"], ["Camera", "Triple camera system"], ["Performance", "Flagship processor"], ["Build", "Metal and glass"]],
    variants: "128GB · 256GB · 512GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Compact",
    featured: false,
    tags: ["compact", "flagship", "everyday"]
  },
  {
    id: "galaxy-z-fold8-ultra",
    name: "Galaxy Z Fold8 Ultra",
    brand: "Samsung",
    category: "Samsung",
    image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold8-ultra-r1.jpg",
    localImage: "images/products/samsung/galaxy-z-fold8-ultra.webp",
    alt: "Official Samsung Galaxy Z Fold8 Ultra product image showing the exact foldable model",
    description: "The most advanced foldable Samsung makes — tablet-sized inner screen, flagship internals.",
    long: "A phone that opens into a workspace. The Fold8 Ultra pairs the largest inner display with the strongest specification in the foldable range, for customers who genuinely work from their phone — documents, multi-window, email and media on one device.",
    specs: [["Inner display", "Large foldable main screen"], ["Cover display", "Full-width outer screen"], ["Multitasking", "Multi-window and split view"], ["S Pen", "Supported (sold separately)"]],
    variants: "512GB · 1TB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Foldable",
    featured: true,
    tags: ["fold", "foldable", "productivity"]
  },
  {
    id: "galaxy-z-fold8",
    name: "Galaxy Z Fold8",
    brand: "Samsung",
    category: "Samsung",
    image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold8.jpg",
    localImage: "images/products/samsung/galaxy-z-fold8.webp",
    alt: "Official Samsung Galaxy Z Fold8 product image showing the exact foldable model",
    description: "Phone on the outside, wide screen on the inside — the classic book-style fold.",
    long: "The Z Fold8 gives you a normal phone experience closed and a wide, immersive screen open. Great for reading, spreadsheets, video and anyone who wants one device instead of a phone plus a small tablet.",
    specs: [["Form factor", "Book-style fold"], ["Inner display", "Wide foldable screen"], ["Camera", "Triple rear camera"], ["Battery", "All-day dual-cell battery"]],
    variants: "256GB · 512GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Foldable",
    featured: false,
    tags: ["fold", "foldable", "multitasking"]
  },
  {
    id: "galaxy-z-flip8",
    name: "Galaxy Z Flip8",
    brand: "Samsung",
    category: "Samsung",
    image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip8.jpg",
    localImage: "images/products/samsung/galaxy-z-flip8.webp",
    alt: "Official Samsung Galaxy Z Flip8 product image showing the exact clamshell foldable model",
    description: "Full-size screen that folds into your palm — the compact, stylish foldable.",
    long: "Z Flip8 folds a full-size phone into a square that disappears into a pocket or small bag. The cover screen handles quick replies, music and camera previews, and flex mode makes hands-free photos and video calls easy.",
    specs: [["Form factor", "Clamshell fold"], ["Cover screen", "Quick-access outer display"], ["Camera", "Dual camera with flex mode"], ["Design", "Pocket-size when folded"]],
    variants: "256GB · 512GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Compact fold",
    featured: true,
    tags: ["flip", "foldable", "style", "compact"]
  },
  {
    id: "galaxy-a37-5g",
    name: "Galaxy A37 5G",
    brand: "Samsung",
    category: "Samsung",
    image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a37.jpg",
    localImage: "images/products/samsung/galaxy-a37-5g.webp",
    alt: "Official Samsung Galaxy A37 5G product image showing the exact Galaxy A37 model",
    description: "Dependable everyday Galaxy — 5G, big battery and long software support.",
    long: "The Galaxy A37 5G is the practical Samsung. You get 5G, a smooth large display, a battery that lasts, and Samsung's long update commitment — without paying flagship money. A strong pick for students, business use and family phones.",
    specs: [["Network", "5G"], ["Display", "Large Super AMOLED"], ["Battery", "Long-life battery"], ["Support", "Multi-year software updates"]],
    variants: "128GB · 256GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Everyday value",
    featured: false,
    tags: ["a series", "5g", "value", "student"]
  },

  /* -------------------------------- Redmi -------------------------------- */
  {
    id: "redmi-note-15-pro-plus-5g",
    name: "Redmi Note 15 Pro+ 5G",
    brand: "Xiaomi Redmi",
    category: "Redmi",
    image: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-15-pro-plus-global.jpg",
    localImage: "images/products/redmi/redmi-note-15-pro-plus-5g.webp",
    alt: "Official Xiaomi Redmi Note 15 Pro+ 5G product image showing the exact global model",
    description: "Top of the Note range — highest-resolution camera, fastest charging, premium curved screen.",
    long: "The Pro+ is the most complete Redmi. High-resolution main camera with optical stabilisation, very fast wired charging, a bright curved AMOLED and 5G. It is the model to pick if you want flagship-style features at a mid-range figure.",
    specs: [["Network", "5G"], ["Display", "Curved AMOLED, high refresh"], ["Camera", "High-resolution OIS main camera"], ["Charging", "Ultra-fast wired charging"]],
    variants: "8GB+256GB · 12GB+512GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Top Redmi",
    featured: true,
    tags: ["5g", "camera", "fast charging"]
  },
  {
    id: "redmi-note-15-pro",
    name: "Redmi Note 15 Pro",
    brand: "Xiaomi Redmi",
    category: "Redmi",
    image: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-15-pro-global.jpg",
    localImage: "images/products/redmi/redmi-note-15-pro.webp",
    alt: "Official Xiaomi Redmi Note 15 Pro product image showing the exact Redmi Note 15 Pro model",
    description: "The balanced Note — strong screen, dependable camera and big battery for the money.",
    long: "The Note 15 Pro is the model most Redmi buyers end up choosing. A bright AMOLED, a reliable main camera, fast charging and a battery that comfortably runs a full day of heavy use.",
    specs: [["Display", "AMOLED, high refresh rate"], ["Camera", "Triple camera system"], ["Battery", "Large capacity"], ["Charging", "Fast wired charging"]],
    variants: "8GB+256GB · 8GB+128GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Popular",
    featured: true,
    tags: ["balanced", "battery", "value"]
  },
  {
    id: "redmi-note-15-5g",
    name: "Redmi Note 15 5G",
    brand: "Xiaomi Redmi",
    category: "Redmi",
    image: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-15-global.jpg",
    localImage: "images/products/redmi/redmi-note-15-5g.webp",
    alt: "Official Xiaomi Redmi Note 15 5G product image showing the exact Redmi Note 15 model",
    description: "Affordable 5G with the Note experience — smooth display and long battery life.",
    long: "The standard Note 15 5G is the entry point into the Note family. You still get the large smooth display, the clean HyperOS software and a battery that lasts, with 5G connectivity for the future.",
    specs: [["Network", "5G"], ["Display", "Large high-refresh screen"], ["Software", "HyperOS"], ["Battery", "All-day capacity"]],
    variants: "6GB+128GB · 8GB+256GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "5G value",
    featured: false,
    tags: ["5g", "value", "battery"]
  },
  {
    id: "redmi-15",
    name: "Redmi 15",
    brand: "Xiaomi Redmi",
    category: "Redmi",
    image: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-15-5g.jpg",
    localImage: "images/products/redmi/redmi-15.webp",
    alt: "Official Xiaomi Redmi 15 5G product image showing the exact Redmi 15 model",
    description: "Huge battery, large display — built to survive long days away from a socket.",
    long: "Redmi 15 is about endurance. A very large battery, a big display for video and social apps, and enough performance for everyday tasks. A sensible everyday phone for people who are always on the move.",
    specs: [["Battery", "Very large capacity"], ["Display", "Large high-refresh screen"], ["Camera", "Dual rear camera"], ["Extras", "Side fingerprint sensor"]],
    variants: "6GB+128GB · 8GB+256GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Battery king",
    featured: true,
    tags: ["battery", "budget", "everyday"]
  },
  {
    id: "redmi-14c",
    name: "Redmi 14C",
    brand: "Xiaomi Redmi",
    category: "Redmi",
    image: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-14c.jpg",
    localImage: "images/products/redmi/redmi-14c.webp",
    alt: "Official Xiaomi Redmi 14C product image showing the exact Redmi 14C model",
    description: "The budget workhorse — simple, reliable and easy on the pocket.",
    long: "Redmi 14C covers the basics properly: calls, WhatsApp, banking apps, social media and music, with a big screen and a battery that keeps going. A common choice for a second phone, a first smartphone or a work device.",
    specs: [["Display", "Large HD+ screen"], ["Battery", "Long-life battery"], ["Camera", "Dual rear camera"], ["Storage", "Expandable via microSD"]],
    variants: "4GB+128GB · 6GB+128GB (subject to stock)",
    availability: "Ask on WhatsApp for today's stock",
    badge: "Budget pick",
    featured: false,
    tags: ["budget", "second phone", "simple"]
  },

  /* ------------------------------- Laptops ------------------------------- */
  {
    id: "hp-pavilion",
    name: "HP Pavilion",
    brand: "HP",
    category: "Laptops",
    image: "https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    localImage: "images/products/laptops/hp-pavilion.webp",
    alt: "HP Pavilion laptop open on a wooden desk beside a cup of coffee",
    description: "A well-rounded home and study laptop — comfortable keyboard, full-size screen.",
    long: "The Pavilion line is HP's everyday machine: solid build, a comfortable keyboard, a bright full-size display and enough power for browsing, Office work, online classes and light creative tasks.",
    specs: [["Best for", "Home, school, office work"], ["Screen", "Full-size display"], ["Storage", "SSD configurations available"], ["Ports", "USB-A, USB-C, HDMI"]],
    variants: "Core i3 / i5 / i7 configurations (subject to stock)",
    availability: "Ask on WhatsApp for available configurations",
    badge: "Everyday",
    featured: true,
    tags: ["home", "study", "office"]
  },
  {
    id: "hp-probook",
    name: "HP ProBook",
    brand: "HP",
    category: "Laptops",
    image: "https://images.pexels.com/photos/5155219/pexels-photo-5155219.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    localImage: "images/products/laptops/hp-probook.webp",
    alt: "HP ProBook business laptop set up in a home office with a monitor",
    description: "Business-class build and security — made for long working days.",
    long: "ProBook is the business side of HP. Sturdier chassis, business-grade security features and a keyboard designed for people who type all day. A dependable choice for professionals, freelancers and small business owners.",
    specs: [["Best for", "Business and professional use"], ["Build", "Business-grade chassis"], ["Security", "Business security features"], ["Battery", "Full working-day battery"]],
    variants: "Core i5 / i7 configurations (subject to stock)",
    availability: "Ask on WhatsApp for available configurations",
    badge: "Business",
    featured: true,
    tags: ["business", "work", "durable"]
  },
  {
    id: "lenovo-ideapad",
    name: "Lenovo IdeaPad",
    brand: "Lenovo",
    category: "Laptops",
    image: "https://images.pexels.com/photos/34803979/pexels-photo-34803979.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    localImage: "images/products/laptops/lenovo-ideapad.webp",
    alt: "Lenovo IdeaPad laptop on a desk displaying a code editor",
    description: "Excellent value per naira — light, quiet and easy to carry to class or work.",
    long: "IdeaPad is Lenovo's value champion. Slim, light and quiet, with the keyboard quality Lenovo is known for. A very popular choice for students and anyone who wants a capable laptop without overspending.",
    specs: [["Best for", "Students and everyday computing"], ["Weight", "Light and portable"], ["Keyboard", "Comfortable typing"], ["Storage", "SSD configurations available"]],
    variants: "Ryzen / Core i3 / i5 configurations (subject to stock)",
    availability: "Ask on WhatsApp for available configurations",
    badge: "Best value",
    featured: true,
    tags: ["student", "value", "portable"]
  },
  {
    id: "dell-inspiron",
    name: "Dell Inspiron",
    brand: "Dell",
    category: "Laptops",
    image: "https://images.pexels.com/photos/1006293/pexels-photo-1006293.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    localImage: "images/products/laptops/dell-inspiron.webp",
    alt: "Dell Inspiron laptop on a bright desk next to a small plant",
    description: "Reliable all-rounder with strong after-sales support and easy servicing.",
    long: "Inspiron is Dell's dependable family laptop. Straightforward, well built and easy to service, with configurations that scale from basic office work up to heavier multitasking.",
    specs: [["Best for", "Family, office and general use"], ["Display", "Anti-glare options available"], ["Servicing", "Widely serviceable in Nigeria"], ["Ports", "Full port selection"]],
    variants: "Core i3 / i5 / i7 configurations (subject to stock)",
    availability: "Ask on WhatsApp for available configurations",
    badge: "Reliable",
    featured: false,
    tags: ["family", "office", "reliable"]
  },
  {
    id: "macbook-air",
    name: "MacBook Air",
    brand: "Apple",
    category: "Laptops",
    image: "https://images.pexels.com/photos/943596/pexels-photo-943596.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    localImage: "images/products/laptops/macbook-air.webp",
    alt: "Silver MacBook Air laptop open on a clean desk",
    description: "Silent, thin and exceptional battery life — the premium ultraportable.",
    long: "MacBook Air runs cool and silent with battery life that regularly outlasts the working day. The Retina display and build quality are still the benchmark, and it pairs seamlessly with an iPhone. The premium choice for creatives and mobile professionals.",
    specs: [["Best for", "Creative and mobile professionals"], ["Battery", "Long all-day battery"], ["Design", "Fanless, silent operation"], ["Display", "Retina display"]],
    variants: "8GB / 16GB RAM · 256GB / 512GB SSD (subject to stock)",
    availability: "Ask on WhatsApp for available configurations",
    badge: "Premium",
    featured: true,
    tags: ["apple", "premium", "portable", "creative"]
  },

  /* ----------------------------- Accessories ----------------------------- */
  {
    id: "phone-cases",
    name: "Phone Cases",
    brand: "M-TECH Accessories",
    category: "Accessories",
    image: "https://images.pexels.com/photos/5592309/pexels-photo-5592309.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    localImage: "images/products/accessories/phone-cases.webp",
    alt: "Protective phone case photographed on a flat dark surface",
    description: "Slim, clear, silicone and rugged cases cut for specific phone models.",
    long: "A case is the cheapest insurance your phone will ever get. We stock slim, clear, silicone and heavy-duty options cut for specific models — tell us your exact device and we will match the fit, including camera lip protection.",
    specs: [["Types", "Slim, clear, silicone, rugged"], ["Fit", "Model-specific cutouts"], ["Protection", "Raised camera and screen lips"], ["Devices", "iPhone, Samsung, Redmi and more"]],
    variants: "Cut for specific models — confirm your device",
    availability: "Ask on WhatsApp for your exact model",
    badge: "Protection",
    featured: true,
    tags: ["case", "protection", "cover"]
  },
  {
    id: "tempered-glass",
    name: "Tempered Glass",
    brand: "M-TECH Accessories",
    category: "Accessories",
    image: "https://images.pexels.com/photos/6177645/pexels-photo-6177645.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    localImage: "images/products/accessories/tempered-glass.webp",
    alt: "Phone screen shown flat on a white table representing tempered glass screen protection",
    description: "Model-cut screen protection — clear, privacy and full-coverage options.",
    long: "Screen protection fitted properly, without dust or bubbles. Clear, matte, privacy and full-coverage edge-to-edge glass are available depending on your model, plus camera lens protectors.",
    specs: [["Options", "Clear, matte, privacy, full cover"], ["Hardness", "Tempered glass"], ["Fitting", "Fitted in-store on request"], ["Extras", "Camera lens protectors available"]],
    variants: "Cut for specific models — confirm your device",
    availability: "Ask on WhatsApp for your exact model",
    badge: "Screen care",
    featured: true,
    tags: ["glass", "screen protector", "protection"]
  },
  {
    id: "fast-chargers",
    name: "Fast Chargers",
    brand: "M-TECH Accessories",
    category: "Accessories",
    image: "https://images.pexels.com/photos/36012993/pexels-photo-36012993.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    localImage: "images/products/accessories/fast-chargers.webp",
    alt: "White fast charging plug and cable laid out on a wooden surface",
    description: "USB-C PD and quick-charge adapters matched to your phone's charging standard.",
    long: "The wrong adapter will charge your phone slowly — or unsafely. We match wattage and standard (USB-C Power Delivery, quick charge) to your actual device so you get the speed the phone was designed for.",
    specs: [["Standards", "USB-C Power Delivery, Quick Charge"], ["Outputs", "20W and higher options"], ["Fit", "Nigerian 3-pin plug"], ["Use", "Phones, tablets and some laptops"]],
    variants: "20W · 33W · 45W · 65W (subject to stock)",
    availability: "Ask on WhatsApp for current options",
    badge: "Charge fast",
    featured: true,
    tags: ["charger", "adapter", "power"]
  },
  {
    id: "usb-c-cables",
    name: "USB-C Cables",
    brand: "M-TECH Accessories",
    category: "Accessories",
    image: "https://images.pexels.com/photos/4219868/pexels-photo-4219868.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    localImage: "images/products/accessories/usb-c-cables.webp",
    alt: "Close-up macro photograph of USB-C charging cables and connectors",
    description: "Braided, high-current cables that actually carry fast-charge speeds.",
    long: "Cables are where most fast-charging complaints start. Ours are rated for real fast-charge current and built with braided jackets and reinforced ends so they survive daily use in a bag or car.",
    specs: [["Types", "USB-C to USB-C, USB-A to USB-C, USB-C to Lightning"], ["Lengths", "1m and 2m"], ["Build", "Braided, reinforced ends"], ["Rating", "Fast-charge capable"]],
    variants: "1m · 2m (subject to stock)",
    availability: "Ask on WhatsApp for current options",
    badge: "Everyday",
    featured: false,
    tags: ["cable", "usb-c", "charging"]
  },
  {
    id: "power-banks",
    name: "Power Banks",
    brand: "M-TECH Accessories",
    category: "Accessories",
    image: "https://images.pexels.com/photos/10104284/pexels-photo-10104284.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    localImage: "images/products/accessories/power-banks.webp",
    alt: "Black power bank with a USB cable and pouch on a wooden surface",
    description: "Honest-capacity portable power for Port Harcourt days without steady light.",
    long: "A power bank you can trust matters here. We stock capacities that hold their rating, with fast-charge output so your phone actually refills quickly, plus pass-through and multi-port options for travelling.",
    specs: [["Capacity", "10,000mAh to 30,000mAh"], ["Output", "Fast-charge USB-C and USB-A"], ["Extras", "Multi-device charging"], ["Use", "Phones, earbuds and tablets"]],
    variants: "10,000mAh · 20,000mAh · 30,000mAh (subject to stock)",
    availability: "Ask on WhatsApp for current options",
    badge: "Stay powered",
    featured: true,
    tags: ["power bank", "battery", "travel"]
  },
  {
    id: "wireless-earbuds",
    name: "Wireless Earbuds",
    brand: "M-TECH Accessories",
    category: "Accessories",
    image: "https://images.pexels.com/photos/35599938/pexels-photo-35599938.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    localImage: "images/products/accessories/wireless-earbuds.webp",
    alt: "Wireless earbuds seated in an open charging case held in a hand",
    description: "True wireless earbuds for calls, music and everyday commuting.",
    long: "Comfortable true wireless earbuds with a charging case, clear call microphones and stable Bluetooth pairing. Noise-cancelling models are available for noisy commutes and open-plan work.",
    specs: [["Type", "True wireless with charging case"], ["Calls", "Clear-call microphones"], ["Options", "Noise cancelling available"], ["Pairing", "Bluetooth, multi-device on select models"]],
    variants: "Standard and noise-cancelling options",
    availability: "Ask on WhatsApp for current options",
    badge: "Audio",
    featured: true,
    tags: ["earbuds", "audio", "bluetooth"]
  },
  {
    id: "usb-c-hubs",
    name: "USB-C Hubs & Adapters",
    brand: "M-TECH Accessories",
    category: "Accessories",
    image: "https://images.pexels.com/photos/4195406/pexels-photo-4195406.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    localImage: "images/products/accessories/usb-c-hubs.webp",
    alt: "USB-C multiport hub adapter connected to a laptop with a white cable",
    description: "Add HDMI, USB-A, card readers and charging to a slim laptop.",
    long: "Modern laptops are thin on ports. A good hub restores HDMI for presentations, USB-A for older drives, SD card reading for photographers and pass-through charging so you only use one cable at the desk.",
    specs: [["Ports", "HDMI, USB-A, USB-C, SD/microSD"], ["Charging", "Pass-through power delivery"], ["Works with", "MacBook, HP, Lenovo, Dell"], ["Build", "Aluminium body"]],
    variants: "4-in-1 · 6-in-1 · 8-in-1 (subject to stock)",
    availability: "Ask on WhatsApp for current options",
    badge: "Workspace",
    featured: false,
    tags: ["hub", "adapter", "laptop", "hdmi"]
  },
  {
    id: "charging-station",
    name: "Multi-Device Charging Kit",
    brand: "M-TECH Accessories",
    category: "Accessories",
    image: "https://images.pexels.com/photos/5208826/pexels-photo-5208826.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    localImage: "images/products/accessories/charging-station.webp",
    alt: "Flat lay of chargers and charging cables arranged on a light surface",
    description: "One tidy kit that charges phone, earbuds and watch together.",
    long: "A single multi-port setup for the whole desk or travel bag — charge your phone, earbuds and watch from one plug instead of three, with the right cables included.",
    specs: [["Ports", "Multi-port USB-C and USB-A"], ["Includes", "Matched cable set"], ["Use", "Desk, bedside or travel"], ["Safety", "Over-current protection"]],
    variants: "2-port · 3-port · 4-port kits (subject to stock)",
    availability: "Ask on WhatsApp for current options",
    badge: "Tidy desk",
    featured: false,
    tags: ["charging", "desk", "travel", "kit"]
  }
];

/* -------------------------------------------------------------- helpers */
function getProduct(id) {
  for (var i = 0; i < products.length; i++) { if (products[i].id === id) return products[i]; }
  return null;
}
function productsByCategory(cat) {
  return products.filter(function (p) { return p.category.toLowerCase() === String(cat).toLowerCase(); });
}
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* ------------------------------------------------------- card rendering */
function productCardHTML(p, opts) {
  opts = opts || {};
  var src = productImage(p);
  var wa = waProductLink(p.name);
  return '' +
    '<article class="product-card reveal" data-id="' + p.id + '" data-category="' + escapeHTML(p.category) + '">' +
      '<div class="thumb">' +
        (p.badge ? '<span class="badge">' + escapeHTML(p.badge) + '</span>' : '') +
        '<button class="wishlist-toggle-btn js-wishlist-toggle" data-id="' + p.id + '" style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.92); border: 1px solid var(--line); border-radius: 50%; width: 34px; height: 34px; display: grid; place-items: center; cursor: pointer; transition: all 0.2s ease; z-index: 5;" aria-label="Save to wishlist">&#9825;</button>' +
        '<img src="' + src + '" alt="' + escapeHTML(p.alt) + '" width="600" height="600" loading="' + (opts.eager ? "eager" : "lazy") + '" decoding="async" ' +
        'onload="MTECH_IMG.ok(this)" onerror="MTECH_IMG.fail(this)">' +
      '</div>' +
      '<div class="product-body">' +
        '<span class="p-brand">' + escapeHTML(p.brand) + '</span>' +
        '<h3 class="p-name">' + escapeHTML(p.name) + '</h3>' +
        '<p class="p-desc">' + escapeHTML(p.description) + '</p>' +
        (p.variants ? '<div class="p-meta"><span class="pill">' + escapeHTML(p.variants) + '</span></div>' : '') +
        '<p class="p-avail"><span class="dot" aria-hidden="true"></span>' + escapeHTML(p.availability) + '</p>' +
        '<div class="p-actions">' +
          '<button class="btn btn--light btn--sm js-view" type="button" data-id="' + p.id + '" aria-label="View details for ' + escapeHTML(p.name) + '">View details</button>' +
          '<a class="btn btn--wa btn--sm" href="' + wa + '" target="_blank" rel="noopener" aria-label="Enquire about ' + escapeHTML(p.name) + ' on WhatsApp">' + waIconSVG() + 'Enquire</a>' +
        '</div>' +
      '</div>' +
    '</article>';
}

function renderProducts(target, list, opts) {
  var el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div class="empty-state">No products match that search. Try another model name, or message M-TECH on WhatsApp and we will source it.</div>';
    return;
  }
  var html = "";
  for (var i = 0; i < list.length; i++) { html += productCardHTML(list[i], i < 4 ? opts : null); }
  el.innerHTML = html;
  if (window.MTECHUI && window.MTECHUI.observeReveals) window.MTECHUI.observeReveals(el);
}

/* ------------------------------------------------------- category cards */
function categoryCardHTML(c, eager) {
  return '' +
    '<a class="cat-card reveal" href="' + c.page + '" aria-label="Shop ' + escapeHTML(c.name) + ' at M-TECH Port Harcourt">' +
      '<div class="thumb">' +
        '<img src="' + productImage(c) + '" alt="' + escapeHTML(c.alt) + '" width="800" height="600" loading="' + (eager ? "eager" : "lazy") + '" decoding="async" onload="MTECH_IMG.ok(this)" onerror="MTECH_IMG.fail(this)">' +
      '</div>' +
      '<div class="body">' +
        '<h3>' + escapeHTML(c.name) + '<span class="arrow" aria-hidden="true">&rarr;</span></h3>' +
        '<p>' + escapeHTML(c.blurb) + '</p>' +
      '</div>' +
    '</a>';
}

function renderCategories(target) {
  var el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  var html = "";
  for (var i = 0; i < CATEGORIES.length; i++) { html += categoryCardHTML(CATEGORIES[i], i < 2); }
  el.innerHTML = html;
  if (window.MTECHUI && window.MTECHUI.observeReveals) window.MTECHUI.observeReveals(el);
}

/* ------------------------------------------------------------- catalog */
/* Wires a search box + filter chips to a product grid.
   Markup contract:
     [data-catalog="iPhone|all"] wrapper
       input[data-catalog-search]
       button.chip[data-filter="value"]
       [data-catalog-grid]                                        */
function initCatalog(root) {
  var wrap = typeof root === "string" ? document.querySelector(root) : root;
  if (!wrap) return;
  var scope = wrap.getAttribute("data-catalog") || "all";
  var grid = wrap.querySelector("[data-catalog-grid]");
  var search = wrap.querySelector("[data-catalog-search]");
  var chips = wrap.querySelectorAll(".chip[data-filter]");
  var base = scope === "all" ? products.slice() : productsByCategory(scope);
  var state = { q: "", filter: "all" };

  /* Chip label -> the product tags that should satisfy it. */
  var FILTER_ALIASES = {
    "protection": ["protection", "case", "cover", "glass", "screen protector"],
    "charging": ["charging", "charger", "cable", "power bank", "power", "kit"],
    "audio": ["audio", "earbuds", "bluetooth"],
    "laptop": ["laptop", "hub", "hdmi"],
    "student": ["student", "study", "value", "budget"],
    "business": ["business", "work", "office", "durable", "reliable"],
    "portable": ["portable", "light", "slim", "compact"],
    "premium": ["premium", "apple", "flagship"],
    "camera": ["camera", "zoom", "photography", "pro"],
    "value": ["value", "budget", "affordable", "entry"],
    "compact": ["compact", "light", "slim"],
    "pro": ["pro"],
    "battery": ["battery", "big battery", "fast charging"],
    "5g": ["5g"],
    "foldable": ["foldable", "fold", "flip"],
    "flagship": ["flagship"],
    "a series": ["a series"]
  };

  function matchesFilterTag(p, f) {
    var tags = p.tags || [];
    var wanted = FILTER_ALIASES[f] || [f];
    for (var i = 0; i < wanted.length; i++) {
      for (var j = 0; j < tags.length; j++) {
        if (tags[j].indexOf(wanted[i]) > -1) return true;
      }
    }
    return false;
  }

  function apply() {
    var f = state.filter.toLowerCase();
    var list = base.filter(function (p) {
      var okFilter = f === "all" ||
        p.category.toLowerCase() === f ||
        (p.brand || "").toLowerCase().indexOf(f) > -1 ||
        matchesFilterTag(p, f);
      if (!okFilter) return false;
      if (!state.q) return true;
      var hay = (p.name + " " + p.brand + " " + p.category + " " + p.description + " " + (p.tags || []).join(" ")).toLowerCase();
      return hay.indexOf(state.q) > -1;
    });
    renderProducts(grid, list, { eager: false });
    var count = wrap.querySelector("[data-catalog-count]");
    if (count) count.textContent = list.length + (list.length === 1 ? " product" : " products");
  }

  if (search) {
    search.addEventListener("input", function () { state.q = this.value.trim().toLowerCase(); apply(); });
  }
  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener("click", function () {
      Array.prototype.forEach.call(chips, function (c) { c.classList.remove("is-active"); c.setAttribute("aria-pressed", "false"); });
      chip.classList.add("is-active");
      chip.setAttribute("aria-pressed", "true");
      state.filter = chip.getAttribute("data-filter");
      apply();
    });
  });
  apply();

  // Listen for catalog reload events (triggered when live products are fetched)
  window.addEventListener("mtech-catalog-reload", function() {
    base = scope === "all" ? products.slice() : productsByCategory(scope);
    apply();
  });
}

// Global live product integration helper
window.MTECH_LOAD_LIVE = {
  run: async () => {
    if (window.MTECH_DB && MTECH_CONFIG.isEnabled) {
      try {
        const liveProds = await MTECH_DB.getProducts();
        if (liveProds && liveProds.length > 0) {
          products = liveProds;
          
          // Re-render everything that uses products array
          document.querySelectorAll("[data-catalog-grid]").forEach(function(grid) {
            const wrap = grid.closest("[data-catalog]");
            if (wrap) {
              window.dispatchEvent(new CustomEvent("mtech-catalog-reload"));
            }
          });

          document.querySelectorAll("[data-products]").forEach(function(el) {
            var ids = el.getAttribute("data-products").split(",").map(function(s) { return s.trim(); });
            var list = ids.map(getProduct).filter(Boolean);
            renderProducts(el, list, { eager: false });
          });

          document.querySelectorAll("[data-featured]").forEach(function(el) {
            var limit = parseInt(el.getAttribute("data-featured"), 10) || 8;
            renderProducts(el, products.filter(function(p) { return p.featured; }).slice(0, limit));
          });
        }
      } catch (err) {
        console.warn("Live product reload skipped:", err);
      }
    }
  }
};

// Auto-run live fetch on load
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (window.MTECH_LOAD_LIVE) {
      window.MTECH_LOAD_LIVE.run();
    }
  }, 300);
});
