/**
 * DashboardView  —  operations-grade analytics dashboard
 *
 * All metrics sourced from AuditService; no independent metric logic.
 *
 * Parts:
 *   2. Metric cards        — 4 KPI cards with icons, stagger animation
 *   3. Risk distribution   — horizontal bars Low / Medium / High
 *   4. Trend chart         — lightweight SVG line chart
 *   5. Exception breakdown — top exception fields sorted descending
 *   6. Operational insights — auto-generated compliance sentences
 *   7. Filter controls     — All Time / Last 7 Days / Last 30 Days
 *
 * @returns {{ el: HTMLElement, refresh: () => void }}
 */

import { AuditService } from '../../core/AuditService.js';
import { animate, stagger } from 'motion';

// ── Inline SVG icons ──────────────────────────────────────────────────────────

const IC = {
  total: `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="dv-card__icon">
    <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  exception: `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="dv-card__icon">
    <path d="M10 2.5L17.5 16.5H2.5L10 2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M10 9v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="10" cy="14" r=".75" fill="currentColor"/>
  </svg>`,
  flagged: `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="dv-card__icon">
    <path d="M5 2.5v15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M5 3.5h9.5L11 8l3.5 4.5H5" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  avg: `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="dv-card__icon">
    <rect x="2"  y="12" width="3" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
    <rect x="8"  y="8"  width="3" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/>
    <rect x="14" y="4"  width="3" height="14" rx="1" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
};

// ── Private helpers ───────────────────────────────────────────────────────────

function _rl(score) {
  if (score <= 20) return 'Low';
  if (score <= 50) return 'Medium';
  return 'High';
}

/**
 * Derives the same metric shape as AuditService.computeAnalytics()
 * from a pre-filtered record subset. Used for date-range filters.
 */
function _metricsFrom(records) {
  const total = records.length;
  let clean = 0, withExc = 0, flagged = 0, totalExc = 0;
  let low = 0, medium = 0, high = 0;

  for (const r of records) {
    const es = r.validationSummary?.eligibilityStatus;
    if      (es === 'Clean')           clean++;
    else if (es === 'With Exceptions') withExc++;
    else if (es === 'Flagged')         flagged++;

    totalExc += r.validationSummary?.exceptionCount ?? 0;

    const lvl = r.riskLevel ?? _rl(r.riskScore ?? 0);
    if      (lvl === 'Low')    low++;
    else if (lvl === 'Medium') medium++;
    else                        high++;
  }

  return {
    total,
    cleanCount:       clean,
    exceptionCount:   withExc,
    flaggedCount:     flagged,
    avgExceptions:    total === 0 ? 0 : parseFloat((totalExc / total).toFixed(1)),
    riskDistribution: { low, medium, high },
  };
}

/** Aggregate exception fields across records, sorted by count desc, top 8. */
function _topExceptions(records) {
  const counts = {};
  for (const r of records) {
    for (const exc of r.exceptions ?? []) {
      if (exc.field) counts[exc.field] = (counts[exc.field] ?? 0) + 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
}

/** Auto-generate operational insight sentences from metrics + records. */
function _insights(records, d) {
  if (d.total === 0) {
    return ['No submissions recorded in the selected period.'];
  }

  const lines = [];

  // Flag rate
  const flagPct = Math.round((d.flaggedCount / d.total) * 100);
  lines.push(
    flagPct > 0
      ? `${flagPct}% of submissions are flagged and require manual review.`
      : 'No submissions are currently flagged — compliance posture is healthy.',
  );

  // Most common exception field
  const topExc = _topExceptions(records);
  if (topExc.length > 0) {
    const [field, count] = topExc[0];
    const pct = Math.round((count / d.total) * 100);
    lines.push(`"${field}" is the most common exception field, appearing in ${pct}% of entries.`);
  }

  // Last-7-days volume (always from full log for context)
  const cut7 = new Date();
  cut7.setDate(cut7.getDate() - 7);
  const n7 = AuditService.getAll().filter((r) => {
    try { return new Date(r.timestamp) >= cut7; } catch { return false; }
  }).length;
  if (n7 > 0) {
    lines.push(`${n7} submission${n7 !== 1 ? 's' : ''} received in the last 7 days.`);
  }

  // Hours saved (strict-rule blocks = 1 hour saved each)
  const blocked = records.filter((r) => r.validationSummary?.strictPassed === false).length;
  if (blocked > 0) {
    lines.push(
      `Estimated ${blocked} review hour${blocked !== 1 ? 's' : ''} saved by automated strict-rule enforcement.`,
    );
  }

  // High-risk advisory
  const { high } = d.riskDistribution;
  if (high > 0) {
    const hp = Math.round((high / d.total) * 100);
    lines.push(`${hp}% of submissions carry a High risk score — prioritise counsellor review.`);
  }

  return lines;
}

/** Build a minimal responsive SVG line chart for the given day window. */
function _buildTrendChart(records, dayCount) {
  const counts = {};
  records.forEach((r) => {
    try {
      const key = new Date(r.timestamp).toISOString().slice(0, 10);
      counts[key] = (counts[key] ?? 0) + 1;
    } catch { /* ignore */ }
  });

  const days = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: counts[key] ?? 0 });
  }

  const W = 560, H = 160;
  const PAD = { top: 18, right: 18, bottom: 38, left: 34 };
  const iW  = W - PAD.left - PAD.right;
  const iH  = H - PAD.top  - PAD.bottom;
  const maxY = Math.max(...days.map((d) => d.count), 1);

  const xOf = (i) => PAD.left + (i / Math.max(days.length - 1, 1)) * iW;
  const yOf = (v) => PAD.top  + iH - (v / maxY) * iH;

  const polyPts = days.map((d, i) =>
    `${xOf(i).toFixed(1)},${yOf(d.count).toFixed(1)}`).join(' ');

  const areaPath = [
    `M ${xOf(0).toFixed(1)},${(H - PAD.bottom).toFixed(1)}`,
    ...days.map((d, i) => `L ${xOf(i).toFixed(1)},${yOf(d.count).toFixed(1)}`),
    `L ${xOf(days.length - 1).toFixed(1)},${(H - PAD.bottom).toFixed(1)}`,
    'Z',
  ].join(' ');

  const yTicks = [0, Math.round(maxY / 2), maxY].map((v) => `
    <line x1="${PAD.left - 4}" y1="${yOf(v).toFixed(1)}"
          x2="${W - PAD.right}" y2="${yOf(v).toFixed(1)}" class="chart-grid-line"/>
    <text x="${PAD.left - 8}" y="${yOf(v).toFixed(1)}"
          class="chart-label" text-anchor="end" dominant-baseline="middle">${v}</text>
  `).join('');

  const step = dayCount > 7 ? 5 : 1;
  const xLabels = days.map((d, i) => {
    if (i % step !== 0 && i !== days.length - 1) return '';
    const date  = new Date(d.date + 'T12:00:00');
    const label = dayCount > 7
      ? date.toLocaleDateString('en', { day: 'numeric', month: 'short' })
      : date.toLocaleDateString('en', { weekday: 'short' });
    return `<text x="${xOf(i).toFixed(1)}" y="${H - 8}"
                  class="chart-label" text-anchor="middle">${label}</text>`;
  }).join('');

  const dots = days.map((d, i) => `
    <circle cx="${xOf(i).toFixed(1)}" cy="${yOf(d.count).toFixed(1)}"
            r="4" class="chart-dot${d.count > 0 ? ' chart-dot--active' : ''}">
      <title>${d.date}: ${d.count} submission${d.count !== 1 ? 's' : ''}</title>
    </circle>
  `).join('');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'trend-chart');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Submission trend over last ${dayCount} days`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.innerHTML = `
    <defs>
      <linearGradient id="dvChartFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="var(--color-accent)" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${H - PAD.bottom}"
          class="chart-axis"/>
    <line x1="${PAD.left}" y1="${H - PAD.bottom}"
          x2="${W - PAD.right}" y2="${H - PAD.bottom}" class="chart-axis"/>
    ${yTicks}
    <path d="${areaPath}" fill="url(#dvChartFill)"/>
    <polyline points="${polyPts}" class="chart-line"/>
    ${dots}
    ${xLabels}
  `;

  const wrap = document.createElement('div');
  wrap.className = 'trend-chart-wrap';
  wrap.appendChild(svg);
  return wrap;
}

/** Create a titled section wrapper; returns { el, content }. */
function _makeSection(title) {
  const el = document.createElement('section');
  el.className = 'dv-section';

  const h = document.createElement('h3');
  h.className = 'dv-section__title';
  h.textContent = title;
  el.appendChild(h);

  const content = document.createElement('div');
  content.className = 'dv-section__content';
  el.appendChild(content);

  return { el, content };
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardView() {
  let _filter = 'all'; // 'all' | '7d' | '30d'

  const host = document.createElement('div');
  host.className = 'dv-root';

  function _getRecords() {
    const all = AuditService.getAll();
    if (_filter === 'all') return all;
    const days = _filter === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return all.filter((r) => {
      try { return new Date(r.timestamp) >= cutoff; } catch { return false; }
    });
  }

  function _render() {
    host.innerHTML = '';

    // ── PART 7 — Header + filter controls ────────────────────────────────

    const hdr = document.createElement('div');
    hdr.className = 'dv-header';

    const titleWrap = document.createElement('div');
    titleWrap.innerHTML = `
      <h2 class="dv-title">Analytics Dashboard</h2>
      <p class="dv-subtitle">Compliance metrics — updated
        ${new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
    `;

    const filterBar = document.createElement('div');
    filterBar.className = 'dv-filter-bar';
    filterBar.setAttribute('role', 'group');
    filterBar.setAttribute('aria-label', 'Date range filter');

    [
      { key: 'all', label: 'All Time'     },
      { key: '7d',  label: 'Last 7 Days'  },
      { key: '30d', label: 'Last 30 Days' },
    ].forEach(({ key, label }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `dv-filter-btn${_filter === key ? ' dv-filter-btn--active' : ''}`;
      btn.textContent = label;
      btn.setAttribute('aria-pressed', String(_filter === key));
      btn.addEventListener('click', () => {
        if (_filter === key) return;
        _filter = key;
        _render();
      });
      filterBar.appendChild(btn);
    });

    hdr.appendChild(titleWrap);
    hdr.appendChild(filterBar);
    host.appendChild(hdr);

    // ── Data ──────────────────────────────────────────────────────────────

    const records = _getRecords();
    // For 'all', delegate to AuditService.computeAnalytics() (authoritative).
    // For filtered ranges, derive equivalent metrics from the subset.
    const d = _filter === 'all'
      ? AuditService.computeAnalytics()
      : _metricsFrom(records);

    const exceptionPct = d.total === 0 ? 0 : Math.round((d.exceptionCount / d.total) * 100);
    const flaggedPct   = d.total === 0 ? 0 : Math.round((d.flaggedCount   / d.total) * 100);

    // ── PART 2 — Metric cards ─────────────────────────────────────────────

    const grid = document.createElement('div');
    grid.className = 'dv-grid';
    grid.setAttribute('role', 'list');

    const cardDefs = [
      {
        icon: IC.total,
        label: 'Total Submissions',
        value: d.total,
        unit: '',
        desc: 'In selected period',
        mod: '',
      },
      {
        icon: IC.exception,
        label: 'Exception Rate',
        value: exceptionPct,
        unit: '%',
        desc: 'With ≥1 soft exception',
        mod: exceptionPct >= 50 ? 'warning' : '',
      },
      {
        icon: IC.flagged,
        label: 'Flagged Rate',
        value: flaggedPct,
        unit: '%',
        desc: 'Sent for review',
        mod: flaggedPct > 0 ? 'alert' : '',
      },
      {
        icon: IC.avg,
        label: 'Avg Exceptions',
        value: d.avgExceptions.toFixed(1),
        unit: '',
        desc: 'Per submission',
        mod: '',
      },
    ];

    const cardEls = cardDefs.map(({ icon, label, value, unit, desc, mod }) => {
      const card = document.createElement('div');
      card.className = `dv-card${mod ? ' dv-card--' + mod : ''}`;
      card.setAttribute('role', 'listitem');
      card.innerHTML = `
        ${icon}
        <span class="dv-card__label">${label}</span>
        <span class="dv-card__value">${value}<span class="dv-card__unit">${unit}</span></span>
        <span class="dv-card__desc">${desc}</span>
      `;
      grid.appendChild(card);
      return card;
    });

    host.appendChild(grid);

    animate(
      cardEls,
      { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0)'] },
      { duration: 0.3, delay: stagger(0.07), easing: [0.22, 1, 0.36, 1] },
    );

    if (d.total === 0) {
      const empty = document.createElement('p');
      empty.className = 'dv-empty';
      empty.textContent = _filter === 'all'
        ? 'No submissions recorded yet.'
        : 'No submissions in this time range.';
      host.appendChild(empty);
      return;
    }

    // ── PART 3 — Risk distribution ────────────────────────────────────────

    const riskSec = _makeSection('Risk Distribution');
    const { low, medium, high } = d.riskDistribution;
    const riskTotal = (low + medium + high) || 1;

    [
      { label: 'Low Risk',    count: low,    pct: (low    / riskTotal) * 100, mod: 'low'    },
      { label: 'Medium Risk', count: medium, pct: (medium / riskTotal) * 100, mod: 'medium' },
      { label: 'High Risk',   count: high,   pct: (high   / riskTotal) * 100, mod: 'high'   },
    ].forEach(({ label, count, pct, mod }) => {
      const row = document.createElement('div');
      row.className = 'dv-risk-row';
      row.innerHTML = `
        <span class="dv-risk-row__label">${label}</span>
        <div class="dv-risk-row__track" role="progressbar"
             aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"
             aria-label="${label}: ${count}">
          <div class="dv-risk-row__bar dv-risk-row__bar--${mod}"
               style="width:${pct.toFixed(1)}%"></div>
        </div>
        <span class="dv-risk-row__count">
          ${count} <span class="dv-risk-row__pct">(${Math.round(pct)}%)</span>
        </span>
      `;
      riskSec.content.appendChild(row);
    });
    host.appendChild(riskSec.el);

    // ── PART 4 — Trend chart ──────────────────────────────────────────────

    const chartDays  = _filter === '30d' ? 30 : 7;
    const trendSec   = _makeSection(`Submission Trend — Last ${chartDays} Days`);
    // Always chart from the full log (trend is about system activity, not filter window)
    trendSec.content.appendChild(_buildTrendChart(AuditService.getAll(), chartDays));
    host.appendChild(trendSec.el);

    // ── PART 5 — Top exception fields ─────────────────────────────────────

    const topExcs = _topExceptions(records);
    if (topExcs.length > 0) {
      const excSec  = _makeSection('Top Exception Fields');
      const table   = document.createElement('table');
      table.className = 'dv-exc-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th class="dv-exc-table__th">Field</th>
            <th class="dv-exc-table__th dv-exc-table__th--right">Occurrences</th>
            <th class="dv-exc-table__th dv-exc-table__th--right">% of Submissions</th>
          </tr>
        </thead>
      `;
      const tbody = document.createElement('tbody');
      topExcs.forEach(([field, count]) => {
        const tr  = document.createElement('tr');
        tr.className = 'dv-exc-table__row';
        const pct = Math.round((count / d.total) * 100);
        tr.innerHTML = `
          <td class="dv-exc-table__td">${field}</td>
          <td class="dv-exc-table__td dv-exc-table__td--right">
            <span class="dv-exc-badge">${count}</span>
          </td>
          <td class="dv-exc-table__td dv-exc-table__td--right dv-exc-table__td--muted">${pct}%</td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      excSec.content.appendChild(table);
      host.appendChild(excSec.el);
    }

    // ── PART 6 — Operational insights ─────────────────────────────────────

    const insSec  = _makeSection('Operational Insights');
    const insLines = _insights(records, d);
    const insList  = document.createElement('ul');
    insList.className = 'dv-insights';
    insLines.forEach((line) => {
      const li = document.createElement('li');
      li.className = 'dv-insights__item';
      li.textContent = line;
      insList.appendChild(li);
    });
    insSec.content.appendChild(insList);
    host.appendChild(insSec.el);

    // Stagger-animate sections below the cards
    const sections = Array.from(host.querySelectorAll('.dv-section'));
    animate(
      sections,
      { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)'] },
      { duration: 0.35, delay: stagger(0.07, { start: 0.22 }), easing: [0.22, 1, 0.36, 1] },
    );
  }

  _render();
  return { el: host, refresh: _render };
}
