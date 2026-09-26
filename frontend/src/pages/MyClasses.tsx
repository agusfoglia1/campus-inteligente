import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'

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
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h1 className="text-xl font-bold text-blue-600">Mis materias y horarios</h1>
          <Link to="/dashboard" className="text-blue-600 text-sm hover:underline">
            ← Volver al dashboard
          </Link>
        </div>

        {loading && <Spinner />}
        {error && <ErrorMessage message={error} onRetry={load} />}

        {!loading && !error && classes.length === 0 && (
          <div className="bg-white rounded-xl shadow p-6 text-slate-500 text-center">
            No estás inscripta en ninguna materia todavía.
          </div>
        )}

        {porDia.map((grupo) => (
          <div key={grupo.dia} className="bg-white rounded-xl shadow p-4">
            <h2 className="text-sm font-semibold text-blue-700 uppercase mb-3">
              {capitalize(grupo.dia)}
            </h2>
            <ul className="flex flex-col divide-y divide-slate-100">
              {grupo.clases.map((c) => (
                <li key={c.commission_id} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-medium text-slate-800">{c.materia}</p>
                  <p className="text-slate-500 text-sm">
                    {formatHora(c.hora_inicio)}–{formatHora(c.hora_fin)} · Aula {c.aula} (
                    {c.edificio})
                  </p>
                  {c.docente && (
                    <p className="text-slate-400 text-sm">Docente: {c.docente}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
