import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'

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

const RESULT_COLORS: Record<string, string> = {
  ok: 'bg-green-100 text-green-700',
  wrong_classroom: 'bg-orange-100 text-orange-700',
  no_class_now: 'bg-slate-100 text-slate-600',
  invalid_token: 'bg-red-100 text-red-700',
  replay: 'bg-red-100 text-red-700',
  unknown_student: 'bg-red-100 text-red-700',
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('resumen')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 bg-white rounded-xl shadow p-1 overflow-x-auto">
        {TABS.map(([key, label]) => (
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
        <div key={label} className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{value}</p>
          <p className="text-slate-500 text-xs mt-1">{label}</p>
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
        <h2 className="text-lg font-semibold text-slate-800">Estudiantes</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo estudiante'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              type="password"
              placeholder="Contraseña"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Nombre completo"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Legajo"
              required
              value={legajo}
              onChange={(e) => setLegajo(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <select
              required
              value={careerId}
              onChange={(e) => setCareerId(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
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
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm sm:col-span-2"
            />
          </div>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creando...' : 'Crear estudiante'}
          </button>
        </form>
      )}

      {loading && <Spinner />}
      {error && <ErrorMessage message={error} onRetry={loadStudents} />}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow p-4">
          {students.length === 0 ? (
            <p className="text-slate-500 text-sm">No hay estudiantes cargados.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {students.map((s) => (
                <li key={s.student_profile_id} className="py-2 flex justify-between items-center text-sm gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 truncate">{s.full_name}</p>
                    <p className="text-slate-500 truncate">
                      {s.legajo} · {s.email}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2 py-1 rounded-full ${
                      s.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {s.is_active ? 'Activo' : 'Inactivo'}
                  </span>
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
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Dispositivos</h2>
      {devices.length === 0 ? (
        <p className="text-slate-500 text-sm">No hay dispositivos registrados.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100">
          {devices.map((d) => (
            <li key={d.id} className="py-2 flex flex-wrap justify-between items-center gap-2 text-sm">
              <p className="font-medium text-slate-700">{d.nombre}</p>
              <button
                onClick={() => toggleActive(d)}
                className={`text-xs px-2 py-1 rounded-full ${
                  d.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {d.is_active ? 'Activo (click para desactivar)' : 'Inactivo (click para activar)'}
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
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Asistencias (todo el sistema)</h2>
      {rows.length === 0 ? (
        <p className="text-slate-500 text-sm">Todavía no hay asistencias registradas.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100">
          {rows.map((r, i) => (
            <li key={i} className="py-2 flex justify-between items-center text-sm gap-2">
              <div className="min-w-0">
                <p className="font-medium text-slate-700 truncate">
                  {r.estudiante} <span className="text-slate-400">({r.legajo})</span>
                </p>
                <p className="text-slate-500 truncate">
                  {r.materia} · {r.comision} · {r.aula} · {r.fecha} {r.hora.slice(0, 5)}
                </p>
              </div>
              <span
                className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium capitalize ${
                  r.estado === 'presente'
                    ? 'bg-green-100 text-green-700'
                    : r.estado === 'tarde'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {r.estado}
              </span>
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
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Actividad (escaneos)</h2>
      {logs.length === 0 ? (
        <p className="text-slate-500 text-sm">Sin actividad todavía.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100">
          {logs.map((l, i) => (
            <li key={i} className="py-2 flex justify-between items-center text-sm gap-2">
              <div className="min-w-0">
                <p className="font-medium text-slate-700 truncate">{l.estudiante ?? 'Desconocido'}</p>
                <p className="text-slate-500 truncate">
                  {l.dispositivo} · {l.aula} · {new Date(l.created_at).toLocaleString('es-AR')}
                </p>
              </div>
              <span
                className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                  RESULT_COLORS[l.result] ?? 'bg-slate-100 text-slate-600'
                }`}
              >
                {l.result}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
