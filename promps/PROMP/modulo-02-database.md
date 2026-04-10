# Módulo 2: Base de Datos con Prisma + Supabase

## Resultado Final
5 modelos en PostgreSQL, Prisma Client listo, Supabase Storage configurado.

---

## Paso 1: Crear Cuenta en Supabase

```
1. Ir a https://supabase.com → Create project (free tier)
2. Esperar que el proyecto se provisione
3. Copiar credenciales (Settings → API / Database):
   - Project URL → NEXT_PUBLIC_SUPABASE_URL
   - service_role key → SUPABASE_SERVICE_KEY
   - Connection string (Settings → Database → URI) → DATABASE_URL
4. Actualizar .env.local con estos valores
```

---

## Paso 2: Definir Schema

**Prompt para la IA:**
```
Crea el schema de Prisma para PractiX.

Ubicación: prisma/schema.prisma

Provider: postgresql
Datasource url: env("DATABASE_URL")

Enums:
- Role: STUDENT, COMPANY
- Modality: REMOTE, ONSITE, HYBRID
- ApplicationStatus: PENDING, REVIEWED, ACCEPTED, REJECTED

Modelos:

1. User
   - id: cuid, @id
   - email: String, @unique
   - name: String
   - role: Role
   - image: String? (avatar URL)
   - provider: String? (google, linkedin, microsoft)
   - providerId: String?
   - createdAt: DateTime @default(now())
   - updatedAt: DateTime @updatedAt
   - Relaciones: studentProfile (1:1 opcional), companyProfile (1:1 opcional), 
     applications (1:N)
   - @@map("users")

2. StudentProfile
   - id: cuid
   - userId: String, @unique, FK → User con onDelete Cascade
   - university: String?
   - career: String?
   - semester: Int?
   - skills: String[] (array nativo de PostgreSQL)
   - bio: String?
   - cvUrl: String? (URL del CV en Supabase Storage)
   - cvText: String? (texto extraído del CV)
   - embedding: Float[] (vector embedding para matching IA)
   - timestamps
   - @@map("student_profiles")

3. CompanyProfile
   - id: cuid
   - userId: String, @unique, FK → User con onDelete Cascade
   - companyName: String
   - industry: String?
   - website: String?
   - logo: String?
   - description: String?
   - Relación: internships (1:N)
   - timestamps
   - @@map("company_profiles")

4. Internship
   - id: cuid
   - companyId: String, FK → CompanyProfile con onDelete Cascade
   - title: String
   - description: String
   - area: String (ej: "Ingeniería", "Marketing")
   - location: String
   - modality: Modality
   - duration: String (ej: "3 meses")
   - requirements: String[]
   - skills: String[]
   - embedding: Float[] (embedding de título+descripción+skills)
   - isActive: Boolean @default(true)
   - Relación: applications (1:N)
   - timestamps
   - @@map("internships")

5. Application
   - id: cuid
   - studentId: String, FK → User con onDelete Cascade
   - internshipId: String, FK → Internship con onDelete Cascade
   - status: ApplicationStatus @default(PENDING)
   - matchScore: Float? (score de afinidad 0-100)
   - coverLetter: String?
   - timestamps
   - @@unique([studentId, internshipId])
   - @@map("applications")
```

---

## Paso 3: Sincronizar con Supabase

```bash
pnpm db:generate    # Generar Prisma Client
pnpm db:push        # Crear tablas en Supabase
pnpm db:studio      # Verificar en http://localhost:5555
```

---

## Paso 4: Prisma Client Singleton

**Prompt para la IA:**
```
Crea un singleton de Prisma Client optimizado para Next.js.

Ubicación: src/server/lib/db.ts

Patrón: usar globalThis para evitar múltiples conexiones 
durante hot-reload en desarrollo.

En producción crea una instancia normal.
En desarrollo guarda la instancia en globalThis y la reutiliza.

Exportar como: export const prisma
```

---

## Paso 5: Supabase Storage Client

```
En el dashboard de Supabase:
1. Ir a Storage → Create new bucket
2. Nombre: "documents"
3. Marcar como "Public bucket"
4. Crear
```

**Prompt para la IA:**
```
Crea el cliente de Supabase Storage.

Ubicación: src/server/lib/storage.ts

Requisitos:
- Crear cliente Supabase con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_KEY
- Función uploadFile(bucket: string, path: string, file: Buffer, contentType: string):
  - Sube el archivo con upsert: true
  - Retorna la URL pública
  - Lanza error si falla

Exportar: supabase (cliente) y uploadFile (función)
```

---

## Paso 6: Schemas de Validación

**Prompt para la IA:**
```
Crea los schemas de validación con Zod para PractiX.

Ubicación: src/server/validators/index.ts

Schemas:

1. registerSchema:
   - email: string().email()
   - name: string().min(2)
   - role: enum(['STUDENT', 'COMPANY'])
   - provider: string() opcional
   - providerId: string() opcional
   - image: string().url() opcional

2. studentProfileSchema:
   - university: string() opcional
   - career: string() opcional
   - semester: number().int().min(1).max(16) opcional
   - skills: array(string()) opcional
   - bio: string().max(500) opcional

3. companyProfileSchema:
   - companyName: string().min(2)
   - industry: string() opcional
   - website: string().url() opcional
   - description: string().max(1000) opcional

4. createInternshipSchema:
   - title: string().min(3)
   - description: string().min(20)
   - area: string()
   - location: string()
   - modality: enum(['REMOTE', 'ONSITE', 'HYBRID'])
   - duration: string()
   - requirements: array(string())
   - skills: array(string())

5. filterInternshipSchema:
   - area: string() opcional
   - location: string() opcional
   - modality: enum() opcional
   - search: string() opcional
   - page: coerce.number().int().min(1).default(1)
   - limit: coerce.number().int().min(1).max(50).default(12)

6. applySchema:
   - internshipId: string()
   - coverLetter: string().max(2000) opcional

7. updateStatusSchema:
   - status: enum(['REVIEWED', 'ACCEPTED', 'REJECTED'])

Exportar todos los schemas.
```

---

## Paso 7: Verificación

```bash
pnpm db:push        # Tablas creadas sin errores
pnpm db:studio      # GUI muestra 5 tablas vacías
pnpm dev            # App arranca sin errores de importación
```

---

## Checkpoint

Al final del módulo tienes:
- ✅ Supabase project creado (free tier)
- ✅ 5 modelos de Prisma con relaciones
- ✅ 4 enums: Role, Modality, ApplicationStatus
- ✅ Tablas creadas en PostgreSQL
- ✅ Prisma Client singleton
- ✅ Supabase Storage con bucket "documents"

---

## ⚠️ Diferencias con Prisma 7

### 1. `schema.prisma` sin `url`
Prisma 7 eliminó `url = env("DATABASE_URL")` del datasource. El schema queda:
```prisma
datasource db {
  provider = "postgresql"
}
```

### 2. `prisma.config.ts` (archivo nuevo)
La URL se mueve a un archivo nuevo en la raíz:
```ts
import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config({ path: ".env.local" });  // necesario para que CLI cargue el env

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
```
> Instalar `dotenv` como devDependency: `pnpm add -D dotenv`

### 3. `PrismaClient` sin argumentos
En Prisma 7 el cliente toma la URL de `prisma.config.ts` automáticamente:
```ts
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
// Ya NO se pasa datasourceUrl en el constructor
```

### 4. Conexión en red IPv4
El Direct connection (puerto 5432) puede estar bloqueado en redes IPv4. Usar el **Transaction Pooler** (puerto 6543) como `DATABASE_URL`. Agregar `?pgbouncer=true&sslmode=require` al final.

### 5. `pnpm db:studio`
Puede fallar por los mismos problemas de conectividad. Usar el **Table Editor de Supabase** como alternativa equivalente.

### 6. RLS deshabilitado
Las tablas aparecen como "unrestricted RLS disabled" en Supabase. Es correcto — la arquitectura usa Prisma server-side con `service_role`, no acceso directo desde el browser.
- ✅ Schemas de validación Zod centralizados
