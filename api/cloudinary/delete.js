/* M-TECH — Admin-only Cloudinary asset deletion */
const crypto = require("crypto");
const admin = require("firebase-admin");

function getAdminApp() {
  if (admin.apps.length) return admin.apps[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const decoded = raw.trim().startsWith("{") ? raw.trim() : Buffer.from(raw.trim(), "base64").toString("utf8");
    const credentials = JSON.parse(decoded);
    if (credentials.private_key && credentials.private_key.indexOf("\\n") > -1) credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
    return admin.initializeApp({ credential: admin.credential.cert(credentials) });
  } catch (_) { return null; }
}

function signature(params, secret) {
  const serialized = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
  return crypto.createHash("sha1").update(serialized + secret).digest("hex");
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const app = getAdminApp();
  if (!app) return res.status(500).json({ error: "server_not_configured" });

  const authHeader = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(authHeader).trim());
  if (!match) return res.status(401).json({ error: "missing_token", message: "You must be signed in." });

  let decoded;
  try { decoded = await admin.auth().verifyIdToken(match[1], true); }
  catch (_) { return res.status(401).json({ error: "invalid_token", message: "Your session has expired." }); }

  const profileSnap = await admin.firestore().collection("users").doc(decoded.uid).get();
  if (!profileSnap.exists || profileSnap.data().role !== "admin" || profileSnap.data().isActive !== true) {
    return res.status(403).json({ error: "forbidden", message: "Admin access is required." });
  }

  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  if (!cloudName || !apiKey || !apiSecret) return res.status(503).json({ error: "cloudinary_not_configured" });

  const body = req.body || {};
  const publicId = String(body.publicId || "").trim();
  const resourceType = body.resourceType === "video" ? "video" : "image";
  if (!publicId || publicId.length > 500) return res.status(400).json({ error: "invalid_public_id" });

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp, invalidate: true };
  const form = new URLSearchParams();
  Object.keys(params).forEach(key => form.append(key, String(params[key])));
  form.append("api_key", apiKey);
  form.append("signature", signature(params, apiSecret));

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/destroy`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString()
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ error: "cloudinary_delete_failed", message: data.error && data.error.message ? data.error.message : "Cloudinary deletion failed." });
    return res.status(200).json({ ok: true, result: data.result || "ok" });
  } catch (_) {
    return res.status(502).json({ error: "cloudinary_delete_failed", message: "Could not reach Cloudinary." });
  }
};
