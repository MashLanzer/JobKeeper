import type { jsPDF } from 'jspdf'

/**
 * Intenta compartir el PDF generado a través de la hoja de compartir del
 * sistema (WhatsApp, email, etc.). Si el dispositivo no lo soporta, descarga
 * el archivo como respaldo.
 *
 * Devuelve 'shared' | 'downloaded' para que la UI muestre el mensaje correcto.
 */
export async function sharePdf(
  doc: jsPDF,
  filename: string,
  title: string
): Promise<'shared' | 'downloaded'> {
  const blob = doc.output('blob') as Blob
  const file = new File([blob], filename, { type: 'application/pdf' })

  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator) : undefined

  if (nav?.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title })
      return 'shared'
    } catch (err) {
      // El usuario canceló la hoja de compartir: no es un error real.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'shared'
      }
      // Cualquier otro fallo: caemos a la descarga.
    }
  }

  doc.save(filename)
  return 'downloaded'
}
