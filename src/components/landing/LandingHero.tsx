import Link from "next/link";
import { C } from "./tokens";

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
    <section
      style={{
        position: "relative",
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        paddingTop: 64,
      }}
    >
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg,#1A0E08,#2D1A0E 50%,#3D2010)",
          }}
        />
        <video
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.72,
          }}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg,rgba(10,8,6,.52) 0%,rgba(10,8,6,.36) 40%,rgba(10,8,6,.72) 78%,#FAFAF8 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(58% 52% at 50% 36%,${C.accent}20 0%,transparent 70%)`,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 600,
              height: 600,
              borderRadius: "50%",
              background: `radial-gradient(circle,${C.accent}18 0%,transparent 70%)`,
              top: "-5%",
              left: "-10%",
              animation: "orbFloat1 14s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 460,
              height: 460,
              borderRadius: "50%",
              background: `radial-gradient(circle,${C.accentHi}14 0%,transparent 70%)`,
              top: "15%",
              right: "-8%",
              animation: "orbFloat2 18s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 320,
              height: 320,
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(255,200,150,.1) 0%,transparent 70%)",
              bottom: "22%",
              left: "38%",
              animation: "orbFloat3 22s ease-in-out infinite",
            }}
          />
          {dots.map((dot, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: dot.s,
                height: dot.s,
                borderRadius: "50%",
                background: C.accentHi,
                opacity: 0.32,
                top: dot.top,
                left: dot.left,
                right: dot.right,
                animation: `float ${6 + i * 1.5}s ${dot.d} ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 900,
          margin: "0 auto",
          padding: "80px 32px 120px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            background: "rgba(255,255,255,.1)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,.17)",
            borderRadius: 40,
            padding: "6px 8px 6px 16px",
            marginBottom: 28,
            animation: "fadeUp .6s ease both",
          }}
        >
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: "rgba(255,255,255,.88)",
            }}
          >
            Matching semántico con IA · 12.300 estudiantes en Chile
          </span>
          <span
            style={{
              background: `linear-gradient(135deg,${C.accent},${C.accentHi})`,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "4px 12px",
              borderRadius: 20,
              letterSpacing: 0.6,
              boxShadow: `0 3px 10px ${C.accent}55`,
            }}
          >
            NUEVO ATS
          </span>
        </div>

        <h1
          style={{
            fontSize: "clamp(2.6rem,7.5vw,5.8rem)",
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.0,
            color: "#fff",
            textShadow: "0 4px 40px rgba(0,0,0,.4)",
            marginBottom: 22,
            animation: "fadeUp .7s .1s ease both",
            textWrap: "balance",
          }}
        >
          Encuentra la práctica
          <br />
          que te{" "}
          <span
            style={{
              background: "linear-gradient(100deg,#FFD4A8,#FF9B6A,#FF6A3D)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundSize: "200% auto",
              animation: "shimmer 4s linear infinite",
            }}
          >
            reconoce de verdad
          </span>
          .
        </h1>

        <p
          style={{
            fontSize: "clamp(1rem,2vw,1.18rem)",
            color: "rgba(255,255,255,.72)",
            lineHeight: 1.65,
            maxWidth: 560,
            margin: "0 auto 40px",
            animation: "fadeUp .7s .18s ease both",
            textWrap: "pretty",
          }}
        >
          Sube tu CV una sola vez. La IA lee tus habilidades reales, no solo
          palabras clave, y te muestra las prácticas donde ya eres{" "}
          <strong style={{ color: "#fff", fontWeight: 600 }}>
            candidato top
          </strong>
          .
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "center",
            marginBottom: 52,
            animation: "fadeUp .7s .26s ease both",
          }}
        >
          <Link
            href="/login?role=student"
            className="practix-cta-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              background: `linear-gradient(135deg,${C.accent},${C.accentHi})`,
              color: "#fff",
              padding: "15px 28px",
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 15,
              boxShadow: `0 8px 30px ${C.accent}60`,
              transition: "transform .25s,box-shadow .25s",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.139 2 12.545 2 7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748L12.545 10.239z" />
            </svg>
            Empezar con Google, gratis
          </Link>
          <Link
            href="/practicas"
            className="practix-cta-glass"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,.1)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,.2)",
              color: "#fff",
              padding: "15px 26px",
              borderRadius: 14,
              fontWeight: 600,
              fontSize: 15,
              transition: "background .2s,border-color .2s",
            }}
          >
            Ver prácticas disponibles
          </Link>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: 24,
            animation: "fadeUp .7s .34s ease both",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex" }}>
              {["#FFC5A3", "#BFD7FF", "#C5E8C7", "#E0C5FF", "#FFD6B8"].map(
                (c, i) => (
                  <div
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: c,
                      border: "2.5px solid rgba(20,10,5,.75)",
                      marginLeft: i ? -8 : 0,
                      boxShadow: "0 2px 8px rgba(0,0,0,.3)",
                    }}
                  />
                ),
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
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
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#fff",
                    marginLeft: 4,
                  }}
                >
                  4.9
                </span>
              </div>
              <p
                style={{
                  fontSize: 11.5,
                  color: "rgba(255,255,255,.55)",
                }}
              >
                12.300+ estudiantes activos
              </p>
            </div>
          </div>
          <div
            className="hidden md:block"
            style={{
              width: 1,
              height: 30,
              background: "rgba(255,255,255,.14)",
            }}
          />
          <div
            className="hidden md:flex"
            style={{
              gap: 16,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {["PUC", "U. de Chile", "USACH", "UAI", "UDP", "UDD"].map((u) => (
              <span
                key={u}
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.8,
                  color: "rgba(255,255,255,.42)",
                }}
              >
                {u}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 26,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1,
          animation: "float 2.4s ease-in-out infinite",
          opacity: 0.4,
        }}
      >
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
        .practix-cta-primary:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 16px 40px ${C.accent}77; }
        .practix-cta-glass:hover { background: rgba(255,255,255,.17); border-color: rgba(255,255,255,.3); }
      `}</style>
    </section>
  );
}
