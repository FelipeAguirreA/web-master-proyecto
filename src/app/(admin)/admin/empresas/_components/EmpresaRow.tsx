/**
 * EmpresaRow — fila individual de la tabla desktop.
 */
import { Icon } from "@/components/dashboard/Icon";
import type { Company, TabKey } from "./types";
import { CompanyLogo } from "./CompanyLogo";
import {
  inferRisk,
  isGenericEmail,
  daysWaiting,
  formatLongDate,
  riskColorClass,
  riskLabel,
} from "./utils";

interface Props {
  company: Company;
  tab: TabKey;
  selected: boolean;
  processing: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function EmpresaRow({
  company: e,
  tab,
  selected,
  processing,
  onSelect,
  onOpen,
  onApprove,
  onReject,
}: Props) {
  const risk = inferRisk(e);
  const riskCls = riskColorClass(risk.level);
  const days = daysWaiting(e.createdAt);
  const generic = isGenericEmail(e.user.email);
  const contactName =
    [e.user.name, e.user.lastName].filter(Boolean).join(" ") || "—";

  return (
    <tr
      onClick={onOpen}
      className="border-b border-border cursor-pointer transition-colors hover:bg-dark/[0.022]"
    >
      {tab === "PENDING" && (
        <td
          className="p-3 w-8"
          onClick={(ev) => {
            ev.stopPropagation();
            onSelect();
          }}
        >
          <span
            className={[
              "inline-flex w-4 h-4 rounded-[4px] border-[1.6px] items-center justify-center cursor-pointer",
              selected
                ? "border-accent bg-accent"
                : "border-faint bg-transparent",
            ].join(" ")}
          >
            {selected && (
              <Icon name="check" size={10} color="#fff" strokeWidth={3} />
            )}
          </span>
        </td>
      )}

      {/* Empresa */}
      <td className="p-3">
        <div className="flex items-center gap-[11px]">
          <CompanyLogo company={e} size="sm" />
          <div className="min-w-0">
            <div className="text-[12.5px] font-extrabold text-text truncate">
              {e.companyName}
            </div>
            <div className="text-[10.5px] text-subtle mt-[1px] truncate">
              {e.website || "—"}
            </div>
          </div>
        </div>
      </td>

      {/* RUT */}
      <td className="p-3 text-xs text-muted font-mono whitespace-nowrap">
        {e.empresaRut || "—"}
      </td>

      {/* Industria */}
      <td className="p-3 text-xs text-text font-semibold">
        {e.industry || "—"}
      </td>

      {/* Contacto */}
      <td className="p-3">
        <div className="text-xs font-bold text-text">{contactName}</div>
        <div className="flex items-center gap-[5px] mt-[1px] flex-wrap">
          <span className="text-[11px] text-muted max-w-[180px] truncate overflow-hidden">
            {e.user.email}
          </span>
          {generic && (
            <span className="text-[8.5px] font-extrabold text-amber bg-amber-bg px-[5px] py-[1px] rounded-[3px] tracking-[0.3px]">
              GENÉRICO
            </span>
          )}
        </div>
      </td>

      {/* Columna condicional: Riesgo / Prácticas / Motivo */}
      <td className="p-3">
        {tab === "PENDING" && (
          <span
            className={`inline-flex items-center gap-[5px] text-[11.5px] font-bold ${riskCls} px-[9px] py-[3px] rounded-[6px] uppercase tracking-[0.3px]`}
            style={{
              background: `color-mix(in srgb, currentColor 12%, transparent)`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "currentColor" }}
            />
            {riskLabel(risk.level)}
          </span>
        )}
        {tab === "APPROVED" && (
          <span className="text-[13px] font-extrabold text-text">
            {e._count.internships}
          </span>
        )}
        {tab === "REJECTED" && (
          <span className="text-[11.5px] text-muted">
            Documentación insuficiente
          </span>
        )}
        {tab === "SUSPENDED" && (
          <span className="text-[11.5px] text-muted line-clamp-2 max-w-[240px]">
            {e.suspensionReason || "Sin motivo registrado"}
          </span>
        )}
      </td>

      {/* Espera / Fecha */}
      <td className="p-3">
        {tab === "PENDING" ? (
          <span
            className={`text-[11.5px] font-bold whitespace-nowrap ${
              days >= 2 ? "text-rose" : days >= 1 ? "text-amber" : "text-muted"
            }`}
          >
            {days === 0 ? "Hoy" : days === 1 ? "1 día" : `${days} días`}
          </span>
        ) : (
          <span className="text-[11.5px] text-muted">
            {formatLongDate(
              tab === "SUSPENDED" && e.suspendedAt
                ? e.suspendedAt
                : e.updatedAt,
            )}
          </span>
        )}
      </td>

      {/* Acciones */}
      <td className="p-3 text-right" onClick={(ev) => ev.stopPropagation()}>
        {tab === "PENDING" ? (
          <div className="inline-flex gap-1">
            <button
              type="button"
              onClick={() => onReject(e.id)}
              disabled={processing}
              title="Rechazar"
              aria-label={`Rechazar ${e.companyName}`}
              className="w-[30px] h-[30px] rounded-[7px] bg-transparent border border-border text-rose cursor-pointer flex items-center justify-center disabled:opacity-50"
            >
              <Icon
                name="x"
                size={12}
                color="var(--color-rose)"
                strokeWidth={2.5}
              />
            </button>
            <button
              type="button"
              onClick={() => onApprove(e.id)}
              disabled={processing}
              title="Aprobar"
              aria-label={`Aprobar ${e.companyName}`}
              className="w-[30px] h-[30px] rounded-[7px] bg-green-bg border border-green/20 text-green cursor-pointer flex items-center justify-center disabled:opacity-50"
            >
              <Icon
                name="check"
                size={13}
                color="var(--color-green)"
                strokeWidth={2.5}
              />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onOpen()}
            className="px-[11px] py-[5px] bg-transparent border border-border text-text rounded-[7px] text-[11.5px] font-bold cursor-pointer"
          >
            Ver
          </button>
        )}
      </td>
    </tr>
  );
}
