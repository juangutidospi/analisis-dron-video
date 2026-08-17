// Revela elementos al entrar en el viewport (scroll-reveal) con IntersectionObserver.
// Progresivo: la clase inicial se pone desde JS, así que sin JS el contenido se ve igual.
// Respeta prefers-reduced-motion y navegadores sin IntersectionObserver (revela al instante).

/**
 * Observa `els`, les añade la clase `hidden` al momento y la clase `in` cuando
 * entran en pantalla (con un escalonado por orden dentro de cada tanda).
 * @param {Element[]} els Elementos a revelar (se les añade la clase `reveal`).
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.12] Fracción visible para disparar.
 * @param {number} [opts.stagger=70] Retardo en ms entre elementos de una misma tanda.
 * @param {string} [opts.cls='reveal'] Clase de estado inicial.
 * @param {number} [opts.fallbackMs=4000] Red de seguridad: si el observer no
 *   dispara (p.ej. pestaña en segundo plano), pasado este tiempo revela lo que
 *   ya esté en pantalla para no dejar contenido oculto.
 * @returns {() => void} Función de limpieza (desconecta el observer).
 */
export function reveal(els, { threshold = 0.12, stagger = 70, cls = 'reveal', fallbackMs = 4000 } = {}) {
  els.forEach((el) => el.classList.add(cls));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return () => {};
  }
  const io = new IntersectionObserver((entries, obs) => {
    // escalona solo los que entran juntos en una misma notificación
    entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      .forEach((e, i) => {
        const el = e.target;
        setTimeout(() => el.classList.add('in'), i * stagger);
        obs.unobserve(el);
      });
  }, { threshold, rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
  // Red de seguridad: revela lo que ya debería verse aunque el observer no dispare.
  const safety = setTimeout(() => {
    els.forEach((el) => {
      if (!el.classList.contains('in') && el.getBoundingClientRect().top < innerHeight) {
        el.classList.add('in');
        io.unobserve(el);
      }
    });
  }, fallbackMs);
  return () => { clearTimeout(safety); io.disconnect(); };
}
