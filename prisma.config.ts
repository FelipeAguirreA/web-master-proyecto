import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// `quiet: true` suprime el log "◇ injected env (N) from .env.local // tip: …"
// que dotenv v17 imprime en stdout junto con un tip rotativo (incluye banners
// promocionales hacia dotenvx.com / vestauth.com — productos del mismo dueño).
// Sin esto, el output se redirige a archivos SQL/CSV/etc. y los contamina.
// Ver: https://github.com/motdotla/dotenv/blob/master/lib/main.js (función _log).
config({ path: ".env.local", quiet: true });

// En Prisma 7 el `url` de este config es el que usa la CLI para migraciones
// (db push, migrate). El cliente runtime NO lo usa — lee DATABASE_URL del env
// directo, sin pasar por aquí.
//
// Supabase: DATABASE_URL apunta al pooler (pgBouncer, puerto 6543) que no
// soporta todas las queries de prisma migrate. DIRECT_URL es la conexión
// directa (puerto 5432). Usar DIRECT_URL si existe; si no, DATABASE_URL como
// fallback (Docker local sólo expone una conexión directa).
//
// Prisma 6 tenía `datasource.directUrl` para esto; Prisma 7.0 lo eliminó.
export default defineConfig({
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
