import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import QrScreen from './pages/QrScreen'
import MyClasses from './pages/MyClasses'
import TeacherCommissionDetail from './pages/TeacherCommissionDetail'
import CampusMap from './pages/CampusMap'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
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
  )
}

export default App
