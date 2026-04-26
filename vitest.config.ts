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
        "src/app/api/**",
        "src/app/**/page.tsx",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx",
        "src/app/**/not-found.tsx",
        "src/app/**/template.tsx",
        "src/app/**/route.ts",
        "src/app/global-error.tsx",
        "src/proxy.ts",
        "src/middleware.ts",
        "src/instrumentation.ts",
        "src/instrumentation-client.ts",
        "src/global-error.tsx",
        "src/server/lib/db.ts",
        "src/server/lib/ats/preset-modules.ts",
        "src/lib/env.ts",
        "src/lib/constants.ts",
        "src/lib/supabase/realtime-client.ts",
        "src/components/providers.tsx",
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
