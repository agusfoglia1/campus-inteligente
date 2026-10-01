import { useCallback, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import AppHeader from '../components/AppHeader'

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

const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

function formatHora(hora: string) {
  return hora.slice(0, 5)
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function MyClasses() {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .get<ClassInfo[]>('/students/me/materias')
      .then((res) => setClasses(res.data))
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar tus materias.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const porDia = ORDEN_DIAS.map((dia) => ({
    dia,
    clases: classes
      .filter((c) => c.dia === dia)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
  })).filter((grupo) => grupo.clases.length > 0)

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader backTo={{ to: '/dashboard', label: 'Dashboard' }} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        <h1 className="font-display text-2xl text-ink">Mis materias y horarios</h1>

        {loading && <Spinner />}
        {error && <ErrorMessage message={error} onRetry={load} />}

        {!loading && !error && classes.length === 0 && (
          <div className="bg-white rounded-xl border border-ink/10 p-6 text-ink/40 text-center">
            No estás inscripta en ninguna materia todavía.
          </div>
        )}

        {porDia.map((grupo) => (
          <div key={grupo.dia} className="border-l-4 border-cobalt bg-white rounded-r-xl p-5">
            <p className="font-display text-lg text-ink mb-3">{capitalize(grupo.dia)}</p>
            <ul className="flex flex-col divide-y divide-ink/5">
              {grupo.clases.map((c) => (
                <li key={c.commission_id} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-medium text-ink">{c.materia}</p>
                  <p className="text-ink/50 text-sm">
                    {formatHora(c.hora_inicio)}–{formatHora(c.hora_fin)} · Aula {c.aula} (
                    {c.edificio})
                  </p>
                  {c.docente && <p className="text-ink/40 text-sm">{c.docente}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
