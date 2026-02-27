import { FormStateManager }    from '../../state/FormStateManager.js';
import { ValidationEngine }     from '../../core/ValidationEngine.js';
import { SubmissionController } from '../../core/SubmissionController.js';
import { AuditService }         from '../../core/AuditService.js';

/**
 * SubmitButton
 *
 * Renders a wrapper containing:
 *   - "Active Exceptions: X" counter (hidden when count = 0, amber when > 0, red when > 2)
 *   - The submit button (disabled until isSubmittable())
 *
 * @returns {HTMLElement}
 */
export function SubmitButton() {
  const wrapper = document.createElement('div');
  wrapper.className = 'submit-wrapper';

  // ── Exception counter ──────────────────────────────────────────────────
  const counter = document.createElement('p');
  counter.className = 'exception-counter';
  counter.setAttribute('aria-live', 'polite');
  counter.hidden = true;
  wrapper.appendChild(counter);

  // ── Submit button ──────────────────────────────────────────────────────
  const button = document.createElement('button');
  button.className = 'submit-button';
  button.type = 'submit';
  button.disabled = true;
  button.textContent = 'Submit Application';
  wrapper.appendChild(button);

  // ── State sync ─────────────────────────────────────────────────────────
  FormStateManager.subscribe((values, meta) => {
    const submittable = FormStateManager.isSubmittable();
    button.disabled = !submittable;
    button.setAttribute('aria-disabled', String(!submittable));

    const count = ValidationEngine.computeExceptionCount(meta);

    if (count > 0) {
      counter.textContent = `Active Exceptions: ${count}`;
      counter.hidden = false;
      counter.className = count > 2
        ? 'exception-counter exception-counter--over'
        : 'exception-counter exception-counter--warn';
    } else {
      counter.hidden = true;
    }
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
