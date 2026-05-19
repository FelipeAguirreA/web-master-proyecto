"use client";

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
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-[11px] border border-border bg-surface px-3.5 py-3 text-sm font-semibold text-text transition-all hover:bg-dark/[0.025] hover:border-border-hi disabled:cursor-not-allowed disabled:opacity-60"
    >
      <GoogleSvg size={18} />
      <span>{disabled ? "Conectando…" : "Continuar con Google"}</span>
    </button>
  );
}
