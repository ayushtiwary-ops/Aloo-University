import { query }    from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';

export const AuditService = {
  /**
   * Inserts a new audit record.
   *
   * @param {object} data - Validated body from AuditController
   * @param {string} [submittedBy] - UUID of the submitting user
   * @returns {Promise<object>} Inserted record
   */
  async create(data, submittedBy = null, candidateId = null) {
    const {
      candidateData,
      exceptionCount,
      exceptionFields = [],
      rationaleMap    = {},
      flagged,
      strictValid,
      softValid       = true,
    } = data;

    const { rows } = await query(
      `INSERT INTO audit_records
         (candidate_data, exception_count, exception_fields,
          rationale_map, flagged, strict_valid, soft_valid, submitted_by, candidate_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at, exception_count, flagged, strict_valid, soft_valid`,
      [
        JSON.stringify(candidateData),
        exceptionCount,
        JSON.stringify(exceptionFields),
        JSON.stringify(rationaleMap),
        flagged,
        strictValid,
        softValid,
        submittedBy,
        candidateId,
      ]
    );

    return rows[0];
  },

  /**
   * Returns paginated audit records, newest first.
   *
   * @param {{ page, limit, offset }} pagination
   * @returns {Promise<{ records, total, page, pages }>}
   */
  async list({ page, limit, offset }) {
    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT id, created_at, candidate_data, exception_count,
                exception_fields, rationale_map, flagged,
                strict_valid, soft_valid, submitted_by
         FROM   audit_records
         ORDER  BY created_at DESC
         LIMIT  $1 OFFSET $2`,
        [limit, offset]
      ),
      query('SELECT COUNT(*)::int AS total FROM audit_records', []),
    ]);

    const total = countResult.rows[0].total;

    return {
      records: dataResult.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  },

  /**
   * Returns all audit records for export (no pagination).
   * @returns {Promise<object[]>}
   */
  async all() {
    const { rows } = await query(
      `SELECT id, created_at, candidate_data, exception_count,
              exception_fields, rationale_map, flagged,
              strict_valid, soft_valid
       FROM   audit_records
       ORDER  BY created_at DESC`,
      []
    );
    return rows;
  },
};

// ── CSV helpers ───────────────────────────────────────────────────────────

const CANDIDATE_FIELDS = [
  'fullName', 'email', 'phone', 'dateOfBirth', 'aadhaar',
  'qualification', 'graduationYear', 'percentageOrCgpa',
  'score', 'interviewStatus', 'offerLetterSent',
];

function _csvEscape(val) {
  const s = val == null ? '' : String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/**
 * Converts audit records to a CSV string.
 * @param {object[]} records
 * @returns {string}
 */
export function recordsToCsv(records) {
  const candidateHeaders = CANDIDATE_FIELDS.map((f) => `candidate_${f}`);
  const headers = [
    'id', 'created_at',
    ...candidateHeaders,
    'exception_count', 'flagged', 'strict_valid', 'soft_valid',
  ];

  const rows = records.map((r) => {
    const cd   = r.candidate_data ?? {};
    const cols = [
      r.id,
      r.created_at,
      ...CANDIDATE_FIELDS.map((f) => cd[f] ?? ''),
      r.exception_count,
      r.flagged,
      r.strict_valid,
      r.soft_valid,
    ];
    return cols.map(_csvEscape).join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}
