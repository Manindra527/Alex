const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const Profile = require("../models/Profile");
const User = require("../models/User");

// GET /api/profile/me — return User shape (used by getUser shim)
router.get("/me", verifyToken, async (req, res) => {
  const u = req.user;
  res.json({ id: String(u._id), email: u.email, user_metadata: u.user_metadata || {} });
});

// GET /api/profile — fetch profile
router.get("/", verifyToken, async (req, res) => {
  const profile = await Profile.findById(req.userId).lean();
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json({ ...profile, id: profile._id });
});

// POST /api/profile — create/update
router.post("/", verifyToken, async (req, res) => {
  const allowed = ["full_name", "photo_url", "age", "target_exam", "exam_date", "daily_hours_goal"];
  const update = { _id: req.userId, updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in (req.body || {})) update[k] = req.body[k];
  const profile = await Profile.findByIdAndUpdate(req.userId, update, {
    upsert: true, new: true, setDefaultsOnInsert: true,
  }).lean();
  res.json({ ...profile, id: profile._id });
});

module.exports = router;
