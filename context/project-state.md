# Estado del Proyecto — PractiX

> Última actualización: 2026-05-06. Producción estable, refactor-plan core cerrado.

## Estado actual

**Producto en producción**, deployed en Vercel. Refactor + hardening cerrado (Fases 0–6 core del `refactor-plan.md`). Solo quedan opcionales: F6.4 (medir P95 con tráfico real) y F6.5 (UX optimistic + skeletons).

Versión actual: **`1.10.23`** (ver `CHANGELOG.md` para histórico).

### Rediseño visual "Premium Modern SaaS — Warm Tech" ✅ Completo

| Batch / Oleada      | Páginas                                                                                               | Estado      |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ----------- |
| Públicas            | landing, listing, detalle práctica                                                                    | ✅ Completo |
| Auth                | login, registro, forgot-password, reset-password                                                      | ✅ Completo |
| Oleada 1 dashboards | layout dashboard, router `/dashboard`, perfil, `dashboard/estudiante`, `dashboard/empresa`            | ✅ Completo |
| Oleada 2 dashboards | `dashboard/estudiante/inbox`, `dashboard/empresa/inbox`                                               | ✅ Completo |
| Oleada 3 dashboards | `dashboard/empresa/calendar`, `dashboard/empresa/candidatos/[jobId]`, `dashboard/empresa/ats/[jobId]` | ✅ Completo |
| Admin               | panel admin empresas                                                                                  | ✅ Completo |

### Sistema de diseño aplicado

- Fondo base `#FAFAF8`, texto `#0A0909`
- Tipografía Onest via `var(--font-onest)`
- Cards `rounded-[24px] border border-black/[0.06]`
- Gradientes warm: `from-[#FF6A3D] to-[#FF9B6A]` (botones) y `from-[#FFB17A] via-[#FF8A52] to-[#FF5A28]` (hero text)
- Fondo ambiente con mesh radial + grain overlay en contenedor `fixed inset-0 -z-10`
- Tabs pill style dentro de `bg-black/[0.03] rounded-2xl p-1`
- Estados con gradient: verde suave para success, warm para error

## Refactor-plan completado (Fases 0–6 ✅, opcionales pendientes)

Ver `context/refactor-plan.md` para el detalle exhaustivo. Resumen del estado al 2026-05-06:

| Fase | Resultado clave                                                                                                        | Estado      |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | ----------- |
| 0    | Convención Next.js 16 (`proxy.ts` no `middleware.ts`) verificada                                                       | ✅          |
| 1    | 6 ADRs en `docs/adr/`                                                                                                  | ✅          |
| 2    | Coverage 100% func / 80% lines, 1097 unit/component verde + 53 E2E                                                     | ✅          |
| 3    | OWASP Top 10: JWT 15min + refresh rotation, rate limit Upstash, CSP con nonces, audit `/api/*` (12 áreas, 31 fixes 🛑) | ✅          |
| 4    | knip 0 findings + reorganización `src/lib/` (server vs client)                                                         | ✅          |
| 5    | Strategy/Registry para scorers ATS (1 de 4 patrones, otros 3 descartados conscientemente)                              | ✅          |
| 6.1  | Logger estructurado pino + correlation ID `x-request-id`                                                               | ✅          |
| 6.2  | Sentry: 3 alertas críticas, Performance Monitoring activo (0.1), releases ligados a `VERCEL_GIT_COMMIT_SHA`            | ✅          |
| 6.3  | 3 runbooks operacionales en `docs/runbooks/`                                                                           | ✅          |
| 6.4  | NFR P95 <200ms — medir con `k6`/`autocannon` cuando haya tráfico real                                                  | 🔲 opcional |
| 6.5  | UX percibida: skeletons + optimistic updates                                                                           | 🔲 opcional |

## Próximos pasos opcionales

1. **F6.4** — Esperar ~1 semana de tráfico real, medir P95 con Sentry Performance, validar con `k6`/`autocannon` contra deploy. Si no cumple <200ms: cache, índices, CDN.
2. **F6.5** — Cuando tengas usuarios y feedback de "se siente lenta", agregar skeletons en listing prácticas/ranking ATS, optimistic en postular/aprobar/rechazar/marcar leída, lazy load `next/image`, prefetch en hover de `<Link>`.
3. **2 alertas Sentry diferidas** (error rate >1%, P95 >200ms) — esperar data real o tier paga (Issue Alerts free no soporta métricas custom).

## Bugs resueltos recientes

- **3 semanas de deploys de Vercel fallidos (2026-04-15 a 2026-05-05)**: producción quedó congelada en commit `cf03ed7` por falta de `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Vercel env vars. Diagnóstico inicial fue Sentry (descartado con branch `debug/disable-sentry-build`). Fix: agregar la env var en Vercel + workflow CI con placeholders dummy para que builds de Dependabot también pasen.
- **Sourcemaps de Sentry no se subían en producción (~1 mes desde setup inicial)**: el wizard `npx @sentry/wizard` configura el token en GitHub Actions pero NO en Vercel. Fix en F6-L3 (bump 1.10.23): nuevo Org Auth Token con scope `org:ci`, configurado en Vercel + GitHub.
- **Doble postulación visual**: en `practicas/[id]` el botón "Postularme" volvía a aparecer al recargar una práctica ya postulada. La unicidad en DB (`@@unique([studentId, internshipId])`) impedía duplicar en back pero el UI no hidrataba estado persistido. Fix: `useEffect` al montar consulta `/api/applications/my` cuando hay sesión STUDENT y setea `applied` + `wasAlreadyApplied` si corresponde. El texto del banner cambia a "Ya te postulaste a esta práctica" y aparece link a `/dashboard/estudiante`.

## Módulos completados

| #   | Módulo                               | Estado      |
| --- | ------------------------------------ | ----------- |
| 1   | Setup del Proyecto                   | ✅ Completo |
| 2   | Base de Datos                        | ✅ Completo |
| 3   | Auth (NextAuth Google OAuth)         | ✅ Completo |
| 4   | Users API                            | ✅ Completo |
| 5   | Internships API                      | ✅ Completo |
| 6   | Applications API                     | ✅ Completo |
| 7   | Landing + Layout                     | ✅ Completo |
| 8   | Listing (filtros + paginación)       | ✅ Completo |
| 9   | Student Dashboard                    | ✅ Completo |
| 10  | Company Dashboard                    | ✅ Completo |
| 11  | AI Matching                          | ✅ Completo |
| 12  | Deploy (emails + Sentry + CI)        | ✅ Completo |
| 13  | Testing (Vitest + Playwright)        | ✅ Completo |
| 14  | Security (rate limiting + OWASP)     | ✅ Completo |
| 15  | Mejoras estudiante (registro guiado) | ✅ Completo |
| +   | Admin panel + registro empresas      | ✅ Completo |
| +   | Rediseño visual Stitch               | ✅ Completo |
| +   | ATS completo para empresas           | ✅ Completo |
| +   | Chat en tiempo real                  | ✅ Completo |
| +   | Calendario de entrevistas            | ✅ Completo |
| +   | Notificaciones                       | ✅ Completo |
| +   | Perfil unificado                     | ✅ Completo |
| +   | Forgot/Reset password empresas       | ✅ Completo |

## Stack confirmado

- Next.js 16.2.3 + React 19 (no Next.js 14 como dice el spec original)
- pnpm como package manager
- Tailwind v4 (config vía CSS `@theme`, no `tailwind.config.ts`)
- Prisma 7 (URL en `prisma.config.ts`, no en `schema.prisma`)
- Supabase Session Pooler puerto 6543 para CLI (puerto 5432 bloqueado en red local)
- NextAuth con Google OAuth (estudiantes) + credenciales email/password (empresas)
- Supabase Realtime para chat en tiempo real
- HuggingFace `BAAI/bge-small-en-v1.5` (embeddings 384 dims, feature-extraction nativa). Migración desde `sentence-transformers/all-MiniLM-L6-v2` documentada en ADR 006.
- Brevo para emails transaccionales
- Sentry con releases ligados a `VERCEL_GIT_COMMIT_SHA`, sourcemaps en build, alertas configuradas, runbooks en `docs/runbooks/`

## Modelos Prisma actuales

- `User`, `StudentProfile`, `CompanyProfile`, `Internship`, `Application`
- `Conversation`, `Message` — chat en tiempo real
- `Interview` — calendario de entrevistas
- `Notification` — sistema de notificaciones
- `PasswordResetToken` — reset password para empresas
- `ATSConfig` — configuración ATS por práctica

## Servicios implementados

- `users.service.ts` — perfiles estudiante/empresa
- `internships.service.ts` — CRUD + embeddings
- `applications.service.ts` — estados + notificaciones
- `matching.service.ts` — CV parsing + cosine similarity
- `chat.service.ts` — conversaciones + mensajes
- `interviews.service.ts` — CRUD entrevistas

## Últimas páginas creadas

- `(dashboard)/dashboard/empresa/inbox` — chat empresa
- `(dashboard)/dashboard/empresa/calendar` — calendario entrevistas
- `(dashboard)/dashboard/empresa/ats/[jobId]` — pipeline ATS
- `(dashboard)/dashboard/empresa/candidatos/[jobId]` — ranking candidatos
- `(dashboard)/dashboard/estudiante/inbox` — chat estudiante
- `(dashboard)/perfil` — perfil unificado
- `(admin)/admin/empresas` — panel aprobación empresas
- `(auth)/forgot-password` + `(auth)/reset-password` — recuperación contraseña
