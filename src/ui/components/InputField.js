import { FormStateManager } from '../../state/FormStateManager.js';

/**
 * InputField
 *
 * Reusable, self-contained field component. Constructs its own DOM,
 * wires input events to FormStateManager.setField(), and subscribes
 * to state changes to reflect updated values in the DOM.
 *
 * Rendering strategy — Controlled component re-binding:
 *
 *   On every input event, the component writes the new value to
 *   FormStateManager. FormStateManager notifies all subscribers with a
 *   fresh state snapshot. This component's subscriber callback reads
 *   only its own field from that snapshot and updates its control value
 *   and message node — no other part of the UI is touched.
 *
 *   Why not full page re-render?
 *   Re-mounting the entire component tree on every keystroke would reset
 *   focus, cursor position, and scroll state. Controlled re-binding gives
 *   the same predictable state flow with surgical DOM updates only.
 *
 *   Why not a reactive proxy (e.g. Proxy/Reflect)?
 *   Proxy-based reactivity adds invisible complexity and makes debugging
 *   harder. An explicit subscriber call is readable, debuggable, and
 *   sufficient for this scale.
 *
 * Supports field types:
 *   'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'score' | 'toggle'
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
  labelEl.setAttribute('for', _controlId(id, type));

  const indicator = document.createElement('span');
  indicator.className = 'field__indicator';
  indicator.setAttribute('aria-hidden', 'true');

  labelEl.appendChild(indicator);
  labelEl.appendChild(document.createTextNode(label));
  wrapper.appendChild(labelEl);

  // ── Control (varies by type) ───────────────────────────────
  const control = _buildControl(id, type, placeholder, options);
  wrapper.appendChild(control);

  // ── Validation message ─────────────────────────────────────
  const messageEl = document.createElement('p');
  messageEl.className = 'field__message';
  messageEl.id = `${id}-message`;
  messageEl.setAttribute('aria-live', 'polite');
  wrapper.appendChild(messageEl);

  // Link primary control to message for screen readers
  const primaryControl = wrapper.querySelector(`#${_controlId(id, type)}`);
  if (primaryControl) {
    primaryControl.setAttribute('aria-describedby', `${id}-message`);
  }

  // ── Subscribe: update message when state changes ───────────
  // Returns an unsubscribe function — callers can invoke it to
  // prevent memory leaks when components are unmounted.
  const unsubscribe = FormStateManager.subscribe((state) => {
    messageEl.textContent = state[id] !== undefined
      ? '' // message populated by ValidationEngine in phase 2
      : '';
  });

  // Expose unsubscribe on the element so App can clean up
  wrapper._unsubscribe = unsubscribe;

  return wrapper;
}

// ── Private builders ───────────────────────────────────────────

/**
 * Returns the correct `id` attribute for the primary focusable control
 * inside a field. Score and toggle fields contain multiple controls,
 * so the primary one carries the field id directly.
 * @param {string} id
 * @param {string} type
 * @returns {string}
 */
function _controlId(id, type) {
  return id;
}

/**
 * Dispatches to the appropriate control builder.
 */
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

  input.addEventListener('input', (e) => {
    FormStateManager.setField(id, e.target.value);
  });

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

  select.addEventListener('change', (e) => {
    FormStateManager.setField(id, e.target.value);
  });

  return select;
}

/**
 * Score field: numeric input alongside a Percentage / CGPA toggle.
 * The numeric value updates `percentageOrCgpa`; the toggle updates `gradingMode`.
 */
function _buildScore(id) {
  const row = document.createElement('div');
  row.className = 'field__score-row';

  const input = document.createElement('input');
  input.className = 'field__control';
  input.id = id;
  input.name = id;
  input.type = 'number';
  input.placeholder = 'Enter value';
  input.addEventListener('input', (e) => {
    FormStateManager.setField(id, e.target.value);
  });

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

/**
 * Yes / No toggle for boolean fields (e.g. offerLetterSent).
 */
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

/**
 * Generic toggle button group.
 *
 * @param {{
 *   groupLabel:   string,
 *   options:      Array<{ value: string, label: string }>,
 *   initialValue: string|null,
 *   onChange:     function
 * }} config
 * @returns {HTMLElement}
 */
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
      // Update aria-pressed on all siblings
      group.querySelectorAll('.field__toggle-option').forEach((b) => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      onChange(value);
    });

    group.appendChild(btn);
  });

  return group;
}
