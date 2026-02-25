# AdmitGuard Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete foundational UI shell for AdmitGuard — ALOO University's admission compliance system — with full design system, all components, service stubs, and a working Vite dev server.

**Architecture:** DOM-component pattern — each UI component is a JS function that returns a mounted DOM node. A central `FormStateManager` holds all field state. All business logic lives in stub modules under `core/` that accept the correct signatures but return neutral values. Zero UI logic in components.

**Tech Stack:** Vanilla JS (ES Modules), plain CSS with custom properties, Vite 5, Google Fonts (Playfair Display + Inter). No frameworks, no Bootstrap.

---

## Reference: Design Tokens

The full token spec is in `docs/plans/2026-02-25-admitguard-foundation-design.md`. All colors, spacing, typography, and shadows used below come from that document.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`

**Step 1: Create `package.json`**

```json
{
  "name": "admitguard",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

**Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
});
```

**Step 3: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AdmitGuard — ALOO University</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/src/styles/tokens.css" />
    <link rel="stylesheet" href="/src/styles/base.css" />
    <link rel="stylesheet" href="/src/styles/layout.css" />
    <link rel="stylesheet" href="/src/styles/header.css" />
    <link rel="stylesheet" href="/src/styles/card.css" />
    <link rel="stylesheet" href="/src/styles/input.css" />
    <link rel="stylesheet" href="/src/styles/button.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

**Step 4: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors.

**Step 5: Verify dev server starts**

Run: `npm run dev`
Expected: Vite dev server starts on `http://localhost:5173`. Blank page with no console errors.

**Step 6: Commit**

```bash
git add package.json vite.config.js index.html
git commit -m "feat: scaffold Vite project for AdmitGuard"
```

---

### Task 2: Design Tokens + Base CSS

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`

**Step 1: Create `src/styles/tokens.css`**

```css
:root {
  /* ── Colors ── */
  --color-primary:         #3D2314;
  --color-primary-light:   #6B3D23;
  --color-accent:          #C8922A;
  --color-accent-subtle:   #E8D5A3;
  --color-bg-base:         #FAF7F2;
  --color-bg-card:         #FFFFFF;
  --color-bg-section:      #F5F0E8;
  --color-border:          #DDD3C0;
  --color-text-primary:    #1E1410;
  --color-text-secondary:  #6B5B4E;
  --color-text-muted:      #9E8E80;
  --color-green-accent:    #3D6142;
  --color-error:           #8B2E2E;
  --color-neutral-state:   #C4B8A8;

  /* ── Spacing (8px scale) ── */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  24px;
  --space-6:  32px;
  --space-7:  48px;
  --space-8:  64px;

  /* ── Typography ── */
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-sans:  'Inter', system-ui, -apple-system, sans-serif;

  --text-h1:      28px;
  --text-h2:      20px;
  --text-label:   11px;
  --text-body:    14px;
  --text-caption: 12px;

  /* ── Border Radius ── */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* ── Shadows ── */
  --shadow-card:  0 1px 4px rgba(61, 35, 20, 0.08), 0 4px 16px rgba(61, 35, 20, 0.04);
  --shadow-focus: 0 0 0 3px rgba(200, 146, 42, 0.25);

  /* ── Transitions ── */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
}
```

**Step 2: Create `src/styles/base.css`**

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-body);
  color: var(--color-text-primary);
  background-color: var(--color-bg-base);
  line-height: 1.6;
  min-height: 100vh;
}

h1, h2, h3 {
  font-family: var(--font-serif);
  color: var(--color-primary);
  line-height: 1.2;
}

a {
  color: var(--color-accent);
}

::selection {
  background: var(--color-accent-subtle);
}
```

**Step 3: Verify in browser**
Open `http://localhost:5173`. Background should be warm cream (`#FAF7F2`). No errors in console.

**Step 4: Commit**

```bash
git add src/styles/tokens.css src/styles/base.css
git commit -m "feat: add design tokens and base CSS reset"
```

---

### Task 3: Component Stylesheets

**Files:**
- Create: `src/styles/layout.css`
- Create: `src/styles/header.css`
- Create: `src/styles/card.css`
- Create: `src/styles/input.css`
- Create: `src/styles/button.css`

**Step 1: Create `src/styles/layout.css`**

```css
.root-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-container {
  flex: 1;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: var(--space-7) var(--space-5);
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.page-footer {
  padding: var(--space-5);
  text-align: center;
  font-size: var(--text-caption);
  color: var(--color-text-muted);
  border-top: 1px solid var(--color-border);
}
```

**Step 2: Create `src/styles/header.css`**

```css
.site-header {
  background-color: var(--color-primary);
  padding: var(--space-5) var(--space-6);
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.site-header__logo {
  flex-shrink: 0;
}

.logo-mark {
  display: block;
}

.site-header__brand {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.site-header__university {
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: 700;
  color: var(--color-accent-subtle);
  letter-spacing: -0.01em;
}

.site-header__system {
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--color-accent);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
```

**Step 3: Create `src/styles/card.css`**

```css
.form-card {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.form-card__header {
  background-color: var(--color-bg-section);
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.form-card__section-label {
  font-family: var(--font-sans);
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: var(--space-1);
}

.form-card__title {
  font-family: var(--font-serif);
  font-size: var(--text-h2);
  font-weight: 600;
  color: var(--color-primary);
}

.form-card__body {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
```

**Step 4: Create `src/styles/input.css`**

```css
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field__label {
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.field__indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-neutral-state);
  flex-shrink: 0;
  transition: background-color var(--transition-fast);
}

.field__control {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  color: var(--color-text-primary);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  appearance: none;
  -webkit-appearance: none;
  outline: none;
}

.field__control::placeholder {
  color: var(--color-text-muted);
}

.field__control:focus {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-focus);
}

.field__control--select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239E8E80' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-4) center;
  padding-right: var(--space-7);
  cursor: pointer;
}

.field__message {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--color-text-muted);
  min-height: 16px;
  line-height: 1.4;
}

/* Toggle (Yes / No) */
.field__toggle-group {
  display: flex;
  gap: var(--space-2);
}

.field__toggle-option {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: center;
  transition: all var(--transition-fast);
}

.field__toggle-option:hover {
  border-color: var(--color-accent);
  color: var(--color-primary);
}

.field__toggle-option[aria-pressed="true"] {
  background-color: var(--color-accent-subtle);
  border-color: var(--color-accent);
  color: var(--color-primary);
  font-weight: 600;
}
```

**Step 5: Create `src/styles/button.css`**

```css
.submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-4) var(--space-6);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-bg-card);
  background-color: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: not-allowed;
  opacity: 0.45;
  letter-spacing: 0.02em;
  transition: opacity var(--transition-base), background-color var(--transition-base);
}

.submit-button:not(:disabled) {
  cursor: pointer;
  opacity: 1;
}

.submit-button:not(:disabled):hover {
  background-color: var(--color-primary-light);
}

.submit-button__exception-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 var(--space-2);
  background-color: var(--color-error);
  border-radius: 10px;
  font-size: var(--text-caption);
  font-weight: 700;
  color: white;
  display: none; /* hidden until exceptions exist */
}
```

**Step 6: Verify**
Reload browser. Background still cream. No CSS errors in console.

**Step 7: Commit**

```bash
git add src/styles/layout.css src/styles/header.css src/styles/card.css src/styles/input.css src/styles/button.css
git commit -m "feat: add component stylesheets"
```

---

### Task 4: Domain Models + Config + Utils Stubs

**Files:**
- Create: `src/domain/CandidateModel.js`
- Create: `src/domain/ExceptionModel.js`
- Create: `src/config/rules.json`
- Create: `src/config/schema.json`
- Create: `src/utils/validators.js`
- Create: `src/utils/dateUtils.js`
- Create: `src/utils/formatters.js`

**Step 1: Create `src/domain/CandidateModel.js`**

This is a pure data shape definition — no methods, no logic.

```js
/**
 * CandidateModel
 *
 * Defines the canonical shape of a candidate record.
 * All fields default to null. Used by FormStateManager as
 * the authoritative schema for what constitutes a complete record.
 */
export const CandidateModel = {
  fullName:          null,
  email:             null,
  phone:             null,
  dateOfBirth:       null,
  aadhaarNumber:     null,
  highestQualification: null,
  graduationYear:    null,
  scoreValue:        null,        // Percentage or CGPA value
  scoreType:         'percentage', // 'percentage' | 'cgpa'
  screeningTestScore: null,
  interviewStatus:   null,        // 'cleared' | 'waitlisted' | 'rejected'
  offerLetterSent:   null,        // true | false
};
```

**Step 2: Create `src/domain/ExceptionModel.js`**

```js
/**
 * ExceptionModel
 *
 * Shape of a single compliance exception.
 * Populated by ExceptionManager in a future phase.
 */
export const ExceptionModel = {
  id:          null,   // uuid — assigned at creation
  fieldId:     null,   // which field triggered the exception
  ruleId:      null,   // which rule was violated
  severity:    null,   // 'strict' | 'soft'
  value:       null,   // the offending value
  message:     null,   // human-readable description
  timestamp:   null,   // ISO 8601
  resolution:  null,   // 'overridden' | 'corrected' | null
};
```

**Step 3: Create `src/config/rules.json`**

```json
{
  "_comment": "Phase 2 will populate this file with field-level compliance rules.",
  "_version": "0.0.0",
  "fields": {}
}
```

**Step 4: Create `src/config/schema.json`**

```json
{
  "_comment": "Formal field schema. Mirrors CandidateModel. Will be used for config-driven rendering in a future phase.",
  "_version": "0.0.0",
  "fields": [
    { "id": "fullName",             "label": "Full Name",              "type": "text" },
    { "id": "email",                "label": "Email",                  "type": "email" },
    { "id": "phone",                "label": "Phone",                  "type": "tel" },
    { "id": "dateOfBirth",          "label": "Date of Birth",          "type": "date" },
    { "id": "aadhaarNumber",        "label": "Aadhaar Number",         "type": "text" },
    { "id": "highestQualification", "label": "Highest Qualification",  "type": "select" },
    { "id": "graduationYear",       "label": "Graduation Year",        "type": "number" },
    { "id": "scoreValue",           "label": "Percentage / CGPA",      "type": "score" },
    { "id": "screeningTestScore",   "label": "Screening Test Score",   "type": "number" },
    { "id": "interviewStatus",      "label": "Interview Status",       "type": "select" },
    { "id": "offerLetterSent",      "label": "Offer Letter Sent",      "type": "toggle" }
  ]
}
```

**Step 5: Create `src/utils/validators.js`**

Stubs only — signatures defined, logic deferred to phase 2.

```js
/**
 * Pure validation utility functions.
 * These are called by ValidationEngine, never by UI components directly.
 * Phase 2 will implement the bodies.
 */

export const validators = {
  /** Returns true if value is a valid 10-digit Indian mobile number. */
  isIndianMobile: (value) => false,

  /** Returns true if value is a valid 12-digit Aadhaar number. */
  isAadhaar: (value) => false,

  /** Returns true if value is a valid email address. */
  isEmail: (value) => false,

  /** Returns true if year is a plausible graduation year. */
  isGraduationYear: (value) => false,

  /** Returns true if score is within 0–100 (screening test). */
  isScreeningScore: (value) => false,

  /** Returns true if percentage is within 0–100. */
  isPercentage: (value) => false,

  /** Returns true if CGPA is within 0–10. */
  isCgpa: (value) => false,
};
```

**Step 6: Create `src/utils/dateUtils.js`**

```js
/**
 * Date utility functions.
 * Phase 2 will implement age and date-range calculations.
 */

export const dateUtils = {
  /** Returns the age in years from a date string. */
  getAge: (dateString) => null,

  /** Returns true if the candidate is at least minAge years old. */
  isMinimumAge: (dateString, minAge) => false,

  /** Formats a date string to DD/MM/YYYY for display. */
  toDisplayDate: (dateString) => dateString,
};
```

**Step 7: Create `src/utils/formatters.js`**

```js
/**
 * Display formatting utilities.
 */

export const formatters = {
  /** Masks Aadhaar: shows only last 4 digits. e.g. "XXXX XXXX 1234" */
  maskAadhaar: (value) => value,

  /** Formats phone number with spaces. e.g. "98765 43210" */
  formatPhone: (value) => value,
};
```

**Step 8: Commit**

```bash
git add src/domain/ src/config/ src/utils/
git commit -m "feat: add domain models, config placeholders, and utility stubs"
```

---

### Task 5: Core Service Stubs

**Files:**
- Create: `src/core/ValidationEngine.js`
- Create: `src/core/ExceptionManager.js`
- Create: `src/core/SubmissionController.js`
- Create: `src/core/AuditService.js`
- Create: `src/core/ConfigLoader.js`

**Step 1: Create `src/core/ConfigLoader.js`**

```js
/**
 * ConfigLoader
 *
 * Responsible for loading and exposing the rules.json configuration.
 * In phase 2, this will be the single source of truth for all
 * validation rules passed to ValidationEngine.
 */

let _rules = null;

export const ConfigLoader = {
  /**
   * Loads rules.json. Must be called before ValidationEngine is used.
   * @returns {Promise<object>} The parsed rules configuration.
   */
  async load() {
    const response = await fetch('/src/config/rules.json');
    _rules = await response.json();
    return _rules;
  },

  /** Returns the loaded rules, or null if not yet loaded. */
  getRules() {
    return _rules;
  },
};
```

**Step 2: Create `src/core/ValidationEngine.js`**

The signature is final. Only the body is a stub.

```js
/**
 * ValidationEngine
 *
 * The central validation authority. Receives field id, current value,
 * and the loaded rules configuration. Returns a structured result.
 *
 * Phase 2 will implement rule evaluation logic inside validate().
 * No other file changes are needed to activate validation.
 */

export const ValidationEngine = {
  /**
   * Validates a single field value against its configured rules.
   *
   * @param {string} fieldId    - The field identifier (matches CandidateModel keys)
   * @param {*}      value      - The current field value
   * @param {object} rules      - The full rules config from ConfigLoader.getRules()
   * @returns {{ valid: null|boolean, message: string }}
   */
  validate(fieldId, value, rules) {
    // STUB — Phase 2 implementation goes here.
    return { valid: null, message: '' };
  },
};
```

**Step 3: Create `src/core/ExceptionManager.js`**

```js
/**
 * ExceptionManager
 *
 * Records and manages compliance exceptions raised during validation.
 * Phase 2 will implement storage and retrieval logic.
 */

const _exceptions = [];

export const ExceptionManager = {
  /**
   * Records a new compliance exception.
   *
   * @param {string} fieldId  - The field that triggered the exception
   * @param {string} ruleId   - The rule that was violated
   * @param {*}      value    - The offending value
   * @param {string} severity - 'strict' | 'soft'
   */
  log(fieldId, ruleId, value, severity) {
    // STUB — Phase 2 implementation goes here.
  },

  /** Returns all logged exceptions. */
  getAll() {
    return [..._exceptions];
  },

  /** Returns count of unresolved exceptions. */
  getCount() {
    return _exceptions.length;
  },

  /** Clears all exceptions. Called on successful submission. */
  clear() {
    _exceptions.length = 0;
  },
};
```

**Step 4: Create `src/core/SubmissionController.js`**

```js
/**
 * SubmissionController
 *
 * Orchestrates the form submission pipeline:
 * validate all fields → check exceptions → call AuditService → submit.
 * Phase 2 will implement the full pipeline.
 */

export const SubmissionController = {
  /**
   * Attempts to submit the form data.
   *
   * @param {object} snapshot - Clean data object from FormStateManager.getSnapshot()
   * @returns {Promise<{ success: boolean, error: string|null }>}
   */
  async submit(snapshot) {
    // STUB — Phase 2 implementation goes here.
    return { success: false, error: 'Submission not yet implemented.' };
  },
};
```

**Step 5: Create `src/core/AuditService.js`**

```js
/**
 * AuditService
 *
 * Records all significant system events for compliance traceability.
 * Phase 2 will implement durable audit storage.
 */

export const AuditService = {
  /**
   * Records a system event.
   *
   * @param {string} event   - Event name (e.g. 'FORM_SUBMITTED', 'EXCEPTION_OVERRIDDEN')
   * @param {object} payload - Contextual data for the event
   */
  record(event, payload = {}) {
    // STUB — Phase 2 implementation goes here.
    console.debug(`[AuditService] ${event}`, payload);
  },
};
```

**Step 6: Commit**

```bash
git add src/core/
git commit -m "feat: add core service stubs with final API signatures"
```

---

### Task 6: FormStateManager

**Files:**
- Create: `src/state/FormStateManager.js`

**Step 1: Create `src/state/FormStateManager.js`**

```js
import { CandidateModel } from '../domain/CandidateModel.js';
import { ValidationEngine } from '../core/ValidationEngine.js';
import { ConfigLoader } from '../core/ConfigLoader.js';

/**
 * FormStateManager
 *
 * The single source of truth for all form field values and their
 * validation states. UI components read from and write to this
 * module exclusively — never to each other.
 *
 * State shape per field:
 *   { value: any, valid: null|boolean, message: string }
 */

const _fields = Object.fromEntries(
  Object.keys(CandidateModel).map((key) => [
    key,
    { value: CandidateModel[key], valid: null, message: '' },
  ])
);

/** Subscribers notified on any state change. */
const _subscribers = new Set();

export const FormStateManager = {
  /**
   * Updates a field's value, runs validation, and notifies subscribers.
   *
   * @param {string} fieldId
   * @param {*}      value
   */
  set(fieldId, value) {
    if (!_fields[fieldId]) return;

    _fields[fieldId].value = value;

    const result = ValidationEngine.validate(
      fieldId,
      value,
      ConfigLoader.getRules()
    );

    _fields[fieldId].valid   = result.valid;
    _fields[fieldId].message = result.message;

    this._notify(fieldId);
  },

  /**
   * Directly sets validation state (used by bulk-validate on submit attempt).
   *
   * @param {string} fieldId
   * @param {{ valid: boolean|null, message: string }} result
   */
  setFieldState(fieldId, result) {
    if (!_fields[fieldId]) return;
    _fields[fieldId].valid   = result.valid;
    _fields[fieldId].message = result.message;
    this._notify(fieldId);
  },

  /**
   * Returns current state for a single field.
   *
   * @param {string} fieldId
   * @returns {{ value: any, valid: null|boolean, message: string }}
   */
  get(fieldId) {
    return { ..._fields[fieldId] };
  },

  /**
   * Returns true when all fields have valid === true.
   * Always false in phase 1 (ValidationEngine is a stub).
   *
   * @returns {boolean}
   */
  isSubmittable() {
    return Object.values(_fields).every((f) => f.valid === true);
  },

  /**
   * Returns a clean snapshot of all field values — ready for submission.
   *
   * @returns {object}
   */
  getSnapshot() {
    return Object.fromEntries(
      Object.entries(_fields).map(([key, state]) => [key, state.value])
    );
  },

  /**
   * Registers a callback to be called when a field's state changes.
   *
   * @param {function} callback - Receives (fieldId, fieldState)
   * @returns {function} Unsubscribe function
   */
  subscribe(callback) {
    _subscribers.add(callback);
    return () => _subscribers.delete(callback);
  },

  /** @private */
  _notify(fieldId) {
    const state = this.get(fieldId);
    _subscribers.forEach((cb) => cb(fieldId, state));
  },
};
```

**Step 2: Commit**

```bash
git add src/state/FormStateManager.js
git commit -m "feat: add FormStateManager with subscriber pattern"
```

---

### Task 7: UI Components — RootLayout + Header

**Files:**
- Create: `src/ui/layout/RootLayout.js`
- Create: `src/ui/components/Header.js`

**Step 1: Create `src/ui/layout/RootLayout.js`**

```js
import { Header } from '../components/Header.js';

/**
 * RootLayout
 *
 * Top-level page shell. Mounts the header, main content area,
 * and footer. Receives the main content as a DOM node.
 *
 * @param {{ main: HTMLElement }} props
 * @returns {HTMLElement}
 */
export function RootLayout({ main }) {
  const root = document.createElement('div');
  root.className = 'root-layout';

  root.appendChild(Header());

  const mainContainer = document.createElement('main');
  mainContainer.className = 'main-container';
  mainContainer.setAttribute('role', 'main');
  mainContainer.appendChild(main);
  root.appendChild(mainContainer);

  const footer = document.createElement('footer');
  footer.className = 'page-footer';
  footer.textContent = `© ${new Date().getFullYear()} ALOO University. Internal use only.`;
  root.appendChild(footer);

  return root;
}
```

**Step 2: Create `src/ui/components/Header.js`**

The SVG logomark is an abstract organic oval — not a literal potato.

```js
/**
 * Header
 *
 * Site header with ALOO University brand, abstract oval logomark,
 * and AdmitGuard system title.
 *
 * @returns {HTMLElement}
 */
export function Header() {
  const header = document.createElement('header');
  header.className = 'site-header';
  header.setAttribute('role', 'banner');

  header.innerHTML = `
    <div class="site-header__logo" aria-hidden="true">
      <svg
        class="logo-mark"
        width="44"
        height="44"
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <!-- Abstract organic oval — inspired by form, not literal -->
        <ellipse
          cx="22"
          cy="22"
          rx="18"
          ry="13"
          transform="rotate(-15 22 22)"
          fill="none"
          stroke="#C8922A"
          stroke-width="1.5"
        />
        <ellipse
          cx="22"
          cy="22"
          rx="10"
          ry="6"
          transform="rotate(-15 22 22)"
          fill="#C8922A"
          opacity="0.2"
        />
        <circle cx="22" cy="22" r="2" fill="#C8922A" />
      </svg>
    </div>

    <div class="site-header__brand">
      <span class="site-header__university">ALOO University</span>
      <span class="site-header__system">AdmitGuard — Admission Compliance System</span>
    </div>
  `;

  return header;
}
```

**Step 3: Wire into main.js temporarily to verify**

Create a minimal `src/main.js` just to test:

```js
import { RootLayout } from './ui/layout/RootLayout.js';

const placeholder = document.createElement('p');
placeholder.textContent = 'Form loads here.';

document.getElementById('app').appendChild(
  RootLayout({ main: placeholder })
);
```

**Step 4: Verify in browser**
- Dark brown header visible
- "ALOO University" in serif font
- "AdmitGuard — Admission Compliance System" in uppercase sans-serif below
- Abstract oval SVG logomark visible in gold
- Warm cream page background

**Step 5: Commit**

```bash
git add src/ui/ src/main.js
git commit -m "feat: add RootLayout and Header components"
```

---

### Task 8: UI Components — FormCard + InputField + SubmitButton

**Files:**
- Create: `src/ui/components/FormCard.js`
- Create: `src/ui/components/InputField.js`
- Create: `src/ui/components/SubmitButton.js`

**Step 1: Create `src/ui/components/FormCard.js`**

```js
/**
 * FormCard
 *
 * A titled section card that wraps a group of related form fields.
 * Receives pre-built field DOM nodes as children.
 *
 * @param {{ sectionLabel: string, title: string, children: HTMLElement[] }} props
 * @returns {HTMLElement}
 */
export function FormCard({ sectionLabel, title, children }) {
  const card = document.createElement('section');
  card.className = 'form-card';
  card.setAttribute('aria-label', title);

  const cardHeader = document.createElement('div');
  cardHeader.className = 'form-card__header';
  cardHeader.innerHTML = `
    <p class="form-card__section-label">${sectionLabel}</p>
    <h2 class="form-card__title">${title}</h2>
  `;

  const cardBody = document.createElement('div');
  cardBody.className = 'form-card__body';
  children.forEach((child) => cardBody.appendChild(child));

  card.appendChild(cardHeader);
  card.appendChild(cardBody);

  return card;
}
```

**Step 2: Create `src/ui/components/InputField.js`**

Handles all field types: text, email, tel, date, number, select, score (number+toggle), toggle (yes/no).

```js
import { FormStateManager } from '../../state/FormStateManager.js';

/**
 * InputField
 *
 * Reusable, self-contained field component. Handles its own DOM
 * construction and subscribes to FormStateManager for state updates.
 *
 * Supports types: 'text' | 'email' | 'tel' | 'date' | 'number' |
 *                 'select' | 'score' | 'toggle'
 *
 * @param {{
 *   id:          string,
 *   label:       string,
 *   type:        string,
 *   placeholder?: string,
 *   options?:    { value: string, label: string }[]
 * }} props
 * @returns {HTMLElement}
 */
export function InputField({ id, label, type, placeholder = '', options = [] }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';

  // ── Label ──────────────────────────────────────────────────
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
  let control;

  if (type === 'select') {
    control = _buildSelect(id, placeholder, options);
  } else if (type === 'score') {
    control = _buildScore(id);
  } else if (type === 'toggle') {
    control = _buildToggle(id);
  } else {
    control = _buildInput(id, type, placeholder);
  }

  wrapper.appendChild(control);

  // ── Validation message ─────────────────────────────────────
  const message = document.createElement('p');
  message.className = 'field__message';
  message.id = `${id}-message`;
  message.setAttribute('aria-live', 'polite');
  wrapper.appendChild(message);

  // Link input to message for screen readers
  if (control.tagName === 'INPUT' || control.tagName === 'SELECT') {
    control.setAttribute('aria-describedby', `${id}-message`);
  }

  // ── Subscribe to state changes ─────────────────────────────
  FormStateManager.subscribe((fieldId, state) => {
    if (fieldId !== id) return;
    message.textContent = state.message;
    // Indicator color will be driven by validation state in phase 2
    // For now it stays neutral (--color-neutral-state via CSS)
  });

  return wrapper;
}

/** @private */
function _buildInput(id, type, placeholder) {
  const input = document.createElement('input');
  input.className = 'field__control';
  input.id = id;
  input.name = id;
  input.type = type;
  input.placeholder = placeholder;
  input.addEventListener('input', (e) => FormStateManager.set(id, e.target.value));
  return input;
}

/** @private */
function _buildSelect(id, placeholder, options) {
  const select = document.createElement('select');
  select.className = 'field__control field__control--select';
  select.id = id;
  select.name = id;

  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = placeholder || 'Select an option';
  defaultOpt.disabled = true;
  defaultOpt.selected = true;
  select.appendChild(defaultOpt);

  options.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  });

  select.addEventListener('change', (e) => FormStateManager.set(id, e.target.value));
  return select;
}

/** @private — Score field: number input + percentage/CGPA toggle */
function _buildScore(id) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.gap = '8px';

  const input = document.createElement('input');
  input.className = 'field__control';
  input.id = id;
  input.name = id;
  input.type = 'number';
  input.placeholder = 'Enter value';
  input.style.flex = '1';
  input.addEventListener('input', (e) => {
    FormStateManager.set(id, e.target.value);
  });

  const toggleGroup = document.createElement('div');
  toggleGroup.className = 'field__toggle-group';
  toggleGroup.style.width = '180px';
  toggleGroup.style.flexShrink = '0';
  toggleGroup.setAttribute('role', 'group');
  toggleGroup.setAttribute('aria-label', 'Score type');

  const scoreTypes = [
    { value: 'percentage', label: 'Percentage' },
    { value: 'cgpa',       label: 'CGPA' },
  ];

  let selectedType = 'percentage';

  scoreTypes.forEach(({ value, label }) => {
    const btn = document.createElement('button');
    btn.className = 'field__toggle-option';
    btn.type = 'button';
    btn.textContent = label;
    btn.setAttribute('aria-pressed', value === selectedType ? 'true' : 'false');

    btn.addEventListener('click', () => {
      selectedType = value;
      toggleGroup.querySelectorAll('.field__toggle-option').forEach((b) => {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      FormStateManager.set('scoreType', value);
    });

    toggleGroup.appendChild(btn);
  });

  container.appendChild(input);
  container.appendChild(toggleGroup);
  return container;
}

/** @private — Yes/No toggle */
function _buildToggle(id) {
  const group = document.createElement('div');
  group.className = 'field__toggle-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', id);

  let selected = null;

  [{ value: true, label: 'Yes' }, { value: false, label: 'No' }].forEach(({ value, label }) => {
    const btn = document.createElement('button');
    btn.className = 'field__toggle-option';
    btn.type = 'button';
    btn.textContent = label;
    btn.setAttribute('aria-pressed', 'false');
    btn.id = value === true ? `${id}-yes` : `${id}-no`;

    btn.addEventListener('click', () => {
      selected = value;
      group.querySelectorAll('.field__toggle-option').forEach((b) => {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      FormStateManager.set(id, value);
    });

    group.appendChild(btn);
  });

  return group;
}
```

**Step 3: Create `src/ui/components/SubmitButton.js`**

```js
import { FormStateManager } from '../../state/FormStateManager.js';
import { SubmissionController } from '../../core/SubmissionController.js';
import { AuditService } from '../../core/AuditService.js';

/**
 * SubmitButton
 *
 * Disabled until FormStateManager.isSubmittable() returns true.
 * Includes an exception badge slot (hidden until exceptions exist).
 *
 * @returns {HTMLElement}
 */
export function SubmitButton() {
  const button = document.createElement('button');
  button.className = 'submit-button';
  button.type = 'submit';
  button.disabled = true;

  const label = document.createElement('span');
  label.textContent = 'Submit Application';

  const badge = document.createElement('span');
  badge.className = 'submit-button__exception-badge';
  badge.setAttribute('aria-label', '0 compliance exceptions');

  button.appendChild(label);
  button.appendChild(badge);

  // Re-evaluate submittability on every state change
  FormStateManager.subscribe(() => {
    button.disabled = !FormStateManager.isSubmittable();
  });

  button.addEventListener('click', async () => {
    if (button.disabled) return;

    AuditService.record('FORM_SUBMIT_ATTEMPTED', {
      snapshot: FormStateManager.getSnapshot(),
    });

    const result = await SubmissionController.submit(FormStateManager.getSnapshot());

    if (result.success) {
      AuditService.record('FORM_SUBMIT_SUCCESS');
    } else {
      AuditService.record('FORM_SUBMIT_FAILED', { error: result.error });
    }
  });

  return button;
}
```

**Step 4: Commit**

```bash
git add src/ui/components/FormCard.js src/ui/components/InputField.js src/ui/components/SubmitButton.js
git commit -m "feat: add FormCard, InputField, and SubmitButton components"
```

---

### Task 9: app.js — Compose the Full Form

**Files:**
- Modify: `src/app.js` (create fresh)

**Step 1: Create `src/app.js`**

```js
import { FormCard }    from './ui/components/FormCard.js';
import { InputField }  from './ui/components/InputField.js';
import { SubmitButton } from './ui/components/SubmitButton.js';

/**
 * App
 *
 * Composes the three form sections and all 11 fields.
 * Returns the main content node — no logic here.
 *
 * @returns {HTMLElement}
 */
export function App() {
  const stack = document.createElement('div');
  stack.className = 'form-stack';

  // ── Section 1: Candidate Identity ──────────────────────────
  stack.appendChild(FormCard({
    sectionLabel: 'Section 1 of 3',
    title: 'Candidate Identity',
    children: [
      InputField({
        id: 'fullName',
        label: 'Full Name',
        type: 'text',
        placeholder: 'Enter candidate\'s full legal name',
      }),
      InputField({
        id: 'email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'example@domain.com',
      }),
      InputField({
        id: 'phone',
        label: 'Phone Number',
        type: 'tel',
        placeholder: '10-digit Indian mobile number',
      }),
      InputField({
        id: 'dateOfBirth',
        label: 'Date of Birth',
        type: 'date',
        placeholder: '',
      }),
      InputField({
        id: 'aadhaarNumber',
        label: 'Aadhaar Number',
        type: 'text',
        placeholder: '12-digit Aadhaar number',
      }),
    ],
  }));

  // ── Section 2: Academic Credentials ────────────────────────
  stack.appendChild(FormCard({
    sectionLabel: 'Section 2 of 3',
    title: 'Academic Credentials',
    children: [
      InputField({
        id: 'highestQualification',
        label: 'Highest Qualification',
        type: 'select',
        placeholder: 'Select qualification',
        options: [
          { value: 'ssc',        label: 'SSC (10th)' },
          { value: 'hsc',        label: 'HSC (12th)' },
          { value: 'diploma',    label: 'Diploma' },
          { value: 'bachelors',  label: "Bachelor's Degree" },
          { value: 'masters',    label: "Master's Degree" },
          { value: 'phd',        label: 'PhD / Doctorate' },
        ],
      }),
      InputField({
        id: 'graduationYear',
        label: 'Graduation Year',
        type: 'number',
        placeholder: 'e.g. 2022',
      }),
      InputField({
        id: 'scoreValue',
        label: 'Percentage / CGPA',
        type: 'score',
      }),
      InputField({
        id: 'screeningTestScore',
        label: 'Screening Test Score',
        type: 'number',
        placeholder: '0 – 100',
      }),
    ],
  }));

  // ── Section 3: Admission Decision ──────────────────────────
  stack.appendChild(FormCard({
    sectionLabel: 'Section 3 of 3',
    title: 'Admission Decision',
    children: [
      InputField({
        id: 'interviewStatus',
        label: 'Interview Status',
        type: 'select',
        placeholder: 'Select interview outcome',
        options: [
          { value: 'cleared',    label: 'Cleared' },
          { value: 'waitlisted', label: 'Waitlisted' },
          { value: 'rejected',   label: 'Rejected' },
        ],
      }),
      InputField({
        id: 'offerLetterSent',
        label: 'Offer Letter Sent',
        type: 'toggle',
      }),
    ],
  }));

  // ── Submit ──────────────────────────────────────────────────
  stack.appendChild(SubmitButton());

  return stack;
}
```

**Step 2: Commit**

```bash
git add src/app.js
git commit -m "feat: compose full 3-section form in App component"
```

---

### Task 10: main.js — Entry Point + Final Integration

**Files:**
- Modify: `src/main.js`

**Step 1: Update `src/main.js`**

```js
import { ConfigLoader } from './core/ConfigLoader.js';
import { App }          from './app.js';
import { RootLayout }   from './ui/layout/RootLayout.js';

/**
 * Entry point.
 *
 * 1. Load configuration (rules.json)
 * 2. Compose the application tree
 * 3. Mount to #app
 */
async function init() {
  await ConfigLoader.load();

  const app = document.getElementById('app');
  app.appendChild(RootLayout({ main: App() }));
}

init().catch((err) => {
  console.error('[AdmitGuard] Failed to initialise application:', err);
});
```

**Step 2: Verify complete application in browser**

Open `http://localhost:5173`. Verify:

- [ ] Dark brown header renders with logo and ALOO University title
- [ ] Three section cards visible with correct titles
- [ ] All 11 fields present with labels, placeholders, neutral indicator dots
- [ ] Score field shows number input + Percentage/CGPA toggle side by side
- [ ] Offer Letter Sent shows Yes/No toggle buttons
- [ ] Interview Status shows dropdown with 3 options
- [ ] Submit button visible, disabled, muted appearance
- [ ] Typing in any field does not cause console errors
- [ ] No JavaScript errors in console
- [ ] Page background is warm cream

**Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: wire entry point with ConfigLoader and full app mount"
```

---

### Task 11: Final Verification + Cleanup Commit

**Step 1: Run build to verify no bundler errors**

Run: `npm run build`
Expected: `dist/` folder created, no errors.

**Step 2: Check accessibility structure**

Open browser DevTools → Accessibility tree. Verify:
- All inputs have associated labels
- ARIA roles on header (`banner`), main (`main`), cards (`region`)
- Toggle buttons have `aria-pressed` attributes
- Message containers have `aria-live="polite"`

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete AdmitGuard phase 1 — foundational UI shell and architecture"
```

---

## Summary

| Task | Deliverable |
|------|-------------|
| 1 | Vite project scaffold |
| 2 | Design tokens + base CSS |
| 3 | All component stylesheets |
| 4 | Domain models, config, utility stubs |
| 5 | Core service stubs (final API signatures) |
| 6 | FormStateManager with subscriber pattern |
| 7 | RootLayout + Header components |
| 8 | FormCard + InputField + SubmitButton |
| 9 | app.js — full 3-section form composition |
| 10 | main.js — entry point + integration |
| 11 | Build verification + accessibility check |
