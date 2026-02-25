/**
 * Header
 *
 * Site masthead with ALOO University brand identity.
 * Contains an abstract organic oval SVG logomark — not a literal potato.
 *
 * @returns {HTMLElement}
 */
export function Header() {
  const el = document.createElement('header');
  el.className = 'site-header';
  el.setAttribute('role', 'banner');

  el.innerHTML = `
    <div class="site-header__logo" aria-hidden="true">
      <svg
        width="44" height="44" viewBox="0 0 44 44"
        fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse
          cx="22" cy="22" rx="18" ry="12"
          transform="rotate(-12 22 22)"
          stroke="#C8922A" stroke-width="1.5" fill="none"
        />
        <ellipse
          cx="22" cy="22" rx="9" ry="5.5"
          transform="rotate(-12 22 22)"
          fill="#C8922A" opacity="0.18"
        />
        <circle cx="22" cy="22" r="2.5" fill="#C8922A"/>
      </svg>
    </div>
    <div class="site-header__brand">
      <span class="site-header__university">ALOO University</span>
      <span class="site-header__system">AdmitGuard — Admission Compliance System</span>
    </div>
  `;

  return el;
}
