import Link from "next/link";
import { getAuthSession, ADMIN_EMAIL } from "@/lib/auth";
import { PublicNav } from "@/components/layout/PublicNav";

export default async function Home() {
  const session = await getAuthSession();

  return (
    <div
      className="relative min-h-screen bg-[#FAFAF8] text-[#0A0909] antialiased overflow-x-hidden"
      style={{ fontFamily: "var(--font-onest), ui-sans-serif, system-ui" }}
    >
      {/* ========== AMBIENT GRADIENT MESH ========== */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,166,122,0.5), rgba(255,166,122,0) 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute top-[-10%] right-[-15%] w-[65%] h-[65%] rounded-full opacity-55"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,210,180,0.55), rgba(255,210,180,0) 70%)",
            filter: "blur(50px)",
          }}
        />
        <div
          className="absolute top-[35%] left-[30%] w-[50%] h-[50%] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,230,210,0.5), rgba(255,230,210,0) 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      <PublicNav
        isLoggedIn={!!session}
        isAdmin={session?.user.email === ADMIN_EMAIL}
      />

      <main className="relative z-10 pt-[88px]">
        {/* ========== HERO ========== */}
        <section className="relative pt-10 sm:pt-16 md:pt-24 pb-10 sm:pb-12 overflow-hidden">
          {/* ----- VIDEO BACKGROUND ----- */}
          <div aria-hidden className="absolute inset-0 -z-10">
            {/* Fallback gradient (se ve si el video no carga) */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, #1A120C 0%, #2D1D12 40%, #3D2418 100%)",
              }}
            />
            {/* Video */}
            <video
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            >
              <source src="/hero-video.mp4" type="video/mp4" />
            </video>
            {/* Vignette + gradient overlay para legibilidad */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(10,9,9,0.55) 0%, rgba(10,9,9,0.45) 40%, rgba(10,9,9,0.65) 80%, #FAFAF8 100%)",
              }}
            />
            {/* Warm accent glow */}
            <div
              className="absolute inset-0 mix-blend-overlay"
              style={{
                background:
                  "radial-gradient(60% 60% at 50% 40%, rgba(255,106,61,0.18) 0%, rgba(255,106,61,0) 70%)",
              }}
            />
            {/* Subtle grain */}
            <div
              className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='180' height='180' filter='url(%23n)'/></svg>\")",
              }}
            />
          </div>

          <div className="relative max-w-[1240px] mx-auto px-4 sm:px-6">
            {/* Announcement badge */}
            <div className="flex justify-center mb-8 sm:mb-10 animate-[fadeUp_0.6s_ease-out_both]">
              <Link
                href="#producto"
                className="group inline-flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-xl border border-white/15 rounded-full pl-1.5 pr-3 sm:pr-4 py-1.5 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)] hover:bg-white/15 hover:border-white/25 transition-all max-w-[92vw]"
              >
                <span className="flex items-center gap-1.5 bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white text-[10.5px] sm:text-[11px] font-semibold tracking-wide px-2 sm:px-2.5 py-0.5 rounded-full shadow-[0_2px_8px_-2px_rgba(255,106,61,0.5)] flex-shrink-0">
                  NUEVO
                </span>
                <span className="text-[12px] sm:text-[13px] text-white/95 font-medium truncate">
                  ATS con scoring automático y chat en vivo
                </span>
                <span className="text-white/60 text-[11px] transition-transform group-hover:translate-x-0.5 flex-shrink-0">
                  →
                </span>
              </Link>
            </div>

            {/* Headline */}
            <h1
              className="text-center mx-auto max-w-[960px] text-[clamp(2.75rem,7vw,5.75rem)] leading-[1.02] tracking-[-0.03em] font-semibold text-white animate-[fadeUp_0.7s_ease-out_0.08s_both]"
              style={{
                textShadow:
                  "0 2px 20px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
              }}
            >
              Encontrá prácticas
              <br />
              que{" "}
              <span className="relative inline-block">
                <span
                  className="relative z-10 bg-gradient-to-br from-[#FFB17A] via-[#FF8A52] to-[#FF5A28] bg-clip-text text-transparent"
                  style={{
                    filter: "drop-shadow(0 2px 20px rgba(255,106,61,0.35))",
                  }}
                >
                  te reconocen
                </span>
                <svg
                  aria-hidden
                  className="absolute -bottom-1 left-0 w-full"
                  height="12"
                  viewBox="0 0 300 12"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 2 7 Q 80 2, 150 6 T 298 7"
                    stroke="url(#g1)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="g1" x1="0" x2="1">
                      <stop offset="0" stopColor="#FF5A28" />
                      <stop offset="1" stopColor="#FFB17A" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              .
            </h1>

            {/* Subheadline */}
            <p
              className="mt-6 sm:mt-8 text-center mx-auto max-w-[580px] text-[15px] sm:text-[17px] leading-[1.55] text-white/80 animate-[fadeUp_0.7s_ease-out_0.15s_both] px-2 sm:px-0"
              style={{ textShadow: "0 1px 12px rgba(0,0,0,0.35)" }}
            >
              Subí tu CV una sola vez. Nuestra IA lo lee como un reclutador
              experto y te muestra las prácticas donde tu perfil{" "}
              <span className="text-white font-medium">
                ya está entre los mejores
              </span>
              .
            </p>

            {/* CTAs */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 max-w-[320px] sm:max-w-none mx-auto animate-[fadeUp_0.7s_ease-out_0.22s_both]">
              <Link
                href="/login?role=student"
                className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-br from-[#FF6A3D] to-[#FF8A52] text-white px-6 py-3.5 rounded-xl font-semibold text-[14.5px] shadow-[0_4px_20px_-4px_rgba(255,106,61,0.65),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_8px_28px_-6px_rgba(255,106,61,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all overflow-hidden"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <svg
                  className="w-4 h-4 relative"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                </svg>
                <span className="relative">Entrar con Google</span>
                <span className="relative text-[12px] transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
              <Link
                href="/practicas"
                className="group inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 text-white px-6 py-3.5 rounded-xl font-semibold text-[14.5px] hover:bg-white/15 hover:border-white/30 transition-all"
              >
                Ver prácticas
                <span className="text-[12px] text-white/60 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </div>

            {/* Trust row */}
            <div className="mt-10 sm:mt-14 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 animate-[fadeUp_0.7s_ease-out_0.3s_both]">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[
                    "from-[#FFC5A3] to-[#FF9B6A]",
                    "from-[#BFD7FF] to-[#8AB8FF]",
                    "from-[#C5E8C7] to-[#8BC68E]",
                    "from-[#FFD6B8] to-[#FFAA7F]",
                    "from-[#E0C5FF] to-[#B890FF]",
                  ].map((g, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full bg-gradient-to-br ${g} border-2 border-[#1A120C] shadow-[0_2px_8px_rgba(0,0,0,0.3)]`}
                    />
                  ))}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="w-3 h-3 text-[#FFB17A] fill-current"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 1l2.5 6.5H19l-5 4 2 6.5L10 14l-6 4 2-6.5-5-4h6.5z" />
                      </svg>
                    ))}
                    <span className="text-[12px] font-medium text-white ml-1">
                      4.9
                    </span>
                  </div>
                  <p className="text-[11.5px] text-white/65">
                    12.3k+ estudiantes activos
                  </p>
                </div>
              </div>

              <div className="hidden sm:block h-8 w-px bg-white/15" />

              <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
                {["UBA", "UTN", "ITBA", "UCA", "UADE"].map((u) => (
                  <span
                    key={u}
                    className="text-[11.5px] font-semibold tracking-wide text-white/60"
                  >
                    {u}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========== PRODUCT MOCKUP ========== */}
        <section className="relative pb-12 sm:pb-16">
          <div className="relative -mt-10 sm:-mt-20 md:-mt-24 max-w-[1140px] mx-auto px-4 sm:px-6 animate-[fadeUp_1s_ease-out_0.45s_both]">
            <div className="relative">
              {/* Glow behind */}
              <div
                aria-hidden
                className="absolute -inset-4 bg-gradient-to-br from-[#FF6A3D]/20 via-[#FFB88C]/10 to-transparent rounded-[32px] blur-2xl"
              />

              {/* Browser chrome */}
              <div className="relative bg-white rounded-[20px] overflow-hidden border border-black/[0.08] shadow-[0_40px_80px_-20px_rgba(20,15,10,0.2),0_10px_30px_-10px_rgba(20,15,10,0.1)]">
                {/* Top bar */}
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-3.5 bg-[#FAFAF8] border-b border-black/[0.05]">
                  <div className="flex gap-1.5 flex-shrink-0">
                    <span className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-[#FF6565]" />
                    <span className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-[#FFBD2E]" />
                    <span className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-[#28C840]" />
                  </div>
                  <div className="flex-1 min-w-0 flex justify-center">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-white border border-black/[0.06] rounded-lg px-2.5 sm:px-3 py-1 text-[10.5px] sm:text-[11px] text-[#6D6A63] font-medium w-full sm:min-w-[280px] max-w-[380px] justify-center truncate">
                      <svg
                        className="w-3 h-3 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span className="truncate">practix.app/dashboard</span>
                    </div>
                  </div>
                  <div className="hidden sm:block w-12 flex-shrink-0" />
                </div>

                {/* App content */}
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[360px] md:min-h-[420px]">
                  {/* Sidebar */}
                  <aside className="bg-[#FDFCFA] border-b md:border-b-0 md:border-r border-black/[0.05] p-4">
                    <div className="flex items-center gap-2 mb-4 md:mb-6">
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] flex items-center justify-center text-white text-[12px] font-bold">
                        P
                      </span>
                      <span className="text-[13px] font-semibold">PractiX</span>
                    </div>
                    <nav className="space-y-0.5 text-[12px]">
                      {[
                        { label: "Inicio", active: false },
                        { label: "Recomendadas", active: true },
                        { label: "Postulaciones", active: false },
                        { label: "Entrevistas", active: false },
                        { label: "Mensajes", active: false },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                            item.active
                              ? "bg-[#0A0909] text-white"
                              : "text-[#6D6A63]"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                          {item.label}
                        </div>
                      ))}
                    </nav>
                    <div className="mt-5 md:mt-8 p-3 bg-gradient-to-br from-[#FFF3EC] to-[#FFE4D2] rounded-xl border border-[#FF6A3D]/10">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A3D] animate-pulse" />
                        <span className="text-[10px] font-semibold text-[#0A0909]">
                          CV analizado
                        </span>
                      </div>
                      <p className="text-[10.5px] text-[#6D6A63] leading-[1.4]">
                        Embedding listo · 384 dims
                      </p>
                    </div>
                  </aside>

                  {/* Main content */}
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4 sm:mb-5 gap-2">
                      <div>
                        <h3 className="text-[15px] font-semibold tracking-tight">
                          Prácticas para vos
                        </h3>
                        <p className="text-[11.5px] text-[#6D6A63] mt-0.5">
                          Ordenadas por afinidad semántica
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#F4F3EF] rounded-lg px-2 py-1 text-[10.5px] text-[#6D6A63] flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#28C840]" />
                        <span className="hidden sm:inline">Tiempo real</span>
                        <span className="sm:hidden">Live</span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        {
                          role: "Frontend Developer Jr.",
                          company: "Mercado Libre",
                          tag: "React · TypeScript · GraphQL",
                          match: 96,
                          logo: "M",
                          color: "from-[#FFE9B3] to-[#FFC84A]",
                        },
                        {
                          role: "Full Stack Intern",
                          company: "Globant",
                          tag: "Node · Next.js · PostgreSQL",
                          match: 92,
                          logo: "G",
                          color: "from-[#C5E8F5] to-[#4DB8E0]",
                        },
                        {
                          role: "Backend Engineer Intern",
                          company: "Rappi",
                          tag: "Python · FastAPI · AWS",
                          match: 87,
                          logo: "R",
                          color: "from-[#FFCDCD] to-[#FF6B6B]",
                        },
                        {
                          role: "Data Analyst Trainee",
                          company: "OLX",
                          tag: "SQL · Python · Tableau",
                          match: 81,
                          logo: "O",
                          color: "from-[#D3E9C7] to-[#6BB85A]",
                        },
                      ].map((m, i) => (
                        <div
                          key={i}
                          className="group flex items-center gap-4 p-3.5 bg-white rounded-xl border border-black/[0.05] hover:border-[#FF6A3D]/30 hover:shadow-[0_2px_8px_-2px_rgba(255,106,61,0.15)] transition-all"
                        >
                          <div
                            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold text-[14px] shadow-sm`}
                          >
                            {m.logo}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-semibold truncate">
                                {m.role}
                              </p>
                              <span className="text-[10px] text-[#9B9891]">
                                · {m.company}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#6D6A63] mt-0.5 truncate">
                              {m.tag}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-baseline gap-0.5">
                              <span
                                className={`text-[15px] font-bold tracking-tight ${
                                  m.match >= 90
                                    ? "text-[#1A8F3C]"
                                    : m.match >= 80
                                      ? "text-[#FF6A3D]"
                                      : "text-[#6D6A63]"
                                }`}
                              >
                                {m.match}
                              </span>
                              <span className="text-[10px] text-[#9B9891] font-medium">
                                %
                              </span>
                            </div>
                            <div className="w-16 h-1 bg-[#F4F3EF] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  m.match >= 90
                                    ? "bg-gradient-to-r from-[#28C840] to-[#1A8F3C]"
                                    : m.match >= 80
                                      ? "bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A]"
                                      : "bg-[#C9C6BF]"
                                }`}
                                style={{ width: `${m.match}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating decoration card */}
              <div className="hidden md:flex absolute -right-4 top-20 bg-white rounded-2xl p-4 border border-black/[0.08] shadow-[0_12px_32px_-8px_rgba(20,15,10,0.15)] items-center gap-3 animate-[float_4s_ease-in-out_infinite]">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E7F8EA] to-[#C5E8C7] flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#1A8F3C]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <div>
                  <p className="text-[11.5px] font-semibold">
                    Match 96% encontrado
                  </p>
                  <p className="text-[10px] text-[#6D6A63]">hace 2 segundos</p>
                </div>
              </div>

              <div className="hidden md:flex absolute -left-6 bottom-16 bg-white rounded-2xl p-4 border border-black/[0.08] shadow-[0_12px_32px_-8px_rgba(20,15,10,0.15)] items-center gap-3 animate-[float_4s_ease-in-out_infinite_0.8s]">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFF3EC] to-[#FFCFB3] flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#FF6A3D]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                  </svg>
                </span>
                <div>
                  <p className="text-[11.5px] font-semibold">CV procesado</p>
                  <p className="text-[10px] text-[#6D6A63]">en 2.8 segundos</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== FEATURES BENTO ========== */}
        <section id="producto" className="relative py-16 sm:py-24 md:py-32">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-16 max-w-[720px] mx-auto">
              <span className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-md border border-black/[0.06] rounded-full px-3 py-1 mb-4 sm:mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A3D]" />
                <span className="text-[11.5px] font-semibold tracking-wide text-[#4A4843]">
                  EL PRODUCTO
                </span>
              </span>
              <h2 className="text-[clamp(1.6rem,4.5vw,3.5rem)] leading-[1.1] sm:leading-[1.05] tracking-[-0.025em] font-semibold text-[#0A0909]">
                Todo lo que necesitás.{" "}
                <span className="text-[#9B9891]">Nada de lo que no.</span>
              </h2>
              <p className="mt-4 sm:mt-5 text-[14px] sm:text-[16px] text-[#4A4843] leading-[1.55] px-2 sm:px-0">
                Una plataforma para estudiantes que buscan su primera
                oportunidad y empresas que buscan talento real.
              </p>
            </div>

            <div className="grid grid-cols-6 gap-3 sm:gap-4 auto-rows-[minmax(200px,auto)] sm:auto-rows-[minmax(220px,auto)]">
              {/* Large — AI Matching */}
              <div className="col-span-6 md:col-span-4 row-span-2 relative bg-white rounded-[20px] border border-black/[0.06] p-5 sm:p-8 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_-8px_rgba(20,15,10,0.1)] transition-shadow">
                <div
                  aria-hidden
                  className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-bl from-[#FFF3EC]/80 via-[#FFE4D2]/40 to-transparent pointer-events-none"
                />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white rounded-lg px-2.5 py-1 text-[10.5px] font-semibold mb-4 sm:mb-5 shadow-[0_2px_8px_-2px_rgba(255,106,61,0.4)]">
                    IA SEMÁNTICA
                  </div>
                  <h3 className="text-[22px] sm:text-[28px] leading-[1.15] sm:leading-[1.1] tracking-[-0.02em] font-semibold mb-3">
                    Matching que no busca
                    <br className="hidden sm:block" />
                    <span className="sm:hidden"> </span>
                    palabras. Busca{" "}
                    <span className="bg-gradient-to-br from-[#FF5A28] to-[#FF8A52] bg-clip-text text-transparent">
                      sentido
                    </span>
                    .
                  </h3>
                  <p className="text-[13.5px] sm:text-[14.5px] text-[#4A4843] leading-[1.6] max-w-[440px] mb-6 sm:mb-8">
                    Modelo multilingüe de 384 dimensiones. Entiende que
                    &ldquo;React&rdquo; y &ldquo;JSX&rdquo; son lo mismo, y que
                    &ldquo;trabajo en equipo&rdquo; no aparece literalmente en
                    tu CV pero está ahí.
                  </p>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-[520px]">
                    {[
                      {
                        title: "Tu CV",
                        val: "48 skills",
                        hue: "from-[#FFE4D2] to-[#FFCFB3]",
                      },
                      {
                        title: "Embedding",
                        val: "384-dim",
                        hue: "from-[#E4ECFF] to-[#C5D4FF]",
                      },
                      {
                        title: "Matches",
                        val: "Top 10",
                        hue: "from-[#E7F8EA] to-[#C5E8C7]",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className={`relative bg-gradient-to-br ${item.hue} rounded-xl p-2.5 sm:p-3 border border-white/60`}
                      >
                        <p className="text-[9.5px] sm:text-[10px] font-semibold tracking-wide text-[#4A4843] mb-1 truncate">
                          {item.title.toUpperCase()}
                        </p>
                        <p className="text-[14px] sm:text-[17px] font-bold tracking-tight text-[#0A0909] truncate">
                          {item.val}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chat */}
              <div className="col-span-6 md:col-span-2 relative bg-[#0A0909] rounded-[20px] p-5 sm:p-7 overflow-hidden text-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div
                  aria-hidden
                  className="absolute -top-8 -right-8 w-32 h-32 bg-[#FF6A3D]/20 rounded-full blur-2xl"
                />
                <div className="relative">
                  <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur rounded-md px-2 py-0.5 text-[10px] font-medium text-white/70 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#28C840] animate-pulse" />
                    EN VIVO
                  </div>
                  <h3 className="text-[18px] sm:text-[20px] font-semibold tracking-tight mb-2">
                    Chat con la empresa, sin intermediarios.
                  </h3>
                  <p className="text-[13px] text-white/60 leading-[1.55] mb-4">
                    Preguntá. Respondé. Coordiná una entrevista. Todo dentro.
                  </p>
                  <div className="space-y-2 mt-6">
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FFC5A3] to-[#FF9B6A] flex-shrink-0" />
                      <div className="bg-white/5 rounded-lg rounded-tl-sm px-3 py-2 text-[11.5px] max-w-[200px]">
                        ¿Tenés experiencia con Next.js?
                      </div>
                    </div>
                    <div className="flex items-start gap-2 flex-row-reverse">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#C5E8C7] to-[#8BC68E] flex-shrink-0" />
                      <div className="bg-gradient-to-br from-[#FF6A3D] to-[#FF8A52] rounded-lg rounded-tr-sm px-3 py-2 text-[11.5px] max-w-[200px]">
                        Sí, hice 3 proyectos ✨
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ATS */}
              <div className="col-span-6 md:col-span-2 relative bg-white rounded-[20px] border border-black/[0.06] p-5 sm:p-7 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_-8px_rgba(20,15,10,0.1)] transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#E4ECFF] to-[#C5D4FF]">
                    <svg
                      className="w-5 h-5 text-[#3D5AFF]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 21V9" />
                    </svg>
                  </span>
                </div>
                <h3 className="text-[18px] sm:text-[20px] font-semibold tracking-tight mb-2">
                  ATS con scoring automático
                </h3>
                <p className="text-[13px] text-[#4A4843] leading-[1.55] mb-4">
                  Para empresas. Pipeline visual, scoring configurable, filtros
                  por afinidad.
                </p>
                <div className="flex gap-1 mt-auto">
                  {[
                    { label: "Nuevos", count: 12, c: "bg-[#E4ECFF]" },
                    { label: "Revisados", count: 5, c: "bg-[#FFF3EC]" },
                    { label: "Aceptados", count: 3, c: "bg-[#E7F8EA]" },
                  ].map((p) => (
                    <div
                      key={p.label}
                      className={`flex-1 min-w-0 ${p.c} rounded-lg p-2`}
                    >
                      <p className="text-[9.5px] font-semibold text-[#4A4843] uppercase tracking-wide truncate">
                        {p.label}
                      </p>
                      <p className="text-[16px] sm:text-[17px] font-bold text-[#0A0909] mt-0.5">
                        {p.count}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar */}
              <div className="col-span-6 md:col-span-2 relative bg-gradient-to-br from-[#FFF8F2] to-[#FFECD9] rounded-[20px] border border-black/[0.04] p-5 sm:p-7 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_-8px_rgba(20,15,10,0.1)] transition-shadow">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-[0_2px_8px_-2px_rgba(255,106,61,0.3)] mb-4">
                  <svg
                    className="w-5 h-5 text-[#FF6A3D]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </span>
                <h3 className="text-[18px] sm:text-[20px] font-semibold tracking-tight mb-2">
                  Agenda interna
                </h3>
                <p className="text-[13px] text-[#4A4843] leading-[1.55] mb-4">
                  Coordiná entrevistas sin salir de la plataforma.
                </p>
                <div className="bg-white rounded-xl p-3 border border-white/80">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10.5px] font-semibold">Mar 18</p>
                    <span className="text-[9px] text-[#FF6A3D] bg-[#FFF3EC] px-1.5 py-0.5 rounded-full font-medium">
                      HOY
                    </span>
                  </div>
                  <p className="text-[11.5px] font-medium">
                    Entrevista · Mercado Libre
                  </p>
                  <p className="text-[10px] text-[#6D6A63]">14:30 · 30 min</p>
                </div>
              </div>

              {/* Speed */}
              <div className="col-span-6 md:col-span-2 relative bg-white rounded-[20px] border border-black/[0.06] p-5 sm:p-7 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_-8px_rgba(20,15,10,0.1)] transition-shadow">
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-[48px] sm:text-[56px] font-bold tracking-[-0.04em] leading-none bg-gradient-to-br from-[#0A0909] to-[#6D6A63] bg-clip-text text-transparent">
                    2.8
                  </span>
                  <span className="text-[18px] sm:text-[20px] font-semibold text-[#6D6A63]">
                    s
                  </span>
                </div>
                <h3 className="text-[16px] sm:text-[17px] font-semibold tracking-tight mb-2">
                  En leer tu CV completo
                </h3>
                <p className="text-[13px] text-[#4A4843] leading-[1.55]">
                  Parsing + embedding + scoring contra toda la base. Antes de
                  que termine tu café.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== TESTIMONIAL ========== */}
        <section className="relative py-16 sm:py-24">
          <div className="max-w-[900px] mx-auto px-4 sm:px-6">
            <div className="relative bg-white rounded-[20px] sm:rounded-[28px] border border-black/[0.06] p-6 sm:p-10 md:p-14 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              <div
                aria-hidden
                className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#FFE4D2]/60 to-transparent rounded-full blur-3xl"
              />
              <div className="relative">
                <div className="flex items-center gap-1 mb-6 sm:mb-8">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-4 h-4 text-[#FF9B3D] fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 1l2.5 6.5H19l-5 4 2 6.5L10 14l-6 4 2-6.5-5-4h6.5z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[clamp(1.125rem,2.8vw,2.15rem)] leading-[1.4] sm:leading-[1.35] tracking-[-0.015em] font-semibold text-[#0A0909] mb-8 sm:mb-10">
                  &ldquo;Me postulé en 4 prácticas en toda mi carrera. En
                  PractiX me postulé en 3 y me llamaron de las 3. El scoring no
                  miente: si dice 96%,{" "}
                  <span className="bg-gradient-to-br from-[#FF5A28] to-[#FF8A52] bg-clip-text text-transparent">
                    es 96%
                  </span>
                  .&rdquo;
                </p>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-[#FFC5A3] to-[#FF6A3D] flex items-center justify-center text-white font-bold text-[14px] sm:text-[15px] shadow-[0_4px_12px_-2px_rgba(255,106,61,0.4)]">
                    MG
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13.5px] sm:text-[14px] font-semibold truncate">
                      Mariana Giménez
                    </p>
                    <p className="text-[11.5px] sm:text-[12px] text-[#6D6A63] leading-[1.4]">
                      Ing. en Sistemas · UTN · Hoy en Mercado Libre
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== CTA FINAL ========== */}
        <section id="empresas" className="relative py-16 sm:py-24 md:py-32">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
            <div className="relative rounded-[20px] sm:rounded-[28px] overflow-hidden bg-[#0A0909] p-6 sm:p-10 md:p-16 text-center shadow-[0_40px_80px_-20px_rgba(20,15,10,0.3)]">
              {/* Decorative gradient */}
              <div
                aria-hidden
                className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(255,106,61,0.35), rgba(255,106,61,0) 60%)",
                }}
              />
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.4]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }}
              />

              <div className="relative">
                <span className="inline-flex items-center gap-2 bg-white/5 backdrop-blur border border-white/10 rounded-full px-3 py-1 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A3D] animate-pulse" />
                  <span className="text-[11.5px] font-medium tracking-wide text-white/80">
                    100% GRATUITO PARA ESTUDIANTES
                  </span>
                </span>

                <h2 className="text-[clamp(1.75rem,5vw,4rem)] leading-[1.1] sm:leading-[1.05] tracking-[-0.03em] font-semibold text-white max-w-[720px] mx-auto">
                  La próxima práctica que
                  <br className="hidden sm:block" />
                  <span className="sm:hidden"> </span>
                  cambia tu CV{" "}
                  <span className="bg-gradient-to-br from-[#FFB88C] to-[#FF6A3D] bg-clip-text text-transparent">
                    está a un click
                  </span>
                  .
                </h2>
                <p className="mt-5 sm:mt-6 text-[14px] sm:text-[16px] text-white/60 max-w-[480px] mx-auto leading-[1.55]">
                  Sin formularios largos. Sin sellos burocráticos. Entrás con
                  Google, subís tu CV, ves las prácticas que te corresponden.
                </p>

                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-[320px] sm:max-w-none mx-auto">
                  <Link
                    href="/login?role=student"
                    className="group inline-flex items-center justify-center gap-2 bg-gradient-to-br from-[#FF6A3D] to-[#FF8A52] text-white px-5 sm:px-7 py-3.5 sm:py-4 rounded-xl font-semibold text-[14px] sm:text-[14.5px] shadow-[0_4px_16px_-4px_rgba(255,106,61,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_8px_24px_-6px_rgba(255,106,61,0.75),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all"
                  >
                    Soy estudiante
                    <span className="text-[12px] transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>
                  <Link
                    href="/login?role=company"
                    className="group inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white px-5 sm:px-7 py-3.5 sm:py-4 rounded-xl font-semibold text-[14px] sm:text-[14.5px] hover:bg-white/15 transition-all"
                  >
                    Soy empresa
                    <span className="text-[12px] transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>
                </div>

                <p className="mt-6 sm:mt-8 text-[11.5px] sm:text-[12px] text-white/40 leading-[1.5]">
                  12.3k+ estudiantes · 240+ prácticas activas · 4.9 ★ en reviews
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== MARQUEE EMPRESAS ========== */}
        <section className="relative pt-6 pb-6">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 mb-6">
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-6 sm:w-10 bg-black/[0.1]" />
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] sm:tracking-[0.22em] uppercase text-[#6D6A63] text-center">
                Empresas con prácticas activas
              </span>
              <span className="h-px w-6 sm:w-10 bg-black/[0.1]" />
            </div>
          </div>

          <div className="relative overflow-hidden group">
            {/* Fade gradients laterales */}
            <div
              aria-hidden
              className="absolute left-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to right, #FAFAF8 0%, rgba(250,250,248,0.8) 40%, transparent 100%)",
              }}
            />
            <div
              aria-hidden
              className="absolute right-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to left, #FAFAF8 0%, rgba(250,250,248,0.8) 40%, transparent 100%)",
              }}
            />

            {/* Track — duplicamos la lista para que el loop sea seamless */}
            <div className="flex gap-3 sm:gap-4 w-max animate-[marquee_50s_linear_infinite] group-hover:[animation-play-state:paused]">
              {[
                ...[
                  {
                    name: "Mercado Libre",
                    ini: "ML",
                    c: "#FFE600",
                    text: "#1A1A1A",
                  },
                  { name: "Globant", ini: "G", c: "#6EC42B", text: "#FFFFFF" },
                  { name: "Rappi", ini: "R", c: "#FF441F", text: "#FFFFFF" },
                  { name: "Despegar", ini: "D", c: "#1976D2", text: "#FFFFFF" },
                  { name: "Ualá", ini: "U", c: "#8247E5", text: "#FFFFFF" },
                  { name: "OLX", ini: "OX", c: "#5FA624", text: "#FFFFFF" },
                  {
                    name: "Tiendanube",
                    ini: "TN",
                    c: "#2BC5DF",
                    text: "#FFFFFF",
                  },
                  {
                    name: "MercadoPago",
                    ini: "MP",
                    c: "#00B1EA",
                    text: "#FFFFFF",
                  },
                  {
                    name: "Naranja X",
                    ini: "NX",
                    c: "#FF6E00",
                    text: "#FFFFFF",
                  },
                  { name: "Modo", ini: "M", c: "#0A5DE3", text: "#FFFFFF" },
                  { name: "Auth0", ini: "A0", c: "#EB5424", text: "#FFFFFF" },
                  { name: "Frávega", ini: "F", c: "#E30613", text: "#FFFFFF" },
                ],
                ...[
                  {
                    name: "Mercado Libre",
                    ini: "ML",
                    c: "#FFE600",
                    text: "#1A1A1A",
                  },
                  { name: "Globant", ini: "G", c: "#6EC42B", text: "#FFFFFF" },
                  { name: "Rappi", ini: "R", c: "#FF441F", text: "#FFFFFF" },
                  { name: "Despegar", ini: "D", c: "#1976D2", text: "#FFFFFF" },
                  { name: "Ualá", ini: "U", c: "#8247E5", text: "#FFFFFF" },
                  { name: "OLX", ini: "OX", c: "#5FA624", text: "#FFFFFF" },
                  {
                    name: "Tiendanube",
                    ini: "TN",
                    c: "#2BC5DF",
                    text: "#FFFFFF",
                  },
                  {
                    name: "MercadoPago",
                    ini: "MP",
                    c: "#00B1EA",
                    text: "#FFFFFF",
                  },
                  {
                    name: "Naranja X",
                    ini: "NX",
                    c: "#FF6E00",
                    text: "#FFFFFF",
                  },
                  { name: "Modo", ini: "M", c: "#0A5DE3", text: "#FFFFFF" },
                  { name: "Auth0", ini: "A0", c: "#EB5424", text: "#FFFFFF" },
                  { name: "Frávega", ini: "F", c: "#E30613", text: "#FFFFFF" },
                ],
              ].map((company, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 sm:gap-2.5 bg-white/80 backdrop-blur-sm border border-black/[0.06] rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] hover:border-black/[0.12] transition-all flex-shrink-0"
                >
                  <span
                    className="relative flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-md font-bold text-[10px] sm:text-[10.5px] tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                    style={{
                      background: company.c,
                      color: company.text,
                    }}
                  >
                    {company.ini}
                  </span>
                  <span className="text-[13px] sm:text-[14px] font-semibold tracking-[-0.01em] text-[#0A0909] whitespace-nowrap">
                    {company.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 mt-6 text-center">
            <p className="text-[11.5px] sm:text-[12.5px] text-[#6D6A63] leading-[1.5]">
              <span className="font-semibold text-[#0A0909]">240+</span>{" "}
              empresas publicando prácticas · actualizado en tiempo real
            </p>
          </div>
        </section>
      </main>

      {/* ========== FOOTER ========== */}
      <footer className="relative z-10 border-t border-black/[0.06] bg-white/40 backdrop-blur-sm">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-8 sm:mb-10">
            <div className="col-span-2 md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <span className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] shadow-[0_4px_12px_-2px_rgba(255,106,61,0.5)]">
                  <span className="text-white font-bold text-[15px] leading-none tracking-tight">
                    P
                  </span>
                </span>
                <span className="text-[17px] font-semibold tracking-[-0.015em]">
                  PractiX
                </span>
              </Link>
              <p className="text-[13px] sm:text-[13.5px] text-[#4A4843] leading-[1.6] max-w-[340px]">
                Matching semántico para prácticas laborales. Sin filtros
                arbitrarios. Solo afinidad real entre vos y la práctica.
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold tracking-wider uppercase text-[#9B9891] mb-4">
                Plataforma
              </p>
              <ul className="space-y-2.5 text-[13.5px]">
                {[
                  { label: "Prácticas", href: "/practicas" },
                  { label: "Producto", href: "#producto" },
                  { label: "Empresas", href: "#empresas" },
                  { label: "Iniciar sesión", href: "/login" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[#4A4843] hover:text-[#0A0909] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold tracking-wider uppercase text-[#9B9891] mb-4">
                Legal
              </p>
              <ul className="space-y-2.5 text-[13.5px]">
                {["Privacidad", "Términos", "Contacto"].map((l) => (
                  <li key={l}>
                    <span className="text-[#4A4843]">{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-black/[0.05]">
            <p className="text-[11.5px] sm:text-[12px] text-[#6D6A63]">
              © {new Date().getFullYear()} PractiX · Hecho en Buenos Aires
            </p>
            <div className="flex items-center gap-2 text-[11.5px] sm:text-[12px] text-[#6D6A63]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#28C840] animate-pulse" />
              Todos los sistemas operativos
            </div>
          </div>
        </div>
      </footer>

      {/* ANIMATIONS */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
