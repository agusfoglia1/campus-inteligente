import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'

interface EnrolledStudent {
  student_profile_id: string
  legajo: string
  nombre: string
  estado_inscripcion: string
}

interface AttendanceRecord {
  fecha: string
  hora: string
  estudiante: string
  legajo: string
  estado: string
}

interface StudentStat {
  student_profile_id: string
  legajo: string
  nombre: string
  total_registros: number
  presentes: number
  tardes: number
}

const ESTADO_COLORS: Record<string, string> = {
  presente: 'bg-green-100 text-green-700',
  tarde: 'bg-yellow-100 text-yellow-700',
  ausente: 'bg-red-100 text-red-700',
}

type Tab = 'estudiantes' | 'asistencia' | 'stats'

export default function TeacherCommissionDetail() {
  const { commissionId } = useParams<{ commissionId: string }>()
  const [tab, setTab] = useState<Tab>('estudiantes')

  const [students, setStudents] = useState<EnrolledStudent[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<StudentStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (!commissionId) return
    setLoading(true)
    setError('')
    Promise.all([
      api.get<EnrolledStudent[]>(`/teachers/me/commissions/${commissionId}/students`),
      api.get<AttendanceRecord[]>(`/teachers/me/commissions/${commissionId}/attendance`),
      api.get<StudentStat[]>(`/teachers/me/commissions/${commissionId}/stats`),
    ])
      .then(([s, a, st]) => {
        setStudents(s.data)
        setAttendance(a.data)
        setStats(st.data)
      })
      .catch((err) =>
        setError(getErrorMessage(err, 'No se pudo cargar la información de esta comisión.'))
      )
      .finally(() => setLoading(false))
  }, [commissionId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h1 className="text-xl font-bold text-blue-600">Detalle de la comisión</h1>
          <Link to="/dashboard" className="text-blue-600 text-sm hover:underline">
            ← Volver
          </Link>
        </div>

        {loading && <Spinner />}
        {error && <ErrorMessage message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            <div className="flex gap-1 bg-white rounded-xl shadow p-1 overflow-x-auto">
              {(
                [
                  ['estudiantes', 'Estudiantes'],
                  ['asistencia', 'Asistencia'],
                  ['stats', 'Estadísticas'],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    tab === key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'estudiantes' && (
              <div className="bg-white rounded-xl shadow p-4">
                {students.length === 0 ? (
                  <p className="text-slate-500 text-sm">No hay estudiantes inscriptos.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-slate-100">
                    {students.map((s) => (
                      <li
                        key={s.student_profile_id}
                        className="py-2 flex justify-between items-center text-sm gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-700 truncate">{s.nombre}</p>
                          <p className="text-slate-500">Legajo {s.legajo}</p>
                        </div>
                        <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
                          {s.estado_inscripcion}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === 'asistencia' && (
              <div className="bg-white rounded-xl shadow p-4">
                {attendance.length === 0 ? (
                  <p className="text-slate-500 text-sm">Todavía no hay asistencia registrada.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-slate-100">
                    {attendance.map((a, i) => (
                      <li key={i} className="py-2 flex justify-between items-center text-sm gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-700 truncate">{a.estudiante}</p>
                          <p className="text-slate-500">
                            {a.fecha} · {a.hora.slice(0, 5)} · Legajo {a.legajo}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            ESTADO_COLORS[a.estado] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {a.estado}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === 'stats' && (
              <div className="bg-white rounded-xl shadow p-4">
                {stats.length === 0 ? (
                  <p className="text-slate-500 text-sm">No hay estudiantes inscriptos.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-slate-100">
                    {stats.map((s) => (
                      <li key={s.student_profile_id} className="py-2 text-sm">
                        <p className="font-medium text-slate-700">{s.nombre}</p>
                        <p className="text-slate-500">
                          {s.total_registros} registros · {s.presentes} presente
                          {s.presentes !== 1 ? 's' : ''} · {s.tardes} tarde
                          {s.tardes !== 1 ? 's' : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
