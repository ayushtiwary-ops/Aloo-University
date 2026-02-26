/**
 * apiClient.example.js
 *
 * Drop this into your Vite frontend (e.g. src/core/ApiClient.js).
 * Shows how the frontend submits an audit record and fetches analytics
 * using the JWT obtained at login.
 *
 * Token storage: sessionStorage (safer than localStorage for JWTs —
 * clears on tab close, inaccessible to other tabs).
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ── Token helpers ──────────────────────────────────────────────────────────

function getToken()        { return sessionStorage.getItem('ag_token'); }
function setToken(t)       { sessionStorage.setItem('ag_token', t); }
export  function clearToken() { sessionStorage.removeItem('ag_token'); }

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── Base request helper ────────────────────────────────────────────────────

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth ───────────────────────────────────────────────────────────────────

/**
 * Logs in the user and stores the JWT.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: object }>}
 */
export async function login(email, password) {
  const result = await request('POST', '/api/auth/login', { email, password });
  setToken(result.token);
  return result;
}

// ── Audit ──────────────────────────────────────────────────────────────────

/**
 * Submits an audit record after form submission.
 * Called from SubmissionController.js after the local AuditService.save().
 *
 * @param {object} auditRecord - The record built by SubmissionController
 * @returns {Promise<object>}
 */
export async function postAuditRecord(auditRecord) {
  return request('POST', '/api/audit', {
    candidateData:  auditRecord.candidateData,
    exceptionCount: auditRecord.exceptionCount,
    exceptionFields: auditRecord.exceptionFields,
    rationaleMap:   auditRecord.rationaleMap,
    flagged:        auditRecord.flagged,
    strictValid:    auditRecord.strictValid,
    softValid:      true,             // always true at submit (eligibility gate passed)
  });
}

/**
 * Fetches paginated audit records (admin only).
 * @param {{ page?: number, limit?: number }} opts
 */
export async function getAuditRecords({ page = 1, limit = 20 } = {}) {
  return request('GET', `/api/audit?page=${page}&limit=${limit}`);
}

/**
 * Triggers a file download for the audit export.
 * @param {'json'|'csv'} format
 */
export function downloadAuditExport(format = 'csv') {
  const token = getToken();
  // Anchor-click approach — browser handles the Content-Disposition header
  const a = document.createElement('a');
  a.href = `${BASE_URL}/api/audit/export?format=${format}`;
  a.setAttribute('download', '');
  // For authenticated downloads the token goes in a short-lived query param
  // OR use a server-side cookie strategy in production. This example uses a
  // temporary <iframe> approach for simplicity.
  a.href += `&token=${token}`;   // see note below*
  document.body.appendChild(a);
  a.click();
  a.remove();
  // * Production note: expose a one-time signed download URL from
  //   GET /api/audit/export/signed instead of passing the JWT in the URL.
}

// ── Analytics ──────────────────────────────────────────────────────────────

/**
 * Fetches governance metrics for the dashboard (admin only).
 * @returns {Promise<{ total, exceptionRate, flaggedRate, avgExceptions }>}
 */
export async function getAnalytics() {
  return request('GET', '/api/analytics');
}
