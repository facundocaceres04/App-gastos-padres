# Cuentas Claras

Gestión y liquidación mensual de gastos compartidos entre progenitores.

```bash
npm install
npm run dev     # http://localhost:5173
npm run build
```

## Estructura

```
src/
├── App.jsx                     # Layout, modales y toasts
├── main.jsx
├── index.css                   # Tailwind v4 + animaciones
├── context/ExpensesContext.jsx # Estado global (gastos, config por mes, perfiles) + localStorage
├── utils/
│   ├── calculator.js           # Lógica de cierre de mes (cuotas, balances, quién transfiere)
│   ├── formatters.js           # Moneda ARS, fechas, meses
│   └── whatsapp.js             # Resumen formateado + copiar al portapapeles
├── data/
│   ├── mockData.js             # Gastos de prueba (sep/oct 2026), perfiles, hijos
│   └── categories.js           # Categorías, presets de reparto, sugerencias
├── types/index.js              # Tipos JSDoc del dominio
└── components/
    ├── Header.jsx              # App bar: familia, mes, barra de "Acuerdo" (% reparto)
    ├── HeroCard.jsx            # Balance mensual: transferencia + barra proporcional
    ├── MetricCards.jsx         # Total mes / aporte de cada uno vs su cuota
    ├── WhatsAppStrip.jsx       # Franja "Resumen listo · Copiar"
    ├── ExpenseList.jsx         # Feed agrupado por fecha, filtros y búsqueda
    ├── BottomNav.jsx           # Navegación inferior (mobile)
    ├── ExpenseFormModal.jsx    # Alta/edición/eliminación de gasto
    ├── BreakdownModal.jsx      # "Liquidación transparente" (desglose del cálculo)
    ├── BankDetailsModal.jsx    # Datos para transferir (CBU/Alias + monto)
    ├── SplitConfigModal.jsx    # Acuerdo personalizado (slider)
    ├── SettingsModal.jsx       # Nombres, CBU/Alias, hijos, restaurar demo
    ├── WhatsAppPreviewModal.jsx
    └── Modal.jsx               # Bottom sheet (mobile) / diálogo (desktop)
```

La configuración de reparto y el estado "Saldado" se guardan por mes.

Diseño basado en el proyecto de Stitch "CoParent Expenses Splitter" (design system *Serene Balance*: slate-teal + sage, Plus Jakarta Sans + Inter).
