import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["e2e/**", "node_modules", ".next", "src/test/integration/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        // ── Next.js infra / entry points ────────────────────────────────────
        "src/app/api/**",
        "src/app/**/page.tsx",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx",
        "src/app/**/not-found.tsx",
        "src/app/**/template.tsx",
        "src/app/**/route.ts",
        "src/app/global-error.tsx",
        "src/instrumentation.ts",
        "src/instrumentation-client.ts",
        "src/global-error.tsx",
        // ── Presentational: componentes React (JSX/TSX) ──────────────────────
        // Cubrir markup con tests es el anti-patrón que evitamos.
        "src/components/**/*.tsx",
        "src/components/**/*.jsx",
        // ── Archivos de datos / constantes de componentes ───────────────────
        // Paletas de colores, tokens de diseño — sin lógica testeable
        "src/components/dashboard/palettes.ts",
        "src/components/dashboard/tokens.ts",
        "src/components/dashboard/sections/empresa/types.ts",
        // ── App-level presentational (_components en /app) ───────────────────
        "src/app/**/_components/**",
        "src/app/**/suspendida/**",
        // ── Hooks de React ───────────────────────────────────────────────────
        "src/hooks/**",
        // cookie-consent mezcla lógica de storage con hooks de React
        // (useSyncExternalStore + closures de event listeners). Las funciones
        // puras (readConsent, writeConsent, parseConsent) están testeadas en
        // cookie-consent.test.ts, pero las funciones internas de plumbing no
        // son testeables unitariamente sin un entorno completo de React.
        "src/lib/cookie-consent.ts",
        // ── Infraestructura externa (wrappers sin lógica propia) ─────────────
        "src/lib/client/supabase.ts",
        "src/lib/client/supabase-auth.ts",
        "src/server/lib/storage.ts",
        "src/server/lib/logger.ts",
        // ── Data estática (arrays/objects, no lógica) ────────────────────────
        "src/lib/legal/content.ts",
        "src/server/lib/skills-catalog.ts",
        // ── Providers / configuración de infra ───────────────────────────────
        "src/components/providers.tsx",
        "src/server/lib/db.ts",
        "src/server/lib/ats/preset-modules.ts",
        "src/lib/env.ts",
        "src/lib/constants.ts",
        "src/lib/supabase/realtime-client.ts",
        // ── Tipos y tests ────────────────────────────────────────────────────
        "src/types/**",
        "src/test/**",
        "**/*.config.{ts,js,mjs}",
        "**/*.d.ts",
      ],
      thresholds: {
        functions: 100,
        lines: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
