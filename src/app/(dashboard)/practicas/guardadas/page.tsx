"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { PracticaCard } from "@/components/dashboard/sections/PracticaCard";
import { PracticaCardSkeleton } from "@/components/dashboard/sections/Skeletons";
import { Icon } from "@/components/dashboard/Icon";
import { toCard, type ApiInternship } from "@/app/practicas/utils";

export default function GuardadasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState<ApiInternship[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Solo estudiantes pueden tener guardadas. Si entra una empresa o
  // visitante, mandamos a login con callback para volver acá tras loggear.
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login?callbackUrl=/practicas/guardadas");
      return;
    }
    if (session.user.role !== "STUDENT") {
      router.replace("/practicas");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!session || session.user.role !== "STUDENT") return;
    Promise.all([
      fetchWithRefresh("/api/internships/saved", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetchWithRefresh("/api/applications/my", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(
        ([savedData, apps]: [
          ApiInternship[],
          Array<{ internship?: { id: string } | null }>,
        ]) => {
          setSaved(savedData ?? []);
          const ids = new Set<string>();
          for (const a of apps ?? []) {
            if (a.internship?.id) ids.add(a.internship.id);
          }
          setAppliedIds(ids);
        },
      )
      .finally(() => setLoading(false));
  }, [session]);

  const cards = saved.map((it) =>
    toCard(it, Math.round(it.matchScore ?? 0), appliedIds.has(it.id)),
  );

  return (
    <div className="px-4 sm:px-6 md:px-8 py-5 md:py-7 max-w-[1280px] w-full mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard/estudiante"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted font-semibold mb-4 no-underline"
      >
        <Icon name="arr" size={12} color="currentColor" />
        Volver al dashboard
      </Link>

      {/* Hero */}
      <section className="flex items-end justify-between gap-5 mb-6 flex-wrap">
        <div>
          <h1 className="text-[clamp(1.7rem,2.8vw,2.2rem)] font-extrabold tracking-[-1px] text-text leading-[1.1] mb-2">
            Mis guardadas
          </h1>
          <p className="text-[14px] text-muted leading-[1.55] max-w-[560px]">
            {loading
              ? "Cargando…"
              : saved.length === 0
                ? "Todavía no guardaste ninguna práctica."
                : `${saved.length} práctica${saved.length === 1 ? "" : "s"} marcada${saved.length === 1 ? "" : "s"} para revisar después.`}
          </p>
        </div>
      </section>

      {/* Contenido principal */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {Array.from({ length: 6 }, (_, i) => (
            <PracticaCardSkeleton key={i} />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-[16px] p-10 text-center text-muted text-[13.5px] leading-[1.6]">
          <p className="text-text font-bold text-[14px] mb-1.5">
            Sin guardadas todavía
          </p>
          Cuando encuentres una práctica que te interese, presiona{" "}
          <b>Guardar</b> en su detalle. Aparece acá para revisar después sin
          postular ya.
          <div className="mt-4">
            <Link
              href="/practicas"
              className="inline-flex items-center gap-1.5 bg-accent text-white px-[18px] py-2.5 rounded-[10px] text-[13px] font-bold no-underline"
            >
              Explorar prácticas
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {cards.map((p) => (
            <PracticaCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
