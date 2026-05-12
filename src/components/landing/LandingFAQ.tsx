"use client";

import { useState } from "react";
import { C } from "./tokens";

const FAQS = [
  {
    q: "¿PractiX es gratuito para estudiantes?",
    a: "Sí, 100% gratuito. Sin planes pagos, sin cargos ocultos. Monetizamos a través de las empresas que publican prácticas, nunca de los estudiantes.",
  },
  {
    q: "¿Cómo funciona el matching por IA?",
    a: "Usamos el modelo BAAI/bge-small-en-v1.5 que genera embeddings vectoriales de 384 dimensiones. La similitud de coseno entre tu perfil y cada práctica produce un score 0–100. No buscamos palabras exactas sino significado semántico.",
  },
  {
    q: "¿Qué universidades están soportadas?",
    a: "Cualquier estudiante universitario chileno puede registrarse. No se requiere convenio previo. Ya tenemos estudiantes de PUC, U. de Chile, USACH, UAI, UDP, UDD, U. Andrés Bello y más de 30 universidades.",
  },
  {
    q: "¿Qué formatos de CV soportan?",
    a: "PDF y DOCX. Usamos pdf-parse y mammoth para extracción de texto con alta fidelidad. Si el parsing falla, el sistema te avisa y puedes pegar el texto directamente.",
  },
  {
    q: "¿Las empresas ven mi CV antes de que me postule?",
    a: "No. Antes de que te postules, las empresas solo ven estadísticas anónimas y el pool general. Tu CV completo solo se comparte si tú decides postularte.",
  },
  {
    q: "¿Cuánto tarda el análisis del CV?",
    a: "Menos de 3 segundos. Parsing + generación del embedding + ranking contra todas las prácticas activas se ejecuta en pipeline en tiempo real.",
  },
];

export function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id="faq"
      style={{
        background: C.bg,
        padding: "100px 32px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="rv" style={{ textAlign: "center", marginBottom: 56 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: C.accentBg,
              border: `1px solid ${C.accentBdr}`,
              borderRadius: 40,
              padding: "4px 14px",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: 1,
              color: C.accent,
              marginBottom: 18,
              textTransform: "uppercase",
            }}
          >
            FAQ
          </span>
          <h2
            style={{
              fontSize: "clamp(1.8rem,3.8vw,3rem)",
              fontWeight: 800,
              letterSpacing: -1.5,
              color: C.text,
              lineHeight: 1.1,
            }}
          >
            Preguntas frecuentes
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="rv"
                style={{
                  background: C.surface,
                  border: `1px solid ${isOpen ? C.accentBdr : C.border}`,
                  borderRadius: 16,
                  overflow: "hidden",
                  transition: "border-color .25s",
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "20px 24px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    gap: 16,
                    textAlign: "left",
                  }}
                  aria-expanded={isOpen}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: C.text,
                      lineHeight: 1.4,
                    }}
                  >
                    {f.q}
                  </span>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: isOpen ? C.accent : C.bgAlt,
                      border: `1px solid ${isOpen ? C.accent : C.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all .25s",
                      color: isOpen ? "#fff" : C.muted,
                      fontSize: 18,
                      lineHeight: 1,
                      transform: isOpen ? "rotate(45deg)" : "none",
                    }}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: "0 24px 22px",
                      fontSize: 14.5,
                      color: C.muted,
                      lineHeight: 1.75,
                      animation: "fadeUp .3s ease both",
                    }}
                  >
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
