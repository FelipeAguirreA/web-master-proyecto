# ADR 007 — RLS en todas las tablas `public` + Realtime auth con JWT HS256

- **Status**: Aceptado (implementado en branch `feat/redesign-claude-design`, pendiente merge a master en bump 1.13.0)
- **Fecha**: 2026-05-18
- **Decisores**: equipo core

## Contexto

Hasta 1.12.x el cliente browser usaba **Supabase Realtime** para recibir pushes de `messages` (chat en vivo) y `notifications` (campana del topbar). El canal de Realtime se autenticaba con la **anon key pública** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), lo que tenía dos problemas serios:

1. **Sin RLS, la anon key da acceso de lectura masiva**: cualquiera con la anon key (que es pública por diseño) podía hacer `supabase.from("users").select("*")` y obtener cualquier tabla del schema `public`. Esto es un escape de la promesa de Clean Architecture donde la única vía al backend debía ser `/api/*` con `requireAuth`. La anon key es necesaria para que Realtime abra el WebSocket, no se puede ocultar.
2. **El push de Realtime entregaba a TODOS los suscriptores**: no había filtrado server-side. El filtro `event/schema/table/filter` del SDK es client-side — un browser malicioso podía suscribirse a `messages` sin `filter` y recibir conversaciones de otros usuarios.

Restricciones:

- **Free tier de Supabase**: no hay Third-Party Auth Provider con Generic OIDC en el dashboard. Los 5 providers pre-built (Clerk/Firebase/Auth0/Cognito/WorkOS) tienen URLs hardcodeadas — ninguno aplica a nuestro NextAuth custom.
- **Identificación de usuario**: nuestros `userId` son **CUIDs** (string), generados por Prisma. Supabase Auth nativo usa **UUIDs** y expone `auth.uid()` en SQL — incompatible con nuestros IDs.
- **Latencia de chat y campana es UX crítica**: no podemos cambiar push por polling agresivo sin degradar la experiencia.

Alternativas iniciales evaluadas:

- **A. RS256 + JWKS + Third-Party Auth Provider** (plan original): firmar JWT RS256, exponer JWKS público, configurar Generic OIDC en Supabase. Bloqueado por free tier.
- **B. Migrar IDs a UUIDs y usar Supabase Auth nativo**: refactor masivo de schema + invalidación de todos los CUIDs existentes en prod. Costo altísimo, NO factible.
- **C. Quitar Realtime y volver a polling agresivo (3-5s)**: tira por la borda toda la UX en tiempo real y satura el free tier de la DB.
- **D. Mantener anon key + RLS sin policies, perdiendo Realtime**: cierra el agujero pero rompe el producto.

## Decisión

**Activar RLS en las 14 tablas del schema `public` + firmar JWT HS256 custom con `SUPABASE_JWT_SECRET` (legacy) + leer `auth.jwt() ->> 'sub'` en las policies.**

### Componentes

#### 1. RLS enable en las 14 tablas

`ENABLE ROW LEVEL SECURITY` en TODAS las tablas del schema `public`:

```
users, student_profiles, company_profiles, internships, applications,
saved_internships, conversations, messages, interviews, notifications,
password_reset_tokens, refresh_tokens, audit_logs, ats_config
```

**Modelo de policies**:

- **11 tablas backend-only sin policies**: el comportamiento por defecto de RLS es **deny-all**. Esas 11 tablas se acceden únicamente vía Prisma con el `SUPABASE_SERVICE_KEY` (service role), que **bypasea RLS automáticamente** — los services siguen operando sin un solo cambio. Para el cliente browser con anon key, todo SELECT queda bloqueado. Defense in depth real: aunque alguien filtre la anon key, no puede leer nada.
- **3 tablas con SELECT policies** (las que el cliente browser SÍ necesita leer via Realtime):
  - `conversations`: `auth.jwt() ->> 'sub' IN (companyId, studentId)`
  - `messages`: `EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversationId AND auth.jwt() ->> 'sub' IN (c.companyId, c.studentId))`
  - `notifications`: `auth.jwt() ->> 'sub' = userId`

Las tres son SELECT-only (Realtime solo necesita leer para pushear). Mutaciones siguen siendo backend-only via service role.

#### 2. Endpoint de firma JWT HS256

Nuevo endpoint `POST /api/auth/supabase-token` (`src/app/api/auth/supabase-token/route.ts`), protegido por `requireAuth()` de NextAuth. Firma con `jose@^6.2.3` (lightweight, sin deps nativas).

Claims:

- `sub: <userId>` — CUID del usuario. Las policies leen `auth.jwt() ->> 'sub'`, NO `auth.uid()` (que devuelve UUID y nuestros IDs son CUID).
- `role: "authenticated"` — claim requerido por Supabase Realtime para procesar el JWT como user autenticado (en vez de anon).
- `aud: "authenticated"` — audience requerida por Supabase Auth helpers.
- `exp: now + 4h` — TTL razonable. El cliente refetchea al mount.

Algoritmo: **HS256** firmado con `SUPABASE_JWT_SECRET` (Legacy JWT Secret, expuesto en Supabase Dashboard → Settings → API → JWT Keys → tab "Legacy JWT Secret" → Reveal). El legacy secret sigue funcionando como verificador en proyectos migrados al nuevo sistema de keys de Supabase.

#### 3. Helper cliente `authenticateRealtime()`

`src/lib/client/supabase-auth.ts`:

```ts
export async function authenticateRealtime(): Promise<boolean> {
  const res = await fetchWithRefresh("/api/auth/supabase-token", {
    method: "POST",
  });
  if (!res.ok) return false;
  const { token } = await res.json();
  if (!token) return false;
  supabaseRealtime.realtime.setAuth(token);
  return true;
}
```

**Reglas de uso**: llamar SIEMPRE antes de `.subscribe()` en cualquier canal sobre tablas con RLS (`messages`, `notifications`). Sin esto, el JWT del WebSocket es el anon implícito → RLS rechaza → pushes nunca llegan.

Los hooks `useNotifications` y los componentes `ConversationView` ya tienen el call en el mount del effect.

### Pipeline end-to-end

```
1. User loguea via NextAuth → cookie de sesión.
2. Cliente abre /dashboard → useNotifications mount.
3. authenticateRealtime() → POST /api/auth/supabase-token (NextAuth valida cookie).
4. Backend firma JWT HS256 con SUPABASE_JWT_SECRET, claims sub/role/aud/exp.
5. Cliente recibe token, llama supabaseRealtime.realtime.setAuth(token).
6. Cliente .subscribe() al canal de notifications.
7. Cualquier INSERT en notifications → Supabase verifica el JWT del WebSocket
   + ejecuta policy "notifications_select_owner" con auth.jwt() ->> 'sub'.
8. Si sub == notifications.userId → push entregado.
   Si no → push descartado server-side. Browser no se entera.
```

## Consecuencias

### Positivas

- **Anon key 100% inútil para SELECTs**: incluso si se filtra, no expone datos. La promesa de "única vía al backend es `/api/*` con `requireAuth`" se cumple incluso a nivel DB.
- **Push filtrado server-side**: un browser malicioso suscripto a `messages` sin filter solo recibirá pushes de SUS conversaciones — Postgres descarta los demás antes de llegar al wire.
- **Cero cambios en services**: Prisma con service role bypasea RLS. Tests unitarios, integración y E2E siguen pasando sin modificación.
- **Compatible con free tier**: no requiere Pro tier ni feature de paga.
- **Auditabilidad**: las policies están en SQL puro versionable. Cualquier dev puede leer `messages_select_participant` y entender la regla.

### Negativas / riesgos

- **HS256 vs RS256**: HS256 usa secret simétrico — quien tenga `SUPABASE_JWT_SECRET` puede firmar JWTs válidos. En un setup multi-tenant o multi-service esto no escalaría. Para PractiX (monolito Next.js) el secret solo vive en Vercel env vars + .env.local del dev, así que el riesgo es bajo. RS256 + JWKS quedaría como evolución natural al pasar a Pro.
- **JWT TTL de 4h**: si el componente queda montado >4h sin re-mount (caso raro en una SPA dashboard con navegación), el WebSocket se desconecta al expirar. El SDK intenta reconnect, pero requiere que el helper de re-auth esté cableado (TODO opcional — el caso es raro).
- **`auth.jwt() ->> 'sub'` cuesta más que `auth.uid()`**: el cast string vs uuid agrega ~microsegundos por evaluación de policy. No medible bajo carga normal.
- **Bypass por service key sigue siendo total**: si alguien filtra `SUPABASE_SERVICE_KEY`, RLS no protege. Eso siempre fue así, no es nuevo.
- **Acoplamiento al Legacy JWT Secret**: Supabase puede deprecar este secret en el futuro al consolidar el nuevo sistema de keys. Plan de migración a RS256 + JWKS queda como deuda técnica documentada.

## Alternativas consideradas

- **RS256 + JWKS + Third-Party Auth Provider**: la opción "correcta" en teoría, bloqueada por free tier (Generic OIDC no expuesto en dashboard). Plan: reevaluar al pasar a Pro tier o cuando Supabase abra Generic OIDC.
- **Migrar IDs a UUIDs y usar Supabase Auth nativo**: descartado — refactor masivo de schema + invalidación de CUIDs en prod + reescritura de toda la auth.
- **Quitar Realtime y volver a polling**: descartado — tira por la borda la UX en vivo del chat.
- **RLS sin Realtime auth (anon)**: descartado — rompe el producto (push deja de llegar a nadie).
- **Sustituir Supabase Realtime por Pusher/Ably**: posible pero introduce dependencia externa con su propio costo + complejidad de infra. Reevaluar si Supabase Realtime se queda corto en escala.

## Notas de implementación

### Migrations aplicadas

1. **Local** (`prisma/migrations/20260518194721_add_internship_deleted_at`): no es de este ADR pero compartió la sesión.
2. **Remotas vía MCP Supabase** (no van por Prisma — son política del provider):
   - Op 1: `ENABLE ROW LEVEL SECURITY` en las 14 tablas.
   - Op 2: 3 SELECT policies sobre `conversations`, `messages`, `notifications`.

Decisión deliberada: **RLS y policies NO van en migrations de Prisma**. Son infraestructura del provider, no schema de la app. Mantenerlas fuera evita acoplar versionado Prisma a un detalle de Supabase.

### Archivos clave

- `src/app/api/auth/supabase-token/route.ts` — endpoint de firma JWT
- `src/lib/client/supabase-auth.ts` — helper `authenticateRealtime()`
- `src/hooks/useNotifications.ts` — usa el helper antes de subscribe
- `src/components/chat/ConversationView.tsx` — usa el helper antes de subscribe
- `src/lib/env.ts` — Zod schema valida `SUPABASE_JWT_SECRET` (min 32 chars)
- `CHAT_MODULE.md` Paso 5 — SQL de RLS + policies (idempotente, para setup desde cero)

### StrictMode gotcha

Los canales de Realtime con nombre estable explotan en dev por el doble mount de StrictMode. Solución implementada: sufijo único por mount + `unsubscribe()` en cleanup del `useEffect`.

### Plan de migración a RS256 (futuro)

Cuando upgradeés a Pro o Supabase abra Generic OIDC:

1. Generar keypair RSA en backend (`KEYS_RS256_PRIVATE_PEM` + `KEYS_RS256_PUBLIC_PEM`).
2. Cambiar `SignJWT(...).setProtectedHeader({ alg: "RS256" }).sign(privateKey)` en `/api/auth/supabase-token`.
3. Exponer JWKS público en `/.well-known/jwks.json`.
4. Configurar Supabase Third-Party Auth Provider apuntando al JWKS.
5. Borrar `SUPABASE_JWT_SECRET` del env y rotar.

Las policies SQL no cambian — `auth.jwt() ->> 'sub'` sigue funcionando idéntico.
