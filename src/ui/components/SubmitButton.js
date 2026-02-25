import { FormStateManager } from '../../state/FormStateManager.js';
import { SubmissionController } from '../../core/SubmissionController.js';
import { AuditService } from '../../core/AuditService.js';

/**
 * SubmitButton
 *
 * Disabled until FormStateManager reports all fields valid (phase 2).
 * Includes a badge slot for exception count (hidden, populated in phase 2).
 *
 * @returns {HTMLElement}
 */
export function SubmitButton() {
  const button = document.createElement('button');
  button.className = 'submit-button';
  button.type = 'submit';
  button.disabled = true;

  button.innerHTML = `
    <span class="submit-button__label">Submit Application</span>
    <span class="submit-button__badge" aria-label="compliance exceptions" data-count=""></span>
  `;

  button.addEventListener('click', async () => {
    if (button.disabled) return;

    AuditService.record('FORM_SUBMIT_ATTEMPTED', {
      snapshot: FormStateManager.getState(),
    });

    const result = await SubmissionController.submit(FormStateManager.getState());

    AuditService.record(
      result.success ? 'FORM_SUBMIT_SUCCESS' : 'FORM_SUBMIT_FAILED',
      result.success ? {} : { error: result.error }
    );
  });

  return button;
}
