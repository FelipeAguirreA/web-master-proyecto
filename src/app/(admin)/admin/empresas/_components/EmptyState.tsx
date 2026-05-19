interface Props {
  loading: boolean;
}

export function EmptyState({ loading }: Props) {
  return (
    <div className="py-10 text-center text-[13px] text-subtle">
      {loading ? "Cargando empresas…" : "Sin empresas en esta lista"}
    </div>
  );
}
