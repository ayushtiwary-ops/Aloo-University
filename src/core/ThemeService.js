/**
 * ThemeService
 *
 * Manages the application colour theme (light / dark).
 *
 * Applies theme by setting `data-theme` on <html>.
 * CSS custom-property overrides in tokens.css handle all visual changes —
 * no inline style overrides are used.
 *
 * Persists the user preference to localStorage so it survives page reloads.
 * On first visit, respects the OS-level prefers-color-scheme media query.
 *
 * API:
 *   init()              — apply saved / system preference on page load
 *   toggle()            — switch between light and dark
 *   setTheme(theme)     — apply a specific theme ('light' | 'dark')
 *   getTheme()          — returns current theme string
 *   isDark()            — returns boolean
 *   onThemeChange(fn)   — subscribe to changes; returns unsubscribe fn
 */

const STORAGE_KEY = 'aloo_admitguard_theme';
const THEMES      = /** @type {const} */ (['light', 'dark']);

const _subscribers = new Set();

function _notify(theme) {
  _subscribers.forEach((fn) => fn(theme));
}

export const ThemeService = {
  /**
   * Reads saved preference or OS preference, then applies it.
   * Safe to call in non-browser environments (e.g. SSR / test runners
   * that do not define window).
   */
  init() {
    if (typeof window === 'undefined') return;

    const saved     = localStorage.getItem(STORAGE_KEY);
    const osPref    = window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

    this.setTheme(THEMES.includes(saved) ? saved : osPref);
  },

  /**
   * Applies `theme` to the document and persists it.
   * @param {'light'|'dark'} theme
   */
  setTheme(theme) {
    if (typeof document === 'undefined') return;
    if (!THEMES.includes(theme)) return;

    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    _notify(theme);
  },

  /** Switches to the opposite theme. */
  toggle() {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  },

  /** Returns the currently active theme string. */
  getTheme() {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  },

  /** Returns true when dark mode is active. */
  isDark() {
    return this.getTheme() === 'dark';
  },

  /**
   * Subscribes to theme changes.
   * @param   {(theme: string) => void} fn
   * @returns {() => void} unsubscribe
   */
  onThemeChange(fn) {
    _subscribers.add(fn);
    return () => _subscribers.delete(fn);
  },
};
