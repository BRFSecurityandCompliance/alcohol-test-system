import { describe, it, expect } from 'vitest';
import { esc } from './helpers.js';

describe('esc()', () => {
  it('returns empty string for null', () => {
    expect(esc(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(esc(undefined)).toBe('');
  });

  it('passes through plain alphanumeric strings unchanged', () => {
    expect(esc('hello123')).toBe('hello123');
  });

  it('escapes ampersand', () => {
    expect(esc('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater-than', () => {
    expect(esc('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(esc('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes (XSS via onclick attr)', () => {
    expect(esc("O'Brien")).toBe('O&#39;Brien');
  });

  it('escapes all five special chars in one string', () => {
    expect(esc(`<div id="x" data-val='a&b'>`))
      .toBe('&lt;div id=&quot;x&quot; data-val=&#39;a&amp;b&#39;&gt;');
  });

  it('coerces numbers to string', () => {
    expect(esc(42)).toBe('42');
  });

  it('coerces boolean to string', () => {
    expect(esc(true)).toBe('true');
  });

  it('handles empty string', () => {
    expect(esc('')).toBe('');
  });
});
