"use client";

import { AuthIcon } from "./AuthIcon";

type Props = {
  onContinue: () => void;
};

export function RegistroExitoso({ onContinue }: Props) {
  return (
    <div className="px-1 py-5 text-center">
      <div className="mx-auto mb-[18px] inline-flex h-14 w-14 items-center justify-center rounded-[18px] border border-green/[0.15] bg-gradient-to-br from-green-bg to-[#C5E8C7]">
        <AuthIcon
          name="check"
          size={28}
          color="var(--color-green)"
          strokeWidth={2.5}
        />
      </div>

      <h2 className="mb-2 text-xl font-extrabold tracking-tight text-text">
        Empresa registrada
      </h2>

      <p className="mx-auto mb-6 max-w-[320px] text-[13.5px] leading-[1.55] text-muted">
        Tu cuenta fue creada. El equipo de PractiX revisa la solicitud y te
        notifica por correo cuando queda aprobada.
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="min-h-[44px] w-full rounded-xl border-none bg-gradient-to-br from-text to-[#222] px-[18px] py-3.5 text-sm font-bold text-white shadow-[0_8px_22px_-8px_var(--color-text)] transition-all"
      >
        Ir al inicio de sesión
      </button>
    </div>
  );
}
