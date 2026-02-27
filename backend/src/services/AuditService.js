import { query }    from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';

export const AuditService = {
  /**
   * Inserts a new audit record.
   * candidateData is stored in the data JSONB column;
   * candidate_name, email, phone are extracted as top-level columns.
   *
   * Rejects with 400 if strictValid is false — strict rule violations must
   * never reach the database; the frontend should prevent submission, and the
   * backend enforces this as a safety net.
   *
   * @param {object} body        - Validated request body
   * @param {string|null} submittedBy - UUID of submitting user (null for public)
   * @returns {Promise<object>}
   */
  async create(body, submittedBy = null) {
    const {
      candidateData   = {},
      exceptionCount  = 0,
      exceptionFields = [],
      rationaleMap    = {},
      flagged         = false,
      strictValid     = true,
      softValid       = true,
    } = body;

    if (strictValid === false) {
      throw new ApiError(400, 'Submission blocked: strict rule violation.');
    }

    const candidateName = (candidateData.fullName ?? candidateData.full_name ?? '').trim();
    const email         = (candidateData.email ?? '').trim();
    const phone         = (candidateData.phone ?? '').trim();

    // Store full form data + exception detail inside JSONB
    const dataJson = { ...candidateData, exceptionFields, rationaleMap };

    const { rows } = await query(
      `INSERT INTO audit_records
         (candidate_name, email, phone, data,
          exception_count, flagged, strict_valid, soft_valid, submitted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, submitted_at, exception_count, flagged, strict_valid, soft_valid`,
      [
        candidateName,
        email,
        phone,
        JSON.stringify(dataJson),
        exceptionCount,
        flagged,
        strictValid,
        softValid,
        submittedBy ?? null,
      ]
    );

    return rows[0];
  },

  /**
   * Paginated list, newest first.
   */
  async list({ page, limit, offset }) {
    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT id, submitted_at, candidate_name, email, phone, data,
                exception_count, flagged, strict_valid, soft_valid, submitted_by
           FROM audit_records
          ORDER BY submitted_at DESC
          LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query('SELECT COUNT(*)::int AS total FROM audit_records', []),
    ]);

    const total = countResult.rows[0].total;
    return { records: dataResult.rows, total, page, pages: Math.ceil(total / limit) };
  },

  /**
   * All records for export (no pagination).
   */
  async all() {
    const { rows } = await query(
      `SELECT id, submitted_at, candidate_name, email, phone, data,
              exception_count, flagged, strict_valid, soft_valid
         FROM audit_records
        ORDER BY submitted_at DESC`,
      []
    );
    return rows;
  },
};

// ── CSV export ─────────────────────────────────────────────────────────────

const DATA_FIELDS = [
  'dateOfBirth','aadhaar','qualification','graduationYear',
  'percentageOrCgpa','score','interviewStatus','offerLetterSent',
];

function _csvEscape(val) {
  const s = val == null ? '' : String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

export function recordsToCsv(records) {
  const headers = [
    'id','submitted_at','candidate_name','email','phone',
    ...DATA_FIELDS,
    'exception_count','flagged','strict_valid','soft_valid',
  ];

  const rows = records.map((r) => {
    const d = r.data ?? {};
    return [
      r.id, r.submitted_at, r.candidate_name, r.email, r.phone,
      ...DATA_FIELDS.map((f) => d[f] ?? ''),
      r.exception_count, r.flagged, r.strict_valid, r.soft_valid,
    ].map(_csvEscape).join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}
