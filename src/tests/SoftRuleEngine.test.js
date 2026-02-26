/**
 * SoftRuleEngine.test.js
 *
 * Tests for:
 *  - New validators.js soft-rule primitives
 *    (isAgeInRange, isGraduationYearRecent, isAboveMinimumAcademic,
 *     isAboveMinimumScore, isValidRationale)
 *  - ValidationEngine soft methods
 *    (evaluateSoftRule, validateSoftRules, validateRationale,
 *     computeExceptionCount, isFormEligibleForSubmission)
 *
 * Rule fixtures mirror rules.json structure; no ConfigLoader dependency.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isAgeInRange,
  isGraduationYearRecent,
  isAboveMinimumAcademic,
  isAboveMinimumScore,
  isValidRationale,
} from '../utils/validators.js';
import { ValidationEngine } from '../core/ValidationEngine.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a date-of-birth string such that the person is exactly `age` years old
 *  as of today, with birthday mid-year (June 15) to avoid edge cases. */
function dobForAge(age) {
  return `${new Date().getFullYear() - age}-06-15`;
}

const CURRENT_YEAR = new Date().getFullYear();

// ── Governance keywords used in all fixture rules ─────────────────────────────

const GOVERNANCE_KEYWORDS = [
  'approved by',
  'special case',
  'documentation pending',
  'waiver granted',
];

// ── Rule fixtures ─────────────────────────────────────────────────────────────

const R = {
  ageRangeExtended: {
    field: 'dateOfBirth', ruleType: 'soft',
    validationType: 'ageRangeExtended',
    parameters: { minAge: 36, maxAge: 40, rationaleMinLength: 30 },
    errorMessage: 'Candidate age is in the extended range (36–40). An exception is required.',
    exceptionAllowed: true,
    rationaleKeywords: GOVERNANCE_KEYWORDS,
  },
  recentGraduation: {
    field: 'graduationYear', ruleType: 'soft',
    validationType: 'recentGraduation',
    parameters: { recentYearsThreshold: 0, rationaleMinLength: 30 },
    errorMessage: 'Candidate graduated in the current year. Verification is required.',
    exceptionAllowed: true,
    rationaleKeywords: GOVERNANCE_KEYWORDS,
  },
  minimumAcademicThreshold: {
    field: 'percentageOrCgpa', ruleType: 'soft',
    validationType: 'minimumAcademicThreshold',
    parameters: { percentageMinimum: 50, cgpaMinimum: 5.0, rationaleMinLength: 30 },
    errorMessage: 'Academic score is below the recommended threshold.',
    exceptionAllowed: true,
    rationaleKeywords: GOVERNANCE_KEYWORDS,
  },
  minimumScreeningThreshold: {
    field: 'score', ruleType: 'soft',
    validationType: 'minimumScreeningThreshold',
    parameters: { minimumPassingScore: 40, rationaleMinLength: 30 },
    errorMessage: 'Screening test score is below the minimum passing threshold of 40.',
    exceptionAllowed: true,
    rationaleKeywords: GOVERNANCE_KEYWORDS,
  },
};

// ── isAgeInRange ──────────────────────────────────────────────────────────────

describe('isAgeInRange(dobString, minAge, maxAge)', () => {
  it('returns true when age is within [minAge, maxAge]', () => {
    expect(isAgeInRange(dobForAge(38), 36, 40)).toBe(true);
  });

  it('returns true when age equals minAge exactly (boundary)', () => {
    // Birthday today → exactly 36 today
    const today = new Date();
    const dob = `${today.getFullYear() - 36}-${
      String(today.getMonth() + 1).padStart(2, '0')
    }-${String(today.getDate()).padStart(2, '0')}`;
    expect(isAgeInRange(dob, 36, 40)).toBe(true);
  });

  it('returns true when age equals maxAge exactly (boundary)', () => {
    const today = new Date();
    const dob = `${today.getFullYear() - 40}-${
      String(today.getMonth() + 1).padStart(2, '0')
    }-${String(today.getDate()).padStart(2, '0')}`;
    expect(isAgeInRange(dob, 36, 40)).toBe(true);
  });

  it('returns false when age is below minAge', () => {
    expect(isAgeInRange(dobForAge(25), 36, 40)).toBe(false);
  });

  it('returns false when age is above maxAge', () => {
    expect(isAgeInRange(dobForAge(45), 36, 40)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAgeInRange('', 36, 40)).toBe(false);
  });

  it('returns false for an invalid date string', () => {
    expect(isAgeInRange('not-a-date', 36, 40)).toBe(false);
  });
});

// ── isGraduationYearRecent ────────────────────────────────────────────────────

describe('isGraduationYearRecent(yearString, recentYearsThreshold)', () => {
  it('returns true when year equals current year and threshold is 0', () => {
    expect(isGraduationYearRecent(String(CURRENT_YEAR), 0)).toBe(true);
  });

  it('returns false when year is before current year with threshold 0', () => {
    expect(isGraduationYearRecent(String(CURRENT_YEAR - 1), 0)).toBe(false);
  });

  it('returns true when threshold is 1 and year is current year', () => {
    expect(isGraduationYearRecent(String(CURRENT_YEAR), 1)).toBe(true);
  });

  it('returns true when threshold is 1 and year is last year', () => {
    expect(isGraduationYearRecent(String(CURRENT_YEAR - 1), 1)).toBe(true);
  });

  it('returns false when threshold is 1 and year is two years ago', () => {
    expect(isGraduationYearRecent(String(CURRENT_YEAR - 2), 1)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isGraduationYearRecent('', 0)).toBe(false);
  });

  it('returns false for non-numeric string', () => {
    expect(isGraduationYearRecent('abcd', 0)).toBe(false);
  });
});

// ── isAboveMinimumAcademic ────────────────────────────────────────────────────

describe('isAboveMinimumAcademic(value, gradingMode, percentageMin, cgpaMin)', () => {
  it('returns false when percentage is below minimum', () => {
    expect(isAboveMinimumAcademic('45', 'percentage', 50, 5.0)).toBe(false);
  });

  it('returns true when percentage equals minimum exactly (boundary)', () => {
    expect(isAboveMinimumAcademic('50', 'percentage', 50, 5.0)).toBe(true);
  });

  it('returns true when percentage is above minimum', () => {
    expect(isAboveMinimumAcademic('75.5', 'percentage', 50, 5.0)).toBe(true);
  });

  it('returns false when CGPA is below minimum', () => {
    expect(isAboveMinimumAcademic('4.5', 'cgpa', 50, 5.0)).toBe(false);
  });

  it('returns true when CGPA equals minimum exactly (boundary)', () => {
    expect(isAboveMinimumAcademic('5.0', 'cgpa', 50, 5.0)).toBe(true);
  });

  it('returns true when CGPA is above minimum', () => {
    expect(isAboveMinimumAcademic('7.8', 'cgpa', 50, 5.0)).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isAboveMinimumAcademic('', 'percentage', 50, 5.0)).toBe(false);
  });

  it('defaults to percentage mode when gradingMode is unrecognised', () => {
    expect(isAboveMinimumAcademic('45', 'unknown', 50, 5.0)).toBe(false);
    expect(isAboveMinimumAcademic('75', 'unknown', 50, 5.0)).toBe(true);
  });
});

// ── isAboveMinimumScore ───────────────────────────────────────────────────────

describe('isAboveMinimumScore(value, minimum)', () => {
  it('returns false when score is below minimum', () => {
    expect(isAboveMinimumScore('35', 40)).toBe(false);
  });

  it('returns true when score equals minimum exactly (boundary)', () => {
    expect(isAboveMinimumScore('40', 40)).toBe(true);
  });

  it('returns true when score is above minimum', () => {
    expect(isAboveMinimumScore('75', 40)).toBe(true);
  });

  it('returns false for score of 0 when minimum is 40', () => {
    expect(isAboveMinimumScore('0', 40)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAboveMinimumScore('', 40)).toBe(false);
  });

  it('returns false for non-numeric string', () => {
    expect(isAboveMinimumScore('abc', 40)).toBe(false);
  });
});

// ── isValidRationale ─────────────────────────────────────────────────────────

describe('isValidRationale(rationale, minLength, keywords)', () => {
  const KEYWORDS = GOVERNANCE_KEYWORDS;
  const MIN_LEN  = 30;

  it('returns false when rationale is shorter than minLength', () => {
    expect(isValidRationale('Short.', MIN_LEN, KEYWORDS)).toBe(false);
  });

  it('returns false when rationale meets length but contains no keyword', () => {
    const r = 'This candidate has strong credentials and should be admitted here.';
    expect(isValidRationale(r, MIN_LEN, KEYWORDS)).toBe(false);
  });

  it('returns true when rationale contains "approved by" and meets length', () => {
    const r = 'This application is approved by the admissions committee.';
    expect(isValidRationale(r, MIN_LEN, KEYWORDS)).toBe(true);
  });

  it('returns true when rationale contains "special case" and meets length', () => {
    const r = 'Candidate qualifies as a special case under the current policy.';
    expect(isValidRationale(r, MIN_LEN, KEYWORDS)).toBe(true);
  });

  it('returns true when rationale contains "documentation pending" and meets length', () => {
    const r = 'The original mark sheet is documentation pending submission.';
    expect(isValidRationale(r, MIN_LEN, KEYWORDS)).toBe(true);
  });

  it('returns true when rationale contains "waiver granted" and meets length', () => {
    const r = 'The age restriction waiver granted by the board applies here.';
    expect(isValidRationale(r, MIN_LEN, KEYWORDS)).toBe(true);
  });

  it('keyword match is case-insensitive', () => {
    const r = 'Admission is APPROVED BY the screening committee for this cohort.';
    expect(isValidRationale(r, MIN_LEN, KEYWORDS)).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidRationale('', MIN_LEN, KEYWORDS)).toBe(false);
  });

  it('returns false for a null-like value', () => {
    expect(isValidRationale(null, MIN_LEN, KEYWORDS)).toBe(false);
  });
});

// ── ValidationEngine.evaluateSoftRule ────────────────────────────────────────

describe('ValidationEngine.evaluateSoftRule(value, fullState, rule)', () => {

  describe('ageRangeExtended', () => {
    it('returns isViolation=true when age is inside the extended range', () => {
      const result = ValidationEngine.evaluateSoftRule(dobForAge(38), {}, R.ageRangeExtended);
      expect(result).toEqual({ isViolation: true, message: R.ageRangeExtended.errorMessage });
    });

    it('returns isViolation=true for age exactly at lower boundary (36)', () => {
      const today = new Date();
      const dob = `${today.getFullYear() - 36}-${
        String(today.getMonth() + 1).padStart(2, '0')
      }-${String(today.getDate()).padStart(2, '0')}`;
      const result = ValidationEngine.evaluateSoftRule(dob, {}, R.ageRangeExtended);
      expect(result.isViolation).toBe(true);
    });

    it('returns isViolation=false when age is in the normal range (25)', () => {
      const result = ValidationEngine.evaluateSoftRule(dobForAge(25), {}, R.ageRangeExtended);
      expect(result).toEqual({ isViolation: false, message: null });
    });

    it('returns isViolation=false when age is above the extended range (45)', () => {
      const result = ValidationEngine.evaluateSoftRule(dobForAge(45), {}, R.ageRangeExtended);
      expect(result.isViolation).toBe(false);
    });

    it('returns isViolation=false for empty dateOfBirth', () => {
      const result = ValidationEngine.evaluateSoftRule('', {}, R.ageRangeExtended);
      expect(result).toEqual({ isViolation: false, message: null });
    });
  });

  describe('recentGraduation', () => {
    it('returns isViolation=true when graduation year is the current year', () => {
      const result = ValidationEngine.evaluateSoftRule(
        String(CURRENT_YEAR), {}, R.recentGraduation
      );
      expect(result).toEqual({ isViolation: true, message: R.recentGraduation.errorMessage });
    });

    it('returns isViolation=false when graduation year is in the past', () => {
      const result = ValidationEngine.evaluateSoftRule(
        String(CURRENT_YEAR - 2), {}, R.recentGraduation
      );
      expect(result).toEqual({ isViolation: false, message: null });
    });

    it('returns isViolation=false for empty graduation year', () => {
      const result = ValidationEngine.evaluateSoftRule('', {}, R.recentGraduation);
      expect(result).toEqual({ isViolation: false, message: null });
    });
  });

  describe('minimumAcademicThreshold', () => {
    it('returns isViolation=true when percentage is below minimum', () => {
      const result = ValidationEngine.evaluateSoftRule(
        '45', { gradingMode: 'percentage' }, R.minimumAcademicThreshold
      );
      expect(result).toEqual({ isViolation: true, message: R.minimumAcademicThreshold.errorMessage });
    });

    it('returns isViolation=false when percentage equals minimum exactly', () => {
      const result = ValidationEngine.evaluateSoftRule(
        '50', { gradingMode: 'percentage' }, R.minimumAcademicThreshold
      );
      expect(result).toEqual({ isViolation: false, message: null });
    });

    it('returns isViolation=true when CGPA is below minimum', () => {
      const result = ValidationEngine.evaluateSoftRule(
        '4.5', { gradingMode: 'cgpa' }, R.minimumAcademicThreshold
      );
      expect(result.isViolation).toBe(true);
    });

    it('returns isViolation=false when CGPA equals minimum exactly', () => {
      const result = ValidationEngine.evaluateSoftRule(
        '5.0', { gradingMode: 'cgpa' }, R.minimumAcademicThreshold
      );
      expect(result).toEqual({ isViolation: false, message: null });
    });

    it('returns isViolation=false for empty value', () => {
      const result = ValidationEngine.evaluateSoftRule(
        '', { gradingMode: 'percentage' }, R.minimumAcademicThreshold
      );
      expect(result).toEqual({ isViolation: false, message: null });
    });
  });

  describe('minimumScreeningThreshold', () => {
    it('returns isViolation=true when score is below minimum', () => {
      const result = ValidationEngine.evaluateSoftRule('30', {}, R.minimumScreeningThreshold);
      expect(result).toEqual({ isViolation: true, message: R.minimumScreeningThreshold.errorMessage });
    });

    it('returns isViolation=false when score equals minimum exactly', () => {
      const result = ValidationEngine.evaluateSoftRule('40', {}, R.minimumScreeningThreshold);
      expect(result).toEqual({ isViolation: false, message: null });
    });

    it('returns isViolation=false when score is above minimum', () => {
      const result = ValidationEngine.evaluateSoftRule('75', {}, R.minimumScreeningThreshold);
      expect(result).toEqual({ isViolation: false, message: null });
    });

    it('returns isViolation=false for empty value', () => {
      const result = ValidationEngine.evaluateSoftRule('', {}, R.minimumScreeningThreshold);
      expect(result).toEqual({ isViolation: false, message: null });
    });
  });
});

// ── ValidationEngine.validateSoftRules ───────────────────────────────────────

describe('ValidationEngine.validateSoftRules(fieldId, value, fullState, fieldRules)', () => {
  it('returns the first soft violation when a rule is violated', () => {
    const result = ValidationEngine.validateSoftRules('score', '30', {}, [R.minimumScreeningThreshold]);
    expect(result.isViolation).toBe(true);
    expect(result.message).toBe(R.minimumScreeningThreshold.errorMessage);
    expect(result.rule).toBe(R.minimumScreeningThreshold);
  });

  it('returns no violation when the field value passes all soft rules', () => {
    const result = ValidationEngine.validateSoftRules('score', '75', {}, [R.minimumScreeningThreshold]);
    expect(result).toEqual({ isViolation: false, message: null, rule: null });
  });

  it('ignores strict-typed rules — only evaluates ruleType="soft"', () => {
    const strictRule = {
      field: 'score', ruleType: 'strict',
      validationType: 'integerRange',
      parameters: { min: 0, max: 100 },
      errorMessage: 'Score 0–100.',
    };
    // Empty value would fail the strict integerRange, but soft evaluator ignores it
    const result = ValidationEngine.validateSoftRules('score', '', {}, [strictRule]);
    expect(result.isViolation).toBe(false);
  });

  it('ignores system-typed rules', () => {
    const systemRule = {
      field: 'interviewStatus', ruleType: 'system',
      validationType: 'blocksSubmissionWhenValue',
      parameters: { blockedValues: ['rejected'] },
      errorMessage: 'Rejected.',
    };
    const result = ValidationEngine.validateSoftRules('interviewStatus', 'rejected', {}, [systemRule]);
    expect(result.isViolation).toBe(false);
  });

  it('returns no violation for a field with no rules at all', () => {
    const result = ValidationEngine.validateSoftRules('email', 'test@test.com', {}, []);
    expect(result).toEqual({ isViolation: false, message: null, rule: null });
  });

  it('evaluates multiple soft rules and returns the first violated one', () => {
    // Two soft rules on same field — first one fails
    const r1 = {
      field: 'score', ruleType: 'soft',
      validationType: 'minimumScreeningThreshold',
      parameters: { minimumPassingScore: 40, rationaleMinLength: 30 },
      errorMessage: 'Score below 40.',
      exceptionAllowed: true,
      rationaleKeywords: GOVERNANCE_KEYWORDS,
    };
    const r2 = {
      field: 'score', ruleType: 'soft',
      validationType: 'minimumScreeningThreshold',
      parameters: { minimumPassingScore: 60, rationaleMinLength: 30 },
      errorMessage: 'Score below 60.',
      exceptionAllowed: true,
      rationaleKeywords: GOVERNANCE_KEYWORDS,
    };
    // Value 30 fails r1; only r1 should be returned
    const result = ValidationEngine.validateSoftRules('score', '30', {}, [r1, r2]);
    expect(result.message).toBe('Score below 40.');
  });
});

// ── ValidationEngine.validateRationale ───────────────────────────────────────

describe('ValidationEngine.validateRationale(rationale, rule)', () => {
  it('returns isValid=true for a rationale that meets length and has a keyword', () => {
    const r = 'This candidate has a waiver granted by the board for this cycle.';
    expect(ValidationEngine.validateRationale(r, R.minimumScreeningThreshold)).toEqual({ isValid: true });
  });

  it('returns isValid=false for a rationale that is too short', () => {
    expect(ValidationEngine.validateRationale('Short.', R.minimumScreeningThreshold)).toEqual({ isValid: false });
  });

  it('returns isValid=false for a rationale with no keyword', () => {
    const r = 'This candidate has excellent practical experience in the field.';
    expect(ValidationEngine.validateRationale(r, R.minimumScreeningThreshold)).toEqual({ isValid: false });
  });

  it('returns isValid=false when rule is null', () => {
    expect(ValidationEngine.validateRationale('any text here', null)).toEqual({ isValid: false });
  });
});

// ── ValidationEngine.computeExceptionCount ───────────────────────────────────

describe('ValidationEngine.computeExceptionCount(metaMap)', () => {
  function fieldMeta(overrides = {}) {
    return {
      strictValid: true, strictErrorMessage: '',
      softValid: null, softViolation: '',
      exceptionRequested: false, rationale: '', rationaleValid: false,
      rationaleKeywords: [], rationaleMinLength: 30,
      ...overrides,
    };
  }

  it('returns 0 when no exceptions are active', () => {
    const meta = {
      score: fieldMeta({ softValid: false, softViolation: 'Below threshold', exceptionRequested: false }),
    };
    expect(ValidationEngine.computeExceptionCount(meta)).toBe(0);
  });

  it('returns 0 when exception is requested but rationale is invalid', () => {
    const meta = {
      score: fieldMeta({ softValid: false, softViolation: 'Below threshold',
        exceptionRequested: true, rationale: 'too short', rationaleValid: false }),
    };
    expect(ValidationEngine.computeExceptionCount(meta)).toBe(0);
  });

  it('returns 1 when one field has a valid exception (requested + valid rationale)', () => {
    const meta = {
      score: fieldMeta({ softValid: false, softViolation: 'Below threshold',
        exceptionRequested: true,
        rationale: 'This candidate is approved by the committee.',
        rationaleValid: true }),
    };
    expect(ValidationEngine.computeExceptionCount(meta)).toBe(1);
  });

  it('returns 2 when two fields have valid exceptions', () => {
    const meta = {
      score: fieldMeta({ softValid: false, exceptionRequested: true, rationaleValid: true }),
      dateOfBirth: fieldMeta({ softValid: false, exceptionRequested: true, rationaleValid: true }),
    };
    expect(ValidationEngine.computeExceptionCount(meta)).toBe(2);
  });

  it('does not count fields where softValid is not false (no violation)', () => {
    const meta = {
      score: fieldMeta({ softValid: true, exceptionRequested: true, rationaleValid: true }),
    };
    expect(ValidationEngine.computeExceptionCount(meta)).toBe(0);
  });

  it('returns 0 for an empty meta map', () => {
    expect(ValidationEngine.computeExceptionCount({})).toBe(0);
  });
});

// ── ValidationEngine.isFormEligibleForSubmission ─────────────────────────────

describe('ValidationEngine.isFormEligibleForSubmission(metaMap)', () => {
  function passingField() {
    return {
      strictValid: true, strictErrorMessage: '',
      softValid: true, softViolation: '',
      exceptionRequested: false, rationale: '', rationaleValid: false,
      rationaleKeywords: [], rationaleMinLength: 30,
    };
  }

  function softViolatedField(rationaleValid = false) {
    return {
      strictValid: true, strictErrorMessage: '',
      softValid: false, softViolation: 'Below threshold',
      exceptionRequested: false, rationale: '', rationaleValid,
      rationaleKeywords: [], rationaleMinLength: 30,
    };
  }

  it('returns false when any field has strictValid=false', () => {
    const meta = {
      fullName: { ...passingField(), strictValid: false, strictErrorMessage: 'Required.' },
      score: passingField(),
    };
    expect(ValidationEngine.isFormEligibleForSubmission(meta)).toBe(false);
  });

  it('returns false when strictValid is null (not yet evaluated)', () => {
    const meta = {
      fullName: { ...passingField(), strictValid: null },
    };
    expect(ValidationEngine.isFormEligibleForSubmission(meta)).toBe(false);
  });

  it('returns false when a soft rule is violated and no exception has been requested', () => {
    const meta = { score: softViolatedField(false) };
    expect(ValidationEngine.isFormEligibleForSubmission(meta)).toBe(false);
  });

  it('returns false when exception is requested but rationale is invalid', () => {
    const meta = { score: { ...softViolatedField(false), exceptionRequested: true } };
    expect(ValidationEngine.isFormEligibleForSubmission(meta)).toBe(false);
  });

  it('returns true when all strict fields valid and all soft violations have valid exceptions', () => {
    const meta = {
      fullName: passingField(),
      score: { ...softViolatedField(true), exceptionRequested: true },
    };
    expect(ValidationEngine.isFormEligibleForSubmission(meta)).toBe(true);
  });

  it('returns true when there are no soft violations', () => {
    const meta = {
      fullName: passingField(),
      score: passingField(),
    };
    expect(ValidationEngine.isFormEligibleForSubmission(meta)).toBe(true);
  });

  it('returns true when softValid is null (no soft rules for this field)', () => {
    const meta = {
      email: { ...passingField(), softValid: null },
    };
    expect(ValidationEngine.isFormEligibleForSubmission(meta)).toBe(true);
  });
});
