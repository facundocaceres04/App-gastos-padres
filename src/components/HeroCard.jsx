import { ArrowRight, Check, CheckCheck, Info, Landmark, Inbox, LockOpen } from 'lucide-react';
import { useExpenses } from '../context/ExpensesContext';
import { formatMoney, initial } from '../utils/formatters';
import { StatusBadge } from './Header';

/** Balance mensual: transferencia sugerida + barra proporcional de aportes. */
export default function HeroCard({ onShowBreakdown, onShowBank, onAskSettle }) {
  const { settlement: s, profiles, config, monthExpenses, nameOf } = useExpenses();
  const isEmpty = monthExpenses.length === 0;
  const sharePadre = s.total > 0 ? Math.round((s.paidFather / s.total) * 100) : s.pctFather;
  const shareMadre = 100 - sharePadre;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-1 text-[11px] font-semibold tracking-wider whitespace-nowrap text-brand-600 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
            Balance mensual
          </span>
          <StatusBadge settled={config.settled} by={config.settledBy ? nameOf(config.settledBy) : null} at={config.settledAt} />
        </span>
        <button
          onClick={onShowBreakdown}
          aria-label="Cómo se calculó"
          className="-mr-1 flex h-8 shrink-0 items-center gap-1 rounded-lg px-1 text-[12px] text-slate-500 transition-colors hover:text-slate-800"
        >
          <span className="hidden min-[400px]:inline">Cómo se calculó</span> <Info size={15} />
        </button>
      </div>

      {isEmpty ? (
        <div className="py-5 text-center">
          <Inbox size={28} className="mx-auto mb-1 text-slate-300" />
          <h3 className="text-[14px] font-semibold text-slate-800">Sin gastos este mes</h3>
          <p className="mt-0.5 text-[12px] text-slate-500">Cargá el primero para ver la liquidación.</p>
        </div>
      ) : s.isBalanced ? (
        <div className="py-4 text-center">
          <CheckCheck size={28} className="mx-auto mb-1 text-emerald-500" />
          <h3 className="text-[14px] font-semibold text-slate-800">Cuentas al día</h3>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Ambos cumplieron exactamente la proporción convenida ({s.pctFather}/{s.pctMother}).
          </p>
        </div>
      ) : (
        <div className="pt-1 pb-3">
          <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-surface p-3 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between min-[360px]:gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  s.debtor === 'madre' ? 'bg-madre/15 text-slate-900' : 'bg-padre/15 text-slate-900'
                }`}
              >
                {initial(profiles[s.debtor].name)}
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] leading-tight font-medium text-slate-500">
                  {config.settled ? 'Transferencia realizada' : 'Transferencia para saldar'}
                </span>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
                  <span className="truncate">{profiles[s.debtor].name}</span>
                  <ArrowRight size={14} className="shrink-0 text-slate-400" />
                  <span className="truncate">{profiles[s.creditor].name}</span>
                </div>
              </div>
            </div>
            <div className="shrink-0 min-[360px]:text-right">
              <div className="font-display text-[19px] font-bold tracking-tight text-slate-900 tabular-nums sm:text-[22px]">
                {formatMoney(s.amountToTransfer)}
              </div>
              <span className="text-[11px] font-medium text-slate-500">Saldo del mes</span>
            </div>
          </div>
        </div>
      )}

      {!isEmpty && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            onClick={onShowBank}
            disabled={s.isBalanced}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-[13px] font-semibold text-white shadow-xs transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-40"
          >
            <Landmark size={15} className="shrink-0" />
            <span className="whitespace-nowrap">
              <span className="hidden min-[400px]:inline">Copiar </span>CBU / Alias
            </span>
          </button>
          <button
            onClick={onAskSettle}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-700 transition-all hover:bg-slate-50"
          >
            {config.settled ? <LockOpen size={15} /> : <Check size={15} />}
            <span className="whitespace-nowrap">{config.settled ? 'Reabrir mes' : 'Marcar saldado'}</span>
          </button>
        </div>
      )}

      {!isEmpty && (
      <div className="space-y-1.5 border-t border-slate-100 pt-2">
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
          <span className="flex min-w-0 items-center gap-1 font-medium">
            <span className="h-2 w-2 shrink-0 rounded-full bg-padre" />
            <span className="truncate">
              {profiles.padre.name}: {formatMoney(s.paidFather)} ({sharePadre}%)
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-1 font-medium">
            <span className="truncate">
              {profiles.madre.name}: {formatMoney(s.paidMother)} ({shareMadre}%)
            </span>
            <span className="h-2 w-2 shrink-0 rounded-full bg-madre" />
          </span>
        </div>
        <div className={`relative flex h-2 w-full gap-[2px] rounded-full ${s.total > 0 ? '' : 'bg-slate-100'}`}>
          {s.total > 0 && (
            <>
              <div className="h-full rounded-l-full bg-padre transition-all duration-300" style={{ width: `${sharePadre}%` }} />
              <div className="h-full flex-1 rounded-r-full bg-madre transition-all duration-300" />
            </>
          )}
          {/* Marca de la cuota acordada: sobresale de la barra para no confundirse con la separación */}
          <div
            className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-slate-900 ring-2 ring-white"
            style={{ left: `${s.pctFather}%` }}
            title={`Cuota acordada: ${s.pctFather}% / ${s.pctMother}%`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Objetivo {s.pctFather}% ({formatMoney(s.quotaFather)})</span>
          <span>Objetivo {s.pctMother}% ({formatMoney(s.quotaMother)})</span>
        </div>
      </div>
      )}
    </section>
  );
}
