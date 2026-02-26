import { ApiClient }   from '../../core/ApiClient.js';
import { AuthService } from '../../core/AuthService.js';

/**
 * CandidateLoginView
 *
 * Candidate sign-in card.
 * Calls POST /api/candidate/login, stores JWT, then calls onSuccess().
 *
 * @param {{ onSuccess: () => void, onBack: () => void }} options
 * @returns {HTMLElement}
 */
export function CandidateLoginView({ onSuccess, onBack }) {
  const view = document.createElement('div');
  view.className = 'login-view';

  const card = document.createElement('div');
  card.className = 'login-card';

  // — Brand —
  const brand = document.createElement('div');
  brand.className = 'login-card__brand';

  const logo = document.createElement('div');
  logo.className = 'login-card__logo';
  logo.setAttribute('aria-hidden', 'true');
  logo.textContent = '🥔';

  const h1 = document.createElement('h1');
  h1.className = 'login-card__title';
  h1.textContent = 'Welcome Back';

  const sub = document.createElement('p');
  sub.className = 'login-card__subtitle';
  sub.textContent = 'Sign in to your student account';

  brand.appendChild(logo);
  brand.appendChild(h1);
  brand.appendChild(sub);

  // — Fields —
  const fields = document.createElement('div');
  fields.className = 'login-card__fields';

  const emailLabel = document.createElement('label');
  emailLabel.className = 'login-card__label';
  emailLabel.htmlFor = 'cl-email';
  emailLabel.textContent = 'Email Address';
  const emailInput = document.createElement('input');
  emailInput.className    = 'login-card__input';
  emailInput.id           = 'cl-email';
  emailInput.type         = 'email';
  emailInput.autocomplete = 'email';
  emailInput.placeholder  = 'you@example.com';
  emailInput.required     = true;
  emailLabel.appendChild(emailInput);

  const passLabel = document.createElement('label');
  passLabel.className = 'login-card__label';
  passLabel.htmlFor = 'cl-pass';
  passLabel.textContent = 'Password';
  const passInput = document.createElement('input');
  passInput.className    = 'login-card__input';
  passInput.id           = 'cl-pass';
  passInput.type         = 'password';
  passInput.autocomplete = 'current-password';
  passInput.placeholder  = '••••••••';
  passInput.required     = true;
  passLabel.appendChild(passInput);

  fields.appendChild(emailLabel);
  fields.appendChild(passLabel);

  // — Error —
  const errorEl = document.createElement('p');
  errorEl.className = 'login-card__error';
  errorEl.setAttribute('aria-live', 'polite');

  // — Submit —
  const submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'login-card__submit';
  submitBtn.textContent = 'Sign In';

  const spinner = document.createElement('span');
  spinner.className = 'login-card__spinner';
  spinner.setAttribute('aria-hidden', 'true');

  // — Back link —
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'auth-back-link';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', onBack);

  card.appendChild(brand);
  card.appendChild(fields);
  card.appendChild(errorEl);
  card.appendChild(submitBtn);
  card.appendChild(backBtn);
  view.appendChild(card);

  // — Behaviour —
  let _loading = false;

  function _setLoading(on) {
    _loading = on;
    submitBtn.disabled = on;
    if (on) {
      submitBtn.textContent = '';
      submitBtn.appendChild(spinner);
      submitBtn.append(' Signing in…');
    } else {
      submitBtn.textContent = 'Sign In';
    }
  }

  async function _handleSubmit() {
    if (_loading) return;

    const email    = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) {
      errorEl.textContent = 'Please enter your email and password.';
      return;
    }

    errorEl.textContent = '';
    _setLoading(true);

    try {
      const { token, user } = await ApiClient.candidateLogin(email, password);
      AuthService.setSession(token, user);
      onSuccess();
    } catch (err) {
      errorEl.textContent = err.message ?? 'Login failed. Please try again.';
      _setLoading(false);
    }
  }

  submitBtn.addEventListener('click', _handleSubmit);
  [emailInput, passInput].forEach((el) => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') _handleSubmit(); });
  });

  requestAnimationFrame(() => emailInput.focus());

  return view;
}
