"use client";

import { EmpresaBlock } from "./EmpresaBlock";
import { normalizeUrl, stripProtocol } from "./utils";
import type { CompanyProfile, CompanyStatus } from "./types";

const STATUS_LABEL: Record<CompanyStatus, string> = {
  APPROVED: "Aprobada",
  PENDING: "En revisión",
  REJECTED: "Rechazada",
  SUSPENDED: "Suspendida",
};

type Props = {
  profile: CompanyProfile;
};

export function EmpresaDatos({ profile }: Props) {
  const fields = [
    { l: "Razón social", v: profile.companyName },
    { l: "RUT / Tax ID", v: profile.empresaRut || "—" },
    { l: "Industria", v: profile.industry || "—" },
    { l: "Estado", v: STATUS_LABEL[profile.companyStatus] },
  ];

  return (
    <EmpresaBlock title="Datos de la empresa">
      <div className="flex flex-col gap-[9px] text-[12.5px]">
        {fields.map((f) => (
          <div key={f.l} className="flex justify-between gap-2">
            <span className="text-subtle font-semibold shrink-0">{f.l}</span>
            <span
              className="text-text font-bold text-right min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
              title={f.v}
            >
              {f.v}
            </span>
          </div>
        ))}
      </div>

      {profile.website && (
        <>
          <hr className="border-none border-t border-t-border my-3.5" />
          <a
            href={normalizeUrl(profile.website)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex justify-between px-[11px] py-[7px] bg-dark/[0.025] rounded-lg text-[12px] no-underline hover:bg-accent-bg transition-colors"
          >
            <span className="font-bold text-text">Web</span>
            <span className="text-subtle">
              {stripProtocol(profile.website)}
            </span>
          </a>
        </>
      )}
    </EmpresaBlock>
  );
}
