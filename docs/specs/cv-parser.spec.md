# Spec: CV Parser

Módulo de extracción de texto plano desde archivos CV. Vive en `src/server/lib/cv-parser.ts` y expone una sola función: `extractTextFromCV(buffer, mimetype)`. Consumido por `matching.service` al subir un CV del estudiante.

## Reglas transversales

- **Formatos soportados**: solo PDF (`application/pdf`) y DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`). **`.doc` binario antiguo NO es soportado** por `mammoth` — la función lo rechaza con error.
- **Dependencias cargadas con `require()` dinámico**: `pdf-parse` y `mammoth` se importan vía `require()` en runtime para evitar conflictos ESM/CJS en Next.js.
- **Sanitización obligatoria**: el texto crudo devuelto por las librerías pasa por `sanitizeText` antes de retornarse. Esto elimina caracteres de control que rompen PostgreSQL UTF-8 (notablemente `\x00`), pero preserva `\t`, `\n`, `\r`.
- **Sin manejo de archivos corruptos a nivel explícito**: si `pdf-parse` o `mammoth` tiran error, la función propaga la excepción sin capturarla. El caller (usualmente una API route) decide cómo responder al usuario.
- **Retorno siempre `string`**: nunca `null`/`undefined`. Si el archivo no tiene texto, retorna `""` (tras el trim).

---

## extractTextFromCV(buffer, mimetype)

**Propósito**: Convertir un archivo CV en PDF o DOCX a texto plano sanitizado, apto para persistir en PostgreSQL y alimentar al ATS / embeddings.

**Parámetros**:

- `buffer: Buffer` — contenido binario del archivo (como lo entrega `multipart/form-data` o Supabase Storage).
- `mimetype: string` — tipo MIME del archivo.

**Retorno**: `Promise<string>` — texto plano sanitizado y con `trim`.

**Reglas de despacho por mimetype**:

| `mimetype`                                            | Librería usada           | Campo retornado |
| ----------------------------------------------------- | ------------------------ | --------------- |
| `application/pdf` (exacto)                            | `pdf-parse`              | `data.text`     |
| cualquier string que **incluya** `"wordprocessingml"` | `mammoth.extractRawText` | `result.value`  |
| cualquier otro valor                                  | ninguna                  | lanza error     |

**Casos de error**:

- Mimetype no soportado → `Error("Tipo de archivo no soportado: <mimetype>. Solo se aceptan PDF y DOCX.")`.
- Mimetype vacío (`""`) o `null`/`undefined` convertido a string → también cae en la rama de error.
- Errores internos de `pdf-parse` (PDF malformado) o `mammoth` (DOCX corrupto) → se propagan sin modificar.

---

## sanitizeText (interno, no exportado)

**Propósito**: Preparar el texto extraído para persistencia en PostgreSQL y evitar que control chars rompan queries o embeddings.

**Reglas**:

- Elimina caracteres en los rangos:
  - `\x00-\x08` (incluye null byte — crítico para PostgreSQL UTF-8)
  - `\x0B` (vertical tab)
  - `\x0C` (form feed)
  - `\x0E-\x1F`
- **Preserva** `\x09` (tab), `\x0A` (newline), `\x0D` (carriage return).
- Aplica `.trim()` al final — quita espacios y saltos de línea iniciales y finales.

**Ejemplo**:

| Input                 | Output             |
| --------------------- | ------------------ |
| `"  hola\x00mundo  "` | `"holamundo"`      |
| `"línea1\nlínea2"`    | `"línea1\nlínea2"` |
| `"tab\there"`         | `"tab\there"`      |
| `"\x0Cform feed\x0C"` | `"form feed"`      |

---

## Casos NO cubiertos por este spec

- **OCR para PDFs escaneados**: si el PDF es solo imagen, `pdf-parse` retorna texto vacío. No hay fallback a OCR.
- **Detección automática de mimetype**: el caller debe pasar el mimetype correcto; no se inspecciona el buffer (no hay magic number check).
- **Límite de tamaño del buffer**: no validado acá — es responsabilidad del caller / API route.
- **Extracción estructurada**: este módulo solo devuelve texto plano; la extracción de skills/education/etc. vive en `ats/cv-extractor.ts` (ver `ats-scoring.spec.md`).
