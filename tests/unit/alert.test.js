import { describe, it, expect } from 'vitest';
import { buildAlertEmail } from './helpers.js';

const BASE_TEST = {
  full_name: 'สมชาย ใจดี',
  department: 'พนักงานขนส่ง (Transport)',
  company: 'บริษัท ทรานส์โลจิสติกส์ จำกัด',
  location_name: 'โรงงาน A ประตู 1',
  location_code: 'QR001',
  alcohol_value: 25,
  threshold_level: 'no-drive',
  created_at: '2026-05-20T09:30:00.000Z',
};

describe('buildAlertEmail()', () => {
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
  });

  describe('threshold level colours', () => {
    it('no-drive → red (#ef4444)', () => {
      const { html } = buildAlertEmail({ ...BASE_TEST, threshold_level: 'no-drive' });
      expect(html).toContain('#ef4444');
    });

    it('illegal → dark red (#7f1d1d)', () => {
      const { html } = buildAlertEmail({ ...BASE_TEST, threshold_level: 'illegal', alcohol_value: 55 });
      expect(html).toContain('#7f1d1d');
    });

    it('caution → amber (#f59e0b)', () => {
      const { html } = buildAlertEmail({ ...BASE_TEST, threshold_level: 'caution', alcohol_value: 10 });
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

    it('unknown threshold_level falls back to no-drive colour', () => {
      const { html } = buildAlertEmail({ ...BASE_TEST, threshold_level: 'unknown' });
      expect(html).toContain('#ef4444');
    });

    it('value 0 still renders (edge: should not normally trigger alert)', () => {
      const { subject } = buildAlertEmail({ ...BASE_TEST, alcohol_value: 0 });
      expect(subject).toContain('0 mg%');
    });
  });
});
