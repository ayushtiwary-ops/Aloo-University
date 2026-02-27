import { FormStateManager }    from '../../state/FormStateManager.js';
import { SubmissionController } from '../../core/SubmissionController.js';
import { AuditService }         from '../../core/AuditService.js';

/**
 * SubmitButton
 *
 * Renders a wrapper containing the submit button (disabled until isSubmittable()).
 * Soft violations are auto-processed — no exception counter is shown.
 *
 * @returns {HTMLElement}
 */
export function SubmitButton() {
  const wrapper = document.createElement('div');
  wrapper.className = 'submit-wrapper';

  // ── Submit button ──────────────────────────────────────────────────────
  const button = document.createElement('button');
  button.className = 'submit-button';
  button.type = 'submit';
  button.disabled = true;
  button.textContent = 'Submit Application';
  wrapper.appendChild(button);

  // ── State sync ─────────────────────────────────────────────────────────
  FormStateManager.subscribe(() => {
    const submittable = FormStateManager.isSubmittable();
    button.disabled = !submittable;
    button.setAttribute('aria-disabled', String(!submittable));
  });

  // ── Submit handler ─────────────────────────────────────────────────────
  button.addEventListener('click', async () => {
    if (button.disabled) return;

    AuditService.record('FORM_SUBMIT_ATTEMPTED', {
      snapshot: FormStateManager.getState(),
    });

    const result = await SubmissionController.submit(
      FormStateManager.getState(),
      FormStateManager.getMeta()
    );

    AuditService.record(
      result.success ? 'FORM_SUBMIT_SUCCESS' : 'FORM_SUBMIT_FAILED',
      result.success ? {} : { error: result.error }
    );
  });

  return wrapper;
}
