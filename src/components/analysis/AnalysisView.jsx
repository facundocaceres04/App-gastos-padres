import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useExpenses } from '../../context/ExpensesContext';
import { formatMoney } from '../../utils/formatters';
import {
  categoryBreakdown,
  changeVsPrevious,
  childBreakdown,
  monthlyAverage,
  monthlySeries,
  yearToDate,
} from '../../utils/analytics';
import CategoryDonut from './CategoryDonut';
import MonthlyBars from './MonthlyBars';
import ChildBars from './ChildBars';

function Stat({ label, value, foot }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
      <p className="truncate text-[11px] font-medium text-slate-500">{label}</p>
      <p className="font-display mt-1 text-[17px] leading-tight font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {foot && <div className="mt-0.5 truncate text-[10px] text-slate-500">{foot}</div>}
    </div>
  );
}

function Change({ pct }) {
  if (pct === null) return <span>Sin datos del mes anterior</span>;
  const rounded = Math.round(pct);
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-0.5 font-medium text-slate-600">
      <Icon size={12} />
      {rounded > 0 ? '+' : ''}
      {rounded}% vs mes anterior
    </span>
  );
}

/** Sección "Análisis": cifras clave + gráficos del mes seleccionado. */
export default function AnalysisView() {
  const { expenses, monthExpenses, current, key, label, profiles, childrenList, settlement } = useExpenses();

  const series = useMemo(() => monthlySeries(expenses, current.year, current.month, 6), [expenses, current]);
  const rawAvg = monthlyAverage(series);
  const avg = Math.round(rawAvg);
  const ytd = useMemo(() => yearToDate(expenses, current.year, current.month), [expenses, current]);
  const categories = useMemo(() => categoryBreakdown(monthExpenses), [monthExpenses]);
  const kids = useMemo(() => childBreakdown(monthExpenses, childrenList), [monthExpenses, childrenList]);

  return (
    <div className="space-y-3.5">
      <div>
        <h2 className="font-display text-[18px] font-bold tracking-tight text-slate-900">Análisis · {label}</h2>
        <p className="text-[12px] text-slate-500">Cambiá el mes desde el selector de arriba.</p>
      </div>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat label="Total del mes" value={formatMoney(settlement.total)} foot={<Change pct={changeVsPrevious(series)} />} />
        <Stat label="Promedio mensual" value={formatMoney(avg)} foot="Meses con gastos, últimos 6" />
        <Stat label="Proyección anual" value={formatMoney(Math.round(rawAvg * 12))} foot="Promedio mensual × 12" />
        <Stat label={`Acumulado ${current.year}`} value={formatMoney(ytd)} foot={`Enero a ${label.split(' ')[0].toLowerCase()}`} />
      </section>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <MonthlyBars series={series} profiles={profiles} selectedKey={key} />
        </div>
        <CategoryDonut data={categories} total={settlement.total} />
        <ChildBars data={kids} total={settlement.total} />
      </div>
    </div>
  );
}
