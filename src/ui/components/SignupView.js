import { ApiClient }   from '../../core/ApiClient.js';
import { AuthService } from '../../core/AuthService.js';

/**
 * SignupView
 *
 * Candidate self-registration card.
 * Calls POST /api/candidate/register, stores JWT, then calls onSuccess().
 *
 * @param {{ onSuccess: () => void, onBack: () => void }} options
 * @returns {HTMLElement}
 */
export function SignupView({ onSuccess, onBack }) {
  const view = document.createElement('div');
  view.className = 'login-view';

  // Build the card using DOM (not innerHTML) so dynamic ops stay consistent

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
  h1.textContent = 'Create Account';

  const sub = document.createElement('p');
  sub.className = 'login-card__subtitle';
  sub.textContent = 'ALOO University — Student Portal';

  brand.appendChild(logo);
  brand.appendChild(h1);
  brand.appendChild(sub);

  // — Fields —
  const fields = document.createElement('div');
  fields.className = 'login-card__fields';

  function _makeField(labelText, inputId, type, autocomplete, placeholder) {
    const label = document.createElement('label');
    label.className = 'login-card__label';
    label.htmlFor = inputId;
    label.textContent = labelText;

    const input = document.createElement('input');
    input.className  = 'login-card__input';
    input.id         = inputId;
    input.type       = type;
    input.autocomplete = autocomplete;
    input.placeholder  = placeholder;
    input.required     = true;

    label.appendChild(input);
    return { label, input };
  }

  const { label: nameLabel,  input: nameInput  } = _makeField('Full Name',      'su-name',  'text',     'name',             'Your full legal name');
  const { label: emailLabel, input: emailInput } = _makeField('Email Address',  'su-email', 'email',    'email',            'you@example.com');
  const { label: phoneLabel, input: phoneInput } = _makeField('Phone Number',   'su-phone', 'tel',      'tel',              '10-digit mobile number');
  const { label: passLabel,  input: passInput  } = _makeField('Password',       'su-pass',  'password', 'new-password',     'Min. 8 characters');

  fields.appendChild(nameLabel);
  fields.appendChild(emailLabel);
  fields.appendChild(phoneLabel);
  fields.appendChild(passLabel);

  // — Error —
  const errorEl = document.createElement('p');
  errorEl.className = 'login-card__error';
  errorEl.setAttribute('aria-live', 'polite');
  errorEl.id = 'su-error';

  // — Submit button —
  const submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'login-card__submit';
  submitBtn.textContent = 'Create Account';

  // Spinner (pre-built)
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
      submitBtn.append(' Creating account…');
    } else {
      submitBtn.textContent = 'Create Account';
    }
  }

  async function _handleSubmit() {
    if (_loading) return;

    const full_name = nameInput.value.trim();
    const email     = emailInput.value.trim();
    const phone     = phoneInput.value.trim();
    const password  = passInput.value;

    if (!full_name || !email || !phone || !password) {
      errorEl.textContent = 'All fields are required.';
      return;
    }
    if (password.length < 8) {
      errorEl.textContent = 'Password must be at least 8 characters.';
      return;
    }

    errorEl.textContent = '';
    _setLoading(true);

    try {
      const { token, user } = await ApiClient.candidateRegister(full_name, email, phone, password);
      AuthService.setSession(token, user);
      onSuccess();
    } catch (err) {
      errorEl.textContent = err.message ?? 'Registration failed. Please try again.';
      _setLoading(false);
    }
  }

  submitBtn.addEventListener('click', _handleSubmit);
  [nameInput, emailInput, phoneInput, passInput].forEach((el) => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') _handleSubmit(); });
  });

  requestAnimationFrame(() => nameInput.focus());

  return view;
}
