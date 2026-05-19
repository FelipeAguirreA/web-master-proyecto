/**
 * EmpresaCard — vista mobile de una empresa (reemplaza a la fila de tabla).
 * Visible en < md, oculto en md+.
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

export function EmpresaCard({
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
    <div
      onClick={onOpen}
      className="flex gap-3 px-4 py-3.5 border-b border-border cursor-pointer active:bg-dark/[0.02] transition-colors"
    >
      {/* Checkbox solo en PENDING */}
      {tab === "PENDING" && (
        <button
          type="button"
          aria-label={selected ? "Deseleccionar" : "Seleccionar"}
          onClick={(ev) => {
            ev.stopPropagation();
            onSelect();
          }}
          className={[
            "w-4 h-4 rounded-[4px] border-[1.6px] flex items-center justify-center shrink-0 mt-1 cursor-pointer bg-transparent",
            selected
              ? "border-accent bg-accent"
              : "border-faint bg-transparent",
          ].join(" ")}
        >
          {selected && (
            <Icon name="check" size={10} color="#fff" strokeWidth={3} />
          )}
        </button>
      )}

      <CompanyLogo company={e} size="sm" />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[13px] font-extrabold text-text leading-tight truncate">
              {e.companyName}
            </div>
            <div className="text-[11px] text-subtle mt-0.5 truncate">
              {e.industry || e.website || "—"}
            </div>
          </div>

          {/* Acción rápida */}
          {tab === "PENDING" ? (
            <div
              className="flex gap-1 shrink-0"
              onClick={(ev) => ev.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onReject(e.id)}
                disabled={processing}
                title="Rechazar"
                aria-label={`Rechazar ${e.companyName}`}
                className="w-[30px] h-[30px] rounded-[7px] bg-transparent border border-border text-rose cursor-pointer flex items-center justify-center disabled:opacity-50 min-h-[44px] min-w-[44px]"
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
                className="w-[30px] h-[30px] rounded-[7px] bg-green-bg border border-green/20 text-green cursor-pointer flex items-center justify-center disabled:opacity-50 min-h-[44px] min-w-[44px]"
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
              onClick={(ev) => {
                ev.stopPropagation();
                onOpen();
              }}
              className="shrink-0 px-[11px] py-1.5 bg-transparent border border-border text-text rounded-[7px] text-[11.5px] font-bold cursor-pointer min-h-[44px]"
            >
              Ver
            </button>
          )}
        </div>

        {/* Info secundaria */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span className="text-[11px] text-muted truncate max-w-[160px]">
            {e.user.email}
          </span>
          {generic && (
            <span className="text-[8.5px] font-extrabold text-amber bg-amber-bg px-[5px] py-[1px] rounded-[3px] tracking-[0.3px]">
              GENÉRICO
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1.5">
          {tab === "PENDING" && (
            <>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold ${riskCls} bg-current/10 px-2 py-[2px] rounded-[6px] uppercase tracking-[0.3px]`}
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
              <span
                className={`text-[11px] font-bold ${days >= 2 ? "text-rose" : days >= 1 ? "text-amber" : "text-muted"}`}
              >
                {days === 0 ? "Hoy" : days === 1 ? "1 día" : `${days} días`}
              </span>
            </>
          )}
          {tab !== "PENDING" && (
            <span className="text-[11px] text-muted">
              {formatLongDate(
                tab === "SUSPENDED" && e.suspendedAt
                  ? e.suspendedAt
                  : e.updatedAt,
              )}
            </span>
          )}
          {tab === "APPROVED" && (
            <span className="text-[11px] text-muted">
              · {e._count.internships}{" "}
              {e._count.internships === 1 ? "práctica" : "prácticas"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
