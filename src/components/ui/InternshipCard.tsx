import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
import type { Internship } from "@/types";

type InternshipWithCompany = Internship & {
  company: { companyName: string; logo: string | null };
  matchScore?: number | null;
};

const MODALITY_LABELS: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

const LOGO_GRADIENTS = [
  "from-[#FFE9B3] to-[#FFC84A]",
  "from-[#C5E8F5] to-[#4DB8E0]",
  "from-[#FFCDCD] to-[#FF6B6B]",
  "from-[#D3E9C7] to-[#6BB85A]",
  "from-[#FFE4D2] to-[#FF9B6A]",
  "from-[#E0C5FF] to-[#B890FF]",
  "from-[#BFD7FF] to-[#8AB8FF]",
  "from-[#FFD6B8] to-[#FFAA7F]",
];

function pickGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return LOGO_GRADIENTS[Math.abs(hash) % LOGO_GRADIENTS.length];
}

function scoreColors(score: number) {
  if (score >= 90) {
    return {
      text: "text-[#1A8F3C]",
      bar: "bg-gradient-to-r from-[#28C840] to-[#1A8F3C]",
      pillBg: "bg-[#E7F8EA]",
      pillText: "text-[#1A8F3C]",
    };
  }
  if (score >= 80) {
    return {
      text: "text-[#FF6A3D]",
      bar: "bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A]",
      pillBg: "bg-[#FFF3EC]",
      pillText: "text-[#FF6A3D]",
    };
  }
  return {
    text: "text-[#6D6A63]",
    bar: "bg-[#C9C6BF]",
    pillBg: "bg-[#F4F3EF]",
    pillText: "text-[#6D6A63]",
  };
}

export default function InternshipCard({
  internship,
}: {
  internship: InternshipWithCompany;
}) {
  const modality = MODALITY_LABELS[internship.modality];
  const initial = internship.company.companyName.charAt(0).toUpperCase();
  const gradient = pickGradient(internship.company.companyName);
  const score =
    internship.matchScore != null ? Math.round(internship.matchScore) : null;
  const colors = score != null ? scoreColors(score) : null;

  return (
    <Link
      href={`/practicas/${internship.id}`}
      className="group relative flex flex-col bg-white rounded-[20px] border border-black/[0.06] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#FF6A3D]/30 hover:shadow-[0_12px_32px_-8px_rgba(20,15,10,0.12)] transition-all duration-200"
    >
      {/* Match score — top right */}
      {score != null && score > 0 && colors && (
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
          <div className="flex items-baseline gap-0.5">
            <span
              className={`text-[16px] font-bold tracking-tight ${colors.text}`}
            >
              {score}
            </span>
            <span className="text-[10.5px] text-[#9B9891] font-medium">%</span>
          </div>
          <div className="w-16 h-1 bg-[#F4F3EF] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${colors.bar}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}

      {/* Header: logo + title */}
      <div className="flex items-start gap-3.5 mb-3 pr-16">
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-[15px] shadow-[0_2px_6px_-1px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.25)] shrink-0 overflow-hidden`}
        >
          {internship.company.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={internship.company.logo}
              alt={internship.company.companyName}
              className="w-full h-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-[14.5px] font-semibold tracking-[-0.01em] text-[#0A0909] leading-[1.3] line-clamp-2 group-hover:text-[#FF6A3D] transition-colors">
            {internship.title}
          </h3>
          <p className="text-[12.5px] text-[#6D6A63] mt-0.5 truncate">
            {internship.company.companyName}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-[12.5px] text-[#6D6A63] leading-[1.55] line-clamp-2 mb-4">
        {internship.description}
      </p>

      {/* Skills */}
      {internship.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {internship.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="text-[10.5px] font-medium bg-[#F4F3EF] text-[#4A4843] px-2 py-0.5 rounded-md"
            >
              {skill}
            </span>
          ))}
          {internship.skills.length > 4 && (
            <span className="text-[10.5px] font-medium text-[#9B9891] px-2 py-0.5">
              +{internship.skills.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 pt-3 mt-auto border-t border-black/[0.05] text-[11px] text-[#6D6A63]">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[90px]">{internship.location}</span>
        </span>
        <span className="w-px h-3 bg-black/[0.08]" />
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {internship.duration}
        </span>
        {modality && (
          <>
            <span className="w-px h-3 bg-black/[0.08]" />
            <span className="font-medium text-[#4A4843]">{modality}</span>
          </>
        )}
        <span className="ml-auto text-[11px] text-[#9B9891] group-hover:text-[#FF6A3D] transition-colors">
          →
        </span>
      </div>
    </Link>
  );
}
