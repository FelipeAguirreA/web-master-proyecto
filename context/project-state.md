# Estado del Proyecto — PractiX

## Módulo actual

**Rediseño visual "Premium Modern SaaS — Warm Tech"** en curso por oleadas.

### Estado del rediseño

| Batch / Oleada      | Páginas                                                                                               | Estado       |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ------------ |
| Públicas            | landing, listing, detalle práctica                                                                    | ✅ Completo  |
| Auth                | login, registro, forgot-password, reset-password                                                      | ✅ Completo  |
| Oleada 1 dashboards | layout dashboard, router `/dashboard`, perfil, `dashboard/estudiante`, `dashboard/empresa`            | ✅ Completo  |
| Oleada 2 dashboards | `dashboard/estudiante/inbox`, `dashboard/empresa/inbox`                                               | ⏳ Pendiente |
| Oleada 3 dashboards | `dashboard/empresa/calendar`, `dashboard/empresa/candidatos/[jobId]`, `dashboard/empresa/ats/[jobId]` | ⏳ Pendiente |
| Admin               | panel admin empresas                                                                                  | ⏳ Pendiente |

### Sistema de diseño aplicado

- Fondo base `#FAFAF8`, texto `#0A0909`
- Tipografía Onest via `var(--font-onest)`
- Cards `rounded-[24px] border border-black/[0.06]`
- Gradientes warm: `from-[#FF6A3D] to-[#FF9B6A]` (botones) y `from-[#FFB17A] via-[#FF8A52] to-[#FF5A28]` (hero text)
- Fondo ambiente con mesh radial + grain overlay en contenedor `fixed inset-0 -z-10`
- Tabs pill style dentro de `bg-black/[0.03] rounded-2xl p-1`
- Estados con gradient: verde suave para success, warm para error

## Próximo paso

1. Oleada 2 — rediseñar chat (`estudiante/inbox` + `empresa/inbox`) con la misma paleta warm.
2. Oleada 3 — calendario + candidatos + ATS.
3. Admin — panel de aprobación de empresas.

## Bugs resueltos recientes

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
- HuggingFace `paraphrase-multilingual-MiniLM-L12-v2` (embeddings 384 dims, multilingüe)
- Brevo para emails transaccionales
- Sentry para error tracking

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
