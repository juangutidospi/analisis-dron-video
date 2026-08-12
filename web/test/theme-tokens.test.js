const THEMES = ['dark', 'light'];
const ROLES = ['--color-bg', '--color-surface', '--color-text', '--color-accent', '--color-divider'];
const SCALE = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-6', '--space-8',
  '--radius-sm', '--radius-md', '--radius-lg', '--font-body', '--font-heading',
  '--shadow-sm', '--shadow-md', '--shadow-lg', '--color-accent-300'];

/**
 * Cada tema resuelve todos los roles, y la escala existe en todos ellos.
 * Restaura el tema activo al terminar. Solo corre en navegador (usa getComputedStyle).
 * @returns {Array<{name: string, ok: boolean, detail: string}>}
 */
export function run() {
  const out = [];
  const root = document.documentElement;
  const before = root.getAttribute('data-theme');

  const setTheme = (id) => { if (id === 'dark') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', id); };

  THEMES.forEach((id) => {
    setTheme(id);
    const cs = getComputedStyle(root);
    const missing = [...ROLES, ...SCALE].filter((v) => !cs.getPropertyValue(v).trim());
    out.push({ name: `tema ${id}: todos los tokens resuelven`, ok: !missing.length, detail: missing.join(', ') });
  });

  setTheme('dark');
  const dark = getComputedStyle(root).getPropertyValue('--color-bg').trim();
  setTheme('light');
  const light = getComputedStyle(root).getPropertyValue('--color-bg').trim();
  out.push({ name: 'los temas cambian el fondo', ok: dark !== light, detail: `${dark} / ${light}` });

  if (before) root.setAttribute('data-theme', before); else root.removeAttribute('data-theme');
  return out;
}
