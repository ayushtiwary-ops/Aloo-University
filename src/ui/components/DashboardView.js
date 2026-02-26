/**
 * DashboardView
 *
 * Executive governance dashboard. Shows high-level compliance metrics
 * and a preview of the most recent submissions.
 *
 * Data flow:
 *   AuditService.getAll() → AnalyticsService.computeDashboardMetrics()
 *   → render metric cards + recent submissions table
 *
 * Refresh is explicit — callers invoke refresh() when the view becomes
 * visible. No background polling or subscribers required.
 *
 * @returns {{ el: HTMLElement, refresh: () => void }}
 */

import { AuditService }     from '../../core/AuditService.js';
import { AnalyticsService } from '../../core/AnalyticsService.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function _fmt(iso) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso ?? '—';
  }
}

function _fmtRefresh(iso) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Metric card ───────────────────────────────────────────────────────────

function _buildMetricCard({ label, value, unit = '', description, modifier = '' }) {
  const card = document.createElement('div');
  card.className = `dash-card${modifier ? ' dash-card--' + modifier : ''}`;
  card.innerHTML = `
    <span class="dash-card__label">${label}</span>
    <span class="dash-card__value">
      ${value}<span class="dash-card__unit">${unit}</span>
    </span>
    <span class="dash-card__desc">${description}</span>
  `;
  return card;
}

// ── Recent submissions mini-table ─────────────────────────────────────────

function _buildRecentTable(recentRecords) {
  const section = document.createElement('div');
  section.className = 'dash-recent';

  const title = document.createElement('h3');
  title.className = 'dash-recent__title';
  title.textContent = 'Recent Submissions';
  section.appendChild(title);

  if (recentRecords.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dash-recent__empty';
    empty.textContent = 'No submissions yet.';
    section.appendChild(empty);
    return section;
  }

  const wrap = document.createElement('div');
  wrap.className = 'dash-recent__table-wrap';

  const table = document.createElement('table');
  table.className = 'dash-recent__table';
  table.innerHTML = `
    <thead>
      <tr>
        <th class="dash-recent__th" scope="col">Candidate</th>
        <th class="dash-recent__th" scope="col">Submitted</th>
        <th class="dash-recent__th dash-recent__th--center" scope="col">Exceptions</th>
        <th class="dash-recent__th dash-recent__th--center" scope="col">Flagged</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  recentRecords.forEach((rec) => {
    const tr   = document.createElement('tr');
    tr.className = 'dash-recent__row';
    const name = rec.candidateData?.fullName || '—';
    const exc  = rec.exceptionCount ?? 0;

    tr.innerHTML = `
      <td class="dash-recent__td dash-recent__td--name">${name}</td>
      <td class="dash-recent__td dash-recent__td--time">${_fmt(rec.timestamp)}</td>
      <td class="dash-recent__td dash-recent__td--center">
        ${exc > 0
          ? `<span class="dash-recent__exc-badge">${exc}</span>`
          : '<span class="dash-recent__none">—</span>'
        }
      </td>
      <td class="dash-recent__td dash-recent__td--center">
        ${rec.flagged
          ? '<span class="dash-recent__flag-badge">Yes</span>'
          : '<span class="dash-recent__none">No</span>'
        }
      </td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

// ── Main component ────────────────────────────────────────────────────────

export function DashboardView() {
  const host = document.createElement('div');
  host.className = 'dashboard';

  function _render() {
    host.innerHTML = '';

    const records = AuditService.getAll();
    const metrics = AnalyticsService.computeDashboardMetrics(records);
    const now     = new Date().toISOString();

    // ── View header ───────────────────────────────────────────────────
    const viewHeader = document.createElement('div');
    viewHeader.className = 'dashboard__header';
    viewHeader.innerHTML = `
      <div>
        <h2 class="dashboard__title">Governance Overview</h2>
        <p class="dashboard__subtitle">
          Executive compliance metrics — refreshed at ${_fmtRefresh(now)}
        </p>
      </div>
    `;
    host.appendChild(viewHeader);

    // ── Metric cards ──────────────────────────────────────────────────
    const grid = document.createElement('div');
    grid.className = 'dash-grid';
    grid.setAttribute('role', 'list');

    const cards = [
      {
        label:       'Total Submissions',
        value:       metrics.total,
        unit:        '',
        description: 'All-time recorded',
        modifier:    '',
      },
      {
        label:       'Exception Rate',
        value:       metrics.exceptionRate,
        unit:        '%',
        description: 'With ≥1 exception',
        modifier:    metrics.exceptionRate >= 50 ? 'warning' : '',
      },
      {
        label:       'Flagged Rate',
        value:       metrics.flaggedRate,
        unit:        '%',
        description: 'Sent for review',
        modifier:    metrics.flaggedRate > 0 ? 'alert' : '',
      },
      {
        label:       'Avg Exceptions',
        value:       metrics.avgExceptions.toFixed(1),
        unit:        '',
        description: 'Per candidate',
        modifier:    '',
      },
    ];

    cards.forEach((cfg) => {
      const card = _buildMetricCard(cfg);
      card.setAttribute('role', 'listitem');
      grid.appendChild(card);
    });

    host.appendChild(grid);

    // ── Empty state (when no data) ────────────────────────────────────
    if (metrics.total === 0) {
      const emptyNote = document.createElement('div');
      emptyNote.className = 'dashboard__empty';
      emptyNote.innerHTML = `
        <svg viewBox="0 0 48 48" fill="none" class="dashboard__empty-icon" aria-hidden="true">
          <rect x="6" y="4" width="36" height="40" rx="4"
                stroke="currentColor" stroke-width="2"/>
          <path d="M14 16h20M14 23h20M14 30h12"
                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="38" cy="38" r="8" fill="var(--color-bg-card)"
                  stroke="currentColor" stroke-width="2"/>
          <path d="M35 38h6M38 35v6"
                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p class="dashboard__empty-title">No data yet</p>
        <p class="dashboard__empty-body">
          Submit your first application to begin building the compliance record.
        </p>
      `;
      host.appendChild(emptyNote);
      return;
    }

    // ── Recent submissions ────────────────────────────────────────────
    host.appendChild(_buildRecentTable(metrics.recentRecords));
  }

  _render();

  return { el: host, refresh: _render };
}
