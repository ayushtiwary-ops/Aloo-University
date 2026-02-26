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
