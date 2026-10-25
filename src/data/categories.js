import { GraduationCap, Stethoscope, Shirt, Gamepad2, ShoppingBag, Shapes } from 'lucide-react';

/** Catálogo de categorías con ícono (Lucide) y color fijo para los gráficos. */
export const CATEGORIES = [
  { id: 'educacion', label: 'Educación', icon: GraduationCap, color: 'var(--color-cat-1)' },
  { id: 'salud', label: 'Salud', icon: Stethoscope, color: 'var(--color-cat-2)' },
  { id: 'indumentaria', label: 'Indumentaria', icon: Shirt, color: 'var(--color-cat-3)' },
  { id: 'recreacion', label: 'Recreación', icon: Gamepad2, color: 'var(--color-cat-4)' },
  { id: 'alimentos', label: 'Alimentos', icon: ShoppingBag, color: 'var(--color-cat-5)' },
  { id: 'varios', label: 'Varios', icon: Shapes, color: 'var(--color-cat-6)' },
];

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

/** Presets de acuerdo (% Padre). */
export const SPLIT_PRESETS = [50, 60, 70, 40];

export const CONCEPT_SUGGESTIONS = ['Colegio', 'Zapatillas', 'Pediatra', 'Farmacia', 'Cuota club', 'Supermercado'];
