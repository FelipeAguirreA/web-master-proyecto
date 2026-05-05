# Especificación de alertas Sentry

> **Para configurar manualmente** en el dashboard de Sentry — esta spec NO es código.
> Project: PractiX. Last reviewed: 2026-05-05.
>
> Cómo crear cada alerta: Sentry → Project → Alerts → Create Alert → seleccionar tipo (Issue alert / Metric alert) → copiar la condición de abajo.

---

## Estado actual

El proyecto tiene Sentry instalado (`@sentry/nextjs` v10.48.0) con configs en:

- `sentry.server.config.ts`
- `sentry.client.config.ts`
- `sentry.edge.config.ts`
- `src/instrumentation.ts` (carga las configs según runtime)

**Tags y mensajes que el código emite ya son confiables** — el audit de Fase 3 paso 3.7 estandarizó:

- Errores 500 con `Sentry.captureException(err, { tags: { route: "X.METHOD" }, extra: {...} })`
- Login fails con `Sentry.captureMessage("Failed login attempt", { level: "warning", tags: { auth: "failed_login", reason: "..." } })`
- Refresh reuse con `Sentry.captureMessage("Refresh token reuse detected", { level: "error", tags: { auth: "refresh_reuse" } })`
- Health DB down con `Sentry.captureMessage("Health check: DB ping failed", { level: "error", tags: { health: "db_down" } })`
- Path traversal attempts: detectados implícitamente en `src/server/services/matching.service.ts:sanitizeFilename` (futuro: agregar `Sentry.captureMessage` cuando el sanitize altera el nombre — opcional).

---

## Alertas que SÍ vale la pena configurar

### 1. 🔴 **CRÍTICA — Health check DB down** (Issue Alert)

**Por qué**: el endpoint que monitorea la DB era el más silencioso del proyecto antes del audit (#L1). Ahora notifica — pero solo sirve si la alert llega a oncall.

- **Tipo**: Issue Alert
- **Filtro**: `tags.health:db_down` AND `level:error`
- **Trigger**: cada nuevo issue (1 evento ya basta — la DB caída es crítica)
- **Acción**: email + Slack `#alerts-prod` (si existe) — **inmediato, no batch**
- **Cooldown**: 5 min (evitar storm si la DB sigue caída)
- **Runbook**: `docs/runbooks/incident-db-slow.md`

---

### 2. 🔴 **CRÍTICA — Refresh token reuse detected** (Issue Alert)

**Por qué**: si un refresh token rotado se reusa, **alguien comprometió la cuenta**. Es lo más cerca de "alarma de incendio" en seguridad.

- **Tipo**: Issue Alert
- **Filtro**: `tags.auth:refresh_reuse` AND `level:error`
- **Trigger**: cada nuevo evento (no batch — un caso ya merece investigación)
- **Acción**: email + Slack — **inmediato**
- **Cooldown**: ninguno (cada caso es distinto)
- **Action item por evento**: revisar `extra.userId` y `extra.ip` en el evento, decidir si revocar todos los refresh tokens del user (ver runbook `incident-auth-down.md` Caso B)

---

### 3. 🟠 **ALTA — Failed login burst** (Metric Alert — count)

**Por qué**: spike de logins fallidos = brute force attempt. Rate limit ya contiene parte (`5 / 5min` por IP+email), pero un atacante distribuido puede saturar otros límites.

- **Tipo**: Metric Alert sobre cantidad de eventos
- **Filtro**: `tags.auth:failed_login` AND `tags.reason:invalid_password`
- **Threshold**: `count > 50` en ventana de **5 minutos**
- **Acción**: email + Slack
- **Cooldown**: 30 min
- **Runbook**: `incident-auth-down.md` Caso A

---

### 4. 🟠 **ALTA — Error rate >1%** (Metric Alert — rate)

**Por qué**: NFR del refactor-plan dice que el error rate en API debería ser <1%. Por encima implica regresión.

- **Tipo**: Metric Alert sobre transactions
- **Filtro**: `transaction.op:http.server` (todos los handlers HTTP)
- **Threshold**: `failure_rate > 1%` en ventana de **15 minutos**
- **Mínimo de events**: 100 (para evitar falsos positivos en bajo tráfico)
- **Acción**: email
- **Cooldown**: 1 hora
- **Acción**: revisar deploy reciente, candidate para rollback

---

### 5. 🟠 **ALTA — P95 API >200ms** (Metric Alert — performance)

**Por qué**: NFR explícito del proyecto. Requiere `tracesSampleRate` activo (ver `docs/runbooks/incident-db-slow.md` y L3 de Fase 6).

- **Tipo**: Metric Alert sobre transaction duration
- **Filtro**: `transaction.op:http.server` AND endpoints críticos: `/api/internships`, `/api/applications`, `/api/matching/recommendations`
- **Threshold**: `p95(transaction.duration) > 200ms` en ventana de **10 minutos**
- **Acción**: email
- **Cooldown**: 1 hora
- **Runbook**: `incident-db-slow.md`

⚠️ **Pre-requisito**: activar `tracesSampleRate: 0.05` (5%) en `sentry.server.config.ts` y `sentry.client.config.ts` para que Sentry reciba data de performance. Esto se cierra en F6-L3.

---

### 6. 🟡 **MEDIA — Mail send failure rate >5%** (Metric Alert)

**Por qué**: si Brevo falla, los users no reciben emails de aceptación/rechazo (UX importante pero no crítico).

- **Tipo**: Metric Alert
- **Filtro**: `tags.mail:*` AND `level:error` (cualquier tag de mail con error — `mail: new_application`, `mail: company_status`, etc.)
- **Threshold**: `count > 10` en ventana de **15 minutos**
- **Acción**: email (no urgente)
- **Cooldown**: 1 hora
- **Acción**: verificar `BREVO_API_KEY` y status de Brevo. Si Brevo está caído, los emails se reintentan no automáticamente — habría que reenviar manualmente desde el admin panel (futuro feature).

---

## Alertas que NO vale la pena configurar (justificadas)

### ❌ "Cualquier exception en producción"

**Por qué no**: ya tenemos cobertura específica con `Sentry.captureException` en cada catch del audit (Fase 3 paso 3.7). Una alerta de "todo error 500" generaría ruido sin información — Sentry ya agrupa events por issue automáticamente.

### ❌ "Path traversal attempt en upload-cv"

**Por qué no (todavía)**: el sanitize del finding #J2 nunca emite a Sentry — solo silenciosamente saneamos el nombre. Para detectar attempts de exploit habría que agregar un `Sentry.captureMessage("Sanitized suspicious filename", { level: "info", extra: { original, sanitized } })` cuando el sanitize cambia el nombre — pero generaría ruido (la mayoría de cambios son de espacios y paréntesis, no exploits).

Si lo agregamos: filtrar por **diferencias de path** específicas (`../`, `/etc/`, `\\`) — solo esos son sospechosos.

### ❌ "Rate limit fail-open (Upstash caído)"

**Por qué no**: ya hay log estructurado con `module=rate-limit level=error message="Upstash error, fail-open"`. Si querés alerta sobre eso, la mejor aproximación es **monitorear desde el endpoint de health** o desde Vercel logs — no Sentry. Sentry no es el lugar para alertas de infrastructure.

---

## Setup recomendado de canales

| Canal                                                         | Para qué                                                         |
| ------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Email principal** (`oncall@` o `felipeaguirreee@gmail.com`) | Todas las alertas críticas y altas                               |
| **Slack `#alerts-prod`** (si existe)                          | Críticas únicamente — para no saturar el canal                   |
| **PagerDuty / OpsGenie**                                      | Solo críticas (DB down, refresh reuse) si tenés on-call rotation |

**Para un proyecto de un developer (PractiX hoy)**: email es suficiente. Configurar las **2 críticas** + las **3 altas**, dejar la media (mail failures) como nice-to-have.

---

## Releases ligados a commits

Cuando se cierre L3 de Fase 6 (Sentry config hardening), los issues de Sentry quedarán etiquetados con `release: practix@<commit-sha>`. Eso permite:

- Filtrar issues por release y ver "qué errores agregó el último deploy"
- Auto-rollback si Sentry detecta regression rate >10% en el primer hour de un deploy nuevo
- Comparar performance entre releases

Esto NO es spec de alerta, es feature de Sentry que se habilita cuando el `release` field está bien seteado en `sentry.server.config.ts` (configurar Vercel para inyectar `VERCEL_GIT_COMMIT_SHA`).

---

## Métricas de éxito de las alertas

Después de un mes con estas alertas configuradas:

- **Falsos positivos < 10%**: si más de 1/10 alertas son ruido, ajustar thresholds.
- **Tiempo de detección < 5 min** para issues críticos (DB down, refresh reuse).
- **Cero issues críticos no detectados** que se descubren por reportes de usuarios — eso significa que las alertas están mal configuradas.

Si una alerta NO se dispara nunca en 3 meses, evaluar si:

1. El threshold está demasiado alto → bajarlo.
2. El issue no ocurre porque el código está bien → mantener como red de seguridad o deprecar.
