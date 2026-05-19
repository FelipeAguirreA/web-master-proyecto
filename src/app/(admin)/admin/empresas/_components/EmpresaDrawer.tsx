"use client";

import { Icon } from "@/components/dashboard/Icon";
import type { Company } from "./types";
import { CompanyLogo } from "./CompanyLogo";
import {
  inferRisk,
  isGenericEmail,
  formatLongDate,
  statusBadge,
  riskColorClass,
  riskBgClass,
  riskBorderClass,
  riskLabel,
} from "./utils";

interface Props {
  emp: Company;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUnsuspend: (id: string) => void;
  onReopen: (id: string) => void;
  onOpenSuspend: (emp: Company) => void;
  processing: boolean;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-extrabold text-subtle tracking-[0.4px] uppercase mb-[9px]">
      {children}
    </div>
  );
}

export function EmpresaDrawer({
  emp,
  onClose,
  onApprove,
  onReject,
  onUnsuspend,
  onReopen,
  onOpenSuspend,
  processing,
}: Props) {
  const badge = statusBadge(emp.companyStatus);
  const isPending = emp.companyStatus === "PENDING";
  const risk = isPending ? inferRisk(emp) : null;
  const riskCls = risk ? riskColorClass(risk.level) : "";
  const riskBgCls = risk ? riskBgClass(risk.level) : "";
  const riskBorderCls = risk ? riskBorderClass(risk.level) : "";
  const contactName =
    [emp.user.name, emp.user.lastName].filter(Boolean).join(" ") || "—";
  const generic = isGenericEmail(emp.user.email);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[rgba(11,27,63,0.5)] z-[60]"
        aria-hidden="true"
      />

      {/* Panel — bottom sheet mobile, side drawer en sm+ */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${emp.companyName}`}
        className={[
          "fixed z-[61] bg-surface flex flex-col",
          // mobile: bottom sheet full-width (w-screen explícito)
          "bottom-0 left-0 w-screen rounded-t-[20px] max-h-[90dvh]",
          // sm+: side drawer pegado a la derecha
          "sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:w-[min(560px,95vw)] sm:rounded-none sm:max-h-none sm:rounded-tl-none",
          "shadow-[-20px_0_40px_rgba(11,27,63,0.18)]",
        ].join(" ")}
      >
        {/* Header */}
        <header className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-dark/[0.08] hover:bg-dark/[0.14] border-none cursor-pointer flex items-center justify-center shrink-0 transition-colors z-10"
          >
            <Icon name="x" size={16} color="var(--color-text)" />
          </button>
          <div className="mb-2 pr-12">
            <span
              className={`inline-block text-[10px] font-extrabold ${badge.colorClass} ${badge.bgClass} px-2 py-[2px] rounded tracking-[0.3px] uppercase`}
            >
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <CompanyLogo company={emp} size="md" />
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-extrabold text-text tracking-[-0.4px] leading-[1.2] m-0 truncate">
                {emp.companyName}
              </h2>
              <p className="text-[11px] text-muted mt-[2px]">
                {[emp.industry, emp.website]
                  .filter((v) => v && v.trim() !== "")
                  .join(" · ") || "Sin datos adicionales"}
              </p>
            </div>
          </div>
        </header>

        {/* Cuerpo scrollable — min-h-0 es crítico para que flex-1 + overflow-y-auto funcione */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-3.5 flex flex-col gap-3">
          {/* Bloque de riesgo (solo PENDING) */}
          {risk && (
            <div
              className={`p-[12px_14px] ${riskBgCls} border ${riskBorderCls} rounded-[11px] flex gap-[11px] items-start`}
            >
              <span
                className={`w-[26px] h-[26px] rounded-full bg-white ${riskCls} flex items-center justify-center font-black text-xs shrink-0`}
              >
                !
              </span>
              <div>
                <div
                  className={`text-xs font-extrabold ${riskCls} tracking-[0.3px] uppercase mb-[3px]`}
                >
                  Riesgo {riskLabel(risk.level)}
                </div>
                <p className="text-[12.5px] text-text leading-[1.5] m-0">
                  {risk.note}
                </p>
              </div>
            </div>
          )}

          {/* Datos empresa */}
          <div>
            <SectionLabel>Datos de la empresa</SectionLabel>
            <div className="grid grid-cols-2 gap-[9px]">
              {[
                { l: "RUT / Tax ID", v: emp.empresaRut || "—" },
                { l: "Industria", v: emp.industry || "—" },
                { l: "Web", v: emp.website || "—" },
                { l: "Registrada", v: formatLongDate(emp.createdAt) },
              ].map((f) => (
                <div
                  key={f.l}
                  className="p-[9px_11px] bg-dark/[0.03] rounded-[9px]"
                >
                  <div className="text-[10px] font-bold text-subtle uppercase tracking-[0.4px]">
                    {f.l}
                  </div>
                  <div
                    className="text-[12.5px] text-text font-bold mt-[2px] truncate overflow-hidden text-ellipsis"
                    title={f.v}
                  >
                    {f.v}
                  </div>
                </div>
              ))}
            </div>
            {emp.description && (
              <p className="mt-2.5 text-[12.5px] text-muted leading-[1.5] p-[10px_12px] bg-dark/[0.03] rounded-[10px]">
                {emp.description}
              </p>
            )}
          </div>

          {/* Contacto registrante */}
          <div>
            <SectionLabel>Contacto registrante</SectionLabel>
            <div className="p-[11px_13px] bg-dark/[0.03] rounded-[11px]">
              <div className="text-[13px] font-extrabold text-text">
                {contactName}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-text font-semibold">
                  {emp.user.email}
                </span>
                {generic && (
                  <span className="text-[9.5px] font-extrabold text-amber bg-amber-bg px-1.5 py-[2px] rounded-[4px] tracking-[0.3px]">
                    EMAIL GENÉRICO
                  </span>
                )}
              </div>
              {emp.user.phone && (
                <div className="text-xs text-muted mt-[3px]">
                  {emp.user.phone}
                </div>
              )}
            </div>
          </div>

          {/* Actividad (APPROVED o SUSPENDED) */}
          {(emp.companyStatus === "APPROVED" ||
            emp.companyStatus === "SUSPENDED") && (
            <div>
              <SectionLabel>Actividad en la plataforma</SectionLabel>
              <div className="p-[12px_14px] bg-dark/[0.03] rounded-[10px] flex items-baseline gap-2.5">
                <span className="text-[26px] font-black text-text tracking-[-0.8px]">
                  {emp._count.internships}
                </span>
                <span className="text-[12.5px] text-muted font-semibold">
                  {emp._count.internships === 1
                    ? "práctica publicada"
                    : "prácticas publicadas"}
                </span>
              </div>
            </div>
          )}

          {/* Motivo suspensión */}
          {emp.companyStatus === "SUSPENDED" && (
            <div
              className={[
                "p-[12px_14px] border rounded-[11px]",
                emp.suspensionReason
                  ? "bg-amber-bg border-amber/20"
                  : "bg-dark/[0.04] border-faint/20",
              ].join(" ")}
            >
              <div
                className={`text-[11px] font-extrabold tracking-[0.4px] uppercase mb-[5px] ${
                  emp.suspensionReason ? "text-amber" : "text-subtle"
                }`}
              >
                Motivo de la suspensión
              </div>
              <p
                className={[
                  "text-[12.5px] leading-[1.5] m-0 whitespace-pre-wrap",
                  emp.suspensionReason ? "text-text" : "text-muted italic",
                ].join(" ")}
              >
                {emp.suspensionReason ??
                  "No se registró un motivo al suspender esta empresa."}
              </p>
              {emp.suspendedAt && (
                <p className="text-[11px] text-subtle mt-1.5">
                  Suspendida el {formatLongDate(emp.suspendedAt)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <footer className="px-4 sm:px-5 py-3 border-t border-border flex gap-2 shrink-0">
          {emp.companyStatus === "PENDING" && (
            <>
              <button
                type="button"
                onClick={() => onReject(emp.id)}
                disabled={processing}
                className="flex-none px-4 py-[11px] bg-surface border border-border text-rose rounded-[10px] text-[13px] font-extrabold cursor-pointer disabled:opacity-60 min-h-[44px]"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => onApprove(emp.id)}
                disabled={processing}
                className="flex-1 py-[11px] bg-gradient-to-br from-green to-[#22C55E] text-white border-none rounded-[10px] text-[13px] font-extrabold cursor-pointer disabled:opacity-60 shadow-[0_4px_12px_color-mix(in_srgb,var(--color-green)_25%,transparent)] min-h-[44px]"
              >
                Aprobar empresa
              </button>
            </>
          )}
          {emp.companyStatus === "APPROVED" && (
            <button
              type="button"
              onClick={() => onOpenSuspend(emp)}
              disabled={processing}
              className="flex-1 py-[11px] bg-surface border border-border text-amber rounded-[10px] text-[13px] font-extrabold cursor-pointer disabled:opacity-60 min-h-[44px]"
            >
              Suspender empresa
            </button>
          )}
          {emp.companyStatus === "REJECTED" && (
            <button
              type="button"
              onClick={() => onReopen(emp.id)}
              disabled={processing}
              className="flex-1 py-[11px] bg-surface border border-border text-text rounded-[10px] text-[13px] font-bold cursor-pointer disabled:opacity-60 min-h-[44px]"
            >
              Reabrir revisión
            </button>
          )}
          {emp.companyStatus === "SUSPENDED" && (
            <button
              type="button"
              onClick={() => onUnsuspend(emp.id)}
              disabled={processing}
              className="flex-1 py-[11px] bg-gradient-to-br from-green to-[#22C55E] text-white border-none rounded-[10px] text-[13px] font-extrabold cursor-pointer disabled:opacity-60 shadow-[0_4px_12px_color-mix(in_srgb,var(--color-green)_25%,transparent)] min-h-[44px]"
            >
              Restablecer empresa
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}
