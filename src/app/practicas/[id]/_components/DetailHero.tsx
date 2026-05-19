import { CoLogo } from "@/components/dashboard/atoms/CoLogo";
import { Icon } from "@/components/dashboard/Icon";
import type { InternshipDetail } from "./types";

const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

interface DetailHeroProps {
  internship: InternshipDetail;
  co: string;
  color: { bg: string; fg: string };
  companyInitials: string;
  topLabel: string | null;
  isNew: boolean;
  onShowCompany: () => void;
}

export function DetailHero({
  internship,
  co,
  color,
  companyInitials,
  topLabel,
  isNew,
  onShowCompany,
}: DetailHeroProps) {
  const modeLabel = MODALITY_LABEL[internship.modality] ?? internship.modality;

  return (
    <section className="bg-dark text-white rounded-[22px] p-5 sm:p-8 mb-5 relative overflow-hidden">
      {/* accent glow */}
      <div
        className="absolute -top-20 -right-12 w-[340px] h-[340px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(255,106,61,0.25), transparent 65%)",
        }}
      />
      {/* dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px,rgba(255,255,255,.04) 1px,transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative flex items-start gap-4 sm:gap-5 flex-wrap">
        {/* Logo */}
        <CoLogo
          logo={companyInitials}
          logoUrl={internship.company.logo}
          logoBg={color.bg}
          logoFg={color.fg}
          size={72}
        />

        {/* Title block */}
        <div className="flex-1 min-w-[200px] sm:min-w-[240px]">
          <div className="flex items-center gap-[9px] mb-2 flex-wrap">
            <span className="text-[13px] font-bold text-white/70">{co}</span>
            {topLabel && (
              <span className="text-[10px] font-extrabold text-accent-hi bg-[rgba(255,154,106,.18)] px-2 py-[2px] rounded-[5px] tracking-[0.5px]">
                {topLabel}
              </span>
            )}
            {isNew && (
              <span className="text-[10px] font-extrabold text-[#0A0909] bg-accent-hi px-2 py-[2px] rounded-[5px] tracking-[0.5px]">
                NUEVA
              </span>
            )}
            <span className="text-[11.5px] text-white/55">
              · {internship.area}
            </span>
          </div>

          <h1 className="break-words [overflow-wrap:anywhere] font-extrabold tracking-[-1.2px] leading-[1.1] mb-[10px] text-[clamp(1.6rem,3vw,2.1rem)] [text-wrap:balance]">
            {internship.title}
          </h1>

          <div className="flex gap-[18px] flex-wrap mt-4 text-[12.5px] text-white/70">
            <span className="inline-flex items-center gap-[6px]">
              <Icon name="pin" size={14} color="rgba(255,255,255,.5)" />
              {modeLabel} · {internship.location}
            </span>
            <span className="inline-flex items-center gap-[6px]">
              <Icon name="briefc" size={14} color="rgba(255,255,255,.5)" />
              {internship.duration}
            </span>
          </div>
        </div>

        {/* Company button */}
        <div className="flex flex-col gap-2 ml-auto min-w-[160px]">
          <button
            type="button"
            onClick={onShowCompany}
            className="min-h-[44px] px-4 py-[10px] bg-white/[.08] border border-white/[.14] text-white rounded-[11px] text-[13px] font-bold cursor-pointer hover:bg-white/[.12] transition-colors"
          >
            Ver sobre la empresa
          </button>
        </div>
      </div>
    </section>
  );
}
