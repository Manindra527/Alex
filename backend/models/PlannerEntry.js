const mongoose = require("mongoose");

const PlannerEntrySchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // client-supplied UUID
    user_id: { type: String, required: true, index: true },
    entry_date: { type: String, required: true },
    start_time: { type: String, required: true },
    duration_minutes: { type: Number, required: true },
    subject: { type: String, required: true },
    topic: { type: String, default: null },
    session_type: { type: String, required: true },
    completed: { type: Boolean, default: false },
    postponed_from_id: { type: String, default: null },
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

PlannerEntrySchema.index({ user_id: 1, id: 1 }, { unique: true });

module.exports = mongoose.model("PlannerEntry", PlannerEntrySchema);
