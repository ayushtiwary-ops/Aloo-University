import { FormStateManager } from '../../state/FormStateManager.js';
import { ValidationEngine }  from '../../core/ValidationEngine.js';

/**
 * ExceptionCounter
 *
 * Displays "Active Exceptions: X" when at least one valid exception is in
 * effect (exceptionRequested=true AND rationaleValid=true).
 *
 * Hidden entirely when the count is 0 so it does not occupy space on a
 * clean form.
 *
 * @returns {HTMLElement}
 */
export function ExceptionCounter() {
  const host = document.createElement('div');
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-atomic', 'true');

  function _render(values, meta) {
    const count = ValidationEngine.computeExceptionCount(meta);
    host.innerHTML = '';

    if (count === 0) return;

    const el = document.createElement('div');
    el.className = 'exception-counter';
    el.innerHTML = `
      <span class="exception-counter__label">Active Exceptions:</span>
      <span class="exception-counter__count" aria-label="${count} active exception${count !== 1 ? 's' : ''}">${count}</span>
    `;
    host.appendChild(el);
  }

  FormStateManager.subscribe(_render);

  return host;
}
