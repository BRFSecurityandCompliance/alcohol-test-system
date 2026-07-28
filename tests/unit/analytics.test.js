import { describe, it, expect } from 'vitest';
import {
  isoWeek, weekRange, parseWeekInput, periodRange,
  bucketTests, summarize, repeatOffenders,
} from './helpers.js';

// Dates are constructed with the local-time Date constructor and asserted in
// local-time terms, so these tests are timezone-independent.

describe('isoWeek()', () => {
  it('Jan 1 2026 (Thursday) is week 1 of 2026', () => {
    expect(isoWeek(new Date(2026, 0, 1))).toEqual({ year: 2026, week: 1 });
  });
  it('Dec 31 2026 (Thursday) is week 53 — 2026 is a 53-week year', () => {
    expect(isoWeek(new Date(2026, 11, 31))).toEqual({ year: 2026, week: 53 });
  });
  it('Jan 1 2027 (Friday) belongs to 2026-W53, not 2027', () => {
    expect(isoWeek(new Date(2027, 0, 1))).toEqual({ year: 2026, week: 53 });
  });
  it('Dec 30 2024 (Monday) belongs to 2025-W01', () => {
    expect(isoWeek(new Date(2024, 11, 30))).toEqual({ year: 2025, week: 1 });
  });
  it('Jan 1 2023 (Sunday) belongs to 2022-W52', () => {
    expect(isoWeek(new Date(2023, 0, 1))).toEqual({ year: 2022, week: 52 });
  });
});

describe('weekRange()', () => {
  it('week 1 of 2026 starts Monday Dec 29 2025 and ends Sunday Jan 4 2026', () => {
    const { start, end } = weekRange(2026, 1);
    expect([start.getFullYear(), start.getMonth(), start.getDate()]).toEqual([2025, 11, 29]);
    expect(start.getDay()).toBe(1);                                  // Monday
    expect([end.getFullYear(), end.getMonth(), end.getDate()]).toEqual([2026, 0, 4]);
    expect(end.getDay()).toBe(0);                                    // Sunday
    expect([end.getHours(), end.getMinutes(), end.getSeconds()]).toEqual([23, 59, 59]);
  });
  it('round-trips with isoWeek for every week of 2026', () => {
    for (let w = 1; w <= 53; w++) {
      const { start, end } = weekRange(2026, w);
      expect(isoWeek(start)).toEqual({ year: 2026, week: w });
      expect(isoWeek(end)).toEqual({ year: 2026, week: w });
    }
  });
});

describe('parseWeekInput()', () => {
  it('parses a native week value', () => {
    const r = parseWeekInput('2026-W32');
    expect(r.year).toBe(2026);
    expect(r.week).toBe(32);
    expect(r.label).toBe('2026-W32');
    expect(isoWeek(r.start)).toEqual({ year: 2026, week: 32 });
  });
  it('rejects malformed or out-of-range input', () => {
    expect(parseWeekInput('')).toBeNull();
    expect(parseWeekInput('nonsense')).toBeNull();
    expect(parseWeekInput('2026-W00')).toBeNull();
    expect(parseWeekInput('2026-W54')).toBeNull();
  });
});

describe('periodRange()', () => {
  const ref = new Date(2026, 5, 15, 10, 30, 0); // Mon Jun 15 2026, local

  it('today → the calendar day, previous day as comparison', () => {
    const p = periodRange('today', ref);
    expect([p.start.getMonth(), p.start.getDate(), p.start.getHours()]).toEqual([5, 15, 0]);
    expect([p.end.getMonth(), p.end.getDate(), p.end.getHours()]).toEqual([5, 15, 23]);
    expect([p.prevStart.getMonth(), p.prevStart.getDate()]).toEqual([5, 14]);
    expect([p.prevEnd.getMonth(), p.prevEnd.getDate()]).toEqual([5, 14]);
  });
  it('7d → 7-day window ending today, prior 7 days as comparison', () => {
    const p = periodRange('7d', ref);
    expect([p.start.getMonth(), p.start.getDate()]).toEqual([5, 9]);   // Jun 9
    expect([p.end.getMonth(), p.end.getDate()]).toEqual([5, 15]);      // Jun 15
    expect([p.prevStart.getMonth(), p.prevStart.getDate()]).toEqual([5, 2]);  // Jun 2
    expect([p.prevEnd.getMonth(), p.prevEnd.getDate()]).toEqual([5, 8]);      // Jun 8
  });
  it('month → calendar month, previous month as comparison', () => {
    const p = periodRange('month', ref);
    expect([p.start.getMonth(), p.start.getDate()]).toEqual([5, 1]);   // Jun 1
    expect([p.end.getMonth(), p.end.getDate()]).toEqual([5, 30]);      // Jun 30
    expect([p.prevStart.getMonth(), p.prevStart.getDate()]).toEqual([4, 1]);   // May 1
    expect([p.prevEnd.getMonth(), p.prevEnd.getDate()]).toEqual([4, 31]);      // May 31
  });
  it('week → contains ref; previous window is exactly 7 days earlier', () => {
    const p = periodRange('week', ref);
    expect(ref >= p.start && ref <= p.end).toBe(true);
    expect(Math.round((p.start - p.prevStart) / 86400000)).toBe(7);
    expect(Math.round((p.end - p.prevEnd) / 86400000)).toBe(7);
  });
  it('unknown preset falls back to month', () => {
    expect(periodRange('bogus', ref).preset).toBe('month');
  });
});

describe('bucketTests()', () => {
  const mk = (iso) => ({ created_at: iso });
  it('uses daily granularity for a ≤31-day span', () => {
    const start = new Date(2026, 5, 9, 0, 0, 0);
    const end = new Date(2026, 5, 15, 23, 59, 59, 999);
    const r = bucketTests([mk('2026-06-09T08:00'), mk('2026-06-15T20:00')], start, end);
    expect(r.gran).toBe('day');
    expect(r.buckets.length).toBe(7);
    expect(r.buckets[0].tests.length).toBe(1);
    expect(r.buckets[6].tests.length).toBe(1);
  });
  it('uses weekly granularity beyond 31 days', () => {
    const start = new Date(2026, 3, 1, 0, 0, 0);
    const end = new Date(2026, 5, 30, 23, 59, 59, 999);
    const r = bucketTests([], start, end);
    expect(r.gran).toBe('week');
    expect(r.buckets.every(b => b.start.getDay() === 1)).toBe(true); // all Mondays
  });
});

describe('summarize()', () => {
  const tests = [
    { is_zero: true,  level: 'pass',     alcohol_value: 0,  shift_id: 'morning' },
    { is_zero: false, level: 'caution',  alcohol_value: 15, shift_id: 'afternoon', retest_status: 'required' },
    { is_zero: false, level: 'no-drive', alcohol_value: 35, shift_id: 'night',    retest_status: 'completed' },
    { is_zero: false, level: 'illegal',  alcohol_value: 70, shift_id: 'night',    retest_status: 'failed' },
  ];
  it('tallies totals, severity, shift, retests and average', () => {
    const s = summarize(tests);
    expect(s.total).toBe(4);
    expect(s.zero).toBe(1);
    expect(s.positive).toBe(3);
    expect(s.passRate).toBe(25);
    expect(s.severity).toEqual({ pass: 1, caution: 1, 'no-drive': 1, illegal: 1 });
    expect(s.byShift).toEqual({ morning: 1, afternoon: 1, night: 2 });
    expect(s.retests).toEqual({ required: 1, completed: 1, failed: 1 });
    expect(s.avgValue).toBe(40); // (15+35+70)/3
  });
  it('handles an empty set without dividing by zero', () => {
    const s = summarize([]);
    expect(s.passRate).toBe(0);
    expect(s.avgValue).toBe(0);
  });
});

describe('repeatOffenders()', () => {
  const tests = [
    { employee_id: 'E1', full_name: 'A', is_zero: false, alcohol_value: 20, created_at: '2026-06-01T08:00' },
    { employee_id: 'E1', full_name: 'A', is_zero: false, alcohol_value: 45, created_at: '2026-06-05T08:00' },
    { employee_id: 'E2', full_name: 'B', is_zero: false, alcohol_value: 30, created_at: '2026-06-02T08:00' },
    { employee_id: 'E3', full_name: 'C', is_zero: true,  alcohol_value: 0,  created_at: '2026-06-03T08:00' },
  ];
  it('returns only people with ≥2 positives, worst first', () => {
    const r = repeatOffenders(tests, 2);
    expect(r.length).toBe(1);
    expect(r[0].employee_id).toBe('E1');
    expect(r[0].count).toBe(2);
    expect(r[0].maxValue).toBe(45);
    expect(r[0].lastAt).toBe('2026-06-05T08:00');
  });
  it('ignores zero results entirely', () => {
    const r = repeatOffenders(tests, 1);
    expect(r.find(o => o.employee_id === 'E3')).toBeUndefined();
  });
});
