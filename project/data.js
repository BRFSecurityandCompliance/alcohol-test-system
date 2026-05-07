// ===== Alcohol Test System — Data Layer =====
const DB_KEY = 'alcohol_test_db_v2';

// ----- Seed: Locations -----
const SEED_LOCATIONS = [
  { code: 'QR001', name: 'ปทุมธานี', address: '123 ถ.รังสิต-ปทุมธานี', contact: 'คุณสมชาย', phone: '02-111-1111' },
  { code: 'QR002', name: 'บางเลน', address: '45 ถ.บางเลน นครปฐม', contact: 'คุณวิภา', phone: '02-222-2222' },
  { code: 'QR003', name: 'นครปฐม', address: '88 ถ.เพชรเกษม', contact: 'คุณอรุณ', phone: '02-333-3333' },
  { code: 'QR004', name: 'สมุทรสาคร', address: '12 ถ.พระราม 2', contact: 'คุณชัย', phone: '02-444-4444' },
  { code: 'QR005', name: 'สมุทรปราการ', address: '99 ถ.บางนา-ตราด', contact: 'คุณนภา', phone: '02-555-5555' },
  { code: 'QR006', name: 'นนทบุรี', address: '7 ถ.รัตนาธิเบศร์', contact: 'คุณอาทิตย์', phone: '02-666-6666' },
  { code: 'QR007', name: 'อยุธยา', address: '34 ถ.โรจนะ', contact: 'คุณพลอย', phone: '035-111-111' },
  { code: 'QR008', name: 'ฉะเชิงเทรา', address: '56 ถ.สุวินทวงศ์', contact: 'คุณธนา', phone: '038-222-222' },
  { code: 'QR009', name: 'ระยอง', address: '21 ถ.สุขุมวิท', contact: 'คุณสุดา', phone: '038-333-333' },
  { code: 'QR010', name: 'ชลบุรี', address: '67 ถ.บางแสน', contact: 'คุณกฤษ', phone: '038-444-444' },
  { code: 'QR011', name: 'ราชบุรี', address: '13 ถ.เพชรเกษม', contact: 'คุณมาลี', phone: '032-555-555' },
  { code: 'QR012', name: 'กาญจนบุรี', address: '78 ถ.แสงชูโต', contact: 'คุณวีระ', phone: '034-666-666' }
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
  { id: 'd1', serial: 'BT-AL7-0001', model: 'AlcoSense AL7000', location_code: 'QR001', last_calibrated: '2026-03-15', next_calibration: '2026-09-15', status: 'active' },
  { id: 'd2', serial: 'BT-AL7-0002', model: 'AlcoSense AL7000', location_code: 'QR002', last_calibrated: '2026-02-20', next_calibration: '2026-08-20', status: 'active' },
  { id: 'd3', serial: 'BT-AL7-0003', model: 'AlcoSense AL7000', location_code: 'QR003', last_calibrated: '2025-11-10', next_calibration: '2026-05-10', status: 'due-soon' },
  { id: 'd4', serial: 'BT-X3-0007',  model: 'Drager X-3',       location_code: 'QR004', last_calibrated: '2026-04-01', next_calibration: '2026-10-01', status: 'active' },
  { id: 'd5', serial: 'BT-X3-0008',  model: 'Drager X-3',       location_code: 'QR005', last_calibrated: '2025-09-15', next_calibration: '2026-03-15', status: 'overdue' },
  { id: 'd6', serial: 'BT-AL7-0009', model: 'AlcoSense AL7000', location_code: 'QR006', last_calibrated: '2026-04-20', next_calibration: '2026-10-20', status: 'active' },
  { id: 'd7', serial: 'BT-AL7-0010', model: 'AlcoSense AL7000', location_code: 'QR007', last_calibrated: '2026-03-30', next_calibration: '2026-09-30', status: 'active' },
  { id: 'd8', serial: 'BT-X3-0011',  model: 'Drager X-3',       location_code: 'QR008', last_calibrated: '2026-01-10', next_calibration: '2026-07-10', status: 'active' }
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
  q.forEach(t => { delete t._queued_at; DB.addTest(t); });
  localStorage.setItem('offline_queue', '[]');
  return q.length;
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
      signature_employee: '',
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
      language: 'th'
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
  tests() { return loadDB().tests; },
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
      db.audit.unshift({ id: 'a' + Date.now(), actor_id: actor?.id || 'u1', actor_name: actor?.name || 'Admin', action: 'update_test', target: id, detail: `แก้ไข: ${Object.keys(patch).join(', ')}`, created_at: new Date().toISOString() });
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
  upsertPerson(p) {
    const db = loadDB();
    const i = p.id ? db.persons.findIndex(x => x.id === p.id) : -1;
    if (i >= 0) db.persons[i] = { ...db.persons[i], ...p };
    else db.persons.push({ ...p, id: 'p' + Date.now() });
    saveDB(db);
  },
  deletePerson(id) { const db = loadDB(); db.persons = db.persons.filter(p => p.id !== id); saveDB(db); },

  // Person history
  testsByPerson(name) { return loadDB().tests.filter(t => t.full_name === name); },
  testsByEmployee(empId) { return loadDB().tests.filter(t => t.employee_id === empId); }
};

// ===== Helpers =====
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'เมื่อสักครู่';
  if (s < 3600) return `${Math.floor(s/60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s/3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(s/86400)} วันที่แล้ว`;
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
  th: { lang_name: 'ไทย', full_name: 'ชื่อ-นามสกุล', department: 'แผนก / ตำแหน่ง', company: 'บริษัท', plate: 'ทะเบียนรถ', result: 'ผลการตรวจแอลกอฮอล์', no_alcohol: 'ไม่พบแอลกอฮอล์', has_alcohol: 'ตรวจพบแอลกอฮอล์', value_mg: 'ค่าที่วัดได้ (mg%)', take_photo: 'แตะเพื่อถ่ายรูป', submit: 'ส่งข้อมูล', record: 'บันทึกผลตรวจแอลกอฮอล์', fill_in: 'กรุณากรอกข้อมูลให้ครบถ้วนตามจริง', employee_id: 'รหัสพนักงาน', quick_lookup: 'ค้นหารวดเร็ว' },
  en: { lang_name: 'English', full_name: 'Full Name', department: 'Department / Position', company: 'Company', plate: 'License Plate', result: 'Alcohol Test Result', no_alcohol: 'No alcohol detected', has_alcohol: 'Alcohol detected', value_mg: 'Reading (mg%)', take_photo: 'Tap to take photo', submit: 'Submit', record: 'Record Alcohol Test', fill_in: 'Please fill in all required fields', employee_id: 'Employee ID', quick_lookup: 'Quick lookup' },
  my: { lang_name: 'မြန်မာ', full_name: 'အမည်အပြည့်အစုံ', department: 'ဌာန / ရာထူး', company: 'ကုမ္ပဏီ', plate: 'ကားနံပါတ်', result: 'အရက်စစ်ဆေးမှုရလဒ်', no_alcohol: 'အရက်မတွေ့ပါ', has_alcohol: 'အရက်တွေ့ရှိ', value_mg: 'အတိုင်းအတာ (mg%)', take_photo: 'ဓာတ်ပုံရိုက်ရန်နှိပ်ပါ', submit: 'တင်ပြရန်', record: 'အရက်စစ်ဆေးမှုမှတ်တမ်း', fill_in: 'အချက်အလက်အားလုံးဖြည့်ပါ', employee_id: 'ဝန်ထမ်းအိုင်ဒီ', quick_lookup: 'အမြန်ရှာဖွေ' },
  km: { lang_name: 'ខ្មែរ', full_name: 'ឈ្មោះពេញ', department: 'ផ្នែក / តួនាទី', company: 'ក្រុមហ៊ុន', plate: 'លេខស្លាករថយន្ត', result: 'លទ្ធផលតេស្តគ្រឿងស្រវឹង', no_alcohol: 'មិនមានគ្រឿងស្រវឹង', has_alcohol: 'រកឃើញគ្រឿងស្រវឹង', value_mg: 'តម្លៃវាស់ (mg%)', take_photo: 'ចុចដើម្បីថតរូប', submit: 'ដាក់ស្នើ', record: 'កត់ត្រាការតេស្តគ្រឿងស្រវឹង', fill_in: 'សូមបំពេញព័ត៌មានទាំងអស់', employee_id: 'លេខបុគ្គលិក', quick_lookup: 'ស្វែងរករហ័ស' }
};
function t(key, lang) { return (I18N[lang || localStorage.getItem('lang') || 'th'] || I18N.th)[key] || I18N.th[key] || key; }

// ===== Auth =====
function isAdminAuthed() { return !!(sessionStorage.getItem('admin_auth') === '1' && sessionStorage.getItem('sb_token')); }
function setAdminAuth(v, userId) {
  sessionStorage.setItem('admin_auth', v ? '1' : '0');
  if (v && userId) sessionStorage.setItem('admin_user', userId);
  if (!v) { sessionStorage.removeItem('admin_user'); sessionStorage.removeItem('sb_token'); }
}
function currentUser() {
  const id = sessionStorage.getItem('admin_user') || 'u1';
  return DB.users().find(u => u.id === id) || DB.users()[0];
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
  const links = [
    { href: 'admin-dashboard.html', label: 'แดชบอร์ด', key: 'dashboard' },
    { href: 'admin-alerts.html', label: 'แจ้งเตือน', key: 'alerts', roles: ['super','manager','viewer','auditor'] },
    { href: 'admin-reports.html', label: 'รายงาน', key: 'reports' },
    { href: 'admin-tests.html', label: 'ผลตรวจ', key: 'tests' },
    { href: 'admin-persons.html', label: 'พนักงาน', key: 'persons' },
    { href: 'admin-locations.html', label: 'QR/สถานที่', key: 'locations' },
    { href: 'admin-companies.html', label: 'บริษัท', key: 'companies' },
    { href: 'admin-devices.html', label: 'เครื่องตรวจ', key: 'devices' },
    { href: 'admin-settings.html', label: 'ตั้งค่า', key: 'settings', roles: ['super'] },
    { href: 'admin-audit.html', label: 'Audit Log', key: 'audit', roles: ['super','auditor'] }
  ];
  const visible = links.filter(l => !l.roles || (u && l.roles.includes(u.role)));
  // Pending alerts count
  const pending = DB.tests().filter(x => !x.is_zero && x.action_taken === 'pending').length;
  return `
    <div class="topbar">
      <a href="admin-dashboard.html" class="brand">
        <div class="logo">A</div>
        <div>
          <div style="font-size:15px">ระบบตรวจแอลกอฮอล์</div>
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
        <a href="index.html" class="btn btn-ghost btn-sm">หน้าหลัก</a>
        <button class="btn btn-sm" onclick="setAdminAuth(false); location.href='admin-login.html'">ออก</button>
      </div>
    </div>
  `;
}
function requireAdmin() {
  if (!isAdminAuthed()) { location.href = 'admin-login.html'; return false; }
  return true;
}

// ===== Threshold badge =====
function thresholdBadge(t) {
  if (t.is_zero) return '<span class="lvl lvl-pass"><span class="lvl-dot"></span>ผ่าน · 0%</span>';
  const lvl = getThresholdLevel(t.alcohol_value, t.department);
  const cls = 'lvl-' + (lvl.color === 'danger-strong' ? 'illegal' : lvl.color);
  return `<span class="lvl ${cls}"><span class="lvl-dot"></span>${lvl.label} · ${t.alcohol_value} mg%</span>`;
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
const _SB_URL = 'https://qgkevfikehdoufjcubcm.supabase.co';
const _SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFna2V2ZmlrZWhkb3VmamN1YmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzI1MjYsImV4cCI6MjA5MzcwODUyNn0.HL4K4ut2oIYVrbc6FschFqJqIKnQQMVYzJA3ti5EgXM';

function _sbH() {
  const token = sessionStorage.getItem('sb_token') || _SB_KEY;
  return { 'apikey': _SB_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
}
async function _sbGet(table, qs) {
  try {
    const r = await fetch(_SB_URL + '/rest/v1/' + table + (qs ? '?' + qs : ''), { headers: _sbH() });
    return r.ok ? r.json() : [];
  } catch { return []; }
}
async function _sbPost(table, body) {
  try {
    const r = await fetch(_SB_URL + '/rest/v1/' + table, {
      method: 'POST', headers: { ..._sbH(), 'Prefer': 'return=representation' }, body: JSON.stringify(body)
    });
    if (!r.ok) return null;
    const j = await r.json(); return Array.isArray(j) ? j[0] : j;
  } catch { return null; }
}
async function _sbPatch(table, val, body, col) {
  try {
    await fetch(_SB_URL + '/rest/v1/' + table + '?' + (col || 'id') + '=eq.' + encodeURIComponent(val), {
      method: 'PATCH', headers: { ..._sbH(), 'Prefer': 'return=minimal' }, body: JSON.stringify(body)
    });
  } catch {}
}
async function _sbDel(table, val, col) {
  try {
    await fetch(_SB_URL + '/rest/v1/' + table + '?' + (col || 'id') + '=eq.' + encodeURIComponent(val), {
      method: 'DELETE', headers: _sbH()
    });
  } catch {}
}
async function _sbUploadPhoto(filename, blob) {
  try {
    const r = await fetch(_SB_URL + '/storage/v1/object/photos/' + filename, {
      method: 'POST',
      headers: { 'apikey': _SB_KEY, 'Authorization': 'Bearer ' + _SB_KEY, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      body: blob
    });
    if (!r.ok) return null;
    return _SB_URL + '/storage/v1/object/public/photos/' + filename;
  } catch { return null; }
}

// Fetch all tables from Supabase and merge into localStorage cache
DB.init = async function() {
  try {
    const [locs, cos, tests, devs, users, persons, channels, audit, watchlist, settings] = await Promise.all([
      _sbGet('locations', 'order=code'),
      _sbGet('companies', 'order=name'),
      _sbGet('tests', 'order=created_at.desc&limit=500'),
      _sbGet('devices', 'order=serial'),
      _sbGet('admin_users', 'order=username'),
      _sbGet('persons', 'order=full_name'),
      _sbGet('alert_channels', 'order=created_at'),
      _sbGet('audit_log', 'order=created_at.desc&limit=200'),
      _sbGet('watchlist', 'order=added_at.desc'),
      _sbGet('settings', 'id=eq.1')
    ]);
    const db = loadDB();
    if (locs.length)     db.locations = locs;
    if (cos.length)      db.companies = cos;
    if (tests.length)    db.tests = tests;
    if (devs.length)     db.devices = devs;
    if (users.length)    db.users = users;
    if (persons.length)  db.persons = persons;
    if (channels.length) db.channels = channels;
    if (audit.length)    db.audit = audit;
    if (watchlist.length) db.watchlist = watchlist;
    if (settings.length) {
      const s = settings[0];
      db.settings = { ...db.settings, retest_minutes: s.retest_minutes, watchlist_threshold: s.watchlist_threshold, watchlist_window_days: s.watchlist_window_days, language: s.language };
    }
    saveDB(db);
  } catch (e) {
    console.warn('Supabase sync failed, using local cache:', e.message);
  }
};

// Patch write methods to also persist to Supabase in the background
(function _patchForSupabase() {
  function _isLocal(id, prefix) { return !id || (typeof id === 'string' && id.startsWith(prefix)); }

  // addTest — POST new test, then update localStorage entry with real UUID
  const _addTest = DB.addTest.bind(DB);
  DB.addTest = function(t) {
    const e = _addTest(t);
    const rec = {
      employee_id: e.employee_id || '', full_name: e.full_name, department: e.department,
      plate_number: e.plate_number || '', company: e.company, alcohol_value: e.alcohol_value,
      is_zero: e.is_zero, level: e.level, location_code: e.location_code, location_name: e.location_name,
      photo_url: e.photo_url || '', shift_id: e.shift_id, device_serial: e.device_serial || '',
      signature_employee: e.signature_employee || '', retest_status: e.retest_status || null,
      action_taken: e.action_taken || null, action_note: e.action_note || '',
      operator_id: e.operator_id && !_isLocal(e.operator_id, 'u') ? e.operator_id : null,
      created_at: e.created_at
    };
    _sbPost('tests', rec).then(row => {
      if (row?.id) {
        const db = loadDB(); const i = db.tests.findIndex(x => x.id === e.id);
        if (i >= 0) { db.tests[i].id = row.id; saveDB(db); }
      }
    });
    // Push any newly auto-added watchlist entry to Supabase
    const wl = (loadDB().watchlist || []).filter(w => w.full_name === e.full_name && _isLocal(w.id, 'w'));
    wl.forEach(w => {
      _sbPost('watchlist', { full_name: w.full_name, employee_id: w.employee_id || '', reason: w.reason }).then(row => {
        if (row?.id) {
          const db = loadDB(); const i = (db.watchlist || []).findIndex(x => x.id === w.id);
          if (i >= 0) { db.watchlist[i].id = row.id; saveDB(db); }
        }
      });
    });
    return e;
  };

  // deleteTest — DELETE from Supabase + log to audit_log
  const _delTest = DB.deleteTest.bind(DB);
  DB.deleteTest = function(id, actor) {
    const test = loadDB().tests.find(x => x.id === id);
    _delTest(id, actor);
    if (!_isLocal(id, 't')) {
      _sbDel('tests', id);
      _sbPost('audit_log', { actor_name: actor?.name || 'Admin', action: 'delete_test', target: id, detail: 'ลบผลตรวจของ ' + (test?.full_name || '') });
    }
  };

  // updateTest — PATCH in Supabase + log to audit_log
  const _updTest = DB.updateTest.bind(DB);
  DB.updateTest = function(id, patch, actor) {
    _updTest(id, patch, actor);
    if (!_isLocal(id, 't')) {
      const allowed = ['action_taken','action_note','action_by','retest_status','retest_of','is_zero','alcohol_value','level','photo_url'];
      const sbPatch = {};
      for (const k of allowed) { if (k in patch) sbPatch[k] = patch[k]; }
      if (Object.keys(sbPatch).length) _sbPatch('tests', id, sbPatch);
      _sbPost('audit_log', { actor_name: actor?.name || 'Admin', action: 'update_test', target: id, detail: 'แก้ไข: ' + Object.keys(patch).join(', ') });
    }
  };

  // upsertLocation — upsert on code (text PK, always safe to send)
  const _upsLoc = DB.upsertLocation.bind(DB);
  DB.upsertLocation = function(loc) {
    _upsLoc(loc);
    fetch(_SB_URL + '/rest/v1/locations?on_conflict=code', {
      method: 'POST', headers: { ..._sbH(), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(loc)
    }).catch(() => {});
  };

  const _delLoc = DB.deleteLocation.bind(DB);
  DB.deleteLocation = function(code) { _delLoc(code); _sbDel('locations', code, 'code'); };

  // upsertCompany — POST new (get UUID back) or PATCH existing (has real UUID)
  const _upsCo = DB.upsertCompany.bind(DB);
  DB.upsertCompany = function(c) {
    const prev = DB.companies().find(x => x.id === c.id);
    _upsCo(c);
    if (prev && !_isLocal(prev.id, 'c')) {
      _sbPatch('companies', prev.id, { name: c.name });
    } else {
      _sbPost('companies', { name: c.name }).then(row => {
        if (row?.id) {
          const db = loadDB(); const i = db.companies.findIndex(x => x.name === c.name && _isLocal(x.id, 'c'));
          if (i >= 0) { db.companies[i].id = row.id; saveDB(db); }
        }
      });
    }
  };

  const _delCo = DB.deleteCompany.bind(DB);
  DB.deleteCompany = function(id) { _delCo(id); if (!_isLocal(id, 'c')) _sbDel('companies', id); };

  // upsertDevice
  const _upsDev = DB.upsertDevice.bind(DB);
  DB.upsertDevice = function(d) {
    const prev = DB.devices().find(x => x.id === d.id);
    _upsDev(d);
    const rec = { serial: d.serial, model: d.model, location_code: d.location_code || null, last_calibrated: d.last_calibrated || null, next_calibration: d.next_calibration || null };
    if (prev && !_isLocal(prev.id, 'd')) {
      _sbPatch('devices', prev.id, rec);
    } else {
      _sbPost('devices', rec).then(row => {
        if (row?.id) {
          const db = loadDB(); const i = db.devices.findIndex(x => x.serial === d.serial && _isLocal(x.id, 'd'));
          if (i >= 0) { db.devices[i].id = row.id; saveDB(db); }
        }
      });
    }
  };

  const _delDev = DB.deleteDevice.bind(DB);
  DB.deleteDevice = function(id) { _delDev(id); if (!_isLocal(id, 'd')) _sbDel('devices', id); };

  // upsertUser (admin_users table)
  const _upsUsr = DB.upsertUser.bind(DB);
  DB.upsertUser = function(u) {
    const prev = DB.users().find(x => x.id === u.id);
    _upsUsr(u);
    const rec = { username: u.username, name: u.name, email: u.email || '', role: u.role, sites: u.sites };
    if (prev && !_isLocal(prev.id, 'u')) {
      _sbPatch('admin_users', prev.id, rec);
    } else {
      _sbPost('admin_users', rec).then(row => {
        if (row?.id) {
          const db = loadDB(); const i = db.users.findIndex(x => x.username === u.username && _isLocal(x.id, 'u'));
          if (i >= 0) { db.users[i].id = row.id; saveDB(db); }
        }
      });
    }
  };

  const _delUsr = DB.deleteUser.bind(DB);
  DB.deleteUser = function(id) { _delUsr(id); if (!_isLocal(id, 'u')) _sbDel('admin_users', id); };

  // upsertChannel (alert_channels table)
  const _upsCh = DB.upsertChannel.bind(DB);
  DB.upsertChannel = function(c) {
    const prev = DB.channels().find(x => x.id === c.id);
    _upsCh(c);
    const rec = { kind: c.kind, label: c.label, target: c.target, enabled: !!c.enabled };
    if (prev && !_isLocal(prev.id, 'ch')) {
      _sbPatch('alert_channels', prev.id, rec);
    } else {
      _sbPost('alert_channels', rec).then(row => {
        if (row?.id) {
          const db = loadDB(); const i = db.channels.findIndex(x => x.label === c.label && _isLocal(x.id, 'ch'));
          if (i >= 0) { db.channels[i].id = row.id; saveDB(db); }
        }
      });
    }
  };

  const _delCh = DB.deleteChannel.bind(DB);
  DB.deleteChannel = function(id) { _delCh(id); if (!_isLocal(id, 'ch')) _sbDel('alert_channels', id); };

  // setSettings — PATCH the single settings row (id=1)
  const _setSettings = DB.setSettings.bind(DB);
  DB.setSettings = function(s) {
    _setSettings(s);
    const allowed = ['retest_minutes', 'watchlist_threshold', 'watchlist_window_days', 'language'];
    const sbS = {};
    allowed.forEach(k => { if (k in s) sbS[k] = s[k]; });
    if (Object.keys(sbS).length) _sbPatch('settings', 1, sbS);
  };

  // addAudit — also insert into audit_log
  const _addAudit = DB.addAudit.bind(DB);
  DB.addAudit = function(entry) {
    _addAudit(entry);
    _sbPost('audit_log', { actor_name: entry.actor_name || 'Admin', action: entry.action || '', target: entry.target || '', detail: entry.detail || '' });
  };

  // removeFromWatchlist — DELETE from watchlist
  const _rmWatch = DB.removeFromWatchlist.bind(DB);
  DB.removeFromWatchlist = function(id) { _rmWatch(id); if (!_isLocal(id, 'w')) _sbDel('watchlist', id); };

  // upsertPerson / deletePerson (persons table)
  const _upsPer = DB.upsertPerson.bind(DB);
  DB.upsertPerson = function(p) {
    const prev = p.id ? DB.persons().find(x => x.id === p.id) : null;
    _upsPer(p);
    const rec = { employee_id: p.employee_id || '', full_name: p.full_name, department: p.department || '', company: p.company || '', plate_number: p.plate_number || '', phone: p.phone || '' };
    if (prev && !_isLocal(prev.id, 'p')) {
      _sbPatch('persons', prev.id, rec);
    } else {
      _sbPost('persons', rec).then(row => {
        if (row?.id) {
          const db = loadDB(); const i = db.persons.findIndex(x => x.employee_id === p.employee_id && _isLocal(x.id, 'p'));
          if (i >= 0) { db.persons[i].id = row.id; saveDB(db); }
        }
      });
    }
  };

  const _delPer = DB.deletePerson.bind(DB);
  DB.deletePerson = function(id) { _delPer(id); if (!_isLocal(id, 'p')) _sbDel('persons', id); };
})();

// Auto-init on every page load — all pages await this promise before rendering
window.__dbReady = DB.init();
