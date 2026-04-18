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

**Migraciones SQL** (sin ejecutar, pendientes para Jaime):
- `003_fn_franjas_ocupadas.sql` — función SECURITY DEFINER para consultar franjas ocupadas sin exponer datos sensibles
- `004_timestamptz_reservas_y_espacio_id.sql` — modelo timestamptz (opción B) + espacio_id en recursos (opción A)

**Edge Functions** (sin desplegar, pendientes para Jaime):
- `crear-reserva` — validación exhaustiva (18 pasos): auth, perfil, vivienda morosa, bloqueo usuario, recurso, permisos admin, duración, timestamptz, antelación, horario, bloqueos admin, solapamiento por espacio_id, max activas por vivienda, estado inicial, insert con fallback exclusion constraint, texto post-reserva
- `cancelar-reserva` — auth, permisos (propia o privilegiado), cálculo cancelación tardía, update estado

**Frontend**:
- `src/lib/fechas.ts` — helpers de formato (Intl.DateTimeFormat), generación de franjas con solapamiento, cruce medianoche
- `src/lib/api.ts` — wrapper para llamadas a Edge Functions
- `src/pages/Reservar.tsx` — wizard 5 pasos (recurso → duración → fecha → franja → confirmar) + pantalla éxito
- `src/pages/MisReservas.tsx` — próximas y pasadas, cancelación con modal y motivo
- `src/pages/Dashboard.tsx` — saludo, banner pendiente, botón reservar, 3 próximas reservas compactas, links
- Tipos ampliados: Reserva, Bloqueo, TextoAdmin, RecursoConfig, FranjaOcupada

**Rutas nuevas**: `/reservar`, `/mis-reservas`

### Acciones pendientes para Jaime

1. **Ejecutar SQL** en Supabase SQL Editor (en orden):
   ```
   supabase/migrations/003_fn_franjas_ocupadas.sql
   supabase/migrations/004_timestamptz_reservas_y_espacio_id.sql
   ```

2. **Desplegar Edge Functions**:
   ```bash
   supabase functions deploy crear-reserva
   supabase functions deploy cancelar-reserva
   ```

3. **RLS policies** necesarias:
   - `reservas`: INSERT para authenticated donde `auth.uid() = usuario_id`
   - `reservas`: SELECT para authenticated donde `auth.uid() = usuario_id`
   - `reservas`: UPDATE para authenticated (solo cancelación propia)
   - `recursos`: SELECT para authenticated
   - `bloqueos`: SELECT para authenticated

4. **Verificar** que la tabla `textos_admin` existe y tiene SELECT para authenticated

## Día 4 — Siguiente sesión

- Testing completo del flujo de reservas
- Ajustes según feedback
- Inicio del panel de guarda (verificar QR / check-in)
