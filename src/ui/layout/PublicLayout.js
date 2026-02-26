import { Header }      from '../components/Header.js';
import { App }         from '../../app.js';
import { ConfigLoader }    from '../../core/ConfigLoader.js';
import { FormStateManager } from '../../state/FormStateManager.js';

/**
 * PublicLayout
 *
 * Shown to unauthenticated visitors.
 * Renders the public admission form with a header that has a "Staff Login" link.
 *
 * @param {{ onStaffLogin: () => void }} props
 * @returns {HTMLElement}
 */
export async function PublicLayout({ onStaffLogin }) {
  await ConfigLoader.load();
  FormStateManager.reset();
  FormStateManager.validateAll();

  const root = document.createElement('div');
  root.className = 'root-layout';

  // Header — no logout (unauthenticated), but pass staffLogin callback
  root.appendChild(Header({ onStaffLogin }));

  // Main
  const container = document.createElement('main');
  container.className = 'main-container';
  container.setAttribute('role', 'main');

  const formView = document.createElement('div');
  formView.className = 'main-view';
  formView.appendChild(App());
  container.appendChild(formView);
  root.appendChild(container);

  // Footer
  const footer = document.createElement('footer');
  footer.className = 'page-footer';
  footer.setAttribute('role', 'contentinfo');
  footer.textContent = `© ${new Date().getFullYear()} ALOO University`;
  root.appendChild(footer);

  return root;
}
