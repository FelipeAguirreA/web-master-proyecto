"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { D } from "@/components/dashboard/palettes";
import { LandingFooterMini } from "@/components/landing/LandingFooter";
import { getDoc, type LegalDocKey } from "@/lib/legal/content";

// Paleta local: mismas claves que `D` pero ajustadas al mock legal-app.jsx
// (que tira un poco más oscuro en muted/subtle para texto largo de lectura).
const LC = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  text: "#0A0909",
  muted: "#5C5856",
  subtle: "#8A847F",
  border: "rgba(10,9,9,.08)",
  accent: D.accent,
  accentHi: D.accentHi,
  accentBg: D.accentBg,
  accentBdr: D.accentBdr,
};

export function LegalShell({ doc: docKey }: { doc: LegalDocKey }) {
  const doc = getDoc(docKey);
  const otherKey: LegalDocKey =
    docKey === "privacidad" ? "terminos" : "privacidad";

  const [active, setActive] = useState(doc.sections[0]?.id ?? "");
  const refs = useRef<Record<string, HTMLElement | null>>({});
  // Bandera para suspender el scroll-spy durante un scroll programático (click
  // en el TOC). Sin esto, cuando el doc topa el scroll cerca del pie, el spy
  // pisa la selección del click y marca otra sección.
  const isLocked = useRef(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const THRESHOLD = 140;

    function onScroll() {
      if (isLocked.current) return;

      // Lógica base: la sección activa es la última cuyo título cruzó el
      // threshold (top <= 140 px desde el viewport top).
      let cur = doc.sections[0]?.id ?? "";
      for (const s of doc.sections) {
        const el = refs.current[s.id];
        if (!el) continue;
        if (el.getBoundingClientRect().top <= THRESHOLD) cur = s.id;
      }

      // Override del pie (scroll continuo): cuando el scroll está topado y la
      // sección elegida ya pasó por encima del threshold, marcar la última
      // sección visible.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) {
        const curEl = cur ? refs.current[cur] : null;
        if (curEl && curEl.getBoundingClientRect().bottom <= THRESHOLD) {
          const vh = window.innerHeight;
          let lastVisible: string | null = null;
          for (const s of doc.sections) {
            const el = refs.current[s.id];
            if (!el) continue;
            const r = el.getBoundingClientRect();
            if (r.top < vh && r.bottom > 0) {
              lastVisible = s.id;
            }
          }
          if (lastVisible) cur = lastVisible;
        }
      }

      setActive(cur);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [doc]);

  useEffect(() => {
    return () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
    };
  }, []);

  const goto = (id: string) => {
    const el = refs.current[id];
    if (!el) return;
    // Marcamos la sección antes de scrollear y suspendemos el spy 900 ms
    // (margen sobre el ~300-500 ms del smooth scroll del navegador). Sin la
    // lock, secciones cercanas al pie tope del documento perderían el
    // highlight porque el spy las reemplazaría con "la última visible".
    setActive(id);
    isLocked.current = true;
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => {
      isLocked.current = false;
    }, 900);
    window.scrollTo({ top: el.offsetTop - 96, behavior: "smooth" });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: LC.bg,
        color: LC.text,
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(250,250,248,.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${LC.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              color: LC.text,
              textDecoration: "none",
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: `linear-gradient(135deg,${LC.accent},${LC.accentHi})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 900,
                fontSize: 14,
                boxShadow: `0 4px 14px ${LC.accent}55`,
              }}
            >
              P
            </span>
            <span
              style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.4 }}
            >
              PractiX
            </span>
          </Link>

          <div
            role="tablist"
            aria-label="Documento legal"
            style={{
              display: "inline-flex",
              background: "rgba(10,9,9,.04)",
              padding: 3,
              borderRadius: 30,
              gap: 2,
            }}
          >
            <Link
              href="/privacidad"
              role="tab"
              aria-selected={docKey === "privacidad"}
              style={{
                padding: "7px 16px",
                borderRadius: 30,
                fontSize: 12.5,
                fontWeight: 700,
                textDecoration: "none",
                background:
                  docKey === "privacidad" ? LC.surface : "transparent",
                color: docKey === "privacidad" ? LC.text : LC.muted,
                boxShadow:
                  docKey === "privacidad"
                    ? "0 2px 6px rgba(0,0,0,.06)"
                    : "none",
              }}
            >
              Privacidad
            </Link>
            <Link
              href="/terminos"
              role="tab"
              aria-selected={docKey === "terminos"}
              style={{
                padding: "7px 16px",
                borderRadius: 30,
                fontSize: 12.5,
                fontWeight: 700,
                textDecoration: "none",
                background: docKey === "terminos" ? LC.surface : "transparent",
                color: docKey === "terminos" ? LC.text : LC.muted,
                boxShadow:
                  docKey === "terminos" ? "0 2px 6px rgba(0,0,0,.06)" : "none",
              }}
            >
              Términos
            </Link>
          </div>

          <Link
            href="/"
            style={{
              fontSize: 13,
              color: LC.muted,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              textDecoration: "none",
            }}
          >
            ← Volver al sitio
          </Link>
        </div>
      </header>

      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 28px 28px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: LC.accentBg,
            border: `1px solid ${LC.accentBdr}`,
            color: LC.accent,
            borderRadius: 30,
            padding: "4px 13px",
            fontSize: 11,
            fontWeight: 800,
            marginBottom: 14,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          Legal · Chile
        </span>
        <h1
          style={{
            fontSize: "clamp(2rem,4vw,2.8rem)",
            fontWeight: 800,
            color: LC.text,
            letterSpacing: -1.6,
            lineHeight: 1.05,
            marginBottom: 10,
            margin: 0,
          }}
        >
          {doc.title}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: LC.subtle,
            margin: "12px 0 14px",
            fontWeight: 600,
          }}
        >
          Última actualización: {doc.updated}
        </p>
        <p
          style={{
            fontSize: 16,
            color: LC.muted,
            lineHeight: 1.7,
            maxWidth: 680,
            margin: 0,
          }}
        >
          {doc.intro}
        </p>
      </section>

      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "12px 28px 80px",
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          gap: 48,
          alignItems: "flex-start",
        }}
        className="legal-grid"
      >
        <aside
          style={{ position: "sticky", top: 88, alignSelf: "flex-start" }}
          className="legal-toc"
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              color: LC.subtle,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginBottom: 12,
              padding: "0 12px",
            }}
          >
            En esta página
          </div>
          <nav style={{ display: "flex", flexDirection: "column" }}>
            {doc.sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goto(s.id)}
                style={{
                  padding: "8px 12px",
                  background: "transparent",
                  border: "none",
                  borderLeft: `2px solid ${active === s.id ? LC.accent : "transparent"}`,
                  color: active === s.id ? LC.text : LC.subtle,
                  fontSize: 12.5,
                  fontWeight: active === s.id ? 800 : 500,
                  textAlign: "left",
                  cursor: "pointer",
                  lineHeight: 1.4,
                  transition: "all .15s",
                  fontFamily: "inherit",
                }}
              >
                {s.t}
              </button>
            ))}
          </nav>
        </aside>

        <div style={{ maxWidth: 680 }}>
          {doc.sections.map((s, i) => (
            <article
              key={s.id}
              ref={(el) => {
                refs.current[s.id] = el;
              }}
              style={{ marginBottom: 42, scrollMarginTop: 100 }}
            >
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: LC.text,
                  letterSpacing: -0.8,
                  lineHeight: 1.2,
                  marginBottom: 14,
                  paddingTop: 8,
                }}
              >
                {s.t}
              </h2>
              {s.paragraphs?.map((p, j) => (
                <p
                  key={j}
                  style={{
                    fontSize: 15,
                    color: LC.muted,
                    lineHeight: 1.75,
                    marginBottom: 14,
                  }}
                >
                  {p}
                </p>
              ))}
              {s.lists?.map((lst, j) => (
                <div key={j} style={{ marginBottom: 14 }}>
                  {lst.title && (
                    <h3
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: LC.text,
                        letterSpacing: 0.2,
                        marginTop: 6,
                        marginBottom: 10,
                        textTransform: "uppercase",
                      }}
                    >
                      {lst.title}
                    </h3>
                  )}
                  <ul
                    style={{
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 9,
                      paddingLeft: 0,
                      margin: 0,
                    }}
                  >
                    {lst.items.map((it, k) => (
                      <li
                        key={k}
                        style={{
                          display: "flex",
                          gap: 10,
                          fontSize: 14.5,
                          color: LC.muted,
                          lineHeight: 1.65,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: LC.accent,
                            marginTop: 9,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ flex: 1 }}>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {s.paragraphs2?.map((p, j) => (
                <p
                  key={`p2-${j}`}
                  style={{
                    fontSize: 15,
                    color: LC.muted,
                    lineHeight: 1.75,
                    marginBottom: 14,
                  }}
                >
                  {p}
                </p>
              ))}
              {i < doc.sections.length - 1 && (
                <hr
                  style={{
                    border: "none",
                    borderTop: `1px solid ${LC.border}`,
                    marginTop: 28,
                  }}
                />
              )}
            </article>
          ))}

          <div
            style={{
              marginTop: 32,
              padding: "22px 26px",
              background: LC.accentBg,
              border: `1px solid ${LC.accentBdr}`,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 280px" }}>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: LC.text,
                  marginBottom: 5,
                  margin: 0,
                }}
              >
                {docKey === "privacidad"
                  ? "¿Quieres revisar los Términos de Uso?"
                  : "¿Quieres revisar la Política de Privacidad?"}
              </h3>
              <p
                style={{
                  fontSize: 13.5,
                  color: LC.muted,
                  lineHeight: 1.55,
                  marginTop: 5,
                  marginBottom: 0,
                }}
              >
                Te recomendamos leer ambos documentos antes de aceptar al
                registrarte.
              </p>
            </div>
            <Link
              href={`/${otherKey}`}
              style={{
                padding: "11px 20px",
                background: `linear-gradient(135deg,${LC.accent},${LC.accentHi})`,
                color: "#fff",
                border: "none",
                borderRadius: 11,
                fontSize: 13.5,
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: `0 6px 18px ${LC.accent}55`,
              }}
            >
              {docKey === "privacidad" ? "Ir a Términos" : "Ir a Privacidad"}
            </Link>
          </div>
        </div>
      </section>

      <LandingFooterMini />

      <style jsx>{`
        @media (max-width: 720px) {
          :global(.legal-grid) {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          :global(.legal-toc) {
            position: static !important;
            top: auto !important;
            border-bottom: 1px solid ${LC.border};
            padding-bottom: 16px;
          }
        }
      `}</style>
    </div>
  );
}
