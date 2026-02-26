import { ApiClient } from '../../core/ApiClient.js';

export function CandidateDirectoryView() {
  const host = document.createElement('div');
  host.className = 'audit-log';

  function _fmt(iso) {
    try {
      return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
    } catch { return iso ?? '—'; }
  }

  function _render() {
    host.innerHTML = '';

    const hdr = document.createElement('div');
    hdr.className = 'audit-log__header';
    const titleWrap = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'audit-log__title';
    title.textContent = 'Candidate Directory';
    const sub = document.createElement('p');
    sub.className = 'audit-log__subtitle';
    sub.textContent = 'Registered student accounts';
    titleWrap.appendChild(title);
    titleWrap.appendChild(sub);
    hdr.appendChild(titleWrap);
    host.appendChild(hdr);

    const loading = document.createElement('p');
    loading.className = 'candidate-empty-msg';
    loading.textContent = 'Loading candidates…';
    host.appendChild(loading);

    ApiClient.getCandidates().then((data) => {
      loading.remove();
      const candidates = data.candidates ?? [];

      sub.textContent = `${data.total ?? candidates.length} registered`;

      if (candidates.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'audit-log__empty-title';
        empty.textContent = 'No candidates registered yet.';
        host.appendChild(empty);
        return;
      }

      const wrap = document.createElement('div');
      wrap.className = 'audit-log__table-wrap';
      const table = document.createElement('table');
      table.className = 'audit-table';
      const thead = document.createElement('thead');
      thead.innerHTML = `<tr class="audit-table__head-row">
        <th class="audit-table__th" scope="col">Name</th>
        <th class="audit-table__th" scope="col">Email</th>
        <th class="audit-table__th" scope="col">Phone</th>
        <th class="audit-table__th" scope="col">Joined</th>
      </tr>`;
      const tbody = document.createElement('tbody');

      candidates.forEach((c) => {
        const tr = document.createElement('tr');
        tr.className = 'audit-table__row';
        tr.innerHTML = `
          <td class="audit-table__td audit-table__td--name">${c.full_name}</td>
          <td class="audit-table__td">${c.email}</td>
          <td class="audit-table__td">${c.phone}</td>
          <td class="audit-table__td audit-table__td--time">${_fmt(c.created_at)}</td>
        `;
        tbody.appendChild(tr);
      });

      table.appendChild(thead);
      table.appendChild(tbody);
      wrap.appendChild(table);
      host.appendChild(wrap);
    }).catch((err) => {
      loading.textContent = err.message ?? 'Failed to load candidates.';
      loading.style.color = 'var(--color-error)';
    });
  }

  _render();
  return { el: host, refresh: _render };
}
