# Módulo 10: Dashboard Empresa

## Resultado Final
Dashboard empresa con creación de prácticas y panel de postulantes.

---

## Paso 1: Dashboard de Empresa

**Prompt para la IA:**
```
Crea la página de dashboard para empresas en PractiX.

Ubicación: src/app/(dashboard)/empresa/page.tsx

'use client'. Usa useSession.
API calls al mismo servidor: fetch('/api/internships'), fetch('/api/applications/internship/...')

Estado:
- internships: Internship[]
- showForm: boolean (modal de creación)
- selectedInternship: string | null (para ver postulantes)
- applicants: Application[]
- form: { title, description, area, location, modality, duration, requirements, skills }
  (requirements y skills como strings, se convierten a arrays al enviar)

Constantes:
AREAS: ['Ingeniería', 'Marketing', 'Diseño', 'Datos', 'Finanzas', 'RRHH', 'Legal']

useEffect: cargar mis prácticas (la API retorna todas, filtrar las del usuario logueado
o simplemente mostrar todas ya que la empresa verá las de su empresa)

Función loadInternships():
- fetch('/api/internships')
- Parsear → setInternships(data.internships)

Función handleCreate(e: FormEvent):
- preventDefault
- Convertir requirements y skills de "a, b, c" a ["a", "b", "c"]
  (split por coma, trim, filter vacíos)
- POST /api/internships con el body
- Al éxito: cerrar modal, limpiar form, recargar lista

Función viewApplicants(internshipId):
- setSelectedInternship(id)
- fetch('/api/applications/internship/' + id)
- setApplicants(data)

Layout (max-w-6xl mx-auto px-6 py-10):

1. HEADER (flex justify-between mb-8):
   - "Panel de Empresa" (text-2xl font-bold) + subtítulo
   - Botón "Nueva práctica" (bg-brand-600, ícono Plus)

2. MODAL DE CREACIÓN (showForm=true):
   - Overlay: fixed inset-0 bg-black/40 z-50 flex items-center justify-center
   - Card: bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6
   - Header: "Crear práctica" + botón X
   - Formulario space-y-4:
     - Título (input text, required)
     - Descripción (textarea 4 rows, required)
     - Grid 2 cols: Área (select AREAS) + Modalidad (select 3 opciones)
     - Grid 2 cols: Ubicación (input text) + Duración (input text, "3 meses")
     - Skills requeridas (input, placeholder "React, TypeScript, Node.js")
     - Requisitos (input, placeholder "Estudiante Ing. Informática, 4to año+")
   - Submit: "Publicar práctica" (w-full bg-brand-600)
   - Todos los inputs: border-gray-200 rounded-lg text-sm focus:border-brand-400

3. LISTA DE PRÁCTICAS:
   Sin prácticas → empty state (ícono Briefcase, "Aún no has publicado prácticas")
   
   Con prácticas → space-y-4:
   Cada item (bg-white rounded-xl border p-5 flex items-center gap-4):
     - Título (font-medium truncate) + "area · location" (text-sm text-gray-500)
     - Botón "Ver postulantes" (text-brand-600, ícono Users)

4. PANEL DE POSTULANTES (selectedInternship != null):
   - Overlay: fixed inset-0 bg-black/40 z-50 flex justify-end
   - Panel: bg-white w-full max-w-md h-full overflow-y-auto p-6
   - Header: "Postulantes" + botón X (setSelectedInternship(null))
   
   Sin postulantes → "Sin postulaciones aún"
   
   Con postulantes → space-y-3:
   Cada card (border rounded-lg p-4):
     - Avatar: inicial del nombre en circulo w-8 h-8 bg-brand-100 text-brand-700
     - Nombre + email
     - matchScore badge si existe (bg-amber-50 text-amber-700)
     - Link "Ver CV →" si student.studentProfile.cvUrl (target _blank)

Íconos: Plus, Users, Briefcase, X de lucide-react.
```

---

## Paso 2: Manejo de Rol en Login

**Prompt para la IA:**
```
Hay un detalle importante: cuando un usuario se registra via Google OAuth,
NextAuth siempre crea un STUDENT por default.

Para poder probar el dashboard de empresa, necesitamos una forma de 
cambiar el rol.

Opción simple para el MVP: 
Crea un API route que permita cambiar el rol del usuario actual.

Ubicación: src/app/api/users/role/route.ts

PATCH /api/users/role:
- Requiere autenticación
- Body: { role: 'STUDENT' | 'COMPANY' }
- Si cambia a COMPANY y no tiene CompanyProfile → crear uno
- Si cambia a STUDENT y no tiene StudentProfile → crear uno
- Actualizar user.role en DB
- Retornar usuario actualizado

NOTA: En producción esto se haría diferente (selección de rol al registrarse).
Para el MVP es suficiente.

También puedes cambiar el rol directamente en Prisma Studio si prefieres.
```

---

## Paso 3: Verificación

```bash
pnpm dev

# 1. Login con Google
# 2. Cambiar rol a COMPANY (via Prisma Studio o el endpoint)
# 3. Ir a /dashboard/empresa
# ✅ Panel vacío con botón "Nueva práctica"
# 4. Click "Nueva práctica" → llenar formulario → publicar
# ✅ Práctica aparece en la lista
# 5. Ir a /practicas con otro usuario (estudiante) → postularse
# 6. Volver como empresa → "Ver postulantes"
# ✅ Postulante visible en el panel lateral
```

---

## Checkpoint

Al final del módulo tienes:
- ✅ Dashboard empresa con lista de prácticas
- ✅ Modal de creación con formulario completo
- ✅ Panel lateral de postulantes con matchScore y CV
- ✅ Empty states
- ✅ Mecanismo para cambiar rol (MVP)
- ✅ **FRONTEND COMPLETO** (falta conectar matching IA) 🎉
