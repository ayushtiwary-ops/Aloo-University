import { SignupView }          from './SignupView.js';
import { CandidateLoginView }  from './CandidateLoginView.js';
import { LoginView }           from './LoginView.js';

/**
 * AuthLanding
 *
 * Root auth shell. Shows the public landing screen by default.
 * Internally manages transitions to signup, candidate login,
 * and staff (admin/counselor) login views.
 *
 * @param {{ onSuccess: () => void }} options
 * @returns {HTMLElement}
 */
export function AuthLanding({ onSuccess }) {
  const container = document.createElement('div');
  container.className = 'auth-shell';

  function _clear() { container.innerHTML = ''; }

  function _showLanding() {
    _clear();

    const view = document.createElement('div');
    view.className = 'auth-landing';

    // Logo
    const logo = document.createElement('div');
    logo.className = 'auth-landing__logo';
    logo.setAttribute('aria-hidden', 'true');
    logo.textContent = '🥔';

    // Title
    const title = document.createElement('h1');
    title.className = 'auth-landing__title';
    title.textContent = 'ALOO University';

    const subtitle = document.createElement('p');
    subtitle.className = 'auth-landing__subtitle';
    subtitle.textContent = 'Student Admission Portal';

    // CTA buttons
    const ctaRow = document.createElement('div');
    ctaRow.className = 'auth-landing__cta';

    const signupBtn = document.createElement('button');
    signupBtn.type = 'button';
    signupBtn.className = 'auth-landing__btn auth-landing__btn--primary';
    signupBtn.textContent = 'Sign Up';
    signupBtn.addEventListener('click', _showSignup);

    const loginBtn = document.createElement('button');
    loginBtn.type = 'button';
    loginBtn.className = 'auth-landing__btn auth-landing__btn--secondary';
    loginBtn.textContent = 'Sign In';
    loginBtn.addEventListener('click', _showLogin);

    ctaRow.appendChild(signupBtn);
    ctaRow.appendChild(loginBtn);

    // Staff login link
    const staffLink = document.createElement('button');
    staffLink.type = 'button';
    staffLink.className = 'auth-landing__staff-link';
    staffLink.textContent = 'Staff Login →';
    staffLink.addEventListener('click', _showStaffLogin);

    view.appendChild(logo);
    view.appendChild(title);
    view.appendChild(subtitle);
    view.appendChild(ctaRow);
    view.appendChild(staffLink);

    container.appendChild(view);
    requestAnimationFrame(() => signupBtn.focus());
  }

  function _showSignup() {
    _clear();
    container.appendChild(SignupView({ onSuccess, onBack: _showLanding }));
  }

  function _showLogin() {
    _clear();
    container.appendChild(CandidateLoginView({ onSuccess, onBack: _showLanding }));
  }

  function _showStaffLogin() {
    _clear();
    container.appendChild(LoginView({ onSuccess }));
  }

  _showLanding();
  return container;
}
