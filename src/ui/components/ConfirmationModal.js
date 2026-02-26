/**
 * ConfirmationModal
 *
 * Shown after a successful form submission.
 * Displays candidate name, exception count, and a flagged indicator.
 * Dismissing the modal completes the reset cycle.
 *
 * showConfirmationModal(record) — mounts the modal into document.body and
 * removes it when the user dismisses.
 */

import { AuditService } from '../../core/AuditService.js';

// ── Field display labels ───────────────────────────────────────────────────

const FIELD_LABELS = {
  fullName:         'Full Name',
  email:            'Email Address',
  phone:            'Phone Number',
  dateOfBirth:      'Date of Birth',
  aadhaar:          'Aadhaar Number',
  qualification:    'Highest Qualification',
  graduationYear:   'Graduation Year',
  percentageOrCgpa: 'Percentage / CGPA',
  score:            'Screening Test Score',
  interviewStatus:  'Interview Status',
  offerLetterSent:  'Offer Letter Sent',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function _formatTimestamp(iso) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Component ─────────────────────────────────────────────────────────────

/**
 * Mounts a confirmation modal overlay into document.body.
 * Removes itself when the user clicks "Close" or the backdrop.
 *
 * @param {object} record - Audit record from AuditService
 */
export function showConfirmationModal(record) {
  // Guard: only mount if we have a DOM (no-op in non-browser contexts)
  if (typeof document === 'undefined') return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'modal-title');

  const { candidateData = {}, exceptionCount = 0, flagged = false, timestamp, submissionId } = record;
  const candidateName = candidateData.fullName || '—';

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal__header">
        <div class="modal__icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" class="modal__icon">
            <circle cx="12" cy="12" r="11" stroke="currentColor" stroke-width="1.5"/>
            <path d="M7 12.5l3.5 3.5 6.5-7" stroke="currentColor"
                  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <h2 class="modal__title" id="modal-title">Application Submitted</h2>
          <p class="modal__subtitle">${_formatTimestamp(timestamp)}</p>
          ${submissionId ? `<p class="modal__submission-id">${submissionId}</p>` : ''}
        </div>
      </div>

      <div class="modal__body">
        <div class="modal__candidate-row">
          <span class="modal__candidate-label">Candidate</span>
          <span class="modal__candidate-name">${candidateName}</span>
        </div>

        ${flagged ? `
          <div class="modal__flag-notice" role="alert">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="modal__flag-icon">
              <path fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213
                   2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1
                   1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"/>
            </svg>
            <p>This application carries <strong>${exceptionCount} active compliance
               exception${exceptionCount !== 1 ? 's' : ''}</strong> and has been flagged for
               managerial review before final processing.</p>
          </div>
        ` : exceptionCount > 0 ? `
          <p class="modal__exception-note">
            ${exceptionCount} exception${exceptionCount !== 1 ? 's' : ''} recorded.
            Application proceeds to standard review.
          </p>
        ` : `
          <p class="modal__clean-note">No compliance exceptions. Application forwarded to
             standard admission review.</p>
        `}
      </div>

      <div class="modal__footer">
        <button class="modal__close-btn" type="button" aria-label="Close confirmation">
          Close
        </button>
      </div>
    </div>
  `;

  // Dismiss handlers
  function _dismiss() {
    overlay.classList.add('modal-overlay--closing');
    overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    // Fallback if animation doesn't fire
    setTimeout(() => { if (overlay.isConnected) overlay.remove(); }, 400);
  }

  overlay.querySelector('.modal__close-btn').addEventListener('click', _dismiss);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) _dismiss();
  });

  document.body.appendChild(overlay);
  // Focus the close button for accessibility
  overlay.querySelector('.modal__close-btn').focus();
}
