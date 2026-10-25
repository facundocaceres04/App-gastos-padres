import { useEffect, useState } from 'react';

// Chrome/Android avisa una sola vez, al cargar, que la app se puede instalar: se guarda el
// evento acá (antes de que se monte cualquier pantalla) para usarlo cuando el usuario toque "Instalar".
let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

/** true si la app ya está abierta como app instalada (no en una pestaña del navegador). */
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** iPhone/iPad en Safari: no hay botón de instalar, se instala desde "Compartir". */
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * Cómo se puede instalar en este dispositivo:
 * 'prompt' (Android/Chrome, con botón), 'ios' (instrucciones), o null (ya instalada / no se puede).
 */
export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  let mode = null;
  if (!isStandalone()) mode = deferredPrompt ? 'prompt' : isIOS() ? 'ios' : null;

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
    return outcome === 'accepted';
  };

  return { mode, install };
}
