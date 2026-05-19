import Link from "next/link";

export function LandingCTA() {
  return (
    <section className="bg-surface py-[80px] px-4 sm:px-6 md:px-8 pb-24">
      <div className="max-w-[1100px] mx-auto">
        <div className="rv-s bg-dark rounded-[28px] p-[clamp(44px,6vw,88px)] text-center relative overflow-hidden">
          {/* radial glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse,color-mix(in_sRGB,var(--color-accent)_22%,transparent)_0%,transparent_58%)] pointer-events-none" />
          {/* dot grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px,rgba(255,255,255,.035) 1px,transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          {/* bottom orb — dynamic animation, must stay inline */}
          <div className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full bg-[color-mix(in_sRGB,var(--color-accent)_9%,transparent)] blur-[60px] [animation:orbFloat2_16s_ease-in-out_infinite] pointer-events-none" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 bg-white/[.07] border border-white/[.12] rounded-[40px] px-4 py-[5px] text-[11px] font-semibold text-white/70 mb-7 tracking-[0.8px]">
              <span className="w-[6px] h-[6px] rounded-full bg-accent [animation:pulseDot_1.5s_ease_infinite]" />
              100% GRATUITO PARA ESTUDIANTES
            </span>
            <h2 className="text-[clamp(2rem,5.5vw,4.2rem)] font-black tracking-[-3px] text-white leading-[1.02] mb-5 text-balance">
              La próxima práctica que cambia
              <br />
              tu CV está a{" "}
              <span className="bg-[linear-gradient(135deg,#FFD4A8,var(--color-accent))] bg-clip-text text-transparent">
                un click
              </span>
              .
            </h2>
            <p className="text-[17px] text-white/[.52] max-w-[480px] mx-auto mb-10 leading-[1.65]">
              Sin formularios largos. Sin trámites burocráticos. Entras con
              Google, subes tu CV, ves las prácticas que te corresponden.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-7">
              <Link
                href="/login?role=student"
                className="practix-cta-final-warm inline-flex items-center gap-2 bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-hi))] text-white px-8 py-4 rounded-[14px] font-bold text-[15.5px] shadow-[0_8px_30px_color-mix(in_sRGB,var(--color-accent)_44%,transparent)] transition-[transform,box-shadow] duration-[.25s]"
              >
                Soy estudiante
              </Link>
              <Link
                href="/login?role=company"
                className="practix-cta-final-glass inline-flex items-center gap-2 bg-white/10 backdrop-blur-[12px] border border-white/20 text-white px-8 py-4 rounded-[14px] font-semibold text-[15.5px] transition-[background] duration-200"
              >
                Soy empresa
              </Link>
            </div>
            <p className="text-xs text-white/30">
              12.300+ estudiantes · 240+ prácticas activas · 4.9★
            </p>
          </div>
        </div>
      </div>
      <style>{`
        .practix-cta-final-warm:hover { transform: translateY(-3px); box-shadow: 0 16px 40px color-mix(in sRGB, var(--color-accent) 50%, transparent); }
        .practix-cta-final-glass:hover { background: rgba(255,255,255,.17) !important; }
      `}</style>
    </section>
  );
}
