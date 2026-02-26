/**
 * AnalyticsService
 *
 * Pure analytics computation over audit records.
 * Has no side effects — does not read from localStorage directly.
 * Callers pass records obtained from AuditService.getAll().
 *
 * Memoisation: each service instance caches its last result, keyed by
 * a lightweight fingerprint (record count + last record id).
 * Cache is invalidated automatically on new or cleared records.
 *
 * API:
 *   computeDashboardMetrics(records) → DashboardMetrics
 *
 * DashboardMetrics shape:
 *   total          {number}  — total submission count
 *   exceptionRate  {number}  — % of submissions with ≥1 exception (0–100 integer)
 *   flaggedRate    {number}  — % of submissions flagged for review (0–100 integer)
 *   avgExceptions  {number}  — mean exception count, 1 decimal place
 *   recentRecords  {Array}   — last 5 submissions, newest first
 */

// ── Private helpers ────────────────────────────────────────────────────────

/**
 * Lightweight fingerprint for cache invalidation.
 * Detects: new records added, log cleared, last record replaced.
 */
function _fingerprint(records) {
  const last = records[records.length - 1];
  return `${records.length}:${last?.id ?? ''}`;
}

function _pct(numerator, denominator) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function _avg(sum, count) {
  if (count === 0) return 0;
  return parseFloat((sum / count).toFixed(1));
}

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * Creates an isolated AnalyticsService instance with its own memoisation
 * cache. Tests create one instance per suite; the app uses the singleton.
 */
export function createAnalyticsService() {
  let _cache    = null;
  let _cacheKey = null;

  return {
    /**
     * Computes governance metrics from an array of audit records.
     * Results are memoised until the record set changes.
     *
     * @param   {object[]} records — from AuditService.getAll()
     * @returns {DashboardMetrics}
     */
    computeDashboardMetrics(records) {
      const key = _fingerprint(records);
      if (_cache !== null && _cacheKey === key) return _cache;

      const total = records.length;

      if (total === 0) {
        _cache    = { total: 0, exceptionRate: 0, flaggedRate: 0, avgExceptions: 0, recentRecords: [] };
        _cacheKey = key;
        return _cache;
      }

      let withExceptions = 0;
      let flaggedCount   = 0;
      let totalExceptions = 0;

      for (const rec of records) {
        const count = rec.exceptionCount ?? 0;
        if (count > 0) withExceptions++;
        if (rec.flagged)  flaggedCount++;
        totalExceptions += count;
      }

      // Newest-first slice of last 5
      const recentRecords = [...records].slice(-5).reverse();

      _cache = {
        total,
        exceptionRate:  _pct(withExceptions, total),
        flaggedRate:     _pct(flaggedCount,   total),
        avgExceptions:   _avg(totalExceptions, total),
        recentRecords,
      };
      _cacheKey = key;
      return _cache;
    },
  };
}

// ── Application singleton ──────────────────────────────────────────────────

export const AnalyticsService = createAnalyticsService();
