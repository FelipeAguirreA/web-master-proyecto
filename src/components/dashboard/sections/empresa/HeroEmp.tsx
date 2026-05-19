import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";
import type { HeroKpis } from "./types";

type HeroEmpProps = {
  today: string;
  recruiterName: string;
  kpis: HeroKpis;
  onPublish: () => void;
};

export function HeroEmp({
  today,
  recruiterName,
  kpis,
  onPublish,
}: HeroEmpProps) {
  const items = [
    { k: "Postulantes nuevos", v: kpis.nuevos, tone: "text-accent-hi" },
    { k: "Prácticas activas", v: kpis.activas, tone: "text-subtle" },
    { k: "Entrevistas hoy", v: kpis.hoy, tone: "text-green" },
    {
      k: "Tasa de respuesta",
      v: kpis.tasa !== null ? `${kpis.tasa}%` : "—",
      tone: "text-[#A78BFA]", // violeta de diseño — no hay token purple-text en el @theme
    },
  ] as const;

  return (
    <section className="bg-dark text-white rounded-[22px] p-6 sm:p-7 mb-[18px] relative overflow-hidden">
      {/* Glow de fondo */}
      <div
        aria-hidden
        className="absolute -top-24 -right-14 w-[380px] h-[380px] pointer-events-none
                   [background:radial-gradient(circle,color-mix(in_srgb,var(--color-accent)_25%,transparent)_0%,transparent_65%)]"
      />
      {/* Dot pattern */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none
                   [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,.05)_1px,transparent_0)]
                   [background-size:22px_22px]"
      />

      <div className="relative flex flex-col lg:flex-row justify-between gap-6">
        {/* Texto + acciones */}
        <div className="max-w-[620px]">
          <p className="text-[11.5px] font-extrabold text-accent-hi tracking-[0.6px] uppercase mb-2">
            {today}
          </p>
          <h1 className="text-[clamp(1.7rem,2.8vw,2.2rem)] font-extrabold tracking-[-1.4px] leading-[1.1] mb-3 break-words [overflow-wrap:anywhere]">
            Hola {recruiterName},{" "}
            {kpis.nuevos > 0 ? (
              <>
                tienes{" "}
                <span className="text-accent-hi">
                  {kpis.nuevos} postulantes
                </span>{" "}
                por revisar.
              </>
            ) : kpis.hoy > 0 ? (
              <>
                tienes{" "}
                <span className="text-accent-hi">
                  {kpis.hoy} entrevista{kpis.hoy === 1 ? "" : "s"}
                </span>{" "}
                hoy.
              </>
            ) : (
              <>todo al día por ahora.</>
            )}
          </h1>
          <div className="flex gap-2.5 flex-wrap mt-1.5">
            <button
              type="button"
              onClick={onPublish}
              className="px-4 py-2.5 bg-gradient-to-br from-accent to-accent-hi text-white rounded-[11px] text-[13px] font-extrabold cursor-pointer inline-flex items-center gap-1.5
                         shadow-[0_6px_18px_color-mix(in_srgb,var(--color-accent)_33%,transparent)]"
            >
              <Icon name="plus" size={14} color="#fff" />
              Publicar nueva práctica
            </button>
            {kpis.hoy > 0 && (
              <Link
                href="/dashboard/empresa/calendar"
                className="px-4 py-2.5 bg-white/10 border border-white/16 text-white rounded-[11px] text-[13px] font-bold inline-flex items-center gap-1.5 no-underline"
              >
                <Icon name="cal" size={13} color="#fff" />
                Ver agenda
              </Link>
            )}
          </div>
        </div>

        {/* KPI grid: 1 col mobile, 2 col sm+ */}
        <div className="grid grid-cols-2 gap-2.5 min-w-0 sm:min-w-[280px] self-center">
          {items.map((it) => (
            <div
              key={it.k}
              className="px-3.5 py-3 bg-white/[0.06] border border-white/10 rounded-[13px]"
            >
              <div className="text-[10.5px] font-bold tracking-[0.5px] text-white/55 uppercase">
                {it.k}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className={`text-2xl font-black tracking-[-0.8px] leading-none text-white`}
                >
                  {it.v}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
