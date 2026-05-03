const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    user_metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
