"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
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
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_ICONS: Record<CompanyStatus, React.ReactNode> = {
  PENDING: <Clock className="w-3.5 h-3.5" />,
  APPROVED: <CheckCircle2 className="w-3.5 h-3.5" />,
  REJECTED: <XCircle className="w-3.5 h-3.5" />,
};

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
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Panel de Administración
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Revisá y aprobá las empresas registradas en PractiX
        </p>
      </div>

      {/* Tabs filtro */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              filter === tab.key
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                filter === tab.key
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400 text-sm">
            No hay empresas en esta categoría
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((company) => (
            <div
              key={company.id}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              {/* Row principal */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm shrink-0">
                  {company.companyName.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {company.companyName}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {company.user.name} {company.user.lastName} ·{" "}
                    {company.user.email}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_CLASSES[company.companyStatus]}`}
                  >
                    {STATUS_ICONS[company.companyStatus]}
                    {STATUS_LABELS[company.companyStatus]}
                  </span>

                  {company.companyStatus === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleAction(company.id, "approve")}
                        disabled={processing === company.id}
                        className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleAction(company.id, "reject")}
                        disabled={processing === company.id}
                        className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-60"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rechazar
                      </button>
                    </>
                  )}

                  <button
                    onClick={() =>
                      setExpanded((e) => (e === company.id ? null : company.id))
                    }
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {expanded === company.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Detalles expandibles */}
              {expanded === company.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                      RUT / DNI empresa
                    </p>
                    <p className="text-gray-700">{company.empresaRut ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                      Teléfono
                    </p>
                    <p className="text-gray-700">{company.user.phone ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                      Industria
                    </p>
                    <p className="text-gray-700">{company.industry ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                      Sitio web
                    </p>
                    <p className="text-gray-700 truncate">
                      {company.website ?? "—"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                      Registrada el
                    </p>
                    <p className="text-gray-700">
                      {new Date(company.createdAt).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {company.companyStatus !== "PENDING" && (
                    <div className="col-span-2 flex gap-2 pt-2">
                      {company.companyStatus === "APPROVED" ? (
                        <button
                          onClick={() => handleAction(company.id, "reject")}
                          disabled={processing === company.id}
                          className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-60"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Revocar aprobación
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(company.id, "approve")}
                          disabled={processing === company.id}
                          className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aprobar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
