"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Download, Trash2, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";

const CONFIRM_PHRASE = "ELIMINAR";

export default function MyRightsCard() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleExport = () => {
    // Descarga directa: el browser pega al endpoint con la sesión actual
    // (cookies enviadas automáticamente). El response trae Content-Disposition
    // attachment, el browser lo guarda como archivo.
    window.location.assign("/api/users/me/export-data");
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "X-Confirm-Delete": "yes" },
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setDeleteError(
          data.error ?? "No pudimos eliminar la cuenta. Probá de nuevo.",
        );
        setDeleting(false);
        return;
      }

      // Cuenta eliminada — sign out + redirect home con un flag para
      // mostrar mensaje de despedida (lo maneja el server o el layout).
      await signOut({ callbackUrl: "/?account_deleted=1" });
    } catch {
      setDeleteError("No pudimos conectar con el servidor.");
      setDeleting(false);
    }
  };

  const canConfirmDelete = confirmText.trim() === CONFIRM_PHRASE;

  return (
    <>
      <section
        aria-labelledby="my-rights-title"
        className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08)]"
      >
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-[#FF6A3D]" />
          <h2
            id="my-rights-title"
            className="text-[15px] font-semibold text-[#0A0909]"
          >
            Tus derechos sobre tus datos
          </h2>
        </div>
        <p className="text-[12.5px] text-[#6D6A63] leading-[1.55] mb-5">
          La{" "}
          <Link
            href="/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FF6A3D] hover:underline"
          >
            Ley 21.719
          </Link>{" "}
          te garantiza acceso, rectificación, portabilidad y eliminación de tus
          datos personales. Para consultas o reclamos:{" "}
          <a
            href="mailto:soporte@practix.cl"
            className="text-[#FF6A3D] hover:underline"
          >
            soporte@practix.cl
          </a>
          .
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-black/[0.08] text-[13px] font-semibold text-[#0A0909] hover:bg-[#FAF8F4] transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar mis datos
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmText("");
              setDeleteError(null);
              setShowDeleteModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#C74A1E]/30 text-[13px] font-semibold text-[#C74A1E] hover:bg-[#FFF0ED] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar mi cuenta
          </button>
        </div>
      </section>

      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) {
              setShowDeleteModal(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3
              id="delete-modal-title"
              className="text-[16px] font-semibold text-[#0A0909]"
            >
              Eliminar cuenta — acción irreversible
            </h3>
            <p className="mt-2 text-[13px] text-[#4A4843] leading-[1.55]">
              Vas a eliminar tu cuenta de PractiX y todos tus datos: perfil,
              postulaciones, mensajes, entrevistas y CV. Esta acción no se puede
              deshacer.
            </p>
            <p className="mt-3 text-[13px] text-[#4A4843]">
              Para confirmar, escribí{" "}
              <span className="font-mono font-semibold text-[#C74A1E]">
                {CONFIRM_PHRASE}
              </span>{" "}
              en el campo de abajo:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoFocus
              disabled={deleting}
              aria-label="Confirmación de eliminación de cuenta"
              className="mt-3 w-full rounded-xl px-4 py-2.5 text-[14px] bg-[#FAFAF8] border border-black/[0.08] focus:outline-none focus:border-[#C74A1E]/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(199,74,30,0.08)] font-mono"
            />
            {deleteError && (
              <p className="mt-3 text-[12.5px] text-[#C74A1E]">{deleteError}</p>
            )}
            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-[#0A0909] hover:bg-[#FAF8F4] transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!canConfirmDelete || deleting}
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#C74A1E] text-white text-[12.5px] font-semibold hover:bg-[#A63418] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Eliminando…
                  </>
                ) : (
                  "Eliminar mi cuenta"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
