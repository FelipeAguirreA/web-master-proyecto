# Spec: Content-Security-Policy (CSP)

Capa de mitigación de XSS y data-injection vía cabecera HTTP `Content-Security-Policy`. Implementación con **nonces dinámicos por request** generados en el proxy de Next.js. Cierra el gap declarado en `refactor-plan.md` Fase 3 paso P1.1.

Vive en `src/proxy.ts` (no en `next.config.ts`) porque los nonces son por-request — la API estática `headers()` de Next no permite generarlos.

## Reglas transversales

- **Una sola fuente de verdad**: la cabecera `Content-Security-Policy` se emite **únicamente** desde `src/proxy.ts`. `next.config.ts` no la define para evitar conflicto de cabeceras (Next concatena con coma, lo que **no es válido** en CSP).
- **Nonce por request**: cada response carga un nonce único, generado con `crypto.randomUUID()` y codificado en base64 (~22 chars). Reutilizar nonces entre requests rompe la garantía: un atacante con un nonce filtrado podría inyectar scripts en otra response.
- **Propagación a Next**: el nonce se inyecta en el request via header `x-nonce` antes de `NextResponse.next({ request })`. Next.js detecta automáticamente `x-nonce` en App Router y lo aplica a sus scripts internos (`__NEXT_DATA__`, RSC payload streaming, hydration). Documentado en https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
- **API routes no llevan CSP**: las rutas `/api/*` retornan JSON, no HTML. CSP no protege JSON parsing. Se omite para ahorrar bytes y reducir superficie de mantenimiento.
- **Diferencia controlada dev/prod**: en `development` el `script-src` agrega `'unsafe-eval'` porque **React 19 lo necesita en dev** para reconstruir callstacks de devtools (`"React requires eval() in development mode for various debugging features"`). En producción React no usa `eval()` — el header queda 100% locked. La asimetría está documentada y testeada (`buildCspHeader(nonce, isDev)`), y es la única diferencia entre entornos.

## Configuración

No requiere variables de entorno. El CSP es estático en cuanto a hosts permitidos; solo el nonce es dinámico.

---

## Generación del nonce

**Algoritmo**: `Buffer.from(crypto.randomUUID()).toString("base64")`. UUIDv4 da 122 bits de entropía — más que suficiente para CSP (la spec recomienda ≥128 bits, aceptando UUIDv4 como caso aceptable por todos los browsers modernos).

**Formato**: ~24 chars base64 (sin padding agregado). El nonce se inyecta en el CSP como `'nonce-{base64}'` con comillas simples literales.

**No reutilizar**: el nonce nuevo se genera en cada invocación del proxy. No se cachea.

---

## Directivas

```text
default-src 'self'
script-src 'self' 'nonce-{NONCE}' 'strict-dynamic' https://*.sentry.io
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com
img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com
connect-src 'self' https://*.supabase.co https://*.sentry.io https://api-inference.huggingface.co https://api.brevo.com
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
object-src 'none'
```

### Decisiones por directiva

| Directiva         | Valor                                                              | Por qué                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src`     | `'self'`                                                           | Default restrictivo para directivas no listadas. Cualquier nuevo tipo de recurso necesita decisión explícita.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `script-src`      | `'self' 'nonce-X' 'strict-dynamic' sentry [+'unsafe-eval' en dev]` | **Sin `'unsafe-inline'`**: reemplazado por nonce dinámico (en ambos entornos). **`'strict-dynamic'`**: scripts cargados por scripts con nonce válido pueden propagar el permiso — necesario para chunks de Next que se cargan dinámicamente. En CSP3 los browsers modernos ignoran `'self'` y allowlist host cuando hay `'strict-dynamic'`, pero los dejamos por compatibilidad CSP1/2. **`'unsafe-eval'` solo en dev**: React 19 dev mode usa `eval()` para callstacks de devtools (warning explícito del runtime: `"React requires eval() in development mode"`). Producción NO incluye `'unsafe-eval'`. |
| `style-src`       | `'self' 'unsafe-inline' fonts.googleapis.com`                      | **`'unsafe-inline'` se mantiene a propósito**: Tailwind v4, next/font y Radix-style libs emiten `<style>` y `style="..."` inline. Sacarlo rompería UI. Threat model de CSS injection es bajo (exfiltración via attribute selectors es ataque exótico que ya requiere XSS). Decisión documentada — si en Fase 6 se evalúa `'unsafe-hashes'` con hash list mantenida, se reabre.                                                                                                                                                                                                                             |
| `font-src`        | `'self' fonts.gstatic.com`                                         | next/font baja Google Fonts a `_next/static`, pero algunos requests siguen yendo a `fonts.gstatic.com` durante carga inicial.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `img-src`         | `'self' data: blob: supabase lh3.google`                           | `data:` para placeholders de next/image. `blob:` para previews de upload. Supabase Storage para CVs e imágenes. `lh3.googleusercontent.com` para avatares de Google OAuth.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `connect-src`     | `'self' supabase sentry huggingface brevo`                         | Endpoints externos con los que el frontend habla directo: realtime de Supabase, Sentry ingest, HuggingFace inference (matching), Brevo API (deferido a server-side, pero cubierto por si migra).                                                                                                                                                                                                                                                                                                                                                                                                           |
| `frame-ancestors` | `'none'`                                                           | Bloquea iframing (clickjacking). Equivalente moderno de `X-Frame-Options: DENY`. Mantenemos `X-Frame-Options: SAMEORIGIN` en `next.config.ts` por compat con browsers viejos, pero `frame-ancestors` es la fuente de verdad.                                                                                                                                                                                                                                                                                                                                                                               |
| `base-uri`        | `'self'`                                                           | Bloquea `<base href="...">` malicioso que reescribe URLs relativas — vector de XSS conocido.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `form-action`     | `'self'`                                                           | Bloquea forms exfiltrando data a dominios externos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `object-src`      | `'none'`                                                           | Bloquea `<object>`, `<embed>`, `<applet>`. Vectores legacy para Flash/Java applets — no se usan, mejor cerrarlo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### Lo que el spec NO cubre

- **`report-uri` / `report-to`**: no configuramos endpoint de reporte CSP en esta fase. Queda para Fase 6 (Observabilidad) — ahí se decide si los reports van a Sentry o a un endpoint propio.
- **CSP en modo `Content-Security-Policy-Report-Only`**: no se usa. Aplicamos enforcement directo. Confiamos en los E2E + smoke manual para cubrir regresiones.
- **CSP por ruta**: una sola política para toda la app. Si una ruta futura necesita CSP distinto (ej. embed de iframe permitido), se agrega lógica en `proxy.ts` con switch por `pathname`.
- **Trusted Types**: `require-trusted-types-for 'script'` queda fuera. Requiere migración del código (sanitización con DOMPurify, `trustedTypes.createPolicy`). Deferido — alta carga de migración para mitigar vector ya cubierto por nonce + `strict-dynamic`.

---

## proxy.ts — comportamiento

**Antes** (estado actual):

- `next.config.ts` emite header `Content-Security-Policy` estático con `unsafe-eval` + `unsafe-inline` en `script-src`.
- `proxy.ts` solo agrega `x-request-id` y maneja redirects de auth.

**Después**:

- `next.config.ts` ya no emite `Content-Security-Policy`. Los demás headers (HSTS, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy) quedan donde están.
- `proxy.ts` genera nonce, agrega header `x-nonce` al request (lo lee Next.js para sus scripts) y agrega header `Content-Security-Policy` al response con el nonce embebido.
- El comportamiento existente de auth/redirects se preserva sin cambios.

**Pseudocódigo**:

```ts
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("x-request-id", crypto.randomUUID());
  response.headers.set("Content-Security-Policy", csp);

  // ... resto del flujo de auth tal cual hoy
}
```

**Reglas de implementación**:

- `buildCsp(nonce: string): string` se exporta del módulo (o de un módulo helper) para que el test unit pueda invocarla sin levantar el proxy completo.
- El nonce que va al **request** y el nonce que va al **response** son el **mismo valor** en una request — necesario para que los scripts emitidos por Next con `nonce={nonce}` matcheen el `'nonce-X'` del CSP del response.
- Aunque la matcher excluye `/api/auth`, el resto del proxy SÍ corre en `/api/*` (ver `matcher` actual). Para `/api/*` igual emitimos CSP por simplicidad — el JSON ignora la cabecera, no daña.

---

## Tests TDD esperados

`src/test/unit/proxy.test.ts` (nuevo archivo, no existe hoy):

| #   | Caso                                                        | Comportamiento esperado                        |
| --- | ----------------------------------------------------------- | ---------------------------------------------- |
| 1   | Response a ruta pública (`/`)                               | Header `Content-Security-Policy` presente      |
| 2   | Header CSP no contiene `'unsafe-eval'`                      | Regresión bloqueada                            |
| 3   | Header CSP no contiene `'unsafe-inline'` en `script-src`    | Regresión bloqueada                            |
| 4   | Header CSP contiene `'nonce-{algo base64}'` en `script-src` | Nonce presente                                 |
| 5   | Header CSP contiene `'unsafe-inline'` en `style-src`        | Decisión consciente, no se rompe estilo        |
| 6   | Header CSP contiene `'strict-dynamic'` en `script-src`      | Necesario para chunks de Next                  |
| 7   | Dos requests consecutivos                                   | Nonces distintos                               |
| 8   | Request header `x-nonce` igual a response header CSP nonce  | Misma fuente de verdad                         |
| 9   | Response sigue trayendo `x-request-id`                      | Comportamiento preexistente preservado         |
| 10  | Redirect de auth (`/dashboard` sin token → `/login`)        | Sigue funcionando + CSP también en el redirect |
| 11  | `buildCsp(nonce)` puro: nonce vacío                         | Lanza o devuelve string vacío (decidir en TDD) |

`e2e/csp.spec.ts` (nuevo archivo):

| #   | Caso                                                | Comportamiento esperado                              |
| --- | --------------------------------------------------- | ---------------------------------------------------- |
| 1   | Cargar `/`                                          | Sin errores `Refused to ...` en `page.on("console")` |
| 2   | Cargar `/login`                                     | Sin errores CSP                                      |
| 3   | Cargar `/dashboard/empresa` (autenticado)           | Sin errores CSP                                      |
| 4   | Cargar `/internships`                               | Sin errores CSP                                      |
| 5   | Header `Content-Security-Policy` en response de `/` | Presente y trae `nonce-`                             |

---

## Métricas de éxito

- **0 errores CSP en console** al cargar las 4 rutas E2E listadas.
- **Sentry sigue capturando** errores cliente (validar manualmente disparando un throw en una page).
- **Replay de Sentry sigue grabando** sesiones de error (manual).
- **Tests unit y E2E nuevos en verde**.
- **Coverage**: `src/proxy.ts` queda con 100% func tras los nuevos tests.

---

## Casos NO cubiertos por este spec

- **Endpoint de CSP reports**: no configurado. Sin reports, una violación CSP bloquea el script silenciosamente. El monitoreo manual + E2E es la red de seguridad mientras tanto.
- **Migración a Trusted Types**: pendiente de evaluación en Fase 6.
- **Hashes en `style-src`**: si Fase 6 elimina `'unsafe-inline'` de styles, la lista de hashes vive en otro spec.
- **Nonces en API responses**: API routes retornan JSON, CSP no aplica.
