/**
 * FormCard
 *
 * Titled section card wrapping a group of related form fields.
 * Presentation only — receives pre-built DOM nodes as children.
 *
 * @param {{
 *   sectionLabel: string,
 *   title:        string,
 *   children:     HTMLElement[]
 * }} props
 * @returns {HTMLElement}
 */
export function FormCard({ sectionLabel, title, children }) {
  const card = document.createElement('section');
  card.className = 'form-card';
  card.setAttribute('aria-label', title);

  const header = document.createElement('div');
  header.className = 'form-card__header';
  header.innerHTML = `
    <p class="form-card__section-label">${sectionLabel}</p>
    <h2 class="form-card__title">${title}</h2>
  `;

  const body = document.createElement('div');
  body.className = 'form-card__body';
  children.forEach((child) => body.appendChild(child));

  card.appendChild(header);
  card.appendChild(body);

  return card;
}
