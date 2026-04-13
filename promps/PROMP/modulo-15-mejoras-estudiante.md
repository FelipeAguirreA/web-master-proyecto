# Módulo 15: Mejoras UX Estudiante

## Resultado Final

Flujo de registro guiado obligatorio para estudiantes nuevos, sesión persistente en toda la navegación, modal de detalle en postulaciones, y correcciones de compatibilidad con Next.js 16 y Zod v4.

---

## Paso 1: Compatibilidad Next.js 16

**Prompt para la IA:**

```
Actualiza PractiX para compatibilidad con Next.js 16.

Cambio 1 — middleware → proxy:
Next.js 16 deprecó la convención "middleware.ts". Renombrar:
- src/middleware.ts → src/proxy.ts
- La función exportada debe llamarse "proxy" en lugar de "middleware"
- El export const config con el matcher no cambia

Cambio 2 — params async en route handlers:
En Next.js 15.2+, los params de rutas dinámicas son Promise.
El route src/app/api/auth/[...nextauth]/route.ts debe resolverlos:

import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"
import type { NextRequest } from "next/server"

const handler = NextAuth(authOptions)

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  const params = await context.params
  return handler(req, { params })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  const params = await context.params
  return handler(req, { params })
}

Verificar que los demás routes dinámicos (internships/[id], applications/[id], etc.)
ya usen el patrón: type RouteParams = { params: Promise<{ id: string }> }
```

---

## Paso 2: Compatibilidad Zod v4

**Prompt para la IA:**

```
Audita todos los catch blocks que manejan ZodError en PractiX.

Zod v4 renombró ZodError.errors a ZodError.issues. Buscar en src/app/api/**/route.ts
cualquier uso de:
  error.errors[0]

Reemplazar por:
  const issues = error.issues ?? (error as any).errors ?? []
  const message = issues[0]?.message ?? "Datos inválidos"

Los routes que ya usan error.issues directamente en el body de respuesta
(ej: { error: "Validation error", details: error.issues }) no necesitan cambios.
```

---

## Paso 3: Registro Guiado para Estudiantes Nuevos

**Prompt para la IA:**

```
Implementa un flujo de registro obligatorio para estudiantes nuevos en PractiX.

SCHEMA — agregar a model User en prisma/schema.prisma:
  lastName  String?
  rut       String?  @unique
  phone     String?

Correr el SQL equivalente en Supabase si db:push no está disponible:
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastName" TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS rut TEXT UNIQUE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

Luego: pnpm db:generate

JWT Y SESIÓN — actualizar src/lib/auth.ts:
Agregar registrationCompleted al token y a la sesión:
- En el callback jwt: token.registrationCompleted = dbUser.role === "COMPANY" ? true : !!dbUser.rut
- En el callback session: session.user.registrationCompleted = token.registrationCompleted
- Manejar trigger === "update" para refrescar sin re-login:
  if (trigger === "update" && session?.registrationCompleted !== undefined)
    token.registrationCompleted = session.registrationCompleted

TIPOS — actualizar src/types/index.ts:
Extender Session y JWT con registrationCompleted: boolean
Agregar lastName, rut, phone opcionales a la interfaz User

VALIDACIÓN — agregar a src/server/validators/index.ts:

Función validarRUT (Módulo 11 chileno):
  - Limpiar puntos y espacios, convertir a mayúsculas
  - Regex: /^(\d{7,8})-?([0-9K])$/
  - Calcular dígito verificador con multiplicadores 2-7 en ciclo
  - Comparar con dígito entregado

Función normalizarRUT:
  - Retornar formato NNNNNNNN-V (sin puntos, con guión)

Schema registrationSchema con superRefine:
  - name: min 2 chars
  - lastName: min 2 chars
  - rut: string, validar con validarRUT si documentType === "rut"
  - documentType: enum ["rut", "passport"], default "rut"
  - phone: string, validar con regex /^\d{7,15}$/

SERVICE — agregar a src/server/services/users.service.ts:

async function completeStudentRegistration(userId, { name, lastName, rut, phone }):
  return prisma.user.update({ where: { id: userId }, data: { name, lastName, rut, phone } })

API ROUTE — crear src/app/api/users/registro/route.ts:
POST — requiere rol STUDENT:
1. requireAuth("STUDENT")
2. registrationSchema.parse(body)
3. normalizarRUT(data.rut)
4. Verificar unicidad del RUT (retornar 409 si ya existe en otro usuario)
5. completeStudentRegistration(userId, data)
6. Retornar { success: true }

PROXY — actualizar src/proxy.ts para el gate de registro:
Agregar lógica para STUDENT:
- Si !registrationCompleted y pathname no empieza con /registro → redirect /registro
- Si registrationCompleted y pathname empieza con /registro → redirect /dashboard/estudiante
- Excluir rutas /api/* del gate (la auth se maneja por route)
- Sin sesión en /registro → redirect /login

PÁGINA — crear src/app/(auth)/registro/page.tsx:
'use client'. Campos: nombre, apellidos, documento (con toggle RUT/Pasaporte), teléfono.

Toggle RUT / Pasaporte:
- RUT: formatear en tiempo real (XX.XXX.XXX-X), validar Módulo 11 client-side
- Pasaporte/DNI: alfanumérico 6-20 chars, forzar mayúsculas

Selector de país para teléfono:
- <select> con 15 países (Chile primero), formato: "Chile (+56)"
- Input número al lado, sin prefijo duplicado
- Al enviar: concatenar dialCode + number como phone

Validación client-side completa antes de llamar al servidor:
- Mostrar error en el campo específico (borde rojo + mensaje)
- Solo llamar a la API si todo es válido

Manejo de respuesta:
- Parsear JSON siempre antes de revisar res.ok (evita el catch por non-JSON)
- Si error contiene "rut" → asignar al campo documento
- Si ok: await update({ registrationCompleted: true }) → router.push('/dashboard/estudiante')

Pre-llenar nombre del formulario desde session.user.name (split por espacio).
```

---

## Paso 4: Sesión Persistente en Toda la Navegación

**Prompt para la IA:**

```
Actualiza el navbar de las páginas públicas de PractiX para mostrar
el estado real de la sesión.

1. src/app/page.tsx (Server Component):
   - Importar getAuthSession de @/lib/auth
   - Convertir a async function
   - const session = await getAuthSession()
   - Si session → botón "Mi Dashboard" → href="/dashboard/estudiante"
   - Si no → botón "Iniciar sesión" → href="/login"

2. src/app/practicas/page.tsx (Client Component):
   - Agregar: import { useSession } from "next-auth/react"
   - const { data: session } = useSession()
   - Mismo condicional: "Mi Dashboard" vs "Iniciar sesión"
```

---

## Paso 5: Modal de Detalle en Mis Postulaciones

**Prompt para la IA:**

```
Actualiza el dashboard de estudiante en PractiX para mostrar el detalle
completo de una práctica al hacer clic en una postulación.

Cambios en src/server/services/applications.service.ts:
La función getMyApplications ya incluye el internship completo.
Agregar select explícito para excluir el campo embedding (384 floats innecesarios):
  internship: {
    select: {
      id, title, description, area, location, modality,
      duration, requirements, skills, isActive, createdAt,
      company: { select: { companyName: true, logo: true } }
    }
  }

Cambios en src/app/(dashboard)/dashboard/estudiante/page.tsx:

1. Actualizar tipo ApplicationWithInternship para incluir todos los campos del internship

2. Agregar estado: const [selectedApplication, setSelectedApplication] = useState(null)

3. Convertir cada item de postulación de div a button:
   - onClick={() => setSelectedApplication(application)}
   - Agregar hover style: hover:border-brand-200 hover:shadow-sm

4. Agregar modal (fixed inset-0 z-50 backdrop-blur-sm) que muestra:
   - Header sticky: título + empresa + botón X para cerrar
   - Badge de estado (con ícono y color del statusConfig)
   - Badge de compatibilidad (% match si existe)
   - Fecha de postulación formateada en español chileno
   - Grid 2 columnas: ubicación, modalidad, área, duración
   - Descripción completa (whitespace-pre-line)
   - Lista de requisitos con bullet
   - Pills de habilidades requeridas
   - Click fuera del modal lo cierra

Íconos adicionales de lucide-react: MapPin, Briefcase, Calendar, X
```

---

## Paso 6: Correcciones de Upload CV

**Prompt para la IA:**

```
Corrige dos bugs en el procesamiento de CVs en PractiX.

Bug 1 — Bytes nulos en PDFs:
pdf-parse puede retornar texto con bytes \x00 que PostgreSQL rechaza
con "invalid byte sequence for encoding UTF8: 0x00".

En src/server/lib/cv-parser.ts, agregar función sanitizeText antes del return:
  function sanitizeText(text: string): string {
    // Elimina caracteres de control no imprimibles (preserva \t \n \r)
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim()
  }

Aplicar sanitizeText al resultado de pdf-parse y mammoth antes de retornar.

Bug 2 — Archivos .doc no soportados:
mammoth solo procesa .docx (OOXML). Los .doc (binario antiguo) tiran:
"Could not find the body element: are you sure this is a docx file?"

Solución:
- Eliminar "application/msword" de ALLOWED_TYPES en upload-cv/route.ts
- Eliminar la rama mimetype.includes("msword") de cv-parser.ts
- Actualizar accept=".pdf,.docx" en el input del dashboard
- Actualizar mensajes de error y hints a "PDF o DOCX"
```

---

## Paso 7: Verificación

```bash
pnpm dev

# 1. Nuevo estudiante
# ✅ Login con Google → redirige a /registro (no al dashboard)
# ✅ Formulario con campos nombre, apellidos, documento, teléfono
# ✅ RUT inválido → resalta campo con error específico
# ✅ Toggle RUT/Pasaporte cambia validación y placeholder
# ✅ Selector de país muestra "Chile (+56)" etc. sin bandera
# ✅ Guardar → redirige a /dashboard/estudiante sin re-login

# 2. Estudiante ya registrado
# ✅ Login → va directo al dashboard (no pasa por /registro)
# ✅ Ir a /registro manualmente → redirige al dashboard

# 3. Sesión persistente
# ✅ Desde el dashboard, click en logo PractiX → homepage muestra "Mi Dashboard"
# ✅ Click en "Explorar" → /practicas muestra "Mi Dashboard" en navbar

# 4. Modal de postulaciones
# ✅ Click en una postulación → abre modal con detalle completo
# ✅ Modal muestra descripción, requisitos, skills, fecha, estado
# ✅ Click fuera del modal o en X → cierra

# 5. Upload CV
# ✅ Subir PDF con caracteres especiales → no da error de encoding
# ✅ Intentar subir .doc → rechazado con mensaje claro
# ✅ Input solo acepta .pdf y .docx
```

---

## Checkpoint

Al final del módulo tenés:

- ✅ `proxy.ts` reemplaza `middleware.ts` (convención Next.js 16)
- ✅ Route `[...nextauth]` con `await context.params` (Next.js 16 async params)
- ✅ `ZodError.issues` en lugar de `.errors` (Zod v4)
- ✅ Campos `lastName`, `rut`, `phone` en modelo `User`
- ✅ Gate de registro en proxy: estudiantes nuevos van a `/registro` antes del dashboard
- ✅ `registrationCompleted` en JWT — gate sin consulta a DB en cada request
- ✅ Página `/registro` con validación Módulo 11, toggle RUT/Pasaporte, selector de país
- ✅ Navbar session-aware en homepage (Server Component) y `/practicas` (Client Component)
- ✅ Postulaciones clickeables con modal de detalle completo
- ✅ Sanitización de bytes nulos en texto extraído de PDFs
- ✅ Soporte `.doc` eliminado — solo PDF y DOCX
