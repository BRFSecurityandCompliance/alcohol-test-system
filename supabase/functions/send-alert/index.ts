// Supabase Edge Function: send-alert
// Triggered via database webhook when a test with alcohol > 0 is inserted.
// Supports LINE Notify and email (via Resend API).
//
// Environment variables (set in Supabase dashboard → Edge Functions → send-alert):
//   LINE_NOTIFY_TOKEN  — LINE Notify token for the alert group
//   RESEND_API_KEY     — Resend.com API key for email alerts
//   ALERT_EMAIL_TO     — comma-separated recipient emails

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const LINE_TOKEN = Deno.env.get('LINE_NOTIFY_TOKEN');
const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_TO   = Deno.env.get('ALERT_EMAIL_TO') || '';

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let test: Record<string, unknown>;
  try {
    const body = await req.json();
    // Supabase Database Webhook sends { type, table, record, old_record }
    test = body.record ?? body;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  // Only alert for non-zero alcohol results
  if (test.is_zero) return new Response('OK — no alert needed', { status: 200 });

  const name     = test.full_name     ?? 'ไม่ระบุ';
  const dept     = test.department    ?? '';
  const location = test.location_name ?? '';
  const value    = test.alcohol_value ?? '?';
  const level    = test.level         ?? '';
  const time     = test.created_at
    ? new Date(test.created_at as string).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
    : new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  const msg = `🚨 ตรวจพบแอลกอฮอล์\n` +
    `ชื่อ: ${name}\n` +
    `แผนก: ${dept}\n` +
    `สถานที่: ${location}\n` +
    `ค่า: ${value} mg%  (${level})\n` +
    `เวลา: ${time}`;

  const results: string[] = [];

  // — LINE Notify —
  if (LINE_TOKEN) {
    try {
      const r = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LINE_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ message: '\n' + msg })
      });
      results.push(`LINE: ${r.status}`);
    } catch (e) {
      results.push(`LINE error: ${e}`);
    }
  }

  // — Email via Resend —
  if (RESEND_KEY && EMAIL_TO) {
    const to = EMAIL_TO.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'alerts@alcohol-test.local',
          to,
          subject: `🚨 ตรวจพบแอลกอฮอล์ — ${name} (${value} mg%)`,
          text: msg
        })
      });
      results.push(`Email: ${r.status}`);
    } catch (e) {
      results.push(`Email error: ${e}`);
    }
  }

  if (!LINE_TOKEN && !RESEND_KEY) {
    results.push('No alert channels configured — set LINE_NOTIFY_TOKEN or RESEND_API_KEY env vars');
  }

  return new Response(results.join('\n'), { status: 200 });
});
