const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Profile = require("../models/Profile");
const verifyToken = require("../middleware/verifyToken");

const sign = (user) => jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: "30d" });

const toClient = (user) => ({
  id: String(user._id),
  email: user.email,
  user_metadata: user.user_metadata || {},
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required." });

    const normEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normEmail });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid login credentials" });
    }

    const token = sign(user);
    res.json({ user: toClient(user), token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { email, password, full_name } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required." });

    const normEmail = String(email).trim().toLowerCase();

    const existing = await User.findOne({ email: normEmail });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: normEmail,
      password_hash,
      user_metadata: full_name
        ? { full_name: String(full_name).trim() }
        : {},
    });

    // create profile
    await Profile.findByIdAndUpdate(
      String(user._id),
      {
        _id: String(user._id),
        full_name: full_name ? String(full_name).trim() : null,
      },
      { upsert: true }
    );

    const token = sign(user);
    res.json({ user: toClient(user), token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// POST /api/auth/update — update password and/or user_metadata
router.post("/update", verifyToken, async (req, res) => {
  try {
    const { password, data } = req.body || {};
    const update = {};
    if (password) update.password_hash = await bcrypt.hash(password, 10);
    if (data && typeof data === "object") update.user_metadata = data;
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    res.json(toClient(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
