/** Tema claro / oscuro / del sistema, guardado en el dispositivo. */

const KEY = 'cuentas-claras:tema';
const media = window.matchMedia('(prefers-color-scheme: dark)');

/** @returns {'claro' | 'oscuro' | 'sistema'} */
export function getThemePref() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'claro' || v === 'oscuro') return v;
  } catch {
    /* sin storage: seguimos al sistema */
  }
  return 'sistema';
}

const isDark = (pref) => pref === 'oscuro' || (pref === 'sistema' && media.matches);

export function applyTheme(pref = getThemePref(), animate = false) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-transition');
    setTimeout(() => root.classList.remove('theme-transition'), 250);
  }
  const dark = isDark(pref);
  root.classList.toggle('dark', dark);
  window.dispatchEvent(new CustomEvent('cc-theme', { detail: { dark } }));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#15130F' : '#F6F3ED');
}

export function setThemePref(pref) {
  try {
    if (pref === 'sistema') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* ignorar */
  }
  applyTheme(pref, true);
}

/** Si la preferencia es "sistema", acompaña los cambios del sistema operativo. */
media.addEventListener('change', () => getThemePref() === 'sistema' && applyTheme());
