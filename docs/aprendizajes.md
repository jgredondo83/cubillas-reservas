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

### JWT en Edge Functions — verificación manual (ES256)
- Bug recurrente de Supabase: la verificación automática de JWT en EF no soporta el algoritmo ES256.
- Error que aparece: 401 "Unsupported JWT algorithm ES256".
- FIX: desplegar SIEMPRE con `--no-verify-jwt` y verificar el token manualmente dentro de la función.
- Patrón implementado en `supabase/functions/_shared/auth.ts`:
  ```ts
  const auth = await verificarJWT(req, supabaseAdmin)
  if (auth.error) return respuesta(auth.status, { error: auth.error })
  const { user } = auth
  ```
- Internamente usa `supabaseAdmin.auth.getUser(token)` con el service role key.
- Aplica a TODAS las EF que requieran JWT de vecino: `exportar-mis-datos`, `eliminar-cuenta`.
- Las EF de admin (llamadas desde el panel) también deben usar este patrón si verifican JWT.

### Anonimización RGPD — SET NULL + NOT NULL se contradicen (error 23502)
- Para que un usuario pueda ser eliminado con SET NULL en cascade, **todas** las columnas FK que apuntan a esa tabla deben permitir NULL.
- Si tienen restricción NOT NULL, el DELETE falla con `ERROR 23502: null value in column "X" of relation "Y" violates not-null constraint`.
- Apareció en `reservas.creado_por` (definida NOT NULL en schema original) aunque la FK ya era `ON DELETE SET NULL` desde mig 013.
- FIX: `ALTER TABLE reservas ALTER COLUMN creado_por DROP NOT NULL` (+ resto de columnas en mig 024).

**Checklist al añadir una FK hacia `usuarios`:**
- ¿Quieres conservar el registro histórico anonimizado al borrar el usuario?
  - **SÍ**: FK `ON DELETE SET NULL` + columna SIN `NOT NULL`.
  - **NO**: FK `ON DELETE CASCADE`.
- Tablas afectadas en este proyecto: `reservas` (creado_por, cancelado_por, marcado_presentado_por), `logs_admin` (admin_id, target_id), `bloqueos` (creado_por), `avisos` (creado_por), `textos_admin` (updated_by).

### Bug latente post-RGPD: relaciones anonimizadas pueden ser null en componentes

Tras implementar el borrado por RGPD (SET NULL en `reservas.usuario_id`), cualquier componente que acceda a `reserva.usuarios.X` sin comprobar null puede romper en runtime con `Cannot read properties of null`.

**Regla defensiva:** siempre tipar relaciones de tablas anonimizables como `T | null` y comprobar antes de acceder.

- Detectado en: `TarjetaReservaGuarda.tsx` — crash en `/guarda/hoy` con `reserva.usuarios.nombre`.
- También afectaba: `AdminReservas.tsx` — link `/admin/usuarios/null` cuando `usuario_id=null`.
- Ya seguro antes del bug: `AdminNoPresentados.tsx` (ya tenía `u ? ... : 'vecino desconocido'`).

**Patrón correcto:**
```tsx
// ❌ Rompe si el vecino fue eliminado
{reserva.usuarios.nombre}

// ✅ Tolerante a null
{reserva.usuarios ? reserva.usuarios.nombre : '— Vecino eliminado —'}

// ✅ Link seguro
{r.usuario_id
  ? <Link to={`/admin/usuarios/${r.usuario_id}`}>{r.usuario_nombre}</Link>
  : <span className="italic text-gray-400">Vecino eliminado</span>
}
```

**Checklist al añadir un componente que muestra datos de una reserva:**
- ¿Accede a `.usuarios.*`? → comprobar null, mostrar fallback `— Vecino eliminado —`.
- ¿Genera un link a `/admin/usuarios/:id`? → condicionar a `usuario_id != null`.
- Los botones de acción (marcar asistencia, cancelar) funcionan sobre la reserva, no el usuario → siguen operativos.

### UPDATE con falta de campos relacionados
- Al escribir un bloqueo con `bloqueado_hasta`, también hay que escribir `estado='bloqueado'` y `motivo_bloqueo`.
- Si solo se escribe el timestamp, el check en `crear-reserva` ignora el bloqueo.
- Lección: cuando un cambio toca múltiples campos relacionados, escribirlos siempre juntos como bloque atómico.

## Reglas de negocio

### Antelación de reservas: vecinos vs admin/guarda

Reglas del reglamento de la comunidad:
- **Pádel**: antelación mínima 0 días, máxima 3 días. Vecinos pueden reservar hoy mismo.
- **Tenis**: antelación mínima 0 días, máxima 7 días. Vecinos pueden reservar hoy mismo.
- **Club Social**: antelación mínima 3 días, máxima 365 días. Necesitan tiempo para gestionar pago, fianza y entrega de llaves.
- **Admin/guarda**: sin restricciones de antelación (mínima ni máxima). Hard cap de 365 días. Pueden reservar franjas que comiencen en cualquier momento (tolerancia 60s para race conditions).

Configuración en `recursos.config`: `antelacion_dias` (máxima) y `antelacion_minima_dias` (mínima, default 0).

La condición en EF `crear-reserva`:
```js
const aplicarRestriccionesAntelacion = perfilObjetivo.rol === 'vecino' && perfil.rol === 'vecino'
```
Si el caller es admin/guarda creando reserva a nombre de un vecino, tampoco se aplican restricciones.

En frontend (`Reservar.tsx`), el date picker usa `generarDias(365, 0)` para privilegiados y `generarDias(antelacion_dias, antelacion_minima_dias)` para vecinos. Los slots del día de hoy: se ocultan solo los ya pasados (margen = 0ms), sin buffer adicional.

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
