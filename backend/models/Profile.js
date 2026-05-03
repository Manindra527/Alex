const mongoose = require("mongoose");

const ProfileSchema = new mongoose.Schema(
  {
    // _id mirrors user._id (string) so Supabase-style "id eq userId" works
    _id: { type: String },
    full_name: { type: String, default: null },
    photo_url: { type: String, default: null },
    age: { type: Number, default: null },
    target_exam: { type: String, default: null },
    exam_date: { type: String, default: null },
    daily_hours_goal: { type: Number, default: null },
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false }, _id: false }
);

ProfileSchema.virtual("id").get(function () { return this._id; });
ProfileSchema.set("toJSON", { virtuals: true, versionKey: false, transform: (_d, ret) => { delete ret._id; return ret; } });

module.exports = mongoose.model("Profile", ProfileSchema);
