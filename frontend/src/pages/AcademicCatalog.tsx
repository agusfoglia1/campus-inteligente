import { useMemo, useState } from 'react'
import AppHeader from '../components/AppHeader'
import { unrafCurricula } from '../data/unrafCurricula'

export default function AcademicCatalog() {
  const [query, setQuery] = useState('')
  const [selectedCode, setSelectedCode] = useState(unrafCurricula[0]?.code ?? '')
  const filteredPrograms = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es')
    return unrafCurricula.filter((program) =>
      !normalized || program.name.toLocaleLowerCase('es').includes(normalized) ||
      program.subjects.some((subject) => subject.toLocaleLowerCase('es').includes(normalized)),
    )
  }, [query])
  const selected = filteredPrograms.find((program) => program.code === selectedCode) ?? filteredPrograms[0]
  const totalSubjects = selected?.subjects.length ?? 0

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        <section className="relative isolate overflow-hidden rounded-[28px] bg-ink px-6 py-7 text-white shadow-xl shadow-ink/10 sm:px-9 sm:py-9">
          <div className="campus-grid absolute inset-0 -z-10 opacity-30" />
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8bd2cf]">Universidad Nacional de Rafaela</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Carreras y materias</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">Explorá la oferta académica y consultá las materias que componen cada plan de estudios.</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/10 px-3 py-1.5">{unrafCurricula.length} carreras y tecnicaturas</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">Planes publicados por UNRaf</span>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(260px,.78fr)_minmax(0,1.55fr)]">
          <aside className="flex flex-col gap-3 rounded-3xl border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
            <label htmlFor="career-search" className="text-sm font-bold text-ink">Buscar carrera o materia</label>
            <input id="career-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. Bioinformática" className="min-h-11 rounded-xl border border-ink/15 px-3 text-sm text-ink outline-none transition focus:border-cobalt-strong focus:ring-2 focus:ring-cobalt/20" />
            <p className="text-xs text-ink/45">{filteredPrograms.length} resultados</p>
            <div className="max-h-[34rem] overflow-y-auto pr-1" aria-label="Resultados de carreras">
              {filteredPrograms.map((program) => (
                <button key={program.code} type="button" aria-pressed={program.code === selected?.code} onClick={() => setSelectedCode(program.code)} className={`mb-1 flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${program.code === selected?.code ? 'bg-cobalt-soft text-ink' : 'text-ink/65 hover:bg-paper hover:text-ink'}`}>
                  <span>{program.name}</span><span className="shrink-0 text-xs text-ink/40">{program.subjects.length}</span>
                </button>
              ))}
              {filteredPrograms.length === 0 && <p className="rounded-xl bg-paper p-4 text-sm text-ink/55">No encontramos carreras ni materias con esa búsqueda.</p>}
            </div>
          </aside>

          <section className="min-w-0 rounded-3xl border border-ink/10 bg-white p-5 shadow-sm sm:p-7" aria-live="polite">
            {selected ? <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.15em] text-cobalt">Plan de estudios</p>
                  <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{selected.name}</h2>
                </div>
                <span className="rounded-full bg-cobalt-soft px-3 py-1.5 text-xs font-bold text-ink">{totalSubjects} materias</span>
              </div>
              <ol className="mt-5 grid gap-2 sm:grid-cols-2">
                {selected.subjects.map((subject, index) => <li key={`${selected.code}-${index}`} className="flex min-h-12 items-start gap-3 rounded-xl bg-paper/80 px-3 py-3 text-sm text-ink/80">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-cobalt-strong">{index + 1}</span>
                  <span className="pt-0.5">{subject}</span>
                </li>)}
              </ol>
              <p className="mt-5 border-t border-ink/10 pt-4 text-xs leading-5 text-ink/50">
                Catálogo de referencia tomado de la oferta publicada por UNRaf. Los planes pueden actualizarse; confirmá la versión vigente y el cursado con la universidad.
                {' '}<a href={selected.source} target="_blank" rel="noreferrer" className="font-bold text-cobalt-strong underline decoration-cobalt/40 underline-offset-2 hover:decoration-cobalt">Consultar fuente oficial ↗</a>
              </p>
            </> : <div className="flex min-h-72 items-center justify-center text-center text-sm text-ink/50">Elegí una carrera para ver sus materias.</div>}
          </section>
        </section>
      </main>
    </div>
  )
}
