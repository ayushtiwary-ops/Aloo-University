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
function exceptionMeta(rationale = 'approved by the board of governance') {
  return {
    strictValid:        true,
    strictErrorMessage: '',
    softValid:          false,
    softViolation:      'Below threshold',
    exceptionRequested: true,
    rationale,
    rationaleValid:     true,
    rationaleKeywords:  ['approved by'],
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
      save:       vi.fn((r) => r),
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
      expect(mockAuditService.save.mock.calls[0][0].id).toBe('audit-001');
    });

    it('record.timestamp is an ISO 8601 string', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      const { timestamp } = mockAuditService.save.mock.calls[0][0];
      expect(typeof timestamp).toBe('string');
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('record.candidateData matches the snapshot values', async () => {
      const snap = makeSnapshot();
      await controller.submit(snap, makeMeta());
      expect(mockAuditService.save.mock.calls[0][0].candidateData).toMatchObject(snap);
    });

    it('record.candidateData is a copy, not the original snapshot', async () => {
      const snap = makeSnapshot();
      await controller.submit(snap, makeMeta());
      expect(mockAuditService.save.mock.calls[0][0].candidateData).not.toBe(snap);
    });

    it('record.exceptionCount is 0 when no exceptions are active', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      expect(mockAuditService.save.mock.calls[0][0].exceptionCount).toBe(0);
    });

    it('exceptionCount counts only fields where exceptionRequested AND rationaleValid', async () => {
      const meta = makeMeta({
        score:            exceptionMeta('approved by dean of admissions'),
        percentageOrCgpa: exceptionMeta('special case — international transcript'),
      });
      await controller.submit(makeSnapshot(), meta);
      expect(mockAuditService.save.mock.calls[0][0].exceptionCount).toBe(2);
    });

    it('a requested but invalid rationale does NOT count as an exception', async () => {
      const meta = makeMeta({
        score: {
          ...exceptionMeta(),
          rationaleValid: false, // not yet valid
        },
      });
      await controller.submit(makeSnapshot(), meta);
      expect(mockAuditService.save.mock.calls[0][0].exceptionCount).toBe(0);
    });

    it('exceptionFields lists the fieldIds of active exceptions', async () => {
      const meta = makeMeta({
        score: exceptionMeta('approved by committee'),
      });
      await controller.submit(makeSnapshot(), meta);
      const { exceptionFields } = mockAuditService.save.mock.calls[0][0];
      expect(exceptionFields).toEqual(['score']);
    });

    it('rationaleMap keys match exceptionFields with their rationale text', async () => {
      const meta = makeMeta({
        score: exceptionMeta('approved by director, waiver form attached'),
      });
      await controller.submit(makeSnapshot(), meta);
      const { rationaleMap } = mockAuditService.save.mock.calls[0][0];
      expect(rationaleMap).toMatchObject({
        score: 'approved by director, waiver form attached',
      });
    });

    it('flagged is false when exceptionCount is 0', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      expect(mockAuditService.save.mock.calls[0][0].flagged).toBe(false);
    });

    it('flagged is false when exceptionCount is exactly 2', async () => {
      const meta = makeMeta({
        score:            exceptionMeta('approved by dean one'),
        percentageOrCgpa: exceptionMeta('approved by dean two'),
      });
      await controller.submit(makeSnapshot(), meta);
      expect(mockAuditService.save.mock.calls[0][0].flagged).toBe(false);
    });

    it('flagged is true when exceptionCount exceeds 2', async () => {
      const meta = makeMeta({
        score:            exceptionMeta('approved by director'),
        percentageOrCgpa: exceptionMeta('approved by board'),
        graduationYear:   exceptionMeta('approved by committee'),
      });
      await controller.submit(makeSnapshot(), meta);
      expect(mockAuditService.save.mock.calls[0][0].flagged).toBe(true);
    });

    it('strictValid is true when all meta fields are strictValid=true', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      expect(mockAuditService.save.mock.calls[0][0].strictValid).toBe(true);
    });

    it('strictValid is false when any field has strictValid !== true', async () => {
      const meta = makeMeta({
        email: { ...makeMeta().email, strictValid: false },
      });
      await controller.submit(makeSnapshot(), meta);
      expect(mockAuditService.save.mock.calls[0][0].strictValid).toBe(false);
    });
  });

  // ── Side effects ──────────────────────────────────────────────────────────

  describe('side effects', () => {
    it('calls auditService.save() exactly once', async () => {
      await controller.submit(makeSnapshot(), makeMeta());
      expect(mockAuditService.save).toHaveBeenCalledOnce();
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
      mockAuditService.save.mockImplementation((r) => { callOrder.push('save'); return r; });
      mockResetFn.mockImplementation(() => callOrder.push('reset'));

      await controller.submit(makeSnapshot(), makeMeta());
      expect(callOrder.indexOf('save')).toBeLessThan(callOrder.indexOf('reset'));
    });
  });
});
