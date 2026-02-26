import { AuthService }        from '../../core/AuthService.js';
import { MyProfile }           from './MyProfile.js';
import { CandidateDashboard }  from './CandidateDashboard.js';

/**
 * CandidateApp
 *
 * Layout shell for authenticated candidates.
 * Tabs: My Profile | My Application
 *
 * @returns {HTMLElement}
 */
export function CandidateApp() {
  const root = document.createElement('div');
  root.className = 'candidate-app';

  // ── Header ────────────────────────────────────────────────────────────
  const header = document.createElement('header');
  header.className = 'candidate-header';

  const headerInner = document.createElement('div');
  headerInner.className = 'candidate-header__inner';

  const brandWrap = document.createElement('div');
  brandWrap.className = 'candidate-header__brand';

  const logoEl = document.createElement('span');
  logoEl.className = 'candidate-header__logo';
  logoEl.setAttribute('aria-hidden', 'true');
  logoEl.textContent = '🥔';

  const brandName = document.createElement('span');
  brandName.className = 'candidate-header__name';
  brandName.textContent = 'ALOO University';

  brandWrap.appendChild(logoEl);
  brandWrap.appendChild(brandName);

  const userArea = document.createElement('div');
  userArea.className = 'candidate-header__user';

  const user = AuthService.getUser();
  if (user?.email) {
    const emailEl = document.createElement('span');
    emailEl.className = 'candidate-header__email';
    emailEl.textContent = user.email;
    emailEl.title = user.email;
    userArea.appendChild(emailEl);
  }

  const logoutBtn = document.createElement('button');
  logoutBtn.type = 'button';
  logoutBtn.className = 'logout-btn';
  logoutBtn.textContent = 'Log out';
  logoutBtn.addEventListener('click', () => AuthService.logout());
  userArea.appendChild(logoutBtn);

  headerInner.appendChild(brandWrap);
  headerInner.appendChild(userArea);
  header.appendChild(headerInner);
  root.appendChild(header);

  // ── Tabs ──────────────────────────────────────────────────────────────
  const navWrapper = document.createElement('div');
  navWrapper.className = 'view-nav-wrapper';
  navWrapper.setAttribute('role', 'tablist');
  navWrapper.setAttribute('aria-label', 'Candidate views');

  const navInner = document.createElement('div');
  navInner.className = 'view-nav';

  function _makeTab(label, panelId) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'view-nav__tab';
    btn.textContent = label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.setAttribute('aria-controls', panelId);
    return btn;
  }

  const profileTab = _makeTab('My Profile',     'cv-profile');
  const appTab     = _makeTab('My Application', 'cv-app');
  navInner.appendChild(profileTab);
  navInner.appendChild(appTab);
  navWrapper.appendChild(navInner);
  root.appendChild(navWrapper);

  // ── Content panels ────────────────────────────────────────────────────
  const container = document.createElement('main');
  container.className = 'main-container';

  // Profile panel
  const profilePanel = document.createElement('div');
  profilePanel.className = 'main-view';
  profilePanel.id = 'cv-profile';
  profilePanel.setAttribute('role', 'tabpanel');

  profilePanel.appendChild(MyProfile());

  // Application panel (placeholder)
  const appPanel = document.createElement('div');
  appPanel.className = 'main-view main-view--hidden';
  appPanel.id = 'cv-app';
  appPanel.setAttribute('role', 'tabpanel');
  appPanel.hidden = true;

  appPanel.appendChild(CandidateDashboard());

  container.appendChild(profilePanel);
  container.appendChild(appPanel);
  root.appendChild(container);

  // ── Tab activation ────────────────────────────────────────────────────
  const tabs  = [profileTab, appTab];
  const views = [profilePanel, appPanel];

  function _activate(idx) {
    tabs.forEach((t, i) => {
      const active = i === idx;
      t.classList.toggle('view-nav__tab--active', active);
      t.setAttribute('aria-selected', String(active));
    });
    views.forEach((v, i) => { v.hidden = i !== idx; });
  }

  profileTab.addEventListener('click', () => _activate(0));
  appTab.addEventListener('click',     () => _activate(1));
  _activate(0);

  // ── Footer ────────────────────────────────────────────────────────────
  const footer = document.createElement('footer');
  footer.className = 'page-footer';
  footer.setAttribute('role', 'contentinfo');
  footer.textContent = `© ${new Date().getFullYear()} ALOO University`;
  root.appendChild(footer);

  return root;
}
