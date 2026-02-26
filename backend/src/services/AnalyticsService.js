import { query } from '../db/pool.js';

export const AnalyticsService = {
  /**
   * Computes governance metrics entirely in SQL.
   * A single query round-trip; no application-layer aggregation.
   *
   * Returns:
   *   total          — total submission count
   *   exceptionRate  — % of submissions with exception_count > 0 (0–100 integer)
   *   flaggedRate    — % of submissions where flagged = true (0–100 integer)
   *   avgExceptions  — mean exception count (1 decimal)
   *
   * @returns {Promise<object>}
   */
  async getDashboardMetrics() {
    const { rows } = await query(
      `SELECT
         COUNT(*)::int                                         AS total,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE exception_count > 0)
           / NULLIF(COUNT(*), 0)
         )::int                                               AS "exceptionRate",
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE flagged = TRUE)
           / NULLIF(COUNT(*), 0)
         )::int                                               AS "flaggedRate",
         ROUND(
           AVG(exception_count)::numeric, 1
         )                                                    AS "avgExceptions"
       FROM audit_records`,
      []
    );

    const row = rows[0];

    // Normalise NULLs (table is empty) to clean zero values
    return {
      total:          row.total          ?? 0,
      exceptionRate:  row.exceptionRate  ?? 0,
      flaggedRate:    row.flaggedRate    ?? 0,
      avgExceptions:  parseFloat(row.avgExceptions ?? 0),
    };
  },
};
