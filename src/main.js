import { ConfigLoader }       from './core/ConfigLoader.js';
import { FormStateManager }   from './state/FormStateManager.js';
import { ThemeService }       from './core/ThemeService.js';
import { AuthService }        from './core/AuthService.js';
import { SplashScreen }       from './ui/components/SplashScreen.js';
import { AuthLanding }        from './ui/components/AuthLanding.js';
import { CandidateApp }       from './ui/components/CandidateApp.js';
import { AdminApp }           from './ui/layout/AdminApp.js';
import { CounselorApp }       from './ui/layout/CounselorApp.js';

/**
 * Entry point.
 *
 * Boot sequence:
 *   1. Apply saved / OS theme.
 *   2. Show branded SplashScreen.
 *   3. If not authenticated → AuthLanding (Sign Up / Sign In / Staff Login).
 *   4. Route by role:
 *        candidate → CandidateApp
 *        admin     → RootLayout (admin tabs)
 *        user      → RootLayout (counselor tabs, no dashboard)
 *   5. Listen for 'auth:unauthorized' to re-run steps 3–4 without reload.
 */

async function _showSplash(appRoot) {
  await new Promise((resolve) => {
    appRoot.appendChild(SplashScreen({ onComplete: resolve }));
  });
  appRoot.innerHTML = '';
}

async function _mountAuthLanding(appRoot) {
  appRoot.innerHTML = '';
  await new Promise((resolve) => {
    appRoot.appendChild(AuthLanding({ onSuccess: resolve }));
  });
  appRoot.innerHTML = '';
}

async function _mountAdminApp(appRoot) {
  await ConfigLoader.load();
  FormStateManager.reset();
  FormStateManager.validateAll();
  appRoot.appendChild(AdminApp());
}

async function _mountCounselorApp(appRoot) {
  await ConfigLoader.load();
  FormStateManager.reset();
  FormStateManager.validateAll();
  appRoot.appendChild(CounselorApp());
}

function _mountCandidateApp(appRoot) {
  appRoot.innerHTML = '';
  appRoot.appendChild(CandidateApp());
}

async function _routeByRole(appRoot) {
  const role = AuthService.getRole();
  if (role === 'candidate') {
    _mountCandidateApp(appRoot);
  } else if (role === 'admin') {
    await _mountAdminApp(appRoot);
  } else {
    await _mountCounselorApp(appRoot);
  }
}

async function init() {
  ThemeService.init();

  const appRoot = document.getElementById('app');
  if (!appRoot) throw new Error('[AdmitGuard] #app root element not found in DOM.');

  await _showSplash(appRoot);

  if (!AuthService.isAuthenticated()) {
    await _mountAuthLanding(appRoot);
  }

  await _routeByRole(appRoot);

  document.addEventListener('auth:unauthorized', () => {
    (async () => {
      appRoot.innerHTML = '';
      await _mountAuthLanding(appRoot);
      await _routeByRole(appRoot);
    })().catch((err) => console.error('[AdmitGuard] Re-auth failed:', err));
  }, { once: false });
}

init().catch((err) => {
  console.error('[AdmitGuard] Initialisation failed:', err);
});
