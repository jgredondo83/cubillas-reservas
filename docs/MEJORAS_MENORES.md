# Mejoras menores pendientes

## Bugs

- [x] ~~**BUG — Reservar.tsx / generarFranjas**~~: NO ERA BUG. El solapamiento es correcto: la franja 17:30-18:30 SÍ solapa con 18:00-19:00 y debe bloquearse. Decidido mantener comportamiento estricto.

- [x] **BUG CRÍTICO — MisReservas.tsx**: las reservas no se podían cancelar. Causa: la Edge Function `cancelar-reserva` hacía UPDATE en columnas que no existían (`cancelado_en`, `cancelado_por`, `motivo_cancelacion`, `cancelo_tarde`). Fix: migración 007.

- [ ] **BUG COSMÉTICO — Reservar.tsx paso confirmar**: "0" suelto cuando `config.coste_euros = 0`. No reproducible actualmente; las protecciones en el JSX (`> 0` y ternario) ya están. Vigilar.

## Info

- [i] INFO (no bug) — Club Social 12h actualmente solo ofrece franja 12:00-00:00. Decidido mantener así en fase 1. Si en el futuro algún vecino pide flexibilidad (ej. reservar 14:00-02:00 o 18:00-06:00), se puede reconsiderar.

## Mejoras

- [x] `Reservar.tsx` — "0" suelto cuando coste_euros es 0. Arreglado (parcialmente, ver bug cosmético arriba).

- [ ] `Reservar.tsx` / `generarFranjas` — Mostrar franjas pasadas del día actual como deshabilitadas (grises) en vez de ocultarlas, para que el usuario entienda por qué no puede reservar ciertas horas.

- [x] `CompletarRegistro.tsx` — Cambiar ayuda del campo "Alias público". Arreglado en día 4.

- [x] Mensajes de error cuando cuenta bloqueada o vivienda morosa ahora incluyen datos de contacto de administración, configurables desde textos_admin.

- [ ] MEJORA — Panel admin: exportar usuarios, viviendas, reservas a CSV.
- [ ] MEJORA — Panel admin: importar viviendas desde CSV (útil cuando llegue el Excel del presidente).
- [ ] MEJORA — Revisar schema de viviendas: campos actuales (bloque, numero, letra) pueden no encajar con realidad de Cubillas (calle, tipo_vivienda). Esperar a tener Excel real antes de migrar.
- [x] MEJORA — AdminUsuarioDetalle: editar email ahora posible para super_admin (acción cambiar_email en gestionar-usuario-admin).
- [ ] MEJORA — Configurar Sender email address en Supabase Auth SMTP Settings con dominio propio (ej. noreply@brevosend.com temporal, o subdominio propio de Hostinger cuando se configure). Actualmente usa info@doyou.co.th que puede ir a spam.
