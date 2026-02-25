import { FormStateManager } from '../../state/FormStateManager.js';
import { SubmissionController } from '../../core/SubmissionController.js';
import { AuditService } from '../../core/AuditService.js';

/**
 * SubmitButton
 *
 * Enabled only when FormStateManager.isSubmittable() returns true.
 * Subscribes to state changes and re-evaluates on every update.
 *
 * The exception badge slot is present in the DOM but hidden until
 * ExceptionManager (phase 4) populates a count.
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

  // Re-evaluate enabled state on every state change
  FormStateManager.subscribe(() => {
    const submittable = FormStateManager.isSubmittable();
    button.disabled = !submittable;
    button.setAttribute('aria-disabled', String(!submittable));
  });

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
