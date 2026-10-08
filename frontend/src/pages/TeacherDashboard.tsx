import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import Badge from '../components/Badge'
import { EmptyState } from '../components/ui'

interface ScheduleInfo {
  dia: string
  hora_inicio: string
  hora_fin: string
  aula: string
  edificio: string
}

interface TeacherCommission {
  commission_id: string
  codigo: string
  materia: string
  materia_codigo: string
  estado: string
  horarios: ScheduleInfo[]
}

function formatHora(hora: string) {
  return hora.slice(0, 5)
}

export default function TeacherDashboard() {
  const [commissions, setCommissions] = useState<TeacherCommission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .get<TeacherCommission[]>('/teachers/me/commissions')
      .then((res) => setCommissions(res.data))
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar tus comisiones.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Spinner label="Cargando tus comisiones..." />
  if (error) return <ErrorMessage message={error} onRetry={load} />

  if (commissions.length === 0) {
    return (
      <div className="rounded-3xl border border-ink/10 bg-white p-9 text-center shadow-sm">
        <EmptyState title="Tus comisiones aparecerán acá" description="Cuando tengas comisiones asignadas, vas a poder consultar horarios, estudiantes y asistencia desde este espacio." />
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-cobalt">Espacio docente</p><h2 className="mt-1 font-display text-2xl font-extrabold text-ink">Tus comisiones</h2><p className="mt-1 text-sm text-ink/50">Seleccioná una comisión para ver estudiantes y actividad.</p></div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {commissions.map((c) => (
        <Link
          key={c.commission_id}
          to={`/teacher/commissions/${c.commission_id}`}
          className="group relative overflow-hidden rounded-3xl border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cobalt/35 hover:shadow-lg hover:shadow-ink/[.06] sm:p-6"
        >
          <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-cobalt-soft/70 transition group-hover:scale-110" />
          <div className="flex flex-wrap justify-between items-start gap-2">
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-cobalt">Comisión {c.codigo}</p>
              <p className="mt-1 font-display text-xl font-extrabold text-ink">{c.materia}</p>
              <p className="text-sm text-ink/45">{c.materia_codigo}</p>
            </div>
            <Badge tone="cobalt">{c.estado}</Badge>
          </div>
          <ul className="relative mt-5 flex flex-col gap-2 border-t border-ink/5 pt-4">
            {c.horarios.map((h, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 text-sm capitalize text-ink/60">
                <span className="w-24 font-semibold text-ink">{h.dia}</span><span className="tabular-nums">{formatHora(h.hora_inicio)}–{formatHora(h.hora_fin)}</span><span className="text-ink/35">·</span><span>{h.aula} · {h.edificio}</span>
              </li>
            ))}
          </ul>
          <p className="relative mt-5 flex items-center justify-between text-sm font-bold text-cobalt">Abrir comisión <span className="transition group-hover:translate-x-1">→</span></p>
        </Link>
      ))}
      </div>
    </section>
  )
}
