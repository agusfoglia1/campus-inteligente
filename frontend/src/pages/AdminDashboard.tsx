import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import Badge, { toneForEstado } from '../components/Badge'
import AcademicManagementTab from './AcademicManagementTab'
import { downloadCsv } from '../lib/exportCsv'

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

type Tab = 'resumen' | 'estudiantes' | 'academico' | 'aprobaciones' | 'comunicados' | 'dispositivos' | 'asistencias' | 'actividad'

const TABS: [Tab, string][] = [
  ['resumen', 'Resumen'],
  ['estudiantes', 'Estudiantes'],
  ['academico', 'Gestión académica'],
  ['aprobaciones', 'Aprobaciones'],
  ['comunicados', 'Comunicados'],
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
            className={`flex-1 min-w-fit px-3 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === key ? 'bg-ink text-white shadow-sm' : 'text-ink/60 hover:bg-cobalt-soft hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <ResumenTab />}
      {tab === 'estudiantes' && <EstudiantesTab />}
      {tab === 'academico' && <AcademicManagementTab />}
      {tab === 'aprobaciones' && <AprobacionesTab />}
      {tab === 'comunicados' && <ComunicadosTab />}
      {tab === 'dispositivos' && <DispositivosTab />}
      {tab === 'asistencias' && <AsistenciasTab />}
      {tab === 'actividad' && <ActividadTab />}
    </div>
  )
}

interface AnnouncementAdmin {
  id: string
  titulo: string
  contenido: string
  publicado: boolean
  autor_nombre: string | null
  created_at: string
}

function ComunicadosTab() {
  const [items, setItems] = useState<AnnouncementAdmin[]>([])
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [publicar, setPublicar] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setError('')
    api.get<AnnouncementAdmin[]>('/announcements/admin')
      .then((response) => setItems(response.data))
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los comunicados.')))
  }, [])
  useEffect(() => { load() }, [load])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try {
      await api.post('/announcements/admin', { titulo, contenido, publicado: publicar })
      setTitulo(''); setContenido(''); setMessage('Comunicado guardado.'); load()
    } catch (err) { setError(getErrorMessage(err, 'No se pudo guardar el comunicado.')) }
    finally { setBusy(false) }
  }

  async function toggle(item: AnnouncementAdmin) {
    setBusy(true); setError(''); setMessage('')
    try { await api.put(`/announcements/admin/${item.id}`, { publicado: !item.publicado }); load() }
    catch (err) { setError(getErrorMessage(err, 'No se pudo cambiar la publicación.')) }
    finally { setBusy(false) }
  }

  return <section className="flex flex-col gap-4">
    <div><p className="text-xs font-bold uppercase tracking-[.16em] text-cobalt">Información institucional</p><h2 className="mt-1 font-display text-xl font-extrabold text-ink">Comunicados</h2><p className="mt-1 text-sm text-ink/50">Publicá avisos visibles en los dashboards del campus.</p></div>
    {error && <ErrorMessage message={error} onRetry={load} />}
    {message && <p role="status" className="rounded-xl bg-signal-soft px-4 py-3 text-sm font-semibold text-signal">{message}</p>}
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
      <label className="text-sm font-bold text-ink">Título<input required minLength={4} maxLength={140} value={titulo} onChange={e=>setTitulo(e.target.value)} className="mt-1.5 w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 font-normal outline-none focus:border-cobalt" placeholder="Por ejemplo: Inscripción a exámenes" /></label>
      <label className="text-sm font-bold text-ink">Mensaje<textarea required minLength={10} maxLength={5000} rows={4} value={contenido} onChange={e=>setContenido(e.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-ink/15 bg-paper px-3 py-2.5 font-normal outline-none focus:border-cobalt" placeholder="Escribí la información para estudiantes y docentes…" /></label>
      <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-ink/65"><input type="checkbox" checked={publicar} onChange={e=>setPublicar(e.target.checked)} className="accent-cobalt" />Publicar inmediatamente</label><button disabled={busy} className="rounded-full bg-cobalt px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy?'Guardando…':'Guardar comunicado'}</button></div>
    </form>
    <div className="flex flex-col gap-3">{items.length===0?<p className="rounded-2xl bg-white p-5 text-sm text-ink/50">Todavía no hay comunicados.</p>:items.map(item=><article key={item.id} className="rounded-2xl border border-ink/10 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display font-bold text-ink">{item.titulo}</h3><p className="mt-1 text-xs text-ink/40">{new Date(item.created_at).toLocaleDateString('es-AR')} · {item.autor_nombre??'Administración'}</p></div><button disabled={busy} onClick={()=>toggle(item)} className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-bold text-ink/65 disabled:opacity-50">{item.publicado?'Despublicar':'Publicar'}</button></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/65">{item.contenido}</p></article>)}</div>
  </section>
}

function AprobacionesTab() {
  const [items, setItems] = useState<{id:string; estudiante:string; legajo:string; materia:string; materia_codigo:string; comision:string}[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const load = useCallback(() => api.get('/admin/enrollments/pending').then(r => setItems(r.data)).catch(e => setError(getErrorMessage(e, 'No se pudieron cargar las solicitudes.'))), [])
  useEffect(() => { load() }, [load])
  async function review(id: string, estado: 'aprobada' | 'solicitud_rechazada') {
    setBusy(id); setError('')
    try { await api.put(`/admin/enrollments/${id}/review`, { estado }); await load() }
    catch (e) { setError(getErrorMessage(e, 'No se pudo guardar la revisión.')) }
    finally { setBusy(null) }
  }
  return <section className="flex flex-col gap-4"><div><h2 className="font-display text-xl font-extrabold text-ink">Solicitudes de aprobación</h2><p className="mt-1 text-sm text-ink/50">Revisá las materias que los estudiantes informan como aprobadas.</p></div>
    {error && <ErrorMessage message={error} onRetry={load} />}
    {!error && items.length === 0 && <div className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink/55">No hay solicitudes pendientes.</div>}
    <ul className="flex flex-col gap-3">{items.map(i => <li key={i.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-4"><div><p className="font-bold text-ink">{i.materia} <span className="text-xs text-ink/45">{i.materia_codigo}</span></p><p className="mt-1 text-sm text-ink/55">{i.estudiante} · Legajo {i.legajo} · Comisión {i.comision}</p></div><div className="flex gap-2"><button disabled={busy===i.id} onClick={()=>review(i.id,'solicitud_rechazada')} className="rounded-full border border-ink/15 px-3 py-2 text-xs font-bold text-ink/65 disabled:opacity-50">Observar</button><button disabled={busy===i.id} onClick={()=>review(i.id,'aprobada')} className="rounded-full bg-cobalt px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Aprobar</button></div></li>)}</ul>
  </section>
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
    <section>
      <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-cobalt">Campus Inteligente</p><h2 className="mt-1 font-display text-xl font-extrabold text-ink">Actividad general</h2></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(([label, value], index) => (
          <div key={label} className={`rounded-2xl border border-ink/10 border-t-[3px] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5 ${index % 3 === 1 ? 'border-t-amber' : 'border-t-cobalt'}`}>
            <p className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{value}</p>
            <p className="mt-2 text-xs font-semibold leading-4 text-ink/50 sm:text-sm">{label}</p>
          </div>
        ))}
      </div>
    </section>
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
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [estado, setEstado] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .get<AttendanceAdmin[]>('/admin/attendances', { params: { limit: 1000, desde: desde || undefined, hasta: hasta || undefined, estado: estado || undefined } })
      .then((res) => setRows(res.data))
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar las asistencias.')))
      .finally(() => setLoading(false))
  }, [desde, hasta, estado])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} onRetry={load} />

  const normalizedSearch = search.trim().toLocaleLowerCase('es')
  const filteredRows = rows.filter((row) => !normalizedSearch ||
    `${row.estudiante} ${row.legajo} ${row.materia} ${row.comision} ${row.aula}`.toLocaleLowerCase('es').includes(normalizedSearch))
  const count = (status: string) => filteredRows.filter((row) => row.estado === status).length

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.15em] text-cobalt">Registro académico</p><h2 className="mt-1 font-display text-xl font-extrabold text-ink">Asistencias del campus</h2></div>
        <button type="button" onClick={() => downloadCsv('asistencias-campus.csv',
          ['Fecha', 'Hora', 'Estudiante', 'Legajo', 'Materia', 'Comisión', 'Aula', 'Estado'],
          filteredRows.map((row) => [row.fecha, row.hora, row.estudiante, row.legajo, row.materia, row.comision, row.aula, row.estado])
        )} disabled={filteredRows.length === 0} className="rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cobalt disabled:cursor-not-allowed disabled:opacity-40">Exportar filtradas ↓</button>
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[['Registros', filteredRows.length], ['Presentes', count('presente')], ['Tarde', count('tarde')], ['Ausentes', count('ausente')]].map(([label, value]) => <div key={label} className="rounded-2xl bg-paper p-3"><p className="font-display text-2xl font-extrabold text-ink">{value}</p><p className="text-xs font-semibold text-ink/50">{label}</p></div>)}
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input aria-label="Buscar asistencia" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Estudiante, materia, aula…" className="rounded-xl border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus:border-cobalt" />
        <label className="text-xs font-semibold text-ink/50">Desde<input aria-label="Desde" type="date" value={desde} max={hasta || undefined} onChange={e=>setDesde(e.target.value)} className="mt-1 block w-full rounded-xl border border-ink/15 bg-paper px-3 py-2 text-sm text-ink" /></label>
        <label className="text-xs font-semibold text-ink/50">Hasta<input aria-label="Hasta" type="date" value={hasta} min={desde || undefined} onChange={e=>setHasta(e.target.value)} className="mt-1 block w-full rounded-xl border border-ink/15 bg-paper px-3 py-2 text-sm text-ink" /></label>
        <select aria-label="Filtrar por estado" value={estado} onChange={e=>setEstado(e.target.value)} className="rounded-xl border border-ink/15 bg-paper px-3 py-2 text-sm"><option value="">Todos los estados</option><option value="presente">Presente</option><option value="tarde">Tarde</option><option value="ausente">Ausente</option></select>
      </div>
      {filteredRows.length === 0 ? (
        <p className="text-ink/40 text-sm">Todavía no hay asistencias registradas.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink/5">
          {filteredRows.map((r, i) => (
            <li key={`${r.fecha}-${r.hora}-${r.legajo}-${i}`} className="py-2.5 flex justify-between items-center text-sm gap-2">
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
