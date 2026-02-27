import { AuditService } from '../../core/AuditService.js';
import { animate, stagger } from 'motion';

/**
 * OverviewTab
 *
 * Analytics overview: 4 metric cards, tier-distribution bar,
 * and a minimal SVG line chart for the last 7 days.
 *
 * Reads exclusively from AuditService so there are no duplicated
 * metric calculations in the UI layer.  No external chart library —
 * pure SVG + Motion One animations.
 */
export function OverviewTab() {
  const host = document.createElement('div');
  host.className = 'overview-tab';

  function _render() {
    host.innerHTML = '';

    const hdr = document.createElement('div');
    hdr.className = 'tab-header';
    hdr.innerHTML = `
      <h2 class="tab-title">Governance Overview</h2>
      <p class="tab-subtitle">Compliance metrics from local audit log</p>
    `;
    host.appendChild(hdr);

    // ── Data — synchronous, from AuditService ────────────────────────────
    const d       = AuditService.computeAnalytics();
    const records = AuditService.getAll();

    const flaggedPct    = d.total === 0 ? 0 : Math.round((d.flaggedCount    / d.total) * 100);
    const exceptionPct  = d.total === 0 ? 0 : Math.round((d.exceptionCount  / d.total) * 100);

    // ── Metric cards ─────────────────────────────────────────────────────
    const grid = document.createElement('div');
    grid.className = 'overview-grid';
    grid.setAttribute('role', 'list');

    const cardDefs = [
      { label: 'Total Submissions', value: d.total,                    unit: '',  desc: 'All-time recorded',     mod: '' },
      { label: 'Flagged',           value: flaggedPct,                  unit: '%', desc: 'Under review',           mod: flaggedPct > 0 ? 'alert' : '' },
      { label: 'Soft Exceptions',   value: exceptionPct,               unit: '%', desc: 'With ≥1 exception',      mod: exceptionPct >= 50 ? 'warning' : '' },
      { label: 'Avg Exceptions',    value: d.avgExceptions.toFixed(1), unit: '',  desc: 'Per submission',         mod: '' },
    ];

    const cardEls = cardDefs.map(({ label, value, unit, desc, mod }) => {
      const card = document.createElement('div');
      card.className = `dash-card${mod ? ' dash-card--' + mod : ''}`;
      card.setAttribute('role', 'listitem');
      card.innerHTML = `
        <span class="dash-card__label">${label}</span>
        <span class="dash-card__value">${value}<span class="dash-card__unit">${unit}</span></span>
        <span class="dash-card__desc">${desc}</span>
      `;
      grid.appendChild(card);
      return card;
    });
    host.appendChild(grid);

    animate(cardEls,
      { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0)'] },
      { duration: 0.4, delay: stagger(0.07), easing: [0.22, 1, 0.36, 1] }
    );

    // ── Tier Distribution bar ─────────────────────────────────────────────
    const clean   = d.cleanCount;
    const soft    = d.exceptionCount;   // "With Exceptions"
    const flagged = d.flaggedCount;
    const tierTotal = clean + soft + flagged || 1;

    const tierSec = document.createElement('section');
    tierSec.className = 'tier-section';

    const tierTitle = document.createElement('h3');
    tierTitle.className = 'tier-section__title';
    tierTitle.textContent = 'Tier Distribution';
    tierSec.appendChild(tierTitle);

    const bar = document.createElement('div');
    bar.className = 'tier-bar';
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label',
      `Tier distribution: ${clean} clean, ${soft} with exceptions, ${flagged} flagged`);

    const segs = [
      { cls: 'clean',   pct: (clean   / tierTotal * 100), label: 'Clean',           count: clean   },
      { cls: 'soft',    pct: (soft    / tierTotal * 100), label: 'With Exceptions', count: soft    },
      { cls: 'flagged', pct: (flagged / tierTotal * 100), label: 'Flagged',         count: flagged },
    ];
    segs.forEach(({ cls, pct, label, count }) => {
      if (count === 0) return;
      const seg = document.createElement('div');
      seg.className = `tier-bar__seg tier-bar__seg--${cls}`;
      seg.style.width = `${pct.toFixed(1)}%`;
      seg.title = `${label}: ${count}`;
      seg.innerHTML = `<span class="tier-bar__seg-label">${label} <strong>${count}</strong></span>`;
      bar.appendChild(seg);
    });
    tierSec.appendChild(bar);

    const legend = document.createElement('div');
    legend.className = 'tier-legend';
    segs.forEach(({ cls, label, count }) => {
      const item = document.createElement('span');
      item.className = `tier-legend__dot tier-legend__dot--${cls}`;
      item.innerHTML = `<span class="tier-legend__label">${label} <strong>${count}</strong></span>`;
      legend.appendChild(item);
    });
    tierSec.appendChild(legend);
    host.appendChild(tierSec);

    animate(tierSec, { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)'] },
      { duration: 0.35, delay: 0.28, easing: [0.22, 1, 0.36, 1] });

    // ── Risk distribution ─────────────────────────────────────────────────
    if (d.total > 0) {
      const { low, medium, high } = d.riskDistribution;
      const riskSec = document.createElement('section');
      riskSec.className = 'tier-section';

      const riskTitle = document.createElement('h3');
      riskTitle.className = 'tier-section__title';
      riskTitle.textContent = 'Risk Distribution';
      riskSec.appendChild(riskTitle);

      const riskBar = document.createElement('div');
      riskBar.className = 'tier-bar';
      riskBar.setAttribute('role', 'img');
      riskBar.setAttribute('aria-label',
        `Risk distribution: ${low} low, ${medium} medium, ${high} high`);

      const riskTotal = low + medium + high || 1;
      [
        { cls: 'clean',   pct: (low    / riskTotal * 100), label: 'Low',    count: low    },
        { cls: 'soft',    pct: (medium / riskTotal * 100), label: 'Medium', count: medium },
        { cls: 'flagged', pct: (high   / riskTotal * 100), label: 'High',   count: high   },
      ].forEach(({ cls, pct, label, count }) => {
        if (count === 0) return;
        const seg = document.createElement('div');
        seg.className = `tier-bar__seg tier-bar__seg--${cls}`;
        seg.style.width = `${pct.toFixed(1)}%`;
        seg.title = `${label}: ${count}`;
        seg.innerHTML = `<span class="tier-bar__seg-label">${label} <strong>${count}</strong></span>`;
        riskBar.appendChild(seg);
      });
      riskSec.appendChild(riskBar);
      host.appendChild(riskSec);

      animate(riskSec, { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)'] },
        { duration: 0.35, delay: 0.35, easing: [0.22, 1, 0.36, 1] });
    }

    // ── 7-Day trend chart ─────────────────────────────────────────────────
    const trendSec = document.createElement('section');
    trendSec.className = 'trend-section';

    const trendTitle = document.createElement('h3');
    trendTitle.className = 'trend-section__title';
    trendTitle.textContent = 'Last 7 Days';
    trendSec.appendChild(trendTitle);

    trendSec.appendChild(_buildChart(records));
    host.appendChild(trendSec);

    animate(trendSec, { opacity: [0, 1] },
      { duration: 0.4, delay: 0.42, easing: [0.22, 1, 0.36, 1] });
  }

  /** Build a minimal responsive SVG line chart from raw audit records. */
  function _buildChart(records) {
    // Bucket records by submission date
    const counts = {};
    records.forEach((r) => {
      try {
        const day = new Date(r.timestamp).toISOString().slice(0, 10);
        counts[day] = (counts[day] ?? 0) + 1;
      } catch { /* ignore unparseable timestamps */ }
    });

    // Fill every day in the last 7 (including today)
    const days = [];
    for (let i = 6; i >= 0; i--) {
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

    const xOf  = (i) => PAD.left + (i / (days.length - 1)) * iW;
    const yOf  = (v) => PAD.top  + iH - (v / maxY) * iH;

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
            x2="${W - PAD.right}" y2="${yOf(v).toFixed(1)}"
            class="chart-grid-line"/>
      <text x="${PAD.left - 8}" y="${yOf(v).toFixed(1)}"
            class="chart-label" text-anchor="end" dominant-baseline="middle">${v}</text>
    `).join('');

    const xLabels = days.map((d, i) => {
      const date  = new Date(d.date + 'T12:00:00');
      const label = date.toLocaleDateString('en', { weekday: 'short' });
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
    svg.setAttribute('aria-label', 'Submission trend over last 7 days');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.innerHTML = `
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="var(--color-accent)" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${H - PAD.bottom}"
            class="chart-axis"/>
      <line x1="${PAD.left}" y1="${H - PAD.bottom}"
            x2="${W - PAD.right}" y2="${H - PAD.bottom}" class="chart-axis"/>
      ${yTicks}
      <path d="${areaPath}" fill="url(#chartFill)"/>
      <polyline points="${polyPts}" class="chart-line"/>
      ${dots}
      ${xLabels}
    `;

    const wrap = document.createElement('div');
    wrap.className = 'trend-chart-wrap';
    wrap.appendChild(svg);
    return wrap;
  }

  _render();
  return { el: host, refresh: _render };
}
