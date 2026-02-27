import { AuditService } from '../../core/AuditService.js';
import { AuthService }  from '../../core/AuthService.js';
import { animate, stagger } from 'motion';

// ── Helpers ─────────────────────────────────────────────────────────────────

function _fmt(iso) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso ?? '—'; }
}

function _riskLevel(score) {
  if (score <= 20) return 'Low';
  if (score <= 50) return 'Medium';
  return 'High';
}

function _riskMod(score) {
  const lvl = _riskLevel(score);
  if (lvl === 'High')   return 'high';
  if (lvl === 'Medium') return 'medium';
  return 'low';
}

function _statusMod(status) {
  if (status === 'Flagged')          return 'flagged';
  if (status === 'With Exceptions')  return 'soft';
  return 'clean';
}

function _escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * SubmissionsTab
 *
 * Table view backed by AuditService (localStorage).
 * Columns: Name | Timestamp | Exceptions | Flagged | Risk Level | Eligibility | Expand
 * Filters: All | Clean | With Exceptions | Flagged | High Risk
 * Sort:    Newest first | Most exceptions | Highest risk
 * Expand:  Inline panel with full snapshot, highlighted exceptions + keywords
 * Export:  JSON (all roles) + CSV (admin only)
 */
export function SubmissionsTab() {
  const isAdmin = AuthService.getRole() === 'admin';

  let _activeFilter = 'All';
  let _activeSort   = 'newest';

  const host = document.createElement('div');
  host.className = 'submissions-tab';

  // ── Filter bar ─────────────────────────────────────────────────────────────

  const FILTERS = ['All', 'Clean', 'With Exceptions', 'Flagged', 'High Risk'];
  const filterBar = document.createElement('div');
  filterBar.className = 'submissions-filter-bar';
  filterBar.setAttribute('role', 'group');
  filterBar.setAttribute('aria-label', 'Filter submissions');

  FILTERS.forEach((label) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn';
    btn.textContent = label;
    btn.dataset.filter = label;
    btn.setAttribute('aria-pressed', String(label === _activeFilter));
    btn.addEventListener('click', () => {
      _activeFilter = label;
      filterBar.querySelectorAll('.filter-btn').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.filter === _activeFilter));
        b.classList.toggle('filter-btn--active', b.dataset.filter === _activeFilter);
      });
      _renderTable();
    });
    filterBar.appendChild(btn);
    if (label === _activeFilter) btn.classList.add('filter-btn--active');
  });

  // ── Sort control ───────────────────────────────────────────────────────────

  const sortWrap = document.createElement('div');
  sortWrap.className = 'submissions-sort-wrap';

  const sortLabel = document.createElement('label');
  sortLabel.className = 'sort-label';
  sortLabel.textContent = 'Sort:';
  sortLabel.setAttribute('for', 'submissions-sort');

  const sortSel = document.createElement('select');
  sortSel.id = 'submissions-sort';
  sortSel.className = 'sort-select';
  [
    { value: 'newest',     label: 'Newest first'    },
    { value: 'exceptions', label: 'Most exceptions' },
    { value: 'risk',       label: 'Highest risk'    },
  ].forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    sortSel.appendChild(opt);
  });
  sortSel.addEventListener('change', () => {
    _activeSort = sortSel.value;
    _renderTable();
  });

  sortWrap.appendChild(sortLabel);
  sortWrap.appendChild(sortSel);

  // ── Table container ────────────────────────────────────────────────────────

  const tableWrap = document.createElement('div');
  tableWrap.className = 'submissions-table-wrap';

  // ── Export buttons ─────────────────────────────────────────────────────────

  function _exportJSON() {
    const records = AuditService.getAll();
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `admitguard-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function _exportCSV() {
    const records = AuditService.getAll();
    const COLS = [
      'id', 'submissionId', 'timestamp',
      'candidateName', 'email',
      'strictPassed', 'softViolations', 'exceptionCount', 'flagged', 'eligibilityStatus',
      'riskScore', 'riskLevel',
      'exceptionFields', 'exceptionRationales',
      'reviewed', 'reviewedAt',
    ];
    const rows = records.map((r) => {
      const vs   = r.validationSummary ?? {};
      const excs = r.exceptions ?? [];
      return [
        r.id,
        r.submissionId ?? '',
        r.timestamp,
        r.candidateSnapshot?.fullName ?? '',
        r.candidateSnapshot?.email ?? '',
        vs.strictPassed ?? '',
        vs.softViolations ?? '',
        vs.exceptionCount ?? 0,
        vs.flagged ?? false,
        vs.eligibilityStatus ?? '',
        r.riskScore ?? 0,
        _riskLevel(r.riskScore ?? 0),
        excs.map((e) => e.field).join('; '),
        excs.map((e) => e.rationale).join(' | '),
        r.reviewed ?? false,
        r.reviewedAt ?? '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv  = [COLS.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `admitguard-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Expand panel builder ───────────────────────────────────────────────────

  function _buildExpandPanel(rec) {
    const vs      = rec.validationSummary ?? {};
    const snap    = rec.candidateSnapshot ?? {};
    const excs    = rec.exceptions ?? [];
    const excSet  = new Set(excs.map((e) => e.field));

    const panel = document.createElement('div');
    panel.className = 'expand-panel';

    // Summary bar
    panel.innerHTML = `
      <div class="expand-panel__summary">
        <span class="expand-panel__stat">Strict pass: <strong>${vs.strictPassed ? 'Yes' : 'No'}</strong></span>
        <span class="expand-panel__stat">Soft violations: <strong>${vs.softViolations ?? 0}</strong></span>
        <span class="expand-panel__stat">Risk score: <strong>${rec.riskScore ?? 0}</strong></span>
      </div>
    `;

    // Candidate snapshot
    const snapTitle = document.createElement('h4');
    snapTitle.className = 'expand-panel__section-title';
    snapTitle.textContent = 'Candidate Snapshot';
    panel.appendChild(snapTitle);

    const snapDl = document.createElement('dl');
    snapDl.className = 'expand-panel__dl';
    Object.entries(snap).forEach(([key, val]) => {
      const isException = excSet.has(key);
      const dt = document.createElement('dt');
      dt.className = `expand-panel__dt${isException ? ' expand-panel__dt--exception' : ''}`;
      dt.textContent = key;

      const dd = document.createElement('dd');
      dd.className = `expand-panel__dd${isException ? ' expand-panel__dd--exception' : ''}`;
      dd.textContent = val ?? '—';

      if (isException) {
        const tag = document.createElement('span');
        tag.className = 'expand-panel__exc-tag';
        tag.textContent = 'exception';
        dt.appendChild(tag);
      }

      snapDl.appendChild(dt);
      snapDl.appendChild(dd);
    });
    panel.appendChild(snapDl);

    // Exception details
    if (excs.length > 0) {
      const excTitle = document.createElement('h4');
      excTitle.className = 'expand-panel__section-title expand-panel__section-title--mt';
      excTitle.textContent = `Exceptions (${excs.length})`;
      panel.appendChild(excTitle);

      excs.forEach(({ field, rationale, keywordsMatched }) => {
        const block = document.createElement('div');
        block.className = 'expand-panel__exc-block';

        // Highlight matched keywords in rationale text
        let highlightedRationale = _escHtml(rationale);
        if (keywordsMatched?.length > 0) {
          keywordsMatched.forEach((kw) => {
            const escaped = _escHtml(kw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            highlightedRationale = highlightedRationale.replace(
              new RegExp(escaped, 'gi'),
              (m) => `<mark class="keyword-highlight">${m}</mark>`
            );
          });
        }

        block.innerHTML = `
          <p class="expand-panel__exc-field">
            <strong>${_escHtml(field)}</strong>
            ${keywordsMatched?.length
              ? `<span class="expand-panel__keywords">keywords: ${keywordsMatched.map(_escHtml).join(', ')}</span>`
              : ''}
          </p>
          <p class="expand-panel__exc-rationale">${highlightedRationale}</p>
        `;
        panel.appendChild(block);
      });
    }

    return panel;
  }

  // ── Table renderer ─────────────────────────────────────────────────────────

  function _sortRecords(records) {
    const copy = [...records];
    if (_activeSort === 'exceptions') {
      return copy.sort((a, b) =>
        (b.validationSummary?.exceptionCount ?? 0) - (a.validationSummary?.exceptionCount ?? 0));
    }
    if (_activeSort === 'risk') {
      return copy.sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
    }
    // newest: insertion order reversed (last saved = most recent)
    return copy.reverse();
  }

  function _renderTable() {
    tableWrap.innerHTML = '';

    const records = _sortRecords(AuditService.filterByStatus(_activeFilter));

    // Count display
    const countEl = host.querySelector('#sub-count');
    if (countEl) {
      countEl.textContent = `${records.length} record${records.length !== 1 ? 's' : ''}${_activeFilter !== 'All' ? ` (${_activeFilter})` : ''}`;
    }

    if (records.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'tab-empty';
      empty.textContent = 'No submissions match the selected filter.';
      tableWrap.appendChild(empty);
      return;
    }

    const table = document.createElement('table');
    table.className = 'submissions-table';
    table.innerHTML = `
      <thead>
        <tr class="submissions-table__head-row">
          <th class="submissions-table__th">Name</th>
          <th class="submissions-table__th">Timestamp</th>
          <th class="submissions-table__th submissions-table__th--center">Exceptions</th>
          <th class="submissions-table__th submissions-table__th--center">Flagged</th>
          <th class="submissions-table__th">Risk Level</th>
          <th class="submissions-table__th">Eligibility</th>
          <th class="submissions-table__th submissions-table__th--center">Detail</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');
    records.forEach((rec) => {
      const vs      = rec.validationSummary ?? {};
      const name    = rec.candidateSnapshot?.fullName || '—';
      const excCnt  = vs.exceptionCount ?? 0;
      const flagged = vs.flagged ?? false;
      const status  = vs.eligibilityStatus ?? '';
      const risk    = _riskLevel(rec.riskScore ?? 0);

      const tr = document.createElement('tr');
      tr.className = 'submissions-table__row';

      tr.innerHTML = `
        <td class="submissions-table__td submissions-table__td--name">${_escHtml(name)}</td>
        <td class="submissions-table__td submissions-table__td--date">${_fmt(rec.timestamp)}</td>
        <td class="submissions-table__td submissions-table__td--center">
          ${excCnt > 0
            ? `<span class="exc-badge">${excCnt}</span>`
            : '<span class="exc-none">—</span>'}
        </td>
        <td class="submissions-table__td submissions-table__td--center">
          ${flagged ? '<span class="flag-yes">Yes</span>' : '<span class="exc-none">No</span>'}
        </td>
        <td class="submissions-table__td">
          <span class="risk-badge risk-badge--${_riskMod(rec.riskScore ?? 0)}">${risk}</span>
        </td>
        <td class="submissions-table__td">
          <span class="tier-badge tier-badge--${_statusMod(status)}">${status || '—'}</span>
        </td>
        <td class="submissions-table__td submissions-table__td--center">
          <button type="button" class="expand-btn" aria-expanded="false"
                  aria-label="Expand record for ${_escHtml(name)}">
            &#x25BC;
          </button>
        </td>
      `;

      // Expand panel logic (inline below the row)
      const expandBtn = tr.querySelector('.expand-btn');
      let expandRow = null;

      expandBtn.addEventListener('click', () => {
        const isOpen = expandBtn.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
          expandBtn.setAttribute('aria-expanded', 'false');
          expandBtn.innerHTML = '&#x25BC;';
          if (expandRow) { expandRow.remove(); expandRow = null; }
        } else {
          expandBtn.setAttribute('aria-expanded', 'true');
          expandBtn.innerHTML = '&#x25B2;';
          expandRow = document.createElement('tr');
          expandRow.className = 'submissions-table__expand-row';
          const td = document.createElement('td');
          td.colSpan = 7;
          td.className = 'submissions-table__expand-cell';
          td.appendChild(_buildExpandPanel(rec));
          expandRow.appendChild(td);
          tr.insertAdjacentElement('afterend', expandRow);

          animate(expandRow,
            { opacity: [0, 1], transform: ['translateY(-6px)', 'translateY(0)'] },
            { duration: 0.2, easing: [0.22, 1, 0.36, 1] }
          );
        }
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);

    const rows = Array.from(tbody.querySelectorAll('tr.submissions-table__row'));
    animate(rows,
      { opacity: [0, 1], transform: ['translateX(-8px)', 'translateX(0)'] },
      { duration: 0.25, delay: stagger(0.02), easing: [0.22, 1, 0.36, 1] }
    );
  }

  // ── Full render ────────────────────────────────────────────────────────────

  function _render() {
    host.innerHTML = '';

    // Header
    const hdr = document.createElement('div');
    hdr.className = 'tab-header';

    const left = document.createElement('div');
    left.innerHTML = `
      <h2 class="tab-title">Submissions</h2>
      <p class="tab-subtitle" id="sub-count">Loading…</p>
    `;
    hdr.appendChild(left);

    // Export buttons
    const exportWrap = document.createElement('div');
    exportWrap.className = 'export-btn-group';

    const jsonBtn = document.createElement('button');
    jsonBtn.type = 'button';
    jsonBtn.className = 'export-btn';
    jsonBtn.textContent = 'Export JSON';
    jsonBtn.addEventListener('click', _exportJSON);
    exportWrap.appendChild(jsonBtn);

    if (isAdmin) {
      const csvBtn = document.createElement('button');
      csvBtn.type = 'button';
      csvBtn.className = 'export-btn';
      csvBtn.textContent = 'Export CSV';
      csvBtn.addEventListener('click', _exportCSV);
      exportWrap.appendChild(csvBtn);
    }

    hdr.appendChild(exportWrap);
    host.appendChild(hdr);

    // Controls row
    const controls = document.createElement('div');
    controls.className = 'submissions-controls';
    controls.appendChild(filterBar);
    controls.appendChild(sortWrap);
    host.appendChild(controls);

    // Table area
    host.appendChild(tableWrap);

    _renderTable();
  }

  _render();
  return { el: host, refresh: _render };
}
