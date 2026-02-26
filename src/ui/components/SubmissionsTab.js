import { ApiClient }  from '../../core/ApiClient.js';
import { AuthService } from '../../core/AuthService.js';
import { animate, stagger } from 'motion';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/**
 * SubmissionsTab
 *
 * Table view: Name | Email | Tier | Exceptions | Date
 * Row click → animated detail modal with formatted JSON.
 * Admin role gets an Export CSV button.
 */
export function SubmissionsTab() {
  const host = document.createElement('div');
  host.className = 'submissions-tab';

  const isAdmin = AuthService.getRole() === 'admin';

  function _tierOf(rec) {
    if (rec.flagged)                  return { label: 'Flagged', mod: 'flagged' };
    if ((rec.exception_count ?? 0) > 0) return { label: 'Soft',    mod: 'soft'    };
    return                                   { label: 'Clean',   mod: 'clean'   };
  }

  function _fmt(iso) {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      }).format(new Date(iso));
    } catch { return iso ?? '—'; }
  }

  /** Fetch export as blob and trigger browser download. */
  async function _exportCSV() {
    try {
      const res = await fetch(`${BASE}/api/audit/export?format=csv`, {
        headers: { Authorization: `Bearer ${AuthService.getToken()}` },
      });
      if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `admitguard-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[SubmissionsTab] Export error:', err);
    }
  }

  /** Open animated modal showing full record detail + JSON. */
  function _showDetail(rec) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Submission Detail');

    const { label: tierLabel, mod: tierMod } = _tierOf(rec);
    const data = rec.data ?? {};
    // Separate exception metadata from display fields
    const { exceptionFields, rationaleMap, ...formFields } = data;

    const card = document.createElement('div');
    card.className = 'detail-modal-card';
    card.innerHTML = `
      <button class="staff-modal__close" type="button" aria-label="Close">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      <div class="detail-modal__header">
        <div class="detail-modal__identity">
          <h2 class="detail-modal__name">${rec.candidate_name || '—'}</h2>
          <p class="detail-modal__meta">${rec.email || ''}</p>
        </div>
        <span class="tier-badge tier-badge--${tierMod}">${tierLabel}</span>
      </div>

      <dl class="detail-modal__stats">
        <div class="detail-modal__stat">
          <dt>Submitted</dt>
          <dd>${_fmt(rec.submitted_at)}</dd>
        </div>
        <div class="detail-modal__stat">
          <dt>Exceptions</dt>
          <dd>${rec.exception_count ?? 0}</dd>
        </div>
        <div class="detail-modal__stat">
          <dt>Strict Pass</dt>
          <dd class="${rec.strict_valid ? 'stat--pass' : 'stat--fail'}">${rec.strict_valid ? 'Yes' : 'No'}</dd>
        </div>
        <div class="detail-modal__stat">
          <dt>Flagged</dt>
          <dd class="${rec.flagged ? 'stat--fail' : ''}">${rec.flagged ? 'Yes' : 'No'}</dd>
        </div>
      </dl>

      <div class="detail-modal__body">
        <h3 class="detail-modal__section-title">Form Data</h3>
        <pre class="detail-modal__json">${JSON.stringify(formFields, null, 2)}</pre>
        ${exceptionFields?.length ? `
          <h3 class="detail-modal__section-title detail-modal__section-title--mt">
            Exception Fields (${exceptionFields.length})
          </h3>
          <pre class="detail-modal__json">${JSON.stringify(
            { fields: exceptionFields, rationale: rationaleMap ?? {} }, null, 2
          )}</pre>
        ` : ''}
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      animate(card,
        { opacity: [0, 1], transform: ['scale(0.92) translateY(16px)', 'scale(1) translateY(0)'] },
        { duration: 0.3, easing: [0.22, 1, 0.36, 1] }
      );
    });

    function _closeDetail() {
      animate(card,
        { opacity: [1, 0], transform: ['scale(1)', 'scale(0.95) translateY(8px)'] },
        { duration: 0.18, easing: 'ease-in' }
      ).finished.then(() => overlay.remove());
    }

    card.querySelector('.staff-modal__close').addEventListener('click', _closeDetail);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) _closeDetail(); });
    const _esc = (e) => {
      if (e.key === 'Escape') { document.removeEventListener('keydown', _esc); _closeDetail(); }
    };
    document.addEventListener('keydown', _esc);
  }

  function _render() {
    host.innerHTML = '';

    // Header row
    const hdr = document.createElement('div');
    hdr.className = 'tab-header';

    const left = document.createElement('div');
    left.innerHTML = `
      <h2 class="tab-title">Submissions</h2>
      <p class="tab-subtitle" id="sub-count">Loading\u2026</p>
    `;
    hdr.appendChild(left);

    if (isAdmin) {
      const exportBtn = document.createElement('button');
      exportBtn.type = 'button';
      exportBtn.className = 'export-btn';
      exportBtn.textContent = 'Export CSV';
      exportBtn.addEventListener('click', _exportCSV);
      hdr.appendChild(exportBtn);
    }

    host.appendChild(hdr);

    const loading = document.createElement('p');
    loading.className = 'tab-loading';
    loading.textContent = 'Loading submissions\u2026';
    host.appendChild(loading);

    ApiClient.getAuditRecords({ page: 1, limit: 50 }).then((data) => {
      loading.remove();

      const records = data.records ?? [];
      const countEl = host.querySelector('#sub-count');
      if (countEl) countEl.textContent = `${data.total ?? records.length} total submissions`;

      if (records.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'tab-empty';
        empty.textContent = 'No submissions found.';
        host.appendChild(empty);
        return;
      }

      const wrap  = document.createElement('div');
      wrap.className = 'submissions-table-wrap';

      const table = document.createElement('table');
      table.className = 'submissions-table';
      table.innerHTML = `
        <thead>
          <tr class="submissions-table__head-row">
            <th class="submissions-table__th">Name</th>
            <th class="submissions-table__th">Email</th>
            <th class="submissions-table__th">Tier</th>
            <th class="submissions-table__th submissions-table__th--center">Exceptions</th>
            <th class="submissions-table__th">Date</th>
          </tr>
        </thead>
      `;

      const tbody = document.createElement('tbody');
      records.forEach((rec) => {
        const { label: tierLabel, mod: tierMod } = _tierOf(rec);
        const tr = document.createElement('tr');
        tr.className = 'submissions-table__row';
        tr.setAttribute('role', 'button');
        tr.setAttribute('tabindex', '0');
        tr.title = 'Click to view full record';
        tr.innerHTML = `
          <td class="submissions-table__td submissions-table__td--name">${rec.candidate_name || '—'}</td>
          <td class="submissions-table__td submissions-table__td--email">${rec.email || '—'}</td>
          <td class="submissions-table__td">
            <span class="tier-badge tier-badge--${tierMod}">${tierLabel}</span>
          </td>
          <td class="submissions-table__td submissions-table__td--center">
            ${(rec.exception_count ?? 0) > 0
              ? `<span class="exc-badge">${rec.exception_count}</span>`
              : '<span class="exc-none">—</span>'}
          </td>
          <td class="submissions-table__td submissions-table__td--date">${_fmt(rec.submitted_at)}</td>
        `;
        tr.addEventListener('click', () => _showDetail(rec));
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _showDetail(rec); }
        });
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      wrap.appendChild(table);
      host.appendChild(wrap);

      const rows = Array.from(tbody.querySelectorAll('tr'));
      animate(rows,
        { opacity: [0, 1], transform: ['translateX(-10px)', 'translateX(0)'] },
        { duration: 0.3, delay: stagger(0.025), easing: [0.22, 1, 0.36, 1] }
      );

    }).catch((err) => {
      loading.textContent = err.message ?? 'Failed to load submissions.';
      loading.style.color = 'var(--color-error)';
    });
  }

  _render();
  return { el: host, refresh: _render };
}
