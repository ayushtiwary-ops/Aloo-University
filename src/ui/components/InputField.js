import { FormStateManager } from '../../state/FormStateManager.js';

/**
 * InputField
 *
 * Self-contained field component. Builds its own DOM, wires input events
 * to FormStateManager.setField(), and subscribes to (values, meta) state
 * changes to update its own indicators, borders, and messages.
 *
 * Phase 3: strict validation indicators (red border, error message, dot colour).
 *
 * Phase 4 additions:
 * - Reads softValid / softViolation / exceptionRequested / rationale /
 *   rationaleValid / rationaleKeywords from field meta.
 * - Sets .field--warning on wrapper when a soft rule is violated.
 * - Shows amber warning message and "Request Exception" toggle.
 * - When toggle is ON, reveals the rationale textarea with keyword hints
 *   and calls FormStateManager.setFieldException() on every change.
 *
 * Priority:  strictValid=false (red)  >  softValid=false (amber)  >  valid (green)
 *
 * @param {{
 *   id:           string,
 *   label:        string,
 *   type:         string,
 *   placeholder?: string,
 *   options?:     Array<{ value: string, label: string }>
 * }} props
 * @returns {HTMLElement}
 */
export function InputField({ id, label, type, placeholder = '', options = [] }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  wrapper.dataset.fieldId = id;

  // ── Label + indicator ──────────────────────────────────────────────────
  const labelEl = document.createElement('label');
  labelEl.className = 'field__label';
  labelEl.setAttribute('for', id);

  const indicator = document.createElement('span');
  indicator.className = 'field__indicator';
  indicator.setAttribute('aria-hidden', 'true');

  labelEl.appendChild(indicator);
  labelEl.appendChild(document.createTextNode(label));
  wrapper.appendChild(labelEl);

  // ── Control ────────────────────────────────────────────────────────────
  const control = _buildControl(id, type, placeholder, options);
  wrapper.appendChild(control);

  // ── Strict validation message ──────────────────────────────────────────
  const messageEl = document.createElement('p');
  messageEl.className = 'field__message';
  messageEl.id = `${id}-message`;
  messageEl.setAttribute('aria-live', 'polite');
  messageEl.setAttribute('role', 'alert');
  wrapper.appendChild(messageEl);

  const primaryControl = wrapper.querySelector(`#${id}`);
  if (primaryControl) {
    primaryControl.setAttribute('aria-describedby', `${id}-message`);
  }

  // ── Soft-violation area (hidden when no soft violation) ────────────────
  const softArea = document.createElement('div');
  softArea.className = 'field__soft-area';
  softArea.hidden = true;
  wrapper.appendChild(softArea);

  // Amber warning message
  const softMessageEl = document.createElement('p');
  softMessageEl.className = 'field__message field__message--warning';
  softMessageEl.setAttribute('aria-live', 'polite');
  softArea.appendChild(softMessageEl);

  // Exception toggle row
  const exceptionRow = document.createElement('div');
  exceptionRow.className = 'field__exception-row';
  softArea.appendChild(exceptionRow);

  const exceptionToggle = document.createElement('button');
  exceptionToggle.className = 'field__exception-toggle';
  exceptionToggle.type = 'button';
  exceptionToggle.textContent = 'Request Exception';
  exceptionToggle.setAttribute('aria-pressed', 'false');
  exceptionRow.appendChild(exceptionToggle);

  // Rationale area (hidden until toggle is ON)
  const rationaleArea = document.createElement('div');
  rationaleArea.className = 'field__rationale-area';
  rationaleArea.hidden = true;
  softArea.appendChild(rationaleArea);

  const rationaleLabel = document.createElement('p');
  rationaleLabel.className = 'field__rationale-label';
  rationaleLabel.textContent = 'Exception Rationale';
  rationaleArea.appendChild(rationaleLabel);

  const rationaleHint = document.createElement('p');
  rationaleHint.className = 'field__rationale-hint';
  rationaleArea.appendChild(rationaleHint);

  const rationaleTextarea = document.createElement('textarea');
  rationaleTextarea.className = 'field__rationale-textarea';
  rationaleTextarea.rows = 3;
  rationaleTextarea.placeholder =
    'Describe the reason for this exception (minimum 30 characters)…';
  rationaleTextarea.setAttribute('aria-label', `Exception rationale for ${label}`);
  rationaleArea.appendChild(rationaleTextarea);

  const rationaleMsgEl = document.createElement('p');
  rationaleMsgEl.className = 'field__rationale-message';
  rationaleArea.appendChild(rationaleMsgEl);

  // ── Exception toggle interaction ───────────────────────────────────────
  exceptionToggle.addEventListener('click', () => {
    const nowPressed = exceptionToggle.getAttribute('aria-pressed') !== 'true';
    exceptionToggle.setAttribute('aria-pressed', String(nowPressed));
    rationaleArea.hidden = !nowPressed;
    FormStateManager.setFieldException(
      id,
      nowPressed,
      nowPressed ? rationaleTextarea.value : ''
    );
  });

  rationaleTextarea.addEventListener('input', () => {
    FormStateManager.setFieldException(id, true, rationaleTextarea.value);
  });

  // ── Subscribe to state changes ─────────────────────────────────────────
  const unsubscribe = FormStateManager.subscribe((values, meta) => {
    const fieldMeta = meta?.[id];
    if (!fieldMeta) return;

    const {
      strictValid,
      strictErrorMessage,
      softValid,
      softViolation,
      exceptionRequested,
      rationale,
      rationaleValid,
      rationaleKeywords,
      rationaleMinLength,
    } = fieldMeta;

    // ── Wrapper class (priority: strict > soft > valid) ──────────────────
    wrapper.classList.remove('field--valid', 'field--invalid', 'field--warning');
    if (strictValid === false) {
      wrapper.classList.add('field--invalid');
    } else if (softValid === false) {
      wrapper.classList.add('field--warning');
    } else if (strictValid === true && softValid !== false) {
      wrapper.classList.add('field--valid');
    }

    // ── Strict message ───────────────────────────────────────────────────
    if (strictValid === false && strictErrorMessage) {
      messageEl.textContent = strictErrorMessage;
      messageEl.classList.add('field__message--error');
    } else {
      messageEl.textContent = '';
      messageEl.classList.remove('field__message--error');
    }

    // ── Soft violation area ──────────────────────────────────────────────
    const hasSoftViolation = softValid === false;
    softArea.hidden = !hasSoftViolation;

    if (hasSoftViolation) {
      softMessageEl.textContent = softViolation;

      // Sync toggle pressed state
      const isRequested = Boolean(exceptionRequested);
      exceptionToggle.setAttribute('aria-pressed', String(isRequested));
      rationaleArea.hidden = !isRequested;

      if (isRequested) {
        // Keyword hint
        if (rationaleKeywords?.length) {
          const kwList = rationaleKeywords.map((k) => `"${k}"`).join(', ');
          rationaleHint.innerHTML =
            `Must be ≥ ${rationaleMinLength} characters and include at least one of: ` +
            `<strong>${kwList}</strong>.`;
        }

        // Sync textarea value only when it differs (prevents cursor jump)
        if (rationaleTextarea.value !== rationale) {
          rationaleTextarea.value = rationale;
        }

        // Rationale textarea border
        rationaleTextarea.classList.toggle(
          'field__rationale-textarea--invalid',
          !rationaleValid
        );

        // Rationale validation message
        rationaleMsgEl.classList.remove(
          'field__rationale-message--error',
          'field__rationale-message--valid'
        );
        if (rationale.length > 0) {
          if (rationaleValid) {
            rationaleMsgEl.textContent = 'Rationale accepted.';
            rationaleMsgEl.classList.add('field__rationale-message--valid');
          } else {
            rationaleMsgEl.textContent =
              `Rationale must be at least ${rationaleMinLength} characters ` +
              `and include a recognised governance keyword.`;
            rationaleMsgEl.classList.add('field__rationale-message--error');
          }
        } else {
          rationaleMsgEl.textContent = '';
        }
      } else {
        // Toggle is off — clear rationale UI
        rationaleMsgEl.textContent = '';
        rationaleTextarea.value = '';
        rationaleTextarea.classList.remove('field__rationale-textarea--invalid');
      }
    } else {
      // No soft violation — reset exception UI state
      exceptionToggle.setAttribute('aria-pressed', 'false');
      rationaleArea.hidden = true;
      rationaleTextarea.value = '';
      rationaleMsgEl.textContent = '';
    }
  });

  // Expose unsubscribe for cleanup
  wrapper._unsubscribe = unsubscribe;

  return wrapper;
}

// ── Private builders ────────────────────────────────────────────────────────

function _buildControl(id, type, placeholder, options) {
  switch (type) {
    case 'select': return _buildSelect(id, placeholder, options);
    case 'score':  return _buildScore(id);
    case 'toggle': return _buildToggle(id);
    default:       return _buildInput(id, type, placeholder);
  }
}

function _buildInput(id, type, placeholder) {
  const input = document.createElement('input');
  input.className = 'field__control';
  input.id = id;
  input.name = id;
  input.type = type;
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.addEventListener('input', (e) => FormStateManager.setField(id, e.target.value));
  return input;
}

function _buildSelect(id, placeholder, options) {
  const select = document.createElement('select');
  select.className = 'field__control field__control--select';
  select.id = id;
  select.name = id;

  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = placeholder || 'Select an option';
  blank.disabled = true;
  blank.selected = true;
  select.appendChild(blank);

  options.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  });

  select.addEventListener('change', (e) => FormStateManager.setField(id, e.target.value));
  return select;
}

function _buildScore(id) {
  const row = document.createElement('div');
  row.className = 'field__score-row';

  const input = document.createElement('input');
  input.className = 'field__control';
  input.id = id;
  input.name = id;
  input.type = 'number';
  input.placeholder = 'Enter value';
  input.addEventListener('input', (e) => FormStateManager.setField(id, e.target.value));

  const toggleGroup = _buildToggleButtons({
    groupLabel: 'Score type',
    options: [
      { value: 'percentage', label: 'Percentage' },
      { value: 'cgpa',       label: 'CGPA'       },
    ],
    initialValue: 'percentage',
    onChange: (value) => FormStateManager.setField('gradingMode', value),
  });

  row.appendChild(input);
  row.appendChild(toggleGroup);
  return row;
}

function _buildToggle(id) {
  return _buildToggleButtons({
    groupLabel: id,
    options: [
      { value: 'true',  label: 'Yes' },
      { value: 'false', label: 'No'  },
    ],
    initialValue: null,
    onChange: (value) => FormStateManager.setField(id, value === 'true'),
  });
}

function _buildToggleButtons({ groupLabel, options, initialValue, onChange }) {
  const group = document.createElement('div');
  group.className = 'field__toggle-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', groupLabel);

  options.forEach(({ value, label }) => {
    const btn = document.createElement('button');
    btn.className = 'field__toggle-option';
    btn.type = 'button';
    btn.textContent = label;
    btn.dataset.value = value;
    btn.setAttribute('aria-pressed', String(value === initialValue));

    btn.addEventListener('click', () => {
      group.querySelectorAll('.field__toggle-option').forEach((b) => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      onChange(value);
    });

    group.appendChild(btn);
  });

  return group;
}
