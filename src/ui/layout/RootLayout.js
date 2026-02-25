import { Header } from '../components/Header.js';

/**
 * RootLayout
 *
 * Page shell — mounts header, main content area, and footer.
 *
 * @param {{ main: HTMLElement }} props
 * @returns {HTMLElement}
 */
export function RootLayout({ main }) {
  const root = document.createElement('div');
  root.className = 'root-layout';

  root.appendChild(Header());

  const container = document.createElement('main');
  container.className = 'main-container';
  container.setAttribute('role', 'main');
  container.appendChild(main);
  root.appendChild(container);

  const footer = document.createElement('footer');
  footer.className = 'page-footer';
  footer.setAttribute('role', 'contentinfo');
  footer.textContent = `© ${new Date().getFullYear()} ALOO University — Internal Use Only`;
  root.appendChild(footer);

  return root;
}
