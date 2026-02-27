import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ValidationEngine } from '../core/ValidationEngine.js';

// ── Rule Fixtures (v2 schema) ─────────────────────────────────────────────────
// Minimal rule objects that mirror the new rules.json structure.
// Tests inject these directly — no ConfigLoader dependency.
//
// v2 schema: type (not ruleType), validation.custom (not validationType),
//            constraints (not parameters).

const R = {
  fullName: {
    field: 'fullName', type: 'strict',
    validation: { custom: 'minLengthNoNumbers' },
    constraints: { minLength: 2 },
    errorMessage: 'Full name must be at least 2 characters and must not contain numbers.',
  },
  emailFormat: {
    field: 'email', type: 'strict',
    validation: { custom: 'isEmail' },
    constraints: {},
    errorMessage: 'Enter a valid email address.',
  },
  emailUniqueness: {
    field: 'email', type: 'strict',
    validation: { custom: 'emailUniqueness' },
    constraints: { registryKey: 'ag_test_emails' },
    errorMessage: 'This email has already been registered.',
  },
  phone: {
    field: 'phone', type: 'strict',
    validation: { custom: 'isIndianPhone' },
    constraints: { digitCount: 10, allowedPrefixes: ['6', '7', '8', '9'] },
    errorMessage: 'Phone must be a 10-digit Indian mobile starting with 6–9.',
  },
  aadhaar: {
    field: 'aadhaar', type: 'strict',
    validation: { custom: 'isAadhaar' },
    constraints: { digitCount: 12 },
    errorMessage: 'Aadhaar must be exactly 12 digits.',
  },
  qualification: {
    field: 'qualification', type: 'strict',
    validation: { custom: 'allowedValue' },
    constraints: { allowedValues: ['ssc', 'hsc', 'diploma', 'bachelors', 'masters', 'phd'] },
    errorMessage: 'Select a valid qualification.',
  },
  score: {
    field: 'score', type: 'strict',
    validation: { custom: 'integerRange' },
    constraints: { min: 0, max: 100 },
    errorMessage: 'Score must be 0–100.',
  },
  interviewAllowed: {
    field: 'interviewStatus', type: 'strict',
    validation: { custom: 'allowedValue' },
    constraints: { allowedValues: ['cleared', 'waitlisted', 'rejected'] },
    errorMessage: 'Select a valid interview status.',
  },
  interviewBlock: {
    field: 'interviewStatus', type: 'system',
    validation: { custom: 'blocksSubmissionWhenValue' },
    constraints: { blockedValues: ['rejected'] },
    errorMessage: 'Cannot submit a rejected application.',
  },
  percentageScore: {
    field: 'percentageOrCgpa', type: 'strict',
    validation: { custom: 'scoreByGradingMode', dependencies: ['gradingMode'] },
    constraints: {
      percentage: { min: 0, max: 100 },
      cgpa:       { min: 0, max: 10  },
    },
    errorMessage: 'Enter a valid score.',
  },
  offerLetterDep: {
    field: 'offerLetterSent', type: 'system',
    validation: { custom: 'interviewOfferDependency', dependencies: ['interviewStatus'] },
    constraints: {
      dependsOn: 'interviewStatus',
      allowedWhen: ['cleared'],
    },
    errorMessage: 'Offer letter can only be sent when status is Cleared.',
  },
  blocksOfferWhenRejected: {
    field: 'interviewStatus', type: 'system',
    validation: { custom: 'blocksFieldWhenValue', dependencies: ['offerLetterSent'] },
    constraints: { blockedField: 'offerLetterSent', blockedFieldValue: true, whenValue: 'rejected' },
    errorMessage: 'Offer letter cannot be issued to a rejected candidate.',
  },
};

const EMPTY_STATE = {
  fullName: '', email: '', phone: '', dateOfBirth: '',
  aadhaar: '', qualification: '', graduationYear: '',
  percentageOrCgpa: '', gradingMode: 'percentage',
  score: '', interviewStatus: '', offerLetterSent: '',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function validate(fieldId, value, rules, state = EMPTY_STATE) {
  return ValidationEngine.validateField(fieldId, value, { ...EMPTY_STATE, ...state }, rules);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ValidationEngine', () => {

  // ── minLengthNoNumbers ───────────────────────────────────────────────────

  describe('minLengthNoNumbers (fullName)', () => {
    it('rejects empty string', () => {
      expect(validate('fullName', '', [R.fullName]).isValid).toBe(false);
    });

    it('rejects name shorter than minLength', () => {
      expect(validate('fullName', 'A', [R.fullName]).isValid).toBe(false);
    });

    it('rejects name containing a digit', () => {
      expect(validate('fullName', 'John2', [R.fullName]).isValid).toBe(false);
    });

    it('rejects name that is only digits', () => {
      expect(validate('fullName', '12345', [R.fullName]).isValid).toBe(false);
    });

    it('accepts a valid two-character name', () => {
      expect(validate('fullName', 'Jo', [R.fullName]).isValid).toBe(true);
    });

    it('accepts a full name with spaces and hyphens', () => {
      expect(validate('fullName', 'Ananya Singh-Rao', [R.fullName]).isValid).toBe(true);
    });

    it('returns the configured errorMessage on failure', () => {
      const result = validate('fullName', '', [R.fullName]);
      expect(result.message).toBe(R.fullName.errorMessage);
    });

    it('returns null message on success', () => {
      expect(validate('fullName', 'Ananya', [R.fullName]).message).toBeNull();
    });
  });

  // ── isEmail ──────────────────────────────────────────────────────────────

  describe('isEmail (emailFormat)', () => {
    it('rejects empty string', () => {
      expect(validate('email', '', [R.emailFormat]).isValid).toBe(false);
    });

    it('rejects string without @ symbol', () => {
      expect(validate('email', 'notanemail', [R.emailFormat]).isValid).toBe(false);
    });

    it('rejects string without domain', () => {
      expect(validate('email', 'user@', [R.emailFormat]).isValid).toBe(false);
    });

    it('rejects string without TLD', () => {
      expect(validate('email', 'user@domain', [R.emailFormat]).isValid).toBe(false);
    });

    it('accepts a standard email address', () => {
      expect(validate('email', 'candidate@university.edu', [R.emailFormat]).isValid).toBe(true);
    });

    it('accepts an email with dots in local part', () => {
      expect(validate('email', 'first.last@domain.com', [R.emailFormat]).isValid).toBe(true);
    });
  });

  // ── emailUniqueness ──────────────────────────────────────────────────────

  describe('emailUniqueness', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it('accepts an email not in the registry', () => {
      expect(validate('email', 'new@domain.com', [R.emailUniqueness]).isValid).toBe(true);
    });

    it('rejects an email that is already in the registry', () => {
      localStorage.setItem('ag_test_emails', JSON.stringify(['existing@domain.com']));
      expect(validate('email', 'existing@domain.com', [R.emailUniqueness]).isValid).toBe(false);
    });

    it('comparison is case-insensitive', () => {
      localStorage.setItem('ag_test_emails', JSON.stringify(['User@Domain.COM']));
      expect(validate('email', 'user@domain.com', [R.emailUniqueness]).isValid).toBe(false);
    });

    it('accepts when registry key is missing from localStorage', () => {
      expect(validate('email', 'fresh@domain.com', [R.emailUniqueness]).isValid).toBe(true);
    });

    it('accepts when registry is an empty array', () => {
      localStorage.setItem('ag_test_emails', JSON.stringify([]));
      expect(validate('email', 'fresh@domain.com', [R.emailUniqueness]).isValid).toBe(true);
    });
  });

  // ── isIndianPhone ────────────────────────────────────────────────────────

  describe('isIndianPhone (phone)', () => {
    it('rejects empty string', () => {
      expect(validate('phone', '', [R.phone]).isValid).toBe(false);
    });

    it('rejects number starting with 5 (invalid prefix)', () => {
      expect(validate('phone', '5876543210', [R.phone]).isValid).toBe(false);
    });

    it('rejects number with only 9 digits', () => {
      expect(validate('phone', '987654321', [R.phone]).isValid).toBe(false);
    });

    it('rejects number with 11 digits', () => {
      expect(validate('phone', '98765432100', [R.phone]).isValid).toBe(false);
    });

    it('rejects number containing letters', () => {
      expect(validate('phone', '98765ABC10', [R.phone]).isValid).toBe(false);
    });

    it('accepts a valid number starting with 6', () => {
      expect(validate('phone', '6789012345', [R.phone]).isValid).toBe(true);
    });

    it('accepts a valid number starting with 9', () => {
      expect(validate('phone', '9876543210', [R.phone]).isValid).toBe(true);
    });
  });

  // ── isAadhaar ────────────────────────────────────────────────────────────

  describe('isAadhaar (aadhaarFormat)', () => {
    it('rejects empty string', () => {
      expect(validate('aadhaar', '', [R.aadhaar]).isValid).toBe(false);
    });

    it('rejects 11-digit number', () => {
      expect(validate('aadhaar', '12345678901', [R.aadhaar]).isValid).toBe(false);
    });

    it('rejects 13-digit number', () => {
      expect(validate('aadhaar', '1234567890123', [R.aadhaar]).isValid).toBe(false);
    });

    it('rejects 12-character string with letters', () => {
      expect(validate('aadhaar', '1234567890AB', [R.aadhaar]).isValid).toBe(false);
    });

    it('rejects string with spaces', () => {
      expect(validate('aadhaar', '1234 5678 9012', [R.aadhaar]).isValid).toBe(false);
    });

    it('accepts a valid 12-digit numeric string', () => {
      expect(validate('aadhaar', '123456789012', [R.aadhaar]).isValid).toBe(true);
    });
  });

  // ── allowedValue ─────────────────────────────────────────────────────────

  describe('allowedValue (qualification)', () => {
    it('rejects empty string', () => {
      expect(validate('qualification', '', [R.qualification]).isValid).toBe(false);
    });

    it('rejects a value not in the allowed list', () => {
      expect(validate('qualification', 'certificate', [R.qualification]).isValid).toBe(false);
    });

    it('accepts each value in the allowedValues list', () => {
      const allowed = ['ssc', 'hsc', 'diploma', 'bachelors', 'masters', 'phd'];
      allowed.forEach((v) => {
        expect(validate('qualification', v, [R.qualification]).isValid).toBe(true);
      });
    });
  });

  // ── integerRange ─────────────────────────────────────────────────────────

  describe('integerRange (score)', () => {
    it('rejects empty string', () => {
      expect(validate('score', '', [R.score]).isValid).toBe(false);
    });

    it('rejects a value below the minimum (negative)', () => {
      expect(validate('score', '-1', [R.score]).isValid).toBe(false);
    });

    it('rejects a value above the maximum', () => {
      expect(validate('score', '101', [R.score]).isValid).toBe(false);
    });

    it('rejects a non-numeric string', () => {
      expect(validate('score', 'abc', [R.score]).isValid).toBe(false);
    });

    it('accepts boundary value 0', () => {
      expect(validate('score', '0', [R.score]).isValid).toBe(true);
    });

    it('accepts boundary value 100', () => {
      expect(validate('score', '100', [R.score]).isValid).toBe(true);
    });

    it('accepts a value in the middle of the range', () => {
      expect(validate('score', '75', [R.score]).isValid).toBe(true);
    });
  });

  // ── scoreByGradingMode ───────────────────────────────────────────────────

  describe('scoreByGradingMode (percentageOrCgpa)', () => {
    it('rejects empty string regardless of mode', () => {
      expect(validate('percentageOrCgpa', '', [R.percentageScore], { gradingMode: 'percentage' }).isValid).toBe(false);
      expect(validate('percentageOrCgpa', '', [R.percentageScore], { gradingMode: 'cgpa' }).isValid).toBe(false);
    });

    it('rejects percentage value above 100', () => {
      expect(validate('percentageOrCgpa', '101', [R.percentageScore], { gradingMode: 'percentage' }).isValid).toBe(false);
    });

    it('rejects percentage value below 0', () => {
      expect(validate('percentageOrCgpa', '-1', [R.percentageScore], { gradingMode: 'percentage' }).isValid).toBe(false);
    });

    it('accepts percentage boundary value 100', () => {
      expect(validate('percentageOrCgpa', '100', [R.percentageScore], { gradingMode: 'percentage' }).isValid).toBe(true);
    });

    it('accepts percentage boundary value 0', () => {
      expect(validate('percentageOrCgpa', '0', [R.percentageScore], { gradingMode: 'percentage' }).isValid).toBe(true);
    });

    it('rejects CGPA value above 10', () => {
      expect(validate('percentageOrCgpa', '10.5', [R.percentageScore], { gradingMode: 'cgpa' }).isValid).toBe(false);
    });

    it('accepts CGPA boundary value 10', () => {
      expect(validate('percentageOrCgpa', '10', [R.percentageScore], { gradingMode: 'cgpa' }).isValid).toBe(true);
    });

    it('rejects a percentage value of 55 as invalid CGPA (> 10)', () => {
      expect(validate('percentageOrCgpa', '55', [R.percentageScore], { gradingMode: 'cgpa' }).isValid).toBe(false);
    });
  });

  // ── blocksSubmissionWhenValue (interviewStatus) ──────────────────────────

  describe('blocksSubmissionWhenValue (interviewStatus)', () => {
    it('blocks submission when value is in blockedValues list', () => {
      expect(validate('interviewStatus', 'rejected', [R.interviewBlock]).isValid).toBe(false);
    });

    it('does not block when value is not in the blocked list', () => {
      expect(validate('interviewStatus', 'cleared', [R.interviewBlock]).isValid).toBe(true);
      expect(validate('interviewStatus', 'waitlisted', [R.interviewBlock]).isValid).toBe(true);
    });

    it('returns the configured errorMessage when blocked', () => {
      const result = validate('interviewStatus', 'rejected', [R.interviewBlock]);
      expect(result.message).toBe(R.interviewBlock.errorMessage);
    });
  });

  // ── interviewOfferDependency (offerLetterSent) ───────────────────────────

  describe('interviewOfferDependency (offerLetterSent)', () => {
    it('accepts true when interviewStatus is cleared', () => {
      expect(validate('offerLetterSent', true, [R.offerLetterDep], { interviewStatus: 'cleared' }).isValid).toBe(true);
    });

    it('rejects true when interviewStatus is rejected', () => {
      expect(validate('offerLetterSent', true, [R.offerLetterDep], { interviewStatus: 'rejected' }).isValid).toBe(false);
    });

    it('rejects true when interviewStatus is waitlisted', () => {
      expect(validate('offerLetterSent', true, [R.offerLetterDep], { interviewStatus: 'waitlisted' }).isValid).toBe(false);
    });

    it('accepts false regardless of interview status', () => {
      ['cleared', 'waitlisted', 'rejected', ''].forEach((status) => {
        expect(validate('offerLetterSent', false, [R.offerLetterDep], { interviewStatus: status }).isValid).toBe(true);
      });
    });

    it('accepts empty string (not yet set) regardless of status', () => {
      expect(validate('offerLetterSent', '', [R.offerLetterDep], { interviewStatus: 'rejected' }).isValid).toBe(true);
    });
  });

  // ── Multiple rules on the same field ─────────────────────────────────────

  describe('multiple rules on one field (email)', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it('fails on format rule before even checking uniqueness', () => {
      localStorage.setItem('ag_test_emails', JSON.stringify(['bad-format']));
      const result = validate('email', 'bad-format', [R.emailFormat, R.emailUniqueness]);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(R.emailFormat.errorMessage);
    });

    it('fails on uniqueness when format passes but email is registered', () => {
      localStorage.setItem('ag_test_emails', JSON.stringify(['dup@test.com']));
      const result = validate('email', 'dup@test.com', [R.emailFormat, R.emailUniqueness]);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(R.emailUniqueness.errorMessage);
    });

    it('passes when format is valid and email is not registered', () => {
      const result = validate('email', 'fresh@test.com', [R.emailFormat, R.emailUniqueness]);
      expect(result.isValid).toBe(true);
    });
  });

  // ── Field with no strict rules ────────────────────────────────────────────

  describe('field with no matching strict rules', () => {
    it('returns isValid true when rules array is empty', () => {
      expect(validate('gradingMode', 'percentage', []).isValid).toBe(true);
    });

    it('skips soft rules — only evaluates strict and system', () => {
      const softOnly = { ...R.qualification, type: 'soft', exceptionAllowed: true };
      expect(validate('qualification', '', [softOnly]).isValid).toBe(true);
    });
  });

  // ── getDependentsOf ───────────────────────────────────────────────────────

  describe('getDependentsOf(fieldId, allRules)', () => {
    const allRules = [R.percentageScore, R.offerLetterDep, R.blocksOfferWhenRejected, R.fullName];

    it('returns fields that list the given field in their dependencies', () => {
      const deps = ValidationEngine.getDependentsOf('interviewStatus', allRules);
      expect(deps).toContain('offerLetterSent');
    });

    it('returns fields that depend on gradingMode', () => {
      const deps = ValidationEngine.getDependentsOf('gradingMode', allRules);
      expect(deps).toContain('percentageOrCgpa');
    });

    it('returns empty array when no fields depend on the given field', () => {
      expect(ValidationEngine.getDependentsOf('fullName', allRules)).toEqual([]);
    });

    it('does not return duplicates', () => {
      const deps = ValidationEngine.getDependentsOf('interviewStatus', allRules);
      const unique = [...new Set(deps)];
      expect(deps).toEqual(unique);
    });
  });

  // ── isFormStrictlyValid ───────────────────────────────────────────────────

  describe('isFormStrictlyValid(formState, getRulesFn)', () => {
    function getRules(fieldId) {
      const map = {
        fullName: [R.fullName],
        email: [R.emailFormat],
        interviewStatus: [R.interviewAllowed, R.interviewBlock],
        offerLetterSent: [R.offerLetterDep],
      };
      return map[fieldId] || [];
    }

    it('returns false when a strict field has an invalid value', () => {
      const state = { ...EMPTY_STATE, fullName: '', email: 'x@y.com', interviewStatus: 'cleared', offerLetterSent: false };
      expect(ValidationEngine.isFormStrictlyValid(state, getRules)).toBe(false);
    });

    it('returns false when interviewStatus is rejected (system rule)', () => {
      const state = {
        ...EMPTY_STATE,
        fullName: 'Ananya', email: 'a@b.com',
        interviewStatus: 'rejected', offerLetterSent: false,
      };
      expect(ValidationEngine.isFormStrictlyValid(state, getRules)).toBe(false);
    });

    it('returns false when offerLetterSent is true but status is not cleared', () => {
      const state = {
        ...EMPTY_STATE,
        fullName: 'Ananya', email: 'a@b.com',
        interviewStatus: 'waitlisted', offerLetterSent: true,
      };
      expect(ValidationEngine.isFormStrictlyValid(state, getRules)).toBe(false);
    });

    it('returns true when all fields pass their strict rules', () => {
      const state = {
        ...EMPTY_STATE,
        fullName: 'Ananya Singh', email: 'ananya@test.com',
        interviewStatus: 'cleared', offerLetterSent: false,
      };
      expect(ValidationEngine.isFormStrictlyValid(state, getRules)).toBe(true);
    });
  });

});
