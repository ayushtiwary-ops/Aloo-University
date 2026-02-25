/**
 * ExceptionModel
 *
 * Shape of a single compliance exception.
 * Populated by ExceptionManager in phase 2.
 *
 * @typedef {object} ComplianceException
 * @property {string}      id         - Unique identifier
 * @property {string}      fieldId    - Field that triggered the exception
 * @property {string}      ruleId     - Rule that was violated
 * @property {'strict'|'soft'} severity
 * @property {*}           value      - The offending value
 * @property {string}      message    - Human-readable description
 * @property {string}      timestamp  - ISO 8601
 * @property {string|null} resolution - 'overridden' | 'corrected' | null
 */
export const EXCEPTION_DEFAULTS = Object.freeze({
  id:         null,
  fieldId:    null,
  ruleId:     null,
  severity:   null,
  value:      null,
  message:    null,
  timestamp:  null,
  resolution: null,
});
