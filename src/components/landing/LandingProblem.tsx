const PAINS = [
  {
    icon: "📄",
    title: "Postulaciones a ciegas",
    body: "Mandas el CV a decenas de empresas sin saber si tu perfil tiene alguna chance real. La mayoría nunca te responde.",
  },
  {
    icon: "🔍",
    title: "Filtros que no entienden tu perfil",
    body: "Los sistemas buscan coincidencias exactas. Si tu experiencia está descrita de otra forma, aunque sea equivalente, quedas fuera.",
  },
  {
    icon: "🕐",
    title: "Semanas sin noticias",
    body: "Procesos de selección eternos. Sin feedback. Sin saber en qué etapa estás ni qué pasa con tu postulación.",
  },
];

export function LandingProblem() {
  return (
    <section className="bg-surface py-[100px] px-4 sm:px-6 md:px-8 border-b border-border">
      <div className="max-w-[1100px] mx-auto">
        <div className="rv max-w-[620px] mb-14">
          <span className="inline-flex items-center gap-[7px] bg-accent-bg border border-accent-bdr rounded-[40px] px-[14px] py-1 text-[10.5px] font-bold tracking-[1px] text-accent mb-[18px] uppercase">
            El problema
          </span>
          <h2 className="text-[clamp(1.8rem,3.8vw,3rem)] font-extrabold tracking-[-1.5px] text-text leading-[1.1] mb-[14px] text-balance">
            El proceso de prácticas
            <br />
            está roto.
          </h2>
          <p className="text-[17px] text-muted leading-[1.65]">
            Dedicas horas a postularte a prácticas que nunca responden. No
            porque no sirvas, sino porque el sistema no sabe leer tu CV.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PAINS.map((p, i) => (
            <div
              key={i}
              className={`practix-problem-card rv d${i + 1} bg-surface border border-border rounded-[20px] p-7 sm:p-8 overflow-hidden relative transition-[transform,box-shadow] duration-300`}
            >
              <div className="absolute top-0 right-0 w-[130px] h-[130px] bg-[radial-gradient(circle,var(--color-accent-bg)_0%,transparent_70%)] pointer-events-none" />
              <div className="text-[32px] mb-5">{p.icon}</div>
              <h3 className="text-[17px] font-bold text-text mb-[10px] tracking-[-0.4px]">
                {p.title}
              </h3>
              <p className="text-sm text-muted leading-[1.68]">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="rv mt-[52px] py-[30px] px-[30px] sm:px-[34px] bg-[linear-gradient(135deg,var(--color-accent-bg),var(--color-bg))] border border-accent-bdr rounded-[20px] flex items-center gap-[22px] flex-wrap relative overflow-hidden">
          <div className="shrink-0 w-[3px] self-stretch bg-accent rounded-sm min-h-[44px]" />
          <div>
            <p className="text-[17px] font-bold text-text mb-1">
              PractiX resuelve los tres de un solo paso.
            </p>
            <p className="text-[14.5px] text-muted leading-[1.65]">
              Sube tu CV una vez. La IA entiende tu perfil en profundidad y solo
              te muestra prácticas donde tu match ya es alto, antes de
              postularte.
            </p>
          </div>
        </div>
      </div>
      <style>{`
        .practix-problem-card:hover { transform: translateY(-4px); box-shadow: 0 20px 48px -16px color-mix(in sRGB, var(--color-accent) 13%, transparent); }
      `}</style>
    </section>
  );
}
