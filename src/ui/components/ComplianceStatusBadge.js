import { FormStateManager } from '../../state/FormStateManager.js';
import { ValidationEngine }  from '../../core/ValidationEngine.js';

/**
 * ComplianceStatusBadge
 *
 * Reads computeExceptionCount from ValidationEngine and renders a coloured
 * pill badge below the submit button. Three states:
 *
 *   0 exceptions  → green  "Compliant"
 *   1–2           → amber  "Soft-rule review"
 *   ≥ 3           → red    "Flagged for escalation"
 *
 * Status is purely system-determined; no user interaction.
 *
 * @returns {HTMLElement}
 */
export function ComplianceStatusBadge() {
  const wrap = document.createElement('div');
  wrap.className = 'compliance-badge-wrap';
  wrap.setAttribute('aria-live', 'polite');
  wrap.setAttribute('aria-atomic', 'true');

  function _render(values, meta) {
    const count = ValidationEngine.computeExceptionCount(meta);

    let modifier, label;
    if (count === 0) {
      modifier = 'green';
      label    = 'Compliant';
    } else if (count <= 2) {
      modifier = 'amber';
      label    = 'Soft-rule review';
    } else {
      modifier = 'red';
      label    = 'Flagged for escalation';
    }

    wrap.innerHTML = `
      <span class="compliance-badge compliance-badge--${modifier}" role="status"
            aria-label="Compliance status: ${label}">
        <span class="compliance-badge__dot" aria-hidden="true"></span>
        ${label}
      </span>
    `;
  }

  FormStateManager.subscribe(_render);
  return wrap;
}
