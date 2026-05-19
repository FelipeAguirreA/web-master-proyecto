/**
 * EmpresaTable — tabla desktop (hidden en mobile, visible en md+).
 * En mobile se usan EmpresaCard en su lugar.
 */
import { Icon } from "@/components/dashboard/Icon";
import type { Company, TabKey } from "./types";
import { EmpresaRow } from "./EmpresaRow";

interface Props {
  companies: Company[];
  tab: TabKey;
  loading: boolean;
  selected: Set<string>;
  filtered: Company[];
  processing: boolean;
  onToggleSel: (id: string) => void;
  onSelectAll: () => void;
  onClearSel: () => void;
  onOpen: (c: Company) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const HEADERS_PENDING = [
  "Empresa",
  "RUT / Tax ID",
  "Industria",
  "Contacto",
  "Riesgo",
  "Espera",
  "",
];
const HEADERS_OTHER = [
  "Empresa",
  "RUT / Tax ID",
  "Industria",
  "Contacto",
  "Prácticas / Motivo",
  "Fecha",
  "",
];

export function EmpresaTable({
  tab,
  loading,
  selected,
  filtered,
  processing,
  onToggleSel,
  onSelectAll,
  onClearSel,
  onOpen,
  onApprove,
  onReject,
}: Props) {
  const headers = tab === "PENDING" ? HEADERS_PENDING : HEADERS_OTHER;
  const allSelected = selected.size === filtered.length && filtered.length > 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[720px]">
        <thead>
          <tr className="bg-dark/[0.025] border-b border-border">
            {tab === "PENDING" && (
              <th className="p-[10px_12px] w-8">
                <span
                  onClick={allSelected ? onClearSel : onSelectAll}
                  role="checkbox"
                  aria-checked={allSelected}
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" || e.key === " "
                      ? allSelected
                        ? onClearSel()
                        : onSelectAll()
                      : undefined
                  }
                  className={[
                    "inline-flex cursor-pointer w-4 h-4 rounded-[4px] border-[1.6px] items-center justify-center",
                    allSelected
                      ? "border-accent bg-accent"
                      : "border-faint bg-transparent",
                  ].join(" ")}
                >
                  {allSelected && (
                    <Icon name="check" size={10} color="#fff" strokeWidth={3} />
                  )}
                </span>
              </th>
            )}
            {headers.map((h, i) => (
              <th
                key={i}
                className="text-left p-[10px_12px] text-[10.5px] font-extrabold text-subtle tracking-[0.4px] uppercase whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td
                colSpan={tab === "PENDING" ? 8 : 7}
                className="py-10 text-center text-[13px] text-subtle"
              >
                Cargando empresas…
              </td>
            </tr>
          )}
          {!loading && filtered.length === 0 && (
            <tr>
              <td
                colSpan={tab === "PENDING" ? 8 : 7}
                className="py-10 text-center text-[13px] text-subtle"
              >
                Sin empresas en esta lista
              </td>
            </tr>
          )}
          {!loading &&
            filtered.map((c) => (
              <EmpresaRow
                key={c.id}
                company={c}
                tab={tab}
                selected={selected.has(c.id)}
                processing={processing}
                onSelect={() => onToggleSel(c.id)}
                onOpen={() => onOpen(c)}
                onApprove={onApprove}
                onReject={onReject}
              />
            ))}
        </tbody>
      </table>
    </div>
  );
}
