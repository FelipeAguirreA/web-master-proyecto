import { CoLogo } from "@/components/dashboard/atoms/CoLogo";
import type { InternshipDetail } from "./types";

interface CompanyModalProps {
  internship: InternshipDetail;
  co: string;
  color: { bg: string; fg: string };
  companyInitials: string;
  onClose: () => void;
}

export function CompanyModal({
  internship,
  co,
  color,
  companyInitials,
  onClose,
}: CompanyModalProps) {
  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 bg-[rgba(10,9,9,.55)] border-none cursor-pointer z-[80]"
      />

      {/* Sheet — bottom on mobile, centered on sm+ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-modal-title"
        className="fixed bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[81]"
      >
        <div className="bg-bg w-full sm:w-[min(520px,94vw)] rounded-t-[24px] sm:rounded-[24px] max-h-[calc(100dvh-80px)] overflow-auto shadow-[0_24px_64px_rgba(10,9,9,.28)]">
          <div className="p-6 pb-[18px]">
            {/* Header row */}
            <div className="flex gap-4 items-center">
              <CoLogo
                logo={companyInitials}
                logoUrl={internship.company.logo}
                logoBg={color.bg}
                logoFg={color.fg}
                size={64}
              />
              <div className="flex-1 min-w-0">
                <h2
                  id="company-modal-title"
                  className="text-[19px] font-extrabold text-text tracking-[-0.5px] leading-[1.2] m-0"
                >
                  {co}
                </h2>
                {internship.company.industry && (
                  <p className="text-[12px] text-subtle mt-[4px] m-0">
                    {internship.company.industry}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-[8px] bg-black/[.05] border-none cursor-pointer flex items-center justify-center text-[18px] text-muted leading-none shrink-0 hover:bg-black/[.09] transition-colors"
              >
                ×
              </button>
            </div>

            {/* Description */}
            <div className="mt-[18px]">
              <div className="text-[10.5px] font-extrabold text-subtle tracking-[0.4px] uppercase mb-2">
                Sobre la empresa
              </div>
              {internship.company.description ? (
                <p className="text-[13.5px] text-muted leading-[1.65] m-0 whitespace-pre-wrap">
                  {internship.company.description}
                </p>
              ) : (
                <p className="text-[13px] text-subtle italic m-0">
                  Esta empresa todavía no agregó una descripción.
                </p>
              )}
            </div>

            {/* Website */}
            <div className="mt-[18px]">
              <div className="text-[10.5px] font-extrabold text-subtle tracking-[0.4px] uppercase mb-2">
                Sitio web
              </div>
              {internship.company.website ? (
                <a
                  href={
                    internship.company.website.startsWith("http")
                      ? internship.company.website
                      : `https://${internship.company.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-[7px] px-[14px] py-[10px] bg-black/[.04] border border-border text-text rounded-[10px] text-[13.5px] font-bold no-underline max-w-full break-all hover:bg-black/[.07] transition-colors"
                >
                  {internship.company.website.replace(/^https?:\/\//, "")}
                  <span className="text-[13px] text-muted shrink-0">↗</span>
                </a>
              ) : (
                <p className="text-[13px] text-subtle italic m-0">
                  Esta empresa no agregó un sitio web.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
