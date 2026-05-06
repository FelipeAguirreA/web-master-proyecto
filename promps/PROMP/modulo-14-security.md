# Módulo 14: Seguridad

## Resultado Final

Rate limiting distribuido en endpoints críticos, refresh token rotation con JWT corto, CSP con nonces dinámicos, validación estricta en todos los API routes con anti-enumeration, auditoría completa de `/api/*` con ownership checks, y checklist OWASP Top 10 aplicado.

> Los security headers básicos y el `pnpm audit` en CI vienen del módulo 12.
> Este módulo cubre la seguridad a nivel de aplicación. La **Fase 3 del
> refactor-plan** profundizó MUCHO más cada uno de estos puntos: si seguís
> esta guía y querés llegar al estado final del proyecto, leer también
> `context/refactor-plan.md` (Fase 3) y `docs/security-audit-api.md` (audit
> de los 12 areas con 31 findings 🛑 cerrados + 14 ⚠️ documentados).

---

## Paso 1: Rate Limiting Distribuido

**Prompt para la IA:**

```
Implementa rate limiting distribuido en PractiX con Upstash Redis.

GOTCHA REAL — por qué NO usar Map en memoria:
En Vercel cada request puede caer en una instancia distinta del lambda (cold
start, fan-out). Un Map en memoria solo cuenta requests de UNA instancia,
entonces el límite efectivo se multiplica por la cantidad de instancias y
NO funciona como protección. Esto se descubrió en producción y se resolvió
en la Fase 3 del refactor-plan (P0). Para dev/test sin Redis hay un fallback
in-memory documentado pero NO es la implementación de prod.

Usar @upstash/ratelimit + @upstash/redis (free tier, 10k requests/día).

1. Crear cuenta en https://console.upstash.com → Create Database → Redis
2. Copiar UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN al .env.local
   y agregarlos a src/lib/env.ts como opcionales (z.string().url().optional()
   para la URL, z.string().min(1).optional() para el token).

3. Crear src/server/lib/rate-limit.ts:
   - Inicializar Redis con Redis.fromEnv() (lee URL+TOKEN)
   - Si las env vars NO están: fallback a un Map in-memory para dev/test
   - Función rateLimit(identifier: string, limit: number, windowMs: number)
     - identifier: IP del request (header x-forwarded-for o x-real-ip),
       O userId si está autenticado (más justo)
     - Usar slidingWindow del Ratelimit de Upstash
     - Retornar { success: boolean, remaining: number, resetAt: number }
   - Tests unitarios en src/test/unit/rate-limit.test.ts cubriendo ambos paths
     (Upstash mockeado + fallback in-memory)

4. Aplicar como PRIMERA validación en los API routes (antes de leer body):

   Auth (anti brute-force):
   - POST /api/auth/empresa/register → 5 requests/hora por IP
   - POST /api/auth/forgot-password → 5 requests/hora por IP (anti-enumeration)
   - POST /api/auth/reset-password → 10 requests/hora por IP
   - Login attempts (manejado dentro del callback authorize de NextAuth)
     → 10 fallos/5min por IP, dispara alerta de Sentry tags.auth: "login_failed"

   Costosos:
   - POST /api/matching/upload-cv → 5 requests/hora por usuario (HF + Storage)
   - GET /api/matching/recommendations → 20 requests/hora por usuario

   Anti-spam:
   - POST /api/internships → 10 requests/hora por empresa
   - POST /api/applications/[id]/notify → 10 requests/hora por empresa
   - POST /api/chat/conversations/[id]/messages → 60 requests/hora por usuario

5. Si el rate limit se supera:
   - Status 429 Too Many Requests
   - Header Retry-After con segundos hasta el reset
   - JSON: { error: "Demasiadas solicitudes. Intentá de nuevo en X segundos." }
   - NO loguear plaintext del email/identifier — usar sha256 truncado a 8 chars
     (privacy by default, decisión de la Fase 3 paso 3.6)

Decisión arquitectónica documentada: ADR 003 — "Rate limiting con Upstash Redis".
```

---

## Paso 2: Audit completo de `/api/*` con Anti-Enumeration y Ownership Checks

**Prompt para la IA:**

```
Audita TODOS los API routes de PractiX siguiendo OWASP Top 10. La auditoría
real (Fase 3 paso 3.7 del refactor-plan) cubrió 12 áreas y cerró 31 findings 🛑
con tests + 14 ⚠️ documentados como decisiones conscientes. Ver
docs/security-audit-api.md para el detalle.

Patrón a aplicar en cada handler:

1. Auth + autorización ANTES de cualquier otra lógica:
   - Usar el helper requireAuth(role?) de src/server/lib/auth-guard.ts
     (NO getServerSession crudo — el helper unifica el manejo)
   - Si requiere rol específico, pasarlo: requireAuth("COMPANY")
   - El helper retorna 401/403 con mensajes genéricos uniformes (no leakean
     si el endpoint existe o no para roles distintos)

2. Validación Zod estricta:
   - Body con safeParse() — 400 con errores de validación si falla
   - Query params con Zod (z.string().cuid() para ids, z.coerce.number()
     para paginación). Para discriminated unions: z.discriminatedUnion("type")
   - Casts de Prisma.JsonValue solo en boundaries documentados con comentario

3. Ownership checks ANTES del state check:
   - Si el endpoint muta datos de un recurso de otro tenant (ej: una empresa
     mutando applications de prácticas ajenas), verificar ownership PRIMERO
   - Patrón: helper privado findOwned*(resourceId, userId) que filtra por
     internship.companyId/etc. y devuelve null si no es del usuario
   - Retornar 404 unificado (no 403) — anti-enumeration: que el atacante
     no pueda inferir si el recurso existe pero pertenece a otro

4. Anti-enumeration en flows sensibles:
   - forgot-password: SIEMPRE retornar el mismo response, exista o no el email
   - register/empresa: rate limit de 5/h por IP mitiga el ataque a costo razonable
   - GET /api/internships/[id]: findFirst con filtro de isActive (no findUnique
     que distinguiría entre "no existe" vs "existe pero borrado")

5. Try/catch + Sentry.captureException en TODOS los handlers (gap identificado
   en el audit — antes algunos solo console.error o nada). Patrón:
   try {
     // lógica
   } catch (error) {
     Sentry.captureException(error, { tags: { route: "..." } });
     return NextResponse.json(
       { error: "Error interno" },
       { status: 500 }
     );
   }

6. Path traversal en uploads:
   - Para /api/matching/upload-cv y similares: usar sanitizeFilename(name) que
     elimina ../, /, \, NULL bytes, y characters no-ASCII problemáticos.
     Finding #J2 del audit — primer caso CWE-22 detectado.

7. Login attempts a Sentry con privacy:
   - En cada path de fallo del callback authorize: Sentry.captureMessage level
     warning con tag auth: "login_failed" + reason ∈ {missing_credentials,
     rate_limited, user_not_found_or_not_company, invalid_password}
   - Email hasheado con sha256 truncado a 8 chars — NUNCA plaintext

Reportar los endpoints que faltan al patrón con su finding (🛑 fix requerido,
⚠️ observación, ✅ OK). Documentar decisiones conscientes (⚠️ aceptados) con
la justificación.
```

---

## Paso 3: Middleware Global con CSP, Nonces y Correlation ID

**Prompt para la IA:**

```
Crea o actualiza el middleware de Next.js 16 para PractiX.

ARCHIVO: src/proxy.ts (con función `proxy()`, NO src/middleware.ts).
Next.js 16 renombró la convención. Si tu IA insiste con middleware.ts está
usando training data viejo. Validación: curl -I http://localhost:3000/ debe
mostrar el header x-request-id.

El middleware (proxy) debe:

1. Generar un x-request-id único (UUID) por request y propagarlo:
   - En el header de la response (para que el cliente lo vea)
   - En las propias request headers (para que los handlers/services lo lean)
   - Útil para tracing en Sentry y para correlacionar logs de pino

2. Generar un nonce aleatorio por request (crypto.randomUUID o similar):
   - Inyectar el nonce en un Content-Security-Policy header strict (sin
     'unsafe-eval' ni 'unsafe-inline' globales en script-src — solo el nonce):

       default-src 'self';
       script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://*.sentry.io;
       style-src 'self' 'unsafe-inline';
       font-src 'self' https://fonts.gstatic.com;
       img-src 'self' data: https://*.supabase.co https://lh3.googleusercontent.com;
       connect-src 'self' https://*.supabase.co https://*.ingest.sentry.io
                    https://router.huggingface.co https://api.brevo.com;
       frame-ancestors 'none';
       base-uri 'self';
       form-action 'self';
       object-src 'none';

   - En dev (process.env.NODE_ENV !== "production"): agregar 'unsafe-eval' al
     script-src. React 19 lo necesita para los callstacks de devtools. NO en prod.
   - Inyectar el nonce en los <script> de Next.js para que el navegador los acepte
     (Next.js lo soporta — ver doc oficial de "Nonce-based CSP")

   Spec completa: docs/specs/csp.spec.md (Fase 3 paso 3.3 del refactor-plan).

3. Protección de rutas (auth):
   - /dashboard/* protegido — sin sesión redirect a /login
   - /admin/* protegido — sin sesión redirect a /login, sin rol ADMIN redirect a /
   - Leer sesión con getToken de "next-auth/jwt" (getServerSession NO funciona
     en middleware)

4. Matcher: excluir _next/static, _next/image, favicon.ico, /api/health,
   /api/auth (NextAuth maneja su propia auth).

NOTA importante: la dual auth (proxy.ts + (dashboard)/layout.tsx con useSession)
es defensa en profundidad — el layout del dashboard también verifica la sesión
del lado del cliente. Esto es A PROPÓSITO, no redundancia mal hecha.
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
✅ Auth dual: Google OAuth (estudiantes) + credentials con bcrypt (empresas)
✅ NextAuth maneja tokens de sesión seguros
✅ JWT corto + Refresh Token Rotation (Fase 3 P0):
   - access token: 15 minutos
   - refresh token: 30 días, ROTATIVO (uso 1 sola vez), guardado hasheado en DB
   - Reuse detection: si llega un refresh token ya consumido → revocar
     toda la familia de tokens del usuario + emitir Sentry.captureMessage
     level error con tags.auth: "refresh_reuse" → dispara alerta crítica
✅ Login attempts logueados a Sentry (con email hasheado, NUNCA plaintext)
   con tags.auth: "login_failed" para alerta de brute-force
✅ NEXTAUTH_SECRET validado por Zod a 32+ chars en src/lib/env.ts

ADR de referencia: 002 — "Autenticación con NextAuth + JWT rotativo"
```

### A09 — Logging and Monitoring Failures

```
✅ Sentry captura errores en producción (módulo 12) + releases ligados al commit
✅ Logger estructurado pino + correlation x-request-id (Fase 6.1 del refactor)
✅ Health check endpoint con Sentry.captureMessage tags.health: "db_down"
   (sin esa línea, la alerta NUNCA se dispara — finding #L1 del audit)
✅ 3 alertas críticas configuradas en Sentry:
   - DB down (tags.health: "db_down")
   - Refresh token reuse (tags.auth: "refresh_reuse") — posible robo de token
   - Login burst (tags.auth: "login_failed") — anti brute-force
✅ 3 runbooks operacionales en docs/runbooks/ para responder a incidentes:
   - incident-auth-down.md
   - incident-db-slow.md
   - incident-huggingface-down.md
🔲 2 alertas diferidas (error rate >1%, P95 >200ms) — requieren ~1 semana
   de tráfico real Y/O salir del free tier. Doc: docs/sentry-alerts.md.
```

---

## Paso 5: Configurar Dependabot con Groups

```
En el repositorio de GitHub:

1. Settings → Security → Dependabot alerts → Enable
2. Settings → Security → Dependabot security updates → Enable

3. Crear .github/dependabot.yml con GROUPS (CRÍTICO):

version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

    # Packages que DEBEN bumpearse con la misma versión exacta. Sin esto,
    # Dependabot abre 1 PR por package y el de react@x.y.z+1 falla en tests
    # con "Incompatible React versions" hasta que llegue el de react-dom.
    # Aprendido a las malas: en una semana cualquiera Dependabot abre
    # ~5-10 PRs y los rojos bloquean los verdes hasta que rebaseás.
    groups:
      react:
        patterns:
          - "react"
          - "react-dom"
          - "@types/react"
          - "@types/react-dom"
      sentry:
        patterns:
          - "@sentry/*"
      prisma:
        patterns:
          - "@prisma/*"
          - "prisma"
      testing:
        patterns:
          - "vitest"
          - "@vitest/*"
          - "@testing-library/*"
          - "@playwright/*"

    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
        # Major versions requieren revisión manual (breaking changes)

GOTCHA REAL: GitHub NO expone los repo secrets a los runs de Dependabot PRs.
Si el workflow CI usa ${{ secrets.* }} para env vars del build, los PRs de
Dependabot fallan al buildear. Solución (ya en módulo 12 paso 8): usar
placeholders dummy literales en lugar de secrets. Los placeholders solo
satisfacen la validación Zod de src/lib/env.ts.
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

Al final del módulo tenés:

- ✅ **Rate limiting distribuido** con Upstash Redis (Map en memoria NO funciona en Vercel multi-instancia) en endpoints costosos y de auth
- ✅ **Refresh token rotation** con JWT 15 min + reuse detection que dispara alerta crítica en Sentry
- ✅ **CSP con nonces dinámicos** por request en `src/proxy.ts` (NO unsafe-eval/unsafe-inline en script-src de prod)
- ✅ **Audit completo de `/api/*`** siguiendo OWASP Top 10 — anti-enumeration en flows sensibles, ownership checks antes de state checks, 404 unificado para no leakear
- ✅ **Try/catch + Sentry.captureException** en TODOS los handlers
- ✅ **Login attempts a Sentry** con email hasheado (sha256 truncado) — privacy by default
- ✅ **Path traversal sanitizado** en uploads (sanitizeFilename, CWE-22)
- ✅ **Health check con `tags.health: "db_down"`** que dispara alerta cuando la DB falla
- ✅ **Middleware (`proxy.ts`)** con `x-request-id` correlation + CSP + protección de rutas por rol
- ✅ **Logger estructurado pino** con bindings de contexto (route, requestId, userId)
- ✅ **3 alertas Sentry** configuradas (DB down, refresh reuse, login burst) + 3 runbooks operacionales
- ✅ **Sentry releases ligados al commit** (`practix@<sha>`) + sourcemaps subidos en cada deploy
- ✅ **Dependabot con groups** (react, sentry, prisma, testing) — sin esto los PRs fallan
- ✅ **`pnpm audit --audit-level=moderate`** en CI (subido desde `high` en Fase 3 paso 3.4) — 9 vulns activas resueltas con `pnpm.overrides`
- ✅ **Suite de tests verde**: 1097 unit/component + 53 E2E
- ✅ **6 ADRs** documentando decisiones (auth, rate-limit, testing, observability, etc.) en `docs/adr/`
- ✅ **`docs/security-audit-api.md`** con el audit detallado por área (12 áreas, 31 findings 🛑 cerrados, 14 ⚠️ documentados)

> Para ver el detalle de cómo se llegó a este estado, leer
> `context/refactor-plan.md` (Fase 3) — el módulo 14 original era más
> liviano; la Fase 3 del refactor profundizó la seguridad mucho más.
