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
import GuardaHoy from './pages/guarda/GuardaHoy'
import GuardaDia from './pages/guarda/GuardaDia'
import GuardaNuevaReserva from './pages/guarda/GuardaNuevaReserva'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import AdminUsuarioDetalle from './pages/admin/AdminUsuarioDetalle'
import AdminUsuarioNuevo from './pages/admin/AdminUsuarioNuevo'
import AdminViviendas from './pages/admin/AdminViviendas'
import AdminViviendaDetalle from './pages/admin/AdminViviendaDetalle'
import AdminReservas from './pages/admin/AdminReservas'
import AdminReservaNueva from './pages/admin/AdminReservaNueva'
import AdminViviendaNueva from './pages/admin/AdminViviendaNueva'
import AdminTestEmails from './pages/admin/AdminTestEmails'
import Perfil from './pages/Perfil'

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
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Perfil />
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

          {/* Rutas del admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute rolesPermitidos={['admin', 'super_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute rolesPermitidos={['admin', 'super_admin']}>
                <AdminUsuarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios/nuevo"
            element={
              <ProtectedRoute rolesPermitidos={['admin', 'super_admin']}>
                <AdminUsuarioNuevo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios/:id"
            element={
              <ProtectedRoute rolesPermitidos={['admin', 'super_admin']}>
                <AdminUsuarioDetalle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/viviendas"
            element={
              <ProtectedRoute rolesPermitidos={['admin', 'super_admin']}>
                <AdminViviendas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/viviendas/nueva"
            element={
              <ProtectedRoute rolesPermitidos={['admin', 'super_admin']}>
                <AdminViviendaNueva />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/viviendas/:id"
            element={
              <ProtectedRoute rolesPermitidos={['admin', 'super_admin']}>
                <AdminViviendaDetalle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reservas"
            element={
              <ProtectedRoute rolesPermitidos={['admin', 'super_admin']}>
                <AdminReservas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reservas/nueva"
            element={
              <ProtectedRoute rolesPermitidos={['admin', 'super_admin']}>
                <AdminReservaNueva />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/test-emails"
            element={
              <ProtectedRoute rolesPermitidos={['super_admin']}>
                <AdminTestEmails />
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
