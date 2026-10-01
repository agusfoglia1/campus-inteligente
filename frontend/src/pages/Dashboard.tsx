import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'
import StudentDashboard from './StudentDashboard'
import TeacherDashboard from './TeacherDashboard'
import AdminDashboard from './AdminDashboard'

export default function Dashboard() {
  const { user } = useAuth()
  const maxWidth = user?.role === 'admin' ? 'max-w-4xl' : 'max-w-2xl'
  const firstName = user?.full_name.split(' ')[0]

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader />
      <div className={`${maxWidth} mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4`}>
        <h1 className="font-display text-3xl text-ink">
          {user?.role === 'student' && `Hola, ${firstName}`}
          {user?.role === 'teacher' && `Tus comisiones, ${firstName}`}
          {user?.role === 'admin' && 'Panel administrativo'}
        </h1>

        <Link
          to="/mapa"
          className="border border-ink/15 bg-white text-ink rounded-xl px-4 py-3 text-sm font-medium hover:border-cobalt hover:text-cobalt transition-colors w-fit"
        >
          Ver el mapa del campus
        </Link>

        {user?.role === 'student' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to="/qr"
                className="bg-cobalt text-white text-center rounded-xl py-3.5 font-medium hover:bg-ink transition-colors"
              >
                Ver mi código QR
              </Link>
              <Link
                to="/materias"
                className="border border-ink/15 bg-white text-ink text-center rounded-xl py-3.5 font-medium hover:border-cobalt hover:text-cobalt transition-colors"
              >
                Mis materias
              </Link>
            </div>
            <StudentDashboard />
          </>
        )}

        {user?.role === 'teacher' && <TeacherDashboard />}
        {user?.role === 'admin' && <AdminDashboard />}
      </div>
    </div>
  )
}
