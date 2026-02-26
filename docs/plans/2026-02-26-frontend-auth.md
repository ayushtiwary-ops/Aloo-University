# Frontend Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a login gate to the AdmitGuard frontend — unauthenticated users see a LoginView, authenticated users see the app, with Dashboard hidden for non-admins and a logout button in the header.

**Architecture:** `AuthService` wraps localStorage for token + user storage and JWT role decoding. `ApiClient` is a fetch wrapper that injects Bearer tokens and dispatches `auth:unauthorized` on 401. `main.js` controls view mounting via `mountLogin()` / `mountApp()` helpers and listens for the `auth:unauthorized` event to handle token expiry without a page reload.

**Tech Stack:** Vanilla JS ESM, Vite, existing tokens.css design system, backend JWT already in place at `POST /api/auth/login`.

---

### Task 1: Create AuthService.js

**Files:**
- Create: `src/core/AuthService.js`

**Step 1: Write the file**

```js
/**
 * AuthService
 *
 * Manages JWT authentication state for the frontend.
 * Token and user object are stored in localStorage so sessions
 * persist across tabs and browser restarts.
 *
 * Keys:
 *   ag_token — raw JWT string
 *   ag_user  — JSON { id, email, role }
 */

const TOKEN_KEY = 'ag_token';
const USER_KEY  = 'ag_user';

export const AuthService = {

  /**
   * Stores token + user from the login API response.
   * @param {string} token
   * @param {{ id: string, email: string, role: string }} user
   */
  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  /** Returns the raw JWT string, or null. */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  /** Returns the stored user object, or null. */
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },

  /** Returns the user's role ('admin' | 'user'), or null. */
  getRole() {
    return this.getUser()?.role ?? null;
  },

  /** Returns the user's email, or null. */
  getEmail() {
    return this.getUser()?.email ?? null;
  },

  /**
   * Returns true when a token exists AND has not expired.
   * Decodes the JWT payload (base64) to read the `exp` claim — no library needed.
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  /** Clears stored session data without triggering any redirect. */
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Logs out: clears storage and dispatches 'auth:unauthorized'
   * so main.js can swap the view without a full page reload.
   */
  logout() {
    this.clearToken();
    document.dispatchEvent(new CustomEvent('auth:unauthorized'));
  },
};
```

**Step 2: Commit**

```bash
cd "C:/Users/K TIWARY/Aloo-University" && git add src/core/AuthService.js && git commit -m "feat: add AuthService — localStorage token management and JWT expiry check

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Create ApiClient.js

**Files:**
- Create: `src/core/ApiClient.js`

**Step 1: Write the file**

```js
/**
 * ApiClient
 *
 * Thin fetch wrapper for the AdmitGuard backend.
 * - Injects Authorization: Bearer <token> on every request.
 * - On 401: clears the token and dispatches 'auth:unauthorized'
 *   so main.js can swap to LoginView without a full page reload.
 *
 * Base URL: VITE_API_URL env var, falling back to http://localhost:3001.
 */

import { AuthService } from './AuthService.js';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function request(method, path, body) {
  const token = AuthService.getToken();

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    AuthService.clearToken();
    document.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export const ApiClient = {
  /** POST /api/auth/login — does NOT inject auth header (pre-login) */
  async login(email, password) {
    return request('POST', '/api/auth/login', { email, password });
  },

  async postAuditRecord(record) {
    return request('POST', '/api/audit', record);
  },

  async getAuditRecords({ page = 1, limit = 20 } = {}) {
    return request('GET', `/api/audit?page=${page}&limit=${limit}`);
  },

  async getAnalytics() {
    return request('GET', '/api/analytics');
  },
};
```

**Step 2: Commit**

```bash
cd "C:/Users/K TIWARY/Aloo-University" && git add src/core/ApiClient.js && git commit -m "feat: add ApiClient — fetch wrapper with Bearer auth and 401 interceptor

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Create auth.css and LoginView.js

**Files:**
- Create: `src/styles/auth.css`
- Create: `src/ui/components/LoginView.js`
- Modify: `index.html` — add `<link>` for auth.css after badge.css

**Step 1: Create src/styles/auth.css**

```css
/* ── Login View ─────────────────────────────────────────────── */

.login-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-base);
  padding: var(--space-5);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-7) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* Brand block at top of card */
.login-card__brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-align: center;
}

.login-card__logo {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #C8922A, #7A4A10);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 24px;
  color: #FAF7F2;
  margin-bottom: var(--space-2);
}

.login-card__title {
  font-family: var(--font-serif);
  font-size: var(--text-h2);
  font-weight: 700;
  color: var(--color-primary);
}

.login-card__subtitle {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Form fields */
.login-card__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.login-card__label {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--color-text-primary);
}

.login-card__input {
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  color: var(--color-text-primary);
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.login-card__input:focus {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-focus);
}

/* Error message */
.login-card__error {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--color-error);
  text-align: center;
  min-height: 18px;
}

/* Submit button */
.login-card__submit {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 600;
  color: #FAF7F2;
  background-color: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: background-color var(--transition-fast);
}

.login-card__submit:hover:not(:disabled) {
  background-color: var(--color-primary-light);
}

.login-card__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* CSS spinner */
.login-card__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: loginSpin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes loginSpin {
  to { transform: rotate(360deg); }
}

/* Header logout area */
.site-header__user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}

.site-header__user-email {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--color-accent-subtle);
  opacity: 0.8;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--color-accent-subtle);
  background-color: transparent;
  border: 1px solid rgba(200, 146, 42, 0.4);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.logout-btn:hover {
  background-color: rgba(200, 146, 42, 0.15);
  border-color: var(--color-accent);
  color: var(--color-accent);
}
```

**Step 2: Create src/ui/components/LoginView.js**

```js
import { AuthService } from '../../core/AuthService.js';
import { ApiClient }   from '../../core/ApiClient.js';

/**
 * LoginView
 *
 * Centered login card. Calls POST /api/auth/login via ApiClient,
 * stores the session via AuthService, then calls onSuccess().
 *
 * Features:
 * - Loading state: button disabled + spinner during request
 * - aria-live error message on failure
 * - Prevents double-submit
 *
 * @param {{ onSuccess: () => void }} options
 * @returns {HTMLElement}
 */
export function LoginView({ onSuccess }) {
  const view = document.createElement('div');
  view.className = 'login-view';

  view.innerHTML = `
    <div class="login-card" role="main">
      <div class="login-card__brand">
        <div class="login-card__logo" aria-hidden="true">A</div>
        <h1 class="login-card__title">ALOO University</h1>
        <p class="login-card__subtitle">Admission Compliance System</p>
      </div>

      <div class="login-card__fields">
        <label class="login-card__label">
          Email Address
          <input
            class="login-card__input"
            id="login-email"
            type="email"
            autocomplete="email"
            placeholder="admin@aloo.edu"
            required
          />
        </label>
        <label class="login-card__label">
          Password
          <input
            class="login-card__input"
            id="login-password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            required
          />
        </label>
      </div>

      <p class="login-card__error" role="alert" aria-live="polite" id="login-error"></p>

      <button class="login-card__submit" type="button" id="login-submit">
        Sign In
      </button>
    </div>
  `;

  const emailInput  = view.querySelector('#login-email');
  const passInput   = view.querySelector('#login-password');
  const errorEl     = view.querySelector('#login-error');
  const submitBtn   = view.querySelector('#login-submit');

  let _loading = false;

  function _setLoading(on) {
    _loading = on;
    submitBtn.disabled = on;
    submitBtn.innerHTML = on
      ? '<span class="login-card__spinner" aria-hidden="true"></span> Signing in…'
      : 'Sign In';
  }

  function _setError(msg) {
    errorEl.textContent = msg;
  }

  async function _handleSubmit() {
    if (_loading) return;

    const email    = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) {
      _setError('Please enter your email and password.');
      return;
    }

    _setError('');
    _setLoading(true);

    try {
      const { token, user } = await ApiClient.login(email, password);
      AuthService.setSession(token, user);
      onSuccess();
    } catch (err) {
      _setError(err.message ?? 'Login failed. Please try again.');
      _setLoading(false);
    }
  }

  submitBtn.addEventListener('click', _handleSubmit);

  // Allow Enter key in either field
  [emailInput, passInput].forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _handleSubmit();
    });
  });

  // Focus email on mount
  requestAnimationFrame(() => emailInput.focus());

  return view;
}
```

**Step 3: Add link to index.html**

In `index.html`, after the line `<link rel="stylesheet" href="/src/styles/badge.css" />` add:
```html
    <link rel="stylesheet" href="/src/styles/auth.css" />
```

**Step 4: Commit**

```bash
cd "C:/Users/K TIWARY/Aloo-University" && git add src/styles/auth.css src/ui/components/LoginView.js index.html && git commit -m "feat: add LoginView and auth.css — login card with loading state and error display

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Update Header.js — add logout button and user email

**Files:**
- Modify: `src/ui/components/Header.js`

**Context:** Header currently accepts no props and renders only brand + theme toggle. We add an optional `{ onLogout }` prop. When provided, a user email + logout button appears on the right side of the header. The user email comes from `AuthService.getEmail()`.

**Step 1: Replace the file**

```js
/**
 * Header
 *
 * Site masthead with ALOO University brand identity, dark mode toggle,
 * and (when onLogout is provided) a user-email chip + logout button.
 *
 * @param {{ onLogout?: () => void }} [props]
 * @returns {HTMLElement}
 */

import { ThemeService } from '../../core/ThemeService.js';
import { AuthService }  from '../../core/AuthService.js';

const MOON_ICON = `
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18"
       aria-hidden="true" class="theme-toggle__icon">
    <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"
          fill="currentColor"/>
  </svg>`;

const SUN_ICON = `
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18"
       aria-hidden="true" class="theme-toggle__icon">
    <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.8"/>
    <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42
             M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;

export function Header({ onLogout } = {}) {
  const el = document.createElement('header');
  el.className = 'site-header';
  el.setAttribute('role', 'banner');

  // Brand
  const brand = document.createElement('div');
  brand.className = 'site-header__brand-wrap';
  brand.innerHTML = `
    <div class="site-header__logo" aria-hidden="true">
      <svg width="44" height="44" viewBox="0 0 44 44"
           fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="22" cy="22" rx="18" ry="12"
                 transform="rotate(-12 22 22)"
                 stroke="#C8922A" stroke-width="1.5" fill="none"/>
        <ellipse cx="22" cy="22" rx="9" ry="5.5"
                 transform="rotate(-12 22 22)"
                 fill="#C8922A" opacity="0.18"/>
        <circle cx="22" cy="22" r="2.5" fill="#C8922A"/>
      </svg>
    </div>
    <div class="site-header__brand">
      <span class="site-header__university">ALOO University</span>
      <span class="site-header__system">AdmitGuard — Admission Compliance System</span>
    </div>
  `;
  el.appendChild(brand);

  // Dark mode toggle
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'theme-toggle';

  function _syncToggle() {
    const dark = ThemeService.isDark();
    toggle.innerHTML = dark ? SUN_ICON : MOON_ICON;
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.setAttribute('aria-pressed', String(dark));
  }

  _syncToggle();
  toggle.addEventListener('click', () => { ThemeService.toggle(); _syncToggle(); });
  ThemeService.onThemeChange(() => _syncToggle());
  el.appendChild(toggle);

  // User chip + logout (only when authenticated)
  if (onLogout) {
    const userArea = document.createElement('div');
    userArea.className = 'site-header__user';

    const email = AuthService.getEmail();
    if (email) {
      const emailEl = document.createElement('span');
      emailEl.className = 'site-header__user-email';
      emailEl.textContent = email;
      emailEl.title = email;
      userArea.appendChild(emailEl);
    }

    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'logout-btn';
    logoutBtn.textContent = 'Logout';
    logoutBtn.setAttribute('aria-label', 'Log out of AdmitGuard');
    logoutBtn.addEventListener('click', onLogout);
    userArea.appendChild(logoutBtn);

    el.appendChild(userArea);
  }

  return el;
}
```

**Step 2: Commit**

```bash
cd "C:/Users/K TIWARY/Aloo-University" && git add src/ui/components/Header.js && git commit -m "feat: add logout button and user email chip to Header

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Update RootLayout.js — accept role, hide Dashboard tab for non-admins, pass onLogout to Header

**Files:**
- Modify: `src/ui/layout/RootLayout.js`

**Context:** RootLayout currently accepts `{ main }`. We add `{ main, role }`. If `role !== 'admin'`, the Dashboard tab is not rendered (removed from DOM entirely). The `Header` component now needs `onLogout` prop.

**Step 1: Replace the file**

```js
import { Header }        from '../components/Header.js';
import { AuditLogView }  from '../components/AuditLogView.js';
import { DashboardView } from '../components/DashboardView.js';
import { AuthService }   from '../../core/AuthService.js';

/**
 * RootLayout
 *
 * Page shell — header, navigation tabs, main content, footer.
 *
 * Tabs:
 *   "Admission Form"  — always visible
 *   "Audit Log"       — always visible
 *   "Dashboard"       — admin role only
 *
 * @param {{ main: HTMLElement, role: string }} props
 * @returns {HTMLElement}
 */
export function RootLayout({ main, role }) {
  const isAdmin = role === 'admin';

  const root = document.createElement('div');
  root.className = 'root-layout';

  root.appendChild(Header({ onLogout: () => AuthService.logout() }));

  // ── Navigation ────────────────────────────────────────────────────────
  const navWrapper = document.createElement('div');
  navWrapper.className = 'view-nav-wrapper';
  navWrapper.setAttribute('role', 'tablist');
  navWrapper.setAttribute('aria-label', 'Application views');

  const navInner = document.createElement('div');
  navInner.className = 'view-nav';

  function _makeTab(label, id) {
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'view-nav__tab';
    btn.textContent = label;
    btn.setAttribute('role',         'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.setAttribute('aria-controls', `view-${id}`);
    btn.id = `tab-${id}`;
    return btn;
  }

  const formTab  = _makeTab('Admission Form', 'form');
  const auditTab = _makeTab('Audit Log',      'audit');
  navInner.appendChild(formTab);
  navInner.appendChild(auditTab);

  // Dashboard tab only for admins
  const dashTab = isAdmin ? _makeTab('Dashboard', 'dash') : null;
  if (dashTab) navInner.appendChild(dashTab);

  navWrapper.appendChild(navInner);
  root.appendChild(navWrapper);

  // ── Main container ────────────────────────────────────────────────────
  const container = document.createElement('main');
  container.className = 'main-container';
  container.setAttribute('role', 'main');

  const formView = document.createElement('div');
  formView.className = 'main-view';
  formView.id = 'view-form';
  formView.setAttribute('role', 'tabpanel');
  formView.setAttribute('aria-labelledby', 'tab-form');
  formView.appendChild(main);

  const auditView = document.createElement('div');
  auditView.className = 'main-view main-view--hidden';
  auditView.id = 'view-audit';
  auditView.setAttribute('role', 'tabpanel');
  auditView.setAttribute('aria-labelledby', 'tab-audit');
  auditView.hidden = true;
  const { el: auditEl, refresh: refreshAudit } = AuditLogView();
  auditView.appendChild(auditEl);

  container.appendChild(formView);
  container.appendChild(auditView);

  // Dashboard view — admin only
  let dashView = null;
  let refreshDash = null;
  if (isAdmin) {
    dashView = document.createElement('div');
    dashView.className = 'main-view main-view--hidden';
    dashView.id = 'view-dash';
    dashView.setAttribute('role', 'tabpanel');
    dashView.setAttribute('aria-labelledby', 'tab-dash');
    dashView.hidden = true;
    const { el: dashEl, refresh } = DashboardView();
    refreshDash = refresh;
    dashView.appendChild(dashEl);
    container.appendChild(dashView);
  }

  root.appendChild(container);

  // ── Tab state management ──────────────────────────────────────────────
  const allTabs  = [formTab, auditTab, ...(dashTab  ? [dashTab]  : [])];
  const allViews = [formView, auditView, ...(dashView ? [dashView] : [])];

  function _activate(idx) {
    allTabs.forEach((t, i) => {
      const active = i === idx;
      t.classList.toggle('view-nav__tab--active', active);
      t.setAttribute('aria-selected', String(active));
    });
    allViews.forEach((v, i) => { v.hidden = i !== idx; });
  }

  formTab.addEventListener('click',  () => _activate(0));
  auditTab.addEventListener('click', () => { _activate(1); refreshAudit(); });
  if (dashTab) {
    dashTab.addEventListener('click', () => { _activate(2); refreshDash(); });
  }

  _activate(0);

  // ── Footer ────────────────────────────────────────────────────────────
  const footer = document.createElement('footer');
  footer.className = 'page-footer';
  footer.setAttribute('role', 'contentinfo');
  footer.textContent = `© ${new Date().getFullYear()} ALOO University — Internal Use Only`;
  root.appendChild(footer);

  return root;
}
```

**Step 2: Commit**

```bash
cd "C:/Users/K TIWARY/Aloo-University" && git add src/ui/layout/RootLayout.js && git commit -m "feat: hide Dashboard tab for non-admin; pass onLogout to Header in RootLayout

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Update main.js — auth gate with mountLogin / mountApp helpers

**Files:**
- Modify: `src/main.js`

**Context:** `main.js` must now: (1) show splash, (2) check auth and show LoginView if needed, (3) mount App, (4) listen for `auth:unauthorized` to handle expiry/logout without a page reload. All logic is in `mountLogin()` and `mountApp()` helpers.

**Step 1: Replace the file**

```js
import { ConfigLoader }      from './core/ConfigLoader.js';
import { FormStateManager }  from './state/FormStateManager.js';
import { ThemeService }      from './core/ThemeService.js';
import { AuthService }       from './core/AuthService.js';
import { App }               from './app.js';
import { RootLayout }        from './ui/layout/RootLayout.js';
import { SplashScreen }      from './ui/components/SplashScreen.js';
import { LoginView }         from './ui/components/LoginView.js';

/**
 * Entry point.
 *
 * Initialisation order:
 *   1. Apply saved / OS theme preference.
 *   2. Show branded SplashScreen (3 s).
 *   3. If not authenticated → show LoginView, wait for login.
 *   4. Mount the main app.
 *   5. Listen for 'auth:unauthorized' (token expiry or manual logout)
 *      to tear down the app and re-show LoginView without a page reload.
 */

async function mountLogin(appRoot) {
  appRoot.innerHTML = '';
  await new Promise((resolve) => {
    appRoot.appendChild(LoginView({ onSuccess: resolve }));
  });
  appRoot.innerHTML = '';
}

async function mountApp(appRoot) {
  await ConfigLoader.load();
  FormStateManager.reset();
  FormStateManager.validateAll();
  const role = AuthService.getRole();
  appRoot.appendChild(RootLayout({ main: App(), role }));
}

async function init() {
  ThemeService.init();

  const appRoot = document.getElementById('app');

  // Splash screen (always shown on first load)
  await new Promise((resolve) => {
    appRoot.appendChild(SplashScreen({ onComplete: resolve }));
  });
  appRoot.innerHTML = '';

  // Auth gate
  if (!AuthService.isAuthenticated()) {
    await mountLogin(appRoot);
  }

  await mountApp(appRoot);

  // Handle token expiry or logout without a page reload
  document.addEventListener('auth:unauthorized', async () => {
    appRoot.innerHTML = '';
    await mountLogin(appRoot);
    await mountApp(appRoot);
  }, { once: false });
}

init().catch((err) => {
  console.error('[AdmitGuard] Initialisation failed:', err);
});
```

**Step 2: Commit**

```bash
cd "C:/Users/K TIWARY/Aloo-University" && git add src/main.js && git commit -m "feat: wire auth gate in main.js — mountLogin/mountApp with 401 re-login flow

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Final verification and push

**Step 1: Start backend**
```bash
cd "C:/Users/K TIWARY/Aloo-University/backend" && node src/server.js
```
Expected: `AdmitGuard backend started` on port 3001.

**Step 2: Start frontend**
```bash
cd "C:/Users/K TIWARY/Aloo-University" && npm run dev
```

**Step 3: Manual smoke test checklist**
- [ ] Splash plays for 3 seconds
- [ ] LoginView appears (not the app) — unauthenticated
- [ ] Login with `counselor@aloo.edu` / `DemoPass123!` → app mounts, no Dashboard tab
- [ ] Login with `admin@aloo.edu` / `DemoPass123!` → app mounts, Dashboard tab visible
- [ ] Logout button present in header, shows user email
- [ ] Clicking Logout → LoginView appears (no page reload)
- [ ] Refresh while logged in → app loads directly (no LoginView)
- [ ] Wrong password → error message shown, button re-enabled

**Step 4: Commit design doc and push**
```bash
cd "C:/Users/K TIWARY/Aloo-University" && git add docs/plans/2026-02-26-auth-design.md docs/plans/2026-02-26-frontend-auth.md && git commit -m "docs: add auth design doc and implementation plan

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>" && git push origin main
```
