/**
 * AuditService.test.js
 *
 * Tests for createAuditService factory:
 *   generateId()           — unique, non-empty string IDs
 *   addRecord(record)      — persists to localStorage, rejects duplicates
 *   getAll()               — returns persisted records; safe on corrupt data
 *   clearAll()             — removes all records from localStorage
 *   filterByStatus(status) — filters by eligibilityStatus or risk level
 *   computeAnalytics()     — aggregate compliance metrics
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAuditService } from '../core/AuditService.js';

const STORAGE_KEY = 'admitguard_audit_log_v1';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeRecord(overrides = {}) {
  return {
    id:        overrides.id        ?? 'rec-' + Math.random().toString(36).slice(2),
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    candidateSnapshot: overrides.candidateSnapshot ?? { fullName: 'Test Candidate', email: 'test@example.com' },
    validationSummary: {
      strictPassed:      true,
      softViolations:    0,
      exceptionCount:    0,
      flagged:           false,
      eligibilityStatus: 'Clean',
      ...(overrides.validationSummary ?? {}),
    },
    exceptions:  overrides.exceptions  ?? [],
    riskScore:   overrides.riskScore   ?? 0,
    reviewed:    false,
    reviewedAt:  null,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AuditService', () => {
  let service;

  beforeEach(() => {
    localStorage.clear();
    service = createAuditService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── generateId ──────────────────────────────────────────────────────────

  describe('generateId()', () => {
    it('returns a non-empty string', () => {
      const id = service.generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('returns a different value on each call', () => {
      const ids = new Set(Array.from({ length: 30 }, () => service.generateId()));
      expect(ids.size).toBe(30);
    });
  });

  // ── getAll — empty / corrupted state ────────────────────────────────────

  describe('getAll() — empty or invalid state', () => {
    it('returns [] when no records have been saved', () => {
      expect(service.getAll()).toEqual([]);
    });

    it('returns [] when the localStorage key is absent', () => {
      localStorage.removeItem(STORAGE_KEY);
      expect(service.getAll()).toEqual([]);
    });

    it('returns [] when localStorage contains invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'not-valid{{json');
      expect(service.getAll()).toEqual([]);
    });

    it('returns [] when localStorage contains a non-array JSON value', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
      expect(service.getAll()).toEqual([]);
    });

    it('returns [] when localStorage contains a JSON null', () => {
      localStorage.setItem(STORAGE_KEY, 'null');
      expect(service.getAll()).toEqual([]);
    });
  });

  // ── addRecord ────────────────────────────────────────────────────────────

  describe('addRecord(record)', () => {
    it('persists the record to localStorage', () => {
      const record = makeRecord({ id: 'r1' });
      service.addRecord(record);

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const stored = JSON.parse(raw);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('r1');
    });

    it('returns the saved record', () => {
      const record = makeRecord({ id: 'r1' });
      const result = service.addRecord(record);
      expect(result).toMatchObject({ id: 'r1' });
    });

    it('accumulates multiple records in insertion order', () => {
      service.addRecord(makeRecord({ id: 'r1', candidateSnapshot: { fullName: 'Ananya' } }));
      service.addRecord(makeRecord({ id: 'r2', candidateSnapshot: { fullName: 'Ravi' } }));
      service.addRecord(makeRecord({ id: 'r3', candidateSnapshot: { fullName: 'Priya' } }));

      const all = service.getAll();
      expect(all).toHaveLength(3);
      expect(all[0].candidateSnapshot.fullName).toBe('Ananya');
      expect(all[1].candidateSnapshot.fullName).toBe('Ravi');
      expect(all[2].candidateSnapshot.fullName).toBe('Priya');
    });

    it('silently ignores a record with a duplicate id', () => {
      service.addRecord(makeRecord({ id: 'dup', candidateSnapshot: { fullName: 'Ananya' } }));
      service.addRecord(makeRecord({ id: 'dup', candidateSnapshot: { fullName: 'Ravi' } }));

      const all = service.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].candidateSnapshot.fullName).toBe('Ananya');
    });

    it('starts fresh when pre-existing localStorage data is corrupted', () => {
      localStorage.setItem(STORAGE_KEY, 'corrupted{{{');
      expect(() => service.addRecord(makeRecord({ id: 'r1' }))).not.toThrow();
      expect(service.getAll()).toHaveLength(1);
    });

    it('does not throw when called with a minimal object', () => {
      expect(() => service.addRecord({ id: 'minimal' })).not.toThrow();
    });
  });

  // ── clearAll ────────────────────────────────────────────────────────────

  describe('clearAll()', () => {
    it('removes all records', () => {
      service.addRecord(makeRecord({ id: 'r1' }));
      service.addRecord(makeRecord({ id: 'r2' }));
      service.clearAll();
      expect(service.getAll()).toEqual([]);
    });

    it('removes the localStorage key entirely', () => {
      service.addRecord(makeRecord({ id: 'r1' }));
      service.clearAll();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not throw when called with an already-empty log', () => {
      expect(() => service.clearAll()).not.toThrow();
    });
  });

  // ── filterByStatus ───────────────────────────────────────────────────────

  describe('filterByStatus(status)', () => {
    beforeEach(() => {
      service.addRecord(makeRecord({ id: 'clean-1',
        validationSummary: { eligibilityStatus: 'Clean', exceptionCount: 0, flagged: false, strictPassed: true, softViolations: 0 },
        riskScore: 0,
      }));
      service.addRecord(makeRecord({ id: 'exc-1',
        validationSummary: { eligibilityStatus: 'With Exceptions', exceptionCount: 1, flagged: false, strictPassed: true, softViolations: 1 },
        riskScore: 20,
      }));
      service.addRecord(makeRecord({ id: 'exc-2',
        validationSummary: { eligibilityStatus: 'With Exceptions', exceptionCount: 2, flagged: false, strictPassed: true, softViolations: 2 },
        riskScore: 40,
      }));
      service.addRecord(makeRecord({ id: 'flag-1',
        validationSummary: { eligibilityStatus: 'Flagged', exceptionCount: 3, flagged: true, strictPassed: true, softViolations: 3 },
        riskScore: 60,
      }));
    });

    it('returns all records when status is "All"', () => {
      expect(service.filterByStatus('All')).toHaveLength(4);
    });

    it('returns all records when status is null', () => {
      expect(service.filterByStatus(null)).toHaveLength(4);
    });

    it('returns only Clean records when status is "Clean"', () => {
      const result = service.filterByStatus('Clean');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('clean-1');
    });

    it('returns only With Exceptions records when status is "With Exceptions"', () => {
      const result = service.filterByStatus('With Exceptions');
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.validationSummary.eligibilityStatus === 'With Exceptions')).toBe(true);
    });

    it('returns only Flagged records when status is "Flagged"', () => {
      const result = service.filterByStatus('Flagged');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('flag-1');
    });

    it('returns records with riskScore > 50 when status is "High Risk"', () => {
      const result = service.filterByStatus('High Risk');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('flag-1');
    });

    it('returns an empty array when no records match the status', () => {
      service.clearAll();
      service.addRecord(makeRecord({ id: 'c1', validationSummary: { eligibilityStatus: 'Clean', exceptionCount: 0, flagged: false, strictPassed: true, softViolations: 0 }, riskScore: 0 }));
      expect(service.filterByStatus('Flagged')).toHaveLength(0);
    });
  });

  // ── computeAnalytics ────────────────────────────────────────────────────

  describe('computeAnalytics()', () => {
    it('returns zero counts when no records exist', () => {
      const a = service.computeAnalytics();
      expect(a.total).toBe(0);
      expect(a.cleanCount).toBe(0);
      expect(a.exceptionCount).toBe(0);
      expect(a.flaggedCount).toBe(0);
      expect(a.avgExceptions).toBe(0);
      expect(a.riskDistribution).toEqual({ low: 0, medium: 0, high: 0 });
    });

    it('counts Clean, With Exceptions, and Flagged records correctly', () => {
      service.addRecord(makeRecord({ id: 'c1', validationSummary: { eligibilityStatus: 'Clean', exceptionCount: 0, flagged: false, strictPassed: true, softViolations: 0 }, riskScore: 0 }));
      service.addRecord(makeRecord({ id: 'e1', validationSummary: { eligibilityStatus: 'With Exceptions', exceptionCount: 1, flagged: false, strictPassed: true, softViolations: 1 }, riskScore: 20 }));
      service.addRecord(makeRecord({ id: 'f1', validationSummary: { eligibilityStatus: 'Flagged', exceptionCount: 3, flagged: true, strictPassed: true, softViolations: 3 }, riskScore: 60 }));

      const a = service.computeAnalytics();
      expect(a.total).toBe(3);
      expect(a.cleanCount).toBe(1);
      expect(a.exceptionCount).toBe(1);   // "With Exceptions" count
      expect(a.flaggedCount).toBe(1);
    });

    it('computes avgExceptions to 1 decimal place', () => {
      service.addRecord(makeRecord({ id: 'r1', validationSummary: { eligibilityStatus: 'With Exceptions', exceptionCount: 1, flagged: false, strictPassed: true, softViolations: 1 }, riskScore: 20 }));
      service.addRecord(makeRecord({ id: 'r2', validationSummary: { eligibilityStatus: 'With Exceptions', exceptionCount: 2, flagged: false, strictPassed: true, softViolations: 2 }, riskScore: 40 }));

      const a = service.computeAnalytics();
      expect(a.avgExceptions).toBe(1.5);
    });

    it('reports riskDistribution correctly', () => {
      // Low: score 0-20, Medium: 21-50, High: 51+
      service.addRecord(makeRecord({ id: 'low',  riskScore: 0,  validationSummary: { eligibilityStatus: 'Clean', exceptionCount: 0, flagged: false, strictPassed: true, softViolations: 0 } }));
      service.addRecord(makeRecord({ id: 'med',  riskScore: 35, validationSummary: { eligibilityStatus: 'With Exceptions', exceptionCount: 1, flagged: false, strictPassed: true, softViolations: 1 } }));
      service.addRecord(makeRecord({ id: 'high', riskScore: 60, validationSummary: { eligibilityStatus: 'Flagged', exceptionCount: 3, flagged: true, strictPassed: true, softViolations: 3 } }));

      const a = service.computeAnalytics();
      expect(a.riskDistribution).toEqual({ low: 1, medium: 1, high: 1 });
    });

    it('boundary: riskScore 20 is Low, 21 is Medium, 50 is Medium, 51 is High', () => {
      service.addRecord(makeRecord({ id: 'r20', riskScore: 20, validationSummary: { eligibilityStatus: 'Clean', exceptionCount: 0, flagged: false, strictPassed: true, softViolations: 0 } }));
      service.addRecord(makeRecord({ id: 'r21', riskScore: 21, validationSummary: { eligibilityStatus: 'With Exceptions', exceptionCount: 1, flagged: false, strictPassed: true, softViolations: 1 } }));
      service.addRecord(makeRecord({ id: 'r50', riskScore: 50, validationSummary: { eligibilityStatus: 'With Exceptions', exceptionCount: 2, flagged: false, strictPassed: true, softViolations: 2 } }));
      service.addRecord(makeRecord({ id: 'r51', riskScore: 51, validationSummary: { eligibilityStatus: 'Flagged', exceptionCount: 3, flagged: true, strictPassed: true, softViolations: 3 } }));

      const a = service.computeAnalytics();
      expect(a.riskDistribution).toEqual({ low: 1, medium: 2, high: 1 });
    });
  });

  // ── data isolation ───────────────────────────────────────────────────────

  describe('data isolation', () => {
    it('getAll() returns a new array reference on each call', () => {
      service.addRecord(makeRecord({ id: 'r1' }));
      const a = service.getAll();
      const b = service.getAll();
      expect(a).not.toBe(b);
    });

    it('mutating the array returned by getAll() does not corrupt stored records', () => {
      service.addRecord(makeRecord({ id: 'r1' }));
      const arr = service.getAll();
      arr.push({ id: 'injected' });
      expect(service.getAll()).toHaveLength(1);
    });

    it('mutating a record object from getAll() does not affect stored data', () => {
      service.addRecord(makeRecord({ id: 'r1', candidateSnapshot: { fullName: 'Ananya' } }));
      const [rec] = service.getAll();
      rec.candidateSnapshot.fullName = 'Tampered';
      expect(service.getAll()[0].candidateSnapshot.fullName).toBe('Ananya');
    });
  });

  // ── persistence across instances ────────────────────────────────────────

  describe('cross-instance persistence', () => {
    it('a new service instance reads records saved by a previous instance', () => {
      service.addRecord(makeRecord({ id: 'r1', candidateSnapshot: { fullName: 'Ananya' } }));

      const service2 = createAuditService();
      expect(service2.getAll()).toHaveLength(1);
      expect(service2.getAll()[0].candidateSnapshot.fullName).toBe('Ananya');
    });

    it('clearAll() called on one instance is visible to another instance', () => {
      service.addRecord(makeRecord({ id: 'r1' }));
      const service2 = createAuditService();
      service2.clearAll();
      expect(service.getAll()).toEqual([]);
    });
  });
});
