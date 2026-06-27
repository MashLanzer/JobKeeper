// Color asociado a cada categoría de trabajo, para distinguirlas de un vistazo
// en las tarjetas y el calendario. Las clases de Tailwind se incluyen completas
// para que el compilador (JIT) no las purgue.

interface CategoryStyle {
  dot: string // color de fondo para puntos/indicadores
  chip: string // clases para el chip/etiqueta de categoría
}

const STYLES: Record<string, CategoryStyle> = {
  'A/C - Instalación': {
    dot: 'bg-blue-500',
    chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  'A/C - Mantenimiento': {
    dot: 'bg-cyan-500',
    chip: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
  'A/C - Reparación': {
    dot: 'bg-orange-500',
    chip: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  'A/C - Limpieza': {
    dot: 'bg-teal-500',
    chip: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  },
  Refrigeración: {
    dot: 'bg-sky-500',
    chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  'Ventilación/Ductos': {
    dot: 'bg-indigo-500',
    chip: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  'Mantenimiento/Reparaciones': {
    dot: 'bg-amber-500',
    chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  'Tecnología/Freelance': {
    dot: 'bg-violet-500',
    chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  'Servicios en campo': {
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  'General/Varios': {
    dot: 'bg-slate-500',
    chip: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  },
}

const FALLBACK: CategoryStyle = {
  dot: 'bg-slate-500',
  chip: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
}

export function categoryStyle(category?: string): CategoryStyle {
  if (!category) return FALLBACK
  return STYLES[category] || FALLBACK
}
