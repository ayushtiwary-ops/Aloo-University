import { ConfigLoader }      from './core/ConfigLoader.js';
import { FormStateManager }  from './state/FormStateManager.js';
import { ThemeService }      from './core/ThemeService.js';
import { AuthService }       from './core/AuthService.js';
import { App }               from './app.js';
import { RootLayout }        from './ui/layout/RootLayout.js';
import { SplashScreen }      from './ui/components/SplashScreen.js';
import { LoginView }         from './ui/components/LoginView.js';

/**
 * Entry point.
 *
 * Initialisation order:
 *   1. Apply saved / OS theme preference.
 *   2. Show branded SplashScreen (3 s).
 *   3. If not authenticated → show LoginView, wait for login.
 *   4. Mount the main app.
 *   5. Listen for 'auth:unauthorized' (token expiry or manual logout)
 *      to tear down the app and re-show LoginView without a page reload.
 */

async function mountLogin(appRoot) {
  appRoot.innerHTML = '';
  await new Promise((resolve) => {
    appRoot.appendChild(LoginView({ onSuccess: resolve }));
  });
  appRoot.innerHTML = '';
}

async function mountApp(appRoot) {
  await ConfigLoader.load();
  FormStateManager.reset();
  FormStateManager.validateAll();
  const role = AuthService.getRole();
  appRoot.appendChild(RootLayout({ main: App(), role }));
}

async function init() {
  ThemeService.init();

  const appRoot = document.getElementById('app');
  if (!appRoot) throw new Error('[AdmitGuard] #app root element not found in DOM.');

  // Splash screen (always shown on first load)
  await new Promise((resolve) => {
    appRoot.appendChild(SplashScreen({ onComplete: resolve }));
  });
  appRoot.innerHTML = '';

  // Auth gate
  if (!AuthService.isAuthenticated()) {
    await mountLogin(appRoot);
  }

  await mountApp(appRoot);

  // Handle token expiry or logout without a page reload
  document.addEventListener('auth:unauthorized', () => {
    (async () => {
      appRoot.innerHTML = '';
      await mountLogin(appRoot);
      await mountApp(appRoot);
    })().catch((err) => console.error('[AdmitGuard] Re-auth failed:', err));
  }, { once: false });
}

init().catch((err) => {
  console.error('[AdmitGuard] Initialisation failed:', err);
});
