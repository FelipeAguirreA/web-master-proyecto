export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

// React 19 dev mode necesita eval() para reconstruir callstacks de devtools.
// En producción React no lo usa — por eso solo se permite cuando isDev=true.
export function buildCspHeader(nonce: string, isDev = false): string {
  const scriptSrc = [
    "script-src",
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "https://*.sentry.io",
    // Vercel Analytics + Speed Insights: los scripts cargan vía mismo origin
    // (`/_vercel/insights/script.js`), pero algunos beacons + variantes
    // pueden pegar a va.vercel-scripts.com. Listado explícito para evitar
    // bloqueos silenciosos cuando 'strict-dynamic' no propaga.
    "https://va.vercel-scripts.com",
    isDev ? "'unsafe-eval'" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://api-inference.huggingface.co https://api.brevo.com https://va.vercel-scripts.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}
