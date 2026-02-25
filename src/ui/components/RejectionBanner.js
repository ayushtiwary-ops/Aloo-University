import { FormStateManager } from '../../state/FormStateManager.js';

/**
 * RejectionBanner
 *
 * Top-level compliance alert shown when interviewStatus = 'rejected'.
 * Renders nothing while hidden — only mounts the visible node when the
 * condition is active.
 *
 * The banner is driven entirely by FormStateManager state; no business
 * logic is performed here. The message text comes from the ValidationEngine
 * error message (passed through strictErrorMessage), which itself reads
 * from rules.json.
 *
 * @returns {HTMLElement} A wrapper element (empty when inactive, banner when active)
 */
export function RejectionBanner() {
  const host = document.createElement('div');
  host.setAttribute('aria-live', 'assertive');
  host.setAttribute('aria-atomic', 'true');

  function _render(meta) {
    const interviewMeta = meta?.interviewStatus;
    const isRejected =
      interviewMeta?.strictValid === false &&
      interviewMeta?.strictErrorMessage?.length > 0;

    host.innerHTML = '';

    if (!isRejected) return;

    const banner = document.createElement('div');
    banner.className = 'rejection-banner';
    banner.setAttribute('role', 'alert');

    banner.innerHTML = `
      <svg class="rejection-banner__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clip-rule="evenodd"/>
      </svg>
      <div class="rejection-banner__body">
        <p class="rejection-banner__title">Application Blocked — Interview Rejected</p>
        <p class="rejection-banner__detail">${interviewMeta.strictErrorMessage}</p>
      </div>
    `;

    host.appendChild(banner);
  }

  FormStateManager.subscribe((values, meta) => _render(meta));

  return host;
}
