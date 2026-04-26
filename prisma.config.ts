import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config({ path: ".env.local" });

export default defineConfig({
  datasource: {
    // DATABASE_URL: pooler de Supabase (puerto 6543) — para queries normales
    // DIRECT_URL: conexión directa (puerto 5432) — requerida para migraciones
    url: process.env.DATABASE_URL,
    // @ts-expect-error - Prisma 7 ya no declara directUrl en el config type.
    // Pendiente de revisión: confirmar que las migraciones a Supabase siguen
    // tomando DIRECT_URL desde env. Ver Fase 4/6 del refactor.
    directUrl: process.env.DIRECT_URL,
  },
});
