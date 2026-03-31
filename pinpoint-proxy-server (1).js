/**
 * Greenwood Project — Pinpoint ATS Proxy Server
 *
 * Sits between the Greenwood Sourcing Agent (browser) and the Pinpoint API.
 * Handles CORS so the browser can push candidates directly to Pinpoint.
 *
 * Deploy to: Railway · Render · Fly.io · any Node.js 18+ host
 * No external HTTP library needed — uses Node 18's built-in fetch
 */

const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS: allow the sourcing agent to call this server ───────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (ALLOWED_ORIGINS.includes('*') || !origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Greenwood Pinpoint Proxy', version: '1.1.0' });
});

// ── Rate limiter — 60 requests / minute per IP ────────────────────────────────
const rateCounts = new Map();
setInterval(() => rateCounts.clear(), 60_000);

function rateLimit(req, res, next) {
  const ip    = req.ip || 'unknown';
  const count = (rateCounts.get(ip) || 0) + 1;
  rateCounts.set(ip, count);
  if (count > 60) return res.status(429).json({ error: 'Rate limit exceeded (60 req/min)' });
  next();
}

// ── Core proxy endpoint ───────────────────────────────────────────────────────
// Browser sends: { subdomain, apiKey, method, path, body }
// Server forwards to: https://{subdomain}.pinpointhq.com/api/v1/{path}

app.post('/api/pinpoint', rateLimit, async (req, res) => {
  const { subdomain, apiKey, method = 'GET', path, body } = req.body;

  if (!subdomain || !apiKey || !path) {
    return res.status(400).json({ error: 'subdomain, apiKey, and path are required' });
  }

  // Sanitize: subdomain must be alphanumeric + hyphens only
  if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) {
    return res.status(400).json({ error: 'Invalid subdomain' });
  }

  // Sanitize: prevent path traversal
  const safePath = path.replace(/\.\./g, '').replace(/^\/+/, '');
  const url      = `https://${subdomain}.pinpointhq.com/api/v1/${safePath}`;

  try {
    const options = {
      method:  method.toUpperCase(),
      headers: {
        'X-API-KEY':    apiKey,
        'Content-Type': 'application/vnd.api+json',
        'Accept':       'application/json',
      },
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Uses Node 18 built-in fetch — no node-fetch package needed
    const pinpointRes = await fetch(url, options);
    const data        = await pinpointRes.json().catch(() => ({}));

    res.status(pinpointRes.status).json(data);

  } catch (err) {
    console.error('[proxy error]', err.message);
    res.status(502).json({ error: 'Could not reach Pinpoint', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Greenwood Pinpoint Proxy running on port ${PORT}`);
});
