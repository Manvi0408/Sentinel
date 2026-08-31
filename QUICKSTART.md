# Quickstart

Sentinel is a single-origin app (API + console on one server). Node 18+ recommended.

## 1. Install

```bash
git clone https://github.com/Manvi0408/Sentinel.git
cd Sentinel
npm install        # installs root, then client + server (postinstall)
```

## 2. Configure keys (all optional — it runs on the built-in rules engine with none)

```bash
cp server/.env.example server/.env
# then open server/.env and add your own TEST-mode keys:
#   ANTHROPIC_API_KEY or GEMINI_API_KEY  (AI diagnosis; falls back to rules if absent)
#   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (test mode — enables real test payment links)
#   ELEVENLABS_API_KEY                    (optional — Hinglish voice)
```

Never commit real keys — `server/.env` is git-ignored.

## 3. Set up the database + seed a batch

```bash
npm run setup      # prisma generate + db push (SQLite)
npm run seed       # generate ~60 synthetic failed payments
```

## 4. Run

```bash
npm run dev        # client (Vite) + server together
# open http://localhost:4100
```

## 5. Try it

- **Landing page** — `http://localhost:4100/`
- **Dashboard** — `http://localhost:4100/app/overview` → click **Run recovery on batch**
- **Sandbox** — sidebar → **Testing Layer → Sandbox Checkout Simulator** → type `4242…`,
  `5555…`, or a past-expiry date and watch the live recovery
- **Hinglish Voice Agent** — pick a case → **Recover live** creates a real Razorpay test
  link; complete the test checkout and it flips to **Recovered** for real
- **API docs** — `http://localhost:4100/docs`

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Client + server, hot reload |
| `npm run build` | Build the client |
| `npm run serve` | Build + serve on one origin |
| `npm run seed` | Fresh synthetic batch |
| `npm --prefix server test` | Adversarial concurrency tests |
