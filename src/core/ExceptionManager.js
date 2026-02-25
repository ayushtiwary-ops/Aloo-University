/**
 * ExceptionManager
 *
 * Records compliance exceptions raised during validation.
 * Phase 2 implements storage and retrieval logic.
 */
const _exceptions = [];

export const ExceptionManager = {
  /** @param {string} fieldId @param {string} ruleId @param {*} value @param {'strict'|'soft'} severity */
  log(fieldId, ruleId, value, severity) {
    // STUB — Phase 2 implementation goes here.
  },

  getAll()   { return [..._exceptions]; },
  getCount() { return _exceptions.length; },
  clear()    { _exceptions.length = 0; },
};
