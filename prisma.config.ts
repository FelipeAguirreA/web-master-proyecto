import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config({ path: ".env.local" });

export default defineConfig({
  datasource: {
    // DATABASE_URL: pooler de Supabase (puerto 6543) — para queries normales
    // DIRECT_URL: conexión directa (puerto 5432) — requerida para migraciones
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
});
