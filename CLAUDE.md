# Alcohol Test System — Claude Code Guide

## Project Overview
QR-based alcohol test recording system for Thai workplaces. Employees scan a QR code at their location, fill in a form, record their test result and photo, then submit. Admins view results on a dashboard.

**Stack**: Vanilla HTML/CSS/JS + Supabase (PostgreSQL) + Cloudflare Workers  
**Architecture**: localStorage as synchronous cache; Supabase writes fire-and-forget; `DB.init()` hydrates from Supabase on page load.

---

## Key Files

| File | Purpose |
|------|---------|
| `project/data.js` | Central data layer — `DB` object, `I18N` translations, `renderTopbar()`, seed data, Supabase sync |
| `project/shared.css` | Design tokens, shared component styles (topbar, modal, table, banner, etc.) |
| `project/supabase.js` | Supabase client init (`_sb`) |
| `project/user-form.html` | Employee-facing test submission form (QR → form → photo → submit) |
| `project/user-retest.html` | Re-test flow for failed results |
| `project/user-success.html` | Success confirmation screen |
| `project/guide.html` | Infographic-style user guide (step-by-step) |
| `project/admin-*.html` | Admin panel pages (login, dashboard, tests, devices, persons, locations, companies, reports, alerts, settings, audit) |
| `supabase/migrations/` | SQL migration files (timestamped) |
| `worker.js` | Cloudflare Worker entry point |

---

## i18n Pattern

Languages: `th` (Thai), `en` (English), `my` (Myanmar/MM), `km` (Cambodia/KH)  
Stored in: `localStorage.getItem('lang')` — default `'th'`

**In user-form.html:**
```javascript
const lang = localStorage.getItem('lang') || 'th';
const T = (k) => t(k, lang);   // translate key
```

**In admin pages:**
```javascript
const isEN = (localStorage.getItem('lang') || 'th') === 'en';
// Usage: isEN ? 'English text' : 'ข้อความภาษาไทย'
```

**Adding a new i18n key**: Add to the `I18N` object in `data.js` for all 4 language keys (`th`, `en`, `my`, `km`).

**Language button display labels** (internal code → display):
```javascript
{ th: 'TH', en: 'EN', my: 'MM', km: 'KH' }
```

---

## Data Model (localStorage keys via `DB`)

- `DB.tests()` / `DB.addTest()` / `DB.deleteTest()` / `DB.updateTest()`
- `DB.locations()` / `DB.upsertLocation()` / `DB.deleteLocation()`
- `DB.companies()` / `DB.upsertCompany()` / `DB.deleteCompany()`
- `DB.devices()` / `DB.upsertDevice()` / `DB.deleteDevice()`
- `DB.persons()` / `DB.upsertPerson()` / `DB.deletePerson()`
- `DB.settings()` / `DB.saveSettings()`

**When adding a new field to a table**, update all 3 places in `data.js`:
1. `SEED_*` array (default value)
2. `upsert*` row mapping (write to Supabase)
3. `DB.init()` mapping (read from Supabase)

And create a new migration file: `supabase/migrations/<timestamp>_description.sql`

---

## Admin Roles

| Role | Access |
|------|--------|
| `super` | Full access including Settings and Audit Log |
| `manager` | All except Settings/Audit |
| `viewer` | Read-only (Alerts, Reports, Tests) |
| `auditor` | Alerts + Audit Log |

Role check: `requireAdmin()` in `data.js` — redirects to login if not authenticated.

---

## Topbar (`renderTopbar(active)`)

Called at the top of every admin page's `DB.init().then()` block:
```javascript
document.getElementById('chrome').innerHTML = renderTopbar('dashboard');
```

The `active` key highlights the current nav link. Nav links and their keys:
`dashboard`, `alerts`, `reports`, `tests`, `persons`, `locations`, `companies`, `devices`, `settings`, `audit`, `guide`

---

## Calibration Status Logic

```javascript
getDeviceStatus(next_calibration_date)
// returns: 'active' | 'due-soon' (≤30 days) | 'overdue' (past)
```

---

## Threshold Rules (Blood Alcohol, mg%)

Defined in `THRESHOLDS` in `data.js`. Department-specific overrides:
- Transport: zero tolerance (>0 → no-drive, >20 → illegal)
- Security: caution up to 20, then no-drive
- Default: pass=0, caution≤20, no-drive≤50, illegal>50

---

## Development Branch

Active branch: `claude/new-session-A4YNx`  
All changes must be committed and pushed to this branch. A draft PR (#3) is open against `main`.

---

## Common Patterns

**Toast notification:**
```javascript
showToast('message');
```

**Modal open/close:**
```javascript
document.getElementById('modal').classList.add('show');
document.getElementById('modal').classList.remove('show');
```

**Supabase migration file naming:**
```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

**Photo stamp**: `stampPhoto(photoDataUrl, metadata)` in `data.js` — async, requires font preload before canvas draw.
