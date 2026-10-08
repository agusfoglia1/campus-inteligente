import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Spinner from './components/Spinner'
import ProtectedRoute from './components/ProtectedRoute'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const QrScreen = lazy(() => import('./pages/QrScreen'))
const MyClasses = lazy(() => import('./pages/MyClasses'))
const TeacherCommissionDetail = lazy(() => import('./pages/TeacherCommissionDetail'))
const CampusMap = lazy(() => import('./pages/CampusMap'))
const StudentProfile = lazy(() => import('./pages/StudentProfile'))

function App() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="route-enter">
    <Suspense fallback={<Spinner label="Cargando Campus Inteligente…" />}>
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
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </Suspense>
    </div>
  )
}

export default App
