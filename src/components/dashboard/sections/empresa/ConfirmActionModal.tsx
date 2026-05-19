import { Icon } from "@/components/dashboard/Icon";

type ConfirmActionModalProps = {
  type: "finalize" | "delete";
  busy: boolean;
  internshipTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmActionModal({
  type,
  busy,
  internshipTitle,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  const isDelete = type === "delete";
  const iconName = isDelete ? "x" : "check";
  const title = isDelete ? "Eliminar práctica" : "Finalizar práctica";
  const confirmLabel = isDelete ? "Eliminar" : "Finalizar";
  const busyLabel = isDelete ? "Eliminando…" : "Finalizando…";

  /* Los colores del icono central son dinámicos (rose vs green) — CSS vars del @theme */
  const accentVar = isDelete ? "var(--color-rose)" : "var(--color-green)";
  const accentBgVar = isDelete
    ? "var(--color-rose-bg)"
    : "var(--color-green-bg)";

  return (
    /* Backdrop — bottom sheet en mobile, centrado en sm+ */
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[90] bg-[rgba(11,27,63,.55)] backdrop-blur-[4px]
                 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={[
          "bg-white w-full max-w-[420px]",
          "px-6 sm:px-7 pt-7 pb-6",
          "rounded-t-[24px] sm:rounded-[24px] rounded-b-none sm:rounded-b-[24px]",
          "shadow-[0_24px_64px_-12px_rgba(11,27,63,.4)]",
        ].join(" ")}
      >
        {/* Icono central con colores dinámicos vía CSS vars */}
        <div
          className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-3.5"
          style={{
            background: `linear-gradient(135deg, ${accentBgVar}, color-mix(in_srgb, ${accentVar} 25%, transparent))`,
          }}
        >
          <Icon name={iconName} size={26} color={accentVar} />
        </div>

        <h2 className="text-[17px] font-extrabold tracking-[-0.3px] text-text text-center">
          {title}
        </h2>

        <p className="text-[13px] text-muted text-center mt-2 leading-[1.55]">
          {isDelete ? (
            <>
              ¿Seguro querés eliminar{" "}
              <b className="text-text">{internshipTitle || "esta práctica"}</b>?
              Se borrarán también todas las postulaciones asociadas. Esta acción
              no se puede deshacer.
            </>
          ) : (
            <>
              Vas a cerrar{" "}
              <b className="text-text">{internshipTitle || "esta práctica"}</b>{" "}
              para nuevos postulantes. Conservás los postulantes y mensajes
              históricos, pero ya no podrás reactivarla.
            </>
          )}
        </p>

        <div className="flex gap-2.5 mt-[22px]">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={[
              "flex-1 py-[11px] rounded-[11px] bg-black/5 border-none text-text text-[13px] font-bold",
              busy ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            ].join(" ")}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={[
              "flex-1 py-[11px] rounded-[11px] border-none text-white text-[13px] font-extrabold",
              busy ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
              isDelete ? "bg-rose" : "bg-green",
            ].join(" ")}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
