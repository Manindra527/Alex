const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const Planner = require("../models/Planner");
const PlannerEntry = require("../models/PlannerEntry");

// GET /api/planner — { planner, entries }
router.get("/", verifyToken, async (req, res) => {
  const [planner, entries] = await Promise.all([
    Planner.findById(req.userId).lean(),
    PlannerEntry.find({ user_id: req.userId }).sort({ entry_date: 1, start_time: 1 }).lean(),
  ]);
  res.json({
    planner: planner ? { ...planner, id: planner._id } : null,
    entries,
  });
});

// POST /api/planner — upsert planner doc (no entries)
router.post("/", verifyToken, async (req, res) => {
  const allowed = ["target_exam", "exam_date", "available_hours_per_day", "subjects", "plan_data"];
  const update = { _id: req.userId, updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in (req.body || {})) update[k] = req.body[k];
  const planner = await Planner.findByIdAndUpdate(req.userId, update, {
    upsert: true, new: true, setDefaultsOnInsert: true,
  }).lean();
  res.json({ ...planner, id: planner._id });
});

// POST /api/planner/full — upsert planner + sync entries (replace any not in payload)
router.post("/full", verifyToken, async (req, res) => {
  const { setup, planData } = req.body || {};
  const subjects = setup?.subjects ?? [];

  const plannerUpdate = {
    _id: req.userId,
    target_exam: setup?.targetExam ?? null,
    exam_date: setup?.examDate ?? null,
    available_hours_per_day: setup?.availableHoursPerDay ?? null,
    subjects,
    plan_data: planData ?? {},
    updated_at: new Date().toISOString(),
  };
  const planner = await Planner.findByIdAndUpdate(req.userId, plannerUpdate, {
    upsert: true, new: true, setDefaultsOnInsert: true,
  }).lean();

  // Build entries from planData
  const timeToMin = (s) => {
    const [h, m] = String(s || "0:0").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const durBetween = (start, end) => {
    const d = timeToMin(end) - timeToMin(start);
    return d > 0 ? d : d + 24 * 60;
  };

  const allBlocks = Object.values(planData || {}).flat();
  const nextEntries = allBlocks.map((b) => ({
    id: b.id,
    user_id: req.userId,
    entry_date: b.date,
    start_time: b.startTime,
    duration_minutes: durBetween(b.startTime, b.endTime),
    subject: b.subject,
    topic: b.topic ?? null,
    session_type: b.sessionType,
    completed: !!b.completed,
    updated_at: new Date().toISOString(),
  }));

  // Upsert each, then delete stale
  await Promise.all(
    nextEntries.map((e) =>
      PlannerEntry.findOneAndUpdate({ user_id: e.user_id, id: e.id }, e, { upsert: true, new: true })
    )
  );
  const keepIds = nextEntries.map((e) => e.id);
  await PlannerEntry.deleteMany({ user_id: req.userId, id: { $nin: keepIds } });

  res.json({ planner: { ...planner, id: planner._id }, count: nextEntries.length });
});

// DELETE /api/planner — wipe planner + entries
router.delete("/", verifyToken, async (req, res) => {
  await Promise.all([
    PlannerEntry.deleteMany({ user_id: req.userId }),
    Planner.findByIdAndDelete(req.userId),
  ]);
  res.json({ ok: true });
});

module.exports = router;
