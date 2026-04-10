# Módulo 14: Seguridad

## Resultado Final
Rate limiting en endpoints críticos, validación estricta en todos los API routes, auditoría de dependencias automatizada, y checklist OWASP aplicado al proyecto.

> Los security headers y el npm audit en CI ya están implementados en el módulo 12.
> Este módulo cubre la seguridad a nivel de código de la aplicación.

---

## Paso 1: Rate Limiting

**Prompt para la IA:**
```
Implementa rate limiting en PractiX usando middleware de Next.js.

Usar la librería "upstash/ratelimit" con un Map en memoria (sin Redis, free tier).
Si no querés dependencias externas, implementar un rate limiter simple con Map.

Opción sin dependencias — crear src/server/lib/rate-limit.ts:

Implementar rate limiting con sliding window usando un Map en memoria:
- Función rateLimit(identifier: string, limit: number, windowMs: number)
- identifier: IP del request (header x-forwarded-for o x-real-ip)
- Retornar { success: boolean, remaining: number, resetAt: number }
- Limpiar entradas expiradas para evitar memory leaks

Aplicar en los siguientes API routes como primera validación:

1. /api/auth/* → 10 requests por minuto por IP
   (NextAuth lo maneja, pero agregar en el route personalizado si existe)

2. /api/matching/upload-cv → 5 requests por hora por usuario autenticado
   (procesar un CV es costoso en HuggingFace)

3. /api/matching/recommendations → 20 requests por hora por usuario

4. /api/internships (POST) → 10 requests por hora por empresa
   (limitar la creación masiva de prácticas)

Si el rate limit se supera, retornar:
- Status 429 Too Many Requests
- Header Retry-After con segundos hasta el reset
- JSON: { error: "Demasiadas solicitudes. Intentá de nuevo en X segundos." }
```

---

## Paso 2: Validación Estricta en Todos los Endpoints

**Prompt para la IA:**
```
Audita todos los API routes de PractiX y verifica que cada uno valide
su input con Zod antes de procesarlo.

Recorrer todos los archivos en src/app/api/**/route.ts y verificar:

1. Cada handler (GET, POST, PUT, PATCH, DELETE) que recibe body:
   - Parsea con z.safeParse() o z.parse()
   - Si falla, retorna 400 con los errores de validación
   - NUNCA pasa el body sin validar al service

2. Cada handler que recibe query params:
   - Valida con Zod (especialmente ids, filtros numéricos, paginación)
   - Ejemplo para id: z.string().cuid() o z.string().uuid()
   - Ejemplo para page: z.coerce.number().int().min(1).default(1)

3. Cada handler protegido verifica la sesión ANTES de cualquier otra lógica:
   const session = await getServerSession(authOptions)
   if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

4. Los endpoints que requieren rol específico verifican el rol:
   if (session.user.role !== "COMPANY") 
     return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })

Reportar los endpoints que están incompletos para corregirlos.
```

---

## Paso 3: Protección de Rutas con Middleware Global

**Prompt para la IA:**
```
Crea o actualiza el middleware de Next.js para PractiX.

Archivo: src/middleware.ts

El middleware debe:

1. Proteger las rutas del dashboard:
   - /dashboard/estudiante/* → requiere sesión + rol STUDENT
   - /dashboard/empresa/* → requiere sesión + rol COMPANY
   - Si no hay sesión → redirect a /login
   - Si hay sesión pero rol incorrecto → redirect a /dashboard correcto

2. Agregar header de seguridad básico a todas las respuestas:
   - X-Request-ID: uuid generado por cada request (útil para tracing en Sentry)

3. Configurar el matcher para excluir:
   - /_next/static
   - /_next/image
   - /favicon.ico
   - /api/health (el health check no requiere auth)
   - /api/auth (NextAuth maneja su propia auth)

Importar getToken de "next-auth/jwt" para leer la sesión en el middleware
(getServerSession no funciona en middleware de Next.js).
```

---

## Paso 4: Checklist OWASP Top 10 Aplicado a PractiX

Revisión de cada punto aplicado al proyecto:

### A01 — Broken Access Control
```
✅ Middleware protege rutas del dashboard por rol
✅ Cada API route verifica sesión con getServerSession
✅ Las empresas solo ven sus propias prácticas y postulantes
✅ Los estudiantes solo pueden modificar su propio perfil
❓ Verificar: un estudiante no puede cambiar el estado de una postulación
❓ Verificar: una empresa no puede ver CVs de postulantes de otra empresa
```

### A02 — Cryptographic Failures
```
✅ HTTPS forzado en Vercel (automático)
✅ Contraseñas no usadas (solo OAuth con Google)
✅ JWT firmado por NextAuth con NEXTAUTH_SECRET
✅ CVs almacenados en Supabase Storage (cifrado en reposo)
⚠️  Asegurar que NEXTAUTH_SECRET sea de mínimo 32 chars en producción
```

### A03 — Injection
```
✅ Prisma usa queries parametrizadas (no SQL crudo)
✅ Zod valida y sanitiza todos los inputs
✅ No hay eval() ni ejecución dinámica de código
⚠️  Prompt injection: el texto del CV se envía a HuggingFace para generar
    embeddings — esto es seguro (solo vectorización, no ejecución)
```

### A05 — Security Misconfiguration
```
✅ Security headers configurados en next.config.js (módulo 12)
✅ Variables de entorno nunca en el cliente (salvo NEXT_PUBLIC_*)
✅ .gitignore excluye .env.local
✅ Supabase Storage con service_role key solo en servidor
❓ Verificar: bucket "documents" de Supabase no es listable públicamente
```

### A06 — Vulnerable and Outdated Components
```
✅ pnpm audit en GitHub Actions (módulo 12)
→ Acción: activar Dependabot en el repositorio de GitHub:
  Settings → Security → Dependabot alerts → Enable
  Settings → Security → Dependabot security updates → Enable
```

### A07 — Identification and Authentication Failures
```
✅ Autenticación delegada a Google OAuth (no manejamos passwords)
✅ NextAuth maneja tokens de sesión seguros
✅ Sesión con expiración (configurar maxAge en authOptions)
⚠️  Configurar en authOptions: session: { maxAge: 24 * 60 * 60 } (24hs)
```

### A09 — Logging and Monitoring Failures
```
✅ Sentry captura errores en producción (módulo 12)
✅ Health check endpoint para monitoreo externo
→ Agregar en Sentry: alertas para error rate > 5% en 5 minutos
→ Considerar: loguear intentos de acceso no autorizado (401/403)
```

---

## Paso 5: Configurar Dependabot

```
En el repositorio de GitHub:

1. Ir a Settings → Security → Dependabot alerts → Enable
2. Settings → Security → Dependabot security updates → Enable

O crear .github/dependabot.yml:

version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"   # semanal es suficiente, no diario (evita ruido)
    open-pull-requests-limit: 5
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
        # Major versions requieren revisión manual
```

---

## Paso 6: Verificación Final de Seguridad

**Prompt para la IA:**
```
Ejecuta una revisión de seguridad sobre el código de PractiX.

Verificar punto por punto:

Backend:
[ ] Todos los endpoints retornan 401 sin sesión válida
[ ] Todos los endpoints retornan 403 si el rol no corresponde
[ ] Ningún endpoint expone datos de otros usuarios
[ ] Rate limiting activo en upload-cv y recommendations
[ ] No hay secrets en el código (buscar con grep: "sk-", "hf_", "xkeysib")
[ ] Variables de entorno validadas con Zod al arrancar

Frontend:
[ ] No hay lógica de autorización en el cliente (solo en el servidor)
[ ] No se muestran mensajes de error internos al usuario
[ ] Las rutas del dashboard redirigen si no hay sesión

Infraestructura:
[ ] .env.local está en .gitignore
[ ] NEXTAUTH_SECRET es aleatorio y tiene 32+ chars
[ ] Supabase bucket "documents" no es listable públicamente

Reportar cualquier issue encontrado con su severidad: CRITICAL / HIGH / MEDIUM.
```

---

## Checkpoint

Al final del módulo tienes:
- ✅ Rate limiting en endpoints costosos (upload-cv, recommendations)
- ✅ Validación estricta con Zod en todos los endpoints
- ✅ Middleware global protegiendo rutas por rol
- ✅ Checklist OWASP Top 10 revisado y aplicado
- ✅ Dependabot configurado para actualizaciones de seguridad
- ✅ Revisión de seguridad completa del proyecto
