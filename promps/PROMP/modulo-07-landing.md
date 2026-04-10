# Módulo 7: Landing Page + Layout Base

## Resultado Final
Landing page atractiva + layout de navegación + página de login.

---

## Paso 0: Activar la página de login en NextAuth

En `src/lib/auth.ts`, descomentar la línea que fue dejada pendiente en el Módulo 3:

```
pages: { signIn: "/login" }
```

Sin este paso, NextAuth sigue redirigiendo a su página default en lugar de `/login`.

---

## Paso 1: Root Layout

**Prompt para la IA:**
```
Actualiza el root layout de PractiX.

Ubicación: src/app/layout.tsx

Requisitos:
- Metadata: title "PractiX — Encuentra tu práctica ideal con IA",
  description sobre la plataforma
- HTML lang="es"
- Body: min-h-screen bg-gray-50 text-gray-900 antialiased
- Envolver children con el componente Providers (SessionProvider)
- Importar globals.css
```

---

## Paso 2: Landing Page

**Prompt para la IA:**
```
Crea la landing page de PractiX.

Ubicación: src/app/page.tsx

Server component (sin 'use client'). Usar lucide-react para íconos.

Secciones:

1. NAVBAR (fixed top, bg-white/80 backdrop-blur, border-b):
   - Logo: texto "PractiX" donde "Practi" es text-brand-700 
     y "X" es text-accent-500. font-bold text-xl tracking-tight
   - Links: "Explorar" → /practicas (text-sm text-gray-600)
   - Botón: "Iniciar sesión" → /login (bg-brand-600 text-white rounded-lg)
   - Container max-w-7xl centrado, h-16

2. HERO (pt-32 pb-20):
   - Badge: ícono Sparkles + "Matching inteligente con IA"
     (inline-flex, bg-brand-50 text-brand-700 rounded-full px-4 py-1.5 text-sm)
   - Título: text-5xl md:text-6xl font-extrabold tracking-tight
     "Encuentra la práctica [perfecta] para ti"
     ("perfecta" en text-brand-600)
   - Subtítulo: text-lg text-gray-500 max-w-2xl mx-auto
     Explica que PractiX analiza CVs con IA para conectar con prácticas
   - 2 botones CTA en flex row:
     - "Soy Estudiante" → /login?role=student
       (bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-600/25)
       con ícono ArrowRight
     - "Soy Empresa" → /login?role=company
       (bg-white border border-gray-200 rounded-xl)
       con ícono Building2

3. CÓMO FUNCIONA (py-20 bg-white):
   - Título: "¿Cómo funciona?" text-3xl font-bold text-center
   - Grid md:grid-cols-3 gap-10, max-w-5xl:
     Card 1: ícono Upload → "Sube tu CV" + descripción
     Card 2: ícono Brain → "IA analiza tu perfil" + descripción
     Card 3: ícono Sparkles → "Recibe recomendaciones" + descripción
   - Cada card: ícono en cuadro w-14 h-14 rounded-2xl bg-brand-50,
     título font-semibold, descripción text-gray-500 text-sm

4. PARA QUIÉN (py-20, grid md:grid-cols-2 gap-8, max-w-5xl):
   - Card "Para Estudiantes": ícono GraduationCap w-10 text-brand-600
     Lista con ✓: matching basado en CV, score de afinidad, alertas, 
     postulación en un click, 100% gratuito
   - Card "Para Empresas": ícono Building2 w-10 text-accent-500
     Lista con ✓: publica en minutos, candidatos rankeados, 
     dashboard de gestión, filtros, plan gratuito
   - Ambas: bg-white rounded-2xl p-8 border border-gray-100 shadow-sm

5. CTA FINAL (py-20 bg-brand-700 text-white text-center):
   - "Comienza ahora — es gratis"
   - Subtítulo en text-brand-200
   - Botón blanco: "Crear cuenta" → /login, con ícono ArrowRight

6. FOOTER (py-8 bg-gray-900 text-gray-400 text-sm text-center):
   - "© {año} PractiX. Hecho con 💙 para estudiantes."
```

---

## Paso 3: Página de Login

**Prompt para la IA:**
```
Crea la página de login de PractiX.

Ubicación: src/app/(auth)/login/page.tsx

'use client'. Usa signIn de next-auth/react. 
Lee query param 'role' con useSearchParams (default 'student').

Layout centrado verticalmente en pantalla, fondo gris claro.

1. Logo PractiX arriba (Link a /)

2. Card blanca (bg-white rounded-2xl shadow-sm border p-8, max-w-md):
   - Título dinámico:
     role=company → "Portal Empresas"
     role=student → "Bienvenido"
   - Subtítulo según rol
   - Botón "Continuar con Google":
     - Incluir SVG del logo de Google (4 colores)
     - onClick: signIn('google', { callbackUrl }) donde callbackUrl es:
       /dashboard/estudiante (si student) o /dashboard/empresa (si company)
     - Estilo: w-full flex items-center justify-center gap-3 
       bg-white border rounded-xl py-3 hover:bg-gray-50
   - Texto legal: "Al continuar aceptas términos y privacidad"

3. Link de cambio de rol debajo de la card:
   - Si company: "¿Eres estudiante? Ingresa aquí" → /login?role=student
   - Si student: "¿Eres empresa? Ingresa aquí" → /login?role=company

NOTA: Envolver el contenido que usa useSearchParams en un Suspense boundary
para evitar errores de Next.js con static rendering.
```

---

## Paso 4: Layout de Dashboard + Páginas placeholder

**Prompt para la IA:**
```
Crea un layout compartido para las páginas de dashboard.

Ubicación: src/app/(dashboard)/layout.tsx

'use client'. Usa useSession, signOut de next-auth/react y useRouter de next/navigation.

Lógica:
- Si status === 'loading' → mostrar spinner centrado
- Si status === 'unauthenticated' → useEffect + router.push('/login')
  (NO usar redirect() de next/navigation — eso es solo para server components)
- Si autenticado → mostrar layout

Layout:
1. Navbar (bg-white border-b sticky top-0 z-40):
   - Logo PractiX (Link a /)
   - Link "Explorar" → /practicas
   - Grupo derecho:
     - Nombre del usuario (text-sm)
     - Avatar: si hay image usar <img>, si no → inicial del nombre
       en círculo bg-brand-100 text-brand-700
     - Botón "Cerrar sesión" (text-sm text-gray-500 hover:text-gray-700)
       onClick: signOut({ callbackUrl: '/' })
   - Container max-w-7xl

2. Main: {children}
```

También crear páginas placeholder para que los redirects post-login funcionen:

**Prompt para la IA:**
```
Crea dos páginas placeholder mínimas:

src/app/(dashboard)/dashboard/estudiante/page.tsx
→ Server component que muestra "Dashboard Estudiante" y "Próximamente — Módulo 9"

src/app/(dashboard)/dashboard/empresa/page.tsx  
→ Server component que muestra "Dashboard Empresa" y "Próximamente — Módulo 10"

Estas se reemplazan completamente en los módulos 9 y 10.
```

---

## Paso 5: Verificación

```bash
pnpm dev

# ✅ http://localhost:3000 → Landing completa y responsive
# ✅ Click "Explorar" → /practicas (404 por ahora, OK)
# ✅ Click "Iniciar sesión" → /login
# ✅ Login con Google → redirect a /dashboard/estudiante
# ✅ Dashboard layout con navbar y nombre del usuario
# ✅ "Cerrar sesión" vuelve a landing
# ✅ Responsive en mobile
```

---

## Checkpoint

Al final del módulo tienes:
- ✅ Root layout con Providers
- ✅ Landing page completa (hero, cómo funciona, para quién, CTA, footer)
- ✅ Página de login con Google OAuth
- ✅ Dashboard layout protegido con navbar
- ✅ Navegación funcional entre páginas
