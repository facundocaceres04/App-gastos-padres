import { useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
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
    <ol className="mt-2 space-y-1.5 text-[12px] text-slate-600">
      <li className="flex items-center gap-1.5">
        1. Tocá <Share size={14} className="text-brand-600" aria-label="Compartir" /> <strong>Compartir</strong> en la barra de Safari
      </li>
      <li className="flex items-center gap-1.5">
        2. Elegí <SquarePlus size={14} className="text-brand-600" /> <strong>Agregar a inicio</strong>
      </li>
    </ol>
  );

  if (variant === 'row') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <button onClick={onInstall} className="flex w-full items-center justify-between text-left">
          <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
            <Download size={15} className="text-brand-600" /> Instalar la app en este celular
          </span>
          <span className="text-[12px] font-semibold text-brand-600">{mode === 'ios' ? 'Cómo' : 'Instalar'}</span>
        </button>
        {showIOS && iosSteps}
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-brand-100 bg-brand-50 p-3.5 pr-10 lg:hidden">
      <button onClick={hide} className="absolute top-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full text-slate-500" aria-label="No mostrar más">
        <X size={16} />
      </button>
      <p className="text-[13px] font-semibold text-slate-900">Instalala en tu celular</p>
      <p className="mt-0.5 text-[12px] text-slate-600">Se abre al instante desde la pantalla de inicio, como cualquier app.</p>
      {mode === 'prompt' ? (
        <button onClick={onInstall} className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[12px] font-semibold text-white">
          <Download size={14} /> Instalar
        </button>
      ) : (
        iosSteps
      )}
    </div>
  );
}
