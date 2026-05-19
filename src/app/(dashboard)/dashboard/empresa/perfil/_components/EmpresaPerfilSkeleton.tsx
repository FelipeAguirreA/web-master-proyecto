/**
 * Skeleton de carga para el perfil empresa.
 * Usa animate-pulse + tokens @theme.
 */
export function EmpresaPerfilSkeleton() {
  return (
    <main className="px-4 sm:px-6 md:px-8 py-6 max-w-[1180px] mx-auto w-full">
      {/* Hero skeleton */}
      <div className="bg-surface border border-border rounded-[22px] p-6 mb-4 animate-pulse">
        <div className="flex gap-5 items-start flex-wrap">
          <div className="w-[88px] h-[88px] bg-faint rounded-[18px] shrink-0" />
          <div className="flex-1 space-y-3 min-w-[200px]">
            <div className="h-4 bg-faint rounded w-1/4" />
            <div className="h-7 bg-faint rounded w-1/2" />
            <div className="h-3.5 bg-faint rounded w-3/4" />
          </div>
        </div>
      </div>

      {/* Body skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="flex flex-col gap-4">
          <div className="bg-surface border border-border rounded-[18px] p-5 animate-pulse space-y-3">
            <div className="h-4 bg-faint rounded w-1/3" />
            <div className="h-3 bg-faint rounded w-full" />
            <div className="h-3 bg-faint rounded w-5/6" />
            <div className="h-3 bg-faint rounded w-4/6" />
          </div>
          <div className="bg-surface border border-border rounded-[18px] p-5 animate-pulse space-y-3">
            <div className="h-4 bg-faint rounded w-1/2" />
            <div className="h-10 bg-faint rounded" />
            <div className="h-10 bg-faint rounded" />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-[18px] p-5 animate-pulse space-y-3">
          <div className="h-4 bg-faint rounded w-1/2" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between gap-2">
              <div className="h-3 bg-faint rounded w-1/3" />
              <div className="h-3 bg-faint rounded w-1/4" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
