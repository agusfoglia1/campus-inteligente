import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Announcement {
  id: string
  titulo: string
  contenido: string
  autor_nombre: string | null
  created_at: string
}

export default function AnnouncementsPanel() {
  const [items, setItems] = useState<Announcement[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Announcement[]>('/announcements')
      .then((response) => setItems(response.data))
      .catch(() => setError('No se pudieron cargar los comunicados.'))
  }, [])

  if (error) return <p role="status" className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/50">{error}</p>
  if (!items.length) return null

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-cobalt">Novedades</p><h2 className="mt-1 font-display text-xl font-extrabold text-ink">Comunicados de la universidad</h2></div>
        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-soft text-lg">✦</span>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.slice(0, 4).map((item) => (
          <li key={item.id} className="rounded-2xl bg-paper p-4">
            <p className="font-display font-bold text-ink">{item.titulo}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/65">{item.contenido}</p>
            <p className="mt-3 text-xs text-ink/40">{new Date(item.created_at).toLocaleDateString('es-AR', { dateStyle: 'medium' })}{item.autor_nombre ? ` · ${item.autor_nombre}` : ''}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
