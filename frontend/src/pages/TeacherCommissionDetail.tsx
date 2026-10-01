import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import Badge, { toneForEstado } from '../components/Badge'
import AppHeader from '../components/AppHeader'

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
    <div className="min-h-screen bg-paper">
      <AppHeader backTo={{ to: '/dashboard', label: 'Volver' }} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        <h1 className="font-display text-2xl text-ink">Detalle de la comisión</h1>

        {loading && <Spinner />}
        {error && <ErrorMessage message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            <div className="flex gap-1 bg-white rounded-xl border border-ink/10 p-1 overflow-x-auto">
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
                  className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    tab === key ? 'bg-ink text-paper' : 'text-ink/60 hover:bg-paper'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'estudiantes' && (
              <div className="bg-white rounded-xl border border-ink/10 p-5">
                {students.length === 0 ? (
                  <p className="text-ink/40 text-sm">No hay estudiantes inscriptos.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-ink/5">
                    {students.map((s) => (
                      <li
                        key={s.student_profile_id}
                        className="py-2.5 flex justify-between items-center text-sm gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate">{s.nombre}</p>
                          <p className="text-ink/50">Legajo {s.legajo}</p>
                        </div>
                        <Badge tone={toneForEstado(s.estado_inscripcion)}>
                          {s.estado_inscripcion}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === 'asistencia' && (
              <div className="bg-white rounded-xl border border-ink/10 p-5">
                {attendance.length === 0 ? (
                  <p className="text-ink/40 text-sm">Todavía no hay asistencia registrada.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-ink/5">
                    {attendance.map((a, i) => (
                      <li key={i} className="py-2.5 flex justify-between items-center text-sm gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate">{a.estudiante}</p>
                          <p className="text-ink/50">
                            {a.fecha} · {a.hora.slice(0, 5)} · Legajo {a.legajo}
                          </p>
                        </div>
                        <Badge tone={toneForEstado(a.estado)}>{a.estado}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === 'stats' && (
              <div className="bg-white rounded-xl border border-ink/10 p-5">
                {stats.length === 0 ? (
                  <p className="text-ink/40 text-sm">No hay estudiantes inscriptos.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-ink/5">
                    {stats.map((s) => (
                      <li key={s.student_profile_id} className="py-2.5 text-sm">
                        <p className="font-medium text-ink">{s.nombre}</p>
                        <p className="text-ink/50">
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
