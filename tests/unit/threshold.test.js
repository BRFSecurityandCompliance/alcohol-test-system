import { describe, it, expect } from 'vitest';
import { getThresholdLevel } from './helpers.js';

describe('getThresholdLevel() — default department', () => {
  it('value 0 → pass', () => {
    expect(getThresholdLevel(0, 'default')).toMatchObject({ level: 'pass' });
  });

  it('value 1 → caution', () => {
    expect(getThresholdLevel(1, 'default')).toMatchObject({ level: 'caution' });
  });

  it('value 20 (boundary) → caution', () => {
    expect(getThresholdLevel(20, 'default')).toMatchObject({ level: 'caution' });
  });

  it('value 21 → no-drive', () => {
    expect(getThresholdLevel(21, 'default')).toMatchObject({ level: 'no-drive' });
  });

  it('value 50 (boundary) → no-drive', () => {
    expect(getThresholdLevel(50, 'default')).toMatchObject({ level: 'no-drive' });
  });

  it('value 51 → illegal', () => {
    expect(getThresholdLevel(51, 'default')).toMatchObject({ level: 'illegal' });
  });

  it('very high value → illegal', () => {
    expect(getThresholdLevel(999, 'default')).toMatchObject({ level: 'illegal' });
  });
});

describe('getThresholdLevel() — Transport (zero tolerance)', () => {
  const dept = 'พนักงานขนส่ง (Transport)';

  it('value 0 → pass', () => {
    expect(getThresholdLevel(0, dept)).toMatchObject({ level: 'pass' });
  });

  it('value 1 → no-drive (zero tolerance)', () => {
    expect(getThresholdLevel(1, dept)).toMatchObject({ level: 'no-drive' });
  });

  it('value 20 (boundary) → no-drive', () => {
    expect(getThresholdLevel(20, dept)).toMatchObject({ level: 'no-drive' });
  });

  it('value 21 → illegal', () => {
    expect(getThresholdLevel(21, dept)).toMatchObject({ level: 'illegal' });
  });
});

describe('getThresholdLevel() — Security', () => {
  const dept = 'พนักงานรักษาความปลอดภัย (Security)';

  it('value 0 → pass', () => {
    expect(getThresholdLevel(0, dept)).toMatchObject({ level: 'pass' });
  });

  it('value 20 → caution', () => {
    expect(getThresholdLevel(20, dept)).toMatchObject({ level: 'caution' });
  });

  it('value 21 → no-drive', () => {
    expect(getThresholdLevel(21, dept)).toMatchObject({ level: 'no-drive' });
  });
});

describe('getThresholdLevel() — unknown department falls back to default', () => {
  it('unknown dept, value 0 → pass', () => {
    expect(getThresholdLevel(0, 'unknown dept')).toMatchObject({ level: 'pass' });
  });

  it('unknown dept, value 51 → illegal', () => {
    expect(getThresholdLevel(51, 'unknown dept')).toMatchObject({ level: 'illegal' });
  });
});

describe('getThresholdLevel() — input coercion', () => {
  it('string "25" is coerced to number', () => {
    expect(getThresholdLevel('25', 'default')).toMatchObject({ level: 'no-drive' });
  });

  it('NaN/garbage → treated as 0 → pass', () => {
    expect(getThresholdLevel('abc', 'default')).toMatchObject({ level: 'pass' });
  });
});
