import { describe, it, expect } from 'vitest';
import { _sortTests, _buildIndices } from './helpers.js';

describe('_sortTests()', () => {
  it('sorts tests newest-first by created_at', () => {
    const db = {
      tests: [
        { id: 'a', created_at: '2026-05-18T10:00:00Z' },
        { id: 'c', created_at: '2026-05-20T10:00:00Z' },
        { id: 'b', created_at: '2026-05-19T10:00:00Z' },
      ],
    };
    _sortTests(db);
    expect(db.tests.map(t => t.id)).toEqual(['c', 'b', 'a']);
  });

  it('is a no-op when tests is already sorted', () => {
    const db = {
      tests: [
        { id: 'x', created_at: '2026-05-20T00:00:00Z' },
        { id: 'y', created_at: '2026-05-19T00:00:00Z' },
      ],
    };
    _sortTests(db);
    expect(db.tests.map(t => t.id)).toEqual(['x', 'y']);
  });

  it('handles empty tests array', () => {
    const db = { tests: [] };
    expect(() => _sortTests(db)).not.toThrow();
    expect(db.tests).toEqual([]);
  });

  it('does nothing when db is null', () => {
    expect(() => _sortTests(null)).not.toThrow();
  });

  it('does nothing when db.tests is not an array', () => {
    expect(() => _sortTests({ tests: undefined })).not.toThrow();
  });

  it('preserves single-element array', () => {
    const db = { tests: [{ id: 'only', created_at: '2026-01-01T00:00:00Z' }] };
    _sortTests(db);
    expect(db.tests[0].id).toBe('only');
  });
});

describe('_buildIndices()', () => {
  const db = {
    locations: [{ code: 'QR001', name: 'Gate A' }, { code: 'QR002', name: 'Gate B' }],
    users:     [{ username: 'admin', role: 'super' }],
    persons:   [{ employee_id: 'EMP001', full_name: 'สมชาย' }],
    watchlist: [{ full_name: 'สมชาย', note: 'watch' }],
  };

  it('builds locationByCode map', () => {
    const idx = _buildIndices(db);
    expect(idx.locationByCode.get('QR001')).toMatchObject({ name: 'Gate A' });
    expect(idx.locationByCode.get('QR002')).toMatchObject({ name: 'Gate B' });
    expect(idx.locationByCode.get('QR999')).toBeUndefined();
  });

  it('builds userByUsername map', () => {
    const idx = _buildIndices(db);
    expect(idx.userByUsername.get('admin')).toMatchObject({ role: 'super' });
  });

  it('builds personByEmpId map', () => {
    const idx = _buildIndices(db);
    expect(idx.personByEmpId.get('EMP001')).toMatchObject({ full_name: 'สมชาย' });
  });

  it('builds watchlistByName map', () => {
    const idx = _buildIndices(db);
    expect(idx.watchlistByName.get('สมชาย')).toMatchObject({ note: 'watch' });
  });

  it('handles missing collections gracefully', () => {
    const idx = _buildIndices({});
    expect(idx.locationByCode.size).toBe(0);
    expect(idx.personByEmpId.size).toBe(0);
  });
});
