import Link from "next/link";
import { PublicNav } from "@/components/layout/PublicNav";
import { ADMIN_EMAIL } from "@/lib/constants";
import { Icon } from "@/components/dashboard/Icon";
import { AmbientMesh } from "./AmbientMesh";
import type { Session } from "next-auth";

interface EmptyStateProps {
  session: Session | null;
}

export function EmptyState({ session }: EmptyStateProps) {
  return (
    <div className="relative min-h-screen bg-bg text-text font-[var(--font-onest),ui-sans-serif,system-ui] overflow-x-hidden">
      <AmbientMesh />
      <PublicNav
        isLoggedIn={!!session}
        isAdmin={session?.user.email === ADMIN_EMAIL}
      />
      <main className="relative z-10 pt-[140px] pb-20">
        <div className="max-w-[560px] mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[18px] bg-gradient-to-br from-accent-bg to-cream border border-accent-bdr mb-5">
            <Icon name="briefc" size={26} color="var(--color-accent)" />
          </div>
          <h1 className="text-[24px] font-extrabold text-text mb-2 tracking-[-0.6px]">
            Esta práctica ya no está disponible
          </h1>
          <p className="text-[14px] text-muted leading-[1.55] mb-7">
            La empresa dio de baja esta publicación o el enlace que seguiste
            apunta a una práctica que nunca existió.
          </p>
          <Link
            href="/practicas"
            className="inline-flex items-center gap-2 bg-text text-white px-5 py-3 rounded-[12px] text-[14px] font-bold no-underline hover:opacity-90 transition-opacity"
          >
            ← Ver todas las prácticas
          </Link>
        </div>
      </main>
    </div>
  );
}
