import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import Badge, { toneForEstado } from '../components/Badge'

// ---------- Tipos ----------
interface Stats {
  total_estudiantes: number
  total_docentes: number
  total_carreras: number
  total_materias: number
  total_comisiones: number
  total_dispositivos_activos: number
  total_asistencias_registradas: number
  asistencias_presente: number
  asistencias_tarde: number
}

interface StudentAdmin {
  user_id: string
  student_profile_id: string
  email: string
  full_name: string
  legajo: string
  dni: string | null
  career_id: string
  anio_ingreso: number | null
  is_active: boolean
}

interface Career {
  id: string
  nombre: string
  codigo: string
}

interface DeviceAdmin {
  id: string
  nombre: string
  classroom_id: string
  is_active: boolean
}

interface AttendanceAdmin {
  fecha: string
  hora: string
  estudiante: string
  legajo: string
  materia: string
  comision: string
  aula: string
  estado: string
}

interface ScanLogAdmin {
  created_at: string
  dispositivo: string
  aula: string
  estudiante: string | null
  result: string
}

type Tab = 'resumen' | 'estudiantes' | 'dispositivos' | 'asistencias' | 'actividad'

const TABS: [Tab, string][] = [
  ['resumen', 'Resumen'],
  ['estudiantes', 'Estudiantes'],
  ['dispositivos', 'Dispositivos'],
  ['asistencias', 'Asistencias'],
  ['actividad', 'Actividad'],
]

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('resumen')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 bg-white rounded-xl border border-ink/10 p-1 overflow-x-auto">
        {TABS.map(([key, label]) => (
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

      {tab === 'resumen' && <ResumenTab />}
      {tab === 'estudiantes' && <EstudiantesTab />}
      {tab === 'dispositivos' && <DispositivosTab />}
      {tab === 'asistencias' && <AsistenciasTab />}
      {tab === 'actividad' && <ActividadTab />}
    </div>
  )
}

// ---------- Resumen ----------
function ResumenTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .get<Stats>('/admin/stats')
      .then((res) => setStats(res.data))
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar las estadísticas.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} onRetry={load} />
  if (!stats) return null

  const cards: [string, number][] = [
    ['Estudiantes', stats.total_estudiantes],
    ['Docentes', stats.total_docentes],
    ['Carreras', stats.total_carreras],
    ['Materias', stats.total_materias],
    ['Comisiones', stats.total_comisiones],
    ['Dispositivos activos', stats.total_dispositivos_activos],
    ['Asistencias registradas', stats.total_asistencias_registradas],
    ['Presentes', stats.asistencias_presente],
    ['Tarde', stats.asistencias_tarde],
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cards.map(([label, value]) => (
        <div key={label} className="bg-ink text-paper rounded-xl p-4 text-center">
          <p className="font-display text-3xl">{value}</p>
          <p className="text-paper/50 text-xs mt-1">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ---------- Estudiantes ----------
function EstudiantesTab() {
  const [students, setStudents] = useState<StudentAdmin[]>([])
  const [careers, setCareers] = useState<Career[]>([])
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [legajo, setLegajo] = useState('')
  const [careerId, setCareerId] = useState('')
  const [anioIngreso, setAnioIngreso] = useState('')

  const loadStudents = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .get<StudentAdmin[]>('/admin/students')
      .then((res) => setStudents(res.data))
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar la lista de estudiantes.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadStudents()
    api.get<Career[]>('/academic/careers').then((res) => setCareers(res.data))
  }, [loadStudents])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      await api.post('/admin/students', {
        email,
        password,
        full_name: fullName,
        legajo,
        career_id: careerId,
        anio_ingreso: anioIngreso ? Number(anioIngreso) : null,
      })
      setEmail('')
      setPassword('')
      setFullName('')
      setLegajo('')
      setCareerId('')
      setAnioIngreso('')
      setShowForm(false)
      loadStudents()
    } catch (err) {
      setFormError(
        getErrorMessage(err, 'No se pudo crear el estudiante (revisá que el email/legajo no estén repetidos)')
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="font-display text-xl text-ink">Estudiantes</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm bg-cobalt text-white px-3 py-1.5 rounded-lg hover:bg-ink transition-colors"
        >
          {showForm ? 'Cancelar' : 'Nuevo estudiante'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border-l-4 border-cobalt bg-white rounded-r-xl p-5 flex flex-col gap-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-ink/15 rounded-lg px-3 py-2 text-sm sm:col-span-2 focus:outline-none focus:ring-2 focus:ring-cobalt"
            />
            <input
              type="password"
              placeholder="Contraseña"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-ink/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt"
            />
            <input
              type="text"
              placeholder="Nombre completo"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border border-ink/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt"
            />
            <input
              type="text"
              placeholder="Legajo"
              required
              value={legajo}
              onChange={(e) => setLegajo(e.target.value)}
              className="border border-ink/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt"
            />
            <select
              required
              value={careerId}
              onChange={(e) => setCareerId(e.target.value)}
              className="border border-ink/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt"
            >
              <option value="">Carrera...</option>
              {careers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Año de ingreso (opcional)"
              value={anioIngreso}
              onChange={(e) => setAnioIngreso(e.target.value)}
              className="border border-ink/15 rounded-lg px-3 py-2 text-sm sm:col-span-2 focus:outline-none focus:ring-2 focus:ring-cobalt"
            />
          </div>
          {formError && <p className="text-brick text-sm">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-cobalt text-white rounded-lg py-2 text-sm font-medium hover:bg-ink transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creando...' : 'Crear estudiante'}
          </button>
        </form>
      )}

      {loading && <Spinner />}
      {error && <ErrorMessage message={error} onRetry={loadStudents} />}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-ink/10 p-5">
          {students.length === 0 ? (
            <p className="text-ink/40 text-sm">No hay estudiantes cargados.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-ink/5">
              {students.map((s) => (
                <li key={s.student_profile_id} className="py-2.5 flex justify-between items-center text-sm gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{s.full_name}</p>
                    <p className="text-ink/50 truncate">
                      {s.legajo} · {s.email}
                    </p>
                  </div>
                  <Badge tone={s.is_active ? 'signal' : 'neutral'}>
                    {s.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Dispositivos ----------
function DispositivosTab() {
  const [devices, setDevices] = useState<DeviceAdmin[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadDevices = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .get<DeviceAdmin[]>('/admin/devices')
      .then((res) => setDevices(res.data))
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los dispositivos.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  async function toggleActive(device: DeviceAdmin) {
    await api.put(`/admin/devices/${device.id}`, { is_active: !device.is_active })
    loadDevices()
  }

  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} onRetry={loadDevices} />

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-5">
      <h2 className="font-display text-xl text-ink mb-3">Dispositivos</h2>
      {devices.length === 0 ? (
        <p className="text-ink/40 text-sm">No hay dispositivos registrados.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink/5">
          {devices.map((d) => (
            <li key={d.id} className="py-2.5 flex flex-wrap justify-between items-center gap-2 text-sm">
              <p className="font-medium text-ink">{d.nombre}</p>
              <button onClick={() => toggleActive(d)}>
                <Badge tone={d.is_active ? 'signal' : 'neutral'}>
                  {d.is_active ? 'Activo · desactivar' : 'Inactivo · activar'}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------- Asistencias ----------
function AsistenciasTab() {
  const [rows, setRows] = useState<AttendanceAdmin[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .get<AttendanceAdmin[]>('/admin/attendances')
      .then((res) => setRows(res.data))
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar las asistencias.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} onRetry={load} />

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-5">
      <h2 className="font-display text-xl text-ink mb-3">Asistencias (todo el sistema)</h2>
      {rows.length === 0 ? (
        <p className="text-ink/40 text-sm">Todavía no hay asistencias registradas.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink/5">
          {rows.map((r, i) => (
            <li key={i} className="py-2.5 flex justify-between items-center text-sm gap-2">
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">
                  {r.estudiante} <span className="text-ink/40">({r.legajo})</span>
                </p>
                <p className="text-ink/50 truncate">
                  {r.materia} · {r.comision} · {r.aula} · {r.fecha} {r.hora.slice(0, 5)}
                </p>
              </div>
              <Badge tone={toneForEstado(r.estado)}>{r.estado}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------- Actividad (scan logs) ----------
function ActividadTab() {
  const [logs, setLogs] = useState<ScanLogAdmin[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .get<ScanLogAdmin[]>('/admin/scan-logs')
      .then((res) => setLogs(res.data))
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar la actividad.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} onRetry={load} />

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-5">
      <h2 className="font-display text-xl text-ink mb-3">Actividad (escaneos)</h2>
      {logs.length === 0 ? (
        <p className="text-ink/40 text-sm">Sin actividad todavía.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink/5">
          {logs.map((l, i) => (
            <li key={i} className="py-2.5 flex justify-between items-center text-sm gap-2">
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{l.estudiante ?? 'Desconocido'}</p>
                <p className="text-ink/50 truncate">
                  {l.dispositivo} · {l.aula} · {new Date(l.created_at).toLocaleString('es-AR')}
                </p>
              </div>
              <Badge tone={toneForEstado(l.result)}>{l.result}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
