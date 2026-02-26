/**
 * AuditService
 *
 * Durable compliance audit trail for ALOO AdmitGuard.
 *
 * Persists to localStorage under STORAGE_KEY so records survive page reloads.
 * All public methods are safe against corrupted or missing storage data.
 *
 * API:
 *   generateId()      — returns a collision-resistant unique string
 *   save(record)      — persists record; silently ignores duplicate IDs
 *   getAll()          — returns a deep copy of all persisted records
 *   clear()           — removes all records from localStorage
 *   record(event, payload) — legacy lightweight event log (console only)
 */

const STORAGE_KEY = 'aloo_admitguard_audit_log';

// ── Private helpers ────────────────────────────────────────────────────────

/**
 * Reads and parses the audit log from localStorage.
 * Returns [] on any parse error or non-array value.
 */
function _read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Serialises and writes the records array to localStorage.
 */
function _write(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * Creates an AuditService instance.
 * Multiple instances share the same localStorage key — all reads/writes go
 * through localStorage directly so instances stay in sync automatically.
 */
export function createAuditService() {
  return {
    /**
     * Returns a collision-resistant unique ID string.
     * Format: timestamp (ms) + 6 random hex chars.
     */
    generateId() {
      const ts   = Date.now().toString(36);
      const rand = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
      return `${ts}-${rand}`;
    },

    /**
     * Persists `record` to localStorage.
     * If a record with the same `id` already exists the call is a no-op.
     *
     * @param   {object} record
     * @returns {object} The saved record (same reference as input).
     */
    save(record) {
      const existing = _read();
      const isDuplicate = existing.some((r) => r.id === record.id);
      if (isDuplicate) return record;

      _write([...existing, record]);
      return record;
    },

    /**
     * Returns a deep copy of all persisted records in insertion order.
     * Safe against corrupted data — always returns an array.
     */
    getAll() {
      return _read().map((r) => ({ ...r }));
    },

    /**
     * Removes all audit records from localStorage.
     * Does not throw when called on an already-empty log.
     */
    clear() {
      localStorage.removeItem(STORAGE_KEY);
    },

    /**
     * Lightweight event logger (non-persistent).
     * Kept for compatibility with SubmitButton event tracking.
     *
     * @param {string} event
     * @param {object} payload
     */
    record(event, payload = {}) {
      console.debug(`[AuditService] ${event}`, payload);
    },
  };
}

// ── Application singleton ──────────────────────────────────────────────────

export const AuditService = createAuditService();
