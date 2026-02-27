import { Header }         from '../components/Header.js';
import { OverviewTab }    from '../components/OverviewTab.js';
import { SubmissionsTab } from '../components/SubmissionsTab.js';
import { DashboardView }  from '../views/DashboardView.js';
import { AuthService }    from '../../core/AuthService.js';
import { animate }        from 'motion';

/**
 * StaffDashboard
 *
 * Shared layout for admin and user roles.
 * Tabs: Overview (analytics) | Submissions (audit table).
 * Role-specific UI (e.g. Export CSV) is handled inside each tab component.
 */
export function StaffDashboard() {
  const root = document.createElement('div');
  root.className = 'root-layout';

  root.appendChild(Header({ onLogout: () => AuthService.logout() }));

  // ── Tab nav ──────────────────────────────────────────────────
  const navWrapper = document.createElement('div');
  navWrapper.className = 'view-nav-wrapper';
  navWrapper.setAttribute('role', 'tablist');
  navWrapper.setAttribute('aria-label', 'Staff dashboard');

  const navInner = document.createElement('div');
  navInner.className = 'view-nav';

  function _makeTab(label, panelId) {
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'view-nav__tab';
    btn.textContent = label;
    btn.setAttribute('role',          'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.setAttribute('aria-controls', panelId);
    return btn;
  }

  const t0 = _makeTab('Overview',    'sd-overview');
  const t1 = _makeTab('Analytics',   'sd-analytics');
  const t2 = _makeTab('Submissions', 'sd-submissions');
  [t0, t1, t2].forEach((t) => navInner.appendChild(t));
  navWrapper.appendChild(navInner);
  root.appendChild(navWrapper);

  // ── Panels ───────────────────────────────────────────────────
  const container = document.createElement('main');
  container.className = 'main-container main-container--wide';
  container.setAttribute('role', 'main');

  const p0 = document.createElement('div');
  p0.id = 'sd-overview';
  p0.setAttribute('role', 'tabpanel');
  p0.setAttribute('aria-labelledby', t0.id);

  const p1 = document.createElement('div');
  p1.id = 'sd-analytics';
  p1.setAttribute('role', 'tabpanel');
  p1.setAttribute('aria-labelledby', t1.id);
  p1.hidden = true;

  const p2 = document.createElement('div');
  p2.id = 'sd-submissions';
  p2.setAttribute('role', 'tabpanel');
  p2.setAttribute('aria-labelledby', t2.id);
  p2.hidden = true;

  const { el: overviewEl,    refresh: refreshOverview }    = OverviewTab();
  const { el: analyticsEl,   refresh: refreshAnalytics }   = DashboardView();
  const { el: submissionsEl, refresh: refreshSubmissions }  = SubmissionsTab();

  p0.appendChild(overviewEl);
  p1.appendChild(analyticsEl);
  p2.appendChild(submissionsEl);
  [p0, p1, p2].forEach((p) => container.appendChild(p));
  root.appendChild(container);

  // ── Tab activation ───────────────────────────────────────────
  const tabs    = [t0, t1, t2];
  const panels  = [p0, p1, p2];
  const refresh = [refreshOverview, refreshAnalytics, refreshSubmissions];

  function _activate(idx) {
    tabs.forEach((t, i) => {
      const on = i === idx;
      t.classList.toggle('view-nav__tab--active', on);
      t.setAttribute('aria-selected', String(on));
    });
    panels.forEach((p, i) => {
      p.hidden = i !== idx;
      if (i === idx) {
        animate(p,
          { opacity: [0, 1], transform: ['translateY(6px)', 'translateY(0)'] },
          { duration: 0.25, easing: [0.22, 1, 0.36, 1] }
        );
      }
    });
    if (refresh[idx]) refresh[idx]();
  }

  tabs.forEach((t, i) => t.addEventListener('click', () => _activate(i)));
  _activate(0);

  // ── Footer ───────────────────────────────────────────────────
  const footer = document.createElement('footer');
  footer.className = 'page-footer';
  footer.textContent = `© ${new Date().getFullYear()} ALOO University`;
  root.appendChild(footer);

  return root;
}
