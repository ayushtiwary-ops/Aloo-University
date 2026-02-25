/**
 * FormStateManager
 *
 * Centralised, deterministic state container for the AdmitGuard
 * candidate admission form. Framework-free. No DOM awareness.
 *
 * Design decisions:
 *
 * - Factory function (not a singleton module) so tests get isolated instances
 *   and future multi-form support is trivial.
 *
 * - Immutable snapshots on every read: getState() and subscriber callbacks
 *   always receive a shallow copy of the internal state object. Callers
 *   cannot corrupt internal state through reference mutation.
 *
 * - Subscriber pattern (not EventEmitter): callers pass a callback and receive
 *   an unsubscribe function. This avoids memory leaks — components call
 *   unsubscribe() on teardown, and the Set cleans up automatically.
 *
 * - No validation metadata: the state object holds raw field values only.
 *   The ValidationEngine (phase 2) will receive state snapshots and return
 *   results independently — this module will never own validation concerns.
 *
 * @returns {FormStateManagerInstance}
 */
export function createFormStateManager() {
  /** @type {Record<string, string|boolean>} */
  const INITIAL_STATE = Object.freeze({
    fullName:         '',
    email:            '',
    phone:            '',
    dateOfBirth:      '',
    qualification:    '',
    graduationYear:   '',
    percentageOrCgpa: '',
    score:            '',
    interviewStatus:  '',
    aadhaar:          '',
    offerLetterSent:  '',
    gradingMode:      'percentage',
  });

  let _state = { ...INITIAL_STATE };

  /** @type {Set<function>} */
  const _subscribers = new Set();

  /** Notifies all subscribers with an immutable state snapshot. */
  function _notify() {
    const snapshot = { ..._state };
    _subscribers.forEach((cb) => cb(snapshot));
  }

  return {
    /**
     * Returns a shallow copy of the current state.
     * Mutating the returned object has no effect on internal state.
     *
     * @returns {Record<string, string|boolean>}
     */
    getState() {
      return { ..._state };
    },

    /**
     * Updates a single field's value and notifies subscribers.
     * Silently ignores writes to fields that are not in the schema —
     * this prevents typo-driven state corruption.
     *
     * @param {string}          field - Must match a key in INITIAL_STATE
     * @param {string|boolean}  value
     */
    setField(field, value) {
      if (!Object.prototype.hasOwnProperty.call(INITIAL_STATE, field)) return;

      _state = { ..._state, [field]: value };
      _notify();
    },

    /**
     * Resets all fields to their initial values and notifies subscribers.
     */
    reset() {
      _state = { ...INITIAL_STATE };
      _notify();
    },

    /**
     * Registers a callback invoked after every state change.
     * The callback receives a fresh state snapshot on each call.
     *
     * @param   {function} callback
     * @returns {function} Unsubscribe — call to stop receiving updates
     */
    subscribe(callback) {
      _subscribers.add(callback);
      return () => _subscribers.delete(callback);
    },
  };
}

/**
 * Application-level singleton instance.
 *
 * UI components import this instance directly. Tests use
 * createFormStateManager() to get isolated instances.
 */
export const FormStateManager = createFormStateManager();
