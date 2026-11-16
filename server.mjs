import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 3000);
const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;
const TOKEN = process.env.OANDA_ACCESS_TOKEN;
const ENV = (process.env.OANDA_ENV || 'practice').toLowerCase();
const REST_BASE = ENV === 'live' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com';
const STREAM_BASE = ENV === 'live' ? 'https://stream-fxtrade.oanda.com' : 'https://stream-fxpractice.oanda.com';

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}
function configured() { return Boolean(ACCOUNT_ID && TOKEN); }
function validInstrument(s) { return /^[A-Z0-9]{3,10}_[A-Z0-9]{3,10}$/.test(s || ''); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/health') {
    return json(res, 200, { service: 'EQOOption market-data adapter', provider: 'OANDA v20', configured: configured(), environment: ENV, live: ENV === 'live' && configured() });
  }
  if (!url.pathname.startsWith('/api/oanda/')) {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = fs.readFileSync(path.join(__dirname, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(html);
    }
    const safe = path.normalize(path.join(__dirname, decodeURIComponent(url.pathname)));
    if (!safe.startsWith(__dirname)) return json(res, 403, { error: 'Forbidden' });
    try {
      const data = fs.readFileSync(safe);
      const ext = path.extname(safe);
      const type = ext === '.css' ? 'text/css' : ext === '.js' || ext === '.mjs' ? 'text/javascript' : 'application/octet-stream';
      res.writeHead(200, { 'content-type': `${type}; charset=utf-8` }); return res.end(data);
    } catch { return json(res, 404, { error: 'Not found' }); }
  }
  if (!configured()) return json(res, 503, { error: 'OANDA credentials are not configured. Copy .env.example to .env and add your account ID and access token.' });

  if (url.pathname === '/api/oanda/candles') {
    const instrument = url.searchParams.get('instrument') || 'EUR_USD';
    const granularity = url.searchParams.get('granularity') || 'S5';
    const count = Math.min(5000, Math.max(1, Number(url.searchParams.get('count') || 500)));
    if (!validInstrument(instrument) || !/^(S5|S10|S15|S30|M1|M2|M4|M5|M10|M15|M30|H1|H2|H4|H6|H8|H12|D|W|M)$/.test(granularity)) return json(res, 400, { error: 'Invalid instrument or granularity' });
    try {
      const upstream = await fetch(`${REST_BASE}/v3/accounts/${encodeURIComponent(ACCOUNT_ID)}/instruments/${instrument}/candles?price=MBA&granularity=${granularity}&count=${count}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
      const body = await upstream.text();
      res.writeHead(upstream.status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); return res.end(body);
    } catch { return json(res, 502, { error: 'Unable to reach OANDA candles endpoint' }); }
  }

  if (url.pathname === '/api/oanda/stream') {
    const instruments = (url.searchParams.get('instruments') || 'EUR_USD').split(',').map(s => s.trim());
    if (!instruments.length || instruments.length > 20 || instruments.some(s => !validInstrument(s))) return json(res, 400, { error: 'Invalid instruments list' });
    let upstream;
    try {
      upstream = await fetch(`${STREAM_BASE}/v3/accounts/${encodeURIComponent(ACCOUNT_ID)}/pricing/stream?instruments=${encodeURIComponent(instruments.join(','))}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    } catch { return json(res, 502, { error: 'Unable to connect to OANDA pricing stream' }); }
    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text(); return json(res, upstream.status || 502, { error: 'OANDA stream rejected the request', detail: detail.slice(0, 500) });
    }
    res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const close = () => { try { reader.cancel(); } catch {} };
    req.on('close', close);
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed);
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          } catch { /* Ignore incomplete/non-JSON upstream lines. */ }
        }
      }
    } catch { /* Client disconnect or upstream stream reset. */ }
    if (!res.writableEnded) res.end();
    return;
  }
  return json(res, 404, { error: 'Unknown market-data endpoint' });
});

server.listen(PORT, () => console.log(`EQOOption server listening on http://localhost:${PORT} (${ENV})`));
