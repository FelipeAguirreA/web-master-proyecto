import { getAuthSession } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/auth";

type RequiredRole = "STUDENT" | "COMPANY";

type AuthSuccess = {
  session: Awaited<ReturnType<typeof getAuthSession>> & object;
  user: { id: string; role: string; email: string | null | undefined };
};

type AuthError = {
  error: string;
  status: 401 | 403;
};

export async function requireAuth(
  requiredRole?: RequiredRole,
): Promise<AuthSuccess | AuthError> {
  const session = await getAuthSession();

  if (!session) {
    return { error: "Unauthorized", status: 401 };
  }

  if (requiredRole && session.user.role !== requiredRole) {
    return { error: "Forbidden", status: 403 };
  }

  return {
    session,
    user: {
      id: session.user.id,
      role: session.user.role,
      email: session.user.email,
    },
  };
}

export async function requireAdmin(): Promise<AuthSuccess | AuthError> {
  const session = await getAuthSession();

  if (!session) {
    return { error: "Unauthorized", status: 401 };
  }

  if (session.user.email !== ADMIN_EMAIL) {
    return { error: "Forbidden", status: 403 };
  }

  return {
    session,
    user: {
      id: session.user.id,
      role: session.user.role,
      email: session.user.email,
    },
  };
}
