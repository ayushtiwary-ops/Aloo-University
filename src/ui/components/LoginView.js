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
    <div class="login-card">
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

      <p class="login-card__error" aria-live="polite" id="login-error"></p>

      <button class="login-card__submit" type="button" id="login-submit">
        Sign In
      </button>
    </div>
  `;

  const emailInput  = view.querySelector('#login-email');
  const passInput   = view.querySelector('#login-password');
  const errorEl     = view.querySelector('#login-error');
  const submitBtn   = view.querySelector('#login-submit');

  // Pre-build spinner node so _setLoading never touches innerHTML
  const spinner = document.createElement('span');
  spinner.className = 'login-card__spinner';
  spinner.setAttribute('aria-hidden', 'true');

  let _loading = false;

  function _setLoading(on) {
    _loading = on;
    submitBtn.disabled = on;
    if (on) {
      submitBtn.textContent = '';
      submitBtn.appendChild(spinner);
      submitBtn.append(' Signing in\u2026');
    } else {
      submitBtn.textContent = 'Sign In';
    }
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
