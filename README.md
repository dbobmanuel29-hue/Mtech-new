# M-TECH Premium Gadget Store — static website

Phones, laptops and accessories in **Port Harcourt, Rivers State, Nigeria**, plus buying,
selling and swapping devices. WhatsApp: **+234 907 311 2162**.

Plain **HTML5 + CSS3 + vanilla JavaScript**. No React, no build step, no backend, no database.
Drop the folder on Vercel (or any static host) and it runs.

---

## Pages

| File | Purpose |
|---|---|
| `index.html` | Homepage — hero, trust, categories, popular picks, per-model iPhone strip, upgrade band, reviews, FAQ |
| `iphone.html` | iPhone 17 Pro Max / 17 Pro / Air / 17 / 17e / 16 + guides, comparison, FAQs |
| `samsung.html` | Galaxy S26 Ultra / S26+ / S26 / Z Fold8 Ultra / Z Fold8 / Z Flip8 / A37 5G |
| `redmi.html` | Redmi Note 15 Pro+ 5G / Note 15 Pro / Note 15 5G / Redmi 15 / Redmi 14C |
| `laptops.html` | HP Pavilion / HP ProBook / Lenovo IdeaPad / Dell Inspiron / MacBook Air |
| `accessories.html` | Cases, tempered glass, fast chargers, USB-C cables, power banks, earbuds, hubs, charging kits |
| `buy-sell-swap.html` | Buy / Sell / Swap, valuation, condition checklist, trade-in form |
| `about.html` | Who M-TECH is, what it offers, how it works |
| `contact.html` | Contact details + WhatsApp contact form |
| `terms.html` | Terms & Conditions (15 sections) |

Plus `robots.txt`, `sitemap.xml`, `favicon.svg`.

## Structure

```
/
├── *.html                 10 pages
├── css/style.css          design system
├── css/responsive.css     320 → 1920px
├── css/animations.css     reveals, shimmer, reduced-motion
├── js/products.js         product DATA + catalog rendering
├── js/whatsapp.js         wa.me link builders
├── js/navigation.js       mobile menu, sticky header, back-to-top
├── js/forms.js            contact + trade-in → WhatsApp
├── js/main.js             boot, modal, FAQ, reveals
└── images/                your own photo library (see below)
```

## Deploying to Vercel

No configuration needed. Either:

* drag the folder into the Vercel dashboard, or
* `vercel` from the project root, or
* push to GitHub and import the repo (Framework preset: **Other**, no build command, output = root).

After deploying, replace `https://mtechpremiumgadgets.vercel.app` with your real domain in:
canonical tags, Open Graph URLs, JSON-LD, `robots.txt`, `sitemap.xml`.

---

## Product images — how they work

Product photography ships as **licensed stock photographs (Pexels licence — free for
commercial use, no attribution required)**, one unique image per product. Nothing is shared
between two different products, nothing is generated, nothing is swapped after render.

Each record in `js/products.js` carries both paths:

```js
{
  id: "iphone-16",
  name: "iPhone 16",
  image:      "https://images.pexels.com/photos/8381365/...",  // used now
  localImage: "images/products/iphone/iphone-16.webp",         // used after you switch
  ...
}
```

### Switching to M-TECH's own studio photographs

1. Save each photograph as WebP at the exact `localImage` path listed in `js/products.js`
   (square 1000×1000 works best for products; 1600×1200 for category/hero shots).
2. Open `js/products.js` and change one line at the top:

```js
var IMAGE_SOURCE = "local";   // was "cdn"
```

That is the whole change. The resolved `src` is written into the markup once, before render —
there is **no image proxy, no service worker, no MutationObserver and no runtime substitution**.

Folder layout expected:

```
images/
├── products/
│   ├── iphone/      iphone-17-pro-max.webp, iphone-17-pro.webp, iphone-air.webp,
│   │                iphone-17.webp, iphone-17e.webp, iphone-16.webp
│   ├── samsung/     galaxy-s26-ultra.webp, galaxy-s26-plus.webp, galaxy-s26.webp,
│   │                galaxy-z-fold8-ultra.webp, galaxy-z-fold8.webp,
│   │                galaxy-z-flip8.webp, galaxy-a37-5g.webp
│   ├── redmi/       redmi-note-15-pro-plus-5g.webp, redmi-note-15-pro.webp,
│   │                redmi-note-15-5g.webp, redmi-15.webp, redmi-14c.webp
│   ├── laptops/     hp-pavilion.webp, hp-probook.webp, lenovo-ideapad.webp,
│   │                dell-inspiron.webp, macbook-air.webp
│   └── accessories/ phone-cases.webp, tempered-glass.webp, fast-chargers.webp,
│                    usb-c-cables.webp, power-banks.webp, wireless-earbuds.webp,
│                    usb-c-hubs.webp, charging-station.webp
├── categories/      iphone.webp, samsung.webp, redmi.webp, laptops.webp, accessories.webp
├── hero/
└── general/
```

### If an image is missing

The card shows the text **“Image unavailable”**. It is never replaced with another product's
photo, a generic phone, or placeholder artwork. See `MTECH_IMG` in `js/products.js`.

---

## Adding or editing products

Everything lives in the `products` array in `js/products.js`. Add an object with a unique `id`,
its own `image`/`localImage`, `category` (`iPhone` | `Samsung` | `Redmi` | `Laptops` |
`Accessories`), `description`, `specs`, `variants`, `availability` and `tags`. It appears
automatically on the matching category page, in search, in filters and in the modal.

Filter chips match on `category`, `tags` or `brand`, so add a matching tag when you add a chip.

## WhatsApp

All enquiry links are generated in `js/whatsapp.js` from `WA_NUMBER = "2349073112162"`.
Product buttons pre-fill: *“Hello M-TECH, I'm interested in the {product}. Please tell me the
current price and availability.”* Change the number in that one place if it ever changes.

## Notes on content honesty

* No prices are published — the business confirms current pricing on WhatsApp.
* No awards, certifications, years in business, customer counts or partnerships are claimed.
* The reviews sections are clearly labelled **“Customer feedback examples — not verified
  reviews”**, and the portraits are stock models, not identified customers. Replace with real,
  permissioned reviews when you have them.

## Accessibility & performance

Semantic landmarks, skip link, labelled form fields, visible focus rings, `aria-expanded` on
the menu and FAQ, keyboard-closable modal, `prefers-reduced-motion` support, lazy loading with
explicit `width`/`height` on every image, `decoding="async"`, one preloaded hero image per page,
and zero third-party JavaScript libraries.
