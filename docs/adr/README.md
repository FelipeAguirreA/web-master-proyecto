# Architecture Decision Records (ADRs)

Registro de decisiones arquitectónicas del proyecto PractiX.

## Qué es un ADR

Un ADR captura una decisión de arquitectura relevante, el contexto en el que se tomó, y sus consecuencias. No es documentación de cómo funciona el código hoy — es el **por qué** se eligió así.

## Cuándo crear uno

- Cambiás o establecés una convención que afecta a varios módulos
- Elegís una tecnología, librería o patrón con alternativas reales
- Tomás una decisión con trade-offs que otros van a querer entender después
- Revertís o superseedés un ADR previo

## Formato

Cada ADR tiene:

- **Título**: verbo + qué (ej. "Usar Upstash Redis para rate limiting")
- **Status**: `Propuesto` | `Aceptado` | `Deprecado` | `Superseded por ADR-XXX`
- **Fecha**: AAAA-MM-DD
- **Contexto**: qué problema estamos resolviendo, qué restricciones existen
- **Decisión**: qué se decidió, en una línea si es posible
- **Consecuencias**: (+) positivas, (-) negativas y riesgos conocidos
- **Alternativas consideradas**: qué otras opciones se evaluaron y por qué se descartaron

## Convenciones

- Archivos numerados correlativos: `001-titulo-kebab-case.md`, `002-...`
- Un ADR NO se edita una vez aceptado. Si cambia la decisión, se crea un nuevo ADR que lo `superseed`.
- Excepción: typos, links rotos, o agregar referencias — siempre con PR.

## Índice

| #   | Título                                                                                              | Status             |
| --- | --------------------------------------------------------------------------------------------------- | ------------------ |
| 001 | [Monolito modular + Clean Architecture](./001-monolito-modular-clean-architecture.md)               | Aceptado           |
| 002 | [Autenticación con NextAuth + JWT rotativo](./002-auth-nextauth-jwt-rotativo.md)                    | Propuesto (Fase 3) |
| 003 | [Rate limiting con Upstash Redis](./003-rate-limiting-upstash.md)                                   | Propuesto (Fase 3) |
| 004 | [Testing strategy — pirámide](./004-testing-strategy-piramide.md)                                   | Aceptado (parcial) |
| 005 | [Observabilidad con Sentry + logger estructurado](./005-observabilidad-sentry-logger.md)            | Aceptado (parcial) |
| 006 | [Matching con embeddings HuggingFace + cosine similarity](./006-matching-embeddings-huggingface.md) | Aceptado           |
