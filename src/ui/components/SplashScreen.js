/**
 * SplashScreen
 *
 * Full-viewport branded intro overlay. Runs a 3-second Anime.js timeline,
 * then calls onComplete() so the caller can mount the main app and remove
 * this element.
 *
 * Prevents all interaction during playback via pointer-events:all on .splash.
 *
 * @param {{ onComplete: () => void }} options
 * @returns {HTMLElement}
 */
import anime from 'animejs/lib/anime.es.js';

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
  const text      = el.querySelector('.splash__text');
  const underline = el.querySelector('.splash__underline');

  // Run after the element is in the DOM (next microtask)
  requestAnimationFrame(() => {
    const tl = anime.timeline({ easing: 'easeOutCubic', autoplay: true });

    // 0–800ms: logo fades in + scales 0.95 → 1
    tl.add({
      targets:  logo,
      opacity:  [0, 1],
      scale:    [0.95, 1],
      duration: 800,
    });

    // 800–2000ms: text fades in + underline draws left→right
    tl.add({
      targets:  text,
      opacity:  [0, 1],
      duration: 300,
    }, 700);

    tl.add({
      targets:   underline,
      scaleX:    [0, 1],
      duration:  900,
      easing:    'easeInOutQuart',
    }, 900);

    // 2000–2800ms: glow pulse on logo
    tl.add({
      targets:   logo,
      boxShadow: [
        '0 0 0px 0px rgba(200,146,42,0)',
        '0 0 32px 12px rgba(200,146,42,0.45)',
        '0 0 0px 0px rgba(200,146,42,0)',
      ],
      duration:  800,
      easing:    'easeInOutSine',
    }, 2000);

    // 2800–3000ms: fade out entire overlay
    tl.add({
      targets:  el,
      opacity:  [1, 0],
      duration: 200,
      easing:   'easeInQuad',
      complete: onComplete,
    }, 2800);
  });

  return el;
}
