/**
 * ApiClient
 *
 * Thin fetch wrapper for the AdmitGuard backend.
 * - Injects Authorization: Bearer <token> on every request.
 * - On 401: clears the token and dispatches 'auth:unauthorized'
 *   so main.js can swap to LoginView without a full page reload.
 *
 * Base URL: VITE_API_URL env var, falling back to http://localhost:3001.
 */

import { AuthService } from './AuthService.js';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function request(method, path, body) {
  const token = AuthService.getToken();

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    AuthService.clearToken();
    document.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export const ApiClient = {
  /** POST /api/auth/login — does NOT inject auth header (pre-login) */
  async login(email, password) {
    return request('POST', '/api/auth/login', { email, password });
  },

  async postAuditRecord(record) {
    return request('POST', '/api/audit', record);
  },

  async getAuditRecords({ page = 1, limit = 20 } = {}) {
    return request('GET', `/api/audit?page=${page}&limit=${limit}`);
  },

  async getAnalytics() {
    return request('GET', '/api/analytics');
  },

  async getCandidates() {
    return request('GET', '/api/candidates');
  },
};
