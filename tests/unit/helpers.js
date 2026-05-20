/**
 * Pure utility functions extracted from project/data.js for unit testing.
 * Keep these in sync with data.js when logic changes.
 */

// ── esc ──────────────────────────────────────────────────────────────────────
export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── getDeviceStatus ───────────────────────────────────────────────────────────
export function getDeviceStatus(nextDate) {
  const days = (new Date(nextDate) - Date.now()) / 86400000;
  if (days < 0) return 'overdue';
  if (days < 30) return 'due-soon';
  return 'active';
}

// ── THRESHOLDS + getThresholdLevel ───────────────────────────────────────────
export const THRESHOLDS = {
  default: [
    { max: 0,        level: 'pass',     label: 'ผ่าน',             color: 'success' },
    { max: 20,       level: 'caution',  label: 'เตือน',            color: 'warn' },
    { max: 50,       level: 'no-drive', label: 'ห้ามขับ',          color: 'danger' },
    { max: Infinity, level: 'illegal',  label: 'ผิดกฎหมาย',        color: 'danger-strong' },
  ],
  'พนักงานขนส่ง (Transport)': [
    { max: 0,        level: 'pass',     label: 'ผ่าน',             color: 'success' },
    { max: 20,       level: 'no-drive', label: 'ห้ามขับ',          color: 'danger' },
    { max: Infinity, level: 'illegal',  label: 'ผิดกฎหมาย',        color: 'danger-strong' },
  ],
  'พนักงานรักษาความปลอดภัย (Security)': [
    { max: 0,        level: 'pass',     label: 'ผ่าน',             color: 'success' },
    { max: 20,       level: 'caution',  label: 'เตือน',            color: 'warn' },
    { max: Infinity, level: 'no-drive', label: 'ห้ามปฏิบัติงาน',  color: 'danger' },
  ],
};

export function getThresholdLevel(value, department) {
  const rules = THRESHOLDS[department] || THRESHOLDS.default;
  const v = Number(value) || 0;
  if (v === 0) return rules[0];
  for (const r of rules) {
    if (v <= r.max && r.max !== 0) return r;
  }
  return rules[rules.length - 1];
}

// ── SHIFTS + getShiftFromDate ─────────────────────────────────────────────────
export const SHIFTS = [
  { id: 'morning',   label: 'เช้า (06:00-14:00)',  start: 6,  end: 14, icon: '☀️' },
  { id: 'afternoon', label: 'บ่าย (14:00-22:00)',  start: 14, end: 22, icon: '🌤️' },
  { id: 'night',     label: 'ดึก (22:00-06:00)',   start: 22, end: 30, icon: '🌙' },
];

export function getShiftFromDate(iso) {
  const h = new Date(iso).getHours();
  if (h >= 6 && h < 14) return SHIFTS[0];
  if (h >= 14 && h < 22) return SHIFTS[1];
  return SHIFTS[2];
}

// ── I18N + t ─────────────────────────────────────────────────────────────────
export const I18N_SAMPLE = {
  th: { submit: 'ส่งข้อมูล', no_alcohol: 'ไม่พบแอลกอฮอล์', gps_too_far: 'คุณอยู่ห่างจากจุดตรวจ {m} เมตร กรุณาเข้ามาในรัศมี 100 เมตร' },
  en: { submit: 'Submit',    no_alcohol: 'No alcohol detected', gps_too_far: 'You are {m} m away from this checkpoint. Move within 100 m to record your test.' },
  my: { submit: 'တင်ပြရန်', no_alcohol: 'အရက်မတွေ့ပါ',       gps_too_far: 'သင်သည် စစ်ဆေးမှုနေရာမှ {m} မီတာ ဝေးနေသည်။ ၁၀၀ မီတာအတွင်း ဝင်ရောက်ပါ။' },
  km: { submit: 'ដាក់ស្នើ', no_alcohol: 'មិនមានគ្រឿងស្រវឹង',  gps_too_far: 'អ្នកនៅឆ្ងាយពីចំណុចត្រួតពិនិត្យ {m} ម៉ែត្រ។ សូមចូលក្នុងรัศมី ១០០ ម៉ែត្រ។' },
};

export function t(key, lang, i18n = I18N_SAMPLE) {
  return (i18n[lang] || i18n.th)[key] || (i18n.th)[key] || key;
}

// ── _sortTests ────────────────────────────────────────────────────────────────
export function _sortTests(db) {
  if (db && Array.isArray(db.tests)) {
    db.tests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

// ── _buildIndices ─────────────────────────────────────────────────────────────
export function _buildIndices(db) {
  return {
    locationByCode:  new Map((db.locations || []).map(l => [l.code, l])),
    userByUsername:  new Map((db.users     || []).map(u => [u.username, u])),
    personByEmpId:   new Map((db.persons   || []).map(p => [p.employee_id, p])),
    watchlistByName: new Map((db.watchlist || []).map(w => [w.full_name, w])),
  };
}

// ── timeAgo (pure, clock-injected variant for testing) ────────────────────────
export function timeAgo(iso, nowMs, lang = 'en') {
  const s = (nowMs - new Date(iso).getTime()) / 1000;
  const en = lang === 'en';
  if (s < 60)    return en ? 'just now'                         : 'เมื่อสักครู่';
  if (s < 3600)  return en ? `${Math.floor(s / 60)}m ago`      : `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return en ? `${Math.floor(s / 3600)}h ago`    : `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
  return           en ? `${Math.floor(s / 86400)}d ago`         : `${Math.floor(s / 86400)} วันที่แล้ว`;
}
