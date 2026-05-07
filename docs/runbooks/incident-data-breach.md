# Runbook — Data breach (filtración de datos personales)

> **Severidad**: Crítica
> **Tiempo de respuesta esperado**: <2h para containment, <72h para notificación a APDP
> **Last reviewed**: 2026-05-07

## Por qué este runbook existe

La **Ley 21.719 de Chile** obliga al responsable de tratamiento (PractiX) a:

1. Aplicar medidas técnicas y organizativas para proteger los datos.
2. **Notificar a la Agencia de Protección de Datos Personales (APDP)** sin dilación indebida y, cuando sea posible, a más tardar **72 horas** después de tener constancia del incidente.
3. **Notificar a los afectados** cuando el incidente entrañe alto riesgo para sus derechos.
4. Documentar el incidente con los hechos, efectos y medidas adoptadas.

La ventana de 72h es estricta. Este runbook existe para que, cuando pase, no perdamos tiempo improvisando.

## Definición — qué cuenta como breach

Un breach es **cualquier evento que comprometa la confidencialidad, integridad o disponibilidad de datos personales**. Incluye al menos:

- Acceso no autorizado a la base de datos o al storage (CV, archivos).
- Exposición pública de datos por mala configuración (bucket público accidental, endpoint sin auth, etc.).
- Pérdida o robo de credenciales privilegiadas (`SUPABASE_SERVICE_KEY`, `NEXTAUTH_SECRET`, `SENTRY_AUTH_TOKEN`, GitHub Actions secrets, Vercel env vars).
- Compromiso de cuenta admin/empresa que dé acceso a postulantes.
- Exfiltración detectada (`SELECT *` masivo desde IP desconocida, scraping de datos).
- Borrado masivo no autorizado (vandalismo / ransomware).
- Filtración accidental por commit en git (secret en código pusheado, screenshot con PII, etc.).

**NO es breach** (ojo a no sobre-reportar):

- Errores de aplicación que no exponen datos (500 al user, sin leak en payload).
- Intentos fallidos de login (existe `tags.auth: failed_login` en Sentry — son ataques, no exitosos).
- Acceso del propio user a sus datos.

## Síntomas / triggers de alerta

Cualquiera de estos amerita activar el runbook:

- **Sentry**: spike inusual de queries SQL desde IPs nuevas o `error.level: fatal` en routes de datos personales.
- **Vercel logs**: requests masivos a endpoints `/api/applications`, `/api/users/*`, `/api/internships/*/applicants` con patrón anómalo.
- **Supabase Dashboard → Logs**: queries sospechosas, conexiones desde IPs no whitelisted.
- **GitHub**: alerta de secret leaked en commit (Dependabot / GitHub secret scanning), o repo público accidental.
- **Reporte externo**: usuario, periodista, investigador de seguridad o autoridad reporta exposición.
- **`/api/health`** retorna data inesperada (DB con tablas faltantes, registros borrados masivamente).

## Acción inmediata — primeros 30 minutos

**El reloj de 72h empieza cuando "se tiene constancia"**. Mientras estás en triage no corre la cuenta — pero sé honesto: una vez confirmado el incidente, anotá la hora en el ticket de incidente.

### 1. Containment (cortar la sangría) — primero

**Sin perder tiempo en investigar la causa todavía.**

Según el vector:

| Vector                          | Acción inmediata                                                                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_SERVICE_KEY` filtrada | Rotar la key en Supabase Dashboard → Project Settings → API. Actualizar en Vercel + GitHub Actions. Re-deploy.                                                                                 |
| `NEXTAUTH_SECRET` filtrado      | Rotarlo en Vercel env vars + re-deploy. **Atención**: invalida TODAS las sesiones (todos los users tendrán que volver a loguear).                                                              |
| `SENTRY_AUTH_TOKEN` filtrado    | Revocar en `https://<org>.sentry.io/settings/auth-tokens/`. Crear uno nuevo. Actualizar en Vercel + GitHub Actions.                                                                            |
| Cuenta admin comprometida       | Suspender cuenta vía DB (`UPDATE users SET role='STUDENT' WHERE id=...` o eliminar via panel admin). Forzar logout vía revocar refresh tokens (`DELETE FROM refresh_tokens WHERE userId=...`). |
| Bucket Supabase mal configurado | Cambiar a privado en Supabase Dashboard → Storage → bucket → Configuration. Verificar que el endpoint sigue funcionando (los CVs hoy son públicos por design).                                 |
| Endpoint sin auth expuesto      | Revertir el commit que lo introdujo. Re-deploy inmediato.                                                                                                                                      |
| Exfiltración activa desde IP    | Bloquear la IP en Vercel Firewall (Vercel Dashboard → Project → Firewall).                                                                                                                     |
| Commit con secret en GitHub     | NO simplemente borrar el commit — **rotar el secret SÍ O SÍ** (ya está cacheado por scrapers). Después limpiar git history con `git filter-repo` si es repo público.                           |

### 2. Snapshot del estado para análisis posterior

ANTES de seguir mitigando, **capturá**:

- `git log` actual (commit hash al momento del incidente)
- Logs de Vercel del rango sospechoso (Vercel Dashboard → Logs → export rango)
- Sentry events del rango (Sentry → Issues → filter time range → export CSV)
- Supabase: query log y connection log si está disponible
- Lista de IPs sospechosas

Guardalo en un lugar seguro fuera del repo (ej: drive privado del equipo). Es la evidencia para post-mortem y eventual reporte forense.

### 3. Confirmar alcance — ¿qué datos están afectados?

Preguntas a responder:

- ¿Qué tablas/buckets fueron accedidos?
- ¿Cuántos users se ven afectados?
- ¿Qué tipo de datos se filtraron? (mail, RUT, CV, password hashes, embeddings, mensajes, postulaciones)
- ¿Hay datos sensibles especiales? (no aplica directamente — PractiX no maneja salud/religión, pero RUT chileno se considera identificador altamente sensible)

Si NO podés determinar alcance con certeza, asumí el peor caso para fines de notificación.

## Notificación 72h — qué reportar y a quién

### A la APDP (Agencia de Protección de Datos Personales)

> **El canal exacto se publicará por la APDP cerca de la entrada en vigencia (2026-12-01)**. Cuando esté disponible, agregar el link/email/formulario aquí.

Mientras tanto: contactá a tu abogado de protección de datos para coordinar el reporte formal.

Información que debés incluir:

- **Naturaleza del incidente**: descripción técnica concisa (qué pasó).
- **Categoría y número aproximado de titulares afectados**.
- **Categoría y número aproximado de registros afectados**.
- **Consecuencias probables** del incidente.
- **Medidas adoptadas o propuestas** para mitigar y prevenir.
- **Datos del DPO** o persona de contacto.

### A los afectados (cuando hay alto riesgo)

Si el incidente entraña alto riesgo (RUT, CV completo, contraseñas, comunicaciones privadas), notificación obligatoria. Template base:

> Asunto: Aviso de incidente de seguridad en PractiX
>
> Hola {nombre},
>
> Te escribimos para informarte que el {fecha} detectamos un incidente de seguridad que afectó a tu cuenta en PractiX. Específicamente: {descripción simple, sin tecnicismos}.
>
> **Qué datos se vieron afectados**: {lista}.
>
> **Qué hicimos**: {acciones de mitigación}.
>
> **Qué te recomendamos**: cambiar tu contraseña en PractiX, revisar accesos sospechosos a tu correo, y si reutilizás contraseñas en otros servicios, cambialas también.
>
> Si tenés dudas escribinos a soporte@practix.cl. Lamentamos profundamente esta situación.
>
> — El equipo de PractiX

Mandar vía Brevo (mismo provider que usa el sistema). Si Brevo está caído, usar mail directo desde una cuenta corporativa.

### A nadie más todavía

NO comunicar públicamente (Twitter / X, blog, prensa) hasta que esté coordinado con asesoría legal. La forma del anuncio público importa legalmente.

## Investigación post-containment (24-48h después)

1. **Reconstruir la timeline**: cuándo entró el atacante, cuándo se detectó, cuándo se contuvo.
2. **Identificar la causa raíz** (no solo el síntoma):
   - ¿Bug en código? → fix + tests.
   - ¿Mala configuración? → revisar todas las configs equivalentes.
   - ¿Dependencia vulnerable? → `pnpm audit` + actualizar.
   - ¿Phishing / ingeniería social? → 2FA obligatorio para admin.
3. **Listar gaps que permitieron el incidente** y plan de mitigación.
4. **Documentar todo en `docs/incidents/<fecha>-<short-name>.md`** (crear el directorio si no existe).

## Post-mortem (1 semana después)

Reunión interna con todos los involucrados. Output: documento blameless con:

- Resumen del incidente
- Timeline detallada
- Causa raíz
- Lecciones aprendidas
- Action items concretos con owner y fecha
- Métricas (cuánto duró el incidente, cuántos users afectados, downtime)

Compartir el doc final con el equipo. Si el incidente fue grave, considerá un post-mortem público (transparencia con users).

## Contactos clave

| Rol              | Quién                                          | Cómo                      |
| ---------------- | ---------------------------------------------- | ------------------------- |
| Owner técnico    | Felipe Aguirre                                 | felipeaguirreee@gmail.com |
| Asesor legal     | (pendiente designar — F-Legal-4)               | (pendiente)               |
| DPO              | (pendiente designar — F-Legal-4)               | (pendiente)               |
| APDP (autoridad) | (canal oficial pendiente, vigencia 2026-12-01) | (pendiente)               |
| Soporte Supabase | dashboard.supabase.com → Help                  | priority si plan Pro      |
| Soporte Vercel   | vercel.com/help                                | dashboard chat            |
| Soporte Sentry   | sentry.io/support                              | email/chat                |
| Soporte Brevo    | brevo.com/contact                              | email                     |

## Pre-incidente — qué deberíamos tener (todo en F-Legal-4 o ya pendiente)

- [ ] DPO designado o evaluación documentada de no-aplicabilidad.
- [ ] Asesor legal especializado en protección de datos.
- [ ] Canal exacto de notificación a la APDP (publicado cerca de 2026-12-01).
- [ ] DPAs firmados con todos los procesadores externos (Supabase, Vercel, HuggingFace, Brevo, Sentry, Google).
- [ ] 2FA obligatorio para cuentas con role ADMIN o COMPANY (no implementado todavía).
- [ ] Audit log forense funcional (F-Legal-3.4).
- [ ] Cifrado at-rest en Supabase confirmado por DPA.
- [ ] Backups verificados restaurar OK (test de restore mensual).

## Histórico de incidentes

(Sin incidentes registrados al 2026-05-07.)

Cuando ocurra el primero: agregar entrada con link al doc en `docs/incidents/`.
