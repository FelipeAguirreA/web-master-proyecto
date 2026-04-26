import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/test/integration/**/*.test.ts"],
    setupFiles: ["./src/test/integration-setup.ts"],
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
