/**
 * SubmissionController
 *
 * Orchestrates the form submission pipeline.
 *
 * submit(snapshot, meta):
 *   1. Builds a full compliance audit record from the form state and validation meta.
 *   2. Persists the record via auditService.save().
 *   3. Shows a confirmation modal.
 *   4. Resets the form via resetFn().
 *   5. Returns { success: true, error: null }.
 *
 * Audit record shape:
 *   { id, timestamp, candidateData, exceptionCount, exceptionFields,
 *     rationaleMap, flagged, strictValid }
 */

import { AuditService }     from './AuditService.js';
import { FormStateManager } from '../state/FormStateManager.js';
import { showConfirmationModal } from '../ui/components/ConfirmationModal.js';

// ── Audit record builder (pure, injectable for tests) ──────────────────────

function _buildRecord(snapshot, meta, generateId, auditService) {
  const id        = generateId();        // legacy collision-resistant ID (kept for audit log row key)
  const submissionId = auditService.nextId(); // AG-YYYY-NNNN displayed in modal
  const timestamp = new Date().toISOString();

  // Fields with a fully valid exception (requested + rationale accepted)
  const exceptionFields = Object.entries(meta)
    .filter(([, m]) => m.exceptionRequested && m.rationaleValid)
    .map(([fieldId]) => fieldId);

  const exceptionCount = exceptionFields.length;

  const rationaleMap = Object.fromEntries(
    exceptionFields.map((fieldId) => [fieldId, meta[fieldId].rationale])
  );

  const flagged = exceptionCount > 2;

  const strictValid = Object.values(meta).every((m) => m.strictValid === true);

  return {
    id,
    submissionId,
    timestamp,
    candidateData:   { ...snapshot },
    exceptionCount,
    exceptionFields,
    rationaleMap,
    flagged,
    strictValid,
  };
}

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   auditService: { generateId: () => string, save: (record: object) => object }
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
      auditService.save(record);
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
