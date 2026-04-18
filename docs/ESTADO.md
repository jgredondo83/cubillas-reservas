# Estado del proyecto

## Día 1 — 18 de abril de 2026 ✅

- Proyecto Vite + React + TypeScript + Tailwind 3 + PWA + Supabase client
- Deploy en Vercel funcionando

## Día 2 — 18 de abril de 2026 ✅

### Completado

- **AuthContext** (`src/contexts/AuthContext.tsx`): gestión de sesión, perfil, login con Google/magic link, sign out
- **useAuth** hook (`src/hooks/useAuth.ts`)
- **Login** (`src/pages/Login.tsx`): botón Google, magic link por email, estados de carga y error
- **AuthCallback** (`src/pages/AuthCallback.tsx`): procesa callback de auth, redirige según si tiene perfil o no
- **CompletarRegistro** (`src/pages/CompletarRegistro.tsx`): formulario completo (nombre, apellidos, alias, teléfono, vivienda con conteo, nivel pádel, privacidad)
- **Dashboard** (`src/pages/Dashboard.tsx`): placeholder con saludo, banner pendiente verificación, cerrar sesión
- **Privacidad** (`src/pages/Privacidad.tsx`): política RGPD completa
- **ProtectedRoute** y **PublicOnlyRoute**: protección de rutas
- **Tipos TypeScript** (`src/types/database.ts`): Comunidad, Vivienda, Usuario, Recurso
- **Migración 002**: documentación de por qué NO hay trigger automático en auth
- Router con todas las rutas configuradas

### Configuración necesaria en Supabase (Jaime)

- [ ] En Authentication > URL Configuration: añadir `http://localhost:5173/auth/callback` y `https://cubillas-reservas.vercel.app/auth/callback` como Redirect URLs
- [ ] En Authentication > Providers: habilitar Google OAuth (necesita Client ID y Secret de Google Cloud Console)
- [ ] Verificar que la tabla `usuarios` permite INSERT con RLS para usuarios autenticados (policy: `auth.uid() = id`)
- [ ] Verificar que la tabla `viviendas` permite SELECT con RLS para usuarios autenticados

## Día 3 — Reservas

- Calendario semanal de reservas por recurso
- Formulario de nueva reserva con selector de franja horaria
- Listado "Mis reservas" con opción de cancelar
- Lógica de validación (no solapar, máximo reservas por semana, etc.)
