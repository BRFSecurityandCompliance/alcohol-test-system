// ===== Comprehensive function test suite =====
// Run: node test-all.js

// ── Browser globals mock ──────────────────────────────────────────────────────
const _store = {};
global.localStorage = {
  getItem: k => _store[k] ?? null,
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: k => { delete _store[k]; },
  clear: () => { for (const k in _store) delete _store[k]; }
};
const _session = {};
global.sessionStorage = {
  getItem: k => _session[k] ?? null,
  setItem: (k, v) => { _session[k] = String(v); },
  removeItem: k => { delete _session[k]; },
};
global.window = { supabase: null };
global.navigator = { onLine: true, geolocation: null };
global.document = {
  addEventListener: () => {},
  fonts: { load: () => Promise.resolve() },
  createElement: () => ({ getContext: () => null })
};
global.location = { href: '' };
// Supabase stub — prevents _sb init error
global.SUPABASE_URL = 'https://stub';
global.SUPABASE_ANON_KEY = 'stub';
global._sb = undefined; // data.js checks `typeof _sb === 'undefined'`

// ── Load data.js ──────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const code = fs.readFileSync(path.join(__dirname, 'project/data.js'), 'utf8');
// runInThisContext exposes all declarations to the global scope
vm.runInThisContext(code, { filename: 'data.js' });

// ── Test harness ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const errors = [];
function test(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    pass++;
  } catch (e) {
    console.log(`  ✗ ${label}`);
    console.log(`      ${e.message}`);
    errors.push({ label, message: e.message });
    fail++;
  }
}
function assert(val, msg) { if (!val) throw new Error(msg || `Expected truthy, got: ${JSON.stringify(val)}`); }
function eq(a, b, msg) { if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function section(name) { console.log(`\n── ${name} ─────────────────────────────────────────`); }

// ── 1. Threshold logic ────────────────────────────────────────────────────────
section('getThresholdLevel');
test('value=0 → pass for all departments', () => {
  for (const dept of DEPARTMENTS) eq(getThresholdLevel(0, dept).level, 'pass');
});
test('Transport: value=1 → no-drive (zero tolerance)', () => {
  eq(getThresholdLevel(1, 'พนักงานขนส่ง (Transport)').level, 'no-drive');
});
test('Transport: value=25 → illegal', () => {
  eq(getThresholdLevel(25, 'พนักงานขนส่ง (Transport)').level, 'illegal');
});
test('Default: value=10 → caution', () => {
  eq(getThresholdLevel(10, 'พนักงานสำนักงาน (Office)').level, 'caution');
});
test('Default: value=20 → caution (boundary)', () => {
  eq(getThresholdLevel(20, 'พนักงานสำนักงาน (Office)').level, 'caution');
});
test('Default: value=21 → no-drive', () => {
  eq(getThresholdLevel(21, 'พนักงานสำนักงาน (Office)').level, 'no-drive');
});
test('Default: value=50 → no-drive (boundary)', () => {
  eq(getThresholdLevel(50, 'พนักงานสำนักงาน (Office)').level, 'no-drive');
});
test('Default: value=51 → illegal', () => {
  eq(getThresholdLevel(51, 'พนักงานสำนักงาน (Office)').level, 'illegal');
});
test('Security: value=21 → no-drive (no illegal level)', () => {
  eq(getThresholdLevel(21, 'พนักงานรักษาความปลอดภัย (Security)').level, 'no-drive');
});
test('Security: value=15 → caution', () => {
  eq(getThresholdLevel(15, 'พนักงานรักษาความปลอดภัย (Security)').level, 'caution');
});
test('Unknown dept falls back to default rules', () => {
  eq(getThresholdLevel(10, 'unknown dept').level, 'caution');
});
test('NaN/undefined value treated as 0 → pass', () => {
  eq(getThresholdLevel(NaN, 'พนักงานสำนักงาน (Office)').level, 'pass');
});

// ── 2. Device calibration status ─────────────────────────────────────────────
section('getDeviceStatus');
const future30 = new Date(Date.now() + 31 * 86400000).toISOString();
const within30 = new Date(Date.now() + 15 * 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();
test('date > 30 days away → active', () => eq(getDeviceStatus(future30), 'active'));
test('date within 30 days → due-soon', () => eq(getDeviceStatus(within30), 'due-soon'));
test('date in the past → overdue', () => eq(getDeviceStatus(past), 'overdue'));

// ── 3. Shift detection ────────────────────────────────────────────────────────
section('getShiftFromDate');
test('06:00 → morning', () => eq(getShiftFromDate(new Date().setHours(6,0,0,0) && new Date(new Date().setHours(6,0,0,0)).toISOString()).id, 'morning'));
test('14:00 → afternoon', () => eq(getShiftFromDate(new Date(new Date().setHours(14,0,0,0)).toISOString()).id, 'afternoon'));
test('22:00 → night', () => eq(getShiftFromDate(new Date(new Date().setHours(22,0,0,0)).toISOString()).id, 'night'));
test('03:00 → night (crosses midnight)', () => eq(getShiftFromDate(new Date(new Date().setHours(3,0,0,0)).toISOString()).id, 'night'));

// ── 4. i18n translations ──────────────────────────────────────────────────────
section('i18n t()');
const LANGS = ['th', 'en', 'my', 'km'];
const SAMPLE_KEYS = ['full_name', 'submit', 'rt_failed', 'rt_btn', 'offline', 'back_home'];
test('All 4 languages have no missing sample keys', () => {
  for (const lang of LANGS) {
    for (const key of SAMPLE_KEYS) {
      const v = t(key, lang);
      assert(v && v !== key, `Missing key '${key}' in lang '${lang}' (got: '${v}')`);
    }
  }
});
test('Unknown key falls back to th value', () => {
  const v = t('submit', 'unknown_lang');
  eq(v, t('submit', 'th'));
});
test('Unknown key for all langs returns key itself', () => {
  const v = t('totally_nonexistent_key_xyz', 'th');
  eq(v, 'totally_nonexistent_key_xyz');
});

// ── 5. DB CRUD — Tests ────────────────────────────────────────────────────────
section('DB.addTest / deleteTest / updateTest');
// Reset DB to clean state
resetDB();

test('addTest creates test with correct level', () => {
  const t1 = DB.addTest({ full_name: 'Test User', department: 'พนักงานขนส่ง (Transport)', company: 'ACME', alcohol_value: 15, is_zero: false, location_code: 'QR001', location_name: 'ปทุมธานี' });
  assert(t1.id, 'id missing');
  eq(t1.level, 'no-drive', 'transport 15mg% should be no-drive');
  assert(DB.tests().find(x => x.id === t1.id), 'test not found after add');
});
test('addTest with is_zero sets alcohol_value and level=pass', () => {
  const t2 = DB.addTest({ full_name: 'Zero User', department: 'พนักงานสำนักงาน (Office)', company: 'ACME', alcohol_value: 0, is_zero: true, location_code: 'QR001', location_name: 'ปทุมธานี' });
  eq(t2.level, 'pass');
  eq(t2.action_taken, null);
});
test('addTest with non-zero sets action_taken=pending', () => {
  const t3 = DB.addTest({ full_name: 'Fail User', department: 'พนักงานสำนักงาน (Office)', company: 'ACME', alcohol_value: 30, is_zero: false, location_code: 'QR001', location_name: 'ปทุมธานี' });
  eq(t3.action_taken, 'pending');
});
test('updateTest patches correctly', () => {
  const t4 = DB.addTest({ full_name: 'Patch User', department: 'พนักงานสำนักงาน (Office)', company: 'ACME', alcohol_value: 0, is_zero: true, location_code: 'QR001', location_name: 'ปทุมธานี' });
  DB.updateTest(t4.id, { retest_status: 'required' });
  const found = DB.tests().find(x => x.id === t4.id);
  eq(found.retest_status, 'required');
});
test('deleteTest removes test from list', () => {
  const t5 = DB.addTest({ full_name: 'Delete User', department: 'พนักงานสำนักงาน (Office)', company: 'ACME', alcohol_value: 0, is_zero: true, location_code: 'QR001', location_name: 'ปทุมธานี' });
  const id = t5.id;
  DB.deleteTest(id, { id: 'u1', name: 'Admin' });
  assert(!DB.tests().find(x => x.id === id), 'test still present after delete');
});

// ── 6. DB CRUD — Locations ────────────────────────────────────────────────────
section('DB.upsertLocation / deleteLocation / findLocation');
test('upsertLocation creates new location', () => {
  DB.upsertLocation({ code: 'TEST01', name: 'Test Site', address: '123', contact: 'A', phone: '000', lat: null, lng: null });
  assert(DB.findLocation('TEST01'), 'location not found');
});
test('upsertLocation updates existing location', () => {
  DB.upsertLocation({ code: 'TEST01', name: 'Updated Site', address: '456', contact: 'B', phone: '111', lat: 13.5, lng: 100.5 });
  const l = DB.findLocation('TEST01');
  eq(l.name, 'Updated Site');
  eq(l.lat, 13.5);
});
test('findLocation returns null for unknown code', () => {
  eq(DB.findLocation('ZZZNOPE'), undefined);
});
test('deleteLocation removes it', () => {
  DB.deleteLocation('TEST01');
  eq(DB.findLocation('TEST01'), undefined);
});
test('lat/lng preserved as null when not set', () => {
  DB.upsertLocation({ code: 'LATTEST', name: 'X', address: '', contact: '', phone: '', lat: null, lng: null });
  const l = DB.findLocation('LATTEST');
  eq(l.lat, null);
  eq(l.lng, null);
  DB.deleteLocation('LATTEST');
});

// ── 7. DB CRUD — Companies ────────────────────────────────────────────────────
section('DB.upsertCompany / deleteCompany');
test('upsertCompany creates new company', () => {
  DB.upsertCompany({ id: 'test-company', name: 'Test Co' });
  assert(DB.companies().find(c => c.name === 'Test Co'));
});
test('upsertCompany updates existing', () => {
  const existing = DB.companies()[0];
  DB.upsertCompany({ id: existing.id, name: 'Renamed Co' });
  assert(DB.companies().find(c => c.name === 'Renamed Co'));
});
test('deleteCompany removes it', () => {
  const c = DB.companies().find(x => x.name === 'Test Co');
  assert(c, 'test company not found to delete');
  DB.deleteCompany(c.id);
  assert(!DB.companies().find(x => x.name === 'Test Co'));
});

// ── 8. DB CRUD — Persons ─────────────────────────────────────────────────────
section('DB.upsertPerson / findPerson / deletePerson');
test('findPerson returns person by employee_id', () => {
  const p = DB.findPerson('EMP001');
  assert(p && p.full_name === 'สมชาย ใจดี');
});
test('findPerson returns undefined for unknown id', () => {
  eq(DB.findPerson('EMP999'), undefined);
});

// ── 9. DB — Settings ─────────────────────────────────────────────────────────
section('DB.settings / setSettings');
test('settings returns object with retest_minutes', () => {
  const s = DB.settings();
  assert(typeof s.retest_minutes === 'number');
});
test('setSettings persists new values', () => {
  DB.setSettings({ retest_minutes: 10 });
  eq(DB.settings().retest_minutes, 10);
  DB.setSettings({ retest_minutes: 5 }); // restore
});
test('setSettings preserves unrelated keys', () => {
  DB.setSettings({ watchlist_threshold: 3 });
  eq(DB.settings().retest_minutes, 5);
  DB.setSettings({ watchlist_threshold: 2 }); // restore
});

// ── 10. Offline queue ─────────────────────────────────────────────────────────
section('getOfflineQueue / pushOfflineQueue / flushOfflineQueue');
localStorage.removeItem('offline_queue');
test('queue starts empty', () => eq(getOfflineQueue().length, 0));
test('pushOfflineQueue adds entry', () => {
  pushOfflineQueue({ full_name: 'Offline User', department: 'พนักงานสำนักงาน (Office)', company: 'X', alcohol_value: 0, is_zero: true, location_code: 'QR001', location_name: 'ปทุมธานี' });
  eq(getOfflineQueue().length, 1);
});
test('pushOfflineQueue adds _queued_at timestamp', () => {
  assert(getOfflineQueue()[0]._queued_at);
});
test('flushOfflineQueue processes all items and clears queue', () => {
  const synced = flushOfflineQueue();
  eq(synced, 1);
  eq(getOfflineQueue().length, 0);
});
test('flushOfflineQueue on empty queue returns 0', () => {
  eq(flushOfflineQueue(), 0);
});

// ── 11. Auth helpers ──────────────────────────────────────────────────────────
section('isAdminAuthed / setAdminAuth');
// Build a valid JWT: exp = now + 3600
function makeJWT(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${body}.fakesig`;
}
global.btoa = s => Buffer.from(s).toString('base64');
global.atob = s => Buffer.from(s, 'base64').toString();

test('not authed when no token', () => {
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_auth');
  assert(!isAdminAuthed());
});
test('isAdminAuthed with valid (non-expired) JWT → true', () => {
  const token = makeJWT({ uid: 'u1', role: 'super', exp: Math.floor(Date.now() / 1000) + 3600 });
  setAdminAuth(token);
  assert(isAdminAuthed());
});
test('isAdminAuthed with expired JWT → false', () => {
  const token = makeJWT({ uid: 'u1', role: 'super', exp: Math.floor(Date.now() / 1000) - 1 });
  setAdminAuth(token);
  assert(!isAdminAuthed());
});
test('setAdminAuth(false) clears token', () => {
  setAdminAuth(false);
  assert(!sessionStorage.getItem('admin_token'));
  assert(!isAdminAuthed());
});

// ── 12. _dbClient() expiry redirect ──────────────────────────────────────────
section('_dbClient() JWT expiry redirect');
test('_dbClient redirects to login when JWT expired', () => {
  let redirected = false;
  const origHref = Object.getOwnPropertyDescriptor(global.location, 'href');
  Object.defineProperty(global.location, 'href', {
    set(v) { if (v === 'admin-login.html') redirected = true; },
    get() { return ''; },
    configurable: true
  });
  const expiredToken = makeJWT({ uid: 'u1', role: 'super', exp: Math.floor(Date.now() / 1000) - 10 });
  sessionStorage.setItem('admin_token', expiredToken);
  _dbClient(); // should trigger redirect
  assert(redirected, 'did not redirect to admin-login.html on expired token');
  if (origHref) Object.defineProperty(global.location, 'href', origHref);
  sessionStorage.removeItem('admin_token');
});
test('_dbClient returns _sb (anon) when no token present', () => {
  sessionStorage.removeItem('admin_token');
  const client = _dbClient();
  eq(client, undefined); // _sb is undefined in test env (no browser supabase)
});

// ── 13. GPS haversine distance ────────────────────────────────────────────────
section('gpsDistance (haversine)');
// gpsDistance is defined in user-form.html, so we re-declare it here
function gpsDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000, toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
test('same point → 0m', () => assert(gpsDistance(13.7563, 100.5018, 13.7563, 100.5018) < 0.01));
test('~50m north still within 100m', () => assert(gpsDistance(13.7563, 100.5018, 13.7567, 100.5018) < 100));
test('~200m away → outside 100m radius', () => assert(gpsDistance(13.7563, 100.5018, 13.7581, 100.5018) > 100));
test('Bangkok to Chiang Mai → > 500km', () => assert(gpsDistance(13.7563, 100.5018, 18.7883, 98.9853) > 500000));
test('symmetry: dist(A,B) === dist(B,A)', () => {
  const d1 = gpsDistance(13.0, 100.0, 14.0, 101.0);
  const d2 = gpsDistance(14.0, 101.0, 13.0, 100.0);
  assert(Math.abs(d1 - d2) < 0.01);
});

// ── 14. _genUUID / _isUUID ────────────────────────────────────────────────────
section('_genUUID / _isUUID');
test('_genUUID produces valid UUID format', () => {
  const id = _genUUID();
  assert(_isUUID(id), `Not a UUID: ${id}`);
});
test('_isUUID rejects non-UUID strings', () => {
  assert(!_isUUID('t1234'));
  assert(!_isUUID(''));
  assert(!_isUUID(null));
  assert(!_isUUID('not-a-uuid'));
});
test('_isUUID accepts valid UUID', () => {
  assert(_isUUID('550e8400-e29b-41d4-a716-446655440000'));
});

// ── 15. thresholdBadge output ────────────────────────────────────────────────
section('thresholdBadge');
test('zero result → pass badge with 0%', () => {
  localStorage.setItem('lang', 'th');
  const html = thresholdBadge({ is_zero: true, alcohol_value: 0, department: 'พนักงานสำนักงาน (Office)' });
  assert(html.includes('lvl-pass'));
  assert(html.includes('0%'));
});
test('non-zero illegal → lvl-illegal badge', () => {
  const html = thresholdBadge({ is_zero: false, alcohol_value: 55, department: 'พนักงานสำนักงาน (Office)' });
  assert(html.includes('lvl-illegal'));
});
test('no-drive result → lvl-danger badge', () => {
  const html = thresholdBadge({ is_zero: false, alcohol_value: 30, department: 'พนักงานสำนักงาน (Office)' });
  assert(html.includes('lvl-danger'));
});

// ── 16. watchlist auto-add ───────────────────────────────────────────────────
section('Auto-watchlist on repeated fails');
resetDB();
test('fails below threshold do not trigger watchlist', () => {
  DB.addTest({ full_name: 'Repeat Fail', department: 'พนักงานสำนักงาน (Office)', company: 'X', alcohol_value: 25, is_zero: false, location_code: 'QR001', location_name: 'ปทุมธานี' });
  eq(DB.watchlist().filter(w => w.full_name === 'Repeat Fail').length, 0);
});
test('second fail at threshold triggers watchlist (threshold=2)', () => {
  DB.setSettings({ watchlist_threshold: 2, watchlist_window_days: 30 });
  DB.addTest({ full_name: 'Repeat Fail', department: 'พนักงานสำนักงาน (Office)', company: 'X', alcohol_value: 30, is_zero: false, location_code: 'QR001', location_name: 'ปทุมธานี' });
  eq(DB.watchlist().filter(w => w.full_name === 'Repeat Fail').length, 1);
});
test('third fail does NOT add duplicate watchlist entry', () => {
  DB.addTest({ full_name: 'Repeat Fail', department: 'พนักงานสำนักงาน (Office)', company: 'X', alcohol_value: 10, is_zero: false, location_code: 'QR001', location_name: 'ปทุมธานี' });
  eq(DB.watchlist().filter(w => w.full_name === 'Repeat Fail').length, 1);
});

// ── 17. DB.testsByPerson / testsByEmployee ───────────────────────────────────
section('DB.testsByPerson / testsByEmployee');
resetDB();
DB.addTest({ employee_id: 'EMP042', full_name: 'Query User', department: 'พนักงานสำนักงาน (Office)', company: 'X', alcohol_value: 0, is_zero: true, location_code: 'QR001', location_name: 'ปทุมธานี' });
DB.addTest({ employee_id: 'EMP042', full_name: 'Query User', department: 'พนักงานสำนักงาน (Office)', company: 'X', alcohol_value: 5, is_zero: false, location_code: 'QR001', location_name: 'ปทุมธานี' });
test('testsByPerson returns all tests for that name', () => {
  assert(DB.testsByPerson('Query User').length >= 2);
});
test('testsByEmployee filters by employee_id', () => {
  assert(DB.testsByEmployee('EMP042').length >= 2);
});
test('testsByEmployee returns empty for unknown id', () => {
  eq(DB.testsByEmployee('EMPZZZ').length, 0);
});

// ── 18. DB.init guard ────────────────────────────────────────────────────────
section('DB._initialized guard');
test('init() is idempotent (second call is a no-op)', async () => {
  DB._initialized = false;
  await DB.init(); // sets _initialized = true (no Supabase in test)
  assert(DB._initialized);
  const countBefore = DB.tests().length;
  await DB.init(); // should skip
  eq(DB.tests().length, countBefore);
});
test('resetting _initialized = false forces re-run', async () => {
  DB._initialized = false;
  await DB.init();
  assert(DB._initialized);
});

// ── 19. confirmDialog helper builds DOM ─────────────────────────────────────
section('confirmDialog DOM helper');
// Minimal DOM mock for this test
global.document.createElement = (tag) => ({
  className: '', innerHTML: '', style: {}, tagName: tag.toUpperCase(),
  appendChild: () => {},
  querySelector: () => ({ onclick: null }),
  remove: () => {}
});
global.document.body = { appendChild: () => {} };
test('confirmDialog returns a Promise', () => {
  const result = confirmDialog('Title', 'Body');
  assert(result instanceof Promise);
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${pass} passed, ${fail} failed`);
if (errors.length) {
  console.log('\nFailed tests:');
  errors.forEach(e => console.log(`  ✗ ${e.label}: ${e.message}`));
}
process.exit(fail > 0 ? 1 : 0);
