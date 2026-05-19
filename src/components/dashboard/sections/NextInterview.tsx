import Link from "next/link";
import { Icon } from "../Icon";
import { CoLogo } from "../atoms/CoLogo";

export type InterviewData = {
  applicationId: string;
  internshipId: string;
  co: string;
  logo: string;
  logoUrl?: string | null;
  logoBg: string;
  logoFg: string;
  role: string;
  duration?: string | null;
  whenLabel: string;
  timeLabel?: string | null;
  channelLabel?: string | null;
  meetingLink?: string | null;
};

export function NextInterview({
  interview,
}: {
  interview: InterviewData | null;
}) {
  if (!interview) {
    return (
      <section className="bg-surface border border-border rounded-[18px] p-[18px] flex flex-col gap-2">
        <div className="flex items-center gap-[9px]">
          <span className="w-[30px] h-[30px] rounded-[9px] bg-accent-bg flex items-center justify-center">
            <Icon name="cal" size={15} color="var(--color-accent)" />
          </span>
          <h3 className="text-[14px] font-extrabold text-text tracking-[-0.3px]">
            Sin entrevistas próximas
          </h3>
        </div>
        <p className="text-[12px] text-muted leading-[1.5]">
          Cuando una empresa te agende una entrevista, vas a verla acá.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-dark text-white rounded-[18px] p-[18px] relative overflow-hidden">
      {/* Glow de fondo — radial con token de accent */}
      <div className="absolute -bottom-10 -right-[30px] w-[180px] h-[180px] pointer-events-none blur-[20px] [background:radial-gradient(circle,color-mix(in_srgb,var(--color-accent)_25%,transparent)_0%,transparent_60%)]" />

      <div className="relative">
        {/* Label "Próxima entrevista" con punto animado */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-[pulseDot_1.5s_ease_infinite]" />
          <span className="text-[10px] font-extrabold tracking-[0.6px] text-accent-hi uppercase">
            Próxima entrevista
          </span>
        </div>

        {/* Header clickeable → detalle de la práctica */}
        <Link
          href={`/practicas/${interview.internshipId}`}
          className="flex items-center gap-3 mb-3.5 no-underline text-inherit rounded-[10px] py-1"
          aria-label={`Ver detalle de ${interview.role} en ${interview.co}`}
        >
          <CoLogo
            logo={interview.logo}
            logoUrl={interview.logoUrl}
            logoBg={interview.logoBg}
            logoFg={interview.logoFg}
            size={42}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15.5px] font-extrabold tracking-[-0.3px]">
              {interview.co}
            </h3>
            <p className="text-[12px] text-white/60 mt-px truncate">
              {interview.role}
              {interview.duration ? ` · ${interview.duration}` : ""}
            </p>
          </div>
          <span className="text-[11px] font-bold text-white/70 whitespace-nowrap shrink-0">
            {interview.whenLabel}
          </span>
          <Icon
            name="arr"
            size={14}
            color="rgba(255,255,255,.45)"
            strokeWidth={2.2}
          />
        </Link>

        {(interview.timeLabel || interview.channelLabel) && (
          <div className="flex gap-3.5 flex-wrap px-3 py-2.5 bg-white/5 border border-white/[.08] rounded-[11px] mb-3">
            {interview.timeLabel && (
              <div className="flex items-center gap-[7px]">
                <Icon name="clock" size={13} color="rgba(255,255,255,.7)" />
                <span className="text-[12px] font-semibold">
                  {interview.timeLabel}
                </span>
              </div>
            )}
            {interview.channelLabel && (
              <div className="flex items-center gap-[7px]">
                <Icon name="video" size={13} color="rgba(255,255,255,.7)" />
                <span className="text-[12px] font-semibold">
                  {interview.channelLabel}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
