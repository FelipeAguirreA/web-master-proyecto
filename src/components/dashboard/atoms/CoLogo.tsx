"use client";

import { useState } from "react";
import { D } from "../tokens";

type CoLogoProps = {
  /** Iniciales o texto de fallback cuando no hay imagen. */
  logo: string;
  /** URL de la imagen del logo. Si está presente y carga OK, se muestra
   *  en vez del fallback. Si la carga falla → fallback automático. */
  logoUrl?: string | null;
  logoBg?: string;
  logoFg?: string;
  size?: number;
};

export function CoLogo({
  logo,
  logoUrl,
  logoBg = D.text,
  logoFg = "#fff",
  size = 36,
}: CoLogoProps) {
  const [broken, setBroken] = useState(false);
  const showImage = !!logoUrl && !broken;
  const radius = size > 40 ? 12 : 9;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: showImage ? "#fff" : logoBg,
        color: logoFg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: size > 40 ? 13 : 11,
        letterSpacing: -0.4,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl!}
          alt={logo}
          onError={() => setBroken(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        logo
      )}
    </div>
  );
}
