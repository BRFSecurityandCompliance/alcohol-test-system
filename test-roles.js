// ===== Role functional access-matrix test (manager / viewer-HR / auditor) =====
// Replicates the EXACT gate expression at the top of each admin-*.html page
// and asserts the expected access + capability matrix per role.
// Run: node test-roles.js

const _store = {};
global.localStorage = { getItem: k => _store[k] ?? null, setItem: (k,v) => { _store[k] = String(v); }, removeItem: k => { delete _store[k]; }, clear: () => { for (const k in _store) delete _store[k]; } };
let _session = {};
global.sessionStorage = { getItem: k => _session[k] ?? null, setItem: (k,v) => { _session[k] = String(v); }, removeItem: k => { delete _session[k]; } };
let _redirect = null;
global.window = { supabase: null };
global.navigator = { onLine: true };
global.document = { addEventListener: () => {}, fonts: { load: () => Promise.resolve() } };
Object.defineProperty(global, 'location', { value: { set href(v){ _redirect = v; }, get href(){ return _redirect || ''; } }, configurable: true });
global.btoa = s => Buffer.from(s).toString('base64');
global.atob = s => Buffer.from(s, 'base64').toString();

const fs = require('fs'), path = require('path'), vm = require('vm');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'project/data.js'), 'utf8'), { filename: 'data.js' });

let pass = 0, fail = 0; const errors = [];
function test(label, fn) { try { fn(); console.log(`  ✓ ${label}`); pass++; } catch (e) { console.log(`  ✗ ${label}\n      ${e.message}`); errors.push({label, message: e.message}); fail++; } }
function eq(a, b, m) { if (a !== b) throw new Error(m || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function section(n) { console.log(`\n── ${n} ─────────────────────────────────────────`); }

function makeJWT(p) { const e = o => btoa(JSON.stringify(o)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); return `${e({alg:'HS256',typ:'JWT'})}.${e(p)}.sig`; }
function loginAs(role, sites = 'all') {
  _session = {}; _redirect = null;
  // uid not in SEED_USERS → currentUser() uses JWT role claim
  setAdminAuth(makeJWT({ uid: `jwt-${role}`, role, sites, exp: Math.floor(Date.now()/1000) + 3600 }));
}

resetDB();

// ── Page gate expressions (copied verbatim from each admin-*.html) ────────────
// Each returns { access: bool, redirect: string|null, caps: {...} }
function gate_settings()  { _redirect = null; if (!requireAdmin() || !hasRole('super')) { location.href = 'admin-dashboard.html'; return { access:false, redirect:_redirect }; } return { access:true, redirect:null }; }
function gate_audit()     { _redirect = null; if (!requireAdmin() || !hasRole('super','auditor')) { location.href = 'admin-dashboard.html'; return { access:false, redirect:_redirect }; } return { access:true, redirect:null }; }
function gate_reports()   { _redirect = null; if (!requireAdmin() || !hasRole('super','manager','viewer')) { location.href = 'admin-dashboard.html'; return { access:false, redirect:_redirect }; } return { access:true, redirect:null }; }
function gate_tests()     { _redirect = null; if (!requireAdmin()) return { access:false, redirect:_redirect }; return { access:true, caps:{ canEdit: canEditTest() } }; }
function gate_alerts()    { _redirect = null; if (!requireAdmin()) return { access:false, redirect:_redirect }; return { access:true, caps:{ canAct: hasRole('super','manager') } }; }
function gate_dashboard() { _redirect = null; if (!requireAdmin()) return { access:false, redirect:_redirect }; return { access:true }; }
function gate_persons()   { _redirect = null; if (!requireAdmin()) return { access:false, redirect:_redirect }; return { access:true, caps:{ canMutate: hasRole('super','manager') } }; }
function gate_locations() { _redirect = null; if (!requireAdmin()) return { access:false, redirect:_redirect }; return { access:true, caps:{ canMutate: hasRole('super','manager') } }; }
function gate_companies() { _redirect = null; if (!requireAdmin()) return { access:false, redirect:_redirect }; return { access:true, caps:{ canMutate: hasRole('super','manager') } }; }
function gate_devices()   { _redirect = null; if (!requireAdmin()) return { access:false, redirect:_redirect }; return { access:true, caps:{ canMutate: hasRole('super','manager') } }; }

// ── Expected access matrix ───────────────────────────────────────────────────
// access: can the page load?  cap: derived capability flag value
const MATRIX = {
  manager: {
    settings:  { access: false },
    audit:     { access: false },
    reports:   { access: true },
    tests:     { access: true, cap: ['canEdit', true] },
    alerts:    { access: true, cap: ['canAct', true] },
    dashboard: { access: true },
    persons:   { access: true, cap: ['canMutate', true] },
    locations: { access: true, cap: ['canMutate', true] },
    companies: { access: true, cap: ['canMutate', true] },
    devices:   { access: true, cap: ['canMutate', true] },
  },
  viewer: { // HR
    settings:  { access: false },
    audit:     { access: false },
    reports:   { access: true },
    tests:     { access: true, cap: ['canEdit', false] },
    alerts:    { access: true, cap: ['canAct', false] },
    dashboard: { access: true },
    persons:   { access: true, cap: ['canMutate', false] },
    locations: { access: true, cap: ['canMutate', false] },
    companies: { access: true, cap: ['canMutate', false] },
    devices:   { access: true, cap: ['canMutate', false] },
  },
  auditor: {
    settings:  { access: false },
    audit:     { access: true },
    reports:   { access: false },
    tests:     { access: true, cap: ['canEdit', false] },
    alerts:    { access: true, cap: ['canAct', false] },
    dashboard: { access: true },
    persons:   { access: true, cap: ['canMutate', false] },
    locations: { access: true, cap: ['canMutate', false] },
    companies: { access: true, cap: ['canMutate', false] },
    devices:   { access: true, cap: ['canMutate', false] },
  },
};
const GATES = { settings:gate_settings, audit:gate_audit, reports:gate_reports, tests:gate_tests, alerts:gate_alerts, dashboard:gate_dashboard, persons:gate_persons, locations:gate_locations, companies:gate_companies, devices:gate_devices };

for (const role of ['manager','viewer','auditor']) {
  section(`Role: ${role}${role === 'viewer' ? ' (HR)' : ''}`);
  for (const [page, expect] of Object.entries(MATRIX[role])) {
    test(`${role} → ${page}: access=${expect.access}${expect.cap ? `, ${expect.cap[0]}=${expect.cap[1]}` : ''}`, () => {
      loginAs(role);
      const r = GATES[page]();
      eq(r.access, expect.access, `access mismatch for ${page}`);
      if (!expect.access) eq(r.redirect, 'admin-dashboard.html', `${page} should redirect blocked role to dashboard`);
      if (expect.cap) eq(r.caps[expect.cap[0]], expect.cap[1], `${page} capability ${expect.cap[0]} mismatch`);
    });
  }
}

// ── Site scoping: scoped manager only sees own sites' tests ──────────────────
section('Site scoping (scoped manager)');
const SCOPE_CO = '__SCOPE_TEST_CO__';
test('scoped manager dashboard/tests filtered to assigned sites', () => {
  resetDB();
  DB.addTest({ full_name: 'A', department: 'พนักงานสำนักงาน (Office)', company: SCOPE_CO, alcohol_value: 0, is_zero: true, location_code: 'QR001', location_name: 'ปทุมธานี' });
  DB.addTest({ full_name: 'B', department: 'พนักงานสำนักงาน (Office)', company: SCOPE_CO, alcohol_value: 0, is_zero: true, location_code: 'QR005', location_name: 'สมุทรปราการ' });
  loginAs('manager', ['QR001']);
  const visible = DB.tests().filter(t => t.company === SCOPE_CO).filter(t => canViewSite(t.location_code));
  eq(visible.length, 1, 'scoped manager should only see QR001 test');
  eq(visible[0].location_code, 'QR001');
});
test('all-sites manager sees every test', () => {
  loginAs('manager', 'all');
  const visible = DB.tests().filter(t => t.company === SCOPE_CO).filter(t => canViewSite(t.location_code));
  eq(visible.length, 2, 'all-sites manager should see both tests');
});

// ── Negative: blocked role cannot perform gated mutation ─────────────────────
section('Capability enforcement (viewer/auditor are read-only)');
test('viewer canEditTest() === false (cannot resolve alerts)', () => {
  loginAs('viewer'); eq(canEditTest(), false);
});
test('auditor hasRole(super,manager) === false (cannot act on alerts)', () => {
  loginAs('auditor'); eq(hasRole('super','manager'), false);
});
test('viewer hasRole(super,manager) === false (read-only persons/locations)', () => {
  loginAs('viewer'); eq(hasRole('super','manager'), false);
});
test('manager hasRole(super) === false (locked out of settings)', () => {
  loginAs('manager'); eq(hasRole('super'), false);
});
test('auditor hasRole(super,manager,viewer) === false (locked out of reports)', () => {
  loginAs('auditor'); eq(hasRole('super','manager','viewer'), false);
});

console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${pass} passed, ${fail} failed`);
if (errors.length) { console.log('\nFailed:'); errors.forEach(e => console.log(`  ✗ ${e.label}: ${e.message}`)); }
process.exit(fail > 0 ? 1 : 0);
