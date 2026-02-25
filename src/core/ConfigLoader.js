/**
 * ConfigLoader
 *
 * Loads and caches rules.json at startup.
 * ValidationEngine calls getRules() after load() resolves.
 */
let _rules = null;

export const ConfigLoader = {
  async load() {
    const res = await fetch('/src/config/rules.json');
    _rules = await res.json();
    return _rules;
  },

  getRules() {
    return _rules;
  },
};
