# Módulo 12: Notificaciones + Deploy + Observabilidad

## Resultado Final

Emails transaccionales con Brevo + Sentry para monitoreo de errores + Dockerfile multi-stage + GitHub Actions CI/CD + security headers + deploy en Vercel.

---

## Paso 1: Configurar Brevo

```
1. Ir a https://www.brevo.com → Crear cuenta gratuita (300 emails/día)
2. Settings → SMTP & API → API Keys → Generate
3. Copiar API Key
4. Agregar a .env.local:
   BREVO_API_KEY=xkeysib-xxxxxxxxxx
   BREVO_SENDER_EMAIL=noreply@practix.com
   (verificar el email del sender en Brevo)
```

---

## Paso 2: Servicio de Email

**Prompt para la IA:**

```
Crea un servicio de email usando la API HTTP de Brevo.

Ubicación: src/server/lib/mail.ts

NO usar SDK de Brevo, usar fetch directo.
Endpoint: https://api.brevo.com/v3/smtp/email
Header: api-key con BREVO_API_KEY

Función base sendEmail(to: { email: string, name: string }, subject: string, htmlContent: string):
- Si no hay BREVO_API_KEY → console.warn y return (no lanzar error)
- POST a la API con body:
  { sender: { email: BREVO_SENDER_EMAIL, name: "PractiX" },
    to: [{ email, name }], subject, htmlContent }
- Log resultado
- No lanzar error si falla (emails no son críticos para el MVP)

Funciones de template:

1. sendNewApplicationEmail(companyEmail, companyName, studentName, internshipTitle):
   - Subject: "Nueva postulación: {internshipTitle}"
   - HTML simple con estilos inline:
     - Saludo: "Hola {companyName}"
     - "{studentName} se ha postulado a tu práctica: {internshipTitle}"
     - Botón/link: "Ver postulantes" (link al dashboard)
     - Footer: "— Equipo PractiX"

2. sendStatusUpdateEmail(studentEmail, studentName, internshipTitle, status):
   - Subject: "Actualización: {internshipTitle}"
   - HTML: notificar nuevo estado de la postulación
   - Mapear status a texto amigable:
     REVIEWED → "Tu postulación está siendo revisada"
     ACCEPTED → "¡Felicitaciones! Tu postulación fue aceptada"
     REJECTED → "Tu postulación no fue seleccionada esta vez"

3. sendRecommendationEmail(studentEmail, studentName, internshipTitle, matchScore):
   - Subject: "Práctica con {matchScore}% de afinidad para ti"
   - HTML: recomendar la práctica

Los HTML deben ser simples, con estilos inline, sin frameworks de email.
Exportar todas las funciones.
```

---

## Paso 3: Integrar Emails en Services

**Prompt para la IA:**

```
Integra el envío de emails en los services existentes.

1. En applications.service.ts → función applyToInternship:
   - Después de crear la application exitosamente
   - Buscar el email de la empresa (internship → company → user)
   - Llamar sendNewApplicationEmail (fire-and-forget, sin await)
   - .catch(err => Sentry.captureException(err, { tags: { mail: "new_application" } }))
     (post Fase 3 paso 3.7: los fallos de mail van a Sentry, NO console.error.
     Esto fue uno de los patrones convergentes del audit /api/* — finding #B3.)

2. En applications.service.ts → función updateApplicationStatus:
   - Después de actualizar el status
   - Buscar el email del estudiante (application → student)
   - Llamar sendStatusUpdateEmail (fire-and-forget)
   - .catch(err => Sentry.captureException(err, { tags: { mail: "status_update" } }))

IMPORTANTE:
- No usar await → no bloquear el response esperando al email
- No lanzar error si falla → los emails son best-effort
- Sentry.captureException permite que el equipo se entere del fallo sin
  romper la experiencia del usuario. console.error en Vercel se pierde
  rápido y NO es accionable.

Importar las funciones de '@/server/lib/mail' y Sentry de '@sentry/nextjs'.
```

---

## Paso 4: Sentry — Monitoreo de Errores

**Prompt para la IA:**

```
Configura Sentry para monitoreo de errores en PractiX (Next.js 16).

1. Crear cuenta en https://sentry.io (free tier — 5k errores/mes, 10k spans
   transactions/mes para Performance Monitoring)
   - New Project → Next.js → copiar DSN

2. Correr el wizard oficial:
   npx @sentry/wizard@latest -i nextjs

   Esto crea automáticamente:
   - sentry.client.config.ts
   - sentry.server.config.ts
   - sentry.edge.config.ts
   - instrumentation.ts + instrumentation-client.ts
   - envuelve next.config.ts con withSentryConfig()
   - genera UN Org Auth Token y lo agrega como SENTRY_AUTH_TOKEN en GitHub Actions

3. GOTCHA REAL — el wizard NO configura SENTRY_AUTH_TOKEN en Vercel.
   Esto es la causa más común de tener stack traces minificados en producción.
   Hay que hacerlo a mano:

   a. Crear un Organization Auth Token en Sentry (NO Personal Token):
      URL: https://<tu-org>.sentry.io/settings/auth-tokens/
      → Create New Token
      → Name: "vercel-and-github-sourcemap-upload"
      → Scope: org:ci (cubre Source Map Upload + Release Creation + Code Mappings)
      → Copiar el token (solo se ve UNA vez)

   b. Agregar en Vercel:
      Project Settings → Environment Variables → Add New
      Key: SENTRY_AUTH_TOKEN
      Value: <token>
      Environments: marcar Production + Preview + Development

   c. Verificar que GitHub Actions también lo tiene (el wizard lo creó):
      Repo Settings → Secrets and variables → Actions → SENTRY_AUTH_TOKEN

   d. Si el wizard generó un Personal Token tuyo, revocarlo y dejar solo
      el Org Auth Token. Los Personal Tokens se rompen cuando cambiás de cuenta.

4. Verificar sentry.client.config.ts:
   - dsn: NEXT_PUBLIC_SENTRY_DSN
   - tracesSampleRate: 0.1 (10% — buen default para empezar; bajar a 0.05 si
     se llena la cuota del free tier de spans)
   - replaysOnErrorSampleRate: 1.0
   - integrations: [Sentry.replayIntegration()]

5. Verificar sentry.server.config.ts y sentry.edge.config.ts:
   - dsn: NEXT_PUBLIC_SENTRY_DSN
   - tracesSampleRate: 0.1
   - sendDefaultPii: true

6. En next.config.ts (envuelto con withSentryConfig), agregar release ligado
   al commit exacto. En las opciones del segundo argumento:

   release: {
     name: process.env.VERCEL_GIT_COMMIT_SHA
       ? `practix@${process.env.VERCEL_GIT_COMMIT_SHA}`
       : undefined,
   }

   Vercel expone VERCEL_GIT_COMMIT_SHA automáticamente en build. Con esto:
   - Cada issue en Sentry queda etiquetado con el commit exacto
   - Los sourcemaps subidos quedan asociados a esa release
   - Desde un issue podés ver el commit que lo causó (link a GitHub si está
     configurado el repo en Sentry → Code Mappings)

7. .env.local:
   NEXT_PUBLIC_SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxx
   # SENTRY_AUTH_TOKEN va SOLO en Vercel + GitHub Actions, NO en .env.local
   # (no se necesita en build local)

8. Configurar 3 alertas críticas en el dashboard de Sentry (Issue Alerts,
   no Metric Alerts — las Metric Alerts requieren tier paga):

   - "🛑 Base de datos caída": Issue Alert con filtro `tags.health: "db_down"`.
     Disparada desde /api/health cuando el ping a Postgres falla. Email inmediato.
   - "🛑 Reuse de refresh token": Issue Alert con filtro `tags.auth: "refresh_reuse"`.
     Alta severidad — posible robo de token. Email inmediato.
   - "⚠️ Login burst (brute-force)": >10 fallos en 5 min con `tags.auth: "login_failed"`.

   Para más detalle de las 6 alertas (3 cerradas + 2 diferidas + 1 descartada),
   ver docs/sentry-alerts.md.

9. Probar que funciona — agregar temporalmente en una página:
   throw new Error("Test Sentry - eliminar después")
   Verificar que aparece en el dashboard con la release `practix@<sha>`.
```

---

## Paso 5: Health Check Endpoint

**Prompt para la IA:**

```
Crea un endpoint de health check para PractiX.

Ubicación: src/app/api/health/route.ts

Debe:
- Responder GET /api/health
- Verificar conexión a la base de datos con una query simple (SELECT 1)
- Retornar JSON:
  {
    "status": "ok" | "degraded",
    "timestamp": ISO string,
    "services": {
      "database": "ok" | "error",
      "version": string (desde package.json)
    }
  }
- Status HTTP 200 si todo ok, 503 si la DB falla
- NO requiere autenticación (lo usan monitoreos externos)
- Manejar el error de DB con try/catch — nunca lanzar el error original al cliente

IMPORTANTE: si la DB falla, ADEMÁS de devolver 503, llamar a:
  Sentry.captureMessage("Database health check failed", {
    level: "error",
    tags: { health: "db_down" },
  })

Esto es lo que dispara la alerta "🛑 Base de datos caída" del Paso 4. Sin
esta línea, el endpoint funciona pero la alerta NUNCA se dispara — porque
el filtro de la alerta es `tags.health: "db_down"`. Es un gap fácil de pasar
por alto: el endpoint devuelve 503 correctamente y parece "todo bien", pero
nadie se entera del incidente. Este finding salió en el audit /api/health
del paso 3.7 de la Fase 3 (referencia: #L1).
```

---

## Paso 6: Security Headers

**Prompt para la IA:**

```
Configura security headers de producción en PractiX.

Hay DOS lugares donde van headers, por una razón importante: el CSP necesita
nonces dinámicos por request (no se puede generar en build), entonces vive
en el middleware. El resto vive en next.config.ts.

A. Headers estáticos en next.config.ts — sección "headers" que aplique a
   todas las rutas ("/(.*)") con:

   - X-DNS-Prefetch-Control: on
   - Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
   - X-Frame-Options: SAMEORIGIN
   - X-Content-Type-Options: nosniff
   - Referrer-Policy: origin-when-cross-origin
   - Permissions-Policy: camera=(), microphone=(), geolocation=()
   - X-Permitted-Cross-Domain-Policies: none
   - Cross-Origin-Opener-Policy: same-origin

   Mantener la configuración existente de images.remotePatterns
   (lh3.googleusercontent.com + *.supabase.co).

B. Content-Security-Policy en src/proxy.ts (middleware de Next.js 16) — NO
   en next.config.ts. El middleware genera un nonce aleatorio por request
   y lo inyecta en el CSP y en los <script> de Next.js.

   En producción, el script-src queda strict (sin 'unsafe-eval' ni
   'unsafe-inline' globales — solo el nonce):

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

   En dev, agregar 'unsafe-eval' al script-src — React 19 lo necesita para
   los callstacks de devtools. Detectar por NODE_ENV o similar.

   El style-src mantiene 'unsafe-inline' a propósito: Tailwind, Radix y
   next-font lo necesitan y el ataque vector es bajo (no ejecuta código).

   Spec completa de CSP: docs/specs/csp.spec.md (Fase 3 paso 3.3 del
   refactor-plan, bump 1.10.0).

   NOTA: en Next.js 16 el archivo de middleware se llama src/proxy.ts con
   función `proxy()`, NO `middleware.ts` con `middleware()`. Si tu IA
   insiste con middleware.ts está usando training data viejo.
```

---

## Paso 7: Dockerfile Multi-Stage para Producción

**Prompt para la IA:**

```
Crea un Dockerfile multi-stage optimizado para producción de PractiX (Next.js 16).

Etapas:
1. "deps" → node:20-alpine: instalar solo dependencias de producción con pnpm
2. "builder" → node:20-alpine: copiar deps, copiar código, RUN pnpm build
   - Incluir las variables de entorno necesarias para el build como ARG/ENV
3. "runner" → node:20-alpine (imagen final liviana):
   - Copiar solo lo necesario desde "builder": .next/standalone, .next/static, public
   - USER nextjs (nunca correr como root)
   - EXPOSE 3000
   - ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
   - CMD ["node", "server.js"]

Requisitos adicionales:
- Agregar en next.config.js: output: 'standalone' (necesario para el Dockerfile)
- El .dockerignore ya existe del módulo 1
- La imagen final debe pesar menos de 300MB

NOTA: Este Dockerfile es para cuando se quiera migrar de Vercel a un VPS.
En producción actual usamos Vercel directamente.
```

---

## Paso 8: GitHub Actions — CI/CD

**Prompt para la IA:**

```
Crea el pipeline de CI/CD con GitHub Actions para PractiX.

Archivo: .github/workflows/ci.yml

Trigger: en push a main y en pull_request a main

Jobs:

1. "ci" (lint + type-check + test + build):
   - runs-on: ubuntu-latest
   - strategy.matrix: node-version: [20]
   - Steps:
     a. Checkout
     b. Setup pnpm (corepack)
     c. Setup Node con cache de pnpm
     d. pnpm install --frozen-lockfile
     e. pnpm lint
     f. pnpm exec tsc --noEmit  (type check)
     g. pnpm test (vitest run)
     h. pnpm build
       - GOTCHA REAL: NO usar ${{ secrets.* }} para las env vars del build.
         GitHub no expone los secrets a los runs de Pull Request de Dependabot
         por security policy — si usás secrets, los PRs de Dependabot fallan
         al buildear y todos los bumps quedan rojos.
       - En su lugar, definir env vars con placeholders dummy literales que
         solo satisfagan la validación Zod de src/lib/env.ts:
           DATABASE_URL: postgresql://placeholder:placeholder@localhost:5432/placeholder
           NEXTAUTH_SECRET: placeholder-secret-min-32-chars-for-zod-validation
           NEXTAUTH_URL: http://localhost:3000
           NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
           NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
           SUPABASE_SERVICE_KEY: placeholder-service-key
           GOOGLE_CLIENT_ID: placeholder-google-client-id
           GOOGLE_CLIENT_SECRET: placeholder-google-client-secret
       - Razón profunda: src/lib/env.ts hace safeParse() de process.env a
         module-load time, lo que se ejecuta durante "Collecting page data"
         del next build. Si una env requerida falta, el build falla con un
         mensaje genérico sin pista. Los placeholders solo satisfacen Zod —
         los valores reales viven SOLO en Vercel project settings, el build
         de CI nunca conecta a infra real.

2. "security" (audit de dependencias):
   - runs-on: ubuntu-latest
   - Needs: ci (corre después del CI)
   - Steps:
     a. Checkout
     b. Setup pnpm
     c. pnpm install --frozen-lockfile
     d. pnpm audit --audit-level=moderate
        (falla si hay vulnerabilidades MODERATE, HIGH o CRITICAL — antes era
        --audit-level=high pero la Fase 3 paso 3.4 lo subió a moderate; las
        9 vulns activas se resolvieron con pnpm.overrides)

Configuración Dependabot — .github/dependabot.yml:
- package-ecosystem: "npm" weekly, open-pull-requests-limit: 5
- groups (CRÍTICO — sin esto los PRs fallan):
  - react: react, react-dom, @types/react, @types/react-dom
    (sin agrupar, Dependabot abre PRs separados y react@x sin react-dom
    igualado falla con "Incompatible React versions")
  - sentry: @sentry/*
  - prisma: @prisma/*, prisma
  - testing: vitest, @vitest/*, @testing-library/*, @playwright/*
- ignore: dependency-name "*", update-types ["version-update:semver-major"]
  (majors requieren revisión manual)
```

---

## Paso 9: Preparar para Producción

**Prompt para la IA:**

```
Revisa y prepara el proyecto PractiX para deploy en producción.

Checklist:

1. Verificar que NO hay URLs hardcoded a localhost en el código
   - Todas las API calls del frontend deben usar rutas relativas:
     fetch('/api/...') NO fetch('http://localhost:3000/api/...')

2. Verificar next.config.js:
   - images.remotePatterns: permitir lh3.googleusercontent.com (avatars Google)
     y *.supabase.co (archivos subidos)

3. Verificar que .gitignore incluye:
   - node_modules, .next, .env, .env.local, .env*.local

4. Crear .env.example actualizado con TODAS las variables necesarias
   (sin valores reales, solo placeholders y comentarios)

5. Verificar que pnpm build pasa sin errores

6. Revisar que no haya console.log innecesarios
   (mantener los warns/errors del servicio de email y embeddings)

Dame los archivos que necesitan cambios.
```

---

## Paso 10: Deploy en Vercel

```
1. Subir el código a GitHub:
   git init
   git add .
   git commit -m "PractiX MVP - full-stack Next.js"
   git remote add origin <tu-repo>
   git push -u origin main

2. Ir a https://vercel.com
   - Sign in con GitHub
   - "Add New Project" → Importar el repo

3. Framework: Next.js (auto-detectado)
   Root directory: ./ (raíz del proyecto)

4. Environment Variables (agregar TODAS — falta una y el build falla en
   "Collecting page data" por la validación Zod de src/lib/env.ts):

   Requeridas:
   DATABASE_URL=<connection-string Supabase pooler, puerto 6543>
   DIRECT_URL=<connection-string Supabase directo, puerto 5432, para Prisma CLI>
   NEXT_PUBLIC_SUPABASE_URL=<tu-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>     ← olvidada con frecuencia, rompe el build
   SUPABASE_SERVICE_KEY=<tu-service-key>
   NEXTAUTH_URL=https://<tu-app>.vercel.app
   NEXTAUTH_SECRET=<generar: openssl rand -base64 32>
   GOOGLE_CLIENT_ID=<tu-client-id>
   GOOGLE_CLIENT_SECRET=<tu-client-secret>

   Opcionales pero recomendadas en prod:
   HUGGINGFACE_API_KEY=<tu-hf-key>
   BREVO_API_KEY=<tu-brevo-key>
   BREVO_SENDER_EMAIL=<tu-email-verificado>
   NEXT_PUBLIC_SENTRY_DSN=<tu-dsn>
   SENTRY_AUTH_TOKEN=<tu-org-auth-token>           ← sin esto, sourcemaps NO se suben
   UPSTASH_REDIS_REST_URL=<url>
   UPSTASH_REDIS_REST_TOKEN=<token>

   Marcar TODAS las env vars en los 3 environments: Production + Preview + Development
   (Preview se usa para deploys de PRs y necesita las mismas vars que prod).

5. Click "Deploy" → esperar el build

6. IMPORTANTE post-deploy:
   - Copiar la URL de Vercel (ej: https://practix.vercel.app)
   - Ir a Google Cloud Console → OAuth Credentials
   - Agregar redirect URI: https://practix.vercel.app/api/auth/callback/google
   - Actualizar NEXTAUTH_URL en Vercel si es necesario
   - Redeploy desde Vercel dashboard
```

---

## Paso 11: Generar Prisma Client en Build

**Prompt para la IA:**

```
Vercel necesita generar el Prisma Client durante el build.

Actualiza package.json para que el script "build" incluya prisma generate:

"scripts": {
  "postinstall": "prisma generate",
  "build": "next build",
  ...
}

El script "postinstall" se ejecuta automáticamente después de pnpm install
en el build de Vercel, generando el Prisma Client antes del build de Next.js.
```

---

## Paso 12: Configurar Supabase Storage CORS (si necesario)

```
En Supabase Dashboard → Storage → Policies:
- Verificar que el bucket "documents" es público para lectura
- Las escrituras se hacen con el service_role key (server-side)
  así que no necesita CORS especial
```

---

## Paso 13: Seed en Producción

```bash
# Ejecutar seed contra la DB de producción
# (usar la misma DATABASE_URL de producción)
DATABASE_URL="<tu-connection-string-produccion>" pnpm db:seed
```

---

## Paso 14: Verificación Final en Producción

```
Checklist completo:

✅ Landing page: https://<tu-app>.vercel.app
✅ Login con Google funciona
✅ Redirect al dashboard correcto
✅ Listado de prácticas carga datos del seed
✅ Filtros y búsqueda funcionan
✅ Crear práctica (como empresa)
✅ Subir CV (como estudiante) → procesado correctamente
✅ Recomendaciones con matchScore aparecen
✅ Postularse a una práctica
✅ Empresa ve postulantes con scores
✅ Emails se envían (verificar en Brevo dashboard → Logs)
✅ Responsive en mobile
```

---

## Paso 15: CHANGELOG + Versión Inicial

**Prompt para la IA:**

```
Crea los archivos de versionado inicial para PractiX.

1. CHANGELOG.md en la raíz siguiendo https://keepachangelog.com/es/1.0.0/:
   # Changelog
   ## [1.0.0] - FECHA_HOY
   ### Added
   - Portal de prácticas laborales con matching inteligente
   - Autenticación con Google OAuth (NextAuth.js)
   - CRUD completo de prácticas con filtros y paginación
   - Sistema de postulaciones con estados (PENDING/REVIEWED/ACCEPTED/REJECTED)
   - Matching IA con embeddings HuggingFace + similitud de coseno
   - Dashboards diferenciados para estudiante y empresa
   - Notificaciones por email con Brevo
   - Monitoreo de errores con Sentry
   - Pipeline CI/CD con GitHub Actions

2. Actualizar package.json:
   "version": "1.0.0"
```

---

## Paso 16: README

**Prompt para la IA:**

```
Genera un README.md completo para el repo de PractiX.

Secciones:
1. Nombre "PractiX 🎯" + descripción de una línea
2. Breve explicación del matching IA (3-4 líneas)
3. Stack tecnológico (tabla: tecnología → servicio)
4. Cómo funciona (flujo: subir CV → embedding → matching → ranking)
5. Estructura del proyecto (árbol de carpetas simplificado)
6. Correr localmente:
   - Requisitos: Node 18+, pnpm, cuenta Supabase/HuggingFace/Google
   - Pasos: clone, install, configurar .env.local, db:push, db:seed, dev
7. Variables de entorno (tabla: variable → descripción → dónde obtenerla)
8. Deploy en Vercel (pasos resumidos)
9. API Endpoints (tabla: método, ruta, descripción, auth requerida)
10. Licencia MIT
```

---

## Checkpoint Final

Al final del módulo tienes:

- ✅ Emails transaccionales con Brevo
- ✅ Sentry configurado (monitoreo de errores en producción)
- ✅ Health check endpoint en /api/health
- ✅ Security headers en next.config.js
- ✅ Dockerfile multi-stage para producción
- ✅ GitHub Actions: lint + test + build + audit en cada PR
- ✅ Deploy en Vercel (un solo deploy)
- ✅ Base de datos en Supabase
- ✅ Storage en Supabase
- ✅ Google OAuth en producción
- ✅ CHANGELOG.md con v1.0.0
- ✅ README completo
- ✅ **PROYECTO EN PRODUCCIÓN** 🚀

---

## Resumen del Proyecto

```
📊 Métricas del MVP:
- 1 proyecto Next.js 16 full-stack
- 6+ services de lógica de negocio (users, internships, applications, matching,
  chat, interviews — más extensiones agregan ATS scorers, notifications)
- 40+ API routes agrupadas por área
- Núcleo + extensiones de páginas frontend (landing, listing, detalle, auth flow,
  dashboards estudiante/empresa, perfil unificado, inbox/chat, calendario, ATS,
  candidatos, admin de empresas)
- 11 modelos de datos con relaciones (5 core + 6 de extensiones)
- Matching IA con embeddings BAAI/bge-small-en-v1.5 + cosine similarity
- Auth con Google OAuth (estudiantes) + credentials con bcrypt (empresas)
- Refresh token rotation (JWT 15min)
- Rate limiting distribuido con Upstash Redis
- Emails transaccionales con Brevo
- Logger estructurado pino con correlation x-request-id
- Sentry con releases ligados a commit + sourcemaps + 3 alertas
- Chat realtime con Supabase Realtime
- 1 solo deploy en Vercel (gratis)

🏗️ Clean Architecture:
- app/api/*          → Capa de presentación (HTTP)
- server/services/*  → Capa de negocio (pura)
- server/lib/*       → Capa de infraestructura
- Si mañana necesitas Express → copias server/ y listo

💰 Costo total: $0
- Vercel free tier
- Supabase free tier
- HuggingFace free tier
- Brevo free tier (300 emails/día)
```

---

## ¡Felicitaciones! 🎉

Has construido un MVP completo con:

- ✅ Full-stack unificado (Next.js 16 + React 19)
- ✅ Clean Architecture (separación de capas)
- ✅ Base de datos relacional (Prisma + PostgreSQL)
- ✅ Autenticación OAuth (Google)
- ✅ Matching inteligente con IA (HuggingFace)
- ✅ Notificaciones por email (Brevo)
- ✅ Deploy en producción (Vercel, un solo deploy)
- ✅ Código preparado para escalar

**Todo construido paso a paso con asistencia de IA.** 🤖
