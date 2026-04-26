import { encode, type JWT } from "next-auth/jwt";
import { prisma } from "@/server/lib/db";
import { env } from "@/lib/env";
import { ACCESS_TOKEN_MAX_AGE_S } from "@/server/lib/auth-cookies";

export interface JwtPayload {
  sub: string;
  id: string;
  email: string;
  name: string;
  picture: string | null;
  role: string;
  registrationCompleted: boolean;
  companyStatus?: string;
}

// Reproduce el shape que arma el `jwt` callback de NextAuth para que el JWT
// emitido por /api/auth/refresh sea indistinguible del emitido en signIn.
export async function buildJwtPayload(
  userId: string,
): Promise<JwtPayload | null> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      rut: true,
    },
  });
  if (!dbUser) return null;

  const payload: JwtPayload = {
    sub: dbUser.id,
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    picture: dbUser.image,
    role: dbUser.role,
    registrationCompleted: dbUser.role === "COMPANY" ? true : !!dbUser.rut,
  };

  if (dbUser.role === "COMPANY") {
    const profile = await prisma.companyProfile.findUnique({
      where: { userId: dbUser.id },
      select: { companyStatus: true, companyName: true },
    });
    payload.companyStatus = profile?.companyStatus ?? "PENDING";
    if (profile?.companyName) payload.name = profile.companyName;
  }

  return payload;
}

export async function encodeAccessJwt(payload: JwtPayload): Promise<string> {
  return encode({
    token: payload as unknown as JWT,
    secret: env.NEXTAUTH_SECRET,
    maxAge: ACCESS_TOKEN_MAX_AGE_S,
  });
}
