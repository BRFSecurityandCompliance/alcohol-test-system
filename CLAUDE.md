# Alcohol Test System — Claude Code Guide

## Project Overview
QR-based alcohol test recording system for Thai workplaces. Employees scan a QR code at their location, fill in a form, record their test result and photo, then submit. Admins view results on a dashboard.

**Stack**: Vanilla HTML/CSS/JS + Supabase (PostgreSQL) + Cloudflare Workers  
**Architecture**: localStorage as synchronous cache; Supabase writes fire-and-forget; `DB.init()` hydrates from Supabase on page load.

---

## Security Baseline

- **Never** commit `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, or any `sk-*` / `ghp_*` secret
- Supabase anon key in `supabase.js` is intentionally public — it has RLS restrictions
- Service-role operations must go through the Cloudflare Worker proxy (`/api/admin/*`)
- User input (form fields, CSV rows) must be trimmed and validated before DB write
- SQL injections are prevented by Supabase's parameterised PostgREST API — never string-concat raw SQL
- XSS: always set `textContent` or use template literals — never `innerHTML` with unsanitised user data
- The Cloudflare Worker validates `X-Admin-Token` (JWT) before proxying any admin request

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

**In user-facing pages:**
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

## Supabase Patterns

### Client selection
```javascript
// Always use _dbClient() — returns admin proxy when logged in, anon client otherwise
_dbClient().from('table').select('*')

// Admin proxy routes: /api/admin/rest/v1/* → Supabase with service_role key
// Anon client: direct Supabase with anon key (RLS enforced)
```

### Fire-and-forget vs. awaited writes
```javascript
// Fire-and-forget (UI already updated via localStorage):
_dbClient().from('locations').upsert(loc).then(({ error }) => {
  if (error) console.warn('[DB.upsertLocation]', error.message);
});

// Awaited (CSV import, critical paths — must confirm persistence):
const { error } = await _dbClient().from('locations').upsert(loc, { onConflict: 'code' });
if (error) throw new Error(error.message);
```

### Force re-sync after bulk writes
```javascript
// After bulk import, reset the init guard to re-fetch from Supabase:
DB._initialized = false;
await DB.init();
render();
```

### RLS rules (tighten_rls migration)
- Anon: SELECT locations/companies/settings only (no direct table writes)
- Test submission: Worker endpoint `POST /api/submit-test` — validates input, INSERTs with service role, and dispatches the alcohol-detected alert server-side (anon INSERT on `tests` was removed in `route_test_insert_via_worker`)
- Admin (service role via Worker): full access to all tables
- Employee lookup: Worker endpoint `/api/lookup-person?id=EMP001`

---

## Polling Pattern

```javascript
// Set up 5-second auto-refresh on admin pages:
function render() { /* build UI from DB.* */ }
render();
DB.startPolling(render, 5000);

// startPolling calls DB.init().then(render) on interval.
// DB.init() is guarded by DB._initialized — re-fetches only once per page load.
// To force a re-fetch: DB._initialized = false; await DB.init();
```

---

## CSV Import Pattern

All admin CSV imports follow this pattern:
1. Parse with `parseCSV(text)` (handles BOM, quoted fields, CRLF)
2. Map headers with `headers.indexOf(key)`
3. Validate required columns; alert and return on failure
4. Collect upsert promises: `promises.push(DB.upsert*(row))`
5. `await Promise.all(promises)` — never fire-and-forget for imports
6. `DB._initialized = false; await DB.init(); render()` to confirm persistence
7. `showToast(...)` with counts

CSV export uses UTF-8 BOM (`﻿`) for Excel compatibility.

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

---

## Code Quality Rules

- No `console.log` in production code — use `console.warn('[context]', msg)` for real errors only
- No inline secrets — all env vars live in Cloudflare Worker secrets (`env.SUPABASE_SERVICE_KEY`, `env.ADMIN_PASSWORD`, `env.JWT_SECRET`)
- No `innerHTML` with user-controlled data — use `textContent` or escape first
- Async operations that must persist: await and catch, never fire-and-forget
- After any bulk write: reset `DB._initialized = false` and re-init to confirm
- SQL migrations: no `DROP TABLE` or `TRUNCATE` without explicit user confirmation

---

## Anti-Patterns to Avoid

| Anti-pattern | Why | Fix |
|---|---|---|
| `DB.upsertX()` fire-and-forget in import loops | Silent failure reverts on reload | Collect promises, `await Promise.all(...)` |
| `base64` photo stored in Supabase INSERT | Payload too large → timeout on mobile | Upload to Storage, store URL only |
| `DB.init()` called without resetting `_initialized` | Returns stale cache forever | Set `DB._initialized = false` first |
| `innerHTML` with user input | XSS | Use `textContent` or sanitise |
| Hardcoded `service_role` key in frontend | Security breach | Route via Cloudflare Worker |

---

## Agent Delegation Guide

For complex multi-file investigations, spawn an **Explore** subagent.  
For multi-step implementations, use the **Plan** subagent first, then implement.  
Always include: file paths, relevant function names, and the exact change needed in the prompt.

---

## Development Branch

Active branch: `claude/new-session-A4YNx`  
All changes must be committed and pushed to this branch. Create draft PRs against `main`.
