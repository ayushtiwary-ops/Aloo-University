import { ApiClient } from '../../core/ApiClient.js';

/**
 * CandidateDashboard
 *
 * Shows the candidate's most recent application status.
 * @returns {HTMLElement}
 */
export function CandidateDashboard() {
  const wrapper = document.createElement('div');
  wrapper.className = 'candidate-profile-card';

  const title = document.createElement('h2');
  title.className = 'candidate-section-title';
  title.textContent = 'My Application';
  wrapper.appendChild(title);

  const loadingEl = document.createElement('p');
  loadingEl.className = 'candidate-empty-msg';
  loadingEl.textContent = 'Loading application…';
  wrapper.appendChild(loadingEl);

  function _formatDate(iso) {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch { return iso; }
  }

  function _renderApplication(rec) {
    loadingEl.remove();

    // — Compliance badge —
    const badgeWrap = document.createElement('div');
    badgeWrap.className = 'cand-badge-row';

    const badge = document.createElement('span');
    if (rec.flagged) {
      badge.className = 'cand-badge cand-badge--flagged';
      badge.textContent = '⚑ Flagged for Review';
    } else if (rec.exception_count > 0) {
      badge.className = 'cand-badge cand-badge--exceptions';
      badge.textContent = `⚠ ${rec.exception_count} Exception${rec.exception_count !== 1 ? 's' : ''}`;
    } else {
      badge.className = 'cand-badge cand-badge--compliant';
      badge.textContent = '✓ Compliant';
    }
    badgeWrap.appendChild(badge);
    wrapper.appendChild(badgeWrap);

    // — Submission date —
    const dateRow = document.createElement('div');
    dateRow.className = 'candidate-profile-row';
    const dateLbl = document.createElement('span');
    dateLbl.className = 'candidate-profile-label';
    dateLbl.textContent = 'Submitted';
    const dateVal = document.createElement('span');
    dateVal.className = 'candidate-profile-value';
    dateVal.textContent = _formatDate(rec.created_at);
    dateRow.appendChild(dateLbl);
    dateRow.appendChild(dateVal);
    wrapper.appendChild(dateRow);

    // — Strict validity —
    const strictRow = document.createElement('div');
    strictRow.className = 'candidate-profile-row';
    const strictLbl = document.createElement('span');
    strictLbl.className = 'candidate-profile-label';
    strictLbl.textContent = 'Hard Rules';
    const strictVal = document.createElement('span');
    strictVal.className = 'candidate-profile-value';
    strictVal.textContent = rec.strict_valid ? 'All passed' : 'Violations present';
    strictVal.style.color = rec.strict_valid ? 'var(--color-green-accent)' : 'var(--color-error)';
    strictRow.appendChild(strictLbl);
    strictRow.appendChild(strictVal);
    wrapper.appendChild(strictRow);

    // — Exception breakdown —
    const fields = Array.isArray(rec.exception_fields) ? rec.exception_fields : [];
    if (fields.length) {
      const exRow = document.createElement('div');
      exRow.className = 'candidate-profile-row candidate-profile-row--col';
      const exLbl = document.createElement('span');
      exLbl.className = 'candidate-profile-label';
      exLbl.textContent = 'Exceptions';
      exRow.appendChild(exLbl);
      const exList = document.createElement('ul');
      exList.className = 'cand-exception-list';
      fields.forEach((f) => {
        const li = document.createElement('li');
        li.textContent = f;
        exList.appendChild(li);
      });
      exRow.appendChild(exList);
      wrapper.appendChild(exRow);
    }

    // — Flagged notice —
    if (rec.flagged) {
      const notice = document.createElement('div');
      notice.className = 'cand-flag-notice';
      notice.setAttribute('role', 'alert');
      notice.textContent = 'This application has been flagged for managerial review before final processing.';
      wrapper.appendChild(notice);
    }
  }

  function _renderEmpty() {
    loadingEl.remove();
    const empty = document.createElement('div');
    empty.className = 'candidate-empty-state';
    const msg = document.createElement('p');
    msg.className = 'candidate-empty-msg';
    msg.textContent = 'No application on file yet. Your application will appear here once submitted.';
    empty.appendChild(msg);
    wrapper.appendChild(empty);
  }

  ApiClient.getCandidateApplication()
    .then((rec) => {
      if (rec) _renderApplication(rec);
      else _renderEmpty();
    })
    .catch((err) => {
      loadingEl.textContent = err.message ?? 'Failed to load application.';
      loadingEl.style.color = 'var(--color-error)';
    });

  return wrapper;
}
