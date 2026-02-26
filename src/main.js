import { ConfigLoader }     from './core/ConfigLoader.js';
import { FormStateManager } from './state/FormStateManager.js';
import { ThemeService }     from './core/ThemeService.js';
import { AuthService }      from './core/AuthService.js';
import { SplashScreen }     from './ui/components/SplashScreen.js';
import { LoginView }        from './ui/components/LoginView.js';
import { PublicLayout }     from './ui/layout/PublicLayout.js';
import { AdminApp }         from './ui/layout/AdminApp.js';
import { CounselorApp }     from './ui/layout/CounselorApp.js';

/**
 * Entry point.
 *
 * Boot sequence:
 *   1. Apply theme.
 *   2. Show splash.
 *   3. Route by auth state:
 *        unauthenticated → PublicLayout (admission form + "Staff Login" in header)
 *        admin           → AdminApp
 *        user            → CounselorApp
 *   4. Staff login triggered from PublicLayout header → shows LoginView overlay → re-route.
 *   5. auth:unauthorized → back to PublicLayout.
 */

async function _showSplash(appRoot) {
  await new Promise((resolve) => {
    appRoot.appendChild(SplashScreen({ onComplete: resolve }));
  });
  appRoot.innerHTML = '';
}

async function _routeApp(appRoot) {
  appRoot.innerHTML = '';

  if (!AuthService.isAuthenticated()) {
    const layout = await PublicLayout({
      onStaffLogin: () => _handleStaffLogin(appRoot),
    });
    appRoot.appendChild(layout);
    return;
  }

  const role = AuthService.getRole();
  if (role === 'admin') {
    await ConfigLoader.load();
    FormStateManager.reset();
    FormStateManager.validateAll();
    appRoot.appendChild(AdminApp());
  } else {
    await ConfigLoader.load();
    FormStateManager.reset();
    FormStateManager.validateAll();
    appRoot.appendChild(CounselorApp());
  }
}

async function _handleStaffLogin(appRoot) {
  appRoot.innerHTML = '';
  await new Promise((resolve) => {
    appRoot.appendChild(LoginView({ onSuccess: resolve }));
  });
  appRoot.innerHTML = '';
  await _routeApp(appRoot);
}

async function init() {
  ThemeService.init();

  const appRoot = document.getElementById('app');
  if (!appRoot) throw new Error('[AdmitGuard] #app root element not found.');

  await _showSplash(appRoot);
  await _routeApp(appRoot);

  // Token expiry or logout → back to public form
  document.addEventListener('auth:unauthorized', () => {
    _routeApp(appRoot).catch((err) =>
      console.error('[AdmitGuard] Re-route failed:', err));
  }, { once: false });
}

init().catch((err) => {
  console.error('[AdmitGuard] Init failed:', err);
});
