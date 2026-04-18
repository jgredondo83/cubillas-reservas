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

## Solapamiento entre espacios

Los recursos comparten espacio físico vía `espacio_id` en la tabla `recursos` (migración 004). El exclusion constraint `reservas_no_solapamiento_espacio` opera sobre `espacio_id + tstzrange(inicio, fin)`, impidiendo reservas solapadas en el mismo espacio aunque sean de recursos distintos (ej. Club Social 6h y 12h).
