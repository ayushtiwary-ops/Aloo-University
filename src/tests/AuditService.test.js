/**
 * AuditService.test.js
 *
 * Tests for createAuditService factory:
 *   generateId()  — unique, non-empty string IDs
 *   save(record)  — persists to localStorage, rejects duplicates
 *   getAll()      — returns persisted records; safe on corrupt data
 *   clear()       — removes all records from localStorage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAuditService } from '../core/AuditService.js';

const STORAGE_KEY = 'aloo_admitguard_audit_log';

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

  // ── save ────────────────────────────────────────────────────────────────

  describe('save(record)', () => {
    it('persists the record to localStorage', () => {
      const record = { id: 'r1', timestamp: '2026-01-01T00:00:00.000Z', candidateName: 'Ananya' };
      service.save(record);

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const stored = JSON.parse(raw);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject(record);
    });

    it('returns the saved record', () => {
      const record = { id: 'r1', candidateName: 'Ravi' };
      const result = service.save(record);
      expect(result).toMatchObject(record);
    });

    it('accumulates multiple records in insertion order', () => {
      service.save({ id: 'r1', candidateName: 'Ananya' });
      service.save({ id: 'r2', candidateName: 'Ravi' });
      service.save({ id: 'r3', candidateName: 'Priya' });

      const all = service.getAll();
      expect(all).toHaveLength(3);
      expect(all[0].candidateName).toBe('Ananya');
      expect(all[1].candidateName).toBe('Ravi');
      expect(all[2].candidateName).toBe('Priya');
    });

    it('silently ignores a record with a duplicate id', () => {
      service.save({ id: 'dup', candidateName: 'Ananya' });
      service.save({ id: 'dup', candidateName: 'Ravi' });

      const all = service.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].candidateName).toBe('Ananya');
    });

    it('starts fresh when pre-existing localStorage data is corrupted', () => {
      localStorage.setItem(STORAGE_KEY, 'corrupted{{{');
      expect(() => service.save({ id: 'r1', candidateName: 'Test' })).not.toThrow();
      expect(service.getAll()).toHaveLength(1);
    });

    it('does not throw when called with a minimal object', () => {
      expect(() => service.save({ id: 'minimal' })).not.toThrow();
    });
  });

  // ── clear ───────────────────────────────────────────────────────────────

  describe('clear()', () => {
    it('removes all records', () => {
      service.save({ id: 'r1', candidateName: 'Ananya' });
      service.save({ id: 'r2', candidateName: 'Ravi' });
      service.clear();
      expect(service.getAll()).toEqual([]);
    });

    it('removes the localStorage key entirely', () => {
      service.save({ id: 'r1' });
      service.clear();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not throw when called with an already-empty log', () => {
      expect(() => service.clear()).not.toThrow();
    });
  });

  // ── data isolation ───────────────────────────────────────────────────────

  describe('data isolation', () => {
    it('getAll() returns a new array reference on each call', () => {
      service.save({ id: 'r1' });
      const a = service.getAll();
      const b = service.getAll();
      expect(a).not.toBe(b);
    });

    it('mutating the array returned by getAll() does not corrupt stored records', () => {
      service.save({ id: 'r1', candidateName: 'Ananya' });
      const arr = service.getAll();
      arr.push({ id: 'injected' });
      expect(service.getAll()).toHaveLength(1);
    });

    it('mutating a record object from getAll() does not affect stored data', () => {
      service.save({ id: 'r1', candidateName: 'Ananya' });
      const [rec] = service.getAll();
      rec.candidateName = 'Tampered';
      expect(service.getAll()[0].candidateName).toBe('Ananya');
    });
  });

  // ── persistence across instances ────────────────────────────────────────

  describe('cross-instance persistence', () => {
    it('a new service instance reads records saved by a previous instance', () => {
      service.save({ id: 'r1', candidateName: 'Ananya' });

      const service2 = createAuditService();
      expect(service2.getAll()).toHaveLength(1);
      expect(service2.getAll()[0].candidateName).toBe('Ananya');
    });

    it('clear() called on one instance is visible to another instance', () => {
      service.save({ id: 'r1' });
      const service2 = createAuditService();
      service2.clear();
      expect(service.getAll()).toEqual([]);
    });
  });
});
