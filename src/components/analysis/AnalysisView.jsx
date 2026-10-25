import { useMemo } from 'react';
import { useExpenses } from '../../context/ExpensesContext';
import { MONTHS, compactMoneyLong, formatMoney } from '../../utils/formatters';
import {
  categoryBreakdown,
  changeVsPrevious,
  childBreakdown,
  monthlyAverage,
  monthlySeries,
  yearToDate,
} from '../../utils/analytics';
import { countable } from '../../utils/calculator';
import CategoryDonut from './CategoryDonut';
import MonthlyBars from './MonthlyBars';
import ChildBars from './ChildBars';

function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-[17px] font-semibold text-slate-900 tabular-nums">{value}</dd>
    </div>
  );
}

/** Sección "Análisis": el total del mes contado en una frase, y debajo los gráficos. */
export default function AnalysisView() {
  const { expenses, monthExpenses, current, key, label, profiles, childrenList, settlement } = useExpenses();

  // Igual que el balance: los gastos observados no cuentan hasta que se resuelvan.
  const valid = useMemo(() => countable(expenses), [expenses]);
  const series = useMemo(() => monthlySeries(valid, current.year, current.month, 6), [valid, current]);
  const rawAvg = monthlyAverage(series);
  const avg = Math.round(rawAvg);
  const ytd = useMemo(() => yearToDate(valid, current.year, current.month), [valid, current]);
  const counted = useMemo(() => countable(monthExpenses), [monthExpenses]);
  const categories = useMemo(() => categoryBreakdown(counted), [counted]);
  const kids = useMemo(() => childBreakdown(counted, childrenList), [counted, childrenList]);
  const change = changeVsPrevious(series);
  const rounded = change === null ? null : Math.round(change);
  const prevMonth = MONTHS[(current.month + 11) % 12].toLowerCase();
  const monthLower = label.split(' ')[0].toLowerCase();

  return (
    <div className="space-y-8">
      <section>
        <p className="text-[14px] text-slate-500">Gastaron en {monthLower}</p>
        <p className="font-display mt-0.5 text-[44px] leading-none font-medium tracking-[-0.03em] text-slate-900 tabular-nums">
          {formatMoney(settlement.total)}
        </p>
        <p className="mt-2 text-[15px] text-slate-600">
          {rounded === null
            ? `No hay gastos de ${prevMonth} para comparar.`
            : rounded === 0
              ? `Lo mismo que en ${prevMonth}.`
              : `${Math.abs(rounded)}% ${rounded > 0 ? 'más' : 'menos'} que en ${prevMonth}.`}
        </p>
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-200 pt-4">
          <Fact label="Promedio por mes" value={formatMoney(avg)} />
          <Fact label="Así, en un año" value={compactMoneyLong(rawAvg * 12)} />
          <Fact label={`En ${current.year}`} value={compactMoneyLong(ytd)} />
        </dl>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <MonthlyBars series={series} profiles={profiles} selectedKey={key} />
        </div>
        <CategoryDonut data={categories} total={settlement.total} />
        <ChildBars data={kids} total={settlement.total} />
      </div>
    </div>
  );
}
