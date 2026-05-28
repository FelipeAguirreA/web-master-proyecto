import { signOut } from "next-auth/react";

/**
 * Cierre de sesión COMPLETO. Único punto de verdad para "Cerrar sesión".
 *
 * `signOut()` de NextAuth por sí solo borra la cookie de sesión (access de
 * 15 min) pero NO toca el refresh token: la cookie `practix.refresh-token`
 * sobrevive 7 días y el token sigue válido en DB. Cualquier 401 posterior
 * dispara `/api/auth/refresh` y re-arma la sesión SIN pasar por Google → el
 * logout no cerraba nada del lado del servidor.
 *
 * Por eso llamamos primero a `/api/auth/logout`, que revoca el refresh en DB
 * y limpia su cookie, y RECIÉN después a `signOut()`. Centralizado acá para
 * que ningún botón nuevo quede con un logout incompleto.
 */
export async function logout(callbackUrl = "/"): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    // Si el revoke server-side falla (red caída), igual cerramos la sesión
    // local: mejor dejar al usuario con una cookie inválida que "logueado".
  }
  await signOut({ callbackUrl });
}
