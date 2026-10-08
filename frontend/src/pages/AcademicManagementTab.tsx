import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, getErrorMessage } from '../lib/api'
import ErrorMessage from '../components/ErrorMessage'
import Spinner from '../components/Spinner'
import { Button, Drawer, EmptyState, Tabs } from '../components/ui'
import { useToast } from '../components/toast'
import { unrafCurricula } from '../data/unrafCurricula'

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
  const [query, setQuery] = useState('')
  const [sortAscending, setSortAscending] = useState(true)
  const [importingCatalog, setImportingCatalog] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const notify = useToast()

  const buildings = data.buildings as Building[]
  const classrooms = data.classrooms as Classroom[]
  const careers = data.careers as Career[]
  const subjects = data.subjects as Subject[]
  const commissions = data.commissions as Commission[]
  const slots = data['schedule-slots'] as ScheduleSlot[]

  function normalizedName(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g, ' ').trim()
  }

  async function importOfficialCatalog() {
    const subjectTotal = unrafCurricula.reduce((total, program) => total + program.subjects.length, 0)
    if (!window.confirm(`Se agregarán las carreras y materias oficiales que falten en la base académica (hasta ${unrafCurricula.length} carreras y ${subjectTotal} materias). Los registros existentes no se modificarán. ¿Continuar?`)) return
    setImportingCatalog(true)
    setImportProgress('Preparando catálogo…')
    let createdCareers = 0
    let createdSubjects = 0
    let skippedSubjects = 0
    const failures: string[] = []
    let knownCareers = [...careers]
    let knownSubjects = [...subjects]
    try {
      for (const [programIndex, program] of unrafCurricula.entries()) {
        setImportProgress(`Carrera ${programIndex + 1} de ${unrafCurricula.length}: ${program.name}`)
        let career = knownCareers.find((item) => normalizedName(item.nombre) === normalizedName(program.name))
        if (!career) {
          const usedCodes = new Set(knownCareers.map((item) => item.codigo.toLocaleUpperCase()))
          let code = program.code
          let suffix = 2
          while (usedCodes.has(code.toLocaleUpperCase())) code = `${program.code}-${suffix++}`
          try {
            const response = await api.post<Career>('/academic/careers', { nombre: program.name, codigo: code })
            career = response.data
            knownCareers.push(career)
            createdCareers += 1
          } catch (err) {
            failures.push(`${program.name}: ${getErrorMessage(err, 'no se pudo crear la carrera')}`)
            continue
          }
        }

        const missing = program.subjects.flatMap((name, index) => {
          const exists = knownSubjects.some((item) => item.career_id === career?.id && normalizedName(item.nombre) === normalizedName(name))
          if (exists) { skippedSubjects += 1; return [] }
          const baseCode = `${program.code}-M${String(index + 1).padStart(3, '0')}`
          const usedCodes = new Set(knownSubjects.map((item) => item.codigo.toLocaleUpperCase()))
          let code = baseCode
          let suffix = 2
          while (usedCodes.has(code.toLocaleUpperCase())) code = `${baseCode}-${suffix++}`
          return [{ nombre: name, codigo: code, career_id: career!.id }]
        })
        for (let offset = 0; offset < missing.length; offset += 8) {
          const batch = missing.slice(offset, offset + 8)
          const results = await Promise.allSettled(batch.map((body) => api.post<Subject>('/academic/subjects', body)))
          results.forEach((result, batchIndex) => {
            if (result.status === 'fulfilled') {
              knownSubjects.push(result.value.data)
              createdSubjects += 1
            } else {
              failures.push(`${program.name} · ${batch[batchIndex].nombre}: ${getErrorMessage(result.reason, 'no se pudo crear la materia')}`)
            }
          })
        }
      }
      await load()
      notify(`Catálogo cargado: ${createdCareers} carreras y ${createdSubjects} materias nuevas`)
      setImportProgress(`Listo: ${createdCareers} carreras y ${createdSubjects} materias agregadas; ${skippedSubjects} materias ya existían.${failures.length ? ` ${failures.length} registros necesitan revisión.` : ''}`)
      if (failures.length) setError(`Algunos registros no se pudieron importar: ${failures.slice(0, 4).join(' · ')}${failures.length > 4 ? ` · y ${failures.length - 4} más` : ''}`)
    } catch (err) {
      setImportProgress('')
      setError(getErrorMessage(err, 'No se pudo completar la importación. Los registros ya creados permanecen guardados.'))
    } finally {
      setImportingCatalog(false)
    }
  }

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
      notify(editing ? 'Cambios guardados' : 'Registro creado')
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
      notify('Registro eliminado')
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

  const visibleItems = data[resource]
    .filter((item) => labelFor(resource, item).toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')))
    .sort((a, b) => labelFor(resource, a).localeCompare(labelFor(resource, b), 'es') * (sortAscending ? 1 : -1))

  if (loading) return <Spinner />

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl text-ink">Gestión académica</h2>
        <p className="text-sm text-ink/50 mt-1">Administrá la estructura del campus y sus horarios.</p>
      </div>

      <Tabs items={RESOURCES} value={resource} onChange={(value) => { setResource(value as Resource); setShowForm(false); setError('') }} label="Gestión académica" />

      {error && <ErrorMessage message={error} onRetry={load} />}

      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="font-display text-lg text-ink">{RESOURCES.find((item) => item.id === resource)?.label}</h3>
        <div className="flex flex-wrap gap-2">
          {(resource === 'careers' || resource === 'subjects') && <Button variant="secondary" disabled={importingCatalog} onClick={importOfficialCatalog}>{importingCatalog ? 'Cargando catálogo…' : 'Cargar carreras y materias UNRaf'}</Button>}
          <Button variant={showForm ? 'secondary' : 'primary'} disabled={importingCatalog} onClick={showForm ? () => setShowForm(false) : openCreate}>{showForm ? 'Cerrar formulario' : 'Nuevo registro'}</Button>
        </div>
      </div>

      {importProgress && <p role="status" aria-live="polite" className="rounded-xl bg-cobalt-soft px-4 py-3 text-sm text-ink">{importProgress}</p>}

      <Drawer open={showForm} title={editing ? 'Editar registro' : 'Nuevo registro'} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <Button type="submit" loading={saving}>{editing ? 'Guardar cambios' : 'Crear registro'}</Button>
        </form>
      </Drawer>

      <div className="ui-card">
        <div className="mb-4 flex flex-wrap gap-2">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${RESOURCES.find((item) => item.id === resource)?.label.toLocaleLowerCase('es')}…`} aria-label="Buscar registros" className="min-h-11 min-w-0 flex-1 rounded-xl border border-ink/15 bg-paper px-3 text-sm outline-none focus:border-cobalt" />
          <Button variant="secondary" onClick={() => setSortAscending((value) => !value)} aria-label={`Ordenar ${sortAscending ? 'Z a A' : 'A a Z'}`}>Orden {sortAscending ? 'A–Z' : 'Z–A'}</Button>
        </div>
        {data[resource].length === 0 ? (
          <EmptyState title="Todavía no hay registros" description="Creá el primer registro de esta sección para organizar la información académica." action={<Button className="mt-4" onClick={openCreate}>Crear registro</Button>} />
        ) : visibleItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink/50">No encontramos registros que coincidan con “{query}”.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => (
              <li key={item.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-4 text-sm">
                <div className="min-w-0"><p className="font-medium text-ink">{labelFor(resource, item)}</p>
                  {resource === 'buildings' && <p className="text-ink/45">{text(item.ubicacion)} · {text(item.latitude)}, {text(item.longitude)}</p>}
                  {resource === 'classrooms' && <p className="text-ink/45">Capacidad: {text(item.capacidad)}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => openEdit(item)}>Editar</Button>
                  <Button variant="danger" onClick={() => void removeItem(item)}>Eliminar</Button>
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
