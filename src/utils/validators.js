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
