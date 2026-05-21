const SUPABASE_URL = 'https://qgkevfikehdoufjcubcm.supabase.co';
const FORWARD_HDRS = ['content-type','prefer','range','accept','accept-profile','content-profile'];
const ADMIN_PREFIX = '/api/admin';
const VALID_PROXY_PREFIXES = ['/rest/v1/', '/storage/v1/'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/auth' && request.method === 'POST') {
      return handleAuth(request, env);
    }
    if (url.pathname === '/api/lookup-person' && request.method === 'GET') {
      return handlePersonLookup(url, env);
    }
    if (url.pathname === '/api/alert' && request.method === 'POST') {
      return handleSendAlert(request, env);
    }
    if (url.pathname.startsWith(ADMIN_PREFIX + '/')) {
      return handleAdminProxy(request, url, env);
    }
    return env.ASSETS.fetch(request);
  }
};

// ── Auth ─────────────────────────────────────────────────────────────────────

async function handleAuth(request, env) {
  try {
    const { username, password } = await request.json();
    if (!password || password !== env.ADMIN_PASSWORD) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/admin_users?username=eq.${encodeURIComponent(username || '')}&select=id,name,role,sites&limit=1`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
    );
    const rows = await res.json();
    const user = Array.isArray(rows) ? rows[0] : null;
    // Same error for wrong password OR unknown user (prevents user enumeration)
    if (!user) return Response.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = await signToken(
      { uid: user.id, role: user.role, sites: user.sites, exp: Math.floor(Date.now() / 1000) + 8 * 3600 },
      env.TOKEN_SECRET
    );
    return Response.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }
}

// ── Person Lookup (employee form quick-fill) ──────────────────────────────────

async function handlePersonLookup(url, env) {
  const empId = (url.searchParams.get('id') || '').trim();
  if (!empId) return Response.json(null);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/persons?employee_id=eq.${encodeURIComponent(empId)}&select=employee_id,full_name,department,company,plate_number&limit=1`,
    { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
  );
  const rows = await res.json();
  return Response.json(Array.isArray(rows) && rows[0] ? rows[0] : null);
}

// ── Admin API Proxy ───────────────────────────────────────────────────────────

async function handleAdminProxy(request, url, env) {
  const token = (request.headers.get('X-Admin-Token') || '').trim();
  if (!token || !await verifyToken(token, env.TOKEN_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate proxy path — must start with /rest/v1/ or /storage/v1/
  const supabasePath = url.pathname.slice(ADMIN_PREFIX.length);
  if (!VALID_PROXY_PREFIXES.some(p => supabasePath.startsWith(p))) {
    return Response.json({ error: 'Invalid path' }, { status: 400 });
  }

  const targetUrl = `${SUPABASE_URL}${supabasePath}${url.search}`;
  const hdrs = new Headers({
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  });
  for (const h of FORWARD_HDRS) {
    const v = request.headers.get(h);
    if (v) hdrs.set(h, v);
  }

  return fetch(targetUrl, {
    method: request.method,
    headers: hdrs,
    body: ['GET','HEAD'].includes(request.method) ? null : request.body,
  });
}

// ── Alert Dispatch ────────────────────────────────────────────────────────────

// Per-isolate deduplication: prevents the same test_id from triggering
// duplicate emails within an isolate's lifetime (hours to days on CF Workers).
// Bounded at 2000 entries to cap memory use.
const _alertedIds = new Set();

async function handleSendAlert(request, env) {
  try {
    const { test_id } = await request.json();
    if (!test_id || !_isUUID(test_id)) {
      return Response.json({ error: 'Invalid test_id' }, { status: 400 });
    }

    // Reject duplicate sends for the same test within this isolate
    if (_alertedIds.has(test_id)) {
      return Response.json({ sent: 0, reason: 'already_sent' });
    }

    // Verify the test exists in Supabase and has alcohol detected
    const testRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tests?id=eq.${encodeURIComponent(test_id)}&select=id,full_name,department,company,location_name,location_code,alcohol_value,level,retest_of,created_at,is_zero&limit=1`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
    );
    const tests = await testRes.json();
    const test = Array.isArray(tests) ? tests[0] : null;
    if (!test || test.is_zero) {
      return Response.json({ sent: 0 });
    }

    // If this is a retest, fetch the original test for the email
    let firstTest = null;
    if (test.retest_of) {
      const firstRes = await fetch(
        `${SUPABASE_URL}/rest/v1/tests?id=eq.${encodeURIComponent(test.retest_of)}&select=full_name,department,company,location_name,location_code,alcohol_value,level,created_at&limit=1`,
        { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
      );
      const firstRows = await firstRes.json();
      firstTest = Array.isArray(firstRows) ? firstRows[0] || null : null;
    }

    // Fetch enabled email channels
    const chRes = await fetch(
      `${SUPABASE_URL}/rest/v1/alert_channels?kind=eq.email&enabled=eq.true&select=target`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
    );
    const channels = await chRes.json();
    if (!Array.isArray(channels) || !channels.length) {
      return Response.json({ sent: 0 });
    }

    const email = buildAlertEmail(test, firstTest);
    const from = env.ALERT_FROM_EMAIL || 'alerts@example.com';

    let sent = 0;
    for (const ch of channels) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [ch.target], subject: email.subject, html: email.html }),
      });
      if (r.ok) sent++;
      else console.warn('[sendAlert] Resend error', ch.target, await r.text());
    }

    // Record as sent — evict oldest if cap reached
    if (_alertedIds.size >= 2000) _alertedIds.delete(_alertedIds.values().next().value);
    _alertedIds.add(test_id);

    return Response.json({ sent });
  } catch (e) {
    console.warn('[handleSendAlert]', e.message);
    return Response.json({ error: 'Failed to send alert' }, { status: 500 });
  }
}

function buildAlertEmail(test, firstTest = null) {
  const levelLabel = {
    caution:    { th: 'เตือน',      en: 'Caution',       color: '#f59e0b' },
    'no-drive': { th: 'ห้ามขับ',   en: 'No Drive',      color: '#ef4444' },
    illegal:    { th: 'ผิดกฎหมาย', en: 'Illegal Level', color: '#7f1d1d' },
  };
  const lvl = levelLabel[test.level] || levelLabel['no-drive'];
  const value = test.alcohol_value ?? 0;
  const isRetest = firstTest !== null;

  const subject = isRetest
    ? `🚨 แจ้งเตือน: ตรวจซ้ำ (Retest) พบแอลกอฮอล์ — ${test.full_name} (${value} mg%)`
    : `🚨 แจ้งเตือน: ตรวจพบแอลกอฮอล์ — ${test.full_name} (${value} mg%)`;

  const testRows = (t, label) => `
    <tr><td colspan="2" style="padding:10px 0 4px;font-weight:700;color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:.05em">${label}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;width:40%">ชื่อ / Name</td><td style="padding:6px 0;font-weight:600">${_safe(t.full_name)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280">แผนก / Dept</td><td style="padding:6px 0">${_safe(t.department)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280">บริษัท / Company</td><td style="padding:6px 0">${_safe(t.company)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280">สถานที่ / Location</td><td style="padding:6px 0">${_safe(t.location_name)} (${_safe(t.location_code)})</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280">ค่าแอลกอฮอล์ / Value</td><td style="padding:6px 0;font-size:18px;font-weight:700;color:${(levelLabel[t.level] || levelLabel['no-drive']).color}">${t.alcohol_value ?? 0} mg%</td></tr>
    <tr><td style="padding:6px 0 14px;color:#6b7280">เวลา / Time</td><td style="padding:6px 0 14px">${t.created_at ? new Date(t.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false }) : ''}</td></tr>`;

  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1a1a2e;max-width:600px;margin:auto;padding:24px">
<div style="background:${lvl.color};color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
  <h2 style="margin:0">🚨 ตรวจพบแอลกอฮอล์ / Alcohol Detected${isRetest ? ' (ตรวจซ้ำ / Retest)' : ''}</h2>
  <p style="margin:4px 0 0;opacity:.9">${lvl.th} / ${lvl.en}</p>
</div>
<div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
  <table style="width:100%;border-collapse:collapse">
    ${isRetest
      ? testRows(firstTest, 'ครั้งที่ 1 / Test 1') + testRows(test, 'ครั้งที่ 2 / Test 2 (Retest)')
      : testRows(test, '')}
  </table>
  <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Alcohol Test System · กรุณาดำเนินการโดยเร็ว</p>
</div>
</body></html>`;

  return { subject, html };
}

function _safe(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _isUUID(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

// ── JWT ───────────────────────────────────────────────────────────────────────

async function signToken(payload, secret) {
  const hdr  = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify(payload));
  const data = `${hdr}.${body}`;
  const key  = await crypto.subtle.importKey(
    'raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig  = await crypto.subtle.sign('HMAC', key, enc(data));
  const sigB = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${data}.${sigB}`;
}

// Caches the result of the expensive HMAC signature check per token within
// an isolate. Expiry is always re-checked fresh below, so a cached token
// still stops working the moment it expires.
const _sigCache = new Map();

async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [hdr, body, sig] = parts;
    const payload = JSON.parse(atob(pad(body.replace(/-/g,'+').replace(/_/g,'/'))));
    // exp is in Unix seconds — checked on every call, never cached
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;

    if (_sigCache.has(token)) return _sigCache.get(token);

    const key = await crypto.subtle.importKey(
      'raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = Uint8Array.from(
      atob(pad(sig.replace(/-/g,'+').replace(/_/g,'/'))),
      c => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc(`${hdr}.${body}`));
    if (valid) {
      // Bound memory: evict the oldest entry one-at-a-time (LRU-ish via Map
      // insertion order) instead of clearing the whole map, which would cause
      // a re-verification stampede across all logged-in admins.
      if (_sigCache.size >= 500) {
        const oldest = _sigCache.keys().next().value;
        if (oldest !== undefined) _sigCache.delete(oldest);
      }
      _sigCache.set(token, true);
    }
    return valid;
  } catch { return false; }
}

const enc  = s => new TextEncoder().encode(s);
const pad  = s => s + '='.repeat((4 - s.length % 4) % 4);
const b64u = s => btoa(unescape(encodeURIComponent(s)))
  .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
