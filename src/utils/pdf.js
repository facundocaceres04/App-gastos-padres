import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { getCategory } from '../data/categories';
import { MONTHS, formatMoney } from './formatters';
import { countable } from './calculator';
import { NO_FILTER, filterExpenses, filterLabel, isFiltered } from './period';

// Paleta del PDF: tinta sobre blanco (pensado también para imprimir).
const INK = [26, 23, 20];
const MUTED = [112, 104, 92];
const RULE = [221, 214, 202];
const PADRE = [42, 120, 214];
const MADRE = [27, 175, 122];
const M = 16; // margen en mm

const monthName = (key) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
const shortDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const list = (xs) => (xs.length < 2 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`);

async function logoDataUrl() {
  try {
    const blob = await (await fetch('/logo-96.png')).blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null; // sin logo, el PDF sale igual
  }
}

/** Frases del balance, iguales a las de la pantalla. */
export function balanceLines(report, profiles) {
  const r = report;
  if (Math.abs(r.balancePadre) < 0.005) return ['En este período, cada uno puso lo que le tocaba según el reparto.'];
  const over = r.balancePadre > 0 ? 'padre' : 'madre';
  const lines = [`En este período, ${profiles[over].name} puso ${formatMoney(Math.abs(r.balancePadre))} de más.`];
  const saldados = r.mesesSaldados.map((k) => MONTHS[Number(k.slice(5, 7)) - 1].toLowerCase());
  const prefix = saldados.length ? `Ya se saldó ${list(saldados)}. ` : '';
  if (Math.abs(r.pendientePadre) < 0.005) lines.push(`${prefix}${saldados.length ? 'No queda nada pendiente.' : 'Quedan a mano.'}`);
  else {
    const [creditor, debtor] = r.pendientePadre > 0 ? ['padre', 'madre'] : ['madre', 'padre'];
    lines.push(
      `${prefix}${saldados.length ? 'Queda pendiente' : 'Para quedar a mano'}: ${profiles[debtor].name} le pasa ${formatMoney(
        Math.abs(r.pendientePadre),
      )} a ${profiles[creditor].name}.`,
    );
  }
  return lines;
}

/** Nombre de archivo: cuentas-claras_2026-05-01_a_2026-10-25.pdf */
const slug = (t) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const catLabel = (id) => getCategory(id).label;

/** cuentas-claras_2026-05-01_a_2026-10-25.pdf; con filtros: …_pago-laura_educacion.pdf */
export const pdfFileName = ({ report: r, filter = NO_FILTER, profiles }) => {
  const extra = isFiltered(filter) ? `_${filterLabel(filter, profiles, catLabel).split(' · ').map(slug).join('_')}` : '';
  return `cuentas-claras_${r.desde}_a_${r.hasta}${extra}.pdf`;
};

/**
 * Arma el PDF del período y lo devuelve como Blob.
 * @param {object} p
 * @param {ReturnType<import('./period').periodReport>} p.report
 * @param {{padre: {name: string}, madre: {name: string}}} p.profiles
 * @param {string} p.rangeText  "1 may – 25 oct"
 * @param {string[]} p.childrenList
 * @param {string} p.generatedBy nombre de quien lo genera
 */
export async function buildPeriodPdf({ report: r, profiles, rangeText, childrenList, generatedBy, filter = NO_FILTER, now = new Date() }) {
  // Los filtros de la lista solo cambian la tabla de gastos: el balance siempre es de todo el período.
  const filtered = isFiltered(filter);
  const fLabel = filterLabel(filter, profiles, catLabel);
  const rows = filterExpenses(r.gastos, filter);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setProperties({ title: `Cuentas Claras — ${rangeText}`, subject: 'Reporte de gastos compartidos', creator: 'Cuentas Claras' });

  // Encabezado
  const logo = await logoDataUrl();
  if (logo) doc.addImage(logo, 'PNG', M, M - 2, 11, 11);
  doc
    .setFont('helvetica', 'bold')
    .setFontSize(13)
    .setTextColor(...INK);
  doc.text('Cuentas Claras', M + (logo ? 14 : 0), M + 5.5);
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(9)
    .setTextColor(...MUTED);
  doc.text('Reporte de gastos compartidos', W - M, M + 5.5, { align: 'right' });

  let y = M + 22;
  doc
    .setFont('helvetica', 'bold')
    .setFontSize(22)
    .setTextColor(...INK);
  doc.text(rangeText, M, y);
  y += 7;
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(10)
    .setTextColor(...MUTED);
  const kids = childrenList.length ? `${list(childrenList)} · ` : '';
  doc.text(`${kids}${profiles.padre.name} y ${profiles.madre.name} · del ${shortDate(r.desde)} al ${shortDate(r.hasta)}`, M, y);
  if (filtered) {
    y += 5.5;
    doc.setTextColor(...INK).text(`Detalle filtrado: ${fLabel}. El resumen y el balance son de todo el período.`, M, y);
    y -= 0.5;
  }

  // Totales
  y += 12;
  const col = (W - 2 * M) / 3;
  const kpi = (x, label, value, sub) => {
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(9)
      .setTextColor(...MUTED)
      .text(label, x, y);
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(16)
      .setTextColor(...INK)
      .text(value, x, y + 7);
    if (sub)
      doc
        .setFont('helvetica', 'normal')
        .setFontSize(9)
        .setTextColor(...MUTED)
        .text(sub, x, y + 12);
  };
  const share = r.total > 0 ? (r.pagado.padre / r.total) * 100 : 50;
  kpi(M, 'Gastaron en el período', formatMoney(r.total), r.porMes.length > 1 ? `${formatMoney(r.promedioMensual)} por mes con gastos` : '');
  kpi(M + col, `Puso ${profiles.padre.name}`, formatMoney(r.pagado.padre), `${Math.round(share)}% del total`);
  kpi(M + 2 * col, `Puso ${profiles.madre.name}`, formatMoney(r.pagado.madre), `${Math.round(100 - share)}% del total`);

  // Barra de proporción con la marca de la parte acordada
  y += 19;
  const barW = W - 2 * M;
  const split = (barW * share) / 100;
  if (r.total > 0) {
    doc.setFillColor(...PADRE).roundedRect(M, y, Math.max(split - 0.4, 0.1), 2.6, 1.3, 1.3, 'F');
    doc.setFillColor(...MADRE).roundedRect(M + split + 0.4, y, Math.max(barW - split - 0.4, 0.1), 2.6, 1.3, 1.3, 'F');
  }
  const mark = M + (barW * r.acordadoPadre) / 100;
  doc.setFillColor(...INK).rect(mark - 0.45, y - 1.4, 0.9, 5.4, 'F');
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(8)
    .setTextColor(...MUTED);
  doc.text(`Marca: parte acordada (${Math.round(r.acordadoPadre)}% / ${Math.round(100 - r.acordadoPadre)}%)`, M, y + 8);

  // Balance
  y += 16;
  doc
    .setDrawColor(...RULE)
    .setLineWidth(0.2)
    .line(M, y - 4, W - M, y - 4);
  doc.setFontSize(11).setTextColor(...INK);
  for (const line of balanceLines(r, profiles)) {
    const wrapped = doc.splitTextToSize(line, W - 2 * M);
    doc.text(wrapped, M, y);
    y += wrapped.length * 5.2;
  }
  if (r.observados.count) {
    doc.setFontSize(9).setTextColor(...MUTED);
    doc.text(
      `${r.observados.count === 1 ? 'Un gasto observado' : `${r.observados.count} gastos observados`} (${formatMoney(r.observados.total)}) ${
        r.observados.count === 1 ? 'queda' : 'quedan'
      } afuera de estas cuentas hasta que se resuelvan.`,
      M,
      y,
    );
    y += 5;
  }

  const table = (title, head, body, opts = {}) => {
    y += 6;
    if (y > H - 50) {
      doc.addPage();
      y = M + 4;
    }
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(12)
      .setTextColor(...INK)
      .text(title, M, y);
    autoTable(doc, {
      startY: y + 3,
      head: [head],
      body,
      margin: { left: M, right: M, bottom: 18 },
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 } },
      headStyles: { textColor: MUTED, fontStyle: 'normal', lineWidth: { bottom: 0.3 }, lineColor: RULE },
      bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: RULE },
      ...opts,
    });
    y = doc.lastAutoTable.finalY;
  };
  const right = { halign: 'right' };
  // Encabezados y totales de columnas con montos, alineados a la derecha como los números.
  const R = (content) => ({ content, styles: { halign: 'right' } });

  table(
    'Mes a mes',
    ['Mes', R(profiles.padre.name), R(profiles.madre.name), R('Total'), 'Estado'],
    r.porMes.map((m) => [
      monthName(m.key),
      formatMoney(m.padre),
      formatMoney(m.madre),
      formatMoney(m.total),
      m.saldado ? 'Saldado' : m.total ? 'Pendiente' : '—',
    ]),
    {
      columnStyles: { 1: right, 2: right, 3: { halign: 'right', fontStyle: 'bold' } },
      foot: [['Total', R(formatMoney(r.pagado.padre)), R(formatMoney(r.pagado.madre)), R(formatMoney(r.total)), '']],
      // Los meses sin gastos van en gris: se ven, pero no compiten con los que importan.
      didParseCell: (d) => {
        if (d.section === 'body' && !r.porMes[d.row.index]?.total) d.cell.styles.textColor = MUTED;
      },
      footStyles: { fontStyle: 'bold', textColor: INK, lineWidth: { top: 0.3 }, lineColor: RULE },
      showFoot: 'lastPage',
    },
  );

  if (r.porCategoria.length) {
    table(
      'Por categoría',
      ['Categoría', R('Monto'), R('%')],
      r.porCategoria.map((c) => [getCategory(c.id).label, formatMoney(c.amount), `${Math.round(c.pct)}%`]),
      { columnStyles: { 1: right, 2: right } },
    );
  }
  if (r.porHijo.some((h) => h.name !== 'Sin asignar')) {
    table(
      'Para quién',
      ['Hijo/a', R('Monto'), R('%')],
      r.porHijo.map((h) => [h.name, formatMoney(h.amount), r.total ? `${Math.round((h.amount / r.total) * 100)}%` : '—']),
      { columnStyles: { 1: right, 2: right } },
    );
  }

  table(
    filtered ? `Gastos: ${fLabel} (${rows.length})` : `Gastos del período (${rows.length})`,
    ['Fecha', 'Concepto', 'Categoría', 'Hijo/a', 'Pagó', R('Monto')],
    rows.length
      ? rows.map((e) => [
          shortDate(e.date),
          e.reviewStatus === 'observado' ? `${e.concept} (observado, no cuenta)` : e.concept,
          getCategory(e.category).label,
          e.child || '—',
          profiles[e.paidBy].name,
          formatMoney(e.amount),
        ])
      : [[{ content: 'No hay gastos con este filtro en el período.', colSpan: 6, styles: { textColor: MUTED } }]],
    {
      columnStyles: { 0: { cellWidth: 22 }, 5: { halign: 'right', cellWidth: 26 } },
      // Con filtro, el total de lo filtrado (los observados no suman, como en la app).
      ...(filtered && rows.length
        ? {
            foot: [
              [{ content: 'Total del filtro', colSpan: 5 }, R(formatMoney(countable(rows).reduce((a, e) => a + Number(e.amount || 0), 0)))],
            ],
            footStyles: { fontStyle: 'bold', textColor: INK, lineWidth: { top: 0.3 }, lineColor: RULE },
            showFoot: 'lastPage',
          }
        : {}),
      didParseCell: (d) => {
        if (d.section !== 'body' || !rows.length) return;
        if (rows[d.row.index]?.reviewStatus === 'observado') d.cell.styles.textColor = MUTED;
        // Color de quién pagó, como en la app
        if (d.column.index === 4) d.cell.styles.textColor = rows[d.row.index].paidBy === 'padre' ? PADRE : MADRE;
      },
    },
  );

  // Pie en todas las páginas
  const pages = doc.getNumberOfPages();
  const stamp = `Generado el ${now.toLocaleDateString('es-AR')} a las ${now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}${
    generatedBy ? ` por ${generatedBy}` : ''
  }`;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(8)
      .setTextColor(...MUTED);
    doc.text(`Cuentas Claras · ${stamp}`, M, H - 9);
    doc.text(`Página ${i} de ${pages}`, W - M, H - 9, { align: 'right' });
  }

  return doc.output('blob');
}
