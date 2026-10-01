import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import Badge from '../components/Badge'

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
      <div className="bg-white rounded-xl border border-ink/10 p-6 text-ink/40 text-center">
        Todavía no tenés ninguna comisión a cargo.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {commissions.map((c) => (
        <Link
          key={c.commission_id}
          to={`/teacher/commissions/${c.commission_id}`}
          className="border-l-4 border-cobalt bg-white rounded-r-xl p-5 hover:bg-cobalt-soft/30 transition-colors block"
        >
          <div className="flex flex-wrap justify-between items-start gap-2">
            <div>
              <p className="font-display text-xl text-ink">{c.materia}</p>
              <p className="text-ink/50 text-sm">{c.codigo}</p>
            </div>
            <Badge tone="cobalt">{c.estado}</Badge>
          </div>
          <ul className="mt-2 flex flex-col gap-0.5">
            {c.horarios.map((h, i) => (
              <li key={i} className="text-sm text-ink/60 capitalize">
                {h.dia} {formatHora(h.hora_inicio)}–{formatHora(h.hora_fin)} · {h.aula} (
                {h.edificio})
              </li>
            ))}
          </ul>
        </Link>
      ))}
    </div>
  )
}
