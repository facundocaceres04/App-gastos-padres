import { Eye } from 'lucide-react';
import { MONTHS, formatMoney } from '../../utils/formatters';
import { Amount } from '../HeroCard';

const monthName = (key) => MONTHS[Number(key.slice(5, 7)) - 1].toLowerCase();
const list = (xs) => (xs.length < 2 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`);

/** Total del período, cuánto puso cada uno (barra 100% con la parte acordada) y el balance. */
export default function PeriodSummary({ report: r, profiles }) {
  const sharePadre = r.total > 0 ? (r.pagado.padre / r.total) * 100 : 50;
  const balanced = Math.abs(r.balancePadre) < 0.005;
  const pendingBalanced = Math.abs(r.pendientePadre) < 0.005;
  const who = (balance) => (balance > 0 ? ['padre', 'madre'] : ['madre', 'padre']); // [puso de más, le debe]
  const [over] = who(r.balancePadre);
  const [creditor, debtor] = who(r.pendientePadre);
  const people = [
    { role: 'padre', paid: r.pagado.padre, share: sharePadre },
    { role: 'madre', paid: r.pagado.madre, share: 100 - sharePadre },
  ];

  return (
    <section
      aria-labelledby="periodo-total"
      className="rounded-[20px] bg-white px-5 pt-4 pb-5 shadow-[0_1px_0_rgba(26,23,20,0.04),0_8px_24px_-12px_rgba(26,23,20,0.10)]"
    >
      <p id="periodo-total" className="text-[14px] text-slate-500">
        Gastaron en el período
      </p>
      <Amount value={r.total} className="mt-0.5 block text-[44px] leading-[1.05] font-medium tracking-[-0.03em] text-slate-900" />
      {r.promedioMensual > 0 && r.porMes.length > 1 && (
        <p className="mt-1 text-[14px] text-slate-500">
          En promedio, <span className="text-slate-700 tabular-nums">{formatMoney(r.promedioMensual)}</span> por mes con gastos.
        </p>
      )}

      {/* Proporción de cada uno; la marca indica la parte acordada */}
      <div className="relative mt-5 flex h-2 w-full gap-[2px]">
        <div className="h-full rounded-l-full bg-padre transition-[width] duration-300" style={{ width: `${sharePadre}%` }} />
        <div className="h-full flex-1 rounded-r-full bg-madre" />
        <div
          className="absolute -top-[5px] h-[18px] w-[3px] -translate-x-1/2 rounded-full bg-slate-900 ring-2 ring-white"
          style={{ left: `${r.acordadoPadre}%` }}
          title={`Parte acordada: ${Math.round(r.acordadoPadre)}% / ${Math.round(100 - r.acordadoPadre)}%`}
        />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-4">
        {people.map((p) => (
          <div key={p.role} className={p.role === 'madre' ? 'text-right' : ''}>
            <dt className={`flex items-center gap-1.5 text-[14px] text-slate-700 ${p.role === 'madre' ? 'justify-end' : ''}`}>
              <span className={`h-2 w-2 rounded-full ${p.role === 'padre' ? 'bg-padre' : 'bg-madre'}`} />
              {profiles[p.role].name}
            </dt>
            <dd className="font-display mt-0.5 text-[20px] leading-tight font-medium text-slate-900 tabular-nums">{formatMoney(p.paid)}</dd>
            <dd className="mt-0.5 text-[12px] text-slate-500 tabular-nums">{Math.round(p.share)}% del total</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-[15px] leading-relaxed text-slate-700">
        <p>
          {balanced ? (
            'En este período, cada uno puso lo que le tocaba según el reparto.'
          ) : (
            <>
              En este período, <strong className="font-semibold text-slate-900">{profiles[over].name}</strong> puso{' '}
              <strong className="font-semibold text-slate-900 tabular-nums">{formatMoney(Math.abs(r.balancePadre))}</strong> de más.
            </>
          )}
        </p>
        {!balanced && (
          <p className="text-slate-600">
            {r.mesesSaldados.length > 0 && <>Ya se saldó {list(r.mesesSaldados.map(monthName))}. </>}
            {pendingBalanced ? (
              r.mesesSaldados.length > 0 ? (
                'No queda nada pendiente.'
              ) : (
                'Quedan a mano.'
              )
            ) : (
              <>
                {r.mesesSaldados.length > 0 ? 'Queda pendiente' : 'Para quedar a mano'}: {profiles[debtor].name} le pasa{' '}
                <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(Math.abs(r.pendientePadre))}</span> a{' '}
                {profiles[creditor].name}.
              </>
            )}
          </p>
        )}
        {r.observados.count > 0 && (
          <p className="flex gap-2.5 pt-1 text-[14px] text-slate-600">
            <Eye size={16} className="mt-[3px] shrink-0 text-amber-600" />
            <span>
              {r.observados.count === 1 ? 'Un gasto observado' : `${r.observados.count} gastos observados`} (
              <span className="tabular-nums">{formatMoney(r.observados.total)}</span>) {r.observados.count === 1 ? 'queda' : 'quedan'}{' '}
              afuera de estas cuentas.
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
