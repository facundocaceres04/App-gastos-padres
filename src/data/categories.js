import { GraduationCap, Stethoscope, Shirt, Gamepad2, ShoppingBag, Shapes } from 'lucide-react';

/** Catálogo de categorías con ícono (Lucide). */
export const CATEGORIES = [
  { id: 'educacion', label: 'Educación', icon: GraduationCap },
  { id: 'salud', label: 'Salud', icon: Stethoscope },
  { id: 'indumentaria', label: 'Indumentaria', icon: Shirt },
  { id: 'recreacion', label: 'Recreación', icon: Gamepad2 },
  { id: 'alimentos', label: 'Alimentos', icon: ShoppingBag },
  { id: 'varios', label: 'Varios', icon: Shapes },
];

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

/** Presets de acuerdo (% Padre). */
export const SPLIT_PRESETS = [50, 60, 70, 40];

export const CONCEPT_SUGGESTIONS = ['Colegio', 'Zapatillas', 'Pediatra', 'Farmacia', 'Cuota club', 'Supermercado'];
