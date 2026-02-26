import { ApiClient } from '../../core/ApiClient.js';

export function BackendAuditView() {
  const host = document.createElement('div');
  host.className = 'audit-log';

  let _page = 1;

  function _fmt(iso) {
    try {
      return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    } catch { return iso ?? '—'; }
  }

  function _render() {
    host.innerHTML = '';

    const hdr = document.createElement('div');
    hdr.className = 'audit-log__header';
    const titleWrap = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'audit-log__title';
    title.textContent = 'Governance Audit Log';
    const sub = document.createElement('p');
    sub.className = 'audit-log__subtitle';
    sub.textContent = 'Backend records';
    titleWrap.appendChild(title);
    titleWrap.appendChild(sub);
    hdr.appendChild(titleWrap);
    host.appendChild(hdr);

    const loading = document.createElement('p');
    loading.className = 'candidate-empty-msg';
    loading.textContent = 'Loading audit records…';
    host.appendChild(loading);

    ApiClient.getAuditRecords({ page: _page, limit: 25 }).then((data) => {
      loading.remove();

      const records = data.records ?? [];

      if (records.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'audit-log__empty';
        const p = document.createElement('p');
        p.className = 'audit-log__empty-title';
        p.textContent = 'No audit records found.';
        empty.appendChild(p);
        host.appendChild(empty);
        return;
      }

      // Update subtitle
      sub.textContent = `${data.total ?? records.length} total records`;

      const wrap = document.createElement('div');
      wrap.className = 'audit-log__table-wrap';
      const table = document.createElement('table');
      table.className = 'audit-table';
      const thead = document.createElement('thead');
      thead.innerHTML = `<tr class="audit-table__head-row">
        <th class="audit-table__th" scope="col">Candidate</th>
        <th class="audit-table__th" scope="col">Submitted</th>
        <th class="audit-table__th audit-table__th--center" scope="col">Exceptions</th>
        <th class="audit-table__th audit-table__th--center" scope="col">Flagged</th>
      </tr>`;
      const tbody = document.createElement('tbody');

      records.forEach((rec) => {
        const name = rec.candidate_name || '—';
        const exc  = rec.exception_count ?? 0;
        const flagged = rec.flagged ?? false;
        const tr = document.createElement('tr');
        tr.className = 'audit-table__row';
        tr.innerHTML = `
          <td class="audit-table__td audit-table__td--name">${name}</td>
          <td class="audit-table__td audit-table__td--time">${_fmt(rec.submitted_at)}</td>
          <td class="audit-table__td audit-table__td--center">
            ${exc > 0 ? `<span class="audit-table__exception-badge">${exc}</span>` : '<span class="audit-table__none">—</span>'}
          </td>
          <td class="audit-table__td audit-table__td--center">
            ${flagged ? '<span class="audit-table__flagged-badge">Yes</span>' : '<span class="audit-table__none">No</span>'}
          </td>
        `;
        tbody.appendChild(tr);
      });

      table.appendChild(thead);
      table.appendChild(tbody);
      wrap.appendChild(table);
      host.appendChild(wrap);
    }).catch((err) => {
      loading.textContent = err.message ?? 'Failed to load records.';
      loading.style.color = 'var(--color-error)';
    });
  }

  _render();
  return { el: host, refresh: _render };
}
