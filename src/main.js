import { ConfigLoader }      from './core/ConfigLoader.js';
import { FormStateManager }  from './state/FormStateManager.js';
import { App }               from './app.js';
import { RootLayout }        from './ui/layout/RootLayout.js';

/**
 * Entry point.
 *
 * Initialisation order:
 *   1. Load rules.json so ValidationEngine has rules before any field event fires.
 *   2. Pre-validate all fields with their default values so the UI starts in a
 *      consistent state (fields with defaults pass; required-but-empty fields fail).
 *   3. Compose the component tree.
 *   4. Mount to #app.
 */
async function init() {
  await ConfigLoader.load();
  FormStateManager.validateAll();
  document.getElementById('app').appendChild(RootLayout({ main: App() }));
}

init().catch((err) => {
  console.error('[AdmitGuard] Initialisation failed:', err);
});
