# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-04-22

### Added

- Responsive completo para mobile (320px edge, 375px iPhone SE, 390-414px Plus) y tablet (768px) con foco en iPhone SE como referencia
  - Drawer hamburguesa en layouts dashboard, admin y público (`PublicNav`) con backdrop, slide desde la izquierda, cierre por overlay, ESC y click en cualquier link del drawer
  - `PublicNav` detecta sesión via `useSession`: cuando hay sesión muestra links del dashboard según rol (STUDENT / COMPANY / ADMIN) en lugar de links públicos de conversión
- Endpoint `DELETE /api/notifications/[id]` con filtro por `userId` para evitar borrados ajenos (404 si no pertenece al usuario)
- Botón X por notificación en el panel de campana con update optimista + rollback en caso de error
- Botón "Volver al dashboard" en el header del panel admin + entrada en el dropdown del usuario

### Changed

- Nomenclatura unificada: "Prácticas" reemplaza a "Explorar" en navs, footer landing y navbar dashboard (se mantiene "Explorá" en copy imperativo)
- Dashboard estudiante: límite de 6 recomendaciones visibles (`visibleRecommendations` consistente en render, tab counter y mensaje del hero)
- Modales (`ScoreBreakdownModal`, modal de detalle de postulación): bottom sheet en mobile (`items-end`) con `max-h-[calc(100dvh-80px)]` para no taparse con navbar sticky, header sticky con X de 44px touch target
- `ModuleCard` ATS: layout de 2 filas en mobile (header con icon+label+actions, slider en segunda fila con ancho completo) para que el weight input respire
- Ranking de candidatos (`/dashboard/empresa/candidatos/[jobId]` y `/dashboard/empresa/ats/[jobId]`): tabla en desktop, cards con badges (Pipeline, ATS, Match) en mobile
- Panel de notificaciones: posicionamiento `fixed` en mobile (`top-[76px] right-3`) para garantizar que entre en viewport; `absolute` en desktop mantenido
- Altura de inbox chat: `h-[calc(100dvh-80px)]` en mobile para que el `MessageInput` quede realmente sticky (antes `min-h-*` permitía que el contenedor crezca más que el viewport y el scroll se llevaba el input)

### Fixed

- Texto desbordando recuadros en detalle de práctica (`/practicas/[id]`): agregado `break-words [overflow-wrap:anywhere]` en H1 título, descripción y requirements; `break-all` en chips de skills
- Auth grids `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` para que los formularios no se aprieten en mobile
- Filter bar `/practicas` selects colapsando mal en mobile
- Panel de notificaciones se salía del viewport por la izquierda (root cause: `right-0` anclado al botón bell que no está al borde derecho del header)
- ATS header con botones "Gestionar candidatos" + "Guardar" desbordando en mobile: ahora se apilan en `<sm:` y se alinean horizontal en `sm:+`

## [1.3.0] - 2026-04-21

### Added

- Columna "Acciones" en la tabla de ranking de candidatos (`/dashboard/empresa/candidatos/[jobId]`) con botones contextuales según estado: Ver CV, Aprobar, Rechazar, Contactar, Enviar email
- Botón "Gestionar candidatos" en el header de la página de configuración ATS para navegar directamente al listado

### Changed

- `ScoreBreakdownModal` pasa a ser puramente informativo (solo muestra breakdown de score). Las acciones (aprobar, rechazar, contactar, enviar email, ver CV) viven ahora en la tabla de ranking para separar responsabilidades: ATS = configurar criterios y ver scores, candidatos = gestionar pipeline
- Pulido visual y refinamiento UI en módulos chat, calendario, perfil, admin y dashboards

### Fixed

- Sincronización entre `status` y `pipelineStatus` al mover tarjetas en el kanban del pipeline. El backend (`PATCH /api/ats/pipeline/[applicationId]`) ahora actualiza ambos campos con mapeo: PENDING→PENDING, REVIEWING→REVIEWED, INTERVIEW→ACCEPTED, REJECTED→REJECTED. El cliente refleja el cambio y resetea el flag de email enviado para permitir reenvío acorde al nuevo estado
- Video del hero en la landing que no arrancaba consistentemente al recargar: `preload="metadata"` → `preload="auto"` para que el buffer esté disponible al autoPlay. Se eliminan `poster="/hero-poster.jpg"` y `<source>` del webm que generaban 404 y retrasaban la inicialización del pipeline de decodificación

## [1.2.1] - 2026-04-17

### Changed

- Rediseño visual "Premium Modern SaaS — Warm Tech" aplicado por oleadas
  - Públicas: landing, listing y detalle de práctica refinadas
  - Auth: login, registro, forgot-password y reset-password alineadas al sistema warm
  - Oleada 1 dashboards: layout, router `/dashboard`, perfil, `dashboard/estudiante` y `dashboard/empresa`
- Sistema de diseño: fondo `#FAFAF8`, cards `rounded-[24px]`, gradientes warm, tabs pill, mesh radial + grain

### Fixed

- Postulación duplicada visualmente en `practicas/[id]`: al recargar una práctica ya postulada el botón "Postularme" volvía a aparecer porque el UI no hidrataba el estado persistido. Ahora al montar se consulta `/api/applications/my` y se setea `applied` + `wasAlreadyApplied` si corresponde, mostrando "Ya te postulaste a esta práctica" con link al dashboard

### Added

- `public/hero-video.mp4` — video de fondo para el hero de la landing

## [1.2.0] - 2026-04-16

### Added

- Módulo de chat en tiempo real entre empresas y candidatos aceptados
  - Optimistic UI: el mensaje aparece al instante sin bloquear el input
  - Polling cada 3 s como fallback garantizado al Supabase Realtime
  - Smart scroll: baja automáticamente solo si el usuario está cerca del fondo
  - Badge de mensajes sin leer en el navbar con polling cada 5 s
- Calendario de entrevistas para empresas (`/dashboard/empresa/calendar`)
  - CRUD completo de entrevistas con modal de confirmación al eliminar
  - Envío de invitación al candidato como mensaje de tipo `INTERVIEW` en el chat
  - Mensajes de tipo `INTERVIEW` alineados al lado del emisor
- Módulo de edición de perfil (`/perfil`)
  - Upload de avatar/logo a Supabase Storage bucket `avatars`
  - Vista previa local con blob URL antes de guardar
  - Actualización en tiempo real del navbar sin re-login vía `update()` de NextAuth
  - Dropdown en el navbar al hacer clic en el avatar con opción "Editar perfil" y "Cerrar sesión"
- Sistema de notificaciones en la campanita del navbar
  - Notificación automática al estudiante cuando su postulación cambia a REVIEWED, ACCEPTED o REJECTED
  - Badge rojo en la campanita con conteo de no leídas
  - Dropdown con historial de notificaciones y opción "Marcar leídas"
  - Polling cada 10 s
- Logo de empresa visible en el explorador de prácticas y en el chat
- Nombre completo (nombre + apellido) del estudiante en el chat para empresas
- Encabezado del chat muestra `Nombre Apellido - Empresa` para el estudiante

### Fixed

- Nombre de empresa en el chat mostraba `User.name` personal en lugar de `CompanyProfile.companyName`
- Scrollbar innecesario en la página de mensajes (`calc(100vh-64px)` → `calc(100vh-80px)`)
- `CompanyProfile.logo` no se sincronizaba al subir avatar — ahora se actualiza en la misma transacción
- `listInternships` usaba `CompanyProfile.logo` sin fallback a `User.image` — empresas antiguas no mostraban logo
- Nombre del usuario de empresa en el navbar mostraba nombre personal en lugar del nombre de la empresa
- CSP bloqueaba URLs `blob:` en `img-src` — agregado `blob:` para permitir previsualización de imágenes
- Bucket `avatars` no existía en Supabase Storage — creado con acceso público

---

## [1.1.0] - 2026-04-13

### Added

- Flujo de registro guiado obligatorio para estudiantes nuevos (`/registro`)
  - Campos: nombre, apellidos, documento de identidad (RUT con validación Módulo 11 o pasaporte/DNI), teléfono con selector de país
  - Pre-rellena nombre desde la sesión de Google
  - Validación client-side completa antes de llamar al servidor
- Selector de país con código de marcación en el campo teléfono (15 países, Chile por defecto)
- Gate de registro en `proxy.ts`: estudiantes sin registro completo son redirigidos a `/registro` en cualquier ruta
- Campos `lastName`, `rut` (único) y `phone` en el modelo `User`
- Endpoint `POST /api/users/registro` con validación Zod y verificación de unicidad de RUT
- Navbar session-aware en homepage y `/practicas`: muestra "Mi Dashboard" si hay sesión activa, "Iniciar sesión" si no
- Modal de detalle al hacer clic en una postulación: descripción completa, área, ubicación, modalidad, duración, requisitos y skills
- `registrationCompleted` en el JWT y sesión de NextAuth para controlar el gate sin consultar DB en cada request

### Fixed

- Sesión aparecía cerrada al navegar al homepage o a `/practicas` — ambas páginas tenían navbar estático sin leer la sesión
- `error.errors` de Zod v4 renombrado a `error.issues` — causaba 500 en el endpoint de registro
- `getMyApplications` devolvía el vector embedding (384 floats) innecesariamente al frontend — excluido con `select`
- Archivos `.doc` (Word binario) aceptados pero no procesables por `mammoth` — eliminados de `ALLOWED_TYPES`
- Bytes nulos (`\x00`) en PDFs causaban error de encoding UTF-8 en PostgreSQL — sanitizado antes de persistir

### Changed

- `middleware.ts` renombrado a `proxy.ts` y función exportada a `proxy` (convención Next.js 16)
- Route `[...nextauth]` actualizado para manejar `params` asíncronos (requerido por Next.js 16)

---

## [1.0.0] - 2026-04-13

### Added

- Notificaciones por email transaccional con Brevo (nueva postulación, cambio de estado)
- Health check endpoint en `/api/health` con verificación de base de datos
- Security headers de producción (HSTS, CSP, X-Frame-Options, etc.)
- Dockerfile multi-stage optimizado para producción (imagen < 300MB)
- Pipeline CI/CD con GitHub Actions: lint, type-check, tests, build y audit de dependencias
- Script `postinstall` para generar Prisma Client automáticamente en Vercel
- `sentry.client.config.ts` — inicialización de Sentry en el navegador con Session Replay
- Tests E2E con Playwright: landing, autenticación y listado de prácticas con filtros
- Tests de componente con Vitest + Testing Library: `InternshipCard` (13 casos)
- Script `prisma/regen-embeddings.ts` para regenerar embeddings tras cambio de modelo

### Fixed

- `processCV` y `deleteCV` usaban `prisma.update` — tronaban si el `StudentProfile` no existía; cambiado a `upsert`
- `updateStudentProfile` en `users.service.ts` — mismo problema corregido con `upsert`
- `GET /api/matching/recommendations` devolvía 400 cuando el estudiante no tenía CV; ahora retorna `[]`
- Embeddings incompatibles entre modelos: seed usaba `BAAI/bge-small-en-v1.5`, app usaba `paraphrase-multilingual-MiniLM-L12-v2` (ruteado incorrectamente a `SentenceSimilarityPipeline` por HuggingFace). Unificado a `BAAI/bge-small-en-v1.5` con límite de 2000 caracteres

---

## [0.1.0] - 2026-04-09

### Added

- Setup inicial del proyecto: Next.js 16 + React 19 + TypeScript + Tailwind v4
- Estructura clean architecture: app/api → server/services → server/lib
- Dependencias: NextAuth, Prisma, Supabase, Zod, HuggingFace, Sentry, Brevo
- Husky + lint-staged + commitlint (conventional commits)
- Vitest + Testing Library + Playwright configurados
- Docker Compose con PostgreSQL 15 para desarrollo local
- Validación de variables de entorno con Zod (src/lib/env.ts)
- Prisma inicializado con datasource postgresql
- Colores brand/accent y tipografía Outfit
