"use client";

import { Icon } from "@/components/dashboard/Icon";
import { LogoUploader } from "./LogoUploader";
import { normalizeUrl, stripProtocol } from "./utils";
import type { CompanyProfile } from "./types";

type Props = {
  profile: CompanyProfile;
  tagline: string;
  initials: string;
  verified: boolean;
  logoUploading: boolean;
  logoError: string | null;
  onLogoUpload: (file: File) => void;
  onEdit: () => void;
};

export function EmpresaHero({
  profile,
  tagline,
  initials,
  verified,
  logoUploading,
  logoError,
  onLogoUpload,
  onEdit,
}: Props) {
  return (
    <section className="relative bg-dark text-white rounded-[22px] p-5 sm:p-6 md:p-[26px_28px] mb-4 overflow-hidden">
      {/* Orb decorativo */}
      <div
        aria-hidden
        className="absolute -top-24 -right-12 w-[380px] h-[380px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 25%, transparent), transparent 65%)",
        }}
      />
      {/* Grid de puntos */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px,rgba(255,255,255,.05) 1px,transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative flex flex-wrap gap-4 sm:gap-[22px] items-start">
        {/* Logo */}
        <LogoUploader
          logo={profile.logo}
          initials={initials}
          companyName={profile.companyName}
          uploading={logoUploading}
          error={logoError}
          onUpload={onLogoUpload}
        />

        {/* Info */}
        <div className="flex-1 min-w-[200px] sm:min-w-[240px]">
          {/* Badge verificada + industria */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {verified && (
              <span className="inline-flex items-center gap-[5px] text-[10.5px] font-extrabold text-accent-hi bg-accent/[0.18] px-2.5 py-0.5 rounded-[5px] tracking-[0.4px] uppercase">
                <Icon
                  name="check"
                  size={11}
                  color="currentColor"
                  strokeWidth={3}
                />
                Verificada
              </span>
            )}
            {profile.industry && (
              <span className="text-[11px] text-white/55">
                · {profile.industry}
              </span>
            )}
          </div>

          {/* Nombre empresa */}
          <h1 className="text-[clamp(1.6rem,2.8vw,2.1rem)] font-extrabold tracking-[-1.2px] leading-[1.05] m-0">
            {profile.companyName}
          </h1>

          {/* Tagline */}
          {tagline && (
            <p className="text-sm text-white/70 max-w-[560px] leading-[1.55] mt-2 mb-3.5">
              {tagline}
            </p>
          )}

          {/* Meta links */}
          <div
            className={[
              "flex gap-3.5 flex-wrap text-[11.5px] text-white/60",
              tagline ? "" : "mt-3.5",
            ].join(" ")}
          >
            {profile.website && (
              <a
                href={normalizeUrl(profile.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-[5px] text-white/85 no-underline hover:text-white transition-colors"
              >
                <Icon name="search" size={13} color="rgba(255,255,255,.5)" />
                {stripProtocol(profile.website)}
              </a>
            )}
            {profile.empresaRut && (
              <span className="inline-flex items-center gap-[5px]">
                <Icon name="doc" size={13} color="rgba(255,255,255,.5)" />
                RUT {profile.empresaRut}
              </span>
            )}
          </div>
        </div>

        {/* Botón editar */}
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[170px]">
          <button
            type="button"
            onClick={onEdit}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-white/[0.08] border border-white/[0.14] text-white rounded-[11px] text-[13px] font-bold cursor-pointer hover:bg-white/[0.13] transition-colors"
          >
            Editar perfil
          </button>
        </div>
      </div>
    </section>
  );
}
