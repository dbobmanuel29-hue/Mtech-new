# images/

This is where M-TECH's own product photography goes.

The site currently renders licensed stock photographs (one unique image per product) defined in
`js/products.js`. Every record also carries a `localImage` path pointing into this folder, ready
for the store's own studio shots.

## To switch the whole site to these local files

1. Save each photograph at the exact path listed below (WebP, square 1000×1000 for products).
2. In `js/products.js`, change:

```js
var IMAGE_SOURCE = "cdn";   ->   var IMAGE_SOURCE = "local";
```

Nothing else changes. The correct `src` is written into the markup at render time — there is no
proxy, no rewriting, no fallback substitution.

## Expected files

### products/iphone/
- iphone-17-pro-max.webp
- iphone-17-pro.webp
- iphone-air.webp
- iphone-17.webp
- iphone-17e.webp
- iphone-16.webp

### products/samsung/
- galaxy-s26-ultra.webp
- galaxy-s26-plus.webp
- galaxy-s26.webp
- galaxy-z-fold8-ultra.webp
- galaxy-z-fold8.webp
- galaxy-z-flip8.webp
- galaxy-a37-5g.webp

### products/redmi/
- redmi-note-15-pro-plus-5g.webp
- redmi-note-15-pro.webp
- redmi-note-15-5g.webp
- redmi-15.webp
- redmi-14c.webp

### products/laptops/
- hp-pavilion.webp
- hp-probook.webp
- lenovo-ideapad.webp
- dell-inspiron.webp
- macbook-air.webp

### products/accessories/
- phone-cases.webp
- tempered-glass.webp
- fast-chargers.webp
- usb-c-cables.webp
- power-banks.webp
- wireless-earbuds.webp
- usb-c-hubs.webp
- charging-station.webp

### categories/
- iphone.webp
- samsung.webp
- redmi.webp
- laptops.webp
- accessories.webp

### hero/ and general/
Optional. Page hero and section photographs are referenced directly inside the HTML files —
search each page for `images.pexels.com` to swap in your own file paths.

## Rules

- One image per product. Never reuse another model's photograph.
- No generic "phone" artwork on laptop or accessory cards.
- If a file is missing the card shows **"Image unavailable"** — it is never substituted.
- Compress before committing: WebP, quality ~80, under ~120KB per product shot.
