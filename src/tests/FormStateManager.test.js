import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFormStateManager } from '../state/FormStateManager.js';

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
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Rohan' })
      );
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
