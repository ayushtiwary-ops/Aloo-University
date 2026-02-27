/**
 * ConfigLoader
 *
 * Loads rules.json at application startup, validates every rule object
 * against the schema contract, and exposes a clean query interface to
 * the rest of the system.
 *
 * Design decisions:
 *
 * - Factory function (not singleton) so tests inject a fake loader and
 *   get a fully isolated instance. Production code uses the exported
 *   singleton `ConfigLoader`.
 *
 * - All validation happens inside load(). If rules.json is structurally
 *   invalid the application throws immediately at boot — fail-fast rather
 *   than silently serving broken configuration to ValidationEngine later.
 *
 * - ConfigurationError is a named Error subclass so callers can
 *   `catch (e) { if (e instanceof ConfigurationError) ... }` and handle
 *   config failures separately from network failures.
 *
 * - getRuleByField() filters at query time rather than pre-indexing.
 *   The rule set is small (<30 objects) so linear scan is fine.
 *   Pre-indexing would add complexity for no measurable gain.
 *
 * - No rule evaluation logic lives here. This module knows only about
 *   structure, not about what the rules mean.
 */

// ── ConfigurationError ────────────────────────────────────────────────────

export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// ── Validation ────────────────────────────────────────────────────────────

const ALLOWED_RULE_TYPES = ['strict', 'soft', 'system'];

// v2 schema uses `type` (was `ruleType`). `validationType` is no longer
// required at the config layer — the validator key lives in validation.custom
// and is resolved by ValidationEngine at runtime.
const REQUIRED_PROPERTIES = ['field', 'type', 'errorMessage'];

/**
 * Validates a single rule object. Throws ConfigurationError with a
 * message containing the rule index and field name (when available) so
 * the author knows exactly which entry in rules.json is broken.
 *
 * @param {object} rule
 * @param {number} index
 * @throws {ConfigurationError}
 */
function validateRule(rule, index) {
  const location = `rule[${index}]${rule.field ? ` (field: "${rule.field}")` : ''}`;

  for (const prop of REQUIRED_PROPERTIES) {
    if (rule[prop] === undefined || rule[prop] === null || rule[prop] === '') {
      throw new ConfigurationError(
        `[ConfigLoader] ${location} is missing required property "${prop}".`
      );
    }
  }

  if (!ALLOWED_RULE_TYPES.includes(rule.type)) {
    throw new ConfigurationError(
      `[ConfigLoader] ${location} has unrecognised type "${rule.type}". ` +
      `Allowed values: ${ALLOWED_RULE_TYPES.join(', ')}.`
    );
  }

  if (rule.type === 'soft' && rule.exceptionAllowed === undefined) {
    throw new ConfigurationError(
      `[ConfigLoader] ${location} is a soft rule and must declare "exceptionAllowed" (true or false).`
    );
  }
}

/**
 * Validates the top-level payload structure and every rule object within it.
 *
 * @param {*} payload - Raw parsed JSON from rules.json
 * @throws {ConfigurationError}
 */
function validatePayload(payload) {
  if (!payload || !Array.isArray(payload.rules)) {
    throw new ConfigurationError(
      '[ConfigLoader] Invalid rules.json: top-level "rules" array is missing or not an array.'
    );
  }

  payload.rules.forEach((rule, index) => validateRule(rule, index));
}

// ── Factory ───────────────────────────────────────────────────────────────

/**
 * Creates an isolated ConfigLoader instance.
 *
 * @param {function(): Promise<object>} loaderFn
 *   Async function that returns the raw rules.json payload.
 *   Defaults to fetching from /src/config/rules.json.
 *   Inject a custom function in tests.
 *
 * @returns {ConfigLoaderInstance}
 */
export function createConfigLoader(loaderFn = _defaultLoader) {
  let _rules = null;

  return {
    /**
     * Loads rules from loaderFn, validates every rule against the schema
     * contract, and caches the result. Throws ConfigurationError on any
     * structural violation.
     *
     * @returns {Promise<void>}
     * @throws  {ConfigurationError}
     */
    async load() {
      const payload = await loaderFn();
      validatePayload(payload);
      _rules = payload.rules;
    },

    /**
     * Returns a copy of the full rules array, or null if load() has not
     * been called yet.
     *
     * @returns {object[] | null}
     */
    getRules() {
      return _rules === null ? null : [..._rules];
    },

    /**
     * Returns all rules whose `field` property matches the given field id.
     * Returns an empty array — never null — so callers do not need a
     * null check before iterating.
     *
     * @param   {string} field
     * @returns {object[]}
     */
    getRuleByField(field) {
      if (_rules === null) return [];
      return _rules.filter((rule) => rule.field === field);
    },
  };
}

// ── Default loader (production) ───────────────────────────────────────────

async function _defaultLoader() {
  const response = await fetch('/src/config/rules.json');
  if (!response.ok) {
    throw new ConfigurationError(
      `[ConfigLoader] Failed to fetch rules.json: HTTP ${response.status}`
    );
  }
  return response.json();
}

// ── Application singleton ─────────────────────────────────────────────────

/**
 * The application-level instance. main.js calls ConfigLoader.load() once
 * at startup. All other modules call getRules() / getRuleByField().
 */
export const ConfigLoader = createConfigLoader();
