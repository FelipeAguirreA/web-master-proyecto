"use client";

import { useState, type CSSProperties } from "react";

type CoLogoProps = {
  /** Iniciales o texto de fallback cuando no hay imagen. */
  logo: string;
  /** URL de la imagen del logo. Si está presente y carga OK, se muestra
   *  en vez del fallback. Si la carga falla → fallback automático. */
  logoUrl?: string | null;
  /** Override del color de fondo del fallback. Por defecto: `--color-text`. */
  logoBg?: string;
  /** Override del color del texto del fallback. Por defecto: blanco. */
  logoFg?: string;
  size?: number;
};

export function CoLogo({
  logo,
  logoUrl,
  logoBg,
  logoFg,
  size = 36,
}: CoLogoProps) {
  const [broken, setBroken] = useState(false);
  const showImage = !!logoUrl && !broken;
  const isLarge = size > 40;

  const cssVars = {
    "--logo-size": `${size}px`,
    "--logo-bg": showImage ? "#ffffff" : (logoBg ?? "var(--color-text)"),
    "--logo-fg": logoFg ?? "#ffffff",
  } as CSSProperties;

  return (
    <div
      className={[
        "flex items-center justify-center font-extrabold flex-shrink-0 overflow-hidden tracking-[-0.4px]",
        "w-[var(--logo-size)] h-[var(--logo-size)]",
        "bg-[var(--logo-bg)] text-[var(--logo-fg)]",
        isLarge ? "rounded-[12px] text-[13px]" : "rounded-[9px] text-[11px]",
      ].join(" ")}
      style={cssVars}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl!}
          alt={logo}
          onError={() => setBroken(true)}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      ) : (
        logo
      )}
    </div>
  );
}
