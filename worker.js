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
      // Bound memory: a token signature is immutable, so only cache valid ones
      if (_sigCache.size > 500) _sigCache.clear();
      _sigCache.set(token, true);
    }
    return valid;
  } catch { return false; }
}

const enc  = s => new TextEncoder().encode(s);
const pad  = s => s + '='.repeat((4 - s.length % 4) % 4);
const b64u = s => btoa(unescape(encodeURIComponent(s)))
  .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
