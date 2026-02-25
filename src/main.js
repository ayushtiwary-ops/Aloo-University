import { ConfigLoader } from './core/ConfigLoader.js';
import { App }          from './app.js';
import { RootLayout }   from './ui/layout/RootLayout.js';

/**
 * Entry point.
 *
 * Initialisation order:
 *   1. Load rules.json so ValidationEngine has rules before any field event fires.
 *   2. Compose the component tree.
 *   3. Mount to #app.
 */
async function init() {
  await ConfigLoader.load();
  document.getElementById('app').appendChild(RootLayout({ main: App() }));
}

init().catch((err) => {
  console.error('[AdmitGuard] Initialisation failed:', err);
});
