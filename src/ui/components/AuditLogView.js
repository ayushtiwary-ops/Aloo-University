/**
 * AuditLogView
 *
 * Governance audit trail table. Reads directly from AuditService.
 * Refresh is explicit — call _render() when the tab becomes visible.
 *
 * Layout:
 *   Header row  — "Governance Audit Log" + Clear Log button
 *   Table       — Candidate Name | Submitted | Exceptions | Flagged | ▶
 *   Expand row  — full candidate data, exception detail, compliance status
 *   Empty state — shown when no records exist
 */

import { AuditService } from '../../core/AuditService.js';

// ── Constants ──────────────────────────────────────────────────────────────

const FIELD_LABELS = {
  fullName:         'Full Name',
  email:            'Email Address',
  phone:            'Phone Number',
  dateOfBirth:      'Date of Birth',
  aadhaar:          'Aadhaar Number',
  qualification:    'Qualification',
  graduationYear:   'Graduation Year',
  percentageOrCgpa: 'Percentage / CGPA',
  score:            'Test Score',
  interviewStatus:  'Interview Status',
  offerLetterSent:  'Offer Letter Sent',
};

// gradingMode is a UI control, not a candidate field
const CANDIDATE_FIELD_ORDER = Object.keys(FIELD_LABELS);

// ── Helpers ────────────────────────────────────────────────────────────────

function _fmt(iso) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day:    '2-digit',
      month:  'short',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso ?? '—';
  }
}

function _val(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (v === true  || v === 'true')  return 'Yes';
  if (v === false || v === 'false') return 'No';
  return String(v);
}

// ── Expand row builder ────────────────────────────────────────────────────

function _buildExpandRow(record, colCount) {
  const tr = document.createElement('tr');
  tr.className = 'audit-table__expand-row'; // starts collapsed via CSS

  const td = document.createElement('td');
  td.colSpan = colCount;
  td.className = 'audit-table__expand-cell';

  const { candidateData = {}, exceptionFields = [], rationaleMap = {},
          strictValid = true, flagged = false } = record;

  // ── Candidate data grid ───────────────────────────────────────────────
  const gridItems = CANDIDATE_FIELD_ORDER.map((fieldId) => {
    const isException = exceptionFields.includes(fieldId);
    return `
      <div class="audit-expand__field${isException ? ' audit-expand__field--exception' : ''}">
        <span class="audit-expand__field-label">${FIELD_LABELS[fieldId] ?? fieldId}</span>
        <span class="audit-expand__field-value">${_val(candidateData[fieldId])}</span>
        ${isException ? '<span class="audit-expand__field-exception-tag">Exception</span>' : ''}
      </div>
    `;
  }).join('');

  // ── Exception detail section ──────────────────────────────────────────
  const exceptionSection = exceptionFields.length > 0
    ? `
      <div class="audit-expand__section">
        <h4 class="audit-expand__section-title">Exception Rationale</h4>
        <ul class="audit-expand__rationale-list">
          ${exceptionFields.map((fid) => `
            <li class="audit-expand__rationale-item">
              <span class="audit-expand__rationale-field">${FIELD_LABELS[fid] ?? fid}</span>
              <span class="audit-expand__rationale-text">${rationaleMap[fid] ?? '—'}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `
    : '';

  // ── Compliance status badges ──────────────────────────────────────────
  const strictBadge = strictValid
    ? '<span class="audit-expand__badge audit-expand__badge--valid">Strict Valid</span>'
    : '<span class="audit-expand__badge audit-expand__badge--invalid">Strict Violations</span>';

  const flaggedBadge = flagged
    ? '<span class="audit-expand__badge audit-expand__badge--flagged">Flagged for Review</span>'
    : '<span class="audit-expand__badge audit-expand__badge--clear">No Managerial Flag</span>';

  td.innerHTML = `
    <div class="audit-expand">
      <div class="audit-expand__section">
        <h4 class="audit-expand__section-title">Candidate Data</h4>
        <div class="audit-expand__field-grid">${gridItems}</div>
      </div>
      ${exceptionSection}
      <div class="audit-expand__section audit-expand__compliance-row">
        <h4 class="audit-expand__section-title">Compliance Status</h4>
        <div class="audit-expand__badges">${strictBadge}${flaggedBadge}</div>
      </div>
    </div>
  `;

  tr.appendChild(td);
  return tr;
}

// ── Main component ────────────────────────────────────────────────────────

/**
 * @returns {{ el: HTMLElement, refresh: () => void }}
 */
export function AuditLogView() {
  const host = document.createElement('div');
  host.className = 'audit-log';

  // ── Clear confirm dialog (inline, dismissible) ────────────────────────
  let _confirmVisible = false;

  function _showClearConfirm() {
    if (_confirmVisible) return;
    _confirmVisible = true;

    const dialog = document.createElement('div');
    dialog.className = 'audit-log__confirm-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'clear-confirm-title');
    dialog.innerHTML = `
      <p class="audit-log__confirm-title" id="clear-confirm-title">
        Clear entire audit log?
      </p>
      <p class="audit-log__confirm-body">
        This will permanently delete all submission records and cannot be undone.
      </p>
      <div class="audit-log__confirm-actions">
        <button class="audit-log__confirm-cancel" type="button">Cancel</button>
        <button class="audit-log__confirm-delete" type="button">Clear Log</button>
      </div>
    `;

    dialog.querySelector('.audit-log__confirm-cancel').addEventListener('click', () => {
      dialog.remove();
      _confirmVisible = false;
    });

    dialog.querySelector('.audit-log__confirm-delete').addEventListener('click', () => {
      AuditService.clear();
      dialog.remove();
      _confirmVisible = false;
      _render();
    });

    host.prepend(dialog);
    dialog.querySelector('.audit-log__confirm-cancel').focus();
  }

  // ── Main render ───────────────────────────────────────────────────────
  function _render() {
    // Preserve confirm dialog across re-renders
    const existingDialog = host.querySelector('.audit-log__confirm-dialog');
    host.innerHTML = '';
    if (existingDialog) host.appendChild(existingDialog);

    const records = AuditService.getAll();

    // ── View header ─────────────────────────────────────────────────────
    const viewHeader = document.createElement('div');
    viewHeader.className = 'audit-log__header';
    viewHeader.innerHTML = `
      <div>
        <h2 class="audit-log__title">Governance Audit Log</h2>
        <p class="audit-log__subtitle">
          ${records.length} submission record${records.length !== 1 ? 's' : ''}
        </p>
      </div>
    `;

    if (records.length > 0) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'audit-log__clear-btn';
      clearBtn.type = 'button';
      clearBtn.textContent = 'Clear Log';
      clearBtn.addEventListener('click', _showClearConfirm);
      viewHeader.appendChild(clearBtn);
    }

    host.appendChild(viewHeader);

    // ── Empty state ─────────────────────────────────────────────────────
    if (records.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'audit-log__empty';
      empty.innerHTML = `
        <svg viewBox="0 0 48 48" fill="none" class="audit-log__empty-icon" aria-hidden="true">
          <rect x="8" y="6" width="32" height="36" rx="3"
                stroke="currentColor" stroke-width="2"/>
          <line x1="16" y1="16" x2="32" y2="16"
                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="16" y1="22" x2="32" y2="22"
                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="16" y1="28" x2="24" y2="28"
                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p class="audit-log__empty-title">No submissions recorded</p>
        <p class="audit-log__empty-body">
          Completed form submissions will appear here for compliance review.
        </p>
      `;
      host.appendChild(empty);
      return;
    }

    // ── Table ───────────────────────────────────────────────────────────
    const tableWrap = document.createElement('div');
    tableWrap.className = 'audit-log__table-wrap';

    const table = document.createElement('table');
    table.className = 'audit-table';
    table.setAttribute('role', 'table');

    // Header
    table.innerHTML = `
      <thead>
        <tr class="audit-table__head-row">
          <th class="audit-table__th" scope="col">Candidate</th>
          <th class="audit-table__th" scope="col">Submitted</th>
          <th class="audit-table__th audit-table__th--center" scope="col">Exceptions</th>
          <th class="audit-table__th audit-table__th--center" scope="col">Flagged</th>
          <th class="audit-table__th audit-table__th--center" scope="col">
            <span class="sr-only">Details</span>
          </th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');
    const COL_COUNT = 5;

    // Reverse to show newest first
    [...records].reverse().forEach((record) => {
      const candidateName  = record.candidateData?.fullName || '—';
      const exceptionCount = record.exceptionCount ?? 0;
      const flagged        = record.flagged ?? false;

      // Main data row
      const dataRow = document.createElement('tr');
      dataRow.className = 'audit-table__row';

      dataRow.innerHTML = `
        <td class="audit-table__td audit-table__td--name">${candidateName}</td>
        <td class="audit-table__td audit-table__td--time">${_fmt(record.timestamp)}</td>
        <td class="audit-table__td audit-table__td--center">
          ${exceptionCount > 0
            ? `<span class="audit-table__exception-badge">${exceptionCount}</span>`
            : '<span class="audit-table__none">—</span>'
          }
        </td>
        <td class="audit-table__td audit-table__td--center">
          ${flagged
            ? '<span class="audit-table__flagged-badge">Yes</span>'
            : '<span class="audit-table__none">No</span>'
          }
        </td>
        <td class="audit-table__td audit-table__td--center">
          <button class="audit-table__expand-btn" type="button"
                  aria-expanded="false"
                  aria-label="View details for ${candidateName}">
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"
                 class="audit-table__expand-icon">
              <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
          </button>
        </td>
      `;

      // Expand row
      const expandRow = _buildExpandRow(record, COL_COUNT);

      // Toggle expand — class-based so CSS grid animation fires
      const expandBtn = dataRow.querySelector('.audit-table__expand-btn');
      expandBtn.addEventListener('click', () => {
        const isOpen = expandRow.classList.contains('audit-table__expand-row--open');
        expandRow.classList.toggle('audit-table__expand-row--open', !isOpen);
        expandBtn.setAttribute('aria-expanded', String(!isOpen));
        expandBtn.querySelector('.audit-table__expand-icon')
          .classList.toggle('audit-table__expand-icon--open', !isOpen);
      });

      tbody.appendChild(dataRow);
      tbody.appendChild(expandRow);
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    host.appendChild(tableWrap);
  }

  _render();

  return { el: host, refresh: _render };
}
