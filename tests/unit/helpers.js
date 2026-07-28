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

// ── buildAlertEmail ───────────────────────────────────────────────────────────
// Returns { subject, html } for a failed alcohol test notification.
// `test.level` matches the DB column: 'caution' | 'no-drive' | 'illegal'
// `firstTest` is optional — pass the original test when `test` is a retest.
export function buildAlertEmail(test, firstTest = null) {
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
    <tr><td style="padding:6px 0;color:#6b7280;width:40%">ชื่อ / Name</td><td style="padding:6px 0;font-weight:600">${_safeText(t.full_name)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280">แผนก / Dept</td><td style="padding:6px 0">${_safeText(t.department)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280">บริษัท / Company</td><td style="padding:6px 0">${_safeText(t.company)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280">สถานที่ / Location</td><td style="padding:6px 0">${_safeText(t.location_name)} (${_safeText(t.location_code)})</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280">ค่าแอลกอฮอล์ / Value</td><td style="padding:6px 0;font-size:18px;font-weight:700;color:${(levelLabel[t.level] || levelLabel['no-drive']).color}">${t.alcohol_value ?? 0} mg%</td></tr>
    <tr><td style="padding:6px 0 14px;color:#6b7280">เวลา / Time</td><td style="padding:6px 0 14px">${_formatTime(t.created_at)}</td></tr>`;

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

function _safeText(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false });
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

// ── Analytics helpers (mirror of project/data.js — keep in sync) ──────────────
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const isoYear = d.getUTCFullYear();
  const firstThu = new Date(Date.UTC(isoYear, 0, 4));
  const firstThuDay = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - firstThuDay + 3);
  const week = 1 + Math.round((d.getTime() - firstThu.getTime()) / (7 * 86400000));
  return { year: isoYear, week };
}

export function weekRange(year, week) {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const start = new Date(year, 0, 4 - jan4Day + (week - 1) * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function parseWeekInput(str) {
  const m = /^(\d{4})-W(\d{2})$/.exec((str || '').trim());
  if (!m) return null;
  const year = +m[1], week = +m[2];
  if (week < 1 || week > 53) return null;
  const { start, end } = weekRange(year, week);
  return { year, week, start, end, label: `${year}-W${String(week).padStart(2, '0')}` };
}

export function periodRange(preset, ref = new Date()) {
  const r = new Date(ref);
  let start, end, prevStart, prevEnd;
  if (preset === 'today') {
    start = new Date(r); start.setHours(0, 0, 0, 0);
    end = new Date(r); end.setHours(23, 59, 59, 999);
    prevStart = new Date(start); prevStart.setDate(start.getDate() - 1);
    prevEnd = new Date(end); prevEnd.setDate(end.getDate() - 1);
  } else if (preset === '7d') {
    end = new Date(r); end.setHours(23, 59, 59, 999);
    start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0, 0, 0, 0);
    prevEnd = new Date(start); prevEnd.setDate(start.getDate() - 1); prevEnd.setHours(23, 59, 59, 999);
    prevStart = new Date(prevEnd); prevStart.setDate(prevEnd.getDate() - 6); prevStart.setHours(0, 0, 0, 0);
  } else if (preset === 'week') {
    const iw = isoWeek(r);
    ({ start, end } = weekRange(iw.year, iw.week));
    prevStart = new Date(start); prevStart.setDate(start.getDate() - 7);
    prevEnd = new Date(end); prevEnd.setDate(end.getDate() - 7);
  } else {
    preset = 'month';
    start = new Date(r.getFullYear(), r.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(r.getFullYear(), r.getMonth() + 1, 0, 23, 59, 59, 999);
    prevStart = new Date(r.getFullYear(), r.getMonth() - 1, 1, 0, 0, 0, 0);
    prevEnd = new Date(r.getFullYear(), r.getMonth(), 0, 23, 59, 59, 999);
  }
  return { preset, start, end, prevStart, prevEnd };
}

export function bucketTests(tests, start, end) {
  const span = (end - start) / 86400000;
  const gran = span > 31 ? 'week' : 'day';
  const buckets = [];
  const cur = new Date(start); cur.setHours(0, 0, 0, 0);
  if (gran === 'week') cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));
  while (cur <= end) {
    const bStart = new Date(cur);
    const bEnd = new Date(cur);
    if (gran === 'day') { bEnd.setHours(23, 59, 59, 999); cur.setDate(cur.getDate() + 1); }
    else { bEnd.setDate(bEnd.getDate() + 6); bEnd.setHours(23, 59, 59, 999); cur.setDate(cur.getDate() + 7); }
    buckets.push({ start: bStart, end: bEnd, tests: [] });
  }
  for (const t of tests) {
    const d = new Date(t.created_at);
    const b = buckets.find(x => d >= x.start && d <= x.end);
    if (b) b.tests.push(t);
  }
  return { gran, buckets };
}

export function summarize(tests) {
  const severity = { pass: 0, caution: 0, 'no-drive': 0, illegal: 0 };
  const retests = { required: 0, completed: 0, failed: 0 };
  const byShift = { morning: 0, afternoon: 0, night: 0 };
  let zero = 0, sumVal = 0, valCount = 0;
  for (const t of tests) {
    if (t.is_zero) zero++; else { sumVal += Number(t.alcohol_value) || 0; valCount++; }
    const lvl = t.level || (t.is_zero ? 'pass' : 'no-drive');
    if (severity[lvl] !== undefined) severity[lvl]++;
    if (t.retest_status && retests[t.retest_status] !== undefined) retests[t.retest_status]++;
    if (t.shift_id && byShift[t.shift_id] !== undefined) byShift[t.shift_id]++;
  }
  const total = tests.length;
  const positive = total - zero;
  return {
    total, zero, positive,
    passRate: total ? Math.round(zero / total * 100) : 0,
    severity, retests, byShift,
    avgValue: valCount ? +(sumVal / valCount).toFixed(1) : 0,
  };
}

export function repeatOffenders(tests, minPositives = 2) {
  const map = new Map();
  for (const t of tests) {
    if (t.is_zero) continue;
    const key = t.employee_id || t.full_name || 'unknown';
    if (!map.has(key)) {
      map.set(key, { key, name: t.full_name || t.employee_id || '—', employee_id: t.employee_id || '', department: t.department || '', company: t.company || '', count: 0, maxValue: 0, lastAt: t.created_at });
    }
    const o = map.get(key);
    o.count++;
    o.maxValue = Math.max(o.maxValue, Number(t.alcohol_value) || 0);
    if (new Date(t.created_at) > new Date(o.lastAt)) o.lastAt = t.created_at;
  }
  return [...map.values()]
    .filter(o => o.count >= minPositives)
    .sort((a, b) => b.count - a.count || b.maxValue - a.maxValue);
}
