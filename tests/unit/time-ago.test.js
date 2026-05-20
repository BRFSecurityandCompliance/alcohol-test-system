import { describe, it, expect } from 'vitest';
import { timeAgo } from './helpers.js';

const NOW = new Date('2026-05-20T12:00:00Z').getTime();

describe('timeAgo() — English', () => {
  it('< 60 s → "just now"', () => {
    expect(timeAgo(new Date(NOW - 30_000).toISOString(), NOW, 'en')).toBe('just now');
  });

  it('exactly 59 s → "just now"', () => {
    expect(timeAgo(new Date(NOW - 59_000).toISOString(), NOW, 'en')).toBe('just now');
  });

  it('1 min ago', () => {
    expect(timeAgo(new Date(NOW - 60_000).toISOString(), NOW, 'en')).toBe('1m ago');
  });

  it('59 min ago', () => {
    expect(timeAgo(new Date(NOW - 59 * 60_000).toISOString(), NOW, 'en')).toBe('59m ago');
  });

  it('1 hour ago', () => {
    expect(timeAgo(new Date(NOW - 3600_000).toISOString(), NOW, 'en')).toBe('1h ago');
  });

  it('23 hours ago', () => {
    expect(timeAgo(new Date(NOW - 23 * 3600_000).toISOString(), NOW, 'en')).toBe('23h ago');
  });

  it('1 day ago', () => {
    expect(timeAgo(new Date(NOW - 86400_000).toISOString(), NOW, 'en')).toBe('1d ago');
  });

  it('7 days ago', () => {
    expect(timeAgo(new Date(NOW - 7 * 86400_000).toISOString(), NOW, 'en')).toBe('7d ago');
  });
});

describe('timeAgo() — Thai', () => {
  it('< 60 s → เมื่อสักครู่', () => {
    expect(timeAgo(new Date(NOW - 10_000).toISOString(), NOW, 'th')).toBe('เมื่อสักครู่');
  });

  it('5 min ago', () => {
    expect(timeAgo(new Date(NOW - 5 * 60_000).toISOString(), NOW, 'th')).toBe('5 นาทีที่แล้ว');
  });

  it('2 hours ago', () => {
    expect(timeAgo(new Date(NOW - 2 * 3600_000).toISOString(), NOW, 'th')).toBe('2 ชั่วโมงที่แล้ว');
  });

  it('3 days ago', () => {
    expect(timeAgo(new Date(NOW - 3 * 86400_000).toISOString(), NOW, 'th')).toBe('3 วันที่แล้ว');
  });
});
