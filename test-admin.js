// ===== Admin function test suite =====
// Run: node test-admin.js

// ── Browser globals mock ──────────────────────────────────────────────────────
const _store = {};
global.localStorage = {
  getItem: k => _store[k] ?? null,
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: k => { delete _store[k]; },
  clear: () => { for (const k in _store) delete _store[k]; }
};
let _session = {};
global.sessionStorage = {
  getItem: k => _session[k] ?? null,
  setItem: (k, v) => { _session[k] = String(v); },
  removeItem: k => { delete _session[k]; },
};
let _redirectTarget = null;
global.window = { supabase: null };
global.navigator = { onLine: true };
global.document = { addEventListener: () => {}, fonts: { load: () => Promise.resolve() } };
Object.defineProperty(global, 'location', {
  value: { set href(v) { _redirectTarget = v; }, get href() { return _redirectTarget || ''; } },
  configurable: true, writable: true
});
global.btoa = s => Buffer.from(s).toString('base64');
global.atob = s => Buffer.from(s, 'base64').toString();

const fs = require('fs');
const path = require('path');
const vm = require('vm');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'project/data.js'), 'utf8'), { filename: 'data.js' });

// ── Test harness ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const errors = [];
function test(label, fn) {
  try { fn(); console.log(`  ✓ ${label}`); pass++; }
  catch (e) { console.log(`  ✗ ${label}\n      ${e.message}`); errors.push({ label, message: e.message }); fail++; }
}
function assert(v, m) { if (!v) throw new Error(m || `Expected truthy, got ${JSON.stringify(v)}`); }
function eq(a, b, m) { if (a !== b) throw new Error(m || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function section(n) { console.log(`\n── ${n} ─────────────────────────────────────────`); }

// JWT builder
function makeJWT(payload) {
  const enc = o => btoa(JSON.stringify(o)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${enc({alg:'HS256',typ:'JWT'})}.${enc(payload)}.sig`;
}
// Default uid is NOT in SEED_USERS so currentUser() uses JWT role claims.
// (Seeded ids u1-u4 map to fixed roles and would override the JWT.)
function loginAs(role, opts = {}) {
  _session = {};
  const token = makeJWT({ uid: opts.uid || `jwt-${role}`, role, sites: opts.sites || 'all', exp: Math.floor(Date.now()/1000) + 3600 });
  setAdminAuth(token);
}
function logout() { _session = {}; }

resetDB();

// ── 1. currentUser() ──────────────────────────────────────────────────────────
section('currentUser()');
test('returns null when not logged in', () => { logout(); eq(currentUser(), null); });
test('resolves user from DB by uid', () => {
  loginAs('super', { uid: 'u1' });
  const u = currentUser();
  assert(u, 'no user');
  eq(u.id, 'u1');
  eq(u.role, 'super');
});
test('falls back to JWT claims when uid not in DB', () => {
  loginAs('manager', { uid: 'unknown-uid', sites: ['QR001'] });
  const u = currentUser();
  assert(u, 'no user from JWT fallback');
  eq(u.role, 'manager');
  assert(Array.isArray(u.sites) && u.sites.includes('QR001'));
});

// ── 2. hasRole() ──────────────────────────────────────────────────────────────
section('hasRole()');
test('super matches hasRole("super")', () => { loginAs('super'); assert(hasRole('super')); });
test('manager does NOT match hasRole("super")', () => { loginAs('manager'); assert(!hasRole('super')); });
test('hasRole accepts multiple roles', () => { loginAs('auditor'); assert(hasRole('super','auditor')); });
test('returns false when logged out', () => { logout(); assert(!hasRole('super')); });

// ── 3. canEditTest() ──────────────────────────────────────────────────────────
section('canEditTest()');
test('super can edit', () => { loginAs('super'); assert(canEditTest()); });
test('manager can edit', () => { loginAs('manager'); assert(canEditTest()); });
test('viewer cannot edit', () => { loginAs('viewer'); assert(!canEditTest()); });
test('auditor cannot edit', () => { loginAs('auditor'); assert(!canEditTest()); });

// ── 4. canViewSite() ──────────────────────────────────────────────────────────
section('canViewSite()');
test('sites="all" can view any site', () => {
  loginAs('super', { sites: 'all' });
  assert(canViewSite('QR001'));
  assert(canViewSite('QR999'));
});
test('scoped manager can view assigned site only', () => {
  loginAs('manager', { uid: 'scoped-mgr', sites: ['QR001','QR002'] });
  assert(canViewSite('QR001'));
  assert(!canViewSite('QR003'));
});
test('returns false when logged out', () => { logout(); assert(!canViewSite('QR001')); });

// ── 5. requireAdmin() ─────────────────────────────────────────────────────────
section('requireAdmin()');
test('redirects to login when not authed', () => {
  logout(); _redirectTarget = null;
  const ok = requireAdmin();
  eq(ok, false);
  eq(_redirectTarget, 'admin-login.html');
});
test('passes with valid JWT', () => {
  loginAs('super'); _redirectTarget = null;
  eq(requireAdmin(), true);
  eq(_redirectTarget, null);
});
test('rejects legacy session without JWT token', () => {
  _session = {}; _redirectTarget = null;
  sessionStorage.setItem('admin_auth', '1'); // legacy flag, no token
  eq(requireAdmin(), false);
  eq(_redirectTarget, 'admin-login.html');
});
test('rejects expired JWT', () => {
  _session = {}; _redirectTarget = null;
  setAdminAuth(makeJWT({ uid: 'u1', role: 'super', exp: Math.floor(Date.now()/1000) - 5 }));
  eq(requireAdmin(), false);
  eq(_redirectTarget, 'admin-login.html');
});

// ── 6. renderTopbar() role-based nav ─────────────────────────────────────────
section('renderTopbar() role filtering');
test('super sees Settings + Audit links', () => {
  loginAs('super');
  const html = renderTopbar('dashboard');
  assert(html.includes('admin-settings.html'), 'super missing Settings');
  assert(html.includes('admin-audit.html'), 'super missing Audit');
});
test('manager does NOT see Settings or Audit', () => {
  loginAs('manager');
  const html = renderTopbar('dashboard');
  assert(!html.includes('admin-settings.html'), 'manager should not see Settings');
  assert(!html.includes('admin-audit.html'), 'manager should not see Audit');
});
test('viewer does NOT see Settings/Audit but sees Alerts', () => {
  loginAs('viewer');
  const html = renderTopbar('alerts');
  assert(!html.includes('admin-settings.html'));
  assert(!html.includes('admin-audit.html'));
  assert(html.includes('admin-alerts.html'), 'viewer missing Alerts');
});
test('auditor sees Audit + Alerts but NOT Settings', () => {
  loginAs('auditor');
  const html = renderTopbar('audit');
  assert(html.includes('admin-audit.html'), 'auditor missing Audit');
  assert(html.includes('admin-alerts.html'), 'auditor missing Alerts');
  assert(!html.includes('admin-settings.html'), 'auditor should not see Settings');
});
test('active nav key gets active class', () => {
  loginAs('super');
  const html = renderTopbar('reports');
  assert(/admin-reports\.html" class="active"/.test(html), 'reports not marked active');
});
test('pending alerts count shows pill-dot', () => {
  loginAs('super');
  resetDB();
  DB.addTest({ full_name: 'Pending Guy', department: 'พนักงานสำนักงาน (Office)', company: 'X', alcohol_value: 30, is_zero: false, location_code: 'QR001', location_name: 'ปทุมธานี' });
  const html = renderTopbar('dashboard');
  assert(html.includes('pill-dot'), 'no pending pill shown for pending action');
});

// ── 7. DB.upsertUser / deleteUser ────────────────────────────────────────────
section('DB.upsertUser / deleteUser');
test('upsertUser adds a new admin user', () => {
  DB.upsertUser({ id: 'newuser', username: 'jdoe', name: 'J Doe', email: 'j@x.com', role: 'viewer', sites: 'all' });
  assert(DB.users().find(u => u.username === 'jdoe'), 'user not added');
});
test('upsertUser updates existing user by username', () => {
  const existing = DB.users().find(u => u.username === 'jdoe');
  DB.upsertUser({ id: existing.id, username: 'jdoe', name: 'Jane Doe', email: 'j@x.com', role: 'manager', sites: ['QR001'] });
  const u = DB.users().find(x => x.username === 'jdoe');
  eq(u.name, 'Jane Doe');
  eq(u.role, 'manager');
});
test('deleteUser removes the user', () => {
  const u = DB.users().find(x => x.username === 'jdoe');
  DB.deleteUser(u.id);
  assert(!DB.users().find(x => x.username === 'jdoe'), 'user still present');
});
test('findUser locates seeded admin', () => {
  const u = DB.findUser('admin');
  assert(u && u.role === 'super');
});

// ── 8. DB.upsertChannel / deleteChannel ──────────────────────────────────────
section('DB.upsertChannel / deleteChannel');
test('upsertChannel adds an alert channel', () => {
  DB.upsertChannel({ id: 'newch', kind: 'email', label: 'Test Email', target: 'test@x.com', enabled: true });
  assert(DB.channels().find(c => c.label === 'Test Email'), 'channel not added');
});
test('upsertChannel updates existing channel', () => {
  const ch = DB.channels().find(c => c.label === 'Test Email');
  DB.upsertChannel({ id: ch.id, kind: 'email', label: 'Updated Email', target: 'new@x.com', enabled: false });
  const u = DB.channels().find(c => c.id === ch.id);
  eq(u.label, 'Updated Email');
  eq(u.enabled, false);
});
test('deleteChannel removes the channel', () => {
  const ch = DB.channels().find(c => c.label === 'Updated Email');
  DB.deleteChannel(ch.id);
  assert(!DB.channels().find(c => c.label === 'Updated Email'), 'channel still present');
});

// ── 9. Audit log ─────────────────────────────────────────────────────────────
section('DB.addAudit / DB.audit / auto-audit on delete');
test('addAudit prepends an entry', () => {
  const before = DB.audit().length;
  DB.addAudit({ actor_id: 'u1', actor_name: 'Admin', action: 'test_action', target: 'x', detail: 'unit test' });
  eq(DB.audit().length, before + 1);
  eq(DB.audit()[0].action, 'test_action');
});
test('deleteTest writes an audit entry', () => {
  const t = DB.addTest({ full_name: 'Audit Victim', department: 'พนักงานสำนักงาน (Office)', company: 'X', alcohol_value: 0, is_zero: true, location_code: 'QR001', location_name: 'ปทุมธานี' });
  const before = DB.audit().length;
  DB.deleteTest(t.id, { id: 'u1', name: 'Admin' });
  assert(DB.audit().length > before, 'no audit entry created on delete');
  eq(DB.audit()[0].action, 'delete_test');
});
test('updateTest writes an audit entry', () => {
  const t = DB.addTest({ full_name: 'Audit Update', department: 'พนักงานสำนักงาน (Office)', company: 'X', alcohol_value: 0, is_zero: true, location_code: 'QR001', location_name: 'ปทุมธานี' });
  const before = DB.audit().length;
  DB.updateTest(t.id, { action_taken: 'sent-home' }, { id: 'u1', name: 'Admin' });
  assert(DB.audit().length > before, 'no audit entry on update');
  eq(DB.audit()[0].action, 'update_test');
});

// ── 10. Watchlist management ─────────────────────────────────────────────────
section('DB.watchlist / removeFromWatchlist');
test('removeFromWatchlist deletes an entry', () => {
  resetDB();
  DB.setSettings({ watchlist_threshold: 2, watchlist_window_days: 30 });
  DB.addTest({ full_name: 'WL Person', department: 'พนักงานสำนักงาน (Office)', company: 'X', alcohol_value: 25, is_zero: false, location_code: 'QR001', location_name: 'ปทุมธานี' });
  DB.addTest({ full_name: 'WL Person', department: 'พนักงานสำนักงาน (Office)', company: 'X', alcohol_value: 30, is_zero: false, location_code: 'QR001', location_name: 'ปทุมธานี' });
  const entry = DB.watchlist().find(w => w.full_name === 'WL Person');
  assert(entry, 'watchlist entry not created');
  DB.removeFromWatchlist(entry.id);
  assert(!DB.watchlist().find(w => w.id === entry.id), 'entry not removed');
});

// ── 11. Role labels integrity ─────────────────────────────────────────────────
section('ROLE_LABELS coverage');
test('every seeded user role has a ROLE_LABELS entry', () => {
  for (const u of DB.users()) {
    assert(ROLE_LABELS[u.role], `Missing ROLE_LABELS for role '${u.role}'`);
  }
});
test('all 4 roles defined', () => {
  ['super','manager','viewer','auditor'].forEach(r => assert(ROLE_LABELS[r], `missing ${r}`));
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${pass} passed, ${fail} failed`);
if (errors.length) {
  console.log('\nFailed tests:');
  errors.forEach(e => console.log(`  ✗ ${e.label}: ${e.message}`));
}
process.exit(fail > 0 ? 1 : 0);
