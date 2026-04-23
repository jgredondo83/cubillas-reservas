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
- Fix bloqueo automático: escritura atómica de los 4 campos
- Dashboard admin con estadísticas del mes (RPC `estadisticas_dashboard_admin`)
- Migraciones: 016, 017, 018, 019, 020, 021, 022, 023

### Día 7 — 22 de abril de 2026 ✅
- **RGPD completo**
- EF `exportar-mis-datos` — descarga JSON con datos personales (Art. 20)
- EF `eliminar-cuenta` — borrado completo + anonimización reservas (Art. 17)
  - FAIL-CLOSED para admin/super_admin
  - Cancelación de reservas futuras antes del borrado
  - Email de confirmación fire-and-forget tras eliminación
- `_shared/auth.ts` — helper `verificarJWT` (workaround bug ES256 de Supabase)
- Panel admin: Avisos globales (`/admin/avisos`), Textos del sistema (`/admin/textos`)
- Perfil reordenado: form editable → info lectura → mis datos → zona de peligro
- `PoliticaPrivacidad.tsx`, `AvisoLegal.tsx`, `NormasUso.tsx`
- Footer con links legales en Dashboard
- Migraciones: 024, 025, 026

### Día 8 — 23 de abril de 2026 ✅
- **Bloqueos de franjas horarias**
- EF `gestionar-bloqueo-franja` (verificar_conflictos / crear / desactivar / eliminar)
- Panel admin `/admin/bloqueos-franjas` con detección de conflictos y modal de reservas afectadas
- Integración en `crear-reserva` (step 11) y en `Reservar.tsx` (slots bloqueados visibles)
- **Lógica de antelación real por tipo de recurso**
  - Pádel: máx 3 días, mín 0 días
  - Tenis: máx 7 días, mín 0 días
  - Club Social: máx 365 días, mín 3 días (tiempo para gestión de pago y llaves)
  - Admin/guarda: sin restricciones de antelación (hard cap 365 días, tolerancia 60s)
- **Manuales de uso integrados en el panel**
  - `AdminManual.tsx` — 10 secciones, accesible desde sidebar admin
  - `GuardaManual.tsx` — 8 secciones, accesible desde cabecera del panel guarda
- Fix RGPD: null guards en `TarjetaReservaGuarda` y `AdminReservas` para vecinos eliminados
- Migraciones: 027, 028, 029

---

## Fase 1b — Pospuesto al post-lanzamiento

Estas funcionalidades se han decidido mover fuera del sprint de lanzamiento:

- **Recursos editables desde admin** (anterior "Día 9"): edición de horarios, costes y config de recursos desde UI. No bloqueante para el lanzamiento; se edita directamente en SQL si es necesario.
- **Cron de auto-cancelación Club Social** (anterior "Día 10"): cancelación automática de reservas `pendiente_pago` tras N días sin confirmar pago. Decisión: se gestiona manualmente por el admin hasta estabilizar el flujo.

---

## Edge Functions desplegadas

| Función | Descripción | `--no-verify-jwt` |
|---|---|---|
| `crear-reserva` | Validación + creación de reserva (18 pasos + check bloqueos franjas) | No |
| `cancelar-reserva` | Cancelación con control de penalización tardía | No |
| `marcar-asistencia` | Presentado / no presentado / deshacer, bloqueo automático | No |
| `crear-usuario-admin` | Crear vecino/guarda/admin desde panel | No |
| `gestionar-usuario-admin` | Verificar, bloquear, desbloquear, cambiar rol, eliminar | No |
| `gestionar-vivienda-admin` | Bloquear/desbloquear vivienda por impago | No |
| `registrar-pago` | Registrar pago Club Social (efectivo/bizum/transferencia) | No |
| `gestionar-bloqueo-franja` | CRUD bloqueos de franjas horarias + verificación de conflictos | No |
| `cron-marcar-no-presentados` | Marca reservas pasadas como `pendiente_no_presentado` | Sí (cron) |
| `cron-recordatorio-reserva` | Email recordatorio 1h antes de la reserva | Sí (cron) |
| `exportar-mis-datos` | Descarga JSON de datos personales (RGPD Art. 20) | Sí (ES256) |
| `eliminar-cuenta` | Borrado RGPD completo + anonimización (Art. 17) | Sí (ES256) |
| `enviar-email-test` | Prueba de plantillas de email | Sí |

---

## Migraciones SQL aplicadas (001–029)

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
| 021 | `021_rls_usuarios_update_self.sql` | Policy RLS UPDATE en `usuarios` (vecino edita su propio perfil) |
| 022 | `022_estado_previo_bloqueo_usuarios.sql` | Columna `estado_previo_bloqueo` en `usuarios` |
| 023 | `023_estadisticas_dashboard.sql` | RPC `estadisticas_dashboard_admin(com_id)` |
| 024 | `024_anonimizacion_rgpd_fk.sql` | DROP NOT NULL en todas las columnas FK SET NULL → `usuarios` |
| 025 | `025_textos_base_admin.sql` | Seed de textos base editables desde la UI de admin |
| 026 | `026_avisos.sql` | Tabla `avisos` (reescritura con schema correcto) + RLS |
| 027 | `027_bloqueos_ampliacion.sql` | ADD COLUMN en `bloqueos`: fecha_inicio/fin, hora_inicio/fin, activo, índice parcial, RLS |
| 028 | `028_bloqueos_limpieza_columnas_viejas.sql` | DROP COLUMN inicio/fin (timestamptz legacy) + SET NOT NULL en nuevas columnas |
| 029 | `029_antelacion_club_social.sql` | Config Club Social: antelacion_dias=365, antelacion_minima_dias=3; pádel/tenis: min=0 |

---

## Rutas principales

### Vecino
| Ruta | Descripción |
|---|---|
| `/` | Redirect automático según rol |
| `/reservar` | Wizard de reservas (5 pasos) |
| `/mis-reservas` | Listado y cancelación de reservas propias |
| `/perfil` | Edición de datos personales + RGPD |
| `/privacidad` | Aviso privacidad (vecino nuevo) |
| `/politica-privacidad` | Política de privacidad completa |
| `/aviso-legal` | Aviso legal |
| `/normas-uso` | Normas de uso de las instalaciones |

### Guarda
| Ruta | Descripción |
|---|---|
| `/guarda/hoy` | Reservas de hoy (alias de `/guarda/dia/:fecha`) |
| `/guarda/dia/:fecha` | Reservas de un día concreto + marcar asistencia |
| `/guarda/nueva-reserva` | Crear reserva a nombre de un vecino |
| `/guarda/manual` | Manual de uso del panel del guarda |

### Admin
| Ruta | Descripción |
|---|---|
| `/admin` | Dashboard con estadísticas del mes |
| `/admin/usuarios` | Listado de usuarios |
| `/admin/usuarios/nuevo` | Crear nuevo usuario |
| `/admin/usuarios/:id` | Detalle y gestión de un usuario |
| `/admin/viviendas` | Listado de viviendas |
| `/admin/viviendas/nueva` | Crear nueva vivienda |
| `/admin/viviendas/:id` | Detalle y gestión de una vivienda |
| `/admin/reservas` | Listado de reservas con filtros |
| `/admin/reservas/nueva` | Crear reserva desde admin |
| `/admin/no-presentados` | Revisión de no presentados pendientes |
| `/admin/bloqueos-franjas` | Gestión de bloqueos de franjas horarias |
| `/admin/avisos` | Publicar y gestionar avisos globales |
| `/admin/textos` | Editar textos del sistema (contacto, bienvenida, normas) |
| `/admin/test-emails` | Prueba de plantillas de email (solo super_admin) |
| `/admin/manual` | Manual de uso del panel de administración |

---

## Próximo paso: Día 11 — QA cross-browser

### Objetivo
Detectar y corregir bugs de UX, responsive y comportamiento antes del lanzamiento.

### Checklist previsto
- [ ] Test completo del flujo vecino en móvil (iOS Safari + Android Chrome)
- [ ] Test panel admin en tablet y desktop
- [ ] Test panel guarda en móvil (caso de uso real)
- [ ] Fix responsive manuales (ver MEJORAS_MENORES.md sección UX Mobile)
- [ ] Revisar contraste y legibilidad en fondos oscuros
- [ ] Smoke test Edge Functions en producción con datos reales
- [ ] Revisar RLS: ninguna tabla accesible sin policy adecuada
- [ ] Verificar emails en producción (recordatorio, magic link, confirmación)
- [ ] Test flujos RGPD: exportar datos + eliminar cuenta

### Después del Día 11
- **Día 12**: Comunicado a vecinos, instrucciones de acceso, monitorización.
- **Lanzamiento: 1 de mayo de 2026**
