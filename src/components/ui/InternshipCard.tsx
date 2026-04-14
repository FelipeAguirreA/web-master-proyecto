import Link from "next/link";
import { MapPin, Clock, ArrowRight, Sparkles } from "lucide-react";
import type { Internship } from "@/types";

type InternshipWithCompany = Internship & {
  company: { companyName: string; logo: string | null };
  matchScore?: number | null;
};

const MODALITY_LABELS: Record<string, { label: string; className: string }> = {
  REMOTE: { label: "Remoto", className: "bg-green-50 text-green-700" },
  ONSITE: { label: "Presencial", className: "bg-blue-50 text-blue-700" },
  HYBRID: { label: "Híbrido", className: "bg-purple-50 text-purple-700" },
};

export default function InternshipCard({
  internship,
}: {
  internship: InternshipWithCompany;
}) {
  const modality = MODALITY_LABELS[internship.modality] ?? null;
  const initial = internship.company.companyName.charAt(0).toUpperCase();

  return (
    <Link
      href={`/practicas/${internship.id}`}
      className="group flex flex-col gap-5 bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
    >
      {/* Header: logo + title + match badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl font-black text-brand-600 shrink-0 overflow-hidden">
            {internship.company.logo ? (
              <img
                src={internship.company.logo}
                alt={internship.company.companyName}
                className="w-full h-full object-contain p-2"
              />
            ) : (
              initial
            )}
          </div>
          <div>
            <h4 className="font-extrabold text-gray-900 text-base leading-snug group-hover:text-brand-700 transition-colors">
              {internship.title}
            </h4>
            <p className="text-sm text-gray-400 mt-0.5">
              {internship.company.companyName}
            </p>
          </div>
        </div>

        {internship.matchScore != null && internship.matchScore > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            {Math.round(internship.matchScore)}% Match IA
          </span>
        )}
      </div>

      {/* Descripción */}
      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed -mt-1">
        {internship.description}
      </p>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5">
        {internship.skills.slice(0, 4).map((skill) => (
          <span
            key={skill}
            className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg"
          >
            {skill}
          </span>
        ))}
      </div>

      {/* Footer: location · duration · modality */}
      <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap pt-2 border-t border-gray-100 mt-auto">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {internship.location}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {internship.duration}
        </span>
        {modality && (
          <span
            className={`px-2 py-0.5 rounded-md font-medium ${modality.className}`}
          >
            {modality.label}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 font-bold text-brand-600 group-hover:gap-2 transition-all">
          Ver detalles <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}
