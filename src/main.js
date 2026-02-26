import { ConfigLoader }      from './core/ConfigLoader.js';
import { FormStateManager }  from './state/FormStateManager.js';
import { ThemeService }      from './core/ThemeService.js';
import { App }               from './app.js';
import { RootLayout }        from './ui/layout/RootLayout.js';
import { SplashScreen }      from './ui/components/SplashScreen.js';

/**
 * Entry point.
 *
 * Initialisation order:
 *   1. Apply saved / OS theme preference (ThemeService.init).
 *   2. Show branded SplashScreen (3 s) — app initialises in parallel.
 *   3. Load rules.json so ValidationEngine has rules before any field event fires.
 *   4. Pre-validate all fields with their default values.
 *   5. Compose the component tree and mount to #app.
 */
async function init() {
  ThemeService.init();

  const appRoot = document.getElementById('app');

  // Show splash immediately; resolve when animation completes
  await new Promise((resolve) => {
    const splash = SplashScreen({ onComplete: resolve });
    appRoot.appendChild(splash);
  });

  // Splash complete — remove overlay and mount app
  appRoot.innerHTML = '';

  await ConfigLoader.load();
  FormStateManager.validateAll();
  appRoot.appendChild(RootLayout({ main: App() }));
}

init().catch((err) => {
  console.error('[AdmitGuard] Initialisation failed:', err);
});
