import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import RoleBasedRedirect from './components/RoleBasedRedirect'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import CompletarRegistro from './pages/CompletarRegistro'
import Reservar from './pages/Reservar'
import MisReservas from './pages/MisReservas'
import Privacidad from './pages/Privacidad'
import Admin from './pages/Admin'
import GuardaHoy from './pages/guarda/GuardaHoy'
import GuardaDia from './pages/guarda/GuardaDia'
import GuardaNuevaReserva from './pages/guarda/GuardaNuevaReserva'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleBasedRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reservar"
            element={
              <ProtectedRoute>
                <Reservar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mis-reservas"
            element={
              <ProtectedRoute>
                <MisReservas />
              </ProtectedRoute>
            }
          />

          {/* Rutas del guarda */}
          <Route
            path="/guarda/hoy"
            element={
              <ProtectedRoute rolesPermitidos={['guarda', 'admin', 'super_admin']}>
                <GuardaHoy />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guarda/dia/:fecha"
            element={
              <ProtectedRoute rolesPermitidos={['guarda', 'admin', 'super_admin']}>
                <GuardaDia />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guarda/nueva-reserva"
            element={
              <ProtectedRoute rolesPermitidos={['guarda', 'admin', 'super_admin']}>
                <GuardaNuevaReserva />
              </ProtectedRoute>
            }
          />

          {/* Admin placeholder */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute rolesPermitidos={['admin', 'super_admin']}>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/completar-registro"
            element={
              <ProtectedRoute requierePerfil={false}>
                <CompletarRegistro />
              </ProtectedRoute>
            }
          />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
