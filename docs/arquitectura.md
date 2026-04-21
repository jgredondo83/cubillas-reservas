# Arquitectura — Reservas Parque del Cubillas

## Modelo de horarios

Cada recurso tiene `config.horario.default`: un array de ventanas `[{desde, hasta}, ...]` en formato `"HH:mm"`.

### Reglas

1. **Recursos SIN `horario_cruza_medianoche`**: la reserva `[inicio, fin)` debe caber completamente dentro de alguna ventana `[desde, hasta)`. La última hora de inicio permitida es `hasta - duración`.

2. **Recursos CON `horario_cruza_medianoche: true`**: solo se valida que la hora de inicio esté dentro de `[desde, hasta]`. El fin se calcula sumando la duración y puede caer en el día siguiente.

3. **Convención `"00:00"` como `hasta`**: significa medianoche del mismo día (equivalente a `"24:00"`). El código lo normaliza a 1440 minutos.

### Ejemplos

| Recurso | Ventanas | cruza_medianoche | Comportamiento |
|---------|----------|------------------|----------------|
| Pádel | `[{09:00, 14:00}, {15:30, 23:00}]` | false | Franjas de 60/90 min dentro de cada ventana |
| Club Social 6h | `[{12:00, 22:00}]` | true | Inicio entre 12:00-22:00, fin = inicio + 360min (puede cruzar medianoche) |
| Club Social 12h | `[{12:00, 00:00}]` | false | Único inicio posible: 12:00 (duración 720min hasta 00:00) |

### Frontend y Edge Function

Ambos (`src/lib/fechas.ts` y `supabase/functions/crear-reserva/index.ts`) implementan la misma lógica:
- Parsean ventanas como array de `{desde, hasta}`.
- Normalizan `"00:00"` a 1440 minutos.
- Aplican la regla correspondiente según `horario_cruza_medianoche`.

## Modelo de timestamps

Las reservas usan `inicio timestamptz` y `fin timestamptz` (migración 004). Los timestamps se interpretan siempre en zona `Europe/Madrid`. La Edge Function construye los ISO timestamps aplicando el offset de Madrid para la fecha concreta (CET +01 en invierno, CEST +02 en verano).

## Crons automáticos

Los crons se programan con **pg_cron** + **pg_net** dentro de PostgreSQL. Cada cron llama a una Supabase Edge Function vía `net.http_post`.

### Lista de crons

| Nombre | Schedule | Edge Function | Descripción |
|--------|----------|---------------|-------------|
| `cron-marcar-no-presentados` | `5 0 * * *` (00:05 UTC) | `cron-marcar-no-presentados` | Marca como `pendiente_no_presentado` las reservas pasadas sin asistencia registrada |
| `cron-recordatorio-reserva` | `0 * * * *` (cada hora en punto) | `cron-recordatorio-reserva` | Envía email recordatorio ~1h antes de cada reserva (campo `recordatorio_enviado` evita duplicados) |

### Comprobar que están corriendo

```sql
-- Ver crons registrados
SELECT * FROM cron.job;

-- Ver historial de ejecuciones recientes
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Pausar un cron

```sql
SELECT cron.unschedule('cron-marcar-no-presentados');
-- o
SELECT cron.unschedule('cron-recordatorio-reserva');
```

### Cambiar la hora de ejecución

Re-ejecutar `cron.schedule` con el mismo `jobname` lo reemplaza automáticamente:

```sql
SELECT cron.schedule(
  'cron-marcar-no-presentados',
  '30 1 * * *',  -- nueva hora
  $$ ... $$
);
```

### Forzar ejecución manual (testing)

```bash
curl -X POST https://onudupsnjvppuhlyrrmq.supabase.co/functions/v1/cron-marcar-no-presentados \
  -H "x-cron-key: <CRON_SECRET_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'

curl -X POST https://onudupsnjvppuhlyrrmq.supabase.co/functions/v1/cron-recordatorio-reserva \
  -H "x-cron-key: <CRON_SECRET_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Secreto de autenticación

Los crons usan el header `x-cron-key` con el valor del secret `CRON_SECRET_KEY` definido en Supabase Edge Functions → Secrets. Las migraciones de activación (`018_activar_cron_no_presentados.sql`, `020_activar_cron_recordatorio.sql`) tienen el placeholder `CRON_SECRET_KEY_AQUI` que **debe sustituirse** por el valor real antes de ejecutarlas.

## Joins con tabla usuarios desde reservas

La tabla `reservas` tiene **4 foreign keys** hacia `public.usuarios`:

| Columna | Significado |
|---------|-------------|
| `usuario_id` | Dueño de la reserva |
| `creado_por` | Quien la creó (vecino, guarda o admin) |
| `cancelado_por` | Quien la canceló |
| `marcado_presentado_por` | Guarda/admin que marcó asistencia |

PostgREST no puede resolver el join sin alias explícito y devuelve **300 PGRST201**. **Siempre** usar el nombre de FK:

```typescript
// ✅ Correcto
.select('*, usuarios!reservas_usuario_id_fkey(nombre, apellidos)')

// ❌ Incorrecto — falla con 300 PGRST201
.select('*, usuarios(nombre, apellidos)')
```

Si necesitas datos de varias FKs simultáneamente, usa aliases distintos:

```typescript
.select(`
  *,
  dueno:usuarios!reservas_usuario_id_fkey(nombre, apellidos),
  creador:usuarios!reservas_creado_por_fkey(nombre, apellidos),
  cancelador:usuarios!reservas_cancelado_por_fkey(nombre, apellidos)
`)
```

## Solapamiento entre espacios

Los recursos comparten espacio físico vía `espacio_id` en la tabla `recursos` (migración 004). El exclusion constraint `reservas_no_solapamiento_espacio` opera sobre `espacio_id + tstzrange(inicio, fin)`, impidiendo reservas solapadas en el mismo espacio aunque sean de recursos distintos (ej. Club Social 6h y 12h).
