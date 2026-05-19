import { Tag } from "@/components/dashboard/atoms/Tag";
import { Block } from "./Block";
import type { InternshipDetail } from "./types";

interface DetailBodyProps {
  internship: InternshipDetail;
}

export function DetailBody({ internship }: DetailBodyProps) {
  return (
    <div className="flex flex-col gap-[18px] min-w-0">
      {/* Description */}
      <Block title="Sobre la práctica">
        <p className="break-words [overflow-wrap:anywhere] text-[14px] text-muted leading-[1.65] whitespace-pre-wrap">
          {internship.description}
        </p>
      </Block>

      {/* Responsibilities */}
      {(internship.responsibilities?.length ?? 0) > 0 && (
        <Block title="Lo que harás" sub="Las tareas concretas del día a día.">
          <ol
            className="flex flex-col gap-2 list-none p-0 m-0"
            style={{ counterReset: "task" }}
          >
            {internship.responsibilities!.map((task, i) => (
              <li
                key={i}
                className="flex items-start gap-3 px-3 py-[10px] bg-surface border border-border rounded-[11px]"
              >
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent-bg text-accent text-[12px] font-extrabold inline-flex items-center justify-center leading-none">
                  {i + 1}
                </span>
                <span className="break-words [overflow-wrap:anywhere] text-[13px] text-text leading-[1.55] flex-1 min-w-0">
                  {task}
                </span>
              </li>
            ))}
          </ol>
        </Block>
      )}

      {/* Requirements + Skills */}
      {internship.requirements.length > 0 && (
        <Block title="Requisitos" sub="Lo que necesitas para postular.">
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {internship.requirements.map((req, i) => (
              <li
                key={i}
                className="flex items-start gap-[10px] px-3 py-[10px] bg-surface border border-border rounded-[11px]"
              >
                <span className="shrink-0 text-[10px] font-extrabold text-accent bg-accent-bg px-2 py-[3px] rounded-[5px] tracking-[0.4px]">
                  INDISPENSABLE
                </span>
                <span className="break-words [overflow-wrap:anywhere] text-[13px] text-text leading-[1.5] flex-1 min-w-0">
                  {req}
                </span>
              </li>
            ))}
          </ul>

          {internship.skills.length > 0 && (
            <div className="mt-4">
              <h4 className="text-[13px] font-extrabold text-text mb-[9px] uppercase tracking-[0.4px]">
                Skills
              </h4>
              <div className="flex gap-[7px] flex-wrap">
                {internship.skills.map((s) => (
                  <Tag key={s}>{s}</Tag>
                ))}
              </div>
            </div>
          )}
        </Block>
      )}
    </div>
  );
}
