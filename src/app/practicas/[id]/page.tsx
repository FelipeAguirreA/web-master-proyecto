"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Building2,
  Sparkles,
} from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { ADMIN_EMAIL } from "@/lib/constants";
import type { Internship } from "@/types";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";

type InternshipDetail = Internship & {
  company: { companyName: string; logo: string | null };
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

function AmbientMesh() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div
        className="absolute top-[-15%] left-[-10%] w-[60%] h-[50%] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,166,122,0.4), rgba(255,166,122,0) 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute top-[-5%] right-[-15%] w-[55%] h-[50%] rounded-full opacity-45"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,210,180,0.5), rgba(255,210,180,0) 70%)",
          filter: "blur(50px)",
        }}
      />
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="lg:col-span-2 space-y-3 sm:space-y-4">
        <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-black/[0.06] p-5 sm:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] animate-pulse">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-[#F4F3EF] rounded-2xl" />
            <div className="flex-1 pt-2">
              <div className="h-5 bg-[#F4F3EF] rounded w-2/3 mb-2" />
              <div className="h-3 bg-[#F4F3EF]/70 rounded w-1/3" />
            </div>
          </div>
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 bg-[#F4F3EF] rounded-lg w-20" />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 bg-[#F4F3EF]/70 rounded" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-[20px] border border-black/[0.06] p-6 h-48 animate-pulse" />
      </div>
      <div className="bg-white rounded-[24px] border border-black/[0.06] p-6 h-64 animate-pulse" />
    </div>
  );
}

export default function InternshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [internship, setInternship] = useState<InternshipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [wasAlreadyApplied, setWasAlreadyApplied] = useState(false);
  const [applyError, setApplyError] = useState("");

  useEffect(() => {
    const fetchInternship = async () => {
      try {
        const res = await fetchWithRefresh(`/api/internships/${id}`);
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

  useEffect(() => {
    if (!session || session.user.role !== "STUDENT") return;

    const checkApplied = async () => {
      try {
        const res = await fetchWithRefresh("/api/applications/my");
        if (!res.ok) return;
        const apps: Array<{ internshipId: string }> = await res.json();
        if (apps.some((a) => a.internshipId === id)) {
          setApplied(true);
          setWasAlreadyApplied(true);
        }
      } catch {
        // silencioso
      }
    };

    checkApplied();
  }, [id, session]);

  const handleApply = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/practicas/${id}`);
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
        const data = await res.json();
        setApplyError(data.error ?? "Error al postularse. Intentá de nuevo.");
      }
    } catch {
      setApplyError("Error de red. Intentá de nuevo.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div
        className="relative min-h-screen bg-[#FAFAF8] text-[#0A0909] antialiased overflow-x-hidden"
        style={{ fontFamily: "var(--font-onest), ui-sans-serif, system-ui" }}
      >
        <AmbientMesh />
        <PublicNav
          isLoggedIn={!!session}
          isAdmin={session?.user.email === ADMIN_EMAIL}
        />
        <main className="relative z-10 pt-[96px] sm:pt-[112px] pb-16 sm:pb-24">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
            <div className="h-3 bg-[#F4F3EF] rounded w-32 mb-6 sm:mb-8 animate-pulse" />
            <SkeletonDetail />
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !internship) {
    return (
      <div
        className="relative min-h-screen bg-[#FAFAF8] text-[#0A0909] antialiased overflow-x-hidden"
        style={{ fontFamily: "var(--font-onest), ui-sans-serif, system-ui" }}
      >
        <AmbientMesh />
        <PublicNav
          isLoggedIn={!!session}
          isAdmin={session?.user.email === ADMIN_EMAIL}
        />
        <main className="relative z-10 pt-[120px] sm:pt-[160px] pb-16 sm:pb-24">
          <div className="max-w-[560px] mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#FFF3EC] to-[#FFE4D2] border border-[#FF6A3D]/10 mb-5 sm:mb-6">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-[#FF6A3D]" />
            </div>
            <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-[-0.02em] text-[#0A0909] mb-3">
              Esta práctica ya no está disponible
            </h1>
            <p className="text-[14px] sm:text-[15px] text-[#6D6A63] leading-[1.55] mb-6 sm:mb-8">
              La empresa dio de baja esta publicación o el enlace que seguiste
              apunta a una práctica que nunca existió.
            </p>
            <Link
              href="/practicas"
              className="inline-flex items-center gap-2 bg-[#0A0909] text-white text-[14px] font-medium px-5 py-3 rounded-xl hover:bg-[#1D1B18] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]"
            >
              <ArrowLeft className="w-4 h-4" />
              Ver todas las prácticas
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const modalityLabel = MODALITY_LABELS[internship.modality];
  const initial = internship.company.companyName.charAt(0).toUpperCase();
  const gradient = pickGradient(internship.company.companyName);

  return (
    <div
      className="relative min-h-screen bg-[#FAFAF8] text-[#0A0909] antialiased overflow-x-hidden"
      style={{ fontFamily: "var(--font-onest), ui-sans-serif, system-ui" }}
    >
      <AmbientMesh />
      <PublicNav
        isLoggedIn={!!session}
        isAdmin={session?.user.email === ADMIN_EMAIL}
      />

      <main className="relative z-10 pt-[96px] sm:pt-[112px] pb-16 sm:pb-24">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          {/* Breadcrumb */}
          <Link
            href="/practicas"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6D6A63] hover:text-[#0A0909] mb-5 sm:mb-8 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            Volver a prácticas
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* ========== MAIN CONTENT ========== */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {/* Hero card */}
              <div className="relative bg-white rounded-[20px] sm:rounded-[24px] border border-black/[0.06] p-5 sm:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
                <div
                  aria-hidden
                  className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-[#FFF3EC]/70 via-[#FFE4D2]/30 to-transparent pointer-events-none"
                />

                <div className="relative">
                  <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-[20px] sm:text-[22px] shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)] shrink-0 overflow-hidden`}
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
                    <div className="flex-1 min-w-0 pt-1">
                      <h1 className="text-[clamp(1.25rem,4.5vw,2rem)] leading-[1.15] tracking-[-0.02em] font-semibold text-[#0A0909] break-words [overflow-wrap:anywhere]">
                        {internship.title}
                      </h1>
                      <p className="text-[13px] sm:text-[14px] text-[#6D6A63] mt-1.5 break-words">
                        en{" "}
                        <span className="font-semibold text-[#0A0909]">
                          {internship.company.companyName}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Meta pills */}
                  <div className="flex flex-wrap gap-2">
                    {modalityLabel && (
                      <span className="inline-flex items-center gap-1.5 bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white rounded-lg px-2.5 py-1 text-[11.5px] font-semibold shadow-[0_2px_6px_-1px_rgba(255,106,61,0.35)]">
                        {modalityLabel}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 bg-white border border-black/[0.06] rounded-lg px-2.5 py-1 text-[11.5px] font-medium text-[#4A4843]">
                      <MapPin className="w-3 h-3 text-[#6D6A63]" />
                      {internship.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-white border border-black/[0.06] rounded-lg px-2.5 py-1 text-[11.5px] font-medium text-[#4A4843]">
                      <Clock className="w-3 h-3 text-[#6D6A63]" />
                      {internship.duration}
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-[#F4F3EF] rounded-lg px-2.5 py-1 text-[11.5px] font-medium text-[#4A4843]">
                      {internship.area}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description card */}
              <div className="bg-white rounded-[20px] border border-black/[0.06] p-5 sm:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2 mb-4 sm:mb-5">
                  <span className="w-1 h-5 bg-gradient-to-b from-[#FF6A3D] to-[#FF9B6A] rounded-full" />
                  <h2 className="text-[15px] font-semibold tracking-tight text-[#0A0909]">
                    Sobre esta práctica
                  </h2>
                </div>
                <p className="text-[13.5px] sm:text-[14.5px] text-[#4A4843] leading-[1.65] sm:leading-[1.7] whitespace-pre-line break-words [overflow-wrap:anywhere]">
                  {internship.description}
                </p>
              </div>

              {/* Requirements card */}
              {internship.requirements.length > 0 && (
                <div className="bg-white rounded-[20px] border border-black/[0.06] p-5 sm:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 mb-4 sm:mb-5">
                    <span className="w-1 h-5 bg-gradient-to-b from-[#FF6A3D] to-[#FF9B6A] rounded-full" />
                    <h2 className="text-[15px] font-semibold tracking-tight text-[#0A0909]">
                      Lo que buscan en vos
                    </h2>
                  </div>
                  <ul className="space-y-2.5 sm:space-y-3">
                    {internship.requirements.map((req, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-[13.5px] sm:text-[14px] text-[#4A4843] leading-[1.55] min-w-0"
                      >
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-[#E7F8EA] to-[#C5E8C7] shrink-0 mt-0.5">
                          <CheckCircle className="w-3 h-3 text-[#1A8F3C]" />
                        </span>
                        <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                          {req}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Skills card */}
              {internship.skills.length > 0 && (
                <div className="bg-white rounded-[20px] border border-black/[0.06] p-5 sm:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 mb-4 sm:mb-5">
                    <span className="w-1 h-5 bg-gradient-to-b from-[#FF6A3D] to-[#FF9B6A] rounded-full" />
                    <h2 className="text-[15px] font-semibold tracking-tight text-[#0A0909]">
                      Tecnologías y habilidades
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {internship.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center text-[12px] sm:text-[12.5px] font-medium bg-[#FAFAF8] border border-black/[0.06] text-[#0A0909] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:border-[#FF6A3D]/30 hover:bg-[#FFF3EC]/40 transition-colors break-all max-w-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ========== SIDEBAR ========== */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-[112px] space-y-3">
                {/* Apply card */}
                <div className="relative bg-white rounded-[20px] sm:rounded-[24px] border border-black/[0.06] p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
                  <div
                    aria-hidden
                    className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-bl from-[#FFE4D2]/70 to-transparent rounded-full blur-2xl"
                  />

                  <div className="relative">
                    <div className="flex items-center gap-1.5 mb-4">
                      <span className="inline-flex items-center gap-1.5 bg-white border border-black/[0.06] rounded-full pl-1 pr-2.5 py-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                        <span className="flex items-center gap-1 bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white text-[9.5px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full">
                          GRATIS
                        </span>
                        <span className="text-[10.5px] font-medium text-[#4A4843]">
                          Sin intermediarios
                        </span>
                      </span>
                    </div>

                    <div className="space-y-2.5 mb-5 text-[13px]">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[#9B9891]">Empresa</span>
                        <span className="font-semibold text-[#0A0909] truncate">
                          {internship.company.companyName}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[#9B9891]">Área</span>
                        <span className="font-medium text-[#4A4843] truncate">
                          {internship.area}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[#9B9891]">Modalidad</span>
                        <span className="font-medium text-[#4A4843]">
                          {modalityLabel ?? internship.modality}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[#9B9891]">Duración</span>
                        <span className="font-medium text-[#4A4843]">
                          {internship.duration}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[#9B9891]">Ubicación</span>
                        <span className="font-medium text-[#4A4843] text-right truncate max-w-[160px]">
                          {internship.location}
                        </span>
                      </div>
                    </div>

                    {applyError && !applied && (
                      <div className="flex items-start gap-2 bg-[#FFF0ED] border border-[#FF6A3D]/20 text-[#C74A1E] text-[12px] px-3 py-2.5 rounded-lg mb-3 leading-[1.4]">
                        <span className="text-[#FF6A3D] mt-0.5">!</span>
                        <p>{applyError}</p>
                      </div>
                    )}

                    {applied ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 bg-gradient-to-br from-[#E7F8EA] to-[#C5E8C7] border border-[#1A8F3C]/15 text-[#1A8F3C] font-semibold py-3 rounded-xl text-[13px]">
                          <CheckCircle className="w-4 h-4" />
                          {wasAlreadyApplied
                            ? "Ya te postulaste a esta práctica"
                            : "Postulación enviada"}
                        </div>
                        <Link
                          href="/dashboard/estudiante"
                          className="flex items-center justify-center gap-1 text-[12px] font-medium text-[#6D6A63] hover:text-[#FF6A3D] transition-colors"
                        >
                          Ver mis postulaciones
                          <span className="text-[10px]">→</span>
                        </Link>
                      </div>
                    ) : !session ? (
                      <button
                        onClick={handleApply}
                        className="group w-full inline-flex items-center justify-center gap-1.5 bg-[#0A0909] text-white font-semibold py-3.5 rounded-xl text-[13.5px] hover:bg-[#1D1B18] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]"
                      >
                        Iniciar sesión para postularse
                        <span className="text-[11px] transition-transform group-hover:translate-x-0.5">
                          →
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={handleApply}
                        disabled={applying}
                        className="group relative w-full inline-flex items-center justify-center gap-1.5 bg-gradient-to-br from-[#FF6A3D] to-[#FF8A52] text-white font-semibold py-3.5 rounded-xl text-[13.5px] shadow-[0_4px_16px_-4px_rgba(255,106,61,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_8px_24px_-6px_rgba(255,106,61,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                      >
                        <span
                          aria-hidden
                          className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                        {applying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin relative" />
                            <span className="relative">Enviando…</span>
                          </>
                        ) : (
                          <>
                            <span className="relative">Postularme ahora</span>
                            <span className="relative text-[11px] transition-transform group-hover:translate-x-0.5">
                              →
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    <p className="text-[11px] text-[#9B9891] text-center mt-3 leading-[1.4]">
                      Postulación gratuita · Sin formularios largos
                    </p>
                  </div>
                </div>

                {/* Trust mini card */}
                <div className="relative bg-[#0A0909] rounded-2xl p-4 overflow-hidden">
                  <div
                    aria-hidden
                    className="absolute -top-6 -right-6 w-24 h-24 bg-[#FF6A3D]/20 rounded-full blur-2xl"
                  />
                  <div className="relative flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </span>
                    <div>
                      <p className="text-[12.5px] font-semibold text-white leading-tight">
                        Tu CV va directo a la empresa
                      </p>
                      <p className="text-[11px] text-white/60 mt-1 leading-[1.4]">
                        Sin copypaste de mails. Sin hojas de vida perdidas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
