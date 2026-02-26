import { ApiClient }   from '../../core/ApiClient.js';
import { AuthService } from '../../core/AuthService.js';
import { animate }     from 'motion';

/**
 * StaffLoginModal
 *
 * Full-screen backdrop + centered card overlay.
 * Animates in with scale + fade using Motion One.
 * Calls onSuccess() after successful login.
 * Calls onClose() on Escape, X button, or backdrop click.
 *
 * @param {{ onSuccess: () => void, onClose: () => void }} opts
 * @returns {HTMLElement}
 */
export function StaffLoginModal({ onSuccess, onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Staff Login');

  const card = document.createElement('div');
  card.className = 'staff-modal-card';
  card.innerHTML = `
    <button class="staff-modal__close" type="button" aria-label="Close login modal">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
    <div class="login-card__brand">
      <div class="login-card__logo" aria-hidden="true">🥔</div>
      <h2 class="login-card__title">Staff Login</h2>
      <p class="login-card__subtitle">ALOO University · AdmitGuard</p>
    </div>
    <div class="login-card__fields">
      <label class="login-card__label">
        Email Address
        <input class="login-card__input" id="sml-email" type="email"
               autocomplete="email" placeholder="admin@aloo.edu" required />
      </label>
      <label class="login-card__label">
        Password
        <input class="login-card__input" id="sml-password" type="password"
               autocomplete="current-password" placeholder="••••••••" required />
      </label>
    </div>
    <p class="login-card__error" aria-live="polite" id="sml-error"></p>
    <button class="login-card__submit" type="button" id="sml-submit">Sign In</button>
  `;

  overlay.appendChild(card);

  const emailEl   = card.querySelector('#sml-email');
  const passEl    = card.querySelector('#sml-password');
  const errorEl   = card.querySelector('#sml-error');
  const submitBtn = card.querySelector('#sml-submit');
  const closeBtn  = card.querySelector('.staff-modal__close');

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

  function _setError(msg) { errorEl.textContent = msg; }

  async function _handleSubmit() {
    if (_loading) return;
    const email    = emailEl.value.trim();
    const password = passEl.value;
    if (!email || !password) { _setError('Enter your email and password.'); return; }
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

  function _close() {
    animate(card,
      { opacity: [1, 0], transform: ['scale(1) translateY(0)', 'scale(0.95) translateY(8px)'] },
      { duration: 0.18, easing: 'ease-in' }
    ).finished.then(onClose);
  }

  submitBtn.addEventListener('click', _handleSubmit);
  closeBtn.addEventListener('click', _close);
  [emailEl, passEl].forEach((el) =>
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') _handleSubmit(); }));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) _close(); });

  const _escHandler = (e) => {
    if (e.key === 'Escape') { document.removeEventListener('keydown', _escHandler); _close(); }
  };
  document.addEventListener('keydown', _escHandler);

  // Animate in after mount
  requestAnimationFrame(() => {
    animate(card,
      { opacity: [0, 1], transform: ['scale(0.92) translateY(14px)', 'scale(1) translateY(0)'] },
      { duration: 0.32, easing: [0.22, 1, 0.36, 1] }
    );
    emailEl.focus();
  });

  return overlay;
}
