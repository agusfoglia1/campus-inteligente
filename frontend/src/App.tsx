import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import QrScreen from './pages/QrScreen'
import MyClasses from './pages/MyClasses'
import TeacherCommissionDetail from './pages/TeacherCommissionDetail'
import CampusMap from './pages/CampusMap'
import StudentProfile from './pages/StudentProfile'
import Spinner from './components/Spinner'

const AcademicCatalog = lazy(() => import('./pages/AcademicCatalog'))
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="route-enter">
    <Routes location={location}>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/qr"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <QrScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/materias"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <MyClasses />
          </ProtectedRoute>
        }
      />
      <Route path="/perfil" element={<ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>} />
      <Route
        path="/teacher/commissions/:commissionId"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherCommissionDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mapa"
        element={
          <ProtectedRoute>
            <CampusMap />
          </ProtectedRoute>
        }
      />
      <Route
        path="/oferta-academica"
        element={
          <ProtectedRoute>
            <Suspense fallback={<Spinner label="Cargando oferta académica…" />}>
              <AcademicCatalog />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </div>
  )
}

export default App
