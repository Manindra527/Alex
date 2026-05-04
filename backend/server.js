require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const dns = require('dns');


const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const plannerRoutes = require("./routes/planner");
const dbRoutes = require("./routes/db");
const storageRoutes = require("./routes/storage");

const app = express();

dns.setServers(["8.8.8.8","1.1.1.1"]);

app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: "10mb" }));

// Static for uploaded images (data-url decoded files)
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

app.get("/", (_req, res) => {
  res.send("Backend running 🚀");
});

//app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/planner", plannerRoutes);
app.use("/api/db", dbRoutes);
app.use("/api/storage", storageRoutes);

// Generic error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Mongo connection failed:", err);
    process.exit(1);
  });
