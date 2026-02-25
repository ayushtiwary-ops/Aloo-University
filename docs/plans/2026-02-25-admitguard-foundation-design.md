# AdmitGuard — Foundation Design
**ALOO University Admission Compliance System**
Date: 2026-02-25
Phase: 1 — Foundational Architecture + UI Shell

---

## 1. Project Context

AdmitGuard is an internal compliance platform for ALOO University that enforces eligibility rules at the point of candidate data entry. This phase covers only the foundational architecture, UI framework, and brand system. No validation logic, audit logic, or submission logic is implemented yet.

---

## 2. Tech Stack

- **Runtime:** Vanilla JavaScript (ES Modules)
- **Build tool:** Vite
- **Styling:** Plain CSS with CSS custom properties (design tokens)
- **Fonts:** Playfair Display (serif, headings) + Inter (sans-serif, body)
- **No frameworks. No Bootstrap. No utility CSS libraries.**

---

## 3. Folder Structure

```
Aloo-University/
├── index.html
├── package.json
├── vite.config.js
├── public/
└── src/
    ├── main.js
    ├── app.js
    ├── ui/
    │   ├── components/
    │   │   ├── Header.js
    │   │   ├── FormCard.js
    │   │   ├── InputField.js
    │   │   └── SubmitButton.js
    │   └── layout/
    │       └── RootLayout.js
    ├── state/
    │   └── FormStateManager.js
    ├── core/
    │   ├── ValidationEngine.js
    │   ├── ExceptionManager.js
    │   ├── SubmissionController.js
    │   └── AuditService.js
    ├── domain/
    │   ├── CandidateModel.js
    │   └── ExceptionModel.js
    ├── utils/
    │   ├── validators.js
    │   ├── dateUtils.js
    │   └── formatters.js
    ├── config/
    │   ├── rules.json
    │   └── schema.json
    └── styles/
        ├── tokens.css
        ├── base.css
        ├── layout.css
        ├── header.css
        ├── card.css
        ├── input.css
        └── button.css
```

---

## 4. Architecture

### Layer Responsibilities

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| UI | `src/ui/` | Presentation only. Components return DOM nodes. No business logic. |
| State | `src/state/` | Single source of truth for form field values and field validation states. |
| Core | `src/core/` | Business logic stubs. ValidationEngine, ExceptionManager, SubmissionController, AuditService. |
| Domain | `src/domain/` | Data shape definitions. CandidateModel, ExceptionModel. Plain JS objects. |
| Utils | `src/utils/` | Pure utility functions. No side effects. |
| Config | `src/config/` | JSON rule and schema definitions. Drives all core logic. |

### Component Architecture

All UI components follow the same pattern:
```js
// Each component is a function that returns a DOM node
export function ComponentName(props) {
  const el = document.createElement('div');
  // ... build DOM
  return el;
}
```

Components are mounted by `app.js` which orchestrates the full page tree. `main.js` is the entry point that loads config and mounts the app.

### State Management

`FormStateManager` is a plain JS module (singleton) with the following interface:

```js
FormStateManager = {
  fields: { [fieldId]: { value, valid, message } },
  set(fieldId, value),          // update value, trigger validation stub
  setFieldState(fieldId, result), // update {valid, message} after validation
  isSubmittable(),              // returns bool — all fields valid
  getSnapshot(),                // returns clean data object for submission
}
```

No event bus, no proxies, no framework reactivity in phase 1. Components call `FormStateManager.set()` on input events and re-render their indicator/message node from the returned state.

---

## 5. Data Flow

```
ConfigLoader.load() → rules.json → ValidationEngine (stub, receives rules)
                                               ↓
User input event → InputField → FormStateManager.set(field, value)
                                               ↓
                                   ValidationEngine.validate(field, value)
                                               ↓ {valid: null, message: ''}
                                   FormStateManager.setFieldState(field, result)
                                               ↓
                                   InputField updates indicator + message node
                                               ↓
                                   SubmitButton checks isSubmittable()
```

---

## 6. Design Tokens

### Color Palette (Earth / Roasted tones)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#3D2314` | Deep roasted brown — brand, headings |
| `--color-primary-light` | `#6B3D23` | Hover states |
| `--color-accent` | `#C8922A` | Muted gold — accent, highlights |
| `--color-accent-subtle` | `#E8D5A3` | Warm sand — backgrounds |
| `--color-bg-base` | `#FAF7F2` | Soft cream — page background |
| `--color-bg-card` | `#FFFFFF` | Card surface |
| `--color-bg-section` | `#F5F0E8` | Warm off-white — section card |
| `--color-border` | `#DDD3C0` | Warm grey border |
| `--color-text-primary` | `#1E1410` | Near-black warm — body text |
| `--color-text-secondary` | `#6B5B4E` | Secondary text |
| `--color-text-muted` | `#9E8E80` | Placeholders, captions |
| `--color-green-accent` | `#3D6142` | Fresh growth green — positive states |
| `--color-error` | `#8B2E2E` | Muted brick red — error states |
| `--color-neutral-state` | `#C4B8A8` | Neutral validation indicator |

### Spacing (8px scale)

`4px / 8px / 12px / 16px / 24px / 32px / 48px / 64px`

### Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| H1 | Playfair Display | 700 | 28px |
| H2 | Playfair Display | 600 | 20px |
| Section label | Inter | 600 | 11px uppercase |
| Body | Inter | 400 | 14px |
| Caption | Inter | 400 | 12px |

### Shadows

```css
--shadow-card: 0 1px 4px rgba(61,35,20,0.08), 0 4px 16px rgba(61,35,20,0.04);
--shadow-focus: 0 0 0 3px rgba(200,146,42,0.25);
```

### Border Radius

```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
```

---

## 7. Form Structure

Three card sections in sequence:

### Section 1 — Candidate Identity
- Full Name (text)
- Email (email)
- Phone (tel, 10-digit Indian mobile)
- Date of Birth (date)
- Aadhaar Number (text, 12-digit numeric)

### Section 2 — Academic Credentials
- Highest Qualification (select dropdown)
- Graduation Year (number)
- Percentage / CGPA (number with toggle)
- Screening Test Score (number, 0–100)

### Section 3 — Admission Decision
- Interview Status (select: Cleared / Waitlisted / Rejected)
- Offer Letter Sent (toggle: Yes / No)

Each field renders: label → input → neutral indicator dot → empty message container.

---

## 8. How Validation Engine Plugs In (Phase 2)

`FormStateManager.set()` already calls `ValidationEngine.validate(field, value, rules)`. The stub returns `{ valid: null, message: '' }`. In phase 2:

1. Populate `rules.json` with field rule definitions
2. `ConfigLoader` passes rules to `ValidationEngine` at startup
3. `ValidationEngine.validate()` evaluates the rules and returns real `{ valid, message }`
4. No UI code changes required

---

## 9. Non-Functional Requirements

- Loads under 3 seconds (no heavy deps)
- Semantic HTML, ARIA-friendly (label-for, role, aria-describedby)
- Desktop-first responsive layout
- Keyboard navigable focus states
