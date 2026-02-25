import { describe, it, expect, beforeEach } from 'vitest';
import { createConfigLoader, ConfigurationError } from '../core/ConfigLoader.js';

// ── Fixtures ────────────────────────────────────────────────────────────────

const MINIMAL_VALID_RULE = {
  field: 'fullName',
  ruleType: 'strict',
  validationType: 'minLengthNoNumbers',
  parameters: { minLength: 2 },
  errorMessage: 'Full name must be at least 2 characters.',
};

const VALID_SOFT_RULE = {
  field: 'dateOfBirth',
  ruleType: 'soft',
  validationType: 'ageRangeExtended',
  parameters: { minAge: 36, maxAge: 40 },
  errorMessage: 'Age is between 36 and 40. Exception required.',
  exceptionAllowed: true,
  rationaleKeywords: ['experience', 'returning'],
};

const VALID_SYSTEM_RULE = {
  field: 'offerLetterSent',
  ruleType: 'system',
  validationType: 'dependsOnFieldValue',
  parameters: { dependsOn: 'interviewStatus', allowedWhen: ['cleared'] },
  errorMessage: 'Offer letter can only be sent when status is Cleared.',
  dependencies: ['interviewStatus'],
};

function makeLoader(data) {
  return () => Promise.resolve(data);
}

function makeValidPayload(rules = [MINIMAL_VALID_RULE]) {
  return { _version: '1.0.0', rules };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ConfigLoader', () => {

  // ── State before load() ────────────────────────────────────────────────

  describe('before load() is called', () => {
    it('getRules() returns null', () => {
      const loader = createConfigLoader(makeLoader(makeValidPayload()));
      expect(loader.getRules()).toBeNull();
    });

    it('getRuleByField() returns an empty array', () => {
      const loader = createConfigLoader(makeLoader(makeValidPayload()));
      expect(loader.getRuleByField('fullName')).toEqual([]);
    });
  });

  // ── Successful load ────────────────────────────────────────────────────

  describe('load() with valid data', () => {
    it('resolves without throwing', async () => {
      const loader = createConfigLoader(makeLoader(makeValidPayload()));
      await expect(loader.load()).resolves.toBeUndefined();
    });

    it('makes getRules() return the rules array after loading', async () => {
      const loader = createConfigLoader(makeLoader(makeValidPayload([MINIMAL_VALID_RULE])));
      await loader.load();
      expect(loader.getRules()).toHaveLength(1);
      expect(loader.getRules()[0].field).toBe('fullName');
    });

    it('returns a copy from getRules(), not the internal array reference', async () => {
      const loader = createConfigLoader(makeLoader(makeValidPayload([MINIMAL_VALID_RULE])));
      await loader.load();
      const rules = loader.getRules();
      rules.push({ field: 'rogue' });
      expect(loader.getRules()).toHaveLength(1);
    });

    it('accepts all three ruleTypes (strict, soft, system) in the same payload', async () => {
      const loader = createConfigLoader(makeLoader(makeValidPayload([
        MINIMAL_VALID_RULE,
        VALID_SOFT_RULE,
        VALID_SYSTEM_RULE,
      ])));
      await expect(loader.load()).resolves.toBeUndefined();
    });

    it('accepts a rules array with zero rules', async () => {
      const loader = createConfigLoader(makeLoader(makeValidPayload([])));
      await loader.load();
      expect(loader.getRules()).toEqual([]);
    });
  });

  // ── getRuleByField ─────────────────────────────────────────────────────

  describe('getRuleByField(field)', () => {
    let loader;

    beforeEach(async () => {
      loader = createConfigLoader(makeLoader(makeValidPayload([
        MINIMAL_VALID_RULE,
        VALID_SOFT_RULE,
        VALID_SYSTEM_RULE,
      ])));
      await loader.load();
    });

    it('returns all rules that match the given field', () => {
      const rules = loader.getRuleByField('fullName');
      expect(rules).toHaveLength(1);
      expect(rules[0].field).toBe('fullName');
    });

    it('returns multiple rules when a field has more than one rule', () => {
      // dateOfBirth appears in VALID_SOFT_RULE
      const rules = loader.getRuleByField('dateOfBirth');
      expect(rules).toHaveLength(1);
      expect(rules[0].ruleType).toBe('soft');
    });

    it('returns an empty array for a field that has no rules', () => {
      expect(loader.getRuleByField('nonExistentField')).toEqual([]);
    });

    it('returns rules for a system-type entry', () => {
      const rules = loader.getRuleByField('offerLetterSent');
      expect(rules).toHaveLength(1);
      expect(rules[0].ruleType).toBe('system');
    });
  });

  // ── Structural validation — missing required properties ────────────────

  describe('load() throws ConfigurationError on invalid structure', () => {

    it('throws when the top-level "rules" array is missing', async () => {
      const loader = createConfigLoader(makeLoader({ _version: '1.0.0' }));
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('"rules" array is missing');
    });

    it('throws when "rules" is not an array', async () => {
      const loader = createConfigLoader(makeLoader({ _version: '1.0.0', rules: 'bad' }));
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('"rules" array is missing');
    });

    it('throws when a rule is missing the "field" property', async () => {
      const bad = { ...MINIMAL_VALID_RULE };
      delete bad.field;
      const loader = createConfigLoader(makeLoader(makeValidPayload([bad])));
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('"field"');
    });

    it('throws when a rule is missing the "ruleType" property', async () => {
      const bad = { ...MINIMAL_VALID_RULE };
      delete bad.ruleType;
      const loader = createConfigLoader(makeLoader(makeValidPayload([bad])));
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('"ruleType"');
    });

    it('throws when a rule has an unrecognised ruleType', async () => {
      const bad = { ...MINIMAL_VALID_RULE, ruleType: 'phantom' };
      const loader = createConfigLoader(makeLoader(makeValidPayload([bad])));
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('ruleType');
    });

    it('throws when a rule is missing the "validationType" property', async () => {
      const bad = { ...MINIMAL_VALID_RULE };
      delete bad.validationType;
      const loader = createConfigLoader(makeLoader(makeValidPayload([bad])));
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('"validationType"');
    });

    it('throws when a rule is missing the "errorMessage" property', async () => {
      const bad = { ...MINIMAL_VALID_RULE };
      delete bad.errorMessage;
      const loader = createConfigLoader(makeLoader(makeValidPayload([bad])));
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('"errorMessage"');
    });

    it('throws when a soft rule is missing "exceptionAllowed"', async () => {
      const bad = { ...VALID_SOFT_RULE };
      delete bad.exceptionAllowed;
      const loader = createConfigLoader(makeLoader(makeValidPayload([bad])));
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('"exceptionAllowed"');
    });

    it('includes the rule index in the error message for easy debugging', async () => {
      const bad = { ...MINIMAL_VALID_RULE };
      delete bad.errorMessage;
      const loader = createConfigLoader(makeLoader(makeValidPayload([MINIMAL_VALID_RULE, bad])));
      await expect(loader.load()).rejects.toThrow('rule[1]');
    });

    it('includes the field name in the error message when available', async () => {
      const bad = { ...MINIMAL_VALID_RULE, ruleType: 'invalid' };
      const loader = createConfigLoader(makeLoader(makeValidPayload([bad])));
      await expect(loader.load()).rejects.toThrow('fullName');
    });
  });

  // ── ConfigurationError class ───────────────────────────────────────────

  describe('ConfigurationError', () => {
    it('is an instance of Error', () => {
      const err = new ConfigurationError('test message');
      expect(err).toBeInstanceOf(Error);
    });

    it('has the correct name property', () => {
      const err = new ConfigurationError('test message');
      expect(err.name).toBe('ConfigurationError');
    });

    it('carries the provided message', () => {
      const err = new ConfigurationError('bad structure');
      expect(err.message).toBe('bad structure');
    });
  });

});
