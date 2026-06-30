// Genera un archivo .ics (iCalendar) para importar trabajos a Google Calendar,
// Apple Calendar, etc.

export interface IcsEvent {
  id: string
  title: string
  start: string // ISO
  durationMin?: number
  location?: string | null
}

function fmt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escape(s: string): string {
  return (s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
}

export function buildIcs(events: IcsEvent[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WorkLedger//ES', 'CALSCALE:GREGORIAN']
  for (const e of events) {
    const start = new Date(e.start)
    const end = new Date(start.getTime() + (e.durationMin || 60) * 60000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@workledger`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${escape(e.title)}`,
      ...(e.location ? [`LOCATION:${escape(e.location)}`] : []),
      'END:VEVENT'
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
