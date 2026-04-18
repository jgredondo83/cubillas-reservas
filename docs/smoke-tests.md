# Smoke tests — Edge Functions

## Obtener token y ANON_KEY

**Token** (desde la consola del navegador, logueado):
```js
JSON.parse(localStorage.getItem('sb-onudupsnjvppuhlyrrmq-auth-token')).access_token
```

**ANON_KEY** (desde `.env.local`):
```bash
export ANON_KEY="tu-anon-key-aquí"
export SUPABASE_URL="https://onudupsnjvppuhlyrrmq.supabase.co"
export TOKEN="el-token-copiado"
```

## Ejemplo curl — crear-reserva

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/crear-reserva" \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recurso_id": "UUID_DEL_RECURSO",
    "fecha": "2026-04-21",
    "hora_inicio": "10:00",
    "duracion_minutos": 60
  }' | jq .
```

## Ejemplo curl — cancelar-reserva

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/cancelar-reserva" \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "reserva_id": "UUID_DE_LA_RESERVA"
  }' | jq .
```

## Casos de prueba

### 1. Reserva válida de pádel 60 min
- Recurso: Pista pádel Rda. de los Montes
- Fecha: mañana, hora_inicio: "10:00", duracion: 60
- **Esperado**: 201, reserva con estado "confirmada"
- **BD**: fila en reservas con inicio = fecha 10:00 Madrid, fin = fecha 11:00 Madrid

### 2. Repetir la misma reserva
- Mismos parámetros que caso 1
- **Esperado**: 409, "Esa franja ya está reservada por otro vecino"
- **BD**: sin fila nueva

### 3. Pádel con duración 75 min (no permitida)
- Recurso: pádel, duracion: 75
- **Esperado**: 400, "Duración no permitida. Opciones: 60, 90 minutos"

### 4. Club Social 2h (solo admin, vecino pide)
- Recurso: Club Social 2 horas (config.solo_admin=true)
- Usuario: vecino normal
- **Esperado**: 403, "Este recurso solo está disponible para administradores"

### 5. Reserva Club Social 6h a las 22:00 (cruza medianoche)
- Recurso: Club Social 6 horas, fecha: sábado, hora_inicio: "22:00", duracion: 360
- **Esperado**: 201, reserva con inicio sábado 22:00 Madrid, fin domingo 04:00 Madrid
- **BD**: inicio = "2026-04-25T20:00:00.000Z" (22:00 CEST), fin = "2026-04-26T02:00:00.000Z" (04:00 CEST)
