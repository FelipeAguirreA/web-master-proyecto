"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PublicOrDashboardShell } from "@/components/dashboard/PublicOrDashboardShell";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import {
  companyColor,
  companyInitials,
} from "@/components/dashboard/companyColors";

import { AmbientMesh } from "./_components/AmbientMesh";
import { DetailHero } from "./_components/DetailHero";
import { DetailBody } from "./_components/DetailBody";
import { DetailSidebar } from "./_components/DetailSidebar";
import { CompanyModal } from "./_components/CompanyModal";
import { SkeletonDetail } from "./_components/SkeletonDetail";
import { EmptyState } from "./_components/EmptyState";
import type { InternshipDetail } from "./_components/types";

const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

export default function InternshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [internship, setInternship] = useState<InternshipDetail | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [wasAlreadyApplied, setWasAlreadyApplied] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [shareLabel, setShareLabel] = useState("Compartir");
  const [saved, setSaved] = useState(false);
  const [showCompany, setShowCompany] = useState(false);

  // Fetch internship data
  useEffect(() => {
    const fetchInternship = async () => {
      try {
        const res = await fetchWithRefresh(`/api/internships/${id}`, {
          cache: "no-store",
        });
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setInternship(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchInternship();
  }, [id]);

  // Check if student already applied
  useEffect(() => {
    if (!session || session.user.role !== "STUDENT") return;
    fetchWithRefresh("/api/applications/my", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((apps: Array<{ internshipId: string }>) => {
        if (apps.some((a) => a.internshipId === id)) {
          setApplied(true);
          setWasAlreadyApplied(true);
        }
      })
      .catch(() => {});
  }, [id, session]);

  // Fetch match score from recommendations
  useEffect(() => {
    if (!session || session.user.role !== "STUDENT") return;
    fetchWithRefresh("/api/matching/recommendations", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<{ id: string; matchScore?: number | null }>) => {
        const found = data.find((r) => r.id === id);
        if (found && typeof found.matchScore === "number") {
          setMatchScore(Math.round(found.matchScore));
        }
      })
      .catch(() => {});
  }, [id, session]);

  // Hydrate saved state so the heart reflects truth on reload
  useEffect(() => {
    if (!session || session.user.role !== "STUDENT") return;
    fetchWithRefresh("/api/internships/saved", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((items: Array<{ id: string }>) => {
        if (items.some((i) => i.id === id)) setSaved(true);
      })
      .catch(() => {});
  }, [id, session]);

  const handleToggleSave = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/practicas/${id}`);
      return;
    }
    if (session.user.role !== "STUDENT") return;
    // Optimistic update: revert on server failure
    const prev = saved;
    setSaved(!prev);
    try {
      const res = await fetchWithRefresh(`/api/internships/${id}/save`, {
        method: "POST",
      });
      if (!res.ok) setSaved(prev);
      else {
        const data: { saved: boolean } = await res.json();
        setSaved(data.saved);
      }
    } catch {
      setSaved(prev);
    }
  };

  const handleApply = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/practicas/${id}`);
      return;
    }
    if (session.user.role !== "STUDENT") {
      setApplyError("Solo estudiantes pueden postular.");
      return;
    }
    setApplying(true);
    setApplyError("");
    try {
      const res = await fetchWithRefresh("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internshipId: id }),
      });
      if (res.ok) {
        setApplied(true);
      } else if (res.status === 409) {
        setApplied(true);
        setWasAlreadyApplied(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setApplyError(data.error ?? "Error al postular. Intenta de nuevo.");
      }
    } catch {
      setApplyError("Error de red. Intenta de nuevo.");
    } finally {
      setApplying(false);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: internship?.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareLabel("Copiado ✓");
      setTimeout(() => setShareLabel("Compartir"), 2000);
    } catch {
      // user cancelled or no support
    }
  };

  const topLabel = useMemo(() => {
    if (matchScore === null) return null;
    if (matchScore >= 95) return "Top 5%";
    if (matchScore >= 90) return "Top 10%";
    if (matchScore >= 80) return "Top 20%";
    return null;
  }, [matchScore]);

  const isNew = useMemo(() => {
    if (!internship?.createdAt) return false;
    return (
      Date.now() - new Date(internship.createdAt).getTime() <
      7 * 24 * 3600 * 1000
    );
  }, [internship]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return <SkeletonDetail session={session} />;

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound || !internship) return <EmptyState session={session} />;

  // ── Resolved values ────────────────────────────────────────────────────────
  const co = internship.company.companyName;
  const color = companyColor(co);
  const modeLabel = MODALITY_LABEL[internship.modality] ?? internship.modality;

  // ── Content (shared between authenticated and public layouts) ─────────────
  const content = (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-[6px] text-[12px] text-subtle mb-[14px] flex-wrap">
        <Link
          href="/practicas"
          className="font-semibold text-subtle no-underline hover:text-text transition-colors"
        >
          Prácticas
        </Link>
        <span>/</span>
        <span className="font-semibold">{internship.area}</span>
        <span>/</span>
        <span className="text-muted font-bold overflow-hidden text-ellipsis whitespace-nowrap max-w-[320px]">
          {internship.title}
        </span>
      </nav>

      {/* Hero */}
      <DetailHero
        internship={internship}
        co={co}
        color={color}
        companyInitials={companyInitials(co)}
        topLabel={topLabel}
        isNew={isNew}
        onShowCompany={() => setShowCompany(true)}
      />

      {/* Two-column body — stacks on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <DetailBody internship={internship} />
        <DetailSidebar
          internship={internship}
          modeLabel={modeLabel}
          session={session}
          matchScore={matchScore}
          topLabel={topLabel}
          applied={applied}
          wasAlreadyApplied={wasAlreadyApplied}
          applying={applying}
          applyError={applyError}
          saved={saved}
          shareLabel={shareLabel}
          onApply={handleApply}
          onToggleSave={handleToggleSave}
          onShare={handleShare}
        />
      </div>
    </div>
  );

  return (
    <PublicOrDashboardShell publicBackdrop={<AmbientMesh />}>
      {content}
      {showCompany && (
        <CompanyModal
          internship={internship}
          co={co}
          color={color}
          companyInitials={companyInitials(co)}
          onClose={() => setShowCompany(false)}
        />
      )}
    </PublicOrDashboardShell>
  );
}
