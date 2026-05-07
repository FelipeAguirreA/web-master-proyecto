# Política de retención de datos personales

> **Versión**: 1.0 (borrador)
> **Última actualización**: 2026-05-07
> **Aplica a**: PractiX (Ley 21.719 de Chile)
> **Estado**: política definida, automatización operacional pendiente (ver final del documento).

## Por qué existe

La Ley 21.719 obliga al responsable de tratamiento (PractiX) a:

- Tratar los datos solo durante el tiempo **necesario para la finalidad declarada**.
- **Eliminar** los datos cuando ya no sean necesarios o cuando el titular lo solicite.
- Documentar los **plazos de conservación** y poder demostrar su cumplimiento.

Sin política escrita, el riesgo es: datos viejos acumulados sin justificación → mayor exposición en caso de breach + sanción por incumplimiento del principio de minimización.

## Principios que aplicamos

1. **Necesidad**: solo conservamos datos mientras el user mantenga la cuenta activa o existan obligaciones legales.
2. **Proporcionalidad**: plazos cortos cuando se puede; plazos legales mínimos cuando aplican.
3. **Eliminación efectiva**: borrado real (DB + Storage) ante solicitud del user o cumplimiento de plazo.
4. **Trazabilidad**: dejamos un registro mínimo y anonimizado de eventos de borrado para auditoría (sin datos personales).

## Plazos por categoría de dato

| Categoría                                             | Plazo                              | Inicio del cómputo                                    | Justificación                                                                                                             |
| ----------------------------------------------------- | ---------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Cuenta activa** (User + perfiles)                   | Indefinido                         | —                                                     | Mientras el user use la plataforma                                                                                        |
| **Cuenta inactiva**                                   | **24 meses** sin login             | Última fecha de login                                 | Después de 2 años sin uso, no hay finalidad legítima — purga automática con notificación previa                           |
| **CV (archivo en Storage + cvText + embedding)**      | Junto con la cuenta o a solicitud  | Cuando user borra CV o cuenta                         | Eliminado en `deleteAccount` (F-Legal-2.3) y en `deleteCV`                                                                |
| **Postulaciones (`Application`)**                     | Junto con la cuenta del estudiante | Eliminación de cuenta                                 | Cascade Prisma `onDelete: Cascade`                                                                                        |
| **Mensajes de chat (`Message`)**                      | Junto con la conversación          | Eliminación de cuenta de cualquiera de las dos partes | Cascade Prisma                                                                                                            |
| **Entrevistas (`Interview`)**                         | Junto con la application           | Eliminación application                               | Cascade Prisma                                                                                                            |
| **Notificaciones in-app**                             | Junto con la cuenta                | Eliminación cuenta                                    | Cascade Prisma                                                                                                            |
| **Refresh tokens**                                    | 7 días                             | Creación del token                                    | Configuración del JWT (auto-cleanup vía `expiresAt`)                                                                      |
| **Reset password tokens**                             | 1 hora                             | Solicitud del token                                   | Auto-cleanup vía `resetTokenExp`                                                                                          |
| **Sentry events**                                     | 30-90 días                         | Generación del event                                  | Retention de Sentry (free tier 30d, paid hasta 90d). Sin PII desde 1.11.1.                                                |
| **Vercel logs**                                       | 1 día (Hobby) / 7-30 días (Pro)    | Generación del log                                    | Retention configurable según plan                                                                                         |
| **Backups Supabase**                                  | 7 días                             | Creación del backup                                   | Plan free Supabase. Para purgas legales reales, validar que también se purgue en backups según procedimiento del provider |
| **Audit logs** (cuando F-Legal-3.4 esté implementado) | 24 meses                           | Generación del evento                                 | Trazabilidad legal mínima sin retener PII                                                                                 |

## Excepciones — cuándo NO purgamos

Aunque se cumpla el plazo, hay casos donde se conserva el dato:

- **Obligación legal vigente**: requerimiento judicial, retención fiscal, etc. Documentar la excepción con base legal.
- **Litigio activo o probable**: si hay reclamo en curso, conservar la evidencia hasta que se resuelva.
- **Prevención de fraude / seguridad**: datos hash de IPs/emails comprometidos pueden mantenerse (anonimizados) para bloquear re-registros.

Cualquier excepción aplicada debe estar documentada en `docs/incidents/<fecha>-retention-exception-<short-name>.md`.

## Proceso de purga de cuenta inactiva

> **Estado**: definido en este documento, **automatización pendiente** (ver "Pendientes operacionales" abajo).

### Paso 1 — Detección

Cron diario lista users con `lastLoginAt < now() - 24 meses` Y que NO hayan recibido notificación previa de inactividad en los últimos 30 días.

### Paso 2 — Notificación al user

Email automático (vía Brevo) con:

- Asunto: "Tu cuenta de PractiX se eliminará por inactividad en 30 días"
- Body: explicación clara del motivo, fecha exacta de borrado programado, cómo evitar el borrado (loguearse y volver a usar la plataforma), cómo solicitar conservación excepcional.
- Crear `Notification` in-app del mismo tenor.
- Marcar el evento en una tabla auxiliar (o campo `inactivityNotifiedAt`) para no spam-ear.

### Paso 3 — Purga efectiva

30 días después de la notificación, si el user **no se volvió a loguear**:

- Llamar a `deleteAccount(userId)` (mismo service de F-Legal-2.3).
- Borra User + cascade + CV en Storage.
- Registrar en audit log (cuando F-Legal-3.4 esté): `{ action: "retention_purge", target: userId hasheado, timestamp }`.

### Paso 4 — Auditoría mensual

Reporte mensual interno:

- Cantidad de cuentas notificadas (intent de borrado)
- Cantidad de cuentas reactivadas (login después de notificación)
- Cantidad de cuentas efectivamente purgadas
- Errores en el proceso (ej: Storage falla)

## Solicitudes manuales del user

El user puede solicitar borrado **antes** del plazo automático en cualquier momento:

- Vía UI: `/perfil` → "Eliminar mi cuenta" (F-Legal-2.4) → endpoint `DELETE /api/users/me` (F-Legal-2.3).
- Vía email: `soporte@practix.cl` con asunto "Solicitud ARCO+ — eliminación".

Tiempo de respuesta: la app responde inmediatamente; vía email, máximo 5 días hábiles.

## Cómo se demuestra cumplimiento

Frente a una auditoría de la APDP, podemos mostrar:

1. **Este documento** (versionado en git).
2. **Schema Prisma** con los plazos implícitos (refresh token `expiresAt`, reset token `resetTokenExp`).
3. **Código de los services** (`delete-account.service.ts`, `retention.service.ts` cuando exista).
4. **Logs del cron** (cuando exista) con cantidad de purgas por mes.
5. **Audit log forense** (F-Legal-3.4) con eventos de borrado.

## Pendientes operacionales (no implementados al 2026-05-07)

| Item                                                                                                                  | Necesario para             | Bloqueador                                              |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------- |
| Campo `User.lastLoginAt: DateTime?`                                                                                   | Detectar cuentas inactivas | Migration nueva (similar a F-Legal-2.1)                 |
| Update de `lastLoginAt` en NextAuth callback `signIn`                                                                 | Idem                       | El callback existe, falta sumar el `prisma.user.update` |
| `src/server/services/retention.service.ts` con `findInactiveUsers`, `notifyInactivityWarning`, `purgeInactiveAccount` | Lógica del cron            | Necesita lo anterior                                    |
| Endpoint `GET /api/cron/retention-purge` con validación de `CRON_SECRET`                                              | Disparador del cron        | Necesita el service                                     |
| `vercel.json` con `crons: [{ path: "/api/cron/retention-purge", schedule: "0 3 * * *" }]`                             | Cron diario en Vercel      | Necesita el endpoint                                    |
| Tests del service de retención                                                                                        | Cobertura                  | —                                                       |
| Email template de "tu cuenta se borrará por inactividad" en Brevo                                                     | Notificación al user       | Helper en `mail.ts`                                     |

**Acción inmediata mientras no esté el cron**: la política aplica igualmente. Si el equipo detecta una cuenta inactiva >24m en una auditoría manual, se notifica y se procede con el flow descrito.

## Cuando se actualice esta política

- Bumpear versión arriba.
- Anotar la fecha de "última actualización".
- Si los plazos cambian materialmente, notificar a los users vigentes (mismo principio que cambios en política de privacidad).

## Contactos

- Owner técnico: Felipe Aguirre (`felipeaguirreee@gmail.com`)
- Asesor legal: pendiente designar (F-Legal-4)
- DPO: pendiente designar (F-Legal-4)
- Soporte usuarios: `soporte@practix.cl`
