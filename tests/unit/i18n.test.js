import { describe, it, expect } from 'vitest';
import { t, I18N_SAMPLE } from './helpers.js';

describe('t() — i18n lookup', () => {
  it('returns Thai string for lang=th', () => {
    expect(t('submit', 'th')).toBe('ส่งข้อมูล');
  });

  it('returns English string for lang=en', () => {
    expect(t('submit', 'en')).toBe('Submit');
  });

  it('returns Myanmar string for lang=my', () => {
    expect(t('submit', 'my')).toBe('တင်ပြရန်');
  });

  it('returns Khmer string for lang=km', () => {
    expect(t('submit', 'km')).toBe('ដាក់ស្នើ');
  });

  it('falls back to Thai when lang is unknown', () => {
    expect(t('submit', 'fr')).toBe('ส่งข้อมูล');
  });

  it('falls back to Thai when lang is null', () => {
    expect(t('submit', null)).toBe('ส่งข้อมูล');
  });

  it('returns the key itself when key is missing from all languages', () => {
    expect(t('nonexistent_key', 'en')).toBe('nonexistent_key');
  });

  it('gps_too_far contains {m} placeholder (raw — caller replaces)', () => {
    const s = t('gps_too_far', 'en');
    expect(s).toContain('{m}');
  });

  it('gps_too_far {m} replacement pattern works', () => {
    const raw = t('gps_too_far', 'en');
    expect(raw.replace('{m}', '250')).toContain('250');
    expect(raw.replace('{m}', '250')).not.toContain('{m}');
  });

  it('gps_too_far is translated for all 4 languages', () => {
    for (const lang of ['th', 'en', 'my', 'km']) {
      const s = t('gps_too_far', lang);
      expect(s).toContain('{m}');
      expect(s).not.toBe('gps_too_far'); // not a missing-key fallback
    }
  });
});
