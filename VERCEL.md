# Guía rápida: Deploy en Vercel

## Opción A — Desde la web (recomendada, 3 minutos)

1. Abre: **https://vercel.com/new/import?s=https://github.com/yaser-uwu/app-cupones**
2. Inicia sesión con GitHub si te lo pide
3. **Import** el repo `app-cupones`
4. Vercel detectará el `vercel.json` en la raíz — no cambies nada del build
5. En **Environment Variables**, añade (Production, Preview y Development):

| Variable | Valor |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://zpracfzjnnvlkgqjydiq.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | tu anon/publishable key |
| `VITE_VAPID_PUBLIC_KEY` | tu clave VAPID pública |

6. Clic en **Deploy**
7. Cuando termine, copia la URL (ej. `https://app-cupones.vercel.app`)

## Después del deploy — Supabase

En **Authentication → URL Configuration**:

| Campo | Valor |
|--------|--------|
| Site URL | `https://TU-URL.vercel.app` |
| Redirect URLs | `https://TU-URL.vercel.app` |

Añade también `http://localhost:5173` si sigues desarrollando en local.

## Google OAuth

No cambies el callback de Google. Sigue siendo:
`https://zpracfzjnnvlkgqjydiq.supabase.co/auth/v1/callback`

## Push notifications en producción

1. Edge Function `send-push` desplegada en Supabase
2. Webhook en tabla `notifications` → INSERT
3. Usuarios activan push en Perfil → Alertas push

Ver `DEPLOY.md` para detalle completo.

## Opción B — CLI

```bash
npx vercel login
cd frontend
npx vercel --prod
```

Variables de entorno: `npx vercel env add VITE_SUPABASE_URL`
