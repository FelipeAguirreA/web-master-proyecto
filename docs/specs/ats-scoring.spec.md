# Spec: ATS Scoring Engine

Motor de scoring del ATS (Applicant Tracking System). Vive en `src/server/lib/ats/` y expone:

- `scoreApplication(cvText, profileSkills, modules)` — función orquestadora en `scoring-engine.ts`.
- `scoreSkills(cv, params)` en `scorers/skills.scorer.ts`.
- `scoreExperience(cv, params)` en `scorers/experience.scorer.ts`.
- `scoreEducation(cv, params)` en `scorers/education.scorer.ts`.
- `scoreLanguages(cv, params)` en `scorers/languages.scorer.ts`.
- `scorePortfolio(cv, params)` en `scorers/portfolio.scorer.ts`.

Consumido por la UI de empresa (ranking de candidatos por práctica) vía `applications.service`.

---

## Reglas transversales

- **Todo scorer retorna `ScorerResult`**: `{ score: number (0–100), passed: boolean, reason?: string }`.
- **`score` siempre redondeado a entero**, acotado `[0, 100]`.
- **`hardFilter` es descalificatorio**: si `hardFilter === true` y el candidato no cumple el umbral → `{ score: 0, passed: false, reason: "<motivo>" }`. El engine lee ese `passed: false` y propaga `passedFilters: false` + `atsScore: 0`.
- **Si `passed: true` pero faltan items**: `reason` opcional con detalle ("Skills no encontradas en CV: ..."). El score refleja la penalización, pero el candidato sigue en el ranking.
- **Sin excepciones lanzadas**: los scorers son funciones puras que siempre devuelven un `ScorerResult`. Entradas inválidas devuelven score bajo/neutro, no tiran errores.
- **`params` puede llegar con campos faltantes**: cada scorer aplica defaults (`required = []`, `minYears = 0`, `hardFilter = false`, etc.) por destructuring.

---

## scoreApplication(cvText, profileSkills, modules)

**Propósito**: Calcular el score ATS final de una candidatura aplicando todos los módulos activos configurados por la empresa.

**Parámetros**:

- `cvText: string` — texto plano del CV del candidato (extraído previamente por `cv-parser`).
- `profileSkills: string[]` — skills del `StudentProfile` (complementan las detectadas en el texto).
- `modules: ATSModuleInput[]` — módulos configurados por la empresa para la práctica.

**Retorno**: `ATSResult`:

```ts
{
  atsScore: number;                  // 0–100, entero
  moduleScores: ModuleScoreDetail[]; // un detalle por módulo ACTIVO evaluado
  passedFilters: boolean;            // false si algún hardFilter falló
  filterReason: string | null;       // reason del PRIMER módulo que falló
}
```

**Reglas de negocio**:

1. **Filtrado de módulos**: solo evalúa módulos con `isActive === true`. El orden de evaluación es el del array recibido.
2. **Sin módulos activos**: `{ atsScore: 0, moduleScores: [], passedFilters: true, filterReason: null }`. No es un fallo — simplemente no hay configuración.
3. **Parseo único del CV**: se llama `parseCVText(cvText, profileSkills)` una sola vez por invocación y el `CVData` resultante se reusa en todos los scorers.
4. **Despacho por `module.type`**:
   - `"SKILLS"` → `scoreSkills`
   - `"EXPERIENCE"` → `scoreExperience`
   - `"EDUCATION"` → `scoreEducation`
   - `"LANGUAGES"` → `scoreLanguages`
   - `"PORTFOLIO"` → `scorePortfolio`
   - `"CUSTOM"` → neutral `{ score: 50, passed: true }` (queda pendiente revisión manual).
   - Cualquier otro tipo no reconocido → también neutral `{ score: 50, passed: true }`.
5. **`module.params` faltante**: si es `null`/`undefined`, se sustituye por `{}` antes de pasarlo al scorer.
6. **Falla de hard filter**: si algún módulo retorna `passed: false`, el engine sigue evaluando el resto (para poblar `moduleScores`) pero:
   - `atsScore` final será `0`.
   - `passedFilters` será `false`.
   - `filterReason` capturará el `reason` del **primer** módulo que falló (si no hay reason explícita, usa `` `Módulo "<label>" no superado` ``).
7. **Cálculo del score final (si todos pasan)**:
   - `totalWeight = Σ modules.weight`
   - `weightedSum = Σ (moduleScore.score × moduleScore.weight)`
   - `atsScore = round(weightedSum / totalWeight)`
   - Si `totalWeight === 0` → `atsScore = 0`.

**Casos borde**:

- Módulos con `weight: 0` cuentan para `moduleScores` pero no aportan al promedio ponderado.
- Si todos los módulos activos tienen `weight: 0` → `atsScore: 0` (evita división por cero).
- Varios módulos fallando: `filterReason` queda con el primero; los demás quedan con `passed: false` dentro de `moduleScores`.

---

## scoreSkills(cv, params)

**Propósito**: Evaluar cuánto matchea el candidato con las skills requeridas y preferidas.

**Params**:

```ts
{ required: string[]; preferred: string[]; hardFilter: boolean }
```

**Retorno**: `ScorerResult`.

**Reglas de negocio**:

1. **Hard filter**: si `hardFilter === true` y falta al menos una `required` → `{ score: 0, passed: false, reason: "Faltan skills requeridas: <lista>" }`.
2. **Detección de skill (`hasSkill`)**: dos estrategias — (a) match en `cv.skills` (exacto O que la skill del CV _contenga_ el target, pero no al revés, evitando que `"c"` matchee `"css"`); (b) regex `\\b<target>\\b` sobre `cv.rawText`.
3. **Score de requeridas**: `(matched.length / required.length) × 100`. Si `required.length === 0` → `requiredScore = 100`.
4. **Score de preferidas**: `(matched.length / preferred.length) × 100`. Si `preferred.length === 0` → `preferredScore = 0` (pero no se usa, ver siguiente regla).
5. **Score final**:
   - Si `preferred.length > 0` → `round(requiredScore × 0.7 + preferredScore × 0.3)`.
   - Si `preferred.length === 0` → `round(requiredScore)`.
6. **`reason`**: si hay `required` faltantes (aunque sea soft) → `"Skills no encontradas en CV: <lista>"`. Si está todo, `reason` es `undefined`.
7. **Normalización**: `toLowerCase` + `trim` + `.`/`-`/`_` → espacio.

---

## scoreExperience(cv, params)

**Propósito**: Evaluar años de experiencia y match de roles preferidos.

**Params**:

```ts
{ minYears: number; preferredRoles: string[]; hardFilter: boolean }
```

**Retorno**: `ScorerResult`.

**Reglas de negocio**:

1. **Hard filter**: `hardFilter === true && totalYears < minYears` → `{ score: 0, passed: false, reason: "Requiere <X> años..." }`.
2. **Score por años (`yearsScore`)**:
   - `minYears > 0` → `min(100, (totalYears / minYears) × 80)`. Alcanza 80 en el mínimo, 100 en ≥ 125% del mínimo.
   - `minYears === 0 && totalYears > 0` → `min(100, 60 + totalYears × 5)`. Bonus por experiencia aunque no haya mínimo.
   - `minYears === 0 && totalYears === 0` → `yearsScore = 100` (valor inicial, no se modifica).
3. **Score por roles (`roleScore`)**:
   - `preferredRoles.length > 0` → `(matched / preferredRoles.length) × 20`. Match: algún rol del CV _incluye_ el rol preferido (case-insensitive).
   - `preferredRoles.length === 0` → `roleScore = 0`.
4. **Score final**: `min(100, round(yearsScore + roleScore))`.
5. **`passed: true` siempre** salvo hard filter.

---

## scoreEducation(cv, params)

**Propósito**: Evaluar GPA y afinidad de carrera.

**Params**:

```ts
{ minGPA: number; preferredDegrees: string[]; hardFilter: boolean }
```

**Retorno**: `ScorerResult`.

**Reglas de negocio**:

1. **Hard filter**: `hardFilter === true && minGPA > 0 && gpa > 0 && gpa < minGPA` → `{ score: 0, passed: false, reason: "Promedio mínimo requerido: <X>..." }`. Notar que si el CV NO tiene GPA (`gpa === 0`), el hard filter no aplica (no descalifica por falta de dato).
2. **Score por GPA (`gpaScore`)**:
   - Valor base neutral: `70` (sin info suficiente).
   - `minGPA > 0 && gpa > 0` → `min(100, (gpa / 7) × 100)` (escala chilena, 7 = nota máxima).
3. **Score por carrera (`degreeScore`)**:
   - `preferredDegrees.length > 0 && degree` → si alguna carrera preferida matchea (substring case-insensitive) → `30`, si no → `0`.
   - `preferredDegrees.length === 0 && degree` → `20` (tiene carrera aunque no sea la preferida).
   - Sin `degree` → `0`.
4. **Score final**: `min(100, round(gpaScore × 0.7 + degreeScore))`.
5. **`passed: true` siempre** salvo hard filter.

---

## scoreLanguages(cv, params)

**Propósito**: Evaluar idiomas requeridos y preferidos (con nivel).

**Params**:

```ts
{ required: string[]; preferred: string[]; hardFilter: boolean }
```

- Los strings combinan idioma + nivel: `"Inglés B2"`, `"Portugués avanzado"`.

**Retorno**: `ScorerResult`.

**Reglas de negocio**:

1. **Extracción (`extractLang`)**: parte cada entry por espacios, busca un token que sea un nivel conocido (`LEVEL_ORDER`), el resto es el nombre del idioma. Todo normalizado (lowercase + sin acentos).
2. **Match de candidato (`candidateHasLanguage`)**: el CV tiene el idioma si (a) el nombre matchea (substring bidireccional: `cvLang.includes(reqLang) || reqLang.includes(cvLang)`) y (b) si el requerido pide un nivel, el del CV es `>=` en `LEVEL_ORDER` (índice).
3. **Hard filter**: `hardFilter === true` y falta algún `required` → `{ score: 0, passed: false, reason: "Idiomas requeridos faltantes: ..." }`.
4. **Score de requeridos**: `((required.length - missing.length) / required.length) × 100`. Si `required.length === 0` → `100`.
5. **Score de preferidos**: análogo pero sobre `preferred`.
6. **Score final**:
   - `preferred.length > 0` → `round(requiredScore × 0.7 + preferredScore × 0.3)`.
   - `preferred.length === 0` → `round(requiredScore)`.
7. **`reason`**: si hay required faltantes (aunque sea soft) → `"Idiomas no encontrados en CV: ..."`.

---

## scorePortfolio(cv, params)

**Propósito**: Evaluar presencia de portafolio.

**Params**:

```ts
{ required: boolean; keywords: string[]; hardFilter: boolean }
```

- `keywords` default: `["github", "behance", "portfolio"]`.

**Retorno**: `ScorerResult`.

**Reglas de negocio**:

1. **Detección de portafolio (`hasPortfolio`)**: true si (a) `cv.portfolioLinks.length > 0`, o (b) alguna keyword (case-insensitive) aparece en `cv.rawText`, o (c) `cv.hasPortfolio` ya está seteado por el extractor.
2. **Hard filter**: `hardFilter === true && required === true && !hasPortfolio` → `{ score: 0, passed: false, reason: "Portafolio requerido no encontrado en el CV" }`.
3. **Sin portafolio**:
   - `required === true` → `score: 20, passed: true`.
   - `required === false` → `score: 50, passed: true`.
4. **Con portafolio**:
   - Links directos (`portfolioLinks.length > 0`) → `score: 100`.
   - Solo mención por keyword o flag → `score: 70`.

---

## Casos NO cubiertos por este spec

- **Reranking con embeddings**: cubierto por `matching.spec.md` (cosine similarity sobre vectores 384-dim).
- **Extracción de `CVData`**: cubierto por `cv-parser` (el spec asume que `parseCVText` ya entrega el objeto correcto).
- **Persistencia del resultado**: el engine no escribe a DB. El caller (`applications.service`) decide qué guardar.
- **UI del scoring**: el front consume `ATSResult` pero el formateo visual (badges, colores) es responsabilidad del componente.
