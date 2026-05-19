import { useMemo } from "react";
import { CardSkeleton } from "./CardSkeleton";
import { ApplicantRow } from "./ApplicantRow";
import type { Applicant, Internship } from "./types";

type PostulantesNuevosProps = {
  applicants: Applicant[];
  internships: Internship[];
  loading: boolean;
  onRefresh: () => void;
};

export function PostulantesNuevos({
  applicants,
  internships,
  loading,
  onRefresh,
}: PostulantesNuevosProps) {
  const intsById = useMemo(() => {
    const m: Record<string, Internship> = {};
    for (const i of internships) m[i.id] = i;
    return m;
  }, [internships]);

  if (loading) return <CardSkeleton label="Cargando postulantes…" />;

  return (
    <section className="bg-surface border border-border rounded-[18px] p-5 sm:p-[22px]">
      <header className="flex items-center justify-between mb-3.5 gap-2.5">
        <div>
          <h2 className="text-[15px] font-extrabold text-text tracking-[-0.3px]">
            Postulantes nuevos
          </h2>
          <p className="text-[11.5px] text-subtle mt-0.5">
            {applicants.length} sin revisar · ordenados por match
          </p>
        </div>
      </header>

      {applicants.length === 0 ? (
        <p className="text-[12.5px] text-muted py-3 px-1 leading-relaxed">
          Cuando lleguen postulantes nuevos van a aparecer acá ordenados por su
          match con la práctica.
        </p>
      ) : (
        <div className="flex flex-col">
          {applicants.slice(0, 6).map((a, i) => (
            <ApplicantRow
              key={a.id}
              a={a}
              internship={intsById[a.internshipId]}
              first={i === 0}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </section>
  );
}
