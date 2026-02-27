/**
 * SubmissionController
 *
 * Orchestrates the form submission pipeline.
 *
 * submit(snapshot, meta):
 *   1. Builds a full compliance audit record from the form state and validation meta.
 *   2. Persists the record via auditService.addRecord().
 *   3. Shows a confirmation modal.
 *   4. Resets the form via resetFn().
 *   5. Returns { success: true, error: null }.
 *
 * Audit record shape:
 *   {
 *     id, submissionId, timestamp,
 *     candidateSnapshot,
 *     validationSummary: { strictPassed, softViolations, exceptionCount, flagged, eligibilityStatus },
 *     exceptions: [{ field, rationale, keywordsMatched }],
 *     riskScore,
 *     riskLevel,   ('Low' | 'Medium' | 'High')
 *     reviewed, reviewedAt,
 *   }
 *
 * Risk score: +20 per soft exception, +15 if screeningScore < 45,
 *             floor at 51 when exceptionCount > 2 (auto High).
 */

import { AuditService }     from './AuditService.js';
import { FormStateManager } from '../state/FormStateManager.js';
import { showConfirmationModal } from '../ui/components/ConfirmationModal.js';

// ── Risk scoring ───────────────────────────────────────────────────────────

/**
 * Computes a numeric risk score from the exception count and screening score.
 *
 * Rules:
 *   +20 per active soft exception
 *   +15 if screening score < 45
 *   If exceptionCount > 2 → score is forced to at least 51 (High tier)
 *
 * @param {number} exceptionCount
 * @param {object} snapshot - field values snapshot
 * @returns {number}
 */
function _computeRiskScore(exceptionCount, snapshot) {
  let score = exceptionCount * 20;

  const raw = snapshot.score ?? snapshot.percentageOrCgpa ?? '';
  const screeningScore = parseFloat(raw);
  if (!isNaN(screeningScore) && screeningScore < 45) score += 15;

  if (exceptionCount > 2) score = Math.max(score, 51);

  return score;
}

// ── Auto-generated rationale for soft violations ───────────────────────────

const AUTO_RATIONALE = 'Auto-generated: Soft rule threshold deviation.';

// ── Audit record builder (pure, injectable for tests) ──────────────────────

function _buildRecord(snapshot, meta, generateId, auditService) {
  const id           = generateId();
  const submissionId = auditService.nextId(); // AG-YYYY-NNNN for the confirmation modal
  const timestamp    = new Date().toISOString();

  // Auto-detect soft violations — no manual exception request required
  const exceptionFields = Object.entries(meta)
    .filter(([, m]) => m.softValid === false)
    .map(([fieldId]) => fieldId);

  const exceptionCount = exceptionFields.length;
  const flagged        = exceptionCount > 0;
  const strictPassed   = Object.values(meta).every((m) => m.strictValid === true);
  const softViolations = exceptionCount;

  const eligibilityStatus = exceptionCount > 0 ? 'Flagged' : 'Clean';

  // Per-exception detail: auto-generated rationale, no keyword matching
  const exceptions = exceptionFields.map((field) => ({
    field,
    rationale: AUTO_RATIONALE,
    keywordsMatched: [],
  }));

  const riskScore = _computeRiskScore(exceptionCount, snapshot);
  let riskLevel   = riskScore <= 20 ? 'Low' : riskScore <= 50 ? 'Medium' : 'High';
  // Enforce Medium minimum whenever any soft violation is present
  if (exceptionCount > 0 && riskLevel === 'Low') riskLevel = 'Medium';

  return {
    id,
    submissionId,
    timestamp,
    candidateSnapshot: { ...snapshot },
    validationSummary: {
      strictPassed,
      softViolations,
      exceptionCount,
      flagged,
      eligibilityStatus,
    },
    exceptions,
    riskScore,
    riskLevel,
    reviewed:   false,
    reviewedAt: null,
  };
}

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   auditService: { generateId: () => string, nextId: () => string, addRecord: (record: object) => object }
 *   showModal:    (record: object) => void
 *   resetFn:      () => void
 * }} options
 */
export function createSubmissionController({ auditService, showModal, resetFn }) {
  return {
    /**
     * @param   {object} snapshot - Field values from FormStateManager.getState()
     * @param   {object} meta     - Full field meta from FormStateManager.getMeta()
     * @returns {Promise<{ success: boolean, error: string|null }>}
     */
    async submit(snapshot, meta) {
      const record = _buildRecord(snapshot, meta, () => auditService.generateId(), auditService);
      auditService.addRecord(record);
      showModal(record);
      resetFn();
      return { success: true, error: null };
    },
  };
}

// ── Application singleton ──────────────────────────────────────────────────

export const SubmissionController = createSubmissionController({
  auditService: AuditService,
  showModal:    (record) => showConfirmationModal(record),
  resetFn:      () => FormStateManager.reset(),
});
