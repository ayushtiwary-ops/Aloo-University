import { ThemeService }      from './core/ThemeService.js';
import { AuthService }       from './core/AuthService.js';
import { SplashScreen }      from './ui/components/SplashScreen.js';
import { StaffLoginModal }   from './ui/components/StaffLoginModal.js';
import { PublicLayout }      from './ui/layout/PublicLayout.js';
import { StaffDashboard }    from './ui/layout/StaffDashboard.js';

/**
 * Entry point — Boot sequence:
 *   1. Apply saved theme (no flash).
 *   2. Show 2-second splash with 🥔.
 *   3. Mount public admission form.
 *   4. "Staff Login" header button → modal overlay (page stays mounted).
 *   5. Successful login → replace with StaffDashboard.
 *   6. auth:unauthorized (logout / token expiry) → back to public form.
 */

async function _showSplash(appRoot) {
  await new Promise((resolve) => {
    appRoot.appendChild(SplashScreen({ onComplete: resolve }));
  });
  appRoot.innerHTML = '';
}

/**
 * Mount the staff login modal as a body overlay.
 * The public form remains in the DOM beneath it.
 * On success → call onSuccess(); on dismiss → remove modal only.
 */
function _openLoginModal(appRoot, onSuccess) {
  const modal = StaffLoginModal({
    onSuccess: () => {
      modal.remove();
      onSuccess();
    },
    onClose: () => modal.remove(),
  });
  document.body.appendChild(modal);
}

async function _routeApp(appRoot) {
  appRoot.innerHTML = '';

  if (!AuthService.isAuthenticated()) {
    const layout = await PublicLayout({
      onStaffLogin: () => _openLoginModal(appRoot, () => _routeApp(appRoot)),
    });
    appRoot.appendChild(layout);
    return;
  }

  appRoot.appendChild(StaffDashboard());
}

async function init() {
  ThemeService.init();

  const appRoot = document.getElementById('app');
  if (!appRoot) throw new Error('[AdmitGuard] #app root element not found.');

  await _showSplash(appRoot);
  await _routeApp(appRoot);

  // Token expiry or logout → return to public form
  document.addEventListener('auth:unauthorized', () => {
    _routeApp(appRoot).catch((err) =>
      console.error('[AdmitGuard] Re-route failed:', err));
  }, { once: false });
}

init().catch((err) => console.error('[AdmitGuard] Init failed:', err));
