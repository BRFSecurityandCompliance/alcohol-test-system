const SUPABASE_URL = 'https://qgkevfikehdoufjcubcm.supabase.co';
const FORWARD_HDRS = ['content-type','prefer','range','accept','accept-profile','content-profile'];
const ADMIN_PREFIX = '/api/admin';
const VALID_PROXY_PREFIXES = ['/rest/v1/', '/storage/v1/'];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/auth' && request.method === 'POST') {
      return handleAuth(request, env);
    }
    if (url.pathname === '/api/lookup-person' && request.method === 'GET') {
      return handlePersonLookup(url, env);
    }
    if (url.pathname === '/api/submit-test' && request.method === 'POST') {
      return handleSubmitTest(request, env, ctx);
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

// ── Test Submission (employee form) ───────────────────────────────────────────
// The employee form is unauthenticated, so the test INSERT is performed here
// with the service role (anon INSERT on `tests` is no longer allowed by RLS).
// Sending the alcohol-detected alert is a trusted side effect of a successful
// insert — it can no longer be triggered as a standalone public action, which
// closes the previously open /api/alert endpoint.

// Threshold rules mirrored from data.js — `level` is recomputed server-side so
// a crafted submission cannot understate its own severity.
const _TH = {
  default: [
    { max: 0,        level: 'pass' },
    { max: 20,       level: 'caution' },
    { max: 50,       level: 'no-drive' },
    { max: Infinity, level: 'illegal' },
  ],
  'พนักงานขนส่ง (Transport)': [
    { max: 0,        level: 'pass' },
    { max: 20,       level: 'no-drive' },
    { max: Infinity, level: 'illegal' },
  ],
  'พนักงานรักษาความปลอดภัย (Security)': [
    { max: 0,        level: 'pass' },
    { max: 20,       level: 'caution' },
    { max: Infinity, level: 'no-drive' },
  ],
};
function _levelFor(value, department) {
  const rules = _TH[department] || _TH.default;
  const v = Number(value) || 0;
  if (v === 0) return 'pass';
  for (const r of rules) if (v <= r.max && r.max !== 0) return r.level;
  return rules[rules.length - 1].level;
}

// Trim + length-cap a user-supplied string before it reaches the DB.
function _str(v, max = 300) {
  return (v === null || v === undefined ? '' : String(v)).trim().slice(0, max);
}

async function handleSubmitTest(request, env, ctx) {
  try {
    const b = await request.json();

    // The client generates the record UUID so it can link retests and redirect
    // immediately; we only accept a well-formed UUID.
    if (!_isUUID(b.id || '')) return Response.json({ error: 'Invalid id' }, { status: 400 });
    const retest_of = b.retest_of && _isUUID(b.retest_of) ? b.retest_of : null;

    const full_name     = _str(b.full_name);
    const department    = _str(b.department);
    const company       = _str(b.company);
    const location_code = _str(b.location_code, 40);
    if (!full_name || !department || !company || !location_code) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const is_zero = b.is_zero === true;
    const alcohol_value = is_zero ? 0 : Math.max(0, Number(b.alcohol_value) || 0);
    const level = _levelFor(alcohol_value, department);              // never trust client
    const shift_id = ['morning', 'afternoon', 'night'].includes(b.shift_id) ? b.shift_id : 'morning';

    const row = {
      id: b.id,
      employee_id:   _str(b.employee_id, 40),
      full_name,
      department,
      plate_number:  _str(b.plate_number, 40),
      company,
      alcohol_value,
      is_zero,
      level,
      location_code,
      location_name: _str(b.location_name),
      photo_url:     _str(b.photo_url, 1000),
      shift_id,
      device_serial: _str(b.device_serial, 60),
      retest_of,
      retest_status: ['required', 'completed', 'failed'].includes(b.retest_status) ? b.retest_status : null,
      action_taken:  is_zero ? null : 'pending',
      action_note:   '',
      created_at:    typeof b.created_at === 'string' ? b.created_at : new Date().toISOString(),
    };

    // Insert with the service role. The location_code FK enforces a real
    // location at the DB level, so forged codes are rejected.
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/tests`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    });
    if (!ins.ok) {
      console.warn('[handleSubmitTest] insert failed', ins.status, await ins.text());
      return Response.json({ error: 'Insert failed' }, { status: 502 });
    }
    const inserted = (await ins.json())[0] || row;

    // Alert on any non-zero result. This is the only path that can send an
    // alert, and it runs in the background so the form is not blocked on Resend.
    if (!is_zero) {
      const work = dispatchAlert(inserted, env);
      if (ctx && ctx.waitUntil) ctx.waitUntil(work); else await work;
    }

    return Response.json({ id: inserted.id, ok: true });
  } catch (e) {
    console.warn('[handleSubmitTest]', e.message);
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }
}

// Send the alcohol-detected alert email for an already-persisted test row.
async function dispatchAlert(test, env) {
  try {
    let firstTest = null;
    if (test.retest_of) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/tests?id=eq.${encodeURIComponent(test.retest_of)}&select=full_name,department,company,location_name,location_code,alcohol_value,level,created_at&limit=1`,
        { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
      );
      const rows = await r.json();
      firstTest = Array.isArray(rows) ? rows[0] || null : null;
    }

    const chRes = await fetch(
      `${SUPABASE_URL}/rest/v1/alert_channels?kind=eq.email&enabled=eq.true&select=target`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
    );
    const channels = await chRes.json();
    if (!Array.isArray(channels) || !channels.length) return;

    const email = buildAlertEmail(test, firstTest);
    const from = env.ALERT_FROM_EMAIL || 'alerts@example.com';
    for (const ch of channels) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [ch.target], subject: email.subject, html: email.html }),
      });
      if (!r.ok) console.warn('[dispatchAlert] Resend error', ch.target, await r.text());
    }
  } catch (e) {
    console.warn('[dispatchAlert]', e.message);
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
