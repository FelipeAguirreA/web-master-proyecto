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

## Paso 8: Rediseño Visual con Stitch — Landing Page

**Prompt para la IA:**

Rediseñar `src/app/page.tsx` para que coincida con el diseño Stitch de la Landing Page.

Navbar:

- Logo PractiX en `text-2xl font-black tracking-tighter`, igual que el dashboard
- Links: Explorar prácticas (apunta a /practicas), Recursos, Precios
- Botones: Login como texto y Contacto como botón naranja (`accent-500`)
- Mostrar link de Admin si el usuario es el ADMIN_EMAIL
- Glassmorphism: `bg-white/80 backdrop-blur-md`

Hero — split layout de dos columnas:

- Columna izquierda: badge IA, titular grande, subtítulo, dos botones: Soy Estudiante (naranja sólido, `/login?role=student`) y Soy Empresa (outline blanco, `/login?role=company`)
- Columna derecha: tarjeta mock UI con tres cards de match (98%, 94%, 89%) y dos badges flotantes ("CV analizado en 3 segundos" y "+200 prácticas")
- Fondo con gradiente cálido: `from-[#faf8f5] via-[#fef3e8] to-[#fde8cc]`

Sección Cómo funciona:

- Cards con número de paso grande en esquina superior derecha (01, 02, 03)
- Fondo `bg-[#faf8f5]` con hover shadow
- Ícono en box naranja (`bg-orange-100`)

Sección Para quién:

- Dos cards (Estudiantes / Empresas) con lista de features y link al pie de cada una
- Checks con círculos de color en lugar de texto plano

CTA final:

- Card oscura `bg-gray-900` redondeada con decorador naranja borroso
- Botón naranja "Empezar gratis"

Footer:

- Tres columnas: logo | links (Explorar, Cómo funciona, Iniciar sesión) | copyright

---

## Paso 9: Rediseño Visual con Stitch — Dashboard Layout

**Prompt para la IA:**

Rediseñar `src/app/(dashboard)/layout.tsx` para que coincida con el diseño Stitch.

Navbar:

- Fondo `bg-[#f9f9ff]/80 backdrop-blur-xl`, altura `h-20`
- Logo en `font-black text-2xl tracking-tighter`
- Links de navegación con estado activo usando `usePathname`: Dashboard y Explorar prácticas
- Link activo: `text-brand-700 border-b-2 border-brand-700`
- Link inactivo: `text-gray-400 hover:text-gray-700`
- Ícono de campana (`Bell`) sin funcionalidad
- Separador vertical antes del bloque de usuario
- Bloque de usuario: nombre en negrita + badge de rol (`ESTUDIANTE` / `EMPRESA`) en `text-[10px] uppercase tracking-widest` + avatar (imagen de Google o inicial en círculo)
- Botón "Salir" como texto minimalista

Fondo general de la app en `bg-[#f9f9ff]`

---

## Paso 10: Rediseño Visual con Stitch — Dashboard Estudiante

**Prompt para la IA:**

Rediseñar `src/app/(dashboard)/dashboard/estudiante/page.tsx` manteniendo toda la lógica existente.

Sección de bienvenida:

- Titular en `text-5xl font-extrabold tracking-tighter`
- Subtítulo dinámico: muestra cantidad de recomendaciones o invita a subir CV
- Badge ámbar "Perfil X% completado" con ícono `Star`

Banner de CV (sin CV subido):

- Fondo `bg-brand-50`, decorador circular borroso en esquina
- Ícono en box brand, texto descriptivo, botón primario a la derecha
- Error de upload debajo del botón

Banner de CV (ya subido):

- Fondo verde, ícono check, links de Actualizar y Eliminar CV

Tabs:

- Estilo underline con `border-b-2 border-brand-600` en la activa
- Tabs: Recomendadas (con ícono Sparkles) y Mis postulaciones (con ícono FileText)

Grid de recomendaciones:

- Dos columnas usando el componente `InternshipCard`

Sección Actividad Reciente:

- Aparece en el tab Recomendadas cuando ya hay postulaciones
- Tabla con avatar de letra, título, empresa, columna de compatibilidad y columna de estado
- Badge de estado con color según tipo (pendiente, revisión, aceptada, rechazada)
- Ícono kebab (`MoreVertical`) al final de cada fila
- Link "Ver todo el historial" que cambia al tab de postulaciones

Tab Mis postulaciones:

- Misma tabla que Actividad Reciente pero con todas las postulaciones
- Click en fila abre el modal de detalle existente

---

## Paso 11: Rediseño Visual con Stitch — Dashboard Empresa

**Prompt para la IA:**

Rediseñar `src/app/(dashboard)/dashboard/empresa/page.tsx` manteniendo toda la lógica existente.

Banner de estado:

- PENDING: barra ámbar sólida full-width con ícono de alerta
- REJECTED: barra roja sólida

Header:

- Titular `text-4xl font-extrabold tracking-tighter` + subtítulo
- Botón "+ Nueva práctica" con shadow a la derecha

Layout split `lg:grid-cols-3`:

- Izquierda (2 columnas): lista de prácticas como tabla
- Derecha (1 columna): panel de postulantes siempre visible (no modal)

Filas de prácticas:

- Ícono `Briefcase` en box brand + título + meta compacta (modalidad, área, duración)
- Borde izquierdo activo `border-l-4 border-brand-600` al seleccionar
- Botones: Postulantes (cambia a azul sólido cuando seleccionado), Completada, ícono papelera

Panel derecho de postulantes:

- Header con nombre de la práctica seleccionada y contador total
- Estado vacío con mensaje guía
- Tarjetas de candidato: avatar (imagen o inicial), nombre, email, badge de match ámbar, badge de estado, botones Aprobar / Rechazar / Ver CV / Emails de notificación
- Link "Ver todos los postulantes" al pie

Modales existentes (detalle práctica, crear práctica, confirmar eliminación) conservados con mejoras visuales menores: inputs con `rounded-xl`, labels en `uppercase tracking-widest`.

---

## Paso 12: Rediseño Visual con Stitch — Listado de Prácticas

**Prompt para la IA:**

Rediseñar `src/app/practicas/page.tsx` manteniendo toda la lógica existente.

Navbar:

- Mismo estilo glassmorphism del dashboard layout
- Links: Explorar prácticas (activo con underline) sin el link secundario de Prácticas
- Botón session-aware: "Mi Dashboard" si hay sesión, "Explorar →" si no

Hero banner:

- Fondo `from-[#f9f9ff] via-[#f0f3ff] to-[#e7eefe]` con decorador borroso
- Titular `text-5xl font-extrabold tracking-tighter`
- Subtítulo diferente si hay sesión (menciona recomendaciones) o no

Filtros:

- Inputs con `rounded-xl bg-gray-50` y foco con `border-brand-300 bg-white`
- Botón adicional "Filtros" con ícono `SlidersHorizontal`

Skeleton de carga:

- Actualizado para reflejar el nuevo layout de InternshipCard con avatar

Paginación:

- Botones con `rounded-xl`, página activa con `shadow-sm shadow-brand-600/25`

---

## Paso 13: Rediseño Visual con Stitch — InternshipCard

**Prompt para la IA:**

Rediseñar `src/components/ui/InternshipCard.tsx`.

Estructura:

- Avatar de empresa: cuadrado `w-14 h-14 rounded-xl` con inicial o logo si existe
- Header: avatar + título (`font-extrabold`) + empresa, con badge de match IA a la derecha (`bg-amber-100 text-amber-700`, ícono `Sparkles`, texto "X% Match IA")
- Descripción: `line-clamp-2 text-sm text-gray-500`
- Skills: hasta 4 tags con `bg-gray-100 text-gray-600`
- Footer (separado por `border-t`): ubicación con `MapPin`, duración con `Clock`, modalidad con color propio, y "Ver detalles →" que anima el gap al hover

Colores de modalidad:

- Remoto: `bg-green-50 text-green-700`
- Presencial: `bg-blue-50 text-blue-700`
- Híbrido: `bg-purple-50 text-purple-700`

Hover del card: `hover:shadow-xl hover:shadow-indigo-500/5`

---

## Paso 14: Rediseño Visual con Stitch — Login

**Prompt para la IA:**

Rediseñar `src/app/(auth)/login/page.tsx` manteniendo toda la lógica existente.

Fondo: `bg-[#eeeef8]` (lavanda claro) con `relative` para posicionar el link de volver.

Link "← Volver al inicio":

- Posición `absolute top-6 left-6`
- Ícono `ArrowLeft` + texto "Volver al inicio"
- Link a `/`

Logo + subtítulo "Iniciar sesión" centrados

Toggle único Soy Estudiante / Soy Empresa:

- Pill con fondo `bg-gray-100` y opción activa `bg-brand-600 text-white shadow-sm`
- Controla si se muestra el flujo de estudiante o empresa

Flujo estudiante:

- Botón "Continuar con Google" con ícono Google SVG y `cursor-pointer`
- Divider "o" entre el botón y los campos
- Campos email/password deshabilitados visualmente (`opacity-40 pointer-events-none`) — comunicar que el login es solo con Google
- Sin link "¿No tenés cuenta? Registrate" ya que el registro se dispara automáticamente vía Google

Flujo empresa:

- Tabs secundarios Iniciar sesión / Crear cuenta con mismo estilo pill
- Formulario de login con labels `text-[10px] uppercase tracking-widest`
- "Olvidé mi contraseña" debajo del input de contraseña (no al lado del label)
- Formulario de registro completo con strength bar de contraseña

Inputs: `rounded-xl bg-gray-50 border-gray-200 focus:bg-white`

Footer minimalista con copyright y links de Privacidad, Términos, Ayuda

---

## Paso 15: Rediseño Visual con Stitch — Registro

**Prompt para la IA:**

Rediseñar `src/app/(auth)/registro/page.tsx` manteniendo toda la lógica existente.

Fondo: `bg-[#eeeef8]` con decoradores circulares borrosos en esquinas opuestas (`bg-brand-100/30` arriba-izquierda, `bg-accent-400/10` abajo-derecha).

Logo + subtítulo "Intelligence for Professional Growth" centrados.

Indicador de 3 pasos:

- Paso 1 "Tu cuenta" → gris (ya completado vía Google)
- Paso 2 "Tu perfil" → azul activo con shadow (`bg-brand-600 shadow-brand-600/25`)
- Paso 3 "Listo" → gris claro
- Conectados con líneas horizontales

Card blanca `rounded-2xl`:

- Titular "Completá tu perfil" + subtítulo explicativo
- Label "Nombre completo" con dos inputs en grid (nombre y apellido)
- Selector de rol visual con dos cards (Soy Estudiante / Soy Empresa) con íconos emoji, borde `border-2` activo en brand, doble función como selector de tipo de documento
- Input de documento según selección
- Teléfono con selector de país `bg-gray-50` y input al lado

Botón "Continuar →" en brand
Link "¿Ya tenés una cuenta? Iniciar sesión" debajo del botón

Caja "PractiX Insight" debajo del card:

- Fondo `bg-amber-50 border-amber-200`
- Ícono `Sparkles` en box ámbar
- Título en `uppercase tracking-widest text-amber-700`
- Descripción del beneficio de completar el perfil

Footer minimalista con copyright y links

---

## Paso 16: Verificación del Rediseño Visual

```bash
pnpm dev

# Landing
# ✅ Hero split layout: texto izquierda, mock UI derecha
# ✅ Botones Soy Estudiante y Soy Empresa en hero
# ✅ Fondo con gradiente cálido naranja/crema
# ✅ Logo PractiX mismo tamaño en landing y dashboard
# ✅ Link "Explorar prácticas" visible para usuarios no autenticados

# Login
# ✅ Fondo lavanda, flecha "← Volver al inicio" top-left
# ✅ Toggle Soy Estudiante / Soy Empresa funcional
# ✅ Botón Google con cursor-pointer
# ✅ Campos email/password deshabilitados para estudiante
# ✅ "Olvidé mi contraseña" debajo del input de contraseña
# ✅ Sin "¿No tenés cuenta? Registrate" en tab estudiante

# Registro
# ✅ Indicador de 3 pasos con paso 2 activo
# ✅ Cards de rol (Soy Estudiante / Soy Empresa) con íconos
# ✅ Caja PractiX Insight al pie del card

# Dashboard layout
# ✅ Navbar h-20 con glassmorphism
# ✅ Links Dashboard y Explorar prácticas con estado activo por pathname
# ✅ Badge de rol del usuario (ESTUDIANTE / EMPRESA)
# ✅ Campana de notificaciones

# Dashboard estudiante
# ✅ Titular grande con greeting y contador de recomendaciones
# ✅ Badge "Perfil X% completado"
# ✅ Banner de CV con diseño Stitch
# ✅ Tabs con underline activo
# ✅ Sección Actividad Reciente con tabla y estados coloreados

# Dashboard empresa
# ✅ Split layout: lista izquierda + panel postulantes siempre visible
# ✅ Banner de estado ámbar/rojo full-width
# ✅ Fila seleccionada con borde izquierdo azul
# ✅ Botones Aprobar/Rechazar en panel derecho

# Listado de prácticas
# ✅ Hero banner con gradiente y titular grande
# ✅ Filtros con inputs redondeados
# ✅ Solo "Explorar prácticas" en navbar (sin link duplicado)

# InternshipCard
# ✅ Avatar de empresa con inicial o logo
# ✅ Badge "X% Match IA" en ámbar con ícono sparkle
# ✅ Descripción line-clamp-2 visible
# ✅ Skills hasta 4 en gris
# ✅ Modalidad con color: verde/azul/violeta
# ✅ "Ver detalles →" anima gap al hover
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
- ✅ Landing Page rediseñada con hero split layout, gradiente cálido y mock UI
- ✅ Dashboard layout con glassmorphism, campana, badge de rol y nav activo por pathname
- ✅ Dashboard estudiante con greeting grande, badge de perfil, tabs underline y Actividad Reciente
- ✅ Dashboard empresa con split layout y panel de postulantes siempre visible
- ✅ Listado de prácticas con hero banner y filtros rediseñados
- ✅ InternshipCard con avatar, badge Match IA, descripción, skills y modalidad con color
- ✅ Login con fondo lavanda, toggle de rol, Google con cursor-pointer, "Volver al inicio"
- ✅ Registro con indicador de 3 pasos y caja PractiX Insight
