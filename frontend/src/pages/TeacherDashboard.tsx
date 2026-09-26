import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'

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
      <div className="bg-white rounded-xl shadow p-6 text-slate-500 text-center">
        Todavía no tenés ninguna comisión a cargo.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-800">Mis comisiones</h2>
      {commissions.map((c) => (
        <Link
          key={c.commission_id}
          to={`/teacher/commissions/${c.commission_id}`}
          className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow block"
        >
          <div className="flex flex-wrap justify-between items-start gap-2">
            <div>
              <p className="font-semibold text-slate-800">{c.materia}</p>
              <p className="text-slate-500 text-sm">{c.codigo}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
              {c.estado}
            </span>
          </div>
          <ul className="mt-2 flex flex-col gap-1">
            {c.horarios.map((h, i) => (
              <li key={i} className="text-sm text-slate-500 capitalize">
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
