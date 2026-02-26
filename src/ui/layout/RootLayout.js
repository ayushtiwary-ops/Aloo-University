import { Header }        from '../components/Header.js';
import { AuditLogView }  from '../components/AuditLogView.js';
import { DashboardView } from '../components/DashboardView.js';

/**
 * RootLayout
 *
 * Page shell — header, navigation tabs, main content, footer.
 *
 * Tabs:
 *   "Admission Form"  — App() form stack
 *   "Audit Log"       — AuditLogView, refreshed on each open
 *   "Dashboard"       — DashboardView (governance metrics), refreshed on each open
 *
 * @param {{ main: HTMLElement }} props
 * @returns {HTMLElement}
 */
export function RootLayout({ main }) {
  const root = document.createElement('div');
  root.className = 'root-layout';

  root.appendChild(Header());

  // ── Navigation (full-width wrapper + constrained content) ────────────
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

  const formTab    = _makeTab('Admission Form', 'form');
  const auditTab   = _makeTab('Audit Log',      'audit');
  const dashTab    = _makeTab('Dashboard',      'dash');

  navInner.appendChild(formTab);
  navInner.appendChild(auditTab);
  navInner.appendChild(dashTab);
  navWrapper.appendChild(navInner);
  root.appendChild(navWrapper);

  // ── Main container ────────────────────────────────────────────────────
  const container = document.createElement('main');
  container.className = 'main-container';
  container.setAttribute('role', 'main');

  // Form view
  const formView = document.createElement('div');
  formView.className = 'main-view';
  formView.id = 'view-form';
  formView.setAttribute('role', 'tabpanel');
  formView.setAttribute('aria-labelledby', 'tab-form');
  formView.appendChild(main);

  // Audit log view
  const auditView = document.createElement('div');
  auditView.className = 'main-view main-view--hidden';
  auditView.id = 'view-audit';
  auditView.setAttribute('role', 'tabpanel');
  auditView.setAttribute('aria-labelledby', 'tab-audit');
  auditView.hidden = true;

  const { el: auditEl, refresh: refreshAudit } = AuditLogView();
  auditView.appendChild(auditEl);

  // Dashboard view
  const dashView = document.createElement('div');
  dashView.className = 'main-view main-view--hidden';
  dashView.id = 'view-dash';
  dashView.setAttribute('role', 'tabpanel');
  dashView.setAttribute('aria-labelledby', 'tab-dash');
  dashView.hidden = true;

  const { el: dashEl, refresh: refreshDash } = DashboardView();
  dashView.appendChild(dashEl);

  container.appendChild(formView);
  container.appendChild(auditView);
  container.appendChild(dashView);
  root.appendChild(container);

  // ── Tab state management ──────────────────────────────────────────────

  const allTabs  = [formTab, auditTab, dashTab];
  const allViews = [formView, auditView, dashView];

  function _activate(idx) {
    allTabs.forEach((t, i) => {
      const active = i === idx;
      t.classList.toggle('view-nav__tab--active', active);
      t.setAttribute('aria-selected', String(active));
    });
    allViews.forEach((v, i) => {
      v.hidden = i !== idx;
    });
  }

  formTab.addEventListener('click',  () => _activate(0));
  auditTab.addEventListener('click', () => { _activate(1); refreshAudit(); });
  dashTab.addEventListener('click',  () => { _activate(2); refreshDash(); });

  // Start on form tab
  _activate(0);

  // ── Footer ────────────────────────────────────────────────────────────
  const footer = document.createElement('footer');
  footer.className = 'page-footer';
  footer.setAttribute('role', 'contentinfo');
  footer.textContent = `© ${new Date().getFullYear()} ALOO University — Internal Use Only`;
  root.appendChild(footer);

  return root;
}
