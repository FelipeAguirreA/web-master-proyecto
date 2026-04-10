# Módulo 8: Listado de Prácticas con Filtros

## Resultado Final
Página pública de prácticas con filtros, búsqueda, paginación y skeletons.

---

## Paso 1: Componente InternshipCard

**Prompt para la IA:**
```
Crea un componente reutilizable InternshipCard para PractiX.

Ubicación: src/components/ui/InternshipCard.tsx

Props: { internship: Internship } (importar tipo de @/types)

Es un Link a /practicas/{internship.id}.
Hover: shadow-md + border-brand-200.

Contenido:
1. Header (flex justify-between):
   - Izquierda: title (font-semibold, group-hover:text-brand-700) 
     + company.companyName (text-sm text-gray-500)
   - Derecha: si matchScore > 0, badge con Sparkles + "{score}%"
     (bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg px-2 py-1)

2. Descripción: text-sm text-gray-600 line-clamp-2 mb-4

3. Skills: primeras 4 como chips
   (text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md)

4. Footer (flex items-center gap-4 text-xs text-gray-400):
   - MapPin + location
   - Clock + duration
   - Badge modalidad con color:
     REMOTE → "Remoto" (bg-green-50 text-green-700)
     ONSITE → "Presencial" (bg-blue-50 text-blue-700)
     HYBRID → "Híbrido" (bg-purple-50 text-purple-700)

Card: bg-white rounded-xl border border-gray-100 p-6.
Usar lucide-react (MapPin, Clock, Sparkles).
```

---

## Paso 2: Página de Listado

**Prompt para la IA:**
```
Crea la página de listado de prácticas de PractiX.

Ubicación: src/app/practicas/page.tsx

'use client'.

IMPORTANTE: esta página es PÚBLICA. Las llamadas a la API van al 
mismo servidor (Next.js), así que usa fetch('/api/internships?...') 
directamente (sin base URL externa).

Estado local:
- internships: Internship[] (inicializar vacío)
- loading: boolean (true)
- search, area, modality: strings (vacíos)
- page: number (1)
- totalPages: number (1)

Constantes:
- AREAS: ['Ingeniería', 'Marketing', 'Diseño', 'Datos', 'Finanzas', 'RRHH', 'Legal']
- MODALITIES: [{ value: '', label: 'Todas' }, { value: 'REMOTE', label: 'Remoto' },
  { value: 'ONSITE', label: 'Presencial' }, { value: 'HYBRID', label: 'Híbrido' }]

useEffect (deps: search, area, modality, page):
- Construir URLSearchParams con filtros no vacíos + page
- fetch('/api/internships?' + params)
- Parsear JSON y actualizar estado
- setLoading false en finally
- Al cambiar filtro → resetear page a 1

Layout:

1. Navbar simple:
   - Logo PractiX (Link a /)
   - Botón "Iniciar sesión" → /login

2. Container max-w-7xl mx-auto px-6 py-10:
   - Título: "Prácticas laborales" (text-3xl font-bold mb-8)

3. Barra de filtros (bg-white rounded-xl border p-4 mb-8):
   - Flex col en mobile, row en md
   - Input de búsqueda con ícono Search (flex-1):
     - pl-10 (espacio para ícono absoluto)
     - placeholder "Buscar prácticas..."
     - onChange actualiza search y resetea page
   - Select de área: "Todas las áreas" + AREAS
   - Select de modalidad: MODALITIES
   - Todos: rounded-lg border-gray-200 text-sm focus:border-brand-400

4. Resultados:
   Loading → grid de 6 skeleton cards:
     Card con bg-white rounded-xl border p-6 animate-pulse
     Divs grises simulando título, subtítulo, descripción, chips

   Sin resultados → empty state centrado:
     Ícono SlidersHorizontal grande, opacidad baja
     "No se encontraron prácticas"
     "Intenta ajustar los filtros"

   Con resultados → grid de InternshipCard:
     1 col default, 2 cols md, 3 cols lg, gap-4

5. Paginación (solo si totalPages > 1):
   - flex justify-center gap-2 mt-10
   - Botones numéricos:
     Activo: bg-brand-600 text-white
     Inactivo: bg-white border text-gray-600 hover:bg-gray-50
   - w-10 h-10 rounded-lg text-sm font-medium
```

---

## Paso 3: Página de Detalle

**Prompt para la IA:**
```
Crea la página de detalle de una práctica.

Ubicación: src/app/practicas/[id]/page.tsx

'use client'. Usa useParams para obtener el id.
Usa useSession para verificar si hay sesión activa.

Estado: internship, loading, applying, applied, error

useEffect: fetch('/api/internships/' + id)

Función handleApply:
- Si no hay session → redirect a /login
- POST /api/applications con { internshipId: id }
- Si éxito → setApplied(true)
- Si 409 → "Ya te postulaste a esta práctica"
- Si error → mostrar mensaje

Layout:

1. Breadcrumb: Link "← Prácticas" a /practicas

2. Header:
   - Título (text-3xl font-bold)
   - Nombre empresa + badges (modalidad, área)
   - Ubicación + duración

3. Grid 2 cols en lg (1 col mobile):
   Columna principal:
   - Sección "Descripción" con texto completo
   - Sección "Requisitos" como lista
   - Sección "Habilidades" como chips de skills

   Sidebar (sticky top-24):
   - Card con botón "Postularme":
     - Si no logueado: "Inicia sesión para postularte"
     - Si applied: "Ya te postulaste ✓" (verde, disabled)
     - Si applying: "Enviando..." (disabled)
     - Normal: bg-brand-600 text-white w-full
   - Info de empresa: nombre, industria, website

Loading: skeleton
Not found: mensaje de error
```

---

## Paso 4: Verificación

```bash
pnpm dev

# ✅ http://localhost:3000/practicas → carga 6 prácticas del seed
# ✅ Skeletons se muestran durante carga
# ✅ Filtrar por área funciona
# ✅ Filtrar por modalidad funciona
# ✅ Búsqueda "react" filtra correctamente
# ✅ Click en card → página de detalle
# ✅ Botón "Postularme" funciona (si logueado)
# ✅ Responsive: 1/2/3 columnas
```

---

## Checkpoint

Al final del módulo tienes:
- ✅ InternshipCard reutilizable con matchScore
- ✅ Listado con filtros (área, modalidad, búsqueda)
- ✅ Skeleton loading states
- ✅ Paginación funcional
- ✅ Página de detalle con postulación
- ✅ Manejo de estados (ya aplicó, error, loading)
