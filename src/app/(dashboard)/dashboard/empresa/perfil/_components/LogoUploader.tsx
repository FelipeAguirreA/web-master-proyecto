"use client";

import { useRef } from "react";
import { Icon } from "@/components/dashboard/Icon";

type Props = {
  logo: string | null;
  initials: string;
  companyName: string;
  uploading: boolean;
  error: string | null;
  onUpload: (file: File) => void;
};

/**
 * Avatar circular con overlay de cambio de logo.
 * Touch target ≥44px en el botón de acción.
 */
export function LogoUploader({
  logo,
  initials,
  companyName,
  uploading,
  error,
  onUpload,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="relative shrink-0">
      {/* Avatar */}
      <div
        className={[
          "w-[88px] h-[88px] rounded-[18px] flex items-center justify-center",
          "font-black text-[28px] tracking-[-0.8px] shadow-[0_8px_24px_rgba(0,0,0,.3)] overflow-hidden",
          logo
            ? "bg-transparent"
            : "bg-gradient-to-br from-[#1E3A8A] to-accent",
        ].join(" ")}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={companyName}
            width={88}
            height={88}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover block"
          />
        ) : (
          <span className="text-white">{initials}</span>
        )}
      </div>

      {/* Botón cambiar logo — visible chico (32px) con hit area expandida vía pseudo-elemento */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Cambiar logo"
        aria-label="Cambiar logo"
        className={[
          "absolute -bottom-0.5 -right-0.5 w-8 h-8",
          "rounded-full bg-surface border-none cursor-pointer",
          "flex items-center justify-center text-text",
          "shadow-[0_4px_10px_rgba(0,0,0,.25)]",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "transition-opacity",
          // Hit area expandida (44px touch target) sin afectar el visual
          "before:content-[''] before:absolute before:inset-[-6px] before:rounded-full",
        ].join(" ")}
      >
        <Icon name="plus" size={16} color="var(--color-text)" />
      </button>

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.currentTarget.value = "";
        }}
      />

      {/* Error inline */}
      {error && (
        <p
          role="alert"
          className="absolute top-full left-0 mt-2 text-[11px] text-rose whitespace-nowrap"
        >
          {error}
        </p>
      )}
    </div>
  );
}
