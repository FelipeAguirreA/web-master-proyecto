"use client";

import { A } from "./tokens";
import { GoogleSvg } from "./AuthIcon";

type Props = {
  onClick: () => void;
  disabled?: boolean;
};

export function GoogleButton({ onClick, disabled = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="practix-google-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "13px 14px",
        background: A.surface,
        border: `1px solid ${A.border}`,
        borderRadius: 11,
        fontSize: 14,
        fontWeight: 600,
        color: A.text,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all .15s",
        fontFamily: "inherit",
        width: "100%",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <GoogleSvg size={18} />
      <span>{disabled ? "Conectando…" : "Continuar con Google"}</span>
      <style>{`
        .practix-google-btn:not(:disabled):hover {
          background: rgba(0,0,0,.025);
          border-color: ${A.borderHi};
        }
      `}</style>
    </button>
  );
}
