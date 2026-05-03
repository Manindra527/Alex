// Generic CRUD endpoint that mirrors the small subset of Supabase semantics
// the frontend uses. Body: { op, filters, payload, order, single, upsertOpts }
const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");

const Profile = require("../models/Profile");
const Planner = require("../models/Planner");
const PlannerEntry = require("../models/PlannerEntry");

const TABLES = {
  profiles: { Model: Profile, idField: "_id", scope: "user" },          // id == user_id
  planners: { Model: Planner, idField: "_id", scope: "user" },
  planner_entries: { Model: PlannerEntry, idField: "id", scope: "user_field" }, // filter user_id
};

const buildQuery = (table, filters, userId) => {
  const cfg = TABLES[table];
  const q = {};
  // Always scope to current user
  if (cfg.scope === "user") {
    q[cfg.idField] = userId;
  } else if (cfg.scope === "user_field") {
    q.user_id = userId;
  }
  for (const f of filters || []) {
    let col = f.col;
    if (cfg.scope === "user" && col === "id") col = cfg.idField;
    if (col === "id" && cfg.scope === "user_field") col = "id";
    if (f.op === "eq") {
      // Enforce ownership: refuse to override the user scope
      if ((cfg.scope === "user" && col === cfg.idField && String(f.val) !== String(userId)) ||
          (cfg.scope === "user_field" && col === "user_id" && String(f.val) !== String(userId))) {
        // Force impossible match
        q.__forbid = true;
      }
      q[col] = f.val;
    } else if (f.op === "in") {
      q[col] = { $in: f.val };
    }
  }
  return q;
};

const stripForbidden = (q) => {
  if (q.__forbid) return null;
  return q;
};

const serialize = (table, doc) => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  const cfg = TABLES[table];
  if (cfg.scope === "user") {
    obj.id = obj._id;
    delete obj._id;
  }
  delete obj.__v;
  return obj;
};

router.post("/:table", verifyToken, async (req, res) => {
  try {
    const { table } = req.params;
    const cfg = TABLES[table];
    if (!cfg) return res.status(404).json({ error: "Unknown table" });

    const { op, filters, payload, order, single } = req.body || {};
    const query = stripForbidden(buildQuery(table, filters, req.userId));

    if (op === "select") {
      if (!query) return single ? res.status(404).json({ error: "Not found" }) : res.json([]);
      let cursor = cfg.Model.find(query);
      for (const o of order || []) cursor = cursor.sort({ [o.col]: o.ascending ? 1 : -1 });
      const docs = await cursor.lean();
      const out = docs.map((d) => serialize(table, d));
      if (single) {
        if (out.length === 0) return res.status(404).json({ error: "Not found" });
        return res.json(out[0]);
      }
      return res.json(out);
    }

    if (op === "delete") {
      if (!query) return res.json({ ok: true });
      await cfg.Model.deleteMany(query);
      return res.json({ ok: true });
    }

    if (op === "update") {
      if (!query) return res.status(403).json({ error: "Forbidden" });
      const docs = await cfg.Model.updateMany(query, { $set: payload || {} });
      return res.json({ ok: true, modified: docs.modifiedCount });
    }

    if (op === "insert" || op === "upsert") {
      const rows = Array.isArray(payload) ? payload : [payload];
      const results = [];
      for (const raw of rows) {
        const row = { ...raw };
        // Force ownership
        if (cfg.scope === "user") {
          row._id = req.userId;
          delete row.id;
        } else if (cfg.scope === "user_field") {
          row.user_id = req.userId;
        }
        if (op === "upsert") {
          const filter =
            cfg.scope === "user"
              ? { _id: req.userId }
              : { user_id: req.userId, id: row.id };
          const doc = await cfg.Model.findOneAndUpdate(filter, row, {
            upsert: true, new: true, setDefaultsOnInsert: true,
          }).lean();
          results.push(serialize(table, doc));
        } else {
          const doc = await cfg.Model.create(row);
          results.push(serialize(table, doc.toObject()));
        }
      }
      if (single) return res.json(results[0]);
      return res.json(results);
    }

    res.status(400).json({ error: `Unsupported op: ${op}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
