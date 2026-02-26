# Frontend Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a 3-second branded splash screen, remove all manual exception UI, auto-grant engine-driven exceptions, and add a ComplianceStatusBadge.

**Architecture:** SplashScreen uses Anime.js for a sequenced timeline; FormStateManager auto-grants soft exceptions so the submission gate stays purely strict-rule-driven; ComplianceStatusBadge replaces ExceptionCounter using the same computeExceptionCount signal. InputField retains amber styling for soft violations but exposes no interactive exception controls.

**Tech Stack:** Vanilla JS (ESM), Vite, Anime.js v3, existing tokens.css design system.

---

### Task 1: Install Anime.js

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install**
```bash
cd "C:/Users/K TIWARY/Aloo-University" && npm install animejs@3
```
Expected: animejs appears in dependencies in package.json.

**Step 2: Verify import works**
```bash
node -e "import('animejs/lib/anime.es.js').then(() => console.log('ok'))" --input-type=module
```
Expected: prints `ok`

**Step 3: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore: add animejs v3 for splash screen animation"
```

---

### Task 2: Create splash.css

**Files:**
- Create: `src/styles/splash.css`

**Step 1: Create the file**
```css
/* ── Splash Screen ──────────────────────────────────────────── */

.splash {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-5);
  background: linear-gradient(160deg, #2A1509 0%, #3D2314 55%, #1E0D04 100%);
  pointer-events: all;
  user-select: none;
}

.splash__logo {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #C8922A, #7A4A10);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 38px;
  color: #FAF7F2;
  letter-spacing: -1px;
  opacity: 0;
  box-shadow: 0 0 0 0 rgba(200, 146, 42, 0);
}

.splash__text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  opacity: 0;
}

.splash__title {
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 700;
  color: #FAF7F2;
  letter-spacing: 0.04em;
  line-height: 1;
}

.splash__underline-wrap {
  position: relative;
  height: 2px;
  width: 100%;
  overflow: hidden;
}

.splash__underline {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #C8922A, #E8D5A3);
  transform: scaleX(0);
  transform-origin: left center;
}

.splash__subtitle {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  color: #9E8E80;
  text-transform: uppercase;
  letter-spacing: 0.18em;
}
```

**Step 2: Add link to index.html**
In `index.html`, after the dashboard.css link add:
```html
<link rel="stylesheet" href="/src/styles/splash.css" />
<link rel="stylesheet" href="/src/styles/badge.css" />
```

**Step 3: Commit**
```bash
git add src/styles/splash.css index.html
git commit -m "feat: add splash.css skeleton"
```

---

### Task 3: Create badge.css

**Files:**
- Create: `src/styles/badge.css`

**Step 1: Create the file**
```css
/* ── Compliance Status Badge ────────────────────────────────── */

.compliance-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: 20px;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.03em;
  transition: background-color var(--transition-base),
              color var(--transition-base),
              border-color var(--transition-base);
  border: 1px solid transparent;
}

.compliance-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Green — compliant */
.compliance-badge--green {
  background-color: #EBF5EC;
  color: var(--color-green-accent);
  border-color: #B8DDB9;
}
.compliance-badge--green .compliance-badge__dot {
  background-color: var(--color-green-accent);
}

/* Amber — soft review */
.compliance-badge--amber {
  background-color: var(--color-warning-subtle);
  color: var(--color-warning);
  border-color: var(--color-accent);
}
.compliance-badge--amber .compliance-badge__dot {
  background-color: var(--color-accent);
}

/* Red — flagged */
.compliance-badge--red {
  background-color: #fdf2f2;
  color: var(--color-error);
  border-color: #e8c2c2;
}
.compliance-badge--red .compliance-badge__dot {
  background-color: var(--color-error);
}

/* Wrapper — right-aligns badge below submit button */
.compliance-badge-wrap {
  display: flex;
  justify-content: flex-end;
  padding: var(--space-2) 0 0;
}

/* Dark mode overrides */
[data-theme="dark"] .compliance-badge--green {
  background-color: #0D200F;
  border-color: #2A5C2E;
}
[data-theme="dark"] .compliance-badge--red {
  background-color: #200D0D;
  border-color: #5C2A2A;
}
```

**Step 2: Commit**
```bash
git add src/styles/badge.css
git commit -m "feat: add badge.css for ComplianceStatusBadge"
```

---

### Task 4: Create SplashScreen.js

**Files:**
- Create: `src/ui/components/SplashScreen.js`

**Step 1: Write the component**
```js
/**
 * SplashScreen
 *
 * Full-viewport branded intro overlay. Runs a 3-second Anime.js timeline,
 * then calls onComplete() so the caller can mount the main app and remove
 * this element.
 *
 * Prevents all interaction during playback via pointer-events:all on .splash.
 *
 * @param {{ onComplete: () => void }} options
 * @returns {HTMLElement}
 */
import anime from 'animejs/lib/anime.es.js';

export function SplashScreen({ onComplete }) {
  const el = document.createElement('div');
  el.className = 'splash';
  el.setAttribute('role', 'presentation');
  el.setAttribute('aria-hidden', 'true');

  el.innerHTML = `
    <div class="splash__logo">A</div>
    <div class="splash__text">
      <p class="splash__title">ALOO University</p>
      <div class="splash__underline-wrap">
        <div class="splash__underline"></div>
      </div>
      <p class="splash__subtitle">Admission Compliance System</p>
    </div>
  `;

  const logo      = el.querySelector('.splash__logo');
  const text      = el.querySelector('.splash__text');
  const underline = el.querySelector('.splash__underline');

  // Run after the element is in the DOM (next microtask)
  requestAnimationFrame(() => {
    const tl = anime.timeline({ easing: 'easeOutCubic', autoplay: true });

    // 0–800ms: logo fades in + scales 0.95 → 1
    tl.add({
      targets:  logo,
      opacity:  [0, 1],
      scale:    [0.95, 1],
      duration: 800,
    });

    // 800–2000ms: text fades in + underline draws left→right
    tl.add({
      targets:  text,
      opacity:  [0, 1],
      duration: 300,
    }, 700);

    tl.add({
      targets:           underline,
      scaleX:            [0, 1],
      duration:          900,
      easing:            'easeInOutQuart',
    }, 900);

    // 2000–2800ms: glow pulse on logo
    tl.add({
      targets:   logo,
      boxShadow: [
        '0 0 0px 0px rgba(200,146,42,0)',
        '0 0 32px 12px rgba(200,146,42,0.45)',
        '0 0 0px 0px rgba(200,146,42,0)',
      ],
      duration:  800,
      easing:    'easeInOutSine',
    }, 2000);

    // 2800–3000ms: fade out entire overlay
    tl.add({
      targets:  el,
      opacity:  [1, 0],
      duration: 200,
      easing:   'easeInQuad',
      complete: onComplete,
    }, 2800);
  });

  return el;
}
```

**Step 2: Commit**
```bash
git add src/ui/components/SplashScreen.js
git commit -m "feat: add SplashScreen with Anime.js 3s timeline"
```

---

### Task 5: Update main.js to show splash before App

**Files:**
- Modify: `src/main.js`

**Step 1: Replace the file**
```js
import { ConfigLoader }      from './core/ConfigLoader.js';
import { FormStateManager }  from './state/FormStateManager.js';
import { ThemeService }      from './core/ThemeService.js';
import { App }               from './app.js';
import { RootLayout }        from './ui/layout/RootLayout.js';
import { SplashScreen }      from './ui/components/SplashScreen.js';

async function init() {
  ThemeService.init();

  const appRoot = document.getElementById('app');

  // Show splash immediately; initialise app logic in parallel
  await new Promise((resolve) => {
    const splash = SplashScreen({ onComplete: resolve });
    appRoot.appendChild(splash);
  });

  // Splash complete — remove overlay and mount app
  appRoot.innerHTML = '';

  await ConfigLoader.load();
  FormStateManager.validateAll();
  appRoot.appendChild(RootLayout({ main: App() }));
}

init().catch((err) => {
  console.error('[AdmitGuard] Initialisation failed:', err);
});
```

**Step 2: Commit**
```bash
git add src/main.js
git commit -m "feat: mount SplashScreen before App in main.js"
```

---

### Task 6: Auto-grant exceptions in FormStateManager

**Files:**
- Modify: `src/state/FormStateManager.js:135-183`

**Context:** The `_validateAndStore` function currently carries forward the user's `exceptionRequested` + `rationale` from the previous meta and re-validates. We replace this with auto-grant: whenever a soft violation fires, set `exceptionRequested=true` and `rationaleValid=true` automatically.

**Step 1: Replace the exception state block inside `_validateAndStore`**

Find this block (lines ~152–182):
```js
    // ── Exception state ───────────────────────────────────────────────────
    // Carry forward any existing exception request only while a violation persists.
    const prev = _meta[fieldId] ?? {};
    let exceptionRequested = softResult.isViolation ? (prev.exceptionRequested ?? false) : false;
    let rationale          = softResult.isViolation ? (prev.rationale ?? '')          : '';
    let rationaleValid     = false;

    if (softResult.isViolation && exceptionRequested && rationale) {
      // Re-validate rationale against the (possibly updated) rule
      rationaleValid = validateRationaleFn(rationale, softResult.rule).isValid;
    }
```

Replace with:
```js
    // ── Exception state (engine-driven auto-grant) ────────────────────────
    // Exceptions are no longer manually requested. When the engine detects
    // a soft violation the exception is automatically approved so that:
    //   - isFormEligibleForSubmission() stays unlocked (strict-only gate)
    //   - computeExceptionCount() correctly reflects violation count
    //   - isFlagged() triggers at > 2 violations as before
    const exceptionRequested = softResult.isViolation;
    const rationale          = '';
    const rationaleValid     = softResult.isViolation;
```

Also remove the `rationaleKeywords` / `rationaleMinLength` UI-hint lines and set them to empty defaults since the rationale UI is gone:

In `_meta[fieldId] = { ... }` block, keep the shape intact but those values become constants:
```js
    const rationaleKeywords  = [];
    const rationaleMinLength = 30;
```

**Step 2: Commit**
```bash
git add src/state/FormStateManager.js
git commit -m "feat: auto-grant soft exceptions in FormStateManager"
```

---

### Task 7: Refactor InputField.js — remove exception UI

**Files:**
- Modify: `src/ui/components/InputField.js`

**Step 1: Replace the full file**

Keep the structure identical. Remove:
- `softArea`, `exceptionRow`, `exceptionToggle`, `rationaleArea`, `rationaleLabel`, `rationaleHint`, `rationaleTextarea`, `rationaleMsgEl` DOM nodes
- Both event listeners (exceptionToggle click, rationaleTextarea input)
- All exception-state handling inside the subscriber

Replace the soft-area block with a single amber helper text element. The subscriber simplifies to only manage wrapper class + strict message + soft helper text.

```js
import { FormStateManager } from '../../state/FormStateManager.js';

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

  // ── Soft-violation helper text (amber, no interaction) ─────────────────
  const softHelper = document.createElement('p');
  softHelper.className = 'field__message field__message--warning';
  softHelper.setAttribute('aria-live', 'polite');
  softHelper.hidden = true;
  wrapper.appendChild(softHelper);

  // ── Subscribe to state changes ─────────────────────────────────────────
  const unsubscribe = FormStateManager.subscribe((values, meta) => {
    const fieldMeta = meta?.[id];
    if (!fieldMeta) return;

    const { strictValid, strictErrorMessage, softValid, softViolation } = fieldMeta;

    // Wrapper class (priority: strict > soft > valid)
    wrapper.classList.remove('field--valid', 'field--invalid', 'field--warning');
    if (strictValid === false) {
      wrapper.classList.add('field--invalid');
    } else if (softValid === false) {
      wrapper.classList.add('field--warning');
    } else if (strictValid === true && softValid !== false) {
      wrapper.classList.add('field--valid');
    }

    // Strict error message
    if (strictValid === false && strictErrorMessage) {
      messageEl.textContent = strictErrorMessage;
      messageEl.classList.add('field__message--error');
    } else {
      messageEl.textContent = '';
      messageEl.classList.remove('field__message--error');
    }

    // Soft helper text
    const hasSoftViolation = softValid === false;
    softHelper.hidden = !hasSoftViolation;
    softHelper.textContent = hasSoftViolation
      ? 'Below recommended threshold. Submission allowed but will be reviewed.'
      : '';
  });

  wrapper._unsubscribe = unsubscribe;
  return wrapper;
}

// ── Private builders (unchanged) ────────────────────────────────────────────

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
```

**Step 2: Commit**
```bash
git add src/ui/components/InputField.js
git commit -m "feat: remove manual exception UI from InputField, add soft helper text"
```

---

### Task 8: Clean up dead CSS in input.css

**Files:**
- Modify: `src/styles/input.css`

**Step 1:** Remove these now-unused rule blocks (lines 194–346 in the current file):
- `.field__soft-area` + `.field__exception-row` + `.field__exception-toggle` blocks
- `.field__rationale-area`, `@keyframes rationaleSlideIn`
- `.field__rationale-label`, `.field__rationale-hint`, `.field__rationale-hint strong`
- `.field__rationale-textarea`, `.field__rationale-textarea:focus`, `.field__rationale-textarea--invalid`
- `.field__rationale-message`, `.field__rationale-message--error`, `.field__rationale-message--valid`
- `.exception-counter`, `.exception-counter__label`, `.exception-counter__count`

Keep everything above line 194 (soft warning amber state `.field--warning`, `.field__message--warning`) — those are still used.

**Step 2: Commit**
```bash
git add src/styles/input.css
git commit -m "chore: remove dead exception/rationale CSS from input.css"
```

---

### Task 9: Create ComplianceStatusBadge.js

**Files:**
- Create: `src/ui/components/ComplianceStatusBadge.js`

**Step 1: Write the component**
```js
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
```

**Step 2: Commit**
```bash
git add src/ui/components/ComplianceStatusBadge.js
git commit -m "feat: add ComplianceStatusBadge (green/amber/red)"
```

---

### Task 10: Update app.js — swap ExceptionCounter for ComplianceStatusBadge

**Files:**
- Modify: `src/app.js`

**Step 1:** Replace `ExceptionCounter` import with `ComplianceStatusBadge`:
```js
// Remove:
import { ExceptionCounter } from './ui/components/ExceptionCounter.js';
// Add:
import { ComplianceStatusBadge } from './ui/components/ComplianceStatusBadge.js';
```

**Step 2:** Replace usage inside `App()`:
```js
// Remove:
stack.appendChild(ExceptionCounter());
// Add:
stack.appendChild(ComplianceStatusBadge());
```

**Step 3: Commit**
```bash
git add src/app.js
git commit -m "feat: swap ExceptionCounter for ComplianceStatusBadge in App"
```

---

### Task 11: Manual smoke test + final commit

**Step 1:** Start dev server
```bash
cd "C:/Users/K TIWARY/Aloo-University" && npm run dev
```

**Step 2:** Open http://localhost:5173 and verify:
- [ ] 3-second splash plays (logo fades, underline draws, glow pulses, screen fades)
- [ ] App mounts cleanly after splash
- [ ] Fields with soft violations show amber border + "Below recommended threshold…" text
- [ ] No "Request Exception" button or rationale textarea visible
- [ ] ComplianceStatusBadge shows green initially
- [ ] Entering a low score shifts badge to amber
- [ ] Risk banner appears when ≥ 3 soft violations
- [ ] Submit button enables only when all strict rules pass

**Step 3: Push**
```bash
git push origin main
```
