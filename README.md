# PractiX

Portal de prácticas laborales con matching inteligente entre estudiantes y empresas.

## Matching IA

PractiX analiza el CV del estudiante y las descripciones de prácticas usando el modelo
`BAAI/bge-small-en-v1.5` de HuggingFace para generar embeddings vectoriales de 384
dimensiones. La similitud de coseno entre ambos vectores produce un score de afinidad
(0–100) que rankea las oportunidades más relevantes para cada estudiante.

## Stack

| Tecnología                | Servicio                   |
| ------------------------- | -------------------------- |
| Next.js 16 + React 19     | Framework full-stack       |
| TypeScript                | Lenguaje                   |
| Tailwind CSS v4           | Estilos                    |
| Prisma 7 + PostgreSQL     | Base de datos              |
| Supabase                  | Hosting DB + Storage       |
| NextAuth.js               | Autenticación Google OAuth |
| HuggingFace Inference API | Embeddings IA              |
| Brevo                     | Emails transaccionales     |
| Sentry                    | Monitoreo de errores       |
| Vercel                    | Deploy                     |

## Cómo funciona

```
Estudiante sube CV (PDF/DOCX)
  → pdf-parse / mammoth extrae el texto
  → HuggingFace genera embedding (384 dims)
  → Embedding guardado en StudentProfile

Empresa crea práctica
  → HuggingFace genera embedding de la descripción
  → Embedding guardado en Internship

Matching
  → cosine_similarity(student.embedding, internship.embedding)
  → score normalizado 0-100
  → Prácticas rankeadas en dashboard del estudiante
```

## Estructura del proyecto

```
practix/
├── src/
│   ├── app/
│   │   ├── api/          # Rutas HTTP (reciben request, validan, llaman service)
│   │   └── (dashboard)/  # Páginas protegidas
│   ├── server/
│   │   ├── services/     # Lógica de negocio pura (sin imports de Next.js)
│   │   ├── lib/          # Infraestructura (DB, Storage, Emails, Embeddings)
│   │   └── validators/   # Schemas Zod por endpoint
│   ├── lib/
│   │   ├── env.ts        # Variables de entorno validadas con Zod
│   │   └── auth.ts       # authOptions de NextAuth
│   └── types/            # Tipos TypeScript compartidos
├── prisma/
│   ├── schema.prisma     # 5 modelos: User, StudentProfile, CompanyProfile, Internship, Application
│   └── seed.ts           # Datos de ejemplo
└── prisma.config.ts      # Config Prisma 7 (URL fuera del schema)
```

## Correr localmente

**Requisitos:** Node 20+, pnpm, cuenta en Supabase, HuggingFace y Google Cloud Console.

```bash
# 1. Clonar
git clone <repo-url>
cd practix

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 4. Levantar PostgreSQL local
docker compose up -d

# 5. Crear tablas y seed
pnpm db:push
pnpm db:seed

# 6. Correr servidor de desarrollo
pnpm dev
# → http://localhost:3000
```

## Variables de entorno

| Variable                   | Descripción                                                                                                                                                                    | Dónde obtenerla                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `DATABASE_URL`             | PostgreSQL connection string usado por el cliente Prisma (queries)                                                                                                             | Supabase → Settings → Database → Transaction Pooler (puerto 6543) |
| `DIRECT_URL`               | Conexión directa para migraciones (`db push`, `migrate`). El pooler de pgBouncer no soporta todas las queries que usa la CLI. Opcional en dev local con Docker (no hay pooler) | Supabase → Settings → Database → Direct connection (puerto 5432)  |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase                                                                                                                                                      | Supabase → Settings → API                                         |
| `SUPABASE_SERVICE_KEY`     | Service role key                                                                                                                                                               | Supabase → Settings → API                                         |
| `NEXTAUTH_URL`             | URL base de la app                                                                                                                                                             | `http://localhost:3000` en dev, URL de Vercel en prod             |
| `NEXTAUTH_SECRET`          | Secreto para firmar tokens                                                                                                                                                     | `openssl rand -base64 32`                                         |
| `GOOGLE_CLIENT_ID`         | OAuth Client ID                                                                                                                                                                | Google Cloud Console → APIs & Services → Credentials              |
| `GOOGLE_CLIENT_SECRET`     | OAuth Client Secret                                                                                                                                                            | Google Cloud Console → APIs & Services → Credentials              |
| `HUGGINGFACE_API_KEY`      | Token de HuggingFace                                                                                                                                                           | huggingface.co → Settings → Access Tokens                         |
| `BREVO_API_KEY`            | API Key de Brevo                                                                                                                                                               | Brevo → Settings → SMTP & API → API Keys                          |
| `BREVO_SENDER_EMAIL`       | Email del remitente                                                                                                                                                            | Email verificado en Brevo                                         |
| `NEXT_PUBLIC_SENTRY_DSN`   | DSN de Sentry                                                                                                                                                                  | sentry.io → Project → Settings → Client Keys                      |

## Deploy en Vercel

1. Subir el repo a GitHub
2. Ir a [vercel.com](https://vercel.com) → Add New Project → importar el repo
3. Framework: **Next.js** (auto-detectado) · Root directory: `./`
4. Agregar todas las variables de entorno del cuadro anterior
5. Click **Deploy**
6. Post-deploy: agregar `https://<tu-app>.vercel.app/api/auth/callback/google` como redirect URI en Google Cloud Console

## API Endpoints

40+ rutas agrupadas por área. Todas las rutas autenticadas pasan por `requireAuth(role?)` (`src/server/lib/auth-guard.ts`); las que aceptan body validan con Zod (`src/server/validators/`); las que mutan datos ajenos verifican ownership en el service (helpers `findOwned*`).

### Auth

| Método | Ruta                         | Descripción                                 | Auth |
| ------ | ---------------------------- | ------------------------------------------- | ---- |
| —      | `/api/auth/[...nextauth]`    | NextAuth (Google OAuth + credentials)       | —    |
| POST   | `/api/auth/empresa/register` | Registro de empresa con bcrypt + rate limit | No   |
| POST   | `/api/auth/refresh`          | Refresh token rotation                      | No   |
| POST   | `/api/auth/logout`           | Logout + revoke refresh token               | Sí   |
| POST   | `/api/auth/forgot-password`  | Pedido de reset (anti-enumeration)          | No   |
| POST   | `/api/auth/reset-password`   | Reset con token + bcrypt                    | No   |

### Users / Profile / Perfil

| Método    | Ruta                         | Descripción                     | Auth    |
| --------- | ---------------------------- | ------------------------------- | ------- |
| GET / PUT | `/api/users/me`              | Perfil del usuario autenticado  | Sí      |
| POST      | `/api/users/registro`        | Registro inicial estudiante     | STUDENT |
| PUT       | `/api/users/profile/student` | Editar perfil estudiante        | STUDENT |
| PUT       | `/api/users/profile/company` | Editar perfil empresa           | COMPANY |
| GET / PUT | `/api/perfil`                | Perfil unificado                | Sí      |
| POST      | `/api/perfil/avatar`         | Subir avatar a Supabase Storage | Sí      |

### Internships

| Método          | Ruta                       | Descripción                               | Auth    |
| --------------- | -------------------------- | ----------------------------------------- | ------- |
| GET             | `/api/internships`         | Listar (filtros + paginación)             | No      |
| POST            | `/api/internships`         | Crear (genera embedding HF en background) | COMPANY |
| GET / PUT / DEL | `/api/internships/:id`     | Detalle / actualizar / soft delete        | varios  |
| GET             | `/api/company/internships` | Mis prácticas (empresa)                   | COMPANY |

### Applications

| Método | Ruta                               | Descripción                      | Auth    |
| ------ | ---------------------------------- | -------------------------------- | ------- |
| POST   | `/api/applications`                | Postularse                       | STUDENT |
| GET    | `/api/applications/my`             | Mis postulaciones                | STUDENT |
| GET    | `/api/applications/internship/:id` | Postulantes de una práctica      | COMPANY |
| PATCH  | `/api/applications/:id`            | Cambiar estado (ownership check) | COMPANY |
| POST   | `/api/applications/:id/notify`     | Email al estudiante              | COMPANY |

### Matching

| Método | Ruta                            | Descripción                               | Auth    |
| ------ | ------------------------------- | ----------------------------------------- | ------- |
| POST   | `/api/matching/upload-cv`       | Subir CV (PDF/DOCX) + generar embedding   | STUDENT |
| GET    | `/api/matching/recommendations` | Prácticas rankeadas por cosine similarity | STUDENT |

### ATS

| Método      | Ruta                               | Descripción                         | Auth    |
| ----------- | ---------------------------------- | ----------------------------------- | ------- |
| GET / POST  | `/api/ats/config` / `:jobId`       | Config ATS (5 scorers) por práctica | COMPANY |
| GET / PATCH | `/api/ats/pipeline/:applicationId` | Pipeline kanban (PENDING→ACCEPTED)  | COMPANY |
| GET         | `/api/ats/score/:applicationId`    | Score breakdown 1 candidato         | COMPANY |
| GET         | `/api/ats/score/job/:jobId`        | Ranking de todos los candidatos     | COMPANY |

### Chat

| Método     | Ruta                                   | Descripción                 | Auth |
| ---------- | -------------------------------------- | --------------------------- | ---- |
| GET / POST | `/api/chat/conversations`              | Listar / crear conversación | Sí   |
| GET        | `/api/chat/conversations/:id`          | Metadata de conversación    | Sí   |
| GET / POST | `/api/chat/conversations/:id/messages` | Mensajes paginados / enviar | Sí   |
| PATCH      | `/api/chat/conversations/:id/read`     | Marcar como leídos          | Sí   |

### Interviews

| Método            | Ruta                                          | Descripción               | Auth    |
| ----------------- | --------------------------------------------- | ------------------------- | ------- |
| GET / POST        | `/api/interviews`                             | Listar / crear entrevista | COMPANY |
| GET / PATCH / DEL | `/api/interviews/:id`                         | Detalle / editar / borrar | COMPANY |
| POST              | `/api/interviews/:id/send-to-chat`            | Enviar al chat            | COMPANY |
| GET               | `/api/interviews/available-candidates/:jobId` | Candidatos disponibles    | COMPANY |

### Notifications

| Método | Ruta                          | Descripción                 | Auth |
| ------ | ----------------------------- | --------------------------- | ---- |
| GET    | `/api/notifications`          | Listar (filtro por usuario) | Sí   |
| DELETE | `/api/notifications/:id`      | Borrar (ownership check)    | Sí   |
| PATCH  | `/api/notifications/read-all` | Marcar todas como leídas    | Sí   |

### Admin

| Método | Ruta                      | Descripción                          | Auth  |
| ------ | ------------------------- | ------------------------------------ | ----- |
| GET    | `/api/admin/empresas`     | Listar empresas pendientes/aprobadas | ADMIN |
| PATCH  | `/api/admin/empresas/:id` | Aprobar / rechazar empresa           | ADMIN |

### Health

| Método | Ruta          | Descripción                        | Auth |
| ------ | ------------- | ---------------------------------- | ---- |
| GET    | `/api/health` | Estado del servidor + ping a la DB | No   |

## Calidad y hardening

- **Tests**: 1097 unit/component + 53 E2E. Coverage thresholds: 100% func / 80% lines-branches.
- **Seguridad (OWASP Top 10)**: rate limiting distribuido (Upstash Redis), CSP con nonces dinámicos, JWT 15min + refresh token rotation, headers (HSTS, X-Frame-Options, COOP, etc.), audit completo de `/api/*` con anti-enumeration y ownership checks, `pnpm audit --audit-level=moderate` en CI.
- **Observabilidad**: logger estructurado pino con correlation `x-request-id`, Sentry con releases ligados a commit (`practix@<sha>`), Performance Monitoring (`tracesSampleRate: 0.1`), 3 alertas configuradas, sourcemaps en cada deploy de Vercel, 3 runbooks operacionales en `docs/runbooks/`.
- **CI/CD**: GitHub Actions con lint + type-check + tests + build + audit. Dependabot agrupado (react, sentry, prisma, testing) para evitar PRs con versiones desincronizadas.
- **6 ADRs** en `docs/adr/` documentan las decisiones arquitectónicas relevantes.
- **Refactor-plan completo** en `context/refactor-plan.md` (Fases 0–6 core cerradas; F6.4 NFR P95 + F6.5 UX optimistic quedan opcionales).

## Licencia

MIT
