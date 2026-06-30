// Presupuesto mensual por categoría de gasto. Solo local (localStorage).

const KEY = 'category_budgets'

export function getBudgets(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export function setBudget(category: string, amount: number) {
  if (typeof window === 'undefined') return
  try {
    const map = getBudgets()
    if (amount > 0) map[category] = amount
    else delete map[category]
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}
