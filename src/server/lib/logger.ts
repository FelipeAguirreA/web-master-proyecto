import pino, { type Logger } from "pino";

// Logger raíz: estructurado JSON en producción (parseable por Vercel/Datadog/
// Loki), pino-pretty colorizado en dev. Niveles: trace < debug < info < warn <
// error < fatal. Default: "info" en prod, "debug" en dev.
//
// Cuando un handler quiere anotar logs con contexto (route, userId, requestId),
// usa `createLogger({ ... })` para obtener un child logger con bindings que se
// inyectan en cada log emitido — útil para correlación en backends agregadores.
const isProd = process.env.NODE_ENV === "production";

const rootLogger = pino({
  level: isProd ? "info" : "debug",
  base: { service: "practix" },
  // En prod stdout JSON puro; en dev pino-pretty para legibilidad humana.
  // pino-pretty se carga via transport solo si NO es prod (pino lo resuelve
  // dinámicamente, así que no aparece en el bundle de producción).
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname,service",
          },
        },
      }),
});

/**
 * Crea un child logger con bindings (campos que aparecen en cada log).
 * Útil para inyectar `route`, `userId`, `requestId`, etc. y correlacionar
 * múltiples logs de la misma request en agregadores.
 *
 * Ejemplo:
 *   const log = createLogger({ route: "auth.refresh.POST", requestId });
 *   log.info({ userId }, "refresh token rotated");
 */
export function createLogger(bindings: Record<string, unknown>): Logger {
  return rootLogger.child(bindings);
}

/**
 * Extrae el `x-request-id` que el proxy (`src/proxy.ts`) inyecta en cada
 * request entrante. Si por algún motivo no está, retorna `undefined` (no
 * inventamos un ID de la nada — perdemos correlación pero no hacemos daño).
 */
export function getRequestId(
  headers: Headers | Record<string, string>,
): string | undefined {
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get("x-request-id") ?? undefined;
  }
  const plain = headers as Record<string, string>;
  return plain["x-request-id"] ?? plain["X-Request-Id"];
}
