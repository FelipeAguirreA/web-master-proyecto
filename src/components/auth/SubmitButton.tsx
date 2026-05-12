"use client";

import { A } from "./tokens";

type Props = {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
};

export function SubmitButton({
  children,
  loading = false,
  disabled = false,
}: Props) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="practix-auth-submit"
      style={{
        position: "relative",
        overflow: "hidden",
        marginTop: 6,
        padding: "14px 18px",
        background: `linear-gradient(135deg,${A.text},#222)`,
        color: "#fff",
        border: "none",
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 700,
        cursor: loading || disabled ? "not-allowed" : "pointer",
        boxShadow: `0 10px 28px -10px ${A.text}, 0 4px 10px ${A.accent}33`,
        opacity: loading || disabled ? 0.7 : 1,
        fontFamily: "inherit",
        width: "100%",
      }}
    >
      <span
        aria-hidden
        className="practix-auth-shimmer"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent)",
        }}
      />
      <span style={{ position: "relative" }}>
        {loading ? "Procesando…" : children}
      </span>
      <style>{`
        @keyframes practix-auth-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .practix-auth-shimmer { animation: practix-auth-shimmer 3s ease-in-out infinite; }
      `}</style>
    </button>
  );
}
