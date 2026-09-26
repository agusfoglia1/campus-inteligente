import { useCallback, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'

interface ClassInfo {
  commission_id: string
  materia: string
  materia_codigo: string
  docente: string | null
  aula: string
  edificio: string
  dia: string
  hora_inicio: string
  hora_fin: string
}

interface NextClass extends ClassInfo {
  fecha: string
}

interface AttendanceHistoryItem {
  fecha: string
  hora: string
  materia: string
  aula: string
  estado: string
}

interface StudentDashboardData {
  nombre: string
  legajo: string
  proxima_clase: NextClass | null
  materias_del_dia: ClassInfo[]
  porcentaje_asistencia: number | null
  historial_reciente: AttendanceHistoryItem[]
}

const ESTADO_COLORS: Record<string, string> = {
  presente: 'bg-green-100 text-green-700',
  tarde: 'bg-yellow-100 text-yellow-700',
  ausente: 'bg-red-100 text-red-700',
}

function formatHora(hora: string) {
  return hora.slice(0, 5)
}

export default function StudentDashboard() {
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .get<StudentDashboardData>('/students/me/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar tu información.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Spinner label="Cargando tu dashboard..." />
  if (error) return <ErrorMessage message={error} onRetry={load} />
  if (!data) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Legajo: {data.legajo}</h2>
      </div>

      {/* Próxima clase */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-blue-700 mb-2">Próxima clase</h3>
        {data.proxima_clase ? (
          <div>
            <p className="text-lg font-semibold text-slate-800">{data.proxima_clase.materia}</p>
            <p className="text-slate-600">
              {data.proxima_clase.dia} {formatHora(data.proxima_clase.hora_inicio)}–
              {formatHora(data.proxima_clase.hora_fin)} · Aula {data.proxima_clase.aula} (
              {data.proxima_clase.edificio})
            </p>
            {data.proxima_clase.docente && (
              <p className="text-slate-500 text-sm">Docente: {data.proxima_clase.docente}</p>
            )}
          </div>
        ) : (
          <p className="text-slate-500">No tenés ninguna clase próxima cargada.</p>
        )}
      </div>

      {/* Materias del día + % asistencia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Materias de hoy</h3>
          {data.materias_del_dia.length === 0 ? (
            <p className="text-slate-500 text-sm">No tenés clases hoy.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.materias_del_dia.map((c) => (
                <li key={c.commission_id} className="text-sm">
                  <span className="font-medium">{c.materia}</span>{' '}
                  <span className="text-slate-500">
                    {formatHora(c.hora_inicio)}–{formatHora(c.hora_fin)} · {c.aula}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-4 flex flex-col justify-center items-center">
          <h3 className="text-sm font-medium text-slate-500 mb-2">% de asistencia</h3>
          <p className="text-3xl font-bold text-blue-600">
            {data.porcentaje_asistencia !== null ? `${data.porcentaje_asistencia}%` : '—'}
          </p>
        </div>
      </div>

      {/* Historial reciente */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-sm font-medium text-slate-500 mb-3">Historial reciente</h3>
        {data.historial_reciente.length === 0 ? (
          <p className="text-slate-500 text-sm">Todavía no tenés asistencias registradas.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100">
            {data.historial_reciente.map((h, i) => (
              <li key={i} className="py-2 flex justify-between items-center text-sm gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-700 truncate">{h.materia}</p>
                  <p className="text-slate-500">
                    {h.fecha} · {formatHora(h.hora)} · {h.aula}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium capitalize ${
                    ESTADO_COLORS[h.estado] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {h.estado}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
