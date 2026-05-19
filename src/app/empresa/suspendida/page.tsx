import { redirect } from "next/navigation";

import { getAuthSession } from "@/server/lib/auth";
import { prisma } from "@/server/lib/db";
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

  const hasReason = Boolean(profile.suspensionReason);

  return (
    /* data-palette="company" activa los tokens E (paleta B2B azul) globalmente */
    <div
      data-palette="company"
      className="min-h-screen bg-bg text-text flex items-center justify-center p-5"
    >
      <main className="w-full max-w-[520px] bg-surface border border-border rounded-2xl p-8 sm:p-[32px_28px] shadow-[0_24px_64px_-32px_rgba(15,23,42,0.18)]">
        {/* Icono de alerta */}
        <div
          aria-hidden
          className="w-14 h-14 rounded-[14px] bg-rose-bg text-rose inline-flex items-center justify-center text-[28px] font-extrabold mb-[18px]"
        >
          !
        </div>

        <h1 className="text-[22px] font-extrabold tracking-[-0.4px] m-0 text-text">
          Tu cuenta está suspendida
        </h1>

        <p className="mt-2.5 text-[14.5px] leading-[1.55] text-muted">
          Hola <strong className="text-text">{profile.companyName}</strong>. El
          acceso al panel y a las publicaciones de prácticas fue suspendido por
          el administrador de PractiX.
        </p>

        {/* Motivo */}
        <div
          className={[
            "mt-[18px] p-[14px_16px] rounded-lg border-l-[3px]",
            hasReason
              ? "bg-amber-bg border-l-amber"
              : "bg-dark/[0.04] border-l-subtle",
          ].join(" ")}
        >
          <p
            className={[
              "m-0 text-[11px] font-extrabold tracking-[0.8px] uppercase",
              hasReason ? "text-amber" : "text-subtle",
            ].join(" ")}
          >
            Motivo
          </p>
          <p
            className={[
              "m-0 mt-1 text-[14px] leading-[1.55] whitespace-pre-wrap",
              hasReason ? "text-text" : "text-muted italic",
            ].join(" ")}
          >
            {profile.suspensionReason ??
              "El administrador no especificó un motivo público. Contactá al soporte para más información."}
          </p>
        </div>

        {/* Fecha */}
        {suspendedAtLabel ? (
          <p className="mt-3.5 text-[12.5px] text-subtle">
            Suspendida el {suspendedAtLabel}
          </p>
        ) : null}

        {/* CTA apelar */}
        <div className="mt-[22px] p-[16px_18px] bg-accent-bg border border-accent-bdr rounded-xl">
          <p className="m-0 text-[13.5px] font-bold text-text">
            ¿Querés apelar o pedir más información?
          </p>
          <p className="m-0 mt-1.5 text-[14px] text-muted leading-[1.55]">
            Contactá al administrador a{" "}
            <a
              href={`mailto:${ADMIN_EMAIL}`}
              className="text-accent font-bold hover:underline"
            >
              {ADMIN_EMAIL}
            </a>
            .
          </p>
        </div>

        {/* Sign out */}
        <div className="mt-[22px]">
          <SignOutButton />
        </div>
      </main>
    </div>
  );
}
