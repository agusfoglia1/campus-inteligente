import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import StudentDashboard from './StudentDashboard'
import TeacherDashboard from './TeacherDashboard'
import AdminDashboard from './AdminDashboard'

export default function Dashboard() {
  const { user, logout } = useAuth()

  // El panel admin tiene tablas con más columnas de info; le damos más
  // ancho que al resto para que no quede todo apretado.
  const maxWidth = user?.role === 'admin' ? 'max-w-4xl' : 'max-w-2xl'

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className={`${maxWidth} mx-auto flex flex-col gap-4`}>
        <div className="bg-white rounded-xl shadow p-6 flex flex-wrap justify-between items-start gap-2">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              ¡Hola, {user?.full_name}!
            </h1>
            <p className="text-slate-500 capitalize">Rol: {user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:underline"
          >
            Cerrar sesión
          </button>
        </div>

        <Link
          to="/mapa"
          className="bg-white border border-blue-600 text-blue-600 text-center rounded-xl shadow py-3 font-medium hover:bg-blue-50"
        >
          🗺️ Mapa del campus
        </Link>

        {user?.role === 'student' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to="/qr"
                className="bg-blue-600 text-white text-center rounded-xl shadow py-3 font-medium hover:bg-blue-700"
              >
                📷 Ver mi QR
              </Link>
              <Link
                to="/materias"
                className="bg-white border border-blue-600 text-blue-600 text-center rounded-xl shadow py-3 font-medium hover:bg-blue-50"
              >
                📚 Mis materias
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
