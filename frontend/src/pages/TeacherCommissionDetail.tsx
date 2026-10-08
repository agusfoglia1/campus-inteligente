import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import Badge, { toneForEstado } from '../components/Badge'
import AppHeader from '../components/AppHeader'
import { downloadCsv } from '../lib/exportCsv'
import { Button, EmptyState, Tabs } from '../components/ui'
import { useToast } from '../components/toast'

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
  const [manualStudent, setManualStudent] = useState('')
  const [manualDate, setManualDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })
  const [manualStatus, setManualStatus] = useState('presente')
  const [manualMessage, setManualMessage] = useState('')
  const [manualBusy, setManualBusy] = useState(false)
  const [attendanceFrom, setAttendanceFrom] = useState('')
  const [attendanceTo, setAttendanceTo] = useState('')
  const [attendanceStatus, setAttendanceStatus] = useState('')
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const notify = useToast()

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

  async function saveManualAttendance() {
    if (!commissionId || !manualStudent) return
    setManualBusy(true); setManualMessage('')
    try {
      await api.post(`/teachers/me/commissions/${commissionId}/attendance/manual`, { student_profile_id: manualStudent, fecha: manualDate, estado: manualStatus })
      setManualMessage('Asistencia registrada.'); notify('Asistencia registrada'); load()
    } catch (err) { setManualMessage(getErrorMessage(err, 'No se pudo registrar la asistencia.')) }
    finally { setManualBusy(false) }
  }

  const visibleAttendance = attendance.filter((row) => {
    if (attendanceFrom && row.fecha < attendanceFrom) return false
    if (attendanceTo && row.fecha > attendanceTo) return false
    if (attendanceStatus && row.estado !== attendanceStatus) return false
    const query = attendanceSearch.trim().toLocaleLowerCase('es')
    return !query || `${row.estudiante} ${row.legajo}`.toLocaleLowerCase('es').includes(query)
  })
  const attendanceCount = (status: string) => visibleAttendance.filter((row) => row.estado === status).length

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader backTo={{ to: '/dashboard', label: 'Volver' }} />
      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-7 sm:px-6 sm:py-10">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-cobalt">Espacio docente</p><h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Detalle de la comisión</h1><p className="mt-2 text-sm text-ink/50">Seguimiento de estudiantes, asistencia y actividad.</p></div>

        {loading && <Spinner />}
        {error && <ErrorMessage message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            <Tabs items={[{ id: 'estudiantes', label: 'Estudiantes', count: students.length }, { id: 'asistencia', label: 'Asistencia', count: attendance.length }, { id: 'stats', label: 'Estadísticas' }]} value={tab} onChange={(value) => setTab(value as Tab)} label="Detalle de comisión" />

            {tab === 'estudiantes' && (
              <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
                {students.length === 0 ? (
                  <EmptyState title="Sin estudiantes inscriptos" description="Cuando se inscriban estudiantes, vas a poder revisar sus datos y asistencia acá." />
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
              <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 rounded-2xl bg-paper p-4"><p className="font-bold text-ink">Cargar asistencia manual</p><p className="mt-1 text-xs text-ink/50">Solo se admite en días con clase programada para esta comisión.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4"><select aria-label="Estudiante" value={manualStudent} onChange={e=>setManualStudent(e.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm"><option value="">Elegí estudiante</option>{students.filter(s=>!['aprobada','desaprobada','libre'].includes(s.estado_inscripcion.toLowerCase())).map(s=><option key={s.student_profile_id} value={s.student_profile_id}>{s.nombre} · {s.legajo}</option>)}</select><input aria-label="Fecha" type="date" value={manualDate} onChange={e=>setManualDate(e.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm"/><select aria-label="Estado" value={manualStatus} onChange={e=>setManualStatus(e.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm"><option value="presente">Presente</option><option value="tarde">Tarde</option><option value="ausente">Ausente</option></select><Button type="button" variant="primary" loading={manualBusy} disabled={!manualStudent} onClick={saveManualAttendance}>Registrar asistencia</Button></div>{manualMessage&&<p role="status" className="mt-2 text-sm text-ink/65">{manualMessage}</p>}
                </div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-xs font-bold uppercase tracking-[.15em] text-cobalt">Registro de clase</p><h2 className="mt-1 font-display text-lg font-extrabold text-ink">Asistencia de la comisión</h2></div>
                  <button type="button" onClick={() => downloadCsv('asistencia-comision.csv',
                    ['Fecha', 'Hora', 'Estudiante', 'Legajo', 'Estado'],
                    visibleAttendance.map((row) => [row.fecha, row.hora, row.estudiante, row.legajo, row.estado])
                  )} disabled={visibleAttendance.length === 0} className="rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cobalt disabled:cursor-not-allowed disabled:opacity-40">Exportar filtradas ↓</button>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[['Registros',visibleAttendance.length],['Presentes',attendanceCount('presente')],['Tarde',attendanceCount('tarde')],['Ausentes',attendanceCount('ausente')]].map(([label,value])=><div key={label} className="rounded-2xl bg-paper p-3"><p className="font-display text-xl font-extrabold text-ink">{value}</p><p className="text-xs font-semibold text-ink/50">{label}</p></div>)}</div>
                <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><input aria-label="Buscar estudiante" type="search" value={attendanceSearch} onChange={e=>setAttendanceSearch(e.target.value)} placeholder="Buscar estudiante o legajo…" className="rounded-xl border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus:border-cobalt"/><label className="text-xs font-semibold text-ink/50">Desde<input aria-label="Desde" type="date" value={attendanceFrom} max={attendanceTo||undefined} onChange={e=>setAttendanceFrom(e.target.value)} className="mt-1 block w-full rounded-xl border border-ink/15 bg-paper px-3 py-2 text-sm text-ink"/></label><label className="text-xs font-semibold text-ink/50">Hasta<input aria-label="Hasta" type="date" value={attendanceTo} min={attendanceFrom||undefined} onChange={e=>setAttendanceTo(e.target.value)} className="mt-1 block w-full rounded-xl border border-ink/15 bg-paper px-3 py-2 text-sm text-ink"/></label><select aria-label="Filtrar por estado" value={attendanceStatus} onChange={e=>setAttendanceStatus(e.target.value)} className="rounded-xl border border-ink/15 bg-paper px-3 py-2 text-sm"><option value="">Todos los estados</option><option value="presente">Presente</option><option value="tarde">Tarde</option><option value="ausente">Ausente</option></select></div>
                {visibleAttendance.length === 0 ? (
                  <p className="text-ink/40 text-sm">Todavía no hay asistencia registrada.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-ink/5">
                    {visibleAttendance.map((a, i) => (
                      <li key={`${a.fecha}-${a.hora}-${a.legajo}-${i}`} className="py-2.5 flex justify-between items-center text-sm gap-2">
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
              <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
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
      </main>
    </div>
  )
}
