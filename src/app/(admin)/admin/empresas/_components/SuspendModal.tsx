"use client";

import { useState } from "react";
import type { Company } from "./types";

interface Props {
  emp: Company;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  processing: boolean;
}

export function SuspendModal({ emp, onClose, onConfirm, processing }: Props) {
  const [reason, setReason] = useState("");

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[rgba(11,27,63,0.55)] z-[70]"
        aria-hidden="true"
      />

      {/* Dialog — bottom sheet en mobile, centrado en sm+ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="suspend-title"
        className={[
          "fixed z-[71] bg-surface flex flex-col",
          // mobile: bottom sheet
          "bottom-0 left-0 right-0 rounded-t-[24px] px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
          // sm+: centrado
          "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[14px]",
          "sm:w-[min(440px,92vw)] sm:p-[22px_24px]",
          "shadow-[0_24px_64px_rgba(11,27,63,0.24)]",
        ].join(" ")}
      >
        <h3
          id="suspend-title"
          className="text-[17px] font-extrabold text-text tracking-[-0.3px] m-0"
        >
          Suspender {emp.companyName}
        </h3>
        <p className="text-[13px] text-muted mt-1.5 leading-[1.5]">
          La empresa quedará bloqueada del panel hasta que la restablezcas. Si
          dejas un motivo, lo verá en su pantalla de cuenta suspendida y en el
          email de aviso.
        </p>
        <label className="block mt-3.5 text-[11px] font-extrabold text-subtle uppercase tracking-[0.4px]">
          Motivo (opcional, máx. 500)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 500))}
          rows={4}
          placeholder="Ej: 3 reportes de candidatos por ofertas sin claridad de renta."
          className="w-full mt-1.5 px-3 py-2.5 border border-border rounded-[9px] text-[13px] text-text font-[inherit] resize-y outline-none bg-dark/[0.025] focus:border-accent/30 focus:bg-surface transition-colors"
        />
        <div className="mt-4 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="px-3.5 py-2.5 bg-surface border border-border text-text rounded-[9px] text-[12.5px] font-bold cursor-pointer disabled:opacity-60 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={processing}
            className="px-3.5 py-2.5 bg-amber text-white border-none rounded-[9px] text-[12.5px] font-extrabold cursor-pointer disabled:opacity-60 min-h-[44px]"
          >
            {processing ? "Suspendiendo…" : "Suspender empresa"}
          </button>
        </div>
      </div>
    </>
  );
}
