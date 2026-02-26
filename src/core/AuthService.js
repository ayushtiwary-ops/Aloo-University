/**
 * AuthService
 *
 * Manages JWT authentication state for the frontend.
 * Token and user object are stored in localStorage so sessions
 * persist across tabs and browser restarts.
 *
 * Keys:
 *   ag_token — raw JWT string
 *   ag_user  — JSON { id, email, role }
 */

const TOKEN_KEY = 'ag_token';
const USER_KEY  = 'ag_user';

export const AuthService = {

  /**
   * Stores token + user from the login API response.
   * @param {string} token
   * @param {{ id: string, email: string, role: string }} user
   */
  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  /** Returns the raw JWT string, or null. */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  /** Returns the stored user object, or null. */
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },

  /** Returns the user's role ('admin' | 'user'), or null. */
  getRole() {
    return this.getUser()?.role ?? null;
  },

  /** Returns the user's email, or null. */
  getEmail() {
    return this.getUser()?.email ?? null;
  },

  /**
   * Returns true when a token exists AND has not expired.
   * Decodes the JWT payload (base64) to read the `exp` claim — no library needed.
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  /** Clears stored session data without triggering any redirect. */
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Logs out: clears storage and dispatches 'auth:unauthorized'
   * so main.js can swap the view without a full page reload.
   */
  logout() {
    this.clearToken();
    document.dispatchEvent(new CustomEvent('auth:unauthorized'));
  },
};
