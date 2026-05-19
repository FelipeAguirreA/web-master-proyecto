/**
 * Skeleton de carga reutilizable para las secciones del dashboard empresa.
 * El keyframe practix-emp-spin se registra en globals.css.
 */

type CardSkeletonProps = {
  label: string;
};

export function CardSkeleton({ label }: CardSkeletonProps) {
  return (
    <div className="bg-surface border border-border rounded-[18px] p-5 sm:p-6 flex items-center gap-2.5 text-muted text-[13px]">
      <span
        className="w-4 h-4 rounded-full border-2 border-accent/20 border-t-accent
                   [animation:practix-emp-spin_.9s_linear_infinite]"
      />
      {label}
    </div>
  );
}
