import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/lib/db";
import { env } from "@/lib/env";
export { ADMIN_EMAIL } from "@/lib/constants";

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

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

  session: { maxAge: 24 * 60 * 60 },

  pages: { signIn: "/login" },
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}
