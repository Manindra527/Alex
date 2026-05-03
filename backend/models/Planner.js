const mongoose = require("mongoose");

const PlannerSchema = new mongoose.Schema(
  {
    _id: { type: String }, // user_id
    target_exam: { type: String, default: null },
    exam_date: { type: String, default: null },
    available_hours_per_day: { type: Number, default: null },
    subjects: { type: [String], default: [] },
    plan_data: { type: Object, default: {} },
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false }, _id: false }
);

PlannerSchema.virtual("id").get(function () { return this._id; });
PlannerSchema.set("toJSON", { virtuals: true, versionKey: false, transform: (_d, ret) => { delete ret._id; return ret; } });

module.exports = mongoose.model("Planner", PlannerSchema);
