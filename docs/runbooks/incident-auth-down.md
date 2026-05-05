# Runbook — Auth caído

> **Severidad**: Crítica
> **Tiempo de respuesta esperado**: <15 min
> **Last reviewed**: 2026-05-05

## Síntomas

Una o más de estas señales:

- Users reportan "no puedo loguearme" / "el login me da error 500"
- Spike en Sentry con `tags.auth: failed_login` (reasons: `user_not_found_or_not_company`, `invalid_password`, `rate_limited`)
- Sentry recibe `Refresh token reuse detected` masivos (alguien comprometió tokens o el flow se rompió)
- `/api/auth/[...nextauth]` o `/api/auth/refresh` con response time >2s o 500
- Health check `/api/health` retorna 503 con `services.database: error`
- En logs server (Vercel/Datadog) aparece `module: auth` con level `error` consecutivos

## Diagnóstico — dónde mirar primero (en orden)

1. **`/api/health`** — confirma si la DB está OK. Si retorna 503, **es problema de DB, no de auth** → seguir `incident-db-slow.md`.
2. **Sentry** filtros:
   - `tag:auth` últimos 15 min → ver concentración de errores
   - `release:practix@<version>` → ver si solo afecta el último deploy (rollback candidate)
3. **Logs server estructurados** (pino), buscar:
   - `module=auth level=error` → errores del flow
   - `module=auth event=events.signIn` → fallos al emitir refresh token
4. **Provider externo**:
   - [Google Workspace status](https://www.google.com/appsstatus/dashboard/) → OAuth caído
   - [Supabase status](https://status.supabase.com/) → DB de NextAuth caída
   - [Upstash Redis status](https://status.upstash.com/) → rate limiter caído (fallback in-memory funciona, pero pierde estado entre instancias)
5. **Variables de entorno en Vercel**:
   - `NEXTAUTH_SECRET` — si fue rotado mal, todas las sesiones existentes invalidan
   - `NEXTAUTH_URL` — debe matchear el dominio del deploy exacto
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — pueden haber sido revocados en Google Console

## Acción inmediata (top-down)

### Caso A — Spike de `failed_login: invalid_password` o `user_not_found`

Posible **brute force**. Verificar IP en Sentry breadcrumbs:

- Si una IP concentra >20 intentos/min → **block en Vercel WAF / Cloudflare**.
- Rate limit ya está activo (`5 intentos / 5 min` por IP+email combo) — confirmar en logs `module=auth level=warn message="login rate limit hit"`.
- Si el rate limit NO está conteniendo → Upstash caído, fallback in-memory no comparte estado entre lambdas. **Restaurar Upstash o aceptar mitigación parcial**.

### Caso B — `Refresh token reuse detected` masivo

**SEÑAL DE COMPROMISO** o bug en el client. Acción:

- Si es **un user puntual**: revocar todos sus refresh tokens manualmente:
  ```sql
  UPDATE refresh_tokens SET revokedAt = NOW() WHERE userId = '<user_id>' AND revokedAt IS NULL;
  ```
  Forzar re-login.
- Si es **masivo** (varios users): **rollback del último deploy** — probable bug en el client que duplica requests al refresh endpoint.

### Caso C — Provider externo caído (Google, Supabase, Upstash)

- **Google OAuth caído** → degradación parcial. Login con credentials (empresas) sigue funcionando. Comunicar en Twitter/email a estudiantes.
- **Supabase DB caída** → seguir `incident-db-slow.md`. Auth NO puede funcionar sin DB.
- **Upstash Redis caído** → rate limit cae a in-memory (`server/lib/rate-limit.ts:60`). Funciona pero NO previene brute force entre lambdas. **Aceptable por minutos, no horas**.

### Caso D — Variables de entorno mal configuradas

- En Vercel dashboard → Project → Settings → Environment Variables.
- Si rotaste `NEXTAUTH_SECRET` recientemente: **todas las sesiones existentes invalidan**. Comunicar a users que vuelvan a loguearse.
- Si `NEXTAUTH_URL` no matchea el dominio del deploy: NextAuth rechaza el callback de Google. Forzar match.

## Mitigación — cómo restaurar el servicio

Por prioridad:

1. **Rollback del deploy** (Vercel → Deployments → "Promote to Production" sobre el deploy anterior). 30 segundos.
2. **Restaurar provider externo** (esperar Google/Supabase/Upstash, no podemos forzarlos).
3. **Invalidar sesiones comprometidas** vía SQL directo en Supabase si hay reuse confirmado.
4. **Communicar a users** si la mitigación tarda >10 min:
   - Status page (si existe)
   - Banner en `/login` con `Maintenance mode` (requiere deploy de un cambio mínimo)

## Post-mortem (después del incidente)

Crear archivo `docs/postmortems/<YYYY-MM-DD>-auth-down.md` con:

- **Timeline**: hora exacta de detección, primer fix attempt, mitigación, restauración total
- **Root cause**: 1 línea — qué falló y por qué (e.g. "rotación de NEXTAUTH_SECRET sin migración de sesiones")
- **Impacto**: cuántos users afectados, cuánto duró el outage
- **Lo que funcionó**: detección rápida via Sentry alert, rollback en 30s
- **Lo que NO funcionó**: rate limit no contuvo brute force porque Upstash estaba caído al mismo tiempo
- **Action items**: lista numerada con dueño y fecha (ej. "1. agregar status page para users — Felipe — antes de 2026-06-01")

## Referencias del código

- `src/server/lib/auth.ts` — authOptions, providers, callbacks, events
- `src/server/services/refresh-tokens.service.ts` — issueRefreshToken, validateAndRotate (detecta reuse)
- `src/app/api/auth/refresh/route.ts` — endpoint de rotación
- `src/server/lib/rate-limit.ts` — rate limit (Upstash + fallback in-memory)
- Audit: `docs/security-audit-api.md` sección `auth` (#A1, #A2)

## Métricas de éxito del runbook

Si seguir este runbook lleva más de 15 min, actualizarlo con la información que faltó.
