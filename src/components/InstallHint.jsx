import { useState } from 'react';
import { ChevronRight, Share, SquarePlus, X } from 'lucide-react';
import { useInstall } from '../utils/install';

const HIDDEN_KEY = 'cuentas-claras:instalar-oculto';
const readHidden = () => {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Invita a instalar la app en el celular.
 * variant 'banner': tarjeta en el panel que se puede descartar. 'row': fila fija en Ajustes.
 */
export default function InstallHint({ variant = 'banner', onInstalled }) {
  const { mode, install } = useInstall();
  const [hidden, setHidden] = useState(readHidden);
  const [showIOS, setShowIOS] = useState(false);

  if (!mode || (variant === 'banner' && hidden)) return null;

  const hide = () => {
    try {
      localStorage.setItem(HIDDEN_KEY, '1');
    } catch {
      /* sin storage: vuelve a aparecer la próxima vez */
    }
    setHidden(true);
  };
  const onInstall = async () => {
    if (mode === 'ios') return setShowIOS((v) => !v);
    if (await install()) onInstalled?.('App instalada');
  };

  const iosSteps = (
    <ol className="mt-2 space-y-1.5 text-[14px] text-slate-600">
      <li className="flex items-center gap-1.5">
        1. Tocá <Share size={15} className="text-slate-900" aria-label="Compartir" /> <strong className="font-semibold text-slate-900">Compartir</strong> en
        Safari
      </li>
      <li className="flex items-center gap-1.5">
        2. Elegí <SquarePlus size={15} className="text-slate-900" /> <strong className="font-semibold text-slate-900">Agregar a inicio</strong>
      </li>
    </ol>
  );

  if (variant === 'row') {
    return (
      <div className="py-2">
        <button onClick={onInstall} className="flex w-full items-center justify-between gap-3 text-left">
          <span className="text-[15px] text-slate-900">Instalar la app en este celular</span>
          <span className="flex items-center gap-1 text-[14px] text-slate-500">
            {mode === 'ios' ? 'Cómo' : 'Instalar'}
            <ChevronRight size={16} className={`transition-transform ${showIOS ? 'rotate-90' : ''}`} />
          </span>
        </button>
        {showIOS && iosSteps}
      </div>
    );
  }

  return (
    <div className="relative rounded-[16px] border border-slate-200 px-4 pt-3.5 pb-4 lg:hidden">
      <button onClick={hide} className="absolute top-1.5 right-1.5 flex h-10 w-10 items-center justify-center rounded-full text-slate-500" aria-label="No mostrar más">
        <X size={17} />
      </button>
      <p className="pr-8 text-[15px] font-semibold text-slate-900">Instalala en tu celular</p>
      <p className="mt-0.5 pr-8 text-[14px] leading-relaxed text-slate-600">Queda en la pantalla de inicio y abre al toque, como cualquier app.</p>
      {mode === 'prompt' ? (
        <button onClick={onInstall} className="press mt-3 h-10 rounded-[10px] bg-slate-900 px-4 text-[14px] font-semibold text-white">
          Instalar
        </button>
      ) : (
        iosSteps
      )}
    </div>
  );
}
