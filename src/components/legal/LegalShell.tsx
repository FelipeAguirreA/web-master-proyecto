"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { LandingFooterMini } from "@/components/landing/LandingFooter";
import { getDoc, type LegalDocKey } from "@/lib/legal/content";

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
    <div className="min-h-screen bg-bg text-text">
      {/* ── Header sticky ────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/92 backdrop-blur-[20px]">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-7 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-text no-underline"
          >
            <span
              className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center text-white font-black text-[14px]"
              style={{
                background:
                  "linear-gradient(135deg,var(--color-accent),var(--color-accent-hi))",
                boxShadow:
                  "0 4px 14px color-mix(in srgb,var(--color-accent) 33%,transparent)",
              }}
            >
              P
            </span>
            <span className="font-extrabold text-[16px] tracking-[-0.4px]">
              PractiX
            </span>
          </Link>

          {/* Tab switcher */}
          <div
            role="tablist"
            aria-label="Documento legal"
            className="inline-flex bg-dark/[0.04] p-[3px] rounded-full gap-0.5"
          >
            <Link
              href="/privacidad"
              role="tab"
              aria-selected={docKey === "privacidad"}
              className={[
                "px-4 py-[7px] rounded-full text-[12.5px] font-bold no-underline transition-all",
                docKey === "privacidad"
                  ? "bg-surface text-text shadow-[0_2px_6px_rgba(0,0,0,.06)]"
                  : "bg-transparent text-muted",
              ].join(" ")}
            >
              Privacidad
            </Link>
            <Link
              href="/terminos"
              role="tab"
              aria-selected={docKey === "terminos"}
              className={[
                "px-4 py-[7px] rounded-full text-[12.5px] font-bold no-underline transition-all",
                docKey === "terminos"
                  ? "bg-surface text-text shadow-[0_2px_6px_rgba(0,0,0,.06)]"
                  : "bg-transparent text-muted",
              ].join(" ")}
            >
              Términos
            </Link>
          </div>

          {/* Back link */}
          <Link
            href="/"
            className="text-[13px] text-muted font-bold inline-flex items-center gap-[5px] no-underline"
          >
            ← Volver al sitio
          </Link>
        </div>
      </header>

      {/* ── Hero header ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1100px] px-4 sm:px-7 pt-10 pb-7">
        <span className="inline-flex items-center gap-[7px] bg-accent-bg border border-accent-bdr text-accent rounded-full px-[13px] py-[4px] text-[11px] font-extrabold mb-3.5 tracking-[0.4px] uppercase">
          Legal · Chile
        </span>
        <h1 className="text-[clamp(2rem,4vw,2.8rem)] font-extrabold text-text tracking-[-1.6px] leading-[1.05] m-0">
          {doc.title}
        </h1>
        <p className="text-[14px] text-subtle font-semibold mt-3 mb-3.5">
          Última actualización: {doc.updated}
        </p>
        <p className="text-[16px] text-muted leading-[1.7] max-w-[680px] m-0">
          {doc.intro}
        </p>
      </section>

      {/* ── TOC + Content grid ───────────────────────────────────── */}
      <section className="mx-auto max-w-[1100px] px-4 sm:px-7 pt-3 pb-20">
        {/* Mobile TOC — visible solo en <md, colapsa arriba del contenido */}
        <div className="md:hidden mb-6 pb-4 border-b border-border">
          <div className="text-[10.5px] font-extrabold text-subtle tracking-[0.5px] uppercase mb-3 px-3">
            En esta página
          </div>
          <nav className="flex flex-col">
            {doc.sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goto(s.id)}
                className={[
                  "px-3 py-2 bg-transparent border-none text-[12.5px] text-left cursor-pointer leading-[1.4] transition-all font-inherit border-l-2",
                  active === s.id
                    ? "border-l-accent text-text font-extrabold"
                    : "border-l-transparent text-subtle font-medium",
                ].join(" ")}
              >
                {s.t}
              </button>
            ))}
          </nav>
        </div>

        {/* Desktop: sidebar + content */}
        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-12 md:items-start">
          {/* Desktop TOC sidebar */}
          <aside className="hidden md:block sticky top-[88px] self-start">
            <div className="text-[10.5px] font-extrabold text-subtle tracking-[0.5px] uppercase mb-3 px-3">
              En esta página
            </div>
            <nav className="flex flex-col">
              {doc.sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goto(s.id)}
                  className={[
                    "px-3 py-2 bg-transparent border-none text-[12.5px] text-left cursor-pointer leading-[1.4] transition-all font-inherit border-l-2",
                    active === s.id
                      ? "border-l-accent text-text font-extrabold"
                      : "border-l-transparent text-subtle font-medium",
                  ].join(" ")}
                >
                  {s.t}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="max-w-[680px]">
            {doc.sections.map((s, i) => (
              <article
                key={s.id}
                ref={(el) => {
                  refs.current[s.id] = el;
                }}
                className="mb-[42px] scroll-mt-[100px]"
              >
                <h2 className="text-[22px] font-extrabold text-text tracking-[-0.8px] leading-[1.2] mb-3.5 pt-2">
                  {s.t}
                </h2>
                {s.paragraphs?.map((p, j) => (
                  <p
                    key={j}
                    className="text-[15px] text-muted leading-[1.75] mb-3.5"
                  >
                    {p}
                  </p>
                ))}
                {s.lists?.map((lst, j) => (
                  <div key={j} className="mb-3.5">
                    {lst.title && (
                      <h3 className="text-[13px] font-extrabold text-text tracking-[0.2px] mt-1.5 mb-2.5 uppercase">
                        {lst.title}
                      </h3>
                    )}
                    <ul className="list-none flex flex-col gap-[9px] p-0 m-0">
                      {lst.items.map((it, k) => (
                        <li
                          key={k}
                          className="flex gap-2.5 text-[14.5px] text-muted leading-[1.65]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-[9px] shrink-0" />
                          <span className="flex-1">{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {s.paragraphs2?.map((p, j) => (
                  <p
                    key={`p2-${j}`}
                    className="text-[15px] text-muted leading-[1.75] mb-3.5"
                  >
                    {p}
                  </p>
                ))}
                {i < doc.sections.length - 1 && (
                  <hr className="border-0 border-t border-border mt-7" />
                )}
              </article>
            ))}

            {/* Cross-doc CTA */}
            <div className="mt-8 p-[22px_26px] bg-accent-bg border border-accent-bdr rounded-[18px] flex flex-wrap items-center gap-4">
              <div className="flex-[1_1_280px]">
                <h3 className="text-[15px] font-extrabold text-text m-0 mb-0">
                  {docKey === "privacidad"
                    ? "¿Quieres revisar los Términos de Uso?"
                    : "¿Quieres revisar la Política de Privacidad?"}
                </h3>
                <p className="text-[13.5px] text-muted leading-[1.55] mt-[5px] mb-0">
                  Te recomendamos leer ambos documentos antes de aceptar al
                  registrarte.
                </p>
              </div>
              <Link
                href={`/${otherKey}`}
                className="min-h-[44px] px-5 flex items-center rounded-[11px] text-[13.5px] font-extrabold text-white no-underline transition-opacity hover:opacity-90"
                style={{
                  background:
                    "linear-gradient(135deg,var(--color-accent),var(--color-accent-hi))",
                  boxShadow:
                    "0 6px 18px color-mix(in srgb,var(--color-accent) 33%,transparent)",
                }}
              >
                {docKey === "privacidad" ? "Ir a Términos" : "Ir a Privacidad"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooterMini />
    </div>
  );
}
