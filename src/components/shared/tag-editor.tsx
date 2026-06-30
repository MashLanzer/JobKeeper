'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface TagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagEditor({ tags, onChange, placeholder = 'Agregar etiqueta…' }: TagEditorProps) {
  const [input, setInput] = useState('')

  const add = () => {
    const v = input.trim()
    if (!v) return
    if (!tags.some((t) => t.toLowerCase() === v.toLowerCase())) onChange([...tags, v])
    setInput('')
  }

  const remove = (t: string) => onChange(tags.filter((x) => x !== t))

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          {t}
          <button onClick={() => remove(t)} aria-label={`Quitar ${t}`} className="hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add() }
        }}
        onBlur={add}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}
