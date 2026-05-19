"use client";

import { Icon } from "../dashboard/Icon";
import type { CompletenessItem } from "@/lib/cv-progress";

type Props = {
  items: CompletenessItem[];
};

export function CompletenessCard({ items }: Props) {
  const totalPts = items.reduce((sum, i) => sum + i.pts, 0);
  const earnedPts = items
    .filter((i) => i.done)
    .reduce((sum, i) => sum + i.pts, 0);
  const pct = totalPts > 0 ? Math.round((earnedPts / totalPts) * 100) : 0;

  return (
    <section className="bg-surface border border-border rounded-[18px] p-4 sm:p-[18px]">
      <div className="flex items-center justify-between mb-3.5 gap-2.5">
        <h3 className="text-sm font-extrabold text-text tracking-[-0.3px]">
          Tu perfil al {pct}%
        </h3>
        <span className="text-[11px] font-bold text-muted bg-bg px-2 py-[3px] rounded-[6px]">
          {earnedPts}/{totalPts} pts
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-black/5 rounded-full overflow-hidden mb-3.5">
        <div
          className="h-full bg-gradient-to-r from-accent to-accent-hi rounded-full transition-[width] duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="list-none p-0 flex flex-col gap-[7px]">
        {items.map((c) => (
          <li
            key={c.key}
            className={[
              "flex items-center gap-[9px] px-2.5 py-2 rounded-[9px] border",
              c.done ? "bg-green-bg border-transparent" : "bg-bg border-border",
            ].join(" ")}
          >
            <span
              className={[
                "w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0",
                c.done
                  ? "bg-green border-transparent"
                  : "bg-surface border-border",
              ].join(" ")}
            >
              {c.done ? (
                <Icon name="check" size={10} color="#fff" strokeWidth={3} />
              ) : (
                <Icon name="plus" size={10} color="var(--color-muted)" />
              )}
            </span>
            <span
              className={[
                "flex-1 text-[11.5px] font-semibold leading-[1.35]",
                c.done ? "text-muted line-through" : "text-text",
              ].join(" ")}
            >
              {c.title}
            </span>
            {!c.done && (
              <span className="text-[10px] font-extrabold text-accent bg-accent-bg px-1.5 py-[2px] rounded-[5px]">
                +{c.pts}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
