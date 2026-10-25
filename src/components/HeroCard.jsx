import { Check, Eye, Info, Lock } from 'lucide-react';
import { useExpenses } from '../context/ExpensesContext';
import { MONTHS, formatMoney } from '../utils/formatters';
import { round2 } from '../utils/calculator';

/** "$56.574,75" con los centavos más chicos: el número entero es lo que importa. */
export function Amount({ value, className = '' }) {
  const [whole, cents] = formatMoney(value).split(',');
  return (
    <span className={`font-display tabular-nums ${className}`}>
      {whole}
      {cents && <span className="text-[0.55em] align-[0.62em] ml-px">,{cents}</span>}
    </span>
  );
}

const monthName = (key) => MONTHS[Number(key.slice(5, 7)) - 1].toLowerCase();

/** Balance del mes: quién le pasa a quién, cuánto puso cada uno y lo que quedó pendiente. */
export default function HeroCard({ onShowBreakdown, onShowBank, onAskSettle, onChangeSplit, onCopySummary, onPreviewSummary }) {
  const { settlement: s, profiles, config, monthExpenses, nameOf, observed, previousPending: prev, goToMonth, label } = useExpenses();
  const observedTotal = observed.reduce((a, e) => a + e.amount, 0);
  // Total para quedar al día: este mes (si no está saldado) + lo que quedó de meses anteriores.
  const totalFather = round2(prev.balanceFather + (config.settled ? 0 : s.balanceFather));
  const isEmpty = monthExpenses.length === 0;
  const sharePadre = s.total > 0 ? (s.paidFather / s.total) * 100 : s.pctFather;
  const monthLower = label.split(' ')[0].toLowerCase();
  const settledBy = config.settledBy ? nameOf(config.settledBy) : null;

  const people = [
    { role: 'padre', paid: s.paidFather, quota: s.quotaFather, pct: s.pctFather, diff: s.balanceFather },
    { role: 'madre', paid: s.paidMother, quota: s.quotaMother, pct: s.pctMother, diff: s.balanceMother },
  ];

  return (
    <section aria-labelledby="balance-title" className="rounded-[20px] bg-white px-5 pt-4 pb-5 shadow-[0_1px_0_rgba(26,23,20,0.04),0_8px_24px_-12px_rgba(26,23,20,0.10)]">
      <h2 id="balance-title" className="sr-only">
        Balance mensual
      </h2>
      <div className="flex items-center justify-between gap-2 text-[13px] text-slate-500">
        {config.settled ? (
          <span className="flex items-center gap-1.5 text-sage-700">
            <Check size={15} strokeWidth={2.4} />
            Saldado{settledBy ? ` por ${settledBy}` : ''}
            {config.settledAt ? ` el ${config.settledAt.slice(8, 10)}/${config.settledAt.slice(5, 7)}` : ''}
          </span>
        ) : (
          <span>En curso</span>
        )}
        <button onClick={onShowBreakdown} className="-mr-1 flex items-center gap-1 rounded-md px-1 py-1 hover:text-slate-900" aria-label="Cómo se calculó">
          Cómo se calcula <Info size={14} />
        </button>
      </div>

      {isEmpty ? (
        <div className="pt-5 pb-1">
          <p className="font-display text-[26px] leading-tight font-medium tracking-[-0.015em] text-slate-900">Todavía no hay gastos en {monthLower}.</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">Cuando alguno cargue uno, acá van a ver quién le pasa a quién y cuánto.</p>
        </div>
      ) : s.isBalanced ? (
        <div className="pt-5 pb-1">
          <p className="font-display text-[30px] leading-tight font-medium tracking-[-0.015em] text-slate-900">
            {s.total > 0 ? 'Están a mano.' : 'Nada para compensar.'}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
            {s.total > 0
              ? `Cada uno puso justo lo que le tocaba según el reparto ${s.pctFather}/${s.pctMother}.`
              : 'Los gastos del mes están observados; cuando se resuelvan, aparece el saldo.'}
          </p>
        </div>
      ) : (
        <div className="pt-4">
          <p className="text-[16px] text-slate-700">
            {profiles[s.debtor].name} {config.settled ? 'le pasó' : 'le pasa'} a {profiles[s.creditor].name}
          </p>
          <Amount value={s.amountToTransfer} className="mt-0.5 block text-[46px] leading-[1.05] font-medium tracking-[-0.03em] text-slate-900" />
        </div>
      )}

      {!isEmpty && (
        <div className="mt-5 flex gap-2">
          {!s.isBalanced && !config.settled && (
            <button onClick={onShowBank} className="press h-12 flex-1 rounded-[12px] bg-slate-900 px-3 text-[15px] font-semibold text-white hover:bg-slate-800">
              <span className="min-[380px]:hidden">Ver CBU / Alias</span>
              <span className="hidden min-[380px]:inline">Ver alias de {profiles[s.creditor].name}</span>
            </button>
          )}
          <button
            onClick={onAskSettle}
            className={`press flex h-12 items-center justify-center gap-1.5 rounded-[12px] px-4 text-[15px] font-semibold ${
              s.isBalanced || config.settled ? 'flex-1' : ''
            } bg-slate-100 text-slate-800 hover:bg-slate-200`}
          >
            {config.settled && <Lock size={15} />}
            {config.settled ? 'Reabrir mes' : 'Marcar saldado'}
          </button>
        </div>
      )}

      {/* Lo que puso cada uno contra lo que le tocaba */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[13px] text-slate-500">
            Reparto {s.pctFather}/{s.pctMother}
            <button onClick={onChangeSplit} className="ml-2 font-medium text-slate-900 underline decoration-slate-300 underline-offset-[3px] hover:decoration-slate-900">
              {config.settled ? 'Ver' : 'Cambiar'}
            </button>
          </h3>
          <span className="text-[13px] text-slate-500">
            Total <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(s.total)}</span>
          </span>
        </div>

        {/* Barra: cuánto puso cada uno; la marca indica la parte acordada */}
        <div className="relative mt-3 flex h-2 w-full gap-[2px]">
          {s.total > 0 ? (
            <>
              <div className="h-full rounded-l-full bg-padre transition-[width] duration-300" style={{ width: `${sharePadre}%` }} />
              <div className="h-full flex-1 rounded-r-full bg-madre" />
            </>
          ) : (
            <div className="h-full w-full rounded-full bg-slate-100" />
          )}
          <div
            className="absolute -top-[5px] h-[18px] w-[3px] -translate-x-1/2 rounded-full bg-slate-900 ring-2 ring-white"
            style={{ left: `${s.pctFather}%` }}
            title={`Parte acordada: ${s.pctFather}% / ${s.pctMother}%`}
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
              <dd className="mt-0.5 text-[12px] leading-snug text-slate-500 tabular-nums">le toca {formatMoney(p.quota)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {(observed.length > 0 || !prev.isBalanced) && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-[14px] leading-relaxed text-slate-600">
          {observed.length > 0 && (
            <p className="flex gap-2.5">
              <Eye size={16} className="mt-[3px] shrink-0 text-amber-600" />
              <span>
                {observed.length === 1 ? 'Un gasto observado' : `${observed.length} gastos observados`} (
                <span className="tabular-nums">{formatMoney(observedTotal)}</span>) {observed.length === 1 ? 'queda' : 'quedan'} afuera hasta que lo
                resuelvan.
              </span>
            </p>
          )}
          {!prev.isBalanced && (
            <div className="flex gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
              <div>
                <p>
                  Quedó pendiente de{' '}
                  {prev.months.map((m, i) => (
                    <span key={m.key}>
                      {i > 0 && (i === prev.months.length - 1 ? ' y ' : ', ')}
                      <button
                        onClick={() => goToMonth(m.key)}
                        className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-[3px] hover:decoration-slate-900"
                      >
                        {monthName(m.key)}
                      </button>
                    </span>
                  ))}
                  : {profiles[prev.debtor].name} le debe <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(prev.amount)}</span> a{' '}
                  {profiles[prev.creditor].name}.
                </p>
                <p className="mt-1">
                  {Math.abs(totalFather) >= 0.005 ? (
                    <>
                      Para quedar al día, {profiles[totalFather > 0 ? 'madre' : 'padre'].name} le pasa{' '}
                      <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(Math.abs(totalFather))}</span> a{' '}
                      {profiles[totalFather > 0 ? 'padre' : 'madre'].name}.
                    </>
                  ) : (
                    'Sumando este mes, quedan a mano.'
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {!isEmpty && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3.5 text-[14px]">
          <button onClick={onPreviewSummary} className="text-slate-600 hover:text-slate-900">
            Resumen para WhatsApp
          </button>
          <button onClick={onCopySummary} className="press rounded-full bg-[#25d366]/12 px-3.5 py-1.5 font-semibold text-[#128c4b] hover:bg-[#25d366]/20 dark:text-[#5fd894]">
            Copiar
          </button>
        </div>
      )}
    </section>
  );
}
