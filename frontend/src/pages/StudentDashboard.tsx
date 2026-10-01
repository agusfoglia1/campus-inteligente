import { useCallback, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import Badge, { toneForEstado } from '../components/Badge'

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
    <div className="flex flex-col gap-4">
      <p className="text-ink/50 text-sm">Legajo {data.legajo}</p>

      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
        {/* Próxima clase */}
        <div className="border-l-4 border-cobalt bg-white rounded-r-xl p-5">
          <p className="text-cobalt text-sm font-medium mb-1">Próxima clase</p>
          {data.proxima_clase ? (
            <>
              <p className="font-display text-2xl text-ink">{data.proxima_clase.materia}</p>
              <p className="text-ink/60 mt-1">
                {data.proxima_clase.dia} · {formatHora(data.proxima_clase.hora_inicio)}–
                {formatHora(data.proxima_clase.hora_fin)}
              </p>
              <p className="text-ink/60">
                Aula {data.proxima_clase.aula}, {data.proxima_clase.edificio}
              </p>
              {data.proxima_clase.docente && (
                <p className="text-ink/40 text-sm mt-2">{data.proxima_clase.docente}</p>
              )}
            </>
          ) : (
            <p className="text-ink/40">No tenés ninguna clase próxima cargada.</p>
          )}
        </div>

        {/* % asistencia, como número grande: es el dato más importante del dashboard */}
        <div className="bg-ink text-paper rounded-xl p-5 flex flex-col items-center justify-center text-center">
          <p className="font-display text-5xl">
            {data.porcentaje_asistencia !== null ? (
              <>
                {data.porcentaje_asistencia}
                <span className="text-2xl align-top">%</span>
              </>
            ) : (
              '—'
            )}
          </p>
          <p className="text-paper/50 text-sm mt-1">de asistencia</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 p-5">
        <p className="text-ink/50 text-sm font-medium mb-3">Materias de hoy</p>
        {data.materias_del_dia.length === 0 ? (
          <p className="text-ink/40 text-sm">No tenés clases hoy.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-ink/5">
            {data.materias_del_dia.map((c) => (
              <li key={c.commission_id} className="py-2.5 flex justify-between text-sm gap-2">
                <span className="font-medium text-ink">{c.materia}</span>
                <span className="text-ink/50 shrink-0">
                  {formatHora(c.hora_inicio)}–{formatHora(c.hora_fin)} · {c.aula}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl border border-ink/10 p-5">
        <p className="text-ink/50 text-sm font-medium mb-3">Historial reciente</p>
        {data.historial_reciente.length === 0 ? (
          <p className="text-ink/40 text-sm">Todavía no tenés asistencias registradas.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-ink/5">
            {data.historial_reciente.map((h, i) => (
              <li key={i} className="py-2.5 flex justify-between items-center text-sm gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{h.materia}</p>
                  <p className="text-ink/50">
                    {h.fecha} · {formatHora(h.hora)} · {h.aula}
                  </p>
                </div>
                <Badge tone={toneForEstado(h.estado)}>{h.estado}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
