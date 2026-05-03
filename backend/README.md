# AI Mentor Backend (Node + Express + MongoDB + JWT)

Standalone backend that replaces the previous Supabase backend. The frontend
talks to it via `VITE_API_URL` (default `http://localhost:5000/api`).

## Run

```bash
cd backend
cp .env.example .env   # then edit MONGO_URI + JWT_SECRET
npm install            # or: bun install
npm run dev            # node --watch server.js
```

## Endpoints

### Auth
- `POST /api/auth` — body `{ email, password, full_name? }`. Logs in if user
  exists, signs up otherwise. Returns `{ user, token }`. Token is a JWT
  signed with `JWT_SECRET` and embeds `sub = user._id`.
- `POST /api/auth/update` (Bearer) — body `{ password?, data? }`. Updates
  the password hash and/or `user_metadata`.

### Profile
- `GET /api/profile/me` (Bearer) — returns the auth user (id, email, metadata).
- `GET /api/profile` (Bearer) — fetch own profile.
- `POST /api/profile` (Bearer) — create/update fields: `full_name`,
  `photo_url`, `age`, `target_exam`, `exam_date`, `daily_hours_goal`.

### Planner
- `GET /api/planner` (Bearer) — `{ planner, entries }`.
- `POST /api/planner` (Bearer) — upsert planner doc only.
- `POST /api/planner/full` (Bearer) — body `{ setup, planData }`. Upserts
  planner + replaces entries to match `planData`.
- `DELETE /api/planner` (Bearer) — wipes planner + all entries.

### Generic table router (used by the frontend's Supabase-compat shim)
- `POST /api/db/:table` (Bearer) — body `{ op, filters, payload, order, single, upsertOpts }`.
  Tables: `profiles`, `planners`, `planner_entries`. All queries are scoped to
  the authenticated user.

### Storage
- `POST /api/storage/upload` (Bearer) — body `{ path, dataUrl }`. Saves under
  `backend/uploads/<userId>/...` and serves it at `/uploads/<path>`.

## Frontend wiring

`src/integrations/supabase/client.ts` exports a thin `supabase`-shaped object
that proxies `auth`, `from()` and `storage` calls to the endpoints above. The
auth token is stored in `localStorage` under the key `ai-mentor-auth`
(unchanged from before).

## Env

Frontend (`/.env`):
```
VITE_API_URL=http://localhost:5000/api
```

Backend (`/backend/.env`):
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ai_mentor
JWT_SECRET=your_long_random_string
```

## Notes

- This Express backend is a separate process from the Lovable (frontend)
  app — host it on Render / Railway / Fly / your VPS. Update `VITE_API_URL`
  to its public URL when deploying.
- Password reset flows are not implemented (the original Supabase reset
  email isn't replicated here). The UI gracefully shows an error if used.
