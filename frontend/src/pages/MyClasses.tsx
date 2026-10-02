import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import AppHeader from '../components/AppHeader'
import { downloadCsv, downloadIcs } from '../lib/exportCsv'

interface ClassInfo {
  commission_id: string
  enrollment_id: string
  estado: string
  materia: string
  materia_codigo: string
  docente: string | null
  aula: string
  edificio: string
  dia: string
  hora_inicio: string
  hora_fin: string
}

const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

function formatHora(hora: string) {
  return hora.slice(0, 5)
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
}

export default function MyClasses() {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .get<ClassInfo[]>('/students/me/materias-inscriptas')
      .then((res) => setClasses(res.data))
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar tus materias.')))
      .finally(() => setLoading(false))
  }, [])

  const approveSubject = async (commissionId: string) => {
    setApprovingId(commissionId)
    setActionError('')
    try {
      await api.post(`/students/me/materias/${commissionId}/solicitar-aprobacion`)
      setClasses((current) =>
        current.map((item) =>
          item.commission_id === commissionId ? { ...item, estado: 'pendiente_aprobacion' } : item
        )
      )
    } catch (err) {
      setActionError(getErrorMessage(err, 'No se pudo marcar la materia como aprobada.'))
    } finally {
      setApprovingId(null)
    }
  }

  useEffect(() => {
    load()
  }, [load])

  const normalizedQuery = normalizeSearch(query.trim())
  const filteredClasses = classes.filter((item) =>
    [item.materia, item.materia_codigo, item.docente, item.aula, item.edificio, item.dia]
      .some((value) => value && normalizeSearch(value).includes(normalizedQuery))
  )
  const porDia = ORDEN_DIAS.map((dia) => ({
    dia,
    clases: filteredClasses
      .filter((c) => c.dia === dia)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
  })).filter((grupo) => grupo.clases.length > 0)

  const exportSchedule = () => downloadCsv('mi-agenda-campus.csv',
    ['Día', 'Materia', 'Código', 'Inicio', 'Fin', 'Aula', 'Edificio', 'Docente', 'Estado'],
    classes.map((item) => [item.dia, item.materia, item.materia_codigo,
      formatHora(item.hora_inicio), formatHora(item.hora_fin), item.aula, item.edificio, item.docente, item.estado])
  )

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader backTo={{ to: '/dashboard', label: 'Dashboard' }} />
      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-7 sm:px-6 sm:py-10">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-cobalt">Tu recorrido académico</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Mis materias</h1>
            <p className="mt-2 text-sm text-ink/50">Consultá tus horarios y seguí el estado de cada cursada.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/mapa" className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:border-cobalt hover:text-cobalt">Ver mapa ↗</Link>
            <button type="button" onClick={exportSchedule} disabled={classes.length === 0} className="rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cobalt disabled:cursor-not-allowed disabled:opacity-40">Descargar agenda ↓</button>
            <button type="button" onClick={() => downloadIcs(classes)} disabled={classes.length === 0} className="rounded-full border border-cobalt/30 bg-white px-4 py-2.5 text-sm font-bold text-cobalt disabled:opacity-40">Añadir al calendario</button>
          </div>
        </section>

        {!loading && !error && classes.length > 0 && (
          <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-white px-3 py-2 text-ink/60">{new Set(classes.map((item) => item.commission_id)).size} materias</span>
              <span className="rounded-full bg-signal-soft px-3 py-2 text-signal">{new Set(classes.filter((item) => item.estado === 'aprobada').map((item) => item.commission_id)).size} aprobadas</span>
            </div>
            <label className="relative w-full sm:max-w-xs">
              <span className="sr-only">Buscar en mis materias</span>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar materia, aula o día…"
                className="w-full rounded-full border border-ink/10 bg-white py-2.5 pl-4 pr-10 text-sm outline-none placeholder:text-ink/35 focus:border-cobalt focus:ring-4 focus:ring-cobalt/10" />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink/35" aria-hidden="true">⌕</span>
            </label>
          </section>
        )}

        {loading && <Spinner />}
        {error && <ErrorMessage message={error} onRetry={load} />}
        {actionError && <ErrorMessage message={actionError} />}

        {!loading && !error && classes.length === 0 && (
          <div className="rounded-3xl border border-ink/10 bg-white p-9 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cobalt-soft font-display text-xl font-extrabold text-cobalt">01</span>
            <p className="mt-4 font-display text-xl font-extrabold text-ink">Tu agenda empieza acá</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/50">Todavía no estás inscripta en ninguna materia. Cuando tengas comisiones asignadas, aparecerán en esta sección.</p>
          </div>
        )}

        {filteredClasses.length === 0 && classes.length > 0 && (
          <div className="rounded-2xl border border-ink/10 bg-white p-5 text-sm text-ink/50">No encontramos materias que coincidan con “{query}”.</div>
        )}

        {porDia.map((grupo) => (
          <section key={grupo.dia} className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-ink/5 bg-white px-5 py-4 sm:px-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-soft text-sm font-extrabold text-ink">{grupo.clases.length.toString().padStart(2, '0')}</span>
              <div><p className="font-display text-lg font-extrabold text-ink">{capitalize(grupo.dia)}</p><p className="text-xs text-ink/45">{grupo.clases.length} {grupo.clases.length === 1 ? 'clase' : 'clases'}</p></div>
            </div>
            <ul className="flex flex-col divide-y divide-ink/5 px-5 sm:px-6">
              {grupo.clases.map((c) => (
                <li key={c.commission_id} className="flex gap-4 py-4">
                  <div className="w-[4.25rem] shrink-0 border-r border-ink/10 pr-3 pt-0.5 text-sm font-bold tabular-nums text-cobalt">{formatHora(c.hora_inicio)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="font-display text-lg font-extrabold text-ink">{c.materia}</p><p className="mt-1 text-sm text-ink/50">{formatHora(c.hora_inicio)}–{formatHora(c.hora_fin)} · Aula {c.aula} · {c.edificio}</p>{c.docente && <p className="mt-1 text-xs text-ink/40">Docente · {c.docente}</p>}<Link to={`/mapa?destino=${encodeURIComponent(c.edificio)}`} className="mt-2 inline-block text-xs font-bold text-cobalt hover:underline">Cómo llegar al edificio ↗</Link></div>
                      <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-ink/45">{c.materia_codigo}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    {c.estado === 'aprobada' ? (
                      <span className="rounded-full bg-signal-soft px-3 py-1 text-xs font-bold text-signal">
                        Aprobada
                      </span>
                    ) : c.estado === 'pendiente_aprobacion' ? (
                      <span className="rounded-full bg-amber-soft px-3 py-1 text-xs font-bold text-ink/70">En revisión</span>
                    ) : c.estado === 'solicitud_rechazada' ? (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">Solicitud observada</span>
                    ) : (
                      <span className="rounded-full bg-cobalt-soft px-3 py-1 text-xs font-bold text-ink/65">En curso</span>
                    )}
                    {!['aprobada', 'pendiente_aprobacion'].includes(c.estado) && (
                      <button
                        type="button"
                        onClick={() => approveSubject(c.commission_id)}
                        disabled={approvingId === c.commission_id}
                        className="rounded-full border border-cobalt/30 px-3.5 py-2 text-xs font-bold text-ink transition hover:bg-cobalt hover:text-white disabled:cursor-wait disabled:opacity-50"
                      >
                        {approvingId === c.commission_id ? 'Enviando…' : c.estado === 'solicitud_rechazada' ? 'Volver a solicitar' : 'Solicitar aprobación'}
                      </button>
                    )}
                  </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  )
}
