import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // .design-drop/ son JSX templates de Stitch (mocks fuente, no parte del
    // build, gitignored). eslint-config-next 16.2.6 dejó de auto-leer
    // .gitignore — hay que explicitarlos acá. Agregar otras carpetas auto-
    // generadas que tampoco deberían lintearse.
    ".design-drop/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
