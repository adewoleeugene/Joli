#!/usr/bin/env node
/*
 Helper: Register an organizer via Organizer API and print the access token
 Usage:
   node scripts/register-organizer.js [--base http://localhost:5101] [--email you@example.com]

 Prints JSON as single line with: { token, user, base, email }
*/

const http = require('http');
const https = require('https');

function fetchJson(url, opts = {}) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request({
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + (u.search || ''),
        method: opts.method || 'GET',
        headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {}),
      }, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, json });
          } catch (e) {
            reject(new Error(`Invalid JSON response from ${url}: ${e.message}. Raw: ${data}`));
          }
        });
      });
      req.on('error', reject);
      if (opts.body) {
        req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function detectBase(preferred) {
  const candidates = [];
  // First push explicit env if provided
  if (process.env.ORGANIZER_API_URL) candidates.push(process.env.ORGANIZER_API_URL);
  // Add common local dev ports (new first)
  candidates.push('http://localhost:5002', 'http://localhost:5101', 'http://localhost:5001');
  for (const base of candidates) {
    try {
      const { status, json } = await fetchJson(`${base}/api/health`);
      if (status === 200 && json && json.status === 'OK') return base;
    } catch (e) {
      // ignore and continue
    }
  }
  if (!healthy) {
    throw new Error('Organizer API not reachable on 5002, 5101 or 5001. Please start it first.');
  }
}

function parseArgs(argv) {
  const args = { base: null, email: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base' && argv[i + 1]) { args.base = argv[++i]; }
    else if (a === '--email' && argv[i + 1]) { args.email = argv[++i]; }
  }
  return args;
}

(async () => {
  const { base: baseArg, email: emailArg } = parseArgs(process.argv);
  const base = await detectBase(baseArg);
  const email = emailArg || `organizer+${Date.now()}@example.com`;
  const payload = {
    email,
    password: 'TestPass123!',
    firstName: 'Auto',
    lastName: 'Organizer',
    role: 'organizer',
    organizationName: 'Auto Org',
    organizationDescription: 'Created by script'
  };

  const { status, json } = await fetchJson(`${base}/api/auth/register`, {
    method: 'POST',
    body: payload,
  });

  if (status >= 400 || !json?.success) {
    throw new Error(`Registration failed (${status}): ${JSON.stringify(json)}`);
  }

  const token = json?.data?.token || '';
  if (!token) throw new Error('No token returned from registration response.');

  const me = await fetchJson(`${base}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const out = { token, user: me.json?.data?.user || me.json?.data || null, base, email };
  process.stdout.write(JSON.stringify(out));
})().catch((err) => {
  console.error(err.message || String(err));
  process.exit(1);
});