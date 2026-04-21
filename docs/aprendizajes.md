# Aprendizajes del proyecto Cubillas Reservas

Apuntes de decisiones, bugs recurrentes y patrones útiles durante el desarrollo de esta app. Útil para revisión, documentación y para trasladar a futuros proyectos.

## Bugs recurrentes

### Joins ambiguos reservas ↔ usuarios
- La tabla `reservas` tiene 4 FK hacia `usuarios`: `usuario_id`, `creado_por`, `cancelado_por`, `marcado_presentado_por`.
- PostgREST no puede adivinar cuál usar en un join implícito.
- FIX: siempre usar `usuarios!reservas_usuario_id_fkey(...)` con el alias explícito.
- Apareció 4 veces durante el proyecto. Documentado en arquitectura.md.

### Inconsistencia naming `created_at` vs `creado_en`
- `reservas` usa `creado_en` (castellano).
- `usuarios` usa `created_at` (inglés, creado por trigger de auth).
- Varios ficheros TS tenían el tipo mal → código pedía una columna que no existía → silencioso.
- FIX post-lanzamiento: auto-generar tipos desde Supabase con `supabase gen types`.

## onClick pasando evento como primer argumento
- `onClick={funcion}` → React pasa MouseEvent al handler.
- Si `funcion` acepta un argumento opcional truthy, MouseEvent lo satisface → bug.
- FIX: siempre usar `onClick={() => funcion()}` para funciones con args opcionales.

### Edge Functions sin `--no-verify-jwt`
- Al desplegar EF que debe ser llamada sin JWT (crons, webhooks), añadir flag.
- Sin el flag, Supabase devuelve 401 "UNAUTHORIZED_NO_AUTH_HEADER".
- Verificar tras cada deploy con una llamada de prueba.

### UPDATE con falta de campos relacionados
- Al escribir un bloqueo con `bloqueado_hasta`, también hay que escribir `estado='bloqueado'` y `motivo_bloqueo`.
- Si solo se escribe el timestamp, el check en `crear-reserva` ignora el bloqueo.
- Lección: cuando un cambio toca múltiples campos relacionados, escribirlos siempre juntos como bloque atómico.

## Decisiones no obvias

### FK reservas.usuario_id con SET NULL
- Al eliminar un usuario por RGPD, las reservas pasadas deben conservarse (análisis histórico).
- CASCADE borraría todo.
- Solución: SET NULL. Y las reservas futuras se cancelan explícitamente antes de borrar al usuario (en la Edge Function `eliminar-cuenta`).

### 3 tipos de bloqueo diferenciados
1. Vivienda por impago (afecta a todos los habitantes).
2. Usuario automático por no-presentados.
3. Usuario manual por admin.
Cada uno con su UX, mensaje y lógica. Evita confusión y permite auditar.

### Textos de contacto separados
- `contacto_general` (vigilante): para emails de reserva operativos.
- `contacto_administracion`: para bloqueos y gestiones.
- Separar permite al admin personalizar cada canal sin conflicto.

### Estado previo al bloqueo
- Usuario bloqueado debe recordar su estado original (`activo` o `pendiente`).
- Columna `estado_previo_bloqueo` para restaurar correctamente al desbloquear.

## Patrones útiles

### Planificación antes de código
- Siempre discutir arquitectura en chat antes de pedirle a Claude Code que implemente.
- Ahorró varios bugs estructurales (cascada, tipos de bloqueo, privacidad).

### Commits frecuentes con descripción
- Al final de cada bloque funcional, commit con mensaje descriptivo.
- Permite volver atrás si un cambio rompe algo.

### Testing manual estructurado
- Tras cada Edge Function nueva, testing con inputs reales antes de continuar.
- Preparar casos de test con SQL explícito para forzar escenarios.

### Separar `planificación chat` / `ejecución Claude Code`
- Chat piensa y cuestiona.
- Claude Code ejecuta rápido.
- Separación evita que Claude Code vaya por caminos subóptimos sin darse cuenta.

## Para el próximo proyecto

- [ ] Auto-generar tipos TS desde Supabase desde el día 1.
- [ ] Convención de naming estricta desde el día 1.
- [ ] Configurar MCP de Supabase en Claude Code para queries automatizadas.
- [ ] Playbook personal sobre "cómo planificar antes de codear" para proyectos con IA.
