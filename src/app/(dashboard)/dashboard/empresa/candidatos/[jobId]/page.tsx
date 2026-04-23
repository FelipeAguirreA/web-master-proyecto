"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Settings,
  Users,
  LayoutGrid,
  List,
  FileText,
  Check,
  XCircle,
  MessageSquare,
  Mail,
} from "lucide-react";
import Link from "next/link";
import type { CandidateData } from "@/components/ats/CandidateCard";
import ScoreBreakdownModal from "@/components/ats/ScoreBreakdownModal";
import KanbanColumn from "@/components/ats/KanbanColumn";

type View = "ranking" | "kanban";

const PIPELINE_CONFIG = [
  { status: "PENDING", label: "Pendiente", color: "bg-[#9B9891]" },
  { status: "REVIEWING", label: "En revisión", color: "bg-[#3B82F6]" },
  { status: "INTERVIEW", label: "Entrevista", color: "bg-[#10B981]" },
  { status: "REJECTED", label: "Rechazado", color: "bg-[#EF4444]" },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-[#F5F4F1] text-[#6D6A63] border-black/[0.06]",
  },
  REVIEWING: {
    label: "En revisión",
    className: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
  },
  INTERVIEW: {
    label: "Entrevista",
    className: "bg-[#ECFDF3] text-[#047857] border-[#A7F3D0]",
  },
  REJECTED: {
    label: "Rechazado",
    className: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
  },
};

export default function CandidatesPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [view, setView] = useState<View>("ranking");
  const [selected, setSelected] = useState<CandidateData | null>(null);
  const [hasATS, setHasATS] = useState(false);
  const [emailSentIds, setEmailSentIds] = useState<Set<string>>(new Set());

  const loadCandidates = useCallback(
    async (autoScore = false) => {
      setLoading(true);
      try {
        const [res, atsRes] = await Promise.all([
          fetch(`/api/applications/internship/${jobId}`),
          fetch(`/api/ats/config/${jobId}`),
        ]);
        const data: CandidateData[] = (await res.json()) ?? [];
        const atsData = await atsRes.json();
        const atsActive: boolean = atsData.config?.isActive ?? false;

        setCandidates(data);
        setHasATS(atsActive);

        if (
          !autoScore &&
          atsActive &&
          data.length > 0 &&
          data.some((c) => c.atsScore === null)
        ) {
          await fetch(`/api/ats/score/job/${jobId}`, { method: "POST" });
          await loadCandidates(true);
        }
      } catch {
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    },
    [jobId],
  );

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
    const PIPELINE_TO_STATUS: Record<
      string,
      "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED"
    > = {
      PENDING: "PENDING",
      REVIEWING: "REVIEWED",
      INTERVIEW: "ACCEPTED",
      REJECTED: "REJECTED",
    };
    const syncedStatus = PIPELINE_TO_STATUS[newStatus] ?? "PENDING";

    await fetch(`/api/ats/pipeline/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? { ...c, pipelineStatus: newStatus, status: syncedStatus }
          : c,
      ),
    );
    // Si la decisión cambió, permitir reenviar email acorde al nuevo estado
    setEmailSentIds((prev) => {
      if (!prev.has(candidateId)) return prev;
      const next = new Set(prev);
      next.delete(candidateId);
      return next;
    });
  };

  const handleStatusChange = async (
    applicationId: string,
    status: "ACCEPTED" | "REJECTED",
  ) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === applicationId
              ? {
                  ...c,
                  status,
                  pipelineStatus:
                    status === "ACCEPTED" ? "INTERVIEW" : "REJECTED",
                }
              : c,
          ),
        );
        setSelected((prev) =>
          prev && prev.id === applicationId
            ? {
                ...prev,
                status,
                pipelineStatus:
                  status === "ACCEPTED" ? "INTERVIEW" : "REJECTED",
              }
            : prev,
        );
      }
    } catch {
      /* silencioso */
    }
  };

  const handleSendEmail = async (
    applicationId: string,
    type: "accepted" | "rejected",
  ) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) setEmailSentIds((prev) => new Set(prev).add(applicationId));
    } catch {
      /* silencioso */
    }
  };

  const handleContact = async (applicationId: string) => {
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      if (res.ok) {
        router.push("/dashboard/empresa/inbox");
      } else {
        const err = await res.json();
        alert(err.error ?? "Error al iniciar conversación");
      }
    } catch {
      alert("Error al iniciar conversación");
    }
  };

  const handleViewCV = async (applicationId: string, cvUrl: string) => {
    window.open(cvUrl, "_blank", "noopener noreferrer");
    const target = candidates.find((c) => c.id === applicationId);
    if (target?.status === "PENDING") {
      await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REVIEWED" }),
      });
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === applicationId ? { ...c, status: "REVIEWED" } : c,
        ),
      );
    }
  };

  const ranked = [...candidates].sort((a, b) => {
    if (a.passedFilters && !b.passedFilters) return -1;
    if (!a.passedFilters && b.passedFilters) return 1;
    if (hasATS) return (b.atsScore ?? 0) - (a.atsScore ?? 0);
    return (b.matchScore ?? 0) - (a.matchScore ?? 0);
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF6A3D]/25 border-t-[#FF6A3D] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6 md:py-10">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/empresa"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6D6A63] hover:text-[#0A0909] transition-colors mb-5"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
        Volver al dashboard
      </Link>

      {/* Hero */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 sm:gap-6 mb-6 sm:mb-8">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-black/[0.06] mb-4">
            <Users className="w-3 h-3 text-[#FF6A3D]" strokeWidth={2.4} />
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#4A4843]">
              {candidates.length} postulación
              {candidates.length !== 1 ? "es" : ""}
              {hasATS && " · ATS activo"}
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[38px] md:text-[46px] leading-[1.05] font-bold tracking-[-0.035em] text-[#0A0909]">
            Ranking de{" "}
            <span className="bg-gradient-to-r from-[#FFB17A] via-[#FF8A52] to-[#FF5A28] bg-clip-text text-transparent">
              candidatos
            </span>
          </h1>
          <p className="text-[13.5px] sm:text-[14.5px] text-[#6D6A63] mt-2 sm:mt-3 max-w-xl leading-relaxed">
            Revisá quién aplicó a esta práctica y gestioná el pipeline hasta la
            entrevista.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasATS && (
            <>
              <Link
                href={`/dashboard/empresa/ats/${jobId}`}
                className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#4A4843] border border-black/[0.08] bg-white px-3.5 py-2 rounded-xl hover:border-black/[0.15] hover:text-[#0A0909] transition-all"
              >
                <Settings className="w-3.5 h-3.5" strokeWidth={2.2} />
                Config ATS
              </Link>
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-white bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] px-3.5 py-2 rounded-xl hover:shadow-[0_4px_12px_-2px_rgba(255,106,61,0.5)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${recalculating ? "animate-spin" : ""}`}
                  strokeWidth={2.2}
                />
                Recalcular
              </button>
            </>
          )}

          {/* View toggle */}
          <div className="bg-white border border-black/[0.06] rounded-xl p-1 inline-flex gap-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            {(
              [
                { v: "ranking", label: "Ranking", icon: List },
                { v: "kanban", label: "Kanban", icon: LayoutGrid },
              ] as const
            ).map(({ v, label, icon: Icon }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                  view === v
                    ? "bg-[#0A0909] text-white shadow-[0_2px_6px_-1px_rgba(20,15,10,0.25)]"
                    : "text-[#6D6A63] hover:text-[#0A0909]"
                }`}
              >
                <Icon className="w-3 h-3" strokeWidth={2.4} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] py-20 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FAFAF8] border border-black/[0.05] flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-[#C9C6BF]" strokeWidth={1.8} />
          </div>
          <p className="text-[14px] font-semibold text-[#0A0909] tracking-[-0.01em]">
            Todavía no hay postulaciones
          </p>
          <p className="text-[12.5px] text-[#9B9891] mt-1">
            Cuando alguien aplique a esta práctica va a aparecer acá.
          </p>
        </div>
      ) : view === "ranking" ? (
        <div className="bg-white rounded-[20px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Mobile: cards */}
          <div className="md:hidden divide-y divide-black/[0.04]">
            {ranked.map((c, idx) => {
              const pipeline =
                STATUS_CONFIG[c.pipelineStatus] ?? STATUS_CONFIG.PENDING;
              const initial = c.student.name.charAt(0).toUpperCase();
              const isDisqualified = !c.passedFilters;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`p-4 cursor-pointer active:bg-[#FAFAF8]/60 transition-colors ${
                    isDisqualified ? "opacity-55" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <span className="text-[11px] font-bold text-[#9B9891] tabular-nums">
                        {isDisqualified ? "—" : `#${idx + 1}`}
                      </span>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white flex items-center justify-center text-[14px] font-bold shadow-[0_2px_8px_-2px_rgba(255,106,61,0.4)]">
                        {initial}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-[#0A0909] tracking-[-0.01em] truncate">
                        {c.student.name}
                      </p>
                      <p className="text-[12px] text-[#6D6A63] truncate mt-0.5">
                        {c.student.studentProfile?.career ?? c.student.email}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span
                          className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pipeline.className}`}
                        >
                          {pipeline.label}
                        </span>
                        {hasATS && !isDisqualified && c.atsScore !== null && (
                          <span
                            className={`inline-flex items-center text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                              c.atsScore >= 80
                                ? "bg-[#ECFDF3] text-[#047857]"
                                : c.atsScore >= 60
                                  ? "bg-[#FFF7EC] text-[#B45309]"
                                  : "bg-[#F5F4F1] text-[#6D6A63]"
                            }`}
                          >
                            ATS {c.atsScore}%
                          </span>
                        )}
                        {hasATS && isDisqualified && (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#B91C1C]">
                            Descalificado
                          </span>
                        )}
                        {c.matchScore !== null && c.matchScore > 0 && (
                          <span className="inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#FAFAF8] text-[#4A4843] border border-black/[0.05]">
                            Match {Math.round(c.matchScore)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center flex-wrap gap-1.5 mt-3 pl-[56px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {c.student.studentProfile?.cvUrl && (
                      <button
                        onClick={() =>
                          handleViewCV(c.id, c.student.studentProfile!.cvUrl!)
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4A4843] bg-white border border-black/[0.06] px-2.5 py-1.5 rounded-lg hover:border-black/[0.15] transition-all"
                      >
                        <FileText className="w-3 h-3" strokeWidth={2.2} />
                        CV
                      </button>
                    )}

                    {c.status !== "ACCEPTED" && c.status !== "REJECTED" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(c.id, "ACCEPTED")}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] px-2.5 py-1.5 rounded-lg"
                        >
                          <Check className="w-3 h-3" strokeWidth={2.4} />
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleStatusChange(c.id, "REJECTED")}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D6A63] bg-white border border-black/[0.06] px-2.5 py-1.5 rounded-lg hover:text-[#B91C1C] hover:border-[#FECACA]"
                        >
                          <XCircle className="w-3 h-3" strokeWidth={2.2} />
                          Rechazar
                        </button>
                      </>
                    )}

                    {c.status === "ACCEPTED" && (
                      <>
                        <button
                          onClick={() => handleContact(c.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-[#0A0909] px-2.5 py-1.5 rounded-lg"
                        >
                          <MessageSquare
                            className="w-3 h-3"
                            strokeWidth={2.4}
                          />
                          Contactar
                        </button>
                        {!emailSentIds.has(c.id) ? (
                          <button
                            onClick={() => handleSendEmail(c.id, "accepted")}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1A6E31] bg-[#E7F8EA] px-2.5 py-1.5 rounded-lg"
                          >
                            <Mail className="w-3 h-3" strokeWidth={2.2} />
                            Avisar
                          </button>
                        ) : (
                          <span className="inline-flex items-center text-[10.5px] font-semibold text-[#1A6E31] px-1.5">
                            ✓ Email enviado
                          </span>
                        )}
                      </>
                    )}

                    {c.status === "REJECTED" && (
                      <>
                        {!emailSentIds.has(c.id) ? (
                          <button
                            onClick={() => handleSendEmail(c.id, "rejected")}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#A63418] bg-[#FFECEC] px-2.5 py-1.5 rounded-lg"
                          >
                            <Mail className="w-3 h-3" strokeWidth={2.2} />
                            Avisar rechazo
                          </button>
                        ) : (
                          <span className="inline-flex items-center text-[10.5px] font-semibold text-[#A63418] px-1.5">
                            ✓ Email enviado
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#FAFAF8]/60">
                  <th className="text-left text-[10.5px] font-semibold text-[#9B9891] uppercase tracking-[0.08em] px-6 py-3.5 w-10">
                    #
                  </th>
                  <th className="text-left text-[10.5px] font-semibold text-[#9B9891] uppercase tracking-[0.08em] px-6 py-3.5">
                    Candidato
                  </th>
                  {hasATS && (
                    <th className="text-left text-[10.5px] font-semibold text-[#9B9891] uppercase tracking-[0.08em] px-6 py-3.5">
                      Score ATS
                    </th>
                  )}
                  <th className="text-left text-[10.5px] font-semibold text-[#9B9891] uppercase tracking-[0.08em] px-6 py-3.5">
                    Match CV
                  </th>
                  <th className="text-left text-[10.5px] font-semibold text-[#9B9891] uppercase tracking-[0.08em] px-6 py-3.5">
                    Pipeline
                  </th>
                  <th className="text-right text-[10.5px] font-semibold text-[#9B9891] uppercase tracking-[0.08em] px-6 py-3.5">
                    Acciones
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
                      className={`border-b border-black/[0.04] last:border-0 hover:bg-[#FAFAF8]/60 transition-colors cursor-pointer ${
                        isDisqualified ? "opacity-55" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-[13px] font-bold text-[#9B9891]">
                        {isDisqualified ? "—" : idx + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white flex items-center justify-center text-[13px] font-bold flex-shrink-0 shadow-[0_2px_8px_-2px_rgba(255,106,61,0.4)]">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-semibold text-[#0A0909] tracking-[-0.01em] truncate">
                              {c.student.name}
                            </p>
                            <p className="text-[12px] text-[#6D6A63] truncate">
                              {c.student.studentProfile?.career ??
                                c.student.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      {hasATS && (
                        <td className="px-6 py-4">
                          {isDisqualified ? (
                            <span className="inline-flex items-center gap-1 text-[11.5px] text-[#B91C1C] font-semibold">
                              {c.filterReason?.split(":")[0] ?? "Descalificado"}
                            </span>
                          ) : c.atsScore !== null ? (
                            <span
                              className={`text-[14px] font-bold tracking-[-0.01em] ${
                                c.atsScore >= 80
                                  ? "text-[#047857]"
                                  : c.atsScore >= 60
                                    ? "text-[#C2410C]"
                                    : "text-[#6D6A63]"
                              }`}
                            >
                              {c.atsScore}%
                            </span>
                          ) : (
                            <span className="text-[11.5px] text-[#9B9891]">
                              Sin calcular
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        {c.matchScore !== null ? (
                          <span
                            className={`text-[13px] font-semibold ${
                              c.matchScore >= 90
                                ? "text-[#047857]"
                                : c.matchScore >= 80
                                  ? "text-[#C2410C]"
                                  : "text-[#6D6A63]"
                            }`}
                          >
                            {Math.round(c.matchScore)}%
                          </span>
                        ) : (
                          <span className="text-[11.5px] text-[#C9C6BF]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border ${pipeline.className}`}
                        >
                          {pipeline.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.student.studentProfile?.cvUrl && (
                            <button
                              onClick={() =>
                                handleViewCV(
                                  c.id,
                                  c.student.studentProfile!.cvUrl!,
                                )
                              }
                              title="Ver CV"
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#6D6A63] bg-white border border-black/[0.06] hover:text-[#0A0909] hover:border-black/[0.15] transition-all"
                            >
                              <FileText
                                className="w-3.5 h-3.5"
                                strokeWidth={2.2}
                              />
                            </button>
                          )}

                          {c.status !== "ACCEPTED" &&
                            c.status !== "REJECTED" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleStatusChange(c.id, "ACCEPTED")
                                  }
                                  title="Aprobar"
                                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] hover:shadow-[0_4px_12px_-2px_rgba(255,106,61,0.5)] transition-all"
                                >
                                  <Check
                                    className="w-3.5 h-3.5"
                                    strokeWidth={2.4}
                                  />
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(c.id, "REJECTED")
                                  }
                                  title="Rechazar"
                                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#6D6A63] bg-white border border-black/[0.06] hover:text-[#B91C1C] hover:border-[#FECACA] transition-all"
                                >
                                  <XCircle
                                    className="w-3.5 h-3.5"
                                    strokeWidth={2.2}
                                  />
                                </button>
                              </>
                            )}

                          {c.status === "ACCEPTED" && (
                            <>
                              <button
                                onClick={() => handleContact(c.id)}
                                title="Contactar"
                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white bg-[#0A0909] hover:bg-[#1a1816] transition-all"
                              >
                                <MessageSquare
                                  className="w-3.5 h-3.5"
                                  strokeWidth={2.4}
                                />
                              </button>
                              {!emailSentIds.has(c.id) && (
                                <button
                                  onClick={() =>
                                    handleSendEmail(c.id, "accepted")
                                  }
                                  title="Enviar email de aceptación"
                                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#1A6E31] bg-[#E7F8EA] hover:bg-[#D3F0D9] transition-all"
                                >
                                  <Mail
                                    className="w-3.5 h-3.5"
                                    strokeWidth={2.2}
                                  />
                                </button>
                              )}
                              {emailSentIds.has(c.id) && (
                                <span
                                  title="Email enviado"
                                  className="inline-flex items-center text-[10.5px] font-semibold text-[#1A6E31] px-1.5"
                                >
                                  ✓
                                </span>
                              )}
                            </>
                          )}

                          {c.status === "REJECTED" && (
                            <>
                              {!emailSentIds.has(c.id) && (
                                <button
                                  onClick={() =>
                                    handleSendEmail(c.id, "rejected")
                                  }
                                  title="Enviar email de rechazo"
                                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#A63418] bg-[#FFECEC] hover:bg-[#FFD9D9] transition-all"
                                >
                                  <Mail
                                    className="w-3.5 h-3.5"
                                    strokeWidth={2.2}
                                  />
                                </button>
                              )}
                              {emailSentIds.has(c.id) && (
                                <span
                                  title="Email enviado"
                                  className="inline-flex items-center text-[10.5px] font-semibold text-[#A63418] px-1.5"
                                >
                                  ✓
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
