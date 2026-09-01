# Deploying Sentinel (backend and frontend separately)

Sentinel is two deployables:

- **Backend** — Node + Express API (`server/`), talks to SQLite via Prisma.
- **Frontend** — React + Vite static site (`client/`), calls the backend over `/api/*`.

They can run on one origin (backend serves `client/dist`) **or** be split across two
hosts. This guide covers the **split** deploy: **backend on Render**, **frontend on
Vercel**. A Railway alternative for the backend is at the end.

> The frontend routes every `/api/*` call to `VITE_API_BASE` (baked in at build time).
> Leave it empty for a single-origin build; set it to the backend URL for a split deploy.
> The backend already sends open CORS (`app.use(cors())`), so no CORS config is needed.

---

## 0. Prerequisites

```bash
node -v          # 18+ (built on 22)
git remote -v    # code is pushed to github.com/Manvi0408/Sentinel
```

Create free accounts on **Render** (backend) and **Vercel** (frontend).

---

## 1. Backend → Render

### Option A — Blueprint (uses the committed `render.yaml`, zero manual config)

1. Render Dashboard → **New** → **Blueprint**.
2. Connect the GitHub repo `Manvi0408/Sentinel`. Render reads `render.yaml` and creates
   the **sentinel-api** web service with:
   - **Root Directory:** `server`
   - **Build:** `npm install && npm run db:setup && npm run seed`
   - **Start:** `npm start`
   - **Health check:** `/api/health`
3. In the service's **Environment**, fill in the keys you want (all optional — it runs on
   the rules engine with none):
   ```
   GEMINI_API_KEY=...            # or ANTHROPIC_API_KEY
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   # RAZORPAY_WEBHOOK_SECRET=... # add later, in step 4
   ```
4. **Create** → wait for the build. Your API is live at
   `https://sentinel-api.onrender.com` (your exact subdomain may differ).
5. Verify:
   ```bash
   curl https://sentinel-api.onrender.com/api/health
   ```

### Option B — Manual (no blueprint)

Render Dashboard → **New** → **Web Service** → pick the repo, then set:

| Field | Value |
|---|---|
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `npm install && npm run db:setup && npm run seed` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Add the same env vars as Option A. **Do not set `PORT`** — Render injects it and the
server reads `process.env.PORT`.

> **Note on the database.** The build creates and seeds a **SQLite** file. On Render's free
> tier the filesystem is **ephemeral** — the data resets on every redeploy (a restart keeps
> it). That's fine for a demo: click **Run recovery on batch** / **Re-seed** in the UI, or
> `curl -X POST https://<backend>/api/seed`. For a persistent DB, attach a Render **Disk**
> and switch `server/prisma/schema.prisma` to `url = env("DATABASE_URL")` with
> `DATABASE_URL=file:/var/data/dev.db` — see the last section.

---

## 2. Frontend → Vercel (CLI)

```bash
npm i -g vercel

cd client
vercel link            # create/link a Vercel project (scope + name)

# point the frontend at your deployed backend (run once per environment):
vercel env add VITE_API_BASE production
#   → paste: https://sentinel-api.onrender.com   (no trailing slash)
vercel env add VITE_API_BASE preview
#   → paste the same URL

vercel --prod          # build + deploy to production
```

Vercel auto-detects Vite and uses `client/vercel.json` (committed) for the `dist` output
and the SPA rewrite so `/app`, `/docs`, etc. work on refresh. Your site goes live at
`https://<project>.vercel.app`.

> Prefer the dashboard? Vercel → **Add New… → Project** → import the repo → set **Root
> Directory = `client`**, add the `VITE_API_BASE` env var, deploy. Same result.

**If you change `VITE_API_BASE` later, you must redeploy the frontend** (`vercel --prod`) —
the value is compiled into the bundle at build time, not read at runtime.

---

## 3. Verify the split deploy

```bash
# backend up?
curl https://sentinel-api.onrender.com/api/health

# frontend serving?
curl -I https://<project>.vercel.app
```

Open the Vercel URL → **Open console** → **Run recovery on batch**. In the browser
DevTools **Network** tab you should see the `/api/*` calls going to your **Render** origin.

---

## 4. (Post-deploy) Razorpay webhook

Once the backend has a public URL, add the webhook in the Razorpay **Test Mode**
dashboard so real test-payments auto-flip cases to Recovered:

- **Webhook URL:** `https://sentinel-api.onrender.com/api/webhook/razorpay`
- **Active events:** `payment_link.paid`, `payment.captured`, `payment.failed`
- **Secret:** choose one, then set it on Render as `RAZORPAY_WEBHOOK_SECRET` and redeploy.

The server verifies every webhook's `X-Razorpay-Signature` (HMAC-SHA256 over the raw body)
against that secret before acting. Until the secret is set, signature verification is a
no-op (the endpoint still works for local/testing).

---

## Alternative — Backend on Railway (pure CLI)

```bash
npm i -g @railway/cli
railway login

cd server
railway init                      # create a project
railway up                        # build + deploy (Nixpacks)

# set the build/start once in the service settings or railway.json:
#   Build:  npm install && npm run db:setup && npm run seed
#   Start:  npm start
railway variables set GEMINI_API_KEY=... RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=...
railway domain                    # generate a public URL
```

Railway also injects `PORT`. Point the frontend's `VITE_API_BASE` at the Railway domain.

---

## Optional — persistent SQLite on Render (survives redeploys)

1. `server/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. Render service → **Disks** → add a disk mounted at `/var/data`.
3. Env: `DATABASE_URL=file:/var/data/dev.db`.
4. Redeploy. The DB now lives on the disk and persists across deploys. (Or migrate to
   Postgres by setting `provider = "postgresql"` and a `DATABASE_URL` connection string.)
