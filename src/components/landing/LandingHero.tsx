import type { CSSProperties } from "react";
import Link from "next/link";

export function LandingHero() {
  const dots: Array<{
    top?: string;
    left?: string;
    right?: string;
    s: number;
    d: string;
  }> = [
    { top: "20%", left: "10%", s: 5, d: "0s" },
    { top: "65%", left: "7%", s: 4, d: "1.2s" },
    { top: "30%", right: "8%", s: 6, d: "0.7s" },
    { top: "72%", right: "12%", s: 4, d: "2s" },
  ];

  return (
    <section className="relative min-h-svh flex items-center justify-center overflow-hidden pt-16">
      {/* ── background layers ── */}
      <div className="absolute inset-0 z-0">
        {/* dark base gradient */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#1A0E08,#2D1A0E_50%,#3D2010)]" />
        {/* video overlay */}
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-[.72]"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        {/* vignette */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,8,6,.52)_0%,rgba(10,8,6,.36)_40%,rgba(10,8,6,.72)_78%,var(--color-bg)_100%)]" />
        {/* accent radial */}
        <div className="absolute inset-0 bg-[radial-gradient(58%_52%_at_50%_36%,color-mix(in_sRGB,var(--color-accent)_13%,transparent)_0%,transparent_70%)]" />

        {/* floating orbs */}
        <div
          aria-hidden
          className="absolute inset-0 overflow-hidden pointer-events-none"
        >
          <div className="absolute w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,color-mix(in_sRGB,var(--color-accent)_9%,transparent)_0%,transparent_70%)] top-[-5%] left-[-10%] [animation:orbFloat1_14s_ease-in-out_infinite]" />
          <div className="absolute w-[460px] h-[460px] rounded-full bg-[radial-gradient(circle,color-mix(in_sRGB,var(--color-accent-hi)_8%,transparent)_0%,transparent_70%)] top-[15%] right-[-8%] [animation:orbFloat2_18s_ease-in-out_infinite]" />
          <div className="absolute w-[320px] h-[320px] rounded-full bg-[radial-gradient(circle,rgba(255,200,150,.1)_0%,transparent_70%)] bottom-[22%] left-[38%] [animation:orbFloat3_22s_ease-in-out_infinite]" />
          {/* small floating dots — position/size are truly dynamic */}
          {dots.map((dot, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-[.32]"
              style={
                {
                  width: dot.s,
                  height: dot.s,
                  background: "var(--color-accent-hi)",
                  top: dot.top,
                  left: dot.left,
                  right: dot.right,
                  animation: `float ${6 + i * 1.5}s ${dot.d} ease-in-out infinite`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>

      {/* ── content ── */}
      <div className="relative z-[1] max-w-[900px] mx-auto px-4 sm:px-6 md:px-8 py-[80px] pb-[120px] text-center">
        {/* badge */}
        <div className="inline-flex items-center gap-[9px] bg-white/[.10] backdrop-blur-[18px] border border-white/[.17] rounded-[40px] px-4 py-[6px] mb-7 [animation:fadeUp_.6s_ease_both]">
          <span className="text-[12.5px] font-medium text-white/[.88]">
            Matching semántico con IA · 12.300 estudiantes en Chile
          </span>
          <span className="bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-hi))] text-white text-[10px] font-bold px-3 py-1 rounded-[20px] tracking-[0.6px] shadow-[0_3px_10px_color-mix(in_sRGB,var(--color-accent)_33%,transparent)]">
            NUEVO ATS
          </span>
        </div>

        {/* h1 */}
        <h1 className="text-[clamp(2.6rem,7.5vw,5.8rem)] font-extrabold tracking-[-3px] leading-[1.0] text-white [text-shadow:0_4px_40px_rgba(0,0,0,.4)] mb-[22px] [animation:fadeUp_.7s_.1s_ease_both] text-balance">
          Encuentra la práctica
          <br />
          que te{" "}
          <span className="bg-[linear-gradient(100deg,#FFD4A8,#FF9B6A,#FF6A3D)] bg-clip-text text-transparent bg-[length:200%_auto] [animation:shimmer_4s_linear_infinite]">
            reconoce de verdad
          </span>
          .
        </h1>

        {/* subtitle */}
        <p className="text-[clamp(1rem,2vw,1.18rem)] text-white/[.72] leading-[1.65] max-w-[560px] mx-auto mb-10 [animation:fadeUp_.7s_.18s_ease_both] text-pretty">
          Sube tu CV una sola vez. La IA lee tus habilidades reales, no solo
          palabras clave, y te muestra las prácticas donde ya eres{" "}
          <strong className="text-white font-semibold">candidato top</strong>.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-3 justify-center mb-[52px] [animation:fadeUp_.7s_.26s_ease_both]">
          <Link
            href="/login?role=student"
            className="practix-cta-primary inline-flex items-center gap-[9px] bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-hi))] text-white px-7 py-[15px] rounded-[14px] font-bold text-[15px] shadow-[0_8px_30px_color-mix(in_sRGB,var(--color-accent)_38%,transparent)] transition-[transform,box-shadow] duration-[.25s]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.139 2 12.545 2 7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748L12.545 10.239z" />
            </svg>
            Empezar con Google, gratis
          </Link>
          <Link
            href="/practicas"
            className="practix-cta-glass inline-flex items-center gap-2 bg-white/10 backdrop-blur-[16px] border border-white/20 text-white px-[26px] py-[15px] rounded-[14px] font-semibold text-[15px] transition-[background,border-color] duration-200"
          >
            Ver prácticas disponibles
          </Link>
        </div>

        {/* social proof */}
        <div className="flex flex-wrap justify-center items-center gap-6 [animation:fadeUp_.7s_.34s_ease_both]">
          {/* avatars + rating */}
          <div className="flex items-center gap-[10px]">
            <div className="flex">
              {["#FFC5A3", "#BFD7FF", "#C5E8C7", "#E0C5FF", "#FFD6B8"].map(
                (c, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-[2.5px] border-[rgba(20,10,5,.75)] shadow-[0_2px_8px_rgba(0,0,0,.3)]"
                    style={
                      {
                        background: c,
                        marginLeft: i ? -8 : 0,
                      } as CSSProperties
                    }
                  />
                ),
              )}
            </div>
            <div>
              <div className="flex items-center gap-[2px]">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    width="12"
                    height="12"
                    viewBox="0 0 20 20"
                    fill="#FFB17A"
                  >
                    <path d="M10 1l2.5 6.5H19l-5 4 2 6.5L10 14l-6 4 2-6.5-5-4h6.5z" />
                  </svg>
                ))}
                <span className="text-xs font-bold text-white ml-1">4.9</span>
              </div>
              <p className="text-[11.5px] text-white/[.55]">
                12.300+ estudiantes activos
              </p>
            </div>
          </div>
          {/* divider — hidden on mobile */}
          <div className="hidden md:block w-px h-[30px] bg-white/[.14]" />
          {/* university list — hidden on mobile */}
          <div className="hidden md:flex gap-4 flex-wrap justify-center">
            {["PUC", "U. de Chile", "USACH", "UAI", "UDP", "UDD"].map((u) => (
              <span
                key={u}
                className="text-[11px] font-extrabold tracking-[0.8px] text-white/[.42]"
              >
                {u}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* scroll indicator */}
      <div className="absolute bottom-[26px] left-1/2 -translate-x-1/2 z-[1] [animation:float_2.4s_ease-in-out_infinite] opacity-40">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
        >
          <path d="M7 10l5 5 5-5" />
        </svg>
      </div>

      <style>{`
        .practix-cta-primary:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 16px 40px color-mix(in sRGB, var(--color-accent) 47%, transparent); }
        .practix-cta-glass:hover { background: rgba(255,255,255,.17); border-color: rgba(255,255,255,.3); }
      `}</style>
    </section>
  );
}
