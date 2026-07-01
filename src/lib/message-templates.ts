// Plantillas de mensajes de WhatsApp editables por el usuario (solo local).
// Admiten variables entre llaves que se sustituyen al enviar.

const KEY_COBRO = 'msg_template_cobro'

export const DEFAULT_COBRO =
  'Hola {cliente}, te escribo de {negocio} para recordarte el saldo pendiente de {monto} por "{trabajo}".{pago}\n\n¡Gracias!'

// Variables disponibles (para mostrarlas como ayuda en la UI).
export const COBRO_VARS: { token: string; desc: string }[] = [
  { token: '{cliente}', desc: 'Nombre del cliente' },
  { token: '{negocio}', desc: 'Nombre de tu negocio' },
  { token: '{monto}', desc: 'Saldo pendiente' },
  { token: '{trabajo}', desc: 'Título del trabajo' },
  { token: '{pago}', desc: 'Tus datos de pago' },
]

export function getCobroTemplate(): string {
  if (typeof window === 'undefined') return DEFAULT_COBRO
  try {
    return localStorage.getItem(KEY_COBRO) || DEFAULT_COBRO
  } catch {
    return DEFAULT_COBRO
  }
}

export function setCobroTemplate(t: string) {
  try {
    const v = t.trim()
    if (v) localStorage.setItem(KEY_COBRO, v)
    else localStorage.removeItem(KEY_COBRO)
  } catch {
    /* ignore */
  }
}

// Sustituye las variables y limpia espacios sobrantes cuando alguna queda vacía.
export function renderTemplate(template: string, vars: Record<string, string>): string {
  let out = template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
  // Colapsa espacios dobles que deja una variable vacía, sin tocar los saltos de línea.
  out = out.replace(/[ \t]{2,}/g, ' ').replace(/ +([.,])/g, '$1')
  return out.trim()
}
