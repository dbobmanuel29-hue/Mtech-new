/* M-TECH Premium Gadget Store — Secure Admin Users API (Vercel Serverless) */
const admin = require("firebase-admin");
let initError = null;
function getAdminApp() {
  if (admin.apps.length) return admin.apps[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) { initError = "FIREBASE_SERVICE_ACCOUNT_JSON is not set."; return null; }
  let credentials;
  try {
    const trimmed = raw.trim();
    const decoded = trimmed.startsWith("{") ? trimmed : Buffer.from(trimmed, "base64").toString("utf8");
    credentials = JSON.parse(decoded);
    if (credentials.private_key && credentials.private_key.indexOf("\\n") > -1) credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  } catch (e) { initError = "FIREBASE_SERVICE_ACCOUNT_JSON could not be parsed as JSON."; return null; }
  try { return admin.initializeApp({ credential: admin.credential.cert(credentials) }); }
  catch (e) { initError = "Firebase Admin SDK failed to initialise."; return null; }
}
function providerLabel(user) {
  const ids = (user.providerData || []).map(p => p.providerId);
  if (!ids.length) return "password";
  return ids.map(id => id === "google.com" ? "Google" : id === "password" ? "Email" : id).join(", ");
}
function toIso(value) { if (!value) return null; const d = new Date(value); return isNaN(d.getTime()) ? null : d.toISOString(); }
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "method_not_allowed", message: "Only GET is supported." }); }
  const app = getAdminApp();
  if (!app) { console.error("[admin/users] init failure:", initError); return res.status(500).json({ error: "server_not_configured", message: "The admin service is not configured yet. Please contact the site administrator." }); }
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(authHeader).trim());
  if (!match) return res.status(401).json({ error: "missing_token", message: "You must be signed in to view this data." });
  let decoded;
  try { decoded = await admin.auth().verifyIdToken(match[1], true); }
  catch (e) { return res.status(401).json({ error: "invalid_token", message: "Your session has expired. Please sign in again." }); }
  const trustedUid = decoded.uid;
  let profile;
  try {
    const snap = await admin.firestore().collection("users").doc(trustedUid).get();
    if (!snap.exists) return res.status(403).json({ error: "forbidden", message: "You don't have permission to access this page." });
    profile = snap.data();
  } catch (e) { console.error("[admin/users] profile read failed:", e.message); return res.status(500).json({ error: "profile_read_failed", message: "Could not verify your account. Please try again." }); }
  if (profile.role !== "admin" || profile.isActive !== true) return res.status(403).json({ error: "forbidden", message: "You don't have permission to access this page." });
  const requested = parseInt(req.query.limit, 10);
  const pageSize = Math.min(Math.max(isNaN(requested) ? 100 : requested, 1), 1000);
  const pageToken = req.query.pageToken || undefined;
  try {
    const page = await admin.auth().listUsers(pageSize, pageToken);
    const users = page.users.map(u => ({ uid: u.uid, name: u.displayName || "", email: u.email || "", photoURL: u.photoURL || "", emailVerified: !!u.emailVerified, disabled: !!u.disabled, provider: providerLabel(u), createdAt: toIso(u.metadata && u.metadata.creationTime), lastSignInAt: toIso(u.metadata && u.metadata.lastSignInTime) }));
    let totalUsers = 0; let cursor = undefined;
    do { const batch = await admin.auth().listUsers(1000, cursor); totalUsers += batch.users.length; cursor = batch.pageToken; } while (cursor);
    return res.status(200).json({ totalUsers, users, nextPageToken: page.pageToken || null });
  } catch (e) { console.error("[admin/users] listUsers failed:", e.message); return res.status(500).json({ error: "list_failed", message: "Could not load registered users right now. Please try again." }); }
};
