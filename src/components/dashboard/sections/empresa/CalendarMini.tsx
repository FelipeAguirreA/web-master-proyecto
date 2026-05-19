import { useMemo } from "react";
import { startOfDay, startOfWeek } from "./utils";
import type { Interview } from "./types";

// Fragment local — evita importar React.Fragment explícito con key
function Frag({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

type CalendarMiniProps = {
  interviews: Interview[];
};

export function CalendarMini({ interviews }: CalendarMiniProps) {
  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const days = useMemo(() => {
    const labels = ["Lun", "Mar", "Mié", "Jue", "Vie"];
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return { label: labels[i], n: d.getDate(), date: d };
    });
  }, [weekStart]);

  const hours = ["09", "11", "13", "15", "17"];

  const eventsByDayHour: Record<string, Interview[]> = {};
  for (const iv of interviews) {
    const d = new Date(iv.scheduledAt);
    if (d < days[0].date) continue;
    const last = new Date(days[4].date);
    last.setDate(last.getDate() + 1);
    if (d >= last) continue;
    const dayIdx = days.findIndex(
      (x) =>
        x.date.getFullYear() === d.getFullYear() &&
        x.date.getMonth() === d.getMonth() &&
        x.date.getDate() === d.getDate(),
    );
    if (dayIdx < 0) continue;
    const hourBucket = String(d.getHours()).padStart(2, "0");
    const matched = hours.find(
      (h) => Math.abs(Number(h) - Number(hourBucket)) < 2,
    );
    if (!matched) continue;
    const key = `${dayIdx}-${matched}`;
    eventsByDayHour[key] = [...(eventsByDayHour[key] ?? []), iv];
  }

  const today = startOfDay(new Date());
  const todayIdx = days.findIndex(
    (x) =>
      x.date.getFullYear() === today.getFullYear() &&
      x.date.getMonth() === today.getMonth() &&
      x.date.getDate() === today.getDate(),
  );

  return (
    <section className="bg-surface border border-border rounded-[18px] p-[18px] sm:p-5">
      <header className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-[14.5px] font-extrabold text-text tracking-[-0.3px]">
            Esta semana
          </h2>
          <p className="text-[11px] text-subtle mt-0.5">
            {interviews.length} entrevista{interviews.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      {/*
        Calendar grid: 32px columna de horas + 5 columnas de días.
        En mobile (<640px) el grid puede ser muy estrecho para 5 columnas;
        usamos overflow-x-auto para que scrollee horizontal en lugar de
        colapsar — mantiene la legibilidad del mini-calendario.
      */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div
          className="grid gap-1 min-w-[280px]"
          style={{ gridTemplateColumns: "32px repeat(5, 1fr)" }}
        >
          {/* Fila de encabezado: celda vacía + días */}
          <div />
          {days.map((d, i) => (
            <div
              key={d.label}
              className={[
                "text-center text-[10.5px] font-extrabold tracking-[0.3px] py-1 rounded-[6px]",
                i === todayIdx
                  ? "text-accent bg-accent-bg"
                  : "text-subtle bg-transparent",
              ].join(" ")}
            >
              <div className="uppercase">{d.label}</div>
              <div
                className={[
                  "text-[13px] font-black mt-0.5",
                  i === todayIdx ? "text-accent" : "text-text",
                ].join(" ")}
              >
                {d.n}
              </div>
            </div>
          ))}

          {/* Filas de horas */}
          {hours.map((h) => (
            <Frag key={h}>
              <div className="text-[10px] text-subtle pt-1.5 text-right">
                {h}
              </div>
              {[0, 1, 2, 3, 4].map((di) => {
                const ev = eventsByDayHour[`${di}-${h}`]?.[0];
                return (
                  <div
                    key={di}
                    className="h-8 border-t border-dashed border-border p-0.5 relative"
                  >
                    {ev && (
                      <div className="h-full px-1 bg-accent-bg border-l-2 border-accent rounded-[4px] leading-[1.1] overflow-hidden">
                        <div className="text-[9px] font-extrabold text-accent whitespace-nowrap overflow-hidden text-ellipsis">
                          {new Date(ev.scheduledAt).toLocaleTimeString(
                            "es-CL",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </div>
                        <div className="text-[9px] text-muted whitespace-nowrap overflow-hidden text-ellipsis mt-0.5">
                          {ev.student.name.split(" ")[0]}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </Frag>
          ))}
        </div>
      </div>
    </section>
  );
}
