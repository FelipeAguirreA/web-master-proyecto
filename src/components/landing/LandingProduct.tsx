export function LandingProduct() {
  return (
    <section
      id="producto"
      className="bg-surface py-[100px] px-4 sm:px-6 md:px-8 border-b border-border"
    >
      <div className="max-w-[1100px] mx-auto">
        {/* section header */}
        <div className="rv text-center max-w-[640px] mx-auto mb-14">
          <span className="inline-flex items-center gap-[7px] bg-accent-bg border border-accent-bdr rounded-[40px] px-[14px] py-1 text-[10.5px] font-bold tracking-[1px] text-accent mb-[18px] uppercase">
            El producto
          </span>
          <h2 className="text-[clamp(1.8rem,3.8vw,3rem)] font-extrabold tracking-[-1.5px] text-text leading-[1.1]">
            Todo lo que necesitas.
            <br />
            <span className="text-subtle">Nada de lo que no.</span>
          </h2>
        </div>

        {/* bento grid — 6 cols on lg, stacks on mobile/tablet */}
        <div className="grid grid-cols-6 gap-[14px]">
          {/* IA Matching — span 4 → full width on mobile/tablet */}
          <div className="rv practix-bento-card col-span-6 md:col-span-4 bg-surface border border-border rounded-[22px] p-8 sm:p-10 relative overflow-hidden transition-[box-shadow] duration-300">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[linear-gradient(225deg,var(--color-accent-bg)_0%,transparent_65%)] pointer-events-none" />
            <span className="inline-flex bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-hi))] text-white text-[10px] font-bold tracking-[0.8px] px-3 py-1 rounded-lg mb-5 shadow-[0_4px_12px_color-mix(in_sRGB,var(--color-accent)_28%,transparent)]">
              IA SEMÁNTICA
            </span>
            <h3 className="text-[clamp(1.2rem,2.2vw,1.7rem)] font-extrabold text-text leading-[1.15] tracking-[-0.7px] mb-3">
              Matching que no busca palabras.
              <br />
              Busca{" "}
              <span className="bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-hi))] bg-clip-text text-transparent">
                sentido
              </span>
              .
            </h3>
            <p className="text-sm text-muted leading-[1.7] max-w-[420px] mb-7">
              Modelo multilingüe de 384 dimensiones. Entiende sinónimos,
              contexto y equivalencias. No importa tu carrera — si tienes las
              habilidades, el modelo las encuentra en tu CV.
            </p>
            <div className="flex gap-[10px]">
              {[
                {
                  t: "Tu CV",
                  v: "48 skills",
                  // warm accent gradient uses @theme vars
                  bg: "linear-gradient(135deg,var(--color-accent-bg),color-mix(in_sRGB,var(--color-accent)_9%,transparent))",
                },
                {
                  t: "Embedding",
                  v: "384-dim",
                  // blue brand — not in @theme
                  bg: "linear-gradient(135deg,#E4ECFF,#C5D4FF)",
                },
                {
                  t: "Matches",
                  v: "Top 10",
                  // green brand — not in @theme
                  bg: "linear-gradient(135deg,#E7F8EA,#C5E8C7)",
                },
              ].map((it) => (
                <div
                  key={it.t}
                  className="flex-1 rounded-[14px] px-4 py-[14px] border border-white/70"
                  style={{ background: it.bg }}
                >
                  <p className="text-[9.5px] font-bold tracking-[0.8px] text-muted uppercase mb-[6px]">
                    {it.t}
                  </p>
                  <p className="text-[19px] font-extrabold text-text tracking-[-0.5px]">
                    {it.v}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat — span 2 → full width on mobile, 3 cols on tablet */}
          <div className="rv d1 col-span-6 md:col-span-2 bg-dark rounded-[22px] p-8 overflow-hidden relative text-white">
            <div className="absolute -top-6 -right-6 w-[100px] h-[100px] bg-[color-mix(in_sRGB,var(--color-accent)_16%,transparent)] rounded-full blur-[32px]" />
            <div className="relative">
              <div className="inline-flex items-center gap-[6px] bg-white/[.08] border border-white/[.12] rounded-lg px-[10px] py-[3px] text-[10px] font-semibold text-white/70 mb-[18px]">
                <span className="w-[6px] h-[6px] rounded-full bg-[#28C840] [animation:pulseDot_1.5s_ease_infinite]" />
                CHAT EN VIVO
              </div>
              <h3 className="text-lg font-bold tracking-[-0.5px] leading-[1.25] mb-[10px]">
                Habla directo con la empresa.
              </h3>
              <p className="text-[12.5px] text-white/[.55] leading-[1.55] mb-[22px]">
                Sin intermediarios. Pregunta, coordina, avanza.
              </p>
              <div className="flex flex-col gap-[9px]">
                <div className="flex gap-2 items-end">
                  {/* company avatar: warm pastel brand gradient */}
                  <div className="w-[26px] h-[26px] rounded-full bg-[linear-gradient(135deg,#FFC5A3,#FF9B6A)] shrink-0" />
                  <div className="bg-white/[.08] rounded-[12px_12px_12px_3px] px-[13px] py-[9px] text-xs max-w-[190px]">
                    ¿Tienes experiencia liderando equipos?
                  </div>
                </div>
                <div className="flex gap-2 items-end flex-row-reverse">
                  {/* student avatar: green brand gradient */}
                  <div className="w-[26px] h-[26px] rounded-full bg-[linear-gradient(135deg,#C5E8C7,#8BC68E)] shrink-0" />
                  <div className="bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-hi))] rounded-[12px_12px_3px_12px] px-[13px] py-[9px] text-xs max-w-[190px]">
                    Sí, hice 3 proyectos ✨
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ATS — span 2 → full width on mobile, 3 on tablet, 2 on desktop */}
          <div className="rv practix-bento-card col-span-6 sm:col-span-3 md:col-span-2 bg-surface border border-border rounded-[22px] p-8 transition-[box-shadow] duration-300">
            {/* blue icon bg — brand color, not in @theme */}
            <div className="w-11 h-11 rounded-[14px] bg-[linear-gradient(135deg,#E4ECFF,#C5D4FF)] flex items-center justify-center mb-[18px]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3D5AFF"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text tracking-[-0.4px] mb-[10px]">
              ATS con scoring automático
            </h3>
            <p className="text-[13px] text-muted leading-[1.65] mb-[18px]">
              Para empresas. Pipeline visual, scoring configurable, filtros por
              afinidad semántica.
            </p>
            <div className="flex gap-2">
              {[
                { l: "Nuevos", n: 12, bg: "#E4ECFF" }, // blue brand
                { l: "Revisados", n: 5, bg: "var(--color-accent-bg)" },
                { l: "OK", n: 3, bg: "#E7F8EA" }, // green brand
              ].map((p) => (
                <div
                  key={p.l}
                  className="flex-1 rounded-xl px-3 py-[10px]"
                  style={{ background: p.bg }}
                >
                  <div className="text-[9px] font-bold uppercase tracking-[0.5px] text-muted mb-1">
                    {p.l}
                  </div>
                  <div className="text-[21px] font-black text-text">{p.n}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Agenda — span 2 → full width on mobile, 3 on tablet */}
          <div className="rv d1 col-span-6 sm:col-span-3 md:col-span-2 bg-[linear-gradient(135deg,var(--color-accent-bg),color-mix(in_sRGB,var(--color-accent)_6%,transparent))] border border-accent-bdr rounded-[22px] p-8">
            <div className="w-11 h-11 rounded-[14px] bg-surface flex items-center justify-center mb-[18px] shadow-[0_4px_14px_color-mix(in_sRGB,var(--color-accent)_19%,transparent)]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text tracking-[-0.4px] mb-[10px]">
              Agenda interna
            </h3>
            <p className="text-[13px] text-muted leading-[1.65] mb-4">
              Coordina entrevistas sin salir de la plataforma.
            </p>
            <div className="bg-surface rounded-[14px] px-4 py-[14px] border border-border">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-text">Mar 18</span>
                <span className="text-[9.5px] text-accent bg-accent-bg px-2 py-[2px] rounded-lg font-bold">
                  HOY
                </span>
              </div>
              <div className="text-[12.5px] font-semibold text-text">
                Entrevista · Falabella Tech
              </div>
              <div className="text-[11px] text-muted mt-[2px]">
                14:30 · 30 min
              </div>
            </div>
          </div>

          {/* Speed — span 2 → full width on mobile, 3 on tablet */}
          <div className="rv d2 practix-bento-card col-span-6 sm:col-span-3 md:col-span-2 bg-surface border border-border rounded-[22px] p-8 transition-[box-shadow] duration-300">
            <div className="flex items-baseline gap-1 mb-[14px]">
              <span className="text-[64px] font-black tracking-[-4px] leading-none bg-[linear-gradient(135deg,var(--color-text),var(--color-muted))] bg-clip-text text-transparent">
                2.8
              </span>
              <span className="text-[22px] font-bold text-muted">s</span>
            </div>
            <h3 className="text-[17px] font-bold text-text tracking-[-0.4px] mb-[10px]">
              En leer tu CV completo
            </h3>
            <p className="text-[13px] text-muted leading-[1.65]">
              Parsing + embedding + scoring contra toda la base activa. Antes de
              que termine tu café.
            </p>
          </div>
        </div>
      </div>
      <style>{`
        .practix-bento-card:hover { box-shadow: 0 20px 60px -20px color-mix(in sRGB, var(--color-accent) 16%, transparent); }
      `}</style>
    </section>
  );
}
