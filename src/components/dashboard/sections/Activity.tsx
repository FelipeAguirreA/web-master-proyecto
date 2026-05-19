import type { CSSProperties } from "react";

export type ActivityItem = {
  id: string;
  icon: string;
  /** Hex color for the icon text (genuinely dynamic per item type) */
  color: string;
  /** Hex background for the icon chip (genuinely dynamic per item type) */
  bg: string;
  /** Plain text label shown as the activity description */
  label: string;
  when: string;
};

export function Activity({ items }: { items: ActivityItem[] }) {
  return (
    <section className="bg-surface border border-border rounded-[18px] p-[18px]">
      <h3 className="text-[14px] font-extrabold text-text tracking-[-0.3px] mb-3.5">
        Actividad reciente
      </h3>
      {items.length === 0 ? (
        <p className="text-[12px] text-subtle leading-[1.5]">
          Cuando pase algo importante con tus postulaciones, lo vas a ver acá.
        </p>
      ) : (
        <ul className="flex flex-col gap-[11px] list-none p-0">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-2.5">
              <span
                className="shrink-0 w-[26px] h-[26px] rounded-[8px] flex items-center justify-center font-black text-[13px]"
                style={
                  {
                    background: a.bg,
                    color: a.color,
                  } as CSSProperties
                }
              >
                {a.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] text-text leading-[1.45]">
                  {a.label}
                </p>
                <p className="text-[10.5px] text-subtle mt-0.5 font-medium">
                  {a.when}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
