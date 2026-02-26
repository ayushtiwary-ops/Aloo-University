import { ConfigLoader }      from './core/ConfigLoader.js';
import { FormStateManager }  from './state/FormStateManager.js';
import { ThemeService }      from './core/ThemeService.js';
import { App }               from './app.js';
import { RootLayout }        from './ui/layout/RootLayout.js';

/**
 * Entry point.
 *
 * Initialisation order:
 *   1. Apply saved / OS theme preference (ThemeService.init).
 *   2. Load rules.json so ValidationEngine has rules before any field event fires.
 *   3. Pre-validate all fields with their default values so the UI starts in a
 *      consistent state (fields with defaults pass; required-but-empty fields fail).
 *   4. Compose the component tree.
 *   5. Mount to #app.
 */
async function init() {
  ThemeService.init();
  await ConfigLoader.load();
  FormStateManager.validateAll();
  document.getElementById('app').appendChild(RootLayout({ main: App() }));
}

init().catch((err) => {
  console.error('[AdmitGuard] Initialisation failed:', err);
});
