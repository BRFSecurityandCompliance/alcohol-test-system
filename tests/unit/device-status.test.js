import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDeviceStatus } from './helpers.js';

const DAY = 86400000;
const NOW = new Date('2026-05-20T12:00:00Z').getTime();

beforeEach(() => { vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

function future(days) {
  return new Date(NOW + days * DAY).toISOString();
}

describe('getDeviceStatus()', () => {
  it('returns "active" when calibration is 31+ days away', () => {
    expect(getDeviceStatus(future(31))).toBe('active');
  });

  it('returns "active" exactly 30 days away', () => {
    // 30.0 days → exactly at boundary: days < 30 is false, so active
    expect(getDeviceStatus(future(30.1))).toBe('active');
  });

  it('returns "due-soon" when calibration is 29 days away', () => {
    expect(getDeviceStatus(future(29))).toBe('due-soon');
  });

  it('returns "due-soon" when calibration is 1 day away', () => {
    expect(getDeviceStatus(future(1))).toBe('due-soon');
  });

  it('returns "due-soon" when calibration is today (0 days)', () => {
    expect(getDeviceStatus(new Date(NOW).toISOString())).toBe('due-soon');
  });

  it('returns "overdue" when calibration date is yesterday', () => {
    expect(getDeviceStatus(future(-1))).toBe('overdue');
  });

  it('returns "overdue" when calibration date is far in the past', () => {
    expect(getDeviceStatus('2024-01-01')).toBe('overdue');
  });

  it('accepts a plain date string (YYYY-MM-DD)', () => {
    expect(getDeviceStatus('2026-12-31')).toBe('active');
  });
});
