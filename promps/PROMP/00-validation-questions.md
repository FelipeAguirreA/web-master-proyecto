# Preguntas de Validación del Proyecto

> **Usa estas preguntas para verificar que la implementación está completa y correcta.**

---

## 1. Arquitectura

```
1. ¿Es un proyecto separado (front+back) o unificado?
2. ¿Dónde está la lógica de negocio?
3. ¿Dónde están los API routes?
4. ¿Podría migrar la lógica a Express sin reescribir?
5. ¿Qué librería se usa para validación de inputs?
```

| #   | Respuesta Esperada                                                    |
| --- | --------------------------------------------------------------------- |
| 1   | Unificado en Next.js 14 (App Router)                                  |
| 2   | `src/server/services/` — lógica pura, no depende de Next.js           |
| 3   | `src/app/api/` — route handlers de Next.js                            |
| 4   | Sí, `src/server/` es independiente de Next.js                         |
| 5   | Zod (schemas en `src/server/validators/`)                             |

---

## 2. Base de Datos

```
6. ¿Cuántos modelos tiene el schema de Prisma?
7. ¿Qué evita que un estudiante se postule dos veces a la misma práctica?
8. ¿Dónde se almacenan los embeddings del CV?
9. ¿Qué tipo de delete se usa en prácticas?
10. ¿Dónde está el Prisma Client singleton?
```

| #   | Respuesta Esperada                                                    |
| --- | --------------------------------------------------------------------- |
| 6   | 5: User, StudentProfile, CompanyProfile, Internship, Application      |
| 7   | `@@unique([studentId, internshipId])` en Application                  |
| 8   | Campo `embedding Float[]` en StudentProfile e Internship              |
| 9   | Soft delete (cambiar `isActive` a false)                              |
| 10  | `src/server/lib/db.ts` (patrón globalThis para dev)                   |

---

## 3. Autenticación

```
11. ¿Qué se usa para autenticación?
12. ¿Cómo se protegen los API routes por rol?
13. ¿Qué datos hay disponibles en la sesión?
14. ¿Dónde se configura NextAuth?
```

| #   | Respuesta Esperada                                                    |
| --- | --------------------------------------------------------------------- |
| 11  | NextAuth.js con Google OAuth                                          |
| 12  | `requireAuth(role?)` en `src/server/lib/auth-guard.ts`                |
| 13  | `session.user.id`, `session.user.role`, `session.user.email`          |
| 14  | `src/lib/auth.ts` (authOptions)                                       |

---

## 4. Matching IA

```
15. ¿Qué modelo genera los embeddings?
16. ¿De cuántas dimensiones son los vectores?
17. ¿Qué algoritmo calcula la afinidad?
18. ¿Qué rango tiene el matchScore?
19. ¿Qué librerías parsean los CVs?
20. ¿En qué momento se genera el embedding de una práctica?
```

| #   | Respuesta Esperada                                                    |
| --- | --------------------------------------------------------------------- |
| 15  | `sentence-transformers/all-MiniLM-L6-v2` (HuggingFace free tier)     |
| 16  | 384 dimensiones                                                       |
| 17  | Similitud de coseno (cosine similarity)                               |
| 18  | 0 a 100 (normalizado)                                                 |
| 19  | `pdf-parse` (PDF) y `mammoth` (Word/DOCX)                            |
| 20  | Al crearla (en internships.service.ts → createInternship)              |

---

## 5. Frontend

```
21. ¿Cuántas páginas tiene la app?
22. ¿Cómo se protegen las rutas del dashboard?
23. ¿Las llamadas API usan URL absoluta o relativa?
24. ¿Dónde están los tipos compartidos?
25. ¿Qué componente se reutiliza en listado y recomendaciones?
```

| #   | Respuesta Esperada                                                    |
| --- | --------------------------------------------------------------------- |
| 21  | 6: landing, login, listado, detalle, dashboard estudiante, dashboard empresa |
| 22  | Layout `(dashboard)/layout.tsx` verifica sesión con useSession        |
| 23  | Relativa: `fetch('/api/...')` — mismo servidor, sin CORS              |
| 24  | `src/types/index.ts`                                                  |
| 25  | `InternshipCard` (`src/components/ui/InternshipCard.tsx`)             |

---

## 6. Deploy y Producción

```
26. ¿Cuántos deploys se necesitan?
27. ¿Dónde se despliega?
28. ¿Dónde está la base de datos?
29. ¿Dónde se almacenan los CVs?
30. ¿Cuánto cuesta el hosting?
31. ¿Cómo se genera el Prisma Client en Vercel?
```

| #   | Respuesta Esperada                                                    |
| --- | --------------------------------------------------------------------- |
| 26  | 1 solo deploy                                                         |
| 27  | Vercel (free tier)                                                    |
| 28  | PostgreSQL en Supabase (free tier)                                    |
| 29  | Supabase Storage, bucket "documents"                                  |
| 30  | $0 — todo en free tier                                                |
| 31  | Script `"postinstall": "prisma generate"` en package.json             |

---

## 7. Verificación Final

```
32. ¿El build pasa sin errores?
33. ¿El flujo completo funciona end-to-end?
```

### Checklist

```bash
pnpm build    # ✅ Sin errores
pnpm dev      # ✅ App funciona en localhost:3000
```

```
✅ Landing page carga correctamente
✅ Login con Google → redirect al dashboard
✅ Listado de prácticas con filtros y paginación
✅ Detalle de práctica con botón postularse
✅ Dashboard estudiante: subir CV → ver recomendaciones con scores
✅ Dashboard empresa: crear práctica → ver postulantes rankeados
✅ Emails se envían (verificar en Brevo)
✅ Responsive en mobile
```
