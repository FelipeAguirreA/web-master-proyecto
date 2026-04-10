# Prompt de Contexto del Proyecto

> **Usa este prompt al inicio de cada sesión con la IA en tu IDE**

---

## El Prompt

```
Vamos a construir juntos una plataforma de prácticas laborales llamada "PractiX".

SOBRE EL PROYECTO:
- Portal web donde estudiantes encuentran prácticas laborales y empresas las publican
- Sistema de matching predictivo con IA que analiza CVs y recomienda oportunidades
- Full-stack UNIFICADO en Next.js 14 (App Router)

STACK TÉCNICO:
- Next.js 14 (App Router) → páginas + API routes en un solo proyecto
- TailwindCSS para estilos
- Prisma ORM + PostgreSQL en Supabase
- NextAuth.js para autenticación con Google OAuth
- Supabase Storage para CVs
- HuggingFace Inference API para embeddings (matching IA)
- Brevo para emails transaccionales
- Deploy: Vercel (un solo deploy)

ARQUITECTURA DE CARPETAS (Clean Architecture):

src/app/              → Páginas (UI) + API routes (endpoints)
src/server/services/  → Lógica de negocio PURA (no depende de Next.js)
src/server/lib/       → Infraestructura (DB, storage, IA, email)
src/server/validators/→ Schemas de validación con Zod
src/lib/              → Compartido (auth config)
src/components/       → Componentes UI reutilizables
src/types/            → Tipos TypeScript compartidos

PRINCIPIO CLAVE:
- app/api/* solo recibe request, valida, llama al service, retorna response
- server/services/* tiene la lógica de negocio, NO importa nada de Next.js
- Si mañana quieres mover el backend a Express, copias server/ y funciona

ROLES DE USUARIO:
- STUDENT: busca prácticas, sube CV, se postula
- COMPANY: publica prácticas, ve postulantes rankeados

REGLAS:
- Validación con Zod en todos los endpoints
- NextAuth para proteger rutas (getServerSession en API routes)
- Manejo de errores consistente con NextResponse
- TypeScript estricto

METODOLOGÍA: SDD + TDD
- Antes de cada service, se escribe la especificación (SDD)
- Los tests se escriben ANTES de la implementación (TDD)
- Flujo: Spec → Tests (fallan) → Implementación (tests pasan) → E2E al final
- Los unit tests van en el mismo módulo que el service, NO al final

MI ROL:
- Te doy los REQUISITOS de cada paso
- Tú generas specs, tests, y código en ese orden
- Yo ejecuto, verifico, y continuamos

TU ROL:
- Cuando te pida un service: primero spec, luego tests, luego implementación
- Genera SOLO lo que te pida en cada paso
- Sigue las convenciones del proyecto (clean architecture)
- Si algo no está claro, pregunta antes de generar

¿Entendido? Cuando confirmes, comenzamos.
```

---

## Versión Corta (para recordar en medio de la sesión)

```
Recuerda:
- Proyecto: PractiX (prácticas laborales con matching IA)
- Full-stack unificado en Next.js 14 (App Router)
- Clean architecture: app/api/* → server/services/* → server/lib/*
- Validación con Zod, auth con NextAuth
- Solo genera lo que te pido
```

---

## Para Retomar una Sesión

```
Continuamos con el proyecto "PractiX".

Estado actual:
- Módulo [X] completado
- Último archivo creado: [nombre]
- App corriendo en http://localhost:3000

Vamos a continuar con [siguiente paso del módulo].

Recuerda:
- Next.js 14 full-stack unificado
- Clean architecture: app/api/* → server/services/* → server/lib/*
- Validación Zod, auth NextAuth
- Solo genera lo que te pido
```
