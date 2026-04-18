# Reservas Parque del Cubillas

PWA de reservas de pistas de pádel, tenis y club social para la comunidad de vecinos Parque del Cubillas.

## Arranque en local

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno y rellenar con tus claves de Supabase
cp .env.example .env.local

# 3. Arrancar servidor de desarrollo
npm run dev
```

## Stack

- React + TypeScript + Vite
- Tailwind CSS 3
- Supabase (auth + base de datos)
- PWA con vite-plugin-pwa
- Deploy en Vercel
