# Producción y escalabilidad

## Arquitectura

| Capa | Servicio | Escala |
|------|----------|--------|
| Frontend | Vercel (CDN global) | Auto |
| Auth + DB | Supabase | Plan Pro para alto tráfico |
| Push | Edge Function `send-push` | Auto |
| Realtime | Supabase Realtime | Por conexión |

## Notificaciones push (fuera de la app)

### 1. Ejecutar SQL

En Supabase SQL Editor, ejecuta en orden:

- `supabase/migrations/006_notifications_push.sql`

### 2. Generar claves VAPID

```bash
npx web-push generate-vapid-keys
```

- **Public key** → `VITE_VAPID_PUBLIC_KEY` en Vercel y `frontend/.env`
- **Private key** → Secret `VAPID_PRIVATE_KEY` en Supabase Edge Functions
- **Subject** → `VAPID_SUBJECT=mailto:tu@email.com`

### 3. Desplegar Edge Function

```bash
npx supabase login
npx supabase link --project-ref zpracfzjnnvlkgqjydiq
npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:...
npx supabase functions deploy send-push
```

### 4. Database Webhook

Supabase Dashboard → **Database → Webhooks → Create**:

| Campo | Valor |
|-------|-------|
| Table | `notifications` |
| Events | INSERT |
| URL | `https://zpracfzjnnvlkgqjydiq.supabase.co/functions/v1/send-push` |
| Headers | `Authorization: Bearer TU_SERVICE_ROLE_KEY` |
| Payload | `{ "notification_id": "{{ record.id }}", "user_id": "{{ record.user_id }}", "title": "{{ record.title }}", "body": "{{ record.body }}", "type": "{{ record.type }}" }` |

### 5. Activar push en la app

Perfil → **Alertas push** → ON (el navegador pedirá permiso).

## Cuándo se notifica

| Evento | Quién recibe |
|--------|--------------|
| Pareja **publica** un cupón | La pareja |
| Pareja **canjea** un cupón | El creador del cupón |

Funciona con la app **cerrada**, en otra pestaña o en el móvil (PWA).

## Rendimiento

- Cupones paginados (30 por página)
- Índices en `coupons`, `notifications`, `push_subscriptions`
- Reintentos automáticos en lecturas críticas
- Service Worker con cache de assets estáticos
- Realtime filtrado por `couple_id` / `user_id`

## Seguridad

- **RLS** en todas las tablas
- Solo el dueño lee/edita sus notificaciones y suscripciones push
- Edge Function valida service role
- Suscripciones push ligadas a `auth.uid()`
- Headers de seguridad en Vercel (`X-Frame-Options`, etc.)
- Secret keys nunca en el frontend

## Disponibilidad

- Vercel: 99.99% SLA
- Supabase: backups automáticos (activar PITR en producción)
- Error boundary en React + reintentos en API
- Suscripciones push obsoletas se eliminan automáticamente

## Checklist antes de lanzar

- [ ] SQL migrations 001–006 ejecutadas
- [ ] Realtime habilitado en `coupons` y `notifications`
- [ ] Webhook configurado
- [ ] Edge Function desplegada con VAPID
- [ ] Variables en Vercel
- [ ] OAuth redirect URLs de producción
- [ ] Rotar secret keys expuestas
