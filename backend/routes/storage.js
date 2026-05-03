const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const verifyToken = require("../middleware/verifyToken");

const UPLOADS = path.join(__dirname, "..", "uploads");

router.post("/upload", verifyToken, (req, res) => {
  try {
    const { path: relPath, dataUrl } = req.body || {};
    if (!relPath || !dataUrl) return res.status(400).json({ error: "path and dataUrl required" });

    // Force user scoping: prefix with userId
    const safeRel = String(relPath).replace(/[^a-zA-Z0-9._/-]/g, "_");
    const finalRel = safeRel.startsWith(`${req.userId}/`) ? safeRel : `${req.userId}/${path.basename(safeRel)}`;
    const fullPath = path.join(UPLOADS, finalRel);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });

    const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
    if (!m) return res.status(400).json({ error: "Invalid dataUrl" });
    const buf = Buffer.from(m[2], "base64");
    fs.writeFileSync(fullPath, buf);

    res.json({ ok: true, path: finalRel });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
