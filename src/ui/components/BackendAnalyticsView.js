import { ApiClient } from '../../core/ApiClient.js';

export function BackendAnalyticsView() {
  const host = document.createElement('div');
  host.className = 'dashboard';

  function _metric(label, value, unit, desc, mod) {
    const card = document.createElement('div');
    card.className = `dash-card${mod ? ' dash-card--' + mod : ''}`;
    card.setAttribute('role', 'listitem');

    const lbl = document.createElement('span');
    lbl.className = 'dash-card__label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'dash-card__value';
    val.textContent = value;

    const unitEl = document.createElement('span');
    unitEl.className = 'dash-card__unit';
    unitEl.textContent = unit;
    val.appendChild(unitEl);

    const descEl = document.createElement('span');
    descEl.className = 'dash-card__desc';
    descEl.textContent = desc;

    card.appendChild(lbl);
    card.appendChild(val);
    card.appendChild(descEl);
    return card;
  }

  function _fmt(iso) {
    try {
      return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    } catch { return iso ?? '—'; }
  }

  function _render() {
    host.innerHTML = '';

    const hdr = document.createElement('div');
    hdr.className = 'dashboard__header';
    const title = document.createElement('h2');
    title.className = 'dashboard__title';
    title.textContent = 'Governance Overview';
    const sub = document.createElement('p');
    sub.className = 'dashboard__subtitle';
    sub.textContent = 'Live compliance metrics from backend';
    hdr.appendChild(title);
    hdr.appendChild(sub);
    host.appendChild(hdr);

    const loading = document.createElement('p');
    loading.className = 'candidate-empty-msg';
    loading.textContent = 'Loading analytics…';
    host.appendChild(loading);

    ApiClient.getAnalytics().then((data) => {
      loading.remove();

      const grid = document.createElement('div');
      grid.className = 'dash-grid';
      grid.setAttribute('role', 'list');

      grid.appendChild(_metric('Total Submissions', data.total,         '',  'All-time recorded',   ''));
      grid.appendChild(_metric('Exception Rate',    data.exceptionRate, '%', 'With ≥1 exception',   data.exceptionRate >= 50 ? 'warning' : ''));
      grid.appendChild(_metric('Flagged Rate',      data.flaggedRate,   '%', 'Sent for review',     data.flaggedRate > 0 ? 'alert' : ''));
      grid.appendChild(_metric('Avg Exceptions',    (data.avgExceptions ?? 0).toFixed(1), '', 'Per candidate', ''));
      host.appendChild(grid);

      if (data.recentRecords?.length) {
        const section = document.createElement('div');
        section.className = 'dash-recent';
        const t = document.createElement('h3');
        t.className = 'dash-recent__title';
        t.textContent = 'Recent Submissions';
        section.appendChild(t);

        const wrap = document.createElement('div');
        wrap.className = 'dash-recent__table-wrap';
        const table = document.createElement('table');
        table.className = 'dash-recent__table';
        const thead = document.createElement('thead');
        thead.innerHTML = `<tr>
          <th class="dash-recent__th">Candidate</th>
          <th class="dash-recent__th">Submitted</th>
          <th class="dash-recent__th dash-recent__th--center">Exceptions</th>
          <th class="dash-recent__th dash-recent__th--center">Flagged</th>
        </tr>`;
        const tbody = document.createElement('tbody');
        data.recentRecords.forEach((rec) => {
          const tr = document.createElement('tr');
          const name = rec.candidate_data?.fullName || rec.candidate_data?.full_name || '—';
          const exc  = rec.exception_count ?? 0;
          tr.innerHTML = `
            <td class="dash-recent__td dash-recent__td--name">${name}</td>
            <td class="dash-recent__td dash-recent__td--time">${_fmt(rec.created_at)}</td>
            <td class="dash-recent__td dash-recent__td--center">
              ${exc > 0 ? `<span class="dash-recent__exc-badge">${exc}</span>` : '<span class="dash-recent__none">—</span>'}
            </td>
            <td class="dash-recent__td dash-recent__td--center">
              ${rec.flagged ? '<span class="dash-recent__flag-badge">Yes</span>' : '<span class="dash-recent__none">No</span>'}
            </td>
          `;
          tbody.appendChild(tr);
        });
        table.appendChild(thead);
        table.appendChild(tbody);
        wrap.appendChild(table);
        section.appendChild(wrap);
        host.appendChild(section);
      }
    }).catch((err) => {
      loading.textContent = err.message ?? 'Failed to load analytics.';
      loading.style.color = 'var(--color-error)';
    });
  }

  _render();
  return { el: host, refresh: _render };
}
