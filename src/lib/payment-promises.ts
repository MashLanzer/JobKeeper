// Promesas de pago: fecha comprometida por el cliente para saldar un trabajo.
// Solo local (localStorage). Mapa { [jobId]: 'YYYY-MM-DD' }.

const KEY = 'payment_promises'

type PromiseMap = Record<string, string>

function read(): PromiseMap {
  if (typeof window === 'undefined') return {}
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

function write(map: PromiseMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function getPromises(): PromiseMap {
  return read()
}

export function getPromise(jobId: string): string | null {
  return read()[jobId] || null
}

export function setPromise(jobId: string, date: string): PromiseMap {
  const map = read()
  if (date) map[jobId] = date
  else delete map[jobId]
  write(map)
  return map
}

export function clearPromise(jobId: string): PromiseMap {
  const map = read()
  delete map[jobId]
  write(map)
  return map
}
