import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFormStateManager } from '../state/FormStateManager.js';

// ── Validation extension tests ────────────────────────────────────────────
// These test NEW behaviour added in phase 3.
// The original 16 tests above are unchanged.

describe('FormStateManager — validation extension', () => {
  // A simple validateFn that passes only non-empty strings
  const nonEmptyValidateFn = vi.fn((fieldId, value) => ({
    isValid: value !== '' && value !== null && value !== undefined,
    message: value === '' ? `${fieldId} is required.` : null,
  }));

  const alwaysValidFn = () => ({ isValid: true, message: null });

  // getDependentsFn: interviewStatus change triggers offerLetterSent re-validation
  const dependentsFn = vi.fn((fieldId) =>
    fieldId === 'interviewStatus' ? ['offerLetterSent'] : []
  );

  let manager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = createFormStateManager({
      validateFn: nonEmptyValidateFn,
      getDependentsFn: dependentsFn,
    });
  });

  // ── getFieldMeta ─────────────────────────────────────────────────────────

  describe('getFieldMeta(fieldId)', () => {
    it('returns neutral meta (null) before any field is changed', () => {
      const meta = manager.getFieldMeta('fullName');
      // Phase 4 extended the meta shape; use toMatchObject for forward compatibility
      expect(meta).toMatchObject({
        strictValid: null,
        strictErrorMessage: '',
        softValid: null,
        softViolation: '',
        exceptionRequested: false,
        rationale: '',
        rationaleValid: false,
      });
    });

    it('returns updated strictValid=true after a field passes validation', () => {
      manager.setField('fullName', 'Ananya');
      expect(manager.getFieldMeta('fullName').strictValid).toBe(true);
    });

    it('returns updated strictValid=false after a field fails validation', () => {
      manager.setField('fullName', '');
      expect(manager.getFieldMeta('fullName').strictValid).toBe(false);
    });

    it('returns the error message when validation fails', () => {
      manager.setField('fullName', '');
      expect(manager.getFieldMeta('fullName').strictErrorMessage).toBe('fullName is required.');
    });

    it('clears the error message when a field becomes valid after being invalid', () => {
      manager.setField('fullName', '');
      manager.setField('fullName', 'Ananya');
      expect(manager.getFieldMeta('fullName').strictErrorMessage).toBe('');
      expect(manager.getFieldMeta('fullName').strictValid).toBe(true);
    });

    it('returns an immutable snapshot — mutating the result does not affect internal meta', () => {
      manager.setField('fullName', 'Ananya');
      const meta = manager.getFieldMeta('fullName');
      meta.strictValid = false;
      expect(manager.getFieldMeta('fullName').strictValid).toBe(true);
    });
  });

  // ── Subscriber receives validation meta as second argument ────────────────

  describe('subscriber receives (values, meta) signature', () => {
    it('calls subscriber with values snapshot as first argument', () => {
      const listener = vi.fn();
      manager.subscribe(listener);
      manager.setField('fullName', 'Rohan');
      expect(listener.mock.calls[0][0]).toMatchObject({ fullName: 'Rohan' });
    });

    it('calls subscriber with meta snapshot as second argument', () => {
      const listener = vi.fn();
      manager.subscribe(listener);
      manager.setField('fullName', 'Rohan');
      const meta = listener.mock.calls[0][1];
      // Phase 4 extended the meta shape; check the strict subset
      expect(meta.fullName).toMatchObject({ strictValid: true, strictErrorMessage: '' });
    });

    it('meta snapshot is immutable — mutation in listener does not affect state', () => {
      manager.subscribe((values, meta) => {
        meta.fullName.strictValid = false;
      });
      manager.setField('fullName', 'Rohan');
      expect(manager.getFieldMeta('fullName').strictValid).toBe(true);
    });
  });

  // ── Cascade re-validation via getDependentsFn ─────────────────────────────

  describe('cascade re-validation', () => {
    it('re-validates dependent fields when a parent field changes', () => {
      manager.setField('interviewStatus', 'cleared');
      // getDependentsFn returned ['offerLetterSent'], so nonEmptyValidateFn
      // should have been called for offerLetterSent too
      expect(nonEmptyValidateFn).toHaveBeenCalledWith(
        'offerLetterSent',
        expect.anything(),
        expect.any(Object)
      );
    });

    it('does not cascade when there are no dependents', () => {
      manager.setField('fullName', 'Ananya');
      // getDependentsFn returns [] for fullName — only fullName is validated
      const calls = nonEmptyValidateFn.mock.calls.map((c) => c[0]);
      expect(calls).toContain('fullName');
      expect(calls).not.toContain('interviewStatus');
    });
  });

  // ── isSubmittable ─────────────────────────────────────────────────────────

  describe('isSubmittable() with validation', () => {
    it('returns false when no fields have been validated (all null)', () => {
      expect(manager.isSubmittable()).toBe(false);
    });

    it('returns false when any field has strictValid=false', () => {
      manager.setField('fullName', '');   // fails
      expect(manager.isSubmittable()).toBe(false);
    });

    it('returns false when some fields are valid but others remain null', () => {
      const m = createFormStateManager({ validateFn: alwaysValidFn });
      m.setField('fullName', 'Ananya'); // strictValid=true
      // all other fields remain null
      expect(m.isSubmittable()).toBe(false);
    });

    it('returns true when all 12 fields have strictValid=true', () => {
      const m = createFormStateManager({ validateFn: alwaysValidFn });
      const allFields = [
        'fullName', 'email', 'phone', 'dateOfBirth', 'aadhaar',
        'qualification', 'graduationYear', 'percentageOrCgpa',
        'gradingMode', 'score', 'interviewStatus', 'offerLetterSent',
      ];
      allFields.forEach((f) => m.setField(f, 'x'));
      expect(m.isSubmittable()).toBe(true);
    });
  });

  // ── validateAll ───────────────────────────────────────────────────────────

  describe('validateAll()', () => {
    it('runs validateFn for every field with its current value', () => {
      manager.validateAll();
      const validatedFields = nonEmptyValidateFn.mock.calls.map((c) => c[0]);
      expect(validatedFields).toContain('fullName');
      expect(validatedFields).toContain('email');
      expect(validatedFields).toContain('gradingMode');
    });

    it('sets strictValid=false for empty required fields after validateAll', () => {
      manager.validateAll();
      expect(manager.getFieldMeta('fullName').strictValid).toBe(false);
    });

    it('sets strictValid=true for non-empty default fields (e.g. gradingMode)', () => {
      // gradingMode default is 'percentage' — non-empty — should pass nonEmptyValidateFn
      manager.validateAll();
      expect(manager.getFieldMeta('gradingMode').strictValid).toBe(true);
    });

    it('notifies subscribers once after validateAll', () => {
      const listener = vi.fn();
      manager.subscribe(listener);
      manager.validateAll();
      expect(listener).toHaveBeenCalledOnce();
    });

    it('resets meta back to neutral when reset() is called after validateAll', () => {
      manager.validateAll();
      manager.reset();
      expect(manager.getFieldMeta('fullName').strictValid).toBeNull();
    });
  });
});

// We test a factory function so each test gets a clean instance.
// This avoids shared module-level state bleeding between tests.

describe('FormStateManager', () => {
  let manager;

  beforeEach(() => {
    manager = createFormStateManager();
  });

  // ── Initial state ────────────────────────────────────────────

  describe('getState()', () => {
    it('returns all 12 fields with empty-string defaults', () => {
      const state = manager.getState();

      expect(state).toEqual({
        fullName:        '',
        email:           '',
        phone:           '',
        dateOfBirth:     '',
        qualification:   '',
        graduationYear:  '',
        percentageOrCgpa: '',
        score:           '',
        interviewStatus: '',
        aadhaar:         '',
        offerLetterSent: '',
        gradingMode:     'percentage',
      });
    });

    it('returns a snapshot, not a live reference to internal state', () => {
      const state = manager.getState();
      state.fullName = 'MUTATED';

      expect(manager.getState().fullName).toBe('');
    });
  });

  // ── setField ─────────────────────────────────────────────────

  describe('setField(field, value)', () => {
    it('updates a single field value', () => {
      manager.setField('fullName', 'Ananya Sharma');

      expect(manager.getState().fullName).toBe('Ananya Sharma');
    });

    it('does not mutate other fields when one field is set', () => {
      manager.setField('email', 'ananya@example.com');
      const state = manager.getState();

      expect(state.fullName).toBe('');
      expect(state.phone).toBe('');
      expect(state.email).toBe('ananya@example.com');
    });

    it('handles empty string as a valid field update', () => {
      manager.setField('fullName', 'Ananya');
      manager.setField('fullName', '');

      expect(manager.getState().fullName).toBe('');
    });

    it('ignores updates to fields that do not exist in the schema', () => {
      manager.setField('unknownField', 'rogue value');

      expect(manager.getState()).not.toHaveProperty('unknownField');
    });

    it('updates gradingMode field correctly', () => {
      manager.setField('gradingMode', 'cgpa');

      expect(manager.getState().gradingMode).toBe('cgpa');
    });

    it('updates offerLetterSent with boolean true', () => {
      manager.setField('offerLetterSent', true);

      expect(manager.getState().offerLetterSent).toBe(true);
    });

    it('updates offerLetterSent with boolean false', () => {
      manager.setField('offerLetterSent', false);

      expect(manager.getState().offerLetterSent).toBe(false);
    });
  });

  // ── reset ────────────────────────────────────────────────────

  describe('reset()', () => {
    it('returns all fields to their initial values', () => {
      manager.setField('fullName', 'Ananya');
      manager.setField('email', 'ananya@example.com');
      manager.setField('gradingMode', 'cgpa');

      manager.reset();

      expect(manager.getState()).toEqual({
        fullName:        '',
        email:           '',
        phone:           '',
        dateOfBirth:     '',
        qualification:   '',
        graduationYear:  '',
        percentageOrCgpa: '',
        score:           '',
        interviewStatus: '',
        aadhaar:         '',
        offerLetterSent: '',
        gradingMode:     'percentage',
      });
    });
  });

  // ── subscribe ────────────────────────────────────────────────

  describe('subscribe(callback)', () => {
    it('calls the subscriber with the new state after setField', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.setField('fullName', 'Rohan');

      expect(listener).toHaveBeenCalledOnce();
      // Subscriber now receives (values, meta) — check first argument only
      expect(listener.mock.calls[0][0]).toMatchObject({ fullName: 'Rohan' });
    });

    it('calls the subscriber with the reset state after reset()', () => {
      const listener = vi.fn();
      manager.setField('fullName', 'Rohan');
      manager.subscribe(listener);

      manager.reset();

      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].fullName).toBe('');
    });

    it('notifies all subscribers when state changes', () => {
      const listenerA = vi.fn();
      const listenerB = vi.fn();
      manager.subscribe(listenerA);
      manager.subscribe(listenerB);

      manager.setField('email', 'test@example.com');

      expect(listenerA).toHaveBeenCalledOnce();
      expect(listenerB).toHaveBeenCalledOnce();
    });

    it('does not call a subscriber after it has been unsubscribed', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      unsubscribe();
      manager.setField('fullName', 'Should not trigger');

      expect(listener).not.toHaveBeenCalled();
    });

    it('delivers an immutable snapshot to subscribers, not internal state', () => {
      let capturedState;
      manager.subscribe((state) => {
        capturedState = state;
        state.fullName = 'MUTATED_IN_LISTENER';
      });

      manager.setField('fullName', 'Original');

      // The mutation inside the listener must not affect the next read
      expect(manager.getState().fullName).toBe('Original');
    });

    it('does not call subscriber when an unknown field is set', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.setField('doesNotExist', 'value');

      expect(listener).not.toHaveBeenCalled();
    });
  });
});

// ── FormStateManager — soft rule extension ────────────────────────────────────
//
// Tests for phase 4: soft-rule evaluation, exception governance, isFlagged().

describe('FormStateManager — soft rule extension', () => {
  // softValidateFn: violates 'score' when value is a number below 40
  const softValidateFn = vi.fn((fieldId, value) => {
    if (fieldId === 'score' && value !== '' && !isNaN(Number(value)) && Number(value) < 40) {
      return {
        isViolation: true,
        message: 'Score below 40 requires an exception.',
        rule: {
          rationaleKeywords: ['approved by', 'special case', 'documentation pending', 'waiver granted'],
          parameters: { rationaleMinLength: 30 },
        },
      };
    }
    return { isViolation: false, message: null, rule: null };
  });

  // validateRationaleFn: valid when length >= 30 and contains at least one keyword
  const validateRationaleFn = vi.fn((rationale, rule) => {
    if (!rule) return { isValid: false };
    const minLen   = rule.parameters?.rationaleMinLength ?? 30;
    const keywords = rule.rationaleKeywords ?? [];
    if (!rationale || rationale.length < minLen) return { isValid: false };
    const lower     = rationale.toLowerCase();
    const hasKw     = keywords.some((k) => lower.includes(k.toLowerCase()));
    return { isValid: hasKw };
  });

  let manager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = createFormStateManager({
      validateFn:         () => ({ isValid: true, message: null }),
      softValidateFn,
      validateRationaleFn,
    });
  });

  // ── Extended meta shape ───────────────────────────────────────────────────

  describe('extended meta shape', () => {
    it('initial meta for every field includes all soft fields at neutral values', () => {
      const meta = manager.getFieldMeta('score');
      expect(meta).toMatchObject({
        strictValid:       null,
        strictErrorMessage: '',
        softValid:         null,
        softViolation:     '',
        exceptionRequested: false,
        rationale:         '',
        rationaleValid:    false,
      });
    });

    it('sets softValid=false when a soft rule is violated', () => {
      manager.setField('score', '30');
      expect(manager.getFieldMeta('score').softValid).toBe(false);
    });

    it('sets softViolation message when soft rule fires', () => {
      manager.setField('score', '30');
      expect(manager.getFieldMeta('score').softViolation).toBe('Score below 40 requires an exception.');
    });

    it('sets softValid=true when value passes all soft rules', () => {
      manager.setField('score', '75');
      expect(manager.getFieldMeta('score').softValid).toBe(true);
    });

    it('clears soft violation when value corrects itself above threshold', () => {
      manager.setField('score', '30');
      manager.setField('score', '75');
      expect(manager.getFieldMeta('score').softValid).toBe(true);
      expect(manager.getFieldMeta('score').softViolation).toBe('');
    });

    it('softValid is null when field value is empty (not yet filled)', () => {
      // score is empty by default — not yet interacted with
      expect(manager.getFieldMeta('score').softValid).toBeNull();
    });

    it('getFieldMeta returns an immutable snapshot', () => {
      manager.setField('score', '30');
      const meta = manager.getFieldMeta('score');
      meta.softValid = true;
      expect(manager.getFieldMeta('score').softValid).toBe(false);
    });
  });

  // ── setFieldException ─────────────────────────────────────────────────────

  describe('setFieldException(fieldId, exceptionRequested, rationale)', () => {
    it('sets exceptionRequested=true', () => {
      manager.setField('score', '30');
      manager.setFieldException('score', true, '');
      expect(manager.getFieldMeta('score').exceptionRequested).toBe(true);
    });

    it('sets rationaleValid=true when rationale meets length and contains a keyword', () => {
      manager.setField('score', '30');
      const r = 'This candidate is approved by the committee for special admission.';
      manager.setFieldException('score', true, r);
      expect(manager.getFieldMeta('score').rationaleValid).toBe(true);
      expect(manager.getFieldMeta('score').rationale).toBe(r);
    });

    it('sets rationaleValid=false when rationale is too short', () => {
      manager.setField('score', '30');
      manager.setFieldException('score', true, 'Too short.');
      expect(manager.getFieldMeta('score').rationaleValid).toBe(false);
    });

    it('sets rationaleValid=false when rationale meets length but has no keyword', () => {
      manager.setField('score', '30');
      const r = 'The candidate has excellent practical skills and strong work experience.';
      manager.setFieldException('score', true, r);
      expect(manager.getFieldMeta('score').rationaleValid).toBe(false);
    });

    it('clears exception state when toggle is turned off', () => {
      manager.setField('score', '30');
      const r = 'This candidate is approved by the board for this admission cycle.';
      manager.setFieldException('score', true, r);
      manager.setFieldException('score', false, '');
      const meta = manager.getFieldMeta('score');
      expect(meta.exceptionRequested).toBe(false);
      expect(meta.rationale).toBe('');
      expect(meta.rationaleValid).toBe(false);
    });

    it('notifies subscribers after exception state update', () => {
      const listener = vi.fn();
      manager.subscribe(listener);
      manager.setField('score', '30');
      const r = 'This candidate is approved by the admission committee.';
      manager.setFieldException('score', true, r);
      // 2 calls: one for setField, one for setFieldException
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('ignores setFieldException on a field with no soft violation', () => {
      // score=75 passes soft rule — exception request should be silently no-op
      manager.setField('score', '75');
      manager.setFieldException('score', true, 'irrelevant rationale text here please');
      const meta = manager.getFieldMeta('score');
      // exceptionRequested is irrelevant when there is no soft violation
      expect(meta.softValid).toBe(true);
    });
  });

  // ── isSubmittable with soft gating ────────────────────────────────────────

  describe('isSubmittable() with soft rule gating', () => {
    it('returns false when a soft violation exists and no exception requested', () => {
      manager.setField('score', '30');
      expect(manager.isSubmittable()).toBe(false);
    });

    it('returns false when exception requested but rationale is invalid', () => {
      manager.setField('score', '30');
      manager.setFieldException('score', true, 'Too short.');
      expect(manager.isSubmittable()).toBe(false);
    });

    it('returns true when all strict valid and soft violation has valid exception', () => {
      // Use a manager where all strict checks pass and score is the only soft issue
      const m = createFormStateManager({
        validateFn:         () => ({ isValid: true, message: null }),
        softValidateFn,
        validateRationaleFn,
      });
      const allFields = [
        'fullName', 'email', 'phone', 'dateOfBirth', 'aadhaar',
        'qualification', 'graduationYear', 'percentageOrCgpa',
        'gradingMode', 'interviewStatus', 'offerLetterSent',
      ];
      allFields.forEach((f) => m.setField(f, 'x'));
      m.setField('score', '30'); // soft violation
      const r = 'This candidate is approved by the board for this admission cycle.';
      m.setFieldException('score', true, r);
      expect(m.isSubmittable()).toBe(true);
    });
  });

  // ── isFlagged ─────────────────────────────────────────────────────────────

  describe('isFlagged()', () => {
    it('returns false when active exception count is 0', () => {
      expect(manager.isFlagged()).toBe(false);
    });

    it('returns false when active exception count is exactly 2', () => {
      // Build a manager where two different fields fire soft violations
      const multiSoft = vi.fn((fieldId) => {
        const violators = ['score', 'percentageOrCgpa'];
        if (violators.includes(fieldId)) {
          return {
            isViolation: true,
            message: `${fieldId} below threshold.`,
            rule: {
              rationaleKeywords: ['approved by'],
              parameters: { rationaleMinLength: 10 },
            },
          };
        }
        return { isViolation: false, message: null, rule: null };
      });
      const alwaysValidRationale = () => ({ isValid: true });

      const m = createFormStateManager({
        validateFn:         () => ({ isValid: true, message: null }),
        softValidateFn:     multiSoft,
        validateRationaleFn: alwaysValidRationale,
      });

      m.setField('score', '30');
      m.setFieldException('score', true, 'Approved by board.');
      m.setField('percentageOrCgpa', '40');
      m.setFieldException('percentageOrCgpa', true, 'Approved by board.');

      expect(m.isFlagged()).toBe(false); // exactly 2 — NOT flagged
    });

    it('returns true when active exception count exceeds 2', () => {
      const multiSoft = vi.fn((fieldId) => {
        const violators = ['score', 'percentageOrCgpa', 'graduationYear'];
        if (violators.includes(fieldId)) {
          return {
            isViolation: true,
            message: `${fieldId} below threshold.`,
            rule: {
              rationaleKeywords: ['approved by'],
              parameters: { rationaleMinLength: 10 },
            },
          };
        }
        return { isViolation: false, message: null, rule: null };
      });
      const alwaysValidRationale = () => ({ isValid: true });

      const m = createFormStateManager({
        validateFn:         () => ({ isValid: true, message: null }),
        softValidateFn:     multiSoft,
        validateRationaleFn: alwaysValidRationale,
      });

      ['score', 'percentageOrCgpa', 'graduationYear'].forEach((f) => {
        m.setField(f, '30');
        m.setFieldException(f, true, 'Approved by board.');
      });

      expect(m.isFlagged()).toBe(true); // 3 exceptions → flagged
    });
  });
});
