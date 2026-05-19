import Link from "next/link";
import { Icon } from "../Icon";
import { ScoreVis } from "../atoms/ScoreVis";

export type CVTip = {
  title: string;
  body: string;
  pts: string;
  done: boolean;
};

export function CVPanel({ cvPct, tips }: { cvPct: number; tips: CVTip[] }) {
  return (
    <section className="bg-gradient-to-br from-cream to-surface border border-accent-bdr rounded-[18px] p-[18px] relative overflow-hidden">
      {/* Glow decorativo — radial genuinamente dinámico con token */}
      <div className="absolute -top-10 -right-[30px] w-40 h-40 pointer-events-none [background:radial-gradient(circle,color-mix(in_srgb,var(--color-accent)_15%,transparent)_0%,transparent_65%)]" />

      <div className="relative">
        <div className="flex items-center gap-3.5 mb-3.5">
          <ScoreVis score={cvPct} style="ring" size={70} label={false} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[14.5px] font-extrabold text-text tracking-[-0.3px]">
              Tu CV
            </h3>
            <p className="text-[12px] text-muted leading-[1.5] mt-0.5">
              {cvPct >= 90 ? (
                <>Tu CV está en el top. Excelente trabajo.</>
              ) : cvPct === 0 ? (
                <>
                  <Link href="/perfil" className="text-accent font-bold">
                    Sube tu CV
                  </Link>{" "}
                  para empezar a recibir matches.
                </>
              ) : (
                <>
                  Súbelo a <b className="text-accent">92%</b> para entrar al top
                  de Falabella.
                </>
              )}
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-2 list-none p-0">
          {tips.map((t, i) => (
            <li
              key={i}
              className={[
                "flex items-center gap-2.5 py-[9px] px-[11px] rounded-[11px]",
                t.done
                  ? "bg-green-bg border border-transparent"
                  : "bg-surface border border-border",
              ].join(" ")}
            >
              <span
                className={[
                  "w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0",
                  t.done
                    ? "bg-green border border-transparent"
                    : "bg-surface border border-border",
                ].join(" ")}
              >
                {t.done ? (
                  <Icon name="check" size={11} color="#fff" strokeWidth={3} />
                ) : (
                  <Icon name="plus" size={11} color="var(--color-muted)" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className={[
                    "text-[12.5px] font-semibold leading-[1.3]",
                    t.done ? "text-muted line-through" : "text-text",
                  ].join(" ")}
                >
                  {t.title}
                </div>
                {!t.done && (
                  <div className="text-[11px] text-subtle mt-px leading-[1.4]">
                    {t.body}
                  </div>
                )}
              </div>
              {!t.done && (
                <span className="text-[11px] font-extrabold text-accent bg-accent-bg py-0.5 px-[7px] rounded-[6px] shrink-0">
                  {t.pts}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
