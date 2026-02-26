import { Header }                  from '../components/Header.js';
import { App }                     from '../../app.js';
import { BackendAuditView }        from '../components/BackendAuditView.js';
import { CandidateDirectoryView }  from '../components/CandidateDirectoryView.js';
import { AuthService }             from '../../core/AuthService.js';

export function CounselorApp() {
  const root = document.createElement('div');
  root.className = 'root-layout';

  root.appendChild(Header({ onLogout: () => AuthService.logout() }));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'view-nav-wrapper';
  navWrapper.setAttribute('role', 'tablist');
  navWrapper.setAttribute('aria-label', 'Counselor views');

  const navInner = document.createElement('div');
  navInner.className = 'view-nav';

  function _tab(label, panelId) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'view-nav__tab';
    btn.textContent = label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.setAttribute('aria-controls', panelId);
    return btn;
  }

  const t0 = _tab('Submission Form', 'csl-form');
  const t1 = _tab('Candidates',      'csl-cands');
  const t2 = _tab('Audit Log',       'csl-audit');
  [t0, t1, t2].forEach((t) => navInner.appendChild(t));
  navWrapper.appendChild(navInner);
  root.appendChild(navWrapper);

  const container = document.createElement('main');
  container.className = 'main-container';

  function _panel(id, labelledBy, hidden) {
    const div = document.createElement('div');
    div.className = hidden ? 'main-view main-view--hidden' : 'main-view';
    div.id = id;
    div.setAttribute('role', 'tabpanel');
    div.setAttribute('aria-labelledby', labelledBy);
    div.hidden = hidden;
    return div;
  }

  const p0 = _panel('csl-form',  t0.id, false);
  const p1 = _panel('csl-cands', t1.id, true);
  const p2 = _panel('csl-audit', t2.id, true);

  p0.appendChild(App());

  const { el: candsEl, refresh: refreshCands } = CandidateDirectoryView();
  const { el: auditEl, refresh: refreshAudit } = BackendAuditView();

  p1.appendChild(candsEl);
  p2.appendChild(auditEl);

  [p0, p1, p2].forEach((p) => container.appendChild(p));
  root.appendChild(container);

  const tabs   = [t0, t1, t2];
  const panels = [p0, p1, p2];
  const refreshFns = [null, refreshCands, refreshAudit];

  function _activate(idx) {
    tabs.forEach((t, i) => {
      const active = i === idx;
      t.classList.toggle('view-nav__tab--active', active);
      t.setAttribute('aria-selected', String(active));
    });
    panels.forEach((p, i) => { p.hidden = i !== idx; });
    if (refreshFns[idx]) refreshFns[idx]();
  }

  tabs.forEach((t, i) => t.addEventListener('click', () => _activate(i)));
  _activate(0);

  const footer = document.createElement('footer');
  footer.className = 'page-footer';
  footer.setAttribute('role', 'contentinfo');
  footer.textContent = `© ${new Date().getFullYear()} ALOO University — Counselor`;
  root.appendChild(footer);

  return root;
}
