import { describe, it, expect } from 'vitest';
import { getShiftFromDate, SHIFTS } from './helpers.js';

function iso(h) {
  // 2026-05-20 at hour h UTC+7 → adjust: local Bangkok = UTC+7, but tests run in node UTC
  // We pin to UTC times directly to avoid tz flakiness
  return `2026-05-20T${String(h).padStart(2, '0')}:00:00`;
}

describe('getShiftFromDate()', () => {
  it('06:00 → morning shift', () => {
    expect(getShiftFromDate(iso(6))).toBe(SHIFTS[0]);
  });

  it('10:00 → morning shift', () => {
    expect(getShiftFromDate(iso(10))).toBe(SHIFTS[0]);
  });

  it('13:59 → morning shift (boundary)', () => {
    expect(getShiftFromDate('2026-05-20T13:59:59')).toBe(SHIFTS[0]);
  });

  it('14:00 → afternoon shift', () => {
    expect(getShiftFromDate(iso(14))).toBe(SHIFTS[1]);
  });

  it('18:00 → afternoon shift', () => {
    expect(getShiftFromDate(iso(18))).toBe(SHIFTS[1]);
  });

  it('21:59 → afternoon shift (boundary)', () => {
    expect(getShiftFromDate('2026-05-20T21:59:59')).toBe(SHIFTS[1]);
  });

  it('22:00 → night shift', () => {
    expect(getShiftFromDate(iso(22))).toBe(SHIFTS[2]);
  });

  it('00:00 → night shift', () => {
    expect(getShiftFromDate(iso(0))).toBe(SHIFTS[2]);
  });

  it('05:59 → night shift (boundary)', () => {
    expect(getShiftFromDate('2026-05-20T05:59:59')).toBe(SHIFTS[2]);
  });

  it('returned shift has expected id', () => {
    expect(getShiftFromDate(iso(9)).id).toBe('morning');
    expect(getShiftFromDate(iso(16)).id).toBe('afternoon');
    expect(getShiftFromDate(iso(23)).id).toBe('night');
  });
});
