# M-TECH Cloudinary Setup

M-TECH uses Cloudinary for uploaded media and Firestore for the media metadata/URLs. Existing remote/Firebase image URLs remain supported.

## 1. Create the Cloudinary upload preset

1. Create/sign in to your Cloudinary account.
2. Open **Settings → Upload → Upload presets**.
3. Create an **unsigned** upload preset for browser uploads.
4. Restrict the preset to the formats used by M-TECH and set a sensible maximum file size. Cloudinary recommends protecting unsigned presets because the preset name is visible in browser code.
5. Use the preset name in the Vercel environment variable below.

Recommended folders used by M-TECH:

- `m-tech/products`
- `m-tech/categories`
- `m-tech/promotions`
- `m-tech/testimonials`
- `m-tech/profiles`
- `m-tech/sell-requests`
- `m-tech/swap-requests`

## 2. Vercel environment variables

Add these to the M-TECH Vercel project for **Production** (and Preview if you want to test uploads there):

- `CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name. Safe to return to the browser through the app's config endpoint.
- `CLOUDINARY_UPLOAD_PRESET` — the unsigned upload preset name. This is also intentionally browser-visible.
- `CLOUDINARY_API_KEY` — private/server-side Cloudinary API key used only by the secure deletion endpoint.
- `CLOUDINARY_API_SECRET` — **private** Cloudinary API secret. Never expose this in HTML, JavaScript, GitHub, or public environment variables.

Keep the existing `FIREBASE_SERVICE_ACCOUNT_JSON` server secret private as well.

## 3. How uploads work

Browser:

`file → validation → preview → unsigned Cloudinary upload → secure URL/public ID → Firestore metadata`

The browser never receives the Cloudinary API secret. The secure deletion endpoint verifies the Firebase ID token and then checks the existing Firestore admin profile (`role == "admin"` and `isActive == true`) before using the Cloudinary API secret.

## 4. Media metadata

New uploaded media keeps the existing URL fields used by the storefront and also records Cloudinary metadata when available, including public IDs and resource type. Existing records without these fields continue to work.

Product arrays keep their existing string URL format for compatibility while additional fields such as `imagePublicId`, `imagePublicIds`, and `imagesMedia` are added for new Cloudinary assets.

## 5. Optimization

New Cloudinary image delivery uses `f_auto,q_auto,dpr_auto` transformations where the existing code consumes newly uploaded Cloudinary URLs. Cloudinary therefore chooses an appropriate delivery format/quality instead of always serving the original image.

## 6. Admin usage

In Admin Dashboard:

- Products → Add/Edit Product → Product images
- Categories → Add/Edit Category → Category image
- Testimonials → Add testimonial → Optional photo
- Promotions → Add promotion → Banner image

Uploads show previews and progress. Failed uploads can be retried without saving the Firestore record.

## 7. Customer usage

- Account → Profile → Upload Photo
- Buy/Sell/Swap → choose Sell or Swap → upload device photos

Sell/Swap photos are saved with the request document's existing `images` field plus Cloudinary metadata when available.

## 8. Important security notes

Never commit:

- `CLOUDINARY_API_SECRET`
- Firebase service-account JSON/private keys
- other server credentials

Do not replace the existing Firebase authentication or Firestore security model. Cloudinary upload presets are the only client-side Cloudinary credential needed for direct unsigned uploads.
