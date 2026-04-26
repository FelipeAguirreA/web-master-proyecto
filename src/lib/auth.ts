import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/lib/db";
import { rateLimit } from "@/server/lib/rate-limit";
import { issueRefreshToken } from "@/server/services/refresh-tokens.service";
import {
  buildRefreshCookie,
  ACCESS_TOKEN_MAX_AGE_S,
} from "@/server/lib/auth-cookies";
import { env } from "@/lib/env";
export { ADMIN_EMAIL } from "@/lib/constants";

const LOGIN_RATE_LIMIT = 5;
const LOGIN_RATE_WINDOW_MS = 5 * 60 * 1000;

// NextAuth pasa headers como objeto plain o Headers según versión/adapter.
function extractClientIp(
  req: { headers?: Record<string, string> | Headers } | undefined,
): string {
  const headers = req?.headers;
  if (!headers) return "unknown";

  let xff: string | null | undefined;
  if (typeof (headers as Headers).get === "function") {
    xff = (headers as Headers).get("x-forwarded-for");
  } else {
    const plain = headers as Record<string, string>;
    xff = plain["x-forwarded-for"] ?? plain["X-Forwarded-For"];
  }

  return xff?.split(",")[0]?.trim() ?? "unknown";
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),

    CredentialsProvider({
      id: "empresa-credentials",
      name: "Empresa",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate limit por IP+email — combo limita ataques distribuidos por user
        // sin que un atacante de una IP afecte logins legítimos de otros users.
        // Si excede, retornamos null (= "credenciales inválidas" desde
        // perspectiva NextAuth). El usuario legítimo verá el mismo mensaje
        // que con password incorrecto, pero el atacante no puede distinguir.
        const ip = extractClientIp(req);
        const rl = await rateLimit(
          `login:${ip}:${credentials.email.toLowerCase()}`,
          LOGIN_RATE_LIMIT,
          LOGIN_RATE_WINDOW_MS,
        );
        if (!rl.success) {
          console.warn(
            `[auth] login rate limit hit — ip=${ip} email=${credentials.email.toLowerCase()}`,
          );
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || user.role !== "COMPANY" || !user.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // CredentialsProvider — user already exists, just allow
      if (account?.provider === "empresa-credentials") return true;

      // Google OAuth flow
      try {
        const existing = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existing) {
          const created = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name ?? "",
              image: user.image,
              role: "STUDENT",
              provider: account?.provider,
              providerId: account?.providerAccountId,
            },
          });

          await prisma.studentProfile.create({
            data: { userId: created.id },
          });
        }

        return true;
      } catch (error) {
        console.error("[signIn callback error]", error);
        return false;
      }
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.registrationCompleted =
            dbUser.role === "COMPANY" ? true : !!dbUser.rut;

          if (dbUser.role === "COMPANY") {
            const profile = await prisma.companyProfile.findUnique({
              where: { userId: dbUser.id },
              select: { companyStatus: true, companyName: true },
            });
            token.companyStatus = profile?.companyStatus ?? "PENDING";
            if (profile?.companyName) {
              token.name = profile.companyName;
            }
          }
        }
      }

      if (trigger === "update") {
        if (session?.registrationCompleted !== undefined) {
          token.registrationCompleted =
            session.registrationCompleted as boolean;
        }
        if (session?.companyStatus !== undefined) {
          token.companyStatus = session.companyStatus as string;
        }
        if (session?.name !== undefined) {
          token.name = session.name as string;
        }
        if (session?.image !== undefined) {
          token.picture = session.image as string;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.registrationCompleted =
          (token.registrationCompleted as boolean) ?? true;
        if (token.companyStatus) {
          session.user.companyStatus = token.companyStatus as string;
        }
        // Para empresas el nombre visible es el nombre de la empresa
        if (token.name) {
          session.user.name = token.name as string;
        }
      }

      return session;
    },
  },

  session: { maxAge: ACCESS_TOKEN_MAX_AGE_S },

  events: {
    // Al completar sign-in (cualquier provider), emitimos un refresh token y
    // lo guardamos hasheado en DB. La cookie del refresh queda seteada en la
    // misma respuesta que NextAuth devuelve al cliente.
    async signIn({ user }) {
      try {
        const email = user?.email;
        if (!email) return;
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (!dbUser) return;

        const issued = await issueRefreshToken(dbUser.id);
        const opts = buildRefreshCookie(issued.rawToken);
        const cookieStore = await cookies();
        cookieStore.set(opts.name, opts.value, {
          httpOnly: opts.httpOnly,
          secure: opts.secure,
          sameSite: opts.sameSite,
          path: opts.path,
          maxAge: opts.maxAge,
        });
      } catch (err) {
        // Si la emisión del refresh falla, NO bloqueamos el sign-in. El
        // cliente arrancará con cookie de access válida 15 min y al primer
        // intento de refresh fallará → re-login. Mejor degradación parcial
        // que login bloqueado.
        console.error(
          "[auth/events.signIn] refresh token issuance failed",
          err,
        );
      }
    },
  },

  pages: { signIn: "/login" },
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}
