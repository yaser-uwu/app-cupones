# Cupones de Pareja

App para parejas donde pueden crear y canjear cupones románticos (ej: "Válido para invitarte el helado").

## Stack

- **Backend:** Spring Boot 3.4 + Java 21
- **Frontend:** React + TypeScript + Vite
- **Base de datos y auth:** Supabase (PostgreSQL + OAuth Google/Facebook)

## Reglas de negocio

| Acción | Permitido |
|--------|-----------|
| Crear cupón | Sí (queda en borrador) |
| Editar cupón | Solo en borrador, antes de publicar |
| Publicar cupón | Sí (ya no se puede editar ni borrar) |
| Borrar cupón | No (nunca) |
| Canjear cupón | Solo la pareja (no el creador), invalida el cupón |

## Configuración de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. En **Authentication > Providers**, habilita Google y Facebook
3. En **SQL Editor**, ejecuta el contenido de `supabase/migrations/001_initial_schema.sql`
4. Copia las credenciales:
   - URL del proyecto
   - Anon key (Settings > API)
   - JWT Secret (Settings > API > JWT Settings)
   - Database password (Settings > Database)

## Variables de entorno

```bash
# frontend/.env
cp frontend/.env.example frontend/.env

# backend/.env (exportar antes de ejecutar)
cp backend/.env.example backend/.env
```

## Ejecutar en local

### Backend

```bash
cd backend
# Configura las variables de entorno desde backend/.env
mvn spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/profile` | Perfil del usuario |
| POST | `/api/couple/join` | Vincular pareja con código |
| GET | `/api/coupons` | Listar cupones |
| GET | `/api/coupons/drafts` | Borradores propios |
| POST | `/api/coupons` | Crear cupón (borrador) |
| PUT | `/api/coupons/{id}` | Editar borrador |
| POST | `/api/coupons/{id}/publish` | Publicar cupón |
| POST | `/api/coupons/{id}/redeem` | Canjear cupón |

Todas las rutas requieren `Authorization: Bearer <token>` de Supabase.
