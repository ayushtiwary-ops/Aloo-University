/**
 * SplashScreen
 *
 * Full-viewport branded intro overlay. Runs a ~2.2s Motion One animation
 * sequence, then calls onComplete() so the caller can mount the main app
 * and remove this element.
 *
 * Prevents all interaction during playback via pointer-events:all on .splash.
 *
 * @param {{ onComplete: () => void }} options
 * @returns {HTMLElement}
 */
import { animate, stagger } from 'motion';

export function SplashScreen({ onComplete }) {
  const el = document.createElement('div');
  el.className = 'splash';
  el.setAttribute('role', 'presentation');
  el.setAttribute('aria-hidden', 'true');

  el.innerHTML = `
    <div class="splash__logo">🥔</div>
    <div class="splash__text">
      <p class="splash__title">ALOO University</p>
      <div class="splash__underline-wrap">
        <div class="splash__underline"></div>
      </div>
      <p class="splash__subtitle">Admission Compliance System</p>
    </div>
  `;

  const logo      = el.querySelector('.splash__logo');
  const title     = el.querySelector('.splash__title');
  const subtitle  = el.querySelector('.splash__subtitle');
  const underline = el.querySelector('.splash__underline');

  requestAnimationFrame(() => {
    // 1. Logo: scale bounce + amber glow pulse
    animate(
      logo,
      {
        transform:  ['scale(0.8)', 'scale(1.05)', 'scale(1)'],
        boxShadow:  [
          '0 0 0px 0px rgba(200,146,42,0)',
          '0 0 40px 12px rgba(200,146,42,0.45)',
          '0 0 16px 4px rgba(200,146,42,0.2)',
        ],
      },
      { duration: 0.7, easing: [0.22, 1, 0.36, 1] },
    );

    // 2. Title + subtitle: staggered fade-up
    animate(
      [title, subtitle],
      { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)'] },
      { duration: 0.5, delay: stagger(0.1, { start: 0.5 }), easing: [0.22, 1, 0.36, 1] },
    );

    // 3. Underline draw
    animate(
      underline,
      { transform: ['scaleX(0)', 'scaleX(1)'] },
      { duration: 0.6, delay: 0.55, easing: [0.22, 1, 0.36, 1] },
    );

    // 4. Fade out whole splash after 2.2s
    setTimeout(() => {
      animate(el, { opacity: [1, 0] }, { duration: 0.25, easing: 'ease-in' })
        .finished.then(onComplete);
    }, 2200);
  });

  return el;
}
