'use client'

import { useEffect, useState } from 'react'
import { FileText, Trash2, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  getClientDocuments,
  uploadClientDocument,
  getDocumentUrl,
  deleteClientDocument,
  type ClientDocument,
} from '@/services/client-documents'
import { haptic } from '@/lib/haptics'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export function ClientDocuments({ clientId }: { clientId: string }) {
  const [docs, setDocs] = useState<ClientDocument[]>([])
  const [busy, setBusy] = useState(false)

  const load = async () => setDocs(await getClientDocuments(clientId))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      toast.error('El archivo debe pesar menos de 15 MB')
      return
    }
    setBusy(true)
    try {
      const row = await uploadClientDocument(clientId, file)
      if (!row) {
        toast.error('No se pudo subir el documento')
        return
      }
      haptic('success')
      toast.success('Documento subido')
      await load()
    } finally {
      setBusy(false)
    }
  }

  const openDoc = async (d: ClientDocument) => {
    const url = await getDocumentUrl(d.path)
    if (url) window.open(url, '_blank')
    else toast.error('No se pudo abrir el documento')
  }

  const handleDelete = async (d: ClientDocument) => {
    await deleteClientDocument(d.id, d.path)
    haptic('light')
    setDocs((prev) => prev.filter((x) => x.id !== d.id))
  }

  return (
    <div className="space-y-3">
      <Button asChild size="sm" variant="outline" disabled={busy} className="w-full">
        <label className="cursor-pointer">
          {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
          Subir documento
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
        </label>
      </Button>

      {docs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin documentos. Sube un contrato, garantía o factura.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
              <button onClick={() => openDoc(d)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm truncate">{d.name || 'Documento'}</span>
                  <span className="block text-[10px] text-muted-foreground">{formatDate(d.created_at)}</span>
                </span>
              </button>
              <ConfirmDialog
                title="¿Eliminar documento?"
                description="Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                onConfirm={() => handleDelete(d)}
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Eliminar" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
