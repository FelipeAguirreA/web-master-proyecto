# Módulo 9: Dashboard Estudiante

## Resultado Final
Dashboard con perfil, subida de CV, recomendaciones IA y mis postulaciones.

---

## Paso 1: Dashboard del Estudiante

**Prompt para la IA:**
```
Crea la página de dashboard para estudiantes en PractiX.

Ubicación: src/app/(dashboard)/dashboard/estudiante/page.tsx

'use client'. Usa useSession de next-auth/react.

Las llamadas API van al mismo servidor:
- fetch('/api/users/me')
- fetch('/api/applications/my')
- fetch('/api/matching/recommendations')

Estado:
- user: User | null
- recommendations: Internship[]
- applications: Application[]
- uploading: boolean
- tab: 'recommendations' | 'applications'

useEffect (cuando session existe):
- Cargar /api/users/me → setUser
- Cargar /api/applications/my → setApplications
- Cargar /api/matching/recommendations → setRecommendations
  (este endpoint no existe aún, hacer catch silencioso con [])

Función handleCVUpload(e: ChangeEvent<HTMLInputElement>):
- Obtener file de e.target.files[0]
- Crear FormData, append('cv', file)
- fetch('/api/matching/upload-cv', { method: 'POST', body: formData })
  (NO poner Content-Type, el browser lo setea)
- Al éxito: recargar recomendaciones y user
- setUploading false en finally

Configuración de estados de postulación:
const statusConfig = {
  PENDING:  { label: 'Pendiente',   icon: Clock,       color: 'text-amber-600 bg-amber-50' },
  REVIEWED: { label: 'En revisión', icon: FileText,    color: 'text-blue-600 bg-blue-50' },
  ACCEPTED: { label: 'Aceptada',    icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  REJECTED: { label: 'Rechazada',   icon: XCircle,     color: 'text-red-600 bg-red-50' },
}

Layout (max-w-6xl mx-auto px-6 py-10):

1. HEADER:
   - "Hola, {nombre} 👋" (text-2xl font-bold)
   - "Encuentra prácticas que se ajusten a tu perfil" (text-gray-500 text-sm)

2. SECCIÓN CV (condicional, mb-8):

   Si NO tiene CV (user?.studentProfile?.cvUrl es null/undefined):
   - Banner bg-brand-50 border border-brand-100 rounded-xl p-6:
     - Flex con ícono Upload en cuadro w-12 h-12 bg-brand-100 rounded-xl
     - Título: "Sube tu CV para activar el matching IA" (font-semibold text-brand-900)
     - Descripción (text-sm text-brand-700)
     - Label como botón (bg-brand-600 text-white rounded-lg cursor-pointer):
       - Texto: uploading ? "Procesando..." : "Subir CV (PDF o Word)"
       - Input hidden: type=file accept=".pdf,.doc,.docx" onChange=handleCVUpload

   Si YA tiene CV:
   - Banner bg-green-50 border border-green-100 rounded-xl p-4:
     - Flex con CheckCircle verde
     - "CV procesado correctamente" + "El matching IA está activo"
     - Label "Actualizar CV" con input hidden para resubir

3. TABS (mb-8):
   - Container: flex gap-1 bg-gray-100 rounded-lg p-1 w-fit
   - Tab "Recomendadas ({count})": ícono Sparkles inline
   - Tab "Mis postulaciones ({count})": ícono FileText inline
   - Tab activa: bg-white shadow-sm text-gray-900
   - Tab inactiva: text-gray-500

4. TAB RECOMENDADAS:
   Con datos → grid md:grid-cols-2 gap-4 de InternshipCard
   Sin datos → empty state centrado con ícono Sparkles
   "Sube tu CV para ver recomendaciones"

5. TAB POSTULACIONES:
   Con datos → lista vertical space-y-3:
   Cada item (bg-white rounded-xl border p-5 flex items-center gap-4):
     - Título práctica (font-medium truncate) + empresa (text-sm text-gray-500)
     - Badge matchScore si existe ("{score}% match", bg-amber-50 text-amber-700)
     - Badge estado con ícono y color del statusConfig
   Sin datos → empty state "Aún no tienes postulaciones"

Importar InternshipCard de @/components/ui/InternshipCard.
Íconos de lucide-react: Upload, Sparkles, FileText, Clock, CheckCircle, XCircle.
```

---

## Paso 2: Verificación

```bash
pnpm dev

# 1. Login como estudiante
# 2. Ir a /dashboard/estudiante
# ✅ Muestra nombre del usuario
# ✅ Banner "Sube tu CV" aparece (CV aún no subido)
# ✅ Tab postulaciones vacía
# 3. Ir a /practicas → postularse a una práctica
# 4. Volver a dashboard
# ✅ Postulación aparece en la tab con estado "Pendiente"
# 5. La subida de CV se probará completa en módulo 11
```

---

## Checkpoint

Al final del módulo tienes:
- ✅ Dashboard estudiante con saludo personalizado
- ✅ Sección upload CV (UI lista, endpoint viene en módulo 11)
- ✅ Tabs: Recomendadas / Mis postulaciones
- ✅ Lista de postulaciones con estados coloreados
- ✅ Empty states descriptivos
- ✅ InternshipCard reutilizado para recomendaciones
