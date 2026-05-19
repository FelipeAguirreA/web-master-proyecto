"use client";

import { useState } from "react";

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
      className="bg-bg py-[100px] px-4 sm:px-6 md:px-8 border-b border-border"
    >
      <div className="max-w-[760px] mx-auto">
        <div className="rv text-center mb-14">
          <span className="inline-flex items-center gap-[7px] bg-accent-bg border border-accent-bdr rounded-[40px] px-[14px] py-1 text-[10.5px] font-bold tracking-[1px] text-accent mb-[18px] uppercase">
            FAQ
          </span>
          <h2 className="text-[clamp(1.8rem,3.8vw,3rem)] font-extrabold tracking-[-1.5px] text-text leading-[1.1]">
            Preguntas frecuentes
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={`bg-surface rounded-2xl overflow-hidden transition-[border-color] duration-[.25s] border ${isOpen ? "border-accent-bdr" : "border-border"}`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex justify-between items-center px-6 py-5 bg-transparent border-none cursor-pointer gap-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] font-semibold text-text leading-[1.4]">
                    {f.q}
                  </span>
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-[.25s] text-lg leading-none ${isOpen ? "bg-accent border-accent text-white rotate-45" : "bg-surface border-border text-muted"} border`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-[22px] text-[14.5px] text-muted leading-[1.75] [animation:fadeUp_.3s_ease_both]">
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
