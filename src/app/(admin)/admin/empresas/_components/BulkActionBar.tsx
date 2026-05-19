interface Props {
  selectedCount: number;
  processing: boolean;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount,
  processing,
  onApproveAll,
  onRejectAll,
  onClear,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-accent-bg border-b border-accent-bdr flex-wrap">
      <span className="text-xs font-extrabold text-accent">
        {selectedCount} seleccionadas
      </span>
      <button
        type="button"
        onClick={onApproveAll}
        disabled={processing}
        className="px-[11px] py-1.5 bg-green text-white border-none rounded-[7px] text-[11.5px] font-bold cursor-pointer disabled:opacity-60 min-h-[36px]"
      >
        Aprobar todas
      </button>
      <button
        type="button"
        onClick={onRejectAll}
        disabled={processing}
        className="px-[11px] py-1.5 bg-surface text-rose border border-border rounded-[7px] text-[11.5px] font-bold cursor-pointer disabled:opacity-60 min-h-[36px]"
      >
        Rechazar todas
      </button>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto bg-transparent border-none text-muted text-[11.5px] font-bold cursor-pointer px-2.5 py-1.5 min-h-[36px]"
      >
        Cancelar
      </button>
    </div>
  );
}
