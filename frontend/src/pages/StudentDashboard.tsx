import { useCallback, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import Badge, { toneForEstado } from '../components/Badge'
import { Link } from 'react-router-dom'
import { EmptyState, Stat } from '../components/ui'

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
  const [classAlertsEnabled, setClassAlertsEnabled] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window &&
    Notification.permission === 'granted' && localStorage.getItem('class-alerts-enabled') === 'true'
  )
  const [classAlertMessage, setClassAlertMessage] = useState('')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

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

  useEffect(() => {
    const next = data?.proxima_clase
    if (!classAlertsEnabled || !next || !('Notification' in window) || Notification.permission !== 'granted') return

    const startsAt = new Date(`${next.fecha}T${next.hora_inicio}`).getTime()
    const reminderKey = `${next.commission_id}:${next.fecha}:${next.hora_inicio}`
    const reminderAt = startsAt - 15 * 60 * 1000
    const timeout = window.setTimeout(() => {
      if (localStorage.getItem('class-alert-last') !== reminderKey && Notification.permission === 'granted') {
        const minutes = Math.max(1, Math.ceil((startsAt - Date.now()) / 60000))
        new Notification(`Próxima clase: ${next.materia}`, {
          body: `Empieza en ${minutes} min · Aula ${next.aula} · ${next.edificio}`,
          tag: reminderKey,
        })
        localStorage.setItem('class-alert-last', reminderKey)
      }
      api.get<StudentDashboardData>('/students/me/dashboard').then((res) => setData(res.data))
    }, Math.max(0, reminderAt - Date.now()))

    return () => window.clearTimeout(timeout)
  }, [classAlertsEnabled, data?.proxima_clase?.commission_id, data?.proxima_clase?.fecha, data?.proxima_clase?.hora_inicio])

  async function toggleClassAlerts() {
    setClassAlertMessage('')
    if (classAlertsEnabled) {
      localStorage.removeItem('class-alerts-enabled')
      setClassAlertsEnabled(false)
      setClassAlertMessage('Avisos desactivados.')
      return
    }
    if (!('Notification' in window)) {
      setClassAlertMessage('Este navegador no admite notificaciones.')
      return
    }
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setClassAlertMessage('No se habilitaron las notificaciones. Podés cambiar el permiso desde el navegador.')
        return
      }
      localStorage.setItem('class-alerts-enabled', 'true')
      setClassAlertsEnabled(true)
      setClassAlertMessage('Listo: recibirás un aviso 15 minutos antes. Campus debe permanecer abierto.')
    } catch {
      setClassAlertMessage('No se pudo activar el permiso de notificaciones en este navegador.')
    }
  }

  if (loading) return <Spinner label="Cargando tu inicio..." />
  if (error) return <ErrorMessage message={error} onRetry={load} />
  if (!data) return null

  const asistencia = data.porcentaje_asistencia ?? 0
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buen día' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nextClassMinutes = data.proxima_clase
    ? Math.max(0, Math.ceil((new Date(`${data.proxima_clase.fecha}T${data.proxima_clase.hora_inicio}`).getTime() - now.getTime()) / 60_000))
    : null
  const getLiveState = (classInfo: ClassInfo) => {
    const [startHour, startMinute] = classInfo.hora_inicio.split(':').map(Number)
    const [endHour, endMinute] = classInfo.hora_fin.split(':').map(Number)
    const current = now.getHours() * 60 + now.getMinutes()
    const start = startHour * 60 + startMinute
    const end = endHour * 60 + endMinute
    if (current >= end) return { label: 'Terminada', tone: 'neutral' }
    if (current >= start) return { label: 'En curso', tone: 'signal' }
    const minutes = start - current
    return { label: minutes < 60 ? `Empieza en ${minutes} min` : 'Próxima', tone: 'amber' }
  }

  return (
    <div className="stagger-in flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.65fr_.8fr]">
        <section className="relative isolate overflow-hidden rounded-3xl border border-ink/10 bg-white p-5 shadow-sm sm:p-7">
          <div className="campus-dots absolute -right-2 -top-2 h-28 w-28 opacity-50" />
          <div className="relative">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-cobalt">{greeting}, {data.nombre.split(' ')[0]} · Tu agenda</p>
              <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/50">Legajo {data.legajo}</span>
            </div>
            {data.proxima_clase ? (
              <>
                <p className="text-sm font-medium capitalize text-ink/50">Próxima clase · {data.proxima_clase.dia}</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{data.proxima_clase.materia}</h2>
                {nextClassMinutes !== null && nextClassMinutes > 0 && <p className="mt-1 text-sm font-bold text-cobalt-strong">Empieza en {nextClassMinutes} min</p>}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-lg">
                  <div className="rounded-2xl bg-paper p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/40">Horario</p>
                    <p className="mt-1 font-display text-lg font-extrabold text-ink">{formatHora(data.proxima_clase.hora_inicio)}–{formatHora(data.proxima_clase.hora_fin)}</p>
                  </div>
                  <div className="rounded-2xl bg-cobalt-soft/70 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/40">Aula</p>
                    <p className="mt-1 truncate font-display text-lg font-extrabold text-ink">{data.proxima_clase.aula}</p>
                    <p className="truncate text-xs text-ink/50">{data.proxima_clase.edificio}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  {data.proxima_clase.docente && <p className="text-sm text-ink/50">Docente · {data.proxima_clase.docente}</p>}
                  <Link to={`/mapa?destino=${encodeURIComponent(data.proxima_clase.edificio)}`} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-cobalt transition hover:bg-cobalt-soft">Cómo llegar <span aria-hidden="true">↗</span></Link>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-paper p-3.5">
                  <div><p className="text-sm font-bold text-ink">Avisos de clase</p><p className="mt-0.5 text-xs text-ink/50">Recordatorio 15 minutos antes de la próxima clase.</p></div>
                  <button type="button" onClick={toggleClassAlerts} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-cobalt shadow-sm transition hover:bg-cobalt hover:text-white">{classAlertsEnabled ? 'Desactivar avisos' : 'Activar avisos'}</button>
                  {classAlertMessage && <p role="status" className="w-full text-xs text-ink/65">{classAlertMessage}</p>}
                </div>
              </>
            ) : (
              <div className="rounded-2xl bg-paper p-5">
                <p className="font-display text-xl font-extrabold text-ink">Tu agenda está despejada</p>
                <p className="mt-1 text-sm text-ink/50">No tenés próximas clases cargadas.</p>
                <Link to="/materias" className="mt-3 inline-block text-sm font-bold text-cobalt">Ver mis materias →</Link>
              </div>
            )}
          </div>
        </section>

        <section className="flex items-center gap-5 rounded-3xl bg-cobalt-soft/70 p-5 sm:p-7 lg:flex-col lg:justify-center lg:gap-3 lg:text-center">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white shadow-sm sm:h-28 sm:w-28">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="43" fill="none" stroke="#dbe9e7" strokeWidth="7" />
              {data.porcentaje_asistencia !== null && <circle cx="50" cy="50" r="43" fill="none" stroke="#48aeb0" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${Math.min(asistencia, 100) * 2.7} 270`} style={{ transition: 'stroke-dasharray 800ms ease' }} />}
            </svg>
            <Stat label="Asistencia" value={data.porcentaje_asistencia === null ? null : asistencia} suffix="%" className="absolute inset-0 items-center justify-center bg-transparent p-0 text-center [&>p]:sr-only [&>strong]:text-2xl [&>strong]:text-ink" />
          </div>
          <div>
            <p className="font-display text-lg font-extrabold text-ink">Asistencia</p>
            <p className="mt-1 max-w-xs text-sm leading-5 text-ink/55">Tu recorrido de presencia en las clases registradas.</p>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-cobalt">Hoy en el campus</p><h2 className="mt-1 font-display text-xl font-extrabold text-ink">Materias de hoy</h2></div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-soft text-lg" aria-hidden="true">◷</span>
          </div>
          {data.materias_del_dia.length === 0 ? (
            <EmptyState title="Hoy tenés el día libre" description="No hay clases programadas. Disfrutá tu día en el campus." />
          ) : (
            <ul className="divide-y divide-ink/5">
              {data.materias_del_dia.map((c) => {
                const live = getLiveState(c)
                return <li key={c.commission_id} className="flex gap-4 py-4 first:pt-1 last:pb-1">
                  <div className="w-16 shrink-0 border-r border-ink/10 pr-3 text-sm font-bold tabular-nums text-cobalt">{formatHora(c.hora_inicio)}</div>
                  <div className="min-w-0 flex-1"><p className="truncate font-bold text-ink">{c.materia}</p><p className="mt-1 text-xs text-ink/50">Hasta {formatHora(c.hora_fin)} · Aula {c.aula}</p></div>
                  <Badge tone={live.tone as 'neutral' | 'signal' | 'amber'}>{live.label}</Badge>
                  <span className="hidden self-center rounded-full bg-paper px-2.5 py-1 text-xs text-ink/50 sm:inline">{c.edificio}</span>
                </li>
              })}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-cobalt">Registro académico</p><h2 className="mt-1 font-display text-xl font-extrabold text-ink">Actividad reciente</h2></div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cobalt-soft text-lg" aria-hidden="true">↗</span>
          </div>
          {data.historial_reciente.length === 0 ? (
            <EmptyState title="Tu historial empieza acá" description="Cuando se registre tu primera asistencia, vas a verla en esta sección." />
          ) : (
            <ul className="divide-y divide-ink/5">
              {data.historial_reciente.slice(0, 5).map((h, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1">
                  <div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{h.materia}</p><p className="mt-1 text-xs text-ink/50">{h.fecha} · {formatHora(h.hora)} · {h.aula}</p></div>
                  <Badge tone={toneForEstado(h.estado)}>{h.estado}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
