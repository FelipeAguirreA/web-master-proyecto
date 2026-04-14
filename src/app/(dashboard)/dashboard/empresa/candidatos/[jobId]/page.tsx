"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import type { CandidateData } from "@/components/ats/CandidateCard";
import ScoreBreakdownModal from "@/components/ats/ScoreBreakdownModal";
import KanbanColumn from "@/components/ats/KanbanColumn";

type View = "ranking" | "kanban";

const PIPELINE_CONFIG = [
  { status: "PENDING", label: "Pendiente", color: "bg-gray-400" },
  { status: "REVIEWING", label: "En revisión", color: "bg-blue-400" },
  { status: "INTERVIEW", label: "Entrevista", color: "bg-green-500" },
  { status: "REJECTED", label: "Rechazado", color: "bg-red-400" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-gray-100 text-gray-600" },
  REVIEWING: { label: "En revisión", color: "bg-blue-100 text-blue-700" },
  INTERVIEW: { label: "Entrevista ✨", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rechazado", color: "bg-red-100 text-red-600" },
};

export default function CandidatesPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [view, setView] = useState<View>("ranking");
  const [selected, setSelected] = useState<CandidateData | null>(null);
  const [hasATS, setHasATS] = useState(false);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/internship/${jobId}`);
      const data = await res.json();
      setCandidates(data ?? []);

      // Verificar si tiene ATS activo
      const atsRes = await fetch(`/api/ats/config/${jobId}`);
      const atsData = await atsRes.json();
      setHasATS(atsData.config?.isActive ?? false);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await fetch(`/api/ats/score/job/${jobId}`, { method: "POST" });
      await loadCandidates();
    } finally {
      setRecalculating(false);
    }
  };

  const handlePipelineMove = async (candidateId: string, newStatus: string) => {
    await fetch(`/api/ats/pipeline/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId ? { ...c, pipelineStatus: newStatus } : c,
      ),
    );
  };

  // Ordenar: pasaron filtro primero por score desc, luego descalificados
  const ranked = [...candidates].sort((a, b) => {
    if (a.passedFilters && !b.passedFilters) return -1;
    if (!a.passedFilters && b.passedFilters) return 1;
    if (hasATS) return (b.atsScore ?? 0) - (a.atsScore ?? 0);
    return (b.matchScore ?? 0) - (a.matchScore ?? 0);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      <div className="max-w-screen-xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard/empresa"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold tracking-tighter text-gray-900">
              Candidatos
            </h1>
            <p className="text-gray-400 mt-1">
              {candidates.length} postulación
              {candidates.length !== 1 ? "es" : ""}
              {hasATS ? " · ATS activo" : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hasATS && (
              <>
                <Link
                  href={`/dashboard/empresa/ats/${jobId}`}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-brand-600 border border-gray-200 bg-white px-4 py-2 rounded-xl transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Config ATS
                </Link>
                <button
                  onClick={handleRecalculate}
                  disabled={recalculating}
                  className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 border border-brand-200 bg-brand-50 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${recalculating ? "animate-spin" : ""}`}
                  />
                  Recalcular todos
                </button>
              </>
            )}

            {/* Tab toggle */}
            <div className="flex bg-white border border-gray-100 rounded-xl p-1">
              {(["ranking", "kanban"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors capitalize ${
                    view === v
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {v === "ranking" ? "Ranking" : "Kanban"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center">
            <p className="text-gray-400 text-sm">
              Aún no hay postulaciones para esta práctica.
            </p>
          </div>
        ) : view === "ranking" ? (
          /* Vista Ranking */
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-6 py-4 w-8">
                    #
                  </th>
                  <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-6 py-4">
                    Candidato
                  </th>
                  {hasATS && (
                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-6 py-4">
                      Score ATS
                    </th>
                  )}
                  <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-6 py-4">
                    Match CV
                  </th>
                  <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-6 py-4">
                    Pipeline
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((c, idx) => {
                  const pipeline =
                    STATUS_CONFIG[c.pipelineStatus] ?? STATUS_CONFIG.PENDING;
                  const initial = c.student.name.charAt(0).toUpperCase();
                  const isDisqualified = !c.passedFilters;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                        isDisqualified ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-sm font-bold text-gray-400">
                        {isDisqualified ? "—" : idx + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {initial}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">
                              {c.student.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {c.student.studentProfile?.career ??
                                c.student.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      {hasATS && (
                        <td className="px-6 py-4">
                          {isDisqualified ? (
                            <span className="text-xs text-red-500 font-semibold">
                              ❌{" "}
                              {c.filterReason?.split(":")[0] ?? "Descalificado"}
                            </span>
                          ) : c.atsScore !== null ? (
                            <span
                              className={`text-sm font-extrabold ${
                                c.atsScore >= 80
                                  ? "text-green-600"
                                  : c.atsScore >= 60
                                    ? "text-amber-600"
                                    : "text-gray-500"
                              }`}
                            >
                              {c.atsScore}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Sin calcular
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        {c.matchScore !== null ? (
                          <span className="text-sm font-semibold text-gray-600">
                            {Math.round(c.matchScore)}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pipeline.color}`}
                        >
                          {pipeline.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Vista Kanban */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PIPELINE_CONFIG.map((col) => (
              <KanbanColumn
                key={col.status}
                status={col.status}
                label={col.label}
                color={col.color}
                candidates={candidates.filter(
                  (c) => c.pipelineStatus === col.status,
                )}
                showScore={hasATS}
                onDrop={handlePipelineMove}
                onOpenDetail={setSelected}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {selected && (
        <ScoreBreakdownModal
          applicant={{
            id: selected.id,
            student: selected.student,
            atsScore: selected.atsScore,
            moduleScores: selected.moduleScores as Parameters<
              typeof ScoreBreakdownModal
            >[0]["applicant"]["moduleScores"],
            passedFilters: selected.passedFilters,
            filterReason: selected.filterReason,
            pipelineStatus: selected.pipelineStatus,
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
