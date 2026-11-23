import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/index.js';

describe('readNight on runs/2026-10-28', () => {
  const night = readNight('runs', '2026-10-28');

  it('has 5 jobs sorted by job and counts the bad line', () => {
    expect(night?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(night?.badLines).toBe(1);
  });

  it('keeps a null owner and aggregates retries', () => {
    const rows = night?.rows ?? [];
    expect(rows.find((r) => r.job === 'digest/render')?.owner).toBeNull();
    expect(rows.find((r) => r.job === 'fixtures/refresh')).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(rows.find((r) => r.job === 'notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '2000-01-01')).toBeNull();
  });
});
