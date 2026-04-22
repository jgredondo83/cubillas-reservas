# Estado del proyecto

**Lanzamiento objetivo: 1 de mayo de 2026**

---

## Días completados

### Día 1 — 18 de abril de 2026 ✅
- Proyecto Vite + React + TypeScript + Tailwind 3 + PWA + Supabase client
- Deploy en Vercel funcionando

### Día 2 — 18 de abril de 2026 ✅
- Auth completa (Google OAuth + magic link)
- Registro de vecinos con selección de vivienda
- Política de privacidad RGPD básica
- Rutas protegidas por rol

### Día 3 — 18 de abril de 2026 ✅
- Wizard de reservas 5 pasos, MisReservas, Dashboard
- EF `crear-reserva` (18 pasos de validación) y `cancelar-reserva`
- Migraciones: 003, 004, 006, 007

### Día 4 — 19 de abril de 2026 ✅
- Panel del guarda: GuardaHoy, GuardaDia, GuardaNuevaReserva
- EF `marcar-asistencia` y `cron-marcar-no-presentados`
- Role-based redirect, teléfono obligatorio
- Migración: 008

### Día 5 — 19 de abril de 2026 ✅
- Panel admin completo: usuarios, viviendas, reservas, bloqueos, dashboard
- EF `crear-usuario-admin`, `gestionar-usuario-admin`, `gestionar-vivienda-admin`
- AdminLayout con sidebar, tema indigo/violet por rol
- Multi-tenant base, magic link real, cascada FK
- Migraciones: 009, 010, 011, 012, 013, 014, 015

### Día 6 — 21 de abril de 2026 ✅
- EF `cron-recordatorio-reserva` (email 1h antes de reserva, cada 15 min)
- EF `registrar-pago` (pagos Club Social con coste + fianza)
- Panel `/perfil` para vecinos (edición nombre/apellidos/alias/teléfono/nivel pádel)
- Panel admin No Presentados (`/admin/no-presentados`) — 4 acciones por tarjeta
- Fix bloqueo automático: escritura atómica de los 4 campos (estado, bloqueado_hasta, motivo_bloqueo, estado_previo_bloqueo)
- Dashboard admin con estadísticas del mes (RPC `estadisticas_dashboard_admin`)
- Migraciones: 016, 017, 018, 019, 020, 021, 022, 023

### Día 7 — 22 de abril de 2026 ✅
- **RGPD completo**
- EF `exportar-mis-datos` — descarga JSON con datos personales (Art. 20)
- EF `eliminar-cuenta` — borrado completo + anonimización reservas (Art. 17)
  - FAIL-CLOSED para admin/super_admin
  - Cancelación de reservas futuras antes del borrado
  - Log en `logs_admin` antes del DELETE
  - Email de confirmación fire-and-forget tras eliminación exitosa
- `_shared/auth.ts` — helper `verificarJWT` para EF con `--no-verify-jwt` (bug ES256)
- Perfil reordenado: form editable → info lectura → mis datos → zona de peligro
- `PoliticaPrivacidad.tsx` (`/politica-privacidad`) y `AvisoLegal.tsx` (`/aviso-legal`)
- Footer Dashboard con links legales
- Migración: 024 (DROP NOT NULL en todas las FK SET NULL → usuarios)

---

## Edge Functions desplegadas

| Función | Descripción | `--no-verify-jwt` |
|---|---|---|
| `crear-reserva` | Validación + creación de reserva (18 pasos) | No |
| `cancelar-reserva` | Cancelación con control de penalización tardía | No |
| `marcar-asistencia` | Presentado / no presentado / deshacer, bloqueo automático | No |
| `crear-usuario-admin` | Crear vecino/guarda/admin desde panel | No |
| `gestionar-usuario-admin` | Verificar, bloquear, desbloquear, cambiar rol, eliminar | No |
| `gestionar-vivienda-admin` | Bloquear/desbloquear vivienda por impago | No |
| `registrar-pago` | Registrar pago Club Social (efectivo/bizum/transferencia) | No |
| `cron-marcar-no-presentados` | Marca reservas pasadas como `pendiente_no_presentado` | Sí (cron) |
| `cron-recordatorio-reserva` | Email recordatorio 1h antes de la reserva | Sí (cron) |
| `exportar-mis-datos` | Descarga JSON de datos personales (RGPD Art. 20) | Sí (ES256) |
| `eliminar-cuenta` | Borrado RGPD completo + anonimización (Art. 17) | Sí (ES256) |
| `enviar-email-test` / `test-emails` | Prueba de plantillas de email | Sí |

---

## Migraciones SQL aplicadas

| # | Archivo | Descripción |
|---|---|---|
| 002 | `002_trigger_on_auth_user_insert.sql` | Trigger creación de perfil en `usuarios` al registrarse |
| 003 | `003_fn_franjas_ocupadas.sql` | Función SECURITY DEFINER `franjas_ocupadas` |
| 004 | `004_timestamptz_reservas_y_espacio_id.sql` | Reservas con `timestamptz` + `espacio_id` + constraint solapamiento |
| 006 | `006_fix_horario_club_social_12h.sql` | Fix ventana horaria Club Social 12h |
| 007 | `007_columnas_cancelacion_reservas.sql` | Columnas `cancelado_en`, `cancelado_por`, `motivo_cancelacion`, `cancelo_tarde` |
| 008 | `008_telefono_obligatorio_y_estado_previo.sql` | Teléfono NOT NULL, `estado_previo`, `marcado_presentado_por`, `marcado_en` |
| 009 | `009_textos_admin_contacto.sql` | Seed datos de contacto de administración |
| 010 | `010_rls_admin.sql` | RLS panel admin (`es_admin_o_super`, `es_super_admin`) |
| 011 | `011_columna_notas_reservas.sql` | Columna `notas` en reservas |
| 012 | `012_pagos_club_social.sql` | Columna `datos_pago` (jsonb) en reservas |
| 013 | `013_fks_usuarios_cascada.sql` | FKs hacia `usuarios` con SET NULL / CASCADE según tipo |
| 014 | `014_costes_club_social.sql` | Costes Club Social en `config` del recurso |
| 015 | `015_reservas_usuario_set_null.sql` | `reservas.usuario_id` FK → SET NULL (RGPD) |
| 016 | `016_textos_contactos_separados.sql` | `contacto_general` y `contacto_administracion` separados |
| 017 | `017_funcion_reservas_activas.sql` | Función RPC `reservas_activas_por_vivienda` |
| 018 | `018_activar_cron_no_presentados.sql` | pg_cron `cron-marcar-no-presentados` cada 15 min |
| 019 | `019_campo_recordatorio_enviado.sql` | Columna `recordatorio_enviado` en reservas + índice parcial |
| 020 | `020_activar_cron_recordatorio.sql` | pg_cron `cron-recordatorio-reserva` cada 15 min |
| 021 | `021_rls_usuarios_update_self.sql` | Policy RLS `UPDATE` en `usuarios` (vecino edita su propio perfil) |
| 022 | `022_estado_previo_bloqueo_usuarios.sql` | Columna `estado_previo_bloqueo` en `usuarios` |
| 023 | `023_estadisticas_dashboard.sql` | RPC `estadisticas_dashboard_admin(com_id)` |
| 024 | `024_anonimizacion_rgpd_fk.sql` | DROP NOT NULL en todas las columnas FK SET NULL → `usuarios` |

---

## Próximos pasos (días 8–13)

### Día 8 — Partidos abiertos de pádel
- Crear partido abierto: recurso pádel, fecha/hora, nivel mínimo, plazas
- Unirse / salir de partido
- Tablas: `partidos_abiertos`, `reserva_participantes`
- Notificación por email al completarse el partido

### Día 9 — Ranking y estadísticas de pádel
- Cálculo automático de puntos por partido jugado
- Tabla de clasificación visible en dashboard de vecino
- Historial de partidos por usuario

### Día 10 — Notificaciones y avisos de la comunidad
- Panel admin: crear avisos para todos los vecinos o por vivienda
- Avisos visibles en dashboard del vecino (banner o sección)
- Email masivo opcional al publicar un aviso

### Día 11 — Mejoras de usabilidad y pulido
- Onboarding mejorado para vecinos nuevos (primera reserva guiada)
- Búsqueda de horarios libres desde el wizard de reservas
- Mejoras responsive para móvil

### Día 12 — Testing y hardening
- Testing manual estructurado de todos los flujos críticos
- Revisar RLS: ninguna tabla accesible sin policy
- Revisar Edge Functions: inputs malformados, casos límite
- Smoke test de emails en producción

### Día 13 — Lanzamiento
- Comunicado a vecinos con instrucciones de acceso
- Verificación final en producción con usuarios reales
- Monitorización primeras 48h
- **Deploy definitivo: 1 de mayo de 2026**
