import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'
import StudentDashboard from './StudentDashboard'
import TeacherDashboard from './TeacherDashboard'
import AdminDashboard from './AdminDashboard'

function CampusIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 300 230" className="h-40 w-52 shrink-0 sm:h-52 sm:w-64">
      <circle cx="158" cy="112" r="92" fill="white" fillOpacity=".055" />
      <circle cx="158" cy="112" r="72" fill="none" stroke="white" strokeOpacity=".16" strokeDasharray="3 7" />
      <path d="M43 178h221M61 178V108h48v70m0 0V82h74v96m0 0v-52h56v52" fill="none" stroke="#f4f7f6" strokeWidth="4" strokeLinejoin="round" />
      <path d="m55 108 30-22 30 22m-6-26 34-25 43 25m-10 19 28-20 31 20" fill="none" stroke="#8bd2cf" strokeWidth="4" strokeLinejoin="round" />
      <path d="M85 128v12m-12 0h24m62-38v14m-12 0h24m34 34v10m-9 0h18" stroke="#e2c34f" strokeWidth="4" strokeLinecap="round" />
      <path d="M129 178v-29a16 16 0 0 1 32 0v29" fill="#48aeb0" />
      <circle cx="222" cy="51" r="8" fill="#e2c34f" />
      <circle cx="65" cy="63" r="5" fill="#8bd2cf" />
    </svg>
  )
}

function QuickLink({ to, marker, title, detail }: { to: string; marker: string; title: string; detail: string }) {
  return (
    <Link to={to} className="group flex min-h-28 items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm shadow-ink/[.02] transition hover:-translate-y-0.5 hover:border-cobalt/40 hover:shadow-lg hover:shadow-ink/[.06] sm:p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft font-display text-lg font-extrabold text-ink transition group-hover:bg-cobalt group-hover:text-white">{marker}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-extrabold text-ink">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-ink/50">{detail}</span>
      </span>
      <span className="text-lg text-ink/30 transition group-hover:translate-x-1 group-hover:text-cobalt" aria-hidden="true">→</span>
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const firstName = user?.full_name.split(' ')[0]
  const dateLabel = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader />
      <main className="mx-auto flex max-w-7xl flex-col gap-7 px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        <section className="relative isolate overflow-hidden rounded-[28px] bg-ink px-6 py-7 text-white shadow-xl shadow-ink/10 sm:px-9 sm:py-9 lg:px-12">
          <div className="campus-grid absolute inset-0 -z-10 opacity-30" />
          <div className="absolute -right-12 -top-28 -z-10 h-72 w-72 rounded-full bg-cobalt/20 blur-3xl" />
          <div className="flex items-center justify-between gap-4">
            <div className="max-w-2xl">
              <p className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#8bd2cf]">
                <span className="h-2 w-2 rounded-full bg-amber" /> Portal universitario · {dateLabel}
              </p>
              <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                {user?.role === 'student' && <>Hola, {firstName}<span className="text-[#8bd2cf]">.</span></>}
                {user?.role === 'teacher' && <>Hola, {firstName}<span className="text-[#8bd2cf]">.</span></>}
                {user?.role === 'admin' && <>Panel administrativo<span className="text-[#8bd2cf]">.</span></>}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/60 sm:text-base">
                {user?.role === 'student' && 'Tu recorrido académico y todo lo que necesitás para vivir el campus.'}
                {user?.role === 'teacher' && 'Tus comisiones, estudiantes y actividad académica en un mismo lugar.'}
                {user?.role === 'admin' && 'Una visión clara de la actividad y la organización de la universidad.'}
              </p>
            </div>
            <div className="hidden sm:block"><CampusIllustration /></div>
          </div>
          {user?.role === 'student' && <p className="mt-6 border-t border-white/10 pt-4 text-xs tracking-wide text-white/45">Estudiante · tu espacio académico</p>}
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {user?.role === 'student' && <QuickLink to="/qr" marker="QR" title="Mi código de acceso" detail="Mostralo para registrar tu ingreso a clase." />}
          {user?.role === 'student' && <QuickLink to="/materias" marker="01" title="Mis materias" detail="Consultá tus comisiones y horarios." />}
          {user?.role === 'student' && <QuickLink to="/perfil" marker="02" title="Mi perfil académico" detail="Revisá tus datos y avance académico." />}
          <QuickLink to="/mapa" marker="⌖" title="Mapa del campus" detail="Encontrá edificios y espacios universitarios." />
        </section>

        {user?.role === 'student' && <StudentDashboard />}
        {user?.role === 'teacher' && <TeacherDashboard />}
        {user?.role === 'admin' && <AdminDashboard />}
      </main>
      <footer className="mt-10 border-t border-ink/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-ink/45 sm:px-6 lg:px-8">
          <span>Campus Inteligente <span className="text-cobalt">·</span> Universidad Nacional de Rafaela</span>
          <span>Tu vida universitaria, más cerca.</span>
        </div>
      </footer>
    </div>
  )
}
