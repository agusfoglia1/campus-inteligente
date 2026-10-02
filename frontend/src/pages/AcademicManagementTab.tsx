import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, getErrorMessage } from '../lib/api'
import ErrorMessage from '../components/ErrorMessage'
import Spinner from '../components/Spinner'

type Resource = 'buildings' | 'classrooms' | 'careers' | 'subjects' | 'commissions' | 'schedule-slots'
type Item = { id: string; [key: string]: unknown }
type Field = {
  name: string
  label: string
  type?: 'text' | 'number' | 'time' | 'select'
  required?: boolean
  options?: { id: string; label: string }[]
}

interface Building extends Item { nombre: string; ubicacion: string | null; latitude: number | null; longitude: number | null }
interface Classroom extends Item { codigo: string; building_id: string; capacidad: number | null }
interface Career extends Item { nombre: string; codigo: string }
interface Subject extends Item { nombre: string; codigo: string; career_id: string }
interface Commission extends Item { codigo: string; subject_id: string; teacher_profile_id: string | null; estado: string }
interface ScheduleSlot extends Item { commission_id: string; classroom_id: string; dia: string; hora_inicio: string; hora_fin: string }
interface TeacherProfile extends Item { user_id: string; legajo_docente: string | null }

const RESOURCES: { id: Resource; label: string }[] = [
  { id: 'buildings', label: 'Edificios' },
  { id: 'classrooms', label: 'Aulas' },
  { id: 'careers', label: 'Carreras' },
  { id: 'subjects', label: 'Materias' },
  { id: 'commissions', label: 'Comisiones' },
  { id: 'schedule-slots', label: 'Horarios' },
]

const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].map((day) => ({ id: day, label: day }))

const EMPTY_DATA: Record<Resource, Item[]> = {
  buildings: [], classrooms: [], careers: [], subjects: [], commissions: [], 'schedule-slots': [],
}

function text(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

export default function AcademicManagementTab() {
  const [resource, setResource] = useState<Resource>('careers')
  const [data, setData] = useState<Record<Resource, Item[]>>(EMPTY_DATA)
  const [teachers, setTeachers] = useState<TeacherProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [editing, setEditing] = useState<Item | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const buildings = data.buildings as Building[]
  const classrooms = data.classrooms as Classroom[]
  const careers = data.careers as Career[]
  const subjects = data.subjects as Subject[]
  const commissions = data.commissions as Commission[]
  const slots = data['schedule-slots'] as ScheduleSlot[]

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [buildingRows, classroomRows, careerRows, subjectRows, commissionRows, slotRows, teacherRows] = await Promise.all([
        api.get<Building[]>('/academic/buildings'),
        api.get<Classroom[]>('/academic/classrooms'),
        api.get<Career[]>('/academic/careers'),
        api.get<Subject[]>('/academic/subjects'),
        api.get<Commission[]>('/academic/commissions'),
        api.get<ScheduleSlot[]>('/academic/schedule-slots'),
        api.get<TeacherProfile[]>('/academic/teacher-profiles'),
      ])
      setData({
        buildings: buildingRows.data, classrooms: classroomRows.data, careers: careerRows.data,
        subjects: subjectRows.data, commissions: commissionRows.data, 'schedule-slots': slotRows.data,
      })
      setTeachers(teacherRows.data)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los datos académicos.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const subjectOptions = useMemo(() => subjects.map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}` })), [subjects])
  const commissionOptions = useMemo(() => commissions.map((item) => {
    const subject = subjects.find((row) => row.id === item.subject_id)
    return { id: item.id, label: `${subject?.nombre ?? 'Materia'} · Comisión ${item.codigo}` }
  }), [commissions, subjects])
  const classroomOptions = useMemo(() => classrooms.map((item) => {
    const building = buildings.find((row) => row.id === item.building_id)
    return { id: item.id, label: `${item.codigo} · ${building?.nombre ?? 'Edificio'}` }
  }), [classrooms, buildings])

  function optionsFor(field: string) {
    if (field === 'building_id') return buildings.map((item) => ({ id: item.id, label: item.nombre }))
    if (field === 'career_id') return careers.map((item) => ({ id: item.id, label: item.nombre }))
    if (field === 'subject_id') return subjectOptions
    if (field === 'commission_id') return commissionOptions
    if (field === 'classroom_id') return classroomOptions
    if (field === 'teacher_profile_id') return teachers.map((item) => ({ id: item.id, label: item.legajo_docente || item.user_id }))
    if (field === 'dia') return DAYS
    if (field === 'estado') return ['activa', 'finalizada', 'cancelada'].map((id) => ({ id, label: id }))
    return []
  }

  function fieldsFor(kind: Resource): Field[] {
    if (kind === 'buildings') return [
      { name: 'nombre', label: 'Nombre', required: true },
      { name: 'ubicacion', label: 'Ubicación o referencia' },
      { name: 'latitude', label: 'Latitud', type: 'number' },
      { name: 'longitude', label: 'Longitud', type: 'number' },
    ]
    if (kind === 'classrooms') return [
      { name: 'codigo', label: 'Código del aula', required: true },
      { name: 'building_id', label: 'Edificio', type: 'select', required: true, options: optionsFor('building_id') },
      { name: 'capacidad', label: 'Capacidad', type: 'number' },
    ]
    if (kind === 'careers') return [
      { name: 'nombre', label: 'Nombre', required: true },
      { name: 'codigo', label: 'Código', required: true },
    ]
    if (kind === 'subjects') return [
      { name: 'nombre', label: 'Nombre', required: true },
      { name: 'codigo', label: 'Código', required: true },
      { name: 'career_id', label: 'Carrera', type: 'select', required: true, options: optionsFor('career_id') },
    ]
    if (kind === 'commissions') return [
      { name: 'codigo', label: 'Código de comisión', required: true },
      { name: 'subject_id', label: 'Materia', type: 'select', required: true, options: optionsFor('subject_id') },
      { name: 'teacher_profile_id', label: 'Docente (opcional)', type: 'select', options: optionsFor('teacher_profile_id') },
      { name: 'estado', label: 'Estado', type: 'select', required: true, options: optionsFor('estado') },
    ]
    return [
      { name: 'commission_id', label: 'Comisión', type: 'select', required: true, options: optionsFor('commission_id') },
      { name: 'classroom_id', label: 'Aula', type: 'select', required: true, options: optionsFor('classroom_id') },
      { name: 'dia', label: 'Día', type: 'select', required: true, options: optionsFor('dia') },
      { name: 'hora_inicio', label: 'Hora de inicio', type: 'time', required: true },
      { name: 'hora_fin', label: 'Hora de fin', type: 'time', required: true },
    ]
  }

  function openCreate() {
    setEditing(null)
    setForm({ estado: 'activa' })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(item: Item) {
    const values: Record<string, string> = {}
    for (const field of fieldsFor(resource)) {
      const value = item[field.name]
      values[field.name] = value == null ? '' : field.type === 'time' ? String(value).slice(0, 5) : String(value)
    }
    setEditing(item)
    setForm(values)
    setFormError('')
    setShowForm(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    const fields = fieldsFor(resource)
    const body: Record<string, unknown> = {}
    for (const field of fields) {
      const value = form[field.name] ?? ''
      if (!value && field.name === 'teacher_profile_id') body[field.name] = null
      else if (value === '') continue
      else if (field.type === 'number') body[field.name] = Number(value)
      else body[field.name] = value
    }
    try {
      if (editing) await api.put(`/academic/${resource}/${editing.id}`, body)
      else await api.post(`/academic/${resource}`, body)
      setShowForm(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo guardar. Revisá que los datos sean válidos y no estén repetidos.'))
    } finally {
      setSaving(false)
    }
  }

  async function removeItem(item: Item) {
    if (!window.confirm('¿Eliminar este registro? Si está relacionado con otros datos, el servidor puede impedirlo.')) return
    setError('')
    try {
      await api.delete(`/academic/${resource}/${item.id}`)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar. Puede estar asociado a otros registros.'))
    }
  }

  function labelFor(kind: Resource, item: Item) {
    if (kind === 'buildings') return text(item.nombre)
    if (kind === 'classrooms') return `${text(item.codigo)} · ${text(buildings.find((row) => row.id === item.building_id)?.nombre)}`
    if (kind === 'careers') return `${text(item.nombre)} · ${text(item.codigo)}`
    if (kind === 'subjects') return `${text(item.nombre)} · ${text(item.codigo)} · ${text(careers.find((row) => row.id === item.career_id)?.nombre)}`
    if (kind === 'commissions') return `${text(subjects.find((row) => row.id === item.subject_id)?.nombre)} · Comisión ${text(item.codigo)} · ${text(item.estado)}`
    const slot = item as ScheduleSlot
    const commission = commissions.find((row) => row.id === slot.commission_id)
    const classroom = classrooms.find((row) => row.id === slot.classroom_id)
    return `${text(subjects.find((row) => row.id === commission?.subject_id)?.nombre)} · ${text(slot.dia)} ${text(slot.hora_inicio).slice(0, 5)}–${text(slot.hora_fin).slice(0, 5)} · Aula ${text(classroom?.codigo)}`
  }

  if (loading) return <Spinner />

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl text-ink">Gestión académica</h2>
        <p className="text-sm text-ink/50 mt-1">Administrá la estructura del campus y sus horarios.</p>
      </div>

      <div className="flex gap-1 bg-white rounded-xl border border-ink/10 p-1 overflow-x-auto">
        {RESOURCES.map((item) => (
          <button key={item.id} onClick={() => { setResource(item.id); setShowForm(false); setError('') }}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${resource === item.id ? 'bg-ink text-paper' : 'text-ink/60 hover:bg-paper'}`}>
            {item.label}
          </button>
        ))}
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}

      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="font-display text-lg text-ink">{RESOURCES.find((item) => item.id === resource)?.label}</h3>
        <button onClick={showForm ? () => setShowForm(false) : openCreate}
          className="text-sm bg-cobalt text-white px-3 py-2 rounded-lg hover:bg-ink transition-colors">
          {showForm ? 'Cancelar' : 'Nuevo registro'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border-l-4 border-cobalt bg-white rounded-r-xl p-5 flex flex-col gap-3">
          <p className="font-medium text-ink">{editing ? 'Editar registro' : 'Crear registro'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fieldsFor(resource).map((field) => (
              <label key={field.name} className="flex flex-col gap-1 text-sm text-ink/70">
                {field.label}
                {field.type === 'select' ? (
                  <select required={field.required} value={form[field.name] ?? ''}
                    onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                    className="border border-ink/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt">
                    <option value="">Elegir…</option>
                    {(field.options ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                ) : (
                  <input type={field.type ?? 'text'} required={field.required} value={form[field.name] ?? ''}
                    step={field.type === 'number' ? 'any' : undefined}
                    onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                    className="border border-ink/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt" />
                )}
              </label>
            ))}
          </div>
          {formError && <p className="text-brick text-sm">{formError}</p>}
          <button type="submit" disabled={saving} className="bg-cobalt text-white rounded-lg py-2 text-sm font-medium hover:bg-ink transition-colors disabled:opacity-50">
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-ink/10 p-5">
        {data[resource].length === 0 ? (
          <p className="text-ink/40 text-sm">Todavía no hay registros en esta sección.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-ink/5">
            {data[resource].map((item) => (
              <li key={item.id} className="py-3 flex flex-wrap justify-between items-center gap-3 text-sm">
                <div className="min-w-0"><p className="font-medium text-ink">{labelFor(resource, item)}</p>
                  {resource === 'buildings' && <p className="text-ink/45">{text(item.ubicacion)} · {text(item.latitude)}, {text(item.longitude)}</p>}
                  {resource === 'classrooms' && <p className="text-ink/45">Capacidad: {text(item.capacidad)}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(item)} className="rounded-lg border border-ink/15 px-3 py-1.5 text-ink/70 hover:bg-paper">Editar</button>
                  <button onClick={() => void removeItem(item)} className="rounded-lg border border-brick/20 px-3 py-1.5 text-brick hover:bg-brick/5">Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {slots.length > 0 && resource === 'schedule-slots' && <p className="text-xs text-ink/40">Los horarios se pueden editar o eliminar desde esta lista.</p>}
    </div>
  )
}
