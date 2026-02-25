import { FormStateManager } from '../../state/FormStateManager.js';

/**
 * InputField
 *
 * Self-contained field component. Builds its own DOM, wires input events
 * to FormStateManager.setField(), and subscribes to (values, meta) state
 * changes to update its own validation indicator, border, and message.
 *
 * Rendering strategy — controlled re-binding (unchanged from phase 2):
 *   Only this field's own DOM nodes are touched on each state update.
 *   No sibling components are affected, no cursor position is disrupted.
 *
 * Phase 3 additions:
 *   - Reads strictValid / strictErrorMessage from the meta argument
 *   - Sets .field--valid / .field--invalid CSS modifier on wrapper
 *   - Populates .field__message with the error text
 *   - Adds .field__message--error class on error state
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

  // ── Label + indicator ──────────────────────────────────────
  const labelEl = document.createElement('label');
  labelEl.className = 'field__label';
  labelEl.setAttribute('for', id);

  const indicator = document.createElement('span');
  indicator.className = 'field__indicator';
  indicator.setAttribute('aria-hidden', 'true');

  labelEl.appendChild(indicator);
  labelEl.appendChild(document.createTextNode(label));
  wrapper.appendChild(labelEl);

  // ── Control ────────────────────────────────────────────────
  const control = _buildControl(id, type, placeholder, options);
  wrapper.appendChild(control);

  // ── Validation message ─────────────────────────────────────
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

  // ── Subscribe to state changes ─────────────────────────────
  const unsubscribe = FormStateManager.subscribe((values, meta) => {
    const fieldMeta = meta?.[id];
    if (!fieldMeta) return;

    const { strictValid, strictErrorMessage } = fieldMeta;

    // Update validation CSS modifier
    wrapper.classList.remove('field--valid', 'field--invalid');
    if (strictValid === true)  wrapper.classList.add('field--valid');
    if (strictValid === false) wrapper.classList.add('field--invalid');

    // Update message text + style
    if (strictValid === false && strictErrorMessage) {
      messageEl.textContent = strictErrorMessage;
      messageEl.classList.add('field__message--error');
    } else {
      messageEl.textContent = '';
      messageEl.classList.remove('field__message--error');
    }
  });

  // Expose unsubscribe for cleanup
  wrapper._unsubscribe = unsubscribe;

  return wrapper;
}

// ── Private builders ───────────────────────────────────────────────────────

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
