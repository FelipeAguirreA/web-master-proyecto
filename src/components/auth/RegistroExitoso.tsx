"use client";

import { A } from "./tokens";
import { AuthIcon } from "./AuthIcon";

type Props = {
  onContinue: () => void;
};

export function RegistroExitoso({ onContinue }: Props) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "20px 4px",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 56,
          borderRadius: 18,
          background: `linear-gradient(135deg, ${A.greenBg}, #C5E8C7)`,
          border: `1px solid ${A.green}25`,
          marginBottom: 18,
        }}
      >
        <AuthIcon name="check" size={28} color={A.green} strokeWidth={2.5} />
      </div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: -0.4,
          color: A.text,
          marginBottom: 8,
        }}
      >
        Empresa registrada
      </h2>
      <p
        style={{
          fontSize: 13.5,
          color: A.muted,
          lineHeight: 1.55,
          marginBottom: 24,
          maxWidth: 320,
          marginInline: "auto",
        }}
      >
        Tu cuenta fue creada. El equipo de PractiX revisa la solicitud y te
        notifica por correo cuando queda aprobada.
      </p>
      <button
        type="button"
        onClick={onContinue}
        style={{
          width: "100%",
          padding: "13px 18px",
          background: `linear-gradient(135deg,${A.text},#222)`,
          color: "#fff",
          border: "none",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          boxShadow: `0 8px 22px -8px ${A.text}`,
        }}
      >
        Ir al inicio de sesión
      </button>
    </div>
  );
}
