import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/server/lib/db";
import { env } from "@/lib/env";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
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
          // COMPANY users skip registration; STUDENT needs rut to be complete
          token.registrationCompleted =
            dbUser.role === "COMPANY" ? true : !!dbUser.rut;
        }
      }

      // Called when useSession().update() is invoked from the frontend
      if (
        trigger === "update" &&
        session?.registrationCompleted !== undefined
      ) {
        token.registrationCompleted = session.registrationCompleted as boolean;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.registrationCompleted =
          (token.registrationCompleted as boolean) ?? true;
      }

      return session;
    },
  },

  session: { maxAge: 24 * 60 * 60 }, // 24 horas

  pages: { signIn: "/login" },
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}
