# Módulo 3: Autenticación con NextAuth

## Resultado Final
Login con Google OAuth, sesión protegida, helper de auth para API routes.

---

## Paso 0: Configurar Google OAuth

```
1. Ir a https://console.cloud.google.com
2. Crear proyecto → APIs & Services → Credentials
3. Create Credentials → OAuth 2.0 Client ID → Web application
4. Authorized redirect URIs: http://localhost:3000/api/auth/callback/google
5. Copiar Client ID y Client Secret
6. Crear .env.local en practix/ con:

   DATABASE_URL="postgresql://usuario:password@host:puerto/db?pgbouncer=true"
   (IMPORTANTE: NO incluir sslmode=require — se maneja en código, ver Paso 1)

   NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
   SUPABASE_SERVICE_KEY="sb_publishable_..."
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="<generar con: openssl rand -base64 32>"
   GOOGLE_CLIENT_ID="<tu-client-id>.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="<tu-client-secret>"

   NOTA: HUGGINGFACE_API_KEY, BREVO_API_KEY y BREVO_SENDER_EMAIL
   son opcionales hasta los módulos 11 y 12.
```

---

## Paso 1: Ajustes previos — env.ts y db.ts

### Variables de entorno opcionales

**Prompt para la IA:**
```
En src/lib/env.ts, marcá como opcionales las siguientes variables:
HUGGINGFACE_API_KEY, BREVO_API_KEY y BREVO_SENDER_EMAIL.
No son necesarias hasta los módulos 11 y 12.
```

### Instalar Driver Adapter para Prisma 7

Correr en terminal (dentro de practix/):
```bash
pnpm add @prisma/adapter-pg pg
pnpm add -D @types/pg
```

### Actualizar db.ts para Prisma 7 + Supabase

**BREAKING CHANGE de Prisma 7**: `new PrismaClient()` ya no acepta llamarse sin
opciones. Requiere un Driver Adapter explícito.

**Problema adicional con Supabase**: `pg-connection-string` trata `sslmode=require`
como `verify-full`, rechazando el certificado. Se resuelve quitando `sslmode` de la
URL programáticamente y pasando las opciones SSL al Pool directamente.

**Prompt para la IA:**
```
Actualizá src/server/lib/db.ts para Prisma 7 con las siguientes condiciones:

- Importar PrismaClient de @prisma/client
- Importar PrismaPg de @prisma/adapter-pg
- Importar Pool de pg

Crear función createPrismaClient() que:
  - Tome process.env.DATABASE_URL
  - Use new URL() para parsear la URL y elimine el parámetro sslmode con searchParams.delete()
  - Cree un pg.Pool con la URL limpia y ssl: { rejectUnauthorized: false }
  - Cree un PrismaPg adapter con el pool
  - Retorne new PrismaClient({ adapter })

Mantener el patrón singleton con globalThis para desarrollo.
```

---

## Paso 2: Configurar NextAuth

**Prompt para la IA:**
```
Configura NextAuth.js para PractiX en src/lib/auth.ts.

Provider: GoogleProvider con clientId y clientSecret desde env (importar desde @/lib/env).
Importar prisma desde @/server/lib/db.

Callbacks:

signIn({ user, account }):
  - Buscar usuario por email en DB con prisma
  - Si no existe: crear usuario con role STUDENT, email, name, image, provider, providerId
    y luego crear StudentProfile vacío asociado
  - Retornar true si todo ok, false en el catch (loguear el error con console.error)

jwt({ token, user }):
  - Solo cuando user existe (primer login): buscar usuario en DB por email
  - Guardar dbUser.id y dbUser.role en el token
  - Retornar token

session({ session, token }):
  - Copiar token.id a session.user.id
  - Copiar token.role a session.user.role
  - Retornar session

Dejar comentado: pages: { signIn: '/login' } — se activa en Módulo 7.

También exportar:
export async function getAuthSession() {
  return getServerSession(authOptions)
}
```

---

## Paso 3: Tipos de NextAuth

**Prompt para la IA:**
```
Crea src/types/index.ts con:

1. Augmentación de tipos de NextAuth (declare module):
   - Session.user: id: string, role: string, más los campos estándar opcionales
   - JWT: id: string, role: string

2. Interfaces de la app que reflejen los modelos Prisma:
   User, StudentProfile, CompanyProfile, Internship, Application

3. Interface genérica: PaginatedResponse<T> con data, total, page, pageSize, totalPages
```

---

## Paso 4: Route Handler de NextAuth

**Prompt para la IA:**
```
Crea el route handler de NextAuth para Next.js App Router.

Ubicación: src/app/api/auth/[...nextauth]/route.ts

- Importar NextAuth y authOptions desde @/lib/auth
- Crear handler con NextAuth(authOptions)
- Exportar como GET y POST
```

---

## Paso 5: Session Provider

**Prompt para la IA:**
```
Crea src/components/providers.tsx:
- 'use client'
- Importar SessionProvider de next-auth/react
- Componente que recibe children y los envuelve con SessionProvider

Luego actualiza src/app/layout.tsx:
- Importar Providers
- Envolver {children} con <Providers>
```

---

## Paso 6: Helper para Proteger API Routes

**Prompt para la IA:**
```
Crea src/server/lib/auth-guard.ts con la función requireAuth(requiredRole?: 'STUDENT' | 'COMPANY'):
- Llama a getAuthSession()
- Si no hay sesión → retorna { error: 'Unauthorized', status: 401 }
- Si hay requiredRole y session.user.role no coincide → retorna { error: 'Forbidden', status: 403 }
- Si todo ok → retorna { session, user: { id, role, email } }

Esto permite usarlo así en route handlers:
  const auth = await requireAuth('STUDENT')
  if ('error' in auth) return NextResponse.json(
    { error: auth.error }, { status: auth.status }
  )
```

---

## Paso 7: Verificación

```bash
# Asegurarse que Docker esté corriendo antes de pnpm dev
docker compose up -d

# En practix/:
pnpm dev

# 1. http://localhost:3000/api/auth/providers
#    → JSON con "google" como provider

# 2. http://localhost:3000/api/auth/signin
#    → Página default de NextAuth con botón de Google
#    (la página /login se activa en Módulo 7)

# 3. Login con Google → verificar en Prisma Studio:
pnpm db:studio
#    → tabla users: usuario creado con role STUDENT
#    → tabla student_profiles: perfil vacío asociado
```

---

## Problemas conocidos

| Problema | Causa | Solución |
|---|---|---|
| `PrismaClientInitializationError` al arrancar | Prisma 7 no acepta `new PrismaClient()` sin opciones | Instalar `@prisma/adapter-pg` y usar Driver Adapter (ver Paso 1) |
| `TlsConnectionError: self-signed certificate` | `pg-connection-string` trata `sslmode=require` como `verify-full` | Quitar `sslmode` de la URL en código y pasar `ssl: { rejectUnauthorized: false }` al Pool (ver Paso 1) |
| `Access Denied` al hacer login | `signIn` callback retorna `false` | Verificar que Docker esté corriendo y que no haya errores de SSL |
| 404 en `/login` | `pages: { signIn: '/login' }` apunta a ruta inexistente | Dejar comentado hasta el Módulo 7 |
| Variables de entorno faltantes al arrancar | `env.ts` las requiere pero son de módulos futuros | Marcar como `.optional()` en env.ts (ver Paso 1) |

---

## Checkpoint

Al final del módulo tenés:
- ✅ Google OAuth configurado y funcionando
- ✅ NextAuth crea usuarios automáticamente en DB al primer login
- ✅ StudentProfile vacío creado junto al usuario
- ✅ Session incluye user.id y user.role
- ✅ Helper requireAuth para proteger API routes
- ✅ SessionProvider en el layout
- ✅ Tipos de NextAuth augmentados
- ✅ Prisma 7 + Supabase SSL configurado correctamente
