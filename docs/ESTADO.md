# Estado del proyecto

## Día 1 — 18 de abril de 2026

### Completado

- Proyecto Vite + React + TypeScript creado
- Tailwind CSS 3 configurado
- PWA configurada (manifest con nombre, colores, iconos placeholder)
- Supabase client (`src/lib/supabase.ts`) listo, lee de variables de entorno
- React Router v6 configurado con ruta `/` → Home
- Estructura de carpetas creada:
  - `src/components/{ui,reservas,admin,guarda,partidos}/`
  - `src/{hooks,lib,pages,types}/`
  - `src/pages/{admin,guarda}/`
  - `supabase/{migrations,functions}/`
  - `docs/`
- `.env.example` con variables necesarias
- `.gitignore` configurado
- Página Home placeholder con Tailwind

### Pendiente para Jaime (día 1)

- [ ] Crear proyecto Supabase (EU-Frankfurt, plan free)
- [ ] Copiar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` a `.env.local`
- [ ] Añadir iconos PWA reales en `public/icons/` (192x192 y 512x512)
- [ ] `git init && git add . && git commit` y subir a GitHub
- [ ] Conectar repo con Vercel

### Día 2 — Autenticación

- Login con magic link (email) vía Supabase Auth
- Protección de rutas por rol (vecino, admin, guarda)
- Contexto de autenticación (`AuthProvider`)
- Página de login
- Redirección según rol tras login
