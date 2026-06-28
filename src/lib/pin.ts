// PIN de bloqueo local de la app. Es una protección de conveniencia (no
// cifrado): se guarda en localStorage del dispositivo.

const KEY = 'app_pin'
const UNLOCK_KEY = 'app_unlocked'

export function getPin(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY)
}

export function setPin(pin: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, pin)
}

export function clearPin() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
  sessionStorage.removeItem(UNLOCK_KEY)
}

export function isUnlocked(): boolean {
  if (typeof window === 'undefined') return true
  return sessionStorage.getItem(UNLOCK_KEY) === '1'
}

export function markUnlocked() {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(UNLOCK_KEY, '1')
}
