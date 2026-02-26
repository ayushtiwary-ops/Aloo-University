import { query } from '../db/pool.js';

export const AnalyticsService = {
  /**
   * Returns full governance metrics in a single DB round-trip.
   *
   * Shape:
   *   total, strictPassRate, softRate, flaggedRate, avgExceptions,
   *   last7DaysTrend: [{ date, count }],
   *   tierDistribution: { clean, soft, flagged }
   */
  async getDashboardMetrics() {
    const { rows } = await query(
      `WITH agg AS (
         SELECT
           COUNT(*)::int                                                  AS total,
           ROUND(100.0 * COUNT(*) FILTER (WHERE strict_valid = TRUE)
                 / NULLIF(COUNT(*), 0))::int                             AS "strictPassRate",
           ROUND(100.0 * COUNT(*) FILTER (WHERE exception_count > 0)
                 / NULLIF(COUNT(*), 0))::int                             AS "softRate",
           ROUND(100.0 * COUNT(*) FILTER (WHERE flagged = TRUE)
                 / NULLIF(COUNT(*), 0))::int                             AS "flaggedRate",
           ROUND(AVG(exception_count)::numeric, 1)                       AS "avgExceptions",
           COUNT(*) FILTER (WHERE exception_count = 0 AND flagged = FALSE)::int AS clean,
           COUNT(*) FILTER (WHERE exception_count > 0 AND flagged = FALSE)::int AS soft,
           COUNT(*) FILTER (WHERE flagged = TRUE)::int                   AS flagged
         FROM audit_records
       ),
       trend AS (
         SELECT
           COALESCE(
             JSON_AGG(
               JSON_BUILD_OBJECT('date', day::text, 'count', cnt)
               ORDER BY day
             ),
             '[]'::json
           ) AS trend_data
         FROM (
           SELECT DATE(submitted_at) AS day, COUNT(*)::int AS cnt
             FROM audit_records
            WHERE submitted_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(submitted_at)
         ) t
       )
       SELECT agg.*, trend.trend_data
         FROM agg, trend`,
      []
    );

    const row = rows[0];
    return {
      total:            row.total           ?? 0,
      strictPassRate:   row.strictPassRate  ?? 0,
      softRate:         row.softRate        ?? 0,
      flaggedRate:      row.flaggedRate     ?? 0,
      avgExceptions:    parseFloat(row.avgExceptions ?? 0),
      last7DaysTrend:   row.trend_data      ?? [],
      tierDistribution: {
        clean:   row.clean   ?? 0,
        soft:    row.soft    ?? 0,
        flagged: row.flagged ?? 0,
      },
    };
  },
};
