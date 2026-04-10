import Link from "next/link";
import { MapPin, Clock, Sparkles } from "lucide-react";
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
  const modality = MODALITY_LABELS[internship.modality];

  return (
    <Link
      href={`/practicas/${internship.id}`}
      className="group block bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md hover:border-brand-200 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors truncate">
            {internship.title}
          </h3>
          <p className="text-sm text-gray-500">{internship.company.companyName}</p>
        </div>
        {internship.matchScore != null && internship.matchScore > 0 && (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg px-2 py-1 shrink-0">
            <Sparkles className="w-3 h-3" />
            {Math.round(internship.matchScore)}%
          </span>
        )}
      </div>

      {/* Descripción */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-4">
        {internship.description}
      </p>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {internship.skills.slice(0, 4).map((skill) => (
          <span
            key={skill}
            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md"
          >
            {skill}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {internship.location}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {internship.duration}
        </span>
        {modality && (
          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${modality.className}`}>
            {modality.label}
          </span>
        )}
      </div>
    </Link>
  );
}
