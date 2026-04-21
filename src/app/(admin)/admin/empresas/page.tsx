"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Globe,
  Phone,
  FileText,
  Briefcase,
  CalendarDays,
} from "lucide-react";

type CompanyStatus = "PENDING" | "APPROVED" | "REJECTED";

type Company = {
  id: string;
  companyName: string;
  empresaRut: string | null;
  companyStatus: CompanyStatus;
  industry: string | null;
  website: string | null;
  description: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    lastName: string | null;
    phone: string | null;
    createdAt: string;
  };
};

const STATUS_LABELS: Record<CompanyStatus, string> = {
  PENDING: "En revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

const STATUS_CLASSES: Record<CompanyStatus, string> = {
  PENDING: "bg-[#FFF7EC] text-[#B45309] border-[#FCD9A8]",
  APPROVED: "bg-[#ECFDF3] text-[#047857] border-[#A7F3D0]",
  REJECTED: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
};

const STATUS_ICONS: Record<CompanyStatus, React.ReactNode> = {
  PENDING: <Clock className="w-3.5 h-3.5" strokeWidth={2.2} />,
  APPROVED: <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.2} />,
  REJECTED: <XCircle className="w-3.5 h-3.5" strokeWidth={2.2} />,
};

const LOGO_GRADIENTS = [
  "from-[#FF6A3D] to-[#FF9B6A]",
  "from-[#FF8A52] to-[#FFB17A]",
  "from-[#F97316] to-[#FB923C]",
  "from-[#EA580C] to-[#F97316]",
  "from-[#FB923C] to-[#FDBA74]",
  "from-[#FF5A28] to-[#FF8A52]",
  "from-[#FFB17A] to-[#FFD6B8]",
  "from-[#D97706] to-[#F59E0B]",
];

function pickGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return LOGO_GRADIENTS[Math.abs(hash) % LOGO_GRADIENTS.length];
}

type FilterStatus = "ALL" | CompanyStatus;

export default function AdminEmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("PENDING");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/empresas");
      const data = await res.json();
      setCompanies(data.companies ?? []);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (
    companyId: string,
    action: "approve" | "reject",
  ) => {
    setProcessing(companyId);
    try {
      const res = await fetch(`/api/admin/empresas/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === companyId
              ? {
                  ...c,
                  companyStatus: action === "approve" ? "APPROVED" : "REJECTED",
                }
              : c,
          ),
        );
        setExpanded(null);
      }
    } finally {
      setProcessing(null);
    }
  };

  const filtered =
    filter === "ALL"
      ? companies
      : companies.filter((c) => c.companyStatus === filter);

  const counts = {
    ALL: companies.length,
    PENDING: companies.filter((c) => c.companyStatus === "PENDING").length,
    APPROVED: companies.filter((c) => c.companyStatus === "APPROVED").length,
    REJECTED: companies.filter((c) => c.companyStatus === "REJECTED").length,
  };

  const filterTabs: { key: FilterStatus; label: string }[] = [
    { key: "PENDING", label: "En revisión" },
    { key: "APPROVED", label: "Aprobadas" },
    { key: "REJECTED", label: "Rechazadas" },
    { key: "ALL", label: "Todas" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
      {/* Hero */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-black/[0.06] mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A3D] animate-pulse" />
          <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#4A4843]">
            Panel de administración
          </span>
        </div>
        <h1 className="text-[42px] md:text-[52px] leading-[1.02] font-bold tracking-[-0.035em] text-[#0A0909]">
          Validación de{" "}
          <span className="bg-gradient-to-r from-[#FFB17A] via-[#FF8A52] to-[#FF5A28] bg-clip-text text-transparent">
            empresas
          </span>
        </h1>
        <p className="text-[15px] md:text-base text-[#6D6A63] mt-4 max-w-2xl leading-relaxed">
          Revisá las solicitudes de registro y controlá qué empresas pueden
          publicar prácticas en PractiX.
        </p>

        {/* Stats inline */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          {[
            {
              label: "En revisión",
              value: counts.PENDING,
              tint: "text-[#B45309]",
            },
            {
              label: "Aprobadas",
              value: counts.APPROVED,
              tint: "text-[#047857]",
            },
            {
              label: "Rechazadas",
              value: counts.REJECTED,
              tint: "text-[#B91C1C]",
            },
            { label: "Total", value: counts.ALL, tint: "text-[#0A0909]" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-5 py-4"
            >
              <p className="text-[10.5px] uppercase tracking-[0.08em] font-semibold text-[#9B9891]">
                {s.label}
              </p>
              <p
                className={`text-[28px] font-bold tracking-[-0.02em] mt-1.5 ${s.tint}`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs filtro — glass */}
      <div className="bg-white/70 backdrop-blur-xl border border-black/[0.06] rounded-2xl p-1.5 inline-flex gap-1 flex-wrap mb-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {filterTabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
                active
                  ? "bg-[#0A0909] text-white shadow-[0_4px_12px_-2px_rgba(20,15,10,0.25)]"
                  : "text-[#4A4843] hover:bg-black/[0.03] hover:text-[#0A0909]"
              }`}
            >
              {tab.label}
              <span
                className={`text-[10.5px] px-1.5 py-0.5 rounded-full font-bold tracking-[-0.01em] ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-black/[0.05] text-[#6D6A63]"
                }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#FF6A3D]/25 border-t-[#FF6A3D] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] py-20 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FAFAF8] border border-black/[0.05] flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-[#C9C6BF]" strokeWidth={1.8} />
          </div>
          <p className="text-[14px] font-semibold text-[#0A0909] tracking-[-0.01em]">
            Sin empresas en esta categoría
          </p>
          <p className="text-[12.5px] text-[#9B9891] mt-1">
            Cuando haya actualizaciones aparecen acá.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((company) => {
            const gradient = pickGradient(company.companyName);
            const isExpanded = expanded === company.id;
            const isProcessing = processing === company.id;
            return (
              <div
                key={company.id}
                className="bg-white rounded-[20px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-[0_4px_16px_-4px_rgba(20,15,10,0.08)]"
              >
                {/* Row principal */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-bold text-[15px] shrink-0 shadow-[0_4px_12px_-3px_rgba(255,106,61,0.45)]`}
                  >
                    {company.companyName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[14.5px] font-semibold text-[#0A0909] truncate tracking-[-0.01em]">
                      {company.companyName}
                    </p>
                    <p className="text-[12.5px] text-[#6D6A63] truncate mt-0.5">
                      {company.user.name} {company.user.lastName ?? ""}
                      <span className="text-[#C9C6BF] mx-1.5">·</span>
                      {company.user.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_CLASSES[company.companyStatus]}`}
                    >
                      {STATUS_ICONS[company.companyStatus]}
                      {STATUS_LABELS[company.companyStatus]}
                    </span>

                    {company.companyStatus === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleAction(company.id, "approve")}
                          disabled={isProcessing}
                          className="hidden md:inline-flex items-center gap-1.5 bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white text-[11.5px] font-semibold px-3 py-1.5 rounded-xl hover:shadow-[0_4px_12px_-2px_rgba(255,106,61,0.5)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <CheckCircle2
                            className="w-3.5 h-3.5"
                            strokeWidth={2.4}
                          />
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleAction(company.id, "reject")}
                          disabled={isProcessing}
                          className="hidden md:inline-flex items-center gap-1.5 bg-white text-[#B91C1C] border border-[#FECACA] text-[11.5px] font-semibold px-3 py-1.5 rounded-xl hover:bg-[#FEF2F2] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-3.5 h-3.5" strokeWidth={2.4} />
                          Rechazar
                        </button>
                      </>
                    )}

                    <button
                      onClick={() =>
                        setExpanded((e) =>
                          e === company.id ? null : company.id,
                        )
                      }
                      className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-[#9B9891] hover:text-[#0A0909] hover:bg-black/[0.04] transition-all"
                      aria-label={isExpanded ? "Cerrar" : "Expandir"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" strokeWidth={2.2} />
                      ) : (
                        <ChevronDown className="w-4 h-4" strokeWidth={2.2} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Detalles expandibles */}
                {isExpanded && (
                  <div className="border-t border-black/[0.05] px-5 py-5 bg-[#FAFAF8]/60 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-[13px]">
                    <DetailRow
                      icon={<FileText className="w-3.5 h-3.5" />}
                      label="RUT / DNI empresa"
                      value={company.empresaRut}
                    />
                    <DetailRow
                      icon={<Phone className="w-3.5 h-3.5" />}
                      label="Teléfono"
                      value={company.user.phone}
                    />
                    <DetailRow
                      icon={<Briefcase className="w-3.5 h-3.5" />}
                      label="Industria"
                      value={company.industry}
                    />
                    <DetailRow
                      icon={<Globe className="w-3.5 h-3.5" />}
                      label="Sitio web"
                      value={company.website}
                      truncate
                    />

                    {company.description && (
                      <div className="md:col-span-2">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9B9891] mb-1.5">
                          Descripción
                        </p>
                        <p className="text-[13px] text-[#4A4843] leading-relaxed">
                          {company.description}
                        </p>
                      </div>
                    )}

                    <DetailRow
                      className="md:col-span-2"
                      icon={<CalendarDays className="w-3.5 h-3.5" />}
                      label="Registrada el"
                      value={new Date(company.createdAt).toLocaleDateString(
                        "es-CL",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    />

                    {/* Acciones en expanded — incluye el caso mobile y revocar */}
                    <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
                      {company.companyStatus === "PENDING" ? (
                        <>
                          <button
                            onClick={() => handleAction(company.id, "approve")}
                            disabled={isProcessing}
                            className="md:hidden inline-flex items-center gap-1.5 bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white text-[12px] font-semibold px-3.5 py-2 rounded-xl disabled:opacity-60"
                          >
                            <CheckCircle2
                              className="w-3.5 h-3.5"
                              strokeWidth={2.4}
                            />
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleAction(company.id, "reject")}
                            disabled={isProcessing}
                            className="md:hidden inline-flex items-center gap-1.5 bg-white text-[#B91C1C] border border-[#FECACA] text-[12px] font-semibold px-3.5 py-2 rounded-xl disabled:opacity-60"
                          >
                            <XCircle
                              className="w-3.5 h-3.5"
                              strokeWidth={2.4}
                            />
                            Rechazar
                          </button>
                        </>
                      ) : company.companyStatus === "APPROVED" ? (
                        <button
                          onClick={() => handleAction(company.id, "reject")}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1.5 bg-white text-[#B91C1C] border border-[#FECACA] text-[12px] font-semibold px-3.5 py-2 rounded-xl hover:bg-[#FEF2F2] transition-colors disabled:opacity-60"
                        >
                          <XCircle className="w-3.5 h-3.5" strokeWidth={2.4} />
                          Revocar aprobación
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(company.id, "approve")}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white text-[12px] font-semibold px-3.5 py-2 rounded-xl hover:shadow-[0_4px_12px_-2px_rgba(255,106,61,0.5)] transition-all disabled:opacity-60"
                        >
                          <CheckCircle2
                            className="w-3.5 h-3.5"
                            strokeWidth={2.4}
                          />
                          Aprobar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  truncate = false,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  truncate?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9B9891] mb-1 inline-flex items-center gap-1.5">
        <span className="text-[#C9C6BF]">{icon}</span>
        {label}
      </p>
      <p
        className={`text-[13px] text-[#0A0909] font-medium ${truncate ? "truncate" : ""}`}
      >
        {value ?? <span className="text-[#C9C6BF] font-normal">—</span>}
      </p>
    </div>
  );
}
