import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

/*
 * Deslizar una fila hacia la izquierda para borrarla (solo con el dedo; con mouse están los botones).
 * El gesto está adaptado de SwipeRow de React Bits (https://github.com/DavidHDev/react-bits,
 * © 2026 David Haz, MIT + Commons Clause): margen antes de arrastrar, resistencia elástica,
 * "flick" por velocidad y borrar de una al deslizar hasta el fondo. Reescrito sin librerías y
 * para filas de alto variable.
 */

const HYST = 10; // px antes de decidir si el gesto es horizontal
const ACTION = 92; // ancho del botón "Borrar" cuando queda abierto
const FLICK = 0.45; // px/ms: un deslizamiento rápido abre o cierra aunque sea corto
const COMMIT = 0.6; // fracción del ancho: más allá, se borra al soltar
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// Más allá del límite el dedo "tira" cada vez menos, como una goma.
const rubber = (over, dim) => (over * dim * 0.55) / (dim + 0.55 * Math.abs(over));

let openRowApi = null; // solo una fila abierta a la vez: la que está abierta se cierra al abrir otra

export default function SwipeToDelete({ children, onDelete, disabled = false, label = 'Borrar' }) {
  const root = useRef(null);
  const surface = useRef(null);
  const drag = useRef(null);
  const offset = useRef(0);
  const swallowClick = useRef(false);
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  // El fondo con "Borrar" solo existe mientras se desliza o la fila está abierta:
  // en reposo no hay nada detrás (si no, se asoma por las esquinas redondeadas).
  const [revealed, setRevealed] = useState(false);
  const hideTimer = useRef(null);
  const api = useRef({});

  const width = () => root.current?.offsetWidth || 360;
  const place = (x, animate) => {
    offset.current = x;
    const el = surface.current;
    if (!el) return;
    el.style.transition = animate && !reducedMotion() ? `transform 300ms ${EASE}` : 'none';
    el.style.transform = x ? `translateX(${x}px)` : '';
  };
  const close = () => {
    place(0, true);
    setOpen(false);
    setArmed(false);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setRevealed(false), 320);
    if (openRowApi === api.current) openRowApi = null;
  };
  api.current.close = close;
  const openRow = () => {
    if (openRowApi && openRowApi !== api.current) openRowApi.close();
    openRowApi = api.current;
    clearTimeout(hideTimer.current);
    setRevealed(true);
    place(-ACTION, true);
    setOpen(true);
  };

  // Se va hacia la izquierda, la fila se pliega y recién ahí se borra (con "Deshacer" en el aviso).
  const commit = () => {
    if (openRowApi === api.current) openRowApi = null;
    const el = root.current;
    const finish = () => onDelete();
    if (!el || reducedMotion()) return finish();
    place(-width(), true);
    const h = el.offsetHeight;
    setTimeout(() => {
      el.animate(
        [
          { height: `${h}px`, opacity: 1 },
          { height: '0px', opacity: 0 },
        ],
        { duration: 180, easing: 'ease-out', fill: 'forwards' },
      ).onfinish = finish;
    }, 180);
  };

  // Tocar fuera de una fila abierta la cierra.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !root.current?.contains(e.target) && close();
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    const mine = api.current;
    return () => {
      if (openRowApi === mine) openRowApi = null;
    };
  }, []);

  const down = (e) => {
    if (disabled || e.pointerType === 'mouse' || drag.current) return;
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, start: offset.current, grabbed: false, hist: [] };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.grabbed) {
      if (Math.abs(dy) > HYST && Math.abs(dy) > Math.abs(dx)) return (drag.current = null); // está scrolleando
      if (Math.abs(dx) < HYST) return;
      d.grabbed = true;
      clearTimeout(hideTimer.current);
      setRevealed(true);
      d.x0 += Math.sign(dx) * HYST;
      surface.current?.setPointerCapture?.(e.pointerId);
    }
    const W = width();
    const raw = d.start + (e.clientX - d.x0);
    const x = raw > 0 ? rubber(raw, W) : -raw > W ? -W - rubber(-raw - W, W) : raw;
    place(x, false);
    d.hist.push([e.timeStamp, x]);
    if (d.hist.length > 5) d.hist.shift();
    const nowArmed = -x >= W * COMMIT;
    if (nowArmed !== armed) {
      setArmed(nowArmed);
      if (nowArmed) navigator.vibrate?.(8);
    }
  };
  const up = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.grabbed) {
      // Un toque sobre una fila abierta la cierra en vez de abrir el gasto.
      if (open) {
        swallowClick.current = true;
        setTimeout(() => (swallowClick.current = false), 400);
        close();
      }
      return;
    }
    // El arrastre no cuenta como toque (si el navegador no manda el clic, el bloqueo vence solo).
    swallowClick.current = true;
    setTimeout(() => (swallowClick.current = false), 400);
    const [a, b] = [d.hist[0], d.hist[d.hist.length - 1]];
    const v = a && b && b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) : 0;
    if (-offset.current >= width() * COMMIT) return commit();
    const shouldOpen = v < -FLICK ? true : v > FLICK ? false : -offset.current > ACTION / 2;
    setArmed(false);
    if (shouldOpen) openRow();
    else close();
  };
  const cancel = (e) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    if (open) openRow();
    else close();
  };

  return (
    <div ref={root} className="relative overflow-hidden rounded-[10px]">
      {/* Detrás de la fila: aparece al deslizar */}
      <div
        className={`absolute inset-0 flex items-center justify-end bg-slate-900 text-white transition-[padding] duration-200 ${armed ? 'pr-6' : 'pr-0'} ${
          revealed || open ? '' : 'invisible'
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={commit}
          className="flex h-full flex-col items-center justify-center gap-1 text-[13px] font-semibold"
          style={{ width: ACTION }}
        >
          <Trash2 size={18} className={`transition-transform duration-200 ${armed ? 'scale-110' : ''}`} />
          {label}
        </button>
      </div>
      <div
        ref={surface}
        className="relative touch-pan-y bg-surface"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onClickCapture={(e) => {
          if (!swallowClick.current) return;
          swallowClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </div>
    </div>
  );
}
