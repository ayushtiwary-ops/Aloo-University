import { FormStateManager } from '../../state/FormStateManager.js';
import { ValidationEngine }  from '../../core/ValidationEngine.js';

/**
 * RiskBanner
 *
 * Amber compliance banner shown when the active exception count exceeds 2.
 * Signals that the application will be flagged for managerial review before
 * final processing. Submission is still allowed — the flag is informational.
 *
 * Hidden entirely when count ≤ 2 so it does not distract on normal forms.
 *
 * @returns {HTMLElement}
 */
export function RiskBanner() {
  const host = document.createElement('div');
  host.setAttribute('aria-live', 'assertive');
  host.setAttribute('aria-atomic', 'true');

  function _render(values, meta) {
    const count = ValidationEngine.computeExceptionCount(meta);
    host.innerHTML = '';

    if (count <= 2) return;

    const banner = document.createElement('div');
    banner.className = 'risk-banner';
    banner.setAttribute('role', 'alert');

    banner.innerHTML = `
      <svg class="risk-banner__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742
             2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0
             012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clip-rule="evenodd"/>
      </svg>
      <div class="risk-banner__body">
        <p class="risk-banner__title">Candidate Exceeds Exception Threshold</p>
        <p class="risk-banner__detail">
          This application carries ${count} active compliance exceptions and will be
          flagged for managerial review before final processing. Submission is permitted,
          but approval is not guaranteed.
        </p>
      </div>
    `;

    host.appendChild(banner);
  }

  FormStateManager.subscribe(_render);

  return host;
}
