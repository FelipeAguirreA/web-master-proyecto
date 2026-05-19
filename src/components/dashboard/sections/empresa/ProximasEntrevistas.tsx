import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";
import { startOfDay } from "./utils";
import type { Interview } from "./types";

type ProximasEntrevistasProps = {
  interviews: Interview[];
  loading: boolean;
};

export function ProximasEntrevistas({
  interviews,
  loading,
}: ProximasEntrevistasProps) {
  return (
    <section className="bg-surface border border-border rounded-[18px] p-[18px] sm:p-5">
      <header className="flex items-center justify-between mb-3 gap-2.5">
        <div>
          <h2 className="text-[14.5px] font-extrabold text-text tracking-[-0.3px]">
            Entrevistas próximas
          </h2>
          <p className="text-[11px] text-subtle mt-0.5">
            {interviews.length === 0
              ? "Sin agendadas"
              : `${interviews.length} próxima${interviews.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          href="/dashboard/empresa/calendar"
          className="text-accent text-[11.5px] font-bold inline-flex items-center gap-1 no-underline"
        >
          Calendario <Icon name="cal" size={11} color="var(--color-accent)" />
        </Link>
      </header>

      {loading ? (
        <p className="text-[12px] text-muted">Cargando…</p>
      ) : interviews.length === 0 ? (
        <p className="text-[12px] text-muted leading-relaxed">
          Cuando agendes una entrevista desde el chat va a aparecer acá.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {interviews.slice(0, 3).map((e) => {
            const d = new Date(e.scheduledAt);
            const todayStart = startOfDay(new Date());
            const dayStart = startOfDay(d);
            const diffDays = Math.round(
              (dayStart.getTime() - todayStart.getTime()) / 86_400_000,
            );
            const day =
              diffDays === 0
                ? "Hoy"
                : diffDays === 1
                  ? "Mañana"
                  : d.toLocaleDateString("es-CL", { weekday: "short" });
            const time = d.toLocaleTimeString("es-CL", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const isVideo = !!e.meetingLink;
            const confirmed = e.status === "SCHEDULED";

            return (
              <div
                key={e.id}
                className={[
                  "flex items-center gap-[11px] px-3 py-2.5 bg-black/[0.025] rounded-[11px]",
                  confirmed
                    ? "border-l-[3px] border-green"
                    : "border-l-[3px] border-amber",
                ].join(" ")}
              >
                {/* Columna fecha/hora */}
                <div className="flex flex-col items-center min-w-[56px]">
                  <span className="text-[10.5px] font-extrabold text-subtle uppercase tracking-[0.4px]">
                    {day}
                  </span>
                  <span className="text-[14px] font-black text-text tracking-[-0.4px] leading-[1.1]">
                    {time}
                  </span>
                  <span className="text-[10px] text-subtle mt-0.5">
                    {e.durationMins} min
                  </span>
                </div>

                {/* Info entrevista */}
                <div className="flex-1 min-w-0 border-l border-border pl-[11px]">
                  <div className="text-[12.5px] font-bold text-text">
                    {e.student.name}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                    {e.internship.title}
                  </div>
                </div>

                {/* CTA */}
                {isVideo && e.meetingLink ? (
                  <a
                    href={e.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-accent text-white rounded-lg text-[11px] font-bold whitespace-nowrap no-underline"
                  >
                    Unirse
                  </a>
                ) : (
                  <Link
                    href="/dashboard/empresa/calendar"
                    className="px-2.5 py-1.5 bg-surface text-text border border-border rounded-lg text-[11px] font-bold whitespace-nowrap no-underline"
                  >
                    Ver
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
