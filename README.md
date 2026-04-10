# PractiX

Portal de prácticas laborales con matching inteligente entre estudiantes y empresas.

## Matching IA

PractiX analiza el CV del estudiante y las descripciones de prácticas usando el modelo
`BAAI/bge-small-en-v1.5` de HuggingFace para generar embeddings vectoriales de 384
dimensiones. La similitud de coseno entre ambos vectores produce un score de afinidad
(0–100) que rankea las oportunidades más relevantes para cada estudiante.

## Stack

| Tecnología | Servicio |
|------------|----------|
| Next.js 16 + React 19 | Framework full-stack |
| TypeScript | Lenguaje |
| Tailwind CSS v4 | Estilos |
| Prisma 7 + PostgreSQL | Base de datos |
| Supabase | Hosting DB + Storage |
| NextAuth.js | Autenticación Google OAuth |
| HuggingFace Inference API | Embeddings IA |
| Brevo | Emails transaccionales |
| Sentry | Monitoreo de errores |
| Vercel | Deploy |

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

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| `DATABASE_URL` | PostgreSQL connection string | Supabase → Settings → Database → Transaction Pooler (puerto 6543) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | Service role key | Supabase → Settings → API |
| `NEXTAUTH_URL` | URL base de la app | `http://localhost:3000` en dev, URL de Vercel en prod |
| `NEXTAUTH_SECRET` | Secreto para firmar tokens | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | OAuth Client ID | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret | Google Cloud Console → APIs & Services → Credentials |
| `HUGGINGFACE_API_KEY` | Token de HuggingFace | huggingface.co → Settings → Access Tokens |
| `BREVO_API_KEY` | API Key de Brevo | Brevo → Settings → SMTP & API → API Keys |
| `BREVO_SENDER_EMAIL` | Email del remitente | Email verificado en Brevo |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN de Sentry | sentry.io → Project → Settings → Client Keys |

## Deploy en Vercel

1. Subir el repo a GitHub
2. Ir a [vercel.com](https://vercel.com) → Add New Project → importar el repo
3. Framework: **Next.js** (auto-detectado) · Root directory: `./`
4. Agregar todas las variables de entorno del cuadro anterior
5. Click **Deploy**
6. Post-deploy: agregar `https://<tu-app>.vercel.app/api/auth/callback/google` como redirect URI en Google Cloud Console

## API Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Estado del servidor y base de datos | No |
| GET | `/api/users/me` | Perfil del usuario autenticado | Sí |
| PUT | `/api/users/me` | Actualizar perfil | Sí |
| GET | `/api/internships` | Listar prácticas (filtros + paginación) | No |
| POST | `/api/internships` | Crear práctica | COMPANY |
| GET | `/api/internships/:id` | Detalle de práctica | No |
| PUT | `/api/internships/:id` | Actualizar práctica | COMPANY |
| DELETE | `/api/internships/:id` | Desactivar práctica (soft delete) | COMPANY |
| POST | `/api/applications` | Postularse a una práctica | STUDENT |
| GET | `/api/applications/my` | Mis postulaciones | STUDENT |
| GET | `/api/applications/internship/:id` | Postulantes de una práctica | COMPANY |
| PATCH | `/api/applications/:id/status` | Cambiar estado de postulación | COMPANY |
| POST | `/api/matching/upload-cv` | Subir CV y generar embedding | STUDENT |
| GET | `/api/matching/recommendations` | Prácticas recomendadas con score | STUDENT |

## Licencia

MIT
