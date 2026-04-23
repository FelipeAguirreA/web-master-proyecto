# Plan Responsive PractiX

**Estado**: Fases 1–5 completas y validadas por usuario en iPhone SE 375×667. Commiteado en v1.4.0.
**Última actualización**: 2026-04-22

> Documento vivo. Cada item marcado como `[x]` está implementado, `[ ]` pendiente, `[~]` en progreso.

---

## Contexto

La web se construyó desktop-first. No funciona correctamente en mobile ni tablet.
Objetivo: que funcione bien en **320px (edge), 375px (iPhone estándar), 390-414px (Plus), 768px (tablet) y 1024px+ (desktop)**.

**Breakpoints Tailwind usados**:

- default (base, mobile): 0-639px — **incluye 320px y 375px**
- `sm:` 640px+
- `md:` 768px+ (tablet y desktop)
- `lg:` 1024px+ (desktop)

**Foco especial**: `375px` (iPhone estándar, el más común). Todo fix mobile-first tiene que probarse mentalmente a 375px antes que a 320px.

**Design system** (sin cambios): Warm Tech

- bg `#FAFAF8`, text `#0A0909`
- warm grays `#4A4843 / #6D6A63 / #9B9891`
- gradient `#FF6A3D → #FF9B6A`
- peach suave `#FFF0E4 → #FFE1CB`
- font `var(--font-onest)`

---

## Fase 1 — Críticos bloqueantes

Orden de ejecución. Checkbox marca avance real.

### 1.1 Dashboard nav — drawer hamburguesa mobile ✅

- [x] Implementar drawer lateral usando imports `Menu`/`X` ya presentes
- [x] Botón hamburguesa visible en `md:hidden`
- [x] Drawer con backdrop, slide desde la izquierda, `w-[85vw] max-w-[320px]`
- [x] Incluir: navItems + admin button + user info (nombre/rol/email) + "Editar perfil" + "Cerrar sesión"
- [x] Cerrar drawer al: click en link, click en overlay, ESC, cambio de pathname
- [x] Respetar design system Warm Tech
- [x] Body overflow-hidden mientras está abierto
- **Archivo**: `src/app/(dashboard)/layout.tsx`

### 1.1b Nav público (landing + /practicas + detalle) — drawer hamburguesa mobile ✅

- [x] Crear componente shared `src/components/layout/PublicNav.tsx` (client)
- [x] Incluye: desktop nav + botón hamburguesa + drawer con links Prácticas/Producto/Para empresas
- [x] Admin button en drawer si corresponde; CTAs login/registro siempre visibles
- [x] Reemplazar los 3 navs duplicados (landing `page.tsx`, `practicas/page.tsx`, `practicas/[id]/page.tsx`)
- [x] Botones CTAs mobile: texto corto ("Panel" / "Entrar") en `<sm:`, largo en `sm:+`
- [x] Padding responsive en header container: `px-4 sm:px-6 pt-3 sm:pt-4`, inner `px-3 sm:px-5 py-2.5 sm:py-3`
- **Archivos**:
  - `src/components/layout/PublicNav.tsx` (nuevo)
  - `src/app/page.tsx`
  - `src/app/practicas/page.tsx`
  - `src/app/practicas/[id]/page.tsx`

### 1.2 Dropdowns: ancho fijo → max-width ✅

- [x] Notification panel `w-[340px]` → `w-[calc(100vw-2rem)] max-w-[340px]`
- [x] User dropdown `w-56` → `w-[calc(100vw-2rem)] max-w-[224px]`
- **Archivo**: `src/app/(dashboard)/layout.tsx`

### 1.3 Landing mockup grid ✅

- [x] `grid-cols-[220px_1fr]` → responsive en revisión previa
- **Archivo**: `src/app/page.tsx`

### 1.4 Auth forms grid ✅

- [x] `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` en todas las ocurrencias
- **Archivos**:
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(dashboard)/dashboard/empresa/page.tsx`

### 1.5 Empresa dashboard split layout ✅

- [x] `lg:grid-cols-3` → `md:grid-cols-3` (tablet soportado)
- [x] Mini stats wrap, paddings `pt-6 sm:pt-8`, h1 fluido
- **Archivo**: `src/app/(dashboard)/dashboard/empresa/page.tsx`

### 1.6 Inbox height ✅

- [x] `h-[calc(100vh-96px)]` → `min-h-[calc(100vh-96px)] md:h-[calc(100vh-96px)]`
- [x] Container con min-h en mobile para que el chat use toda la altura disponible
- [x] Rounded responsive `rounded-[20px] sm:rounded-[24px]`
- **Archivos**:
  - `src/app/(dashboard)/dashboard/empresa/inbox/page.tsx`
  - `src/app/(dashboard)/dashboard/estudiante/inbox/page.tsx`

### 1.7 Filter bar `/practicas` ✅

- [x] `lg:flex-row` → `md:flex-row`
- [x] Selects `w-full sm:w-auto md:min-w-[170px]`
- [x] Wrapper `md:contents` para Area/Modality/Clear
- **Archivo**: `src/app/practicas/page.tsx`

### 1.8 Detalle práctica ✅

- [x] Paddings `p-5 sm:p-8`, rounded responsive, logo escalado
- [x] Sidebar solo sticky en lg+, SkeletonDetail responsive
- **Archivo**: `src/app/practicas/[id]/page.tsx`

### 1.9 Dashboard estudiante ✅

- [x] Mini stats wrap, hero fluido, banner CV paddings responsive
- [x] Tabs con `max-w-full overflow-x-auto`, grid recomendaciones `sm:grid-cols-2`
- [x] ApplicationList stack vertical en mobile
- **Archivo**: `src/app/(dashboard)/dashboard/estudiante/page.tsx`

---

## Fase 2 — Dashboards & internals ✅

- [x] Chat `MessageBubble`: `break-words` + `max-w-[85%] sm:max-w-[75%]`, padding responsive
- [x] `ConversationList` / `ConversationItem`: ya usan truncate + min-w-0 + flex-shrink-0
- [x] ATS Kanban: ya usa `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` (mobile-first)
- [x] `InternshipCard`: `pr-16` protege overlap + footer `flex-wrap` + truncate responsive
- [x] `CandidateCard`: CV link con padding expandido para touch target

---

## Fase 3 — Módulos internos ✅

- [x] `/perfil`: grids ya `grid-cols-1 sm:grid-cols-2`, padding card `px-5 sm:px-8`, H1 fluido
- [x] Calendar: `CalendarGrid` ya usa `grid-cols-7` con `w-9 h-9` (36px), padding `p-3 sm:p-5`
- [x] `/admin/empresas`: H1 fluido 32→52px, padding `py-6 sm:py-10 md:py-14`

---

## Fase 4 — Pulido ✅

- [x] Typography scale: H1 fluidos aplicados en dashboards y admin (clamp o stepped)
- [x] Spacing consistency: paddings `px-5 sm:px-8`, `py-6 sm:py-10`
- [x] Radios: `rounded-[20px] sm:rounded-[24px]` en cards auth (login, registro, forgot, reset) y cards grandes
- [x] Auth forms: padding `p-5 sm:p-7/8` para evitar gutters enormes en mobile

---

## Fase 5 — QA fixes iPhone SE 375×667

QA real del usuario en iPhone SE. 9 issues detectados, agrupados por tipo.

### Decisiones tomadas (2026-04-22)

- **Drawer logeado en páginas públicas** → **Opción A**: cuando hay sesión, el drawer del `PublicNav` muestra SOLO los links del dashboard según rol + "Cerrar sesión". Los links públicos (Producto, Para empresas) desaparecen — son funnel de conversión para anónimos.
- **Notificaciones**: crear endpoint real `DELETE /api/notifications/[id]` en vez de dismiss local. No mentir con botones que no persisten.
- **Nomenclatura**: unificar en **"Prácticas"** en todo el sitio. "Explorar" queda deprecado.

### Críticos funcionales

- [x] **5.1 Chat mobile input sticky**: root fix — era altura de la página inbox. Cambié `min-h-[calc(100vh-96px)]` por `h-[calc(100dvh-80px)] md:h-[calc(100vh-96px)]` y `py-0 md:py-6` para que el contenedor no crezca más allá del viewport. El MessageInput ya estaba fuera del scroll area; el bug era que toda la página era el "scroll" en mobile.
  - **Archivos**: `src/app/(dashboard)/dashboard/estudiante/inbox/page.tsx`, `src/app/(dashboard)/dashboard/empresa/inbox/page.tsx`
- [x] **5.2 Modal "Mis postulaciones" responsive**: bottom sheet en mobile (`items-end`), `max-h-[calc(100dvh-80px)]` para respetar navbar sticky, header `sticky top-0 z-10`, X con touch target `w-11 h-11`, padding responsive `px-4 sm:px-6`.
  - **Archivo**: `src/app/(dashboard)/dashboard/estudiante/page.tsx`
- [x] **5.3 Panel notificaciones responsive + DELETE real**:
  - Endpoint creado: `src/app/api/notifications/[id]/route.ts` (DELETE con `deleteMany` filtrado por userId para evitar que un user borre notifs ajenas).
  - Hook `useNotifications` extendido con `deleteNotification`: update optimista con rollback si falla la request.
  - Panel layout: `max-h-[60dvh]` en mobile, `w-[calc(100vw-1.5rem)]`, botón X por notificación (siempre visible en mobile, `group-hover` en desktop).
  - **Archivos**: `src/app/api/notifications/[id]/route.ts` (nuevo), `src/hooks/useNotifications.ts`, `src/app/(dashboard)/layout.tsx`

### Navegación / IA

- [x] **5.4 Drawer logeado (Opción A)**: `PublicNav` usa `useSession`, función `dashboardLinksFor(role)` construye links por rol (STUDENT: Dashboard/Prácticas/Mensajes/Perfil; COMPANY: +Calendario; ADMIN: +Panel admin). Drawer mobile muestra user info (avatar + nombre + rol) + links dashboard + "Cerrar sesión" con `signOut`. Public links se ocultan cuando hay sesión.
  - **Archivo**: `src/components/layout/PublicNav.tsx`
- [x] **5.5 Nomenclatura "Prácticas"**: dos reemplazos — footer landing y navbar dashboard. Los `"Explorá"` en copy/UX se dejaron (son imperativos correctos, no labels de nav).
  - **Archivos**: `src/app/page.tsx:989`, `src/app/(dashboard)/layout.tsx:115`
- [x] **5.6 Botón volver al dashboard en admin**: link visible en header admin + entrada en dropdown user. Badge "Admin" oculto en `<sm:` para dar espacio al botón volver.
  - **Archivo**: `src/app/(admin)/layout.tsx`

### Layout / overflow

- [x] **5.7 Detalle práctica texto desborda**: `break-words [overflow-wrap:anywhere]` en H1 título, descripción y items de requirements. Skills con `break-all max-w-full`.
  - **Archivo**: `src/app/practicas/[id]/page.tsx`
- [x] **5.8 ATS valores y % descuadrados**:
  - `ModuleCard`: layout de 2 filas en mobile — fila 1 (icon + label + actions), fila 2 (slider ocupa ancho completo + weight number). Grip oculto en mobile.
  - Header ATS: botones "Candidatos" / "Guardar" se apilan en mobile (`flex-col sm:flex-row`), texto corto "Candidatos" en mobile.
  - `ScoreBreakdownModal`: bottom sheet en mobile + `max-h-[calc(100dvh-80px)]` + header sticky + X con touch target 44px.
  - **Archivos**: `src/components/ats/ModuleCard.tsx`, `src/components/ats/ScoreBreakdownModal.tsx`, `src/app/(dashboard)/dashboard/empresa/ats/[jobId]/page.tsx`

### Quick wins

- [x] **5.9 Dashboard estudiante — limitar a 6 recomendaciones**: variable `visibleRecommendations = recommendations.slice(0, 6)` usada consistentemente en render, tab counter y mensaje del hero.
  - **Archivo**: `src/app/(dashboard)/dashboard/estudiante/page.tsx`

### Round 2 — QA segundo pase

- [x] **5.10 Notificaciones más compacto**: panel reducido a `max-w-[300px]`, altura `max-h-[360px]`, padding header `px-3.5 py-2.5`, items más chicos (`px-3.5 py-2.5`, `text-[12px]` título, `line-clamp-2` en body), botón X a `w-6 h-6`.
  - **Archivo**: `src/app/(dashboard)/layout.tsx`
- [x] **5.11 PublicNav espejo al dashboard drawer**:
  - Perfil **sacado** del nav, movido al footer como "Editar perfil" (paridad con dashboard drawer).
  - Admin button ahora **negro** `bg-[#0A0909] text-white` (no naranja), al final del nav list con `mt-2`.
  - User info block mantiene estructura idéntica (avatar + nombre + rol + email).
  - Footer: "Editar perfil" + "Cerrar sesión" (paridad con dashboard).
  - **Archivo**: `src/components/layout/PublicNav.tsx`
- [x] **5.12 ATS ranking cards en mobile**: `md:hidden` renderiza cards (una por candidato) con stats en badges (Pipeline + ATS + Match), acciones en fila con `flex-wrap`. `hidden md:block` mantiene la tabla original. H1 fluido `text-[28px] sm:text-[38px]`.
  - **Archivo**: `src/app/(dashboard)/dashboard/empresa/candidatos/[jobId]/page.tsx`

### Round 3 — segundo segundo pase

- [x] **5.13 Panel notificaciones `fixed` en mobile**: el bug "texto fuera de pantalla hacia la izquierda" era posicional. El panel usaba `absolute right-0` del bellRef; en iPhone SE el bell no está al borde derecho (el avatar está después), entonces un panel de 300px se extendía ~40px fuera del viewport por la izquierda. Fix: `fixed top-[76px] right-3` en mobile (debajo del navbar, 12px de margen derecho), `md:absolute md:top-full md:right-0 md:mt-2` en desktop. Ancho `w-[calc(100vw-1.5rem)] max-w-[300px]` garantiza que siempre entre. Agregado `break-words` al title para palabras largas.
  - **Archivo**: `src/app/(dashboard)/layout.tsx`
- [x] **5.14 ATS ranking dentro del módulo**: segunda tabla de ranking en `/ats/[jobId]` (no era la misma que `/candidatos/[jobId]`). Aplicado el patrón cards/tabla: `md:hidden divide-y` + `hidden md:table`. Cards simples (sin acciones, click → ScoreBreakdownModal).
  - **Archivo**: `src/app/(dashboard)/dashboard/empresa/ats/[jobId]/page.tsx`

### Orden de ejecución

1. Críticos funcionales (5.1, 5.2, 5.3) — bloqueantes de uso real
2. Nav logeado + nomenclatura (5.4, 5.5) — congruencia de IA
3. Admin back button (5.6) — quick nav fix
4. Overflow (5.7, 5.8) — rotos visuales
5. Quick wins (5.9)

Al terminar: usuario levanta `pnpm dev` y vuelve a probar a 375px antes del commit.

---

## Reglas de trabajo

1. **No hacer commits** hasta que el usuario lo pida explícitamente
2. **No construir** después de cambios (regla global del usuario)
3. Cada fase grande: pausar y pedir aprobación antes de seguir
4. Probar mentalmente a **375px** antes que a 320px
5. Mantener el design system Warm Tech intacto
6. Actualizar este `.md` marcando `[x]` a medida que se completa
