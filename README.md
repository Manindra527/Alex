# AI Mentor — Frontend + MongoDB Backend

Plain React (Vite) frontend + standalone Node/Express/MongoDB backend.
No Lovable, Supabase, or other managed services required at runtime.

---

## 1. Backend (Express + MongoDB)

```bash
cd backend
npm install
cp .env.example .env
# edit .env (see below)
npm run dev          # http://localhost:5000
```

`backend/.env`:

```
PORT=5000
MONGO_URI=<your mongo connection string>
JWT_SECRET=<any long random string>
```

### `MONGO_URI` — SRV vs non-SRV

- **MongoDB Atlas (cloud, recommended):** use the **SRV** form
  ```
  mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/ai_mentor?retryWrites=true&w=majority
  ```
  Get it from Atlas → Cluster → **Connect → Drivers → Node.js**.
  Whitelist your server IP (or `0.0.0.0/0` while testing) under **Network Access**.

- **Local MongoDB / self-hosted (no DNS SRV record):** use the **non-SRV** form
  ```
  mongodb://127.0.0.1:27017/ai_mentor
  mongodb://user:pass@host1:27017,host2:27017/ai_mentor?replicaSet=rs0
  ```

If you’re unsure → you’re on Atlas → use **`mongodb+srv://`**.

### API endpoints

| Method | Path                 | Purpose                                  |
|-------:|----------------------|------------------------------------------|
| POST   | `/api/auth`          | Login if user exists, else signup. Returns `{ user, token }` |
| POST   | `/api/auth/update`   | Update password / metadata               |
| GET    | `/api/profile`       | Get my profile                           |
| POST   | `/api/profile`       | Upsert my profile                        |
| GET    | `/api/planner`       | Get my planner + entries                 |
| POST   | `/api/planner/full`  | Upsert planner + sync entries            |
| DELETE | `/api/planner`       | Wipe my planner                          |
| POST   | `/api/storage/upload`| Upload base64 file → `/uploads/...`      |

All non-auth endpoints require `Authorization: Bearer <token>`.

---

## 2. Frontend (Vite)

```bash
npm install
cp .env.example .env
# set VITE_API_URL to your backend URL (default http://localhost:5000/api)
npm run dev          # http://localhost:5173 (or 8080)
```

`.env`:
```
VITE_API_URL=http://localhost:5000/api
```

---

## 3. Going live (production)

You need **two** deploys: the static frontend and the Express backend.

### Backend — pick any Node host
- **Render**, **Railway**, **Fly.io**, **VPS (Ubuntu + pm2)**, etc.
- Build command: `npm install`
- Start command: `npm start`
- Env vars: `PORT`, `MONGO_URI`, `JWT_SECRET`
- Note the public URL, e.g. `https://ai-mentor-api.onrender.com`

### Frontend — any static host
- **Vercel**, **Netlify**, **Cloudflare Pages**, **GitHub Pages**, etc.
- Build command: `npm run build`
- Output dir: `dist`
- Env var: `VITE_API_URL = https://<your-backend-url>/api`

That’s it — same UI, MongoDB persistence, no third-party SDKs at runtime.

---

## Troubleshooting

- **404 on Sign In / Sign Up in the preview**
  The frontend is hitting `/api/auth` on a host that has no backend.
  Run the backend (`cd backend && npm run dev`) **and** set `VITE_API_URL`
  in the frontend `.env` to that backend URL, then restart `npm run dev`.

- **CORS errors** — backend already enables `cors({ origin: true })`. If you
  put it behind a proxy, make sure the proxy forwards `Authorization`.

- **`MongoServerSelectionError` on Atlas** — IP not whitelisted, or wrong
  user/password, or you used `mongodb://` instead of `mongodb+srv://`.
