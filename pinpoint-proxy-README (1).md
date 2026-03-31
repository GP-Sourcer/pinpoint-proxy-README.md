# Greenwood Pinpoint Proxy — v1.1

Middleware server connecting the Greenwood Sourcing Agent to Pinpoint ATS.
Uses **Node 18 built-in fetch** — no extra HTTP packages required.

---

## Files in this package

| File | Purpose |
|------|---------|
| `server.js` | The proxy server (55 lines) |
| `package.json` | Dependencies: only express + cors |
| `railway.toml` | Railway deploy config with explicit Node 18 |
| `nixpacks.toml` | Nixpacks build config (fixes "build plan" error) |
| `render.yaml` | Render deploy config |
| `.gitignore` | Ignores node_modules and .env |

---

## Deploy to Railway (recommended)

### Step 1 — Create a GitHub repo

1. Go to [github.com](https://github.com) → New repository
2. Name it `greenwood-pinpoint-proxy`
3. Set to **Private**, click **Create repository**

### Step 2 — Upload files

On the repo page, click **Add file → Upload files** and upload all 6 files:
- `server.js`
- `package.json`
- `railway.toml`
- `nixpacks.toml`
- `render.yaml`
- `.gitignore`

Click **Commit changes**.

### Step 3 — Deploy on Railway

1. Go to [railway.app](https://railway.app) → sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select `greenwood-pinpoint-proxy`
4. Railway detects the `nixpacks.toml` and builds automatically
5. Wait ~60 seconds for deployment

### Step 4 — Get your URL

In Railway, click your service → **Settings** tab → copy the **Public Domain** URL.
It looks like: `https://greenwood-pinpoint-proxy-production.up.railway.app`

### Step 5 — Paste into the sourcing agent

Open the sourcing agent → **Settings → Pinpoint ATS** → paste the URL in the
"Proxy server URL" field alongside your subdomain and API key.

---

## If Railway still shows "error creating build plan"

**Option A — Set Node version manually in Railway dashboard:**
1. In your Railway project → click the service → **Variables** tab
2. Add variable: `NODE_VERSION` = `18`
3. Redeploy

**Option B — Deploy to Render instead (just as easy, also free):**
1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Render reads `render.yaml` automatically → click **Create Web Service**
4. Copy the Render URL (e.g. `https://greenwood-pinpoint-proxy.onrender.com`)
5. Paste into sourcing agent Settings

> Note: Render's free tier "sleeps" after 15 minutes of inactivity.
> The first push after idle takes ~30 seconds to wake up.
> All subsequent pushes are instant.

---

## Test the server is working

Once deployed, visit your server URL in a browser. You should see:
```json
{"status":"ok","service":"Greenwood Pinpoint Proxy","version":"1.1.0"}
```

If you see that JSON, the server is running and ready.

---

## Environment variables (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Auto-set by Railway/Render |
| `ALLOWED_ORIGINS` | `*` | Set to your agent's URL to restrict access |
| `NODE_VERSION` | — | Set to `18` in Railway dashboard if build fails |

---

## How it works

```
Sourcing Agent (browser)
  │
  │  POST /api/pinpoint
  │  { subdomain, apiKey, method, path, body }
  ▼
This Server
  │
  │  X-API-KEY header + JSON body
  │  forwards to Pinpoint
  ▼
greenwoodproject.pinpointhq.com/api/v1/...
```

Your API key is **never stored** on this server — it comes in per-request
from your browser and is forwarded directly to Pinpoint.
