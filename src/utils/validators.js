/**
 * validators.js
 *
 * Pure utility functions for individual value checks.
 * All functions are stateless and side-effect-free.
 * Called by ValidationEngine — never by UI components directly.
 *
 * Each function returns a boolean.
 * Error messages are owned by rules.json, not by these functions.
 */

/** Value is a non-empty string with length >= minLength and no digit characters. */
export function isMinLengthNoNumbers(value, minLength) {
  if (typeof value !== 'string' || value.trim().length < minLength) return false;
  return !/\d/.test(value);
}

/** Value matches a basic email pattern: local@domain.tld */
export function isEmailFormat(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Value is a 10-digit string whose first digit is one of the allowed prefixes.
 * Handles both string and numeric input.
 */
export function isIndianMobile(value, digitCount, allowedPrefixes) {
  const str = String(value).trim();
  if (str.length !== digitCount) return false;
  if (!/^\d+$/.test(str)) return false;
  return allowedPrefixes.includes(str[0]);
}

/** Value is a string of exactly digitCount numeric characters, no spaces. */
export function isAadhaarFormat(value, digitCount) {
  const str = String(value).trim();
  return str.length === digitCount && /^\d+$/.test(str);
}

/** Value is contained in the allowedValues array. */
export function isAllowedValue(value, allowedValues) {
  return allowedValues.includes(value);
}

/**
 * Value (as string or number) parses to an integer within [min, max].
 * Rejects non-numeric strings and decimals.
 */
export function isIntegerRange(value, min, max) {
  const str = String(value).trim();
  if (str === '' || !/^-?\d+$/.test(str)) return false;
  const n = parseInt(str, 10);
  return n >= min && n <= max;
}

/**
 * Value (as string or number) parses to a float within [min, max].
 * Used for CGPA which can be decimal.
 */
export function isNumericRange(value, min, max) {
  const str = String(value).trim();
  if (str === '') return false;
  const n = parseFloat(str);
  if (isNaN(n)) return false;
  return n >= min && n <= max;
}

/**
 * Checks whether value (an email) appears in the localStorage registry.
 * Comparison is case-insensitive.
 * Returns true if the email is NOT already registered (i.e., it is unique).
 */
export function isEmailUnique(value, registryKey) {
  try {
    const raw = localStorage.getItem(registryKey);
    if (!raw) return true;
    const registry = JSON.parse(raw);
    if (!Array.isArray(registry)) return true;
    return !registry.some((e) => e.toLowerCase() === value.toLowerCase());
  } catch {
    return true; // treat parse errors as non-blocking
  }
}

// ── Soft-rule primitives ──────────────────────────────────────────────────────
//
// Each function tests whether a SOFT VIOLATION CONDITION is present.
// Returns true  = the condition EXISTS (violation fires).
// Returns false = the condition does NOT exist (no soft violation).
//
// Empty / unparseable values always return false so unfilled fields
// never display amber warnings before the user has interacted with them.

/**
 * Computes the candidate's age from a dateOfBirth string (YYYY-MM-DD format)
 * and returns true if that age falls within [minAge, maxAge] inclusive.
 * Returns false for empty or invalid dates.
 */
export function isAgeInRange(dobString, minAge, maxAge) {
  if (!dobString) return false;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return false;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= minAge && age <= maxAge;
}

/**
 * Returns true when the graduation year is "recent" — i.e. within
 * recentYearsThreshold years of the current calendar year (inclusive).
 * A threshold of 0 means only the current year triggers the violation.
 * Returns false for empty or non-numeric input.
 */
export function isGraduationYearRecent(yearString, recentYearsThreshold) {
  if (!yearString) return false;
  const year = parseInt(yearString, 10);
  if (isNaN(year)) return false;
  const currentYear = new Date().getFullYear();
  return year >= currentYear - recentYearsThreshold && year <= currentYear;
}

/**
 * Returns true when the academic score is ABOVE OR EQUAL TO the minimum
 * threshold for the active grading mode.
 * Returns false when the score is below threshold (violation condition).
 * Returns false for empty or non-numeric input.
 *
 * Note: returns the PASS result (true = above threshold) to follow the
 * same semantics as isNumericRange. The soft validator inverts this.
 */
export function isAboveMinimumAcademic(value, gradingMode, percentageMin, cgpaMin) {
  if (value === '' || value === null || value === undefined) return false;
  const n = parseFloat(String(value));
  if (isNaN(n)) return false;
  const mode = gradingMode === 'cgpa' ? 'cgpa' : 'percentage';
  return mode === 'cgpa' ? n >= cgpaMin : n >= percentageMin;
}

/**
 * Returns true when the score is >= the minimum passing score.
 * Returns false for empty or non-numeric input.
 */
export function isAboveMinimumScore(value, minimum) {
  if (value === '' || value === null || value === undefined) return false;
  const n = parseFloat(String(value));
  if (isNaN(n)) return false;
  return n >= minimum;
}

/**
 * Returns true when the rationale text:
 *   1. Has at least minLength characters, AND
 *   2. Contains at least one of the governance keywords (case-insensitive).
 *
 * Returns false for empty, null, or invalid input.
 */
export function isValidRationale(rationale, minLength, keywords) {
  if (!rationale || typeof rationale !== 'string') return false;
  if (rationale.length < minLength) return false;
  const lower = rationale.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}
