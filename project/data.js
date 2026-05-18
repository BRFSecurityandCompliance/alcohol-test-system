// ===== Alcohol Test System — Data Layer =====
const DB_KEY = 'alcohol_test_db_v2';

// ----- Seed: Locations -----
const SEED_LOCATIONS = [
  { code: 'QR001', name: 'ปทุมธานี', address: '123 ถ.รังสิต-ปทุมธานี', contact: 'คุณสมชาย', phone: '02-111-1111', lat: null, lng: null },
  { code: 'QR002', name: 'บางเลน', address: '45 ถ.บางเลน นครปฐม', contact: 'คุณวิภา', phone: '02-222-2222', lat: null, lng: null },
  { code: 'QR003', name: 'นครปฐม', address: '88 ถ.เพชรเกษม', contact: 'คุณอรุณ', phone: '02-333-3333', lat: null, lng: null },
  { code: 'QR004', name: 'สมุทรสาคร', address: '12 ถ.พระราม 2', contact: 'คุณชัย', phone: '02-444-4444', lat: null, lng: null },
  { code: 'QR005', name: 'สมุทรปราการ', address: '99 ถ.บางนา-ตราด', contact: 'คุณนภา', phone: '02-555-5555', lat: null, lng: null },
  { code: 'QR006', name: 'นนทบุรี', address: '7 ถ.รัตนาธิเบศร์', contact: 'คุณอาทิตย์', phone: '02-666-6666', lat: null, lng: null },
  { code: 'QR007', name: 'อยุธยา', address: '34 ถ.โรจนะ', contact: 'คุณพลอย', phone: '035-111-111', lat: null, lng: null },
  { code: 'QR008', name: 'ฉะเชิงเทรา', address: '56 ถ.สุวินทวงศ์', contact: 'คุณธนา', phone: '038-222-222', lat: null, lng: null },
  { code: 'QR009', name: 'ระยอง', address: '21 ถ.สุขุมวิท', contact: 'คุณสุดา', phone: '038-333-333', lat: null, lng: null },
  { code: 'QR010', name: 'ชลบุรี', address: '67 ถ.บางแสน', contact: 'คุณกฤษ', phone: '038-444-444', lat: null, lng: null },
  { code: 'QR011', name: 'ราชบุรี', address: '13 ถ.เพชรเกษม', contact: 'คุณมาลี', phone: '032-555-555', lat: null, lng: null },
  { code: 'QR012', name: 'กาญจนบุรี', address: '78 ถ.แสงชูโต', contact: 'คุณวีระ', phone: '034-666-666', lat: null, lng: null },
  { code: 'QR013', name: 'จุดทดสอบ GPS (Test)', address: 'ทดสอบระบบตรวจสอบพิกัด GPS', contact: 'Admin', phone: '000-000-0000', lat: 13.7563, lng: 100.5018 }
];

const SEED_COMPANIES = [
  { id: 'c1', name: 'บริษัท ทรานส์โลจิสติกส์ จำกัด' },
  { id: 'c2', name: 'บริษัท ซีพี ออลล์ จำกัด' },
  { id: 'c3', name: 'บริษัท สยามขนส่ง จำกัด' },
  { id: 'c4', name: 'บริษัท เซเว่นโลจิสติกส์ จำกัด' },
  { id: 'c5', name: 'บริษัท ไทยเด็กซ์เพรส จำกัด' }
];

const DEPARTMENTS = [
  'พนักงานขนส่ง (Transport)',
  'พนักงานคลังสินค้า (Warehouse)',
  'พนักงานสำนักงาน (Office)',
  'พนักงานรักษาความปลอดภัย (Security)',
  'ผู้เยี่ยมชมสถานที่ (Visitor)',
  'ฝึกงาน (Intern)'
];

// ===== FEATURE #2: Threshold Rules (mg%) — based on Thai law =====
// Department-specific overrides; default applies to others
const THRESHOLDS = {
  default: [
    { max: 0,   level: 'pass',     label: 'ผ่าน',          color: 'success' },
    { max: 20,  level: 'caution',  label: 'เตือน',         color: 'warn' },
    { max: 50,  level: 'no-drive', label: 'ห้ามขับ',       color: 'danger' },
    { max: Infinity, level: 'illegal', label: 'ผิดกฎหมาย', color: 'danger-strong' }
  ],
  // Transport / Security: zero tolerance
  'พนักงานขนส่ง (Transport)': [
    { max: 0,        level: 'pass',     label: 'ผ่าน',          color: 'success' },
    { max: 20,       level: 'no-drive', label: 'ห้ามขับ',       color: 'danger' },
    { max: Infinity, level: 'illegal',  label: 'ผิดกฎหมาย',     color: 'danger-strong' }
  ],
  'พนักงานรักษาความปลอดภัย (Security)': [
    { max: 0,        level: 'pass',     label: 'ผ่าน',          color: 'success' },
    { max: 20,       level: 'caution',  label: 'เตือน',         color: 'warn' },
    { max: Infinity, level: 'no-drive', label: 'ห้ามปฏิบัติงาน', color: 'danger' }
  ]
};

function getThresholdLevel(value, department) {
  const rules = THRESHOLDS[department] || THRESHOLDS.default;
  const v = Number(value) || 0;
  // First rule covers exactly 0 → pass
  if (v === 0) return rules[0];
  for (const r of rules) {
    if (v <= r.max && r.max !== 0) return r;
  }
  return rules[rules.length - 1];
}

const PLATE_REQUIRED_DEPTS = ['พนักงานขนส่ง (Transport)'];

// ===== FEATURE #14: Shifts =====
const SHIFTS = [
  { id: 'morning',   label: 'เช้า (06:00-14:00)',  start: 6,  end: 14, icon: '☀️' },
  { id: 'afternoon', label: 'บ่าย (14:00-22:00)',  start: 14, end: 22, icon: '🌤️' },
  { id: 'night',     label: 'ดึก (22:00-06:00)',   start: 22, end: 30, icon: '🌙' }
];
function getShiftFromDate(iso) {
  const h = new Date(iso).getHours();
  if (h >= 6 && h < 14) return SHIFTS[0];
  if (h >= 14 && h < 22) return SHIFTS[1];
  return SHIFTS[2];
}

// ===== FEATURE #13: Devices =====
const SEED_DEVICES = [
  { id: 'd1', serial: 'BT-AL7-0001', asset_no: '', model: 'AlcoSense AL7000', location_code: 'QR001', last_calibrated: '2026-03-15', next_calibration: '2026-09-15', status: 'active' },
  { id: 'd2', serial: 'BT-AL7-0002', asset_no: '', model: 'AlcoSense AL7000', location_code: 'QR002', last_calibrated: '2026-02-20', next_calibration: '2026-08-20', status: 'active' },
  { id: 'd3', serial: 'BT-AL7-0003', asset_no: '', model: 'AlcoSense AL7000', location_code: 'QR003', last_calibrated: '2025-11-10', next_calibration: '2026-05-10', status: 'due-soon' },
  { id: 'd4', serial: 'BT-X3-0007',  asset_no: '', model: 'Drager X-3',       location_code: 'QR004', last_calibrated: '2026-04-01', next_calibration: '2026-10-01', status: 'active' },
  { id: 'd5', serial: 'BT-X3-0008',  asset_no: '', model: 'Drager X-3',       location_code: 'QR005', last_calibrated: '2025-09-15', next_calibration: '2026-03-15', status: 'overdue' },
  { id: 'd6', serial: 'BT-AL7-0009', asset_no: '', model: 'AlcoSense AL7000', location_code: 'QR006', last_calibrated: '2026-04-20', next_calibration: '2026-10-20', status: 'active' },
  { id: 'd7', serial: 'BT-AL7-0010', asset_no: '', model: 'AlcoSense AL7000', location_code: 'QR007', last_calibrated: '2026-03-30', next_calibration: '2026-09-30', status: 'active' },
  { id: 'd8', serial: 'BT-X3-0011',  asset_no: '', model: 'Drager X-3',       location_code: 'QR008', last_calibrated: '2026-01-10', next_calibration: '2026-07-10', status: 'active' }
];
function getDeviceStatus(nextDate) {
  const days = (new Date(nextDate) - Date.now()) / 86400000;
  if (days < 0) return 'overdue';
  if (days < 30) return 'due-soon';
  return 'active';
}

// ===== FEATURE #8: User Roles =====
const SEED_USERS = [
  { id: 'u1', username: 'admin',    name: 'ผู้ดูแลระบบหลัก',    role: 'super',    sites: 'all', email: 'admin@example.com' },
  { id: 'u2', username: 'manager1', name: 'สมศักดิ์ จัดการดี',  role: 'manager',  sites: ['QR001','QR002'], email: 'sm@example.com' },
  { id: 'u3', username: 'hr1',      name: 'นภา ทรัพยากร',      role: 'viewer',   sites: 'all', email: 'hr@example.com' },
  { id: 'u4', username: 'audit1',   name: 'จิรา ตรวจสอบ',      role: 'auditor',  sites: 'all', email: 'audit@example.com' }
];
const ROLE_LABELS = {
  super:   { label: 'Super Admin',   color: 'brand',   desc: 'จัดการทุกอย่าง' },
  manager: { label: 'Site Manager',  color: 'success', desc: 'ดูเฉพาะสถานที่ของตัวเอง' },
  viewer:  { label: 'HR / Viewer',   color: 'warn',    desc: 'อ่านอย่างเดียว' },
  auditor: { label: 'Auditor',       color: 'danger',  desc: 'อ่าน + audit log' }
};

// ===== FEATURE #1: Alert channels =====
const SEED_ALERT_CHANNELS = [
  { id: 'ch1', kind: 'line',    target: 'group:safety-team',          enabled: true,  label: 'LINE — ทีมความปลอดภัย' },
  { id: 'ch2', kind: 'line',    target: 'group:transport-supervisor', enabled: true,  label: 'LINE — หัวหน้าขนส่ง' },
  { id: 'ch3', kind: 'email',   target: 'safety@company.com',         enabled: true,  label: 'Email — ทีมความปลอดภัย' },
  { id: 'ch4', kind: 'email',   target: 'hr@company.com',             enabled: true,  label: 'Email — HR' },
  { id: 'ch5', kind: 'webhook', target: 'https://hooks.slack.com/...', enabled: false, label: 'Slack #alcohol-alerts' }
];

// ===== FEATURE #15: Offline queue =====
function getOfflineQueue() {
  try { return JSON.parse(localStorage.getItem('offline_queue') || '[]'); } catch { return []; }
}
function pushOfflineQueue(test) {
  const q = getOfflineQueue();
  q.push({ ...test, _queued_at: new Date().toISOString() });
  localStorage.setItem('offline_queue', JSON.stringify(q));
}
function flushOfflineQueue() {
  const q = getOfflineQueue();
  if (!q.length) return 0;
  const failed = [];
  q.forEach(t => {
    const queued_at = t._queued_at;
    delete t._queued_at;
    // Preserve the original submission time so shift/timestamp are correct
    if (queued_at && !t.created_at) t.created_at = queued_at;
    try { DB.addTest(t); } catch (e) { console.warn('[flushOfflineQueue] failed item:', e); failed.push(t); }
  });
  localStorage.setItem('offline_queue', failed.length ? JSON.stringify(failed) : '[]');
  return q.length - failed.length;
}

// ===== FEATURE #11: Persons (employee directory for quick re-entry) =====
const SEED_PERSONS = [
  { id: 'p1', employee_id: 'EMP001', full_name: 'สมชาย ใจดี',     department: 'พนักงานขนส่ง (Transport)', company: 'บริษัท ทรานส์โลจิสติกส์ จำกัด', plate_number: '70-1001', phone: '081-111-1111' },
  { id: 'p2', employee_id: 'EMP002', full_name: 'วิภา รักงาน',    department: 'พนักงานคลังสินค้า (Warehouse)', company: 'บริษัท ซีพี ออลล์ จำกัด', plate_number: '', phone: '081-222-2222' },
  { id: 'p3', employee_id: 'EMP003', full_name: 'อรุณ ตั้งใจ',    department: 'พนักงานสำนักงาน (Office)', company: 'บริษัท สยามขนส่ง จำกัด', plate_number: '', phone: '081-333-3333' },
  { id: 'p4', employee_id: 'EMP004', full_name: 'ชัย มั่นคง',     department: 'พนักงานขนส่ง (Transport)', company: 'บริษัท เซเว่นโลจิสติกส์ จำกัด', plate_number: '73-1010', phone: '081-444-4444' },
  { id: 'p5', employee_id: 'EMP005', full_name: 'นภา ขยัน',       department: 'พนักงานรักษาความปลอดภัย (Security)', company: 'บริษัท ไทยเด็กซ์เพรส จำกัด', plate_number: '', phone: '081-555-5555' }
];

// ===== Generate richer SEED_TESTS =====
const SEED_TESTS = (() => {
  const out = [];
  const now = Date.now();
  const names = ['สมชาย ใจดี', 'วิภา รักงาน', 'อรุณ ตั้งใจ', 'ชัย มั่นคง', 'นภา ขยัน', 'อาทิตย์ พากเพียร', 'พลอย สุขใส', 'ธนา รุ่งเรือง', 'สุดา มีสุข', 'กฤษ แข็งแรง', 'มาลี งามพร้อม', 'วีระ ก้าวหน้า'];
  const empIds = ['EMP001','EMP002','EMP003','EMP004','EMP005','EMP006','EMP007','EMP008','EMP009','EMP010','EMP011','EMP012'];
  for (let i = 0; i < 60; i++) {
    const loc = SEED_LOCATIONS[i % 12];
    const co = SEED_COMPANIES[i % 5];
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
    // ~80% pass, 12% caution, 6% no-drive, 2% illegal
    const r = Math.random();
    let value, isZero;
    if (r < 0.80) { value = 0; isZero = true; }
    else if (r < 0.92) { value = +(Math.random() * 19 + 1).toFixed(0); isZero = false; }
    else if (r < 0.98) { value = +(Math.random() * 29 + 21).toFixed(0); isZero = false; }
    else { value = +(Math.random() * 30 + 51).toFixed(0); isZero = false; }
    const created = new Date(now - i * 3600 * 1000 * (Math.random() * 6 + 0.5));
    const device = SEED_DEVICES.find(d => d.location_code === loc.code) || SEED_DEVICES[0];
    out.push({
      id: 't' + (1000 + i),
      employee_id: empIds[i % empIds.length],
      full_name: names[i % names.length],
      department: dept,
      plate_number: PLATE_REQUIRED_DEPTS.includes(dept) ? `${70 + (i%30)}-${1000 + i * 3}` : '',
      company: co.name,
      alcohol_value: value,
      is_zero: isZero,
      level: getThresholdLevel(value, dept).level,
      location_code: loc.code,
      location_name: loc.name,
      photo_url: '',
      shift_id: getShiftFromDate(created.toISOString()).id,
      device_serial: device.serial,
      operator_id: i % 3 === 0 ? 'u2' : 'u1',
      signature_operator: '',
      retest_of: null,
      retest_status: null, // null | 'required' | 'completed' | 'failed'
      action_taken: !isZero ? (i % 4 === 0 ? 'sent-home' : (i % 4 === 1 ? 'suspended' : 'pending')) : null,
      action_note: '',
      action_by: null,
      created_at: created.toISOString()
    });
  }
  // Add a couple of retest pairs
  if (out.length > 5) {
    const orig = out[2]; orig.is_zero = false; orig.alcohol_value = 25; orig.level = getThresholdLevel(25, orig.department).level; orig.retest_status = 'completed';
    out.unshift({
      ...orig,
      id: 't' + Date.now() + '_rt',
      alcohol_value: 8, is_zero: false, level: getThresholdLevel(8, orig.department).level,
      retest_of: orig.id,
      created_at: new Date(new Date(orig.created_at).getTime() + 6 * 60000).toISOString()
    });
  }
  return out;
})();

// ===== FEATURE #7: Audit Log =====
const SEED_AUDIT = [
  { id: 'a1', actor_id: 'u1', actor_name: 'ผู้ดูแลระบบหลัก', action: 'delete_test', target: 't9999', detail: 'ลบผลตรวจ (เหตุ: ทดสอบระบบ)', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'a2', actor_id: 'u2', actor_name: 'สมศักดิ์ จัดการดี', action: 'update_threshold', target: 'Transport', detail: 'แก้ไข threshold พนักงานขนส่ง', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'a3', actor_id: 'u1', actor_name: 'ผู้ดูแลระบบหลัก', action: 'add_user', target: 'manager1', detail: 'เพิ่มผู้ใช้ Site Manager', created_at: new Date(Date.now() - 86400000).toISOString() }
];

// ===== Storage =====
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const fresh = {
    locations: SEED_LOCATIONS,
    companies: SEED_COMPANIES,
    tests: SEED_TESTS,
    devices: SEED_DEVICES,
    users: SEED_USERS,
    persons: SEED_PERSONS,
    channels: SEED_ALERT_CHANNELS,
    audit: SEED_AUDIT,
    watchlist: [],
    settings: {
      retest_minutes: 5,
      watchlist_threshold: 2,
      watchlist_window_days: 30,
      thresholds: THRESHOLDS,
      language: 'th',
      shifts_enabled: true
    }
  };
  saveDB(fresh);
  return fresh;
}
function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function resetDB() { localStorage.removeItem(DB_KEY); localStorage.removeItem('offline_queue'); return loadDB(); }

// ===== DB API =====
const DB = {
  get all() { return loadDB(); },
  locations() { return loadDB().locations; },
  companies() { return loadDB().companies; },
  tests() { return loadDB().tests.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); },
  devices() { return loadDB().devices; },
  users() { return loadDB().users; },
  persons() { return loadDB().persons; },
  channels() { return loadDB().channels; },
  audit() { return loadDB().audit; },
  settings() { return loadDB().settings; },
  findLocation(code) { return loadDB().locations.find(l => l.code === code); },
  findPerson(empId) { return loadDB().persons.find(p => p.employee_id === empId); },
  findUser(username) { return loadDB().users.find(u => u.username === username); },

  addTest(t) {
    const db = loadDB();
    const created = new Date();
    const enriched = {
      ...t,
      id: t.id || ('t' + Date.now()),
      level: getThresholdLevel(t.alcohol_value, t.department).level,
      shift_id: getShiftFromDate(created.toISOString()).id,
      action_taken: t.action_taken || (!t.is_zero ? 'pending' : null),
      created_at: t.created_at || created.toISOString()
    };
    db.tests.unshift(enriched);
    // Auto-watchlist check
    if (!enriched.is_zero) {
      if (!db.watchlist) db.watchlist = [];
      const cutoff = Date.now() - db.settings.watchlist_window_days * 86400000;
      const recent = db.tests.filter(x => x.full_name === enriched.full_name && !x.is_zero && new Date(x.created_at).getTime() >= cutoff);
      if (recent.length >= db.settings.watchlist_threshold && !db.watchlist.find(w => w.full_name === enriched.full_name)) {
        db.watchlist.push({ id: 'w' + Date.now(), full_name: enriched.full_name, employee_id: enriched.employee_id, reason: `ตรวจพบ ${recent.length} ครั้งใน ${db.settings.watchlist_window_days} วัน`, added_at: new Date().toISOString() });
      }
    }
    saveDB(db);
    return enriched;
  },
  deleteTest(id, actor) {
    const db = loadDB();
    const t = db.tests.find(x => x.id === id);
    db.tests = db.tests.filter(t => t.id !== id);
    if (t) db.audit.unshift({ id: 'a' + Date.now(), actor_id: actor?.id || 'u1', actor_name: actor?.name || 'Admin', action: 'delete_test', target: id, detail: `ลบผลตรวจของ ${t.full_name}`, created_at: new Date().toISOString() });
    saveDB(db);
  },
  updateTest(id, patch, actor) {
    const db = loadDB();
    const i = db.tests.findIndex(t => t.id === id);
    if (i >= 0) {
      const before = JSON.stringify(db.tests[i]);
      db.tests[i] = { ...db.tests[i], ...patch };
      db.audit.unshift({ id: 'a' + Date.now(), actor_id: actor?.id || null, actor_name: actor?.name || 'Unknown', action: 'update_test', target: id, detail: `แก้ไข: ${Object.keys(patch).join(', ')}`, created_at: new Date().toISOString() });
      saveDB(db);
    }
  },
  upsertLocation(loc) { const db = loadDB(); const i = db.locations.findIndex(l => l.code === loc.code); if (i >= 0) db.locations[i] = loc; else db.locations.push(loc); saveDB(db); },
  deleteLocation(code) { const db = loadDB(); db.locations = db.locations.filter(l => l.code !== code); saveDB(db); },
  upsertCompany(c) { const db = loadDB(); const i = db.companies.findIndex(x => x.id === c.id); if (i >= 0) db.companies[i] = c; else db.companies.push({ ...c, id: 'c' + Date.now() }); saveDB(db); },
  deleteCompany(id) { const db = loadDB(); db.companies = db.companies.filter(c => c.id !== id); saveDB(db); },
  upsertDevice(d) { const db = loadDB(); const i = db.devices.findIndex(x => x.id === d.id); if (i >= 0) db.devices[i] = d; else db.devices.push({ ...d, id: 'd' + Date.now() }); saveDB(db); },
  deleteDevice(id) { const db = loadDB(); db.devices = db.devices.filter(d => d.id !== id); saveDB(db); },
  upsertUser(u) { const db = loadDB(); const i = db.users.findIndex(x => x.id === u.id); if (i >= 0) db.users[i] = u; else db.users.push({ ...u, id: 'u' + Date.now() }); saveDB(db); },
  deleteUser(id) { const db = loadDB(); db.users = db.users.filter(u => u.id !== id); saveDB(db); },
  upsertChannel(c) { const db = loadDB(); const i = db.channels.findIndex(x => x.id === c.id); if (i >= 0) db.channels[i] = c; else db.channels.push({ ...c, id: 'ch' + Date.now() }); saveDB(db); },
  deleteChannel(id) { const db = loadDB(); db.channels = db.channels.filter(c => c.id !== id); saveDB(db); },
  setSettings(s) { const db = loadDB(); db.settings = { ...db.settings, ...s }; saveDB(db); },
  addAudit(entry) { const db = loadDB(); db.audit.unshift({ id: 'a' + Date.now(), created_at: new Date().toISOString(), ...entry }); saveDB(db); },
  watchlist() { return loadDB().watchlist || []; },
  removeFromWatchlist(id) { const db = loadDB(); db.watchlist = (db.watchlist || []).filter(w => w.id !== id); saveDB(db); },

  // Person history
  testsByPerson(name) { return loadDB().tests.filter(t => t.full_name === name); },
  testsByEmployee(empId) { return loadDB().tests.filter(t => t.employee_id === empId); },

  startPolling(renderFn, ms = 5000) {
    if (DB._pollTimer) clearInterval(DB._pollTimer);
    DB._pollTimer = setInterval(() => DB.init().then(renderFn), ms);
    window.addEventListener('pagehide', () => clearInterval(DB._pollTimer));
  }
};

// ===== Helpers =====
function _uiLang() { return localStorage.getItem('lang') || 'th'; }
function _loc() { return _uiLang() === 'en' ? 'en-GB' : 'th-TH'; }
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(_loc(), { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(_loc(), { hour: '2-digit', minute: '2-digit' });
}
function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString(_loc(), { day: '2-digit', month: 'short', year: '2-digit' });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(_loc(), { hour: '2-digit', minute: '2-digit' });
}
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const en = _uiLang() === 'en';
  if (s < 60) return en ? 'just now' : 'เมื่อสักครู่';
  if (s < 3600) return en ? `${Math.floor(s/60)}m ago` : `${Math.floor(s/60)} นาทีที่แล้ว`;
  if (s < 86400) return en ? `${Math.floor(s/3600)}h ago` : `${Math.floor(s/3600)} ชั่วโมงที่แล้ว`;
  return en ? `${Math.floor(s/86400)}d ago` : `${Math.floor(s/86400)} วันที่แล้ว`;
}
function showToast(msg, kind = '') {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast show' + (kind ? ' toast-' + kind : '');
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ===== FEATURE #12: i18n =====
const I18N = {
  th: { lang_name: 'ไทย', full_name: 'ชื่อ-นามสกุล', department: 'แผนก / ตำแหน่ง', company: 'บริษัท', plate: 'ทะเบียนรถ', result: 'ผลการตรวจแอลกอฮอล์', no_alcohol: 'ไม่พบแอลกอฮอล์', has_alcohol: 'ตรวจพบแอลกอฮอล์', value_mg: 'ค่าที่วัดได้ (mg%)', take_photo: 'แตะเพื่อถ่ายรูป', submit: 'ส่งข้อมูล', record: 'บันทึกผลตรวจแอลกอฮอล์', fill_in: 'กรุณากรอกข้อมูลให้ครบถ้วนตามจริง', employee_id: 'รหัสพนักงาน', quick_lookup: 'ค้นหารวดเร็ว', quick_hint: 'เคยลงทะเบียน → ระบบเติมข้อมูลให้อัตโนมัติ', search: 'ค้นหา', photo_label: 'ภาพถ่ายเครื่องตรวจ', camera_only: 'ใช้กล้องเท่านั้น', sig_label: 'ลายเซ็นพนักงาน (ยืนยันผลตรวจ)', sig_hint: 'ใช้นิ้วเซ็นบนกล่อง', clear: 'ล้าง', company_placeholder: 'พิมพ์ชื่อบริษัท...', company_new: 'ไม่พบ — พิมพ์เพื่อเพิ่มใหม่', offline: '⚡ ออฟไลน์ — บันทึกในเครื่อง', online_pre: '✓ ออนไลน์ · sync ', online_suf: ' รายการ', invalid_title: 'ไม่สามารถเข้าใช้งานได้', invalid_msg: 'ไม่พบรหัสสถานที่ (location) ใน URL กรุณาสแกน QR Code ของจุดตรวจอีกครั้ง', back_home: 'กลับหน้าหลัก', qr_locked: '🔒 ระบุจาก QR', device_prefix: 'เครื่อง:', select_dept: '-- เลือก --', tp_pass: 'ผ่านเกณฑ์', tp_caution: 'ห้ามขับยานพาหนะ — แจ้งหัวหน้างาน', tp_nodrive: 'ห้ามขับ ห้ามเข้างาน — แจ้งทันที', tp_illegal: 'เกินกฎหมาย — รายงานทันที', tp_level: 'ระดับ:', stamp_at: 'บันทึกพร้อมตำแหน่ง', shift_at: 'กะ', pdpa: 'นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)', emp_not_found: 'ไม่พบรหัสพนักงาน', emp_loaded: 'โหลดข้อมูลแล้ว', company_use: 'ใช้', company_new_badge: 'ใหม่', retest_title: 'ตรวจซ้ำ (Re-test)', retest_for: 'ของ', retest_first: '· ครั้งแรกค่า', retest_time: 'เวลา', rt_notfound_title: 'ไม่พบข้อมูลการตรวจ', rt_notfound_msg: 'กรุณาสแกน QR Code ใหม่อีกครั้ง', rt_failed: 'ผลตรวจไม่ผ่าน', rt_must_pre: 'ต้องตรวจซ้ำหลังจากรอครบ ', rt_must_suf: ' นาที', rt_name: 'ชื่อ', rt_dept: 'แผนก', rt_location: 'สถานที่', rt_first: 'ผลครั้งแรก', rt_level: 'ระดับ', rt_time: 'เวลาตรวจ', rt_banner: 'ห้ามออกจากบริเวณตรวจ — รอจนนับเวลาครบก่อนตรวจซ้ำ หากตรวจซ้ำยังไม่ผ่านจะถูกบันทึกและแจ้งหัวหน้างาน', rt_waiting: 'เวลาที่ต้องรอ', rt_wait_sub: 'กรุณารอจนนับถอยหลังครบ', rt_ready: 'พร้อมตรวจซ้ำแล้ว!', rt_ready_pre: 'ครบ ', rt_ready_suf: ' นาทีแล้ว กดปุ่มด้านล่างเพื่อทำการตรวจซ้ำ', rt_btn: 'ตรวจซ้ำเลย',
    help_btn: 'วิธีกรอกฟอร์ม', help_title: 'ขั้นตอนการกรอกฟอร์ม', help_close: 'ปิด',
    help_s1: 'กรอกรหัสพนักงาน (ถ้ามี) แล้วกด "ค้นหา" — ระบบจะเติมชื่อ แผนก และบริษัทให้อัตโนมัติ',
    help_s2: 'กรอกชื่อ-นามสกุล ★ เลือกแผนก/ตำแหน่ง ★ และกรอกชื่อบริษัท ★ (ฟิลด์ที่มีเครื่องหมาย * จำเป็นต้องกรอก)',
    help_s3: 'เลือกผลการตรวจ — กด "0%" ถ้าไม่พบแอลกอฮอล์ หรือกด ">0%" แล้วกรอกค่าที่วัดได้ (mg%)',
    help_s4: 'ถ่ายรูปหน้าจอเครื่องตรวจให้เห็นตัวเลขชัดเจน (กล้องเปิดอัตโนมัติเมื่อแตะช่องรูป)',
    help_s5: 'กดปุ่ม "ส่งข้อมูล" แล้วรอจนระบบยืนยัน ห้ามปิดหน้าขณะกำลังส่งข้อมูล' },
  en: { lang_name: 'English', full_name: 'Full Name', department: 'Department / Position', company: 'Company', plate: 'License Plate', result: 'Alcohol Test Result', no_alcohol: 'No alcohol detected', has_alcohol: 'Alcohol detected', value_mg: 'Reading (mg%)', take_photo: 'Tap to take photo', submit: 'Submit', record: 'Record Alcohol Test', fill_in: 'Please fill in all required fields accurately', employee_id: 'Employee ID', quick_lookup: 'Quick Lookup', quick_hint: 'Registered before → auto-fill your details', search: 'Search', photo_label: 'Breathalyser Photo', camera_only: 'Camera only', sig_label: 'Employee Signature (Confirm result)', sig_hint: 'Sign with your finger', clear: 'Clear', company_placeholder: 'Type company name...', company_new: 'Not found — type to add new', offline: '⚡ Offline — saved locally', online_pre: '✓ Online · synced ', online_suf: ' records', invalid_title: 'Cannot Access', invalid_msg: 'Location code not found in URL. Please scan the checkpoint QR Code again.', back_home: 'Back to Home', qr_locked: '🔒 QR Verified', device_prefix: 'Device:', select_dept: '-- Select --', tp_pass: 'Pass', tp_caution: 'No driving — notify supervisor', tp_nodrive: 'No drive, no work — report immediately', tp_illegal: 'Exceeds legal limit — report immediately', tp_level: 'Level:', stamp_at: 'Saved at', shift_at: 'Shift', pdpa: 'Personal Data Protection Policy (PDPA)', emp_not_found: 'Employee ID not found:', emp_loaded: 'Details loaded', company_use: 'Use', company_new_badge: 'New', retest_title: 'Re-test', retest_for: 'for', retest_first: '· first reading', retest_time: 'at', rt_notfound_title: 'Test record not found', rt_notfound_msg: 'Please scan the QR Code again', rt_failed: 'Test Failed', rt_must_pre: 'Must re-test after ', rt_must_suf: ' minutes', rt_name: 'Name', rt_dept: 'Department', rt_location: 'Location', rt_first: 'First reading', rt_level: 'Level', rt_time: 'Test time', rt_banner: 'Do not leave the test area — wait for the countdown before re-testing. If the re-test also fails, it will be recorded and your supervisor will be notified.', rt_waiting: 'WAITING TIME', rt_wait_sub: 'Please wait until the countdown ends', rt_ready: 'Ready to re-test!', rt_ready_pre: '', rt_ready_suf: ' minutes have passed. Press the button below to re-test.', rt_btn: 'Re-test now',
    help_btn: 'How to fill the form', help_title: 'Step-by-step guide', help_close: 'Close',
    help_s1: 'Enter your Employee ID (if registered) and tap Search — your name, department and company will be auto-filled',
    help_s2: 'Fill in your full name ★, select your department ★, and enter your company ★ (fields marked * are required)',
    help_s3: 'Choose your test result — tap "0%" if no alcohol was detected, or tap ">0%" and enter the mg% reading',
    help_s4: 'Take a clear photo of the breathalyser screen showing the number (camera opens automatically)',
    help_s5: 'Tap "Submit" and wait for confirmation — do not close the screen while submitting' },
  my: { lang_name: 'မြန်မာ', full_name: 'အမည်အပြည့်အစုံ', department: 'ဌာန / ရာထူး', company: 'ကုမ္ပဏီ', plate: 'ကားနံပါတ်', result: 'အရက်စစ်ဆေးမှုရလဒ်', no_alcohol: 'အရက်မတွေ့ပါ', has_alcohol: 'အရက်တွေ့ရှိ', value_mg: 'အတိုင်းအတာ (mg%)', take_photo: 'ဓာတ်ပုံရိုက်ရန်နှိပ်ပါ', submit: 'တင်ပြရန်', record: 'အရက်စစ်ဆေးမှုမှတ်တမ်း', fill_in: 'အချက်အလက်အားလုံးမှန်ကန်စွာဖြည့်ပါ', employee_id: 'ဝန်ထမ်းအိုင်ဒီ', quick_lookup: 'အမြန်ရှာဖွေ', quick_hint: 'မှတ်ပုံတင်ပြီးသူ → အချက်အလက်အလိုအလျောက်ဖြည့်မည်', search: 'ရှာဖွေ', photo_label: 'စက်ဓာတ်ပုံ', camera_only: 'ကင်မရာသာသုံးပါ', sig_label: 'ဝန်ထမ်းလက်မှတ် (ရလဒ်အတည်ပြု)', sig_hint: 'လက်ချောင်းဖြင့်လက်မှတ်ထိုးပါ', clear: 'ရှင်းပါ', company_placeholder: 'ကုမ္ပဏီအမည်ရိုက်ထည့်ပါ...', company_new: 'မတွေ့ပါ — အသစ်ထည့်ရန်ရိုက်ပါ', offline: '⚡ အင်တာနက်မရှိ — ကိရိယာတွင်သိမ်း', online_pre: '✓ အင်တာနက်ရှိ · ', online_suf: ' ခုပြောင်းပြီး', invalid_title: 'ဝင်ရောက်၍မရပါ', invalid_msg: 'URL တွင် တည်နေရာကုဒ် မတွေ့ပါ။ စစ်ဆေးမှုနေရာ QR Code ကို ထပ်မံစကင်ဖတ်ပါ။', back_home: 'ပင်မစာမျက်နှာသို့ပြန်', qr_locked: '🔒 QR မှတ်ဆိုင်', device_prefix: 'ကိရိယာ:', select_dept: '-- ရွေးချယ်ပါ --', tp_pass: 'ပြေလည်သည်', tp_caution: 'မောင်းခွင့်မရှိ — အကြီးအကဲကိုအသိပေးပါ', tp_nodrive: 'မောင်းခွင့်မရှိ၊ အလုပ်မဝင်ရ — ချက်ချင်းသတင်းပို့ပါ', tp_illegal: 'ဥပဒေကိုကျော်လွန်သည် — ချက်ချင်းသတင်းပို့ပါ', tp_level: 'အဆင့်:', stamp_at: 'တည်နေရာနှင့်သိမ်းဆည်း', shift_at: 'အလုပ်ဆိုင်း', pdpa: 'ကိုယ်ရေးကိုယ်တာဒေတာကာကွယ်ရေးမူဝါဒ (PDPA)', emp_not_found: 'ဝန်ထမ်းအိုင်ဒီမတွေ့ပါ', emp_loaded: 'အချက်အလက်ထည့်သွင်းပြီး', company_use: 'သုံးပါ', company_new_badge: 'အသစ်', retest_title: 'ထပ်မံစစ်ဆေး (Re-test)', retest_for: 'အတွက်', retest_first: '· ပထမတိုင်းတာချက်', retest_time: 'အချိန်', rt_notfound_title: 'စစ်ဆေးမှုမှတ်တမ်းမတွေ့ပါ', rt_notfound_msg: 'QR Code ကို ထပ်မံစကင်ဖတ်ပါ', rt_failed: 'စစ်ဆေးမှု မအောင်မြင်ပါ', rt_must_pre: 'ပြန်လည်စစ်ဆေးရန် စောင့်ဆိုင်းချိန် ', rt_must_suf: ' မိနစ်', rt_name: 'အမည်', rt_dept: 'ဌာန', rt_location: 'တည်နေရာ', rt_first: 'ပထမအကြိမ်ရလဒ်', rt_level: 'အဆင့်', rt_time: 'စစ်ဆေးချိန်', rt_banner: 'စစ်ဆေးရာနေရာမှ မထွက်ပါနှင့် — ပြန်စစ်မီ ရေတွက်ချိန်ပြည့်အောင်စောင့်ပါ။ ပြန်စစ်၍ မအောင်လျှင် မှတ်တမ်းတင်ပြီး အကြီးအကဲကို အသိပေးပါမည်။', rt_waiting: 'စောင့်ဆိုင်းချိန်', rt_wait_sub: 'ရေတွက်ချိန်ပြည့်အောင် စောင့်ပါ', rt_ready: 'ပြန်စစ်ရန် အသင့်ဖြစ်ပါပြီ!', rt_ready_pre: '', rt_ready_suf: ' မိနစ်ပြည့်ပါပြီ။ ပြန်စစ်ရန် အောက်ခလုတ်ကိုနှိပ်ပါ။', rt_btn: 'ယခုပြန်စစ်ပါ',
    help_btn: 'ဖောင်ဖြည့်နည်း', help_title: 'အဆင့်ဆင့်လမ်းညွှန်', help_close: 'ပိတ်ပါ',
    help_s1: 'ဝန်ထမ်းအိုင်ဒီ ထည့်ပြီး "ရှာဖွေ" နှိပ်ပါ — အမည်၊ ဌာနနှင့် ကုမ္ပဏီ အလိုအလျောက်ဖြည့်မည်',
    help_s2: 'အမည်အပြည့် ★ ဌာန ★ နှင့် ကုမ္ပဏီ ★ ဖြည့်ပါ (* ပါသောကွက်များ မဖြစ်မနေ ဖြည့်ရပါမည်)',
    help_s3: 'စစ်ဆေးမှုရလဒ် ရွေးပါ — "0%" မတွေ့ပါက နှိပ်ပါ၊ ">0%" တွေ့ပါက နှိပ်ပြီး mg% တန်ဖိုး ဖြည့်ပါ',
    help_s4: 'စစ်ဆေးစက်မျက်နှာပြင်ကို ဂဏန်းထင်ရှားအောင် ဓာတ်ပုံ ရိုက်ပါ (ကင်မရာ အလိုအလျောက်ဖွင့်မည်)',
    help_s5: '"တင်ပြရန်" နှိပ်ပြီး အတည်ပြုချက် ရောက်သည်အထိ စောင့်ပါ — တင်ပြနေစဉ် မပိတ်ပါနှင့်' },
  km: { lang_name: 'ខ្មែរ', full_name: 'ឈ្មោះពេញ', department: 'ផ្នែក / តួនាទី', company: 'ក្រុមហ៊ុន', plate: 'លេខស្លាករថយន្ត', result: 'លទ្ធផលតេស្តគ្រឿងស្រវឹង', no_alcohol: 'មិនមានគ្រឿងស្រវឹង', has_alcohol: 'រកឃើញគ្រឿងស្រវឹង', value_mg: 'តម្លៃវាស់ (mg%)', take_photo: 'ចុចដើម្បីថតរូប', submit: 'ដាក់ស្នើ', record: 'កត់ត្រាការតេស្តគ្រឿងស្រវឹង', fill_in: 'សូមបំពេញព័ត៌មានទាំងអស់ឱ្យបានត្រឹមត្រូវ', employee_id: 'លេខបុគ្គលិក', quick_lookup: 'ស្វែងរករហ័ស', quick_hint: 'បានចុះឈ្មោះរួច → បំពេញព័ត៌មានដោយស្វ័យប្រវត្តិ', search: 'ស្វែងរក', photo_label: 'រូបភាពឧបករណ៍', camera_only: 'ប្រើកាមេរ៉ាតែប៉ុណ្ណោះ', sig_label: 'ហត្ថលេខាបុគ្គលិក (បញ្ជាក់លទ្ធផល)', sig_hint: 'ចុះហត្ថលេខាដោយម្រាមដៃ', clear: 'លុប', company_placeholder: 'វាយបញ្ចូលឈ្មោះក្រុមហ៊ុន...', company_new: 'រកមិនឃើញ — វាយដើម្បីបន្ថែមថ្មី', offline: '⚡ គ្មានអ៊ីនធឺណិត — រក្សាទុកក្នុងឧបករណ៍', online_pre: '✓ អ៊ីនធឺណិតភ្ជាប់ · ', online_suf: ' ការចុះឈ្មោះ', invalid_title: 'មិនអាចចូលប្រើបាន', invalid_msg: 'រកមិនឃើញលេខកូដទីតាំងក្នុង URL ។ សូមស្កេន QR Code នៃចំណុចត្រួតពិនិត្យម្តងទៀត។', back_home: 'ត្រឡប់ទៅទំព័រដើម', qr_locked: '🔒 QR បានផ្ទៀងផ្ទាត់', device_prefix: 'ឧបករណ៍:', select_dept: '-- ជ្រើសរើស --', tp_pass: 'ជាប់', tp_caution: 'ហាមបើកបរ — ជូនដំណឹងអ្នកគ្រប់គ្រង', tp_nodrive: 'ហាមបើកបរ ហាមចូលធ្វើការ — រាយការណ៍ភ្លាម', tp_illegal: 'លើសដែនកំណត់ច្បាប់ — រាយការណ៍ភ្លាម', tp_level: 'កម្រិត:', stamp_at: 'រក្សាទុកនៅទីតាំង', shift_at: 'វេន', pdpa: 'គោលនយោបាយការពារទិន្នន័យផ្ទាល់ខ្លួន (PDPA)', emp_not_found: 'រកមិនឃើញលេខបុគ្គលិក', emp_loaded: 'ព័ត៌មានបានបញ្ចូល', company_use: 'ប្រើ', company_new_badge: 'ថ្មី', retest_title: 'ការតេស្តម្តងទៀត (Re-test)', retest_for: 'សម្រាប់', retest_first: '· ការវាស់ស្ទង់ដំបូង', retest_time: 'នៅ', rt_notfound_title: 'រកមិនឃើញកំណត់ត្រាតេស្ត', rt_notfound_msg: 'សូមស្កេន QR Code ម្តងទៀត', rt_failed: 'តេស្តមិនជាប់', rt_must_pre: 'ត្រូវតេស្តឡើងវិញបន្ទាប់ពីរង់ចាំ ', rt_must_suf: ' នាទី', rt_name: 'ឈ្មោះ', rt_dept: 'ផ្នែក', rt_location: 'ទីតាំង', rt_first: 'លទ្ធផលលើកដំបូង', rt_level: 'កម្រិត', rt_time: 'ពេលវេលាតេស្ត', rt_banner: 'កុំចាកចេញពីតំបន់តេស្ត — រង់ចាំរហូតដល់ការរាប់ថយចប់មុនពេលតេស្តឡើងវិញ។ បើតេស្តឡើងវិញនៅតែមិនជាប់ នឹងត្រូវកត់ត្រា និងជូនដំណឹងអ្នកគ្រប់គ្រង។', rt_waiting: 'ពេលវេលារង់ចាំ', rt_wait_sub: 'សូមរង់ចាំរហូតដល់ការរាប់ថយចប់', rt_ready: 'ត្រៀមតេស្តឡើងវិញ!', rt_ready_pre: '', rt_ready_suf: ' នាទីបានកន្លងផុត។ ចុចប៊ូតុងខាងក្រោមដើម្បីតេស្តឡើងវិញ។', rt_btn: 'តេស្តឡើងវិញឥឡូវ',
    help_btn: 'របៀបបំពេញបែបបទ', help_title: 'ការណែនាំជាជំហានៗ', help_close: 'បិទ',
    help_s1: 'បញ្ចូលលេខបុគ្គលិក (បើមាន) ហើយចុចស្វែងរក — ឈ្មោះ ផ្នែក និងក្រុមហ៊ុននឹងបំពេញដោយស្វ័យប្រវត្តិ',
    help_s2: 'បំពេញឈ្មោះពេញ ★ ជ្រើសផ្នែក ★ និងក្រុមហ៊ុន ★ (ប្រអប់ * ត្រូវតែបំពេញ)',
    help_s3: 'ជ្រើសរើសលទ្ធផល — ចុច "0%" បើគ្មានគ្រឿងស្រវឹង ឬ ">0%" ហើយបញ្ចូលតម្លៃ mg%',
    help_s4: 'ថតរូបអេក្រង់ឧបករណ៍ ឱ្យឃើញតម្លៃច្បាស់ (កាមេរ៉ាបើកដោយស្វ័យប្រវត្តិ)',
    help_s5: 'ចុច "ដាក់ស្នើ" ហើយរង់ចាំការបញ្ជាក់ — កុំបិទអេក្រង់ពេលកំពុងដាក់ស្នើ' }
};
function t(key, lang) { return (I18N[lang || localStorage.getItem('lang') || 'th'] || I18N.th)[key] || I18N.th[key] || key; }

// ===== Admin Supabase client (routes through Cloudflare Worker with service_role) =====
let _sbAdmin = null;
function _getAdminClient() {
  if (_sbAdmin) return _sbAdmin;
  _sbAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      fetch: (url, opts = {}) => {
        const path  = String(url).replace(SUPABASE_URL, '');
        const token = sessionStorage.getItem('admin_token') || '';
        const hdrs  = new Headers(opts.headers || {});
        hdrs.delete('apikey');
        hdrs.delete('Authorization');
        hdrs.set('X-Admin-Token', token);
        return fetch('/api/admin' + path, { ...opts, headers: hdrs });
      }
    },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return _sbAdmin;
}
// Returns admin client when logged in, anon client otherwise.
// Redirects to login if the stored JWT has expired.
function _dbClient() {
  if (sessionStorage.getItem('admin_token')) {
    if (!isAdminAuthed()) {
      setAdminAuth(false);
      location.href = 'admin-login.html';
      return _sb; // anon fallback; navigation request is in-flight
    }
    return _getAdminClient();
  }
  return _sb;
}

// ===== Auth =====
// Password is verified server-side in the Cloudflare Worker (env.ADMIN_PASSWORD secret)
const ADMIN_PASSWORD = ''; // kept for reference only — not used in login flow

// Session idle timeout — 2 hours of inactivity logs out admin
(function() {
  const IDLE_MS = 2 * 60 * 60 * 1000;
  let _idleTimer;
  function _resetIdle() {
    clearTimeout(_idleTimer);
    if (isAdminAuthed()) {
      _idleTimer = setTimeout(() => {
        setAdminAuth(false);
        location.href = 'admin-login.html';
      }, IDLE_MS);
    }
  }
  ['click','keydown','touchstart','scroll'].forEach(ev => document.addEventListener(ev, _resetIdle, { passive: true }));
  _resetIdle();
})();
// UI-gating only — actual auth is enforced server-side in the Cloudflare Worker
function isAdminAuthed() {
  const token = sessionStorage.getItem('admin_token');
  if (token) {
    try {
      const p = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      // exp is Unix seconds (standard JWT)
      if (p.exp && p.exp > Math.floor(Date.now() / 1000)) return true;
    } catch {}
    return false;
  }
  return sessionStorage.getItem('admin_auth') === '1'; // legacy flag (no token path)
}
function setAdminAuth(v, userId) {
  if (!v) {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    sessionStorage.setItem('admin_auth', '0');
  } else if (typeof v === 'string') {
    // v is a signed JWT from Worker
    sessionStorage.setItem('admin_token', v);
    try {
      const p = JSON.parse(atob(v.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      if (p.uid) sessionStorage.setItem('admin_user', p.uid);
    } catch {}
    sessionStorage.setItem('admin_auth', '1');
  } else {
    // legacy boolean (local dev / fallback)
    sessionStorage.setItem('admin_auth', '1');
    if (userId) sessionStorage.setItem('admin_user', userId);
  }
}
function currentUser() {
  const id = sessionStorage.getItem('admin_user');
  if (!id) return null;
  const fromDB = DB.users().find(u => u.id === id);
  if (fromDB) return fromDB;
  // Fallback: read role/sites directly from JWT when DB hasn't loaded
  const token = sessionStorage.getItem('admin_token');
  if (token) {
    try {
      const p = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      if (p.uid === id && p.role) return { id: p.uid, role: p.role, name: '', sites: p.sites || 'all' };
    } catch {}
  }
  return null;
}
function hasRole(...roles) {
  const u = currentUser();
  return u && roles.includes(u.role);
}
function canEditTest() { return hasRole('super', 'manager'); }
function canViewSite(code) {
  const u = currentUser();
  if (!u) return false;
  if (u.sites === 'all') return true;
  return Array.isArray(u.sites) && u.sites.includes(code);
}

// ===== Topbar =====
function renderTopbar(active) {
  const u = currentUser();
  const role = u ? ROLE_LABELS[u.role] : null;
  const lang = localStorage.getItem('lang') || 'th';
  const isEN = lang === 'en';
  const links = [
    { href: 'admin-dashboard.html', label: isEN ? 'Dashboard'    : 'แดชบอร์ด',   key: 'dashboard' },
    { href: 'admin-alerts.html',    label: isEN ? 'Alerts'       : 'แจ้งเตือน',  key: 'alerts',    roles: ['super','manager','viewer','auditor'] },
    { href: 'admin-reports.html',   label: isEN ? 'Reports'      : 'รายงาน',     key: 'reports' },
    { href: 'admin-tests.html',     label: isEN ? 'Test Results' : 'ผลตรวจ',     key: 'tests' },
    { href: 'admin-persons.html',   label: isEN ? 'Employees'    : 'พนักงาน',    key: 'persons' },
    { href: 'admin-locations.html', label: isEN ? 'QR / Locations' : 'QR/สถานที่', key: 'locations' },
    { href: 'admin-companies.html', label: isEN ? 'Companies'    : 'บริษัท',     key: 'companies' },
    { href: 'admin-devices.html',   label: isEN ? 'Devices'      : 'เครื่องตรวจ', key: 'devices' },
    { href: 'admin-settings.html',  label: isEN ? 'Settings'     : 'ตั้งค่า',    key: 'settings',  roles: ['super'] },
    { href: 'admin-audit.html',     label: 'Audit Log',                            key: 'audit',     roles: ['super','auditor'] },
    { href: 'guide.html',           label: isEN ? 'Guide'        : 'คู่มือ',      key: 'guide' }
  ];
  const visible = links.filter(l => !l.roles || (u && l.roles.includes(u.role)));
  // Pending alerts count
  const pending = DB.tests().filter(x => !x.is_zero && x.action_taken === 'pending').length;
  const nextLang = isEN ? 'th' : 'en';
  return `
    <div class="topbar">
      <a href="admin-dashboard.html" class="brand">
        <div class="logo">A</div>
        <div>
          <div style="font-size:15px">${isEN ? 'Alcohol Test System' : 'ระบบตรวจแอลกอฮอล์'}</div>
          <div class="tiny muted" style="font-weight:500">Admin Panel</div>
        </div>
      </a>
      <div class="nav">
        ${visible.map(l => `<a href="${l.href}" class="${active === l.key ? 'active' : ''}">${l.label}${l.key === 'alerts' && pending ? ` <span class="pill-dot">${pending}</span>` : ''}</a>`).join('')}
      </div>
      <div class="row gap-sm">
        <div class="user-pill" title="${role?.desc || ''}">
          <div class="avatar-sm">${(u?.name||'?').charAt(0)}</div>
          <div style="display:flex; flex-direction:column; line-height:1.15">
            <span style="font-size:13px; font-weight:600">${u?.name || ''}</span>
            <span class="tiny" style="color:var(--text-muted)">${role?.label || ''}</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="localStorage.setItem('lang','${nextLang}');location.reload()" style="font-family:var(--font-mono);font-size:12px;letter-spacing:.04em;min-width:52px">${isEN ? 'TH | <b>EN</b>' : '<b>TH</b> | EN'}</button>
        <a href="index.html" class="btn btn-ghost btn-sm">${isEN ? 'Home' : 'หน้าหลัก'}</a>
        <button class="btn btn-sm" onclick="setAdminAuth(false); location.href='admin-login.html'">${isEN ? 'Logout' : 'ออก'}</button>
      </div>
    </div>
  `;
}
function requireAdmin() {
  if (!isAdminAuthed()) { location.href = 'admin-login.html'; return false; }
  // Legacy session (admin_auth=1 but no JWT token) — anon client can't load admin data after tighten_rls
  if (!sessionStorage.getItem('admin_token')) { setAdminAuth(false); location.href = 'admin-login.html'; return false; }
  return true;
}

// ===== Threshold badge =====
function thresholdBadge(t) {
  const en = _uiLang() === 'en';
  if (t.is_zero) return `<span class="lvl lvl-pass"><span class="lvl-dot"></span>${en ? 'Pass · 0%' : 'ผ่าน · 0%'}</span>`;
  const lvl = getThresholdLevel(t.alcohol_value, t.department);
  const cls = 'lvl-' + (lvl.color === 'danger-strong' ? 'illegal' : lvl.color);
  const labelEN = { pass: 'Pass', caution: 'Caution', 'no-drive': 'No Drive', illegal: 'Illegal' };
  const label = en ? (labelEN[lvl.level] || lvl.label) : lvl.label;
  return `<span class="lvl ${cls}"><span class="lvl-dot"></span>${label} · ${t.alcohol_value} mg%</span>`;
}

// ===== Confirm modal helper =====
function confirmDialog(title, msg) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop show';
    wrap.innerHTML = `
      <div class="modal" style="max-width:420px">
        <div class="modal-header"><h2>${title}</h2></div>
        <div class="modal-body">${msg}</div>
        <div class="modal-footer">
          <button class="btn" data-no>ยกเลิก</button>
          <button class="btn btn-danger" data-yes>ยืนยัน</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-no]').onclick = () => { wrap.remove(); resolve(false); };
    wrap.querySelector('[data-yes]').onclick = () => { wrap.remove(); resolve(true); };
  });
}

// ===== Supabase Integration =====

function _genUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function _isUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ''));
}

DB._initialized = false;

DB.init = async function() {
  if (DB._initialized) return;
  if (typeof _sb === 'undefined') { DB._initialized = true; return; }
  try {
    const [
      { data: locs },  { data: comps },   { data: tests },
      { data: devs },  { data: users },   { data: persons },
      { data: channels }, { data: audit }, { data: watchl },
      { data: sett }
    ] = await Promise.all([
      _dbClient().from('locations').select('*').order('code'),
      _dbClient().from('companies').select('*').order('name'),
      _dbClient().from('tests').select('*').order('created_at', { ascending: false }),
      _dbClient().from('devices').select('*'),
      _dbClient().from('admin_users').select('*'),
      _dbClient().from('persons').select('*'),
      _dbClient().from('alert_channels').select('*'),
      _dbClient().from('audit_log').select('*').order('created_at', { ascending: false }).limit(500),
      _dbClient().from('watchlist').select('*'),
      _dbClient().from('settings').select('*').single()
    ]);
    const serverTests = (tests || []).map(t => ({
      ...t,
      level: t.level || getThresholdLevel(t.alcohol_value, t.department).level,
      shift_id: t.shift_id || getShiftFromDate(t.created_at).id,
      action_taken: t.action_taken || null
    }));
    // Preserve locally-added tests the server didn't return (anon can't SELECT
    // tests after tighten_rls — keeps just-submitted records for the retest flow)
    const serverIds = new Set(serverTests.map(t => t.id));
    const localExtra = (loadDB().tests || []).filter(t => !serverIds.has(t.id));
    const db = {
      locations: (locs || []).map(l => ({ ...l, lat: l.lat ?? null, lng: l.lng ?? null })),
      companies: (comps || []).map(c => ({ id: c.id, name: c.name })),
      tests: [...localExtra, ...serverTests],
      devices: (devs || []).map(d => ({ ...d, asset_no: d.asset_no || '', status: getDeviceStatus(d.next_calibration) })),
      users: (users || []).map(u => ({
        id: u.id, username: u.username, name: u.name,
        email: u.email, role: u.role, sites: u.sites
      })),
      persons: persons || [],
      channels: channels || [],
      audit: (audit || []).map(a => ({
        id: a.id, actor_id: a.actor_id || '', actor_name: a.actor_name,
        action: a.action, target: a.target || '', detail: a.detail || '',
        created_at: a.created_at
      })),
      watchlist: watchl || [],
      settings: sett ? {
        retest_minutes: sett.retest_minutes,
        watchlist_threshold: sett.watchlist_threshold,
        watchlist_window_days: sett.watchlist_window_days,
        language: sett.language,
        thresholds: THRESHOLDS,
        shifts_enabled: sett.shifts_enabled !== false,
        location_enforcement_enabled: sett.location_enforcement_enabled === true
      } : { retest_minutes: 5, watchlist_threshold: 2, watchlist_window_days: 30, language: 'th', thresholds: THRESHOLDS, shifts_enabled: true, location_enforcement_enabled: false }
    };
    saveDB(db);
  } catch (err) {
    console.warn('[DB.init] Supabase unavailable, using localStorage:', err.message);
  }
  DB._initialized = true;
};

// Replace addTest to use UUID ids and fire-and-forget to Supabase
const _rawAddTest = DB.addTest.bind(DB);
DB.addTest = function(t) {
  const enriched = _rawAddTest({ ...t, id: _genUUID() });
  enriched._sync = Promise.resolve();
  if (typeof _sb !== 'undefined') {
    enriched._sync = _dbClient().from('tests').insert({
      id: enriched.id,
      employee_id: enriched.employee_id || '',
      full_name: enriched.full_name,
      department: enriched.department,
      plate_number: enriched.plate_number || '',
      company: enriched.company,
      alcohol_value: enriched.alcohol_value,
      is_zero: enriched.is_zero,
      level: enriched.level,
      location_code: enriched.location_code,
      location_name: enriched.location_name,
      photo_url: enriched.photo_url || '',
      shift_id: enriched.shift_id,
      device_serial: enriched.device_serial || '',
      retest_of: enriched.retest_of || null,
      retest_status: enriched.retest_status || null,
      action_taken: enriched.action_taken || null,
      action_note: enriched.action_note || '',
      created_at: enriched.created_at
    }).then(({ error }) => { if (error) console.warn('[DB.addTest]', error.message); });
  }
  return enriched;
};

const _rawDeleteTest = DB.deleteTest.bind(DB);
DB.deleteTest = function(id, actor) {
  _rawDeleteTest(id, actor);
  if (typeof _sb !== 'undefined' && _isUUID(id)) {
    _dbClient().from('tests').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('[DB.deleteTest]', error.message); });
  }
};

const _rawUpdateTest = DB.updateTest.bind(DB);
DB.updateTest = function(id, patch, actor) {
  _rawUpdateTest(id, patch, actor);
  if (typeof _sb !== 'undefined' && _isUUID(id)) {
    const cols = ['alcohol_value','is_zero','level','retest_status','action_taken','action_note','action_by','operator_id'];
    const row = {};
    cols.forEach(k => { if (patch[k] !== undefined) row[k] = patch[k]; });
    if (Object.keys(row).length) {
      _dbClient().from('tests').update(row).eq('id', id)
        .then(({ error }) => { if (error) console.warn('[DB.updateTest]', error.message); });
    }
    if (actor) {
      _dbClient().from('audit_log').insert({
        id: _genUUID(), actor_id: _isUUID(actor.id) ? actor.id : null,
        actor_name: actor.name || 'Admin', action: 'update_test',
        target: id, detail: `แก้ไข: ${Object.keys(patch).join(', ')}`
      }).then(({ error }) => { if (error) console.warn('[audit updateTest]', error.message); });
    }
  }
};

DB.upsertLocation = function(loc) {
  const db = loadDB();
  const i = db.locations.findIndex(l => l.code === loc.code);
  if (i >= 0) db.locations[i] = loc; else db.locations.push(loc);
  saveDB(db);
  if (typeof _sb !== 'undefined') {
    const row = {
      code: loc.code, name: loc.name,
      address: loc.address || '', contact: loc.contact || '', phone: loc.phone || '',
      lat: loc.lat != null ? parseFloat(loc.lat) : null,
      lng: loc.lng != null ? parseFloat(loc.lng) : null
    };
    return _dbClient().from('locations').upsert(row, { onConflict: 'code' })
      .then(({ error }) => { if (error) { console.warn('[DB.upsertLocation]', error.message); throw new Error(error.message); } });
  }
  return Promise.resolve();
};

DB.deleteLocation = function(code) {
  const db = loadDB();
  db.locations = db.locations.filter(l => l.code !== code);
  saveDB(db);
  if (typeof _sb !== 'undefined') {
    _dbClient().from('locations').delete().eq('code', code)
      .then(({ error }) => { if (error) console.warn('[DB.deleteLocation]', error.message); });
  }
};

DB.upsertCompany = function(c) {
  const id = _isUUID(c.id) ? c.id : _genUUID();
  const db = loadDB();
  const i = db.companies.findIndex(x => x.id === c.id);
  if (i >= 0) db.companies[i] = { id, name: c.name };
  else db.companies.push({ id, name: c.name });
  saveDB(db);
  if (typeof _sb !== 'undefined') {
    return _dbClient().from('companies').upsert({ id, name: c.name }, { onConflict: 'id' })
      .then(({ error }) => { if (error) { console.warn('[DB.upsertCompany]', error.message); throw new Error(error.message); } });
  }
  return Promise.resolve();
};

DB.deleteCompany = function(id) {
  const db = loadDB();
  db.companies = db.companies.filter(c => c.id !== id);
  saveDB(db);
  if (typeof _sb !== 'undefined' && _isUUID(id)) {
    _dbClient().from('companies').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('[DB.deleteCompany]', error.message); });
  }
};

DB.upsertDevice = function(d) {
  const id = _isUUID(d.id) ? d.id : _genUUID();
  const db = loadDB();
  const i = db.devices.findIndex(x => x.id === d.id || x.serial === d.serial);
  const row = { id, serial: d.serial, asset_no: d.asset_no || '', model: d.model, location_code: d.location_code, last_calibrated: d.last_calibrated, next_calibration: d.next_calibration, status: getDeviceStatus(d.next_calibration) };
  if (i >= 0) db.devices[i] = row; else db.devices.push(row);
  saveDB(db);
  if (typeof _sb !== 'undefined') {
    const { status, ...sbRow } = row;
    return _dbClient().from('devices').upsert(sbRow, { onConflict: 'id' })
      .then(({ error }) => { if (error) { console.warn('[DB.upsertDevice]', error.message); throw new Error(error.message); } });
  }
  return Promise.resolve();
};

DB.deleteDevice = function(id) {
  const db = loadDB();
  db.devices = db.devices.filter(d => d.id !== id);
  saveDB(db);
  if (typeof _sb !== 'undefined' && _isUUID(id)) {
    _dbClient().from('devices').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('[DB.deleteDevice]', error.message); });
  }
};

DB.upsertUser = function(u) {
  const id = _isUUID(u.id) ? u.id : _genUUID();
  const db = loadDB();
  const i = db.users.findIndex(x => x.id === u.id || x.username === u.username);
  const row = { id, username: u.username, name: u.name, email: u.email || '', role: u.role, sites: u.sites };
  if (i >= 0) db.users[i] = row; else db.users.push(row);
  saveDB(db);
  if (typeof _sb !== 'undefined') {
    _dbClient().from('admin_users').upsert(row, { onConflict: 'id' })
      .then(({ error }) => { if (error) console.warn('[DB.upsertUser]', error.message); });
  }
};

DB.deleteUser = function(id) {
  const db = loadDB();
  db.users = db.users.filter(u => u.id !== id);
  saveDB(db);
  if (typeof _sb !== 'undefined' && _isUUID(id)) {
    _dbClient().from('admin_users').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('[DB.deleteUser]', error.message); });
  }
};

DB.upsertChannel = function(c) {
  const id = _isUUID(c.id) ? c.id : _genUUID();
  const db = loadDB();
  const i = db.channels.findIndex(x => x.id === c.id);
  const row = { id, kind: c.kind, label: c.label, target: c.target, enabled: c.enabled };
  if (i >= 0) db.channels[i] = row; else db.channels.push(row);
  saveDB(db);
  if (typeof _sb !== 'undefined') {
    _dbClient().from('alert_channels').upsert(row, { onConflict: 'id' })
      .then(({ error }) => { if (error) console.warn('[DB.upsertChannel]', error.message); });
  }
};

DB.deleteChannel = function(id) {
  const db = loadDB();
  db.channels = db.channels.filter(c => c.id !== id);
  saveDB(db);
  if (typeof _sb !== 'undefined' && _isUUID(id)) {
    _dbClient().from('alert_channels').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('[DB.deleteChannel]', error.message); });
  }
};

const _rawSetSettings = DB.setSettings.bind(DB);
DB.setSettings = function(s) {
  _rawSetSettings(s);
  if (typeof _sb !== 'undefined') {
    const row = {};
    if (s.retest_minutes !== undefined) row.retest_minutes = s.retest_minutes;
    if (s.watchlist_threshold !== undefined) row.watchlist_threshold = s.watchlist_threshold;
    if (s.watchlist_window_days !== undefined) row.watchlist_window_days = s.watchlist_window_days;
    if (s.language !== undefined) row.language = s.language;
    if (s.shifts_enabled !== undefined) row.shifts_enabled = s.shifts_enabled;
    if (s.location_enforcement_enabled !== undefined) row.location_enforcement_enabled = s.location_enforcement_enabled;
    if (Object.keys(row).length) {
      _dbClient().from('settings').update(row).eq('id', 1)
        .then(({ error }) => { if (error) console.warn('[DB.setSettings]', error.message); });
    }
  }
};

const _rawAddAudit = DB.addAudit.bind(DB);
DB.addAudit = function(entry) {
  _rawAddAudit(entry);
  if (typeof _sb !== 'undefined') {
    _dbClient().from('audit_log').insert({
      id: _genUUID(),
      actor_id: _isUUID(entry.actor_id) ? entry.actor_id : null,
      actor_name: entry.actor_name || 'System',
      action: entry.action, target: entry.target || '', detail: entry.detail || ''
    }).then(({ error }) => { if (error) console.warn('[DB.addAudit]', error.message); });
  }
};

DB.upsertPerson = function(p) {
  const id = _isUUID(p.id) ? p.id : _genUUID();
  const db = loadDB();
  const i = db.persons.findIndex(x => x.id === p.id || x.employee_id === p.employee_id);
  const row = { id, employee_id: p.employee_id, full_name: p.full_name, department: p.department || '', company: p.company || '', plate_number: p.plate_number || '', phone: p.phone || '' };
  if (i >= 0) db.persons[i] = row; else db.persons.push(row);
  saveDB(db);
  if (typeof _sb !== 'undefined') {
    return _dbClient().from('persons').upsert(row, { onConflict: 'employee_id' })
      .then(({ error }) => { if (error) { console.warn('[DB.upsertPerson]', error.message); throw new Error(error.message); } });
  }
  return Promise.resolve();
};

DB.deletePerson = function(id) {
  const db = loadDB();
  db.persons = db.persons.filter(p => p.id !== id);
  saveDB(db);
  if (typeof _sb !== 'undefined' && _isUUID(id)) {
    _dbClient().from('persons').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('[DB.deletePerson]', error.message); });
  }
};

const _rawRemoveFromWatchlist = DB.removeFromWatchlist.bind(DB);
DB.removeFromWatchlist = function(id) {
  _rawRemoveFromWatchlist(id);
  if (typeof _sb !== 'undefined' && _isUUID(id)) {
    _dbClient().from('watchlist').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('[DB.removeFromWatchlist]', error.message); });
  }
};
