/**
 * AuditService
 *
 * Durable compliance audit trail for ALOO AdmitGuard.
 *
 * Persists to localStorage under STORAGE_KEY so records survive page reloads.
 * All public methods are safe against corrupted or missing storage data.
 * Push-only: records are never overwritten once written.
 *
 * API:
 *   generateId()           — returns a collision-resistant unique string
 *   nextId()               — returns an incrementing AG-YYYY-NNNN submission ID
 *   addRecord(record)      — persists record; silently ignores duplicate IDs
 *   getAll()               — returns a deep copy of all persisted records
 *   clearAll()             — removes all records from localStorage
 *   filterByStatus(status) — returns records matching a compliance status or risk level
 *   computeAnalytics()     — returns aggregate compliance metrics
 *   record(event, payload) — lightweight non-persistent event logger
 */

const STORAGE_KEY = 'admitguard_audit_log_v1';

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

/**
 * Derives a risk level label from a numeric risk score.
 * Low: 0–20  |  Medium: 21–50  |  High: 51+
 */
function _riskLevel(score) {
  if (score <= 20) return 'Low';
  if (score <= 50) return 'Medium';
  return 'High';
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
     * Returns an incrementing submission ID in the format AG-YYYY-NNNN.
     * Counter is persisted to localStorage so it survives page reloads.
     * Format: AG-2026-0001, AG-2026-0002, …
     */
    nextId() {
      const COUNTER_KEY = 'admitguard_submission_counter';
      const year = new Date().getFullYear();
      try {
        const raw = localStorage.getItem(COUNTER_KEY);
        const data = raw ? JSON.parse(raw) : {};
        const count = (data.year === year ? (data.count ?? 0) : 0) + 1;
        localStorage.setItem(COUNTER_KEY, JSON.stringify({ year, count }));
        return `AG-${year}-${String(count).padStart(4, '0')}`;
      } catch {
        return `AG-${year}-XXXX`;
      }
    },

    /**
     * Persists `record` to localStorage (push-only — never overwrites).
     * If a record with the same `id` already exists the call is a no-op.
     *
     * Also registers the candidate email in the uniqueness registry so that
     * the emailUniqueness validator can check it.
     *
     * @param   {object} record
     * @returns {object} The saved record (same reference as input).
     */
    addRecord(record) {
      const existing = _read();
      const isDuplicate = existing.some((r) => r.id === record.id);
      if (isDuplicate) return record;

      _write([...existing, record]);

      // Register email for uniqueness checks
      try {
        const email = record.candidateSnapshot?.email;
        if (email) {
          const EMAIL_REGISTRY_KEY = 'admitguard_registered_emails';
          const raw = localStorage.getItem(EMAIL_REGISTRY_KEY);
          const registry = Array.isArray(JSON.parse(raw ?? '[]'))
            ? JSON.parse(raw ?? '[]')
            : [];
          if (!registry.some((e) => e.toLowerCase() === email.toLowerCase())) {
            registry.push(email.toLowerCase());
            localStorage.setItem(EMAIL_REGISTRY_KEY, JSON.stringify(registry));
          }
        }
      } catch { /* storage errors are non-fatal */ }

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
    clearAll() {
      localStorage.removeItem(STORAGE_KEY);
    },

    /**
     * Returns records matching a compliance status filter.
     *
     * @param {string|null} status
     *   'All' | null         → all records
     *   'Clean'              → eligibilityStatus === 'Clean'
     *   'With Exceptions'    → eligibilityStatus === 'With Exceptions'
     *   'Flagged'            → eligibilityStatus === 'Flagged'
     *   'High Risk'          → riskScore derives to 'High' level (51+)
     * @returns {object[]} Shallow copies of matching records.
     */
    filterByStatus(status) {
      const all = _read();
      if (!status || status === 'All') return all.map((r) => ({ ...r }));
      if (status === 'High Risk') {
        return all
          .filter((r) => _riskLevel(r.riskScore ?? 0) === 'High')
          .map((r) => ({ ...r }));
      }
      return all
        .filter((r) => r.validationSummary?.eligibilityStatus === status)
        .map((r) => ({ ...r }));
    },

    /**
     * Computes aggregate compliance metrics from all stored records.
     *
     * @returns {{
     *   total:            number,
     *   cleanCount:       number,
     *   exceptionCount:   number,   // records with eligibilityStatus 'With Exceptions'
     *   flaggedCount:     number,
     *   avgExceptions:    number,   // 1 decimal place
     *   riskDistribution: { low: number, medium: number, high: number }
     * }}
     */
    computeAnalytics() {
      const records = _read();
      const total   = records.length;

      let cleanCount       = 0;
      let withExceptions   = 0;
      let flaggedCount     = 0;
      let totalExceptions  = 0;
      let lowRisk = 0, medRisk = 0, highRisk = 0;

      for (const r of records) {
        const es = r.validationSummary?.eligibilityStatus;
        if      (es === 'Clean')           cleanCount++;
        else if (es === 'With Exceptions') withExceptions++;
        else if (es === 'Flagged')         flaggedCount++;

        totalExceptions += r.validationSummary?.exceptionCount ?? 0;

        const level = _riskLevel(r.riskScore ?? 0);
        if      (level === 'Low')    lowRisk++;
        else if (level === 'Medium') medRisk++;
        else                         highRisk++;
      }

      const avgExceptions = total === 0
        ? 0
        : parseFloat((totalExceptions / total).toFixed(1));

      return {
        total,
        cleanCount,
        exceptionCount: withExceptions,
        flaggedCount,
        avgExceptions,
        riskDistribution: { low: lowRisk, medium: medRisk, high: highRisk },
      };
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
