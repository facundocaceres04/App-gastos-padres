# Cuentas Claras

Gestión y liquidación mensual de gastos compartidos entre progenitores.

Cada progenitor entra con su cuenta (email y contraseña). Uno crea la familia y le
comparte al otro un **código de 6 caracteres** (o un link que ya lo trae); a partir de ahí
los dos ven y editan los mismos gastos, en tiempo real.

Producción: https://app-gastos-padres.vercel.app (cada push a `main` se publica solo).

Incluye:
- **Balance mensual** con el reparto acordado (50/50, 60/40, personalizado) y quién le transfiere a quién.
- **Análisis**: total vs mes anterior, promedio, proyección anual, acumulado del año, evolución de
  los últimos 6 meses (cuánto pagó cada uno), dona por categoría y gasto por hijo/a.
- **Modo oscuro** (claro / oscuro / sistema), guardado en el dispositivo.
- Resumen para WhatsApp, datos para transferir y estado "Saldado" por mes.
- **Confianza entre los dos**: quién cargó o editó cada gasto (lo registra la base, no se puede
  falsificar); historial de actividad que nadie puede editar ni borrar; aviso en vivo cuando el otro
  cambia algo; saldar o reabrir un mes pide confirmación y un mes saldado queda bloqueado; cada uno
  edita solo su propio CBU/Alias; borrar se puede deshacer durante unos segundos.
- **Comprobantes**: foto o PDF adjunto a cada gasto (las fotos se comprimen antes de subir), en un
  bucket privado al que solo acceden los dos miembros de la familia.
- **Aceptar u observar**: el progenitor que no cargó el gasto puede aceptarlo u observarlo con un
  motivo; los observados no cuentan en el balance hasta resolverse, y editar un gasto lo vuelve a
  "pendiente".
- **Saldo de meses anteriores**: lo que quedó sin saldar se arrastra y se muestra el total para quedar
  al día (también en el resumen de WhatsApp).

Ideas de análisis y modo oscuro tomadas de [Hormigah](https://github.com/Jaolmos/hormigah-expense-tracker).

## Desarrollo

```bash
npm install
npx vercel env pull .env.local   # trae SUPABASE_URL y SUPABASE_ANON_KEY del proyecto en Vercel
npm run dev                      # http://localhost:5173
```

## Backend (Supabase)

- Esquema en `supabase/migrations/` (tablas, seguridad por filas, funciones y tiempo real).
- `households` (familia + código de invitación), `household_members` (máx. 2: padre y madre),
  `expenses` y `month_configs` (acuerdo % y estado "Saldado" por mes).
- Cada usuario solo puede leer y escribir los datos de su propia familia (RLS).
- `create_household(...)` y `join_household(code)` son las únicas vías para crear o unirse a una familia.
- `003_trust.sql`: triggers de autoría y bloqueo de meses saldados, CBU/Alias propio y tabla
  `activity` (append-only, escrita solo por triggers).
- `004_receipts_reviews.sql`: columnas de comprobante y revisión, `review_expense()` (solo el otro
  progenitor puede revisar), bucket privado `comprobantes` con políticas por familia.
- Los cambios de esquema se aplican a mano (no hay Supabase CLI vinculado): ejecutar el `.sql` contra
  `POSTGRES_URL_NON_POOLING` de `.env.local`.

## Tests

```bash
npm test   # Vitest: cálculo de cierre, montos en formato argentino, fechas, análisis, historial
```
- Para que el otro progenitor pueda registrarse sin recibir un email, en Supabase:
  Authentication → Sign In / Providers → Email → desactivar **Confirm email**.

## Estructura

```
src/
├── App.jsx                     # Layout, modales y toasts
├── main.jsx
├── index.css                   # Tailwind v4 + animaciones
├── lib/supabase.js             # Cliente de Supabase + mensajes de error en castellano
├── context/
│   ├── AuthContext.jsx         # Sesión y familia del usuario; crear / unirse con código
│   └── ExpensesContext.jsx     # Datos de la familia sincronizados con Supabase (Realtime)
├── screens/
│   ├── AuthScreen.jsx          # Ingresar / crear cuenta
│   ├── OnboardingScreen.jsx    # Crear familia o unirse con código
│   └── Dashboard.jsx           # Panel principal
├── utils/
│   ├── calculator.js           # Lógica de cierre de mes (cuotas, balances, quién transfiere)
│   ├── analytics.js            # Series mensuales, promedios, proyección, por categoría / hijo
│   ├── theme.js                # Tema claro / oscuro / sistema
│   ├── formatters.js           # Moneda ARS, fechas, meses
│   └── whatsapp.js             # Resumen formateado + copiar al portapapeles
├── data/
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
    ├── SettingsModal.jsx       # Nombres, CBU/Alias, hijos, cerrar sesión
    ├── ShareModal.jsx          # Código / link de invitación para el otro progenitor
    ├── WhatsAppPreviewModal.jsx
    ├── Modal.jsx               # Bottom sheet (mobile) / diálogo (desktop)
    └── analysis/               # Vista Análisis: AnalysisView, MonthlyBars, CategoryDonut, ChildBars
```

La configuración de reparto y el estado "Saldado" se guardan por mes.

Diseño basado en el proyecto de Stitch "CoParent Expenses Splitter" (design system *Serene Balance*: slate-teal + sage, Plus Jakarta Sans + Inter).
