import { useEffect, useMemo, useState } from 'react';
import { useExpenses } from '../../context/ExpensesContext';
import { DEFAULT_PRESET, NO_FILTER, PRESETS, filterLabel, periodReport, presetRange, rangeError, rangeLabel } from '../../utils/period';
import { getCategory } from '../../data/categories';
import PeriodPicker from './PeriodPicker';
import PeriodSummary from './PeriodSummary';
import PeriodExpenses from './PeriodExpenses';
import ExportPdf from './ExportPdf';
import MonthlyBars from '../analysis/MonthlyBars';
import CategoryDonut from '../analysis/CategoryDonut';
import ChildBars from '../analysis/ChildBars';

const STORE = 'cuentas-claras:periodo';
const isPreset = (id) => PRESETS.some((p) => p.id === id && id !== 'custom');

/**
 * El período vive en la dirección (#analisis?p=6m o #analisis?desde=…&hasta=…): sobrevive a recargar.
 * Si no viene, se usa el último elegido en este dispositivo.
 */
function readPeriod() {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const desde = q.get('desde');
  const hasta = q.get('hasta');
  if (desde && hasta && !rangeError(desde, hasta)) return { preset: 'custom', desde, hasta };
  let id = q.get('p');
  if (!isPreset(id)) {
    try {
      id = localStorage.getItem(STORE);
    } catch {
      id = null;
    }
  }
  if (!isPreset(id)) id = DEFAULT_PRESET;
  return { preset: id, ...presetRange(id) };
}

function writePeriod(v) {
  const qs = v.preset === 'custom' ? `desde=${v.desde}&hasta=${v.hasta}` : `p=${v.preset}`;
  window.history.replaceState(null, '', `#analisis?${qs}`);
  if (v.preset !== 'custom') {
    try {
      localStorage.setItem(STORE, v.preset);
    } catch {
      /* sin storage: no se recuerda la elección */
    }
  }
}

/** Análisis por período: presets o rango a medida, totales, balance, gráficos y la lista de gastos. */
export default function PeriodView({ onEdit }) {
  const { expenses, configFor, profiles, childrenList, myRole } = useExpenses();
  const [period, setPeriod] = useState(readPeriod);
  // Filtros de la lista (quién pagó, categoría): se reinician al cambiar de período y el PDF los respeta.
  const [listFilter, setListFilter] = useState(NO_FILTER);
  useEffect(() => setListFilter(NO_FILTER), [period.desde, period.hasta]);

  useEffect(() => writePeriod(period), [period]);

  const report = useMemo(() => periodReport(expenses, period, configFor, childrenList), [expenses, period, configFor, childrenList]);
  const empty = report.gastos.length === 0;
  const label = rangeLabel(period.desde, period.hasta);

  return (
    <div className="mx-auto max-w-xl space-y-6 lg:max-w-5xl">
      <div>
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <h2 className="font-display text-[28px] leading-none font-medium tracking-[-0.02em] text-slate-900">Análisis</h2>
          {!empty && (
            <ExportPdf
              getInput={() => ({
                report,
                profiles,
                childrenList,
                // En el PDF el período va siempre con año: el archivo puede leerse mucho después.
                rangeText: rangeLabel(period.desde, period.hasta, new Date(0)),
                generatedBy: profiles[myRole].name,
                filter: listFilter,
                filterNote: filterLabel(listFilter, profiles, (id) => getCategory(id).label),
              })}
            />
          )}
        </div>
        <PeriodPicker value={period} onChange={setPeriod} onPreset={(id) => setPeriod({ preset: id, ...presetRange(id) })} />
      </div>

      {empty ? (
        <div className="rounded-[20px] border border-dashed border-slate-300 px-5 py-10 text-center">
          <p className="font-display text-[22px] leading-snug font-medium text-slate-900">
            {period.desde === period.hasta ? `No hay gastos el ${label}.` : `No hay gastos entre el ${label.replace(' – ', ' y el ')}.`}
          </p>
          {period.preset !== '12m' && (
            <button
              onClick={() => setPeriod({ preset: '12m', ...presetRange('12m') })}
              className="mt-3 text-[15px] font-medium text-slate-900 underline decoration-slate-300 underline-offset-[3px]"
            >
              Ver los últimos 12 meses
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8 lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:space-y-0">
          <div className="space-y-8 lg:sticky lg:top-28">
            <PeriodSummary report={report} profiles={profiles} />
            {report.porMes.length > 1 && (
              <MonthlyBars
                series={report.porMes}
                profiles={profiles}
                title="Mes a mes"
                subtitle="Cuánto puso cada uno en cada mes del período"
              />
            )}
          </div>
          <div className="space-y-8">
            <CategoryDonut data={report.porCategoria} total={report.total} subtitle="En qué se fue la plata en el período" />
            {(childrenList.length > 1 || report.porHijo.some((h) => h.name !== 'Sin asignar')) && (
              <ChildBars data={report.porHijo} total={report.total} subtitle="Lo que se gastó en cada uno en el período" />
            )}
            <PeriodExpenses
              key={`${period.desde}-${period.hasta}`}
              expenses={report.gastos}
              profiles={profiles}
              onEdit={onEdit}
              filter={listFilter}
              onFilterChange={setListFilter}
            />
          </div>
        </div>
      )}
    </div>
  );
}
