/* M-TECH — Cloudinary public upload configuration endpoint */
module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const uploadPreset = String(process.env.CLOUDINARY_UPLOAD_PRESET || "").trim();

  if (!cloudName || !uploadPreset) {
    return res.status(503).json({
      error: "cloudinary_not_configured",
      message: "Cloudinary public upload configuration is missing."
    });
  }

  return res.status(200).json({ cloudName, uploadPreset });
};
