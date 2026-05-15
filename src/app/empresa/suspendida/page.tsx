import { redirect } from "next/navigation";

import { getAuthSession } from "@/server/lib/auth";
import { prisma } from "@/server/lib/db";
import { E } from "@/components/dashboard/palettes";
import { ADMIN_EMAIL } from "@/lib/constants";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cuenta suspendida · PractiX",
};

export default async function CuentaSuspendidaPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "COMPANY") {
    redirect("/dashboard/estudiante");
  }

  const profile = await prisma.companyProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      companyName: true,
      companyStatus: true,
      suspensionReason: true,
      suspendedAt: true,
    },
  });

  if (!profile || profile.companyStatus !== "SUSPENDED") {
    redirect("/dashboard/empresa");
  }

  const suspendedAtLabel = profile.suspendedAt
    ? new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(profile.suspendedAt)
    : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: E.bg,
        color: E.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: 520,
          background: E.surface,
          border: `1px solid ${E.border}`,
          borderRadius: 16,
          padding: "32px 28px",
          boxShadow: "0 24px 64px -32px rgba(15,23,42,0.18)",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: E.roseBg,
            color: E.rose,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 18,
          }}
        >
          !
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: -0.4,
            margin: 0,
            color: E.text,
          }}
        >
          Tu cuenta está suspendida
        </h1>

        <p
          style={{
            marginTop: 10,
            fontSize: 14.5,
            lineHeight: 1.55,
            color: E.muted,
          }}
        >
          Hola <strong style={{ color: E.text }}>{profile.companyName}</strong>.
          El acceso al panel y a las publicaciones de prácticas fue suspendido
          por el administrador de PractiX.
        </p>

        <div
          style={{
            marginTop: 18,
            padding: "14px 16px",
            background: profile.suspensionReason
              ? E.amberBg
              : "rgba(15,23,42,.04)",
            borderLeft: `3px solid ${profile.suspensionReason ? E.amber : E.subtle}`,
            borderRadius: 8,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: profile.suspensionReason ? E.amber : E.subtle,
            }}
          >
            Motivo
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 14,
              color: profile.suspensionReason ? E.text : E.muted,
              fontStyle: profile.suspensionReason ? "normal" : "italic",
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
            }}
          >
            {profile.suspensionReason ??
              "El administrador no especificó un motivo público. Contactá al soporte para más información."}
          </p>
        </div>

        {suspendedAtLabel ? (
          <p
            style={{
              marginTop: 14,
              fontSize: 12.5,
              color: E.subtle,
            }}
          >
            Suspendida el {suspendedAtLabel}
          </p>
        ) : null}

        <div
          style={{
            marginTop: 22,
            padding: "16px 18px",
            background: E.accentBg,
            border: `1px solid ${E.accentBdr}`,
            borderRadius: 12,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              fontWeight: 700,
              color: E.text,
            }}
          >
            ¿Querés apelar o pedir más información?
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 14,
              color: E.muted,
              lineHeight: 1.55,
            }}
          >
            Contactá al administrador a{" "}
            <a
              href={`mailto:${ADMIN_EMAIL}`}
              style={{ color: E.accent, fontWeight: 700 }}
            >
              {ADMIN_EMAIL}
            </a>
            .
          </p>
        </div>

        <div style={{ marginTop: 22 }}>
          <SignOutButton />
        </div>
      </main>
    </div>
  );
}
