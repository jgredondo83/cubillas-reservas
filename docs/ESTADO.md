# Estado del proyecto

## Día 1 — 18 de abril de 2026 ✅

- Proyecto Vite + React + TypeScript + Tailwind 3 + PWA + Supabase client
- Deploy en Vercel funcionando

## Día 2 — 18 de abril de 2026 ✅

- Auth completa (Google OAuth + magic link)
- Registro de vecinos con selección de vivienda
- Política de privacidad RGPD
- Rutas protegidas por rol

## Día 3 — 18 de abril de 2026 ✅

### Completado

**Migraciones SQL**:
- `003_fn_franjas_ocupadas.sql` — función SECURITY DEFINER para franjas ocupadas
- `004_timestamptz_reservas_y_espacio_id.sql` — timestamptz + espacio_id
- `006_fix_horario_club_social_12h.sql` — fix ventana Club Social 12h
- `007_columnas_cancelacion_reservas.sql` — columnas para cancelación

**Edge Functions**:
- `crear-reserva` — validación exhaustiva (18 pasos)
- `cancelar-reserva` — auth, permisos, cancelación tardía

**Frontend**:
- Wizard de reservas 5 pasos, MisReservas, Dashboard

## Día 4 — 19 de abril de 2026 ✅

### Completado

**Migración SQL** (pendiente de ejecutar):
- `008_telefono_obligatorio_y_estado_previo.sql` — teléfono NOT NULL, estado_previo, marcado_presentado_por, marcado_en, constraint estados nuevos

**Edge Functions** (pendientes de desplegar):
- `marcar-asistencia` — presentado/no_presentado/deshacer con tracking guarda, penalización automática
- `cron-marcar-no-presentados` — marca reservas pasadas como pendiente_no_presentado (no programada aún)
- `crear-reserva` v5 — acepta usuario_id para reservas en nombre de otro (guarda/admin)

**Frontend**:
- Panel del guarda: GuardaHoy, GuardaDia (navegación entre días), GuardaNuevaReserva (buscador vecino + wizard)
- TarjetaReservaGuarda con acciones: presentado, no presentado, cancelar, deshacer
- Tema visual slate-800 diferenciado del teal del vecino
- Role-based redirect (guarda → /guarda/hoy, admin → /admin, vecino → dashboard)
- ProtectedRoute con rolesPermitidos
- Teléfono obligatorio en CompletarRegistro con validación
- Política de privacidad actualizada (teléfono obligatorio)
- Placeholder /admin
- Texto alias actualizado (mejora menor)

### Acciones pendientes para Jaime

Ver resumen al final del día.
