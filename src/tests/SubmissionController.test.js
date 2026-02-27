/**
 * SubmissionController.test.js
 *
 * Tests for createSubmissionController factory.
 * All external dependencies are injected as mocks so the pure logic is
 * tested without DOM side-effects or real storage.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSubmissionController } from '../core/SubmissionController.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSnapshot() {
  return {
    fullName:         'Ananya Sharma',
    email:            'ananya@example.com',
    phone:            '9876543210',
    dateOfBirth:      '2000-06-15',
    aadhaar:          '123456789012',
    qualification:    'bachelors',
    graduationYear:   '2022',
    percentageOrCgpa: '75',
    score:            '80',
    interviewStatus:  'cleared',
    offerLetterSent:  'true',
    gradingMode:      'percentage',
  };
}

/** Builds an all-valid meta object with optional per-field overrides. */
function makeMeta(overrides = {}) {
  const clean = {
    strictValid:        true,
    strictErrorMessage: '',
    softValid:          true,
    softViolation:      '',
    exceptionRequested: false,
    rationale:          '',
    rationaleValid:     false,
    rationaleKeywords:  [],
    rationaleMinLength: 30,
  };
  const base = Object.fromEntries(
    Object.keys(makeSnapshot()).map((k) => [k, { ...clean }])
  );
  return { ...base, ...overrides };
}

/** Builds a meta entry for a field with an active, valid exception. */
function exceptionMeta(rationale = 'approved by the board of governance', keywords = ['approved by']) {
  return {
    strictValid:        true,
    strictErrorMessage: '',
    softValid:          false,
    softViolation:      'Below threshold',
    exceptionRequested: true,
    rationale,
    rationaleValid:     true,
    rationaleKeywords:  keywords,
    rationaleMinLength: 30,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SubmissionController', () => {
  let mockAuditService;
  let mockShowModal;
  let mockResetFn;
  let controller;

  beforeEach(() => {
    mockAuditService = {
      generateId: vi.fn(() => 'audit-001'),
      nextId:     vi.fn(() => 'AG-2026-0001'),
      addRecord:  vi.fn((r) => r),
    };
    mockShowModal = vi.fn();
    mockResetFn   = vi.fn();

    controller = createSubmissionController({
      auditService: mockAuditService,
      showModal:    mockShowModal,
      resetFn:      mockResetFn,
    });
  });

  // ── Return value ──────────────────────────────────────────────────────────

  describe('return value', () => {
    it('returns { success: true, error: null } on success', async () => {
      const result = await controller.submit(makeSnapshot(), makeMeta());
      expect(result).toEqual({ success: true, error: null });
    });
  });

  // ── Audit record structure ────────────────────────────────────────────────

  describe('audit record', () => {
    it('uses generateId() to set record.id', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      expect(mockAuditService.generateId).toHaveBeenCalledOnce();
      expect(mockAuditService.addRecord.mock.calls[0][0].id).toBe('audit-001');
    });

    it('record.timestamp is an ISO 8601 string', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      const { timestamp } = mockAuditService.addRecord.mock.calls[0][0];
      expect(typeof timestamp).toBe('string');
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('record.candidateSnapshot matches the snapshot values', async () => {
      const snap = makeSnapshot();
      await controller.submit(snap, makeMeta());
      expect(mockAuditService.addRecord.mock.calls[0][0].candidateSnapshot).toMatchObject(snap);
    });

    it('record.candidateSnapshot is a copy, not the original snapshot', async () => {
      const snap = makeSnapshot();
      await controller.submit(snap, makeMeta());
      expect(mockAuditService.addRecord.mock.calls[0][0].candidateSnapshot).not.toBe(snap);
    });

    it('validationSummary.exceptionCount is 0 when no exceptions are active', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      expect(mockAuditService.addRecord.mock.calls[0][0].validationSummary.exceptionCount).toBe(0);
    });

    it('exceptionCount counts only fields where exceptionRequested AND rationaleValid', async () => {
      const meta = makeMeta({
        score:            exceptionMeta('approved by dean of admissions'),
        percentageOrCgpa: exceptionMeta('special case — international transcript'),
      });
      await controller.submit(makeSnapshot(), meta);
      expect(mockAuditService.addRecord.mock.calls[0][0].validationSummary.exceptionCount).toBe(2);
    });

    it('a requested but invalid rationale does NOT count as an exception', async () => {
      const meta = makeMeta({
        score: {
          ...exceptionMeta(),
          rationaleValid: false, // not yet valid
        },
      });
      await controller.submit(makeSnapshot(), meta);
      expect(mockAuditService.addRecord.mock.calls[0][0].validationSummary.exceptionCount).toBe(0);
    });

    it('exceptions array contains entries for each active exception field', async () => {
      const meta = makeMeta({
        score: exceptionMeta('approved by committee member', ['approved by']),
      });
      await controller.submit(makeSnapshot(), meta);
      const { exceptions } = mockAuditService.addRecord.mock.calls[0][0];
      expect(exceptions).toHaveLength(1);
      expect(exceptions[0].field).toBe('score');
      expect(exceptions[0].rationale).toBe('approved by committee member');
    });

    it('exceptions[].keywordsMatched lists keywords present in the rationale', async () => {
      const meta = makeMeta({
        score: exceptionMeta('approved by director of admissions', ['approved by', 'director']),
      });
      await controller.submit(makeSnapshot(), meta);
      const { keywordsMatched } = mockAuditService.addRecord.mock.calls[0][0].exceptions[0];
      expect(keywordsMatched).toContain('approved by');
      expect(keywordsMatched).toContain('director');
    });

    it('validationSummary.flagged is false when exceptionCount is 0', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      expect(mockAuditService.addRecord.mock.calls[0][0].validationSummary.flagged).toBe(false);
    });

    it('validationSummary.flagged is false when exceptionCount is exactly 2', async () => {
      const meta = makeMeta({
        score:            exceptionMeta('approved by dean one'),
        percentageOrCgpa: exceptionMeta('approved by dean two'),
      });
      await controller.submit(makeSnapshot(), meta);
      expect(mockAuditService.addRecord.mock.calls[0][0].validationSummary.flagged).toBe(false);
    });

    it('validationSummary.flagged is true when exceptionCount exceeds 2', async () => {
      const meta = makeMeta({
        score:            exceptionMeta('approved by director'),
        percentageOrCgpa: exceptionMeta('approved by board'),
        graduationYear:   exceptionMeta('approved by committee'),
      });
      await controller.submit(makeSnapshot(), meta);
      expect(mockAuditService.addRecord.mock.calls[0][0].validationSummary.flagged).toBe(true);
    });

    it('validationSummary.strictPassed is true when all meta fields are strictValid=true', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      expect(mockAuditService.addRecord.mock.calls[0][0].validationSummary.strictPassed).toBe(true);
    });

    it('validationSummary.strictPassed is false when any field has strictValid !== true', async () => {
      const meta = makeMeta({
        email: { ...makeMeta().email, strictValid: false },
      });
      await controller.submit(makeSnapshot(), meta);
      expect(mockAuditService.addRecord.mock.calls[0][0].validationSummary.strictPassed).toBe(false);
    });

    it('validationSummary.eligibilityStatus is "Clean" when no exceptions', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      expect(mockAuditService.addRecord.mock.calls[0][0].validationSummary.eligibilityStatus).toBe('Clean');
    });

    it('validationSummary.eligibilityStatus is "With Exceptions" for 1-2 exceptions', async () => {
      const meta = makeMeta({ score: exceptionMeta('approved by director') });
      await controller.submit(makeSnapshot(), meta);
      expect(mockAuditService.addRecord.mock.calls[0][0].validationSummary.eligibilityStatus).toBe('With Exceptions');
    });

    it('validationSummary.eligibilityStatus is "Flagged" when exceptionCount > 2', async () => {
      const meta = makeMeta({
        score:            exceptionMeta('approved by director'),
        percentageOrCgpa: exceptionMeta('approved by board'),
        graduationYear:   exceptionMeta('approved by committee'),
      });
      await controller.submit(makeSnapshot(), meta);
      expect(mockAuditService.addRecord.mock.calls[0][0].validationSummary.eligibilityStatus).toBe('Flagged');
    });

    // ── Risk score ─────────────────────────────────────────────────────────

    it('riskScore is 0 for a clean submission with high screening score', async () => {
      await controller.submit(makeSnapshot(), makeMeta()); // snapshot.score = '80'
      expect(mockAuditService.addRecord.mock.calls[0][0].riskScore).toBe(0);
    });

    it('riskScore adds +20 per exception', async () => {
      const meta = makeMeta({ score: exceptionMeta('approved by director') });
      await controller.submit(makeSnapshot(), meta); // 1 exception × 20 = 20
      expect(mockAuditService.addRecord.mock.calls[0][0].riskScore).toBe(20);
    });

    it('riskScore adds +15 when screening score < 45', async () => {
      const lowSnap = { ...makeSnapshot(), score: '30' };
      await controller.submit(lowSnap, makeMeta());
      expect(mockAuditService.addRecord.mock.calls[0][0].riskScore).toBe(15);
    });

    it('riskScore is at least 51 when exceptionCount > 2 (auto High)', async () => {
      const meta = makeMeta({
        score:            exceptionMeta('approved by director'),
        percentageOrCgpa: exceptionMeta('approved by board'),
        graduationYear:   exceptionMeta('approved by committee'),
      });
      // 3 exceptions × 20 = 60; already >= 51
      await controller.submit(makeSnapshot(), meta);
      expect(mockAuditService.addRecord.mock.calls[0][0].riskScore).toBeGreaterThanOrEqual(51);
    });

    it('record.reviewed is false and record.reviewedAt is null', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      const rec = mockAuditService.addRecord.mock.calls[0][0];
      expect(rec.reviewed).toBe(false);
      expect(rec.reviewedAt).toBeNull();
    });
  });

  // ── Side effects ──────────────────────────────────────────────────────────

  describe('side effects', () => {
    it('calls auditService.addRecord() exactly once', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      expect(mockAuditService.addRecord).toHaveBeenCalledOnce();
    });

    it('calls showModal with the saved audit record', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      expect(mockShowModal).toHaveBeenCalledOnce();
      expect(mockShowModal.mock.calls[0][0].id).toBe('audit-001');
    });

    it('calls resetFn to clear the form state', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      expect(mockResetFn).toHaveBeenCalledOnce();
    });

    it('calls resetFn after saving the audit record', async () => {
      const callOrder = [];
      mockAuditService.addRecord.mockImplementation((r) => { callOrder.push('save'); return r; });
      mockResetFn.mockImplementation(() => callOrder.push('reset'));

      await controller.submit(makeSnapshot(), makeMeta());
      expect(callOrder.indexOf('save')).toBeLessThan(callOrder.indexOf('reset'));
    });
  });
});
