import { ApiClient } from '../../core/ApiClient.js';

/**
 * MyProfile
 *
 * Fetches and displays the authenticated candidate's profile (read-only).
 * @returns {HTMLElement}
 */
export function MyProfile() {
  const wrapper = document.createElement('div');
  wrapper.className = 'candidate-profile-card';

  const title = document.createElement('h2');
  title.className = 'candidate-section-title';
  title.textContent = 'My Profile';
  wrapper.appendChild(title);

  // Loading state
  const loadingEl = document.createElement('p');
  loadingEl.className = 'candidate-empty-msg';
  loadingEl.textContent = 'Loading profile…';
  wrapper.appendChild(loadingEl);

  function _row(label, value) {
    const row = document.createElement('div');
    row.className = 'candidate-profile-row';

    const lbl = document.createElement('span');
    lbl.className = 'candidate-profile-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'candidate-profile-value';
    val.textContent = value || '—';

    row.appendChild(lbl);
    row.appendChild(val);
    return row;
  }

  function _formatDate(iso) {
    try {
      return new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  ApiClient.getCandidateProfile()
    .then((profile) => {
      loadingEl.remove();
      wrapper.appendChild(_row('Full Name', profile.full_name));
      wrapper.appendChild(_row('Email',     profile.email));
      wrapper.appendChild(_row('Phone',     profile.phone));
      wrapper.appendChild(_row('Member Since', _formatDate(profile.created_at)));
    })
    .catch((err) => {
      loadingEl.textContent = err.message ?? 'Failed to load profile.';
      loadingEl.style.color = 'var(--color-error)';
    });

  return wrapper;
}
