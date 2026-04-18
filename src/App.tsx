import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import CompletarRegistro from './pages/CompletarRegistro'
import Dashboard from './pages/Dashboard'
import Privacidad from './pages/Privacidad'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
