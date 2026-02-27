/**
 * SplashScreen
 *
 * Full-viewport branded intro overlay. Runs a 3 000 ms Motion One animation
 * sequence, then calls onComplete() so the caller can mount the main app
 * and remove this element.
 *
 * Timeline:
 *   0 – 800 ms   logo fade-in + scale bounce
 *   800 – 2 000 ms  title & subtitle staggered slide-up + underline draw
 *   2 000 – 2 600 ms  logo amber glow pulse
 *   2 600 – 3 000 ms  whole overlay fade-out → onComplete()
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
    // 1. Logo: fade-in + scale bounce (0 – 800 ms)
    animate(
      logo,
      { opacity: [0, 1], transform: ['scale(0.8)', 'scale(1.05)', 'scale(1)'] },
      { duration: 0.8, easing: [0.22, 1, 0.36, 1] },
    );

    // 2. Title + subtitle: staggered slide-up (800 – 2 000 ms)
    animate(
      [title, subtitle],
      { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)'] },
      { duration: 0.6, delay: stagger(0.15, { start: 0.8 }), easing: [0.22, 1, 0.36, 1] },
    );

    // 3. Underline draw (starts with title at ~900 ms)
    animate(
      underline,
      { transform: ['scaleX(0)', 'scaleX(1)'] },
      { duration: 0.7, delay: 0.9, easing: [0.22, 1, 0.36, 1] },
    );

    // 4. Amber glow pulse on logo (2 000 – 2 600 ms)
    animate(
      logo,
      {
        boxShadow: [
          '0 0 0px 0px rgba(200,146,42,0)',
          '0 0 60px 20px rgba(200,146,42,0.55)',
          '0 0 0px 0px rgba(200,146,42,0)',
        ],
      },
      { duration: 0.6, delay: 2.0, easing: 'ease-in-out' },
    );

    // 5. Overlay fade-out (2 600 – 3 000 ms)
    setTimeout(() => {
      animate(el, { opacity: [1, 0] }, { duration: 0.4, easing: 'ease-in' })
        .finished.then(onComplete);
    }, 2600);
  });

  return el;
}
