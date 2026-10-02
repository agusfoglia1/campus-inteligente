export function downloadCsv(filename: string, columns: string[], rows: (string | number | null | undefined)[][]) {
  const escapeCell = (value: string | number | null | undefined) => {
    const original = String(value ?? '')
    const cell = /^[=+@\-\t\r]/.test(original) ? `'${original}` : original
    return `"${cell.replaceAll('"', '""')}"`
  }
  const contents = [columns, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${contents}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export interface CalendarClass {
  materia: string; materia_codigo: string; dia: string; hora_inicio: string
  hora_fin: string; aula: string; edificio: string; docente: string | null
}

export function downloadIcs(classes: CalendarClass[]) {
  const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&')
  const dayCode: Record<string, string> = { lunes: 'MO', martes: 'TU', miercoles: 'WE', jueves: 'TH', viernes: 'FR', sabado: 'SA' }
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const events = classes.map((item) => {
    const day = dayCode[item.dia]
    if (!day) return ''
    const weekdayNumber: Record<string, number> = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 }
    const targetDay = weekdayNumber[item.dia]
    const startDate = new Date()
    const delta = (targetDay - (startDate.getDay() || 7) + 7) % 7
    startDate.setDate(startDate.getDate() + delta)
    const datePart = `${startDate.getFullYear()}${String(startDate.getMonth()+1).padStart(2,'0')}${String(startDate.getDate()).padStart(2,'0')}`
    const start = item.hora_inicio.slice(0, 5).replace(':', '') + '00'
    const end = item.hora_fin.slice(0, 5).replace(':', '') + '00'
    const summary = escape(`${item.materia_codigo} · ${item.materia}`)
    const location = escape(`Aula ${item.aula}, ${item.edificio}`)
    const description = escape([item.docente && `Docente: ${item.docente}`, `Código: ${item.materia_codigo}`].filter(Boolean).join('\n'))
    return ['BEGIN:VEVENT', `UID:${crypto.randomUUID()}@campus-inteligente`, `DTSTAMP:${now}`, `DTSTART:${datePart}T${start}`, `DTEND:${datePart}T${end}`, `RRULE:FREQ=WEEKLY;BYDAY=${day}`, `SUMMARY:${summary}`, `LOCATION:${location}`, `DESCRIPTION:${description}`, 'END:VEVENT'].join('\r\n')
  }).filter(Boolean)
  const blob = new Blob([`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Campus Inteligente//Agenda//ES\r\nCALSCALE:GREGORIAN\r\n${events.join('\r\n')}\r\nEND:VCALENDAR\r\n`], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob); const link = document.createElement('a')
  link.href = url; link.download = 'agenda-campus.ics'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
