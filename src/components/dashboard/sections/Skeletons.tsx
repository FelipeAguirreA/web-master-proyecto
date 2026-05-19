/**
 * Skeleton loaders — Tailwind puro.
 * La animación shimmer usa un keyframe global definido en globals.css (si existe)
 * o se inyecta con una <style> una sola vez via un id guard.
 *
 * SKELETON_BG usa bg-gradient-to-r de Tailwind pero el background-position
 * de la animación requiere la clase [animation:practix-shimmer_1.6s_linear_infinite]
 * junto con la regla @keyframes inyectada una sola vez.
 */

const PULSE_KEYS = `
  @keyframes practix-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

/** Clases compartidas para el efecto shimmer */
const SK =
  "rounded-[6px] [background:linear-gradient(90deg,var(--color-bg)_25%,rgba(0,0,0,.04)_50%,var(--color-bg)_75%)] [background-size:200%_100%] [animation:practix-shimmer_1.6s_linear_infinite]";

function Bar({
  w,
  h = 10,
  className = "",
}: {
  w: string;
  h?: number;
  className?: string;
}) {
  return (
    <div className={`${SK} ${className}`} style={{ width: w, height: h }} />
  );
}

export function PracticaCardSkeleton() {
  return (
    <article className="bg-surface border border-border rounded-[18px] p-5 flex flex-col gap-3.5">
      <style>{PULSE_KEYS}</style>
      <div className="flex gap-3">
        <div className={`${SK} w-11 h-11 rounded-[9px] shrink-0`} />
        <div className="flex-1 flex flex-col gap-1.5">
          <Bar w="90px" h={10} />
          <Bar w="80%" h={13} />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Bar w="60px" h={18} />
        <Bar w="70px" h={18} />
        <Bar w="50px" h={18} />
      </div>
      <div className="flex gap-3">
        <Bar w="110px" h={11} />
        <Bar w="70px" h={11} />
      </div>
      <div className="flex justify-between items-center mt-auto">
        <div className="flex gap-2.5 items-center">
          <div className={`${SK} w-14 h-14 rounded-full`} />
          <div className="flex flex-col gap-1">
            <Bar w="90px" h={10} />
            <Bar w="70px" h={10} />
          </div>
        </div>
        <div className={`${SK} w-[90px] h-9 rounded-[10px]`} />
      </div>
    </article>
  );
}

export function PipelineSkeleton() {
  return (
    <section>
      <style>{PULSE_KEYS}</style>
      <div className="mb-3.5 flex flex-col gap-1.5">
        <Bar w="180px" h={18} />
        <Bar w="260px" h={12} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-[16px] p-3.5 flex flex-col gap-2.5 min-h-[160px]"
          >
            <div className="flex justify-between">
              <Bar w="80px" h={12} />
              <Bar w="24px" h={16} />
            </div>
            {i < 3 &&
              [0, 1].map((j) => (
                <div
                  key={j}
                  className="flex gap-[9px] p-2 bg-bg rounded-[10px]"
                >
                  <div className={`${SK} w-7 h-7 rounded-[9px] shrink-0`} />
                  <div className="flex-1 pt-0.5 flex flex-col gap-1.5">
                    <Bar w="80%" h={10} />
                    <Bar w="50%" h={9} />
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}
