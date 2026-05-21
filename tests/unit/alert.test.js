import { describe, it, expect } from 'vitest';
import { buildAlertEmail } from './helpers.js';

// `level` is the actual DB column name (pass|caution|no-drive|illegal)
const BASE_TEST = {
  full_name: 'สมชาย ใจดี',
  department: 'พนักงานขนส่ง (Transport)',
  company: 'บริษัท ทรานส์โลจิสติกส์ จำกัด',
  location_name: 'โรงงาน A ประตู 1',
  location_code: 'QR001',
  alcohol_value: 25,
  level: 'no-drive',
  created_at: '2026-05-20T09:30:00.000Z',
};

const FIRST_TEST = {
  full_name: 'สมชาย ใจดี',
  department: 'พนักงานขนส่ง (Transport)',
  company: 'บริษัท ทรานส์โลจิสติกส์ จำกัด',
  location_name: 'โรงงาน A ประตู 1',
  location_code: 'QR001',
  alcohol_value: 30,
  level: 'no-drive',
  created_at: '2026-05-20T09:00:00.000Z',
};

describe('buildAlertEmail() — single test', () => {
  describe('subject', () => {
    it('contains employee name', () => {
      const { subject } = buildAlertEmail(BASE_TEST);
      expect(subject).toContain('สมชาย ใจดี');
    });

    it('contains alcohol value with mg% unit', () => {
      const { subject } = buildAlertEmail(BASE_TEST);
      expect(subject).toContain('25 mg%');
    });

    it('starts with 🚨 warning emoji', () => {
      const { subject } = buildAlertEmail(BASE_TEST);
      expect(subject).toMatch(/^🚨/);
    });
  });

  describe('html body', () => {
    it('contains employee name in body', () => {
      const { html } = buildAlertEmail(BASE_TEST);
      expect(html).toContain('สมชาย ใจดี');
    });

    it('contains alcohol value in body', () => {
      const { html } = buildAlertEmail(BASE_TEST);
      expect(html).toContain('25 mg%');
    });

    it('contains location code', () => {
      const { html } = buildAlertEmail(BASE_TEST);
      expect(html).toContain('QR001');
    });

    it('contains location name', () => {
      const { html } = buildAlertEmail(BASE_TEST);
      expect(html).toContain('โรงงาน A ประตู 1');
    });

    it('contains company name', () => {
      const { html } = buildAlertEmail(BASE_TEST);
      expect(html).toContain('บริษัท ทรานส์โลจิสติกส์ จำกัด');
    });

    it('contains department', () => {
      const { html } = buildAlertEmail(BASE_TEST);
      expect(html).toContain('พนักงานขนส่ง (Transport)');
    });

    it('is valid HTML (has <html> and </html>)', () => {
      const { html } = buildAlertEmail(BASE_TEST);
      expect(html).toMatch(/<html/);
      expect(html).toMatch(/<\/html>/);
    });

    it('does NOT show "ครั้งที่ 1 / Test 1" section when no firstTest', () => {
      const { html } = buildAlertEmail(BASE_TEST);
      expect(html).not.toContain('ครั้งที่ 1');
    });
  });

  describe('level colours (using DB column name `level`)', () => {
    it('no-drive → red (#ef4444)', () => {
      const { html } = buildAlertEmail({ ...BASE_TEST, level: 'no-drive' });
      expect(html).toContain('#ef4444');
    });

    it('illegal → dark red (#7f1d1d)', () => {
      const { html } = buildAlertEmail({ ...BASE_TEST, level: 'illegal', alcohol_value: 55 });
      expect(html).toContain('#7f1d1d');
    });

    it('caution → amber (#f59e0b)', () => {
      const { html } = buildAlertEmail({ ...BASE_TEST, level: 'caution', alcohol_value: 10 });
      expect(html).toContain('#f59e0b');
    });
  });

  describe('XSS safety', () => {
    it('escapes < > in name', () => {
      const { html } = buildAlertEmail({ ...BASE_TEST, full_name: '<script>alert(1)</script>' });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('escapes & in company name', () => {
      const { html } = buildAlertEmail({ ...BASE_TEST, company: 'A & B Co.' });
      expect(html).toContain('A &amp; B Co.');
      expect(html).not.toMatch(/A & B/);
    });
  });

  describe('edge cases', () => {
    it('handles missing created_at gracefully', () => {
      const { subject, html } = buildAlertEmail({ ...BASE_TEST, created_at: undefined });
      expect(subject).toBeTruthy();
      expect(html).toBeTruthy();
    });

    it('unknown level falls back to no-drive colour', () => {
      const { html } = buildAlertEmail({ ...BASE_TEST, level: 'unknown' });
      expect(html).toContain('#ef4444');
    });

    it('value 0 still renders', () => {
      const { subject } = buildAlertEmail({ ...BASE_TEST, alcohol_value: 0 });
      expect(subject).toContain('0 mg%');
    });
  });
});

describe('buildAlertEmail() — retest (two tests)', () => {
  describe('subject', () => {
    it('contains employee name', () => {
      const { subject } = buildAlertEmail(BASE_TEST, FIRST_TEST);
      expect(subject).toContain('สมชาย ใจดี');
    });

    it('indicates retest (ตรวจซ้ำ) in subject', () => {
      const { subject } = buildAlertEmail(BASE_TEST, FIRST_TEST);
      expect(subject).toMatch(/ตรวจซ้ำ|Retest|retest/i);
    });

    it('shows retest value (not first-test value) in subject', () => {
      const { subject } = buildAlertEmail(BASE_TEST, FIRST_TEST);
      // retest value is 25, first test was 30
      expect(subject).toContain('25 mg%');
    });
  });

  describe('html body — two-test layout', () => {
    it('shows "ครั้งที่ 1 / Test 1" section', () => {
      const { html } = buildAlertEmail(BASE_TEST, FIRST_TEST);
      expect(html).toContain('ครั้งที่ 1');
    });

    it('shows "ครั้งที่ 2 / Test 2" section', () => {
      const { html } = buildAlertEmail(BASE_TEST, FIRST_TEST);
      expect(html).toContain('ครั้งที่ 2');
    });

    it('includes first test alcohol value (30 mg%)', () => {
      const { html } = buildAlertEmail(BASE_TEST, FIRST_TEST);
      expect(html).toContain('30 mg%');
    });

    it('includes retest alcohol value (25 mg%)', () => {
      const { html } = buildAlertEmail(BASE_TEST, FIRST_TEST);
      expect(html).toContain('25 mg%');
    });

    it('shows first test time', () => {
      const { html } = buildAlertEmail(BASE_TEST, FIRST_TEST);
      // 09:00 UTC = 16:00 Bangkok (UTC+7)
      expect(html).toContain('16:00');
    });

    it('shows retest time', () => {
      const { html } = buildAlertEmail(BASE_TEST, FIRST_TEST);
      // 09:30 UTC = 16:30 Bangkok (UTC+7)
      expect(html).toContain('16:30');
    });

    it('is valid HTML', () => {
      const { html } = buildAlertEmail(BASE_TEST, FIRST_TEST);
      expect(html).toMatch(/<html/);
      expect(html).toMatch(/<\/html>/);
    });

    it('XSS-safe for first test name', () => {
      const { html } = buildAlertEmail(
        BASE_TEST,
        { ...FIRST_TEST, full_name: '<b>bad</b>' }
      );
      expect(html).not.toContain('<b>bad</b>');
      expect(html).toContain('&lt;b&gt;bad&lt;/b&gt;');
    });
  });
});
