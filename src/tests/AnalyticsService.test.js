/**
 * AnalyticsService.test.js
 *
 * Tests for createAnalyticsService factory.
 * Focuses on computeDashboardMetrics — the pure analytics computation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createAnalyticsService } from '../core/AnalyticsService.js';

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeRecord(overrides = {}) {
  return {
    id:             overrides.id             ?? 'rec-' + Math.random().toString(36).slice(2),
    timestamp:      overrides.timestamp      ?? new Date().toISOString(),
    exceptionCount: overrides.exceptionCount ?? 0,
    flagged:        overrides.flagged        ?? false,
    candidateData:  overrides.candidateData  ?? { fullName: 'Test Candidate' },
  };
}

describe('AnalyticsService', () => {
  let svc;

  beforeEach(() => {
    svc = createAnalyticsService();
  });

  // ── Empty state ──────────────────────────────────────────────────────────

  describe('computeDashboardMetrics([]) — empty records', () => {
    it('total is 0', () => {
      expect(svc.computeDashboardMetrics([]).total).toBe(0);
    });

    it('exceptionRate is 0', () => {
      expect(svc.computeDashboardMetrics([]).exceptionRate).toBe(0);
    });

    it('flaggedRate is 0', () => {
      expect(svc.computeDashboardMetrics([]).flaggedRate).toBe(0);
    });

    it('avgExceptions is 0', () => {
      expect(svc.computeDashboardMetrics([]).avgExceptions).toBe(0);
    });

    it('recentRecords is []', () => {
      expect(svc.computeDashboardMetrics([]).recentRecords).toEqual([]);
    });
  });

  // ── Single clean record ──────────────────────────────────────────────────

  describe('computeDashboardMetrics — single clean record', () => {
    it('total is 1', () => {
      expect(svc.computeDashboardMetrics([makeRecord()]).total).toBe(1);
    });

    it('exceptionRate is 0 when exceptionCount is 0', () => {
      expect(svc.computeDashboardMetrics([makeRecord({ exceptionCount: 0 })]).exceptionRate).toBe(0);
    });

    it('exceptionRate is 100 when exceptionCount > 0', () => {
      expect(svc.computeDashboardMetrics([makeRecord({ exceptionCount: 1 })]).exceptionRate).toBe(100);
    });

    it('flaggedRate is 0 when flagged is false', () => {
      expect(svc.computeDashboardMetrics([makeRecord({ flagged: false })]).flaggedRate).toBe(0);
    });

    it('flaggedRate is 100 when flagged is true', () => {
      expect(svc.computeDashboardMetrics([makeRecord({ flagged: true })]).flaggedRate).toBe(100);
    });

    it('avgExceptions equals the single record exception count', () => {
      expect(svc.computeDashboardMetrics([makeRecord({ exceptionCount: 2 })]).avgExceptions).toBe(2.0);
    });

    it('recentRecords contains the single record', () => {
      const rec = makeRecord({ id: 'only' });
      expect(svc.computeDashboardMetrics([rec]).recentRecords).toHaveLength(1);
      expect(svc.computeDashboardMetrics([rec]).recentRecords[0].id).toBe('only');
    });
  });

  // ── Mixed records — rates ────────────────────────────────────────────────

  describe('computeDashboardMetrics — mixed records', () => {
    // 4 records: 2 with exceptions, 1 flagged
    const records = [
      makeRecord({ id: 'r1', exceptionCount: 0, flagged: false }),
      makeRecord({ id: 'r2', exceptionCount: 1, flagged: false }),
      makeRecord({ id: 'r3', exceptionCount: 2, flagged: false }),
      makeRecord({ id: 'r4', exceptionCount: 3, flagged: true  }),
    ];

    it('total is 4', () => {
      expect(svc.computeDashboardMetrics(records).total).toBe(4);
    });

    it('exceptionRate is 75 (3 of 4 records have exceptions)', () => {
      expect(svc.computeDashboardMetrics(records).exceptionRate).toBe(75);
    });

    it('flaggedRate is 25 (1 of 4 records is flagged)', () => {
      expect(svc.computeDashboardMetrics(records).flaggedRate).toBe(25);
    });

    it('avgExceptions is 1.5 ((0+1+2+3)/4)', () => {
      expect(svc.computeDashboardMetrics(records).avgExceptions).toBe(1.5);
    });
  });

  // ── recentRecords ordering and capping ──────────────────────────────────

  describe('recentRecords', () => {
    it('returns at most 5 records', () => {
      const records = Array.from({ length: 8 }, (_, i) => makeRecord({ id: `r${i}` }));
      expect(svc.computeDashboardMetrics(records).recentRecords).toHaveLength(5);
    });

    it('returns the most recent records (last in input = first in output)', () => {
      const records = Array.from({ length: 7 }, (_, i) => makeRecord({ id: `r${i}` }));
      const recent = svc.computeDashboardMetrics(records).recentRecords;
      // Last 5 of input [r0..r6] reversed = [r6, r5, r4, r3, r2]
      expect(recent[0].id).toBe('r6');
      expect(recent[4].id).toBe('r2');
    });

    it('returns records in newest-first order (input order reversed)', () => {
      const records = [
        makeRecord({ id: 'older' }),
        makeRecord({ id: 'newest' }),
      ];
      const recent = svc.computeDashboardMetrics(records).recentRecords;
      expect(recent[0].id).toBe('newest');
      expect(recent[1].id).toBe('older');
    });
  });

  // ── Precision ────────────────────────────────────────────────────────────

  describe('precision', () => {
    it('exceptionRate rounds to nearest integer', () => {
      // 2 of 3 = 66.6... → 67
      const records = [
        makeRecord({ exceptionCount: 0 }),
        makeRecord({ exceptionCount: 1 }),
        makeRecord({ exceptionCount: 1 }),
      ];
      expect(svc.computeDashboardMetrics(records).exceptionRate).toBe(67);
    });

    it('avgExceptions is rounded to 1 decimal place', () => {
      // (1 + 2) / 3 = 1.000  (2 + 1 + 0) / 3 = 1.0
      const records = [
        makeRecord({ exceptionCount: 1 }),
        makeRecord({ exceptionCount: 2 }),
        makeRecord({ exceptionCount: 0 }),
      ];
      expect(svc.computeDashboardMetrics(records).avgExceptions).toBe(1.0);
    });

    it('avgExceptions: (1+3)/2 = 2.0', () => {
      const records = [
        makeRecord({ exceptionCount: 1 }),
        makeRecord({ exceptionCount: 3 }),
      ];
      expect(svc.computeDashboardMetrics(records).avgExceptions).toBe(2.0);
    });
  });

  // ── Defensive: missing fields ────────────────────────────────────────────

  describe('defensive handling of missing fields', () => {
    it('treats missing exceptionCount as 0', () => {
      const rec = { id: 'bare' };
      expect(svc.computeDashboardMetrics([rec]).exceptionRate).toBe(0);
      expect(svc.computeDashboardMetrics([rec]).avgExceptions).toBe(0);
    });

    it('treats missing flagged as false', () => {
      const rec = { id: 'bare' };
      expect(svc.computeDashboardMetrics([rec]).flaggedRate).toBe(0);
    });
  });

  // ── Memoisation ──────────────────────────────────────────────────────────

  describe('memoisation', () => {
    it('returns the same object reference for identical input fingerprint', () => {
      const records = [makeRecord({ id: 'stable-id' })];
      const a = svc.computeDashboardMetrics(records);
      const b = svc.computeDashboardMetrics(records);
      expect(a).toBe(b);
    });

    it('recomputes when record count changes', () => {
      const r1 = [makeRecord({ id: 'r1' })];
      const r2 = [makeRecord({ id: 'r1' }), makeRecord({ id: 'r2' })];
      const a = svc.computeDashboardMetrics(r1);
      const b = svc.computeDashboardMetrics(r2);
      expect(a).not.toBe(b);
      expect(b.total).toBe(2);
    });

    it('recomputes when the last record id changes', () => {
      const r1 = [makeRecord({ id: 'first' })];
      const r2 = [makeRecord({ id: 'second' })];
      const a = svc.computeDashboardMetrics(r1);
      const b = svc.computeDashboardMetrics(r2);
      expect(a).not.toBe(b);
    });

    it('different service instances have independent caches', () => {
      const svc2 = createAnalyticsService();
      const records = [makeRecord({ id: 'shared' })];
      const a = svc.computeDashboardMetrics(records);
      const b = svc2.computeDashboardMetrics(records);
      // Independently computed but structurally equal
      expect(a).not.toBe(b);
      expect(a.total).toBe(b.total);
    });
  });
});
