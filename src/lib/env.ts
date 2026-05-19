import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  // JWT Secret (Legacy HS256) — Supabase Dashboard → Settings → API → JWT Keys
  // → Legacy JWT Secret tab → Reveal. Lo usamos en /api/auth/supabase-token
  // para firmar JWTs HS256 que pasamos a supabaseRealtime.realtime.setAuth().
  //
  // NOTA: el dashboard de Supabase no expone "Generic OIDC Third-Party Auth"
  // en free tier (solo Clerk/Firebase/Auth0/Cognito/WorkOS). Por eso usamos
  // el legacy secret en vez de RS256/JWKS. Cuando upgradeás a Pro o cuando
  // Supabase abra Generic OIDC al free tier, ver `docs/supabase-third-party-auth-setup.md`
  // para la migración.
  SUPABASE_JWT_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  HUGGINGFACE_API_KEY: z.string().startsWith("hf_").optional(),
  BREVO_API_KEY: z.string().min(1).optional(),
  BREVO_SENDER_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(`Variables de entorno inválidas o faltantes: ${missing}`);
}

export const env = parsed.data;
